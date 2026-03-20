import { AlertSeverity, AlertType } from "@parking/types";

import { prisma } from "../db.js";
import { logger } from "../lib/logger.js";

export async function createAlert(params: {
  organizationId: string;
  lotId?: string;
  type: AlertType;
  severity: AlertSeverity;
  message: string;
}) {
  const alert = await prisma.alert.create({
    data: {
      organizationId: params.organizationId,
      lotId: params.lotId ?? null,
      type: params.type,
      severity: params.severity,
      message: params.message,
      status: "OPEN",
    },
  });
  logger.info({ alertId: alert.id, type: params.type }, "Alert created");
  return alert;
}

export async function acknowledgeAlert(alertId: string) {
  return prisma.alert.update({
    where: { id: alertId },
    data: { status: "ACK" },
  });
}

export async function resolveAlert(alertId: string) {
  return prisma.alert.update({
    where: { id: alertId },
    data: { status: "RESOLVED", resolvedAt: new Date() },
  });
}

export async function getOpenAlerts(organizationId: string) {
  return prisma.alert.findMany({
    where: { organizationId, status: { in: ["OPEN", "ACK"] } },
    orderBy: [{ severity: "desc" }, { createdAt: "desc" }],
  });
}
