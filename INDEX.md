# Luxify Tree Documentation Index

## 📚 Start Here

### New to the Project?
1. **[README.md](README.md)** - Project overview and getting started
2. **[ARCHITECTURE.md](ARCHITECTURE.md)** - Architecture philosophy and principles
3. **[TREE-MAP.md](TREE-MAP.md)** - Visual architecture diagram
4. **[QUICK-REFERENCE.md](QUICK-REFERENCE.md)** - How to add features and make changes

### Understanding the System?
1. **[AUDIT.md](AUDIT.md)** - Complete compliance report and status
2. **[TREE-MAP.md](TREE-MAP.md)** - Dependency graph and data flow

### Working on Features?
1. **[QUICK-REFERENCE.md](QUICK-REFERENCE.md)** - Decision trees and common tasks
2. **Branch/Graft specs** (see below) - Detailed component documentation

---

## 🌿 Branch Specifications

Each branch is a domain module with clear responsibilities.

### Infrastructure
- **[rami/server/.ramus.md](rami/server/.ramus.md)**
  - HTTP & WebSocket server
  - Static file serving
  - Client connection management

### Data & Persistence
- **[rami/chat/.ramus.md](rami/chat/.ramus.md)**
  - Message storage
  - Subcategory (Factory Order) management
  - Individual chat management
  - Database operations

### Business Logic
- **[rami/jobs/.ramus.md](rami/jobs/.ramus.md)**
  - 34 predefined jobs
  - Job validation
  - Name validation for subcategories and chats

### Text Processing
- **[rami/nlp/.ramus.md](rami/nlp/.ramus.md)**
  - Part-of-speech tagging
  - Text color-coding
  - compromise.js integration

### Presentation
- **[rami/ui/.ramus.md](rami/ui/.ramus.md)**
  - Client-side interface
  - WebSocket client
  - API calls
  - No business logic (pure presentation)

---

## 🔗 Graft Specifications

Each graft connects specific rami for integration.

- **[grafts/server-chat/.graft.md](grafts/server-chat/.graft.md)**
  - Bridges: ServerManager ↔ ChatManager
  - HTTP endpoints: login, messages, problems
  - WebSocket: auth, message events
  - Message normalization

- **[grafts/chat-jobs/.graft.md](grafts/chat-jobs/.graft.md)**
  - Bridges: ChatManager ↔ JobsManager
  - Validates jobs before operations
  - Anti-corruption layer

- **[grafts/ui-nlp/.graft.md](grafts/ui-nlp/.graft.md)**
  - Bridges: NLPProcessor ↔ Client UI
  - Endpoint: `/api/nlp/process`
  - Status: Ready but not yet active

---

## 💧 Water & 🛡️ Sap

### Data Schemas (Water)
- **[water/.water.md](water/.water.md)**
  - Shared data structures
  - 34 predefined jobs
  - Field aliases (user/username, job/job_id)
  - Database format

### Validation & Guardrails (Sap)
- **[sap/.sap.md](sap/.sap.md)**
  - Input sanitization
  - Message validation
  - Field normalization
  - Auto-detection (isProblem flag)

---

## 🔧 Development Workflow

### Before Starting Work
1. Read [QUICK-REFERENCE.md](QUICK-REFERENCE.md) - "Adding a New Feature" section
2. Identify which branch(es) the feature touches
3. Read relevant `.ramus.md` or `.graft.md` files

### While Working
1. Make changes in appropriate branch/graft
2. Use SAP for validation
3. Use WATER for data structures
4. Keep UI logic-free

### After Making Changes
1. Update relevant `.ramus.md` or `.graft.md` file
2. Run validation checklist (in QUICK-REFERENCE.md)
3. Update ARCHITECTURE.md if boundaries changed
4. Test feature end-to-end

---

## 📊 Project Status

### ✅ Fully Implemented
- All 5 rami (Server, Chat, Jobs, NLP, UI)
- All 3 grafts (server-chat, chat-jobs, ui-nlp)
- WATER schemas
- SAP validation
- Complete specifications
- Architecture compliance

### ⚠️ Pending Integration
- NLP color-coding in message display (library ready, endpoint ready, not yet called by UI)

### 📋 Future Enhancements
- Integration tests for graft endpoints
- Unit tests for SAP validators
- WebSocket reconnection handling
- Database migration edge cases

---

## 🗂️ File Structure

