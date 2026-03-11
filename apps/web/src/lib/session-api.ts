/**
 * Session API Abstraction Layer
 * 
 * Provides a unified interface for session operations that works in both:
 * - Cloud mode: Uses Prisma + Redis
 * - Desktop mode: Uses Tauri commands + SQLite
 */

import { isTauriApp, TauriAPI, convertTauriSession, convertTauriLap } from './tauri-api';

export interface Session {
  id: string;
  userId: string;
  eventId: string | null;
  status: 'active' | 'completed' | 'archived';
  started: Date | null;
  ended: Date | null;
  track: string | null;
  car: string | null;
  createdAt: Date;
  updatedAt: Date;
  name?: string;
  source?: string;
  _count?: {
    laps: number;
  };
}

export interface Lap {
  id: string;
  sessionId: string;
  lapNumber: number;
  lapTime: number | null;
  isValid: boolean;
  createdAt: Date;
}

/**
 * Session API - works in both cloud and desktop modes
 */
export const SessionAPI = {
  /**
   * Get all sessions for the current user
   */
  async getSessions(): Promise<Session[]> {
    if (isTauriApp()) {
      // Desktop mode: use Tauri commands
      const tauriSessions = await TauriAPI.getSessions();
      return tauriSessions.map(convertTauriSession);
    } else {
      // Cloud mode: use Next.js API routes
      const response = await fetch('/api/sessions');
      if (!response.ok) {
        throw new Error('Failed to fetch sessions');
      }
      return response.json();
    }
  },

  /**
   * Create a new session
   */
  async createSession(data: {
    eventId?: string;
    name?: string;
    source?: string;
  }): Promise<Session> {
    if (isTauriApp()) {
      // Desktop mode: use Tauri command
      const sessionId = await TauriAPI.startSession();
      // Fetch the created session
      const sessions = await TauriAPI.getSessions();
      const session = sessions.find(s => s.id === sessionId);
      if (!session) {
        throw new Error('Failed to create session');
      }
      return convertTauriSession(session);
    } else {
      // Cloud mode: use Next.js API route
      const response = await fetch('/api/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        throw new Error('Failed to create session');
      }
      return response.json();
    }
  },

  /**
   * End a session
   */
  async endSession(sessionId: string): Promise<void> {
    if (isTauriApp()) {
      // Desktop mode: use Tauri command
      await TauriAPI.endSession();
    } else {
      // Cloud mode: use Next.js API route
      const response = await fetch(`/api/sessions/${sessionId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'completed' }),
      });
      if (!response.ok) {
        throw new Error('Failed to end session');
      }
    }
  },

  /**
   * Get laps for a session
   */
  async getLaps(sessionId: string): Promise<Lap[]> {
    if (isTauriApp()) {
      // Desktop mode: use Tauri command
      const tauriLaps = await TauriAPI.getLaps(parseInt(sessionId));
      return tauriLaps.map(convertTauriLap);
    } else {
      // Cloud mode: use Next.js API route
      const response = await fetch(`/api/sessions/${sessionId}/laps`);
      if (!response.ok) {
        throw new Error('Failed to fetch laps');
      }
      return response.json();
    }
  },

  /**
   * Get telemetry frames for a lap
   */
  async getLapFrames(lapId: string) {
    if (isTauriApp()) {
      // Desktop mode: use Tauri command
      return TauriAPI.getLapFrames(parseInt(lapId));
    } else {
      // Cloud mode: use Next.js API route
      const response = await fetch(`/api/laps/${lapId}/frames`);
      if (!response.ok) {
        throw new Error('Failed to fetch lap frames');
      }
      return response.json();
    }
  },
};
