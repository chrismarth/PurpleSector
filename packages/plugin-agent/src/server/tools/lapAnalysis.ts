import type { AgentToolDefinition, AgentToolHandler, AgentToolContext, AgentToolResult } from '@purplesector/plugin-api';
import { createAnalyzer, getAvailableAnalyzers, getAnalyzerInfo, analyzeTelemetryData } from '@purplesector/lap-analysis-base';

export const lapAnalysisToolDefinitions: AgentToolDefinition[] = [
  {
    name: 'analyzeLap',
    description:
      'Run AI-powered analysis on a lap to generate driving improvement suggestions. ' +
      'Uses the configured analyzer (simple or langgraph). Optionally compares against a reference lap.',
    inputSchema: {
      type: 'object',
      properties: {
        lapId: { type: 'string', description: 'The lap ID to analyze' },
        referenceLapId: {
          type: 'string',
          description: 'Optional reference lap ID to compare against. If omitted, the fastest lap in the same session is used.',
        },
        analyzer: {
          type: 'string',
          description: 'Analyzer type: "simple" (fast, 1 API call) or "langgraph" (comprehensive agentic workflow). Defaults to env ANALYZER_TYPE or "simple".',
        },
      },
      required: ['lapId'],
    },
    category: 'lapAnalysis',
    mutating: false,
  },
  {
    name: 'getLapTelemetrySummary',
    description:
      'Get a computed telemetry summary for a lap (avg/max speed, braking events, throttle metrics, steering smoothness) without running the full AI analysis.',
    inputSchema: {
      type: 'object',
      properties: {
        lapId: { type: 'string', description: 'The lap ID' },
      },
      required: ['lapId'],
    },
    category: 'lapAnalysis',
    mutating: false,
  },
  {
    name: 'listAnalyzers',
    description: 'List available lap analysis engines and their characteristics (speed, cost, description).',
    inputSchema: { type: 'object', properties: {} },
    category: 'lapAnalysis',
    mutating: false,
  },
];

export function createLapAnalysisToolHandlers(prisma: any): Record<string, AgentToolHandler> {
  return {
    async analyzeLap(args: Record<string, unknown>, ctx: AgentToolContext): Promise<AgentToolResult> {
      const lapId = args.lapId as string;

      const lapMeta = await prisma.lap.findFirst({
        where: { id: lapId },
        select: { id: true, sessionId: true },
      });
      if (!lapMeta) return { success: false, message: 'Lap not found.' };

      const session = await prisma.session.findFirst({
        where: { id: lapMeta.sessionId, userId: ctx.userId },
        select: { id: true },
      });
      if (!session) return { success: false, message: 'Lap not found.' };

      const lap = await prisma.lap.findFirst({
        where: { id: lapId },
        select: { id: true, lapNumber: true, lapTime: true, sessionId: true },
      });
      if (!lap) return { success: false, message: 'Lap not found.' };

      return {
        success: false,
        message:
          'Lap analysis via agent tools is not supported yet. Telemetry frames are stored in Iceberg and must be queried via Trino by (sessionId, lapNumber).',
      };
    },

    async getLapTelemetrySummary(args: Record<string, unknown>, ctx: AgentToolContext): Promise<AgentToolResult> {
      const lapId = args.lapId as string;

      const lapMeta = await prisma.lap.findFirst({
        where: { id: lapId },
        select: { id: true, sessionId: true, lapNumber: true, lapTime: true },
      });
      if (!lapMeta) return { success: false, message: 'Lap not found.' };

      const session = await prisma.session.findFirst({
        where: { id: lapMeta.sessionId, userId: ctx.userId },
        select: { id: true },
      });
      if (!session) return { success: false, message: 'Lap not found.' };

      return {
        success: false,
        message:
          'Lap telemetry summary via agent tools is not supported yet. Telemetry frames are stored in Iceberg and must be queried via Trino by (sessionId, lapNumber).',
      };
    },

    async listAnalyzers(_args: Record<string, unknown>, _ctx: AgentToolContext): Promise<AgentToolResult> {
      const types = getAvailableAnalyzers();
      const analyzers = types.map((type) => ({
        type,
        ...getAnalyzerInfo(type),
      }));

      return {
        success: true,
        data: analyzers,
        message: `Available analyzers: ${analyzers.map((a) => `${a.name} (${a.type})`).join(', ')}`,
      };
    },
  };
}
