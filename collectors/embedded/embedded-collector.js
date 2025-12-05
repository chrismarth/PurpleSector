/**
 * Embedded Telemetry Collector
 *
 * Runs on the same machine as the Purple Sector desktop app
 * and writes telemetry directly to the local database via Prisma.
 *
 * Supported sources (for now):
 * - "ac"  / "assetto-corsa" (default)
 * - "acc" / "assetto-corsa-competizione" (stubbed)
 *
 * Usage:
 *   EMBEDDED_SOURCE=ac node services/embedded-collector.js
 *   EMBEDDED_SOURCE=acc node services/embedded-collector.js
 *   node services/embedded-collector.js ac
 */

const dgram = require('dgram');
const { PrismaClient } = require('@prisma/client');

// --- Configuration ---------------------------------------------------------

const SOURCE_RAW =
  process.env.EMBEDDED_SOURCE || process.argv[2] || 'assetto-corsa';
const SOURCE = normalizeSource(SOURCE_RAW);

const UDP_PORT = process.env.TELEMETRY_UDP_PORT || 9996;
const UDP_HOST = process.env.TELEMETRY_UDP_HOST || '0.0.0.0';

// AC handshake target (same machine by default)
const AC_HOST = process.env.AC_HOST || '127.0.0.1';

// Database
const prisma = new PrismaClient();

// Lap buffering
let currentSession = null; // { id, eventId }
let currentLapNumber = 0;
let currentLapFrames = [];

// --- Helpers ---------------------------------------------------------------

function normalizeSource(value) {
  if (!value) return 'ac';
  const v = String(value).toLowerCase();
  if (['ac', 'assetto', 'assetto-corsa'].includes(v)) return 'ac';
  if (['acc', 'assetto-corsa-competizione'].includes(v)) return 'acc';
  return 'ac';
}

async function ensureEmbeddedEventAndSession() {
  // Single Event/Session used for embedded collection for now.
  const eventName = 'Embedded Telemetry Event';
  const sessionName = `Embedded Session (${SOURCE.toUpperCase()})`;

  let event = await prisma.event.findFirst({
    where: { name: eventName },
  });

  if (!event) {
    event = await prisma.event.create({
      data: {
        name: eventName,
        description: 'Local embedded telemetry collection',
        location: 'Local',
      },
    });
  }

  let session = await prisma.session.findFirst({
    where: {
      eventId: event.id,
      name: sessionName,
      status: 'active',
    },
  });

  if (!session) {
    session = await prisma.session.create({
      data: {
        eventId: event.id,
        name: sessionName,
        source: 'live',
        status: 'active',
        started: true,
      },
    });
  }

  currentSession = { id: session.id, eventId: event.id };
  return currentSession;
}

async function flushLap(sessionId, lapNumber, frames) {
  if (!frames || frames.length === 0 || !lapNumber || !sessionId) return;

  const first = frames[0];
  const last = frames[frames.length - 1];

  const lapTimeMs =
    typeof last.lapTime === 'number' && last.lapTime > 0
      ? last.lapTime
      : (last.timestamp || Date.now()) - (first.timestamp || Date.now());

  const telemetryData = JSON.stringify(frames);

  await prisma.lap.create({
    data: {
      sessionId,
      lapNumber,
      lapTime: lapTimeMs / 1000.0, // store in seconds
      telemetryData,
    },
  });

  console.log(
    `✓ Saved lap ${lapNumber} with ${frames.length} frames for session ${sessionId}`,
  );
}

// --- Assetto Corsa (AC) implementation ------------------------------------

