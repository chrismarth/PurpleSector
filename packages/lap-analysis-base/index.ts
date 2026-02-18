/**
 * Base analysis interfaces and core helpers for Purple Sector.
 *
 * This package defines the LapAnalyzer contract and shared analysis
 * helpers like analyzeTelemetryData and generateLapSuggestions.
 */

import OpenAI from 'openai';
import type { TelemetryFrame } from '@purplesector/core';
import { SimpleAnalyzer } from '@purplesector/lap-analysis-simple';
import { LangGraphAnalyzerWrapper } from '@purplesector/lap-analysis-langgraph';

// --- Interfaces (from analyzer-interface.ts) ---

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
  analyze(params: AnalysisParams): Promise<AnalysisResult>;
  getName(): string;
}

// --- Core summary + suggestions helpers (from analysis.ts) ---

export interface LapSuggestion {
  id: string;
  type: 'braking' | 'throttle' | 'steering' | 'general';
  corner?: string;
  message: string;
  severity: 'info' | 'warning' | 'critical';
}

export interface TelemetrySummary {
  lapTime: number;
  avgSpeed: number;
  maxSpeed: number;
  brakingEvents: BrakingEvent[];
  throttleApplication: ThrottleMetrics;
  steeringSmooth: number;
}

export interface BrakingEvent {
  position: number;
  intensity: number;
  duration: number;
}

export interface ThrottleMetrics {
  avgApplication: number;
  smoothness: number;
  fullThrottlePercent: number;
}

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export function analyzeTelemetryData(frames: TelemetryFrame[]): TelemetrySummary {
  if (frames.length === 0) {
    throw new Error('No telemetry frames to analyze');
  }

  const speeds = frames.map((f) => f.speed);
  const avgSpeed = speeds.reduce((a, b) => a + b, 0) / speeds.length;
  const maxSpeed = Math.max(...speeds);
  const lapTime = frames[frames.length - 1].lapTime / 1000;

  const brakingEvents: BrakingEvent[] = [];
  let inBraking = false;
  let brakingStart = 0;
  let brakingIntensity = 0;

  frames.forEach((frame, i) => {
    if (frame.brake > 0.3 && !inBraking) {
      inBraking = true;
      brakingStart = i;
      brakingIntensity = frame.brake;
    } else if (frame.brake < 0.1 && inBraking) {
      inBraking = false;
      const duration = (i - brakingStart) / 60;
      brakingEvents.push({
        position: frames[brakingStart].normalizedPosition,
        intensity: brakingIntensity,
        duration,
      });
    } else if (inBraking) {
      brakingIntensity = Math.max(brakingIntensity, frame.brake);
    }
  });

  const throttleValues = frames.map((f) => f.throttle);
  const avgThrottle = throttleValues.reduce((a, b) => a + b, 0) / throttleValues.length;
  const fullThrottleFrames = throttleValues.filter((t) => t > 0.95).length;
  const fullThrottlePercent = (fullThrottleFrames / frames.length) * 100;

  const throttleVariance =
    throttleValues.reduce((sum, val) => sum + Math.pow(val - avgThrottle, 2), 0) /
    throttleValues.length;
  const throttleSmoothness = 1 - Math.min(throttleVariance, 1);

  const steeringChanges = frames.slice(1).map((frame, i) =>
    Math.abs(frame.steering - frames[i].steering)
  );
  const avgSteeringChange =
    steeringChanges.reduce((a, b) => a + b, 0) / steeringChanges.length;
  const steeringSmooth = 1 - Math.min(avgSteeringChange * 10, 1);

  return {
    lapTime,
    avgSpeed,
    maxSpeed,
    brakingEvents,
    throttleApplication: {
      avgApplication: avgThrottle,
      smoothness: throttleSmoothness,
      fullThrottlePercent,
    },
    steeringSmooth,
  };
}

