/**
 * RAMUS: Chat (PostgreSQL)
 * 
 * Manages chat messages, users, and chat organization using PostgreSQL
 */

require('dotenv').config();
const pool = require('../database/pool');
const { sanitizeMessage, sanitizeJobSubcategory, sanitizeIndividualChat } = require('../../sap/validators');

class ChatManager {
  constructor() {
    // PostgreSQL-based, no file path needed
    this.pool = pool;
  }

  /**
   * Add a message
   */
  async addMessage(msgData) {
    const message = sanitizeMessage(msgData);

    // Get or create user
    const userResult = await this.pool.query(
      'INSERT INTO users (username) VALUES ($1) ON CONFLICT (username) DO UPDATE SET last_seen = NOW() RETURNING id',
      [message.user]
    );
    const userId = userResult.rows[0].id;

    // Get or create job
    const jobResult = await this.pool.query(
      'INSERT INTO jobs (name) VALUES ($1) ON CONFLICT (name) DO NOTHING RETURNING id',
      [message.job]
    );
    let jobId;
    if (jobResult.rows.length > 0) {
      jobId = jobResult.rows[0].id;
    } else {
      const existingJob = await this.pool.query('SELECT id FROM jobs WHERE name = $1', [message.job]);
      jobId = existingJob.rows[0].id;
    }

    // Get subcategory ID if provided
    let subcategoryId = null;
    if (message.subcategory) {
      const subcatResult = await this.pool.query(
        'SELECT id FROM subcategories WHERE job_id = $1 AND name = $2',
        [jobId, message.subcategory]
      );
      if (subcatResult.rows.length > 0) {
        subcategoryId = subcatResult.rows[0].id;
      }
    }

    // Get individual chat ID if provided
    let individualChatId = null;
    if (message.individualChat) {
      // Extract chat name from individualChat format "jobName_chatName"
      const parts = message.individualChat.split('_');
      const chatName = parts.slice(1).join('_');

      if (chatName && subcategoryId) {
        const chatResult = await this.pool.query(
          'SELECT id FROM individual_chats WHERE job_id = $1 AND subcategory_id = $2 AND chat_name = $3',
          [jobId, subcategoryId, chatName]
        );
        if (chatResult.rows.length > 0) {
          individualChatId = chatResult.rows[0].id;
        }
      }
    }

    // Insert message
    const result = await this.pool.query(
      `INSERT INTO messages (user_id, job_id, subcategory_id, individual_chat_id, text, timestamp, is_problem, is_solved)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING id`,
      [
        userId,
        jobId,
        subcategoryId,
        individualChatId,
        message.text,
        message.timestamp || new Date().toISOString(),
        message.isProblem || false,
        message.isSolved || false
      ]
    );

    message.id = result.rows[0].id.toString();
    return message;
  }

  /**
   * Get messages for a job/subcategory/chat
   */
  async getMessages(filters = {}) {
    let query = `
      SELECT 
        m.id,
        u.username as user,
        j.name as job,
        s.name as subcategory,
        CASE 
          WHEN ic.chat_name IS NOT NULL THEN CONCAT(j.name, '_', ic.chat_name)
          ELSE NULL
        END as "individualChat",
        m.text,
        m.timestamp,
        m.is_problem as "isProblem",
        m.is_solved as "isSolved",
        m.solution,
        solved_by.username as "solvedBy",
        m.solved_at as "solvedAt"
      FROM messages m
      JOIN users u ON m.user_id = u.id
      JOIN jobs j ON m.job_id = j.id
      LEFT JOIN subcategories s ON m.subcategory_id = s.id
      LEFT JOIN individual_chats ic ON m.individual_chat_id = ic.id
      LEFT JOIN users solved_by ON m.solved_by_user_id = solved_by.id
      WHERE 1=1
    `;

    const params = [];
    let paramCount = 1;

    if (filters.job) {
      query += ` AND j.name = $${paramCount}`;
      params.push(filters.job);
      paramCount++;
    }

    if (filters.subcategory) {
      query += ` AND s.name = $${paramCount}`;
      params.push(filters.subcategory);
      paramCount++;
    }

    if (filters.individualChat !== undefined && filters.individualChat !== null) {
      // Extract chat name from format "jobName_chatName"
      const parts = filters.individualChat.split('_');
      const chatName = parts.slice(1).join('_');
      query += ` AND ic.chat_name = $${paramCount}`;
      params.push(chatName);
      paramCount++;
    }

    if (filters.isProblem !== undefined) {
      query += ` AND m.is_problem = $${paramCount}`;
      params.push(filters.isProblem);
      paramCount++;
    }

    query += ' ORDER BY m.timestamp ASC';

    const result = await this.pool.query(query, params);
    return result.rows.map(row => ({
      ...row,
      id: row.id.toString()
    }));
  }

