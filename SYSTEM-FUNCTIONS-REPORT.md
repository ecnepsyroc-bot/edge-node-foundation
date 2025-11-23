# System Functions Report
**Date:** November 16, 2025  
**System:** Feature Millwork Chat (Shop Communication Tool)

---

## Overview

This system is a WhatsApp-style messaging application built for a millwork shop environment. It runs on a local Node.js server and allows workers to communicate across the shop WiFi network from phones, tablets, or computers.

---

## Core User Actions

### 1. **Login**
- **How it works:** User enters their name → creates/retrieves user account → connects via WebSocket
- **Storage:** Username stored in browser `localStorage` for auto-login
- **Backend:** Creates user record in `chat-data.json` if new

### 2. **Send Messages**
- **How it works:** Type message → press Enter or click Send → broadcasts to all connected clients via WebSocket
- **Context:** Messages are tagged with current job, subcategory, and individual chat (if any)
- **Storage:** Saved to `chat-data.json` in messages array
- **Real-time:** All users in same context see message instantly

### 3. **Clear Messages**
- **Button:** "Clear" at top right
- **How it works:** Deletes ALL messages in current chat-pad (job + subcategory + individual chat)
- **Exception:** Does NOT delete "Seeking Solution" problem entries
- **Endpoint:** `DELETE /api/messages/clear?job_id=X&subcategory=Y&chat_id=Z`
- **Broadcast:** Sends `chat_cleared` event to refresh all clients in same context

### 4. **Delete Chat-Pad**
- **Button:** "Delete" at top right (only visible in Factory Order view)
- **Context-aware:**
  - **When viewing "All":** Deletes entire Factory Order (all individual chats + all messages)
  - **When viewing specific individual chat:** Deletes only that chat + its messages
- **Endpoint:** 
  - Individual chat: `DELETE /api/jobs/{job}/chats/{chatId}`
  - Entire Factory Order: `DELETE /api/jobs/{job}/subcategories`
- **Broadcast:** Sends `individual_chat_deleted` or `factory_order_deleted` event
- **UI Update:** Automatically switches view after deletion

---

## Job & Organization System

### 5. **Switch Jobs**
- **How it works:** Click job tab at top → loads that job's messages
- **Pre-configured:** 34 predefined jobs (3410 Marpole Avenue, Archetype, Bellano, Cactus Club locations, etc.)
- **Create new:** Click "+" button → enter job name → validates via JobsManager

### 6. **Subcategories**
Every job has two subcategories:
- **Seeking Solution** (default) - General discussion + problem tracking
- **Factory Order** (optional) - Production orders with individual chats

### 7. **Create Factory Order**
- **Button:** "+FO" in subcategory bar
- **How it works:** 
  1. Prompts for Factory Order name (e.g., "FO-12345")
  2. Creates "Factory Order" subcategory for this job
  3. Creates first individual chat with entered name
  4. Switches to Factory Order view
- **Storage:** Adds to `jobSubcategories` and `individualChats` in `chat-data.json`

### 8. **Individual Chats (within Factory Orders)**
- **Purpose:** Separate conversations within a Factory Order (different order numbers, phases, etc.)
- **Create:** Click "+ Chat" → enter chat name → adds to current Factory Order
- **View:** Click chat tab to see only messages in that chat
- **View "All":** Click "All" tab to see messages from all chats in Factory Order

---

## Problem Tracking System

### 9. **Create Problem**
- **Button:** "+ Problem" (red dashed border, right side of subcategory bar)
- **How it works:**
  1. Opens modal to describe problem
  2. Creates message with prefix: "🔴 Seeking Solution: [problem text]"
  3. Message is flagged as `isProblem: true` in database
- **Visibility:** Problem appears in "Seeking Solution" tab AND in original location
- **UI:** Shows as red pill in Problems Bar with solve/delete buttons

### 10. **Solve Problem**
- **Button:** "+Sol" on problem pill
- **How it works:**
  1. Opens solution modal
  2. User enters solution text
  3. Updates problem record with solution + solver username
  4. Marks as solved
- **Reflex Popup:** If solution added, shows celebration popup: "Reflex Found!" with problem/solution details
- **Storage:** Problem remains in database with `solved: true` flag

### 11. **Delete Problem**
- **Button:** "×" on problem pill
- **How it works:** Deletes the Seeking Solution message by ID
- **Confirmation:** Asks user to confirm deletion
- **Endpoint:** `DELETE /api/messages?message_id={id}`
- **UI Update:** Removes pill from Problems Bar

