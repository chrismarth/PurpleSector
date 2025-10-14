/**
 * Assetto Corsa Telemetry Collector
 * 
 * Listens for UDP packets from Assetto Corsa and forwards parsed telemetry
 * to the WebSocket server for distribution to connected clients.
 * 
 * Assetto Corsa UDP Format:
 * The game sends binary packets containing telemetry data at ~60Hz
 * This collector parses the binary format and converts to JSON
 * 
 * ### Configure AC
 * 
 * Edit `Documents/Assetto Corsa/cfg/telemetry.ini`:
 * 
 * ```ini
 * [TELEMETRY]
 * ENABLED=1
 * UDP_PORT=9996
 * UDP_ADDRESS=127.0.0.1
 * ```
 */

const dgram = require('dgram');
const WebSocket = require('ws');

// Configuration
const UDP_PORT = process.env.TELEMETRY_UDP_PORT || 9996;
const UDP_HOST = process.env.TELEMETRY_UDP_HOST || '0.0.0.0'; // Listen on all interfaces
const WS_SERVER = process.env.WS_SERVER_URL || 'ws://localhost:8080';
const AC_HOST = '192.168.8.119'; // Assetto Corsa machine IP for handshake

// Create UDP socket
const udpServer = dgram.createSocket('udp4');

// Manage handshake state
let handshakeCompleted = false;

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
 * 40     | int32   | Lap time (ms)
 * 52     | int32   | Lap count
 * 56     | float32 | Gas (0-1)
 * 60     | float32 | Brake (0-1)
 * 68     | int32   | RPM
 * 72     | float32 | Steering (-1 to 1)
 * 76     | int32   | Gear
 * 308     | float32 | Normalized position (0-1)
 *
 * TODO: Add more channels when appropriate
 *  
 */
function parseTelemetryPacket(buffer) {
  try {
    // Check minimum packet size
    if (buffer.length < 44) {
      console.warn('Packet too small:', buffer.length);
      return null;
    }

    // TODO: Eventually add more channels
    const telemetry = {
      timestamp: Date.now(),
      speed: buffer.readFloatLE(8),
      throttle: Math.max(0, Math.min(1, buffer.readFloatLE(56))),
      brake: Math.max(0, Math.min(1, buffer.readFloatLE(60))),
      steering: Math.max(-1, Math.min(1, buffer.readFloatLE(72))),
      gear: buffer.readInt32LE(76),
      rpm: buffer.readInt32LE(68),
      normalizedPosition: Math.max(0, Math.min(1, buffer.readFloatLE(308))),
      lapNumber: buffer.readInt32LE(52),
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

function sendHandshake(address, port) {
  const handshake = Buffer.allocUnsafe(12);
  handshake.writeInt32LE(0, 0);  // identifier at offset 0
  handshake.writeInt32LE(1, 4);  // version at offset 4
  handshake.writeInt32LE(0, 8);  // operationId at offset 8 (1 for SUBSCRIBE_UPDATE)
  udpServer.send(handshake, port, address);
}

function sendHandshakeComplete(address, port) {
  const handshakeComplete = Buffer.allocUnsafe(12);
  handshakeComplete.writeInt32LE(0, 0);  // identifier at offset 0
  handshakeComplete.writeInt32LE(1, 4);  // version at offset 4
  handshakeComplete.writeInt32LE(1, 8);  // operationId at offset 8 (1 for SUBSCRIBE_UPDATE)
  udpServer.send(handshakeComplete, port, address);
  handshakeCompleted = true;
}

function sendDismiss(address, port) {
  const dismiss = Buffer.allocUnsafe(12);
  dismiss.writeInt32LE(0, 0);  // identifier at offset 0
  dismiss.writeInt32LE(1, 4);  // version at offset 4
  dismiss.writeInt32LE(3, 8);  // operationId at offset 8 (3 for DISMISS)
  udpServer.send(dismiss, port, address);
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
  console.log('Sending handshake initiate to', AC_HOST, UDP_PORT);
  sendHandshake(AC_HOST, UDP_PORT);
});

udpServer.on('message', (msg, rinfo) => {
  if (!handshakeCompleted) {
      sendHandshakeComplete(rinfo.address, rinfo.port);
  } else {
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
  }
});

udpServer.on('error', (err) => {
  console.error('UDP server error:', err);
  console.log('Dismissing AC Subscription and shutting down telemetry collector...');
  sendDismiss(AC_HOST, UDP_PORT);
  handshakeInitiated = false;
  handshakeCompleted = false;
  udpServer.close();
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\nShutting down telemetry collector...');
  if (wsClient) {

    wsClient.close();
  }
  try {
    sendDismiss(AC_HOST, UDP_PORT);
    handshakeInitiated = false;
    handshakeCompleted = false;
    udpServer.close(() => {
      console.log('✓ UDP server closed');
      process.exit(0);
    });
  } catch (err) {
    process.exit(0);
  }
});

// Start services
connectWebSocket();
udpServer.bind(UDP_PORT, UDP_HOST);
