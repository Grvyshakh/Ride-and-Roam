// settings.js
document.addEventListener('DOMContentLoaded', function() {
  // LocalStorage keys
  const SETTINGS_KEY = 'rideRoamSettings';
  const BOOKINGS_KEY = 'rideRoamBookings';
  const TRIPS_KEY = 'rideRoamTrips';
  const PAYMENTS_KEY = 'rideRoamPayments';
  const TRANSACTIONS_KEY = 'rideRoamTransactions';

  // Default settings
  const defaultSettings = {
    theme: false,
    language: 'en',
    currency: 'usd',
    units: false, // false = km, true = miles
    shareLocation: false,
    autoMessage: false,
    locationSharing: false,
    messagePrivacy: 'everyone',
    tripReminders: true,
    bookingUpdates: true,
    priceAlerts: false,
    promotions: false,
    notificationMethod: 'push'
  };

  // Load settings
  let settings = loadSettings();

  // Load lists
  let bookings = loadList(BOOKINGS_KEY);
  let trips = loadList(TRIPS_KEY);
  let payments = loadList(PAYMENTS_KEY);
  let transactions = loadList(TRANSACTIONS_KEY);

  // Initialize UI
  initUI();

  // --- Reliable Navigation and Account Actions ---
  // Place at end to ensure DOM is ready and no duplicate listeners
  setTimeout(() => {
    try {
      const editProfileBtn = document.getElementById('edit-profile-btn');
      const changePasswordBtn = document.getElementById('change-password-btn');
      const deleteAccountBtn = document.getElementById('delete-account-btn');
      const backBtn = document.getElementById('back-btn');

      if (editProfileBtn) {
        editProfileBtn.onclick = function(e) {
          e.preventDefault();
          console.log('Edit Profile button clicked');
          window.location.href = 'edit-profile.html';
        };
      }
      if (changePasswordBtn) {
        changePasswordBtn.onclick = function(e) {
          e.preventDefault();
          console.log('Change Password button clicked');
          window.location.href = 'change-password.html';
        };
      }
      if (backBtn) {
        backBtn.onclick = function(e) {
          e.preventDefault();
          console.log('Back to Dashboard button clicked');
          window.location.href = 'dashboard.html';
        };
      }
      if (deleteAccountBtn) {
        deleteAccountBtn.onclick = async function(e) {
          e.preventDefault();
          console.log('Delete Account button clicked');
          if (!confirm('Are you sure you want to delete your account? This action cannot be undone.')) return;
          try {
            if (window.firebase && firebase.auth) {
              const user = firebase.auth().currentUser;
              if (user) {
                await user.delete();
                console.log('User deleted from Firebase Auth.');
              } else {
                console.error('No user is currently logged in.');
                alert('No user is currently logged in.');
                return;
              }
            } else {
              // If not using Firebase, add backend deletion logic here
              console.warn('Firebase not available. Implement backend deletion logic.');
            }
            window.location.href = 'index.html';
          } catch (error) {
            console.error('Error deleting account:', error);
            alert('Error deleting account: ' + (error.message || error));
          }
        };
      }
    } catch (err) {
      console.error('Error setting up navigation/account actions:', err);
    }
  }, 0);

  // Removed duplicate/legacy event listeners and modal code to prevent conflicts.
        <button class="btn" id="cancel-delete">Cancel</button>
      </div>
    `;
    document.body.appendChild(modal);
    document.getElementById('confirm-delete').addEventListener('click', function() {
      document.body.removeChild(modal);
      localStorage.clear();
      sessionStorage.clear();
      window.location.href = 'index.html';
    });
    document.getElementById('cancel-delete').addEventListener('click', function() {
      document.body.removeChild(modal);
    });
  }

  // Bookings & Trips
  document.getElementById('add-booking-btn').addEventListener('click', () => openAddModal('booking'));
  document.getElementById('add-trip-btn').addEventListener('click', () => openAddModal('trip'));
  document.getElementById('add-destination-btn').addEventListener('click', () => openAddModal('destination'));
  document.getElementById('add-hotel-btn').addEventListener('click', () => openAddModal('hotel'));

  // Payments & Billing
  document.getElementById('add-payment-method-btn').addEventListener('click', () => openAddModal('payment'));
  document.getElementById('refund-request-btn').addEventListener('click', openRefundModal);
  document.getElementById('download-invoice-btn').addEventListener('click', downloadInvoice);

  // Safety & Privacy
  document.getElementById('add-emergency-contact-btn').addEventListener('click', () => openAddModal('emergency'));
  document.getElementById('block-user-btn').addEventListener('click', () => openAddModal('block'));

  // Toggles and selects
  document.getElementById('theme-toggle').addEventListener('change', (e) => { settings.theme = e.target.checked; saveSettings(); applyTheme(); });
  document.getElementById('language-select').addEventListener('change', (e) => { settings.language = e.target.value; saveSettings(); });
  document.getElementById('currency-select').addEventListener('change', (e) => { settings.currency = e.target.value; saveSettings(); });
  document.getElementById('units-toggle').addEventListener('change', (e) => { settings.units = e.target.checked; saveSettings(); });
  document.getElementById('share-location-toggle').addEventListener('change', (e) => { settings.shareLocation = e.target.checked; saveSettings(); });
  document.getElementById('auto-message-toggle').addEventListener('change', (e) => { settings.autoMessage = e.target.checked; saveSettings(); });
  document.getElementById('location-sharing-toggle').addEventListener('change', (e) => { settings.locationSharing = e.target.checked; saveSettings(); });
  document.getElementById('message-privacy').addEventListener('change', (e) => { settings.messagePrivacy = e.target.value; saveSettings(); });
  document.getElementById('trip-reminders-toggle').addEventListener('change', (e) => { settings.tripReminders = e.target.checked; saveSettings(); });
  document.getElementById('booking-updates-toggle').addEventListener('change', (e) => { settings.bookingUpdates = e.target.checked; saveSettings(); });
  document.getElementById('price-alerts-toggle').addEventListener('change', (e) => { settings.priceAlerts = e.target.checked; saveSettings(); });
  document.getElementById('promotions-toggle').addEventListener('change', (e) => { settings.promotions = e.target.checked; saveSettings(); });
  document.getElementById('notification-method').addEventListener('change', (e) => { settings.notificationMethod = e.target.value; saveSettings(); });

  // Support & Legal
  document.getElementById('contact-support-btn').addEventListener('click', openContactSupportModal);
  document.getElementById('report-issue-btn').addEventListener('click', openReportIssueModal);
  document.getElementById('terms-privacy-btn').addEventListener('click', openTermsPrivacyModal);
  document.getElementById('about-btn').addEventListener('click', openAboutModal);

  // Modal close
  document.querySelector('.close').addEventListener('click', closeModal);
  window.addEventListener('click', (e) => { if (e.target === document.getElementById('modal')) closeModal(); });

  // Functions
  function loadSettings() {
    try {
      const stored = localStorage.getItem(SETTINGS_KEY);
      return stored ? { ...defaultSettings, ...JSON.parse(stored) } : { ...defaultSettings };
    } catch (e) {
      return { ...defaultSettings };
    }
  }

  function saveSettings() {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  }

  function loadList(key) {
    try {
      const stored = localStorage.getItem(key);
      return stored ? JSON.parse(stored) : [];
    } catch (e) {
      return [];
    }
  }

  function saveList(key, list) {
    localStorage.setItem(key, JSON.stringify(list));
  }

  function initUI() {
    // Set toggles and selects
    document.getElementById('theme-toggle').checked = settings.theme;
    document.getElementById('language-select').value = settings.language;
    document.getElementById('currency-select').value = settings.currency;
    document.getElementById('units-toggle').checked = settings.units;
    document.getElementById('share-location-toggle').checked = settings.shareLocation;
    document.getElementById('auto-message-toggle').checked = settings.autoMessage;
    document.getElementById('location-sharing-toggle').checked = settings.locationSharing;
    document.getElementById('message-privacy').value = settings.messagePrivacy;
    document.getElementById('trip-reminders-toggle').checked = settings.tripReminders;
    document.getElementById('booking-updates-toggle').checked = settings.bookingUpdates;
    document.getElementById('price-alerts-toggle').checked = settings.priceAlerts;
    document.getElementById('promotions-toggle').checked = settings.promotions;
    document.getElementById('notification-method').value = settings.notificationMethod;

    applyTheme();
    renderLists();
    renderTransactions();
    initFAQ();
  }

  function applyTheme() {
    document.body.classList.toggle('dark', settings.theme);
  }

  function renderLists() {
    renderList('bookings-list', bookings, BOOKINGS_KEY);
    renderList('trips-list', trips, TRIPS_KEY);
    renderList('destinations-list', settings.savedDestinations || [], 'savedDestinations');
    renderList('hotels-list', settings.savedHotels || [], 'savedHotels');
    renderList('payment-methods-list', payments, PAYMENTS_KEY);
    renderList('emergency-contacts-list', settings.emergencyContacts || [], 'emergencyContacts');
    renderList('blocked-users-list', settings.blockedUsers || [], 'blockedUsers');
  }

  function renderList(containerId, list, key) {
    const container = document.getElementById(containerId);
    container.innerHTML = '';
    list.forEach((item, index) => {
      const div = document.createElement('div');
      div.textContent = typeof item === 'string' ? item : item.name || item;
      const removeBtn = document.createElement('button');
      removeBtn.textContent = 'Remove';
      removeBtn.className = 'btn danger';
      removeBtn.addEventListener('click', () => {
        list.splice(index, 1);
        if (key === 'savedDestinations' || key === 'savedHotels' || key === 'emergencyContacts' || key === 'blockedUsers') {
          settings[key] = list;
          saveSettings();
        } else {
          saveList(key, list);
        }
        renderLists();
      });
      div.appendChild(removeBtn);
      container.appendChild(div);
    });
  }

  function renderTransactions() {
    const container = document.getElementById('transaction-history');
    container.innerHTML = '';
    transactions.forEach((tx, index) => {
      const div = document.createElement('div');
      div.textContent = `${tx.date}: ${tx.amount} - ${tx.description}`;
      const downloadBtn = document.createElement('button');
      downloadBtn.textContent = 'Download Invoice';
      downloadBtn.className = 'btn';
      downloadBtn.addEventListener('click', () => downloadInvoiceForTx(tx));
      div.appendChild(downloadBtn);
      container.appendChild(div);
    });
    // Populate invoice select
    const select = document.getElementById('invoice-select');
    select.innerHTML = '';
    transactions.forEach((tx, index) => {
      const option = document.createElement('option');
      option.value = index;
      option.textContent = `${tx.date}: ${tx.amount}`;
      select.appendChild(option);
    });
  }

  function initFAQ() {
    const faqData = [
      { question: 'How to book a trip?', answer: 'Go to the trips page and select a trip.' },
      { question: 'How to cancel a booking?', answer: 'Contact support or use the refund request.' }
    ];
    const accordion = document.getElementById('faq-accordion');
    faqData.forEach(item => {
      const itemDiv = document.createElement('div');
      itemDiv.className = 'accordion-item';
      const header = document.createElement('div');
      header.className = 'accordion-header';
      header.textContent = item.question;
      header.addEventListener('click', () => {
        const content = itemDiv.querySelector('.accordion-content');
        content.style.display = content.style.display === 'block' ? 'none' : 'block';
      });
      const content = document.createElement('div');
      content.className = 'accordion-content';
      content.textContent = item.answer;
      itemDiv.appendChild(header);
      itemDiv.appendChild(content);
      accordion.appendChild(itemDiv);
    });
  }

  function openModal(title, content) {
    document.getElementById('modal-body').innerHTML = `<h2>${title}</h2>${content}`;
    document.getElementById('modal').style.display = 'block';
  }

  function closeModal() {
    document.getElementById('modal').style.display = 'none';
  }

  function showToast(message) {
    const toast = document.getElementById('toast');
    toast.textContent = message;
    toast.className = 'toast show';
    setTimeout(() => { toast.className = toast.className.replace('show', ''); }, 3000);
  }

  function openAddModal(type) {
    let fields = '';
    let title = '';
    switch (type) {
      case 'booking':
        title = 'Add Booking';
        fields = '<label>Booking Details: <input type="text" id="add-input" required></label>';
        break;
      case 'trip':
        title = 'Add Trip';
        fields = '<label>Trip Details: <input type="text" id="add-input" required></label>';
        break;
      case 'destination':
        title = 'Add Destination';
        fields = '<label>Destination: <input type="text" id="add-input" required></label>';
        break;
      case 'hotel':
        title = 'Add Hotel/Route';
        fields = '<label>Hotel/Route: <input type="text" id="add-input" required></label>';
        break;
      case 'payment':
        title = 'Add Payment Method';
        fields = '<label>Card Number (last 4): <input type="text" id="add-input" required></label>';
        break;
      case 'emergency':
        title = 'Add Emergency Contact';
        fields = '<label>Contact: <input type="text" id="add-input" required></label>';
        break;
      case 'block':
        title = 'Block User';
        fields = '<label>User: <input type="text" id="add-input" required></label>';
        break;
    }
    const content = `
      <form id="add-form">
        ${fields}
        <button type="submit" class="btn">Add</button>
        <button type="button" class="btn" onclick="closeModal()">Cancel</button>
      </form>
    `;
    openModal(title, content);
    document.getElementById('add-form').addEventListener('submit', (e) => {
      e.preventDefault();
      const value = document.getElementById('add-input').value;
      switch (type) {
        case 'booking':
          bookings.push(value);
          saveList(BOOKINGS_KEY, bookings);
          break;
        case 'trip':
          trips.push(value);
          saveList(TRIPS_KEY, trips);
          break;
        case 'destination':
          if (!settings.savedDestinations) settings.savedDestinations = [];
          settings.savedDestinations.push(value);
          saveSettings();
          break;
        case 'hotel':
          if (!settings.savedHotels) settings.savedHotels = [];
          settings.savedHotels.push(value);
          saveSettings();
          break;
        case 'payment':
          payments.push(value);
          saveList(PAYMENTS_KEY, payments);
          break;
        case 'emergency':
          if (!settings.emergencyContacts) settings.emergencyContacts = [];
          settings.emergencyContacts.push(value);
          saveSettings();
          break;
        case 'block':
          if (!settings.blockedUsers) settings.blockedUsers = [];
          settings.blockedUsers.push(value);
          saveSettings();
          break;
      }
      renderLists();
      closeModal();
      showToast(`${title} added`);
    });
  }

  function openRefundModal() {
    const content = `
      <form id="refund-form">
        <label>Reason: <textarea id="refund-reason" required></textarea></label>
        <button type="submit" class="btn">Submit Request</button>
        <button type="button" class="btn" onclick="closeModal()">Cancel</button>
      </form>
    `;
    openModal('Refund/Cancellation Request', content);
    document.getElementById('refund-form').addEventListener('submit', (e) => {
      e.preventDefault();
      const reason = document.getElementById('refund-reason').value;
      // Store locally
      if (!settings.refundRequests) settings.refundRequests = [];
      settings.refundRequests.push({ reason, date: new Date().toISOString() });
      saveSettings();
      closeModal();
      showToast('Refund request submitted');
    });
  }

  function downloadInvoice() {
    const index = document.getElementById('invoice-select').value;
    if (index !== '') {
      downloadInvoiceForTx(transactions[index]);
    }
  }

  function downloadInvoiceForTx(tx) {
    const invoice = `
      Invoice
      Date: ${tx.date}
      Amount: ${tx.amount}
      Description: ${tx.description}
    `;
    const blob = new Blob([invoice], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `invoice-${tx.date}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function openContactSupportModal() {
    const content = `
      <form id="contact-form">
        <label>Message: <textarea id="contact-message" required></textarea></label>
        <button type="submit" class="btn">Send</button>
        <button type="button" class="btn" onclick="closeModal()">Cancel</button>
      </form>
    `;
    openModal('Contact Support', content);
    document.getElementById('contact-form').addEventListener('submit', (e) => {
      e.preventDefault();
      const message = document.getElementById('contact-message').value;
      if (!settings.supportMessages) settings.supportMessages = [];
      settings.supportMessages.push({ message, date: new Date().toISOString() });
      saveSettings();
      closeModal();
      showToast('Message sent');
    });
  }

  function openReportIssueModal() {
    const content = `
      <form id="report-form">
        <label>Issue: <textarea id="report-issue" required></textarea></label>
        <button type="submit" class="btn">Report</button>
        <button type="button" class="btn" onclick="closeModal()">Cancel</button>
      </form>
    `;
    openModal('Report Issue', content);
    document.getElementById('report-form').addEventListener('submit', (e) => {
      e.preventDefault();
      const issue = document.getElementById('report-issue').value;
      if (!settings.reportedIssues) settings.reportedIssues = [];
      settings.reportedIssues.push({ issue, date: new Date().toISOString() });
      saveSettings();
      closeModal();
      showToast('Issue reported');
    });
  }

  function openTermsPrivacyModal() {
    const content = '<p>Terms and Privacy Policy content here.</p>';
    openModal('Terms & Privacy', content);
  }

  function openAboutModal() {
    const content = '<p>About Ride & Roam: A travel app.</p>';
    openModal('About', content);
  }
});