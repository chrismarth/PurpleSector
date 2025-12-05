// Prisma-backed database implementation for Purple Sector.
// Uses the same PrismaClient singleton pattern as the web app and
// exposes repositories that implement the interfaces from
// @purplesector/db-base.

import { PrismaClient } from '@prisma/client';
import type { TelemetryRepository, DbContext } from '@purplesector/db-base';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  });

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}

class PrismaTelemetryRepository implements TelemetryRepository {
  async getLapById(id: string): Promise<any | null> {
    return prisma.lap.findUnique({ where: { id } });
  }

  async getLapsBySessionId(sessionId: string): Promise<any[]> {
    return prisma.lap.findMany({ where: { sessionId } });
  }
}

export const db: DbContext = {
  telemetry: new PrismaTelemetryRepository(),
};
