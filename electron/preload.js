// Preload script — runs in a restricted context before the renderer
// Keep minimal for security
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  isElectron: true,
  // Auto-update
  checkForUpdate: () => ipcRenderer.invoke('update:check'),
  downloadUpdate: (url, fileName) => ipcRenderer.invoke('update:download', url, fileName),
  installUpdate: (path) => ipcRenderer.invoke('update:install', path),
  onUpdateProgress: (callback) => {
    ipcRenderer.on('update:progress', (_event, pct) => callback(pct));
  },
  removeUpdateProgress: () => {
    ipcRenderer.removeAllListeners('update:progress');
  },
});
