import Link from "next/link";
import { ShellApp } from "@/components/ui/shell-app";
import { TituloModulo } from "@/components/ui/titulo-modulo";
import { EstadoVacio } from "@/components/ui/estado-vacio";
import { sesionActual } from "@/lib/auth";
import { formatoCOP } from "@/lib/formato";
import { Alerta } from "@/components/ui/alerta";
import { eliminarReportes, generarReporte } from "./actions";
import { BotonEliminar, CasillaTodas } from "./controles-borrado";
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

// Los enlaces firmados caducan a la hora; se generan de nuevo en cada visita.
const SEGUNDOS_ENLACE = 60 * 60;

const CAMPOS =
  "id, sede, sede_clave, periodo_inicio, periodo_fin, archivo_path, total_ventas, total_a_enviar, total_mensajes";

const claseCampo =
  "rounded-lg border border-line-strong bg-surface px-3 py-2 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-modulo-reportes/40";

type FilaReporte = {
  id: string;
  sede: string;
  sede_clave: string;
  periodo_inicio: string;
  periodo_fin: string;
  archivo_path: string;
  total_ventas: number | string;
  // Null en reportes generados antes de la migración 0017.
  total_a_enviar: number | string | null;
  total_mensajes: number;
};

type Filtros = {
  periodo?: string;
  sede?: string;
  ventas?: string;
  error?: string;
  generando?: string;
  borrados?: string;
};

