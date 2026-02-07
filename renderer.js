let clients = [];
let timers = [];
let config = {};
let timerUpdateInterval = null;
let recentProjects = [];
let recentHotkeys = {};
const submittingTimers = new Set();

let lastUserActivity = Date.now();
let idleInterval = null;
let idleModalOpen = false;

function registerIdleListeners() {
  const activityEvents = [
    "mousemove",
    "mousedown",
    "keydown",
    "wheel",
    "touchstart",
  ];

  activityEvents.forEach((event) => {
    document.addEventListener(event, () => {
      lastUserActivity = Date.now();
    });
  });
}

function recordUserActivity(source) {
  lastUserActivity = Date.now();
  console.log("[IDLE] activity detected:", source);
}

// Modal functions
function showModal(
  title,
  message,
  type = "info",
  confirmText = "OK",
  showCancel = false,
  showIgnore = false,
) {
  return new Promise((resolve) => {
    const overlay = document.getElementById("modalOverlay");
    const titleEl = document.getElementById("modalTitle");
    const messageEl = document.getElementById("modalMessage");
    const iconEl = document.getElementById("modalIcon");
    const confirmBtn = document.getElementById("modalConfirm");
    const cancelBtn = document.getElementById("modalCancel");
    const ignoreBtn = document.getElementById("modalIgnore");

    // Set content
    titleEl.textContent = title;
    messageEl.textContent = message;
    confirmBtn.textContent = confirmText;

    // Set icon based on type
    const icons = {
      success: "✓",
      error: "✕",
      warning: "⚠",
      question: "?",
      info: "ℹ️",
    };
    iconEl.textContent = icons[type] || icons.info;

    cancelBtn.style.display = showCancel ? "block" : "none";
    ignoreBtn.style.display = showIgnore ? "block" : "none";

    // Show modal
    overlay.style.display = "flex";

    setTimeout(() => {
      confirmBtn.focus();
    }, 0);

    const cleanup = () => {
      document.removeEventListener("keydown", handleKeydown);
      confirmBtn.removeEventListener("click", handleConfirm);
      cancelBtn.removeEventListener("click", handleCancel);
      ignoreBtn.removeEventListener("click", handleIgnore);
    };

    // Handle confirm
    const handleConfirm = () => {
      overlay.style.display = "none";
      cleanup();
      resolve(true);
    };

    // Handle cancel
    const handleCancel = () => {
      overlay.style.display = "none";
      cleanup();
      resolve(false);
    };

    // Handle ignore
    const handleIgnore = () => {
      overlay.style.display = "none";
      cleanup();
      resolve("ignore");
    };

    confirmBtn.addEventListener("click", handleConfirm);
    cancelBtn.addEventListener("click", handleCancel);
    ignoreBtn.addEventListener("click", handleIgnore);

    function handleKeydown(e) {
      if (e.code === "Space" || e.code === "Enter") {
        e.preventDefault();
        handleConfirm();
      }
      if (e.code === "Escape") {
        e.preventDefault();
        handleCancel();
      }
    }

    document.addEventListener("keydown", handleKeydown);
  });
}

//Client field focus helper
function focusClientSelect() {
  const clientSelect = document.getElementById("clientSelect");
  if (clientSelect) {
    clientSelect.focus();
    clientSelect.click();
  }
}

//Client focus mode helper
function switchMode(mode) {
  const timerBtn = document.getElementById("timerModeBtn");
  const manualBtn = document.getElementById("manualModeBtn");
  const timerForm = document.getElementById("timerForm");
  const manualForm = document.getElementById("manualForm");

  if (mode === "timer") {
    timerBtn.classList.add("active");
    manualBtn.classList.remove("active");
    timerForm.style.display = "flex";
    manualForm.style.display = "none";

    // Focus client field
    setTimeout(() => {
      document.getElementById("clientSelect")?.focus();
    }, 0);
  }

  if (mode === "manual") {
    manualBtn.classList.add("active");
    timerBtn.classList.remove("active");
    manualForm.style.display = "flex";
    timerForm.style.display = "none";

    setTimeout(() => {
      document.getElementById("manualClient")?.focus();
    }, 0);
  }
}

