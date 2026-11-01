"use client";

import { Bar, BarChart, CartesianGrid, LabelList, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

export type FuenteMes = { nombre: string; total: number };

const COP = new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 });
const COMPACTO = new Intl.NumberFormat("es-CO", { notation: "compact", style: "currency", currency: "COP", maximumFractionDigits: 1 });

const estiloEjes = { fill: "var(--texto-secundario)", fontSize: 12 };
const estiloTooltip = {
  background: "var(--superficie)",
  border: "1px solid var(--grid)",
  borderRadius: 8,
  color: "var(--texto)",
  fontSize: 12,
};

// Nombres largos se recortan en el eje; el nombre completo queda en el tooltip.
const recortar = (texto: string) => (texto.length > 18 ? `${texto.slice(0, 17)}…` : texto);

// Barras horizontales de una sola serie (serie-1), ordenadas de mayor a menor por el llamador.
export function GraficaIngresosFuente({ datos }: { datos: FuenteMes[] }) {
  const alto = Math.max(200, datos.length * 38 + 16);
  return (
    <div style={{ height: alto }} className="w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={datos} layout="vertical" margin={{ top: 4, right: 84, left: 0, bottom: 0 }}>
          <CartesianGrid horizontal={false} stroke="var(--grid)" />
          <XAxis type="number" hide />
          <YAxis
            type="category"
            dataKey="nombre"
            width={150}
            tick={estiloEjes}
            tickFormatter={recortar}
            tickLine={false}
            axisLine={false}
          />
          <Tooltip
            formatter={(valor) => COP.format(Number(valor))}
            contentStyle={estiloTooltip}
            cursor={{ fill: "var(--grid)", opacity: 0.4 }}
          />
          <Bar dataKey="total" name="Ingresos" fill="var(--serie-1)" radius={[0, 4, 4, 0]} maxBarSize={24}>
            <LabelList
              dataKey="total"
              position="right"
              formatter={(valor: unknown) => COMPACTO.format(Number(valor))}
              style={{ fill: "var(--texto)", fontSize: 12, fontVariantNumeric: "tabular-nums" }}
            />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
