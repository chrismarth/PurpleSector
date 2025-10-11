/**
 * AI-powered lap analysis using OpenAI GPT-4
 */

import OpenAI from 'openai';
import { TelemetryFrame, LapSuggestion } from '@/types/telemetry';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

interface TelemetrySummary {
  lapTime: number;
  avgSpeed: number;
  maxSpeed: number;
  brakingEvents: BrakingEvent[];
  throttleApplication: ThrottleMetrics;
  steeringSmooth: number;
}

interface BrakingEvent {
  position: number;
  intensity: number;
  duration: number;
}

interface ThrottleMetrics {
  avgApplication: number;
  smoothness: number;
  fullThrottlePercent: number;
}

/**
 * Analyze telemetry frames and generate summary statistics
 */
export function analyzeTelemetryData(frames: TelemetryFrame[]): TelemetrySummary {
  if (frames.length === 0) {
    throw new Error('No telemetry frames to analyze');
  }

  // Calculate basic metrics
  const speeds = frames.map(f => f.speed);
  const avgSpeed = speeds.reduce((a, b) => a + b, 0) / speeds.length;
  const maxSpeed = Math.max(...speeds);
  const lapTime = frames[frames.length - 1].lapTime / 1000;

  // Detect braking events
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
      const duration = (i - brakingStart) / 60; // Assuming 60Hz
      brakingEvents.push({
        position: frames[brakingStart].normalizedPosition,
        intensity: brakingIntensity,
        duration,
      });
    } else if (inBraking) {
      brakingIntensity = Math.max(brakingIntensity, frame.brake);
    }
  });

  // Throttle metrics
  const throttleValues = frames.map(f => f.throttle);
  const avgThrottle = throttleValues.reduce((a, b) => a + b, 0) / throttleValues.length;
  const fullThrottleFrames = throttleValues.filter(t => t > 0.95).length;
  const fullThrottlePercent = (fullThrottleFrames / frames.length) * 100;

  // Calculate throttle smoothness (lower variance = smoother)
  const throttleVariance = throttleValues.reduce((sum, val) => {
    return sum + Math.pow(val - avgThrottle, 2);
  }, 0) / throttleValues.length;
  const throttleSmoothness = 1 - Math.min(throttleVariance, 1);

  // Steering smoothness
  const steeringChanges = frames.slice(1).map((frame, i) => 
    Math.abs(frame.steering - frames[i].steering)
  );
  const avgSteeringChange = steeringChanges.reduce((a, b) => a + b, 0) / steeringChanges.length;
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

/**
 * Generate AI-powered lap improvement suggestions
 */
export async function generateLapSuggestions(
  frames: TelemetryFrame[],
  lapTime: number,
  referenceLap?: { lapTime: number; summary: TelemetrySummary }
): Promise<LapSuggestion[]> {
  try {
    const summary = analyzeTelemetryData(frames);

    // Build reference lap context if available
    const referenceContext = referenceLap ? `
Reference Lap (Fastest in Session):
- Lap Time: ${referenceLap.lapTime.toFixed(3)} seconds (${((summary.lapTime - referenceLap.lapTime) * 1000).toFixed(0)}ms slower)
- Average Speed: ${referenceLap.summary.avgSpeed.toFixed(1)} km/h (${(summary.avgSpeed - referenceLap.summary.avgSpeed).toFixed(1)} km/h difference)
- Max Speed: ${referenceLap.summary.maxSpeed.toFixed(1)} km/h
- Full Throttle: ${referenceLap.summary.throttleApplication.fullThrottlePercent.toFixed(1)}% of lap
- Throttle Smoothness: ${(referenceLap.summary.throttleApplication.smoothness * 100).toFixed(1)}%
- Steering Smoothness: ${(referenceLap.summary.steeringSmooth * 100).toFixed(1)}%

Key Differences:
- Time Gap: ${((summary.lapTime - referenceLap.lapTime) * 1000).toFixed(0)}ms
- Speed Difference: ${(summary.avgSpeed - referenceLap.summary.avgSpeed).toFixed(1)} km/h avg
- Throttle Application: ${(summary.throttleApplication.fullThrottlePercent - referenceLap.summary.throttleApplication.fullThrottlePercent).toFixed(1)}% difference
` : '';

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
${summary.brakingEvents.slice(0, 5).map((event, i) => 
  `- Zone ${i + 1}: Position ${(event.position * 100).toFixed(1)}%, Intensity ${(event.intensity * 100).toFixed(0)}%, Duration ${event.duration.toFixed(2)}s`
).join('\n')}
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
- severity: "info" | "warning" | "critical"

Example:
[
  {
    "type": "braking",
    "corner": "Turn 1",
    "message": "Brake 10-15 meters later before Turn 1. Your current braking point is conservative and you're losing time on entry.",
    "severity": "warning"
  }
]`;

    const response = await openai.chat.completions.create({
      model: 'gpt-4-turbo-preview',
      messages: [
        {
          role: 'system',
          content: 'You are an expert racing coach providing telemetry analysis. Always respond with valid JSON only.',
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

    // Parse the response
    const parsed = JSON.parse(content);
    const suggestions = Array.isArray(parsed) ? parsed : parsed.suggestions || [];

    // Add IDs to suggestions
    return suggestions.map((s: any, i: number) => ({
      id: `suggestion-${i}`,
      type: s.type || 'general',
      corner: s.corner,
      message: s.message,
      severity: s.severity || 'info',
    }));

  } catch (error) {
    console.error('Error generating AI suggestions:', error);
    
    // Return fallback suggestions if AI fails
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

/**
 * Handle chat interaction about lap performance
 */
export async function chatAboutLap(
  messages: Array<{ role: 'user' | 'assistant'; content: string }>,
  telemetrySummary: TelemetrySummary,
  suggestions: LapSuggestion[],
  referenceLap?: { lapTime: number; summary: TelemetrySummary }
): Promise<string> {
  try {
    const referenceContext = referenceLap ? `
Reference Lap (Fastest in Session):
- Lap Time: ${referenceLap.lapTime.toFixed(3)}s (${((telemetrySummary.lapTime - referenceLap.lapTime) * 1000).toFixed(0)}ms gap)
- Average Speed: ${referenceLap.summary.avgSpeed.toFixed(1)} km/h
- Throttle Smoothness: ${(referenceLap.summary.throttleApplication.smoothness * 100).toFixed(1)}%
` : '';

    const systemPrompt = `You are an expert racing coach helping a driver improve their lap times. You have access to their telemetry data and previous analysis.

Current Lap Summary:
- Lap Time: ${telemetrySummary.lapTime.toFixed(3)}s
- Average Speed: ${telemetrySummary.avgSpeed.toFixed(1)} km/h
- Throttle Smoothness: ${(telemetrySummary.throttleApplication.smoothness * 100).toFixed(1)}%
- Steering Smoothness: ${(telemetrySummary.steeringSmooth * 100).toFixed(1)}%
${referenceContext}
Previous Suggestions:
${suggestions.map(s => `- ${s.message}`).join('\n')}

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

    return response.choices[0].message.content || 'I apologize, but I could not generate a response.';

  } catch (error) {
    console.error('Error in chat:', error);
    return 'I apologize, but I encountered an error. Please try again.';
  }
}
