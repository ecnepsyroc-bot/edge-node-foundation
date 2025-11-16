# edge-node-system-1
> **Edge Node architecture v1** — rami, grafts, water, sap, leaves.  
> A control surface for building modular human–AI systems where boundaries stay intact.

---

## 0. What This Repo Is

This repo contains the first Edge Node designed using the Luxify Tree architecture.

It uses five structural concepts:
- **rami** — isolated units of responsibility  
- **grafts** — integration points between rami  
- **water** — flow specifications (events + payload shapes)  
- **sap** — protective guardrails  
- **leaves** — UI / presentation  

Nothing links across rami except through grafts.  
Nothing in leaves contains business logic.  
Nothing in water contains implementation.  
Nothing in sap replaces domain truth.

---

## 1. Core Vocabulary

### **Rami (`rami/`)**  
Self-contained units. Each ramus owns one slice of the system's truth.  
A ramus contains its logic, its invariants, and its data rules.  
Rami do not import from each other.

---

### **Grafts (`grafts/`)**  
Explicit bridges between rami.  
A graft coordinates, maps, and connects.  
No hidden imports.  
No silent coupling.  
All cross-ramus behavior goes through grafts.

---

### **Water (`water/`)**  
Defines what flows through the system:  
- event names  
- payload shapes  
- producer and consumer rami  

Water is declarative only.

---

### **Sap (`sap/`)**  
Protective layer around everything:  
- input sanitation  
- rate limits  
- boundary checks  
- error handling  

Sap wraps operations but does not define domain truth.

---

### **Leaves (`leaves/`)**  
Presentation.  
UI only.  
No domain logic.  
No direct calls into other rami.  
Leaves talk through grafts or API endpoints.

---

## 2. Architecture Rules (Contract)

### 2.1 Rami
- Each ramus is isolated.
- Each ramus has a `.ramus.md` stating:
  - responsibilities  
  - non-responsibilities  
  - public APIs  
- Rami do **not** reference other rami.
- Core invariants live inside each ramus.

---

### 2.2 Grafts
- All cross-ramus behavior must pass through grafts.
- Each graft has a `.graft.md` defining:
  - which rami it connects  
  - allowed flows  
  - mapping/translation rules  
- Grafts orchestrate but do not own domain logic.

---

### 2.3 Water
- Water defines event types and payload shapes.
- It contains zero business logic.
- Events are versioned (`v1`, `v2`, etc.).
- Producers/consumers are specified explicitly.

---

### 2.4 Sap
- Sap protects, wraps, and validates.
- Sap does not redefine domain rules.
- Sap may block, sanitize, throttle, or enforce boundaries.

---

### 2.5 Leaves
- Leaves render state and capture user intent.
- No domain decisions.
- No cross-ramus imports.
- All interactions go through grafts or a thin API.

---

## 3. Why This Matters for an Edge Node

Edge Nodes tend to decay into:
- giant server files  
- UI mixed with logic  
- quiet cross-imports  
- AI assistants flattening layers  

The Tree prevents this:
- rami keep truth isolated  
- grafts keep integrations explicit  
- water keeps flows transparent  
- sap keeps boundaries safe  
- leaves keep UI clean  

This creates a system that humans can reason about and AIs can safely modify.

---

## 4. Repo Layout Template

As the system grows, expect a structure like:

```text
edge-node-system-1/
├── rami/                      # isolated units of responsibility
│   ├── jobs/
│   │   ├── .ramus.md         # contract: what jobs owns
│   │   ├── index.js          # public API
│   │   ├── job-store.js      # internal logic
│   │   └── job-rules.js      # domain invariants
│   │
│   ├── messaging/
│   │   ├── .ramus.md
│   │   ├── index.js
│   │   ├── message-store.js
│   │   └── websocket-handler.js
│   │
│   └── factory-orders/
│       ├── .ramus.md
│       ├── index.js
│       └── order-tracking.js
│
├── grafts/                    # bridges between rami
│   ├── job-messaging/
│   │   ├── .graft.md         # contract: jobs ↔ messaging
│   │   └── index.js
│   │
│   └── factory-messaging/
│       ├── .graft.md         # contract: factory-orders ↔ messaging
│       └── index.js
│
├── water/                     # event & payload definitions
│   ├── events.md             # event catalog
│   ├── job-events.json       # job-related event schemas
│   └── message-events.json   # messaging event schemas
│
├── sap/                       # guardrails
│   ├── rate-limiter.js       # protect endpoints
│   ├── input-sanitizer.js    # clean user input
│   └── error-boundary.js     # wrap operations
│
├── leaves/                    # UI / presentation
│   ├── job-selector.html
│   ├── chat-panel.html
│   └── problem-tracker.html
│
├── api/                       # thin HTTP/WS adapters
│   ├── routes.js             # route definitions
│   └── websocket.js          # WS endpoint
│
├── server.js                  # bootstrap only
├── package.json
└── README.md
```

