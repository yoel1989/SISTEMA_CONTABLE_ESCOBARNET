"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { sesionActual } from "@/lib/auth";

// Guarda los saldos editados a mano. Cada cuenta de pago es una "bolsa" cuyo saldo
// organiza el administrador; no se calcula a partir de los movimientos.
export async function guardarSaldos(formData: FormData) {
  const { supabase, esAdmin } = await sesionActual();
  if (!esAdmin) throw new Error("Solo un administrador puede editar saldos.");

  const cambios: { id: string; saldo: number }[] = [];
  for (const [nombre, valorCrudo] of formData.entries()) {
    if (!nombre.startsWith("s:")) continue;
    const valor = String(valorCrudo).trim();
    if (valor === "") continue;
    if (!/^-?\d+$/.test(valor)) {
      redirect(`/tesoreria?error=${encodeURIComponent(`Saldo inválido: "${valor}". Usa solo números enteros.`)}`);
    }
    cambios.push({ id: nombre.slice(2), saldo: Number(valor) });
  }

  for (const { id, saldo } of cambios) {
    const { error } = await supabase.from("cuentas_pago").update({ saldo }).eq("id", id);
    if (error) throw new Error(error.message);
  }

  revalidatePath("/tesoreria");
  redirect("/tesoreria?guardado=1");
}