function normalizeHotkeyEvent(e) {
  const parts = [];
  if (e.ctrlKey) parts.push("Ctrl");
  if (e.altKey) parts.push("Alt");
  if (e.shiftKey) parts.push("Shift");
  if (e.metaKey) parts.push("Meta");

  parts.push(e.key.length === 1 ? e.key.toUpperCase() : e.key);
  return parts.join("+");
}

function normalizeHotkey(hotkey) {
  return hotkey
    .split("+")
    .map((k) => (k.length === 1 ? k.toUpperCase() : capitalize(k)))
    .sort((a, b) => priority(a) - priority(b))
    .join("+");
}

function priority(key) {
  return ["Ctrl", "Alt", "Shift", "Meta"].indexOf(key) !== -1 ? 0 : 1;
}

function capitalize(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

// Simple UUID generator (no external dependencies needed)
function generateUUID() {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function (c) {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

function renderRecentProjects() {
  const container = document.getElementById("recentProjects");
  const grid = document.getElementById("recentGrid");

  if (!recentProjects.length) {
    container.style.display = "none";
    return;
  }

  container.style.display = "block";
  grid.innerHTML = "";

  recentProjects.forEach((item, index) => {
    const wrapper = document.createElement("div");
    wrapper.className = "recent-wrapper";

    const hotkey = recentHotkeys?.[`recent_${index + 1}`];

    wrapper.innerHTML = `
      ${hotkey ? `<span class="hotkey-label">${hotkey}</span>` : ""}
      <div class="recent-tile">
        <div class="recent-client">${item.client_name}</div>
        <div class="recent-project">${item.project_name}</div>
      </div>
    `;

    wrapper
      .querySelector(".recent-tile")
      .addEventListener("click", () => selectRecentProject(item));

    grid.appendChild(wrapper);
  });
}

function selectRecentProject(item) {
  switchMode("timer");

  const clientSelect = document.getElementById("clientSelect");
  const projectSelect = document.getElementById("projectSelect");

  clientSelect.value = item.client_id;
  updateProjectDropdown(item.client_id, "projectSelect");

  setTimeout(() => {
    projectSelect.value = item.project_id;
    document.getElementById("taskInput").focus();
  }, 0);
}

function handleRecentHotkey(index) {
  if (!recentProjects || !recentProjects.length) return;

  const item = recentProjects[index];
  if (!item) return;

  selectRecentProject(item);
}

function applyLogRounding(durationSeconds) {
  const rules = config.log_rules;

  let minutes = Math.floor(durationSeconds / 60);

  if (minutes < rules.min_minutes) {
    minutes = rules.min_minutes;
  } else if (minutes > rules.round_after_minutes) {
    minutes =
      Math.ceil(minutes / rules.round_to_minutes) * rules.round_to_minutes;
  }

  return minutes * 60;
}

function startIdleWatcher() {
  console.log("[IDLE] startIdleWatcher()", {
    enabled: config.idle_alerts_enabled,
    idleMinutes: config.idle_minutes,
    timers: timers.length,
  });

  if (idleInterval) {
    console.log("[IDLE] clearing existing interval");
    clearInterval(idleInterval);
  }

  if (idleInterval) clearInterval(idleInterval);

  idleInterval = setInterval(() => {
    if (!config.idle_alerts_enabled) {
      console.log("[IDLE] skipped: alerts disabled");
      return;
    }

    if (!timers.length) {
      console.log("[IDLE] skipped: no active timers");
      return;
    }

    if (idleModalOpen) {
      console.log("[IDLE] skipped: modal already open");
      return;
    }

    const idleMs = config.idle_minutes * 60 * 1000;
    const idleTime = Date.now() - lastUserActivity;

    console.log("[IDLE] check", {
      idleSeconds: Math.floor(idleTime / 1000),
      thresholdSeconds: Math.floor(idleMs / 1000),
      task: timers[timers.length - 1]?.task_name,
    });

    if (idleTime >= idleMs) {
      console.log("[IDLE] THRESHOLD HIT → triggering idle alert");
      triggerIdleAlert();
    }
  }, 15_000); // check every 15 seconds
}

function getPrimaryIdleTimer() {
  return timers[timers.length - 1];
}

async function triggerIdleAlert() {
  console.log("[IDLE] triggerIdleAlert()");

  idleModalOpen = true;

  const timer = getPrimaryIdleTimer();
  if (!timer) {
    console.log("[IDLE] no primary timer, aborting");
    idleModalOpen = false;
    return;
  }

  console.log("[IDLE] alerting for task:", timer.task_name);

  window.api.showMainWindow?.();

  if (config.idle_sound) {
    window.api.playSound("alert.mp3");
  }

  const result = await showModal(
    "Still working?",
    `Are you still working on "${timer.task_name}"?`,
    "question",
    "Complete Task",
    true,
    true,
  );

  console.log("[IDLE] modal result:", result);

  idleModalOpen = false;
  lastUserActivity = Date.now(); // reset on any response

  console.log("[IDLE] activity reset after modal");

  if (result === true) {
    await finishTimer(timer.id);
  }

  if (result === true) {
    await finishTimer(timer.id);
  }

  if (result === false) {
    await cancelTimer(timer.id);
  }

  // Cancel button handled via modal cancel
  // Ignore = modal closed without confirm/cancel
}

// Initialize
async function init() {
  try {
    console.log("window.api:", window.api);

    if (!window.api) {
      console.error("window.api is missing. Preload did not expose it.");
      await showModal(
        "Error",
        "Preload API not available (window.api is missing).",
        "error",
      );
      return;
    }

    config = await window.api.getConfig();

    console.log("Loaded config:", config);

    console.log("[CONFIG PATH CHECK]", await window.api.getConfig());

    config.idle_alerts_enabled =
      config.idle_alerts_enabled ?? config.idle_detection_enabled ?? false;

    config.idle_minutes = Number(config.idle_minutes ?? 10);

    config.idle_sound = config.idle_sound ?? true;

    const recentData = await window.api.getRecentProjects();

    config.log_rules = {
      min_minutes: 5,
      round_after_minutes: 15,
      round_to_minutes: 10,
      ...(config.log_rules || {}),
    };

    recentHotkeys = config.recent_hotkeys || {};

    recentProjects = Array.isArray(recentData)
      ? recentData
      : Array.isArray(recentData?.items)
        ? recentData.items
        : [];

    config.recent_projects_limit =
      recentData?.limit ?? config.recent_projects_limit;

    renderRecentProjects();

    registerIdleListeners();

    // Try to refresh clients from webhook if enabled
    if (config.clients_webhook_enabled && config.clients_webhook_url) {
      try {
        console.log("Attempting to refresh clients from webhook...");
        clients = await window.api.refreshClients();
        console.log("Successfully loaded clients from webhook:", clients);

        // Show refresh button
        // document.getElementById('refreshClientsBtn').style.display = 'flex';

        const refreshBtn = document.getElementById("refreshClientsBtn");
        if (refreshBtn) {
          refreshBtn.style.display = "flex";
        } else {
          console.warn("refreshClientsBtn element not found in DOM");
        }
      } catch (error) {
        console.warn(
          "Failed to refresh clients from webhook, falling back to local file:",
          error.message,
        );
        // Fall back to local clients.json
        clients = await window.api.getClients();
        console.log("Loaded clients from local file:", clients);

        // Still show refresh button so user can try manually
        // document.getElementById('refreshClientsBtn').style.display = 'flex';

        const refreshBtn = document.getElementById("refreshClientsBtn");
        if (refreshBtn) {
          refreshBtn.style.display = "flex";
        } else {
          console.warn("refreshClientsBtn element not found in DOM");
        }
      }
    } else {
      // Load from local clients.json
      clients = await window.api.getClients();
      console.log("Loaded clients from local file:", clients);
    }

    timers = await window.api.getTimers();

    // Apply logo and title settings
    applyBranding();

    populateClientDropdowns();
    renderTimers();
    startTimerUpdates();
    syncMiniWindowVisibility();

    // Focus client immediately
    setTimeout(focusClientSelect, 0);

    startIdleWatcher();

    // Set manual entry start time to now
    const now = new Date();
    now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
    document.getElementById("manualStart").value = now
      .toISOString()
      .slice(0, 16);
  } catch (error) {
    console.error("Initialization error:", error);
  }
}

// Apply branding from config
function applyBranding() {
  const appTitle = document.getElementById("appTitle");
  const appLogo = document.getElementById("appLogo");

  console.log("Applying branding:", config);

  // Handle title
  if (config.use_title && config.project_title) {
    appTitle.textContent = config.project_title;
    appTitle.style.display = "block";
  } else if (!config.use_title) {
    appTitle.style.display = "none";
  }

  // Handle logo
  if (config.use_logo && config.logo_path) {
    appLogo.src = config.logo_path;
    appLogo.style.display = "block";
    appLogo.onerror = () => {
      console.error("Failed to load logo:", config.logo_path);
      appLogo.style.display = "none";
    };
  } else {
    appLogo.style.display = "none";
  }
}

// Populate client dropdowns
function populateClientDropdowns() {
  const timerSelect = document.getElementById("clientSelect");
  const manualSelect = document.getElementById("manualClient");

  console.log("Populating dropdowns with", clients.length, "clients");

  [timerSelect, manualSelect].forEach((select) => {
    select.innerHTML = '<option value="">Select client...</option>';
    clients.forEach((client) => {
      const option = document.createElement("option");
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

  const client = clients.find((c) => c.client_id === clientId);
  if (client && client.projects) {
    client.projects.forEach((project) => {
      const option = document.createElement("option");
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
  document.getElementById("closeBtn").addEventListener("click", () => {
    window.api.closeWindow();
  });

  // Refresh clients button
  // document.getElementById('refreshClientsBtn').addEventListener('click', async () => {
  //   const btn = document.getElementById('refreshClientsBtn');
  //   btn.disabled = true;
  //   btn.style.opacity = '0.5';

  //   try {
  //     console.log('Refreshing clients from webhook...');
  //     clients = await window.api.refreshClients();
  //     console.log('Received clients:', clients);
  //     console.log('Number of clients:', clients.length);

  //     populateClientDropdowns();
  //     await showModal('Success', `Loaded ${clients.length} clients successfully!`, 'success');
  //   } catch (error) {
  //     console.error('Refresh error:', error);
  //     await showModal('Error', `Failed to refresh clients: ${error.message}`, 'error');
  //   } finally {
  //     btn.disabled = false;
  //     btn.style.opacity = '1';
  //   }
  // });

  const refreshBtn = document.getElementById("refreshClientsBtn");
  if (refreshBtn) {
    refreshBtn.addEventListener("click", async () => {
      const btn = refreshBtn;
      btn.disabled = true;
      btn.style.opacity = "0.5";

      try {
        console.log("Refreshing clients from webhook...");
        clients = await window.api.refreshClients();
        populateClientDropdowns();
        await showModal(
          "Success",
          `Loaded ${clients.length} clients successfully!`,
          "success",
        );
      } catch (error) {
        console.error("Refresh error:", error);
        await showModal(
          "Error",
          `Failed to refresh clients: ${error.message}`,
          "error",
        );
      } finally {
        btn.disabled = false;
        btn.style.opacity = "1";
      }
    });
  } else {
    console.warn("refreshClientsBtn not found; refresh handler not attached");
  }

  // Mode toggle
  document.getElementById("timerModeBtn").addEventListener("click", () => {
    document.getElementById("timerModeBtn").classList.add("active");
    document.getElementById("manualModeBtn").classList.remove("active");
    document.getElementById("timerForm").style.display = "flex";
    document.getElementById("manualForm").style.display = "none";
  });

  document.getElementById("manualModeBtn").addEventListener("click", () => {
    document.getElementById("manualModeBtn").classList.add("active");
    document.getElementById("timerModeBtn").classList.remove("active");
    document.getElementById("manualForm").style.display = "flex";
    document.getElementById("timerForm").style.display = "none";
  });

  // Client selection changes
  document.getElementById("clientSelect").addEventListener("change", (e) => {
    updateProjectDropdown(e.target.value, "projectSelect");
  });

  document.getElementById("manualClient").addEventListener("change", (e) => {
    updateProjectDropdown(e.target.value, "manualProject");
  });

  // Timer form submit
  document.getElementById("timerForm").addEventListener("submit", async (e) => {
    e.preventDefault();

    const clientSelect = document.getElementById("clientSelect");
    const projectSelect = document.getElementById("projectSelect");
    const taskInput = document.getElementById("taskInput");

    const clientData = JSON.parse(
      clientSelect.options[clientSelect.selectedIndex].dataset.clientData,
    );

    const timer = {
      id: generateUUID(),
      client_name: clientData.client_name,
      client_id: clientSelect.value,
      project_name: projectSelect.options[projectSelect.selectedIndex].text,
      project_id: projectSelect.value,
      task_name: taskInput.value,
      started_at: new Date().toISOString(),
    };

    timers.push(timer);
    await window.api.saveTimers(timers);

    // Reset form
    taskInput.value = "";

    renderTimers();
    syncMiniWindowVisibility();

    lastUserActivity = Date.now();
    startIdleWatcher();

    window.api.closeWindow();
  });

  // Manual form submit
  document
    .getElementById("manualForm")
    .addEventListener("submit", async (e) => {
      e.preventDefault();

      const clientSelect = document.getElementById("manualClient");
      const projectSelect = document.getElementById("manualProject");
      const taskInput = document.getElementById("manualTask");
      const startInput = document.getElementById("manualStart");
      const durationInput = document.getElementById("manualDuration");
      const noteInput = document.getElementById("manualNote");

      // Parse duration HH:MM
      const [hours, minutes] = durationInput.value.split(":").map(Number);
      let durationSeconds = hours * 3600 + minutes * 60;

      // Apply rounding rules
      durationSeconds = applyLogRounding(durationSeconds);

      const payload = {
        task_name: taskInput.value,
        started_at: new Date(startInput.value).toISOString(),
        duration: durationSeconds,
        note: noteInput.value,
        client_id: clientSelect.value,
        project_id: projectSelect.value,
        service_name: taskInput.value,
      };

      try {
        await window.api.sendWebhook(payload);
        await showModal("Success", "Entry logged successfully!", "success");

        // Reset form
        taskInput.value = "";
        noteInput.value = "";
        durationInput.value = "";

        window.api.closeWindow();
      } catch (error) {
        await showModal("Error", error.message, "error");
      }
    });

  // Keyboard shortcuts
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      window.api.closeWindow();
    }
  });

  //Listen for mode switch hotkeys
  document.addEventListener("keydown", (e) => {
    if (!config) return;

    const combo = normalizeHotkeyEvent(e);

    // ----- Mode hotkeys -----
    if (config.mode_hotkeys) {
      if (combo === normalizeHotkey(config.mode_hotkeys.timer_mode)) {
        e.preventDefault();
        switchMode("timer");
        return;
      }

      if (combo === normalizeHotkey(config.mode_hotkeys.manual_mode)) {
        e.preventDefault();
        switchMode("manual");
        return;
      }
    }

    // ----- Recent project hotkeys -----
    if (config.recent_hotkeys) {
      const mappings = [
        config.recent_hotkeys.recent_1,
        config.recent_hotkeys.recent_2,
        config.recent_hotkeys.recent_3,
        config.recent_hotkeys.recent_4,
        config.recent_hotkeys.recent_5,
      ];

      mappings.forEach((hotkey, index) => {
        if (hotkey && combo === normalizeHotkey(hotkey)) {
          e.preventDefault();
          handleRecentHotkey(index);
        }
      });
    }
  });
}

// Render active timers
function renderTimers() {
  const timersList = document.getElementById("timersList");

  if (timers.length === 0) {
    timersList.innerHTML = '<p class="empty-state">No active timers</p>';
    return;
  }

  timersList.innerHTML = timers
    .filter((timer) => !submittingTimers.has(timer.id))
    .map((timer) => {
      const elapsed = getElapsedTime(timer.started_at);
      return `
      <div class="timer-item" id="timer-${timer.id}">
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
    })
    .join("");

  // Attach event listeners to buttons
  timersList.querySelectorAll(".timer-btn.finish").forEach((btn) => {
    btn.addEventListener("click", () => finishTimer(btn.dataset.timerId));
  });

  timersList.querySelectorAll(".timer-btn.cancel").forEach((btn) => {
    btn.addEventListener("click", () => cancelTimer(btn.dataset.timerId));
  });
}

// Get elapsed time formatted
function getElapsedTime(startTime) {
  const elapsed = Date.now() - new Date(startTime).getTime();
  const hours = Math.floor(elapsed / 3600000);
  const minutes = Math.floor((elapsed % 3600000) / 60000);
  const seconds = Math.floor((elapsed % 60000) / 1000);
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
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

function recordRecentProject(item) {
  if (!item?.client_id || !item?.project_id) return;

  if (!Array.isArray(recentProjects)) {
    recentProjects = [];
  }

  const max = config?.recent_projects_limit || 5;

  // Deduplicate
  recentProjects = recentProjects.filter(
    (p) =>
      !(p.client_id === item.client_id && p.project_id === item.project_id),
  );

  recentProjects.unshift({
    ...item,
    last_used: Date.now(),
  });

  recentProjects = recentProjects.slice(0, max);

  window.api.saveRecentProjects({
    limit: max,
    items: recentProjects,
  });
}

// Finish timer
async function finishTimer(timerId) {
  const timer = timers.find((t) => t.id === timerId);
  if (!timer) return;

  const endTime = new Date();
  const startTime = new Date(timer.started_at);
  let durationSeconds = Math.floor((endTime - startTime) / 1000);

  durationSeconds = applyLogRounding(durationSeconds);

  const payload = {
    task_name: timer.task_name,
    started_at: timer.started_at,
    duration: durationSeconds,
    note: "",
    client_id: timer.client_id,
    project_id: timer.project_id,
    service_name: timer.task_name,
  };

  submittingTimers.add(timerId);

  try {
    await window.api.sendWebhook(payload);

    recordRecentProject({
      client_id: timer.client_id,
      client_name: timer.client_name,
      project_id: timer.project_id,
      project_name: timer.project_name,
    });

    const timerEl = document.getElementById(`timer-${timerId}`);
    if (!timerEl) return;

    timerEl.classList.add("submitted");
    timerEl.innerHTML = `
      <div class="timer-info">
        <div class="timer-client">✓ Entry submitted</div>
        <div class="timer-task">${timer.task_name}</div>
      </div>
    `;

    setTimeout(() => {
      timerEl.classList.add("fade-out");

      setTimeout(async () => {
        submittingTimers.delete(timerId);
        timers = timers.filter((t) => t.id !== timerId);
        await window.api.saveTimers(timers);
        renderTimers();
        syncMiniWindowVisibility();

        lastUserActivity = Date.now();
        startIdleWatcher();
      }, 600);
    }, 1200);
  } catch (error) {
    submittingTimers.delete(timerId);
    await showModal("Error", `Failed to log timer: ${error.message}`, "error");
  }
}

// Cancel timer
async function cancelTimer(timerId) {
  const timer = timers.find((t) => t.id === timerId);
  if (!timer) return;

  const confirmed = await showModal(
    "Cancel Timer?",
    `Are you sure you want to cancel "${timer.task_name}"?`,
    "question",
    "Yes, Cancel",
    true,
  );

  if (confirmed) {
    timers = timers.filter((t) => t.id !== timerId);
    await window.api.saveTimers(timers);
    renderTimers();
    syncMiniWindowVisibility();

    lastUserActivity = Date.now();
    startIdleWatcher();
  }
}

window.api.onWindowShown(() => {
  // Ensure Timer mode is active
  switchMode("timer");

  // Focus client select after render
  setTimeout(() => {
    const clientSelect = document.getElementById("clientSelect");
    clientSelect?.focus();
  }, 50);
});

// Wait for DOM to be ready, then initialize
document.addEventListener("DOMContentLoaded", () => {
  setupEventListeners();
  init();
});

function syncMiniWindowVisibility() {
  if (timers.length > 0) {
    window.api.showMiniWindow();
  } else {
    window.api.hideMiniWindow();
  }
}

let miniVisible = true;

document.getElementById("toggleMiniBtn")?.addEventListener("click", () => {
  if (miniVisible) {
    window.api.hideMiniWindow();
  } else {
    window.api.showMiniWindow();
  }
  miniVisible = !miniVisible;
});

window.api.onFinishTimer((id) => finishTimer(id));
window.api.onCancelTimer((id) => cancelTimer(id));

["mousemove", "keydown", "mousedown"].forEach((event) => {
  document.addEventListener(event, () => recordUserActivity(event));
});

window.api.onPlaySound((soundUrl) => {
  console.log("🔊 Renderer received sound:", soundUrl);

  const audio = document.getElementById("idleSound");
  if (!audio) {
    console.error("❌ idleSound element not found");
    return;
  }

  audio.src = soundUrl;
  audio.volume = 1.0;

  audio.play().catch((err) => {
    console.error("❌ Audio play failed:", err);
  });
});

console.log("Renderer JS finished");
