// DOM elements
const loginModal = document.getElementById('login-modal');
const chatApp = document.getElementById('chat-app');
const usernameInput = document.getElementById('username-input');
const loginBtn = document.getElementById('login-btn');
const messagesDiv = document.getElementById('messages');
const playbookView = document.getElementById('playbook-view');
const playbookList = document.getElementById('playbook-list');
const playbookCount = document.getElementById('playbook-count');
const messageInput = document.getElementById('message-input');
const sendBtn = document.getElementById('send-btn');
const usernameDisplay = document.getElementById('username-display');
const jobsBtn = document.getElementById('jobs-btn');
const playbookBtn = document.getElementById('playbook-btn');
const jobTabsDiv = document.getElementById('job-tabs');
const createJobModal = document.getElementById('create-job-modal');
const jobNameInput = document.getElementById('job-name-input');
const createJobBtn = document.getElementById('create-job-btn');
const cancelJobBtn = document.getElementById('cancel-job-btn');
const jobManagementModal = document.getElementById('job-management-modal');
const jobsTableBody = document.getElementById('jobs-table-body');
const closeJobManagementBtn = document.getElementById('close-job-management-btn');
const subcategoryBar = document.getElementById('subcategory-bar');
const subcategoryTabsDiv = document.getElementById('subcategory-tabs');
const jobNameDisplay = document.getElementById('job-name-display');
const subcategoryActionsDiv = document.getElementById('subcategory-actions');
const individualChatsBar = document.getElementById('individual-chats-bar');
const individualChatsDiv = document.getElementById('individual-chats');
const createChatModal = document.getElementById('create-chat-modal');
const chatNameInput = document.getElementById('chat-name-input');
const createChatBtn = document.getElementById('create-chat-btn');
const cancelChatBtn = document.getElementById('cancel-chat-btn');
const chatpadManagementModal = document.getElementById('chatpad-management-modal');
const chatpadManagementBody = document.getElementById('chatpad-management-body');
const closeChatpadManagementBtn = document.getElementById('close-chatpad-management-btn');

// Problem System DOM elements
const problemsBar = document.getElementById('problems-bar');
const problemsList = document.getElementById('problems-list');
const createProblemModal = document.getElementById('create-problem-modal');
const problemTextInput = document.getElementById('problem-text-input');
const createProblemBtn = document.getElementById('create-problem-btn');
const cancelProblemBtn = document.getElementById('cancel-problem-btn');
const addSolutionModal = document.getElementById('add-solution-modal');
const solutionProblemText = document.getElementById('solution-problem-text');
const solutionTextInput = document.getElementById('solution-text-input');
const addSolutionBtn = document.getElementById('add-solution-btn');
const cancelSolutionBtn = document.getElementById('cancel-solution-btn');
const reflexPopup = document.getElementById('reflex-popup');

// Solved System - elements queried when needed to avoid null references
// const solvedModal = document.getElementById('solved-modal');
// const solvedTextInput = document.getElementById('solved-text-input');
// const submitSolvedBtn = document.getElementById('submit-solved-btn');
// const cancelSolvedBtn = document.getElementById('cancel-solved-btn');
// const solvedModalTitle = document.getElementById('solved-modal-title');

let ws = null;
let currentSolvingMessageId = null;
let currentUser = null;
let isAuthenticated = false;
let jobs = [];
let jobsData = []; // Full job data with codes
let currentJobId = 'General';
let currentSubcategory = 'Questions'; // 'Questions' or 'Chat-pads'
const jobSubcategories = {}; // Track which jobs have Chat-pads subcategory
let currentIndividualChat = null; // Track current individual chat ID
const individualChats = {}; // Cache of individual chats per job
let currentProblems = []; // Cache of questions for current context
let currentProblemId = null; // Track question being answered
let selectedQuestionId = null; // Track selected question for Answer button

// Login functionality
loginBtn.addEventListener('click', login);
usernameInput.addEventListener('keypress', (e) => {
  if (e.key === 'Enter') login();
});

async function login() {
  const username = usernameInput.value.trim();
  if (!username) return;

  try {
    const response = await fetch('/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username })
    });

    const data = await response.json();
    if (data.success) {
      currentUser = data.user;
      localStorage.setItem('username', username);
      connectWebSocket();
    }
  } catch (err) {
    console.error('Login error:', err);
    addSystemMessage('Login failed');
  }
}

// WebSocket connection
function connectWebSocket() {
  // Use the same hostname and port as the page was loaded from
  const wsPort = window.location.port || '3000';
  const wsHost = window.location.hostname;
  ws = new WebSocket(`ws://${wsHost}:${wsPort}`);

  ws.onopen = () => {
    console.log('Connected to server');
    ws.send(JSON.stringify({ type: 'auth', username: currentUser.username }));
  };

  ws.onmessage = (event) => {
    const data = JSON.parse(event.data);
    console.log('Received from server:', data);

    if (data.type === 'auth_success') {
      isAuthenticated = true;
      loginModal.style.display = 'none';
      chatApp.style.display = 'flex';
      usernameDisplay.textContent = currentUser.username;
      loadJobs();
      addSystemMessage('Connected to Feature Millwork Chat');
    } else if (data.type === 'message') {
      console.log('Displaying message:', data.text, 'from', data.username);
      // Only display if message is for current job
      if (data.job_id === currentJobId) {
        const messageSubcat = data.subcategory || 'Questions';
        const messageChatId = data.individual_chat_id || null;
        const isQuestion = data.isProblem === true;
        const isSolved = data.isSolved === true;

        // Questions filtering:
        // - In "Questions" tab: show ALL Questions for this job
        // - In Chat-pads with specific chat selected: show ALL Questions in that chat (solved and unsolved)
        // - In Chat-pads with NO chat selected: don't show any questions or messages

        const inQuestionsTab = currentSubcategory === 'Questions';
        const inChatPadsWithNoChat = currentSubcategory === 'Chat-pads' && currentIndividualChat === null;
        const subcategoryMatch = inQuestionsTab || messageSubcat === currentSubcategory;

        // For regular messages in Chat-pads: require specific chat selection
        let chatMatch;
        if (currentSubcategory === 'Chat-pads') {
          chatMatch = currentIndividualChat !== null && messageChatId === currentIndividualChat;
        } else {
          chatMatch = currentIndividualChat === null || messageChatId === currentIndividualChat;
        }

        // Show Question if:
        // 1. We're in Questions tab (show all Questions for this job), OR
        // 2. We're in a specific individual chat AND question matches that chat (show all, solved or unsolved)
        const showQuestion = isQuestion && !inChatPadsWithNoChat && (
          inQuestionsTab ||
          (currentIndividualChat !== null && messageChatId === currentIndividualChat)
        );

        if (showQuestion || (!isQuestion && subcategoryMatch && chatMatch)) {
          const isSent = data.username === currentUser.username;
          // Look up chat name from cache
          let chatName = '';
          if (messageChatId && individualChats[currentJobId]) {
            const chat = individualChats[currentJobId].find(c => c.id === messageChatId);
            chatName = chat ? chat.name : '';
          }
          displayMessage(data.text, data.timestamp, isSent ? 'sent' : 'received', data.username, messageSubcat, data.id, isQuestion, isSolved, data.solution || '', data.solvedBy || '', chatName, data.job_id || currentJobId);
        }
      }
    } else if (data.type === 'subcategory_created') {
      // Refresh subcategories when someone creates Factory Order
      if (data.job_id === currentJobId) {
        loadSubcategories(currentJobId);
      }
    } else if (data.type === 'individual_chat_created') {
      // Refresh individual chats when someone creates a new one
      if (data.job_id === currentJobId && currentSubcategory === 'Chat-pads') {
        loadIndividualChats(currentJobId).then(() => {
          // If this client created the chat, switch to it
          if (data.username === currentUser.username && data.chatId) {
            switchIndividualChat(data.chatId);
          }
        });
      }
    } else if (data.type === 'individual_chat_deleted') {
      // Refresh individual chats when someone deletes one
      if (data.jobId === currentJobId && currentSubcategory === 'Chat-pads') {
        // If currently viewing deleted chat, switch to "All"
        if (currentIndividualChat === data.chatId) {
          switchIndividualChat(null);
        } else {
          loadIndividualChats(currentJobId);
        }
      }
    } else if (data.type === 'factory_order_deleted') {
      // Chat-pad was deleted - switch to Questions
      if (data.jobId === currentJobId) {
        jobSubcategories[currentJobId] = false;
        individualChats[currentJobId] = [];
        switchSubcategory('Questions');
        loadSubcategories(currentJobId);
      }
    } else if (data.type === 'job_renamed') {
      // Job was renamed - update current job if needed and reload
      if (currentJobId === data.oldName) {
        currentJobId = data.newName;
      }
      loadJobs();
    } else if (data.type === 'job_archived') {
      // Job was archived/unarchived - reload jobs
      loadJobs();
    } else if (data.type === 'job_deleted') {
      // Job was deleted - reload jobs and switch if necessary
      if (currentJobId === data.jobName) {
        currentJobId = 'General';
        switchJob('General');
      }
      loadJobs();
    } else if (data.type === 'problem_created') {
      // New problem created - reload problems if in same context
      console.log('WebSocket: problem_created received', data);
      console.log('Current job:', currentJobId, 'Message job:', data.context.job_id);
      if (data.context.job_id === currentJobId) {
        console.log('Job matches! Calling loadProblems()');
        loadProblems();
      } else {
        console.log('Job does not match, skipping loadProblems()');
      }
    } else if (data.type === 'problem_solved') {
      // Problem solved - reload chat to show updated solution
      loadChatHistory();
    } else if (data.type === 'problem_deleted') {
      // Problem deleted - reload if in same context
      if (data.context.job_id === currentJobId) {
        loadProblems();
      }
    } else if (data.type === 'message_deleted') {
      // Single message deleted - remove from UI
      const messageElements = messagesDiv.querySelectorAll('.message');
      messageElements.forEach(el => {
        if (el.dataset.messageId === data.message_id) {
          el.remove();
        }
      });
      // Reload chat history to refresh
      loadChatHistory();
    } else if (data.type === 'chat_cleared') {
      // Chat-pad was cleared - no action needed (handleClearChat already reloads)
    } else if (data.type === 'playbook_entry_added') {
      // Playbook entry added - reload chat to show "In Playbook" badge
      loadChatHistory();
    }
  };

  ws.onerror = (error) => {
    console.error('WebSocket error:', error);
    addSystemMessage('Connection error');
  };

  ws.onclose = () => {
    console.log('Disconnected from server');
    addSystemMessage('Disconnected');
    isAuthenticated = false;
  };
}

