import React, { useState } from 'react';
import {
  RefreshCw,
  Sparkles,
  CheckCircle2,
  Download,
  Smartphone,
  Laptop,
  Globe,
  AlertCircle,
  X,
  ShieldCheck,
  Zap,
  ArrowRight,
} from 'lucide-react';
import { AppVersionData } from '../utils/appUpdate';

interface AppUpdateModalProps {
  isOpen: boolean;
  onClose: () => void;
  language: 'bn' | 'en';
  currentVersion: string;
  serverVersion: AppVersionData | null;
  isUpdateAvailable: boolean;
  isChecking: boolean;
  isUpdating: boolean;
  updateStatusText: string;
  isStandalone: boolean;
  onCheckUpdates: () => Promise<boolean>;
  onTriggerUpdate: () => Promise<void>;
}

export const AppUpdateModal: React.FC<AppUpdateModalProps> = ({
  isOpen,
  onClose,
  language,
  currentVersion,
  serverVersion,
  isUpdateAvailable,
  isChecking,
  isUpdating,
  updateStatusText,
  isStandalone,
  onCheckUpdates,
  onTriggerUpdate,
}) => {
  const [checkResultMsg, setCheckResultMsg] = useState<string>('');

  if (!isOpen) return null;

  const handleCheckNow = async () => {
    setCheckResultMsg('');
    const hasUpdate = await onCheckUpdates();
    if (hasUpdate) {
      setCheckResultMsg(
        language === 'bn'
          ? '🎉 নতুন আপডেট পাওয়া গেছে! নিচের বাটনে ক্লিক করে আপডেট সম্পন্ন করুন।'
          : '🎉 New update found! Click below to apply it.'
      );
    } else {
      setCheckResultMsg(
        language === 'bn'
          ? '✅ আপনার অ্যাপটি সম্পূর্ণ আপ-টু-ডেট রয়েছে। কোনো নতুন ভার্সন বাকি নেই।'
          : '✅ Your application is completely up to date.'
      );
    }
    setTimeout(() => {
      setCheckResultMsg('');
    }, 6000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        className="bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden flex flex-col max-h-[92vh] text-slate-100"
        role="dialog"
        aria-modal="true"
      >
        {/* Header Bar */}
        <div className="px-5 py-4 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-sky-600 flex items-center justify-center shadow-lg shadow-indigo-950/50">
              <RefreshCw className={`w-5 h-5 text-white ${isChecking || isUpdating ? 'animate-spin' : ''}`} />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                <span>{language === 'bn' ? 'সফটওয়্যার আপডেট কেন্দ্র' : 'App Update Center'}</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                  PWA Live
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                {language === 'bn'
                  ? 'ইনস্টল করা অ্যাপে নতুন ফিচার ও কোড আপডেট যুক্ত করুন'
                  : 'Update installed application with latest developer releases'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
            title="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="p-5 space-y-4 overflow-y-auto scrollbar-thin scrollbar-thumb-slate-700">
          {/* Environment & Version Status Card */}
          <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 space-y-3">
            <div className="flex items-center justify-between text-xs pb-2 border-b border-slate-800/80">
              <span className="text-slate-400">{language === 'bn' ? 'চলমান প্ল্যাটফর্ম:' : 'Platform:'}</span>
              <span className="font-semibold flex items-center gap-1.5 text-slate-200">
                {isStandalone ? (
                  <>
                    <Smartphone className="w-3.5 h-3.5 text-emerald-400" />
                    <span className="text-emerald-400 font-bold">
                      {language === 'bn' ? 'ইনস্টল করা অ্যাপ (Standalone App)' : 'Installed Standalone App'}
                    </span>
                  </>
                ) : (
                  <>
                    <Globe className="w-3.5 h-3.5 text-sky-400" />
                    <span>{language === 'bn' ? 'ওয়েব ব্রাউজার মোড' : 'Web Browser Mode'}</span>
                  </>
                )}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-1">
              <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800 text-center">
                <span className="block text-[11px] text-slate-400 font-medium mb-0.5">
                  {language === 'bn' ? 'বর্তমান ভার্সন' : 'Current Version'}
                </span>
                <span className="text-sm font-bold text-white font-mono-num">{currentVersion}</span>
              </div>
              <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800 text-center">
                <span className="block text-[11px] text-slate-400 font-medium mb-0.5">
                  {language === 'bn' ? 'সার্ভার ভার্সন' : 'Server Release'}
                </span>
                <span className="text-sm font-bold text-sky-300 font-mono-num">
                  {serverVersion ? `v${serverVersion.version} Pro` : currentVersion}
                </span>
              </div>
            </div>
          </div>

          {/* Update Available Notification Banner */}
          {isUpdateAvailable ? (
            <div className="p-4 rounded-xl bg-gradient-to-br from-emerald-950/90 to-teal-950/70 border border-emerald-500/50 shadow-lg shadow-emerald-950/30 space-y-2.5 animate-in fade-in">
              <div className="flex items-start gap-2.5">
                <div className="p-2 rounded-lg bg-emerald-500/20 text-emerald-400 shrink-0 mt-0.5">
                  <Sparkles className="w-5 h-5 animate-pulse" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-emerald-200">
                    {language === 'bn' ? '🚀 নতুন সফটওয়্যার আপডেট প্রস্তুত রয়েছে!' : '🚀 New Software Update Available!'}
                  </h3>
                  <p className="text-xs text-emerald-300/90 mt-1 leading-relaxed">
                    {serverVersion?.releaseNotes ||
                      (language === 'bn'
                        ? 'ডেভেলপার কর্তৃক নতুন ফিচার ও সিস্টেম পারফরম্যান্স আপডেট রিলিজ হয়েছে।'
                        : 'New features and improvements released by the developer.')}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={onTriggerUpdate}
                disabled={isUpdating}
                id="btn-modal-apply-update-prominent"
                className="w-full py-3 px-4 bg-emerald-600 hover:bg-emerald-500 disabled:bg-emerald-800 text-white font-bold text-sm rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-emerald-950/50 transition active:scale-[0.98] cursor-pointer"
              >
                {isUpdating ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>{updateStatusText || (language === 'bn' ? 'আপডেট করা হচ্ছে...' : 'Updating App...')}</span>
                  </>
                ) : (
                  <>
                    <Zap className="w-4 h-4 text-amber-300 fill-amber-300" />
                    <span>{language === 'bn' ? 'এখনই অ্যাপ আপডেট ও রিলোড করুন' : 'Update & Reload App Now'}</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          ) : (
            <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800/80 flex items-center gap-3 text-xs text-slate-300">
              <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400 shrink-0">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <div>
                <p className="font-semibold text-slate-200">
                  {language === 'bn' ? 'আপনার অ্যাপটি সর্বশেষ আপ-টু-ডেট রয়েছে' : 'Your App is Completely Up-to-Date'}
                </p>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  {language === 'bn'
                    ? 'আপনি বর্তমানে সর্বশেষ ডেভলপমেন্ট ভার্সনে কাজ করছেন।'
                    : 'You are currently running the latest deployed version.'}
                </p>
              </div>
            </div>
          )}

          {/* Feedback Message if any */}
          {checkResultMsg && (
            <div className="p-3 rounded-xl bg-indigo-950/80 border border-indigo-500/40 text-xs text-indigo-200 flex items-center gap-2 animate-in fade-in">
              <Sparkles className="w-4 h-4 text-indigo-400 shrink-0" />
              <span>{checkResultMsg}</span>
            </div>
          )}

          {/* Action Buttons Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
            <button
              type="button"
              onClick={handleCheckNow}
              disabled={isChecking || isUpdating}
              id="btn-modal-manual-check-update"
              className="py-2.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 disabled:bg-slate-800/60 border border-slate-700 text-xs font-semibold text-slate-200 flex items-center justify-center gap-2 transition active:scale-95 cursor-pointer shadow-sm"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-sky-400 ${isChecking ? 'animate-spin' : ''}`} />
              <span>
                {isChecking
                  ? language === 'bn'
                    ? 'চেক হচ্ছে...'
                    : 'Checking...'
                  : language === 'bn'
                  ? 'নতুন আপডেট চেক করুন'
                  : 'Check for Updates'}
              </span>
            </button>

            <button
              type="button"
              onClick={onTriggerUpdate}
              disabled={isUpdating}
              id="btn-modal-force-reload-update"
              className="py-2.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 disabled:bg-slate-800/60 border border-slate-700 text-xs font-semibold text-slate-200 flex items-center justify-center gap-2 transition active:scale-95 cursor-pointer shadow-sm"
              title={
                language === 'bn'
                  ? 'ক্যাশ ফাইল পরিষ্কার করে নতুন কোড লোড করুন'
                  : 'Force clean cache and refresh latest code'
              }
            >
              <Download className="w-3.5 h-3.5 text-emerald-400" />
              <span>{language === 'bn' ? 'ক্যাশ রিফ্রেশ ও রিলোড' : 'Force Cache Reload'}</span>
            </button>
          </div>

          {/* Educational Explanation Box */}
          <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800 space-y-2 text-[11px] text-slate-400 leading-relaxed">
            <div className="flex items-center gap-1.5 font-bold text-amber-300">
              <ShieldCheck className="w-4 h-4 text-amber-400 shrink-0" />
              <span>{language === 'bn' ? 'কীভাবে আপডেট কাজ করে ও ডাটা সুরক্ষা' : 'How Updates Work & Data Safety'}</span>
            </div>
            <ul className="list-disc list-inside space-y-1 text-slate-300">
              <li>
                {language === 'bn'
                  ? 'আপনার অ্যাপ ইতোমধ্যেই লাইভ পাবলিশ করা রয়েছে। নতুন কোনো লিংক বা নতুন পাবলিশ লাগবে না। কোড পরিবর্তন বা রিপাবলিশ (Republish) করার পর ইনস্টল করা অ্যাপে নতুন সুবিধা কার্যকর করতে শুধু এখানে "আপডেট" বাটনে চাপলেই হবে।'
                  : 'Your app is already published. No new URL or separate setup is needed. When updates are published, simply click update here to apply.'}
              </li>
              <li>
                {language === 'bn'
                  ? 'নিরাপত্তা গ্যারান্টি: আপডেট দেওয়ার সময় আপনার দোকানের কোনো ড্রাফট চালান, ক্যাশ হিসাব বা কাস্টমারের ব্যালেন্স কখনো হারাবে না।'
                  : 'Data Safety: Your ledger records, offline transactions, and store drafts remain 100% intact.'}
              </li>
              <li>
                {language === 'bn'
                  ? 'ডিএসআর ও ক্যাশ কাউন্টার সিঙ্ক: মোবাইল ও ল্যাপটপের কর্মীরা স্বাধীনভাবে ডাটা আপলোড করতে পারবে, কারো কোনো তথ্য নষ্ট হবে না।'
                  : 'Staff Data Sync: DSR and Cash Counter staff can update independently without losing any records.'}
              </li>
            </ul>
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3 bg-slate-950 border-t border-slate-800 flex items-center justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition cursor-pointer"
          >
            {language === 'bn' ? 'বন্ধ করুন' : 'Close'}
          </button>
        </div>
      </div>
    </div>
  );
};
