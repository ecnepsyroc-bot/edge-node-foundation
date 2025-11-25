# Playbook Feature - Implementation Audit & Phased Approach

## Executive Summary
The Playbook feature will capture resolved question-answer pairs with verification and notes, creating a searchable knowledge base for the organization. This document outlines the technical requirements, database changes, UI modifications, and phased implementation strategy.

---

## Current System State

### Existing Components
- **Database**: PostgreSQL with tables for messages, jobs, users, subcategories, individual_chats
- **Message Types**: Regular messages, Questions (is_problem=TRUE), Answers (solution field)
- **User Roles**: All users can view, answer, and verify
- **UI Layout**: Top navigation with Jobs dropdown, main content area with FLOW/job tabs

### Current Question-Answer Workflow
1. User creates a question (is_problem=TRUE)
2. Question assigned to job/chat-pad
3. Another user provides answer via modal
4. Answer stored in `solution` field, `is_solved` set to TRUE
5. Display: Question (yellow box) + Answer (blue box)

### Gap Analysis
**Missing Components for Playbook:**
- ✗ Answer verification/confirmation mechanism
- ✗ Notes field for additional context
- ✗ Playbook entry creation workflow
- ✗ Playbook storage table
- ✗ Playbook UI/navigation
- ✗ Search and filter capabilities
- ✗ Playbook entry display format

---

## Feature Requirements

### Functional Requirements

#### 1. Answer Confirmation
- Any user can mark an answer as "confirmed/verified"
- Visual indicator showing verified status
- Timestamp and user who verified
- Only verified answers can be added to Playbook

#### 2. Notes Addition
- Modal/input for adding contextual notes
- Notes are optional but recommended
- Support multi-line text (up to 2000 characters)
- Notes author tracked

#### 3. Playbook Entry Creation
- Triggered after answer confirmation
- Automatically includes:
  - Question text
  - Answer text
  - Job information
  - Chat-pad information (if applicable)
  - Date/time
  - Users involved (questioner, answerer, verifier, notes author)
  - Notes (if provided)
- Entry immutable once created

#### 4. Playbook UI
- Top-level navigation button "Playbook" next to "Jobs"
- Dedicated Playbook view showing all entries
- Entries grouped by job (collapsible)
- Search functionality (full-text)
- Filter by job, date range, user
- Export capability (JSON/PDF)

### Non-Functional Requirements
- Response time: < 500ms for entry creation
- Search results: < 1s for full-text search
- Scalability: Support 10,000+ entries
- Data retention: Permanent (no auto-deletion)
- Audit trail: Track all modifications

---

## Database Schema Changes

### New Table: `playbook_entries`

```sql
CREATE TABLE playbook_entries (
    id SERIAL PRIMARY KEY,
    
    -- Core content
    question_text TEXT NOT NULL,
    answer_text TEXT NOT NULL,
    notes TEXT,
    
    -- Relationships
    original_message_id INTEGER REFERENCES messages(id) ON DELETE SET NULL,
    job_id INTEGER NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
    individual_chat_id INTEGER REFERENCES individual_chats(id) ON DELETE SET NULL,
    
    -- User tracking
    question_user_id INTEGER NOT NULL REFERENCES users(id),
    answer_user_id INTEGER NOT NULL REFERENCES users(id),
    verified_by_user_id INTEGER NOT NULL REFERENCES users(id),
    notes_user_id INTEGER REFERENCES users(id),
    
    -- Metadata
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    question_date TIMESTAMP NOT NULL,
    answer_date TIMESTAMP NOT NULL,
    verified_date TIMESTAMP NOT NULL,
    
    -- Search optimization
    search_vector TSVECTOR,
    
    -- Audit
    is_deleted BOOLEAN DEFAULT FALSE,
    deleted_at TIMESTAMP,
    deleted_by_user_id INTEGER REFERENCES users(id)
);

-- Indexes for performance
CREATE INDEX idx_playbook_job ON playbook_entries(job_id) WHERE is_deleted = FALSE;
CREATE INDEX idx_playbook_search ON playbook_entries USING GIN(search_vector);
CREATE INDEX idx_playbook_created ON playbook_entries(created_at DESC) WHERE is_deleted = FALSE;
CREATE INDEX idx_playbook_message ON playbook_entries(original_message_id);

-- Trigger to update search vector
CREATE TRIGGER playbook_search_update 
BEFORE INSERT OR UPDATE ON playbook_entries
FOR EACH ROW EXECUTE FUNCTION
  tsvector_update_trigger(search_vector, 'pg_catalog.english', 
    question_text, answer_text, notes);
```

