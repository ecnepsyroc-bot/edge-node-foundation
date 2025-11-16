/**
 * LUXIFY TREE ORCHESTRATOR
 * 
 * This file assembles branches via grafts to create the complete system.
 * The heavy lifting is done by modular branches connected through grafts.
 */

const path = require('path');

// Load Branches
const ServerManager = require('./branches/server/manager');
const ChatManager = require('./branches/chat/manager');
const JobsManager = require('./branches/jobs/manager');
const NLPProcessor = require('./branches/nlp/processor');

// Load Grafts
const ServerChatGraft = require('./grafts/server-chat');
const ChatJobsGraft = require('./grafts/chat-jobs');
const UINLPGraft = require('./grafts/ui-nlp');

// Configuration
const PORT = 3000;
const DB_FILE = path.join(__dirname, 'chat-data.json');
const PUBLIC_DIR = path.join(__dirname, 'branches', 'ui', 'public');

// Initialize Branches
const serverManager = new ServerManager(PORT, PUBLIC_DIR);
const chatManager = new ChatManager(DB_FILE);
const jobsManager = new JobsManager();
const nlpProcessor = new NLPProcessor();

// Connect Branches via Grafts
const serverChatGraft = new ServerChatGraft(serverManager, chatManager);
const chatJobsGraft = new ChatJobsGraft(chatManager, jobsManager);
const uiNLPGraft = new UINLPGraft(nlpProcessor);

/**
 * HTTP Request Handler (assembled from grafts)
 */
function handleHTTPRequest(req, res) {
  // Try server-chat graft endpoints
  if (serverChatGraft.handleHTTPRequest(req, res)) {
    return;
  }

  // Try ui-nlp graft endpoints
  if (uiNLPGraft.handleNLPRequest(req, res, serverManager)) {
    return;
  }

  // Jobs endpoint
  if (req.url === '/api/jobs' && req.method === 'GET') {
    const jobs = chatJobsGraft.getJobsWithSubcategories();
    serverManager.sendJSON(res, 200, { jobs });
    return;
  }

  // Job subcategories endpoint
  if (req.url.match(/^\/api\/jobs\/[^\/]+\/subcategories$/) && req.method === 'GET') {
    const jobName = decodeURIComponent(req.url.split('/')[3]);
    const subcategories = chatManager.getJobSubcategories(jobName);
    const hasFactoryOrder = subcategories.some(s => s.subcategory === 'Factory Order');
    serverManager.sendJSON(res, 200, { hasFactoryOrder, subcategories });
    return;
  }

  // Create subcategory endpoint
  if (req.url.match(/^\/api\/jobs\/[^\/]+\/subcategories$/) && req.method === 'POST') {
    const jobName = decodeURIComponent(req.url.split('/')[3]);
    serverManager.parseBody(req, (err, data) => {
      if (err || !data.subcategory) {
        serverManager.sendJSON(res, 400, { error: 'Subcategory required' });
        return;
      }
      try {
        chatJobsGraft.createSubcategory(jobName, data.subcategory);
        serverManager.sendJSON(res, 200, { success: true });
        
        // Broadcast to all clients
        serverManager.broadcast({
          type: 'subcategory_created',
          job_id: jobName,
          subcategory: data.subcategory
        });
      } catch (error) {
        serverManager.sendJSON(res, 400, { error: error.message });
      }
    });
    return;
  }

  // Delete subcategory endpoint (Factory Order)
  if (req.url.match(/^\/api\/jobs\/[^\/]+\/subcategories$/) && req.method === 'DELETE') {
    const jobName = decodeURIComponent(req.url.split('/')[3]);
    
    // Delete Factory Order subcategory and all related data
    const deleted = chatManager.deleteJobSubcategory(jobName, 'Factory Order');
    
    serverManager.sendJSON(res, 200, { 
      success: true, 
      deletedMessages: deleted 
    });
    
    // Broadcast to all clients
    serverManager.broadcast({
      type: 'factory_order_deleted',
      jobId: jobName,
      subcategory: 'Factory Order'
    });
    
    return;
  }

  // Create individual chat endpoint
  if (req.url.match(/^\/api\/jobs\/[^\/]+\/chats$/) && req.method === 'POST') {
    const jobName = decodeURIComponent(req.url.split('/')[3]);
    serverManager.parseBody(req, (err, data) => {
      if (err || !data.chatName) {
        serverManager.sendJSON(res, 400, { error: 'Chat name required' });
        return;
      }
      try {
        chatJobsGraft.createIndividualChat(jobName, 'Factory Order', data.chatName);
        serverManager.sendJSON(res, 200, { success: true });
        
        // Broadcast to all clients
        serverManager.broadcast({
          type: 'individual_chat_created',
          job_id: jobName,
          subcategory: 'Factory Order',
          chatName: data.chatName
        });
      } catch (error) {
        serverManager.sendJSON(res, 400, { error: error.message });
      }
    });
    return;
  }

  // Get individual chats endpoint
  if (req.url.match(/^\/api\/jobs\/[^\/]+\/chats$/) && req.method === 'GET') {
    const jobName = decodeURIComponent(req.url.split('/')[3]);
    const chats = chatManager.getIndividualChats(jobName, 'Factory Order');
    // Convert to format client expects
    const formatted = chats.map((c, idx) => ({
      id: `${jobName}_${c.chatName}`,
      name: c.chatName
    }));
    serverManager.sendJSON(res, 200, { chats: formatted });
    return;
  }

  // Delete individual chat endpoint
  if (req.url.match(/^\/api\/jobs\/[^\/]+\/chats\/[^\/]+$/) && req.method === 'DELETE') {
    const jobName = decodeURIComponent(req.url.split('/')[3]);
    const chatId = decodeURIComponent(req.url.split('/')[5]);
    
    // Extract chat name from chat ID (format: "jobName_chatName")
    const chatName = chatId.split('_').slice(1).join('_');
    
    const deleted = chatManager.deleteIndividualChat(jobName, 'Factory Order', chatName);
    
    serverManager.sendJSON(res, 200, { 
      success: true, 
      deletedMessages: deleted 
    });
    
    // Broadcast to all clients
    serverManager.broadcast({
      type: 'individual_chat_deleted',
      jobId: jobName,
      chatId: chatId,
      chatName: chatName
    });
    
    return;
  }

  // Serve static files from UI branch
  let filePath = req.url === '/' ? '/index.html' : req.url;
  filePath = path.join(PUBLIC_DIR, filePath);

  serverManager.serveStaticFile(filePath, res);
}

/**
 * WebSocket Message Handler (assembled from grafts)
 */
function handleWebSocketMessage(data, ws, broadcast) {
  serverChatGraft.handleWebSocketMessage(data, ws, broadcast);
}

// Register WebSocket handler BEFORE starting server
serverManager.onMessage(handleWebSocketMessage);

// Start the server
serverManager.start(handleHTTPRequest);

console.log('🌳 Luxify Tree system initialized');
console.log('├── Branches: Server, Chat, Jobs, UI, NLP');
console.log('├── Grafts: Server-Chat, Chat-Jobs, UI-NLP');
console.log('├── Water: Shared schemas loaded');
console.log('└── Sap: Validation active');
