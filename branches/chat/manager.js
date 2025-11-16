/**
 * BRANCH: Chat
 * 
 * Manages messages, subcategories, and chat storage/retrieval.
 */

const fs = require('fs');
const path = require('path');
const { defaults } = require('../../water/schemas');
const { sanitizeMessage, sanitizeJobSubcategory, sanitizeIndividualChat } = require('../../sap/validators');

class ChatManager {
  constructor(dbFilePath) {
    this.dbFilePath = dbFilePath;
    this.db = this.loadDatabase();
  }

  /**
   * Load database from disk
   */
  loadDatabase() {
    if (!fs.existsSync(this.dbFilePath)) {
      return { ...defaults.database };
    }

    try {
      const loadedData = JSON.parse(fs.readFileSync(this.dbFilePath, 'utf8'));
      
      // Migrate old format to new format
      let jobSubcategories = loadedData.jobSubcategories || [];
      let individualChats = loadedData.individualChats || [];
      
      // Convert old object format to array format for jobSubcategories
      if (!Array.isArray(jobSubcategories)) {
        const converted = [];
        for (const [job, hasFactoryOrder] of Object.entries(jobSubcategories)) {
          if (hasFactoryOrder) {
            converted.push({ job, subcategory: 'Factory Order' });
          }
        }
        jobSubcategories = converted;
      }
      
      // Convert old object format to array format for individualChats
      if (!Array.isArray(individualChats)) {
        const converted = [];
        for (const [job, chats] of Object.entries(individualChats)) {
          if (Array.isArray(chats)) {
            chats.forEach(chat => {
              converted.push({
                job: job,
                subcategory: 'Factory Order',
                chatName: chat.name || chat.chatName || 'Unnamed'
              });
            });
          }
        }
        individualChats = converted;
      }
      
      // Defensive merge to preserve backward compatibility
      return {
        users: loadedData.users || {},
        messages: loadedData.messages || [],
        jobSubcategories: jobSubcategories,
        individualChats: individualChats
      };
    } catch (err) {
      console.error('Failed to load database, using empty:', err.message);
      return { ...defaults.database };
    }
  }

  /**
   * Save database to disk
   */
  saveDatabase() {
    try {
      fs.writeFileSync(this.dbFilePath, JSON.stringify(this.db, null, 2));
    } catch (err) {
      console.error('Failed to save database:', err.message);
    }
  }

  /**
   * Add a message
   */
  addMessage(msgData) {
    const message = sanitizeMessage(msgData);
    this.db.messages.push(message);
    this.saveDatabase();
    return message;
  }

  /**
   * Get messages for a job/subcategory/chat
   */
  getMessages(filters = {}) {
    let messages = [...this.db.messages];

    if (filters.job) {
      messages = messages.filter(m => m.job === filters.job);
    }

    if (filters.subcategory) {
      messages = messages.filter(m => m.subcategory === filters.subcategory);
    }

    if (filters.individualChat !== undefined) {
      messages = messages.filter(m => m.individualChat === filters.individualChat);
    }

    if (filters.isProblem !== undefined) {
      messages = messages.filter(m => m.isProblem === filters.isProblem);
    }

    return messages;
  }

  /**
   * Delete messages by user (excludes isProblem messages)
   */
  deleteMessagesByUser(username, job, subcategory, individualChat) {
    const initialLength = this.db.messages.length;
    const targetChat = individualChat === undefined ? null : individualChat;
    
    this.db.messages = this.db.messages.filter(msg => {
      const sameUser = (msg.user || msg.username || '').trim() === username;
      const messageJob = (msg.job && msg.job.trim()) || (msg.job_id && msg.job_id.trim()) || 'General';
      const sameJob = messageJob === job;
      const sameSubcategory = (msg.subcategory || 'Seeking Solution') === subcategory;
      const msgChat = msg.individualChat !== undefined ? msg.individualChat : msg.individual_chat_id;
      const sameChat = (msgChat || null) === targetChat;
      const isProblem = msg.isProblem === true;
      
      // Only delete if matches AND is not a problem
      const shouldDelete = sameUser && sameJob && sameSubcategory && sameChat && !isProblem;
      return !shouldDelete;
    });

    const deleted = initialLength - this.db.messages.length;
    this.saveDatabase();
    return deleted;
  }

