"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { sesionActual } from "@/lib/auth";

const ESTADOS = ["borrador", "enviada", "aceptada", "rechazada"] as const;
const TAMANO_MAX_LOGO = 2 * 1024 * 1024; // 2 MB
const BUCKET = "cotizaciones";
// Bucket público solo para el logo (ver migración 0015).
const BUCKET_MARCA = "marca";

type Supabase = Awaited<ReturnType<typeof sesionActual>>["supabase"];
type ItemEntrada = { descripcion: string; cantidad: number; precio_unitario: number };

function leerItems(crudo: string): ItemEntrada[] | string {
  let lista: unknown;
  try {
    lista = JSON.parse(crudo);
  } catch {
    return "Los ítems no son válidos.";
  }
  if (!Array.isArray(lista) || lista.length === 0) return "Agrega al menos un ítem.";

  const items: ItemEntrada[] = [];
  for (const [i, it] of lista.entries()) {
    const descripcion = String(it?.descripcion ?? "").trim();
    const cantidad = Number(it?.cantidad);
    const precio = Number(it?.precio_unitario);
    if (!descripcion) return `El ítem ${i + 1} no tiene descripción.`;
    if (!Number.isFinite(cantidad) || cantidad <= 0) return `La cantidad del ítem ${i + 1} debe ser mayor que 0.`;
    if (!Number.isFinite(precio) || precio < 0) return `El precio del ítem ${i + 1} no es válido.`;
    items.push({ descripcion, cantidad, precio_unitario: precio });
  }
  return items;
}

// Campos del formulario, validados. Devuelve un mensaje de error o los datos listos para guardar.
function leerCampos(formData: FormData) {
  const cliente = String(formData.get("cliente") ?? "").trim();
  const fecha = String(formData.get("fecha") ?? "");
  const descripcion = String(formData.get("descripcion") ?? "").trim();
  const observaciones = String(formData.get("observaciones") ?? "").trim();
  if (!cliente) return "Escribe el nombre del cliente.";
  if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha)) return "Fecha inválida.";
  const items = leerItems(String(formData.get("items") ?? "[]"));
  if (typeof items === "string") return items;
  const total = items.reduce((acc, it) => acc + it.cantidad * it.precio_unitario, 0);
  return { cliente, fecha, descripcion, observaciones, items, total };
}

// Número secuencial por año: COT-AAAA-NNNN. La restricción UNIQUE de la base de datos
// rechaza cualquier colisión si dos administradores escriben a la vez.
async function siguienteNumero(anio: number, supabase: Supabase) {
  const prefijo = `COT-${anio}-`;
  const { data } = await supabase
    .from("cotizaciones")
    .select("numero")
    .like("numero", `${prefijo}%`)
    .order("numero", { ascending: false })
    .limit(1);
  const ultimo = data?.[0]?.numero ? Number(data[0].numero.slice(prefijo.length)) : 0;
  return `${prefijo}${String(ultimo + 1).padStart(4, "0")}`;
}

export async function crearCotizacion(formData: FormData) {
  const { supabase, esAdmin } = await sesionActual();
  if (!esAdmin) throw new Error("Solo un administrador puede crear cotizaciones.");

  const campos = leerCampos(formData);
  if (typeof campos === "string") redirect(`/cotizaciones/nueva?error=${encodeURIComponent(campos)}`);

  const numero = await siguienteNumero(Number(campos.fecha.slice(0, 4)), supabase);
  const { data: cot, error } = await supabase
    .from("cotizaciones")
    .insert({
      numero,
      cliente: campos.cliente,
      fecha: campos.fecha,
      descripcion: campos.descripcion,
      observaciones: campos.observaciones,
      total: campos.total,
    })
    .select("id")
    .single();
  if (error || !cot) throw new Error(error?.message ?? "No se pudo crear la cotización.");

  const { error: errItems } = await supabase.from("cotizacion_items").insert(
    campos.items.map((it, orden) => ({ ...it, cotizacion_id: cot.id, orden })),
  );
  if (errItems) {
    // Sin ítems no hay cotización válida: se deshace el encabezado.
    await supabase.from("cotizaciones").delete().eq("id", cot.id);
    throw new Error(errItems.message);
  }

  revalidatePath("/cotizaciones");
  redirect(`/cotizaciones/${cot.id}`);
}

export async function actualizarCotizacion(formData: FormData) {
  const { supabase, esAdmin } = await sesionActual();
  if (!esAdmin) throw new Error("Solo un administrador puede editar cotizaciones.");

  const id = String(formData.get("id"));
  const campos = leerCampos(formData);
  if (typeof campos === "string") redirect(`/cotizaciones/${id}/editar?error=${encodeURIComponent(campos)}`);

  const { error } = await supabase
    .from("cotizaciones")
    .update({
      cliente: campos.cliente,
      fecha: campos.fecha,
      descripcion: campos.descripcion,
      observaciones: campos.observaciones,
      total: campos.total,
    })
    .eq("id", id);
  if (error) throw new Error(error.message);

  // Los ítems se reemplazan completos: es lo más simple y evita desfases de orden.
  const { error: errBorrar } = await supabase.from("cotizacion_items").delete().eq("cotizacion_id", id);
  if (errBorrar) throw new Error(errBorrar.message);
  const { error: errItems } = await supabase.from("cotizacion_items").insert(
    campos.items.map((it, orden) => ({ ...it, cotizacion_id: id, orden })),
  );
  if (errItems) throw new Error(errItems.message);

  revalidatePath(`/cotizaciones/${id}`);
  revalidatePath("/cotizaciones");
  redirect(`/cotizaciones/${id}?guardado=editada`);
}

