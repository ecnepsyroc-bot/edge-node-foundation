# Luxify Architecture — Core Specification

The Luxify Architecture is a modular system built on five concepts:

- **rami** — isolated units of responsibility  
- **grafts** — explicit bridges between rami  
- **water** — event and payload definitions  
- **sap** — protective guardrails  
- **leaves** — presentation layer  

These concepts enforce structural integrity and prevent silent coupling.

---

## 1. Rami (`rami/`)

Rami are the isolated units of the system.

### Rules
- A ramus contains its own logic, invariants, and data rules.
- A ramus does **not** import from any other ramus.
- Each ramus includes a `.ramus.md` specifying:
  - responsibilities  
  - non-responsibilities  
  - public APIs  
- Domain truth lives inside each ramus.
- Rami communicate only via grafts or water-defined events.

---

## 2. Grafts (`grafts/`)

Grafts are the only allowed method for connecting rami.

### Rules
- Every cross-ramus interaction must pass through a graft.
- Each graft has a `.graft.md` describing:
  - which rami it connects  
  - allowed data flows  
  - mapping or translation rules  
- Grafts may orchestrate behavior between rami.
- Grafts do **not** contain domain invariants or domain ownership.

---

## 3. Water (`water/`)

Water defines the flow language of the system.

### Rules
- Water files specify event names and payload shapes.
- Water is declarative only:
  - no business logic  
  - no orchestration  
- Events are versioned when payloads change.
- Producers and consumers are documented per event.

---

## 4. Sap (`sap/`)

Sap is the protective outer layer for the architecture.

### Rules
- Sap performs:
  - input sanitation  
  - boundary validation  
  - rate limiting  
  - error handling  
  - logging  
- Sap wraps calls but does not redefine domain rules.
- Sap may block or correct malformed flows.

---

## 5. Leaves (`leaves/`)

Leaves represent UI and presentation.

### Rules
- Leaves render state and capture intent.
- Leaves contain no domain or integration logic.
- Leaves do not import rami directly.
- Leaves interact through grafts or a thin external API.

---

## 6. System Behavior Guidelines

- Isolation is strict: rami never communicate except through grafts or water.
- Responsibilities are explicit: every ramus and graft documents its purpose.
- Data flow is transparent: all flows are declared in water.
- Boundaries are protected: sap guards every edge.
- Presentation is separate: leaves are purely representational.

---

## 7. Evolution Rules

- If a ramus grows beyond its scope, split it.
- If a graft becomes overloaded, divide it.
- If a ramus begins accumulating UI needs, create or extend leaves.
- Specification files (`.ramus.md`, `.graft.md`) are updated alongside code changes.

---

This is the complete and minimal Luxify Architecture.
