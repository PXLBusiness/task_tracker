let clients = [];
let timers = [];
let config = {};
let timerUpdateInterval = null;

// Modal functions
function showModal(title, message, type = 'info', confirmText = 'OK', showCancel = false) {
  return new Promise((resolve) => {
    const overlay = document.getElementById('modalOverlay');
    const titleEl = document.getElementById('modalTitle');
    const messageEl = document.getElementById('modalMessage');
    const iconEl = document.getElementById('modalIcon');
    const confirmBtn = document.getElementById('modalConfirm');
    const cancelBtn = document.getElementById('modalCancel');
    
    // Set content
    titleEl.textContent = title;
    messageEl.textContent = message;
    confirmBtn.textContent = confirmText;
    
    // Set icon based on type
    const icons = {
      success: '✓',
      error: '✕',
      warning: '⚠',
      question: '?',
      info: 'ℹ️'
    };
    iconEl.textContent = icons[type] || icons.info;
    
    // Show/hide cancel button
    if (showCancel) {
      cancelBtn.style.display = 'block';
    } else {
      cancelBtn.style.display = 'none';
    }
    
    // Show modal
    overlay.style.display = 'flex';
    
    // Handle confirm
    const handleConfirm = () => {
      overlay.style.display = 'none';
      confirmBtn.removeEventListener('click', handleConfirm);
      cancelBtn.removeEventListener('click', handleCancel);
      resolve(true);
    };
    
    // Handle cancel
    const handleCancel = () => {
      overlay.style.display = 'none';
      confirmBtn.removeEventListener('click', handleConfirm);
      cancelBtn.removeEventListener('click', handleCancel);
      resolve(false);
    };
    
    confirmBtn.addEventListener('click', handleConfirm);
    cancelBtn.addEventListener('click', handleCancel);
  });
}

// Simple UUID generator (no external dependencies needed)
function generateUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

// Initialize
async function init() {
  try {
    config = await window.api.getConfig();
    
    console.log('Loaded config:', config);
    
    // Try to refresh clients from webhook if enabled
    if (config.clients_webhook_enabled && config.clients_webhook_url) {
      try {
        console.log('Attempting to refresh clients from webhook...');
        clients = await window.api.refreshClients();
        console.log('Successfully loaded clients from webhook:', clients);
        
        // Show refresh button
        document.getElementById('refreshClientsBtn').style.display = 'flex';
      } catch (error) {
        console.warn('Failed to refresh clients from webhook, falling back to local file:', error.message);
        // Fall back to local clients.json
        clients = await window.api.getClients();
        console.log('Loaded clients from local file:', clients);
        
        // Still show refresh button so user can try manually
        document.getElementById('refreshClientsBtn').style.display = 'flex';
      }
    } else {
      // Load from local clients.json
      clients = await window.api.getClients();
      console.log('Loaded clients from local file:', clients);
    }
    
    timers = await window.api.getTimers();
    
    // Apply logo and title settings
    applyBranding();
    
    populateClientDropdowns();
    renderTimers();
    startTimerUpdates();
    
    // Set manual entry start time to now
    const now = new Date();
    now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
    document.getElementById('manualStart').value = now.toISOString().slice(0, 16);
  } catch (error) {
    console.error('Initialization error:', error);
  }
}

// Apply branding from config
function applyBranding() {
  const appTitle = document.getElementById('appTitle');
  const appLogo = document.getElementById('appLogo');
  
  console.log('Applying branding:', config);
  
  // Handle title
  if (config.use_title && config.project_title) {
    appTitle.textContent = config.project_title;
    appTitle.style.display = 'block';
  } else if (!config.use_title) {
    appTitle.style.display = 'none';
  }
  
  // Handle logo
  if (config.use_logo && config.logo_path) {
    appLogo.src = config.logo_path;
    appLogo.style.display = 'block';
    appLogo.onerror = () => {
      console.error('Failed to load logo:', config.logo_path);
      appLogo.style.display = 'none';
    };
  } else {
    appLogo.style.display = 'none';
  }
}

// Populate client dropdowns
function populateClientDropdowns() {
  const timerSelect = document.getElementById('clientSelect');
  const manualSelect = document.getElementById('manualClient');
  
  console.log('Populating dropdowns with', clients.length, 'clients');
  
  [timerSelect, manualSelect].forEach(select => {
    select.innerHTML = '<option value="">Select client...</option>';
    clients.forEach(client => {
      const option = document.createElement('option');
      option.value = client.client_id;
      option.textContent = client.client_name;
      option.dataset.clientData = JSON.stringify(client);
      select.appendChild(option);
    });
  });
}

