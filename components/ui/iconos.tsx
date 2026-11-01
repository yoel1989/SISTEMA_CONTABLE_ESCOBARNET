// Iconos SVG inline (trazo de 1.8, viewBox 24). Sin librerías externas.
const trazos = {
  ingreso: ["M3 17l6-6 4 4 8-8", "M14 7h7v7"],
  gasto: ["M3 7l6 6 4-4 8 8", "M14 17h7v-7"],
  balance: ["M12 4v16", "M6 8h12", "M6 8l-3 6a3 3 0 0 0 6 0z", "M18 8l-3 6a3 3 0 0 0 6 0z"],
  movimientos: ["M8 6h13", "M8 12h13", "M8 18h13", "M3.5 6h.01", "M3.5 12h.01", "M3.5 18h.01"],
  tesoreria: ["M3 7.5A2.5 2.5 0 0 1 5.5 5H19v4", "M3 7.5v10A2.5 2.5 0 0 0 5.5 20H19v-4", "M15 12.5h.01"],
  dashboard: ["M4 20V12", "M10 20V6", "M16 20v-9", "M3 20h18"],
  cotizaciones: ["M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z", "M14 3v6h6", "M8 13h8", "M8 17h5"],
  calendario: ["M4 6h16v14H4z", "M4 10h16", "M8 4v4", "M16 4v4"],
  // Estados de alerta y mensajes vacíos.
  exito: ["M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18z", "M8 12.5l2.5 2.5L16 9.5"],
  error: ["M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18z", "M12 8v5", "M12 16h.01"],
  aviso: ["M12 4L2.5 20h19z", "M12 10v4", "M12 17h.01"],
  info: ["M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18z", "M12 11v5", "M12 8h.01"],
  vacio: ["M3 13l3-8h12l3 8v5a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z", "M3 13h5l1 2h6l1-2h5"],
  flechaArriba: ["M7 14l5-5 5 5"],
  flechaAbajo: ["M7 10l5 5 5-5"],
} as const;

export type NombreIcono = keyof typeof trazos;

export function Icono({ nombre, className = "size-5" }: { nombre: NombreIcono; className?: string }) {
  return (
    <svg
      aria-hidden
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`shrink-0 ${className}`}
    >
      {trazos[nombre].map((d) => (
        <path key={d} d={d} />
      ))}
    </svg>
  );
}
