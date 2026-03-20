import {
  Alert,
  DashboardSummary,
  GateEvent,
  ParkingSlot,
  PricingRule,
  Reservation,
  Simulation,
  SimulationQrToken,
  SimulationVehicle,
  ZoneSummary,
} from "./models.js";
import {
  AlertStatus,
  AnprDirection,
  ChargerStatus,
  GateState,
  OwnerType,
  PaymentProvider,
  ReservationStatus,
  SensorType,
  VehicleType,
} from "./enums.js";

// ─── Auth ─────────────────────────────────────────────────────────────────────
export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  accessToken: string;
  user: {
    id: string;
    email: string;
    role: string;
    organizationId: string;
  };
}

// ─── Dashboard ────────────────────────────────────────────────────────────────
export interface DashboardSummaryResponse extends DashboardSummary {}

export interface ZonesResponse {
  zones: ZoneSummary[];
}

export interface EvSummaryResponse {
  totalEvSlots: number;
  available: number;
  inUse: number;
  fault: number;
}

// ─── Events ───────────────────────────────────────────────────────────────────
export interface EventItem {
  id: string;
  type: "ENTRY" | "EXIT";
  plateNumber: string;
  slotCode: string;
  zoneName: string;
  timestamp: string;
  paymentStatus?: string;
}

export interface EventsResponse {
  events: EventItem[];
}

// ─── Alerts ───────────────────────────────────────────────────────────────────
export interface AlertsResponse {
  alerts: Alert[];
}

export interface AlertAckResponse {
  alert: Alert;
}

// ─── Reports ─────────────────────────────────────────────────────────────────
export interface DailyReportResponse {
  date: string;
  entries: number;
  exits: number;
  revenue: number;
  avgDurationMinutes: number;
  peakHour: number;
}

export interface ReportFilter {
  date?: string;
  startDate?: string;
  endDate?: string;
  lotId?: string;
  zoneId?: string;
}

// ─── Slots ────────────────────────────────────────────────────────────────────
export interface SlotsResponse {
  slots: ParkingSlot[];
}

export interface UpdateChargerStatusRequest {
  chargerStatus: ChargerStatus;
}

// ─── Reservations ─────────────────────────────────────────────────────────────
export interface CreateReservationRequest {
  slotId: string;
  plateNumber: string;
  vehicleType: VehicleType;
  ownerType: OwnerType;
  startTime: string;
  endTime: string;
}

export interface ReservationResponse {
  reservation: Reservation;
}

export interface ReservationsResponse {
  reservations: Reservation[];
}

// ─── Payments ─────────────────────────────────────────────────────────────────
export interface InitiatePaymentRequest {
  sessionId: string;
  provider: PaymentProvider;
  idempotencyKey: string;
}

export interface InitiatePaymentResponse {
  transactionId: string;
  redirectUrl?: string;
}

export interface PaymentWebhookPayload {
  pgRefId: string;
  status: "SUCCESS" | "FAILED";
  amount: number;
  paidAt: string;
}

// ─── Sensors ──────────────────────────────────────────────────────────────────
export interface SensorWebhookPayload {
  serialNumber: string;
  eventType: "OCCUPANCY_CHANGE" | "HEARTBEAT" | "ERROR";
  slotCode?: string;
  occupied?: boolean;
  payload?: Record<string, unknown>;
  timestamp: string;
}

// ─── ANPR ─────────────────────────────────────────────────────────────────────
export interface AnprWebhookPayloadRequest {
  plateNumber: string;
  gateId: string;
  direction: AnprDirection;
  confidence: number;
  timestamp: string;
  imageUrl?: string;
}

// ─── Simulations ─────────────────────────────────────────────────────────────
export interface CreateSimulationRequest {
  name: string;
  lotId?: string;
  tokenExpiresInMinutes?: number;
}

export interface SimulationResponse {
  simulation: Simulation;
  qrToken: SimulationQrToken;
}

export interface ScanQrResponse {
  vehicle: SimulationVehicle;
  stats: {
    spawned: number;
    passed: number;
    failed: number;
    gateState: GateState;
  };
}

export interface PassVehicleRequest {
  dropX: number;
  dropY: number;
}

export interface PassVehicleResponse {
  result: "PASSED" | "REJECTED";
  reason?: string;
  vehicle: SimulationVehicle;
  events: GateEvent[];
}

// ─── Pricing Rules ────────────────────────────────────────────────────────────
export interface PricingRulesResponse {
  rules: PricingRule[];
}

export interface UpsertPricingRuleRequest {
  name: string;
  lotId: string;
  zoneId?: string;
  baseRate: number;
  occupancyThreshold: number;
  rateMultiplier: number;
  validFrom: string;
  validUntil?: string;
}

// ─── Alert Status Update ──────────────────────────────────────────────────────
export interface UpdateAlertStatusRequest {
  status: AlertStatus;
}
