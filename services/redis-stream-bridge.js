/**
 * Redis Stream Bridge
 * 
 * Bridges RisingWave Redis sink (key-value) to Redis Streams for WebSocket server.
 * Polls the RisingWave sink keys and writes to Redis Streams.
 */

const { createClient } = require('redis');

const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';
const POLL_INTERVAL_MS = parseInt(process.env.POLL_INTERVAL_MS || '100', 10);

class RedisStreamBridge {
  constructor() {
    this.redis = null;
    this.lastValues = new Map(); // Track last seen values to detect changes
    this.running = false;
  }

  async start() {
    console.log('═══════════════════════════════════════════════════');
    console.log('  Redis Stream Bridge');
    console.log('═══════════════════════════════════════════════════');

    this.redis = createClient({ url: REDIS_URL });
    this.redis.on('error', (err) => console.error('Redis error:', err));
    await this.redis.connect();
    console.log(`✓ Connected to Redis at ${REDIS_URL}`);

    this.running = true;
    console.log('Starting polling loop...');
    this.poll();

    // Graceful shutdown
    process.on('SIGINT', () => this.shutdown());
    process.on('SIGTERM', () => this.shutdown());
  }

  async poll() {
    while (this.running) {
      try {
        // Get all keys matching RisingWave sink pattern
        const keys = await this.redis.keys('{"session_id":*,"user_id":*}');
        console.log(`Found ${keys.length} RisingWave keys`);
        
        for (const key of keys) {
          const value = await this.redis.get(key);
          if (!value) continue;

          // Check if value changed
          const lastValue = this.lastValues.get(key);
          if (lastValue === value) continue;

          this.lastValues.set(key, value);

          // Parse the key to extract user_id and session_id
          try {
            const keyObj = JSON.parse(key);
            const { user_id, session_id } = keyObj;
            
            // Parse the telemetry data
            const data = JSON.parse(value);
            
            // Write to Redis Stream
            const streamKey = `telemetry:${user_id}:${session_id}`;
            
            // Helper to safely convert to string
            const toStr = (val) => {
              if (val === null || val === undefined) return '';
              return String(val);
            };
            
            await this.redis.xAdd(streamKey, '*', {
              timestamp: toStr(data.ts),
              speed: toStr(data.speed),
              throttle: toStr(data.throttle),
              brake: toStr(data.brake),
              steering: toStr(data.steering),
              gear: toStr(data.gear),
              rpm: toStr(data.rpm),
              normalized_position: toStr(data.normalized_position),
              lap_number: toStr(data.lap_number),
              lap_time: toStr(data.lap_time),
              session_time: toStr(data.session_time),
              session_type: toStr(data.session_type),
              track_position: toStr(data.track_position),
              delta: toStr(data.delta),
            });
            console.log(`✓ Wrote to stream ${streamKey}`);
          } catch (err) {
            console.error(`Error processing key ${key}:`, err.message);
          }
        }
      } catch (err) {
        console.error('Poll error:', err.message);
      }

      await new Promise(resolve => setTimeout(resolve, POLL_INTERVAL_MS));
    }
  }

  async shutdown() {
    console.log('\nShutting down...');
    this.running = false;
    if (this.redis) {
      await this.redis.quit();
    }
    process.exit(0);
  }
}

// Start the bridge
const bridge = new RedisStreamBridge();
bridge.start().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
