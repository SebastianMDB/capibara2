import type { AppState } from "@paperandom/shared";

export function usersView(state: AppState): string {
  return `
    <header class="topbar">
      <div>
        <h1>Usuarios</h1>
        <p class="muted">Crea accesos para clientes y administradores.</p>
      </div>
      <button class="primary" data-action="open-user">Nuevo usuario</button>
    </header>
    <section class="table-wrap">
      <table>
        <thead><tr><th>Nombre</th><th>Correo</th><th>Rol</th><th>Solicitudes</th></tr></thead>
        <tbody>
          ${state.users.map((user) => `
            <tr>
              <td>${user.name}</td>
              <td>${user.email}</td>
              <td><span class="tag">${user.role}</span></td>
              <td>${state.requests.filter((item) => item.userId === user.id).length}</td>
            </tr>
          `).join("")}
        </tbody>
      </table>
    </section>
  `;
}
