/**
 * RAMUS: Jobs
 * 
 * Manages job listings, subcategories, and individual chats.
 */

const { defaults } = require('../chat/schemas');
const { validateJobName, validateSubcategory, validateChatName } = require('../../sap/validators');

class JobsManager {
  constructor(chatManager = null) {
    // Jobs will be loaded asynchronously via initialize()
    this.jobs = [];
    this.chatManager = chatManager;
    this.defaultSubcategory = defaults.defaultSubcategory;
    this.initialized = false;
  }

  /**
   * Initialize jobs from database (async)
   */
  async initialize() {
    if (this.initialized) return;
    
    if (this.chatManager) {
      try {
        const storedJobs = await this.chatManager.getJobNames();
        this.jobs = storedJobs && storedJobs.length > 0 ? [...storedJobs] : [...defaults.predefinedJobs];
        
        // If we loaded from defaults, save them
        if (!storedJobs || storedJobs.length === 0) {
          await this.chatManager.setJobNames(this.jobs);
        }
      } catch (error) {
        console.error('Failed to load jobs from database:', error);
        this.jobs = [...defaults.predefinedJobs];
      }
    } else {
      this.jobs = [...defaults.predefinedJobs];
    }
    
    this.initialized = true;
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
