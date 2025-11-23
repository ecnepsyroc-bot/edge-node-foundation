# Luxify Architecture Migration Audit

**Date:** November 16, 2025  
**System:** Feature Millwork Chat  
**Status:** ⚠️ Requires Migration to Full Compliance

---

## Executive Summary

This system is **functionally complete and production-ready** but has **architectural violations** against the canonical Luxify specification (ARCHITECTURE.md). 

The violations are structural placement issues, not fundamental design flaws. The modular separation exists, but files are in non-compliant locations.

**Migration Required:**
- Move UI from `rami/ui/` → `leaves/ui/`
- Remove infrastructure ramus (`rami/server/`) → integrate into orchestrator or create `infrastructure/` layer
- Move NLP from `rami/` → `services/nlp/` (it's a utility, not domain logic)
- Clarify water as pure event declarations (not shared schemas)

---

## Current Structure (As-Is)

```
Edge Node system #1/
├── rami/                      ❌ Contains non-domain modules
│   ├── server/                ❌ Infrastructure, not a domain
│   ├── chat/                  ✅ Valid domain ramus
│   ├── jobs/                  ✅ Valid domain ramus
│   ├── nlp/                   ❌ Utility service, not domain
│   └── ui/                    ❌ Presentation layer, should be in leaves/
│       └── public/
│           ├── index.html
│           ├── app.js
│           └── style.css
│
├── grafts/                    ✅ Correct placement
│   ├── server-chat.js
│   ├── chat-jobs.js
│   └── ui-nlp.js
│
├── water/                     ⚠️ Contains schemas, should be events
│   └── schemas.js
│
├── sap/                       ✅ Correct placement
│   └── validators.js
│
├── public/                    ❓ Duplicate UI assets (legacy?)
│   ├── index.html
│   ├── app.js
│   └── style.css
│
└── server.js                  ✅ Valid orchestrator
```

---

## Compliance Analysis

### ✅ **Compliant Elements**

#### 1. Domain Rami
- **`rami/chat/`** - Message persistence, CRUD operations
  - Clear domain boundary: "message lifecycle"
  - No cross-ramus imports
  - Exports clean API via ChatManager class
  - Specification file present (.ramus.md)

- **`rami/jobs/`** - Job catalog and validation
  - Clear domain boundary: "job registry"
  - 34 predefined jobs maintained
  - Job name validation
  - Specification file present (.ramus.md)

#### 2. Grafts
- **`grafts/server-chat.js`** - Connects server to chat
  - HTTP endpoint mapping
  - WebSocket event translation
  - No domain logic (pure integration)
  - Specification file present (.graft.md)

- **`grafts/chat-jobs.js`** - Validates jobs before chat operations
  - Anti-corruption layer
  - Prevents invalid job names entering ChatManager
  - Specification file present (.graft.md)

- **`grafts/ui-nlp.js`** - Exposes NLP processing endpoint
  - Thin HTTP wrapper
  - No business logic
  - Specification file present (.graft.md)

#### 3. Sap (Validation Layer)
- **`sap/validators.js`**
  - Text sanitization
  - Message validation
  - Input length limits
  - Control character removal
  - Specification file present (.sap.md)

#### 4. Orchestrator
- **`server.js`**
  - Assembles rami via grafts
  - Routes HTTP requests
  - No business logic
  - Clean delegation pattern

---

### ❌ **Non-Compliant Elements**

#### 1. UI in Rami (`rami/ui/`)

**Violation:**
- Presentation layer placed inside `rami/` folder
- Has `.ramus.md` specification (UI should not have ramus specs)
- Contains HTML, CSS, JavaScript client code

**Luxify Rule:**
> Leaves represent UI and presentation.
> Leaves contain no domain or integration logic.
> Leaves do not import rami directly.

**Why This Violates:**
- UI is not a "domain responsibility"
- Presentation is explicitly the role of `leaves/`
- Current structure creates false equivalence between domain logic (chat, jobs) and presentation (UI)

**Migration Path:**
```
rami/ui/public/       → leaves/ui/
rami/ui/.ramus.md     → DELETE (leaves don't use .ramus.md)
```

---

#### 2. Server Infrastructure in Rami (`rami/server/`)

**Violation:**
- HTTP/WebSocket server management placed in `rami/`
- Infrastructure is not domain logic
- Has `.ramus.md` but doesn't own domain invariants

**Luxify Rule:**
> A ramus contains its own logic, invariants, and data rules.
> Domain truth lives inside each ramus.

**Why This Violates:**
- Server infrastructure is not a domain
- It doesn't own business rules or domain state
- It's a technical layer, not a conceptual domain

**Migration Path:**

**Option A: Inline in Orchestrator**
```javascript
// server.js
const http = require('http');
const WebSocket = require('ws');
const chatManager = new ChatManager();
const jobsManager = new JobsManager();
// ... direct server setup here
```

**Option B: Infrastructure Layer**
```
infrastructure/
    server/
        http.js
        ws.js
```

**Recommendation:** Option A (inline) for this small system. Luxify doesn't mandate infrastructure be in rami.

---

#### 3. NLP as a Ramus (`rami/nlp/`)

**Violation:**
- Natural language processing is a utility service, not domain logic
- Doesn't own domain invariants
- Pure transformation function (text → colored text)

**Luxify Rule:**
> A ramus contains its own logic, invariants, and data rules.

**Why This Violates:**
- NLP has no domain state
- No domain rules to protect
- It's a tool used by other layers, not a domain itself

**Migration Path:**
```
rami/nlp/             → services/nlp/
rami/nlp/.ramus.md    → DELETE
grafts/ui-nlp.js      → KEEP (connects service to system)
```

Services are utilities that can be grafted into the system but aren't domains.

---

#### 4. Water as Shared Schemas (`water/schemas.js`)

**Current Implementation:**
```javascript
module.exports = {
  predefinedJobs: [ ... ],
  Message: { ... },
  User: { ... },
  JobSubcategory: { ... },
  IndividualChat: { ... }
};
```

**Violation:**
- Water contains shared data structures
- Functions as a "models" or "types" module

**Luxify Rule:**
> Water defines the flow language of the system.
> Water files specify event names and payload shapes.
> Water is declarative only: no business logic, no orchestration.

**Why This Violates:**
- Current implementation is shared schemas, not event definitions
- Water should describe **what flows**, not **what exists**

**Migration Path:**

**Create:** `water/events.md`
```markdown
# System Events

## message.sent
**Producer:** ui (via WebSocket)
**Consumers:** chat (storage), all clients (broadcast)
**Payload:**
- text: string
- job_id: string
- subcategory?: string
- individual_chat_id?: string

## problem.created
**Producer:** ui (via WebSocket)
**Consumers:** chat (storage), all clients (broadcast)
**Payload:**
- problem_text: string
- job_id: string
- subcategory: string
- individual_chat_id?: string

## chat.cleared
**Producer:** ui (via HTTP DELETE)
**Consumers:** chat (deletion), all clients (broadcast)
**Payload:**
- job_id: string
- subcategory: string
- chat_id?: string
```

**Move schemas to:** `rami/chat/schemas.js` (domain owns its data shapes)

---

#### 5. Duplicate Public Assets

**Observation:**
- `public/` folder at root contains index.html, app.js, style.css
- `rami/ui/public/` contains same files
- One is likely legacy/unused

**Migration Path:**
1. Verify which is active (check server.js PUBLIC_DIR path)
2. Delete unused copy
3. Keep only `leaves/ui/` after migration

---

## Target Structure (Should-Be)

```
Edge Node system #1/
├── rami/                      ✅ Domain logic only
│   ├── chat/
│   │   ├── .ramus.md
│   │   ├── manager.js
│   │   └── schemas.js         ← Moved from water/
│   └── jobs/
│       ├── .ramus.md
│       └── manager.js
│
├── grafts/                    ✅ Integration bridges
│   ├── chat-jobs.js
│   ├── chat-jobs/
│   │   └── .graft.md
│   └── nlp-integration.js     ← Connects services/nlp to system
│
├── water/                     ✅ Event declarations
│   └── events.md              ← Pure event documentation
│
├── sap/                       ✅ Guardrails
│   ├── validators.js
│   └── .sap.md
│
├── leaves/                    ✅ Presentation layer
│   └── ui/
│       ├── index.html
│       ├── app.js
│       └── style.css
│
├── services/                  ✅ Utility functions
│   └── nlp/
│       └── processor.js
│
└── server.js                  ✅ Orchestrator (with inline server setup)
```

---

## Migration Steps

### Phase 1: Structural Cleanup (Non-Breaking)

#### Step 1.1: Create Leaves Directory
```powershell
New-Item -ItemType Directory -Path "leaves"
New-Item -ItemType Directory -Path "leaves/ui"
```

#### Step 1.2: Move UI Assets
```powershell
Move-Item -Path "rami/ui/public/*" -Destination "leaves/ui/"
```

#### Step 1.3: Delete UI Ramus Spec
```powershell
Remove-Item "rami/ui/.ramus.md"
Remove-Item -Recurse "rami/ui"
```

#### Step 1.4: Update Server.js PUBLIC_DIR
```javascript
// Before:
const PUBLIC_DIR = path.join(__dirname, 'rami', 'ui', 'public');

// After:
const PUBLIC_DIR = path.join(__dirname, 'leaves', 'ui');
```

#### Step 1.5: Remove Duplicate Public Folder
```powershell
# Verify it's not used first
Remove-Item -Recurse "public"
```

---

### Phase 2: Infrastructure Refactor (Breaking Changes)

#### Step 2.1: Inline Server Infrastructure

**Move server setup into server.js:**

```javascript
// server.js
const http = require('http');
const WebSocket = require('ws');
const path = require('path');
const fs = require('fs');
const os = require('os');

// Rami
const ChatManager = require('./rami/chat/manager');
const JobsManager = require('./rami/jobs/manager');

// Grafts
const ServerChatGraft = require('./grafts/server-chat');
const ChatJobsGraft = require('./grafts/chat-jobs');

// Initialize rami
const chatManager = new ChatManager(path.join(__dirname, 'chat-data.json'));
const jobsManager = new JobsManager();

// Create HTTP server
const server = http.createServer((req, res) => {
  // Route handling
  const graft = new ServerChatGraft(chatManager);
  if (graft.handleHTTPRequest(req, res)) return;
  
  // Serve static files
  let filePath = req.url === '/' ? '/index.html' : req.url;
  filePath = path.join(__dirname, 'leaves', 'ui', filePath);
  fs.readFile(filePath, (err, content) => {
    if (err) {
      res.writeHead(404);
      res.end('Not Found');
    } else {
      res.writeHead(200);
      res.end(content);
    }
  });
});

// Create WebSocket server
const wss = new WebSocket.Server({ server });
const graft = new ServerChatGraft(chatManager);
wss.on('connection', (ws) => graft.handleWebSocket(ws));

// Start server
const PORT = 3000;
server.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  const interfaces = os.networkInterfaces();
  Object.values(interfaces).flat()
    .filter(i => i.family === 'IPv4' && !i.internal)
    .forEach(i => console.log(`Network access: http://${i.address}:${PORT}`));
});
```

#### Step 2.2: Delete Server Ramus
```powershell
Remove-Item -Recurse "rami/server"
```

#### Step 2.3: Update Grafts
Remove ServerManager references from `grafts/server-chat.js` - make it handle raw HTTP/WS instead.

---

### Phase 3: NLP Service Migration

#### Step 3.1: Create Services Directory
```powershell
New-Item -ItemType Directory -Path "services"
New-Item -ItemType Directory -Path "services/nlp"
```

#### Step 3.2: Move NLP Processor
```powershell
Move-Item "rami/nlp/processor.js" "services/nlp/processor.js"
Remove-Item "rami/nlp/.ramus.md"
Remove-Item -Recurse "rami/nlp"
```

#### Step 3.3: Update NLP Graft
```javascript
// grafts/ui-nlp.js
const NLPProcessor = require('../services/nlp/processor');
```

---

### Phase 4: Water Refactor

#### Step 4.1: Document Events
Create `water/events.md` with all system events.

#### Step 4.2: Move Schemas to Chat Ramus
```powershell
Move-Item "water/schemas.js" "rami/chat/schemas.js"
```

#### Step 4.3: Update Imports
```javascript
// Before:
const { predefinedJobs, Message } = require('./water/schemas');

