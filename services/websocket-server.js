/**
 * WebSocket Relay Server
 * 
 * Acts as a central hub for telemetry data:
 * - Receives telemetry from the collector service
 * - Broadcasts to all connected frontend clients
 * - Handles demo mode playback
 */

const WebSocket = require('ws');
const fs = require('fs');
const path = require('path');
const proto = require('../src/proto/telemetry-proto');

// Configuration
const WS_PORT = process.env.WS_PORT || 8080;

// Create WebSocket server
const wss = new WebSocket.Server({ port: WS_PORT });

// Initialize protobuf
let protobufReady = false;
proto.init().then(() => {
  protobufReady = true;
  console.log('✓ Protocol Buffers initialized');
}).catch(err => {
  console.error('Failed to initialize Protocol Buffers:', err);
  console.log('Falling back to JSON mode');
});

// Track connected clients with their demo state and protocol preference
const clients = new Map(); // Map<WebSocket, { interval, lapIndex, frameIndex, useProtobuf }>

// Demo data (shared, read-only)
let demoData = null;

/**
 * Load demo telemetry data
 */
function loadDemoData() {
  try {
    const demoPath = path.join(__dirname, '../public/demo-telemetry.json');
    if (fs.existsSync(demoPath)) {
      const rawData = fs.readFileSync(demoPath, 'utf8');
      const data = JSON.parse(rawData);
      
      // Handle new format with multiple laps
      if (data.laps && Array.isArray(data.laps)) {
        demoData = data;
        const totalFrames = data.laps.reduce((sum, lap) => sum + lap.frames.length, 0);
        console.log(`✓ Loaded demo data: ${data.laps.length} laps, ${totalFrames} total frames`);
      } else if (data.frames) {
        // Handle old format with single lap
        demoData = data;
        console.log(`✓ Loaded demo data: ${data.frames.length} frames`);
      } else {
        console.warn('⚠ Invalid demo data format');
        demoData = generateFallbackDemoData();
      }
    } else {
      console.warn('⚠ Demo telemetry file not found');
      demoData = generateFallbackDemoData();
    }
  } catch (error) {
    console.error('Error loading demo data:', error);
    demoData = generateFallbackDemoData();
  }
}

/**
 * Generate fallback demo data if file doesn't exist
 */
function generateFallbackDemoData() {
  const frames = [];
  const duration = 90000; // 90 second lap
  const frameRate = 60; // 60 Hz
  const totalFrames = (duration / 1000) * frameRate;

  for (let i = 0; i < totalFrames; i++) {
    const t = i / totalFrames;
    const lapTime = (i / frameRate) * 1000;

    frames.push({
      timestamp: Date.now() + lapTime,
      throttle: Math.max(0, Math.min(1, 0.5 + 0.5 * Math.sin(t * Math.PI * 8))),
      brake: Math.max(0, Math.min(1, t > 0.3 && t < 0.35 ? 0.8 : 0)),
      steering: Math.sin(t * Math.PI * 4) * 0.6,
      speed: 100 + 80 * Math.sin(t * Math.PI * 2),
      gear: Math.floor(2 + 4 * t),
      rpm: 4000 + 3000 * Math.sin(t * Math.PI * 6),
      normalizedPosition: t,
      lapNumber: 1,
      lapTime: lapTime,
    });
  }

  return { frames };
}

/**
 * Broadcast message to all connected clients
 * Automatically uses protobuf or JSON based on client preference
 */
function broadcast(message) {
  clients.forEach((clientState, client) => {
    if (client.readyState === WebSocket.OPEN) {
      sendToClient(client, message);
    }
  });
}

/**
 * Send message to a client using protobuf
 */
function sendToClient(client, message) {
  try {
    if (!protobufReady) {
      console.error('Protobuf not ready, cannot send message');
      return;
    }
    
    let buffer;
    
    if (message.type === 'telemetry') {
      buffer = proto.createTelemetryMessage(message.data);
    } else if (message.type === 'connected') {
      buffer = proto.createConnectedMessage(message.message);
    } else if (message.type === 'demo_complete') {
      buffer = proto.createDemoCompleteMessage(message.message);
    } else if (message.type === 'pong') {
      buffer = proto.createPongMessage();
    } else {
      console.error('Unknown message type:', message.type);
      return;
    }
    
    client.send(buffer);
  } catch (error) {
    console.error('Error sending message to client:', error);
  }
}

/**
 * Start demo mode playback for a specific client
 */
