const formatoMoneda = new Intl.NumberFormat("es-CO", {
  style: "currency",
  currency: "COP",
  maximumFractionDigits: 0,
});

export function formatoCOP(valor: number | string | null | undefined): string {
  return formatoMoneda.format(Number(valor ?? 0));
}

export function esMesValido(mes: string | undefined): mes is string {
  return !!mes && /^\d{4}-(0[1-9]|1[0-2])$/.test(mes);
}

// Mes actual en formato YYYY-MM.
export function mesActual(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

// Desplaza un mes YYYY-MM por `delta` meses.
export function desplazarMes(mes: string, delta: number): string {
  const [anio, mesNum] = mes.split("-").map(Number);
  const d = new Date(Date.UTC(anio, mesNum - 1 + delta, 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

// Rango [inicio, siguiente) de un mes, en fechas YYYY-MM-DD.
export function rangoMes(mes: string) {
  const inicio = `${mes}-01`;
  const siguiente = `${desplazarMes(mes, 1)}-01`;
  return { inicio, siguiente };
}

// Lista de meses YYYY-MM entre `desde` y `hasta`, ambos incluidos.
export function mesesEntre(desde: string, hasta: string): string[] {
  const meses: string[] = [];
  for (let m = desde; m <= hasta; m = desplazarMes(m, 1)) meses.push(m);
  return meses;
}

export function nombreMes(mes: string): string {
  return new Date(`${mes}-01T12:00:00`).toLocaleDateString("es-CO", {
    month: "long",
    year: "numeric",
  });
}
