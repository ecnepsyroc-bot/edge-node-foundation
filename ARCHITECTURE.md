# Architecture Philosophy: The Luxify Tree

## TL;DR

The "Tree" terminology isn't bullshit—it's a **control surface for working with AI assistants**. The rules prevent layer-mushing and implicit coupling that AI tools naturally create.

---

## 1. What the Luxify Tree Rules Actually Are

Stripped of metaphor, the spec says:

* `branches/` = separate domains/modules
* Each branch has an explicit spec (`.branch.md`)
* No reaching across branches directly; integration happens through `grafts/`
* "Water" = data/event flow between branches
* "Sap" = guardrails/validation wrapped *around* existing logic
* "Leaves" = UI/view/template layer that must not contain core business rules
* When in doubt, clarify *which branch or graft* we're touching

This is **normal modular design**:

* Branch = bounded context / module
* Graft = integration layer / anti-corruption layer
* Water = events / DTOs / pipelines
* Sap = validation, policies, guardrails
* Leaves = presentation layer

The only weird thing is the vocabulary—and that's intentional to stop AI from collapsing everything into "one big system".

---

## 2. Why Metaphors Work Here

**The critique:** "Metaphors don't clarify; they obscure."

**Reality:** For Cory + multiple AIs + automations + spreadsheets + Pi screens that all need to speak the same "map", a fixed vocabulary is a **control surface**.

Your actual problem: models and tools keep mixing layers ("one massive workspace") instead of respecting boundaries.

For humans-only teams, metaphors can be fluff.  
For "human + LLM ecosystem", a fixed vocabulary is scaffolding.

**Risk:** Metaphor overload (Roots, Cambium, Bark, Mycelium, etc.).  
**Guard:** Keep vocabulary small and stable: branches, grafts, water, sap, leaves.

---

## 3. Branch Boundaries (Not Dogma)

**The critique:** "Do NOT reference other branches unless GRAFT" is religious.

**Reality:** Your number-one failure mode has been **implicit coupling** and "just grab whatever from wherever."

Hard walls (branches) and explicit crossings (grafts) are *good training wheels*.

**What would be bullshit:**
* Forbidding yourself from ever refactoring branch boundaries
* Treating "no direct reference ever" as holy doctrine even when a simple shared util lib would do

**Your actual rule:** Only applies "when editing files inside one branch folder", and allows cross-branch work via named `[GRAFT]`. That's just "don't reach around the API; use the integration layer."

**Guard:** Allow branches/grafts to evolve when domain boundaries clearly shift.

---

## 4. Spec Files (Not Theater)

**The critique:** `.branch.md` and `.graft.md` are documentation theater. Code is the spec.

**Reality for your use case:**

You're using:
* `.branch.md` as the **prompt + contract** for AI tools ("this is what lives here, this is what does *not* live here")
* `.graft.md` as the integration contract so AI doesn't invent weird calls across branches

These files are:
* Part doc
* Part **prompt boundary**
* Part "do not cross" tape for automation

**What would be bullshit:**
* Treating them as "authoritative" but never maintaining them
* Writing 4 pages of vague philosophy instead of 10 lines of concrete contracts

**Guard:** Keep them short, mechanical, and update-first when you change behavior.

---

## 5. WATER/SAP/LEAVES Clarity

**The critique:** Pulling validation (sap) and events (water) out of the branch violates locality.

**Healthy reading:**

* **Branch:** Core rules, invariants, and *internal* validation
* **Sap:** Cross-cutting protection and guardrails (rate limits, input sanitation between branches, error handling around I/O)
* **Water:** How branches talk to each other (events, messages, feeds), not their internal business rules
* **Leaves:** Presentation layer—reads from modules but defines no business rules

**What would be bullshit:**
* "All validation must live in sap/" instead of "Core invariants live with the domain; cross-cutting protection is sap"

---

## 6. Enforcement Mechanism

