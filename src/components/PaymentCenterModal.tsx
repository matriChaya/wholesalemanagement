import React, { useState } from 'react';
import { useWholesale } from '../context/WholesaleContext';
import { translations, formatCurrency, getTodayDateString, getYesterdayDateString } from '../utils/translations';
import {
  CreditCard,
  Send,
  Building,
  Coins,
  Wallet,
  ArrowRight,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  Clock,
  XCircle,
  Plus,
  FileCheck2,
  Trash2,
  X,
  Sparkles,
  Users,
  Building2,
  Store,
  RefreshCw,
  Check,
  Calendar
} from 'lucide-react';
import { InvestCapitalModal } from './InvestCapitalModal';

interface PaymentCenterModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialTab?: 'PAY_COMPANY' | 'PAY_ADMIN' | 'RECEIVE_STAFF' | 'HISTORY';
}

export const PaymentCenterModal: React.FC<PaymentCenterModalProps> = ({
  isOpen,
  onClose,
  initialTab,
}) => {
  const {
    language,
    currentRole,
    currentUser,
    users,
    suppliers,
    cashTransfers,
    supplierLedger,
    cashAdmin,
    cashCounter,
    cashDSR,
    pendingFromDsrAndCounter,
    isAdminCashZero,
    totalLiquidCash,
    addSupplierPayment,
    createCashTransfer,
    acceptCashTransfer,
    rejectCashTransfer,
    deleteCashTransfer,
    deleteSupplierLedgerEntry,
  } = useWholesale();

  const t = translations[language];

  // Tab State
  const defaultTab = currentRole === 'admin' ? (initialTab || 'PAY_COMPANY') : 'PAY_ADMIN';
  const [activeTab, setActiveTab] = useState<'PAY_COMPANY' | 'PAY_ADMIN' | 'RECEIVE_STAFF' | 'HISTORY'>(
    defaultTab
  );

  // Invest Modal trigger
  const [isInvestModalOpen, setIsInvestModalOpen] = useState<boolean>(false);

  // Admin -> Company Payment Form
  const [selectedSupplierId, setSelectedSupplierId] = useState<string>(suppliers[0]?.id || '');

  React.useEffect(() => {
    if ((!selectedSupplierId || !suppliers.some(s => s.id === selectedSupplierId)) && suppliers.length > 0) {
      setSelectedSupplierId(suppliers[0].id);
    }
  }, [suppliers, selectedSupplierId]);

  const [companyAmount, setCompanyAmount] = useState<number>(0);
  const [paymentMethod, setPaymentMethod] = useState<'Cash' | 'Bank Transfer' | 'bKash / Nagad' | 'Cheque'>('Cash');
  const [companyRefNo, setCompanyRefNo] = useState<string>(`VCH-${Date.now().toString().slice(-4)}`);
  const [companyNotes, setCompanyNotes] = useState<string>('');
  const [companyPaymentDate, setCompanyPaymentDate] = useState<string>(getTodayDateString());
  const [companyPaySuccess, setCompanyPaySuccess] = useState<boolean>(false);

  // DSR / Counter -> Admin Payment Form
  const myDrawerBalance = currentRole === 'counter' ? cashCounter : currentRole === 'dsr' ? cashDSR : (currentUser.assignedCashDrawer || 0);
  const [staffTargetRole, setStaffTargetRole] = useState<'counter' | 'admin'>('counter');
  const [adminPaymentAmount, setAdminPaymentAmount] = useState<number>(myDrawerBalance > 0 ? myDrawerBalance : 0);
  const [adminPaymentNotes, setAdminPaymentNotes] = useState<string>('');
  const [staffPaymentDate, setStaffPaymentDate] = useState<string>(getTodayDateString());
  const [denominations, setDenominations] = useState<{ [key: string]: number }>({
    1000: 0,
    500: 0,
    200: 0,
    100: 0,
    50: 0,
    20: 0,
    10: 0,
  });
  const [staffPaySuccess, setStaffPaySuccess] = useState<boolean>(false);

  // History date filter & sub-view
  const [historyDateFilter, setHistoryDateFilter] = useState<string>('ALL');
  const [historyViewType, setHistoryViewType] = useState<'COMPANY' | 'STAFF'>('COMPANY');

  // Deletion confirmation
  const [deletingTransferId, setDeletingTransferId] = useState<string | null>(null);

  if (!isOpen) return null;

  const selectedSupplier = suppliers.find((s) => s.id === selectedSupplierId) || suppliers[0];

  // Denomination sum
  const calcDenominationTotal = () => {
    return Object.entries(denominations).reduce((acc, [denom, count]) => {
      return acc + Number(denom) * (Number(count) || 0);
    }, 0);
  };

  const handleDenomChange = (denom: string, val: number) => {
    const nextDenoms = { ...denominations, [denom]: Math.max(0, val) };
    setDenominations(nextDenoms);
    const newTotal = Object.entries(nextDenoms).reduce((acc, [d, c]) => acc + Number(d) * (Number(c) || 0), 0);
    if (newTotal > 0) {
      setAdminPaymentAmount(newTotal);
    }
  };

  // Submit Admin -> Company
  const handlePayCompanySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSupplierId || companyAmount <= 0) return;

    addSupplierPayment(
      selectedSupplierId,
      companyAmount,
      paymentMethod,
      companyRefNo,
      companyNotes || (language === 'bn' ? 'সাপ্লায়ার দেনা বাবদ পরিশোধ' : 'Disbursement against company payable'),
      companyPaymentDate
    );

    setCompanyPaySuccess(true);
    setTimeout(() => {
      setCompanyPaySuccess(false);
      setCompanyAmount(0);
      setCompanyNotes('');
      setCompanyRefNo(`VCH-${Date.now().toString().slice(-4)}`);
      setCompanyPaymentDate(getTodayDateString());
    }, 1500);
  };

  // Submit DSR / Counter -> Admin
  const handlePayAdminSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (adminPaymentAmount <= 0) return;

    const myAdminRef = (currentUser.adminRef || currentUser.adminPhone || '01937200635').replace(/[^0-9]/g, '');
    const adminUser =
      users.find((u) => u.role === 'admin' && (u.phone || '').replace(/[^0-9]/g, '').endsWith(myAdminRef.slice(-10))) ||
      users.find((u) => u.id === 'usr_admin') ||
      users.find((u) => u.role === 'admin') || {
        id: 'usr_admin',
        name: 'মাতৃছায়া টেলিকম',
        role: 'admin',
        phone: '01937200635',
      };

    const notesSummary = Object.entries(denominations)
      .filter(([_, c]) => Number(c) > 0)
      .map(([d, c]) => `${d}x${c}`)
      .join(', ');

    const fullNotes = [
      adminPaymentNotes || (language === 'bn' ? 'এডমিনকে সেলস কালেকশন জমা' : 'Sales collection deposit to Admin'),
      notesSummary ? `(নোট: ${notesSummary})` : '',
    ].filter(Boolean).join(' ');

    const isDsr = currentRole === 'dsr';
    const isDsrToCounter = isDsr && staffTargetRole === 'counter';
    const counterUser = users.find((u) => u.role === 'counter') || {
      id: 'usr_counter',
      name: 'ক্যাশ কাউন্টার',
      role: 'counter',
    };

    const targetRole = isDsrToCounter ? 'counter' : 'admin';
    const targetUserId = isDsrToCounter ? counterUser.id : adminUser.id;
    const targetUserName = isDsrToCounter ? `${counterUser.name} (COUNTER)` : `${adminUser.name} (ADMIN)`;

    createCashTransfer({
      fromRole: currentRole,
      fromUserId: currentUser.id,
      fromUserName: `${currentUser.name} (${currentRole.toUpperCase()})`,
      toRole: targetRole,
      toUserId: targetUserId,
      toUserName: targetUserName,
      amount: adminPaymentAmount,
      notes: fullNotes,
      customDate: staffPaymentDate,
      autoAccept: isDsrToCounter,
    });

    setStaffPaySuccess(true);
    setTimeout(() => {
      setStaffPaySuccess(false);
      setAdminPaymentAmount(0);
      setAdminPaymentNotes('');
      setDenominations({ 1000: 0, 500: 0, 200: 0, 100: 0, 50: 0, 20: 0, 10: 0 });
      setStaffPaymentDate(getTodayDateString());
    }, 1500);
  };

  // Filter transfers
  const pendingStaffTransfers = cashTransfers.filter(
    (t) => t.status === 'PENDING' && t.toRole === 'admin'
  );

  const myTransfers = cashTransfers.filter(
    (t) => t.fromUserId === currentUser.id || (t.fromRole === currentRole)
  );

  const quickPayPresets = [5000, 10000, 20000, 50000, 100000];

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/85 backdrop-blur-sm animate-in fade-in duration-150">
        <div
          className="w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-3xl p-4 sm:p-6 shadow-2xl space-y-4 max-h-[94vh] overflow-y-auto"
          id="payment-center-modal"
        >
          {/* Top Header */}
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-emerald-600 via-teal-600 to-indigo-600 flex items-center justify-center text-white shadow-lg shadow-emerald-950/50">
                <CreditCard className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                  <span>{t.paymentHubTitle}</span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-semibold uppercase">
                    {currentRole}
                  </span>
                </h3>
                <p className="text-xs text-slate-400">{t.paymentHubSubtitle}</p>
              </div>
            </div>
            <button
              onClick={onClose}
              id="btn-close-payment-center"
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* =========================================================
              2 DISTINCT CASH BALANCES (USER MANDATED SPECIFICATION)
             ========================================================= */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3" id="dual-cash-balance-cards">
            {/* BALANCE 1: ADMIN CASH VAULT BALANCE */}
            <div className="p-3.5 rounded-2xl bg-gradient-to-br from-slate-900 to-emerald-950/40 border border-emerald-500/40 shadow-md space-y-1.5 relative overflow-hidden">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-emerald-300 flex items-center gap-1.5">
                  <Wallet className="w-4 h-4 text-emerald-400" />
                  {t.adminCashBalance}
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-semibold border border-emerald-500/30">
                  {language === 'bn' ? 'ব্যালেন্স ১' : 'Balance 1'}
                </span>
              </div>
              <div className="flex items-baseline justify-between">
                <span className={`text-xl sm:text-2xl font-black ${cashAdmin <= 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
                  {formatCurrency(cashAdmin, language)}
                </span>
                <span className="text-[10px] text-slate-400">
                  {language === 'bn' ? 'এডমিনের নিজস্ব ভল্ট' : 'Admin Liquid Vault'}
                </span>
              </div>
            </div>

            {/* BALANCE 2: DSR & CASH COUNTER PENDING CASH TO ADMIN */}
            <div className="p-3.5 rounded-2xl bg-gradient-to-br from-slate-900 to-indigo-950/40 border border-indigo-500/40 shadow-md space-y-1.5 relative overflow-hidden">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-indigo-300 flex items-center gap-1.5">
                  <Coins className="w-4 h-4 text-indigo-400" />
                  {t.dsrAndCounterPendingCash}
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 font-semibold border border-indigo-500/30">
                  {language === 'bn' ? 'ব্যালেন্স ২' : 'Balance 2'}
                </span>
              </div>
              <div className="flex items-baseline justify-between">
                <span className="text-xl sm:text-2xl font-black text-indigo-300">
                  {formatCurrency(pendingFromDsrAndCounter, language)}
                </span>
                <div className="flex items-center gap-1.5 text-[10px] text-slate-400">
                  <span>DSR: {formatCurrency(cashDSR, language)}</span>
                  <span>•</span>
                  <span>Counter: {formatCurrency(cashCounter, language)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* =========================================================
              ZERO CASH BALANCE ALERT & DIRECT INVEST TRIGGER
             ========================================================= */}
          {isAdminCashZero && (
            <div
              className="p-3.5 rounded-2xl bg-gradient-to-r from-rose-950/60 via-amber-950/40 to-slate-900 border border-rose-500/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-pulse"
              id="banner-zero-cash-invest-prompt"
            >
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-rose-500/20 border border-rose-500/30 flex items-center justify-center text-rose-400 shrink-0">
                  <AlertTriangle className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs sm:text-sm font-bold text-rose-200">
                    {language === 'bn' ? 'এডমিনের ক্যাশ ব্যালেন্স শূন্য (০ ৳)!' : 'Admin Cash Balance is Zero (0 ৳)!'}
                  </h4>
                  <p className="text-[11px] text-rose-300/80">
                    {t.zeroCashAlert}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsInvestModalOpen(true)}
                id="btn-trigger-invest-from-zero-alert"
                className="py-2 px-3.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs shadow-lg shadow-emerald-950/40 transition active:scale-95 flex items-center justify-center gap-1.5 shrink-0"
              >
                <Plus className="w-4 h-4" />
                <span>{t.addInvestment}</span>
              </button>
            </div>
          )}

          {/* Navigation Sub-Tabs */}
          <div className="flex items-center gap-1.5 border-b border-slate-800 pb-2 overflow-x-auto">
            {currentRole === 'admin' ? (
              <>
                <button
                  type="button"
                  onClick={() => setActiveTab('PAY_COMPANY')}
                  id="tab-btn-pay-company"
                  className={`py-2 px-3.5 rounded-xl font-bold text-xs flex items-center gap-1.5 transition shrink-0 ${
                    activeTab === 'PAY_COMPANY'
                      ? 'bg-emerald-600 text-white shadow-md'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                  }`}
                >
                  <Building2 className="w-4 h-4" />
                  <span>{t.payCompany}</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab('RECEIVE_STAFF')}
                  id="tab-btn-receive-staff"
                  className={`py-2 px-3.5 rounded-xl font-bold text-xs flex items-center gap-1.5 transition shrink-0 ${
                    activeTab === 'RECEIVE_STAFF'
                      ? 'bg-indigo-600 text-white shadow-md'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                  }`}
                >
                  <Users className="w-4 h-4" />
                  <span>{t.receiveFromStaff}</span>
                  {pendingStaffTransfers.length > 0 && (
                    <span className="px-1.5 py-0.5 rounded-full bg-amber-500 text-slate-950 font-black text-[10px] animate-bounce">
                      {pendingStaffTransfers.length}
                    </span>
                  )}
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={() => setActiveTab('PAY_ADMIN')}
                id="tab-btn-pay-admin"
                className={`py-2 px-3.5 rounded-xl font-bold text-xs flex items-center gap-1.5 transition shrink-0 ${
                  activeTab === 'PAY_ADMIN'
                    ? 'bg-emerald-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                }`}
              >
                <Send className="w-4 h-4" />
                <span>{t.payAdmin}</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => setActiveTab('HISTORY')}
              id="tab-btn-payment-history"
              className={`py-2 px-3.5 rounded-xl font-bold text-xs flex items-center gap-1.5 transition shrink-0 ${
                activeTab === 'HISTORY'
                  ? 'bg-slate-700 text-white shadow-md'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
              }`}
            >
              <Clock className="w-4 h-4" />
              <span>{language === 'bn' ? 'পেমেন্ট ও ভাউচার হিস্ট্রি' : 'Payment History'}</span>
            </button>
          </div>

          {/* =========================================================
              TAB 1: ADMIN -> COMPANY / SUPPLIER PAYMENT
             ========================================================= */}
          {activeTab === 'PAY_COMPANY' && currentRole === 'admin' && (
            <div className="space-y-4">
              {companyPaySuccess ? (
                <div className="py-8 text-center space-y-2">
                  <div className="w-12 h-12 mx-auto rounded-full bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                    <CheckCircle2 className="w-6 h-6" />
                  </div>
                  <h4 className="text-sm font-bold text-white">{t.companyPaymentSuccess}</h4>
                </div>
              ) : (
                <form onSubmit={handlePayCompanySubmit} className="space-y-3.5" id="form-pay-company">
                  {/* Select Supplier */}
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-300">
                      {language === 'bn' ? 'কোম্পানি / সাপ্লায়ার নির্বাচন করুন:' : 'Select Company / Vendor:'}
                    </label>
                    <select
                      id="select-pay-supplier"
                      value={selectedSupplierId}
                      onChange={(e) => setSelectedSupplierId(e.target.value)}
                      className="w-full bg-slate-800 border border-slate-700 rounded-xl py-2.5 px-3 text-xs text-white focus:outline-none focus:border-emerald-500"
                    >
                      {suppliers.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name} ({s.company}) — {language === 'bn' ? 'বকেয়া পাওনা:' : 'Due:'} {formatCurrency(s.outstandingPayable || 0, language)}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Supplier Summary Card */}
                  {selectedSupplier && (
                    <div className="p-3 rounded-xl bg-slate-800/60 border border-slate-700 flex items-center justify-between text-xs">
                      <div>
                        <span className="text-slate-400 block">{language === 'bn' ? 'কোম্পানির বকেয়া পাওনা:' : 'Payable Due:'}</span>
                        <span className="text-sm font-bold text-rose-400">
                          {formatCurrency(selectedSupplier.outstandingPayable || 0, language)}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setCompanyAmount(selectedSupplier.outstandingPayable || 0)}
                        className="py-1 px-2.5 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-200 text-[11px] font-bold transition"
                      >
                        {language === 'bn' ? 'সম্পূর্ণ বকেয়া পরিশোধ' : 'Pay Full Due'}
                      </button>
                    </div>
                  )}

                  {/* Payment Method */}
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-300">
                      {language === 'bn' ? 'পেমেন্ট মাধ্যম (Payment Method):' : 'Payment Method:'}
                    </label>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      {(['Cash', 'Bank Transfer', 'bKash / Nagad', 'Cheque'] as const).map((m) => (
                        <button
                          key={m}
                          type="button"
                          onClick={() => setPaymentMethod(m)}
                          className={`py-2 px-2 rounded-xl text-xs font-bold border transition text-center ${
                            paymentMethod === m
                              ? 'bg-emerald-950/50 border-emerald-500 text-emerald-300 shadow-sm'
                              : 'bg-slate-800 border-slate-700 text-slate-400 hover:bg-slate-700/60'
                          }`}
                        >
                          {m === 'Cash' ? (language === 'bn' ? '💵 ক্যাশ ড্রয়ার' : '💵 Cash') :
                           m === 'Bank Transfer' ? (language === 'bn' ? '🏦 ব্যাংক' : '🏦 Bank') :
                           m === 'bKash / Nagad' ? '📱 বিকাশ/নগদ' : '📝 চেক'}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Amount Input */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-300 flex items-center justify-between">
                      <span>{language === 'bn' ? 'পরিশোধের পরিমাণ (Amount):' : 'Disbursement Amount (৳):'}</span>
                      <span className="text-emerald-400 font-bold">{formatCurrency(companyAmount, language)}</span>
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        min="0.01"
                        step="any"
                        required
                        id="input-company-pay-amount"
                        value={companyAmount || ''}
                        onChange={(e) => setCompanyAmount(Number(e.target.value))}
                        placeholder="0"
                        className="w-full bg-slate-800 border border-slate-700 rounded-xl py-2.5 pl-4 pr-12 text-white font-bold text-base focus:outline-none focus:border-emerald-500"
                      />
                      <span className="absolute right-3 top-3 text-slate-400 font-bold text-xs">৳ BDT</span>
                    </div>

                    {/* Insufficient Cash Warning & Invest Trigger */}
                    {paymentMethod === 'Cash' && companyAmount > cashAdmin && (
                      <div className="p-2.5 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-between gap-2 text-xs">
                        <span className="text-amber-300">
                          {t.insufficientCashAdmin} ({language === 'bn' ? 'বর্তমান ভল্ট:' : 'Vault:'} {formatCurrency(cashAdmin, language)})
                        </span>
                        <button
                          type="button"
                          onClick={() => setIsInvestModalOpen(true)}
                          className="py-1 px-2 rounded-lg bg-emerald-600 text-white font-bold text-[11px] shrink-0 hover:bg-emerald-500 transition"
                        >
                          +{t.addInvestment}
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Date, Voucher No & Notes */}
                  <div className="space-y-1.5 p-3 rounded-xl bg-slate-800/40 border border-slate-700/60">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-emerald-400" />
                        <span>{language === 'bn' ? 'লেনদেনের তারিখ (Transaction Date):' : 'Transaction Date:'}</span>
                      </label>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => setCompanyPaymentDate(getTodayDateString())}
                          className={`text-[10px] px-2 py-0.5 rounded font-bold transition ${
                            companyPaymentDate === getTodayDateString()
                              ? 'bg-emerald-600 text-white'
                              : 'bg-slate-700 text-slate-400 hover:text-white'
                          }`}
                        >
                          {language === 'bn' ? 'আজ' : 'Today'}
                        </button>
                        <button
                          type="button"
                          onClick={() => setCompanyPaymentDate(getYesterdayDateString())}
                          className={`text-[10px] px-2 py-0.5 rounded font-bold transition ${
                            companyPaymentDate === getYesterdayDateString()
                              ? 'bg-emerald-600 text-white'
                              : 'bg-slate-700 text-slate-400 hover:text-white'
                          }`}
                        >
                          {language === 'bn' ? 'গতকাল' : 'Yesterday'}
                        </button>
                      </div>
                    </div>
                    <input
                      type="date"
                      value={companyPaymentDate}
                      onChange={(e) => setCompanyPaymentDate(e.target.value)}
                      className="w-full bg-slate-800 border border-slate-700 rounded-xl py-2 px-3 text-xs font-mono font-bold text-white focus:outline-none focus:border-emerald-500"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <label className="text-[11px] font-semibold text-slate-400">
                        {language === 'bn' ? 'ভাউচার / রেফারেন্স নং:' : 'Voucher / Ref No:'}
                      </label>
                      <input
                        type="text"
                        value={companyRefNo}
                        onChange={(e) => setCompanyRefNo(e.target.value)}
                        className="w-full bg-slate-800 border border-slate-700 rounded-xl py-2 px-3 text-xs text-white focus:outline-none focus:border-emerald-500"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[11px] font-semibold text-slate-400">
                        {language === 'bn' ? 'মন্তব্য / নোট:' : 'Notes / Remarks:'}
                      </label>
                      <input
                        type="text"
                        value={companyNotes}
                        onChange={(e) => setCompanyNotes(e.target.value)}
                        placeholder={language === 'bn' ? 'কোম্পানি পেমেন্ট বিবরণ' : 'Payment remarks'}
                        className="w-full bg-slate-800 border border-slate-700 rounded-xl py-2 px-3 text-xs text-white focus:outline-none focus:border-emerald-500"
                      />
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
                    <button
                      type="button"
                      onClick={onClose}
                      className="py-2 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition"
                    >
                      {t.cancel}
                    </button>
                    <button
                      type="submit"
                      disabled={companyAmount <= 0}
                      id="btn-submit-pay-company"
                      className="py-2 px-5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 disabled:opacity-50 text-white text-xs font-bold shadow-lg shadow-emerald-950/40 transition active:scale-95 flex items-center gap-1.5"
                    >
                      <CreditCard className="w-4 h-4" />
                      <span>{t.payCompany}</span>
                    </button>
                  </div>
                </form>
              )}
            </div>
          )}

          {/* =========================================================
              TAB 2: DSR / COUNTER -> ADMIN CASH PAYMENT & HANDOVER
             ========================================================= */}
          {activeTab === 'PAY_ADMIN' && currentRole !== 'admin' && (
            <div className="space-y-4">
              {staffPaySuccess ? (
                <div className="py-8 text-center space-y-2">
                  <div className="w-12 h-12 mx-auto rounded-full bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                    <CheckCircle2 className="w-6 h-6" />
                  </div>
                  <h4 className="text-sm font-bold text-white">{t.staffPaymentSuccess}</h4>
                  <p className="text-xs text-slate-400">
                    {language === 'bn'
                      ? 'এডমিন একাউন্টে টাকা গ্রহণের নোটিফিকেশন পাঠানো হয়েছে।'
                      : 'Notification sent to Admin for acceptance.'}
                  </p>
                </div>
              ) : (
                <form onSubmit={handlePayAdminSubmit} className="space-y-3.5" id="form-pay-admin">
                  {/* Current Hand / Drawer Balance Info */}
                  <div className="p-3.5 rounded-2xl bg-gradient-to-r from-slate-800 to-slate-800/80 border border-slate-700 flex items-center justify-between">
                    <div>
                      <span className="text-[11px] font-medium text-slate-400 block">
                        {language === 'bn' ? 'আপনার নিকট বিক্রয় বাবদ নগদ জমা:' : 'Your Cash in Hand:'}
                      </span>
                      <span className={`text-lg font-bold ${myDrawerBalance < 0 ? 'text-rose-400 font-extrabold' : 'text-emerald-400'}`}>
                        {formatCurrency(myDrawerBalance, language)}
                      </span>
                    </div>
                    {myDrawerBalance > 0 && (
                      <button
                        type="button"
                        onClick={() => setAdminPaymentAmount(myDrawerBalance)}
                        className="py-1.5 px-3 rounded-xl bg-emerald-600/30 hover:bg-emerald-600 text-emerald-300 hover:text-white border border-emerald-500/40 text-xs font-bold transition"
                      >
                        {t.payAllToAdmin}
                      </button>
                    )}
                  </div>

                  {/* DSR Recipient Selector */}
                  {currentRole === 'dsr' && (
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-slate-300 block">
                        {language === 'bn' ? 'কোথায় টাকা জমা দিচ্ছেন?' : 'Where are you transferring cash?'}
                      </label>
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={() => setStaffTargetRole('counter')}
                          className={`p-2.5 rounded-xl border text-left transition cursor-pointer ${
                            staffTargetRole === 'counter'
                              ? 'bg-emerald-950/70 border-emerald-500 text-emerald-300 font-bold shadow-md shadow-emerald-950/40'
                              : 'bg-slate-900 border-slate-700 text-slate-400 hover:text-slate-200'
                          }`}
                        >
                          <div className="text-[10px] uppercase font-bold flex items-center justify-between">
                            <span>{language === 'bn' ? '১. ক্যাশ কাউন্টার' : '1. Cash Counter'}</span>
                            <span className="text-[9px] bg-emerald-500/20 px-1 py-0.5 rounded text-emerald-400 font-bold">ডিফল্ট</span>
                          </div>
                          <div className="text-xs font-mono font-bold text-white mt-1">ক্যাশ কাউন্টার</div>
                          <div className="text-[10px] text-slate-400 mt-0.5">{language === 'bn' ? 'কাউন্টার ড্রয়ার প্লাস হবে' : 'Will credit counter'}</div>
                        </button>
                        <button
                          type="button"
                          onClick={() => setStaffTargetRole('admin')}
                          className={`p-2.5 rounded-xl border text-left transition cursor-pointer ${
                            staffTargetRole === 'admin'
                              ? 'bg-sky-950/70 border-sky-500 text-sky-300 font-bold shadow-md shadow-sky-950/40'
                              : 'bg-slate-900 border-slate-700 text-slate-400 hover:text-slate-200'
                          }`}
                        >
                          <div className="text-[10px] uppercase font-bold">{language === 'bn' ? '২. এডমিন ভল্ট' : '2. Admin Vault'}</div>
                          <div className="text-xs font-mono font-bold text-white mt-1">মালিক / এডমিন</div>
                          <div className="text-[10px] text-slate-400 mt-0.5">{language === 'bn' ? 'মালিককে সরাসরি জমা' : 'Direct to owner'}</div>
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Date Selector */}
                  <div className="space-y-1.5 p-3 rounded-xl bg-slate-800/40 border border-slate-700/60">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-indigo-400" />
                        <span>{language === 'bn' ? 'টাকা হস্তান্তরের তারিখ (Date):' : 'Handover Date:'}</span>
                      </label>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => setStaffPaymentDate(getTodayDateString())}
                          className={`text-[10px] px-2 py-0.5 rounded font-bold transition ${
                            staffPaymentDate === getTodayDateString()
                              ? 'bg-indigo-600 text-white'
                              : 'bg-slate-700 text-slate-400 hover:text-white'
                          }`}
                        >
                          {language === 'bn' ? 'আজ' : 'Today'}
                        </button>
                        <button
                          type="button"
                          onClick={() => setStaffPaymentDate(getYesterdayDateString())}
                          className={`text-[10px] px-2 py-0.5 rounded font-bold transition ${
                            staffPaymentDate === getYesterdayDateString()
                              ? 'bg-indigo-600 text-white'
                              : 'bg-slate-700 text-slate-400 hover:text-white'
                          }`}
                        >
                          {language === 'bn' ? 'গতকাল' : 'Yesterday'}
                        </button>
                      </div>
                    </div>
                    <input
                      type="date"
                      value={staffPaymentDate}
                      onChange={(e) => setStaffPaymentDate(e.target.value)}
                      className="w-full bg-slate-800 border border-slate-700 rounded-xl py-2 px-3 text-xs font-mono font-bold text-white focus:outline-none focus:border-indigo-500"
                    />
                  </div>

                  {/* Amount Input */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-300 flex items-center justify-between">
                      <span>{language === 'bn' ? 'এডমিনকে জমার পরিমাণ (Amount):' : 'Handover Amount (৳):'}</span>
                      <span className="text-emerald-400 font-bold">{formatCurrency(adminPaymentAmount, language)}</span>
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        min="0.01"
                        step="any"
                        required
                        id="input-staff-pay-admin-amount"
                        value={adminPaymentAmount || ''}
                        onChange={(e) => setAdminPaymentAmount(Number(e.target.value))}
                        placeholder="0"
                        className="w-full bg-slate-800 border border-slate-700 rounded-xl py-2.5 pl-4 pr-12 text-white font-bold text-base focus:outline-none focus:border-emerald-500"
                      />
                      <span className="absolute right-3 top-3 text-slate-400 font-bold text-xs">৳ BDT</span>
                    </div>

                    {/* Quick Presets */}
                    <div className="flex flex-wrap gap-1 pt-1">
                      {quickPayPresets.map((p) => (
                        <button
                          key={p}
                          type="button"
                          onClick={() => setAdminPaymentAmount(p)}
                          className={`px-2 py-0.5 text-[11px] font-bold rounded-lg border transition ${
                            adminPaymentAmount === p
                              ? 'bg-emerald-600 text-white border-emerald-500 shadow-sm'
                              : 'bg-slate-800 text-slate-300 border-slate-700 hover:border-slate-600'
                          }`}
                        >
                          +{formatCurrency(p, language)}
                        </button>
                      ))}
                    </div>

                    {adminPaymentAmount > myDrawerBalance && (
                      <div className="mt-2 p-2 rounded-xl bg-amber-500/10 border border-amber-500/30 text-[11px] text-amber-300 space-y-0.5">
                        <div className="font-bold flex items-center gap-1.5">
                          <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                          <span>{language === 'bn' ? 'পর্যাপ্ত ব্যালেন্স নেই (মাইনাস ফিগার প্রযোজ্য)' : 'Insufficient balance (Will result in minus figure)'}</span>
                        </div>
                        <p className="text-[10px] text-slate-300 pl-5">
                          {language === 'bn'
                            ? `বর্তমান ব্যালেন্স ${formatCurrency(myDrawerBalance, language)}। ${formatCurrency(adminPaymentAmount, language)} জমা দিলে ক্যাশ ড্রয়ার মাইনাস ফিগার (${formatCurrency(myDrawerBalance - adminPaymentAmount, language)}) প্রদর্শন করবে।`
                            : `Current balance is ${formatCurrency(myDrawerBalance, language)}. Transferring ${formatCurrency(adminPaymentAmount, language)} will result in a negative balance (${formatCurrency(myDrawerBalance - adminPaymentAmount, language)}).`}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Currency Denominations (Notes Breakdown) */}
                  <div className="p-3 rounded-2xl bg-slate-800/60 border border-slate-700/80 space-y-2">
                    <div className="flex items-center justify-between text-xs font-semibold text-slate-300">
                      <span className="flex items-center gap-1.5">
                        <Coins className="w-3.5 h-3.5 text-amber-400" />
                        {t.notesBreakdown}
                      </span>
                      {calcDenominationTotal() > 0 && (
                        <span className="text-amber-300 text-[11px]">
                          {language === 'bn' ? 'নোটের মোট হিসাব:' : 'Notes Sum:'} {formatCurrency(calcDenominationTotal(), language)}
                        </span>
                      )}
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      {['1000', '500', '200', '100', '50', '20', '10'].map((denom) => (
                        <div key={denom} className="flex items-center gap-1 bg-slate-900/80 p-1.5 rounded-lg border border-slate-800">
                          <span className="text-[11px] font-bold text-slate-400 w-11 shrink-0">
                            ৳{denom} x
                          </span>
                          <input
                            type="number"
                            min="0"
                            value={denominations[denom] || ''}
                            onChange={(e) => handleDenomChange(denom, Number(e.target.value))}
                            placeholder="0"
                            className="w-full bg-slate-800 text-right text-xs font-bold text-white rounded px-1.5 py-0.5 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                          />
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Notes */}
                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-slate-400">
                      {language === 'bn' ? 'মন্তব্য / রুট কালেকশন বিবরণ:' : 'Collection Notes:'}
                    </label>
                    <input
                      type="text"
                      value={adminPaymentNotes}
                      onChange={(e) => setAdminPaymentNotes(e.target.value)}
                      placeholder={language === 'bn' ? 'আজকের বিক্রয় ও দোকান কালেকশন বাবদ জমা' : 'Daily sales handover notes'}
                      className="w-full bg-slate-800 border border-slate-700 rounded-xl py-2 px-3 text-xs text-white focus:outline-none focus:border-emerald-500"
                    />
                  </div>

                  {/* Action Buttons */}
                  <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
                    <button
                      type="button"
                      onClick={onClose}
                      className="py-2 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition"
                    >
                      {t.cancel}
                    </button>
                    <button
                      type="submit"
                      disabled={adminPaymentAmount <= 0}
                      id="btn-submit-pay-admin"
                      className="py-2 px-5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 disabled:opacity-50 text-white text-xs font-bold shadow-lg shadow-emerald-950/40 transition active:scale-95 flex items-center gap-1.5"
                    >
                      <Send className="w-4 h-4" />
                      <span>{t.payAdmin}</span>
                    </button>
                  </div>
                </form>
              )}
            </div>
          )}

          {/* =========================================================
              TAB 3: ADMIN RECEIVES CASH FROM STAFF
             ========================================================= */}
          {activeTab === 'RECEIVE_STAFF' && currentRole === 'admin' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span>
                  {language === 'bn' ? 'ডিএসআর ও ক্যাশ কাউন্টার প্রেরিত অপেক্ষমান নগদ জমা:' : 'Pending staff cash handovers:'}
                </span>
                <span className="font-bold text-amber-300">{pendingStaffTransfers.length} {language === 'bn' ? 'টি অপেক্ষমান' : 'Pending'}</span>
              </div>

              {pendingStaffTransfers.length === 0 ? (
                <div className="py-8 text-center bg-slate-800/40 rounded-2xl border border-slate-800 space-y-2">
                  <Coins className="w-8 h-8 mx-auto text-slate-500" />
                  <p className="text-xs text-slate-400">
                    {language === 'bn'
                      ? 'বর্তমানে কোনো অপেক্ষমান ক্যাশ ট্রান্সফার নেই।'
                      : 'No pending staff cash handovers at the moment.'}
                  </p>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {pendingStaffTransfers.map((tr) => (
                    <div
                      key={tr.id}
                      className="p-3.5 rounded-2xl bg-slate-800/80 border border-slate-700 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-md"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-white">{tr.fromUserName}</span>
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-indigo-500/20 text-indigo-300 font-semibold uppercase">
                            {tr.fromRole}
                          </span>
                        </div>
                        <p className="text-xs text-slate-400">{tr.notes || 'Sales collection handover'}</p>
                        <span className="text-[10px] text-slate-500 block">
                          {new Date(tr.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} • {new Date(tr.createdAt).toLocaleDateString()}
                        </span>
                      </div>

                      <div className="flex items-center justify-between sm:justify-end gap-3">
                        <span className="text-base font-black text-emerald-400">
                          {formatCurrency(tr.amount, language)}
                        </span>
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => acceptCashTransfer(tr.id)}
                            id={`btn-accept-transfer-${tr.id}`}
                            className="py-1.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md transition active:scale-95 flex items-center gap-1"
                          >
                            <Check className="w-3.5 h-3.5" />
                            <span>{t.accept}</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => rejectCashTransfer(tr.id)}
                            className="py-1.5 px-2.5 rounded-xl bg-rose-600/30 hover:bg-rose-600 text-rose-300 hover:text-white border border-rose-500/40 font-bold text-xs transition"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* =========================================================
              TAB 4: PAYMENT HISTORY & DELETION OF MISTAKEN ENTRIES
             ========================================================= */}
          {activeTab === 'HISTORY' && (
            <div className="space-y-3">
              {/* Sub-view toggle: Company Payments vs Staff Cash Handovers */}
              <div className="flex rounded-xl bg-slate-950 p-1 border border-slate-800 text-xs gap-1">
                <button
                  type="button"
                  onClick={() => setHistoryViewType('COMPANY')}
                  className={`flex-1 py-1.5 px-3 rounded-lg font-bold flex items-center justify-center gap-1.5 transition ${
                    historyViewType === 'COMPANY'
                      ? 'bg-indigo-600 text-white shadow-sm'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <Building2 className="w-3.5 h-3.5" />
                  <span>{language === 'bn' ? 'কোম্পানি পেমেন্ট রেকর্ড' : 'Company Payments'}</span>
                  <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-slate-900 border border-slate-700 font-mono">
                    {supplierLedger.filter((e) => e.type === 'PAYMENT').length}
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => setHistoryViewType('STAFF')}
                  className={`flex-1 py-1.5 px-3 rounded-lg font-bold flex items-center justify-center gap-1.5 transition ${
                    historyViewType === 'STAFF'
                      ? 'bg-indigo-600 text-white shadow-sm'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <Coins className="w-3.5 h-3.5" />
                  <span>{language === 'bn' ? 'স্টাফ ক্যাশ হ্যান্ডওভার' : 'Staff Handovers'}</span>
                  <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-slate-900 border border-slate-700 font-mono">
                    {cashTransfers.length}
                  </span>
                </button>
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-slate-400">
                <span className="font-semibold">
                  {historyViewType === 'COMPANY'
                    ? (language === 'bn' ? 'কোম্পানি ভাউচার তালিকা:' : 'Company vouchers:')
                    : (language === 'bn' ? 'ক্যাশ ও হ্যান্ডওভার রেকর্ড:' : 'Cash handovers:')}
                </span>
                <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800 text-[11px]">
                  <button
                    type="button"
                    onClick={() => setHistoryDateFilter('ALL')}
                    className={`px-2 py-0.5 rounded font-bold transition ${
                      historyDateFilter === 'ALL'
                        ? 'bg-emerald-600 text-white'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    {language === 'bn' ? 'সব' : 'All'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setHistoryDateFilter('TODAY')}
                    className={`px-2 py-0.5 rounded font-bold transition ${
                      historyDateFilter === 'TODAY'
                        ? 'bg-emerald-600 text-white'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    {language === 'bn' ? 'আজ' : 'Today'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setHistoryDateFilter('YESTERDAY')}
                    className={`px-2 py-0.5 rounded font-bold transition ${
                      historyDateFilter === 'YESTERDAY'
                        ? 'bg-emerald-600 text-white'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    {language === 'bn' ? 'গতকাল' : 'Yesterday'}
                  </button>
                  <input
                    type="date"
                    value={historyDateFilter !== 'ALL' && historyDateFilter !== 'TODAY' && historyDateFilter !== 'YESTERDAY' ? historyDateFilter : ''}
                    onChange={(e) => setHistoryDateFilter(e.target.value || 'ALL')}
                    className="bg-slate-900 border border-slate-700 rounded px-1.5 py-0.5 text-[11px] text-white font-mono focus:outline-none focus:border-emerald-500"
                    title="Filter by date"
                  />
                </div>
              </div>

              {historyViewType === 'COMPANY' ? (
                /* Company Payments List */
                <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                  {supplierLedger
                    .filter((e) => {
                      if (e.type !== 'PAYMENT') return false;
                      const dateStr = (e.date || '').toLowerCase();
                      if (historyDateFilter === 'TODAY') return dateStr.includes(getTodayDateString());
                      if (historyDateFilter === 'YESTERDAY') return dateStr.includes(getYesterdayDateString());
                      if (historyDateFilter !== 'ALL' && historyDateFilter !== '') return dateStr.includes(historyDateFilter);
                      return true;
                    })
                    .map((item) => {
                      const suppObj = suppliers.find((s) => s.id === item.supplierId);
                      const displayName = item.supplierName || suppObj?.company || suppObj?.name || 'কোম্পানি';
                      return (
                        <div
                          key={item.id}
                          className="p-3 rounded-xl bg-slate-800/60 border border-slate-700/80 flex items-center justify-between gap-2 text-xs"
                        >
                          <div className="space-y-0.5">
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-slate-100">{displayName}</span>
                              <span className="text-[10px] px-1.5 py-0.2 rounded font-bold bg-indigo-500/20 text-indigo-300 font-mono">
                                {item.paymentMethod || 'Cash'}
                              </span>
                              <span className="text-[10px] text-slate-400 font-mono">
                                #{item.referenceNo}
                              </span>
                            </div>
                            <p className="text-[11px] text-slate-400 truncate max-w-xs">
                              {item.notes || (language === 'bn' ? 'কোম্পানি বিল পরিশোধ' : 'Company bill settlement')} • {item.date}
                            </p>
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            <span className="font-bold text-emerald-400 font-mono-num text-sm">
                              {formatCurrency(item.amount, language)}
                            </span>
                            {currentRole === 'admin' && (
                              <button
                                type="button"
                                onClick={() => {
                                  if (window.confirm(language === 'bn' ? 'আপনি কি এই কোম্পানি পেমেন্ট এন্ট্রিটি মুছে ফেলতে চান?' : 'Delete this company payment record?')) {
                                    deleteSupplierLedgerEntry(item.id);
                                  }
                                }}
                                className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-slate-700 transition"
                                title={language === 'bn' ? 'ভুল এন্ট্রি মুছুন' : 'Delete wrong entry'}
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  {supplierLedger.filter((e) => e.type === 'PAYMENT').length === 0 && (
                    <div className="py-6 text-center text-slate-400 text-xs">
                      {language === 'bn' ? 'কোনো কোম্পানি পেমেন্ট পাওয়া যায়নি।' : 'No company payments found.'}
                    </div>
                  )}
                </div>
              ) : (
                /* Staff Cash Handovers List */
                <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                  {cashTransfers
                    .filter((tr) => {
                      const dateStr = (tr.createdAt || '').toLowerCase();
                      if (historyDateFilter === 'TODAY') return dateStr.includes(getTodayDateString());
                      if (historyDateFilter === 'YESTERDAY') return dateStr.includes(getYesterdayDateString());
                      if (historyDateFilter !== 'ALL' && historyDateFilter !== '') return dateStr.includes(historyDateFilter);
                      return true;
                    })
                    .slice(0, 30)
                    .map((tr) => (
                    <div
                      key={tr.id}
                      className="p-3 rounded-xl bg-slate-800/60 border border-slate-700/80 flex items-center justify-between gap-2 text-xs"
                    >
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-200">{tr.fromUserName} ➔ {tr.toUserName}</span>
                          <span
                            className={`text-[9px] px-1.5 py-0.2 rounded font-bold ${
                              tr.status === 'ACCEPTED'
                                ? 'bg-emerald-500/20 text-emerald-300'
                                : tr.status === 'PENDING'
                                ? 'bg-amber-500/20 text-amber-300'
                                : 'bg-rose-500/20 text-rose-300'
                            }`}
                          >
                            {tr.status}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-400 truncate max-w-xs">{tr.notes}</p>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <span className="font-bold text-emerald-400">
                          {formatCurrency(tr.amount, language)}
                        </span>
                        {currentRole === 'admin' && (
                          <button
                            type="button"
                            onClick={() => {
                              if (window.confirm(language === 'bn' ? 'আপনি কি এই ট্রান্সফার এন্ট্রিটি মুছে ফেলতে চান?' : 'Delete this transfer entry?')) {
                                deleteCashTransfer(tr.id);
                              }
                            }}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-slate-700 transition"
                            title={t.deleteWrongEntry}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Invest Capital Modal */}
      <InvestCapitalModal
        isOpen={isInvestModalOpen}
        onClose={() => setIsInvestModalOpen(false)}
        defaultAccount="CASH_DRAWER"
        suggestedAmount={50000}
      />
    </>
  );
};
