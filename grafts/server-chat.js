/**
 * GRAFT: Server ↔ Chat
 * 
 * Connects server HTTP/WebSocket to chat management
 */

class ServerChatGraft {
  constructor(serverFunctions, chatManager) {
    this.server = serverFunctions;
    this.chat = chatManager;
  }

  /**
   * Handle HTTP API endpoints
   */
  async handleHTTPRequest(req, res) {
    // Login endpoint
    if (req.url === '/api/login' && req.method === 'POST') {
      this.server.parseBody(req, async (err, data) => {
        if (err || !data.username || data.username.trim().length === 0) {
          this.server.sendJSON(res, 400, { error: 'Username required' });
          return;
        }

        await this.chat.registerUser(data.username);
        this.server.sendJSON(res, 200, { success: true, user: { username: data.username } });
      });
      return true;
    }

    // Get messages endpoint
    if (req.url.startsWith('/api/messages') && req.method === 'GET') {
      // Parse query parameters
      const url = new URL(req.url, `http://${req.headers.host}`);
      const jobId = url.searchParams.get('job_id');
      const subcategory = url.searchParams.get('subcategory');
      const chatId = url.searchParams.get('chat_id');

      const rawMessages = await this.chat.getMessages({
        job: jobId,
        subcategory: subcategory,
        individualChat: chatId
      });

      const messages = rawMessages.map((msg) => this.normalizeMessage(msg));
      this.server.sendJSON(res, 200, { messages });
      return true;
    }

    // Clear ALL messages in chat-pad (except Seeking Solution entries)
    if (req.url.startsWith('/api/messages/clear') && req.method === 'DELETE') {
      const url = new URL(req.url, `http://${req.headers.host}`);
      const jobId = (url.searchParams.get('job_id') || 'General').trim();
      const subcategory = (url.searchParams.get('subcategory') || 'Seeking Solution').trim();
      const chatId = url.searchParams.get('chat_id');

      const deleted = await this.chat.clearAllMessages(
        jobId,
        subcategory,
        chatId || null
      );

      this.server.sendJSON(res, 200, { success: true, deletedCount: deleted });

      if (deleted > 0) {
        this.server.broadcast({
          type: 'chat_cleared',
          job_id: jobId,
          subcategory: subcategory,
          chat_id: chatId || null,
          timestamp: new Date().toISOString()
        });
      }

      return true;
    }

    // Delete single message (REST style)
    const deleteMatch = req.url.match(new RegExp('^/api/messages/([^/?]+)'));
    if (deleteMatch && req.method === 'DELETE') {
      const messageId = deleteMatch[1];
      const url = new URL(req.url, `http://${req.headers.host}`);
      const username = (url.searchParams.get('username') || '').trim();

      if (!username) {
        this.server.sendJSON(res, 400, { error: 'Username required' });
        return true;
      }

      try {
        const success = await this.chat.deleteMessageById(messageId, username);
        if (success) {
          this.server.sendJSON(res, 204, null);
          this.server.broadcast({
            type: 'message_deleted',
            message_id: messageId,
            timestamp: new Date().toISOString()
          });
        } else {
          // Should have thrown if not found/unauthorized, but just in case
          this.server.sendJSON(res, 404, { error: 'Message not found' });
        }
      } catch (error) {
        if (error.message === 'Unauthorized') {
          this.server.sendJSON(res, 403, { error: 'Unauthorized' });
        } else if (error.message === 'Message not found') {
          this.server.sendJSON(res, 404, { error: 'Message not found' });
        } else {
          this.server.sendJSON(res, 500, { error: error.message });
        }
      }
      return true;
    }

    if (req.url.startsWith('/api/messages') && req.method === 'DELETE') {
      const url = new URL(req.url, `http://${req.headers.host}`);
      const messageId = url.searchParams.get('message_id');
      const username = (url.searchParams.get('username') || '').trim();
      const jobId = (url.searchParams.get('job_id') || 'General').trim();
      const subcategory = (url.searchParams.get('subcategory') || 'Seeking Solution').trim();
      const chatId = url.searchParams.get('chat_id');

      // Single message deletion by ID
      if (messageId) {
        try {
          const success = await this.chat.deleteMessageById(messageId, username);
          this.server.sendJSON(res, 200, { success });

          if (success) {
            this.server.broadcast({
              type: 'message_deleted',
              message_id: messageId,
              timestamp: new Date().toISOString()
            });
          }
        } catch (error) {
          if (error.message === 'Unauthorized') {
            this.server.sendJSON(res, 403, { error: 'Unauthorized' });
          } else if (error.message === 'Message not found') {
            this.server.sendJSON(res, 404, { error: 'Message not found' });
          } else {
            this.server.sendJSON(res, 400, { error: error.message });
          }
        }
        return true;
      }

      // Bulk deletion by user/context (excludes isProblem messages)
      if (!username) {
        this.server.sendJSON(res, 400, { error: 'Username required' });
        return true;
      }

      const deleted = await this.chat.deleteMessagesByUser(
        username,
        jobId,
        subcategory,
        chatId || null
      );

      this.server.sendJSON(res, 200, { success: true, deletedCount: deleted });

      if (deleted > 0) {
        this.broadcastDeletion(
          username,
          jobId,
          subcategory,
          chatId || null
        );
      }

      return true;
    }

    // Solve a problem message
    if (req.url.match(new RegExp('^/api/messages/[^/]+/solve$')) && req.method === 'PATCH') {
      const messageId = req.url.split('/')[3];

      this.server.parseBody(req, async (err, data) => {
        if (err || !data.solution || !data.username) {
          this.server.sendJSON(res, 400, { error: 'Solution and username required' });
          return;
        }

        try {
          const message = await this.chat.solveMessage(messageId, data.solution, data.username);
          this.server.sendJSON(res, 200, { success: true, message });

          // Broadcast to all clients
          this.server.broadcast({
            type: 'problem_solved',
            message_id: messageId,
            solution: data.solution,
            solved_by: data.username,
            solved_at: message.solvedAt,
            timestamp: new Date().toISOString()
          });
        } catch (error) {
          this.server.sendJSON(res, 400, { error: error.message });
        }
      });

      return true;
    }

    // Add to Playbook endpoint
    if (req.url.match(new RegExp('^/api/messages/[^/]+/playbook$')) && req.method === 'PATCH') {
      const messageId = req.url.split('/')[3];

      this.server.parseBody(req, async (err, data) => {
        if (err || !data.notes || !data.username) {
          this.server.sendJSON(res, 400, { error: 'Notes and username required' });
          return;
        }

        try {
          const message = await this.chat.addToPlaybook(messageId, data.notes, data.username);
          this.server.sendJSON(res, 200, { success: true, message });

          // Broadcast to all clients
          this.server.broadcast({
            type: 'playbook_entry_added',
            message_id: messageId,
            notes: data.notes,
            verified_by: data.username,
            verified_at: message.playbookVerifiedAt,
            timestamp: new Date().toISOString()
          });
        } catch (error) {
          this.server.sendJSON(res, 400, { error: error.message });
        }
      });

      return true;
    }

    // Get Playbook endpoint
    if (req.url === '/api/playbook' && req.method === 'GET') {
      try {
        const entries = await this.chat.getPlaybookEntries();
        this.server.sendJSON(res, 200, { entries });
      } catch (error) {
        this.server.sendJSON(res, 400, { error: error.message });
      }
      return true;
    }

    // Get jobs endpoint
    if (req.url === '/api/jobs' && req.method === 'GET') {
      // This will be handled by jobs graft
      return false;
    }

    return false;
  }

