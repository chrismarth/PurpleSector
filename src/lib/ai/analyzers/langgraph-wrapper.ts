/**
 * LangGraph Analyzer Wrapper
 * 
 * Wraps the LangGraph analyzer to implement the LapAnalyzer interface.
 */

import type { LapAnalyzer, AnalysisParams, AnalysisResult } from '../analyzer-interface';
import { LangGraphAnalyzer } from './langgraph-analyzer';

export class LangGraphAnalyzerWrapper implements LapAnalyzer {
  private analyzer: LangGraphAnalyzer;

  constructor() {
    this.analyzer = new LangGraphAnalyzer();
  }

  getName(): string {
    return 'langgraph';
  }

  async analyze(params: AnalysisParams): Promise<AnalysisResult> {
    const startTime = Date.now();

    const suggestions = await this.analyzer.analyze(
      params.lapId,
      params.referenceLapId
    );

    const duration = Date.now() - startTime;

    return {
      suggestions,
      metadata: {
        analyzer: 'langgraph',
        duration,
        model: process.env.LANGGRAPH_MODEL || 'gpt-4-turbo-preview',
      },
    };
  }
}
