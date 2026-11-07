// Acento por módulo. Los colores están en app/globals.css (--modulo-*). Aquí solo van
// las clases, escritas completas para que Tailwind las detecte.
export type ModuloId = "movimientos" | "tesoreria" | "dashboard" | "cotizaciones" | "reportes";

export const CLASES_MODULO: Record<
  ModuloId,
  { texto: string; fondo: string; hoverBorde: string; activo: string }
> = {
  movimientos: {
    texto: "text-modulo-movimientos",
    fondo: "bg-modulo-movimientos-fondo",
    hoverBorde: "hover:border-modulo-movimientos/50",
    activo: "bg-modulo-movimientos-fondo text-modulo-movimientos",
  },
  tesoreria: {
    texto: "text-modulo-tesoreria",
    fondo: "bg-modulo-tesoreria-fondo",
    hoverBorde: "hover:border-modulo-tesoreria/50",
    activo: "bg-modulo-tesoreria-fondo text-modulo-tesoreria",
  },
  dashboard: {
    texto: "text-modulo-dashboard",
    fondo: "bg-modulo-dashboard-fondo",
    hoverBorde: "hover:border-modulo-dashboard/50",
    activo: "bg-modulo-dashboard-fondo text-modulo-dashboard",
  },
  cotizaciones: {
    texto: "text-modulo-cotizaciones",
    fondo: "bg-modulo-cotizaciones-fondo",
    hoverBorde: "hover:border-modulo-cotizaciones/50",
    activo: "bg-modulo-cotizaciones-fondo text-modulo-cotizaciones",
  },
  reportes: {
    texto: "text-modulo-reportes",
    fondo: "bg-modulo-reportes-fondo",
    hoverBorde: "hover:border-modulo-reportes/50",
    activo: "bg-modulo-reportes-fondo text-modulo-reportes",
  },
};
