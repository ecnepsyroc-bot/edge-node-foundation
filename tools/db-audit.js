/**
 * Database Audit Tool - Complete Version
 * Generates a comprehensive report of database structure and data statistics
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

async function auditDatabase() {
  console.log('='.repeat(80));
  console.log('DATABASE AUDIT REPORT');
  console.log('='.repeat(80));
  console.log(`Database: ${process.env.DB_NAME || 'shop_chat'}`);
  console.log(`Timestamp: ${new Date().toISOString()}`);
  console.log('='.repeat(80));
  console.log();

  try {
    // 1. List all tables with sizes
    console.log('📋 TABLES');
    console.log('-'.repeat(80));
    const tablesResult = await pool.query(`
      SELECT 
        schemaname,
        tablename,
        pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
      FROM pg_tables
      WHERE schemaname NOT IN ('pg_catalog', 'information_schema')
      ORDER BY tablename;
    `);

    console.table(tablesResult.rows);
    console.log();

    // 2. Show sample data from key tables
    console.log('\n📝 SAMPLE DATA');
    console.log('='.repeat(80));

    // Messages sample with joins to show readable data
    console.log('\nMessages (last 10 with details):');
    const messagesResult = await pool.query(`
      SELECT 
        m.id,
        u.username,
        j.name as job_name,
        s.name as subcategory,
        ic.chat_name as chatpad,
        m.is_problem,
        m.is_solved,
        m.in_playbook,
        m.created_at
      FROM messages m
      LEFT JOIN users u ON m.user_id = u.id
      LEFT JOIN jobs j ON m.job_id = j.id
      LEFT JOIN subcategories s ON m.subcategory_id = s.id
      LEFT JOIN individual_chats ic ON m.individual_chat_id = ic.id
      ORDER BY m.created_at DESC
      LIMIT 10;
    `);
    console.table(messagesResult.rows);

    // Jobs sample
    console.log('\nJobs:');
    const jobsResult = await pool.query(`
      SELECT id, name, code, archived, created_at
      FROM jobs
      ORDER BY created_at DESC;
    `);
    console.table(jobsResult.rows);

    // Users sample
    console.log('\nUsers:');
    const usersResult = await pool.query(`
      SELECT id, username, last_seen, created_at
      FROM users
      ORDER BY created_at DESC;
    `);
    console.table(usersResult.rows);

    // Individual Chats
    console.log('\nChat-pads:');
    const chatsResult = await pool.query(`
      SELECT ic.id, ic.chat_name, j.name as job_name, ic.created_at
      FROM individual_chats ic
      LEFT JOIN jobs j ON ic.job_id = j.id
      ORDER BY ic.created_at DESC;
    `);
    console.table(chatsResult.rows);

    // 3. Statistics
    console.log('\n\n📈 STATISTICS');
    console.log('='.repeat(80));

    const stats = await pool.query(`
      SELECT 
        (SELECT COUNT(*) FROM messages) as total_messages,
        (SELECT COUNT(*) FROM messages WHERE is_problem = true) as total_questions,
        (SELECT COUNT(*) FROM messages WHERE is_solved = true) as solved_questions,
        (SELECT COUNT(*) FROM messages WHERE is_problem = true AND is_solved = false) as unsolved_questions,
        (SELECT COUNT(*) FROM jobs) as total_jobs,
        (SELECT COUNT(*) FROM jobs WHERE archived = true) as archived_jobs,
        (SELECT COUNT(*) FROM users) as total_users,
        (SELECT COUNT(*) FROM individual_chats) as total_chatpads,
        (SELECT COUNT(*) FROM messages WHERE in_playbook = true) as playbook_entries;
    `);

    console.table(stats.rows);

    // 4. Detailed Table Structures
    console.log('\n\n📊 TABLE STRUCTURES');
    console.log('='.repeat(80));

    for (const table of tablesResult.rows) {
      const tableName = table.tablename;

      console.log(`\n\nTable: ${tableName}`);
      console.log('-'.repeat(80));

      // Get column information
      const columnsResult = await pool.query(`
        SELECT 
          column_name,
          data_type,
          character_maximum_length,
          is_nullable,
          column_default
        FROM information_schema.columns
        WHERE table_name = $1
        ORDER BY ordinal_position;
      `, [tableName]);

      console.table(columnsResult.rows);

      // Get row count
      const countResult = await pool.query(`SELECT COUNT(*) FROM ${tableName}`);
      console.log(`Row count: ${countResult.rows[0].count}`);
    }

    console.log('\n' + '='.repeat(80));
    console.log('✅ Audit complete!');
    console.log('='.repeat(80));

  } catch (error) {
    console.error('❌ Error during audit:', error);
  } finally {
    await pool.end();
  }
}

// Run the audit
auditDatabase();
