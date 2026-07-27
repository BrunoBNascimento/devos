const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const { spawn } = require('child_process');
const fs = require('fs');

let mainWindow;
let activeWorkspace = null;

// Crawler State
let crawlerStatus = 'idle';
let lastSync = null;
let syncIntervalId = null;
let syncIntervalValue = 'off';

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
  if (crawlerStatus === 'syncing' || !activeWorkspace) return;
  crawlerStatus = 'syncing';
  broadcastCrawlerState();

  let command = engine === 'claude' ? 'claude' : 'gemini';
  let args = ['-p', `Run /devos.daily.`];
  let isShell = true;
  
  if (useWsl && process.platform === 'win32') {
    args = ['--', 'sh', '-c', `zsh -ic '${command} -p "Run /devos.daily." < /dev/null' || bash -ic '${command} -p "Run /devos.daily." < /dev/null'`];
    command = 'wsl';
    isShell = false;
  }

  const child = spawn(command, args, { cwd: activeWorkspace, shell: isShell });

  child.stdout.on('data', (data) => {
    if (mainWindow) mainWindow.webContents.send('devos:crawlerStream', data.toString());
  });

  child.stderr.on('data', (data) => {
    if (mainWindow) mainWindow.webContents.send('devos:crawlerStream', data.toString());
  });

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
        runSyncIntegrations(true, 'claude');
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
    if (!activeWorkspace) return { success: false, error: 'No workspace selected.' };
    const configPath = path.join(activeWorkspace, '.devos', 'config.yaml');
    const examplePath = path.join(activeWorkspace, '.devos', 'config.example.yaml');
    
    if (fs.existsSync(configPath)) {
      return { success: true, content: fs.readFileSync(configPath, 'utf8') };
    } else if (fs.existsSync(examplePath)) {
      return { success: true, content: fs.readFileSync(examplePath, 'utf8') };
    }
    return { success: false, error: 'Config file not found.' };
  } catch (err) {
    return { success: false, error: String(err) };
  }
});

ipcMain.handle('devos:saveConfig', async (event, content) => {
  try {
    if (!activeWorkspace) return { success: false, error: 'No workspace selected.' };
    const configPath = path.join(activeWorkspace, '.devos', 'config.yaml');
    fs.writeFileSync(configPath, content, 'utf8');
    return { success: true };
  } catch (err) {
    return { success: false, error: String(err) };
  }
});

ipcMain.handle('devos:readMetrics', async () => {
  try {
    if (!activeWorkspace) return { success: false, error: 'No workspace selected.' };
    const metricsPath = path.join(activeWorkspace, '.devos', 'memory', 'metrics', 'dora.json');
    if (fs.existsSync(metricsPath)) {
      return { success: true, content: fs.readFileSync(metricsPath, 'utf8') };
    }
    return { success: true, content: '[]' };
  } catch (err) {
    return { success: false, error: String(err) };
  }
});

function parseMd(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const parsed = { filename: filePath.split(/[\\/]/).pop(), title: 'Untitled', summary: '', metadata: {} };
    
    // Extract frontmatter
    const fmMatch = content.match(/^---\r?\n([\s\S]*?)\r?\n---/);
    let body = content;
    if (fmMatch) {
      body = content.substring(fmMatch[0].length);
      fmMatch[1].split('\n').forEach(line => {
        const idx = line.indexOf(':');
        if (idx > -1) {
          const key = line.substring(0, idx).trim();
          const val = line.substring(idx + 1).trim();
          parsed.metadata[key] = val;
        }
      });
    }

    // Extract title
    const lines = body.split('\n');
    let foundTitle = false;
    let summaryLines = [];
    
    for (const line of lines) {
      const trimmed = line.trim();
      
      if (!foundTitle && /^#{1,3}\s+(.*)/.test(trimmed)) {
        parsed.title = trimmed.match(/^#{1,3}\s+(.*)/)[1];
        foundTitle = true;
      } else if (foundTitle) {
        if (trimmed && !trimmed.startsWith('#') && !trimmed.startsWith('-') && !trimmed.startsWith('|') && !trimmed.startsWith('>')) {
          summaryLines.push(trimmed);
        } else if (summaryLines.length > 0) {
          break;
        }
      }
    }
    
    if (summaryLines.length) {
      parsed.summary = summaryLines.join(' ');
      if (parsed.summary.length > 150) parsed.summary = parsed.summary.substring(0, 147) + '...';
    }
    
    parsed.body = body.trim();
    return parsed;
  } catch (err) {
    return { filename: filePath.split(/[\\/]/).pop(), title: 'Error', summary: '', metadata: {} };
  }
}

ipcMain.handle('devos:readKnowledge', async () => {
  try {
    if (!activeWorkspace) return { success: true, files: [] };
    const kbPath = path.join(activeWorkspace, '.devos', 'memory', 'brain_kb');
    if (fs.existsSync(kbPath)) {
      const files = fs.readdirSync(kbPath).filter(f => f.endsWith('.md'));
      const parsedFiles = files.map(f => parseMd(path.join(kbPath, f)));
      return { success: true, files: parsedFiles };
    }
    return { success: true, files: [] };
  } catch (err) {
    return { success: false, error: String(err) };
  }
});

ipcMain.handle('devos:readPendingTasks', async () => {
  try {
    if (!activeWorkspace) return { success: true, files: [] };
    const statePath = path.join(activeWorkspace, '.devos', 'memory', 'state');
    if (fs.existsSync(statePath)) {
      const files = fs.readdirSync(statePath).filter(f => f.endsWith('.md'));
      const parsedFiles = files.map(f => parseMd(path.join(statePath, f)));
      return { success: true, files: parsedFiles };
    }
    return { success: true, files: [] };
  } catch (err) {
    return { success: false, error: String(err) };
  }
});

ipcMain.handle('devos:readTranscripts', async () => {
  try {
    if (!activeWorkspace) return { success: true, files: [] };
    const transcriptsPath = path.join(activeWorkspace, '.devos', 'memory', 'transcripts');
    if (fs.existsSync(transcriptsPath)) {
      const files = fs.readdirSync(transcriptsPath).filter(f => f.endsWith('.md'));
      const parsedFiles = files.map(f => parseMd(path.join(transcriptsPath, f)));
      return { success: true, files: parsedFiles };
    }
    return { success: true, files: [] };
  } catch (err) {
    return { success: false, error: String(err) };
  }
});

ipcMain.handle('devos:selectWorkspace', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openDirectory'],
    title: 'Select DevOS Workspace'
  });
  if (!result.canceled && result.filePaths.length > 0) {
    activeWorkspace = result.filePaths[0];
    return { success: true, workspace: activeWorkspace };
  }
  return { success: false };
});

ipcMain.handle('devos:getActiveWorkspace', () => {
  return activeWorkspace;
});
