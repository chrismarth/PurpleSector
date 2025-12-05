/**
 * Assetto Corsa Competizione Hybrid Telemetry Collector
 * 
 * Combines ACC Broadcasting Protocol (UDP) with Shared Memory for complete telemetry:
 * - Broadcasting: Session state, lap data, position, delta
 * - Shared Memory: Throttle, brake, steering, RPM, detailed physics
 * 
 * Strategy: UDP packets (100ms) trigger shared memory reads for synchronized data
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
 * 
 * ### Requirements
 * - Windows OS (Shared Memory only works on Windows)
 * - ACC running on same machine as collector
 * - npm package: acc-node-wrapper
 */

const dgram = require('dgram');
const WebSocket = require('ws');
const ACCNodeWrapper = require('acc-node-wrapper');
const proto = require('@purplesector/proto');

// Configuration
const UDP_PORT = process.env.ACC_UDP_PORT || 9000;
const UDP_HOST = process.env.ACC_UDP_HOST || '0.0.0.0';
const WS_SERVER = process.env.WS_SERVER_URL || 'ws://localhost:8080';
const ACC_HOST = process.env.ACC_HOST || '127.0.0.1';
const ACC_PORT = process.env.ACC_BROADCAST_PORT || 9000;
const DISPLAY_NAME = 'PurpleSector';
const CONNECTION_PASSWORD = process.env.ACC_PASSWORD || '';
const UPDATE_INTERVAL = 100; // Request updates every 100ms (10Hz)

// ACC Broadcasting Protocol Constants
const OutboundMessageTypes = {
  REGISTER_COMMAND_APPLICATION: 1,
  UNREGISTER_COMMAND_APPLICATION: 9,
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

// Create UDP socket for Broadcasting
const udpServer = dgram.createSocket('udp4');

// Create ACC Node Wrapper for Shared Memory
const accWrapper = new ACCNodeWrapper();

// Connection state
let isRegistered = false;
let connectionId = -1;
let focusedCarIndex = -1;
let latestRealtimeUpdate = null;

// Shared Memory state
let sharedMemoryInitialized = false;
let latestPhysicsData = null;
let latestGraphicsData = null;

// WebSocket connection to relay server
let wsClient = null;
let reconnectInterval = null;

// Initialize protobuf
let protobufReady = false;
proto.init().then(() => {
  protobufReady = true;
  console.log('✓ Protocol Buffers initialized');
}).catch(err => {
  console.error('Failed to initialize Protocol Buffers:', err);
  console.log('Falling back to JSON mode');
});

/**
 * Initialize Shared Memory access
 */
function initSharedMemory() {
  try {
    console.log('Initializing ACC Shared Memory...');
    
    // Initialize with update intervals (ms)
    // We don't need high-frequency polling since we read on-demand
    accWrapper.initSharedMemory(
      1000, // Physics update interval (we read on-demand anyway)
      1000, // Graphics update interval
      5000, // Static update interval
      false // Disable logging
    );
    
    // Listen for physics updates (for monitoring)
    accWrapper.on('M_PHYSICS_RESULT', (data) => {
      latestPhysicsData = data;
    });
    
    // Listen for graphics updates (for monitoring)
    accWrapper.on('M_GRAPHICS_RESULT', (data) => {
      latestGraphicsData = data;
    });
    
    sharedMemoryInitialized = true;
    console.log('✓ Shared Memory initialized');
  } catch (error) {
    console.error('Failed to initialize Shared Memory:', error.message);
    console.error('Note: Shared Memory only works on Windows with ACC running');
  }
}

/**
 * Read current shared memory data (on-demand)
 */
function readSharedMemory() {
  if (!sharedMemoryInitialized || !latestPhysicsData) {
    return null;
  }
  
  return {
    physics: latestPhysicsData,
    graphics: latestGraphicsData,
  };
}

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
  console.log('Sending registration request to ACC Broadcasting...');
  
  const displayNameBytes = Buffer.byteLength(DISPLAY_NAME, 'utf16le');
  const passwordBytes = Buffer.byteLength(CONNECTION_PASSWORD, 'utf16le');
  const bufferSize = 1 + 1 + 2 + displayNameBytes + 2 + passwordBytes + 4 + 2;
  
  const buffer = Buffer.allocUnsafe(bufferSize);
  let offset = 0;
  
  buffer.writeUInt8(OutboundMessageTypes.REGISTER_COMMAND_APPLICATION, offset);
  offset += 1;
  
  buffer.writeUInt8(4, offset); // Protocol version 4
  offset += 1;
  
  offset = writeString(buffer, offset, DISPLAY_NAME);
  offset = writeString(buffer, offset, CONNECTION_PASSWORD);
  
  buffer.writeInt32LE(UPDATE_INTERVAL, offset);
  offset += 4;
  
  buffer.writeUInt16LE(0, offset); // Empty command password
  
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
  let offset = 1;
  
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
  let offset = 1;
  
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
  
  return {
    eventIndex,
    sessionIndex,
    sessionType,
    phase,
    sessionTime,
    sessionEndTime,
    focusedCarIndex,
  };
}

