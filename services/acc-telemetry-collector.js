/**
 * Assetto Corsa Competizione Telemetry Collector
 * 
 * Listens for UDP packets from Assetto Corsa Competizione and forwards parsed telemetry
 * to the WebSocket server for distribution to connected clients.
 * 
 * ACC UDP Format:
 * ACC uses a broadcasting system that sends multiple packet types:
 * - REGISTRATION (outbound): Request to receive data
 * - REGISTRATION_RESULT (inbound): Confirmation of registration
 * - REALTIME_UPDATE (inbound): Real-time telemetry data
 * - REALTIME_CAR_UPDATE (inbound): Car-specific telemetry
 * - ENTRY_LIST (inbound): List of cars in session
 * - TRACK_DATA (inbound): Track information
 * - BROADCASTING_EVENT (inbound): Session events
 * 
 * ### Configure ACC
 * 
 * Edit `Documents/Assetto Corsa Competizione/Config/broadcasting.json`:
 * 
 * ```json
 * {
 *   "updListenerPort": 9000,
 *   "connectionPassword": "",
 *   "commandPassword": ""
 * }
 * ```
 */

const dgram = require('dgram');
const WebSocket = require('ws');

// Configuration
const UDP_PORT = process.env.ACC_UDP_PORT || 9000;
const UDP_HOST = process.env.ACC_UDP_HOST || '0.0.0.0'; // Listen on all interfaces
const WS_SERVER = process.env.WS_SERVER_URL || 'ws://localhost:8080';
const ACC_HOST = process.env.ACC_HOST || '127.0.0.1'; // ACC game machine IP
const ACC_PORT = process.env.ACC_BROADCAST_PORT || 9000; // ACC broadcasting port
const DISPLAY_NAME = 'PurpleSector';
const CONNECTION_PASSWORD = process.env.ACC_PASSWORD || '';
const UPDATE_INTERVAL = 100; // Request updates every 100ms

// ACC Broadcasting Protocol Constants
const OutboundMessageTypes = {
  REGISTER_COMMAND_APPLICATION: 1,
  UNREGISTER_COMMAND_APPLICATION: 9,
  REQUEST_ENTRY_LIST: 10,
  REQUEST_TRACK_DATA: 11,
  CHANGE_HUD_PAGE: 49,
  CHANGE_FOCUS: 50,
  INSTANT_REPLAY_REQUEST: 51,
};

const InboundMessageTypes = {
  REGISTRATION_RESULT: 1,
  REALTIME_UPDATE: 2,
  REALTIME_CAR_UPDATE: 3,
  ENTRY_LIST: 4,
  TRACK_DATA: 5,
  ENTRY_LIST_CAR: 6,
  BROADCASTING_EVENT: 7,
};

// Create UDP socket
const udpServer = dgram.createSocket('udp4');

// Connection state
let isRegistered = false;
let connectionId = -1;
let focusedCarIndex = -1;

// WebSocket connection to relay server
let wsClient = null;
let reconnectInterval = null;

/**
 * Write string to buffer with length prefix (ACC protocol)
 */
function writeString(buffer, offset, str) {
  const length = str.length;
  buffer.writeUInt16LE(length, offset);
  buffer.write(str, offset + 2, length, 'utf16le');
  return offset + 2 + (length * 2);
}

/**
 * Read string from buffer with length prefix (ACC protocol)
 */
function readString(buffer, offset) {
  const length = buffer.readUInt16LE(offset);
  const str = buffer.toString('utf16le', offset + 2, offset + 2 + (length * 2));
  return { value: str, nextOffset: offset + 2 + (length * 2) };
}

/**
 * Send registration request to ACC
 */