function createAcCollector() {
  const udpServer = dgram.createSocket('udp4');
  let handshakeCompleted = false;

  function sendHandshake(address, port) {
    const handshake = Buffer.allocUnsafe(12);
    handshake.writeInt32LE(0, 0); // identifier
    handshake.writeInt32LE(1, 4); // version
    handshake.writeInt32LE(0, 8); // operationId (0 = INIT)
    udpServer.send(handshake, port, address);
  }

  function sendHandshakeComplete(address, port) {
    const msg = Buffer.allocUnsafe(12);
    msg.writeInt32LE(0, 0);
    msg.writeInt32LE(1, 4);
    msg.writeInt32LE(1, 8); // operationId (1 = SUBSCRIBE_UPDATE)
    udpServer.send(msg, port, address);
    handshakeCompleted = true;
  }

  function sendDismiss(address, port) {
    const dismiss = Buffer.allocUnsafe(12);
    dismiss.writeInt32LE(0, 0);
    dismiss.writeInt32LE(1, 4);
    dismiss.writeInt32LE(3, 8); // operationId (3 = DISMISS)
    udpServer.send(dismiss, port, address);
  }

  function parseTelemetryPacket(buffer) {
    try {
      if (buffer.length < 44) {
        return null;
      }

      const telemetry = {
        timestamp: Date.now(),
        speed: buffer.readFloatLE(8),
        throttle: clamp01(buffer.readFloatLE(56)),
        brake: clamp01(buffer.readFloatLE(60)),
        steering: clamp(buffer.readFloatLE(72), -1, 1),
        gear: buffer.readInt32LE(76),
        rpm: buffer.readInt32LE(68),
        normalizedPosition: clamp01(buffer.readFloatLE(308)),
        lapNumber: buffer.readInt32LE(52),
        lapTime: buffer.readInt32LE(40),
      };

      return telemetry;
    } catch (err) {
      console.error('Error parsing AC telemetry packet:', err);
      return null;
    }
  }

  function clamp01(v) {
    return Math.max(0, Math.min(1, v));
  }

  function clamp(v, min, max) {
    return Math.max(min, Math.min(max, v));
  }

  udpServer.on('listening', () => {
    const address = udpServer.address();
    console.log('═══════════════════════════════════════════════════');
    console.log('  Embedded Assetto Corsa Telemetry Collector');
    console.log('═══════════════════════════════════════════════════');
    console.log(`✓ UDP server listening on ${address.address}:${address.port}`);
    console.log('Waiting for telemetry data from Assetto Corsa...');
    console.log('═══════════════════════════════════════════════════');

    console.log('Sending handshake initiate to', AC_HOST, UDP_PORT);
    sendHandshake(AC_HOST, UDP_PORT);
  });

  udpServer.on('message', async (msg, rinfo) => {
    try {
      if (!handshakeCompleted) {
        sendHandshakeComplete(rinfo.address, rinfo.port);
        return;
      }

      const telemetry = parseTelemetryPacket(msg);
      if (!telemetry) return;

      if (!currentSession) {
        await ensureEmbeddedEventAndSession();
      }

      const sessionId = currentSession.id;
      const lapNumber = telemetry.lapNumber || 0;

      // On first valid frame
      if (!udpServer.receivedFirst) {
        console.log('✓ Receiving telemetry data from Assetto Corsa');
        console.log(`  Source: ${rinfo.address}:${rinfo.port}`);
        udpServer.receivedFirst = true;
      }

      // If lap changed, flush previous lap
      if (lapNumber > currentLapNumber && currentLapNumber > 0) {
        const framesToFlush = currentLapFrames;
        currentLapFrames = [];
        await flushLap(sessionId, currentLapNumber, framesToFlush);
      }

      currentLapNumber = lapNumber;
      currentLapFrames.push(telemetry);
    } catch (err) {
      console.error('Error handling AC UDP message:', err);
    }
  });

  udpServer.on('error', (err) => {
    console.error('UDP server error:', err);
    try {
      sendDismiss(AC_HOST, UDP_PORT);
    } catch (_) {}
    udpServer.close();
  });

  process.on('SIGINT', async () => {
    console.log('\nShutting down embedded AC telemetry collector...');
    try {
      if (currentSession && currentLapFrames.length > 0 && currentLapNumber > 0) {
        await flushLap(currentSession.id, currentLapNumber, currentLapFrames);
      }
      sendDismiss(AC_HOST, UDP_PORT);
    } catch (_) {}
    udpServer.close(async () => {
      await prisma.$disconnect();
      console.log('✓ UDP server closed');
      process.exit(0);
    });
  });

  udpServer.bind(UDP_PORT, UDP_HOST);
}

// --- ACC stub --------------------------------------------------------------

function createAccCollectorStub() {
  console.log('Embedded ACC collector is not implemented yet.');
  console.log(
    'This process will exit. Set EMBEDDED_SOURCE=ac (or omit) to use Assetto Corsa.',
  );
  process.exit(1);
}

// --- Main ------------------------------------------------------------------

async function main() {
  console.log(`Starting embedded collector for source: ${SOURCE}`);

  await ensureEmbeddedEventAndSession();

  if (SOURCE === 'ac') {
    createAcCollector();
  } else if (SOURCE === 'acc') {
    createAccCollectorStub();
  } else {
    console.error(`Unsupported embedded source: ${SOURCE_RAW}`);
    process.exit(1);
  }
}

main().catch(async (err) => {
  console.error('Fatal error in embedded collector:', err);
  try {
    await prisma.$disconnect();
  } catch (_) {}
  process.exit(1);
});
