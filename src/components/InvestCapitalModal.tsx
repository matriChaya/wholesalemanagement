import React, { useState } from 'react';
import { useWholesale } from '../context/WholesaleContext';
import { translations, formatCurrency, getTodayDateString, getYesterdayDateString, formatDate, parseFlexibleNumber } from '../utils/translations';
import {
  Coins,
  TrendingUp,
  Plus,
  X,
  ShieldCheck,
  Building,
  Wallet,
  AlertTriangle,
  CheckCircle2,
  Sparkles,
  Calendar
} from 'lucide-react';

interface InvestCapitalModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultAccount?: 'CASH_DRAWER' | 'BANK';
  suggestedAmount?: number;
}

export const InvestCapitalModal: React.FC<InvestCapitalModalProps> = ({
  isOpen,
  onClose,
  defaultAccount = 'CASH_DRAWER',
  suggestedAmount = 50000,
}) => {
  const {
    language,
    cashAdmin,
    addCapitalTransaction,
  } = useWholesale();

  const t = translations[language];

  const [amountInput, setAmountInput] = useState<string>(String(suggestedAmount));
  const [account, setAccount] = useState<'CASH_DRAWER' | 'BANK'>(defaultAccount);
  const [date, setDate] = useState<string>(getTodayDateString());
  const [description, setDescription] = useState<string>(
    language === 'bn' ? 'ব্যবসায়ের ক্যাশ ভল্টে নতুন মূলধন বিনিয়োগ' : 'Additional cash equity capital injection'
  );
  const [isSuccess, setIsSuccess] = useState<boolean>(false);

  if (!isOpen) return null;

  const quickAmounts = [500, 1000, 5000, 10000, 25000, 50000, 100000, 200000];
  const parsedAmount = parseFlexibleNumber(amountInput);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const finalAmount = parseFlexibleNumber(amountInput);
    if (finalAmount <= 0) return;

    const bnDesc = language === 'bn' ? description : 'ব্যবসায়ের ক্যাশ ভল্টে মূলধন বিনিয়োগ';
    const enDesc = language === 'en' ? description : 'Capital injection into cash vault';

    addCapitalTransaction(
      'CAPITAL_INJECTION',
      finalAmount,
      enDesc,
      bnDesc,
      account,
      date
    );

    setIsSuccess(true);
    setTimeout(() => {
      setIsSuccess(false);
      onClose();
    }, 1200);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-150">
      <div
        className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-3xl p-5 sm:p-6 shadow-2xl space-y-4 max-h-[92vh] overflow-y-auto"
        id="invest-capital-modal"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-500 flex items-center justify-center text-white shadow-lg shadow-emerald-950/50">
              <TrendingUp className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                <span>{language === 'bn' ? 'এডমিনের মূলধন / ইনভেস্ট যোগ করুন' : 'Inject Capital / Investment'}</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-semibold">
                  Admin Vault
                </span>
              </h3>
              <p className="text-xs text-slate-400">
                {language === 'bn'
                  ? 'ক্যাশ ব্যালেন্স রিচার্জ করে সাপ্লায়ার পেমেন্ট ও ব্যবসা পরিচালনা নিশ্চিত করুন'
                  : 'Fund the cash vault to execute company payments and operations'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            id="btn-close-invest-modal"
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Current Balance Status Bar */}
        <div className="p-3.5 rounded-2xl bg-slate-800/80 border border-slate-700/80 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Wallet className="w-5 h-5 text-amber-400" />
            <div>
              <span className="text-[11px] font-medium text-slate-400 block">
                {language === 'bn' ? 'এডমিনের বর্তমান ক্যাশ ব্যালেন্স:' : 'Current Admin Cash Balance:'}
              </span>
              <span className={`text-sm font-bold ${cashAdmin <= 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
                {formatCurrency(cashAdmin, language)}
              </span>
            </div>
          </div>
          {cashAdmin <= 0 && (
            <span className="text-[10px] font-bold px-2.5 py-1 rounded-lg bg-rose-500/20 text-rose-300 border border-rose-500/30 flex items-center gap-1 animate-pulse">
              <AlertTriangle className="w-3.5 h-3.5" />
              {language === 'bn' ? 'ক্যাশ শূন্য (০)' : 'Zero Cash'}
            </span>
          )}
        </div>

        {isSuccess ? (
          <div className="py-8 text-center space-y-3">
            <div className="w-14 h-14 mx-auto rounded-full bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 animate-bounce">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <h4 className="text-base font-bold text-white">
              {language === 'bn' ? 'ইনভেস্টমেন্ট সফলভাবে জমা হয়েছে!' : 'Investment Deposited Successfully!'}
            </h4>
            <p className="text-xs text-slate-400">
              {formatCurrency(parsedAmount, language)} {language === 'bn' ? 'এডমিনের ক্যাশ ভল্টে যুক্ত হয়েছে।' : 'added to Admin vault.'}
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4" id="form-inject-capital">
            {/* Account Selector */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300">
                {language === 'bn' ? 'কোন তহবিলে যোগ হবে (Target Account):' : 'Deposit Destination:'}
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setAccount('CASH_DRAWER')}
                  className={`p-3 rounded-xl border flex flex-col items-start gap-1 transition text-left ${
                    account === 'CASH_DRAWER'
                      ? 'bg-emerald-950/40 border-emerald-500 text-emerald-300 shadow-md'
                      : 'bg-slate-800 border-slate-700 text-slate-400 hover:bg-slate-700/60'
                  }`}
                >
                  <div className="flex items-center gap-1.5 text-xs font-bold">
                    <Wallet className="w-4 h-4 text-emerald-400" />
                    <span>{language === 'bn' ? 'এডমিন ক্যাশ ভল্ট' : 'Admin Cash Vault'}</span>
                  </div>
                  <span className="text-[10px] text-slate-400">
                    {language === 'bn' ? 'সরাসরি নগদ হাতে / ড্রয়ারে জমা' : 'Liquid cash in hand'}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setAccount('BANK')}
                  className={`p-3 rounded-xl border flex flex-col items-start gap-1 transition text-left ${
                    account === 'BANK'
                      ? 'bg-indigo-950/40 border-indigo-500 text-indigo-300 shadow-md'
                      : 'bg-slate-800 border-slate-700 text-slate-400 hover:bg-slate-700/60'
                  }`}
                >
                  <div className="flex items-center gap-1.5 text-xs font-bold">
                    <Building className="w-4 h-4 text-indigo-400" />
                    <span>{language === 'bn' ? 'ব্যাংক একাউন্ট' : 'Bank Account'}</span>
                  </div>
                  <span className="text-[10px] text-slate-400">
                    {language === 'bn' ? 'ব্যাংক বা মোবাইল ব্যাংকিং' : 'Commercial Bank / Reserve'}
                  </span>
                </button>
              </div>
            </div>

            {/* Date Picker Input */}
            <div className="space-y-1.5 p-3 rounded-xl bg-slate-800/60 border border-emerald-500/20">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-emerald-300 flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-emerald-400" />
                  <span>{language === 'bn' ? 'বিনিয়োগের তারিখ (Date):' : 'Transaction Date:'}</span>
                </label>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setDate(getTodayDateString())}
                    className={`text-[10px] px-2 py-0.5 rounded font-bold transition ${
                      date === getTodayDateString() ? 'bg-emerald-600 text-white' : 'bg-slate-700 text-slate-300'
                    }`}
                  >
                    {language === 'bn' ? 'আজ' : 'Today'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setDate(getYesterdayDateString())}
                    className={`text-[10px] px-2 py-0.5 rounded font-bold transition ${
                      date === getYesterdayDateString() ? 'bg-emerald-600 text-white' : 'bg-slate-700 text-slate-300'
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
                className="w-full bg-slate-800 border border-slate-700 rounded-xl py-2 px-3 text-xs font-mono text-white focus:outline-none focus:border-emerald-500"
              />
            </div>

            {/* Amount Input - Accepts any amount without limits */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-300 flex items-center justify-between">
                <span>{language === 'bn' ? 'বিনিয়োগকৃত টাকার পরিমাণ (যে কোনো পরিমাণ):' : 'Investment Amount (Any Amount ৳):'}</span>
                <span className="text-emerald-400 font-bold">{parsedAmount > 0 ? formatCurrency(parsedAmount, language) : ''}</span>
              </label>
              <div className="relative">
                <input
                  type="text"
                  inputMode="decimal"
                  required
                  id="input-invest-amount"
                  value={amountInput}
                  onChange={(e) => setAmountInput(e.target.value)}
                  placeholder={language === 'bn' ? 'যেকোনো পরিমাণ লিখুন (যেমন: ৫০, ৫০০, ১০০০, ৫০০০০)' : 'Enter any amount (e.g. 50, 500, 1000, 50000)'}
                  className="w-full bg-slate-800 border border-slate-700 rounded-2xl py-3 pl-4 pr-16 text-white font-bold text-lg focus:outline-none focus:border-emerald-500 transition"
                />
                <span className="absolute right-4 top-3.5 text-slate-400 font-bold text-sm">৳ BDT</span>
              </div>

              {/* Quick Amount Presets */}
              <div className="flex flex-wrap gap-1.5 pt-1">
                {quickAmounts.map((q) => (
                  <button
                    key={q}
                    type="button"
                    onClick={() => setAmountInput(String(q))}
                    className={`px-2.5 py-1 text-[11px] font-bold rounded-lg border transition ${
                      parsedAmount === q
                        ? 'bg-emerald-600 text-white border-emerald-500 shadow-sm'
                        : 'bg-slate-800 text-slate-300 border-slate-700 hover:border-slate-600'
                    }`}
                  >
                    +{formatCurrency(q, language)}
                  </button>
                ))}
              </div>
            </div>

            {/* Description */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300">
                {language === 'bn' ? 'বিবরণ / সূত্র (Description):' : 'Notes / Reference:'}
              </label>
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder={language === 'bn' ? 'ব্যবসায় নতুন মূলধন প্রদান' : 'Proprietor cash capital addition'}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl py-2.5 px-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
              />
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={onClose}
                className="py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition"
              >
                {t.cancel}
              </button>
              <button
                type="submit"
                disabled={parsedAmount <= 0}
                id="btn-confirm-invest-capital"
                className="py-2.5 px-5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 disabled:opacity-50 text-white text-xs font-bold shadow-lg shadow-emerald-950/40 transition active:scale-95 flex items-center gap-1.5"
              >
                <Plus className="w-4 h-4" />
                <span>{language === 'bn' ? 'মূলধন জমা নিশ্চিত করুন' : 'Confirm Investment'}</span>
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
