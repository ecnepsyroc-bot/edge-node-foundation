# Luxify Tree Architecture Map

```
┌─────────────────────────────────────────────────────────────────┐
│                        CLIENT BROWSER                           │
│                    (rami/ui/public/)                        │
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  LEAVES (Presentation Layer)                            │  │
│  │  • index.html - Structure                                │  │
│  │  • app.js - WebSocket client, API calls, DOM            │  │
│  │  • style.css - Dark terminal styling                     │  │
│  │                                                          │  │
│  │  Does NOT: Business logic, validation, storage          │  │
│  └──────────────────────────────────────────────────────────┘  │
│                           │                                     │
│                           │ HTTP/WebSocket                      │
│                           ▼                                     │
└─────────────────────────────────────────────────────────────────┘

                             │
                             │
                             ▼

┌─────────────────────────────────────────────────────────────────┐
│                     SERVER (Node.js)                            │
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │                    ORCHESTRATOR                          │  │
│  │                     server.js                             │  │
│  │  • Assembles RAMI via grafts                         │  │
│  │  • Routes HTTP requests                                   │  │
│  │  • Initializes all components                             │  │
│  └──────────────────────────────────────────────────────────┘  │
│                           │                                     │
│                           ▼                                     │
│  ┌─────────────────────────────────────────────────┬─────────┐ │
│  │              GRAFTS (Integration Layer)          │         │ │
│  ├──────────────────────────────────────────────────┤         │ │
│  │                                                  │         │ │
│  │  ┌────────────────────────────────────────────┐ │         │ │
│  │  │  server-chat (Server ↔ Chat)              │ │         │ │
│  │  │  • HTTP endpoints: login, messages        │ │         │ │
│  │  │  • WebSocket: auth, message events        │ │         │ │
│  │  │  • Message normalization                   │ │         │ │
│  │  └────────────────────────────────────────────┘ │         │ │
│  │                                                  │         │ │
│  │  ┌────────────────────────────────────────────┐ │         │ │
│  │  │  chat-jobs (Chat ↔ Jobs)                  │ │         │ │
│  │  │  • Validate jobs before operations        │ │         │ │
│  │  │  • Anti-corruption layer                   │ │         │ │
│  │  └────────────────────────────────────────────┘ │         │ │
│  │                                                  │         │ │
│  │  ┌────────────────────────────────────────────┐ │         │ │
│  │  │  ui-nlp (UI ↔ NLP)                        │ │         │ │
│  │  │  • /api/nlp/process endpoint              │ │         │ │
│  │  │  • Ready (not yet active in UI)           │ │         │ │
│  │  └────────────────────────────────────────────┘ │         │ │
│  │                                                  │         │ │
│  └──────────────────────────────────────────────────┴─────────┘ │
│                           │                                     │
│                           ▼                                     │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │               RAMI (Domain Modules)                 │   │
│  ├─────────────────────────────────────────────────────────┤   │
│  │                                                         │   │
│  │  ┌───────────────────┐  ┌──────────────────┐          │   │
│  │  │  ServerManager   │  │  ChatManager     │          │   │
│  │  │  (server/)       │  │  (chat/)         │          │   │
│  │  │                  │  │                  │          │   │
│  │  │  • HTTP server   │  │  • Message CRUD  │          │   │
│  │  │  • WebSocket     │  │  • Subcategories │          │   │
│  │  │  • Broadcasting  │  │  • Chats         │          │   │
│  │  │  • Static files  │  │  • Database      │          │   │
│  │  └───────────────────┘  └──────────────────┘          │   │
│  │                                                         │   │
│  │  ┌───────────────────┐  ┌──────────────────┐          │   │
│  │  │  JobsManager     │  │  NLPProcessor    │          │   │
│  │  │  (jobs/)         │  │  (nlp/)          │          │   │
│  │  │                  │  │                  │          │   │
│  │  │  • 34 jobs list  │  │  • POS tagging   │          │   │
│  │  │  • Validation    │  │  • Color-coding  │          │   │
│  │  │  • Job exists    │  │  • compromise.js │          │   │
│  │  └───────────────────┘  └──────────────────┘          │   │
│  │                                                         │   │
│  └─────────────────────────────────────────────────────────┘   │
│                           │                                     │
│                           ▼                                     │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │        WATER (Data Schemas) & SAP (Validation)          │   │
│  ├─────────────────────────────────────────────────────────┤   │
│  │                                                         │   │
│  │  ┌──────────────────────────────────────────────────┐  │   │
│  │  │  water/schemas.js                                │  │   │
│  │  │  • Message, User, JobSubcategory schemas        │  │   │
│  │  │  • 34 predefined jobs                            │  │   │
│  │  │  • Default subcategory                           │  │   │
│  │  │  • Field aliases (user/username, job/job_id)     │  │   │
│  │  └──────────────────────────────────────────────────┘  │   │
│  │                                                         │   │
│  │  ┌──────────────────────────────────────────────────┐  │   │
│  │  │  sap/validators.js                               │  │   │
│  │  │  • Text sanitization (5000 char limit)           │  │   │
│  │  │  • Message validation                             │  │   │
│  │  │  • Field normalization                            │  │   │
│  │  │  • isProblem auto-detection                       │  │   │
│  │  └──────────────────────────────────────────────────┘  │   │
│  │                                                         │   │
│  └─────────────────────────────────────────────────────────┘   │
│                           │                                     │
│                           ▼                                     │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                  PERSISTENCE                            │   │
│  │                chat-data.json                           │   │
│  │  • users: []                                            │   │
│  │  • messages: []                                         │   │
│  │  • jobSubcategories: []                                 │   │
│  │  • individualChats: []                                  │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘


DEPENDENCIES (external packages):
├─ ws (WebSocket server)
└─ compromise (NLP library)


DATA FLOW EXAMPLES:

1. User sends message:
   Client → ServerManager → server-chat graft → ChatManager (via SAP) → Database
   → Broadcast to all clients via ServerManager

2. Create Factory Order:
   Client → ServerManager → server-chat graft → chat-jobs graft → JobsManager (validate)
   → ChatManager (via SAP) → Database → Broadcast

3. Delete individual chat:
   Client → ServerManager → server-chat graft → ChatManager → Database → Broadcast

4. NLP processing (when integrated):
   Client → ServerManager → ui-nlp graft → NLPProcessor → Return HTML


SPECIFICATION FILES:
├─ ARCHITECTURE.md (philosophy & implementation)
├─ AUDIT.md (compliance report)
├─ rami/server/.ramus.md
├─ rami/chat/.ramus.md
├─ rami/jobs/.ramus.md
├─ rami/nlp/.ramus.md
├─ rami/ui/.ramus.md
├─ grafts/server-chat/.graft.md
├─ grafts/chat-jobs/.graft.md
├─ grafts/ui-nlp/.graft.md
├─ water/.water.md
└─ sap/.sap.md
```

## Key Principles

1. **No branch-to-branch calls** - All integration via grafts
2. **WATER for schemas** - Shared data structures
3. **SAP for validation** - Boundary guardrails
4. **LEAVES contain no logic** - Pure presentation
5. **Each component documented** - Spec files for all