export async function cambiarEstado(formData: FormData) {
  const { supabase, esAdmin } = await sesionActual();
  if (!esAdmin) throw new Error("Solo un administrador puede cambiar el estado.");

  const estado = String(formData.get("estado"));
  if (!(ESTADOS as readonly string[]).includes(estado)) throw new Error("Estado inválido.");

  const id = String(formData.get("id"));
  const { error } = await supabase.from("cotizaciones").update({ estado }).eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath(`/cotizaciones/${id}`);
  revalidatePath("/cotizaciones");
}

// Logo de la empresa: se incrusta en los PDF, Excel y Word generados.
export async function subirLogo(formData: FormData) {
  const { supabase, esAdmin } = await sesionActual();
  if (!esAdmin) throw new Error("Solo un administrador puede cambiar el logo.");

  const archivo = formData.get("logo");
  if (!(archivo instanceof File) || archivo.size === 0) {
    redirect(`/cotizaciones?error=${encodeURIComponent("Selecciona una imagen.")}`);
  }
  const nombre = archivo.name.toLowerCase();
  if (!(nombre.endsWith(".png") || nombre.endsWith(".jpg") || nombre.endsWith(".jpeg"))) {
    redirect(`/cotizaciones?error=${encodeURIComponent("El logo debe ser PNG o JPG.")}`);
  }
  if (archivo.size > TAMANO_MAX_LOGO) {
    redirect(`/cotizaciones?error=${encodeURIComponent("El logo supera 2 MB.")}`);
  }

  const { data: previo } = await supabase.from("configuracion").select("valor").eq("clave", "logo_path").maybeSingle();
  if (typeof previo?.valor === "string") {
    await supabase.storage.from(BUCKET_MARCA).remove([previo.valor]);
  }

  const ruta = `logo/${Date.now()}-${nombre.replace(/[^\w.\-]+/g, "_")}`;
  const { error: errSubida } = await supabase.storage.from(BUCKET_MARCA).upload(ruta, archivo, {
    contentType: archivo.type || "image/png",
    upsert: false,
  });
  if (errSubida) redirect(`/cotizaciones?error=${encodeURIComponent(`No se pudo subir: ${errSubida.message}`)}`);

  const { error } = await supabase
    .from("configuracion")
    .upsert({ clave: "logo_path", valor: ruta }, { onConflict: "clave" });
  if (error) throw new Error(error.message);

  revalidatePath("/cotizaciones");
  redirect("/cotizaciones?guardado=logo");
}

// Logo solo para los documentos de cotizaciones (PDF, Excel, Word).
// Usa su propia clave de configuración, así la barra superior y el login no cambian.
export async function subirLogoCotizacion(formData: FormData) {
  const { supabase, esAdmin } = await sesionActual();
  if (!esAdmin) throw new Error("Solo un administrador puede cambiar el logo.");

  const archivo = formData.get("logo");
  if (!(archivo instanceof File) || archivo.size === 0) {
    redirect(`/cotizaciones?error=${encodeURIComponent("Selecciona una imagen para cotizaciones.")}`);
  }
  const nombre = archivo.name.toLowerCase();
  if (!(nombre.endsWith(".png") || nombre.endsWith(".jpg") || nombre.endsWith(".jpeg"))) {
    redirect(`/cotizaciones?error=${encodeURIComponent("El logo debe ser PNG o JPG.")}`);
  }
  if (archivo.size > TAMANO_MAX_LOGO) {
    redirect(`/cotizaciones?error=${encodeURIComponent("El logo supera 2 MB.")}`);
  }

  const { data: previo } = await supabase
    .from("configuracion")
    .select("valor")
    .eq("clave", "logo_cotizacion_path")
    .maybeSingle();
  if (typeof previo?.valor === "string") {
    await supabase.storage.from(BUCKET_MARCA).remove([previo.valor]);
  }

  const ruta = `logo-cotizacion/${Date.now()}-${nombre.replace(/[^\w.\-]+/g, "_")}`;
  const { error: errSubida } = await supabase.storage.from(BUCKET_MARCA).upload(ruta, archivo, {
    contentType: archivo.type || "image/png",
    upsert: false,
  });
  if (errSubida) redirect(`/cotizaciones?error=${encodeURIComponent(`No se pudo subir: ${errSubida.message}`)}`);

  const { error } = await supabase
    .from("configuracion")
    .upsert({ clave: "logo_cotizacion_path", valor: ruta }, { onConflict: "clave" });
  if (error) throw new Error(error.message);

  revalidatePath("/cotizaciones");
  redirect("/cotizaciones?guardado=logo-cotizacion");
}

export async function eliminarCotizacion(formData: FormData) {
  const { supabase, esAdmin } = await sesionActual();
  if (!esAdmin) throw new Error("Solo un administrador puede eliminar cotizaciones.");

  const id = String(formData.get("id"));
  const { error } = await supabase.from("cotizaciones").delete().eq("id", id);
  if (error) throw new Error(error.message);

  revalidatePath("/cotizaciones");
  redirect("/cotizaciones");
}
