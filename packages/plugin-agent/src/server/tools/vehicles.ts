import type { AgentToolDefinition, AgentToolHandler, AgentToolContext, AgentToolResult } from '@purplesector/plugin-api';

export const vehicleToolDefinitions: AgentToolDefinition[] = [
  {
    name: 'listVehicles',
    description: 'List all vehicles for the current user.',
    inputSchema: { type: 'object', properties: {} },
    category: 'vehicles',
    mutating: false,
  },
  {
    name: 'createVehicle',
    description: 'Create a new vehicle.',
    inputSchema: {
      type: 'object',
      properties: {
        name: { type: 'string', description: 'Vehicle name (e.g. "Porsche 911 GT3 R")' },
        description: { type: 'string' },
        tags: { type: 'string', description: 'JSON array of tags' },
      },
      required: ['name'],
    },
    category: 'vehicles',
    mutating: true,
  },
  {
    name: 'getVehicleConfigurations',
    description: 'List configurations for a vehicle.',
    inputSchema: {
      type: 'object',
      properties: {
        vehicleId: { type: 'string', description: 'The vehicle ID' },
      },
      required: ['vehicleId'],
    },
    category: 'vehicles',
    mutating: false,
  },
  {
    name: 'createVehicleConfiguration',
    description: 'Create a new vehicle configuration (parts/aero setup).',
    inputSchema: {
      type: 'object',
      properties: {
        vehicleId: { type: 'string', description: 'The vehicle ID' },
        name: { type: 'string', description: 'Configuration name (e.g. "High Downforce Spa")' },
        description: { type: 'string' },
        parts: { type: 'string', description: 'JSON object of parts (e.g. {"frontWing": "High Downforce"})' },
      },
      required: ['vehicleId', 'name', 'parts'],
    },
    category: 'vehicles',
    mutating: true,
  },
  {
    name: 'getVehicleSetups',
    description: 'List setups for a vehicle, optionally filtered by configuration.',
    inputSchema: {
      type: 'object',
      properties: {
        vehicleId: { type: 'string', description: 'The vehicle ID' },
        vehicleConfigurationId: { type: 'string', description: 'Optional configuration ID to filter by' },
      },
      required: ['vehicleId'],
    },
    category: 'vehicles',
    mutating: false,
  },
  {
    name: 'createVehicleSetup',
    description: 'Create a new vehicle setup (suspension, alignment, etc.).',
    inputSchema: {
      type: 'object',
      properties: {
        vehicleId: { type: 'string', description: 'The vehicle ID' },
        vehicleConfigurationId: { type: 'string', description: 'Optional configuration ID' },
        name: { type: 'string', description: 'Setup name (e.g. "Wet Setup v2")' },
        description: { type: 'string' },
        parameters: { type: 'string', description: 'JSON object of setup parameters' },
      },
      required: ['vehicleId', 'name', 'parameters'],
    },
    category: 'vehicles',
    mutating: true,
  },
];

export function createVehicleToolHandlers(prisma: any): Record<string, AgentToolHandler> {
  return {
    async listVehicles(_args: Record<string, unknown>, ctx: AgentToolContext): Promise<AgentToolResult> {
      const vehicles = await prisma.vehicle.findMany({
        where: { userId: ctx.userId },
        include: { _count: { select: { configurations: true, setups: true, sessions: true } } },
        orderBy: { createdAt: 'desc' },
      });
      return { success: true, data: vehicles, message: `Found ${vehicles.length} vehicles.` };
    },

    async createVehicle(args: Record<string, unknown>, ctx: AgentToolContext): Promise<AgentToolResult> {
      const vehicle = await prisma.vehicle.create({
        data: {
          userId: ctx.userId,
          name: args.name as string,
          description: (args.description as string) || null,
          tags: (args.tags as string) || null,
        },
      });
      return { success: true, data: vehicle, message: `Created vehicle "${vehicle.name}".` };
    },

    async getVehicleConfigurations(args: Record<string, unknown>, ctx: AgentToolContext): Promise<AgentToolResult> {
      const vehicle = await prisma.vehicle.findFirst({ where: { id: args.vehicleId as string, userId: ctx.userId } });
      if (!vehicle) return { success: false, message: 'Vehicle not found.' };

      const configs = await prisma.vehicleConfiguration.findMany({
        where: { vehicleId: args.vehicleId as string, userId: ctx.userId },
        orderBy: { createdAt: 'desc' },
      });
      return { success: true, data: configs, message: `Found ${configs.length} configurations for "${vehicle.name}".` };
    },

    async createVehicleConfiguration(args: Record<string, unknown>, ctx: AgentToolContext): Promise<AgentToolResult> {
      const vehicle = await prisma.vehicle.findFirst({ where: { id: args.vehicleId as string, userId: ctx.userId } });
      if (!vehicle) return { success: false, message: 'Vehicle not found.' };

      const config = await prisma.vehicleConfiguration.create({
        data: {
          userId: ctx.userId,
          vehicleId: args.vehicleId as string,
          name: args.name as string,
          description: (args.description as string) || null,
          parts: args.parts as string,
        },
      });
      return { success: true, data: config, message: `Created configuration "${config.name}".` };
    },

    async getVehicleSetups(args: Record<string, unknown>, ctx: AgentToolContext): Promise<AgentToolResult> {
      const vehicle = await prisma.vehicle.findFirst({ where: { id: args.vehicleId as string, userId: ctx.userId } });
      if (!vehicle) return { success: false, message: 'Vehicle not found.' };

      const where: Record<string, unknown> = { vehicleId: args.vehicleId as string, userId: ctx.userId };
      if (args.vehicleConfigurationId) where.vehicleConfigurationId = args.vehicleConfigurationId;

      const setups = await prisma.vehicleSetup.findMany({ where, orderBy: { createdAt: 'desc' } });
      return { success: true, data: setups, message: `Found ${setups.length} setups for "${vehicle.name}".` };
    },

    async createVehicleSetup(args: Record<string, unknown>, ctx: AgentToolContext): Promise<AgentToolResult> {
      const vehicle = await prisma.vehicle.findFirst({ where: { id: args.vehicleId as string, userId: ctx.userId } });
      if (!vehicle) return { success: false, message: 'Vehicle not found.' };

      const setup = await prisma.vehicleSetup.create({
        data: {
          userId: ctx.userId,
          vehicleId: args.vehicleId as string,
          vehicleConfigurationId: (args.vehicleConfigurationId as string) || null,
          name: args.name as string,
          description: (args.description as string) || null,
          parameters: args.parameters as string,
        },
      });
      return { success: true, data: setup, message: `Created setup "${setup.name}".` };
    },
  };
}
