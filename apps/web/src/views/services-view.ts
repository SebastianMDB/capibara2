import { serviceCard } from "../components/service-card.js";
import type { Service, User } from "@paperandom/shared";

interface ServicesViewProps {
  services: Service[];
  query: string;
  user: User;
}

export function servicesView({ services, query, user }: ServicesViewProps): string {
  return `
    <header class="topbar">
      <div>
        <h1>Reserva tus Trámites y Servicios</h1>
        <p class="muted">Selecciona un servicio para iniciar una solicitud.</p>
      </div>
      <div class="toolbar">
        <input class="search" data-action="search" placeholder="Buscar servicio" value="${query}">
        ${user.role === "admin" ? `<button class="primary" data-action="open-service">Nuevo servicio</button>` : ""}
      </div>
    </header>
    <section class="grid">
      ${services.map((service) => serviceCard(service, user)).join("") || `<div class="empty">No hay servicios que coincidan con la búsqueda.</div>`}
    </section>
  `;
}
