/**
 * PostgreSQL Database Connection Pool
 * Botta e Risposta - Edge Node System #1
 */

require('dotenv').config();
const { Pool } = require('pg');

// Create connection pool
const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'shop_chat',
  user: process.env.DB_USER || 'shop_user',
  password: process.env.DB_PASSWORD || 'shop_password',
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

// Error handler
pool.on('error', (err, client) => {
  console.error('Unexpected error on idle PostgreSQL client', err);
});

// Connection test
pool.on('connect', () => {
  console.log('✅ PostgreSQL connected');
});

module.exports = pool;
