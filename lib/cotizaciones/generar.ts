// Generación de cotizaciones en PDF, Excel y Word. Sin dependencias de Next:
// recibe datos planos (y el logo opcional en bytes) y devuelve el archivo.

import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import ExcelJS from "exceljs";
import {
  AlignmentType,
  Document,
  ImageRun,
  Packer,
  Paragraph,
  Table,
  TableCell,
  TableRow,
  TextRun,
  WidthType,
} from "docx";

export const EMPRESA = "ESCOBAR.NET";

export type ItemCotizacion = {
  descripcion: string;
  cantidad: number;
  precio_unitario: number;
  subtotal: number;
};

export type DatosCotizacion = {
  numero: string;
  cliente: string;
  fecha: string;
  descripcion: string;
  observaciones: string;
  total: number;
  items: ItemCotizacion[];
};

// Logo de la empresa. Solo PNG o JPG: son los formatos que soportan los tres generadores.
export type Logo = { bytes: Uint8Array; tipo: "png" | "jpg" };

// Formato de pesos colombianos con solo caracteres ASCII.
export function pesos(valor: number): string {
  const entero = Math.round(Number(valor));
  return "$ " + String(entero).replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}

// Texto partido en líneas de un ancho aproximado, para el PDF.
function partirTexto(texto: string, maxCaracteres: number): string[] {
  const lineas: string[] = [];
  for (const parrafo of texto.split(/\r?\n/)) {
    let actual = "";
    for (const palabra of parrafo.split(/\s+/)) {
      if ((actual + " " + palabra).trim().length > maxCaracteres) {
        if (actual) lineas.push(actual);
        actual = palabra;
      } else {
        actual = (actual + " " + palabra).trim();
      }
    }
    lineas.push(actual);
  }
  return lineas;
}

export async function generarPdf(datos: DatosCotizacion, logo?: Logo): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const fuente = await doc.embedFont(StandardFonts.Helvetica);
  const negrita = await doc.embedFont(StandardFonts.HelveticaBold);
  const gris = rgb(0.35, 0.35, 0.35);
  const margen = 50;
  const ancho = 595;
  let pagina = doc.addPage([ancho, 842]); // A4
  let y = 792;

  const texto = (t: string, x: number, yy: number, size = 10, f = fuente, color = rgb(0, 0, 0)) =>
    pagina.drawText(t, { x, y: yy, size, font: f, color });

  // Pasa a una página nueva cuando no cabe el bloque que viene.
  const hacerEspacio = (alto: number) => {
    if (y - alto >= 60) return;
    pagina = doc.addPage([ancho, 842]);
    y = 792;
  };

  // Encabezado: logo (si existe) a la izquierda, datos de la cotización a la derecha.
  let alturaLogo = 0;
  if (logo) {
    const imagen = logo.tipo === "png" ? await doc.embedPng(logo.bytes) : await doc.embedJpg(logo.bytes);
    const escala = Math.min(120 / imagen.width, 60 / imagen.height, 1);
    const w = imagen.width * escala;
    const h = imagen.height * escala;
    pagina.drawImage(imagen, { x: margen, y: y - h + 6, width: w, height: h });
    alturaLogo = h;
  }
  texto(logo ? "" : EMPRESA, margen, y, 18, negrita);
  texto("COTIZACIÓN", ancho - margen - 120, y, 14, negrita);
  y -= 16;
  texto(`N.º ${datos.numero}`, ancho - margen - 120, y, 10, fuente, gris);
  y -= 14;
  texto(`Fecha: ${datos.fecha}`, ancho - margen - 120, y, 10, fuente, gris);
  y -= Math.max(alturaLogo, 20) + 20;

  // Cliente y descripción, en ese orden.
  texto("Cliente", margen, y, 9, negrita, gris);
  y -= 14;
  texto(datos.cliente, margen, y, 12, negrita);
  if (datos.descripcion) {
    y -= 22;
    texto("Descripción", margen, y, 9, negrita, gris);
    for (const linea of partirTexto(datos.descripcion, 95)) {
      y -= 13;
      texto(linea, margen, y, 10);
    }
  }

  // Tabla de ítems
  y -= 30;
  const colDesc = margen;
  const colCant = 330;
  const colPrecio = 410;
  const colSub = 495;
  const encabezadoTabla = () => {
    pagina.drawRectangle({ x: margen, y: y - 6, width: ancho - margen * 2, height: 20, color: rgb(0.93, 0.93, 0.93) });
    texto("Descripción", colDesc + 4, y, 10, negrita);
    texto("Cant.", colCant, y, 10, negrita);
    texto("Precio", colPrecio, y, 10, negrita);
    texto("Subtotal", colSub, y, 10, negrita);
  };
  encabezadoTabla();

  y -= 22;
  for (const it of datos.items) {
    if (y - 18 < 60) {
      pagina = doc.addPage([ancho, 842]);
      y = 792;
      encabezadoTabla();
      y -= 22;
    }
    texto(it.descripcion.slice(0, 60), colDesc + 4, y);
    texto(String(it.cantidad), colCant, y);
    texto(pesos(it.precio_unitario), colPrecio, y);
    texto(pesos(it.subtotal), colSub, y);
    y -= 18;
  }

  y -= 10;
  pagina.drawLine({ start: { x: colPrecio - 10, y }, end: { x: ancho - margen, y }, thickness: 0.5, color: gris });
  y -= 18;
  texto("TOTAL", colPrecio, y, 11, negrita);
  texto(pesos(datos.total), colSub, y, 11, negrita);

  // Observaciones al final del documento.
  if (datos.observaciones) {
    const lineas = partirTexto(datos.observaciones, 95);
    hacerEspacio(lineas.length * 13 + 30);
    y -= 40;
    texto("Observaciones", margen, y, 9, negrita, gris);
    for (const linea of lineas) {
      y -= 13;
      texto(linea, margen, y, 10);
    }
  }

  return doc.save();
}

