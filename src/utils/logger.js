/**
 * Logging Utility
 * Provides consistent logging across the application
 */

const config = require('../config');

const LOG_LEVELS = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

const COLORS = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  gray: '\x1b[90m',
};

class Logger {
  constructor(level = 'info') {
    this.level = LOG_LEVELS[level] || LOG_LEVELS.info;
  }
  
  /**
   * Format timestamp
   */
  getTimestamp() {
    return new Date().toISOString();
  }
  
  /**
   * Check if message should be logged based on level
   */
  shouldLog(level) {
    return LOG_LEVELS[level] >= this.level;
  }
  
  /**
   * Format log message
   */
  format(level, message, color) {
    const timestamp = this.getTimestamp();
    const levelStr = level.toUpperCase().padEnd(5);
    return `${COLORS.gray}${timestamp}${COLORS.reset} ${color}[${levelStr}]${COLORS.reset} ${message}`;
  }
  
  /**
   * Debug level logging
   */
  debug(message, ...args) {
    if (this.shouldLog('debug')) {
      console.log(this.format('debug', message, COLORS.cyan), ...args);
    }
  }
  
  /**
   * Info level logging
   */
  info(message, ...args) {
    if (this.shouldLog('info')) {
      console.log(this.format('info', message, COLORS.green), ...args);
    }
  }
  
  /**
   * Warning level logging
   */
  warn(message, ...args) {
    if (this.shouldLog('warn')) {
      console.warn(this.format('warn', message, COLORS.yellow), ...args);
    }
  }
  
  /**
   * Error level logging
   */
  error(message, ...args) {
    if (this.shouldLog('error')) {
      console.error(this.format('error', message, COLORS.red), ...args);
    }
  }
  
  /**
   * Log agent decisions (always shown if DEBUG_AGENT is true)
   */
  agent(message, ...args) {
    if (config.app.debugAgent || this.shouldLog('debug')) {
      console.log(this.format('agent', message, COLORS.magenta), ...args);
    }
  }
}

// Create singleton instance
const logger = new Logger(config.app.logLevel);

module.exports = logger;

