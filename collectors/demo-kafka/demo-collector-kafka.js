/**
 * Demo Telemetry Collector (Kafka)
 * 
 * Publishes demo telemetry data to Kafka for testing the entire pipeline
 * without requiring a real game connection.
 * 
 * Features:
 * - Loads demo data from file
 * - Publishes at realistic frame rate (60 Hz)
 * - Supports multiple laps
 * - Loop playback
 * - Kafka producer with guaranteed delivery
 * - Protobuf serialization
 * 
 * Usage:
 *   npm run telemetry:demo-kafka
 *   npm run telemetry:demo-kafka -- --userId=alice --loop
 */

const fs = require('fs');
const path = require('path');
const { KafkaProducer, KafkaAdmin } = require('@purplesector/kafka');
const config = require('@purplesector/config');
const logger = require('@purplesector/logger').child({ service: 'demo-collector' });

class DemoCollector {
  constructor(options = {}) {
    // Configuration
    this.userId = options.userId || process.env.PS_USER_ID || 'demo-user';
    this.sessionId = options.sessionId || `demo-session-${Date.now()}`;
    this.frameRate = options.frameRate || 60; // Hz
    this.loop = options.loop !== undefined ? options.loop : true;
    this.demoSource = String(options.demoSource || process.env.PS_DEMO_SOURCE || 'file')
      .trim()
      .toLowerCase();
    
    // Kafka producer and admin
    this.producer = null;
    this.kafkaAdmin = new KafkaAdmin();
    
    // Demo data
    this.demoData = null;
    this.currentLapIndex = 0;
    this.currentFrameIndex = 0;
    
    // Playback control
    this.playbackInterval = null;
    this.playing = false;
    
    // Statistics
    this.stats = {
      framesPublished: 0,
      lapsCompleted: 0,
      errors: 0,
      startTime: Date.now(),
    };
    
    // Shutdown flag
    this.shuttingDown = false;
  }

  applyLapVariations(data) {
    const laps = data?.laps;
    if (!Array.isArray(laps) || laps.length === 0) return data;

    // If we only have one lap, create additional laps with slight variations.
    if (laps.length === 1) {
      const baseLap = laps[0];
      const makeClone = (lapNumber) => ({
        ...baseLap,
        lapNumber,
        frames: baseLap.frames.map((f) => ({ ...f, lapNumber })),
      });
      data = {
        ...data,
        laps: [baseLap, makeClone(2), makeClone(3)],
      };
    }

    const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

    // Deterministic per-lap jitter (no Math.random) so playback feels consistent.
    const jitter = (lapIndex, frameIndex) => {
      const x = Math.sin((lapIndex + 1) * 999 + (frameIndex + 1) * 0.017) * 10000;
      return x - Math.floor(x);
    };

    const nextLaps = data.laps.map((lap, lapIndex) => {
      const variation = 1 + (lapIndex - 1) * 0.015; // -1.5%, 0%, +1.5%
      const frames = Array.isArray(lap.frames) ? lap.frames : [];

      const nextFrames = frames.map((frame, frameIndex) => {
        const noise = 1 + (jitter(lapIndex, frameIndex) - 0.5) * 0.03; // ±1.5%
        const speed = Number(frame.speed ?? 0);
        const rpm = Number(frame.rpm ?? 0);
        const throttle = Number(frame.throttle ?? 0);
        const brake = Number(frame.brake ?? 0);
        const steering = Number(frame.steering ?? 0);

        return {
          ...frame,
          lapNumber: lap.lapNumber ?? lapIndex + 1,
          throttle: clamp(throttle * noise, 0, 1),
          brake: clamp(brake * noise, 0, 1),
          steering: clamp(steering * noise, -1, 1),
          speed: Math.max(0, speed * variation * noise),
          rpm: Math.max(0, rpm * variation * noise),
        };
      });

      return {
        ...lap,
        lapNumber: lap.lapNumber ?? lapIndex + 1,
        frames: nextFrames,
      };
    });

    return { ...data, laps: nextLaps };
  }
  
  /**
   * Initialize the collector
   */
  async initialize() {
    try {
      logger.info('Initializing Demo Collector', {
        userId: this.userId,
        sessionId: this.sessionId,
        frameRate: this.frameRate,
        loop: this.loop,
        demoSource: this.demoSource,
      });
      
      // Load demo data
      this.loadDemoData();
      
      // Initialize Kafka producer
      await this.initKafka();
      
      // Setup graceful shutdown
      this.setupShutdownHandlers();
      
      logger.info('Demo collector initialized successfully', {
        laps: this.demoData.laps?.length || 1,
        totalFrames: this.getTotalFrames(),
      });
      
      return true;
    } catch (error) {
      logger.error('Failed to initialize collector', { error: error.message });
      throw error;
    }
  }
  