**Key principles:**
- Each ramus is self-contained
- Grafts are the only cross-ramus pathways
- Water documents flows but contains no code
- Sap wraps but doesn't replace domain logic
- Leaves read through grafts, never directly from rami

---

## 5. Enforcement & Tools

### **For AI Assistants:**
- `.ramus.md` and `.graft.md` files are **contracts**
- Front-matter blocks control which rules apply where
- When in doubt, ask: "Which ramus owns this?"
- Never create cross-ramus imports inside a ramus file
- All integration code belongs in grafts

### **For Humans:**
- Review `.ramus.md` before adding features to a ramus
- Update spec files **before or during** code changes
- Question any import that reaches across rami
- Use grafts for coordination, not business logic

### **Optional Tooling:**
```bash
# Import linter (future)
npm run lint:imports

# Test coverage per ramus
npm run test:ramus jobs
npm run test:graft job-messaging

# CI check for cross-ramus imports
npm run check:boundaries
```

---

## 6. Quick Reference Card

### **Allowed Flows:**
```
✅ leaves → grafts → rami
✅ ramus A → graft → ramus B
✅ sap wrapping any operation
✅ water documenting any flow
```

### **Forbidden Flows:**
```
❌ leaves → rami (direct)
❌ ramus A → ramus B (direct)
❌ graft containing domain logic
❌ water containing implementation
```

### **When Adding a Feature:**
1. **Identify the ramus** — Which domain owns this?
2. **Check the contract** — Read `.ramus.md`
3. **Add to ramus** — If it's core logic
4. **Add to graft** — If it coordinates rami
5. **Update water** — If new events flow
6. **Wrap with sap** — If boundaries need protection
7. **Render in leaves** — Keep UI thin

---

## 7. Migration Path: Monolith to Tree

### **Current State (v0):**
```
server.js        # 800+ lines, everything mixed
app.js           # UI + logic + data
```

### **Step 1: Extract First Ramus**
Pick the clearest bounded context:
```
rami/jobs/
├── .ramus.md
└── index.js     # move job logic here
```
Keep everything else in `server.js` temporarily.

### **Step 2: Add First Graft**
When jobs needs to talk to something else:
```
grafts/job-messaging/
├── .graft.md
└── index.js     # coordinate jobs ↔ messaging
```

### **Step 3: Extract Second Ramus**
Now messaging can become independent:
```
rami/messaging/
├── .ramus.md
└── index.js
```

### **Step 4: Repeat**
Continue extracting rami as boundaries crystallize.  
**Don't force it** — wait for pain points to guide extraction.

### **Step 5: Add Sap & Water**
Once rami stabilize, document flows and add protection:
```
water/events.md         # document what flows where
sap/rate-limiter.js     # protect endpoints
```

### **Step 6: Clean Leaves**
Final step: ensure UI has no business logic:
```
leaves/chat-panel.html  # pure presentation
```

---

## 8. Working with This System

### **Adding a New Feature:**
1. Read the architecture philosophy (`tree-philosophy.md`)
2. Identify which ramus owns the feature
3. Read that ramus's `.ramus.md` contract
4. Implement inside the ramus (or via graft if cross-cutting)
5. Update `.ramus.md` or `.graft.md` if contracts change
6. Document any new events in `water/`

### **Modifying Existing Code:**
1. Locate the file in the directory structure
2. Read the corresponding `.ramus.md` or `.graft.md`
3. Respect the boundaries defined there
4. If you need to reach across rami, create/use a graft
5. Update spec files if behavior changes

### **Refactoring Boundaries:**
Boundaries can change! If you discover:
- Two rami are actually one domain → merge them
- One ramus is doing too much → split it
- A graft has business logic → move it to a ramus

**Just update the `.ramus.md` and `.graft.md` files to reflect new reality.**

---

## 9. The Bottom Line

This isn't architecture astronautics.  
It's a **control surface** that keeps AI assistants from collapsing your system into mush.

**The rules are simple:**
- Rami = isolated domains
- Grafts = explicit integrations
- Water = flow documentation
- Sap = boundary protection
- Leaves = presentation only

**The benefit is clear:**
- Humans can reason about the system
- AIs can safely modify it
- Boundaries stay intact over time
- Refactoring has guard rails

Start with one ramus. Add grafts as needed. Let the structure emerge from real pain points.

The Tree grows naturally when you respect the rules.
