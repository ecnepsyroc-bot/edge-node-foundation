/**
 * SAP - Validation & Guardrails
 * 
 * Validates and sanitizes data flowing through the system.
 * Prevents malformed data from corrupting the tree.
 */

const { schemas } = require('../water/schemas');

/**
 * Sanitize text input
 */
function sanitizeText(text) {
  if (typeof text !== 'string') return '';
  
  // Remove control characters except newlines/tabs
  return text
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
    .trim()
    .slice(0, 5000); // Max 5000 chars
}

/**
 * Validate username
 */
function validateUsername(username) {
  if (typeof username !== 'string') return false;
  
  const sanitized = sanitizeText(username);
  return sanitized.length > 0 && sanitized.length <= 50;
}

/**
 * Validate message object
 */
function validateMessage(msg) {
  if (!msg || typeof msg !== 'object') return false;
  
  return (
    typeof msg.id === 'string' &&
    validateUsername(msg.user) &&
    typeof msg.text === 'string' &&
    typeof msg.job === 'string' &&
    typeof msg.timestamp === 'string' &&
    typeof msg.subcategory === 'string' &&
    (msg.individualChat === null || typeof msg.individualChat === 'string') &&
    typeof msg.isProblem === 'boolean'
  );
}

/**
 * Validate job name
 */
function validateJobName(job) {
  if (typeof job !== 'string') return false;
  
  const sanitized = sanitizeText(job);
  return sanitized.length > 0 && sanitized.length <= 100;
}

/**
 * Validate subcategory name
 */
function validateSubcategory(subcategory) {
  if (typeof subcategory !== 'string') return false;
  
  const sanitized = sanitizeText(subcategory);
  return sanitized.length > 0 && sanitized.length <= 100;
}

/**
 * Validate individual chat name
 */
function validateChatName(chatName) {
  if (typeof chatName !== 'string') return false;
  
  const sanitized = sanitizeText(chatName);
  return sanitized.length > 0 && sanitized.length <= 100;
}

/**
 * Validate job subcategory object
 */
function validateJobSubcategory(obj) {
  if (!obj || typeof obj !== 'object') return false;
  
  return (
    validateJobName(obj.job) &&
    validateSubcategory(obj.subcategory)
  );
}

/**
 * Validate individual chat object
 */
function validateIndividualChat(obj) {
  if (!obj || typeof obj !== 'object') return false;
  
  return (
    validateJobName(obj.job) &&
    validateSubcategory(obj.subcategory) &&
    validateChatName(obj.chatName)
  );
}

/**
 * Validate database structure
 */
function validateDatabase(db) {
  if (!db || typeof db !== 'object') return false;
  
  return (
    typeof db.users === 'object' &&
    Array.isArray(db.messages) &&
    Array.isArray(db.jobSubcategories) &&
    Array.isArray(db.individualChats)
  );
}

/**
 * Sanitize message for storage
 */
function sanitizeMessage(msg) {
  const sanitizedUser = sanitizeText(msg.user || msg.username);
  const sanitizedJob = sanitizeText(msg.job || msg.job_id || 'General') || 'General';
  const sanitizedSubcategory = sanitizeText(msg.subcategory || 'Seeking Solution') || 'Seeking Solution';
  const rawIndividualChat =
    msg.individualChat !== undefined ? msg.individualChat : msg.individual_chat_id;
  const sanitizedIndividualChat = rawIndividualChat
    ? sanitizeText(rawIndividualChat)
    : null;
  const sanitizedText = sanitizeText(msg.text);
  const timestamp = msg.timestamp || new Date().toISOString();
  const isProblem =
    typeof msg.isProblem === 'boolean'
      ? msg.isProblem
      : sanitizedText.startsWith('🔴 Seeking Solution:');
  const id = String(msg.id || Date.now());

  return {
    id,
    user: sanitizedUser,
    username: sanitizedUser,
    text: sanitizedText,
    job: sanitizedJob,
    job_id: sanitizedJob,
    timestamp,
    subcategory: sanitizedSubcategory,
    individualChat: sanitizedIndividualChat,
    individual_chat_id: sanitizedIndividualChat,
    isProblem
  };
}

/**
 * Sanitize job subcategory for storage
 */
function sanitizeJobSubcategory(obj) {
  return {
    job: sanitizeText(obj.job),
    subcategory: sanitizeText(obj.subcategory)
  };
}

/**
 * Sanitize individual chat for storage
 */
function sanitizeIndividualChat(obj) {
  return {
    job: sanitizeText(obj.job),
    subcategory: sanitizeText(obj.subcategory),
    chatName: sanitizeText(obj.chatName)
  };
}

module.exports = {
  sanitizeText,
  validateUsername,
  validateMessage,
  validateJobName,
  validateSubcategory,
  validateChatName,
  validateJobSubcategory,
  validateIndividualChat,
  validateDatabase,
  sanitizeMessage,
  sanitizeJobSubcategory,
  sanitizeIndividualChat
};
