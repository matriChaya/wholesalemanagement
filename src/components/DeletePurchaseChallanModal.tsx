import React, { useState } from 'react';
import {
  X,
  Trash2,
  AlertTriangle,
  Package,
  Building2,
  Calendar,
  CheckCircle2,
} from 'lucide-react';
import { SupplierLedgerEntry } from '../types';
import { useWholesale } from '../context/WholesaleContext';
import { formatCurrency } from '../utils/translations';

interface DeletePurchaseChallanModalProps {
  isOpen: boolean;
  onClose: () => void;
  challan: SupplierLedgerEntry | null;
  onDeleted?: (msg: string) => void;
}

export const DeletePurchaseChallanModal: React.FC<DeletePurchaseChallanModalProps> = ({
  isOpen,
  onClose,
  challan,
  onDeleted,
}) => {
  const { deleteSupplierLedgerEntry, products, suppliers, language } = useWholesale();

  const [revertStockAndBalance, setRevertStockAndBalance] = useState<boolean>(true);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);

  if (!isOpen || !challan) return null;

  const supplier = suppliers.find((s) => s.id === challan.supplierId);

  // Find linked products and items for this challan
  const challanRef = (challan.referenceNo || '').trim().toLowerCase();
  const linkedItems: Array<{ name: string; quantity: number; costPrice: number }> = [];

  if (Array.isArray(challan.items) && challan.items.length > 0) {
    challan.items.forEach((it) => {
      linkedItems.push({
        name: it.name,
        quantity: it.quantity !== undefined && !isNaN(Number(it.quantity)) ? Math.max(0, Number(it.quantity)) : 0,
        costPrice: Number(it.costPrice) || 0,
      });
    });
  } else {
    // Check products inventory
    products.forEach((p) => {
      const ref = (p.challanReferences || []).find(
        (r) => (r.challanNo || '').trim().toLowerCase() === challanRef
      );
      if (ref) {
        linkedItems.push({
          name: p.name,
          quantity: ref.quantity !== undefined && !isNaN(Number(ref.quantity)) ? Math.max(0, Number(ref.quantity)) : 0,
          costPrice: Number(ref.costPrice) || p.costPrice || 0,
        });
      }
    });
  }

  const handleDelete = () => {
    setIsDeleting(true);
    try {
      const res = deleteSupplierLedgerEntry(challan.id, revertStockAndBalance);
      if (res.success) {
        if (onDeleted) {
          onDeleted(
            language === 'bn'
              ? `ক্রয় চালান #${challan.referenceNo} সফলভাবে ডিলিট করা হয়েছে এবং স্টকে যুক্ত হওয়া পণ্য মাইনাস হয়েছে!`
              : `Challan #${challan.referenceNo} deleted and stock was auto-deducted!`
          );
        }
        onClose();
      }
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm animate-in fade-in overflow-y-auto">
      <div className="bg-slate-900 border border-rose-500/40 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl my-auto">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-800 flex items-center justify-between bg-rose-950/40">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-rose-500/20 border border-rose-500/40 flex items-center justify-center text-rose-400 shrink-0">
              <Trash2 className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-white text-sm sm:text-base">
                  {language === 'bn' ? 'ভুল ক্রয় চালান ডিলিট ও স্টক মাইনাস' : 'Delete Challan & Deduct Stock'}
                </h3>
              </div>
              <span className="font-mono text-xs text-rose-300 font-bold">
                #{challan.referenceNo}
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 sm:p-5 space-y-4">
          {/* Main Warning Banner */}
          <div className="p-3.5 rounded-xl bg-rose-950/50 border border-rose-500/50 flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
            <div className="text-xs text-rose-200 space-y-1">
              <p className="font-bold text-white">
                {language === 'bn'
                  ? 'আপনি কি নিশ্চিত যে এই চালানটি ডিলিট করতে চান?'
                  : 'Are you sure you want to delete this purchase challan?'}
              </p>
              <p className="text-[11px] leading-relaxed text-rose-300/90">
                {language === 'bn'
                  ? `এটি ডিলিট করলে এই চালানের কারণে স্টকে যে পণ্য বৃদ্ধি পেয়েছিল, তা স্বয়ংক্রিয়ভাবে মাইনাস (কর্তন) করা হবে এবং সাপ্লায়ার ${challan.supplierName || supplier?.name}-এর বকেয়া/মোট ক্রয় থেকে ৳${challan.amount.toLocaleString()} কমে যাবে।`
                  : `Deleting this entry will auto-deduct the inward products from store stock, and reduce supplier payables by ৳${challan.amount.toLocaleString()}.`}
              </p>
            </div>
          </div>

          {/* Challan Overview Card */}
          <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-2 text-xs">
            <div className="flex items-center justify-between border-b border-slate-800/80 pb-2">
              <span className="text-slate-400 flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5 text-amber-400" />
                <span>{language === 'bn' ? 'সাপ্লায়ার:' : 'Supplier:'}</span>
              </span>
              <span className="font-bold text-white">
                {challan.supplierName || supplier?.company || supplier?.name}
              </span>
            </div>

            <div className="flex items-center justify-between border-b border-slate-800/80 pb-2">
              <span className="text-slate-400 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-emerald-400" />
                <span>{language === 'bn' ? 'চালানের তারিখ:' : 'Challan Date:'}</span>
              </span>
              <span className="font-mono text-slate-200 font-semibold">{challan.date}</span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-slate-400">{language === 'bn' ? 'চালানের মোট মূল্য:' : 'Total Amount:'}</span>
              <span className="font-mono font-bold text-emerald-400 text-sm">
                {formatCurrency(challan.amount, language)}
              </span>
            </div>
          </div>

          {/* Affected Stock Items List */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                <Package className="w-3.5 h-3.5 text-rose-400" />
                <span>
                  {language === 'bn' ? 'স্টক থেকে মাইনাস হতে যাওয়া পণ্য:' : 'Stock items to be deducted:'}
                </span>
              </span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800 text-rose-300 font-bold">
                {linkedItems.length} {language === 'bn' ? 'টি পণ্য' : 'items'}
              </span>
            </div>

            {linkedItems.length > 0 ? (
              <div className="max-h-40 overflow-y-auto space-y-1.5 border border-slate-800 rounded-xl p-2 bg-slate-950">
                {linkedItems.map((it, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between p-2 rounded-lg bg-slate-900 border border-slate-800/60 text-xs"
                  >
                    <div className="font-medium text-slate-200 truncate pr-2">
                      <span>{it.name}</span>
                    </div>
                    <div className="text-right shrink-0">
                      <span className="px-2 py-0.5 rounded bg-rose-500/20 text-rose-300 font-mono font-bold text-[11px] border border-rose-500/30">
                        - {it.quantity} {language === 'bn' ? 'পিস' : 'pcs'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 text-slate-400 text-xs text-center">
                {language === 'bn'
                  ? 'এই চালানে সরাসরি কোনো পণ্যের রেফারেন্স পাওয়া যায়নি; শুধুমাত্র লেজার ব্যালেন্স সমন্বয় হবে।'
                  : 'No specific item references found; only ledger balance will be reversed.'}
              </div>
            )}
          </div>

          {/* Toggle Reversal */}
          <label className="flex items-center gap-2.5 p-3 rounded-xl bg-slate-950 border border-slate-800 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={revertStockAndBalance}
              onChange={(e) => setRevertStockAndBalance(e.target.checked)}
              className="w-4 h-4 rounded text-rose-600 focus:ring-rose-500 border-slate-700 bg-slate-900 cursor-pointer"
            />
            <div className="text-xs">
              <span className="font-bold text-slate-200 block">
                {language === 'bn'
                  ? 'পণ্যের স্টক মাইনাস ও দেনা সমন্বয় সক্রিয় রাখুন (সুপারিশকৃত)'
                  : 'Auto-revert product stock & supplier balance (Recommended)'}
              </span>
              <span className="text-[10px] text-slate-400">
                {language === 'bn'
                  ? 'এটি চালু রাখলে ভুল এন্ট্রির কারণে যে স্টক বেড়েছিল তা ঠিক হয়ে যাবে।'
                  : 'Reverts inflated stock and corrects supplier balance.'}
              </span>
            </div>
          </label>

          {/* Action buttons */}
          <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              disabled={isDeleting}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold cursor-pointer transition"
            >
              {language === 'bn' ? 'বাতিল' : 'Cancel'}
            </button>
            <button
              type="button"
              onClick={handleDelete}
              disabled={isDeleting}
              className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 disabled:opacity-50 text-white text-xs font-bold transition flex items-center gap-1.5 shadow-lg shadow-rose-950/40 cursor-pointer active:scale-95"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>
                {isDeleting
                  ? (language === 'bn' ? 'ডিলিট হচ্ছে...' : 'Deleting...')
                  : (language === 'bn' ? 'হ্যাঁ, চালান ডিলিট ও স্টক মাইনাস করুন' : 'Confirm Delete & Deduct Stock')}
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
