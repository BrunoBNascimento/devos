const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const { spawn } = require('child_process');

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
    },
    titleBarStyle: 'hidden', // Sleek look
  });

  // Check if we are in development mode (Vite server running)
  const isDev = process.env.NODE_ENV === 'development';

  if (isDev) {
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, 'dist/index.html'));
  }
}

app.whenReady().then(() => {
  createWindow();

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') app.quit();
});

// IPC handler to execute the DevOS command via child process
ipcMain.handle('devos:execute', async (event, { task, engine }) => {
  return new Promise((resolve, reject) => {
    // Engine can be "claude" or "gemini"
    const command = engine === 'claude' ? 'claude' : 'gemini';
    const args = ['-p', `Run /devos.develop for Jira Task ${task}. Use DevOS Orchestrator persona.`];
    
    // Spawning hidden CLI process
    // In real scenarios, this needs to run in the workspace root, so we pass cwd
    const cwd = path.resolve(process.cwd(), '../../'); // Go up to workspace root from desktop folder
    
    const child = spawn(command, args, { cwd, shell: true });
    
    let output = '';
    
    child.stdout.on('data', (data) => {
      output += data.toString();
      // We can also send streams back to UI here
      event.sender.send('devos:stream', data.toString());
    });

    child.stderr.on('data', (data) => {
      output += data.toString();
      event.sender.send('devos:stream', data.toString());
    });

    child.on('close', (code) => {
      if (code === 0) {
        resolve({ success: true, output });
      } else {
        resolve({ success: false, error: output, code });
      }
    });
  });
});
