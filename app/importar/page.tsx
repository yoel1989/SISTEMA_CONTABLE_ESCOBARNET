import Link from "next/link";
import { ShellApp } from "@/components/ui/shell-app";
import { TituloModulo } from "@/components/ui/titulo-modulo";
import { sesionActual } from "@/lib/auth";
import { FormularioImportacion } from "./formulario-importacion";
import { Alerta } from "@/components/ui/alerta";
import { encabezado, enlace, enlaceVolver, subtitulo, tarjeta } from "@/components/ui/estilos";

// La sesión se lee en cada petición: no se prerenderiza.
export const instant = false;

const PLANTILLA = [
  "fecha;tipo;concepto;monto;descripcion",
  "05/03/2025;ingreso;Nombre exacto de la fuente;150000;Pago de marzo",
  "10/03/2025;gasto;Nombre exacto de la categoría;80000;Ejemplo de gasto",
].join("\n");

const HREF_PLANTILLA = `data:text/csv;charset=utf-8,${encodeURIComponent("﻿" + PLANTILLA)}`;

export default async function Importar() {
  const { esAdmin } = await sesionActual();

  return (
    <ShellApp>
    <main className="mx-auto w-full max-w-5xl space-y-6 p-4 sm:p-8">
      <header className={encabezado}>
        <Link href="/movimientos" className={enlaceVolver}>← Movimientos</Link>
        <TituloModulo modulo="movimientos" icono="movimientos">Importar histórico</TituloModulo>
      </header>

      {!esAdmin ? (
        <Alerta tipo="aviso">Solo un administrador puede importar datos.</Alerta>
      ) : (
        <>
          <section className={`${tarjeta} space-y-3`}>
            <h2 className={subtitulo}>Cómo preparar el archivo</h2>
            <ul className="list-inside list-disc space-y-1 text-sm text-ink-muted">
              <li>Columnas: <code className="rounded bg-surface-muted px-1 py-0.5 text-ink">fecha, tipo, concepto, monto, descripcion</code>.</li>
              <li><code className="rounded bg-surface-muted px-1 py-0.5 text-ink">fecha</code>: <code className="rounded bg-surface-muted px-1 py-0.5 text-ink">DD/MM/AAAA</code> o <code className="rounded bg-surface-muted px-1 py-0.5 text-ink">AAAA-MM-DD</code>.</li>
              <li><code className="rounded bg-surface-muted px-1 py-0.5 text-ink">tipo</code>: <code className="rounded bg-surface-muted px-1 py-0.5 text-ink">ingreso</code> o <code className="rounded bg-surface-muted px-1 py-0.5 text-ink">gasto</code>.</li>
              <li><code className="rounded bg-surface-muted px-1 py-0.5 text-ink">concepto</code>: nombre exacto de una fuente de ingreso (ingresos) o de una categoría (gastos), tal como aparece en <Link href="/catalogos" className={enlace}>Catálogos</Link>.</li>
              <li><code className="rounded bg-surface-muted px-1 py-0.5 text-ink">monto</code>: en pesos, sin decimales. Acepta <code className="rounded bg-surface-muted px-1 py-0.5 text-ink">1000000</code> o <code className="rounded bg-surface-muted px-1 py-0.5 text-ink">1.000.000</code>.</li>
              <li>Separador <code className="rounded bg-surface-muted px-1 py-0.5 text-ink">;</code> o <code className="rounded bg-surface-muted px-1 py-0.5 text-ink">,</code>. En Excel: <em>Guardar como → CSV (delimitado por comas o punto y coma)</em>.</li>
              <li>Las filas duplicadas (misma fecha, concepto, cuenta y monto) se omiten automáticamente.</li>
            </ul>
            <a href={HREF_PLANTILLA} download="plantilla_movimientos.csv" className={`${enlace} inline-block text-sm font-medium`}>
              Descargar plantilla CSV
            </a>
          </section>

          <FormularioImportacion />
        </>
      )}
    </main>
    </ShellApp>
  );
}