### 12. **Problems Bar**
- **Location:** Horizontal bar below subcategory tabs
- **Display:** Shows all unsolved problems for current context (job + subcategory + individual chat)
- **Pills:** Each problem is a colored pill with:
  - Problem text (truncated)
  - "+Sol" button to add solution
  - "×" button to delete problem
  - Creator username
- **Auto-hide:** Bar hidden when no problems exist

---

## UI Components

### 13. **Job Tabs**
- **Location:** Top of screen below header
- **Format:** Horizontal scrolling tabs
- **Active state:** Current job highlighted
- **"+" Button:** Creates new job (left-most position)

### 14. **Subcategory Tabs**
- **Location:** Below job tabs
- **Always shows:** "Seeking Solution" tab (default)
- **Optional:** "Factory Order" tab (if created)
- **"+ Problem" Button:** Right side, creates new problem

### 15. **Individual Chats Bar**
- **Location:** Below subcategory tabs
- **Visibility:** Only shown when Factory Order is active
- **"All" Tab:** Shows messages from all individual chats
- **Individual Tabs:** One per chat within Factory Order
- **"+ Chat" Button:** Creates new individual chat

### 16. **Message Display**
- **Scrolling area:** Main center area
- **Bubble style:** WhatsApp-like message bubbles
- **Sent messages:** Right-aligned, darker background
- **Received messages:** Left-aligned, lighter background
- **Username:** Displayed above each message
- **Timestamp:** HH:MM format below message
- **FO Badge:** Orange "FO" badge if message from Factory Order

### 17. **Input Area**
- **Location:** Bottom of screen (fixed)
- **Text input:** Type message, Enter to send
- **Send button:** Paper airplane icon, click to send

---

## Data Flow

### Message Lifecycle:
1. User types message in input
2. Client sends WebSocket message: `{type: 'message', text: '...', job_id: 'X', subcategory: 'Y', individual_chat_id: 'Z'}`
3. Server validates via `sap/validators.js`
4. Server stores in `chat-data.json` via `ChatManager`
5. Server broadcasts to all connected clients
6. Clients check if message matches current filters (job, subcategory, chat)
7. If match, display message in UI

### Problem Lifecycle:
1. User clicks "+ Problem" → modal opens
2. User enters problem text → client sends as message with "🔴 Seeking Solution:" prefix
3. Server detects prefix and sets `isProblem: true` flag
4. Server stores message and broadcasts
5. Clients receive message and call `loadProblems()` if in same job
6. Problems Bar renders pill for each unsolved problem
7. User can add solution → updates problem record
8. User can delete → removes message entirely

### Delete Lifecycle:
1. User clicks "Delete" button
2. Client checks context (viewing "All" or specific chat?)
3. Sends appropriate DELETE request:
   - Individual chat: `/api/jobs/{job}/chats/{chatId}`
   - Factory Order: `/api/jobs/{job}/subcategories`
4. Server deletes data from `chat-data.json`
5. Server broadcasts deletion event
6. All clients receive event and update UI accordingly:
   - Remove chat tab if individual chat deleted
   - Switch to "Seeking Solution" if Factory Order deleted

---

## Backend Architecture (Luxify Tree)

### Rami (Independent Modules):
- **`rami/server/`** - HTTP server, WebSocket connections, static files
- **`rami/chat/`** - Message CRUD, database operations
- **`rami/jobs/`** - 34 predefined jobs, job validation
- **`rami/nlp/`** - Part-of-speech tagging (ready, not yet active)
- **`rami/ui/`** - HTML/CSS/JS client interface

### Grafts (Integration Bridges):
- **`grafts/server-chat.js`** - Connects server to chat (HTTP endpoints, WebSocket events)
- **`grafts/chat-jobs.js`** - Validates job names before chat operations
- **`grafts/ui-nlp.js`** - Exposes NLP processing endpoint

### Water (Shared Schemas):
- **`water/schemas.js`** - Defines Message, User, JobSubcategory, IndividualChat structures

### Sap (Validation):
- **`sap/validators.js`** - Sanitizes input, enforces limits (5000 char messages, 50 char usernames)

### Orchestrator:
- **`server.js`** - Assembles all rami via grafts, routes requests

---

## API Endpoints

### Authentication:
- `POST /api/login` - Create/retrieve user by username

