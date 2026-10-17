import React, { useState, useRef, useEffect } from 'react';
import { useWholesale } from '../context/WholesaleContext';
import { Product, Supplier } from '../types';
import { translations, formatCurrency, getTodayDateString, getYesterdayDateString, round2 } from '../utils/translations';
import { compressImage } from '../utils/imageCompression';
import {
  FileText,
  Camera,
  Upload,
  Sparkles,
  Plus,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  X,
  Building2,
  Package,
  Calendar,
  Layers,
  ArrowRight,
  Eye,
  RefreshCw,
  MinusCircle,
  HelpCircle,
  TrendingDown
} from 'lucide-react';

interface CompanyReplacementMemoModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialSupplierId?: string;
  onSuccess?: (challanNo: string, totalAmount: number) => void;
}

interface ReturnItemRow {
  id: string;
  productId?: string;
  productName: string;
  quantity: number;
  unit: string;
  unitCost: number;
  totalValue: number;
  reason: string;
  currentStock?: number;
}

const REASONS_LIST = [
  'মেয়াদোত্তীর্ণ (Expired)',
  'ড্যামেজ / প্যাকেট নষ্ট (Damaged)',
  'লিকেজ / ভাঙা (Broken/Leakage)',
  'ফ্যাক্টরি ডিফেক্ট (Manufacturing Defect)',
  'কোয়ালিটি সমস্যা (Quality Issue)',
  'অন্যান্য (Other)'
];

