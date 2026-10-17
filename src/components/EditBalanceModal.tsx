import React, { useState, useEffect } from 'react';
import { useWholesale } from '../context/WholesaleContext';
import { BalanceAccountType } from '../types';
import { translations, formatCurrency } from '../utils/translations';
import {
  Building2,
  Coins,
  ShoppingCart,
  Truck,
  X,
  CheckCircle2,
  Edit3,
  Plus,
  Minus,
  RotateCcw,
  Sparkles,
  ShieldCheck,
  Smartphone,
  Wallet,
  Landmark,
  Save,
  ArrowRight,
  Info
} from 'lucide-react';

interface EditBalanceModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialTarget?: BalanceAccountType;
  initialType?: BalanceAccountType;
}

export const EditBalanceModal: React.FC<EditBalanceModalProps> = ({
  isOpen,
  onClose,
  initialTarget,
  initialType,
}) => {
  const effectiveInitialTarget = initialTarget || initialType || 'BANK';
  const {
    language,
    cashBank,
    cashAdmin,
    cashCounter,
    cashDSR,
    bankAccounts,
    updateBankBalance,
    updateBankAccountBalance,
    updateAdminCashVault,
    updateCounterCash,
    updateDsrCash,
  } = useWholesale();

  const t = translations[language];

  const [activeTab, setActiveTab] = useState<BalanceAccountType>(effectiveInitialTarget);
  const [newAmount, setNewAmount] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [isSuccess, setIsSuccess] = useState<boolean>(false);
  const [editingAccountId, setEditingAccountId] = useState<string | null>(null);
  const [accountBalances, setAccountBalances] = useState<{ [key: string]: number }>({});

  // Sync state when opened or tab changed
  useEffect(() => {
    if (isOpen) {
      setActiveTab(effectiveInitialTarget);
    }
  }, [isOpen, effectiveInitialTarget]);

  useEffect(() => {
    if (!isOpen) return;

    if (activeTab === 'BANK') {
      setNewAmount(cashBank.toString());
      const accMap: { [key: string]: number } = {};
      bankAccounts.forEach((acc) => {
        accMap[acc.id] = acc.balance;
      });
      setAccountBalances(accMap);
      setNotes(language === 'bn' ? 'ব্যাংক ও ওয়ালেট ব্যালেন্স সমন্বয়' : 'Bank & MFS balance reconciliation');
    } else if (activeTab === 'ADMIN_CASH') {
      setNewAmount(cashAdmin.toString());
      setNotes(language === 'bn' ? 'এডমিন ক্যাশ ড্রয়ার/ভল্ট ব্যালেন্স সমন্বয়' : 'Admin cash drawer balance adjustment');
    } else if (activeTab === 'COUNTER_CASH') {
      setNewAmount(cashCounter.toString());
      setNotes(language === 'bn' ? 'কাউন্টার ক্যাশ ড্রয়ার সমন্বয়' : 'Counter cash drawer adjustment');
    } else if (activeTab === 'DSR_CASH') {
      setNewAmount(cashDSR.toString());
      setNotes(language === 'bn' ? 'ডিএসআর ফিল্ড কালেকশন ক্যাশ সমন্বয়' : 'DSR field collection cash adjustment');
    }
  }, [activeTab, isOpen, cashBank, cashAdmin, cashCounter, cashDSR, language]);

  if (!isOpen) return null;

  const getCurrentBalance = () => {
    switch (activeTab) {
      case 'BANK':
        return cashBank;
      case 'ADMIN_CASH':
        return cashAdmin;
      case 'COUNTER_CASH':
        return cashCounter;
      case 'DSR_CASH':
        return cashDSR;
      default:
        return 0;
    }
  };

  const currentBal = getCurrentBalance();
  const parsedNewAmount = activeTab === 'BANK' ? Math.max(0, Number(newAmount) || 0) : (Number(newAmount) || 0);
  const difference = parsedNewAmount - currentBal;

  const handleQuickAdd = (delta: number) => {
    const nextVal = (Number(newAmount) || 0) + delta;
    setNewAmount(nextVal.toString());
  };

  const handleResetZero = () => {
    setNewAmount('0');
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    const finalAmount = activeTab === 'BANK' ? Math.max(0, Number(newAmount) || 0) : (Number(newAmount) || 0);

    if (activeTab === 'BANK') {
      // If user modified individual accounts, update them
      if (Object.keys(accountBalances).length > 0) {
        Object.entries(accountBalances).forEach(([accId, bal]) => {
          updateBankAccountBalance(accId, bal);
        });
      }
      updateBankBalance(finalAmount, notes);
    } else if (activeTab === 'ADMIN_CASH') {
      updateAdminCashVault(finalAmount, notes);
    } else if (activeTab === 'COUNTER_CASH') {
      updateCounterCash(finalAmount, notes);
    } else if (activeTab === 'DSR_CASH') {
      updateDsrCash(finalAmount, notes);
    }

    setIsSuccess(true);
    setTimeout(() => {
      setIsSuccess(false);
      onClose();
    }, 900);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Modal Header */}
        <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/90">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-sky-500 to-indigo-600 flex items-center justify-center text-white shadow-lg shadow-indigo-950/40">
              <Edit3 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-white text-base">
                {language === 'bn' ? 'ব্যাংক ও ক্যাশ ব্যালেন্স এডিট করুন' : 'Edit Cash & Bank Balances'}
              </h3>
              <p className="text-xs text-slate-400">
                {language === 'bn'
                  ? 'হাতে থাকা নগদ টাকা বা ব্যাংক ব্যালেন্স সরাসরি পরিবর্তন করুন'
                  : 'Directly adjust live cash drawers or bank accounts'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="p-2 border-b border-slate-800 bg-slate-950/60 grid grid-cols-2 sm:grid-cols-4 gap-1.5">
          <button
            type="button"
            onClick={() => setActiveTab('BANK')}
            className={`py-2 px-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition ${
              activeTab === 'BANK'
                ? 'bg-sky-600 text-white shadow-md shadow-sky-950/50'
                : 'bg-slate-900 text-slate-400 hover:bg-slate-800 hover:text-slate-200'
            }`}
          >
            <Landmark className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">{language === 'bn' ? '১. ব্যাংক টাকা' : '1. Bank Funds'}</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('ADMIN_CASH')}
            className={`py-2 px-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition ${
              activeTab === 'ADMIN_CASH'
                ? 'bg-emerald-600 text-white shadow-md shadow-emerald-950/50'
                : 'bg-slate-900 text-slate-400 hover:bg-slate-800 hover:text-slate-200'
            }`}
          >
            <Coins className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">{language === 'bn' ? '২. এডমিন ক্যাশ' : '2. Admin Cash'}</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('COUNTER_CASH')}
            className={`py-2 px-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition ${
              activeTab === 'COUNTER_CASH'
                ? 'bg-amber-600 text-white shadow-md shadow-amber-950/50'
                : 'bg-slate-900 text-slate-400 hover:bg-slate-800 hover:text-slate-200'
            }`}
          >
            <ShoppingCart className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">{language === 'bn' ? '৩. কাউন্টার ক্যাশ' : '3. Counter Cash'}</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('DSR_CASH')}
            className={`py-2 px-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition ${
              activeTab === 'DSR_CASH'
                ? 'bg-purple-600 text-white shadow-md shadow-purple-950/50'
                : 'bg-slate-900 text-slate-400 hover:bg-slate-800 hover:text-slate-200'
            }`}
          >
            <Truck className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">{language === 'bn' ? '৪. ডিএসআর ক্যাশ' : '4. DSR Cash'}</span>
          </button>
        </div>

        {/* Scrollable Content Body */}
        <form onSubmit={handleSave} className="p-4 space-y-4 overflow-y-auto flex-1">
          {/* Current vs New Overview Banner */}
          <div className="p-3.5 rounded-2xl bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 border border-slate-800 space-y-2.5">
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span>{language === 'bn' ? 'বর্তমান ব্যালেন্স:' : 'Current Balance:'}</span>
              <span className="font-bold text-white font-mono-num text-sm">
                {formatCurrency(currentBal, language)}
              </span>
            </div>

            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-300 font-semibold">{language === 'bn' ? 'নতুন নির্ধারিত ব্যালেন্স:' : 'New Target Balance:'}</span>
              <span className="font-extrabold text-emerald-400 font-mono-num text-lg">
                {formatCurrency(parsedNewAmount, language)}
              </span>
            </div>

            {difference !== 0 && (
              <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-xs font-mono">
                <span className="text-slate-400">{language === 'bn' ? 'সমন্বয় পার্থক্য (Difference):' : 'Adjustment Difference:'}</span>
                <span
                  className={`font-bold ${
                    difference > 0 ? 'text-emerald-400' : 'text-rose-400'
                  }`}
                >
                  {difference > 0 ? `+ ৳${difference.toLocaleString('en-US')}` : `- ৳${Math.abs(difference).toLocaleString('en-US')}`}
                </span>
              </div>
            )}
          </div>

          {/* Main Direct Input Field */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-300 flex items-center justify-between">
              <span>
                {activeTab === 'BANK'
                  ? language === 'bn' ? 'মোট ব্যাংক ও মোবাইল ওয়ালেট ব্যালেন্স (৳)' : 'Total Bank & MFS Balance (৳)'
                  : activeTab === 'ADMIN_CASH'
                  ? language === 'bn' ? 'এডমিন ক্যাশ ভল্ট ব্যালেন্স (৳)' : 'Admin Cash Vault Balance (৳)'
                  : activeTab === 'COUNTER_CASH'
                  ? language === 'bn' ? 'ক্যাশ কাউন্টার ড্রয়ার ব্যালেন্স (৳)' : 'Cash Counter Drawer Balance (৳)'
                  : language === 'bn' ? 'ডিএসআর ফিল্ড ক্যাশ ব্যালেন্স (৳)' : 'DSR Field Cash Balance (৳)'}
              </span>
              <span className="text-[10px] text-sky-400 font-normal">
                {language === 'bn' ? 'সরাসরি সংখ্যা লিখুন' : 'Enter exact amount'}
              </span>
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-lg">
                ৳
              </span>
              <input
                type="number"
                {...(activeTab === 'BANK' ? { min: 0 } : {})}
                step="any"
                required
                value={newAmount}
                onChange={(e) => {
                  const val = e.target.value;
                  setNewAmount(val);
                }}
                className="w-full bg-slate-950 border-2 border-slate-700 focus:border-sky-500 rounded-xl py-3 pl-9 pr-4 text-white text-xl sm:text-2xl font-black font-mono-num focus:outline-none transition"
                placeholder="0"
              />
            </div>
          </div>

          {/* Quick Amount Buttons */}
          <div className="space-y-1.5">
            <span className="text-[11px] font-semibold text-slate-400 block">
              {language === 'bn' ? 'দ্রুত যোগ বা রিসেট করুন:' : 'Quick Shortcuts:'}
            </span>
            <div className="flex flex-wrap gap-1.5">
              <button
                type="button"
                onClick={() => handleQuickAdd(10000)}
                className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-lg transition"
              >
                + ৳10,000
              </button>
              <button
                type="button"
                onClick={() => handleQuickAdd(50000)}
                className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-lg transition"
              >
                + ৳50,000
              </button>
              <button
                type="button"
                onClick={() => handleQuickAdd(100000)}
                className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-lg transition"
              >
                + ৳1,00,000
              </button>
              <button
                type="button"
                onClick={() => handleQuickAdd(500000)}
                className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-lg transition"
              >
                + ৳5,00,000
              </button>
              <button
                type="button"
                onClick={handleResetZero}
                className="px-2.5 py-1.5 bg-rose-950/40 border border-rose-800/60 hover:bg-rose-900 text-rose-300 text-xs font-bold rounded-lg transition flex items-center gap-1"
              >
                <RotateCcw className="w-3 h-3" />
                <span>{language === 'bn' ? '০ করুন (Reset)' : 'Set 0'}</span>
              </button>
            </div>
          </div>

          {/* If BANK tab is selected, show Bank/MFS Account breakdown */}
          {activeTab === 'BANK' && bankAccounts.length > 0 && (
            <div className="space-y-2 pt-2 border-t border-slate-800">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-sky-400 flex items-center gap-1.5">
                  <Landmark className="w-3.5 h-3.5" />
                  {language === 'bn' ? 'ব্যাংক ও ওয়ালেট অ্যাকাউন্ট তালিকা' : 'Bank & MFS Accounts List'}
                </span>
                <span className="text-[10px] text-slate-400">
                  {bankAccounts.length} {language === 'bn' ? 'টি অ্যাকাউন্ট' : 'accounts'}
                </span>
              </div>

              <div className="space-y-2">
                {bankAccounts.map((acc) => {
                  const currentVal = accountBalances[acc.id] ?? acc.balance;
                  return (
                    <div
                      key={acc.id}
                      className="p-2.5 rounded-xl bg-slate-950/80 border border-slate-800 flex items-center justify-between gap-3"
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          {acc.type === 'BANK' ? (
                            <Building2 className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                          ) : (
                            <Smartphone className="w-3.5 h-3.5 text-pink-400 shrink-0" />
                          )}
                          <span className="text-xs font-bold text-white truncate">
                            {language === 'bn' ? acc.bnName : acc.name}
                          </span>
                        </div>
                        <p className="text-[10px] text-slate-400 font-mono mt-0.5 truncate">
                          {acc.accountNumber} {acc.branch ? `• ${acc.branch}` : ''}
                        </p>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <input
                          type="number"
                          min="0"
                          value={currentVal}
                          onChange={(e) => {
                            const val = Math.max(0, Number(e.target.value) || 0);
                            const updated = { ...accountBalances, [acc.id]: val };
                            setAccountBalances(updated);
                            const sum = Object.values(updated).reduce((a: number, b: number) => a + Number(b || 0), 0);
                            setNewAmount(sum.toString());
                          }}
                          className="w-28 bg-slate-900 border border-slate-700 focus:border-sky-500 rounded-lg py-1 px-2 text-right text-xs font-bold text-emerald-400 font-mono-num focus:outline-none"
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Explanatory Info Card */}
          <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/80 flex items-start gap-2.5 text-xs text-slate-400">
            <Info className="w-4 h-4 text-sky-400 shrink-0 mt-0.5" />
            <div>
              <p>
                {activeTab === 'BANK'
                  ? language === 'bn'
                    ? 'ব্যাংক ব্যালেন্স পরিবর্তন করলে তা সরাসরি মূলধন ট্র্যাকার এবং মোট লিকুইড ক্যাশে আপডেট হবে।'
                    : 'Updating Bank balance reflects directly in Capital Tracker and total liquid cash.'
                  : activeTab === 'ADMIN_CASH'
                  ? language === 'bn'
                    ? 'এডমিন ক্যাশ ব্যালেন্স পরিবর্তন করলে সাপ্লায়ারদের সরাসরি ক্যাশ বিল পেমেন্ট এবং ভল্টের লাইভ হিসাব সমন্বয় হবে।'
                    : 'Admin cash updates the main vault fund used to settle supplier bills and company dues.'
                  : activeTab === 'COUNTER_CASH'
                  ? language === 'bn'
                    ? 'কাউন্টার ক্যাশ ড্রয়ার পরিবর্তন করলে দোকানের সেলস কাউন্টারের ক্যাশ হিসাব আপডেট হবে।'
                    : 'Counter cash updates the physical store sales register drawer balance.'
                  : language === 'bn'
                  ? 'ডিএসআর ক্যাশ পরিবর্তন করলে ফিল্ড সেলসম্যানদের কাছে থাকা দৈনিক কালেকশন ক্যাশ সমন্বয় হবে।'
                  : 'DSR cash updates the field sales representatives collection float balance.'}
              </p>
            </div>
          </div>

          {/* Notes / Reason Field */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-300 block">
              {language === 'bn' ? 'সমন্বয়ের বিবরণ / নোট (ঐচ্ছিক):' : 'Reason / Note for Adjustment:'}
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 focus:border-sky-500 rounded-xl py-2 px-3 text-xs text-white placeholder-slate-500 focus:outline-none transition"
              placeholder={language === 'bn' ? 'যেমন: প্রারম্ভিক মূলধন বা ক্যাশ কাউন্ট সমন্বয়' : 'e.g. Opening Balance Setup'}
            />
          </div>

          {/* Success Banner */}
          {isSuccess && (
            <div className="p-3 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs font-bold flex items-center gap-2 animate-in fade-in">
              <CheckCircle2 className="w-4 h-4" />
              <span>
                {language === 'bn'
                  ? 'ব্যালেন্স সফলভাবে আপডেট ও সংরক্ষণ করা হয়েছে!'
                  : 'Balance successfully updated and saved!'}
              </span>
            </div>
          )}

          {/* Action Buttons */}
          <div className="pt-3 border-t border-slate-800 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="py-2.5 px-4 rounded-xl text-xs font-bold text-slate-300 hover:bg-slate-800 transition"
            >
              {language === 'bn' ? 'বাতিল' : 'Cancel'}
            </button>

            <button
              type="submit"
              disabled={isSuccess}
              className="py-2.5 px-6 bg-gradient-to-r from-sky-600 to-indigo-600 hover:from-sky-500 hover:to-indigo-500 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-lg shadow-indigo-950/50 transition active:scale-95 cursor-pointer disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              <span>{language === 'bn' ? 'ব্যালেন্স সংরক্ষণ করুন' : 'Save Balance'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
