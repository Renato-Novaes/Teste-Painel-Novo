const { app, BrowserWindow, shell } = require('electron');
const path = require('path');
const fs = require('fs');

// ── Environment setup (before requiring backend) ──────────────────────
const isPacked = app.isPackaged;

// Database: store in userData so it persists across updates
const userDataPath = app.getPath('userData');
const dbDir = isPacked ? userDataPath : path.join(__dirname, '..', 'backend', 'data');
if (!fs.existsSync(dbDir)) fs.mkdirSync(dbDir, { recursive: true });
process.env.PALLET_DB_PATH = path.join(dbDir, 'pallets.db');

// JWT secret for auth tokens
if (!process.env.JWT_SECRET) {
  process.env.JWT_SECRET = 'pallet_control_jwt_secret_2026_super_secure_key_change_in_production';
}

// Static files directory (built frontend)
const staticDir = isPacked
  ? path.join(process.resourcesPath, 'frontend', 'dist')
  : path.join(__dirname, '..', 'frontend', 'dist');
process.env.PALLET_STATIC_DIR = staticDir;

// Mark as Electron environment
process.env.ELECTRON = '1';

// ── Start Express server ──────────────────────────────────────────────
const PORT = 3456; // Use a less common port to avoid conflicts
process.env.PORT = String(PORT);

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 860,
    minWidth: 900,
    minHeight: 600,
    title: 'PalletControl',
    icon: path.join(__dirname, 'icon.png'),
    backgroundColor: '#0b0f1a',
    autoHideMenuBar: true,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
    },
  });

  // Remove menu bar entirely
  mainWindow.setMenuBarVisibility(false);

  mainWindow.loadURL(`http://localhost:${PORT}`);

  // Open external links in system browser
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(() => {
  // Require backend app (this starts Express)
  require('../backend/src/app');

  // Small delay to let the server bind
  setTimeout(createWindow, 500);
});

app.on('window-all-closed', () => {
  app.quit();
});

app.on('activate', () => {
  if (mainWindow === null) createWindow();
});
