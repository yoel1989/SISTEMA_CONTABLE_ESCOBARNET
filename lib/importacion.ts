// Lógica pura de importación de movimientos desde CSV.
// No depende de Next ni de Supabase: recibe catálogos ya cargados y devuelve filas preparadas.

export const COLUMNAS = ["fecha", "tipo", "concepto", "monto", "descripcion"] as const;
export const MAX_FILAS = 5000;

export type Catalogo = { id: string; nombre: string };
export type Catalogos = { fuentes: Catalogo[]; categorias: Catalogo[] };

export type MovimientoPreparado = {
  tipo: "ingreso" | "gasto";
  fecha: string;
  monto: number;
  fuente_ingreso_id: string | null;
  categoria_gasto_id: string | null;
  descripcion: string;
};

export type FilaPreparada = {
  linea: number;
  estado: "ok" | "error" | "duplicado";
  mensaje: string;
  movimiento?: MovimientoPreparado;
};

export type ResultadoImportacion = { error?: string; filas: FilaPreparada[] };

// Divide una línea CSV respetando comillas dobles. El separador es ',' o ';'.
export function dividirLinea(linea: string, separador: string): string[] {
  const campos: string[] = [];
  let actual = "";
  let entreComillas = false;

  for (let i = 0; i < linea.length; i++) {
    const c = linea[i];
    if (entreComillas) {
      if (c === '"' && linea[i + 1] === '"') {
        actual += '"';
        i++;
      } else if (c === '"') {
        entreComillas = false;
      } else {
        actual += c;
      }
    } else if (c === '"') {
      entreComillas = true;
    } else if (c === separador) {
      campos.push(actual);
      actual = "";
    } else {
      actual += c;
    }
  }
  campos.push(actual);
  return campos.map((s) => s.trim());
}

// Detecta el separador a partir de la línea de encabezados.
export function detectarSeparador(primeraLinea: string): string {
  const puntoYComa = (primeraLinea.match(/;/g) ?? []).length;
  const coma = (primeraLinea.match(/,/g) ?? []).length;
  return puntoYComa > coma ? ";" : ",";
}

// Acepta YYYY-MM-DD o DD/MM/YYYY (formato colombiano). Devuelve YYYY-MM-DD o null.
export function interpretarFecha(valor: string): string | null {
  let anio: number, mes: number, dia: number;
  const iso = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(valor);
  const col = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(valor);
  if (iso) {
    [anio, mes, dia] = [Number(iso[1]), Number(iso[2]), Number(iso[3])];
  } else if (col) {
    [dia, mes, anio] = [Number(col[1]), Number(col[2]), Number(col[3])];
  } else {
    return null;
  }
  const d = new Date(Date.UTC(anio, mes - 1, dia));
  if (d.getUTCFullYear() !== anio || d.getUTCMonth() !== mes - 1 || d.getUTCDate() !== dia) {
    return null;
  }
  return `${anio}-${String(mes).padStart(2, "0")}-${String(dia).padStart(2, "0")}`;
}

// COP no maneja centavos en este sistema. Acepta 1000000, 1.000.000, 1,000,000 o $ 1.000.000.
export function interpretarMonto(valor: string): number | null {
  const limpio = valor.replace(/[\s$]/g, "");
  if (/^\d+$/.test(limpio)) return Number(limpio);
  if (/^\d{1,3}([.,]\d{3})+$/.test(limpio)) return Number(limpio.replace(/[.,]/g, ""));
  return null;
}

// Clave para detectar duplicados contra movimientos ya guardados.
export function claveDuplicado(m: Pick<MovimientoPreparado, "fecha" | "tipo" | "monto" | "fuente_ingreso_id" | "categoria_gasto_id">): string {
  const concepto = m.tipo === "ingreso" ? m.fuente_ingreso_id : m.categoria_gasto_id;
  return [m.fecha, m.tipo, concepto, m.monto].join("|");
}

function buscar(lista: Catalogo[], nombre: string): Catalogo | undefined {
  const n = nombre.trim().toLowerCase();
  return lista.find((c) => c.nombre.trim().toLowerCase() === n);
}

// Valida el CSV completo. `existentes` contiene las claves de movimientos ya guardados en el rango.
export function prepararImportacion(
  texto: string,
  catalogos: Catalogos,
  existentes: Set<string>,
): ResultadoImportacion {
  const lineas = texto
    .replace(/^﻿/, "")
    .split(/\r?\n/)
    .filter((l) => l.trim() !== "");

  if (lineas.length < 2) {
    return { error: "El archivo debe tener encabezados y al menos una fila de datos.", filas: [] };
  }

  const separador = detectarSeparador(lineas[0]);
  const encabezados = dividirLinea(lineas[0], separador).map((h) => h.toLowerCase());
  const faltantes = COLUMNAS.filter((c) => !encabezados.includes(c));
  if (faltantes.length > 0) {
    return { error: `Faltan columnas: ${faltantes.join(", ")}.`, filas: [] };
  }
  if (lineas.length - 1 > MAX_FILAS) {
    return { error: `El archivo supera el máximo de ${MAX_FILAS} filas.`, filas: [] };
  }

  const idx = Object.fromEntries(COLUMNAS.map((c) => [c, encabezados.indexOf(c)])) as Record<(typeof COLUMNAS)[number], number>;
  const vistasEnArchivo = new Set<string>();
  const filas: FilaPreparada[] = [];

  lineas.slice(1).forEach((linea, i) => {
    const numero = i + 2;
    const celdas = dividirLinea(linea, separador);
    const get = (c: (typeof COLUMNAS)[number]) => celdas[idx[c]] ?? "";

    const fecha = interpretarFecha(get("fecha"));
    if (!fecha) return filas.push({ linea: numero, estado: "error", mensaje: `Fecha inválida: "${get("fecha")}".` });

    const tipo = get("tipo").toLowerCase();
    if (tipo !== "ingreso" && tipo !== "gasto") {
      return filas.push({ linea: numero, estado: "error", mensaje: `Tipo debe ser "ingreso" o "gasto".` });
    }

    const monto = interpretarMonto(get("monto"));
    if (monto === null) return filas.push({ linea: numero, estado: "error", mensaje: `Monto inválido: "${get("monto")}".` });

    const concepto = tipo === "ingreso"
      ? buscar(catalogos.fuentes, get("concepto"))
      : buscar(catalogos.categorias, get("concepto"));
    if (!concepto) {
      const lista = tipo === "ingreso" ? "fuente de ingreso" : "categoría de gasto";
      return filas.push({ linea: numero, estado: "error", mensaje: `No existe la ${lista}: "${get("concepto")}".` });
    }

    const movimiento: MovimientoPreparado = {
      tipo,
      fecha,
      monto,
      fuente_ingreso_id: tipo === "ingreso" ? concepto.id : null,
      categoria_gasto_id: tipo === "gasto" ? concepto.id : null,
      descripcion: get("descripcion"),
    };

    const clave = claveDuplicado(movimiento);
    if (existentes.has(clave) || vistasEnArchivo.has(clave)) {
      return filas.push({ linea: numero, estado: "duplicado", mensaje: "Ya existe un movimiento igual; se omite.", movimiento });
    }
    vistasEnArchivo.add(clave);

    filas.push({ linea: numero, estado: "ok", mensaje: "Listo para importar.", movimiento });
  });

  return { filas };
}
