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

  await drawByServiceV2(pdf, page, font, bold, request);

  return pdf.save();
}

async function drawByServiceV2(pdf: PDFDocument, page: PDFPage, font: PDFFont, bold: PDFFont, request: RequestWithService): Promise<void> {
  const values = requestValues(request);
  const fullName = fullCustomerName(request, values);

  if (request.service.code === "antecedentes-chiapas") {
    clearAreas(page, [
      [80, 498, 58, 82],
      [190, 452, 230, 18],
      [126, 424, 100, 14],
      [386, 424, 150, 14],
      [126, 380, 104, 14],
      [416, 380, 44, 14],
      [126, 350, 310, 14],
      [126, 322, 320, 30],
      [162, 151, 108, 14],
      [72, 50, 220, 16]
    ]);
    drawFittedText(page, fullName, 195, 456, 230, bold, 11);
    drawFittedText(page, request.document || values.curp, 390, 428, 145, font, 9);
    drawFittedText(page, values.birthDate, 130, 428, 95, font, 9);
    drawFittedText(page, request.state || values.state, 130, 384, 96, font, 10);
    drawFittedText(page, values.office, 420, 384, 34, font, 10);
    drawFittedText(page, values.voterKey, 130, 356, 290, font, 8);
    drawWrappedText(page, values.address, 130, 332, 300, font, 8, 10, 3);
    drawFittedText(page, values.receipt, 165, 156, 100, font, 9);
    drawFittedText(page, `Solicitante: ${fullName}`, 78, 55, 205, bold, 8);
    await drawImage(page, pdf, values.photo, 82, 500, 56, 78);
    return;
  }

  if (request.service.code.includes("receta")) {
    drawText(page, fullName, 122, 612, bold, 10);
    drawText(page, request.document, 122, 594, font, 9);
    drawText(page, values.nss, 122, 576, font, 9);
    drawText(page, values.clinic, 356, 612, font, 9);
    drawText(page, values.sex, 122, 558, font, 9);
    drawText(page, values.shift, 356, 594, font, 9);
    drawText(page, values.delegation, 356, 576, font, 9);
    drawText(page, values.consultingRoom, 356, 558, font, 9);
    drawText(page, values.issueDate, 122, 540, font, 9);
    drawText(page, values.prescriptionType, 356, 540, font, 9);
    drawWrappedText(page, values.diagnosis, 108, 475, 360, font, 9, 12);
    drawWrappedText(page, values.medicines, 108, 345, 380, font, 9, 12);
    return;
  }

  if (isEducationService(request.service)) {
    const period = values.period || dateRange(values.startDate, values.endDate);
    if (request.service.code === "secundaria-inea") {
      clearAreas(page, [
        [48, 485, 520, 42],
        [48, 442, 520, 40],
        [48, 396, 520, 42],
        [150, 359, 120, 16],
        [390, 359, 90, 16],
        [48, 20, 250, 18]
      ]);
      drawCenteredFittedText(page, fullName, 48, 497, 520, bold, 10);
      drawCenteredFittedText(page, request.document || values.curp, 48, 473, 520, font, 8);
      drawCenteredFittedText(page, request.state || values.state, 48, 449, 520, font, 8);
      drawCenteredFittedText(page, values.institution, 48, 425, 520, font, 8);
      drawFittedText(page, values.cct, 156, 396, 120, font, 8);
      drawCenteredFittedText(page, values.average, 386, 396, 90, bold, 9);
      drawCenteredFittedText(page, period, 48, 372, 520, font, 8);
      drawCenteredFittedText(page, values.level || "Secundaria", 386, 372, 90, font, 8);
      drawFittedText(page, `Solicitante: ${fullName}`, 54, 25, 220, bold, 8);
      return;
    }

    clearAreas(page, [
      [146, 486, 320, 18],
      [146, 462, 320, 18],
      [146, 438, 320, 18],
      [146, 414, 320, 18],
      [146, 390, 165, 18],
      [396, 390, 80, 18],
      [146, 366, 165, 18],
      [396, 366, 100, 18]
    ]);
    drawFittedText(page, fullName, 156, 492, 300, bold, 11);
    drawFittedText(page, request.document || values.curp, 156, 468, 300, font, 9);
    drawFittedText(page, request.state || values.state, 156, 444, 300, font, 9);
    drawFittedText(page, values.institution, 156, 420, 300, font, 9);
    drawFittedText(page, values.cct, 156, 396, 150, font, 9);
    drawCenteredFittedText(page, values.average, 386, 396, 90, bold, 10);
    drawFittedText(page, period, 156, 372, 150, font, 9);
    drawFittedText(page, values.level, 402, 372, 90, font, 9);
  }
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
  page.drawRectangle({
    x: 24,
    y: 24,
    width: Math.min(260, width - 48),
    height: 26,
    color: rgb(1, 1, 1),
    borderColor: rgb(0.15, 0.28, 0.42),
    borderWidth: 0.7,
    opacity: 0.96
  });
  drawText(page, `Solicitante: ${request.customerName}`, 34, 34, bold, 10);

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

function fullCustomerName(request: RequestWithService, values: Record<string, string>): string {
  return values.fullName || [values.firstName, values.paternalLastName, values.maternalLastName].filter(Boolean).join(" ") || request.customerName;
}

function dateRange(startDate: string | undefined, endDate: string | undefined): string {
  return [startDate, endDate].filter(Boolean).join(" al ");
}

function isEducationService(service: Service): boolean {
  const text = `${service.category} ${service.code}`.toLowerCase();
  return text.includes("educ") || text.includes("prepa") || text.includes("bachillerato") || text.includes("secundaria");
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

function drawFittedText(page: PDFPage, text: string | undefined, x: number, y: number, maxWidth: number, font: PDFFont, size: number): void {
  if (!text) return;
  drawText(page, fittedValue(text, maxWidth, font, size), x, y, font, size);
}

function drawCenteredFittedText(
  page: PDFPage,
  text: string | undefined,
  x: number,
  y: number,
  width: number,
  font: PDFFont,
  size: number
): void {
  if (!text) return;
  const value = fittedValue(text, width, font, size);
  const textWidth = font.widthOfTextAtSize(value, size);
  drawText(page, value, x + Math.max(0, (width - textWidth) / 2), y, font, size);
}

function fittedValue(text: string, maxWidth: number, font: PDFFont, size: number): string {
  let fitted = clean(text);
  while (fitted.length > 1 && font.widthOfTextAtSize(fitted, size) > maxWidth) {
    fitted = `${fitted.slice(0, -2).trimEnd()}...`;
  }
  return fitted;
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

function clearAreas(page: PDFPage, areas: Array<[number, number, number, number]>): void {
  for (const [x, y, width, height] of areas) {
    page.drawRectangle({
      x,
      y,
      width,
      height,
      color: rgb(1, 1, 1),
      opacity: 0.92
    });
  }
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
