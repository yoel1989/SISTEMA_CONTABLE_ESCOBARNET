"use server";

import { revalidatePath } from "next/cache";
import { sesionActual } from "@/lib/auth";

const TABLAS_ACTIVABLES = ["fuentes_ingreso", "categorias_gasto", "cuentas_pago"] as const;

function refrescar() {
  revalidatePath("/catalogos");
  revalidatePath("/movimientos");
}

async function exigirAdmin() {
  const sesion = await sesionActual();
  if (!sesion.esAdmin) throw new Error("Solo un administrador puede modificar catálogos.");
  return sesion.supabase;
}

// Día de cobro: entero entre 1 y 28 (para que exista en todos los meses).
function leerDiaCobro(formData: FormData): number {
  const dia = Number(formData.get("dia_cobro") || 28);
  if (!Number.isInteger(dia) || dia < 1 || dia > 28) {
    throw new Error("El día de cobro debe ser un número entre 1 y 28.");
  }
  return dia;
}

export async function crearFuente(formData: FormData) {
  const supabase = await exigirAdmin();
  const { error } = await supabase.from("fuentes_ingreso").insert({
    tipo: String(formData.get("tipo")),
    nombre: String(formData.get("nombre") ?? "").trim(),
    monto_mensual: Number(formData.get("monto_mensual") || 0),
    dia_cobro: leerDiaCobro(formData),
    variable: formData.get("variable") === "on",
  });
  if (error) throw new Error(error.message);
  refrescar();
}

export async function actualizarFuente(formData: FormData) {
  const supabase = await exigirAdmin();
  const { error } = await supabase
    .from("fuentes_ingreso")
    .update({
      monto_mensual: Number(formData.get("monto_mensual") || 0),
      dia_cobro: leerDiaCobro(formData),
    })
    .eq("id", String(formData.get("id")));
  if (error) throw new Error(error.message);
  refrescar();
}

export async function crearCategoria(formData: FormData) {
  const supabase = await exigirAdmin();
  const { error } = await supabase.from("categorias_gasto").insert({
    grupo: String(formData.get("grupo")),
    nombre: String(formData.get("nombre") ?? "").trim(),
  });
  if (error) throw new Error(error.message);
  refrescar();
}

export async function crearCuenta(formData: FormData) {
  const supabase = await exigirAdmin();
  const { error } = await supabase.from("cuentas_pago").insert({
    nombre: String(formData.get("nombre") ?? "").trim(),
    tipo: String(formData.get("tipo")),
    saldo: Number(formData.get("saldo") || 0),
  });
  if (error) throw new Error(error.message);
  refrescar();
}

// Activa o desactiva un registro. Se desactiva en lugar de borrar para conservar el histórico.
export async function cambiarActiva(formData: FormData) {
  const supabase = await exigirAdmin();
  const tabla = String(formData.get("tabla"));
  if (!(TABLAS_ACTIVABLES as readonly string[]).includes(tabla)) {
    throw new Error("Tabla no permitida.");
  }
  const { error } = await supabase
    .from(tabla)
    .update({ activa: formData.get("activa") === "true" })
    .eq("id", String(formData.get("id")));
  if (error) throw new Error(error.message);
  refrescar();
}
