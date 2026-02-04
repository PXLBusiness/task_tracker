const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
  getClients: () => ipcRenderer.invoke('get-clients'),
  getTimers: () => ipcRenderer.invoke('get-timers'),
  saveTimers: (timers) => ipcRenderer.invoke('save-timers', timers),
  getConfig: () => ipcRenderer.invoke('get-config'),
  saveConfig: (config) => ipcRenderer.invoke('save-config', config),
  closeWindow: () => ipcRenderer.invoke('close-window'),
  sendWebhook: (payload) => ipcRenderer.invoke('send-webhook', payload)
});
