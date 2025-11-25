-- Migration: Add Playbook Feature
-- Created: 2025-11-23
-- Description: Adds playbook_entries table and verification columns to messages table

-- ============================================
-- STEP 1: Create playbook_entries table
-- ============================================

CREATE TABLE IF NOT EXISTS playbook_entries (
    id SERIAL PRIMARY KEY,
    question_text TEXT NOT NULL,
    answer_text TEXT NOT NULL,
    notes TEXT,
    job_id INTEGER NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
    question_message_id INTEGER REFERENCES messages(id) ON DELETE SET NULL,
    answer_message_id INTEGER REFERENCES messages(id) ON DELETE SET NULL,
    created_by_user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    search_vector TSVECTOR
);

-- Create full-text search index
CREATE INDEX idx_playbook_entries_search ON playbook_entries USING GIN(search_vector);

-- Create indexes for performance
CREATE INDEX idx_playbook_entries_job_id ON playbook_entries(job_id);
CREATE INDEX idx_playbook_entries_created_at ON playbook_entries(created_at DESC);
CREATE INDEX idx_playbook_entries_created_by ON playbook_entries(created_by_user_id);

-- Create trigger to automatically update search_vector
CREATE OR REPLACE FUNCTION playbook_entries_search_trigger() RETURNS trigger AS $$
BEGIN
    NEW.search_vector := 
        setweight(to_tsvector('english', COALESCE(NEW.question_text, '')), 'A') ||
        setweight(to_tsvector('english', COALESCE(NEW.answer_text, '')), 'B') ||
        setweight(to_tsvector('english', COALESCE(NEW.notes, '')), 'C');
    RETURN NEW;
END
$$ LANGUAGE plpgsql;

CREATE TRIGGER tsvector_update BEFORE INSERT OR UPDATE
ON playbook_entries FOR EACH ROW EXECUTE FUNCTION playbook_entries_search_trigger();

-- ============================================
-- STEP 2: Add Playbook columns to messages
-- ============================================

ALTER TABLE messages 
    ADD COLUMN IF NOT EXISTS in_playbook BOOLEAN DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS playbook_notes TEXT,
    ADD COLUMN IF NOT EXISTS playbook_verified_by VARCHAR(50),
    ADD COLUMN IF NOT EXISTS playbook_verified_at TIMESTAMP;

-- Create index for playbook messages
CREATE INDEX IF NOT EXISTS idx_messages_in_playbook ON messages(in_playbook) WHERE in_playbook = TRUE;

-- ============================================
-- VERIFICATION
-- ============================================

-- Verify tables were created
SELECT 
    'playbook_entries' AS table_name,
    COUNT(*) AS column_count
FROM information_schema.columns 
WHERE table_name = 'playbook_entries'
UNION ALL
SELECT 
    'messages (new columns)' AS table_name,
    COUNT(*) AS column_count
FROM information_schema.columns 
WHERE table_name = 'messages' 
    AND column_name IN ('verified', 'verified_by_user_id', 'verified_at', 'in_playbook', 'playbook_entry_id');

-- ============================================
-- ROLLBACK SCRIPT (if needed)
-- ============================================

/*
-- DROP indexes
DROP INDEX IF EXISTS idx_messages_in_playbook;
DROP INDEX IF EXISTS idx_messages_verified;
DROP INDEX IF EXISTS idx_playbook_entries_created_by;
DROP INDEX IF EXISTS idx_playbook_entries_created_at;
DROP INDEX IF EXISTS idx_playbook_entries_job_id;
DROP INDEX IF EXISTS idx_playbook_entries_search;

-- DROP trigger and function
DROP TRIGGER IF EXISTS tsvector_update ON playbook_entries;
DROP FUNCTION IF EXISTS playbook_entries_search_trigger();

-- Remove columns from messages
ALTER TABLE messages 
    DROP COLUMN IF EXISTS playbook_entry_id,
    DROP COLUMN IF EXISTS in_playbook,
    DROP COLUMN IF EXISTS verified_at,
    DROP COLUMN IF EXISTS verified_by_user_id,
    DROP COLUMN IF EXISTS verified;

-- DROP table
DROP TABLE IF EXISTS playbook_entries CASCADE;
*/
