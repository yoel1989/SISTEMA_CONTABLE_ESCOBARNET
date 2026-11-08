import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { desplazarMes, formatoCOP, mesActual, mesesEntre, nombreMes, rangoMes } from "@/lib/formato";
import { Indicador, type Variacion } from "@/components/ui/indicador";
import { Alerta } from "@/components/ui/alerta";
import { EstadoVacio } from "@/components/ui/estado-vacio";
import { EncabezadoSeccion } from "@/components/ui/encabezado-seccion";
import { Icono, type NombreIcono } from "@/components/ui/iconos";
import { CLASES_MODULO, type ModuloId } from "@/components/ui/modulos";
import { ayuda, cabeceraTabla, filaTabla, tabla, tarjeta } from "@/components/ui/estilos";
import { ShellApp } from "@/components/ui/shell-app";
import { GraficaIngresosGastos, type FilaMes } from "./dashboard/graficos";
import { ESTILO_VIZ } from "./dashboard/estilo-viz";

// La sesión se lee en cada petición: no se prerenderiza.
export const instant = false;

type ClienteSupabase = Awaited<ReturnType<typeof createClient>>;

const ACCESOS: { href: string; titulo: string; descripcion: string; icono: NombreIcono; modulo: ModuloId; nuevaPestana?: boolean }[] = [
  {
    href: "/movimientos",
    modulo: "movimientos",
    titulo: "Movimientos contables",
    descripcion: "Registra ingresos y gastos mes a mes y revisa la hoja mensual.",
    icono: "movimientos",
  },
  {
    href: "/tesoreria",
    modulo: "tesoreria",
    titulo: "Tesorería",
    descripcion: "Saldos de efectivo, billeteras digitales, préstamos y cuentas.",
    icono: "tesoreria",
  },
  {
    href: "/dashboard",
    modulo: "dashboard",
    titulo: "Dashboard",
    descripcion: "Ingresos, gastos y balance por rango de meses, con gráficas y tablas.",
    icono: "dashboard",
  },
  {
    href: "/cotizaciones",
    modulo: "cotizaciones",
    titulo: "Cotizaciones",
    descripcion: "Crea y descarga cotizaciones en PDF, Excel o Word.",
    icono: "cotizaciones",
  },
  {
    href: "/reportes",
    modulo: "reportes",
    titulo: "Reportes de sedes",
    descripcion: "Reportes mensuales de ventas por sede, generados desde Telegram.",
    icono: "calendario",
  },
  {
    href: "/recibos",
    modulo: "recibos",
    titulo: "Recibos de televisión",
    descripcion: "Crea y consulta los recibos de pago del servicio de televisión.",
    icono: "cotizaciones",
    nuevaPestana: true,
  },
];

// Tamaño de página al leer movimientos (PostgREST devuelve como máximo 1000 filas por petición).
const PAGINA = 1000;

type FilaIngreso = {
  id: string;
  monto: number | string;
  fuente_ingreso_id: string | null;
  fuentes_ingreso: { nombre: string } | { nombre: string }[] | null;
};

// Suma los ingresos del mes por fuente, leyendo todas las páginas.
async function ingresosPorFuente(supabase: ClienteSupabase, inicio: string, siguiente: string) {
  const totales = new Map<string, { nombre: string; total: number }>();
  let fallo = false;

  for (let desde = 0; ; desde += PAGINA) {
    const { data, error } = await supabase
      .from("movimientos")
      .select("id, monto, fuente_ingreso_id, fuentes_ingreso(nombre)")
      .eq("tipo", "ingreso")
      .gte("fecha", inicio)
      .lt("fecha", siguiente)
      .order("id")
      .range(desde, desde + PAGINA - 1);

    if (error) {
      fallo = true;
      break;
    }

    const lote = (data ?? []) as FilaIngreso[];
    for (const m of lote) {
      const clave = m.fuente_ingreso_id ?? "sin-fuente";
      const join = m.fuentes_ingreso;
      const nombre = Array.isArray(join) ? join[0]?.nombre : join?.nombre;
      const previo = totales.get(clave) ?? { nombre: nombre ?? "Sin fuente", total: 0 };
      totales.set(clave, { nombre: previo.nombre, total: previo.total + Number(m.monto) });
    }

    if (lote.length < PAGINA) break;
  }

  return { totales, fallo };
}

