/**
 * LUXIFY TREE ORCHESTRATOR
 * 
 * This file assembles rami via grafts to create the complete system.
 * The heavy lifting is done by modular rami connected through grafts.
 */

const path = require('path');
const http = require('http');
const fs = require('fs');
const WebSocket = require('ws');
const os = require('os');
const config = require('./config');

// Load Rami
const ChatManager = require('./rami/chat/manager');
const JobsManager = require('./rami/jobs/manager');

// Load Services
const NLPProcessor = require('./services/nlp/processor');

// Load Grafts
const ServerChatGraft = require('./grafts/server-chat');
const ChatJobsGraft = require('./grafts/chat-jobs');
const UINLPGraft = require('./grafts/ui-nlp');

// Configuration
const PORT = config.server.port;
const PUBLIC_DIR = path.join(__dirname, 'leaves', 'ui');

// Initialize Rami (PostgreSQL - no DB file path needed)
const chatManager = new ChatManager();
const jobsManager = new JobsManager(chatManager);
const nlpProcessor = new NLPProcessor();

// Initialize async components
(async () => {
  try {
    await jobsManager.initialize();
    console.log('Jobs initialized from database');
  } catch (error) {
    console.error('Failed to initialize jobs:', error);
  }
})();

// Server State
const clients = new Set();
let server = null;
let wss = null;

// Connect Rami via Grafts
const serverChatGraft = new ServerChatGraft({ broadcast, sendJSON, parseBody }, chatManager);
const chatJobsGraft = new ChatJobsGraft(chatManager, jobsManager);
const uiNLPGraft = new UINLPGraft(nlpProcessor);

/**
 * Broadcast message to all connected WebSocket clients
 */
function broadcast(data) {
  const message = JSON.stringify(data);
  clients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(message);
    }
  });
}

/**
 * Send JSON response
 */
function sendJSON(res, status, data) {
  res.writeHead(status, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(data));
}

/**
 * Parse request body
 */
function parseBody(req, callback) {
  let body = '';
  req.on('data', chunk => body += chunk);
  req.on('end', () => {
    try {
      const data = JSON.parse(body);
      callback(null, data);
    } catch (err) {
      callback(err, null);
    }
  });
}

/**
 * Serve static file
 */
function serveStaticFile(filePath, res) {
  const ext = path.extname(filePath);
  const mimeTypes = {
    '.html': 'text/html',
    '.js': 'text/javascript',
    '.css': 'text/css',
    '.json': 'application/json',
    '.png': 'image/png',
    '.jpg': 'image/jpg',
    '.gif': 'image/gif',
    '.svg': 'image/svg+xml',
    '.ico': 'image/x-icon'
  };

  const contentType = mimeTypes[ext] || 'application/octet-stream';

  fs.readFile(filePath, (err, content) => {
    if (err) {
      if (err.code === 'ENOENT') {
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        res.end('404 Not Found');
      } else {
        res.writeHead(500, { 'Content-Type': 'text/plain' });
        res.end('500 Internal Server Error');
      }
    } else {
      res.writeHead(200, { 'Content-Type': contentType });
      res.end(content);
    }
  });
}

/**
 * Get local network IP address
 */
function getNetworkIP() {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal) {
        return iface.address;
      }
    }
  }
  return null;
}

/**
 * HTTP Request Handler (assembled from grafts)
 */
