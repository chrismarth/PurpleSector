/**
 * Simple Analyzer package.
 *
 * Re-exports the SimpleAnalyzer implementation so consumers can depend
 * on @purplesector/lap-analysis-simple instead of app-local paths.
 */

import { prisma } from '@purplesector/db-prisma';
import {
  LapAnalyzer,
  AnalysisParams,
  AnalysisResult,
  analyzeTelemetryData,
  generateLapSuggestions,
} from '@purplesector/lap-analysis-base';

export class SimpleAnalyzer implements LapAnalyzer {
  getName(): string {
    return 'simple';
  }

  async analyze(params: AnalysisParams): Promise<AnalysisResult> {
    const startTime = Date.now();

    let referenceLap = undefined;
    if (params.referenceLapId) {
      try {
        const refLap = await prisma.lap.findUnique({
          where: { id: params.referenceLapId },
        });

        if (refLap) {
          const referenceTelemetry = JSON.parse(refLap.telemetryData);
          referenceLap = {
            lapTime: refLap.lapTime || 0,
            summary: analyzeTelemetryData(referenceTelemetry),
          };
        }
      } catch (error) {
        console.error('Failed to fetch reference lap:', error);
      }
    }

    const suggestions = await generateLapSuggestions(
      params.telemetryFrames,
      params.lapTime,
      referenceLap
    );

    const duration = Date.now() - startTime;

    return {
      suggestions,
      metadata: {
        analyzer: 'simple',
        duration,
      },
    };
  }
}
