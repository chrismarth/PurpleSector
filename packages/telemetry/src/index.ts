// Shared telemetry utilities for Purple Sector

export function msToSeconds(ms: number | null | undefined): number | null {
  if (ms == null) return null;
  return ms / 1000;
}

export function secondsToMs(seconds: number | null | undefined): number | null {
  if (seconds == null) return null;
  return seconds * 1000;
}