export default async function Reportes({ searchParams }: { searchParams: Promise<Filtros> }) {
  const filtros = await searchParams;
  const { supabase, esAdmin } = await sesionActual();

  // Opciones de los filtros: periodos y sedes que existen en la tabla.
  const { data: catalogo } = await supabase
    .from("reportes_sedes")
    .select("periodo_inicio, periodo_fin, sede_clave, sede");
  const filas = (catalogo ?? []) as Pick<FilaReporte, "periodo_inicio" | "periodo_fin" | "sede_clave" | "sede">[];
  const periodos = [...new Map(filas.map((f) => [f.periodo_inicio, f.periodo_fin])).entries()]
    .sort((a, b) => b[0].localeCompare(a[0]));
  const sedes = [...new Map(filas.map((f) => [f.sede_clave, f.sede])).entries()]
    .sort((a, b) => a[1].localeCompare(b[1]));

  // Consulta con los filtros aplicados. Solo se aceptan valores que existen en el catálogo.
  let consulta = supabase
    .from("reportes_sedes")
    .select(CAMPOS)
    .order("periodo_inicio", { ascending: false })
    .order("sede", { ascending: true });
  const periodoElegido = periodos.find(([inicio]) => inicio === filtros.periodo)?.[0];
  const sedeElegida = sedes.find(([clave]) => clave === filtros.sede)?.[0];
  const soloConVentas = filtros.ventas === "1";
  if (periodoElegido) consulta = consulta.eq("periodo_inicio", periodoElegido);
  if (sedeElegida) consulta = consulta.eq("sede_clave", sedeElegida);
  if (soloConVentas) consulta = consulta.gt("total_ventas", 0);

  const { data } = await consulta;
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

  const totalVentas = lista.reduce((suma, f) => suma + Number(f.total_ventas), 0);
  const totalAEnviar = lista.reduce((suma, f) => suma + Number(f.total_a_enviar ?? 0), 0);
  const columnas = esAdmin ? 7 : 6;
  const totalMensajes = lista.reduce((suma, f) => suma + Number(f.total_mensajes), 0);
  const hayFiltros = Boolean(periodoElegido || sedeElegida || soloConVentas);

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

        {filtros.error && <Alerta tipo="error">{filtros.error}</Alerta>}
        {filtros.borrados && (
          <Alerta tipo="exito">Se eliminaron {filtros.borrados} reporte(s) y sus PDF.</Alerta>
        )}
        {filtros.generando && (() => {
          const [desde, hasta] = filtros.generando.split("_");
          return (
            <Alerta tipo="exito">
              Generación iniciada para {desde} a {hasta}. Tarda varios minutos: vuelve a cargar esta página
              más tarde. El avance se ve en GitHub → Actions.
            </Alerta>
          );
        })()}

        {esAdmin && (
          <section className={`${tarjeta} space-y-3`}>
            <h2 className={subtitulo}>Generar reporte manual</h2>
            <p className="text-sm text-ink-muted">
              Genera los reportes de todas las sedes para las fechas elegidas. Si ya existe un reporte de la misma
              sede y fecha de inicio, se reemplaza.
            </p>
            <form action={generarReporte} className="flex flex-wrap items-end gap-3">
              <label className="flex flex-col gap-1 text-sm font-medium text-ink">
                Desde
                <input type="date" name="inicio" required className={claseCampo} />
              </label>
              <label className="flex flex-col gap-1 text-sm font-medium text-ink">
                Hasta
                <input type="date" name="fin" required className={claseCampo} />
              </label>
              <button type="submit" className={botonPrimario}>Generar reporte</button>
            </form>
          </section>
        )}

        <form method="get" className="flex flex-wrap items-end gap-3">
          <label className="flex flex-col gap-1 text-sm font-medium text-ink">
            Periodo
            <select name="periodo" defaultValue={periodoElegido ?? ""} className={claseCampo}>
              <option value="">Todos</option>
              {periodos.map(([inicio, fin]) => (
                <option key={inicio} value={inicio}>{inicio} a {fin}</option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-sm font-medium text-ink">
            Sede
            <select name="sede" defaultValue={sedeElegida ?? ""} className={claseCampo}>
              <option value="">Todas</option>
              {sedes.map(([clave, nombre]) => (
                <option key={clave} value={clave}>{nombre}</option>
              ))}
            </select>
          </label>
          <label className="flex items-center gap-2 pb-2 text-sm text-ink">
            <input type="checkbox" name="ventas" value="1" defaultChecked={soloConVentas} className="size-4" />
            Solo con ventas
          </label>
          <button type="submit" className={botonPrimario}>Filtrar</button>
          {hayFiltros && (
            <Link href="/reportes" className={botonSecundario}>Limpiar</Link>
          )}
        </form>

        <form id="tabla-reportes" action={eliminarReportes} className="space-y-3">
        {esAdmin && (
          <div className="flex justify-end">
            <BotonEliminar accion={eliminarReportes} />
          </div>
        )}
        <div className={tablaWrap}>
          <table className={tabla}>
            <thead className={cabeceraTabla}>
              <tr>
                {esAdmin && (
                  <th className="p-3 font-semibold">
                    <CasillaTodas formId="tabla-reportes" />
                  </th>
                )}
                <th className="p-3 font-semibold">Periodo</th>
                <th className="p-3 font-semibold">Sede</th>
                <th className="p-3 text-right font-semibold">Mensajes</th>
                <th className="p-3 text-right font-semibold">Total ventas</th>
                <th className="p-3 text-right font-semibold">A enviar</th>
                <th className="p-3 text-right font-semibold">PDF</th>
              </tr>
            </thead>
            <tbody>
              {lista.length === 0 && (
                <tr>
                  <td colSpan={columnas}>
                    <EstadoVacio
                      titulo={hayFiltros ? "Ningún reporte con esos filtros." : "Aún no hay reportes."}
                      texto={hayFiltros ? "Prueba con otro periodo o quita un filtro." : "Aparecerán aquí cuando el proceso mensual termine."}
                    />
                  </td>
                </tr>
              )}
              {lista.map((f) => {
                const url = enlaces.get(f.archivo_path);
                return (
                  <tr key={f.id} className={filaTabla}>
                    {esAdmin && (
                      <td className="p-3">
                        <input type="checkbox" name="ids" value={f.id} aria-label={`Seleccionar ${f.sede} ${f.periodo_inicio}`} className="size-4" />
                      </td>
                    )}
                    <td className="p-3 whitespace-nowrap tabular-nums">
                      {f.periodo_inicio} a {f.periodo_fin}
                    </td>
                    <td className="p-3 font-medium">{f.sede}</td>
                    <td className="p-3 text-right tabular-nums">{f.total_mensajes}</td>
                    <td className="p-3 text-right tabular-nums">{formatoCOP(f.total_ventas)}</td>
                    <td className="p-3 text-right tabular-nums">
                      {f.total_a_enviar == null ? <span className="text-ink-muted">Sin dato</span> : formatoCOP(f.total_a_enviar)}
                    </td>
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
            {lista.length > 0 && (
              <tfoot>
                <tr className="font-semibold">
                  <td className="p-3" colSpan={esAdmin ? 3 : 2}>
                    Total de {lista.length} {lista.length === 1 ? "reporte" : "reportes"}
                  </td>
                  <td className="p-3 text-right tabular-nums">{totalMensajes}</td>
                  <td className="p-3 text-right tabular-nums">{formatoCOP(totalVentas)}</td>
                  <td className="p-3 text-right tabular-nums">{formatoCOP(totalAEnviar)}</td>
                  <td className="p-3" />
                </tr>
              </tfoot>
            )}
          </table>
        </div>
        </form>
      </main>
    </ShellApp>
  );
}
