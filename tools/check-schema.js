/**
 * Quick Database Schema Viewer
 * Shows the structure of the individual_chats table
 */

require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_NAME || 'shop_chat',
    user: process.env.DB_USER || 'shop_user',
    password: process.env.DB_PASSWORD
});

async function showSchema() {
    try {
        const result = await pool.query(`
      SELECT 
        column_name,
        data_type,
        character_maximum_length,
        is_nullable,
        column_default
      FROM information_schema.columns
      WHERE table_name = 'individual_chats'
      ORDER BY ordinal_position;
    `);

        console.log('Individual Chats Table Columns:');
        console.table(result.rows);

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await pool.end();
    }
}

showSchema();
