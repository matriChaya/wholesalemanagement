import React, { useState, useRef, useEffect } from 'react';
import { useWholesale } from '../context/WholesaleContext';
import { translations, formatCurrency, getTodayDateString, round2 } from '../utils/translations';
import { areProductNamesEquivalent, normalizeProductKey } from '../utils/productDeduplication';
import { compressImage } from '../utils/imageCompression';
import {
  Sparkles,
  Camera,
  Upload,
  FileText,
  CheckCircle2,
  AlertCircle,
  X,
  Loader2,
  Plus,
  Trash2,
  Calendar,
  Receipt,
  RefreshCw,
  ShoppingBag,
  Store,
  TrendingDown,
  TrendingUp,
  Banknote,
  Package,
  User,
  Phone,
  Truck,
  DollarSign,
  Layers,
  ArrowRight,
  ShieldCheck,
  Check,
  Edit3,
} from 'lucide-react';

interface MemoKhataScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialMode?: 'COUNTER' | 'DSR' | 'REPLACE';
}

interface ScannedSalesItem {
  id: string;
  name: string;
  quantity: number;
  unit: string;
  costPrice?: number;
  price: number;
  totalPrice: number;
}

interface ScannedReplacementItem {
  id: string;
  name: string;
  quantity: number;
  unit: string;
  value: number;
  reason: string;
}

