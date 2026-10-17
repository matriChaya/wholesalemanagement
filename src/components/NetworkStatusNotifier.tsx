import React, { useState, useEffect, useRef } from 'react';
import { useWholesale } from '../context/WholesaleContext';
import { translations } from '../utils/translations';
import {
  Wifi,
  WifiOff,
  Cloud,
  CloudOff,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  X,
  Database,
  Radio,
  ArrowUpRight,
  ShieldCheck,
  Check
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface NetworkToastState {
  isOpen: boolean;
  status: 'online' | 'offline';
  timestamp: number;
  message?: string;
}

export const NetworkStatusNotifier: React.FC = () => {
  const {
    language,
    isOnline: contextIsOnline,
    isSimulatedOffline,
    toggleSimulateOffline,
    hasPendingWrites,
    isFromCache,
    offlineQueueCount,
    openBackupModal,
    syncPendingOfflineData,
    isSyncingToCloud,
  } = useWholesale();

  const t = translations[language];

  // Internal online status tracking (combines native navigator and simulated offline mode)
  const [networkOnline, setNetworkOnline] = useState<boolean>(() => {
    return typeof navigator !== 'undefined' ? navigator.onLine && !isSimulatedOffline : true;
  });

  const [toast, setToast] = useState<NetworkToastState | null>(null);
  const [isMinimized, setIsMinimized] = useState<boolean>(false);
  const [isChecking, setIsChecking] = useState<boolean>(false);
  const [progress, setProgress] = useState<number>(100);

  const prevStatusRef = useRef<boolean>(networkOnline);
  const hasMountedRef = useRef<boolean>(false);
  const autoDismissTimerRef = useRef<NodeJS.Timeout | null>(null);
  const progressIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Clear timers helper
  const clearTimers = () => {
    if (autoDismissTimerRef.current) {
      clearTimeout(autoDismissTimerRef.current);
      autoDismissTimerRef.current = null;
    }
    if (progressIntervalRef.current) {
      clearInterval(progressIntervalRef.current);
      progressIntervalRef.current = null;
    }
  };

  // Trigger toast with auto-dismiss logic
  const triggerToast = (status: 'online' | 'offline') => {
    clearTimers();
    setIsMinimized(false);
    setProgress(100);

    setToast({
      isOpen: true,
      status,
      timestamp: Date.now(),
    });

    // If online, auto-dismiss after 6 seconds with animated countdown progress
    if (status === 'online') {
      const duration = 6000;
      const intervalTime = 50;
      const step = (intervalTime / duration) * 100;

      progressIntervalRef.current = setInterval(() => {
        setProgress((prev) => {
          if (prev <= step) {
            clearInterval(progressIntervalRef.current!);
            return 0;
          }
          return prev - step;
        });
      }, intervalTime);

      autoDismissTimerRef.current = setTimeout(() => {
        setToast((prev) => (prev?.status === 'online' ? null : prev));
      }, duration);
    }
  };

  // Window browser online/offline listeners
  useEffect(() => {
    const handleBrowserOnline = () => {
      const newStatus = true && !isSimulatedOffline;
      setNetworkOnline(newStatus);
      if (hasMountedRef.current && prevStatusRef.current !== newStatus) {
        prevStatusRef.current = newStatus;
        triggerToast('online');
      }
    };

    const handleBrowserOffline = () => {
      setNetworkOnline(false);
      if (hasMountedRef.current && prevStatusRef.current !== false) {
        prevStatusRef.current = false;
        triggerToast('offline');
      }
    };

    window.addEventListener('online', handleBrowserOnline);
    window.addEventListener('offline', handleBrowserOffline);

    // Mark as mounted after brief delay so initial load doesn't fire an unsolicited online pop
    const mountTimer = setTimeout(() => {
      hasMountedRef.current = true;
      // If initial state is offline, show offline notice
      if (!navigator.onLine || isSimulatedOffline) {
        prevStatusRef.current = false;
        setNetworkOnline(false);
        triggerToast('offline');
      }
    }, 800);

    return () => {
      window.removeEventListener('online', handleBrowserOnline);
      window.removeEventListener('offline', handleBrowserOffline);
      clearTimeout(mountTimer);
      clearTimers();
    };
  }, []);

  // Listen to context status changes (e.g. simulated offline mode toggle)
  useEffect(() => {
    const effectiveStatus = contextIsOnline;
    if (networkOnline !== effectiveStatus) {
      setNetworkOnline(effectiveStatus);
      if (hasMountedRef.current && prevStatusRef.current !== effectiveStatus) {
        prevStatusRef.current = effectiveStatus;
        triggerToast(effectiveStatus ? 'online' : 'offline');
      }
    }
  }, [contextIsOnline]);

  // Handle manual connectivity verification
  const handleCheckConnectivity = async () => {
    setIsChecking(true);
    try {
      if (isSimulatedOffline) {
        await new Promise((r) => setTimeout(r, 600));
        setIsChecking(false);
        return;
      }

      // Test real reachability
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3000);
      
      const res = await fetch('/api/health', {
        method: 'GET',
        signal: controller.signal,
        cache: 'no-store'
      }).catch(() => null);

      clearTimeout(timeoutId);

      const isReachable = Boolean(res && res.ok);
      if (isReachable) {
        setNetworkOnline(true);
        prevStatusRef.current = true;
        triggerToast('online');
      } else {
        setNetworkOnline(false);
        prevStatusRef.current = false;
        triggerToast('offline');
      }
    } catch {
      setNetworkOnline(false);
      prevStatusRef.current = false;
      triggerToast('offline');
    } finally {
      setIsChecking(false);
    }
  };

  const handleDismiss = () => {
    clearTimers();
    if (toast?.status === 'offline') {
      setIsMinimized(true);
    }
    setToast(null);
  };

  const isCurrentOffline = !networkOnline;

  return (
    <>
      {/* 1. Main Floating Connectivity Toast */}
      <div
        id="connectivity-toast-container"
        className="fixed top-4 left-1/2 -translate-x-1/2 z-50 w-[92%] max-w-lg pointer-events-none select-none no-print"
      >
        <AnimatePresence>
          {toast && toast.isOpen && (
            <motion.div
              initial={{ opacity: 0, y: -24, scale: 0.94 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -20, scale: 0.95 }}
              transition={{ type: 'spring', stiffness: 450, damping: 30 }}
              className="pointer-events-auto shadow-2xl rounded-2xl overflow-hidden border backdrop-blur-xl transition-all"
            >
              {toast.status === 'online' ? (
                /* Online / Reconnected Toast */
                <div
                  id="toast-network-online"
                  className="bg-slate-900/95 border-emerald-500/50 text-white p-4 relative ring-1 ring-emerald-500/20 shadow-[0_10px_35px_rgba(16,185,129,0.2)]"
                >
                  <div className="flex items-start gap-3.5">
                    {/* Icon badge */}
                    <div className="p-2.5 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 shrink-0 shadow-inner flex items-center justify-center">
                      <Wifi className="w-5 h-5 animate-pulse" />
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0 pr-1">
                      <div className="flex items-center gap-2">
                        <h4 className="text-sm font-bold text-emerald-300 flex items-center gap-1.5">
                          {t.connectivityToastOnlineTitle}
                          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                        </h4>
                        <span className="text-[10px] uppercase tracking-wider font-extrabold px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                          {language === 'bn' ? 'সংযুক্ত' : 'Connected'}
                        </span>
                      </div>

                      <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                        {t.connectivityToastOnlineMsg}
                      </p>

                      <div className="mt-2.5 flex items-center gap-3 text-[11px] text-emerald-400/90 font-medium">
                        <span className="flex items-center gap-1">
                          <Cloud className="w-3.5 h-3.5 text-emerald-400" />
                          {hasPendingWrites ? t.connectivitySyncing : t.connectivitySyncComplete}
                        </span>
                        <span className="text-slate-600">•</span>
                        <button
                          onClick={openBackupModal}
                          className="flex items-center gap-1 text-sky-400 hover:underline"
                        >
                          <Database className="w-3.5 h-3.5 text-sky-400" />
                          {language === 'bn' ? 'ব্যাকআপ হিস্ট্রি' : 'Backup History'}
                        </button>
                      </div>
                    </div>

                    {/* Dismiss Button */}
                    <button
                      onClick={handleDismiss}
                      id="btn-dismiss-online-toast"
                      className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition shrink-0"
                      title={t.connectivityDismiss}
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Auto-dismiss timer progress bar */}
                  <div className="absolute bottom-0 inset-x-0 h-1 bg-slate-800/80 overflow-hidden">
                    <div
                      className="h-full bg-emerald-500 transition-all duration-75 ease-linear"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                </div>
              ) : (
                /* Offline / Disconnected Toast */
                <div
                  id="toast-network-offline"
                  className="bg-slate-900/95 border-amber-500/50 text-white p-4 relative ring-1 ring-amber-500/25 shadow-[0_10px_35px_rgba(245,158,11,0.2)]"
                >
                  <div className="flex items-start gap-3.5">
                    {/* Icon badge */}
                    <div className="p-2.5 rounded-xl bg-amber-500/20 border border-amber-500/40 text-amber-400 shrink-0 shadow-inner flex items-center justify-center">
                      <WifiOff className="w-5 h-5 animate-pulse" />
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0 pr-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="text-sm font-bold text-amber-300 flex items-center gap-1.5">
                          {t.connectivityToastOfflineTitle}
                          <AlertTriangle className="w-4 h-4 text-amber-400" />
                        </h4>
                        <span className="text-[10px] uppercase tracking-wider font-extrabold px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                          {isSimulatedOffline
                            ? (language === 'bn' ? 'সিমুলেশন মোড' : 'Simulation')
                            : (language === 'bn' ? 'অফলাইন' : 'Offline')}
                        </span>
                      </div>

                      <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                        {t.connectivityToastOfflineMsg}
                      </p>

                      {/* Offline persistence metrics strip */}
                      <div className="mt-2.5 p-2 rounded-xl bg-slate-950/70 border border-slate-800 text-[11px] space-y-1">
                        <div className="flex items-center justify-between text-slate-300">
                          <span className="flex items-center gap-1.5 text-slate-400">
                            <Database className="w-3.5 h-3.5 text-amber-400" />
                            {language === 'bn' ? 'লোকাল অফলাইন ক্যাশ:' : 'Local Storage Cache:'}
                          </span>
                          <span className="text-emerald-400 font-bold flex items-center gap-1">
                            <Check className="w-3 h-3 text-emerald-400" />
                            {language === 'bn' ? 'সক্রিয় ও সুরক্ষিত' : 'Active & Protected'}
                          </span>
                        </div>
                        <p className="text-[10px] text-slate-400">
                          {language === 'bn'
                            ? 'বিল তৈরি, ক্যাশ ট্র্যাকিং ও লেজার এন্ট্রি অফলাইনেও সংরক্ষণ হবে।'
                            : 'Invoices, POS billing, and ledger entries work seamlessly offline.'}
                        </p>
                      </div>

                      {/* Action buttons */}
                      <div className="mt-3 flex items-center gap-2 flex-wrap">
                        <button
                          onClick={handleCheckConnectivity}
                          disabled={isChecking}
                          id="btn-retry-network-connection"
                          className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white rounded-lg text-xs font-semibold border border-slate-700 transition flex items-center gap-1.5 active:scale-95 disabled:opacity-50"
                        >
                          <RefreshCw className={`w-3.5 h-3.5 text-amber-400 ${isChecking ? 'animate-spin' : ''}`} />
                          <span>{isChecking ? (language === 'bn' ? 'যাচাই হচ্ছে...' : 'Checking...') : t.connectivityCheckBtn}</span>
                        </button>

                        <button
                          onClick={toggleSimulateOffline}
                          id="btn-toast-toggle-simulate"
                          className="px-3 py-1.5 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 rounded-lg text-xs font-semibold border border-amber-500/40 transition flex items-center gap-1.5 active:scale-95"
                        >
                          <Radio className="w-3.5 h-3.5 text-amber-400" />
                          <span>{isSimulatedOffline ? t.simulateOnlineBtn : t.simulateOfflineBtn}</span>
                        </button>
                      </div>
                    </div>

                    {/* Dismiss Button */}
                    <button
                      onClick={handleDismiss}
                      id="btn-dismiss-offline-toast"
                      className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition shrink-0"
                      title={t.connectivityDismiss}
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* 2. Persistent Compact Floating Offline Pill (Visible when offline & toast is dismissed/minimized) */}
      <AnimatePresence>
        {isCurrentOffline && (!toast || !toast.isOpen) && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.9 }}
            id="persistent-offline-pill"
            className="fixed bottom-20 md:bottom-5 left-4 z-40 no-print"
          >
            <button
              onClick={() => triggerToast('offline')}
              id="btn-reopen-offline-banner"
              className="group flex items-center gap-2 px-3 py-2 bg-amber-950/90 hover:bg-amber-900 border border-amber-500/50 rounded-2xl shadow-xl backdrop-blur-md text-amber-300 text-xs font-bold transition-all hover:scale-105"
              title="Click to view offline storage & connectivity status"
            >
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-amber-500"></span>
              </span>
              <CloudOff className="w-3.5 h-3.5 text-amber-400" />
              <span>{t.offlineMode}</span>
              <span className="text-[10px] text-amber-400/80 bg-amber-900/60 px-1.5 py-0.5 rounded-md border border-amber-500/30">
                {language === 'bn' ? 'ক্যাশ সক্রিয়' : 'Cached'}
              </span>
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};
