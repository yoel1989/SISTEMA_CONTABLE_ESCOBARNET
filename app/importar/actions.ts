"use server";

import { revalidatePath } from "next/cache";
import { sesionActual } from "@/lib/auth";
import {
  claveDuplicado,
  MAX_FILAS,
  prepararImportacion,
  type Catalogos,
  type FilaPreparada,
  type MovimientoPreparado,
  type ResultadoImportacion,
} from "@/lib/importacion";

export type EstadoValidacion = {
  error?: string;
  filas?: FilaPreparada[];
};

export type EstadoConfirmacion = {
  error?: string;
  insertadas?: number;
  omitidas?: number;
};

const MAX_BYTES = 2 * 1024 * 1024;
const PAGINA = 1000; // límite por defecto de PostgREST

type Supabase = Awaited<ReturnType<typeof sesionActual>>["supabase"];

async function cargarCatalogos(supabase: Supabase): Promise<Catalogos> {
  const [fuentes, categorias] = await Promise.all([
    supabase.from("fuentes_ingreso").select("id, nombre"),
    supabase.from("categorias_gasto").select("id, nombre"),
  ]);
  if (fuentes.error || categorias.error) {
    throw new Error("No se pudieron cargar los catálogos.");
  }
  return {
    fuentes: fuentes.data ?? [],
    categorias: categorias.data ?? [],
  };
}

// Carga todas las claves de movimientos existentes, paginando de a 1000.
async function cargarClavesExistentes(supabase: Supabase): Promise<Set<string>> {
  const claves = new Set<string>();
  for (let desde = 0; ; desde += PAGINA) {
    const { data, error } = await supabase
      .from("movimientos")
      .select("fecha, tipo, monto, fuente_ingreso_id, categoria_gasto_id")
      .order("id")
      .range(desde, desde + PAGINA - 1);
    if (error) throw new Error("No se pudieron cargar los movimientos existentes.");
    for (const m of data ?? []) {
      claves.add(
        claveDuplicado({
          fecha: m.fecha,
          tipo: m.tipo,
          monto: Number(m.monto),
          fuente_ingreso_id: m.fuente_ingreso_id,
          categoria_gasto_id: m.categoria_gasto_id,
        } as MovimientoPreparado),
      );
    }
    if (!data || data.length < PAGINA) break;
  }
  return claves;
}

async function preparar(supabase: Supabase, csv: string): Promise<ResultadoImportacion> {
  if (!csv.trim()) return { error: "Sube un archivo CSV.", filas: [] };
  if (new Blob([csv]).size > MAX_BYTES) return { error: "El archivo supera 2 MB.", filas: [] };

  const [catalogos, existentes] = await Promise.all([
    cargarCatalogos(supabase),
    cargarClavesExistentes(supabase),
  ]);
  return prepararImportacion(csv, catalogos, existentes);
}

// Paso 1: valida y muestra la vista previa. No escribe nada.
export async function validarImportacion(
  _prev: EstadoValidacion,
  formData: FormData,
): Promise<EstadoValidacion> {
  const { supabase, esAdmin } = await sesionActual();
  if (!esAdmin) return { error: "Solo un administrador puede importar datos." };

  const resultado = await preparar(supabase, String(formData.get("csv") ?? ""));
  if (resultado.error) return { error: resultado.error };
  return { filas: resultado.filas };
}

// Paso 2: vuelve a validar en el servidor (nunca confiar en el cliente) e inserta solo las filas "ok".
export async function confirmarImportacion(
  _prev: EstadoConfirmacion,
  formData: FormData,
): Promise<EstadoConfirmacion> {
  const { supabase, esAdmin } = await sesionActual();
  if (!esAdmin) return { error: "Solo un administrador puede importar datos." };

  const resultado = await preparar(supabase, String(formData.get("csv") ?? ""));
  if (resultado.error) return { error: resultado.error };

  const filas = resultado.filas;
  if (filas.some((f) => f.estado === "error")) {
    return { error: "El archivo tiene errores. Corrígelos y vuelve a validar antes de importar." };
  }

  const aInsertar = filas.filter((f) => f.estado === "ok" && f.movimiento).map((f) => f.movimiento!);
  if (aInsertar.length === 0) return { error: "No hay filas nuevas para importar." };
  if (aInsertar.length > MAX_FILAS) return { error: `Máximo ${MAX_FILAS} filas por importación.` };

  // Lotes de 500 para no exceder el tamaño de petición.
  for (let i = 0; i < aInsertar.length; i += 500) {
    const { error } = await supabase.from("movimientos").insert(aInsertar.slice(i, i + 500));
    if (error) return { error: `Error al insertar (se detuvo en la fila ${i + 1}): ${error.message}` };
  }

  revalidatePath("/movimientos");
  return {
    insertadas: aInsertar.length,
    omitidas: filas.length - aInsertar.length,
  };
}
