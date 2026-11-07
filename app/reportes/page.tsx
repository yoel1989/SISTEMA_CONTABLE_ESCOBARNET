import Link from "next/link";
import { ShellApp } from "@/components/ui/shell-app";
import { TituloModulo } from "@/components/ui/titulo-modulo";
import { EstadoVacio } from "@/components/ui/estado-vacio";
import { sesionActual } from "@/lib/auth";
import { formatoCOP } from "@/lib/formato";
import {
  cabeceraTabla,
  encabezado,
  enlace,
  filaTabla,
  tabla,
  tablaWrap,
} from "@/components/ui/estilos";

// La sesión se lee en cada petición: no se prerenderiza.
export const instant = false;

// Los enlaces firmados caducan a la hora; se generan de nuevo en cada visita.
const SEGUNDOS_ENLACE = 60 * 60;

type FilaReporte = {
  id: string;
  sede: string;
  sede_clave: string;
  periodo_inicio: string;
  periodo_fin: string;
  archivo_path: string;
  total_ventas: number | string;
  total_mensajes: number;
};

export default async function Reportes() {
  const { supabase } = await sesionActual();

  const { data } = await supabase
    .from("reportes_sedes")
    .select("id, sede, sede_clave, periodo_inicio, periodo_fin, archivo_path, total_ventas, total_mensajes")
    .order("periodo_inicio", { ascending: false })
    .order("sede", { ascending: true });
  const lista = (data ?? []) as FilaReporte[];

  // Un enlace firmado por PDF, generado en una sola petición al bucket privado.
  const enlaces = new Map<string, string>();
  if (lista.length > 0) {
    const { data: firmados } = await supabase.storage
      .from("reportes-sedes")
      .createSignedUrls(lista.map((f) => f.archivo_path), SEGUNDOS_ENLACE);
    for (const f of firmados ?? []) {
      if (f.path && f.signedUrl) enlaces.set(f.path, f.signedUrl);
    }
  }

  return (
    <ShellApp>
      <main className="mx-auto w-full max-w-5xl space-y-6 p-4 sm:p-8">
        <header className={encabezado}>
          <Link href="/" className={`${enlace} no-underline`}>← Inicio</Link>
          <TituloModulo modulo="reportes" icono="calendario">Reportes de sedes</TituloModulo>
          <span aria-hidden className="w-12" />
        </header>

        <p className="text-sm text-ink-muted">
          Periodos del 29 al 28 de cada mes. Los reportes se generan automáticamente el día 28 a las 11:59 p. m.
        </p>

        <div className={tablaWrap}>
          <table className={tabla}>
            <thead className={cabeceraTabla}>
              <tr>
                <th className="p-3 font-semibold">Periodo</th>
                <th className="p-3 font-semibold">Sede</th>
                <th className="p-3 text-right font-semibold">Mensajes</th>
                <th className="p-3 text-right font-semibold">Total ventas</th>
                <th className="p-3 text-right font-semibold">PDF</th>
              </tr>
            </thead>
            <tbody>
              {lista.length === 0 && (
                <tr>
                  <td colSpan={5}>
                    <EstadoVacio
                      titulo="Aún no hay reportes."
                      texto="Aparecerán aquí cuando el proceso mensual termine."
                    />
                  </td>
                </tr>
              )}
              {lista.map((f) => {
                const url = enlaces.get(f.archivo_path);
                return (
                  <tr key={f.id} className={filaTabla}>
                    <td className="p-3 whitespace-nowrap tabular-nums">
                      {f.periodo_inicio} a {f.periodo_fin}
                    </td>
                    <td className="p-3 font-medium">{f.sede}</td>
                    <td className="p-3 text-right tabular-nums">{f.total_mensajes}</td>
                    <td className="p-3 text-right tabular-nums">{formatoCOP(f.total_ventas)}</td>
                    <td className="p-3 text-right">
                      {url ? (
                        <a href={url} target="_blank" rel="noopener noreferrer" className={`${enlace} font-medium`}>
                          Abrir
                        </a>
                      ) : (
                        <span className="text-ink-muted">No disponible</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </main>
    </ShellApp>
  );
}
