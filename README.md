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
Self-contained units. Each ramus owns one slice of the system’s truth.  
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
rami/        # isolated units of responsibility
grafts/      # bridges between rami
water/       # event & payload definitions
sap/         # guardrails
leaves/      # UI
api/         # thin HTTP/WS adapters
