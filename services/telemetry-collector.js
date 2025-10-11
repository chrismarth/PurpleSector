/**
 * Assetto Corsa Telemetry Collector
 * 
 * Listens for UDP packets from Assetto Corsa and forwards parsed telemetry
 * to the WebSocket server for distribution to connected clients.
 * 
 * Assetto Corsa UDP Format:
 * The game sends binary packets containing telemetry data at ~60Hz
 * This collector parses the binary format and converts to JSON
 */

const dgram = require('dgram');
const WebSocket = require('ws');

// Configuration
const UDP_PORT = process.env.TELEMETRY_UDP_PORT || 9996;
const UDP_HOST = process.env.TELEMETRY_UDP_HOST || '0.0.0.0';
const WS_SERVER = process.env.WS_SERVER_URL || 'ws://localhost:8080';

// Create UDP socket
const udpServer = dgram.createSocket('udp4');

// WebSocket connection to relay server
let wsClient = null;
let reconnectInterval = null;

/**
 * Parse Assetto Corsa UDP telemetry packet
 * 
 * Packet structure (simplified - actual AC packets are more complex):
 * Offset | Type    | Description
 * -------|---------|-------------
 * 0      | int32   | Identifier
 * 4      | int32   | Size
 * 8      | float32 | Speed (km/h)
 * 12     | float32 | Gas (0-1)
 * 16     | float32 | Brake (0-1)
 * 20     | float32 | Steering (-1 to 1)
 * 24     | int32   | Gear
 * 28     | int32   | RPM
 * 32     | float32 | Normalized position (0-1)
 * 36     | int32   | Lap count
 * 40     | int32   | Lap time (ms)
 * 
 * Note: This is a simplified parser. For production, you'd need to handle
 * the full AC UDP format which includes many more fields.
 */
function parseTelemetryPacket(buffer) {
  try {
    // Check minimum packet size
    if (buffer.length < 44) {
      console.warn('Packet too small:', buffer.length);
      return null;
    }

    const telemetry = {
      timestamp: Date.now(),
      speed: buffer.readFloatLE(8),
      throttle: Math.max(0, Math.min(1, buffer.readFloatLE(12))),
      brake: Math.max(0, Math.min(1, buffer.readFloatLE(16))),
      steering: Math.max(-1, Math.min(1, buffer.readFloatLE(20))),
      gear: buffer.readInt32LE(24),
      rpm: buffer.readInt32LE(28),
      normalizedPosition: Math.max(0, Math.min(1, buffer.readFloatLE(32))),
      lapNumber: buffer.readInt32LE(36),
      lapTime: buffer.readInt32LE(40),
    };

    return telemetry;
  } catch (error) {
    console.error('Error parsing telemetry packet:', error);
    return null;
  }
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

// UDP Server event handlers
udpServer.on('listening', () => {
  const address = udpServer.address();
  console.log('═══════════════════════════════════════════════════');
  console.log('  Assetto Corsa Telemetry Collector');
  console.log('═══════════════════════════════════════════════════');
  console.log(`✓ UDP server listening on ${address.address}:${address.port}`);
  console.log('');
  console.log('Waiting for telemetry data from Assetto Corsa...');
  console.log('');
  console.log('Make sure Assetto Corsa is configured to send UDP:');
  console.log('  File: Documents/Assetto Corsa/cfg/telemetry.ini');
  console.log('  [TELEMETRY]');
  console.log('  ENABLED=1');
  console.log(`  UDP_PORT=${UDP_PORT}`);
  console.log('  UDP_ADDRESS=127.0.0.1');
  console.log('═══════════════════════════════════════════════════');
});

udpServer.on('message', (msg, rinfo) => {
  const telemetry = parseTelemetryPacket(msg);
  
  if (telemetry) {
    // Log first packet to confirm connection
    if (!udpServer.receivedFirst) {
      console.log('✓ Receiving telemetry data from Assetto Corsa');
      console.log(`  Source: ${rinfo.address}:${rinfo.port}`);
      console.log('');
      udpServer.receivedFirst = true;
    }
    
    sendTelemetry(telemetry);
  }
});

udpServer.on('error', (err) => {
  console.error('UDP server error:', err);
  udpServer.close();
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\nShutting down telemetry collector...');
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