**The critique:** "It's just honor-system architecture; it will collapse."

**Reality:** Your **primary enforcer is the LLM**.

The front-matter block (`description`, `globs`, `alwaysApply`) is for tools like Cursor / Copilot / Claude Projects / repo-wide policies.

Those tools use this metadata to decide:
* Which guidelines to apply where
* Which files are in which branch
* What they're allowed to import

**Enforcement exists:**
→ "When the AI is in `branches/foo/**`, it must obey the Branch rules."

You can add *more* enforcement (linters, tests, CI checks), but there IS a mechanism.

---

## 7. Real Warnings to Heed

1. **Metaphors can get out of hand**
   Keep the vocabulary small and stable: branches, grafts, water, sap, leaves. That's enough.

2. **Branch boundaries must be allowed to change**
   If you realize "these two branches are actually one domain", merge them and update the specs.

3. **Docs can rot**
   `.branch.md` and `.graft.md` must be:
   * Short
   * Factual
   * Updated **before/along with** code changes

4. **Grafts can turn into god-objects**
   If a graft starts doing heavy business logic that rightfully belongs inside a branch, that's a smell.

---

## 8. De-Theatered Version (If Needed)

Same thing, no poetry:

### **Modules (`branches/`)**
* Each top-level folder is a domain module
* Each module has a `.branch.md` that:
  * Defines purpose and responsibilities
  * Lists public entry points / contracts
  * States what it explicitly *does not* handle

### **Integrations (`grafts/`)**
* Each folder is an integration between specific modules
* Each has a `.graft.md` describing:
  * Which modules it touches
  * What data/events it passes back and forth
  * Any mapping/translation rules

### **Flows (WATER)**
* When defining flows, only connect the modules named by the user
* Don't move responsibilities; just define the communication

### **Guardrails (SAP)**
* Add validation and safety at boundaries
* Don't rewrite the core business rules; wrap them

### **Presentation (LEAVES)**
* UI/templates/dashboards/panels
* They can read from modules but may not define new business rules

This is fully legit architecture. The "Tree" naming is just skin.

---

## 9. What's Actually Bullshit vs. What's Not

### **NOT bullshit:**
* Using branches/grafts to keep AI and humans from mixing concerns
* Using `.branch.md` / `.graft.md` as promptable contracts
* Forbidding random cross-branch imports from inside a branch
* Separating domain logic, integration flows, and UI

### **Actual bullshit to avoid:**
* Turning the metaphor into doctrine ("never refactor branches", "all validation must be sap")
* Letting specs rot while still calling them "authoritative"
* Over-ceremonial GRAFTs for trivial utilities that should just be a shared library

---

## 10. The Real Point

If you treat the Tree as a **pragmatic safety harness for your brain + AI**, not as a religion, it's not architecture theater at all.

It's you building a language that keeps your system from dissolving into the mush that every assistant wants to create.

---

## Current Project Implementation

This shop communication tool is currently a **monolithic proof-of-concept**. To apply Tree principles:

### Candidate Branches:
* `branches/jobs/` - Job management (create, list, switch, store metadata)
* `branches/messaging/` - Real-time chat (WebSocket, message storage, delivery)
* `branches/factory-orders/` - Factory Order subcategory + individual chats
* `branches/problems/` - Problem tracking ("Seeking solution" messages)

### Candidate Grafts:
* `grafts/job-messaging/` - How jobs display their messages
* `grafts/factory-messaging/` - How Factory Orders route to individual chats
* `grafts/problem-messaging/` - How problems appear in General view

### Current State:
* All logic in single `server.js` and `app.js`
* Natural evolution: extract as patterns become clear
* **Don't force extraction prematurely**—wait for pain points

### Guard Rails:
* When adding features, ask: "Which branch does this belong to?"
* If answer is unclear, it might need a new branch or belongs in a graft
* Update this doc when boundaries crystallize
