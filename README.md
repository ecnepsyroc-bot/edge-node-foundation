# Shop Floor Messaging System (Factory WhatsApp)

A lightweight, WhatsApp-style messaging system for a millwork / factory environment, built with **Luxify Tree Architecture**.

- Runs on a shop PC
- Accessible from phones on the same WiFi/network
- Organizes discussions by **Job** / **Factory Order**
- Tracks problems as **"Seeking Solution"** and supports resolution notes
- **NLP color-coding** of parts of speech (nouns, verbs, adjectives, prepositions)
- Uses WebSockets for real-time updates
- Persists data to a local JSON file (`chat-data.json`)
- **Modular tree architecture** prevents "AI mush" and enables sustainable growth

---

## Current Features

### 1. WhatsApp-style Chat UI

- Dark theme with bubble-style messages
- **NLP color-coded text**: Nouns (green), Verbs (red), Adjectives (gold), Prepositions (blue)
- Job tabs across the top
- Subcategory tabs (Seeking Solution, Factory Order) below
- Individual chat tabs for Factory Orders
- Messages appear in real-time via WebSockets

### 2. Luxify Tree Architecture

The system is built using **Luxify Tree** modular architecture to prevent "AI mush" and enable sustainable growth:

#### **Branches** (Core Modules)
- `branches/server/` - HTTP and WebSocket server management
- `branches/chat/` - Message handling, storage, and retrieval
- `branches/jobs/` - Job listings and subcategory management
- `branches/ui/` - Client-side interface (HTML/CSS/JS)
- `branches/nlp/` - Part-of-speech tagging with compromise.js

#### **Grafts** (Integration Layer)
- `grafts/server-chat.js` - Connects server to chat system
- `grafts/chat-jobs.js` - Links chat operations to job validation
- `grafts/ui-nlp.js` - Provides NLP processing to UI

#### **Water** (Shared Data)
- `water/schemas.js` - Data structure definitions for messages, users, jobs, subcategories

#### **Sap** (Validation)
- `sap/validators.js` - Input sanitization and validation guards

#### **Orchestrator**
- `server.js` - Lightweight assembly file that connects all branches via grafts

### 3. Job-Based Messaging

- Each job has its own conversation space
- Messages are stored in `chat-data.json` grouped by job/subcategory
- Supports 35+ predefined jobs including:
  - 3410 Marpole Avenue
  - Archetype, Bellano, Blueberry
  - Cactus Club locations
  - And many more...

### 4. "Seeking Solution" Problem Tracking

- Messages can be flagged as **"🔴 Seeking Solution:"** (problem state)
- Problems appear in the "Seeking Solution" tab for visibility
- Problems persist in their original chat location
- Helps track unresolved issues across the shop

### 5. Factory Order Management

- Create Factory Order subcategory per job with "+FO" button
- Individual chats within each Factory Order with "+ Chat" button
- Delete entire Factory Orders with all associated chats using "Delete" button
- Track multiple FOs per job

### 6. Local JSON Persistence

- Server reads/writes `chat-data.json`
- No external database required
- Stores: users, messages, job subcategories, individual chats
- Simple backup: just copy the JSON file

### 7. Network Access

- Server runs on shop PC (Node.js)
- WebSocket for live chat updates
- Phones on same WiFi connect via `http://192.168.x.x:3000`
- No installation needed on mobile devices

### 8. NLP Color-Coding

- **Nouns**: Green (`#4CAF50`)
- **Verbs**: Red (`#F44336`)
- **Adjectives**: Gold (`#FFD700`)
- **Adverbs**: Orange (`#FF9800`)
- **Prepositions**: Blue (`#2196F3`)
- **Pronouns**: Purple (`#9C27B0`)
- **Conjunctions**: Brown (`#795548`)
- **Determiners**: Blue-grey (`#607D88`)

Powered by compromise.js for real-time part-of-speech tagging.

---

## Tech Stack

- **Node.js** - Server runtime
- **ws** (v8.14.2) - WebSocket server for real-time messaging
- **compromise** (v14.9.0) - Natural language processing for color-coding
- **HTTP** (native http module, no Express)
- **Vanilla HTML/CSS/JS** in `branches/ui/` - No frameworks, pure performance

**Luxify Tree Architecture**: Modular branch-based system with grafts for integration, water for shared schemas, and sap for validation.

---

## Installation

### Prerequisites

