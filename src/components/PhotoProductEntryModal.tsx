import React, { useState, useRef, useEffect } from 'react';
import { useWholesale } from '../context/WholesaleContext';
import { Product, Retailer } from '../types';
import { translations, formatCurrency, getTodayDateString } from '../utils/translations';
import { compressImage } from '../utils/imageCompression';
import {
  Camera,
  Upload,
  X,
  Plus,
  Trash2,
  Check,
  RefreshCw,
  Sparkles,
  Package,
  ShoppingCart,
  RotateCcw,
  Minus,
  Search,
  CheckCircle2,
  AlertCircle,
  Image as ImageIcon,
  ChevronRight,
  Layers,
  Store,
  ArrowRight
} from 'lucide-react';

export interface PhotoInboxEntry {
  id: string;
  productId: string;
  productName: string;
  brand?: string;
  unit: string;
  photo: string;
  quantity: number;
  unitPrice: number;
  total: number;
  reason?: string; // For replacement
  notes?: string;
  product: Product;
}

interface PhotoProductEntryModalProps {
  isOpen: boolean;
  onClose: () => void;
  mode: 'SALE' | 'REPLACEMENT';
  initialRetailerId?: string;
  onAddSalesToCart?: (entries: PhotoInboxEntry[]) => void;
  onAddReplacementClaims?: (entries: PhotoInboxEntry[] | any) => void;
}

