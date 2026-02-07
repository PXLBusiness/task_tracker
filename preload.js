const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("api", {
  getClients: () => ipcRenderer.invoke("get-clients"),
  getTimers: () => ipcRenderer.invoke("get-timers"),
  saveTimers: (timers) => ipcRenderer.invoke("save-timers", timers),
  getConfig: () => ipcRenderer.invoke("get-config"),
  saveConfig: (config) => ipcRenderer.invoke("save-config", config),
  closeWindow: () => ipcRenderer.invoke("close-window"),
  sendWebhook: (payload) => ipcRenderer.invoke("send-webhook", payload),
  refreshClients: () => ipcRenderer.invoke("refresh-clients"),
  onWindowShown: (callback) => ipcRenderer.on("window-shown", callback),
  getRecentProjects: () => ipcRenderer.invoke("get-recent-projects"),
  saveRecentProjects: (data) =>
    ipcRenderer.invoke("save-recent-projects", data),
  showMiniWindow: () => ipcRenderer.invoke("show-mini-window"),
  hideMiniWindow: () => ipcRenderer.invoke("hide-mini-window"),
  onTimersUpdated: (callback) =>
    ipcRenderer.on("timers-updated", (_, timers) => callback(timers)),
  finishTimerFromMini: (id) => ipcRenderer.invoke("finish-timer-mini", id),
  cancelTimerFromMini: (id) => ipcRenderer.invoke("cancel-timer-mini", id),
  onFinishTimer: (cb) => ipcRenderer.on("finish-timer", (_, id) => cb(id)),
  onCancelTimer: (cb) => ipcRenderer.on("cancel-timer", (_, id) => cb(id)),
  resizeMiniWindow: (height) =>
    ipcRenderer.invoke("resize-mini-window", height),
  playSound: (filename) => ipcRenderer.invoke("play-sound", filename),
  onPlaySound: (cb) => ipcRenderer.on("play-sound", (_, url) => cb(url)),
  showMainWindow: () => ipcRenderer.invoke("show-main-window"),
});
