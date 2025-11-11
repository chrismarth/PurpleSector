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
const KafkaProducer = require('../lib/kafka-producer');
const KafkaAdmin = require('../lib/kafka-admin');
const config = require('../config');
const logger = require('../lib/logger').child({ service: 'demo-collector' });

class DemoCollector {
  constructor(options = {}) {
    // Configuration
    this.userId = options.userId || 'demo-user';
    this.sessionId = options.sessionId || `demo-session-${Date.now()}`;
    this.frameRate = options.frameRate || 60; // Hz
    this.loop = options.loop !== undefined ? options.loop : true;
    
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
      const demoPath = path.join(__dirname, '../../public/demo-telemetry.json');
      
      if (fs.existsSync(demoPath)) {
        const rawData = fs.readFileSync(demoPath, 'utf8');
        const data = JSON.parse(rawData);
        
        // Handle new format with multiple laps
        if (data.laps && Array.isArray(data.laps)) {
          this.demoData = data;
          const totalFrames = data.laps.reduce((sum, lap) => sum + lap.frames.length, 0);
          logger.info('Loaded demo data', {
            laps: data.laps.length,
            totalFrames,
          });
        } else if (data.frames) {
          // Handle old format with single lap
          this.demoData = {
            laps: [{ lapNumber: 1, frames: data.frames }],
          };
          logger.info('Loaded demo data (legacy format)', {
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
    
    logger.info('Generated fallback demo data', { frames: frames.length });
    return { laps: [{ lapNumber: 1, frames }] };
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
