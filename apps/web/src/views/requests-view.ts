import { money, statusClass } from "../utils/format.js";
import type { RequestStatus, TramiteRequest, User } from "@paperandom/shared";

const statuses: RequestStatus[] = ["pendiente", "en proceso", "completado", "cancelado"];

export function requestsView(requests: TramiteRequest[], user: User, onlyMine: boolean): string {
  return `
    <header class="topbar">
      <div>
        <h1>${onlyMine ? "Mis solicitudes" : "Solicitudes recibidas"}</h1>
        <p class="muted">Seguimiento por estado, monto y descripción.</p>
      </div>
    </header>
    <section class="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Fecha</th>
            <th>Cliente</th>
            <th>Servicio</th>
            <th>Documento</th>
            <th>Estado</th>
            <th>Monto</th>
            <th>Acción</th>
          </tr>
        </thead>
        <tbody>
          ${requests.map((item) => requestRow(item, user)).join("") || `<tr><td colspan="7" class="empty">No hay solicitudes registradas.</td></tr>`}
        </tbody>
      </table>
    </section>
  `;
}

function requestRow(item: TramiteRequest, user: User): string {
  return `
    <tr>
      <td>${item.date}</td>
      <td>${item.customerName}<br><span class="muted">${item.state}</span></td>
      <td>${item.serviceName}<br><span class="muted">${item.notes}</span></td>
      <td>${item.document}</td>
      <td><span class="status ${statusClass(item.status)}">${item.status}</span></td>
      <td>${money(item.total)}</td>
      <td>${requestAction(item, user)}</td>
    </tr>
  `;
}

function requestAction(item: TramiteRequest, user: User): string {
  if (user.role !== "admin") {
    return `<button class="ghost-button" data-action="open-request-view" data-id="${item.id}">Ver</button>`;
  }

  return `
    <select data-action="status" data-id="${item.id}">
      ${statuses.map((status) => `<option ${item.status === status ? "selected" : ""}>${status}</option>`).join("")}
    </select>
  `;
}
