const { app, BrowserWindow, shell, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');
const https = require('https');
const http = require('http');
const os = require('os');

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

// ── Auto-update via GitHub Releases (Windows) ────────────────────────
const GITHUB_REPO = 'Renato-Novaes/Teste-Painel-Novo';
const CURRENT_VERSION = require('../package.json').version;

function isNewer(remote, local) {
  const r = remote.replace(/^v/, '').split('.').map(Number);
  const l = local.replace(/^v/, '').split('.').map(Number);
  for (let i = 0; i < 3; i++) {
    if ((r[i] || 0) > (l[i] || 0)) return true;
    if ((r[i] || 0) < (l[i] || 0)) return false;
  }
  return false;
}

function httpsGet(url) {
  return new Promise((resolve, reject) => {
    const doRequest = (reqUrl) => {
      https.get(reqUrl, { headers: { 'User-Agent': 'PalletControl', Accept: 'application/vnd.github.v3+json' } }, (res) => {
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          return doRequest(res.headers.location);
        }
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => resolve({ status: res.statusCode, data }));
      }).on('error', reject);
    };
    doRequest(url);
  });
}

ipcMain.handle('update:check', async () => {
  try {
    const res = await httpsGet(`https://api.github.com/repos/${GITHUB_REPO}/releases/latest`);
    if (res.status !== 200) return null;
    const release = JSON.parse(res.data);
    const latestVersion = release.tag_name.replace(/^v/, '');
    if (!isNewer(latestVersion, CURRENT_VERSION)) return null;

    // Look for .exe or Windows .zip asset
    const asset = release.assets.find(a => a.name.endsWith('.exe')) ||
                  release.assets.find(a => a.name.toLowerCase().includes('windows') && a.name.endsWith('.zip'));
    if (!asset) return null;

    return {
      version: latestVersion,
      currentVersion: CURRENT_VERSION,
      notes: release.body,
      downloadUrl: asset.browser_download_url,
      size: asset.size,
      fileName: asset.name,
    };
  } catch {
    return null;
  }
});

ipcMain.handle('update:download', async (_event, downloadUrl, fileName) => {
  const tmpDir = path.join(os.tmpdir(), 'palletcontrol-update');
  if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir, { recursive: true });
  const filePath = path.join(tmpDir, fileName);

  return new Promise((resolve, reject) => {
    const doDownload = (url) => {
      const proto = url.startsWith('https') ? https : http;
      proto.get(url, { headers: { 'User-Agent': 'PalletControl' } }, (res) => {
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          return doDownload(res.headers.location);
        }
        if (res.statusCode !== 200) {
          return reject(new Error(`Download failed: HTTP ${res.statusCode}`));
        }
        const total = parseInt(res.headers['content-length'], 10) || 0;
        let downloaded = 0;
        const file = fs.createWriteStream(filePath);

        res.on('data', (chunk) => {
          downloaded += chunk.length;
          file.write(chunk);
          if (total > 0 && mainWindow) {
            mainWindow.webContents.send('update:progress', Math.round((downloaded / total) * 100));
          }
        });

        res.on('end', () => {
          file.end(() => resolve(filePath));
        });

        res.on('error', (err) => {
          file.close();
          fs.unlinkSync(filePath);
          reject(err);
        });
      }).on('error', reject);
    };
    doDownload(downloadUrl);
  });
});

ipcMain.handle('update:install', async (_event, installerPath) => {
  const { spawn } = require('child_process');
  // Launch installer and quit app
  spawn(installerPath, { detached: true, stdio: 'ignore' }).unref();
  setTimeout(() => app.quit(), 500);
  return true;
});
