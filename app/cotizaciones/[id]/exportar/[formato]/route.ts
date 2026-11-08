import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  generarDocx,
  generarPdf,
  generarXlsx,
  type DatosCotizacion,
  type Logo,
} from "@/lib/cotizaciones/generar";

const FORMATOS = {
  pdf: { generar: generarPdf, tipo: "application/pdf", extension: "pdf" },
  xlsx: {
    generar: generarXlsx,
    tipo: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    extension: "xlsx",
  },
  docx: {
    generar: generarDocx,
    tipo: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    extension: "docx",
  },
} as const;

type Formato = keyof typeof FORMATOS;

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; formato: string }> },
) {
  const { id, formato } = await params;
  if (!(formato in FORMATOS)) {
    return NextResponse.json({ error: "Formato no soportado." }, { status: 400 });
  }
  const config = FORMATOS[formato as Formato];

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "No autenticado." }, { status: 401 });

  // La lectura pasa por RLS: si la cotización no existe o no se puede leer, no se devuelve nada.
  const { data: cot } = await supabase
    .from("cotizaciones")
    .select("id, numero, cliente, fecha, descripcion, observaciones, total")
    .eq("id", id)
    .single();
  if (!cot) return NextResponse.json({ error: "Cotización no encontrada." }, { status: 404 });

  const { data: items } = await supabase
    .from("cotizacion_items")
    .select("descripcion, cantidad, precio_unitario, subtotal")
    .eq("cotizacion_id", id)
    .order("orden");

  const datos: DatosCotizacion = {
    numero: cot.numero,
    cliente: cot.cliente,
    fecha: cot.fecha,
    descripcion: cot.descripcion ?? "",
    observaciones: cot.observaciones ?? "",
    total: Number(cot.total),
    items: (items ?? []).map((it) => ({
      descripcion: it.descripcion,
      cantidad: Number(it.cantidad),
      precio_unitario: Number(it.precio_unitario),
      subtotal: Number(it.subtotal),
    })),
  };

  // Logo de la empresa, si se subió en Configuración de cotizaciones.
  const logo = await cargarLogo(supabase);

  const contenido = await config.generar(datos, logo);
  const nombre = `${cot.numero}.${config.extension}`;

  return new NextResponse(Buffer.from(contenido), {
    headers: {
      "Content-Type": config.tipo,
      "Content-Disposition": `attachment; filename="${nombre}"`,
      "Cache-Control": "no-store",
    },
  });
}

async function cargarLogo(supabase: Awaited<ReturnType<typeof createClient>>): Promise<Logo | undefined> {
  // Primero el logo propio de cotizaciones; si no hay, el logo general de la empresa.
  const { data: confs } = await supabase
    .from("configuracion")
    .select("clave, valor")
    .in("clave", ["logo_cotizacion_path", "logo_path"]);
  const valorDe = (clave: string) => confs?.find((c) => c.clave === clave)?.valor;
  const candidata = valorDe("logo_cotizacion_path") ?? valorDe("logo_path");
  const ruta = typeof candidata === "string" ? candidata : null;
  if (!ruta) return undefined;

  const minuscula = ruta.toLowerCase();
  const tipo = minuscula.endsWith(".png") ? "png" : minuscula.endsWith(".jpg") || minuscula.endsWith(".jpeg") ? "jpg" : null;
  if (!tipo) return undefined;

  const { data: blob } = await supabase.storage.from("marca").download(ruta);
  if (!blob) return undefined;
  return { bytes: new Uint8Array(await blob.arrayBuffer()), tipo };
}
