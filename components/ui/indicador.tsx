import { Icono, type NombreIcono } from "./iconos";

// Tarjeta de cifra clave (ingresos, gastos, balance, saldo total).
// El signo del monto ya indica negativos; el tono y la flecha refuerzan la lectura.
const tonos = {
  neutral: "text-ink",
  positivo: "text-success",
  negativo: "text-danger",
} as const;

const tonosIcono = {
  neutral: "bg-surface-muted text-ink-muted",
  positivo: "bg-success-bg text-success",
  negativo: "bg-danger-bg text-danger",
} as const;

export type Variacion = { texto: string; tono: keyof typeof tonos };

export function Indicador({
  titulo,
  valor,
  tono = "neutral",
  nota,
  icono,
  variacion,
}: {
  titulo: string;
  valor: string;
  tono?: keyof typeof tonos;
  nota?: string;
  icono?: NombreIcono;
  variacion?: Variacion | null;
}) {
  return (
    <div className="flex flex-col rounded-2xl border border-line bg-surface p-5 shadow-card transition-[box-shadow,border-color] duration-200 hover:border-line-strong hover:shadow-elevado">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-medium text-ink-muted">{titulo}</p>
        {icono && (
          <span className={`flex size-8 items-center justify-center rounded-lg ${tonosIcono[tono]}`}>
            <Icono nombre={icono} className="size-4" />
          </span>
        )}
      </div>
      <p className={`mt-3 text-2xl font-semibold tracking-tight tabular-nums sm:text-[28px] ${tonos[tono]}`}>{valor}</p>
      {variacion && (
        <p className={`mt-2 text-xs font-medium ${tonos[variacion.tono]}`}>{variacion.texto}</p>
      )}
      {nota && <p className="mt-1 text-xs text-ink-muted">{nota}</p>}
    </div>
  );
}
