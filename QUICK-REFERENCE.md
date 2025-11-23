# Quick Reference: Working with Luxify Tree

## Adding a New Feature - Decision Tree

### 1. What kind of feature is it?

**UI Change (button, style, layout)?**
→ Edit `rami/ui/public/` (index.html, app.js, or style.css)
→ Update `rami/ui/.ramus.md` if behavior changes

**New API Endpoint?**
→ Determine which rami it touches
→ Add to appropriate graft (or create new one)
→ Update graft `.graft.md`

**New Data Field?**
→ Add to `water/schemas.js`
→ Add validation to `sap/validators.js`
→ Update `water/.water.md` and `sap/.sap.md`

**New Job or Job-Related Logic?**
→ Edit `rami/jobs/manager.js`
→ Update `rami/jobs/.ramus.md`

**New Message Storage Logic?**
→ Edit `rami/chat/manager.js`
→ Update `rami/chat/.ramus.md`

**NLP Feature?**
→ Edit `rami/nlp/processor.js`
→ Update `rami/nlp/.ramus.md`

### 2. Does it touch multiple rami?

**YES** → Create or extend a graft
- Choose which rami need to communicate
- Edit appropriate graft file (or create new one)
- Update `.graft.md` specification

**NO** → Edit the single ramus
- Make changes within that ramus only
- Update `.ramus.md` if public interface changes

### 3. After making changes:

✅ Update relevant `.ramus.md` or `.graft.md`  
✅ Test the feature  
✅ Check that no ramus-to-ramus calls were added  
✅ Verify SAP validation is in place for new inputs  

---

## File Location Quick Reference

### When you need to...

**Add HTTP endpoint**
→ `server.js` (orchestrator) or appropriate graft

**Add WebSocket event**
→ `grafts/server-chat.js` (handles WebSocket messaging)

**Store new data**
→ `rami/chat/manager.js` (database operations)

**Validate input**
→ `sap/validators.js` (add validation function)

**Define data structure**
→ `water/schemas.js` (add schema)

**Process text with NLP**
→ `rami/nlp/processor.js` (NLP logic)

**Change UI appearance**
→ `rami/ui/public/style.css` (styling)

**Change UI behavior**
→ `rami/ui/public/app.js` (client-side logic)

**Manage jobs**
→ `rami/jobs/manager.js` (job list and validation)

---

## Common Tasks

### Add a New Message Field

1. Add to schema: `water/schemas.js`
   ```javascript
   message: {
     // ... existing fields
     newField: 'string'
   }
   ```

2. Add validation: `sap/validators.js`
   ```javascript
   function sanitizeMessage(msgData) {
     // ... existing code
     newField: sanitizeText(msgData.newField || '')
   }
   ```

3. Update ChatManager: `rami/chat/manager.js`
   ```javascript
   addMessage(msgData) {
     // Already uses sanitizeMessage, so no change needed
   }
   ```

4. Update UI: `rami/ui/public/app.js`
   ```javascript
   // Send message with new field
   ws.send(JSON.stringify({
     type: 'message',
     newField: value
   }));
   ```

5. Update specs:
   - `water/.water.md` - Document new field
   - `sap/.sap.md` - Document validation

### Add a New API Endpoint

1. Choose the graft (or create new one)
   - Server + Chat → `grafts/server-chat.js`
   - Chat + Jobs → `grafts/chat-jobs.js`
   - UI + NLP → `grafts/ui-nlp.js`

2. Add to graft's `handleHTTPRequest()`:
   ```javascript
   if (req.url === '/api/new-endpoint' && req.method === 'POST') {
     // Handle request
     return true;
   }
   ```

3. Add to orchestrator: `server.js`
   ```javascript
   if (appropriateGraft.handleHTTPRequest(req, res)) {
     return;
   }
   ```

4. Update graft spec file: `.graft.md`

### Create a New ramus

1. Create folder: `rami/new-ramus/`

