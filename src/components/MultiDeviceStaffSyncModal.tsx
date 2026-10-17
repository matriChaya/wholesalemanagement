import React, { useState } from 'react';
import { useWholesale } from '../context/WholesaleContext';
import {
  Cloud,
  RefreshCw,
  Truck,
  Store,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  X,
  Smartphone,
  Laptop,
  ArrowRight,
  Database,
  Layers,
  HelpCircle,
  UserCheck,
  Sparkles,
} from 'lucide-react';
import { formatCurrency } from '../utils/translations';

export const MultiDeviceStaffSyncModal: React.FC = () => {
  const {
    language,
    currentRole,
    currentUser,
    orders,
    replacements,
    cashDSR,
    cashCounter,
    cashAdmin,
    isOnline,
    lastSyncTime,
    isSyncingToCloud,
    isStaffSyncModalOpen,
    closeStaffSyncModal,
    syncRoleTransactionsToCloud,
    refreshAllDataFromCloud,
  } = useWholesale();

  const [activeTab, setActiveTab] = useState<'dsr' | 'counter' | 'admin' | 'guide'>(() => {
    if (currentRole === 'dsr') return 'dsr';
    if (currentRole === 'counter') return 'counter';
    return 'admin';
  });

  const [feedbackMsg, setFeedbackMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);

  if (!isStaffSyncModalOpen) return null;

  const isBn = language === 'bn';

  // Calculate local orders by role with full null safety
  const safeOrders = (orders || []).filter((o): o is typeof o => Boolean(o && typeof o === 'object'));
  const safeReplacements = (replacements || []).filter((r): r is typeof r => Boolean(r && typeof r === 'object'));

  const dsrOrders = safeOrders.filter((o) => {
    const r = (o.creatorRole || o.salesPersonRole || '').toLowerCase();
    const n = (o.creatorName || o.salesPersonName || '').toLowerCase();
    return r === 'dsr' || n.includes('dsr') || n.includes('razo') || n.includes('raju') || n.includes('রাজু');
  });

  const counterOrders = safeOrders.filter((o) => {
    const r = (o.creatorRole || o.salesPersonRole || '').toLowerCase();
    const n = (o.creatorName || o.salesPersonName || '').toLowerCase();
    const isDsr = r === 'dsr' || n.includes('dsr') || n.includes('razo') || n.includes('raju');
    const isAdmin = r === 'admin' || n.includes('admin');
    return !isDsr && !isAdmin;
  });

  const adminOrders = safeOrders.filter((o) => {
    const r = (o.creatorRole || o.salesPersonRole || '').toLowerCase();
    const n = (o.creatorName || o.salesPersonName || '').toLowerCase();
    return r === 'admin' || n.includes('admin');
  });

  const dsrReplacements = safeReplacements.filter((rep) => {
    const r = (rep.operatorRole || '').toLowerCase();
    const n = (rep.operatorName || '').toLowerCase();
    return r === 'dsr' || n.includes('dsr') || n.includes('razo') || n.includes('raju');
  });

  const handleUploadDsr = async () => {
    setIsProcessing(true);
    setFeedbackMsg(null);
    try {
      const res = await syncRoleTransactionsToCloud('dsr');
      if (res.success) {
        setFeedbackMsg({
          type: 'success',
          text: res.message,
        });
      } else {
        setFeedbackMsg({
          type: 'error',
          text: res.message,
        });
      }
    } catch (err: any) {
      setFeedbackMsg({
        type: 'error',
        text: err.message || (isBn ? 'আপলোড ব্যর্থ হয়েছে' : 'Upload failed'),
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleUploadCounter = async () => {
    setIsProcessing(true);
    setFeedbackMsg(null);
    try {
      const res = await syncRoleTransactionsToCloud('counter');
      if (res.success) {
        setFeedbackMsg({
          type: 'success',
          text: res.message,
        });
      } else {
        setFeedbackMsg({
          type: 'error',
          text: res.message,
        });
      }
    } catch (err: any) {
      setFeedbackMsg({
        type: 'error',
        text: err.message || (isBn ? 'আপলোড ব্যর্থ হয়েছে' : 'Upload failed'),
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleUploadAdmin = async () => {
    setIsProcessing(true);
    setFeedbackMsg(null);
    try {
      const res = await syncRoleTransactionsToCloud('admin');
      if (res.success) {
        setFeedbackMsg({
          type: 'success',
          text: res.message,
        });
      } else {
        setFeedbackMsg({
          type: 'error',
          text: res.message,
        });
      }
    } catch (err: any) {
      setFeedbackMsg({
        type: 'error',
        text: err.message || (isBn ? 'আপলোড ব্যর্থ হয়েছে' : 'Upload failed'),
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRefreshFromCloud = async () => {
    setIsProcessing(true);
    setFeedbackMsg(null);
    try {
      const res = await refreshAllDataFromCloud();
      if (res.success) {
        setFeedbackMsg({
          type: 'success',
          text: res.message,
        });
      } else {
        setFeedbackMsg({
          type: 'error',
          text: res.message,
        });
      }
    } catch (err: any) {
      setFeedbackMsg({
        type: 'error',
        text: err.message || (isBn ? 'রিফ্রেশ ব্যর্থ হয়েছে' : 'Refresh failed'),
      });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        className="bg-slate-900 border border-slate-700/80 rounded-3xl shadow-2xl max-w-2xl w-full overflow-hidden flex flex-col max-h-[92vh] text-slate-100"
        role="dialog"
        aria-modal="true"
      >
        {/* Header Bar */}
        <div className="px-5 py-4 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-indigo-500 to-sky-600 flex items-center justify-center shadow-lg shadow-indigo-950/50">
              <RefreshCw className={`w-5 h-5 text-white ${isProcessing || isSyncingToCloud ? 'animate-spin' : ''}`} />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                <span>{isBn ? 'মাল্টি-ডিভাইস স্টাফ ডাটা আপডেট কেন্দ্র' : 'Multi-Device Staff Data Sync Hub'}</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  {isOnline ? (isBn ? 'ক্লাউড লাইভ' : 'Cloud Live') : (isBn ? 'অফলাইন' : 'Offline')}
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                {isBn
                  ? 'মোবাইল (ডিএসআর) ও ল্যাপটপ (কাউন্টার)-এর তথ্য নিরাপদে এডমিন প্যানেলে আপলোড করুন'
                  : 'Safely upload DSR mobile and Counter laptop records to central Admin cloud'}
              </p>
            </div>
          </div>
          <button
            onClick={closeStaffSyncModal}
            className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
            title="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Current Active Role & Device Bar */}
        <div className="px-5 py-2.5 bg-slate-950/80 border-b border-slate-800/80 flex items-center justify-between text-xs shrink-0">
          <div className="flex items-center gap-2">
            <span className="text-slate-400">{isBn ? 'আপনার বর্তমান ডিভাইস/ভূমিকা:' : 'Current Role:'}</span>
            <span className="px-2 py-0.5 rounded-lg bg-indigo-950 text-indigo-300 font-bold border border-indigo-700/50 flex items-center gap-1.5">
              {currentRole === 'dsr' ? (
                <>
                  <Smartphone className="w-3.5 h-3.5 text-indigo-400" />
                  <span>{isBn ? '🚚 ডিএসআর মোবাইল অ্যাপ' : 'DSR Mobile App'}</span>
                </>
              ) : currentRole === 'counter' ? (
                <>
                  <Laptop className="w-3.5 h-3.5 text-sky-400" />
                  <span>{isBn ? '🖥️ ক্যাশ কাউন্টার ল্যাপটপ' : 'Cash Counter Laptop'}</span>
                </>
              ) : (
                <>
                  <UserCheck className="w-3.5 h-3.5 text-purple-400" />
                  <span>{isBn ? '👑 এডমিন সেন্ট্রাল প্যানেল' : 'Admin Central Panel'}</span>
                </>
              )}
            </span>
          </div>

          {lastSyncTime && (
            <span className="text-[11px] text-slate-400">
              {isBn ? 'সর্বশেষ সিঙ্ক:' : 'Last Sync:'}{' '}
              <b className="text-slate-300 font-mono">
                {new Date(lastSyncTime).toLocaleTimeString(isBn ? 'bn-BD' : 'en-US', {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </b>
            </span>
          )}
        </div>

        {/* Tabs Bar */}
        <div className="flex items-center gap-1.5 p-2 bg-slate-950/60 border-b border-slate-800 overflow-x-auto no-scrollbar shrink-0">
          <button
            onClick={() => setActiveTab('dsr')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap cursor-pointer ${
              activeTab === 'dsr'
                ? 'bg-indigo-600 text-white shadow-md'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <Truck className="w-3.5 h-3.5" />
            <span>{isBn ? '🚚 ডিএসআর আপডেট' : 'DSR Sync'}</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-black/40 font-mono">{dsrOrders.length}</span>
          </button>

          <button
            onClick={() => setActiveTab('counter')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap cursor-pointer ${
              activeTab === 'counter'
                ? 'bg-sky-600 text-white shadow-md'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <Store className="w-3.5 h-3.5" />
            <span>{isBn ? '🖥️ ক্যাশ কাউন্টার আপডেট' : 'Counter Sync'}</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-black/40 font-mono">{counterOrders.length}</span>
          </button>

          <button
            onClick={() => setActiveTab('admin')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap cursor-pointer ${
              activeTab === 'admin'
                ? 'bg-purple-600 text-white shadow-md'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>{isBn ? '👑 এডমিন সেন্ট্রাল ভিউ' : 'Admin Hub'}</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-black/40 font-mono">{orders.length}</span>
          </button>

          <button
            onClick={() => setActiveTab('guide')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap cursor-pointer ${
              activeTab === 'guide'
                ? 'bg-emerald-600 text-white shadow-md'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <HelpCircle className="w-3.5 h-3.5" />
            <span>{isBn ? '🛡️ ডাটা সুরক্ষা নিয়ম' : 'Safety Rules'}</span>
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="p-5 space-y-4 overflow-y-auto scrollbar-thin scrollbar-thumb-slate-700 flex-1">
          {/* Feedback message banner if any */}
          {feedbackMsg && (
            <div
              className={`p-3.5 rounded-2xl border text-xs flex items-center gap-2.5 animate-in fade-in ${
                feedbackMsg.type === 'success'
                  ? 'bg-emerald-950/80 border-emerald-500/40 text-emerald-200'
                  : 'bg-rose-950/80 border-rose-500/40 text-rose-200'
              }`}
            >
              {feedbackMsg.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
              )}
              <span className="font-semibold">{feedbackMsg.text}</span>
            </div>
          )}

          {/* TAB 1: DSR UPDATE */}
          {activeTab === 'dsr' && (
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-slate-950/80 border border-indigo-900/40 space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                  <div className="flex items-center gap-2">
                    <Truck className="w-4 h-4 text-indigo-400" />
                    <h3 className="font-bold text-sm text-white">
                      {isBn ? 'ডিএসআর ফিল্ড ডাটা (বিক্রয় মেমো ও রিপ্লেসমেন্ট)' : 'DSR Field Data'}
                    </h3>
                  </div>
                  <span className="text-xs text-indigo-300 font-bold">Razo Alom (রাজু আলম)</span>
                </div>

                <div className="grid grid-cols-3 gap-2.5 text-center">
                  <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800">
                    <span className="block text-[11px] text-slate-400 mb-0.5">{isBn ? 'বিক্রয় মেমো' : 'Invoices'}</span>
                    <span className="text-base font-bold text-white font-mono">{dsrOrders.length} টি</span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800">
                    <span className="block text-[11px] text-slate-400 mb-0.5">{isBn ? 'রিপ্লেসমেন্ট' : 'Claims'}</span>
                    <span className="text-base font-bold text-amber-300 font-mono">{dsrReplacements.length} টি</span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800">
                    <span className="block text-[11px] text-slate-400 mb-0.5">{isBn ? 'হাতে নগদ ক্যাশ' : 'Cash in Hand'}</span>
                    <span className="text-base font-bold text-emerald-400 font-mono">{formatCurrency(cashDSR, language)}</span>
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-indigo-950/40 border border-indigo-500/20 text-[11px] text-indigo-200 leading-relaxed flex items-start gap-2">
                  <ShieldCheck className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
                  <span>
                    {isBn
                      ? 'ডিএসআর ডাটা ক্লাউডে আপলোড করলে কেবল ডিএসআরের মেমো ও রিপ্লেসমেন্ট কেন্দ্রীয় ডাটাবেসে যাবে। ক্যাশ কাউন্টারের বা এডমিনের কোনো মেমো কখনো ক্ষতিগ্রস্ত বা ওভাররাইট হবে না।'
                      : 'DSR upload only touches DSR field records. Counter and admin records remain untouched.'}
                  </span>
                </div>

                <button
                  type="button"
                  onClick={handleUploadDsr}
                  disabled={isProcessing}
                  id="btn-upload-dsr-data"
                  className="w-full py-3 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-900 text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-lg shadow-indigo-950/50 transition active:scale-95 cursor-pointer"
                >
                  <RefreshCw className={`w-4 h-4 ${isProcessing ? 'animate-spin' : ''}`} />
                  <span>
                    {isProcessing
                      ? (isBn ? 'ক্লাউডে আপলোড হচ্ছে...' : 'Uploading to Cloud...')
                      : (isBn ? '🚚 ডিএসআর ডাটা এডমিনে আপলোড করুন' : 'Upload DSR Data to Cloud')}
                  </span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* TAB 2: COUNTER UPDATE */}
          {activeTab === 'counter' && (
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-slate-950/80 border border-sky-900/40 space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                  <div className="flex items-center gap-2">
                    <Store className="w-4 h-4 text-sky-400" />
                    <h3 className="font-bold text-sm text-white">
                      {isBn ? 'ক্যাশ কাউন্টার পিওএস ডাটা (দোকান বিক্রয় চালান)' : 'Cash Counter POS Data'}
                    </h3>
                  </div>
                  <span className="text-xs text-sky-300 font-bold">Counter Sales Desk</span>
                </div>

                <div className="grid grid-cols-2 gap-3 text-center">
                  <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800">
                    <span className="block text-[11px] text-slate-400 mb-0.5">{isBn ? 'কাউন্টার বিক্রয় চালান' : 'Counter Invoices'}</span>
                    <span className="text-base font-bold text-white font-mono">{counterOrders.length} টি</span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800">
                    <span className="block text-[11px] text-slate-400 mb-0.5">{isBn ? 'কাউন্টার ক্যাশ ড্রয়ার' : 'Drawer Cash'}</span>
                    <span className="text-base font-bold text-emerald-400 font-mono">{formatCurrency(cashCounter, language)}</span>
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-sky-950/40 border border-sky-500/20 text-[11px] text-sky-200 leading-relaxed flex items-start gap-2">
                  <ShieldCheck className="w-4 h-4 text-sky-400 shrink-0 mt-0.5" />
                  <span>
                    {isBn
                      ? 'ল্যাপটপ থেকে ক্যাশ কাউন্টার ডাটা আপলোড করলে কাউন্টারের বিক্রয় চালানগুলো সরাসরি এডমিন প্যানেলে লাইভ চলে আসবে। ডিএসআরের কোনো মেমো পরিবর্তন হবে না।'
                      : 'Counter upload pushes store counter invoices to central Admin database safely.'}
                  </span>
                </div>

                <button
                  type="button"
                  onClick={handleUploadCounter}
                  disabled={isProcessing}
                  id="btn-upload-counter-data"
                  className="w-full py-3 px-4 rounded-xl bg-sky-600 hover:bg-sky-500 disabled:bg-sky-900 text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-lg shadow-sky-950/50 transition active:scale-95 cursor-pointer"
                >
                  <RefreshCw className={`w-4 h-4 ${isProcessing ? 'animate-spin' : ''}`} />
                  <span>
                    {isProcessing
                      ? (isBn ? 'ক্লাউডে আপলোড হচ্ছে...' : 'Uploading to Cloud...')
                      : (isBn ? '🖥️ ক্যাশ কাউন্টার ডাটা এডমিনে আপলোড করুন' : 'Upload Counter Data to Cloud')}
                  </span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* TAB 3: ADMIN CENTRAL HUB */}
          {activeTab === 'admin' && (
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-slate-950/80 border border-purple-900/40 space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                  <div className="flex items-center gap-2">
                    <UserCheck className="w-4 h-4 text-purple-400" />
                    <h3 className="font-bold text-sm text-white">
                      {isBn ? 'এডমিন কেন্দ্রীয় ভিউ ও ডাটা রিসিভ' : 'Admin Central Hub'}
                    </h3>
                  </div>
                  <span className="text-xs text-purple-300 font-bold">মাতৃছায়া টেলিকম প্রোপ্রাইটর</span>
                </div>

                <div className="grid grid-cols-4 gap-2 text-center">
                  <div className="p-2 rounded-xl bg-slate-900 border border-slate-800">
                    <span className="block text-[10px] text-slate-400 mb-0.5">{isBn ? 'ডিএসআর' : 'DSR'}</span>
                    <span className="text-sm font-bold text-indigo-400 font-mono">{dsrOrders.length}</span>
                  </div>
                  <div className="p-2 rounded-xl bg-slate-900 border border-slate-800">
                    <span className="block text-[10px] text-slate-400 mb-0.5">{isBn ? 'কাউন্টার' : 'Counter'}</span>
                    <span className="text-sm font-bold text-sky-400 font-mono">{counterOrders.length}</span>
                  </div>
                  <div className="p-2 rounded-xl bg-slate-900 border border-slate-800">
                    <span className="block text-[10px] text-slate-400 mb-0.5">{isBn ? 'এডমিন' : 'Admin'}</span>
                    <span className="text-sm font-bold text-purple-400 font-mono">{adminOrders.length}</span>
                  </div>
                  <div className="p-2 rounded-xl bg-emerald-950/40 border border-emerald-500/30">
                    <span className="block text-[10px] text-emerald-300 mb-0.5">{isBn ? 'সর্বমোট' : 'Total'}</span>
                    <span className="text-sm font-bold text-emerald-400 font-mono">{orders.length}</span>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-2.5 pt-2">
                  <button
                    type="button"
                    onClick={handleRefreshFromCloud}
                    disabled={isProcessing}
                    id="btn-admin-refresh-cloud"
                    className="flex-1 py-2.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:bg-emerald-900 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition active:scale-95 cursor-pointer shadow-md"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isProcessing ? 'animate-spin' : ''}`} />
                    <span>{isBn ? '🔄 ক্লাউড থেকে সকল ডাটা রিফ্রেশ' : 'Refresh All From Cloud'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleUploadAdmin}
                    disabled={isProcessing}
                    id="btn-admin-upload-cloud"
                    className="flex-1 py-2.5 px-3 rounded-xl bg-purple-600 hover:bg-purple-500 disabled:bg-purple-900 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition active:scale-95 cursor-pointer shadow-md"
                  >
                    <Cloud className="w-3.5 h-3.5" />
                    <span>{isBn ? '👑 এডমিন ডাটা ক্লাউডে আপলোড' : 'Upload Admin Records'}</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: SAFETY RULES & GUIDE */}
          {activeTab === 'guide' && (
            <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-3 text-xs text-slate-300 leading-relaxed">
              <div className="flex items-center gap-2 font-bold text-emerald-400 text-sm">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <span>{isBn ? 'মাল্টি-ডিভাইস সমন্বয় ও ডাটা সুরক্ষা নিশ্চিতকরণ' : 'Data Integrity & Sync Architecture'}</span>
              </div>

              <div className="space-y-2.5 text-[11px] text-slate-300">
                <div className="p-3 rounded-xl bg-slate-900/90 border border-slate-800">
                  <h4 className="font-bold text-white mb-1 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-indigo-400"></span>
                    <span>{isBn ? '১. স্বাধীন এন্ট্রি ও আলাদা আপডেট:' : '1. Isolated Role Updates:'}</span>
                  </h4>
                  <p className="text-slate-400">
                    {isBn
                      ? 'ডিএসআর মোবাইল থেকে সেলস বা রিপ্লেসমেন্ট আপডেট দিলে শুধু ডিএসআরের এন্ট্রি ক্লাউডে আপলোড হয়। ক্যাশ কাউন্টারের বা এডমিনের কোনো মেমো পরিবর্তন হয় না।'
                      : 'DSR uploads only field sales; Counter uploads only shop POS sales.'}
                  </p>
                </div>

                <div className="p-3 rounded-xl bg-slate-900/90 border border-slate-800">
                  <h4 className="font-bold text-white mb-1 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-sky-400"></span>
                    <span>{isBn ? '২. এডমিন প্যানেলে সকল সেলস ও আলাদা ফিল্টার:' : '2. Central Admin Unified View:'}</span>
                  </h4>
                  <p className="text-slate-400">
                    {isBn
                      ? 'এডমিন প্যানেলে সকল সেল ইনভয়েস একসাথে দেখা যায় এবং বাটন চাপলে শুধু ডিএসআর বা শুধু ক্যাশ কাউন্টারের ইনভয়েস আলাদা আলাদা দেখা যায়।'
                      : 'Admin can view all sales together, or filter by DSR / Cash Counter / Admin separately.'}
                  </p>
                </div>

                <div className="p-3 rounded-xl bg-slate-900/90 border border-slate-800">
                  <h4 className="font-bold text-white mb-1 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                    <span>{isBn ? '৩. জরুরি রিস্টোর ও নতুন করে তথ্য সংগ্রহ:' : '3. Emergency Data Recovery:'}</span>
                  </h4>
                  <p className="text-slate-400">
                    {isBn
                      ? 'যদি কখনো এডমিনের ল্যাপটপ বা ব্রাউজারে হিস্ট্রি মুছে যায় বা প্রবলেম হয়: ডিএসআর তাদের মোবাইল থেকে এবং ক্যাশ কাউন্টার তাদের ল্যাপটপ থেকে "ডাটা আপলোড" বাটনে চাপ দিলেই উভয় ডিভাইসের সকল তথ্য পুনরায় নিখুঁতভাবে এডমিন প্যানেলে চলে আসবে।'
                      : 'If admin data is ever cleared, staff can simply re-upload from their devices to restore the cloud state.'}
                  </p>
                </div>

                <div className="p-3 rounded-xl bg-slate-900/90 border border-slate-800">
                  <h4 className="font-bold text-white mb-1 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-amber-400"></span>
                    <span>{isBn ? '৪. এডমিনের গুগল ড্রাইভ ব্যাকআপ (১৫ জিবি ফ্রি স্টোরেজ):' : '4. Admin Google Drive 15GB Cloud Storage:'}</span>
                  </h4>
                  <p className="text-slate-400">
                    {isBn
                      ? 'ডিএসআর মোবাইল ও ক্যাশ কাউন্টার ল্যাপটপের সকল ফাইল, মেমো, কোম্পানি রিটার্ন ও কালেকশন সরাসরি এডমিনের নিজস্ব গুগল ড্রাইভ একাউন্টে (Matrichaya_ERP_Cloud_Backups ফোল্ডারে) জমা হয়, যা আজীবন সুরক্ষিত থাকে।'
                      : 'All field memos, sales, collections, and company returns from all devices auto-archive into the Admin Google Drive folder.'}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 bg-slate-950 border-t border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
            <Database className="w-3.5 h-3.5 text-emerald-400" />
            <span>Firestore Database Synchronized</span>
          </div>
          <button
            type="button"
            onClick={closeStaffSyncModal}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition cursor-pointer"
          >
            {isBn ? 'বন্ধ করুন' : 'Close'}
          </button>
        </div>
      </div>
    </div>
  );
};
