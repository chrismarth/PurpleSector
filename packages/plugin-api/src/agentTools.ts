export type AgentToolCategory =
  | 'events'
  | 'sessions'
  | 'laps'
  | 'lapAnalysis'
  | 'vehicles'
  | 'analysis'
  | 'layouts'
  | 'runPlans'
  | 'system';

export interface AgentToolDefinition {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
  category: AgentToolCategory;
  mutating: boolean;
}

export interface AgentToolContext {
  userId: string;
  appContext?: {
    page: string;
    eventId?: string;
    sessionId?: string;
    lapId?: string;
  };
}

export interface AgentToolResult {
  success: boolean;
  data?: unknown;
  message?: string;
}

export type AgentToolHandler = (
  args: Record<string, unknown>,
  ctx: AgentToolContext,
) => Promise<AgentToolResult>;
