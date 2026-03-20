// ─── Organization ────────────────────────────────────────────────────────────
export enum OrgPlan {
  FREE = "FREE",
  PRO = "PRO",
  ENTERPRISE = "ENTERPRISE",
}

// ─── User / Auth ──────────────────────────────────────────────────────────────
export enum UserRole {
  ADMIN = "ADMIN",
  OPERATOR = "OPERATOR",
  BILLING = "BILLING",
  SUPER_ADMIN = "SUPER_ADMIN",
}

// ─── Parking Slot ─────────────────────────────────────────────────────────────
export enum SlotStatus {
  EMPTY = "EMPTY",
  OCCUPIED = "OCCUPIED",
  RESERVED = "RESERVED",
  OUT_OF_SERVICE = "OUT_OF_SERVICE",
}

export enum ChargerType {
  AC_SLOW = "AC_SLOW",
  DC_FAST = "DC_FAST",
}

export enum ChargerStatus {
  AVAILABLE = "AVAILABLE",
  IN_USE = "IN_USE",
  FAULT = "FAULT",
}

// ─── Vehicle ──────────────────────────────────────────────────────────────────
export enum VehicleType {
  CAR = "CAR",
  MOTORCYCLE = "MOTORCYCLE",
  TRUCK = "TRUCK",
}

export enum OwnerType {
  VISITOR = "VISITOR",
  MEMBER = "MEMBER",
}

// ─── Parking Session ──────────────────────────────────────────────────────────
export enum PaymentStatus {
  UNPAID = "UNPAID",
  PAID = "PAID",
  EXEMPT = "EXEMPT",
}

// ─── Alert ────────────────────────────────────────────────────────────────────
export enum AlertType {
  OVERSTAY = "OVERSTAY",
  SENSOR_ERROR = "SENSOR_ERROR",
  GATE_ERROR = "GATE_ERROR",
  PAYMENT_ERROR = "PAYMENT_ERROR",
  ANPR_LOW_CONFIDENCE = "ANPR_LOW_CONFIDENCE",
}

export enum AlertSeverity {
  INFO = "INFO",
  WARN = "WARN",
  CRITICAL = "CRITICAL",
}

export enum AlertStatus {
  OPEN = "OPEN",
  ACK = "ACK",
  RESOLVED = "RESOLVED",
}

// ─── Simulation ───────────────────────────────────────────────────────────────
export enum SimulationStatus {
  READY = "READY",
  RUNNING = "RUNNING",
  ENDED = "ENDED",
}

export enum VehicleState {
  QUEUED = "QUEUED",
  DRAGGING = "DRAGGING",
  PASSED = "PASSED",
  FAILED = "FAILED",
}

export enum GateEventType {
  SPAWNED = "SPAWNED",
  DRAG_START = "DRAG_START",
  DROP_ATTEMPT = "DROP_ATTEMPT",
  PASSED = "PASSED",
  REJECTED = "REJECTED",
}

// ─── Gate State Machine ───────────────────────────────────────────────────────
export enum GateState {
  CLOSED = "CLOSED",
  OPENING = "OPENING",
  OPEN = "OPEN",
  CLOSING = "CLOSING",
}

// ─── Reservation ─────────────────────────────────────────────────────────────
export enum ReservationStatus {
  PENDING = "PENDING",
  CONFIRMED = "CONFIRMED",
  CHECKED_IN = "CHECKED_IN",
  CANCELLED = "CANCELLED",
  EXPIRED = "EXPIRED",
}

// ─── Payment ──────────────────────────────────────────────────────────────────
export enum PaymentProvider {
  STRIPE = "STRIPE",
  KG_INICIS = "KG_INICIS",
  TOSS = "TOSS",
  MANUAL = "MANUAL",
}

export enum PaymentTxStatus {
  PENDING = "PENDING",
  SUCCESS = "SUCCESS",
  FAILED = "FAILED",
  REFUNDED = "REFUNDED",
}

// ─── Sensor ───────────────────────────────────────────────────────────────────
export enum SensorType {
  ULTRASONIC = "ULTRASONIC",
  MAGNETIC = "MAGNETIC",
  CAMERA = "CAMERA",
  GATE_LOOP = "GATE_LOOP",
}

export enum SensorStatus {
  ONLINE = "ONLINE",
  OFFLINE = "OFFLINE",
  ERROR = "ERROR",
}

export enum SensorEventType {
  OCCUPANCY_CHANGE = "OCCUPANCY_CHANGE",
  HEARTBEAT = "HEARTBEAT",
  ERROR = "ERROR",
}

// ─── Job Queue ────────────────────────────────────────────────────────────────
export enum JobType {
  SENSOR_EVENT = "SENSOR_EVENT",
  PAYMENT_WEBHOOK = "PAYMENT_WEBHOOK",
  ANPR_EVENT = "ANPR_EVENT",
  RESERVATION_EXPIRY = "RESERVATION_EXPIRY",
  ALERT_ESCALATION = "ALERT_ESCALATION",
}

export enum JobStatus {
  PENDING = "PENDING",
  PROCESSING = "PROCESSING",
  DONE = "DONE",
  FAILED = "FAILED",
}

// ─── ANPR ─────────────────────────────────────────────────────────────────────
export enum AnprDirection {
  ENTRY = "ENTRY",
  EXIT = "EXIT",
}