// "octubre de 2026" -> "oct 26", para los ejes de la gráfica.
function etiquetaMes(mes: string): string {
  const [nombre, anio] = nombreMes(mes).split(" de ");
  return `${nombre.slice(0, 3)} ${anio?.slice(2) ?? ""}`.trim();
}

// Variación porcentual frente al mes anterior. `subirEsBueno` define el tono (gastos al alza = negativo).
function variacion(actual: number, previo: number | null, nombrePrevio: string, subirEsBueno: boolean): Variacion | null {
  if (previo === null) return null;
  if (previo === 0) return { texto: `Sin base en ${nombrePrevio}`, tono: "neutral" };
  const pct = ((actual - previo) / Math.abs(previo)) * 100;
  if (Math.abs(pct) < 0.05) return { texto: `Igual que en ${nombrePrevio}`, tono: "neutral" };
  const sube = pct > 0;
  const flecha = sube ? "↑" : "↓";
  const numero = `${Math.abs(pct).toFixed(1).replace(".", ",")} %`;
  const bueno = sube === subirEsBueno;
  return { texto: `${flecha} ${numero} frente a ${nombrePrevio}`, tono: bueno ? "positivo" : "negativo" };
}

export default async function Home() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: perfil } = await supabase
    .from("profiles")
    .select("nombre, rol")
    .eq("id", user.id)
    .single();

  const mes = mesActual();
  const { inicio, siguiente } = rangoMes(mes);
  const mesAnterior = desplazarMes(mes, -1);
  const mesTexto = nombreMes(mes);
  const mesTitulo = mesTexto.charAt(0).toUpperCase() + mesTexto.slice(1);
  const nombreMesAnterior = nombreMes(mesAnterior).split(" de ")[0];

  const [balance, balancePrevio, fuentesActivas, ingresos, acumulado] = await Promise.all([
    supabase
      .from("v_balance_mensual")
      .select("total_ingresos, total_gastos, balance")
      .eq("mes", inicio)
      .maybeSingle(),
    supabase
      .from("v_balance_mensual")
      .select("total_ingresos, total_gastos, balance")
      .eq("mes", rangoMes(mesAnterior).inicio)
      .maybeSingle(),
    supabase.from("fuentes_ingreso").select("id, nombre").eq("activa", true).order("nombre"),
    ingresosPorFuente(supabase, inicio, siguiente),
    // Historial completo de meses y años: alimenta la gráfica y el balance acumulado.
    supabase.from("v_balance_mensual").select("mes, total_ingresos, total_gastos").order("mes"),
  ]);

  const ingresosMes = Number(balance.data?.total_ingresos ?? 0);
  const gastosMes = Number(balance.data?.total_gastos ?? 0);
  const saldoMes = Number(balance.data?.balance ?? 0);
  // Un valor por mes registrado; los meses sin movimientos se completan con cero entre el primero y el último.
  const porMes = new Map(
    (acumulado.data ?? []).map((r): [string, { ingresos: number; gastos: number }] => [
      String(r.mes).slice(0, 7),
      { ingresos: Number(r.total_ingresos), gastos: Number(r.total_gastos) },
    ]),
  );
  const saldoAcumulado = [...porMes.values()].reduce((acc, m) => acc + m.ingresos - m.gastos, 0);
  const mesesRegistrados = [...porMes.keys()].sort();
  const hastaMes = [...mesesRegistrados, mes].sort()[mesesRegistrados.length];
  const filasMensuales: FilaMes[] =
    mesesRegistrados.length === 0
      ? []
      : mesesEntre(mesesRegistrados[0], hastaMes).map((m) => {
          const valores = porMes.get(m) ?? { ingresos: 0, gastos: 0 };
          return { mes: m, etiqueta: etiquetaMes(m), ingresos: valores.ingresos, gastos: valores.gastos, lineas: {}, grupos: {} };
        });

  const previoExiste = balancePrevio.data !== null && balancePrevio.data !== undefined;
  const ingresosPrev = previoExiste ? Number(balancePrevio.data?.total_ingresos ?? 0) : null;
  const gastosPrev = previoExiste ? Number(balancePrevio.data?.total_gastos ?? 0) : null;
  const saldoPrev = previoExiste ? Number(balancePrevio.data?.balance ?? 0) : null;

  // Cada fuente activa aparece en la tabla (aunque tenga 0); los movimientos de fuentes inactivas también cuentan.
  const totales = ingresos.totales;
  for (const f of fuentesActivas.data ?? []) {
    if (!totales.has(f.id)) totales.set(f.id, { nombre: f.nombre, total: 0 });
  }
  const ordenadas = [...totales.values()].sort(
    (a, b) => b.total - a.total || a.nombre.localeCompare(b.nombre, "es"),
  );
  const totalDelMes = ordenadas.reduce((acc, f) => acc + f.total, 0);

  const conIngreso = ordenadas.filter((f) => f.total > 0);

  const nombreCorto = perfil?.nombre ? perfil.nombre.split(" ")[0] : null;
  const saludo = nombreCorto ? `Hola, ${nombreCorto}` : "Hola";

  return (
    <ShellApp>
      <main className="flex-1">
        {/* Sección principal: saludo, mes e indicadores */}
        <section
          aria-labelledby="resumen-mes"
          className="border-b border-line bg-surface bg-[radial-gradient(70rem_28rem_at_100%_-20%,var(--accent-bg),transparent)]"
        >
          <div className="mx-auto max-w-6xl px-4 py-10 sm:px-8 sm:py-14">
            <p className="inline-flex items-center gap-2 rounded-full border border-line bg-surface px-3 py-1 text-xs font-medium text-ink-muted">
              <Icono nombre="calendario" className="size-3.5" />
              {mesTitulo}
            </p>
            <h1 id="resumen-mes" className="mt-4 text-3xl font-semibold tracking-tight text-ink sm:text-4xl">
              {saludo}
            </h1>
            <p className="mt-2 max-w-2xl text-base text-ink-muted">
              Así va el mes: ingresos, gastos y balance con los mismos datos de Movimientos.
            </p>
            <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <Indicador
                titulo="Ingresos del mes"
                valor={formatoCOP(ingresosMes)}
                icono="ingreso"
                variacion={variacion(ingresosMes, ingresosPrev, nombreMesAnterior, true)}
              />
              <Indicador
                titulo="Gastos del mes"
                valor={formatoCOP(gastosMes)}
                icono="gasto"
                variacion={variacion(gastosMes, gastosPrev, nombreMesAnterior, false)}
              />
              <Indicador
                titulo="Balance del mes"
                valor={formatoCOP(saldoMes)}
                icono="balance"
                tono={saldoMes < 0 ? "negativo" : "positivo"}
                variacion={variacion(saldoMes, saldoPrev, nombreMesAnterior, true)}
              />
              <Indicador
                titulo="Balance acumulado total"
                valor={formatoCOP(saldoAcumulado)}
                icono="balance"
                tono={saldoAcumulado < 0 ? "negativo" : "positivo"}
              />
            </div>
          </div>
        </section>

        {/* Ingresos frente a gastos por mes, desde el primer registro */}
        <section aria-labelledby="ingresos-gastos-mes" className="bg-canvas">
          <div className="mx-auto max-w-6xl space-y-6 px-4 py-12 sm:px-8">
            <EncabezadoSeccion
              id="ingresos-gastos-mes"
              icono="ingreso"
              titulo="Ingresos frente a gastos por mes"
              descripcion="Cada mes desde el primer registro hasta hoy, con sus ingresos y sus gastos."
            />

            {acumulado.error ? (
              <Alerta tipo="error">No se pudo cargar el historial de meses. Intenta recargar la página.</Alerta>
            ) : filasMensuales.length === 0 ? (
              <div className={tarjeta}>
                <EstadoVacio titulo="Sin movimientos registrados." texto="Registra ingresos y gastos en Movimientos para ver la gráfica." />
              </div>
            ) : (
              <div className={`${tarjeta} viz space-y-6`}>
                <style>{ESTILO_VIZ}</style>
                <GraficaIngresosGastos filas={filasMensuales} />

                <details className="disclosure text-sm">
                  <summary className="py-1 text-ink-muted transition-colors hover:text-ink">
                    Ver valores por mes
                  </summary>
                  <div className="mt-4 overflow-x-auto rounded-xl border border-line">
                    <table className={tabla}>
                      <thead className={cabeceraTabla}>
                        <tr>
                          <th className="p-3 font-semibold">Mes</th>
                          <th className="p-3 text-right font-semibold">Ingresos</th>
                          <th className="p-3 text-right font-semibold">Gastos</th>
                          <th className="p-3 text-right font-semibold">Balance</th>
                        </tr>
                      </thead>
                      <tbody>
                        {[...filasMensuales].reverse().map((f) => (
                          <tr key={f.mes} className={filaTabla}>
                            <td className="p-3">{f.etiqueta}</td>
                            <td className="p-3 text-right tabular-nums">{formatoCOP(f.ingresos)}</td>
                            <td className="p-3 text-right tabular-nums">{formatoCOP(f.gastos)}</td>
                            <td className="p-3 text-right tabular-nums">{formatoCOP(f.ingresos - f.gastos)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </details>
              </div>
            )}
          </div>
        </section>

        {/* Ingresos por fuente del mes (tabla) */}
        <section aria-labelledby="ingresos-fuente" className="bg-canvas">
          <div className="mx-auto max-w-6xl space-y-6 px-4 py-12 sm:px-8">
            <EncabezadoSeccion
              id="ingresos-fuente"
              icono="ingreso"
              titulo="Ingresos por fuente"
              descripcion={`Total de cada fuente de ingreso en ${mesTexto}.`}
            />

            {ingresos.fallo ? (
              <Alerta tipo="error">No se pudieron cargar los ingresos del mes. Intenta recargar la página.</Alerta>
            ) : conIngreso.length === 0 ? (
              <div className={tarjeta}>
                <EstadoVacio
                  titulo={`Sin ingresos registrados en ${mesTexto}.`}
                  texto="Registra ingresos en Movimientos o copia los ingresos recurrentes del mes."
                />
              </div>
            ) : (
              <div className={`${tarjeta} viz space-y-6`}>
                <details className="disclosure text-sm">
                  <summary className="py-1 text-ink-muted transition-colors hover:text-ink">
                    Ver valores en tabla
                  </summary>
                  <div className="mt-4 overflow-x-auto rounded-xl border border-line">
                    <table className={tabla}>
                      <thead className={cabeceraTabla}>
                        <tr>
                          <th className="p-3 font-semibold">Fuente de ingreso</th>
                          <th className="p-3 text-right font-semibold">Monto del mes</th>
                        </tr>
                      </thead>
                      <tbody>
                        {ordenadas.map((f) => (
                          <tr key={f.nombre} className={filaTabla}>
                            <td className="p-3">{f.nombre}</td>
                            <td className="p-3 text-right tabular-nums">{formatoCOP(f.total)}</td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot className="bg-surface-muted">
                        <tr>
                          <td className="p-3 font-semibold">Total</td>
                          <td className="p-3 text-right font-semibold tabular-nums">{formatoCOP(totalDelMes)}</td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </details>
              </div>
            )}
          </div>
        </section>

        {/* Accesos a los módulos */}
        <section aria-labelledby="modulos" className="border-t border-line bg-surface">
          <div className="mx-auto max-w-6xl space-y-6 px-4 py-12 sm:px-8">
            <EncabezadoSeccion
              id="modulos"
              icono="dashboard"
              titulo="Módulos"
              descripcion="Entra a cada parte del sistema contable."
            />
            <nav aria-label="Módulos" className="grid gap-4 sm:grid-cols-2">
              {ACCESOS.map((a) => (
                <Link
                  key={a.href}
                  href={a.href}
                  {...(a.nuevaPestana ? { target: "_blank", rel: "noopener noreferrer" } : {})}
                  className={`group flex items-start gap-4 rounded-2xl border border-line bg-canvas p-5 shadow-card transition-[border-color,box-shadow,transform] duration-200 hover:-translate-y-0.5 hover:shadow-elevado ${CLASES_MODULO[a.modulo].hoverBorde}`}
                >
                  <span className={`flex size-11 shrink-0 items-center justify-center rounded-xl transition-transform duration-200 group-hover:scale-105 ${CLASES_MODULO[a.modulo].fondo} ${CLASES_MODULO[a.modulo].texto}`}>
                    <Icono nombre={a.icono} className="size-5" />
                  </span>
                  <span className="min-w-0 flex-1 space-y-1">
                    <span className="block font-semibold text-ink">{a.titulo}</span>
                    <span className={`block ${ayuda} text-sm`}>{a.descripcion}</span>
                  </span>
                  <span
                    aria-hidden
                    className="mt-1 text-lg text-ink-muted transition-transform duration-200 group-hover:translate-x-1 group-hover:text-accent"
                  >
                    →
                  </span>
                </Link>
              ))}
            </nav>
          </div>
        </section>
      </main>
    </ShellApp>
  );
}
