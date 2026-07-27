const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const { spawn } = require('child_process');
const fs = require('fs');

let mainWindow;

// Crawler State
let crawlerStatus = 'idle';
let lastSync = null;
let syncIntervalId = null;
let syncIntervalValue = 'off';
let activeChild = null; // for main workflow

function broadcastCrawlerState() {
  if (mainWindow) {
    mainWindow.webContents.send('devos:crawlerState', {
      status: crawlerStatus,
      lastSync,
      interval: syncIntervalValue
    });
  }
}

function runSyncIntegrations(useWsl = false, engine = 'claude') {
  if (crawlerStatus === 'syncing') return;
  crawlerStatus = 'syncing';
  broadcastCrawlerState();

  let command = engine === 'claude' ? 'claude' : 'gemini';
  let args = ['-p', `Run /devos.metrics.`];
  
  if (useWsl && process.platform === 'win32') {
    args = ['--', 'sh', '-c', `zsh -ic '${command} -p "Run /devos.metrics."' || bash -ic '${command} -p "Run /devos.metrics."'`];
    command = 'wsl';
  }

  const cwd = path.resolve(process.cwd(), '../../');
  const child = spawn(command, args, { cwd, shell: true });

  child.on('close', (code) => {
    crawlerStatus = 'idle';
    lastSync = new Date().toISOString();
    broadcastCrawlerState();
  });
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
    },
    titleBarStyle: 'hidden',
  });

  const isDev = !app.isPackaged;

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
ipcMain.handle('devos:execute', async (event, { task, engine, useWsl }) => {
  if (activeChild) {
    return { success: false, error: 'A task is already running.' };
  }

  return new Promise((resolve, reject) => {
    let command = engine === 'claude' ? 'claude' : 'gemini';
    let args = ['-p', `Run /devos.develop for Jira Task ${task}. Use DevOS Orchestrator persona.`];
    
    if (useWsl) {
      const taskEscaped = task.replace(/"/g, '\\"');
      const innerCmd = `${command} -p "Run /devos.develop for Jira Task ${taskEscaped}. Use DevOS Orchestrator persona."`;
      args = ['--', 'sh', '-c', `zsh -ic '${innerCmd}' || bash -ic '${innerCmd}'`];
      command = 'wsl';
    }
    
    const cwd = path.resolve(process.cwd(), '../../');
    const child = spawn(command, args, { cwd, shell: true });
    activeChild = child;
    
    let output = '';
    
    child.stdout.on('data', (data) => {
      output += data.toString();
      event.sender.send('devos:stream', data.toString());
    });

    child.stderr.on('data', (data) => {
      output += data.toString();
      event.sender.send('devos:stream', data.toString());
    });

    child.on('close', (code) => {
      activeChild = null;
      resolve({ success: code === 0, output, code });
    });
  });
});

ipcMain.handle('devos:stop', async () => {
  if (activeChild) {
    activeChild.kill();
    activeChild = null;
    return { success: true };
  }
  return { success: false, error: 'No active task to stop.' };
});

ipcMain.handle('devos:syncIntegrations', async (event, { useWsl, engine }) => {
  runSyncIntegrations(useWsl, engine);
  return { success: true };
});

ipcMain.handle('devos:setSyncInterval', async (event, interval) => {
  syncIntervalValue = interval;
  if (syncIntervalId) {
    clearInterval(syncIntervalId);
    syncIntervalId = null;
  }

  if (interval !== 'off') {
    let ms = 0;
    if (interval === '30m') ms = 30 * 60 * 1000;
    else if (interval === '1h') ms = 60 * 60 * 1000;
    else if (interval === '4h') ms = 4 * 60 * 60 * 1000;
    
    if (ms > 0) {
      syncIntervalId = setInterval(() => {
        runSyncIntegrations(true, 'claude'); // Assume wsl/claude for background for now, could be dynamic
      }, ms);
    }
  }
  broadcastCrawlerState();
  return { success: true };
});

ipcMain.handle('devos:getCrawlerStatus', async () => {
  return { status: crawlerStatus, lastSync, interval: syncIntervalValue };
});

ipcMain.handle('devos:readConfig', async () => {
  try {
    const configPath = path.resolve(process.cwd(), '../../.devos/config.yaml');
    if (fs.existsSync(configPath)) {
      return { success: true, content: fs.readFileSync(configPath, 'utf8') };
    }
    return { success: false, error: 'Config file not found.' };
  } catch (err) {
    return { success: false, error: String(err) };
  }
});

ipcMain.handle('devos:saveConfig', async (event, content) => {
  try {
    const configPath = path.resolve(process.cwd(), '../../.devos/config.yaml');
    fs.writeFileSync(configPath, content, 'utf8');
    return { success: true };
  } catch (err) {
    return { success: false, error: String(err) };
  }
});

ipcMain.handle('devos:readMetrics', async () => {
  try {
    const metricsPath = path.resolve(process.cwd(), '../../.devos/memory/metrics/dora.json');
    if (fs.existsSync(metricsPath)) {
      return { success: true, content: fs.readFileSync(metricsPath, 'utf8') };
    }
    return { success: true, content: '[]' };
  } catch (err) {
    return { success: false, error: String(err) };
  }
});

ipcMain.handle('devos:readKnowledge', async () => {
  try {
    const kbPath = path.resolve(process.cwd(), '../../.devos/memory/brain_kb');
    if (fs.existsSync(kbPath)) {
      const files = fs.readdirSync(kbPath).filter(f => f.endsWith('.md'));
      return { success: true, files };
    }
    return { success: true, files: [] };
  } catch (err) {
    return { success: false, error: String(err) };
  }
});

ipcMain.handle('devos:readPendingTasks', async () => {
  try {
    const statePath = path.resolve(process.cwd(), '../../.devos/memory/state');
    if (fs.existsSync(statePath)) {
      const files = fs.readdirSync(statePath).filter(f => f.endsWith('.md'));
      return { success: true, files };
    }
    return { success: true, files: [] };
  } catch (err) {
    return { success: false, error: String(err) };
  }
});
