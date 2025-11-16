/**
 * BRANCH: Jobs
 * 
 * Manages job listings, subcategories, and individual chats.
 */

const { defaults } = require('../../water/schemas');
const { validateJobName, validateSubcategory, validateChatName } = require('../../sap/validators');

class JobsManager {
  constructor() {
    this.jobs = [...defaults.predefinedJobs];
    this.defaultSubcategory = defaults.defaultSubcategory;
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
