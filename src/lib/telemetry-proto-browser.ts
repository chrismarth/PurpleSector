/**
 * Browser-compatible Protocol Buffer encoder/decoder for telemetry messages
 * Uses compiled protobuf from proto/telemetry.proto
 */

import { purplesector } from '../proto/telemetry.js';
import type { TelemetryFrame } from '../types/telemetry';

const { WebSocketMessage, StatusMessage } = purplesector;
const MessageType = WebSocketMessage.MessageType;

export interface DecodedMessage {
  type: 'connected' | 'telemetry' | 'demo_complete' | 'pong' | 'unknown';
  data?: TelemetryFrame;
  message?: string;
  timestamp?: number;
}

/**
 * Decode a protobuf WebSocket message
 */
export function decodeMessage(data: ArrayBuffer | Uint8Array): DecodedMessage {
  try {
    const buffer = data instanceof ArrayBuffer ? new Uint8Array(data) : data;
    const decoded = WebSocketMessage.decode(buffer) as any;
    
    // Convert to friendly format
    switch (decoded.type) {
      case MessageType.CONNECTED:
        return {
          type: 'connected',
          message: decoded.status?.message,
          timestamp: decoded.status?.timestamp ? Number(decoded.status.timestamp) : Date.now(),
        };
      
      case MessageType.TELEMETRY:
        return {
          type: 'telemetry',
          data: convertTelemetryFrame(decoded.telemetry),
        };
      
      case MessageType.DEMO_COMPLETE:
        return {
          type: 'demo_complete',
          message: decoded.status?.message || 'Demo complete',
        };
      
      case MessageType.PONG:
        return {
          type: 'pong',
          timestamp: decoded.status?.timestamp ? Number(decoded.status.timestamp) : Date.now(),
        };
      
      default:
        return { type: 'unknown' };
    }
  } catch (error) {
    console.error('Error decoding protobuf message:', error);
    throw error;
  }
}

/**
 * Convert protobuf TelemetryFrame to TypeScript interface
 * Handles Long types from protobufjs
 */
function convertTelemetryFrame(frame: any): TelemetryFrame {
  return {
    timestamp: frame.timestamp ? Number(frame.timestamp) : Date.now(),
    speed: frame.speed || 0,
    throttle: frame.throttle || 0,
    brake: frame.brake || 0,
    steering: frame.steering || 0,
    gear: frame.gear || 0,
    rpm: frame.rpm || 0,
    normalizedPosition: frame.normalizedPosition || frame.normalized_position || 0,
    lapNumber: frame.lapNumber || frame.lap_number || 1,
    lapTime: frame.lapTime || frame.lap_time || 0,
  };
}

/**
 * Create a protobuf message to send to server
 */
export function createStartDemoMessage(): Uint8Array {
  const message = WebSocketMessage.create({
    type: MessageType.START_DEMO,
  });
  return WebSocketMessage.encode(message).finish();
}

export function createStopDemoMessage(): Uint8Array {
  const message = WebSocketMessage.create({
    type: MessageType.STOP_DEMO,
  });
  return WebSocketMessage.encode(message).finish();
}

export function createPingMessage(): Uint8Array {
  const message = WebSocketMessage.create({
    type: MessageType.PING,
  });
  return WebSocketMessage.encode(message).finish();
}
