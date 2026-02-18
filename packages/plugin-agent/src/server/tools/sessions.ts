import type { AgentToolDefinition, AgentToolHandler, AgentToolContext, AgentToolResult } from '@purplesector/plugin-api';

export const sessionToolDefinitions: AgentToolDefinition[] = [
  {
    name: 'listSessions',
    description: 'List all sessions, optionally filtered by event ID.',
    inputSchema: {
      type: 'object',
      properties: {
        eventId: { type: 'string', description: 'Optional event ID to filter by' },
      },
    },
    category: 'sessions',
    mutating: false,
  },
  {
    name: 'getSession',
    description: 'Get details of a specific session by ID, including lap count.',
    inputSchema: {
      type: 'object',
      properties: {
        sessionId: { type: 'string', description: 'The session ID' },
      },
      required: ['sessionId'],
    },
    category: 'sessions',
    mutating: false,
  },
  {
    name: 'createSession',
    description: 'Create a new session within an event.',
    inputSchema: {
      type: 'object',
      properties: {
        eventId: { type: 'string', description: 'The event ID to create the session in' },
        name: { type: 'string', description: 'Session name (e.g. "Practice 1", "Qualifying")' },
        source: { type: 'string', description: 'Data source: "live" or "demo"' },
        vehicleId: { type: 'string', description: 'Optional vehicle ID' },
        vehicleConfigurationId: { type: 'string', description: 'Optional vehicle configuration ID' },
        vehicleSetupId: { type: 'string', description: 'Optional vehicle setup ID' },
      },
      required: ['eventId', 'name', 'source'],
    },
    category: 'sessions',
    mutating: true,
  },
  {
    name: 'updateSession',
    description: 'Update an existing session (name, status, vehicle assignment, etc.).',
    inputSchema: {
      type: 'object',
      properties: {
        sessionId: { type: 'string', description: 'The session ID to update' },
        name: { type: 'string' },
        status: { type: 'string', description: '"active" | "paused" | "archived"' },
        vehicleId: { type: 'string' },
        vehicleConfigurationId: { type: 'string' },
        vehicleSetupId: { type: 'string' },
      },
      required: ['sessionId'],
    },
    category: 'sessions',
    mutating: true,
  },
  {
    name: 'deleteSession',
    description: 'Delete a session and all its laps.',
    inputSchema: {
      type: 'object',
      properties: {
        sessionId: { type: 'string', description: 'The session ID to delete' },
      },
      required: ['sessionId'],
    },
    category: 'sessions',
    mutating: true,
  },
];

export function createSessionToolHandlers(prisma: any): Record<string, AgentToolHandler> {
  return {
    async listSessions(args: Record<string, unknown>, ctx: AgentToolContext): Promise<AgentToolResult> {
      const where: Record<string, unknown> = { userId: ctx.userId };
      if (args.eventId) where.eventId = args.eventId;

      const sessions = await prisma.session.findMany({
        where,
        include: { _count: { select: { laps: true } } },
        orderBy: { createdAt: 'desc' },
      });
      return { success: true, data: sessions, message: `Found ${sessions.length} sessions.` };
    },

    async getSession(args: Record<string, unknown>, ctx: AgentToolContext): Promise<AgentToolResult> {
      const session = await prisma.session.findFirst({
        where: { id: args.sessionId as string, userId: ctx.userId },
        include: {
          _count: { select: { laps: true } },
          event: { select: { id: true, name: true } },
          vehicle: { select: { id: true, name: true } },
          vehicleConfiguration: { select: { id: true, name: true } },
          vehicleSetup: { select: { id: true, name: true } },
        },
      });
      if (!session) return { success: false, message: 'Session not found.' };
      return { success: true, data: session };
    },

    async createSession(args: Record<string, unknown>, ctx: AgentToolContext): Promise<AgentToolResult> {
      const event = await prisma.event.findFirst({ where: { id: args.eventId as string, userId: ctx.userId } });
      if (!event) return { success: false, message: 'Event not found.' };

      const session = await prisma.session.create({
        data: {
          userId: ctx.userId,
          eventId: args.eventId as string,
          name: args.name as string,
          source: args.source as string,
          status: 'active',
          started: true,
          vehicleId: (args.vehicleId as string) || null,
          vehicleConfigurationId: (args.vehicleConfigurationId as string) || null,
          vehicleSetupId: (args.vehicleSetupId as string) || null,
        },
      });
      return { success: true, data: session, message: `Created session "${session.name}".` };
    },

    async updateSession(args: Record<string, unknown>, ctx: AgentToolContext): Promise<AgentToolResult> {
      const { sessionId, ...updates } = args;
      const existing = await prisma.session.findFirst({ where: { id: sessionId as string, userId: ctx.userId } });
      if (!existing) return { success: false, message: 'Session not found.' };

      const data: Record<string, unknown> = {};
      if (updates.name !== undefined) data.name = updates.name;
      if (updates.status !== undefined) data.status = updates.status;
      if (updates.vehicleId !== undefined) data.vehicleId = updates.vehicleId || null;
      if (updates.vehicleConfigurationId !== undefined) data.vehicleConfigurationId = updates.vehicleConfigurationId || null;
      if (updates.vehicleSetupId !== undefined) data.vehicleSetupId = updates.vehicleSetupId || null;

      const session = await prisma.session.update({ where: { id: sessionId as string }, data });
      return { success: true, data: session, message: `Updated session "${session.name}".` };
    },

    async deleteSession(args: Record<string, unknown>, ctx: AgentToolContext): Promise<AgentToolResult> {
      const existing = await prisma.session.findFirst({ where: { id: args.sessionId as string, userId: ctx.userId } });
      if (!existing) return { success: false, message: 'Session not found.' };
      await prisma.session.delete({ where: { id: args.sessionId as string } });
      return { success: true, message: `Deleted session "${existing.name}".` };
    },
  };
}
