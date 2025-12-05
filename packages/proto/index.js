/**
 * Shared protobuf helpers for telemetry messages.
 *
 * Implementation moved from apps/web/src/proto/telemetry-proto.js so that
 * collectors, services, and the web app can all depend on @purplesector/proto.
 */

const protobuf = require('protobufjs');
const path = require('path');

// Load proto file relative to this package
const protoPath = path.join(__dirname, './telemetry.proto');
let root = null;
let TelemetryFrame = null;
let WebSocketMessage = null;
let StatusMessage = null;
let DemoData = null;
let LapData = null;

async function init() {
  if (root) return; // Already initialized

  root = await protobuf.load(protoPath);
  TelemetryFrame = root.lookupType('purplesector.TelemetryFrame');
  WebSocketMessage = root.lookupType('purplesector.WebSocketMessage');
  StatusMessage = root.lookupType('purplesector.StatusMessage');
  DemoData = root.lookupType('purplesector.DemoData');
  LapData = root.lookupType('purplesector.LapData');
}

function createTelemetryMessage(telemetryData) {
  if (!WebSocketMessage) {
    throw new Error('Protobuf not initialized. Call init() first.');
  }

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
    telemetry: normalized,
  });

  return WebSocketMessage.encode(message).finish();
}

function createStatusMessage(type, message, timestamp = Date.now()) {
  if (!WebSocketMessage) {
    throw new Error('Protobuf not initialized. Call init() first.');
  }

  const statusMsg = StatusMessage.create({
    message,
    timestamp,
  });

  const wsMessage = WebSocketMessage.create({
    type,
    status: statusMsg,
  });

  return WebSocketMessage.encode(wsMessage).finish();
}

function createConnectedMessage(message = 'Connected to Purple Sector telemetry server') {
  return createStatusMessage(WebSocketMessage.MessageType.CONNECTED, message);
}

function createDemoCompleteMessage(message = 'All demo data sent') {
  return createStatusMessage(WebSocketMessage.MessageType.DEMO_COMPLETE, message);
}

function createPongMessage() {
  return createStatusMessage(WebSocketMessage.MessageType.PONG, 'pong');
}

function decodeMessage(buffer) {
  if (!WebSocketMessage) {
    throw new Error('Protobuf not initialized. Call init() first.');
  }

  return WebSocketMessage.decode(buffer);
}

function isProtobuf(buffer) {
  if (!buffer || buffer.length < 2) return false;

  const firstByte = buffer[0];
  const wireType = firstByte & 0x07;
  const fieldNumber = firstByte >> 3;

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
  },
};
