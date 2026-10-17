import React from 'react';
import { Sparkles, RefreshCw, X, ArrowRight, Zap } from 'lucide-react';
import { AppVersionData } from '../utils/appUpdate';

interface AppUpdateBannerProps {
  language: 'bn' | 'en';
  serverVersion: AppVersionData | null;
  isUpdating: boolean;
  updateStatusText: string;
  onOpenModal: () => void;
  onApplyUpdate: () => void;
  onDismiss: () => void;
}

export const AppUpdateBanner: React.FC<AppUpdateBannerProps> = ({
  language,
  serverVersion,
  isUpdating,
  updateStatusText,
  onOpenModal,
  onApplyUpdate,
  onDismiss,
}) => {
  return (
    <div
      id="app-live-update-banner"
      className="fixed bottom-4 left-3 right-3 sm:left-auto sm:right-4 sm:max-w-md z-40 bg-gradient-to-r from-slate-950 via-indigo-950 to-slate-950 border border-indigo-500/50 rounded-2xl shadow-2xl shadow-indigo-950/70 p-3 sm:p-3.5 text-slate-100 animate-in slide-in-from-bottom-3 duration-300"
    >
      <div className="flex items-start justify-between gap-2.5">
        <div className="flex items-start gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-indigo-500 to-sky-600 flex items-center justify-center shrink-0 shadow-md">
            <Sparkles className="w-4 h-4 text-white animate-pulse" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h4 className="text-xs sm:text-sm font-bold text-white truncate">
                {language === 'bn' ? 'সফটওয়্যারের নতুন আপডেট প্রস্তুত!' : 'New Update Available!'}
              </h4>
              <span className="text-[10px] px-1.5 py-0.2 rounded bg-indigo-500/30 text-indigo-300 font-bold border border-indigo-500/40">
                {serverVersion ? `v${serverVersion.version}` : 'New'}
              </span>
            </div>
            <p className="text-[11px] text-slate-300 mt-0.5 line-clamp-1">
              {language === 'bn'
                ? 'ইনস্টল করা অ্যাপে নতুন কোড ও ফিচার কার্যকর করতে আপডেট করুন।'
                : 'Click update to apply new features to your installed app.'}
            </p>
          </div>
        </div>

        <button
          onClick={onDismiss}
          className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition shrink-0 cursor-pointer"
          title={language === 'bn' ? 'নোটিফিকেশন বন্ধ করুন' : 'Dismiss'}
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="flex items-center gap-2 mt-2.5 pt-2 border-t border-indigo-900/60">
        <button
          type="button"
          onClick={onApplyUpdate}
          disabled={isUpdating}
          id="btn-banner-apply-update"
          className="flex-1 py-1.5 px-3 bg-emerald-600 hover:bg-emerald-500 disabled:bg-emerald-800 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 shadow-md shadow-emerald-950/40 transition active:scale-95 cursor-pointer"
        >
          {isUpdating ? (
            <>
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              <span>{updateStatusText || (language === 'bn' ? 'আপডেট হচ্ছে...' : 'Updating...')}</span>
            </>
          ) : (
            <>
              <Zap className="w-3.5 h-3.5 text-amber-300 fill-amber-300" />
              <span>{language === 'bn' ? 'এখনই আপডেট করুন' : 'Update Now'}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </>
          )}
        </button>

        <button
          type="button"
          onClick={onOpenModal}
          id="btn-banner-view-details"
          className="py-1.5 px-3 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-xl border border-slate-700 transition active:scale-95 cursor-pointer"
        >
          {language === 'bn' ? 'বিস্তারিত' : 'Details'}
        </button>
      </div>
    </div>
  );
};
