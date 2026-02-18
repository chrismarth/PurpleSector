import type { AgentToolHandler } from './agentTools';

export interface PluginRequestContext {
  userId: string;
  pluginId: string;
  params: Record<string, string>;
}

export interface PluginApiRoute {
  path: string;
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  handler: (req: Request, ctx: PluginRequestContext) => Promise<Response>;
}

export interface PluginServerContext {
  registerApiRoute(route: PluginApiRoute): void;
  getPrisma(): unknown;
  registerAgentToolHandler(name: string, handler: AgentToolHandler): void;
}
