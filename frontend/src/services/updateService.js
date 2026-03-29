/**
 * Auto-update service for native (Android) builds.
 * Checks GitHub Releases for newer versions and downloads/installs APK.
 */
import { Filesystem, Directory } from '@capacitor/filesystem';
import { registerPlugin } from '@capacitor/core';

const ApkInstaller = registerPlugin('ApkInstaller');
const GITHUB_REPO = 'Renato-Novaes/Teste-Painel-Novo';

/* global __APP_VERSION__ */
const CURRENT_VERSION = typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : '0.0.0';

function isNewer(remote, local) {
  const r = remote.replace(/^v/, '').split('.').map(Number);
  const l = local.replace(/^v/, '').split('.').map(Number);
  for (let i = 0; i < 3; i++) {
    if ((r[i] || 0) > (l[i] || 0)) return true;
    if ((r[i] || 0) < (l[i] || 0)) return false;
  }
  return false;
}

/**
 * Check GitHub releases for a newer version.
 * Returns update info or null if up-to-date.
 */
export async function checkForUpdate() {
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
    };
  } catch {
    return null;
  }
}

/**
 * Download APK from url, save to cache, then trigger install.
 * @param {string} downloadUrl
 * @param {(pct: number) => void} onProgress  0-100
 */
export function downloadAndInstall(downloadUrl, onProgress) {
  return new Promise((resolve, reject) => {
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

          // Convert blob to base64 for Filesystem.writeFile
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
  });
}

function blobToBase64(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      // result is "data:application/...;base64,XXXX" — we only need the XXXX part
      const base64 = reader.result.split(',')[1];
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

export { CURRENT_VERSION };
