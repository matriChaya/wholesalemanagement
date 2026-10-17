import React, { useState } from 'react';
import {
  FileText,
  X,
  Building2,
  Store,
  ShoppingCart,
  Package,
  Coins,
  PieChart,
  Eye,
  Download,
  Calendar,
  CheckCircle2,
  Sparkles,
  ArrowDownLeft,
  ArrowUpRight,
  Wallet,
  Landmark,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Layers,
  ShieldCheck,
  Users,
  Check,
  ListFilter,
  TrendingUp,
  TrendingDown,
  Percent,
} from 'lucide-react';
import { useWholesale } from '../context/WholesaleContext';
import { formatCurrency } from '../utils/translations';
import {
  PdfDocumentResult,
  generateSupplierLedgerPdf,
  generateAllSuppliersSummaryPdf,
  generateRetailerStatementPdf,
  generateAllRetailersSummaryPdf,
  generateInvoiceMemoPdf,
  generateDailySalesStatementPdf,
  generateSalesProfitStatementPdf,
  generateCashTransfersPdf,
  generateStockStatementPdf,
  generateCapitalStatementPdf,
  generateCashValidationStatementPdf,
  generateBankStatementPdf,
  generateCashDrawerStatementPdf,
} from '../utils/pdfExport';
import { DateRangeFilter } from '../utils/pdfHtmlTemplates';

export type StatementKey =
  | 'CASH_VALIDATION'
  | 'SALES_PROFIT_STATEMENT'
  | 'BANK_STATEMENT'
  | 'CASH_DRAWER_ADMIN'
  | 'CASH_DRAWER_COUNTER'
  | 'CASH_DRAWER_DSR'
  | 'RETAILER_STATEMENT'
  | 'SUPPLIER_STATEMENT'
  | 'SALES_STATEMENT'
  | 'STOCK_STATEMENT'
  | 'CASH_TRANSFER'
  | 'CAPITAL_STATEMENT'
  | 'ALL';

export type StatementCategoryKey = 'ALL' | 'CASH_BANK' | 'PARTIES' | 'SALES_STOCK' | 'CAPITAL';

export interface StatementItemConfig {
  id: StatementKey;
  category: StatementCategoryKey;
  titleBn: string;
  titleEn: string;
  shortTitleBn: string;
  badgeBn: string;
  badgeColor: string;
  icon: React.ComponentType<{ className?: string }>;
  iconBg: string;
  descriptionBn: string;
  descriptionEn: string;
}

export const STATEMENT_ITEMS: StatementItemConfig[] = [
  {
    id: 'SALES_PROFIT_STATEMENT',
    category: 'SALES_STOCK',
    titleBn: 'বিক্রয় ও নিট প্রফিট স্টেটমেন্ট (লাভ-লোকসান অডিট)',
    titleEn: 'Sales & Net Profit Statement',
    shortTitleBn: 'বিক্রয় প্রফিট',
    badgeBn: 'নিট লাভ অডিট',
    badgeColor: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
    icon: TrendingUp,
    iconBg: 'bg-emerald-500/20 text-emerald-400',
    descriptionBn: 'বিক্রয় মূল্য থেকে কেনা খরচ বাদ দিয়ে কত টাকা নিট লাভ আসলো তার সম্পূর্ণ বিবরণী',
    descriptionEn: 'Sales revenue, purchase cost, net realized profit and margin percentage',
  },
  {
    id: 'CASH_VALIDATION',
    category: 'CASH_BANK',
    titleBn: 'ক্যাশ ভ্যালিড স্টেটমেন্ট (প্লাস-মাইনাস ফিগার অডিট)',
    titleEn: 'Cash Validation Statement',
    shortTitleBn: 'ক্যাশ ভ্যালিডেশন',
    badgeBn: 'ক্যাশ অডিট',
    badgeColor: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
    icon: Sparkles,
    iconBg: 'bg-emerald-500/20 text-emerald-400',
    descriptionBn: 'কত টাকা পাওয়া গেছে (+), কোম্পানিকে কত পেমেন্ট হয়েছে (-), এবং বাজারে মোট কত পাবো (+)',
    descriptionEn: 'Cash inflows, company payments, and market dues reconciliation',
  },
  {
    id: 'BANK_STATEMENT',
    category: 'CASH_BANK',
    titleBn: 'স্টেট ব্যাংক ও ডিজিটাল একাউন্ট বিবরণী (তারিখ ভিত্তিক)',
    titleEn: 'Bank & MFS Account Statement',
    shortTitleBn: 'স্টেট ব্যাংক',
    badgeBn: 'তারিখ ভিত্তিক',
    badgeColor: 'bg-sky-500/20 text-sky-300 border-sky-500/40',
    icon: Landmark,
    iconBg: 'bg-sky-500/20 text-sky-400',
    descriptionBn: 'তারিখ সেট করে ব্যাংক জমা (ডিজিটাল বিক্রয় ও মূলধন) ও উত্তোলন/কোম্পানি পেমেন্ট বিস্তারিত',
    descriptionEn: 'Date-filtered bank inflows and outflows with Payer/Receiver details',
  },
  {
    id: 'CASH_DRAWER_ADMIN',
    category: 'CASH_BANK',
    titleBn: 'ক্যাশ ড্রয়ার: ১. এডমিন ক্যাশ ভল্ট স্টেটমেন্ট',
    titleEn: 'Admin Cash Vault Statement',
    shortTitleBn: 'এডমিন ভল্ট',
    badgeBn: 'ভল্ট ক্যাশ',
    badgeColor: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
    icon: ShieldCheck,
    iconBg: 'bg-amber-500/20 text-amber-400',
    descriptionBn: 'কাউন্টার ও ডিএসআর থেকে ভল্টে গ্রহণ, কোম্পানি চালান পেমেন্ট ও মূলধন উত্তোলন',
    descriptionEn: 'Transfers from staff, supplier payments, owner withdrawals & capital',
  },
  {
    id: 'CASH_DRAWER_COUNTER',
    category: 'CASH_BANK',
    titleBn: 'ক্যাশ ড্রয়ার: ২. ক্যাশ কাউন্টার ড্রয়ার স্টেটমেন্ট',
    titleEn: 'Cash Counter Drawer Statement',
    shortTitleBn: 'কাউন্টার ড্রয়ার',
    badgeBn: 'কাউন্টার ড্রয়ার',
    badgeColor: 'bg-teal-500/20 text-teal-300 border-teal-500/40',
    icon: Wallet,
    iconBg: 'bg-teal-500/20 text-teal-400',
    descriptionBn: 'কাউন্টার নগদ বিক্রয়, ডিএসআর থেকে ক্যাশ জমা এবং এডমিন ভল্টে হস্তান্তর',
    descriptionEn: 'POS cash sales, DSR handovers, and transfers to Admin Vault',
  },
  {
    id: 'CASH_DRAWER_DSR',
    category: 'CASH_BANK',
    titleBn: 'ক্যাশ ড্রয়ার: ৩. ডিএসআর ফিল্ড ক্যাশ স্টেটমেন্ট',
    titleEn: 'DSR Field Cash Statement',
    shortTitleBn: 'ডিএসআর ক্যাশ',
    badgeBn: 'ফিল্ড কালেকশন',
    badgeColor: 'bg-purple-500/20 text-purple-300 border-purple-500/40',
    icon: Users,
    iconBg: 'bg-purple-500/20 text-purple-400',
    descriptionBn: 'বাজারে দোকানদারদের নগদ পরিশোধ ও ডিএসআর কর্তৃক কাউন্টার/ভল্টে জমা',
    descriptionEn: 'Market collections from retailers and handovers to cashier/vault',
  },
  {
    id: 'RETAILER_STATEMENT',
    category: 'PARTIES',
    titleBn: 'কাস্টমার / রিটেইলার বাকি স্টেটমেন্ট',
    titleEn: 'Customer / Retailer Statement',
    shortTitleBn: 'কাস্টমার বাকি',
    badgeBn: 'দেনা-পাওনা',
    badgeColor: 'bg-pink-500/20 text-pink-300 border-pink-500/40',
    icon: Store,
    iconBg: 'bg-pink-500/20 text-pink-400',
    descriptionBn: 'সকল কাস্টমার মোট বাকি শিট অথবা নির্দিষ্ট দোকানের পূর্ণাঙ্গ খতিয়ান লেজার',
    descriptionEn: 'All customer dues summary or specific shop trading ledger',
  },
  {
    id: 'SUPPLIER_STATEMENT',
    category: 'PARTIES',
    titleBn: 'সাপ্লায়ার ও কোম্পানি দেনা স্টেটমেন্ট',
    titleEn: 'Supplier & Vendor Statement',
    shortTitleBn: 'সাপ্লায়ার হিসাব',
    badgeBn: 'কোম্পানি দেনা',
    badgeColor: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40',
    icon: Building2,
    iconBg: 'bg-indigo-500/20 text-indigo-400',
    descriptionBn: 'সকল সরবরাহকারীর মোট দেনা শিট ও নির্দিষ্ট কোম্পানির ক্রয়-পেমেন্ট চালান খতিয়ান',
    descriptionEn: 'Consolidated vendor payables and individual supplier ledger',
  },
  {
    id: 'SALES_STATEMENT',
    category: 'SALES_STOCK',
    titleBn: 'বিক্রয় চালান ও দৈনিক মেমো স্টেটমেন্ট',
    titleEn: 'Sales & Invoice Statement',
    shortTitleBn: 'বিক্রয় চালান',
    badgeBn: 'দৈনিক বিক্রয়',
    badgeColor: 'bg-blue-500/20 text-blue-300 border-blue-500/40',
    icon: ShoppingCart,
    iconBg: 'bg-blue-500/20 text-blue-400',
    descriptionBn: 'আজকের বিক্রয় মেমো রেজিস্টার অথবা নির্দিষ্ট বিক্রয় চালানের অফিশিয়াল কপি',
    descriptionEn: 'Daily sales invoices log and single invoice memo voucher',
  },
  {
    id: 'STOCK_STATEMENT',
    category: 'SALES_STOCK',
    titleBn: 'গোডাউন স্টক ও ইনভেন্টরি স্টেটমেন্ট',
    titleEn: 'Warehouse Stock Statement',
    shortTitleBn: 'গোডাউন স্টক',
    badgeBn: 'স্টক ভ্যালুয়েশন',
    badgeColor: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
    icon: Package,
    iconBg: 'bg-amber-500/20 text-amber-400',
    descriptionBn: 'বর্তমান গোডাউন পণ্য মজুদ, কেনা রেট ও মোট ইনভেন্টরি টাকার পরিমাণ',
    descriptionEn: 'Stock quantities, purchase valuations, and warehouse assets',
  },
  {
    id: 'CASH_TRANSFER',
    category: 'CASH_BANK',
    titleBn: 'ক্যাশ ট্রান্সফার ও হস্তান্তর অডিট শিট',
    titleEn: 'Cash Transfer Audit Log',
    shortTitleBn: 'ক্যাশ ট্রান্সফার',
    badgeBn: 'হস্তান্তর অডিট',
    badgeColor: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40',
    icon: Coins,
    iconBg: 'bg-cyan-500/20 text-cyan-400',
    descriptionBn: 'ডিএসআর ➔ কাউন্টার ➔ এডমিন ভল্ট আন্তঃক্যাশ লেনদেনের ভেরিফাইড লগ',
    descriptionEn: 'Internal cash transfer logs between DSR, counter, and vault',
  },
  {
    id: 'CAPITAL_STATEMENT',
    category: 'CAPITAL',
    titleBn: 'মূলধন ও ব্যবসায়িক সম্পদ ব্যালেন্স শিট',
    titleEn: 'Capital & Net Worth Balance Sheet',
    shortTitleBn: 'মূলধন শিট',
    badgeBn: 'ব্যবসায়িক সম্পদ',
    badgeColor: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
    icon: PieChart,
    iconBg: 'bg-emerald-500/20 text-emerald-400',
    descriptionBn: 'মোট মূলধন বিনিয়োগ, নগদ অর্থ, গোডাউন স্টক ও নিখুঁত ব্যবসায়িক সম্পদ বিবরণী',
    descriptionEn: 'Owner capital investments, cash liquidity, and total business net worth',
  },
];

