/**
 * GRAFT: Chat ↔ Jobs (PostgreSQL async)
 * 
 * Connects chat management to job management
 */

class ChatJobsGraft {
  constructor(chatManager, jobsManager) {
    this.chat = chatManager;
    this.jobs = jobsManager;
  }

  /**
   * Add message with job validation
   */
  async addMessage(msgData) {
    if (!this.jobs.jobExists(msgData.job)) {
      throw new Error(`Job "${msgData.job}" does not exist`);
    }

    return await this.chat.addMessage(msgData);
  }

  /**
   * Create subcategory with validation
   */
  async createSubcategory(job, subcategory) {
    if (!this.jobs.jobExists(job)) {
      throw new Error(`Job "${job}" does not exist`);
    }

    if (!this.jobs.validateSubcategoryName(subcategory)) {
      throw new Error('Invalid subcategory name');
    }

    return await this.chat.addJobSubcategory(job, subcategory);
  }

  /**
   * Create individual chat with validation
   */
  async createIndividualChat(job, subcategory, chatName) {
    if (!this.jobs.jobExists(job)) {
      throw new Error(`Job "${job}" does not exist`);
    }

    if (!this.jobs.validateChatName(chatName)) {
      throw new Error('Invalid chat name');
    }

    return await this.chat.addIndividualChat(job, subcategory, chatName);
  }

  /**
   * Get all jobs with their subcategories
   */
  async getJobsWithSubcategories() {
    const jobs = this.jobs.getAllJobs();
    const jobCodes = await this.chat.getAllJobCodes();
    const jobArchived = await this.chat.getAllJobArchived();
    
    const jobsWithSubcats = [];
    for (const job of jobs) {
      const subcategories = await this.chat.getJobSubcategories(job);
      jobsWithSubcats.push({
        name: job,
        code: jobCodes[job] || '',
        archived: jobArchived[job] || false,
        subcategories: subcategories,
        defaultSubcategory: this.jobs.getDefaultSubcategory()
      });
    }
    
    return jobsWithSubcats;
  }

  /**
   * Rename job and update all references
   */
  async renameJob(oldName, newName) {
    // Rename in jobs list
    this.jobs.renameJob(oldName, newName);
    
    // Update all chat references
    await this.chat.renameJobReferences(oldName, newName);
    
    return { oldName, newName };
  }

  /**
   * Set job archived status
   */
  async archiveJob(jobName, archived) {
    if (!this.jobs.jobExists(jobName)) {
      throw new Error(`Job "${jobName}" does not exist`);
    }
    
    await this.chat.setJobArchived(jobName, archived);
    return { jobName, archived };
  }

  /**
   * Delete job and all associated data
   */
  async deleteJob(jobName) {
    if (!this.jobs.jobExists(jobName)) {
      throw new Error(`Job "${jobName}" does not exist`);
    }
    
    // Delete from chat manager (removes all messages, chats, etc.)
    const deletedMessages = await this.chat.deleteJobData(jobName);
    
    // Delete from jobs manager
    this.jobs.deleteJob(jobName);
    
    return { jobName, deletedMessages };
  }
}

module.exports = ChatJobsGraft;
