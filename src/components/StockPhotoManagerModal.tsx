import React, { useState, useRef, useEffect } from 'react';
import { useWholesale } from '../context/WholesaleContext';
import { Product } from '../types';
import { translations, formatCurrency } from '../utils/translations';
import { compressImage } from '../utils/imageCompression';
import {
  Camera,
  Upload,
  X,
  Check,
  Package,
  Search,
  RefreshCw,
  Image as ImageIcon,
  CheckCircle2,
  ChevronRight,
  Sparkles,
  Layers,
  Trash2,
  AlertCircle
} from 'lucide-react';

interface StockPhotoManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetProductId?: string | null;
}

export const StockPhotoManagerModal: React.FC<StockPhotoManagerModalProps> = ({
  isOpen,
  onClose,
  targetProductId,
}) => {
  const { language, products, updateProduct, showNotification } = useWholesale();
  const t = translations[language];

  const [searchQuery, setSearchQuery] = useState<string>('');
  const [filterMissingOnly, setFilterMissingOnly] = useState<boolean>(true);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

  // Camera & Image Capture
  const [isCameraActive, setIsCameraActive] = useState<boolean>(false);
  const [cameraFacing, setCameraFacing] = useState<'environment' | 'user'>('environment');
  const [capturedPhoto, setCapturedPhoto] = useState<string | null>(null);
  const [isCompressing, setIsCompressing] = useState<boolean>(false);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Initialize selected product when opened or when targetProductId changes
  useEffect(() => {
    if (isOpen) {
      if (targetProductId) {
        const found = products.find((p) => p.id === targetProductId);
        if (found) {
          setSelectedProduct(found);
          setFilterMissingOnly(false);
          startCamera('environment');
          return;
        }
      }
      // Default to first product without photo if available
      const missingPhotoProduct = products.find((p) => !p.image);
      setSelectedProduct(missingPhotoProduct || products[0] || null);
    } else {
      stopCamera();
    }
  }, [isOpen, targetProductId]);

  // Filtered products list
  const filteredProducts = products.filter((p) => {
    if (filterMissingOnly && p.image) return false;
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      p.name.toLowerCase().includes(q) ||
      (p.sku && p.sku.toLowerCase().includes(q)) ||
      (p.brand && p.brand.toLowerCase().includes(q)) ||
      (p.category && p.category.toLowerCase().includes(q))
    );
  });

  const missingPhotoCount = products.filter((p) => !p.image).length;

  const startCamera = async (facing: 'environment' | 'user' = cameraFacing) => {
    try {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
      setIsCameraActive(true);
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: facing,
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
    } catch (err) {
      console.warn('Camera failed to start:', err);
      setIsCameraActive(false);
      fileInputRef.current?.click();
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

  const handleSnapPhoto = async () => {
    if (!videoRef.current) return;
    try {
      setIsCompressing(true);
      const video = videoRef.current;
      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth || 640;
      canvas.height = video.videoHeight || 480;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.82);
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

  // Save photo to selected product and auto-advance to next product without photo
  const handleSavePhotoToProduct = () => {
    if (!selectedProduct || !capturedPhoto) return;

    const updated: Product = {
      ...selectedProduct,
      image: capturedPhoto,
    };

    updateProduct(updated);

    showNotification(
      language === 'bn'
        ? `"${selectedProduct.name}" পণ্যের ছবি সফলভাবে সেভ করা হয়েছে!`
        : `Photo successfully saved for "${selectedProduct.name}"!`
    );

    // Find next product without photo to make batch work effortless
    const nextMissing = products.find(
      (p) => p.id !== selectedProduct.id && !p.image
    );

    if (nextMissing) {
      setSelectedProduct(nextMissing);
      setCapturedPhoto(null);
      startCamera();
    } else {
      setCapturedPhoto(null);
      setSelectedProduct(null);
    }
  };

  const handleRemovePhoto = (prod: Product) => {
    updateProduct({ ...prod, image: '' });
    if (selectedProduct?.id === prod.id) {
      setSelectedProduct({ ...prod, image: '' });
      setCapturedPhoto(null);
    }
    showNotification(
      language === 'bn'
        ? `"${prod.name}"-এর ছবি মুছে ফেলা হয়েছে`
        : `Removed photo for "${prod.name}"`
    );
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-700/80 rounded-2xl w-full max-w-4xl max-h-[92vh] flex flex-col shadow-2xl text-white overflow-hidden animate-in fade-in">
        
        {/* HEADER */}
        <div className="px-4 py-3.5 border-b border-slate-800 bg-slate-950 flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-md">
              <Camera className="w-4 h-4 text-white" />
            </div>
            <div>
              <h3 className="font-bold text-sm sm:text-base flex items-center gap-2">
                <span>
                  {language === 'bn'
                    ? 'স্টক পণ্যের ছবি ম্যানেজার (কুইক ফটো এন্ট্রি)'
                    : 'Stock Product Photo Manager'}
                </span>
                {missingPhotoCount > 0 ? (
                  <span className="text-[11px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 font-semibold">
                    {language === 'bn'
                      ? `${missingPhotoCount} টি পণ্যে ছবি নেই`
                      : `${missingPhotoCount} Missing Photos`}
                  </span>
                ) : (
                  <span className="text-[11px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-semibold">
                    {language === 'bn' ? 'সব পণ্যে ছবি আছে' : 'All Have Photos'}
                  </span>
                )}
              </h3>
              <p className="text-[11px] text-slate-400">
                {language === 'bn'
                  ? 'স্টকে থাকা পণ্যের ছবি তুলে বা আপলোড করে এক ক্লিকে যুক্ত করুন — সেলসে ছবি দিয়ে সহজে বিক্রি করতে পারবেন'
                  : 'Capture or upload photos for in-stock products to enable one-click photo selling'}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              stopCamera();
              onClose();
            }}
            className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* BODY */}
        <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 overflow-y-auto divide-y lg:divide-y-0 lg:divide-x divide-slate-800">
          
          {/* LEFT: PRODUCT LIST PICKER (5 Cols) */}
          <div className="lg:col-span-5 p-3.5 space-y-3 overflow-y-auto bg-slate-950/40">
            {/* Filter & Search */}
            <div className="space-y-2">
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder={
                    language === 'bn'
                      ? 'স্টক পণ্য সার্চ করুন...'
                      : 'Search stock products...'
                  }
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setFilterMissingOnly(true)}
                  className={`flex-1 py-1 px-2 rounded-lg text-[11px] font-bold transition flex items-center justify-center gap-1 cursor-pointer ${
                    filterMissingOnly
                      ? 'bg-amber-600/30 text-amber-300 border border-amber-500/50'
                      : 'bg-slate-900 text-slate-400 border border-slate-800 hover:text-white'
                  }`}
                >
                  <AlertCircle className="w-3 h-3" />
                  <span>{language === 'bn' ? 'ছবি ছাড়া পণ্য' : 'Missing Only'} ({missingPhotoCount})</span>
                </button>
                <button
                  type="button"
                  onClick={() => setFilterMissingOnly(false)}
                  className={`flex-1 py-1 px-2 rounded-lg text-[11px] font-bold transition flex items-center justify-center gap-1 cursor-pointer ${
                    !filterMissingOnly
                      ? 'bg-emerald-600/30 text-emerald-300 border border-emerald-500/50'
                      : 'bg-slate-900 text-slate-400 border border-slate-800 hover:text-white'
                  }`}
                >
                  <Layers className="w-3 h-3" />
                  <span>{language === 'bn' ? 'সকল পণ্য' : 'All Products'} ({products.length})</span>
                </button>
              </div>
            </div>

            {/* List */}
            <div className="space-y-1.5 max-h-[55vh] overflow-y-auto pr-1">
              {filteredProducts.length === 0 ? (
                <div className="p-6 text-center text-slate-500 text-xs">
                  <CheckCircle2 className="w-8 h-8 mx-auto mb-2 text-emerald-500/60" />
                  <span>
                    {language === 'bn'
                      ? 'কোনো পণ্য পাওয়া যায়নি বা সব পণ্যের ছবি রয়েছে!'
                      : 'No products found or all items have photos!'}
                  </span>
                </div>
              ) : (
                filteredProducts.map((p) => {
                  const isSelected = selectedProduct?.id === p.id;
                  return (
                    <div
                      key={p.id}
                      onClick={() => {
                        setSelectedProduct(p);
                        setCapturedPhoto(null);
                        startCamera();
                      }}
                      className={`p-2.5 rounded-xl border flex items-center justify-between gap-2.5 cursor-pointer transition text-xs ${
                        isSelected
                          ? 'bg-emerald-950/70 border-emerald-500 text-white shadow-sm'
                          : 'bg-slate-900/80 border-slate-800 hover:border-slate-700 text-slate-300'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0 flex-1">
                        {p.image ? (
                          <img
                            src={p.image}
                            alt={p.name}
                            className="w-10 h-10 rounded-lg object-cover shrink-0 border border-emerald-500/50"
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-lg bg-slate-800 border border-slate-700 flex flex-col items-center justify-center text-slate-500 shrink-0">
                            <ImageIcon className="w-4 h-4 text-amber-400" />
                            <span className="text-[8px] text-amber-300/80">ছবি নেই</span>
                          </div>
                        )}

                        <div className="min-w-0 flex-1">
                          <div className="font-bold truncate">{p.name}</div>
                          <div className="text-[10px] text-slate-400 truncate">
                            {p.brand} • স্টক: <span className="text-white font-semibold">{p.stockQuantity} {p.unit}</span>
                          </div>
                          <div className="text-[10px] text-emerald-400 font-mono">
                            {formatCurrency(p.wholesalePrice, language)}
                          </div>
                        </div>
                      </div>

                      {isSelected ? (
                        <div className="w-6 h-6 rounded-full bg-emerald-500 text-slate-950 flex items-center justify-center shrink-0">
                          <Check className="w-3.5 h-3.5 stroke-[3]" />
                        </div>
                      ) : (
                        <ChevronRight className="w-4 h-4 text-slate-600 shrink-0" />
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* RIGHT: CAMERA & SNAP VIEWER (7 Cols) */}
          <div className="lg:col-span-7 p-4 space-y-3.5 overflow-y-auto flex flex-col justify-between">
            {selectedProduct ? (
              <div className="space-y-3.5">
                {/* Product Detail Card Header */}
                <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-9 h-9 rounded-lg bg-emerald-950/80 border border-emerald-500/40 flex items-center justify-center shrink-0 text-emerald-400">
                      <Package className="w-5 h-5" />
                    </div>
                    <div className="min-w-0">
                      <h4 className="font-bold text-xs sm:text-sm text-white truncate">
                        {selectedProduct.name}
                      </h4>
                      <div className="text-[11px] text-slate-400">
                        {selectedProduct.brand} • SKU: {selectedProduct.sku} • স্টক: {selectedProduct.stockQuantity} {selectedProduct.unit}
                      </div>
                    </div>
                  </div>

                  {selectedProduct.image && (
                    <button
                      type="button"
                      onClick={() => handleRemovePhoto(selectedProduct)}
                      className="px-2 py-1 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 rounded-lg text-[10px] font-semibold border border-rose-500/30 flex items-center gap-1 cursor-pointer shrink-0"
                    >
                      <Trash2 className="w-3 h-3" />
                      <span>{language === 'bn' ? 'ছবি মুছুন' : 'Remove'}</span>
                    </button>
                  )}
                </div>

                {/* Camera / Preview Area */}
                <div className="p-3 bg-slate-950 border border-slate-800 rounded-2xl space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                      <Camera className="w-4 h-4 text-emerald-400" />
                      <span>{language === 'bn' ? 'ছবি তুলুন বা বাছাই করুন' : 'Capture or Select Photo'}</span>
                    </span>

                    {isCameraActive && (
                      <button
                        type="button"
                        onClick={() => {
                          const next = cameraFacing === 'environment' ? 'user' : 'environment';
                          setCameraFacing(next);
                          startCamera(next);
                        }}
                        className="text-[10px] text-slate-400 hover:text-white flex items-center gap-1 bg-slate-900 px-2 py-1 rounded-lg border border-slate-800 cursor-pointer"
                      >
                        <RefreshCw className="w-3 h-3" />
                        <span>{language === 'bn' ? 'ক্যামেরা ঘোরান' : 'Switch Camera'}</span>
                      </button>
                    )}
                  </div>

                  {/* Live Camera View */}
                  {isCameraActive ? (
                    <div className="relative rounded-xl overflow-hidden bg-black aspect-video flex items-center justify-center border border-emerald-500/40 shadow-inner">
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
                          onClick={handleSnapPhoto}
                          disabled={isCompressing}
                          className="px-5 py-2 rounded-full bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs shadow-xl flex items-center gap-1.5 transition active:scale-95 cursor-pointer"
                        >
                          <Camera className="w-4 h-4" />
                          <span>{isCompressing ? 'প্রসেসিং...' : (language === 'bn' ? 'ছবি তুলুন' : 'Snap Photo')}</span>
                        </button>
                        <button
                          type="button"
                          onClick={stopCamera}
                          className="p-2 rounded-full bg-slate-900/90 text-white text-xs border border-slate-700 hover:bg-slate-800 cursor-pointer"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ) : capturedPhoto ? (
                    /* Captured Photo Preview */
                    <div className="space-y-3">
                      <div className="relative rounded-xl overflow-hidden bg-slate-900 aspect-video flex items-center justify-center border border-emerald-500 shadow-md">
                        <img
                          src={capturedPhoto}
                          alt="Captured preview"
                          className="w-full h-full object-contain"
                        />
                        <div className="absolute top-2 right-2 flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => {
                              setCapturedPhoto(null);
                              startCamera();
                            }}
                            className="p-1.5 rounded-lg bg-slate-900/90 text-white text-xs border border-slate-700 hover:bg-slate-800 cursor-pointer flex items-center gap-1"
                          >
                            <RefreshCw className="w-3.5 h-3.5 text-emerald-400" />
                            <span className="text-[10px]">{language === 'bn' ? 'আবার তুলুন' : 'Retake'}</span>
                          </button>
                        </div>
                      </div>

                      {/* Apply Button */}
                      <button
                        type="button"
                        onClick={handleSavePhotoToProduct}
                        className="w-full py-2.5 px-4 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs sm:text-sm rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-emerald-950/50 transition active:scale-95 cursor-pointer"
                      >
                        <Check className="w-4 h-4 stroke-[3]" />
                        <span>
                          {language === 'bn'
                            ? `এই ছবি "${selectedProduct.name}" পণ্যে যুক্ত করুন`
                            : `Save Photo to "${selectedProduct.name}"`}
                        </span>
                      </button>
                    </div>
                  ) : (
                    /* Initial State: Choose Camera or File */
                    <div className="grid grid-cols-2 gap-2.5">
                      <button
                        type="button"
                        onClick={() => startCamera()}
                        className="p-4 rounded-xl border border-dashed border-emerald-500/50 bg-emerald-950/20 hover:bg-emerald-950/40 flex flex-col items-center justify-center gap-2 transition cursor-pointer group"
                      >
                        <div className="w-10 h-10 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center group-hover:scale-110 transition">
                          <Camera className="w-5 h-5" />
                        </div>
                        <span className="text-xs font-bold text-white group-hover:text-emerald-300">
                          {language === 'bn' ? 'ক্যামেরা চালু করুন' : 'Open Camera'}
                        </span>
                        <span className="text-[10px] text-slate-400 text-center">
                          {language === 'bn' ? 'ডিভাইস ক্যামেরা দিয়ে সরাসরি ছবি তুলুন' : 'Snap live photo'}
                        </span>
                      </button>

                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="p-4 rounded-xl border border-dashed border-sky-500/50 bg-sky-950/20 hover:bg-sky-950/40 flex flex-col items-center justify-center gap-2 transition cursor-pointer group"
                      >
                        <div className="w-10 h-10 rounded-full bg-sky-500/20 text-sky-400 flex items-center justify-center group-hover:scale-110 transition">
                          <Upload className="w-5 h-5" />
                        </div>
                        <span className="text-xs font-bold text-white group-hover:text-sky-300">
                          {language === 'bn' ? 'গ্যালারি / আপলোড' : 'Upload Image'}
                        </span>
                        <span className="text-[10px] text-slate-400 text-center">
                          {language === 'bn' ? 'মেমরি বা ফাইল থেকে ছবি পছন্দ করুন' : 'Pick from gallery'}
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

                {/* Existing Photo Preview if already has photo */}
                {selectedProduct.image && !capturedPhoto && !isCameraActive && (
                  <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl flex items-center gap-3">
                    <img
                      src={selectedProduct.image}
                      alt={selectedProduct.name}
                      className="w-14 h-14 rounded-lg object-cover border border-emerald-500/40 shadow-sm"
                    />
                    <div className="min-w-0 flex-1">
                      <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider block">
                        {language === 'bn' ? 'বর্তমান সক্রিয় ছবি' : 'Current Active Photo'}
                      </span>
                      <p className="text-xs text-slate-300 line-clamp-1">
                        {selectedProduct.name}
                      </p>
                      <p className="text-[10px] text-slate-500">
                        {language === 'bn'
                          ? 'নতুন ছবি তুললে এটি প্রতিস্থাপিত হবে।'
                          : 'Snapping a new photo will replace this.'}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-500">
                <Package className="w-12 h-12 text-slate-600 mb-2" />
                <p className="text-xs font-medium text-slate-400">
                  {language === 'bn'
                    ? 'বাম পাশের তালিকা থেকে একটি পণ্য নির্বাচন করুন।'
                    : 'Select a product from the left list to add a photo.'}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