export const PhotoProductEntryModal: React.FC<PhotoProductEntryModalProps> = ({
  isOpen,
  onClose,
  mode: initialMode,
  initialRetailerId,
  onAddSalesToCart,
}) => {
  const {
    language,
    products,
    retailers,
    addReplacementClaim,
    showNotification,
  } = useWholesale();

  const t = translations[language];

  // Active Mode (Can toggle between Sale and Replacement inside inbox)
  const [activeMode, setActiveMode] = useState<'SALE' | 'REPLACEMENT'>(initialMode);

  // Retailer selection
  const [selectedRetailerId, setSelectedRetailerId] = useState<string>(
    initialRetailerId || (retailers[0]?.id || '')
  );

  // Camera & Image Capture state
  const [isCameraActive, setIsCameraActive] = useState<boolean>(false);
  const [cameraFacing, setCameraFacing] = useState<'environment' | 'user'>('environment');
  const [capturedPhoto, setCapturedPhoto] = useState<string | null>(null);
  const [isCompressing, setIsCompressing] = useState<boolean>(false);

  // Selected Product for Current Snap
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [productSearch, setProductSearch] = useState<string>('');
  const [quantity, setQuantity] = useState<number>(1);
  const [customPrice, setCustomPrice] = useState<number>(0);
  const [reason, setReason] = useState<string>('Expired Product (মেয়াদোত্তীর্ণ)');
  const [notes, setNotes] = useState<string>('');

  // Accumulated Inbox Entries List (Can add multiple times in single session)
  const [inboxEntries, setInboxEntries] = useState<PhotoInboxEntry[]>([]);
  const [isSuccessModal, setIsSuccessModal] = useState<boolean>(false);

  // Refs for video & camera
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Sync mode from props when opened
  useEffect(() => {
    if (isOpen) {
      setActiveMode(initialMode);
      if (initialRetailerId) {
        setSelectedRetailerId(initialRetailerId);
      }
    }
  }, [isOpen, initialMode, initialRetailerId]);

  // Clean up camera on close
  useEffect(() => {
    if (!isOpen && isCameraActive) {
      stopCamera();
    }
  }, [isOpen]);

  const startCamera = async (facing: 'environment' | 'user' = cameraFacing) => {
    try {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
      setIsCameraActive(true);
      const constraints: MediaStreamConstraints = {
        video: {
          facingMode: facing,
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
    } catch (err) {
      console.warn('Camera access denied or unavailable:', err);
      setIsCameraActive(false);
      // If direct camera fails, prompt user to use file input
      if (fileInputRef.current) {
        fileInputRef.current.click();
      }
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setIsCameraActive(false);
  };

  const handleCaptureSnapshot = async () => {
    if (!videoRef.current) return;
    try {
      setIsCompressing(true);
      const video = videoRef.current;
      const canvas = canvasRef.current || document.createElement('canvas');
      canvas.width = video.videoWidth || 640;
      canvas.height = video.videoHeight || 480;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
        const compressed = await compressImage(dataUrl, 640, 640, 0.75);
        setCapturedPhoto(compressed);
      }
    } catch (err) {
      console.error('Snapshot capture error:', err);
    } finally {
      setIsCompressing(false);
      stopCamera();
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setIsCompressing(true);
      const compressed = await compressImage(file, 640, 640, 0.75);
      setCapturedPhoto(compressed);
    } catch (err) {
      console.error('File compression error:', err);
    } finally {
      setIsCompressing(false);
      if (e.target) e.target.value = '';
    }
  };

  // When a product is picked
  const handleSelectProduct = (prod: Product) => {
    setSelectedProduct(prod);
    setCustomPrice(activeMode === 'SALE' ? prod.wholesalePrice : prod.wholesalePrice);
    if (!capturedPhoto && prod.image) {
      setCapturedPhoto(prod.image);
    }
  };

  // Add current item to inbox
  const handleAddCurrentToInbox = () => {
    if (!selectedProduct) {
      showNotification(
        language === 'bn' ? 'অনুগ্রহ করে একটি প্রোডাক্ট নির্বাচন করুন।' : 'Please select a product.'
      );
      return;
    }
    if (quantity < 0) {
      showNotification(
        language === 'bn' ? 'পরিমাণ সঠিক নয়।' : 'Invalid quantity.'
      );
      return;
    }

    const photoToUse = capturedPhoto || selectedProduct.image || '';

    const newEntry: PhotoInboxEntry = {
      id: `inbox_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      productId: selectedProduct.id,
      productName: selectedProduct.name,
      brand: selectedProduct.brand,
      unit: selectedProduct.unit || 'pcs',
      photo: photoToUse,
      quantity,
      unitPrice: customPrice || selectedProduct.wholesalePrice,
      total: quantity * (customPrice || selectedProduct.wholesalePrice),
      reason: activeMode === 'REPLACEMENT' ? reason : undefined,
      notes: notes.trim() || undefined,
      product: selectedProduct,
    };

    setInboxEntries((prev) => [newEntry, ...prev]);

    // Reset current photo & selection for immediate NEXT photo snap
    setCapturedPhoto(null);
    setSelectedProduct(null);
    setQuantity(1);
    setProductSearch('');
    setNotes('');

    showNotification(
      language === 'bn'
        ? `"${selectedProduct.name}" সফলভাবে ইনবক্সে যোগ হয়েছে! আপনি চাইলে আরও ছবি তুলে এন্ট্রি নিতে পারেন।`
        : `"${selectedProduct.name}" added to inbox! You can snap more products.`
    );
  };

  // Remove an entry from inbox
  const handleRemoveEntry = (id: string) => {
    setInboxEntries((prev) => prev.filter((e) => e.id !== id));
  };

  // Update entry quantity in inbox
  const handleUpdateEntryQty = (id: string, newQty: number) => {
    if (newQty <= 0) {
      handleRemoveEntry(id);
      return;
    }
    setInboxEntries((prev) =>
      prev.map((e) =>
        e.id === id ? { ...e, quantity: newQty, total: newQty * e.unitPrice } : e
      )
    );
  };

  // Submit all accumulated inbox entries
  const handleFinalizeInbox = () => {
    if (inboxEntries.length === 0) {
      showNotification(
        language === 'bn'
          ? 'ইনবক্সে কোনো এন্ট্রি নেই। আগে অন্তত একটি প্রোডাক্টের ছবি ও তথ্য যোগ করুন।'
          : 'Inbox is empty. Please add at least one product.'
      );
      return;
    }

    if (activeMode === 'SALE') {
      if (onAddSalesToCart) {
        onAddSalesToCart(inboxEntries);
      }
      showNotification(
        language === 'bn'
          ? `সফলভাবে ${inboxEntries.length} টি আলাদা সেলস এন্ট্রি মেমোতে যুক্ত হয়েছে!`
          : `Successfully transferred ${inboxEntries.length} sales entries to cart!`
      );
      setInboxEntries([]);
      onClose();
    } else {
      // REPLACEMENT mode: Create claims for each entry
      const r = retailers.find((item) => item.id === selectedRetailerId);
      const partyName = r ? `${r.shopName || r.name} (${r.phone})` : 'Retailer Market';

      inboxEntries.forEach((entry) => {
        addReplacementClaim({
          partyType: 'RETAILER',
          partyId: selectedRetailerId || `id_${Date.now()}`,
          partyName,
          productId: entry.productId,
          productName: entry.productName,
          quantity: entry.quantity,
          unit: entry.unit,
          reason: entry.reason || 'Expired Product (মেয়াদোত্তীর্ণ)',
          estimatedValue: entry.total,
          photoUrl: entry.photo || entry.product.image || '',
          notes: entry.notes || 'Photo replacement entry from inbox',
          date: getTodayDateString(),
        });
      });

      showNotification(
        language === 'bn'
          ? `সফলভাবে ${inboxEntries.length} টি আলাদা রিপ্লেসমেন্ট ক্লেইম সেভ করা হয়েছে!`
          : `Successfully saved ${inboxEntries.length} replacement claims!`
      );
      setInboxEntries([]);
      onClose();
    }
  };

  if (!isOpen) return null;

  const totalInboxAmount = inboxEntries.reduce((sum, item) => sum + item.total, 0);
  const totalInboxQty = inboxEntries.reduce((sum, item) => sum + item.quantity, 0);

  // Filtered products for quick picker
  const filteredProducts = products.filter((p) => {
    if (!productSearch.trim()) return true;
    const q = productSearch.toLowerCase();
    return (
      p.name.toLowerCase().includes(q) ||
      (p.sku && p.sku.toLowerCase().includes(q)) ||
      (p.brand && p.brand.toLowerCase().includes(q))
    );
  });

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-700/80 rounded-2xl w-full max-w-4xl max-h-[92vh] flex flex-col shadow-2xl text-white overflow-hidden animate-in fade-in">
        
        {/* MODAL HEADER */}
        <div className="px-4 py-3.5 border-b border-slate-800 bg-slate-950 flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-md">
              <Camera className="w-4 h-4 text-white" />
            </div>
            <div>
              <h3 className="font-bold text-sm sm:text-base flex items-center gap-2">
                <span>
                  {language === 'bn'
                    ? 'ছবি দিয়ে মাল্টি-এন্ট্রি ইনবক্স'
                    : 'Photo Multi-Entry Inbox'}
                </span>
                <span className="text-[11px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-semibold">
                  {activeMode === 'SALE'
                    ? (language === 'bn' ? 'বিক্রয় (POS)' : 'Sales')
                    : (language === 'bn' ? 'রিপ্লেসমেন্ট' : 'Replacement')}
                </span>
              </h3>
              <p className="text-[11px] text-slate-400">
                {language === 'bn'
                  ? 'ছবি তুলে বা ছবি দিয়ে প্রতিবার আলাদা এন্ট্রি নিন — একাধিকবার যুক্ত করুন'
                  : 'Snap/pick photos to take separate entries repeatedly in one inbox'}
              </p>
            </div>
          </div>

          {/* Mode Switch Tabs & Close */}
          <div className="flex items-center gap-2">
            <div className="bg-slate-900 p-1 rounded-xl border border-slate-800 flex items-center gap-1">
              <button
                type="button"
                onClick={() => setActiveMode('SALE')}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                  activeMode === 'SALE'
                    ? 'bg-emerald-600 text-white shadow'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <ShoppingCart className="w-3.5 h-3.5" />
                <span>{language === 'bn' ? 'বিক্রয়' : 'Sale'}</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveMode('REPLACEMENT')}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                  activeMode === 'REPLACEMENT'
                    ? 'bg-amber-600 text-white shadow'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>{language === 'bn' ? 'রিপ্লেসমেন্ট' : 'Replace'}</span>
              </button>
            </div>

            <button
              type="button"
              onClick={() => {
                stopCamera();
                onClose();
              }}
              className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* MAIN BODY: 2 COLUMNS (Left: Camera / Photo Capture & Item Details | Right: Live Inbox Queue) */}
        <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 overflow-y-auto divide-y lg:divide-y-0 lg:divide-x divide-slate-800">
          
          {/* LEFT COLUMN: CAPTURE & SELECT PRODUCT (7 cols) */}
          <div className="lg:col-span-7 p-4 space-y-4 overflow-y-auto">
            
            {/* Retailer Selector for Replacement Mode */}
            {activeMode === 'REPLACEMENT' && (
              <div className="p-2.5 bg-slate-950/80 border border-slate-800 rounded-xl space-y-1">
                <label className="text-[11px] font-bold text-amber-400 flex items-center gap-1.5">
                  <Store className="w-3.5 h-3.5" />
                  <span>{language === 'bn' ? 'রিটেইলার / কাস্টমার নির্বাচন করুন:' : 'Select Retailer / Customer:'}</span>
                </label>
                <select
                  value={selectedRetailerId}
                  onChange={(e) => setSelectedRetailerId(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white font-semibold focus:outline-none focus:border-amber-500"
                >
                  {retailers.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.shopName || r.name} - {r.phone}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* CAMERA & PHOTO CAPTURE ZONE */}
            <div className="p-3 bg-slate-950 border border-slate-800 rounded-2xl space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                  <Camera className="w-4 h-4 text-emerald-400" />
                  <span>{language === 'bn' ? '১. পণ্যের ছবি তুলুন বা আপলোড করুন' : '1. Take or Upload Product Photo'}</span>
                </span>

                {isCameraActive && (
                  <button
                    type="button"
                    onClick={() => {
                      const nextFacing = cameraFacing === 'environment' ? 'user' : 'environment';
                      setCameraFacing(nextFacing);
                      startCamera(nextFacing);
                    }}
                    className="text-[11px] text-emerald-400 hover:text-emerald-300 flex items-center gap-1 bg-slate-900 px-2 py-0.5 rounded-lg border border-slate-700"
                  >
                    <RefreshCw className="w-3 h-3" />
                    <span>{language === 'bn' ? 'ক্যামেরা ঘোরান' : 'Flip Camera'}</span>
                  </button>
                )}
              </div>

              {/* LIVE CAMERA VIEWFINDER */}
              {isCameraActive ? (
                <div className="relative rounded-xl overflow-hidden bg-black aspect-video flex items-center justify-center border border-emerald-500/50 shadow-inner">
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-x-0 bottom-3 flex items-center justify-center gap-3">
                    <button
                      type="button"
                      onClick={handleCaptureSnapshot}
                      disabled={isCompressing}
                      className="px-5 py-2.5 rounded-full bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold text-xs shadow-2xl flex items-center gap-2 border-2 border-white transition active:scale-95 cursor-pointer"
                    >
                      <Camera className="w-4 h-4" />
                      <span>{isCompressing ? 'প্রসেসিং...' : (language === 'bn' ? 'ছবি তুলুন (Snap)' : 'Snap Photo')}</span>
                    </button>
                    <button
                      type="button"
                      onClick={stopCamera}
                      className="p-2 rounded-full bg-slate-900/80 hover:bg-slate-800 text-white text-xs backdrop-blur border border-slate-700"
                      title="Cancel Camera"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ) : capturedPhoto ? (
                /* CAPTURED PHOTO PREVIEW */
                <div className="relative rounded-xl overflow-hidden bg-slate-900 border border-emerald-500/40 p-2 flex items-center gap-3">
                  <img
                    src={capturedPhoto}
                    alt="Captured product"
                    className="w-24 h-24 object-cover rounded-lg border border-slate-700 shadow"
                  />
                  <div className="flex-1 space-y-1 text-xs">
                    <div className="font-bold text-emerald-400 flex items-center gap-1">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                      <span>{language === 'bn' ? 'ছবি রেডি হয়েছে' : 'Photo Captured'}</span>
                    </div>
                    <p className="text-[11px] text-slate-400">
                      {language === 'bn'
                        ? 'নিচে প্রোডাক্ট ও পরিমাণ নিশ্চিত করে ইনবক্সে যোগ করুন।'
                        : 'Select product and quantity below to add to inbox.'}
                    </p>
                    <div className="flex items-center gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => startCamera('environment')}
                        className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-[11px] font-semibold flex items-center gap-1"
                      >
                        <Camera className="w-3 h-3 text-emerald-400" />
                        <span>{language === 'bn' ? 'পুনরায় তুলুন' : 'Retake'}</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setCapturedPhoto(null)}
                        className="px-2.5 py-1 bg-rose-900/30 hover:bg-rose-900/50 text-rose-300 rounded-lg text-[11px] font-semibold flex items-center gap-1 border border-rose-700/40"
                      >
                        <Trash2 className="w-3 h-3" />
                        <span>{language === 'bn' ? 'মুছুন' : 'Remove'}</span>
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                /* CAPTURE BUTTONS */
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => startCamera('environment')}
                    className="p-4 rounded-xl bg-slate-900 hover:bg-slate-850 border border-slate-800 hover:border-emerald-500/50 transition flex flex-col items-center justify-center gap-2 text-center group cursor-pointer"
                  >
                    <div className="w-10 h-10 rounded-full bg-emerald-500/20 group-hover:bg-emerald-500/30 text-emerald-400 flex items-center justify-center transition">
                      <Camera className="w-5 h-5" />
                    </div>
                    <span className="text-xs font-bold text-white group-hover:text-emerald-300">
                      {language === 'bn' ? 'ক্যামেরা চালু করুন' : 'Open Camera'}
                    </span>
                    <span className="text-[10px] text-slate-500">
                      {language === 'bn' ? 'লাইভ ছবি তুলতে ক্লিক করুন' : 'Snap photo in live camera'}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="p-4 rounded-xl bg-slate-900 hover:bg-slate-850 border border-slate-800 hover:border-sky-500/50 transition flex flex-col items-center justify-center gap-2 text-center group cursor-pointer"
                  >
                    <div className="w-10 h-10 rounded-full bg-sky-500/20 group-hover:bg-sky-500/30 text-sky-400 flex items-center justify-center transition">
                      <Upload className="w-5 h-5" />
                    </div>
                    <span className="text-xs font-bold text-white group-hover:text-sky-300">
                      {language === 'bn' ? 'গ্যালারি / ফাইল থেকে' : 'Upload from File'}
                    </span>
                    <span className="text-[10px] text-slate-500">
                      {language === 'bn' ? 'মোবাইল বা পিসি থেকে ছবি বাছাই' : 'Pick existing image'}
                    </span>
                  </button>

                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                </div>
              )}
            </div>

            {/* PRODUCT MATCHING & SELECTION */}
            <div className="p-3 bg-slate-950 border border-slate-800 rounded-2xl space-y-3">
              <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                <Package className="w-4 h-4 text-emerald-400" />
                <span>{language === 'bn' ? '২. প্রোডাক্ট নির্বাচন করুন' : '2. Select Product Details'}</span>
              </span>

              {/* Search Bar */}
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder={
                    language === 'bn'
                      ? 'প্রোডাক্টের নাম বা মডেল খুঁজুন...'
                      : 'Search product name or SKU...'
                  }
                  value={productSearch}
                  onChange={(e) => setProductSearch(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                />
              </div>

              {/* Quick Visual Chips of Products */}
              <div className="max-h-36 overflow-y-auto space-y-1 pr-1">
                {filteredProducts.slice(0, 15).map((p) => {
                  const isSelected = selectedProduct?.id === p.id;
                  return (
                    <div
                      key={p.id}
                      onClick={() => handleSelectProduct(p)}
                      className={`p-2 rounded-xl border flex items-center justify-between gap-2.5 cursor-pointer transition text-xs ${
                        isSelected
                          ? 'bg-emerald-950/60 border-emerald-500 text-white shadow-sm'
                          : 'bg-slate-900/80 border-slate-800 hover:border-slate-700 text-slate-300'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        {p.image ? (
                          <img
                            src={p.image}
                            alt={p.name}
                            className="w-8 h-8 rounded-lg object-cover shrink-0 border border-slate-700"
                          />
                        ) : (
                          <div className="w-8 h-8 rounded-lg bg-slate-800 flex items-center justify-center shrink-0 text-slate-500">
                            <ImageIcon className="w-4 h-4" />
                          </div>
                        )}
                        <div className="min-w-0">
                          <div className="font-bold truncate">{p.name}</div>
                          <div className="text-[10px] text-slate-400 truncate">
                            {p.brand} • স্টক: {p.stockQuantity} {p.unit}
                          </div>
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <div className="font-mono font-bold text-emerald-400">
                          {formatCurrency(p.wholesalePrice, language)}
                        </div>
                        {isSelected && (
                          <span className="text-[10px] text-emerald-300 flex items-center gap-0.5 justify-end">
                            <Check className="w-3 h-3" /> সিলেক্টেড
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* QUANTITY & RATE ADJUSTMENT FOR THIS SNAP */}
              {selectedProduct && (
                <div className="p-3 bg-slate-900/90 rounded-xl border border-slate-800 space-y-2.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-white truncate max-w-[200px]">
                      {selectedProduct.name}
                    </span>
                    <span className="text-emerald-400 font-bold font-mono">
                      {formatCurrency(customPrice || selectedProduct.wholesalePrice, language)} / {selectedProduct.unit}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs">
                    {/* Quantity */}
                    <div className="space-y-1">
                      <label className="text-[11px] text-slate-400 block font-medium">
                        {language === 'bn' ? 'পরিমাণ (Qty)' : 'Quantity'}:
                      </label>
                      <div className="flex items-center bg-slate-950 border border-slate-700 rounded-lg p-1">
                        <button
                          type="button"
                          onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                          className="p-1 text-slate-400 hover:text-white"
                        >
                          <Minus className="w-3.5 h-3.5" />
                        </button>
                        <input
                          type="number"
                          min="0"
                          step="any"
                          value={quantity}
                          onChange={(e) => setQuantity(e.target.value === '' ? 0 : Math.max(0, Number(e.target.value)))}
                          className="w-full bg-transparent text-center font-bold text-white focus:outline-none"
                        />
                        <button
                          type="button"
                          onClick={() => setQuantity((q) => q + 1)}
                          className="p-1 text-slate-400 hover:text-white"
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Price / Rate */}
                    <div className="space-y-1">
                      <label className="text-[11px] text-slate-400 block font-medium">
                        {language === 'bn' ? 'দর / রেট' : 'Rate'}:
                      </label>
                      <input
                        type="number"
                        min="0"
                        step="any"
                        value={customPrice || ''}
                        onChange={(e) => setCustomPrice(parseFloat(e.target.value) || 0)}
                        placeholder="0.00"
                        className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white font-mono font-bold focus:outline-none focus:border-emerald-500"
                      />
                    </div>
                  </div>

                  {/* Replacement reason */}
                  {activeMode === 'REPLACEMENT' && (
                    <div className="space-y-1 text-xs">
                      <label className="text-[11px] text-slate-400 block font-medium">
                        {language === 'bn' ? 'ফেরতের কারণ' : 'Return Reason'}:
                      </label>
                      <select
                        value={reason}
                        onChange={(e) => setReason(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white focus:outline-none focus:border-amber-500"
                      >
                        <option value="Expired Product (মেয়াদোত্তীর্ণ)">Expired Product (মেয়াদোত্তীর্ণ)</option>
                        <option value="Damaged Packaging (প্যাকেট নষ্ট)">Damaged Packaging (প্যাকেট নষ্ট)</option>
                        <option value="Manufacturing Defect (উৎপাদন ত্রুটি)">Manufacturing Defect (উৎপাদন ত্রুটি)</option>
                        <option value="Leakage / Broken (ভাঙা বা লিক)">Leakage / Broken (ভাঙা বা লিক)</option>
                        <option value="Wrong Item Delivered (ভুল পণ্য সরবরাহ)">Wrong Item Delivered (ভুল পণ্য সরবরাহ)</option>
                      </select>
                    </div>
                  )}

                  {/* ADD TO INBOX BUTTON */}
                  <button
                    type="button"
                    onClick={handleAddCurrentToInbox}
                    className="w-full py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-extrabold text-xs flex items-center justify-center gap-2 shadow-lg transition active:scale-95 cursor-pointer"
                  >
                    <Plus className="w-4 h-4" />
                    <span>
                      {language === 'bn'
                        ? 'ইনবক্সে এন্ট্রি যুক্ত করুন (+) [একাধিকবার যোগ করতে পারবেন]'
                        : 'Add this Entry to Inbox (+)'}
                    </span>
                  </button>
                </div>
              )}
            </div>

          </div>

          {/* RIGHT COLUMN: ACCUMULATED INBOX ENTRIES QUEUE (5 cols) */}
          <div className="lg:col-span-5 p-4 flex flex-col justify-between bg-slate-950/60 overflow-y-auto">
            <div className="space-y-3">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
                <div className="flex items-center gap-2">
                  <Layers className="w-4 h-4 text-emerald-400" />
                  <h4 className="font-bold text-xs text-white">
                    {language === 'bn' ? 'চলতি ইনবক্স তালিকা' : 'Current Inbox Queue'}
                  </h4>
                </div>
                <span className="text-[11px] px-2 py-0.5 rounded-full bg-slate-800 text-emerald-400 font-mono font-bold">
                  {inboxEntries.length} {language === 'bn' ? 'টি এন্ট্রি' : 'items'}
                </span>
              </div>

              {/* Entries list */}
              {inboxEntries.length === 0 ? (
                <div className="py-12 text-center space-y-2 border border-dashed border-slate-800 rounded-2xl p-4">
                  <Camera className="w-8 h-8 text-slate-600 mx-auto" />
                  <p className="text-xs font-bold text-slate-400">
                    {language === 'bn'
                      ? 'ইনবক্স এখনও খালি রয়েছে'
                      : 'Inbox is currently empty'}
                  </p>
                  <p className="text-[11px] text-slate-500 max-w-xs mx-auto">
                    {language === 'bn'
                      ? 'বামপাশ থেকে ছবি তুলুন এবং প্রোডাক্ট সিলেক্ট করে "ইনবক্সে এন্ট্রি যুক্ত করুন" এ চাপ দিন। এটি বারবার করতে পারেন।'
                      : 'Snap photo & select product to add separate entries repeatedly.'}
                  </p>
                </div>
              ) : (
                <div className="space-y-2 max-h-[380px] overflow-y-auto pr-1">
                  {inboxEntries.map((entry, idx) => (
                    <div
                      key={entry.id}
                      className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-700 transition flex items-center justify-between gap-2.5"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span className="text-[10px] font-mono text-slate-500 w-4 text-center">
                          #{idx + 1}
                        </span>

                        {entry.photo ? (
                          <img
                            src={entry.photo}
                            alt={entry.productName}
                            className="w-10 h-10 rounded-lg object-cover shrink-0 border border-emerald-500/40"
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-lg bg-slate-800 flex items-center justify-center shrink-0 text-slate-500">
                            <ImageIcon className="w-5 h-5" />
                          </div>
                        )}

                        <div className="min-w-0">
                          <h5 className="font-bold text-xs text-white truncate">
                            {entry.productName}
                          </h5>
                          <div className="text-[10px] text-slate-400 flex items-center gap-1 mt-0.5">
                            <span className="font-mono text-emerald-400 font-bold">
                              {formatCurrency(entry.unitPrice, language)}
                            </span>
                            <span>×</span>
                            <span className="text-white font-bold">{entry.quantity} {entry.unit}</span>
                          </div>
                          {entry.reason && (
                            <div className="text-[9px] text-amber-400 truncate mt-0.5">
                              ⚠️ {entry.reason}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Line total & controls */}
                      <div className="flex items-center gap-2 shrink-0">
                        <div className="text-right">
                          <div className="font-mono font-bold text-xs text-white">
                            {formatCurrency(entry.total, language)}
                          </div>
                          <div className="flex items-center gap-1 mt-1 justify-end">
                            <button
                              type="button"
                              onClick={() => handleUpdateEntryQty(entry.id, entry.quantity - 1)}
                              className="w-5 h-5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center justify-center"
                            >
                              -
                            </button>
                            <span className="text-[11px] font-bold font-mono px-1">
                              {entry.quantity}
                            </span>
                            <button
                              type="button"
                              onClick={() => handleUpdateEntryQty(entry.id, entry.quantity + 1)}
                              className="w-5 h-5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center justify-center"
                            >
                              +
                            </button>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleRemoveEntry(entry.id)}
                          className="p-1 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-950/40 transition"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* INBOX SUMMARY & FINAL ACTION */}
            <div className="pt-3 border-t border-slate-800 space-y-3 mt-3">
              <div className="p-2.5 bg-slate-900 rounded-xl border border-slate-800 flex items-center justify-between text-xs">
                <div>
                  <span className="text-slate-400 block text-[11px]">
                    {language === 'bn' ? 'মোট আইটেম / পরিমাণ:' : 'Total Qty:'}
                  </span>
                  <span className="font-bold text-white">
                    {inboxEntries.length} {language === 'bn' ? 'টি আইটেম' : 'items'} ({totalInboxQty} pcs)
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-slate-400 block text-[11px]">
                    {language === 'bn' ? 'সর্বমোট মূল্য:' : 'Grand Total:'}
                  </span>
                  <span className="font-mono font-extrabold text-sm text-emerald-400">
                    {formatCurrency(totalInboxAmount, language)}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    stopCamera();
                    onClose();
                  }}
                  className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs transition"
                >
                  {t.cancel}
                </button>

                <button
                  type="button"
                  onClick={handleFinalizeInbox}
                  disabled={inboxEntries.length === 0}
                  className={`flex-1 py-2.5 rounded-xl font-extrabold text-xs flex items-center justify-center gap-2 shadow-xl transition active:scale-95 cursor-pointer ${
                    inboxEntries.length === 0
                      ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                      : activeMode === 'SALE'
                      ? 'bg-emerald-600 hover:bg-emerald-500 text-white'
                      : 'bg-amber-600 hover:bg-amber-500 text-white'
                  }`}
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>
                    {activeMode === 'SALE'
                      ? (language === 'bn'
                          ? `সবগুলো এন্ট্রি বিক্রয় মেমোতে নিন (${inboxEntries.length})`
                          : `Transfer all to Sales Invoice (${inboxEntries.length})`)
                      : (language === 'bn'
                          ? `সবগুলো রিপ্লেসমেন্ট সেভ করুন (${inboxEntries.length})`
                          : `Save all Replacement Claims (${inboxEntries.length})`)}
                  </span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

          </div>

        </div>

      </div>
    </div>
  );
};