function sendRegistration() {
  console.log('Sending registration request to ACC...');
  
  // Calculate buffer size
  const displayNameBytes = Buffer.byteLength(DISPLAY_NAME, 'utf16le');
  const passwordBytes = Buffer.byteLength(CONNECTION_PASSWORD, 'utf16le');
  const bufferSize = 1 + 1 + 2 + displayNameBytes + 2 + passwordBytes + 4 + 2;
  
  const buffer = Buffer.allocUnsafe(bufferSize);
  let offset = 0;
  
  // Message type
  buffer.writeUInt8(OutboundMessageTypes.REGISTER_COMMAND_APPLICATION, offset);
  offset += 1;
  
  // Protocol version (v4)
  buffer.writeUInt8(4, offset);
  offset += 1;
  
  // Display name
  offset = writeString(buffer, offset, DISPLAY_NAME);
  
  // Connection password
  offset = writeString(buffer, offset, CONNECTION_PASSWORD);
  
  // Update interval (ms)
  buffer.writeInt32LE(UPDATE_INTERVAL, offset);
  offset += 4;
  
  // Command password (empty string)
  buffer.writeUInt16LE(0, offset);
  
  udpServer.send(buffer, ACC_PORT, ACC_HOST, (err) => {
    if (err) {
      console.error('Error sending registration:', err);
    }
  });
}

/**
 * Send unregistration request to ACC
 */
function sendUnregistration() {
  if (connectionId < 0) return;
  
  console.log('Sending unregistration request to ACC...');
  
  const buffer = Buffer.allocUnsafe(5);
  buffer.writeUInt8(OutboundMessageTypes.UNREGISTER_COMMAND_APPLICATION, 0);
  buffer.writeInt32LE(connectionId, 1);
  
  udpServer.send(buffer, ACC_PORT, ACC_HOST, (err) => {
    if (err) {
      console.error('Error sending unregistration:', err);
    }
  });
}

/**
 * Parse registration result packet
 */
function parseRegistrationResult(buffer) {
  let offset = 1; // Skip message type
  
  connectionId = buffer.readInt32LE(offset);
  offset += 4;
  
  const success = buffer.readUInt8(offset) === 1;
  offset += 1;
  
  const isReadonly = buffer.readUInt8(offset) === 1;
  offset += 1;
  
  const { value: errorMsg } = readString(buffer, offset);
  
  return { connectionId, success, isReadonly, errorMsg };
}

/**
 * Parse real-time update packet
 */
function parseRealtimeUpdate(buffer) {
  let offset = 1; // Skip message type
  
  const eventIndex = buffer.readUInt16LE(offset);
  offset += 2;
  
  const sessionIndex = buffer.readUInt16LE(offset);
  offset += 2;
  
  const sessionType = buffer.readUInt8(offset);
  offset += 1;
  
  const phase = buffer.readUInt8(offset);
  offset += 1;
  
  const sessionTime = buffer.readFloatLE(offset);
  offset += 4;
  
  const sessionEndTime = buffer.readFloatLE(offset);
  offset += 4;
  
  const focusedCarIndex = buffer.readInt32LE(offset);
  offset += 4;
  
  const { value: activeCameraSet } = readString(buffer, offset);
  offset = readString(buffer, offset).nextOffset;
  
  const { value: activeCamera } = readString(buffer, offset);
  offset = readString(buffer, offset).nextOffset;
  
  const currentHudPage = buffer.length > offset ? readString(buffer, offset).value : '';
  
  return {
    eventIndex,
    sessionIndex,
    sessionType,
    phase,
    sessionTime,
    sessionEndTime,
    focusedCarIndex,
    activeCameraSet,
    activeCamera,
    currentHudPage,
  };
}

/**
 * Parse real-time car update packet
 */
