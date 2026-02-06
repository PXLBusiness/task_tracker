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
});