  /**
   * Load demo telemetry data
   */
  loadDemoData() {
    try {
      if (this.demoSource !== 'file') {
        this.demoData = this.generateFallbackDemoData();
        logger.info('Generated fallback demo data', {
          demoSource: this.demoSource,
          laps: this.demoData?.laps?.length ?? 0,
          totalFrames: this.getTotalFrames?.() ?? undefined,
        });
        return;
      }

      // Prefer the original recorded demo telemetry the web UI serves.
      // __dirname = collectors/demo-kafka
      const recordedDemoPath = path.join(__dirname, '../../apps/web/public/demo-telemetry.json');
      const bundledDemoPath = path.join(__dirname, '../demo-data/demo-telemetry.json');

      const demoPath = fs.existsSync(recordedDemoPath)
        ? recordedDemoPath
        : bundledDemoPath;
      
      if (fs.existsSync(demoPath)) {
        const rawData = fs.readFileSync(demoPath, 'utf8');
        const data = JSON.parse(rawData);
        
        // Handle new format with multiple laps
        if (data.laps && Array.isArray(data.laps)) {
          this.demoData = this.applyLapVariations(data);
          const totalFrames = this.demoData.laps.reduce((sum, lap) => sum + lap.frames.length, 0);
          logger.info('Loaded demo data', {
            demoSource: this.demoSource,
            demoPath,
            laps: this.demoData.laps.length,
            totalFrames,
          });
        } else if (data.frames) {
          // Handle old format with single lap
          this.demoData = this.applyLapVariations({ laps: [{ lapNumber: 1, frames: data.frames }] });
          logger.info('Loaded demo data (legacy format)', {
            demoSource: this.demoSource,
            demoPath,
            frames: data.frames.length,
          });
        } else {
          logger.warn('Invalid demo data format, generating fallback');
          this.demoData = this.generateFallbackDemoData();
        }
      } else {
        logger.warn('Demo telemetry file not found, generating fallback');
        this.demoData = this.generateFallbackDemoData();
      }
    } catch (error) {
      logger.error('Error loading demo data', { error: error.message });
      this.demoData = this.generateFallbackDemoData();
    }
  }
  