function parseRealtimeCarUpdate(buffer) {
  try {
    let offset = 1; // Skip message type
    
    const carIndex = buffer.readUInt16LE(offset);
    offset += 2;
    
    const driverIndex = buffer.readUInt16LE(offset);
    offset += 2;
    
    const driverCount = buffer.readUInt8(offset);
    offset += 1;
    
    const gear = buffer.readInt8(offset);
    offset += 1;
    
    // World position (X, Y, Z)
    const worldPosX = buffer.readFloatLE(offset);
    offset += 4;
    const worldPosY = buffer.readFloatLE(offset);
    offset += 4;
    const worldPosZ = buffer.readFloatLE(offset);
    offset += 4;
    
    // Velocity (X, Y, Z)
    const velocityX = buffer.readFloatLE(offset);
    offset += 4;
    const velocityY = buffer.readFloatLE(offset);
    offset += 4;
    const velocityZ = buffer.readFloatLE(offset);
    offset += 4;
    
    // Calculate speed from velocity vector (km/h)
    const speed = Math.sqrt(velocityX * velocityX + velocityY * velocityY + velocityZ * velocityZ) * 3.6;
    
    // Rotation (Yaw, Pitch, Roll)
    const yaw = buffer.readFloatLE(offset);
    offset += 4;
    const pitch = buffer.readFloatLE(offset);
    offset += 4;
    const roll = buffer.readFloatLE(offset);
    offset += 4;
    
    // Car damage (normalized 0-1)
    const carDamage = [
      buffer.readFloatLE(offset),
      buffer.readFloatLE(offset + 4),
      buffer.readFloatLE(offset + 8),
      buffer.readFloatLE(offset + 12),
      buffer.readFloatLE(offset + 16),
    ];
    offset += 20;
    
    // Current lap
    const currentLap = buffer.readUInt16LE(offset);
    offset += 2;
    
    // Delta (ms)
    const delta = buffer.readInt32LE(offset);
    offset += 4;
    
    // Lap times
    const bestSessionLap = buffer.readInt32LE(offset);
    offset += 4;
    const lastLap = buffer.readInt32LE(offset);
    offset += 4;
    const currentLapTime = buffer.readInt32LE(offset);
    offset += 4;
    
    // Laps
    const laps = buffer.readUInt16LE(offset);
    offset += 2;
    
    // Cup position
    const cupPosition = buffer.readUInt16LE(offset);
    offset += 2;
    
    // Track position
    const trackPosition = buffer.readUInt16LE(offset);
    offset += 2;
    
    // Spline position (normalized 0-1)
    const splinePosition = buffer.readFloatLE(offset);
    offset += 4;
    
    // Kmh (redundant but provided by ACC)
    const kmh = buffer.readUInt16LE(offset);
    offset += 2;
    
    return {
      carIndex,
      driverIndex,
      gear,
      speed,
      worldPos: { x: worldPosX, y: worldPosY, z: worldPosZ },
      velocity: { x: velocityX, y: velocityY, z: velocityZ },
      rotation: { yaw, pitch, roll },
      carDamage,
      currentLap,
      delta,
      bestSessionLap,
      lastLap,
      currentLapTime,
      laps,
      cupPosition,
      trackPosition,
      splinePosition,
      kmh,
    };
  } catch (error) {
    console.error('Error parsing car update:', error);
    return null;
  }
}

/**
 * Convert ACC telemetry to Purple Sector format
 */
function convertToTelemetryFormat(carUpdate, realtimeUpdate) {
  if (!carUpdate) return null;
  
  return {
    timestamp: Date.now(),
    speed: carUpdate.speed,
    throttle: 0, // Not available in broadcasting protocol
    brake: 0, // Not available in broadcasting protocol
    steering: 0, // Not available in broadcasting protocol
    gear: carUpdate.gear,
    rpm: 0, // Not available in broadcasting protocol
    normalizedPosition: carUpdate.splinePosition,
    lapNumber: carUpdate.currentLap,
    lapTime: carUpdate.currentLapTime,
    sessionTime: realtimeUpdate ? realtimeUpdate.sessionTime : 0,
    sessionType: realtimeUpdate ? realtimeUpdate.sessionType : 0,
    trackPosition: carUpdate.trackPosition,
    delta: carUpdate.delta,
  };
}

/**
 * Connect to WebSocket relay server
 */
function connectWebSocket() {
  console.log(`Connecting to WebSocket server at ${WS_SERVER}...`);
  
  wsClient = new WebSocket(WS_SERVER);

  wsClient.on('open', () => {
    console.log('✓ Connected to WebSocket server');
    if (reconnectInterval) {
      clearInterval(reconnectInterval);
      reconnectInterval = null;
    }
  });

  wsClient.on('error', (error) => {
    console.error('WebSocket error:', error.message);
  });

  wsClient.on('close', () => {
    console.log('WebSocket connection closed. Reconnecting...');
    wsClient = null;
    
    if (!reconnectInterval) {
      reconnectInterval = setInterval(() => {
        if (!wsClient || wsClient.readyState === WebSocket.CLOSED) {
          connectWebSocket();
        }
      }, 5000);
    }
  });
}

