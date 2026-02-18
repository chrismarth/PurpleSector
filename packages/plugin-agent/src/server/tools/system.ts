import type { AgentToolDefinition, AgentToolHandler, AgentToolContext, AgentToolResult } from '@purplesector/plugin-api';

export const systemToolDefinitions: AgentToolDefinition[] = [
  {
    name: 'getCurrentContext',
    description: 'Get the current application context — what page the user is on, which event/session/lap is selected.',
    inputSchema: { type: 'object', properties: {} },
    category: 'system',
    mutating: false,
  },
];

export function createSystemToolHandlers(_prisma: any): Record<string, AgentToolHandler> {
  return {
    async getCurrentContext(_args: Record<string, unknown>, ctx: AgentToolContext): Promise<AgentToolResult> {
      return {
        success: true,
        data: ctx.appContext ?? { page: 'unknown' },
        message: ctx.appContext
          ? `User is on page "${ctx.appContext.page}".`
          : 'No application context available.',
      };
    },
  };
}
