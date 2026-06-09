import { modalView } from "../components/modals.js";
import { shell } from "../components/shell.js";
import { adminView } from "../views/admin-view.js";
import { loginView } from "../views/login-view.js";
import { qrView } from "../views/qr-view.js";
import { requestsView } from "../views/requests-view.js";
import { servicesView } from "../views/services-view.js";
import { usersView } from "../views/users-view.js";
import { Store } from "../state/store.js";
import type { ModalState, RequestStatus, Route, Service, ServiceField, User, UserRole } from "@paperandom/shared";

type FormPayload = Record<string, FormDataEntryValue>;

export class AppController {
  private readonly store = new Store();
  private session: User | null = null;
  private route: Route = "servicios";
  private modal: ModalState | null = null;
  private query = "";

  constructor(private readonly root: HTMLElement) {}

  start(): void {
    void this.bootstrap();
  }

  private async bootstrap(): Promise<void> {
    this.root.innerHTML = `<main class="login-page"><section class="login-card"><p class="muted">Cargando...</p></section></main>`;
    this.session = await this.store.restoreSession();
    if (this.session) {
      this.route = this.session.role === "admin" ? "admin" : "servicios";
    }
    this.render();
  }

  private render(): void {
    if (!this.session) {
      this.root.innerHTML = loginView();
      this.bindEvents();
      return;
    }

    const state = this.store.snapshot;
    const modal = modalView(this.modal, state.qr.instructions, state.qr.reference, this.session.name);
    this.root.innerHTML = shell(this.session, this.route, this.routeView(), modal);
    this.bindEvents();
  }

  private routeView(): string {
    const state = this.store.snapshot;
    if (!this.session) return loginView();

    if (this.route === "admin") return adminView(state);
    if (this.route === "solicitudes") return requestsView(state.requests, this.session, false);
    if (this.route === "mis-solicitudes") {
      return requestsView(state.requests.filter((item) => item.userId === this.session?.id), this.session, true);
    }
    if (this.route === "usuarios") return usersView(state);
    if (this.route === "qr") return qrView(state.qr);

    const services = state.services.filter((service) => {
      const search = `${service.name} ${service.category} ${service.code}`.toLowerCase();
      return search.includes(this.query.toLowerCase());
    });

    return servicesView({ services, query: this.query, user: this.session });
  }

  private bindEvents(): void {
    this.root.querySelectorAll<HTMLElement>("[data-route]").forEach((button) => {
      button.addEventListener("click", () => this.navigate(button.dataset.route as Route));
    });

    this.root.querySelectorAll<HTMLElement>("[data-action]").forEach((node) => {
      if (node instanceof HTMLFormElement) {
        node.addEventListener("submit", (event) => this.handleSubmit(event));
        return;
      }

      if (node.dataset.action === "search" && node instanceof HTMLInputElement) {
        node.addEventListener("input", () => this.handleSearch(node.value));
        return;
      }

      if (node.dataset.action === "status" && node instanceof HTMLSelectElement) {
        node.addEventListener("change", () => void this.handleStatus(node.dataset.id, node.value as RequestStatus));
        return;
      }

      node.addEventListener("click", () => this.handleClick(node));
    });
  }

  private navigate(route: Route): void {
    this.route = route;
    this.modal = null;
    this.render();
  }

  private handleSearch(value: string): void {
    this.query = value;
    this.render();
  }

  private async handleStatus(id: string | undefined, status: RequestStatus): Promise<void> {
    if (!id) return;
    try {
      await this.store.updateRequestStatus(id, status);
      this.render();
    } catch (error) {
      alert(error instanceof Error ? error.message : "No se pudo actualizar la solicitud.");
    }
  }

  private handleClick(node: HTMLElement): void {
    const action = node.dataset.action;
    const id = node.dataset.id;

    if (action === "logout") this.logout();
    if (action === "close-modal") this.closeModal();
    if (action === "open-request" && id) this.openRequest(id);
    if (action === "open-service") this.openService();
    if (action === "edit-service" && id) this.editService(id);
    if (action === "open-user") this.openUser();
    if (action === "open-request-view" && id) this.openRequestView(id);
  }

  private handleSubmit(event: SubmitEvent): void {
    event.preventDefault();
    const form = event.currentTarget;
    if (!(form instanceof HTMLFormElement)) return;

    const action = form.dataset.action;
    const id = form.dataset.id;
    const data = Object.fromEntries(new FormData(form)) as FormPayload;

    if (action === "login") void this.login(data);
    if (action === "create-request" && id) void this.createRequest(data, id);
    if (action === "save-service") void this.saveService(data, id);
    if (action === "create-user") void this.createUser(data);
    if (action === "save-qr") void this.saveQr(data);
  }

