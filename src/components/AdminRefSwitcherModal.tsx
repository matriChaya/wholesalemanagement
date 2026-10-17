import React, { useState } from 'react';
import { useWholesale } from '../context/WholesaleContext';
import { UserProfile } from '../types';
import { translations } from '../utils/translations';
import {
  Shield,
  Phone,
  Store,
  CheckCircle2,
  AlertCircle,
  X,
  Copy,
  Check,
  Building2,
  ArrowRight,
  Sparkles,
  Users
} from 'lucide-react';

interface AdminRefSwitcherModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AdminRefSwitcherModal: React.FC<AdminRefSwitcherModalProps> = ({
  isOpen,
  onClose,
}) => {
  const {
    language,
    currentRole,
    currentUser,
    activeAdminEnterprise,
    activeAdminPhone,
    activeAdminName,
    isLinkedToAdmin,
    updateAdminReference,
    users,
  } = useWholesale();

  const t = translations[language];

  const [inputRef, setInputRef] = useState(activeAdminPhone || '01937200635');
  const [feedback, setFeedback] = useState<{ success?: boolean; message?: string } | null>(null);
  const [isCopied, setIsCopied] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Deduplicate admin list so each enterprise appears only once (must be before any early return)
  const adminUsers = React.useMemo(() => {
    const list: UserProfile[] = [];
    const seenPhones = new Set<string>();
    for (const u of users) {
      if (u.role === 'admin') {
        const clean = (u.phone || '').replace(/[^0-9]/g, '');
        if (!seenPhones.has(clean)) {
          seenPhones.add(clean);
          list.push(u);
        }
      }
    }
    return list;
  }, [users]);

  if (!isOpen) return null;

  const handleCopyCode = (text: string) => {
    navigator.clipboard.writeText(text);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  const handleLinkSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);
    setIsLoading(true);
    try {
      const res = await updateAdminReference(inputRef);
      setFeedback(res);
      if (res.success) {
        setTimeout(() => {
          onClose();
        }, 800);
      }
    } catch (err: any) {
      setFeedback({ success: false, message: err.message || 'Failed to update Admin reference' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectAdmin = async (phone: string) => {
    setInputRef(phone);
    setIsLoading(true);
    try {
      const res = await updateAdminReference(phone);
      setFeedback(res);
      if (res.success) {
        setTimeout(() => {
          onClose();
        }, 600);
      }
    } catch (err: any) {
      setFeedback({ success: false, message: err.message || 'Linking failed' });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-md bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden text-slate-100 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-800 bg-slate-950/60 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-amber-700 flex items-center justify-center shadow-lg shadow-amber-950/50">
              <Building2 className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white tracking-tight">
                {t.switchAdminPrompt}
              </h2>
              <p className="text-xs text-slate-400">
                {currentRole === 'admin' ? t.yourAdminRefCode : t.linkedAdminEnterprise}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            id="btn-close-admin-ref-modal"
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-4 overflow-y-auto">
          {/* Feedback alerts */}
          {feedback && (
            <div
              className={`p-3 rounded-xl text-xs flex items-start gap-2.5 animate-in slide-in-from-top-1 border ${
                feedback.success
                  ? 'bg-emerald-950/80 border-emerald-500/50 text-emerald-200'
                  : 'bg-rose-950/80 border-rose-500/50 text-rose-200'
              }`}
            >
              {feedback.success ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              ) : (
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              )}
              <span>{feedback.message}</span>
            </div>
          )}

          {/* If Current User is Admin */}
          {currentRole === 'admin' ? (
            <div className="space-y-3">
              <div className="p-4 bg-slate-950 border border-amber-500/40 rounded-xl space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-amber-300 flex items-center gap-1.5">
                    <Shield className="w-4 h-4 text-amber-400" />
                    {t.yourAdminRefCode}
                  </span>
                  <span className="text-[10px] px-2 py-0.5 bg-amber-500/20 text-amber-300 rounded-full font-bold">
                    {language === 'bn' ? 'মালিক / এডমিন' : 'Owner Code'}
                  </span>
                </div>

                <div className="flex items-center justify-between p-3 bg-slate-900 rounded-lg border border-slate-800">
                  <div className="font-mono text-base font-bold text-white tracking-wider">
                    {currentUser.phone}
                  </div>
                  <button
                    onClick={() => handleCopyCode(currentUser.phone)}
                    className="px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold transition flex items-center gap-1.5 shadow"
                  >
                    {isCopied ? (
                      <>
                        <Check className="w-3.5 h-3.5" />
                        <span>{language === 'bn' ? 'কপি হয়েছে' : 'Copied'}</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>{language === 'bn' ? 'কোড কপি করুন' : 'Copy Code'}</span>
                      </>
                    )}
                  </button>
                </div>

                <p className="text-xs text-slate-300 leading-relaxed">
                  {t.shareWithStaff}
                </p>
              </div>

              <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800 text-xs text-slate-400 space-y-1">
                <div className="font-semibold text-slate-300">
                  {language === 'bn' ? 'প্রতিষ্ঠানের নাম:' : 'Registered Enterprise:'}
                </div>
                <div className="text-emerald-400 font-bold">
                  {activeAdminEnterprise}
                </div>
              </div>
            </div>
          ) : (
            /* If Current User is Counter, DSR, or Retailer */
            <div className="space-y-4">
              {/* Active Connection Status Card */}
              <div className="p-3.5 bg-slate-950 border border-emerald-500/40 rounded-xl space-y-1.5">
                <div className="text-[11px] font-semibold text-slate-400 flex items-center gap-1.5">
                  <Store className="w-3.5 h-3.5 text-emerald-400" />
                  <span>{t.linkedAdminEnterprise}</span>
                </div>
                <div className="text-sm font-bold text-white">
                  {activeAdminEnterprise}
                </div>
                <div className="text-xs text-emerald-300 font-mono flex items-center gap-2">
                  <span>{activeAdminPhone}</span>
                  <span className="text-slate-500">·</span>
                  <span className="text-slate-400">{activeAdminName}</span>
                </div>
              </div>

              {/* Enter Admin Reference Form */}
              <form onSubmit={handleLinkSubmit} className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    {t.adminRefLabel}
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                      <Phone className="w-4 h-4" />
                    </div>
                    <input
                      type="tel"
                      value={inputRef}
                      onChange={(e) => setInputRef(e.target.value)}
                      placeholder={t.adminRefPlaceholder}
                      id="input-admin-ref-switcher"
                      className="w-full pl-9 pr-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-slate-100 placeholder-slate-500 text-xs font-mono focus:outline-none focus:border-emerald-500"
                      required
                    />
                  </div>
                  <p className="text-[10px] text-slate-400 mt-1">
                    {t.adminRefHelper}
                  </p>
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  id="btn-submit-admin-ref-link"
                  className="w-full py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs shadow-lg shadow-emerald-950/60 transition active:scale-95 flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{language === 'bn' ? 'এডমিনের সাথে লিঙ্ক করুন' : 'Connect to Wholesaler'}</span>
                </button>
              </form>

              {/* Sample Registered Wholesalers List (1-Click Switch) */}
              <div className="pt-2 border-t border-slate-800">
                <div className="text-xs font-bold text-slate-300 mb-2 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                  <span>{t.sampleAdminCodes}</span>
                </div>
                <div className="space-y-1.5">
                  {adminUsers.map((admin) => (
                    <button
                      key={admin.id}
                      type="button"
                      onClick={() => handleSelectAdmin(admin.phone)}
                      className={`w-full p-2.5 rounded-xl border text-left transition flex items-center justify-between active:scale-95 ${
                        activeAdminPhone.replace(/[^0-9]/g, '') === admin.phone.replace(/[^0-9]/g, '')
                          ? 'bg-emerald-950/80 border-emerald-500 text-emerald-300'
                          : 'bg-slate-950/60 border-slate-800 text-slate-300 hover:border-slate-700'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-lg bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-300 font-bold text-xs">
                          <Store className="w-3.5 h-3.5" />
                        </div>
                        <div>
                          <div className="font-bold text-xs text-white">
                            {admin.enterpriseName || admin.name}
                          </div>
                          <div className="text-[10px] text-slate-400 font-mono">
                            {admin.phone} · {admin.name}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-1 text-[11px] font-bold text-emerald-400">
                        {activeAdminPhone.replace(/[^0-9]/g, '') === admin.phone.replace(/[^0-9]/g, '') ? (
                          <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-[10px]">
                            {language === 'bn' ? 'সংযুক্ত' : 'Connected'}
                          </span>
                        ) : (
                          <ArrowRight className="w-4 h-4 text-slate-500" />
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