export async function generateLapSuggestions(
  frames: TelemetryFrame[],
  lapTime: number,
  referenceLap?: { lapTime: number; summary: TelemetrySummary }
): Promise<LapSuggestion[]> {
  try {
    const summary = analyzeTelemetryData(frames);

    const referenceContext = referenceLap
      ? `\nReference Lap (Fastest in Session):\n- Lap Time: ${referenceLap.lapTime.toFixed(3)} seconds (${((
          summary.lapTime - referenceLap.lapTime
        ) * 1000).toFixed(0)}ms slower)\n- Average Speed: ${referenceLap.summary.avgSpeed.toFixed(1)} km/h (${(
          summary.avgSpeed - referenceLap.summary.avgSpeed
        ).toFixed(1)} km/h difference)\n- Max Speed: ${referenceLap.summary.maxSpeed.toFixed(1)} km/h\n- Full Throttle: ${referenceLap.summary.throttleApplication.fullThrottlePercent.toFixed(
          1
        )}% of lap\n- Throttle Smoothness: ${(referenceLap.summary.throttleApplication.smoothness * 100).toFixed(
          1
        )}%\n- Steering Smoothness: ${(referenceLap.summary.steeringSmooth * 100).toFixed(1)}%\n\nKey Differences:\n- Time Gap: ${((
          summary.lapTime - referenceLap.lapTime
        ) * 1000).toFixed(0)}ms\n- Speed Difference: ${(summary.avgSpeed - referenceLap.summary.avgSpeed).toFixed(
          1
        )} km/h avg\n- Throttle Application: ${(
          summary.throttleApplication.fullThrottlePercent -
          referenceLap.summary.throttleApplication.fullThrottlePercent
        ).toFixed(1)}% difference\n`
      : '';

    const prompt = `You are an expert racing coach analyzing telemetry data from a racing simulator lap.

Current Lap Statistics:
- Lap Time: ${summary.lapTime.toFixed(3)} seconds
- Average Speed: ${summary.avgSpeed.toFixed(1)} km/h
- Max Speed: ${summary.maxSpeed.toFixed(1)} km/h
- Braking Events: ${summary.brakingEvents.length}
- Full Throttle: ${summary.throttleApplication.fullThrottlePercent.toFixed(1)}% of lap
- Throttle Smoothness: ${(summary.throttleApplication.smoothness * 100).toFixed(1)}%
- Steering Smoothness: ${(summary.steeringSmooth * 100).toFixed(1)}%

Key Braking Zones:
${summary.brakingEvents
  .slice(0, 5)
  .map(
    (event, i) =>
      `- Zone ${i + 1}: Position ${(event.position * 100).toFixed(1)}%, Intensity ${(
        event.intensity * 100
      ).toFixed(0)}%, Duration ${event.duration.toFixed(2)}s`
  )
  .join('\n')}
${referenceContext}

Based on this data, provide 3-5 specific, actionable suggestions to improve lap time. Focus on:
1. Braking points and technique
2. Throttle application timing and smoothness
3. Steering inputs and corner technique
4. Overall driving style improvements

Format your response as a JSON array of suggestions. Each suggestion should have:
- type: "braking" | "throttle" | "steering" | "general"
- corner: optional corner identifier (e.g., "Turn 1", "Turn 4")
- message: clear, actionable advice (1-2 sentences)
- severity: "info" | "warning" | "critical"`;

    const response = await openai.chat.completions.create({
      model: 'gpt-4-turbo-preview',
      messages: [
        {
          role: 'system',
          content:
            'You are an expert racing coach providing telemetry analysis. Always respond with valid JSON only.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      temperature: 0.7,
      max_tokens: 1000,
      response_format: { type: 'json_object' },
    });

    const content = response.choices[0].message.content;
    if (!content) {
      throw new Error('No response from AI');
    }

    const parsed = JSON.parse(content);
    const suggestions = Array.isArray(parsed) ? parsed : parsed.suggestions || [];

    return suggestions.map((s: any, i: number) => ({
      id: `suggestion-${i}`,
      type: s.type || 'general',
      corner: s.corner,
      message: s.message,
      severity: s.severity || 'info',
    }));
  } catch (error) {
    console.error('Error generating AI suggestions:', error);
    return [
      {
        id: 'fallback-1',
        type: 'general',
        message: 'AI analysis temporarily unavailable. Please try again later.',
        severity: 'info',
      },
    ];
  }
}

// ── Analyzer Factory ──
// (merged from the former @purplesector/lap-analysis-factory package)

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

// ── Chat ──

export async function chatAboutLap(
  messages: Array<{ role: 'user' | 'assistant'; content: string }>,
  telemetrySummary: TelemetrySummary,
  suggestions: LapSuggestion[],
  referenceLap?: { lapTime: number; summary: TelemetrySummary }
): Promise<string> {
  try {
    const referenceContext = referenceLap
      ? `\nReference Lap (Fastest in Session):\n- Lap Time: ${referenceLap.lapTime.toFixed(3)}s (${((
          telemetrySummary.lapTime - referenceLap.lapTime
        ) * 1000).toFixed(0)}ms gap)\n- Average Speed: ${referenceLap.summary.avgSpeed.toFixed(
          1
        )} km/h\n- Throttle Smoothness: ${(referenceLap.summary.throttleApplication.smoothness * 100).toFixed(
          1
        )}%\n`
      : '';

    const systemPrompt = `You are an expert racing coach helping a driver improve their lap times. You have access to their telemetry data and previous analysis.

Current Lap Summary:
- Lap Time: ${telemetrySummary.lapTime.toFixed(3)}s
- Average Speed: ${telemetrySummary.avgSpeed.toFixed(1)} km/h
- Throttle Smoothness: ${(telemetrySummary.throttleApplication.smoothness * 100).toFixed(1)}%
- Steering Smoothness: ${(telemetrySummary.steeringSmooth * 100).toFixed(1)}%
${referenceContext}
Previous Suggestions:
${suggestions.map((s) => `- ${s.message}`).join('\n')}

Provide specific, technical advice based on the data. Be concise and actionable.`;

    const response = await openai.chat.completions.create({
      model: 'gpt-4-turbo-preview',
      messages: [
        { role: 'system', content: systemPrompt },
        ...messages,
      ],
      temperature: 0.7,
      max_tokens: 500,
    });

    return (
      response.choices[0].message.content ||
      'I apologize, but I could not generate a response.'
    );
  } catch (error) {
    console.error('Error in chat:', error);
    return 'I apologize, but I encountered an error. Please try again.';
  }
}
