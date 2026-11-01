import Link from "next/link";
import { ShellApp } from "@/components/ui/shell-app";
import { TituloModulo } from "@/components/ui/titulo-modulo";
import { sesionActual } from "@/lib/auth";
import { mesActual } from "@/lib/formato";
import { crearCotizacion } from "../actions";
import { FormularioCotizacion } from "../formulario-cotizacion";
import { Alerta } from "@/components/ui/alerta";
import { encabezado, enlaceVolver } from "@/components/ui/estilos";

// La sesión se lee en cada petición: no se prerenderiza.
export const instant = false;

type Props = { searchParams: Promise<{ error?: string }> };

export default async function NuevaCotizacion({ searchParams }: Props) {
  const params = await searchParams;
  const { esAdmin } = await sesionActual();
  const hoy = new Date();
  const fechaPorDefecto = `${mesActual()}-${String(hoy.getDate()).padStart(2, "0")}`;

  return (
    <ShellApp>
    <main className="mx-auto w-full max-w-3xl space-y-6 p-4 sm:p-8">
      <header className={encabezado}>
        <Link href="/cotizaciones" className={enlaceVolver}>← Cotizaciones</Link>
        <TituloModulo modulo="cotizaciones" icono="cotizaciones">Nueva cotización</TituloModulo>
      </header>

      {params.error && <Alerta tipo="error">{params.error}</Alerta>}

      {esAdmin ? (
        <FormularioCotizacion
          accion={crearCotizacion}
          fechaPorDefecto={fechaPorDefecto}
          textoBoton="Crear cotización"
        />
      ) : (
        <Alerta tipo="aviso">Solo un administrador puede crear cotizaciones.</Alerta>
      )}
    </main>
    </ShellApp>
  );
}
