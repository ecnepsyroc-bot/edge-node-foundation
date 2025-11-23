/**
 * Data Migration Script: JSON to PostgreSQL
 * Botta e Risposta - Edge Node System #1
 * 
 * This script migrates data from chat-data.json to PostgreSQL
 * Run after creating the database schema
 */

const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

// Database configuration
const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'shop_chat',
  user: process.env.DB_USER || 'shop_user',
  password: process.env.DB_PASSWORD || 'shop_password',
  max: 20,
});

// Load JSON data
const DB_FILE = path.join(__dirname, '..', 'chat-data.json');

async function migrate() {
  const client = await pool.connect();
  
  try {
    console.log('🚀 Starting migration...\n');
    
    // Read JSON file
    const jsonData = JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
    console.log('✅ Loaded chat-data.json');
    
    await client.query('BEGIN');
    
    // 1. Migrate Users
    console.log('\n📊 Migrating users...');
    const userMap = new Map(); // username -> id
    let userCount = 0;
    
    for (const [username, userData] of Object.entries(jsonData.users || {})) {
      const result = await client.query(
        'INSERT INTO users (username, last_seen) VALUES ($1, $2) RETURNING id',
        [username, userData.lastSeen || new Date()]
      );
      userMap.set(username, result.rows[0].id);
      userCount++;
    }
    console.log(`   ✓ Migrated ${userCount} users`);
    
    // 2. Migrate Jobs
    console.log('\n📊 Migrating jobs...');
    const jobMap = new Map(); // job name -> id
    const uniqueJobs = new Set();
    
    // Collect unique jobs from messages
    (jsonData.messages || []).forEach(msg => {
      if (msg.job) uniqueJobs.add(msg.job);
    });
    
    for (const jobName of uniqueJobs) {
      const result = await client.query(
        'INSERT INTO jobs (name) VALUES ($1) RETURNING id',
        [jobName]
      );
      jobMap.set(jobName, result.rows[0].id);
    }
    console.log(`   ✓ Migrated ${uniqueJobs.size} jobs`);
    
    // 3. Migrate Subcategories
    console.log('\n📊 Migrating subcategories...');
    const subcategoryMap = new Map(); // "jobName|subcategoryName" -> id
    let subcategoryCount = 0;
    
    for (const subcat of jsonData.jobSubcategories || []) {
      const jobId = jobMap.get(subcat.job);
      if (!jobId) {
        console.warn(`   ⚠ Skipping subcategory for unknown job: ${subcat.job}`);
        continue;
      }
      
      const result = await client.query(
        'INSERT INTO subcategories (job_id, name) VALUES ($1, $2) RETURNING id',
        [jobId, subcat.subcategory]
      );
      subcategoryMap.set(`${subcat.job}|${subcat.subcategory}`, result.rows[0].id);
      subcategoryCount++;
    }
    console.log(`   ✓ Migrated ${subcategoryCount} subcategories`);
    
    // 4. Migrate Individual Chats
    console.log('\n📊 Migrating individual chats...');
    const chatMap = new Map(); // "jobName|subcategory|chatName" -> id
    let chatCount = 0;
    
    for (const chat of jsonData.individualChats || []) {
      const jobId = jobMap.get(chat.job);
      const subcategoryId = subcategoryMap.get(`${chat.job}|${chat.subcategory}`);
      
      if (!jobId || !subcategoryId) {
        console.warn(`   ⚠ Skipping chat for unknown job/subcategory: ${chat.job}/${chat.subcategory}`);
        continue;
      }
      
      const result = await client.query(
        'INSERT INTO individual_chats (job_id, subcategory_id, chat_name) VALUES ($1, $2, $3) RETURNING id',
        [jobId, subcategoryId, chat.chatName]
      );
      chatMap.set(`${chat.job}|${chat.subcategory}|${chat.chatName}`, result.rows[0].id);
      chatCount++;
    }
    console.log(`   ✓ Migrated ${chatCount} individual chats`);
    
    // 5. Migrate Messages
    console.log('\n📊 Migrating messages...');
    let messageCount = 0;
    let errorCount = 0;
    
    for (const msg of jsonData.messages || []) {
      try {
        // Get user ID (create user if doesn't exist)
        let userId = userMap.get(msg.username);
        if (!userId) {
          const userResult = await client.query(
            'INSERT INTO users (username) VALUES ($1) RETURNING id',
            [msg.username]
          );
          userId = userResult.rows[0].id;
          userMap.set(msg.username, userId);
        }
        
        // Get job ID
        const jobId = jobMap.get(msg.job);
        if (!jobId) {
          console.warn(`   ⚠ Skipping message for unknown job: ${msg.job}`);
          errorCount++;
          continue;
        }
        
        // Get subcategory ID (optional)
        let subcategoryId = null;
        if (msg.subcategory) {
          subcategoryId = subcategoryMap.get(`${msg.job}|${msg.subcategory}`);
        }
        
        // Get individual chat ID (optional)
        let chatId = null;
        if (msg.individualChat) {
          chatId = chatMap.get(`${msg.job}|${msg.subcategory}|${msg.individualChat}`);
        }
        
        // Get solved by user ID (optional)
        let solvedByUserId = null;
        if (msg.solvedBy) {
          solvedByUserId = userMap.get(msg.solvedBy);
          if (!solvedByUserId) {
            const userResult = await client.query(
              'INSERT INTO users (username) VALUES ($1) RETURNING id',
              [msg.solvedBy]
            );
            solvedByUserId = userResult.rows[0].id;
            userMap.set(msg.solvedBy, solvedByUserId);
          }
        }
        
        // Insert message
        await client.query(
          `INSERT INTO messages 
           (user_id, job_id, subcategory_id, individual_chat_id, text, timestamp, 
            is_problem, is_solved, solution, solved_by_user_id, solved_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
          [
            userId,
            jobId,
            subcategoryId,
            chatId,
            msg.text,
            msg.timestamp || new Date(),
            msg.isProblem || false,
            msg.isSolved || false,
            msg.solution || null,
            solvedByUserId,
            msg.solvedAt || null
          ]
        );
        
        messageCount++;
        
        // Progress indicator
        if (messageCount % 100 === 0) {
          process.stdout.write(`\r   Processing: ${messageCount} messages...`);
        }
      } catch (err) {
        console.error(`\n   ❌ Error migrating message: ${err.message}`);
        errorCount++;
      }
    }
    
    console.log(`\n   ✓ Migrated ${messageCount} messages`);
    if (errorCount > 0) {
      console.log(`   ⚠ ${errorCount} messages failed to migrate`);
    }
    
    await client.query('COMMIT');
    
    // Summary
    console.log('\n' + '='.repeat(50));
    console.log('✅ Migration completed successfully!\n');
    console.log('Summary:');
    console.log(`  Users:              ${userCount}`);
    console.log(`  Jobs:               ${uniqueJobs.size}`);
    console.log(`  Subcategories:      ${subcategoryCount}`);
    console.log(`  Individual Chats:   ${chatCount}`);
    console.log(`  Messages:           ${messageCount}`);
    if (errorCount > 0) {
      console.log(`  Errors:             ${errorCount}`);
    }
    console.log('='.repeat(50));
    
    // Verification queries
    console.log('\n🔍 Running verification queries...\n');
    
    const counts = await client.query(`
      SELECT 
        (SELECT COUNT(*) FROM users) as users,
        (SELECT COUNT(*) FROM jobs) as jobs,
        (SELECT COUNT(*) FROM subcategories) as subcategories,
        (SELECT COUNT(*) FROM individual_chats) as chats,
        (SELECT COUNT(*) FROM messages) as messages,
        (SELECT COUNT(*) FROM messages WHERE is_problem = true) as questions,
        (SELECT COUNT(*) FROM messages WHERE is_problem = true AND is_solved = true) as solved
    `);
    
    console.log('Database Counts:');
    console.log(counts.rows[0]);
    
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('\n❌ Migration failed:', err);
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
}

// Run migration
migrate()
  .then(() => {
    console.log('\n✅ Migration script completed');
    process.exit(0);
  })
  .catch(err => {
    console.error('\n❌ Migration script failed:', err);
    process.exit(1);
  });
