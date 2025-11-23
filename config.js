/**
 * Configuration for Botta e Risposta (Shop Communication Tool)
 */

module.exports = {
  // Server Configuration
  server: {
    port: process.env.PORT || 3000,
    host: process.env.HOST || '0.0.0.0',
  },

  // Database Configuration
  database: {
    // JSON file database (currently active)
    json: {
      path: process.env.DB_FILE || './chat-data.json'
    },
    
    // PostgreSQL configuration (standby)
    postgres: {
      enabled: process.env.USE_POSTGRES === 'true',
      host: process.env.PG_HOST || 'localhost',
      port: parseInt(process.env.PG_PORT || '5432'),
      database: process.env.PG_DATABASE || 'shop_chat',
      user: process.env.PG_USER || 'shop_user',
      password: process.env.PG_PASSWORD || 'shop_password',
      max: 20, // Maximum number of clients in pool
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
    }
  },

  // Terminology Configuration
  terminology: {
    // Subcategory names
    chatPads: {
      displayName: 'Chat-pads',        // What users see
      internalNames: ['Chat-pads'],    // Accepted in backend
      newEntryName: 'Chat-pads'        // What new entries use
    }
  },

  // Feature Flags
  features: {
    nlpHighlighting: true,    // Enable text highlighting
    questionPersistence: true, // Questions persist across tabs
    autoSave: true,           // Auto-save messages
  },

  // Security Configuration
  security: {
    requirePassword: false,   // Currently username-only
    maxMessageLength: 10000,  // Maximum characters per message
    rateLimitPerMinute: 60,   // Max messages per user per minute
  },

  // Performance Configuration
  performance: {
    messagePaginationSize: 100,  // Messages to load per page
    enablePagination: false,      // Currently loads all messages
    maxCachedMessages: 1000,      // Max messages to keep in memory
  },

  // Logging Configuration
  logging: {
    level: process.env.LOG_LEVEL || 'info', // debug, info, warn, error
    enableConsole: true,
    enableFile: false,
    filePath: './logs/app.log'
  }
};