export async function generarXlsx(datos: DatosCotizacion, logo?: Logo): Promise<Uint8Array> {
  const libro = new ExcelJS.Workbook();
  libro.creator = EMPRESA;
  const hoja = libro.addWorksheet("Cotización");

  let fila = 1;
  if (logo) {
    // ExcelJS usa "jpeg" donde nosotros guardamos "jpg".
    const imagenId = libro.addImage({
      buffer: logo.bytes as unknown as ExcelJS.Buffer,
      extension: logo.tipo === "png" ? "png" : "jpeg",
    });
    hoja.addImage(imagenId, { tl: { col: 0, row: 0 }, ext: { width: 160, height: 60 } });
    fila = 5;
  } else {
    hoja.getCell("A1").value = EMPRESA;
    hoja.getCell("A1").font = { bold: true, size: 14 };
    fila = 3;
  }
  hoja.getCell(`A${fila}`).value = `Cotización ${datos.numero}`;
  hoja.getCell(`A${fila + 1}`).value = `Cliente: ${datos.cliente}`;
  hoja.getCell(`A${fila + 2}`).value = `Fecha: ${datos.fecha}`;
  if (datos.descripcion) {
    hoja.getCell(`A${fila + 3}`).value = `Descripción: ${datos.descripcion}`;
    fila += 1;
  }

  const encabezadoFila = fila + 4;
  const encabezado = hoja.getRow(encabezadoFila);
  encabezado.values = ["Descripción", "Cantidad", "Precio unitario", "Subtotal"];
  encabezado.font = { bold: true };

  datos.items.forEach((it, i) => {
    const f = encabezadoFila + 1 + i;
    hoja.getCell(`A${f}`).value = it.descripcion;
    hoja.getCell(`B${f}`).value = it.cantidad;
    hoja.getCell(`C${f}`).value = it.precio_unitario;
    // Fórmula viva, con su resultado precalculado para visores que no recalculan.
    hoja.getCell(`D${f}`).value = { formula: `B${f}*C${f}`, result: it.subtotal };
  });

  const primera = encabezadoFila + 1;
  const ultima = encabezadoFila + datos.items.length;
  const filaTotal = ultima + 2;
  hoja.getCell(`C${filaTotal}`).value = "TOTAL";
  hoja.getCell(`C${filaTotal}`).font = { bold: true };
  hoja.getCell(`D${filaTotal}`).value = { formula: `SUM(D${primera}:D${ultima})`, result: datos.total };
  hoja.getCell(`D${filaTotal}`).font = { bold: true };

  if (datos.observaciones) {
    hoja.getCell(`A${filaTotal + 2}`).value = "Observaciones";
    hoja.getCell(`A${filaTotal + 2}`).font = { bold: true };
    hoja.getCell(`A${filaTotal + 3}`).value = datos.observaciones;
  }

  for (const col of ["C", "D"]) hoja.getColumn(col).numFmt = '"$" #,##0';
  hoja.getColumn("A").width = 50;
  hoja.getColumn("B").width = 12;
  hoja.getColumn("C").width = 18;
  hoja.getColumn("D").width = 18;

  const buffer = await libro.xlsx.writeBuffer();
  return new Uint8Array(buffer as ArrayBuffer);
}

