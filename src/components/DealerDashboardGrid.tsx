import React, { useState, useMemo } from 'react';
import { useWholesale } from '../context/WholesaleContext';
import { translations, formatCurrency } from '../utils/translations';
import {
  ShoppingCart,
  ShoppingBag,
  Clock,
  TrendingUp,
  CreditCard,
  Building2,
  Users,
  Truck,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  RotateCcw,
  Search,
  CheckCircle2,
  DollarSign,
  Calendar,
  Layers,
  ArrowUpRight,
  Sparkles
} from 'lucide-react';

interface DealerDashboardGridProps {
  onNavigateTab: (tab: string) => void;
  onOpenScanner?: () => void;
}

// Helpers to check date matching for Today and This Month
const isOrderToday = (dateStr?: string): boolean => {
  if (!dateStr) return false;
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return false;
  const now = new Date();
  return (
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate()
  );
};

const isOrderThisMonth = (dateStr?: string): boolean => {
  if (!dateStr) return false;
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return false;
  const now = new Date();
  return (
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth()
  );
};

export const DealerDashboardGrid: React.FC<DealerDashboardGridProps> = ({
  onNavigateTab,
  onOpenScanner,
}) => {
  const {
    language,
    orders,
    products,
    retailers,
    suppliers,
    supplierLedger,
    replacements,
    cashTransfers,
    totalLiquidCash,
    totalReceivables,
    totalPayables,
    businessNetWorth,
    totalInventoryValuation,
    totalGrossPurchases,
    totalCompanyReplacementReturns,
  } = useWholesale();

  // Date Filter: 'today' | 'this_month' | 'all'
  const [dateFilter, setDateFilter] = useState<'today' | 'this_month' | 'all'>('today');
  const [expandedCard, setExpandedCard] = useState<string | null>(null);

  const toggleExpand = (cardId: string) => {
    setExpandedCard(prev => (prev === cardId ? null : cardId));
  };

  // 1. ALL TIME Calculations (Always static totals for the business)
  const allTimeSales = useMemo(() => orders.reduce((sum, o) => sum + (o.totalAmount || 0), 0), [orders]);
  const allTimePaidSales = useMemo(() => orders.reduce((sum, o) => sum + (o.paidAmount || 0), 0), [orders]);
  const allTimeDueSales = useMemo(() => orders.reduce((sum, o) => sum + (o.dueAmount || 0), 0), [orders]);
  const allTimeOrdersCount = orders.length;

  const totalPurchases = useMemo(() => {
    const fromLedger = (supplierLedger || [])
      .filter((e) => e.type === 'PURCHASE')
      .reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
    const fromSuppliers = suppliers.reduce((sum, s) => sum + (s.totalPurchases || 0), 0);
    return Math.max(fromLedger, fromSuppliers);
  }, [supplierLedger, suppliers]);

  const totalPaidPurchases = useMemo(() => {
    const fromLedger = (supplierLedger || [])
      .filter((e) => e.type === 'PAYMENT')
      .reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
    const fromSuppliers = suppliers.reduce((sum, s) => sum + (s.totalPaid || 0), 0);
    return Math.max(fromLedger, fromSuppliers);
  }, [supplierLedger, suppliers]);

  const totalSupplierPayable = useMemo(() => suppliers.reduce((sum, s) => sum + (s.outstandingPayable || 0), 0), [suppliers]);

  // 2. Filtered Orders based on the selected Date Filter
  const filteredOrders = useMemo(() => {
    if (dateFilter === 'today') {
      return orders.filter(o => isOrderToday(o.date));
    }
    if (dateFilter === 'this_month') {
      return orders.filter(o => isOrderThisMonth(o.date));
    }
    return orders;
  }, [orders, dateFilter]);

  // 3. Metric Calculations for the Selected Filter Period
  const periodSales = useMemo(() => filteredOrders.reduce((sum, o) => sum + (o.totalAmount || 0), 0), [filteredOrders]);
  const periodPaidSales = useMemo(() => filteredOrders.reduce((sum, o) => sum + (o.paidAmount || 0), 0), [filteredOrders]);
  const periodDueSales = useMemo(() => filteredOrders.reduce((sum, o) => sum + (o.dueAmount || 0), 0), [filteredOrders]);
  const periodOrdersCount = filteredOrders.length;

  // DSR vs Counter sales for the filtered period
  const dsrOrders = useMemo(() => 
    filteredOrders.filter(o => o.salesPersonRole === 'dsr' || o.creatorRole === 'dsr'),
    [filteredOrders]
  );
  const dsrSales = useMemo(() => dsrOrders.reduce((sum, o) => sum + (o.totalAmount || 0), 0), [dsrOrders]);
  const dsrCollection = useMemo(() => dsrOrders.reduce((sum, o) => sum + (o.paidAmount || 0), 0), [dsrOrders]);
  const dsrDue = useMemo(() => dsrOrders.reduce((sum, o) => sum + (o.dueAmount || 0), 0), [dsrOrders]);

  const customerCollection = periodPaidSales;
  const customerTotalDue = totalReceivables;

  const totalDamageCost = useMemo(() => 
    replacements.reduce((sum, r) => sum + (r.estimatedValue || r.totalAdjustmentValue || 0), 0),
    [replacements]
  );

  const periodProfit = Math.max(0, periodSales * 0.16); // 16% margin estimator
  const allTimeProfit = Math.max(0, allTimeSales * 0.16);

  // Period label title
  const getPeriodTitle = (metric: string) => {
    if (language === 'bn') {
      if (dateFilter === 'today') return `আজকের ${metric}`;
      if (dateFilter === 'this_month') return `চলতি মাসের ${metric}`;
      return `মোট ${metric} (অল-টাইম)`;
    } else {
      if (dateFilter === 'today') return `Today's ${metric}`;
      if (dateFilter === 'this_month') return `This Month's ${metric}`;
      return `All-Time ${metric}`;
    }
  };

  // Cards Configuration
  const cards = [
    {
      id: 'total_sales',
      title: getPeriodTitle(language === 'bn' ? 'বিক্রয়' : 'Sales'),
      amount: periodSales,
      icon: <ShoppingCart className="w-5 h-5 text-sky-400" />,
      iconBg: 'bg-sky-500/20 text-sky-400 border-sky-500/30',
      actionTab: 'pos',
      badge: dateFilter === 'today' ? (language === 'bn' ? 'আজকের' : 'Today') : dateFilter === 'this_month' ? (language === 'bn' ? 'চলতি মাস' : 'This Month') : (language === 'bn' ? 'অল-টাইম' : 'All Time'),
      details: [
        { label: language === 'bn' ? 'নগদ বিক্রয়' : 'Cash Sales', value: formatCurrency(periodPaidSales, language) },
        { label: language === 'bn' ? 'বাকি বিক্রয়' : 'Credit Sales', value: formatCurrency(periodDueSales, language) },
        { label: language === 'bn' ? 'নির্বাচিত মেমো সংখ্যা' : 'Selected Invoices', value: `${periodOrdersCount} টি` },
        { label: language === 'bn' ? 'অল-টাইম মোট বিক্রয়' : 'All-Time Total Sales', value: `${formatCurrency(allTimeSales, language)} (${allTimeOrdersCount} টি)` },
      ]
    },
    {
      id: 'total_purchases',
      title: language === 'bn' ? 'মোট ক্রয় ও সরবরাহ' : 'Total Purchases',
      amount: totalPurchases,
      icon: <ShoppingBag className="w-5 h-5 text-emerald-400" />,
      iconBg: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
      actionTab: 'suppliers',
      details: [
        { label: language === 'bn' ? '১. মোট ক্রয় (+)' : '1. Gross Purchases (+)', value: formatCurrency(totalGrossPurchases, language) },
        { label: language === 'bn' ? '২. কোম্পানি ফেরত (-)' : '2. Returns/Replacements (-)', value: `-${formatCurrency(totalCompanyReplacementReturns, language)}` },
        { label: language === 'bn' ? '৩. ক্যাশ পরিশোধ (-)' : '3. Cash Paid (-)', value: `-${formatCurrency(totalPaidPurchases, language)}` },
        { label: language === 'bn' ? '৪. বর্তমান মোট ডিউ' : '4. Current Due Payable', value: formatCurrency(totalSupplierPayable, language) },
      ]
    },
    {
      id: 'total_dues',
      title: language === 'bn' ? 'মোট বকেয়া (মার্কেট বাকি)' : 'Total Market Dues',
      amount: customerTotalDue,
      icon: <Clock className="w-5 h-5 text-amber-400" />,
      iconBg: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
      actionTab: 'pos',
      details: [
        { label: language === 'bn' ? 'রিটেইলার বকেয়া' : 'Retailers Due', value: formatCurrency(customerTotalDue, language) },
        { label: language === 'bn' ? 'বাকি থাকা রিটেইলার' : 'Due Customers', value: `${retailers.filter(r => (r.outstandingDue || r.currentDue || 0) > 0).length} জন` },
      ]
    },
    {
      id: 'net_profit',
      title: getPeriodTitle(language === 'bn' ? 'অনুমিত নিট লাভ' : 'Net Profit'),
      amount: periodProfit,
      icon: <TrendingUp className="w-5 h-5 text-purple-400" />,
      iconBg: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
      actionTab: 'capital',
      details: [
        { label: language === 'bn' ? 'চলতি মেয়াদের মার্জিন' : 'Period Margin', value: '15% ~ 18%' },
        { label: language === 'bn' ? 'অল-টাইম অনুমিত মোট লাভ' : 'All-Time Profit', value: formatCurrency(allTimeProfit, language) },
        { label: language === 'bn' ? 'মোট ব্যবসার নিট সম্পদ' : 'Net Worth', value: formatCurrency(businessNetWorth, language) },
      ]
    },
    {
      id: 'total_collection',
      title: getPeriodTitle(language === 'bn' ? 'নগদ আদায়' : 'Collection'),
      amount: customerCollection,
      icon: <DollarSign className="w-5 h-5 text-teal-400" />,
      iconBg: 'bg-teal-500/20 text-teal-400 border-teal-500/30',
      actionTab: 'transfers',
      details: [
        { label: language === 'bn' ? 'কাউন্টার নগদ আদায়' : 'Counter Cash', value: formatCurrency(customerCollection - dsrCollection, language) },
        { label: language === 'bn' ? 'ডিএসআর আদায়' : 'DSR Collection', value: formatCurrency(dsrCollection, language) },
        { label: language === 'bn' ? 'অল-টাইম মোট আদায়' : 'All-Time Collection', value: formatCurrency(allTimePaidSales, language) },
      ]
    },
    {
      id: 'total_payment',
      title: language === 'bn' ? 'কোম্পানি পেমেন্ট' : 'Supplier Payments',
      amount: totalPaidPurchases,
      icon: <CreditCard className="w-5 h-5 text-rose-400" />,
      iconBg: 'bg-rose-500/20 text-rose-400 border-rose-500/30',
      actionTab: 'suppliers',
      details: [
        { label: language === 'bn' ? 'কোম্পানি চালান পরিশোধ' : 'Supplier Paid', value: formatCurrency(totalPaidPurchases, language) },
        { label: language === 'bn' ? 'বকেয়া দায়' : 'Remaining Payable', value: formatCurrency(totalSupplierPayable, language) },
      ]
    },
    {
      id: 'customer_collection',
      title: getPeriodTitle(language === 'bn' ? 'গ্রাহক ক্যাশ' : 'Customer Cash'),
      amount: customerCollection,
      icon: <Users className="w-5 h-5 text-emerald-400" />,
      iconBg: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
      actionTab: 'pos',
      details: [
        { label: language === 'bn' ? 'মেমোর সাথে নগদ আদায়' : 'Instant Cash', value: formatCurrency(customerCollection, language) },
        { label: language === 'bn' ? 'ডিএসআর ক্যাশ' : 'DSR Cash', value: formatCurrency(dsrCollection, language) },
      ]
    },
    {
      id: 'dsr_collection',
      title: getPeriodTitle(language === 'bn' ? 'ডিএসআর সেলস' : 'DSR Sales'),
      amount: dsrSales,
      icon: <Truck className="w-5 h-5 text-sky-400" />,
      iconBg: 'bg-sky-500/20 text-sky-400 border-sky-500/30',
      actionTab: 'transfers',
      details: [
        { label: language === 'bn' ? 'ডিএসআর মেমো সংখ্যা' : 'DSR Memos', value: `${dsrOrders.length} টি` },
        { label: language === 'bn' ? 'ডিএসআর নগদ আদায়' : 'DSR Cash Collected', value: formatCurrency(dsrCollection, language) },
        { label: language === 'bn' ? 'ডিএসআর বকেয়া' : 'DSR Due', value: formatCurrency(dsrDue, language) },
      ]
    },
    {
      id: 'damage_total',
      title: language === 'bn' ? 'মোট ড্যামেজ ও ক্লেইম' : 'Total Damage Claims',
      amount: totalDamageCost,
      icon: <AlertTriangle className="w-5 h-5 text-amber-500" />,
      iconBg: 'bg-amber-500/20 text-amber-500 border-amber-500/30',
      actionTab: 'replacements',
      details: [
        { label: language === 'bn' ? 'অপেক্ষমান দাবি' : 'Pending Claims', value: `${replacements.length} টি` },
      ]
    },
    {
      id: 'customer_dues',
      title: language === 'bn' ? 'মোট রিটেইলার বাকি' : 'Retailer Dues',
      amount: customerTotalDue,
      icon: <Users className="w-5 h-5 text-rose-500" />,
      iconBg: 'bg-rose-500/20 text-rose-500 border-rose-500/30',
      actionTab: 'pos',
      details: [
        { label: language === 'bn' ? 'মোট রিটেইলার বাকি' : 'Total Retailer Due', value: formatCurrency(customerTotalDue, language) },
      ]
    },
    {
      id: 'dsr_due',
      title: getPeriodTitle(language === 'bn' ? 'ডিএসআর বাকি' : 'DSR Due'),
      amount: dsrDue,
      icon: <Truck className="w-5 h-5 text-amber-400" />,
      iconBg: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
      actionTab: 'pos',
      details: [
        { label: language === 'bn' ? 'ডিএসআর মেমোর বাকি' : 'Field Memos Due', value: formatCurrency(dsrDue, language) },
      ]
    },
    {
      id: 'supplier_payable',
      title: language === 'bn' ? 'কোম্পানি পাওনা' : 'Supplier Payable',
      amount: totalSupplierPayable,
      icon: <Building2 className="w-5 h-5 text-sky-400" />,
      iconBg: 'bg-sky-500/20 text-sky-400 border-sky-500/30',
      actionTab: 'suppliers',
      details: [
        { label: language === 'bn' ? 'কোম্পানিকে পরিশোধ বাকি' : 'Pending Bills', value: formatCurrency(totalSupplierPayable, language) },
      ]
    }
  ];

  return (
    <div className="space-y-4 font-sans">
      
      {/* 1. MASTER ALL-TIME TOTAL BUSINESS METRICS BANNER (Always Visible Totals) */}
      <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-slate-950 via-slate-900 to-indigo-950/70 border-2 border-sky-500/40 shadow-xl relative overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-sky-500 to-emerald-500 flex items-center justify-center shadow-lg shadow-sky-900/40 text-white font-bold">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-black text-white tracking-tight">
                  {language === 'bn' ? '🌟 ড্যাশবোর্ড অল-টাইম টোটাল হিসাব' : '🌟 All-Time Total Dashboard Summary'}
                </h2>
                <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-[10px] font-bold">
                  {language === 'bn' ? 'স্থায়ী মূল হিসাব' : 'Always Active'}
                </span>
              </div>
              <p className="text-xs text-slate-400">
                {language === 'bn' 
                  ? 'ফিল্টার নির্বিশেষে ব্যবসার সর্বমোট লাইফটাইম হিসাব সবসময় এখানে প্রদর্শিত থাকবে' 
                  : 'Lifetime total metrics of your business are always preserved here'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => onNavigateTab('pos')}
              className="px-3 py-1.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold transition flex items-center gap-1.5 shadow"
            >
              <ShoppingCart className="w-3.5 h-3.5" />
              <span>{language === 'bn' ? 'নতুন মেমো / সেল' : 'New Sale'}</span>
            </button>
          </div>
        </div>

        {/* 4 Essential All-Time Metric Columns */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-3.5">
          <div className="p-3 rounded-xl bg-slate-900/90 border border-sky-500/30">
            <span className="text-[11px] font-bold text-sky-400 flex items-center gap-1">
              <ShoppingCart className="w-3.5 h-3.5" />
              <span>{language === 'bn' ? 'সর্বমোট অল-টাইম সেল' : 'All-Time Total Sales'}</span>
            </span>
            <div className="text-lg sm:text-2xl font-black text-white font-mono-num mt-1">
              {formatCurrency(allTimeSales, language)}
            </div>
            <span className="text-[10px] text-slate-400 block mt-0.5">
              {language === 'bn' ? `মোট চালান: ${allTimeOrdersCount} টি` : `Total ${allTimeOrdersCount} Invoices`}
            </span>
          </div>

          <div className="p-3 rounded-xl bg-slate-900/90 border border-emerald-500/30">
            <span className="text-[11px] font-bold text-emerald-400 flex items-center gap-1">
              <DollarSign className="w-3.5 h-3.5" />
              <span>{language === 'bn' ? 'অল-টাইম নগদ বিক্রয়' : 'All-Time Cash Sales'}</span>
            </span>
            <div className="text-lg sm:text-2xl font-black text-emerald-300 font-mono-num mt-1">
              {formatCurrency(allTimePaidSales, language)}
            </div>
            <span className="text-[10px] text-slate-400 block mt-0.5">
              {language === 'bn' ? `নগদ আদায় সম্পন্ন` : `Collected Cash`}
            </span>
          </div>

          <div className="p-3 rounded-xl bg-slate-900/90 border border-amber-500/30">
            <span className="text-[11px] font-bold text-amber-400 flex items-center gap-1">
              <Clock className="w-3.5 h-3.5" />
              <span>{language === 'bn' ? 'মোট মার্কেট বাকি' : 'Total Market Dues'}</span>
            </span>
            <div className="text-lg sm:text-2xl font-black text-amber-300 font-mono-num mt-1">
              {formatCurrency(totalReceivables, language)}
            </div>
            <span className="text-[10px] text-slate-400 block mt-0.5">
              {language === 'bn' ? `রিটেইলার বকেয়া` : `Customer Receivables`}
            </span>
          </div>

          <div className="p-3 rounded-xl bg-slate-900/90 border border-purple-500/30">
            <span className="text-[11px] font-bold text-purple-400 flex items-center gap-1">
              <TrendingUp className="w-3.5 h-3.5" />
              <span>{language === 'bn' ? 'মোট ব্যবসার নিট সম্পদ' : 'Business Net Worth'}</span>
            </span>
            <div className="text-lg sm:text-2xl font-black text-purple-300 font-mono-num mt-1">
              {formatCurrency(businessNetWorth, language)}
            </div>
            <span className="text-[10px] text-slate-400 block mt-0.5">
              {language === 'bn' ? `মূলধন, স্টক ও ক্যাশ` : `Stock, Cash & Capital`}
            </span>
          </div>
        </div>
      </div>

      {/* 2. TOP FILTER BAR with DROPDOWN & PILL BUTTONS (Top Period Switcher) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#0d1424] p-3.5 sm:p-4 rounded-2xl border border-slate-800 shadow-md">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-xl bg-sky-500/20 text-sky-400 border border-sky-500/30">
            <Calendar className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-black text-white flex items-center gap-1.5">
              <span>{language === 'bn' ? 'সেলস সময়কাল ও ড্যাশবোর্ড ফিল্টার' : 'Sales Period & Dashboard Filter'}</span>
            </h3>
            <p className="text-[11px] text-slate-400">
              {language === 'bn'
                ? `বর্তমানে প্রদর্শিত: ${dateFilter === 'today' ? 'আজকের হিসাব' : dateFilter === 'this_month' ? 'চলতি মাসের হিসাব' : 'সর্বমোট অল-টাইম হিসাব'}`
                : `Active: ${dateFilter === 'today' ? "Today's Sales" : dateFilter === 'this_month' ? "This Month's Sales" : 'All-Time Sales'}`}
            </p>
          </div>
        </div>

        {/* Interactive Period Switcher: Dropdown + Quick Pills */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Quick Pill Buttons */}
          <div className="inline-flex rounded-xl bg-slate-950 p-1 border border-slate-800 text-xs">
            <button
              type="button"
              onClick={() => setDateFilter('today')}
              className={`px-3 py-1.5 rounded-lg font-bold transition flex items-center gap-1 ${
                dateFilter === 'today'
                  ? 'bg-sky-600 text-white shadow'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <span>{language === 'bn' ? 'আজকের সেল' : "Today's Sale"}</span>
            </button>
            <button
              type="button"
              onClick={() => setDateFilter('this_month')}
              className={`px-3 py-1.5 rounded-lg font-bold transition flex items-center gap-1 ${
                dateFilter === 'this_month'
                  ? 'bg-sky-600 text-white shadow'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <span>{language === 'bn' ? 'চলতি মাস' : 'This Month'}</span>
            </button>
            <button
              type="button"
              onClick={() => setDateFilter('all')}
              className={`px-3 py-1.5 rounded-lg font-bold transition flex items-center gap-1 ${
                dateFilter === 'all'
                  ? 'bg-indigo-600 text-white shadow'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <span>{language === 'bn' ? 'সর্বমোট (All Time)' : 'All Time'}</span>
            </button>
          </div>

          {/* Direct Dropdown as specifically requested */}
          <select
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value as any)}
            className="px-3 py-2 rounded-xl bg-slate-900 border border-sky-500/50 text-xs font-bold text-sky-300 focus:outline-none focus:ring-1 focus:ring-sky-500 cursor-pointer shadow-sm"
          >
            <option value="today">📅 {language === 'bn' ? 'আজকের সেল (Today)' : "Today's Sales"}</option>
            <option value="this_month">📅 {language === 'bn' ? 'চলতি মাসের সেল (This Month)' : "This Month's Sales"}</option>
            <option value="all">🌐 {language === 'bn' ? 'সর্বমোট অল-টাইম সেল (All Time)' : 'All Time Total Sales'}</option>
          </select>

          {/* Reset button */}
          <button
            onClick={() => setDateFilter('today')}
            className="p-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-300 hover:text-white transition"
            title="Reset filter to Today"
          >
            <RotateCcw className="w-3.5 h-3.5 text-sky-400" />
          </button>
        </div>
      </div>

      {/* 3. RESPONSIVE CARD GRID (Updates instantly according to selected period) */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
        {cards.map((card) => {
          const isExpanded = expandedCard === card.id;

          return (
            <div
              key={card.id}
              className="p-4 rounded-2xl bg-[#0f172a] border border-slate-800/90 hover:border-slate-700 flex flex-col justify-between gap-3 shadow-md transition group"
            >
              <div className="flex items-center justify-between">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center border shadow-sm ${card.iconBg}`}>
                  {card.icon}
                </div>
                {card.badge && (
                  <span className="px-2 py-0.5 rounded-md bg-sky-500/20 text-sky-300 border border-sky-500/30 text-[10px] font-bold">
                    {card.badge}
                  </span>
                )}
              </div>

              <div>
                <span className="text-xl sm:text-2xl font-black text-white font-mono-num block tracking-tight">
                  {formatCurrency(card.amount, language)}
                </span>
                <span className="text-xs font-medium text-slate-300 block mt-0.5">
                  {card.title}
                </span>
              </div>

              {/* Accordion Trigger */}
              <div className="border-t border-slate-800/80 pt-2">
                <button
                  type="button"
                  onClick={() => toggleExpand(card.id)}
                  className="w-full flex items-center justify-between text-[11px] text-slate-400 hover:text-white transition py-0.5 cursor-pointer"
                >
                  <span>{language === 'bn' ? 'বিস্তারিত হিসাব' : 'Details'}</span>
                  {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                </button>

                {isExpanded && (
                  <div className="mt-2 pt-2 border-t border-slate-800 space-y-1.5 text-[10px] text-slate-300 animate-in fade-in duration-150">
                    {card.details.map((d, i) => (
                      <div key={i} className="flex justify-between items-center gap-1">
                        <span className="text-slate-400">{d.label}:</span>
                        <span className="font-bold font-mono-num text-white text-right">{d.value}</span>
                      </div>
                    ))}
                    <button
                      onClick={() => onNavigateTab(card.actionTab)}
                      className="w-full mt-1.5 py-1 px-2 bg-slate-800 hover:bg-slate-700 text-sky-400 hover:text-sky-300 rounded text-[10px] font-bold text-center transition cursor-pointer"
                    >
                      {language === 'bn' ? 'পৃষ্ঠা দেখুন →' : 'View Page →'}
                    </button>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* 4. BOTTOM FILTER BAR with DROPDOWN ("top bottom এখান থেকে ড্রপ ডাউন করে আজকের সেল এবং মাসের সেল দেখতে পারবো") */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#0d1424] p-3.5 sm:p-4 rounded-2xl border border-slate-800 shadow-md">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-xl bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
            <Layers className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-white">
                {language === 'bn' ? 'নিচ থেকেও ফিল্টার পরিবর্তন করুন:' : 'Change Filter from Bottom:'}
              </span>
              <span className="px-2 py-0.5 rounded-full bg-slate-800 text-[10px] font-mono text-emerald-400 font-bold">
                {language === 'bn' ? 'নির্বাচিত সেল: ' : 'Period Sales: '} {formatCurrency(periodSales, language)}
              </span>
            </div>
            <p className="text-[10px] text-slate-400">
              {language === 'bn'
                ? `সর্বমোট অল-টাইম সেল: ${formatCurrency(allTimeSales, language)} (${allTimeOrdersCount} টি ইনভয়েস)`
                : `All-Time Total: ${formatCurrency(allTimeSales, language)} (${allTimeOrdersCount} Invoices)`}
            </p>
          </div>
        </div>

        {/* Bottom Dropdown and Switcher */}
        <div className="flex items-center gap-2">
          <select
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value as any)}
            className="px-3 py-2 rounded-xl bg-slate-900 border border-indigo-500/50 text-xs font-bold text-indigo-300 focus:outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer shadow-sm"
          >
            <option value="today">📅 {language === 'bn' ? 'আজকের সেল (Today)' : "Today's Sales"}</option>
            <option value="this_month">📅 {language === 'bn' ? 'চলতি মাসের সেল (This Month)' : "This Month's Sales"}</option>
            <option value="all">🌐 {language === 'bn' ? 'সর্বমোট অল-টাইম সেল (All Time)' : 'All Time Total Sales'}</option>
          </select>

          <button
            onClick={() => setDateFilter('all')}
            className="px-3 py-2 rounded-xl bg-indigo-950/80 hover:bg-indigo-900 border border-indigo-500/40 text-indigo-300 hover:text-white text-xs font-bold transition flex items-center gap-1 cursor-pointer"
          >
            <span>{language === 'bn' ? 'অল-টাইম হিসাব' : 'All-Time Total'}</span>
          </button>
        </div>
      </div>

    </div>
  );
};
