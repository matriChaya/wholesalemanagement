import React from 'react';
import { useWholesale } from '../context/WholesaleContext';
import { translations, formatCurrency } from '../utils/translations';
import {
  Coins,
  Building2,
  Send,
  PlusCircle,
  AlertTriangle,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  Wallet,
  ArrowDownLeft,
  ArrowUpRight,
  Clock,
  Sparkles,
  Edit3,
  Landmark,
  RotateCcw,
  Calculator,
  FileText,
  Truck,
  Check,
} from 'lucide-react';

interface DualCashBalanceWidgetProps {
  onOpenInvestModal: () => void;
  onOpenCompanyPaymentModal: () => void;
  onOpenPayAdminModal: () => void;
  onOpenCashTransfers?: () => void;
  onOpenCashDrawerStatement?: (role: 'admin' | 'counter' | 'dsr') => void;
}

export const DualCashBalanceWidget: React.FC<DualCashBalanceWidgetProps> = ({
  onOpenInvestModal,
  onOpenCompanyPaymentModal,
  onOpenPayAdminModal,
  onOpenCashTransfers,
  onOpenCashDrawerStatement,
}) => {
  const {
    language,
    currentRole,
    currentUser,
    cashAdmin,
    cashCounter,
    cashDSR,
    cashBank,
    pendingFromDsrAndCounter,
    isAdminCashZero,
    isAdminCashNegative,
    isCounterCashNegative,
    isDsrCashNegative,
    counterOrdersCashCollected,
    cashReceivedFromDSRToCounter,
    counterTransfersToAdmin,
    dsrOrdersCashCollected,
    cashTransfers,
    totalCashReceivedByAdmin,
    adminDirectCashSales,
    cashCapitalInjected,
    cashReceivedFromCounter,
    cashReceivedFromDSR,
    totalCounterCash,
    totalDsrCash,
    totalStaffCash,
    totalCashReceivedFromStaff,
    totalCompanyCashPaid,
    totalCompanyPaid,
    dsrTransfersToCounter,
    dsrPendingTransfersToCounter,
    pendingTransfersToAdmin,
    pendingAmountToAdmin,
    counterPendingTransfersToAdmin,
    acceptCashTransfer,
    acceptAllPendingTransfersToAdmin,
    quickReceiveFromCounter,
    quickPayCounterFromDsr,
    openBalanceModal,
    openResetModal,
    counterExpensesPaid,
    openExpenseModal,
    totalExpenses,
    netRealizedProfit,
  } = useWholesale();

  const t = translations[language];

  const pendingForCurrentUser = React.useMemo(() => {
    return cashTransfers.filter(
      (tr) =>
        tr.status === 'PENDING' &&
        (currentUser.id === tr.toUserId ||
          currentUser.role === tr.toRole ||
          (currentRole === 'counter' &&
            (tr.toRole === 'counter' ||
              tr.toUserId === 'usr_counter_pc' ||
              (tr.toUserName || '').toLowerCase().includes('counter') ||
              (tr.toUserName || '').toLowerCase().includes('কাউন্টার'))) ||
          (currentRole === 'admin' &&
            (tr.toRole === 'admin' ||
              !tr.toRole ||
              tr.toUserId === 'usr_admin' ||
              (tr.toUserName || '').toLowerCase().includes('admin') ||
              (tr.toUserName || '').toLowerCase().includes('এডমিন'))))
    );
  }, [cashTransfers, currentUser, currentRole]);

  const pendingAmountForCurrentUser = pendingForCurrentUser.reduce(
    (sum, t) => sum + (Number(t.amount) || 0),
    0
  );

  const handleAcceptAll = () => {
    pendingForCurrentUser.forEach((tr) => acceptCashTransfer(tr.id));
  };

  return (
    <div className="space-y-3">
      {/* Section Title & Info */}
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-2">
          <Wallet className="w-4 h-4 text-emerald-400" />
          <h3 className="text-xs sm:text-sm font-bold text-white uppercase tracking-wider">
            {language === 'bn' ? 'ক্যাশ ও ব্যাংক ব্যালেন্স হিসাব' : 'Cash & Bank Balances'}
          </h3>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {currentRole === 'admin' && (
            <button
              onClick={openResetModal}
              id="btn-widget-reset-data"
              className="text-[10px] text-rose-300 hover:text-white bg-rose-950/70 hover:bg-rose-900 border border-rose-500/40 px-2 py-0.5 rounded-lg flex items-center gap-1 cursor-pointer transition font-bold"
              title={language === 'bn' ? 'ক্যাশ হিসাব ও ইনভয়েস রিসেট করুন' : 'Reset Invoices & Cash'}
            >
              <RotateCcw className="w-3 h-3 text-rose-400" />
              <span>{language === 'bn' ? 'ডাটা রিসেট' : 'Reset'}</span>
            </button>
          )}
          <button
            onClick={() => openBalanceModal('BANK')}
            className="text-[11px] font-bold text-sky-400 hover:text-sky-300 hover:underline flex items-center gap-1 cursor-pointer bg-sky-950/40 border border-sky-800/60 px-2 py-0.5 rounded-lg"
          >
            <Landmark className="w-3 h-3" />
            <span>
              {language === 'bn' ? 'ব্যাংক:' : 'Bank:'} {formatCurrency(cashBank, language)}
            </span>
          </button>
          <button
            onClick={() => openBalanceModal('ADMIN_CASH')}
            className="text-[10px] text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 px-2 py-0.5 rounded-lg flex items-center gap-1 cursor-pointer transition"
          >
            <Edit3 className="w-3 h-3" />
            <span>{language === 'bn' ? 'ব্যালেন্স এডিট' : 'Edit Balances'}</span>
          </button>
        </div>
      </div>

      {/* Dual Cash Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {/* CARD 1: ADMIN CASH BALANCE (এডমিন / মালিকের মূল ক্যাশ ব্যালেন্স) */}
        <div
          id="card-admin-cash-balance"
          className={`p-4 rounded-2xl border transition-all relative overflow-hidden flex flex-col justify-between ${
            isAdminCashZero
              ? 'bg-gradient-to-br from-rose-950/40 via-slate-900 to-amber-950/20 border-rose-500/50 shadow-lg shadow-rose-950/30'
              : 'bg-gradient-to-br from-emerald-950/40 via-slate-900 to-slate-900 border-emerald-500/40 shadow-lg shadow-emerald-950/20'
          }`}
        >
          <div>
            <div className="flex items-center justify-between gap-2 mb-2">
              <div className="flex items-center gap-2">
                <div
                  className={`w-8 h-8 rounded-xl flex items-center justify-center ${
                    isAdminCashZero
                      ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                      : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                  }`}
                >
                  <Coins className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 block">
                    {language === 'bn' ? '১. এডমিনের ক্যাশ ব্যালেন্স (ভল্ট)' : '1. Admin Main Cash Balance'}
                  </span>
                  <span className="text-xs font-bold text-slate-200">
                    {language === 'bn' ? 'মালিকের কাছে বর্তমান নগদ টাকা' : 'Current Cash with Owner / Admin'}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => openBalanceModal('ADMIN_CASH')}
                  className="p-1 px-2 text-[10px] font-bold text-slate-300 hover:text-white bg-slate-800/80 hover:bg-slate-700 rounded-lg flex items-center gap-1 border border-slate-700 transition cursor-pointer"
                  title={language === 'bn' ? 'এডমিন ক্যাশ ব্যালেন্স সরাসরি এডিট করুন' : 'Edit Admin Cash Balance'}
                >
                  <Edit3 className="w-3 h-3 text-emerald-400" />
                  <span>{language === 'bn' ? 'এডিট' : 'Edit'}</span>
                </button>
                {cashAdmin < 0 ? (
                  <span className="inline-flex items-center gap-1 text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/40 animate-pulse">
                    <AlertTriangle className="w-3 h-3" />
                    {language === 'bn' ? 'মাইনাস ঘাটতি' : 'Cash Deficit'}
                  </span>
                ) : isAdminCashZero ? (
                  <span className="inline-flex items-center gap-1 text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40">
                    <AlertTriangle className="w-3 h-3" />
                    {language === 'bn' ? 'শূন্য' : 'Zero'}
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                    <CheckCircle2 className="w-3 h-3" />
                    {language === 'bn' ? 'সক্রিয়' : 'Active'}
                  </span>
                )}
              </div>
            </div>

            {/* Big Cash Number */}
            <div className="my-2">
              <div className="flex items-center justify-between">
                <div
                  className={`text-2xl sm:text-3xl font-black font-mono-num tracking-tight ${
                    cashAdmin < 0 ? 'text-rose-400' : isAdminCashZero ? 'text-amber-400' : 'text-emerald-400'
                  }`}
                >
                  {formatCurrency(cashAdmin, language)}
                </div>
              </div>
              <p className="text-[11px] text-slate-400 mt-0.5">
                {cashAdmin < 0
                  ? (language === 'bn'
                      ? '⚠️ এডমিনের ক্যাশ ড্রয়ার বর্তমানে মাইনাস (ঘাটতি) রয়েছে: কোম্পানি বিল পরিশোধ করা হয়েছে, কিন্তু ডিএসআর ও কাউন্টার থেকে সংগৃহীত কালেকশন এখনো ভল্টে হস্তান্তর হয়ে জমা হয়নি।'
                      : '⚠️ Admin cash drawer is currently in deficit: Supplier bills have been paid, but collected cash from DSR & Counter has not yet been transferred into Admin vault.')
                  : (language === 'bn'
                      ? 'কাউন্টার ও ডিএসআর থেকে ভল্টে প্রাপ্ত ক্যাশ ও কোম্পানি বিল পরিশোধের পর এডমিন ক্যাশ ড্রয়ারে অবশিষ্ট ব্যালেন্স।'
                      : 'Net cash balance in Admin drawer after received transfers minus company payments.')}
              </p>
            </div>

            {/* Live Cash Accounting Breakdown Formula (মালিকের ক্যাশ হিসাব সমীকরণ) */}
            <div className="my-2.5 p-2.5 rounded-xl bg-slate-950/80 border border-slate-800/90 text-[11px] space-y-1.5 shadow-inner">
              <div className="flex items-center justify-between text-slate-400 font-bold border-b border-slate-800 pb-1">
                <span className="flex items-center gap-1.5 text-amber-300">
                  <Calculator className="w-3.5 h-3.5" />
                  <span>{language === 'bn' ? 'এডমিন / মালিকের ক্যাশ বিবরণী' : 'Owner Cash Accounting'}</span>
                </span>
                <span className="text-[10px] text-slate-400 font-mono">
                  {language === 'bn' ? '(ভল্টে প্রাপ্তি - কোম্পানি পেমেন্ট)' : '(Vault Inflow - Paid)'}
                </span>
              </div>

              <div className="space-y-1 font-mono text-[11px]">
                <div className="flex items-center justify-between text-slate-300">
                  <span className="flex items-center gap-1.5">
                    <ArrowDownLeft className="w-3 h-3 text-emerald-400" />
                    <span>{language === 'bn' ? 'কাউন্টার থেকে ভল্টে জমা:' : 'From Counter to Vault:'}</span>
                  </span>
                  <span className="font-bold text-emerald-400 font-mono-num">
                    +{formatCurrency(cashReceivedFromCounter, language)}
                  </span>
                </div>

                <div className="flex items-center justify-between text-slate-300">
                  <span className="flex items-center gap-1.5">
                    <ArrowDownLeft className="w-3 h-3 text-sky-400" />
                    <span>{language === 'bn' ? 'ডিএসআর থেকে ভল্টে জমা:' : 'From DSR to Vault:'}</span>
                  </span>
                  <span className="font-bold text-sky-400 font-mono-num">
                    +{formatCurrency(cashReceivedFromDSR, language)}
                  </span>
                </div>

                {(adminDirectCashSales > 0 || cashCapitalInjected !== 0) && (
                  <div className="flex items-center justify-between text-slate-300">
                    <span className="flex items-center gap-1.5">
                      <Coins className="w-3 h-3 text-teal-400" />
                      <span>{language === 'bn' ? 'সরাসরি বিক্রয় / মূলধন:' : 'Direct Sales / Capital:'}</span>
                    </span>
                    <span className="font-bold text-teal-400 font-mono-num">
                      +{formatCurrency(adminDirectCashSales + cashCapitalInjected, language)}
                    </span>
                  </div>
                )}

                <div className="flex items-center justify-between text-amber-300 font-semibold pt-0.5 border-t border-slate-800/60">
                  <span className="flex items-center gap-1.5">
                    <Wallet className="w-3 h-3 text-amber-400" />
                    <span>{language === 'bn' ? 'ভল্টে মোট প্রাপ্ত ক্যাশ:' : 'Total Vault Cash Received:'}</span>
                  </span>
                  <span className="font-bold text-amber-300 font-mono-num">
                    +{formatCurrency(totalCashReceivedByAdmin, language)}
                  </span>
                </div>

                <div className="flex items-center justify-between text-rose-300 pt-0.5 border-t border-slate-800/60">
                  <span className="flex items-center gap-1.5">
                    <ArrowUpRight className="w-3 h-3 text-rose-400" />
                    <span>{language === 'bn' ? 'কোম্পানি বিল পরিশোধ (ক্যাশ ড্রয়ার মাইনাস):' : 'Company Bills Paid:'}</span>
                  </span>
                  <span className="font-bold text-rose-400 font-mono-num">
                    -{formatCurrency(totalCompanyCashPaid, language)}
                  </span>
                </div>

                {totalCompanyPaid > 0 && (
                  <div 
                    onClick={onOpenCompanyPaymentModal}
                    className="flex items-center justify-between text-indigo-300 text-[10.5px] cursor-pointer hover:underline hover:text-indigo-200 transition-colors pt-0.5"
                    title={language === 'bn' ? 'কোম্পানি পেমেন্ট ও ভাউচার হিস্ট্রি দেখুন' : 'View all company payments'}
                  >
                    <span className="flex items-center gap-1">
                      <Building2 className="w-3 h-3 text-indigo-400" />
                      <span>{language === 'bn' ? 'সকল মাধ্যমে মোট পরিশোধ:' : 'Total Company Paid:'}</span>
                    </span>
                    <span className="font-bold font-mono-num text-indigo-200">{formatCurrency(totalCompanyPaid, language)}</span>
                  </div>
                )}

                <div className="flex items-center justify-between text-amber-300 pt-1 border-t border-slate-700/80 font-bold">
                  <span>{language === 'bn' ? '= এডমিন ক্যাশ ড্রয়ার (বর্তমান ব্যালেন্স):' : '= Admin Cash Drawer (Balance):'}</span>
                  <span className={`text-xs font-extrabold font-mono-num ${cashAdmin < 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
                    {formatCurrency(cashAdmin, language)}
                  </span>
                </div>

                {cashAdmin < 0 && (
                  <div className="mt-1.5 p-2 rounded-lg bg-rose-500/10 border border-rose-500/30 text-[10px] text-rose-300 space-y-1">
                    <div className="font-semibold flex items-center gap-1">
                      <AlertTriangle className="w-3 h-3 text-rose-400 shrink-0" />
                      <span>
                        {language === 'bn'
                          ? `কোম্পানি পরিশোধের পর নিট ঘাটতি: ${formatCurrency(Math.abs(cashAdmin), language)}`
                          : `Deficit after company payment: ${formatCurrency(Math.abs(cashAdmin), language)}`}
                      </span>
                    </div>

                    {cashCounter > 0 && (
                      <div className="flex items-center justify-between gap-1 pt-1 border-t border-rose-500/20">
                        <span className="text-emerald-300 truncate">
                          {language === 'bn'
                            ? `কাউন্টার ড্রয়ারে ${formatCurrency(cashCounter, language)} আছে (জমা নিলে ঘাটতি কমবে)`
                            : `Counter has ${formatCurrency(cashCounter, language)} available`}
                        </span>
                        <button
                          type="button"
                          onClick={() => quickReceiveFromCounter(Math.min(cashCounter, Math.abs(cashAdmin)))}
                          className="px-2 py-0.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded font-bold text-[10px] transition cursor-pointer shrink-0"
                          title="কাউন্টার থেকে ভল্টে ক্যাশ জমা গ্রহণ"
                        >
                          {language === 'bn' ? 'কাউন্টার থেকে জমা গ্রহণ' : 'Receive from Counter'}
                        </button>
                      </div>
                    )}

                  </div>
                )}

                {/* Incoming Pending Transfers to Admin (Always visible whenever Counter or DSR transfers cash) */}
                {pendingAmountToAdmin > 0 && (
                  <div className="mt-2 p-2.5 rounded-xl bg-amber-500/15 border border-amber-500/40 text-[11px] text-amber-300 space-y-1.5 shadow-md">
                    <div className="flex items-center justify-between gap-1">
                      <span className="font-bold flex items-center gap-1.5 text-amber-200">
                        <Clock className="w-3.5 h-3.5 text-amber-400 animate-pulse shrink-0" />
                        <span>
                          {language === 'bn'
                            ? `কাউন্টার / ডিএসআর থেকে ${formatCurrency(pendingAmountToAdmin, language)} হস্তান্তরের অপেক্ষায় আছে`
                            : `Pending ${formatCurrency(pendingAmountToAdmin, language)} awaiting Admin acceptance`}
                        </span>
                      </span>
                      <button
                        type="button"
                        onClick={acceptAllPendingTransfersToAdmin}
                        id="btn-admin-accept-transfers-card"
                        className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-bold text-[10px] transition cursor-pointer shrink-0 shadow-sm flex items-center gap-1 active:scale-95"
                      >
                        <Check className="w-3 h-3" />
                        <span>{language === 'bn' ? 'ভল্টে একসেপ্ট করুন' : 'Accept into Vault'}</span>
                      </button>
                    </div>
                    <p className="text-[10px] text-amber-300/80">
                      {language === 'bn'
                        ? 'একসেপ্ট করলে ক্যাশ কাউন্টারের ড্রয়ার থেকে টাকা মাইনাস হবে এবং এডমিনের ভল্টে টাকা প্লাস (জমা) হবে।'
                        : 'Accepting will deduct money from Cash Counter and add money into Admin Vault.'}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Action Buttons for Admin Cash */}
          <div className="pt-3 border-t border-slate-800/80 flex items-center gap-2 mt-1 flex-wrap">
            {/* Invest Button */}
            <button
              onClick={onOpenInvestModal}
              id="btn-admin-add-invest"
              className={`py-2 px-3 rounded-xl text-xs font-bold flex items-center gap-1.5 transition active:scale-95 shadow-md cursor-pointer ${
                isAdminCashZero
                  ? 'bg-amber-500 hover:bg-amber-400 text-slate-950 animate-bounce'
                  : 'bg-emerald-600/30 hover:bg-emerald-600 text-emerald-300 hover:text-white border border-emerald-500/40'
              }`}
            >
              <PlusCircle className="w-3.5 h-3.5" />
              <span>{language === 'bn' ? '+ মূলধন / ইনভেস্ট যোগ' : '+ Add Investment'}</span>
            </button>

            {/* Pay Company Button */}
            <button
              onClick={onOpenCompanyPaymentModal}
              id="btn-admin-pay-company"
              className="py-2 px-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition active:scale-95 shadow-md shadow-indigo-950/40 cursor-pointer"
            >
              <Building2 className="w-3.5 h-3.5" />
              <span>{language === 'bn' ? 'কোম্পানিতে পেমেন্ট' : 'Pay Company'}</span>
            </button>

            {/* Admin Vault Statement Button */}
            {onOpenCashDrawerStatement && (
              <button
                type="button"
                onClick={() => onOpenCashDrawerStatement('admin')}
                className="py-2 px-2.5 bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/40 rounded-xl text-xs font-bold flex items-center gap-1.5 transition active:scale-95 cursor-pointer ml-auto"
                title="এডমিন ক্যাশ ভল্ট স্টেটমেন্ট ও অডিট"
              >
                <FileText className="w-3.5 h-3.5" />
                <span>{language === 'bn' ? 'ভল্ট স্টেটমেন্ট' : 'Vault Statement'}</span>
              </button>
            )}
          </div>
        </div>

        {/* CARD 2: DSR & CASH COUNTER BALANCE (এডমিনের প্রাপ্য টাকা) */}
        <div
          id="card-field-counter-cash"
          className="p-4 rounded-2xl border border-sky-500/30 bg-gradient-to-br from-sky-950/40 via-slate-900 to-slate-900 shadow-lg shadow-sky-950/20 flex flex-col justify-between"
        >
          <div>
            <div className="flex items-center justify-between gap-2 mb-2">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-sky-500/20 text-sky-400 border border-sky-500/30 flex items-center justify-center">
                  <Wallet className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 block">
                    {language === 'bn' ? '২. ডিএসআর ও কাউন্টার ক্যাশ' : '2. DSR & Counter Cash'}
                  </span>
                  <span className="text-xs font-bold text-sky-200">
                    {language === 'bn' ? 'এডমিনের প্রাপ্য কালেকশন' : 'Receivable by Admin'}
                  </span>
                </div>
              </div>

              <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-sky-500/20 text-sky-300 border border-sky-500/30">
                {language === 'bn' ? 'ফিল্ড কালেকশন' : 'Field Sales'}
              </span>
            </div>

            {/* Big Receivable Number */}
            <div className="my-2">
              <div className="text-2xl sm:text-3xl font-black text-sky-300 font-mono-num tracking-tight">
                {formatCurrency(pendingFromDsrAndCounter, language)}
              </div>

              {/* Breakdown Pills with Direct Edit Triggers */}
              <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                <div className="inline-flex items-center gap-1.5 text-[11px] px-2 py-0.5 rounded-lg bg-slate-950/80 border border-slate-800 text-slate-300 font-mono">
                  <span>{language === 'bn' ? 'কাউন্টার:' : 'Counter:'}</span>
                  <strong className={`${cashCounter < 0 ? 'text-rose-400 font-extrabold' : 'text-emerald-400'} font-mono-num`}>
                    {formatCurrency(cashCounter, language)}
                  </strong>
                  <button
                    type="button"
                    onClick={() => openBalanceModal('COUNTER_CASH')}
                    className="p-0.5 text-slate-400 hover:text-amber-400 rounded transition cursor-pointer"
                    title={language === 'bn' ? 'কাউন্টার ক্যাশ এডিট করুন' : 'Edit Counter Cash'}
                  >
                    <Edit3 className="w-2.5 h-2.5" />
                  </button>
                </div>

                <div className="inline-flex items-center gap-1.5 text-[11px] px-2 py-0.5 rounded-lg bg-slate-950/80 border border-slate-800 text-slate-300 font-mono">
                  <span>{language === 'bn' ? 'ডিএসআর:' : 'DSR Field:'}</span>
                  <strong className={`${cashDSR < 0 ? 'text-rose-400 font-extrabold' : 'text-amber-400'} font-mono-num`}>
                    {formatCurrency(cashDSR, language)}
                  </strong>
                  {cashDSR === 0 && dsrTransfersToCounter > 0 && (
                    <span className="text-[10px] text-emerald-400 font-sans font-bold" title="সংগৃহীত ক্যাশ কাউন্টারে হস্তান্তর জমা হয়েছে">
                      ({language === 'bn' ? 'কাউন্টারে জমা' : 'In Counter'})
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={() => openBalanceModal('DSR_CASH')}
                    className="p-0.5 text-slate-400 hover:text-purple-400 rounded transition cursor-pointer"
                    title={language === 'bn' ? 'ডিএসআর ক্যাশ এডিট করুন' : 'Edit DSR Cash'}
                  >
                    <Edit3 className="w-2.5 h-2.5" />
                  </button>
                </div>
              </div>

              {/* Live Cash Accounting Breakdown for Counter & DSR */}
              <div className="my-2.5 p-2.5 rounded-xl bg-slate-950/80 border border-slate-800/90 text-[11px] space-y-2 shadow-inner">
                {/* Counter Drawer Breakdown */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-slate-400 font-bold border-b border-slate-800 pb-1">
                    <span className="flex items-center gap-1.5 text-emerald-300">
                      <Calculator className="w-3.5 h-3.5" />
                      <span>{language === 'bn' ? 'ক্যাশ কাউন্টার হিসাব বিবরণী' : 'Counter Cash Accounting'}</span>
                    </span>
                    <span className="text-[10px] text-slate-400 font-mono">
                      {language === 'bn' ? '(সেলস + ডিএসআর রিসিভ - এডমিন)' : '(Sales + DSR - Admin)'}
                    </span>
                  </div>
                  <div className="space-y-0.5 font-mono text-[10.5px]">
                    <div className="flex items-center justify-between text-slate-300">
                      <span>{language === 'bn' ? 'কাউন্টার নগদ বিক্রয়:' : 'Counter Cash Sales:'}</span>
                      <span className="font-bold text-emerald-400">+{formatCurrency(counterOrdersCashCollected, language)}</span>
                    </div>
                    <div className="flex items-center justify-between text-slate-300">
                      <span>{language === 'bn' ? 'ডিএসআর থেকে রিসিভ টাকা:' : 'Received from DSR:'}</span>
                      <span className="font-bold text-sky-400">+{formatCurrency(cashReceivedFromDSRToCounter, language)}</span>
                    </div>
                    <div className="flex items-center justify-between text-rose-300">
                      <span>{language === 'bn' ? 'এডমিনকে পেমেন্ট (ড্রয়ার মাইনাস):' : 'Paid to Admin:'}</span>
                      <span className="font-bold text-rose-400">-{formatCurrency(counterTransfersToAdmin, language)}</span>
                    </div>
                    {counterPendingTransfersToAdmin.length > 0 && (
                      <div className="flex items-center justify-between text-amber-400/90 text-[10px] italic pt-0.5">
                        <span>{language === 'bn' ? 'এডমিনে হস্তান্তর অপেক্ষমান (এডমিন গ্রহণ করলে মাইনাস হবে):' : 'Pending Admin acceptance (deducts on accept):'}</span>
                        <span className="font-bold font-mono">
                          {formatCurrency(counterPendingTransfersToAdmin.reduce((s, t) => s + t.amount, 0), language)}
                        </span>
                      </div>
                    )}
                    {counterExpensesPaid > 0 && (
                      <div className="flex items-center justify-between text-amber-300">
                        <span>{language === 'bn' ? 'দোকান খরচ (বেতন/ভাড়া/বিদ্যুৎ):' : 'Expenses (Salary/Rent/Bill):'}</span>
                        <span className="font-bold text-amber-400">-{formatCurrency(counterExpensesPaid, language)}</span>
                      </div>
                    )}
                    <div className="flex items-center justify-between font-bold pt-0.5 border-t border-slate-800">
                      <span className="text-slate-200">{language === 'bn' ? '= কাউন্টার ড্রয়ার ব্যালেন্স:' : '= Counter Balance:'}</span>
                      <span className={`${cashCounter < 0 ? 'text-rose-400 font-extrabold' : 'text-emerald-400'}`}>
                        {formatCurrency(cashCounter, language)}
                      </span>
                    </div>

                    {/* DSR to Counter Incoming Transfer Accept Banner */}
                    {dsrPendingTransfersToCounter.length > 0 && (
                      <div className="mt-1.5 p-2 rounded-xl bg-sky-500/15 border border-sky-500/40 text-[11px] text-sky-300 space-y-1 shadow-md">
                        <div className="flex items-center justify-between gap-1">
                          <span className="font-bold flex items-center gap-1 text-sky-200">
                            <Truck className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                            <span>
                              {language === 'bn'
                                ? `ডিএসআর থেকে ${formatCurrency(dsrPendingTransfersToCounter.reduce((s, t) => s + t.amount, 0), language)} নগদ এসেছে`
                                : `DSR sent ${formatCurrency(dsrPendingTransfersToCounter.reduce((s, t) => s + t.amount, 0), language)}`}
                            </span>
                          </span>
                          <button
                            type="button"
                            onClick={() => dsrPendingTransfersToCounter.forEach((t) => acceptCashTransfer(t.id))}
                            id="btn-counter-accept-dsr-card"
                            className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-bold text-[10px] transition cursor-pointer shrink-0 shadow-sm flex items-center gap-1 active:scale-95"
                          >
                            <Check className="w-3 h-3" />
                            <span>{language === 'bn' ? 'কাউন্টারে একসেপ্ট করুন' : 'Accept into Counter'}</span>
                          </button>
                        </div>
                        <p className="text-[10px] text-sky-300/80">
                          {language === 'bn'
                            ? 'একসেপ্ট করলে ক্যাশ কাউন্টারের ড্রয়ারে টাকা জমা (প্লাস) হবে।'
                            : 'Accepting will deposit money into Cash Counter drawer.'}
                        </p>
                      </div>
                    )}
                    <div className="pt-1 flex items-center justify-between gap-1 flex-wrap">
                      <button
                        type="button"
                        onClick={() => openExpenseModal()}
                        className="px-2 py-0.5 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 rounded text-[10px] font-bold transition cursor-pointer flex items-center gap-1"
                        title="কাউন্টার থেকে বেতন, দোকান ভাড়া বা বিদ্যুৎ বিল এন্ট্রি দিন"
                      >
                        <PlusCircle className="w-2.5 h-2.5" />
                        <span>{language === 'bn' ? '+ খরচ এন্ট্রি' : '+ Expense'}</span>
                      </button>

                      {cashCounter > 0 && (
                        <button
                          type="button"
                          onClick={() => quickReceiveFromCounter(cashCounter)}
                          className="px-2 py-0.5 bg-emerald-600/30 hover:bg-emerald-600 text-emerald-300 hover:text-white border border-emerald-500/40 rounded text-[10px] font-bold transition cursor-pointer flex items-center gap-1 ml-auto"
                          title="কাউন্টার ব্যালেন্স এডমিন ভল্টে পেমেন্ট হস্তান্তর করুন"
                        >
                          <Send className="w-2.5 h-2.5" />
                          <span>{language === 'bn' ? 'এডমিনে জমা দিন' : 'Pay to Admin'}</span>
                        </button>
                      )}
                    </div>
                  </div>
                  {cashCounter < 0 && (
                    <div className="text-[10px] text-rose-300 bg-rose-500/10 border border-rose-500/30 p-1.5 rounded-lg flex items-center gap-1">
                      <AlertTriangle className="w-3 h-3 text-rose-400 shrink-0" />
                      <span>{language === 'bn' ? `পর্যাপ্ত ব্যালেন্স নেই: কাউন্টার ড্রয়ার মাইনাস ফিগার (${formatCurrency(cashCounter, language)}) ঘাটতিতে রয়েছে` : `Counter Drawer is in deficit (${formatCurrency(cashCounter, language)})`}</span>
                    </div>
                  )}
                </div>

                {/* DSR Drawer Breakdown */}
                <div className="space-y-1 pt-1.5 border-t border-slate-800/80">
                  <div className="flex items-center justify-between text-slate-400 font-bold border-b border-slate-800 pb-1">
                    <span className="flex items-center gap-1.5 text-amber-300">
                      <Truck className="w-3.5 h-3.5" />
                      <span>{language === 'bn' ? 'ডিএসআর ফিল্ড হিসাব বিবরণী' : 'DSR Field Accounting'}</span>
                    </span>
                    <span className="text-[10px] text-slate-400 font-mono">
                      {language === 'bn' ? '(বিক্রি - কাউন্টারে পেমেন্ট)' : '(Sales - To Counter)'}
                    </span>
                  </div>
                  <div className="space-y-0.5 font-mono text-[10.5px]">
                    <div className="flex items-center justify-between text-slate-300">
                      <span>{language === 'bn' ? 'ডিএসআর মোট বিক্রি আদায়:' : 'DSR Cash Sales:'}</span>
                      <span className="font-bold text-amber-400">+{formatCurrency(dsrOrdersCashCollected, language)}</span>
                    </div>
                    <div className="flex items-center justify-between text-rose-300">
                      <span>{language === 'bn' ? 'কাউন্টারে পেমেন্ট (ড্রয়ার মাইনাস):' : 'Paid to Counter:'}</span>
                      <span className="font-bold text-rose-400">-{formatCurrency(dsrTransfersToCounter, language)}</span>
                    </div>
                    <div className="flex items-center justify-between font-bold pt-0.5 border-t border-slate-800">
                      <span className="text-slate-200">{language === 'bn' ? '= ডিএসআর ড্রয়ার ব্যালেন্স:' : '= DSR Balance:'}</span>
                      <span className={`${cashDSR < 0 ? 'text-rose-400 font-extrabold' : 'text-amber-400'}`}>
                        {formatCurrency(cashDSR, language)}
                      </span>
                    </div>
                    {cashDSR > 0 && (
                      <div className="pt-1 flex justify-end">
                        <button
                          type="button"
                          onClick={() => quickPayCounterFromDsr(cashDSR)}
                          className="px-2 py-0.5 bg-sky-600/30 hover:bg-sky-600 text-sky-300 hover:text-white border border-sky-500/40 rounded text-[10px] font-bold transition cursor-pointer flex items-center gap-1"
                          title="ডিএসআর ক্যাশ কাউন্টারে হস্তান্তর করুন"
                        >
                          <Send className="w-2.5 h-2.5" />
                          <span>{language === 'bn' ? 'কাউন্টারে জমা দিন' : 'Pay to Counter'}</span>
                        </button>
                      </div>
                    )}
                  </div>
                  {cashDSR < 0 && (
                    <div className="text-[10px] text-rose-300 bg-rose-500/10 border border-rose-500/30 p-1.5 rounded-lg flex items-center gap-1">
                      <AlertTriangle className="w-3 h-3 text-rose-400 shrink-0" />
                      <span>{language === 'bn' ? `পর্যাপ্ত ব্যালেন্স নেই: ডিএসআর ড্রয়ার মাইনাস ফিগার (${formatCurrency(cashDSR, language)}) ঘাটতিতে রয়েছে` : `DSR Drawer is in deficit (${formatCurrency(cashDSR, language)})`}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* DSR to Counter Pending Transfer Handover Banner */}
              {dsrPendingTransfersToCounter.length > 0 && (
                <div className="mt-2.5 p-2 rounded-xl bg-sky-500/10 border border-sky-500/30 flex items-center justify-between gap-2 text-[11px]">
                  <div className="flex items-center gap-1.5 text-sky-300">
                    <Truck className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                    <span>
                      {language === 'bn'
                        ? `ডিএসআর (রাজু আলম) ক্যাশ কাউন্টারে ${formatCurrency(dsrPendingTransfersToCounter.reduce((s, t) => s + t.amount, 0), language)} পাঠিয়েছেন`
                        : `DSR sent ${formatCurrency(dsrPendingTransfersToCounter.reduce((s, t) => s + t.amount, 0), language)} to Counter`}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => dsrPendingTransfersToCounter.forEach((t) => acceptCashTransfer(t.id))}
                    className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-bold text-[10px] transition cursor-pointer shrink-0 shadow-sm"
                  >
                    {language === 'bn' ? 'কাউন্টার গ্রহণ' : 'Accept into Counter'}
                  </button>
                </div>
              )}

              <p className="text-[11px] text-slate-400 mt-2">
                {language === 'bn'
                  ? 'কাউন্টার ও ডিএসআর ফিল্ডের এই ক্যাশ এডমিনের প্রাপ্য। এখান থেকে ভল্টে হস্তান্তর (Transfer) করলে এডমিন ক্যাশ ড্রয়ারের ঘাটতি সমন্বয় হয়ে যাবে।'
                  : 'Cash collections from Counter and DSR are receivable by Admin. Handing over this cash will reconcile Admin vault deficit.'}
              </p>
            </div>
          </div>

          {/* Action Buttons for DSR & Counter Handover */}
          <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between gap-2 mt-2 flex-wrap">
            <button
              onClick={onOpenPayAdminModal}
              id="btn-pay-admin-handover"
              className="py-2 px-3.5 bg-gradient-to-r from-sky-600 to-teal-600 hover:from-sky-500 hover:to-teal-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition active:scale-95 shadow-md shadow-sky-950/40 cursor-pointer"
            >
              {currentRole === 'admin' ? (
                <>
                  <ArrowDownLeft className="w-3.5 h-3.5" />
                  <span>{language === 'bn' ? 'ক্যাশ কাউন্টারে জমা / হস্তান্তর' : 'Transfer to Cash Counter'}</span>
                </>
              ) : currentRole === 'counter' ? (
                <>
                  <Send className="w-3.5 h-3.5" />
                  <span>{language === 'bn' ? 'ক্যাশ হস্তান্তর (এডমিনকে জমা / ডিএসআর প্রদান)' : 'Handover (To Admin / DSR)'}</span>
                </>
              ) : (
                <>
                  <Send className="w-3.5 h-3.5" />
                  <span>{language === 'bn' ? 'ক্যাশ কাউন্টারে টাকা জমা দিন' : 'Deposit to Cash Counter'}</span>
                </>
              )}
            </button>

            {/* Statement Buttons for Counter & DSR */}
            {onOpenCashDrawerStatement && (
              <div className="flex items-center gap-1.5 ml-auto">
                <button
                  type="button"
                  onClick={() => onOpenCashDrawerStatement('counter')}
                  className="py-1.5 px-2.5 bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 border border-emerald-500/40 rounded-lg text-[11px] font-bold flex items-center gap-1 transition active:scale-95 cursor-pointer"
                  title="কাউন্টার ক্যাশ ড্রয়ার স্টেটমেন্ট"
                >
                  <FileText className="w-3 h-3" />
                  <span>{language === 'bn' ? 'কাউন্টার স্টেটমেন্ট' : 'Counter'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => onOpenCashDrawerStatement('dsr')}
                  className="py-1.5 px-2.5 bg-purple-500/15 hover:bg-purple-500/25 text-purple-300 border border-purple-500/40 rounded-lg text-[11px] font-bold flex items-center gap-1 transition active:scale-95 cursor-pointer"
                  title="ডিএসআর ফিল্ড ক্যাশ স্টেটমেন্ট"
                >
                  <FileText className="w-3 h-3" />
                  <span>{language === 'bn' ? 'ডিএসআর স্টেটমেন্ট' : 'DSR'}</span>
                </button>
              </div>
            )}

            {onOpenCashTransfers && (
              <button
                onClick={onOpenCashTransfers}
                className="text-[11px] text-sky-400 hover:underline flex items-center gap-1 cursor-pointer"
              >
                <span>{language === 'bn' ? 'ট্রান্সফার হিস্ট্রি' : 'Transfer Logs'}</span>
                <ArrowRight className="w-3 h-3" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* 1-Click Interactive Incoming Transfers Section for Current User */}
      {pendingForCurrentUser.length > 0 && (
        <div className="p-3 rounded-2xl bg-gradient-to-r from-amber-950/50 via-slate-900 to-amber-950/50 border border-amber-500/50 shadow-lg space-y-2 animate-in fade-in">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-amber-400 shrink-0 animate-pulse" />
              <span className="text-xs font-bold text-amber-300">
                {language === 'bn'
                  ? `আপনার জন্য ${pendingForCurrentUser.length}টি ক্যাশ হস্তান্তর অপেক্ষমান (মোট: ${formatCurrency(pendingAmountForCurrentUser, language)})`
                  : `${pendingForCurrentUser.length} cash handover(s) pending for you (Total: ${formatCurrency(pendingAmountForCurrentUser, language)})`}
              </span>
            </div>
            <button
              type="button"
              id="btn-accept-all-pending-transfers"
              onClick={handleAcceptAll}
              className="px-3 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold text-xs flex items-center gap-1.5 shadow-md shadow-emerald-950/40 cursor-pointer transition active:scale-95 shrink-0"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>{language === 'bn' ? 'সবগুলো গ্রহণ করুন' : 'Accept All'}</span>
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
            {pendingForCurrentUser.map((tr) => (
              <div
                key={tr.id}
                className="flex items-center justify-between p-2.5 rounded-xl bg-slate-950/90 border border-amber-500/30 text-xs shadow-sm"
              >
                <div className="min-w-0 pr-2">
                  <div className="font-bold text-white truncate flex items-center gap-1.5">
                    <span>
                      {tr.fromRole === 'admin'
                        ? '🏢 এডমিন'
                        : tr.fromRole === 'counter'
                        ? '🛒 ক্যাশ কাউন্টার'
                        : '🛵 ডিএসআর'}
                    </span>
                    <span className="text-[10px] text-slate-400 font-normal truncate">({tr.fromUserName})</span>
                  </div>
                  <div className="text-[11px] text-slate-400 truncate mt-0.5">
                    {tr.notes || 'ক্যাশ কালেকশন হস্তান্তর'} • {tr.createdAt?.slice(0, 10)}
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="font-mono-num font-extrabold text-emerald-400 text-xs sm:text-sm">
                    +{formatCurrency(tr.amount, language)}
                  </span>
                  <button
                    type="button"
                    onClick={() => acceptCashTransfer(tr.id)}
                    className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[11px] rounded-lg shadow flex items-center gap-1 cursor-pointer active:scale-95 transition"
                  >
                    <CheckCircle2 className="w-3 h-3" />
                    <span>{language === 'bn' ? 'গ্রহণ' : 'Accept'}</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
