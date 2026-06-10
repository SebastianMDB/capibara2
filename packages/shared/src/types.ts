export type UserRole = "admin" | "cliente";
export type ServiceStatus = "activo" | "inactivo";
export type RequestStatus = "pendiente" | "en proceso" | "completado" | "cancelado";
export type Route = "admin" | "servicios" | "solicitudes" | "mis-solicitudes" | "usuarios" | "qr";

export interface User {
  id: string;
  name: string;
  email: string;
  password?: string;
  role: UserRole;
}

export interface Service {
  id: string;
  name: string;
  code: string;
  category: string;
  documentKind: string;
  cost: number;
  fee: number;
  status: ServiceStatus;
  description: string;
  requiredFields: ServiceField[];
  requirements: string[];
  sampleFiles: string[];
}

export interface ServiceField {
  name: string;
  label: string;
  type: "text" | "date" | "number" | "select" | "textarea" | "file";
  required: boolean;
  placeholder?: string;
  options?: string[];
  accept?: string;
}

export interface TramiteRequest {
  id: string;
  date: string;
  userId: string;
  serviceId: string;
  serviceName: string;
  customerName: string;
  document: string;
  state: string;
  status: RequestStatus;
  total: number;
  notes: string;
  details: Record<string, string>;
  service?: Service;
}

export interface PaymentSettings {
  account: string;
  reference: string;
  instructions: string;
}

export interface AppState {
  users: User[];
  services: Service[];
  requests: TramiteRequest[];
  qr: PaymentSettings;
}

export type ModalState =
  | { type: "request"; service: Service }
  | { type: "service"; service?: Service }
  | { type: "user" }
  | { type: "request-view"; request: TramiteRequest };