### Modified Table: `messages`

```sql
-- Add verification fields
ALTER TABLE messages ADD COLUMN verified BOOLEAN DEFAULT FALSE;
ALTER TABLE messages ADD COLUMN verified_by_user_id INTEGER REFERENCES users(id);
ALTER TABLE messages ADD COLUMN verified_at TIMESTAMP;
ALTER TABLE messages ADD COLUMN in_playbook BOOLEAN DEFAULT FALSE;
ALTER TABLE messages ADD COLUMN playbook_entry_id INTEGER REFERENCES playbook_entries(id);

-- Index for verified questions
CREATE INDEX idx_messages_verified ON messages(verified) 
  WHERE is_problem = TRUE AND is_solved = TRUE;
```

---

## UI/UX Design

### 1. Playbook Button (Top Navigation)
```
Location: Next to "Jobs" button in top-right
Style: Green outline button matching "Jobs"
Text: "Playbook"
Behavior: Opens Playbook modal/view
```

### 2. Answer Verification UI
```
Location: On answered questions (after blue answer box)
Components:
  - "✓ Verify Answer" button (green)
  - Shows "Verified by {user} on {date}" when verified
  - "Add to Playbook" button appears after verification
```

### 3. Playbook Entry Modal
```
Triggered: After clicking "Add to Playbook"
Fields:
  - Question (read-only, pre-filled)
  - Answer (read-only, pre-filled)
  - Notes (textarea, optional)
Buttons:
  - "Save to Playbook" (primary)
  - "Cancel"
```

### 4. Playbook View
```
Layout:
  Header:
    - Title: "Playbook"
    - Search bar (full-text)
    - Filter dropdowns (Job, Date Range)
    - Export button
  
  Content:
    - Grouped by Job (collapsible sections)
    - Each entry shows:
      * Date badge
      * Question text (yellow highlight)
      * Answer text (blue highlight)
      * Notes (if present)
      * Metadata footer (users, chat-pad, timestamps)
    - Pagination (20 per page)
```

---

## Technical Architecture

### Backend Components

#### 1. New Manager: `rami/playbook/manager.js`
```javascript
class PlaybookManager {
  constructor(pool) { this.pool = pool; }
  
  async createEntry(data) { }
  async getEntries(filters) { }
  async searchEntries(query) { }
  async getEntryById(id) { }
  async softDeleteEntry(id, userId) { }
  async exportEntries(format, filters) { }
}
```

#### 2. New Graft: `grafts/playbook-graft.js`
- API endpoints for Playbook operations
- Handles HTTP requests
- Integrates with PlaybookManager

#### 3. API Endpoints
```
GET    /api/playbook              - List entries (with filters)
POST   /api/playbook              - Create entry
GET    /api/playbook/:id          - Get single entry
DELETE /api/playbook/:id          - Soft delete entry
GET    /api/playbook/search       - Full-text search
GET    /api/playbook/export       - Export entries
POST   /api/messages/:id/verify   - Verify answer
```

### Frontend Components

#### 1. Playbook UI Module: `leaves/ui/playbook.js`
```javascript
// Functions:
- openPlaybookView()
- loadPlaybookEntries(filters)
- displayPlaybookEntry(entry)
- searchPlaybook(query)
- exportPlaybook(format)
- openAddToPlaybookModal(messageId)
- submitPlaybookEntry(data)
```

#### 2. Verification UI: Updates to `leaves/ui/app.js`
```javascript
// Add to message display:
- showVerifyButton(messageId)
- handleVerification(messageId)
- showAddToPlaybookButton(messageId)
```

#### 3. Playbook Styles: `leaves/ui/playbook.css`
```css
/* Playbook-specific styles */
.playbook-modal { }
.playbook-entry { }
.playbook-search { }
.verify-badge { }
```

---

## Phased Implementation Plan

### **Phase 1: Foundation & Database** (Week 1)
**Goal**: Set up database schema and basic backend structure

**Tasks**:
1. Create `playbook_entries` table with indexes
2. Add verification columns to `messages` table
3. Create `rami/playbook/manager.js` with basic CRUD operations
4. Write database migration script (`migration/playbook-setup.sql`)
5. Test database operations with sample data

**Deliverables**:
- ✓ Database schema created
- ✓ Migration script tested
- ✓ PlaybookManager class functional
- ✓ Unit tests for database operations

