const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('devosAPI', {
  executeTask: (task, engine, useWsl) => ipcRenderer.invoke('devos:execute', { task, engine, useWsl }),
  stopTask: () => ipcRenderer.invoke('devos:stop'),
  onStream: (callback) => ipcRenderer.on('devos:stream', (_event, value) => callback(value)),
  readConfig: () => ipcRenderer.invoke('devos:readConfig'),
  saveConfig: (content) => ipcRenderer.invoke('devos:saveConfig', content),
  readMetrics: () => ipcRenderer.invoke('devos:readMetrics'),
  readKnowledge: () => ipcRenderer.invoke('devos:readKnowledge'),
  readPendingTasks: () => ipcRenderer.invoke('devos:readPendingTasks'),
  isWindows: process.platform === 'win32',
});