/**
 * Parse real-time car update packet
 */
function parseRealtimeCarUpdate(buffer) {
  try {
    let offset = 1;
    
    const carIndex = buffer.readUInt16LE(offset);
    offset += 2;
    
    const driverIndex = buffer.readUInt16LE(offset);
    offset += 2;
    
    const driverCount = buffer.readUInt8(offset);
    offset += 1;
    
    const gear = buffer.readInt8(offset);
    offset += 1;
    
    // World position
    const worldPosX = buffer.readFloatLE(offset);
    offset += 4;
    const worldPosY = buffer.readFloatLE(offset);
    offset += 4;
    const worldPosZ = buffer.readFloatLE(offset);
    offset += 4;
    
    // Velocity
    const velocityX = buffer.readFloatLE(offset);
    offset += 4;
    const velocityY = buffer.readFloatLE(offset);
    offset += 4;
    const velocityZ = buffer.readFloatLE(offset);
    offset += 4;
    
    const speed = Math.sqrt(velocityX * velocityX + velocityY * velocityY + velocityZ * velocityZ) * 3.6;
    
    // Skip rotation (12 bytes)
    offset += 12;
    
    // Skip car damage (20 bytes)
    offset += 20;
    
    const currentLap = buffer.readUInt16LE(offset);
    offset += 2;
    
    const delta = buffer.readInt32LE(offset);
    offset += 4;
    
    const bestSessionLap = buffer.readInt32LE(offset);
    offset += 4;
    const lastLap = buffer.readInt32LE(offset);
    offset += 4;
    const currentLapTime = buffer.readInt32LE(offset);
    offset += 4;
    
    const laps = buffer.readUInt16LE(offset);
    offset += 2;
    
    const cupPosition = buffer.readUInt16LE(offset);
    offset += 2;
    
    const trackPosition = buffer.readUInt16LE(offset);
    offset += 2;
    
    const splinePosition = buffer.readFloatLE(offset);
    offset += 4;
    
    return {
      carIndex,
      gear,
      speed,
      currentLap,
      delta,
      bestSessionLap,
      lastLap,
      currentLapTime,
      laps,
      trackPosition,
      splinePosition,
    };
  } catch (error) {
    console.error('Error parsing car update:', error);
    return null;
  }
}

/**
 * Convert combined data to Purple Sector format
 */
