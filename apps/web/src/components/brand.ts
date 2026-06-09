import type { User } from "@paperandom/shared";

export function brand(user?: User): string {
  return `
    <div class="brand">
      <div class="brand-mark">PR</div>
      <div>
        <strong>PAPERANDOM</strong>
        <span>${user ? user.name : "Panel de trámites y servicios"}</span>
      </div>
    </div>
  `;
}
