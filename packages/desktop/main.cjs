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

  // Use app.isPackaged to determine if we are in dev mode
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

const fs = require('fs');

// IPC handler to execute the DevOS command via child process
ipcMain.handle('devos:execute', async (event, { task, engine, useWsl }) => {
  return new Promise((resolve, reject) => {
    // Engine can be "claude" or "gemini"
    let command = engine === 'claude' ? 'claude' : 'gemini';
    let args = ['-p', `Run /devos.develop for Jira Task ${task}. Use DevOS Orchestrator persona.`];
    
    // If running on Windows and the user checked "Use WSL", we bridge the gap.
    // We must use an interactive shell (-ic) so that NVM and global npm paths are loaded.
    if (useWsl) {
      // Escape inner quotes
      const taskEscaped = task.replace(/"/g, '\\"');
      const innerCmd = `${command} -p "Run /devos.develop for Jira Task ${taskEscaped}. Use DevOS Orchestrator persona."`;
      
      // We wrap it in a shell invocation. We default to zsh since it threw a zsh error earlier, 
      // but fallback to bash if zsh isn't standard. Actually, running `wsl $SHELL -ic` works best in linux.
      args = ['--', 'sh', '-c', `zsh -ic '${innerCmd}' || bash -ic '${innerCmd}'`];
      command = 'wsl';
    }
    
    // Spawning hidden CLI process
    const cwd = path.resolve(process.cwd(), '../../'); // Go up to workspace root from desktop folder
    
    const child = spawn(command, args, { cwd, shell: true });
    
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
      resolve({ success: code === 0, output, code });
    });
  });
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