// Update project dropdown based on selected client
function updateProjectDropdown(clientId, targetSelectId) {
  const projectSelect = document.getElementById(targetSelectId);
  projectSelect.innerHTML = '<option value="">Select project...</option>';
  
  const client = clients.find(c => c.client_id === clientId);
  if (client && client.projects) {
    client.projects.forEach(project => {
      const option = document.createElement('option');
      option.value = project.project_id;
      option.textContent = project.project_name;
      projectSelect.appendChild(option);
    });
    
    // Auto-select first project if available
    if (client.projects.length > 0) {
      projectSelect.value = client.projects[0].project_id;
    }
  }
}

// Setup event listeners - called after DOM is ready
function setupEventListeners() {
  // Close button
  document.getElementById('closeBtn').addEventListener('click', () => {
    window.api.closeWindow();
  });
  
  // Refresh clients button
  document.getElementById('refreshClientsBtn').addEventListener('click', async () => {
    const btn = document.getElementById('refreshClientsBtn');
    btn.disabled = true;
    btn.style.opacity = '0.5';
    
    try {
      console.log('Refreshing clients from webhook...');
      clients = await window.api.refreshClients();
      console.log('Received clients:', clients);
      console.log('Number of clients:', clients.length);
      
      populateClientDropdowns();
      await showModal('Success', `Loaded ${clients.length} clients successfully!`, 'success');
    } catch (error) {
      console.error('Refresh error:', error);
      await showModal('Error', `Failed to refresh clients: ${error.message}`, 'error');
    } finally {
      btn.disabled = false;
      btn.style.opacity = '1';
    }
  });

  // Mode toggle
  document.getElementById('timerModeBtn').addEventListener('click', () => {
    document.getElementById('timerModeBtn').classList.add('active');
    document.getElementById('manualModeBtn').classList.remove('active');
    document.getElementById('timerForm').style.display = 'flex';
    document.getElementById('manualForm').style.display = 'none';
  });

  document.getElementById('manualModeBtn').addEventListener('click', () => {
    document.getElementById('manualModeBtn').classList.add('active');
    document.getElementById('timerModeBtn').classList.remove('active');
    document.getElementById('manualForm').style.display = 'flex';
    document.getElementById('timerForm').style.display = 'none';
  });

  // Client selection changes
  document.getElementById('clientSelect').addEventListener('change', (e) => {
    updateProjectDropdown(e.target.value, 'projectSelect');
  });

  document.getElementById('manualClient').addEventListener('change', (e) => {
    updateProjectDropdown(e.target.value, 'manualProject');
  });

  // Timer form submit
  document.getElementById('timerForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const clientSelect = document.getElementById('clientSelect');
    const projectSelect = document.getElementById('projectSelect');
    const taskInput = document.getElementById('taskInput');
    
    const clientData = JSON.parse(clientSelect.options[clientSelect.selectedIndex].dataset.clientData);
    
    const timer = {
      id: generateUUID(),
      client_name: clientData.client_name,
      client_id: clientSelect.value,
      project_name: projectSelect.options[projectSelect.selectedIndex].text,
      project_id: projectSelect.value,
      task_name: taskInput.value,
      started_at: new Date().toISOString()
    };
    
    timers.push(timer);
    await window.api.saveTimers(timers);
    
    // Reset form
    taskInput.value = '';
    
    renderTimers();
    window.api.closeWindow();
  });

  // Manual form submit
  document.getElementById('manualForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const clientSelect = document.getElementById('manualClient');
    const projectSelect = document.getElementById('manualProject');
    const taskInput = document.getElementById('manualTask');
    const startInput = document.getElementById('manualStart');
    const durationInput = document.getElementById('manualDuration');
    const noteInput = document.getElementById('manualNote');
    
    // Parse duration HH:MM
    const [hours, minutes] = durationInput.value.split(':').map(Number);
    let durationSeconds = (hours * 3600) + (minutes * 60);
    
    // Apply rounding rules
    let durationMinutes = Math.floor(durationSeconds / 60);
    if (durationMinutes < 5) durationMinutes = 5;
    if (durationMinutes > 15) {
      durationMinutes = Math.ceil(durationMinutes / 10) * 10;
    }
    durationSeconds = durationMinutes * 60;
    
    const payload = {
      task_name: taskInput.value,
      started_at: new Date(startInput.value).toISOString(),
      duration: durationSeconds,
      note: noteInput.value,
      client_id: clientSelect.value,
      project_id: projectSelect.value,
      service_name: taskInput.value
    };
    
    try {
      await window.api.sendWebhook(payload);
      await showModal('Success', 'Entry logged successfully!', 'success');
      
      // Reset form
      taskInput.value = '';
      noteInput.value = '';
      durationInput.value = '';
      
      window.api.closeWindow();
    } catch (error) {
      await showModal('Error', error.message, 'error');
    }
  });

  // Keyboard shortcuts
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      window.api.closeWindow();
    }
  });
}

