"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { sesionActual } from "@/lib/auth";
import { esMesValido } from "@/lib/formato";

const INGRESOS = ["sede", "internet", "tv_satelital", "otro"] as const;
const GASTOS = ["sede", "tv", "credito", "otro"] as const;

function volver(mes: string, params: string): never {
  redirect(`/movimientos?mes=${mes}&${params}`);
}

function mesDe(formData: FormData): string {
  const mes = String(formData.get("mes") ?? "");
  return esMesValido(mes) ? mes : "";
}

// Agrega un concepto de ingreso (fuente) o de gasto (categoría).
// El destino llega como "ingreso:<tipo>" o "gasto:<grupo>".
export async function agregarConcepto(formData: FormData) {
  const { supabase, esAdmin } = await sesionActual();
  const mes = mesDe(formData) || "";
  if (!esAdmin) throw new Error("Solo un administrador puede agregar conceptos.");

  const [clase, subtipo] = String(formData.get("destino") ?? "").split(":");
  const nombre = String(formData.get("nombre") ?? "").trim();
  const monto = Number(formData.get("monto_mensual") || 0);
  const dia = Number(formData.get("dia_cobro") || 28);

  if (!nombre) volver(mes, "error=" + encodeURIComponent("Escribe el nombre del concepto."));
  if (!Number.isFinite(monto) || monto < 0 || !Number.isInteger(monto)) {
    volver(mes, "error=" + encodeURIComponent("El monto mensual debe ser un entero mayor o igual a 0."));
  }

  if (clase === "ingreso") {
    if (!(INGRESOS as readonly string[]).includes(subtipo)) volver(mes, "error=" + encodeURIComponent("Destino inválido."));
    if (!Number.isInteger(dia) || dia < 1 || dia > 28) {
      volver(mes, "error=" + encodeURIComponent("El día de cobro debe estar entre 1 y 28."));
    }
    const { data: iguales } = await supabase.from("fuentes_ingreso").select("id").ilike("nombre", nombre).limit(1);
    if ((iguales ?? []).length > 0) volver(mes, "error=" + encodeURIComponent(`Ya existe un ingreso llamado "${nombre}".`));

    const { error } = await supabase.from("fuentes_ingreso").insert({
      tipo: subtipo,
      nombre,
      monto_mensual: monto,
      dia_cobro: dia,
      variable: false,
    });
    if (error) throw new Error(error.message);
  } else if (clase === "gasto") {
    if (!(GASTOS as readonly string[]).includes(subtipo)) volver(mes, "error=" + encodeURIComponent("Destino inválido."));
    const { data: iguales } = await supabase.from("categorias_gasto").select("id").ilike("nombre", nombre).limit(1);
    if ((iguales ?? []).length > 0) volver(mes, "error=" + encodeURIComponent(`Ya existe un gasto llamado "${nombre}".`));

    const { error } = await supabase.from("categorias_gasto").insert({
      grupo: subtipo,
      nombre,
      monto_mensual: monto,
    });
    if (error) throw new Error(error.message);
  } else {
    volver(mes, "error=" + encodeURIComponent("Destino inválido."));
  }

  revalidatePath("/movimientos");
  revalidatePath("/catalogos");
  volver(mes, "guardado=concepto");
}

// Quita un concepto. Si nunca tuvo movimientos se borra; si los tiene, se desactiva
// para conservar el historial.
// La clave ("i:<id>" o "g:<id>") se enlaza en el botón, no se lee del formulario:
// así no depende de que el navegador envíe el valor del botón.
export async function quitarConcepto(clave: string, formData: FormData) {
  const { supabase, esAdmin } = await sesionActual();
  const mes = mesDe(formData) || "";
  if (!esAdmin) throw new Error("Solo un administrador puede quitar conceptos.");

  const [prefijo, id] = [clave.slice(0, 1), clave.slice(2)];
  if (!id || (prefijo !== "i" && prefijo !== "g")) volver(mes, "error=" + encodeURIComponent("Concepto inválido."));

  const esIngreso = prefijo === "i";
  const tabla = esIngreso ? "fuentes_ingreso" : "categorias_gasto";
  const columna = esIngreso ? "fuente_ingreso_id" : "categoria_gasto_id";

  const { data: usos, error: errUsos } = await supabase
    .from("movimientos")
    .select("id")
    .eq(columna, id)
    .limit(1);
  if (errUsos) throw new Error(errUsos.message);

  if ((usos ?? []).length > 0) {
    const { error } = await supabase.from(tabla).update({ activa: false }).eq("id", id);
    if (error) throw new Error(error.message);
    revalidatePath("/movimientos");
    revalidatePath("/catalogos");
    volver(mes, "guardado=desactivado");
  }

  const { error } = await supabase.from(tabla).delete().eq("id", id);
  if (error) throw new Error(error.message);

  revalidatePath("/movimientos");
  revalidatePath("/catalogos");
  volver(mes, "guardado=eliminado");
}