// Load jobs and create tabs
async function loadJobs() {
  try {
    console.log('Loading jobs...');
    const response = await fetch('/api/jobs');
    console.log('Jobs API response:', response.status);
    const data = await response.json();
    console.log('Jobs data:', data);

    // Store full job data (with codes)
    jobsData = data.jobs.map(j => ({
      name: j.name,
      code: j.code || '',
      archived: j.archived || false,
      subcategories: j.subcategories || []
    }));

    // Extract job names from the response (exclude archived jobs from tabs)
    jobs = data.jobs.filter(j => !j.archived).map(j => j.name);

    // Store subcategories info
    data.jobs.forEach(j => {
      if (j.subcategories && j.subcategories.length > 0) {
        jobSubcategories[j.name] = j.subcategories;
      }
    });

    // Create job tabs
    jobTabsDiv.innerHTML = '';

    // Add job tabs
    jobs.forEach(job => {
      const jobData = jobsData.find(j => j.name === job);
      const tab = document.createElement('button');
      tab.className = 'job-tab';

      // Special handling for General job - display as FLOW
      if (job === 'General') {
        tab.textContent = 'FLOW';
        tab.title = 'All conversations - Questions from all jobs';
      }
      // Show only code if available, otherwise show job name
      else if (jobData && jobData.code) {
        tab.textContent = jobData.code;
        tab.title = job; // Show full job name on hover
      } else {
        tab.textContent = job;
      }

      tab.dataset.jobId = job;

      if (job === currentJobId) {
        tab.classList.add('active');
      }

      tab.addEventListener('click', () => switchJob(job));
      jobTabsDiv.appendChild(tab);
    });

    // Set first job as active if none selected
    if (!currentJobId && jobs.length > 0) {
      currentJobId = jobs[0];
      document.querySelector('.job-tab')?.classList.add('active');
    }

    // Load subcategories and individual chats for default job, then load messages
    if (currentJobId) {
      loadSubcategories(currentJobId);

      // Load individual chats first, then messages
      if (currentJobId === 'General') {
        await loadAllIndividualChats();
      } else {
        await loadIndividualChats(currentJobId);
      }

      loadChatHistory();

      // Update placeholder
      updateMessageInputPlaceholder();
    }
  } catch (err) {
    console.error('Failed to load jobs:', err);
    addSystemMessage('Failed to load job list');
  }
}

// Switch to a different job
async function switchJob(jobId) {
  currentJobId = jobId;
  currentSubcategory = 'Questions';
  currentIndividualChat = null;

  // Hide Playbook view, show Chat view
  playbookView.style.display = 'none';
  messagesDiv.style.display = 'block';
  jobTabsDiv.style.display = 'flex';
  subcategoryBar.style.display = 'block';
  document.getElementById('input-container').style.display = 'flex';

  // Update active tab
  document.querySelectorAll('.job-tab').forEach(tab => {
    if (tab.dataset.jobId === jobId) {
      tab.classList.add('active');
    } else {
      tab.classList.remove('active');
    }
  });

  // Update job name display (show 'All conversations' for General/FLOW)
  jobNameDisplay.textContent = jobId === 'General' ? 'All conversations' : jobId;

  // Load subcategories for this job
  loadSubcategories(jobId);

  // Load individual chats first (before loading messages)
  if (jobId === 'General') {
    // For FLOW tab, load individual chats for ALL jobs
    await loadAllIndividualChats();
  } else {
    // For specific job, load only that job's chats
    await loadIndividualChats(jobId);
  }

  // Hide individual chats bar
  individualChatsBar.style.display = 'none';

  // Clear and reload messages (after chats are loaded)
  messagesDiv.innerHTML = '';
  loadChatHistory();

  // Update placeholder
  updateMessageInputPlaceholder();
}

// Load chat history
async function loadChatHistory() {
  try {
    // For General/FLOW, fetch all messages; otherwise fetch for specific job
    const apiUrl = currentJobId === 'General'
      ? '/api/messages'
      : `/api/messages?job_id=${encodeURIComponent(currentJobId)}`;
    console.log('Fetching messages from:', apiUrl);
    const response = await fetch(apiUrl);
    console.log('Response status:', response.status);

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    console.log('Received data:', data);
    console.log('Loading chat history:', data.messages.length, 'messages');
    console.log('Current context - JobID:', currentJobId, 'Subcategory:', currentSubcategory);
    console.log('Questions in response:', data.messages.filter(m => m.isProblem).length);

    let displayedCount = 0;
    data.messages.forEach(msg => {
      const messageSubcat = msg.subcategory || 'Questions';
      const messageChatId = msg.individual_chat_id || null;

      // Check if this is a "Question" message using the isProblem flag
      const isProblemMessage = msg.isProblem === true;
      const isSolvedMessage = msg.isSolved === true;

      // Questions filtering:
      // - In "Questions" tab: show ALL Questions for this job (solved and unsolved)
      // - In Chat-pads with specific chat selected: show ALL Questions in that chat (solved and unsolved)
      // - In Chat-pads with NO chat selected: don't show any questions
      const inQuestionsTab = currentSubcategory === 'Questions';
      const inChatPadsWithNoChat = currentSubcategory === 'Chat-pads' && currentIndividualChat === null;

      // Show Question if it's a Question message AND:
      // 1. We're in Questions tab (show all), OR
      // 2. We're in a specific chat AND question matches that chat (show all, solved or unsolved)
      const showQuestion = isProblemMessage && !inChatPadsWithNoChat && (
        inQuestionsTab ||
        (currentIndividualChat !== null && messageChatId === currentIndividualChat)
      );

      if (showQuestion) {
        const isSent = msg.username === currentUser.username;
        // Get chat name for Chat-pads messages
        let chatName = '';
        if (messageSubcat === 'Chat-pads' && msg.individual_chat_id) {
          // For FLOW tab, look up chat in the message's job_id, not currentJobId
          const lookupJobId = currentJobId === 'General' ? msg.job_id : currentJobId;
          const chat = individualChats[lookupJobId]?.find(c => c.id === msg.individual_chat_id);
          chatName = chat?.name || '';
        }
        displayMessage(
          msg.text,
          msg.timestamp,
          isSent ? 'sent' : 'received',
          msg.username,
          messageSubcat,
          msg.id,
          true, // isProblem
          isSolvedMessage,
          msg.solution || '',
          msg.solvedBy || '',
          chatName,
          msg.job_id || currentJobId,
          msg.in_playbook || false
        );
        displayedCount++;
      }
      // Regular messages (not Questions): normal subcategory/chat filtering
      else if (!isProblemMessage) {
        const subcategoryMatch = messageSubcat === currentSubcategory;

        // For Chat-pads: require a specific individual chat to be selected
        // For Questions: show when no individual chat is selected
        let chatMatch;
        if (currentSubcategory === 'Chat-pads') {
          // Chat-pads requires specific chat selection - don't show messages when currentIndividualChat is null
          chatMatch = currentIndividualChat !== null && messageChatId === currentIndividualChat;
        } else {
          // Questions tab: show when no specific chat is selected OR when chat matches
          chatMatch = currentIndividualChat === null || messageChatId === currentIndividualChat;
        }

        if (subcategoryMatch && chatMatch) {
          const isSent = msg.username === currentUser.username;
          // Get chat name for Chat-pads messages
          let chatName = '';
          if (messageSubcat === 'Chat-pads' && msg.individual_chat_id) {
            const chat = individualChats[currentJobId]?.find(c => c.id === msg.individual_chat_id);
            chatName = chat?.name || '';
          }
          displayMessage(msg.text, msg.timestamp, isSent ? 'sent' : 'received', msg.username, messageSubcat, msg.id, false, false, '', '', chatName, msg.job_id || currentJobId, false);
          displayedCount++;
        }
      }
    });

    if (displayedCount === 0) {
      if (currentSubcategory === 'Chat-pads' && currentIndividualChat === null) {
        addSystemMessage('Select or create a chat to view messages');
      } else {
        addSystemMessage(`No messages in ${currentJobId} - ${currentSubcategory}`);
      }
    }

    console.log('Chat history loaded. Messages in DOM:', messagesDiv.children.length);
  } catch (err) {
    console.error('Failed to load history:', err);
    addSystemMessage('Failed to load message history: ' + err.message);
  }
}

// Send message function
function sendMessage() {
  console.log('sendMessage called');
  const text = messageInput.value.trim();
  console.log('Message text:', text);

  if (!text) {
    console.log('Empty message, returning');
    return; // Silently ignore empty messages
  }

  if (!ws || ws.readyState !== WebSocket.OPEN) {
    console.log('WebSocket not ready:', ws ? ws.readyState : 'null');
    return;
  }

  if (!isAuthenticated) {
    console.log('Not authenticated');
    return;
  }

  console.log('Sending message:', text, 'to job:', currentJobId, 'subcategory:', currentSubcategory, 'chat:', currentIndividualChat);
  const messageData = {
    type: 'message',
    text,
    job_id: currentJobId
  };
  if (currentSubcategory !== 'General') {
    messageData.subcategory = currentSubcategory;
  }
  if (currentIndividualChat !== null) {
    messageData.individual_chat_id = currentIndividualChat;
  }
  ws.send(JSON.stringify(messageData));
  messageInput.value = '';
  console.log('Message sent, input cleared');
}

// Send message on Enter key
messageInput.addEventListener('keypress', (e) => {
  if (e.key === 'Enter') {
    e.preventDefault();
    sendMessage();
  }
});

