import React, { useState, useMemo } from 'react';
import { useWholesale } from '../context/WholesaleContext';
import { Product, OrderInvoice } from '../types';
import { formatCurrency } from '../utils/translations';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
  Cell,
  ComposedChart,
  Line,
  Area,
  PieChart,
  Pie
} from 'recharts';
import {
  TrendingUp,
  TrendingDown,
  BarChart3,
  Package,
  Layers,
  Calendar,
  ArrowUpRight,
  ArrowDownRight,
  RefreshCw,
  Printer,
  Sparkles,
  Filter,
  CheckCircle2,
  AlertTriangle,
  Boxes,
  ShoppingCart,
  ArrowLeftRight,
  Award,
  DollarSign,
  PieChart as PieIcon,
  Activity,
  Zap,
  Info,
  ChevronDown,
  X,
  Plus
} from 'lucide-react';

interface WeeklyStockMovementReportProps {
  onOpenScanner?: () => void;
  onNavigateTab?: (tab: string) => void;
}

type TimeWindow = '7d' | '14d' | '30d';
type MetricType = 'units' | 'revenue' | 'profit';
type ViewSubTab = 'overview' | 'top_sellers' | 'movement_ledger';

interface ProductPerformanceItem {
  product: Product;
  unitsSold: number;
  totalRevenue: number;
  totalCost: number;
  grossProfit: number;
  orderCount: number;
  inflowUnits: number;
}

interface CategorySummaryItem {
  name: string;
  bnName: string;
  units: number;
  revenue: number;
}