### Jobs:
- `GET /api/jobs` - List all jobs with subcategories
- `POST /api/jobs` - Create new job (validates name)

### Subcategories:
- `GET /api/jobs/{job}/subcategories` - Check if Factory Order exists
- `POST /api/jobs/{job}/subcategories` - Create Factory Order subcategory
- `DELETE /api/jobs/{job}/subcategories` - Delete entire Factory Order

### Individual Chats:
- `GET /api/jobs/{job}/chats` - List all individual chats for job
- `POST /api/jobs/{job}/chats` - Create new individual chat
- `DELETE /api/jobs/{job}/chats/{chatId}` - Delete specific individual chat

### Messages:
- `GET /api/messages?job_id={job}` - Get all messages for job
- `DELETE /api/messages?message_id={id}` - Delete single message by ID
- `DELETE /api/messages/clear?job_id={job}&subcategory={sub}&chat_id={chat}` - Clear all non-problem messages in context

### Problems:
- `GET /api/jobs/{job}/problems?subcategory={sub}&status=unsolved` - Get unsolved problems
- `PUT /api/problems/{id}/solution` - Add solution to problem

### NLP:
- `POST /api/nlp/process` - Process text for parts of speech (not yet used in UI)

---

## WebSocket Events

### Client → Server:
- `{type: 'auth', username: '...'}` - Authenticate connection
- `{type: 'message', text: '...', job_id: '...', subcategory: '...', individual_chat_id: '...'}` - Send message

### Server → Clients:
- `{type: 'auth_success'}` - Login confirmed
- `{type: 'message', ...}` - New message broadcast
- `{type: 'subcategory_created', job_id: '...', subcategory: '...'}` - Factory Order created
- `{type: 'individual_chat_created', job_id: '...', chatName: '...'}` - New chat added
- `{type: 'individual_chat_deleted', jobId: '...', chatId: '...', chatName: '...'}` - Chat removed
- `{type: 'factory_order_deleted', jobId: '...'}` - Entire Factory Order removed
- `{type: 'problem_created', context: {...}}` - New problem added
- `{type: 'problem_solved', data: {...}, reflex: true}` - Solution added (triggers popup)
- `{type: 'problem_deleted', context: {...}}` - Problem removed
- `{type: 'message_deleted', message_id: '...'}` - Single message removed
- `{type: 'chat_cleared', job_id: '...', subcategory: '...', chat_id: '...'}` - Chat-pad cleared

---

## Data Storage

**File:** `chat-data.json`

**Structure:**
```json
{
  "users": {
    "Username": {
      "id": 1,
      "username": "Username",
      "created_at": "ISO timestamp"
    }
  },
  "messages": [
    {
      "id": "unique-id",
      "username": "User",
      "text": "Message text",
      "timestamp": "ISO timestamp",
      "job_id": "Job Name",
      "subcategory": "Seeking Solution | Factory Order",
      "individual_chat_id": "chatId (optional)",
      "isProblem": true/false,
      "solution_text": "Solution (optional)",
      "solved_by": "Username (optional)",
      "solved_at": "ISO timestamp (optional)"
    }
  ],
  "jobSubcategories": [
    {
      "job": "Job Name",
      "subcategory": "Factory Order"
    }
  ],
  "individualChats": [
    {
      "job": "Job Name",
      "subcategory": "Factory Order",
      "chatName": "Chat Name"
    }
  ]
}
```

---

## Current Limitations

1. **NLP Color-Coding:** Implemented but not yet active in message display
2. **No user authentication:** Anyone can use any username
3. **No message editing:** Once sent, messages cannot be edited
4. **No file attachments:** Text-only messages
5. **No notifications:** No sound/badge alerts for new messages
6. **Single server:** No clustering or load balancing
7. **JSON storage:** Not optimized for high-volume production use

---

## Summary

This is a **fully functional shop communication system** with:
- ✅ Real-time messaging via WebSockets
- ✅ Job-based organization (34 predefined jobs)
- ✅ Problem tracking with Seeking Solution flags
- ✅ Factory Order management with individual chats
- ✅ Context-aware Clear and Delete functions
- ✅ Clean modular architecture (Luxify Tree)
- ✅ Local network access (WiFi-based)
- ✅ Simple JSON file storage

The system is **production-ready** for a shop environment and can be accessed from any device on the local network at `http://[server-ip]:3000`.
