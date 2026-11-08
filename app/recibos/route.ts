import { NextResponse } from "next/server";

// App de recibos de televisión, publicada en GitHub Pages (repo público yoel1989/recibos-app).
// La sesión del ERP ya se exigió en el proxy; aquí solo se redirige.
const URL_RECIBOS = "https://yoel1989.github.io/recibos-app/";

export function GET() {
  return NextResponse.redirect(URL_RECIBOS);
}
