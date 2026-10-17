import React, { useState, useMemo } from 'react';
import { useWholesale } from '../context/WholesaleContext';
import { Product, Language } from '../types';
import { translations, formatCurrency } from '../utils/translations';
import {
  X,
  Search,
  Tag,
  Save,
  Check,
  AlertCircle,
  TrendingUp,
  Percent,
  Sparkles,
  ArrowUpDown,
  Filter
} from 'lucide-react';

interface AdminSalesPriceModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetProductId?: string | null;
  products?: Product[];
  onUpdatePrices?: (updates: { productId: string; wholesalePrice?: number; retailPrice?: number; costPrice?: number; }[]) => Promise<void>;
  language?: Language;
}

export const AdminSalesPriceModal: React.FC<AdminSalesPriceModalProps> = ({
  isOpen,
  onClose,
  targetProductId,
}) => {
  const { products, updateProduct, language } = useWholesale();
  const t = translations[language];

  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  // Local drafts of price changes: { [productId]: { wholesalePrice: number, retailPrice: number, costPrice?: number } }
  const [priceDrafts, setPriceDrafts] = useState<Record<string, { wholesalePrice: number; retailPrice: number; costPrice: number }>>({});
  const [savedSuccessMap, setSavedSuccessMap] = useState<Record<string, boolean>>({});
  const [isSavingAll, setIsSavingAll] = useState<boolean>(false);
  const [bulkNotification, setBulkNotification] = useState<string | null>(null);

  // Initialize drafts whenever products or targetProductId change
  React.useEffect(() => {
    if (isOpen) {
      const drafts: Record<string, { wholesalePrice: number; retailPrice: number; costPrice: number }> = {};
      products.forEach((p) => {
        drafts[p.id] = {
          wholesalePrice: p.wholesalePrice || 0,
          retailPrice: p.retailPrice || p.mrp || Math.round((p.wholesalePrice || 0) * 1.15),
          costPrice: p.costPrice || 0,
        };
      });
      setPriceDrafts(drafts);
      setSavedSuccessMap({});
      setBulkNotification(null);
    }
  }, [isOpen, products]);

  const categories = useMemo(() => {
    const set = new Set<string>();
    products.forEach((p) => {
      if (p.category) set.add(p.category);
    });
    return Array.from(set);
  }, [products]);

  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      if (targetProductId && p.id !== targetProductId) return false;
      if (selectedCategory !== 'ALL' && p.category !== selectedCategory) return false;
      if (!searchQuery.trim()) return true;

      const q = searchQuery.toLowerCase();
      const matchName = (p.name || '').toLowerCase().includes(q) || (p.bnName || '').toLowerCase().includes(q);
      const matchSku = (p.sku || '').toLowerCase().includes(q);
      const matchBrand = (p.brand || '').toLowerCase().includes(q);
      return matchName || matchSku || matchBrand;
    });
  }, [products, targetProductId, selectedCategory, searchQuery]);

  const handlePriceChange = (
    productId: string,
    field: 'wholesalePrice' | 'retailPrice' | 'costPrice',
    val: number
  ) => {
    setPriceDrafts((prev) => ({
      ...prev,
      [productId]: {
        wholesalePrice: prev[productId]?.wholesalePrice ?? 0,
        retailPrice: prev[productId]?.retailPrice ?? 0,
        costPrice: prev[productId]?.costPrice ?? 0,
        [field]: Math.max(0, val),
      },
    }));
  };

  const handleApplyMarkup = (productId: string, markupPercent: number, target: 'wholesale' | 'retail') => {
    const currentCost = priceDrafts[productId]?.costPrice || 0;
    const base = currentCost > 0 ? currentCost : (priceDrafts[productId]?.wholesalePrice || 100);
    const newPrice = Math.round(base * (1 + markupPercent / 100));

    if (target === 'wholesale') {
      handlePriceChange(productId, 'wholesalePrice', newPrice);
    } else {
      handlePriceChange(productId, 'retailPrice', newPrice);
    }
  };

  const handleSaveSingle = async (p: Product) => {
    const draft = priceDrafts[p.id];
    if (!draft) return;

    try {
      await updateProduct(p.id, {
        wholesalePrice: Number(draft.wholesalePrice),
        retailPrice: Number(draft.retailPrice),
        costPrice: Number(draft.costPrice),
      });

      setSavedSuccessMap((prev) => ({ ...prev, [p.id]: true }));
      setTimeout(() => {
        setSavedSuccessMap((prev) => ({ ...prev, [p.id]: false }));
      }, 2500);
    } catch (err) {
      console.error('Error updating price:', err);
    }
  };

  const handleSaveAllModified = async () => {
    setIsSavingAll(true);
    let count = 0;

    try {
      for (const p of products) {
        const draft = priceDrafts[p.id];
        if (draft) {
          const isChanged =
            draft.wholesalePrice !== p.wholesalePrice ||
            draft.retailPrice !== (p.retailPrice || 0) ||
            draft.costPrice !== p.costPrice;

          if (isChanged) {
            await updateProduct(p.id, {
              wholesalePrice: Number(draft.wholesalePrice),
              retailPrice: Number(draft.retailPrice),
              costPrice: Number(draft.costPrice),
            });
            count++;
          }
        }
      }

      setBulkNotification(
        language === 'bn'
          ? `সফলভাবে ${count} টি পণ্যের বিক্রয় মূল্য আপডেট ও সেভ করা হয়েছে!`
          : `Successfully updated sales prices for ${count} items!`
      );
      setTimeout(() => setBulkNotification(null), 4000);
    } catch (err) {
      console.error('Error in bulk saving:', err);
    } finally {
      setIsSavingAll(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-700 w-full max-w-5xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="p-4 bg-gradient-to-r from-emerald-950/70 via-slate-900 to-teal-950/70 border-b border-slate-800 flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-emerald-600/30 border border-emerald-500/50 flex items-center justify-center text-emerald-400 shrink-0">
              <Tag className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-bold text-white text-base sm:text-lg flex items-center gap-2">
                <span>{language === 'bn' ? 'এডমিন বিক্রয় মূল্য এডিটর' : 'Admin Sales Price Editor'}</span>
                <span className="text-[11px] px-2 py-0.5 rounded-full bg-emerald-950 border border-emerald-500/40 text-emerald-300 font-normal">
                  {products.length} {language === 'bn' ? 'পণ্য' : 'Items'}
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                {language === 'bn'
                  ? 'পাইকারি ও খুচরা বিক্রয় মূল্য পরিবর্তন করুন। মেমো কাটার সময় নতুন মূল্য কার্যকর হবে।'
                  : 'Modify wholesale & retail selling prices. Applies immediately across POS and orders.'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleSaveAllModified}
              disabled={isSavingAll}
              className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-lg active:scale-95 disabled:opacity-50 cursor-pointer"
            >
              <Save className="w-4 h-4" />
              <span>{isSavingAll ? (language === 'bn' ? 'সেভ হচ্ছে...' : 'Saving...') : (language === 'bn' ? 'সব পরিবর্তন সেভ' : 'Save All')}</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {bulkNotification && (
          <div className="mx-4 mt-3 p-3 rounded-xl bg-emerald-950/80 border border-emerald-600 text-emerald-300 text-xs font-bold flex items-center gap-2">
            <Check className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{bulkNotification}</span>
          </div>
        )}

        {/* Filter / Search Toolbar */}
        <div className="p-3.5 bg-slate-950/70 border-b border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-2.5 shrink-0">
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder={language === 'bn' ? 'পণ্যের নাম, মডেল বা কোড খুঁজুন...' : 'Search product name, sku...'}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-emerald-500"
            />
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
            <Filter className="w-3.5 h-3.5 text-slate-400 shrink-0 hidden sm:inline" />
            <span className="text-xs text-slate-400 shrink-0 hidden sm:inline">{language === 'bn' ? 'ক্যাটাগরি:' : 'Category:'}</span>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="bg-slate-900 border border-slate-700 rounded-xl px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-emerald-500"
            >
              <option value="ALL">{language === 'bn' ? 'সকল ক্যাটাগরি' : 'All Categories'}</option>
              {categories.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Table / Grid */}
        <div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-2.5">
          {filteredProducts.length === 0 ? (
            <div className="py-12 text-center text-slate-500 text-xs">
              {language === 'bn' ? 'কোনো পণ্য পাওয়া যায়নি' : 'No matching products found.'}
            </div>
          ) : (
            filteredProducts.map((p) => {
              const draft = priceDrafts[p.id] || {
                wholesalePrice: p.wholesalePrice || 0,
                retailPrice: p.retailPrice || p.mrp || 0,
                costPrice: p.costPrice || 0,
              };

              const cost = draft.costPrice;
              const wsPrice = draft.wholesalePrice;
              const retPrice = draft.retailPrice;

              const wsProfit = wsPrice - cost;
              const wsMargin = cost > 0 ? ((wsProfit / cost) * 100).toFixed(1) : '0';

              const retProfit = retPrice - cost;
              const retMargin = cost > 0 ? ((retProfit / cost) * 100).toFixed(1) : '0';

              const isSaved = savedSuccessMap[p.id];

              return (
                <div
                  key={p.id}
                  className="p-3 rounded-xl bg-slate-950 border border-slate-800 hover:border-slate-700 transition flex flex-col md:flex-row md:items-center justify-between gap-3 shadow"
                >
                  {/* Product Info */}
                  <div className="flex items-center gap-3 min-w-0 md:w-64 shrink-0">
                    {p.image ? (
                      <img
                        src={p.image}
                        alt={p.name}
                        className="w-11 h-11 rounded-lg object-cover border border-slate-700 shrink-0"
                      />
                    ) : (
                      <div className="w-11 h-11 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-500 shrink-0 font-bold text-xs">
                        {p.name.slice(0, 2).toUpperCase()}
                      </div>
                    )}
                    <div className="min-w-0">
                      <h4 className="font-bold text-xs sm:text-sm text-white truncate">{p.name}</h4>
                      <p className="text-[11px] text-slate-400 truncate">
                        {p.category} {p.brand ? `• ${p.brand}` : ''} • SKU: <span className="font-mono text-slate-300">{p.sku}</span>
                      </p>
                      <span className="text-[10px] text-slate-500">
                        স্টক: <b className="text-white">{p.stockQuantity} {p.unit}</b>
                      </span>
                    </div>
                  </div>

                  {/* Price Controls Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 flex-1 min-w-0">
                    {/* Cost Price */}
                    <div className="p-2 rounded-lg bg-slate-900/90 border border-slate-800 flex flex-col justify-between">
                      <div className="flex items-center justify-between text-[11px] text-slate-400 mb-1">
                        <span>{language === 'bn' ? 'ক্রয় মূল্য (Cost)' : 'Buy/Cost Price'}</span>
                        <span className="text-[10px] text-slate-500 font-mono">৳</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs text-slate-400 font-bold">৳</span>
                        <input
                          type="number"
                          value={draft.costPrice}
                          onChange={(e) => handlePriceChange(p.id, 'costPrice', parseFloat(e.target.value) || 0)}
                          className="w-full bg-slate-950 border border-slate-700 rounded px-2 py-1 text-xs font-mono font-bold text-white focus:outline-none focus:border-slate-500"
                        />
                      </div>
                    </div>

                    {/* Wholesale Price */}
                    <div className="p-2 rounded-lg bg-emerald-950/30 border border-emerald-500/30 flex flex-col justify-between">
                      <div className="flex items-center justify-between text-[11px] text-emerald-300 mb-1">
                        <span className="font-bold">{language === 'bn' ? 'পাইকারি বিক্রয় মূল্য' : 'Wholesale Price'}</span>
                        <span className="text-[10px] text-emerald-400 font-mono font-semibold">+{wsMargin}%</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs text-emerald-400 font-bold">৳</span>
                        <input
                          type="number"
                          value={draft.wholesalePrice}
                          onChange={(e) => handlePriceChange(p.id, 'wholesalePrice', parseFloat(e.target.value) || 0)}
                          className="w-full bg-slate-950 border border-emerald-600/50 rounded px-2 py-1 text-xs font-mono font-bold text-emerald-400 focus:outline-none focus:border-emerald-400"
                        />
                      </div>
                      {/* Quick markups */}
                      <div className="flex items-center gap-1 mt-1.5">
                        <span className="text-[9px] text-slate-400">লাভে:</span>
                        {[5, 10, 15].map((pct) => (
                          <button
                            key={pct}
                            type="button"
                            onClick={() => handleApplyMarkup(p.id, pct, 'wholesale')}
                            className="px-1 py-0.5 rounded bg-slate-900 hover:bg-emerald-900/60 text-[9px] font-mono text-emerald-300 border border-emerald-800/40"
                          >
                            +{pct}%
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Retail Price */}
                    <div className="p-2 rounded-lg bg-sky-950/30 border border-sky-500/30 flex flex-col justify-between">
                      <div className="flex items-center justify-between text-[11px] text-sky-300 mb-1">
                        <span className="font-bold">{language === 'bn' ? 'খুচরা বিক্রয় মূল্য' : 'Retail Price'}</span>
                        <span className="text-[10px] text-sky-400 font-mono font-semibold">+{retMargin}%</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs text-sky-400 font-bold">৳</span>
                        <input
                          type="number"
                          value={draft.retailPrice}
                          onChange={(e) => handlePriceChange(p.id, 'retailPrice', parseFloat(e.target.value) || 0)}
                          className="w-full bg-slate-950 border border-sky-600/50 rounded px-2 py-1 text-xs font-mono font-bold text-sky-300 focus:outline-none focus:border-sky-400"
                        />
                      </div>
                      {/* Quick markups */}
                      <div className="flex items-center gap-1 mt-1.5">
                        <span className="text-[9px] text-slate-400">লাভে:</span>
                        {[15, 20, 25].map((pct) => (
                          <button
                            key={pct}
                            type="button"
                            onClick={() => handleApplyMarkup(p.id, pct, 'retail')}
                            className="px-1 py-0.5 rounded bg-slate-900 hover:bg-sky-900/60 text-[9px] font-mono text-sky-300 border border-sky-800/40"
                          >
                            +{pct}%
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Save Single Action */}
                  <div className="shrink-0 flex items-center justify-end md:justify-center">
                    <button
                      type="button"
                      onClick={() => handleSaveSingle(p)}
                      className={`px-3 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow ${
                        isSaved
                          ? 'bg-emerald-500 text-white'
                          : 'bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white border border-slate-700'
                      }`}
                    >
                      {isSaved ? <Check className="w-3.5 h-3.5" /> : <Save className="w-3.5 h-3.5 text-emerald-400" />}
                      <span>{isSaved ? (language === 'bn' ? 'সেভড!' : 'Saved!') : (language === 'bn' ? 'দর সেভ' : 'Save')}</span>
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="p-3.5 bg-slate-950 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400 shrink-0">
          <div>
            <span>
              {language === 'bn' ? 'মোট প্রদর্শিত পণ্য:' : 'Showing products:'} <b className="text-white">{filteredProducts.length}</b>
            </span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded-lg font-medium transition cursor-pointer"
          >
            {language === 'bn' ? 'বন্ধ করুন' : 'Close'}
          </button>
        </div>
      </div>
    </div>
  );
};
