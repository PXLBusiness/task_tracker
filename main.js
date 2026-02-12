const {
  app,
  BrowserWindow,
  globalShortcut,
  ipcMain,
  Tray,
  Menu,
} = require("electron");
const path = require("path");
const fs = require("fs").promises;
const fsSync = require("fs");
const { powerMonitor } = require("electron");
let idleCheckInterval = null;

const { pathToFileURL } = require("url");

let mainWindow;
let tray = null;
// const DATA_DIR = path.join(__dirname, "data");
let DATA_DIR;
let isQuitting = false;

let miniWindow;
let miniWindowHiddenByUser = false;

let timers = [];
let soundWindow;

function showMainWindow() {
  mainWindow.show();
  mainWindow.focus();
  mainWindow.webContents.send("window-shown");
}

function createSoundWindow() {
  soundWindow = new BrowserWindow({
    width: 1,
    height: 1,
    show: false,
    frame: false,
    transparent: true,
    skipTaskbar: true,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
    },
  });

  soundWindow.loadFile(path.join(__dirname, "sound.html"));
}

async function readJsonSafe(filePath, fallback) {
  try {
    const data = await fs.readFile(filePath, "utf8");
    return JSON.parse(data);
  } catch (err) {
    console.warn(`readJsonSafe fallback for ${filePath}:`, err.message);
    return fallback;
  }
}

function startSystemIdleWatcher() {
  if (idleCheckInterval) clearInterval(idleCheckInterval);

  idleCheckInterval = setInterval(() => {
    if (!timers || timers.length === 0) return;

    readJsonSafe(path.join(DATA_DIR, "config.json"), {}).then((config) => {
      if (!config.idle_alerts_enabled) return;

      const idleSeconds = powerMonitor.getSystemIdleTime();
      const thresholdSeconds = (config.idle_minutes || 10) * 60;

      if (idleSeconds >= thresholdSeconds) {
        console.log("[IDLE] System idle triggered:", idleSeconds);
        mainWindow.webContents.send("system-idle-triggered");
      }
    });
  }, 15_000);
}

function broadcastTimers() {
  // If we’re quitting, don’t touch windows at all.
  if (isQuitting) return;

  // Send to main window too (if you use it for window-shown / UI sync)
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send("timers-updated", timers);
  }

  // Send to mini window
  if (miniWindow && !miniWindow.isDestroyed()) {
    miniWindow.webContents.send("timers-updated", timers);

    // Auto-hide mini if no timers and user didn’t manually hide it
    if (timers.length === 0 && !miniWindowHiddenByUser) {
      // extra guard: only hide if it’s currently visible
      if (miniWindow.isVisible()) miniWindow.hide();
    }
  }

  // console.log("[Broadcast]", timers.length, "timers → windows");
}

function getWeekKey(d = new Date()) {
  const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const dayNum = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((date - yearStart) / 86400000 + 1) / 7);
  return `${date.getUTCFullYear()}-W${week}`;
}

async function recordStats(durationSeconds) {
  const statsPath = path.join(DATA_DIR, "stats.json");

  const now = new Date();
  const todayKey = now.toISOString().slice(0, 10);
  const weekKey = getWeekKey(now);
  const monthKey = now.toISOString().slice(0, 7);

  const stats = await readJsonSafe(statsPath, {
    all_time_seconds: 0,
    total_entries: 0,
    today_seconds: 0,
    today_date: todayKey,
    week_seconds: 0,
    week_key: weekKey,
    month_seconds: 0,
    month_key: monthKey,
  });

  // Reset buckets if needed
  if (stats.today_date !== todayKey) {
    stats.today_date = todayKey;
    stats.today_seconds = 0;
  }

  if (stats.week_key !== weekKey) {
    stats.week_key = weekKey;
    stats.week_seconds = 0;
  }

  if (stats.month_key !== monthKey) {
    stats.month_key = monthKey;
    stats.month_seconds = 0;
  }

  // Increment
  stats.today_seconds += durationSeconds;
  stats.week_seconds += durationSeconds;
  stats.month_seconds += durationSeconds;
  stats.all_time_seconds += durationSeconds;
  stats.total_entries += 1;

  await fs.writeFile(statsPath, JSON.stringify(stats, null, 2));
}

