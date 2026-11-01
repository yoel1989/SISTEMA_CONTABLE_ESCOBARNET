import Link from "next/link";
import { ShellApp } from "@/components/ui/shell-app";
import { TituloModulo } from "@/components/ui/titulo-modulo";
import { sesionActual } from "@/lib/auth";
import { desplazarMes, esMesValido, formatoCOP, mesActual, mesesEntre, nombreMes } from "@/lib/formato";
import { GraficaApilada, GraficaCategorias, GraficaIngresosGastos, type FilaMes, type Serie } from "./graficos";
import { ESTILO_VIZ } from "./estilo-viz";
import { Indicador } from "@/components/ui/indicador";
import { EstadoVacio } from "@/components/ui/estado-vacio";
import {
  ayuda,
  botonPrimario,
  cabeceraTabla,
  campoAncho,
  encabezado,
  enlace,
  enlaceVolver,
  etiqueta,
  filaTabla,
  subtitulo,
  tabla,
  tarjeta,
} from "@/components/ui/estilos";

// La sesión se lee en cada petición: no se prerenderiza.
export const instant = false;

type Props = { searchParams: Promise<{ desde?: string; hasta?: string }> };

const LINEAS: Serie[] = [
  { clave: "sede", nombre: "Sedes" },
  { clave: "internet", nombre: "Clientes internet" },
  { clave: "tv_satelital", nombre: "TV satelital" },
  { clave: "otro", nombre: "Otros ingresos" },
];
const GRUPOS: Serie[] = [
  { clave: "sede", nombre: "Sedes" },
  { clave: "tv", nombre: "Televisión" },
  { clave: "credito", nombre: "Créditos y pagos" },
  { clave: "otro", nombre: "Otros" },
];

export default async function Dashboard({ searchParams }: Props) {
  const params = await searchParams;
  const hastaPedido = esMesValido(params.hasta) ? params.hasta : mesActual();
  const desdePedido = esMesValido(params.desde) ? params.desde : desplazarMes(hastaPedido, -11);
  // Si el usuario invierte el rango, se corrige en lugar de mostrar una gráfica vacía.
  const desde = desdePedido <= hastaPedido ? desdePedido : hastaPedido;
  const hasta = desdePedido <= hastaPedido ? hastaPedido : desdePedido;

  const { supabase } = await sesionActual();

  const [balance, lineas, categorias] = await Promise.all([
    supabase
      .from("v_balance_mensual")
      .select("mes, total_ingresos, total_gastos")
      .gte("mes", `${desde}-01`)
      .lte("mes", `${hasta}-01`),
    supabase
      .from("v_ingresos_por_linea")
      .select("mes, linea, total")
      .gte("mes", `${desde}-01`)
      .lte("mes", `${hasta}-01`),
    supabase
      .from("v_gastos_por_categoria")
      .select("mes, grupo, nombre, total")
      .gte("mes", `${desde}-01`)
      .lte("mes", `${hasta}-01`),
  ]);

  // Una fila por mes del rango, aunque no tenga datos, para no dejar huecos.
  const filas: FilaMes[] = mesesEntre(desde, hasta).map((mes) => ({
    mes,
    etiqueta: nombreMes(mes).replace(" de ", " "),
    ingresos: 0,
    gastos: 0,
    lineas: {},
    grupos: {},
  }));
  const porMes = new Map(filas.map((f) => [f.mes, f]));

  for (const b of balance.data ?? []) {
    const f = porMes.get(b.mes.slice(0, 7));
    if (f) {
      f.ingresos = Number(b.total_ingresos);
      f.gastos = Number(b.total_gastos);
    }
  }
  for (const l of lineas.data ?? []) {
    const f = porMes.get(l.mes.slice(0, 7));
    if (f) f.lineas[l.linea] = (f.lineas[l.linea] ?? 0) + Number(l.total);
  }

  // Gastos por grupo y por categoría (para el periodo completo).
  const totalCategoria = new Map<string, { nombre: string; total: number }>();
  for (const c of categorias.data ?? []) {
    const f = porMes.get(c.mes.slice(0, 7));
    if (f) f.grupos[c.grupo] = (f.grupos[c.grupo] ?? 0) + Number(c.total);
    const previo = totalCategoria.get(c.nombre) ?? { nombre: c.nombre, total: 0 };
    totalCategoria.set(c.nombre, { nombre: c.nombre, total: previo.total + Number(c.total) });
  }
  const topCategorias = [...totalCategoria.values()].sort((a, b) => b.total - a.total).slice(0, 12);

  const totalIngresos = filas.reduce((a, f) => a + f.ingresos, 0);
  const totalGastos = filas.reduce((a, f) => a + f.gastos, 0);
  const balanceTotal = totalIngresos - totalGastos;
  const hayDatos = totalIngresos !== 0 || totalGastos !== 0;

  return (
    <ShellApp>
    <main className="viz mx-auto w-full max-w-6xl space-y-8 p-4 sm:p-8">
      <style>{ESTILO_VIZ}</style>

      <header className={encabezado}>
        <Link href="/" className={enlaceVolver}>← Inicio</Link>
        <TituloModulo modulo="dashboard" icono="dashboard">Dashboard</TituloModulo>
        <nav className="flex gap-4 text-sm">
          <Link href="/movimientos" className={enlace}>Movimientos</Link>
          <Link href="/tesoreria" className={enlace}>Tesorería</Link>
        </nav>
      </header>

      <form method="get" className={`${tarjeta} flex flex-wrap items-end gap-4 p-4`}>
        <label className="space-y-1.5">
          <span className={etiqueta}>Desde</span>
          <input type="month" name="desde" defaultValue={desde} className={`${campoAncho} block py-2 text-sm`} />
        </label>
        <label className="space-y-1.5">
          <span className={etiqueta}>Hasta</span>
          <input type="month" name="hasta" defaultValue={hasta} className={`${campoAncho} block py-2 text-sm`} />
        </label>
        <button type="submit" className={botonPrimario}>
          Aplicar
        </button>
        <p className={`${ayuda} basis-full`}>
          {filas.length} {filas.length === 1 ? "mes" : "meses"} seleccionados.
        </p>
      </form>

      <section className="grid gap-3 sm:grid-cols-3">
        <Indicador titulo="Ingresos del periodo" valor={formatoCOP(totalIngresos)} />
        <Indicador titulo="Gastos del periodo" valor={formatoCOP(totalGastos)} />
        <Indicador
          titulo="Balance del periodo"
          valor={formatoCOP(balanceTotal)}
          tono={balanceTotal < 0 ? "negativo" : "neutral"}
        />
      </section>

      <Seccion titulo="Ingresos frente a gastos por mes">
        {hayDatos ? (
          <>
            <GraficaIngresosGastos filas={filas} />
            <TablaMensual filas={filas} />
          </>
        ) : (
          <SinDatos />
        )}
      </Seccion>

      <Seccion titulo="Ingresos por línea de negocio">
        {hayDatos ? (
          <>
            <GraficaApilada filas={filas} campo="lineas" series={LINEAS} />
            <TablaSeries filas={filas} campo="lineas" series={LINEAS} />
          </>
        ) : (
          <SinDatos />
        )}
      </Seccion>

      <Seccion titulo="Gastos por grupo">
        {hayDatos ? (
          <>
            <GraficaApilada filas={filas} campo="grupos" series={GRUPOS} />
            <TablaSeries filas={filas} campo="grupos" series={GRUPOS} />
          </>
        ) : (
          <SinDatos />
        )}
      </Seccion>

      <Seccion titulo="Gastos por categoría en el periodo (top 12)">
        {topCategorias.length === 0 ? (
          <SinDatos />
        ) : (
          <GraficaCategorias datos={topCategorias} />
        )}
      </Seccion>
    </main>
    </ShellApp>
  );
}

