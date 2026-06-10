import { readdir, readFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from "pdf-lib";
import type { Service, TramiteRequest } from "@prisma/client";

type RequestWithService = TramiteRequest & { service: Service };
type PdfValue = { label: string; value: string };

const templateRoot = resolve(process.cwd(), "../web/templates");

export async function generateRequestPdf(request: RequestWithService): Promise<Uint8Array> {
  const template = request.service.sampleFiles[0];
  if (!template) throw new Error("El servicio no tiene PDF template configurado.");

  const templatePath = await resolveTemplatePath(template);

  const pdf = await PDFDocument.load(await readFile(templatePath), { ignoreEncryption: true });
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const page = pdf.getPage(0);

  await drawByService(pdf, page, font, bold, request);
  addRequestSummary(page, font, bold, request);

  return pdf.save();
}

async function drawByService(pdf: PDFDocument, page: PDFPage, font: PDFFont, bold: PDFFont, request: RequestWithService): Promise<void> {
  const values = requestValues(request);

  if (request.service.code === "antecedentes-chiapas") {
    drawText(page, request.customerName, 195, 456, bold, 11);
    drawText(page, request.document, 390, 428, font, 9);
    drawText(page, request.state || values.estado, 130, 384, font, 10);
    drawText(page, values.office, 420, 384, font, 10);
    drawText(page, values.receipt, 165, 156, font, 9);
    await drawImage(page, pdf, values.photo, 455, 500, 82, 102);
    return;
  }

  if (request.service.code.includes("receta")) {
    drawText(page, request.customerName, 122, 612, bold, 10);
    drawText(page, request.document, 122, 594, font, 9);
    drawText(page, values.nss, 122, 576, font, 9);
    drawText(page, values.clinic, 356, 612, font, 9);
    drawWrappedText(page, values.diagnosis, 108, 475, 360, font, 9, 12);
    drawWrappedText(page, values.medicines, 108, 345, 380, font, 9, 12);
    return;
  }

  if (request.service.category === "Educación") {
    drawText(page, request.customerName, 156, 492, bold, 11);
    drawText(page, request.document, 156, 468, font, 9);
    drawText(page, request.state || values.estado, 156, 444, font, 9);
    drawText(page, values.institution, 156, 420, font, 9);
    drawText(page, values.cct, 156, 396, font, 9);
    drawText(page, values.average, 402, 396, bold, 10);
    drawText(page, values.period, 156, 372, font, 9);
  }
}

function addRequestSummary(page: PDFPage, font: PDFFont, bold: PDFFont, request: RequestWithService): void {
  const { width } = page.getSize();
  const details = requestDetails(request);
  const summary: PdfValue[] = [
    { label: "Nombre", value: request.customerName },
    { label: "Documento", value: request.document },
    { label: "Estado", value: request.state },
    ...details.filter((item) => !item.value.startsWith("data:image/")),
    { label: "Indicaciones", value: request.notes }
  ].filter((item) => item.value);

  const boxWidth = Math.min(250, width - 64);
  const boxHeight = Math.min(250, 58 + summary.length * 18);
  const x = width - boxWidth - 24;
  const y = 24;

  page.drawRectangle({
    x,
    y,
    width: boxWidth,
    height: boxHeight,
    color: rgb(1, 1, 1),
    borderColor: rgb(0.15, 0.28, 0.42),
    borderWidth: 0.7,
    opacity: 0.94
  });

  drawText(page, "Datos de solicitud", x + 12, y + boxHeight - 20, bold, 10);
  let cursor = y + boxHeight - 38;
  for (const item of summary.slice(0, 10)) {
    drawText(page, `${item.label}:`, x + 12, cursor, bold, 7);
    drawWrappedText(page, item.value, x + 74, cursor, boxWidth - 88, font, 7, 9, 2);
    cursor -= 18;
  }
}

function requestValues(request: RequestWithService): Record<string, string> {
  return requestDetails(request).reduce<Record<string, string>>((values, item) => {
    values[item.label] = item.value;
    return values;
  }, {});
}

function requestDetails(request: RequestWithService): PdfValue[] {
  const details = request.details && typeof request.details === "object" && !Array.isArray(request.details)
    ? request.details as Record<string, unknown>
    : {};

  return Object.entries(details)
    .filter(([key]) => !key.endsWith("FileName"))
    .map(([key, value]) => ({ label: key, value: String(value ?? "") }));
}

function drawText(page: PDFPage, text: string | undefined, x: number, y: number, font: PDFFont, size: number): void {
  if (!text) return;
  page.drawText(clean(text), { x, y, size, font, color: rgb(0.02, 0.1, 0.18) });
}

function drawWrappedText(
  page: PDFPage,
  text: string | undefined,
  x: number,
  y: number,
  maxWidth: number,
  font: PDFFont,
  size: number,
  lineHeight: number,
  maxLines = 4
): void {
  if (!text) return;
  const words = clean(text).split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let line = "";

  for (const word of words) {
    const next = line ? `${line} ${word}` : word;
    if (font.widthOfTextAtSize(next, size) <= maxWidth) {
      line = next;
      continue;
    }
    if (line) lines.push(line);
    line = word;
  }
  if (line) lines.push(line);

  lines.slice(0, maxLines).forEach((item, index) => drawText(page, item, x, y - index * lineHeight, font, size));
}

function clean(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

async function resolveTemplatePath(template: string): Promise<string> {
  const templatePath = resolve(join(templateRoot, template));
  if (!templatePath.startsWith(templateRoot)) throw new Error("Template invalido.");

  try {
    await readFile(templatePath);
    return templatePath;
  } catch {
    const normalizedTemplate = normalizeFilename(template);
    const match = (await readdir(templateRoot)).find((file) => normalizeFilename(file) === normalizedTemplate);
    if (!match) throw new Error("No se encontro el PDF template.");
    return resolve(join(templateRoot, match));
  }
}

function normalizeFilename(value: string): string {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\?/g, "").toLowerCase();
}

async function drawImage(
  page: PDFPage,
  pdf: PDFDocument,
  dataUrl: string | undefined,
  x: number,
  y: number,
  width: number,
  height: number
): Promise<void> {
  if (!dataUrl?.startsWith("data:image/")) return;
  const [, metadata = "", base64 = ""] = dataUrl.match(/^data:([^;]+);base64,(.+)$/) ?? [];
  if (!base64) return;

  const bytes = Uint8Array.from(Buffer.from(base64, "base64"));
  const image = metadata.includes("png") ? await pdf.embedPng(bytes) : await pdf.embedJpg(bytes);
  page.drawImage(image, { x, y, width, height });
}
