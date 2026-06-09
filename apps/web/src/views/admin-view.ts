import type { AppState } from "@paperandom/shared";

export function adminView(state: AppState): string {
  const pending = state.requests.filter((item) => item.status === "pendiente").length;

  return `
    <header class="topbar">
      <div>
        <h1>Panel de Administración</h1>
        <p class="muted">Selecciona lo que deseas gestionar.</p>
      </div>
    </header>
    <section class="panel-grid">
      <button class="admin-tile" data-route="servicios"><h3>Gestionar Trámites</h3><p class="muted">${state.services.length} servicios disponibles</p></button>
      <button class="admin-tile" data-route="solicitudes"><h3>Ver Solicitudes</h3><p class="muted">${pending} pendientes de revisión</p></button>
      <button class="admin-tile" data-route="usuarios"><h3>Crear Nuevo Usuario</h3><p class="muted">${state.users.length} usuarios registrados</p></button>
      <button class="admin-tile" data-route="qr"><h3>Editar QR de Pago</h3><p class="muted">Cuenta, referencia e instrucciones</p></button>
    </section>
  `;
}
