import type { AppState, Service, ServiceField } from "../types.js";

const identityFields: ServiceField[] = [
  { name: "fullName", label: "Nombre completo", type: "text", required: true, placeholder: "Como aparece en el documento oficial" },
  { name: "curp", label: "CURP", type: "text", required: true, placeholder: "AAAA000000HAAAAA00" },
  { name: "state", label: "Estado", type: "select", required: true, options: ["Sonora", "Chiapas", "Ciudad de México", "Morelia", "Jalisco", "Otro"] }
];

const educationFields: ServiceField[] = [
  ...identityFields,
  { name: "institution", label: "Institución", type: "text", required: true, placeholder: "Nombre de escuela o institución" },
  { name: "cct", label: "CCT", type: "text", required: false, placeholder: "Clave de Centro de Trabajo" },
  { name: "average", label: "Promedio", type: "number", required: false, placeholder: "7.0" },
  { name: "period", label: "Periodo cursado", type: "text", required: false, placeholder: "01/01/1988 al 01/01/1990" }
];

function service(input: Omit<Service, "status">): Service {
  return { ...input, status: "activo" };
}

export const seedState: AppState = {
  users: [
    { id: "u-admin", name: "Administrador", email: "admin@paperandom.cl", password: "admin123", role: "admin" },
    { id: "u-demo", name: "Cliente Demo", email: "cliente@paperandom.cl", password: "cliente123", role: "cliente" }
  ],
  services: [
    service({
      id: "s-antecedentes-chiapas",
      name: "Antecedentes Penales Chiapas",
      code: "antecedentes-chiapas",
      category: "Legal",
      documentKind: "Constancia de no antecedentes penales",
      cost: 80,
      fee: 15,
      description: "Constancia emitida por el Poder Judicial con vigencia, folio, recibo oficial y validación QR.",
      requiredFields: [
        ...identityFields,
        { name: "office", label: "Oficina", type: "text", required: false, placeholder: "01" },
        { name: "receipt", label: "Recibo oficial", type: "text", required: false, placeholder: "Número de recibo" }
      ],
      requirements: ["Identificación oficial", "CURP", "Comprobante de pago", "Fotografía y huella si aplica"],
      sampleFiles: ["antecedentes_INGRID_MIRANDA_HIDALGO.pdf"]
    }),
    service({
      id: "s-certificado-secundaria-inea",
      name: "Certificado de Secundaria INEA",
      code: "secundaria-inea",
      category: "Educación",
      documentKind: "Certificado de educación secundaria",
      cost: 95,
      fee: 15,
      description: "Certificado digital del INEA con autoridad educativa, sello SEP, promedio, CCT y folio.",
      requiredFields: [
        ...educationFields,
        { name: "folio", label: "Folio", type: "text", required: false, placeholder: "Folio digital si ya existe" }
      ],
      requirements: ["CURP", "Nombre completo", "Entidad", "Datos de escuela o unidad INEA"],
      sampleFiles: ["DOC-20260514-WA0069.pdf"]
    }),
    service({
      id: "s-bachillerato-tecnologico",
      name: "Certificado Bachillerato Tecnológico",
      code: "bachillerato-tec",
      category: "Educación",
      documentKind: "Certificado de bachillerato tecnológico",
      cost: 110,
      fee: 20,
      description: "Certificado con carrera técnica, créditos, autoridad educativa, sello digital SEP, timbrado y folio.",
      requiredFields: [
        ...educationFields,
        { name: "career", label: "Carrera técnica", type: "text", required: true, placeholder: "Administración" },
        { name: "credits", label: "Créditos", type: "number", required: false, placeholder: "360" }
      ],
      requirements: ["CURP", "Matrícula", "Institución", "Carrera técnica", "Promedio"],
      sampleFiles: ["DGTI TECNOLOGICO-PIGC000302HMNXNSA2.pdf"]
    }),
    service({
      id: "s-prepa-linea-sep",
      name: "Prepa en Línea SEP",
      code: "prepa-linea-sep",
      category: "Educación",
      documentKind: "Certificado de terminación de estudios",
      cost: 105,
      fee: 18,
      description: "Certificado de educación virtual con módulos acreditados, matrícula, créditos, firma electrónica y QR.",
      requiredFields: [
        ...educationFields,
        { name: "enrollment", label: "Matrícula", type: "text", required: true, placeholder: "E0000X00000" },
        { name: "modules", label: "Módulos acreditados", type: "textarea", required: false, placeholder: "Lista de módulos o comentarios" }
      ],
      requirements: ["CURP", "Matrícula", "Promedio", "Periodo cursado", "Créditos acreditados"],
      sampleFiles: ["PREPARATORIA ABIERTA BLANCO-PIGC000302HMNXNSA2.pdf"]
    }),
    service({
      id: "s-preparatoria-abierta",
      name: "Preparatoria Abierta",
      code: "preparatoria-abierta",
      category: "Educación",
      documentKind: "Certificado de preparatoria abierta",
      cost: 105,
      fee: 18,
      description: "Certificado de bachillerato general con formación laboral, folio digital, QR y firma electrónica.",
      requiredFields: [
        ...educationFields,
        { name: "creditsTotal", label: "Créditos totales", type: "number", required: false, placeholder: "276" },
        { name: "printPlace", label: "Lugar de impresión", type: "text", required: false, placeholder: "Benito Juárez, Ciudad de México" }
      ],
      requirements: ["CURP", "Promedio", "Periodo cursado", "Clave de centro de trabajo"],
      sampleFiles: ["PREPARATORIA ABIERTA VERDE-PIGC000302HMNXNSA2.pdf"]
    }),
    service({
      id: "s-receta-imss",
      name: "Receta Individual IMSS",
      code: "receta-imss",
      category: "Salud",
      documentKind: "Receta médica individual",
      cost: 60,
      fee: 12,
      description: "Receta individual con folio, NSS, CURP, unidad, consultorio, turno, diagnóstico y medicamentos.",
      requiredFields: [
        ...identityFields,
        { name: "nss", label: "NSS", type: "text", required: true, placeholder: "Número de Seguridad Social" },
        { name: "clinic", label: "Unidad / Clínica", type: "text", required: true, placeholder: "Clínica 27" },
        { name: "diagnosis", label: "Diagnóstico", type: "textarea", required: true, placeholder: "Motivo de atención" },
        { name: "medicines", label: "Medicamentos", type: "textarea", required: true, placeholder: "Medicamento, dosis, frecuencia y duración" }
      ],
      requirements: ["NSS", "CURP", "Datos de clínica", "Diagnóstico", "Medicamentos indicados"],
      sampleFiles: ["Receta - SANDRA GUADALUPE VAZQUEZ CHÁVEZ (2).pdf"]
    }),
    service({
      id: "s-firma-digital",
      name: "Validación de Documento Firmado",
      code: "validacion-firma",
      category: "Certificación",
      documentKind: "Documento con firma digital",
      cost: 45,
      fee: 10,
      description: "Registro y control de documentos firmados digitalmente por servidor público con huella y lugar de emisión.",
      requiredFields: [
        { name: "issuer", label: "Firmante", type: "text", required: true, placeholder: "Nombre del servidor público" },
        { name: "issueDate", label: "Fecha de firma", type: "date", required: true },
        { name: "place", label: "Lugar", type: "text", required: true, placeholder: "Ciudad de México" },
        { name: "fingerprint", label: "Huella digital", type: "textarea", required: false, placeholder: "Fragmento o cadena de huella" }
      ],
      requirements: ["Documento PDF", "Datos de firma", "Huella digital si está disponible"],
      sampleFiles: ["CDAPF-2026-260876 (2).pdf"]
    })
  ],
  requests: [
    {
      id: "r-1",
      date: "2026-05-24",
      userId: "u-demo",
      serviceId: "s-bachillerato-tecnologico",
      serviceName: "Certificado Bachillerato Tecnológico",
      customerName: "Cliente Demo",
      document: "CURP123456HDFABC01",
      state: "Sonora",
      status: "pendiente",
      total: 130,
      notes: "Requiere revisión de documentos.",
      details: { institution: "Bachillerato tecnológico", average: "7.0" }
    },
    {
      id: "r-2",
      date: "2026-05-25",
      userId: "u-demo",
      serviceId: "s-receta-imss",
      serviceName: "Receta Individual IMSS",
      customerName: "Cliente Demo",
      document: "CURP123456HDFABC01",
      state: "Sonora",
      status: "en proceso",
      total: 72,
      notes: "Solicitud en validación.",
      details: { nss: "Pendiente", clinic: "Pendiente" }
    }
  ],
  qr: {
    account: "PAPERANDOM Servicios",
    reference: "PAGO-TRAMITES",
    instructions: "Adjunta el comprobante al enviar tu solicitud."
  }
};
