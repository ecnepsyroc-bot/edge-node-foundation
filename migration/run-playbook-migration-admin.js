/**
 * Migration Script: Add Playbook Columns (with postgres user)
 * Run this with: node migration/run-playbook-migration-admin.js
 */

const { Pool } = require('pg');

// Use postgres superuser for migration
const pool = new Pool({
    host: 'localhost',
    port: 5432,
    database: 'botta_risposta',
    user: 'postgres',
    password: 'postgres'  // Default postgres password
});

async function runMigration() {
    const client = await pool.connect();

    try {
        console.log('🔄 Starting Playbook migration...');

        // Add columns
        await client.query(`
      ALTER TABLE messages 
        ADD COLUMN IF NOT EXISTS in_playbook BOOLEAN DEFAULT FALSE,
        ADD COLUMN IF NOT EXISTS playbook_notes TEXT,
        ADD COLUMN IF NOT EXISTS playbook_verified_by VARCHAR(50),
        ADD COLUMN IF NOT EXISTS playbook_verified_at TIMESTAMP;
    `);

        console.log('✅ Added Playbook columns to messages table');

        // Create index
        await client.query(`
      CREATE INDEX IF NOT EXISTS idx_messages_in_playbook 
        ON messages(in_playbook) 
        WHERE in_playbook = TRUE;
    `);

        console.log('✅ Created index for Playbook messages');

        // Verify columns
        const result = await client.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'messages' 
        AND column_name IN ('in_playbook', 'playbook_notes', 'playbook_verified_by', 'playbook_verified_at')
      ORDER BY column_name;
    `);

        console.log('\n📋 Verification - Added columns:');
        result.rows.forEach(row => {
            console.log(`  - ${row.column_name} (${row.data_type})`);
        });

        if (result.rows.length === 4) {
            console.log('\n✅ Migration completed successfully!');
            console.log('🎉 Playbook feature is now ready to use!');
        } else {
            console.log('\n⚠️  Warning: Expected 4 columns, found', result.rows.length);
        }

    } catch (error) {
        console.error('❌ Migration failed:', error.message);
        throw error;
    } finally {
        client.release();
        await pool.end();
    }
}

runMigration()
    .then(() => process.exit(0))
    .catch(err => {
        console.error(err);
        process.exit(1);
    });
