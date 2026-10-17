import React, { useState, useRef, useEffect } from 'react';
import { useWholesale } from '../context/WholesaleContext';
import { translations, formatCurrency, getTodayDateString, round2 } from '../utils/translations';
import { areProductNamesEquivalent, normalizeProductKey } from '../utils/productDeduplication';
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
  Building2,
  Calendar,
  Receipt,
  Layers,
  ArrowRight,
  RefreshCw,
  Smartphone,
  Edit3,
  Image as ImageIcon,
  Check,
  ChevronRight,
  Phone,
  Eye,
  ShoppingCart,
  Store,
  TrendingDown,
  TrendingUp,
  Banknote,
  MinusCircle,
  Package,
  User,
  ShoppingBag,
} from 'lucide-react';

interface ScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const WHOLESALE_CATEGORIES = [
  { id: 'Battery', labelBn: 'ব্যাটারি (Battery)', labelEn: 'Battery', icon: '🔋' },
  { id: 'Charger', labelBn: 'চার্জার (Charger)', labelEn: 'Charger', icon: '🔌' },
  { id: 'Cable', labelBn: 'ক্যাবল (Cable)', labelEn: 'Cable', icon: '⚡' },
  { id: 'Headphone', labelBn: 'হেডফোন / বাডস', labelEn: 'Headphone / Earbuds', icon: '🎧' },
  { id: 'Display / Touch', labelBn: 'ডিসপ্লে / টাচ', labelEn: 'Display / Touch', icon: '📱' },
  { id: 'Speaker', labelBn: 'স্পিকার (Speaker)', labelEn: 'Speaker', icon: '🔊' },
  { id: 'Power Bank', labelBn: 'পাওয়ার ব্যাংক', labelEn: 'Power Bank', icon: '🔋' },
  { id: 'Casing / Cover', labelBn: 'কেসিং ও কভার', labelEn: 'Casing & Cover', icon: '🛡️' },
  { id: 'Glass Protector', labelBn: 'গ্লাস প্রটেক্টর', labelEn: 'Glass Protector', icon: '🪟' },
  { id: 'Spare Parts', labelBn: 'স্পেয়ার পার্টস', labelEn: 'Spare Parts', icon: '⚙️' },
  { id: 'Accessories', labelBn: 'এক্সেসরিজ', labelEn: 'Accessories', icon: '📦' },
  { id: 'Grocery / Food', labelBn: 'মুদি ও খাদ্য', labelEn: 'Grocery / Food', icon: '🛒' },
  { id: 'Beverages', labelBn: 'পানীয় ও বেভারেজ', labelEn: 'Beverages', icon: '🧃' },
  { id: 'General Wholesale', labelBn: 'সাধারণ পণ্য', labelEn: 'General Wholesale', icon: '🏷️' },
];

