// Core telemetry data types

import type { TelemetryFrame } from '@purplesector/web-telemetry';
export type { TelemetryFrame };

export interface LapSuggestion {
  id: string;
  type: 'braking' | 'throttle' | 'steering' | 'general';
  corner?: string;
  message: string;
  severity: 'info' | 'warning' | 'critical';
}

export interface LapData {
  lapNumber: number;
  lapTime: number | null; // seconds, null if incomplete
  frames: TelemetryFrame[];
}

export interface TelemetrySource {
  id: string;
  name: string;
  type: 'live' | 'demo';
  status: 'connected' | 'disconnected' | 'error';
}

export interface SessionStatus {
  id: string;
  name: string;
  source: TelemetrySource;
  status: 'active' | 'paused' | 'archived';
  currentLap: number;
  totalLaps: number;
  createdAt: Date;
}

export interface AnalyzedLap {
  id: string;
  sessionId: string;
  lapNumber: number;
  lapTime: number;
  telemetryData: LapData;
  analyzed: boolean;
  suggestions: LapSuggestion[];
  createdAt: Date;
}

