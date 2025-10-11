/**
 * Simple Analyzer (Original Implementation)
 * 
 * This is the original simple analyzer that sends a summary to OpenAI.
 * Kept for backward compatibility and as a fast, cost-effective option.
 */

import type { LapAnalyzer, AnalysisParams, AnalysisResult } from '../analyzer-interface';
import { generateLapSuggestions, analyzeTelemetryData } from '../analysis';
import { prisma } from '@/lib/db';

export class SimpleAnalyzer implements LapAnalyzer {
  getName(): string {
    return 'simple';
  }

  async analyze(params: AnalysisParams): Promise<AnalysisResult> {
    const startTime = Date.now();

    // Prepare reference lap if provided
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

    // Use existing generateLapSuggestions function
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
