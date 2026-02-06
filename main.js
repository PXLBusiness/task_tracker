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

let mainWindow;
let tray = null;
// const DATA_DIR = path.join(__dirname, "data");
let DATA_DIR;
let isQuitting = false;

function showMainWindow() {
  mainWindow.show();
  mainWindow.focus();
  mainWindow.webContents.send("window-shown");
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

    return { status: "sent" };
  } catch (err) {
    const queue = await readJsonSafe(queuePath, []);
    queue.push({
      payload,
      queued_at: new Date().toISOString(),
      attempts: 0,
      reason: err.message,
    });

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
});

app.whenReady().then(async () => {
  console.log("APP READY");

  DATA_DIR = path.join(app.getPath("userData"), "data");
  //console.log("DATA_DIR:", DATA_DIR);

  await ensureDataDir();

  setInterval(() => {
    retryQueuedEntries().catch((err) => {
      console.error("Queue retry error:", err.message);
    });
  }, 60_000); // every 60 seconds

  await createWindow();
  createTray();

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
  return await readJsonSafe(path.join(DATA_DIR, "timers.json"), []);
});

ipcMain.handle("save-timers", async (event, timers) => {
  await fs.writeFile(
    path.join(DATA_DIR, "timers.json"),
    JSON.stringify(timers, null, 2),
  );
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

// ipcMain.handle("send-webhook", async (event, payload) => {
//   const config = await readJsonSafe(path.join(DATA_DIR, "config.json"), {});

//   if (!config.webhook_url) {
//     throw new Error("Webhook URL not configured");
//   }

//   const fetch = require("node-fetch");
//   const response = await fetch(config.webhook_url, {
//     method: "POST",
//     headers: { "Content-Type": "application/json" },
//     body: JSON.stringify(payload),
//   });

//   if (!response.ok) {
//     throw new Error(`Webhook failed: ${response.statusText}`);
//   }

//   return await response.json();
// });

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
