import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Database, ShieldCheck, Home } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an unhandled exception:', error, errorInfo);
    try {
      // If quota was exceeded in localStorage, immediately purge the bloated queue key
      if (error?.message?.toLowerCase().includes('quota') || String(error).toLowerCase().includes('quota')) {
        localStorage.removeItem('ws_offline_sync_queue');
        localStorage.removeItem('ws_backup_history');
      }
    } catch {}
    this.setState({ errorInfo });
  }

  private handleReset = () => {
    try {
      localStorage.removeItem('ws_offline_sync_queue');
      localStorage.removeItem('ws_backup_history');
    } catch {}
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  private handleHardReload = () => {
    try {
      // Clear bloated offline sync queue from localStorage to ensure fresh startup
      localStorage.removeItem('ws_offline_sync_queue');
      localStorage.removeItem('ws_backup_history');
      sessionStorage.clear();
    } catch {}
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      const isQuotaOrDbError =
        this.state.error?.message?.toLowerCase().includes('quota') ||
        this.state.error?.message?.toLowerCase().includes('resource-exhausted') ||
        this.state.error?.message?.toLowerCase().includes('database') ||
        this.state.error?.message?.toLowerCase().includes('firestore');

      return (
        <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl relative overflow-hidden text-center space-y-5">
            {/* Ambient Background Accent */}
            <div className="absolute top-0 inset-x-0 h-1.5 bg-gradient-to-r from-amber-500 via-rose-500 to-amber-500" />

            <div className="w-16 h-16 rounded-2xl bg-amber-500/15 border border-amber-500/30 text-amber-400 mx-auto flex items-center justify-center shadow-lg">
              <AlertTriangle className="w-8 h-8" />
            </div>

            <div className="space-y-2">
              <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                সিস্টেম সুরক্ষিত রয়েছে (Safe Mode)
              </h1>
              <p className="text-sm text-slate-400 leading-relaxed max-w-md mx-auto">
                {isQuotaOrDbError
                  ? 'ডাটাবেজ সার্ভার সংযোগে সাময়িক বিলম্ব বা কোটা সীমা দেখা গেছে। আপনার সকল বিক্রয় ও হিসাবের ডাটা লোকাল ডিভাইসে সুরক্ষিত আছে।'
                  : 'একটি অপ্রত্যাশিত ত্রুটি ঘটেছে, তবে আপনার ব্যবসার ডাটা সুরক্ষিত রয়েছে। অ্যাপটি পুনরায় সচল করতে নিচের বাটনে চাপ দিন।'}
              </p>
            </div>

            {/* Offline & Local Data Reassurance Badge */}
            <div className="p-3 bg-slate-950/80 border border-slate-800 rounded-2xl flex items-center justify-center gap-2 text-xs text-emerald-400">
              <Database className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>লোকাল ক্যাশ ও অফলাইন মেমোরি ১০০% সক্রিয় আছে</span>
            </div>

            {/* Error Message Details (collapsible) */}
            {this.state.error && (
              <details className="text-left bg-slate-950/60 rounded-xl p-3 border border-slate-800/80 text-xs text-slate-400 cursor-pointer">
                <summary className="font-semibold text-slate-300 select-none">
                  কারিগরী বিবরণী (Technical Error Details)
                </summary>
                <pre className="mt-2 text-[11px] font-mono text-rose-300 overflow-x-auto whitespace-pre-wrap max-h-32 p-2 bg-slate-950 rounded border border-slate-800">
                  {this.state.error.toString()}
                </pre>
              </details>
            )}

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row items-center gap-3 pt-2">
              <button
                type="button"
                onClick={this.handleReset}
                className="w-full sm:w-1/2 py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm shadow-lg shadow-emerald-950/40 transition active:scale-95 flex items-center justify-center gap-2 cursor-pointer"
              >
                <RefreshCw className="w-4 h-4" />
                <span>পুনরায় চালু করুন</span>
              </button>

              <button
                type="button"
                onClick={this.handleHardReload}
                className="w-full sm:w-1/2 py-3 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-bold text-sm transition active:scale-95 flex items-center justify-center gap-2 cursor-pointer"
              >
                <Home className="w-4 h-4" />
                <span>পেজ রিলোড দিন</span>
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
