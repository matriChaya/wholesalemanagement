import React, { useState, useRef } from 'react';
import { useWholesale } from '../context/WholesaleContext';
import { ReplacementClaim, ReplacementParty, CompanyReturnChallan, Product } from '../types';
import { translations, formatCurrency, getTodayDateString, getYesterdayDateString, round2 } from '../utils/translations';
import { PhotoProductEntryModal } from './PhotoProductEntryModal';
import { CompanyReplacementMemoModal } from './CompanyReplacementMemoModal';
import { compressImage } from '../utils/imageCompression';
import {
  RotateCcw,
  Store,
  Building2,
  AlertTriangle,
  CheckCircle2,
  Clock,
  XCircle,
  Plus,
  ArrowRight,
  Sparkles,
  Camera,
  Check,
  X,
  CreditCard,
  PackageCheck,
  Trash2,
  Calendar,
  Send,
  FileText,
  ChevronDown,
  ChevronUp,
  Boxes,
  CheckSquare,
  Square,
  Upload,
  Image as ImageIcon,
  Maximize2,
  Eye,
} from 'lucide-react';

interface ReplacementAdjustmentViewProps {
  onOpenScannerModal?: () => void;
}

export const ReplacementAdjustmentView: React.FC<ReplacementAdjustmentViewProps> = ({ onOpenScannerModal }) => {
  const {
    language,
    currentRole,
    currentUser,
    products,
    retailers,
    suppliers,
    replacements,
    addReplacementClaim,
    resolveReplacementClaim,
    deleteReplacementClaim,
    companyReturns = [],
    dispatchReturnsToCompany,
    addDirectCompanyReturn,
    deleteCompanyReturn,
    openMemoKhataScanner,
    recordCompanyCreditSettlement,
    addProduct,
    addSupplierPurchase,
    addSupplier,
    showNotification,
  } = useWholesale();

  const t = translations[language];

  // Top tabs: Market Returns (মার্কেট থেকে ফেরত) vs Company Returns (কোম্পানিতে পাঠানো ফেরত)
  const [mainTab, setMainTab] = useState<'MARKET' | 'COMPANY'>('MARKET');

  // Market Returns filtering & selection state
  const [dateFilter, setDateFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [selectedClaimIds, setSelectedClaimIds] = useState<string[]>([]);

  // Modals state
  const [isMarketClaimModalOpen, setIsMarketClaimModalOpen] = useState<boolean>(false);
  const [isPhotoInboxOpen, setIsPhotoInboxOpen] = useState<boolean>(false);
  const [isCompanyMemoModalOpen, setIsCompanyMemoModalOpen] = useState<boolean>(false);
  const [viewingPhoto, setViewingPhoto] = useState<string | null>(null);
  const [isCompanyDispatchModalOpen, setIsCompanyDispatchModalOpen] = useState<boolean>(false);
  const [expandedChallanId, setExpandedChallanId] = useState<string | null>(null);
  const [deletingClaim, setDeletingClaim] = useState<ReplacementClaim | null>(null);
  const [deletingChallan, setDeletingChallan] = useState<CompanyReturnChallan | null>(null);
  const [successNotice, setSuccessNotice] = useState<string | null>(null);

  // New Market Claim Form State
  const [selectedRetailerId, setSelectedRetailerId] = useState<string>(retailers[0]?.id || '');
  const [selectedProductId, setSelectedProductId] = useState<string>(products[0]?.id || '');
  const [isUnlistedProduct, setIsUnlistedProduct] = useState<boolean>(false);
  const [unlistedForm, setUnlistedForm] = useState({
    name: '',
    supplierId: suppliers[0]?.id || '',
    customSupplierName: '',
    category: 'General',
    unit: 'pcs',
    invoiceNo: '',
    purchaseDate: getTodayDateString(),
    purchasedQuantity: 10,
    costPrice: 0,
    wholesalePrice: 0,
  });
  const [quantity, setQuantity] = useState<number>(1);
  const [reason, setReason] = useState<string>('Expired Product (মেয়াদোত্তীর্ণ)');
  const [notes, setNotes] = useState<string>('');
  const [claimDate, setClaimDate] = useState<string>(getTodayDateString());
  const [claimPhoto, setClaimPhoto] = useState<string>('');
  const [isClaimCameraOpen, setIsClaimCameraOpen] = useState<boolean>(false);
  const [isClaimCompressing, setIsClaimCompressing] = useState<boolean>(false);
  const claimVideoRef = useRef<HTMLVideoElement | null>(null);
  const claimStreamRef = useRef<MediaStream | null>(null);
  const claimFileInputRef = useRef<HTMLInputElement | null>(null);

  const handleStartClaimCamera = async () => {
    try {
      if (claimStreamRef.current) {
        claimStreamRef.current.getTracks().forEach((t) => t.stop());
      }
      setIsClaimCameraOpen(true);
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } },
      });
      claimStreamRef.current = stream;
      if (claimVideoRef.current) {
        claimVideoRef.current.srcObject = stream;
        claimVideoRef.current.play();
      }
    } catch (err) {
      console.warn('Claim camera error:', err);
      setIsClaimCameraOpen(false);
      claimFileInputRef.current?.click();
    }
  };

  const handleStopClaimCamera = () => {
    if (claimStreamRef.current) {
      claimStreamRef.current.getTracks().forEach((t) => t.stop());
      claimStreamRef.current = null;
    }
    if (claimVideoRef.current) {
      claimVideoRef.current.srcObject = null;
    }
    setIsClaimCameraOpen(false);
  };

  const handleClaimSnapPhoto = async () => {
    if (!claimVideoRef.current) return;
    try {
      setIsClaimCompressing(true);
      const video = claimVideoRef.current;
      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth || 640;
      canvas.height = video.videoHeight || 480;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
        const compressed = await compressImage(dataUrl, 640, 640, 0.75);
        setClaimPhoto(compressed);
      }
    } catch (err) {
      console.error('Snapshot error:', err);
    } finally {
      setIsClaimCompressing(false);
      handleStopClaimCamera();
    }
  };

  const handleClaimFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setIsClaimCompressing(true);
      const compressed = await compressImage(file, 640, 640, 0.75);
      setClaimPhoto(compressed);
    } catch (err) {
      console.error('Upload compress error:', err);
    } finally {
      setIsClaimCompressing(false);
      if (e.target) e.target.value = '';
    }
  };

  // Company Dispatch Form State
  const [dispatchSupplierId, setDispatchSupplierId] = useState<string>(suppliers[0]?.id || '');
  const [dispatchChallanNo, setDispatchChallanNo] = useState<string>(`RET-COMP-${Date.now().toString().slice(-6)}`);
  const [dispatchDate, setDispatchDate] = useState<string>(getTodayDateString());
  const [dispatchNotes, setDispatchNotes] = useState<string>('');
  const [adjustLedger, setAdjustLedger] = useState<boolean>(true);
  // Manual direct items in case creating return without prior claims
  const [directItems, setDirectItems] = useState<Array<{
    productId: string;
    productName: string;
    quantity: number;
    unit: string;
    value: number;
    reason: string;
  }>>([]);

  const selectedProduct = products.find((p) => p.id === selectedProductId) || products[0];

  // Filtered Market Returns
  const filteredMarketReturns = replacements.filter((r) => {
    // Only retailer/market claims
    const isMarket = r.partyType === 'RETAILER' || r.entityType === 'RETAILER' || !r.partyType;
    if (!isMarket) return false;

    // Date filter
    let matchesDate = true;
    const dateStr = (r.date || '').toLowerCase();
    if (dateFilter === 'TODAY') {
      matchesDate = dateStr.includes(getTodayDateString());
    } else if (dateFilter === 'YESTERDAY') {
      matchesDate = dateStr.includes(getYesterdayDateString());
    } else if (dateFilter !== 'ALL' && dateFilter !== '') {
      matchesDate = dateStr.includes(dateFilter);
    }

    // Status filter
    let matchesStatus = true;
    if (statusFilter === 'PENDING') {
      matchesStatus = r.status === 'PENDING';
    } else if (statusFilter === 'RESOLVED') {
      matchesStatus = r.status === 'REPLACED' || r.status === 'REPLACED_WITH_GOODS' || r.status === 'CREDITED_TO_LEDGER' || r.status === 'ADJUSTED';
    } else if (statusFilter === 'SENT_TO_COMPANY') {
      matchesStatus = r.status === 'SENT_TO_COMPANY';
    }

    return matchesDate && matchesStatus;
  });

  // Calculate Market Return summary
  const pendingMarketCount = replacements.filter(
    (r) => (r.partyType === 'RETAILER' || !r.partyType) && r.status === 'PENDING'
  ).length;

  const totalMarketReturnValue = replacements
    .filter((r) => r.partyType === 'RETAILER' || !r.partyType)
    .reduce((acc, r) => acc + (r.estimatedValue || r.totalAdjustmentValue || 0), 0);

  // Calculate Company Return summary
  const totalCompanyReturnsCount = companyReturns.length;
  const totalCompanyReturnedQuantity = companyReturns.reduce((acc, c) => acc + (c.totalQuantity || 0), 0);
  const totalCompanyReturnedValue = companyReturns.reduce((acc, c) => acc + (c.totalValue || 0), 0);

  // Selection handlers
  const handleToggleSelectClaim = (id: string) => {
    setSelectedClaimIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleSelectAllPending = () => {
    const pendingIds = filteredMarketReturns
      .filter((r) => r.status !== 'SENT_TO_COMPANY')
      .map((r) => r.id);
    if (selectedClaimIds.length === pendingIds.length && pendingIds.length > 0) {
      setSelectedClaimIds([]);
    } else {
      setSelectedClaimIds(pendingIds);
    }
  };

  // Open Dispatch Modal with selected claims
  const handleOpenDispatchWithSelected = () => {
    if (selectedClaimIds.length === 0) return;
    setDispatchChallanNo(`RET-COMP-${Date.now().toString().slice(-6)}`);
    setDispatchDate(getTodayDateString());
    setDispatchNotes('');
    setDirectItems([]);
    setIsCompanyDispatchModalOpen(true);
  };

  // Open Direct Dispatch Modal
  const handleOpenDirectDispatch = () => {
    setSelectedClaimIds([]);
    setDispatchChallanNo(`RET-COMP-${Date.now().toString().slice(-6)}`);
    setDispatchDate(getTodayDateString());
    setDispatchNotes('');
    if (products.length > 0) {
      setDirectItems([
        {
          productId: products[0].id,
          productName: products[0].name,
          quantity: 1,
          unit: products[0].unit,
          value: products[0].costPrice || 0,
          reason: 'Expired Product (মেয়াদোত্তীর্ণ)',
        },
      ]);
    }
    setIsCompanyDispatchModalOpen(true);
  };

  // Submit Market Claim
  const handleSubmitMarketClaim = (e: React.FormEvent) => {
    e.preventDefault();

    // Handling unlisted product with automatic purchase and stock integration
    if (isUnlistedProduct) {
      if (!unlistedForm.name.trim()) {
        showNotification(language === 'bn' ? 'পণ্যের নাম লিখুন' : 'Please enter product name');
        return;
      }
      if (!unlistedForm.invoiceNo.trim()) {
        showNotification(language === 'bn' ? 'কোম্পানি ক্রয়ের চালান / ইনভয়েস নম্বর লিখুন' : 'Please enter purchase invoice number');
        return;
      }
      if (unlistedForm.purchasedQuantity <= 0 || unlistedForm.costPrice <= 0) {
        showNotification(language === 'bn' ? 'সঠিক ক্রয় পরিমাণ ও ক্রয় দর দিন' : 'Please enter valid purchased quantity and cost price');
        return;
      }
      if (quantity <= 0) {
        showNotification(language === 'bn' ? 'ফেরতের পরিমাণ লিখুন' : 'Please enter return quantity');
        return;
      }

      // 1. Determine or create supplier
      let targetSupplierId = unlistedForm.supplierId;
      let targetSupplierName = '';
      if (targetSupplierId === '__NEW__' || !targetSupplierId) {
        const supName = unlistedForm.customSupplierName.trim() || 'Company Supplier';
        const newSupId = `sup_${Date.now()}`;
        addSupplier({
          id: newSupId,
          name: supName,
          company: supName,
          phone: '',
          address: '',
          totalPurchases: 0,
          outstandingPayable: 0,
          balance: 0,
        });
        targetSupplierId = newSupId;
        targetSupplierName = supName;
      } else {
        const found = suppliers.find((s) => s.id === targetSupplierId);
        targetSupplierName = found ? (found.company || found.name) : 'Company Supplier';
      }

      const wholesalePrice = unlistedForm.wholesalePrice > 0 ? unlistedForm.wholesalePrice : unlistedForm.costPrice;
      const netStock = Math.max(0, unlistedForm.purchasedQuantity - quantity);
      const newProdId = `prod_${Date.now()}`;

      // 2. Add to Products Catalog (Stock)
      const newProduct: Product = {
        id: newProdId,
        name: unlistedForm.name.trim(),
        bnName: unlistedForm.name.trim(),
        brand: targetSupplierName,
        category: unlistedForm.category || 'General',
        bnCategory: unlistedForm.category || 'সাধারণ',
        sku: `SKU-${Date.now().toString().slice(-6)}`,
        unit: unlistedForm.unit || 'pcs',
        bnUnit: unlistedForm.unit || 'পিস',
        costPrice: unlistedForm.costPrice,
        wholesalePrice: wholesalePrice,
        mrp: wholesalePrice * 1.15,
        supplierId: targetSupplierId,
        supplierName: targetSupplierName,
        minOrderQty: 1,
        stockQuantity: netStock,
        lowStockThreshold: 10,
        minStockLevel: 10,
        image: claimPhoto || '',
      };
      addProduct(newProduct);

      // 3. Add to Supplier Purchase Ledger (ক্রয় টাকা যোগ হবে)
      const totalPurchase = unlistedForm.purchasedQuantity * unlistedForm.costPrice;
      addSupplierPurchase({
        supplierId: targetSupplierId,
        amount: totalPurchase,
        date: unlistedForm.purchaseDate,
        referenceNo: unlistedForm.invoiceNo.trim(),
        notes: `ক্রয় চালান #${unlistedForm.invoiceNo} (পণ্য: ${unlistedForm.name}, ${unlistedForm.purchasedQuantity} ${unlistedForm.unit} @ ৳${unlistedForm.costPrice})`,
      });

      // 4. Add Replacement Claim (বিক্রয় টাকা / রিপ্লেসমেন্ট ভ্যালু রিটেইলার লেজারে যোগ হবে)
      const r = retailers.find((item) => item.id === selectedRetailerId);
      const partyName = r ? `${r.shopName} (${r.ownerName})` : 'Retailer';
      const totalReplacement = quantity * wholesalePrice;

      addReplacementClaim({
        partyType: 'RETAILER',
        partyId: selectedRetailerId || `id_${Date.now()}`,
        partyName,
        productId: newProdId,
        productName: unlistedForm.name.trim(),
        quantity,
        unit: unlistedForm.unit || 'pcs',
        reason,
        estimatedValue: totalReplacement,
        photoUrl: claimPhoto || undefined,
        notes: `[কোম্পানি ইনভয়েস #${unlistedForm.invoiceNo} থেকে ক্রয়] ${notes}`,
        date: claimDate,
      });

      setClaimPhoto('');
      setIsUnlistedProduct(false);
      setSuccessNotice(
        language === 'bn'
          ? `সফল! "${unlistedForm.name}" স্টকে যুক্ত হয়েছে (অবশিষ্ট স্টক: ${netStock} ${unlistedForm.unit}), কোম্পানিতে ৳${totalPurchase.toLocaleString()} ক্রয় এবং ৳${totalReplacement.toLocaleString()} বিক্রয় মূল্যে রিপ্লেস জমা হয়েছে!`
          : `Success! "${unlistedForm.name}" added to stock (Stock: ${netStock}), purchase ৳${totalPurchase} & replacement ৳${totalReplacement} recorded!`
      );
      setTimeout(() => setSuccessNotice(null), 5000);
      setIsMarketClaimModalOpen(false);
      return;
    }

    if (!selectedProduct || quantity <= 0) return;

    const r = retailers.find((item) => item.id === selectedRetailerId);
    const partyName = r ? `${r.shopName} (${r.ownerName})` : 'Retailer';
    const estimatedVal = quantity * selectedProduct.wholesalePrice;
    const realPhoto = claimPhoto || selectedProduct.image || undefined;

    addReplacementClaim({
      partyType: 'RETAILER',
      partyId: selectedRetailerId || `id_${Date.now()}`,
      partyName,
      productId: selectedProduct.id,
      productName: selectedProduct.name,
      quantity,
      unit: selectedProduct.unit,
      reason,
      estimatedValue: estimatedVal,
      photoUrl: realPhoto,
      notes,
      date: claimDate,
    });

    setClaimPhoto('');

    setSuccessNotice(
      language === 'bn'
        ? 'মার্কেট থেকে ফেরত পণ্যের এন্ট্রি সফলভাবে যুক্ত করা হয়েছে!'
        : 'Market return claim recorded successfully!'
    );
    setTimeout(() => setSuccessNotice(null), 4000);
    setIsMarketClaimModalOpen(false);
  };

  // Submit Company Dispatch Challan
  const handleConfirmCompanyDispatch = () => {
    if (!dispatchSupplierId) return;

    if (selectedClaimIds.length > 0) {
      // Dispatched from market claims
      const res = dispatchReturnsToCompany({
        supplierId: dispatchSupplierId,
        claimIds: selectedClaimIds,
        companyChallanNo: dispatchChallanNo,
        dispatchDate,
        notes: dispatchNotes,
        adjustSupplierLedger: adjustLedger,
      });

      if (res.success) {
        setSuccessNotice(
          language === 'bn'
            ? `সফলভাবে কোম্পানিতে ${res.count}টি পণ্য রিটার্ন চালান (${dispatchChallanNo}) তৈরি করা হয়েছে!`
            : `Successfully created company return challan (${dispatchChallanNo}) with ${res.count} items!`
        );
        setSelectedClaimIds([]);
        setIsCompanyDispatchModalOpen(false);
        setMainTab('COMPANY');
      } else {
        alert(res.message);
      }
    } else if (directItems.length > 0) {
      // Direct items dispatch
      const res = addDirectCompanyReturn({
        supplierId: dispatchSupplierId,
        challanNo: dispatchChallanNo,
        dispatchDate,
        items: directItems,
        notes: dispatchNotes,
        adjustSupplierLedger: adjustLedger,
      });

      if (res.success) {
        setSuccessNotice(
          language === 'bn'
            ? `সফলভাবে কোম্পানিতে সরাসরি রিটার্ন চালান (${dispatchChallanNo}) পাঠানো হয়েছে!`
            : `Successfully dispatched direct company return challan (${dispatchChallanNo})!`
        );
        setIsCompanyDispatchModalOpen(false);
        setMainTab('COMPANY');
      } else {
        alert(res.message);
      }
    }
    setTimeout(() => setSuccessNotice(null), 4000);
  };

  return (
    <div className="space-y-4 animate-in fade-in duration-200">
      {/* Success Notification Banner */}
      {successNotice && (
        <div className="p-3.5 rounded-xl bg-emerald-950/90 border-2 border-emerald-500 text-emerald-200 text-xs font-bold flex items-center justify-between shadow-xl animate-in slide-in-from-top-2">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{successNotice}</span>
          </div>
          <button
            type="button"
            onClick={() => setSuccessNotice(null)}
            className="text-emerald-400 hover:text-white p-1"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Top Hero Banner */}
      <div className="p-4 rounded-2xl bg-gradient-to-r from-slate-900 via-slate-900 to-amber-950/40 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-lg">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0">
            <RotateCcw className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
              <span>{language === 'bn' ? 'প্রোডাক্ট রিটার্ন ও রিপ্লেসমেন্ট ম্যানেজমেন্ট' : 'Product Returns & Replacement Management'}</span>
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                {replacements.length} Market • {companyReturns.length} Company
              </span>
            </h2>
            <p className="text-xs text-slate-400">
              {language === 'bn'
                ? 'মার্কেট থেকে আসা ফেরত পণ্য গ্রহণ এবং মাস শেষে কোম্পানিতে চালান পাঠানোর পৃথক স্বয়ংক্রিয় হিসাব।'
                : 'Separate tracking for market returns from retailers and monthly dispatched returns to suppliers.'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Quick Photo Replacement Inbox Trigger */}
          <button
            type="button"
            onClick={() => setIsPhotoInboxOpen(true)}
            className="py-2.5 px-3.5 bg-gradient-to-r from-amber-700 to-orange-700 hover:from-amber-600 hover:to-orange-600 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 border border-amber-500/40 shadow-lg shadow-amber-950/40 transition active:scale-95 cursor-pointer"
            title="ছবি তুলে বা ছবি দিয়ে একাধিকবার আলাদা আলাদা রিপ্লেসমেন্ট এন্ট্রি নিন"
          >
            <Camera className="w-4 h-4 text-amber-300" />
            <span>{language === 'bn' ? 'ছবি দিয়ে রিপ্লেস' : 'Photo Replace Inbox'}</span>
          </button>

          <button
            type="button"
            onClick={() => openMemoKhataScanner('REPLACE')}
            className="py-2.5 px-3.5 bg-gradient-to-r from-teal-800 to-emerald-800 hover:from-teal-700 hover:to-emerald-700 text-teal-100 font-bold text-xs rounded-xl flex items-center gap-1.5 border border-teal-500/40 shadow-lg shadow-teal-950/40 transition active:scale-95 cursor-pointer"
            title="Scan Cash Counter or DSR memo / khata for sales and replacement"
          >
            <Sparkles className="w-4 h-4 text-emerald-300" />
            <span>{language === 'bn' ? 'মেমো ও খাতা স্ক্যান' : 'Scan Memo/Khata'}</span>
          </button>

          {onOpenScannerModal && (
            <button
              type="button"
              onClick={onOpenScannerModal}
              className="py-2.5 px-3.5 bg-slate-800 hover:bg-slate-700 text-sky-300 font-bold text-xs rounded-xl flex items-center gap-1.5 border border-slate-700 transition cursor-pointer"
              title="Scan memo or document"
            >
              <Camera className="w-4 h-4 text-sky-400" />
              <span>{language === 'bn' ? 'চালান স্ক্যান' : 'Invoice Scan'}</span>
            </button>
          )}

          {/* Company Replacement Scan, Photo & Khata Memo Button */}
          <button
            id="btn-open-company-replacement-memo-modal"
            type="button"
            onClick={() => setIsCompanyMemoModalOpen(true)}
            className="py-2.5 px-3.5 bg-gradient-to-r from-emerald-600 via-teal-600 to-indigo-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 shadow-lg shadow-emerald-950/40 border border-emerald-400/40 transition active:scale-95 cursor-pointer"
            title="কোম্পানিতে রিপ্লেস পণ্য ইনভয়েস স্ক্যান, ছবি তুলে বা খাতা/মেমোতে লিখে এন্ট্রি নিন (স্টক ও কোম্পানির ডিউ থেকে মাইনাস হবে)"
          >
            <Building2 className="w-4 h-4 text-emerald-200" />
            <span>{language === 'bn' ? 'কোম্পানি রিপ্লেস চালান (স্ক্যান ও মেমো)' : 'Company Replace Challan (Scan & Memo)'}</span>
          </button>

          {mainTab === 'MARKET' ? (
            <button
              type="button"
              onClick={() => {
                setSelectedProductId(products[0]?.id || '');
                setSelectedRetailerId(retailers[0]?.id || '');
                setQuantity(1);
                setClaimDate(getTodayDateString());
                setNotes('');
                setIsMarketClaimModalOpen(true);
              }}
              className="py-2.5 px-4 bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 shadow-lg shadow-amber-950/40 transition active:scale-95 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>{language === 'bn' ? 'মার্কেট থেকে ফেরত যোগ' : 'New Market Return'}</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={handleOpenDirectDispatch}
              className="py-2.5 px-4 bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 shadow-lg shadow-purple-950/40 transition active:scale-95 cursor-pointer"
            >
              <Send className="w-4 h-4" />
              <span>{language === 'bn' ? 'কোম্পানিতে নতুন চালান পাঠান' : 'New Company Challan'}</span>
            </button>
          )}
        </div>
      </div>

      {/* Main Mode Tabs: Market Returns vs Company Returns */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        <button
          type="button"
          onClick={() => setMainTab('MARKET')}
          className={`p-3 rounded-xl border text-left transition flex items-center justify-between cursor-pointer ${
            mainTab === 'MARKET'
              ? 'bg-slate-900 border-amber-500 shadow-md ring-1 ring-amber-500/50'
              : 'bg-slate-950/60 border-slate-800 hover:bg-slate-900 text-slate-400'
          }`}
        >
          <div className="flex items-center gap-3">
            <div
              className={`w-9 h-9 rounded-lg flex items-center justify-center ${
                mainTab === 'MARKET' ? 'bg-amber-500/20 text-amber-400' : 'bg-slate-800 text-slate-400'
              }`}
            >
              <Store className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className={`text-xs sm:text-sm font-bold ${mainTab === 'MARKET' ? 'text-white' : 'text-slate-300'}`}>
                  {language === 'bn' ? '১. মার্কেট থেকে ফেরত পণ্য' : '1. Market Returns (From Retailers)'}
                </span>
                {pendingMarketCount > 0 && (
                  <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-amber-500 text-black font-bold">
                    {pendingMarketCount} {language === 'bn' ? 'অপেক্ষমান' : 'Pending'}
                  </span>
                )}
              </div>
              <p className="text-[11px] text-slate-400 mt-0.5">
                {language === 'bn' ? 'দোকানদার থেকে আসা নষ্ট/মেয়াদোত্তীর্ণ মাল' : 'Damage/expired items received from shops'}
              </p>
            </div>
          </div>
          <div className="text-right hidden sm:block">
            <span className="text-[10px] text-slate-400 block">{language === 'bn' ? 'মোট মূল্য' : 'Total'}</span>
            <span className="text-xs font-mono font-bold text-amber-400">
              {formatCurrency(totalMarketReturnValue, language)}
            </span>
          </div>
        </button>

        <button
          type="button"
          onClick={() => setMainTab('COMPANY')}
          className={`p-3 rounded-xl border text-left transition flex items-center justify-between cursor-pointer ${
            mainTab === 'COMPANY'
              ? 'bg-slate-900 border-purple-500 shadow-md ring-1 ring-purple-500/50'
              : 'bg-slate-950/60 border-slate-800 hover:bg-slate-900 text-slate-400'
          }`}
        >
          <div className="flex items-center gap-3">
            <div
              className={`w-9 h-9 rounded-lg flex items-center justify-center ${
                mainTab === 'COMPANY' ? 'bg-purple-500/20 text-purple-400' : 'bg-slate-800 text-slate-400'
              }`}
            >
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className={`text-xs sm:text-sm font-bold ${mainTab === 'COMPANY' ? 'text-white' : 'text-slate-300'}`}>
                  {language === 'bn' ? '২. কোম্পানিতে পাঠানো ফেরত পণ্যের হিসাব' : '2. Company Dispatched Returns'}
                </span>
                <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30 font-bold">
                  {totalCompanyReturnsCount} {language === 'bn' ? 'চালান' : 'Challans'}
                </span>
              </div>
              <p className="text-[11px] text-slate-400 mt-0.5">
                {language === 'bn' ? 'মাস শেষে কোম্পানির কাছে পাঠানো চালান' : 'Challans sent to suppliers for ledger credit'}
              </p>
            </div>
          </div>
          <div className="text-right hidden sm:block">
            <span className="text-[10px] text-slate-400 block">{language === 'bn' ? 'মোট ফেরত মূল্য' : 'Total'}</span>
            <span className="text-xs font-mono font-bold text-purple-400">
              {formatCurrency(totalCompanyReturnedValue, language)}
            </span>
          </div>
        </button>
      </div>

      {/* VIEW 1: MARKET RETURNS */}
      {mainTab === 'MARKET' && (
        <div className="space-y-3">
          {/* Subheader Filters & Selection Action Bar */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-2.5 p-3 rounded-xl bg-slate-900/80 border border-slate-800">
            <div className="flex items-center gap-2 flex-wrap">
              {/* Select All Checkbox Button */}
              <button
                type="button"
                onClick={handleSelectAllPending}
                className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-300 flex items-center gap-1.5 border border-slate-700 transition cursor-pointer"
              >
                {selectedClaimIds.length > 0 ? (
                  <CheckSquare className="w-3.5 h-3.5 text-amber-400" />
                ) : (
                  <Square className="w-3.5 h-3.5 text-slate-400" />
                )}
                <span>
                  {selectedClaimIds.length > 0
                    ? language === 'bn'
                      ? `সব বাতিল (${selectedClaimIds.length})`
                      : `Deselect (${selectedClaimIds.length})`
                    : language === 'bn'
                    ? 'সব নির্বাচন'
                    : 'Select All'}
                </span>
              </button>

              {/* Status Filter */}
              <div className="flex items-center bg-slate-950 p-0.5 rounded-lg border border-slate-800 text-[11px]">
                <button
                  type="button"
                  onClick={() => setStatusFilter('ALL')}
                  className={`px-2 py-1 rounded font-bold transition ${
                    statusFilter === 'ALL' ? 'bg-amber-600 text-white' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {language === 'bn' ? 'সব' : 'All'}
                </button>
                <button
                  type="button"
                  onClick={() => setStatusFilter('PENDING')}
                  className={`px-2 py-1 rounded font-bold transition ${
                    statusFilter === 'PENDING' ? 'bg-amber-600 text-white' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {language === 'bn' ? 'অপেক্ষমান' : 'Pending'}
                </button>
                <button
                  type="button"
                  onClick={() => setStatusFilter('RESOLVED')}
                  className={`px-2 py-1 rounded font-bold transition ${
                    statusFilter === 'RESOLVED' ? 'bg-amber-600 text-white' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {language === 'bn' ? 'নিষ্পত্তিকৃত' : 'Resolved'}
                </button>
                <button
                  type="button"
                  onClick={() => setStatusFilter('SENT_TO_COMPANY')}
                  className={`px-2 py-1 rounded font-bold transition ${
                    statusFilter === 'SENT_TO_COMPANY' ? 'bg-purple-600 text-white' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {language === 'bn' ? 'কোম্পানিতে প্রেরিত' : 'Sent to Co.'}
                </button>
              </div>
            </div>

            {/* Date Filters */}
            <div className="flex items-center gap-1.5 flex-wrap">
              <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800 text-[11px]">
                <button
                  type="button"
                  onClick={() => setDateFilter('ALL')}
                  className={`px-2 py-0.5 rounded font-bold transition ${
                    dateFilter === 'ALL' ? 'bg-amber-600 text-white' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {language === 'bn' ? 'সব তারিখ' : 'All'}
                </button>
                <button
                  type="button"
                  onClick={() => setDateFilter('TODAY')}
                  className={`px-2 py-0.5 rounded font-bold transition ${
                    dateFilter === 'TODAY' ? 'bg-amber-600 text-white' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {language === 'bn' ? 'আজ' : 'Today'}
                </button>
                <button
                  type="button"
                  onClick={() => setDateFilter('YESTERDAY')}
                  className={`px-2 py-0.5 rounded font-bold transition ${
                    dateFilter === 'YESTERDAY' ? 'bg-amber-600 text-white' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {language === 'bn' ? 'গতকাল' : 'Yesterday'}
                </button>
              </div>
              <input
                type="date"
                value={dateFilter !== 'ALL' && dateFilter !== 'TODAY' && dateFilter !== 'YESTERDAY' ? dateFilter : ''}
                onChange={(e) => setDateFilter(e.target.value || 'ALL')}
                className="bg-slate-900 border border-slate-700 rounded px-2 py-1 text-[11px] text-white font-mono focus:outline-none focus:border-amber-500"
                title="Filter by custom date"
              />
            </div>
          </div>

          {/* Floating / Sticky Dispatch Action Bar when items are selected */}
          {selectedClaimIds.length > 0 && (
            <div className="p-3 rounded-xl bg-purple-950/90 border-2 border-purple-500 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xl animate-in slide-in-from-top-2">
              <div className="flex items-center gap-2.5">
                <Boxes className="w-5 h-5 text-purple-300 shrink-0" />
                <div>
                  <h4 className="text-xs sm:text-sm font-bold text-white flex items-center gap-1.5">
                    <span>
                      {language === 'bn'
                        ? `${selectedClaimIds.length} টি ফেরত পণ্য নির্বাচিত হয়েছে`
                        : `${selectedClaimIds.length} return items selected`}
                    </span>
                  </h4>
                  <p className="text-[11px] text-purple-200">
                    {language === 'bn'
                      ? 'এগুলো একত্রিত করে মাস শেষে কোম্পানির কাছে ফেরত চালান তৈরি করুন।'
                      : 'Dispatch these selected damage items to supplier in a single return challan.'}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedClaimIds([])}
                  className="px-3 py-1.5 bg-purple-900/60 hover:bg-purple-900 text-purple-200 text-xs font-semibold rounded-lg border border-purple-700 transition"
                >
                  {language === 'bn' ? 'বাতিল' : 'Cancel'}
                </button>
                <button
                  type="button"
                  onClick={handleOpenDispatchWithSelected}
                  className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold rounded-lg flex items-center gap-1.5 shadow-lg shadow-purple-950/40 transition active:scale-95 cursor-pointer"
                >
                  <Send className="w-4 h-4" />
                  <span>{language === 'bn' ? 'কোম্পানিতে ফেরত চালান তৈরি করুন' : 'Dispatch to Company'}</span>
                </button>
              </div>
            </div>
          )}

          {/* Market Claims List */}
          <div className="space-y-2.5">
            {filteredMarketReturns.length === 0 ? (
              <div className="p-8 text-center bg-slate-900/60 rounded-2xl border border-slate-800 text-xs text-slate-400">
                <PackageCheck className="w-8 h-8 text-slate-600 mx-auto mb-2" />
                <p>
                  {language === 'bn'
                    ? 'এই ফিল্টারে মার্কেট থেকে কোনো ফেরত পণ্য পাওয়া যায়নি।'
                    : 'No market return records found matching this filter.'}
                </p>
                <button
                  type="button"
                  onClick={() => setIsMarketClaimModalOpen(true)}
                  className="mt-3 px-3 py-1.5 bg-amber-600 hover:bg-amber-500 text-white rounded-lg text-xs font-bold inline-flex items-center gap-1"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>{language === 'bn' ? 'নতুন ফেরত পণ্য যোগ করুন' : 'Add Return Item'}</span>
                </button>
              </div>
            ) : (
              filteredMarketReturns.map((claim) => {
                const isSelected = selectedClaimIds.includes(claim.id);
                const isPending = claim.status === 'PENDING';
                const isSentToCompany = claim.status === 'SENT_TO_COMPANY';
                const isReplaced = claim.status === 'REPLACED' || claim.status === 'REPLACED_WITH_GOODS';
                const isCredited = claim.status === 'ADJUSTED' || claim.status === 'CREDITED_TO_LEDGER';

                return (
                  <div
                    key={claim.id}
                    className={`p-3.5 rounded-xl border transition shadow-sm ${
                      isSelected
                        ? 'bg-purple-950/40 border-purple-500/80 ring-1 ring-purple-500/50'
                        : isSentToCompany
                        ? 'bg-slate-900/50 border-slate-800/80 opacity-90'
                        : 'bg-slate-900 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="flex items-start gap-3">
                        {/* Checkbox for batch action */}
                        {!isSentToCompany && (
                          <button
                            type="button"
                            onClick={() => handleToggleSelectClaim(claim.id)}
                            className="mt-1 text-slate-400 hover:text-white cursor-pointer"
                          >
                            {isSelected ? (
                              <CheckSquare className="w-5 h-5 text-purple-400" />
                            ) : (
                              <Square className="w-5 h-5 text-slate-500" />
                            )}
                          </button>
                        )}

                        {claim.photoUrl ? (
                          <div
                            onClick={() => setViewingPhoto(claim.photoUrl || null)}
                            className="relative group w-11 h-11 rounded-xl overflow-hidden shrink-0 border border-amber-500/40 cursor-pointer shadow-sm mt-0.5"
                            title={language === 'bn' ? 'বড় করে দেখতে ক্লিক করুন' : 'Click to view photo'}
                          >
                            <img
                              src={claim.photoUrl}
                              alt={claim.productName}
                              className="w-full h-full object-cover group-hover:scale-110 transition duration-200"
                            />
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition">
                              <Maximize2 className="w-3.5 h-3.5 text-white" />
                            </div>
                          </div>
                        ) : (
                          <div className="w-10 h-10 rounded-xl bg-slate-800 flex items-center justify-center text-slate-300 shrink-0 border border-slate-700 mt-0.5">
                            <PackageCheck className={`w-4 h-4 ${isSentToCompany ? 'text-purple-400' : 'text-amber-400'}`} />
                          </div>
                        )}

                        <div className="space-y-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h4 className="font-bold text-sm text-white">{claim.productName}</h4>
                            <span className="text-xs font-mono text-amber-300 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20 font-bold">
                              {claim.quantity} {claim.unit || 'pcs'}
                            </span>
                            <span
                              className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                isPending
                                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                                  : isSentToCompany
                                  ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                                  : isReplaced
                                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                                  : isCredited
                                  ? 'bg-sky-500/20 text-sky-300 border border-sky-500/30'
                                  : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                              }`}
                            >
                              {isPending
                                ? (language === 'bn' ? 'অপেক্ষমান' : 'PENDING')
                                : isSentToCompany
                                ? (language === 'bn' ? 'কোম্পানিতে পাঠানো হয়েছে' : 'SENT TO COMPANY')
                                : isReplaced
                                ? (language === 'bn' ? 'পণ্য প্রতিস্থাপিত' : 'REPLACED')
                                : isCredited
                                ? (language === 'bn' ? 'খাতায় সমন্বয়' : 'CREDITED')
                                : claim.status}
                            </span>
                          </div>

                          <div className="flex items-center gap-2 text-xs text-slate-400 flex-wrap">
                            <span className="flex items-center gap-1 text-slate-200 font-semibold">
                              <Store className="w-3 h-3 text-purple-400" />
                              {claim.partyName}
                            </span>
                            <span>•</span>
                            <span className="text-rose-300">{claim.reason}</span>
                            <span>•</span>
                            <span className="font-mono text-slate-400 flex items-center gap-1">
                              <Calendar className="w-3 h-3 text-slate-500" />
                              {claim.date}
                            </span>
                          </div>

                          {claim.notes && (
                            <p className="text-[11px] text-slate-400 italic bg-black/20 px-2 py-0.5 rounded">
                              "{claim.notes}"
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-3 justify-between sm:justify-end border-t sm:border-t-0 pt-2 sm:pt-0 border-slate-800">
                        <div className="text-right">
                          <span className="text-[10px] text-slate-400 block">{language === 'bn' ? 'মূল্য' : 'Value'}</span>
                          <span className="text-base font-extrabold text-white font-mono-num">
                            {formatCurrency(claim.estimatedValue ?? claim.totalAdjustmentValue ?? 0, language)}
                          </span>
                        </div>

                        {/* Resolution Actions */}
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {isPending && currentRole !== 'retailer' && (
                            <>
                              <button
                                type="button"
                                onClick={() => resolveReplacementClaim(claim.id, 'REPLACED_WITH_GOODS')}
                                className="px-2.5 py-1.5 bg-emerald-600/30 hover:bg-emerald-600 text-emerald-300 hover:text-white border border-emerald-500/40 rounded-lg text-xs font-semibold transition flex items-center gap-1 cursor-pointer"
                                title="Deliver replacement stock from warehouse"
                              >
                                <Check className="w-3.5 h-3.5" />
                                <span>{language === 'bn' ? 'পণ্য দিন' : 'Replace Item'}</span>
                              </button>

                              <button
                                type="button"
                                onClick={() => resolveReplacementClaim(claim.id, 'CREDITED_TO_LEDGER')}
                                className="px-2.5 py-1.5 bg-sky-600/30 hover:bg-sky-600 text-sky-300 hover:text-white border border-sky-500/40 rounded-lg text-xs font-semibold transition flex items-center gap-1 cursor-pointer"
                                title="Deduct from retailer balance"
                              >
                                <CreditCard className="w-3.5 h-3.5" />
                                <span>{language === 'bn' ? 'খাতায় সমন্বয়' : 'Credit Due'}</span>
                              </button>

                              <button
                                type="button"
                                onClick={() => {
                                  setSelectedClaimIds([claim.id]);
                                  handleOpenDispatchWithSelected();
                                }}
                                className="px-2 py-1.5 bg-purple-600/30 hover:bg-purple-600 text-purple-300 hover:text-white border border-purple-500/40 rounded-lg text-xs font-semibold transition flex items-center gap-1 cursor-pointer"
                                title="Send this item to company"
                              >
                                <Send className="w-3.5 h-3.5" />
                                <span>{language === 'bn' ? 'কোম্পানি' : 'Company'}</span>
                              </button>
                            </>
                          )}

                          {/* Delete claim button */}
                          <button
                            type="button"
                            onClick={() => setDeletingClaim(claim)}
                            className="p-1.5 text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition cursor-pointer"
                            title="Delete"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* VIEW 2: COMPANY DISPATCHED RETURNS */}
      {mainTab === 'COMPANY' && (
        <div className="space-y-3">
          {/* Company Metrics Summary */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800">
              <span className="text-[11px] text-slate-400 block font-semibold">
                {language === 'bn' ? 'মোট প্রেরিত চালান' : 'Dispatched Challans'}
              </span>
              <span className="text-xl font-black text-white font-mono-num mt-1 block">
                {totalCompanyReturnsCount}
              </span>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800">
              <span className="text-[11px] text-slate-400 block font-semibold">
                {language === 'bn' ? 'মোট ফেরত পণ্যের সংখ্যা' : 'Total Items Returned'}
              </span>
              <span className="text-xl font-black text-amber-400 font-mono-num mt-1 block">
                {totalCompanyReturnedQuantity} pcs
              </span>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800">
              <span className="text-[11px] text-slate-400 block font-semibold">
                {language === 'bn' ? 'কোম্পানি সমন্বয় / মোট মূল্য' : 'Total Value Adjusted'}
              </span>
              <span className="text-xl font-black text-purple-400 font-mono-num mt-1 block">
                {formatCurrency(totalCompanyReturnedValue, language)}
              </span>
            </div>
          </div>

          {/* Company Fast Action Banner */}
          <div className="p-4 rounded-xl bg-gradient-to-r from-emerald-950/50 via-teal-950/40 to-indigo-950/50 border border-emerald-500/30 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-md">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 shrink-0">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-white flex items-center gap-2">
                  <span>{language === 'bn' ? 'কোম্পানি রিপ্লেস ইনভয়েস স্ক্যান, ছবি বা খাতা/মেমো এন্ট্রি' : 'Company Replace Invoice Scan, Photo or Memo Entry'}</span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-semibold border border-emerald-500/30">
                    {language === 'bn' ? 'অটো স্টক ও দেনা মাইনাস' : 'Auto Stock & Due Minus'}
                  </span>
                </h4>
                <p className="text-xs text-slate-300">
                  {language === 'bn'
                    ? 'কোম্পানির চালান স্ক্যান করে বা ছবি তুলে অথবা মেমোতে লিখে দ্রুত এন্ট্রি দিন। পণ্য সরাসরি স্টক থেকে মাইনাস হবে এবং মোট মূল্য কোম্পানির বকেয়া দেনা থেকে কেটে যাবে।'
                    : 'Scan invoice, snap a photo or write in memo. Deducts returned products from stock and reduces company payable due automatically.'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
              <button
                type="button"
                onClick={() => setIsCompanyMemoModalOpen(true)}
                className="w-full sm:w-auto px-4 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-emerald-950/40 transition active:scale-95 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>{language === 'bn' ? 'মেমো / স্ক্যান এন্ট্রি শুরু করুন' : 'Start Memo/Scan Entry'}</span>
              </button>
            </div>
          </div>

          {/* Company Dispatched Challan Cards */}
          <div className="space-y-3">
            {companyReturns.length === 0 ? (
              <div className="p-8 text-center bg-slate-900/60 rounded-2xl border border-slate-800 text-xs text-slate-400">
                <Building2 className="w-8 h-8 text-slate-600 mx-auto mb-2" />
                <p>
                  {language === 'bn'
                    ? 'কোম্পানিতে এখনও কোনো ফেরত পণ্যের চালান পাঠানো হয়নি।'
                    : 'No company return challans have been dispatched yet.'}
                </p>
                <p className="text-[11px] text-slate-500 mt-1">
                  {language === 'bn'
                    ? 'মার্কেট থেকে ফেরত পণ্য নির্বাচন করে অথবা সরাসরি কোম্পানির জন্য রিটার্ন চালান তৈরি করতে পারেন।'
                    : 'Select items from Market Returns or create a direct challan for your suppliers.'}
                </p>
                <button
                  type="button"
                  onClick={handleOpenDirectDispatch}
                  className="mt-3 px-3.5 py-1.5 bg-purple-600 hover:bg-purple-500 text-white rounded-lg text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>{language === 'bn' ? 'কোম্পানিতে রিটার্ন চালান তৈরি করুন' : 'Create Return Challan'}</span>
                </button>
              </div>
            ) : (
              companyReturns.map((challan) => {
                const isExpanded = expandedChallanId === challan.id;

                return (
                  <div
                    key={challan.id}
                    className="p-4 rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-700 transition shadow-sm space-y-3"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 rounded-xl bg-purple-950/60 border border-purple-500/40 flex items-center justify-center text-purple-400 shrink-0 mt-0.5">
                          <Building2 className="w-5 h-5" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <h4 className="font-bold text-sm text-white flex items-center gap-1.5">
                              <span>{challan.supplierName}</span>
                              {challan.supplierCompany && (
                                <span className="text-xs text-slate-400 font-normal">({challan.supplierCompany})</span>
                              )}
                            </h4>
                            <span className="text-xs font-mono font-bold bg-purple-500/20 text-purple-300 border border-purple-500/30 px-2 py-0.5 rounded">
                              #{challan.challanNo}
                            </span>

                            {/* Source Type Tag */}
                            {challan.sourceType === 'SCAN' && (
                              <span className="text-[10px] px-1.5 py-0.5 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 font-semibold flex items-center gap-1">
                                <Sparkles className="w-3 h-3 text-indigo-400" />
                                <span>{language === 'bn' ? 'স্ক্যানকৃত' : 'Scanned'}</span>
                              </span>
                            )}
                            {challan.sourceType === 'PHOTO' && (
                              <span className="text-[10px] px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-300 border border-purple-500/30 font-semibold flex items-center gap-1">
                                <Camera className="w-3 h-3 text-purple-400" />
                                <span>{language === 'bn' ? 'ছবি এন্ট্রি' : 'Photo Entry'}</span>
                              </span>
                            )}
                            {challan.sourceType === 'MEMO_KHATA' && (
                              <span className="text-[10px] px-1.5 py-0.5 rounded bg-teal-500/20 text-teal-300 border border-teal-500/30 font-semibold flex items-center gap-1">
                                <FileText className="w-3 h-3 text-teal-400" />
                                <span>{language === 'bn' ? 'খাতা/মেমো' : 'Khata/Memo'}</span>
                              </span>
                            )}
                          </div>

                          <div className="flex items-center gap-2 text-xs text-slate-400 flex-wrap mt-1">
                            <span className="flex items-center gap-1 font-mono text-slate-300">
                              <Calendar className="w-3 h-3 text-amber-400" />
                              {challan.dispatchDate}
                            </span>
                            <span>•</span>
                            <span className="text-slate-300 font-semibold">
                              {challan.totalItemsCount || challan.items.length} {language === 'bn' ? 'পণ্য' : 'items'} (
                              {challan.totalQuantity} pcs)
                            </span>

                            {/* Stock deduction badge */}
                            {challan.deductStock !== false && (
                              <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-300 border border-blue-500/30 font-semibold flex items-center gap-1">
                                <span>✓ {language === 'bn' ? 'স্টক মাইনাস সম্পন্ন' : 'Stock Deducted'}</span>
                              </span>
                            )}

                            {/* Due deduction badge */}
                            {challan.adjustSupplierLedger && (
                              <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-semibold flex items-center gap-1">
                                <span>✓ {language === 'bn' ? 'কোম্পানির দেনা মাইনাস' : 'Due Deducted'}</span>
                              </span>
                            )}
                          </div>

                          {/* Photo Thumbnail if attached */}
                          {challan.photoUrl && (
                            <div className="mt-1.5 flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => setViewingPhoto(challan.photoUrl!)}
                                className="group relative w-12 h-12 rounded-lg overflow-hidden border border-purple-500/40 hover:border-purple-300 shadow-sm shrink-0 transition"
                                title={language === 'bn' ? 'বড় করে দেখতে ক্লিক করুন' : 'Click to enlarge'}
                              >
                                <img
                                  src={challan.photoUrl}
                                  alt="Memo photo"
                                  className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                                  referrerPolicy="no-referrer"
                                />
                                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white text-[9px] font-bold transition-opacity">
                                  <Eye className="w-3.5 h-3.5 text-white" />
                                </div>
                              </button>
                              <span className="text-[11px] text-slate-400">
                                {language === 'bn' ? 'সংযুক্ত মেমো/চালানের ছবি' : 'Attached memo/challan photo'}
                              </span>
                            </div>
                          )}

                          {challan.notes && (
                            <p className="text-[11px] text-slate-400 italic mt-1 bg-black/20 px-2 py-0.5 rounded inline-block">
                              "{challan.notes}"
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-3 justify-between sm:justify-end border-t sm:border-t-0 pt-2 sm:pt-0 border-slate-800">
                        <div className="text-right">
                          <span className="text-[10px] text-slate-400 block">{language === 'bn' ? 'চালানের মোট মূল্য' : 'Challan Value'}</span>
                          <span className="text-base sm:text-lg font-extrabold text-purple-400 font-mono-num">
                            {formatCurrency(challan.totalValue, language)}
                          </span>
                        </div>

                        <div className="flex items-center gap-1.5 flex-wrap">
                          {!challan.adjustSupplierLedger && currentRole === 'admin' && (
                            <button
                              type="button"
                              onClick={() => {
                                recordCompanyCreditSettlement({
                                  supplierId: challan.supplierId,
                                  challanId: challan.id,
                                  creditAmount: challan.totalValue,
                                  creditNoteNo: challan.challanNo,
                                  date: new Date().toISOString().slice(0, 10),
                                  notes: language === 'bn'
                                    ? `কোম্পানি রিটার্ন চালান #${challan.challanNo} বাবদ ক্রেডিট নোট সমন্বয়`
                                    : `Credit settlement for return challan #${challan.challanNo}`,
                                });
                                setSuccessNotice(
                                  language === 'bn'
                                    ? `কোম্পানি লেজারে চালান #${challan.challanNo} বাবদ ${formatCurrency(challan.totalValue, 'bn')} ক্রেডিট সমন্বয় সম্পন্ন হয়েছে!`
                                    : `Credit note of ${formatCurrency(challan.totalValue, 'en')} settled in supplier ledger!`
                                );
                                setTimeout(() => setSuccessNotice(null), 4000);
                              }}
                              className="px-2.5 py-1.5 bg-emerald-600/20 hover:bg-emerald-600 text-emerald-300 hover:text-white border border-emerald-500/40 text-xs font-semibold rounded-lg transition flex items-center gap-1 cursor-pointer"
                              title="Deduct this returned amount from Company Payable Ledger"
                            >
                              <CreditCard className="w-3.5 h-3.5" />
                              <span>{language === 'bn' ? 'লেজার সমন্বয়' : 'Settle Credit'}</span>
                            </button>
                          )}

                          <button
                            type="button"
                            onClick={() => setExpandedChallanId(isExpanded ? null : challan.id)}
                            className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-lg border border-slate-700 transition flex items-center gap-1 cursor-pointer"
                          >
                            <span>{language === 'bn' ? 'আইটেম বিস্তারিত' : 'Details'}</span>
                            {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                          </button>

                          <button
                            type="button"
                            onClick={() => setDeletingChallan(challan)}
                            className="p-1.5 text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition cursor-pointer"
                            title="Delete Challan"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Expandable Items Breakdown Table */}
                    {isExpanded && (
                      <div className="pt-2 border-t border-slate-800 space-y-2 animate-in fade-in">
                        <h5 className="text-xs font-bold text-slate-300 flex items-center gap-1">
                          <FileText className="w-3.5 h-3.5 text-purple-400" />
                          <span>{language === 'bn' ? 'এই চালানে অন্তর্ভুক্ত পণ্যের তালিকা:' : 'Items Included in Challan:'}</span>
                        </h5>
                        <div className="overflow-x-auto rounded-lg border border-slate-800 bg-slate-950/60">
                          <table className="w-full text-left text-xs">
                            <thead className="bg-slate-900 text-slate-400 text-[10px] uppercase font-bold border-b border-slate-800">
                              <tr>
                                <th className="p-2">#</th>
                                <th className="p-2">{language === 'bn' ? 'পণ্যের নাম' : 'Product'}</th>
                                <th className="p-2">{language === 'bn' ? 'পরিমাণ' : 'Qty'}</th>
                                <th className="p-2">{language === 'bn' ? 'কারণ' : 'Reason'}</th>
                                <th className="p-2">{language === 'bn' ? 'মূল উৎস (দোকান)' : 'Origin Shop'}</th>
                                <th className="p-2 text-right">{language === 'bn' ? 'মূল্য' : 'Value'}</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-800">
                              {challan.items.map((item, idx) => (
                                <tr key={idx} className="hover:bg-slate-900/40">
                                  <td className="p-2 font-mono text-slate-500">{idx + 1}</td>
                                  <td className="p-2 font-semibold text-white">{item.productName}</td>
                                  <td className="p-2 font-mono text-amber-300">
                                    {item.quantity} {item.unit || 'pcs'}
                                  </td>
                                  <td className="p-2 text-slate-300">{item.reason || 'Expired / Damaged'}</td>
                                  <td className="p-2 text-purple-300 font-medium">
                                    {item.marketRetailerName || (language === 'bn' ? 'সরাসরি ইনভেন্টরি' : 'Direct Inventory')}
                                  </td>
                                  <td className="p-2 text-right font-mono font-bold text-purple-400">
                                    {formatCurrency(item.value, language)}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* MODAL 1: New Market Return Claim */}
      {isMarketClaimModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-sm animate-in fade-in overflow-y-auto">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl my-auto">
            <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-950">
              <div className="flex items-center gap-2">
                <Store className="w-5 h-5 text-amber-400" />
                <div>
                  <h3 className="font-bold text-slate-100 text-sm sm:text-base">
                    {language === 'bn' ? 'মার্কেট থেকে ফেরত নষ্ট পণ্যের এন্ট্রি' : 'New Market Return Claim'}
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    {isUnlistedProduct
                      ? (language === 'bn'
                          ? 'স্টকে না থাকা পণ্যের কোম্পানি ক্রয় চালান ও ড্যামেজ রিপ্লেসমেন্ট যৌথ এন্ট্রি'
                          : 'Record original purchase & defect replacement for unlisted product')
                      : (language === 'bn'
                          ? 'দোকানদার থেকে ফেরত আসা পণ্যের রেকর্ড রাখুন'
                          : 'Record defective product returned from retailer')}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsUnlistedProduct(false);
                  setIsMarketClaimModalOpen(false);
                }}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitMarketClaim} className="p-4 space-y-3.5 max-h-[85vh] overflow-y-auto">
              
              {/* Retailer Selector */}
              <div>
                <label className="text-[10px] uppercase font-bold text-slate-400">
                  {language === 'bn' ? 'খুচরা বিক্রেতা / দোকানদার' : 'Retailer / Shop'}
                </label>
                <select
                  value={selectedRetailerId}
                  onChange={(e) => setSelectedRetailerId(e.target.value)}
                  className="w-full mt-1 bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
                >
                  {retailers.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.shopName} ({r.ownerName})
                    </option>
                  ))}
                </select>
              </div>

              {/* Product Mode Toggle: In Stock vs Not in Stock */}
              <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[10px] uppercase font-bold text-slate-300">
                    {language === 'bn' ? 'পণ্য নির্বাচন পদ্ধতি' : 'Product Selection'}
                  </span>

                  <button
                    type="button"
                    onClick={() => setIsUnlistedProduct(!isUnlistedProduct)}
                    className={`text-[11px] px-2.5 py-1 rounded-lg font-bold transition flex items-center gap-1.5 cursor-pointer ${
                      isUnlistedProduct
                        ? 'bg-amber-500 text-slate-950 shadow-md ring-2 ring-amber-400/40'
                        : 'bg-slate-800 hover:bg-slate-700 text-amber-300 border border-amber-500/30'
                    }`}
                  >
                    <AlertTriangle className="w-3.5 h-3.5" />
                    <span>
                      {isUnlistedProduct
                        ? (language === 'bn' ? 'স্টক ক্যাটালগের পণ্য দেখুন' : 'Switch to In-Stock')
                        : (language === 'bn' ? '⚠️ পণ্যটি স্টক লিস্টে নেই? নতুন ক্রয়ের এন্ট্রি দিন' : '⚠️ Not in Stock? Record Purchase')}
                    </span>
                  </button>
                </div>

                {/* AUTOMATIC SIGNAL & PURCHASE INTEGRATION VIEW */}
                {isUnlistedProduct ? (
                  <div className="space-y-3 pt-1 animate-in fade-in">
                    
                    {/* Visual Signal Banner */}
                    <div className="p-3 bg-gradient-to-r from-amber-500/20 via-orange-500/15 to-amber-600/10 border border-amber-500/50 rounded-xl space-y-1 text-amber-200">
                      <div className="flex items-center gap-2 font-bold text-xs text-amber-300">
                        <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
                        <span>
                          {language === 'bn'
                            ? 'অটোমেটিক সিগন্যাল: এই পণ্যটি আপনার বর্তমান স্টক লিস্টে নেই!'
                            : 'Auto Signal: Product is not in your current stock catalog!'}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-300 leading-relaxed">
                        {language === 'bn'
                          ? 'পণ্যটি কোম্পানি থেকে কত তারিখে, কোন চালানে এবং কত পিস কেনা হয়েছিল নিচে লিখুন। সাবমিট করলে এটি স্বয়ংক্রিয়ভাবে কোম্পানির ক্রয় চালান, স্টক এবং মার্কেট রিপ্লেসমেন্টে জমা হয়ে যাবে এবং ক্রয় ও বিক্রয় টাকা উভয় জায়গায় যোগ হবে।'
                          : 'Provide company purchase invoice details below. Upon submit, this will auto-generate a Purchase Invoice, add to Stock, and create a Market Replacement with balanced financial ledgers.'}
                      </p>
                    </div>

                    {/* Product Name & Brand/Supplier */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      <div>
                        <label className="text-[10px] uppercase font-bold text-slate-400">
                          {language === 'bn' ? 'পণ্যের নাম *' : 'Product Name *'}
                        </label>
                        <input
                          type="text"
                          required
                          placeholder="e.g. PRAN Frooto 250ml / Walton Battery"
                          value={unlistedForm.name}
                          onChange={(e) => setUnlistedForm({ ...unlistedForm, name: e.target.value })}
                          className="w-full mt-1 bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
                        />
                      </div>

                      <div>
                        <label className="text-[10px] uppercase font-bold text-slate-400">
                          {language === 'bn' ? 'কোম্পানি / সাপ্লায়ার *' : 'Company / Supplier *'}
                        </label>
                        <select
                          value={unlistedForm.supplierId}
                          onChange={(e) => setUnlistedForm({ ...unlistedForm, supplierId: e.target.value })}
                          className="w-full mt-1 bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
                        >
                          {suppliers.map((s) => (
                            <option key={s.id} value={s.id}>
                              {s.company || s.name}
                            </option>
                          ))}
                          <option value="__NEW__">{language === 'bn' ? '+ নতুন কোম্পানি / সাপ্লায়ার' : '+ New Supplier'}</option>
                        </select>
                      </div>
                    </div>

                    {unlistedForm.supplierId === '__NEW__' && (
                      <div>
                        <label className="text-[10px] uppercase font-bold text-slate-400">
                          {language === 'bn' ? 'নতুন কোম্পানির নাম লিখুন' : 'New Company Name'}
                        </label>
                        <input
                          type="text"
                          placeholder="e.g. PRAN Foods Ltd / Akij Group"
                          value={unlistedForm.customSupplierName}
                          onChange={(e) => setUnlistedForm({ ...unlistedForm, customSupplierName: e.target.value })}
                          className="w-full mt-1 bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
                        />
                      </div>
                    )}

                    {/* Purchase Date & Purchase Invoice / Challan Number */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      <div>
                        <div className="flex items-center justify-between">
                          <label className="text-[10px] uppercase font-bold text-slate-400 flex items-center gap-1">
                            <Calendar className="w-3 h-3 text-amber-400" />
                            <span>{language === 'bn' ? 'পণ্যটি ক্রয়ের তারিখ *' : 'Purchase Date *'}</span>
                          </label>
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => setUnlistedForm({ ...unlistedForm, purchaseDate: getTodayDateString() })}
                              className="text-[9px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 hover:text-white cursor-pointer"
                            >
                              {language === 'bn' ? 'আজ' : 'Today'}
                            </button>
                            <button
                              type="button"
                              onClick={() => setUnlistedForm({ ...unlistedForm, purchaseDate: getYesterdayDateString() })}
                              className="text-[9px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 hover:text-white cursor-pointer"
                            >
                              {language === 'bn' ? 'গতকাল' : 'Yesterday'}
                            </button>
                          </div>
                        </div>
                        <input
                          type="date"
                          value={unlistedForm.purchaseDate}
                          onChange={(e) => setUnlistedForm({ ...unlistedForm, purchaseDate: e.target.value })}
                          className="w-full mt-1 bg-slate-900 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-white font-mono focus:outline-none focus:border-amber-500"
                        />
                      </div>

                      <div>
                        <label className="text-[10px] uppercase font-bold text-slate-400">
                          {language === 'bn' ? 'ক্রয় চালান / ইনভয়েস নম্বর *' : 'Purchase Invoice / Challan # *'}
                        </label>
                        <input
                          type="text"
                          required
                          placeholder="e.g. CHAL-88910 or INV-2026-05"
                          value={unlistedForm.invoiceNo}
                          onChange={(e) => setUnlistedForm({ ...unlistedForm, invoiceNo: e.target.value })}
                          className="w-full mt-1 bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-amber-500"
                        />
                      </div>
                    </div>

                    {/* Quantity & Unit & Prices */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      <div>
                        <label className="text-[10px] uppercase font-bold text-slate-400">
                          {language === 'bn' ? 'পূর্বে ক্রয় (পিস/বক্স) *' : 'Purchased Qty *'}
                        </label>
                        <input
                          type="number"
                          min="0"
                          step="any"
                          required
                          value={unlistedForm.purchasedQuantity}
                          onChange={(e) => setUnlistedForm({ ...unlistedForm, purchasedQuantity: Math.max(0, Number(e.target.value)) })}
                          className="w-full mt-1 bg-slate-900 border border-slate-700 rounded-xl px-2.5 py-1.5 text-xs text-white font-mono focus:outline-none focus:border-amber-500"
                        />
                      </div>

                      <div>
                        <label className="text-[10px] uppercase font-bold text-slate-400">
                          {language === 'bn' ? 'একক ইউনিট' : 'Unit'}
                        </label>
                        <select
                          value={unlistedForm.unit}
                          onChange={(e) => setUnlistedForm({ ...unlistedForm, unit: e.target.value })}
                          className="w-full mt-1 bg-slate-900 border border-slate-700 rounded-xl px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-amber-500"
                        >
                          <option value="pcs">pcs (পিস)</option>
                          <option value="box">box (বক্স)</option>
                          <option value="carton">carton (কার্টুন)</option>
                          <option value="kg">kg (কেজি)</option>
                          <option value="liter">liter (লিটার)</option>
                        </select>
                      </div>

                      <div>
                        <label className="text-[10px] uppercase font-bold text-slate-400">
                          {language === 'bn' ? 'একক ক্রয় দর (৳) *' : 'Cost Price *'}
                        </label>
                        <input
                          type="number"
                          min="0"
                          step="any"
                          required
                          value={unlistedForm.costPrice || ''}
                          onChange={(e) => setUnlistedForm({ ...unlistedForm, costPrice: Number(e.target.value) })}
                          placeholder="0.00"
                          className="w-full mt-1 bg-slate-900 border border-slate-700 rounded-xl px-2.5 py-1.5 text-xs text-white font-mono focus:outline-none focus:border-amber-500"
                        />
                      </div>

                      <div>
                        <label className="text-[10px] uppercase font-bold text-slate-400">
                          {language === 'bn' ? 'পাইকারি বিক্রয় দর (৳)' : 'Wholesale Price'}
                        </label>
                        <input
                          type="number"
                          min="0"
                          step="any"
                          value={unlistedForm.wholesalePrice || ''}
                          onChange={(e) => setUnlistedForm({ ...unlistedForm, wholesalePrice: Number(e.target.value) })}
                          placeholder="0.00"
                          className="w-full mt-1 bg-slate-900 border border-slate-700 rounded-xl px-2.5 py-1.5 text-xs text-white font-mono focus:outline-none focus:border-amber-500"
                        />
                      </div>
                    </div>

                    {/* Dual Financial Ledger Impact Display */}
                    <div className="p-3 bg-slate-900 border border-slate-800 rounded-xl grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs">
                      <div>
                        <span className="text-[10px] text-slate-400 block font-medium">
                          {language === 'bn' ? 'কোম্পানি ক্রয় মোট টাকা' : 'Total Company Purchase'}:
                        </span>
                        <span className="text-sm font-bold text-amber-400 font-mono">
                          {formatCurrency(unlistedForm.purchasedQuantity * unlistedForm.costPrice, language)}
                        </span>
                        <span className="text-[9px] text-slate-500 block">
                          {language === 'bn' ? '(ক্রয় লেজার ও চালানে যোগ হবে)' : '(Added to Purchase Ledger)'}
                        </span>
                      </div>

                      <div>
                        <span className="text-[10px] text-slate-400 block font-medium">
                          {language === 'bn' ? 'দোকানদার থেকে ফেরত' : 'Market Defect Return'}:
                        </span>
                        <span className="text-sm font-bold text-rose-400 font-mono">
                          {quantity} {unlistedForm.unit} (৳{((unlistedForm.wholesalePrice || unlistedForm.costPrice) * quantity).toLocaleString()})
                        </span>
                        <span className="text-[9px] text-slate-500 block">
                          {language === 'bn' ? '(রিপ্লেসমেন্ট ভ্যালুতে যোগ হবে)' : '(Added to Replacement)'}
                        </span>
                      </div>

                      <div>
                        <span className="text-[10px] text-slate-400 block font-medium">
                          {language === 'bn' ? 'স্টকে নেট অবশিষ্ট থাকবে' : 'Net In-Stock'}:
                        </span>
                        <span className="text-sm font-bold text-emerald-400 font-mono">
                          {Math.max(0, unlistedForm.purchasedQuantity - quantity)} {unlistedForm.unit}
                        </span>
                        <span className="text-[9px] text-slate-500 block">
                          {language === 'bn' ? '(ক্যাটালগে সক্রিয় বিক্রয়যোগ্য)' : '(Available in Stock)'}
                        </span>
                      </div>
                    </div>
                  </div>
                ) : (
                  /* Standard In-Stock Product Selection */
                  <div>
                    <label className="text-[10px] uppercase font-bold text-slate-400">{t.products}</label>
                    <select
                      value={selectedProductId}
                      onChange={(e) => setSelectedProductId(e.target.value)}
                      className="w-full mt-1 bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
                    >
                      {products.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name} ({p.sku}) - {p.brand} [স্টক: {p.stockQuantity} {p.unit}]
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              {/* Quantity and Value */}
              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="text-[10px] uppercase font-bold text-slate-400">
                    {language === 'bn' ? 'মার্কেট থেকে ফেরত এসেছে কত পিস' : 'Return Quantity'}
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    value={quantity}
                    onChange={(e) => setQuantity(Math.max(0, Number(e.target.value)))}
                    className="w-full mt-1 bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="text-[10px] uppercase font-bold text-slate-400">
                    {language === 'bn' ? 'রিপ্লেসমেন্ট আনুমানিক মূল্য' : 'Est. Replacement Value'}
                  </label>
                  <div className="w-full mt-1 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-emerald-400 font-mono font-bold">
                    {isUnlistedProduct
                      ? formatCurrency(quantity * (unlistedForm.wholesalePrice || unlistedForm.costPrice || 0), language)
                      : formatCurrency(quantity * (selectedProduct?.wholesalePrice || 0), language)}
                  </div>
                </div>
              </div>

              {/* Return Reason */}
              <div>
                <label className="text-[10px] uppercase font-bold text-slate-400">
                  {language === 'bn' ? 'ফেরতের কারণ' : 'Return Reason'}
                </label>
                <select
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  className="w-full mt-1 bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
                >
                  <option value="Expired Product (মেয়াদোত্তীর্ণ)">Expired Product (মেয়াদোত্তীর্ণ)</option>
                  <option value="Packaging Broken / Leaked (প্যাকেট ছেঁড়া বা লিক)">Packaging Broken / Leaked (প্যাকেট ছেঁড়া বা লিক)</option>
                  <option value="Factory Defect / Quality Issue (কোম্পানি ত্রুটি)">Factory Defect / Quality Issue (কোম্পানি ত্রুটি)</option>
                  <option value="Transit Damage (পরিবহনে নষ্ট)">Transit Damage (পরিবহনে নষ্ট)</option>
                </select>
              </div>

              {/* Date Input */}
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <label className="text-[10px] uppercase font-bold text-slate-400 flex items-center gap-1">
                    <Calendar className="w-3 h-3 text-amber-400" />
                    <span>{language === 'bn' ? 'ফেরত গ্রহণের তারিখ' : 'Return Date'}</span>
                  </label>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => setClaimDate(getTodayDateString())}
                      className={`text-[9px] px-1.5 py-0.5 rounded font-bold transition cursor-pointer ${
                        claimDate === getTodayDateString() ? 'bg-amber-600 text-white' : 'bg-slate-800 text-slate-400 hover:text-white'
                      }`}
                    >
                      {language === 'bn' ? 'আজ' : 'Today'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setClaimDate(getYesterdayDateString())}
                      className={`text-[9px] px-1.5 py-0.5 rounded font-bold transition cursor-pointer ${
                        claimDate === getYesterdayDateString() ? 'bg-amber-600 text-white' : 'bg-slate-800 text-slate-400 hover:text-white'
                      }`}
                    >
                      {language === 'bn' ? 'গতকাল' : 'Yesterday'}
                    </button>
                  </div>
                </div>
                <input
                  type="date"
                  value={claimDate}
                  onChange={(e) => setClaimDate(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-white font-mono focus:outline-none focus:border-amber-500"
                />
              </div>

              {/* Damaged Product Photo / Inherit Product Photo */}
              <div className="space-y-1.5 p-2.5 rounded-xl bg-slate-950 border border-slate-800">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] uppercase font-bold text-slate-400 flex items-center gap-1">
                    <Camera className="w-3 h-3 text-amber-400" />
                    <span>{language === 'bn' ? 'নষ্ট পণ্যের ছবি (ম্যানুয়াল / ক্যামেরা)' : 'Defect / Return Photo'}</span>
                  </span>
                  {claimPhoto && (
                    <button
                      type="button"
                      onClick={() => setClaimPhoto('')}
                      className="text-[10px] text-rose-400 hover:text-rose-300 flex items-center gap-0.5 cursor-pointer"
                    >
                      <Trash2 className="w-3 h-3" />
                      <span>{language === 'bn' ? 'ছবি মুছুন' : 'Clear'}</span>
                    </button>
                  )}
                </div>

                {isClaimCameraOpen ? (
                  <div className="relative rounded-xl overflow-hidden bg-black aspect-video flex items-center justify-center border border-amber-500/50">
                    <video
                      ref={claimVideoRef}
                      autoPlay
                      playsInline
                      muted
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-x-0 bottom-2 flex items-center justify-center gap-2">
                      <button
                        type="button"
                        onClick={handleClaimSnapPhoto}
                        disabled={isClaimCompressing}
                        className="px-4 py-1.5 rounded-full bg-amber-500 text-slate-950 font-bold text-xs shadow-lg flex items-center gap-1 cursor-pointer"
                      >
                        <Camera className="w-3.5 h-3.5" />
                        <span>{isClaimCompressing ? 'প্রসেসিং...' : (language === 'bn' ? 'ছবি তুলুন' : 'Snap')}</span>
                      </button>
                      <button
                        type="button"
                        onClick={handleStopClaimCamera}
                        className="p-1.5 rounded-full bg-slate-900 text-white text-xs border border-slate-700 cursor-pointer"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-3">
                    {claimPhoto || (!isUnlistedProduct && selectedProduct?.image) ? (
                      <img
                        src={claimPhoto || (!isUnlistedProduct ? selectedProduct?.image : '')}
                        alt="Claim Preview"
                        className="w-14 h-14 rounded-xl object-cover border border-amber-500/40 shadow-sm shrink-0"
                      />
                    ) : (
                      <div className="w-14 h-14 rounded-xl bg-slate-900 border border-slate-800 flex flex-col items-center justify-center text-slate-500 shrink-0">
                        <ImageIcon className="w-5 h-5" />
                        <span className="text-[9px] mt-0.5">ছবি নেই</span>
                      </div>
                    )}

                    <div className="flex-1 space-y-1">
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={handleStartClaimCamera}
                          className="flex-1 py-1 px-2 bg-slate-900 hover:bg-slate-800 text-amber-300 rounded-lg text-xs font-semibold border border-slate-700 hover:border-amber-500/40 flex items-center justify-center gap-1 transition cursor-pointer"
                        >
                          <Camera className="w-3 h-3" />
                          <span>{language === 'bn' ? 'ক্যামেরা' : 'Camera'}</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => claimFileInputRef.current?.click()}
                          className="flex-1 py-1 px-2 bg-slate-900 hover:bg-slate-800 text-sky-300 rounded-lg text-xs font-semibold border border-slate-700 hover:border-sky-500/40 flex items-center justify-center gap-1 transition cursor-pointer"
                        >
                          <Upload className="w-3 h-3" />
                          <span>{language === 'bn' ? 'গ্যালারি' : 'Upload'}</span>
                        </button>
                      </div>
                      <p className="text-[9px] text-slate-500">
                        {claimPhoto
                          ? (language === 'bn' ? 'ম্যানুয়াল ছবি সিলেক্ট করা আছে' : 'Manual photo attached')
                          : !isUnlistedProduct && selectedProduct?.image
                          ? (language === 'bn' ? 'পণ্যের ডিফল্ট ছবি ব্যবহৃত হবে' : 'Default product image will be used')
                          : (language === 'bn' ? 'নষ্ট পণ্যের ছবি তুলুন বা যোগ করুন' : 'Attach defect photo for visual audit')}
                      </p>
                    </div>

                    <input
                      ref={claimFileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleClaimFileUpload}
                      className="hidden"
                    />
                  </div>
                )}
              </div>

              <div>
                <label className="text-[10px] uppercase font-bold text-slate-400">{t.notes}</label>
                <input
                  type="text"
                  placeholder="Details, carton/batch number..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full mt-1 bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="flex items-center gap-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => {
                    setIsUnlistedProduct(false);
                    setIsMarketClaimModalOpen(false);
                  }}
                  className="flex-1 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition cursor-pointer"
                >
                  {t.cancel}
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold transition shadow-lg shadow-amber-950/40 flex items-center justify-center gap-1 cursor-pointer"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>
                    {isUnlistedProduct
                      ? (language === 'bn'
                          ? 'স্টক, ক্রয় চালান ও রিপ্লেসমেন্ট যৌথ সংরক্ষণ'
                          : 'Save to Stock, Purchase & Return')
                      : (language === 'bn'
                          ? 'রিপ্লেসমেন্ট সংরক্ষণ করুন'
                          : 'Save Claim')}
                  </span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: Company Dispatch Challan Modal */}
      {isCompanyDispatchModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm animate-in fade-in overflow-y-auto">
          <div className="bg-slate-900 border border-purple-500/50 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl my-6">
            <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-purple-950/40">
              <div className="flex items-center gap-2">
                <Building2 className="w-5 h-5 text-purple-400" />
                <h3 className="font-bold text-slate-100 text-sm sm:text-base">
                  {language === 'bn' ? 'কোম্পানিতে ফেরত চালান তৈরি করুন' : 'Create Company Return Challan'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsCompanyDispatchModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 space-y-3.5">
              {/* Target Supplier Selection */}
              <div>
                <label className="text-[10px] uppercase font-bold text-slate-400">
                  {language === 'bn' ? 'কোম্পানি / সাপ্লায়ার নির্বাচন' : 'Supplier / Company'}
                </label>
                <select
                  value={dispatchSupplierId}
                  onChange={(e) => setDispatchSupplierId(e.target.value)}
                  className="w-full mt-1 bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white font-semibold focus:outline-none focus:border-purple-500"
                >
                  {suppliers.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.company || s.name} - ({s.name})
                    </option>
                  ))}
                </select>
              </div>

              {/* Challan No & Date */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] uppercase font-bold text-slate-400">
                    {language === 'bn' ? 'কোম্পানি চালান নং' : 'Challan #'}
                  </label>
                  <input
                    type="text"
                    value={dispatchChallanNo}
                    onChange={(e) => setDispatchChallanNo(e.target.value)}
                    className="w-full mt-1 bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-purple-500"
                  />
                </div>

                <div>
                  <label className="text-[10px] uppercase font-bold text-slate-400">
                    {language === 'bn' ? 'চালান প্রেরণের তারিখ' : 'Dispatch Date'}
                  </label>
                  <input
                    type="date"
                    value={dispatchDate}
                    onChange={(e) => setDispatchDate(e.target.value)}
                    className="w-full mt-1 bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-purple-500"
                  />
                </div>
              </div>

              {/* Items in this Challan */}
              <div>
                <label className="text-[10px] uppercase font-bold text-slate-400 flex items-center justify-between mb-1">
                  <span>
                    {language === 'bn' ? 'চালানে অন্তর্ভুক্ত পণ্যের তালিকা' : 'Items in Challan'}
                  </span>
                  <span className="text-purple-400 font-mono">
                    {selectedClaimIds.length > 0 ? `${selectedClaimIds.length} items from market` : `${directItems.length} direct items`}
                  </span>
                </label>

                {selectedClaimIds.length > 0 ? (
                  <div className="max-h-40 overflow-y-auto rounded-xl border border-slate-800 bg-slate-950 p-2 space-y-1">
                    {replacements
                      .filter((r) => selectedClaimIds.includes(r.id))
                      .map((r, i) => (
                        <div key={r.id} className="text-xs p-1.5 rounded bg-slate-900 flex items-center justify-between">
                          <div>
                            <span className="font-semibold text-white">{r.productName}</span>
                            <span className="text-slate-400 font-mono ml-2">
                              ({r.quantity} {r.unit})
                            </span>
                            <span className="text-[10px] text-purple-300 ml-2 block sm:inline">
                              [{r.partyName}]
                            </span>
                          </div>
                          <span className="font-mono font-bold text-purple-300">
                            {formatCurrency(r.estimatedValue || r.totalAdjustmentValue || 0, language)}
                          </span>
                        </div>
                      ))}
                  </div>
                ) : (
                  <div className="rounded-xl border border-slate-800 bg-slate-950 p-2.5 space-y-2">
                    {directItems.map((item, idx) => (
                      <div key={idx} className="grid grid-cols-12 gap-1.5 items-center">
                        <div className="col-span-5">
                          <select
                            value={item.productId}
                            onChange={(e) => {
                              const prod = products.find((p) => p.id === e.target.value);
                              if (prod) {
                                const next = [...directItems];
                                next[idx] = {
                                  ...next[idx],
                                  productId: prod.id,
                                  productName: prod.name,
                                  unit: prod.unit,
                                  value: next[idx].quantity * (prod.costPrice || 0),
                                };
                                setDirectItems(next);
                              }
                            }}
                            className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs text-white"
                          >
                            {products.map((p) => (
                              <option key={p.id} value={p.id}>
                                {p.name}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div className="col-span-3">
                          <input
                            type="number"
                            min="0"
                            step="any"
                            value={item.quantity}
                            onChange={(e) => {
                              const qty = Math.max(0, Number(e.target.value));
                              const prod = products.find((p) => p.id === item.productId);
                              const next = [...directItems];
                              next[idx] = {
                                ...next[idx],
                                quantity: qty,
                                value: round2(qty * (prod?.costPrice || 0)),
                              };
                              setDirectItems(next);
                            }}
                            className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs text-white font-mono"
                          />
                        </div>
                        <div className="col-span-3">
                          <input
                            type="number"
                            step="any"
                            value={item.value}
                            onChange={(e) => {
                              const val = Number(e.target.value);
                              const next = [...directItems];
                              next[idx] = { ...next[idx], value: val };
                              setDirectItems(next);
                            }}
                            className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs text-purple-300 font-mono font-bold"
                          />
                        </div>
                        <div className="col-span-1 text-center">
                          <button
                            type="button"
                            onClick={() => setDirectItems(directItems.filter((_, i) => i !== idx))}
                            className="text-slate-500 hover:text-rose-400 p-1"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                    <button
                      type="button"
                      onClick={() => {
                        if (products.length > 0) {
                          setDirectItems([
                            ...directItems,
                            {
                              productId: products[0].id,
                              productName: products[0].name,
                              quantity: 1,
                              unit: products[0].unit,
                              value: products[0].costPrice || 0,
                              reason: 'Expired Product (মেয়াদোত্তীর্ণ)',
                            },
                          ]);
                        }
                      }}
                      className="text-xs text-purple-400 hover:text-purple-300 font-bold flex items-center gap-1 cursor-pointer pt-1"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>{language === 'bn' ? '+ আরেকটি পণ্য যোগ করুন' : '+ Add Item'}</span>
                    </button>
                  </div>
                )}
              </div>

              {/* Adjust Supplier Ledger Checkbox */}
              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                <label className="flex items-start gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={adjustLedger}
                    onChange={(e) => setAdjustLedger(e.target.checked)}
                    className="mt-0.5 rounded border-slate-700 text-purple-600 focus:ring-purple-500"
                  />
                  <div>
                    <span className="text-xs font-bold text-white block">
                      {language === 'bn'
                        ? 'সাপ্লায়ারের বকেয়া খাতা থেকে এই মূল্য বিয়োগ করুন'
                        : 'Adjust Supplier Accounts Payable (Deduct from Due)'}
                    </span>
                    <span className="text-[10px] text-slate-400">
                      {language === 'bn'
                        ? 'কোম্পানি রিটার্ন গ্রহণ করলে আমাদের সরবরাহকারীর দেনা স্বয়ংক্রিয়ভাবে কমে যাবে।'
                        : 'Automatically deduct return total from supplier accounts payable ledger.'}
                    </span>
                  </div>
                </label>
              </div>

              {/* Notes */}
              <div>
                <label className="text-[10px] uppercase font-bold text-slate-400">{t.notes}</label>
                <input
                  type="text"
                  placeholder="Notes, representative name, transporter..."
                  value={dispatchNotes}
                  onChange={(e) => setDispatchNotes(e.target.value)}
                  className="w-full mt-1 bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-purple-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsCompanyDispatchModalOpen(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-xl"
                >
                  {t.cancel}
                </button>
                <button
                  type="button"
                  onClick={handleConfirmCompanyDispatch}
                  className="px-5 py-2 bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold rounded-xl shadow-lg transition active:scale-95 cursor-pointer flex items-center gap-1.5"
                >
                  <Send className="w-4 h-4" />
                  <span>{language === 'bn' ? 'চালান নিশ্চিত করুন' : 'Confirm Dispatch'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Claim Confirmation Modal */}
      {deletingClaim && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-rose-500/50 rounded-2xl w-full max-w-sm p-4 space-y-3 shadow-2xl text-white">
            <div className="flex items-center gap-2.5 text-rose-400">
              <AlertTriangle className="w-5 h-5" />
              <h4 className="font-bold text-sm text-white">
                {language === 'bn' ? 'নষ্ট পণ্যের এন্ট্রি মুছবেন?' : 'Delete Return Claim?'}
              </h4>
            </div>
            <p className="text-xs text-slate-300">
              {deletingClaim.productName} ({deletingClaim.quantity} {deletingClaim.unit}) - {deletingClaim.partyName}
            </p>
            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => setDeletingClaim(null)}
                className="flex-1 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold"
              >
                {t.cancel}
              </button>
              <button
                type="button"
                onClick={() => {
                  deleteReplacementClaim(deletingClaim.id);
                  setDeletingClaim(null);
                }}
                className="flex-1 py-1.5 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1 shadow cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>{language === 'bn' ? 'হ্যাঁ, মুছুন' : 'Yes, Delete'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Company Challan Confirmation Modal */}
      {deletingChallan && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-rose-500/50 rounded-2xl w-full max-w-sm p-4 space-y-3 shadow-2xl text-white">
            <div className="flex items-center gap-2.5 text-rose-400">
              <AlertTriangle className="w-5 h-5" />
              <h4 className="font-bold text-sm text-white">
                {language === 'bn' ? 'কোম্পানি রিটার্ন চালান মুছবেন?' : 'Delete Company Challan?'}
              </h4>
            </div>
            <p className="text-xs text-slate-300">
              চালান নং: <strong className="font-mono text-white">#{deletingChallan.challanNo}</strong> ({deletingChallan.supplierName})
            </p>
            <p className="text-[11px] text-rose-300">
              {language === 'bn'
                ? 'এটি মুছলে চালানটি মুছে যাবে এবং প্রয়োজনবোধে সাপ্লায়ারের বকেয়া খাতা পুনরায় আগের অবস্থায় ফেরত যাবে।'
                : 'This will remove the challan and revert supplier ledger adjustment.'}
            </p>
            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => setDeletingChallan(null)}
                className="flex-1 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold"
              >
                {t.cancel}
              </button>
              <button
                type="button"
                onClick={() => {
                  deleteCompanyReturn(deletingChallan.id, true);
                  setDeletingChallan(null);
                }}
                className="flex-1 py-1.5 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1 shadow cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>{language === 'bn' ? 'হ্যাঁ, মুছুন' : 'Yes, Delete'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Photo Replacement Multi-Entry Inbox Modal */}
      <PhotoProductEntryModal
        isOpen={isPhotoInboxOpen}
        onClose={() => setIsPhotoInboxOpen(false)}
        mode="REPLACEMENT"
        onAddReplacementClaims={(entries) => {
          let count = 0;
          entries.forEach((entry) => {
            const prod = products.find((p) => p.id === entry.productId);
            const ret = retailers.find((r) => r.id === entry.partyId) || retailers[0];
            const partyName = ret ? `${ret.shopName} (${ret.ownerName})` : (entry.partyName || 'Retailer');
            const unitPrice = prod?.wholesalePrice || 0;
            const estimatedVal = entry.quantity * unitPrice;

            addReplacementClaim({
              partyType: 'RETAILER',
              partyId: entry.partyId || ret?.id || `id_${Date.now()}`,
              partyName,
              productId: entry.productId,
              productName: entry.productName,
              quantity: entry.quantity,
              unit: prod?.unit || 'pcs',
              reason: entry.reason || 'Damage / Return (ছবিসহ ফেরত)',
              estimatedValue: estimatedVal,
              photoUrl: entry.photoUrl || prod?.image || undefined,
              notes: entry.notes || (language === 'bn' ? 'ছবি ইনবক্স থেকে এন্ট্রি' : 'Entry from Photo Inbox'),
              date: getTodayDateString(),
            });
            count++;
          });

          setSuccessNotice(
            language === 'bn'
              ? `ছবি ইনবক্স থেকে ${count}টি রিপ্লেসমেন্ট ফেরত সফলভাবে এন্ট্রি হয়েছে!`
              : `${count} replacement claims recorded from Photo Inbox!`
          );
          setTimeout(() => setSuccessNotice(null), 5000);
        }}
      />

      {/* Company Replacement Scan, Photo & Khata Memo Modal */}
      <CompanyReplacementMemoModal
        isOpen={isCompanyMemoModalOpen}
        onClose={() => setIsCompanyMemoModalOpen(false)}
        onSuccess={(challanNo, totalVal) => {
          setSuccessNotice(
            language === 'bn'
              ? `কোম্পানি রিটার্ন চালান #${challanNo} সফলভাবে তৈরি হয়েছে! স্টক থেকে মাইনাস এবং কোম্পানির বকেয়া দেনা থেকে ${formatCurrency(totalVal, 'bn')} মাইনাস করা হয়েছে।`
              : `Company return challan #${challanNo} recorded! Stock deducted & ${formatCurrency(totalVal, 'en')} reduced from company payable.`
          );
          setTimeout(() => setSuccessNotice(null), 6000);
        }}
      />

      {/* Fullscreen Photo Lightbox Modal */}
      {viewingPhoto && (
        <div
          className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4"
          onClick={() => setViewingPhoto(null)}
        >
          <div
            className="relative max-w-2xl w-full max-h-[90vh] flex flex-col items-center"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setViewingPhoto(null)}
              className="absolute -top-10 right-0 p-1.5 rounded-full bg-slate-800 text-white hover:bg-slate-700 transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
            <img
              src={viewingPhoto}
              alt="Enlarged view"
              className="max-w-full max-h-[80vh] rounded-2xl object-contain border border-slate-700 shadow-2xl"
            />
          </div>
        </div>
      )}
    </div>
  );
};
