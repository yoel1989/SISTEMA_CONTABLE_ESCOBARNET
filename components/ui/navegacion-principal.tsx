"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useId, useState, type ReactNode } from "react";
import { CLASES_MODULO, type ModuloId } from "./modulos";

export type Enlace = { href: string; titulo: string; modulo: ModuloId };

// Barra superior del sitio. En escritorio muestra los enlaces en línea; en teléfono,
// un botón plegable (aria-expanded + aria-controls) despliega el mismo menú.
// El enlace activo se marca con aria-current y con el color de su módulo.
export function NavegacionPrincipal({
  enlaces,
  acciones,
  logo,
}: {
  enlaces: Enlace[];
  acciones: ReactNode;
  // Logo de la empresa; si no se pasa, se muestra el monograma.
  logo?: ReactNode;
}) {
  const [abierto, setAbierto] = useState(false);
  const idMenu = useId();
  const ruta = usePathname();

  const claseBase =
    "rounded-lg px-3 py-2 text-sm font-medium transition-colors duration-150 hover:bg-white/10 hover:text-white";
  const claseEnlace = (e: Enlace) =>
    `${claseBase} ${ruta === e.href ? CLASES_MODULO[e.modulo].activo : "text-white/85"}`;

  return (
    <header className="sticky top-0 z-30 bg-brand text-white shadow-sm">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3 sm:px-8">
        <Link href="/" className="flex items-center gap-2.5 font-semibold tracking-tight text-ink">
          {logo ? (
            <>
              <span className="flex items-center rounded-lg bg-white px-2 py-1">{logo}</span>
              <span className="sr-only">ESCOBAR.NET</span>
            </>
          ) : (
            <>
              <span
                aria-hidden
                className="flex h-8 w-8 items-center justify-center rounded-lg bg-white text-sm font-bold text-brand"
              >
                E
              </span>
              <span>ESCOBAR.NET</span>
            </>
          )}
        </Link>

        <nav aria-label="Principal" className="hidden items-center gap-1 md:flex">
          {enlaces.map((e) => (
            <Link key={e.href} href={e.href} className={claseEnlace(e)} aria-current={ruta === e.href ? "page" : undefined}>
              {e.titulo}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-3">
          <div className="hidden items-center gap-3 md:flex">{acciones}</div>
          <button
            type="button"
            aria-expanded={abierto}
            aria-controls={idMenu}
            aria-label={abierto ? "Cerrar menú" : "Abrir menú"}
            onClick={() => setAbierto((v) => !v)}
            className="inline-flex size-10 items-center justify-center rounded-lg border border-white/30 bg-white/10 text-white transition-colors hover:bg-white/20 md:hidden"
          >
            <svg aria-hidden width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              {abierto ? (
                <>
                  <path d="M6 6l12 12" />
                  <path d="M18 6L6 18" />
                </>
              ) : (
                <>
                  <path d="M4 7h16" />
                  <path d="M4 12h16" />
                  <path d="M4 17h16" />
                </>
              )}
            </svg>
          </button>
        </div>
      </div>

      <div id={idMenu} hidden={!abierto} className="border-t border-white/20 bg-brand px-4 py-4 md:hidden">
        <nav aria-label="Principal móvil" className="grid gap-1" onClick={() => setAbierto(false)}>
          {enlaces.map((e) => (
            <Link key={e.href} href={e.href} className={`${claseEnlace(e)} block py-3`} aria-current={ruta === e.href ? "page" : undefined}>
              {e.titulo}
            </Link>
          ))}
        </nav>
        <div className="mt-4 flex items-center justify-between gap-3 border-t border-white/20 pt-4">{acciones}</div>
      </div>
    </header>
  );
}
