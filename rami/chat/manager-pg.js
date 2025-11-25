/**
 * RAMUS: Chat Manager (PostgreSQL)
 * 
 * Manages chat messages, users, and chat organization using PostgreSQL
 */

const pool = require('../database/connection');
const { sanitizeMessage, sanitizeJobSubcategory, sanitizeIndividualChat } = require('../../sap/validators');

class ChatManager {
  constructor() {
    this.pool = pool;
  }

  /**
   * Add a message
   */
  async addMessage(msgData) {
    const message = sanitizeMessage(msgData);
    const client = await this.pool.connect();
    
    try {
      await client.query('BEGIN');
      
      // Get or create user
      const userResult = await client.query(
        'SELECT id FROM users WHERE username = $1',
        [message.username]
      );
      
      let userId;
      if (userResult.rows.length === 0) {
        const insertUser = await client.query(
          'INSERT INTO users (username, last_seen) VALUES ($1, $2) RETURNING id',
          [message.username, new Date()]
        );
        userId = insertUser.rows[0].id;
      } else {
        userId = userResult.rows[0].id;
        // Update last seen
        await client.query(
          'UPDATE users SET last_seen = $1 WHERE id = $2',
          [new Date(), userId]
        );
      }
      
      // Get or create job
      const jobResult = await client.query(
        'SELECT id FROM jobs WHERE name = $1',
        [message.job]
      );
      
      let jobId;
      if (jobResult.rows.length === 0) {
        const insertJob = await client.query(
          'INSERT INTO jobs (name) VALUES ($1) RETURNING id',
          [message.job]
        );
        jobId = insertJob.rows[0].id;
      } else {
        jobId = jobResult.rows[0].id;
      }
      
      // Get subcategory ID if exists
      let subcategoryId = null;
      if (message.subcategory) {
        const subcatResult = await client.query(
          'SELECT id FROM subcategories WHERE job_id = $1 AND name = $2',
          [jobId, message.subcategory]
        );
        if (subcatResult.rows.length > 0) {
          subcategoryId = subcatResult.rows[0].id;
        }
      }
      
      // Get individual chat ID if exists
      let chatId = null;
      if (message.individualChat) {
        const chatName = message.individualChat.replace(`${message.job}_`, '');
        const chatResult = await client.query(
          'SELECT id FROM individual_chats WHERE job_id = $1 AND chat_name = $2',
          [jobId, chatName]
        );
        if (chatResult.rows.length > 0) {
          chatId = chatResult.rows[0].id;
        }
      }
      
      // Insert message
      const result = await client.query(
        `INSERT INTO messages 
         (user_id, job_id, subcategory_id, individual_chat_id, text, timestamp, is_problem, is_solved)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8) 
         RETURNING id`,
        [
          userId,
          jobId,
          subcategoryId,
          chatId,
          message.text,
          message.timestamp,
          message.isProblem || false,
          message.isSolved || false
        ]
      );
      
      await client.query('COMMIT');
      
      return { ...message, id: result.rows[0].id.toString() };
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  /**
   * Get messages for a job/subcategory/chat
   */
  async getMessages(filters = {}) {
    let query = `
      SELECT m.id, m.text, m.timestamp, m.is_problem as "isProblem", 
             m.is_solved as "isSolved", m.solution, m.solved_at as "solvedAt",
             u.username, j.name as job, s.name as subcategory,
             ic.chat_name as "chatName", su.username as "solvedBy"
      FROM messages m
      JOIN users u ON m.user_id = u.id
      JOIN jobs j ON m.job_id = j.id
      LEFT JOIN subcategories s ON m.subcategory_id = s.id
      LEFT JOIN individual_chats ic ON m.individual_chat_id = ic.id
      LEFT JOIN users su ON m.solved_by_user_id = su.id
      WHERE 1=1
    `;
    
    const params = [];
    
    if (filters.job) {
      params.push(filters.job);
      query += ` AND j.name = $${params.length}`;
    }
    
    if (filters.subcategory) {
      params.push(filters.subcategory);
      query += ` AND s.name = $${params.length}`;
    }
    
    if (filters.individualChat !== undefined) {
      if (filters.individualChat === null) {
        query += ' AND m.individual_chat_id IS NULL';
      } else {
        const chatName = filters.individualChat.replace(`${filters.job}_`, '');
        params.push(chatName);
        query += ` AND ic.chat_name = $${params.length}`;
      }
    }
    
    if (filters.isProblem !== undefined) {
      params.push(filters.isProblem);
      query += ` AND m.is_problem = $${params.length}`;
    }
    
    query += ' ORDER BY m.timestamp ASC';
    
    const result = await this.pool.query(query, params);
    
    // Transform to match old format
    return result.rows.map(row => ({
      id: row.id.toString(),
      user: row.username,
      username: row.username,
      text: row.text,
      job: row.job,
      job_id: row.job,
      timestamp: row.timestamp,
      subcategory: row.subcategory || 'Seeking Solution',
      individualChat: row.chatName ? `${row.job}_${row.chatName}` : null,
      individual_chat_id: row.chatName ? `${row.job}_${row.chatName}` : null,
      isProblem: row.isProblem,
      isSolved: row.isSolved,
      solution: row.solution,
      solvedBy: row.solvedBy,
      solvedAt: row.solvedAt
    }));
  }

  /**
   * Delete messages by user (excludes isProblem messages)
   */
  async deleteMessagesByUser(username, job, subcategory, individualChat) {
    const client = await this.pool.connect();
    
    try {
      let query = `
        DELETE FROM messages
        WHERE user_id = (SELECT id FROM users WHERE username = $1)
        AND job_id = (SELECT id FROM jobs WHERE name = $2)
        AND is_problem = false
      `;
      
      const params = [username, job];
      
      if (subcategory) {
        params.push(subcategory);
        query += ` AND subcategory_id = (SELECT id FROM subcategories WHERE job_id = (SELECT id FROM jobs WHERE name = $2) AND name = $${params.length})`;
      }
      
      if (individualChat !== undefined) {
        if (individualChat === null) {
          query += ' AND individual_chat_id IS NULL';
        } else {
          const chatName = individualChat.replace(`${job}_`, '');
          params.push(chatName);
          query += ` AND individual_chat_id = (SELECT id FROM individual_chats WHERE job_id = (SELECT id FROM jobs WHERE name = $2) AND chat_name = $${params.length})`;
        }
      }
      
      const result = await client.query(query, params);
      return result.rowCount;
    } finally {
      client.release();
    }
  }

  /**
   * Delete a single message by ID
   */
  async deleteMessageById(messageId) {
    const result = await this.pool.query(
      'DELETE FROM messages WHERE id = $1',
      [parseInt(messageId)]
    );
    return result.rowCount > 0;
  }

  /**
   * Clear ALL messages in a context (excludes isProblem messages)
   */
  async clearAllMessages(job, subcategory, individualChat) {
    const client = await this.pool.connect();
    
    try {
      let query = `
        DELETE FROM messages
        WHERE job_id = (SELECT id FROM jobs WHERE name = $1)
        AND is_problem = false
      `;
      
      const params = [job];
      
      if (subcategory) {
        params.push(subcategory);
        query += ` AND subcategory_id = (SELECT id FROM subcategories WHERE job_id = (SELECT id FROM jobs WHERE name = $1) AND name = $${params.length})`;
      }
      
      if (individualChat !== undefined) {
        if (individualChat === null) {
          query += ' AND individual_chat_id IS NULL';
        } else {
          const chatName = individualChat.replace(`${job}_`, '');
          params.push(chatName);
          query += ` AND individual_chat_id = (SELECT id FROM individual_chats WHERE job_id = (SELECT id FROM jobs WHERE name = $1) AND chat_name = $${params.length})`;
        }
      }
      
      const result = await client.query(query, params);
      return result.rowCount;
    } finally {
      client.release();
    }
  }

  /**
   * Mark a problem message as solved with solution text
   */
  async solveMessage(messageId, solution, username) {
    const client = await this.pool.connect();
    
    try {
      await client.query('BEGIN');
      
      // Get user ID
      const userResult = await client.query(
        'SELECT id FROM users WHERE username = $1',
        [username]
      );
      
      if (userResult.rows.length === 0) {
        throw new Error('User not found');
      }
      
      const userId = userResult.rows[0].id;
      
      // Update message
      const result = await client.query(
        `UPDATE messages 
         SET is_solved = true, solution = $1, solved_by_user_id = $2, solved_at = $3
         WHERE id = $4 AND is_problem = true
         RETURNING *`,
        [solution, userId, new Date(), parseInt(messageId)]
      );
      
      if (result.rows.length === 0) {
        throw new Error('Message not found or not a problem message');
      }
      
      await client.query('COMMIT');
      
      const row = result.rows[0];
      return {
        id: row.id.toString(),
        isSolved: row.is_solved,
        solution: row.solution,
        solvedBy: username,
        solvedAt: row.solved_at
      };
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  /**
   * Add job subcategory
   */
  async addJobSubcategory(job, subcategory) {
    const data = sanitizeJobSubcategory({ job, subcategory });
    const client = await this.pool.connect();
    
    try {
      await client.query('BEGIN');
      
      // Get or create job
      const jobResult = await client.query(
        'SELECT id FROM jobs WHERE name = $1',
        [data.job]
      );
      
      let jobId;
      if (jobResult.rows.length === 0) {
        const insertJob = await client.query(
          'INSERT INTO jobs (name) VALUES ($1) RETURNING id',
          [data.job]
        );
        jobId = insertJob.rows[0].id;
      } else {
        jobId = jobResult.rows[0].id;
      }
      
      // Insert subcategory if not exists
      await client.query(
        'INSERT INTO subcategories (job_id, name) VALUES ($1, $2) ON CONFLICT (job_id, name) DO NOTHING',
        [jobId, data.subcategory]
      );
      
      await client.query('COMMIT');
      return data;
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  /**
   * Get job subcategories
   */
  async getJobSubcategories(job) {
    const result = await this.pool.query(
      `SELECT s.name as subcategory, j.name as job
       FROM subcategories s
       JOIN jobs j ON s.job_id = j.id
       WHERE j.name = $1`,
      [job]
    );
    
    return result.rows;
  }

  /**
   * Delete job subcategory and all related data
   */
  async deleteJobSubcategory(job, subcategory) {
    const client = await this.pool.connect();
    
    try {
      await client.query('BEGIN');
      
      // Count messages to be deleted
      const countResult = await client.query(
        `SELECT COUNT(*) as count FROM messages 
         WHERE subcategory_id = (
           SELECT id FROM subcategories 
           WHERE job_id = (SELECT id FROM jobs WHERE name = $1) 
           AND name = $2
         )`,
        [job, subcategory]
      );
      
      const deletedCount = parseInt(countResult.rows[0].count);
      
      // Delete subcategory (CASCADE will handle messages, chats)
      await client.query(
        `DELETE FROM subcategories 
         WHERE job_id = (SELECT id FROM jobs WHERE name = $1) 
         AND name = $2`,
        [job, subcategory]
      );
      
      await client.query('COMMIT');
      return deletedCount;
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  /**
   * Add individual chat
   */
  async addIndividualChat(job, subcategory, chatName) {
    const data = sanitizeIndividualChat({ job, subcategory, chatName });
    const client = await this.pool.connect();
    
    try {
      await client.query('BEGIN');
      
      // Get or create job
      const jobResult = await client.query(
        'SELECT id FROM jobs WHERE name = $1',
        [data.job]
      );
      
      let jobId;
      if (jobResult.rows.length === 0) {
        const insertJob = await client.query(
          'INSERT INTO jobs (name) VALUES ($1) RETURNING id',
          [data.job]
        );
        jobId = insertJob.rows[0].id;
      } else {
        jobId = jobResult.rows[0].id;
      }
      
      // Get or create subcategory
      const subcatResult = await client.query(
        'SELECT id FROM subcategories WHERE job_id = $1 AND name = $2',
        [jobId, data.subcategory]
      );
      
      let subcategoryId;
      if (subcatResult.rows.length === 0) {
        const insertSubcat = await client.query(
          'INSERT INTO subcategories (job_id, name) VALUES ($1, $2) RETURNING id',
          [jobId, data.subcategory]
        );
        subcategoryId = insertSubcat.rows[0].id;
      } else {
        subcategoryId = subcatResult.rows[0].id;
      }
      
      // Insert individual chat if not exists
      await client.query(
        'INSERT INTO individual_chats (job_id, subcategory_id, chat_name) VALUES ($1, $2, $3) ON CONFLICT (job_id, subcategory_id, chat_name) DO NOTHING',
        [jobId, subcategoryId, data.chatName]
      );
      
      await client.query('COMMIT');
      return data;
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  /**
   * Get individual chats
   */
  async getIndividualChats(job, subcategory) {
    const result = await this.pool.query(
      `SELECT ic.chat_name as "chatName", j.name as job, s.name as subcategory
       FROM individual_chats ic
       JOIN jobs j ON ic.job_id = j.id
       JOIN subcategories s ON ic.subcategory_id = s.id
       WHERE j.name = $1 AND s.name = $2`,
      [job, subcategory]
    );
    
    return result.rows;
  }

  /**
   * Delete a single individual chat
   */
  async deleteIndividualChat(job, subcategory, chatName) {
    const client = await this.pool.connect();
    
    try {
      await client.query('BEGIN');
      
      // Count messages to be deleted
      const countResult = await client.query(
        `SELECT COUNT(*) as count FROM messages 
         WHERE individual_chat_id = (
           SELECT id FROM individual_chats 
           WHERE job_id = (SELECT id FROM jobs WHERE name = $1)
           AND subcategory_id = (SELECT id FROM subcategories WHERE job_id = (SELECT id FROM jobs WHERE name = $1) AND name = $2)
           AND chat_name = $3
         )`,
        [job, subcategory, chatName]
      );
      
      const deletedCount = parseInt(countResult.rows[0].count);
      
      // Delete chat (CASCADE will handle messages)
      await client.query(
        `DELETE FROM individual_chats 
         WHERE job_id = (SELECT id FROM jobs WHERE name = $1)
         AND subcategory_id = (SELECT id FROM subcategories WHERE job_id = (SELECT id FROM jobs WHERE name = $1) AND name = $2)
         AND chat_name = $3`,
        [job, subcategory, chatName]
      );
      
      await client.query('COMMIT');
      return deletedCount;
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  /**
   * Register or update user
   */
  async registerUser(username) {
    const result = await this.pool.query(
      `INSERT INTO users (username, last_seen) 
       VALUES ($1, $2) 
       ON CONFLICT (username) 
       DO UPDATE SET last_seen = $2
       RETURNING *`,
      [username, new Date()]
    );
    
    return {
      lastSeen: result.rows[0].last_seen
    };
  }

  /**
   * Get all users
   */
  async getUsers() {
    const result = await this.pool.query(
      'SELECT username, last_seen as "lastSeen" FROM users ORDER BY last_seen DESC'
    );
    
    const users = {};
    result.rows.forEach(row => {
      users[row.username] = {
        lastSeen: row.lastSeen
      };
    });
    
    return users;
  }

  /**
   * Load database (compatibility method - no-op for PostgreSQL)
   */
  loadDatabase() {
    console.log('Database loaded successfully');
    return {};
  }

  /**
   * Save database (compatibility method - no-op for PostgreSQL)
   */
  saveDatabase() {
    // No-op for PostgreSQL - data is saved on each operation
  }
}

module.exports = ChatManager;
