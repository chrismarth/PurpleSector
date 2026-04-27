// Utility functions

import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatLapTime(seconds: number | null | undefined): string {
  if (seconds === null || seconds === undefined || isNaN(seconds)) return '--:--.---';
  
  const minutes = Math.floor(seconds / 60);
  const secs = seconds % 60;
  
  return `${minutes}:${secs.toFixed(3).padStart(6, '0')}`;
}

export function formatTimestamp(date: Date): string {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

export function normalizeTelemetryFrames(frames: any[]): any[] {
  if (frames.length === 0) return frames;
  
  // Normalize lapTime so the first frame starts at 0
  // This handles cases where lapTime is cumulative across laps
  const firstFrameTime = frames[0].lapTime;
  
  return frames.map(frame => ({
    ...frame,
    lapTime: frame.lapTime - firstFrameTime,
  }));
}

export function calculateLapTime(frames: any[]): number | null {
  if (frames.length === 0) return null;
  
  // Calculate lap time as the difference between last and first frame
  // This handles cases where lapTime is cumulative across laps
  const firstFrame = frames[0];
  const lastFrame = frames[frames.length - 1];
  const lapTimeMs = lastFrame.lapTime - firstFrame.lapTime;
  
  return lapTimeMs / 1000; // Convert ms to seconds
}
