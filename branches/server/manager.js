/**
 * BRANCH: Server
 * 
 * HTTP and WebSocket server functionality
 */

const http = require('http');
const fs = require('fs');
const path = require('path');
const WebSocket = require('ws');
const os = require('os');

class ServerManager {
  constructor(port, publicDir) {
    this.port = port;
    this.publicDir = publicDir;
    this.clients = new Set();
    this.server = null;
    this.wss = null;
    this.messageHandler = null; // Store message handler
  }

  /**
   * Start HTTP and WebSocket servers
   */
  start(requestHandler) {
    // Create HTTP server
    this.server = http.createServer(requestHandler);

    // Create WebSocket server
    this.wss = new WebSocket.Server({ server: this.server });

    // Setup WebSocket handlers
    this.setupWebSocket();

    // Start listening
    this.server.listen(this.port, () => {
      console.log(`Server running on http://localhost:${this.port}`);
      
      // Get local network IP
      const networkIP = this.getNetworkIP();
      if (networkIP) {
        console.log(`Network access: http://${networkIP}:${this.port}`);
      }
    });
  }

  /**
   * Setup WebSocket connection handling
   */
  setupWebSocket() {
    this.wss.on('connection', (ws) => {
      console.log('Client connected');
      this.clients.add(ws);

      // Attach message handler if registered
      if (this.messageHandler) {
        ws.on('message', (data) => {
          try {
            const parsed = JSON.parse(data);
            this.messageHandler(parsed, ws, (response) => this.broadcast(response));
          } catch (err) {
            console.error('Failed to parse WebSocket message:', err);
          }
        });
      }

      ws.on('close', () => {
        console.log('Client disconnected');
        this.clients.delete(ws);
      });

      ws.on('error', (error) => {
        console.error('WebSocket error:', error);
        this.clients.delete(ws);
      });
    });
  }

  /**
   * Broadcast message to all connected clients
   */
  broadcast(data) {
    const message = JSON.stringify(data);
    this.clients.forEach(client => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(message);
      }
    });
  }

  /**
   * Register WebSocket message handler
   */
  onMessage(handler) {
    this.messageHandler = handler;
  }

  /**
   * Get local network IP address
   */
  getNetworkIP() {
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
   * Serve static file
   */
  serveStaticFile(filePath, res) {
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
   * Send JSON response
   */
  sendJSON(res, status, data) {
    res.writeHead(status, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(data));
  }

  /**
   * Parse request body
   */
  parseBody(req, callback) {
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
}

module.exports = ServerManager;
