import { formatoCOP } from "@/lib/formato";
import { guardarHoja } from "./hoja-actions";
import { quitarConcepto } from "./conceptos-actions";
import { BotonQuitar } from "./boton-quitar";
import { botonPrimario, celdaNumero, tabla } from "@/components/ui/estilos";

export type Fila = {
  key: string; // "i:<fuente_id>" o "g:<categoria_id>"
  nombre: string;
  dia: number | null; // solo ingresos
  referencia: number; // monto mensual de referencia del catálogo
  valor: number | null; // total del mes (suma de movimientos del concepto)
  cantidad: number; // cuántos movimientos tiene el concepto en el mes
};

export type Seccion = { titulo: string; filas: Fila[] };

type Props = {
  mes: string;
  esAdmin: boolean;
  ingresos: Seccion[];
  gastos: Seccion[];
};

function subtotalDe(seccion: Seccion) {
  return seccion.filas.reduce((a, f) => a + (f.valor ?? 0), 0);
}

function sumar(secciones: Seccion[]) {
  return secciones.reduce((acc, s) => acc + subtotalDe(s), 0);
}

export function HojaMensual({ mes, esAdmin, ingresos, gastos }: Props) {
  const totalIngresos = sumar(ingresos);
  const totalGastos = sumar(gastos);
  const balance = totalIngresos - totalGastos;

  const contenido = (
    <div className="space-y-6">
      <Grupo titulo="Ingresos" secciones={ingresos} total={totalIngresos} esAdmin={esAdmin} />
      <Grupo titulo="Gastos" secciones={gastos} total={totalGastos} esAdmin={esAdmin} />

      <div className="flex items-center justify-between rounded-xl border-t-2 border-line-strong bg-surface-muted px-4 py-3 font-semibold">
        <span>Balance del mes</span>
        <span className={`tabular-nums ${balance < 0 ? "text-danger" : "text-success"}`}>
          {formatoCOP(balance)}
        </span>
      </div>
    </div>
  );

  if (!esAdmin) {
    return <div className="rounded-2xl border border-line bg-surface p-4 shadow-card">{contenido}</div>;
  }

  return (
    <form action={guardarHoja} className="space-y-3">
      <input type="hidden" name="mes" value={mes} />

      <div className="flex justify-end">
        <button type="submit" className={botonPrimario}>
          Guardar hoja
        </button>
      </div>

      <div className="rounded-2xl border border-line bg-surface p-4 shadow-card">{contenido}</div>
      <p className="text-xs text-ink-muted">
        Abre una sección para editarla. Lo gris es el monto de referencia del catálogo. Los conceptos con varios movimientos se editan en el detalle.
      </p>
    </form>
  );
}

function Grupo({
  titulo,
  secciones,
  total,
  esAdmin,
}: {
  titulo: string;
  secciones: Seccion[];
  total: number;
  esAdmin: boolean;
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between px-1">
        <h3 className="text-sm font-bold uppercase tracking-wide text-ink">{titulo}</h3>
        <span className="font-bold tabular-nums">{formatoCOP(total)}</span>
      </div>

      {secciones.map((s) => (
        <Seccion key={s.titulo} seccion={s} esAdmin={esAdmin} />
      ))}
    </div>
  );
}

// Sección plegable: cerrada por defecto. Su resumen muestra el nombre y el subtotal.
function Seccion({ seccion, esAdmin }: { seccion: Seccion; esAdmin: boolean }) {
  const subtotal = subtotalDe(seccion);
  const conDia = seccion.filas.some((f) => f.dia !== null);

  return (
    <details className="group overflow-hidden rounded-xl border border-line">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 bg-surface-muted px-4 py-3 transition-colors hover:bg-surface-muted/70 [&::-webkit-details-marker]:hidden">
        <span className="flex items-center gap-2 text-sm font-medium text-ink">
          <span aria-hidden className="inline-block text-ink-muted transition-transform duration-200 group-open:rotate-90">›</span>
          {seccion.titulo}
          <span className="text-xs font-normal text-ink-muted">({seccion.filas.length})</span>
        </span>
        <span className="text-sm tabular-nums text-ink-muted">{formatoCOP(subtotal)}</span>
      </summary>

      <div className="overflow-x-auto">
        <table className={tabla}>
          <thead className="border-b border-line text-left text-xs font-semibold uppercase tracking-wide text-ink-muted">
            <tr>
              <th className="p-3">Concepto</th>
              {conDia && <th className="w-24 p-3">Día</th>}
              <th className="p-3 text-right">Monto del mes</th>
              {esAdmin && <th className="w-20 p-3"><span className="sr-only">Acciones</span></th>}
            </tr>
          </thead>
          <tbody>
            {seccion.filas.map((f) => (
              <tr key={f.key} className="border-b border-line/70 transition-colors last:border-0 hover:bg-surface-muted/60">
                <td className="p-3">{f.nombre}</td>
                {conDia && (
                  <td className="p-3 text-ink-muted">
                    {esAdmin && f.dia !== null ? (
                      <>
                        <input type="hidden" name={`od:${f.key}`} value={f.dia} />
                        <input
                          name={`d:${f.key}`}
                          type="number"
                          min="1"
                          max="28"
                          step="1"
                          inputMode="numeric"
                          defaultValue={f.dia}
                          aria-label={`Día de cobro de ${f.nombre}`}
                          title="Día de cobro (1 a 28). Aplica a los meses siguientes."
                          className="w-16 rounded border border-line-strong bg-transparent px-2 py-1 text-center tabular-nums"
                        />
                      </>
                    ) : (
                      f.dia ?? "—"
                    )}
                  </td>
                )}
                <td className="p-3 text-right">
                  {esAdmin && f.cantidad <= 1 ? (
                    <>
                      <input type="hidden" name={`o:${f.key}`} value={f.valor ?? ""} />
                      <input
                        name={`m:${f.key}`}
                        type="number"
                        min="0"
                        step="1"
                        inputMode="numeric"
                        defaultValue={f.valor ?? ""}
                        placeholder={f.referencia > 0 ? String(f.referencia) : "—"}
                        aria-label={`Monto de ${f.nombre}`}
                        className={celdaNumero}
                      />
                    </>
                  ) : (
                    <span
                      className={f.valor === null ? "text-ink-muted" : "tabular-nums"}
                      title={f.cantidad > 1 ? "Varios movimientos: edítalos en el detalle" : undefined}
                    >
                      {f.valor === null ? "—" : formatoCOP(f.valor)}
                      {f.cantidad > 1 && <span className="ml-1 text-xs text-ink-muted">({f.cantidad})</span>}
                    </span>
                  )}
                </td>
                {esAdmin && (
                  <td className="p-3 text-right">
                    <BotonQuitar nombre={f.nombre} accion={quitarConcepto.bind(null, f.key)} />
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </details>
  );
}
