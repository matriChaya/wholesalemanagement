import React, { useState, useEffect } from 'react';
import {
  X,
  FileText,
  Calendar,
  Save,
  Plus,
  Trash2,
  AlertTriangle,
  Building2,
  Package,
  CheckCircle2,
} from 'lucide-react';
import { SupplierLedgerEntry, SupplierPurchaseItem } from '../types';
import { useWholesale } from '../context/WholesaleContext';
import { formatCurrency, round2 } from '../utils/translations';
import { areProductNamesEquivalent, normalizeProductKey } from '../utils/productDeduplication';

interface EditPurchaseChallanModalProps {
  isOpen: boolean;
  onClose: () => void;
  challan: SupplierLedgerEntry | null;
  onSuccess?: (msg: string) => void;
}

export const EditPurchaseChallanModal: React.FC<EditPurchaseChallanModalProps> = ({
  isOpen,
  onClose,
  challan,
  onSuccess,
}) => {
  const { suppliers, products, updateSupplierPurchaseChallan, language } = useWholesale();

  const [supplierId, setSupplierId] = useState<string>('');
  const [referenceNo, setReferenceNo] = useState<string>('');
  const [date, setDate] = useState<string>('');
  const [previousDoNo, setPreviousDoNo] = useState<string>('');
  const [previousDoDate, setPreviousDoDate] = useState<string>('');
  const [paymentMethod, setPaymentMethod] = useState<string>('Credit');
  const [notes, setNotes] = useState<string>('');
  const [items, setItems] = useState<SupplierPurchaseItem[]>([]);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Initialize form when challan changes or modal opens
  useEffect(() => {
    if (!challan) return;

    setSupplierId(challan.supplierId || suppliers[0]?.id || '');
    setReferenceNo(challan.referenceNo || '');
    setDate(challan.date || new Date().toISOString().slice(0, 10));
    setPreviousDoNo(challan.previousDoNo || '');
    setPreviousDoDate(challan.previousDoDate || '');
    setPaymentMethod(challan.paymentMethod || 'Credit');
    setNotes(challan.notes || '');

    // Populate items
    if (Array.isArray(challan.items) && challan.items.length > 0) {
      setItems(
        challan.items.map((it) => {
          const qty = it.quantity !== undefined && !isNaN(Number(it.quantity)) ? Math.max(0, Number(it.quantity)) : 0;
          const cost = Number(it.costPrice) || 0;
          const total = it.totalPrice !== undefined && !isNaN(Number(it.totalPrice)) ? Number(it.totalPrice) : qty * cost;
          return {
            ...it,
            quantity: qty,
            costPrice: cost,
            totalPrice: total,
            suggestedRetailPrice: Number(it.suggestedRetailPrice) || Math.round(cost * 1.15),
          };
        })
      );
    } else {
      // Find linked products from inventory by challan reference
      const challanRef = (challan.referenceNo || '').trim().toLowerCase();
      const linkedProducts = products.filter(
        (p) =>
          (p.challanReferences || []).some((r) => (r.challanNo || '').trim().toLowerCase() === challanRef) ||
          (p.latestChallanNo || '').trim().toLowerCase() === challanRef
      );

      if (linkedProducts.length > 0) {
        const generatedItems: SupplierPurchaseItem[] = linkedProducts.map((p) => {
          const ref = (p.challanReferences || []).find(
            (r) => (r.challanNo || '').trim().toLowerCase() === challanRef
          );
          const qty = ref?.quantity !== undefined && !isNaN(Number(ref.quantity)) ? Math.max(0, Number(ref.quantity)) : 0;
          const cost = ref?.costPrice || p.costPrice || 0;
          return {
            productId: p.id,
            name: p.name,
            sku: p.sku,
            category: p.category,
            quantity: qty,
            costPrice: cost,
            suggestedRetailPrice: p.wholesalePrice || Math.round(cost * 1.15),
            totalPrice: qty * cost,
            unit: p.unit || 'Pcs',
          };
        });
        setItems(generatedItems);
      } else {
        // Fallback default single row with existing amount
        setItems([
          {
            name: challan.notes && !challan.notes.includes('(') ? challan.notes : 'সাপ্লাই পণ্য',
            quantity: 1,
            costPrice: challan.amount || 0,
            totalPrice: challan.amount || 0,
            suggestedRetailPrice: Math.round((challan.amount || 0) * 1.15),
            unit: 'Pcs',
          },
        ]);
      }
    }
  }, [challan, isOpen, products, suppliers]);

  if (!isOpen || !challan) return null;

  const handleItemChange = (
    index: number,
    field: keyof SupplierPurchaseItem,
    val: any
  ) => {
    setItems((prev) => {
      const next = [...prev];
      const current = { ...next[index] };

      if (field === 'name') {
        current.name = val;
        const normVal = normalizeProductKey(val);
        // Auto-match with existing product to fill cost / suggested price
        const matched = products.find(
          (p) =>
            areProductNamesEquivalent(p.name, val) ||
            areProductNamesEquivalent(p.bnName, val) ||
            (normVal && normalizeProductKey(p.name) === normVal) ||
            (normVal && p.bnName && normalizeProductKey(p.bnName) === normVal)
        );
        if (matched) {
          current.name = matched.name;
          current.productId = matched.id;
          current.sku = matched.sku;
          current.category = matched.category;
          if (!current.costPrice || current.costPrice === 0) {
            current.costPrice = matched.costPrice;
          }
          if (!current.suggestedRetailPrice || current.suggestedRetailPrice === 0) {
            current.suggestedRetailPrice = matched.wholesalePrice;
          }
        }
      } else if (field === 'quantity') {
        const qty = Math.max(0, Number(val) || 0);
        current.quantity = qty;
        current.totalPrice = round2(qty * (current.costPrice || 0));
      } else if (field === 'costPrice') {
        const cost = Math.max(0, Number(val) || 0);
        current.costPrice = cost;
        current.totalPrice = round2((current.quantity ?? 0) * cost);
        if (!current.suggestedRetailPrice || current.suggestedRetailPrice < cost) {
          current.suggestedRetailPrice = Math.round(cost * 1.15);
        }
      } else if (field === 'suggestedRetailPrice') {
        current.suggestedRetailPrice = Math.max(0, Number(val) || 0);
      } else {
        (current as any)[field] = val;
      }

      next[index] = current;
      return next;
    });
  };

  const handleAddItem = () => {
    setItems((prev) => [
      ...prev,
      {
        name: '',
        quantity: 1,
        costPrice: 0,
        suggestedRetailPrice: 0,
        totalPrice: 0,
        unit: 'Pcs',
      },
    ]);
  };

  const handleRemoveItem = (index: number) => {
    if (items.length <= 1) {
      setErrorMsg(language === 'bn' ? 'চালানে কমপক্ষে একটি পণ্য থাকতে হবে।' : 'At least one product is required.');
      return;
    }
    setItems((prev) => prev.filter((_, idx) => idx !== index));
  };

  const totalCalculatedAmount = items.reduce((sum, it) => sum + (Number(it.totalPrice) || 0), 0);
  const amountDiff = totalCalculatedAmount - (challan.amount || 0);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!supplierId) {
      setErrorMsg(language === 'bn' ? 'দয়া করে সাপ্লায়ার নির্বাচন করুন।' : 'Please select a supplier.');
      return;
    }

    if (!referenceNo.trim()) {
      setErrorMsg(language === 'bn' ? 'চালান বা ইনভয়েস নম্বর প্রদান করুন।' : 'Please provide challan/invoice number.');
      return;
    }

    if (items.length === 0 || items.every((it) => !it.name.trim())) {
      setErrorMsg(language === 'bn' ? 'কমপক্ষে একটি পণ্যের নাম দিন।' : 'Please enter at least one product name.');
      return;
    }

    setIsSaving(true);
    try {
      const res = updateSupplierPurchaseChallan({
        entryId: challan.id,
        referenceNo: referenceNo.trim(),
        date,
        supplierId,
        previousDoNo: previousDoNo.trim(),
        previousDoDate,
        notes: notes.trim(),
        paymentMethod,
        items,
      });

      if (res.success) {
        if (onSuccess) onSuccess(res.message);
        onClose();
      } else {
        setErrorMsg(res.message);
      }
    } catch (err: any) {
      setErrorMsg(err?.message || 'চালান হালনাগাদ করতে সমস্যা হয়েছে।');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm animate-in fade-in overflow-y-auto">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-3xl overflow-hidden shadow-2xl my-auto">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950/70">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 shrink-0">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-bold text-slate-100 text-sm sm:text-base">
                  {language === 'bn' ? 'সাপ্লাই ক্রয় চালান ও স্টক এডিট' : 'Edit Purchase Challan & Stock'}
                </h3>
                <span className="font-mono text-xs px-2 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-300 font-bold">
                  #{challan.referenceNo}
                </span>
              </div>
              <p className="text-xs text-slate-400">
                {language === 'bn'
                  ? 'ভুল পণ্য, পরিমাণ বা দর সংশোধন করুন; স্টক ও সাপ্লায়ার দেনা স্বয়ংক্রিয়ভাবে নিখুঁত হবে'
                  : 'Update wrong items, quantities or costs; inventory stock will auto-reconcile'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Error notification */}
        {errorMsg && (
          <div className="m-4 p-3 rounded-xl bg-rose-500/20 border border-rose-500/40 text-rose-300 text-xs flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Informational Callout */}
        <div className="mx-4 mt-4 p-3 rounded-xl bg-sky-950/40 border border-sky-500/30 flex items-start gap-2.5 text-xs text-sky-200">
          <CheckCircle2 className="w-4 h-4 text-sky-400 shrink-0 mt-0.5" />
          <div>
            <span className="font-bold text-white">
              {language === 'bn' ? 'স্বয়ংক্রিয় স্টক ও ব্যালেন্স সমন্বয়:' : 'Auto Stock & Balance Reconciliation:'}
            </span>
            <p className="text-[11px] text-sky-300/90 mt-0.5">
              {language === 'bn'
                ? 'পূর্বে যুক্ত হওয়া পণ্যের স্টক রিভার্স হয়ে নতুন পণ্যের সঠিক পরিমাণ স্টকে আপডেট হবে। সাপ্লায়ারের মোট ক্রয় ও বকেয়া দেনা নতুন হিসাব অনুযায়ী নির্ভুলভাবে মিলে যাবে।'
                : 'Old stock entries will be reversed and replaced by the new values, and supplier payables will auto-update.'}
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-4 sm:p-5 space-y-4 max-h-[75vh] overflow-y-auto">
          {/* Top Form Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {/* Supplier Select */}
            <div className="sm:col-span-2 md:col-span-1">
              <label className="text-[10px] uppercase font-bold text-slate-400 flex items-center gap-1">
                <Building2 className="w-3 h-3 text-amber-400" />
                <span>{language === 'bn' ? 'সাপ্লায়ার / কোম্পানি' : 'Supplier Company'}</span>
              </label>
              <select
                value={supplierId}
                onChange={(e) => setSupplierId(e.target.value)}
                required
                className="w-full mt-1 bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs font-semibold text-white focus:outline-none focus:border-amber-500"
              >
                {suppliers.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.company || s.name} ({s.name})
                  </option>
                ))}
              </select>
            </div>

            {/* Reference No */}
            <div>
              <label className="text-[10px] uppercase font-bold text-slate-400 flex items-center gap-1">
                <FileText className="w-3 h-3 text-sky-400" />
                <span>{language === 'bn' ? 'চালান / ইনভয়েস নং' : 'Challan / Invoice #'}</span>
              </label>
              <input
                type="text"
                value={referenceNo}
                onChange={(e) => setReferenceNo(e.target.value)}
                required
                className="w-full mt-1 bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs font-mono font-bold text-white focus:outline-none focus:border-sky-500"
              />
            </div>

            {/* Date */}
            <div>
              <label className="text-[10px] uppercase font-bold text-slate-400 flex items-center gap-1">
                <Calendar className="w-3 h-3 text-emerald-400" />
                <span>{language === 'bn' ? 'চালানের তারিখ' : 'Challan Date'}</span>
              </label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                required
                className="w-full mt-1 bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          {/* D.O. Info */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 rounded-xl bg-slate-950/60 border border-slate-800">
            <div>
              <label className="text-[10px] uppercase font-bold text-amber-300/80">
                {language === 'bn' ? 'পূর্বের ডিও নং (Optional D.O. #)' : 'Previous D.O. Number'}
              </label>
              <input
                type="text"
                value={previousDoNo}
                onChange={(e) => setPreviousDoNo(e.target.value)}
                placeholder="e.g. DO-90214"
                className="w-full mt-1 bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-amber-200 font-mono focus:outline-none focus:border-amber-400"
              />
            </div>
            <div>
              <label className="text-[10px] uppercase font-bold text-amber-300/80">
                {language === 'bn' ? 'পূর্বের ডিও তারিখ (Optional D.O. Date)' : 'Previous D.O. Date'}
              </label>
              <input
                type="date"
                value={previousDoDate}
                onChange={(e) => setPreviousDoDate(e.target.value)}
                className="w-full mt-1 bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 font-mono focus:outline-none focus:border-amber-400"
              />
            </div>
          </div>

          {/* Products & Items Table */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Package className="w-4 h-4 text-emerald-400" />
                <h4 className="text-xs sm:text-sm font-bold text-white">
                  {language === 'bn' ? 'চালানের পণ্য তালিকা ও স্টক পরিমাণ' : 'Challan Products & Quantities'}
                </h4>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 font-bold">
                  {items.length} {language === 'bn' ? 'টি আইটেম' : 'items'}
                </span>
              </div>
              <button
                type="button"
                onClick={handleAddItem}
                className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold transition flex items-center gap-1 shadow cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>{language === 'bn' ? '+ পণ্য যোগ করুন' : '+ Add Item'}</span>
              </button>
            </div>

            <div className="border border-slate-800 rounded-xl overflow-hidden bg-slate-950">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-900/90 text-[10px] text-slate-400 uppercase font-bold border-b border-slate-800">
                    <tr>
                      <th className="py-2.5 px-3">#</th>
                      <th className="py-2.5 px-3 min-w-[180px]">{language === 'bn' ? 'পণ্যের নাম' : 'Product Name'}</th>
                      <th className="py-2.5 px-2 w-24 text-center">{language === 'bn' ? 'পরিমাণ (Qty)' : 'Quantity'}</th>
                      <th className="py-2.5 px-2 w-28 text-right">{language === 'bn' ? 'কেনা দর (৳)' : 'Cost Price (৳)'}</th>
                      <th className="py-2.5 px-2 w-28 text-right">{language === 'bn' ? 'বিক্রয় দর (৳)' : 'Wholesale (৳)'}</th>
                      <th className="py-2.5 px-3 w-28 text-right">{language === 'bn' ? 'মোট (৳)' : 'Total (৳)'}</th>
                      <th className="py-2.5 px-2 w-10 text-center"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {items.map((it, idx) => (
                      <tr key={idx} className="hover:bg-slate-900/40 transition">
                        <td className="py-2.5 px-3 font-mono text-slate-500 font-bold">{idx + 1}</td>
                        <td className="py-2 px-3">
                          <input
                            type="text"
                            value={it.name}
                            onChange={(e) => handleItemChange(idx, 'name', e.target.value)}
                            placeholder={language === 'bn' ? 'যেমন: ব্যাটারি 50AH...' : 'Product name...'}
                            required
                            className="w-full bg-slate-900 border border-slate-700 focus:border-emerald-500 rounded-lg px-2.5 py-1.5 text-xs text-white font-medium focus:outline-none"
                            list="product-name-suggestions"
                          />
                        </td>
                        <td className="py-2 px-2">
                          <div className="flex items-center gap-1 justify-center">
                            <input
                              type="number"
                              min="0"
                              step="any"
                              value={it.quantity}
                              onChange={(e) => handleItemChange(idx, 'quantity', e.target.value === '' ? 0 : Math.max(0, Number(e.target.value)))}
                              title={language === 'bn' ? 'পরিমাণ (০ গ্রহণযোগ্য)' : 'Quantity (0 accepted)'}
                              className={`w-16 bg-slate-900 border ${
                                it.quantity === 0 ? 'border-amber-500/80 text-amber-300' : 'border-slate-700 text-white'
                              } focus:border-emerald-500 rounded-lg px-2 py-1.5 text-xs font-mono font-bold text-center focus:outline-none`}
                            />
                            {it.quantity !== 0 && (
                              <button
                                type="button"
                                onClick={() => handleItemChange(idx, 'quantity', 0)}
                                className="px-1.5 py-1 rounded bg-slate-800 hover:bg-amber-950/80 text-[10px] text-slate-400 hover:text-amber-300 border border-slate-700 font-mono font-bold transition"
                                title={language === 'bn' ? 'পরিমাণ ০ (শূন্য) করুন' : 'Set quantity to 0'}
                              >
                                ০
                              </button>
                            )}
                          </div>
                        </td>
                        <td className="py-2 px-2">
                          <input
                            type="number"
                            min="0"
                            step="any"
                            value={it.costPrice || ''}
                            onChange={(e) => handleItemChange(idx, 'costPrice', e.target.value)}
                            required
                            placeholder="0"
                            className="w-full bg-slate-900 border border-slate-700 focus:border-amber-500 rounded-lg px-2 py-1.5 text-xs font-mono font-bold text-right text-amber-300 focus:outline-none"
                          />
                        </td>
                        <td className="py-2 px-2">
                          <input
                            type="number"
                            min="0"
                            step="any"
                            value={it.suggestedRetailPrice || ''}
                            onChange={(e) => handleItemChange(idx, 'suggestedRetailPrice', e.target.value)}
                            placeholder="0"
                            className="w-full bg-slate-900 border border-slate-700 focus:border-sky-500 rounded-lg px-2 py-1.5 text-xs font-mono font-semibold text-right text-sky-300 focus:outline-none"
                          />
                        </td>
                        <td className="py-2 px-3 text-right font-mono font-bold text-white whitespace-nowrap">
                          {formatCurrency(it.totalPrice, language)}
                        </td>
                        <td className="py-2 px-2 text-center">
                          <button
                            type="button"
                            onClick={() => handleRemoveItem(idx)}
                            className="p-1 text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 rounded transition cursor-pointer"
                            title={language === 'bn' ? 'পণ্যটি বাদ দিন' : 'Remove product'}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <datalist id="product-name-suggestions">
              {products.map((p) => (
                <option key={p.id} value={p.name} />
              ))}
            </datalist>
          </div>

          {/* Notes and Payment Method */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] uppercase font-bold text-slate-400">
                {language === 'bn' ? 'নোট / মন্তব্য' : 'Remarks / Notes'}
              </label>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder={language === 'bn' ? 'সংশোধিত ক্রয় চালান' : 'Challan notes'}
                className="w-full mt-1 bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
              />
            </div>
            <div>
              <label className="text-[10px] uppercase font-bold text-slate-400">
                {language === 'bn' ? 'লেনদেনের ধরন' : 'Payment Method'}
              </label>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
                className="w-full mt-1 bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs font-semibold text-white focus:outline-none focus:border-amber-500"
              >
                <option value="Credit">{language === 'bn' ? 'কোম্পানি বাকি (Credit)' : 'Credit (Company Payable)'}</option>
                <option value="Cash">{language === 'bn' ? 'নগদ ক্যাশ (Cash)' : 'Cash'}</option>
                <option value="Bank Transfer">{language === 'bn' ? 'ব্যাংক ট্রান্সফার (Bank)' : 'Bank Transfer'}</option>
                <option value="bKash / Nagad">{language === 'bn' ? 'বিকাশ / নগদ (MFS)' : 'bKash / Nagad'}</option>
              </select>
            </div>
          </div>

          {/* Summary Footer Bar */}
          <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-4 text-xs">
              <div>
                <span className="text-slate-400">{language === 'bn' ? 'পূর্বের মোট চালান:' : 'Previous Total:'}</span>{' '}
                <span className="font-mono font-bold text-slate-300">{formatCurrency(challan.amount, language)}</span>
              </div>
              <div className="border-l border-slate-800 pl-4">
                <span className="text-slate-400">{language === 'bn' ? 'নতুন মোট চালান:' : 'New Total:'}</span>{' '}
                <span className="font-mono font-bold text-emerald-400 text-sm">
                  {formatCurrency(totalCalculatedAmount, language)}
                </span>
              </div>
              {amountDiff !== 0 && (
                <div className="border-l border-slate-800 pl-4">
                  <span className="text-slate-400">{language === 'bn' ? 'পার্থক্য:' : 'Diff:'}</span>{' '}
                  <span className={`font-mono font-bold ${amountDiff > 0 ? 'text-amber-400' : 'text-emerald-400'}`}>
                    {amountDiff > 0 ? '+' : ''}{formatCurrency(amountDiff, language)}
                  </span>
                </div>
              )}
            </div>

            <div className="flex items-center gap-2 self-end sm:self-center">
              <button
                type="button"
                onClick={onClose}
                disabled={isSaving}
                className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold cursor-pointer transition"
              >
                {language === 'bn' ? 'বাতিল' : 'Cancel'}
              </button>
              <button
                type="submit"
                disabled={isSaving}
                className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-white text-xs font-bold transition flex items-center gap-1.5 shadow-lg shadow-amber-950/40 cursor-pointer active:scale-95"
              >
                <Save className="w-3.5 h-3.5" />
                <span>
                  {isSaving
                    ? (language === 'bn' ? 'সংরক্ষণ হচ্ছে...' : 'Saving...')
                    : (language === 'bn' ? 'পরিবর্তন সংরক্ষণ ও স্টক সমন্বয়' : 'Save & Reconcile Stock')}
                </span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