// After:
const { predefinedJobs, Message } = require('./rami/chat/schemas');
```

---

## Risk Assessment

### Low Risk (UI Move)
- **Breaking:** Path changes in server.js
- **Mitigation:** Single file update
- **Testing:** Verify static files load

### Medium Risk (Server Inline)
- **Breaking:** Graft interfaces change
- **Mitigation:** Update grafts to accept raw req/res
- **Testing:** Full integration test of all endpoints

### Low Risk (NLP Move)
- **Breaking:** Import path changes
- **Mitigation:** Single graft file update
- **Testing:** Verify /api/nlp/process endpoint

### Low Risk (Water Refactor)
- **Breaking:** Import paths
- **Mitigation:** Update all schema imports
- **Testing:** Verify no runtime errors

---

## Recommended Migration Order

1. ✅ **Phase 1** (Leaves) - Do first, lowest risk
2. ✅ **Phase 3** (NLP) - Do second, isolated change
3. ✅ **Phase 4** (Water) - Do third, documentation only
4. ⚠️ **Phase 2** (Server) - Do last, highest complexity

**Estimated Time:** 2-4 hours for full migration

---

## Post-Migration Validation

### Checklist
- [ ] Server starts without errors
- [ ] UI loads at http://localhost:3000
- [ ] Login works
- [ ] Messages send/receive via WebSocket
- [ ] Jobs list loads
- [ ] Factory Orders create/delete
- [ ] Individual chats create/delete
- [ ] Problems create/solve/delete
- [ ] Clear button works
- [ ] Delete button works (context-aware)
- [ ] All WebSocket events broadcast correctly

### Documentation Updates
- [ ] Update ARCHITECTURE.md implementation section (if added back)
- [ ] Update README.md file structure diagram
- [ ] Update SYSTEM-FUNCTIONS-REPORT.md (if paths mentioned)
- [ ] Update INDEX.md links
- [ ] Update TREE-MAP.md structure

---

## Conclusion

**Current Status:** ⚠️ Architecturally non-compliant but functionally complete

**Migration Complexity:** Medium (4-6 file moves, 3-5 import updates, 1 major refactor)

**Benefit:** Full alignment with canonical Luxify Architecture

**Recommendation:** Proceed with migration in phases to minimize risk and allow incremental testing.

---

## Questions for Stakeholders

1. **Is the system currently in production?**
   - If yes, schedule maintenance window for migration
   - If no, migrate before deployment

2. **Are there automated tests?**
   - Migration would benefit from test coverage
   - Consider adding integration tests first

3. **Is the duplicate `public/` folder still needed?**
   - Can be safely deleted if unused

4. **Should we keep git history during migration?**
   - Use `git mv` instead of PowerShell `Move-Item`

---

**Next Step:** Approve migration plan and schedule execution window.
