// DOM elements
const loginModal = document.getElementById('login-modal');
const chatApp = document.getElementById('chat-app');
const usernameInput = document.getElementById('username-input');
const loginBtn = document.getElementById('login-btn');
const messagesDiv = document.getElementById('messages');
const messageInput = document.getElementById('message-input');
const sendBtn = document.getElementById('send-btn');
const usernameDisplay = document.getElementById('username-display');
const clearBtn = document.getElementById('clear-btn');
const deleteChatBtn = document.getElementById('delete-chat-btn');
const jobTabsDiv = document.getElementById('job-tabs');
const createJobModal = document.getElementById('create-job-modal');
const jobNameInput = document.getElementById('job-name-input');
const createJobBtn = document.getElementById('create-job-btn');
const cancelJobBtn = document.getElementById('cancel-job-btn');
const subcategoryBar = document.getElementById('subcategory-bar');
const subcategoryTabsDiv = document.getElementById('subcategory-tabs');
const individualChatsBar = document.getElementById('individual-chats-bar');
const individualChatsDiv = document.getElementById('individual-chats');
const createChatModal = document.getElementById('create-chat-modal');
const chatNameInput = document.getElementById('chat-name-input');
const createChatBtn = document.getElementById('create-chat-btn');
const cancelChatBtn = document.getElementById('cancel-chat-btn');

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

let ws = null;
let currentUser = null;
let isAuthenticated = false;
let jobs = [];
let currentJobId = 'General';
let currentSubcategory = 'Seeking Solution'; // 'Seeking Solution' or 'Factory Order'
let jobSubcategories = {}; // Track which jobs have Factory Order subcategory
let currentIndividualChat = null; // Track current individual chat ID
let individualChats = {}; // Cache of individual chats per job
let currentProblems = []; // Cache of problems for current context
let currentProblemId = null; // Track problem being solved

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
    ws = new WebSocket(`ws://${window.location.hostname}:3000`);
    
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
            // Only display if message is for current job and subcategory
            if (data.job_id === currentJobId) {
                const messageSubcat = data.subcategory || 'General';
                const messageChatId = data.individual_chat_id || null;
                
                // Check if message matches current filters
                const subcategoryMatch = currentSubcategory === 'General' || messageSubcat === currentSubcategory;
                const chatMatch = currentIndividualChat === null || messageChatId === currentIndividualChat;
                
                if (subcategoryMatch && chatMatch) {
                    const isSent = data.username === currentUser.username;
                    displayMessage(data.text, data.timestamp, isSent ? 'sent' : 'received', data.username, messageSubcat);
                }
            }
        } else if (data.type === 'subcategory_created') {
            // Refresh subcategories when someone creates Factory Order
            if (data.job_id === currentJobId) {
                loadSubcategories(currentJobId);
            }
        } else if (data.type === 'individual_chat_created') {
            // Refresh individual chats when someone creates a new one
            if (data.job_id === currentJobId && currentSubcategory === 'Factory Order') {
                loadIndividualChats(currentJobId);
            }
        } else if (data.type === 'individual_chat_deleted') {
            // Refresh individual chats when someone deletes one
            if (data.job_id === currentJobId && currentSubcategory === 'Factory Order') {
                // If currently viewing deleted chat, switch to "All"
                if (currentIndividualChat === data.chatId) {
                    switchIndividualChat(null);
                } else {
                    loadIndividualChats(currentJobId);
                }
            }
        } else if (data.type === 'factory_order_deleted') {
            // Factory Order was deleted - switch to Seeking Solution
            if (data.jobId === currentJobId) {
                jobSubcategories[currentJobId] = false;
                individualChats[currentJobId] = [];
                switchSubcategory('Seeking Solution');
                loadSubcategories(currentJobId);
            }
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
            // Problem solved - show reflex popup and reload
            if (data.reflex) {
                showReflexPopup(data.data);
            }
            if (data.data.job_id === currentJobId) {
                loadProblems();
            }
        } else if (data.type === 'problem_deleted') {
            // Problem deleted - reload if in same context
            if (data.context.job_id === currentJobId) {
                loadProblems();
            }
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
        jobs = data.jobs;
        
        // Create job tabs
        jobTabsDiv.innerHTML = '';
        
        // Add + button first
        const addBtn = document.createElement('button');
        addBtn.id = 'add-job-btn';
        addBtn.textContent = '+';
        addBtn.title = 'Create new job';
        addBtn.addEventListener('click', openCreateJobModal);
        jobTabsDiv.appendChild(addBtn);
        
        // Add job tabs
        jobs.forEach(job => {
            const tab = document.createElement('button');
            tab.className = 'job-tab';
            tab.textContent = job;
            tab.dataset.jobId = job;
            
            if (job === currentJobId) {
                tab.classList.add('active');
            }
            
            tab.addEventListener('click', () => switchJob(job));
            jobTabsDiv.appendChild(tab);
        });
        
        // Load chat history for default job
        loadChatHistory();
    } catch (err) {
        console.error('Failed to load jobs:', err);
        addSystemMessage('Failed to load job list');
    }
}

