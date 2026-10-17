/**
 * In-App Software Update Manager for PWA & Installed Mobile/Desktop ERP
 * Allows one-click detection and execution of updates when developer deploys new features or fixes.
 */

import { useState, useEffect, useCallback } from 'react';
import { isStandaloneMode } from './fileSaver';

export interface AppVersionData {
  version: string;
  buildTime: string;
  buildTimestamp: number;
  releaseName: string;
  releaseNotes: string;
  currentTime?: number;
}

export const APP_CURRENT_FALLBACK_VERSION = 'v3.0.0 Ultra';
const STORAGE_KEY_BUILD_TS = 'dealer_erp_active_build_ts';
const STORAGE_KEY_VERSION = 'dealer_erp_active_version';
const STORAGE_KEY_LAST_CHECK = 'dealer_erp_last_update_check_time';
const STORAGE_KEY_DISMISSED_UPDATE = 'dealer_erp_dismissed_update_ts';

export const getStoredBuildTimestamp = (): number => {
  if (typeof window === 'undefined') return 0;
  const val = localStorage.getItem(STORAGE_KEY_BUILD_TS);
  return val ? parseInt(val, 10) : 0;
};

export const getStoredAppVersion = (): string => {
  if (typeof window === 'undefined') return APP_CURRENT_FALLBACK_VERSION;
  return localStorage.getItem(STORAGE_KEY_VERSION) || APP_CURRENT_FALLBACK_VERSION;
};

/**
 * Fetch latest version metadata directly from server bypassing all caches
 */
export const fetchServerVersion = async (): Promise<AppVersionData | null> => {
  try {
    const res = await fetch(`/api/app/version?_t=${Date.now()}`, {
      method: 'GET',
      cache: 'no-store',
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        Pragma: 'no-cache',
      },
    });
    if (!res.ok) return null;
    const data = await res.json();
    if (data.success) {
      return data;
    }
    return null;
  } catch (err) {
    console.warn('Unable to check server version (offline or unreachable):', err);
    return null;
  }
};

/**
 * Executes a full cache purge and service-worker activation to apply updates to installed PWA
 */
export const applyApplicationUpdate = async (onStatus?: (status: string) => void): Promise<void> => {
  try {
    onStatus?.('সার্ভিস ওয়ার্কার সিঙ্ক হচ্ছে...');

    // 1. Trigger Service Worker SKIP_WAITING and CLEAR_ALL_CACHES
    if ('serviceWorker' in navigator) {
      const registrations = await navigator.serviceWorker.getRegistrations();
      for (const reg of registrations) {
        if (reg.waiting) {
          reg.waiting.postMessage({ type: 'SKIP_WAITING' });
        }
        if (reg.active) {
          reg.active.postMessage({ type: 'CLEAR_ALL_CACHES' });
          reg.active.postMessage({ type: 'SKIP_WAITING' });
        }
        if (reg.installing) {
          reg.installing.postMessage({ type: 'SKIP_WAITING' });
        }
        try {
          await reg.update();
        } catch {
          // ignore offline update error
        }
      }
    }

    onStatus?.('পুরনো ক্যাশ ও টেম্প ফাইল পরিষ্কার করা হচ্ছে...');

    // 2. Clear browser CacheStorage directly
    if ('caches' in window) {
      try {
        const cacheKeys = await caches.keys();
        await Promise.all(cacheKeys.map((key) => caches.delete(key)));
      } catch (cacheErr) {
        console.warn('CacheStorage clear note:', cacheErr);
      }
    }

    // 3. Fetch fresh version info to store active build
    const serverInfo = await fetchServerVersion();
    if (serverInfo) {
      localStorage.setItem(STORAGE_KEY_BUILD_TS, String(serverInfo.buildTimestamp));
      localStorage.setItem(STORAGE_KEY_VERSION, `v${serverInfo.version} Pro`);
    }

    onStatus?.('আপডেট সফল! নতুন ভার্সন লোড হচ্ছে...');

    // 4. Force reload without using cached assets
    setTimeout(() => {
      const targetUrl = new URL(window.location.href);
      targetUrl.searchParams.set('_v_reload', String(Date.now()));
      window.location.replace(targetUrl.toString());
    }, 600);
  } catch (err) {
    console.error('Failed to apply application update cleanly:', err);
    window.location.reload();
  }
};

/**
 * React Hook for In-App Live Update Management
 */
