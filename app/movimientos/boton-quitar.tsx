"use client";

// Botón "Quitar" con confirmación. Si el usuario cancela, el formulario no se envía.
export function BotonQuitar({
  nombre,
  accion,
}: {
  nombre: string;
  accion: (formData: FormData) => void | Promise<void>;
}) {
  return (
    <button
      type="submit"
      formAction={accion}
      onClick={(e) => {
        const ok = confirm(
          `¿Quitar "${nombre}" de la hoja?\n\nSi ya tiene movimientos, se desactiva y no aparecerá en la hoja; su historial se conserva.`,
        );
        if (!ok) e.preventDefault();
      }}
      className="text-sm text-danger underline underline-offset-2"
      title="Quita el concepto. Si tiene movimientos, se desactiva en lugar de borrarse."
    >
      Quitar
    </button>
  );
}