  /**
   * Generate fallback demo data
   */
  generateFallbackDemoData() {
    const frameRate = this.frameRate || 60;

    // Target ~30s laps for demo mode
    const lapDurationsMs = [30000, 30500, 31000];
    const laps = lapDurationsMs.map((duration, lapIndex) => {
      const frames = [];
      const totalFrames = Math.round((duration / 1000) * frameRate);
      const lapNumber = lapIndex + 1;

      const jitter = (i) => {
        const x = Math.sin((lapIndex + 1) * 997 + (i + 1) * 0.013) * 10000;
        return x - Math.floor(x);
      };

      const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

      // Simple track profile: each segment defines a target speed and curvature.
      // This gives realistic correlations between throttle/brake/steering/speed.
      const profile = [
        { from: 0.0, to: 0.12, targetKmh: 235, curvature: 0.05 },
        { from: 0.12, to: 0.18, targetKmh: 95, curvature: 0.85 },
        { from: 0.18, to: 0.33, targetKmh: 210, curvature: -0.18 },
        { from: 0.33, to: 0.40, targetKmh: 125, curvature: -0.65 },
        { from: 0.40, to: 0.55, targetKmh: 205, curvature: 0.12 },
        { from: 0.55, to: 0.63, targetKmh: 80, curvature: 0.95 },
        { from: 0.63, to: 0.78, targetKmh: 190, curvature: -0.22 },
        { from: 0.78, to: 0.90, targetKmh: 145, curvature: 0.55 },
        { from: 0.90, to: 1.01, targetKmh: 220, curvature: -0.08 },
      ];

      const getSegment = (pos) => profile.find((s) => pos >= s.from && pos < s.to) ?? profile[profile.length - 1];

      // Per-lap slight performance variation
      const variation = 1 + (lapIndex - 1) * 0.012; // -1.2%, 0%, +1.2%

      // Evolve speed over time (instead of directly setting it) for more realistic dynamics.
      let speedKmh = 110 * variation;
      let gear = 3;

      // Approximate ratios for RPM computation; values tuned for plausible RPM bands.
      const ratios = [0, 14.2, 10.4, 7.7, 6.0, 5.0, 4.2];
      const finalDrive = 1.0;
      const rpmFromSpeed = (kmh, g) => {
        const base = kmh * (ratios[g] ?? ratios[6]) * finalDrive * 7.4;
        return clamp(base + 1100, 1200, 9200);
      };

      const dt = 1 / frameRate;

      for (let i = 0; i < totalFrames; i++) {
        const t = i / totalFrames; // 0 → 1 over lap
        const lapTime = (i / frameRate) * 1000;
        const seg = getSegment(t);

        // Noise to avoid perfectly smooth curves
        const noise = (jitter(i) - 0.5) * 0.08; // ±4%

        const targetKmh = seg.targetKmh * variation * (1 + noise * 0.35);
        const curvature = seg.curvature * (1 + noise * 0.2);

        // Controller: if below target -> throttle; above -> brake.
        const error = targetKmh - speedKmh;

        let throttle = clamp(error / 55, 0, 1);
        let brake = clamp(-error / 40, 0, 1);

        // Lift slightly in high-curvature segments even if under target.
        const cornerLift = clamp(Math.abs(curvature) - 0.35, 0, 1);
        throttle = clamp(throttle * (1 - 0.55 * cornerLift), 0, 1);

        // Ensure throttle/brake don't overlap much (typical driver behaviour)
        if (brake > 0.08) {
          throttle = Math.min(throttle, 0.05);
        }

        // Steering follows curvature, reduced at high speeds.
        const speedNorm = clamp(speedKmh / 240, 0, 1);
        let steering = curvature * (1 - 0.55 * speedNorm) + noise * 0.08;
        steering = clamp(steering, -1, 1);

        // Very simple longitudinal model (km/h per second).
        const accelKmhPerSec = 30 * throttle;
        const brakeKmhPerSec = 55 * brake;
        const aeroDragKmhPerSec = 0.028 * speedKmh * speedKmh / 100; // grows with speed
        const cornerDragKmhPerSec = 10 * Math.abs(steering) * speedNorm;

        speedKmh += (accelKmhPerSec - brakeKmhPerSec - aeroDragKmhPerSec - cornerDragKmhPerSec) * dt;
        speedKmh = clamp(speedKmh, 35, 260);

        // Gear shift logic using RPM thresholds.
        let rpm = rpmFromSpeed(speedKmh, gear);

        const upshiftRpm = 8200;
        const downshiftRpm = 2600;

        if (throttle > 0.55 && rpm > upshiftRpm && gear < 6) {
          gear += 1;
          rpm = rpmFromSpeed(speedKmh, gear);
        }

        if (brake > 0.25 && rpm < downshiftRpm && gear > 1) {
          gear -= 1;
          rpm = rpmFromSpeed(speedKmh, gear);
        }

        // Small throttle modulation / brake tap variability so the UI has texture.
        if (throttle > 0.2 && brake < 0.05) {
          throttle = clamp(throttle + Math.sin(t * Math.PI * 18) * 0.035 + noise * 0.02, 0, 1);
        }
        if (brake > 0.15) {
          brake = clamp(brake + Math.sin(t * Math.PI * 14) * 0.04 + noise * 0.02, 0, 1);
        }

        frames.push({
          timestamp: Date.now() + lapTime,
          throttle: clamp(throttle, 0, 1),
          brake: clamp(brake, 0, 1),
          steering: clamp(steering, -1, 1),
          speed: speedKmh,
          gear,
          rpm,
          normalizedPosition: t,
          lapNumber,
          lapTime,
        });
      }

      return { lapNumber, frames };
    });

    const totalFrames = laps.reduce((sum, lap) => sum + lap.frames.length, 0);
    logger.info('Generated fallback demo data', { laps: laps.length, frames: totalFrames });
    return { laps };
  }
  
  /**
   * Get total number of frames across all laps
   */
  getTotalFrames() {
    if (!this.demoData || !this.demoData.laps) return 0;
    return this.demoData.laps.reduce((sum, lap) => sum + lap.frames.length, 0);
  }
  
  /**
   * Initialize Kafka producer
   */
  async initKafka() {
    try {
      // Ensure user topic exists
      logger.info('Ensuring user topic exists', { userId: this.userId });
      await this.kafkaAdmin.connect();
      await this.kafkaAdmin.ensureUserTopic(this.userId);
      
      // Initialize producer
      this.producer = new KafkaProducer({
        userId: this.userId,
        sessionId: this.sessionId,
        clientId: `${config.kafka.clientId}-demo-collector`,
      });
      
      await this.producer.connect();
      
      logger.info('Kafka producer initialized', {
        userId: this.userId,
        sessionId: this.sessionId,
      });
    } catch (error) {
      logger.error('Failed to initialize Kafka', { error: error.message });
      throw error;
    }
  }
  
  /**
   * Start playback
   */
  async start() {
    if (this.playing) {
      logger.warn('Playback already started');
      return;
    }
    
    this.playing = true;
    this.currentLapIndex = 0;
    this.currentFrameIndex = 0;
    
    logger.info('Starting demo playback', {
      frameRate: this.frameRate,
      loop: this.loop,
    });
    
    // Calculate interval based on frame rate
    const intervalMs = 1000 / this.frameRate;
    
    this.playbackInterval = setInterval(async () => {
      await this.publishNextFrame();
    }, intervalMs);
  }
  