export const CompanyReplacementMemoModal: React.FC<CompanyReplacementMemoModalProps> = ({
  isOpen,
  onClose,
  initialSupplierId,
  onSuccess,
}) => {
  const {
    language,
    suppliers,
    products,
    addDirectCompanyReturn,
    currentUser,
  } = useWholesale();

  const t = translations[language];

  // Modes: 'KHATA' (খাতা বা মেমোতে লিখে), 'SCAN' (ইনভয়েস স্ক্যান), 'PHOTO' (ছবি তুলে এন্ট্রি)
  const [activeTab, setActiveTab] = useState<'KHATA' | 'SCAN' | 'PHOTO'>('KHATA');

  // Supplier Selection
  const [selectedSupplierId, setSelectedSupplierId] = useState<string>(
    initialSupplierId || (suppliers[0]?.id || '')
  );

  // Challan No & Date
  const [challanNo, setChallanNo] = useState<string>(() => `COMP-REP-${Date.now().toString().slice(-6)}`);
  const [dispatchDate, setDispatchDate] = useState<string>(getTodayDateString());
  const [notes, setNotes] = useState<string>('');

  // Toggles for Stock and Due deduction
  const [deductStock, setDeductStock] = useState<boolean>(true);
  const [adjustSupplierLedger, setAdjustSupplierLedger] = useState<boolean>(true);

  // Photo & Scan State
  const [capturedPhoto, setCapturedPhoto] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState<boolean>(false);
  const [scanMessage, setScanMessage] = useState<string>('');
  const [scanError, setScanError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const cameraInputRef = useRef<HTMLInputElement | null>(null);

  // Return Items Table
  const [items, setItems] = useState<ReturnItemRow[]>([
    {
      id: `row_${Date.now()}_1`,
      productName: '',
      quantity: 1,
      unit: 'Pcs',
      unitCost: 0,
      totalValue: 0,
      reason: 'মেয়াদোত্তীর্ণ (Expired)',
    },
  ]);

  // Sync initialSupplierId when modal opens
  useEffect(() => {
    if (isOpen) {
      if (initialSupplierId) {
        setSelectedSupplierId(initialSupplierId);
      } else if (suppliers.length > 0 && !selectedSupplierId) {
        setSelectedSupplierId(suppliers[0].id);
      }
      setChallanNo(`COMP-REP-${Date.now().toString().slice(-6)}`);
      setDispatchDate(getTodayDateString());
    }
  }, [isOpen, initialSupplierId, suppliers]);

  if (!isOpen) return null;

  const currentSupplier = suppliers.find((s) => s.id === selectedSupplierId);
  const currentPayable = currentSupplier?.outstandingPayable || 0;

  // Calculate totals
  const totalQuantity = items.reduce((acc, it) => acc + (Number(it.quantity) || 0), 0);
  const totalValue = items.reduce((acc, it) => acc + (Number(it.totalValue) || 0), 0);
  const newPayable = Math.max(0, currentPayable - (adjustSupplierLedger ? totalValue : 0));

  // Handle row changes
  const handleItemChange = (rowId: string, field: keyof ReturnItemRow, value: any) => {
    setItems((prev) =>
      prev.map((row) => {
        if (row.id !== rowId) return row;
        const updated = { ...row, [field]: value };

        if (field === 'quantity' || field === 'unitCost') {
          const q = field === 'quantity' ? Number(value) || 0 : row.quantity;
          const c = field === 'unitCost' ? Number(value) || 0 : row.unitCost;
          updated.totalValue = round2(q * c);
        }
        return updated;
      })
    );
  };

  // Product Selection helper
  const handleSelectProduct = (rowId: string, selectedProdId: string) => {
    const prod = products.find((p) => p.id === selectedProdId);
    if (!prod) return;

    setItems((prev) =>
      prev.map((row) => {
        if (row.id !== rowId) return row;
        const q = row.quantity !== undefined ? row.quantity : 0;
        const cost = prod.costPrice || 0;
        return {
          ...row,
          productId: prod.id,
          productName: prod.bnName || prod.name,
          unit: prod.unit || 'Pcs',
          unitCost: cost,
          totalValue: Math.round(q * cost),
          currentStock: prod.stockQuantity || 0,
        };
      })
    );
  };

  // Add new item row
  const handleAddRow = () => {
    setItems((prev) => [
      ...prev,
      {
        id: `row_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
        productName: '',
        quantity: 1,
        unit: 'Pcs',
        unitCost: 0,
        totalValue: 0,
        reason: 'মেয়াদোত্তীর্ণ (Expired)',
      },
    ]);
  };

  // Remove item row
  const handleRemoveRow = (rowId: string) => {
    if (items.length <= 1) {
      // Clear line instead of removing if last one
      setItems([
        {
          id: `row_${Date.now()}`,
          productName: '',
          quantity: 1,
          unit: 'Pcs',
          unitCost: 0,
          totalValue: 0,
          reason: 'মেয়াদোত্তীর্ণ (Expired)',
        },
      ]);
      return;
    }
    setItems((prev) => prev.filter((r) => r.id !== rowId));
  };

  // Handle Photo Capture or File Selection
  const handleImageFile = async (file: File) => {
    try {
      setScanError(null);
      setScanMessage(language === 'bn' ? 'ছবি প্রসেসিং হচ্ছে...' : 'Processing image...');
      const compressed = await compressImage(file, 1200, 1200, 0.85);
      setCapturedPhoto(compressed);

      if (activeTab === 'SCAN') {
        // Automatically run OCR scanner if on Scan tab
        runScanOcr(compressed);
      } else {
        setScanMessage(language === 'bn' ? 'ছবি সংযুক্ত করা হয়েছে' : 'Photo attached');
      }
    } catch (err: any) {
      setScanError(err.message || 'ছবি লোড করতে ব্যর্থ হয়েছে');
    }
  };

  // Call Server OCR API for Invoice Scanning
  const runScanOcr = async (base64Img: string) => {
    try {
      setIsScanning(true);
      setScanError(null);
      setScanMessage(language === 'bn' ? 'এআই দিয়ে মেমো/চালান স্ক্যান হচ্ছে...' : 'AI scanning memo/challan...');

      const res = await fetch('/api/scan-receipt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageBase64: base64Img,
          mimeType: 'image/jpeg',
          expectedDocType: 'REPLACEMENT_RETURN',
          docType: 'REPLACEMENT_RETURN',
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || 'স্ক্যান করতে ব্যর্থ হয়েছে');
      }

      const parsed = json.data;
      if (!parsed) {
        throw new Error('চালান থেকে কোনো তথ্য পাওয়া যায়নি');
      }

      // Check and match supplier
      if (parsed.supplierName) {
        const found = suppliers.find(
          (s) =>
            s.name.toLowerCase().includes(parsed.supplierName.toLowerCase()) ||
            (s.company && s.company.toLowerCase().includes(parsed.supplierName.toLowerCase())) ||
            parsed.supplierName.toLowerCase().includes(s.name.toLowerCase())
        );
        if (found) {
          setSelectedSupplierId(found.id);
        }
      }

      if (parsed.invoiceNumber) {
        setChallanNo(parsed.invoiceNumber);
      }

      if (parsed.invoiceDate) {
        setDispatchDate(parsed.invoiceDate);
      }

      // Populate line items
      const rawItems = (parsed.replacementItems && parsed.replacementItems.length > 0)
        ? parsed.replacementItems
        : (parsed.items && parsed.items.length > 0 ? parsed.items : []);

      if (rawItems.length > 0) {
        const mappedRows: ReturnItemRow[] = rawItems.map((raw: any, idx: number) => {
          const rawName = String(raw.productName || raw.name || raw.description || `Item #${idx + 1}`);
          const q = raw.quantity !== undefined && !isNaN(Number(raw.quantity)) ? Math.max(0, Number(raw.quantity)) : 0;
          const rate = Number(raw.unitPrice || raw.costPrice || raw.rate) || 0;
          const tot = Number(raw.totalPrice || raw.total) || Math.round(q * rate);
          const u = raw.unit || 'Pcs';

          // Try to match with our warehouse products
          const matchedProduct = products.find(
            (p) =>
              p.name.toLowerCase().trim() === rawName.toLowerCase().trim() ||
              (p.bnName && p.bnName.toLowerCase().trim() === rawName.toLowerCase().trim()) ||
              rawName.toLowerCase().includes(p.name.toLowerCase()) ||
              p.name.toLowerCase().includes(rawName.toLowerCase())
          );

          return {
            id: `scan_row_${Date.now()}_${idx}`,
            productId: matchedProduct?.id,
            productName: matchedProduct ? (matchedProduct.bnName || matchedProduct.name) : rawName,
            quantity: q,
            unit: matchedProduct?.unit || u,
            unitCost: matchedProduct?.costPrice || (rate > 0 ? rate : (tot > 0 && q > 0 ? Math.round(tot / q) : 0)),
            totalValue: tot > 0 ? tot : Math.round(q * rate),
            reason: raw.reason || 'মেয়াদোত্তীর্ণ (Expired)',
            currentStock: matchedProduct?.stockQuantity,
          };
        });

        setItems(mappedRows);
        setScanMessage(
          language === 'bn'
            ? `সফলভাবে ${mappedRows.length}টি পণ্য স্ক্যান করা হয়েছে! তথ্য যাচাই করে সংরক্ষণ করুন।`
            : `Successfully scanned ${mappedRows.length} items! Please review and confirm.`
        );
      } else {
        setScanMessage(language === 'bn' ? 'ছবিটি স্ক্যান হয়েছে, মেমোতে লিখে যাচাই করুন' : 'Scanned, please verify entries');
      }
    } catch (err: any) {
      console.error('Scan failed:', err);
      setScanError(err.message || 'স্ক্যানিং এর সময় সমস্যা হয়েছে। দয়া করে খাতা/মেমোতে লিখে সম্পন্ন করুন।');
    } finally {
      setIsScanning(false);
    }
  };

  // Submit / Confirm Return
  const handleSubmit = () => {
    if (!selectedSupplierId) {
      alert(language === 'bn' ? 'অনুগ্রহ করে কোম্পানি/সাপ্লায়ার নির্বাচন করুন!' : 'Please select a company/supplier!');
      return;
    }

    const validItems = items.filter(
      (it) => it.productName.trim().length > 0 && Number(it.quantity) > 0
    );

    if (validItems.length === 0) {
      alert(language === 'bn' ? 'কমপক্ষে একটি পণ্যের নাম ও পরিমাণ লিখুন!' : 'Please add at least one item with valid quantity!');
      return;
    }

    const res = addDirectCompanyReturn({
      supplierId: selectedSupplierId,
      challanNo,
      dispatchDate,
      items: validItems.map((it) => ({
        productId: it.productId,
        productName: it.productName.trim(),
        quantity: Number(it.quantity) || 0,
        unit: it.unit || 'Pcs',
        value: Number(it.totalValue) || 0,
        reason: it.reason,
      })),
      notes,
      adjustSupplierLedger,
      deductStock,
      photoUrl: capturedPhoto || undefined,
      sourceType: activeTab === 'SCAN' ? 'SCAN' : activeTab === 'PHOTO' ? 'PHOTO' : 'MEMO_KHATA',
    });

    if (res.success) {
      if (onSuccess) {
        onSuccess(challanNo, totalValue);
      }
      onClose();
    } else {
      alert(res.message || 'চালান সংরক্ষণে সমস্যা হয়েছে');
    }
  };

  return (
    <div
      id="company-replacement-memo-modal"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-sm overflow-y-auto"
    >
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 w-full max-w-4xl rounded-2xl shadow-2xl flex flex-col max-h-[92vh] overflow-hidden my-auto animate-in fade-in zoom-in-95 duration-200">
        {/* Top Header */}
        <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800 bg-gradient-to-r from-emerald-600 via-teal-600 to-indigo-600 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur-md flex items-center justify-center text-white font-bold shadow-inner">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-bold tracking-tight">
                {language === 'bn' ? 'কোম্পানি রিপ্লেস চালান ও মেমো এন্ট্রি' : 'Company Replacement Challan & Memo'}
              </h2>
              <p className="text-xs text-emerald-100 font-medium">
                {language === 'bn'
                  ? 'ইনভয়েস স্ক্যান, ছবি তুলে বা খাতা/মেমোতে লিখে এন্ট্রি • স্টক ও কোম্পানির ডিউ থেকে মাইনাস'
                  : 'Scan invoice, snap photo or enter via khata/memo • Auto stock & due deduction'}
              </p>
            </div>
          </div>
          <button
            id="btn-close-replacement-memo-modal"
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 3 Input Tabs */}
        <div className="px-5 pt-3 pb-2 bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 flex items-center gap-2 overflow-x-auto">
          <button
            id="tab-mode-khata"
            type="button"
            onClick={() => setActiveTab('KHATA')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all whitespace-nowrap ${
              activeTab === 'KHATA'
                ? 'bg-emerald-600 text-white shadow-md shadow-emerald-500/20'
                : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700'
            }`}
          >
            <FileText className="w-4 h-4" />
            <span>{language === 'bn' ? 'খাতা বা মেমোতে লিখে এন্ট্রি' : 'Write on Khata/Memo'}</span>
          </button>

          <button
            id="tab-mode-scan"
            type="button"
            onClick={() => setActiveTab('SCAN')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all whitespace-nowrap ${
              activeTab === 'SCAN'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/20'
                : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700'
            }`}
          >
            <Sparkles className="w-4 h-4" />
            <span>{language === 'bn' ? 'ইনভয়েস স্ক্যান (AI OCR)' : 'Invoice Scan (AI OCR)'}</span>
          </button>

          <button
            id="tab-mode-photo"
            type="button"
            onClick={() => setActiveTab('PHOTO')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all whitespace-nowrap ${
              activeTab === 'PHOTO'
                ? 'bg-purple-600 text-white shadow-md shadow-purple-500/20'
                : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700'
            }`}
          >
            <Camera className="w-4 h-4" />
            <span>{language === 'bn' ? 'ছবি তুলে এন্ট্রি' : 'Capture Photo & Enter'}</span>
          </button>
        </div>

        {/* Modal Scrollable Body */}
        <div className="p-5 overflow-y-auto space-y-5 flex-1 text-slate-800 dark:text-slate-100">
          {/* Supplier & Header Information */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800">
            {/* Supplier Selector */}
            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                {language === 'bn' ? 'কোম্পানি / সরবরাহকারী নির্বাচন' : 'Select Company / Supplier'} *
              </label>
              <select
                id="select-company-supplier"
                value={selectedSupplierId}
                onChange={(e) => setSelectedSupplierId(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-emerald-500 font-medium text-slate-800 dark:text-slate-100"
              >
                {suppliers.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.company || s.name} ({s.name})
                  </option>
                ))}
              </select>

              {currentSupplier && (
                <div className="mt-1 flex items-center justify-between text-xs px-1">
                  <span className="text-slate-500 dark:text-slate-400">
                    {language === 'bn' ? 'বর্তমান দেনা (Due):' : 'Current Due:'}
                  </span>
                  <span className="font-bold text-rose-600 dark:text-rose-400">
                    ৳{currentPayable.toLocaleString()}
                  </span>
                </div>
              )}
            </div>

            {/* Challan / Memo No */}
            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                {language === 'bn' ? 'চালান / মেমো নাম্বার' : 'Challan / Memo No.'} *
              </label>
              <input
                id="input-challan-memo-no"
                type="text"
                value={challanNo}
                onChange={(e) => setChallanNo(e.target.value)}
                placeholder="e.g. COMP-REP-001"
                className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-emerald-500 font-mono text-slate-800 dark:text-slate-100"
              />
            </div>

            {/* Dispatch Date with Quick buttons */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400">
                  {language === 'bn' ? 'তারিখ' : 'Date'}
                </label>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setDispatchDate(getTodayDateString())}
                    className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${
                      dispatchDate === getTodayDateString()
                        ? 'bg-emerald-600 text-white'
                        : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                    }`}
                  >
                    {language === 'bn' ? 'আজ' : 'Today'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setDispatchDate(getYesterdayDateString())}
                    className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${
                      dispatchDate === getYesterdayDateString()
                        ? 'bg-emerald-600 text-white'
                        : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                    }`}
                  >
                    {language === 'bn' ? 'গতকাল' : 'Yesterday'}
                  </button>
                </div>
              </div>
              <input
                id="input-dispatch-date"
                type="date"
                value={dispatchDate}
                onChange={(e) => setDispatchDate(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-emerald-500 text-slate-800 dark:text-slate-100"
              />
            </div>
          </div>

          {/* Photo & Scanner Section (Visible when in SCAN or PHOTO tab) */}
          {(activeTab === 'SCAN' || activeTab === 'PHOTO') && (
            <div className="p-4 rounded-xl border border-indigo-200 dark:border-indigo-900/50 bg-indigo-50/50 dark:bg-indigo-950/20 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {activeTab === 'SCAN' ? (
                    <Sparkles className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                  ) : (
                    <Camera className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                  )}
                  <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">
                    {activeTab === 'SCAN'
                      ? language === 'bn'
                        ? 'ইনভয়েস বা খাতার ছবি স্ক্যান করুন'
                        : 'Scan Invoice or Handwritten Memo'
                      : language === 'bn'
                      ? 'চালান বা মেমোর ছবি তুলুন'
                      : 'Capture Memo / Challan Photo'}
                  </h3>
                </div>

                {capturedPhoto && (
                  <button
                    type="button"
                    onClick={() => {
                      setCapturedPhoto(null);
                      setScanMessage('');
                      setScanError(null);
                    }}
                    className="text-xs text-rose-600 dark:text-rose-400 hover:underline flex items-center gap-1 font-medium"
                  >
                    <X className="w-3.5 h-3.5" />
                    {language === 'bn' ? 'ছবি মুছুন' : 'Clear Photo'}
                  </button>
                )}
              </div>

              {/* Hidden file inputs */}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleImageFile(file);
                }}
              />
              <input
                ref={cameraInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleImageFile(file);
                }}
              />

              {/* Capture / Upload Trigger buttons */}
              {!capturedPhoto ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <button
                    id="btn-memo-camera-capture"
                    type="button"
                    onClick={() => cameraInputRef.current?.click()}
                    className="flex items-center justify-center gap-2 p-3 rounded-xl border-2 border-dashed border-indigo-300 dark:border-indigo-800 bg-white dark:bg-slate-800 hover:bg-indigo-50 dark:hover:bg-slate-700/50 text-indigo-700 dark:text-indigo-300 font-semibold text-sm transition-all"
                  >
                    <Camera className="w-5 h-5 text-indigo-500" />
                    <span>{language === 'bn' ? 'ক্যামেরা দিয়ে ছবি তুলুন' : 'Take Photo with Camera'}</span>
                  </button>

                  <button
                    id="btn-memo-file-upload"
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="flex items-center justify-center gap-2 p-3 rounded-xl border-2 border-dashed border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700/50 text-slate-700 dark:text-slate-300 font-semibold text-sm transition-all"
                  >
                    <Upload className="w-5 h-5 text-slate-500" />
                    <span>{language === 'bn' ? 'গ্যালারি বা ফাইল আপলোড' : 'Upload from Gallery/Files'}</span>
                  </button>
                </div>
              ) : (
                <div className="flex flex-col sm:flex-row items-center gap-4 bg-white dark:bg-slate-800 p-3 rounded-xl border border-indigo-100 dark:border-indigo-900">
                  <div className="relative w-36 h-28 rounded-lg overflow-hidden border border-slate-200 dark:border-slate-700 shadow-sm shrink-0 bg-slate-900">
                    <img
                      src={capturedPhoto}
                      alt="Memo Photo"
                      className="w-full h-full object-cover"
                      referrerPolicy="no-referrer"
                    />
                  </div>
                  <div className="flex-1 space-y-2 text-center sm:text-left">
                    <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 font-semibold text-xs">
                      <CheckCircle2 className="w-4 h-4 shrink-0" />
                      <span>{language === 'bn' ? 'ছবি সফলভাবে সংযুক্ত হয়েছে' : 'Photo attached successfully'}</span>
                    </div>

                    {isScanning && (
                      <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400 text-xs font-semibold animate-pulse">
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        <span>{language === 'bn' ? 'এআই দিয়ে মেমোর তথ্য পড়া হচ্ছে...' : 'AI is reading memo data...'}</span>
                      </div>
                    )}

                    {scanMessage && !isScanning && (
                      <p className="text-xs text-slate-600 dark:text-slate-300 font-medium">
                        {scanMessage}
                      </p>
                    )}

                    {scanError && (
                      <div className="flex items-center gap-1.5 text-xs text-rose-600 dark:text-rose-400 font-medium">
                        <AlertTriangle className="w-4 h-4 shrink-0" />
                        <span>{scanError}</span>
                      </div>
                    )}

                    <div className="flex items-center gap-2 pt-1 justify-center sm:justify-start">
                      <button
                        type="button"
                        onClick={() => cameraInputRef.current?.click()}
                        className="text-xs px-2.5 py-1 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 text-slate-700 dark:text-slate-300 rounded font-medium"
                      >
                        {language === 'bn' ? 'পুনরায় ছবি তুলুন' : 'Retake Photo'}
                      </button>
                      {activeTab === 'SCAN' && (
                        <button
                          type="button"
                          disabled={isScanning}
                          onClick={() => capturedPhoto && runScanOcr(capturedPhoto)}
                          className="text-xs px-2.5 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded font-medium flex items-center gap-1"
                        >
                          <Sparkles className="w-3 h-3" />
                          <span>{language === 'bn' ? 'পুনরায় স্ক্যান' : 'Re-scan'}</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Line Items Table (খাতা বা মেমো পাতা) */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Layers className="w-4 h-4 text-emerald-600" />
                <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">
                  {language === 'bn' ? 'রিটার্ন পণ্যের তালিকা (মেমোর বিবরণী)' : 'Return Product Items (Memo Lines)'}
                </h3>
              </div>
              <button
                id="btn-add-return-item-row"
                type="button"
                onClick={handleAddRow}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 border border-emerald-300 dark:border-emerald-800 rounded-lg transition-colors"
              >
                <Plus className="w-4 h-4" />
                <span>{language === 'bn' ? '+ পণ্য যোগ করুন' : '+ Add Item'}</span>
              </button>
            </div>

            <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-100 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 font-semibold border-b border-slate-200 dark:border-slate-700">
                    <tr>
                      <th className="p-2.5 w-10 text-center">#</th>
                      <th className="p-2.5 min-w-[200px]">{language === 'bn' ? 'পণ্যের নাম / স্টক লিংক' : 'Product / Stock Link'}</th>
                      <th className="p-2.5 w-24 text-center">{language === 'bn' ? 'পরিমাণ' : 'Qty'}</th>
                      <th className="p-2.5 w-20 text-center">{language === 'bn' ? 'একক' : 'Unit'}</th>
                      <th className="p-2.5 w-28 text-right">{language === 'bn' ? 'দর (৳)' : 'Cost (৳)'}</th>
                      <th className="p-2.5 w-32 text-right">{language === 'bn' ? 'মোট মূল্য (৳)' : 'Total (৳)'}</th>
                      <th className="p-2.5 min-w-[150px]">{language === 'bn' ? 'ফেরতের কারণ' : 'Reason'}</th>
                      <th className="p-2.5 w-12 text-center"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800 bg-white dark:bg-slate-900">
                    {items.map((row, idx) => {
                      const matchedProd = row.productId ? products.find((p) => p.id === row.productId) : null;
                      const curStock = matchedProd?.stockQuantity ?? row.currentStock;
                      const remStock = curStock !== undefined ? Math.max(0, curStock - (Number(row.quantity) || 0)) : null;

                      return (
                        <tr key={row.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                          <td className="p-2.5 text-center font-bold text-slate-500">
                            {idx + 1}
                          </td>

                          {/* Product Selection / Name */}
                          <td className="p-2">
                            <div className="space-y-1">
                              {/* Datalist / Select dropdown */}
                              <select
                                value={row.productId || ''}
                                onChange={(e) => handleSelectProduct(row.id, e.target.value)}
                                className="w-full px-2 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded focus:ring-1 focus:ring-emerald-500 font-medium text-slate-800 dark:text-slate-100"
                              >
                                <option value="">
                                  {language === 'bn' ? '-- স্টক থেকে পণ্য বাছুন --' : '-- Choose from Warehouse --'}
                                </option>
                                {products.map((p) => (
                                  <option key={p.id} value={p.id}>
                                    {p.bnName || p.name} (স্টক: {p.stockQuantity || 0} {p.unit})
                                  </option>
                                ))}
                              </select>

                              {/* Manual Name input if needed */}
                              <input
                                type="text"
                                value={row.productName}
                                onChange={(e) => handleItemChange(row.id, 'productName', e.target.value)}
                                placeholder={language === 'bn' ? 'অথবা পণ্যের নাম লিখুন...' : 'Or enter custom name...'}
                                className="w-full px-2 py-1 text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded focus:ring-1 focus:ring-emerald-500 text-slate-800 dark:text-slate-100"
                              />

                              {/* Stock preview indicator */}
                              {curStock !== undefined && (
                                <div className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1">
                                  <span>
                                    {language === 'bn'
                                      ? `বর্তমান স্টক: ${curStock} ➔ মাইনাসের পর থাকবে: ${remStock} ${row.unit}`
                                      : `Stock: ${curStock} ➔ After return: ${remStock} ${row.unit}`}
                                  </span>
                                </div>
                              )}
                            </div>
                          </td>

                          {/* Quantity */}
                          <td className="p-2">
                            <input
                              type="number"
                              min="0"
                              step="any"
                              value={row.quantity}
                              onChange={(e) => handleItemChange(row.id, 'quantity', e.target.value === '' ? 0 : Math.max(0, Number(e.target.value)))}
                              className="w-full text-center px-2 py-1.5 text-xs font-bold bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded focus:ring-1 focus:ring-emerald-500 text-slate-800 dark:text-slate-100"
                            />
                          </td>

                          {/* Unit */}
                          <td className="p-2">
                            <input
                              type="text"
                              value={row.unit}
                              onChange={(e) => handleItemChange(row.id, 'unit', e.target.value)}
                              placeholder="Pcs"
                              className="w-full text-center px-1 py-1.5 text-xs bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded focus:ring-1 focus:ring-emerald-500 text-slate-800 dark:text-slate-100"
                            />
                          </td>

                          {/* Unit Cost */}
                          <td className="p-2">
                            <input
                              type="number"
                              min="0"
                              step="any"
                              value={row.unitCost}
                              onChange={(e) => handleItemChange(row.id, 'unitCost', Number(e.target.value) || 0)}
                              className="w-full text-right px-2 py-1.5 text-xs font-semibold bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded focus:ring-1 focus:ring-emerald-500 text-slate-800 dark:text-slate-100"
                            />
                          </td>

                          {/* Line Total */}
                          <td className="p-2 text-right">
                            <span className="font-bold text-slate-900 dark:text-slate-100 font-mono-num">
                              {formatCurrency(row.totalValue, language)}
                            </span>
                          </td>

                          {/* Reason */}
                          <td className="p-2">
                            <select
                              value={row.reason}
                              onChange={(e) => handleItemChange(row.id, 'reason', e.target.value)}
                              className="w-full px-2 py-1.5 text-xs bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded focus:ring-1 focus:ring-emerald-500 text-slate-700 dark:text-slate-200"
                            >
                              {REASONS_LIST.map((r) => (
                                <option key={r} value={r}>
                                  {r}
                                </option>
                              ))}
                            </select>
                          </td>

                          {/* Remove button */}
                          <td className="p-2 text-center">
                            <button
                              type="button"
                              onClick={() => handleRemoveRow(row.id)}
                              className="w-7 h-7 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 flex items-center justify-center transition-colors"
                              title={language === 'bn' ? 'মুছুন' : 'Delete'}
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* DUAL AUTOMATIC DEDUCTION SUMMARY CARD */}
          <div className="p-4 rounded-xl bg-gradient-to-br from-slate-50 to-emerald-50/40 dark:from-slate-800/80 dark:to-emerald-950/20 border border-emerald-200 dark:border-emerald-800/60 space-y-4">
            <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-800 dark:text-emerald-300 flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>{language === 'bn' ? 'অটোমেটিক স্টক ও দেনা সমন্বয় প্রিভিউ' : 'Automatic Stock & Due Deduction Preview'}</span>
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* 1. Stock Deduction Preview */}
              <div className="p-3 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 space-y-2 shadow-sm">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-600 dark:text-slate-400 flex items-center gap-1.5">
                    <Package className="w-4 h-4 text-emerald-600" />
                    {language === 'bn' ? 'স্টক থেকে মাইনাস হবে' : 'Deduct from Stock'}
                  </span>
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      id="toggle-deduct-stock"
                      type="checkbox"
                      checked={deductStock}
                      onChange={(e) => setDeductStock(e.target.checked)}
                      className="w-4 h-4 text-emerald-600 rounded focus:ring-emerald-500"
                    />
                    <span className="text-[11px] font-bold text-emerald-700 dark:text-emerald-400">
                      {deductStock ? (language === 'bn' ? 'চালু (Active)' : 'Active') : (language === 'bn' ? 'বন্ধ (Off)' : 'Off')}
                    </span>
                  </label>
                </div>

                <div className="text-xs space-y-1 pt-1 border-t border-slate-100 dark:border-slate-700">
                  <div className="flex justify-between">
                    <span className="text-slate-500">{language === 'bn' ? 'মোট পণ্যের পদ:' : 'Total Item Types:'}</span>
                    <span className="font-bold">{items.length} {language === 'bn' ? 'টি' : 'items'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">{language === 'bn' ? 'মোট সংখ্যা (পিস):' : 'Total Quantity:'}</span>
                    <span className="font-bold text-rose-600 dark:text-rose-400">
                      - {totalQuantity} {language === 'bn' ? 'পিস বাদ যাবে' : 'units deducted'}
                    </span>
                  </div>
                </div>
              </div>

              {/* 2. Company Due Deduction Preview */}
              <div className="p-3 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 space-y-2 shadow-sm">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-600 dark:text-slate-400 flex items-center gap-1.5">
                    <TrendingDown className="w-4 h-4 text-indigo-600" />
                    {language === 'bn' ? 'কোম্পানির দেনা (Due) থেকে মাইনাস' : 'Deduct from Company Due'}
                  </span>
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      id="toggle-adjust-supplier-ledger"
                      type="checkbox"
                      checked={adjustSupplierLedger}
                      onChange={(e) => setAdjustSupplierLedger(e.target.checked)}
                      className="w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500"
                    />
                    <span className="text-[11px] font-bold text-indigo-700 dark:text-indigo-400">
                      {adjustSupplierLedger ? (language === 'bn' ? 'চালু (Active)' : 'Active') : (language === 'bn' ? 'বন্ধ (Off)' : 'Off')}
                    </span>
                  </label>
                </div>

                <div className="text-xs space-y-1 pt-1 border-t border-slate-100 dark:border-slate-700">
                  <div className="flex justify-between">
                    <span className="text-slate-500">{language === 'bn' ? 'কোম্পানির বর্তমান দেনা:' : 'Current Due:'}</span>
                    <span className="font-semibold">৳{currentPayable.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-rose-600 dark:text-rose-400 font-semibold">
                    <span>{language === 'bn' ? 'রিপ্লেস ফেরত মাইনাস:' : 'Replacement Deducted:'}</span>
                    <span>- ৳{totalValue.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between font-bold pt-1 border-t border-slate-100 dark:border-slate-700 text-emerald-700 dark:text-emerald-400">
                    <span>{language === 'bn' ? 'নতুন অবশিষ্ট দেনা:' : 'New Due Balance:'}</span>
                    <span>৳{newPayable.toLocaleString()}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Notes field */}
            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                {language === 'bn' ? 'মন্তব্য বা চালানের নোট (ঐচ্ছিক)' : 'Notes / Remarks (Optional)'}
              </label>
              <input
                id="input-company-return-notes"
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder={
                  language === 'bn'
                    ? 'ড্রাইভারের নাম, গাড়ি নাম্বার, কার্টন সংখ্যা ইত্যাদি...'
                    : 'Driver name, vehicle, carton details, etc...'
                }
                className="w-full px-3 py-1.5 text-xs bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-emerald-500 text-slate-800 dark:text-slate-100"
              />
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/80 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-start">
            <div className="text-xs">
              <span className="text-slate-500 dark:text-slate-400">{language === 'bn' ? 'মোট মূল্য:' : 'Total Value:'} </span>
              <span className="text-lg font-black text-emerald-600 dark:text-emerald-400">
                ৳{totalValue.toLocaleString()}
              </span>
            </div>
            <span className="text-xs text-slate-400">|</span>
            <div className="text-xs text-slate-600 dark:text-slate-300">
              <span className="font-bold">{totalQuantity}</span> {language === 'bn' ? 'পিস পণ্য' : 'units'}
            </div>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <button
              id="btn-cancel-return-memo"
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-xl transition-colors"
            >
              {language === 'bn' ? 'বাতিল' : 'Cancel'}
            </button>

            <button
              id="btn-submit-company-return-memo"
              type="button"
              onClick={handleSubmit}
              className="flex items-center justify-center gap-2 px-5 py-2.5 text-xs font-bold text-white bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 rounded-xl shadow-lg shadow-emerald-600/20 active:scale-98 transition-all w-full sm:w-auto"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>
                {language === 'bn'
                  ? 'চালান সংরক্ষণ ও সমন্বয় করুন'
                  : 'Confirm & Save Return Challan'}
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