// Switch to a different job
function switchJob(jobId) {
    currentJobId = jobId;
    currentSubcategory = 'Seeking Solution';
    currentIndividualChat = null;
    
    // Update active tab
    document.querySelectorAll('.job-tab').forEach(tab => {
        if (tab.dataset.jobId === jobId) {
            tab.classList.add('active');
        } else {
            tab.classList.remove('active');
        }
    });
    
    // Load subcategories for this job
    loadSubcategories(jobId);
    
    // Hide individual chats bar
    individualChatsBar.style.display = 'none';
    
    // Clear and reload messages
    messagesDiv.innerHTML = '';
    loadChatHistory();
}

// Load chat history
async function loadChatHistory() {
    try {
        console.log('Fetching messages from /api/messages for job:', currentJobId);
        const response = await fetch(`/api/messages?job_id=${encodeURIComponent(currentJobId)}`);
        console.log('Response status:', response.status);
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const data = await response.json();
        console.log('Received data:', data);
        console.log('Loading chat history:', data.messages.length, 'messages');
        
        let displayedCount = 0;
        data.messages.forEach(msg => {
            const messageSubcat = msg.subcategory || 'Seeking Solution';
            const messageChatId = msg.individual_chat_id || null;
            
            // Check if this is a "Seeking Solution" message (problem)
            const isProblemMessage = msg.text && msg.text.startsWith('🔴 Seeking Solution:');
            
            // Problems ALWAYS appear in Seeking Solution "All" view, regardless of where created
            const showInGeneralAll = currentSubcategory === 'Seeking Solution' && currentIndividualChat === null;
            
            if (isProblemMessage) {
                // Show in General All view OR in the specific chat/subcategory where it was created
                const showInOriginalLocation = 
                    (messageSubcat === currentSubcategory || currentSubcategory === 'General') &&
                    (messageChatId === currentIndividualChat || currentIndividualChat === null);
                
                if (showInGeneralAll || showInOriginalLocation) {
                    const isSent = msg.username === currentUser.username;
                    displayMessage(msg.text, msg.timestamp, isSent ? 'sent' : 'received', msg.username, messageSubcat);
                    displayedCount++;
                }
            } else {
                // Regular messages: normal filtering
                const subcategoryMatch = currentSubcategory === 'Seeking Solution' || messageSubcat === currentSubcategory;
                const chatMatch = currentIndividualChat === null || messageChatId === currentIndividualChat;
                
                if (subcategoryMatch && chatMatch) {
                    const isSent = msg.username === currentUser.username;
                    displayMessage(msg.text, msg.timestamp, isSent ? 'sent' : 'received', msg.username, messageSubcat);
                    displayedCount++;
                }
            }
        });
        
        if (displayedCount === 0) {
            addSystemMessage(`No messages in ${currentJobId} - ${currentSubcategory}`);
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

// Delete Factory Order (when in Factory Order view)
deleteChatBtn.addEventListener('click', async () => {
    if (currentSubcategory !== 'Factory Order') return;
    
    if (!confirm(`Delete entire Factory Order for "${currentJobId}"?\n\nThis will permanently delete:\n- All individual chats (FO-12345, FO-67890, etc.)\n- All messages in Factory Order\n\nThis cannot be undone.`)) {
        return;
    }
    
    try {
        const response = await fetch(`/api/jobs/${encodeURIComponent(currentJobId)}/subcategories`, {
            method: 'DELETE'
        });
        
        const data = await response.json();
        
        if (response.ok && data.success) {
            console.log(`Factory Order deleted: ${data.deletedMessages} messages removed`);
            // WebSocket will handle the UI update
        } else {
            alert('Failed to delete Factory Order: ' + (data.error || 'Unknown error'));
        }
    } catch (err) {
        console.error('Error deleting Factory Order:', err);
        alert('Failed to delete Factory Order: ' + err.message);
    }
});

// Clear chat for current user
clearBtn.addEventListener('click', async () => {
    const context = currentIndividualChat 
        ? `chat "${individualChats[currentJobId]?.find(c => c.id === currentIndividualChat)?.name}"` 
        : `${currentSubcategory} in ${currentJobId}`;
    
    if (confirm(`Clear all YOUR messages in ${context}?\n\nThis will permanently delete your messages from the database.`)) {
        try {
            const params = new URLSearchParams({
                username: currentUser.username,
                job_id: currentJobId,
                subcategory: currentSubcategory
            });
            
            if (currentIndividualChat) {
                params.append('chat_id', currentIndividualChat);
            }
            
            const response = await fetch(`/api/messages?${params.toString()}`, {
                method: 'DELETE'
            });
            
            const data = await response.json();
            
            if (response.ok && data.success) {
                messagesDiv.innerHTML = '';
                addSystemMessage(`Cleared ${data.deletedCount} message(s)`);
                // Reload to show remaining messages from others
                setTimeout(() => loadChatHistory(), 500);
            } else {
                alert('Failed to clear messages: ' + (data.error || 'Unknown error'));
            }
        } catch (err) {
            console.error('Error clearing messages:', err);
            alert('Failed to clear messages: ' + err.message);
        }
    }
});

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
    
    // Always show "Seeking Solution" tab first (for general discussion)
    const generalTab = document.createElement('button');
    generalTab.className = 'subcategory-tab' + (currentSubcategory === 'Seeking Solution' ? ' active' : '');
    generalTab.textContent = 'Seeking Solution';
    generalTab.addEventListener('click', () => switchSubcategory('Seeking Solution'));
    subcategoryTabsDiv.appendChild(generalTab);
    
    // For non-General jobs, load Factory Order option
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
        
        // Show Factory Order tab if it exists
        if (data.hasFactoryOrder) {
            jobSubcategories[jobId] = true;
            const foTab = document.createElement('button');
            foTab.className = 'subcategory-tab' + (currentSubcategory === 'Factory Order' ? ' active' : '');
            foTab.textContent = 'Factory Order';
            foTab.addEventListener('click', () => switchSubcategory('Factory Order'));
            subcategoryTabsDiv.appendChild(foTab);
        } else {
            jobSubcategories[jobId] = false;
        }
        
        // Add +FO button if Factory Order doesn't exist
        if (!data.hasFactoryOrder) {
            const addFoBtn = document.createElement('button');
            addFoBtn.id = 'add-fo-btn';
            addFoBtn.textContent = '+FO';
            addFoBtn.title = 'Add Factory Order subcategory';
            addFoBtn.addEventListener('click', () => createFactoryOrder(jobId));
            subcategoryTabsDiv.appendChild(addFoBtn);
        }
        
        // Add + Problem button (right side)
        const addProblemBtn = document.createElement('button');
        addProblemBtn.id = 'add-problem-btn';
        addProblemBtn.textContent = '+ Problem';
        addProblemBtn.title = 'Create a new problem';
        addProblemBtn.addEventListener('click', openProblemModal);
        subcategoryTabsDiv.appendChild(addProblemBtn);
        
        subcategoryBar.style.display = 'block';
    } catch (err) {
        console.error('Failed to load subcategories:', err);
        subcategoryBar.style.display = 'none';
    }
}

function switchSubcategory(subcategory) {
    currentSubcategory = subcategory;
    currentIndividualChat = null;
    
    // Update active tab
    document.querySelectorAll('.subcategory-tab').forEach(tab => {
        if (tab.textContent === subcategory) {
            tab.classList.add('active');
        } else {
            tab.classList.remove('active');
        }
    });
    
    // Load individual chats if Factory Order is selected
    if (subcategory === 'Factory Order') {
        loadIndividualChats(currentJobId);
        deleteChatBtn.style.display = 'block';
    } else {
        individualChatsBar.style.display = 'none';
        deleteChatBtn.style.display = 'none';
    }
    
    // Load problems for new context
    console.log('switchSubcategory: calling loadProblems() for', currentJobId, currentSubcategory);
    loadProblems();
    
    // Reload messages with new filter
    messagesDiv.innerHTML = '';
    loadChatHistory();
}

async function createFactoryOrder(jobId) {
    // Prompt for FO name
    const foName = prompt('Enter Factory Order name (e.g., FO-12345):');
    if (!foName || foName.trim().length === 0) return;
    
    try {
        console.log('Step 1: Creating Factory Order subcategory for', jobId);
        const response = await fetch(`/api/jobs/${encodeURIComponent(jobId)}/subcategories`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ subcategory: 'Factory Order' })
        });
        
        console.log('Subcategory response status:', response.status);
        const data = await response.json();
        console.log('Subcategory response data:', data);
        
        if (response.ok && data.success) {
            jobSubcategories[jobId] = true;
            
            // Wait a bit for the subcategory to be saved
            await new Promise(resolve => setTimeout(resolve, 100));
            
            console.log('Step 2: Creating individual chat with name:', foName.trim());
            const chatResponse = await fetch(`/api/jobs/${encodeURIComponent(jobId)}/chats`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ chatName: foName.trim() })
            });
            
            console.log('Chat response status:', chatResponse.status);
            const chatData = await chatResponse.json();
            console.log('Chat response data:', chatData);
            
            if (chatResponse.ok && chatData.success) {
                console.log('Step 3: Reloading subcategories and switching to Factory Order');
                // Reload subcategories to show Factory Order tab
                await loadSubcategories(jobId);
                // Switch to Factory Order
                switchSubcategory('Factory Order');
                addSystemMessage(`Factory Order "${foName.trim()}" created`);
            } else {
                console.error('Chat creation failed:', chatData);
                alert(chatData.error || 'Failed to create FO chat');
            }
        } else {
            console.error('Subcategory creation failed:', data);
            alert(data.error || 'Failed to create subcategory');
        }
    } catch (err) {
        console.error('Factory Order creation error:', err);
        alert('Failed to create Factory Order: ' + err.message);
    }
}