async function sendOrQueue(payload) {
  const queuePath = path.join(DATA_DIR, "queue.json");
  const configPath = path.join(DATA_DIR, "config.json");

  const config = await readJsonSafe(configPath, {});

  // If no webhook configured, always queue
  if (!config.webhook_url) {
    const queue = await readJsonSafe(queuePath, []);
    queue.push({
      payload,
      queued_at: new Date().toISOString(),
      attempts: 0,
      reason: "no_webhook",
    });
    await fs.writeFile(queuePath, JSON.stringify(queue, null, 2));
    return { status: "queued" };
  }

  try {
    const fetch = require("node-fetch");
    const response = await fetch(config.webhook_url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      throw new Error(`Webhook failed: ${response.status}`);
    }

    await recordStats(payload.duration);
    return { status: "sent" };
  } catch (err) {
    const queue = await readJsonSafe(queuePath, []);
    queue.push({
      payload,
      queued_at: new Date().toISOString(),
      attempts: 0,
      reason: err.message,
    });

    await recordStats(payload.duration);
    await fs.writeFile(queuePath, JSON.stringify(queue, null, 2));
    return { status: "queued" };
  }
}

async function retryQueuedEntries() {
  const queuePath = path.join(DATA_DIR, "queue.json");

  let queue = await readJsonSafe(queuePath, []);
  if (!queue.length) return;

  const remaining = [];

  for (const item of queue) {
    try {
      const result = await sendOrQueue(item.payload);

      if (result.status === "queued") {
        item.attempts = (item.attempts || 0) + 1;
        remaining.push(item);
      }
      // if sent → drop it
    } catch {
      item.attempts = (item.attempts || 0) + 1;
      remaining.push(item);
    }
  }

  await fs.writeFile(queuePath, JSON.stringify(remaining, null, 2));
}

// Ensure data directory exists
async function ensureDataDir() {
  try {
    await fs.access(DATA_DIR);
  } catch {
    await fs.mkdir(DATA_DIR);
  }

  // Initialize files if they don't exist
  const files = {
    "timers.json": "[]",
    "clients.json": "[]",
    "queue.json": "[]",
    "recent-projects.json": JSON.stringify({ limit: 5, items: [] }, null, 2),
    "stats.json": JSON.stringify(
      {
        all_time_seconds: 0,
        total_entries: 0,

        today_seconds: 0,
        today_date: new Date().toISOString().slice(0, 10),

        week_seconds: 0,
        week_key: "",

        month_seconds: 0,
        month_key: "",
      },
      null,
      2,
    ),
    "config.json": JSON.stringify(
      {
        webhook_url: "",
        hotkey: "Alt+T",
        window_width: 1000,
        window_height: 1080,
        use_logo: false,
        logo_path: "",
        project_title: "Task Tracker",
        use_title: true,
        clients_webhook_enabled: false,
        clients_webhook_url: "",
        idle_detection_enabled: false,
        idle_minutes: 15,
        milestones_enabled: false,
        milestone_times: [60, 120, 180],
        milestone_sound: true,
        milestone_notification: true,
        floating_widget_enabled: false,
        recent_projects_limit: 5,
      },
      null,
      2,
    ),
  };

  for (const [filename, defaultContent] of Object.entries(files)) {
    const filepath = path.join(DATA_DIR, filename);
    try {
      await fs.access(filepath);
    } catch {
      await fs.writeFile(filepath, defaultContent);
    }
  }
}

async function createWindow() {
  // Load config to get window dimensions
  const configPath = path.join(DATA_DIR, "config.json");
  let config = {
    window_width: 1000,
    window_height: 1080,
  };

  try {
    const configData = await fs.readFile(configPath, "utf8");
    config = JSON.parse(configData);
  } catch (error) {
    console.log("Using default window dimensions");
  }

  mainWindow = new BrowserWindow({
    width: config.window_width || 1000,
    height: config.window_height || 1080,
    show: false,
    alwaysOnTop: true,
    frame: false,
    transparent: true,
    skipTaskbar: true,
    resizable: false,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      nodeIntegration: false,
      contextIsolation: true,
      devTools: true, // Enable dev tools for debugging
    },
  });

  console.log("WINDOW CREATED");

  // mainWindow.loadFile("index.html");
  mainWindow.loadFile(path.join(__dirname, "index.html"));

  console.log("WINDOW FILE LOADED");

  // Center window
  mainWindow.center();

  // Prevent window from showing until ready
  mainWindow.once("ready-to-show", () => {
    // Don't show on startup, wait for hotkey
  });

  // Prevent app from quitting when window is closed
  mainWindow.on("close", (event) => {
    if (!isQuitting) {
      event.preventDefault();
      mainWindow.hide();
    }
  });

  // Open DevTools for debugging (remove in production)
  // mainWindow.webContents.openDevTools();
}

