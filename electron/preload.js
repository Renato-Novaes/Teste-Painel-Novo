// Preload script — runs in a restricted context before the renderer
// Keep minimal for security
const { contextBridge } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  isElectron: true,
});
