import type { ReactNode } from "react";
import { Icono, type NombreIcono } from "./iconos";
import { CLASES_MODULO, type ModuloId } from "./modulos";

// Título de página con el icono y el color de su módulo.
export function TituloModulo({
  modulo,
  icono,
  children,
}: {
  modulo: ModuloId;
  icono: NombreIcono;
  children: ReactNode;
}) {
  const clases = CLASES_MODULO[modulo];
  return (
    <h1 className="flex items-center gap-2.5 text-lg font-semibold tracking-tight text-ink">
      <span className={`flex size-8 shrink-0 items-center justify-center rounded-lg ${clases.fondo} ${clases.texto}`}>
        <Icono nombre={icono} className="size-4" />
      </span>
      {children}
    </h1>
  );
}
