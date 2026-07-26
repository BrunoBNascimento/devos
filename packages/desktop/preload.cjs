const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('devosAPI', {
  executeTask: (task, engine) => ipcRenderer.invoke('devos:execute', { task, engine }),
  onStream: (callback) => ipcRenderer.on('devos:stream', (_event, value) => callback(value)),
});
