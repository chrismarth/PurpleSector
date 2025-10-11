/**
 * Analyzer Factory
 * 
 * Creates the appropriate analyzer based on configuration.
 * This is the main integration point for switching between analyzers.
 */

import type { LapAnalyzer } from './analyzer-interface';
import { SimpleAnalyzer } from './analyzers/simple-analyzer';
import { LangGraphAnalyzerWrapper } from './analyzers/langgraph-wrapper';

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
      // Future: Load custom analyzer from plugin
      throw new Error('Custom analyzers not yet implemented');

    default:
      console.warn(`Unknown analyzer type: ${analyzerType}, falling back to simple`);
      return new SimpleAnalyzer();
  }
}

/**
 * Get list of available analyzers
 */
export function getAvailableAnalyzers(): AnalyzerType[] {
  return ['simple', 'langgraph'];
}

/**
 * Get analyzer metadata
 */
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
