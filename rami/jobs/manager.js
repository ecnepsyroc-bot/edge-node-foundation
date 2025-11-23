/**
 * RAMUS: Jobs
 * 
 * Manages job listings, subcategories, and individual chats.
 */

const { defaults } = require('../chat/schemas');
const { validateJobName, validateSubcategory, validateChatName } = require('../../sap/validators');

class JobsManager {
  constructor(chatManager = null) {
    // Load jobs from database if available, otherwise use defaults
    const storedJobs = chatManager ? chatManager.getJobNames() : null;
    this.jobs = storedJobs ? [...storedJobs] : [...defaults.predefinedJobs];
    this.chatManager = chatManager;
    this.defaultSubcategory = defaults.defaultSubcategory;
    
    // If we loaded from defaults and have a chatManager, save the initial list
    if (!storedJobs && chatManager) {
      chatManager.setJobNames(this.jobs);
    }
  }

  /**
   * Get all jobs
   */
  getAllJobs() {
    return [...this.jobs];
  }

  /**
   * Add a new job
   */
  addJob(jobName) {
    if (!validateJobName(jobName)) {
      throw new Error('Invalid job name');
    }

    if (this.jobs.includes(jobName)) {
      throw new Error('Job already exists');
    }

    this.jobs.push(jobName);
    if (this.chatManager) {
      this.chatManager.setJobNames(this.jobs);
    }
    return jobName;
  }

  /**
   * Rename a job
   */
  renameJob(oldName, newName) {
    if (!validateJobName(newName)) {
      throw new Error('Invalid job name');
    }

    if (!this.jobs.includes(oldName)) {
      throw new Error('Job does not exist');
    }

    if (this.jobs.includes(newName)) {
      throw new Error('Job with new name already exists');
    }

    const index = this.jobs.indexOf(oldName);
    this.jobs[index] = newName;
    if (this.chatManager) {
      this.chatManager.setJobNames(this.jobs);
    }
    return newName;
  }

  /**
   * Delete a job
   */
  deleteJob(jobName) {
    if (!this.jobs.includes(jobName)) {
      throw new Error('Job does not exist');
    }

    this.jobs = this.jobs.filter(j => j !== jobName);
    if (this.chatManager) {
      this.chatManager.setJobNames(this.jobs);
    }
    return jobName;
  }

  /**
   * Check if job exists
   */
  jobExists(jobName) {
    return this.jobs.includes(jobName);
  }

  /**
   * Get default subcategory
   */
  getDefaultSubcategory() {
    return this.defaultSubcategory;
  }

  /**
   * Validate subcategory name
   */
  validateSubcategoryName(name) {
    return validateSubcategory(name);
  }

  /**
   * Validate chat name
   */
  validateChatName(name) {
    return validateChatName(name);
  }
}

module.exports = JobsManager;
