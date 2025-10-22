/**
 * Protocol Buffer definitions for telemetry messages
 * Uses protobufjs runtime loading for flexibility
 */

const protobuf = require('protobufjs');
const path = require('path');

// Load proto file
const protoPath = path.join(__dirname, '../../proto/telemetry.proto');
let root = null;
let TelemetryFrame = null;
let WebSocketMessage = null;
let StatusMessage = null;
let DemoData = null;
let LapData = null;

/**
 * Initialize protobuf definitions
 */
async function init() {
  if (root) return; // Already initialized
  
  root = await protobuf.load(protoPath);
  TelemetryFrame = root.lookupType('purplesector.TelemetryFrame');
  WebSocketMessage = root.lookupType('purplesector.WebSocketMessage');
  StatusMessage = root.lookupType('purplesector.StatusMessage');
  DemoData = root.lookupType('purplesector.DemoData');
  LapData = root.lookupType('purplesector.LapData');
}

/**
 * Create a telemetry message
 * Normalizes field names from snake_case to camelCase for protobufjs
 */
function createTelemetryMessage(telemetryData) {
  if (!WebSocketMessage) {
    throw new Error('Protobuf not initialized. Call init() first.');
  }
  
  // Normalize field names - protobufjs uses camelCase
  const normalized = {
    timestamp: telemetryData.timestamp,
    speed: telemetryData.speed,
    throttle: telemetryData.throttle,
    brake: telemetryData.brake,
    steering: telemetryData.steering,
    gear: telemetryData.gear,
    rpm: telemetryData.rpm,
    normalizedPosition: telemetryData.normalizedPosition || telemetryData.normalized_position,
    lapNumber: telemetryData.lapNumber || telemetryData.lap_number,
    lapTime: telemetryData.lapTime || telemetryData.lap_time,
    sessionTime: telemetryData.sessionTime || telemetryData.session_time,
    sessionType: telemetryData.sessionType || telemetryData.session_type,
    trackPosition: telemetryData.trackPosition || telemetryData.track_position,
    delta: telemetryData.delta,
  };
  
  const message = WebSocketMessage.create({
    type: WebSocketMessage.MessageType.TELEMETRY,
    telemetry: normalized
  });
  
  return WebSocketMessage.encode(message).finish();
}

/**
 * Create a status message
 */
function createStatusMessage(type, message, timestamp = Date.now()) {
  if (!WebSocketMessage) {
    throw new Error('Protobuf not initialized. Call init() first.');
  }
  
  const statusMsg = StatusMessage.create({
    message,
    timestamp
  });
  
  const wsMessage = WebSocketMessage.create({
    type,
    status: statusMsg
  });
  
  return WebSocketMessage.encode(wsMessage).finish();
}

/**
 * Create a connected message
 */
function createConnectedMessage(message = 'Connected to Purple Sector telemetry server') {
  return createStatusMessage(WebSocketMessage.MessageType.CONNECTED, message);
}

/**
 * Create a demo complete message
 */
function createDemoCompleteMessage(message = 'All demo data sent') {
  return createStatusMessage(WebSocketMessage.MessageType.DEMO_COMPLETE, message);
}

/**
 * Create a pong message
 */
function createPongMessage() {
  return createStatusMessage(WebSocketMessage.MessageType.PONG, 'pong');
}

/**
 * Decode a WebSocket message
 */
function decodeMessage(buffer) {
  if (!WebSocketMessage) {
    throw new Error('Protobuf not initialized. Call init() first.');
  }
  
  return WebSocketMessage.decode(buffer);
}

/**
 * Check if buffer is protobuf (starts with valid protobuf field tag)
 * This is a heuristic check - protobuf messages start with field tags
 */
function isProtobuf(buffer) {
  if (!buffer || buffer.length < 2) return false;
  
  // Check first byte - should be a valid field tag (field number 1-15, wire type 0-5)
  const firstByte = buffer[0];
  const wireType = firstByte & 0x07;
  const fieldNumber = firstByte >> 3;
  
  // Valid wire types: 0 (varint), 1 (64-bit), 2 (length-delimited), 5 (32-bit)
  // Field number should be reasonable (1-15 for first byte)
  return wireType <= 5 && fieldNumber > 0 && fieldNumber <= 15;
}

module.exports = {
  init,
  createTelemetryMessage,
  createStatusMessage,
  createConnectedMessage,
  createDemoCompleteMessage,
  createPongMessage,
  decodeMessage,
  isProtobuf,
  get MessageType() {
    return WebSocketMessage ? WebSocketMessage.MessageType : null;
  },
  get TelemetryFrame() {
    return TelemetryFrame;
  },
  get WebSocketMessage() {
    return WebSocketMessage;
  }
};
