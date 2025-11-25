-- Migration: Add Playbook Columns to Messages Table
-- Created: 2025-11-24
-- Description: Adds playbook columns to messages table for the Playbook feature

-- ============================================
-- Add Playbook columns to messages
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

-- Verify columns were added
SELECT 
    'messages (playbook columns)' AS table_name,
    COUNT(*) AS column_count
FROM information_schema.columns 
WHERE table_name = 'messages' 
    AND column_name IN ('in_playbook', 'playbook_notes', 'playbook_verified_by', 'playbook_verified_at');

-- ============================================
-- ROLLBACK SCRIPT (if needed)
-- ============================================

/*
-- Remove columns from messages
ALTER TABLE messages 
    DROP COLUMN IF EXISTS playbook_verified_at,
    DROP COLUMN IF EXISTS playbook_verified_by,
    DROP COLUMN IF EXISTS playbook_notes,
    DROP COLUMN IF EXISTS in_playbook;

-- DROP index
DROP INDEX IF EXISTS idx_messages_in_playbook;
*/
