import Link from "next/link";
import { ShellApp } from "@/components/ui/shell-app";
import { TituloModulo } from "@/components/ui/titulo-modulo";
import { notFound } from "next/navigation";
import { sesionActual } from "@/lib/auth";
import { formatoCOP } from "@/lib/formato";
import { cambiarEstado, eliminarCotizacion } from "../actions";
import { tonoDeEstado } from "../tono-estado";
import { Alerta } from "@/components/ui/alerta";
import { Insignia } from "@/components/ui/insignia";
import {
  botonCompacto,
  botonPeligro,
  botonPrimario,
  botonSecundario,
  cabeceraTabla,
  campoAncho,
  encabezado,
  enlaceVolver,
  etiqueta,
  filaTabla,
  tabla,
  tarjeta,
} from "@/components/ui/estilos";

// La sesión se lee en cada petición: no se prerenderiza.
export const instant = false;

type Props = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string; guardado?: string }>;
};

const ESTADOS = ["borrador", "enviada", "aceptada", "rechazada"];

export default async function DetalleCotizacion({ params, searchParams }: Props) {
  const { id } = await params;
  const query = await searchParams;
  const { supabase, esAdmin } = await sesionActual();

  const { data: cot } = await supabase
    .from("cotizaciones")
    .select("id, numero, cliente, fecha, estado, descripcion, observaciones, total")
    .eq("id", id)
    .single();
  if (!cot) notFound();

  const { data: items } = await supabase
    .from("cotizacion_items")
    .select("id, descripcion, cantidad, precio_unitario, subtotal")
    .eq("cotizacion_id", id)
    .order("orden");

  return (
    <ShellApp>
    <main className="mx-auto w-full max-w-4xl space-y-6 p-4 sm:p-8">
      <header className={encabezado}>
        <Link href="/cotizaciones" className={enlaceVolver}>← Cotizaciones</Link>
        <div className="flex items-center gap-3">
          <TituloModulo modulo="cotizaciones" icono="cotizaciones">{cot.numero}</TituloModulo>
          <Insignia tono={tonoDeEstado(cot.estado)} className="capitalize">{cot.estado}</Insignia>
        </div>
      </header>

      {query.error && <Alerta tipo="error">{query.error}</Alerta>}
      {query.guardado === "editada" && <Alerta tipo="exito">Cotización actualizada.</Alerta>}

      <section className={`${tarjeta} space-y-6`}>
        <div className="grid gap-4 text-sm sm:grid-cols-2">
          <div className="space-y-1">
            <p className="text-ink-muted">Cliente</p>
            <p className="font-medium">{cot.cliente}</p>
          </div>
          <div className="space-y-1">
            <p className="text-ink-muted">Fecha</p>
            <p className="font-medium tabular-nums">{cot.fecha}</p>
          </div>
        </div>

        {cot.descripcion && (
          <div className="space-y-1">
            <p className="text-sm text-ink-muted">Descripción</p>
            <p className="whitespace-pre-line text-sm">{cot.descripcion}</p>
          </div>
        )}

        <div className="overflow-x-auto rounded-xl border border-line">
          <table className={tabla}>
            <thead className={cabeceraTabla}>
              <tr>
                <th className="p-3 font-semibold">Descripción</th>
                <th className="p-3 text-right font-semibold">Cant.</th>
                <th className="p-3 text-right font-semibold">Precio</th>
                <th className="p-3 text-right font-semibold">Subtotal</th>
              </tr>
            </thead>
            <tbody>
              {(items ?? []).map((it) => (
                <tr key={it.id} className={filaTabla}>
                  <td className="p-3">{it.descripcion}</td>
                  <td className="p-3 text-right tabular-nums">{Number(it.cantidad)}</td>
                  <td className="p-3 text-right tabular-nums">{formatoCOP(it.precio_unitario)}</td>
                  <td className="p-3 text-right tabular-nums">{formatoCOP(it.subtotal)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot className="bg-surface-muted">
              <tr>
                <td colSpan={3} className="p-3 text-right font-semibold">Total</td>
                <td className="p-3 text-right text-base font-semibold tabular-nums">{formatoCOP(cot.total)}</td>
              </tr>
            </tfoot>
          </table>
        </div>

        {cot.observaciones && (
          <div className="space-y-1">
            <p className="text-sm text-ink-muted">Observaciones</p>
            <p className="whitespace-pre-line text-sm">{cot.observaciones}</p>
          </div>
        )}

        <div className="flex flex-wrap items-center gap-2 border-t border-line pt-5 text-sm">
          <span className="mr-1 text-ink-muted">Descargar:</span>
          <a href={`/cotizaciones/${cot.id}/exportar/pdf`} className={botonCompacto}>PDF</a>
          <a href={`/cotizaciones/${cot.id}/exportar/xlsx`} className={botonCompacto}>Excel</a>
          <a href={`/cotizaciones/${cot.id}/exportar/docx`} className={botonCompacto}>Word</a>
          {esAdmin && (
            <Link href={`/cotizaciones/${cot.id}/editar`} className={`${botonSecundario} ml-auto`}>
              Editar
            </Link>
          )}
        </div>
      </section>

      {esAdmin && (
        <>
          <form action={cambiarEstado} className={`${tarjeta} flex flex-wrap items-end gap-4`}>
            <input type="hidden" name="id" value={cot.id} />
            <label className="space-y-1.5">
              <span className={etiqueta}>Estado</span>
              <select name="estado" defaultValue={cot.estado} className={`${campoAncho} block py-2 capitalize`}>
                {ESTADOS.map((e) => (
                  <option key={e} value={e} className="capitalize">{e}</option>
                ))}
              </select>
            </label>
            <button type="submit" className={botonPrimario}>Cambiar estado</button>
          </form>

          <form action={eliminarCotizacion} className="flex justify-end">
            <input type="hidden" name="id" value={cot.id} />
            <button type="submit" className={botonPeligro}>Eliminar cotización</button>
          </form>
        </>
      )}
    </main>
    </ShellApp>
  );
}
