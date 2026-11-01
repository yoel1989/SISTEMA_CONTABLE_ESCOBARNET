"use client";

import { useActionState, useState } from "react";
import { confirmarImportacion, validarImportacion, type EstadoConfirmacion, type EstadoValidacion } from "./actions";
import { formatoCOP } from "@/lib/formato";
import { Alerta } from "@/components/ui/alerta";
import { Insignia } from "@/components/ui/insignia";
import {
  ayuda,
  botonPrimario,
  cabeceraTabla,
  filaTabla,
  tabla,
  tablaWrap,
  tarjeta,
} from "@/components/ui/estilos";

const estadoValidacionInicial: EstadoValidacion = {};
const estadoConfirmacionInicial: EstadoConfirmacion = {};

export function FormularioImportacion() {
  const [texto, setTexto] = useState("");
  const [nombreArchivo, setNombreArchivo] = useState("");
  const [validacion, accionValidar, validando] = useActionState(validarImportacion, estadoValidacionInicial);
  const [confirmacion, accionConfirmar, confirmando] = useActionState(confirmarImportacion, estadoConfirmacionInicial);

  const filas = validacion.filas ?? [];
  const contar = (estado: string) => filas.filter((f) => f.estado === estado).length;
  const hayErrores = contar("error") > 0;
  const nuevas = contar("ok");

  async function alElegirArchivo(e: React.ChangeEvent<HTMLInputElement>) {
    const archivo = e.target.files?.[0];
    if (!archivo) return;
    setNombreArchivo(archivo.name);
    setTexto(await archivo.text());
  }

  return (
    <div className="space-y-6">
      <form action={accionValidar} className={`${tarjeta} space-y-4`}>
        <label className="block space-y-2">
          <span className="text-sm font-medium">Archivo CSV</span>
          <input
            type="file"
            accept=".csv,text/csv"
            onChange={alElegirArchivo}
            className="block w-full max-w-md cursor-pointer text-sm text-ink-muted file:mr-4 file:cursor-pointer file:rounded-lg file:border file:border-line-strong file:bg-surface-muted file:px-3 file:py-2 file:text-sm file:font-medium file:text-ink file:transition-colors hover:file:bg-surface"
          />
        </label>
        {nombreArchivo && <p className={ayuda}>Cargado: {nombreArchivo}</p>}
        <input type="hidden" name="csv" value={texto} />
        <button type="submit" disabled={!texto || validando} className={botonPrimario}>
          {validando ? "Validando…" : "Validar archivo"}
        </button>
        {validacion.error && <Alerta tipo="error">{validacion.error}</Alerta>}
      </form>

      {validacion.filas && (
        <section className="space-y-4">
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <Insignia tono="exito">Listas: {nuevas}</Insignia>
            <Insignia tono="neutro">Duplicadas (se omiten): {contar("duplicado")}</Insignia>
            <Insignia tono="peligro">Con error: {contar("error")}</Insignia>
          </div>

          <div className={tablaWrap}>
            <table className={tabla}>
              <thead className={cabeceraTabla}>
                <tr>
                  <th className="p-3 font-semibold">Línea</th>
                  <th className="p-3 font-semibold">Estado</th>
                  <th className="p-3 font-semibold">Fecha</th>
                  <th className="p-3 font-semibold">Tipo</th>
                  <th className="p-3 text-right font-semibold">Monto</th>
                  <th className="p-3 font-semibold">Mensaje</th>
                </tr>
              </thead>
              <tbody>
                {filas.map((f) => (
                  <tr key={f.linea} className={filaTabla}>
                    <td className="p-3 tabular-nums">{f.linea}</td>
                    <td className="p-3">
                      <Insignia tono={f.estado === "ok" ? "exito" : f.estado === "error" ? "peligro" : "neutro"}>
                        {f.estado === "ok" ? "Lista" : f.estado === "error" ? "Error" : "Duplicada"}
                      </Insignia>
                    </td>
                    <td className="p-3 whitespace-nowrap">{f.movimiento?.fecha ?? "—"}</td>
                    <td className="p-3">{f.movimiento?.tipo ?? "—"}</td>
                    <td className="p-3 text-right tabular-nums">{f.movimiento ? formatoCOP(f.movimiento.monto) : "—"}</td>
                    <td className="p-3 text-ink-muted">{f.mensaje}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {hayErrores ? (
            <Alerta tipo="error">
              Corrige las filas con error en tu archivo y vuelve a validarlo. No se puede importar mientras haya errores.
            </Alerta>
          ) : nuevas > 0 ? (
            <form action={accionConfirmar} className="flex flex-wrap items-center gap-4">
              <input type="hidden" name="csv" value={texto} />
              <button type="submit" disabled={confirmando} className={botonPrimario}>
                {confirmando ? "Importando…" : `Importar ${nuevas} movimiento${nuevas === 1 ? "" : "s"}`}
              </button>
              <p className={ayuda}>Se volverá a validar en el servidor antes de guardar.</p>
            </form>
          ) : (
            <p className="text-sm text-ink-muted">No hay filas nuevas para importar.</p>
          )}
        </section>
      )}

      {confirmacion.error && <Alerta tipo="error">{confirmacion.error}</Alerta>}
      {confirmacion.insertadas !== undefined && (
        <Alerta tipo="exito">
          Se importaron {confirmacion.insertadas} movimientos.
          {confirmacion.omitidas ? ` Se omitieron ${confirmacion.omitidas} (duplicadas o inválidas).` : ""}
        </Alerta>
      )}
    </div>
  );
}
