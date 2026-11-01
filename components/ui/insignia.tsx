import type { ReactNode } from "react";

// Etiqueta pequeña para estados (activa/inactiva, estado de cotización).
const tonos = {
  neutro: "bg-surface-muted text-ink-muted ring-line-strong",
  exito: "bg-success-bg text-success ring-success-line",
  peligro: "bg-danger-bg text-danger ring-danger-line",
  acento: "bg-accent-bg text-accent ring-accent/30",
  aviso: "bg-warning-bg text-warning ring-warning-line",
} as const;

export function Insignia({
  tono = "neutro",
  children,
  className = "",
}: {
  tono?: keyof typeof tonos;
  children: ReactNode;
  className?: string;
}) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${tonos[tono]} ${className}`}
    >
      {children}
    </span>
  );
}