**Validation**:
- Can create playbook entry programmatically
- Can query entries by job
- Full-text search returns results
- Indexes improve query performance

---

### **Phase 2: Backend API** (Week 2)
**Goal**: Implement REST API for Playbook operations

**Tasks**:
1. Create `grafts/playbook-graft.js`
2. Implement API endpoints:
   - POST /api/playbook (create entry)
   - GET /api/playbook (list with filters)
   - GET /api/playbook/search (full-text search)
3. Add verification endpoint:
   - POST /api/messages/:id/verify
4. Integrate PlaybookGraft into server.js
5. Test all endpoints with Postman/curl

**Deliverables**:
- ✓ All API endpoints functional
- ✓ Input validation and error handling
- ✓ API documentation
- ✓ Integration tests

**Validation**:
- API returns correct data structures
- Filters work correctly (job, date)
- Search finds relevant entries
- Error responses are meaningful

---

### **Phase 3: Verification UI** (Week 3)
**Goal**: Add answer verification workflow to existing UI

**Tasks**:
1. Add "Verify Answer" button to solved questions
2. Implement verification handler in `app.js`
3. Update message display to show verification status
4. Add "Add to Playbook" button (appears after verification)
5. Create "Add to Playbook" modal with notes field
6. Implement submission logic
7. Add real-time updates via WebSocket

**Deliverables**:
- ✓ Verification buttons appear on solved questions
- ✓ Verification status visible
- ✓ Playbook modal functional
- ✓ Notes can be added
- ✓ Entry creation from UI works

**Validation**:
- Users can verify answers
- Verified badge appears immediately
- Playbook modal pre-fills question/answer
- Notes are optional
- Entry saved successfully

---

### **Phase 4: Playbook View UI** (Week 4)
**Goal**: Create dedicated Playbook interface

**Tasks**:
1. Add "Playbook" button to top navigation
2. Create `leaves/ui/playbook.js` module
3. Design Playbook modal/view layout
4. Implement entry display (grouped by job)
5. Add search bar with real-time filtering
6. Implement filter dropdowns (job, date)
7. Add pagination
8. Style Playbook UI (`playbook.css`)

**Deliverables**:
- ✓ Playbook accessible from top nav
- ✓ Entries display correctly
- ✓ Search works in real-time
- ✓ Filters apply correctly
- ✓ Responsive design
- ✓ Consistent with existing UI

**Validation**:
- Playbook opens smoothly
- All entries visible
- Search returns relevant results
- Filters narrow results
- UI matches design specs

---

### **Phase 5: Export & Polish** (Week 5)
**Goal**: Add export functionality and refine UX

**Tasks**:
1. Implement export endpoint (JSON/CSV formats)
2. Add export button to Playbook UI
3. Create export download handler
4. Add entry metadata display (users, timestamps)
5. Implement soft delete for entries
6. Add confirmation dialogs
7. Performance optimization (lazy loading, caching)
8. Cross-browser testing
9. Accessibility improvements (ARIA labels, keyboard nav)

**Deliverables**:
- ✓ Export to JSON/CSV works
- ✓ Metadata displayed clearly
- ✓ Soft delete functional
- ✓ Fast load times (< 1s)
- ✓ Works in Chrome, Firefox, Edge
- ✓ Keyboard accessible

**Validation**:
- Exported files contain correct data
- Large datasets (1000+ entries) load quickly
- Delete requires confirmation
- UI is keyboard navigable
- Screen reader compatible

---

### **Phase 6: Testing & Documentation** (Week 6)
**Goal**: Comprehensive testing and documentation

**Tasks**:
1. End-to-end testing scenarios
2. Load testing (10,000+ entries)
3. Security audit (SQL injection, XSS)
4. User acceptance testing
5. Write user documentation
6. Create admin guide
7. Record demo video
8. Update system architecture docs

**Deliverables**:
- ✓ Test coverage > 80%
- ✓ Performance benchmarks met
- ✓ Security vulnerabilities addressed
- ✓ User guide complete
- ✓ Admin documentation ready
- ✓ Demo video recorded

**Validation**:
- All test scenarios pass
- System handles 10,000+ entries
- No security vulnerabilities
- Users can operate without training
- Admins can manage system

---

## Risk Assessment

### High Risk
1. **Performance degradation with large datasets**
   - Mitigation: Pagination, indexing, lazy loading
   - Monitoring: Query execution times

