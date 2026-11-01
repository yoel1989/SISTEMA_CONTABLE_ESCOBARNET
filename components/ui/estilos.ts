// Clases compartidas de la interfaz. Los colores salen de los tokens definidos
// en app/globals.css, así que el modo claro y el oscuro se resuelven solos.

export const tituloPagina = "text-xl font-semibold tracking-tight text-ink";
export const subtitulo = "text-base font-semibold tracking-tight text-ink";
export const encabezado = "flex flex-wrap items-center justify-between gap-3 border-b border-line pb-4";

export const enlace =
  "text-accent underline underline-offset-4 transition-colors hover:text-ink";
export const enlaceVolver =
  "inline-flex items-center gap-1 text-sm text-ink-muted transition-colors hover:text-ink";

export const tarjeta = "rounded-2xl border border-line bg-surface p-5 shadow-card";
export const tarjetaSinRelleno = "overflow-hidden rounded-2xl border border-line bg-surface shadow-card";
// Formularios de alta: se distinguen de los datos con un borde punteado.
export const panelAlta = "flex flex-wrap items-end gap-4 rounded-2xl border border-dashed border-line-strong bg-surface-muted p-4";

export const etiqueta = "text-sm font-medium text-ink";
export const ayuda = "text-xs text-ink-muted";

const campoBase =
  "rounded-lg border border-line-strong bg-surface px-3 py-2 text-ink shadow-sm transition-colors placeholder:text-ink-muted/70 focus:border-focus focus:outline-none focus:ring-2 focus:ring-focus/30 disabled:opacity-60";
export const campo = `${campoBase} w-full`;
export const campoAncho = campoBase;
export const campoNumero = `${campoBase} text-right tabular-nums`;
// Celda compacta de la hoja mensual.
export const celdaNumero =
  "w-36 rounded-md border border-line-strong bg-surface px-2 py-1 text-right tabular-nums text-ink transition-colors focus:border-focus focus:outline-none focus:ring-2 focus:ring-focus/30";

const botonBase =
  "inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-[background-color,transform,opacity] duration-150 active:translate-y-px disabled:pointer-events-none disabled:opacity-60";
export const botonPrimario = `${botonBase} bg-primary text-primary-ink shadow-sm hover:bg-primary-hover`;
export const botonSecundario = `${botonBase} border border-line-strong bg-surface text-ink shadow-sm hover:bg-surface-muted`;
export const botonCompacto =
  "inline-flex items-center justify-center rounded-lg border border-line-strong bg-surface px-3 py-1.5 text-sm font-medium text-ink shadow-sm transition-colors duration-150 hover:bg-surface-muted active:translate-y-px";
export const botonEnlace =
  "text-sm font-medium text-accent underline underline-offset-4 transition-colors hover:text-ink";
export const botonPeligro =
  "text-sm font-medium text-danger underline underline-offset-4 transition-opacity hover:opacity-75";

export const tablaWrap = "overflow-x-auto rounded-2xl border border-line bg-surface shadow-card";
export const tabla = "w-full text-sm";
export const cabeceraTabla =
  "border-b border-line bg-surface-muted text-left text-xs font-semibold uppercase tracking-wide text-ink-muted";
export const filaTabla = "border-b border-line transition-colors last:border-0 hover:bg-surface-muted";
