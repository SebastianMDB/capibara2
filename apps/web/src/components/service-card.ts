import { money } from "../utils/format.js";
import type { Service, User } from "@paperandom/shared";

export function serviceCard(service: Service, user: User): string {
  return `
    <article class="card">
      <div>
        <div class="service-icon">${service.name.slice(0, 2).toUpperCase()}</div>
        <h3>${service.name}</h3>
        <p class="muted"><strong>${service.documentKind}</strong></p>
        <p class="muted">${service.description}</p>
      </div>
      <div>
        <ul class="requirements">
          ${service.requirements.slice(0, 3).map((item) => `<li>${item}</li>`).join("")}
        </ul>
        <div class="toolbar">
          <span class="tag">${service.category}</span>
          <span class="price">${money(service.cost + service.fee)}</span>
        </div>
        <div class="toolbar" style="margin-top: 12px">
          <button class="primary" data-action="open-request" data-id="${service.id}">Solicitar</button>
          ${user.role === "admin" ? `<button class="ghost-button" data-action="edit-service" data-id="${service.id}">Editar</button>` : ""}
        </div>
      </div>
    </article>
  `;
}