export async function generarDocx(datos: DatosCotizacion, logo?: Logo): Promise<Uint8Array> {
  const celda = (texto: string, negrita = false, alinear: "left" | "right" = "left") =>
    new TableCell({
      children: [
        new Paragraph({
          alignment: alinear === "right" ? AlignmentType.RIGHT : AlignmentType.LEFT,
          children: [new TextRun({ text: texto, bold: negrita })],
        }),
      ],
    });

  const filas = [
    new TableRow({
      children: [celda("Descripción", true), celda("Cantidad", true, "right"), celda("Precio unitario", true, "right"), celda("Subtotal", true, "right")],
    }),
    ...datos.items.map(
      (it) =>
        new TableRow({
          children: [
            celda(it.descripcion),
            celda(String(it.cantidad), false, "right"),
            celda(pesos(it.precio_unitario), false, "right"),
            celda(pesos(it.subtotal), false, "right"),
          ],
        }),
    ),
    new TableRow({
      children: [celda(""), celda(""), celda("TOTAL", true, "right"), celda(pesos(datos.total), true, "right")],
    }),
  ];

  const cabecera: Paragraph[] = [];
  if (logo) {
    cabecera.push(
      new Paragraph({
        children: [
          new ImageRun({
            type: logo.tipo,
            data: logo.bytes,
            transformation: { width: 160, height: 60 },
          }),
        ],
      }),
    );
  } else {
    cabecera.push(new Paragraph({ children: [new TextRun({ text: EMPRESA, bold: true, size: 32 })] }));
  }

  const documento = new Document({
    sections: [
      {
        children: [
          ...cabecera,
          new Paragraph({ children: [new TextRun({ text: `Cotización ${datos.numero}`, bold: true })] }),
          new Paragraph({ text: `Cliente: ${datos.cliente}` }),
          new Paragraph({ text: `Fecha: ${datos.fecha}` }),
          ...(datos.descripcion ? [new Paragraph({ text: `Descripción: ${datos.descripcion}` })] : []),
          new Paragraph({ text: "" }),
          new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, rows: filas }),
          ...(datos.observaciones
            ? [
                new Paragraph({ text: "" }),
                new Paragraph({ children: [new TextRun({ text: "Observaciones", bold: true })] }),
                new Paragraph({ text: datos.observaciones }),
              ]
            : []),
        ],
      },
    ],
  });

  const buffer = await Packer.toBuffer(documento);
  return new Uint8Array(buffer);
}
