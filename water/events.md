# Water: Event Flow Documentation

This document describes all events (WebSocket messages) that flow through the Luxify Tree system.

## WebSocket Events

### Client → Server Events

#### `auth`
Client authentication request.

**Payload:**
```javascript
{
  type: 'auth',
  username: string  // User's display name
}
```

**Response:** `auth_success` or `error`

---

#### `message`
Send a new chat message.

**Payload:**
```javascript
{
  type: 'message',
  text: string,                      // Message content
  job_id: string,                    // Job name (default: 'General')
  subcategory: string,               // 'Seeking Solution' or Chat-pad name
  individual_chat_id: string|null,   // Individual chat name (null for Seeking Solution)
  isProblem: boolean                 // Whether this is a problem entry
}
```

**Response:** Broadcasts `message` to all clients

---

#### `delete_messages`
Delete messages by user and context.

**Payload:**
```javascript
{
  type: 'delete_messages',
  username: string,                  // User whose messages to delete
  job_id: string,                    // Job context
  subcategory: string,               // Subcategory context
  individual_chat_id: string|null    // Individual chat context (optional)
}
```

**Response:** Broadcasts `messages_deleted` to all clients

---

#### `subcategory_created`
Create a new Factory Order subcategory.

**Payload:**
```javascript
{
  type: 'subcategory_created',
  job: string,         // Job name
  subcategory: string  // Factory Order name
}
```

**Response:** Broadcasts `subcategory_created` to all clients

---

#### `individual_chat_created`
Create a new individual chat within a Factory Order.

**Payload:**
```javascript
{
  type: 'individual_chat_created',
  job: string,         // Job name
  subcategory: string, // Factory Order name
  chatName: string     // Individual chat name
}
```

**Response:** Broadcasts `individual_chat_created` to all clients

---

#### `factory_order_deleted`
Delete a Factory Order and all its data.

**Payload:**
```javascript
{
  type: 'factory_order_deleted',
  job: string,         // Job name
  subcategory: string  // Factory Order name to delete
}
```

**Response:** Broadcasts `factory_order_deleted` to all clients

---

### Server → Client Events

#### `auth_success`
Successful authentication confirmation.

**Payload:**
```javascript
{
  type: 'auth_success',
  username: string,    // Confirmed username
  timestamp: string    // ISO timestamp
}
```

---

#### `message`
New message broadcast to all connected clients.

**Payload:**
```javascript
{
  type: 'message',
  id: string,                        // Message ID
  username: string,                  // Sender username
  text: string,                      // Message content
  job_id: string,                    // Job name
  subcategory: string,               // Subcategory name
  individual_chat_id: string|null,   // Individual chat name (or null)
  timestamp: string                  // ISO timestamp
}
```

---

#### `messages_deleted`
Notification that messages were deleted.

**Payload:**
```javascript
{
  type: 'messages_deleted',
  username: string,                  // User whose messages were deleted
  job_id: string,                    // Job context
  subcategory: string,               // Subcategory context
  individual_chat_id: string|null,   // Individual chat context
  count: number,                     // Number of messages deleted
  timestamp: string                  // ISO timestamp
}
```

---

#### `message_deleted`
Notification that a single message was deleted.

**Payload:**
```javascript
{
  type: 'message_deleted',
  message_id: string,  // ID of deleted message
  timestamp: string    // ISO timestamp
}
```

---

#### `chat_cleared`
Notification that all messages in a chat were cleared (except Seeking Solution problems).

**Payload:**
```javascript
{
  type: 'chat_cleared',
  job_id: string,                    // Job context
  subcategory: string,               // Subcategory context
  chat_id: string|null,              // Individual chat context
  timestamp: string                  // ISO timestamp
}
```

---

#### `subcategory_created`
Notification that a Factory Order was created.

**Payload:**
```javascript
{
  type: 'subcategory_created',
  job_id: string,      // Job name
  subcategory: string  // New Factory Order name
}
```

---

#### `individual_chat_created`
Notification that an individual chat was created.

**Payload:**
```javascript
{
  type: 'individual_chat_created',
  job_id: string,      // Job name
  subcategory: string, // Factory Order name
  chatName: string     // New individual chat name
}
```

---

#### `factory_order_deleted`
Notification that a Factory Order was deleted.

**Payload:**
```javascript
{
  type: 'factory_order_deleted',
  jobId: string,       // Job name
  subcategory: string  // Deleted Factory Order name
}
```

---

#### `individual_chat_deleted`
Notification that an individual chat was deleted.

**Payload:**
```javascript
{
  type: 'individual_chat_deleted',
  jobId: string,       // Job name
  chatId: string,      // Deleted chat ID
  chatName: string     // Deleted chat name
}
```

---

#### `error`
Error notification.

**Payload:**
```javascript
{
  type: 'error',
  error: string  // Error message
}
```

---

## Event Flow Patterns

### Message Creation Flow
```
Client → auth → Server
Server → auth_success → Client
Client → message → Server
Server → message → All Clients
```

### Message Deletion Flow
```
Client → DELETE /api/messages → Server
Server → message_deleted → All Clients
```

### Chat Clearing Flow
```
Client → DELETE /api/messages/clear → Server
Server → chat_cleared → All Clients
```

### Chat-pad Creation Flow
```
Client → POST /api/jobs/{job}/subcategories → Server
Server → subcategory_created → All Clients
```

### Individual Chat Creation Flow
```
Client → POST /api/jobs/{job}/chats → Server
Server → individual_chat_created → All Clients
```

### Chat-pad Deletion Flow
```
Client → DELETE /api/jobs/{job}/subcategories → Server
Server → factory_order_deleted → All Clients
```

### Individual Chat Deletion Flow
```
Client → DELETE /api/jobs/{job}/chats/{chatId} → Server
Server → individual_chat_deleted → All Clients
```

---

## Notes

- All WebSocket events use JSON encoding
- Timestamps are in ISO 8601 format
- Events are broadcast to all connected clients for real-time synchronization
- HTTP endpoints trigger WebSocket broadcasts for consistency
- Error events are sent only to the client that caused the error