  /**
   * Stop playback
   */
  stop() {
    if (!this.playing) return;
    
    this.playing = false;
    
    if (this.playbackInterval) {
      clearInterval(this.playbackInterval);
      this.playbackInterval = null;
    }
    
    logger.info('Stopped demo playback', { stats: this.stats });
  }
  
  /**
   * Publish next frame
   */
  async publishNextFrame() {
    try {
      const lap = this.demoData.laps[this.currentLapIndex];
      if (!lap) {
        logger.error('Invalid lap index', { lapIndex: this.currentLapIndex });
        this.stop();
        return;
      }
      
      const frame = lap.frames[this.currentFrameIndex];
      if (!frame) {
        logger.error('Invalid frame index', { frameIndex: this.currentFrameIndex });
        this.stop();
        return;
      }
      
      // Update timestamp to current time
      const frameWithTimestamp = {
        ...frame,
        timestamp: Date.now(),
      };
      
      // Publish to Kafka
      await this.producer.publishFrame(frameWithTimestamp);
      
      this.stats.framesPublished++;
      
      // Log progress every 100 frames
      if (this.stats.framesPublished % 100 === 0) {
        logger.debug('Playback progress', {
          lap: this.currentLapIndex + 1,
          frame: this.currentFrameIndex + 1,
          totalFrames: lap.frames.length,
          framesPublished: this.stats.framesPublished,
        });
      }
      
      // Move to next frame
      this.currentFrameIndex++;
      
      // Check if lap is complete
      if (this.currentFrameIndex >= lap.frames.length) {
        this.currentFrameIndex = 0;
        this.currentLapIndex++;
        this.stats.lapsCompleted++;
        
        logger.info('Lap completed', {
          lapNumber: lap.lapNumber || this.currentLapIndex,
          lapsCompleted: this.stats.lapsCompleted,
        });
        
        // Check if all laps are complete
        if (this.currentLapIndex >= this.demoData.laps.length) {
          if (this.loop) {
            // Loop back to first lap
            this.currentLapIndex = 0;
            logger.info('Looping back to first lap');
          } else {
            // Stop playback
            logger.info('All laps completed, stopping playback');
            this.stop();
            
            // Shutdown after playback completes
            setTimeout(() => {
              this.shutdown();
            }, 1000);
          }
        }
      }
    } catch (error) {
      this.stats.errors++;
      logger.error('Error publishing frame', { error: error.message });
    }
  }
  
  /**
   * Get statistics
   */
  getStats() {
    const uptime = Date.now() - this.stats.startTime;
    const framesPerSecond = this.stats.framesPublished / (uptime / 1000);
    
    return {
      ...this.stats,
      uptime,
      framesPerSecond: framesPerSecond.toFixed(2),
      playing: this.playing,
      currentLap: this.currentLapIndex + 1,
      currentFrame: this.currentFrameIndex + 1,
    };
  }
  
  /**
   * Shutdown
   */
  async shutdown() {
    if (this.shuttingDown) return;
    
    logger.info('Shutting down demo collector');
    this.shuttingDown = true;
    
    try {
      // Stop playback
      this.stop();
      
      // Disconnect Kafka producer
      if (this.producer) {
        await this.producer.disconnect();
      }
      
      logger.info('Shutdown complete', { stats: this.getStats() });
      process.exit(0);
    } catch (error) {
      logger.error('Error during shutdown', { error: error.message });
      process.exit(1);
    }
  }
  
  /**
   * Setup graceful shutdown handlers
   */
  setupShutdownHandlers() {
    const shutdown = async (signal) => {
      logger.info(`Received ${signal}`);
      await this.shutdown();
    };
    
    process.on('SIGINT', () => shutdown('SIGINT'));
    process.on('SIGTERM', () => shutdown('SIGTERM'));
    
    // Log statistics every 30 seconds
    setInterval(() => {
      if (this.playing) {
        logger.info('Demo collector statistics', this.getStats());
      }
    }, 30000);
  }
}

// Main execution
if (require.main === module) {
  // Parse command line arguments
  const args = process.argv.slice(2);
  const options = {};
  
  args.forEach(arg => {
    if (arg.startsWith('--userId=')) {
      options.userId = arg.split('=')[1];
    } else if (arg.startsWith('--sessionId=')) {
      options.sessionId = arg.split('=')[1];
    } else if (arg.startsWith('--frameRate=')) {
      options.frameRate = parseInt(arg.split('=')[1]);
    } else if (arg === '--loop') {
      options.loop = true;
    } else if (arg === '--no-loop') {
      options.loop = false;
    }
  });
  
  const collector = new DemoCollector(options);
  
  collector.initialize()
    .then(() => collector.start())
    .catch((error) => {
      logger.error('Fatal error', { error: error.message });
      process.exit(1);
    });
}

module.exports = DemoCollector;