// Individual chat management
async function loadIndividualChats(jobId) {
    try {
        const response = await fetch(`/api/jobs/${encodeURIComponent(jobId)}/chats`);
        const data = await response.json();
        
        individualChatsDiv.innerHTML = '';
        
        // Add "All" tab to show all messages in current subcategory
        const allTab = document.createElement('button');
        allTab.className = 'individual-chat-tab' + (currentIndividualChat === null ? ' active' : '');
        allTab.textContent = 'All';
        allTab.title = 'Show all messages in this category';
        allTab.addEventListener('click', () => switchIndividualChat(null));
        individualChatsDiv.appendChild(allTab);
        
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
        
        // Add + button to create new chat
        const addChatBtn = document.createElement('button');
        addChatBtn.id = 'add-chat-btn';
        addChatBtn.textContent = '+ Chat';
        addChatBtn.title = 'Create new individual chat';
        addChatBtn.addEventListener('click', openCreateChatModal);
        individualChatsDiv.appendChild(addChatBtn);
        
        individualChatsBar.style.display = 'block';
    } catch (err) {
        console.error('Failed to load individual chats:', err);
        individualChatsBar.style.display = 'none';
    }
}

async function deleteIndividualChat(jobId, chatId, chatName) {
    if (!confirm(`Delete chat "${chatName}"?\n\nThis will also delete all messages in this chat.`)) {
        return;
    }
    
    try {
        const response = await fetch(`/api/jobs/${encodeURIComponent(jobId)}/chats/${encodeURIComponent(chatId)}`, {
            method: 'DELETE'
        });
        
        const data = await response.json();
        
        if (response.ok && data.success) {
            console.log('Chat deleted successfully');
            // WebSocket will handle the UI update
        } else {
            alert(data.error || 'Failed to delete chat');
        }
    } catch (err) {
        console.error('Error deleting chat:', err);
        alert('Failed to delete chat: ' + err.message);
    }
}