2. **Search quality issues**
   - Mitigation: PostgreSQL full-text search, proper indexing
   - Fallback: Basic text matching

3. **Data integrity (duplicate entries)**
   - Mitigation: Check for existing playbook entry before creation
   - Validation: Unique constraint on original_message_id

### Medium Risk
1. **User adoption (verification workflow)**
   - Mitigation: Clear UI prompts, tooltips
   - Training: User guide, demo

2. **Export file size**
   - Mitigation: Limit export to filtered results
   - Option: Paginated export

### Low Risk
1. **Browser compatibility**
   - Mitigation: Standard HTML5/CSS3
   - Testing: Multiple browsers

2. **Database storage growth**
   - Mitigation: Soft delete instead of hard delete
   - Monitoring: Database size alerts

---

## Success Metrics

### Quantitative
- 80%+ of resolved questions added to Playbook within 7 days
- Average search time < 1 second
- 95%+ uptime for Playbook feature
- 100+ entries created in first month

### Qualitative
- Users report improved knowledge sharing
- Reduced duplicate questions
- Faster onboarding for new users
- Positive user feedback (survey)

---

## Future Enhancements (Post-Launch)

### Phase 7+ (Optional)
1. **AI-Powered Suggestions**
   - Suggest similar Playbook entries when creating questions
   - Auto-categorization of entries

2. **Rich Text Support**
   - Markdown formatting in notes
   - Image attachments

3. **Version History**
   - Track edits to Playbook entries
   - Rollback capability

4. **Advanced Analytics**
   - Most referenced entries
   - Knowledge gap analysis
   - User contribution statistics

5. **Integration**
   - Export to external wikis (Confluence, Notion)
   - API for external access
   - Mobile app

---

## Resource Requirements

### Development Team
- 1 Backend Developer (PostgreSQL, Node.js)
- 1 Frontend Developer (JavaScript, CSS)
- 1 QA Engineer (testing, documentation)
- 0.5 UI/UX Designer (mockups, review)

### Infrastructure
- PostgreSQL database (existing)
- No additional servers required
- Estimated storage: 1MB per 100 entries

### Timeline
- 6 weeks for core implementation
- 2 weeks for testing and documentation
- **Total: 8 weeks**

### Budget Estimate
- Development: ~240 hours
- Testing: ~60 hours
- Documentation: ~20 hours
- **Total: ~320 hours**

---

## Conclusion

The Playbook feature will transform the question-answer system into a valuable knowledge base, reducing duplicate questions and accelerating problem-solving. The phased approach ensures:

1. **Minimal disruption** to existing functionality
2. **Incremental value delivery** (users see progress each phase)
3. **Risk mitigation** through testing and validation
4. **Maintainability** with clean architecture

**Recommendation**: Proceed with Phase 1 immediately. The foundational database work is low-risk and high-value, enabling future phases to progress rapidly.

---

## Appendix A: File Structure

```
Edge Node system #1/
├── rami/
│   └── playbook/
│       ├── manager.js          [NEW - Playbook data operations]
│       └── schemas.js          [NEW - Data validation]
├── grafts/
│   └── playbook-graft.js       [NEW - API endpoints]
├── leaves/
│   └── ui/
│       ├── playbook.js         [NEW - Playbook UI logic]
│       ├── playbook.css        [NEW - Playbook styles]
│       ├── app.js              [MODIFIED - Add verification UI]
│       ├── style.css           [MODIFIED - Add verify button styles]
│       └── index.html          [MODIFIED - Add Playbook button]
├── migration/
│   └── playbook-setup.sql      [NEW - Database migration]
├── server.js                   [MODIFIED - Register PlaybookGraft]
└── PLAYBOOK-FEATURE-AUDIT.md   [THIS DOCUMENT]
```

---

## Appendix B: Sample Data Flow

```
1. User answers question → Answer saved (is_solved=TRUE)
2. Another user clicks "Verify Answer" 
   → POST /api/messages/:id/verify
   → messages.verified=TRUE, verified_by_user_id set
3. "Add to Playbook" button appears
4. User clicks → Modal opens with question/answer pre-filled
5. User adds optional notes → Clicks "Save to Playbook"
   → POST /api/playbook
   → playbook_entries row created
   → messages.in_playbook=TRUE
6. Entry appears in Playbook view
7. Users can search/filter to find entry later
```

---

**Document Version**: 1.0  
**Last Updated**: November 23, 2025  
**Author**: System Architect  
**Status**: Ready for Review