  private async login(data: FormPayload): Promise<void> {
    const email = String(data.email ?? "");
    const password = String(data.password ?? "");

    try {
      const user = await this.store.login(email, password);
      this.session = user;
      this.route = user.role === "admin" ? "admin" : "servicios";
      this.render();
    } catch (error) {
      alert(error instanceof Error ? error.message : "Credenciales incorrectas.");
    }
  }

  private logout(): void {
    this.store.logout();
    this.session = null;
    this.route = "servicios";
    this.modal = null;
    this.render();
  }

  private closeModal(): void {
    this.modal = null;
    this.render();
  }

  private openRequest(id: string): void {
    const service = this.findService(id);
    if (!service) return;
    this.modal = { type: "request", service };
    this.render();
  }

  private async createRequest(data: FormPayload, serviceId: string): Promise<void> {
    if (!this.session) return;
    const service = this.findService(serviceId);
    if (!service) return;
    const details = this.extractDetails(data);

    try {
      await this.store.createRequest({
        userId: this.session.id,
        serviceId: service.id,
        customerName: String(data.customerName ?? ""),
        document: String(data.document ?? ""),
        state: details.state ?? "",
        notes: String(data.notes ?? ""),
        details
      });
      this.modal = null;
      this.route = this.session.role === "admin" ? "solicitudes" : "mis-solicitudes";
      this.render();
    } catch (error) {
      alert(error instanceof Error ? error.message : "No se pudo crear la solicitud.");
    }
  }

  private openService(): void {
    this.modal = { type: "service" };
    this.render();
  }

  private editService(id: string): void {
    const service = this.findService(id);
    if (!service) return;
    this.modal = { type: "service", service };
    this.render();
  }

  private async saveService(data: FormPayload, id?: string): Promise<void> {
    const service: Omit<Service, "id"> = {
      name: String(data.name ?? ""),
      code: String(data.code ?? ""),
      category: String(data.category ?? ""),
      documentKind: String(data.documentKind ?? ""),
      cost: Number(data.cost ?? 0),
      fee: Number(data.fee ?? 0),
      status: "activo",
      description: String(data.description ?? ""),
      requiredFields: this.defaultFields(),
      requirements: this.lines(data.requirements),
      sampleFiles: this.lines(data.sampleFiles)
    };

    try {
      await this.store.saveService(service, id || undefined);
      this.closeModal();
    } catch (error) {
      alert(error instanceof Error ? error.message : "No se pudo guardar el servicio.");
    }
  }

  private openUser(): void {
    this.modal = { type: "user" };
    this.render();
  }

  private async createUser(data: FormPayload): Promise<void> {
    try {
      await this.store.createUser({
        name: String(data.name ?? ""),
        email: String(data.email ?? ""),
        password: String(data.password ?? ""),
        role: String(data.role ?? "cliente") as UserRole
      });
      this.closeModal();
    } catch (error) {
      alert(error instanceof Error ? error.message : "No se pudo crear el usuario.");
    }
  }

  private async saveQr(data: FormPayload): Promise<void> {
    try {
      await this.store.saveQr({
        account: String(data.account ?? ""),
        reference: String(data.reference ?? ""),
        instructions: String(data.instructions ?? "")
      });
      this.render();
    } catch (error) {
      alert(error instanceof Error ? error.message : "No se pudo guardar la configuracion de pago.");
    }
  }

  private openRequestView(id: string): void {
    const request = this.store.snapshot.requests.find((item) => item.id === id);
    if (!request) return;
    this.modal = { type: "request-view", request };
    this.render();
  }

  private findService(id: string): Service | undefined {
    return this.store.snapshot.services.find((service) => service.id === id);
  }

  private extractDetails(data: FormPayload): Record<string, string> {
    return Object.entries(data).reduce<Record<string, string>>((details, [key, value]) => {
      if (key.startsWith("details.")) {
        details[key.replace("details.", "")] = String(value ?? "");
      }
      return details;
    }, {});
  }

  private lines(value: FormDataEntryValue | undefined): string[] {
    return String(value ?? "")
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean);
  }

  private defaultFields(): ServiceField[] {
    return [
      { name: "fullName", label: "Nombre completo", type: "text", required: true },
      { name: "curp", label: "CURP", type: "text", required: true },
      { name: "state", label: "Estado", type: "text", required: true }
    ];
  }
}