  /**
   * Handle WebSocket messages
   */
  async handleWebSocketMessage(data, ws, broadcast) {
    switch (data.type) {
      case 'auth': {
        const username = (data.username || '').trim();
        if (!username) {
          ws.send(
            JSON.stringify({
              type: 'error',
              error: 'Username required'
            })
          );
          return;
        }

        await this.chat.registerUser(username);
        ws.user = { username };
        ws.send(
          JSON.stringify({
            type: 'auth_success',
            username,
            timestamp: new Date().toISOString()
          })
        );
        break;
      }

      case 'message': {
        if (!ws.user || !ws.user.username) {
          ws.send(
            JSON.stringify({
              type: 'error',
              error: 'Not authenticated'
            })
          );
          return;
        }

        const username = ws.user.username;
        const jobId = data.job_id || data.job || 'General';
        const subcategory = data.subcategory || 'Seeking Solution';
        const individualChat =
          data.individual_chat_id || data.individualChat || null;

        const storedMessage = await this.chat.addMessage({
          id: Date.now().toString(),
          user: username,
          text: data.text || '',
          job: jobId,
          timestamp: new Date().toISOString(),
          subcategory,
          individualChat,
          isProblem: data.isProblem
        });

        const normalized = this.normalizeMessage(storedMessage);

        broadcast({
          type: 'message',
          ...normalized
        });
        break;
      }

      case 'delete_messages': {
        const username =
          data.user || data.username || (ws.user ? ws.user.username : '');
        const jobId = data.job || data.job_id;
        const subcategory = data.subcategory || 'Seeking Solution';
        const individualChat =
          data.individualChat || data.individual_chat_id || null;

        const deleted = await this.chat.deleteMessagesByUser(
          username,
          jobId,
          subcategory,
          individualChat
        );

        broadcast({
          type: 'messages_deleted',
          username,
          job_id: jobId,
          subcategory,
          individual_chat_id: individualChat,
          count: deleted
        });
        break;
      }

      case 'subcategory_created':
        await this.chat.addJobSubcategory(data.job, data.subcategory);
        broadcast({
          type: 'subcategory_created',
          job_id: data.job,
          subcategory: data.subcategory
        });
        break;

      case 'individual_chat_created':
        await this.chat.addIndividualChat(data.job, data.subcategory, data.chatName);
        broadcast({
          type: 'individual_chat_created',
          job_id: data.job,
          subcategory: data.subcategory,
          chatName: data.chatName
        });
        break;

      case 'factory_order_deleted':
        await this.chat.deleteJobSubcategory(data.job, data.subcategory);
        broadcast({
          type: 'factory_order_deleted',
          jobId: data.job,
          subcategory: data.subcategory
        });
        break;
    }
  }

  normalizeMessage(msg) {
    return {
      id: String(msg.id || Date.now()),
      username: msg.username || msg.user || 'Unknown',
      text: msg.text || '',
      job_id: msg.job_id || msg.job || 'General',
      subcategory: msg.subcategory || 'Seeking Solution',
      individual_chat_id: msg.individual_chat_id || msg.individualChat || null,
      timestamp: msg.timestamp || new Date().toISOString(),
      isProblem: msg.isProblem || false,
      isSolved: msg.isSolved || false,
      solution: msg.solution || '',
      solvedBy: msg.solvedBy || '',
      solvedAt: msg.solvedAt || null
    };
  }

  broadcastDeletion(username, jobId, subcategory, chatId) {
    this.server.broadcast({
      type: 'messages_deleted',
      username,
      job_id: jobId,
      subcategory,
      individual_chat_id: chatId,
      timestamp: new Date().toISOString()
    });
  }
}

module.exports = ServerChatGraft;
