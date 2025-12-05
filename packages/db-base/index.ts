// Base database abstractions for Purple Sector.
// Defines repository interfaces and shared types that concrete DB
// implementations (e.g. Prisma, Postgres) must satisfy.

export interface TelemetryRepository {
  getLapById(id: string): Promise<any | null>;
  getLapsBySessionId(sessionId: string): Promise<any[]>;
}

export interface DbContext {
  telemetry: TelemetryRepository;
}
