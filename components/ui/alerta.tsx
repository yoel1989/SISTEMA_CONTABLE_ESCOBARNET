import type { ReactNode } from "react";
import { Icono, type NombreIcono } from "./iconos";

// Mensajes de error, éxito, aviso o información. El icono y el texto acompañan al color:
// el color nunca es el único indicador del tipo de mensaje.
const estilos = {
  error: "border-danger-line bg-danger-bg text-danger",
  exito: "border-success-line bg-success-bg text-success",
  aviso: "border-warning-line bg-warning-bg text-warning",
  info: "border-line bg-surface-muted text-ink-muted",
} as const;

const iconos: Record<keyof typeof estilos, NombreIcono> = {
  error: "error",
  exito: "exito",
  aviso: "aviso",
  info: "info",
};

export type TipoAlerta = keyof typeof estilos;

export function Alerta({
  tipo = "info",
  children,
  className = "",
}: {
  tipo?: TipoAlerta;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      role={tipo === "error" ? "alert" : "status"}
      className={`flex items-start gap-2.5 rounded-xl border px-3.5 py-2.5 text-sm ${estilos[tipo]} ${className}`}
    >
      <Icono nombre={iconos[tipo]} className="mt-0.5 size-4" />
      <div className="min-w-0">{children}</div>
    </div>
  );
}
