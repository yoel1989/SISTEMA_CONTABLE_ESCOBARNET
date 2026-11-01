"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { sesionActual } from "@/lib/auth";
import { esMesValido, rangoMes } from "@/lib/formato";

function volver(mes: string, params: string): never {
  redirect(`/movimientos?mes=${mes}&${params}`);
}

// Guarda la hoja mensual:
// - Montos (m:): cada celda cambiada crea o actualiza el movimiento de ese concepto en el mes.
//   Los conceptos con varios movimientos son de solo lectura en la hoja y nunca llegan aquí.
// - Días de cobro (d:): solo ingresos. Cambian el día de cobro de la fuente para los meses
//   siguientes; los movimientos que ya existen conservan su fecha.
export async function guardarHoja(formData: FormData) {
  const { supabase, esAdmin } = await sesionActual();
  if (!esAdmin) throw new Error("Solo un administrador puede modificar la hoja.");

  const mes = String(formData.get("mes") ?? "");
  if (!esMesValido(mes)) throw new Error("Mes inválido.");

  // Días de cobro actuales, para fechar los ingresos nuevos.
  const { data: fuentes, error: errFuentes } = await supabase
    .from("fuentes_ingreso")
    .select("id, dia_cobro");
  if (errFuentes) throw new Error(errFuentes.message);
  const diaPorFuente = new Map((fuentes ?? []).map((f) => [f.id, f.dia_cobro]));

  // 1. Días de cobro que cambiaron.
  const diasCambiados = new Map<string, number>(); // id de fuente -> nuevo día
  for (const [nombre, valorCrudo] of formData.entries()) {
    if (!nombre.startsWith("d:")) continue;
    const key = nombre.slice(2); // "i:<id>"
    if (!key.startsWith("i:")) continue;
    const valor = String(valorCrudo).trim();
    const original = String(formData.get(`od:${key}`) ?? "").trim();
    if (valor === "" || valor === original) continue;

    const dia = Number(valor);
    if (!Number.isInteger(dia) || dia < 1 || dia > 28) {
      volver(mes, "error=" + encodeURIComponent(`Día de cobro inválido: "${valor}". Debe ser un número entre 1 y 28.`));
    }
    diasCambiados.set(key.slice(2), dia);
  }

  // 2. Montos que cambiaron.
  const { inicio, siguiente } = rangoMes(mes);
  const cambios: { key: string; valor: number }[] = [];

  for (const [nombre, valorCrudo] of formData.entries()) {
    if (!nombre.startsWith("m:")) continue;
    const key = nombre.slice(2);
    const valor = String(valorCrudo).trim();
    const original = String(formData.get(`o:${key}`) ?? "").trim();
    if (valor === "" || valor === original) continue;

    const numero = Number(valor);
    if (!Number.isFinite(numero) || numero < 0 || !/^\d+$/.test(valor)) {
      volver(mes, "error=" + encodeURIComponent(`Monto inválido: "${valor}". Usa solo números, sin decimales.`));
    }
    cambios.push({ key, valor: numero });
  }

  const total = cambios.length + diasCambiados.size;
  if (total === 0) volver(mes, "guardado=sin-cambios");

  // 3. Guarda los días de cobro.
  for (const [id, dia] of diasCambiados) {
    const { error } = await supabase.from("fuentes_ingreso").update({ dia_cobro: dia }).eq("id", id);
    if (error) throw new Error(error.message);
  }

  // 4. Guarda los montos.
  for (const { key, valor } of cambios) {
    const [prefijo, id] = [key.slice(0, 1), key.slice(2)];
    const esIngreso = prefijo === "i";

    const { data: existentes, error: errBusca } = await supabase
      .from("movimientos")
      .select("id")
      .eq("tipo", esIngreso ? "ingreso" : "gasto")
      .eq(esIngreso ? "fuente_ingreso_id" : "categoria_gasto_id", id)
      .gte("fecha", inicio)
      .lt("fecha", siguiente);
    if (errBusca) throw new Error(errBusca.message);

    if ((existentes ?? []).length > 1) {
      // Varios movimientos para el mismo concepto: no se toca desde la hoja.
      continue;
    }

    if ((existentes ?? []).length === 1) {
      const { error } = await supabase
        .from("movimientos")
        .update({ monto: valor })
        .eq("id", existentes![0].id);
      if (error) throw new Error(error.message);
    } else {
      const dia = esIngreso ? (diasCambiados.get(id) ?? diaPorFuente.get(id) ?? 28) : 1;
      const { error } = await supabase.from("movimientos").insert({
        tipo: esIngreso ? "ingreso" : "gasto",
        fecha: `${mes}-${String(dia).padStart(2, "0")}`,
        monto: valor,
        fuente_ingreso_id: esIngreso ? id : null,
        categoria_gasto_id: esIngreso ? null : id,
        descripcion: "Hoja mensual",
      });
      if (error) throw new Error(error.message);
    }
  }

  revalidatePath("/movimientos");
  revalidatePath("/catalogos");
  volver(mes, "guardado=" + total);
}
