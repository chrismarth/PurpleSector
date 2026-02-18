import type { AgentToolDefinition, AgentToolHandler } from '@purplesector/plugin-api';

import { eventToolDefinitions, createEventToolHandlers } from './events';
import { sessionToolDefinitions, createSessionToolHandlers } from './sessions';
import { lapToolDefinitions, createLapToolHandlers } from './laps';
import { vehicleToolDefinitions, createVehicleToolHandlers } from './vehicles';
import { analysisToolDefinitions, createAnalysisToolHandlers } from './analysis';
import { runPlanToolDefinitions, createRunPlanToolHandlers } from './runPlans';
import { lapAnalysisToolDefinitions, createLapAnalysisToolHandlers } from './lapAnalysis';
import { systemToolDefinitions, createSystemToolHandlers } from './system';

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

export function createAllToolHandlers(prisma: any): Record<string, AgentToolHandler> {
  return {
    ...createEventToolHandlers(prisma),
    ...createSessionToolHandlers(prisma),
    ...createLapToolHandlers(prisma),
    ...createVehicleToolHandlers(prisma),
    ...createLapAnalysisToolHandlers(prisma),
    ...createAnalysisToolHandlers(prisma),
    ...createRunPlanToolHandlers(prisma),
    ...createSystemToolHandlers(prisma),
  };
}
