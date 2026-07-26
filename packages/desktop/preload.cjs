const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('devosAPI', {
  executeTask: (task, engine, useWsl) => ipcRenderer.invoke('devos:execute', { task, engine, useWsl }),
  onStream: (callback) => ipcRenderer.on('devos:stream', (_event, value) => callback(value)),
  readConfig: () => ipcRenderer.invoke('devos:readConfig'),
  saveConfig: (content) => ipcRenderer.invoke('devos:saveConfig', content),
  isWindows: process.platform === 'win32',
});
