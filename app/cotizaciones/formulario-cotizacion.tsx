"use client";

import { useState } from "react";
import { formatoCOP } from "@/lib/formato";
import { botonPrimario, botonSecundario, campo, etiqueta, tarjeta } from "@/components/ui/estilos";

export type ValoresCotizacion = {
  cliente: string;
  fecha: string;
  descripcion: string;
  observaciones: string;
  items: { descripcion: string; cantidad: number; precio_unitario: number }[];
};

type Fila = { id: number; descripcion: string; cantidad: string; precio: string };

type Props = {
  // Server action que recibe el formulario (crear o actualizar).
  accion: (formData: FormData) => void | Promise<void>;
  // Para editar: id de la cotización y valores iniciales.
  id?: string;
  inicial?: ValoresCotizacion;
  fechaPorDefecto: string;
  textoBoton: string;
};

// Celda de ítem: en teléfono muestra su etiqueta encima; en escritorio la cabecera de la fila hace ese papel.
const etiquetaCelda = "mb-1 block text-xs font-medium text-ink-muted sm:hidden";

export function FormularioCotizacion({ accion, id, inicial, fechaPorDefecto, textoBoton }: Props) {
  const [filas, setFilas] = useState<Fila[]>(
    inicial?.items.length
      ? inicial.items.map((it, i) => ({
          id: i + 1,
          descripcion: it.descripcion,
          cantidad: String(it.cantidad),
          precio: String(it.precio_unitario),
        }))
      : [{ id: 1, descripcion: "", cantidad: "1", precio: "" }],
  );
  const [siguiente, setSiguiente] = useState((inicial?.items.length ?? 0) + 2);

  const actualizar = (fila: number, campoCambiado: keyof Omit<Fila, "id">, valor: string) =>
    setFilas((prev) => prev.map((f) => (f.id === fila ? { ...f, [campoCambiado]: valor } : f)));

  const quitar = (fila: number) => setFilas((prev) => (prev.length > 1 ? prev.filter((f) => f.id !== fila) : prev));

  const agregar = () => {
    setFilas((prev) => [...prev, { id: siguiente, descripcion: "", cantidad: "1", precio: "" }]);
    setSiguiente((s) => s + 1);
  };

  const items = filas.map((f) => ({
    descripcion: f.descripcion,
    cantidad: Number(f.cantidad),
    precio_unitario: Number(f.precio),
  }));
  const total = items.reduce(
    (acc, it) => acc + (Number.isFinite(it.cantidad * it.precio_unitario) ? it.cantidad * it.precio_unitario : 0),
    0,
  );

  return (
    <form action={accion} className={`${tarjeta} space-y-6`}>
      {id && <input type="hidden" name="id" value={id} />}

      <label className="block space-y-1.5">
        <span className={etiqueta}>Cliente</span>
        <input name="cliente" required defaultValue={inicial?.cliente ?? ""} className={campo} />
      </label>

      <label className="block space-y-1.5">
        <span className={etiqueta}>Descripción</span>
        <textarea
          name="descripcion"
          rows={3}
          defaultValue={inicial?.descripcion ?? ""}
          placeholder="Qué incluye la cotización, alcance, condiciones principales…"
          className={campo}
        />
      </label>

      <label className="block space-y-1.5 sm:w-64">
        <span className={etiqueta}>Fecha</span>
        <input name="fecha" type="date" required defaultValue={inicial?.fecha ?? fechaPorDefecto} className={campo} />
      </label>

      <fieldset className="space-y-3">
        <legend className={`${etiqueta} mb-3`}>Ítems</legend>

        <div className="hidden grid-cols-[1fr_7rem_9rem_5.5rem] gap-3 px-0.5 text-xs font-semibold uppercase tracking-wide text-ink-muted sm:grid">
          <span>Descripción</span>
          <span>Cantidad</span>
          <span>Precio unitario</span>
          <span />
        </div>

        {filas.map((f) => (
          <div
            key={f.id}
            className="grid grid-cols-2 items-end gap-3 rounded-xl border border-line bg-surface-muted/60 p-3 sm:grid-cols-[1fr_7rem_9rem_5.5rem] sm:border-0 sm:bg-transparent sm:p-0"
          >
            <label className="col-span-2 block min-w-0 sm:col-span-1">
              <span className={etiquetaCelda}>Descripción</span>
              <input
                aria-label="Descripción del ítem"
                value={f.descripcion}
                onChange={(e) => actualizar(f.id, "descripcion", e.target.value)}
                className={campo}
              />
            </label>
            <label className="block min-w-0">
              <span className={etiquetaCelda}>Cantidad</span>
              <input
                aria-label="Cantidad"
                type="number"
                min="0.01"
                step="any"
                value={f.cantidad}
                onChange={(e) => actualizar(f.id, "cantidad", e.target.value)}
                className={`${campo} tabular-nums`}
              />
            </label>
            <label className="block min-w-0">
              <span className={etiquetaCelda}>Precio unitario</span>
              <input
                aria-label="Precio unitario"
                type="number"
                min="0"
                step="1"
                value={f.precio}
                onChange={(e) => actualizar(f.id, "precio", e.target.value)}
                className={`${campo} tabular-nums`}
              />
            </label>
            <button
              type="button"
              onClick={() => quitar(f.id)}
              aria-label="Quitar ítem"
              className="col-span-2 rounded-lg px-2 py-2 text-sm font-medium text-ink-muted transition-colors hover:bg-danger-bg hover:text-danger sm:col-span-1"
            >
              <span className="sm:hidden">Quitar ítem</span>
              <span aria-hidden className="hidden text-lg leading-none sm:inline">×</span>
            </button>
          </div>
        ))}

        <button type="button" onClick={agregar} className={botonSecundario}>
          + Agregar ítem
        </button>
      </fieldset>

      <div className="flex items-center justify-between gap-4 rounded-xl bg-surface-muted px-4 py-3">
        <p className="text-sm font-medium text-ink-muted">Total</p>
        <p className="text-xl font-semibold tabular-nums tracking-tight">{formatoCOP(total)}</p>
      </div>

      <label className="block space-y-1.5">
        <span className={etiqueta}>Observaciones</span>
        <textarea
          name="observaciones"
          rows={3}
          defaultValue={inicial?.observaciones ?? ""}
          placeholder="Validez de la oferta, forma de pago, tiempos de entrega…"
          className={campo}
        />
      </label>

      {/* Los ítems viajan como JSON; el servidor los valida y recalcula el total. */}
      <input type="hidden" name="items" value={JSON.stringify(items)} />

      <div className="flex justify-end">
        <button type="submit" className={`${botonPrimario} w-full sm:w-auto`}>
          {textoBoton}
        </button>
      </div>
    </form>
  );
}
