"use client";

import { botonSecundario } from "@/components/ui/estilos";

// Marca o desmarca todas las casillas "ids" del formulario indicado.
export function CasillaTodas({ formId }: { formId: string }) {
  return (
    <input
      type="checkbox"
      aria-label="Seleccionar todos los reportes"
      title="Seleccionar todos"
      className="size-4"
      onChange={(e) => {
        const marcada = e.currentTarget.checked;
        document
          .querySelectorAll<HTMLInputElement>(`#${formId} input[name="ids"]`)
          .forEach((casilla) => {
            casilla.checked = marcada;
          });
      }}
    />
  );
}

// Botón "Eliminar seleccionados" con confirmación. Si el usuario cancela, no se envía nada.
export function BotonEliminar({
  accion,
}: {
  accion: (formData: FormData) => void | Promise<void>;
}) {
  return (
    <button
      type="submit"
      formAction={accion}
      onClick={(e) => {
        const ok = confirm(
          "¿Eliminar los reportes seleccionados?\n\nSe borran también sus PDF. Esta acción no se puede deshacer.",
        );
        if (!ok) e.preventDefault();
      }}
      className={`${botonSecundario} border-danger-line text-danger`}
    >
      Eliminar seleccionados
    </button>
  );
}