function startDemoMode(client) {
  if (!demoData) {
    loadDemoData();
  }

  // Stop any existing demo for this client
  stopDemoMode(client);

  console.log('Starting demo mode playback');
  
  // Handle new multi-lap format
  const laps = demoData.laps || [{ frames: demoData.frames, lapNumber: 1 }];
  const frameRate = 30; // 30 Hz (reduced from 60 to prevent connection issues)
  const intervalMs = 1000 / frameRate;

  // Initialize client state - just track position in data stream
  const clientState = clients.get(client) || {};
  clientState.frameIndex = 0; // Global frame index across all laps
  
  // Flatten all laps into a single continuous stream
  const allFrames = laps.flatMap(lap => lap.frames);
  console.log(`Demo mode: ${allFrames.length} total frames across ${laps.length} laps`);
  
  clientState.interval = setInterval(() => {
    // Check if client is still connected
    if (client.readyState !== WebSocket.OPEN) {
      stopDemoMode(client);
      return;
    }

    const state = clients.get(client);
    if (!state) return;

    // Check if we've reached the end of all frames
    if (state.frameIndex >= allFrames.length) {
      console.log('Demo playback completed - all frames sent');
      
      // Notify client that demo is complete
      if (client.readyState === WebSocket.OPEN) {
        sendToClient(client, {
          type: 'demo_complete',
          message: 'All demo data sent',
        });
      }
      
      stopDemoMode(client);
      return;
    }

    // Get the current frame from the continuous stream
    const frame = allFrames[state.frameIndex];
    
    // Send frame as-is, without modifying lapNumber
    // Client will detect lap changes based on lapTime resets
    const message = {
      type: 'telemetry',
      data: frame,
    };

    // Double-check client is still connected before sending
    if (client.readyState === WebSocket.OPEN) {
      try {
        sendToClient(client, message);
        state.frameIndex++;
      } catch (error) {
        console.error('Error sending telemetry frame:', error.message);
        stopDemoMode(client);
      }
    } else {
      // Client disconnected, stop demo
      stopDemoMode(client);
    }
  }, intervalMs);
  
  clients.set(client, clientState);
}

/**
 * Stop demo mode playback for a specific client (or all clients if no client specified)
 */
function stopDemoMode(client) {
  if (client) {
    // Stop demo for specific client
    const clientState = clients.get(client);
    if (clientState && clientState.interval) {
      clearInterval(clientState.interval);
      clientState.interval = null;
      clientState.frameIndex = 0;
      console.log('Demo mode stopped for client');
    }
  } else {
    // Stop demo for all clients
    clients.forEach((clientState, client) => {
      if (clientState.interval) {
        clearInterval(clientState.interval);
        clientState.interval = null;
        clientState.frameIndex = 0;
      }
    });
    console.log('Demo mode stopped for all clients');
  }
}

// WebSocket server event handlers
wss.on('listening', () => {
  console.log('═══════════════════════════════════════════════════');
  console.log('  WebSocket Relay Server');
  console.log('═══════════════════════════════════════════════════');
  console.log(`✓ Server listening on ws://localhost:${WS_PORT}`);
  console.log('');
  console.log('Ready to relay telemetry data');
  console.log('═══════════════════════════════════════════════════');
});

wss.on('connection', (ws, req) => {
  const clientId = `${req.socket.remoteAddress}:${req.socket.remotePort}`;
  console.log(`✓ Client connected: ${clientId}`);
  
  // Initialize client state - default to JSON until client specifies protocol
  clients.set(ws, {
    interval: null,
    lapIndex: 0,
    frameIndex: 0,
    useProtobuf: false,
  });

  // Send welcome message (protobuf)
  sendToClient(ws, {
    type: 'connected',
    message: 'Connected to Purple Sector telemetry server',
    timestamp: Date.now(),
  });

  // Handle incoming messages from clients
  ws.on('message', (message) => {
    try {
      let data;
      const clientState = clients.get(ws);
      
      // All messages should be protobuf
      if (!Buffer.isBuffer(message)) {
        console.error('Received non-buffer message, ignoring');
        return;
      }
      
      // Mark client as using protobuf
      if (!clientState.useProtobuf) {
        console.log(`Client ${clientId} using protobuf`);
        clientState.useProtobuf = true;
      }
      
      // Decode protobuf message
      const decoded = proto.decodeMessage(message);
      
      // Convert protobuf message to internal format
      switch (decoded.type) {
        case proto.MessageType.TELEMETRY:
          data = { type: 'telemetry', data: decoded.telemetry };
          break;
        case proto.MessageType.START_DEMO:
          data = { type: 'start_demo' };
          break;
        case proto.MessageType.STOP_DEMO:
          data = { type: 'stop_demo' };
          break;
        case proto.MessageType.PING:
          data = { type: 'ping' };
          break;
        default:
          console.warn('Unknown protobuf message type:', decoded.type);
          return;
      }
      
      switch (data.type) {
        case 'telemetry':
          // Relay telemetry from collector to all clients
          broadcast({
            type: 'telemetry',
            data: data.data,
          });
          break;

        case 'start_demo':
          // Start demo mode for this client
          startDemoMode(ws);
          break;

        case 'stop_demo':
          // Stop demo mode for this client
          stopDemoMode(ws);
          break;

        case 'ping':
          // Respond to ping
          sendToClient(ws, { type: 'pong', timestamp: Date.now() });
          break;

        default:
          console.warn('Unknown message type:', data.type);
      }
    } catch (error) {
      console.error('Error handling message:', error);
    }
  });

  ws.on('close', () => {
    console.log(`✗ Client disconnected: ${clientId}`);
    
    // Stop demo for this client and clean up
    stopDemoMode(ws);
    clients.delete(ws);
  });

  ws.on('error', (error) => {
    console.error(`Client error (${clientId}):`, error.message);
    // Stop demo on error to prevent further issues
    stopDemoMode(ws);
  });
});

wss.on('error', (error) => {
  console.error('WebSocket server error:', error);
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\nShutting down WebSocket server...');
  
  // Stop demo for all clients
  stopDemoMode();
  
  // Close all client connections
  clients.forEach((clientState, client) => {
    client.close();
  });
  
  wss.close(() => {
    console.log('✓ WebSocket server closed');
    process.exit(0);
  });
});

// Load demo data on startup
loadDemoData();