export interface AllStatementsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPreviewPdf: (pdfResult: PdfDocumentResult) => void;
  onOpenCashDrawerStatement?: (role: 'admin' | 'counter' | 'dsr') => void;
}

export const AllStatementsModal: React.FC<AllStatementsModalProps> = ({
  isOpen,
  onClose,
  onPreviewPdf,
  onOpenCashDrawerStatement,
}) => {
  const {
    language,
    suppliers,
    supplierLedger,
    retailers,
    orders,
    products,
    cashTransfers,
    capitalTransactions,
    users,
    cashAdmin,
    cashCounter,
    cashDSR,
    cashBank,
    bankAccounts,
    adminCashBalance,
    counterCashBalance,
    dsrCashBalance,
    bankCashBalance,
    totalInventoryValuation,
    totalReceivables,
    totalPayables,
    expenses,
    businessProfile,
    openBusinessProfile,
  } = useWholesale();

  const adminCash = typeof cashAdmin === 'number' ? cashAdmin : (adminCashBalance || 0);
  const counterCash = typeof cashCounter === 'number' ? cashCounter : (counterCashBalance || 0);
  const dsrCash = typeof cashDSR === 'number' ? cashDSR : (dsrCashBalance || 0);
  const bankCash = typeof cashBank === 'number' ? cashBank : (bankCashBalance || 0);

  // Date Range Filter State
  const [datePreset, setDatePreset] = useState<'today' | 'this_month' | 'last_month' | 'all' | 'custom'>('this_month');
  const [startDate, setStartDate] = useState<string>(() => {
    const now = new Date();
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-01`;
  });
  const [endDate, setEndDate] = useState<string>(() => {
    const now = new Date();
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
  });

  // Bank Statement Account Selection
  const [selectedBankAccountId, setSelectedBankAccountId] = useState<string>('ALL');

  // DSR Staff Selection
  const dsrUsers = (users || []).filter((u) => u.role === 'dsr');
  const [selectedDsrId, setSelectedDsrId] = useState<string>('ALL');

  const [selectedSupplierId, setSelectedSupplierId] = useState<string>(
    suppliers[0]?.id || ''
  );
  const [selectedRetailerId, setSelectedRetailerId] = useState<string>(
    retailers[0]?.id || ''
  );
  const [selectedInvoiceId, setSelectedInvoiceId] = useState<string>(
    orders[0]?.id || ''
  );
  const [selectedStatementKey, setSelectedStatementKey] = useState<StatementKey>('ALL');
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  React.useEffect(() => {
    if ((!selectedSupplierId || !suppliers.some(s => s.id === selectedSupplierId)) && suppliers.length > 0) {
      setSelectedSupplierId(suppliers[0].id);
    }
  }, [suppliers, selectedSupplierId]);

  const curSupplier = suppliers.find((s) => s.id === selectedSupplierId) || suppliers[0];
  const curSupplierPurchases = curSupplier
    ? Math.max(
        curSupplier.totalPurchases || 0,
        (supplierLedger || [])
          .filter((e) => (e.supplierId === curSupplier.id || (e.supplierName && curSupplier.name && e.supplierName.trim().toLowerCase() === curSupplier.name.trim().toLowerCase()) || (e.supplierName && curSupplier.company && e.supplierName.trim().toLowerCase() === curSupplier.company.trim().toLowerCase())) && e.type === 'PURCHASE')
          .reduce((acc, e) => acc + (Number(e.amount) || 0), 0)
      )
    : 0;
  const curSupplierPaid = curSupplier
    ? Math.max(
        curSupplier.totalPaid || 0,
        (supplierLedger || [])
          .filter((e) => (e.supplierId === curSupplier.id || (e.supplierName && curSupplier.name && e.supplierName.trim().toLowerCase() === curSupplier.name.trim().toLowerCase()) || (e.supplierName && curSupplier.company && e.supplierName.trim().toLowerCase() === curSupplier.company.trim().toLowerCase())) && e.type === 'PAYMENT')
          .reduce((acc, e) => acc + (Number(e.amount) || 0), 0)
      )
    : 0;
  const curSupplierReturns = curSupplier
    ? (supplierLedger || [])
        .filter((e) => (e.supplierId === curSupplier.id || (e.supplierName && curSupplier.name && e.supplierName.trim().toLowerCase() === curSupplier.name.trim().toLowerCase()) || (e.supplierName && curSupplier.company && e.supplierName.trim().toLowerCase() === curSupplier.company.trim().toLowerCase())) && (e.type === 'RETURN_ADJUSTMENT' || e.type === 'DISCOUNT_CREDIT'))
        .reduce((acc, e) => acc + (Number(e.amount) || 0), 0)
    : 0;

  if (!isOpen) return null;

  const showNotification = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3500);
  };

  const getDateRangeFilter = (): DateRangeFilter => {
    let label = '';
    if (datePreset === 'today') {
      label = `আজকের দিন (${startDate})`;
    } else if (datePreset === 'this_month') {
      label = `চলতি মাস (${startDate} হতে ${endDate})`;
    } else if (datePreset === 'last_month') {
      label = `গত মাস (${startDate} হতে ${endDate})`;
    } else if (datePreset === 'all') {
      label = 'শুরু থেকে আজ পর্যন্ত (সকল সময়)';
    } else {
      label = `${startDate || 'শুরু'} হতে ${endDate || 'আজ পর্যন্ত'}`;
    }
    return {
      startDate: datePreset === 'all' ? undefined : (startDate || undefined),
      endDate: datePreset === 'all' ? undefined : (endDate || undefined),
      label,
    };
  };

  const applyPreset = (preset: 'today' | 'this_month' | 'last_month' | 'all') => {
    setDatePreset(preset);
    const now = new Date();
    const pad = (n: number) => String(n).padStart(2, '0');
    const todayStr = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;

    if (preset === 'today') {
      setStartDate(todayStr);
      setEndDate(todayStr);
    } else if (preset === 'this_month') {
      setStartDate(`${now.getFullYear()}-${pad(now.getMonth() + 1)}-01`);
      setEndDate(todayStr);
    } else if (preset === 'last_month') {
      const firstOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const lastOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);
      setStartDate(`${firstOfLastMonth.getFullYear()}-${pad(firstOfLastMonth.getMonth() + 1)}-01`);
      setEndDate(`${lastOfLastMonth.getFullYear()}-${pad(lastOfLastMonth.getMonth() + 1)}-${pad(lastOfLastMonth.getDate())}`);
    } else if (preset === 'all') {
      setStartDate('');
      setEndDate(todayStr);
    }
  };

  // Profit Calculation Metrics for Real-time Dashboard in Modal
  const calculateProfitMetrics = (targetOrders: any[], targetExpenses: any[] = []) => {
    let totalSalesAmt = 0;
    let totalCostAmt = 0;
    let totalGrossProfitAmt = 0;

    targetOrders.forEach((o) => {
      const netSale = Number(o.totalAmount) || 0;
      totalSalesAmt += netSale;

      let saleGross = 0;
      let repGross = 0;
      let saleCost = 0;
      let repCost = 0;

      (o.items || []).forEach((it: any) => {
        const isRep = it.itemType === 'REPLACEMENT' || it.isReplacement === true || Number(it.quantity) < 0 || (it.total && Number(it.total) < 0);
        const qty = it.quantity !== undefined && !isNaN(Number(it.quantity)) ? Math.abs(Number(it.quantity)) : 0;
        const unitPrice = Number(it.unitPrice || it.price || 0);
        let unitCost = Number(it.costPrice) || 0;
        if (!unitCost || unitCost <= 0) {
          const p = products.find(
            (prod) => prod.id === it.productId || prod.name.toLowerCase() === (it.productName || it.name || '').toLowerCase()
          );
          unitCost = p?.costPrice || (unitPrice > 0 ? Math.round(unitPrice * 0.85) : 0);
        }
        if (isRep) {
          repGross += (qty * unitPrice);
          repCost += (qty * unitCost);
        } else {
          saleGross += (qty * unitPrice);
          saleCost += (qty * unitCost);
        }
      });

      // User formula: "মার্কেট রিফ্লেক্স পণ্য থেকে মুনাফাটাও মাইনাস হবে কারণ পন্য ফেরত আসার সাথে সাথে ওই পণ্য থেকে মুনাফাটাও টাকা কমে গেছে, তাই ইনভয়সে বিক্রির মুনাফা থেকে রিপ্নালেস মুনাফা মাইনাস হয়ে নীপা মুনাফা দেখাবে"
      const saleProfit = Math.max(0, saleGross - saleCost);
      const repProfit = Math.max(0, repGross - repCost);
      const memoDiff = Number(o.priceDifference) || 0;
      const memoDisc = Number(o.discount) || 0;
      const orderNetProfit = Math.max(0, saleProfit - repProfit - memoDisc + memoDiff);
      const orderNetCost = Math.max(0, netSale - orderNetProfit);

      totalGrossProfitAmt += orderNetProfit;
      totalCostAmt += orderNetCost;
    });

    const totalExpenseAmt = targetExpenses.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
    // User formula: "যা প্রফিট থেকে - হবে প্রফিট পর্যাপ্ত না থাকলে মাইনাস ফিগার শো করবে"
    const netProfitAmt = totalGrossProfitAmt - totalExpenseAmt;
    const margin = totalSalesAmt > 0 ? ((netProfitAmt / totalSalesAmt) * 100).toFixed(1) : '0.0';

    return {
      sales: totalSalesAmt,
      cost: totalCostAmt,
      grossProfit: totalGrossProfitAmt,
      expenses: totalExpenseAmt,
      netProfit: netProfitAmt,
      margin,
      count: targetOrders.length,
      expenseCount: targetExpenses.length,
    };
  };

  const todayStr = new Date().toISOString().slice(0, 10);
  const todayOrders = orders.filter((o) => (o.date || o.createdAt || '').startsWith(todayStr));
  const todayExpenses = (expenses || []).filter((e) => (e.date || e.createdAt || '').startsWith(todayStr));
  const todayProfitData = calculateProfitMetrics(todayOrders, todayExpenses);

  const periodOrders = orders.filter((o) => {
    const d = (o.date || o.createdAt || '').slice(0, 10);
    if (startDate && endDate) return d >= startDate && d <= endDate;
    return true;
  });
  const periodExpenses = (expenses || []).filter((e) => {
    const d = (e.date || e.createdAt || '').slice(0, 10);
    if (startDate && endDate) return d >= startDate && d <= endDate;
    return true;
  });
  const periodProfitData = calculateProfitMetrics(periodOrders, periodExpenses);

  // 8. Bank Account Statement Handler (স্টেট ব্যাংক বিবরণী)
  const handleBankStatement = (action: 'preview' | 'download') => {
    const range = getDateRangeFilter();
    const res = generateBankStatementPdf({
      bankAccounts: bankAccounts || [],
      selectedAccountId: selectedBankAccountId,
      orders: orders || [],
      supplierLedger: supplierLedger || [],
      capitalTransactions: capitalTransactions || [],
      currentBankBalance: bankCash,
      dateRange: range,
      profile: businessProfile,
    });

    if (action === 'preview') {
      onPreviewPdf(res);
    } else {
      res.download();
      showNotification(language === 'bn' ? 'স্টেট ব্যাংক বিবরণী ডাউনলোড হয়েছে' : 'Bank statement PDF downloaded');
    }
  };

  // 9. Cash Drawer Role-Specific Statement Handlers (এডমিন, কাউন্টার ও ডিএসআর আলাদা স্টেটমেন্ট)
  const handleCashDrawerStatement = (
    role: 'admin' | 'counter' | 'dsr',
    action: 'preview' | 'download'
  ) => {
    const range = getDateRangeFilter();
    const targetDsrId = role === 'dsr' && selectedDsrId !== 'ALL' ? selectedDsrId : undefined;
    const balance = role === 'admin' ? adminCash : role === 'counter' ? counterCash : dsrCash;

    const res = generateCashDrawerStatementPdf({
      drawerRole: role,
      selectedUserId: targetDsrId,
      orders: orders || [],
      cashTransfers: cashTransfers || [],
      supplierLedger: supplierLedger || [],
      suppliers: suppliers || [],
      capitalTransactions: capitalTransactions || [],
      currentBalance: balance,
      users: users || [],
      expenses: expenses || [],
      dateRange: range,
      profile: businessProfile,
    });

    if (action === 'preview') {
      onPreviewPdf(res);
    } else {
      res.download();
      const roleName = role === 'admin' ? 'এডমিন ভল্ট' : role === 'counter' ? 'ক্যাশ কাউন্টার' : 'ডিএসআর ফিল্ড';
      showNotification(language === 'bn' ? `${roleName} ক্যাশ স্টেটমেন্ট ডাউনলোড হয়েছে` : `${roleName} cash statement PDF downloaded`);
    }
  };

  // 1. Supplier Handlers
  const handleAllSuppliers = (action: 'preview' | 'download') => {
    const res = generateAllSuppliersSummaryPdf(suppliers, businessProfile);
    if (action === 'preview') {
      onPreviewPdf(res);
    } else {
      res.download();
      showNotification(language === 'bn' ? 'সকল সরবরাহকারীর রিপোর্ট ডাউনলোড শুরু হয়েছে' : 'All suppliers summary PDF downloaded');
    }
  };

  const handleSingleSupplier = (action: 'preview' | 'download') => {
    const supp = suppliers.find((s) => s.id === selectedSupplierId) || suppliers[0];
    if (!supp) return;
    const entries = (supplierLedger || []).filter((l) => l.supplierId === supp.id);
    const res = generateSupplierLedgerPdf(supp, entries, suppliers, businessProfile);
    if (action === 'preview') {
      onPreviewPdf(res);
    } else {
      res.download();
      showNotification(language === 'bn' ? `${supp.name}-এর লেজার ডাউনলোড হয়েছে` : `${supp.name} ledger PDF downloaded`);
    }
  };

  // 2. Retailer / Customer Handlers
  const handleAllRetailers = (action: 'preview' | 'download') => {
    const res = generateAllRetailersSummaryPdf(retailers, businessProfile);
    if (action === 'preview') {
      onPreviewPdf(res);
    } else {
      res.download();
      showNotification(language === 'bn' ? 'সকল কাস্টমার বাকি বিবরণী ডাউনলোড হয়েছে' : 'All customers receivables summary downloaded');
    }
  };

  const handleSingleRetailer = (action: 'preview' | 'download') => {
    const ret = retailers.find((r) => r.id === selectedRetailerId) || retailers[0];
    if (!ret) return;
    const res = generateRetailerStatementPdf(ret, orders, businessProfile);
    if (action === 'preview') {
      onPreviewPdf(res);
    } else {
      res.download();
      showNotification(language === 'bn' ? `${ret.shopName}-এর স্টেটমেন্ট ডাউনলোড হয়েছে` : `${ret.shopName} statement PDF downloaded`);
    }
  };

  // 3. Sales & Invoice Handlers
  const handleTodaySales = (action: 'preview' | 'download') => {
    const todayStr = new Date().toISOString().slice(0, 10);
    const res = generateDailySalesStatementPdf(orders, todayStr, businessProfile);
    if (action === 'preview') {
      onPreviewPdf(res);
    } else {
      res.download();
      showNotification(language === 'bn' ? 'আজকের বিক্রয় বিবরণী ডাউনলোড হয়েছে' : 'Daily sales register PDF downloaded');
    }
  };

  const handleAllSales = (action: 'preview' | 'download') => {
    const res = generateDailySalesStatementPdf(orders, undefined, businessProfile);
    if (action === 'preview') {
      onPreviewPdf(res);
    } else {
      res.download();
      showNotification(language === 'bn' ? 'সকল বিক্রয় চালান বিবরণী ডাউনলোড হয়েছে' : 'All sales invoices statement PDF downloaded');
    }
  };

  const handleSalesProfitStatement = (action: 'preview' | 'download', preset: 'today' | 'period' | 'all') => {
    let dateFilter: { startDate?: string; endDate?: string; filterDate?: string; presetTitle?: string } | undefined;
    if (preset === 'today') {
      const todayStr = new Date().toISOString().slice(0, 10);
      dateFilter = { filterDate: todayStr, presetTitle: `আজকের বিক্রয় ও নিট লাভ বিবরণী (${todayStr})` };
    } else if (preset === 'period') {
      dateFilter = { startDate, endDate, presetTitle: `তারিখ ভিত্তিক লাভ বিবরণী (${startDate} হতে ${endDate})` };
    } else {
      dateFilter = { presetTitle: 'সকল বিক্রয়ের সর্বমোট লাভ বিবরণী' };
    }

    const res = generateSalesProfitStatementPdf(orders, products, dateFilter, businessProfile, expenses);
    if (action === 'preview') {
      onPreviewPdf(res);
    } else {
      res.download();
      showNotification(language === 'bn' ? 'বিক্রয় লাভ স্টেটমেন্ট PDF ডাউনলোড হয়েছে' : 'Sales profit statement PDF downloaded');
    }
  };

  const handleSingleInvoice = (action: 'preview' | 'download') => {
    const inv = orders.find((o) => o.id === selectedInvoiceId) || orders[0];
    if (!inv) return;
    const ret = retailers.find((r) => r.id === inv.retailerId);
    const res = generateInvoiceMemoPdf(inv, ret, businessProfile);
    if (action === 'preview') {
      onPreviewPdf(res);
    } else {
      res.download();
      showNotification(language === 'bn' ? `চালান #${inv.invoiceNo} ডাউনলোড হয়েছে` : `Invoice #${inv.invoiceNo} PDF downloaded`);
    }
  };

  // 4. Inventory / Stock Handlers
  const handleStockStatement = (action: 'preview' | 'download') => {
    const res = generateStockStatementPdf(products, businessProfile);
    if (action === 'preview') {
      onPreviewPdf(res);
    } else {
      res.download();
      showNotification(language === 'bn' ? 'গোডাউন স্টক ও ইনভেন্টরি স্টেটমেন্ট ডাউনলোড হয়েছে' : 'Stock & inventory valuation PDF downloaded');
    }
  };

  // 5. Cash Transfers Handlers
  const handleCashTransfers = (action: 'preview' | 'download') => {
    const res = generateCashTransfersPdf(cashTransfers, businessProfile);
    if (action === 'preview') {
      onPreviewPdf(res);
    } else {
      res.download();
      showNotification(language === 'bn' ? 'ক্যাশ ট্রান্সফার অডিট স্টেটমেন্ট ডাউনলোড হয়েছে' : 'Cash transfer audit log PDF downloaded');
    }
  };

  // 6. Capital & Net Worth Handlers
  const handleCapitalStatement = (action: 'preview' | 'download') => {
    const res = generateCapitalStatementPdf(capitalTransactions, {
      adminCash,
      counterCash,
      dsrCash,
      bankCash,
      stockValue: totalInventoryValuation,
      totalReceivables,
      totalPayables,
    }, businessProfile);
    if (action === 'preview') {
      onPreviewPdf(res);
    } else {
      res.download();
      showNotification(language === 'bn' ? 'মূলধন ও ব্যবসায়িক সম্পদ স্টেটমেন্ট ডাউনলোড হয়েছে' : 'Capital & net worth statement PDF downloaded');
    }
  };

  // 7. Cash Validation & Reconciliation Handlers (ক্যাশ ভ্যালিড স্টেটমেন্ট)
  const cashSalesReceived = (orders || []).reduce((acc, o) => acc + (Number(o.paidAmount) || 0), 0);
  const capitalInflows = (capitalTransactions || [])
    .filter((c) => c.type === 'INJECTION')
    .reduce((acc, c) => acc + (Number(c.amount) || 0), 0);
  const totalCashReceived = cashSalesReceived + capitalInflows;

  const totalCompanyPayments = Math.max(
    (supplierLedger || [])
      .filter((e) => e.type === 'PAYMENT')
      .reduce((acc, e) => acc + (Number(e.amount) || 0), 0),
    (suppliers || []).reduce((acc, s) => acc + (Number(s.totalPaid) || 0), 0),
    (suppliers || []).reduce((sum, s) => {
      const rec = (supplierLedger || [])
        .filter((e) => (e.supplierId === s.id || (e.supplierName && s.name && e.supplierName.trim().toLowerCase() === s.name.trim().toLowerCase()) || (e.supplierName && s.company && e.supplierName.trim().toLowerCase() === s.company.trim().toLowerCase())) && e.type === 'PAYMENT')
        .reduce((a, e) => a + (Number(e.amount) || 0), 0);
      return sum + Math.max(Number(s.totalPaid) || 0, rec);
    }, 0)
  );

  const supplierPurchasesTotal = Math.max(
    (supplierLedger || [])
      .filter((e) => e.type === 'PURCHASE')
      .reduce((acc, e) => acc + (Number(e.amount) || 0), 0),
    (suppliers || []).reduce((acc, s) => acc + (Number(s.totalPurchases) || 0), 0)
  );

  const supplierReturnsTotal = (supplierLedger || [])
    .filter((e) => e.type === 'RETURN_ADJUSTMENT' || e.type === 'DISCOUNT_CREDIT')
    .reduce((acc, e) => acc + (Number(e.amount) || 0), 0);

  const dueRetailersCount = (retailers || []).filter((r) => (Number(r.balance) || 0) > 0).length;
  const totalLiquidCash = adminCash + counterCash + dsrCash + bankCash;

  const handleCashValidationStatement = (action: 'preview' | 'download') => {
    // Recent Inflows
    const recentInflows = (orders || [])
      .filter((o) => (Number(o.paidAmount) || 0) > 0)
      .slice(-15)
      .reverse()
      .map((o) => ({
        date: o.createdAt || new Date().toISOString(),
        description: `নগদ আদায় - ${o.retailerName || 'খুচরা গ্রাহক'}`,
        memoNo: o.invoiceNo ? `#${o.invoiceNo}` : undefined,
        amount: Number(o.paidAmount) || 0,
      }));

    // Recent Company Payments - includes all ledger payments and unrecorded supplier totalPaid
    const recordedSupplierIds = new Set(
      (supplierLedger || []).filter((e) => e.type === 'PAYMENT').map((e) => e.supplierId)
    );
    const unrecordedSuppliers = (suppliers || []).filter(
      (s) => (Number(s.totalPaid) || 0) > 0 && !recordedSupplierIds.has(s.id)
    );
    const extraOutflows = unrecordedSuppliers.map((s) => ({
      date: (s as any).openingDate || new Date().toISOString(),
      companyName: s.bnName || s.name || s.company || 'কোম্পানি চালান পরিশোধ',
      referenceNo: 'BILL-PAY',
      amount: Number(s.totalPaid) || 0,
    }));

    const recentOutflows = [
      ...(supplierLedger || [])
        .filter((e) => e.type === 'PAYMENT')
        .slice(-25)
        .reverse()
        .map((e) => {
          const supp = suppliers.find((s) => s.id === e.supplierId || (s.name && e.supplierName && s.name.toLowerCase() === e.supplierName.toLowerCase()));
          return {
            date: e.date || new Date().toISOString(),
            companyName: e.supplierName || (supp ? (supp.company || supp.name) : 'কোম্পানি চালান পরিশোধ'),
            referenceNo: e.referenceNo ? `#${e.referenceNo}` : (e.notes || 'পেমেন্ট ভাউচার'),
            amount: Number(e.amount) || 0,
          };
        }),
      ...extraOutflows,
    ];

    const res = generateCashValidationStatementPdf(
      {
        totalCashReceived,
        cashSalesReceived,
        dueCollectionsReceived: 0,
        capitalInflowReceived: capitalInflows,

        totalCompanyPayments,
        supplierPurchasesTotal,
        supplierReturnsTotal,
        supplierOutstandingPayable: totalPayables,

        totalReceivables,
        dueRetailersCount,

        adminCash,
        counterCash,
        dsrCash,
        bankCash,
        totalLiquidCash,

        inflowItems: recentInflows,
        outflowItems: recentOutflows,
      },
      businessProfile
    );

    if (action === 'preview') {
      onPreviewPdf(res);
    } else {
      res.download();
      showNotification(language === 'bn' ? 'ক্যাশ ভ্যালিড স্টেটমেন্ট ডাউনলোড হয়েছে' : 'Cash validation statement PDF downloaded');
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-700/80 rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="px-5 py-4 bg-slate-950 border-b border-slate-800 flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                <span>{language === 'bn' ? 'সকল পিডিএফ স্টেটমেন্ট সেন্টার' : 'All PDF Statements Center'}</span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-950 border border-emerald-500/40 text-emerald-300">
                  Preview & Download
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                {language === 'bn'
                  ? 'যেকোনো স্টেটমেন্ট লাইভ প্রিভিউ দেখুন অথবা এক ক্লিকে ডাউনলোড ও প্রিন্ট করুন'
                  : 'Live preview, print, or download any official accounting & trade statement'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={openBusinessProfile}
              className="px-3 py-1.5 bg-amber-950/60 hover:bg-amber-900/80 text-amber-300 border border-amber-500/40 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-sm"
              title={language === 'bn' ? 'অফিশিয়াল প্যাড ও প্রতিষ্ঠান সেটিংস' : 'Official Pad & Business Profile'}
            >
              <Building2 className="w-3.5 h-3.5 text-amber-400" />
              <span className="hidden sm:inline">{language === 'bn' ? 'প্যাড ও ঠিকানা' : 'Pad & Info'}</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-xl transition"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Business Profile Status / Customizer Banner */}
        <div className="px-5 py-2.5 bg-slate-950/70 border-b border-slate-800/80 flex flex-wrap items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-2 text-slate-300 min-w-0">
            <span className="font-bold text-emerald-400 truncate">{businessProfile.enterpriseName}</span>
            <span className="text-slate-500">•</span>
            <span className="text-slate-400 truncate text-[11px]">
              {businessProfile.address}
              {businessProfile.warehouseAddress ? ` (গুদাম: ${businessProfile.warehouseAddress})` : ''}
            </span>
            <span className="text-slate-500 hidden md:inline">•</span>
            <span className="text-slate-400 hidden md:inline text-[11px]">📞 {businessProfile.contactNumber}</span>
          </div>

          <button
            type="button"
            onClick={openBusinessProfile}
            className="text-[11px] font-bold text-amber-400 hover:text-amber-300 flex items-center gap-1 underline cursor-pointer shrink-0"
          >
            {language === 'bn' ? '✏️ প্যাড ও ঠিকানা পরিবর্তন করুন' : '✏️ Change Pad & Address'}
          </button>
        </div>

        {/* Toast */}
        {toastMsg && (
          <div className="px-5 py-2 bg-emerald-950/80 border-b border-emerald-500/40 text-emerald-300 text-xs flex items-center gap-2 animate-in slide-in-from-top duration-200 shrink-0">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{toastMsg}</span>
          </div>
        )}

        {/* Body: Grid of Statements */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-4 flex-1">

          {/* UNIVERSAL DATE RANGE FILTER TOOLBAR (মাস ভিত্তিক / ফ্রম-টু তারিখ সেট) */}
          <div className="p-3.5 sm:p-4 rounded-2xl bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950 border border-slate-700/90 shadow-xl space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0">
                  <Calendar className="w-4 h-4" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs sm:text-sm font-bold text-white">
                      {language === 'bn' ? 'তারিখ ও মাস ভিত্তিক স্টেটমেন্ট ফিল্টার' : 'Statement Date Range Filter'}
                    </span>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-950 border border-emerald-500/40 text-emerald-300">
                      {getDateRangeFilter().label}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400">
                    {language === 'bn'
                      ? 'স্টেট ব্যাংক ও ক্যাশ ড্রয়ার স্টেটমেন্টের জন্য সময়সীমা নির্ধারণ করুন'
                      : 'Define date range for Bank Statement & Cash Drawer audited reports'}
                  </p>
                </div>
              </div>

              {/* Quick Presets */}
              <div className="flex flex-wrap items-center gap-1.5 self-start sm:self-center">
                <button
                  type="button"
                  onClick={() => applyPreset('today')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition cursor-pointer ${
                    datePreset === 'today'
                      ? 'bg-emerald-600 text-white shadow'
                      : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                  }`}
                >
                  {language === 'bn' ? 'আজকের' : 'Today'}
                </button>
                <button
                  type="button"
                  onClick={() => applyPreset('this_month')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition cursor-pointer ${
                    datePreset === 'this_month'
                      ? 'bg-emerald-600 text-white shadow'
                      : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                  }`}
                >
                  {language === 'bn' ? 'চলতি মাস' : 'This Month'}
                </button>
                <button
                  type="button"
                  onClick={() => applyPreset('last_month')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition cursor-pointer ${
                    datePreset === 'last_month'
                      ? 'bg-emerald-600 text-white shadow'
                      : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                  }`}
                >
                  {language === 'bn' ? 'গত মাস' : 'Last Month'}
                </button>
                <button
                  type="button"
                  onClick={() => applyPreset('all')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition cursor-pointer ${
                    datePreset === 'all'
                      ? 'bg-emerald-600 text-white shadow'
                      : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                  }`}
                >
                  {language === 'bn' ? 'সকল সময় (Open)' : 'All Time'}
                </button>
              </div>
            </div>

            {/* Date Inputs: From Date & To Date */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-2 border-t border-slate-800/80">
              <div className="flex items-center gap-2 bg-slate-950/70 px-3 py-1.5 rounded-xl border border-slate-800 focus-within:border-emerald-500 transition">
                <span className="text-[11px] font-bold text-slate-400 shrink-0">
                  {language === 'bn' ? 'শুরু / ফ্রম (From):' : 'From Date:'}
                </span>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => {
                    setStartDate(e.target.value);
                    setDatePreset('custom');
                  }}
                  className="w-full bg-transparent text-xs text-emerald-300 font-mono focus:outline-none"
                />
              </div>

              <div className="flex items-center gap-2 bg-slate-950/70 px-3 py-1.5 rounded-xl border border-slate-800 focus-within:border-emerald-500 transition">
                <span className="text-[11px] font-bold text-slate-400 shrink-0">
                  {language === 'bn' ? 'সমাপ্তি / টু (To):' : 'To Date:'}
                </span>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => {
                    setEndDate(e.target.value);
                    setDatePreset('custom');
                  }}
                  className="w-full bg-transparent text-xs text-emerald-300 font-mono focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* CONSOLIDATED STATEMENT SELECTOR DROPDOWN (মাল্টি সিস্টেম স্টেটমেন্ট ড্রপডাউন বাটন) */}
          <div className="p-3.5 sm:p-4 rounded-2xl bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950 border-2 border-emerald-500/40 shadow-xl space-y-2.5">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 flex items-center justify-center shrink-0">
                  <ListFilter className="w-5 h-5" />
                </div>
                <div>
                  <label className="text-xs sm:text-sm font-black text-white flex items-center gap-1.5">
                    <span>{language === 'bn' ? '📑 স্টেটমেন্ট মেনু (এক ক্লিকে নির্বাচন):' : '📑 Select Statement (Dropdown):'}</span>
                    <span className="text-[10px] px-2 py-0.2 rounded-full bg-emerald-950 text-emerald-300 border border-emerald-500/40 font-mono">
                      Multi-System
                    </span>
                  </label>
                  <p className="text-[11px] text-slate-400">
                    {language === 'bn'
                      ? 'ড্রপডাউন থেকে যেকোনো একটি স্টেটমেন্ট নির্বাচন করুন অথবা সবগুলো একসাথে দেখুন'
                      : 'Choose any specific financial statement from dropdown or view all'}
                  </p>
                </div>
              </div>

              {/* Dropdown Select Element */}
              <div className="flex-1 max-w-md w-full">
                <select
                  value={selectedStatementKey}
                  onChange={(e) => setSelectedStatementKey(e.target.value as StatementKey)}
                  className="w-full bg-slate-900 border-2 border-emerald-500 hover:border-emerald-400 rounded-xl px-3 py-2 text-xs sm:text-sm font-bold text-emerald-300 focus:outline-none focus:ring-2 focus:ring-emerald-500/40 transition cursor-pointer shadow-lg"
                >
                  <option value="ALL">
                    {language === 'bn' ? '📋 সকল স্টেটমেন্ট একসাথে দেখুন (Show All)' : '📋 Show All Statements'}
                  </option>
                  <optgroup label={language === 'bn' ? '━━ ১. ক্যাশ, ভল্ট ও ব্যাংক হিসাব ━━' : '━━ Cash & Banking ━━'}>
                    <option value="CASH_VALIDATION">
                      {language === 'bn' ? '🌟 ক্যাশ ভ্যালিড স্টেটমেন্ট (প্লাস-মাইনাস ফিগার অডিট)' : '🌟 Cash Validation Statement'}
                    </option>
                    <option value="BANK_STATEMENT">
                      {language === 'bn' ? '🏦 স্টেট ব্যাংক ও ডিজিটাল একাউন্ট বিবরণী' : '🏦 Bank Account Statement'}
                    </option>
                    <option value="CASH_DRAWER_ADMIN">
                      {language === 'bn' ? '🛡️ ক্যাশ ড্রয়ার: ১. এডমিন ক্যাশ ভল্ট স্টেটমেন্ট' : '🛡️ Admin Cash Vault Statement'}
                    </option>
                    <option value="CASH_DRAWER_COUNTER">
                      {language === 'bn' ? '💼 ক্যাশ ড্রয়ার: ২. ক্যাশ কাউন্টার ড্রয়ার স্টেটমেন্ট' : '💼 Cash Counter Drawer Statement'}
                    </option>
                    <option value="CASH_DRAWER_DSR">
                      {language === 'bn' ? '👥 ক্যাশ ড্রয়ার: ৩. ডিএসআর ফিল্ড ক্যাশ স্টেটমেন্ট' : '👥 DSR Field Cash Statement'}
                    </option>
                    <option value="CASH_TRANSFER">
                      {language === 'bn' ? '🔄 ক্যাশ ট্রান্সফার ও ট্রানজিট হিস্ট্রি স্টেটমেন্ট' : '🔄 Cash Transfer History'}
                    </option>
                  </optgroup>
                  <optgroup label={language === 'bn' ? '━━ ২. কাস্টমার ও সাপ্লায়ার লেজার ━━' : '━━ Parties & Ledgers ━━'}>
                    <option value="RETAILER_STATEMENT">
                      {language === 'bn' ? '🏪 কাস্টমার / রিটেইলার বাকি স্টেটমেন্ট' : '🏪 Customer / Retailer Statement'}
                    </option>
                    <option value="SUPPLIER_STATEMENT">
                      {language === 'bn' ? '🏭 সাপ্লায়ার ও কোম্পানি দেনা স্টেটমেন্ট' : '🏭 Supplier / Vendor Statement'}
                    </option>
                  </optgroup>
                  <optgroup label={language === 'bn' ? '━━ ৩. বিক্রয়, স্টক ও মূলধন ━━' : '━━ Sales, Stock & Capital ━━'}>
                    <option value="SALES_PROFIT_STATEMENT">
                      {language === 'bn' ? '📈 বিক্রয় ও নিট লাভ স্টেটমেন্ট (Profit Statement)' : '📈 Sales & Net Profit Statement'}
                    </option>
                    <option value="SALES_STATEMENT">
                      {language === 'bn' ? '🛒 বিক্রয় চালান ও দৈনিক মেমো স্টেটমেন্ট' : '🛒 Sales & Invoice Statement'}
                    </option>
                    <option value="STOCK_STATEMENT">
                      {language === 'bn' ? '📦 স্টক মজুদ ও ইনভেন্টরি ভ্যালুয়েশন স্টেটমেন্ট' : '📦 Stock Inventory Statement'}
                    </option>
                    <option value="CAPITAL_STATEMENT">
                      {language === 'bn' ? '💰 মূলধন লেনদেন ও বিনিয়োগ বিবরণী' : '💰 Capital Transactions Statement'}
                    </option>
                  </optgroup>
                </select>
              </div>
            </div>

            {/* Quick Filter Shortcuts */}
            <div className="flex flex-wrap items-center gap-1.5 pt-1 border-t border-slate-800/80">
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mr-1">
                {language === 'bn' ? 'শর্টকাট:' : 'Quick Jump:'}
              </span>
              {STATEMENT_ITEMS.slice(0, 6).map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setSelectedStatementKey(item.id)}
                  className={`px-2 py-0.5 rounded-lg text-[10.5px] font-medium transition cursor-pointer ${
                    selectedStatementKey === item.id
                      ? 'bg-emerald-600 text-white font-bold shadow-sm'
                      : 'bg-slate-900 text-slate-400 hover:text-slate-200 hover:bg-slate-850 border border-slate-800'
                  }`}
                >
                  {language === 'bn' ? item.shortTitleBn : item.titleEn.split(' ')[0]}
                </button>
              ))}
              {selectedStatementKey !== 'ALL' && (
                <button
                  type="button"
                  onClick={() => setSelectedStatementKey('ALL')}
                  className="px-2.5 py-0.5 rounded-lg text-[10.5px] font-bold text-amber-400 hover:text-amber-300 bg-amber-950/40 border border-amber-500/30 transition cursor-pointer ml-auto"
                >
                  {language === 'bn' ? 'সবগুলো দেখান' : 'Show All'}
                </button>
              )}
            </div>
          </div>
          
          {/* TOP HERO: CASH VALIDATION STATEMENT (ক্যাশ ভ্যালিড স্টেটমেন্ট - পাওয়া গেছে, পাবো ও কোম্পানি পেমেন্ট) */}
          {(selectedStatementKey === 'ALL' || selectedStatementKey === 'CASH_VALIDATION') && (
          <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950/70 border-2 border-emerald-500/40 shadow-xl relative overflow-hidden space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-500 to-sky-500 flex items-center justify-center text-white font-bold shadow-lg shadow-emerald-950/50 shrink-0">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base sm:text-lg font-black text-white tracking-tight">
                      {language === 'bn' ? '🌟 ক্যাশ ভ্যালিড স্টেটমেন্ট' : '🌟 Cash Validation Statement'}
                    </h3>
                    <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-[10px] font-bold">
                      {language === 'bn' ? 'প্লাস-মাইনাস ফিগার অডিট' : 'Plus-Minus Audit'}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400">
                    {language === 'bn'
                      ? 'কত টাকা পাওয়া গেছে (+), কোম্পানিকে কত পেমেন্ট হয়েছে (-), এবং বাজারে মোট কত টাকা পাবো (+)'
                      : 'Audit: Cash received (+), supplier payments (-), and market receivables (+)'}
                  </p>
                </div>
              </div>

              {/* Action Buttons: Preview & Download */}
              <div className="flex items-center gap-2 self-end sm:self-center">
                <button
                  type="button"
                  onClick={() => handleCashValidationStatement('preview')}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-emerald-300 border border-slate-700 rounded-xl text-xs font-bold flex items-center gap-1.5 transition shadow-sm cursor-pointer"
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span>{language === 'bn' ? 'প্রিভিউ দেখুন' : 'Live Preview'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleCashValidationStatement('download')}
                  className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition shadow-lg shadow-emerald-900/40 cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>{language === 'bn' ? 'স্টেটমেন্ট ডাউনলোড (PDF)' : 'Download PDF'}</span>
                </button>
              </div>
            </div>

            {/* 4 Pillars with Clear Plus-Minus Figures */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              
              {/* Pillar 1: কত টাকা পাওয়া গেছে (+) */}
              <div className="p-3.5 rounded-xl bg-slate-900/90 border border-emerald-500/40 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-emerald-400 flex items-center gap-1">
                    <ArrowDownLeft className="w-3.5 h-3.5" />
                    <span>{language === 'bn' ? '১. কত টাকা পাওয়া গেছে' : '1. Cash Received'}</span>
                  </span>
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-mono">
                    (+) প্রাপ্তি
                  </span>
                </div>
                <div className="text-xl sm:text-2xl font-black text-emerald-300 font-mono-num">
                  +{formatCurrency(totalCashReceived, language)}
                </div>
                <div className="text-[10.5px] text-slate-400 border-t border-slate-800/80 pt-1 space-y-0.5">
                  <div className="flex justify-between">
                    <span>নগদ বিক্রয় আদায়:</span>
                    <strong className="text-emerald-400 font-mono-num">+{formatCurrency(cashSalesReceived, language)}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span>মূলধন ও ক্যাশ জমা:</span>
                    <strong className="text-emerald-400 font-mono-num">+{formatCurrency(capitalInflows, language)}</strong>
                  </div>
                </div>
              </div>

              {/* Pillar 2: কোম্পানির পেমেন্ট (-) [মাইনাস ফিগার] */}
              <div className="p-3.5 rounded-xl bg-slate-900/90 border border-rose-500/40 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-rose-400 flex items-center gap-1">
                    <ArrowUpRight className="w-3.5 h-3.5" />
                    <span>{language === 'bn' ? '২. কোম্পানির পেমেন্ট' : '2. Company Paid'}</span>
                  </span>
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-rose-500/20 text-rose-300 font-mono">
                    (-) পরিশোধ
                  </span>
                </div>
                <div className="text-xl sm:text-2xl font-black text-rose-400 font-mono-num">
                  -{formatCurrency(totalCompanyPayments, language)}
                </div>
                <div className="text-[10.5px] text-slate-400 border-t border-slate-800/80 pt-1 space-y-0.5">
                  <div className="flex justify-between">
                    <span>মোট ক্রয় চালান (+):</span>
                    <strong className="text-slate-300 font-mono-num">+{formatCurrency(supplierPurchasesTotal, language)}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span>কোম্পানি পাবে (দেনা):</span>
                    <strong className="text-rose-400 font-mono-num">-{formatCurrency(totalPayables, language)}</strong>
                  </div>
                </div>
              </div>

              {/* Pillar 3: কত টাকা পাবো (+) */}
              <div className="p-3.5 rounded-xl bg-slate-900/90 border border-sky-500/40 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-sky-400 flex items-center gap-1">
                    <Wallet className="w-3.5 h-3.5" />
                    <span>{language === 'bn' ? '৩. কত টাকা পাবো' : '3. To Receive (Dues)'}</span>
                  </span>
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-sky-500/20 text-sky-300 font-mono">
                    (+) বাকি
                  </span>
                </div>
                <div className="text-xl sm:text-2xl font-black text-sky-300 font-mono-num">
                  +{formatCurrency(totalReceivables, language)}
                </div>
                <div className="text-[10.5px] text-slate-400 border-t border-slate-800/80 pt-1 space-y-0.5">
                  <div className="flex justify-between">
                    <span>মার্কেটে মোট বাকি:</span>
                    <strong className="text-sky-400 font-mono-num">+{formatCurrency(totalReceivables, language)}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span>বাকি থাকা কাস্টমার:</span>
                    <strong className="text-slate-300">{dueRetailersCount} টি দোকান</strong>
                  </div>
                </div>
              </div>

              {/* Pillar 4: বর্তমান ড্রয়ার ও ভল্ট ক্যাশ */}
              <div className="p-3.5 rounded-xl bg-slate-900/90 border border-purple-500/40 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-purple-400 flex items-center gap-1">
                    <Landmark className="w-3.5 h-3.5" />
                    <span>{language === 'bn' ? '৪. বর্তমান ক্যাশ ব্যালেন্স' : '4. Liquid Cash'}</span>
                  </span>
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-300 font-mono">
                    তারল্য
                  </span>
                </div>
                <div className="text-xl sm:text-2xl font-black text-purple-300 font-mono-num">
                  {formatCurrency(totalLiquidCash, language)}
                </div>
                <div className="text-[10px] text-slate-400 border-t border-slate-800/80 pt-1 grid grid-cols-2 gap-1">
                  <div>কাউন্টার: <strong className="text-slate-300 font-mono-num">{formatCurrency(counterCash, language)}</strong></div>
                  <div>ডিএসআর: <strong className="text-slate-300 font-mono-num">{formatCurrency(dsrCash, language)}</strong></div>
                  <div>ভল্ট: <strong className="text-slate-300 font-mono-num">{formatCurrency(adminCash, language)}</strong></div>
                  <div>ব্যাংক: <strong className="text-slate-300 font-mono-num">{formatCurrency(bankCash, language)}</strong></div>
                </div>
              </div>

            </div>
          </div>
          )}

          {/* 🏦 BANK STATEMENT CARD (স্টেট ব্যাংক / ব্যাংক স্টেটমেন্ট ডাউনলোড - মাস ভিত্তিক / তারিখ সেট) */}
          {(selectedStatementKey === 'ALL' || selectedStatementKey === 'BANK_STATEMENT') && (
          <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-slate-950 via-slate-900 to-sky-950/50 border-2 border-sky-500/40 shadow-xl space-y-3.5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-sky-500 to-blue-600 flex items-center justify-center text-white font-bold shadow-lg shadow-sky-950/50 shrink-0">
                  <Landmark className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-black text-white tracking-tight">
                      {language === 'bn' ? '🏦 স্টেট ব্যাংক ও ডিজিটাল হিসাব বিবরণী' : '🏦 Bank & MFS Account Statement'}
                    </h3>
                    <span className="px-2 py-0.5 rounded-full bg-sky-500/20 border border-sky-500/40 text-sky-300 text-[10px] font-bold">
                      {language === 'bn' ? 'তারিখ ভিত্তিক অডিট' : 'Date Filtered'}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400">
                    {language === 'bn'
                      ? 'তারিখ সেট করে ব্যাংক জমা (ডিজিটাল বিক্রয় ও মূলধন) ও উত্তোলন/কোম্পানি পেমেন্ট বিস্তারিত (কে কত দিলো ও নিলো)'
                      : 'Audited bank inflows (digital sales/capital) & outflows with Payer/Receiver details'}
                  </p>
                </div>
              </div>

              {/* Action Buttons: Preview & Download */}
              <div className="flex items-center gap-2 self-end sm:self-center">
                <button
                  type="button"
                  onClick={() => handleBankStatement('preview')}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-sky-300 border border-slate-700 rounded-xl text-xs font-bold flex items-center gap-1.5 transition shadow-sm cursor-pointer"
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span>{language === 'bn' ? 'প্রিভিউ দেখুন' : 'Live Preview'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleBankStatement('download')}
                  className="px-3 py-1.5 bg-sky-600 hover:bg-sky-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition shadow-lg shadow-sky-900/40 cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>{language === 'bn' ? 'স্টেট ব্যাংক ডাউনলোড (PDF)' : 'Download Bank PDF'}</span>
                </button>
              </div>
            </div>

            {/* Account Selector and Balances */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-center">
              <div className="space-y-1 md:col-span-2">
                <label className="text-[11px] font-semibold text-slate-300 block">
                  {language === 'bn' ? 'ব্যাংক একাউন্ট বাছাই করুন:' : 'Select Bank / MFS Account:'}
                </label>
                <select
                  value={selectedBankAccountId}
                  onChange={(e) => setSelectedBankAccountId(e.target.value)}
                  className="w-full py-2 px-3 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-sky-500 font-medium"
                >
                  <option value="ALL">
                    {language === 'bn' ? 'সকল ব্যাংক ও ডিজিটাল একাউন্ট (Consolidated / একীভূত বিবরণী)' : 'All Bank & Digital Accounts (Consolidated)'}
                  </option>
                  {(bankAccounts || []).map((acc) => (
                    <option key={acc.id} value={acc.id}>
                      {acc.bnName || acc.name} - {acc.accountNumber} ({acc.bankName}) [ব্যালেন্স: ৳{acc.balance || 0}]
                    </option>
                  ))}
                </select>
              </div>

              <div className="p-2.5 rounded-xl bg-slate-950/80 border border-sky-500/30 flex flex-col justify-center">
                <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">
                  {language === 'bn' ? 'বর্তমান ব্যাংক ব্যালেন্স' : 'Current Bank Balance'}
                </span>
                <span className="text-lg font-black text-sky-400 font-mono-num">
                  {formatCurrency(bankCash, language)}
                </span>
              </div>
            </div>
          </div>
          )}

          {/* 💼 CASH DRAWER SEPARATE STATEMENTS (এডমিন, ক্যাশ কাউন্টার, ডিএসআর ক্যাশ আলাদা স্টেটমেন্ট) */}
          {(selectedStatementKey === 'ALL' || selectedStatementKey === 'CASH_DRAWER_ADMIN' || selectedStatementKey === 'CASH_DRAWER_COUNTER' || selectedStatementKey === 'CASH_DRAWER_DSR') && (
          <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-slate-950 via-slate-900 to-emerald-950/40 border-2 border-emerald-500/40 shadow-xl space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-600 flex items-center justify-center text-white font-bold shadow-lg shadow-emerald-950/50 shrink-0">
                  <Wallet className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-black text-white tracking-tight">
                      {language === 'bn' ? '💼 ক্যাশ ড্রয়ার ভিত্তিক আলাদা স্টেটমেন্ট' : '💼 Cash Drawer Role-Specific Statements'}
                    </h3>
                    <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-[10px] font-bold">
                      কে পেমেন্ট ও কে রিসিভ করলো
                    </span>
                  </div>
                  <p className="text-xs text-slate-400">
                    {language === 'bn'
                      ? 'এডমিনের টাকা, ক্যাশ কাউন্টারের টাকা এবং ডিএসআর-এর টাকা আলাদা আলাদা ডাউনলোড করুন (কে কত টাকা দিলো ও নিলো)'
                      : 'Download separate audited statements for Admin Vault, Cash Counter, and DSR Sales Staff'}
                  </p>
                </div>
              </div>
            </div>

            {/* 3 Drawer Cards: Admin, Counter, DSR */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-3.5">
              
              {/* 1. Admin Cash Vault */}
              <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800 hover:border-amber-500/50 transition flex flex-col justify-between space-y-3">
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-amber-400 flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-amber-400 inline-block"></span>
                      {language === 'bn' ? '১. এডমিন ক্যাশ ভল্ট' : '1. Admin Vault Cash'}
                    </span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 font-mono">
                      ভল্ট ব্যালেন্স
                    </span>
                  </div>
                  <div className="text-lg font-black text-amber-300 font-mono-num">
                    {formatCurrency(adminCash, language)}
                  </div>
                  <p className="text-[11px] text-slate-400 leading-snug">
                    {language === 'bn'
                      ? 'কাউন্টার ও ডিএসআর থেকে ভল্টে গ্রহণ, কোম্পানি চালান পেমেন্ট ও মূলধন উত্তোলন'
                      : 'Transfers from staff, supplier payments, owner withdrawals & capital'}
                  </p>
                </div>

                <div className="flex items-center gap-1.5 pt-2 border-t border-slate-800/80">
                  {onOpenCashDrawerStatement && (
                    <button
                      type="button"
                      onClick={() => onOpenCashDrawerStatement('admin')}
                      className="px-2.5 py-1.5 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 rounded-lg text-xs font-bold flex items-center justify-center gap-1 transition cursor-pointer"
                      title="অন-স্ক্রিন ডেবিট-ক্রেডিট স্টেটমেন্ট"
                    >
                      <FileText className="w-3.5 h-3.5" />
                      <span>অন-স্ক্রিন</span>
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => handleCashDrawerStatement('admin', 'preview')}
                    className="flex-1 py-1.5 bg-slate-800 hover:bg-slate-700 text-amber-300 border border-slate-700 rounded-lg text-xs font-bold flex items-center justify-center gap-1 transition cursor-pointer"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>প্রিভিউ</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleCashDrawerStatement('admin', 'download')}
                    className="flex-1 py-1.5 bg-amber-600 hover:bg-amber-500 text-white rounded-lg text-xs font-bold flex items-center justify-center gap-1 transition shadow cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>এডমিন PDF</span>
                  </button>
                </div>
              </div>

              {/* 2. Counter Cash Drawer */}
              <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800 hover:border-emerald-500/50 transition flex flex-col justify-between space-y-3">
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-emerald-400 flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block"></span>
                      {language === 'bn' ? '২. ক্যাশ কাউন্টার ড্রয়ার' : '2. Cash Counter Drawer'}
                    </span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-mono">
                      কাউন্টার ক্যাশ
                    </span>
                  </div>
                  <div className="text-lg font-black text-emerald-300 font-mono-num">
                    {formatCurrency(counterCash, language)}
                  </div>
                  <p className="text-[11px] text-slate-400 leading-snug">
                    {language === 'bn'
                      ? 'কাউন্টার নগদ বিক্রয়, ডিএসআর থেকে ক্যাশ জমা এবং এডমিন ভল্টে হস্তান্তর'
                      : 'POS cash sales, DSR handovers received, and transfers to Admin Vault'}
                  </p>
                </div>

                <div className="flex items-center gap-1.5 pt-2 border-t border-slate-800/80">
                  {onOpenCashDrawerStatement && (
                    <button
                      type="button"
                      onClick={() => onOpenCashDrawerStatement('counter')}
                      className="px-2.5 py-1.5 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 rounded-lg text-xs font-bold flex items-center justify-center gap-1 transition cursor-pointer"
                      title="অন-স্ক্রিন ডেবিট-ক্রেডিট স্টেটমেন্ট"
                    >
                      <FileText className="w-3.5 h-3.5" />
                      <span>অন-স্ক্রিন</span>
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => handleCashDrawerStatement('counter', 'preview')}
                    className="flex-1 py-1.5 bg-slate-800 hover:bg-slate-700 text-emerald-300 border border-slate-700 rounded-lg text-xs font-bold flex items-center justify-center gap-1 transition cursor-pointer"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>প্রিভিউ</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleCashDrawerStatement('counter', 'download')}
                    className="flex-1 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold flex items-center justify-center gap-1 transition shadow cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>কাউন্টার PDF</span>
                  </button>
                </div>
              </div>

              {/* 3. DSR Field Cash */}
              <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800 hover:border-purple-500/50 transition flex flex-col justify-between space-y-3">
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-purple-400 flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-purple-400 inline-block"></span>
                      {language === 'bn' ? '৩. ডিএসআর ফিল্ড ক্যাশ' : '3. DSR Field Cash'}
                    </span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-300 font-mono">
                      ফিল্ড কালেকশন
                    </span>
                  </div>
                  <div className="text-lg font-black text-purple-300 font-mono-num">
                    {formatCurrency(dsrCash, language)}
                  </div>

                  {/* DSR Selector */}
                  <div className="pt-0.5">
                    <select
                      value={selectedDsrId}
                      onChange={(e) => setSelectedDsrId(e.target.value)}
                      className="w-full py-1 px-2 bg-slate-900 border border-slate-700 rounded-lg text-[11px] text-white focus:outline-none focus:border-purple-500"
                    >
                      <option value="ALL">
                        {language === 'bn' ? 'সকল ডিএসআর একত্রিত (All Consolidated)' : 'All DSR Staff Consolidated'}
                      </option>
                      {dsrUsers.map((u) => (
                        <option key={u.id} value={u.id}>
                          {u.bnName || u.name} ({u.routeArea || 'ডিএসআর'})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 pt-2 border-t border-slate-800/80">
                  {onOpenCashDrawerStatement && (
                    <button
                      type="button"
                      onClick={() => onOpenCashDrawerStatement('dsr')}
                      className="px-2.5 py-1.5 bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 border border-purple-500/40 rounded-lg text-xs font-bold flex items-center justify-center gap-1 transition cursor-pointer"
                      title="অন-স্ক্রিন ডেবিট-ক্রেডিট স্টেটমেন্ট"
                    >
                      <FileText className="w-3.5 h-3.5" />
                      <span>অন-স্ক্রিন</span>
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => handleCashDrawerStatement('dsr', 'preview')}
                    className="flex-1 py-1.5 bg-slate-800 hover:bg-slate-700 text-purple-300 border border-slate-700 rounded-lg text-xs font-bold flex items-center justify-center gap-1 transition cursor-pointer"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>প্রিভিউ</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleCashDrawerStatement('dsr', 'download')}
                    className="flex-1 py-1.5 bg-purple-600 hover:bg-purple-500 text-white rounded-lg text-xs font-bold flex items-center justify-center gap-1 transition shadow cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>ডিএসআর PDF</span>
                  </button>
                </div>
              </div>

            </div>
          </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            
            {/* 1. RETAILER / CUSTOMER STATEMENTS */}
            {(selectedStatementKey === 'ALL' || selectedStatementKey === 'RETAILER_STATEMENT') && (
            <div className="p-4 rounded-xl bg-slate-950/60 border border-purple-500/30 space-y-3">
              <div className="flex items-center gap-2.5 text-purple-400">
                <Store className="w-5 h-5" />
                <h3 className="font-bold text-sm text-white">
                  {language === 'bn' ? 'কাস্টমার / রিটেইলার স্টেটমেন্ট' : 'Customer / Retailer Statement'}
                </h3>
              </div>
              <p className="text-xs text-slate-400">
                {language === 'bn'
                  ? 'গ্রাহকদের মোট বাকি, ক্রেডিট লিমিট এবং প্রতিটি দোকানের হিসাব খাতা'
                  : 'Receivables summary, credit limits, and individual store ledgers'}
              </p>

              {/* All Customers button */}
              <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-between gap-2">
                <div className="text-xs">
                  <span className="font-semibold text-white block">
                    {language === 'bn' ? 'সকল কাস্টমার দেনা-পাওনা শিট' : 'All Customers Dues Summary'}
                  </span>
                  <span className="text-[10px] text-slate-400">
                    {retailers.length} {language === 'bn' ? 'টি দোকান' : 'Retailers'}
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => handleAllRetailers('preview')}
                    className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-purple-300 rounded-lg text-xs font-semibold flex items-center gap-1 transition"
                    title="Live Preview"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>{language === 'bn' ? 'প্রিভিউ' : 'Preview'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleAllRetailers('download')}
                    className="px-2.5 py-1.5 bg-purple-600 hover:bg-purple-500 text-white rounded-lg text-xs font-semibold flex items-center gap-1 transition shadow"
                    title="Direct Download"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>{language === 'bn' ? 'ডাউনলোড' : 'Download'}</span>
                  </button>
                </div>
              </div>

              {/* Single Customer Picker */}
              <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800 space-y-2">
                <label className="text-[11px] font-semibold text-slate-300 block">
                  {language === 'bn' ? 'নির্দিষ্ট গ্রাহক/দোকান নির্বাচন করুন:' : 'Specific Customer Ledger:'}
                </label>
                <select
                  value={selectedRetailerId}
                  onChange={(e) => setSelectedRetailerId(e.target.value)}
                  className="w-full py-1.5 px-2 bg-slate-950 border border-slate-700 rounded-lg text-xs text-white focus:outline-none focus:border-purple-500"
                >
                  {retailers.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.shopName || r.name} ({r.phone}) - Due: ৳{r.currentDue ?? r.outstandingDue ?? 0}
                    </option>
                  ))}
                </select>
                <div className="flex items-center justify-end gap-1.5 pt-1">
                  <button
                    type="button"
                    onClick={() => handleSingleRetailer('preview')}
                    className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-purple-300 rounded-lg text-xs font-semibold flex items-center gap-1 transition"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>{language === 'bn' ? 'প্রিভিউ' : 'Preview'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSingleRetailer('download')}
                    className="px-2.5 py-1.5 bg-purple-600 hover:bg-purple-500 text-white rounded-lg text-xs font-semibold flex items-center gap-1 transition shadow"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>{language === 'bn' ? 'ডাউনলোড' : 'Download'}</span>
                  </button>
                </div>
              </div>
            </div>
            )}

            {/* 2. SUPPLIER STATEMENTS */}
            {(selectedStatementKey === 'ALL' || selectedStatementKey === 'SUPPLIER_STATEMENT') && (
            <div className="p-4 rounded-xl bg-slate-950/60 border border-indigo-500/30 space-y-3">
              <div className="flex items-center gap-2.5 text-indigo-400">
                <Building2 className="w-5 h-5" />
                <h3 className="font-bold text-sm text-white">
                  {language === 'bn' ? 'সাপ্লায়ার হিসাব স্টেটমেন্ট' : 'Supplier Account Statement'}
                </h3>
              </div>
              <p className="text-xs text-slate-400">
                {language === 'bn'
                  ? 'সকল সরবরাহকারীর মোট পাওনা ও নির্দিষ্ট কোম্পানির ক্রয়-পেমেন্ট লেজার'
                  : 'Consolidated vendor payables and individual supplier ledger'}
              </p>

              {/* All Suppliers button */}
              <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-between gap-2">
                <div className="text-xs">
                  <span className="font-semibold text-white block">
                    {language === 'bn' ? 'সকল সাপ্লায়ার মোট দেনা শিট' : 'All Suppliers Summary'}
                  </span>
                  <span className="text-[10px] text-slate-400">
                    {suppliers.length} {language === 'bn' ? 'জন সরবরাহকারী' : 'Vendors'}
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => handleAllSuppliers('preview')}
                    className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-indigo-300 rounded-lg text-xs font-semibold flex items-center gap-1 transition"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>{language === 'bn' ? 'প্রিভিউ' : 'Preview'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleAllSuppliers('download')}
                    className="px-2.5 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold flex items-center gap-1 transition shadow"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>{language === 'bn' ? 'ডাউনলোড' : 'Download'}</span>
                  </button>
                </div>
              </div>

              {/* Single Supplier Picker */}
              <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800 space-y-2">
                <label className="text-[11px] font-semibold text-slate-300 block">
                  {language === 'bn' ? 'নির্দিষ্ট সাপ্লায়ার নির্বাচন করুন:' : 'Specific Vendor Ledger:'}
                </label>
                <select
                  value={selectedSupplierId}
                  onChange={(e) => setSelectedSupplierId(e.target.value)}
                  className="w-full py-1.5 px-2 bg-slate-950 border border-slate-700 rounded-lg text-xs text-white focus:outline-none focus:border-indigo-500"
                >
                  {suppliers.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.company}) - Payable: ৳{s.outstandingPayable || 0}
                    </option>
                  ))}
                </select>

                {/* 4-Step Live Financial Breakdown */}
                {curSupplier && (
                  <div className="p-2.5 rounded-lg bg-slate-950/80 border border-slate-800 text-[11px] space-y-1.5 font-mono">
                    <div className="flex justify-between items-center text-slate-300">
                      <span className="text-slate-400 font-sans">{language === 'bn' ? '১. কত টাকার মাল কিনেছি (মোট ক্রয় +):' : '1. Total Purchased (+):'}</span>
                      <span className="font-bold text-slate-100">{formatCurrency(curSupplierPurchases, language)}</span>
                    </div>
                    <div className="flex justify-between items-center text-sky-400">
                      <span className="text-sky-300/80 font-sans">{language === 'bn' ? '২. কত টাকা রিপ্লেস দিয়েছি (কোম্পানি ফেরত -):' : '2. Replacement Returns (-):'}</span>
                      <span className="font-bold">-{formatCurrency(curSupplierReturns, language)}</span>
                    </div>
                    <div className="flex justify-between items-center text-emerald-400">
                      <span className="text-emerald-300/80 font-sans">{language === 'bn' ? '৩. কত টাকা ক্যাশ দিয়েছি (পরিশোধ -):' : '3. Cash Paid (-):'}</span>
                      <span className="font-bold">-{formatCurrency(curSupplierPaid, language)}</span>
                    </div>
                    <div className="flex justify-between items-center pt-1.5 border-t border-slate-800 text-rose-400 font-bold text-xs">
                      <span className="text-rose-300 font-sans">{language === 'bn' ? '৪. বর্তমান মোট ডিউ (বকেয়া দেনা):' : '4. Current Due Payable:'}</span>
                      <span className="font-extrabold text-sm text-rose-400">{formatCurrency(curSupplier.outstandingPayable, language)}</span>
                    </div>
                  </div>
                )}

                <div className="flex items-center justify-end gap-1.5 pt-1">
                  <button
                    type="button"
                    onClick={() => handleSingleSupplier('preview')}
                    className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-indigo-300 rounded-lg text-xs font-semibold flex items-center gap-1 transition"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>{language === 'bn' ? 'প্রিভিউ' : 'Preview'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSingleSupplier('download')}
                    className="px-2.5 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold flex items-center gap-1 transition shadow"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>{language === 'bn' ? 'ডাউনলোড' : 'Download'}</span>
                  </button>
                </div>
              </div>
            </div>
            )}

            {/* SALES & PROFIT STATEMENT (বিক্রয় ও লাভ স্টেটমেন্ট) */}
            {(selectedStatementKey === 'ALL' || selectedStatementKey === 'SALES_PROFIT_STATEMENT') && (
            <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-slate-950 via-slate-900 to-emerald-950/40 border-2 border-emerald-500/40 space-y-3.5 shadow-xl relative overflow-hidden">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-500 flex items-center justify-center text-white font-bold shadow-lg shadow-emerald-950/50 shrink-0">
                    <TrendingUp className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-base sm:text-lg font-black text-white tracking-tight">
                        {language === 'bn' ? '📈 বিক্রয় ও নিট প্রফিট স্টেটমেন্ট' : '📈 Sales & Net Profit Statement'}
                      </h3>
                      <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-[10px] font-bold">
                        {language === 'bn' ? 'লাভ-লোকসান অডিট' : 'Profit & Loss Audit'}
                      </span>
                    </div>
                    <p className="text-xs text-slate-400">
                      {language === 'bn'
                        ? 'বিক্রয় মূল্য হতে কেনা খরচ (Cost) বাদ দিয়ে কত টাকা নিট লাভ আসলো তার সম্পূর্ণ বিবরণী'
                        : 'Sales revenue vs warehouse product cost, realized profit and margin % breakdown'}
                    </p>
                  </div>
                </div>

                {/* Direct quick action for current period */}
                <div className="flex items-center gap-2 self-end sm:self-center">
                  <button
                    type="button"
                    onClick={() => handleSalesProfitStatement('preview', 'period')}
                    className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-emerald-300 border border-slate-700 rounded-xl text-xs font-bold flex items-center gap-1.5 transition shadow-sm cursor-pointer"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>{language === 'bn' ? 'প্রিভিউ' : 'Preview'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSalesProfitStatement('download', 'period')}
                    className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition shadow-md shadow-emerald-950 cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>{language === 'bn' ? 'ডাউনলোড' : 'Download'}</span>
                  </button>
                </div>
              </div>

              {/* Profit Metric Previews for Filtered Period (বিক্রয়, লাভ, খরচ ও চূড়ান্ত নিট প্রফিট) */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 p-3 rounded-xl bg-slate-900/90 border border-slate-800 text-center">
                <div className="p-1.5">
                  <div className="text-[10px] sm:text-xs text-slate-400 font-medium">
                    {language === 'bn' ? '১. নির্বাচিত বিক্রয়' : '1. Period Sales'}
                  </div>
                  <div className="text-xs sm:text-base font-bold text-white font-mono-num mt-0.5">
                    {formatCurrency(periodProfitData.sales, language)}
                  </div>
                  <div className="text-[9.5px] text-slate-500 font-mono">
                    {periodProfitData.count} টি মেমো
                  </div>
                </div>

                <div className="p-1.5 border-l border-slate-800">
                  <div className="text-[10px] sm:text-xs text-emerald-400 font-bold">
                    {language === 'bn' ? '২. বিক্রয় লাভ' : '2. Gross Profit'}
                  </div>
                  <div className="text-xs sm:text-base font-bold text-emerald-300 font-mono-num mt-0.5">
                    +{formatCurrency(periodProfitData.grossProfit, language)}
                  </div>
                  <div className="text-[9.5px] text-slate-400 font-mono">
                    চালান মুনাফা
                  </div>
                </div>

                <div className="p-1.5 border-l border-slate-800">
                  <div className="text-[10px] sm:text-xs text-rose-400 font-bold">
                    {language === 'bn' ? '৩. দোকান খরচ (-)' : '3. Expenses (-)'}
                  </div>
                  <div className="text-xs sm:text-base font-bold text-rose-400 font-mono-num mt-0.5">
                    -{formatCurrency(periodProfitData.expenses, language)}
                  </div>
                  <div className="text-[9.5px] text-rose-400/80 font-mono">
                    বেতন/ভাড়া/বিদ্যুৎ ({periodProfitData.expenseCount}টি)
                  </div>
                </div>

                <div className={`p-1.5 border-l border-slate-800 rounded-lg ${periodProfitData.netProfit < 0 ? 'bg-rose-950/40 border border-rose-500/50' : 'bg-emerald-950/20'}`}>
                  <div className="flex items-center justify-center gap-1">
                    <span className={`text-[10px] sm:text-xs font-bold ${periodProfitData.netProfit >= 0 ? 'text-emerald-300' : 'text-rose-300'}`}>
                      {language === 'bn' ? '৪. চূড়ান্ত প্রফিট' : '4. Net Profit'}
                    </span>
                    <span className={`text-[8.5px] font-bold px-1 rounded ${periodProfitData.netProfit < 0 ? 'bg-rose-500/30 text-rose-200' : 'bg-emerald-500/30 text-emerald-200'}`}>
                      {periodProfitData.netProfit < 0 ? (language === 'bn' ? 'ঘাটতি' : 'Deficit') : (language === 'bn' ? 'লাভ' : 'Net')}
                    </span>
                  </div>
                  <div className={`text-xs sm:text-base font-black font-mono-num mt-0.5 ${periodProfitData.netProfit >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {periodProfitData.netProfit >= 0 ? '+' : ''}{formatCurrency(periodProfitData.netProfit, language)}
                  </div>
                  <div className={`text-[9.5px] font-mono font-semibold ${periodProfitData.netProfit < 0 ? 'text-rose-300' : 'text-slate-400'}`}>
                    {periodProfitData.netProfit < 0
                      ? (language === 'bn' ? '⚠️ লাভ পর্যাপ্ত নয়' : 'Deficit')
                      : `(মার্জিন: ${periodProfitData.margin}%)`}
                  </div>
                </div>
              </div>

              {/* Action Rows: Today, Selected Period, All Time */}
              <div className="space-y-2">
                {/* 1. Today's Profit Statement */}
                <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 hover:border-emerald-500/40 transition">
                  <div className="text-xs">
                    <span className="font-bold text-white flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-emerald-400" />
                      {language === 'bn' ? '১. আজকের বিক্রয় ও লাভ স্টেটমেন্ট' : "1. Today's Profit Statement"}
                    </span>
                    <span className="text-[11px] text-slate-400 ml-5 block sm:inline sm:ml-2">
                      {language === 'bn'
                        ? `আজকের চালান: ${todayProfitData.count} টি • বিক্রয়: ${formatCurrency(todayProfitData.sales, language)} • লাভ: `
                        : `Today's Invoices: ${todayProfitData.count} • Sales: ${formatCurrency(todayProfitData.sales, language)} • Profit: `}
                      <strong className={todayProfitData.netProfit >= 0 ? 'text-emerald-400 font-mono font-bold' : 'text-rose-400 font-mono font-bold'}>
                        {todayProfitData.netProfit >= 0 ? '+' : ''}{formatCurrency(todayProfitData.netProfit, language)}
                      </strong>
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 self-end sm:self-center">
                    <button
                      type="button"
                      onClick={() => handleSalesProfitStatement('preview', 'today')}
                      className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-emerald-300 rounded-lg text-xs font-semibold flex items-center gap-1 transition cursor-pointer"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>{language === 'bn' ? 'প্রিভিউ' : 'Preview'}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSalesProfitStatement('download', 'today')}
                      className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold flex items-center gap-1 transition shadow cursor-pointer"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>{language === 'bn' ? 'ডাউনলোড' : 'Download'}</span>
                    </button>
                  </div>
                </div>

                {/* 2. Custom Date Range Profit Statement */}
                <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 hover:border-sky-500/40 transition">
                  <div className="text-xs">
                    <span className="font-bold text-white flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-sky-400" />
                      {language === 'bn' ? `২. তারিখ ভিত্তিক স্টেটমেন্ট (${startDate || 'শুরু'} হতে ${endDate || 'আজ'})` : `2. Filtered Period Statement (${startDate || 'Start'} to ${endDate || 'Today'})`}
                    </span>
                    <span className="text-[11px] text-slate-400 ml-5 block sm:inline sm:ml-2">
                      {language === 'bn'
                        ? `মোট চালান: ${periodProfitData.count} টি • প্রফিট: `
                        : `Total Invoices: ${periodProfitData.count} • Profit: `}
                      <strong className={periodProfitData.netProfit >= 0 ? 'text-emerald-400 font-mono font-bold' : 'text-rose-400 font-mono font-bold'}>
                        {periodProfitData.netProfit >= 0 ? '+' : ''}{formatCurrency(periodProfitData.netProfit, language)}
                      </strong>
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 self-end sm:self-center">
                    <button
                      type="button"
                      onClick={() => handleSalesProfitStatement('preview', 'period')}
                      className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-sky-300 rounded-lg text-xs font-semibold flex items-center gap-1 transition cursor-pointer"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>{language === 'bn' ? 'প্রিভিউ' : 'Preview'}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSalesProfitStatement('download', 'period')}
                      className="px-2.5 py-1.5 bg-sky-600 hover:bg-sky-500 text-white rounded-lg text-xs font-semibold flex items-center gap-1 transition shadow cursor-pointer"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>{language === 'bn' ? 'ডাউনলোড' : 'Download'}</span>
                    </button>
                  </div>
                </div>

                {/* 3. All Time Profit Statement */}
                <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 hover:border-amber-500/40 transition">
                  <div className="text-xs">
                    <span className="font-bold text-white flex items-center gap-1.5">
                      <TrendingUp className="w-3.5 h-3.5 text-amber-400" />
                      {language === 'bn' ? '৩. সর্বমোট বিক্রয় ও লাভ বিবরণী (All-Time Profit)' : '3. All-Time Profit Statement'}
                    </span>
                    <span className="text-[11px] text-slate-400 ml-5 block sm:inline sm:ml-2">
                      {language === 'bn'
                        ? `মোট চালান: ${orders.length} টি • সকল বিক্রয় ও প্রফিটের ঐতিহাসিক খাতা`
                        : `Total Orders: ${orders.length} • Complete historical sales & profit log`}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 self-end sm:self-center">
                    <button
                      type="button"
                      onClick={() => handleSalesProfitStatement('preview', 'all')}
                      className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-amber-300 rounded-lg text-xs font-semibold flex items-center gap-1 transition cursor-pointer"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>{language === 'bn' ? 'প্রিভিউ' : 'Preview'}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSalesProfitStatement('download', 'all')}
                      className="px-2.5 py-1.5 bg-amber-600 hover:bg-amber-500 text-white rounded-lg text-xs font-semibold flex items-center gap-1 transition shadow cursor-pointer"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>{language === 'bn' ? 'ডাউনলোড' : 'Download'}</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
            )}

            {/* 3. SALES & INVOICES */}
            {(selectedStatementKey === 'ALL' || selectedStatementKey === 'SALES_STATEMENT') && (
            <div className="p-4 rounded-xl bg-slate-950/60 border border-emerald-500/30 space-y-3">
              <div className="flex items-center gap-2.5 text-emerald-400">
                <ShoppingCart className="w-5 h-5" />
                <h3 className="font-bold text-sm text-white">
                  {language === 'bn' ? 'বিক্রয় ও চালান স্টেটমেন্ট' : 'Sales & Invoice Statement'}
                </h3>
              </div>
              <p className="text-xs text-slate-400">
                {language === 'bn'
                  ? 'দৈনিক ও পিরিওডিক মোট বিক্রয় রেজিস্টার এবং একক চালানের মেমো'
                  : 'Daily/Periodic sales volume register & individual sales invoice printouts'}
              </p>

              {/* Today's Sales */}
              <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-between gap-2">
                <div className="text-xs">
                  <span className="font-semibold text-white flex items-center gap-1">
                    <Calendar className="w-3 h-3 text-emerald-400" />
                    {language === 'bn' ? 'আজকের বিক্রয় বিবরণী' : "Today's Sales Register"}
                  </span>
                  <span className="text-[10px] text-slate-400">
                    {orders.length} {language === 'bn' ? 'টি মোট চালান' : 'Orders total'}
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => handleTodaySales('preview')}
                    className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-emerald-300 rounded-lg text-xs font-semibold flex items-center gap-1 transition"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>{language === 'bn' ? 'প্রিভিউ' : 'Preview'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleTodaySales('download')}
                    className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold flex items-center gap-1 transition shadow"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>{language === 'bn' ? 'ডাউনলোড' : 'Download'}</span>
                  </button>
                </div>
              </div>

              {/* Single Memo Picker */}
              <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800 space-y-2">
                <label className="text-[11px] font-semibold text-slate-300 block">
                  {language === 'bn' ? 'নির্দিষ্ট বিক্রয় মেমো নির্বাচন করুন:' : 'Specific Invoice Memo:'}
                </label>
                <select
                  value={selectedInvoiceId}
                  onChange={(e) => setSelectedInvoiceId(e.target.value)}
                  className="w-full py-1.5 px-2 bg-slate-950 border border-slate-700 rounded-lg text-xs text-white focus:outline-none focus:border-emerald-500"
                >
                  {orders.map((o) => (
                    <option key={o.id} value={o.id}>
                      #{o.invoiceNo} - {o.retailerName} (৳{o.totalAmount})
                    </option>
                  ))}
                </select>
                <div className="flex items-center justify-end gap-1.5 pt-1">
                  <button
                    type="button"
                    onClick={() => handleSingleInvoice('preview')}
                    className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-emerald-300 rounded-lg text-xs font-semibold flex items-center gap-1 transition"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>{language === 'bn' ? 'প্রিভিউ' : 'Preview'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSingleInvoice('download')}
                    className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold flex items-center gap-1 transition shadow"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>{language === 'bn' ? 'ডাউনলোড' : 'Download'}</span>
                  </button>
                </div>
              </div>
            </div>
            )}

            {/* 4. STOCK & INVENTORY STATEMENT */}
            {(selectedStatementKey === 'ALL' || selectedStatementKey === 'STOCK_STATEMENT') && (
            <div className="p-4 rounded-xl bg-slate-950/60 border border-amber-500/30 space-y-3">
              <div className="flex items-center gap-2.5 text-amber-400">
                <Package className="w-5 h-5" />
                <h3 className="font-bold text-sm text-white">
                  {language === 'bn' ? 'স্টক ও ইনভেন্টরি স্টেটমেন্ট' : 'Stock & Inventory Valuation'}
                </h3>
              </div>
              <p className="text-xs text-slate-400">
                {language === 'bn'
                  ? 'ডিপোর বর্তমান সকল পণ্যের মজুদ, কেনা ও পাইকারি দর এবং মোট সম্পদ মূল্যায়ন'
                  : 'Real-time stock quantity, cost, wholesale price & warehouse asset valuation'}
              </p>

              <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-between gap-2">
                <div className="text-xs">
                  <span className="font-semibold text-white block">
                    {language === 'bn' ? 'সম্পূর্ণ গোডাউন স্টক বিবরণী' : 'Warehouse Stock Position'}
                  </span>
                  <span className="text-[10px] text-slate-400">
                    {products.length} {language === 'bn' ? 'টি পণ্য আইটেম' : 'SKUs active'}
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => handleStockStatement('preview')}
                    className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-amber-300 rounded-lg text-xs font-semibold flex items-center gap-1 transition"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>{language === 'bn' ? 'প্রিভিউ' : 'Preview'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleStockStatement('download')}
                    className="px-2.5 py-1.5 bg-amber-600 hover:bg-amber-500 text-white rounded-lg text-xs font-semibold flex items-center gap-1 transition shadow"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>{language === 'bn' ? 'ডাউনলোড' : 'Download'}</span>
                  </button>
                </div>
              </div>
            </div>
            )}

            {/* 5. CASH TRANSFERS & AUDIT */}
            {(selectedStatementKey === 'ALL' || selectedStatementKey === 'CASH_TRANSFER') && (
            <div className="p-4 rounded-xl bg-slate-950/60 border border-teal-500/30 space-y-3">
              <div className="flex items-center gap-2.5 text-teal-400">
                <Coins className="w-5 h-5" />
                <h3 className="font-bold text-sm text-white">
                  {language === 'bn' ? 'ক্যাশ ট্রান্সফার ও ভল্ট অডিট' : 'Cash & Vault Audit Statement'}
                </h3>
              </div>
              <p className="text-xs text-slate-400">
                {language === 'bn'
                  ? 'কাউন্টার, DSR ও এডমিন ভল্টের মধ্যে টাকা হস্তান্তর ও ড্রয়ার মেলানোর লগ'
                  : 'Cash drawer handovers, multi-role settlements & audit verification logs'}
              </p>

              <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-between gap-2">
                <div className="text-xs">
                  <span className="font-semibold text-white block">
                    {language === 'bn' ? 'ক্যাশ লেনদেন ও ভল্ট অডিট শিট' : 'Cash Transfer Audit Trail'}
                  </span>
                  <span className="text-[10px] text-slate-400">
                    {cashTransfers.length} {language === 'bn' ? 'টি ক্যাশ রেকর্ড' : 'Transfers'}
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => handleCashTransfers('preview')}
                    className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-teal-300 rounded-lg text-xs font-semibold flex items-center gap-1 transition"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>{language === 'bn' ? 'প্রিভিউ' : 'Preview'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleCashTransfers('download')}
                    className="px-2.5 py-1.5 bg-teal-600 hover:bg-teal-500 text-white rounded-lg text-xs font-semibold flex items-center gap-1 transition shadow"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>{language === 'bn' ? 'ডাউনলোড' : 'Download'}</span>
                  </button>
                </div>
              </div>
            </div>
            )}

            {/* 6. CAPITAL & EQUITY STATEMENT */}
            {(selectedStatementKey === 'ALL' || selectedStatementKey === 'CAPITAL_STATEMENT') && (
            <div className="p-4 rounded-xl bg-slate-950/60 border border-blue-500/30 space-y-3">
              <div className="flex items-center gap-2.5 text-blue-400">
                <PieChart className="w-5 h-5" />
                <h3 className="font-bold text-sm text-white">
                  {language === 'bn' ? 'মূলধন ও ব্যবসায়িক সম্পদ' : 'Capital & Equity Statement'}
                </h3>
              </div>
              <p className="text-xs text-slate-400">
                {language === 'bn'
                  ? 'ডিপোর মোট মূলধন, ক্যাশ/ব্যাংক/স্টক ব্যালেন্স এবং নিট ব্যবসার মূল্যায়ন'
                  : 'Total equity, drawer balances, bank accounts & net worth statement'}
              </p>

              <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-between gap-2">
                <div className="text-xs">
                  <span className="font-semibold text-white block">
                    {language === 'bn' ? 'মূলধন ও ব্যালেন্স শিট স্টেটমেন্ট' : 'Capital & Net Worth Statement'}
                  </span>
                  <span className="text-[10px] text-slate-400">
                    {capitalTransactions.length} {language === 'bn' ? 'টি লেনদেন হিস্টোরি' : 'Transactions'}
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => handleCapitalStatement('preview')}
                    className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-blue-300 rounded-lg text-xs font-semibold flex items-center gap-1 transition"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>{language === 'bn' ? 'প্রিভিউ' : 'Preview'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleCapitalStatement('download')}
                    className="px-2.5 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-semibold flex items-center gap-1 transition shadow"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>{language === 'bn' ? 'ডাউনলোড' : 'Download'}</span>
                  </button>
                </div>
              </div>
            </div>
            )}

          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3 bg-slate-950 border-t border-slate-800 flex items-center justify-between gap-2 text-xs text-slate-400 shrink-0">
          <span>
            {language === 'bn'
              ? 'সকল স্টেটমেন্ট A4 সাইজে প্রিন্ট ও সেভ করার জন্য ফরম্যাট করা।'
              : 'All statements are precision-formatted for standard A4 printing and PDF archiving.'}
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-xl transition"
          >
            {language === 'bn' ? 'বন্ধ করুন' : 'Close'}
          </button>
        </div>
      </div>
    </div>
  );
};
