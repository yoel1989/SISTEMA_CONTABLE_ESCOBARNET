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
