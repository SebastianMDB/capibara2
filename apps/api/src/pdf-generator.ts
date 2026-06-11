import { readdir, readFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { degrees, PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from "pdf-lib";
import type { Service, TramiteRequest } from "@prisma/client";

type RequestWithService = TramiteRequest & { service: Service };
type PdfValue = { label: string; value: string };
type Fonts = { regular: PDFFont; bold: PDFFont };

const templateRoot = resolve(process.cwd(), "../web/templates");
const ink = rgb(0.04, 0.08, 0.1);
const muted = rgb(0.35, 0.38, 0.4);
const green = rgb(0.17, 0.39, 0.27);
const gold = rgb(0.72, 0.62, 0.42);
const red = rgb(0.52, 0.06, 0.06);

export async function generateRequestPdf(request: RequestWithService): Promise<Uint8Array> {
  if (request.service.code === "antecedentes-chiapas") return flatAntecedentesPdf(request);
  if (isEducationService(request.service)) return flatEducationPdf(request);

  const template = request.service.sampleFiles[0];
  if (!template) throw new Error("El servicio no tiene PDF template configurado.");

  const templatePath = await resolveTemplatePath(template);
  const pdf = await PDFDocument.load(await readFile(templatePath), { ignoreEncryption: true });
  const fonts = await embedFonts(pdf);
  const page = pdf.getPage(0);

  await drawTemplateService(pdf, page, fonts, request);
  return pdf.save();
}

async function flatEducationPdf(request: RequestWithService): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  const fonts = await embedFonts(pdf);
  const page = pdf.addPage([612, 792]);
  const values = requestValues(request);
  const fullName = fullCustomerName(request, values);
  const level = values.level || educationLevel(request.service);
  const period = values.period || dateRange(values.startDate, values.endDate) || "Periodo no especificado";

  drawEducationFrame(page, fonts);
  drawCenteredText(page, "SISTEMA EDUCATIVO NACIONAL", 306, 632, fonts.bold, 13);
  drawCenteredText(page, educationAuthority(request.service), 306, 614, fonts.bold, 8);
  drawCenteredText(page, request.service.documentKind || "Certificado de terminacion de estudios", 306, 596, fonts.bold, 10);

  drawText(page, "Se expide a:", 64, 562, fonts.bold, 8);
  drawBand(page, 64, 540, 484, 14);
  drawCenteredFittedText(page, fullName, 74, 544, 464, fonts.bold, 10);
  drawSmallLabel(page, "Nombre(s), primer apellido y segundo apellido", 216, 531, fonts);

  drawValueRow(page, fonts, [
    { label: "CURP", value: request.document || values.curp, x: 96, y: 510, width: 160 },
    { label: "Numero de control", value: values.enrollment || values.folio || generatedFolio(request), x: 356, y: 510, width: 160 }
  ]);

  drawBand(page, 64, 486, 484, 14);
  drawCenteredText(page, "Datos del plantel o servicio educativo e informacion academica", 306, 490, fonts.bold, 6);
  drawValueRow(page, fonts, [
    { label: "Nombre", value: values.institution || institutionName(request.service), x: 108, y: 462, width: 220 },
    { label: "Promedio final", value: values.average, x: 410, y: 462, width: 72 }
  ]);
  drawValueRow(page, fonts, [
    { label: "Clave de Centro de Trabajo", value: values.cct, x: 96, y: 434, width: 160 },
    { label: "Entidad", value: request.state || values.state, x: 284, y: 434, width: 120 },
    { label: "Nivel", value: level, x: 432, y: 434, width: 84 }
  ]);
  drawValueRow(page, fonts, [
    { label: "Periodo cursado", value: period, x: 96, y: 406, width: 208 },
    { label: "Creditos acreditados", value: values.credits || values.creditsTotal || "276", x: 356, y: 406, width: 120 }
  ]);

  drawCenteredText(page, issueText(values, request.state), 306, 374, fonts.bold, 8);
  drawLegalBlock(page, fonts, request, values);
  drawQrPlaceholder(page, 68, 126, 76);
  drawWrappedText(
    page,
    "El presente documento electronico ha sido firmado mediante el uso de firma electronica avanzada del servidor publico competente. Puede verificarse mediante el folio y los datos asentados en este documento.",
    160,
    184,
    368,
    fonts.regular,
    5.8,
    8,
    4
  );
  drawFittedText(page, `Folio: ${values.folio || generatedFolio(request)}`, 66, 70, 260, fonts.bold, 7);

  return pdf.save();
}

async function flatAntecedentesPdf(request: RequestWithService): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  const fonts = await embedFonts(pdf);
  const page = pdf.addPage([612, 792]);
  const values = requestValues(request);
  const fullName = fullCustomerName(request, values);

  drawAntecedentesFrame(page, fonts);
  drawText(page, "CONSTANCIA", 54, 664, fonts.bold, 32, rgb(0.88, 0.72, 0.43));
  drawText(page, "DE NO ANTECEDENTES PENALES", 56, 642, fonts.bold, 10, rgb(1, 1, 1));
  drawFittedText(page, `CLAVE: ${values.folio || generatedFolio(request)}`, 452, 660, 92, fonts.bold, 9, rgb(1, 1, 1));

  drawText(page, "El Consejo de la Judicatura del Poder Judicial del Estado de Chiapas hace constar que:", 150, 586, fonts.regular, 8);
  drawCenteredText(page, "HACE CONSTAR", 306, 512, fonts.bold, 16);
  drawWrappedText(
    page,
    `Una vez realizada la busqueda en la base de datos correspondiente, no existen antecedentes penales de ${fullName}.`,
    154,
    484,
    330,
    fonts.regular,
    8,
    11,
    3
  );
  drawCenteredFittedText(page, fullName, 140, 430, 330, fonts.bold, 12);
  drawValueRow(page, fonts, [
    { label: "Fecha de nacimiento", value: values.birthDate, x: 98, y: 392, width: 112 },
    { label: "CURP", value: request.document || values.curp, x: 250, y: 392, width: 160 },
    { label: "Oficina", value: values.office || "01", x: 452, y: 392, width: 42 }
  ]);
  drawWrappedText(page, values.address || "Domicilio no especificado", 142, 356, 330, fonts.regular, 8, 10, 3);
  drawFittedText(page, `Recibo oficial: ${values.receipt || ""}`, 162, 168, 160, fonts.bold, 9);
  drawFittedText(page, `Solicitante: ${fullName}`, 60, 64, 230, fonts.bold, 8);
  drawQrPlaceholder(page, 456, 110, 78);
  await drawImage(page, pdf, values.photo, 78, 510, 64, 86);

  return pdf.save();
}