// Send message on button click
sendBtn.addEventListener('click', sendMessage);

// Clear chat for current user
async function handleClearChat() {
  const context = currentIndividualChat
    ? `chat "${individualChats[currentJobId]?.find(c => c.id === currentIndividualChat)?.name}"`
    : `${currentSubcategory} in ${currentJobId}`;

  if (confirm(`Clear all non-question messages in ${context}?\n\nThis will permanently delete regular messages while preserving all Question entries.`)) {
    try {
      const params = new URLSearchParams({
        job_id: currentJobId,
        subcategory: currentSubcategory,
        clear_all: 'true'
      });

      if (currentIndividualChat) {
        params.append('chat_id', currentIndividualChat);
      }

      const response = await fetch(`/api/messages/clear?${params.toString()}`, {
        method: 'DELETE'
      });

      const data = await response.json();

      if (response.ok && data.success) {
        // Clear display and reload to show remaining messages (Questions)
        messagesDiv.innerHTML = '';
        if (data.deletedCount > 0) {
          addSystemMessage(`Cleared ${data.deletedCount} message(s)`);
        }
        // Reload chat history to reflect changes
        loadChatHistory();
      } else {
        alert('Failed to clear messages: ' + (data.error || 'Unknown error'));
      }
    } catch (err) {
      console.error('Error clearing messages:', err);
      alert('Failed to clear messages: ' + err.message);
    }
  }
}

// Auto-login if username exists
window.addEventListener('load', () => {
  const savedUsername = localStorage.getItem('username');
  if (savedUsername) {
    usernameInput.value = savedUsername;
    login();
  }
});

// Job creation functionality
function openCreateJobModal() {
  createJobModal.style.display = 'flex';
  jobNameInput.value = '';
  jobNameInput.focus();
}

function closeCreateJobModal() {
  createJobModal.style.display = 'none';
  jobNameInput.value = '';
}

async function createNewJob() {
  const jobName = jobNameInput.value.trim();
  if (!jobName) return;

  try {
    const response = await fetch('/api/jobs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ jobName })
    });

    const data = await response.json();

    if (response.ok && data.success) {
      closeCreateJobModal();
      await loadJobs();
      switchJob(data.jobName);
      addSystemMessage(`Job "${data.jobName}" created`);
    } else {
      alert(data.error || 'Failed to create job');
    }
  } catch (err) {
    console.error('Job creation error:', err);
    alert('Failed to create job');
  }
}

// Create job button in modal
const createJobBtnModal = document.getElementById('create-job-btn-modal');
if (createJobBtnModal) {
  createJobBtnModal.addEventListener('click', openCreateJobModal);
}

createJobBtn.addEventListener('click', createNewJob);
cancelJobBtn.addEventListener('click', closeCreateJobModal);
jobNameInput.addEventListener('keypress', (e) => {
  if (e.key === 'Enter') {
    e.preventDefault();
    createNewJob();
  } else if (e.key === 'Escape') {
    closeCreateJobModal();
  }
});

// Subcategory management
async function loadSubcategories(jobId) {
  console.log('Loading subcategories for:', jobId);

  // Show subcategory bar for all jobs (including General main job)
  subcategoryTabsDiv.innerHTML = '';
  subcategoryActionsDiv.innerHTML = '';

  // Always show "Questions" tab first (for general discussion)
  const generalTab = document.createElement('button');
  generalTab.className = 'subcategory-tab' + (currentSubcategory === 'Questions' ? ' active' : '');
  generalTab.textContent = 'Questions';
  generalTab.addEventListener('click', () => switchSubcategory('Questions'));
  subcategoryTabsDiv.appendChild(generalTab);

  // For non-General jobs, load Chat-pad option
  if (jobId === 'General') {
    subcategoryBar.style.display = 'block';
    return;
  }

  try {
    const url = `/api/jobs/${encodeURIComponent(jobId)}/subcategories`;
    console.log('Fetching subcategories from:', url);
    const response = await fetch(url);
    console.log('Subcategories response:', response.status);
    const data = await response.json();
    console.log('Subcategories data:', data);

    // Always show Chat-pads tab
    const foTab = document.createElement('button');
    foTab.className = 'subcategory-tab' + (currentSubcategory === 'Chat-pads' ? ' active' : '');
    foTab.textContent = 'Chat-pads';
    foTab.addEventListener('click', () => switchSubcategory('Chat-pads'));
    subcategoryTabsDiv.appendChild(foTab);

    // Add Clear button (to actions container)
    const clearChatBtn = document.createElement('button');
    clearChatBtn.id = 'clear-chat-btn';
    clearChatBtn.textContent = 'Clear';
    clearChatBtn.title = 'Clear chat messages (keeps Questions)';
    clearChatBtn.addEventListener('click', handleClearChat);
    subcategoryActionsDiv.appendChild(clearChatBtn);

    // Add + Chat button (to actions container)
    const addChatBtn = document.createElement('button');
    addChatBtn.id = 'add-chat-btn';
    addChatBtn.textContent = '+ Chat';
    addChatBtn.title = 'Create new individual chat';
    addChatBtn.addEventListener('click', openCreateChatModal);
    subcategoryActionsDiv.appendChild(addChatBtn);

    // Add + Question button (to actions container)
    const addProblemBtn = document.createElement('button');
    addProblemBtn.id = 'add-problem-btn';
    addProblemBtn.textContent = '+ Question';
    addProblemBtn.title = 'Create a new question';
    addProblemBtn.style.display = currentSubcategory === 'Questions' ? 'none' : '';
    addProblemBtn.addEventListener('click', openProblemModal);
    subcategoryActionsDiv.appendChild(addProblemBtn);

    // Add Manage Chat-pads button (to actions container)
    const manageQuestionsBtn = document.createElement('button');
    manageQuestionsBtn.id = 'manage-questions-btn';
    manageQuestionsBtn.textContent = 'Manage';
    manageQuestionsBtn.title = 'Manage chat-pads';
    manageQuestionsBtn.style.display = currentSubcategory === 'Questions' ? 'none' : '';
    manageQuestionsBtn.addEventListener('click', openChatpadManagement);
    subcategoryActionsDiv.appendChild(manageQuestionsBtn);

    // Add Answer button (to actions container)
    const answerBtn = document.createElement('button');
    answerBtn.id = 'answer-btn';
    answerBtn.textContent = 'Answer';
    answerBtn.title = 'Answer selected question';
    answerBtn.style.opacity = '0.5';
    answerBtn.style.cursor = 'not-allowed';
    answerBtn.disabled = true;
    answerBtn.addEventListener('click', () => {
      if (selectedQuestionId) {
        openSolvedModal(selectedQuestionId);
      }
    });
    subcategoryActionsDiv.appendChild(answerBtn);

    subcategoryBar.style.display = 'block';
  } catch (err) {
    console.error('Failed to load subcategories:', err);
    subcategoryBar.style.display = 'none';
  }
}

function switchSubcategory(subcategory) {
  currentSubcategory = subcategory;
  // Only reset currentIndividualChat when leaving Chat-pads view
  if (subcategory !== 'Chat-pads') {
    currentIndividualChat = null;
  }

  // Update active tab
  document.querySelectorAll('.subcategory-tab').forEach(tab => {
    if (tab.textContent === subcategory) {
      tab.classList.add('active');
    } else {
      tab.classList.remove('active');
    }
  });

  // Load individual chats if Chat-pad is selected
  if (subcategory === 'Chat-pads') {
    loadIndividualChats(currentJobId).then(() => {
      // Reload messages after chats are loaded
      messagesDiv.innerHTML = '';
      loadChatHistory();
    });
  } else {
    individualChatsBar.style.display = 'none';
    // Still load individual chats data for Questions tab (needed for chat-pad badges)
    if (subcategory === 'Questions') {
      loadIndividualChats(currentJobId).then(() => {
        // Reload messages after chats are loaded
        messagesDiv.innerHTML = '';
        loadChatHistory();
      });
    } else {
      messagesDiv.innerHTML = '';
      loadChatHistory();
    }
  }

  // Show/hide + Question button based on subcategory
  const addProblemBtn = document.getElementById('add-problem-btn');
  if (addProblemBtn) {
    if (subcategory === 'Questions') {
      addProblemBtn.style.display = 'none';
    } else {
      addProblemBtn.style.display = '';
    }
  }

  // Show/hide Manage button based on subcategory
  const manageBtn = document.getElementById('manage-questions-btn');
  if (manageBtn) {
    if (subcategory === 'Questions') {
      manageBtn.style.display = 'none';
    } else {
      manageBtn.style.display = '';
    }
  }

  // Load questions for new context
  console.log('switchSubcategory: calling loadProblems() for', currentJobId, currentSubcategory);
  loadProblems();

  // Reset selected question
  selectedQuestionId = null;
  const answerBtn = document.getElementById('answer-btn');
  if (answerBtn) {
    answerBtn.disabled = true;
    answerBtn.style.opacity = '0.5';
    answerBtn.style.cursor = 'not-allowed';
  }

  // Update message input placeholder
  updateMessageInputPlaceholder();
}



// Individual chat management
async function loadIndividualChats(jobId) {
  try {
    const response = await fetch(`/api/jobs/${encodeURIComponent(jobId)}/chats`);
    const data = await response.json();

    individualChatsDiv.innerHTML = '';

    // Add individual chat tabs
    if (data.chats && data.chats.length > 0) {
      individualChats[jobId] = data.chats;
      data.chats.forEach(chat => {
        const chatTab = document.createElement('button');
        chatTab.className = 'individual-chat-tab' + (currentIndividualChat === chat.id ? ' active' : '');
        chatTab.textContent = chat.name;
        chatTab.addEventListener('click', () => switchIndividualChat(chat.id));
        individualChatsDiv.appendChild(chatTab);
      });
    }



    individualChatsBar.style.display = 'block';
  } catch (err) {
    console.error('Failed to load individual chats:', err);
    individualChatsBar.style.display = 'none';
  }
}