function convertToTelemetryFormat(carUpdate, realtimeUpdate, sharedMemory) {
  if (!carUpdate) return null;
  
  // Base data from Broadcasting
  const telemetry = {
    timestamp: Date.now(),
    speed: carUpdate.speed,
    gear: carUpdate.gear,
    normalizedPosition: carUpdate.splinePosition,
    lapNumber: carUpdate.currentLap,
    lapTime: carUpdate.currentLapTime,
    sessionTime: realtimeUpdate ? realtimeUpdate.sessionTime : 0,
    sessionType: realtimeUpdate ? realtimeUpdate.sessionType : 0,
    trackPosition: carUpdate.trackPosition,
    delta: carUpdate.delta,
    
    // Default values if shared memory unavailable
    throttle: 0,
    brake: 0,
    steering: 0,
    rpm: 0,
  };
  
  // Enhance with Shared Memory data if available
  if (sharedMemory && sharedMemory.physics) {
    const physics = sharedMemory.physics;
    
    telemetry.throttle = Math.max(0, Math.min(1, physics.gas || 0));
    telemetry.brake = Math.max(0, Math.min(1, physics.brake || 0));
    telemetry.steering = Math.max(-1, Math.min(1, physics.steerAngle || 0));
    telemetry.rpm = physics.rpms || 0;
    
    // Additional physics data available but not in standard format
    // Can be added later: tire temps, pressures, suspension, etc.
  }
  
  return telemetry;
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
    try {
      if (protobufReady) {
        // Send as protobuf
        const buffer = proto.createTelemetryMessage(data);
        wsClient.send(buffer);
      } else {
        // Fallback to JSON
        wsClient.send(JSON.stringify({
          type: 'telemetry',
          data: data,
        }));
      }
    } catch (error) {
      console.error('Error sending telemetry:', error);
    }
  }
}

// UDP Server event handlers
udpServer.on('listening', () => {
  const address = udpServer.address();
  console.log('═══════════════════════════════════════════════════');
  console.log('  ACC Hybrid Telemetry Collector');
  console.log('  (Broadcasting + Shared Memory)');
  console.log('═══════════════════════════════════════════════════');
  console.log(`✓ UDP server listening on ${address.address}:${address.port}`);
  console.log('');
  console.log('Data sources:');
  console.log('  • Broadcasting: Session state, position, lap times');
  console.log('  • Shared Memory: Throttle, brake, steering, RPM');
  console.log('');
  console.log('Make sure ACC broadcasting is configured:');
  console.log('  File: Documents/Assetto Corsa Competizione/Config/broadcasting.json');
  console.log('  {');
  console.log(`    "updListenerPort": ${UDP_PORT}`);
  console.log('  }');
  console.log('═══════════════════════════════════════════════════');
  
  // Initialize shared memory
  initSharedMemory();
  
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
          console.log('✓ Successfully registered with ACC Broadcasting');
          console.log(`  Connection ID: ${connectionId}`);
          console.log(`  Update rate: ${UPDATE_INTERVAL}ms (${1000/UPDATE_INTERVAL}Hz)`);
        } else {
          console.error('✗ Registration failed:', result.errorMsg);
        }
        break;
      }
      
      case InboundMessageTypes.REALTIME_UPDATE: {
        const update = parseRealtimeUpdate(msg);
        latestRealtimeUpdate = update;
        focusedCarIndex = update.focusedCarIndex;
        
        if (!udpServer.receivedFirst) {
          console.log('✓ Receiving real-time updates from ACC');
          console.log(`  Source: ${rinfo.address}:${rinfo.port}`);
          console.log(`  Session: ${update.sessionType}, Phase: ${update.phase}`);
          
          if (sharedMemoryInitialized) {
            console.log('✓ Shared Memory active - full telemetry available');
          } else {
            console.log('⚠ Shared Memory unavailable - limited telemetry');
          }
          console.log('');
          udpServer.receivedFirst = true;
        }
        break;
      }
      
      case InboundMessageTypes.REALTIME_CAR_UPDATE: {
        const carUpdate = parseRealtimeCarUpdate(msg);
        
        if (carUpdate && carUpdate.carIndex === focusedCarIndex) {
          // Read current shared memory data (synchronized with UDP packet)
          const sharedMemory = readSharedMemory();
          
          // Merge both data sources
          const telemetry = convertToTelemetryFormat(carUpdate, latestRealtimeUpdate, sharedMemory);
          
          if (telemetry) {
            sendTelemetry(telemetry);
          }
        }
        break;
      }
      
      default:
        // Ignore other packet types
        break;
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
  console.log('\nShutting down ACC hybrid telemetry collector...');
  
  if (isRegistered) {
    sendUnregistration();
  }
  
  if (sharedMemoryInitialized) {
    try {
      accWrapper.disconnectSharedMemory();
      console.log('✓ Shared Memory disconnected');
    } catch (error) {
      console.error('Error disconnecting shared memory:', error.message);
    }
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
