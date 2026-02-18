/**
 * Agent tool definitions — pure metadata, no Node.js dependencies.
 * Safe to import from both client and server code.
 */

import type { AgentToolDefinition } from '@purplesector/plugin-api';

import { eventToolDefinitions } from '../server/tools/events';
import { sessionToolDefinitions } from '../server/tools/sessions';
import { lapToolDefinitions } from '../server/tools/laps';
import { vehicleToolDefinitions } from '../server/tools/vehicles';
import { analysisToolDefinitions } from '../server/tools/analysis';
import { runPlanToolDefinitions } from '../server/tools/runPlans';
import { systemToolDefinitions } from '../server/tools/system';

// Lap analysis tool definitions are inlined here rather than imported from
// ../server/tools/lapAnalysis.ts because that file imports from
// @purplesector/lap-analysis-base (Node.js-only). This file must stay
// safe for the client-side webpack bundle.
const lapAnalysisToolDefinitions: AgentToolDefinition[] = [
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

export const allToolDefinitions: AgentToolDefinition[] = [
  ...eventToolDefinitions,
  ...sessionToolDefinitions,
  ...lapToolDefinitions,
  ...vehicleToolDefinitions,
  ...lapAnalysisToolDefinitions,
  ...analysisToolDefinitions,
  ...runPlanToolDefinitions,
  ...systemToolDefinitions,
];