// Load individual chats for ALL jobs (used in FLOW tab)
async function loadAllIndividualChats() {
  try {
    // Load chats for each job
    const loadPromises = jobs.map(async (jobId) => {
      if (jobId !== 'General') {
        try {
          const response = await fetch(`/api/jobs/${encodeURIComponent(jobId)}/chats`);
          const data = await response.json();
          if (data.chats && data.chats.length > 0) {
            individualChats[jobId] = data.chats;
          }
        } catch (err) {
          console.error(`Failed to load chats for job ${jobId}:`, err);
        }
      }
    });

    await Promise.all(loadPromises);
    console.log('Loaded individual chats for all jobs:', individualChats);
  } catch (err) {
    console.error('Failed to load all individual chats:', err);
  }
}



function switchIndividualChat(chatId) {
  currentIndividualChat = chatId;
  console.log('Switched to individual chat:', chatId);

  // Update active tab
  document.querySelectorAll('.individual-chat-tab').forEach(tab => {
    if ((chatId === null && tab.textContent === 'All') ||
      (chatId !== null && individualChats[currentJobId] &&
        individualChats[currentJobId].find(c => c.id === chatId && c.name === tab.textContent))) {
      tab.classList.add('active');
    } else {
      tab.classList.remove('active');
    }
  });

  // Delete button visible in Chat-pad view (can delete individual chats)
  // No change needed here

  // Reset selected question
  selectedQuestionId = null;
  const answerBtn = document.getElementById('answer-btn');
  if (answerBtn) {
    answerBtn.disabled = true;
    answerBtn.style.opacity = '0.5';
    answerBtn.style.cursor = 'not-allowed';
  }

  // Update message input placeholder
  updateMessageInputPlaceholder();

  // Load problems for new context
  loadProblems();

  // Reload messages with new filter
  messagesDiv.innerHTML = '';
  loadChatHistory();
}

function updateMessageInputPlaceholder() {
  if ((currentSubcategory === 'Chat-pads' || currentSubcategory === 'Questions') && currentIndividualChat === null) {
    messageInput.placeholder = 'Press "+Chat" and enter the FO or subject to start the conversation.';
  } else {
    messageInput.placeholder = 'Type a message...';
  }
}

function openCreateChatModal() {
  createChatModal.style.display = 'flex';
  chatNameInput.value = '';
  chatNameInput.focus();
}

function closeCreateChatModal() {
  createChatModal.style.display = 'none';
  chatNameInput.value = '';
}

async function createNewIndividualChat() {
  const chatName = chatNameInput.value.trim();
  if (!chatName) return;

  try {
    const response = await fetch(`/api/jobs/${encodeURIComponent(currentJobId)}/chats`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chatName,
        username: currentUser.username
      })
    });

    const data = await response.json();

    if (response.ok && data.success) {
      closeCreateChatModal();
      await loadIndividualChats(currentJobId);
      switchIndividualChat(data.chatId);
      addSystemMessage(`Chat "${chatName}" created`);
    } else {
      alert(data.error || 'Failed to create chat');
    }
  } catch (err) {
    console.error('Chat creation error:', err);
    alert('Failed to create chat');
  }
}

createChatBtn.addEventListener('click', createNewIndividualChat);
cancelChatBtn.addEventListener('click', closeCreateChatModal);
chatNameInput.addEventListener('keypress', (e) => {
  if (e.key === 'Enter') {
    e.preventDefault();
    createNewIndividualChat();
  } else if (e.key === 'Escape') {
    closeCreateChatModal();
  }
});

