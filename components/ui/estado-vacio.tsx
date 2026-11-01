import { Icono, type NombreIcono } from "./iconos";

// Mensaje para listas, tablas o gráficas sin datos.
export function EstadoVacio({ titulo, texto, icono = "vacio" }: { titulo: string; texto?: string; icono?: NombreIcono }) {
  return (
    <div className="flex flex-col items-center px-6 py-10 text-center">
      <span className="mb-3 flex size-11 items-center justify-center rounded-full bg-accent-bg text-accent">
        <Icono nombre={icono} className="size-5" />
      </span>
      <p className="font-medium text-ink">{titulo}</p>
      {texto && <p className="mx-auto mt-1 max-w-md text-sm text-ink-muted">{texto}</p>}
    </div>
  );
}
