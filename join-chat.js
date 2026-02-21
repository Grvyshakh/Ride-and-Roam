// join-chat.js
// Handles join chat UI, trip code display, chat logic, and navigation

// --- Trip Code Display ---
// Trip code should be passed via sessionStorage (not URL)
const tripCodeLabel = document.getElementById('tripCodeLabel');
let tripCode = sessionStorage.getItem('joinedTripCode');
if (tripCode) {
    tripCodeLabel.textContent = `Trip Code: ${tripCode}`;
} else {
    // If no trip code, redirect back to join.html
    window.location.replace('join.html');
}

// --- Back to Trips Navigation ---
document.getElementById('backToTrips').onclick = function() {
    sessionStorage.removeItem('joinedTripCode');
    window.location.replace('join.html');
};

// --- Chat Logic (Basic, replace with your backend/firebase logic) ---
const chatMessages = document.getElementById('chatMessages');
const chatForm = document.getElementById('chatForm');
const chatInput = document.getElementById('chatInput');

// --- Group-style Chat Logic (localStorage, per trip code) ---
let username = localStorage.getItem('rnr_group_username_' + tripCode) || 'Rider';
let chatKey = 'chat_' + tripCode;
let messages = JSON.parse(localStorage.getItem(chatKey) || '[]');

function renderMessages() {
    chatMessages.innerHTML = '';
    messages.forEach(msg => {
        const div = document.createElement('div');
        div.className = 'chat-bubble' + (msg.sender === username ? ' me' : '');
        div.innerHTML = `<div class='sender'>${msg.sender}</div>` +
            (msg.text ? `<div>${msg.text}</div>` : '') +
            `<span class='timestamp'>${msg.time ? new Date(msg.time).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' }) : ''}</span>`;
        chatMessages.appendChild(div);
    });
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

function loadMessages() {
    messages = JSON.parse(localStorage.getItem(chatKey) || '[]');
    renderMessages();
}

// Example: Send message (replace with real backend)

chatForm.onsubmit = function(e) {
    e.preventDefault();
    const text = chatInput.value.trim();
    if (!text) return;
    const msg = { sender: username, text, time: new Date().toISOString() };
    messages.push(msg);
    localStorage.setItem(chatKey, JSON.stringify(messages));
    renderMessages();
    chatInput.value = '';
};

// Poll for new messages (simulate sync)
setInterval(function() {
    let newMessages = JSON.parse(localStorage.getItem(chatKey) || '[]');
    if (newMessages.length !== messages.length) {
        messages = newMessages;
        renderMessages();
    }
}, 1200);

// On load
loadMessages();
