const { app, BrowserWindow, Menu, shell, ipcMain } = require('electron');
const path = require('path');
const { spawn } = require('child_process');
const isDev = process.argv.includes('--dev');

let mainWindow;
let backendProcess;

// ========================================
// DÉMARRAGE DU BACKEND NODE.JS
// ========================================
function startBackend() {
  const backendPath = isDev
    ? path.join(__dirname, '../../backend')
    : path.join(process.resourcesPath, 'backend');

  const nodeExe = isDev ? 'node' : path.join(process.resourcesPath, 'node', 'node.exe');
  const scriptPath = isDev
    ? path.join(backendPath, 'src/index.ts')
    : path.join(backendPath, 'dist/index.js');

  const cmd = isDev ? 'npx' : nodeExe;
  const args = isDev ? ['ts-node', scriptPath] : [scriptPath];

  console.log(`[Electron] Démarrage backend: ${cmd} ${args.join(' ')}`);

  backendProcess = spawn(cmd, args, {
    cwd: backendPath,
    env: {
      ...process.env,
      PORT: '5000',
      NODE_ENV: isDev ? 'development' : 'production',
      DATABASE_URL: isDev
        ? 'postgresql://pani_user:pani_pass@localhost:5432/pani_gestion'
        : `file:${path.join(app.getPath('userData'), 'pani_local.db')}`,
      JWT_SECRET: 'pani_secret_key_electron_local_2024',
      JWT_EXPIRES_IN: '24h',
      UPLOAD_DIR: path.join(app.getPath('userData'), 'uploads'),
    },
    shell: true,
  });

  backendProcess.stdout.on('data', (data) => {
    console.log(`[Backend] ${data.toString().trim()}`);
  });

  backendProcess.stderr.on('data', (data) => {
    console.error(`[Backend ERROR] ${data.toString().trim()}`);
  });

  backendProcess.on('exit', (code) => {
    console.log(`[Backend] Processus terminé avec code ${code}`);
  });
}

// ========================================
// VÉRIFIER QUE LE BACKEND EST PRÊT
// ========================================
function waitForBackend(url, retries = 20) {
  return new Promise((resolve, reject) => {
    const http = require('http');
    let attempts = 0;

    const check = () => {
      attempts++;
      http.get(url, (res) => {
        console.log(`[Electron] Backend prêt! (tentative ${attempts})`);
        resolve();
      }).on('error', () => {
        if (attempts >= retries) {
          reject(new Error('Backend non disponible'));
        } else {
          setTimeout(check, 1000);
        }
      });
    };
    check();
  });
}

// ========================================
// CRÉATION DE LA FENÊTRE PRINCIPALE
// ========================================
async function createWindow() {
  // Démarrer le backend local
  startBackend();

  // Attendre que le backend soit prêt
  try {
    await waitForBackend('http://localhost:5000/api/health');
  } catch (e) {
    console.warn('[Electron] Backend pas encore prêt, on continue quand même...');
  }

  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
    },
    icon: path.join(__dirname, '../assets/icon.ico'),
    title: 'PANI GESTION',
    show: false, // Don't show until ready
  });

  // Load the app
  const appUrl = isDev
    ? 'http://localhost:5173' // Vite dev server
    : `file://${path.join(__dirname, '../../frontend/dist/index.html')}`;

  mainWindow.loadURL(appUrl);

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    if (isDev) {
      mainWindow.webContents.openDevTools();
    }
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  // Menu application
  setupMenu();
}

// ========================================
// MENU
// ========================================
function setupMenu() {
  const template = [
    {
      label: 'PANI GESTION',
      submenu: [
        {
          label: 'À propos',
          click: () => {
            mainWindow.webContents.send('show-about');
          },
        },
        { type: 'separator' },
        {
          label: 'Quitter',
          accelerator: 'CmdOrCtrl+Q',
          click: () => app.quit(),
        },
      ],
    },
    {
      label: 'Affichage',
      submenu: [
        { role: 'reload', label: 'Actualiser' },
        { role: 'forceReload', label: 'Forcer l\'actualisation' },
        { type: 'separator' },
        { role: 'resetZoom', label: 'Zoom normal' },
        { role: 'zoomIn', label: 'Zoom avant' },
        { role: 'zoomOut', label: 'Zoom arrière' },
        { type: 'separator' },
        { role: 'togglefullscreen', label: 'Plein écran' },
      ],
    },
    {
      label: 'Aide',
      submenu: [
        {
          label: 'Documentation',
          click: () => shell.openExternal('https://pani-gestion.com/docs'),
        },
      ],
    },
  ];

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

// ========================================
// GESTION IPC
// ========================================
ipcMain.handle('get-app-version', () => app.getVersion());
ipcMain.handle('get-user-data-path', () => app.getPath('userData'));

// ========================================
// ÉVÉNEMENTS APP
// ========================================
app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  // Arrêter le backend
  if (backendProcess) {
    backendProcess.kill();
  }
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

app.on('before-quit', () => {
  if (backendProcess) {
    backendProcess.kill();
  }
});

