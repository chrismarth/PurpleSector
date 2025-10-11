// Core telemetry data types

export interface TelemetryFrame {
  timestamp: number;
  throttle: number;    // 0.0 - 1.0
  brake: number;       // 0.0 - 1.0
  steering: number;    // -1.0 to 1.0 (left negative, right positive)
  speed: number;       // km/h
  gear: number;
  rpm: number;
  lapTime: number;     // milliseconds since lap start
  lapNumber: number;
  normalizedPosition: number; // 0.0 - 1.0 (position along track)
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

export interface LapSuggestion {
  id: string;
  type: 'braking' | 'throttle' | 'steering' | 'general';
  corner?: string;
  message: string;
  severity: 'info' | 'warning' | 'critical';
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

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  createdAt: Date;
}
