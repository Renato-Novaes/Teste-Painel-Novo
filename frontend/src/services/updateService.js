/**
 * Auto-update service for native builds.
 * - Android (Capacitor): Downloads APK from GitHub Releases and installs.
 * - Windows (Electron): Downloads installer via IPC and launches it.
 */

const isElectron = typeof window !== 'undefined' && !!window.electronAPI?.isElectron;
const isCapacitor = typeof window !== 'undefined' && !!window.Capacitor?.isNativePlatform?.();

/* global __APP_VERSION__ */
const CURRENT_VERSION = typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : '0.0.0';

// ── Electron (Windows) ────────────────────────────────────────────────

async function checkForUpdateElectron() {
  try {
    return await window.electronAPI.checkForUpdate();
  } catch {
    return null;
  }
}

function downloadAndInstallElectron(downloadUrl, fileName, onProgress) {
  return new Promise((resolve, reject) => {
    // Listen for progress from main process
    window.electronAPI.onUpdateProgress((pct) => onProgress?.(pct));

    window.electronAPI.downloadUpdate(downloadUrl, fileName)
      .then((installerPath) => {
        window.electronAPI.removeUpdateProgress();
        onProgress?.(100);
        // Small delay then install
        return window.electronAPI.installUpdate(installerPath);
      })
      .then(resolve)
      .catch((err) => {
        window.electronAPI.removeUpdateProgress();
        reject(err);
      });
  });
}

// ── Capacitor (Android) ───────────────────────────────────────────────

const GITHUB_REPO = 'Renato-Novaes/Teste-Painel-Novo';

function isNewer(remote, local) {
  const r = remote.replace(/^v/, '').split('.').map(Number);
  const l = local.replace(/^v/, '').split('.').map(Number);
  for (let i = 0; i < 3; i++) {
    if ((r[i] || 0) > (l[i] || 0)) return true;
    if ((r[i] || 0) < (l[i] || 0)) return false;
  }
  return false;
}

async function checkForUpdateCapacitor() {
  try {
    const res = await fetch(
      `https://api.github.com/repos/${GITHUB_REPO}/releases/latest`,
      { headers: { Accept: 'application/vnd.github.v3+json' } }
    );
    if (!res.ok) return null;
    const release = await res.json();
    const latestVersion = release.tag_name.replace(/^v/, '');

    if (!isNewer(latestVersion, CURRENT_VERSION)) return null;

    const apkAsset = release.assets.find(a => a.name.endsWith('.apk'));
    if (!apkAsset) return null;

    return {
      version: latestVersion,
      currentVersion: CURRENT_VERSION,
      notes: release.body,
      downloadUrl: apkAsset.browser_download_url,
      size: apkAsset.size,
      fileName: apkAsset.name,
    };
  } catch {
    return null;
  }
}

function downloadAndInstallCapacitor(downloadUrl, onProgress) {
  return new Promise(async (resolve, reject) => {
    try {
      const { Filesystem, Directory } = await import('@capacitor/filesystem');
      const { registerPlugin } = await import('@capacitor/core');
      const ApkInstaller = registerPlugin('ApkInstaller');

      const xhr = new XMLHttpRequest();
      xhr.open('GET', downloadUrl, true);
      xhr.responseType = 'blob';

      xhr.onprogress = (e) => {
        if (e.lengthComputable && onProgress) {
          onProgress(Math.round((e.loaded / e.total) * 100));
        }
      };

      xhr.onload = async () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          try {
            onProgress?.(100);
            const blob = xhr.response;
            const base64 = await blobToBase64(blob);

            await Filesystem.writeFile({
              path: 'update.apk',
              data: base64,
              directory: Directory.Cache,
            });

            const { uri } = await Filesystem.getUri({
              path: 'update.apk',
              directory: Directory.Cache,
            });

            const nativePath = uri.replace('file://', '');
            await ApkInstaller.install({ path: nativePath });
            resolve();
          } catch (e) {
            reject(e);
          }
        } else {
          reject(new Error(`Download failed: HTTP ${xhr.status}`));
        }
      };

      xhr.onerror = () => reject(new Error('Download failed — check your connection'));
      xhr.send();
    } catch (e) {
      reject(e);
    }
  });
}

function blobToBase64(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64 = reader.result.split(',')[1];
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

// ── Unified API ───────────────────────────────────────────────────────

export async function checkForUpdate() {
  if (isElectron) return checkForUpdateElectron();
  if (isCapacitor) return checkForUpdateCapacitor();
  return null;
}

export function downloadAndInstall(updateInfo, onProgress) {
  if (isElectron) return downloadAndInstallElectron(updateInfo.downloadUrl, updateInfo.fileName, onProgress);
  if (isCapacitor) return downloadAndInstallCapacitor(updateInfo.downloadUrl, onProgress);
  return Promise.reject(new Error('Platform not supported'));
}

export { CURRENT_VERSION, isElectron, isCapacitor };
