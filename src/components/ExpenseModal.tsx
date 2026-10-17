import React, { useState, useMemo } from 'react';
import { useWholesale } from '../context/WholesaleContext';
import { ExpenseCategory, ExpenseFrequency } from '../types';
import { formatCurrency, parseFlexibleNumber } from '../utils/translations';
import {
  X,
  PlusCircle,
  Receipt,
  Building,
  Zap,
  Users,
  Briefcase,
  Coffee,
  Truck,
  Wrench,
  Calendar,
  AlertTriangle,
  CheckCircle2,
  Trash2,
  Search,
  Filter,
  DollarSign,
  TrendingDown,
  TrendingUp,
  FileText,
  Eye,
  Download,
  Wallet,
  ArrowRight,
  ShieldAlert,
  Sparkles
} from 'lucide-react';

interface ExpenseModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultCategory?: ExpenseCategory;
}

export const ExpenseModal: React.FC<ExpenseModalProps> = ({
  isOpen,
  onClose,
  defaultCategory = 'OTHER',
}) => {
  const {
    language,
    currentRole,
    currentUser,
    expenses,
    addExpense,
    deleteExpense,
    cashCounter,
    grossProfit,
    totalExpenses,
    netRealizedProfit,
    counterExpensesPaid,
  } = useWholesale();

  const isBn = language === 'bn';

  // Sub-tab: 'NEW' (নতুন খরচ এন্ট্রি) vs 'LOG' (খরচের খাতা)
  const [activeSubTab, setActiveSubTab] = useState<'NEW' | 'LOG'>('NEW');

  // Form states
  const [category, setCategory] = useState<ExpenseCategory>(defaultCategory);
  const [title, setTitle] = useState<string>('');
  const [amountStr, setAmountStr] = useState<string>('');
  const [recipientName, setRecipientName] = useState<string>('');
  const [date, setDate] = useState<string>(new Date().toISOString().slice(0, 10));
  const [paymentSource, setPaymentSource] = useState<'CASH_DRAWER' | 'BANK' | 'OWNER_PERSONAL'>('CASH_DRAWER');
  const [frequency, setFrequency] = useState<ExpenseFrequency>('MONTHLY');
  const [notes, setNotes] = useState<string>('');
  const [formError, setFormError] = useState<string>('');
  const [successMsg, setSuccessMsg] = useState<string>('');

  // Log filter
  const [logFilterCategory, setLogFilterCategory] = useState<string>('ALL');
  const [searchTerm, setSearchTerm] = useState<string>('');

  // Category Configuration
  const CATEGORIES: Array<{
    id: ExpenseCategory;
    titleBn: string;
    titleEn: string;
    icon: React.ComponentType<{ className?: string }>;
    color: string;
    badgeBg: string;
    suggestionsBn: string[];
    defaultFrequency: ExpenseFrequency;
  }> = [
    {
      id: 'SALARY',
      titleBn: 'বেতন (Salary)',
      titleEn: 'Salary / Wages',
      icon: Users,
      color: 'text-indigo-400 border-indigo-500/40 bg-indigo-500/10',
      badgeBg: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30',
      suggestionsBn: ['সেলসম্যান বেতন', 'ম্যানেজার বেতন', 'কাউন্টার স্টাফ বেতন', 'ডিএসআর দৈনিক সম্মানী', 'হেলপার মজুরি'],
      defaultFrequency: 'MONTHLY',
    },
    {
      id: 'SHOP_RENT',
      titleBn: 'দোকান ভাড়া (Shop Rent)',
      titleEn: 'Shop Rent',
      icon: Building,
      color: 'text-amber-400 border-amber-500/40 bg-amber-500/10',
      badgeBg: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
      suggestionsBn: ['চলতি মাসের দোকান ভাড়া', 'গোডাউন ভাড়া', 'অগ্রিম দোকান ভাড়া', 'মার্কেট সার্ভিস চার্জ'],
      defaultFrequency: 'MONTHLY',
    },
    {
      id: 'ELECTRICITY_BILL',
      titleBn: 'বিদ্যুৎ বিল (Electricity Bill)',
      titleEn: 'Electricity Bill',
      icon: Zap,
      color: 'text-yellow-400 border-yellow-500/40 bg-yellow-500/10',
      badgeBg: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30',
      suggestionsBn: ['চলতি মাসের বিদ্যুৎ বিল', 'পল্লী বিদ্যুৎ অফিস বিল', 'মিটার রিচার্জ বিল', 'জেনারেটর বিল'],
      defaultFrequency: 'MONTHLY',
    },
    {
      id: 'OTHER',
      titleBn: 'অন্যান্য খরচ (Other Expenses)',
      titleEn: 'Other Miscellaneous',
      icon: Receipt,
      color: 'text-teal-400 border-teal-500/40 bg-teal-500/10',
      badgeBg: 'bg-teal-500/20 text-teal-300 border-teal-500/30',
      suggestionsBn: ['চা-নাস্তা ও মেহমান আপ্যায়ন', 'দোকান মেরামত ও ইলেকট্রিক কাজ', 'ক্যাশ মেমো ও প্রিন্ট স্টেশনারি', 'যাতায়াত ও ভ্যান ভাড়া', 'পরিচ্ছন্নতা ও ময়লা বিল'],
      defaultFrequency: 'DAILY',
    },
  ];

  const currentCategoryConfig = CATEGORIES.find((c) => c.id === category) || CATEGORIES[3];

  const handleCategorySelect = (catId: ExpenseCategory) => {
    setCategory(catId);
    const cfg = CATEGORIES.find((c) => c.id === catId);
    if (cfg) {
      setFrequency(cfg.defaultFrequency);
    }
  };

  const handleQuickSuggestion = (suggestion: string) => {
    setTitle(suggestion);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    setSuccessMsg('');

    const parsedAmount = parseFlexibleNumber(amountStr);
    if (!parsedAmount || parsedAmount <= 0) {
      setFormError(isBn ? 'সঠিক টাকার পরিমাণ উল্লেখ করুন' : 'Please enter a valid expense amount');
      return;
    }

    if (!title.trim()) {
      setFormError(isBn ? 'খরচের বিবরণ বা শিরোনাম দিন' : 'Please provide expense title / description');
      return;
    }

    const cfg = CATEGORIES.find((c) => c.id === category);
    const categoryBn = cfg ? cfg.titleBn : 'খরচ';

    addExpense({
      category,
      categoryBn,
      title: title.trim(),
      titleBn: title.trim(),
      amount: parsedAmount,
      date,
      frequency,
      paymentSource,
      recipientName: recipientName.trim(),
      notes: notes.trim(),
    });

    setSuccessMsg(
      isBn
        ? `সফলভাবে ৳${parsedAmount.toLocaleString()} টাকার ${categoryBn} এন্ট্রি করা হয়েছে যা প্রফিট ও কাউন্টার ড্রয়ার থেকে বাদ হয়েছে!`
        : `Successfully recorded expense of ${formatCurrency(parsedAmount, language)}!`
    );

    // Reset fields
    setTitle('');
    setAmountStr('');
    setRecipientName('');
    setNotes('');

    setTimeout(() => {
      setSuccessMsg('');
    }, 4000);
  };

  // Grouped breakdown for log tab
  const categoryTotals = useMemo(() => {
    const totals: Record<string, number> = {
      SALARY: 0,
      SHOP_RENT: 0,
      ELECTRICITY_BILL: 0,
      OTHER: 0,
      ALL: 0,
    };
    expenses.forEach((e) => {
      const amt = Number(e.amount) || 0;
      totals.ALL += amt;
      if (totals[e.category] !== undefined) {
        totals[e.category] += amt;
      } else {
        totals.OTHER += amt;
      }
    });
    return totals;
  }, [expenses]);

  // Filtered expenses for list
  const filteredExpenses = useMemo(() => {
    return expenses.filter((e) => {
      if (logFilterCategory !== 'ALL' && e.category !== logFilterCategory) {
        return false;
      }
      if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase();
        const tMatch = (e.title || '').toLowerCase().includes(term);
        const rMatch = (e.recipientName || '').toLowerCase().includes(term);
        const cMatch = (e.categoryBn || '').toLowerCase().includes(term);
        const nMatch = (e.notes || '').toLowerCase().includes(term);
        const aMatch = String(e.amount).includes(term);
        return tMatch || rMatch || cMatch || nMatch || aMatch;
      }
      return true;
    });
  }, [expenses, logFilterCategory, searchTerm]);

  if (!isOpen) return null;

  return (
    <div
      id="expense-modal-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/80 backdrop-blur-md overflow-y-auto"
    >
      <div className="w-full max-w-4xl bg-slate-900 border-2 border-amber-500/40 rounded-3xl shadow-2xl flex flex-col max-h-[96vh] overflow-hidden my-auto animate-in fade-in zoom-in-95 duration-200">
        {/* Top Header */}
        <div className="px-4 sm:px-6 py-4 bg-gradient-to-r from-slate-950 via-slate-900 to-amber-950/60 border-b border-slate-800 flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 shrink-0 shadow-inner">
              <Receipt className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-bold text-white tracking-tight">
                  {isBn ? 'ক্যাশ কাউন্টার খরচ এন্ট্রি ও প্রফিট সমন্বয়' : 'Cash Counter Expense Entry & Profit'}
                </h3>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                  {isBn ? 'কাউন্টার ড্রয়ার' : 'Counter POS'}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                {isBn
                  ? 'বেতন, দোকান ভাড়া, বিদ্যুৎ বিল ও অন্যান্য খরচ এন্ট্রি — যা প্রফিট ও কাউন্টার ড্রয়ার থেকে বাদ হবে'
                  : 'Record staff salary, shop rent, electricity, and other expenses directly deducted from profit'}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            type="button"
            className="w-9 h-9 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition border border-slate-700 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Financial KPI Status Bar: Counter Cash & Net Profit (with negative figure warning) */}
        <div className="px-4 sm:px-6 py-3 bg-slate-950/90 border-b border-slate-800/80 grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
          {/* KPI 1: Live Counter Drawer */}
          <div className="p-2 rounded-xl bg-slate-900 border border-slate-800">
            <div className="flex items-center justify-between text-slate-400 text-[10.5px]">
              <span className="flex items-center gap-1">
                <Wallet className="w-3 h-3 text-sky-400" />
                <span>{isBn ? 'কাউন্টার ড্রয়ার' : 'Counter Drawer'}</span>
              </span>
              <span className="text-[9.5px] font-mono text-slate-500">Live</span>
            </div>
            <div className={`text-sm sm:text-base font-black font-mono-num mt-0.5 ${cashCounter < 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
              {formatCurrency(cashCounter, language)}
            </div>
            <div className="text-[9.5px] text-slate-400 truncate">
              {cashCounter < 0 ? (isBn ? '⚠️ ড্রয়ার ঘাটতিতে রয়েছে' : 'Drawer in deficit') : (isBn ? 'বর্তমান নগদ ক্যাশ' : 'Cash in hand')}
            </div>
          </div>

          {/* KPI 2: Gross Profit from Sales */}
          <div className="p-2 rounded-xl bg-slate-900 border border-slate-800">
            <div className="flex items-center justify-between text-slate-400 text-[10.5px]">
              <span className="flex items-center gap-1">
                <TrendingUp className="w-3 h-3 text-emerald-400" />
                <span>{isBn ? 'বিক্রয় থেকে মোট লাভ' : 'Gross Sales Profit'}</span>
              </span>
            </div>
            <div className="text-sm sm:text-base font-black text-emerald-400 font-mono-num mt-0.5">
              +{formatCurrency(grossProfit, language)}
            </div>
            <div className="text-[9.5px] text-slate-400 truncate">
              {isBn ? 'মেমো মার্জিনের মোট যোগফল' : 'Sales margin total'}
            </div>
          </div>

          {/* KPI 3: Total Operating Expenses */}
          <div className="p-2 rounded-xl bg-slate-900 border border-rose-500/30">
            <div className="flex items-center justify-between text-rose-300 text-[10.5px]">
              <span className="flex items-center gap-1">
                <TrendingDown className="w-3 h-3 text-rose-400" />
                <span>{isBn ? 'মোট দোকান খরচ (-)' : 'Total Expenses (-)'}</span>
              </span>
              <span className="text-[9.5px] font-bold text-rose-400 font-mono">{expenses.length} টি</span>
            </div>
            <div className="text-sm sm:text-base font-black text-rose-400 font-mono-num mt-0.5">
              -{formatCurrency(totalExpenses, language)}
            </div>
            <div className="text-[9.5px] text-rose-300/80 truncate">
              {isBn ? 'বেতন + ভাড়া + বিদ্যুৎ + অন্যান্য' : 'Salary + Rent + Power + Other'}
            </div>
          </div>

          {/* KPI 4: Net Realized Profit (Shows minus figure if profit is insufficient!) */}
          <div className={`p-2 rounded-xl border ${
            netRealizedProfit < 0
              ? 'bg-rose-950/40 border-rose-500/60 shadow-inner'
              : 'bg-emerald-950/40 border-emerald-500/60 shadow-inner'
          }`}>
            <div className="flex items-center justify-between text-[10.5px]">
              <span className={`font-bold flex items-center gap-1 ${netRealizedProfit < 0 ? 'text-rose-300' : 'text-emerald-300'}`}>
                <DollarSign className="w-3 h-3" />
                <span>{isBn ? 'সর্বমোট নিট প্রফিট' : 'Net Realized Profit'}</span>
              </span>
              <span className={`text-[9px] font-extrabold px-1.5 py-0.2 rounded ${
                netRealizedProfit < 0
                  ? 'bg-rose-500/30 text-rose-200 border border-rose-500/50'
                  : 'bg-emerald-500/30 text-emerald-200 border border-emerald-500/50'
              }`}>
                {netRealizedProfit < 0 ? (isBn ? 'লোকসান / ঘাটতি' : 'Deficit / Loss') : (isBn ? 'মুনাফা' : 'Profit')}
              </span>
            </div>
            <div className={`text-sm sm:text-base font-black font-mono-num mt-0.5 ${
              netRealizedProfit < 0 ? 'text-rose-400' : 'text-emerald-400'
            }`}>
              {netRealizedProfit >= 0 ? '+' : ''}{formatCurrency(netRealizedProfit, language)}
            </div>
            <div className="text-[9.5px] text-slate-400 truncate">
              {netRealizedProfit < 0
                ? (isBn ? '⚠️ লাভ পর্যাপ্ত না থাকায় মাইনাস ফিগার' : '⚠️ Insufficient profit (Negative)')
                : (isBn ? 'খরচ বাদে চূড়ান্ত নীট লাভ' : 'Net realized balance')}
            </div>
          </div>
        </div>

        {/* Warning Banner if Net Profit is Negative */}
        {netRealizedProfit < 0 && (
          <div className="px-4 py-2 bg-rose-950/70 border-b border-rose-500/40 flex items-center gap-2 text-rose-300 text-xs">
            <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 animate-pulse" />
            <span>
              {isBn
                ? `সতর্কতা: বিক্রয় মুনাফা থেকে দোকান খরচ বেশি হওয়ায় প্রফিট বর্তমানে মাইনাস ফিগার (${formatCurrency(netRealizedProfit, language)}) লোকসানে রয়েছে। অতিরিক্ত বিক্রয় বৃদ্ধি পেলে এটি পুনরায় প্লাস হবে।`
                : `Notice: Operating expenses exceed sales gross profit. Net Profit is showing in negative (${formatCurrency(netRealizedProfit, language)}).`}
            </span>
          </div>
        )}

        {/* Sub-tab Switcher: 'NEW' vs 'LOG' */}
        <div className="px-4 sm:px-6 pt-3 pb-2 flex items-center justify-between gap-3 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setActiveSubTab('NEW')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                activeSubTab === 'NEW'
                  ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-950/50'
                  : 'bg-slate-800 text-slate-400 hover:text-slate-200'
              }`}
            >
              <PlusCircle className="w-3.5 h-3.5" />
              <span>{isBn ? '➕ নতুন খরচ এন্ট্রি' : '➕ Record Expense'}</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveSubTab('LOG')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                activeSubTab === 'LOG'
                  ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-950/50'
                  : 'bg-slate-800 text-slate-400 hover:text-slate-200'
              }`}
            >
              <Receipt className="w-3.5 h-3.5" />
              <span>
                {isBn ? '📋 খরচের খাতা ও অডিট' : '📋 Expense Register'} ({expenses.length})
              </span>
            </button>
          </div>

          <div className="text-right text-[11px] text-slate-400 hidden sm:block">
            {isBn ? 'অপারেটর: ' : 'Operator: '}
            <strong className="text-slate-200 font-medium">
              {currentUser.name} ({currentRole === 'counter' ? 'ক্যাশ কাউন্টার' : currentRole.toUpperCase()})
            </strong>
          </div>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
          {activeSubTab === 'NEW' ? (
            <form onSubmit={handleSubmit} className="space-y-4 max-w-2xl mx-auto">
              {/* Category Selector Grid */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-300 block">
                  {isBn ? '১. খরচের খাত বাছাই করুন:' : '1. Select Expense Category:'}
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {CATEGORIES.map((cat) => {
                    const Icon = cat.icon;
                    const isSelected = category === cat.id;
                    return (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() => handleCategorySelect(cat.id)}
                        className={`p-3 rounded-2xl border text-left transition flex flex-col justify-between gap-2 cursor-pointer ${
                          isSelected
                            ? `${cat.color} ring-2 ring-amber-400 font-bold shadow-lg`
                            : 'bg-slate-950/60 border-slate-800 hover:border-slate-700 text-slate-400'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <Icon className="w-5 h-5" />
                          {isSelected && <CheckCircle2 className="w-4 h-4 text-amber-400" />}
                        </div>
                        <div>
                          <div className={`text-xs font-bold ${isSelected ? 'text-white' : 'text-slate-300'}`}>
                            {isBn ? cat.titleBn.split(' ')[0] : cat.titleEn.split(' ')[0]}
                          </div>
                          <div className="text-[10px] text-slate-500 font-normal">
                            {isBn ? cat.titleBn : cat.titleEn}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Quick Suggestion Chips */}
              <div className="space-y-1">
                <span className="text-[10.5px] text-slate-400 font-semibold block">
                  {isBn ? '💡 দ্রুত বিবরণ নির্বাচন করুন:' : 'Quick Description Shortcuts:'}
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {currentCategoryConfig.suggestionsBn.map((sug, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => handleQuickSuggestion(sug)}
                      className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-750 text-slate-300 hover:text-white border border-slate-700/80 text-[11px] font-medium transition cursor-pointer"
                    >
                      {sug}
                    </button>
                  ))}
                </div>
              </div>

              {/* Form Input Fields */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                {/* Field: Title / Description */}
                <div className="sm:col-span-2 space-y-1">
                  <label className="text-xs font-bold text-slate-300 block">
                    {isBn ? 'খরচের বিবরণ / শিরোনাম *' : 'Expense Title / Description *'}
                  </label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder={
                      category === 'SALARY'
                        ? (isBn ? 'যেমন: রাজু আলমের সেপ্টেম্বর বেতন' : 'e.g., Staff salary')
                        : category === 'SHOP_RENT'
                        ? (isBn ? 'যেমন: সেপ্টেম্বর মাসের দোকান ভাড়া' : 'e.g., Shop rent for September')
                        : category === 'ELECTRICITY_BILL'
                        ? (isBn ? 'যেমন: চলতি মাসের পল্লী বিদ্যুৎ বিল' : 'e.g., Monthly electricity bill')
                        : (isBn ? 'যেমন: চা-নাস্তা, পরিবহন বা দোকান মেরামত' : 'e.g., Snacks, logistics, repair')
                    }
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2 text-xs font-semibold text-white focus:outline-none focus:border-amber-400"
                    required
                  />
                </div>

                {/* Field: Amount */}
                <div className="space-y-1">
                  <label className="text-xs font-bold text-amber-300 block">
                    {isBn ? 'টাকার পরিমাণ (৳) *' : 'Amount (৳) *'}
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-sm">
                      ৳
                    </span>
                    <input
                      type="text"
                      value={amountStr}
                      onChange={(e) => setAmountStr(e.target.value)}
                      placeholder={isBn ? 'টাকার অংক লিখুন' : 'Enter amount'}
                      className="w-full bg-slate-950 border-2 border-amber-500/50 focus:border-amber-400 rounded-xl pl-8 pr-3.5 py-2 text-sm font-black font-mono-num text-amber-300 focus:outline-none"
                      required
                    />
                  </div>
                </div>

                {/* Field: Recipient / Paid To */}
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-300 block">
                    {isBn
                      ? category === 'SALARY'
                        ? 'কর্মচারী / স্টাফের নাম'
                        : category === 'SHOP_RENT'
                        ? 'বাড়িওয়ালা / মার্কেটের নাম'
                        : category === 'ELECTRICITY_BILL'
                        ? 'বিল অফিস / গ্রাহক হিসাব নং'
                        : 'প্রাপকের নাম (যাকে টাকা দেওয়া হলো)'
                      : 'Recipient / Paid To Name'}
                  </label>
                  <input
                    type="text"
                    value={recipientName}
                    onChange={(e) => setRecipientName(e.target.value)}
                    placeholder={isBn ? 'নাম বা পরিচয়' : 'Recipient name'}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-amber-400"
                  />
                </div>

                {/* Field: Date */}
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-300 block">
                    {isBn ? 'তারিখ' : 'Date'}
                  </label>
                  <input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2 text-xs font-mono text-emerald-400 focus:outline-none focus:border-amber-400"
                  />
                </div>

                {/* Field: Payment Source */}
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-300 block">
                    {isBn ? 'পেমেন্ট সোর্স (যেখান থেকে টাকা গেলো)' : 'Payment Source'}
                  </label>
                  <select
                    value={paymentSource}
                    onChange={(e) => setPaymentSource(e.target.value as any)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2 text-xs font-semibold text-white focus:outline-none focus:border-amber-400"
                  >
                    <option value="CASH_DRAWER">
                      {isBn ? '🛒 ক্যাশ কাউন্টার ড্রয়ার (Counter Cash Drawer)' : 'Cash Counter Drawer'}
                    </option>
                    <option value="BANK">
                      {isBn ? '🏛️ ব্যাংক / MFS অ্যাকাউন্ট (Bank Account)' : 'Bank / MFS Account'}
                    </option>
                    <option value="OWNER_PERSONAL">
                      {isBn ? '👤 মালিকের ব্যক্তিগত তহবিল (Owner Fund)' : 'Owner Personal Fund'}
                    </option>
                  </select>
                </div>

                {/* Field: Frequency */}
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-300 block">
                    {isBn ? 'খরচের ধরন' : 'Frequency'}
                  </label>
                  <select
                    value={frequency}
                    onChange={(e) => setFrequency(e.target.value as any)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-amber-400"
                  >
                    <option value="MONTHLY">{isBn ? 'মাসিক নিয়মিত (Monthly)' : 'Monthly'}</option>
                    <option value="DAILY">{isBn ? 'দৈনিক খরচ (Daily)' : 'Daily'}</option>
                    <option value="OCCASIONAL">{isBn ? 'অনিয়মিত / বিশেষ (Occasional)' : 'Occasional'}</option>
                  </select>
                </div>

                {/* Field: Notes / Voucher No */}
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-300 block">
                    {isBn ? 'ভাউচার নং / বিশেষ মন্তব্য (ঐচ্ছিক)' : 'Voucher No / Notes'}
                  </label>
                  <input
                    type="text"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder={isBn ? 'যেমন: ভাউচার #৮৯২' : 'e.g., Voucher #892'}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-amber-400"
                  />
                </div>
              </div>

              {/* Dynamic Accounting Preview Box */}
              {parseFlexibleNumber(amountStr) > 0 && (
                <div className="p-3 rounded-2xl bg-slate-950 border border-amber-500/40 text-xs space-y-1.5 shadow-inner">
                  <div className="flex items-center justify-between font-bold text-amber-300 border-b border-slate-800 pb-1">
                    <span className="flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>{isBn ? 'এন্ট্রি পরবর্তী স্বয়ংক্রিয় হিসাব প্রভাব:' : 'Accounting Impact Preview:'}</span>
                    </span>
                    <span className="font-mono text-[10.5px]">
                      -{formatCurrency(parseFlexibleNumber(amountStr), language)}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] pt-1">
                    <div className="flex items-center justify-between p-2 rounded-xl bg-slate-900 border border-slate-800">
                      <span className="text-slate-400">
                        {isBn ? 'কাউন্টার ড্রয়ার অবশিষ্ট:' : 'Counter Drawer after:'}
                      </span>
                      <strong className={`font-mono-num ${
                        (cashCounter - parseFlexibleNumber(amountStr)) < 0 ? 'text-rose-400' : 'text-emerald-400'
                      }`}>
                        {formatCurrency(cashCounter - parseFlexibleNumber(amountStr), language)}
                      </strong>
                    </div>

                    <div className="flex items-center justify-between p-2 rounded-xl bg-slate-900 border border-slate-800">
                      <span className="text-slate-400">
                        {isBn ? 'নিট প্রফিট অবশিষ্ট:' : 'Net Profit after:'}
                      </span>
                      <strong className={`font-mono-num ${
                        (netRealizedProfit - parseFlexibleNumber(amountStr)) < 0 ? 'text-rose-400' : 'text-emerald-400'
                      }`}>
                        {formatCurrency(netRealizedProfit - parseFlexibleNumber(amountStr), language)}
                      </strong>
                    </div>
                  </div>

                  {(netRealizedProfit - parseFlexibleNumber(amountStr)) < 0 && (
                    <div className="text-[10px] text-rose-300 flex items-center gap-1 pt-1">
                      <AlertTriangle className="w-3 h-3 text-rose-400 shrink-0" />
                      <span>
                        {isBn
                          ? 'মনোযোগ দিন: মোট লাভ অপেক্ষা খরচ বেশি হওয়ায় প্রফিট মাইনাস ফিগার শো করবে।'
                          : 'Note: Expense exceeds realized profit; profit will show as negative.'}
                      </span>
                    </div>
                  )}
                </div>
              )}

              {/* Status & Error Messages */}
              {formError && (
                <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/40 text-rose-300 text-xs flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              {successMsg && (
                <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/40 text-emerald-300 text-xs flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>{successMsg}</span>
                </div>
              )}

              {/* Submit Button */}
              <button
                type="submit"
                id="btn-submit-counter-expense"
                className="w-full py-3 bg-gradient-to-r from-amber-500 via-amber-600 to-amber-500 hover:from-amber-400 hover:to-amber-500 text-slate-950 rounded-2xl font-black text-sm flex items-center justify-center gap-2 shadow-xl shadow-amber-950/50 cursor-pointer active:scale-98 transition"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>
                  {isBn
                    ? 'ক্যাশ কাউন্টার থেকে খরচ এন্ট্রি সংরক্ষণ করুন'
                    : 'Save Expense Entry to Counter & Deduct from Profit'}
                </span>
              </button>
            </form>
          ) : (
            /* Tab 2: Expense Register & Audit History */
            <div className="space-y-4">
              {/* Category Breakdown Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-xs">
                <button
                  type="button"
                  onClick={() => setLogFilterCategory('ALL')}
                  className={`p-2.5 rounded-xl border text-left transition cursor-pointer ${
                    logFilterCategory === 'ALL'
                      ? 'bg-amber-500/20 border-amber-500 text-amber-300 font-bold'
                      : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:border-slate-700'
                  }`}
                >
                  <span className="text-[10px] uppercase font-bold block">{isBn ? 'সকল খরচ' : 'All Expenses'}</span>
                  <span className="text-sm font-black font-mono-num text-white mt-0.5 block">
                    {formatCurrency(categoryTotals.ALL, language)}
                  </span>
                  <span className="text-[9.5px] text-slate-500">{expenses.length} টি এন্ট্রি</span>
                </button>

                <button
                  type="button"
                  onClick={() => setLogFilterCategory('SALARY')}
                  className={`p-2.5 rounded-xl border text-left transition cursor-pointer ${
                    logFilterCategory === 'SALARY'
                      ? 'bg-indigo-500/20 border-indigo-500 text-indigo-300 font-bold'
                      : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:border-slate-700'
                  }`}
                >
                  <span className="text-[10px] uppercase font-bold block">{isBn ? 'মোট বেতন' : 'Total Salary'}</span>
                  <span className="text-sm font-black font-mono-num text-indigo-400 mt-0.5 block">
                    {formatCurrency(categoryTotals.SALARY, language)}
                  </span>
                  <span className="text-[9.5px] text-slate-500">স্টাফ সম্মানী</span>
                </button>

                <button
                  type="button"
                  onClick={() => setLogFilterCategory('SHOP_RENT')}
                  className={`p-2.5 rounded-xl border text-left transition cursor-pointer ${
                    logFilterCategory === 'SHOP_RENT'
                      ? 'bg-amber-500/20 border-amber-500 text-amber-300 font-bold'
                      : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:border-slate-700'
                  }`}
                >
                  <span className="text-[10px] uppercase font-bold block">{isBn ? 'দোকান ভাড়া' : 'Shop Rent'}</span>
                  <span className="text-sm font-black font-mono-num text-amber-400 mt-0.5 block">
                    {formatCurrency(categoryTotals.SHOP_RENT, language)}
                  </span>
                  <span className="text-[9.5px] text-slate-500">দোকান ও গোডাউন</span>
                </button>

                <button
                  type="button"
                  onClick={() => setLogFilterCategory('ELECTRICITY_BILL')}
                  className={`p-2.5 rounded-xl border text-left transition cursor-pointer ${
                    logFilterCategory === 'ELECTRICITY_BILL'
                      ? 'bg-yellow-500/20 border-yellow-500 text-yellow-300 font-bold'
                      : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:border-slate-700'
                  }`}
                >
                  <span className="text-[10px] uppercase font-bold block">{isBn ? 'বিদ্যুৎ বিল' : 'Power Bill'}</span>
                  <span className="text-sm font-black font-mono-num text-yellow-400 mt-0.5 block">
                    {formatCurrency(categoryTotals.ELECTRICITY_BILL, language)}
                  </span>
                  <span className="text-[9.5px] text-slate-500">বিদ্যুৎ ও মিটার</span>
                </button>

                <button
                  type="button"
                  onClick={() => setLogFilterCategory('OTHER')}
                  className={`p-2.5 rounded-xl border text-left transition cursor-pointer ${
                    logFilterCategory === 'OTHER'
                      ? 'bg-teal-500/20 border-teal-500 text-teal-300 font-bold'
                      : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:border-slate-700'
                  }`}
                >
                  <span className="text-[10px] uppercase font-bold block">{isBn ? 'অন্যান্য খরচ' : 'Other'}</span>
                  <span className="text-sm font-black font-mono-num text-teal-400 mt-0.5 block">
                    {formatCurrency(categoryTotals.OTHER, language)}
                  </span>
                  <span className="text-[9.5px] text-slate-500">নাস্তা, মেরামত ও বিবিধ</span>
                </button>
              </div>

              {/* Search Bar */}
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder={
                    isBn
                      ? 'বিবরণ, প্রাপক, ভাউচার বা টাকার অংক খুঁজুন...'
                      : 'Search by description, recipient, notes or amount...'
                  }
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3.5 py-2 text-xs text-white focus:outline-none focus:border-amber-400"
                />
              </div>

              {/* Expense Table */}
              <div className="rounded-2xl border border-slate-800 overflow-hidden bg-slate-950/70">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="bg-slate-900 text-slate-400 text-[10.5px] uppercase font-bold border-b border-slate-800">
                        <th className="py-2.5 px-3">{isBn ? 'তারিখ' : 'Date'}</th>
                        <th className="py-2.5 px-3">{isBn ? 'খাত' : 'Category'}</th>
                        <th className="py-2.5 px-3">{isBn ? 'বিবরণ ও প্রাপক' : 'Description & Paid To'}</th>
                        <th className="py-2.5 px-3">{isBn ? 'পেমেন্ট সোর্স' : 'Source'}</th>
                        <th className="py-2.5 px-3 text-right">{isBn ? 'পরিমাণ (৳)' : 'Amount (৳)'}</th>
                        <th className="py-2.5 px-3 text-center">{isBn ? 'অ্যাকশন' : 'Action'}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60 font-sans">
                      {filteredExpenses.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="py-8 text-center text-slate-500 text-xs">
                            {searchTerm
                              ? (isBn ? 'অনুসন্ধানের সাথে কোনো খরচ মেলেনি' : 'No expenses match search')
                              : (isBn ? 'এখনো কোনো খরচ এন্ট্রি করা হয়নি' : 'No expenses recorded yet')}
                          </td>
                        </tr>
                      ) : (
                        filteredExpenses.map((exp) => {
                          const cfg = CATEGORIES.find((c) => c.id === exp.category) || CATEGORIES[3];
                          return (
                            <tr key={exp.id} className="hover:bg-slate-900/60 transition group">
                              <td className="py-2.5 px-3 font-mono text-[11px] text-slate-400 whitespace-nowrap">
                                {exp.date}
                              </td>
                              <td className="py-2.5 px-3">
                                <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full border ${cfg.badgeBg}`}>
                                  {isBn ? cfg.titleBn.split(' ')[0] : cfg.titleEn.split(' ')[0]}
                                </span>
                              </td>
                              <td className="py-2.5 px-3">
                                <div className="font-bold text-white text-xs">{exp.title}</div>
                                {exp.recipientName && (
                                  <div className="text-[10.5px] text-slate-400">
                                    {isBn ? 'প্রাপক: ' : 'Paid to: '}
                                    <strong className="text-slate-300">{exp.recipientName}</strong>
                                  </div>
                                )}
                                {exp.notes && (
                                  <div className="text-[10px] text-slate-500 font-mono">
                                    রেফ: {exp.notes}
                                  </div>
                                )}
                              </td>
                              <td className="py-2.5 px-3 text-[11px] text-slate-300 whitespace-nowrap">
                                {exp.paymentSource === 'CASH_DRAWER' ? (
                                  <span className="text-emerald-400 font-semibold">🛒 কাউন্টার ড্রয়ার</span>
                                ) : exp.paymentSource === 'BANK' ? (
                                  <span className="text-sky-400 font-semibold">🏛️ ব্যাংক একাউন্ট</span>
                                ) : (
                                  <span className="text-amber-400 font-semibold">👤 মালিকের তহবিল</span>
                                )}
                              </td>
                              <td className="py-2.5 px-3 text-right font-black font-mono-num text-rose-400 whitespace-nowrap text-sm">
                                -{formatCurrency(exp.amount, language)}
                              </td>
                              <td className="py-2.5 px-3 text-center">
                                <button
                                  type="button"
                                  onClick={() => {
                                    if (confirm(isBn ? 'এই খরচ এন্ট্রিটি মুছে ফেলতে চান?' : 'Delete this expense entry?')) {
                                      deleteExpense(exp.id);
                                    }
                                  }}
                                  className="p-1 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-slate-800 transition cursor-pointer"
                                  title={isBn ? 'মুছে ফেলুন' : 'Delete'}
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-4 sm:px-6 py-3 bg-slate-950 border-t border-slate-800 flex items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-1.5 text-slate-400">
            <Receipt className="w-4 h-4 text-amber-400" />
            <span>
              {isBn
                ? `মোট খরচ তালিকাভুক্ত: ${expenses.length} টি (${formatCurrency(totalExpenses, language)})`
                : `${expenses.length} total expense(s) recorded (${formatCurrency(totalExpenses, language)})`}
            </span>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl font-bold transition cursor-pointer"
          >
            {isBn ? 'বন্ধ করুন' : 'Close'}
          </button>
        </div>
      </div>
    </div>
  );
};
