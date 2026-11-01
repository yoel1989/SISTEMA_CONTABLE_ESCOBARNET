import Link from "next/link";
import { ShellApp } from "@/components/ui/shell-app";
import { TituloModulo } from "@/components/ui/titulo-modulo";
import { sesionActual } from "@/lib/auth";
import { formatoCOP } from "@/lib/formato";
import { subirLogo } from "./actions";
import { tonoDeEstado } from "./tono-estado";
import { Alerta } from "@/components/ui/alerta";
import { Insignia } from "@/components/ui/insignia";
import { EstadoVacio } from "@/components/ui/estado-vacio";
import {
  botonPrimario,
  botonSecundario,
  cabeceraTabla,
  encabezado,
  enlace,
  filaTabla,
  subtitulo,
  tabla,
  tablaWrap,
  tarjeta,
} from "@/components/ui/estilos";

// La sesión se lee en cada petición: no se prerenderiza.
export const instant = false;

type Props = { searchParams: Promise<{ error?: string; guardado?: string }> };

export default async function Cotizaciones({ searchParams }: Props) {
  const params = await searchParams;
  const { supabase, esAdmin } = await sesionActual();

  const [{ data }, { data: conf }] = await Promise.all([
    supabase
      .from("cotizaciones")
      .select("id, numero, cliente, fecha, estado, total")
      .order("fecha", { ascending: false })
      .order("numero", { ascending: false }),
    supabase.from("configuracion").select("valor").eq("clave", "logo_path").maybeSingle(),
  ]);
  const lista = data ?? [];
  const tieneLogo = typeof conf?.valor === "string";

  return (
    <ShellApp>
    <main className="mx-auto w-full max-w-5xl space-y-6 p-4 sm:p-8">
      <header className={encabezado}>
        <Link href="/" className={`${enlace} no-underline`}>← Inicio</Link>
        <TituloModulo modulo="cotizaciones" icono="cotizaciones">Cotizaciones</TituloModulo>
        {esAdmin ? (
          <Link href="/cotizaciones/nueva" className={botonPrimario}>
            Nueva
          </Link>
        ) : (
          <span aria-hidden className="w-12" />
        )}
      </header>

      {params.error && <Alerta tipo="error">{params.error}</Alerta>}
      {params.guardado === "logo" && <Alerta tipo="exito">Logo guardado. Aparecerá en las próximas descargas.</Alerta>}

      <section className={`${tarjeta} flex flex-wrap items-center justify-between gap-4`}>
        <div className="space-y-1">
          <h2 className={subtitulo}>Logo de la empresa</h2>
          <p className="text-sm text-ink-muted">
            {tieneLogo ? "Logo cargado: se incluye en los PDF, Excel y Word." : "Sin logo: los documentos muestran el nombre ESCOBAR.NET."}
          </p>
        </div>
        {esAdmin && (
          <form action={subirLogo} encType="multipart/form-data" className="flex flex-wrap items-center gap-3">
            <input
              name="logo"
              type="file"
              accept=".png,.jpg,.jpeg,image/png,image/jpeg"
              required
              className="block max-w-xs cursor-pointer text-sm text-ink-muted file:mr-4 file:cursor-pointer file:rounded-lg file:border file:border-line-strong file:bg-surface-muted file:px-3 file:py-2 file:text-sm file:font-medium file:text-ink hover:file:bg-surface"
            />
            <button type="submit" className={botonSecundario}>
              {tieneLogo ? "Reemplazar logo" : "Subir logo"}
            </button>
          </form>
        )}
      </section>

      <div className={tablaWrap}>
        <table className={tabla}>
          <thead className={cabeceraTabla}>
            <tr>
              <th className="p-3 font-semibold">Número</th>
              <th className="p-3 font-semibold">Fecha</th>
              <th className="p-3 font-semibold">Cliente</th>
              <th className="p-3 font-semibold">Estado</th>
              <th className="p-3 text-right font-semibold">Total</th>
            </tr>
          </thead>
          <tbody>
            {lista.length === 0 && (
              <tr>
                <td colSpan={5}>
                  <EstadoVacio
                    titulo="Aún no hay cotizaciones."
                    texto={esAdmin ? "Crea la primera con el botón Nueva." : undefined}
                  />
                </td>
              </tr>
            )}
            {lista.map((c) => (
              <tr key={c.id} className={filaTabla}>
                <td className="p-3">
                  <Link href={`/cotizaciones/${c.id}`} className={`${enlace} font-medium`}>{c.numero}</Link>
                </td>
                <td className="p-3 whitespace-nowrap tabular-nums">{c.fecha}</td>
                <td className="p-3">{c.cliente}</td>
                <td className="p-3">
                  <Insignia tono={tonoDeEstado(c.estado)} className="capitalize">{c.estado}</Insignia>
                </td>
                <td className="p-3 text-right tabular-nums">{formatoCOP(c.total)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </main>
    </ShellApp>
  );
}
