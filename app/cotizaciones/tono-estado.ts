// Tono visual de cada estado de cotización. El texto del estado siempre se muestra.
export const TONO_ESTADO = {
  borrador: "neutro",
  enviada: "acento",
  aceptada: "exito",
  rechazada: "peligro",
} as const;

export function tonoDeEstado(estado: string) {
  return TONO_ESTADO[estado as keyof typeof TONO_ESTADO] ?? "neutro";
}
