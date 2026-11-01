import Link from "next/link";
import { ShellApp } from "@/components/ui/shell-app";
import { TituloModulo } from "@/components/ui/titulo-modulo";
import { notFound, redirect } from "next/navigation";
import { sesionActual } from "@/lib/auth";
import { actualizarCotizacion } from "../../actions";
import { FormularioCotizacion } from "../../formulario-cotizacion";
import { Alerta } from "@/components/ui/alerta";
import { encabezado, enlaceVolver } from "@/components/ui/estilos";

// La sesión se lee en cada petición: no se prerenderiza.
export const instant = false;

type Props = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
};

export default async function EditarCotizacion({ params, searchParams }: Props) {
  const { id } = await params;
  const query = await searchParams;
  const { supabase, esAdmin } = await sesionActual();
  if (!esAdmin) redirect(`/cotizaciones/${id}`);

  const { data: cot } = await supabase
    .from("cotizaciones")
    .select("id, numero, cliente, fecha, descripcion, observaciones")
    .eq("id", id)
    .single();
  if (!cot) notFound();

  const { data: items } = await supabase
    .from("cotizacion_items")
    .select("descripcion, cantidad, precio_unitario")
    .eq("cotizacion_id", id)
    .order("orden");

  return (
    <ShellApp>
    <main className="mx-auto w-full max-w-3xl space-y-6 p-4 sm:p-8">
      <header className={encabezado}>
        <Link href={`/cotizaciones/${id}`} className={enlaceVolver}>← {cot.numero}</Link>
        <TituloModulo modulo="cotizaciones" icono="cotizaciones">Editar cotización</TituloModulo>
      </header>

      {query.error && <Alerta tipo="error">{query.error}</Alerta>}

      <FormularioCotizacion
        accion={actualizarCotizacion}
        id={cot.id}
        fechaPorDefecto={cot.fecha}
        textoBoton="Guardar cambios"
        inicial={{
          cliente: cot.cliente,
          fecha: cot.fecha,
          descripcion: cot.descripcion ?? "",
          observaciones: cot.observaciones ?? "",
          items: (items ?? []).map((it) => ({
            descripcion: it.descripcion,
            cantidad: Number(it.cantidad),
            precio_unitario: Number(it.precio_unitario),
          })),
        }}
      />
    </main>
    </ShellApp>
  );
}
