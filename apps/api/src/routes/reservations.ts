import { FastifyInstance } from "fastify";

import { prisma } from "../db.js";
import { requireAuth } from "../middleware/auth.js";
import { Errors } from "../lib/errors.js";

export async function reservationRoutes(app: FastifyInstance) {
  app.addHook("onRequest", requireAuth);

  app.post<{
    Body: {
      slotId: string;
      plateNumber: string;
      vehicleType: string;
      ownerType: string;
      startTime: string;
      endTime: string;
    };
  }>("/api/reservations", async (request) => {
    const { slotId, plateNumber, vehicleType, ownerType, startTime, endTime } = request.body;

    // Check slot belongs to org
    const slot = await prisma.parkingSlot.findUnique({
      where: { id: slotId },
      include: { zone: { include: { lot: true } } },
    });
    if (!slot) throw Errors.notFound("Slot");
    if (slot.zone.lot.organizationId !== request.user.organizationId) throw Errors.forbidden();

    // Check for conflicting reservations
    const conflict = await prisma.reservation.findFirst({
      where: {
        slotId,
        status: { in: ["PENDING", "CONFIRMED"] },
        OR: [
          { startTime: { lte: new Date(endTime) }, endTime: { gte: new Date(startTime) } },
        ],
      },
    });
    if (conflict) throw Errors.conflict("Slot already reserved for this time period");

    // Find or create vehicle
    let vehicle = await prisma.vehicle.findUnique({ where: { plateNumber } });
    if (!vehicle) {
      vehicle = await prisma.vehicle.create({
        data: { plateNumber, vehicleType, ownerType },
      });
    }

    const reservation = await prisma.reservation.create({
      data: {
        slotId,
        vehicleId: vehicle.id,
        reservedBy: request.user.sub,
        startTime: new Date(startTime),
        endTime: new Date(endTime),
        status: "CONFIRMED",
      },
    });

    // Mark slot as reserved
    await prisma.parkingSlot.update({
      where: { id: slotId },
      data: { status: "RESERVED", lastChangedAt: new Date() },
    });

    return { reservation };
  });

  app.get<{ Params: { id: string } }>("/api/reservations/:id", async (request) => {
    const reservation = await prisma.reservation.findUnique({
      where: { id: request.params.id },
      include: { slot: { include: { zone: { include: { lot: true } } } }, vehicle: true },
    });
    if (!reservation) throw Errors.notFound("Reservation");
    if (reservation.slot.zone.lot.organizationId !== request.user.organizationId) {
      throw Errors.forbidden();
    }
    return { reservation };
  });

  app.patch<{ Params: { id: string } }>("/api/reservations/:id/cancel", async (request) => {
    const reservation = await prisma.reservation.findUnique({
      where: { id: request.params.id },
      include: { slot: { include: { zone: { include: { lot: true } } } } },
    });
    if (!reservation) throw Errors.notFound("Reservation");
    if (reservation.slot.zone.lot.organizationId !== request.user.organizationId) {
      throw Errors.forbidden();
    }

    const updated = await prisma.reservation.update({
      where: { id: request.params.id },
      data: { status: "CANCELLED" },
    });

    // Free the slot
    await prisma.parkingSlot.update({
      where: { id: reservation.slotId },
      data: { status: "EMPTY", lastChangedAt: new Date() },
    });

    return { reservation: updated };
  });

  app.post<{ Params: { id: string } }>("/api/reservations/:id/check-in", async (request) => {
    const reservation = await prisma.reservation.findUnique({
      where: { id: request.params.id },
      include: { slot: { include: { zone: { include: { lot: true } } } } },
    });
    if (!reservation) throw Errors.notFound("Reservation");
    if (reservation.slot.zone.lot.organizationId !== request.user.organizationId) {
      throw Errors.forbidden();
    }
    if (reservation.status !== "CONFIRMED") {
      throw Errors.badRequest("Reservation is not in CONFIRMED status");
    }

    const [updated] = await prisma.$transaction([
      prisma.reservation.update({
        where: { id: request.params.id },
        data: { status: "CHECKED_IN" },
      }),
      prisma.parkingSlot.update({
        where: { id: reservation.slotId },
        data: { status: "OCCUPIED", lastChangedAt: new Date() },
      }),
    ]);

    return { reservation: updated };
  });

  app.get<{ Querystring: { slotId?: string; status?: string } }>(
    "/api/reservations",
    async (request) => {
      const { slotId, status } = request.query;
      const reservations = await prisma.reservation.findMany({
        where: {
          slot: { zone: { lot: { organizationId: request.user.organizationId } } },
          ...(slotId && { slotId }),
          ...(status && { status }),
        },
        include: { vehicle: true, slot: true },
        orderBy: { startTime: "asc" },
        take: 200,
      });
      return { reservations };
    },
  );
}
