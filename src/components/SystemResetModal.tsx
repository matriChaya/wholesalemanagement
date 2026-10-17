import React, { useState } from 'react';
import { useWholesale } from '../context/WholesaleContext';
import { formatCurrency } from '../utils/translations';
import {
  RotateCcw,
  AlertTriangle,
  CheckCircle2,
  Trash2,
  X,
  Wallet,
  FileText,
  Building2,
  Sparkles,
  ShieldAlert,
  ArrowRight,
  Database
} from 'lucide-react';

interface SystemResetModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SystemResetModal: React.FC<SystemResetModalProps> = ({
  isOpen,
  onClose,
}) => {
  const {
    language,
    currentRole,
    currentUser,
    orders,
    cashTransfers,
    cashAdmin,
    cashCounter,
    cashDSR,
    cashBank,
    resetAllSystemData,
    restoreSampleBusinessData,
  } = useWholesale();

  const isBn = language === 'bn';

  const [resetMode, setResetMode] = useState<'INVOICES_AND_CASH' | 'FULL_FACTORY'>('INVOICES_AND_CASH');
  const [initialAdminCash, setInitialAdminCash] = useState<string>('0');
  const [initialBankCash, setInitialBankCash] = useState<string>('0');
  const [resetStockToZero, setResetStockToZero] = useState<boolean>(true);
  const [resetRetailerDues, setResetRetailerDues] = useState<boolean>(true);
  const [resetSupplierDues, setResetSupplierDues] = useState<boolean>(true);
  const [confirmChecked, setConfirmChecked] = useState<boolean>(false);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [isRestoring, setIsRestoring] = useState<boolean>(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleRestoreData = async () => {
    setIsRestoring(true);
    try {
      const res = await restoreSampleBusinessData();
      setSuccessMessage(res.message);
      setTimeout(() => {
        setIsRestoring(false);
        setSuccessMessage(null);
        onClose();
      }, 1500);
    } catch (err) {
      console.error('Restore error:', err);
      setIsRestoring(false);
    }
  };

  const handlePerformReset = async () => {
    if (!confirmChecked) return;

    setIsProcessing(true);
    try {
      const adminCashNum = Math.max(0, parseFloat(initialAdminCash) || 0);
      const bankCashNum = Math.max(0, parseFloat(initialBankCash) || 0);

      await resetAllSystemData({
        mode: resetMode,
        initialAdminCash: adminCashNum,
        initialBankCash: bankCashNum,
        resetRetailerDues,
        resetSupplierDues: resetMode === 'FULL_FACTORY' || resetSupplierDues,
        resetInventoryStockToZero: resetStockToZero,
        clearProductsCatalog: resetMode === 'FULL_FACTORY' && !resetStockToZero,
        clearActivityLogs: true,
      });

      setSuccessMessage(
        isBn
          ? 'সকল পূর্বের ইনভয়েস, ক্যাশ বুক ও স্টক সফলভাবে রিসেট হয়েছে! এখন ফ্রেশ হিসাব শুরু করতে পারেন।'
          : 'All previous invoices, cash transactions and stocks have been reset! You can now start afresh.'
      );

      setTimeout(() => {
        setIsProcessing(false);
        setSuccessMessage(null);
        onClose();
      }, 1500);
    } catch (err) {
      console.error('Reset error:', err);
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-lg bg-slate-900 border border-slate-700 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh] animate-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="p-4 sm:p-5 bg-gradient-to-r from-rose-950/80 via-slate-900 to-amber-950/40 border-b border-rose-500/30 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-rose-500/20 border border-rose-500/40 flex items-center justify-center text-rose-400 shrink-0">
              <RotateCcw className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-base sm:text-lg text-white flex items-center gap-2">
                <span>{isBn ? 'ডাটা রিসেট ও ফ্রেশ স্টার্ট' : 'System Reset & Fresh Start'}</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] bg-rose-500/20 text-rose-300 font-bold border border-rose-500/40">
                  {isBn ? 'ক্লিন স্লেট' : 'Clean Slate'}
                </span>
              </h3>
              <p className="text-xs text-rose-300/80">
                {isBn
                  ? 'সকল ভুল বা ডামি ইনভয়েস ও ক্যাশ মুছে নতুন করে এন্ট্রি শুরু করুন'
                  : 'Clear all dummy/generated invoices and cash book to match real entries'}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            disabled={isProcessing}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-4 text-xs sm:text-sm">
          
          {/* Success Banner */}
          {successMessage && (
            <div className="p-4 rounded-2xl bg-emerald-950/80 border border-emerald-500/60 text-emerald-300 flex items-center gap-3 animate-in fade-in">
              <CheckCircle2 className="w-6 h-6 text-emerald-400 shrink-0" />
              <div className="font-semibold text-xs sm:text-sm">{successMessage}</div>
            </div>
          )}

          {/* Current Status Overview */}
          <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 space-y-2">
            <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              {isBn ? 'বর্তমান ডাটাবেজের অবস্থা:' : 'Current System Ledger Status:'}
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="p-2.5 rounded-xl bg-slate-900/90 border border-slate-800">
                <span className="text-slate-400 block text-[11px]">{isBn ? 'মোট চালান / মেমো:' : 'Total Invoices:'}</span>
                <span className="font-bold text-white text-sm font-mono-num">{orders.length} {isBn ? 'টি' : 'orders'}</span>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-900/90 border border-slate-800">
                <span className="text-slate-400 block text-[11px]">{isBn ? 'ক্যাশ ট্রান্সফার রেকর্ড:' : 'Cash Transfers:'}</span>
                <span className="font-bold text-white text-sm font-mono-num">{cashTransfers.length} {isBn ? 'টি' : 'records'}</span>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-900/90 border border-slate-800">
                <span className="text-slate-400 block text-[11px]">{isBn ? 'এডমিন ক্যাশ ব্যালেন্স:' : 'Admin Cash Drawer:'}</span>
                <span className="font-bold text-emerald-400 text-sm font-mono-num">{formatCurrency(cashAdmin, language)}</span>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-900/90 border border-slate-800">
                <span className="text-slate-400 block text-[11px]">{isBn ? 'কাউন্টার ও ডিএসআর ক্যাশ:' : 'Field Cash Balance:'}</span>
                <span className="font-bold text-amber-400 text-sm font-mono-num">{formatCurrency(cashCounter + cashDSR, language)}</span>
              </div>
            </div>
          </div>

          {/* Quick Restore Box: If accounts and sales are missing / 0 */}
          <div className="p-4 rounded-2xl bg-gradient-to-r from-emerald-950/80 via-slate-900 to-sky-950/70 border border-emerald-500/50 space-y-2.5 shadow-lg">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 shrink-0 mt-0.5">
                  <Database className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs sm:text-sm font-bold text-emerald-300">
                    {isBn ? 'সকল হিসাব ও সেলস রিস্টোর করুন' : 'Restore All Accounts & Sales Data'}
                  </h4>
                  <p className="text-[11px] text-slate-300 leading-relaxed mt-0.5">
                    {isBn
                      ? 'সকল প্রোডাক্ট ক্যাটালগ, কাস্টমার/রিটেইলার খাতা, বিক্রয় মেমো, সাপ্লায়ার লেজার এবং ক্যাশ ব্যালেন্স এক ক্লিকে রিস্টোর করুন।'
                      : 'Restore all products, retailers ledger, sales invoices, supplier purchases, and cash balances in one click.'}
                  </p>
                </div>
              </div>
            </div>
            <button
              type="button"
              onClick={handleRestoreData}
              disabled={isRestoring || isProcessing}
              className="w-full py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-emerald-950/50 transition cursor-pointer active:scale-95"
            >
              {isRestoring ? (
                <>
                  <RotateCcw className="w-4 h-4 animate-spin text-white" />
                  <span>{isBn ? 'হিসাব ও সেলস রিস্টোর হচ্ছে...' : 'Restoring Accounts & Sales...'}</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4 text-emerald-200" />
                  <span>{isBn ? 'সকল হিসাব ও সেলস ঠিক/রিস্টোর করুন' : 'Restore All Accounts & Sales'}</span>
                </>
              )}
            </button>
          </div>

          {/* Reset Mode Selection */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-200 block">
              {isBn ? 'রিসেট করার অপশন বেছে নিন:' : 'Select Reset Scope:'}
            </label>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {/* Option 1: Invoices & Cash Only */}
              <button
                type="button"
                onClick={() => setResetMode('INVOICES_AND_CASH')}
                className={`p-3.5 rounded-2xl border text-left transition relative cursor-pointer ${
                  resetMode === 'INVOICES_AND_CASH'
                    ? 'bg-emerald-950/40 border-emerald-500 shadow-md shadow-emerald-950/30 ring-1 ring-emerald-500'
                    : 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center gap-2 mb-1.5">
                  <FileText className={`w-4 h-4 ${resetMode === 'INVOICES_AND_CASH' ? 'text-emerald-400' : 'text-slate-400'}`} />
                  <span className="font-bold text-white text-xs sm:text-sm">
                    {isBn ? 'ক্যাশ বুক ও মেমো রিসেট' : 'Invoices & Cash Only'}
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  {isBn
                    ? 'সব বিক্রয় মেমো, ক্যাশ ট্রানজেকশন মুছে ব্যালেন্স ৳০ হবে। প্রোডাক্ট তালিকা অক্ষত থাকবে।'
                    : 'Clears all invoices, cash book entries to ৳0. Keeps your product catalog intact.'}
                </p>
              </button>

              {/* Option 2: Full Clean Slate */}
              <button
                type="button"
                onClick={() => setResetMode('FULL_FACTORY')}
                className={`p-3.5 rounded-2xl border text-left transition relative cursor-pointer ${
                  resetMode === 'FULL_FACTORY'
                    ? 'bg-rose-950/40 border-rose-500 shadow-md shadow-rose-950/30 ring-1 ring-rose-500'
                    : 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center gap-2 mb-1.5">
                  <Trash2 className={`w-4 h-4 ${resetMode === 'FULL_FACTORY' ? 'text-rose-400' : 'text-slate-400'}`} />
                  <span className="font-bold text-white text-xs sm:text-sm">
                    {isBn ? 'সম্পূর্ণ ফ্যাক্টরি রিসেট' : 'Full Factory Reset'}
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  {isBn
                    ? 'সব মেমো, ক্যাশ, বাকি বকেয়া, সাপ্লায়ার লেজার ও অডিট হিস্ট্রি সম্পূর্ণ শূন্য হবে।'
                    : 'Clears all invoices, cash, customer/supplier dues, ledger, and logs for a 100% clean slate.'}
                </p>
              </button>
            </div>
          </div>

          {/* Additional Clean Slate Options */}
          <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 space-y-2.5">
            <div className="text-[11px] font-bold text-slate-300 uppercase tracking-wider">
              {isBn ? 'রিসেটের বিস্তারিত সেটিংস:' : 'Reset Breakdown & Settings:'}
            </div>

            {/* Zero product stock quantity */}
            <label className="flex items-start gap-2.5 cursor-pointer p-2 rounded-xl hover:bg-slate-900/60 transition">
              <input
                type="checkbox"
                checked={resetStockToZero}
                onChange={(e) => setResetStockToZero(e.target.checked)}
                className="mt-0.5 w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 border-slate-700 bg-slate-900 cursor-pointer"
              />
              <div>
                <span className="text-xs font-bold text-emerald-300 block">
                  {isBn ? 'পণ্যের স্টক সংখ্যা শূন্য (০) করুন (প্রস্তাবিত)' : 'Reset Product Stock to 0 (Recommended)'}
                </span>
                <span className="text-[11px] text-slate-400 block leading-relaxed">
                  {isBn
                    ? 'পণ্যের নাম ঠিক রেখে স্টক ০ পিস হবে, যাতে মোট নেট ওয়ার্থ ও ইনভেন্টরি ভ্যালু ০ টাকা থেকে ফ্রেশ শুরু হয়।'
                    : 'Keeps item names & prices but sets stock quantity to 0 so total net worth begins at ৳0.'}
                </span>
              </div>
            </label>

            {/* Retailer dues */}
            <label className="flex items-start gap-2.5 cursor-pointer p-2 rounded-xl hover:bg-slate-900/60 transition">
              <input
                type="checkbox"
                checked={resetRetailerDues}
                onChange={(e) => setResetRetailerDues(e.target.checked)}
                className="mt-0.5 w-4 h-4 rounded text-sky-600 focus:ring-sky-500 border-slate-700 bg-slate-900 cursor-pointer"
              />
              <div>
                <span className="text-xs font-bold text-sky-300 block">
                  {isBn ? 'রিটেইলারদের পূর্বের বকেয়া শূন্য (০) করুন' : 'Reset Retailer Outstanding Dues to ৳0'}
                </span>
                <span className="text-[11px] text-slate-400 block leading-relaxed">
                  {isBn
                    ? 'সকল কাস্টমার ও রিটেইলারের বকেয়া ব্যালেন্স ও হিস্ট্রি ০ টাকা হবে।'
                    : 'Clears all past customer accounts receivable to ৳0.'}
                </span>
              </div>
            </label>

            {/* Supplier dues */}
            <label className="flex items-start gap-2.5 cursor-pointer p-2 rounded-xl hover:bg-slate-900/60 transition">
              <input
                type="checkbox"
                checked={resetSupplierDues}
                onChange={(e) => setResetSupplierDues(e.target.checked)}
                className="mt-0.5 w-4 h-4 rounded text-amber-600 focus:ring-amber-500 border-slate-700 bg-slate-900 cursor-pointer"
              />
              <div>
                <span className="text-xs font-bold text-amber-300 block">
                  {isBn ? 'সাপ্লায়ারদের পূর্বের দেনা শূন্য (০) করুন' : 'Reset Supplier Payables to ৳0'}
                </span>
                <span className="text-[11px] text-slate-400 block leading-relaxed">
                  {isBn
                    ? 'মহাজন বা কোম্পানির সকল দেনা ও লেজার ট্রানজেকশন মুছে ফ্রেশ হবে।'
                    : 'Clears all company/supplier accounts payable to ৳0.'}
                </span>
              </div>
            </label>
          </div>

          {/* Optional: Set Opening Balances */}
          <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                <Wallet className="w-3.5 h-3.5 text-emerald-400" />
                <span>{isBn ? 'নতুন প্রারম্ভিক ক্যাশ ব্যালেন্স (ঐচ্ছিক):' : 'Set Initial Opening Cash (Optional):'}</span>
              </label>
              <span className="text-[10px] text-slate-500 font-mono">Default: ৳0.00</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] text-slate-400 block mb-1">
                  {isBn ? 'এডমিন ক্যাশ ড্রয়ার (ক্যাশ ইন হ্যান্ড):' : 'Admin Cash in Hand:'}
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-slate-500 font-bold">৳</span>
                  <input
                    type="number"
                    min="0"
                    step="100"
                    value={initialAdminCash}
                    onChange={(e) => setInitialAdminCash(e.target.value)}
                    placeholder="0"
                    className="w-full pl-7 pr-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs sm:text-sm font-bold text-emerald-400 focus:outline-none focus:border-emerald-500 font-mono-num"
                  />
                </div>
              </div>

              <div>
                <label className="text-[11px] text-slate-400 block mb-1">
                  {isBn ? 'প্রারম্ভিক ব্যাংক ব্যালেন্স:' : 'Opening Bank Balance:'}
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-slate-500 font-bold">৳</span>
                  <input
                    type="number"
                    min="0"
                    step="100"
                    value={initialBankCash}
                    onChange={(e) => setInitialBankCash(e.target.value)}
                    placeholder="0"
                    className="w-full pl-7 pr-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs sm:text-sm font-bold text-sky-400 focus:outline-none focus:border-sky-500 font-mono-num"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Confirmation Checkbox */}
          <div className="p-3.5 rounded-2xl bg-rose-950/30 border border-rose-500/40 space-y-2">
            <label className="flex items-start gap-2.5 cursor-pointer">
              <input
                type="checkbox"
                checked={confirmChecked}
                onChange={(e) => setConfirmChecked(e.target.checked)}
                className="mt-0.5 w-4 h-4 rounded text-rose-600 focus:ring-rose-500 border-slate-700 bg-slate-900 cursor-pointer"
              />
              <span className="text-xs text-rose-200 font-medium leading-relaxed select-none">
                {isBn
                  ? 'আমি বুঝতে পেরেছি যে এই রিসেটের ফলে পূর্বের সকল ভুল ও ডামি মেমো এবং ক্যাশ বুক মুছে যাবে এবং আমি নতুন করে ফ্রেশ ডাটা এন্ট্রি শুরু করব।'
                  : 'I confirm that this will permanently clear all prior generated/sample invoices and cash records so I can input real data afresh.'}
              </span>
            </label>
          </div>

        </div>

        {/* Footer Actions */}
        <div className="p-4 sm:p-5 bg-slate-950 border-t border-slate-800 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={isProcessing}
            className="px-4 py-2.5 rounded-xl border border-slate-700 text-slate-300 hover:bg-slate-800 text-xs font-semibold transition cursor-pointer"
          >
            {isBn ? 'বাতিল করুন' : 'Cancel'}
          </button>

          <button
            type="button"
            onClick={handlePerformReset}
            disabled={!confirmChecked || isProcessing}
            className={`px-5 py-2.5 rounded-xl text-xs font-bold transition flex items-center gap-2 shadow-lg cursor-pointer ${
              confirmChecked && !isProcessing
                ? 'bg-rose-600 hover:bg-rose-500 text-white shadow-rose-900/40 active:scale-95'
                : 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700'
            }`}
          >
            {isProcessing ? (
              <>
                <RotateCcw className="w-4 h-4 animate-spin" />
                <span>{isBn ? 'রিসেট হচ্ছে...' : 'Resetting...'}</span>
              </>
            ) : (
              <>
                <RotateCcw className="w-4 h-4" />
                <span>{isBn ? 'হ্যাঁ, ডাটা রিসেট করুন' : 'Yes, Reset All Data'}</span>
              </>
            )}
          </button>
        </div>

      </div>
    </div>
  );
};
