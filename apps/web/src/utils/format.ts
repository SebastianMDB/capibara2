import type { RequestStatus } from "@paperandom/shared";

export function money(value: number): string {
  return new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: "MXN"
  }).format(Number(value || 0));
}

export function uid(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2, 7)}`;
}

export function statusClass(status: RequestStatus): string {
  return status.replace(/\s+/g, "-");
}

export function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
