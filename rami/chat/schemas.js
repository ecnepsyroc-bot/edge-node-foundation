/**
 * WATER - Shared Data Schemas
 * 
 * These schemas define the structure of data flowing through the system.
 * All rami use these schemas to ensure consistency.
 */

const schemas = {
  /**
   * Message Schema
   */
  message: {
    id: 'string',           // Unique message ID (timestamp-based)
    user: 'string',         // Username
    text: 'string',         // Message content
    job: 'string',          // Job name
    timestamp: 'string',    // ISO timestamp
    subcategory: 'string',  // 'Seeking Solution' or Chat-pad name
    individualChat: 'string|null', // Individual chat name (null for Seeking Solution)
    isProblem: 'boolean',   // Whether message is a "Seeking Solution" problem
    isSolved: 'boolean',    // Whether problem has been solved
    solution: 'string',     // Solution text (if solved)
    solvedBy: 'string',     // Username who provided solution
    solvedAt: 'string'      // ISO timestamp when solved
  },

  /**
   * User Schema
   */
  user: {
    username: 'string',
    lastSeen: 'string'      // ISO timestamp
  },

  /**
   * Job Subcategory Schema
   */
  jobSubcategory: {
    job: 'string',          // Job name
    subcategory: 'string'   // Chat-pad name
  },

  /**
   * Individual Chat Schema
   */
  individualChat: {
    job: 'string',          // Job name
    subcategory: 'string',  // Chat-pad name
    chatName: 'string'      // Individual chat within the Chat-pad
  },

  /**
   * Database Schema
   */
  database: {
    users: 'object',              // { username: { lastSeen: timestamp } }
    messages: 'array',            // Array of message objects
    jobSubcategories: 'array',    // Array of jobSubcategory objects
    individualChats: 'array'      // Array of individualChat objects
  }
};

/**
 * Default/Initial Values
 */
const defaults = {
  database: {
    users: {},
    messages: [],
    jobSubcategories: [],
    individualChats: []
  },

  predefinedJobs: [
    'General',
    '3410 Marpole Avenue',
    'Archetype',
    'Bellano',
    'Blueberry',
    'Cactus Club Boston',
    'Cactus Club Houston',
    'Cactus Club Miami',
    'Canaccord 1133',
    'Cirnac',
    'Deloitte 2024',
    'Dentons',
    'Disney',
    'ESDC',
    'EVR',
    'Harbourside- Lot D',
    'Hue',
    'Keith',
    'King Taps Lonsdale',
    'Kings Tap - Park Place',
    'LaSalle College',
    'Myriad',
    'Netflix',
    'Oakridge - Building 6 & 7',
    'PWC-5th Floor',
    'PWC-7th Floor',
    'RBC GAM',
    'Shape Properties',
    'Smith and Farrow',
    'Sunlife - Burnaby',
    'Teck Res. 34th (Phase2)',
    'Teck Res. 34th (Phase3)',
    'WC Fishing Lodge',
    'YVR 21N'
  ],

  defaultSubcategory: 'Seeking Solution'
};

module.exports = {
  schemas,
  defaults
};