  /**
   * Delete messages by user (excludes isProblem messages)
   */
  async deleteMessagesByUser(username, job, subcategory, individualChat) {
    const targetChat = individualChat === undefined ? null : individualChat;
    let chatName = null;

    if (targetChat) {
      const parts = targetChat.split('_');
      chatName = parts.slice(1).join('_');
    }

    const result = await this.pool.query(
      `DELETE FROM messages m
       USING users u, jobs j
       LEFT JOIN subcategories s ON m.subcategory_id = s.id
       LEFT JOIN individual_chats ic ON m.individual_chat_id = ic.id
       WHERE m.user_id = u.id
         AND m.job_id = j.id
         AND u.username = $1
         AND j.name = $2
         AND (s.name = $3 OR ($3 IS NULL AND m.subcategory_id IS NULL))
         AND (ic.chat_name = $4 OR ($4 IS NULL AND m.individual_chat_id IS NULL))
         AND m.is_problem = FALSE`,
      [username, job, subcategory, chatName]
    );

    return result.rowCount;
  }

  /**
   * Delete a single message by ID
   */
  /**
   * Delete a single message by ID (restricted to author)
   */
  async deleteMessageById(messageId, username) {
    // Check if message exists and get author
    const checkResult = await this.pool.query(
      `SELECT m.id, u.username 
       FROM messages m 
       JOIN users u ON m.user_id = u.id 
       WHERE m.id = $1`,
      [parseInt(messageId)]
    );

    if (checkResult.rows.length === 0) {
      throw new Error('Message not found');
    }

    const message = checkResult.rows[0];

    // Check permission (must be author)
    // TODO: Add admin check if admin system is implemented
    if (message.username !== username) {
      throw new Error('Unauthorized');
    }

    const result = await this.pool.query(
      'DELETE FROM messages WHERE id = $1',
      [parseInt(messageId)]
    );
    return result.rowCount > 0;
  }

  /**
   * Clear ALL messages in a context (excludes isProblem/Question entries)
   */
  async clearAllMessages(job, subcategory, individualChat) {
    const targetChat = individualChat === undefined ? null : individualChat;
    let chatName = null;

    if (targetChat) {
      const parts = targetChat.split('_');
      chatName = parts.slice(1).join('_');
    }

    const result = await this.pool.query(
      `WITH job_lookup AS (
         SELECT id FROM jobs WHERE name = $1
       ),
       subcat_lookup AS (
         SELECT id FROM subcategories 
         WHERE job_id = (SELECT id FROM job_lookup) AND name = $2
       ),
       chat_lookup AS (
         SELECT id FROM individual_chats 
         WHERE job_id = (SELECT id FROM job_lookup) 
           AND subcategory_id = (SELECT id FROM subcat_lookup)
           AND chat_name = $3
       )
       DELETE FROM messages 
       WHERE job_id = (SELECT id FROM job_lookup)
         AND (subcategory_id = (SELECT id FROM subcat_lookup) OR ($2 IS NULL AND subcategory_id IS NULL))
         AND (individual_chat_id = (SELECT id FROM chat_lookup) OR ($3 IS NULL AND individual_chat_id IS NULL))
         AND is_problem = FALSE`,
      [job, subcategory, chatName]
    );

    return result.rowCount;
  }

