// group.js
// Frontend-only group chat for Ride & Roam
(function(){
  // --- Helpers ---
  function qs(name) {
    const m = location.search.match(new RegExp('[?&]'+name+'=([^&]+)'));
    return m ? decodeURIComponent(m[1]) : null;
  }
  function now() {
    return new Date().toISOString();
  }
  function formatTime(ts) {
    const d = new Date(ts);
    return d.toLocaleString([], { dateStyle: 'short', timeStyle: 'short' });
  }
  // --- State ---
  const code = qs('code');
  if(!code) { alert('Missing group code!'); location.href = 'trips.html'; return; }
  // Try to get username from storage (creator or joiner)
  let username = localStorage.getItem('rnr_group_username_'+code) || 'Rider';
  document.getElementById('current-username').textContent = username;
  document.getElementById('group-code').textContent = code;
  // Try to get trip name
  let trips = JSON.parse(localStorage.getItem('rnr_trips')||'[]');
  let trip = trips.find(t => t.code === code);
  document.getElementById('group-title').textContent = trip && trip.place ? trip.place : 'Ride Group';
  // --- Members ---
  let members = JSON.parse(localStorage.getItem('members_'+code)||'[]');
  if(members.length === 0 && trip && trip.creator) members = [trip.creator];
  if(members.length === 0) members = [username];
  // Ensure current user is in members
  if(!members.includes(username)) members.push(username);
  localStorage.setItem('members_'+code, JSON.stringify(members));
  // Render members
  const membersList = document.getElementById('members-list');
  membersList.innerHTML = '';
  members.forEach(m => {
    const li = document.createElement('li');
    li.textContent = m;
    membersList.appendChild(li);
  });
  // --- Chat ---
  let chatKey = 'chat_'+code;
  let messages = JSON.parse(localStorage.getItem(chatKey)||'[]');
  const chatMessages = document.getElementById('chat-messages');
  function renderMessages() {
    chatMessages.innerHTML = '';
    messages.forEach(msg => {
      const div = document.createElement('div');
      div.className = 'chat-bubble'+(msg.sender===username?' me':'');
      div.innerHTML = `<div class='sender'>${msg.sender}</div>` +
        (msg.text ? `<div>${msg.text}</div>` : '') +
        (msg.image ? `<img src='${msg.image}' alt='attachment' />` : '') +
        `<span class='timestamp'>${formatTime(msg.time)}</span>`;
      chatMessages.appendChild(div);
    });
    chatMessages.scrollTop = chatMessages.scrollHeight;
  }
  renderMessages();
  // --- Send message ---
  const chatForm = document.getElementById('chat-form');
  const chatInput = document.getElementById('chat-input');
  const chatAttach = document.getElementById('chat-attach');
  let attachedImage = null;
  chatAttach.addEventListener('change', function(e){
    const file = e.target.files[0];
    if(file && file.type.startsWith('image/')){
      const reader = new FileReader();
      reader.onload = function(ev){ attachedImage = ev.target.result; };
      reader.readAsDataURL(file);
    }
  });
  chatForm.onsubmit = function(e){
    e.preventDefault();
    const text = chatInput.value.trim();
    if(!text && !attachedImage) return;
    const msg = { sender: username, text, image: attachedImage, time: now() };
    messages.push(msg);
    localStorage.setItem(chatKey, JSON.stringify(messages));
    renderMessages();
    chatInput.value = '';
    attachedImage = null;
    chatAttach.value = '';
  };
  // --- Poll for new messages/members (simulate sync) ---
  setInterval(function(){
    let newMessages = JSON.parse(localStorage.getItem(chatKey)||'[]');
    if(newMessages.length !== messages.length) {
      messages = newMessages;
      renderMessages();
    }
    let newMembers = JSON.parse(localStorage.getItem('members_'+code)||'[]');
    if(newMembers.length !== members.length) {
      members = newMembers;
      membersList.innerHTML = '';
      members.forEach(m => {
        const li = document.createElement('li');
        li.textContent = m;
        membersList.appendChild(li);
      });
    }
  }, 1200);
})();
