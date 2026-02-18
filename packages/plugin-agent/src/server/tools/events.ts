import type { AgentToolDefinition, AgentToolHandler, AgentToolContext, AgentToolResult } from '@purplesector/plugin-api';

// ── Tool Definitions ──

export const eventToolDefinitions: AgentToolDefinition[] = [
  {
    name: 'listEvents',
    description: 'List all events for the current user, ordered by creation date descending.',
    inputSchema: {
      type: 'object',
      properties: {},
    },
    category: 'events',
    mutating: false,
  },
  {
    name: 'getEvent',
    description: 'Get details of a specific event by ID, including session count.',
    inputSchema: {
      type: 'object',
      properties: {
        eventId: { type: 'string', description: 'The event ID' },
      },
      required: ['eventId'],
    },
    category: 'events',
    mutating: false,
  },
  {
    name: 'createEvent',
    description: 'Create a new event (race weekend, track day, etc.).',
    inputSchema: {
      type: 'object',
      properties: {
        name: { type: 'string', description: 'Event name' },
        description: { type: 'string', description: 'Optional description' },
        location: { type: 'string', description: 'Track or venue name' },
        startDate: { type: 'string', description: 'ISO date string for event start' },
        endDate: { type: 'string', description: 'ISO date string for event end' },
      },
      required: ['name'],
    },
    category: 'events',
    mutating: true,
  },
  {
    name: 'updateEvent',
    description: 'Update an existing event.',
    inputSchema: {
      type: 'object',
      properties: {
        eventId: { type: 'string', description: 'The event ID to update' },
        name: { type: 'string' },
        description: { type: 'string' },
        location: { type: 'string' },
        startDate: { type: 'string' },
        endDate: { type: 'string' },
      },
      required: ['eventId'],
    },
    category: 'events',
    mutating: true,
  },
  {
    name: 'deleteEvent',
    description: 'Delete an event and all its sessions/laps.',
    inputSchema: {
      type: 'object',
      properties: {
        eventId: { type: 'string', description: 'The event ID to delete' },
      },
      required: ['eventId'],
    },
    category: 'events',
    mutating: true,
  },
];

// ── Tool Handlers ──

export function createEventToolHandlers(prisma: any): Record<string, AgentToolHandler> {
  return {
    async listEvents(args: Record<string, unknown>, ctx: AgentToolContext): Promise<AgentToolResult> {
      const events = await prisma.event.findMany({
        where: { userId: ctx.userId },
        include: { _count: { select: { sessions: true } } },
        orderBy: { createdAt: 'desc' },
      });
      return { success: true, data: events, message: `Found ${events.length} events.` };
    },

    async getEvent(args: Record<string, unknown>, ctx: AgentToolContext): Promise<AgentToolResult> {
      const event = await prisma.event.findFirst({
        where: { id: args.eventId as string, userId: ctx.userId },
        include: {
          _count: { select: { sessions: true } },
          sessions: { select: { id: true, name: true, status: true, createdAt: true } },
        },
      });
      if (!event) return { success: false, message: 'Event not found.' };
      return { success: true, data: event };
    },

    async createEvent(args: Record<string, unknown>, ctx: AgentToolContext): Promise<AgentToolResult> {
      const event = await prisma.event.create({
        data: {
          userId: ctx.userId,
          name: args.name as string,
          description: (args.description as string) || null,
          location: (args.location as string) || null,
          startDate: args.startDate ? new Date(args.startDate as string) : null,
          endDate: args.endDate ? new Date(args.endDate as string) : null,
        },
      });
      return { success: true, data: event, message: `Created event "${event.name}".` };
    },

    async updateEvent(args: Record<string, unknown>, ctx: AgentToolContext): Promise<AgentToolResult> {
      const { eventId, ...updates } = args;
      const existing = await prisma.event.findFirst({ where: { id: eventId as string, userId: ctx.userId } });
      if (!existing) return { success: false, message: 'Event not found.' };

      const data: Record<string, unknown> = {};
      if (updates.name !== undefined) data.name = updates.name;
      if (updates.description !== undefined) data.description = updates.description;
      if (updates.location !== undefined) data.location = updates.location;
      if (updates.startDate !== undefined) data.startDate = new Date(updates.startDate as string);
      if (updates.endDate !== undefined) data.endDate = new Date(updates.endDate as string);

      const event = await prisma.event.update({ where: { id: eventId as string }, data });
      return { success: true, data: event, message: `Updated event "${event.name}".` };
    },

    async deleteEvent(args: Record<string, unknown>, ctx: AgentToolContext): Promise<AgentToolResult> {
      const existing = await prisma.event.findFirst({ where: { id: args.eventId as string, userId: ctx.userId } });
      if (!existing) return { success: false, message: 'Event not found.' };
      await prisma.event.delete({ where: { id: args.eventId as string } });
      return { success: true, message: `Deleted event "${existing.name}".` };
    },
  };
}
