const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('devosAPI', {
  readConfig: () => ipcRenderer.invoke('devos:readConfig'),
  saveConfig: (content) => ipcRenderer.invoke('devos:saveConfig', content),
  readMetrics: () => ipcRenderer.invoke('devos:readMetrics'),
  readKnowledge: () => ipcRenderer.invoke('devos:readKnowledge'),
  readPendingTasks: () => ipcRenderer.invoke('devos:readPendingTasks'),
  
  syncIntegrations: (useWsl, engine) => ipcRenderer.invoke('devos:syncIntegrations', { useWsl, engine }),
  setSyncInterval: (interval) => ipcRenderer.invoke('devos:setSyncInterval', interval),
  getCrawlerStatus: () => ipcRenderer.invoke('devos:getCrawlerStatus'),
  onCrawlerState: (callback) => {
    // Remove previous listeners to avoid memory leaks/double calls on re-renders
    ipcRenderer.removeAllListeners('devos:crawlerState');
    ipcRenderer.on('devos:crawlerState', (_event, state) => callback(state));
  },
  
  isWindows: process.platform === 'win32',
});
