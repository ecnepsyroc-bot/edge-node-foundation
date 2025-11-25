-- Add Playbook columns to shop_chat database
ALTER TABLE messages ADD COLUMN IF NOT EXISTS playbook_notes TEXT;
ALTER TABLE messages ADD COLUMN IF NOT EXISTS playbook_verified_by VARCHAR(50);
ALTER TABLE messages ADD COLUMN IF NOT EXISTS playbook_verified_at TIMESTAMP;
CREATE INDEX IF NOT EXISTS idx_messages_in_playbook ON messages(in_playbook) WHERE in_playbook = TRUE;