async function drawTemplateService(pdf: PDFDocument, page: PDFPage, fonts: Fonts, request: RequestWithService): Promise<void> {
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

  drawFittedText(page, fullName, 156, 492, 300, fonts.bold, 11);
}

function drawEducationFrame(page: PDFPage, fonts: Fonts): void {
  page.drawRectangle({ x: 36, y: 34, width: 540, height: 724, borderColor: green, borderWidth: 5 });
  page.drawRectangle({ x: 48, y: 46, width: 516, height: 700, borderColor: green, borderWidth: 1 });
  drawCenteredText(page, "ESTADOS UNIDOS MEXICANOS", 306, 724, fonts.bold, 10, green);
  drawCenteredText(page, "EDUCACION", 150, 678, fonts.bold, 16, green);
  drawCenteredText(page, "PREPARATORIA ABIERTA", 306, 678, fonts.bold, 11, red);
  drawCenteredText(page, "INSTITUTO NACIONAL PARA LA EDUCACION DE LOS ADULTOS", 448, 678, fonts.bold, 7, ink);
  drawWatermark(page, "SEP", 306, 420, fonts.bold);
}

function drawAntecedentesFrame(page: PDFPage, fonts: Fonts): void {
  page.drawRectangle({ x: 28, y: 28, width: 556, height: 736, borderColor: rgb(0.55, 0.09, 0.08), borderWidth: 8 });
  page.drawRectangle({ x: 40, y: 546, width: 532, height: 106, color: red });
  page.drawRectangle({ x: 44, y: 38, width: 528, height: 600, borderColor: green, borderWidth: 1 });
  drawCenteredText(page, "PODER JUDICIAL DEL ESTADO DE CHIAPAS", 160, 716, fonts.bold, 9, red);
  drawCenteredText(page, "JUSTICIA CON HUMANISMO", 306, 716, fonts.bold, 10, green);
  drawCenteredText(page, "GOBIERNO DE TRANSFORMACION", 470, 716, fonts.bold, 8, green);
  drawWatermark(page, "MEXICO", 306, 396, fonts.bold);
}