  /**
   * Mark a problem message as solved with solution text
   */
  async solveMessage(messageId, solution, username) {
    // Get solver user ID
    const userResult = await this.pool.query(
      'SELECT id FROM users WHERE username = $1',
      [username]
    );

    if (userResult.rows.length === 0) {
      throw new Error('User not found');
    }

    const userId = userResult.rows[0].id;

    // Update message
    const result = await this.pool.query(
      `UPDATE messages
       SET is_solved = TRUE, solution = $1, solved_by_user_id = $2, solved_at = NOW()
       WHERE id = $3 AND is_problem = TRUE
       RETURNING id`,
      [solution, userId, parseInt(messageId)]
    );

    if (result.rows.length === 0) {
      throw new Error('Message not found or not a problem');
    }

    // Return updated message
    const messages = await this.getMessages({});
    return messages.find(m => m.id === messageId.toString());
  }

  /**
   * Add job subcategory (Chat-pads)
   */
  async addJobSubcategory(job, subcategory) {
    const data = sanitizeJobSubcategory({ job, subcategory });

    // Get or create job
    const jobResult = await this.pool.query(
      'INSERT INTO jobs (name) VALUES ($1) ON CONFLICT (name) DO NOTHING RETURNING id',
      [data.job]
    );

    let jobId;
    if (jobResult.rows.length > 0) {
      jobId = jobResult.rows[0].id;
    } else {
      const existingJob = await this.pool.query('SELECT id FROM jobs WHERE name = $1', [data.job]);
      jobId = existingJob.rows[0].id;
    }

    // Insert subcategory
    await this.pool.query(
      'INSERT INTO subcategories (job_id, name) VALUES ($1, $2) ON CONFLICT (job_id, name) DO NOTHING',
      [jobId, data.subcategory]
    );

    return data;
  }

  /**
   * Get job subcategories
   */
  async getJobSubcategories(job) {
    const result = await this.pool.query(
      `SELECT s.name as subcategory
       FROM subcategories s
       JOIN jobs j ON s.job_id = j.id
       WHERE j.name = $1`,
      [job]
    );

    return result.rows.map(row => ({
      job: job,
      subcategory: row.subcategory
    }));
  }

  /**
   * Delete job subcategory and all related data
   */
  async deleteJobSubcategory(job, subcategory) {
    const result = await this.pool.query(
      `DELETE FROM messages m
       USING jobs j, subcategories s
       WHERE m.job_id = j.id
         AND m.subcategory_id = s.id
         AND j.name = $1
         AND s.name = $2`,
      [job, subcategory]
    );

    const deletedCount = result.rowCount;

    // Delete subcategory (CASCADE will handle individual_chats)
    await this.pool.query(
      `DELETE FROM subcategories s
       USING jobs j
       WHERE s.job_id = j.id
         AND j.name = $1
         AND s.name = $2`,
      [job, subcategory]
    );

    return deletedCount;
  }

  /**
   * Add individual chat
   */
  async addIndividualChat(job, subcategory, chatName) {
    const data = sanitizeIndividualChat({ job, subcategory, chatName });

    // Get job ID
    const jobResult = await this.pool.query('SELECT id FROM jobs WHERE name = $1', [data.job]);
    if (jobResult.rows.length === 0) {
      throw new Error('Job not found');
    }
    const jobId = jobResult.rows[0].id;

    // Get or create subcategory
    const subcatResult = await this.pool.query(
      `INSERT INTO subcategories (job_id, name) 
       VALUES ($1, $2) 
       ON CONFLICT (job_id, name) DO UPDATE SET name = EXCLUDED.name
       RETURNING id`,
      [jobId, data.subcategory]
    );
    const subcategoryId = subcatResult.rows[0].id;

    // Insert individual chat
    const result = await this.pool.query(
      'INSERT INTO individual_chats (job_id, subcategory_id, chat_name) VALUES ($1, $2, $3) ON CONFLICT (job_id, subcategory_id, chat_name) DO NOTHING RETURNING id',
      [jobId, subcategoryId, data.chatName]
    );

    return {
      ...data,
      id: result.rows.length > 0 ? `${job}_${chatName}` : null
    };
  }