2. Create main file: `rami/new-ramus/manager.js`
   ```javascript
   /**
    * ramus: Newramus
    * 
    * Purpose description
    */
   class NewBranchManager {
     constructor() {
       // Initialize
     }
   }
   module.exports = NewBranchManager;
   ```

3. Create spec: `rami/new-ramus/.ramus.md`

4. Add to orchestrator: `server.js`
   ```javascript
   const NewBranchManager = require('./rami/new-ramus/manager');
   const newramus = new NewBranchManager();
   ```

5. Create graft to connect it to other rami

6. Update `ARCHITECTURE.md` and `TREE-MAP.md`

### Create a New Graft

1. Create file: `grafts/branch1-branch2.js`
   ```javascript
   /**
    * GRAFT: Branch1 ↔ Branch2
    * 
    * Purpose description
    */
   class Branch1Branch2Graft {
     constructor(branch1Manager, branch2Manager) {
       this.branch1 = branch1Manager;
       this.branch2 = branch2Manager;
     }
   }
   module.exports = Branch1Branch2Graft;
   ```

2. Create spec: `grafts/branch1-branch2/.graft.md`

3. Add to orchestrator: `server.js`
   ```javascript
   const Branch1Branch2Graft = require('./grafts/branch1-branch2');
   const graft = new Branch1Branch2Graft(branch1, branch2);
   ```

4. Update `ARCHITECTURE.md` and `TREE-MAP.md`

---

## Validation Checklist

Before committing changes:

- [ ] No direct ramus-to-ramus `require()` statements
- [ ] All cross-ramus calls go through grafts
- [ ] New inputs validated via SAP
- [ ] New data structures defined in WATER
- [ ] UI contains no business logic
- [ ] Spec files updated (`.ramus.md` or `.graft.md`)
- [ ] Changes documented in relevant spec
- [ ] ARCHITECTURE.md updated if boundaries changed

---

## Architecture Rules (The Short Version)

1. **rami** = Domain modules (Server, Chat, Jobs, NLP, UI)
2. **Grafts** = Integration between rami
3. **WATER** = Shared data schemas
4. **SAP** = Input validation and sanitization
5. **LEAVES** = UI with no business logic

**Golden Rule:** If you need data from another ramus, go through a graft.

---

## Where to Ask "Does This Belong Here?"

Each `.ramus.md` file has:
- **Responsibilities** - What it DOES handle
- **Does NOT Handle** - What it explicitly DOES NOT handle

If unsure where feature belongs:
1. Read relevant `.ramus.md` files
2. If touches multiple rami → create/use graft
3. If new domain area → consider new ramus
4. If just validation → add to SAP
5. If just data structure → add to WATER

---

## Emergency: "I Think I Broke the Architecture"

Common violations and fixes:

**❌ Direct ramus import in another ramus**
```javascript
// In rami/chat/manager.js
const JobsManager = require('../jobs/manager'); // BAD!
```
✅ Fix: Use graft instead
```javascript
// Create/use grafts/chat-jobs.js
```

**❌ Business logic in UI**
```javascript
// In app.js
if (message.text.startsWith('🔴')) {
  message.isProblem = true; // BAD!
}
```
✅ Fix: Move to SAP validator
```javascript
// In sap/validators.js
function sanitizeMessage(msgData) {
  msgData.isProblem = msgData.text.startsWith('🔴 Seeking Solution:');
}
```

**❌ Validation in ramus instead of SAP**
```javascript
// In rami/chat/manager.js
if (text.length > 5000) throw new Error(); // BAD!
```
✅ Fix: Move to SAP
```javascript
// In sap/validators.js
function sanitizeText(text) {
  return text.slice(0, 5000);
}
```

**❌ Data structure hardcoded instead of WATER**
```javascript
const defaultSubcategory = "Seeking Solution"; // BAD!
```
✅ Fix: Use WATER schema
```javascript
const { defaults } = require('./water/schemas');
const defaultSubcategory = defaults.defaultSubcategory;
```
