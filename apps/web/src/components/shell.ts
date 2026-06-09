import { brand } from "./brand.js";
import type { Route, User } from "@paperandom/shared";

const adminNav: Array<[Route, string]> = [
  ["admin", "Panel"],
  ["servicios", "Servicios"],
  ["solicitudes", "Solicitudes"],
  ["usuarios", "Usuarios"],
  ["qr", "QR / Pago"]
];

const clientNav: Array<[Route, string]> = [
  ["servicios", "Servicios"],
  ["mis-solicitudes", "Mis solicitudes"]
];

export function shell(user: User, route: Route, content: string, modal = ""): string {
  const nav = user.role === "admin" ? adminNav : clientNav;

  return `
    <div class="shell">
      <aside class="sidebar">
        ${brand(user)}
        <nav class="nav">
          ${nav.map(([id, label]) => navButton(id, label, route)).join("")}
          <button data-action="logout">Salir</button>
        </nav>
      </aside>
      <main class="main">${content}</main>
      ${modal}
    </div>
  `;
}

function navButton(id: Route, label: string, route: Route): string {
  return `<button class="${route === id ? "active" : ""}" data-route="${id}">${label}</button>`;
}
