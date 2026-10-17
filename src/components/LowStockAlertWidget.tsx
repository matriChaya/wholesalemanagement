import React, { useState } from 'react';
import { useWholesale } from '../context/WholesaleContext';
import { Product } from '../types';
import { formatCurrency } from '../utils/translations';
import {
  AlertTriangle,
  Sparkles,
  ChevronRight,
  Sliders,
  Plus,
  Minus,
  Check,
  PackageCheck,
  Building2,
  Phone,
  RefreshCw,
  Layers,
  ArrowUpRight,
  TrendingDown,
  Info,
  X
} from 'lucide-react';

interface LowStockAlertWidgetProps {
  onOpenScanner?: () => void;
  onNavigateTab?: (tab: string) => void;
}

export const LowStockAlertWidget: React.FC<LowStockAlertWidgetProps> = ({
  onOpenScanner,
  onNavigateTab,
}) => {
  const {
    products,
    suppliers,
    language,
    currentRole,
    updateProductThreshold,
    restockProduct,
  } = useWholesale();

  const [activeFilter, setActiveFilter] = useState<'all_low' | 'critical' | 'warning' | 'all'>('all_low');
  const [editingThresholdProductId, setEditingThresholdProductId] = useState<string | null>(null);
  const [tempThresholdValue, setTempThresholdValue] = useState<number>(0);
  const [restockingProductId, setRestockingProductId] = useState<string | null>(null);
  const [restockAmount, setRestockAmount] = useState<number>(10);
  const [successToast, setSuccessToast] = useState<string | null>(null);

  // Helper to get effective threshold
  const getThreshold = (product: Product): number => {
    return product.lowStockThreshold ?? product.minStockLevel ?? 50;
  };

  // Helper for stock severity
  const getStockStatus = (product: Product): 'CRITICAL' | 'WARNING' | 'HEALTHY' => {
    const threshold = getThreshold(product);
    if (product.stockQuantity <= Math.max(5, threshold * 0.35) || product.stockQuantity === 0) {
      return 'CRITICAL';
    }
    if (product.stockQuantity <= threshold) {
      return 'WARNING';
    }
    return 'HEALTHY';
  };

  // Group and compute metrics
  const lowStockItems = products.filter((p) => p.stockQuantity <= getThreshold(p));
  const criticalItems = lowStockItems.filter((p) => getStockStatus(p) === 'CRITICAL');
  const warningItems = lowStockItems.filter((p) => getStockStatus(p) === 'WARNING');

  // Total deficit replenishment cost
  const totalReplenishmentDeficitCost = lowStockItems.reduce((sum, p) => {
    const threshold = getThreshold(p);
    const deficit = Math.max(0, threshold - p.stockQuantity);
    return sum + deficit * p.costPrice;
  }, 0);

  // Display items based on selected filter
  const displayedProducts = (() => {
    switch (activeFilter) {
      case 'critical':
        return criticalItems;
      case 'warning':
        return warningItems;
      case 'all':
        return products;
      case 'all_low':
      default:
        return lowStockItems;
    }
  })();

  // Trigger temporary success notification
  const notifySuccess = (msg: string) => {
    setSuccessToast(msg);
    setTimeout(() => setSuccessToast(null), 3000);
  };

  // Handle threshold edit save
  const handleSaveThreshold = (productId: string) => {
    updateProductThreshold(productId, tempThresholdValue);
    setEditingThresholdProductId(null);
    notifySuccess(
      language === 'bn'
        ? 'সতর্কবার্তা সীমা আপডেট করা হয়েছে!'
        : 'Stock alert threshold updated!'
    );
  };

  // Handle quick restock
  const handleExecuteRestock = (productId: string, productName: string) => {
    if (restockAmount <= 0) return;
    restockProduct(productId, restockAmount);
    setRestockingProductId(null);
    notifySuccess(
      language === 'bn'
        ? `${productName} তে +${restockAmount} নতুন স্টক যোগ করা হয়েছে!`
        : `Added +${restockAmount} stock to ${productName}!`
    );
  };

  return (
    <div
      id="low-stock-alert-widget"
      className="p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-slate-900 via-slate-900 to-amber-950/20 border border-slate-800 shadow-xl space-y-4 relative overflow-hidden"
    >
      {/* Toast Notification */}
      {successToast && (
        <div className="absolute top-3 right-3 z-30 bg-emerald-500 text-white text-xs px-3 py-1.5 rounded-lg shadow-lg flex items-center gap-1.5 animate-in fade-in slide-in-from-top-2">
          <Check className="w-3.5 h-3.5" />
          <span>{successToast}</span>
        </div>
      )}

      {/* Widget Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0 shadow-inner">
            <AlertTriangle className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-bold text-white text-sm sm:text-base flex items-center gap-1.5">
                <span>{language === 'bn' ? 'কম মজুদের সতর্কবার্তা' : 'Low Stock Alert'}</span>
              </h3>
              {lowStockItems.length > 0 ? (
                <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/30">
                  {lowStockItems.length} {language === 'bn' ? 'টি পণ্য সীমার নিচে' : 'Items Below Threshold'}
                </span>
              ) : (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  {language === 'bn' ? 'স্টক পর্যাপ্ত' : 'Depot Well Stocked'}
                </span>
              )}
            </div>
            <p className="text-[11px] text-slate-400 mt-0.5">
              {language === 'bn'
                ? 'ইনভেন্টরিতে পূর্বনির্ধারিত মিনিমাম থ্রেশহোল্ডের নিচে নেমে যাওয়া পণ্যসমূহ'
                : 'Products falling below pre-configured inventory reorder levels'}
            </p>
          </div>
        </div>

        {/* Top Action Buttons */}
        <div className="flex items-center gap-2 shrink-0">
          {onOpenScanner && (
            <button
              onClick={onOpenScanner}
              id="low-stock-restock-scan-btn"
              className="py-1.5 px-3 rounded-xl bg-gradient-to-r from-rose-600 to-amber-600 hover:from-rose-500 hover:to-amber-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-md active:scale-95 transition cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>{language === 'bn' ? 'চালান স্ক্যান করে স্টক যোগ' : 'Scan Invoice to Restock'}</span>
            </button>
          )}
        </div>
      </div>

      {/* Filter Tabs & Threshold Summary Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pt-1 border-t border-slate-800/80">
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
          <button
            onClick={() => setActiveFilter('all_low')}
            id="filter-all-low"
            className={`text-[11px] font-bold px-2.5 py-1 rounded-lg transition-all flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
              activeFilter === 'all_low'
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                : 'bg-slate-950/60 text-slate-400 hover:text-slate-200 border border-slate-800'
            }`}
          >
            <span>{language === 'bn' ? 'সব সতর্কবার্তা' : 'All Alerts'}</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-slate-800 text-slate-300">
              {lowStockItems.length}
            </span>
          </button>

          <button
            onClick={() => setActiveFilter('critical')}
            id="filter-critical"
            className={`text-[11px] font-bold px-2.5 py-1 rounded-lg transition-all flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
              activeFilter === 'critical'
                ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                : 'bg-slate-950/60 text-slate-400 hover:text-slate-200 border border-slate-800'
            }`}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-rose-400 animate-ping" />
            <span>{language === 'bn' ? 'জরুরি ঘাটতি (<৩৫%)' : 'Critical Deficit'}</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-rose-950 text-rose-300">
              {criticalItems.length}
            </span>
          </button>

          <button
            onClick={() => setActiveFilter('warning')}
            id="filter-warning"
            className={`text-[11px] font-bold px-2.5 py-1 rounded-lg transition-all flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
              activeFilter === 'warning'
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                : 'bg-slate-950/60 text-slate-400 hover:text-slate-200 border border-slate-800'
            }`}
          >
            <span>{language === 'bn' ? 'সীমার কাছাকাছি' : 'Approaching Limit'}</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-slate-800 text-slate-300">
              {warningItems.length}
            </span>
          </button>

          <button
            onClick={() => setActiveFilter('all')}
            id="filter-all-products"
            className={`text-[11px] font-bold px-2.5 py-1 rounded-lg transition-all flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
              activeFilter === 'all'
                ? 'bg-slate-800 text-white border border-slate-700'
                : 'bg-slate-950/60 text-slate-400 hover:text-slate-200 border border-slate-800'
            }`}
          >
            <Layers className="w-3 h-3" />
            <span>{language === 'bn' ? 'সকল আইটেম' : 'All Products'}</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-slate-800 text-slate-300">
              {products.length}
            </span>
          </button>
        </div>

        {/* Estimated replenishment budget */}
        {lowStockItems.length > 0 && (
          <div className="text-[11px] text-slate-400 flex items-center gap-1.5 shrink-0 bg-slate-950/60 px-2.5 py-1 rounded-lg border border-slate-800/80">
            <span>{language === 'bn' ? 'ঘাটতি পূরণে সম্ভাব্য ব্যয়:' : 'Est. Restock Cost:'}</span>
            <span className="font-bold text-amber-400 font-mono-num">
              {formatCurrency(totalReplenishmentDeficitCost, language)}
            </span>
          </div>
        )}
      </div>

      {/* Product List Grid / Cards */}
      <div className="space-y-2.5">
        {displayedProducts.length === 0 ? (
          <div className="py-8 text-center bg-slate-950/40 rounded-xl border border-dashed border-slate-800 space-y-2">
            <PackageCheck className="w-8 h-8 text-emerald-400 mx-auto opacity-80" />
            <div className="font-bold text-sm text-white">
              {language === 'bn'
                ? 'এই ক্যাটাগরিতে কোনো সতর্কবার্তা নেই!'
                : 'No low stock alerts in this category!'}
            </div>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              {language === 'bn'
                ? 'সকল পাইকারি পণ্যের বর্তমান মজুদ নির্ধারিত সীমার উপরে সুরক্ষিত আছে।'
                : 'All wholesale items maintain inventory above their configured reorder thresholds.'}
            </p>
          </div>
        ) : (
          displayedProducts.map((product) => {
            const threshold = getThreshold(product);
            const status = getStockStatus(product);
            const isLow = product.stockQuantity <= threshold;
            const stockRatio = Math.min(100, Math.round((product.stockQuantity / threshold) * 100));
            const deficitUnits = Math.max(0, threshold - product.stockQuantity);
            const deficitCost = deficitUnits * product.costPrice;
            const supplier = suppliers.find((s) => s.id === product.supplierId);

            const isEditingThreshold = editingThresholdProductId === product.id;
            const isRestocking = restockingProductId === product.id;

            return (
              <div
                key={product.id}
                id={`low-stock-item-${product.id}`}
                className={`p-3 sm:p-3.5 rounded-xl border transition-all ${
                  status === 'CRITICAL'
                    ? 'bg-gradient-to-r from-rose-950/30 via-slate-950/80 to-slate-950 border-rose-500/30 hover:border-rose-500/50'
                    : isLow
                    ? 'bg-gradient-to-r from-amber-950/20 via-slate-950/80 to-slate-950 border-amber-500/30 hover:border-amber-500/50'
                    : 'bg-slate-950/70 border-slate-800/80 hover:border-slate-700'
                }`}
              >
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                  {/* Product Details */}
                  <div className="flex items-start gap-3 min-w-0 flex-1">
                    {product.image ? (
                      <img
                        src={product.image}
                        alt={product.name}
                        className="w-11 h-11 rounded-lg object-cover border border-slate-800 shrink-0 bg-slate-900"
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <div className="w-11 h-11 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-500 shrink-0 font-bold text-xs">
                        {product.sku.slice(0, 3)}
                      </div>
                    )}

                    <div className="min-w-0 flex-1 space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        {/* Status Chip */}
                        {status === 'CRITICAL' ? (
                          <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/40 flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-rose-400 animate-ping" />
                            <span>{language === 'bn' ? 'জরুরি ঘাটতি' : 'Critical'}</span>
                          </span>
                        ) : isLow ? (
                          <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40">
                            {language === 'bn' ? 'কম স্টক' : 'Low Stock'}
                          </span>
                        ) : (
                          <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                            {language === 'bn' ? 'পর্যাপ্ত' : 'Safe Stock'}
                          </span>
                        )}

                        <span className="font-mono text-[10px] text-slate-400 font-semibold">
                          {product.sku}
                        </span>

                        {product.brand && (
                          <span className="text-[10px] text-slate-400 bg-slate-900 px-1.5 py-0.2 rounded border border-slate-800">
                            {product.brand}
                          </span>
                        )}

                        <span className="text-[10px] text-slate-400">
                          {language === 'bn' ? product.bnCategory : product.category}
                        </span>
                      </div>

                      {/* Name */}
                      <div className="font-bold text-xs sm:text-sm text-white truncate">
                        {language === 'bn' && product.bnName ? product.bnName : product.name}
                      </div>

                      {/* Supplier Connection */}
                      <div className="flex items-center gap-2 text-[11px] text-slate-400 flex-wrap">
                        <span className="flex items-center gap-1 text-slate-400">
                          <Building2 className="w-3 h-3 text-slate-400" />
                          <span>{product.supplierName}</span>
                        </span>
                        {supplier?.phone && (
                          <a
                            href={`tel:${supplier.phone}`}
                            className="flex items-center gap-0.5 text-sky-400 hover:underline text-[10px]"
                            title="Call Supplier"
                          >
                            <Phone className="w-2.5 h-2.5" />
                            <span>{supplier.phone}</span>
                          </a>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Stock Gauge & Threshold Breakdown */}
                  <div className="flex items-center justify-between md:justify-end gap-4 shrink-0 pt-2 md:pt-0 border-t md:border-t-0 border-slate-800/80">
                    <div className="space-y-1 text-right">
                      {/* Current Stock vs Pre-set Threshold */}
                      <div className="flex items-center justify-end gap-2 text-xs">
                        <span className="text-slate-400">{language === 'bn' ? 'বর্তমান মজুদ:' : 'In Stock:'}</span>
                        <span
                          className={`font-black font-mono-num text-sm ${
                            status === 'CRITICAL'
                              ? 'text-rose-400'
                              : isLow
                              ? 'text-amber-400'
                              : 'text-emerald-400'
                          }`}
                        >
                          {product.stockQuantity} {language === 'bn' ? product.bnUnit : product.unit}
                        </span>
                        <span className="text-slate-400">/</span>
                        <span className="text-slate-400 font-mono-num font-semibold">
                          {threshold} {language === 'bn' ? product.bnUnit : product.unit}
                        </span>
                      </div>

                      {/* Progress meter */}
                      <div className="w-36 sm:w-44 h-2 bg-slate-800 rounded-full overflow-hidden ml-auto">
                        <div
                          className={`h-full rounded-full transition-all ${
                            status === 'CRITICAL'
                              ? 'bg-rose-500'
                              : isLow
                              ? 'bg-amber-500'
                              : 'bg-emerald-500'
                          }`}
                          style={{ width: `${stockRatio}%` }}
                        />
                      </div>

                      {/* Deficit calculation */}
                      <div className="flex items-center justify-end gap-2 text-[10px] text-slate-400">
                        {deficitUnits > 0 ? (
                          <>
                            <span className="text-rose-400 font-bold">
                              -{deficitUnits} {language === 'bn' ? product.bnUnit : product.unit} {language === 'bn' ? 'ঘাটতি' : 'deficit'}
                            </span>
                            <span>•</span>
                            <span className="text-slate-400 font-mono-num">
                              ≈ {formatCurrency(deficitCost, language)}
                            </span>
                          </>
                        ) : (
                          <span className="text-emerald-400 font-medium">
                            +{product.stockQuantity - threshold} {language === 'bn' ? 'অতিরিক্ত মজুদ' : 'above threshold'}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Action Buttons (Restock & Threshold Edit) */}
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        onClick={() => {
                          setRestockingProductId(product.id);
                          setRestockAmount(Math.max(10, deficitUnits || 10));
                          setEditingThresholdProductId(null);
                        }}
                        id={`btn-quick-restock-${product.id}`}
                        className="p-2 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/30 hover:border-emerald-500/50 transition flex items-center gap-1 text-xs font-bold active:scale-95 cursor-pointer"
                        title={language === 'bn' ? 'দ্রুত স্টক যোগ করুন' : 'Quick Restock'}
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">{language === 'bn' ? 'স্টক যোগ' : 'Restock'}</span>
                      </button>

                      <button
                        onClick={() => {
                          setEditingThresholdProductId(product.id);
                          setTempThresholdValue(threshold);
                          setRestockingProductId(null);
                        }}
                        id={`btn-edit-threshold-${product.id}`}
                        className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition flex items-center gap-1 text-xs active:scale-95 cursor-pointer"
                        title={language === 'bn' ? 'সীমা পরিবর্তন করুন' : 'Configure Threshold'}
                      >
                        <Sliders className="w-3.5 h-3.5 text-amber-400" />
                        <span className="hidden sm:inline">{language === 'bn' ? 'সীমা' : 'Threshold'}</span>
                      </button>
                    </div>
                  </div>
                </div>

                {/* Inline Restock Drawer/Panel */}
                {isRestocking && (
                  <div className="mt-3 p-3 rounded-xl bg-slate-900/90 border border-emerald-500/40 space-y-2.5 animate-in fade-in">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <PackageCheck className="w-4 h-4 text-emerald-400" />
                        <span className="font-bold text-xs text-white">
                          {language === 'bn'
                            ? `ইনভেন্টরিতে স্টক যোগ করুন (${product.name})`
                            : `Quick Restock Inventory (${product.name})`}
                        </span>
                      </div>
                      <button
                        onClick={() => setRestockingProductId(null)}
                        className="p-1 text-slate-400 hover:text-white"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <div className="flex flex-wrap items-center gap-3">
                      <div className="flex items-center gap-1.5 bg-slate-950 p-1 rounded-xl border border-slate-800">
                        <button
                          onClick={() => setRestockAmount((prev) => Math.max(1, prev - 5))}
                          className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-white cursor-pointer"
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <input
                          type="number"
                          value={restockAmount}
                          onChange={(e) => setRestockAmount(Math.max(1, parseInt(e.target.value) || 0))}
                          className="w-16 text-center bg-transparent text-white font-mono font-bold text-sm outline-none"
                        />
                        <span className="text-xs text-slate-400 pr-1">
                          {language === 'bn' ? product.bnUnit : product.unit}
                        </span>
                        <button
                          onClick={() => setRestockAmount((prev) => prev + 5)}
                          className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-white cursor-pointer"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>

                      {/* Quick preset buttons */}
                      <div className="flex items-center gap-1 text-[11px]">
                        {deficitUnits > 0 && (
                          <button
                            onClick={() => setRestockAmount(deficitUnits)}
                            className="px-2 py-1 rounded-lg bg-rose-500/20 text-rose-300 border border-rose-500/30 hover:bg-rose-500/30 cursor-pointer"
                          >
                            {language === 'bn' ? `ঘাটতি পূরণ (+${deficitUnits})` : `Full Deficit (+${deficitUnits})`}
                          </button>
                        )}
                        <button
                          onClick={() => setRestockAmount(20)}
                          className="px-2 py-1 rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700 cursor-pointer"
                        >
                          +20
                        </button>
                        <button
                          onClick={() => setRestockAmount(50)}
                          className="px-2 py-1 rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700 cursor-pointer"
                        >
                          +50
                        </button>
                      </div>

                      {/* Total cost for restock */}
                      <div className="ml-auto text-right text-xs">
                        <span className="text-slate-400 block text-[10px]">
                          {language === 'bn' ? 'ক্রয় মূল্য' : 'Cost'}:
                        </span>
                        <span className="font-bold text-white font-mono-num">
                          {formatCurrency(restockAmount * product.costPrice, language)}
                        </span>
                      </div>

                      <button
                        onClick={() => handleExecuteRestock(product.id, product.name)}
                        id={`submit-restock-${product.id}`}
                        className="py-1.5 px-4 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 shadow-md active:scale-95 transition cursor-pointer"
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span>{language === 'bn' ? 'স্টক নিশ্চিত করুন' : 'Confirm Restock'}</span>
                      </button>
                    </div>
                  </div>
                )}

                {/* Inline Threshold Setting Drawer/Panel */}
                {isEditingThreshold && (
                  <div className="mt-3 p-3 rounded-xl bg-slate-900/90 border border-amber-500/40 space-y-2.5 animate-in fade-in">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Sliders className="w-4 h-4 text-amber-400" />
                        <span className="font-bold text-xs text-white">
                          {language === 'bn'
                            ? `সতর্কবার্তা সীমা নির্ধারণ (${product.name})`
                            : `Set Reorder Threshold (${product.name})`}
                        </span>
                      </div>
                      <button
                        onClick={() => setEditingThresholdProductId(null)}
                        className="p-1 text-slate-400 hover:text-white"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <p className="text-[11px] text-slate-400">
                      {language === 'bn'
                        ? 'মজুদ এই পরিমাণের নিচে নামলে ড্যাশবোর্ডে স্বয়ংক্রিয় সতর্কবার্তা দেখাবে।'
                        : 'When depot stock falls below this quantity, automatic low stock warnings trigger.'}
                    </p>

                    <div className="flex flex-wrap items-center gap-3">
                      <div className="flex items-center gap-1.5 bg-slate-950 p-1 rounded-xl border border-slate-800">
                        <button
                          onClick={() => setTempThresholdValue((prev) => Math.max(0, prev - 5))}
                          className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-white cursor-pointer"
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <input
                          type="number"
                          value={tempThresholdValue}
                          onChange={(e) => setTempThresholdValue(Math.max(0, parseInt(e.target.value) || 0))}
                          className="w-16 text-center bg-transparent text-white font-mono font-bold text-sm outline-none"
                        />
                        <span className="text-xs text-slate-400 pr-1">
                          {language === 'bn' ? product.bnUnit : product.unit}
                        </span>
                        <button
                          onClick={() => setTempThresholdValue((prev) => prev + 5)}
                          className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-white cursor-pointer"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>

                      {/* Slider Control */}
                      <input
                        type="range"
                        min="5"
                        max="200"
                        step="5"
                        value={tempThresholdValue}
                        onChange={(e) => setTempThresholdValue(parseInt(e.target.value))}
                        className="flex-1 min-w-[120px] accent-amber-400 cursor-pointer"
                      />

                      <button
                        onClick={() => handleSaveThreshold(product.id)}
                        id={`submit-save-threshold-${product.id}`}
                        className="py-1.5 px-4 bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 shadow-md active:scale-95 transition cursor-pointer"
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span>{language === 'bn' ? 'সংরক্ষণ করুন' : 'Save Threshold'}</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Widget Footer Info */}
      <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-slate-400">
        <div className="flex items-center gap-2">
          <Info className="w-3.5 h-3.5 text-amber-400 shrink-0" />
          <span>
            {language === 'bn'
              ? 'ডিপোতে স্টক কম থাকলে দ্রুত সাপ্লায়ার চালান স্ক্যান করে ইনভেন্টরি আপডেট করুন।'
              : 'Scan supplier invoices or use quick restock to reconcile warehouse stock.'}
          </span>
        </div>

        {onNavigateTab && (
          <button
            onClick={() => onNavigateTab('suppliers')}
            className="text-amber-400 hover:underline flex items-center gap-1 font-bold text-[11px] shrink-0"
          >
            <span>{language === 'bn' ? 'সাপ্লায়ার লেজার ও অর্ডার' : 'Supplier Ledgers & Orders'}</span>
            <ArrowUpRight className="w-3 h-3" />
          </button>
        )}
      </div>
    </div>
  );
};