function switchIndividualChat(chatId) {
    currentIndividualChat = chatId;
    
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
    
    // Delete button always visible in Factory Order (deletes entire FO, not individual chat)
    // No change needed here
    
    // Load problems for new context
    loadProblems();
    
    // Reload messages with new filter
    messagesDiv.innerHTML = '';
    loadChatHistory();
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
            body: JSON.stringify({ chatName })
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
function displayMessage(text, timestamp, type, username = '', subcategory = 'All') {
    const messageDiv = document.createElement('div');
    messageDiv.className = `message message-${type}`;
    
    const bubble = document.createElement('div');
    bubble.className = 'message-bubble';
    
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
        
        // Add subcategory badge if it's Factory Order
        if (subcategory === 'Factory Order') {
            const badge = document.createElement('span');
            badge.style.fontSize = '7px';
            badge.style.padding = '2px 4px';
            badge.style.backgroundColor = '#ff9800';
            badge.style.color = '#111';
            badge.style.borderRadius = '3px';
            badge.style.fontWeight = '700';
            badge.textContent = 'FO';
            nameDiv.appendChild(badge);
        }
        
        bubble.appendChild(nameDiv);
    }
    
    const content = document.createElement('div');
    content.className = 'message-content';
    content.appendChild(highlightText(text));
    
    const time = document.createElement('div');
    time.className = 'message-time';
    time.textContent = formatTimestamp(timestamp);
    
    bubble.appendChild(content);
    bubble.appendChild(time);
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
    // Check if nlp library is loaded
    if (typeof nlp === 'undefined') {
        console.warn('NLP library not loaded, displaying plain text');
        const container = document.createElement('span');
        container.textContent = text;
        return container;
    }
    
    const doc = nlp(text);
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
        
        const creator = document.createElement('span');
        creator.className = 'problem-creator';
        creator.textContent = `—${problem.created_by}`;
        
        pill.appendChild(text);
        pill.appendChild(solveBtn);
        pill.appendChild(creator);
        
        problemsList.appendChild(pill);
    });
}

