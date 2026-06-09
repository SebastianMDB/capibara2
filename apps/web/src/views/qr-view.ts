import type { PaymentSettings } from "@paperandom/shared";

export function qrView(qr: PaymentSettings): string {
  return `
    <header class="topbar">
      <div>
        <h1>QR / Pago</h1>
        <p class="muted">Información que ve el cliente al confirmar una solicitud.</p>
      </div>
    </header>
    <form class="form" data-action="save-qr" style="max-width: 720px">
      <div class="field"><label>Cuenta</label><input name="account" value="${qr.account}" required></div>
      <div class="field"><label>Referencia</label><input name="reference" value="${qr.reference}" required></div>
      <div class="field"><label>Instrucciones</label><textarea name="instructions" rows="4" required>${qr.instructions}</textarea></div>
      <button class="primary" type="submit">Guardar cambios</button>
    </form>
  `;
}
