"use server";

import { redirect } from "next/navigation";
import { sesionActual } from "@/lib/auth";

// Repositorio y workflow que generan los reportes (ver extraer-datos-sedes-).
const REPO = "yoel1989/extraer-datos-sedes-";
const WORKFLOW = "reportes-mensuales.yml";
const FORMATO_FECHA = /^\d{4}-\d{2}-\d{2}$/;

// Hoy en Colombia, para no aceptar fechas futuras.
function hoyColombia(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Bogota" }).format(new Date());
}

function validarPeriodo(inicio: string, fin: string): string | null {
  if (!FORMATO_FECHA.test(inicio) || !FORMATO_FECHA.test(fin)) return "Las fechas no son válidas.";
  if (Number.isNaN(Date.parse(inicio)) || Number.isNaN(Date.parse(fin))) return "Las fechas no son válidas.";
  if (fin < inicio) return "La fecha final no puede ser anterior a la inicial.";
  if (fin > hoyColombia()) return "La fecha final no puede ser futura.";
  return null;
}

function volverConError(mensaje: string): never {
  redirect(`/reportes?error=${encodeURIComponent(mensaje)}`);
}

export async function generarReporte(formData: FormData) {
  const { esAdmin } = await sesionActual();
  if (!esAdmin) volverConError("Solo un administrador puede generar reportes.");

  const inicio = String(formData.get("inicio") ?? "");
  const fin = String(formData.get("fin") ?? "");
  const errorValidacion = validarPeriodo(inicio, fin);
  if (errorValidacion) volverConError(errorValidacion);

  const token = process.env.GITHUB_DISPATCH_TOKEN;
  if (!token) volverConError("Falta configurar GITHUB_DISPATCH_TOKEN en el servidor.");

  let respuesta: Response;
  try {
    respuesta = await fetch(
      `https://api.github.com/repos/${REPO}/actions/workflows/${WORKFLOW}/dispatches`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/vnd.github+json",
          "X-GitHub-Api-Version": "2022-11-28",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ ref: "main", inputs: { inicio, fin } }),
        cache: "no-store",
      },
    );
  } catch {
    volverConError("No se pudo conectar con GitHub. Intenta de nuevo.");
  }

  if (!respuesta.ok) {
    volverConError(`GitHub rechazó la solicitud (código ${respuesta.status}). Revisa el token.`);
  }

  redirect(`/reportes?generando=${encodeURIComponent(`${inicio}_${fin}`)}`);
}

const FORMATO_UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Borra reportes seleccionados: primero sus PDF del bucket y después las filas.
// Usa la sesión del administrador, así que las políticas RLS de la migración 0017 aplican.
export async function eliminarReportes(formData: FormData) {
  const { supabase, esAdmin } = await sesionActual();
  if (!esAdmin) volverConError("Solo un administrador puede eliminar reportes.");

  const ids = formData.getAll("ids").map(String).filter((id) => FORMATO_UUID.test(id));
  if (ids.length === 0) volverConError("No seleccionaste ningún reporte.");

  const { data: filas, error: errorLectura } = await supabase
    .from("reportes_sedes")
    .select("id, archivo_path")
    .in("id", ids);
  if (errorLectura) volverConError("No se pudieron leer los reportes seleccionados.");

  const rutas = (filas ?? []).map((f) => f.archivo_path);
  if (rutas.length > 0) {
    const { error: errorPdf } = await supabase.storage.from("reportes-sedes").remove(rutas);
    if (errorPdf) volverConError("No se pudieron borrar los PDF. Los reportes no se eliminaron.");
  }

  const { error: errorBorrado } = await supabase
    .from("reportes_sedes")
    .delete()
    .in("id", ids);
  if (errorBorrado) volverConError("Los PDF se borraron, pero no las filas. Vuelve a intentarlo.");

  redirect(`/reportes?borrados=${rutas.length}`);
}