// Display message with color highlighting
function displayMessage(text, timestamp, type, username = '', subcategory = 'All', messageId = null, isProblem = false, isSolved = false, solution = '', solvedBy = '', chatName = '', jobName = '', inPlaybook = false) {
  const messageDiv = document.createElement('div');
  messageDiv.className = `message message-${type}`;
  if (messageId) {
    messageDiv.dataset.messageId = messageId;
  }

  const bubble = document.createElement('div');
  bubble.className = 'message-bubble';

  // Don't add question-bubble class - we'll style it inline below

  // Add username for all messages
  if (username) {
    const nameDiv = document.createElement('div');
    nameDiv.style.display = 'flex';
    nameDiv.style.alignItems = 'center';
    nameDiv.style.gap = '6px';
    nameDiv.style.marginBottom = '4px';

    const nameSpan = document.createElement('span');
    nameSpan.className = 'message-username';
    nameSpan.textContent = username;
    nameDiv.appendChild(nameSpan);

    // For questions, add job code badge
    if (isProblem && jobName && jobName !== 'General') {
      // Look up job code from jobsData
      const jobData = jobsData.find(j => j.name === jobName);
      const jobLabel = jobData && jobData.code ? jobData.code : jobName;

      const jobBadge = document.createElement('span');
      jobBadge.style.fontSize = '9px';
      jobBadge.style.padding = '3px 6px';
      jobBadge.style.backgroundColor = '#fbc02d';
      jobBadge.style.color = '#000';
      jobBadge.style.borderRadius = '3px';
      jobBadge.style.fontWeight = '700';
      jobBadge.title = jobName;
      jobBadge.textContent = jobLabel;
      nameDiv.appendChild(jobBadge);
    }

    // Add subcategory badge if it's a Chat-pad (for questions, make it clickable)
    if (subcategory === 'Chat-pads' && isProblem) {
      const badge = document.createElement('span');
      badge.style.fontSize = '9px';
      badge.style.padding = '3px 6px';
      badge.style.backgroundColor = '#00bcd4';
      badge.style.color = '#111';
      badge.style.borderRadius = '3px';
      badge.style.fontWeight = '700';
      badge.style.cursor = 'pointer';
      badge.style.position = 'relative';
      badge.textContent = chatName || 'Select Chat-pad';
      badge.title = 'Click to change chat-pad assignment';
      badge.dataset.messageId = messageId;
      nameDiv.appendChild(badge);

      // Store badge reference for later use
      nameDiv.chatpadBadge = badge;
    } else if (subcategory === 'Chat-pads' && chatName) {
      // For non-question messages, show non-clickable badge
      const badge = document.createElement('span');
      badge.style.fontSize = '7px';
      badge.style.padding = '2px 4px';
      badge.style.backgroundColor = '#00bcd4';
      badge.style.color = '#111';
      badge.style.borderRadius = '3px';
      badge.style.fontWeight = '700';
      badge.textContent = chatName;
      nameDiv.appendChild(badge);
    }

    bubble.appendChild(nameDiv);
  }

  // For questions, wrap content in yellow bordered box
  if (isProblem) {
    const questionContainer = document.createElement('div');
    questionContainer.style.marginTop = '8px';
    questionContainer.style.padding = '12px';
    questionContainer.style.backgroundColor = 'rgba(251, 192, 45, 0.15)';
    questionContainer.style.border = '2px solid #fbc02d';
    questionContainer.style.borderRadius = '8px';

    const questionLabel = document.createElement('div');
    questionLabel.style.fontWeight = 'bold';
    questionLabel.style.color = '#fbc02d';
    questionLabel.style.marginBottom = '6px';
    questionLabel.style.fontSize = '11px';
    questionLabel.style.textTransform = 'uppercase';
    questionLabel.style.letterSpacing = '0.5px';
    questionLabel.textContent = `Question by ${username}`;
    questionContainer.appendChild(questionLabel);

    // Strip old "🔴 Question: " prefix from legacy messages
    let cleanText = text;
    if (cleanText.startsWith('🔴 Question: ')) {
      cleanText = cleanText.replace('🔴 Question: ', '');
    }

    const content = document.createElement('div');
    content.className = 'message-content';
    content.style.color = '#e9edef';
    content.style.lineHeight = '1.5';
    content.appendChild(highlightText(cleanText));
    questionContainer.appendChild(content);

    bubble.appendChild(questionContainer);
  } else {
    // Regular message content
    const content = document.createElement('div');
    content.className = 'message-content';
    content.appendChild(highlightText(text));
    bubble.appendChild(content);
  }

  const time = document.createElement('div');
  time.className = 'message-time';
  time.textContent = formatTimestamp(timestamp);

  bubble.appendChild(time);

  // Visual highlight is now handled by CSS class 'question-bubble'

  // Add click handler for question selection and display answered questions
  if (isProblem) {
    // Add dropdown for chat-pad selection (only for questions in Chat-pads subcategory)
    if (subcategory === 'Chat-pads' || currentSubcategory === 'Chat-pads') {
      // Find the badge created earlier
      const chatpadButton = bubble.querySelector('[data-message-id]');

      if (chatpadButton) {
        // Create dropdown container (hidden by default)
        const dropdownContainer = document.createElement('div');
        dropdownContainer.className = 'chatpad-dropdown-container';
        dropdownContainer.style.display = 'none';
        dropdownContainer.style.position = 'absolute';
        dropdownContainer.style.top = '22px';
        dropdownContainer.style.left = '0';
        dropdownContainer.style.background = '#1a1a1a';
        dropdownContainer.style.border = '1px solid #374045';
        dropdownContainer.style.borderRadius = '4px';
        dropdownContainer.style.padding = '4px';
        dropdownContainer.style.minWidth = '150px';
        dropdownContainer.style.maxHeight = '200px';
        dropdownContainer.style.overflowY = 'auto';
        dropdownContainer.style.zIndex = '1000';
        dropdownContainer.style.boxShadow = '0 2px 8px rgba(0,0,0,0.5)';

        // Toggle dropdown on button click
        chatpadButton.addEventListener('click', async (e) => {
          e.stopPropagation();

          // Close if already open
          if (dropdownContainer.style.display === 'block') {
            dropdownContainer.style.display = 'none';
            return;
          }

          // Close all other open dropdowns
          document.querySelectorAll('.chatpad-dropdown-container').forEach(dd => {
            dd.style.display = 'none';
          });

          // Load chat-pads and show dropdown
          dropdownContainer.innerHTML = '<div style="padding: 8px; color: #999;">Loading...</div>';
          dropdownContainer.style.display = 'block';

          if (currentJobId && currentJobId !== 'General') {
            try {
              const response = await fetch(`/api/jobs/${encodeURIComponent(currentJobId)}/chats`);
              const data = await response.json();
              const chats = data.chats || [];

              dropdownContainer.innerHTML = '';

              if (chats.length === 0) {
                dropdownContainer.innerHTML = '<div style="padding: 8px; color: #999;">No chat-pads available</div>';
              } else {
                chats.forEach(chat => {
                  const option = document.createElement('div');
                  option.style.padding = '8px';
                  option.style.cursor = 'pointer';
                  option.style.color = '#e9edef';
                  option.style.borderRadius = '2px';
                  option.textContent = chat.name;

                  if (chatName === chat.name) {
                    option.style.background = '#fbc02d';
                    option.style.color = '#000';
                    option.style.fontWeight = 'bold';
                  }

                  option.addEventListener('mouseenter', () => {
                    if (chatName !== chat.name) {
                      option.style.background = '#2a2a2a';
                    }
                  });

                  option.addEventListener('mouseleave', () => {
                    if (chatName !== chat.name) {
                      option.style.background = '';
                    }
                  });

                  option.addEventListener('click', async (clickEvent) => {
                    clickEvent.stopPropagation();

                    try {
                      const updateResponse = await fetch(`/api/messages/${messageId}/chatpad`, {
                        method: 'PATCH',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                          individualChatId: chat.id,
                          chatName: chat.name
                        })
                      });

                      if (updateResponse.ok) {
                        console.log(`Question reassigned to chat-pad: ${chat.name}`);
                        // Update badge text
                        chatpadButton.textContent = chat.name;
                        // Hide dropdown
                        dropdownContainer.style.display = 'none';
                        // Clear and reload messages to reflect change
                        messagesDiv.innerHTML = '';
                        loadChatHistory();
                      } else {
                        alert('Failed to update chat-pad assignment');
                      }
                    } catch (err) {
                      console.error('Error updating chat-pad:', err);
                      alert('Failed to update chat-pad assignment');
                    }
                  });

                  dropdownContainer.appendChild(option);
                });
              }
            } catch (err) {
              console.error('Failed to load chat-pads for dropdown:', err);
              dropdownContainer.innerHTML = '<div style="padding: 8px; color: #f44;">Error loading chat-pads</div>';
            }
          }
        });

        chatpadButton.appendChild(dropdownContainer);

        // Close dropdown when clicking outside
        document.addEventListener('click', (e) => {
          if (!chatpadButton.contains(e.target)) {
            dropdownContainer.style.display = 'none';
          }
        });
      }
    }

    // Make question clickable to select it
    if (!isSolved) {
      messageDiv.style.cursor = 'pointer';
      messageDiv.addEventListener('click', (e) => {
        e.stopPropagation();
        // Deselect all questions
        document.querySelectorAll('.message').forEach(msg => {
          msg.style.backgroundColor = '';
          msg.style.border = '';
          msg.style.borderRadius = '';
        });
        // Select this question with visible highlight
        messageDiv.style.backgroundColor = 'rgba(251, 192, 45, 0.2)';
        messageDiv.style.border = '2px solid #fbc02d';
        messageDiv.style.borderRadius = '8px';
        messageDiv.style.padding = '4px';
        selectedQuestionId = messageId;

        // Enable Answer button in top bar
        const answerBtn = document.getElementById('answer-btn');
        if (answerBtn) {
          answerBtn.disabled = false;
          answerBtn.style.opacity = '1';
          answerBtn.style.cursor = 'pointer';
        }
      });
    }

    if (isSolved) {
      // Display answer below, indented with blue styling to match Answer button
      if (solution) {
        const solutionDiv = document.createElement('div');
        solutionDiv.style.marginTop = '12px';
        solutionDiv.style.padding = '12px';
        solutionDiv.style.backgroundColor = 'rgba(0, 188, 212, 0.15)';
        solutionDiv.style.border = '2px solid #00bcd4';
        solutionDiv.style.borderRadius = '8px';
        solutionDiv.style.fontSize = '13px';
        solutionDiv.style.cursor = 'pointer';
        solutionDiv.title = 'Click to edit answer';
        solutionDiv.addEventListener('click', () => {
          openSolvedModal(messageId, solution);
        });

        const solutionLabel = document.createElement('div');
        solutionLabel.style.fontWeight = 'bold';
        solutionLabel.style.color = '#00bcd4';
        solutionLabel.style.marginBottom = '6px';
        solutionLabel.style.fontSize = '11px';
        solutionLabel.style.textTransform = 'uppercase';
        solutionLabel.style.letterSpacing = '0.5px';
        solutionLabel.textContent = `Answer by ${solvedBy}`;
        solutionDiv.appendChild(solutionLabel);

        const solutionText = document.createElement('div');
        solutionText.style.color = '#e9edef';
        solutionText.style.lineHeight = '1.5';
        solutionText.textContent = solution;
        solutionDiv.appendChild(solutionText);

        bubble.appendChild(solutionDiv);

        // Playbook Action
        if (inPlaybook) {
          const playbookBadge = document.createElement('div');
          playbookBadge.style.marginTop = '8px';
          playbookBadge.style.fontSize = '11px';
          playbookBadge.style.color = '#00a884';
          playbookBadge.style.fontWeight = 'bold';
          playbookBadge.style.display = 'flex';
          playbookBadge.style.alignItems = 'center';
          playbookBadge.style.gap = '4px';
          playbookBadge.innerHTML = '<span>📖</span> In Playbook';
          bubble.appendChild(playbookBadge);
        } else {
          // Show "Log to Playbook" button for solved questions
          const playbookBtn = document.createElement('button');
          playbookBtn.textContent = 'Log to Playbook';
          playbookBtn.style.marginTop = '8px';
          playbookBtn.style.backgroundColor = 'transparent';
          playbookBtn.style.border = '1px solid #00a884';
          playbookBtn.style.color = '#00a884';
          playbookBtn.style.borderRadius = '4px';
          playbookBtn.style.padding = '4px 8px';
          playbookBtn.style.fontSize = '11px';
          playbookBtn.style.cursor = 'pointer';
          playbookBtn.style.fontWeight = '600';
          playbookBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            openPlaybookModal(messageId, text, solution);
          });

          // Only show if we are in FLOW tab or General job (as per user request "from the FLOW tab")
          // But user also said "once the answer has been confirmed...". 
          // I'll make it available everywhere for now as it's useful.
          bubble.appendChild(playbookBtn);
        }
      }
    }
  }

  // Add delete button for author
  if (currentUser && username && username.toLowerCase() === currentUser.username.toLowerCase() && messageId) {
    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'message-delete-btn';
    deleteBtn.innerHTML = '🗑️';
    deleteBtn.title = 'Delete message';
    deleteBtn.style.display = 'none';
    deleteBtn.style.position = 'absolute';
    deleteBtn.style.top = '8px';
    deleteBtn.style.right = '8px';
    deleteBtn.style.background = 'rgba(0, 0, 0, 0.5)';
    deleteBtn.style.border = 'none';
    deleteBtn.style.borderRadius = '4px';
    deleteBtn.style.cursor = 'pointer';
    deleteBtn.style.opacity = '0.7';
    deleteBtn.style.fontSize = '16px';
    deleteBtn.style.padding = '4px 8px';
    deleteBtn.style.zIndex = '10';
    deleteBtn.style.transition = 'opacity 0.2s, background 0.2s';

    deleteBtn.addEventListener('mouseenter', () => {
      deleteBtn.style.opacity = '1';
      deleteBtn.style.background = 'rgba(200, 0, 0, 0.8)';
    });

    deleteBtn.addEventListener('mouseleave', () => {
      deleteBtn.style.opacity = '0.7';
      deleteBtn.style.background = 'rgba(0, 0, 0, 0.5)';
    });

    deleteBtn.addEventListener('click', async (e) => {
      e.stopPropagation();
      if (confirm('Are you sure you want to delete this message?')) {
        try {
          const response = await fetch(`/api/messages/${messageId}?username=${encodeURIComponent(currentUser.username)}`, {
            method: 'DELETE'
          });

          if (response.status === 204) {
            messageDiv.remove();
            addSystemMessage('Message deleted');
          } else {
            const data = await response.json();
            alert(data.error || 'Failed to delete message');
          }
        } catch (err) {
          console.error('Error deleting message:', err);
          alert('Failed to delete message');
        }
      }
    });

    // Ensure bubble is relative for positioning
    bubble.style.position = 'relative';
    bubble.appendChild(deleteBtn);

    // Show button on hover
    bubble.addEventListener('mouseenter', () => deleteBtn.style.display = 'block');
    bubble.addEventListener('mouseleave', () => deleteBtn.style.display = 'none');
  }

  messageDiv.appendChild(bubble);
  messagesDiv.appendChild(messageDiv);
  messagesDiv.scrollTop = messagesDiv.scrollHeight;
}

// Add system messages
function addSystemMessage(text) {
  const messageDiv = document.createElement('div');
  messageDiv.className = 'system-message';
  messageDiv.textContent = text;
  messagesDiv.appendChild(messageDiv);
  messagesDiv.scrollTop = messagesDiv.scrollHeight;
}

// Highlight parts of speech using compromise.js
function highlightText(text) {
  // Check if compromise library is loaded
  if (typeof compromise === 'undefined' && typeof nlp === 'undefined') {
    console.warn('NLP library not loaded, displaying plain text');
    const container = document.createElement('span');
    container.textContent = text;
    return container;
  }

  // Use compromise or nlp (whichever is available)
  const nlpFunc = typeof compromise !== 'undefined' ? compromise : nlp;
  const doc = nlpFunc(text);
  const container = document.createElement('span');

  // Get all terms with their tags
  const terms = doc.terms().out('array');

  terms.forEach((term, index) => {
    const span = document.createElement('span');
    span.textContent = term;

    // Check parts of speech and apply colors
    const termDoc = nlp(term);

    if (termDoc.nouns().length > 0) {
      span.className = 'noun';
    } else if (termDoc.verbs().length > 0) {
      span.className = 'verb';
    } else if (termDoc.adjectives().length > 0) {
      span.className = 'adjective';
    } else if (termDoc.prepositions().length > 0) {
      span.className = 'preposition';
    }

    container.appendChild(span);

    // Add space between terms
    if (index < terms.length - 1) {
      container.appendChild(document.createTextNode(' '));
    }
  });

  return container;
}