function openProblemModal() {
    createProblemModal.style.display = 'flex';
    problemTextInput.value = '';
    problemTextInput.focus();
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
    
    if (!ws || ws.readyState !== WebSocket.OPEN) {
        alert('Not connected to server');
        return;
    }
    
    if (!isAuthenticated) {
        return;
    }
    
    // Send as a special message with "Seeking Solution:" prefix
    const messageData = { 
        type: 'message', 
        text: `🔴 Seeking Solution: ${problemText}`,
        job_id: currentJobId
    };
    
    if (currentSubcategory !== 'General') {
        messageData.subcategory = currentSubcategory;
    }
    if (currentIndividualChat !== null) {
        messageData.individual_chat_id = currentIndividualChat;
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

function showReflexPopup(problem) {
    const reflexProblem = reflexPopup.querySelector('.reflex-problem');
    const reflexSolution = reflexPopup.querySelector('.reflex-solution');
    
    reflexProblem.innerHTML = `<strong>Problem:</strong> ${problem.problem_text}`;
    reflexSolution.innerHTML = `<strong>Solution:</strong> ${problem.solution_text}`;
    
    reflexPopup.style.display = 'flex';
    
    // Auto-dismiss after 5 seconds
    setTimeout(() => {
        reflexPopup.style.display = 'none';
    }, 5000);
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

// Click to dismiss reflex popup
reflexPopup.addEventListener('click', () => {
    reflexPopup.style.display = 'none';
});