export const ScannerModal: React.FC<ScannerModalProps> = ({ isOpen, onClose }) => {
  const {
    language,
    currentUser,
    addSupplierPurchaseFromScan,
    addSaleFromScan,
    suppliers,
    supplierLedger,
    products,
    retailers,
  } = useWholesale();
  const t = translations[language];

  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isPhotoExpanded, setIsPhotoExpanded] = useState<boolean>(false);
  const [isScanning, setIsScanning] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [warningMsg, setWarningMsg] = useState<string | null>(null);
  const [extractedResult, setExtractedResult] = useState<any | null>(null);
  const [isCameraActive, setIsCameraActive] = useState<boolean>(false);
  const [cameraFacing, setCameraFacing] = useState<'environment' | 'user'>('environment');
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [isDuplicateConfirmOpen, setIsDuplicateConfirmOpen] = useState<boolean>(false);
  const [docMode, setDocMode] = useState<'AUTO' | 'SALE' | 'PURCHASE'>('AUTO');
  const [saveSuccessInfo, setSaveSuccessInfo] = useState<{
    type: 'SALE' | 'PURCHASE';
    title: string;
    message: string;
    orderNo?: string;
    items?: Array<{ name: string; quantity: number; remainingStock?: number }>;
  } | null>(null);

  // Supplier & Customer dropdown vs new selection states
  const [isNewSupplierMode, setIsNewSupplierMode] = useState<boolean>(false);
  const [selectedSupplierId, setSelectedSupplierId] = useState<string>('');
  const [isNewCustomerMode, setIsNewCustomerMode] = useState<boolean>(false);
  const [selectedRetailerId, setSelectedRetailerId] = useState<string>('');

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const nativeCameraInputRef = useRef<HTMLInputElement | null>(null);

  // Stop camera on unmount or close
  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

  // Listen for Clipboard Paste (Ctrl+V) when modal is open
  useEffect(() => {
    if (!isOpen) return;

    const handlePaste = (e: ClipboardEvent) => {
      if (e.clipboardData && e.clipboardData.files.length > 0) {
        const file = e.clipboardData.files[0];
        if (file.type.startsWith('image/')) {
          e.preventDefault();
          compressAndProcessFile(file);
        }
      }
    };

    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, [isOpen]);

  // Compress large smartphone image before upload with high clarity
  const compressAndProcessFile = (file: File) => {
    setErrorMsg(null);
    setWarningMsg(null);
    setIsScanning(true);

    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const maxDimension = 2048;
        let width = img.width;
        let height = img.height;

        if (width > maxDimension || height > maxDimension) {
          if (width > height) {
            height = Math.round((height * maxDimension) / width);
            width = maxDimension;
          } else {
            width = Math.round((width * maxDimension) / height);
            height = maxDimension;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.92);
          setImagePreview(compressedDataUrl);
          stopCamera();
          processReceiptWithGemini(compressedDataUrl);
        } else {
          const rawUrl = e.target?.result as string;
          setImagePreview(rawUrl);
          stopCamera();
          processReceiptWithGemini(rawUrl);
        }
      };
      img.onerror = () => {
        setIsScanning(false);
        setErrorMsg(
          language === 'bn'
            ? 'ছবিটি লোড করা সম্ভব হয়নি। অনুগ্রহ করে অন্য ছবি নির্বাচন করুন।'
            : 'Failed to load the selected image file. Please try another image.'
        );
      };
      img.src = e.target?.result as string;
    };
    reader.onerror = () => {
      setIsScanning(false);
      setErrorMsg(
        language === 'bn'
          ? 'ফাইল পড়তে সমস্যা হয়েছে। অনুগ্রহ করে আবার চেষ্টা করুন।'
          : 'Failed to read file from device.'
      );
    };
    reader.readAsDataURL(file);
  };

  // Start Camera with multi-tier progressive fallback
  const startCamera = async (targetFacing: 'environment' | 'user' = cameraFacing) => {
    setErrorMsg(null);
    setWarningMsg(null);
    stopCamera();

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setErrorMsg(
        language === 'bn'
          ? 'আপনার ব্রাউজারে সরাসরি লাইভ ক্যামেরা চালু করা যায়নি। অনুগ্রহ করে "মোবাইল ক্যামেরা ছবি" বা "ফাইল আপলোড" বাটন ব্যবহার করুন।'
          : 'Webcam stream is not accessible in this context. Please use "Mobile Camera Snap" or "Upload Image".'
      );
      return;
    }

    try {
      // 1. First attempt: target facing mode with ideal resolution
      let stream: MediaStream | null = null;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { ideal: targetFacing },
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
          audio: false,
        });
      } catch {
        // 2. Second attempt: basic facing mode
        try {
          stream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: targetFacing },
            audio: false,
          });
        } catch {
          // 3. Third attempt: any available video input
          stream = await navigator.mediaDevices.getUserMedia({
            video: true,
            audio: false,
          });
        }
      }

      if (stream) {
        streamRef.current = stream;
        setIsCameraActive(true);
        setCameraFacing(targetFacing);

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play().catch(() => {});
        }
      }
    } catch (err: any) {
      console.warn('Camera stream error:', err);
      setIsCameraActive(false);
      setErrorMsg(
        language === 'bn'
          ? 'ক্যামেরা চালু করতে ডিভাইসের অনুমতি প্রয়োজন। অথবা নিচের "মোবাইল ক্যামেরা ছবি" বা "ফাইল আপলোড" বাটন দিয়ে অনায়াসে ছবি তুলতে পারেন।'
          : 'Camera permission denied or camera device in use. You can easily use "Native Mobile Camera" or "Upload Image" instead.'
      );
    }
  };

  // Sync stream to video element when isCameraActive changes
  useEffect(() => {
    if (isCameraActive && videoRef.current && streamRef.current) {
      videoRef.current.srcObject = streamRef.current;
      videoRef.current.play().catch((err) => {
        console.warn('Video play sync error:', err);
      });
    }
  }, [isCameraActive]);

  // Toggle Front / Back Camera
  const toggleCameraFacing = () => {
    const nextFacing = cameraFacing === 'environment' ? 'user' : 'environment';
    startCamera(nextFacing);
  };

  // Stop Camera
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

  // Capture photo from live camera stream
  const capturePhoto = () => {
    if (!videoRef.current || !canvasRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;

    const width = video.videoWidth || 1280;
    const height = video.videoHeight || 720;
    canvas.width = width;
    canvas.height = height;

    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.drawImage(video, 0, 0, width, height);
      const dataUrl = canvas.toDataURL('image/jpeg', 0.90);
      setImagePreview(dataUrl);
      stopCamera();
      processReceiptWithGemini(dataUrl, false);
    }
  };

  // Handle local file selection
  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      compressAndProcessFile(file);
    }
    e.target.value = '';
  };

  // Handle Drag & Drop
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      if (file.type.startsWith('image/')) {
        compressAndProcessFile(file);
      }
    }
  };

  // Initialize Manual Invoice Entry without scanning (Purchase or Sale)
  const handleStartManualEntry = (forcedMode?: 'SALE' | 'PURCHASE') => {
    stopCamera();
    setImagePreview(null);
    setErrorMsg(null);
    setWarningMsg(null);
    const targetMode = forcedMode || (docMode === 'SALE' ? 'SALE' : 'PURCHASE');
    if (forcedMode) {
      setDocMode(forcedMode);
    }
    const isSale = targetMode === 'SALE';
    const nowStr = getTodayDateString();
    const randomMemo = isSale
      ? `SALE-${Math.floor(100000 + Math.random() * 900000)}`
      : `PUR-${Math.floor(100000 + Math.random() * 900000)}`;

    setIsNewSupplierMode(suppliers.length === 0);
    setSelectedSupplierId('');
    setIsNewCustomerMode(retailers.length === 0);
    setSelectedRetailerId('');

    setExtractedResult({
      docType: targetMode,
      supplierName: '',
      supplierContact: '',
      customerName: '',
      retailerName: '',
      retailerPhone: '',
      retailerId: '',
      invoiceNumber: randomMemo,
      previousDoNo: '',
      previousDoDate: '',
      invoiceDate: nowStr,
      items: [
        {
          name: '',
          sku: `SKU-${Date.now().toString().slice(-4)}`,
          category: 'General Wholesale',
          quantity: 1,
          unit: 'Pcs',
          costPrice: 0,
          suggestedRetailPrice: 0,
          totalPrice: 0,
        },
      ],
      subtotal: 0,
      discount: 0,
      tax: 0,
      totalAmount: 0,
      paidAmount: 0,
      dueAmount: 0,
      paymentStatus: 'Unpaid',
      paymentMethod: isSale ? 'Cash' : 'Credit',
      notes: isSale ? 'ম্যানুয়াল বিক্রয় মেমো এন্ট্রি' : 'ম্যানুয়াল ক্রয় চালান এন্ট্রি',
    });
  };

  // Demo sample bills removed for fresh app
  const loadSampleBill = (_type?: string) => {
    return;
    /* disabled */;
  };

  const _disabledSampleBill = (type: string = '', ctx: any = {}, currentTodayDate: string = '', canvas: any = {}) => {

    if (type === 'PRAN') {
      ctx.fillText('PRAN-RFL FOODS WHOLESALE DEPOT', 40, 60);
      ctx.font = '14px sans-serif';
      ctx.fillStyle = '#475569';
      ctx.fillText('Wholesale Supply Challan & Delivery Memo', 40, 85);
      ctx.fillText(`Invoice No: PINV-PRAN-9924 | Date: ${currentTodayDate}`, 40, 110);
      ctx.fillText('Distributor Phone: +880 1713-001122 | Dhaka Depot', 40, 130);

      ctx.strokeStyle = '#cbd5e1';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(40, 150);
      ctx.lineTo(720, 150);
      ctx.stroke();

      ctx.fillStyle = '#0f172a';
      ctx.font = 'bold 15px sans-serif';
      ctx.fillText('Item Description', 40, 180);
      ctx.fillText('Qty', 400, 180);
      ctx.fillText('Cost Rate', 480, 180);
      ctx.fillText('Total BDT', 610, 180);

      ctx.font = '14px sans-serif';
      ctx.fillStyle = '#334155';
      ctx.fillText('1. PRAN Frooto Mango Juice 1L (12 Ctn)', 40, 220);
      ctx.fillText('20 Ctn', 400, 220);
      ctx.fillText('৳ 660', 480, 220);
      ctx.fillText('৳ 13,200', 610, 220);

      ctx.fillText('2. PRAN Potata Spicy Crackers 100g (60s)', 40, 260);
      ctx.fillText('15 Box', 400, 260);
      ctx.fillText('৳ 1,050', 480, 260);
      ctx.fillText('৳ 15,750', 610, 260);

      ctx.fillText('3. PRAN Litchi Drink 250ml Pack', 40, 300);
      ctx.fillText('30 Box', 400, 300);
      ctx.fillText('৳ 380', 480, 300);
      ctx.fillText('৳ 11,400', 610, 300);

      ctx.strokeStyle = '#cbd5e1';
      ctx.beginPath();
      ctx.moveTo(40, 340);
      ctx.lineTo(720, 340);
      ctx.stroke();

      ctx.font = 'bold 16px sans-serif';
      ctx.fillStyle = '#0f172a';
      ctx.fillText('Grand Total Payable:', 400, 380);
      ctx.fillText('৳ 40,350', 610, 380);
    } else if (type === 'RADHUNI') {
      ctx.fillText('SQUARE TOILETRIES & SPICES DEPOT', 40, 60);
      ctx.font = '14px sans-serif';
      ctx.fillStyle = '#475569';
      ctx.fillText('Official Wholesale Supply Challan', 40, 85);
      ctx.fillText(`Memo No: SQ-BILL-7712 | Date: ${currentTodayDate}`, 40, 110);
      ctx.fillText('Contact: +880 1817-554433', 40, 130);

      ctx.strokeStyle = '#cbd5e1';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(40, 150);
      ctx.lineTo(720, 150);
      ctx.stroke();

      ctx.fillStyle = '#0f172a';
      ctx.font = 'bold 15px sans-serif';
      ctx.fillText('Product Item', 40, 180);
      ctx.fillText('Qty', 400, 180);
      ctx.fillText('Cost', 480, 180);
      ctx.fillText('Total', 610, 180);

      ctx.font = '14px sans-serif';
      ctx.fillStyle = '#334155';
      ctx.fillText('1. Radhuni Pure Chilli Powder 200g Box', 40, 220);
      ctx.fillText('10 Box', 400, 220);
      ctx.fillText('৳ 1,920', 480, 220);
      ctx.fillText('৳ 19,200', 610, 220);

      ctx.fillText('2. Radhuni Pure Mustard Oil 1L (12s)', 40, 260);
      ctx.fillText('8 Ctn', 400, 260);
      ctx.fillText('৳ 3,240', 480, 260);
      ctx.fillText('৳ 25,920', 610, 260);

      ctx.strokeStyle = '#cbd5e1';
      ctx.beginPath();
      ctx.moveTo(40, 310);
      ctx.lineTo(720, 310);
      ctx.stroke();

      ctx.font = 'bold 16px sans-serif';
      ctx.fillStyle = '#0f172a';
      ctx.fillText('Net Invoice Amount:', 400, 350);
      ctx.fillText('৳ 45,120', 610, 350);
    } else if (type === 'UNILEVER') {
      ctx.fillText('UNILEVER BANGLADESH DEPOT', 40, 60);
      ctx.font = '14px sans-serif';
      ctx.fillStyle = '#475569';
      ctx.fillText('Direct Delivery Memo | Invoice # UBL-88102', 40, 85);
      ctx.fillText(`Date: ${currentTodayDate} | Phone: +880 1714-889900`, 40, 110);

      ctx.strokeStyle = '#cbd5e1';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(40, 140);
      ctx.lineTo(720, 140);
      ctx.stroke();

      ctx.font = '14px sans-serif';
      ctx.fillStyle = '#334155';
      ctx.fillText('1. Lux Velvet Glow Soap 100g (Bundle 48)', 40, 190);
      ctx.fillText('12 Bundle', 400, 190);
      ctx.fillText('৳ 2,160', 480, 190);
      ctx.fillText('৳ 25,920', 610, 190);

      ctx.fillText('2. Sunsilk Black Shine Shampoo 350ml', 40, 230);
      ctx.fillText('6 Ctn', 400, 230);
      ctx.fillText('৳ 4,100', 480, 230);
      ctx.fillText('৳ 24,600', 610, 230);

      ctx.font = 'bold 16px sans-serif';
      ctx.fillStyle = '#0f172a';
      ctx.fillText('Total Payable:', 400, 300);
      ctx.fillText('৳ 50,520', 610, 300);
    } else if (type === 'ACI') {
      ctx.fillText('ACI CONSUMER FOODS & AGRO DEPOT', 40, 60);
      ctx.font = '14px sans-serif';
      ctx.fillStyle = '#475569';
      ctx.fillText('Official Wholesale Supply Challan # ACI-9042', 40, 85);
      ctx.fillText(`Date: ${currentTodayDate} | Phone: +880 1912-776655`, 40, 110);

      ctx.strokeStyle = '#cbd5e1';
      ctx.beginPath();
      ctx.moveTo(40, 140);
      ctx.lineTo(720, 140);
      ctx.stroke();

      ctx.font = '14px sans-serif';
      ctx.fillStyle = '#334155';
      ctx.fillText('1. ACI Pure Salt 1kg Packet (25s Bag)', 40, 190);
      ctx.fillText('20 Bag', 400, 190);
      ctx.fillText('৳ 850', 480, 190);
      ctx.fillText('৳ 17,000', 610, 190);

      ctx.fillText('2. ACI Pure Aromatic Chinigura Rice 1kg (20s)', 40, 230);
      ctx.fillText('10 Ctn', 400, 230);
      ctx.fillText('৳ 2,600', 480, 230);
      ctx.fillText('৳ 26,000', 610, 230);

      ctx.font = 'bold 16px sans-serif';
      ctx.fillStyle = '#0f172a';
      ctx.fillText('Total Payable:', 400, 300);
      ctx.fillText('৳ 43,000', 610, 300);
    } else {
      ctx.fillText('FRESH (MEGHNA GROUP) WHOLESALE HUB', 40, 60);
      ctx.font = '14px sans-serif';
      ctx.fillStyle = '#475569';
      ctx.fillText('Delivery Challan & Invoice # MGI-FRESH-551', 40, 85);
      ctx.fillText(`Date: ${currentTodayDate} | Phone: +880 1819-332211`, 40, 110);

      ctx.strokeStyle = '#cbd5e1';
      ctx.beginPath();
      ctx.moveTo(40, 140);
      ctx.lineTo(720, 140);
      ctx.stroke();

      ctx.font = '14px sans-serif';
      ctx.fillStyle = '#334155';
      ctx.fillText('1. Fresh Super Premium Soybean Oil 5L (4s)', 40, 190);
      ctx.fillText('15 Ctn', 400, 190);
      ctx.fillText('৳ 3,450', 480, 190);
      ctx.fillText('৳ 51,750', 610, 190);

      ctx.fillText('2. Fresh Refined Sugar 1kg (25s Bag)', 40, 230);
      ctx.fillText('12 Bag', 400, 230);
      ctx.fillText('৳ 3,250', 480, 230);
      ctx.fillText('৳ 39,000', 610, 230);

      ctx.font = 'bold 16px sans-serif';
      ctx.fillStyle = '#0f172a';
      ctx.fillText('Total Payable:', 400, 300);
      ctx.fillText('৳ 90,750', 610, 300);
    }

    const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
    setImagePreview(dataUrl);
    processReceiptWithGemini(dataUrl, true);
  };

  // Call server-side scanner with accurate OCR
  const processReceiptWithGemini = async (base64Img: string, isSampleTest: boolean = false) => {
    setIsScanning(true);
    setErrorMsg(null);
    setWarningMsg(null);
    setExtractedResult(null);

    try {
      const res = await fetch('/api/scan-receipt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageBase64: base64Img,
          mimeType: 'image/jpeg',
          isSampleTest,
          expectedDocType: docMode !== 'AUTO' ? docMode : undefined,
        }),
      });

      if (!res.ok) {
        const errText = await res.text().catch(() => '');
        let msg = '';
        try {
          const errObj = JSON.parse(errText);
          msg = errObj.error || errObj.message;
        } catch {
          msg = errText;
        }
        throw new Error(msg || `Server returned ${res.status}`);
      }

      const text = await res.text();
      let json: any;
      try {
        json = JSON.parse(text);
      } catch (parseErr) {
        throw new Error('Invalid response from OCR server');
      }
      if (json.warning) {
        setWarningMsg(json.warning);
      }

      if (json.data && Array.isArray(json.data.items) && json.data.items.length > 0) {
        // Guarantee invoiceDate is automatically set to a valid YYYY-MM-DD date immediately
        const safeDate = json.data.invoiceDate && /^\d{4}-\d{2}-\d{2}$/.test(json.data.invoiceDate)
          ? json.data.invoiceDate
          : getTodayDateString();

        if (json.data.docType === 'SALE') {
          setDocMode('SALE');
          const rName = (json.data.retailerName || json.data.customerName || '').trim().toLowerCase();
          const matchedRet = retailers.find(
            (r) =>
              (r.shopName && r.shopName.toLowerCase() === rName) ||
              (r.ownerName && r.ownerName.toLowerCase() === rName) ||
              (json.data.retailerPhone && r.phone === json.data.retailerPhone)
          );
          if (matchedRet) {
            setSelectedRetailerId(matchedRet.id);
            setIsNewCustomerMode(false);
          } else if (rName) {
            setSelectedRetailerId('');
            setIsNewCustomerMode(true);
          } else {
            setSelectedRetailerId('');
            setIsNewCustomerMode(retailers.length === 0);
          }
        } else if (json.data.docType === 'PURCHASE') {
          setDocMode('PURCHASE');
          const sName = (json.data.supplierName || '').trim().toLowerCase();
          const matchedSup = suppliers.find(
            (s) =>
              (s.company && s.company.toLowerCase() === sName) ||
              (s.name && s.name.toLowerCase() === sName) ||
              (json.data.supplierContact && s.phone === json.data.supplierContact)
          );
          if (matchedSup) {
            setSelectedSupplierId(matchedSup.id);
            setIsNewSupplierMode(false);
          } else if (sName) {
            setSelectedSupplierId('');
            setIsNewSupplierMode(true);
          } else {
            setSelectedSupplierId('');
            setIsNewSupplierMode(suppliers.length === 0);
          }
        }

        setExtractedResult({
          ...json.data,
          invoiceDate: safeDate,
        });
      } else {
        throw new Error(json.error || 'Failed to extract invoice data');
      }
    } catch (err: any) {
      console.warn('Scan API fallback:', err);
      setErrorMsg(
        language === 'bn'
          ? 'ছবি থেকে স্বয়ংক্রিয় রিডিং সম্পন্ন করা যায়নি। অনুগ্রহ করে আপনার তোলা ছবি দেখে নিচে সরাসরি পণ্যের নাম ও দর লিখে সেভ করুন।'
          : 'Could not automatically parse text. Please view the photo and enter items below.'
      );
      const nowStr = getTodayDateString();
      if (docMode === 'SALE') {
        setExtractedResult({
          docType: 'SALE',
          customerName: 'খুচরা ক্রেতা',
          retailerName: '',
          retailerPhone: '',
          invoiceNumber: `SM-${Date.now().toString().slice(-6)}`,
          invoiceDate: nowStr,
          items: [
            {
              name: '',
              sku: `SKU-${Date.now().toString().slice(-4)}`,
              category: 'General Wholesale',
              quantity: 1,
              unit: 'Pcs',
              suggestedRetailPrice: 100,
              totalPrice: 100,
            },
          ],
          totalAmount: 100,
          paidAmount: 100,
          dueAmount: 0,
        });
      } else {
        setExtractedResult({
          docType: 'PURCHASE',
          supplierName: '',
          supplierContact: '',
          invoiceNumber: `INV-${Date.now().toString().slice(-6)}`,
          previousDoNo: '',
          previousDoDate: '',
          invoiceDate: nowStr,
          items: [
            {
              name: '',
              sku: `SKU-${Date.now().toString().slice(-4)}`,
              category: 'General Wholesale',
              quantity: 1,
              unit: 'Pcs',
              costPrice: 0,
              suggestedRetailPrice: 0,
              totalPrice: 0,
            },
          ],
          subtotal: 0,
          discount: 0,
          tax: 0,
          totalAmount: 0,
          paymentStatus: 'Unpaid',
          paymentMethod: 'Credit',
          notes: '',
        });
      }
    } finally {
      setIsScanning(false);
    }
  };

  // Add a new empty line item to the scanned list
  const handleAddNewItem = () => {
    if (!extractedResult) return;
    const isSale = (docMode === 'SALE' || extractedResult.docType === 'SALE');
    const newItem = {
      name: language === 'bn' ? 'নতুন পণ্য আইটেম' : 'New Product Item',
      sku: `SKU-${Date.now().toString().slice(-4)}`,
      category: 'General Wholesale',
      quantity: 1,
      unit: 'Pcs',
      costPrice: 100,
      suggestedRetailPrice: isSale ? 120 : 120,
      totalPrice: isSale ? 120 : 100,
    };
    const updatedItems = [...(extractedResult.items || []), newItem];
    const newTotal = updatedItems.reduce((sum, it) => sum + (Number(it.totalPrice) || 0), 0);
    setExtractedResult({
      ...extractedResult,
      items: updatedItems,
      totalAmount: newTotal,
      subtotal: newTotal,
    });
  };

  // Update line item in editor
  const handleUpdateItem = (index: number, field: string, value: any) => {
    if (!extractedResult || !extractedResult.items) return;
    const isSale = (docMode === 'SALE' || extractedResult.docType === 'SALE');
    const updatedItems = [...extractedResult.items];
    updatedItems[index] = {
      ...updatedItems[index],
      [field]: value,
    };

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
        updatedItems[index].name = matched.name;
        updatedItems[index].matchedProductId = matched.id;
        updatedItems[index].sku = matched.sku || updatedItems[index].sku;
        updatedItems[index].unit = matched.unit || updatedItems[index].unit;
        if (!updatedItems[index].costPrice || Number(updatedItems[index].costPrice) === 0) {
          updatedItems[index].costPrice = matched.costPrice || 0;
        }
        if (!updatedItems[index].suggestedRetailPrice || Number(updatedItems[index].suggestedRetailPrice) === 0) {
          updatedItems[index].suggestedRetailPrice = matched.wholesalePrice || matched.mrp || 0;
        }
        const qty = updatedItems[index].quantity !== undefined && !isNaN(Number(updatedItems[index].quantity)) ? Math.max(0, Number(updatedItems[index].quantity)) : 0;
        const rate = isSale
          ? Number(updatedItems[index].suggestedRetailPrice || updatedItems[index].price || updatedItems[index].costPrice || 0)
          : Number(updatedItems[index].costPrice || 0);
        updatedItems[index].totalPrice = qty * rate;
      }
    }

    if (field === 'quantity' || field === 'costPrice' || field === 'suggestedRetailPrice' || field === 'price') {
      const qty = Number(updatedItems[index].quantity || 0);
      const rate = isSale
        ? Number(updatedItems[index].suggestedRetailPrice || updatedItems[index].price || updatedItems[index].costPrice || 0)
        : Number(updatedItems[index].costPrice || 0);
      updatedItems[index].totalPrice = qty * rate;
      if (!isSale && field === 'costPrice' && (!updatedItems[index].suggestedRetailPrice || Number(updatedItems[index].suggestedRetailPrice) === 0)) {
        updatedItems[index].suggestedRetailPrice = Math.round(Number(value || 0) * 1.15);
      }
    }
    const newTotal = updatedItems.reduce((sum, item) => sum + (Number(item.totalPrice) || 0), 0);
    const updatedPaid = isSale ? (extractedResult.paidAmount !== undefined ? extractedResult.paidAmount : newTotal) : extractedResult.paidAmount;
    const updatedDue = isSale ? Math.max(0, newTotal - (Number(updatedPaid) || 0)) : extractedResult.dueAmount;

    setExtractedResult({
      ...extractedResult,
      items: updatedItems,
      totalAmount: newTotal,
      subtotal: newTotal,
      dueAmount: updatedDue,
    });
  };

  // Remove line item
  const handleApplyCategoryToAll = (catId: string) => {
    if (!extractedResult || !extractedResult.items) return;
    const updatedItems = extractedResult.items.map((item: any) => ({
      ...item,
      category: catId,
    }));
    setExtractedResult({
      ...extractedResult,
      items: updatedItems,
    });
  };

  const handleRemoveItem = (index: number) => {
    if (!extractedResult || !extractedResult.items) return;
    const isSale = (docMode === 'SALE' || extractedResult.docType === 'SALE');
    const updatedItems = extractedResult.items.filter((_: any, i: number) => i !== index);
    const newTotal = updatedItems.reduce((sum: number, item: any) => sum + (Number(item.totalPrice) || 0), 0);
    const updatedDue = isSale ? Math.max(0, newTotal - (Number(extractedResult.paidAmount) || 0)) : extractedResult.dueAmount;
    setExtractedResult({
      ...extractedResult,
      items: updatedItems,
      totalAmount: newTotal,
      subtotal: newTotal,
      dueAmount: updatedDue,
    });
  };

  // Save to Inventory & Supplier / Customer Ledger
  const handleSaveToWholesale = () => {
    if (!extractedResult) return;
    const isSale = (docMode === 'SALE' || extractedResult.docType === 'SALE');

    // Duplicate check for supplier purchases
    if (!isSale) {
      const duplicateEntry = supplierLedger.find(
        (entry) =>
          entry.referenceNo &&
          extractedResult.invoiceNumber &&
          entry.referenceNo.trim().toLowerCase() === extractedResult.invoiceNumber.trim().toLowerCase()
      );

      if (duplicateEntry) {
        setIsDuplicateConfirmOpen(true);
        return;
      }
    }

    executeSave();
  };

  const executeSave = () => {
    if (!extractedResult) return;
    const finalDate = extractedResult.invoiceDate && /^\d{4}-\d{2}-\d{2}$/.test(extractedResult.invoiceDate)
      ? extractedResult.invoiceDate
      : getTodayDateString();

    const isSale = (docMode === 'SALE' || extractedResult.docType === 'SALE');

    if (isSale) {
      const saleResult = addSaleFromScan({
        customerName: extractedResult.retailerName || extractedResult.customerName || 'খুচরা ক্রেতা',
        retailerName: extractedResult.retailerName || extractedResult.customerName,
        retailerPhone: extractedResult.retailerPhone,
        retailerId: extractedResult.retailerId,
        invoiceNumber: extractedResult.invoiceNumber || `SM-${Date.now().toString().slice(-6)}`,
        invoiceDate: finalDate,
        items: (extractedResult.items || []).map((it: any) => {
          const q = it.quantity !== undefined && !isNaN(Number(it.quantity)) ? Math.max(0, Number(it.quantity)) : 0;
          const pr = Number(it.suggestedRetailPrice || it.price || it.costPrice || 0);
          return {
            productId: it.matchedProductId || it.productId,
            name: it.name,
            sku: it.sku,
            quantity: q,
            unit: it.unit || 'Pcs',
            costPrice: it.costPrice !== undefined && Number(it.costPrice) > 0 ? Number(it.costPrice) : undefined,
            price: pr,
            totalPrice: it.totalPrice !== undefined && !isNaN(Number(it.totalPrice)) ? Number(it.totalPrice) : (q * pr),
          };
        }),
        totalAmount: Number(extractedResult.totalAmount) || 0,
        paidAmount: Number(extractedResult.paidAmount !== undefined ? extractedResult.paidAmount : extractedResult.totalAmount) || 0,
        dueAmount: Number(extractedResult.dueAmount || 0),
        paymentMethod: Number(extractedResult.dueAmount) > 0 ? 'Credit' : 'Cash',
        notes: (() => {
          const numTotal = Number(extractedResult.totalAmount) || 0;
          const numPaid = Number(extractedResult.paidAmount !== undefined ? extractedResult.paidAmount : numTotal) || 0;
          const diff = numPaid - numTotal;
          let diffNote = '';
          if (diff < 0) {
            diffNote = ` [মেমোতে আদায়: ৳${numPaid}, লস: -৳${Math.abs(diff)}]`;
          } else if (diff > 0) {
            diffNote = ` [মেমোতে আদায়: ৳${numPaid}, লাভ: +৳${diff}]`;
          }
          return `${extractedResult.notes || (extractedResult.isHandwritten ? 'হাতে লেখা খাতা বা সেলস মেমো স্ক্যান' : 'সেলস মেমো এন্ট্রি')}${diffNote}`;
        })(),
        scannedByRole: currentUser.role,
        scannedByName: currentUser.name,
        scannedByPhone: currentUser.phone,
        scannedByUserId: currentUser.id,
      });

      stopCamera();
      setSaveSuccessInfo({
        type: 'SALE',
        title: language === 'bn' ? 'সেলস এন্ট্রি ও স্টক মাইনাস সম্পন্ন!' : 'Sale Recorded & Stock Deducted!',
        message: saleResult.message,
        orderNo: saleResult.order?.invoiceNumber,
        items: (saleResult.order?.items || []).map((it: any) => {
          const p = products.find((prod) => prod.id === it.productId || (prod.name && it.name && prod.name.toLowerCase() === it.name.toLowerCase()));
          return {
            name: it.name,
            quantity: it.quantity,
            remainingStock: p ? p.stockQuantity : undefined,
          };
        }),
      });
      return;
    }

    // Purchase Challan flow
    addSupplierPurchaseFromScan({
      ...extractedResult,
      previousDoNo: (extractedResult.previousDoNo || '').trim(),
      previousDoDate: extractedResult.previousDoDate || '',
      invoiceDate: finalDate,
      scannedByRole: currentUser.role,
      scannedByName: currentUser.name,
      scannedByPhone: currentUser.phone,
      scannedByUserId: currentUser.id,
    });
    stopCamera();
    setSaveSuccessInfo({
      type: 'PURCHASE',
      title: language === 'bn' ? 'সাপ্লাই চালান ও স্টক সংযোজন সম্পন্ন!' : 'Supply Challan & Stock Added!',
      message: language === 'bn' ? 'চালানের পণ্যগুলো ইনভেন্টরি স্টকে যুক্ত করা হয়েছে এবং লেজারে জমা হয়েছে।' : 'Products added to inventory stock and ledger.',
    });
  };

  const handleClose = () => {
    stopCamera();
    setImagePreview(null);
    setExtractedResult(null);
    setSaveSuccessInfo(null);
    setErrorMsg(null);
    setWarningMsg(null);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2.5 sm:p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`bg-slate-900 border ${
          isDragging ? 'border-emerald-400 ring-2 ring-emerald-400/50 scale-[1.01]' : 'border-slate-700'
        } rounded-2xl w-full max-w-2xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden transition-all`}
      >
        {/* Header */}
        <div className="p-3.5 sm:p-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/95">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-amber-500 to-rose-500 flex items-center justify-center shadow-lg shadow-rose-900/30">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <div>
              <h3 className="font-bold text-slate-100 text-sm sm:text-base flex items-center gap-2">
                <span>{t.aiScannerTitle}</span>
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/30">
                  AI OCR + Smart Parser
                </span>
              </h3>
              <p className="text-[11px] text-slate-400">{t.aiScannerSubtitle}</p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Active Scanner Operator Identity Bar */}
        <div className="px-3.5 sm:px-4 py-2 bg-slate-950/90 border-b border-slate-800 flex items-center justify-between gap-2 text-xs flex-wrap">
          <div className="flex items-center gap-2">
            <span className="text-slate-400 font-medium">
              {language === 'bn' ? 'স্ক্যান করছেন:' : 'Scanning as:'}
            </span>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg bg-slate-900 border border-slate-700 shadow-sm">
              {currentUser.role === 'dsr' && (
                <>
                  <span className="text-amber-400 font-bold">🚚 {language === 'bn' ? 'ডিএসআর' : 'DSR'}:</span>
                  <span className="text-white font-bold">{currentUser.name || (language === 'bn' ? 'রাজু আলম' : 'Razo Alom')}</span>
                </>
              )}
              {currentUser.role === 'counter' && (
                <>
                  <span className="text-sky-400 font-bold">🖥️ {language === 'bn' ? 'ক্যাশ কাউন্টার' : 'Cash Counter'}:</span>
                  <span className="text-white font-bold">{currentUser.name || 'কাউন্টার অপারেটর'}</span>
                </>
              )}
              {currentUser.role === 'admin' && (
                <>
                  <span className="text-emerald-400 font-bold">👑 {language === 'bn' ? 'অ্যাডমিন' : 'Admin'}:</span>
                  <span className="text-white font-bold">{currentUser.name || 'মাতৃছায়া টেলিকম'}</span>
                </>
              )}
              {currentUser.role === 'retailer' && (
                <>
                  <span className="text-purple-400 font-bold">🏪 {language === 'bn' ? 'রিটেইলার' : 'Retailer'}:</span>
                  <span className="text-white font-bold">{currentUser.name}</span>
                </>
              )}
            </div>
          </div>
          <span className="text-[11px] text-slate-400 font-medium hidden sm:inline">
            {language === 'bn'
              ? `(চালানটি ${currentUser.role === 'dsr' ? 'ডিএসআর' : currentUser.role === 'counter' ? 'ক্যাশ কাউন্টার' : 'অ্যাডমিন'} হিসেবে নথিবদ্ধ হবে)`
              : `(Recorded under ${currentUser.name})`}
          </span>
        </div>

        {/* Document Mode Selector Bar */}
        <div className="px-3.5 sm:px-4 py-2 bg-slate-900 border-b border-slate-800 flex items-center justify-between gap-2 overflow-x-auto">
          <span className="text-[11px] font-bold text-slate-400 shrink-0">
            {language === 'bn' ? 'স্ক্যান মোড:' : 'Scan Mode:'}
          </span>
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={() => {
                setDocMode('AUTO');
              }}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                docMode === 'AUTO'
                  ? 'bg-amber-500 text-slate-950 shadow'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>{language === 'bn' ? '🤖 অটো সনাক্ত' : 'Auto Detect'}</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setDocMode('SALE');
                if (extractedResult) {
                  setExtractedResult({ ...extractedResult, docType: 'SALE' });
                }
              }}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                docMode === 'SALE'
                  ? 'bg-purple-600 text-white shadow-lg shadow-purple-950/50'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
              }`}
            >
              <ShoppingCart className="w-3.5 h-3.5" />
              <span>{language === 'bn' ? '🛒 সেলস মেমো / খাতা (স্টক মাইনাস)' : 'Sales Memo / Khata (Minus Stock)'}</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setDocMode('PURCHASE');
                if (extractedResult) {
                  setExtractedResult({ ...extractedResult, docType: 'PURCHASE' });
                }
              }}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                docMode === 'PURCHASE'
                  ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-950/50'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
              }`}
            >
              <Package className="w-3.5 h-3.5" />
              <span>{language === 'bn' ? '📦 কোম্পানি চালান (স্টক প্লাস)' : 'Company Supply Challan (Add Stock)'}</span>
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-3.5 sm:p-4 overflow-y-auto space-y-4 flex-1">
          {/* Success Banner if Sale or Purchase was recorded */}
          {saveSuccessInfo && (
            <div className="p-5 rounded-2xl bg-emerald-950/70 border-2 border-emerald-500 text-center space-y-3.5 animate-in zoom-in-95">
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 text-emerald-400 mx-auto flex items-center justify-center border border-emerald-500/40 shadow-lg">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-bold text-white">{saveSuccessInfo.title}</h3>
                <p className="text-xs text-emerald-200">{saveSuccessInfo.message}</p>
                {saveSuccessInfo.orderNo && (
                  <p className="text-xs font-mono text-emerald-300">
                    ইনভয়েস নং: #{saveSuccessInfo.orderNo}
                  </p>
                )}
              </div>
              {saveSuccessInfo.items && saveSuccessInfo.items.length > 0 && (
                <div className="p-3 bg-slate-900/90 rounded-xl border border-emerald-500/30 text-left space-y-2 text-xs max-h-48 overflow-y-auto">
                  <p className="text-[11px] font-bold text-slate-300 flex items-center gap-1.5">
                    {saveSuccessInfo.type === 'SALE' ? (
                      <>
                        <MinusCircle className="w-3.5 h-3.5 text-rose-400" />
                        <span>স্টক থেকে বিয়োগকৃত পণ্যসমূহ:</span>
                      </>
                    ) : (
                      <>
                        <Plus className="w-3.5 h-3.5 text-emerald-400" />
                        <span>স্টকে যুক্ত পণ্যসমূহ:</span>
                      </>
                    )}
                  </p>
                  <div className="space-y-1.5">
                    {saveSuccessInfo.items.map((it: any, idx: number) => (
                      <div key={idx} className="flex items-center justify-between text-[11px] bg-slate-800/80 px-2.5 py-1.5 rounded-lg border border-slate-700/60">
                        <span className="font-semibold text-slate-100">{it.name}</span>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-rose-400">-{it.quantity}</span>
                          {it.remainingStock !== undefined && (
                            <span className="text-[10px] text-emerald-300 bg-slate-950 px-1.5 py-0.5 rounded font-mono">
                              নতুন মজুদ: {it.remainingStock}
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              <div className="flex items-center justify-center gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setSaveSuccessInfo(null);
                    setImagePreview(null);
                    setExtractedResult(null);
                  }}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-bold transition cursor-pointer"
                >
                  {language === 'bn' ? '+ আরেকটি স্ক্যান করুন' : '+ Scan Another'}
                </button>
                <button
                  type="button"
                  onClick={handleClose}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition shadow-lg shadow-emerald-950/50 cursor-pointer"
                >
                  {language === 'bn' ? 'সম্পন্ন ও বন্ধ করুন' : 'Done & Close'}
                </button>
              </div>
            </div>
          )}

          {/* Top Options when no image preview and no camera active and no success */}
          {!saveSuccessInfo && !imagePreview && !isCameraActive && (
            <div className="space-y-3.5">
              {/* Primary 3-Button Action Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                {/* 1. Direct Native Mobile Camera Snap Button */}
                <button
                  type="button"
                  onClick={() => nativeCameraInputRef.current?.click()}
                  id="btn-scan-native-camera"
                  className="p-3.5 rounded-xl border border-dashed border-emerald-500/50 bg-emerald-950/30 hover:bg-emerald-950/60 hover:border-emerald-400 transition-all text-center flex flex-col items-center justify-center gap-1.5 group cursor-pointer shadow-sm"
                >
                  <div className="w-10 h-10 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center group-hover:scale-110 transition">
                    <Smartphone className="w-5 h-5" />
                  </div>
                  <span className="text-xs font-bold text-emerald-300">
                    {language === 'bn' ? 'মোবাইল ক্যামেরা ছবি' : 'Mobile Camera Snap'}
                  </span>
                  <span className="text-[10px] text-slate-400">
                    {language === 'bn' ? 'সরাসরি ফোনের ক্যামেরা চালু' : 'Direct phone camera capture'}
                  </span>
                </button>

                {/* 2. WebCam Live Scanner */}
                <button
                  type="button"
                  onClick={() => startCamera('environment')}
                  id="btn-scan-live-webcam"
                  className="p-3.5 rounded-xl border border-dashed border-amber-500/50 bg-amber-950/30 hover:bg-amber-950/60 hover:border-amber-400 transition-all text-center flex flex-col items-center justify-center gap-1.5 group cursor-pointer shadow-sm"
                >
                  <div className="w-10 h-10 rounded-full bg-amber-500/20 text-amber-400 flex items-center justify-center group-hover:scale-110 transition">
                    <Camera className="w-5 h-5" />
                  </div>
                  <span className="text-xs font-bold text-amber-300">
                    {language === 'bn' ? 'লাইভ ওয়েবক্যাম' : 'Live Webcam'}
                  </span>
                  <span className="text-[10px] text-slate-400">
                    {language === 'bn' ? 'ব্রাউজার ক্যামেরা ভিউ' : 'Interactive video viewfinder'}
                  </span>
                </button>

                {/* 3. Upload File / Gallery */}
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  id="btn-scan-upload"
                  className="p-3.5 rounded-xl border border-dashed border-sky-500/50 bg-sky-950/30 hover:bg-sky-950/60 hover:border-sky-400 transition-all text-center flex flex-col items-center justify-center gap-1.5 group cursor-pointer shadow-sm"
                >
                  <div className="w-10 h-10 rounded-full bg-sky-500/20 text-sky-400 flex items-center justify-center group-hover:scale-110 transition">
                    <Upload className="w-5 h-5" />
                  </div>
                  <span className="text-xs font-bold text-sky-300">{t.uploadFile}</span>
                  <span className="text-[10px] text-slate-400">
                    {language === 'bn' ? 'গ্যালারি বা ড্রপ ফাইল / Ctrl+V' : 'Gallery, drag & drop or Paste'}
                  </span>
                </button>
              </div>

              {/* Hidden Inputs */}
              {/* Native mobile camera capture input */}
              <input
                ref={nativeCameraInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                onChange={handleFileInputChange}
              />

              {/* Standard file upload input */}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleFileInputChange}
              />

              {/* Manual Entry Option Banner */}
              <div className="p-3.5 rounded-xl bg-gradient-to-r from-slate-800 to-indigo-950/60 border border-indigo-500/40 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-md">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-xl bg-indigo-500/20 border border-indigo-500/30 text-indigo-300 flex items-center justify-center shrink-0 shadow-inner">
                    <Edit3 className="w-5 h-5" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs sm:text-sm font-bold text-white flex items-center gap-1.5">
                      <span>{language === 'bn' ? '✍️ ছবি ছাড়া সরাসরি টাইপ করে ইনভয়েস এন্ট্রি' : '✍️ Direct Manual Invoice Entry'}</span>
                      <span className="text-[10px] bg-indigo-500/30 text-indigo-200 px-2 py-0.5 rounded-full border border-indigo-400/40">
                        {language === 'bn' ? 'ক্রয় ও বিক্রয়' : 'Buy & Sell'}
                      </span>
                    </p>
                    <p className="text-[11px] text-slate-300">
                      {language === 'bn'
                        ? 'পণ্যের নাম, কেনা দাম (ক্রয় মূল্য) এবং বিক্রি দাম লিখে সরাসরি ইনভেন্টরি ও লেজারে সেভ করুন'
                        : 'Type product name, cost price and selling price directly into invoice ledger'}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 w-full sm:w-auto shrink-0">
                  <button
                    type="button"
                    onClick={() => handleStartManualEntry('PURCHASE')}
                    id="btn-manual-purchase-entry"
                    className="flex-1 sm:flex-none px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl transition active:scale-95 shadow flex items-center justify-center gap-1.5"
                  >
                    <ShoppingBag className="w-3.5 h-3.5" />
                    <span>{language === 'bn' ? 'ক্রয় চালান টাইপ করুন' : 'Manual Purchase'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleStartManualEntry('SALE')}
                    id="btn-manual-sale-entry"
                    className="flex-1 sm:flex-none px-3.5 py-2 bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs rounded-xl transition active:scale-95 shadow flex items-center justify-center gap-1.5"
                  >
                    <ShoppingCart className="w-3.5 h-3.5" />
                    <span>{language === 'bn' ? 'বিক্রয় মেমো টাইপ করুন' : 'Manual Sale'}</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Active Camera View */}
          {isCameraActive && (
            <div className="space-y-3">
              <div className="relative rounded-xl overflow-hidden bg-black aspect-video border border-slate-700 flex items-center justify-center">
                <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
                <div className="absolute inset-x-8 inset-y-6 border-2 border-emerald-500/70 border-dashed rounded-lg pointer-events-none flex items-center justify-center">
                  <span className="text-[11px] font-semibold bg-black/60 px-2.5 py-1 rounded text-emerald-300 shadow">
                    {language === 'bn' ? 'চালান বা মেমো ফ্রেমের মাঝে রাখুন' : 'Align receipt inside frame'}
                  </span>
                </div>

                {/* Flip camera button */}
                <button
                  type="button"
                  onClick={toggleCameraFacing}
                  className="absolute top-2.5 right-2.5 p-2 rounded-full bg-black/70 hover:bg-black/90 text-white border border-slate-600 transition shadow"
                  title="Switch Front/Rear Camera"
                >
                  <RefreshCw className="w-4 h-4 text-emerald-400" />
                </button>
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={capturePhoto}
                  id="btn-capture-camera-shot"
                  className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs sm:text-sm rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-emerald-900/40 transition active:scale-95"
                >
                  <Camera className="w-4 h-4" />
                  <span>{language === 'bn' ? 'ছবি তুলুন ও স্ক্যান করুন' : 'Capture & Scan Receipt'}</span>
                </button>
                <button
                  type="button"
                  onClick={stopCamera}
                  className="py-2.5 px-4 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs sm:text-sm font-semibold rounded-xl"
                >
                  {t.cancel}
                </button>
              </div>
            </div>
          )}

          <canvas ref={canvasRef} className="hidden" />

          {/* Scanner Loading Spinner */}
          {isScanning && (
            <div className="p-8 rounded-xl bg-slate-800/50 border border-slate-700 text-center space-y-3">
              <div className="relative inline-flex">
                <Loader2 className="w-10 h-10 text-rose-400 animate-spin" />
                <Sparkles className="w-4 h-4 text-amber-300 absolute -top-1 -right-1 animate-ping" />
              </div>
              <h4 className="font-bold text-slate-100 text-sm">{t.scanningReceipt}</h4>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                {language === 'bn'
                  ? 'ইনভয়েস থেকে পণ্যের বিবরণ, কেনা দর, পরিমাণ ও কোম্পানির নাম নিখুঁতভাবে প্রসেস করা হচ্ছে...'
                  : 'Extracting product items, unit cost prices, supplier company, and ledger balances...'}
              </p>
            </div>
          )}

          {/* Error Message */}
          {errorMsg && (
            <div className="p-3.5 rounded-xl bg-rose-950/40 border border-rose-500/40 text-rose-300 text-xs flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-400" />
              <div className="flex-1 space-y-1">
                <p className="font-semibold">{language === 'bn' ? 'স্ক্যানার বার্তা' : 'Scanner Notice'}</p>
                <p className="text-rose-300/90">{errorMsg}</p>
                <div className="flex gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => nativeCameraInputRef.current?.click()}
                    className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-[11px] font-bold"
                  >
                    {language === 'bn' ? 'মোবাইল ক্যামেরা ছবি' : 'Mobile Camera'}
                  </button>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded text-[11px] font-bold border border-slate-600"
                  >
                    {language === 'bn' ? 'ফাইল আপলোড' : 'Upload File'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Warning / Offline Parser notice */}
          {warningMsg && (
            <div className="p-2.5 rounded-xl bg-amber-950/40 border border-amber-500/40 text-amber-300 text-xs flex items-center gap-2">
              <Sparkles className="w-4 h-4 shrink-0 text-amber-400" />
              <span>{warningMsg}</span>
            </div>
          )}

          {/* Extracted Stock Data Results */}
          {extractedResult && !isScanning && (
            <div className="space-y-3.5 animate-in fade-in duration-200">
              <div className="p-3 rounded-xl bg-emerald-950/30 border border-emerald-500/30 flex items-center justify-between">
                <div className="flex items-center gap-2 text-emerald-400 text-xs font-semibold">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{t.extractSuccess}</span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setImagePreview(null);
                    setExtractedResult(null);
                    setErrorMsg(null);
                    setWarningMsg(null);
                  }}
                  className="text-[11px] text-slate-400 hover:text-slate-200 underline"
                >
                  {language === 'bn' ? 'পুনরায় স্ক্যান বা নতুন চালান' : 'Scan another invoice'}
                </button>
              </div>

              {/* Image Preview Thumbnail & Expandable Inspector */}
              {imagePreview && (
                <div className="rounded-xl bg-slate-800/50 border border-slate-700/70 overflow-hidden">
                  <div className="p-2.5 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <img
                        src={imagePreview}
                        alt="Uploaded Invoice"
                        className="w-12 h-12 object-cover rounded-lg border border-slate-600 shrink-0 cursor-pointer hover:opacity-80 transition"
                        onClick={() => setIsPhotoExpanded(!isPhotoExpanded)}
                      />
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-slate-200 truncate flex items-center gap-1.5">
                          <ImageIcon className="w-3.5 h-3.5 text-sky-400" />
                          <span>{language === 'bn' ? 'আপলোড করা চালানের ছবি' : 'Uploaded Invoice Photo'}</span>
                        </p>
                        <p className="text-[10px] text-slate-400">
                          {language === 'bn' ? 'চালানের টেবিল ও সংখ্যার সাথে নিচের এন্ট্রিগুলো মিলিয়ে নিন' : 'Verify extracted table items against your invoice image'}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() => setIsPhotoExpanded(!isPhotoExpanded)}
                        className="px-2 py-1 rounded-md bg-slate-700 hover:bg-slate-600 text-slate-200 text-[11px] font-medium transition flex items-center gap-1"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>{isPhotoExpanded ? (language === 'bn' ? 'ছবি লুকান' : 'Hide Photo') : (language === 'bn' ? 'বড় করে দেখুন' : 'Inspect Photo')}</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          if (imagePreview) {
                            setIsScanning(true);
                            processReceiptWithGemini(imagePreview);
                          }
                        }}
                        className="px-2 py-1 rounded-md bg-sky-500/20 hover:bg-sky-500/30 text-sky-300 border border-sky-500/30 text-[11px] font-medium transition flex items-center gap-1"
                        title="Re-run AI OCR"
                      >
                        <Sparkles className="w-3.5 h-3.5 text-sky-400" />
                        <span>{language === 'bn' ? 'পুনরায় স্ক্যান' : 'Re-scan'}</span>
                      </button>
                    </div>
                  </div>

                  {isPhotoExpanded && (
                    <div className="p-3 border-t border-slate-700/60 bg-slate-950 flex flex-col items-center justify-center">
                      <div className="max-h-[380px] w-full overflow-auto flex items-center justify-center rounded-lg bg-black/40 p-1">
                        <img
                          src={imagePreview}
                          alt="Invoice Full Preview"
                          className="max-w-full max-h-[360px] object-contain rounded shadow-lg"
                        />
                      </div>
                      <p className="mt-1.5 text-[10px] text-slate-400 text-center">
                        {language === 'bn' ? '💡 ছবির প্রতিটি সারি দেখে নিচের তালিকায় নাম, পরিমাণ বা দর প্রয়োজনমতো সংশোধন করুন' : '💡 Review line-by-line and edit quantities or prices in the table below'}
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* Distinct Form Header: Sale vs Purchase */}
              {(() => {
                const isSale = (docMode === 'SALE' || extractedResult.docType === 'SALE');

                if (isSale) {
                  return (
                    <div className="space-y-2.5">
                      {/* Sale Memo Info Banner */}
                      <div className="p-3 rounded-xl bg-purple-950/70 border border-purple-500/50 flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <ShoppingCart className="w-4 h-4 text-purple-400 shrink-0" />
                          <div>
                            <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
                              <span>{language === 'bn' ? 'সেলস মেমো ও খাতার হিসাব' : 'Sales Memo & Ledger Entry'}</span>
                              <span className="text-[10px] bg-purple-500/30 text-purple-200 px-2 py-0.5 rounded-full border border-purple-400/40">
                                {extractedResult.isHandwritten ? '✍️ হাতে লেখা খাতা' : '📄 সেলস মেমো'}
                              </span>
                            </h4>
                            <p className="text-[10px] text-purple-200">
                              {language === 'bn'
                                ? 'এই মেমোর প্রতিটি পণ্য ইনভেন্টরি স্টক থেকে সাথে সাথে বিয়োগ (মাইনাস) হবে।'
                                : 'Each item will be deducted from warehouse inventory upon confirmation.'}
                            </p>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setDocMode('PURCHASE');
                            setExtractedResult({ ...extractedResult, docType: 'PURCHASE' });
                          }}
                          className="text-[10px] px-2 py-1 bg-purple-900/60 hover:bg-purple-800 text-purple-200 rounded-lg border border-purple-600/50 transition cursor-pointer"
                        >
                          {language === 'bn' ? 'চালানে পরিবর্তন' : 'Switch to Purchase'}
                        </button>
                      </div>

                      {/* Sale Header Fields */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 p-3.5 rounded-xl bg-slate-800/70 border border-slate-700">
                        {/* Retailer / Customer Name */}
                        <div>
                          <div className="flex items-center justify-between mb-1">
                            <label className="text-[10px] uppercase font-bold text-purple-300 flex items-center gap-1">
                              <Store className="w-3 h-3 text-purple-400" />
                              {language === 'bn' ? 'খুচরা ক্রেতা / দোকান' : 'Retailer / Customer'}
                            </label>
                            <button
                              type="button"
                              onClick={() => {
                                const nextState = !isNewCustomerMode;
                                setIsNewCustomerMode(nextState);
                                if (nextState) {
                                  setSelectedRetailerId('');
                                  setExtractedResult({
                                    ...extractedResult,
                                    retailerId: '',
                                    retailerName: '',
                                    customerName: '',
                                    retailerPhone: '',
                                  });
                                }
                              }}
                              className="text-[10px] font-semibold text-purple-300 hover:text-white flex items-center gap-0.5 cursor-pointer bg-purple-950/70 hover:bg-purple-900 px-1.5 py-0.5 rounded border border-purple-500/40 transition"
                            >
                              {isNewCustomerMode ? (
                                <>
                                  <Layers className="w-2.5 h-2.5" />
                                  <span>{language === 'bn' ? 'তালিকা থেকে বাছুন' : 'From List'}</span>
                                </>
                              ) : (
                                <>
                                  <Plus className="w-2.5 h-2.5" />
                                  <span>{language === 'bn' ? 'নতুন কাস্টমার' : 'New Customer'}</span>
                                </>
                              )}
                            </button>
                          </div>

                          {!isNewCustomerMode ? (
                            <select
                              value={
                                selectedRetailerId ||
                                retailers.find(
                                  (r) =>
                                    r.id === extractedResult.retailerId ||
                                    (r.shopName && r.shopName.toLowerCase() === (extractedResult.retailerName || '').toLowerCase()) ||
                                    (r.ownerName && r.ownerName.toLowerCase() === (extractedResult.customerName || '').toLowerCase())
                                )?.id ||
                                ''
                              }
                              onChange={(e) => {
                                const val = e.target.value;
                                if (val === '__NEW__') {
                                  setIsNewCustomerMode(true);
                                  setSelectedRetailerId('');
                                  setExtractedResult({
                                    ...extractedResult,
                                    retailerId: '',
                                    retailerName: '',
                                    customerName: '',
                                    retailerPhone: '',
                                  });
                                } else {
                                  setSelectedRetailerId(val);
                                  const matched = retailers.find((r) => r.id === val);
                                  if (matched) {
                                    setExtractedResult({
                                      ...extractedResult,
                                      retailerId: matched.id,
                                      retailerName: matched.shopName,
                                      customerName: matched.ownerName || matched.shopName,
                                      retailerPhone: matched.phone || '',
                                    });
                                  } else {
                                    setExtractedResult({
                                      ...extractedResult,
                                      retailerId: '',
                                      retailerName: '',
                                      customerName: '',
                                    });
                                  }
                                }
                              }}
                              className="w-full mt-1 bg-slate-900 border border-slate-700 focus:border-purple-500 rounded-lg px-2.5 py-1.5 text-xs text-white font-semibold focus:outline-none"
                            >
                              <option value="">{language === 'bn' ? '-- কাস্টমার / রিটেইলার নির্বাচন করুন --' : '-- Select Customer / Retailer --'}</option>
                              {retailers.map((r) => (
                                <option key={r.id} value={r.id}>
                                  {r.shopName} - {r.ownerName} ({r.phone})
                                </option>
                              ))}
                              <option value="__NEW__" className="text-purple-300 font-bold bg-purple-950">
                                ➕ {language === 'bn' ? 'নতুন কাস্টমার / দোকানদার যোগ করুন' : 'Add New Customer / Retailer'}
                              </option>
                            </select>
                          ) : (
                            <div className="relative mt-1">
                              <input
                                type="text"
                                autoFocus
                                value={extractedResult.retailerName || extractedResult.customerName || ''}
                                onChange={(e) =>
                                  setExtractedResult({
                                    ...extractedResult,
                                    retailerName: e.target.value,
                                    customerName: e.target.value,
                                  })
                                }
                                placeholder={language === 'bn' ? 'নতুন দোকান বা ক্রেতার নাম লিখুন...' : 'Type shop or customer name...'}
                                className="w-full bg-slate-900 border border-purple-500 rounded-lg px-2.5 py-1.5 text-xs text-white font-semibold focus:outline-none ring-1 ring-purple-500/40"
                              />
                            </div>
                          )}
                        </div>

                        {/* Memo / Khata Page Number */}
                        <div>
                          <label className="text-[10px] uppercase font-bold text-slate-400 flex items-center gap-1">
                            <Receipt className="w-3 h-3 text-sky-400" />
                            {language === 'bn' ? 'মেমো / খাতা পৃষ্ঠা নং' : 'Memo / Khata Page #'}
                          </label>
                          <input
                            type="text"
                            value={extractedResult.invoiceNumber || ''}
                            onChange={(e) =>
                              setExtractedResult({ ...extractedResult, invoiceNumber: e.target.value })
                            }
                            placeholder="e.g. SM-1049"
                            className="w-full mt-1 bg-slate-900 border border-slate-700 focus:border-sky-500 rounded-lg px-2.5 py-1.5 text-xs text-white font-mono focus:outline-none"
                          />
                        </div>

                        {/* Memo Date */}
                        <div>
                          <div className="flex items-center justify-between">
                            <label className="text-[10px] uppercase font-bold text-amber-300 flex items-center gap-1">
                              <Calendar className="w-3 h-3 text-amber-400" />
                              {language === 'bn' ? 'মেমো / হিসাবের তারিখ' : 'Memo Date'}
                            </label>
                            <button
                              type="button"
                              onClick={() =>
                                setExtractedResult({ ...extractedResult, invoiceDate: getTodayDateString() })
                              }
                              className="text-[9px] text-amber-400 hover:underline cursor-pointer"
                            >
                              {language === 'bn' ? 'আজ' : 'Today'}
                            </button>
                          </div>
                          <input
                            type="date"
                            value={extractedResult.invoiceDate || getTodayDateString()}
                            onChange={(e) =>
                              setExtractedResult({ ...extractedResult, invoiceDate: e.target.value })
                            }
                            className="w-full mt-1 bg-slate-900 border border-slate-700 focus:border-amber-400 rounded-lg px-2.5 py-1.5 text-xs text-amber-200 font-mono font-bold focus:outline-none"
                          />
                        </div>

                        {/* Customer Phone */}
                        <div>
                          <label className="text-[10px] uppercase font-bold text-slate-400 flex items-center gap-1">
                            <Phone className="w-3 h-3 text-indigo-400" />
                            {language === 'bn' ? 'ক্রেতার ফোন নম্বর' : 'Customer Phone'}
                          </label>
                          <input
                            type="text"
                            placeholder="+880 17xx-xxxxxx"
                            value={extractedResult.retailerPhone || ''}
                            onChange={(e) =>
                              setExtractedResult({ ...extractedResult, retailerPhone: e.target.value })
                            }
                            className="w-full mt-1 bg-slate-900 border border-slate-700 focus:border-indigo-500 rounded-lg px-2.5 py-1.5 text-xs text-white font-mono focus:outline-none"
                          />
                        </div>
                      </div>
                    </div>
                  );
                }

                // Purchase Flow Header
                return (
                  <div className="space-y-2.5">
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 p-3.5 rounded-xl bg-slate-800/70 border border-slate-700">
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <label className="text-[10px] uppercase font-bold text-slate-400 flex items-center gap-1">
                            <Building2 className="w-3 h-3 text-emerald-400" />
                            {language === 'bn' ? 'সাপ্লায়ার / কোম্পানি' : t.companyDetected}
                          </label>
                          <button
                            type="button"
                            onClick={() => {
                              const nextState = !isNewSupplierMode;
                              setIsNewSupplierMode(nextState);
                              if (nextState) {
                                setSelectedSupplierId('');
                                setExtractedResult({
                                  ...extractedResult,
                                  supplierName: '',
                                  supplierContact: '',
                                });
                              }
                            }}
                            className="text-[10px] font-semibold text-emerald-300 hover:text-white flex items-center gap-0.5 cursor-pointer bg-emerald-950/70 hover:bg-emerald-900 px-1.5 py-0.5 rounded border border-emerald-600/40 transition"
                          >
                            {isNewSupplierMode ? (
                              <>
                                <Layers className="w-2.5 h-2.5" />
                                <span>{language === 'bn' ? 'তালিকা থেকে বাছুন' : 'From List'}</span>
                              </>
                            ) : (
                              <>
                                <Plus className="w-2.5 h-2.5" />
                                <span>{language === 'bn' ? 'নতুন সাপ্লায়ার' : 'New Supplier'}</span>
                              </>
                            )}
                          </button>
                        </div>

                        {!isNewSupplierMode ? (
                          <div className="space-y-1">
                            <select
                              value={
                                selectedSupplierId ||
                                suppliers.find(
                                  (s) =>
                                    (s.company && s.company.toLowerCase() === (extractedResult.supplierName || '').toLowerCase()) ||
                                    (s.name && s.name.toLowerCase() === (extractedResult.supplierName || '').toLowerCase())
                                )?.id ||
                                ''
                              }
                              onChange={(e) => {
                                const val = e.target.value;
                                if (val === '__NEW__') {
                                  setIsNewSupplierMode(true);
                                  setSelectedSupplierId('');
                                  setExtractedResult({
                                    ...extractedResult,
                                    supplierName: '',
                                    supplierContact: '',
                                  });
                                } else {
                                  setSelectedSupplierId(val);
                                  const matched = suppliers.find((s) => s.id === val);
                                  if (matched) {
                                    setExtractedResult({
                                      ...extractedResult,
                                      supplierName: matched.company || matched.name,
                                      supplierContact: matched.phone || '',
                                    });
                                  } else {
                                    setExtractedResult({
                                      ...extractedResult,
                                      supplierName: '',
                                    });
                                  }
                                }
                              }}
                              className="w-full mt-1 bg-slate-900 border border-slate-700 focus:border-emerald-500 rounded-lg px-2.5 py-1.5 text-xs text-white font-semibold focus:outline-none"
                            >
                              <option value="">{language === 'bn' ? '-- সাপ্লায়ার নির্বাচন করুন --' : '-- Select Supplier --'}</option>
                              {suppliers.map((s) => (
                                <option key={s.id} value={s.id}>
                                  {s.name} {s.company && s.company !== s.name ? `(${s.company})` : ''} {s.phone ? ` • ${s.phone}` : ''}
                                </option>
                              ))}
                              <option value="__NEW__" className="text-emerald-300 font-bold bg-emerald-950">
                                ➕ {language === 'bn' ? 'নতুন সাপ্লায়ার যোগ করুন' : 'Add New Supplier'}
                              </option>
                            </select>
                            {extractedResult.supplierContact && (
                              <div className="flex items-center gap-1 text-[10px] text-emerald-400 font-mono px-0.5">
                                <Phone className="w-2.5 h-2.5" />
                                <span>{extractedResult.supplierContact}</span>
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="space-y-1.5 mt-1">
                            <input
                              type="text"
                              autoFocus
                              value={extractedResult.supplierName || ''}
                              onChange={(e) =>
                                setExtractedResult({ ...extractedResult, supplierName: e.target.value })
                              }
                              placeholder={language === 'bn' ? 'নতুন সাপ্লায়ার বা কোম্পানির নাম...' : 'New supplier or company name...'}
                              className="w-full bg-slate-900 border border-emerald-500 rounded-lg px-2.5 py-1.5 text-xs text-white font-semibold focus:outline-none ring-1 ring-emerald-500/40"
                            />
                            <input
                              type="text"
                              value={extractedResult.supplierContact || ''}
                              onChange={(e) =>
                                setExtractedResult({ ...extractedResult, supplierContact: e.target.value })
                              }
                              placeholder={language === 'bn' ? 'মোবাইল নম্বর (ঐচ্ছিক)...' : 'Phone number (optional)...'}
                              className="w-full bg-slate-900/90 border border-slate-700 rounded-lg px-2.5 py-1 text-xs text-slate-200 font-mono focus:outline-none focus:border-emerald-400"
                            />
                          </div>
                        )}
                      </div>

                      <div>
                        <label className="text-[10px] uppercase font-bold text-slate-400 flex items-center gap-1">
                          <Receipt className="w-3 h-3 text-sky-400" />
                          {t.invoiceNoDetected}
                        </label>
                        <input
                          type="text"
                          value={extractedResult.invoiceNumber || ''}
                          onChange={(e) =>
                            setExtractedResult({ ...extractedResult, invoiceNumber: e.target.value })
                          }
                          className="w-full mt-1 bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white font-mono focus:outline-none focus:border-sky-500"
                        />
                      </div>

                      {/* Previous D.O. No */}
                      <div>
                        <label className="text-[10px] uppercase font-bold text-amber-300 flex items-center gap-1">
                          <FileText className="w-3 h-3 text-amber-400" />
                          {language === 'bn' ? 'পূর্বের ডিও নং' : 'Prev D.O. No'}
                        </label>
                        <input
                          type="text"
                          placeholder="e.g. DO-89012"
                          value={extractedResult.previousDoNo || ''}
                          onChange={(e) =>
                            setExtractedResult({ ...extractedResult, previousDoNo: e.target.value })
                          }
                          className="w-full mt-1 bg-slate-900 border border-slate-700 focus:border-amber-400 rounded-lg px-2.5 py-1.5 text-xs text-amber-200 font-mono font-bold focus:outline-none"
                        />
                      </div>

                      {/* Previous D.O. Date */}
                      <div>
                        <div className="flex items-center justify-between">
                          <label className="text-[10px] uppercase font-bold text-amber-300 flex items-center gap-1">
                            <Calendar className="w-3 h-3 text-amber-400" />
                            {language === 'bn' ? 'পূর্বের ডিও তারিখ' : 'Prev D.O. Date'}
                          </label>
                          <button
                            type="button"
                            onClick={() =>
                              setExtractedResult({ ...extractedResult, previousDoDate: getTodayDateString() })
                            }
                            className="text-[9px] text-amber-400 hover:underline cursor-pointer"
                          >
                            {language === 'bn' ? 'আজকের তারিখ' : 'Today'}
                          </button>
                        </div>
                        <input
                          type="date"
                          value={extractedResult.previousDoDate || ''}
                          onChange={(e) =>
                            setExtractedResult({ ...extractedResult, previousDoDate: e.target.value })
                          }
                          className="w-full mt-1 bg-slate-900 border border-slate-700 focus:border-amber-400 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 font-mono focus:outline-none"
                        />
                      </div>

                      <div>
                        <div className="flex items-center justify-between">
                          <label className="text-[10px] uppercase font-bold text-slate-400 flex items-center gap-1">
                            <Calendar className="w-3 h-3 text-amber-400" />
                            {language === 'bn' ? 'ইনভয়েস তারিখ' : 'Invoice Date'}
                          </label>
                          <span className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400 font-semibold flex items-center gap-0.5">
                            <CheckCircle2 className="w-2.5 h-2.5" />
                            {language === 'bn' ? 'অটো' : 'Auto'}
                          </span>
                        </div>
                        <div className="flex gap-1 mt-1">
                          <input
                            type="date"
                            value={extractedResult.invoiceDate || getTodayDateString()}
                            onChange={(e) =>
                              setExtractedResult({ ...extractedResult, invoiceDate: e.target.value })
                            }
                            className="w-full bg-slate-900 border border-amber-500/50 focus:border-amber-400 rounded-lg px-2 py-1.5 text-xs text-amber-200 font-mono font-bold focus:outline-none focus:ring-1 focus:ring-amber-400/40"
                          />
                          <button
                            type="button"
                            onClick={() =>
                              setExtractedResult({ ...extractedResult, invoiceDate: getTodayDateString() })
                            }
                            title={language === 'bn' ? 'আজকের তারিখে সেট করুন' : 'Set to today'}
                            className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-[10px] rounded-lg border border-slate-700 whitespace-nowrap transition flex items-center gap-1"
                          >
                            {language === 'bn' ? 'আজ' : 'Today'}
                          </button>
                        </div>
                      </div>

                      <div>
                        <label className="text-[10px] uppercase font-bold text-slate-400 flex items-center gap-1">
                          <Phone className="w-3 h-3 text-indigo-400" />
                          {language === 'bn' ? 'সাপ্লায়ার ফোন নম্বর' : 'Supplier Phone'}
                        </label>
                        <input
                          type="text"
                          placeholder="+880 17xx-xxxxxx"
                          value={extractedResult.supplierContact || ''}
                          onChange={(e) =>
                            setExtractedResult({ ...extractedResult, supplierContact: e.target.value })
                          }
                          className="w-full mt-1 bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white font-mono focus:outline-none focus:border-indigo-500"
                        />
                      </div>
                    </div>

                    {/* Duplicate Invoice Warning Banner & Payment Status Toggle */}
                    {(() => {
                      const duplicateEntry = supplierLedger.find(
                        (entry) =>
                          entry.referenceNo &&
                          extractedResult.invoiceNumber &&
                          entry.referenceNo.trim().toLowerCase() === extractedResult.invoiceNumber.trim().toLowerCase()
                      );
                      const sTarget = (extractedResult.supplierName || '').trim().toLowerCase();
                      const matchedSupplier = sTarget
                        ? suppliers.find(
                            (s) =>
                              (s.name && s.name.trim().toLowerCase() === sTarget) ||
                              (s.company && s.company.trim().toLowerCase() === sTarget)
                          )
                        : undefined;
                      const currentDue = matchedSupplier ? matchedSupplier.outstandingPayable : 0;
                      const isPaid = extractedResult.paymentStatus === 'Paid';
                      const expectedDueAfter = isPaid ? currentDue : currentDue + (Number(extractedResult.totalAmount) || 0);

                      return (
                        <div className="space-y-2">
                          {duplicateEntry && (
                            <div className="p-3.5 rounded-xl bg-rose-950/80 border-2 border-rose-500 text-rose-200 text-xs space-y-2 shadow-lg animate-in fade-in">
                              <div className="flex items-start gap-2.5">
                                <AlertCircle className="w-5 h-5 shrink-0 text-rose-400 mt-0.5" />
                                <div className="flex-1 min-w-0">
                                  <h4 className="font-bold text-sm text-rose-100 flex items-center gap-2 flex-wrap">
                                    <span>{language === 'bn' ? '⚠️ সতর্কতা: একই ইনভয়েস ইতিমধ্যে সিস্টেমে বিদ্যমান!' : '⚠️ Duplicate Invoice Alert!'}</span>
                                    <span className="font-mono bg-rose-900 px-2 py-0.5 rounded text-rose-200 text-xs border border-rose-700">
                                      #{extractedResult.invoiceNumber}
                                    </span>
                                  </h4>
                                  <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] bg-black/40 p-2.5 rounded-lg border border-rose-900/60">
                                    <div>
                                      <span className="text-slate-400">{language === 'bn' ? 'পূর্বে স্ক্যান করেছেন:' : 'Scanned by:'} </span>
                                      <strong className="text-white">
                                        {duplicateEntry.scannedByName || (duplicateEntry.scannedByRole === 'dsr' ? 'ডিএসআর' : duplicateEntry.scannedByRole === 'counter' ? 'ক্যাশ কাউন্টার' : 'অ্যাডমিন')}
                                      </strong>
                                      <span className="ml-1 text-[10px] px-1.5 py-0.5 rounded bg-rose-800 text-rose-200 font-semibold">
                                        {duplicateEntry.scannedByRole === 'dsr' ? '🚚 ডিএসআর' : duplicateEntry.scannedByRole === 'counter' ? '🖥️ কাউন্টার' : '👑 অ্যাডমিন'}
                                      </span>
                                    </div>
                                    <div>
                                      <span className="text-slate-400">{language === 'bn' ? 'স্ক্যান করার তারিখ:' : 'Scan Date:'} </span>
                                      <strong className="text-white font-mono">{duplicateEntry.date}</strong>
                                    </div>
                                    <div>
                                      <span className="text-slate-400">{language === 'bn' ? 'সাপ্লায়ার:' : 'Supplier:'} </span>
                                      <strong className="text-white">{duplicateEntry.supplierName}</strong>
                                    </div>
                                    <div>
                                      <span className="text-slate-400">{language === 'bn' ? 'চালানের মূল্য:' : 'Amount:'} </span>
                                      <strong className="text-emerald-400 font-mono-num">{formatCurrency(duplicateEntry.amount, language)}</strong>
                                    </div>
                                  </div>
                                  <p className="mt-2 text-[11px] text-rose-300 font-medium leading-relaxed">
                                    {language === 'bn'
                                      ? 'একই চালান দুইবার যুক্ত করলে স্টক সংখ্যা ও সাপ্লায়ারের বকেয়া দ্বিগুণ হয়ে যাবে। দয়া করে চালান নম্বর পরিবর্তন করুন অথবা ইউনিক কোড দিন।'
                                      : 'Adding this invoice again will double stock quantity and supplier accounts payable. Please change the invoice number to keep it unique.'}
                                  </p>
                                </div>
                              </div>

                              <div className="flex items-center gap-2 pt-1.5 border-t border-rose-900/60 flex-wrap">
                                <button
                                  type="button"
                                  onClick={() => {
                                    const suffix = `-${Math.floor(10 + Math.random() * 90)}`;
                                    setExtractedResult({
                                      ...extractedResult,
                                      invoiceNumber: `${extractedResult.invoiceNumber}${suffix}`,
                                    });
                                  }}
                                  className="px-2.5 py-1 bg-rose-900/90 hover:bg-rose-800 text-white rounded-lg text-[11px] font-bold transition flex items-center gap-1 cursor-pointer border border-rose-700"
                                >
                                  <Edit3 className="w-3 h-3" />
                                  <span>{language === 'bn' ? 'ইউনিক চালান নম্বর করুন (+সাফিক্স)' : 'Make Unique (+Suffix)'}</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    const newRandomMemo = `MEMO-${Math.floor(100000 + Math.random() * 900000)}`;
                                    setExtractedResult({
                                      ...extractedResult,
                                      invoiceNumber: newRandomMemo,
                                    });
                                  }}
                                  className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-[11px] font-medium transition cursor-pointer border border-slate-700"
                                >
                                  {language === 'bn' ? 'নতুন মেমো নম্বর দিন' : 'Generate New Memo #'}
                                </button>
                              </div>
                            </div>
                          )}

                          {/* Payment Status & Balance Projection Card */}
                          <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-bold text-slate-300">
                                {language === 'bn' ? 'চালানের মূল্য পরিশোধ:' : 'Payment Status:'}
                              </span>
                              <div className="flex items-center gap-1 bg-slate-900 p-0.5 rounded-lg border border-slate-700">
                                <button
                                  type="button"
                                  onClick={() =>
                                    setExtractedResult({
                                      ...extractedResult,
                                      paymentStatus: 'Credit',
                                      paymentMethod: 'Credit',
                                    })
                                  }
                                  className={`px-2.5 py-1 rounded-md text-xs font-bold transition ${
                                    !isPaid
                                      ? 'bg-rose-600 text-white shadow-sm'
                                      : 'text-slate-400 hover:text-slate-200'
                                  }`}
                                >
                                  {language === 'bn' ? '🔴 বাকিতে (বকেয়া বাড়বে)' : 'Credit (Add to Due)'}
                                </button>
                                <button
                                  type="button"
                                  onClick={() =>
                                    setExtractedResult({
                                      ...extractedResult,
                                      paymentStatus: 'Paid',
                                      paymentMethod: 'Cash',
                                    })
                                  }
                                  className={`px-2.5 py-1 rounded-md text-xs font-bold transition ${
                                    isPaid
                                      ? 'bg-emerald-600 text-white shadow-sm'
                                      : 'text-slate-400 hover:text-slate-200'
                                  }`}
                                >
                                  {language === 'bn' ? '🟢 নগদ পরিশোধিত (বকেয়া ০)' : 'Paid (Cash / No Due)'}
                                </button>
                              </div>
                            </div>

                            {/* Balance projection badge */}
                            <div className="text-right text-[11px] text-slate-400 flex sm:flex-col items-center sm:items-end justify-between gap-1">
                              <span>
                                {language === 'bn' ? 'সাপ্লায়ারের বকেয়া হিসাব:' : 'Supplier Due Balance:'}
                              </span>
                              <span className="font-mono-num font-bold text-slate-200">
                                ৳{currentDue.toLocaleString()} →{' '}
                                <span className={!isPaid && extractedResult.totalAmount > 0 ? 'text-rose-400' : 'text-emerald-400'}>
                                  ৳{expectedDueAfter.toLocaleString()}
                                </span>
                              </span>
                            </div>
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                );
              })()}

              {/* Items Table & Category Controls */}
              <div className="space-y-2.5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <h4 className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                    <Layers className="w-3.5 h-3.5 text-amber-400" />
                    <span>{t.extractedStockItems} ({extractedResult.items?.length || 0})</span>
                  </h4>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleAddNewItem}
                      className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-emerald-400 hover:text-emerald-300 border border-slate-700 rounded-lg text-xs font-bold flex items-center gap-1 transition"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>{language === 'bn' ? 'আইটেম যোগ' : 'Add Item'}</span>
                    </button>
                  </div>
                </div>

                {/* Batch Category Selector Bar */}
                <div className="p-2.5 rounded-xl bg-slate-900/90 border border-slate-800 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-amber-300 flex items-center gap-1">
                      <span>⚡ {language === 'bn' ? 'পুরো মেমোর সব পণ্যের ক্যাটাগরি সেট করুন:' : 'Set Category for All Line Items:'}</span>
                    </span>
                    <span className="text-[10px] text-slate-400">
                      {language === 'bn' ? 'ক্লিক করলে সব আইটেমে ক্যাটাগরি বসে যাবে' : 'Applies to all products in this invoice'}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
                    {WHOLESALE_CATEGORIES.slice(0, 8).map((cat) => (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() => handleApplyCategoryToAll(cat.id)}
                        className="px-2 py-1 rounded-lg bg-slate-800 hover:bg-emerald-600/30 text-slate-200 hover:text-emerald-300 border border-slate-700 hover:border-emerald-500/50 text-[11px] font-medium transition whitespace-nowrap flex items-center gap-1"
                      >
                        <span>{cat.icon}</span>
                        <span>{language === 'bn' ? cat.labelBn.split(' ')[0] : cat.labelEn}</span>
                      </button>
                    ))}
                    <select
                      onChange={(e) => {
                        if (e.target.value) handleApplyCategoryToAll(e.target.value);
                      }}
                      className="px-2 py-1 rounded-lg bg-slate-800 text-slate-300 border border-slate-700 text-[11px] font-medium focus:outline-none"
                      defaultValue=""
                    >
                      <option value="" disabled>
                        {language === 'bn' ? 'অন্যান্য ক্যাটাগরি...' : 'More Categories...'}
                      </option>
                      {WHOLESALE_CATEGORIES.map((cat) => (
                        <option key={cat.id} value={cat.id}>
                          {cat.icon} {language === 'bn' ? cat.labelBn : cat.labelEn}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="overflow-x-auto rounded-xl border border-slate-700/80 bg-slate-950/60">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-800/80 text-slate-400 text-[11px] border-b border-slate-700">
                      <tr>
                        <th className="py-2 px-3 font-semibold">{t.itemColName}</th>
                        <th className="py-2 px-2 font-semibold">{language === 'bn' ? 'ক্যাটাগরি' : 'Category'}</th>
                        <th className="py-2 px-2 font-semibold text-center">{t.itemColQty}</th>
                        <th className="py-2 px-2 font-semibold text-center">{t.itemColUnit}</th>
                        <th className="py-2 px-2 font-semibold text-right text-emerald-400">{language === 'bn' ? 'কেনা দাম (৳)' : 'Cost Price (৳)'}</th>
                        <th className="py-2 px-2 font-semibold text-right text-sky-400">{language === 'bn' ? 'বিক্রি দাম (৳)' : 'Selling Price (৳)'}</th>
                        <th className="py-2 px-3 font-semibold text-right">{t.itemColTotal}</th>
                        <th className="py-2 px-2 text-center"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60">
                      {extractedResult.items?.map((item: any, idx: number) => (
                        <tr key={idx} className="hover:bg-slate-800/40 transition">
                          <td className="py-2 px-3 min-w-[140px]">
                            <input
                              type="text"
                              list="scanner-products-list"
                              value={item.name}
                              onChange={(e) => handleUpdateItem(idx, 'name', e.target.value)}
                              placeholder={language === 'bn' ? 'পণ্যের নাম লিখুন...' : 'Product name...'}
                              className="w-full bg-transparent border-0 border-b border-slate-700/40 text-slate-100 text-xs focus:outline-none focus:border-emerald-500 font-medium placeholder:text-slate-600"
                            />
                          </td>
                          <td className="py-2 px-2 min-w-[120px]">
                            <select
                              value={item.category || 'Battery'}
                              onChange={(e) => handleUpdateItem(idx, 'category', e.target.value)}
                              className="w-full bg-slate-900 border border-slate-700 rounded px-1.5 py-0.5 text-[11px] text-amber-300 font-medium focus:outline-none focus:border-amber-400"
                            >
                              {WHOLESALE_CATEGORIES.map((c) => (
                                <option key={c.id} value={c.id}>
                                  {c.icon} {language === 'bn' ? c.labelBn : c.labelEn}
                                </option>
                              ))}
                            </select>
                          </td>
                          <td className="py-2 px-2 text-center w-16">
                            <input
                              type="number"
                              value={item.quantity}
                              min="0"
                              step="any"
                              onChange={(e) => handleUpdateItem(idx, 'quantity', e.target.value === '' ? 0 : Math.max(0, Number(e.target.value)))}
                              className="w-14 text-center bg-slate-900 border border-slate-700 rounded px-1 py-0.5 font-mono-num text-white text-xs"
                            />
                          </td>
                          <td className="py-2 px-2 text-center w-16">
                            <input
                              type="text"
                              value={item.unit || 'Pcs'}
                              onChange={(e) => handleUpdateItem(idx, 'unit', e.target.value)}
                              className="w-14 text-center bg-slate-900 border border-slate-700 rounded px-1 py-0.5 text-slate-300 text-xs"
                            />
                          </td>
                          <td className="py-2 px-2 text-right w-20">
                            <input
                              type="number"
                              value={item.costPrice !== undefined ? item.costPrice : ''}
                              min="0"
                              step="any"
                              placeholder="0"
                              onChange={(e) => handleUpdateItem(idx, 'costPrice', Number(e.target.value))}
                              title={language === 'bn' ? 'কেনা দাম বা ক্রয় মূল্য' : 'Cost Price'}
                              className="w-18 text-right bg-slate-900 border border-emerald-500/40 focus:border-emerald-400 rounded px-1.5 py-0.5 font-mono-num text-emerald-400 font-semibold text-xs"
                            />
                          </td>
                          <td className="py-2 px-2 text-right w-20">
                            <input
                              type="number"
                              value={item.suggestedRetailPrice !== undefined ? item.suggestedRetailPrice : (item.price || '')}
                              min="0"
                              step="any"
                              placeholder="0"
                              onChange={(e) => handleUpdateItem(idx, 'suggestedRetailPrice', Number(e.target.value))}
                              title={language === 'bn' ? 'বিক্রি দাম বা বিক্রয় মূল্য' : 'Selling Price'}
                              className="w-18 text-right bg-slate-900 border border-sky-500/40 focus:border-sky-400 rounded px-1.5 py-0.5 font-mono-num text-sky-300 font-semibold text-xs"
                            />
                          </td>
                          <td className="py-2 px-3 text-right font-mono-num font-bold text-white whitespace-nowrap">
                            {formatCurrency(item.totalPrice, language)}
                          </td>
                          <td className="py-2 px-2 text-center">
                            <button
                              type="button"
                              onClick={() => handleRemoveItem(idx)}
                              className="p-1 text-slate-500 hover:text-rose-400 rounded transition"
                              title="Remove item"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <datalist id="scanner-products-list">
                  {products.map((p) => (
                    <option key={p.id} value={p.name}>
                      {p.bnName && p.bnName !== p.name ? `${p.bnName} | ` : ''}স্টক: {p.stockQuantity} {p.unit} | কেনা: ৳{p.costPrice} | বিক্রি: ৳{p.wholesalePrice}
                    </option>
                  ))}
                </datalist>
              </div>

              {/* Total Summary Footer */}
              {(() => {
                const isSale = (docMode === 'SALE' || extractedResult.docType === 'SALE');
                return (
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between p-3.5 bg-slate-950/80 rounded-xl border border-slate-800 gap-2">
                    <div>
                      <span className="text-xs text-slate-400 font-semibold flex items-center gap-1.5">
                        {isSale ? (
                          <>
                            <ShoppingCart className="w-3.5 h-3.5 text-purple-400" />
                            {language === 'bn' ? 'মোট বিক্রয় মূল্য:' : 'Total Sales Value:'}
                          </>
                        ) : (
                          <>
                            <Building2 className="w-3.5 h-3.5 text-emerald-400" />
                            {t.grandTotal}
                          </>
                        )}
                      </span>
                      <p className="text-[11px] text-slate-500">
                        {isSale
                          ? (language === 'bn'
                              ? '⚠️ সংরক্ষণের সাথে সাথে তালিকায় উল্লেখিত প্রতিটি পণ্য ইনভেন্টরি স্টক থেকে বাদ (মাইনাস) যাবে।'
                              : '⚠️ Each item quantity will be deducted from warehouse inventory.')
                          : (extractedResult.paymentStatus === 'Paid'
                              ? (language === 'bn' ? 'নগদ পরিশোধিত' : 'Paid in Cash')
                              : (language === 'bn' ? 'সাপ্লায়ার খাতায় বাকিতে যোগ হবে' : 'Will be added as Outstanding Payable'))
                        }
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      {isSale && (
                        <span className="text-xs px-2.5 py-1 rounded-lg bg-rose-500/20 text-rose-300 font-bold border border-rose-500/30">
                          {language === 'bn' ? 'স্টক মাইনাস (-)' : 'Stock Deduction (-)'}
                        </span>
                      )}
                      <span className={`text-base sm:text-xl font-extrabold font-mono-num ${isSale ? 'text-purple-400' : 'text-emerald-400'}`}>
                        {formatCurrency(extractedResult.totalAmount || 0, language)}
                      </span>
                    </div>
                  </div>
                );
              })()}

              {/* User Request: মেমোতে কত টাকা গ্রহণ করল টাইপ করার ঘর ও লাভ/লস (+ / -) হিসাব */}
              {(() => {
                const isSale = (docMode === 'SALE' || extractedResult.docType === 'SALE');
                const softwareTotal = Number(extractedResult.totalAmount) || 0;
                const currentReceived = extractedResult.receivedAmount !== undefined
                  ? extractedResult.receivedAmount
                  : (extractedResult.paidAmount !== undefined && extractedResult.paidAmount !== 0 ? extractedResult.paidAmount : softwareTotal);
                const numReceived = currentReceived === '' ? 0 : Number(currentReceived);
                const diff = numReceived - softwareTotal;

                return (
                  <div className="p-3.5 bg-slate-900/95 rounded-xl border border-slate-700/80 space-y-2.5 mt-2.5">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5">
                      <label className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                        <Banknote className="w-4 h-4 text-amber-400" />
                        <span>
                          {isSale
                            ? (language === 'bn' ? 'মেমোতে খদ্দেরের কাছে কত টাকা গ্রহণ করল / লেখা হলো:' : 'Amount Received from Customer on Memo:')
                            : (language === 'bn' ? 'চালানে সাপ্লায়ারকে কত টাকা পরিশোধ / গ্রহণ করল:' : 'Amount Paid / Received on Challan:')}
                        </span>
                      </label>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            setExtractedResult({
                              ...extractedResult,
                              receivedAmount: softwareTotal,
                              paidAmount: softwareTotal,
                              dueAmount: 0,
                            });
                          }}
                          className="text-[11px] text-emerald-400 hover:text-emerald-300 font-semibold underline cursor-pointer"
                        >
                          {language === 'bn' ? `সফটওয়্যার মূল্যের সমান (৳${softwareTotal.toLocaleString()})` : `Match Software Total (৳${softwareTotal})`}
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-center">
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-xs">৳</span>
                        <input
                          type="number"
                          min="0"
                          step="any"
                          value={extractedResult.receivedAmount !== undefined ? extractedResult.receivedAmount : (extractedResult.paidAmount !== undefined ? extractedResult.paidAmount : softwareTotal)}
                          onChange={(e) => {
                            const val = e.target.value === '' ? '' : Number(e.target.value);
                            const numericVal = Number(val) || 0;
                            const newDue = round2(Math.max(0, softwareTotal - numericVal));
                            setExtractedResult({
                              ...extractedResult,
                              receivedAmount: val,
                              paidAmount: numericVal,
                              dueAmount: newDue,
                            });
                          }}
                          placeholder={String(softwareTotal)}
                          className="w-full bg-slate-950 border border-slate-700 focus:border-amber-400 rounded-lg pl-7 pr-3 py-2 text-sm font-bold text-white font-mono-num focus:outline-none"
                        />
                      </div>

                      {/* Profit / Loss Real-time indicator */}
                      <div className={`p-2.5 rounded-lg text-xs font-bold flex items-center justify-between border transition-all ${
                        diff < 0
                          ? 'bg-rose-950/60 border-rose-500/40 text-rose-300'
                          : diff > 0
                          ? 'bg-emerald-950/60 border-emerald-500/40 text-emerald-300'
                          : 'bg-slate-800/80 border-slate-700 text-slate-300'
                      }`}>
                        <span className="flex items-center gap-1.5">
                          {diff < 0 ? (
                            <>
                              <TrendingDown className="w-4 h-4 text-rose-400 shrink-0" />
                              <span>{language === 'bn' ? 'সফটওয়্যার বিক্রয় দর থেকে কম (লস):' : 'Below Software Price (Loss):'}</span>
                            </>
                          ) : diff > 0 ? (
                            <>
                              <TrendingUp className="w-4 h-4 text-emerald-400 shrink-0" />
                              <span>{language === 'bn' ? 'সফটওয়্যার বিক্রয় দর থেকে বেশি (লাভ):' : 'Above Software Price (Profit):'}</span>
                            </>
                          ) : (
                            <>
                              <Check className="w-4 h-4 text-slate-400 shrink-0" />
                              <span>{language === 'bn' ? 'সফটওয়্যার মূল্যের সমান:' : 'Exact Software Price:'}</span>
                            </>
                          )}
                        </span>
                        <span className="font-mono-num text-sm font-black shrink-0">
                          {diff < 0 ? (
                            `- ${formatCurrency(Math.abs(diff), language)} (লস)`
                          ) : diff > 0 ? (
                            `+ ${formatCurrency(diff, language)} (লাভ)`
                          ) : (
                            `${formatCurrency(0, language)} (সমান)`
                          )}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })()}
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-3.5 bg-slate-950 border-t border-slate-800 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={handleClose}
            className="py-2 px-4 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-xl transition cursor-pointer"
          >
            {t.cancel}
          </button>

          {extractedResult && !isScanning && (
            <button
              type="button"
              onClick={handleSaveToWholesale}
              id="btn-confirm-scanner-inventory"
              className={`py-2.5 px-4 text-white text-xs font-bold rounded-xl flex items-center gap-2 shadow-lg transition active:scale-95 cursor-pointer ${
                (docMode === 'SALE' || extractedResult.docType === 'SALE')
                  ? 'bg-purple-600 hover:bg-purple-500 shadow-purple-900/40'
                  : 'bg-emerald-600 hover:bg-emerald-500 shadow-emerald-900/40'
              }`}
            >
              {(docMode === 'SALE' || extractedResult.docType === 'SALE') ? (
                <>
                  <ShoppingCart className="w-4 h-4" />
                  <span>{language === 'bn' ? 'সেলস সংরক্ষণ ও স্টক থেকে মাইনাস করুন' : 'Confirm Sale & Deduct Stock'}</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{t.addToInventoryAndLedger}</span>
                </>
              )}
            </button>
          )}
        </div>

        {/* Duplicate Confirmation Alert Modal */}
        {isDuplicateConfirmOpen && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in">
            <div className="bg-slate-900 border-2 border-rose-500 rounded-2xl w-full max-w-md p-5 shadow-2xl space-y-4 animate-in zoom-in-95">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-rose-500/20 text-rose-400 flex items-center justify-center shrink-0 border border-rose-500/40">
                  <AlertCircle className="w-6 h-6" />
                </div>
                <div className="flex-1">
                  <h3 className="text-base font-bold text-white">
                    {language === 'bn' ? '⚠️ ডুপ্লিকেট ইনভয়েস সতর্কতা!' : '⚠️ Duplicate Invoice Alert!'}
                  </h3>
                  <p className="text-xs text-rose-300 mt-0.5">
                    {language === 'bn'
                      ? 'এই চালান নম্বরটি ইতিপূর্বে সিস্টেমে সংরক্ষিত আছে।'
                      : 'This invoice number is already recorded in the system.'}
                  </p>
                </div>
              </div>

              {(() => {
                const dup = supplierLedger.find(
                  (entry) =>
                    entry.referenceNo &&
                    extractedResult?.invoiceNumber &&
                    entry.referenceNo.trim().toLowerCase() === extractedResult.invoiceNumber.trim().toLowerCase()
                );
                return (
                  <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-2 text-xs">
                    <div className="flex justify-between items-center">
                      <span className="text-slate-400">{language === 'bn' ? 'চালান নম্বর:' : 'Invoice No:'}</span>
                      <span className="font-mono font-bold text-rose-300 bg-rose-950/60 px-2 py-0.5 rounded border border-rose-800">
                        #{extractedResult?.invoiceNumber}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-slate-400">{language === 'bn' ? 'পূর্বে স্ক্যান করেছেন:' : 'Scanned by:'}</span>
                      <span className="font-bold text-amber-300">
                        {dup?.scannedByName || (dup?.scannedByRole === 'dsr' ? 'ডিএসআর' : dup?.scannedByRole === 'counter' ? 'ক্যাশ কাউন্টার' : 'অ্যাডমিন')}
                        <span className="ml-1 text-[10px] text-slate-400 font-normal">
                          ({dup?.scannedByRole === 'dsr' ? 'ডিএসআর' : dup?.scannedByRole === 'counter' ? 'কাউন্টার' : 'অ্যাডমিন'})
                        </span>
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-slate-400">{language === 'bn' ? 'পূর্বের তারিখ:' : 'Previous Date:'}</span>
                      <span className="font-mono text-slate-300">{dup?.date || 'N/A'}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-slate-400">{language === 'bn' ? 'সাপ্লায়ার:' : 'Supplier:'}</span>
                      <span className="text-slate-200 font-medium">{dup?.supplierName}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-slate-400">{language === 'bn' ? 'পূর্বের মোট টাকা:' : 'Amount:'}</span>
                      <span className="font-bold text-emerald-400 font-mono-num">{formatCurrency(dup?.amount || 0, language)}</span>
                    </div>
                  </div>
                );
              })()}

              <div className="p-3 rounded-xl bg-amber-950/40 border border-amber-500/30 text-amber-200 text-xs leading-relaxed">
                {language === 'bn'
                  ? 'একই চালান দুইবার যোগ করলে স্টক সংখ্যা ও সাপ্লায়ারের বকেয়া দ্বিগুণ গণনা হবে। আপনি কি নিশ্চিত যে এটি পুনরায় যোগ করবেন?'
                  : 'Adding this invoice again will double the stock inventory and accounts payable. Are you sure you want to proceed?'}
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsDuplicateConfirmOpen(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-xl transition cursor-pointer"
                >
                  {language === 'bn' ? 'না, বাতিল ও চেক করব' : 'Cancel & Review'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsDuplicateConfirmOpen(false);
                    executeSave();
                  }}
                  className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold rounded-xl shadow-lg shadow-rose-950/50 transition flex items-center gap-1.5 cursor-pointer"
                >
                  <AlertCircle className="w-3.5 h-3.5" />
                  <span>{language === 'bn' ? 'হ্যাঁ, নিশ্চিত যোগ করুন' : 'Confirm Add Anyway'}</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
