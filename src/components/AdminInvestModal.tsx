import React, { useState } from 'react';
import { useWholesale } from '../context/WholesaleContext';
import { translations, formatCurrency, getTodayDateString, getYesterdayDateString, formatDate, parseFlexibleNumber } from '../utils/translations';
import {
  Coins,
  PlusCircle,
  X,
  Building2,
  Wallet,
  CheckCircle2,
  TrendingUp,
  Sparkles,
  ArrowRight,
  Calendar
} from 'lucide-react';

interface AdminInvestModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export const AdminInvestModal: React.FC<AdminInvestModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const { language, cashAdmin, addCapitalTransaction } = useWholesale();
  const t = translations[language];

  const [amountInput, setAmountInput] = useState<string>('50000');
  const [account, setAccount] = useState<'CASH_DRAWER' | 'BANK'>('CASH_DRAWER');
  const [date, setDate] = useState<string>(getTodayDateString());
  const [description, setDescription] = useState<string>('ব্যবসায় অতিরিক্ত মূলধন বিনিয়োগ (Owner Capital Injection)');
  const [isSuccess, setIsSuccess] = useState<boolean>(false);

  if (!isOpen) return null;

  const quickAmounts = [500, 1000, 5000, 10000, 25000, 50000, 100000, 200000];
  const parsedAmount = parseFlexibleNumber(amountInput);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const finalAmount = parseFlexibleNumber(amountInput);
    if (finalAmount <= 0) return;

    addCapitalTransaction(
      'CAPITAL_INJECTION',
      finalAmount,
      description || 'Capital Injection by Admin',
      description || 'ব্যবসায় মালিকের মূলধন বিনিয়োগ',
      account,
      date
    );

    setIsSuccess(true);
    setTimeout(() => {
      setIsSuccess(false);
      if (onSuccess) onSuccess();
      onClose();
    }, 1000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden flex flex-col max-h-[92vh] overflow-y-auto">
        {/* Header */}
        <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/90">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-emerald-500 to-amber-500 flex items-center justify-center text-slate-950 font-black shadow-lg shadow-emerald-950/40">
              <Coins className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-white text-sm sm:text-base">
                {language === 'bn' ? 'এডমিন মূলধন / ইনভেস্ট যোগ' : 'Add Admin Capital / Investment'}
              </h3>
              <p className="text-[11px] text-slate-400">
                {language === 'bn' ? 'ব্যবসায় ক্যাশ ফান্ড বৃদ্ধি করুন' : 'Inject owner equity into cash drawer'}
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

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-4 space-y-3.5">
          {/* Current Balance Banner */}
          <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 flex items-center justify-between">
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-400 block">
                {language === 'bn' ? 'বর্তমান এডমিন ক্যাশ ব্যালেন্স:' : 'Current Admin Cash Balance:'}
              </span>
              <span className={`text-lg font-black font-mono-num ${cashAdmin <= 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
                {formatCurrency(cashAdmin, language)}
              </span>
            </div>
            <div className="text-right text-[11px] text-slate-400">
              {cashAdmin <= 0 && (
                <span className="text-rose-400 font-bold block">
                  {language === 'bn' ? '⚠️ টাকা নেই' : '⚠️ Zero Cash'}
                </span>
              )}
              <span>{language === 'bn' ? 'ভল্ট ক্যাশ ড্রয়ার' : 'Main Vault'}</span>
            </div>
          </div>

          {/* Date Picker */}
          <div className="space-y-1.5 p-2.5 rounded-xl bg-slate-950/80 border border-emerald-500/20">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-emerald-300 flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-emerald-400" />
                <span>{language === 'bn' ? 'ইনভেস্টের তারিখ (Date)' : 'Investment Date'}</span>
              </label>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setDate(getTodayDateString())}
                  className={`text-[10px] px-2 py-0.5 rounded font-bold transition ${
                    date === getTodayDateString() ? 'bg-emerald-600 text-white' : 'bg-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  {language === 'bn' ? 'আজ' : 'Today'}
                </button>
                <button
                  type="button"
                  onClick={() => setDate(getYesterdayDateString())}
                  className={`text-[10px] px-2 py-0.5 rounded font-bold transition ${
                    date === getYesterdayDateString() ? 'bg-emerald-600 text-white' : 'bg-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  {language === 'bn' ? 'গতকাল' : 'Yesterday'}
                </button>
              </div>
            </div>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full px-3 py-1.5 bg-slate-900 border border-slate-700 rounded-xl text-white font-mono text-xs focus:outline-none focus:border-emerald-500"
            />
          </div>

          {/* Quick Amount Selector */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-300">
                {language === 'bn' ? 'দ্রুত পরিমাণ নির্বাচন করুন (টাকা)' : 'Quick Select Amount (৳)'}
              </label>
              {parsedAmount > 0 && (
                <span className="text-xs font-mono font-bold text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded-md border border-emerald-500/30">
                  {formatCurrency(parsedAmount, language)}
                </span>
              )}
            </div>
            <div className="grid grid-cols-4 gap-1.5 sm:gap-2">
              {quickAmounts.map((q) => (
                <button
                  type="button"
                  key={q}
                  onClick={() => setAmountInput(String(q))}
                  className={`py-1.5 px-1 rounded-xl text-xs font-bold font-mono transition border text-center ${
                    parsedAmount === q
                      ? 'bg-emerald-600 text-white border-emerald-500 shadow-md shadow-emerald-950/30'
                      : 'bg-slate-800/80 text-slate-300 border-slate-700 hover:border-slate-600 hover:bg-slate-800'
                  }`}
                >
                  +{formatCurrency(q, language)}
                </button>
              ))}
            </div>
          </div>

          {/* Custom Amount Input - Accepts any amount without limits */}
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-300 flex items-center justify-between">
              <span>{language === 'bn' ? 'যেকোনো ইনভেস্ট পরিমাণ লিখুন (যে কোনো এমাউন্ট)' : 'Enter Any Amount (Any Value ৳)'}</span>
              <span className="text-[10px] text-emerald-400 font-semibold">
                {language === 'bn' ? 'বাংলা/ইংরেজি সংখ্যা গৃহীত' : 'English / Bengali digits supported'}
              </span>
            </label>
            <div className="relative">
              <span className="absolute left-3 top-2.5 text-slate-400 font-bold">৳</span>
              <input
                type="text"
                inputMode="decimal"
                required
                value={amountInput}
                onChange={(e) => setAmountInput(e.target.value)}
                placeholder={language === 'bn' ? 'যেকোনো টাকা লিখুন (যেমন: ৫০, ৫০০, ১২৫০, ৫০০০০)' : 'Enter any amount (e.g. 50, 500, 1250, 50000)'}
                className="w-full pl-8 pr-28 py-2.5 bg-slate-950 border border-slate-700 focus:border-emerald-500 rounded-xl text-base text-white font-mono font-bold focus:outline-none"
              />
              <div className="absolute right-3 top-2.5 text-xs font-bold text-emerald-400 font-mono-num pointer-events-none">
                {parsedAmount > 0 ? formatCurrency(parsedAmount, language) : ''}
              </div>
            </div>
          </div>

          {/* Destination Account */}
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-300 block">
              {language === 'bn' ? 'জমা হওয়ার একাউন্ট' : 'Destination Account'}
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setAccount('CASH_DRAWER')}
                className={`p-2.5 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 transition ${
                  account === 'CASH_DRAWER'
                    ? 'bg-emerald-950/60 border-emerald-500 text-emerald-300 shadow-sm'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                }`}
              >
                <Wallet className="w-4 h-4 text-emerald-400" />
                <span>{language === 'bn' ? 'ক্যাশ ড্রয়ার (ভল্ট)' : 'Cash Drawer (Vault)'}</span>
              </button>

              <button
                type="button"
                onClick={() => setAccount('BANK')}
                className={`p-2.5 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 transition ${
                  account === 'BANK'
                    ? 'bg-indigo-950/60 border-indigo-500 text-indigo-300 shadow-sm'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                }`}
              >
                <Building2 className="w-4 h-4 text-indigo-400" />
                <span>{language === 'bn' ? 'ব্যাংক একাউন্ট' : 'Bank Account'}</span>
              </button>
            </div>
          </div>

          {/* Description */}
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-300 block">
              {language === 'bn' ? 'বিবরণ / নোট' : 'Description / Notes'}
            </label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g. Owner capital deposit for supplier payments"
              className="w-full px-3 py-2 bg-slate-950 border border-slate-700 focus:border-emerald-500 rounded-xl text-xs text-white focus:outline-none"
            />
          </div>

          {/* Success Flash */}
          {isSuccess && (
            <div className="p-3 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs font-bold flex items-center justify-center gap-2 animate-in zoom-in-95">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>
                {language === 'bn'
                  ? `মূলধন ${formatCurrency(parsedAmount, language)} সফলভাবে যোগ হয়েছে!`
                  : `Capital ${formatCurrency(parsedAmount, language)} successfully injected!`}
              </span>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center gap-2 pt-2 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold transition"
            >
              {t.cancel}
            </button>
            <button
              type="submit"
              id="btn-submit-invest-capital"
              disabled={parsedAmount <= 0}
              className="flex-1 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl text-xs font-bold transition shadow-lg shadow-emerald-950/40 flex items-center justify-center gap-1.5 active:scale-95"
            >
              <PlusCircle className="w-4 h-4" />
              <span>{language === 'bn' ? 'ইনভেস্ট কনফার্ম করুন' : 'Confirm Investment'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