/**
 * Send telemetry data to WebSocket server
 */
function sendTelemetry(data) {
  if (wsClient && wsClient.readyState === WebSocket.OPEN) {
    wsClient.send(JSON.stringify({
      type: 'telemetry',
      data: data,
    }));
  }
}

// Store latest realtime update for context
let latestRealtimeUpdate = null;

// UDP Server event handlers
udpServer.on('listening', () => {
  const address = udpServer.address();
  console.log('═══════════════════════════════════════════════════');
  console.log('  Assetto Corsa Competizione Telemetry Collector');
  console.log('═══════════════════════════════════════════════════');
  console.log(`✓ UDP server listening on ${address.address}:${address.port}`);
  console.log('');
  console.log('Waiting for telemetry data from ACC...');
  console.log('');
  console.log('Make sure ACC broadcasting is configured:');
  console.log('  File: Documents/Assetto Corsa Competizione/Config/broadcasting.json');
  console.log('  {');
  console.log(`    "updListenerPort": ${UDP_PORT}`);
  console.log('  }');
  console.log('═══════════════════════════════════════════════════');
  
  // Send initial registration
  sendRegistration();
  
  // Retry registration every 5 seconds if not registered
  const registrationInterval = setInterval(() => {
    if (!isRegistered) {
      console.log('Not registered yet, retrying...');
      sendRegistration();
    } else {
      clearInterval(registrationInterval);
    }
  }, 5000);
});

udpServer.on('message', (msg, rinfo) => {
  try {
    const messageType = msg.readUInt8(0);
    
    switch (messageType) {
      case InboundMessageTypes.REGISTRATION_RESULT: {
        const result = parseRegistrationResult(msg);
        
        if (result.success) {
          isRegistered = true;
          connectionId = result.connectionId;
          console.log('✓ Successfully registered with ACC');
          console.log(`  Connection ID: ${connectionId}`);
          console.log(`  Read-only: ${result.isReadonly}`);
        } else {
          console.error('✗ Registration failed:', result.errorMsg);
        }
        break;
      }
      
      case InboundMessageTypes.REALTIME_UPDATE: {
        const update = parseRealtimeUpdate(msg);
        latestRealtimeUpdate = update;
        focusedCarIndex = update.focusedCarIndex;
        
        // Log first update
        if (!udpServer.receivedFirst) {
          console.log('✓ Receiving real-time updates from ACC');
          console.log(`  Source: ${rinfo.address}:${rinfo.port}`);
          console.log(`  Session: ${update.sessionType}, Phase: ${update.phase}`);
          console.log('');
          udpServer.receivedFirst = true;
        }
        break;
      }
      
      case InboundMessageTypes.REALTIME_CAR_UPDATE: {
        const carUpdate = parseRealtimeCarUpdate(msg);
        
        if (carUpdate && carUpdate.carIndex === focusedCarIndex) {
          const telemetry = convertToTelemetryFormat(carUpdate, latestRealtimeUpdate);
          if (telemetry) {
            sendTelemetry(telemetry);
          }
        }
        break;
      }
      
      case InboundMessageTypes.ENTRY_LIST:
      case InboundMessageTypes.ENTRY_LIST_CAR:
      case InboundMessageTypes.TRACK_DATA:
      case InboundMessageTypes.BROADCASTING_EVENT:
        // These message types can be handled if needed for additional features
        break;
      
      default:
        console.warn('Unknown message type:', messageType);
    }
  } catch (error) {
    console.error('Error processing message:', error);
  }
});

udpServer.on('error', (err) => {
  console.error('UDP server error:', err);
  if (isRegistered) {
    sendUnregistration();
  }
  udpServer.close();
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\nShutting down ACC telemetry collector...');
  
  if (isRegistered) {
    sendUnregistration();
  }
  
  if (wsClient) {
    wsClient.close();
  }
  
  udpServer.close(() => {
    console.log('✓ UDP server closed');
    process.exit(0);
  });
});

// Start services
connectWebSocket();
udpServer.bind(UDP_PORT, UDP_HOST);
