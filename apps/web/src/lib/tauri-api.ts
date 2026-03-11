/**
 * Tauri API Client
 * 
 * Provides a unified interface for calling Tauri commands from the Next.js app.
 * Detects if running in Tauri desktop mode and falls back gracefully.
 */

import { invoke } from '@tauri-apps/api/core';

/**
 * Check if running in Tauri desktop app
 */
export function isTauriApp(): boolean {
  if (typeof window === 'undefined') return false;
  return '__TAURI__' in window;
}

/**
 * Session record from Tauri database
 */
export interface TauriSession {
  id: number;
  user_id: string;
  event_id: number | null;
  status: string;
  started: number | null;
  ended: number | null;
  track: string | null;
  car: string | null;
  created_at: number;
  updated_at: number;
}

/**
 * Lap record from Tauri database
 */
export interface TauriLap {
  id: number;
  session_id: number;
  lap_number: number;
  lap_time: number | null;
  is_valid: boolean;
  created_at: number;
}

/**
 * Telemetry frame from Tauri database
 */
export interface TauriTelemetryFrame {
  timestamp: number;
  speed: number;
  throttle: number;
  brake: number;
  steering: number;
  gear: number;
  rpm: number;
  normalizedPosition: number;
  lapNumber: number;
  lapTime: number;
  sessionTime?: number;
  sessionType?: number;
  trackPosition?: number;
  delta?: number;
}

/**
 * Tauri Commands
 */
export const TauriAPI = {
  /**
   * Start a new telemetry session
   */
  async startSession(): Promise<number> {
    if (!isTauriApp()) {
      throw new Error('Not running in Tauri app');
    }
    return invoke<number>('start_session');
  },

  /**
   * End the active telemetry session
   */
  async endSession(): Promise<void> {
    if (!isTauriApp()) {
      throw new Error('Not running in Tauri app');
    }
    return invoke<void>('end_session');
  },

  /**
   * Get all sessions for the current user
   */
  async getSessions(): Promise<TauriSession[]> {
    if (!isTauriApp()) {
      throw new Error('Not running in Tauri app');
    }
    return invoke<TauriSession[]>('get_sessions');
  },

  /**
   * Get laps for a session
   */
  async getLaps(sessionId: number): Promise<TauriLap[]> {
    if (!isTauriApp()) {
      throw new Error('Not running in Tauri app');
    }
    return invoke<TauriLap[]>('get_laps', { sessionId });
  },

  /**
   * Get telemetry frames for a lap
   */
  async getLapFrames(lapId: number): Promise<TauriTelemetryFrame[]> {
    if (!isTauriApp()) {
      throw new Error('Not running in Tauri app');
    }
    return invoke<TauriTelemetryFrame[]>('get_lap_frames', { lapId });
  },

  /**
   * Get capture status
   */
  async getCaptureStatus(): Promise<{
    running: boolean;
    source_name: string;
    frames_captured: number;
  }> {
    if (!isTauriApp()) {
      throw new Error('Not running in Tauri app');
    }
    return invoke('get_capture_status');
  },
};

/**
 * Convert Tauri session to Prisma-compatible format for the UI
 */
export function convertTauriSession(tauriSession: TauriSession) {
  return {
    id: tauriSession.id.toString(),
    userId: tauriSession.user_id,
    eventId: tauriSession.event_id?.toString() || null,
    status: tauriSession.status as 'active' | 'completed' | 'archived',
    started: tauriSession.started ? new Date(tauriSession.started * 1000) : null,
    ended: tauriSession.ended ? new Date(tauriSession.ended * 1000) : null,
    track: tauriSession.track,
    car: tauriSession.car,
    createdAt: new Date(tauriSession.created_at * 1000),
    updatedAt: new Date(tauriSession.updated_at * 1000),
  };
}

/**
 * Convert Tauri lap to Prisma-compatible format for the UI
 */
export function convertTauriLap(tauriLap: TauriLap) {
  return {
    id: tauriLap.id.toString(),
    sessionId: tauriLap.session_id.toString(),
    lapNumber: tauriLap.lap_number,
    lapTime: tauriLap.lap_time,
    isValid: tauriLap.is_valid,
    createdAt: new Date(tauriLap.created_at * 1000),
  };
}
