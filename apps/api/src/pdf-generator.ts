import { readdir, readFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from "pdf-lib";
import type { Service, TramiteRequest } from "@prisma/client";

type RequestWithService = TramiteRequest & { service: Service };
type PdfValue = { label: string; value: string };
type Fonts = { regular: PDFFont; bold: PDFFont };

const templateRoot = resolve(process.cwd(), "../web/templates");
const ink = rgb(0.04, 0.08, 0.1);

export async function generateRequestPdf(request: RequestWithService): Promise<Uint8Array> {
  const template = request.service.sampleFiles[0];
  if (!template) throw new Error("El servicio no tiene PDF template configurado.");

  const templatePath = await resolveTemplatePath(template);
  const pdf = await PDFDocument.load(await readFile(templatePath), { ignoreEncryption: true });
  const fonts = await embedFonts(pdf);
  const page = pdf.getPage(0);

  await drawTemplateData(pdf, page, fonts, request);
  return pdf.save();
}

async function drawTemplateData(pdf: PDFDocument, page: PDFPage, fonts: Fonts, request: RequestWithService): Promise<void> {
  const values = requestValues(request);
  const fullName = fullCustomerName(request, values);

  if (request.service.code.includes("receta")) {
    drawText(page, fullName, 122, 612, fonts.bold, 10);
    drawText(page, request.document, 122, 594, fonts.regular, 9);
    drawText(page, values.nss, 122, 576, fonts.regular, 9);
    drawText(page, values.clinic, 356, 612, fonts.regular, 9);
    drawText(page, values.sex, 122, 558, fonts.regular, 9);
    drawText(page, values.shift, 356, 594, fonts.regular, 9);
    drawText(page, values.delegation, 356, 576, fonts.regular, 9);
    drawText(page, values.consultingRoom, 356, 558, fonts.regular, 9);
    drawText(page, values.issueDate, 122, 540, fonts.regular, 9);
    drawText(page, values.prescriptionType, 356, 540, fonts.regular, 9);
    drawWrappedText(page, values.diagnosis, 108, 475, 360, fonts.regular, 9, 12);
    drawWrappedText(page, values.medicines, 108, 345, 380, fonts.regular, 9, 12);
    return;
  }

  if (request.service.code === "antecedentes-chiapas") {
    drawAntecedentesData(pdf, page, fonts, request, values, fullName);
    return;
  }

  if (isEducationService(request.service)) {
    drawEducationData(page, fonts, request, values, fullName);
    return;
  }

  drawFittedText(page, fullName, 156, 492, 300, fonts.bold, 11);
}

async function drawAntecedentesData(
  pdf: PDFDocument,
  page: PDFPage,
  fonts: Fonts,
  request: RequestWithService,
  values: Record<string, string>,
  fullName: string
): Promise<void> {
  drawFittedText(page, values.clave || values.folio, 487, 642, 92, fonts.bold, 9);
  drawFittedText(page, values.office, 501, 573, 48, fonts.regular, 5.6);
  await drawImage(page, pdf, values.photo, 98, 502, 58, 88);
  await drawImage(page, pdf, values.fingerprint || values.fingerprintImage || values.huella, 72, 332, 58, 92);

  drawWrappedText(page, values.secretaryText, 154, 571, 300, fonts.regular, 5.8, 6.8, 2);
  drawFittedText(page, values.searchDate || values.issueDate, 252, 438, 90, fonts.bold, 5.8);
  drawFittedText(page, request.document || values.curp, 315, 424, 132, fonts.bold, 5.8);
  drawFittedText(page, fullName, 176, 404, 160, fonts.bold, 5.8);
  drawFittedText(page, values.birthDate, 171, 381, 74, fonts.regular, 5.8);
  drawFittedText(page, values.office, 463, 401, 42, fonts.bold, 5.8);
  drawWrappedText(page, values.address, 167, 349, 326, fonts.regular, 5.8, 6.8, 3);
  drawFittedText(page, values.receipt, 186, 160, 170, fonts.bold, 6.6);
  drawFittedText(page, values.validUntil, 242, 87, 120, fonts.bold, 6.6);
}

function drawEducationData(
  page: PDFPage,
  fonts: Fonts,
  request: RequestWithService,
  values: Record<string, string>,
  fullName: string
): void {
  const period = values.period || dateRange(values.startDate, values.endDate);
  const nameParts = splitName(fullName, values);

  drawCenteredFittedText(page, nameParts.names, 88, 512, 140, fonts.bold, 5.6);
  drawCenteredFittedText(page, nameParts.paternalLastName, 248, 512, 118, fonts.bold, 5.6);
  drawCenteredFittedText(page, nameParts.maternalLastName, 400, 512, 96, fonts.bold, 5.6);
  drawCenteredFittedText(page, request.document || values.curp, 250, 462, 124, fonts.bold, 5.8);

  drawCenteredFittedText(page, values.institution, 108, 432, 138, fonts.bold, 5.8);
  drawCenteredFittedText(page, request.state || values.state, 282, 432, 96, fonts.bold, 5.8);
  drawCenteredFittedText(page, values.level, 434, 432, 84, fonts.bold, 5.8);
  drawCenteredFittedText(page, period, 150, 389, 122, fonts.bold, 5.8);
  drawCenteredFittedText(page, values.cct, 92, 350, 126, fonts.regular, 6.4);
  drawCenteredFittedText(page, values.average, 420, 350, 82, fonts.regular, 6.4);

  drawCenteredFittedText(page, values.issuePlace, 270, 277, 156, fonts.regular, 5.6);
  drawCenteredFittedText(page, values.issueDate, 270, 237, 126, fonts.regular, 5.6);
  drawFittedText(page, values.authority, 70, 213, 468, fonts.bold, 4.6);
  drawWrappedText(page, values.digitalSeal, 70, 198, 468, fonts.regular, 4.2, 4.8, 4);
  drawWrappedText(page, values.sepSeal, 70, 159, 468, fonts.regular, 4.2, 4.8, 4);
  drawFittedText(page, values.signer || values.responsibleName, 70, 78, 140, fonts.bold, 4.8);
  drawFittedText(page, values.folio, 68, 42, 230, fonts.bold, 5.8);
}

function splitName(fullName: string, values: Record<string, string>): { names: string; paternalLastName: string; maternalLastName: string } {
  if (values.firstName || values.paternalLastName || values.maternalLastName) {
    return {
      names: values.firstName || values.fullName || fullName,
      paternalLastName: values.paternalLastName || values.firstLastName || "",
      maternalLastName: values.maternalLastName || values.secondLastName || ""
    };
  }

  const parts = fullName.split(/\s+/).filter(Boolean);
  if (parts.length <= 2) return { names: fullName, paternalLastName: "", maternalLastName: "" };

  return {
    names: parts.slice(0, -2).join(" "),
    paternalLastName: parts.at(-2) ?? "",
    maternalLastName: parts.at(-1) ?? ""
  };
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

function drawText(page: PDFPage, text: string | undefined, x: number, y: number, font: PDFFont, size: number, color = ink): void {
  if (!text) return;
  page.drawText(clean(text), { x, y, size, font, color });
}

function drawFittedText(page: PDFPage, text: string | undefined, x: number, y: number, maxWidth: number, font: PDFFont, size: number, color = ink): void {
  if (!text) return;
  drawText(page, fittedValue(text, maxWidth, font, size), x, y, font, size, color);
}

function drawCenteredFittedText(
  page: PDFPage,
  text: string | undefined,
  x: number,
  y: number,
  width: number,
  font: PDFFont,
  size: number,
  color = ink
): void {
  if (!text) return;
  const value = fittedValue(text, width, font, size);
  const textWidth = font.widthOfTextAtSize(value, size);
  drawText(page, value, x + Math.max(0, (width - textWidth) / 2), y, font, size, color);
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
  maxLines = 4,
  color = ink
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

  lines.slice(0, maxLines).forEach((item, index) => drawText(page, item, x, y - index * lineHeight, font, size, color));
}

function clean(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

async function embedFonts(pdf: PDFDocument): Promise<Fonts> {
  return {
    regular: await pdf.embedFont(StandardFonts.Helvetica),
    bold: await pdf.embedFont(StandardFonts.HelveticaBold)
  };
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