function SinDatos() {
  return (
    <div className="rounded-xl border border-dashed border-line-strong">
      <EstadoVacio titulo="Sin movimientos en este periodo." texto="Prueba con otro rango de meses o registra movimientos." />
    </div>
  );
}

function Seccion({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <section className={`${tarjeta} space-y-5`}>
      <h2 className={subtitulo}>{titulo}</h2>
      {children}
    </section>
  );
}

// Tabla de respaldo: la vista tabular exigida cuando hay color de baja luminancia.
function TablaMensual({ filas }: { filas: FilaMes[] }) {
  return (
    <details className="disclosure text-sm">
      <summary className="py-1 text-ink-muted transition-colors hover:text-ink">Ver valores en tabla</summary>
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
            {filas.map((f) => (
              <tr key={f.mes} className={filaTabla}>
                <td className="p-3 capitalize">{f.etiqueta}</td>
                <td className="p-3 text-right tabular-nums">{formatoCOP(f.ingresos)}</td>
                <td className="p-3 text-right tabular-nums">{formatoCOP(f.gastos)}</td>
                <td className="p-3 text-right tabular-nums">{formatoCOP(f.ingresos - f.gastos)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </details>
  );
}

function TablaSeries({ filas, campo, series }: { filas: FilaMes[]; campo: "lineas" | "grupos"; series: Serie[] }) {
  return (
    <details className="disclosure text-sm">
      <summary className="py-1 text-ink-muted transition-colors hover:text-ink">Ver valores en tabla</summary>
      <div className="mt-4 overflow-x-auto rounded-xl border border-line">
        <table className={tabla}>
          <thead className={cabeceraTabla}>
            <tr>
              <th className="p-3 font-semibold">Mes</th>
              {series.map((s) => (
                <th key={s.clave} className="p-3 text-right font-semibold">{s.nombre}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filas.map((f) => (
              <tr key={f.mes} className={filaTabla}>
                <td className="p-3 capitalize">{f.etiqueta}</td>
                {series.map((s) => (
                  <td key={s.clave} className="p-3 text-right tabular-nums">{formatoCOP(f[campo][s.clave] ?? 0)}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </details>
  );
}
