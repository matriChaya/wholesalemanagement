import React, { useState, useMemo } from 'react';
import {
  X,
  Download,
  Eye,
  Calendar,
  Search,
  Wallet,
  ArrowDownLeft,
  ArrowUpRight,
  ShieldCheck,
  Building2,
  Sparkles,
  Users,
  CheckCircle2,
  Printer,
  TrendingDown,
  TrendingUp,
} from 'lucide-react';
import { useWholesale } from '../context/WholesaleContext';
import { formatCurrency } from '../utils/translations';
import { computeCashDrawerStatementData, generateCashDrawerStatementPdf, DateRangeFilter } from '../utils/pdfExport';
import { CashDrawerTransaction } from '../utils/pdfHtmlTemplates';

interface CashDrawerStatementModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialRole?: 'admin' | 'counter' | 'dsr';
  onOpenPdfPreview?: (pdfResult: any) => void;
}

export const CashDrawerStatementModal: React.FC<CashDrawerStatementModalProps> = ({
  isOpen,
  onClose,
  initialRole = 'admin',
  onOpenPdfPreview,
}) => {
  const context = useWholesale();
  const {
    language,
    orders,
    cashTransfers,
    supplierLedger,
    suppliers,
    capitalTransactions,
    users,
    expenses,
    cashAdmin,
    cashCounter,
    cashDSR,
    businessProfile,
  } = context;

  const [activeRole, setActiveRole] = useState<'admin' | 'counter' | 'dsr'>(initialRole);
  const [selectedDsrId, setSelectedDsrId] = useState<string>('ALL');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [typeFilter, setTypeFilter] = useState<'ALL' | 'INFLOW' | 'OUTFLOW'>('ALL');

  // Date range state - defaults to 'all' so historical sales and transfers are always immediately visible
  const [datePreset, setDatePreset] = useState<'today' | 'this_month' | 'last_month' | 'all' | 'custom'>('all');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');

  // Switch role when initialRole changes if opened
  React.useEffect(() => {
    if (initialRole) {
      setActiveRole(initialRole);
    }
  }, [initialRole, isOpen]);

  // Handle Date Presets
  const applyDatePreset = (preset: 'today' | 'this_month' | 'last_month' | 'all') => {
    setDatePreset(preset);
    const now = new Date();
    const todayStr = now.toISOString().slice(0, 10);

    if (preset === 'today') {
      setStartDate(todayStr);
      setEndDate(todayStr);
    } else if (preset === 'this_month') {
      const firstDay = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
      setStartDate(firstDay);
      setEndDate(todayStr);
    } else if (preset === 'last_month') {
      const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);
      setStartDate(lastMonth.toISOString().slice(0, 10));
      setEndDate(lastMonthEnd.toISOString().slice(0, 10));
    } else if (preset === 'all') {
      setStartDate('');
      setEndDate('');
    }
  };

  // Build Date Range Filter object
  const dateRangeFilter = useMemo<DateRangeFilter>(() => {
    let label = 'সকল সময়';
    if (datePreset === 'today') label = 'আজকের তারিখ';
    else if (datePreset === 'this_month') label = 'চলতি মাস';
    else if (datePreset === 'last_month') label = 'গত মাস';
    else if (startDate || endDate) label = `${startDate || 'শুরু'} হতে ${endDate || 'বর্তমান'}`;

    return {
      startDate,
      endDate,
      label,
    };
  }, [datePreset, startDate, endDate]);

  // Current balance mapped to active role
  const currentBalance = useMemo(() => {
    if (activeRole === 'admin') return cashAdmin;
    if (activeRole === 'counter') return cashCounter;
    if (selectedDsrId !== 'ALL') {
      const user = users.find((u) => u.id === selectedDsrId);
      const uName = (user?.name || '').toLowerCase();
      const uBnName = (user?.bnName || '').toLowerCase();
      const userOrdersCash = orders
        .filter((o) => {
          const r = (o.creatorRole || o.salesPersonRole || '').toLowerCase();
          const n = (o.creatorName || o.salesPersonName || '').toLowerCase();
          const id = (o as any).creatorId || (o as any).salesPersonId || '';
          return (
            id === user?.id ||
            n === uName ||
            (uName && n.includes(uName)) ||
            (uBnName && n.includes(uBnName)) ||
            n.includes('razo') ||
            n.includes('raju') ||
            n.includes('রাজু') ||
            (r === 'dsr' && !users.some((x) => x.role === 'dsr' && x.id !== user?.id))
          );
        })
        .reduce((sum, o) => sum + (Number(o.paidAmount) || (o.paymentMethod === 'Cash' || !o.paymentMethod ? Number(o.totalAmount) : 0)), 0);

      const userTransfersOut = cashTransfers
        .filter((tr) => {
          const r = (tr.fromRole || '').toLowerCase();
          const n = (tr.fromUserName || '').toLowerCase();
          const id = tr.fromUserId || '';
          return (
            (id === user?.id ||
              n.includes(uName) ||
              (uBnName && n.includes(uBnName)) ||
              n.includes('razo') ||
              n.includes('raju') ||
              n.includes('রাজু') ||
              (r === 'dsr' && !users.some((x) => x.role === 'dsr' && x.id !== user?.id))) &&
            tr.status !== 'REJECTED'
          );
        })
        .reduce((sum, tr) => sum + tr.amount, 0);

      const userCalculatedCash = userOrdersCash - userTransfersOut;
      return typeof user?.assignedCashDrawer === 'number'
        ? user.assignedCashDrawer
        : userCalculatedCash;
    }
    return cashDSR;
  }, [activeRole, selectedDsrId, cashAdmin, cashCounter, cashDSR, users, orders, cashTransfers]);

  // Compute Statement Data
  const statementData = useMemo(() => {
    return computeCashDrawerStatementData({
      drawerRole: activeRole,
      selectedUserId: activeRole === 'dsr' && selectedDsrId !== 'ALL' ? selectedDsrId : undefined,
      orders,
      cashTransfers,
      supplierLedger,
      suppliers,
      capitalTransactions,
      currentBalance,
      users,
      expenses,
      dateRange: dateRangeFilter,
    });
  }, [
    activeRole,
    selectedDsrId,
    orders,
    cashTransfers,
    supplierLedger,
    suppliers,
    capitalTransactions,
    currentBalance,
    users,
    expenses,
    dateRangeFilter,
  ]);

  // Filtered transactions for on-screen search & type filter
  const filteredTransactions = useMemo(() => {
    return statementData.transactions.filter((tx) => {
      // Type filter
      if (typeFilter !== 'ALL' && tx.type !== typeFilter) return false;

      // Search filter
      if (!searchTerm.trim()) return true;
      const term = searchTerm.toLowerCase();
      return (
        (tx.payerName || '').toLowerCase().includes(term) ||
        (tx.receiverName || '').toLowerCase().includes(term) ||
        (tx.referenceNo || '').toLowerCase().includes(term) ||
        (tx.particulars || '').toLowerCase().includes(term) ||
        tx.amount.toString().includes(term)
      );
    });
  }, [statementData.transactions, typeFilter, searchTerm]);

  // DSR user list
  const dsrUsers = useMemo(() => users.filter((u) => u.role === 'dsr'), [users]);

  // PDF Action Handlers
  const handlePdfAction = (action: 'preview' | 'download') => {
    const pdfDoc = generateCashDrawerStatementPdf({
      drawerRole: activeRole,
      drawerTitleBn: statementData.drawerTitleBn,
      drawerTitleEn: statementData.drawerTitleEn,
      custodianName: statementData.custodianName,
      selectedUserId: activeRole === 'dsr' && selectedDsrId !== 'ALL' ? selectedDsrId : undefined,
      orders,
      cashTransfers,
      supplierLedger,
      suppliers,
      capitalTransactions,
      currentBalance,
      users,
      expenses,
      dateRange: dateRangeFilter,
      profile: businessProfile,
    });

    if (action === 'preview') {
      if (onOpenPdfPreview) {
        onOpenPdfPreview(pdfDoc);
      } else {
        window.open(pdfDoc.blobUrl, '_blank');
      }
    } else {
      pdfDoc.download();
    }
  };

  if (!isOpen) return null;

  return (
    <div
      id="cash-drawer-statement-modal"
      className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/85 backdrop-blur-md overflow-y-auto"
    >
      <div className="w-full max-w-6xl bg-slate-900 border-2 border-emerald-500/40 rounded-3xl shadow-2xl flex flex-col max-h-[96vh] overflow-hidden my-auto animate-in fade-in zoom-in-95 duration-200">
        {/* Modal Header */}
        <div className="px-4 sm:px-6 py-4 bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950 border-b border-slate-800 flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-500 flex items-center justify-center text-white shadow-lg shadow-emerald-950/50 shrink-0">
              <Wallet className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-base sm:text-lg font-black text-white tracking-tight">
                  {language === 'bn' ? 'ক্যাশ ড্রয়ার স্টেটমেন্ট ও অডিট লেজার' : 'Cash Drawer Statement & Audit'}
                </h2>
                <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-[11px] font-bold">
                  {language === 'bn' ? 'কার কাছ থেকে রিসিভ ও কোথায় খরচ' : 'Debit-Credit Ledger'}
                </span>
              </div>
              <p className="text-xs text-slate-400">
                {language === 'bn'
                  ? 'উভয় স্টেটমেন্টেই কার কাছ থেকে কত টাকা রিসিভ হলো, ড্রয়ারে কত টাকা আছে এবং কোথায় খরচ হলো তা ডেবিট-ক্রেডিট আকারে প্রদর্শিত'
                  : 'Audited debit-credit flow: cash inflows (received from), outflows (paid to/expenses), and running drawer balance'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => handlePdfAction('preview')}
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-emerald-300 border border-slate-700 text-xs font-bold transition shadow-sm cursor-pointer"
            >
              <Eye className="w-4 h-4" />
              <span>{language === 'bn' ? 'PDF প্রিভিউ' : 'Live Preview'}</span>
            </button>
            <button
              type="button"
              onClick={() => handlePdfAction('download')}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition shadow-lg shadow-emerald-950/40 cursor-pointer"
            >
              <Download className="w-4 h-4" />
              <span>{language === 'bn' ? 'PDF ডাউনলোড' : 'Download PDF'}</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
          {/* Top Role Selector Tabs with Live Drawer Balances */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5">
            {/* 1. Admin Vault Tab */}
            <button
              type="button"
              onClick={() => setActiveRole('admin')}
              className={`p-3.5 rounded-2xl border transition-all text-left flex items-center justify-between gap-3 cursor-pointer ${
                activeRole === 'admin'
                  ? 'bg-gradient-to-r from-amber-950/60 to-slate-900 border-amber-500/80 shadow-lg shadow-amber-950/30 ring-1 ring-amber-500/50'
                  : 'bg-slate-950/60 border-slate-800 hover:border-slate-700 text-slate-400'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <div
                  className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                    activeRole === 'admin' ? 'bg-amber-500 text-slate-950 font-bold' : 'bg-slate-800 text-slate-400'
                  }`}
                >
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-xs font-bold text-white block">
                    {language === 'bn' ? '১. এডমিন ক্যাশ ভল্ট' : '1. Admin Cash Vault'}
                  </span>
                  <span className="text-[10.5px] text-slate-400">
                    {language === 'bn' ? 'ভল্ট সংগ্রহ ও কোম্পানি পরিশোধ' : 'Vault Inflows & Company Bills'}
                  </span>
                </div>
              </div>
              <div className="text-right">
                <span className="text-[10px] text-slate-400 uppercase font-semibold block">ড্রয়ার স্থিতি</span>
                <span className="text-sm sm:text-base font-black text-amber-400 font-mono-num">
                  {formatCurrency(cashAdmin, language)}
                </span>
              </div>
            </button>

            {/* 2. Cash Counter Drawer Tab */}
            <button
              type="button"
              onClick={() => setActiveRole('counter')}
              className={`p-3.5 rounded-2xl border transition-all text-left flex items-center justify-between gap-3 cursor-pointer ${
                activeRole === 'counter'
                  ? 'bg-gradient-to-r from-emerald-950/60 to-slate-900 border-emerald-500/80 shadow-lg shadow-emerald-950/30 ring-1 ring-emerald-500/50'
                  : 'bg-slate-950/60 border-slate-800 hover:border-slate-700 text-slate-400'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <div
                  className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                    activeRole === 'counter' ? 'bg-emerald-500 text-slate-950 font-bold' : 'bg-slate-800 text-slate-400'
                  }`}
                >
                  <Building2 className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-xs font-bold text-white block">
                    {language === 'bn' ? '২. ক্যাশ কাউন্টার ড্রয়ার' : '2. Cash Counter Drawer'}
                  </span>
                  <span className="text-[10.5px] text-slate-400">
                    {language === 'bn' ? 'কাউন্টার বিক্রয় ও ডিএসআর জমা' : 'POS Sales & DSR Collections'}
                  </span>
                </div>
              </div>
              <div className="text-right">
                <span className="text-[10px] text-slate-400 uppercase font-semibold block">ড্রয়ার স্থিতি</span>
                <span className="text-sm sm:text-base font-black text-emerald-400 font-mono-num">
                  {formatCurrency(cashCounter, language)}
                </span>
              </div>
            </button>

            {/* 3. DSR Field Cash Tab */}
            <button
              type="button"
              onClick={() => setActiveRole('dsr')}
              className={`p-3.5 rounded-2xl border transition-all text-left flex items-center justify-between gap-3 cursor-pointer ${
                activeRole === 'dsr'
                  ? 'bg-gradient-to-r from-purple-950/60 to-slate-900 border-purple-500/80 shadow-lg shadow-purple-950/30 ring-1 ring-purple-500/50'
                  : 'bg-slate-950/60 border-slate-800 hover:border-slate-700 text-slate-400'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <div
                  className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                    activeRole === 'dsr' ? 'bg-purple-500 text-white font-bold' : 'bg-slate-800 text-slate-400'
                  }`}
                >
                  <Users className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-xs font-bold text-white block">
                    {language === 'bn' ? '৩. ডিএসআর ফিল্ড ক্যাশ' : '3. DSR Field Cash'}
                  </span>
                  <span className="text-[10.5px] text-slate-400">
                    {language === 'bn' ? 'দোকান আদায় ও কাউন্টারে হস্তান্তর' : 'Field Sales & Handover'}
                  </span>
                </div>
              </div>
              <div className="text-right">
                <span className="text-[10px] text-slate-400 uppercase font-semibold block">ফিল্ড ক্যাশ</span>
                <span className="text-sm sm:text-base font-black text-purple-400 font-mono-num">
                  {formatCurrency(cashDSR, language)}
                </span>
              </div>
            </button>
          </div>

          {/* DSR Individual Staff Filter Selector (If DSR tab is active) */}
          {activeRole === 'dsr' && dsrUsers.length > 0 && (
            <div className="p-3 rounded-2xl bg-purple-950/20 border border-purple-500/30 flex items-center justify-between gap-3 flex-wrap">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-purple-400" />
                <span className="text-xs font-bold text-purple-300">
                  {language === 'bn' ? 'নির্দিষ্ট ডিএসআর অফিসার বাছাই করুন:' : 'Select DSR Staff Member:'}
                </span>
              </div>
              <div className="flex-1 max-w-xs">
                <select
                  value={selectedDsrId}
                  onChange={(e) => setSelectedDsrId(e.target.value)}
                  className="w-full bg-slate-900 border border-purple-500/50 rounded-xl px-3 py-1.5 text-xs font-semibold text-purple-200 focus:outline-none focus:ring-1 focus:ring-purple-400"
                >
                  <option value="ALL">
                    {language === 'bn' ? '👥 সকল ডিএসআর একত্রিত (All Consolidated)' : 'All DSR Staff Consolidated'}
                  </option>
                  {dsrUsers.map((u) => {
                    const uName = (u.name || '').toLowerCase();
                    const uBn = (u.bnName || '').toLowerCase();
                    const col = orders
                      .filter((o) => {
                        const r = (o.creatorRole || o.salesPersonRole || '').toLowerCase();
                        const n = (o.creatorName || o.salesPersonName || '').toLowerCase();
                        const id = (o as any).creatorId || (o as any).salesPersonId || '';
                        return id === u.id || n === uName || (uName && n.includes(uName)) || (uBn && n.includes(uBn)) || n.includes('razo') || n.includes('raju') || n.includes('রাজু') || (r === 'dsr' && dsrUsers.length === 1);
                      })
                      .reduce((sum, o) => sum + (Number(o.paidAmount) || (o.paymentMethod === 'Cash' || !o.paymentMethod ? Number(o.totalAmount) : 0)), 0);
                    const trf = cashTransfers
                      .filter((tr) => {
                        const r = (tr.fromRole || '').toLowerCase();
                        const n = (tr.fromUserName || '').toLowerCase();
                        const id = tr.fromUserId || '';
                        return ((id === u.id || n.includes(uName) || (uBn && n.includes(uBn)) || n.includes('razo') || n.includes('raju') || n.includes('রাজু')) || (r === 'dsr' && dsrUsers.length === 1)) && tr.status !== 'REJECTED';
                      })
                      .reduce((sum, tr) => sum + tr.amount, 0);
                    const net = col - trf;
                    const bal = typeof u.assignedCashDrawer === 'number' ? u.assignedCashDrawer : net;
                    return (
                      <option key={u.id} value={u.id}>
                        {u.bnName || u.name} ({u.routeArea || 'ডিএসআর'}) [ব্যালেন্স: ৳{bal.toLocaleString()}]
                      </option>
                    );
                  })}
                </select>
              </div>
            </div>
          )}

          {/* Date Range Selector & Shortcuts */}
          <div className="p-3.5 rounded-2xl bg-slate-950/70 border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs text-slate-400 font-semibold flex items-center gap-1.5 mr-1">
                <Calendar className="w-3.5 h-3.5 text-emerald-400" />
                <span>{language === 'bn' ? 'সময়কাল:' : 'Period:'}</span>
              </span>
              <button
                type="button"
                onClick={() => applyDatePreset('today')}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition cursor-pointer ${
                  datePreset === 'today'
                    ? 'bg-emerald-600 text-white font-bold shadow'
                    : 'bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800'
                }`}
              >
                {language === 'bn' ? 'আজকের' : 'Today'}
              </button>
              <button
                type="button"
                onClick={() => applyDatePreset('this_month')}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition cursor-pointer ${
                  datePreset === 'this_month'
                    ? 'bg-emerald-600 text-white font-bold shadow'
                    : 'bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800'
                }`}
              >
                {language === 'bn' ? 'চলতি মাস' : 'This Month'}
              </button>
              <button
                type="button"
                onClick={() => applyDatePreset('last_month')}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition cursor-pointer ${
                  datePreset === 'last_month'
                    ? 'bg-emerald-600 text-white font-bold shadow'
                    : 'bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800'
                }`}
              >
                {language === 'bn' ? 'গত মাস' : 'Last Month'}
              </button>
              <button
                type="button"
                onClick={() => applyDatePreset('all')}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition cursor-pointer ${
                  datePreset === 'all'
                    ? 'bg-emerald-600 text-white font-bold shadow'
                    : 'bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800'
                }`}
              >
                {language === 'bn' ? 'সকল সময়' : 'All Time'}
              </button>
            </div>

            {/* Date Pickers */}
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1.5 bg-slate-900 border border-slate-700/80 rounded-xl px-2.5 py-1 text-xs">
                <span className="text-slate-500 font-mono text-[10px]">হতে:</span>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => {
                    setStartDate(e.target.value);
                    setDatePreset('custom');
                  }}
                  className="bg-transparent text-emerald-300 font-mono focus:outline-none text-xs"
                />
              </div>
              <span className="text-slate-500 text-xs">-</span>
              <div className="flex items-center gap-1.5 bg-slate-900 border border-slate-700/80 rounded-xl px-2.5 py-1 text-xs">
                <span className="text-slate-500 font-mono text-[10px]">পর্যন্ত:</span>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => {
                    setEndDate(e.target.value);
                    setDatePreset('custom');
                  }}
                  className="bg-transparent text-emerald-300 font-mono focus:outline-none text-xs"
                />
              </div>
            </div>
          </div>

          {/* 4 Statement Pillars (Debit-Credit Summary) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {/* Pillar 1: Opening Balance */}
            <div className="p-3.5 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-1">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                {language === 'bn' ? '১. প্রারম্ভিক ক্যাশ' : '1. Opening Balance'}
              </span>
              <div className="text-lg sm:text-xl font-black text-white font-mono-num">
                {formatCurrency(statementData.openingBalance, language)}
              </div>
              <p className="text-[10px] text-slate-500">
                {language === 'bn' ? 'নির্বাচিত সময়কালের আগের জের' : 'Balance before selected period'}
              </p>
            </div>

            {/* Pillar 2: Total Inflows (Debit / প্রাপ্তি +) */}
            <div className="p-3.5 rounded-2xl bg-slate-950/80 border border-emerald-500/40 space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-emerald-400 flex items-center gap-1">
                  <ArrowDownLeft className="w-3.5 h-3.5" />
                  <span>{language === 'bn' ? '২. মোট ডেবিট / রিসিভ' : '2. Total Cash In'}</span>
                </span>
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-mono">
                  (+) জমা
                </span>
              </div>
              <div className="text-lg sm:text-xl font-black text-emerald-400 font-mono-num">
                +{formatCurrency(statementData.totalInflow, language)}
              </div>
              <p className="text-[10px] text-slate-400">
                {language === 'bn' ? 'পণ্য বিক্রয় আদায় ও হস্তান্তর গ্রহণ' : 'Sales collection & handovers received'}
              </p>
            </div>

            {/* Pillar 3: Total Outflows (Credit / প্রদান বা খরচ -) */}
            <div className="p-3.5 rounded-2xl bg-slate-950/80 border border-rose-500/40 space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-rose-400 flex items-center gap-1">
                  <ArrowUpRight className="w-3.5 h-3.5" />
                  <span>{language === 'bn' ? '৩. মোট ক্রেডিট / খরচ' : '3. Total Cash Out'}</span>
                </span>
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-rose-500/20 text-rose-300 font-mono">
                  (-) খরচ/প্রদান
                </span>
              </div>
              <div className="text-lg sm:text-xl font-black text-rose-400 font-mono-num">
                -{formatCurrency(statementData.totalOutflow, language)}
              </div>
              <p className="text-[10px] text-slate-400">
                {language === 'bn' ? 'কোম্পানি চালান পরিশোধ ও ক্যাশ হস্তান্তর' : 'Supplier payments & transfers sent'}
              </p>
            </div>

            {/* Pillar 4: Closing Drawer Balance */}
            <div
              className={`p-3.5 rounded-2xl bg-slate-950/80 border space-y-1 ${
                statementData.closingBalance < 0
                  ? 'border-rose-500/60 bg-rose-950/20'
                  : 'border-amber-500/40'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-amber-300 block">
                  {language === 'bn' ? '৪. সমাপনী ড্রয়ার ব্যালেন্স' : '4. Closing Cash Balance'}
                </span>
                <span
                  className={`text-[10px] font-bold px-1.5 py-0.5 rounded font-mono ${
                    statementData.closingBalance < 0 ? 'bg-rose-500/20 text-rose-300' : 'bg-amber-500/20 text-amber-300'
                  }`}
                >
                  {statementData.closingBalance < 0 ? 'মাইনাস স্থিতি' : 'ক্যাশ স্থিতি'}
                </span>
              </div>
              <div
                className={`text-lg sm:text-xl font-black font-mono-num ${
                  statementData.closingBalance < 0 ? 'text-rose-400' : 'text-amber-400'
                }`}
              >
                {formatCurrency(statementData.closingBalance, language)}
              </div>
              <p className="text-[10px] text-slate-400">
                {language === 'bn' ? 'ক্যাশ ড্রয়ারে অবশিষ্ট টাকা' : 'Final net cash in drawer'}
              </p>
            </div>
          </div>

          {/* Informative explanation for DSR when sales collection was transferred to Counter */}
          {activeRole === 'dsr' && statementData.totalInflow > 0 && statementData.totalOutflow > 0 && statementData.closingBalance === 0 && (
            <div className="p-3.5 rounded-2xl bg-sky-950/40 border border-sky-500/40 flex items-center justify-between gap-3 text-xs text-sky-200 shadow-md">
              <div className="flex items-center gap-2.5">
                <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                <div>
                  <div className="font-bold text-white">
                    {language === 'bn'
                      ? 'ডিএসআর-এর সংগৃহীত সকল ক্যাশ কাউন্টারে হস্তান্তর সম্পন্ন!'
                      : 'All DSR collected sales cash successfully transferred to Cash Counter!'}
                  </div>
                  <div className="text-[11.5px] text-slate-300 mt-0.5">
                    {language === 'bn'
                      ? `ডিএসআর মোট আদায় করেছেন +${formatCurrency(statementData.totalInflow, language)} এবং ক্যাশ কাউন্টারে হস্তান্তর জমা দিয়েছেন -${formatCurrency(statementData.totalOutflow, language)}। সংগৃহীত সব টাকা কাউন্টারে চলে যাওয়ায় বর্তমানে ডিএসআরের ড্রয়ারে ব্যালেন্স শূন্য (৳০) হওয়া হিসাব অনুযায়ী শতভাগ সঠিক ও মেলানো।`
                      : `Collected +${formatCurrency(statementData.totalInflow, language)}, transferred -${formatCurrency(statementData.totalOutflow, language)} to counter. Remaining net cash in hand is ৳0.`}
                  </div>
                </div>
              </div>
              <span className="px-2.5 py-1 rounded-xl bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[11px] font-bold shrink-0">
                {language === 'bn' ? 'হিসাব সম্পন্ন' : 'Settled'}
              </span>
            </div>
          )}

          {/* Search Bar and Inflow/Outflow Filter Pills */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-1">
            <div className="relative w-full sm:w-80">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder={
                  language === 'bn'
                    ? 'কার কাছ থেকে রিসিভ, কে পেল, মেমো বা বিবরণ খুঁজুন...'
                    : 'Search payer, receiver, memo or note...'
                }
                className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 font-medium"
              />
              {searchTerm && (
                <button
                  type="button"
                  onClick={() => setSearchTerm('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white text-xs"
                >
                  ✕
                </button>
              )}
            </div>

            <div className="flex items-center gap-1.5 self-start sm:self-auto flex-wrap">
              <span className="text-[11px] text-slate-400 font-medium mr-1">ফিল্টার:</span>
              <button
                type="button"
                onClick={() => setTypeFilter('ALL')}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition cursor-pointer ${
                  typeFilter === 'ALL'
                    ? 'bg-slate-700 text-white font-bold'
                    : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
                }`}
              >
                সকল ({statementData.transactions.length})
              </button>
              <button
                type="button"
                onClick={() => setTypeFilter('INFLOW')}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition cursor-pointer ${
                  typeFilter === 'INFLOW'
                    ? 'bg-emerald-600 text-white font-bold shadow-sm'
                    : 'bg-slate-900 text-emerald-400 hover:text-emerald-300 border border-emerald-900/40'
                }`}
              >
                জমা / ডেবিট (+)
              </button>
              <button
                type="button"
                onClick={() => setTypeFilter('OUTFLOW')}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition cursor-pointer ${
                  typeFilter === 'OUTFLOW'
                    ? 'bg-rose-600 text-white font-bold shadow-sm'
                    : 'bg-slate-900 text-rose-400 hover:text-rose-300 border border-rose-900/40'
                }`}
              >
                খরচ / ক্রেডিট (-)
              </button>
            </div>
          </div>

          {/* Interactive Statement Table */}
          <div className="rounded-2xl border border-slate-800 bg-slate-950/70 overflow-hidden shadow-inner">
            <div className="overflow-x-auto max-h-[420px]">
              <table className="w-full text-left border-collapse text-xs">
                <thead className="bg-slate-950 text-slate-300 text-[11px] font-bold uppercase tracking-wider sticky top-0 z-10 border-b border-slate-800">
                  <tr>
                    <th className="py-2.5 px-3 text-center w-10">#</th>
                    <th className="py-2.5 px-3 w-28">তারিখ ও সময়</th>
                    <th className="py-2.5 px-3">কার কাছ থেকে রিসিভ (Payer)</th>
                    <th className="py-2.5 px-3">কে পেল / কোথায় খরচ (Paid To / Receiver)</th>
                    <th className="py-2.5 px-3">বিবরণ ও মেমো/ভাউচার</th>
                    <th className="py-2.5 px-3 text-right text-emerald-400 w-28">ডেবিট / জমা (+)</th>
                    <th className="py-2.5 px-3 text-right text-rose-400 w-28">ক্রেডিট / খরচ (-)</th>
                    <th className="py-2.5 px-3 text-right text-amber-300 w-32">ড্রয়ার ব্যালেন্স</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-medium">
                  {/* Row 0: Opening balance row */}
                  <tr className="bg-slate-900/40 text-slate-400 italic">
                    <td className="py-2 px-3 text-center">-</td>
                    <td className="py-2 px-3 font-mono text-[10px]">{startDate || 'শুরু'}</td>
                    <td className="py-2 px-3" colSpan={3}>
                      <span className="font-semibold text-slate-300 not-italic">
                        {language === 'bn' ? 'পূর্ববর্তী স্থিতি (প্রারম্ভিক ক্যাশ জের)' : 'Opening Cash Balance'}
                      </span>
                    </td>
                    <td className="py-2 px-3 text-right font-mono-num">-</td>
                    <td className="py-2 px-3 text-right font-mono-num">-</td>
                    <td className="py-2 px-3 text-right font-black font-mono-num text-white not-italic">
                      {formatCurrency(statementData.openingBalance, language)}
                    </td>
                  </tr>

                  {filteredTransactions.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-12 text-center text-slate-500 text-xs">
                        {searchTerm
                          ? 'অনুসন্ধানের সাথে কোনো লেনদেন মেলেনি'
                          : 'নির্বাচিত সময়কালে কোনো ক্যাশ লেনদেন পাওয়া যায়নি'}
                      </td>
                    </tr>
                  ) : (
                    filteredTransactions.map((tx, idx) => {
                      const isInflow = tx.type === 'INFLOW';
                      return (
                        <tr
                          key={tx.id || idx}
                          className="hover:bg-slate-900/60 transition-colors group"
                        >
                          <td className="py-2.5 px-3 text-center text-slate-500 font-mono text-[10.5px]">
                            {idx + 1}
                          </td>
                          <td className="py-2.5 px-3 font-mono text-[11px] text-slate-400 whitespace-nowrap">
                            {tx.date ? tx.date.slice(0, 16).replace('T', ' ') : '-'}
                          </td>

                          {/* Payer (কার কাছ থেকে রিসিভ) */}
                          <td className="py-2.5 px-3">
                            {isInflow ? (
                              <div className="flex items-center gap-1.5">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0"></span>
                                <span className="font-bold text-emerald-300">
                                  {tx.payerName || 'গ্রাহক / বিক্রয় আদায়'}
                                </span>
                              </div>
                            ) : (
                              <span className="text-slate-400">
                                {tx.payerName || 'ক্যাশ ড্রয়ার'}
                              </span>
                            )}
                          </td>

                          {/* Receiver / Paid To (কে পেল / কোথায় খরচ) */}
                          <td className="py-2.5 px-3">
                            {!isInflow ? (
                              <div className="flex items-center gap-1.5">
                                <span className="w-1.5 h-1.5 rounded-full bg-rose-400 shrink-0"></span>
                                <span className="font-bold text-rose-300">
                                  {tx.receiverName || 'কোম্পানি / খরচ'}
                                </span>
                              </div>
                            ) : (
                              <span className="text-slate-300">
                                {tx.receiverName || statementData.custodianName}
                              </span>
                            )}
                          </td>

                          {/* Particulars & Reference */}
                          <td className="py-2.5 px-3 text-slate-300">
                            <div>{tx.particulars}</div>
                            {tx.referenceNo && (
                              <span className="text-[10px] text-slate-500 font-mono">
                                রেফ: {tx.referenceNo}
                              </span>
                            )}
                          </td>

                          {/* Debit / Inflow (+) */}
                          <td className="py-2.5 px-3 text-right font-black font-mono-num text-emerald-400 whitespace-nowrap">
                            {isInflow ? `+${formatCurrency(tx.amount, language)}` : '-'}
                          </td>

                          {/* Credit / Outflow (-) */}
                          <td className="py-2.5 px-3 text-right font-black font-mono-num text-rose-400 whitespace-nowrap">
                            {!isInflow ? `-${formatCurrency(tx.amount, language)}` : '-'}
                          </td>

                          {/* Running Balance */}
                          <td className="py-2.5 px-3 text-right font-black font-mono-num text-amber-300 whitespace-nowrap">
                            {formatCurrency(tx.balanceAfter ?? 0, language)}
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

        {/* Modal Footer */}
        <div className="px-4 sm:px-6 py-3.5 bg-slate-950 border-t border-slate-800 flex items-center justify-between gap-3 shrink-0 flex-wrap">
          <div className="text-xs text-slate-400 flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-emerald-400" />
            <span>
              মোট <strong>{filteredTransactions.length}</strong> টি লেনদেন তালিকাভুক্ত • সমাপনী ব্যালেন্স:{' '}
              <strong
                className={`font-mono-num ${
                  statementData.closingBalance < 0 ? 'text-rose-400' : 'text-emerald-400'
                }`}
              >
                {formatCurrency(statementData.closingBalance, language)}
              </strong>
            </span>
          </div>

          <div className="flex items-center gap-2 ml-auto">
            <button
              type="button"
              onClick={() => handlePdfAction('preview')}
              className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-emerald-300 border border-slate-700 rounded-xl text-xs font-bold flex items-center gap-1.5 transition cursor-pointer"
            >
              <Eye className="w-4 h-4" />
              <span>{language === 'bn' ? 'প্রিভিউ' : 'Preview'}</span>
            </button>
            <button
              type="button"
              onClick={() => handlePdfAction('download')}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition shadow-lg shadow-emerald-950/50 cursor-pointer"
            >
              <Download className="w-4 h-4" />
              <span>{language === 'bn' ? 'পিডিএফ ডাউনলোড' : 'Download PDF'}</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold transition cursor-pointer"
            >
              {language === 'bn' ? 'বন্ধ করুন' : 'Close'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
