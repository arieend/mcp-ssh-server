import config from '../config.js';

/**
 * Log levels
 */
const LOG_LEVELS = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

/**
 * Simple logger utility
 */
class Logger {
  constructor(level = 'info') {
    this.level = LOG_LEVELS[level] || LOG_LEVELS.info;
  }

  /**
   * Format log message
   */
  format(level, message, meta = {}) {
    const timestamp = new Date().toISOString();
    const metaStr = Object.keys(meta).length > 0 ? ` ${JSON.stringify(meta)}` : '';
    return `[${timestamp}] [${level.toUpperCase()}] ${message}${metaStr}`;
  }

  /**
   * Log debug message
   */
  debug(message, meta) {
    if (this.level <= LOG_LEVELS.debug) {
      console.error(this.format('debug', message, meta));
    }
  }

  /**
   * Log info message
   */
  info(message, meta) {
    if (this.level <= LOG_LEVELS.info) {
      console.error(this.format('info', message, meta));
    }
  }

  /**
   * Log warning message
   */
  warn(message, meta) {
    if (this.level <= LOG_LEVELS.warn) {
      console.error(this.format('warn', message, meta));
    }
  }

  /**
   * Log error message
   */
  error(message, meta) {
    if (this.level <= LOG_LEVELS.error) {
      console.error(this.format('error', message, meta));
    }
  }
}

// Export singleton instance
export const logger = new Logger(config.logging.level);
export default logger;
