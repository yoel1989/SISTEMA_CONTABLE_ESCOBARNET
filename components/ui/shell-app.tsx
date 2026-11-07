import Image from "next/image";
import type { ReactNode } from "react";
import { createClient } from "@/lib/supabase/server";
import { cerrarSesion } from "@/app/login/actions";
import { botonSecundario } from "@/components/ui/estilos";
import { NavegacionPrincipal, type Enlace } from "@/components/ui/navegacion-principal";

// Shell de las páginas autenticadas: barra superior con logo + navegación, contenido y pie.
// Si hay logo configurado se muestra solo el logo (el nombre queda para lectores de pantalla).

const ENLACES: Enlace[] = [
  { href: "/movimientos", titulo: "Movimientos", modulo: "movimientos" },
  { href: "/tesoreria", titulo: "Tesorería", modulo: "tesoreria" },
  { href: "/dashboard", titulo: "Dashboard", modulo: "dashboard" },
  { href: "/cotizaciones", titulo: "Cotizaciones", modulo: "cotizaciones" },
  { href: "/reportes", titulo: "Reportes", modulo: "reportes" },
];

type ClienteSupabase = Awaited<ReturnType<typeof createClient>>;

// URL firmada del logo (ruta en configuracion, bucket 'cotizaciones'); null si no hay logo.
async function urlLogo(supabase: ClienteSupabase): Promise<string | null> {
  const { data: conf } = await supabase
    .from("configuracion")
    .select("valor")
    .eq("clave", "logo_path")
    .maybeSingle();
  const ruta = conf?.valor;
  if (typeof ruta !== "string" || ruta === "") return null;

  // Bucket público "marca": URL directa, sin llamada de red.
  return supabase.storage.from("marca").getPublicUrl(ruta).data.publicUrl;
}

export async function ShellApp({ children }: { children: ReactNode }) {
  const supabase = await createClient();
  // getClaims verifica el token localmente: sin una llamada extra al servidor de autenticación.
  const { data: datosSesion } = await supabase.auth.getClaims();
  const claims = datosSesion?.claims;

  // Sin sesión, las páginas ya redirigen; aquí solo se devuelve el contenido.
  if (!claims) return <>{children}</>;
  const userId = claims.sub;
  const email = String(claims.email ?? "");

  const [{ data: perfil }, logo] = await Promise.all([
    supabase.from("profiles").select("nombre, rol").eq("id", userId).single(),
    urlLogo(supabase),
  ]);

  const acciones = (
    <>
      <span className="max-w-[12rem] truncate text-sm text-white/85">
        {perfil?.nombre || email} · {perfil?.rol ?? "sin perfil"}
      </span>
      <form action={cerrarSesion}>
        <button type="submit" className={botonSecundario}>
          Cerrar sesión
        </button>
      </form>
    </>
  );

  return (
    <div className="flex flex-1 flex-col">
      <NavegacionPrincipal
        enlaces={ENLACES}
        acciones={acciones}
        logo={
          logo ? (
            // El fondo negro del logo se vuelve transparente (screen) sobre el degradado.
            <span className="inline-flex items-center rounded-lg bg-[linear-gradient(135deg,#0b1f3f,#1e4fa3_55%,#0e7490)] px-3 py-1.5 shadow-sm ring-1 ring-white/20">
            <Image
              src={logo}
              alt="Logo de ESCOBAR.NET"
              width={160}
              height={40}
              unoptimized
              priority
              className="h-9 w-auto max-w-40 object-contain mix-blend-screen"
            />
            </span>
          ) : undefined
        }
      />

      <div className="flex flex-1 flex-col">{children}</div>

      <footer className="border-t border-line bg-surface">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-6 text-sm text-ink-muted sm:px-8">
          <p>© {new Date().getFullYear()} ESCOBAR.NET · Sistema contable</p>
          <p>Montos en pesos colombianos (COP)</p>
        </div>
      </footer>
    </div>
  );
}
