/**
 * Analyzer factory package.
 *
 * Provides createAnalyzer and metadata helpers that select between
 * different analyzer implementations.
 */

import type { LapAnalyzer } from '@purplesector/analysis-base';
import { SimpleAnalyzer } from '@purplesector/analysis-simple';
import { LangGraphAnalyzerWrapper } from '@purplesector/analysis-langgraph';

export type AnalyzerType = 'simple' | 'langgraph' | 'custom';

export function createAnalyzer(type?: AnalyzerType): LapAnalyzer {
  const analyzerType = type || (process.env.ANALYZER_TYPE as AnalyzerType) || 'simple';

  console.log(`🔧 Creating analyzer: ${analyzerType}`);

  switch (analyzerType) {
    case 'simple':
      return new SimpleAnalyzer();

    case 'langgraph':
      return new LangGraphAnalyzerWrapper();

    case 'custom':
      throw new Error('Custom analyzers not yet implemented');

    default:
      console.warn(`Unknown analyzer type: ${analyzerType}, falling back to simple`);
      return new SimpleAnalyzer();
  }
}

export function getAvailableAnalyzers(): AnalyzerType[] {
  return ['simple', 'langgraph'];
}

export function getAnalyzerInfo(type: AnalyzerType): {
  name: string;
  description: string;
  speed: 'fast' | 'medium' | 'slow';
  cost: 'low' | 'medium' | 'high';
} {
  switch (type) {
    case 'simple':
      return {
        name: 'Simple Analyzer',
        description: 'Quick analysis with basic suggestions. One API call to OpenAI.',
        speed: 'fast',
        cost: 'low',
      };

    case 'langgraph':
      return {
        name: 'LangGraph Agentic Analyzer',
        description: 'Comprehensive analysis using agentic workflow. Explores data dynamically via MCP.',
        speed: 'medium',
        cost: 'medium',
      };

    case 'custom':
      return {
        name: 'Custom Analyzer',
        description: 'Third-party or custom analyzer implementation',
        speed: 'medium',
        cost: 'medium',
      };
  }
}