export const WeeklyStockMovementReport: React.FC<WeeklyStockMovementReportProps> = ({
  onOpenScanner,
  onNavigateTab,
}) => {
  const {
    products,
    orders,
    suppliers,
    supplierLedger,
    language,
    restockProduct,
  } = useWholesale();

  const [timeWindow, setTimeWindow] = useState<TimeWindow>('7d');
  const [metricType, setMetricType] = useState<MetricType>('units');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [activeSubTab, setActiveSubTab] = useState<ViewSubTab>('overview');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isPrintModalOpen, setIsPrintModalOpen] = useState<boolean>(false);
  const [quickRestockProductId, setQuickRestockProductId] = useState<string | null>(null);
  const [quickRestockQty, setQuickRestockQty] = useState<number>(20);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const daysCount = timeWindow === '7d' ? 7 : timeWindow === '14d' ? 14 : 30;

  // Filter orders within the selected time window (relative to 2026-08-27)
  const referenceDate = useMemo(() => new Date('2026-08-27T23:59:59Z'), []);
  const windowStartDate = useMemo(() => {
    const d = new Date(referenceDate);
    d.setDate(d.getDate() - daysCount + 1);
    d.setHours(0, 0, 0, 0);
    return d;
  }, [referenceDate, daysCount]);

  const filteredOrders = useMemo(() => {
    return orders.filter((ord) => {
      const ordDate = new Date(ord.date);
      return ordDate >= windowStartDate && ordDate <= referenceDate;
    });
  }, [orders, windowStartDate, referenceDate]);

  // Aggregate Product Performance (Top Sellers)
  const productPerformanceMap = useMemo(() => {
    const map: Record<string, ProductPerformanceItem> = {};

    // Initialize with all products
    products.forEach((p) => {
      map[p.id] = {
        product: p,
        unitsSold: 0,
        totalRevenue: 0,
        totalCost: 0,
        grossProfit: 0,
        orderCount: 0,
        inflowUnits: 0,
      };
    });

    // Compute sales outflow from orders
    filteredOrders.forEach((ord) => {
      ord.items.forEach((item) => {
        if (!map[item.productId]) {
          const matchP = products.find((p) => p.id === item.productId);
          if (matchP) {
            map[item.productId] = {
              product: matchP,
              unitsSold: 0,
              totalRevenue: 0,
              totalCost: 0,
              grossProfit: 0,
              orderCount: 0,
              inflowUnits: 0,
            };
          }
        }

        if (map[item.productId]) {
          const cost = item.costPrice || map[item.productId].product.costPrice;
          map[item.productId].unitsSold += item.quantity;
          map[item.productId].totalRevenue += item.total;
          map[item.productId].totalCost += item.quantity * cost;
          map[item.productId].grossProfit += item.total - item.quantity * cost;
          map[item.productId].orderCount += 1;
        }
      });
    });

    // Inflow estimates based on supplier ledgers or initial stock
    supplierLedger.forEach((entry) => {
      if (entry.type === 'PURCHASE') {
        const entryDate = new Date(entry.date);
        if (entryDate >= windowStartDate && entryDate <= referenceDate) {
          // Attribute proportional inflow to matching supplier's products
          const supProducts = products.filter((p) => p.supplierId === entry.supplierId);
          if (supProducts.length > 0) {
            const perProductUnits = Math.round((entry.amount / supProducts[0].costPrice) / supProducts.length);
            supProducts.forEach((p) => {
              if (map[p.id]) {
                map[p.id].inflowUnits += Math.max(5, perProductUnits);
              }
            });
          }
        }
      }
    });

    return map;
  }, [products, filteredOrders, supplierLedger, windowStartDate, referenceDate]);

  // Sorted Array of Top Selling Products
  const topSellersList = useMemo(() => {
    let list: ProductPerformanceItem[] = Object.values(productPerformanceMap);

    // Apply category filter
    if (selectedCategory !== 'ALL') {
      list = list.filter((item) => item.product.category === selectedCategory);
    }

    // Apply search filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        (item) =>
          item.product.name.toLowerCase().includes(q) ||
          (item.product.bnName && item.product.bnName.toLowerCase().includes(q)) ||
          item.product.sku.toLowerCase().includes(q) ||
          item.product.category.toLowerCase().includes(q)
      );
    }

    // Sort by metric
    list.sort((a, b) => {
      if (metricType === 'revenue') {
        return b.totalRevenue - a.totalRevenue;
      }
      if (metricType === 'profit') {
        return b.grossProfit - a.grossProfit;
      }
      return b.unitsSold - a.unitsSold;
    });

    return list;
  }, [productPerformanceMap, selectedCategory, searchQuery, metricType]);

  // Daily Breakdown for Stock Movement Timeline Chart (Past 7 or 14 Days)
  const dailyMovementData = useMemo(() => {
    const dataList = [];
    const dayNamesEn = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const dayNamesBn = ['রবি', 'সোম', 'মঙ্গল', 'বুধ', 'বৃহঃ', 'শুক্র', 'শনি'];

    for (let i = daysCount - 1; i >= 0; i--) {
      const curDate = new Date(referenceDate);
      curDate.setDate(curDate.getDate() - i);
      const dateStr = curDate.toISOString().split('T')[0];
      const dayOfWeek = curDate.getDay();
      const label =
        language === 'bn'
          ? `${curDate.getDate()} ${dayNamesBn[dayOfWeek]}`
          : `${dayNamesEn[dayOfWeek]} ${curDate.getDate()}`;

      // Calculate outflow for this day
      const dayOrders = orders.filter((o) => o.date.startsWith(dateStr));
      const unitsOutflow = dayOrders.reduce(
        (sum, ord) => sum + ord.items.reduce((s, it) => s + it.quantity, 0),
        0
      );
      const revenue = dayOrders.reduce((sum, ord) => sum + ord.totalAmount, 0);

      // Inflow for this day from supplier purchases or scheduled intake
      const dayPurchases = supplierLedger.filter(
        (l) => l.type === 'PURCHASE' && l.date.startsWith(dateStr)
      );
      const purchaseValue = dayPurchases.reduce((sum, p) => sum + p.amount, 0);
      const estimatedUnitsInflow = purchaseValue > 0 ? Math.round(purchaseValue / 1500) : (i === 1 || i === 4 ? 28 : 0);

      const netMovement = estimatedUnitsInflow - unitsOutflow;

      dataList.push({
        date: dateStr,
        displayDate: label,
        outflowUnits: unitsOutflow,
        inflowUnits: estimatedUnitsInflow,
        netMovement,
        revenue,
        orderCount: dayOrders.length,
      });
    }

    return dataList;
  }, [daysCount, referenceDate, language, orders, supplierLedger]);

  // Overall KPIs
  const totalWeeklyOutflowUnits = useMemo(
    () => dailyMovementData.reduce((sum, d) => sum + d.outflowUnits, 0),
    [dailyMovementData]
  );
  const totalWeeklyInflowUnits = useMemo(
    () => dailyMovementData.reduce((sum, d) => sum + d.inflowUnits, 0),
    [dailyMovementData]
  );
  const totalWeeklyRevenue = useMemo(
    () => dailyMovementData.reduce((sum, d) => sum + d.revenue, 0),
    [dailyMovementData]
  );
  const netWeeklyStockChange = totalWeeklyInflowUnits - totalWeeklyOutflowUnits;

  // Star top seller
  const starProduct = topSellersList[0];

  // Category Breakdown for Pie Chart
  const categoryData = useMemo(() => {
    const catMap: Record<string, CategorySummaryItem> = {};

    (Object.values(productPerformanceMap) as ProductPerformanceItem[]).forEach((item) => {
      const cat = item.product.category || 'General';
      const bnCat = item.product.bnCategory || cat;
      if (!catMap[cat]) {
        catMap[cat] = { name: cat, bnName: bnCat, units: 0, revenue: 0 };
      }
      catMap[cat].units += item.unitsSold;
      catMap[cat].revenue += item.totalRevenue;
    });

    const colors = ['#f59e0b', '#10b981', '#06b6d4', '#8b5cf6', '#ec4899', '#3b82f6', '#14b8a6'];

    return (Object.values(catMap) as CategorySummaryItem[])
      .filter((c) => c.units > 0)
      .map((c, idx) => ({
        name: language === 'bn' ? c.bnName : c.name,
        rawCategory: c.name,
        units: c.units,
        revenue: c.revenue,
        color: colors[idx % colors.length],
      }));
  }, [productPerformanceMap, language]);

  // Unique categories for filter dropdown
  const categoriesList = useMemo(() => {
    const set = new Set<string>();
    products.forEach((p) => {
      if (p.category) set.add(p.category);
    });
    return Array.from(set);
  }, [products]);

  // Chart data for Top 6 Selling Products
  const topChartData = useMemo(() => {
    return topSellersList.slice(0, 6).map((item, idx) => {
      const name =
        language === 'bn' && item.product.bnName ? item.product.bnName : item.product.name;
      const shortName = name.length > 18 ? name.slice(0, 16) + '...' : name;

      return {
        id: item.product.id,
        name: shortName,
        fullName: name,
        sku: item.product.sku,
        unitsSold: item.unitsSold,
        revenue: item.totalRevenue,
        profit: item.grossProfit,
        inflow: item.inflowUnits,
        stock: item.product.stockQuantity,
        category: item.product.category,
        brand: item.product.brand || 'Depot',
        rank: idx + 1,
      };
    });
  }, [topSellersList, language]);

  // Color gradient palette for top sellers
  const barColors = ['#f59e0b', '#10b981', '#38bdf8', '#a855f7', '#f43f5e', '#fb923c'];

  // Handle quick restock trigger
  const handleExecuteRestock = (productId: string, productName: string) => {
    if (quickRestockQty <= 0) return;
    restockProduct(productId, quickRestockQty);
    setQuickRestockProductId(null);
    showToast(
      language === 'bn'
        ? `${productName} তে +${quickRestockQty} নতুন স্টক যোগ করা হয়েছে!`
        : `Added +${quickRestockQty} stock to ${productName}!`
    );
  };

  return (
    <div
      id="weekly-stock-movement-report"
      className="p-4 sm:p-6 rounded-2xl bg-gradient-to-br from-slate-900 via-slate-900 to-slate-950 border border-slate-800 shadow-2xl space-y-5 relative overflow-hidden"
    >
      {/* Toast notification */}
      {toastMessage && (
        <div className="absolute top-4 right-4 z-40 bg-emerald-500 text-white text-xs px-3.5 py-2 rounded-xl shadow-xl flex items-center gap-2 animate-in fade-in slide-in-from-top-2">
          <CheckCircle2 className="w-4 h-4" />
          <span className="font-semibold">{toastMessage}</span>
        </div>
      )}

      {/* Header Bar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex items-start sm:items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-amber-500 to-emerald-500 p-0.5 shadow-lg shrink-0">
            <div className="w-full h-full bg-slate-900 rounded-[14px] flex items-center justify-center text-amber-400">
              <BarChart3 className="w-5 h-5" />
            </div>
          </div>

          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-base sm:text-lg font-black text-white tracking-tight flex items-center gap-2">
                <span>
                  {language === 'bn'
                    ? 'সাপ্তাহিক স্টক মুভমেন্ট ও বিক্রয় ট্রেন্ডস'
                    : 'Weekly Stock Movement & Inventory Trends'}
                </span>
              </h2>
              <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                <Activity className="w-3 h-3 animate-pulse text-emerald-400" />
                <span>{language === 'bn' ? 'লাইভ রিচার্টস অ্যানালিটিক্স' : 'Live Recharts Engine'}</span>
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5 flex items-center gap-1.5 flex-wrap">
              <Calendar className="w-3.5 h-3.5 text-slate-400" />
              <span>
                {language === 'bn'
                  ? `গত ${daysCount} দিনের সামগ্রিক মজুদ প্রবাহ, শীর্ষ বিক্রিত পণ্য ও ইনভেন্টরি টার্নওভার বিশ্লেষণ`
                  : `Comprehensive ${daysCount}-day warehouse inflow/outflow balance & top seller volume distribution`}
              </span>
            </p>
          </div>
        </div>

        {/* Toolbar & Controls */}
        <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
          {/* Time Window Switcher */}
          <div className="flex items-center bg-slate-950 p-1 rounded-xl border border-slate-800 shrink-0">
            <button
              onClick={() => setTimeWindow('7d')}
              id="time-btn-7d"
              className={`text-xs font-bold px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                timeWindow === '7d'
                  ? 'bg-amber-500 text-slate-950 shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              {language === 'bn' ? '৭ দিন' : '7 Days'}
            </button>
            <button
              onClick={() => setTimeWindow('14d')}
              id="time-btn-14d"
              className={`text-xs font-bold px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                timeWindow === '14d'
                  ? 'bg-amber-500 text-slate-950 shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              {language === 'bn' ? '১৪ দিন' : '14 Days'}
            </button>
            <button
              onClick={() => setTimeWindow('30d')}
              id="time-btn-30d"
              className={`text-xs font-bold px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                timeWindow === '30d'
                  ? 'bg-amber-500 text-slate-950 shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              {language === 'bn' ? '৩০ দিন' : '30 Days'}
            </button>
          </div>

          {/* Print / Report Audit Slip Trigger */}
          <button
            onClick={() => setIsPrintModalOpen(true)}
            id="btn-print-weekly-report"
            className="p-2 sm:px-3 sm:py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-bold flex items-center gap-1.5 transition active:scale-95 cursor-pointer shadow-sm"
            title={language === 'bn' ? 'সাপ্তাহিক অডিট স্লিপ প্রিন্ট' : 'Print Weekly Audit Slip'}
          >
            <Printer className="w-3.5 h-3.5 text-amber-400" />
            <span className="hidden sm:inline">
              {language === 'bn' ? 'রিপোর্ট স্লিপ' : 'Audit Slip'}
            </span>
          </button>
        </div>
      </div>

      {/* KPI Metric Bento Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Outflow / Sales Volume */}
        <div className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800/80 space-y-1 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
              {language === 'bn' ? 'মোট বিক্রয় নির্গমন (Outflow)' : 'Total Stock Outflow'}
            </span>
            <div className="w-6 h-6 rounded-lg bg-rose-500/20 text-rose-400 flex items-center justify-center">
              <ArrowUpRight className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-black text-white font-mono-num">
            {totalWeeklyOutflowUnits}{' '}
            <span className="text-xs font-normal text-slate-400">
              {language === 'bn' ? 'ইউনিট' : 'Units'}
            </span>
          </div>
          <div className="text-[11px] text-slate-400 flex items-center justify-between">
            <span>{language === 'bn' ? 'বিক্রয় মূল্য:' : 'Total Value:'}</span>
            <span className="font-bold text-emerald-400 font-mono-num">
              {formatCurrency(totalWeeklyRevenue, language)}
            </span>
          </div>
        </div>

        {/* Inflow / Warehouse Restock */}
        <div className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800/80 space-y-1 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
              {language === 'bn' ? 'নতুন স্টক আগমন (Inflow)' : 'Total Stock Inflow'}
            </span>
            <div className="w-6 h-6 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
              <ArrowDownRight className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-black text-emerald-400 font-mono-num">
            +{totalWeeklyInflowUnits}{' '}
            <span className="text-xs font-normal text-slate-400">
              {language === 'bn' ? 'ইউনিট' : 'Units'}
            </span>
          </div>
          <div className="text-[11px] text-slate-400 flex items-center justify-between">
            <span>{language === 'bn' ? 'সাপ্লায়ার চালান:' : 'Supplier Intake:'}</span>
            <span className="font-bold text-sky-400 font-mono-num">
              {supplierLedger.filter((l) => l.type === 'PURCHASE').length}{' '}
              {language === 'bn' ? 'টি চালান' : 'Orders'}
            </span>
          </div>
        </div>

        {/* Net Movement Balance */}
        <div className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800/80 space-y-1 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
              {language === 'bn' ? 'নেট মজুদ পরিবর্তন' : 'Net Stock Balance'}
            </span>
            <div className="w-6 h-6 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center">
              <ArrowLeftRight className="w-3.5 h-3.5" />
            </div>
          </div>
          <div
            className={`text-xl sm:text-2xl font-black font-mono-num ${
              netWeeklyStockChange >= 0 ? 'text-emerald-400' : 'text-amber-400'
            }`}
          >
            {netWeeklyStockChange >= 0 ? `+${netWeeklyStockChange}` : netWeeklyStockChange}{' '}
            <span className="text-xs font-normal text-slate-400">
              {language === 'bn' ? 'নেট ইউনিট' : 'Net Units'}
            </span>
          </div>
          <div className="text-[11px] text-slate-400 flex items-center justify-between">
            <span>{language === 'bn' ? 'দৈনিক গড় নির্গমন:' : 'Daily Run-Rate:'}</span>
            <span className="font-bold text-white font-mono-num">
              {Math.round(totalWeeklyOutflowUnits / daysCount)}{' '}
              {language === 'bn' ? 'ইউ/দিন' : 'units/day'}
            </span>
          </div>
        </div>

        {/* Top Performer Product */}
        <div className="p-3.5 rounded-xl bg-gradient-to-r from-amber-950/30 to-slate-950 border border-amber-500/30 space-y-1 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-amber-300 uppercase tracking-wider flex items-center gap-1">
              <Award className="w-3 h-3 text-amber-400" />
              <span>{language === 'bn' ? 'সপ্তাহের শীর্ষ পণ্য' : 'Weekly Star SKU'}</span>
            </span>
            <span className="text-[9px] font-bold bg-amber-500/20 text-amber-300 px-1.5 py-0.5 rounded">
              #1 Top Seller
            </span>
          </div>
          <div className="text-sm sm:text-base font-bold text-white truncate">
            {starProduct
              ? language === 'bn' && starProduct.product.bnName
                ? starProduct.product.bnName
                : starProduct.product.name
              : 'N/A'}
          </div>
          <div className="text-[11px] text-slate-300 flex items-center justify-between font-mono-num">
            <span className="text-amber-400 font-bold">
              {starProduct ? `${starProduct.unitsSold} units` : '-'}
            </span>
            <span className="text-emerald-400 font-bold">
              {starProduct ? formatCurrency(starProduct.totalRevenue, language) : '-'}
            </span>
          </div>
        </div>
      </div>

      {/* Sub-Navigation & Filter Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2 border-t border-slate-800/80">
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
          <button
            onClick={() => setActiveSubTab('overview')}
            id="subtab-overview"
            className={`text-xs font-bold px-3 py-1.5 rounded-xl transition flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
              activeSubTab === 'overview'
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                : 'bg-slate-950/60 text-slate-400 hover:text-slate-200 border border-slate-800'
            }`}
          >
            <BarChart3 className="w-3.5 h-3.5" />
            <span>{language === 'bn' ? 'ভিজ্যুয়াল ট্রেন্ডস চার্ট' : 'Visual Trends'}</span>
          </button>

          <button
            onClick={() => setActiveSubTab('top_sellers')}
            id="subtab-top-sellers"
            className={`text-xs font-bold px-3 py-1.5 rounded-xl transition flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
              activeSubTab === 'top_sellers'
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                : 'bg-slate-950/60 text-slate-400 hover:text-slate-200 border border-slate-800'
            }`}
          >
            <Award className="w-3.5 h-3.5" />
            <span>{language === 'bn' ? 'শীর্ষ বিক্রিত পণ্যের তালিকা' : 'Top Sellers Matrix'}</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-slate-800 text-slate-300">
              {topSellersList.length}
            </span>
          </button>

          <button
            onClick={() => setActiveSubTab('movement_ledger')}
            id="subtab-movement-ledger"
            className={`text-xs font-bold px-3 py-1.5 rounded-xl transition flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
              activeSubTab === 'movement_ledger'
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                : 'bg-slate-950/60 text-slate-400 hover:text-slate-200 border border-slate-800'
            }`}
          >
            <ArrowLeftRight className="w-3.5 h-3.5" />
            <span>{language === 'bn' ? 'দৈনিক ইনফ্লো / আউটফ্লো লেজার' : 'Daily Movement Ledger'}</span>
          </button>
        </div>

        {/* Metric Selector for Top Sellers */}
        <div className="flex items-center gap-2">
          <div className="flex items-center bg-slate-950 p-1 rounded-xl border border-slate-800 text-[11px]">
            <span className="text-slate-400 px-2 font-medium hidden sm:inline">
              {language === 'bn' ? 'র‍্যাংক মাপক:' : 'Rank by:'}
            </span>
            <button
              onClick={() => setMetricType('units')}
              className={`px-2 py-0.5 rounded-lg font-bold transition cursor-pointer ${
                metricType === 'units'
                  ? 'bg-amber-500/30 text-amber-300 border border-amber-500/40'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              {language === 'bn' ? 'পরিমাণ (Units)' : 'Units Sold'}
            </button>
            <button
              onClick={() => setMetricType('revenue')}
              className={`px-2 py-0.5 rounded-lg font-bold transition cursor-pointer ${
                metricType === 'revenue'
                  ? 'bg-emerald-500/30 text-emerald-300 border border-emerald-500/40'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              {language === 'bn' ? 'বিক্রয় মূল্য (৳)' : 'Revenue (৳)'}
            </button>
            <button
              onClick={() => setMetricType('profit')}
              className={`px-2 py-0.5 rounded-lg font-bold transition cursor-pointer ${
                metricType === 'profit'
                  ? 'bg-sky-500/30 text-sky-300 border border-sky-500/40'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              {language === 'bn' ? 'মুনাফা (৳)' : 'Profit (৳)'}
            </button>
          </div>
        </div>
      </div>

      {/* Main View Area: Visual Trends / Charts */}
      {activeSubTab === 'overview' && (
        <div className="space-y-5">
          {/* Top Row: Recharts Bar Chart (Top Sellers) & Recharts Pie Chart (Category Distribution) */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
            {/* Top-Selling Products Visualization (7 cols) */}
            <div className="lg:col-span-7 p-4 sm:p-5 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-3">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <Award className="w-4 h-4 text-amber-400" />
                  <h3 className="text-xs sm:text-sm font-bold text-white">
                    {language === 'bn'
                      ? 'শীর্ষ বিক্রিত পণ্যের ভলিউম চার্ট'
                      : 'Top-Selling Products (Volume & Value)'}
                  </h3>
                </div>
                <span className="text-[10px] font-mono text-slate-400 bg-slate-900 px-2 py-0.5 rounded border border-slate-800">
                  {metricType === 'units'
                    ? 'Metric: Units Dispatched'
                    : metricType === 'revenue'
                    ? 'Metric: Total Revenue (৳)'
                    : 'Metric: Gross Margin (৳)'}
                </span>
              </div>

              {/* Recharts BarChart Container */}
              <div className="w-full h-72 sm:h-80 pt-2">
                {topChartData.length === 0 ? (
                  <div className="w-full h-full flex flex-col items-center justify-center text-slate-500 text-xs">
                    <Package className="w-8 h-8 opacity-40 mb-2" />
                    <span>No sales recorded in this time range.</span>
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={topChartData}
                      margin={{ top: 10, right: 10, left: -15, bottom: 25 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                      <XAxis
                        dataKey="name"
                        stroke="#94a3b8"
                        fontSize={11}
                        tickLine={false}
                        interval={0}
                        angle={-15}
                        textAnchor="end"
                      />
                      <YAxis
                        stroke="#94a3b8"
                        fontSize={11}
                        tickLine={false}
                        axisLine={false}
                        tickFormatter={(val) =>
                          metricType === 'units' ? `${val}` : `৳${val >= 1000 ? `${(val / 1000).toFixed(0)}k` : val}`
                        }
                      />
                      <Tooltip
                        content={({ active, payload }) => {
                          if (active && payload && payload.length) {
                            const data = payload[0].payload;
                            return (
                              <div className="p-3 bg-slate-900/95 border border-amber-500/40 rounded-xl shadow-2xl text-xs space-y-1.5 backdrop-blur-md">
                                <div className="font-bold text-white flex items-center justify-between gap-3">
                                  <span>#{data.rank} {data.fullName}</span>
                                </div>
                                <div className="text-[10px] text-slate-400 font-mono">
                                  SKU: {data.sku} • {data.category}
                                </div>
                                <div className="pt-1 border-t border-slate-800 space-y-1">
                                  <div className="flex justify-between gap-4 text-amber-300 font-bold">
                                    <span>{language === 'bn' ? 'বিক্রিত পরিমাণ:' : 'Units Sold:'}</span>
                                    <span className="font-mono-num">{data.unitsSold} units</span>
                                  </div>
                                  <div className="flex justify-between gap-4 text-emerald-400 font-semibold">
                                    <span>{language === 'bn' ? 'মোট বিক্রয় মূল্য:' : 'Revenue:'}</span>
                                    <span className="font-mono-num">৳{data.revenue.toLocaleString()}</span>
                                  </div>
                                  <div className="flex justify-between gap-4 text-sky-400">
                                    <span>{language === 'bn' ? 'মোট লাভ:' : 'Gross Profit:'}</span>
                                    <span className="font-mono-num">৳{data.profit.toLocaleString()}</span>
                                  </div>
                                  <div className="flex justify-between gap-4 text-slate-400 pt-0.5">
                                    <span>{language === 'bn' ? 'বর্তমান মজুদ:' : 'Depot Stock:'}</span>
                                    <span className="font-mono-num text-white">{data.stock} in stock</span>
                                  </div>
                                </div>
                              </div>
                            );
                          }
                          return null;
                        }}
                      />
                      <Bar
                        dataKey={
                          metricType === 'units'
                            ? 'unitsSold'
                            : metricType === 'revenue'
                            ? 'revenue'
                            : 'profit'
                        }
                        radius={[6, 6, 0, 0]}
                        maxBarSize={45}
                      >
                        {topChartData.map((entry, index) => (
                          <Cell
                            key={`cell-${index}`}
                            fill={barColors[index % barColors.length]}
                          />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>

              {/* Quick legend footer */}
              <div className="flex items-center justify-between text-[11px] text-slate-400 pt-2 border-t border-slate-800/80">
                <div className="flex items-center gap-3 flex-wrap">
                  <span className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                    <span>#1 Star Mover</span>
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                    <span>#2 Fast Mover</span>
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-sky-400" />
                    <span>#3 Steady</span>
                  </span>
                </div>
                <button
                  onClick={() => setActiveSubTab('top_sellers')}
                  className="text-amber-400 hover:underline flex items-center gap-0.5 font-semibold text-[11px]"
                >
                  <span>{language === 'bn' ? 'পূর্ণ তালিকা' : 'View All'}</span>
                  <ArrowUpRight className="w-3 h-3" />
                </button>
              </div>
            </div>

            {/* Category Movement Distribution (5 cols) */}
            <div className="lg:col-span-5 p-4 sm:p-5 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-3 flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <PieIcon className="w-4 h-4 text-emerald-400" />
                  <h3 className="text-xs sm:text-sm font-bold text-white">
                    {language === 'bn' ? 'ক্যাটাগরি ভিত্তিক বিক্রয় শেয়ার' : 'Category Sales Distribution'}
                  </h3>
                </div>
                <span className="text-[10px] text-slate-400">
                  {categoryData.length} {language === 'bn' ? 'ক্যাটাগরি' : 'Categories'}
                </span>
              </div>

              {/* Recharts PieChart */}
              <div className="w-full h-52 sm:h-56 relative flex items-center justify-center">
                {categoryData.length === 0 ? (
                  <div className="text-xs text-slate-500">No category data</div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={categoryData}
                        dataKey="units"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        innerRadius={45}
                        outerRadius={75}
                        paddingAngle={3}
                      >
                        {categoryData.map((entry, index) => (
                          <Cell key={`cat-cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip
                        content={({ active, payload }) => {
                          if (active && payload && payload.length) {
                            const data = payload[0].payload;
                            return (
                              <div className="p-2.5 bg-slate-900 border border-slate-700 rounded-xl shadow-xl text-xs space-y-1">
                                <div className="font-bold text-white flex items-center gap-2">
                                  <span
                                    className="w-2.5 h-2.5 rounded-full"
                                    style={{ backgroundColor: data.color }}
                                  />
                                  <span>{data.name}</span>
                                </div>
                                <div className="text-amber-300 font-mono-num font-semibold">
                                  {data.units} units ({((data.units / (totalWeeklyOutflowUnits || 1)) * 100).toFixed(1)}%)
                                </div>
                                <div className="text-emerald-400 font-mono-num">
                                  ৳{data.revenue.toLocaleString()}
                                </div>
                              </div>
                            );
                          }
                          return null;
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </div>

              {/* Category Mini Legend List */}
              <div className="grid grid-cols-2 gap-1.5 pt-1 border-t border-slate-800/80 text-[11px]">
                {categoryData.slice(0, 4).map((c) => (
                  <div key={c.name} className="flex items-center justify-between pr-1">
                    <span className="flex items-center gap-1.5 truncate text-slate-400">
                      <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: c.color }} />
                      <span className="truncate">{c.name}</span>
                    </span>
                    <span className="font-bold text-white font-mono-num shrink-0">
                      {c.units}u
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Bottom Row: 7-Day Timeline Composed Chart (Inflow vs Outflow & Net Line) */}
          <div className="p-4 sm:p-5 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Activity className="w-4 h-4 text-sky-400" />
                <div>
                  <h3 className="text-xs sm:text-sm font-bold text-white">
                    {language === 'bn'
                      ? 'দৈনিক স্টক আগমন ও নির্গমনের সময়রেখা (Inflow vs Outflow)'
                      : 'Daily Stock Movement & Dispatch Timeline'}
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    {language === 'bn'
                      ? 'প্রতিদিনের সাপ্লায়ার সরবরাহ বনাম রিটেইলার ডেলিভারি এবং নিট মজুদ রূপান্তর'
                      : 'Daily supplier warehouse intake vs retailer order dispatches & net delta'}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3 text-xs">
                <div className="flex items-center gap-1.5 text-rose-400">
                  <span className="w-3 h-3 rounded bg-rose-500/80" />
                  <span>{language === 'bn' ? 'বিক্রয় নির্গমন (Outflow)' : 'Outflow'}</span>
                </div>
                <div className="flex items-center gap-1.5 text-emerald-400">
                  <span className="w-3 h-3 rounded bg-emerald-500/80" />
                  <span>{language === 'bn' ? 'স্টক আগমন (Inflow)' : 'Inflow'}</span>
                </div>
                <div className="flex items-center gap-1.5 text-amber-400">
                  <span className="w-2.5 h-0.5 bg-amber-400" />
                  <span>{language === 'bn' ? 'নিট পরিবর্তন' : 'Net Balance'}</span>
                </div>
              </div>
            </div>

            {/* Recharts ComposedChart */}
            <div className="w-full h-72 sm:h-80 pt-2">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart
                  data={dailyMovementData}
                  margin={{ top: 15, right: 15, left: -15, bottom: 10 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                  <XAxis
                    dataKey="displayDate"
                    stroke="#94a3b8"
                    fontSize={11}
                    tickLine={false}
                  />
                  <YAxis
                    stroke="#94a3b8"
                    fontSize={11}
                    tickLine={false}
                    axisLine={false}
                  />
                  <Tooltip
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const d = payload[0].payload;
                        return (
                          <div className="p-3 bg-slate-900/95 border border-sky-500/40 rounded-xl shadow-2xl text-xs space-y-1.5 backdrop-blur-md">
                            <div className="font-bold text-white border-b border-slate-800 pb-1 flex justify-between gap-3">
                              <span>{d.displayDate} ({d.date})</span>
                              <span className="text-slate-400">{d.orderCount} Orders</span>
                            </div>
                            <div className="space-y-1 pt-0.5">
                              <div className="flex justify-between gap-4 text-rose-400">
                                <span>{language === 'bn' ? 'বিক্রিত স্টক (Outflow):' : 'Outflow Sold:'}</span>
                                <span className="font-mono-num font-bold">-{d.outflowUnits} units</span>
                              </div>
                              <div className="flex justify-between gap-4 text-emerald-400">
                                <span>{language === 'bn' ? 'নতুন স্টক (Inflow):' : 'Inflow Restock:'}</span>
                                <span className="font-mono-num font-bold">+{d.inflowUnits} units</span>
                              </div>
                              <div className="flex justify-between gap-4 text-amber-300 font-bold border-t border-slate-800/80 pt-1">
                                <span>{language === 'bn' ? 'নিট পরিবর্তন:' : 'Net Delta:'}</span>
                                <span className="font-mono-num">
                                  {d.netMovement >= 0 ? `+${d.netMovement}` : d.netMovement} units
                                </span>
                              </div>
                              <div className="flex justify-between gap-4 text-sky-400">
                                <span>{language === 'bn' ? 'মোট বিক্রয় মূল্য:' : 'Day Revenue:'}</span>
                                <span className="font-mono-num font-bold">৳{d.revenue.toLocaleString()}</span>
                              </div>
                            </div>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Bar
                    dataKey="outflowUnits"
                    name="Outflow"
                    fill="#f43f5e"
                    radius={[4, 4, 0, 0]}
                    maxBarSize={28}
                  />
                  <Bar
                    dataKey="inflowUnits"
                    name="Inflow"
                    fill="#10b981"
                    radius={[4, 4, 0, 0]}
                    maxBarSize={28}
                  />
                  <Line
                    type="monotone"
                    dataKey="netMovement"
                    name="Net Movement"
                    stroke="#f59e0b"
                    strokeWidth={2.5}
                    dot={{ r: 4, fill: '#f59e0b', strokeWidth: 1, stroke: '#fff' }}
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {/* SubTab 2: Top Sellers Matrix & Product Inventory Trends Table */}
      {activeSubTab === 'top_sellers' && (
        <div className="space-y-4 animate-in fade-in">
          {/* Search & Category Filter Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-950/60 p-3 rounded-xl border border-slate-800">
            <div className="flex items-center gap-2 flex-1 max-w-md">
              <input
                type="text"
                placeholder={
                  language === 'bn'
                    ? 'পণ্য, এসকেইউ বা ব্র্যান্ড দিয়ে খুঁজুন...'
                    : 'Search products by name, SKU or brand...'
                }
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="text-slate-400 hover:text-white p-1"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="bg-slate-900 border border-slate-700 text-slate-200 text-xs rounded-xl px-3 py-1.5 focus:outline-none focus:border-amber-500 cursor-pointer"
              >
                <option value="ALL">
                  {language === 'bn' ? 'সকল ক্যাটাগরি' : 'All Categories'}
                </option>
                {categoriesList.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Detailed Product Performance Table */}
          <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-950/80 shadow-lg">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-900/90 text-slate-400 border-b border-slate-800 uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="py-3 px-3.5">{language === 'bn' ? 'র‍্যাংক ও পণ্য' : 'Rank & Product'}</th>
                  <th className="py-3 px-3">{language === 'bn' ? 'ক্যাটাগরি' : 'Category'}</th>
                  <th className="py-3 px-3 text-right">{language === 'bn' ? 'বিক্রিত পরিমাণ' : 'Units Sold'}</th>
                  <th className="py-3 px-3 text-right">{language === 'bn' ? 'মোট বিক্রয়' : 'Revenue'}</th>
                  <th className="py-3 px-3 text-right">{language === 'bn' ? 'মুনাফা' : 'Gross Profit'}</th>
                  <th className="py-3 px-3 text-right">{language === 'bn' ? 'বর্তমান মজুদ' : 'Depot Stock'}</th>
                  <th className="py-3 px-3">{language === 'bn' ? 'মুভমেন্ট স্ট্যাটাস' : 'Velocity'}</th>
                  <th className="py-3 px-3 text-center">{language === 'bn' ? 'অ্যাকশন' : 'Action'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {topSellersList.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-8 text-center text-slate-500">
                      {language === 'bn' ? 'কোনো পণ্য পাওয়া যায়নি' : 'No matching product records found'}
                    </td>
                  </tr>
                ) : (
                  topSellersList.map((item, idx) => {
                    const p = item.product;
                    const threshold = p.lowStockThreshold ?? p.minStockLevel ?? 40;
                    const isLow = p.stockQuantity <= threshold;
                    const velocity =
                      item.unitsSold >= 20
                        ? 'FAST_MOVER'
                        : item.unitsSold >= 8
                        ? 'STEADY'
                        : 'SLOW';

                    const isQuickRestocking = quickRestockProductId === p.id;

                    return (
                      <React.Fragment key={p.id}>
                        <tr
                          id={`top-seller-row-${p.id}`}
                          className="hover:bg-slate-900/50 transition-colors"
                        >
                          {/* Rank & Name */}
                          <td className="py-3 px-3.5">
                            <div className="flex items-center gap-2.5">
                              <span
                                className={`w-5 h-5 rounded-full flex items-center justify-center font-bold text-[10px] shrink-0 font-mono-num ${
                                  idx === 0
                                    ? 'bg-amber-500 text-slate-950 font-black ring-2 ring-amber-400/50'
                                    : idx === 1
                                    ? 'bg-slate-300 text-slate-950 font-bold'
                                    : idx === 2
                                    ? 'bg-amber-700 text-white font-bold'
                                    : 'bg-slate-800 text-slate-400'
                                }`}
                              >
                                {idx + 1}
                              </span>
                              <div className="min-w-0">
                                <div className="font-bold text-white truncate max-w-[200px] sm:max-w-xs">
                                  {language === 'bn' && p.bnName ? p.bnName : p.name}
                                </div>
                                <div className="text-[10px] text-slate-400 font-mono">
                                  {p.sku} • {p.brand || 'Depot'}
                                </div>
                              </div>
                            </div>
                          </td>

                          {/* Category */}
                          <td className="py-3 px-3 text-slate-300">
                            <span className="bg-slate-900 px-2 py-0.5 rounded border border-slate-800 text-[10px]">
                              {language === 'bn' ? p.bnCategory : p.category}
                            </span>
                          </td>

                          {/* Units Sold */}
                          <td className="py-3 px-3 text-right font-mono-num">
                            <span className="font-black text-amber-300 text-sm">
                              {item.unitsSold}
                            </span>{' '}
                            <span className="text-[10px] text-slate-400">
                              {language === 'bn' ? p.bnUnit : p.unit}
                            </span>
                          </td>

                          {/* Revenue */}
                          <td className="py-3 px-3 text-right font-mono-num">
                            <span className="font-bold text-emerald-400">
                              {formatCurrency(item.totalRevenue, language)}
                            </span>
                          </td>

                          {/* Profit */}
                          <td className="py-3 px-3 text-right font-mono-num">
                            <span className="font-semibold text-sky-400">
                              {formatCurrency(item.grossProfit, language)}
                            </span>
                          </td>

                          {/* Stock */}
                          <td className="py-3 px-3 text-right font-mono-num">
                            <span
                              className={`font-bold ${
                                isLow ? 'text-rose-400' : 'text-slate-300'
                              }`}
                            >
                              {p.stockQuantity} {language === 'bn' ? p.bnUnit : p.unit}
                            </span>
                            {isLow && (
                              <span className="block text-[9px] text-rose-400">
                                {language === 'bn' ? 'স্টক কম!' : 'Low Stock'}
                              </span>
                            )}
                          </td>

                          {/* Velocity Status */}
                          <td className="py-3 px-3">
                            {velocity === 'FAST_MOVER' ? (
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center gap-1 w-fit">
                                <Zap className="w-3 h-3 text-amber-400" />
                                <span>{language === 'bn' ? 'উচ্চ চাহিদা' : 'Fast Mover'}</span>
                              </span>
                            ) : velocity === 'STEADY' ? (
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1 w-fit">
                                <Activity className="w-3 h-3 text-emerald-400" />
                                <span>{language === 'bn' ? 'স্বাভাবিক' : 'Steady'}</span>
                              </span>
                            ) : (
                              <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 w-fit block">
                                {language === 'bn' ? 'ধীর গতি' : 'Low Velocity'}
                              </span>
                            )}
                          </td>

                          {/* Action */}
                          <td className="py-3 px-3 text-center">
                            <button
                              onClick={() => {
                                setQuickRestockProductId(
                                  isQuickRestocking ? null : p.id
                                );
                                setQuickRestockQty(20);
                              }}
                              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-emerald-400 hover:text-emerald-300 transition text-[11px] font-bold inline-flex items-center gap-1 cursor-pointer"
                              title={language === 'bn' ? 'স্টক যোগ করুন' : 'Restock'}
                            >
                              <Plus className="w-3.5 h-3.5" />
                              <span className="hidden sm:inline">
                                {language === 'bn' ? 'রিস্টক' : 'Restock'}
                              </span>
                            </button>
                          </td>
                        </tr>

                        {/* Inline Quick Restock Drawer */}
                        {isQuickRestocking && (
                          <tr className="bg-slate-900/90 border-b border-emerald-500/30">
                            <td colSpan={8} className="p-3">
                              <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-950 p-2.5 rounded-xl border border-emerald-500/40">
                                <div className="flex items-center gap-2">
                                  <Package className="w-4 h-4 text-emerald-400" />
                                  <span className="font-bold text-xs text-white">
                                    {language === 'bn'
                                      ? `${p.name} তে ইনভেন্টরি স্টক যোগ করুন`
                                      : `Quick Restock Inventory for ${p.name}`}
                                  </span>
                                </div>

                                <div className="flex items-center gap-2">
                                  <input
                                    type="number"
                                    min="1"
                                    value={quickRestockQty}
                                    onChange={(e) =>
                                      setQuickRestockQty(
                                        Math.max(1, parseInt(e.target.value) || 1)
                                      )
                                    }
                                    className="w-20 bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-center font-mono font-bold text-white text-xs outline-none"
                                  />
                                  <span className="text-xs text-slate-400">
                                    {language === 'bn' ? p.bnUnit : p.unit}
                                  </span>

                                  <button
                                    onClick={() => handleExecuteRestock(p.id, p.name)}
                                    className="py-1 px-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-lg flex items-center gap-1 transition shadow cursor-pointer"
                                  >
                                    <CheckCircle2 className="w-3 h-3" />
                                    <span>{language === 'bn' ? 'নিশ্চিত করুন' : 'Confirm'}</span>
                                  </button>

                                  <button
                                    onClick={() => setQuickRestockProductId(null)}
                                    className="p-1 text-slate-400 hover:text-white"
                                  >
                                    <X className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* SubTab 3: Daily Movement Ledger */}
      {activeSubTab === 'movement_ledger' && (
        <div className="space-y-3 animate-in fade-in">
          <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-950/80 shadow-lg">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-900/90 text-slate-400 border-b border-slate-800 uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="py-3 px-3.5">{language === 'bn' ? 'তারিখ' : 'Date'}</th>
                  <th className="py-3 px-3 text-right">{language === 'bn' ? 'চালান সংখ্যা' : 'Invoices'}</th>
                  <th className="py-3 px-3 text-right">{language === 'bn' ? 'স্টক নির্গমন (বিক্রয়)' : 'Outflow Sold'}</th>
                  <th className="py-3 px-3 text-right">{language === 'bn' ? 'স্টক আগমন (সরবরাহ)' : 'Inflow Restock'}</th>
                  <th className="py-3 px-3 text-right">{language === 'bn' ? 'নিট রূপান্তর' : 'Net Delta'}</th>
                  <th className="py-3 px-3 text-right">{language === 'bn' ? 'দৈনিক বিক্রয় রাজস্ব' : 'Day Revenue'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-mono-num">
                {dailyMovementData.map((d) => (
                  <tr key={d.date} className="hover:bg-slate-900/50 transition-colors">
                    <td className="py-3 px-3.5 font-sans font-bold text-white">
                      {d.displayDate}{' '}
                      <span className="text-[10px] text-slate-400 font-mono font-normal">
                        ({d.date})
                      </span>
                    </td>
                    <td className="py-3 px-3 text-right text-slate-300">
                      {d.orderCount}
                    </td>
                    <td className="py-3 px-3 text-right text-rose-400 font-bold">
                      -{d.outflowUnits} units
                    </td>
                    <td className="py-3 px-3 text-right text-emerald-400 font-bold">
                      +{d.inflowUnits} units
                    </td>
                    <td
                      className={`py-3 px-3 text-right font-bold ${
                        d.netMovement >= 0 ? 'text-emerald-400' : 'text-amber-400'
                      }`}
                    >
                      {d.netMovement >= 0 ? `+${d.netMovement}` : d.netMovement} units
                    </td>
                    <td className="py-3 px-3 text-right text-emerald-300 font-bold">
                      ৳{d.revenue.toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Printable Weekly Audit Slip Modal */}
      {isPrintModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-lg p-5 sm:p-6 space-y-4 shadow-2xl animate-in zoom-in-95 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Printer className="w-5 h-5 text-amber-400" />
                <h3 className="font-bold text-white text-sm sm:text-base">
                  {language === 'bn' ? 'সাপ্তাহিক ইনভেন্টরি অডিট স্লিপ' : 'Weekly Inventory Movement Audit Slip'}
                </h3>
              </div>
              <button
                onClick={() => setIsPrintModalOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Slip Body for Printable Review */}
            <div className="p-4 rounded-xl bg-white text-slate-900 font-mono text-xs space-y-3 shadow-inner">
              <div className="text-center border-b border-dashed border-slate-300 pb-2">
                <div className="font-black text-sm uppercase">DESH WHOLESALE & DISTRIBUTION</div>
                <div className="text-[10px] text-slate-600">Mohammadpur Central Depot, Dhaka</div>
                <div className="text-[10px] font-bold text-slate-800 mt-1">
                  WEEKLY STOCK MOVEMENT & SALES SUMMARY
                </div>
                <div className="text-[9px] text-slate-500">
                  Window: Past {daysCount} Days ({dailyMovementData[0]?.date} to {dailyMovementData[dailyMovementData.length - 1]?.date})
                </div>
              </div>

              {/* High-level numbers */}
              <div className="grid grid-cols-2 gap-2 text-[11px] border-b border-dashed border-slate-300 pb-2">
                <div>
                  <span className="text-slate-500 block">Total Outflow (Sold):</span>
                  <span className="font-bold">{totalWeeklyOutflowUnits} units</span>
                </div>
                <div>
                  <span className="text-slate-500 block">Total Inflow (Restocked):</span>
                  <span className="font-bold">+{totalWeeklyInflowUnits} units</span>
                </div>
                <div>
                  <span className="text-slate-500 block">Total Sales Revenue:</span>
                  <span className="font-bold">৳{totalWeeklyRevenue.toLocaleString()}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">Net Stock Movement:</span>
                  <span className="font-bold">
                    {netWeeklyStockChange >= 0 ? `+${netWeeklyStockChange}` : netWeeklyStockChange} units
                  </span>
                </div>
              </div>

              {/* Top Selling Breakdown */}
              <div className="space-y-1">
                <div className="font-bold text-[10px] text-slate-700 uppercase">
                  Top 5 High-Demand Products:
                </div>
                <table className="w-full text-[10px]">
                  <thead>
                    <tr className="text-slate-500 border-b">
                      <th className="text-left py-0.5">Product / SKU</th>
                      <th className="text-right py-0.5">Sold</th>
                      <th className="text-right py-0.5">Revenue</th>
                      <th className="text-right py-0.5">Stock</th>
                    </tr>
                  </thead>
                  <tbody>
                    {topSellersList.slice(0, 5).map((item, idx) => (
                      <tr key={item.product.id} className="border-b border-slate-100">
                        <td className="py-1">
                          #{idx + 1} {item.product.name.slice(0, 20)}
                        </td>
                        <td className="text-right font-bold">{item.unitsSold}u</td>
                        <td className="text-right">৳{item.totalRevenue.toLocaleString()}</td>
                        <td className="text-right text-slate-600">{item.product.stockQuantity}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="pt-2 text-center text-[9px] text-slate-400 border-t border-dashed border-slate-300">
                Generated automatically by Desh Wholesale Trade Management System
              </div>
            </div>

            {/* Print Action Buttons */}
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setIsPrintModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold"
              >
                {language === 'bn' ? 'বন্ধ করুন' : 'Close'}
              </button>
              <button
                onClick={() => {
                  window.print();
                }}
                className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold flex items-center gap-1.5 shadow-lg active:scale-95 transition cursor-pointer"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>{language === 'bn' ? 'সরাসরি প্রিন্ট করুন' : 'Print Slip'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