// Render active timers
function renderTimers() {
  const timersList = document.getElementById('timersList');
  
  if (timers.length === 0) {
    timersList.innerHTML = '<p class="empty-state">No active timers</p>';
    return;
  }
  
  timersList.innerHTML = timers.map(timer => {
    const elapsed = getElapsedTime(timer.started_at);
    return `
      <div class="timer-item">
        <div class="timer-info">
          <div class="timer-client">${timer.client_name}</div>
          <div class="timer-task">${timer.task_name}</div>
          <div class="timer-elapsed">${elapsed}</div>
        </div>
        <div class="timer-actions">
          <button class="timer-btn finish" data-timer-id="${timer.id}">✓</button>
          <button class="timer-btn cancel" data-timer-id="${timer.id}">✕</button>
        </div>
      </div>
    `;
  }).join('');
  
  // Attach event listeners to buttons
  timersList.querySelectorAll('.timer-btn.finish').forEach(btn => {
    btn.addEventListener('click', () => finishTimer(btn.dataset.timerId));
  });
  
  timersList.querySelectorAll('.timer-btn.cancel').forEach(btn => {
    btn.addEventListener('click', () => cancelTimer(btn.dataset.timerId));
  });
}

// Get elapsed time formatted
function getElapsedTime(startTime) {
  const elapsed = Date.now() - new Date(startTime).getTime();
  const hours = Math.floor(elapsed / 3600000);
  const minutes = Math.floor((elapsed % 3600000) / 60000);
  const seconds = Math.floor((elapsed % 60000) / 1000);
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

// Update timers every second
function startTimerUpdates() {
  if (timerUpdateInterval) clearInterval(timerUpdateInterval);
  timerUpdateInterval = setInterval(() => {
    if (timers.length > 0) {
      renderTimers();
    }
  }, 1000);
}

// Finish timer
async function finishTimer(timerId) {
  const timer = timers.find(t => t.id === timerId);
  if (!timer) return;
  
  const endTime = new Date();
  const startTime = new Date(timer.started_at);
  let durationSeconds = Math.floor((endTime - startTime) / 1000);
  
  // Apply rounding rules
  let durationMinutes = Math.floor(durationSeconds / 60);
  if (durationMinutes < 5) durationMinutes = 5;
  if (durationMinutes > 15) {
    durationMinutes = Math.ceil(durationMinutes / 10) * 10;
  }
  durationSeconds = durationMinutes * 60;
  
  const payload = {
    task_name: timer.task_name,
    started_at: timer.started_at,
    duration: durationSeconds,
    note: '',
    client_id: timer.client_id,
    project_id: timer.project_id,
    service_name: timer.task_name
  };
  
  try {
    await window.api.sendWebhook(payload);
    
    // Remove from active timers
    timers = timers.filter(t => t.id !== timerId);
    await window.api.saveTimers(timers);
    
    renderTimers();
    
    // Show success message
    const hours = Math.floor(durationMinutes / 60);
    const mins = durationMinutes % 60;
    const timeStr = hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
    await showModal('Timer Logged', `${timer.task_name} - ${timeStr} logged successfully!`, 'success');
  } catch (error) {
    await showModal('Error', `Failed to log timer: ${error.message}`, 'error');
  }
}

// Cancel timer
async function cancelTimer(timerId) {
  const timer = timers.find(t => t.id === timerId);
  if (!timer) return;
  
  const confirmed = await showModal(
    'Cancel Timer?', 
    `Are you sure you want to cancel "${timer.task_name}"?`, 
    'question',
    'Yes, Cancel',
    true
  );
  
  if (confirmed) {
    timers = timers.filter(t => t.id !== timerId);
    await window.api.saveTimers(timers);
    renderTimers();
  }
}

// Wait for DOM to be ready, then initialize
document.addEventListener('DOMContentLoaded', () => {
  setupEventListeners();
  init();
});