export const MemoKhataScannerModal: React.FC<MemoKhataScannerModalProps> = ({
  isOpen,
  onClose,
  initialMode = 'COUNTER',
}) => {
  const {
    language,
    retailers,
    products,
    currentUser,
    addCounterOrDsrSalesAndReplacement,
  } = useWholesale();

  const isBn = language === 'bn';
  const t = translations[language];

  const [mode, setMode] = useState<'COUNTER' | 'DSR' | 'REPLACE'>(initialMode);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState<boolean>(false);
  const [scanError, setScanError] = useState<string | null>(null);
  const [scanStep, setScanStep] = useState<'CAPTURE' | 'REVIEW' | 'SUCCESS'>('CAPTURE');

  // Customer / Retailer details
  const [customerName, setCustomerName] = useState<string>('');
  const [customerPhone, setCustomerPhone] = useState<string>('');
  const [selectedRetailerId, setSelectedRetailerId] = useState<string>('');
  const [isNewCustomerMode, setIsNewCustomerMode] = useState<boolean>(false);
  const [memoNumber, setMemoNumber] = useState<string>('');
  const [memoDate, setMemoDate] = useState<string>(getTodayDateString());
  const [paymentMethod, setPaymentMethod] = useState<'Cash' | 'Credit' | 'Bank' | 'Mobile'>('Cash');
  const [notes, setNotes] = useState<string>('');

  // Tables
  const [salesItems, setSalesItems] = useState<ScannedSalesItem[]>([]);
  const [replacementItems, setReplacementItems] = useState<ScannedReplacementItem[]>([]);

  // Payment overrides
  const [paidAmount, setPaidAmount] = useState<number>(0);
  const [savedOrderInfo, setSavedOrderInfo] = useState<any>(null);

  // Camera capture
  const [isCameraActive, setIsCameraActive] = useState<boolean>(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (isOpen) {
      setMode(initialMode);
      resetState();
    } else {
      stopCamera();
    }
  }, [isOpen, initialMode]);

  const resetState = () => {
    setSelectedImage(null);
    setIsScanning(false);
    setScanError(null);
    setScanStep('CAPTURE');
    setCustomerName('');
    setCustomerPhone('');
    setSelectedRetailerId('');
    setMemoNumber(`${mode === 'DSR' ? 'DSR' : mode === 'REPLACE' ? 'RET' : 'CTR'}-${Date.now().toString().slice(-6)}`);
    setMemoDate(getTodayDateString());
    setSalesItems([]);
    setReplacementItems([]);
    setPaidAmount(0);
    setSavedOrderInfo(null);
    setNotes('');
  };

  // Live Camera stream
  const startCamera = async () => {
    setScanError(null);
    try {
      setIsCameraActive(true);
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err: any) {
      console.error('Camera error:', err);
      setIsCameraActive(false);
      setScanError(isBn ? 'ক্যামেরা চালু করা সম্ভব হয়নি। অনুগ্রহ করে ফাইল আপলোড ব্যবহার করুন।' : 'Could not access camera. Please use file upload.');
    }
  };

  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach((track) => track.stop());
      videoRef.current.srcObject = null;
    }
    setIsCameraActive(false);
  };

  const capturePhoto = async () => {
    if (!videoRef.current) return;
    const canvas = document.createElement('canvas');
    canvas.width = videoRef.current.videoWidth || 1280;
    canvas.height = videoRef.current.videoHeight || 720;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
      const rawBase64 = canvas.toDataURL('image/jpeg', 0.85);
      const optimized = await compressImage(rawBase64, 1280, 1280, 0.82).catch(() => rawBase64);
      setSelectedImage(optimized);
      stopCamera();
      triggerScan(optimized);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async () => {
      const base64 = reader.result as string;
      const optimized = await compressImage(base64, 1280, 1280, 0.82).catch(() => base64);
      setSelectedImage(optimized);
      triggerScan(optimized);
    };
    reader.readAsDataURL(file);
  };

  // OCR Processing
  const triggerScan = async (base64Image: string, isSample = false) => {
    setIsScanning(true);
    setScanError(null);

    try {
      const targetDocType = mode === 'REPLACE' ? 'REPLACEMENT_RETURN' : 'SALE_WITH_REPLACEMENT';
      const res = await fetch('/api/scan-invoice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          image: base64Image,
          imageBase64: base64Image,
          docType: targetDocType,
          expectedDocType: targetDocType,
          isSampleTest: isSample,
        }),
      });

      if (!res.ok) {
        const errorText = await res.text().catch(() => '');
        let errMsg = '';
        try {
          const errObj = JSON.parse(errorText);
          errMsg = errObj.error || errObj.message;
        } catch {
          errMsg = errorText;
        }
        throw new Error(errMsg || `Server error (${res.status})`);
      }

      const text = await res.text();
      if (!text || !text.trim()) {
        throw new Error(isBn ? 'সার্ভার থেকে কোনো তথ্য আসেনি। অনুগ্রহ করে আবার চেষ্টা করুন।' : 'Empty server response. Please retry.');
      }

      let json: any;
      try {
        json = JSON.parse(text);
      } catch (parseErr: any) {
        console.error('Response JSON parse error:', parseErr, text.slice(0, 200));
        throw new Error(isBn ? 'স্ক্যান ডেটা প্রসেস করা যায়নি। অনুগ্রহ করে আবার চেষ্টা করুন।' : 'Failed to parse scan data. Please retry.');
      }

      if (!json.success || !json.data) {
        throw new Error(json.error || (isBn ? 'ডকুমেন্ট স্ক্যান ব্যর্থ হয়েছে। পুনরায় চেষ্টা করুন।' : 'Document scan failed. Please retry.'));
      }

      const data = json.data;

      // Extract details
      const cName = data.retailerName || data.supplierName || (mode === 'DSR' ? 'রুট দোকানদার' : 'নগদ ক্রেতা');
      setCustomerName(cName);
      setCustomerPhone(data.supplierContact || '');

      // Try matching existing retailer
      const matchedRetailer = retailers.find(
        (r) =>
          r.shopName.toLowerCase().includes(cName.toLowerCase()) ||
          cName.toLowerCase().includes(r.shopName.toLowerCase()) ||
          (data.supplierContact && r.phone.includes(data.supplierContact))
      );
      if (matchedRetailer) {
        setSelectedRetailerId(matchedRetailer.id);
        setCustomerName(matchedRetailer.shopName);
        setCustomerPhone(matchedRetailer.phone);
      }

      setMemoNumber(data.invoiceNumber || `${mode === 'DSR' ? 'DSR' : 'CTR'}-${Date.now().toString().slice(-6)}`);
      setMemoDate(data.invoiceDate || getTodayDateString());

      // Parse regular sales items
      let parsedSales: ScannedSalesItem[] = [];
      if (Array.isArray(data.items) && data.items.length > 0 && mode !== 'REPLACE') {
        parsedSales = data.items.map((item: any, idx: number) => {
          const qty = item.quantity !== undefined && !isNaN(Number(item.quantity)) ? Math.max(0, Number(item.quantity)) : 0;
          const price = Number(item.costPrice || item.suggestedRetailPrice) || 0;
          const total = item.totalPrice !== undefined && !isNaN(Number(item.totalPrice)) ? Number(item.totalPrice) : qty * price;
          return {
            id: `sales_${Date.now()}_${idx}`,
            name: item.name || `Item ${idx + 1}`,
            quantity: qty,
            unit: item.unit || 'Pcs',
            price: price,
            totalPrice: total,
          };
        });
      }

      // Parse replacement items
      let parsedReplacements: ScannedReplacementItem[] = [];
      if (Array.isArray(data.replacementItems) && data.replacementItems.length > 0) {
        parsedReplacements = data.replacementItems.map((rep: any, idx: number) => ({
          id: `rep_${Date.now()}_${idx}`,
          name: rep.name || `Replacement Item ${idx + 1}`,
          quantity: rep.quantity !== undefined && !isNaN(Number(rep.quantity)) ? Math.max(0, Number(rep.quantity)) : 0,
          unit: rep.unit || 'Pcs',
          value: Number(rep.value) || 0,
          reason: rep.reason || 'ড্যামেজ / নষ্ট / মেয়াদোত্তীর্ণ',
        }));
      } else if (mode === 'REPLACE' && Array.isArray(data.items)) {
        // If mode is REPLACE, all items are replacement returns
        parsedReplacements = data.items.map((item: any, idx: number) => ({
          id: `rep_${Date.now()}_${idx}`,
          name: item.name || `Replacement Item ${idx + 1}`,
          quantity: item.quantity !== undefined && !isNaN(Number(item.quantity)) ? Math.max(0, Number(item.quantity)) : 0,
          unit: item.unit || 'Pcs',
          value: Number(item.totalPrice || item.costPrice) || 0,
          reason: data.replacementReason || 'মার্কেট থেকে ড্যামেজ রিটার্ন',
        }));
      }

      setSalesItems(parsedSales);
      setReplacementItems(parsedReplacements);

      const totalSales = parsedSales.reduce((sum, i) => sum + i.totalPrice, 0);
      const totalRepVal = parsedReplacements.reduce((sum, r) => sum + r.value, 0);
      const netPay = Math.max(0, totalSales - totalRepVal);
      setPaidAmount(data.paidAmount ?? netPay);

      setScanStep('REVIEW');
    } catch (err: any) {
      console.error('Scan Error:', err);
      const isNetworkError =
        err?.name === 'TypeError' ||
        String(err?.message || '').toLowerCase().includes('failed to fetch') ||
        String(err || '').toLowerCase().includes('failed to fetch');
      const message = isNetworkError
        ? (isBn
            ? 'সার্ভার সংযোগে সাময়িক ত্রুটি হয়েছে। আপনি চাইলে সরাসরি মেমো তথ্য টাইপ করে চালিয়ে নিতে পারেন।'
            : 'Server network issue. You can continue by entering memo details directly.')
        : (err.message || (isBn ? 'স্ক্যান সম্পন্ন করা যায়নি' : 'Failed to scan'));
      setScanError(message);
    } finally {
      setIsScanning(false);
    }
  };

  // Sample Memo Loaders for instant testing
  const loadSampleMemo = (sampleType: 'COUNTER' | 'DSR' | 'REPLACE') => {
    setMode(sampleType);
    setIsScanning(true);
    setScanError(null);

    setTimeout(() => {
      const today = getTodayDateString();
      if (sampleType === 'COUNTER') {
        setCustomerName('ভাই ভাই টেলিকম ও ভ্যারাইটিজ');
        setCustomerPhone('01712-345678');
        setMemoNumber(`CTR-${Date.now().toString().slice(-5)}`);
        setMemoDate(today);
        setSalesItems([
          { id: 's1', name: 'PRAN Juice 1L (12 Ctn)', quantity: 2, unit: 'Ctn', price: 650, totalPrice: 1300 },
          { id: 's2', name: 'USB Fast Charging Cable 2.4A', quantity: 10, unit: 'Pcs', price: 90, totalPrice: 900 },
          { id: 's3', name: 'Earbuds Stereo Bass M10', quantity: 3, unit: 'Pcs', price: 350, totalPrice: 1050 },
        ]);
        setReplacementItems([
          { id: 'r1', name: 'USB Fast Charging Cable (No Power/Defect)', quantity: 2, unit: 'Pcs', value: 180, reason: 'সার্কিট নষ্ট / নো চার্জ' },
        ]);
        setPaidAmount(3070); // 3250 - 180
      } else if (sampleType === 'DSR') {
        setCustomerName('মাতৃভাণ্ডার ডিপার্টমেন্টাল স্টোর (রুট ৩)');
        setCustomerPhone('01819-876543');
        setMemoNumber(`DSR-${Date.now().toString().slice(-5)}`);
        setMemoDate(today);
        setSalesItems([
          { id: 's1', name: 'PRAN Potata Biscuit 100g (Box)', quantity: 5, unit: 'Box', price: 420, totalPrice: 2100 },
          { id: 's2', name: 'Mobile Battery BL-5C Original', quantity: 8, unit: 'Pcs', price: 180, totalPrice: 1440 },
          { id: 's3', name: 'Universal Mobile Charger 18W', quantity: 6, unit: 'Pcs', price: 160, totalPrice: 960 },
        ]);
        setReplacementItems([
          { id: 'r1', name: 'PRAN Potata Biscuit (Damage Packaging)', quantity: 1, unit: 'Box', value: 420, reason: 'প্যাকেট ছেঁড়া ও সিল ব্রেক' },
          { id: 'r2', name: 'Mobile Battery BL-5C (Swollen/Battery Low)', quantity: 1, unit: 'Pcs', value: 180, reason: 'ফুলে যাওয়া ও চার্জ না থাকা' },
        ]);
        setPaidAmount(3000); // 4500 - 600 = 3900 net, paid 3000, due 900
      } else {
        setCustomerName('জনতা ইলেকট্রনিক্স');
        setCustomerPhone('01911-223344');
        setMemoNumber(`RET-${Date.now().toString().slice(-5)}`);
        setMemoDate(today);
        setSalesItems([]);
        setReplacementItems([
          { id: 'r1', name: 'Earbuds Stereo Bass M10 (One side silent)', quantity: 4, unit: 'Pcs', value: 1400, reason: 'একপাশে সাউন্ড হয় না' },
          { id: 'r2', name: 'Fast Charger Adapter 25W (Spark defect)', quantity: 2, unit: 'Pcs', value: 500, reason: 'বোর্ড শট' },
        ]);
        setPaidAmount(0);
      }

      setIsScanning(false);
      setScanStep('REVIEW');
    }, 600);
  };

  // Calculations
  const totalSales = round2(salesItems.reduce((acc, item) => acc + item.totalPrice, 0));
  const totalReplacement = round2(replacementItems.reduce((acc, item) => acc + item.value, 0));
  const netPayable = round2(Math.max(0, totalSales - totalReplacement));
  const calculatedDue = round2(Math.max(0, netPayable - paidAmount));

  // Modify Rows
  const startManualEntry = () => {
    setSelectedImage(null);
    setIsCameraActive(false);
    setScanError(null);
    if (!memoNumber) {
      setMemoNumber(`${mode === 'DSR' ? 'DSR' : 'CTR'}-${Date.now().toString().slice(-5)}`);
    }
    if (salesItems.length === 0) {
      setSalesItems([
        {
          id: `sales_${Date.now()}`,
          name: '',
          quantity: 1,
          unit: 'Pcs',
          costPrice: 0,
          price: 0,
          totalPrice: 0,
        },
      ]);
    }
    setScanStep('REVIEW');
  };

  const addSalesRow = () => {
    setSalesItems((prev) => [
      ...prev,
      {
        id: `sales_${Date.now()}`,
        name: '',
        quantity: 1,
        unit: 'Pcs',
        costPrice: 0,
        price: 0,
        totalPrice: 0,
      },
    ]);
  };

  const updateSalesRow = (id: string, field: keyof ScannedSalesItem, value: any) => {
    setSalesItems((prev) =>
      prev.map((row) => {
        if (row.id === id) {
          const updated = { ...row, [field]: value };
          if (field === 'name') {
            const trimmed = String(value).trim();
            const normVal = normalizeProductKey(trimmed);
            const matched = products.find(
              (p) =>
                areProductNamesEquivalent(p.name, trimmed) ||
                areProductNamesEquivalent(p.bnName, trimmed) ||
                (normVal && normalizeProductKey(p.name) === normVal) ||
                (normVal && p.bnName && normalizeProductKey(p.bnName) === normVal)
            );
            if (matched) {
              updated.name = matched.name;
              updated.unit = matched.unit || updated.unit;
              if (!updated.costPrice || Number(updated.costPrice) === 0) {
                updated.costPrice = matched.costPrice || 0;
              }
              if (!updated.price || Number(updated.price) === 0) {
                updated.price = matched.wholesalePrice || matched.mrp || 0;
              }
              updated.totalPrice = round2((Number(updated.quantity) || 0) * (Number(updated.price) || 0));
            }
          }
          if (field === 'quantity' || field === 'price') {
            updated.totalPrice = round2((Number(updated.quantity) || 0) * (Number(updated.price) || 0));
          }
          return updated;
        }
        return row;
      })
    );
  };

  const removeSalesRow = (id: string) => {
    setSalesItems((prev) => prev.filter((row) => row.id !== id));
  };

  const addReplacementRow = () => {
    setReplacementItems((prev) => [
      ...prev,
      {
        id: `rep_${Date.now()}`,
        name: '',
        quantity: 1,
        unit: 'Pcs',
        value: 0,
        reason: 'ড্যামেজ / নষ্ট পণ্য',
      },
    ]);
  };

  const updateReplacementRow = (id: string, field: keyof ScannedReplacementItem, value: any) => {
    setReplacementItems((prev) =>
      prev.map((row) => (row.id === id ? { ...row, [field]: value } : row))
    );
  };

  const removeReplacementRow = (id: string) => {
    setReplacementItems((prev) => prev.filter((row) => row.id !== id));
  };

  // Save to Wholesale ERP System
  const handleSaveToSystem = () => {
    if (!customerName && !selectedRetailerId) {
      setScanError(isBn ? 'দোকান বা ক্রেতার নাম দিন' : 'Please provide customer/retailer name');
      return;
    }

    if (salesItems.length === 0 && replacementItems.length === 0) {
      setScanError(isBn ? 'কমপক্ষে একটি বিক্রয় বা রিপ্লেসমেন্ট আইটেম থাকতে হবে' : 'Provide at least one sales or replacement item');
      return;
    }

    try {
      const result = addCounterOrDsrSalesAndReplacement({
        operatorMode: mode === 'DSR' ? 'DSR' : 'COUNTER',
        customerName: customerName,
        retailerName: customerName,
        retailerId: selectedRetailerId || undefined,
        customerPhone: customerPhone,
        invoiceNumber: memoNumber,
        invoiceDate: memoDate,
        salesItems: salesItems.map((si) => ({
          name: si.name,
          quantity: si.quantity,
          unit: si.unit,
          costPrice: si.costPrice,
          price: si.price,
          totalPrice: si.totalPrice,
        })),
        replacementItems: replacementItems.map((ri) => ({
          productName: ri.name,
          quantity: ri.quantity,
          unit: ri.unit,
          value: ri.value,
          reason: ri.reason,
        })),
        totalSalesAmount: totalSales,
        replacementDeductionAmount: totalReplacement,
        netPayableAmount: netPayable,
        paidAmount: paidAmount,
        dueAmount: calculatedDue,
        paymentMethod: paymentMethod,
        notes: notes,
        scannedByRole: currentUser.role,
        scannedByName: currentUser.name,
        scannedByPhone: currentUser.phone,
        scannedByUserId: currentUser.id,
      });

      if (result.success) {
        setSavedOrderInfo({
          order: result.order,
          replacementCount: result.replacementCount,
          customerName,
          totalSales,
          totalReplacement,
          netPayable,
          paidAmount,
          dueAmount: calculatedDue,
        });
        setScanStep('SUCCESS');
      } else {
        setScanError(result.message);
      }
    } catch (err: any) {
      console.error('Save failed:', err);
      setScanError(err.message || 'সংরক্ষণ ব্যর্থ হয়েছে');
    }
  };

  if (!isOpen) return null;

  return (
    <div id="memo-khata-scanner-modal" className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/80 backdrop-blur-sm overflow-y-auto animate-fadeIn">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden my-auto">
        {/* Modal Header */}
        <div className="bg-gradient-to-r from-emerald-700 via-teal-700 to-cyan-800 text-white px-5 py-4 flex items-center justify-between shadow-md">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/15 border border-white/20 flex items-center justify-center shadow-inner">
              <Receipt className="w-5 h-5 text-emerald-200" />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-bold tracking-wide flex items-center gap-2">
                {isBn ? 'ক্যাশ কাউন্টার ও DSR খাতা স্ক্যান' : 'Cash Counter & DSR Khata Scanner'}
                <span className="text-xs bg-emerald-500/30 text-emerald-100 px-2 py-0.5 rounded-full border border-emerald-400/40">
                  AI OCR
                </span>
              </h2>
              <p className="text-xs text-emerald-100/80">
                {isBn
                  ? 'কাউন্টার মেমো বা ডিএসআর খাতার পাতা স্ক্যান করে বিক্রয় ও রিপ্লেসমেন্ট সরাসরি এন্ট্রি করুন'
                  : 'Scan memos or notebook ledger pages to automatically reconcile sales and damaged returns'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Operating Mode Bar */}
        <div className="bg-slate-100/90 border-b border-slate-200 px-5 py-2.5 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 p-1 bg-white rounded-xl border border-slate-200 shadow-sm text-xs font-medium">
            <button
              onClick={() => setMode('COUNTER')}
              className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-all ${
                mode === 'COUNTER'
                  ? 'bg-emerald-600 text-white shadow-sm font-semibold'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <Store className="w-3.5 h-3.5" />
              {isBn ? '🏪 ক্যাশ কাউন্টার মেমো' : 'Cash Counter Memo'}
            </button>
            <button
              onClick={() => setMode('DSR')}
              className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-all ${
                mode === 'DSR'
                  ? 'bg-teal-700 text-white shadow-sm font-semibold'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <Truck className="w-3.5 h-3.5" />
              {isBn ? '🛵 ডিএসআর ডেলিভারি ও রিপ্লেস খাতা' : 'DSR Route Khata'}
            </button>
            <button
              onClick={() => setMode('REPLACE')}
              className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-all ${
                mode === 'REPLACE'
                  ? 'bg-amber-600 text-white shadow-sm font-semibold'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <Package className="w-3.5 h-3.5" />
              {isBn ? '📦 শুধুমাত্র রিপ্লেস রিটার্ন' : 'Replacement Return Only'}
            </button>
          </div>

          {scanStep === 'REVIEW' && (
            <button
              onClick={resetState}
              className="text-xs text-slate-500 hover:text-slate-800 flex items-center gap-1 py-1 px-2.5 rounded-md hover:bg-slate-200 transition-colors"
            >
              <RefreshCw className="w-3 h-3" />
              {isBn ? 'নতুন স্ক্যান' : 'New Scan'}
            </button>
          )}
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-5">
          {scanError && (
            <div className="bg-rose-50 border border-rose-200 rounded-xl p-3 flex items-start gap-3 text-rose-800 text-sm animate-shake">
              <AlertCircle className="w-5 h-5 text-rose-500 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold">{isBn ? 'ত্রুটি' : 'Error'}</p>
                <p className="text-xs text-rose-700">{scanError}</p>
              </div>
            </div>
          )}

          {/* STEP 1: CAPTURE & UPLOAD */}
          {scanStep === 'CAPTURE' && (
            <div className="space-y-6">
              {/* Camera view or Upload Area */}
              {isCameraActive ? (
                <div className="relative rounded-2xl overflow-hidden bg-black aspect-video sm:aspect-[16/9] flex items-center justify-center shadow-lg border border-slate-700">
                  <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover" />
                  <div className="absolute inset-0 border-2 border-emerald-400/50 rounded-2xl pointer-events-none m-4 flex items-center justify-center">
                    <p className="text-white/80 bg-black/60 px-3 py-1 rounded-full text-xs backdrop-blur-sm">
                      {isBn ? 'কাউন্টার মেমো বা খাতার পাতাটি ফ্রেমের ভেতরে রাখুন' : 'Place memo or khata page inside frame'}
                    </p>
                  </div>
                  <div className="absolute bottom-4 inset-x-0 flex items-center justify-center gap-4">
                    <button
                      onClick={capturePhoto}
                      className="px-6 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white font-semibold rounded-full shadow-xl flex items-center gap-2 transition-transform active:scale-95"
                    >
                      <Camera className="w-4 h-4" />
                      {isBn ? 'ছবি তুলুন ও স্ক্যান করুন' : 'Capture & Scan'}
                    </button>
                    <button
                      onClick={stopCamera}
                      className="px-4 py-2.5 bg-slate-800/80 hover:bg-slate-700 text-white rounded-full text-xs backdrop-blur-sm"
                    >
                      {isBn ? 'বন্ধ করুন' : 'Cancel'}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Option 1: Live Camera */}
                  <div
                    onClick={startCamera}
                    className="group border-2 border-dashed border-emerald-300 hover:border-emerald-500 bg-emerald-50/40 hover:bg-emerald-50/80 rounded-2xl p-6 flex flex-col items-center justify-center text-center cursor-pointer transition-all hover:shadow-md"
                  >
                    <div className="w-14 h-14 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center mb-3 group-hover:scale-105 transition-transform shadow-inner">
                      <Camera className="w-7 h-7" />
                    </div>
                    <h3 className="font-semibold text-slate-800 text-base mb-1">
                      {isBn ? 'লাইভ ক্যামেরা দিয়ে ছবি তুলুন' : 'Capture with Camera'}
                    </h3>
                    <p className="text-xs text-slate-500 max-w-xs">
                      {isBn
                        ? 'স্মার্টফোন বা ওয়েবক্যাম দিয়ে ক্যাশ মেমো বা খাতার পাতা সরাসরি স্ক্যান করুন'
                        : 'Use smartphone camera or webcam to take an instant clear photo of the document'}
                    </p>
                  </div>

                  {/* Option 2: File Upload */}
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="group border-2 border-dashed border-teal-300 hover:border-teal-500 bg-teal-50/40 hover:bg-teal-50/80 rounded-2xl p-6 flex flex-col items-center justify-center text-center cursor-pointer transition-all hover:shadow-md"
                  >
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                    <div className="w-14 h-14 rounded-2xl bg-teal-100 text-teal-700 flex items-center justify-center mb-3 group-hover:scale-105 transition-transform shadow-inner">
                      <Upload className="w-7 h-7" />
                    </div>
                    <h3 className="font-semibold text-slate-800 text-base mb-1">
                      {isBn ? 'মেমো / খাতার ছবি আপলোড করুন' : 'Upload Memo / Khata Photo'}
                    </h3>
                    <p className="text-xs text-slate-500 max-w-xs">
                      {isBn
                        ? 'গ্যালারি বা ফাইল থেকে রশিদের JPG, PNG ছবি নির্বাচন করুন'
                        : 'Select JPG or PNG invoice/memo image from your phone or PC storage'}
                    </p>
                  </div>

                  {/* Option 3: Direct Manual Entry Without Camera */}
                  <div
                    onClick={startManualEntry}
                    className="sm:col-span-2 group border-2 border-dashed border-indigo-300 hover:border-indigo-500 bg-indigo-50/40 hover:bg-indigo-50/80 rounded-2xl p-4 flex sm:flex-row flex-col items-center justify-between gap-4 cursor-pointer transition-all hover:shadow-md"
                  >
                    <div className="flex items-center gap-3.5">
                      <div className="w-12 h-12 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform shadow-inner">
                        <Edit3 className="w-6 h-6" />
                      </div>
                      <div className="text-left">
                        <h3 className="font-bold text-slate-800 text-sm">
                          {isBn ? '✍️ ছবি ছাড়া সরাসরি টাইপ করে মেমো তৈরি করুন (ম্যানুয়াল এন্ট্রি)' : '✍️ Direct Manual Entry (Type Items & Prices)'}
                        </h3>
                        <p className="text-xs text-slate-500">
                          {isBn
                            ? 'ক্যামেরা বা স্ক্যান ছাড়া সরাসরি পণ্যের নাম, কেনা দাম (ক্রয় মূল্য) এবং বিক্রি দাম লিখে মেমো কাটুন'
                            : 'Type product name, cost price and selling price directly into invoice without scanning'}
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        startManualEntry();
                      }}
                      className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shrink-0 transition shadow-sm active:scale-95"
                    >
                      {isBn ? 'সরাসরি টাইপ করুন' : 'Start Typing'}
                    </button>
                  </div>
                </div>
              )}

              {/* Scanning loading indicator */}
              {isScanning && (
                <div className="bg-slate-50 border border-slate-200 rounded-2xl p-8 flex flex-col items-center justify-center text-center space-y-3">
                  <div className="relative">
                    <div className="w-14 h-14 rounded-full border-4 border-emerald-200 border-t-emerald-600 animate-spin" />
                    <Sparkles className="w-6 h-6 text-emerald-600 absolute inset-0 m-auto animate-pulse" />
                  </div>
                  <h4 className="font-bold text-slate-800 text-base">
                    {isBn ? 'Gemini AI মেমো ও খাতার হিসাব পড়ছে...' : 'Gemini AI OCR Analyzing Memo & Khata...'}
                  </h4>
                  <p className="text-xs text-slate-500 max-w-md">
                    {isBn
                      ? 'কলমে লেখা খাতার হিসাব, পণ্যের পরিমাণ, রেট এবং ফেরত/ড্যামেজ মাল আলাদাভাবে চিহ্নিত করা হচ্ছে...'
                      : 'Recognizing handwritten items, sales rates, and damaged replacement deductions...'}
                  </p>
                </div>
              )}

              {/* Instant Test Preset Buttons */}
              <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5 uppercase tracking-wider">
                    <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                    {isBn ? 'ইনস্ট্যান্ট নমুনা টেস্ট ডেটা (Instant Demo Test)' : 'Instant Demo Samples'}
                  </span>
                  <span className="text-[11px] text-slate-500">
                    {isBn ? 'স্ক্যান বা ক্যামেরা ছাড়াই সরাসরি টেস্ট করুন' : 'Test directly without physical camera'}
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  <button
                    onClick={() => loadSampleMemo('COUNTER')}
                    className="p-3 bg-white hover:bg-emerald-50 border border-slate-200 hover:border-emerald-300 rounded-xl text-left transition-all shadow-sm group"
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <Store className="w-4 h-4 text-emerald-600 group-hover:scale-110 transition-transform" />
                      <span className="text-xs font-bold text-slate-800">{isBn ? 'নমুনা কাউন্টার মেমো' : 'Sample Counter Memo'}</span>
                    </div>
                    <p className="text-[11px] text-slate-500 line-clamp-2">
                      {isBn ? '৩টি বিক্রয় আইটেম + ১টি ড্যামেজ ক্যাবল ফেরত সমন্বয়' : '3 sales items + 1 damage cable return adjustment'}
                    </p>
                  </button>

                  <button
                    onClick={() => loadSampleMemo('DSR')}
                    className="p-3 bg-white hover:bg-teal-50 border border-slate-200 hover:border-teal-300 rounded-xl text-left transition-all shadow-sm group"
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <Truck className="w-4 h-4 text-teal-600 group-hover:scale-110 transition-transform" />
                      <span className="text-xs font-bold text-slate-800">{isBn ? 'নমুনা DSR রুট খাতা' : 'Sample DSR Route Khata'}</span>
                    </div>
                    <p className="text-[11px] text-slate-500 line-clamp-2">
                      {isBn ? 'রুট ডেলিভারি বিক্রয় + ২ ধরণের ড্যামেজ পণ্য বাদ দিয়ে বকেয়া হিসাব' : 'Route delivery sales + 2 damaged items deduction with due'}
                    </p>
                  </button>

                  <button
                    onClick={() => loadSampleMemo('REPLACE')}
                    className="p-3 bg-white hover:bg-amber-50 border border-slate-200 hover:border-amber-300 rounded-xl text-left transition-all shadow-sm group"
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <Package className="w-4 h-4 text-amber-600 group-hover:scale-110 transition-transform" />
                      <span className="text-xs font-bold text-slate-800">{isBn ? 'নমুনা রিপ্লেসমেন্ট স্লিপ' : 'Sample Replacement Slip'}</span>
                    </div>
                    <p className="text-[11px] text-slate-500 line-clamp-2">
                      {isBn ? 'শুধুমাত্র মার্কেট থেকে ফেরত আসা নষ্ট পণ্যের জমা স্লিপ' : 'Pure damage goods return slip from retail market'}
                    </p>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* STEP 2: REVIEW & EDIT */}
          {scanStep === 'REVIEW' && (
            <div className="space-y-6">
              {/* Header Information Card */}
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3.5">
                {/* Customer / Retailer */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-semibold text-slate-600">
                      {isBn ? 'দোকান / ক্রেতার নাম' : 'Shop / Customer Name'}
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        const next = !isNewCustomerMode;
                        setIsNewCustomerMode(next);
                        if (next) {
                          setSelectedRetailerId('');
                          setCustomerName('');
                          setCustomerPhone('');
                        }
                      }}
                      className="text-[10px] font-semibold text-emerald-600 hover:text-emerald-700 hover:underline cursor-pointer"
                    >
                      {isNewCustomerMode
                        ? (isBn ? '← তালিকা থেকে বাছুন' : '← From list')
                        : (isBn ? '+ নতুন কাস্টমার' : '+ New Customer')}
                    </button>
                  </div>

                  {!isNewCustomerMode && retailers.length > 0 ? (
                    <select
                      value={selectedRetailerId}
                      onChange={(e) => {
                        const val = e.target.value;
                        if (val === '__NEW__') {
                          setIsNewCustomerMode(true);
                          setSelectedRetailerId('');
                          setCustomerName('');
                          setCustomerPhone('');
                        } else {
                          setSelectedRetailerId(val);
                          const ret = retailers.find((r) => r.id === val);
                          if (ret) {
                            setCustomerName(ret.shopName);
                            setCustomerPhone(ret.phone);
                          } else {
                            setCustomerName('');
                          }
                        }
                      }}
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-medium focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                    >
                      <option value="">{isBn ? '-- সংরক্ষিত রিটেইলার বেছে নিন --' : '-- Choose Saved Retailer --'}</option>
                      {retailers.map((r) => (
                        <option key={r.id} value={r.id}>
                          {r.shopName} - {r.ownerName} ({r.phone})
                        </option>
                      ))}
                      <option value="__NEW__" className="text-emerald-600 font-bold bg-emerald-50">
                        ➕ {isBn ? 'নতুন কাস্টমার / দোকানদার যোগ করুন' : 'Add New Customer / Retailer'}
                      </option>
                    </select>
                  ) : (
                    <input
                      type="text"
                      autoFocus={isNewCustomerMode}
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      placeholder={isBn ? 'নতুন দোকানের নাম লিখুন' : 'Shop name'}
                      className="w-full px-3 py-2 bg-white border border-emerald-500/80 rounded-xl text-xs font-medium focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                    />
                  )}
                </div>

                {/* Customer Phone */}
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">
                    {isBn ? 'মোবাইল নম্বর' : 'Phone Number'}
                  </label>
                  <input
                    type="text"
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    placeholder="017xxxxxxxx"
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-medium focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>

                {/* Memo Number */}
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">
                    {isBn ? 'মেমো / পাতা নং' : 'Memo / Page #'}
                  </label>
                  <input
                    type="text"
                    value={memoNumber}
                    onChange={(e) => setMemoNumber(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-medium focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>

                {/* Invoice Date */}
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">
                    {isBn ? 'তারিখ' : 'Date'}
                  </label>
                  <input
                    type="date"
                    value={memoDate}
                    onChange={(e) => setMemoDate(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-medium focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* TABLE 1: REGULAR SALES ITEMS */}
              {mode !== 'REPLACE' && (
                <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
                  <div className="bg-slate-100/80 px-4 py-3 border-b border-slate-200 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <ShoppingBag className="w-4 h-4 text-emerald-600" />
                      <h4 className="font-bold text-sm text-slate-800">
                        {isBn ? '১. নিয়মিত বিক্রয়কৃত পণ্যসমূহ (Sales Items)' : '1. Regular Sales Items'}
                      </h4>
                      <span className="text-xs bg-emerald-100 text-emerald-800 font-semibold px-2 py-0.5 rounded-full">
                        {salesItems.length} {isBn ? 'টি আইটেম' : 'items'}
                      </span>
                    </div>
                    <button
                      onClick={addSalesRow}
                      className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-medium flex items-center gap-1 transition-colors"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      {isBn ? 'আইটেম যোগ করুন' : 'Add Item'}
                    </button>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                          <th className="py-2.5 px-3">{isBn ? 'পণ্যের নাম' : 'Product Name'}</th>
                          <th className="py-2.5 px-2 w-16 text-center">{isBn ? 'পরিমাণ' : 'Qty'}</th>
                          <th className="py-2.5 px-2 w-16 text-center">{isBn ? 'একক' : 'Unit'}</th>
                          <th className="py-2.5 px-2 w-24 text-right text-emerald-700">{isBn ? 'কেনা দাম (৳)' : 'Cost Price (৳)'}</th>
                          <th className="py-2.5 px-2 w-24 text-right text-sky-700">{isBn ? 'বিক্রি দাম (৳)' : 'Selling Price (৳)'}</th>
                          <th className="py-2.5 px-2 w-24 text-right text-amber-700">{isBn ? 'মোট টাকা (৳)' : 'Total (৳)'}</th>
                          <th className="py-2.5 px-2 w-8 text-center"></th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {salesItems.length === 0 ? (
                          <tr>
                            <td colSpan={7} className="text-center py-6 text-slate-400 text-xs">
                              {isBn ? 'কোনো বিক্রয় পণ্য নেই। আইটেম যোগ করুন।' : 'No sales items listed.'}
                            </td>
                          </tr>
                        ) : (
                          salesItems.map((item) => (
                            <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                              <td className="py-2 px-3">
                                <input
                                  type="text"
                                  list="memokhata-products-list"
                                  value={item.name}
                                  onChange={(e) => updateSalesRow(item.id, 'name', e.target.value)}
                                  placeholder={isBn ? 'পণ্যের নাম টাইপ করুন...' : 'Type product name...'}
                                  className="w-full px-2 py-1.5 bg-slate-50 focus:bg-white border border-slate-200 rounded-lg text-xs font-medium focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                                />
                              </td>
                              <td className="py-2 px-2">
                                <input
                                  type="number"
                                  min="0"
                                  step="any"
                                  value={item.quantity}
                                  onChange={(e) => updateSalesRow(item.id, 'quantity', e.target.value === '' ? 0 : Math.max(0, Number(e.target.value)))}
                                  className="w-full px-1.5 py-1.5 bg-slate-50 focus:bg-white border border-slate-200 rounded-lg text-xs font-semibold text-center focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                                />
                              </td>
                              <td className="py-2 px-2">
                                <input
                                  type="text"
                                  value={item.unit}
                                  onChange={(e) => updateSalesRow(item.id, 'unit', e.target.value)}
                                  className="w-full px-1.5 py-1.5 bg-slate-50 focus:bg-white border border-slate-200 rounded-lg text-xs text-center focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                                />
                              </td>
                              <td className="py-2 px-2">
                                <input
                                  type="number"
                                  min="0"
                                  step="any"
                                  value={item.costPrice !== undefined ? item.costPrice : ''}
                                  placeholder="0"
                                  onChange={(e) => updateSalesRow(item.id, 'costPrice', Number(e.target.value))}
                                  title={isBn ? 'কেনা দাম বা ক্রয় মূল্য' : 'Cost Price'}
                                  className="w-full px-1.5 py-1.5 bg-emerald-50/50 focus:bg-white border border-emerald-200 rounded-lg text-xs font-semibold text-right text-emerald-700 focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                                />
                              </td>
                              <td className="py-2 px-2">
                                <input
                                  type="number"
                                  min="0"
                                  step="any"
                                  value={item.price}
                                  onChange={(e) => updateSalesRow(item.id, 'price', Number(e.target.value))}
                                  title={isBn ? 'বিক্রি দাম বা বিক্রয় দর' : 'Selling Price'}
                                  className="w-full px-1.5 py-1.5 bg-sky-50/50 focus:bg-white border border-sky-200 rounded-lg text-xs font-semibold text-right text-sky-700 focus:ring-1 focus:ring-sky-500 focus:outline-none"
                                />
                              </td>
                              <td className="py-2 px-2 text-right font-bold text-slate-800 font-mono-num">
                                {formatCurrency(item.totalPrice, language)}
                              </td>
                              <td className="py-2 px-2 text-center">
                                <button
                                  onClick={() => removeSalesRow(item.id)}
                                  className="text-slate-400 hover:text-rose-600 p-1 transition-colors"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                      <tfoot>
                        <tr className="bg-slate-50/90 font-bold border-t border-slate-200">
                          <td colSpan={5} className="py-2.5 px-3 text-right text-slate-700">
                            {isBn ? 'মোট বিক্রয় মূল্য (Subtotal):' : 'Total Sales Subtotal:'}
                          </td>
                          <td className="py-2.5 px-2 text-right text-emerald-700 text-sm">
                            ৳{totalSales.toLocaleString()}
                          </td>
                          <td></td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>

                  <datalist id="memokhata-products-list">
                    {products.map((p) => (
                      <option key={p.id} value={p.name}>
                        {p.bnName && p.bnName !== p.name ? `${p.bnName} | ` : ''}স্টক: {p.stockQuantity ?? (p as any).currentStock ?? 0} {p.unit} | কেনা: ৳{p.costPrice} | বিক্রি: ৳{p.wholesalePrice}
                      </option>
                    ))}
                  </datalist>
                </div>
              )}

              {/* TABLE 2: REPLACEMENT & DAMAGED GOODS RETURN */}
              <div className="bg-white border border-amber-200/80 rounded-2xl overflow-hidden shadow-sm">
                <div className="bg-amber-50/80 px-4 py-3 border-b border-amber-200 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Package className="w-4 h-4 text-amber-600" />
                    <h4 className="font-bold text-sm text-slate-800">
                      {isBn ? '২. ফেরত/ড্যামেজ রিপ্লেসমেন্ট পণ্য (Replacement Items)' : '2. Returned Damaged / Replacement Items'}
                    </h4>
                    <span className="text-xs bg-amber-100 text-amber-800 font-semibold px-2 py-0.5 rounded-full">
                      {replacementItems.length} {isBn ? 'টি ফেরত পণ্য' : 'returned items'}
                    </span>
                  </div>
                  <button
                    onClick={addReplacementRow}
                    className="px-2.5 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-medium flex items-center gap-1 transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    {isBn ? 'রিপ্লেস যোগ করুন' : 'Add Replacement'}
                  </button>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-amber-50/40 text-slate-600 font-semibold border-b border-amber-100">
                        <th className="py-2.5 px-3">{isBn ? 'ড্যামেজ পণ্যের নাম' : 'Damaged Item Name'}</th>
                        <th className="py-2.5 px-3 w-20 text-center">{isBn ? 'পরিমাণ' : 'Qty'}</th>
                        <th className="py-2.5 px-3 w-40">{isBn ? 'ত্রুটি / কারণ' : 'Defect Reason'}</th>
                        <th className="py-2.5 px-3 w-32 text-right">{isBn ? 'ফেরত মূল্য (টাকা)' : 'Deduction Value (৳)'}</th>
                        <th className="py-2.5 px-2 w-10 text-center"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-amber-50">
                      {replacementItems.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="text-center py-5 text-slate-400 text-xs">
                            {isBn ? 'কোনো ড্যামেজ বা রিপ্লেসমেন্ট ফেরত নেই।' : 'No damaged items returned on this memo.'}
                          </td>
                        </tr>
                      ) : (
                        replacementItems.map((rep) => (
                          <tr key={rep.id} className="hover:bg-amber-50/30 transition-colors">
                            <td className="py-2 px-3">
                              <input
                                type="text"
                                value={rep.name}
                                onChange={(e) => updateReplacementRow(rep.id, 'name', e.target.value)}
                                placeholder={isBn ? 'ড্যামেজ পণ্যের বিবরণ' : 'Damaged item'}
                                className="w-full px-2 py-1.5 bg-slate-50 focus:bg-white border border-slate-200 rounded-lg text-xs font-medium focus:ring-1 focus:ring-amber-500 focus:outline-none"
                              />
                            </td>
                            <td className="py-2 px-3">
                              <input
                                type="number"
                                min="0"
                                step="any"
                                value={rep.quantity}
                                onChange={(e) => updateReplacementRow(rep.id, 'quantity', e.target.value === '' ? 0 : Math.max(0, Number(e.target.value)))}
                                className="w-full px-2 py-1.5 bg-slate-50 focus:bg-white border border-slate-200 rounded-lg text-xs font-semibold text-center focus:ring-1 focus:ring-amber-500 focus:outline-none"
                              />
                            </td>
                            <td className="py-2 px-3">
                              <input
                                type="text"
                                value={rep.reason}
                                onChange={(e) => updateReplacementRow(rep.id, 'reason', e.target.value)}
                                placeholder={isBn ? 'যেমন: নষ্ট / লিকেজ / মেয়াদহীন' : 'Defect reason'}
                                className="w-full px-2 py-1.5 bg-slate-50 focus:bg-white border border-slate-200 rounded-lg text-xs text-amber-900 focus:ring-1 focus:ring-amber-500 focus:outline-none"
                              />
                            </td>
                            <td className="py-2 px-3">
                              <input
                                type="number"
                                min="0"
                                step="any"
                                value={rep.value}
                                onChange={(e) => updateReplacementRow(rep.id, 'value', Number(e.target.value))}
                                className="w-full px-2 py-1.5 bg-amber-50/60 focus:bg-white border border-amber-200 rounded-lg text-xs font-bold text-right text-amber-800 focus:ring-1 focus:ring-amber-500 focus:outline-none"
                              />
                            </td>
                            <td className="py-2 px-2 text-center">
                              <button
                                onClick={() => removeReplacementRow(rep.id)}
                                className="text-slate-400 hover:text-rose-600 p-1 transition-colors"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                    <tfoot>
                      <tr className="bg-amber-50/60 font-bold border-t border-amber-200">
                        <td colSpan={3} className="py-2.5 px-3 text-right text-slate-700">
                          {isBn ? 'মোট রিপ্লেসমেন্ট সমন্বয় মূল্য (Replacement Deduction):' : 'Total Replacement Deduction:'}
                        </td>
                        <td className="py-2.5 px-3 text-right text-amber-700 text-sm font-mono-num font-bold">
                          {formatCurrency(totalReplacement, language)}
                        </td>
                        <td></td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>

              {/* RECONCILIATION SUMMARY & PAYMENT CARD */}
              <div className="bg-gradient-to-br from-slate-900 to-slate-800 text-white rounded-2xl p-5 shadow-xl border border-slate-700 space-y-4">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center border-b border-slate-700 pb-4">
                  <div className="p-2.5 rounded-xl bg-slate-800/80 border border-slate-700">
                    <p className="text-[11px] text-slate-400 mb-0.5">{isBn ? 'মোট বিক্রয়' : 'Total Sales'}</p>
                    <p className="text-base sm:lg font-bold text-emerald-400 font-mono-num">{formatCurrency(totalSales, language)}</p>
                  </div>
                  <div className="p-2.5 rounded-xl bg-slate-800/80 border border-slate-700">
                    <p className="text-[11px] text-slate-400 mb-0.5">{isBn ? '(-) রিপ্লেস ছাড়' : '(-) Replace Deduct'}</p>
                    <p className="text-base sm:lg font-bold text-amber-400 font-mono-num">-{formatCurrency(totalReplacement, language)}</p>
                  </div>
                  <div className="p-2.5 rounded-xl bg-emerald-950/40 border border-emerald-500/40">
                    <p className="text-[11px] text-emerald-300 mb-0.5">{isBn ? '(=) নিট দেয় টাকা' : '(=) Net Payable'}</p>
                    <p className="text-base sm:lg font-black text-white font-mono-num">{formatCurrency(netPayable, language)}</p>
                  </div>
                  <div className="p-2.5 rounded-xl bg-slate-800/80 border border-slate-700">
                    <p className="text-[11px] text-slate-400 mb-0.5">{isBn ? 'বাকি / বকেয়া' : 'Remaining Due'}</p>
                    <p className={`text-base sm:lg font-bold font-mono-num ${calculatedDue > 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
                      {formatCurrency(calculatedDue, language)}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-1 items-center">
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">
                      {isBn ? 'নগদ আদায় / জমা (টাকা)' : 'Paid Cash Amount (৳)'}
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="any"
                      value={paidAmount}
                      onChange={(e) => setPaidAmount(Number(e.target.value) || 0)}
                      className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded-xl text-sm font-bold text-emerald-400 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                    />
                    <div className="flex gap-1.5 mt-1.5">
                      <button
                        type="button"
                        onClick={() => setPaidAmount(netPayable)}
                        className="text-[10px] bg-slate-700 hover:bg-slate-600 text-slate-200 px-2 py-0.5 rounded"
                      >
                        {isBn ? 'সম্পূর্ণ নগদ (Full Paid)' : 'Full Paid'}
                      </button>
                      <button
                        type="button"
                        onClick={() => setPaidAmount(0)}
                        className="text-[10px] bg-slate-700 hover:bg-slate-600 text-slate-200 px-2 py-0.5 rounded"
                      >
                        {isBn ? 'সম্পূর্ণ বাকি (Full Due)' : 'Full Due'}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">
                      {isBn ? 'পেমেন্ট মাধ্যম' : 'Payment Method'}
                    </label>
                    <select
                      value={paymentMethod}
                      onChange={(e) => setPaymentMethod(e.target.value as any)}
                      className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded-xl text-xs text-slate-200 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                    >
                      <option value="Cash">{isBn ? 'ক্যাশ / নগদ ক্যাশ' : 'Cash Drawer'}</option>
                      <option value="Credit">{isBn ? 'বাকি / খাতা ক্রেডিট' : 'Due / Credit'}</option>
                      <option value="Bank">{isBn ? 'ব্যাংক ট্রান্সফার' : 'Bank Transfer'}</option>
                      <option value="Mobile">{isBn ? 'বিকাশ / নগদ' : 'Mobile Banking (bKash/Nagad)'}</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">
                      {isBn ? 'মন্তব্য / নোট (ঐচ্ছিক)' : 'Notes / Remarks'}
                    </label>
                    <input
                      type="text"
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder={isBn ? 'রুট ডেলিভারি নোট...' : 'Delivery route notes...'}
                      className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded-xl text-xs text-slate-200 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                    />
                  </div>
                </div>

                {/* User Request: মেমোতে কত টাকা গ্রহণ করল ও সফটওয়্যার মূল্যের সাথে লাভ/লস (+ / -) হিসাব */}
                {(() => {
                  const benchmarkTotal = replacementItems.length > 0 ? netPayable : totalSales;
                  const diff = paidAmount - benchmarkTotal;
                  return (
                    <div className={`p-3 rounded-xl border text-xs font-bold flex flex-col sm:flex-row sm:items-center justify-between gap-2 transition-all ${
                      diff < 0
                        ? 'bg-rose-950/60 border-rose-500/40 text-rose-300'
                        : diff > 0
                        ? 'bg-emerald-950/60 border-emerald-500/40 text-emerald-300'
                        : 'bg-slate-850 border-slate-700 text-slate-300'
                    }`}>
                      <div className="flex items-center gap-2">
                        {diff < 0 ? (
                          <TrendingDown className="w-4 h-4 text-rose-400 shrink-0" />
                        ) : diff > 0 ? (
                          <TrendingUp className="w-4 h-4 text-emerald-400 shrink-0" />
                        ) : (
                          <Check className="w-4 h-4 text-slate-400 shrink-0" />
                        )}
                        <div>
                          <p className="text-[11px] text-slate-400">
                            {isBn ? 'সফটওয়্যার বিক্রয় হিসাবের সাথে মেমোর টাকার তুলনা:' : 'Software Sales Total vs Memo Amount:'}
                          </p>
                          <p className="font-extrabold">
                            {diff < 0
                              ? (isBn ? 'মেমোতে কম আদায় হয়েছে (লস / নির্ধারিত দামের চেয়ে কম বিক্রয়)' : 'Sold below software rate (Loss)')
                              : diff > 0
                              ? (isBn ? 'মেমোতে বেশি আদায় হয়েছে (লাভ / নির্ধারিত দামের চেয়ে বেশি বিক্রয়)' : 'Sold above software rate (Profit)')
                              : (isBn ? 'সফটওয়্যার নির্ধারিত দামের পুরোপুরি সমান সমান' : 'Exact match with software rate')}
                          </p>
                        </div>
                      </div>
                      <div className="sm:text-right shrink-0">
                        <span className="text-sm sm:text-base font-black font-mono-num block">
                          {diff < 0
                            ? `- ৳${Math.abs(diff).toLocaleString()} (লস)`
                            : diff > 0
                            ? `+ ৳${diff.toLocaleString()} (লাভ)`
                            : '৳০ (সমান)'}
                        </span>
                      </div>
                    </div>
                  );
                })()}
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={resetState}
                  className="px-4 py-2.5 border border-slate-300 text-slate-700 rounded-xl text-xs font-medium hover:bg-slate-50 transition-colors"
                >
                  {isBn ? 'পুনরায় স্ক্যান করুন' : 'Scan Again'}
                </button>
                <button
                  type="button"
                  onClick={handleSaveToSystem}
                  className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-lg shadow-emerald-600/30 flex items-center gap-2 transition-transform active:scale-95"
                >
                  <Check className="w-4 h-4" />
                  {isBn ? 'হিসাব নিশ্চিত ও সিস্টেমে এন্ট্রি করুন' : 'Confirm & Save to ERP'}
                </button>
              </div>
            </div>
          )}

          {/* STEP 3: SUCCESS CONFIRMATION */}
          {scanStep === 'SUCCESS' && savedOrderInfo && (
            <div className="py-8 px-4 flex flex-col items-center text-center space-y-4">
              <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center shadow-inner">
                <CheckCircle2 className="w-10 h-10" />
              </div>
              <div>
                <h3 className="text-xl font-black text-slate-800">
                  {isBn ? 'মেমো ও রিপ্লেসমেন্ট এন্ট্রি সম্পন্ন!' : 'Memo & Replacement Successfully Recorded!'}
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  {isBn
                    ? 'বিক্রয় চালান তৈরি হয়েছে, পণ্যের স্টক সমন্বয় হয়েছে এবং রিপ্লেসমেন্ট লেজারে রেকর্ড করা হয়েছে।'
                    : 'Sales invoice created, warehouse inventory deducted, and replacement ledger credited.'}
                </p>
              </div>

              {/* Receipt Snapshot Card */}
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 w-full max-w-md text-left text-xs space-y-2">
                <div className="flex justify-between py-1 border-b border-slate-200 font-semibold">
                  <span className="text-slate-600">{isBn ? 'মেমো নম্বর:' : 'Memo No:'}</span>
                  <span className="text-slate-900">{savedOrderInfo.order?.invoiceNo || memoNumber}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-200">
                  <span className="text-slate-600">{isBn ? 'দোকানের নাম:' : 'Shop:'}</span>
                  <span className="font-semibold text-slate-800">{savedOrderInfo.customerName}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-200">
                  <span className="text-slate-600">{isBn ? 'মোট বিক্রয়:' : 'Total Sales:'}</span>
                  <span className="font-bold text-emerald-700">৳{savedOrderInfo.totalSales.toLocaleString()}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-200">
                  <span className="text-slate-600">{isBn ? 'রিপ্লেস ছাড়:' : 'Replacement Deduct:'}</span>
                  <span className="font-bold text-amber-700">-৳{savedOrderInfo.totalReplacement.toLocaleString()}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-200 font-bold text-slate-900">
                  <span>{isBn ? 'নিট বিল:' : 'Net Bill:'}</span>
                  <span>৳{savedOrderInfo.netPayable.toLocaleString()}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-200">
                  <span className="text-slate-600">{isBn ? 'নগদ পরিশোধ:' : 'Paid:'}</span>
                  <span className="font-semibold text-emerald-600">৳{savedOrderInfo.paidAmount.toLocaleString()}</span>
                </div>
                <div className="flex justify-between py-1 font-bold">
                  <span className="text-slate-700">{isBn ? 'বকেয়া:' : 'Due Balance:'}</span>
                  <span className={savedOrderInfo.dueAmount > 0 ? 'text-rose-600' : 'text-slate-600'}>
                    ৳{savedOrderInfo.dueAmount.toLocaleString()}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-3 pt-2">
                <button
                  onClick={resetState}
                  className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-md transition-colors"
                >
                  {isBn ? 'আরেকটি মেমো স্ক্যান করুন' : 'Scan Another Memo'}
                </button>
                <button
                  onClick={onClose}
                  className="px-5 py-2.5 border border-slate-300 text-slate-700 rounded-xl text-xs font-medium hover:bg-slate-100 transition-colors"
                >
                  {isBn ? 'বন্ধ করুন' : 'Close'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
