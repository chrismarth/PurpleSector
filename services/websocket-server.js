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

// Configuration
const WS_PORT = process.env.WS_PORT || 8080;

// Create WebSocket server
const wss = new WebSocket.Server({ port: WS_PORT });

// Track connected clients
const clients = new Set();

// Demo mode state
let demoInterval = null;
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
 */
function broadcast(message) {
  const data = typeof message === 'string' ? message : JSON.stringify(message);
  
  clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(data);
    }
  });
}

/**
 * Start demo mode playback
 */
function startDemoMode(client) {
  if (!demoData) {
    loadDemoData();
  }

  console.log('Starting demo mode playback');
  
  // Handle new multi-lap format
  const laps = demoData.laps || [{ frames: demoData.frames, lapNumber: 1 }];
  let currentLapIndex = 0;
  let frameIndex = 0;
  let currentLap = laps[currentLapIndex];
  const frameRate = 60; // 60 Hz
  const interval = 1000 / frameRate;

  demoInterval = setInterval(() => {
    if (frameIndex >= currentLap.frames.length) {
      // Move to next lap
      currentLapIndex = (currentLapIndex + 1) % laps.length;
      currentLap = laps[currentLapIndex];
      frameIndex = 0;
      console.log(`Demo lap ${currentLapIndex + 1} started (${currentLap.profile || 'Lap ' + currentLap.lapNumber})`);
    }

    const frame = currentLap.frames[frameIndex];
    
    // Send to requesting client or broadcast to all
    const message = JSON.stringify({
      type: 'telemetry',
      data: {
        ...frame,
        lapNumber: currentLapIndex + 1,
      },
    });

    if (client && client.readyState === WebSocket.OPEN) {
      client.send(message);
    } else {
      broadcast(message);
    }

    frameIndex++;
  }, interval);
}

/**
 * Stop demo mode playback
 */
function stopDemoMode() {
  if (demoInterval) {
    clearInterval(demoInterval);
    demoInterval = null;
    console.log('Demo mode stopped');
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
  
  clients.add(ws);

  // Send welcome message
  ws.send(JSON.stringify({
    type: 'connected',
    message: 'Connected to Purple Sector telemetry server',
    timestamp: Date.now(),
  }));

  // Handle incoming messages from clients
  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message.toString());
      
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
          // Stop demo mode
          stopDemoMode();
          break;

        case 'ping':
          // Respond to ping
          ws.send(JSON.stringify({ type: 'pong', timestamp: Date.now() }));
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
    clients.delete(ws);
    
    // Stop demo if no clients connected
    if (clients.size === 0) {
      stopDemoMode();
    }
  });

  ws.on('error', (error) => {
    console.error(`Client error (${clientId}):`, error.message);
  });
});

wss.on('error', (error) => {
  console.error('WebSocket server error:', error);
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\nShutting down WebSocket server...');
  
  stopDemoMode();
  
  // Close all client connections
  clients.forEach((client) => {
    client.close();
  });
  
  wss.close(() => {
    console.log('✓ WebSocket server closed');
    process.exit(0);
  });
});

// Load demo data on startup
loadDemoData();
