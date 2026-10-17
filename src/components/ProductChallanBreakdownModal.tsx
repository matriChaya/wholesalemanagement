import React from 'react';
import {
  X,
  Package,
  Building2,
  Calendar,
  FileText,
  DollarSign,
  Boxes,
  CheckCircle2,
  AlertCircle,
  Printer,
  Sparkles,
} from 'lucide-react';
import { Product, SupplierLedgerEntry, Language } from '../types';
import { formatCurrency } from '../utils/translations';
import { getProductChallanBreakdown } from '../utils/productDeduplication';

interface ProductChallanBreakdownModalProps {
  isOpen: boolean;
  onClose: () => void;
  product: Product | null;
  supplierLedger: SupplierLedgerEntry[];
  language?: Language;
}

export const ProductChallanBreakdownModal: React.FC<ProductChallanBreakdownModalProps> = ({
  isOpen,
  onClose,
  product,
  supplierLedger,
  language = 'bn',
}) => {
  if (!isOpen || !product) return null;

  const finalLang: Language = language === 'en' ? 'en' : 'bn';
  const breakdown = getProductChallanBreakdown(product, supplierLedger);
  const { totalPurchasedQty, totalPurchaseCost, challans, currentStock } = breakdown;
  const soldQty = Math.max(0, totalPurchasedQty - currentStock);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-3xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-4 sm:p-5 bg-gradient-to-r from-slate-900 via-indigo-950/60 to-slate-900 border-b border-slate-800 flex items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center shrink-0 text-indigo-400">
              <Package className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-black text-lg sm:text-xl text-white tracking-tight">
                  {product.name}
                </h3>
                {product.sku && (
                  <span className="text-[11px] font-mono px-2 py-0.5 rounded-md bg-slate-800 text-slate-300 border border-slate-700">
                    {product.sku}
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                {product.bnName && product.bnName !== product.name && (
                  <span className="text-emerald-400 font-medium mr-2">{product.bnName}</span>
                )}
                <span>{product.brand || 'Wholesale Depot'}</span> • <span>{product.category || 'General'}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePrint}
              className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-xl transition cursor-pointer"
              title="প্রিন্ট করুন"
            >
              <Printer className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white rounded-xl transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-5">
          {/* Top 4 KPI Metrics */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3.5 rounded-2xl bg-slate-950 border border-sky-500/30">
              <span className="text-[11px] text-sky-400 font-bold block flex items-center gap-1">
                <Boxes className="w-3.5 h-3.5" />
                {finalLang === 'bn' ? 'মোট ইনভয়েস ক্রয়' : 'Total Invoiced'}
              </span>
              <span className="text-xl sm:text-2xl font-black text-white font-mono-num mt-1 block">
                {totalPurchasedQty.toLocaleString()} {product.unit || 'Pcs'}
              </span>
              <span className="text-[10px] text-slate-400 mt-0.5 block">
                {challans.length > 0
                  ? `${challans.length}টি চালানে মোট ক্রয়`
                  : 'প্রারম্ভিক স্টক এন্ট্রি'}
              </span>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-950 border border-emerald-500/30">
              <span className="text-[11px] text-emerald-400 font-bold block flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" />
                {finalLang === 'bn' ? 'বর্তমান স্টক' : 'Current Stock'}
              </span>
              <span className="text-xl sm:text-2xl font-black text-emerald-400 font-mono-num mt-1 block">
                {currentStock.toLocaleString()} {product.unit || 'Pcs'}
              </span>
              <span className="text-[10px] text-slate-400 mt-0.5 block">
                গুদামে অবশিষ্ট আছে
              </span>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-950 border border-purple-500/30">
              <span className="text-[11px] text-purple-400 font-bold block flex items-center gap-1">
                <FileText className="w-3.5 h-3.5" />
                {finalLang === 'bn' ? 'চালান সংখ্যা' : 'Invoice Count'}
              </span>
              <span className="text-xl sm:text-2xl font-black text-white font-mono-num mt-1 block">
                {challans.length} টি
              </span>
              <span className="text-[10px] text-slate-400 mt-0.5 block">
                একত্রিত ইনভয়েস
              </span>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-950 border border-amber-500/30">
              <span className="text-[11px] text-amber-400 font-bold block flex items-center gap-1">
                <DollarSign className="w-3.5 h-3.5" />
                {finalLang === 'bn' ? 'মোট ক্রয় খরচ' : 'Total Purchase Cost'}
              </span>
              <span className="text-xl sm:text-2xl font-black text-amber-300 font-mono-num mt-1 block">
                {formatCurrency(totalPurchaseCost > 0 ? totalPurchaseCost : (totalPurchasedQty * (product.costPrice || 0)), finalLang)}
              </span>
              <span className="text-[10px] text-slate-400 mt-0.5 block">
                গড় দর: {formatCurrency(product.costPrice, finalLang)}
              </span>
            </div>
          </div>

          {/* Unified stock notification banner */}
          <div className="p-3.5 rounded-2xl bg-indigo-950/40 border border-indigo-500/40 flex items-start gap-3">
            <Sparkles className="w-5 h-5 text-indigo-400 shrink-0 mt-0.5" />
            <div className="text-xs text-indigo-200">
              <span className="font-extrabold text-white block">
                {finalLang === 'bn'
                  ? 'স্মার্ট ইনভয়েস কনসোলিডেশন ও ডুপ্লিকেট মার্জ সক্রিয়:'
                  : 'Smart Invoice Consolidation Active:'}
              </span>
              <p className="mt-0.5 leading-relaxed text-indigo-300/90">
                {finalLang === 'bn'
                  ? `এই পণ্যটি যত ইনভয়েসেই আসুক না কেন, স্টকে একাধিকবার নাম যুক্ত হবে না। সকল চালানের পণ্য এক জায়গায় মার্জ হয়ে শুধুমাত্র কোয়ান্টিটি বৃদ্ধি পাবে (${totalPurchasedQty} পিস) এবং বিক্রয় শেষে বর্তমানে গুদামে ${currentStock} পিস অবশিষ্ট রয়েছে।`
                  : `All invoice entries for this product automatically merge into a single catalog entry, incrementing total stock without duplicate listings.`}
              </p>
            </div>
          </div>

          {/* Breakdown Table */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <h4 className="font-extrabold text-sm text-white flex items-center gap-1.5">
                <FileText className="w-4 h-4 text-emerald-400" />
                <span>{finalLang === 'bn' ? 'ক্রয় চালান ও ইনভয়েস তালিকা' : 'Purchase Challan / Invoice History'}</span>
              </h4>
              <span className="text-xs text-slate-400">
                মোট {challans.length}টি রেকর্ড
              </span>
            </div>

            {challans.length > 0 ? (
              <div className="overflow-x-auto rounded-2xl border border-slate-800 bg-slate-950">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-900/90 text-slate-400 text-[11px] border-b border-slate-800">
                    <tr>
                      <th className="py-2.5 px-3 font-semibold text-center">#</th>
                      <th className="py-2.5 px-3 font-semibold">{finalLang === 'bn' ? 'চালান / ইনভয়েস নং' : 'Challan #'}</th>
                      <th className="py-2.5 px-3 font-semibold">{finalLang === 'bn' ? 'তারিখ' : 'Date'}</th>
                      <th className="py-2.5 px-3 font-semibold">{finalLang === 'bn' ? 'কোম্পানি / সাপ্লায়ার' : 'Supplier'}</th>
                      <th className="py-2.5 px-3 font-semibold text-center text-sky-400">{finalLang === 'bn' ? 'ক্রয় পরিমাণ' : 'Quantity'}</th>
                      <th className="py-2.5 px-3 font-semibold text-right text-amber-400">{finalLang === 'bn' ? 'ক্রয় দর (৳)' : 'Cost Price'}</th>
                      <th className="py-2.5 px-3 font-semibold text-right text-emerald-400">{finalLang === 'bn' ? 'মোট মূল্য (৳)' : 'Total Cost'}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 font-mono-num">
                    {challans.map((c, idx) => (
                      <tr key={`${c.challanNo}_${idx}`} className="hover:bg-slate-900/50 transition">
                        <td className="py-2.5 px-3 text-center text-slate-500 font-sans font-bold">
                          {idx + 1}
                        </td>
                        <td className="py-2.5 px-3 font-bold text-white">
                          <span className="px-2 py-0.5 rounded-lg bg-slate-800/80 border border-slate-700/80 text-sky-300 font-mono">
                            {c.challanNo}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-slate-300 font-sans">
                          {c.date || '—'}
                        </td>
                        <td className="py-2.5 px-3 text-slate-200 font-sans font-medium">
                          {c.supplierName}
                        </td>
                        <td className="py-2.5 px-3 text-center font-bold text-sky-400">
                          {c.quantity} {product.unit || 'Pcs'}
                        </td>
                        <td className="py-2.5 px-3 text-right text-amber-300 font-bold">
                          {formatCurrency(c.costPrice, finalLang)}
                        </td>
                        <td className="py-2.5 px-3 text-right text-emerald-400 font-extrabold">
                          {formatCurrency(c.totalPrice, finalLang)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-slate-900/80 border-t border-slate-800 font-mono-num">
                    <tr>
                      <td colSpan={4} className="py-2.5 px-3 text-right font-bold text-slate-300 font-sans">
                        {finalLang === 'bn' ? 'সর্বমোট ক্রয়:' : 'Total Purchased:'}
                      </td>
                      <td className="py-2.5 px-3 text-center font-black text-sky-400 text-sm">
                        {totalPurchasedQty} {product.unit || 'Pcs'}
                      </td>
                      <td className="py-2.5 px-3 text-right text-xs text-slate-400 font-sans">
                        গড়: {formatCurrency(product.costPrice, finalLang)}
                      </td>
                      <td className="py-2.5 px-3 text-right font-black text-emerald-400 text-sm">
                        {formatCurrency(totalPurchaseCost > 0 ? totalPurchaseCost : (totalPurchasedQty * (product.costPrice || 0)), finalLang)}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            ) : (
              <div className="p-6 rounded-2xl bg-slate-950 border border-slate-800 text-center space-y-2">
                <AlertCircle className="w-8 h-8 text-amber-400 mx-auto opacity-70" />
                <h5 className="font-bold text-sm text-white">
                  {finalLang === 'bn' ? 'কোনো সরাসরি ক্রয় চালান লিঙ্ক করা হয়নি' : 'No Direct Purchase Invoices Linked'}
                </h5>
                <p className="text-xs text-slate-400 max-w-md mx-auto">
                  {finalLang === 'bn'
                    ? `এই পণ্যটি প্রারম্ভিক স্টক (${currentStock} ${product.unit || 'Pcs'}) হিসেবে সিস্টেমে এন্ট্রি রয়েছে। পরবর্তী যেকোনো সাপ্লাই চালান স্ক্যান বা এন্ট্রি করার সাথে সাথে এই পণ্যেই স্টক যোগ হবে এবং চালান বিবরণী তৈরি হবে।`
                    : `This product was initialized with direct stock. Any future scanned supply challans will automatically link here and increment quantity.`}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-slate-950 border-t border-slate-800 flex items-center justify-between">
          <div className="text-xs text-slate-400">
            {soldQty > 0 ? (
              <span className="text-purple-300 font-medium">
                ইনভয়েস বিক্রয় / ডেলিভারি: <strong className="text-white">{soldQty} {product.unit}</strong> | অবশিষ্ট স্টক: <strong className="text-emerald-400">{currentStock} {product.unit}</strong>
              </span>
            ) : (
              <span className="text-emerald-400 font-medium">
                সকল ক্রয়কৃত পণ্য গুদাম স্টকে সম্পূর্ণ অক্ষত রয়েছে ({currentStock} {product.unit})।
              </span>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-bold transition cursor-pointer"
          >
            {finalLang === 'bn' ? 'বন্ধ করুন' : 'Close'}
          </button>
        </div>
      </div>
    </div>
  );
};
