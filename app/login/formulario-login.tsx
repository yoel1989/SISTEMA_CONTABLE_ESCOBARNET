"use client";

import Image from "next/image";
import { useActionState } from "react";
import { iniciarSesion, type LoginState } from "./actions";
import { Alerta } from "@/components/ui/alerta";
import { botonPrimario, campo, etiqueta } from "@/components/ui/estilos";

const estadoInicial: LoginState = {};

// Formulario de acceso. Recibe la URL del logo ya resuelta por el servidor (o null).
export function FormularioLogin({ logoUrl }: { logoUrl: string | null }) {
  const [estado, accion, pendiente] = useActionState(iniciarSesion, estadoInicial);

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-canvas p-4 sm:p-6">
      {/* Detalle de fondo: resplandor muy suave del color de marca, sin patrones llamativos. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-[28rem] bg-[radial-gradient(38rem_20rem_at_50%_0%,var(--accent-bg),transparent)]"
      />

      <div className="relative w-full max-w-sm">
        <div className="mb-7 text-center">
          {logoUrl ? (
            <>
              <span className="mx-auto mb-5 inline-flex rounded-2xl bg-[linear-gradient(135deg,#0b1f3f,#1e4fa3_55%,#0e7490)] px-6 py-4 shadow-elevado ring-1 ring-white/20">
                <Image
                  src={logoUrl}
                  alt="Logo de ESCOBAR.NET"
                  width={200}
                  height={56}
                  unoptimized
                  priority
                  className="h-14 w-auto max-w-56 object-contain mix-blend-screen"
                />
              </span>
              <h1 className="sr-only">ESCOBAR.NET</h1>
            </>
          ) : (
            <>
              <span
                aria-hidden
                className="mx-auto mb-4 flex size-12 items-center justify-center rounded-2xl bg-primary text-lg font-bold text-primary-ink shadow-elevado"
              >
                E
              </span>
              <h1 className="text-xl font-semibold tracking-tight text-ink">ESCOBAR.NET</h1>
            </>
          )}
          <p className="mt-1 text-sm text-ink-muted">Sistema contable · Inicia sesión para continuar</p>
        </div>

        <form
          action={accion}
          className="space-y-5 rounded-2xl border border-line bg-surface p-6 shadow-elevado sm:p-7"
        >
          <label className="block space-y-1.5">
            <span className={etiqueta}>Correo</span>
            <input
              name="email"
              type="email"
              autoComplete="email"
              required
              className={campo}
            />
          </label>

          <label className="block space-y-1.5">
            <span className={etiqueta}>Contraseña</span>
            <input
              name="password"
              type="password"
              autoComplete="current-password"
              required
              className={campo}
            />
          </label>

          {estado.error && <Alerta tipo="error">{estado.error}</Alerta>}

          <button type="submit" disabled={pendiente} className={`${botonPrimario} w-full py-2.5`}>
            {pendiente ? "Entrando…" : "Entrar"}
          </button>
        </form>

        <p className="mt-6 text-center text-xs text-ink-muted">ESCOBAR.NET · Acceso privado</p>
      </div>
    </main>
  );
}
