import { agregarConcepto } from "./conceptos-actions";
import { botonSecundario, campo, etiqueta } from "@/components/ui/estilos";

// Formulario independiente de la hoja (no puede anidarse dentro de ella).
export function AgregarConcepto({ mes }: { mes: string }) {
  return (
    <form action={agregarConcepto} className="rounded-2xl border border-dashed border-line-strong bg-surface-muted p-4">
      <input type="hidden" name="mes" value={mes} />
      <div className="grid gap-3 sm:grid-cols-[1.4fr_1.2fr_0.8fr_0.6fr_auto] sm:items-end">
        <label className="space-y-1.5">
          <span className={etiqueta}>Concepto nuevo</span>
          <select name="destino" required defaultValue="" className={campo}>
            <option value="" disabled>Selecciona…</option>
            <optgroup label="Ingresos">
              <option value="ingreso:sede">Sede</option>
              <option value="ingreso:internet">Cliente de internet</option>
              <option value="ingreso:tv_satelital">Cliente de TV satelital</option>
              <option value="ingreso:otro">Otro ingreso</option>
            </optgroup>
            <optgroup label="Gastos">
              <option value="gasto:sede">Gasto de sedes</option>
              <option value="gasto:tv">Gasto de televisión</option>
              <option value="gasto:credito">Crédito o pago</option>
              <option value="gasto:otro">Otro gasto</option>
            </optgroup>
          </select>
        </label>
        <label className="space-y-1.5">
          <span className={etiqueta}>Nombre</span>
          <input name="nombre" required className={campo} />
        </label>
        <label className="space-y-1.5">
          <span className={etiqueta}>Monto mensual</span>
          <input name="monto_mensual" type="number" min="0" step="1" defaultValue={0} className={campo} />
        </label>
        <label className="space-y-1.5">
          <span className={etiqueta}>Día (ingresos)</span>
          <input name="dia_cobro" type="number" min="1" max="28" step="1" defaultValue={28} className={campo} />
        </label>
        <button type="submit" className={botonSecundario}>Agregar</button>
      </div>
      <p className="mt-3 text-xs text-ink-muted">
        El concepto aparece en la hoja de este mes y de los siguientes. El monto mensual y el día son valores de referencia; los puedes cambiar en la hoja.
      </p>
    </form>
  );
}
