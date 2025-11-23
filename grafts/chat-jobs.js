/**
 * GRAFT: Chat ↔ Jobs
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
  addMessage(msgData) {
    if (!this.jobs.jobExists(msgData.job)) {
      throw new Error(`Job "${msgData.job}" does not exist`);
    }

    return this.chat.addMessage(msgData);
  }

  /**
   * Create subcategory with validation
   */
  createSubcategory(job, subcategory) {
    if (!this.jobs.jobExists(job)) {
      throw new Error(`Job "${job}" does not exist`);
    }

    if (!this.jobs.validateSubcategoryName(subcategory)) {
      throw new Error('Invalid subcategory name');
    }

    return this.chat.addJobSubcategory(job, subcategory);
  }

  /**
   * Create individual chat with validation
   */
  createIndividualChat(job, subcategory, chatName) {
    if (!this.jobs.jobExists(job)) {
      throw new Error(`Job "${job}" does not exist`);
    }

    if (!this.jobs.validateChatName(chatName)) {
      throw new Error('Invalid chat name');
    }

    return this.chat.addIndividualChat(job, subcategory, chatName);
  }

  /**
   * Get all jobs with their subcategories
   */
  getJobsWithSubcategories() {
    const jobs = this.jobs.getAllJobs();
    const jobCodes = this.chat.getAllJobCodes();
    const jobArchived = this.chat.getAllJobArchived();
    
    return jobs.map(job => ({
      name: job,
      code: jobCodes[job] || '',
      archived: jobArchived[job] || false,
      subcategories: this.chat.getJobSubcategories(job),
      defaultSubcategory: this.jobs.getDefaultSubcategory()
    }));
  }

  /**
   * Rename job and update all references
   */
  renameJob(oldName, newName) {
    // Rename in jobs list
    this.jobs.renameJob(oldName, newName);
    
    // Update all chat references
    this.chat.renameJobReferences(oldName, newName);
    
    return { oldName, newName };
  }

  /**
   * Set job archived status
   */
  archiveJob(jobName, archived) {
    if (!this.jobs.jobExists(jobName)) {
      throw new Error(`Job "${jobName}" does not exist`);
    }
    
    this.chat.setJobArchived(jobName, archived);
    return { jobName, archived };
  }

  /**
   * Delete job and all associated data
   */
  deleteJob(jobName) {
    if (!this.jobs.jobExists(jobName)) {
      throw new Error(`Job "${jobName}" does not exist`);
    }
    
    // Delete from chat manager (removes all messages, chats, etc.)
    const deletedMessages = this.chat.deleteJobData(jobName);
    
    // Delete from jobs manager
    this.jobs.deleteJob(jobName);
    
    return { jobName, deletedMessages };
  }
}

module.exports = ChatJobsGraft;
