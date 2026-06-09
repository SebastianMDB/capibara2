import { brand } from "../components/brand.js";

export function loginView(): string {
  return `
    <main class="login-page">
      <section class="login-card">
        ${brand()}
        <form class="form" data-action="login">
          <div class="field">
            <label>Correo electrónico</label>
            <input name="email" type="email" autocomplete="email" required>
          </div>
          <div class="field">
            <label>Contraseña</label>
            <input name="password" type="password" autocomplete="current-password" required>
          </div>
          <button class="primary" type="submit">Iniciar sesión</button>
        </form>
      </section>
    </main>
  `;
}
