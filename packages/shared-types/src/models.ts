import {
  AlertSeverity,
  AlertStatus,
  AlertType,
  AnprDirection,
  ChargerStatus,
  ChargerType,
  GateEventType,
  GateState,
  JobStatus,
  JobType,
  OwnerType,
  OrgPlan,
  PaymentProvider,
  PaymentStatus,
  PaymentTxStatus,
  ReservationStatus,
  SensorEventType,
  SensorStatus,
  SensorType,
  SimulationStatus,
  SlotStatus,
  UserRole,
  VehicleState,
  VehicleType,
} from "./enums.js";

export interface Organization {
  id: string;
  name: string;
  plan: OrgPlan;
  createdAt: Date;
}

export interface User {
  id: string;
  organizationId: string;
  email: string;
  role: UserRole;
  createdAt: Date;
  updatedAt: Date;
}

export interface ParkingLot {
  id: string;
  organizationId: string;
  name: string;
  location: string;
  totalSlots: number;
  anprConfidenceThreshold: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface ParkingZone {
  id: string;
  lotId: string;
  name: string;
  floor: string;
  totalSlots: number;
  activeSlots: number;
}

export interface ParkingSlot {
  id: string;
  zoneId: string;
  slotCode: string;
  status: SlotStatus;
  isEvCharging: boolean;
  chargerType: ChargerType | null;
  chargerStatus: ChargerStatus | null;
  lastChangedAt: Date;
}

export interface Vehicle {
  id: string;
  plateNumber: string;
  vehicleType: VehicleType;
  ownerType: OwnerType;
}

export interface ParkingSession {
  id: string;
  vehicleId: string;
  slotId: string;
  entryTime: Date;
  exitTime: Date | null;
  paymentStatus: PaymentStatus;
  feeAmount: number | null;
}

export interface Alert {
  id: string;
  organizationId: string;
  lotId: string | null;
  type: AlertType;
  severity: AlertSeverity;
  message: string;
  status: AlertStatus;
  createdAt: Date;
  resolvedAt: Date | null;
}

export interface AuditLog {
  id: string;
  userId: string | null;
  action: string;
  resourceType: string;
  resourceId: string;
  payloadJson: string;
  createdAt: Date;
}

export interface Simulation {
  id: string;
  organizationId: string;
  lotId: string | null;
  name: string;
  status: SimulationStatus;
  gateState: GateState;
  createdAt: Date;
  endedAt: Date | null;
}

export interface SimulationQrToken {
  id: string;
  simulationId: string;
  token: string;
  expiresAt: Date;
  scanCount: number;
}

export interface SimulationVehicle {
  id: string;
  simulationId: string;
  sourceTokenId: string;
  label: string;
  state: VehicleState;
  spawnedAt: Date;
  passedAt: Date | null;
}

export interface GateEvent {
  id: string;
  simulationId: string;
  vehicleId: string | null;
  eventType: GateEventType;
  payloadJson: string;
  createdAt: Date;
}

export interface Reservation {
  id: string;
  slotId: string;
  vehicleId: string;
  reservedBy: string;
  startTime: Date;
  endTime: Date;
  status: ReservationStatus;
  createdAt: Date;
  updatedAt: Date;
}

export interface PricingRule {
  id: string;
  lotId: string;
  zoneId: string | null;
  name: string;
  baseRate: number;
  occupancyThreshold: number;
  rateMultiplier: number;
  validFrom: Date;
  validUntil: Date | null;
  isActive: boolean;
}

export interface PricingHistory {
  id: string;
  ruleId: string;
  sessionId: string;
  appliedRate: number;
  occupancyAtEntry: number;
  createdAt: Date;
}

export interface PaymentTransaction {
  id: string;
  sessionId: string;
  provider: PaymentProvider;
  pgRefId: string | null;
  amount: number;
  currency: string;
  status: PaymentTxStatus;
  idempotencyKey: string;
  paidAt: Date | null;
  refundedAt: Date | null;
  createdAt: Date;
}

export interface SensorDevice {
  id: string;
  slotId: string | null;
  zoneId: string | null;
  type: SensorType;
  vendor: string | null;
  serialNumber: string | null;
  status: SensorStatus;
  lastHeartbeatAt: Date | null;
  installedAt: Date;
}

export interface SensorEvent {
  id: string;
  sensorId: string;
  eventType: SensorEventType;
  payloadJson: string;
  createdAt: Date;
}

export interface JobQueue {
  id: string;
  type: JobType;
  payloadJson: string;
  status: JobStatus;
  attempts: number;
  maxAttempts: number;
  nextRunAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

// ─── Composite / View types ────────────────────────────────────────────────────
export interface ZoneSummary {
  zoneId: string;
  zoneName: string;
  floor: string;
  totalSlots: number;
  occupiedSlots: number;
  occupancyRate: number;
  congestionLevel: "NORMAL" | "CAUTION" | "CONGESTED";
}

export interface DashboardSummary {
  totalSlots: number;
  occupiedSlots: number;
  emptySlots: number;
  occupancyRate: number;
  todayEntries: number;
  todayExits: number;
  openAlerts: number;
  evAvailable: number;
  evInUse: number;
  evFault: number;
}

export interface SimulationStats {
  simulationId: string;
  spawned: number;
  passed: number;
  failed: number;
  gateState: GateState;
}

export interface AnprWebhookPayload {
  plateNumber: string;
  gateId: string;
  direction: AnprDirection;
  confidence: number;
  timestamp: string;
  imageUrl?: string;
}