- Node.js installed on the shop PC (download from [nodejs.org](https://nodejs.org/))

### Steps

1. Open PowerShell in the project folder (right-click → Open in Terminal)

2. Install dependencies:
   ```powershell
   npm install
   ```

3. Start the server:
   ```powershell
   npm start
   ```

4. Note the printed network address:
   ```
   Network access: http://192.168.0.37:3000
   ```

5. On a phone (same WiFi), open that URL in browser and bookmark it

---

## Usage

### Basic Chat
- Select a job from the top tabs
- Default view is "Seeking Solution" tab
- Type messages in the input at bottom
- Press Enter or click send button
- Messages broadcast to all connected clients instantly

### Creating Problems
- Click "+ Problem" button (red dashed border, right side)
- Enter problem description
- Click "Seek Solution"
- Problem appears as "🔴 Seeking Solution: [text]" in the Seeking Solution tab

### Factory Orders
- Click "+FO" button in subcategory bar
- Enter Factory Order name/number
- Creates both FO subcategory and first chat automatically
- Click "+ Chat" to add more chats within the FO
- Use "Delete" button to remove entire FO

### Message Management
- **Clear** button: Deletes your own messages from current view
- **Delete** button: Only visible in Factory Order view, deletes entire FO

---

## Stopping the Server

Press `Ctrl + C` in the PowerShell window.

---

## Troubleshooting

### **Phone can't connect?**

- Ensure both devices are on the same WiFi network
- Windows Firewall may require allowing Node.js
- Try temporarily disabling "Public Network" firewall in Windows Settings
- Verify the IP address matches what's shown in terminal

### **Server won't start?**

- Check Node.js is installed:
  ```powershell
  node --version
  ```
- Port 3000 may be in use by another application
- Re-run: `npm install`
- Check for errors in terminal output

### **Messages not appearing?**

- Refresh the browser page
- Check WebSocket connection in browser console (F12)
- Verify server is still running in terminal

---

## Current File Structure

```
Edge Node system #1/
├── server.js              # Luxify Tree orchestrator
├── chat-data.json         # Local JSON database
├── package.json           # Dependencies (ws, compromise)
├── ARCHITECTURE.md        # Luxify Tree philosophy
├── README.md              # This file
│
├── branches/              # Core modules
│   ├── server/
│   │   └── manager.js     # HTTP & WebSocket server
│   ├── chat/
│   │   └── manager.js     # Message & chat management
│   ├── jobs/
│   │   └── manager.js     # Job listings & validation
│   ├── nlp/
│   │   └── processor.js   # Part-of-speech tagging
│   └── ui/
│       └── public/
│           ├── index.html # WhatsApp-style UI
│           ├── style.css  # Dark theme + NLP colors
│           └── app.js     # WebSocket client logic
│
├── grafts/                # Integration layer
│   ├── server-chat.js     # Server ↔ Chat
│   ├── chat-jobs.js       # Chat ↔ Jobs
│   └── ui-nlp.js          # UI ↔ NLP
│
├── water/                 # Shared data schemas
│   └── schemas.js
│
└── sap/                   # Validation & guardrails
    └── validators.js
```

---

## Dependencies

- **ws** (v8.14.2) – Lightweight WebSocket server
- **compromise** (v14.9.0) – Natural language processing library

---

## Luxify Tree Architecture

This system implements the **Luxify Tree** philosophy to prevent "AI mush" and enable sustainable growth. See **ARCHITECTURE.md** for the complete philosophy.

### Why Tree Structure?

- **Prevents AI mush**: Modular branches prevent cascading rewrites
- **Clear boundaries**: Each branch has single responsibility
- **Easy debugging**: Issues are isolated to specific branches
- **Sustainable growth**: New features = new branches, not modifications
- **Human-readable**: File paths map to conceptual structure

### Current Implementation

**Branches** are independent modules (server, chat, jobs, ui, nlp)
**Grafts** connect branches for data flow and integration
**Water** provides shared data schemas used by all branches
**Sap** validates and sanitizes data flowing through the system
**Orchestrator** (server.js) assembles everything

This architecture allows AI assistants to:
- Add features without breaking existing code
- Understand system structure from file paths
- Make surgical changes to isolated modules
- Preserve working code across iterations

---

## Future Enhancements (Planned)

These features are documented but not yet built:

- **Deeper problem tracking**:
  - Solution recording and history
  - "Reflex" patterns (codified solutions)
  - Problem analytics and reporting
  
- **Enhanced NLP**:
  - Sentiment analysis
  - Entity extraction (part numbers, dates, measurements)
  - Auto-tagging of urgent messages

- **Additional branches**:
  - Analytics branch for reporting
  - Notification branch for alerts
  - Export branch for data backup

See **ARCHITECTURE.md** for the full Luxify Tree philosophy and growth patterns.

---

## Philosophy

This system prioritizes:

1. **Simplicity** - No unnecessary dependencies or complexity
2. **Speed** - Real-time updates, minimal latency
3. **Reliability** - JSON file storage, no database failures
4. **Accessibility** - Works on any device with a browser
5. **Modularity** - Clean separation for future growth (see ARCHITECTURE.md)

Built for the shop floor, by people who work on the shop floor.
