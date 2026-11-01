import Link from "next/link";
import { ShellApp } from "@/components/ui/shell-app";
import { TituloModulo } from "@/components/ui/titulo-modulo";
import { sesionActual } from "@/lib/auth";
import { formatoCOP } from "@/lib/formato";
import { guardarSaldos } from "./actions";
import { Alerta } from "@/components/ui/alerta";
import { Indicador } from "@/components/ui/indicador";
import { EstadoVacio } from "@/components/ui/estado-vacio";
import {
  botonPrimario,
  cabeceraTabla,
  campoNumero,
  encabezado,
  enlace,
  enlaceVolver,
  filaTabla,
  tabla,
  tablaWrap,
} from "@/components/ui/estilos";

// La sesión se lee en cada petición: no se prerenderiza.
export const instant = false;

type Props = { searchParams: Promise<{ guardado?: string; error?: string }> };

export default async function Tesoreria({ searchParams }: Props) {
  const params = await searchParams;
  const { supabase, esAdmin } = await sesionActual();

  const [{ data }, { data: meses }] = await Promise.all([
    supabase
      .from("cuentas_pago")
      .select("id, nombre, tipo, activa, saldo")
      .order("nombre"),
    // Balance de todos los meses y años registrados, sin límite de fecha.
    supabase.from("v_balance_mensual").select("balance"),
  ]);
  const cuentas = data ?? [];
  const activas = cuentas.filter((c) => c.activa);
  const total = activas.reduce((acc, c) => acc + Number(c.saldo), 0);
  const balanceAcumulado = (meses ?? []).reduce((acc, r) => acc + Number(r.balance), 0);
  const diferencia = total - balanceAcumulado;

  const cabecera = (
    <thead className={cabeceraTabla}>
      <tr>
        <th className="p-3 font-semibold">Cuenta</th>
        <th className="p-3 font-semibold">Tipo</th>
        <th className="p-3 text-right font-semibold">Saldo</th>
      </tr>
    </thead>
  );

  return (
    <ShellApp>
    <main className="mx-auto w-full max-w-3xl space-y-6 p-4 sm:p-8">
      <header className={encabezado}>
        <Link href="/" className={enlaceVolver}>← Inicio</Link>
        <TituloModulo modulo="tesoreria" icono="tesoreria">Tesorería</TituloModulo>
        <Link href="/catalogos" className={enlace}>Catálogos</Link>
      </header>

      {params.error && <Alerta tipo="error">{params.error}</Alerta>}
      {params.guardado && <Alerta tipo="exito">Saldos guardados.</Alerta>}

      <section className="grid gap-3 sm:grid-cols-3">
        <Indicador
          titulo="Total disponible (cuentas activas)"
          valor={formatoCOP(total)}
          tono={total < 0 ? "negativo" : "neutral"}
        />
        <Indicador
          titulo="Balance acumulado (movimientos)"
          valor={formatoCOP(balanceAcumulado)}
          tono={balanceAcumulado < 0 ? "negativo" : "positivo"}
        />
        <Indicador
          titulo="Diferencia"
          valor={formatoCOP(diferencia)}
          tono={diferencia === 0 ? "neutral" : diferencia < 0 ? "negativo" : "positivo"}
        />
      </section>

      {esAdmin ? (
        <form action={guardarSaldos} className="space-y-4">
          <div className={tablaWrap}>
            <table className={tabla}>
              {cabecera}
              <tbody>
                {cuentas.length === 0 && (
                  <tr>
                    <td colSpan={3}>
                      <EstadoVacio titulo="No hay cuentas registradas." texto="Agrégalas en Catálogos, en la sección de cuentas de pago." />
                    </td>
                  </tr>
                )}
                {cuentas.map((c) => (
                  <tr key={c.id} className={`${filaTabla} ${c.activa ? "" : "text-ink-muted"}`}>
                    <td className="p-3">
                      {c.nombre}
                      {!c.activa && <span className="ml-2 text-xs">(inactiva)</span>}
                    </td>
                    <td className="p-3">{c.tipo}</td>
                    <td className="p-3 text-right">
                      {c.activa ? (
                        <input
                          name={`s:${c.id}`}
                          type="number"
                          step="1"
                          defaultValue={Number(c.saldo)}
                          aria-label={`Saldo de ${c.nombre}`}
                          className={`${campoNumero} w-40`}
                        />
                      ) : (
                        <span className="tabular-nums">{formatoCOP(c.saldo)}</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-xs text-ink-muted">
              Los saldos los editas tú a mano. Un valor negativo sirve para registrar deudas.
            </p>
            <button type="submit" className={botonPrimario}>
              Guardar saldos
            </button>
          </div>
        </form>
      ) : (
        <div className={tablaWrap}>
          <table className={tabla}>
            {cabecera}
            <tbody>
              {cuentas.length === 0 && (
                <tr>
                  <td colSpan={3}>
                    <EstadoVacio titulo="No hay cuentas registradas." />
                  </td>
                </tr>
              )}
              {cuentas.map((c) => (
                <tr key={c.id} className={`${filaTabla} ${c.activa ? "" : "text-ink-muted"}`}>
                  <td className="p-3">{c.nombre}{!c.activa && " (inactiva)"}</td>
                  <td className="p-3">{c.tipo}</td>
                  <td className="p-3 text-right tabular-nums">{formatoCOP(c.saldo)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </main>
    </ShellApp>
  );
}
