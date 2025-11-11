/**
 * Centralized Logging Utility
 * 
 * Winston-based logger with structured logging support
 */

const winston = require('winston');
const config = require('../config');

// Define log format
const logFormat = config.logging.format === 'json'
  ? winston.format.combine(
      winston.format.timestamp(),
      winston.format.errors({ stack: true }),
      winston.format.json()
    )
  : winston.format.combine(
      winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
      winston.format.errors({ stack: true }),
      winston.format.printf(({ timestamp, level, message, service, ...meta }) => {
        let msg = `${timestamp} [${level.toUpperCase()}]`;
        if (service) msg += ` [${service}]`;
        msg += `: ${message}`;
        if (Object.keys(meta).length > 0) {
          msg += ` ${JSON.stringify(meta)}`;
        }
        return msg;
      })
    );

// Define transports
const transports = [
  new winston.transports.Console({
    format: winston.format.combine(
      winston.format.colorize(),
      logFormat
    ),
  }),
];

// Add file transport if configured
if (config.logging.file) {
  transports.push(
    new winston.transports.File({
      filename: config.logging.file,
      format: logFormat,
    })
  );
}

// Create logger instance
const logger = winston.createLogger({
  level: config.logging.level,
  format: logFormat,
  defaultMeta: { service: config.service.name },
  transports,
});

/**
 * Create a child logger with additional context
 * @param {Object} meta - Additional metadata to include in all logs
 * @returns {winston.Logger} Child logger instance
 */
logger.child = (meta) => {
  return winston.createLogger({
    level: config.logging.level,
    format: logFormat,
    defaultMeta: { ...logger.defaultMeta, ...meta },
    transports,
  });
};

module.exports = logger;