```
Edge Node system #1/
├── 📄 Documentation
│   ├── README.md (start here)
│   ├── ARCHITECTURE.md (philosophy)
│   ├── TREE-MAP.md (visual diagram)
│   ├── QUICK-REFERENCE.md (how-to guide)
│   ├── AUDIT.md (compliance report)
│   └── INDEX.md (this file)
│
├── 🌿 rami (Domain Modules)
│   ├── server/
│   │   ├── manager.js (HTTP & WebSocket)
│   │   └── .ramus.md (spec)
│   ├── chat/
│   │   ├── manager.js (persistence)
│   │   └── .ramus.md (spec)
│   ├── jobs/
│   │   ├── manager.js (job management)
│   │   └── .ramus.md (spec)
│   ├── nlp/
│   │   ├── processor.js (NLP processing)
│   │   └── .ramus.md (spec)
│   └── ui/
│       ├── public/ (HTML, CSS, JS)
│       └── .ramus.md (spec)
│
├── 🔗 Grafts (Integration)
│   ├── server-chat.js + .graft.md
│   ├── chat-jobs.js + .graft.md
│   └── ui-nlp.js + .graft.md
│
├── 💧 Water (Data Schemas)
│   ├── schemas.js
│   └── .water.md (spec)
│
├── 🛡️ Sap (Validation)
│   ├── validators.js
│   └── .sap.md (spec)
│
├── 🎯 Orchestrator
│   └── server.js (assembles everything)
│
└── 💾 Data
    └── chat-data.json (database)
```

---

## 🎓 Learning Path

### Day 1: Understanding
1. Read README.md (5 min)
2. Read ARCHITECTURE.md (15 min)
3. Look at TREE-MAP.md (5 min)
4. Skim QUICK-REFERENCE.md (10 min)

### Day 2: Components
1. Read all 5 branch specs (30 min)
2. Read all 3 graft specs (15 min)
3. Read WATER and SAP specs (10 min)

### Day 3: Hands-On
1. Follow "Common Tasks" in QUICK-REFERENCE.md
2. Make a small change (add a field, change UI)
3. Follow validation checklist

---

## 🚨 Important Rules

1. **No branch-to-branch calls** - Always use grafts
2. **WATER for data** - Never hardcode schemas
3. **SAP for validation** - Never validate in rami
4. **UI has no logic** - All business rules in backend
5. **Update specs** - Keep `.md` files current

---

## 🔍 Finding What You Need

**"Where do I add X?"**
→ QUICK-REFERENCE.md - "File Location Quick Reference"

**"How does X work?"**
→ Relevant `.ramus.md` or `.graft.md`

**"What data structure should I use?"**
→ water/.water.md

**"How do I validate X?"**
→ sap/.sap.md

**"Is the architecture compliant?"**
→ AUDIT.md

**"What's the overall design?"**
→ ARCHITECTURE.md

**"How do components connect?"**
→ TREE-MAP.md

---

## 📞 Quick Links by Task

| Task | Documentation |
|------|---------------|
| Getting started | [README.md](README.md) |
| Understanding philosophy | [ARCHITECTURE.md](ARCHITECTURE.md) |
| Adding feature | [QUICK-REFERENCE.md](QUICK-REFERENCE.md) |
| Checking compliance | [AUDIT.md](AUDIT.md) |
| Viewing architecture | [TREE-MAP.md](TREE-MAP.md) |
| Server component | [rami/server/.ramus.md](rami/server/.ramus.md) |
| Database operations | [rami/chat/.ramus.md](rami/chat/.ramus.md) |
| Job validation | [rami/jobs/.ramus.md](rami/jobs/.ramus.md) |
| NLP processing | [rami/nlp/.ramus.md](rami/nlp/.ramus.md) |
| UI components | [rami/ui/.ramus.md](rami/ui/.ramus.md) |
| HTTP endpoints | [grafts/server-chat/.graft.md](grafts/server-chat/.graft.md) |
| Job validation layer | [grafts/chat-jobs/.graft.md](grafts/chat-jobs/.graft.md) |
| NLP API | [grafts/ui-nlp/.graft.md](grafts/ui-nlp/.graft.md) |
| Data structures | [water/.water.md](water/.water.md) |
| Input validation | [sap/.sap.md](sap/.sap.md) |

---

## ✨ Keep This Updated

When you:
- Add a new branch → Update this index
- Add a new graft → Update this index
- Create new documentation → Add link here
- Change file structure → Update the tree diagram

**This index should always reflect current state.**
