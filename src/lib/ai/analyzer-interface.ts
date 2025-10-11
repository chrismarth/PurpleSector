/**
 * Analyzer Interface
 * 
 * Defines the contract that all lap analyzers must implement.
 * This allows for pluggable analyzer implementations.
 */

import type { LapSuggestion } from '@/types/telemetry';

export interface AnalysisParams {
  lapId: string;
  referenceLapId?: string;
  telemetryFrames: any[];
  lapTime: number;
}

export interface AnalysisResult {
  suggestions: LapSuggestion[];
  metadata?: {
    analyzer: string;
    duration?: number;
    [key: string]: any;
  };
}

export interface LapAnalyzer {
  /**
   * Analyze a lap and return suggestions
   */
  analyze(params: AnalysisParams): Promise<AnalysisResult>;

  /**
   * Get analyzer name/type
   */
  getName(): string;
}