  /**
   * Delete a single message by ID
   */
  deleteMessageById(messageId) {
    const initialLength = this.db.messages.length;
    this.db.messages = this.db.messages.filter(msg => msg.id !== messageId);
    const deleted = initialLength - this.db.messages.length;
    this.saveDatabase();
    return deleted > 0;
  }

  /**
   * Add job subcategory (Factory Order)
   */
  addJobSubcategory(job, subcategory) {
    const data = sanitizeJobSubcategory({ job, subcategory });
    
    // Check if already exists
    const exists = this.db.jobSubcategories.some(
      js => js.job === data.job && js.subcategory === data.subcategory
    );

    if (!exists) {
      this.db.jobSubcategories.push(data);
      this.saveDatabase();
    }

    return data;
  }

  /**
   * Get job subcategories
   */
  getJobSubcategories(job) {
    return this.db.jobSubcategories.filter(js => js.job === job);
  }

  /**
   * Delete job subcategory and all related data
   */
  deleteJobSubcategory(job, subcategory) {
    // Remove subcategory
    this.db.jobSubcategories = this.db.jobSubcategories.filter(
      js => !(js.job === job && js.subcategory === subcategory)
    );

    // Remove individual chats
    this.db.individualChats = this.db.individualChats.filter(
      ic => !(ic.job === job && ic.subcategory === subcategory)
    );

    // Count and remove messages
    const initialCount = this.db.messages.length;
    this.db.messages = this.db.messages.filter(
      m => {
        const msgJob = m.job || m.job_id || '';
        const msgSubcat = m.subcategory || '';
        return !(msgJob === job && msgSubcat === subcategory);
      }
    );
    const deletedCount = initialCount - this.db.messages.length;

    this.saveDatabase();
    return deletedCount;
  }

  /**
   * Add individual chat
   */
  addIndividualChat(job, subcategory, chatName) {
    const data = sanitizeIndividualChat({ job, subcategory, chatName });
    
    // Check if already exists
    const exists = this.db.individualChats.some(
      ic => ic.job === data.job && 
            ic.subcategory === data.subcategory && 
            ic.chatName === data.chatName
    );

    if (!exists) {
      this.db.individualChats.push(data);
      this.saveDatabase();
    }

    return data;
  }

  /**
   * Get individual chats
   */
  getIndividualChats(job, subcategory) {
    return this.db.individualChats.filter(
      ic => ic.job === job && ic.subcategory === subcategory
    );
  }

  /**
   * Delete a single individual chat
   */
  deleteIndividualChat(job, subcategory, chatName) {
    // Remove the chat
    this.db.individualChats = this.db.individualChats.filter(
      ic => !(ic.job === job && ic.subcategory === subcategory && ic.chatName === chatName)
    );

    // Count and remove messages in this chat
    const chatId = `${job}_${chatName}`;
    const initialCount = this.db.messages.length;
    this.db.messages = this.db.messages.filter(
      m => {
        const msgJob = m.job || m.job_id || '';
        const msgSubcat = m.subcategory || '';
        const msgChat = m.individual_chat_id || m.individualChat || '';
        return !(msgJob === job && msgSubcat === subcategory && msgChat === chatId);
      }
    );
    const deletedCount = initialCount - this.db.messages.length;

    this.saveDatabase();
    return deletedCount;
  }

  /**
   * Register or update user
   */
  registerUser(username) {
    if (!this.db.users[username]) {
      this.db.users[username] = {
        lastSeen: new Date().toISOString()
      };
      this.saveDatabase();
    }
    return this.db.users[username];
  }

  /**
   * Get all users
   */
  getUsers() {
    return { ...this.db.users };
  }
}

module.exports = ChatManager;