function drawLegalBlock(page: PDFPage, fonts: Fonts, request: RequestWithService, values: Record<string, string>): void {
  drawWrappedText(
    page,
    `Autoridad educativa: ${values.authority || "Direccion General"}. No. certificado autoridad educativa: ${values.certificateNumber || generatedFolio(request)}.`,
    66,
    332,
    480,
    fonts.bold,
    6,
    8,
    3
  );
  drawWrappedText(page, `Sello digital autoridad educativa: ${values.digitalSeal || generatedSeal(request)}`, 66, 296, 480, fonts.regular, 5.5, 7, 5);
  drawWrappedText(page, `Sello digital SEP: ${values.sepSeal || generatedSeal(request, "SEP")}`, 66, 248, 480, fonts.regular, 5.5, 7, 5);
}

function drawValueRow(
  page: PDFPage,
  fonts: Fonts,
  cells: Array<{ label: string; value: string | undefined; x: number; y: number; width: number }>
): void {
  for (const cell of cells) {
    drawCenteredFittedText(page, cell.value || "", cell.x, cell.y, cell.width, fonts.bold, 8);
    page.drawLine({ start: { x: cell.x - 6, y: cell.y - 5 }, end: { x: cell.x + cell.width + 6, y: cell.y - 5 }, thickness: 0.3, color: rgb(0.75, 0.75, 0.75) });
    drawSmallLabel(page, cell.label, cell.x + cell.width / 2, cell.y - 15, fonts);
  }
}

function drawBand(page: PDFPage, x: number, y: number, width: number, height: number): void {
  page.drawRectangle({ x, y, width, height, color: gold, opacity: 0.7 });
}

function drawSmallLabel(page: PDFPage, text: string, x: number, y: number, fonts: Fonts): void {
  drawCenteredText(page, text, x, y, fonts.regular, 5.5, muted);
}

function drawQrPlaceholder(page: PDFPage, x: number, y: number, size: number): void {
  page.drawRectangle({ x, y, width: size, height: size, borderColor: ink, borderWidth: 1 });
  const cell = size / 9;
  for (let row = 0; row < 9; row += 1) {
    for (let col = 0; col < 9; col += 1) {
      if ((row * 3 + col * 5) % 4 === 0) {
        page.drawRectangle({ x: x + col * cell, y: y + row * cell, width: cell, height: cell, color: ink });
      }
    }
  }
}

function drawWatermark(page: PDFPage, text: string, x: number, y: number, font: PDFFont): void {
  page.drawText(text, {
    x: x - 112,
    y,
    size: 66,
    font,
    color: rgb(0.86, 0.78, 0.62),
    opacity: 0.16,
    rotate: degrees(18)
  });
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

function issueText(values: Record<string, string>, state: string): string {
  if (values.issueText) return values.issueText;
  const place = values.printPlace || values.issuePlace || state || values.state || "Mexico";
  return `Expedido en ${place}, a la fecha indicada en el registro digital`;
}

function educationAuthority(service: Service): string {
  if (service.code === "secundaria-inea") return "INSTITUTO NACIONAL PARA LA EDUCACION DE LOS ADULTOS";
  if (service.code === "bachillerato-tec") return "SUBSECRETARIA DE EDUCACION MEDIA SUPERIOR";
  return "SUBSECRETARIA DE EDUCACION MEDIA SUPERIOR";
}

function educationLevel(service: Service): string {
  if (service.code === "secundaria-inea") return "Secundaria";
  if (service.code.includes("bachillerato")) return "Bachillerato";
  return "Preparatoria";
}

function institutionName(service: Service): string {
  if (service.code === "secundaria-inea") return "INSTITUTO NACIONAL PARA LA EDUCACION DE LOS ADULTOS";
  if (service.code === "preparatoria-abierta") return "PREPARATORIA ABIERTA";
  return service.name;
}

function generatedFolio(request: RequestWithService): string {
  return `${request.service.code.toUpperCase().slice(0, 4)}-${request.id.slice(-8).toUpperCase()}`;
}

function generatedSeal(request: RequestWithService, salt = "AUTH"): string {
  const source = `${request.id}${request.customerName}${request.document}${salt}`.replace(/[^a-zA-Z0-9]/g, "");
  return Array.from({ length: 7 }, (_, index) => source.split("").reverse().join("").slice(index, index + 56)).join("/");
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

function drawCenteredText(page: PDFPage, text: string, x: number, y: number, font: PDFFont, size: number, color = ink): void {
  const value = clean(text);
  const textWidth = font.widthOfTextAtSize(value, size);
  drawText(page, value, x - textWidth / 2, y, font, size, color);
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
