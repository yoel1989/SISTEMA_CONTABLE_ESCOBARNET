"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

export type FilaMes = {
  mes: string;
  etiqueta: string;
  ingresos: number;
  gastos: number;
  lineas: Record<string, number>;
  grupos: Record<string, number>;
};

export type Serie = { clave: string; nombre: string };

const COP = new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 });
const COMPACTO = new Intl.NumberFormat("es-CO", { notation: "compact", style: "currency", currency: "COP", maximumFractionDigits: 1 });

// Paleta categórica validada (scripts/validate_palette.js). Se asigna por posición fija, nunca cíclica.
const SLOTS = ["var(--serie-1)", "var(--serie-2)", "var(--serie-3)", "var(--serie-4)"];

// Las variables de color (ESTILO_VIZ) viven en ./estilo-viz.ts.
const estiloEjes = { fill: "var(--texto-secundario)", fontSize: 12 };
const estiloTooltip = {
  background: "var(--superficie)",
  border: "1px solid var(--grid)",
  borderRadius: 8,
  color: "var(--texto)",
  fontSize: 12,
};

function Tooltips({ formatear }: { formatear: (v: number) => string }) {
  return (
    <Tooltip
      formatter={(valor) => formatear(Number(valor))}
      contentStyle={estiloTooltip}
      cursor={{ fill: "var(--grid)", opacity: 0.4 }}
    />
  );
}

// Gráfica de barras agrupadas: ingresos frente a gastos por mes.
export function GraficaIngresosGastos({ filas }: { filas: FilaMes[] }) {
  const datos = filas.map((f) => ({ mes: f.etiqueta, Ingresos: f.ingresos, Gastos: f.gastos }));
  return (
    <div className="h-64 w-full sm:h-72">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={datos} margin={{ top: 8, right: 8, left: 8, bottom: 0 }}>
          <CartesianGrid vertical={false} stroke="var(--grid)" />
          <XAxis dataKey="mes" tick={estiloEjes} tickLine={false} axisLine={false} />
          <YAxis tick={estiloEjes} tickFormatter={(v) => COMPACTO.format(v)} tickLine={false} axisLine={false} width={90} />
          <Tooltips formatear={(v) => COP.format(v)} />
          <Legend wrapperStyle={{ fontSize: 12, color: "var(--texto-secundario)" }} />
          <Bar dataKey="Ingresos" fill="var(--serie-1)" radius={[4, 4, 0, 0]} maxBarSize={28} />
          <Bar dataKey="Gastos" fill="var(--serie-2)" radius={[4, 4, 0, 0]} maxBarSize={28} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

// Barras apiladas: una serie por clave (línea de negocio o grupo de gasto).
export function GraficaApilada({
  filas,
  campo,
  series,
}: {
  filas: FilaMes[];
  campo: "lineas" | "grupos";
  series: Serie[];
}) {
  const datos = filas.map((f) => {
    const fila: Record<string, string | number> = { mes: f.etiqueta };
    for (const s of series) fila[s.nombre] = f[campo][s.clave] ?? 0;
    return fila;
  });
  return (
    <div className="h-64 w-full sm:h-72">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={datos} margin={{ top: 8, right: 8, left: 8, bottom: 0 }}>
          <CartesianGrid vertical={false} stroke="var(--grid)" />
          <XAxis dataKey="mes" tick={estiloEjes} tickLine={false} axisLine={false} />
          <YAxis tick={estiloEjes} tickFormatter={(v) => COMPACTO.format(v)} tickLine={false} axisLine={false} width={90} />
          <Tooltips formatear={(v) => COP.format(v)} />
          <Legend wrapperStyle={{ fontSize: 12, color: "var(--texto-secundario)" }} />
          {series.map((s, i) => (
            // Separador de 2px entre segmentos apilados, según la guía de marcas.
            <Bar key={s.clave} dataKey={s.nombre} stackId="total" fill={SLOTS[i]} stroke="var(--superficie)" strokeWidth={2} maxBarSize={36} />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

// Barras horizontales: total del periodo por categoría de gasto.
export function GraficaCategorias({ datos }: { datos: { nombre: string; total: number }[] }) {
  return (
    <div style={{ height: Math.max(180, datos.length * 34) }} className="w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={datos} layout="vertical" margin={{ top: 4, right: 16, left: 8, bottom: 0 }}>
          <CartesianGrid horizontal={false} stroke="var(--grid)" />
          <XAxis type="number" tick={estiloEjes} tickFormatter={(v) => COMPACTO.format(v)} tickLine={false} axisLine={false} />
          <YAxis type="category" dataKey="nombre" tick={estiloEjes} width={190} tickLine={false} axisLine={false} />
          <Tooltips formatear={(v) => COP.format(v)} />
          <Bar dataKey="total" name="Total" fill="var(--serie-1)" radius={[0, 4, 4, 0]} maxBarSize={22} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
