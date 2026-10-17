import React, { useState, useEffect } from 'react';
import { useWholesale } from '../context/WholesaleContext';
import { translations, formatCurrency, getTodayDateString, getYesterdayDateString, formatDate } from '../utils/translations';
import { Supplier } from '../types';
import {
  Building2,
  Coins,
  CreditCard,
  Plus,
  X,
  CheckCircle2,
  AlertTriangle,
  Send,
  PlusCircle,
  Sparkles,
  Wallet,
  Calendar,
  History,
  ArrowUpRight,
  ArrowDownLeft,
  Search,
  Filter,
  FileText,
  RefreshCw
} from 'lucide-react';
import { AddSupplierModal } from './AddSupplierModal';

interface AdminCompanyPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenInvestModal?: () => void;
}

export const AdminCompanyPaymentModal: React.FC<AdminCompanyPaymentModalProps> = ({
  isOpen,
  onClose,
  onOpenInvestModal,
}) => {
  const {
    language,
    suppliers,
    supplierLedger,
    cashAdmin,
    cashReceivedFromCounter,
    cashReceivedFromDSR,
    adminDirectCashSales,
    cashCapitalInjected,
    cashCounter,
    totalCounterCash,
    totalDsrCash,
    totalStaffCash,
    totalCompanyCashPaid,
    totalCompanyPaid,
    totalGrossPurchases,
    quickReceiveFromCounter,
    addSupplierPayment,
  } = useWholesale();

  const t = translations[language];

  const [activeTab, setActiveTab] = useState<'NEW_PAYMENT' | 'HISTORY'>('NEW_PAYMENT');
  const [selectedSupplierId, setSelectedSupplierId] = useState<string>(
    suppliers[0]?.id || ''
  );
  const [paymentAmount, setPaymentAmount] = useState<number>(0);
  const [paymentDate, setPaymentDate] = useState<string>(getTodayDateString());
  const [paymentMethod, setPaymentMethod] = useState<
    'Cash' | 'Bank Transfer' | 'bKash / Nagad' | 'Cheque'
  >('Cash');
  const [paymentRef, setPaymentRef] = useState<string>(() => `PAY-${Date.now().toString().slice(-6)}`);
  const [paymentNotes, setPaymentNotes] = useState<string>('কোম্পানি ইনভয়েস বিল পরিশোধ (Supplier Bill Settlement)');
  const [isAddSupplierOpen, setIsAddSupplierOpen] = useState<boolean>(false);
  const [isSuccess, setIsSuccess] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // History date filter & search
  const [historySupplierFilter, setHistorySupplierFilter] = useState<string>('ALL');
  const [historyTypeFilter, setHistoryTypeFilter] = useState<'ALL' | 'PAYMENT' | 'PURCHASE'>('ALL');
  const [historyDateFilter, setHistoryDateFilter] = useState<string>('');
  const [historySearchTerm, setHistorySearchTerm] = useState<string>('');

  useEffect(() => {
    if ((!selectedSupplierId || !suppliers.some(s => s.id === selectedSupplierId)) && suppliers.length > 0) {
      setSelectedSupplierId(suppliers[0].id);
    }
  }, [suppliers, selectedSupplierId]);

  const generateFreshPaymentRef = () => {
    let fresh = `PAY-${Date.now().toString().slice(-6)}`;
    while (supplierLedger.some((e) => e.referenceNo?.toLowerCase() === fresh.toLowerCase())) {
      fresh = `PAY-${(Date.now() + Math.floor(Math.random() * 900 + 100)).toString().slice(-6)}`;
    }
    return fresh;
  };

  useEffect(() => {
    if (isOpen) {
      setPaymentRef(generateFreshPaymentRef());
      setErrorMsg(null);
      setIsSuccess(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const activeSupplier = suppliers.find((s) => s.id === selectedSupplierId) || suppliers[0];

  const handleSupplierChange = (supId: string) => {
    setSelectedSupplierId(supId);
    const sup = suppliers.find((s) => s.id === supId);
    if (sup && sup.outstandingPayable > 0) {
      setPaymentAmount(sup.outstandingPayable);
    }
  };

  const isCashPayment = paymentMethod === 'Cash';
  const isCashDeficit = isCashPayment && (cashAdmin - paymentAmount < 0);

  // Filter history for selected supplier or all suppliers
  const supplierHistory = supplierLedger.filter((entry) => {
    if (historySupplierFilter !== 'ALL') {
      const targetSup = suppliers.find(s => s.id === historySupplierFilter);
      const idMatch = entry.supplierId === historySupplierFilter;
      const nameMatch = targetSup && entry.supplierName && (
        entry.supplierName.trim().toLowerCase() === targetSup.name.trim().toLowerCase() ||
        entry.supplierName.trim().toLowerCase() === targetSup.company.trim().toLowerCase()
      );
      if (!idMatch && !nameMatch) return false;
    }
    if (historyTypeFilter !== 'ALL' && entry.type !== historyTypeFilter) return false;
    if (historyDateFilter && entry.date !== historyDateFilter) return false;
    if (historySearchTerm.trim()) {
      const q = historySearchTerm.toLowerCase();
      const matchRef = entry.referenceNo?.toLowerCase().includes(q);
      const matchNotes = entry.notes?.toLowerCase().includes(q);
      const matchSup = entry.supplierName?.toLowerCase().includes(q);
      const matchAmount = entry.amount.toString().includes(q);
      if (!matchRef && !matchNotes && !matchAmount && !matchSup) return false;
    }
    return true;
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!activeSupplier) {
      setErrorMsg(language === 'bn' ? 'অনুগ্রহ করে কোম্পানি/সাপ্লায়ার নির্বাচন করুন।' : 'Please select a company/supplier.');
      return;
    }
    if (paymentAmount <= 0) {
      setErrorMsg(language === 'bn' ? 'সঠিক পেমেন্টের পরিমাণ লিখুন।' : 'Please enter a valid payment amount.');
      return;
    }

    const refToRecord = paymentRef.trim() || generateFreshPaymentRef();
    addSupplierPayment(
      activeSupplier.id,
      paymentAmount,
      paymentMethod,
      refToRecord,
      paymentNotes,
      paymentDate
    );

    // Auto-advance to the next unique voucher number immediately for subsequent entry
    setPaymentRef(generateFreshPaymentRef());
    setPaymentAmount(0);

    setIsSuccess(true);
    setTimeout(() => {
      setIsSuccess(false);
      onClose();
    }, 1000);
  };

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
        <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
          {/* Header */}
          <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/90 shrink-0">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-indigo-500 to-purple-600 flex items-center justify-center text-white shadow-lg shadow-indigo-950/40">
                <Building2 className="w-4 h-4" />
              </div>
              <div>
                <h3 className="font-bold text-white text-sm sm:text-base">
                  {language === 'bn' ? 'এডমিন কোম্পানিতে পেমেন্ট ভাউচার' : 'Admin Supplier / Company Payment'}
                </h3>
                <p className="text-[11px] text-slate-400">
                  {language === 'bn' ? 'কোম্পানির বকেয়া পরিশোধ, তারিখ নির্বাচন ও পূর্ববর্তী লেনদেন' : 'Settle supplier payables, select custom date & inspect history'}
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

          {/* Navigation Sub-Tabs */}
          <div className="flex border-b border-slate-800 bg-slate-950/60 shrink-0">
            <button
              type="button"
              onClick={() => setActiveTab('NEW_PAYMENT')}
              className={`flex-1 py-2.5 px-4 text-xs font-bold flex items-center justify-center gap-2 border-b-2 transition ${
                activeTab === 'NEW_PAYMENT'
                  ? 'border-indigo-500 text-indigo-400 bg-indigo-500/10'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              <Send className="w-3.5 h-3.5" />
              <span>{language === 'bn' ? 'নতুন পেমেন্ট এন্ট্রি' : 'New Payment Voucher'}</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('HISTORY')}
              className={`flex-1 py-2.5 px-4 text-xs font-bold flex items-center justify-center gap-2 border-b-2 transition ${
                activeTab === 'HISTORY'
                  ? 'border-purple-500 text-purple-400 bg-purple-500/10'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              <History className="w-3.5 h-3.5" />
              <span>{language === 'bn' ? 'পূর্ববর্তী লেনদেন ও লেজার' : 'Past Transactions & Ledger'}</span>
              <span className="px-1.5 py-0.2 bg-purple-950/80 border border-purple-800/60 rounded-full text-[10px] text-purple-300 font-mono">
                {supplierHistory.length}
              </span>
            </button>
          </div>

          {/* Body Content */}
          <div className="overflow-y-auto p-4 flex-1">
            {activeTab === 'NEW_PAYMENT' ? (
              <form onSubmit={handleSubmit} className="space-y-3.5 text-xs">
                {errorMsg && (
                  <div className="p-2.5 rounded-xl bg-rose-500/20 border border-rose-500/40 text-rose-300 text-xs font-semibold">
                    {errorMsg}
                  </div>
                )}

                {/* Select Supplier or Add New */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <label className="text-slate-300 font-bold block">
                      {language === 'bn' ? 'কোম্পানি / সাপ্লায়ার নির্বাচন করুন' : 'Select Company / Supplier'} *
                    </label>
                    <button
                      type="button"
                      onClick={() => setIsAddSupplierOpen(true)}
                      className="text-indigo-400 hover:text-indigo-300 font-bold flex items-center gap-1 text-[11px] cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>{language === 'bn' ? '+ নতুন সাপ্লায়ার যোগ' : '+ Add New Supplier'}</span>
                    </button>
                  </div>

                  {suppliers.length === 0 ? (
                    <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-center space-y-2">
                      <p className="text-slate-400 text-xs">
                        {language === 'bn' ? 'কোনো সাপ্লায়ার তালিকাভুক্ত নেই।' : 'No suppliers registered yet.'}
                      </p>
                      <button
                        type="button"
                        onClick={() => setIsAddSupplierOpen(true)}
                        className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-bold transition"
                      >
                        {language === 'bn' ? '+ প্রথম সাপ্লায়ার যোগ করুন' : '+ Add First Supplier'}
                      </button>
                    </div>
                  ) : (
                    <select
                      id="select-company-to-pay"
                      value={activeSupplier?.id || ''}
                      onChange={(e) => handleSupplierChange(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2.5 text-white font-medium text-xs focus:outline-none focus:border-indigo-500"
                    >
                      {suppliers.map((sup) => (
                        <option key={sup.id} value={sup.id}>
                          {sup.company} — {language === 'bn' ? 'বকেয়া:' : 'Due:'} ৳{sup.outstandingPayable.toLocaleString()} ({sup.phone})
                        </option>
                      ))}
                    </select>
                  )}
                </div>

                {/* Active Supplier Dues & Contact Card */}
                {activeSupplier && (
                  <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 flex items-center justify-between gap-3">
                    <div>
                      <div className="font-bold text-slate-200 text-xs">{activeSupplier.company}</div>
                      <div className="text-[11px] text-slate-400 font-mono">
                        {activeSupplier.name} • {activeSupplier.phone}
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] text-slate-400 uppercase font-bold block">
                        {language === 'bn' ? 'বর্তমান বকেয়া দেনা' : 'Outstanding Due'}
                      </span>
                      <span className="text-sm sm:text-base font-extrabold text-rose-400 font-mono-num">
                        {formatCurrency(activeSupplier.outstandingPayable, language)}
                      </span>
                    </div>
                  </div>
                )}

                {/* Date Selection Box (তারিখ নির্বাচন) */}
                <div className="space-y-1.5 p-3 rounded-xl bg-slate-950/80 border border-indigo-500/20">
                  <div className="flex items-center justify-between">
                    <label className="text-indigo-300 font-bold flex items-center gap-1.5 text-xs">
                      <Calendar className="w-3.5 h-3.5 text-indigo-400" />
                      <span>{language === 'bn' ? 'পেমেন্ট / ভাউচার তারিখ (Date Selection)' : 'Payment / Voucher Date'} *</span>
                    </label>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => setPaymentDate(getTodayDateString())}
                        className={`text-[10px] px-2 py-0.5 rounded font-bold transition ${
                          paymentDate === getTodayDateString()
                            ? 'bg-indigo-600 text-white'
                            : 'bg-slate-800 text-slate-400 hover:text-white'
                        }`}
                      >
                        {language === 'bn' ? 'আজ' : 'Today'}
                      </button>
                      <button
                        type="button"
                        onClick={() => setPaymentDate(getYesterdayDateString())}
                        className={`text-[10px] px-2 py-0.5 rounded font-bold transition ${
                          paymentDate === getYesterdayDateString()
                            ? 'bg-indigo-600 text-white'
                            : 'bg-slate-800 text-slate-400 hover:text-white'
                        }`}
                      >
                        {language === 'bn' ? 'গতকাল' : 'Yesterday'}
                      </button>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="date"
                      required
                      value={paymentDate}
                      onChange={(e) => setPaymentDate(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-900 border border-slate-700 focus:border-indigo-500 rounded-xl text-white font-mono text-xs focus:outline-none"
                    />
                    <div className="shrink-0 text-[11px] text-slate-400 font-mono px-2 py-1.5 bg-slate-900 rounded-lg border border-slate-800">
                      {formatDate(paymentDate, language)}
                    </div>
                  </div>
                  {paymentDate !== getTodayDateString() && (
                    <div className="text-[10px] text-amber-400 flex items-center gap-1">
                      <Sparkles className="w-3 h-3" />
                      <span>
                        {language === 'bn'
                          ? `পূর্ববর্তী তারিখের ভাউচার হিসেবে সংরক্ষিত হবে (${formatDate(paymentDate, language)})`
                          : `Will be recorded as backdated voucher on (${formatDate(paymentDate, language)})`}
                      </span>
                    </div>
                  )}
                </div>

                {/* Payment Method Selector */}
                <div className="space-y-1">
                  <label className="text-slate-300 font-bold block">
                    {language === 'bn' ? 'পেমেন্টের মাধ্যম' : 'Payment Method'}
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {(['Cash', 'Bank Transfer', 'bKash / Nagad', 'Cheque'] as const).map((method) => (
                      <button
                        type="button"
                        key={method}
                        onClick={() => setPaymentMethod(method)}
                        className={`py-2 px-2 rounded-xl text-xs font-bold transition border ${
                          paymentMethod === method
                            ? 'bg-indigo-600 text-white border-indigo-500 shadow-md'
                            : 'bg-slate-950 text-slate-400 border-slate-800 hover:border-slate-700 hover:text-slate-200'
                        }`}
                      >
                        {method === 'Cash' && (language === 'bn' ? '💵 ক্যাশ' : 'Cash')}
                        {method === 'Bank Transfer' && (language === 'bn' ? '🏛️ ব্যাংক' : 'Bank')}
                        {method === 'bKash / Nagad' && (language === 'bn' ? '📱 বিকাশ/নগদ' : 'MFS')}
                        {method === 'Cheque' && (language === 'bn' ? '📄 চেক' : 'Cheque')}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Cash Balance Warning & Invest Button if Insufficient */}
                {isCashPayment && (
                  <div
                    className={`p-3 rounded-xl border flex flex-col gap-2 ${
                      isCashDeficit
                        ? 'bg-rose-950/30 border-rose-500/40 text-rose-300'
                        : 'bg-slate-950/80 border-slate-800 text-slate-300'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Wallet className={`w-4 h-4 ${cashAdmin < 0 ? 'text-rose-400 animate-pulse' : 'text-emerald-400'}`} />
                        <span className="text-xs font-bold">
                          {language === 'bn' ? 'এডমিনের বর্তমান ক্যাশ ব্যালেন্স:' : 'Current Admin Cash Balance:'}
                        </span>
                      </div>
                      <span className={`font-mono-num font-extrabold text-sm ${cashAdmin < 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
                        {formatCurrency(cashAdmin, language)}
                      </span>
                    </div>

                    {/* Breakdown Formula Note */}
                    <div className="p-2 rounded-lg bg-slate-900/90 border border-slate-800 text-[10px] text-slate-300 font-mono space-y-0.5">
                      <div className="flex justify-between">
                        <span>{language === 'bn' ? 'কাউন্টার থেকে প্রাপ্ত ক্যাশ:' : 'From Counter to Vault:'}</span>
                        <span className="text-emerald-400 font-bold font-mono-num">+{formatCurrency(cashReceivedFromCounter, language)}</span>
                      </div>
                      {(adminDirectCashSales > 0 || cashCapitalInjected !== 0) && (
                        <div className="flex justify-between">
                          <span>{language === 'bn' ? 'এডমিন নিজস্ব বিক্রয় / মূলধন:' : 'Direct Sales / Capital:'}</span>
                          <span className="text-teal-400 font-bold font-mono-num">+{formatCurrency(adminDirectCashSales + cashCapitalInjected, language)}</span>
                        </div>
                      )}
                      {cashReceivedFromDSR > 0 && (
                        <div className="flex justify-between">
                          <span>{language === 'bn' ? 'ডিএসআর সরাসরি জমা:' : 'Direct DSR Deposit:'}</span>
                          <span className="text-sky-400 font-bold font-mono-num">+{formatCurrency(cashReceivedFromDSR, language)}</span>
                        </div>
                      )}
                      <div className="flex justify-between text-rose-300 border-t border-slate-800/80 pt-0.5">
                        <span>{language === 'bn' ? 'কোম্পানি বিল পরিশোধ (ক্যাশ মাইনাস):' : 'Company Bills Paid (Minus):'}</span>
                        <span className="text-rose-400 font-bold font-mono-num">-{formatCurrency(totalCompanyCashPaid, language)}</span>
                      </div>
                      {totalCompanyPaid > 0 && (
                        <div className="flex justify-between text-indigo-300 border-t border-slate-800/80 pt-0.5">
                          <span>{language === 'bn' ? 'সকল মাধ্যমে মোট পরিশোধ:' : 'Total Company Paid:'}</span>
                          <span className="text-indigo-300 font-bold font-mono-num">{formatCurrency(totalCompanyPaid, language)}</span>
                        </div>
                      )}
                      <div className="flex justify-between text-amber-300 border-t border-slate-700/80 pt-0.5 font-bold">
                        <span>{language === 'bn' ? '= এডমিন ক্যাশ ড্রয়ার (বর্তমান ব্যালেন্স):' : '= Admin Cash Drawer (Balance):'}</span>
                        <span className={`font-mono-num ${cashAdmin < 0 ? 'text-rose-400 font-extrabold' : 'text-emerald-400 font-extrabold'}`}>
                          {formatCurrency(cashAdmin, language)}
                        </span>
                      </div>
                    </div>

                    {cashCounter > 0 && cashAdmin < 0 && (
                      <div className="flex items-center justify-between gap-1 p-2 rounded-lg bg-emerald-950/40 border border-emerald-500/30 text-[11px]">
                        <span className="text-emerald-300">
                          {language === 'bn'
                            ? `কাউন্টার ড্রয়ারে ${formatCurrency(cashCounter, language)} আছে — ভল্টে জমা নিয়ে কোম্পানি পেমেন্ট সমন্বয় করুন`
                            : `Counter has ${formatCurrency(cashCounter, language)} available to offset payment`}
                        </span>
                        <button
                          type="button"
                          onClick={() => quickReceiveFromCounter(Math.min(cashCounter, Math.abs(cashAdmin)))}
                          className="px-2 py-0.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded font-bold text-[10px] transition cursor-pointer shrink-0"
                        >
                          {language === 'bn' ? 'জমা গ্রহণ' : 'Receive'}
                        </button>
                      </div>
                    )}

                    {isCashDeficit && (
                      <div className="flex items-center justify-between gap-2 pt-1 border-t border-rose-500/30 flex-wrap">
                        <p className="text-[11px] text-rose-300">
                          {language === 'bn'
                            ? `⚠️ পেমেন্ট শেষে এডমিন ক্যাশ মাইনাস হবে (${formatCurrency(cashAdmin - paymentAmount, language)})। ডিএসআর ও কাউন্টার থেকে কালেকশন পেলে সমন্বয় হবে।`
                            : `⚠️ Admin cash will enter deficit (${formatCurrency(cashAdmin - paymentAmount, language)}). Receiving collections will reconcile it.`}
                        </p>
                        <button
                          type="button"
                          id="btn-trigger-invest-from-payment"
                          onClick={onOpenInvestModal}
                          className="px-2 py-0.5 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/30 rounded-lg text-[11px] font-bold flex items-center gap-1 shrink-0 cursor-pointer"
                        >
                          <PlusCircle className="w-3 h-3" />
                          <span>{language === 'bn' ? '+ ইনভেস্ট' : '+ Invest'}</span>
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {/* Payment Amount */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <label className="text-slate-300 font-bold block">
                      {language === 'bn' ? 'পেমেন্টের পরিমাণ (৳)' : 'Payment Amount (৳)'} *
                    </label>
                    {activeSupplier && activeSupplier.outstandingPayable > 0 && (
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => setPaymentAmount(Math.round(activeSupplier.outstandingPayable / 2))}
                          className="text-[10px] text-indigo-400 hover:text-white px-1.5 py-0.5 bg-slate-800 rounded font-semibold"
                        >
                          50% (৳{Math.round(activeSupplier.outstandingPayable / 2).toLocaleString()})
                        </button>
                        <button
                          type="button"
                          onClick={() => setPaymentAmount(activeSupplier.outstandingPayable)}
                          className="text-[10px] text-emerald-400 hover:text-white px-1.5 py-0.5 bg-slate-800 rounded font-semibold"
                        >
                          {language === 'bn' ? 'পুরো বকেয়া' : 'Full Due'} (৳{activeSupplier.outstandingPayable.toLocaleString()})
                        </button>
                      </div>
                    )}
                  </div>

                  <div className="relative">
                    <span className="absolute left-3 top-2.5 font-bold text-emerald-400">৳</span>
                    <input
                      type="number"
                      min="0.01"
                      step="any"
                      required
                      id="input-company-payment-amount"
                      value={paymentAmount || ''}
                      onChange={(e) => setPaymentAmount(Number(e.target.value))}
                      placeholder="e.g. 50000"
                      className="w-full pl-8 pr-3 py-2 bg-slate-950 border border-slate-700 focus:border-indigo-500 rounded-xl text-white font-mono font-bold text-sm focus:outline-none"
                    />
                  </div>
                </div>

                {/* Reference & Notes */}
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <label className="text-slate-300 font-bold block text-xs">
                        {language === 'bn' ? 'ভাউচার / রেফারেন্স নং' : 'Voucher / Ref No'}
                      </label>
                      <span className="text-[10px] text-emerald-400 font-mono">
                        {language === 'bn' ? 'স্বয়ংক্রিয় ইউনিক নং' : 'Auto-Unique'}
                      </span>
                    </div>
                    <div className="relative flex items-center">
                      <input
                        type="text"
                        value={paymentRef}
                        onChange={(e) => setPaymentRef(e.target.value)}
                        placeholder="PAY-123456"
                        className="w-full px-3 py-2 pr-9 bg-slate-950 border border-slate-700 focus:border-indigo-500 rounded-xl text-white font-mono focus:outline-none text-xs"
                      />
                      <button
                        type="button"
                        onClick={() => setPaymentRef(generateFreshPaymentRef())}
                        title={language === 'bn' ? 'পরবর্তী নতুন ভাউচার নম্বর নিন' : 'Generate next voucher number'}
                        className="absolute right-2 text-slate-400 hover:text-emerald-400 p-1 transition-colors"
                      >
                        <RefreshCw className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-slate-300 font-bold block">
                      {language === 'bn' ? 'বিবরণ / নোট' : 'Notes'}
                    </label>
                    <input
                      type="text"
                      value={paymentNotes}
                      onChange={(e) => setPaymentNotes(e.target.value)}
                      placeholder="Supplier bill payment"
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-700 focus:border-indigo-500 rounded-xl text-white focus:outline-none"
                    />
                  </div>
                </div>

                {isSuccess && (
                  <div className="p-3 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 font-bold flex items-center justify-center gap-2 animate-in zoom-in-95">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    <span>{language === 'bn' ? 'কোম্পানি পেমেন্ট সফলভাবে সম্পন্ন হয়েছে!' : 'Company payment voucher recorded!'}</span>
                  </div>
                )}

                {/* Actions */}
                <div className="flex items-center gap-2 pt-2 border-t border-slate-800">
                  <button
                    type="button"
                    onClick={onClose}
                    className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-bold transition cursor-pointer"
                  >
                    {t.cancel}
                  </button>
                  <button
                    type="submit"
                    id="btn-confirm-company-payment"
                    disabled={paymentAmount <= 0}
                    className={`flex-1 py-2.5 rounded-xl font-bold transition shadow-lg flex items-center justify-center gap-1.5 active:scale-95 ${
                      paymentAmount <= 0
                        ? 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700'
                        : 'bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white shadow-indigo-950/40 cursor-pointer'
                    }`}
                  >
                    <Send className="w-4 h-4" />
                    <span>{language === 'bn' ? 'পেমেন্ট কনফার্ম করুন' : 'Confirm Payment'}</span>
                  </button>
                </div>
              </form>
            ) : (
              /* History & Previous Transactions View with Date Filter */
              <div className="space-y-3">
                {/* Search & Date Filter Bar */}
                <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 space-y-2.5">
                  <div className="text-xs font-bold text-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-1.5">
                    <span className="flex items-center gap-1.5">
                      <History className="w-4 h-4 text-emerald-400" />
                      <span>{language === 'bn' ? 'কোম্পানি পেমেন্ট ও লেনদেন হিস্ট্রি' : 'Company Payment & Transaction History'}</span>
                    </span>
                    <span className="text-emerald-400 font-mono text-[11px] font-bold">
                      {supplierHistory.length} {language === 'bn' ? 'টি ভাউচার' : 'vouchers'} (মোট: {formatCurrency(supplierHistory.reduce((s, e) => s + (e.amount || 0), 0), language)})
                    </span>
                  </div>

                  {/* Company & Type Filters */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 border-t border-slate-800/60">
                    <div className="space-y-1">
                      <label className="text-[11px] text-slate-400 font-semibold flex items-center gap-1">
                        <Building2 className="w-3 h-3 text-indigo-400" />
                        <span>{language === 'bn' ? 'কোম্পানি ফিল্টার:' : 'Filter Company:'}</span>
                      </label>
                      <select
                        value={historySupplierFilter}
                        onChange={(e) => setHistorySupplierFilter(e.target.value)}
                        className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-white text-xs focus:outline-none focus:border-indigo-500 font-medium"
                      >
                        <option value="ALL">{language === 'bn' ? 'সকল কোম্পানি (All Companies)' : 'All Companies'}</option>
                        {suppliers.map((s) => (
                          <option key={s.id} value={s.id}>
                            {s.company || s.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[11px] text-slate-400 font-semibold flex items-center gap-1">
                        <Filter className="w-3 h-3 text-emerald-400" />
                        <span>{language === 'bn' ? 'লেনদেনের ধরন:' : 'Transaction Type:'}</span>
                      </label>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => setHistoryTypeFilter('ALL')}
                          className={`flex-1 py-1.5 rounded-lg text-[11px] font-bold transition ${
                            historyTypeFilter === 'ALL'
                              ? 'bg-indigo-600 text-white shadow-sm'
                              : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-700'
                          }`}
                        >
                          {language === 'bn' ? 'সব' : 'All'}
                        </button>
                        <button
                          type="button"
                          onClick={() => setHistoryTypeFilter('PAYMENT')}
                          className={`flex-1 py-1.5 rounded-lg text-[11px] font-bold transition ${
                            historyTypeFilter === 'PAYMENT'
                              ? 'bg-emerald-600 text-white shadow-sm'
                              : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-700'
                          }`}
                        >
                          {language === 'bn' ? 'পেমেন্ট' : 'Payments'}
                        </button>
                        <button
                          type="button"
                          onClick={() => setHistoryTypeFilter('PURCHASE')}
                          className={`flex-1 py-1.5 rounded-lg text-[11px] font-bold transition ${
                            historyTypeFilter === 'PURCHASE'
                              ? 'bg-amber-600 text-white shadow-sm'
                              : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-700'
                          }`}
                        >
                          {language === 'bn' ? 'ক্রয় চালান' : 'Purchases'}
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {/* Date Picker Filter */}
                    <div className="space-y-1">
                      <label className="text-[11px] text-slate-400 font-semibold flex items-center gap-1">
                        <Calendar className="w-3 h-3 text-indigo-400" />
                        <span>{language === 'bn' ? 'তারিখ দিয়ে ফিল্টার:' : 'Filter by Date:'}</span>
                      </label>
                      <div className="flex items-center gap-1.5">
                        <input
                          type="date"
                          value={historyDateFilter}
                          onChange={(e) => setHistoryDateFilter(e.target.value)}
                          className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-white font-mono text-xs focus:outline-none focus:border-indigo-500"
                        />
                        {historyDateFilter && (
                          <button
                            type="button"
                            onClick={() => setHistoryDateFilter('')}
                            className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs"
                            title={language === 'bn' ? 'তারিখ ক্লিয়ার' : 'Clear Date'}
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Search Term Filter */}
                    <div className="space-y-1">
                      <label className="text-[11px] text-slate-400 font-semibold flex items-center gap-1">
                        <Search className="w-3 h-3 text-purple-400" />
                        <span>{language === 'bn' ? 'কোম্পানি / ভাউচার / বিবরণ খুঁজুন:' : 'Search Company / Ref / Notes:'}</span>
                      </label>
                      <input
                        type="text"
                        value={historySearchTerm}
                        onChange={(e) => setHistorySearchTerm(e.target.value)}
                        placeholder={language === 'bn' ? 'কোম্পানি, রেফ নং বা বিবরণ...' : 'Search company, ref...'}
                        className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-white text-xs focus:outline-none focus:border-purple-500"
                      />
                    </div>
                  </div>

                  {/* Quick Date Presets */}
                  <div className="flex items-center gap-1.5 flex-wrap pt-1 border-t border-slate-800/80">
                    <span className="text-[10px] text-slate-500 font-bold">
                      {language === 'bn' ? 'দ্রুত ফিল্টার:' : 'Quick:'}
                    </span>
                    <button
                      type="button"
                      onClick={() => setHistoryDateFilter('')}
                      className={`text-[10px] px-2 py-0.5 rounded font-bold transition ${
                        !historyDateFilter ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-400 hover:text-white'
                      }`}
                    >
                      {language === 'bn' ? 'সকল তারিখ' : 'All Dates'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setHistoryDateFilter(getTodayDateString())}
                      className={`text-[10px] px-2 py-0.5 rounded font-bold transition ${
                        historyDateFilter === getTodayDateString() ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-400 hover:text-white'
                      }`}
                    >
                      {language === 'bn' ? 'আজকের' : 'Today'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setHistoryDateFilter(getYesterdayDateString())}
                      className={`text-[10px] px-2 py-0.5 rounded font-bold transition ${
                        historyDateFilter === getYesterdayDateString() ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-400 hover:text-white'
                      }`}
                    >
                      {language === 'bn' ? 'গতকালের' : 'Yesterday'}
                    </button>
                  </div>
                </div>

                {/* Ledger Items List */}
                {supplierHistory.length === 0 ? (
                  <div className="p-8 text-center bg-slate-950/60 rounded-xl border border-slate-800 space-y-2">
                    <FileText className="w-8 h-8 text-slate-600 mx-auto" />
                    <p className="text-xs text-slate-400">
                      {language === 'bn' ? 'নির্বাচিত ফিল্টারে কোনো পূর্ববর্তী লেনদেন পাওয়া যায়নি।' : 'No transaction records found matching filter.'}
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2 max-h-[340px] overflow-y-auto pr-1">
                    {supplierHistory.map((item) => {
                      const isPayment = item.type === 'PAYMENT';
                      const suppObj = suppliers.find(s => s.id === item.supplierId);
                      const displayName = item.supplierName || suppObj?.company || suppObj?.name || 'কোম্পানি';
                      return (
                        <div
                          key={item.id}
                          className="p-3 rounded-xl bg-slate-950/70 border border-slate-800/90 hover:border-slate-700 transition flex items-center justify-between gap-2 text-xs"
                        >
                          <div className="flex items-center gap-2.5">
                            <div
                              className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                                isPayment
                                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                                  : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                              }`}
                            >
                              {isPayment ? <ArrowDownLeft className="w-3.5 h-3.5" /> : <ArrowUpRight className="w-3.5 h-3.5" />}
                            </div>
                            <div>
                              <div className="font-bold text-slate-200 flex items-center gap-1.5 flex-wrap">
                                <span className="text-indigo-300 font-extrabold">{displayName}</span>
                                <span className="text-[10px] text-slate-400">•</span>
                                <span>{isPayment ? (language === 'bn' ? 'পেমেন্ট পরিশোধ' : 'Payment Disbursed') : (language === 'bn' ? 'পণ্য ক্রয় / ইনভয়েস' : 'Stock Purchase')}</span>
                                <span className="text-[10px] text-slate-400 font-mono px-1.5 py-0.2 bg-slate-900 rounded border border-slate-800">
                                  #{item.referenceNo}
                                </span>
                              </div>
                              <div className="text-[11px] text-slate-400 flex items-center gap-2 pt-0.5">
                                <span className="font-mono">{formatDate(item.date, language)}</span>
                                {item.paymentMethod && (
                                  <span className="text-emerald-400 font-semibold">• {item.paymentMethod}</span>
                                )}
                                {item.notes && (
                                  <span className="truncate max-w-[140px] text-slate-500">• {item.notes}</span>
                                )}
                              </div>
                            </div>
                          </div>

                          <div className="text-right shrink-0">
                            <span
                              className={`font-mono-num font-bold text-xs block ${
                                isPayment ? 'text-emerald-400' : 'text-rose-400'
                              }`}
                            >
                              {isPayment ? '-' : '+'}
                              {formatCurrency(item.amount, language)}
                            </span>
                            <span className="text-[10px] text-slate-500 font-mono">
                              {language === 'bn' ? 'অবশিষ্ট বকেয়া:' : 'Bal:'} ৳{item.balanceAfter.toLocaleString()}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Quick Add Supplier Modal */}
      <AddSupplierModal
        isOpen={isAddSupplierOpen}
        onClose={() => setIsAddSupplierOpen(false)}
        onSupplierAdded={(newSup) => {
          setSelectedSupplierId(newSup.id);
          setPaymentAmount(newSup.outstandingPayable > 0 ? newSup.outstandingPayable : 0);
        }}
      />
    </>
  );
};
