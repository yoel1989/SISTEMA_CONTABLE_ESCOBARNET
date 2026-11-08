import Link from "next/link";
import { ShellApp } from "@/components/ui/shell-app";
import { TituloModulo } from "@/components/ui/titulo-modulo";
import { sesionActual } from "@/lib/auth";
import { formatoCOP } from "@/lib/formato";
import { actualizarFuente, cambiarActiva, crearCategoria, crearCuenta, crearFuente } from "./actions";
import { Alerta } from "@/components/ui/alerta";
import { Insignia } from "@/components/ui/insignia";
import { EstadoVacio } from "@/components/ui/estado-vacio";
import {
  botonEnlace,
  botonSecundario,
  cabeceraTabla,
  campoAncho,
  encabezado,
  enlaceVolver,
  etiqueta,
  filaTabla,
  panelAlta,
  subtitulo,
  tabla,
  tablaWrap,
  tarjetaSinRelleno,
} from "@/components/ui/estilos";

// La sesión se lee en cada petición: no se prerenderiza.
export const instant = false;

export default async function Catalogos() {
  const { supabase, esAdmin } = await sesionActual();

  const [fuentes, categorias, cuentas] = await Promise.all([
    supabase.from("fuentes_ingreso").select("*").order("tipo").order("nombre"),
    supabase.from("categorias_gasto").select("*").order("grupo").order("nombre"),
    supabase.from("cuentas_pago").select("*").order("nombre"),
  ]);

  return (
    <ShellApp>
    <main className="mx-auto w-full max-w-5xl space-y-10 p-4 sm:p-8">
      <header className={encabezado}>
        <Link href="/movimientos" className={enlaceVolver}>← Movimientos</Link>
        <TituloModulo modulo="movimientos" icono="movimientos">Catálogos</TituloModulo>
      </header>

      {!esAdmin && (
        <Alerta tipo="aviso">
          Estás en modo solo lectura. Los catálogos solo pueden modificarlos administradores.
        </Alerta>
      )}

      {/* Fuentes de ingreso */}
      <section className="space-y-4">
        <h2 className={subtitulo}>Fuentes de ingreso</h2>
        <div className={tablaWrap}>
          <table className={tabla}>
            <thead className={cabeceraTabla}>
              <tr>
                <th className="p-3 font-semibold">Tipo</th>
                <th className="p-3 font-semibold">Nombre</th>
                <th className="p-3 font-semibold">Monto mensual</th>
                <th className="p-3 font-semibold">Día de cobro</th>
                <th className="p-3 font-semibold">Estado</th>
              </tr>
            </thead>
            <tbody>
              {(fuentes.data ?? []).length === 0 && (
                <tr>
                  <td colSpan={5}>
                    <EstadoVacio titulo="Aún no hay fuentes de ingreso." texto={esAdmin ? "Agrega la primera con el formulario de abajo." : undefined} />
                  </td>
                </tr>
              )}
              {(fuentes.data ?? []).map((f) => (
                <tr key={f.id} className={filaTabla}>
                  <td className="p-3">{f.tipo}</td>
                  <td className="p-3">{f.nombre}</td>
                  <td className="p-3">
                    {esAdmin ? (
                      <form action={actualizarFuente} className="flex flex-wrap items-center gap-2">
                        <input type="hidden" name="id" value={f.id} />
                        <input name="monto_mensual" type="number" min="0" step="1" defaultValue={Number(f.monto_mensual)} className={`${campoAncho} w-28 py-1.5 tabular-nums`} aria-label="Monto mensual" />
                        <input name="dia_cobro" type="number" min="1" max="28" step="1" defaultValue={f.dia_cobro} className={`${campoAncho} w-20 py-1.5 tabular-nums`} aria-label="Día de cobro" />
                        <button type="submit" className={`${botonSecundario} py-1.5`}>Guardar</button>
                      </form>
                    ) : (
                      <span className="tabular-nums">{formatoCOP(f.monto_mensual)} · día {f.dia_cobro}</span>
                    )}
                  </td>
                  <td className="p-3 tabular-nums">{f.dia_cobro}</td>
                  <td className="p-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <Insignia tono={f.activa ? "exito" : "neutro"}>{f.activa ? "Activa" : "Inactiva"}</Insignia>
                      {esAdmin && <Alternar tabla="fuentes_ingreso" id={f.id} activa={f.activa} />}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {esAdmin && (
          <form action={crearFuente} className={panelAlta}>
            <label className="space-y-1.5">
              <span className={etiqueta}>Tipo</span>
              <select name="tipo" className={campoAncho}>
                <option value="sede">Sede</option>
                <option value="internet">Cliente internet</option>
                <option value="tv_satelital">TV satelital</option>
                <option value="otro">Otro</option>
              </select>
            </label>
            <label className="space-y-1.5">
              <span className={etiqueta}>Nombre</span>
              <input name="nombre" required className={campoAncho} />
            </label>
            <label className="space-y-1.5">
              <span className={etiqueta}>Monto mensual</span>
              <input name="monto_mensual" type="number" min="0" step="1" defaultValue={0} className={`${campoAncho} w-32 tabular-nums`} />
            </label>
            <label className="space-y-1.5">
              <span className={etiqueta}>Día de cobro (1–28)</span>
              <input name="dia_cobro" type="number" min="1" max="28" step="1" defaultValue={28} className={`${campoAncho} w-24 tabular-nums`} />
            </label>
            <label className="flex items-center gap-2 pb-2 text-sm">
              <input name="variable" type="checkbox" className="size-4 accent-primary" /> Variable
            </label>
            <button type="submit" className={botonSecundario}>Agregar fuente</button>
          </form>
        )}
      </section>

      {/* Categorías de gasto */}
      <section className="space-y-4">
        <h2 className={subtitulo}>Categorías de gasto</h2>
        <ul className={`${tarjetaSinRelleno} divide-y divide-line`}>
          {(categorias.data ?? []).length === 0 && (
            <li>
              <EstadoVacio titulo="Aún no hay categorías de gasto." />
            </li>
          )}
          {(categorias.data ?? []).map((c) => (
            <li key={c.id} className="flex flex-wrap items-center justify-between gap-3 p-4 transition-colors hover:bg-surface-muted">
              <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
                <span className="text-ink-muted">{c.grupo}</span>
                <span className="text-ink-muted">·</span>
                <span className="font-medium">{c.nombre}</span>
                {Number(c.monto_mensual) > 0 && (
                  <span className="text-ink-muted">· {formatoCOP(c.monto_mensual)} mensual</span>
                )}
                {!c.activa && <Insignia tono="neutro">Inactiva</Insignia>}
              </span>
              {esAdmin && <Alternar tabla="categorias_gasto" id={c.id} activa={c.activa} />}
            </li>
          ))}
        </ul>
        {esAdmin && (
          <form action={crearCategoria} className={panelAlta}>
            <label className="space-y-1.5">
              <span className={etiqueta}>Grupo</span>
              <select name="grupo" className={campoAncho}>
                <option value="sede">Sedes</option>
                <option value="tv">Televisión</option>
                <option value="credito">Créditos / pasivos</option>
                <option value="otro">Otros</option>
              </select>
            </label>
            <label className="space-y-1.5">
              <span className={etiqueta}>Nombre</span>
              <input name="nombre" required className={campoAncho} />
            </label>
            <button type="submit" className={botonSecundario}>Agregar categoría</button>
          </form>
        )}
      </section>

      {/* Cuentas de pago */}
      <section className="space-y-4">
        <h2 className={subtitulo}>Cuentas de pago</h2>
        <ul className={`${tarjetaSinRelleno} divide-y divide-line`}>
          {(cuentas.data ?? []).length === 0 && (
            <li>
              <EstadoVacio titulo="Aún no hay cuentas de pago." />
            </li>
          )}
          {(cuentas.data ?? []).map((c) => (
            <li key={c.id} className="flex flex-wrap items-center justify-between gap-3 p-4 transition-colors hover:bg-surface-muted">
              <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
                <span className="font-medium">{c.nombre}</span>
                <span className="text-ink-muted">· {c.tipo}</span>
                {!c.activa && <Insignia tono="neutro">Inactiva</Insignia>}
              </span>
              {esAdmin && <Alternar tabla="cuentas_pago" id={c.id} activa={c.activa} />}
            </li>
          ))}
        </ul>
        {esAdmin && (
          <form action={crearCuenta} className={panelAlta}>
            <label className="space-y-1.5">
              <span className={etiqueta}>Nombre</span>
              <input name="nombre" required className={campoAncho} />
            </label>
            <label className="space-y-1.5">
              <span className={etiqueta}>Tipo</span>
              <select name="tipo" className={campoAncho}>
                <option value="efectivo">Efectivo</option>
                <option value="nequi">Nequi</option>
                <option value="daviplata">Daviplata</option>
                <option value="prestamo">Préstamo</option>
                <option value="deuda_socio">Deuda de socio</option>
                <option value="otra">Otra</option>
              </select>
            </label>
            <label className="space-y-1.5">
              <span className={etiqueta}>Saldo</span>
              <input name="saldo" type="number" step="1" defaultValue={0} className={`${campoAncho} w-32 tabular-nums`} />
            </label>
            <button type="submit" className={botonSecundario}>Agregar cuenta</button>
          </form>
        )}
      </section>
    </main>
    </ShellApp>
  );
}

function Alternar({ tabla, id, activa }: { tabla: string; id: string; activa: boolean }) {
  return (
    <form action={cambiarActiva}>
      <input type="hidden" name="tabla" value={tabla} />
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="activa" value={String(!activa)} />
      <button type="submit" className={botonEnlace}>
        {activa ? "Desactivar" : "Activar"}
      </button>
    </form>
  );
}