  /**
   * Get individual chats
   */
  async getIndividualChats(job, subcategory) {
    const result = await this.pool.query(
      `SELECT ic.chat_name as "chatName"
       FROM individual_chats ic
       JOIN jobs j ON ic.job_id = j.id
       JOIN subcategories s ON ic.subcategory_id = s.id
       WHERE j.name = $1 AND s.name = $2
       ORDER BY ic.created_at ASC`,
      [job, subcategory]
    );

    return result.rows.map(row => ({
      job: job,
      subcategory: subcategory,
      chatName: row.chatName
    }));
  }

  /**
   * Delete a single individual chat
   */
  async deleteIndividualChat(job, subcategory, chatName) {
    // Delete messages in this chat
    const msgResult = await this.pool.query(
      `DELETE FROM messages m
       USING jobs j, subcategories s, individual_chats ic
       WHERE m.job_id = j.id
         AND m.subcategory_id = s.id
         AND m.individual_chat_id = ic.id
         AND j.name = $1
         AND s.name = $2
         AND ic.chat_name = $3`,
      [job, subcategory, chatName]
    );

    const deletedCount = msgResult.rowCount;

    // Delete the chat
    await this.pool.query(
      `DELETE FROM individual_chats ic
       USING jobs j, subcategories s
       WHERE ic.job_id = j.id
         AND ic.subcategory_id = s.id
         AND j.name = $1
         AND s.name = $2
         AND ic.chat_name = $3`,
      [job, subcategory, chatName]
    );

    return deletedCount;
  }

  /**
   * Register or update user
   */
  async registerUser(username) {
    const result = await this.pool.query(
      'INSERT INTO users (username, last_seen) VALUES ($1, NOW()) ON CONFLICT (username) DO UPDATE SET last_seen = NOW() RETURNING username, last_seen',
      [username]
    );

    return {
      lastSeen: result.rows[0].last_seen
    };
  }

  /**
   * Get all users
   */
  async getUsers() {
    const result = await this.pool.query('SELECT username, last_seen FROM users');

    const users = {};
    result.rows.forEach(row => {
      users[row.username] = {
        lastSeen: row.last_seen
      };
    });

    return users;
  }

  /**
   * Set job code
   */
  async setJobCode(jobName, code) {
    await this.pool.query(
      'INSERT INTO jobs (name, code) VALUES ($1, $2) ON CONFLICT (name) DO UPDATE SET code = $2',
      [jobName, code]
    );
    return code;
  }

  /**
   * Get job code
   */
  async getJobCode(jobName) {
    const result = await this.pool.query(
      'SELECT code FROM jobs WHERE name = $1',
      [jobName]
    );
    return result.rows.length > 0 ? (result.rows[0].code || '') : '';
  }

  /**
   * Get all job codes
   */
  async getAllJobCodes() {
    const result = await this.pool.query('SELECT name, code FROM jobs WHERE code IS NOT NULL');

    const codes = {};
    result.rows.forEach(row => {
      codes[row.name] = row.code;
    });

    return codes;
  }

  /**
   * Set job archived status
   */
  async setJobArchived(jobName, archived) {
    await this.pool.query(
      'INSERT INTO jobs (name, archived) VALUES ($1, $2) ON CONFLICT (name) DO UPDATE SET archived = $2',
      [jobName, archived]
    );
    return archived;
  }

  /**
   * Get job archived status
   */
  async isJobArchived(jobName) {
    const result = await this.pool.query(
      'SELECT archived FROM jobs WHERE name = $1',
      [jobName]
    );
    return result.rows.length > 0 ? (result.rows[0].archived || false) : false;
  }

  /**
   * Get all job archived statuses
   */
  async getAllJobArchived() {
    const result = await this.pool.query('SELECT name, archived FROM jobs WHERE archived = TRUE');

    const archived = {};
    result.rows.forEach(row => {
      archived[row.name] = row.archived;
    });

    return archived;
  }

  /**
   * Delete all data for a job
   */
  async deleteJobData(jobName) {
    // Count messages to be deleted
    const countResult = await this.pool.query(
      `SELECT COUNT(*) FROM messages m
       JOIN jobs j ON m.job_id = j.id
       WHERE j.name = $1`,
      [jobName]
    );

    const deletedMessages = parseInt(countResult.rows[0].count);

    // Delete job (CASCADE will handle everything)
    await this.pool.query('DELETE FROM jobs WHERE name = $1', [jobName]);

    return deletedMessages;
  }