function createMiniWindow() {
  miniWindow = new BrowserWindow({
    width: 280,
    height: 120,
    minWidth: 260,
    maxWidth: 300,
    minHeight: 80,
    show: false,
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    skipTaskbar: true,
    resizable: false,
    focusable: false,
    hasShadow: false,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  miniWindow.loadFile(path.join(__dirname, "mini.html"));

  // Optional: top-right-ish default placement
  const { width } = miniWindow.getBounds();
  const primaryDisplay = require("electron").screen.getPrimaryDisplay();
  const { workArea } = primaryDisplay;

  miniWindow.setPosition(
    workArea.x + workArea.width - width - 20,
    workArea.y + 80,
  );

  miniWindow.on("close", (e) => {
    e.preventDefault();
    miniWindow.hide();
  });
}

const RECENT_PROJECTS_FILE = path.join(
  app.getPath("userData"),
  "recent-projects.json",
);

function saveRecentProjects(data) {
  fs.writeFileSync(
    RECENT_PROJECTS_FILE,
    JSON.stringify(data, null, 2),
    "utf-8",
  );
}

function getRecentProjects() {
  if (!fs.existsSync(RECENT_PROJECTS_FILE)) {
    const initial = { limit: 5, items: [] };
    fs.writeFileSync(
      RECENT_PROJECTS_FILE,
      JSON.stringify(initial, null, 2),
      "utf-8",
    );
    return initial;
  }

  return JSON.parse(fs.readFileSync(RECENT_PROJECTS_FILE, "utf-8"));
}

function createTray() {
  const iconPath = app.isPackaged
    ? path.join(process.resourcesPath, "assets", "tray-icon.png")
    : path.join(__dirname, "assets", "tray-icon.png");

  console.log("Tray icon path:", iconPath);

  tray = new Tray(iconPath);

  const contextMenu = Menu.buildFromTemplate([
    {
      label: "Show Time Tracker",
      click: () => {
        mainWindow.show();
        mainWindow.focus();
      },
    },
    {
      label: "Hide",
      click: () => {
        mainWindow.hide();
      },
    },
    { type: "separator" },
    {
      label: "Quit",
      click: () => {
        isQuitting = true;

        // stop mini auto-hide logic from firing after quit begins
        miniWindowHiddenByUser = true;
        app.quit();
      },
    },
  ]);

  tray.setToolTip("Time Tracker");
  tray.setContextMenu(contextMenu);
}

const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
  app.quit();
  process.exit(0);
}

app.on("second-instance", () => {
  if (mainWindow) {
    mainWindow.show();
    mainWindow.focus();
  }
});

app.on("before-quit", () => {
  isQuitting = true;

  console.log("🛑 App is quitting — cleaning up");

  if (miniWindow && !miniWindow.isDestroyed()) {
    miniWindow.destroy();
  }

  if (soundWindow && !soundWindow.isDestroyed()) {
    soundWindow.destroy();
  }

  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.destroy();
  }

  if (tray) {
    tray.destroy();
  }
});

app.whenReady().then(async () => {
  console.log("APP READY");

  DATA_DIR = path.join(app.getPath("userData"), "data");
  //console.log("DATA_DIR:", DATA_DIR);

  await ensureDataDir();

  timers = await readJsonSafe(path.join(DATA_DIR, "timers.json"), []);

  setInterval(() => {
    retryQueuedEntries().catch((err) => {
      console.error("Queue retry error:", err.message);
    });
  }, 60_000); // every 60 seconds

  await createWindow();
  createMiniWindow();
  createSoundWindow();
  createTray();
  startSystemIdleWatcher();

  broadcastTimers();

  // Register global hotkey Alt+T
  const registered = globalShortcut.register("Alt+T", () => {
    if (mainWindow.isVisible()) {
      mainWindow.hide();
    } else {
      showMainWindow();
    }
  });

  if (!registered) {
    console.error("Hotkey registration failed");
  }
});

app.on("window-all-closed", (e) => {
  // Prevent quit on window close unless we're actually quitting
  if (!app.isQuitting) {
    e.preventDefault();
  }

  if (process.platform !== "darwin" && app.isQuitting) {
    app.quit();
  }
});

app.on("will-quit", () => {
  globalShortcut.unregisterAll();
});

// IPC Handlers
ipcMain.handle("get-clients", async () => {
  return await readJsonSafe(path.join(DATA_DIR, "clients.json"), []);
});

ipcMain.handle("get-timers", async () => {
  timers = await readJsonSafe(path.join(DATA_DIR, "timers.json"), []);
  return timers;
});

