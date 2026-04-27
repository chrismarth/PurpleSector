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