  /**
   * Rename job in all references
   */
  async renameJobReferences(oldName, newName) {
    await this.pool.query(
      'UPDATE jobs SET name = $1 WHERE name = $2',
      [newName, oldName]
    );
    return true;
  }

  /**
   * Update message chat-pad assignment
   */
  async updateMessageChatpad(messageId, individualChatId) {
    // Extract chat name from format "jobName_chatName"
    const parts = individualChatId.split('_');
    const jobName = parts[0];
    const chatName = parts.slice(1).join('_');

    // Get individual chat DB ID
    const chatResult = await this.pool.query(
      `SELECT ic.id
       FROM individual_chats ic
       JOIN jobs j ON ic.job_id = j.id
       WHERE j.name = $1 AND ic.chat_name = $2`,
      [jobName, chatName]
    );

    if (chatResult.rows.length === 0) {
      throw new Error('Individual chat not found');
    }

    const chatDbId = chatResult.rows[0].id;

    // Update message
    await this.pool.query(
      'UPDATE messages SET individual_chat_id = $1 WHERE id = $2',
      [chatDbId, parseInt(messageId)]
    );

    // Return updated message
    const messages = await this.getMessages({});
    const message = messages.find(m => m.id === messageId.toString());

    return { message };
  }

  /**
   * Get stored job names list (PostgreSQL doesn't store this, returns null)
   */
  /**
   * Add message to Playbook
   */
  async addToPlaybook(messageId, notes, username) {
    const result = await this.pool.query(
      `UPDATE messages 
       SET in_playbook = TRUE, 
           playbook_notes = $2, 
           playbook_verified_by = $3, 
           playbook_verified_at = NOW() 
       WHERE id = $1 
       RETURNING *`,
      [messageId, notes, username]
    );

    if (result.rows.length === 0) {
      throw new Error('Message not found');
    }

    return this.normalizeMessage(result.rows[0]);
  }

  /**
   * Get all Playbook entries
   */
  async getPlaybookEntries() {
    const result = await this.pool.query(
      `SELECT m.*, j.name as job_name, ic.chat_name as individual_chat_name
       FROM messages m
       LEFT JOIN jobs j ON m.job_id = j.id
       LEFT JOIN individual_chats ic ON m.individual_chat_id = ic.id
       WHERE m.in_playbook = TRUE
       ORDER BY m.playbook_verified_at DESC`
    );

    return result.rows.map(row => this.normalizeMessage(row));
  }

  /**
   * Normalize message from database row to frontend format
   */
  normalizeMessage(row) {
    return {
      id: row.id ? row.id.toString() : null,
      username: row.username || row.user || 'Unknown',
      text: row.text || '',
      job_id: row.job_id,
      job_name: row.job_name || null,
      subcategory: row.subcategory || null,
      individual_chat_id: row.individual_chat_id,
      individual_chat_name: row.individual_chat_name || null,
      timestamp: row.timestamp || new Date().toISOString(),
      isProblem: row.is_problem || false,
      isSolved: row.is_solved || false,
      solution: row.solution || '',
      solvedBy: row.solvedby || row.solved_by || '',
      solvedAt: row.solvedat || row.solved_at || null,
      inPlaybook: row.in_playbook || false,
      playbookNotes: row.playbook_notes || '',
      playbookVerifiedBy: row.playbook_verified_by || '',
      playbookVerifiedAt: row.playbook_verified_at || null
    };
  }

  /**
   * Get stored job names list
   */
  async getJobNames() {
    const result = await this.pool.query('SELECT name FROM jobs');
    return result.rows.map(row => row.name);
  }

  /**
   * Set job names list (sync with database)
   */
  async setJobNames(jobNames) {
    // We use a transaction to ensure consistency
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');

      for (const jobName of jobNames) {
        // Insert job if it doesn't exist
        await client.query(
          'INSERT INTO jobs (name) VALUES ($1) ON CONFLICT (name) DO NOTHING',
          [jobName]
        );
      }

      await client.query('COMMIT');
      return true;
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }
  }
}

module.exports = ChatManager;
