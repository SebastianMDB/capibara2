import type { AppState, PaymentSettings, RequestStatus, Service, TramiteRequest, User, UserRole } from "@paperandom/shared";

const runtimeConfig = window as Window & { PAPERANDOM_API_URL?: string };
const API_BASE_URL = runtimeConfig.PAPERANDOM_API_URL
  ?? window.localStorage.getItem("paperandom-api-url")
  ?? "http://localhost:3000";
const TOKEN_KEY = "paperandom-auth-token";

type LoginResponse = {
  user: User;
  token: string;
};

export class Store {
  private state: AppState = {
    users: [],
    services: [],
    requests: [],
    qr: { account: "", reference: "", instructions: "" }
  };
  private token = window.localStorage.getItem(TOKEN_KEY);

  get snapshot(): AppState {
    return this.state;
  }

  get hasToken(): boolean {
    return Boolean(this.token);
  }

  async restoreSession(): Promise<User | null> {
    if (!this.token) return null;

    try {
      const { user } = await this.request<{ user: User }>("/auth/me");
      await this.refresh();
      return user;
    } catch {
      this.logout();
      return null;
    }
  }

  async login(email: string, password: string): Promise<User> {
    const { user, token } = await this.request<LoginResponse>("/auth/login", {
      method: "POST",
      body: { email, password },
      auth: false
    });
    this.token = token;
    window.localStorage.setItem(TOKEN_KEY, token);
    await this.refresh();
    return user;
  }

  logout(): void {
    this.token = null;
    window.localStorage.removeItem(TOKEN_KEY);
    this.state = {
      users: [],
      services: [],
      requests: [],
      qr: { account: "", reference: "", instructions: "" }
    };
  }

  async refresh(): Promise<void> {
    const [services, requests, qr] = await Promise.all([
      this.request<Service[]>("/services", { auth: false }),
      this.request<TramiteRequest[]>("/requests"),
      this.request<PaymentSettings>("/payment-settings")
    ]);

    let users: User[] = [];
    try {
      users = await this.request<User[]>("/users");
    } catch {
      users = [];
    }

    this.state = { users, services, requests, qr };
  }

  async updateRequestStatus(id: string, status: RequestStatus): Promise<void> {
    await this.request<TramiteRequest>(`/requests/${id}/status`, {
      method: "PATCH",
      body: { status }
    });
    await this.refresh();
  }

  async createRequest(input: {
    userId: string;
    serviceId: string;
    customerName: string;
    document: string;
    state: string;
    notes: string;
    details: Record<string, string>;
  }): Promise<void> {
    await this.request<TramiteRequest>("/requests", {
      method: "POST",
      body: input
    });
    await this.refresh();
  }

  async saveService(input: Omit<Service, "id">, id?: string): Promise<void> {
    await this.request<Service>(id ? `/services/${id}` : "/services", {
      method: id ? "PUT" : "POST",
      body: input
    });
    await this.refresh();
  }

  async createUser(input: { name: string; email: string; password: string; role: UserRole }): Promise<void> {
    await this.request<User>("/users", {
      method: "POST",
      body: input
    });
    await this.refresh();
  }

  async saveQr(input: PaymentSettings): Promise<void> {
    await this.request<PaymentSettings>("/payment-settings", {
      method: "PUT",
      body: input
    });
    await this.refresh();
  }

  private async request<T>(
    path: string,
    options: { method?: string; body?: unknown; auth?: boolean } = {}
  ): Promise<T> {
    const headers = new Headers({ Accept: "application/json" });
    if (options.body !== undefined) headers.set("Content-Type", "application/json");
    if (options.auth !== false && this.token) headers.set("Authorization", `Bearer ${this.token}`);

    const init: RequestInit = {
      method: options.method ?? "GET",
      headers
    };
    if (options.body !== undefined) init.body = JSON.stringify(options.body);

    const response = await fetch(`${API_BASE_URL}${path}`, init);

    if (!response.ok) {
      const message = await response.json().then((body) => body.message as string).catch(() => "");
      throw new Error(message || `Error HTTP ${response.status}`);
    }

    return response.json() as Promise<T>;
  }
}
