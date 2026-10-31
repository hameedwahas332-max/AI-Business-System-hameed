/**
 * Enterprise Automatic Update & Sovereign Release Verifier
 * Architecture: Official Tauri 2 Updater & Process Engine with Ed25519 Cryptographic Verification
 */

import { check, Update } from '@tauri-apps/plugin-updater';
import { relaunch } from '@tauri-apps/plugin-process';
import { getVersion } from '@tauri-apps/api/app';

export interface UpdateCheckResult {
  hasUpdate: boolean;
  currentVersion: string;
  availableVersion?: string;
  notes?: string;
  pubDate?: string;
  updateHandle?: Update | null;
  error?: string;
  isWebPreview?: boolean;
}

export const CURRENT_APP_VERSION = '2.4.1';

/**
 * Returns true if running within the Tauri desktop application runtime
 */
export function isTauriEnvironment(): boolean {
  return typeof window !== 'undefined' && Boolean((window as any).__TAURI_INTERNALS__ || (window as any).__TAURI__);
}

/**
 * Compare two semver strings: returns 1 if v1 > v2, -1 if v1 < v2, 0 if equal
 */
export function compareSemver(v1: string, v2: string): number {
  const clean1 = v1.replace(/^v/, '').trim();
  const clean2 = v2.replace(/^v/, '').trim();

  const parts1 = clean1.split('.').map(n => parseInt(n, 10) || 0);
  const parts2 = clean2.split('.').map(n => parseInt(n, 10) || 0);

  for (let i = 0; i < Math.max(parts1.length, parts2.length); i++) {
    const p1 = parts1[i] || 0;
    const p2 = parts2[i] || 0;
    if (p1 > p2) return 1;
    if (p1 < p2) return -1;
  }
  return 0;
}

/**
 * Fetch the actual installed application version from Tauri app metadata
 */
export async function getInstalledAppVersion(): Promise<string> {
  if (isTauriEnvironment()) {
    try {
      const v = await getVersion();
      if (v) return v;
    } catch (err) {
      console.warn('[UpdaterService] Could not read app version from Tauri, using authoritative version:', err);
    }
  }
  return CURRENT_APP_VERSION;
}

/**
 * Check for updates against GitHub Releases latest.json or the official Tauri 2 plugin
 */
export async function checkForUpdates(isManualCheck = false): Promise<UpdateCheckResult> {
  const currentVer = await getInstalledAppVersion();

  // 1. Production Tauri Desktop Mode: Use official signed updater plugin
  if (isTauriEnvironment()) {
    try {
      const update = await check();
      if (update && update.available) {
        return {
          hasUpdate: true,
          currentVersion: currentVer,
          availableVersion: update.version,
          notes: update.body || 'تحديث أمني وسيادي معتمد لنظام المحاسبي الذكي ERP - محلات وهاس للتجارة العامة.',
          pubDate: update.date,
          updateHandle: update,
          isWebPreview: false
        };
      } else {
        return {
          hasUpdate: false,
          currentVersion: currentVer,
          availableVersion: currentVer,
          isWebPreview: false
        };
      }
    } catch (pluginErr: any) {
      console.error('[UpdaterService] Official Tauri updater check failed:', pluginErr);
      return {
        hasUpdate: false,
        currentVersion: currentVer,
        error: `خطأ أثناء التحقق من التحديث الرقمي: ${pluginErr?.message || 'فشل الاتصال بالخادم المرجعي'}`
      };
    }
  }

  // 2. Web Browser Preview Mode: Query manifest for read-only status (Never simulates install)
  try {
    const manifestUrl = 'https://raw.githubusercontent.com/hameedwahas332-max/AI-Business-System-hameed/main/latest.json';
    const res = await fetch(manifestUrl, { cache: 'no-store' });
    if (res.ok) {
      const data = await res.json();
      const latestVer = data.version || CURRENT_APP_VERSION;
      const isNewer = compareSemver(latestVer, currentVer) > 0;

      return {
        hasUpdate: isNewer,
        currentVersion: currentVer,
        availableVersion: latestVer,
        notes: data.notes || 'تحديث جديد معتمد لنظام المحاسبي الذكي ERP.',
        pubDate: data.pub_date,
        updateHandle: null,
        isWebPreview: true
      };
    }
  } catch (netErr: any) {
    if (isManualCheck) {
      return {
        hasUpdate: false,
        currentVersion: currentVer,
        error: 'تعذر الاتصال بخادم التحديثات المركزية. يرجى التحقق من اتصال الإنترنت والمحاولة لاحقاً.',
        isWebPreview: true
      };
    }
  }

  return {
    hasUpdate: false,
    currentVersion: currentVer,
    isWebPreview: true
  };
}

/**
 * Download and install the update safely using the official Tauri updater.
 * NO FAKE PROGRESS: Strictly executes actual download and cryptographic signature verification.
 */
export async function downloadAndApplyUpdate(
  updateHandle: Update | null | undefined,
  onProgress?: (percent: number, downloadedBytes: number, totalBytes: number) => void
): Promise<boolean> {
  if (!isTauriEnvironment() || !updateHandle || typeof updateHandle.downloadAndInstall !== 'function') {
    throw new Error(
      'التثبيت التلقائي للتحديثات متاح حصراً داخل تطبيق سطح المكتب لنظام ويندوز. في وضع المتصفح، يرجى تنزيل مثبت التحديث يدوياً.'
    );
  }

  let downloaded = 0;
  let contentLength = 0;

  // Execute actual download and Ed25519 signature verification via Tauri 2 Rust engine
  await updateHandle.downloadAndInstall((event: any) => {
    if (event.event === 'Started') {
      contentLength = event.data?.contentLength || 0;
      onProgress?.(0, 0, contentLength);
    } else if (event.event === 'Progress') {
      downloaded += event.data?.chunkLength || 0;
      const percent = contentLength > 0 ? Math.round((downloaded / contentLength) * 100) : 0;
      onProgress?.(percent, downloaded, contentLength);
    } else if (event.event === 'Finished') {
      onProgress?.(100, contentLength, contentLength);
    }
  });

  return true;
}

/**
 * Relaunch the application after successful update using official process plugin
 */
export async function restartApplication(): Promise<void> {
  if (isTauriEnvironment()) {
    try {
      await relaunch();
      return;
    } catch (err) {
      console.error('[UpdaterService] Failed to relaunch app via plugin-process:', err);
    }
  }

  // Web fallback reload
  if (typeof window !== 'undefined') {
    window.location.reload();
  }
}
