// Shared telemetry utilities for Purple Sector
import { create, all, MathNode } from 'mathjs';

export function msToSeconds(ms: number | null | undefined): number | null {
  if (ms == null) return null;
  return ms / 1000;
}

export function secondsToMs(seconds: number | null | undefined): number | null {
  if (seconds == null) return null;
  return seconds * 1000;
}

export type ChannelKind = 'raw' | 'math';

export interface TelemetryChannelBase {
  id: string;
  label: string;
  unit: string;
  kind: ChannelKind;
  isTimeAxis: boolean;
  defaultColor?: string;
}

export interface RawTelemetryChannel extends TelemetryChannelBase {
  kind: 'raw';
}

export interface MathChannelInput {
  channelId: string;
  alias: string;
}

export interface MathTelemetryChannel extends TelemetryChannelBase {
  kind: 'math';
  expression: string;
  inputs: MathChannelInput[];
  validated: boolean; // Whether the expression has been validated and is safe to evaluate
  comment?: string; // Optional description/documentation for the channel
}

export type TelemetryChannelDefinition = RawTelemetryChannel | MathTelemetryChannel;

export interface TelemetryChannelRegistry {
  getAll(): TelemetryChannelDefinition[];
  getById(id: string): TelemetryChannelDefinition | undefined;
}

// Math channel evaluation using mathjs

export type MathEvalScope = Record<string, number | null>;

export interface MathChannelEvaluator {
  compile(def: MathTelemetryChannel): (vars: MathEvalScope) => number | null;
  evaluateValue(def: MathTelemetryChannel, vars: MathEvalScope): number | null;
}

const math = create(all, {
  number: 'number',
  matrix: 'Array',
});

function validateMathAst(node: MathNode): void {
  // Disallow assignments, function definitions, and block statements
  if (node.type === 'AssignmentNode' ||
      node.type === 'FunctionAssignmentNode' ||
      node.type === 'BlockNode') {
    throw new Error(`Unsupported construct in expression: ${node.type}`);
  }

  // Recursively validate children
  // mathjs nodes expose forEach for traversal
  if ((node as any).forEach) {
    (node as any).forEach((child: MathNode) => validateMathAst(child));
  }
}

export const mathChannelEvaluator: MathChannelEvaluator = {
  compile(def: MathTelemetryChannel): (vars: MathEvalScope) => number | null {
    const ast = math.parse(def.expression);
    validateMathAst(ast);
    const compiled = ast.compile();

    return (vars: MathEvalScope): number | null => {
      const scope: Record<string, number> = {};

      for (const [key, value] of Object.entries(vars)) {
        if (value == null || !Number.isFinite(value)) {
          return null;
        }
        scope[key] = value;
      }

      const result = compiled.evaluate(scope);

      if (typeof result !== 'number' || !Number.isFinite(result)) {
        return null;
      }

      return result;
    };
  },

  evaluateValue(def: MathTelemetryChannel, vars: MathEvalScope): number | null {
    const fn = this.compile(def);
    return fn(vars);
  },
};

// In-memory raw channel definitions that are always available in Purple Sector
// telemetry (either via live stream or saved lap data).
export const RAW_CHANNELS: RawTelemetryChannel[] = [
  {
    id: 'time',
    label: 'Time',
    unit: 's',
    kind: 'raw',
    isTimeAxis: true,
    defaultColor: '#000000',
  },
  {
    id: 'normalizedPosition',
    label: 'Track Position',
    unit: '%',
    kind: 'raw',
    isTimeAxis: true,
    defaultColor: '#000000',
  },
  {
    id: 'throttle',
    label: 'Throttle',
    unit: '%',
    kind: 'raw',
    isTimeAxis: false,
    defaultColor: '#10b981',
  },
  {
    id: 'brake',
    label: 'Brake',
    unit: '%',
    kind: 'raw',
    isTimeAxis: false,
    defaultColor: '#ef4444',
  },
  {
    id: 'steering',
    label: 'Steering',
    unit: '%',
    kind: 'raw',
    isTimeAxis: false,
    defaultColor: '#8b5cf6',
  },
  {
    id: 'speed',
    label: 'Speed',
    unit: 'km/h',
    kind: 'raw',
    isTimeAxis: false,
    defaultColor: '#3b82f6',
  },
  {
    id: 'gear',
    label: 'Gear',
    unit: '',
    kind: 'raw',
    isTimeAxis: false,
    defaultColor: '#f59e0b',
  },
  {
    id: 'rpm',
    label: 'RPM',
    unit: 'rpm',
    kind: 'raw',
    isTimeAxis: false,
    defaultColor: '#ec4899',
  },
];