async function handleHTTPRequest(req, res) {
  // Try server-chat graft endpoints
  const handled = await serverChatGraft.handleHTTPRequest(req, res);
  if (handled) {
    return;
  }

  // Try ui-nlp graft endpoints
  if (uiNLPGraft.handleNLPRequest(req, res, { sendJSON })) {
    return;
  }

  // Jobs endpoint
  if (req.url === '/api/jobs' && req.method === 'GET') {
    const jobs = await chatJobsGraft.getJobsWithSubcategories();
    sendJSON(res, 200, { jobs });
    return;
  }

  // Create new job endpoint
  if (req.url === '/api/jobs' && req.method === 'POST') {
    parseBody(req, (err, data) => {
      if (err || !data.jobName) {
        sendJSON(res, 400, { error: 'Job name required' });
        return;
      }
      try {
        const jobName = jobsManager.addJob(data.jobName.trim());
        sendJSON(res, 200, { success: true, jobName });
        
        // Broadcast to all clients
        broadcast({
          type: 'job_created',
          jobName: jobName
        });
      } catch (error) {
        sendJSON(res, 400, { error: error.message });
      }
    });
    return;
  }

  // Update job code endpoint
  if (req.url.match(/^\/api\/jobs\/[^\/]+\/code$/) && req.method === 'PATCH') {
    const jobName = decodeURIComponent(req.url.split('/')[3]);
    parseBody(req, async (err, data) => {
      if (err) {
        sendJSON(res, 400, { error: 'Invalid request body' });
        return;
      }
      try {
        const code = await chatManager.setJobCode(jobName, data.code || '');
        sendJSON(res, 200, { success: true, code });
      } catch (error) {
        sendJSON(res, 400, { error: error.message });
      }
    });
    return;
  }

  // Job subcategories endpoint
  if (req.url.match(/^\/api\/jobs\/[^\/]+\/subcategories$/) && req.method === 'GET') {
    const jobName = decodeURIComponent(req.url.split('/')[3]);
    const subcategories = await chatManager.getJobSubcategories(jobName);
    const hasChatPads = subcategories.some(s => s.subcategory === 'Chat-pads');
    sendJSON(res, 200, { hasChatPads, subcategories });
    return;
  }

  // Create subcategory endpoint
  if (req.url.match(/^\/api\/jobs\/[^\/]+\/subcategories$/) && req.method === 'POST') {
    const jobName = decodeURIComponent(req.url.split('/')[3]);
    parseBody(req, async (err, data) => {
      if (err || !data.subcategory) {
        sendJSON(res, 400, { error: 'Subcategory required' });
        return;
      }
      try {
        await chatJobsGraft.createSubcategory(jobName, data.subcategory);
        sendJSON(res, 200, { success: true });
        
        // Broadcast to all clients
        broadcast({
          type: 'subcategory_created',
          job_id: jobName,
          subcategory: data.subcategory
        });
      } catch (error) {
        sendJSON(res, 400, { error: error.message });
      }
    });
    return;
  }

  // Delete subcategory endpoint (Chat-pad)
  if (req.url.match(/^\/api\/jobs\/[^\/]+\/subcategories$/) && req.method === 'DELETE') {
    const jobName = decodeURIComponent(req.url.split('/')[3]);
    
    // Delete Chat-pads subcategory and all related data
    const deleted = await chatManager.deleteJobSubcategory(jobName, 'Chat-pads');
    
    sendJSON(res, 200, { 
      success: true, 
      deletedMessages: deleted 
    });
    
    // Broadcast to all clients
    broadcast({
      type: 'factory_order_deleted',
      jobId: jobName,
      subcategory: 'Chat-pads'
    });
    
    return;
  }

  // Update job code endpoint
  if (req.url.match(/^\/api\/jobs\/[^\/]+\/code$/) && req.method === 'PATCH') {
    const jobName = decodeURIComponent(req.url.split('/')[3]);
    parseBody(req, async (err, data) => {
      if (err) {
        sendJSON(res, 400, { error: 'Invalid request' });
        return;
      }
      try {
        await chatManager.setJobCode(jobName, data.code || '');
        sendJSON(res, 200, { success: true, code: data.code });
      } catch (error) {
        sendJSON(res, 400, { error: error.message });
      }
    });
    return;
  }

  // Rename job endpoint
  if (req.url.match(/^\/api\/jobs\/[^\/]+\/rename$/) && req.method === 'PATCH') {
    const oldName = decodeURIComponent(req.url.split('/')[3]);
    parseBody(req, async (err, data) => {
      if (err || !data.newName) {
        sendJSON(res, 400, { error: 'New name required' });
        return;
      }
      try {
        const result = await chatJobsGraft.renameJob(oldName, data.newName);
        sendJSON(res, 200, { success: true, ...result });
        
        // Broadcast to all clients
        broadcast({
          type: 'job_renamed',
          oldName: oldName,
          newName: data.newName
        });
      } catch (error) {
        sendJSON(res, 400, { error: error.message });
      }
    });
    return;
  }

  // Archive/Unarchive job endpoint
  if (req.url.match(/^\/api\/jobs\/[^\/]+\/archive$/) && req.method === 'PATCH') {
    const jobName = decodeURIComponent(req.url.split('/')[3]);
    parseBody(req, async (err, data) => {
      if (err || data.archived === undefined) {
        sendJSON(res, 400, { error: 'Archived status required' });
        return;
      }
      try {
        const result = await chatJobsGraft.archiveJob(jobName, data.archived);
        sendJSON(res, 200, { success: true, ...result });
        
        // Broadcast to all clients
        broadcast({
          type: 'job_archived',
          jobName: jobName,
          archived: data.archived
        });
      } catch (error) {
        sendJSON(res, 400, { error: error.message });
      }
    });
    return;
  }

  // Update message chat-pad assignment endpoint
  if (req.url.match(/^\/api\/messages\/[^\/]+\/chatpad$/) && req.method === 'PATCH') {
    const messageId = decodeURIComponent(req.url.split('/')[3]);
    parseBody(req, async (err, data) => {
      if (err || !data.individualChatId) {
        sendJSON(res, 400, { error: 'Individual chat ID required' });
        return;
      }
      try {
        const result = await chatManager.updateMessageChatpad(messageId, data.individualChatId);
        sendJSON(res, 200, { success: true, ...result });
        
        // Broadcast to all clients
        broadcast({
          type: 'message_chatpad_updated',
          messageId: messageId,
          individualChatId: data.individualChatId,
          chatName: data.chatName
        });
      } catch (error) {
        sendJSON(res, 400, { error: error.message });
      }
    });
    return;
  }

  // Delete job endpoint
  if (req.url.match(/^\/api\/jobs\/[^\/]+$/) && req.method === 'DELETE') {
    const jobName = decodeURIComponent(req.url.split('/')[3]);
    
    try {
      const result = await chatJobsGraft.deleteJob(jobName);
      sendJSON(res, 200, { success: true, ...result });
      
      // Broadcast to all clients
      broadcast({
        type: 'job_deleted',
        jobName: jobName
      });
    } catch (error) {
      sendJSON(res, 400, { error: error.message });
    }
    return;
  }

  // Create individual chat endpoint
  if (req.url.match(/^\/api\/jobs\/[^\/]+\/chats$/) && req.method === 'POST') {
    const jobName = decodeURIComponent(req.url.split('/')[3]);
    parseBody(req, async (err, data) => {
      if (err || !data.chatName) {
        sendJSON(res, 400, { error: 'Chat name required' });
        return;
      }
      try {
        const createdChat = await chatJobsGraft.createIndividualChat(jobName, 'Chat-pads', data.chatName);
        sendJSON(res, 200, { success: true, chatId: createdChat.id });
        
        // Broadcast to all clients with chat ID and username
        broadcast({
          type: 'individual_chat_created',
          job_id: jobName,
          subcategory: 'Chat-pads',
          chatName: data.chatName,
          chatId: createdChat.id,
          username: data.username || 'Unknown'
        });
      } catch (error) {
        sendJSON(res, 400, { error: error.message });
      }
    });
    return;
  }

  // Get individual chats endpoint
  if (req.url.match(/^\/api\/jobs\/[^\/]+\/chats$/) && req.method === 'GET') {
    const jobName = decodeURIComponent(req.url.split('/')[3]);
    const chats = await chatManager.getIndividualChats(jobName, 'Chat-pads');
    // Convert to format client expects
    const formatted = chats.map((c, idx) => ({
      id: `${jobName}_${c.chatName}`,
      name: c.chatName
    }));
    sendJSON(res, 200, { chats: formatted });
    return;
  }

  // Delete individual chat endpoint
  if (req.url.match(/^\/api\/jobs\/[^\/]+\/chats\/[^\/]+$/) && req.method === 'DELETE') {
    const jobName = decodeURIComponent(req.url.split('/')[3]);
    const chatId = decodeURIComponent(req.url.split('/')[5]);
    
    // Extract chat name from chat ID (format: "jobName_chatName")
    const chatName = chatId.split('_').slice(1).join('_');
    
    const deleted = await chatManager.deleteIndividualChat(jobName, 'Chat-pads', chatName);
    
    sendJSON(res, 200, { 
      success: true, 
      deletedMessages: deleted 
    });
    
    // Broadcast to all clients
    broadcast({
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

  serveStaticFile(filePath, res);
}

/**
 * WebSocket Message Handler (assembled from grafts)
 */
async function handleWebSocketMessage(data, ws, broadcast) {
  await serverChatGraft.handleWebSocketMessage(data, ws, broadcast);
}

// Create HTTP server with async wrapper
server = http.createServer((req, res) => {
  handleHTTPRequest(req, res).catch(err => {
    console.error('HTTP handler error:', err);
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Internal server error' }));
  });
});

// Create WebSocket server
wss = new WebSocket.Server({ server });

// Setup WebSocket handlers
wss.on('connection', (ws) => {
  console.log('Client connected');
  clients.add(ws);

  ws.on('message', async (data) => {
    try {
      const parsed = JSON.parse(data);
      await handleWebSocketMessage(parsed, ws, broadcast);
    } catch (err) {
      console.error('Failed to parse WebSocket message:', err);
    }
  });

  ws.on('close', () => {
    console.log('Client disconnected');
    clients.delete(ws);
  });

  ws.on('error', (error) => {
    console.error('WebSocket error:', error);
    clients.delete(ws);
  });
});

// Start listening
server.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  
  // Get local network IP
  const networkIP = getNetworkIP();
  if (networkIP) {
    console.log(`Network access: http://${networkIP}:${PORT}`);
  }
});

console.log('🌳 Luxify Tree system initialized');
console.log('├── Rami: Chat, Jobs');
console.log('├── Services: NLP');
console.log('├── Grafts: Server-Chat, Chat-Jobs, UI-NLP');
console.log('├── Water: Event flow documentation');
console.log('└── Sap: Validation active');

// Global error handlers
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  process.exit(1);
});
