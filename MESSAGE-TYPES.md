# Message Types Legend

## Overview
The system has different types of messages that behave differently. Understanding these types helps clarify how the system handles clearing, deleting, and displaying messages.

---

## Message Types

### 1. **Regular Messages** (Chat Messages)
- **Created by:** Typing in the bottom text input and pressing Enter or clicking Send
- **Appearance:** Standard message bubbles (green for sent, dark gray for received)
- **Persistence:** Cleared when "Clear" button is clicked
- **Database flag:** `isProblem: false` (or undefined)
- **Example:** "test", "hello", "what time is it?"

### 2. **Question Messages** (Problems/Issues)
- **Created by:** Clicking "+ Question" button and entering question text
- **Appearance:** Message bubble with 🔴 icon and red left border (4px solid #c62828)
- **Prefix:** `🔴 Question: {your question text}`
- **Persistence:** **PERMANENT** - NOT cleared by "Clear" button
- **Database flag:** `isProblem: true`
- **Selection:** Click to select (yellow highlight), enables "Answer" button
- **Example:** "🔴 Question: How do we fix the broken widget?"
- **Status States:**
  - Unsolved: Red border, clickable for selection
  - Solved: Shows green checkmark ✅ with answer details

### 3. **Answer Messages** (Solutions)
- **Created by:** Selecting a Question and clicking "Answer" button
- **Appearance:** Connected to the original Question message
- **Persistence:** Stored as metadata on the Question (not separate message)
- **Database fields:** `isSolved: true`, `solution: "text"`, `solvedBy: "username"`, `solvedAt: "timestamp"`
- **Display:** Shows below question with ✅ icon and solver's name

### 4. **System Messages**
- **Created by:** System events (chat cleared, user joined, etc.)
- **Appearance:** Centered gray text, not in bubble
- **Persistence:** Temporary display only
- **Example:** "Cleared 5 message(s)"

---

## User Actions and Effects

| Action | Affects Regular Messages | Affects Questions | Affects Answers |
|--------|--------------------------|-------------------|-----------------|
| **Type & Send** (bottom input) | ✅ Creates new message | ❌ | ❌ |
| **+ Question** button | ❌ | ✅ Creates new question | ❌ |
| **Click Question** | ❌ | ✅ Selects for answering | ❌ |
| **Answer** button | ❌ | ❌ Updates question | ✅ Adds solution |
| **Clear** button | ✅ Deletes all | ❌ Preserved | ❌ Preserved (part of question) |
| **Delete Chat** | ✅ Deletes all | ✅ Deletes all | ✅ Deletes all |

---

## Visual Indicators

### Regular Message Bubble
```
┌──────────────────────┐
│ test                 │
│            07:19     │
└──────────────────────┘
```

### Question Message Bubble (Unsolved)
```
┃ ┌──────────────────────┐
┃ │ 🔴 Question: How to  │
┃ │ fix this?            │
┃ │            07:20     │
┃ └──────────────────────┘
┃ (red border)
```

### Question Message Bubble (Solved)
```
┃ ┌──────────────────────┐
┃ │ 🔴 Question: How to  │
┃ │ fix this?            │
┃ │            07:20     │
┃ │                      │
┃ │ ✅ Answer by cory:   │
┃ │ Use the repair tool  │
┃ └──────────────────────┘
┃ (red border)
```

### Selected Question (for answering)
```
╔══════════════════════════╗  ← Yellow border
║ ┌──────────────────────┐ ║
║ │ 🔴 Question: How to  │ ║
║ │ fix this?            │ ║
║ │            07:20     │ ║
║ └──────────────────────┘ ║
╚══════════════════════════╝
    (yellow background + border)
```

---

## Context Hierarchy

Messages exist within this hierarchy:

1. **Job** (e.g., "3410 Marpole Avenue", "General")
   - 2. **Subcategory** (e.g., "Questions", "Factory Order")
     - 3. **Individual Chat** (optional, e.g., "123456", "Order #789")
       - 4. **Messages** (Regular or Question type)

### Filtering Behavior

- **"Questions All"**: Shows ALL questions across all individual chats within current job
- **"Questions" + Individual Chat (e.g., "123456")**: Shows questions ONLY for that specific chat
- **"Factory Order"**: Shows all messages (regular and questions) in Factory Order subcategory
- **"General"**: Shows all messages in General context

---

## Database Structure

### Regular Message
```json
{
  "id": "1731916740123",
  "user": "cory",
  "text": "test",
  "job": "3410 Marpole Avenue",
  "subcategory": "Questions",
  "individualChat": "3410 Marpole Avenue_123456",
  "timestamp": "2025-11-18T07:19:00.123Z",
  "isProblem": false
}
```

### Question Message (Unsolved)
```json
{
  "id": "1731916760456",
  "user": "cory",
  "text": "🔴 Question: How do we fix the widget?",
  "job": "3410 Marpole Avenue",
  "subcategory": "Questions",
  "individualChat": "3410 Marpole Avenue_123456",
  "timestamp": "2025-11-18T07:20:00.456Z",
  "isProblem": true,
  "isSolved": false
}
```

### Question Message (Solved)
```json
{
  "id": "1731916760456",
  "user": "cory",
  "text": "🔴 Question: How do we fix the widget?",
  "job": "3410 Marpole Avenue",
  "subcategory": "Questions",
  "individualChat": "3410 Marpole Avenue_123456",
  "timestamp": "2025-11-18T07:20:00.456Z",
  "isProblem": true,
  "isSolved": true,
  "solution": "Use the repair tool from the toolbox",
  "solvedBy": "cory",
  "solvedAt": "2025-11-18T07:25:00.789Z"
}
```

---

## Key Technical Details

### isProblem Flag
- **Purpose:** Distinguishes Questions from regular messages
- **Effect:** Questions are preserved during "Clear" operations
- **Set by:** `createNewProblem()` function when user clicks "+ Question"

### Message Clearing Logic
From `rami/chat/manager.js`:
```javascript
const isProblem = msg.isProblem === true;
const shouldDelete = sameJob && sameSubcategory && sameChat && !isProblem;
```
Only deletes messages where `isProblem` is NOT true.

### Visual Highlighting
- **Red border:** Applied to all question bubbles (`isProblem === true`)
- **Yellow selection:** Applied when question is clicked for answering
- **Answer button:** Enabled only when question is selected

---

## Common Scenarios

### Scenario 1: Creating a Question
1. User clicks "+ Question"
2. Modal opens with textarea
3. User types question text
4. User clicks "Ask Question"
5. Message sent with `isProblem: true`
6. Displays with red border and 🔴 icon
7. Appears in "Questions All" view

### Scenario 2: Answering a Question
1. User clicks on an unsolved question (yellow highlight appears)
2. "Answer" button becomes enabled
3. User clicks "Answer"
4. Modal opens with solution textarea
5. User types answer and clicks "Submit Answer"
6. Question updated with solution, solvedBy, solvedAt
7. Green checkmark ✅ appears with answer text

### Scenario 3: Clearing Chat
1. User clicks "Clear" button
2. Confirmation shows: "This will permanently delete all messages except 'Question' entries"
3. User confirms
4. Regular messages deleted
5. Questions remain (because `isProblem: true`)
6. System message shows count deleted

---

## Troubleshooting

### Question disappeared after clicking Clear
- **Cause:** Message wasn't flagged with `isProblem: true`
- **Fix:** Ensure `createNewProblem()` includes `isProblem: true` in messageData

### Red border not showing on questions
- **Cause:** CSS conflict or inline style not applied
- **Check:** Line 962-963 in app.js applies border with `!important`

### Answer button stays disabled
- **Cause:** Question not selected or `selectedQuestionId` not set
- **Check:** Click handler on question sets `selectedQuestionId`

---

*Last updated: November 18, 2025*
