import type { AgentToolDefinition, AgentToolHandler, AgentToolContext, AgentToolResult } from '@purplesector/plugin-api';

export const analysisToolDefinitions: AgentToolDefinition[] = [
  {
    name: 'getAnalysisLayout',
    description: 'Get the current analysis panel layout for a given context (e.g. a session or lap).',
    inputSchema: {
      type: 'object',
      properties: {
        context: { type: 'string', description: 'Layout context string, e.g. "global", "session:<id>", "lap:<id>"' },
      },
      required: ['context'],
    },
    category: 'analysis',
    mutating: false,
  },
  {
    name: 'listSavedAnalysisLayouts',
    description: 'List all saved analysis layouts for the current user.',
    inputSchema: { type: 'object', properties: {} },
    category: 'analysis',
    mutating: false,
  },
  {
    name: 'saveAnalysisLayout',
    description: 'Save the current analysis layout with a name.',
    inputSchema: {
      type: 'object',
      properties: {
        name: { type: 'string', description: 'Layout name' },
        description: { type: 'string' },
        layout: { type: 'string', description: 'JSON string of the AnalysisLayoutJSON' },
        context: { type: 'string', description: 'Layout context (default: "global")' },
        isDefault: { type: 'boolean', description: 'Whether this should be the default layout for the context' },
      },
      required: ['name', 'layout'],
    },
    category: 'analysis',
    mutating: true,
  },
];

export function createAnalysisToolHandlers(prisma: any): Record<string, AgentToolHandler> {
  return {
    async getAnalysisLayout(args: Record<string, unknown>, ctx: AgentToolContext): Promise<AgentToolResult> {
      const layout = await prisma.savedAnalysisLayout.findFirst({
        where: { userId: ctx.userId, context: args.context as string, isDefault: true },
      });
      if (!layout) {
        return { success: true, data: null, message: 'No saved layout found for this context. The app uses a default layout.' };
      }
      return { success: true, data: { ...layout, layout: JSON.parse(layout.layout) } };
    },

    async listSavedAnalysisLayouts(_args: Record<string, unknown>, ctx: AgentToolContext): Promise<AgentToolResult> {
      const layouts = await prisma.savedAnalysisLayout.findMany({
        where: { userId: ctx.userId },
        select: { id: true, name: true, description: true, context: true, isDefault: true, createdAt: true },
        orderBy: { createdAt: 'desc' },
      });
      return { success: true, data: layouts, message: `Found ${layouts.length} saved layouts.` };
    },

    async saveAnalysisLayout(args: Record<string, unknown>, ctx: AgentToolContext): Promise<AgentToolResult> {
      const context = (args.context as string) || 'global';
      const isDefault = args.isDefault === true;

      if (isDefault) {
        await prisma.savedAnalysisLayout.updateMany({
          where: { userId: ctx.userId, context, isDefault: true },
          data: { isDefault: false },
        });
      }

      const layout = await prisma.savedAnalysisLayout.create({
        data: {
          userId: ctx.userId,
          name: args.name as string,
          description: (args.description as string) || null,
          layout: args.layout as string,
          context,
          isDefault,
        },
      });
      return { success: true, data: layout, message: `Saved layout "${layout.name}".` };
    },
  };
}