const rawById = new Map<string, RawTelemetryChannel>(
  RAW_CHANNELS.map((ch) => [ch.id, ch]),
);

export const rawChannelRegistry: TelemetryChannelRegistry = {
  getAll(): TelemetryChannelDefinition[] {
    return RAW_CHANNELS;
  },
  getById(id: string): TelemetryChannelDefinition | undefined {
    return rawById.get(id);
  },
};

// Simple time series type used for math channel evaluation helpers.
export interface TimeSeriesSample {
  t: number;
  v: number | null;
}

export type TimeSeries = TimeSeriesSample[];

// Export time series operations
export { derivative, integral } from './timeseries-ops';

// Evaluate a MathTelemetryChannel over a set of aligned input series. The
// keys of inputSeries are channelIds referenced by the math channel's inputs.
export function evaluateMathChannelSeries(
  def: MathTelemetryChannel,
  inputSeries: Record<string, TimeSeries>,
): TimeSeries {
  // Use the first input channel as the reference for time and length.
  const firstInput = def.inputs[0];
  const baseSeries = inputSeries[firstInput.channelId] ?? [];

  if (baseSeries.length === 0) {
    return [];
  }

  // Check if expression uses derivative(), integral(), or aggregate functions
  const usesDerivative = /\bderivative\s*\(/.test(def.expression);
  const usesIntegral = /\bintegral\s*\(/.test(def.expression);
  const usesMax = /\bmax\s*\(/.test(def.expression);
  const usesMin = /\bmin\s*\(/.test(def.expression);
  const usesMean = /\bmean\s*\(/.test(def.expression);
  const usesAggregates = usesMax || usesMin || usesMean;

  // Preprocess input series if derivative/integral/aggregates are used
  const processedSeries: Record<string, TimeSeries> = {};
  const aggregateVars: Record<string, number> = {};
  
  if (usesDerivative || usesIntegral || usesAggregates) {
    // Import the operations
    const { derivative: derivativeOp, integral: integralOp } = require('./timeseries-ops');
    
    for (const input of def.inputs) {
      const series = inputSeries[input.channelId];
      if (!series) continue;
      
      // Check if this specific variable is used in derivative/integral
      const derivativePattern = new RegExp(`\\bderivative\\s*\\(\\s*${input.alias}\\s*\\)`, 'g');
      const integralPattern = new RegExp(`\\bintegral\\s*\\(\\s*${input.alias}\\s*\\)`, 'g');
      const maxPattern = new RegExp(`\\bmax\\s*\\(\\s*${input.alias}\\s*\\)`, 'g');
      const minPattern = new RegExp(`\\bmin\\s*\\(\\s*${input.alias}\\s*\\)`, 'g');
      const meanPattern = new RegExp(`\\bmean\\s*\\(\\s*${input.alias}\\s*\\)`, 'g');
      
      if (derivativePattern.test(def.expression)) {
        processedSeries[`derivative_${input.alias}`] = derivativeOp(series);
      }
      if (integralPattern.test(def.expression)) {
        processedSeries[`integral_${input.alias}`] = integralOp(series);
      }
      
      // Calculate aggregates if needed
      if (maxPattern.test(def.expression)) {
        const values = series.map(s => s.v).filter((v): v is number => v !== null);
        aggregateVars[`max_${input.alias}`] = values.length > 0 ? Math.max(...values) : 0;
      }
      if (minPattern.test(def.expression)) {
        const values = series.map(s => s.v).filter((v): v is number => v !== null);
        aggregateVars[`min_${input.alias}`] = values.length > 0 ? Math.min(...values) : 0;
      }
      if (meanPattern.test(def.expression)) {
        const values = series.map(s => s.v).filter((v): v is number => v !== null);
        const sum = values.reduce((a, b) => a + b, 0);
        aggregateVars[`mean_${input.alias}`] = values.length > 0 ? sum / values.length : 0;
      }
      
      // Always include the original series
      processedSeries[input.alias] = series;
    }
    
    // Replace derivative(x), integral(x), and aggregate functions with preprocessed variable names
    let modifiedExpression = def.expression;
    for (const input of def.inputs) {
      modifiedExpression = modifiedExpression.replace(
        new RegExp(`\\bderivative\\s*\\(\\s*${input.alias}\\s*\\)`, 'g'),
        `derivative_${input.alias}`
      );
      modifiedExpression = modifiedExpression.replace(
        new RegExp(`\\bintegral\\s*\\(\\s*${input.alias}\\s*\\)`, 'g'),
        `integral_${input.alias}`
      );
      modifiedExpression = modifiedExpression.replace(
        new RegExp(`\\bmax\\s*\\(\\s*${input.alias}\\s*\\)`, 'g'),
        `max_${input.alias}`
      );
      modifiedExpression = modifiedExpression.replace(
        new RegExp(`\\bmin\\s*\\(\\s*${input.alias}\\s*\\)`, 'g'),
        `min_${input.alias}`
      );
      modifiedExpression = modifiedExpression.replace(
        new RegExp(`\\bmean\\s*\\(\\s*${input.alias}\\s*\\)`, 'g'),
        `mean_${input.alias}`
      );
    }
    
    // Create a modified definition with the transformed expression
    const modifiedDef = { ...def, expression: modifiedExpression };
    const compiled = mathChannelEvaluator.compile(modifiedDef);
    
    return baseSeries.map((sample, index) => {
      const vars: MathEvalScope = {};
      
      // Add time-series values
      for (const key in processedSeries) {
        const value = processedSeries[key]?.[index]?.v ?? null;
        vars[key] = value;
      }
      
      // Add aggregate constants
      for (const key in aggregateVars) {
        vars[key] = aggregateVars[key];
      }
      
      const v = compiled(vars);
      return { t: sample.t, v };
    });
  }

  // Standard evaluation without derivative/integral
  const compiled = mathChannelEvaluator.compile(def);

  return baseSeries.map((sample, index) => {
    const vars: MathEvalScope = {};

    for (const input of def.inputs) {
      const series = inputSeries[input.channelId];
      const value = series?.[index]?.v ?? null;
      vars[input.alias] = value;
    }

    const v = compiled(vars);
    return { t: sample.t, v };
  });
}

// Context for computing whether channels are actually available for a
// particular dataset/telemetry stream.
export interface ChannelAvailabilityContext {
  availableRawChannelIds: Set<string>;
}

export type ChannelWithAvailability = TelemetryChannelDefinition & {
  isAvailable: boolean;
};

export interface TelemetryChannelRegistryWithAvailability
  extends TelemetryChannelRegistry {
  getAllForContext(ctx: ChannelAvailabilityContext): ChannelWithAvailability[];
}

// Composite registry that merges static raw channels with dynamically-loaded
// math channels (e.g. from the database) and can report which channels are
// usable given the set of raw channels present for the current dataset.
export class CompositeChannelRegistry
  implements TelemetryChannelRegistryWithAvailability
{
  constructor(
    private readonly rawChannels: RawTelemetryChannel[],
    private readonly mathChannels: MathTelemetryChannel[],
  ) {}

  getAll(): TelemetryChannelDefinition[] {
    return [...this.rawChannels, ...this.mathChannels];
  }

  getById(id: string): TelemetryChannelDefinition | undefined {
    return (
      this.rawChannels.find((ch) => ch.id === id) ||
      this.mathChannels.find((ch) => ch.id === id)
    );
  }

  getAllForContext(ctx: ChannelAvailabilityContext): ChannelWithAvailability[] {
    const { availableRawChannelIds } = ctx;

    return this.getAll().map((ch) => {
      if (ch.kind === 'raw') {
        return {
          ...ch,
          isAvailable: availableRawChannelIds.has(ch.id),
        };
      }

      const allInputsPresent = ch.inputs.every((input) =>
        availableRawChannelIds.has(input.channelId),
      );

      return {
        ...ch,
        isAvailable: allInputsPresent,
      };
    });
  }
}
