// Core shared exports for Purple Sector

export type TelemetryFrame = {
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
};
