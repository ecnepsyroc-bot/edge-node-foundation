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
    
    return jobs.map(job => ({
      name: job,
      subcategories: this.chat.getJobSubcategories(job),
      defaultSubcategory: this.jobs.getDefaultSubcategory()
    }));
  }
}

module.exports = ChatJobsGraft;
