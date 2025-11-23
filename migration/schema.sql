-- PostgreSQL Schema for Botta e Risposta
-- Migration Date: November 18, 2025
-- Database: botta_risposta

-- Drop existing tables if they exist (for clean migration)
DROP TABLE IF EXISTS messages CASCADE;
DROP TABLE IF EXISTS individual_chats CASCADE;
DROP TABLE IF EXISTS subcategories CASCADE;
DROP TABLE IF EXISTS jobs CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- Users table
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    last_seen TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_username ON users(username);

-- Jobs table
CREATE TABLE jobs (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) UNIQUE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_job_name ON jobs(name);

-- Subcategories table
CREATE TABLE subcategories (
    id SERIAL PRIMARY KEY,
    job_id INTEGER NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
    name VARCHAR(50) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(job_id, name)
);

CREATE INDEX idx_job_subcategory ON subcategories(job_id, name);

-- Individual chats table
CREATE TABLE individual_chats (
    id SERIAL PRIMARY KEY,
    job_id INTEGER NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
    subcategory_id INTEGER NOT NULL REFERENCES subcategories(id) ON DELETE CASCADE,
    chat_name VARCHAR(100) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(job_id, subcategory_id, chat_name)
);

CREATE INDEX idx_chat_lookup ON individual_chats(job_id, subcategory_id, chat_name);

-- Messages table
CREATE TABLE messages (
    id BIGSERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    job_id INTEGER NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
    subcategory_id INTEGER REFERENCES subcategories(id) ON DELETE SET NULL,
    individual_chat_id INTEGER REFERENCES individual_chats(id) ON DELETE SET NULL,
    text TEXT NOT NULL,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    is_problem BOOLEAN DEFAULT FALSE,
    is_solved BOOLEAN DEFAULT FALSE,
    solution TEXT,
    solved_by_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    solved_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_message_job ON messages(job_id);
CREATE INDEX idx_message_subcategory ON messages(subcategory_id);
CREATE INDEX idx_message_chat ON messages(individual_chat_id);
CREATE INDEX idx_message_timestamp ON messages(timestamp DESC);
CREATE INDEX idx_message_problem ON messages(is_problem) WHERE is_problem = TRUE;
CREATE INDEX idx_message_unsolved ON messages(is_problem, is_solved) WHERE is_problem = TRUE AND is_solved = FALSE;

-- Optional: Full-text search support
ALTER TABLE messages ADD COLUMN search_vector tsvector;
CREATE INDEX idx_message_search ON messages USING GIN(search_vector);

CREATE OR REPLACE FUNCTION messages_search_trigger() RETURNS trigger AS $$
BEGIN
  NEW.search_vector := 
    setweight(to_tsvector('english', COALESCE(NEW.text, '')), 'A') ||
    setweight(to_tsvector('english', COALESCE(NEW.solution, '')), 'B');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER messages_search_update 
  BEFORE INSERT OR UPDATE ON messages
  FOR EACH ROW EXECUTE FUNCTION messages_search_trigger();

-- Grant permissions (adjust as needed)
-- GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO botta_user;
-- GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO botta_user;