// Format timestamp
function formatTimestamp(timestamp) {
  const date = new Date(timestamp);
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${hours}:${minutes}`;
}

// ==================== PROBLEM-SOLUTION-REFLEX SYSTEM ====================

// Load problems for current context
async function loadProblems() {
  try {
    const params = new URLSearchParams({
      subcategory: currentSubcategory,
      status: 'unsolved'
    });

    if (currentIndividualChat) {
      params.append('chat_id', currentIndividualChat);
    }

    console.log('Loading problems for:', currentJobId, currentSubcategory, currentIndividualChat);
    const response = await fetch(`/api/jobs/${encodeURIComponent(currentJobId)}/problems?${params.toString()}`);
    const data = await response.json();

    console.log('Problems loaded:', data.problems);
    currentProblems = data.problems || [];
    renderProblems();
  } catch (err) {
    console.error('Failed to load problems:', err);
  }
}

function renderProblems() {
  console.log('renderProblems called with', currentProblems.length, 'problems');
  console.log('Problems data:', currentProblems);
  problemsList.innerHTML = '';

  if (currentProblems.length === 0) {
    console.log('No problems to display, hiding bar');
    problemsBar.style.display = 'none';
    return;
  }

  console.log('Showing problems bar with', currentProblems.length, 'problems');
  problemsBar.style.display = 'flex';

  currentProblems.forEach(problem => {
    const pill = document.createElement('div');
    pill.className = 'problem-pill';
    pill.dataset.problemId = problem.id;
    pill.dataset.messageId = problem.message_id;

    const text = document.createElement('span');
    text.className = 'problem-text';
    text.textContent = problem.problem_text;
    text.title = `${problem.problem_text}\n\nCreated by: ${problem.created_by}\n${new Date(problem.created_at).toLocaleString()}`;

    const solveBtn = document.createElement('button');
    solveBtn.className = 'solve-btn';
    solveBtn.textContent = '+Sol';
    solveBtn.title = 'Add solution';
    solveBtn.onclick = (e) => {
      e.stopPropagation();
      openSolutionModal(problem);
    };

    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'delete-problem-btn';
    deleteBtn.textContent = '×';
    deleteBtn.title = 'Delete this problem';
    deleteBtn.onclick = async (e) => {
      e.stopPropagation();
      await deleteProblemMessage(problem.message_id, problem.problem_text);
    };

    const creator = document.createElement('span');
    creator.className = 'problem-creator';
    creator.textContent = `—${problem.created_by}`;

    pill.appendChild(text);
    pill.appendChild(solveBtn);
    pill.appendChild(deleteBtn);
    pill.appendChild(creator);

    problemsList.appendChild(pill);
  });
}

async function deleteProblemMessage(messageId, problemText) {
  if (!confirm(`Delete question: "${problemText}"?\n\nThis will permanently remove this Question entry.`)) {
    return;
  }

  try {
    const response = await fetch(`/api/messages?message_id=${encodeURIComponent(messageId)}`, {
      method: 'DELETE'
    });

    const data = await response.json();

    if (response.ok && data.success) {
      // Reload problems to update UI
      loadProblems();
      // Reload chat history
      loadChatHistory();
    } else {
      alert('Failed to delete problem');
    }
  } catch (err) {
    console.error('Error deleting problem:', err);
    alert('Failed to delete problem: ' + err.message);
  }
}

function openProblemModal() {
  // Prevent creating questions in the Questions tab
  if (currentSubcategory === 'Questions') {
    alert('Questions cannot be created in the Questions tab.\n\nPlease navigate to a Chat-pad to create a question.');
    return;
  }

  // Prevent creating questions when no chat-pad is selected
  if (currentSubcategory === 'Chat-pads' && currentIndividualChat === null) {
    alert('Please select or create a chat-pad first.\n\nQuestions must be assigned to a specific chat-pad.');
    return;
  }

  console.log('Opening problem modal - currentIndividualChat:', currentIndividualChat, 'currentSubcategory:', currentSubcategory);

  createProblemModal.style.display = 'flex';
  problemTextInput.value = '';
  problemTextInput.focus();
}

function openChatpadManagement() {
  populateChatpadManagement();
  chatpadManagementModal.style.display = 'flex';
}

function closeChatpadManagement() {
  chatpadManagementModal.style.display = 'none';
}

async function populateChatpadManagement() {
  chatpadManagementBody.innerHTML = '';

  if (!currentJobId || currentJobId === 'General') {
    return;
  }

  try {
    // Fetch individual chats for current job
    const chatsResponse = await fetch(`/api/jobs/${encodeURIComponent(currentJobId)}/chats`);
    const chatsData = await chatsResponse.json();
    const chats = chatsData.chats || [];

    // Fetch all messages to get commenters and questions
    const messagesResponse = await fetch(`/api/messages?job=${encodeURIComponent(currentJobId)}`);
    const messagesData = await messagesResponse.json();
    const allMessages = messagesData.messages || [];

    // Group by individual chat
    for (const chat of chats) {
      const chatMessages = allMessages.filter(m =>
        m.jobId === currentJobId &&
        m.subcategory === 'Chat-pads' &&
        m.individualChatId === chat.id
      );

      // Get unique commenters
      const commenters = [...new Set(chatMessages.map(m => m.username))];

      // Get questions for this chat-pad
      const questions = chatMessages.filter(m => m.isProblem === true);

      const row = document.createElement('tr');
      row.style.borderBottom = '1px solid #2a2a2a';

      row.innerHTML = `
        <td style="padding: 12px; color: #e9edef; font-weight: 500;">${chat.name}</td>
        <td style="padding: 12px; color: #8696a0; font-size: 12px;">${commenters.length > 0 ? commenters.join(', ') : 'None'}</td>
        <td style="padding: 12px; color: #8696a0; font-size: 12px;">${questions.length} question${questions.length !== 1 ? 's' : ''}</td>
        <td style="padding: 12px; text-align: center;">
            <button class="delete-chatpad-btn" data-chat-id="${chat.id}" data-chat-name="${chat.name}" style="background: #c62828; color: #fff; padding: 4px 12px; border: none; border-radius: 4px; cursor: pointer; font-size: 11px; font-weight: 600;">Delete</button>
        </td>
      `;

      chatpadManagementBody.appendChild(row);
    }

    // Add delete event listeners
    document.querySelectorAll('.delete-chatpad-btn').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        const chatId = e.target.dataset.chatId;
        const chatName = e.target.dataset.chatName;

        if (!confirm(`Delete Chat-pad "${chatName}"?\n\nThis will permanently delete:\n- All messages in this chat-pad\n- All questions in this chat-pad\n\nThis cannot be undone.`)) {
          return;
        }

        try {
          const response = await fetch(`/api/jobs/${encodeURIComponent(currentJobId)}/chats/${encodeURIComponent(chatId)}`, {
            method: 'DELETE'
          });

          const data = await response.json();

          if (response.ok && data.success) {
            console.log(`Chat-pad "${chatName}" deleted`);

            // If currently viewing the deleted chat-pad, switch to "All" view
            if (currentIndividualChat === parseInt(chatId)) {
              currentIndividualChat = null;
            }

            // Refresh the chat-pads in the UI
            await loadIndividualChats(currentJobId);

            // Refresh the management modal list
            populateChatpadManagement();

            // Reload messages to reflect the deletion
            messagesDiv.innerHTML = '';
            await loadChatHistory();
          } else {
            alert('Failed to delete chat-pad: ' + (data.error || 'Unknown error'));
          }
        } catch (err) {
          console.error('Error deleting chat-pad:', err);
          alert('Failed to delete chat-pad: ' + err.message);
        }
      });
    });

  } catch (err) {
    console.error('Failed to load chat-pad management data:', err);
  }
}

function closeProblemModal() {
  createProblemModal.style.display = 'none';
  problemTextInput.value = '';
}

async function createNewProblem() {
  const problemText = problemTextInput.value.trim();

  if (!problemText) {
    return;
  }

  // Prevent creating questions in the Questions tab
  if (currentSubcategory === 'Questions') {
    alert('Questions cannot be created in the Questions tab.');
    closeProblemModal();
    return;
  }

  if (!ws || ws.readyState !== WebSocket.OPEN) {
    alert('Not connected to server');
    return;
  }

  if (!isAuthenticated) {
    return;
  }

  // Send as a special message with isProblem flag
  const messageData = {
    type: 'message',
    text: problemText,
    job_id: currentJobId,
    isProblem: true  // Marks this as a Question so it won't be deleted by Clear
  };

  if (currentSubcategory !== 'General') {
    messageData.subcategory = currentSubcategory;
  }
  // Auto-assign to current individual chat if in Chat-pads view
  if (currentIndividualChat !== null) {
    messageData.individual_chat_id = currentIndividualChat;
    console.log('Auto-assigning question to chat-pad:', currentIndividualChat);
  } else {
    console.log('No individual chat selected, question will need manual assignment');
  }

  ws.send(JSON.stringify(messageData));
  closeProblemModal();
}

function openSolutionModal(problem) {
  currentProblemId = problem.id;
  solutionProblemText.textContent = `Problem: ${problem.problem_text}`;
  solutionTextInput.value = '';
  addSolutionModal.style.display = 'flex';
  solutionTextInput.focus();
}

function closeSolutionModal() {
  addSolutionModal.style.display = 'none';
  solutionTextInput.value = '';
  currentProblemId = null;
}

async function addSolution() {
  const solutionText = solutionTextInput.value.trim();
  if (!solutionText || !currentProblemId) return;

  try {
    const response = await fetch(`/api/problems/${encodeURIComponent(currentProblemId)}/solution`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        solution_text: solutionText,
        username: currentUser.username
      })
    });

    const data = await response.json();

    if (response.ok && data.success) {
      closeSolutionModal();
      // WebSocket will trigger reflex popup
    } else {
      alert('Failed to add solution: ' + (data.error || 'Unknown error'));
    }
  } catch (err) {
    console.error('Error adding solution:', err);
    alert('Failed to add solution: ' + err.message);
  }
}



// Event listeners for Problem modals
createProblemBtn.addEventListener('click', createNewProblem);
cancelProblemBtn.addEventListener('click', closeProblemModal);
problemTextInput.addEventListener('keypress', (e) => {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    createNewProblem();
  } else if (e.key === 'Escape') {
    closeProblemModal();
  }
});

addSolutionBtn.addEventListener('click', addSolution);
cancelSolutionBtn.addEventListener('click', closeSolutionModal);
solutionTextInput.addEventListener('keypress', (e) => {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    addSolution();
  } else if (e.key === 'Escape') {
    closeSolutionModal();
  }
});

// Solved modal event listeners
function openSolvedModal(messageId, currentSolution = '') {
  currentSolvingMessageId = messageId;
  const solvedModal = document.getElementById('solved-modal');
  const solvedTextInput = document.getElementById('solved-text-input');
  const solvedModalTitle = document.getElementById('solved-modal-title');

  if (!solvedModal || !solvedTextInput || !solvedModalTitle) {
    console.error('Answer modal elements not found!');
    return;
  }

  solvedTextInput.value = currentSolution;
  solvedModalTitle.textContent = currentSolution ? 'Edit Answer' : 'Add Answer';
  solvedModal.style.display = 'flex';
  setTimeout(() => solvedTextInput.focus(), 100);
}

function closeSolvedModal() {
  const solvedModal = document.getElementById('solved-modal');
  const solvedTextInput = document.getElementById('solved-text-input');

  if (solvedModal) solvedModal.style.display = 'none';
  if (solvedTextInput) solvedTextInput.value = '';
  currentSolvingMessageId = null;
}

async function submitSolved() {
  const solvedTextInput = document.getElementById('solved-text-input');

  if (!solvedTextInput) {
    alert('Answer input not found');
    return;
  }

  const solution = solvedTextInput.value.trim();

  if (!solution) {
    alert('Please enter a solution');
    return;
  }

  if (!currentSolvingMessageId) {
    alert('No message selected');
    return;
  }

  try {
    const response = await fetch(`/api/messages/${currentSolvingMessageId}/solve`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        solution: solution,
        username: currentUser.username
      })
    });

    const data = await response.json();

    if (response.ok) {
      closeSolvedModal();
      // UI will update via WebSocket broadcast
    } else {
      alert('Failed to save solution: ' + (data.error || 'Unknown error'));
    }
  } catch (err) {
    console.error('Error saving solution:', err);
    alert('Failed to save solution: ' + err.message);
  }
}

// Event listeners for Answer modal - query elements when setting up listeners
const submitSolvedBtn = document.getElementById('submit-solved-btn');
const cancelSolvedBtn = document.getElementById('cancel-solved-btn');
const solvedTextInput = document.getElementById('solved-text-input');

if (submitSolvedBtn) submitSolvedBtn.addEventListener('click', submitSolved);
if (cancelSolvedBtn) cancelSolvedBtn.addEventListener('click', closeSolvedModal);
if (solvedTextInput) {
  solvedTextInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter' && e.ctrlKey) {
      e.preventDefault();
      submitSolved();
    } else if (e.key === 'Escape') {
      closeSolvedModal();
    }
  });
}

// Click to dismiss reflex popup
if (reflexPopup) {
  reflexPopup.addEventListener('click', () => {
    reflexPopup.style.display = 'none';
  });
}

// ==================== JOB MANAGEMENT ====================

// Jobs button event listener
if (jobsBtn) {
  jobsBtn.addEventListener('click', openJobManagementModal);
}

if (closeJobManagementBtn) {
  closeJobManagementBtn.addEventListener('click', closeJobManagementModal);
}

if (closeChatpadManagementBtn) {
  closeChatpadManagementBtn.addEventListener('click', closeChatpadManagement);
}

function openJobManagementModal() {
  populateJobsTable();
  jobManagementModal.style.display = 'flex';
}

function closeJobManagementModal() {
  jobManagementModal.style.display = 'none';
}

function populateJobsTable() {
  jobsTableBody.innerHTML = '';

  if (jobsData.length === 0) {
    const row = document.createElement('tr');
    row.innerHTML = '<td colspan="3" style="text-align: center; padding: 20px; color: #999;">No jobs yet. Create your first job using the "+ Create New Job" button above.</td>';
    jobsTableBody.appendChild(row);
    return;
  }

  jobsData.forEach(job => {
    const row = document.createElement('tr');
    row.style.borderBottom = '1px solid #2a2a2a';

    // Add archived styling
    if (job.archived) {
      row.style.opacity = '0.5';
      row.style.background = '#1a1a1a';
    }

    // Job Code cell (editable)
    const codeCell = document.createElement('td');
    codeCell.style.padding = '12px 8px';
    const codeInput = document.createElement('input');
    codeInput.type = 'text';
    codeInput.value = job.code || '';
    codeInput.placeholder = 'Enter code...';
    codeInput.maxLength = 20;
    codeInput.style.cssText = 'width: 100%; background: #2a2a2a; color: #e9edef; border: 1px solid #444; border-radius: 4px; padding: 6px 8px; font-size: 14px;';
    codeInput.addEventListener('blur', () => updateJobCode(job.name, codeInput.value));
    codeInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        codeInput.blur();
      }
    });
    codeCell.appendChild(codeInput);

    // Job Name cell (editable)
    const nameCell = document.createElement('td');
    nameCell.style.padding = '12px 8px';
    const nameInput = document.createElement('input');
    nameInput.type = 'text';
    nameInput.value = job.name;
    nameInput.placeholder = 'Job name...';
    nameInput.maxLength = 50;
    nameInput.style.cssText = 'width: 100%; background: #2a2a2a; color: #e9edef; border: 1px solid #444; border-radius: 4px; padding: 6px 8px; font-size: 14px;';
    nameInput.addEventListener('blur', () => updateJobName(job.name, nameInput.value));
    nameInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        nameInput.blur();
      }
    });
    nameCell.appendChild(nameInput);

    // Action cell
    const actionCell = document.createElement('td');
    actionCell.style.padding = '12px 8px';
    actionCell.style.display = 'flex';
    actionCell.style.gap = '6px';

    const viewBtn = document.createElement('button');
    viewBtn.textContent = 'View';
    viewBtn.style.cssText = 'background: #25d366; color: #111; border: none; border-radius: 4px; padding: 6px 12px; cursor: pointer; font-size: 13px; font-weight: 600;';
    viewBtn.addEventListener('click', () => {
      switchJob(job.name);
      closeJobManagementModal();
    });

    const archiveBtn = document.createElement('button');
    archiveBtn.textContent = job.archived ? 'Unarchive' : 'Archive';
    archiveBtn.style.cssText = `background: ${job.archived ? '#fbc02d' : '#5a5a5a'}; color: ${job.archived ? '#000' : '#e9edef'}; border: none; border-radius: 4px; padding: 6px 12px; cursor: pointer; font-size: 13px; font-weight: 600;`;
    archiveBtn.addEventListener('click', () => toggleArchiveJob(job.name, !job.archived));

    const deleteBtn = document.createElement('button');
    deleteBtn.textContent = 'Delete';
    deleteBtn.style.cssText = 'background: #c62828; color: #fff; border: none; border-radius: 4px; padding: 6px 12px; cursor: pointer; font-size: 13px; font-weight: 600;';

    // Prevent deletion of General job
    if (job.name === 'General') {
      deleteBtn.disabled = true;
      deleteBtn.style.opacity = '0.3';
      deleteBtn.style.cursor = 'not-allowed';
      deleteBtn.title = 'Cannot delete General job';
    } else {
      deleteBtn.addEventListener('click', () => deleteJob(job.name));
    }

    actionCell.appendChild(viewBtn);
    actionCell.appendChild(archiveBtn);
    actionCell.appendChild(deleteBtn);

    row.appendChild(codeCell);
    row.appendChild(nameCell);
    row.appendChild(actionCell);
    jobsTableBody.appendChild(row);
  });
}

async function updateJobCode(jobName, code) {
  try {
    const response = await fetch(`/api/jobs/${encodeURIComponent(jobName)}/code`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code: code.trim() })
    });

    if (response.ok) {
      // Update local cache
      const job = jobsData.find(j => j.name === jobName);
      if (job) {
        job.code = code.trim();
      }
      // Reload jobs to update UI tabs
      await loadJobs();
      console.log(`Updated job code for ${jobName}: ${code}`);
    } else {
      const data = await response.json();
      alert('Failed to update job code: ' + (data.error || 'Unknown error'));
    }
  } catch (err) {
    console.error('Error updating job code:', err);
    alert('Failed to update job code');
  }
}

async function updateJobName(oldName, newName) {
  const trimmedName = newName.trim();

  // Validate new name
  if (!trimmedName) {
    alert('Job name cannot be empty');
    populateJobsTable(); // Reset table
    return;
  }

  if (trimmedName === oldName) {
    return; // No change
  }

  // Check if new name already exists
  if (jobsData.some(j => j.name === trimmedName && j.name !== oldName)) {
    alert('A job with that name already exists');
    populateJobsTable(); // Reset table
    return;
  }

  try {
    const response = await fetch(`/api/jobs/${encodeURIComponent(oldName)}/rename`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ newName: trimmedName })
    });

    if (response.ok) {
      // Update local cache
      const job = jobsData.find(j => j.name === oldName);
      if (job) {
        job.name = trimmedName;
      }

      // If we're currently viewing this job, update currentJobId
      if (currentJobId === oldName) {
        currentJobId = trimmedName;
      }

      // Reload jobs to update UI
      await loadJobs();
      populateJobsTable();
      console.log(`Renamed job from ${oldName} to ${trimmedName}`);
    } else {
      const data = await response.json();
      alert('Failed to rename job: ' + (data.error || 'Unknown error'));
      populateJobsTable(); // Reset table
    }
  } catch (err) {
    console.error('Error renaming job:', err);
    alert('Failed to rename job');
    populateJobsTable(); // Reset table
  }
}

async function toggleArchiveJob(jobName, archive) {
  const action = archive ? 'archive' : 'unarchive';

  if (!confirm(`${archive ? 'Archive' : 'Unarchive'} job "${jobName}"?\n\n${archive ? 'Archived jobs will be hidden from the job tabs but data will be preserved.' : 'This will restore the job to the job tabs.'}`)) {
    return;
  }

  try {
    const response = await fetch(`/api/jobs/${encodeURIComponent(jobName)}/archive`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ archived: archive })
    });

    if (response.ok) {
      // Update local cache
      const job = jobsData.find(j => j.name === jobName);
      if (job) {
        job.archived = archive;
      }

      // If we archived the current job, switch to first non-archived job
      if (archive && currentJobId === jobName) {
        const firstActiveJob = jobsData.find(j => !j.archived);
        if (firstActiveJob) {
          await switchJob(firstActiveJob.name);
        }
      }

      // Reload jobs to update UI
      await loadJobs();
      populateJobsTable();
      console.log(`${archive ? 'Archived' : 'Unarchived'} job: ${jobName}`);
    } else {
      const data = await response.json();
      alert(`Failed to ${action} job: ` + (data.error || 'Unknown error'));
    }
  } catch (err) {
    console.error(`Error ${action}ing job:`, err);
    alert(`Failed to ${action} job`);
  }
}

async function deleteJob(jobName) {
  if (!confirm(`Delete job "${jobName}"?\n\nWARNING: This will permanently delete:\n- All messages in this job\n- All Chat-pads and individual chats\n- All Questions\n- Job code\n\nThis action cannot be undone!`)) {
    return;
  }

  // Double confirmation for safety
  const confirmation = prompt(`Type "${jobName}" to confirm deletion:`);
  if (confirmation !== jobName) {
    alert('Deletion cancelled - name did not match');
    return;
  }

  try {
    const response = await fetch(`/api/jobs/${encodeURIComponent(jobName)}`, {
      method: 'DELETE'
    });

    if (response.ok) {
      // Remove from local cache
      jobsData = jobsData.filter(j => j.name !== jobName);

      // If we deleted the current job, switch to first available job
      if (currentJobId === jobName) {
        const firstJob = jobsData.find(j => !j.archived);
        if (firstJob) {
          await switchJob(firstJob.name);
        } else {
          currentJobId = 'General';
        }
      }

      // Reload jobs to update UI
      await loadJobs();
      populateJobsTable();
      console.log(`Deleted job: ${jobName}`);
    } else {
      const data = await response.json();
      alert('Failed to delete job: ' + (data.error || 'Unknown error'));
    }
  } catch (err) {
    console.error('Error deleting job:', err);
    alert('Failed to delete job');
  }
}

// ==================== PLAYBOOK SYSTEM ====================

const playbookModal = document.getElementById('playbook-modal');
const playbookQuestionText = document.getElementById('playbook-question-text');
const playbookAnswerText = document.getElementById('playbook-answer-text');
const playbookNotesInput = document.getElementById('playbook-notes-input');
const submitPlaybookBtn = document.getElementById('submit-playbook-btn');
const cancelPlaybookBtn = document.getElementById('cancel-playbook-btn');

let currentPlaybookMessageId = null;

function openPlaybookModal(messageId, question, answer) {
  currentPlaybookMessageId = messageId;
  playbookQuestionText.textContent = question;
  playbookAnswerText.textContent = answer;
  playbookNotesInput.value = '';
  playbookModal.style.display = 'flex';
  setTimeout(() => playbookNotesInput.focus(), 100);
}

function closePlaybookModal() {
  playbookModal.style.display = 'none';
  currentPlaybookMessageId = null;
  playbookNotesInput.value = '';
}

async function submitPlaybookEntry() {
  const notes = playbookNotesInput.value.trim();

  if (!notes) {
    alert('Please add verification notes');
    return;
  }

  if (!currentPlaybookMessageId) {
    alert('No message selected');
    return;
  }

  try {
    const response = await fetch(`/api/messages/${currentPlaybookMessageId}/playbook`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        notes: notes,
        username: currentUser.username
      })
    });

    const data = await response.json();

    if (response.ok) {
      closePlaybookModal();
      // UI will update via WebSocket broadcast (playbook_entry_added)
      addSystemMessage('Message logged to Playbook');
    } else {
      alert('Failed to save to Playbook: ' + (data.error || 'Unknown error'));
    }
  } catch (err) {
    console.error('Error saving to Playbook:', err);
    alert('Failed to save to Playbook: ' + err.message);
  }
}

if (submitPlaybookBtn) submitPlaybookBtn.addEventListener('click', submitPlaybookEntry);
if (cancelPlaybookBtn) cancelPlaybookBtn.addEventListener('click', closePlaybookModal);

// Close modal on outside click
window.addEventListener('click', (e) => {
  if (e.target === playbookModal) {
    closePlaybookModal();
  }
});

// ==================== PLAYBOOK VIEW ====================

if (playbookBtn) {
  playbookBtn.addEventListener('click', openPlaybookView);
}

async function openPlaybookView() {
  // Hide Chat view elements
  messagesDiv.style.display = 'none';
  jobTabsDiv.style.display = 'none';
  subcategoryBar.style.display = 'none';
  individualChatsBar.style.display = 'none';
  document.getElementById('input-container').style.display = 'none';

  // Show Playbook view
  playbookView.style.display = 'block';

  // Load data
  await loadPlaybook();
}

async function loadPlaybook() {
  try {
    const response = await fetch('/api/playbook');
    const data = await response.json();

    if (data.entries) {
      renderPlaybook(data.entries);
    }
  } catch (err) {
    console.error('Failed to load playbook:', err);
    playbookList.innerHTML = '<div style="color: #f44; padding: 20px; text-align: center;">Failed to load Playbook</div>';
  }
}

function renderPlaybook(entries) {
  playbookCount.textContent = `${entries.length} entries`;
  playbookList.innerHTML = '';

  if (entries.length === 0) {
    playbookList.innerHTML = '<div style="color: #999; padding: 40px; text-align: center;">No entries in Playbook yet. Log solved questions from the chat to see them here.</div>';
    return;
  }

  entries.forEach(entry => {
    const card = document.createElement('div');
    card.style.backgroundColor = '#2a2a2a';
    card.style.borderRadius = '8px';
    card.style.padding = '16px';
    card.style.border = '1px solid #374045';

    // Header: Job Badge + Date
    const header = document.createElement('div');
    header.style.display = 'flex';
    header.style.justifyContent = 'space-between';
    header.style.marginBottom = '12px';

    const jobBadge = document.createElement('span');
    jobBadge.style.backgroundColor = '#fbc02d';
    jobBadge.style.color = '#000';
    jobBadge.style.padding = '2px 6px';
    jobBadge.style.borderRadius = '4px';
    jobBadge.style.fontSize = '11px';
    jobBadge.style.fontWeight = 'bold';
    jobBadge.textContent = entry.job_name || 'General';

    const date = document.createElement('span');
    date.style.color = '#8696a0';
    date.style.fontSize = '12px';
    date.textContent = new Date(entry.playbookVerifiedAt).toLocaleDateString() + ' ' + new Date(entry.playbookVerifiedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    header.appendChild(jobBadge);
    header.appendChild(date);
    card.appendChild(header);

    // Question
    const questionDiv = document.createElement('div');
    questionDiv.style.marginBottom = '12px';

    const questionLabel = document.createElement('div');
    questionLabel.style.color = '#fbc02d';
    questionLabel.style.fontSize = '11px';
    questionLabel.style.fontWeight = 'bold';
    questionLabel.style.marginBottom = '4px';
    questionLabel.textContent = 'QUESTION';
    questionDiv.appendChild(questionLabel);

    const questionText = document.createElement('div');
    questionText.style.color = '#e9edef';
    questionText.style.fontSize = '14px';
    questionText.textContent = entry.text;
    questionDiv.appendChild(questionText);
    card.appendChild(questionDiv);

    // Answer
    const answerDiv = document.createElement('div');
    answerDiv.style.marginBottom = '12px';
    answerDiv.style.padding = '8px';
    answerDiv.style.backgroundColor = 'rgba(0, 188, 212, 0.1)';
    answerDiv.style.borderLeft = '3px solid #00bcd4';
    answerDiv.style.borderRadius = '0 4px 4px 0';

    const answerLabel = document.createElement('div');
    answerLabel.style.color = '#00bcd4';
    answerLabel.style.fontSize = '11px';
    answerLabel.style.fontWeight = 'bold';
    answerLabel.style.marginBottom = '4px';
    answerLabel.textContent = `ANSWER (by ${entry.solvedBy})`;
    answerDiv.appendChild(answerLabel);

    const answerText = document.createElement('div');
    answerText.style.color = '#e9edef';
    answerText.style.fontSize = '14px';
    answerText.textContent = entry.solution;
    answerDiv.appendChild(answerText);
    card.appendChild(answerDiv);

    // Notes
    const notesDiv = document.createElement('div');
    notesDiv.style.marginTop = '12px';
    notesDiv.style.paddingTop = '12px';
    notesDiv.style.borderTop = '1px solid #374045';

    const notesLabel = document.createElement('div');
    notesLabel.style.color = '#00a884';
    notesLabel.style.fontSize = '11px';
    notesLabel.style.fontWeight = 'bold';
    notesLabel.style.marginBottom = '4px';
    notesLabel.textContent = `NOTES (Verified by ${entry.playbookVerifiedBy})`;
    notesDiv.appendChild(notesLabel);

    const notesText = document.createElement('div');
    notesText.style.color = '#bbaeae';
    notesText.style.fontSize = '13px';
    notesText.style.fontStyle = 'italic';
    notesText.textContent = entry.playbookNotes;
    notesDiv.appendChild(notesText);
    card.appendChild(notesDiv);

    playbookList.appendChild(card);
  });
}
