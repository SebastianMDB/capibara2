import { money, statusClass } from "../utils/format.js";
import type { ModalState, Service, ServiceField, TramiteRequest } from "@paperandom/shared";

export function modalView(
  modal: ModalState | null,
  paymentInstructions: string,
  paymentReference: string,
  sessionName: string
): string {
  if (!modal) return "";
  if (modal.type === "request") return requestModal(modal.service, paymentInstructions, paymentReference, sessionName);
  if (modal.type === "service") return serviceModal(modal.service);
  if (modal.type === "user") return userModal();
  return requestViewModal(modal.request);
}

function requestModal(service: Service, instructions: string, reference: string, sessionName: string): string {
  const total = service.cost + service.fee;

  return `
    <div class="modal-backdrop">
      <section class="modal-card">
        <div class="modal-head">
          <div>
            <h2>Solicitar tramite</h2>
            <p class="muted">${service.name}</p>
          </div>
          <button class="icon-button" data-action="close-modal" aria-label="Cerrar">X</button>
        </div>
        <form class="form" data-action="create-request" data-id="${service.id}">
          <div class="field"><label>Nombre completo</label><input name="customerName" value="${sessionName}" required></div>
          <div class="field"><label>CURP o RFC</label><input name="document" placeholder="AAAA000000AAAAAA00" required></div>
          <div class="document-summary">
            <strong>${service.documentKind}</strong>
            <ul>${service.requirements.map((item) => `<li>${item}</li>`).join("")}</ul>
          </div>
          ${service.requiredFields.map(fieldControl).join("")}
          <div class="field"><label>Notas</label><textarea name="notes" rows="3" placeholder="Documentos, fecha deseada o comentarios"></textarea></div>
          <div class="totals">
            <div><span>Costo tramite</span><strong>${money(service.cost)}</strong></div>
            <div><span>Servicio</span><strong>${money(service.fee)}</strong></div>
            <div><span>Total</span><strong>${money(total)}</strong></div>
          </div>
          <p class="muted">${instructions} Referencia: ${reference}</p>
          <div class="toolbar">
            <button class="secondary" type="button" data-action="close-modal">Cancelar</button>
            <button class="primary" type="submit">Enviar solicitud</button>
          </div>
        </form>
      </section>
    </div>
  `;
}

function serviceModal(service?: Service): string {
  const requirements = service?.requirements.join("\n") ?? "";
  const samples = service?.sampleFiles.join("\n") ?? "";

  return `
    <div class="modal-backdrop">
      <section class="modal-card">
        <div class="modal-head">
          <h2>${service ? "Editar servicio" : "Crear servicio"}</h2>
          <button class="icon-button" data-action="close-modal" aria-label="Cerrar">X</button>
        </div>
        <form class="form" data-action="save-service" data-id="${service?.id ?? ""}">
          <div class="field"><label>Nombre</label><input name="name" value="${service?.name ?? ""}" required></div>
          <div class="field"><label>Tipo documental</label><input name="documentKind" value="${service?.documentKind ?? ""}" required></div>
          <div class="form-row">
            <div class="field"><label>Codigo</label><input name="code" value="${service?.code ?? ""}" required></div>
            <div class="field"><label>Categoria</label><input name="category" value="${service?.category ?? ""}" required></div>
          </div>
          <div class="form-row">
            <div class="field"><label>Costo</label><input name="cost" type="number" min="0" value="${service?.cost ?? 0}" required></div>
            <div class="field"><label>Servicio</label><input name="fee" type="number" min="0" value="${service?.fee ?? 0}" required></div>
          </div>
          <div class="field"><label>Descripcion</label><textarea name="description" rows="3" required>${service?.description ?? ""}</textarea></div>
          <div class="field"><label>Requisitos</label><textarea name="requirements" rows="4" placeholder="Un requisito por linea">${requirements}</textarea></div>
          <div class="field"><label>PDF de referencia</label><textarea name="sampleFiles" rows="2" placeholder="Un archivo por linea">${samples}</textarea></div>
          <div class="toolbar">
            <button class="secondary" type="button" data-action="close-modal">Cancelar</button>
            <button class="primary" type="submit">Guardar</button>
          </div>
        </form>
      </section>
    </div>
  `;
}

function userModal(): string {
  return `
    <div class="modal-backdrop">
      <section class="modal-card">
        <div class="modal-head">
          <h2>Crear nuevo usuario</h2>
          <button class="icon-button" data-action="close-modal" aria-label="Cerrar">X</button>
        </div>
        <form class="form" data-action="create-user">
          <div class="field"><label>Nombre</label><input name="name" required></div>
          <div class="field"><label>Correo</label><input name="email" type="email" required></div>
          <div class="field"><label>Contrasena</label><input name="password" type="password" required></div>
          <div class="field"><label>Rol</label><select name="role"><option value="cliente">Cliente</option><option value="admin">Administrador</option></select></div>
          <div class="toolbar">
            <button class="secondary" type="button" data-action="close-modal">Cancelar</button>
            <button class="primary" type="submit">Crear</button>
          </div>
        </form>
      </section>
    </div>
  `;
}

function requestViewModal(request: TramiteRequest): string {
  return `
    <div class="modal-backdrop">
      <section class="modal-card">
        <div class="modal-head">
          <div><h2>${request.serviceName}</h2><p class="muted">${request.date}</p></div>
          <button class="icon-button" data-action="close-modal" aria-label="Cerrar">X</button>
        </div>
        <p><span class="status ${statusClass(request.status)}">${request.status}</span></p>
        <div class="totals">
          <div><span>Documento</span><strong>${request.document}</strong></div>
          <div><span>Estado</span><strong>${request.state}</strong></div>
          <div><span>Total</span><strong>${money(request.total)}</strong></div>
        </div>
        <dl class="details-list">
          ${Object.entries(request.details).map(([key, value]) => `<div><dt>${key}</dt><dd>${value}</dd></div>`).join("")}
        </dl>
        <p class="muted" style="margin-top: 14px">${request.notes || "Sin notas adicionales."}</p>
      </section>
    </div>
  `;
}

function fieldControl(field: ServiceField): string {
  const required = field.required ? "required" : "";
  const placeholder = field.placeholder ? `placeholder="${field.placeholder}"` : "";

  if (field.type === "select") {
    return `
      <div class="field">
        <label>${field.label}</label>
        <select name="details.${field.name}" ${required}>
          ${(field.options ?? []).map((option) => `<option>${option}</option>`).join("")}
        </select>
      </div>
    `;
  }

  if (field.type === "textarea") {
    return `
      <div class="field">
        <label>${field.label}</label>
        <textarea name="details.${field.name}" rows="3" ${required} ${placeholder}></textarea>
      </div>
    `;
  }

  return `
    <div class="field">
      <label>${field.label}</label>
      <input name="details.${field.name}" type="${field.type}" ${required} ${placeholder}>
    </div>
  `;
}
