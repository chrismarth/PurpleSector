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

      // Verify the lap belongs to the user
      const lap = await prisma.lap.findFirst({
        where: { id: lapId, userId: ctx.userId },
        select: { id: true, lapNumber: true, lapTime: true, telemetryData: true, sessionId: true },
      });
      if (!lap) return { success: false, message: 'Lap not found.' };

      let telemetryFrames: any[];
      try {
        telemetryFrames = JSON.parse(lap.telemetryData);
      } catch {
        return { success: false, message: 'Failed to parse telemetry data for this lap.' };
      }

      if (telemetryFrames.length === 0) {
        return { success: false, message: 'Lap has no telemetry frames.' };
      }

      // Determine reference lap
      let referenceLapId = args.referenceLapId as string | undefined;

      // Create the analyzer via the factory
      const analyzerType = (args.analyzer as string) || undefined;
      const analyzer = createAnalyzer(analyzerType as any);

      try {
        const result = await analyzer.analyze({
          lapId,
          referenceLapId,
          telemetryFrames,
          lapTime: lap.lapTime || 0,
        });

        // Persist suggestions back to the lap
        await prisma.lap.update({
          where: { id: lapId },
          data: {
            analyzed: true,
            suggestions: JSON.stringify(result.suggestions),
          },
        });

        return {
          success: true,
          data: {
            lapId,
            lapNumber: lap.lapNumber,
            lapTime: lap.lapTime,
            analyzer: result.metadata?.analyzer || analyzer.getName(),
            duration: result.metadata?.duration,
            suggestions: result.suggestions,
          },
          message: `Analysis complete: ${result.suggestions.length} suggestions generated using "${analyzer.getName()}" analyzer.`,
        };
      } catch (error) {
        return { success: false, message: `Analysis failed: ${String(error)}` };
      }
    },

    async getLapTelemetrySummary(args: Record<string, unknown>, ctx: AgentToolContext): Promise<AgentToolResult> {
      const lap = await prisma.lap.findFirst({
        where: { id: args.lapId as string, userId: ctx.userId },
        select: { id: true, lapNumber: true, lapTime: true, telemetryData: true },
      });
      if (!lap) return { success: false, message: 'Lap not found.' };

      let telemetryFrames: any[];
      try {
        telemetryFrames = JSON.parse(lap.telemetryData);
      } catch {
        return { success: false, message: 'Failed to parse telemetry data.' };
      }

      if (telemetryFrames.length === 0) {
        return { success: false, message: 'Lap has no telemetry frames.' };
      }

      const summary = analyzeTelemetryData(telemetryFrames);

      return {
        success: true,
        data: {
          lapId: lap.id,
          lapNumber: lap.lapNumber,
          lapTime: lap.lapTime,
          frameCount: telemetryFrames.length,
          summary,
        },
        message: `Lap ${lap.lapNumber}: ${summary.avgSpeed.toFixed(1)} km/h avg, ${summary.maxSpeed.toFixed(1)} km/h max, ${summary.brakingEvents.length} braking zones, ${summary.throttleApplication.fullThrottlePercent.toFixed(1)}% full throttle.`,
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
