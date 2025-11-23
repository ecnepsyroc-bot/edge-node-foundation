/**
 * RAMUS: Chat
 * 
 * Manages chat messages, users, and chat organization
 */

const fs = require('fs');
const path = require('path');
const { defaults } = require('./schemas');
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
      return { ...defaults.database, jobCodes: {}, jobArchived: {}, jobNames: null };
    }

    try {
      const loadedData = JSON.parse(fs.readFileSync(this.dbFilePath, 'utf8'));
      
      // Migrate old format to new format
      let jobSubcategories = loadedData.jobSubcategories || [];
      let individualChats = loadedData.individualChats || [];
      let jobCodes = loadedData.jobCodes || {};
      let jobArchived = loadedData.jobArchived || {};
      let jobNames = loadedData.jobNames || null;
      
      // Convert old object format to array format for jobSubcategories
      if (!Array.isArray(jobSubcategories)) {
        const converted = [];
        for (const [job, hasChatPads] of Object.entries(jobSubcategories)) {
          if (hasChatPads) {
            converted.push({ job, subcategory: 'Chat-pads' });
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
                subcategory: 'Chat-pads',
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
        individualChats: individualChats,
        jobCodes: jobCodes,
        jobArchived: jobArchived,
        jobNames: jobNames
      };
    } catch (err) {
      console.error('Failed to load database, using empty:', err.message);
      return { ...defaults.database, jobCodes: {}, jobArchived: {}, jobNames: null };
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

    if (filters.individualChat !== undefined && filters.individualChat !== null) {
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
   * Clear ALL messages in a context (excludes isProblem/Seeking Solution entries)
   */
  clearAllMessages(job, subcategory, individualChat) {
    const initialLength = this.db.messages.length;
    const targetChat = individualChat === undefined ? null : individualChat;
    
    this.db.messages = this.db.messages.filter(msg => {
      const messageJob = (msg.job && msg.job.trim()) || (msg.job_id && msg.job_id.trim()) || 'General';
      const sameJob = messageJob === job;
      const sameSubcategory = (msg.subcategory || 'Seeking Solution') === subcategory;
      const msgChat = msg.individualChat !== undefined ? msg.individualChat : msg.individual_chat_id;
      const sameChat = (msgChat || null) === targetChat;
      const isQuestion = msg.isProblem === true;
      
      // Only delete if matches context AND is NOT a Question
      const shouldDelete = sameJob && sameSubcategory && sameChat && !isQuestion;
      return !shouldDelete;
    });

    const deletedCount = initialLength - this.db.messages.length;
    this.saveDatabase();
    return deletedCount;
  }

  /**
   * Mark a problem message as solved with solution text
   */
  solveMessage(messageId, solution, username) {
    const message = this.db.messages.find(msg => msg.id === messageId);
    
    if (!message) {
      throw new Error('Message not found');
    }
    
    if (!message.isProblem) {
      throw new Error('Can only solve problem messages');
    }
    
    // Update message with solution
    message.isSolved = true;
    message.solution = solution;
    message.solvedBy = username;
    message.solvedAt = new Date().toISOString();
    
    this.saveDatabase();
    return message;
  }

  /**
   * Add job subcategory (Chat-pads)
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

    // Count and remove messages AND Questions for this job
    const initialCount = this.db.messages.length;
    this.db.messages = this.db.messages.filter(
      m => {
        const msgJob = m.job || m.job_id || '';
        const msgSubcat = m.subcategory || '';
        // Remove if matches job+subcategory OR if it's a Question for this job
        const isMatchingMessage = (msgJob === job && msgSubcat === subcategory);
        const isQuestionForJob = (msgJob === job && m.isProblem === true && m.subcategory === 'Questions');
        return !(isMatchingMessage || isQuestionForJob);
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

    // Count and remove messages in this chat AND associated Questions
    const chatId = `${job}_${chatName}`;
    const initialCount = this.db.messages.length;
    this.db.messages = this.db.messages.filter(
      m => {
        const msgJob = m.job || m.job_id || '';
        const msgSubcat = m.subcategory || '';
        const msgChat = m.individual_chat_id || m.individualChat || '';
        const isMatchingMessage = (msgJob === job && msgSubcat === subcategory && msgChat === chatId);
        // Also remove Questions that were created in this specific chat (they reference the job)
        const isQuestionForChat = (msgJob === job && m.isProblem === true && m.subcategory === 'Questions');
        return !(isMatchingMessage || isQuestionForChat);
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

  /**
   * Set job code
   */
  setJobCode(jobName, code) {
    if (!this.db.jobCodes) {
      this.db.jobCodes = {};
    }
    this.db.jobCodes[jobName] = code;
    this.saveDatabase();
    return code;
  }

  /**
   * Get job code
   */
  getJobCode(jobName) {
    if (!this.db.jobCodes) {
      return '';
    }
    return this.db.jobCodes[jobName] || '';
  }

  /**
   * Get all job codes
   */
  getAllJobCodes() {
    return { ...(this.db.jobCodes || {}) };
  }

  /**
   * Set job archived status
   */
  setJobArchived(jobName, archived) {
    if (!this.db.jobArchived) {
      this.db.jobArchived = {};
    }
    this.db.jobArchived[jobName] = archived;
    this.saveDatabase();
    return archived;
  }

  /**
   * Get job archived status
   */
  isJobArchived(jobName) {
    if (!this.db.jobArchived) {
      return false;
    }
    return this.db.jobArchived[jobName] || false;
  }

  /**
   * Get all job archived statuses
   */
  getAllJobArchived() {
    return { ...(this.db.jobArchived || {}) };
  }

  /**
   * Delete all data for a job
   */
  deleteJobData(jobName) {
    // Remove messages
    const initialMsgCount = this.db.messages.length;
    this.db.messages = this.db.messages.filter(m => {
      const msgJob = m.job || m.job_id || '';
      return msgJob !== jobName;
    });
    const deletedMessages = initialMsgCount - this.db.messages.length;

    // Remove subcategories
    this.db.jobSubcategories = this.db.jobSubcategories.filter(
      js => js.job !== jobName
    );

    // Remove individual chats
    this.db.individualChats = this.db.individualChats.filter(
      ic => ic.job !== jobName
    );

    // Remove job code
    if (this.db.jobCodes && this.db.jobCodes[jobName]) {
      delete this.db.jobCodes[jobName];
    }

    // Remove archived status
    if (this.db.jobArchived && this.db.jobArchived[jobName]) {
      delete this.db.jobArchived[jobName];
    }

    this.saveDatabase();
    return deletedMessages;
  }

  /**
   * Rename job in all references
   */
  renameJobReferences(oldName, newName) {
    // Update messages
    this.db.messages.forEach(msg => {
      if (msg.job === oldName) msg.job = newName;
      if (msg.job_id === oldName) msg.job_id = newName;
    });

    // Update job subcategories
    this.db.jobSubcategories.forEach(js => {
      if (js.job === oldName) js.job = newName;
    });

    // Update individual chats
    this.db.individualChats.forEach(ic => {
      if (ic.job === oldName) ic.job = newName;
    });

    // Update job codes
    if (this.db.jobCodes && this.db.jobCodes[oldName]) {
      this.db.jobCodes[newName] = this.db.jobCodes[oldName];
      delete this.db.jobCodes[oldName];
    }

    // Update archived status
    if (this.db.jobArchived && this.db.jobArchived[oldName] !== undefined) {
      this.db.jobArchived[newName] = this.db.jobArchived[oldName];
      delete this.db.jobArchived[oldName];
    }

    this.saveDatabase();
    return true;
  }

  /**
   * Update message chat-pad assignment
   */
  updateMessageChatpad(messageId, individualChatId) {
    const message = this.db.messages.find(m => m.id === messageId);
    
    if (!message) {
      throw new Error('Message not found');
    }

    message.individual_chat_id = individualChatId;
    message.individualChatId = individualChatId; // Support both formats
    
    this.saveDatabase();
    return { message };
  }

  /**
   * Get stored job names list
   */
  getJobNames() {
    return this.db.jobNames;
  }

  /**
   * Set job names list (called when jobs are modified)
   */
  setJobNames(jobNames) {
    this.db.jobNames = jobNames;
    this.saveDatabase();
  }
}

module.exports = ChatManager;
