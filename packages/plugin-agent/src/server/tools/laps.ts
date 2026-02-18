import type { AgentToolDefinition, AgentToolHandler, AgentToolContext, AgentToolResult } from '@purplesector/plugin-api';

export const lapToolDefinitions: AgentToolDefinition[] = [
  {
    name: 'listLaps',
    description: 'List all laps for a session, ordered by lap number.',
    inputSchema: {
      type: 'object',
      properties: {
        sessionId: { type: 'string', description: 'The session ID' },
      },
      required: ['sessionId'],
    },
    category: 'laps',
    mutating: false,
  },
  {
    name: 'getLap',
    description: 'Get details of a specific lap by ID (without full telemetry data).',
    inputSchema: {
      type: 'object',
      properties: {
        lapId: { type: 'string', description: 'The lap ID' },
      },
      required: ['lapId'],
    },
    category: 'laps',
    mutating: false,
  },
  {
    name: 'getLapTelemetry',
    description: 'Get the full telemetry data for a specific lap.',
    inputSchema: {
      type: 'object',
      properties: {
        lapId: { type: 'string', description: 'The lap ID' },
      },
      required: ['lapId'],
    },
    category: 'laps',
    mutating: false,
  },
];

export function createLapToolHandlers(prisma: any): Record<string, AgentToolHandler> {
  return {
    async listLaps(args: Record<string, unknown>, ctx: AgentToolContext): Promise<AgentToolResult> {
      const session = await prisma.session.findFirst({
        where: { id: args.sessionId as string, userId: ctx.userId },
      });
      if (!session) return { success: false, message: 'Session not found.' };

      const laps = await prisma.lap.findMany({
        where: { sessionId: args.sessionId as string },
        select: {
          id: true,
          lapNumber: true,
          lapTime: true,
          analyzed: true,
          tags: true,
          createdAt: true,
        },
        orderBy: { lapNumber: 'asc' },
      });
      return { success: true, data: laps, message: `Found ${laps.length} laps.` };
    },

    async getLap(args: Record<string, unknown>, ctx: AgentToolContext): Promise<AgentToolResult> {
      const lap = await prisma.lap.findFirst({
        where: { id: args.lapId as string, userId: ctx.userId },
        select: {
          id: true,
          lapNumber: true,
          lapTime: true,
          analyzed: true,
          suggestions: true,
          driverComments: true,
          tags: true,
          createdAt: true,
          session: { select: { id: true, name: true, eventId: true } },
        },
      });
      if (!lap) return { success: false, message: 'Lap not found.' };
      return { success: true, data: lap };
    },

    async getLapTelemetry(args: Record<string, unknown>, ctx: AgentToolContext): Promise<AgentToolResult> {
      const lap = await prisma.lap.findFirst({
        where: { id: args.lapId as string, userId: ctx.userId },
        select: { id: true, lapNumber: true, lapTime: true, telemetryData: true },
      });
      if (!lap) return { success: false, message: 'Lap not found.' };

      let telemetry;
      try {
        telemetry = JSON.parse(lap.telemetryData);
      } catch {
        telemetry = [];
      }
      return {
        success: true,
        data: { ...lap, telemetryData: undefined, telemetry, frameCount: telemetry.length },
        message: `Lap ${lap.lapNumber} has ${telemetry.length} telemetry frames.`,
      };
    },
  };
}
