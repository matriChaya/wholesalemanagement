import React, { useState } from 'react';
import { useWholesale } from '../context/WholesaleContext';
import {
  Smartphone,
  Laptop,
  Monitor,
  RefreshCw,
  X,
  Shield,
  Truck,
  Store,
  UploadCloud,
  FileDown,
  Trash2,
  AlertTriangle,
  CheckCircle2,
  Layers,
  ChevronDown,
  ChevronUp,
  Download,
  Info,
} from 'lucide-react';
import { formatCurrency } from '../utils/translations';

interface ConnectedDevicesFleetModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ConnectedDevicesFleetModal: React.FC<ConnectedDevicesFleetModalProps> = ({ isOpen, onClose }) => {
  const {
    language,
    currentRole,
    registeredDevices,
    remotePendingDevices,
    refreshRegisteredDevices,
    adminUploadDevicePending,
    adminClearDevicePending,
    sendPresenceHeartbeat,
  } = useWholesale();

  const [expandedDeviceId, setExpandedDeviceId] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string; downloadUrl?: string } | null>(null);

  if (!isOpen) return null;

  const isBn = language === 'bn';
  const adminPhone = '01937200635';

  const handleRefresh = async () => {
    setIsProcessing(true);
    try {
      await sendPresenceHeartbeat();
      await refreshRegisteredDevices();
    } finally {
      setIsProcessing(false);
    }
  };

  const handleUploadPending = async (deviceId: string, devName: string) => {
    setIsProcessing(true);
    setFeedback(null);
    try {
      const res = await adminUploadDevicePending(deviceId);
      if (res.success) {
        setFeedback({
          type: 'success',
          message: res.message || `${devName}-এর পেন্ডিং ফাইল সফলভাবে আপলোড সম্পন্ন হয়েছে!`,
        });
        await refreshRegisteredDevices();
      } else {
        setFeedback({
          type: 'error',
          message: res.message || 'আপলোড ব্যর্থ হয়েছে।',
        });
      }
    } catch (err: any) {
      setFeedback({
        type: 'error',
        message: err.message || 'আপলোড প্রক্রিয়ায় সমস্যা হয়েছে।',
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleClearToBackup = async (deviceId: string, devName: string) => {
    if (!window.confirm(isBn ? `${devName}-এর সকল পেন্ডিং ফাইল ক্লিয়ার করে ইমার্জেন্সি ব্যাকআপে নিতে চান?` : `Clear pending files of ${devName} to emergency backup?`)) {
      return;
    }
    setIsProcessing(true);
    setFeedback(null);
    try {
      const res = await adminClearDevicePending(deviceId);
      if (res.success) {
        setFeedback({
          type: 'success',
          message: res.message || `${devName}-এর পেন্ডিং ফাইল সফলভাবে ক্লিয়ার করে ব্যাকআপে রাখা হয়েছে।`,
        });
        await refreshRegisteredDevices();
      } else {
        setFeedback({
          type: 'error',
          message: res.message || 'ক্লিয়ার করতে ব্যর্থ হয়েছে।',
        });
      }
    } catch (err: any) {
      setFeedback({
        type: 'error',
        message: err.message || 'ক্লিয়ার করতে সমস্যা হয়েছে।',
      });
    } finally {
      setIsProcessing(false);
    }
  };

  // Merge registered devices with pending devices for full fleet visibility
  const allDevices = (registeredDevices || []).map((dev) => {
    const pendingDev = (remotePendingDevices || []).find((p) => p.deviceId === dev.deviceId);
    const count = pendingDev?.pendingFilesCount || dev.pendingFilesCount || 0;
    const items = pendingDev?.pendingItems || dev.pendingItems || [];
    return {
      ...dev,
      pendingFilesCount: count,
      pendingItems: items,
    };
  });

  const totalPendingCount = allDevices.reduce((sum, d) => sum + (d.pendingFilesCount || 0), 0);
  const onlineCount = allDevices.filter((d) => d.isOnline).length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-700/80 rounded-2xl w-full max-w-4xl shadow-2xl flex flex-col max-h-[92vh] overflow-hidden text-slate-100">
        
        {/* Header */}
        <div className="px-5 py-4 bg-slate-950/90 border-b border-slate-800 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-950/60 text-purple-400 border border-purple-500/30 flex items-center justify-center shrink-0">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                <span>{isBn ? 'কানেক্টেড ডিভাইস ও পেন্ডিং ফাইলস কন্ট্রোল' : 'Connected Devices & Pending Files'}</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-purple-900/60 text-purple-300 border border-purple-700/50">
                  {allDevices.length} {isBn ? 'ডিভাইস' : 'Devices'}
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                {isBn
                  ? `এডমিন নাম্বার (${adminPhone})-এর অধীনে মোবাইল, কম্পিউটার ও ক্যাশ কাউন্টারের লাইভ উপস্থিতি ও অফলাইন ফাইল ম্যানেজমেন্ট`
                  : `Real-time staff device tracking and pending offline files registry for Admin ${adminPhone}`}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleRefresh}
              disabled={isProcessing}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition disabled:opacity-50 cursor-pointer"
              title={isBn ? 'রিফ্রেশ করুন' : 'Refresh'}
            >
              <RefreshCw className={`w-4 h-4 ${isProcessing ? 'animate-spin' : ''}`} />
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Feedback Alert */}
        {feedback && (
          <div
            className={`mx-5 mt-4 p-3 rounded-xl border flex items-center justify-between gap-2 text-xs font-semibold ${
              feedback.type === 'success'
                ? 'bg-emerald-950/60 border-emerald-500/40 text-emerald-200'
                : 'bg-rose-950/60 border-rose-500/40 text-rose-200'
            }`}
          >
            <div className="flex items-center gap-2">
              {feedback.type === 'success' ? <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" /> : <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />}
              <span>{feedback.message}</span>
            </div>
            {feedback.downloadUrl && (
              <a
                href={feedback.downloadUrl}
                download
                className="px-2.5 py-1 rounded-lg bg-emerald-700 hover:bg-emerald-600 text-white font-bold text-[11px] flex items-center gap-1 shrink-0"
              >
                <Download className="w-3 h-3" />
                <span>{isBn ? 'ব্যাকআপ ডাউনলোড' : 'Download Backup'}</span>
              </a>
            )}
          </div>
        )}

        {/* Summary Stats */}
        <div className="grid grid-cols-3 gap-3 px-5 pt-4">
          <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-emerald-950/80 text-emerald-400 flex items-center justify-center font-bold">
              🟢
            </div>
            <div>
              <span className="text-[11px] text-slate-400 block">{isBn ? 'অনলাইনে সক্রিয়' : 'Online Devices'}</span>
              <span className="text-sm sm:text-base font-bold text-emerald-300 font-mono">{onlineCount} টি ডিভাইস</span>
            </div>
          </div>

          <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-amber-950/80 text-amber-400 flex items-center justify-center font-bold">
              📂
            </div>
            <div>
              <span className="text-[11px] text-slate-400 block">{isBn ? 'মোট পেন্ডিং ফাইল' : 'Pending Files'}</span>
              <span className="text-sm sm:text-base font-bold text-amber-300 font-mono">{totalPendingCount} টি</span>
            </div>
          </div>

          <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-purple-950/80 text-purple-400 flex items-center justify-center font-bold">
              👑
            </div>
            <div>
              <span className="text-[11px] text-slate-400 block">{isBn ? 'এডমিন ফোন' : 'Admin Account'}</span>
              <span className="text-xs sm:text-sm font-bold text-purple-300 font-mono">{adminPhone}</span>
            </div>
          </div>
        </div>

        {/* Devices List */}
        <div className="p-5 flex-1 overflow-y-auto space-y-3">
          {allDevices.length === 0 ? (
            <div className="p-8 text-center bg-slate-950/50 rounded-2xl border border-slate-800 space-y-2">
              <Info className="w-8 h-8 text-slate-500 mx-auto" />
              <p className="text-sm font-semibold text-slate-300">
                {isBn ? 'কোনো ডিভাইস রেজিস্ট্রি এখনো পাওয়া যায়নি।' : 'No devices registered yet.'}
              </p>
              <p className="text-xs text-slate-500">
                {isBn
                  ? 'মোবাইল বা ল্যাপটপে ক্যাশ কাউন্টার বা ডিএসআর লগইন করলে তা স্বয়ংক্রিয়ভাবে এখানে যুক্ত হবে।'
                  : 'Devices will auto-register as soon as staff logs in on mobile or laptop.'}
              </p>
              <button
                type="button"
                onClick={handleRefresh}
                className="mt-3 px-4 py-2 rounded-xl bg-purple-700 hover:bg-purple-600 text-white font-bold text-xs"
              >
                {isBn ? 'সার্ভার থেকে চেক করুন' : 'Check from Server'}
              </button>
            </div>
          ) : (
            allDevices.map((dev) => {
              const isOnline = Boolean(dev.isOnline);
              const isDsr = dev.role === 'dsr';
              const isCounter = dev.role === 'counter';
              const isAdmin = dev.role === 'admin';
              const hasPending = (dev.pendingFilesCount || 0) > 0;
              const isExpanded = expandedDeviceId === dev.deviceId;

              return (
                <div
                  key={dev.deviceId}
                  className={`rounded-2xl border transition-all ${
                    hasPending
                      ? 'bg-amber-950/10 border-amber-500/40'
                      : isOnline
                      ? 'bg-slate-950/80 border-emerald-500/30'
                      : 'bg-slate-950/40 border-slate-800'
                  }`}
                >
                  {/* Device Header Row */}
                  <div className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border ${
                          isAdmin
                            ? 'bg-purple-950/80 text-purple-400 border-purple-500/40'
                            : isCounter
                            ? 'bg-sky-950/80 text-sky-400 border-sky-500/40'
                            : 'bg-indigo-950/80 text-indigo-400 border-indigo-500/40'
                        }`}
                      >
                        {isAdmin && <Shield className="w-5 h-5" />}
                        {isCounter && <Laptop className="w-5 h-5" />}
                        {isDsr && <Smartphone className="w-5 h-5" />}
                      </div>

                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold text-sm text-white truncate">
                            {dev.name || (isAdmin ? 'এডমিন মাতৃছায়া' : isCounter ? 'ক্যাশ কাউন্টার' : 'রাজু আলম (ডিএসআর)')}
                          </span>
                          <span
                            className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider ${
                              isAdmin
                                ? 'bg-purple-900/60 text-purple-300'
                                : isCounter
                                ? 'bg-sky-900/60 text-sky-300'
                                : 'bg-indigo-900/60 text-indigo-300'
                            }`}
                          >
                            {dev.role}
                          </span>
                          {hasPending && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40 flex items-center gap-1">
                              <span>⚠️</span>
                              <span>{dev.pendingFilesCount} {isBn ? 'টি পেন্ডিং ফাইল' : 'Pending Files'}</span>
                            </span>
                          )}
                        </div>

                        <p className="text-xs text-slate-400 flex items-center gap-2 mt-0.5 font-mono">
                          <span>📞 {dev.phone || 'N/A'}</span>
                          <span className="text-slate-600">•</span>
                          <span>{dev.deviceType || 'ডিভাইস'}</span>
                          {dev.deviceId && (
                            <>
                              <span className="text-slate-600">•</span>
                              <span className="text-[10px] text-slate-500 truncate max-w-[130px]" title={dev.deviceId}>
                                ID: {dev.deviceId.slice(0, 12)}...
                              </span>
                            </>
                          )}
                        </p>
                      </div>
                    </div>

                    {/* Status & Action Buttons */}
                    <div className="flex items-center justify-between sm:justify-end gap-2 shrink-0">
                      <div className="text-right">
                        <div className="flex items-center gap-1.5 justify-end">
                          <span className={`w-2 h-2 rounded-full ${isOnline ? 'bg-emerald-400 animate-ping' : 'bg-slate-500'}`} />
                          <span
                            className={`text-[11px] font-bold px-2 py-0.5 rounded-full border ${
                              isOnline
                                ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                                : 'bg-slate-800 text-slate-400 border-slate-700'
                            }`}
                          >
                            {isOnline ? (isBn ? 'অনলাইন' : 'Online') : (isBn ? 'অফলাইন' : 'Offline')}
                          </span>
                        </div>
                        <span className="text-[10px] text-slate-400 block mt-0.5">
                          {isOnline ? (isBn ? 'এখন সক্রিয়' : 'Active Now') : (isBn ? 'শেষ দেখা: ' + (dev.lastSeenAt ? new Date(dev.lastSeenAt).toLocaleTimeString('bn-BD') : 'পূর্বে') : 'Last seen: ' + (dev.lastSeenAt || 'N/A'))}
                        </span>
                      </div>

                      {hasPending && (
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleUploadPending(dev.deviceId, dev.name)}
                            disabled={isProcessing}
                            className="px-2.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1 transition active:scale-95 cursor-pointer shadow-sm"
                            title={isBn ? 'পেন্ডিং ফাইলগুলো ক্লাউডে আপলোড ও সিঙ্ক করুন' : 'Force Upload to Cloud'}
                          >
                            <UploadCloud className="w-3.5 h-3.5" />
                            <span>{isBn ? 'আপলোড' : 'Upload'}</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => handleClearToBackup(dev.deviceId, dev.name)}
                            disabled={isProcessing}
                            className="px-2.5 py-1.5 rounded-xl bg-amber-700 hover:bg-amber-600 text-white font-bold text-xs flex items-center gap-1 transition active:scale-95 cursor-pointer shadow-sm"
                            title={isBn ? 'ক্লিয়ার করে ব্যাকআপে সংরক্ষণ করুন' : 'Clear to Backup'}
                          >
                            <FileDown className="w-3.5 h-3.5" />
                            <span>{isBn ? 'ক্লিয়ার ব্যাকআপ' : 'Clear Backup'}</span>
                          </button>
                        </div>
                      )}

                      {dev.pendingItems && dev.pendingItems.length > 0 && (
                        <button
                          type="button"
                          onClick={() => setExpandedDeviceId(isExpanded ? null : dev.deviceId)}
                          className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition cursor-pointer"
                          title={isBn ? 'পেন্ডিং ফাইলের বিস্তারিত দেখুন' : 'Toggle details'}
                        >
                          {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Expanded Pending Items List */}
                  {isExpanded && dev.pendingItems && dev.pendingItems.length > 0 && (
                    <div className="px-4 pb-4 pt-1 border-t border-slate-800/80 bg-slate-900/60 rounded-b-2xl">
                      <h4 className="text-xs font-bold text-amber-300 mb-2 flex items-center gap-1.5">
                        <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                        <span>{isBn ? 'এই ডিভাইসের পেন্ডিং অফলাইন ফাইল তালিকা:' : 'Pending offline queue on this device:'}</span>
                      </h4>
                      <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                        {dev.pendingItems.map((item: any, idx: number) => (
                          <div
                            key={item.id || idx}
                            className="p-2 rounded-xl bg-slate-950/90 border border-slate-800 flex items-center justify-between text-xs"
                          >
                            <div className="min-w-0">
                              <span className="font-bold text-slate-200 block truncate">
                                {item.title || item.entityType || 'অফলাইন রেকর্ড'}
                              </span>
                              <span className="text-[10px] text-slate-400">
                                {item.party ? `${item.party} • ` : ''}
                                {item.timestamp ? new Date(item.timestamp).toLocaleString('bn-BD') : ''}
                              </span>
                            </div>
                            {item.amount > 0 && (
                              <span className="font-bold font-mono text-emerald-400 shrink-0">
                                {formatCurrency(item.amount, language)}
                              </span>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3.5 bg-slate-950 border-t border-slate-800 flex items-center justify-between">
          <div className="text-xs text-slate-400 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>
              {isBn
                ? 'এডমিন কন্ট্রোল: যে কোনো ইনস্টলকৃত ডিভাইস রিয়েল-টাইম সনাক্ত হয়'
                : 'Fleet sync: all devices identified in real-time'}
            </span>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-semibold text-xs transition cursor-pointer"
          >
            {isBn ? 'বন্ধ করুন' : 'Close'}
          </button>
        </div>
      </div>
    </div>
  );
};
