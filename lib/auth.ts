import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

// Devuelve la sesión y el rol del usuario actual, o redirige a /login.
export async function sesionActual() {
  const supabase = await createClient();
  // getClaims verifica el token localmente, sin una llamada extra al servidor de autenticación.
  const { data: datosSesion } = await supabase.auth.getClaims();
  const claims = datosSesion?.claims;

  if (!claims) redirect("/login");
  const user = { id: claims.sub, email: String(claims.email ?? "") };

  const { data: perfil } = await supabase
    .from("profiles")
    .select("nombre, rol")
    .eq("id", user.id)
    .single();

  return {
    supabase,
    user,
    nombre: perfil?.nombre || user.email,
    esAdmin: perfil?.rol === "admin",
  };
}
