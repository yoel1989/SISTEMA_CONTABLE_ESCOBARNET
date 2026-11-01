import Link from "next/link";
import { ShellApp } from "@/components/ui/shell-app";
import { sesionActual } from "@/lib/auth";
import { desplazarMes, esMesValido, formatoCOP, mesActual, nombreMes, rangoMes } from "@/lib/formato";
import { HojaMensual, type Fila, type Seccion } from "./hoja-mensual";
import { AgregarConcepto } from "./agregar-concepto";
import { Alerta, type TipoAlerta } from "@/components/ui/alerta";
import { Indicador } from "@/components/ui/indicador";
import { botonCompacto, enlace, encabezado } from "@/components/ui/estilos";

// La sesión se lee en cada petición: no se prerenderiza.
export const instant = false;

// "octubre de 2026" -> "Octubre de 2026" (solo la primera letra en mayúscula).
const tituloMes = (texto: string) => texto.charAt(0).toUpperCase() + texto.slice(1);

type Props = {
  searchParams: Promise<{ mes?: string; guardado?: string; error?: string }>;
};

// Orden y títulos de las secciones de la hoja.
const TIPOS_INGRESO: [string, string][] = [
  ["sede", "Sedes"],
  ["internet", "Clientes de internet"],
  ["tv_satelital", "TV satelital"],
  ["otro", "Otros ingresos"],
];
const GRUPOS_GASTO: [string, string][] = [
  ["sede", "Gastos de sedes"],
  ["tv", "Gastos de televisión"],
  ["credito", "Créditos y pagos"],
  ["otro", "Otros gastos"],
];

export default async function Movimientos({ searchParams }: Props) {
  const params = await searchParams;
  const mes = esMesValido(params.mes) ? params.mes : mesActual();
  const { inicio, siguiente } = rangoMes(mes);

  const { supabase, esAdmin } = await sesionActual();

  const [movs, fuentes, categorias, balance, acumulado] = await Promise.all([
    supabase
      .from("movimientos")
      .select("tipo, monto, fuente_ingreso_id, categoria_gasto_id")
      .gte("fecha", inicio)
      .lt("fecha", siguiente),
    supabase.from("fuentes_ingreso").select("id, nombre, tipo, activa, dia_cobro, monto_mensual").order("tipo").order("nombre"),
    supabase.from("categorias_gasto").select("id, nombre, grupo, activa, monto_mensual").order("grupo").order("nombre"),
    supabase.from("v_balance_mensual").select("total_ingresos, total_gastos, balance").eq("mes", inicio).maybeSingle(),
    // Balance de todos los meses hasta el seleccionado (incluido): lo que queda acumulado.
    supabase.from("v_balance_mensual").select("balance").lte("mes", inicio),
  ]);

  const listaMovs = movs.data ?? [];
  const listaFuentes = fuentes.data ?? [];
  const listaCategorias = categorias.data ?? [];

  // Totales por concepto del mes.
  const mapa = new Map<string, { total: number; cantidad: number }>();
  for (const m of listaMovs) {
    const key = m.tipo === "ingreso" ? `i:${m.fuente_ingreso_id}` : `g:${m.categoria_gasto_id}`;
    const actual = mapa.get(key) ?? { total: 0, cantidad: 0 };
    mapa.set(key, { total: actual.total + Number(m.monto), cantidad: actual.cantidad + 1 });
  }

  const filaDe = (key: string, nombre: string, dia: number | null, referencia: number): Fila => {
    const info = mapa.get(key);
    return {
      key,
      nombre,
      dia,
      referencia,
      valor: info ? info.total : null,
      cantidad: info?.cantidad ?? 0,
    };
  };

  const ingresos: Seccion[] = TIPOS_INGRESO.map(([tipo, titulo]) => ({
    titulo,
    filas: listaFuentes
      .filter((f) => f.tipo === tipo && f.activa)
      .map((f) => filaDe(`i:${f.id}`, f.nombre, f.dia_cobro, Number(f.monto_mensual))),
  })).filter((s) => s.filas.length > 0);

  const gastos: Seccion[] = GRUPOS_GASTO.map(([grupo, titulo]) => ({
    titulo,
    filas: listaCategorias
      .filter((c) => c.grupo === grupo && c.activa)
      .map((c) => filaDe(`g:${c.id}`, c.nombre, null, Number(c.monto_mensual))),
  })).filter((s) => s.filas.length > 0);

  const ingresosMes = Number(balance.data?.total_ingresos ?? 0);
  const gastosMes = Number(balance.data?.total_gastos ?? 0);
  const saldoMes = Number(balance.data?.balance ?? 0);
  const saldoAcumulado = (acumulado.data ?? []).reduce((acc, r) => acc + Number(r.balance), 0);

  const mensaje: { tipo: TipoAlerta; texto: string } | null = params.error
    ? { tipo: "error", texto: params.error }
    : params.guardado === "sin-cambios"
      ? { tipo: "info", texto: "No había cambios que guardar." }
      : params.guardado === "concepto"
        ? { tipo: "exito", texto: "Concepto agregado." }
        : params.guardado === "eliminado"
          ? { tipo: "exito", texto: "Concepto eliminado." }
          : params.guardado === "desactivado"
            ? { tipo: "info", texto: "Concepto desactivado: tiene movimientos registrados, así que se conserva su historial." }
            : params.guardado
              ? { tipo: "exito", texto: `Se guardaron ${params.guardado} cambio(s).` }
              : null;

  return (
    <ShellApp>
    <main className="mx-auto w-full max-w-5xl space-y-6 p-4 sm:p-8">
      <header className={`${encabezado} gap-y-4`}>
        <Link href="/" className={enlace}>← Inicio</Link>
        <div className="flex items-center gap-2">
          <Link
            href={`/movimientos?mes=${desplazarMes(mes, -1)}`}
            aria-label="Mes anterior"
            className={botonCompacto}
          >
            ‹
          </Link>
          <h1 className="min-w-44 text-center text-lg font-semibold tracking-tight">{tituloMes(nombreMes(mes))}</h1>
          <Link
            href={`/movimientos?mes=${desplazarMes(mes, 1)}`}
            aria-label="Mes siguiente"
            className={botonCompacto}
          >
            ›
          </Link>
        </div>
        <nav className="flex gap-4 text-sm">
          {esAdmin && <Link href="/importar" className={enlace}>Importar</Link>}
          <Link href="/catalogos" className={enlace}>Catálogos</Link>
        </nav>
      </header>

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Indicador titulo="Ingresos" valor={formatoCOP(ingresosMes)} />
        <Indicador titulo="Gastos" valor={formatoCOP(gastosMes)} />
        <Indicador
          titulo="Balance del mes"
          valor={formatoCOP(saldoMes)}
          tono={saldoMes < 0 ? "negativo" : "positivo"}
        />
        <Indicador
          titulo="Balance acumulado al cierre"
          valor={formatoCOP(saldoAcumulado)}
          tono={saldoAcumulado < 0 ? "negativo" : "positivo"}
        />
      </section>

      {mensaje && <Alerta tipo={mensaje.tipo}>{mensaje.texto}</Alerta>}

      {esAdmin && <AgregarConcepto mes={mes} />}

      <HojaMensual
        key={`${mes}-${params.guardado ?? ""}-${params.error ?? ""}`}
        mes={mes}
        esAdmin={esAdmin}
        ingresos={ingresos}
        gastos={gastos}
      />
    </main>
    </ShellApp>
  );
}
