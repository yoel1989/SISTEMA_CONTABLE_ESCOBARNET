import { createClient } from "@/lib/supabase/server";
import { FormularioLogin } from "./formulario-login";

// Lee la configuración del logo en cada petición: no se prerenderiza.
export const instant = false;

// Página de acceso (componente de servidor). El logo se lee sin sesión: la política
// de la migración 0014 permite leer configuracion.logo_path y el bucket 'cotizaciones'.
export default async function LoginPage() {
  const supabase = await createClient();

  const { data: conf } = await supabase
    .from("configuracion")
    .select("valor")
    .eq("clave", "logo_path")
    .maybeSingle();

  const ruta = conf?.valor;
  let logoUrl: string | null = null;
  if (typeof ruta === "string" && ruta !== "") {
    // Bucket público: la URL se construye sin llamadas de red y el navegador la cachea.
    logoUrl = supabase.storage.from("marca").getPublicUrl(ruta).data.publicUrl;
  }

  return <FormularioLogin logoUrl={logoUrl} />;
}