export const useAppUpdate = () => {
  const [isChecking, setIsChecking] = useState<boolean>(false);
  const [isUpdating, setIsUpdating] = useState<boolean>(false);
  const [updateStatusText, setUpdateStatusText] = useState<string>('');
  const [isUpdateAvailable, setIsUpdateAvailable] = useState<boolean>(false);
  const [serverVersion, setServerVersion] = useState<AppVersionData | null>(null);
  const [currentVersion, setCurrentVersion] = useState<string>(getStoredAppVersion());
  const [lastCheckTime, setLastCheckTime] = useState<number>(() => {
    const saved = localStorage.getItem(STORAGE_KEY_LAST_CHECK);
    return saved ? parseInt(saved, 10) : 0;
  });
  const [isBannerDismissed, setIsBannerDismissed] = useState<boolean>(false);

  const isStandalone = isStandaloneMode();

  // Core Check Function
  const checkForUpdates = useCallback(async (isManual: boolean = false): Promise<boolean> => {
    if (isChecking || isUpdating) return false;
    setIsChecking(true);
    if (isManual) {
      setUpdateStatusText('সার্ভারে নতুন ভার্সন চেক করা হচ্ছে...');
    }

    try {
      // 1. Service Worker update check
      let swHasWaiting = false;
      if ('serviceWorker' in navigator) {
        try {
          const registrations = await navigator.serviceWorker.getRegistrations();
          for (const reg of registrations) {
            await reg.update();
            if (reg.waiting || (reg.installing && reg.active)) {
              swHasWaiting = true;
            }
          }
        } catch (swErr) {
          console.debug('SW registration update note:', swErr);
        }
      }

      // 2. Query Server Version API
      const serverData = await fetchServerVersion();
      const now = Date.now();
      localStorage.setItem(STORAGE_KEY_LAST_CHECK, String(now));
      setLastCheckTime(now);

      if (serverData) {
        setServerVersion(serverData);
        const storedTs = getStoredBuildTimestamp();

        // If this is the first visit on this browser, record the current build ts
        if (!storedTs) {
          localStorage.setItem(STORAGE_KEY_BUILD_TS, String(serverData.buildTimestamp));
          localStorage.setItem(STORAGE_KEY_VERSION, `v${serverData.version} Pro`);
          setCurrentVersion(`v${serverData.version} Pro`);
          setIsUpdateAvailable(false);
          return false;
        }

        // Check if server version is actually newer than current version
        const cleanCurrentVer = currentVersion.replace(/[^0-9.]/g, '');
        const cleanServerVer = (serverData.version || '').replace(/[^0-9.]/g, '');
        const isNewer = (cleanServerVer !== cleanCurrentVer && serverData.buildTimestamp > storedTs) || swHasWaiting;

        if (isNewer) {
          setIsUpdateAvailable(true);
          const dismissedTs = localStorage.getItem(STORAGE_KEY_DISMISSED_UPDATE);
          if (dismissedTs && parseInt(dismissedTs, 10) === serverData.buildTimestamp && !isManual) {
            setIsBannerDismissed(true);
          } else {
            setIsBannerDismissed(false);
          }
          return true;
        } else {
          setIsUpdateAvailable(false);
          return false;
        }
      } else if (swHasWaiting) {
        setIsUpdateAvailable(true);
        setIsBannerDismissed(false);
        return true;
      } else {
        setIsUpdateAvailable(false);
        return false;
      }
    } catch (e) {
      console.warn('Check for update note:', e);
      return false;
    } finally {
      setIsChecking(false);
      setUpdateStatusText('');
    }
  }, [isChecking, isUpdating]);

  // Execute Update Trigger
  const triggerUpdate = useCallback(async () => {
    setIsUpdating(true);
    setUpdateStatusText('অ্যাপ আপডেট প্রক্রিয়া শুরু হচ্ছে...');
    try {
      await applyApplicationUpdate((status) => setUpdateStatusText(status));
    } catch (err) {
      console.error('Trigger update error:', err);
      setIsUpdating(false);
      setUpdateStatusText('আপডেট ব্যর্থ হয়েছে। পুনরায় চেষ্টা করুন।');
    }
  }, []);

  // Dismiss update banner temporarily
  const dismissBanner = useCallback(() => {
    setIsBannerDismissed(true);
    if (serverVersion) {
      localStorage.setItem(STORAGE_KEY_DISMISSED_UPDATE, String(serverVersion.buildTimestamp));
    }
  }, [serverVersion]);

  // Initial check on mount + listen to SW updatefound
  useEffect(() => {
    // Check on load
    checkForUpdates(false);

    // Listen to service worker updatefound
    if ('serviceWorker' in navigator) {
      const handleControllerChange = () => {
        setIsUpdateAvailable(true);
      };
      navigator.serviceWorker.addEventListener('controllerchange', handleControllerChange);
      return () => {
        navigator.serviceWorker.removeEventListener('controllerchange', handleControllerChange);
      };
    }
  }, [checkForUpdates]);

  // Check on window focus or visibility change (e.g. user reopens installed app)
  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        const lastCheck = localStorage.getItem(STORAGE_KEY_LAST_CHECK);
        const diff = Date.now() - (lastCheck ? parseInt(lastCheck, 10) : 0);
        // If it's been more than 60 seconds since last check, auto-check
        if (diff > 60000) {
          checkForUpdates(false);
        }
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);
    window.addEventListener('focus', handleVisibility);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibility);
      window.removeEventListener('focus', handleVisibility);
    };
  }, [checkForUpdates]);

  return {
    isUpdateAvailable,
    isChecking,
    isUpdating,
    updateStatusText,
    serverVersion,
    currentVersion,
    lastCheckTime,
    isBannerDismissed,
    isStandalone,
    checkForUpdates,
    triggerUpdate,
    dismissBanner,
  };
};
