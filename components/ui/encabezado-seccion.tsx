import type { ReactNode } from "react";
import { Icono, type NombreIcono } from "./iconos";

// Encabezado consistente de sección: icono + título + línea secundaria.
export function EncabezadoSeccion({
  icono,
  titulo,
  descripcion,
  id,
  derecha,
}: {
  icono?: NombreIcono;
  titulo: string;
  descripcion?: string;
  id?: string;
  derecha?: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-3">
      <div className="flex items-start gap-3">
        {icono && (
          <span className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-xl bg-accent-bg text-accent">
            <Icono nombre={icono} className="size-[18px]" />
          </span>
        )}
        <div className="space-y-0.5">
          <h2 id={id} className="text-base font-semibold tracking-tight text-ink">{titulo}</h2>
          {descripcion && <p className="text-sm text-ink-muted">{descripcion}</p>}
        </div>
      </div>
      {derecha}
    </div>
  );
}