ipcMain.handle("save-timers", async (event, updatedTimers) => {
  timers = updatedTimers;

  await fs.writeFile(
    path.join(DATA_DIR, "timers.json"),
    JSON.stringify(timers, null, 2),
  );

  broadcastTimers();
  return true;
});

ipcMain.handle("get-config", async () => {
  return await readJsonSafe(path.join(DATA_DIR, "config.json"), {});
});

ipcMain.handle("save-config", async (event, config) => {
  await fs.writeFile(
    path.join(DATA_DIR, "config.json"),
    JSON.stringify(config, null, 2),
  );
  return true;
});

ipcMain.handle("close-window", () => {
  mainWindow.hide();
});

ipcMain.handle("submit-entry", async (event, payload) => {
  return await sendOrQueue(payload);
});

ipcMain.handle("send-webhook", async (event, payload) => {
  return await sendOrQueue(payload);
});

ipcMain.handle("refresh-clients", async () => {
  const config = await readJsonSafe(path.join(DATA_DIR, "config.json"), {});

  if (!config.clients_webhook_enabled || !config.clients_webhook_url) {
    throw new Error("Clients webhook not configured");
  }

  const fetch = require("node-fetch");
  const response = await fetch(config.clients_webhook_url, {
    method: "GET",
    headers: { "Content-Type": "application/json" },
  });

  if (!response.ok) {
    throw new Error(`Clients webhook failed: ${response.statusText}`);
  }

  const responseText = await response.text();

  let responseData;
  try {
    responseData = JSON.parse(responseText);
  } catch {
    throw new Error("Webhook returned invalid JSON");
  }

  const clientsData = Array.isArray(responseData)
    ? responseData
    : responseData.data || responseData.clients || [responseData];

  await fs.writeFile(
    path.join(DATA_DIR, "clients.json"),
    JSON.stringify(clientsData, null, 2),
  );

  return clientsData;
});

ipcMain.handle("get-recent-projects", async () => {
  return await readJsonSafe(path.join(DATA_DIR, "recent-projects.json"), {
    limit: 5,
    items: [],
  });
});

ipcMain.handle("save-recent-projects", async (event, data) => {
  const filePath = path.join(DATA_DIR, "recent-projects.json");

  // Safety: enforce shape
  const safeData = {
    limit: data.limit ?? 5,
    items: Array.isArray(data.items) ? data.items : [],
  };

  await fs.writeFile(filePath, JSON.stringify(safeData, null, 2));
  return true;
});

ipcMain.handle("show-mini-window", () => {
  if (miniWindow) {
    miniWindow.show();
    miniWindow.focus();
  }
});

ipcMain.handle("hide-mini-window", () => {
  if (miniWindow) {
    miniWindow.hide();
  }
});

ipcMain.handle("finish-timer-mini", async (event, timerId) => {
  mainWindow.webContents.send("finish-timer", timerId);
});

ipcMain.handle("cancel-timer-mini", async (event, timerId) => {
  if (mainWindow) {
    mainWindow.show();
    mainWindow.focus();
  }

  mainWindow.webContents.send("cancel-timer", timerId);
});

ipcMain.handle("resize-mini-window", (event, contentHeight) => {
  if (!miniWindow || miniWindow.isDestroyed()) return;

  const MIN_HEIGHT = 80;
  const MAX_HEIGHT = 400;

  const height = Math.max(MIN_HEIGHT, Math.min(MAX_HEIGHT, contentHeight + 8));

  const [width] = miniWindow.getSize();
  miniWindow.setSize(width, height, true);
});

ipcMain.handle("play-sound", async (event, filename) => {
  const soundPath = app.isPackaged
    ? path.join(process.resourcesPath, "assets", filename)
    : path.join(__dirname, "assets", filename);

  console.log("🔊 Idle sound requested:", filename);
  console.log("🔊 Resolved sound path:", soundPath);

  if (!fsSync.existsSync(soundPath)) {
    console.error("❌ Sound file NOT FOUND:", soundPath);
    return false;
  }

  const soundUrl = pathToFileURL(soundPath).toString();
  console.log("🔊 Sound URL:", soundUrl);

  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send("play-sound", soundUrl);
  }

  return true;
});

ipcMain.handle("show-main-window", () => {
  if (mainWindow) {
    mainWindow.show();
    mainWindow.focus();
  }
});

ipcMain.handle("get-stats", async () => {
  return await readJsonSafe(path.join(DATA_DIR, "stats.json"), {});
});
