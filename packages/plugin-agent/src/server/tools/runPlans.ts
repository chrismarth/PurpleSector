import type { AgentToolDefinition, AgentToolHandler, AgentToolContext, AgentToolResult } from '@purplesector/plugin-api';

export const runPlanToolDefinitions: AgentToolDefinition[] = [
  {
    name: 'listRunPlans',
    description: 'List all run plans for the current user.',
    inputSchema: {
      type: 'object',
      properties: {
        eventId: { type: 'string', description: 'Optional event ID to filter by' },
      },
    },
    category: 'runPlans',
    mutating: false,
  },
  {
    name: 'getRunPlan',
    description: 'Get a run plan with all its items (session/vehicle-config combinations).',
    inputSchema: {
      type: 'object',
      properties: {
        runPlanId: { type: 'string', description: 'The run plan ID' },
      },
      required: ['runPlanId'],
    },
    category: 'runPlans',
    mutating: false,
  },
  {
    name: 'createRunPlan',
    description: 'Create a new run plan — a named collection of planned session/vehicle-configuration combinations.',
    inputSchema: {
      type: 'object',
      properties: {
        name: { type: 'string', description: 'Run plan name' },
        description: { type: 'string' },
        eventId: { type: 'string', description: 'Optional event ID to associate with' },
        items: {
          type: 'array',
          description: 'Array of planned items',
          items: {
            type: 'object',
            properties: {
              sessionName: { type: 'string', description: 'Planned session name' },
              vehicleId: { type: 'string' },
              vehicleConfigurationId: { type: 'string' },
              vehicleSetupId: { type: 'string' },
              notes: { type: 'string' },
            },
            required: ['sessionName'],
          },
        },
      },
      required: ['name'],
    },
    category: 'runPlans',
    mutating: true,
  },
  {
    name: 'updateRunPlan',
    description: 'Update a run plan (name, description, status) or replace its items.',
    inputSchema: {
      type: 'object',
      properties: {
        runPlanId: { type: 'string', description: 'The run plan ID' },
        name: { type: 'string' },
        description: { type: 'string' },
        status: { type: 'string', description: '"draft" | "active" | "completed"' },
        items: {
          type: 'array',
          description: 'If provided, replaces all items',
          items: {
            type: 'object',
            properties: {
              sessionName: { type: 'string' },
              vehicleId: { type: 'string' },
              vehicleConfigurationId: { type: 'string' },
              vehicleSetupId: { type: 'string' },
              notes: { type: 'string' },
            },
            required: ['sessionName'],
          },
        },
      },
      required: ['runPlanId'],
    },
    category: 'runPlans',
    mutating: true,
  },
  {
    name: 'deleteRunPlan',
    description: 'Delete a run plan and all its items.',
    inputSchema: {
      type: 'object',
      properties: {
        runPlanId: { type: 'string', description: 'The run plan ID to delete' },
      },
      required: ['runPlanId'],
    },
    category: 'runPlans',
    mutating: true,
  },
];

export function createRunPlanToolHandlers(prisma: any): Record<string, AgentToolHandler> {
  return {
    async listRunPlans(args: Record<string, unknown>, ctx: AgentToolContext): Promise<AgentToolResult> {
      const where: Record<string, unknown> = { userId: ctx.userId };
      if (args.eventId) where.eventId = args.eventId;

      const plans = await prisma.runPlan.findMany({
        where,
        include: { _count: { select: { items: true } }, event: { select: { id: true, name: true } } },
        orderBy: { createdAt: 'desc' },
      });
      return { success: true, data: plans, message: `Found ${plans.length} run plans.` };
    },

    async getRunPlan(args: Record<string, unknown>, ctx: AgentToolContext): Promise<AgentToolResult> {
      const plan = await prisma.runPlan.findFirst({
        where: { id: args.runPlanId as string, userId: ctx.userId },
        include: {
          event: { select: { id: true, name: true } },
          items: {
            orderBy: { order: 'asc' },
            include: {
              vehicle: { select: { id: true, name: true } },
              vehicleConfiguration: { select: { id: true, name: true } },
              vehicleSetup: { select: { id: true, name: true } },
              session: { select: { id: true, name: true, status: true } },
            },
          },
        },
      });
      if (!plan) return { success: false, message: 'Run plan not found.' };
      return { success: true, data: plan };
    },

    async createRunPlan(args: Record<string, unknown>, ctx: AgentToolContext): Promise<AgentToolResult> {
      const items = (args.items as Array<Record<string, unknown>>) || [];

      const plan = await prisma.runPlan.create({
        data: {
          userId: ctx.userId,
          name: args.name as string,
          description: (args.description as string) || null,
          eventId: (args.eventId as string) || null,
          status: 'draft',
          items: {
            create: items.map((item, index) => ({
              order: index,
              sessionName: item.sessionName as string,
              vehicleId: (item.vehicleId as string) || null,
              vehicleConfigurationId: (item.vehicleConfigurationId as string) || null,
              vehicleSetupId: (item.vehicleSetupId as string) || null,
              notes: (item.notes as string) || null,
            })),
          },
        },
        include: { items: { orderBy: { order: 'asc' } } },
      });
      return { success: true, data: plan, message: `Created run plan "${plan.name}" with ${plan.items.length} items.` };
    },

    async updateRunPlan(args: Record<string, unknown>, ctx: AgentToolContext): Promise<AgentToolResult> {
      const { runPlanId, items, ...updates } = args;
      const existing = await prisma.runPlan.findFirst({ where: { id: runPlanId as string, userId: ctx.userId } });
      if (!existing) return { success: false, message: 'Run plan not found.' };

      const data: Record<string, unknown> = {};
      if (updates.name !== undefined) data.name = updates.name;
      if (updates.description !== undefined) data.description = updates.description;
      if (updates.status !== undefined) data.status = updates.status;

      if (items !== undefined) {
        await prisma.runPlanItem.deleteMany({ where: { runPlanId: runPlanId as string } });
        const itemsArr = items as Array<Record<string, unknown>>;
        await prisma.runPlanItem.createMany({
          data: itemsArr.map((item, index) => ({
            runPlanId: runPlanId as string,
            order: index,
            sessionName: item.sessionName as string,
            vehicleId: (item.vehicleId as string) || null,
            vehicleConfigurationId: (item.vehicleConfigurationId as string) || null,
            vehicleSetupId: (item.vehicleSetupId as string) || null,
            notes: (item.notes as string) || null,
          })),
        });
      }

      const plan = await prisma.runPlan.update({
        where: { id: runPlanId as string },
        data,
        include: { items: { orderBy: { order: 'asc' } } },
      });
      return { success: true, data: plan, message: `Updated run plan "${plan.name}".` };
    },

    async deleteRunPlan(args: Record<string, unknown>, ctx: AgentToolContext): Promise<AgentToolResult> {
      const existing = await prisma.runPlan.findFirst({ where: { id: args.runPlanId as string, userId: ctx.userId } });
      if (!existing) return { success: false, message: 'Run plan not found.' };
      await prisma.runPlan.delete({ where: { id: args.runPlanId as string } });
      return { success: true, message: `Deleted run plan "${existing.name}".` };
    },
  };
}
