import React, { useState, useRef, useEffect } from 'react';
import { useWholesale } from '../context/WholesaleContext';
import { Product, Retailer, PhoneContact, OrderInvoice, SupplierLedgerEntry } from '../types';
import { translations, formatCurrency, getTodayDateString, getYesterdayDateString, formatDate } from '../utils/translations';
import { PhoneInputWithContactPicker } from './PhoneInputWithContactPicker';
import {
  pickContactFromDevice,
  sanitizePhoneNumber,
  isContactPickerSupported,
  parseVCardContent,
  parsePastedContactText,
} from '../utils/contactPickerHelper';
import {
  generateInvoiceMemoPdf,
  generateAdminProfitInvoiceMemoPdf,
  generateDailySalesStatementPdf,
  generateSalesProfitStatementPdf,
  PdfDocumentResult,
} from '../utils/pdfExport';
import { toBnDigit } from '../utils/pdfHtmlTemplates';
import { PdfPreviewModal } from './PdfPreviewModal';
import { PhotoProductEntryModal, PhotoInboxEntry } from './PhotoProductEntryModal';
import { StockPhotoManagerModal } from './StockPhotoManagerModal';
import { DeviceContactPickerModal } from './DeviceContactPickerModal';
import { AdminSalesPriceModal } from './AdminSalesPriceModal';
import { EditPurchaseChallanModal } from './EditPurchaseChallanModal';
import { DeletePurchaseChallanModal } from './DeletePurchaseChallanModal';
import { EditSalesInvoiceModal } from './EditSalesInvoiceModal';
import { ProductChallanBreakdownModal } from './ProductChallanBreakdownModal';
import { getProductChallanBreakdown } from '../utils/productDeduplication';
import { compressImage } from '../utils/imageCompression';
import {
  ShoppingCart,
  Search,
  Plus,
  Minus,
  Trash2,
  Printer,
  FileCheck,
  CheckCircle2,
  BookUser,
  Percent,
  CreditCard,
  Banknote,
  Send,
  Sparkles,
  Layers,
  ArrowRight,
  Package,
  History,
  AlertTriangle,
  Eye,
  Edit2,
  Phone,
  Store,
  User,
  RotateCcw,
  X,
  PlusCircle,
  Calendar,
  Smartphone,
  Download,
  FileText,
  Building2,
  Truck,
  Camera,
  Upload,
  Image as ImageIcon,
  ClipboardPaste,
  ExternalLink,
  Tag,
  TrendingUp,
  TrendingDown,
  Check,
  RefreshCw,
  Receipt,
  Users,
  Building,
  Zap,
  ShieldAlert,
} from 'lucide-react';

export interface PosCartItem {
  cartItemId: string; // e.g. `${product.id}_SALE` or `${product.id}_REPLACEMENT`
  product: Product;
  quantity: number;
  freeQuantity?: number; // ফ্রি / বোনাস পিস (ফ্রি স্কিম হিসাব)
  unitPrice: number;
  itemType: 'SALE' | 'REPLACEMENT';
  replacementReason?: string;
}

interface PosInvoiceViewProps {
  onOpenPhonebookModal: () => void;
}

export const PosInvoiceView: React.FC<PosInvoiceViewProps> = ({ onOpenPhonebookModal }) => {
  const {
    language,
    currentRole,
    currentUser,
    users,
    products,
    retailers,
    orders,
    suppliers,
    supplierLedger,
    createOrder,
    deleteOrder,
    addProduct,
    updateProduct,
    deleteProduct,
    mergeAllDuplicateProducts,
    updateRetailer,
    openRefSwitcher,
    activeAdminEnterprise,
    activeAdminPhone,
    businessProfile,
    openBusinessProfile,
    openResetModal,
    phoneContacts,
    addPhoneContact,
    addRetailerFromPhonebook,
    openMemoKhataScanner,
    syncRoleTransactionsToCloud,
    refreshAllDataFromCloud,
    openStaffSyncModal,
    cashCounter,
    cashDSR,
    dsrOrdersCashCollected,
    expenses,
    openExpenseModal,
    deleteExpense,
    totalExpenses,
    grossProfit,
    netRealizedProfit,
  } = useWholesale();

  const t = translations[language];

  // Active View Tab
  const [activeTab, setActiveTab] = useState<'POS' | 'INVOICES' | 'PRODUCTS' | 'EXPENSES'>('POS');

  // Sale Mode: Wholesale (default) or Retail (খুচরা বিক্রয়)
  const [saleMode, setSaleMode] = useState<'WHOLESALE' | 'RETAIL'>('WHOLESALE');

  // Device Phonebook & Contact Picker Modal State
  const [isDeviceContactModalOpen, setIsDeviceContactModalOpen] = useState<boolean>(false);

  // Admin Sales Price Bulk & Single Modal State
  const [isAdminPriceModalOpen, setIsAdminPriceModalOpen] = useState<boolean>(false);
  const [adminPriceTargetProductId, setAdminPriceTargetProductId] = useState<string | null>(null);

  // Product Challan / Invoice Breakdown Modal State
  const [selectedProductForChallans, setSelectedProductForChallans] = useState<Product | null>(null);
  const [isProductChallanBreakdownOpen, setIsProductChallanBreakdownOpen] = useState<boolean>(false);
  const [mergeFeedbackMsg, setMergeFeedbackMsg] = useState<string | null>(null);

  const [selectedRetailerId, setSelectedRetailerId] = useState<string>(retailers[0]?.id || '');
  const [customerSearchQuery, setCustomerSearchQuery] = useState<string>('');
  const [isCustomerDropdownOpen, setIsCustomerDropdownOpen] = useState<boolean>(false);
  const [searchProduct, setSearchProduct] = useState<string>('');
  const [selectedCompany, setSelectedCompany] = useState<string>('ALL');
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');
  // Quick Filter for Product Grid (All, In Cart Sale, In Cart Replacement, In Stock)
  const [cartFilterMode, setCartFilterMode] = useState<'ALL' | 'IN_CART_SALE' | 'IN_CART_REPLACE' | 'IN_STOCK'>('ALL');
  // Responsive / Custom Gallery Grid Columns (Auto, 1, 2, 3, 4, 5)
  const [galleryCols, setGalleryCols] = useState<'AUTO' | 1 | 2 | 3 | 4 | 5>('AUTO');

  // Cart: Array of PosCartItem supporting Sales (+) and Market Replacement (-)
  const [cart, setCart] = useState<PosCartItem[]>([]);
  const [editingOrderForRevision, setEditingOrderForRevision] = useState<OrderInvoice | null>(null);
  const [isEditOrderModalOpen, setIsEditOrderModalOpen] = useState<boolean>(false);

  const [discountPercent, setDiscountPercent] = useState<number>(0);
  const [paymentType, setPaymentType] = useState<'CASH' | 'CREDIT' | 'PARTIAL'>('CASH');
  const [paidAmountInput, setPaidAmountInput] = useState<number>(0);
  const [receivedAmountInput, setReceivedAmountInput] = useState<string>('');
  const [saleDate, setSaleDate] = useState<string>(getTodayDateString());
  const [createdMemo, setCreatedMemo] = useState<any | null>(null);

  // Admin access & Admin Profit PDF mode state
  const isAdmin = currentRole === 'admin' || currentUser?.role === 'admin';
  const [isAdminProfitPdfMode, setIsAdminProfitPdfMode] = useState<boolean>(true);

  const getSequentialInvoiceNo = (targetDate: string, existingOrders: OrderInvoice[]) => {
    const cleanDate = targetDate.replace(/-/g, '');
    const prefix = `INV-${cleanDate}-`;
    let maxSeq = 0;
    existingOrders.forEach((o) => {
      const inv = (o.invoiceNo || o.invoiceNumber || '').trim();
      if (inv.startsWith(prefix)) {
        const remainder = inv.slice(prefix.length);
        const parsed = parseInt(remainder, 10);
        if (!isNaN(parsed) && parsed > maxSeq) {
          maxSeq = parsed;
        }
      }
    });
    return `${prefix}${String(maxSeq + 1).padStart(3, '0')}`;
  };

  // Invoice Number & Creator Assignment States
  const [customInvoiceNo, setCustomInvoiceNo] = useState<string>(() => {
    return getSequentialInvoiceNo(getTodayDateString(), orders);
  });
  const [selectedCreatorId, setSelectedCreatorId] = useState<string>(currentUser.id);
  // Auto-filter based on active role: default to 'ALL' so all transaction memos are immediately visible
  const [creatorFilter, setCreatorFilter] = useState<string>('ALL');

  // When switching roles, keep 'ALL' as primary view to prevent hiding transactions
  useEffect(() => {
    // If user has specific filter selected, preserve, otherwise ensure ALL is default
    if (!creatorFilter) {
      setCreatorFilter('ALL');
    }
  }, [currentRole]);

  // Keep creator in sync with active user
  useEffect(() => {
    setSelectedCreatorId(currentUser.id);
  }, [currentUser.id]);

  // Customer states for Retail and Wholesale
  const [retailCustomerName, setRetailCustomerName] = useState<string>('সাধারণ খুচরা ক্রেতা');
  const [retailCustomerPhone, setRetailCustomerPhone] = useState<string>('');
  const [wholesaleRetailerName, setWholesaleRetailerName] = useState<string>('');
  const [wholesaleRetailerPhone, setWholesaleRetailerPhone] = useState<string>('');

  // Keep invoice number synced with date selection and sequential counter
  useEffect(() => {
    setCustomInvoiceNo(getSequentialInvoiceNo(saleDate, orders));
  }, [saleDate, orders.length]);

  const regenerateInvoiceNo = () => {
    setCustomInvoiceNo(getSequentialInvoiceNo(saleDate, orders));
  };

  const isDuplicateInvoice = Boolean(
    customInvoiceNo.trim() &&
    orders.some(
      (o) => (o.invoiceNo || o.invoiceNumber || '').trim().toLowerCase() === customInvoiceNo.trim().toLowerCase()
    )
  );

  // Invoices Search & Date Filtering
  const [searchInvoice, setSearchInvoice] = useState<string>('');
  const [invoiceDateFilter, setInvoiceDateFilter] = useState<string>('ALL');
  const [selectedInvoiceForView, setSelectedInvoiceForView] = useState<any | null>(null);
  const [pdfPreviewResult, setPdfPreviewResult] = useState<PdfDocumentResult | null>(null);
  
  // Deletion Confirmation Modal State
  const [deletingOrder, setDeletingOrder] = useState<any | null>(null);
  const [restoreStockOnDelete, setRestoreStockOnDelete] = useState<boolean>(true);
  const [actionSuccessMsg, setActionSuccessMsg] = useState<string | null>(null);

  // Dedicated Role-Based Cloud Sync (DSR / Counter / Admin update)
  const [isSyncingRole, setIsSyncingRole] = useState<boolean>(false);
  const [syncRoleFeedback, setSyncRoleFeedback] = useState<string | null>(null);

  const handleSyncRoleTransactions = async () => {
    setIsSyncingRole(true);
    setSyncRoleFeedback(null);
    try {
      const res = await syncRoleTransactionsToCloud(currentRole as any);
      if (res.success) {
        setSyncRoleFeedback(res.message);
        setActionSuccessMsg(res.message);
        setTimeout(() => setSyncRoleFeedback(null), 6000);
      } else {
        alert(res.message);
      }
    } catch (e: any) {
      alert(e.message || 'Sync error');
    } finally {
      setIsSyncingRole(false);
    }
  };

  // Product Edit / Add Modal State
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [isAddProductOpen, setIsAddProductOpen] = useState<boolean>(false);
  const [deletingProduct, setDeletingProduct] = useState<Product | null>(null);
  const [isPhotoInboxOpen, setIsPhotoInboxOpen] = useState<boolean>(false);
  const [isStockPhotoManagerOpen, setIsStockPhotoManagerOpen] = useState<boolean>(false);
  const [stockPhotoTargetProductId, setStockPhotoTargetProductId] = useState<string | null>(null);
  const [productForm, setProductForm] = useState({
    name: '',
    brand: '',
    category: 'General',
    sku: '',
    unit: 'pcs',
    costPrice: 0,
    wholesalePrice: 0,
    retailPrice: 0,
    stockQuantity: 0,
    lowStockThreshold: 10,
    image: '',
  });

  // Product Add/Edit Form Camera state
  const [isFormCameraOpen, setIsFormCameraOpen] = useState<boolean>(false);
  const [isFormCompressing, setIsFormCompressing] = useState<boolean>(false);
  const formVideoRef = useRef<HTMLVideoElement | null>(null);
  const formStreamRef = useRef<MediaStream | null>(null);
  const formFileInputRef = useRef<HTMLInputElement | null>(null);

  const handleStartFormCamera = async () => {
    try {
      if (formStreamRef.current) {
        formStreamRef.current.getTracks().forEach((t) => t.stop());
      }
      setIsFormCameraOpen(true);
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } },
      });
      formStreamRef.current = stream;
      if (formVideoRef.current) {
        formVideoRef.current.srcObject = stream;
        formVideoRef.current.play();
      }
    } catch (err) {
      console.warn('Form camera error:', err);
      setIsFormCameraOpen(false);
      formFileInputRef.current?.click();
    }
  };

  const handleStopFormCamera = () => {
    if (formStreamRef.current) {
      formStreamRef.current.getTracks().forEach((t) => t.stop());
      formStreamRef.current = null;
    }
    if (formVideoRef.current) {
      formVideoRef.current.srcObject = null;
    }
    setIsFormCameraOpen(false);
  };

  const handleFormSnapPhoto = async () => {
    if (!formVideoRef.current) return;
    try {
      setIsFormCompressing(true);
      const video = formVideoRef.current;
      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth || 640;
      canvas.height = video.videoHeight || 480;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
        const compressed = await compressImage(dataUrl, 640, 640, 0.75);
        setProductForm((prev) => ({ ...prev, image: compressed }));
      }
    } catch (err) {
      console.error('Snapshot error:', err);
    } finally {
      setIsFormCompressing(false);
      handleStopFormCamera();
    }
  };

  const handleFormFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setIsFormCompressing(true);
      const compressed = await compressImage(file, 640, 640, 0.75);
      setProductForm((prev) => ({ ...prev, image: compressed }));
    } catch (err) {
      console.error('Upload compress error:', err);
    } finally {
      setIsFormCompressing(false);
      if (e.target) e.target.value = '';
    }
  };

  // Add multiple photo inbox entries to POS cart
  const handleAddPhotoEntriesToCart = (entries: PhotoInboxEntry[]) => {
    setCart((prev) => {
      let updated = [...prev];
      entries.forEach((entry) => {
        const itemKey = `${entry.productId}_SALE`;
        const existing = updated.find((item) => item.cartItemId === itemKey);
        if (existing) {
          updated = updated.map((item) =>
            item.cartItemId === itemKey
              ? { ...item, quantity: item.quantity + entry.quantity, unitPrice: entry.unitPrice }
              : item
          );
        } else {
          updated.push({
            cartItemId: itemKey,
            product: entry.product,
            quantity: entry.quantity,
            unitPrice: entry.unitPrice,
            itemType: 'SALE',
          });
        }
      });
      return updated;
    });
  };

  // Unlisted / Non-stock Item Quick Entry Modal State (স্টকে নাম না থাকা পণ্য বা মার্কেট ফেরত পণ্য ০ টাকা ও ০ কোয়ান্টিটিতে যোগ)
  const [isAddUnlistedModalOpen, setIsAddUnlistedModalOpen] = useState<boolean>(false);
  const [unlistedForm, setUnlistedForm] = useState({
    name: '',
    brand: '',
    category: 'Unlisted',
    unit: 'pcs',
    price: 0,
    quantity: 0,
    itemType: 'REPLACEMENT' as 'SALE' | 'REPLACEMENT',
    reason: 'মার্কেট থেকে রিপ্লেস ফেরত',
    saveToCatalog: false,
  });

  const handleAddUnlistedItemToCart = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const cleanName = unlistedForm.name.trim() || (unlistedForm.itemType === 'REPLACEMENT' ? 'মার্কেট ফেরত আনলিস্টেড পণ্য' : 'কাস্টম আনলিস্টেড পণ্য');
    const cleanQty = Math.max(0, Number(unlistedForm.quantity) || 0);
    const cleanPrice = Math.max(0, Number(unlistedForm.price) || 0);

    const customProd: Product = {
      id: `unlisted_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
      name: cleanName,
      bnName: cleanName,
      brand: unlistedForm.brand.trim() || 'নন-স্টক',
      sku: `UNL-${Date.now().toString().slice(-4)}`,
      category: unlistedForm.category || 'General',
      bnCategory: 'সাধারণ',
      unit: unlistedForm.unit || 'pcs',
      bnUnit: unlistedForm.unit === 'box' ? 'বক্স' : 'পিস',
      costPrice: 0,
      wholesalePrice: cleanPrice,
      retailPrice: cleanPrice,
      mrp: cleanPrice,
      supplierId: 'sup_general',
      supplierName: 'মার্কেট / লোকাল',
      minOrderQty: 1,
      stockQuantity: 0,
      lowStockThreshold: 0,
    };

    if (unlistedForm.saveToCatalog) {
      addProduct(customProd);
    }

    const itemKey = `${customProd.id}_${unlistedForm.itemType}`;
    setCart((prev) => [
      ...prev,
      {
        cartItemId: itemKey,
        product: customProd,
        quantity: cleanQty,
        unitPrice: cleanPrice,
        itemType: unlistedForm.itemType,
        replacementReason: unlistedForm.itemType === 'REPLACEMENT' ? (unlistedForm.reason || 'মার্কেট থেকে রিপ্লেস ফেরত') : undefined,
      },
    ]);

    showNotification(
      language === 'bn'
        ? `"${cleanName}" (${cleanQty} ${customProd.unit}, ৳${cleanPrice}) সফলভাবে ইনভয়েসে যুক্ত হয়েছে!`
        : `Added unlisted item "${cleanName}" (${cleanQty} ${customProd.unit}, ৳${cleanPrice}) to invoice!`,
      'success'
    );

    setIsAddUnlistedModalOpen(false);
    setUnlistedForm({
      name: '',
      brand: '',
      category: 'Unlisted',
      unit: 'pcs',
      price: 0,
      quantity: 0,
      itemType: 'REPLACEMENT',
      reason: 'মার্কেট থেকে রিপ্লেস ফেরত',
      saveToCatalog: false,
    });
  };

  // Retailer Edit Phone Modal
  const [editingRetailer, setEditingRetailer] = useState<Retailer | null>(null);
  const [retailerPhoneForm, setRetailerPhoneForm] = useState({
    phone: '',
    ownerName: '',
    shopName: '',
    route: '',
    creditLimit: 0,
  });

  const companies = [
    'ALL',
    ...Array.from(
      new Set(
        products
          .map((p) => p.supplierName || p.brand)
          .filter((name): name is string => Boolean(name && name.trim()))
      )
    ),
  ];

  const availableProductsForCategory =
    selectedCompany === 'ALL'
      ? products
      : products.filter(
          (p) =>
            (p.brand || '').toLowerCase().includes(selectedCompany.toLowerCase()) ||
            (p.supplierName || '').toLowerCase().includes(selectedCompany.toLowerCase())
        );

  const categories = ['ALL', ...Array.from(new Set(availableProductsForCategory.map((p) => p.category)))];

  const filteredProducts = products.filter((p) => {
    const prodBrand = (p.brand || '').toLowerCase();
    const prodSupplier = (p.supplierName || '').toLowerCase();
    const term = searchProduct.toLowerCase();

    const matchesSearch =
      !term ||
      p.name.toLowerCase().includes(term) ||
      (p.bnName && p.bnName.toLowerCase().includes(term)) ||
      p.sku.toLowerCase().includes(term) ||
      prodBrand.includes(term) ||
      prodSupplier.includes(term);

    const matchesCompany =
      selectedCompany === 'ALL' ||
      prodBrand.includes(selectedCompany.toLowerCase()) ||
      prodSupplier.includes(selectedCompany.toLowerCase());

    const matchesCat = categoryFilter === 'ALL' || p.category === categoryFilter;

    let matchesCartFilter = true;
    if (cartFilterMode === 'IN_CART_SALE') {
      matchesCartFilter = cart.some((item) => item.product.id === p.id && item.itemType === 'SALE');
    } else if (cartFilterMode === 'IN_CART_REPLACE') {
      matchesCartFilter = cart.some((item) => item.product.id === p.id && item.itemType === 'REPLACEMENT');
    } else if (cartFilterMode === 'IN_STOCK') {
      matchesCartFilter = (p.stockQuantity || 0) > 0;
    }

    return matchesSearch && matchesCompany && matchesCat && matchesCartFilter;
  });

  const selectedRetailer =
    retailers.find((r) => r.id === selectedRetailerId) || retailers[0];

  // Auto sync wholesale inputs when retailer selection changes
  useEffect(() => {
    if (selectedRetailer) {
      setWholesaleRetailerName(selectedRetailer.shopName || selectedRetailer.name || '');
      setWholesaleRetailerPhone(selectedRetailer.phone || '');
    }
  }, [selectedRetailer]);

  // Customer & Phonebook match filtering with Bangla numeral & clean phone support (খোঁজা যাবে প্রতিষ্ঠানের নাম, কাস্টমারের নাম ও মোবাইল নম্বর দিয়ে)
  const matchingRetailers = retailers.filter((r) => {
    if (!customerSearchQuery.trim()) return false;
    const q = customerSearchQuery.toLowerCase().trim();
    const cleanDigits = sanitizePhoneNumber(customerSearchQuery);
    const phoneMatches = cleanDigits.length >= 2 && r.phone.includes(cleanDigits);
    return (
      (r.shopName || '').toLowerCase().includes(q) ||
      (r.bnShopName || '').toLowerCase().includes(q) ||
      (r.ownerName || '').toLowerCase().includes(q) ||
      (r.name || '').toLowerCase().includes(q) ||
      (r.bnName || '').toLowerCase().includes(q) ||
      (r.phone || '').includes(q) ||
      phoneMatches
    );
  });

  const matchingPhoneContacts = phoneContacts.filter((c) => {
    if (!customerSearchQuery.trim()) return false;
    const q = customerSearchQuery.toLowerCase().trim();
    const cleanDigits = sanitizePhoneNumber(customerSearchQuery);
    const phoneMatches = cleanDigits.length >= 2 && c.phone.includes(cleanDigits);
    return (
      (c.name || '').toLowerCase().includes(q) ||
      (c.phone || '').includes(q) ||
      phoneMatches ||
      (c.organization && c.organization.toLowerCase().includes(q))
    );
  });

  const handleSelectRetailerDirect = (r: Retailer) => {
    setSelectedRetailerId(r.id);
    setCustomerSearchQuery('');
    setIsCustomerDropdownOpen(false);
  };

  // Handler when a contact is selected from the unified Device Contact Picker Modal
  const handleSelectContactFromModal = (contact: { name: string; phone: string; organization?: string; id?: string; address?: string }) => {
    const cleanPhone = sanitizePhoneNumber(contact.phone);
    if (!cleanPhone) {
      showNotification(language === 'bn' ? 'সঠিক ফোন নম্বর পাওয়া যায়নি' : 'Invalid phone number', 'error');
      return;
    }
    const existing = retailers.find(
      (r) => sanitizePhoneNumber(r.phone) === cleanPhone
    );
    if (existing) {
      setSelectedRetailerId(existing.id);
      showNotification(
        language === 'bn'
          ? `ফোনবুক থেকে "${existing.shopName || existing.name}" (${existing.phone}) মেমোতে নির্বাচিত হয়েছে!`
          : `Selected "${existing.shopName || existing.name}" from contacts!`,
        'success'
      );
    } else {
      const orgName = contact.organization || `${contact.name || 'গ্রাহক'} স্টোর`;
      const newContact: PhoneContact = {
        id: contact.id || `con_${Date.now()}`,
        name: contact.name || `গ্রাহক ${cleanPhone.slice(-4)}`,
        phone: cleanPhone,
        organization: orgName,
        address: contact.address || 'কাউন্টার সেল',
      };
      addPhoneContact(newContact);
      addRetailerFromPhonebook(newContact, orgName, 'কাউন্টার সেল', 30000);
      setTimeout(() => {
        const newlyAdded = retailers.find(
          (r) => sanitizePhoneNumber(r.phone) === cleanPhone
        );
        if (newlyAdded) setSelectedRetailerId(newlyAdded.id);
      }, 60);
      showNotification(
        language === 'bn'
          ? `নতুন কাস্টমার "${contact.name}" (${cleanPhone}) মেমোতে যুক্ত ও নির্বাচিত হয়েছে!`
          : `Added and selected "${contact.name}" (${cleanPhone})!`,
        'success'
      );
    }
    setCustomerSearchQuery('');
    setIsCustomerDropdownOpen(false);
    setIsDeviceContactModalOpen(false);
  };

  // 1-Click Select Walk-in Retail Cash Customer (সাধারণ খুচরা ক্রেতা)
  const handleSelectWalkInRetailCustomer = () => {
    const walkIn = retailers.find(
      (r) => r.id === 'ret_walk_in_retail' || r.phone === '01700000000' || (r.shopName || '').includes('খুচরা')
    );
    if (walkIn) {
      setSelectedRetailerId(walkIn.id);
    } else {
      const newRetailer: Retailer = {
        id: 'ret_walk_in_retail',
        name: 'সাধারণ খুচরা ক্রেতা',
        bnName: 'সাধারণ খুচরা ক্রেতা',
        shopName: 'খুচরা কাউন্টার সেল',
        bnShopName: 'খুচরা কাউন্টার সেল',
        ownerName: 'খুচরা গ্রাহক',
        phone: '01700000000',
        address: 'কাউন্টার ক্যাশ সেল',
        area: 'লোকাল',
        route: 'কাউন্টার সেল',
        creditLimit: 0,
        outstandingDue: 0,
        currentDue: 0,
        totalPurchases: 0,
        contactSource: 'app',
      };
      addPhoneContact({
        name: 'সাধারণ খুচরা ক্রেতা',
        phone: '01700000000',
        organization: 'খুচরা কাউন্টার সেল',
        address: 'কাউন্টার ক্যাশ সেল',
      });
      addRetailerFromPhonebook(newRetailer, 'খুচরা কাউন্টার সেল', 'কাউন্টার সেল', 0);
      setSelectedRetailerId('ret_walk_in_retail');
    }
    setCustomerSearchQuery('');
    setIsCustomerDropdownOpen(false);
    showNotification(
      language === 'bn'
        ? 'সাধারণ খুচরা ক্রেতা (Walk-in Customer) মেমোতে নির্বাচিত হয়েছে!'
        : 'Selected Walk-in Retail Customer!',
      'info'
    );
  };

  const handleSelectPhoneContactDirect = (contact: PhoneContact) => {
    const existing = retailers.find((r) => r.phone === contact.phone);
    if (existing) {
      setSelectedRetailerId(existing.id);
    } else {
      addRetailerFromPhonebook(
        contact,
        contact.organization || `${contact.name} Store`,
        'Route A - Dhanmondi',
        30000
      );
      setTimeout(() => {
        const newlyAdded = retailers.find((r) => r.phone === contact.phone);
        if (newlyAdded) setSelectedRetailerId(newlyAdded.id);
      }, 50);
    }
    setCustomerSearchQuery('');
    setIsCustomerDropdownOpen(false);
    showNotification(
      language === 'bn'
        ? `ফোনবুক থেকে "${contact.name}" (${contact.phone}) মেমোতে নির্বাচিত হয়েছে!`
        : `Selected "${contact.name}" (${contact.phone}) from phonebook!`
    );
  };

  const handleQuickAddTypedCustomer = () => {
    const query = customerSearchQuery.trim();
    if (!query) return;

    const isDigits = /^[\d+]+$/.test(query.replace(/[-\s]/g, ''));
    const newPhone = isDigits ? query : `017${Math.floor(10000000 + Math.random() * 90000000)}`;
    const newName = isDigits ? `গ্রাহক ${query.slice(-4)}` : query;

    const newContact: PhoneContact = {
      id: `con_${Date.now()}`,
      name: newName,
      phone: newPhone,
      organization: `${newName} Store`,
      address: 'কাউন্টার সেল',
    };

    addPhoneContact(newContact);
    addRetailerFromPhonebook(newContact, `${newName} Store`, 'Route A - Dhanmondi', 30000);

    setTimeout(() => {
      const newlyAdded = retailers.find((r) => r.phone === newPhone);
      if (newlyAdded) setSelectedRetailerId(newlyAdded.id);
    }, 50);

    setCustomerSearchQuery('');
    setIsCustomerDropdownOpen(false);
    showNotification(
      language === 'bn'
        ? `নতুন কাস্টমার "${newName}" (${newPhone}) সফলভাবে ফোনবুকে সেভ ও মেমোতে নির্বাচিত হয়েছে!`
        : `Created and selected "${newName}" (${newPhone})!`
    );
  };

  // Launch Native Mobile Device Contact Picker directly for POS Memo
  const handlePickMobileDeviceContactForPos = async () => {
    const res = await pickContactFromDevice(false);
    if (res.success && res.contacts && res.contacts.length > 0) {
      const c = res.contacts[0];
      const existing = retailers.find((r) => r.phone === c.phone);
      if (existing) {
        setSelectedRetailerId(existing.id);
        showNotification(
          language === 'bn'
            ? `মোবাইল থেকে "${existing.shopName || existing.name}" (${existing.phone}) মেমোতে নির্বাচিত হয়েছে!`
            : `Selected "${existing.shopName || existing.name}" from mobile contacts!`,
          'success'
        );
      } else {
        const newContact: PhoneContact = {
          id: `con_${Date.now()}`,
          name: c.name || `গ্রাহক ${c.phone.slice(-4)}`,
          phone: c.phone,
          organization: c.organization || `${c.name || 'গ্রাহক'} স্টোর`,
          address: c.address || 'কাউন্টার সেল',
        };
        addPhoneContact(newContact);
        addRetailerFromPhonebook(newContact, newContact.organization || 'কাস্টমার', 'Route A - Dhanmondi', 30000);
        setTimeout(() => {
          const newlyAdded = retailers.find((r) => r.phone === c.phone);
          if (newlyAdded) setSelectedRetailerId(newlyAdded.id);
        }, 60);
        showNotification(
          language === 'bn'
            ? `মোবাইল কন্টাক্ট থেকে "${c.name}" (${c.phone}) সফলভাবে ফোনবুকে সেভ ও মেমোতে যুক্ত হয়েছে!`
            : `Added and selected "${c.name}" (${c.phone}) from mobile contacts!`,
          'success'
        );
      }
      setCustomerSearchQuery('');
      setIsCustomerDropdownOpen(false);
    } else if (res.isIframeBlocked) {
      onOpenPhonebookModal();
      showNotification(
        language === 'bn'
          ? 'ব্রাউজার প্রিভিউতে সরাসরি ফোনবুক তালিকা থেকে সার্চ করুন বা নতুন ট্যাবে ফুলস্ক্রিন খুলুন।'
          : 'Please search phonebook contacts or open in standalone window.',
        'info'
      );
    } else if (!isContactPickerSupported()) {
      onOpenPhonebookModal();
      showNotification(
        language === 'bn'
          ? 'সংরক্ষিত ফোনবুক থেকে সার্চ করে কাস্টমার সিলেক্ট করুন।'
          : 'Search phonebook contacts below.',
        'info'
      );
    } else if (res.error && !res.error.includes('cancel') && !res.error.includes('No contact')) {
      showNotification(res.error, 'error');
    }
  };

  // Quick Paste phone number from clipboard for instant invoice creation
  const handlePasteFromClipboardForPos = async () => {
    try {
      if (navigator.clipboard && navigator.clipboard.readText) {
        const text = await navigator.clipboard.readText();
        const cleaned = sanitizePhoneNumber(text);
        if (cleaned && cleaned.length >= 10) {
          const existing = retailers.find((r) => r.phone === cleaned);
          if (existing) {
            setSelectedRetailerId(existing.id);
            showNotification(
              language === 'bn'
                ? `পেস্ট করা নম্বরে (${cleaned}) "${existing.shopName || existing.name}" মেমোতে নির্বাচন করা হয়েছে!`
                : `Matched & selected "${existing.shopName}"!`,
              'success'
            );
          } else {
            const inPhonebook = phoneContacts.find((c) => c.phone === cleaned);
            const contactName = inPhonebook ? inPhonebook.name : `কাস্টমার ${cleaned.slice(-4)}`;
            const newContact: PhoneContact = {
              id: `con_${Date.now()}`,
              name: contactName,
              phone: cleaned,
              organization: inPhonebook?.organization || 'কাস্টমার',
              address: inPhonebook?.address || 'কাউন্টার সেল',
            };
            if (!inPhonebook) addPhoneContact(newContact);
            addRetailerFromPhonebook(newContact, newContact.organization, 'Route A - Dhanmondi', 30000);
            setTimeout(() => {
              const newlyAdded = retailers.find((r) => r.phone === cleaned);
              if (newlyAdded) setSelectedRetailerId(newlyAdded.id);
            }, 60);
            showNotification(
              language === 'bn'
                ? `ক্লিপবোর্ড থেকে নম্বর (${cleaned}) মেমোতে যুক্ত হয়েছে!`
                : `Pasted & linked customer (${cleaned})!`,
              'success'
            );
          }
          return;
        }
      }
      showNotification(
        language === 'bn' ? 'ক্লিপবোর্ডে কোনো মোবাইল নম্বর পাওয়া যায়নি।' : 'No phone number in clipboard.',
        'info'
      );
    } catch {
      showNotification(
        language === 'bn' ? 'ক্লিপবোর্ড পড়ার অনুমতি পাওয়া যায়নি। সরাসরি নম্বর টাইপ করুন।' : 'Clipboard access denied.',
        'error'
      );
    }
  };

  // Handle batch sales price updates from AdminSalesPriceModal
  const handleBatchUpdatePrices = async (
    updates: { productId: string; wholesalePrice?: number; retailPrice?: number; costPrice?: number }[]
  ) => {
    for (const u of updates) {
      const existing = products.find((p) => p.id === u.productId);
      if (existing) {
        updateProduct({
          ...existing,
          ...(u.wholesalePrice !== undefined && { wholesalePrice: u.wholesalePrice }),
          ...(u.retailPrice !== undefined && { retailPrice: u.retailPrice }),
          ...(u.costPrice !== undefined && { costPrice: u.costPrice }),
        });
      }
    }

    setCart((prev) =>
      prev.map((item) => {
        const u = updates.find((up) => up.productId === item.product.id);
        if (u) {
          const newPrice =
            saleMode === 'RETAIL'
              ? (u.retailPrice ?? item.unitPrice)
              : (u.wholesalePrice ?? item.unitPrice);
          return {
            ...item,
            unitPrice: newPrice,
            product: {
              ...item.product,
              ...(u.wholesalePrice !== undefined && { wholesalePrice: u.wholesalePrice }),
              ...(u.retailPrice !== undefined && { retailPrice: u.retailPrice }),
              ...(u.costPrice !== undefined && { costPrice: u.costPrice }),
            },
          };
        }
        return item;
      })
    );

    showNotification(
      language === 'bn'
        ? `${updates.length} টি পণ্যের বিক্রয় মূল্য সফলভাবে পরিবর্তন ও সেভ হয়েছে!`
        : `Sales prices updated for ${updates.length} items!`,
      'success'
    );
  };

  const [isCreatingNewRetailer, setIsCreatingNewRetailer] = useState(false);

  const handleOpenCreateCustomerModal = () => {
    const isDigits = /^[\d+]+$/.test(customerSearchQuery.replace(/[-\s]/g, ''));
    setRetailerPhoneForm({
      phone: isDigits ? customerSearchQuery : '',
      ownerName: !isDigits ? customerSearchQuery : '',
      shopName: !isDigits ? `${customerSearchQuery} Store` : '',
      route: 'Route A - Dhanmondi',
      creditLimit: 30000,
    });
    setIsCreatingNewRetailer(true);
    setEditingRetailer(null);
  };

  // Cart operations with Wholesale, Retail, and Market Replacement Minus Support
  const addToCart = (product: Product, type: 'SALE' | 'REPLACEMENT' = 'SALE') => {
    const defaultUnitPrice =
      saleMode === 'RETAIL'
        ? (product.retailPrice || product.mrp || Math.round(product.wholesalePrice * 1.15))
        : product.wholesalePrice;

    const itemKey = `${product.id}_${type}`;

    setCart((prev) => {
      const existing = prev.find((item) => item.cartItemId === itemKey);
      if (existing) {
        return prev.map((item) =>
          item.cartItemId === itemKey
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      } else {
        return [
          ...prev,
          {
            cartItemId: itemKey,
            product,
            quantity: 1,
            unitPrice: defaultUnitPrice,
            itemType: type,
            replacementReason: type === 'REPLACEMENT' ? 'মার্কেট থেকে রিপ্লেস ফেরত' : undefined,
          },
        ];
      }
    });
  };

  const toggleCartItemType = (cartItemId: string) => {
    setCart((prev) =>
      prev.map((item) => {
        if (item.cartItemId === cartItemId) {
          const newType: 'SALE' | 'REPLACEMENT' = item.itemType === 'SALE' ? 'REPLACEMENT' : 'SALE';
          return {
            ...item,
            cartItemId: `${item.product.id}_${newType}`,
            itemType: newType,
            replacementReason: newType === 'REPLACEMENT' ? (item.replacementReason || 'মার্কেট থেকে রিপ্লেস ফেরত') : undefined,
          };
        }
        return item;
      })
    );
  };

  const updateCartQty = (cartItemId: string, qty: number) => {
    if (qty < 0) {
      removeFromCart(cartItemId);
      return;
    }
    setCart((prev) =>
      prev.map((item) => (item.cartItemId === cartItemId ? { ...item, quantity: Math.max(0, qty) } : item))
    );
  };

  // Editable Unit Price for on-the-fly sales price customization in POS (0 Taka accepted)
  const updateCartUnitPrice = (cartItemId: string, price: number) => {
    setCart((prev) =>
      prev.map((item) =>
        item.cartItemId === cartItemId ? { ...item, unitPrice: Math.max(0, isNaN(price) ? 0 : price) } : item
      )
    );
  };

  // Free / Bonus pieces input for manual schemes (e.g. 10+1 free)
  const updateCartFreeQty = (cartItemId: string, freeQty: number) => {
    setCart((prev) =>
      prev.map((item) =>
        item.cartItemId === cartItemId ? { ...item, freeQuantity: Math.max(0, freeQty) } : item
      )
    );
  };

  const updateCartReplacementReason = (cartItemId: string, reason: string) => {
    setCart((prev) =>
      prev.map((item) =>
        item.cartItemId === cartItemId ? { ...item, replacementReason: reason } : item
      )
    );
  };

  // Toggle between Wholesale and Retail modes, auto-adjusting cart items' unit prices
  const handleToggleSaleMode = (newMode: 'WHOLESALE' | 'RETAIL') => {
    setSaleMode(newMode);
    if (cart.length > 0) {
      setCart((prev) =>
        prev.map((item) => {
          const newUnitPrice =
            newMode === 'RETAIL'
              ? (item.product.retailPrice || item.product.mrp || Math.round(item.product.wholesalePrice * 1.15))
              : item.product.wholesalePrice;
          return { ...item, unitPrice: newUnitPrice };
        })
      );
      showNotification(
        language === 'bn'
          ? newMode === 'RETAIL'
            ? 'খুচরা বিক্রয় মোড চালু হয়েছে — কার্টের পণ্যের খুচরা বিক্রয় দর প্রযোজ্য।'
            : 'পাইকারি বিক্রয় মোড চালু হয়েছে — কার্টের পণ্যের পাইকারি বিক্রয় দর প্রযোজ্য।'
          : `Switched to ${newMode} mode — cart prices updated.`,
        'info'
      );
    }
  };

  const removeFromCart = (cartItemId: string) => {
    setCart((prev) => prev.filter((item) => item.cartItemId !== cartItemId));
  };

  const clearCart = () => {
    setCart([]);
    setDiscountPercent(0);
    setPaidAmountInput(0);
    setReceivedAmountInput('');
    setCreatedMemo(null);
  };

  // Calculations: Sales (+) vs Market Replacement (-)
  const salesCartItems = cart.filter((item) => item.itemType === 'SALE');
  const replacementCartItems = cart.filter((item) => item.itemType === 'REPLACEMENT');

  const totalSalesAmount = salesCartItems.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);
  const totalReplacementAmount = replacementCartItems.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);

  // Subtotal is Sales (+) minus Market Replacement (-)
  const subtotal = Math.max(0, totalSalesAmount - totalReplacementAmount);
  const discountAmount = Math.round((subtotal * discountPercent) / 100);
  const grandTotal = Math.max(0, subtotal - discountAmount);

  // User request: কত টাকা গ্রহণ করল মেমোরে টাইপ করতে পারবেন যা সফটওয়্যার বিক্রয় দাম থেকে - (লস) বা + (লাভ) দেখাবে
  const effectiveReceivedAmount = receivedAmountInput !== '' ? Math.max(0, Number(receivedAmountInput)) : grandTotal;
  const priceDifference = (receivedAmountInput !== '' ? Number(receivedAmountInput) : grandTotal) - grandTotal;

  const actualPaidAmount =
    paymentType === 'CASH'
      ? effectiveReceivedAmount
      : paymentType === 'CREDIT'
      ? 0
      : paidAmountInput > 0
      ? paidAmountInput
      : effectiveReceivedAmount;

  const dueAmount = Math.max(0, grandTotal - actualPaidAmount);

  // Handle create order & invoice
  const handleCheckout = () => {
    if (cart.length === 0) {
      alert(language === 'bn' ? 'কার্টে কোনো পণ্য যোগ করা হয়নি!' : 'Cart is empty!');
      return;
    }

    if (saleMode === 'WHOLESALE' && !selectedRetailer && !wholesaleRetailerName.trim()) {
      alert(language === 'bn' ? 'হোলসেল অর্ডারের জন্য রিটেলারের নাম ও ফোন নম্বর দিন!' : 'Please enter retailer name & phone for wholesale sale!');
      return;
    }

    if (isDuplicateInvoice) {
      alert(
        language === 'bn'
          ? `এই ইনভয়েস নম্বরটি (${customInvoiceNo}) ইতিমধ্যে ব্যবহৃত হয়েছে! অনুগ্রহ করে নতুন নম্বর দিন বা 'নতুন নম্বর' বাটনে ক্লিক করুন।`
          : `Invoice number "${customInvoiceNo}" already exists! Please provide a unique number.`
      );
      return;
    }

    const assignedCreator = users.find((u) => u.id === selectedCreatorId) || currentUser;

    const totalSoldPieces = cart
      .filter((i) => i.itemType === 'SALE')
      .reduce((sum, i) => sum + i.quantity, 0);
    const totalReturnedPieces = cart
      .filter((i) => i.itemType === 'REPLACEMENT')
      .reduce((sum, i) => sum + i.quantity, 0);
    const netPieces = totalSoldPieces - totalReturnedPieces;
    const saleAmount = cart
      .filter((i) => i.itemType === 'SALE')
      .reduce((sum, i) => sum + i.quantity * i.unitPrice, 0);
    const repAmount = cart
      .filter((i) => i.itemType === 'REPLACEMENT')
      .reduce((sum, i) => sum + i.quantity * i.unitPrice, 0);
    const saleCost = cart
      .filter((i) => i.itemType === 'SALE')
      .reduce((sum, i) => sum + i.quantity * (i.product.costPrice || 0), 0);
    const repCost = cart
      .filter((i) => i.itemType === 'REPLACEMENT')
      .reduce((sum, i) => sum + i.quantity * (i.product.costPrice || 0), 0);
    // User formula: "মার্কেট রিফ্লেক্স পণ্য থেকে মুনাফাটাও মাইনাস হবে কারণ পন্য ফেরত আসার সাথে সাথে ওই পণ্য থেকে মুনাফাটাও টাকা কমে গেছে, তাই ইনভয়সে বিক্রির মুনাফা থেকে রিপ্নালেস মুনাফা মাইনাস হয়ে নীপা মুনাফা দেখাবে"
    const saleProfit = Math.max(0, saleAmount - saleCost);
    const repProfit = Math.max(0, repAmount - repCost);
    const totalProfitAmount = Math.max(0, saleProfit - repProfit - discountAmount);
    const totalCostAmount = Math.max(0, grandTotal - totalProfitAmount);

    const orderItems = cart.map((item) => {
      const isRep = item.itemType === 'REPLACEMENT';
      const lineVal = item.quantity * item.unitPrice;
      return {
        productId: item.product.id,
        productName: item.product.name,
        bnProductName: item.product.bnName,
        quantity: item.quantity,
        freeQuantity: item.freeQuantity || 0,
        unitPrice: item.unitPrice,
        costPrice: item.product.costPrice || 0,
        totalPrice: isRep ? -lineVal : lineVal,
        total: isRep ? -lineVal : lineVal,
        unit: item.product.unit,
        challanRefNo: item.product.latestChallanNo || (item.product.challanReferences && item.product.challanReferences[0]?.challanNo) || '',
        itemType: item.itemType,
        isReplacement: isRep,
        replacementReason: item.replacementReason,
      };
    });

    const finalInvoiceNo = customInvoiceNo.trim() || getSequentialInvoiceNo(saleDate, orders);

    let customerDisplayName = '';
    let shopDisplayName = '';
    let contactPhone = '';

    if (saleMode === 'RETAIL') {
      customerDisplayName = retailCustomerName.trim() || selectedRetailer?.ownerName || selectedRetailer?.name || 'সাধারণ খুচরা ক্রেতা';
      shopDisplayName = 'খুচরা বিক্রয়';
      contactPhone = retailCustomerPhone.trim() || selectedRetailer?.phone || '';
    } else {
      shopDisplayName = wholesaleRetailerName.trim() || selectedRetailer?.shopName || selectedRetailer?.name || 'পাইকারি রিটেইলার';
      customerDisplayName = selectedRetailer?.ownerName || shopDisplayName;
      contactPhone = wholesaleRetailerPhone.trim() || selectedRetailer?.phone || '';
    }

    const targetRetailerId = selectedRetailer?.id || (saleMode === 'RETAIL' ? 'retail-walk-in' : 'wholesale-custom');

    const order = createOrder({
      retailerId: targetRetailerId,
      retailerName: saleMode === 'RETAIL' ? customerDisplayName : `${shopDisplayName} (${customerDisplayName})`,
      customerName: customerDisplayName,
      shopName: shopDisplayName,
      retailerPhone: contactPhone,
      saleMode,
      invoiceNo: finalInvoiceNo,
      invoiceNumber: finalInvoiceNo,
      creatorId: assignedCreator.id,
      salesPersonId: assignedCreator.id,
      creatorRole: assignedCreator.role,
      creatorName: assignedCreator.name,
      creatorPhone: assignedCreator.phone,
      salesPersonRole: assignedCreator.role,
      salesPersonName: assignedCreator.name,
      items: orderItems,
      totalSalesAmount,
      totalReplacementAmount,
      hasReplacements: totalReplacementAmount > 0,
      totalSoldPieces,
      totalReturnedPieces,
      netPieces,
      totalCostAmount,
      totalProfitAmount,
      subtotal,
      discountAmount,
      totalAmount: grandTotal,
      memoReceivedAmount: effectiveReceivedAmount,
      priceDifference,
      paymentType,
      paymentMethod: paymentType === 'CREDIT' ? 'Credit' : 'Cash',
      paidAmount: actualPaidAmount,
      dueAmount,
      date: saleDate,
    });

    setCreatedMemo({
      ...order,
      memoReceivedAmount: effectiveReceivedAmount,
      priceDifference,
      retailer: selectedRetailer || {
        id: targetRetailerId,
        name: customerDisplayName,
        shopName: shopDisplayName,
        phone: contactPhone,
        address: 'কাউন্টার',
        due: dueAmount,
      },
      customerName: customerDisplayName,
      shopName: shopDisplayName,
      retailerPhone: contactPhone,
      saleMode,
      creatorRole: assignedCreator.role,
      creatorName: assignedCreator.name,
    });

    setCart([]);
    const nextInvoiceNo = getSequentialInvoiceNo(saleDate, [...orders, order]);
    setCustomInvoiceNo(nextInvoiceNo);
    showNotification(
      language === 'bn'
        ? `মেমো #${finalInvoiceNo} সফলভাবে তৈরি হয়েছে (${assignedCreator.name})!`
        : `Invoice #${finalInvoiceNo} created successfully by ${assignedCreator.name}!`
    );
  };

  const handlePrint = () => {
    window.print();
  };

  const showNotification = (msg: string, _type?: 'success' | 'error' | 'info') => {
    setActionSuccessMsg(msg);
    setTimeout(() => setActionSuccessMsg(null), 4000);
  };

  // Confirm delete of mistaken order
  const handleConfirmDeleteOrder = () => {
    if (!deletingOrder) return;
    const res = deleteOrder(deletingOrder.id, restoreStockOnDelete);
    if (res.success) {
      showNotification(
        language === 'bn'
          ? `মেমো #${deletingOrder.invoiceNumber || deletingOrder.id.slice(-6)} সফলভাবে ডিলিট করা হয়েছে এবং স্টক সমন্বয় করা হয়েছে!`
          : `Invoice #${deletingOrder.invoiceNumber || deletingOrder.id.slice(-6)} successfully deleted & inventory adjusted!`
      );
    }
    setDeletingOrder(null);
    if (selectedInvoiceForView?.id === deletingOrder.id) {
      setSelectedInvoiceForView(null);
    }
  };

  // Open Edit Product Modal
  const handleOpenEditProduct = (prod: Product) => {
    setEditingProduct(prod);
    setProductForm({
      name: prod.name,
      brand: prod.brand || '',
      category: prod.category || 'General',
      sku: prod.sku,
      unit: prod.unit || 'pcs',
      costPrice: prod.costPrice,
      wholesalePrice: prod.wholesalePrice,
      retailPrice: prod.retailPrice || 0,
      stockQuantity: prod.stockQuantity,
      lowStockThreshold: prod.lowStockThreshold || 10,
      image: prod.image || '',
    });
  };

  // Save Product (Edit or New)
  const handleSaveProduct = (e: React.FormEvent) => {
    e.preventDefault();
    if (!productForm.name.trim()) return;

    if (editingProduct) {
      updateProduct({
        ...editingProduct,
        ...productForm,
      });
      showNotification(language === 'bn' ? 'প্রোডাক্ট তথ্য সফলভাবে আপডেট হয়েছে!' : 'Product updated successfully!');
      setEditingProduct(null);
    } else {
      addProduct({
        ...productForm,
        sku: productForm.sku || `SKU-${Date.now().toString().slice(-4)}`,
      });
      showNotification(language === 'bn' ? 'নতুন প্রোডাক্ট সফলভাবে যুক্ত হয়েছে!' : 'New product added successfully!');
      setIsAddProductOpen(false);
    }
  };

  // Confirm Delete Product
  const handleConfirmDeleteProduct = () => {
    if (!deletingProduct) return;
    deleteProduct(deletingProduct.id);
    showNotification(
      language === 'bn'
        ? `প্রোডাক্ট "${deletingProduct.name}" সফলভাবে ডিলিট করা হয়েছে!`
        : `Product "${deletingProduct.name}" deleted successfully!`
    );
    setDeletingProduct(null);
  };

  // Open Retailer Phone / Info Edit Modal
  const handleOpenEditRetailer = (ret: Retailer) => {
    setEditingRetailer(ret);
    setRetailerPhoneForm({
      phone: ret.phone,
      ownerName: ret.ownerName,
      shopName: ret.shopName,
      route: ret.route || '',
      creditLimit: ret.creditLimit || 0,
    });
  };

  // Save Retailer Edit or New Retailer Create
  const handleSaveRetailer = (e: React.FormEvent) => {
    e.preventDefault();
    if (isCreatingNewRetailer) {
      if (!retailerPhoneForm.phone) {
        showNotification(language === 'bn' ? 'দয়া করে মোবাইল নম্বর দিন' : 'Please provide phone number', 'error');
        return;
      }
      const cleanPhone = sanitizePhoneNumber(retailerPhoneForm.phone);
      const newRetName = retailerPhoneForm.ownerName || retailerPhoneForm.shopName || 'নতুন গ্রাহক';
      const newRetShop = retailerPhoneForm.shopName || `${newRetName} স্টোর`;

      addRetailerFromPhonebook(
        {
          id: `con_${Date.now()}`,
          name: newRetName,
          phone: cleanPhone,
          organization: newRetShop,
          address: 'ঢাকা',
        },
        newRetShop,
        retailerPhoneForm.route || 'Route A - Dhanmondi',
        Number(retailerPhoneForm.creditLimit) || 30000
      );

      setTimeout(() => {
        const found = retailers.find((r) => r.phone === cleanPhone);
        if (found) setSelectedRetailerId(found.id);
      }, 80);

      showNotification(
        language === 'bn'
          ? `নতুন গ্রাহক "${newRetShop}" (${cleanPhone}) সফলভাবে যুক্ত ও মেমোতে নির্বাচিত হয়েছে!`
          : `Customer "${newRetShop}" created and selected!`,
        'success'
      );
      setIsCreatingNewRetailer(false);
      return;
    }

    if (!editingRetailer) return;

    updateRetailer({
      ...editingRetailer,
      phone: sanitizePhoneNumber(retailerPhoneForm.phone),
      ownerName: retailerPhoneForm.ownerName,
      shopName: retailerPhoneForm.shopName,
      route: retailerPhoneForm.route,
      creditLimit: retailerPhoneForm.creditLimit,
    });

    showNotification(
      language === 'bn'
        ? 'রিটেইলারের ফোন নাম্বার ও তথ্য সফলভাবে পরিবর্তন করা হয়েছে!'
        : 'Retailer contact and details updated successfully!'
    );
    setEditingRetailer(null);
  };

  // Filter orders for history tab with 100% null safety
  const safeOrders = (orders || []).filter((o): o is OrderInvoice => Boolean(o && typeof o === 'object'));

  const adminOrdersCount = safeOrders.filter((o) => {
    const r = (o.creatorRole || o.salesPersonRole || '').toLowerCase();
    const n = (o.creatorName || o.salesPersonName || '').toLowerCase();
    return r === 'admin' || n.includes('admin');
  }).length;

  const dsrOrdersCount = safeOrders.filter((o) => {
    const r = (o.creatorRole || o.salesPersonRole || '').toLowerCase();
    const n = (o.creatorName || o.salesPersonName || '').toLowerCase();
    return r === 'dsr' || n.includes('dsr') || n.includes('razo') || n.includes('raju') || n.includes('রাজু');
  }).length;

  const counterOrdersCount = safeOrders.filter((o) => {
    const r = (o.creatorRole || o.salesPersonRole || '').toLowerCase();
    const n = (o.creatorName || o.salesPersonName || '').toLowerCase();
    return r === 'counter' || n.includes('counter') || n.includes('কাউন্টার') || (!r && !n.includes('admin') && !n.includes('dsr'));
  }).length;

  const filteredOrders = safeOrders.filter((o) => {
    const term = (searchInvoice || '').toLowerCase().trim();
    const invNo = (o.invoiceNumber || o.invoiceNo || o.id || '').toLowerCase();
    const retName = (o.retailerName || o.customerName || '').toLowerCase();
    const dateStr = (o.date || o.createdAt || '').toLowerCase();
    const creatorRole = (o.creatorRole || o.salesPersonRole || '').toLowerCase();
    const creatorName = (o.creatorName || o.salesPersonName || '').toLowerCase();

    // Match product names inside sales items safely
    const matchesItems =
      Array.isArray(o.items) &&
      o.items.some(
        (it) =>
          it &&
          ((it.name || '').toLowerCase().includes(term) ||
            (it.productName || '').toLowerCase().includes(term))
      );
    
    const matchesSearch =
      !term ||
      invNo.includes(term) ||
      retName.includes(term) ||
      dateStr.includes(term) ||
      creatorName.includes(term) ||
      creatorRole.includes(term) ||
      matchesItems;
    
    let matchesDate = true;
    if (invoiceDateFilter === 'TODAY') {
      matchesDate = dateStr.includes(getTodayDateString());
    } else if (invoiceDateFilter === 'YESTERDAY') {
      matchesDate = dateStr.includes(getYesterdayDateString());
    } else if (invoiceDateFilter !== 'ALL' && invoiceDateFilter !== '') {
      matchesDate = dateStr.includes(invoiceDateFilter);
    }

    let matchesCreator = true;
    if (creatorFilter !== 'ALL') {
      if (creatorFilter === 'admin') {
        matchesCreator =
          creatorRole === 'admin' ||
          (o as any).salesPersonRole === 'admin' ||
          creatorName.toLowerCase().includes('admin');
      } else if (creatorFilter === 'dsr') {
        matchesCreator =
          creatorRole === 'dsr' ||
          (o as any).salesPersonRole === 'dsr' ||
          creatorName.toLowerCase().includes('dsr') ||
          creatorName.toLowerCase().includes('ডিএসআর') ||
          creatorName.toLowerCase().includes('razo') ||
          creatorName.toLowerCase().includes('raju') ||
          creatorName.toLowerCase().includes('রাজু');
      } else if (creatorFilter === 'counter') {
        matchesCreator =
          creatorRole === 'counter' ||
          (o as any).salesPersonRole === 'counter' ||
          creatorName.toLowerCase().includes('counter') ||
          creatorName.toLowerCase().includes('কাউন্টার') ||
          (!creatorRole && !(o as any).salesPersonRole && !creatorName.toLowerCase().includes('dsr') && !creatorName.toLowerCase().includes('admin'));
      } else {
        // Individual staff selected by userId
        const targetStaff = users.find((u) => u.id === creatorFilter);
        if (targetStaff) {
          const tName = (targetStaff.name || '').toLowerCase();
          const tBnName = (targetStaff.bnName || '').toLowerCase();
          const tId = targetStaff.id;
          matchesCreator =
            (o as any).creatorId === tId ||
            (o as any).salesPersonId === tId ||
            creatorName === tName ||
            (tName && creatorName.includes(tName)) ||
            (tBnName && creatorName.includes(tBnName)) ||
            (targetStaff.role === 'dsr' && (creatorRole === 'dsr' || creatorName.includes('razo') || creatorName.includes('raju') || creatorName.includes('রাজু'))) ||
            (targetStaff.role === 'counter' && (creatorRole === 'counter' || creatorName.includes('counter') || creatorName.includes('কাউন্টার'))) ||
            (targetStaff.role === 'admin' && (creatorRole === 'admin' || creatorName.includes('admin')));
        } else {
          matchesCreator = creatorRole === creatorFilter || creatorName === creatorFilter.toLowerCase();
        }
      }
    }
    
    return matchesSearch && matchesDate && matchesCreator;
  });

  const [historyType, setHistoryType] = useState<'SALES' | 'PURCHASES'>('SALES');
  const [editingChallan, setEditingChallan] = useState<SupplierLedgerEntry | null>(null);
  const [deletingChallan, setDeletingChallan] = useState<SupplierLedgerEntry | null>(null);

  const scannedSupplierPurchases = (supplierLedger || []).filter((l) => l.type === 'PURCHASE');
  
  const filteredPurchases = scannedSupplierPurchases.filter((p) => {
    const term = searchInvoice.trim().toLowerCase();
    const refNo = (p.referenceNo || p.id || '').toLowerCase();
    const supName = (p.supplierName || '').toLowerCase();
    const notes = (p.notes || '').toLowerCase();
    const dateStr = (p.date || '').toLowerCase();
    const prevDo = (p.previousDoNo || '').toLowerCase();

    // Match product names within purchase challan items
    const matchesItems =
      Array.isArray(p.items) &&
      p.items.some(
        (it) =>
          (it.name || '').toLowerCase().includes(term) ||
          (it.sku || '').toLowerCase().includes(term) ||
          (it.category || '').toLowerCase().includes(term)
      );

    // Match linked inventory products
    const matchesLinkedProduct = products.some(
      (prod) =>
        ((prod.challanReferences || []).some(
          (r) => (r.challanNo || '').trim().toLowerCase() === refNo
        ) || (prod.latestChallanNo || '').trim().toLowerCase() === refNo) &&
        ((prod.name || '').toLowerCase().includes(term) ||
          (prod.bnName || '').toLowerCase().includes(term) ||
          (prod.sku || '').toLowerCase().includes(term))
    );
    
    const matchesSearch =
      !term ||
      refNo.includes(term) ||
      supName.includes(term) ||
      notes.includes(term) ||
      prevDo.includes(term) ||
      matchesItems ||
      matchesLinkedProduct;

    let matchesDate = true;
    if (invoiceDateFilter === 'TODAY') {
      matchesDate = dateStr.includes(getTodayDateString());
    } else if (invoiceDateFilter === 'YESTERDAY') {
      matchesDate = dateStr.includes(getYesterdayDateString());
    } else if (invoiceDateFilter !== 'ALL' && invoiceDateFilter !== '') {
      matchesDate = dateStr.includes(invoiceDateFilter);
    }

    return matchesSearch && matchesDate;
  });

  return (
    <div className="space-y-4 animate-in fade-in duration-200">
      {/* Toast / Notification Banner */}
      {actionSuccessMsg && (
        <div className="p-3 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs font-semibold flex items-center justify-between gap-2 shadow-lg animate-in slide-in-from-top duration-200">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{actionSuccessMsg}</span>
          </div>
          <button
            onClick={() => setActionSuccessMsg(null)}
            className="text-emerald-400 hover:text-white"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Top Banner & Sub-Navigation Tabs */}
      <div className="p-4 rounded-2xl bg-gradient-to-r from-slate-900 via-slate-900 to-emerald-950/40 border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-lg">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0">
            <ShoppingCart className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
              <span>{t.posTitle}</span>
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                {currentRole === 'dsr' ? 'Field Booking' : 'Counter POS'}
              </span>
            </h2>
            <p className="text-xs text-slate-400">{t.posSubtitle}</p>
          </div>
        </div>

        {/* View Switcher Tabs */}
        <div className="flex items-center gap-1.5 bg-slate-950 p-1.5 rounded-xl border border-slate-800/80">
          <button
            type="button"
            onClick={() => setActiveTab('POS')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
              activeTab === 'POS'
                ? 'bg-emerald-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <ShoppingCart className="w-3.5 h-3.5" />
            <span>{t.newSaleTab || (language === 'bn' ? 'নতুন মেমো / POS' : 'New Sale / POS')}</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('INVOICES')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
              activeTab === 'INVOICES'
                ? 'bg-emerald-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <History className="w-3.5 h-3.5" />
            <span>{t.invoicesHistory || (language === 'bn' ? 'মেমো ও বিক্রয় হিস্ট্রি' : 'Invoices & History')}</span>
            <span className="px-1.5 py-0.2 rounded-full bg-slate-800 text-[10px] text-emerald-300 font-bold">
              {filteredOrders.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('PRODUCTS')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
              activeTab === 'PRODUCTS'
                ? 'bg-emerald-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Package className="w-3.5 h-3.5" />
            <span>{language === 'bn' ? 'পণ্য ক্যাটালগ ও স্টক' : 'Products & Stock'}</span>
            <span className="px-1.5 py-0.2 rounded-full bg-slate-800 text-[10px] text-slate-300">
              {products.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('EXPENSES')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
              activeTab === 'EXPENSES'
                ? 'bg-amber-500 text-slate-950 shadow-md font-extrabold'
                : 'text-amber-400 hover:text-white hover:bg-slate-900'
            }`}
          >
            <Receipt className="w-3.5 h-3.5" />
            <span>{language === 'bn' ? '💸 খরচ ও প্রফিট হিসাব' : 'Expenses & Profit'}</span>
            <span className="px-1.5 py-0.2 rounded-full bg-amber-500/20 text-[10px] text-amber-300 font-bold">
              {expenses.length}
            </span>
          </button>
        </div>

        {/* Quick Add Expense Modal Trigger */}
        <button
          type="button"
          onClick={() => openExpenseModal()}
          className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-500 hover:to-amber-600 text-white font-bold text-xs flex items-center gap-1.5 border border-amber-500/40 shadow-md transition active:scale-95 cursor-pointer shrink-0"
          title="বেতন, দোকান ভাড়া, বিদ্যুৎ বিল ও অন্যান্য খরচ এন্ট্রি"
        >
          <Receipt className="w-3.5 h-3.5 text-amber-200" />
          <span>{language === 'bn' ? '+ খরচ এন্ট্রি (বেতন/ভাড়া/বিল)' : '+ Add Expense'}</span>
        </button>

        {/* Quick Photo Sales Inbox Trigger */}
        <button
          type="button"
          onClick={() => setIsPhotoInboxOpen(true)}
          className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-emerald-700 to-teal-700 hover:from-emerald-600 hover:to-teal-600 text-white font-bold text-xs flex items-center gap-1.5 border border-emerald-500/40 shadow-md transition active:scale-95 cursor-pointer shrink-0"
          title="ছবি তুলে বা ছবি দিয়ে একাধিকবার আলাদা আলাদা সেলস এন্ট্রি নিন"
        >
          <Camera className="w-3.5 h-3.5 text-emerald-300" />
          <span>{language === 'bn' ? 'ছবি দিয়ে বিক্রয়' : 'Photo Sales Inbox'}</span>
        </button>

        {/* Quick Stock Photos Manager Trigger */}
        <button
          type="button"
          onClick={() => {
            setStockPhotoTargetProductId(null);
            setIsStockPhotoManagerOpen(true);
          }}
          className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-teal-700 to-cyan-700 hover:from-teal-600 hover:to-cyan-600 text-white font-bold text-xs flex items-center gap-1.5 border border-teal-500/40 shadow-md transition active:scale-95 cursor-pointer shrink-0"
          title="স্টকের পণ্যে দ্রুত ছবি তোলা বা যুক্ত করার ম্যানেজার"
        >
          <Camera className="w-3.5 h-3.5 text-cyan-300" />
          <span>{language === 'bn' ? 'স্টক পণ্যের ছবি এন্ট্রি' : 'Stock Photos'}</span>
        </button>

        {/* Quick Cash/DSR Memo & Khata Scanner Trigger */}
        <button
          type="button"
          onClick={() => openMemoKhataScanner(currentRole === 'dsr' ? 'DSR' : 'COUNTER')}
          className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-teal-800 to-emerald-800 hover:from-teal-700 hover:to-emerald-700 text-teal-100 font-bold text-xs flex items-center gap-1.5 border border-teal-500/40 shadow-md transition active:scale-95 cursor-pointer shrink-0"
          title="Scan handwritten memo or khata page for instant bill & replacement entry"
        >
          <Sparkles className="w-3.5 h-3.5 text-emerald-300" />
          <span>{language === 'bn' ? 'মেমো / খাতা স্ক্যান' : 'Scan Memo/Khata'}</span>
        </button>
      </div>

      {/* TAB 1: POS / BILLING */}
      {activeTab === 'POS' && (
        <div className="space-y-4">
          {/* Sale Mode Selector & Quick Action Bar (পাইকারি vs খুচরা বিক্রয় এবং বিক্রয় দাম এডিটর) */}
          <div className="p-2.5 rounded-2xl bg-slate-900 border border-slate-800 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-400">
                {language === 'bn' ? 'বিক্রয় ধরন:' : 'Sale Mode:'}
              </span>
              <div className="flex items-center p-1 bg-slate-950 rounded-xl border border-slate-800">
                <button
                  type="button"
                  onClick={() => handleToggleSaleMode('WHOLESALE')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                    saleMode === 'WHOLESALE'
                      ? 'bg-emerald-600 text-white shadow-md'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <Package className="w-3.5 h-3.5" />
                  <span>{language === 'bn' ? '📦 পাইকারি বিক্রয়' : 'Wholesale'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleToggleSaleMode('RETAIL')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                    saleMode === 'RETAIL'
                      ? 'bg-amber-500 text-slate-950 font-extrabold shadow-md'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <ShoppingCart className="w-3.5 h-3.5" />
                  <span>{language === 'bn' ? '🛒 খুচরা বিক্রয়' : 'Retail Sale'}</span>
                </button>
              </div>

              {saleMode === 'RETAIL' && (
                <button
                  type="button"
                  onClick={handleSelectWalkInRetailCustomer}
                  className="px-2.5 py-1.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 text-xs font-bold transition flex items-center gap-1 cursor-pointer"
                  title="কাউন্টার সাধারণ খুচরা ক্রেতা নির্বাচন করুন"
                >
                  <User className="w-3.5 h-3.5" />
                  <span>{language === 'bn' ? 'সাধারণ খুচরা ক্রেতা' : 'Walk-in Retail'}</span>
                </button>
              )}
            </div>

            {/* Admin Sales Price Editor & Unlisted Return Item Triggers */}
            <div className="flex items-center gap-2 flex-wrap">
              <button
                type="button"
                onClick={() => setIsAddUnlistedModalOpen(true)}
                className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-emerald-600/30 to-teal-600/30 hover:from-emerald-600/50 hover:to-teal-600/50 text-emerald-300 hover:text-white border border-emerald-500/50 text-xs font-bold transition flex items-center gap-1.5 shadow cursor-pointer active:scale-95"
                title={language === 'bn' ? 'স্টকে নাম না থাকা পণ্য বা মার্কেট ফেরত পণ্য ০ টাকা বা ০ কোয়ান্টিটিতে সরাসরি মেমোতে যুক্ত করুন' : 'Add unlisted / return item with 0 price or 0 quantity'}
              >
                <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                <span>{language === 'bn' ? '✨ আনলিস্টেড / মার্কেট ফেরত (০ টাকা/০ পিস)' : 'Add Non-Stock (0 Tk/Qty)'}</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setAdminPriceTargetProductId(null);
                  setIsAdminPriceModalOpen(true);
                }}
                className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-amber-600/30 to-orange-600/30 hover:from-amber-600/50 hover:to-orange-600/50 text-amber-300 hover:text-white border border-amber-500/50 text-xs font-bold transition flex items-center gap-1.5 shadow cursor-pointer active:scale-95"
                title={language === 'bn' ? 'পাইকারি ও খুচরা বিক্রয় মূল্য পরিবর্তন করুন' : 'Edit wholesale and retail sales prices'}
              >
                <Tag className="w-3.5 h-3.5 text-amber-400" />
                <span>{language === 'bn' ? '🏷️ বিক্রয় দাম এডিট' : 'Edit Sales Prices'}</span>
              </button>
            </div>
          </div>

          {/* Enhanced Customer / Retailer Bar with Direct Typing, Phonebook Autocomplete & Edit */}
          <div className="p-3.5 rounded-2xl bg-slate-900 border border-slate-800 space-y-2.5 shadow-md">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-2.5">
              
              {/* Direct Autocomplete & Free Typing Input */}
              <div className="flex-1 relative">
                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                    <input
                      type="text"
                      placeholder={
                        language === 'bn'
                          ? 'কাস্টমারের নাম, প্রতিষ্ঠান বা মোবাইল নম্বর লিখুন (যেমন: আলমগীর / 017...)...'
                          : 'Search by customer name, shop name, or phone number...'
                      }
                      value={customerSearchQuery}
                      onChange={(e) => {
                        setCustomerSearchQuery(e.target.value);
                        setIsCustomerDropdownOpen(true);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          if (matchingRetailers.length > 0) {
                            handleSelectRetailerDirect(matchingRetailers[0]);
                          } else if (matchingPhoneContacts.length > 0) {
                            handleSelectPhoneContactDirect(matchingPhoneContacts[0]);
                          } else if (customerSearchQuery.trim()) {
                            handleQuickAddTypedCustomer();
                          }
                        }
                      }}
                      onFocus={() => setIsCustomerDropdownOpen(true)}
                      className="w-full pl-9 pr-14 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 font-semibold transition"
                    />
                    <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                      {customerSearchQuery ? (
                        <button
                          type="button"
                          onClick={() => {
                            setCustomerSearchQuery('');
                            setIsCustomerDropdownOpen(false);
                          }}
                          className="text-slate-400 hover:text-white p-0.5 cursor-pointer"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={handlePasteFromClipboardForPos}
                          title={language === 'bn' ? 'ক্লিপবোর্ড থেকে নম্বর পেস্ট করুন' : 'Paste from clipboard'}
                          className="text-slate-400 hover:text-white p-1 cursor-pointer"
                        >
                          <ClipboardPaste className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Device Phonebook & Contact Dialog Trigger */}
                  <button
                    type="button"
                    onClick={() => setIsDeviceContactModalOpen(true)}
                    className="px-3 py-2 rounded-xl bg-gradient-to-r from-sky-600 to-blue-600 hover:from-sky-500 hover:to-blue-500 text-white font-bold text-xs flex items-center gap-1.5 shadow transition cursor-pointer shrink-0 active:scale-95"
                    title={
                      language === 'bn'
                        ? 'সরাসরি মোবাইলের ফোনবুক বা ফাইল থেকে নম্বর যুক্ত করুন'
                        : 'Pick from device phonebook / contact book'
                    }
                  >
                    <Smartphone className="w-3.5 h-3.5" />
                    <span>
                      {language === 'bn' ? '📱 ফোনবুক / কন্টাক্ট' : 'Phonebook'}
                    </span>
                  </button>

                  {/* Dropdown Select Option for Existing Retailers */}
                  <div className="w-40 sm:w-52 shrink-0">
                    <select
                      value={selectedRetailerId}
                      onChange={(e) => {
                        setSelectedRetailerId(e.target.value);
                        setCustomerSearchQuery('');
                        setIsCustomerDropdownOpen(false);
                      }}
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl px-2.5 py-2 text-xs font-bold text-white focus:outline-none focus:border-emerald-500 truncate"
                    >
                      {retailers.map((r) => (
                        <option key={r.id} value={r.id}>
                          {r.shopName || r.name} ({r.ownerName ? `${r.ownerName} - ` : ''}{r.phone})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Floating Autocomplete Dropdown */}
                {isCustomerDropdownOpen && customerSearchQuery.trim() && (
                  <div className="absolute top-full left-0 right-0 mt-1 z-30 bg-slate-900 border border-emerald-500/50 rounded-xl shadow-2xl overflow-hidden max-h-64 overflow-y-auto animate-in fade-in">
                    
                    {/* Matching Retailers */}
                    {matchingRetailers.length > 0 && (
                      <div className="p-1.5 border-b border-slate-800">
                        <div className="text-[10px] font-bold text-slate-400 px-2 py-0.5 uppercase tracking-wider">
                          {language === 'bn' ? 'নিবন্ধিত রিটেইলার / কাস্টমার' : 'Registered Customers'}
                        </div>
                        {matchingRetailers.map((r) => (
                          <div
                            key={r.id}
                            onClick={() => handleSelectRetailerDirect(r)}
                            className="p-2 hover:bg-slate-800/80 rounded-lg cursor-pointer flex items-center justify-between text-xs transition"
                          >
                            <div>
                              <div className="font-bold text-white flex items-center gap-1.5">
                                <span>{r.shopName || r.name}</span>
                                {r.ownerName && (
                                  <span className="text-[10px] text-emerald-300 font-normal">
                                    👤 {r.ownerName}
                                  </span>
                                )}
                              </div>
                              <div className="text-[11px] text-emerald-400 font-mono font-bold">
                                📞 {r.phone}
                              </div>
                            </div>
                            <div className="text-right">
                              <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-semibold">
                                Due: ৳{r.currentDue || r.outstandingDue || 0}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Matching Phonebook Contacts */}
                    {matchingPhoneContacts.length > 0 && (
                      <div className="p-1.5 border-b border-slate-800">
                        <div className="text-[10px] font-bold text-sky-400 px-2 py-0.5 uppercase tracking-wider flex items-center gap-1">
                          <BookUser className="w-3 h-3" />
                          <span>{language === 'bn' ? 'ফোনবুক ডিরেক্টরি' : 'Phonebook Contacts'}</span>
                        </div>
                        {matchingPhoneContacts.map((c) => (
                          <div
                            key={c.id}
                            onClick={() => handleSelectPhoneContactDirect(c)}
                            className="p-2 hover:bg-sky-950/40 rounded-lg cursor-pointer flex items-center justify-between text-xs transition border border-transparent hover:border-sky-500/30"
                          >
                            <div>
                              <div className="font-bold text-sky-200 flex items-center gap-1.5">
                                <span>{c.name}</span>
                                {c.organization && (
                                  <span className="text-[10px] text-slate-400 font-normal">({c.organization})</span>
                                )}
                              </div>
                              <div className="text-[11px] text-emerald-400 font-mono font-bold">
                                📞 {c.phone}
                              </div>
                            </div>
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-sky-500/20 text-sky-300 font-bold">
                              {language === 'bn' ? 'সিলেক্ট করুন' : 'Select'}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Quick Add As New Customer */}
                    <div className="p-2 bg-slate-950 hover:bg-emerald-950/30 transition cursor-pointer flex items-center justify-between">
                      <div
                        onClick={handleQuickAddTypedCustomer}
                        className="flex items-center gap-2 text-xs text-emerald-400 font-bold flex-1"
                      >
                        <Plus className="w-4 h-4" />
                        <span>
                          {language === 'bn'
                            ? `"${customerSearchQuery}" নতুন গ্রাহক ও ফোনবুকে সংরক্ষণ করে মেমোতে নিন`
                            : `Save "${customerSearchQuery}" as customer & select`}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setIsCustomerDropdownOpen(false)}
                        className="text-slate-500 hover:text-white p-1 text-xs"
                      >
                        {language === 'bn' ? 'বন্ধ' : 'Close'}
                      </button>
                    </div>

                  </div>
                )}
              </div>

              {/* Action Buttons: Unified Device Contacts + Phonebook List + Add New Customer + Edit Retailer */}
              <div className="flex items-center gap-1.5 flex-wrap shrink-0">
                {/* 1. Open Unified Phonebook & Device Contact Picker Modal */}
                <button
                  type="button"
                  onClick={() => setIsDeviceContactModalOpen(true)}
                  className="px-2.5 py-2 bg-sky-600/20 hover:bg-sky-600/35 text-sky-300 hover:text-white border border-sky-500/40 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-sm cursor-pointer active:scale-95"
                  title={
                    language === 'bn'
                      ? 'মোবাইল বা ডিভাইসের ফোনবুক থেকে কাস্টমার নির্বাচন করুন'
                      : 'Pick contact from mobile device phonebook'
                  }
                >
                  <Smartphone className="w-4 h-4 text-sky-400" />
                  <span>{language === 'bn' ? '📱 মোবাইল ফোনবুক' : '📱 Mobile Contacts'}</span>
                </button>

                {/* 1b. Direct Clipboard Paste */}
                <button
                  type="button"
                  onClick={handlePasteFromClipboardForPos}
                  className="px-2.5 py-2 bg-amber-600/20 hover:bg-amber-600/35 text-amber-300 hover:text-white border border-amber-500/40 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-sm cursor-pointer active:scale-95"
                  title={
                    language === 'bn'
                      ? 'ক্লিপবোর্ড থেকে কপি করা ফোন নম্বর সরাসরি পেস্ট করুন'
                      : 'Paste copied phone number directly from clipboard'
                  }
                >
                  <ClipboardPaste className="w-4 h-4 text-amber-400" />
                  <span>{language === 'bn' ? '📋 পেস্ট' : '📋 Paste'}</span>
                </button>

                {/* 2. Open App Phonebook List */}
                <button
                  type="button"
                  onClick={onOpenPhonebookModal}
                  className="px-2.5 py-2 bg-emerald-600/20 hover:bg-emerald-600/35 text-emerald-300 hover:text-white border border-emerald-500/40 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-sm cursor-pointer active:scale-95"
                  title={
                    language === 'bn'
                      ? 'সংরক্ষিত ফোনবুক, রিটেইলার ও কাস্টমার তালিকা'
                      : 'Open saved phonebook directory'
                  }
                >
                  <BookUser className="w-4 h-4 text-emerald-400" />
                  <span>
                    {language === 'bn' ? '📖 ফোনবুক' : '📖 Phonebook'} ({phoneContacts.length})
                  </span>
                </button>

                {/* 3. Add New Customer */}
                <button
                  type="button"
                  onClick={handleOpenCreateCustomerModal}
                  className="px-2.5 py-2 bg-indigo-600/20 hover:bg-indigo-600/35 text-indigo-300 hover:text-white border border-indigo-500/40 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-sm cursor-pointer active:scale-95"
                  title={
                    language === 'bn'
                      ? 'নতুন কাস্টমার ও ফোন নম্বর যুক্ত করুন'
                      : 'Add new customer with phone number'
                  }
                >
                  <PlusCircle className="w-4 h-4 text-indigo-400" />
                  <span className="hidden sm:inline">{language === 'bn' ? 'নতুন কাস্টমার' : 'Add New'}</span>
                </button>

                {/* 4. Edit Selected Retailer Phone/Details */}
                {selectedRetailer && (
                  <button
                    type="button"
                    onClick={() => handleOpenEditRetailer(selectedRetailer)}
                    className="px-2 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 rounded-xl text-xs font-semibold transition flex items-center gap-1 cursor-pointer"
                    title="Edit Customer Phone Number / Details"
                  >
                    <Edit2 className="w-3.5 h-3.5 text-amber-400" />
                    <span className="hidden md:inline">{language === 'bn' ? 'এডিট' : 'Edit'}</span>
                  </button>
                )}
              </div>
            </div>

            {/* Currently Active Selected Customer Badge */}
            {selectedRetailer && (
              <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 rounded-xl bg-slate-950/80 border border-slate-800 text-xs">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[11px] text-slate-400 font-medium flex items-center gap-1">
                    <Store className="w-3.5 h-3.5 text-emerald-400" />
                    <span>{language === 'bn' ? 'প্রতিষ্ঠান:' : 'Shop:'}</span>
                  </span>
                  <span className="font-bold text-white">
                    {selectedRetailer.shopName || selectedRetailer.name}
                  </span>
                  {selectedRetailer.ownerName && (
                    <span className="text-slate-300 flex items-center gap-1">
                      <span className="text-slate-500">•</span>
                      <User className="w-3 h-3 text-sky-400" />
                      <span>{selectedRetailer.ownerName}</span>
                    </span>
                  )}
                  <span className="text-emerald-400 font-mono font-bold flex items-center gap-1">
                    <Phone className="w-3 h-3 text-emerald-500" />
                    {selectedRetailer.phone}
                  </span>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                    saleMode === 'RETAIL'
                      ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                      : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                  }`}>
                    {saleMode === 'RETAIL' ? (language === 'bn' ? '🛒 খুচরা মোড' : 'Retail') : (language === 'bn' ? '📦 পাইকারি মোড' : 'Wholesale')}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[11px] text-slate-400">
                    {language === 'bn' ? 'বর্তমান বকেয়া:' : 'Due:'}{' '}
                    <b className="text-amber-400 font-mono font-bold">
                      ৳{(selectedRetailer.currentDue || selectedRetailer.outstandingDue || 0).toLocaleString()}
                    </b>
                  </span>
                </div>
              </div>
            )}

            {/* Direct Input for Customer Name & Phone: Retail vs Wholesale */}
            {saleMode === 'RETAIL' ? (
              <div className="p-3 bg-slate-950/90 rounded-xl border border-amber-500/30 grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-bold text-amber-300 flex items-center gap-1.5 mb-1.5">
                    <User className="w-3.5 h-3.5 text-amber-400" />
                    <span>{language === 'bn' ? 'খুচরা কাস্টমারের নাম:' : 'Retail Customer Name:'}</span>
                  </label>
                  <input
                    type="text"
                    value={retailCustomerName}
                    onChange={(e) => setRetailCustomerName(e.target.value)}
                    placeholder={language === 'bn' ? 'কাস্টমারের নাম লিখুন (যেমন: সাধারণ খুচরা ক্রেতা)' : 'Customer Name'}
                    className="w-full bg-slate-900 border border-slate-700 focus:border-amber-400 rounded-lg px-3 py-2 text-xs text-white font-semibold focus:outline-none transition"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-slate-300 flex items-center gap-1.5 mb-1.5">
                    <Phone className="w-3.5 h-3.5 text-emerald-400" />
                    <span>{language === 'bn' ? 'মোবাইল নম্বর (ঐচ্ছিক):' : 'Mobile Number (Optional):'}</span>
                  </label>
                  <input
                    type="text"
                    value={retailCustomerPhone}
                    onChange={(e) => setRetailCustomerPhone(e.target.value)}
                    placeholder="017XXXXXXXX"
                    className="w-full bg-slate-900 border border-slate-700 focus:border-emerald-400 rounded-lg px-3 py-2 text-xs text-white font-mono focus:outline-none transition"
                  />
                </div>
              </div>
            ) : (
              <div className="p-3 bg-slate-950/90 rounded-xl border border-emerald-500/30 grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-bold text-emerald-300 flex items-center gap-1.5 mb-1.5">
                    <Store className="w-3.5 h-3.5 text-emerald-400" />
                    <span>{language === 'bn' ? 'রিটেলারের নাম / প্রতিষ্ঠানের নাম:' : 'Retailer / Shop Name:'}</span>
                  </label>
                  <input
                    type="text"
                    value={wholesaleRetailerName}
                    onChange={(e) => setWholesaleRetailerName(e.target.value)}
                    placeholder={language === 'bn' ? 'দোকান বা রিটেলারের নাম' : 'Enter Retailer / Shop Name'}
                    className="w-full bg-slate-900 border border-slate-700 focus:border-emerald-400 rounded-lg px-3 py-2 text-xs text-white font-semibold focus:outline-none transition"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-emerald-300 flex items-center gap-1.5 mb-1.5">
                    <Phone className="w-3.5 h-3.5 text-emerald-400" />
                    <span>{language === 'bn' ? 'রিটেলারের ফোন নম্বর:' : 'Retailer Phone Number:'}</span>
                  </label>
                  <input
                    type="text"
                    value={wholesaleRetailerPhone}
                    onChange={(e) => setWholesaleRetailerPhone(e.target.value)}
                    placeholder="01XXXXXXXXX"
                    className="w-full bg-slate-900 border border-slate-700 focus:border-emerald-400 rounded-lg px-3 py-2 text-xs text-white font-mono focus:outline-none transition"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Main Grid: Catalog (Left) + Order Cart (Right) */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
            {/* Product Catalog (7 cols) */}
            <div className="lg:col-span-7 space-y-3">
              {/* 1. Company / Brand Selector (ডিএসআর ও কাউন্টারের জন্য কোম্পানি নির্বাচন) */}
              <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-emerald-400 flex items-center gap-1.5">
                    <Store className="w-3.5 h-3.5" />
                    <span>{language === 'bn' ? '১. কোম্পানি / সাপ্লায়ার সিলেক্ট করুন:' : '1. Select Company / Supplier:'}</span>
                  </span>
                  {selectedCompany !== 'ALL' && (
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedCompany('ALL');
                        setCategoryFilter('ALL');
                      }}
                      className="text-[11px] text-amber-400 hover:text-amber-300 underline"
                    >
                      {language === 'bn' ? 'সব কোম্পানি দেখুন' : 'Show All Companies'}
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
                  {companies.map((comp) => (
                    <button
                      key={comp}
                      type="button"
                      onClick={() => {
                        setSelectedCompany(comp);
                        setCategoryFilter('ALL');
                      }}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition whitespace-nowrap flex items-center gap-1.5 ${
                        selectedCompany === comp
                          ? 'bg-emerald-600 text-white shadow-md'
                          : 'bg-slate-950 text-slate-300 hover:text-white border border-slate-700 hover:border-emerald-500/40'
                      }`}
                    >
                      <span>🏢</span>
                      <span>{comp === 'ALL' ? (language === 'bn' ? 'সকল কোম্পানি' : 'All Companies') : comp}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* 2. Product Search & Category Pills under Selected Company */}
              <div className="space-y-2">
                <div className="relative">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    placeholder={
                      selectedCompany === 'ALL'
                        ? (language === 'bn' ? 'পণ্য, মডেল, বা বারকোড দিয়ে খুঁজুন...' : 'Search products, model or barcode...')
                        : (language === 'bn' ? `${selectedCompany} কোম্পানির পণ্য খুঁজুন...` : `Search products from ${selectedCompany}...`)
                    }
                    value={searchProduct}
                    onChange={(e) => setSearchProduct(e.target.value)}
                    className="w-full pl-9 pr-4 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-emerald-500 transition"
                  />
                </div>

                {/* Informative / 1-Click Banner to Add Unlisted / Non-Stock Item directly into Invoice */}
                <div className="p-2.5 bg-gradient-to-r from-slate-900 via-emerald-950/30 to-slate-900 border border-emerald-500/30 rounded-xl flex items-center justify-between gap-2 shadow-sm">
                  <div className="flex items-center gap-2 min-w-0">
                    <Sparkles className="w-4 h-4 text-emerald-400 shrink-0" />
                    <div className="text-[11px] leading-tight">
                      <span className="font-bold text-emerald-300">
                        {searchProduct.trim() ? `"${searchProduct}" কি আনলিস্টেড / মার্কেট ফেরত পণ্য?` : 'স্টকে নাম না থাকা পণ্য বা মার্কেট ফেরত আইটেম?'}
                      </span>
                      <span className="text-slate-400 block text-[10px]">
                        দাম বা কোয়ান্টিটি শূন্য (০ টাকা বা ০ পিস) হলেও সরাসরি মেমোতে জমা নিবে
                      </span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setUnlistedForm((prev) => ({
                        ...prev,
                        name: searchProduct.trim() || '',
                        itemType: 'REPLACEMENT',
                        price: 0,
                        quantity: 0,
                      }));
                      setIsAddUnlistedModalOpen(true);
                    }}
                    className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold shrink-0 transition flex items-center gap-1 shadow cursor-pointer active:scale-95"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>{language === 'bn' ? '+ আনলিস্টেড পণ্য যোগ' : '+ Add Non-Stock'}</span>
                  </button>
                </div>

                {/* Quick Filters for Sale & Replacement items (ল্যাপটপ ও ডেস্কটপে ফিল্টারিং সহজ করার জন্য) */}
                <div className="flex flex-wrap items-center justify-between gap-1.5 pt-0.5">
                  <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5">
                    <span className="text-[11px] font-semibold text-slate-400 whitespace-nowrap pl-1">
                      {language === 'bn' ? 'ফিল্টার:' : 'Filter:'}
                    </span>
                    <button
                      type="button"
                      onClick={() => setCartFilterMode('ALL')}
                      className={`px-2.5 py-1 rounded-lg text-xs font-bold transition whitespace-nowrap cursor-pointer ${
                        cartFilterMode === 'ALL'
                          ? 'bg-slate-700 text-white shadow-sm'
                          : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
                      }`}
                    >
                      {language === 'bn' ? 'সকল পণ্য' : 'All Products'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setCartFilterMode('IN_CART_SALE')}
                      className={`px-2.5 py-1 rounded-lg text-xs font-bold transition whitespace-nowrap flex items-center gap-1 cursor-pointer ${
                        cartFilterMode === 'IN_CART_SALE'
                          ? 'bg-emerald-600 text-white shadow-md'
                          : 'bg-emerald-950/60 text-emerald-300 hover:text-white border border-emerald-700/50'
                      }`}
                    >
                      <Plus className="w-3 h-3 text-emerald-400" />
                      <span>{language === 'bn' ? 'কার্টে বিক্রি' : 'In Cart (Sale)'}</span>
                      {salesCartItems.length > 0 && (
                        <span className="px-1.5 py-0.2 rounded-full bg-emerald-900 text-[10px] font-mono text-emerald-200">
                          {salesCartItems.length}
                        </span>
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={() => setCartFilterMode('IN_CART_REPLACE')}
                      className={`px-2.5 py-1 rounded-lg text-xs font-bold transition whitespace-nowrap flex items-center gap-1 cursor-pointer ${
                        cartFilterMode === 'IN_CART_REPLACE'
                          ? 'bg-rose-600 text-white shadow-md'
                          : 'bg-rose-950/60 text-rose-300 hover:text-white border border-rose-700/50'
                      }`}
                    >
                      <RotateCcw className="w-3 h-3 text-rose-400" />
                      <span>{language === 'bn' ? 'কার্টে রিপ্লেস' : 'In Cart (Replace)'}</span>
                      {replacementCartItems.length > 0 && (
                        <span className="px-1.5 py-0.2 rounded-full bg-rose-900 text-[10px] font-mono text-rose-200">
                          {replacementCartItems.length}
                        </span>
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={() => setCartFilterMode('IN_STOCK')}
                      className={`px-2.5 py-1 rounded-lg text-xs font-bold transition whitespace-nowrap cursor-pointer ${
                        cartFilterMode === 'IN_STOCK'
                          ? 'bg-sky-600 text-white shadow-sm'
                          : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
                      }`}
                    >
                      {language === 'bn' ? 'স্টকে আছে' : 'In Stock'}
                    </button>
                  </div>

                  <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 flex-1">
                    <span className="text-[11px] font-semibold text-slate-400 whitespace-nowrap pl-1">
                      {language === 'bn' ? 'ক্যাটাগরি:' : 'Category:'}
                    </span>
                    {categories.map((cat) => (
                      <button
                        key={cat}
                        type="button"
                        onClick={() => setCategoryFilter(cat)}
                        className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition whitespace-nowrap cursor-pointer ${
                          categoryFilter === cat
                            ? 'bg-amber-500 text-slate-950 font-bold shadow-sm'
                            : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
                        }`}
                      >
                        {cat === 'ALL' ? (language === 'bn' ? 'সব' : 'All') : cat}
                      </button>
                    ))}
                  </div>

                  {/* Responsive Column Density Switcher (১, ২, ৩, ৪, ৫ বা অটো সিরিয়াল) */}
                  <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800 shrink-0">
                    <span className="text-[10px] text-slate-400 font-bold px-1 hidden sm:inline">
                      {language === 'bn' ? 'কলাম:' : 'Cols:'}
                    </span>
                    {(['AUTO', 1, 2, 3, 4, 5] as const).map((col) => (
                      <button
                        key={col}
                        type="button"
                        onClick={() => setGalleryCols(col)}
                        className={`px-2 py-0.5 rounded-lg text-[11px] font-bold transition cursor-pointer ${
                          galleryCols === col
                            ? 'bg-emerald-600 text-white shadow-sm'
                            : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
                        }`}
                        title={col === 'AUTO' ? 'স্বয়ংক্রিয় স্ক্রিন এডাপ্টিভ (Auto)' : `${col} কলাম ভিউ`}
                      >
                        {col === 'AUTO' ? (language === 'bn' ? 'অটো' : 'Auto') : toBnDigit(col)}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Product Items Grid - Optimized for Laptops & Desktops (Auto shrinks to 1 or 2 on small displays, expands to 3, 4, 5 on large displays) */}
              {filteredProducts.length === 0 ? (
                <div className="p-8 rounded-2xl bg-slate-900/90 border border-slate-800 text-center space-y-3">
                  <Package className="w-10 h-10 text-slate-500 mx-auto" />
                  <div className="space-y-1">
                    <div className="text-sm font-bold text-white">
                      {language === 'bn' ? 'কোন প্রোডাক্ট পাওয়া যায়নি' : 'No Products Found'}
                    </div>
                    <p className="text-xs text-slate-400 max-w-sm mx-auto">
                      {searchProduct.trim()
                        ? (language === 'bn' ? `"${searchProduct}" নামে ক্যাটালগে পণ্য নেই। নিচের বাটনে ক্লিক করে সরাসরি মেমোতে যোগ করুন (০ টাকা বা ০ পিসেও গ্রহণ করবে)।` : `"${searchProduct}" is not in catalog. Click below to add directly into invoice.`)
                        : (language === 'bn' ? `বর্তমান পাইকারি অ্যাডমিন (${activeAdminEnterprise}) এর অধীনে কোন প্রোডাক্ট নেই অথবা আনলিস্টেড পণ্য যোগ করুন।` : `No products found under current Wholesaler (${activeAdminEnterprise}).`)}
                    </p>
                  </div>
                  <div className="flex items-center justify-center gap-2 pt-1 flex-wrap">
                    <button
                      type="button"
                      onClick={() => {
                        setUnlistedForm((prev) => ({
                          ...prev,
                          name: searchProduct.trim() || '',
                          itemType: 'REPLACEMENT',
                          price: 0,
                          quantity: 0,
                        }));
                        setIsAddUnlistedModalOpen(true);
                      }}
                      className="px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-bold transition shadow-lg inline-flex items-center gap-1.5 cursor-pointer active:scale-95"
                    >
                      <Plus className="w-4 h-4" />
                      <span>{language === 'bn' ? `"${searchProduct || 'আনলিস্টেড পণ্য'}" মেমোতে যোগ (০ টাকা/০ পিস)` : 'Add to Invoice (0 Tk/Qty)'}</span>
                    </button>
                    <button
                      type="button"
                      onClick={openRefSwitcher}
                      className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition inline-flex items-center gap-1.5 cursor-pointer"
                    >
                      <span>{t.switchAdminPrompt}</span>
                    </button>
                  </div>
                </div>
              ) : (
                <div className={`${
                  galleryCols === 1
                    ? 'grid grid-cols-1 gap-3.5'
                    : galleryCols === 2
                    ? 'grid grid-cols-1 sm:grid-cols-2 gap-3.5'
                    : galleryCols === 3
                    ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5'
                    : galleryCols === 4
                    ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3.5'
                    : galleryCols === 5
                    ? 'grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3.5'
                    : 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 min-[2200px]:grid-cols-5 gap-3.5'
                } max-h-[calc(100vh-230px)] min-h-[460px] overflow-y-auto pr-1.5`}>
                  {filteredProducts.map((p) => {
                    const inSaleCart = cart.find((item) => item.product.id === p.id && item.itemType === 'SALE');
                    const inReplaceCart = cart.find((item) => item.product.id === p.id && item.itemType === 'REPLACEMENT');
                    const threshold = p.lowStockThreshold ?? p.minStockLevel ?? 50;
                    const isLowStock = p.stockQuantity <= threshold;

                    return (
                      <div
                        key={p.id}
                        className="p-3.5 rounded-2xl bg-slate-900 border border-slate-800/90 hover:border-emerald-500/50 transition-all shadow-md hover:shadow-lg flex flex-col justify-between gap-3 group"
                      >
                        <div>
                          {/* Top: Product Image and Detailed Title Info */}
                          <div className="flex items-start gap-3">
                            {p.image ? (
                              <div className="relative group/img shrink-0">
                                <img
                                  src={p.image}
                                  alt={p.name}
                                  className="w-16 h-16 sm:w-18 sm:h-18 rounded-xl object-cover border border-slate-700 shadow-sm"
                                />
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setStockPhotoTargetProductId(p.id);
                                    setIsStockPhotoManagerOpen(true);
                                  }}
                                  className="absolute inset-0 bg-black/60 opacity-0 group-hover/img:opacity-100 flex flex-col items-center justify-center rounded-xl text-[9px] text-white font-medium transition cursor-pointer"
                                  title={language === 'bn' ? 'ছবি পরিবর্তন করুন' : 'Change Photo'}
                                >
                                  <Camera className="w-4 h-4 text-emerald-400" />
                                  <span>{language === 'bn' ? 'বদল' : 'Change'}</span>
                                </button>
                              </div>
                            ) : (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setStockPhotoTargetProductId(p.id);
                                  setIsStockPhotoManagerOpen(true);
                                }}
                                className="w-16 h-16 sm:w-18 sm:h-18 rounded-xl bg-slate-950 border-2 border-dashed border-emerald-500/40 hover:border-emerald-400 hover:bg-emerald-950/40 flex flex-col items-center justify-center shrink-0 text-emerald-400 hover:text-emerald-300 transition cursor-pointer group/cam shadow-sm"
                                title={language === 'bn' ? 'প্রোডাক্টে ছবি যুক্ত করুন' : 'Add Product Photo'}
                              >
                                <Camera className="w-5 h-5 text-emerald-400 mb-0.5 group-hover/cam:scale-110 transition" />
                                <span className="text-[10px] font-bold text-emerald-400 leading-none">
                                  {language === 'bn' ? '+ ছবি' : '+ Photo'}
                                </span>
                              </button>
                            )}

                            <div className="min-w-0 flex-1">
                              <div className="flex items-start justify-between gap-1.5">
                                <h4
                                  className="font-black text-sm sm:text-base text-white group-hover:text-emerald-300 transition leading-snug break-words flex-1 tracking-tight"
                                  title={p.name}
                                >
                                  {p.name}
                                </h4>
                                <span className="text-[10px] px-2 py-0.5 rounded-md bg-slate-800 text-slate-300 font-mono font-semibold shrink-0 border border-slate-700/60">
                                  {p.sku}
                                </span>
                              </div>

                              {p.bnName && p.bnName.trim() !== p.name.trim() && (
                                <p className="text-xs text-emerald-400/90 font-medium mt-0.5 leading-snug">
                                  {p.bnName}
                                </p>
                              )}

                              <div className="flex items-center gap-1.5 mt-1.5 flex-wrap text-[11px] text-slate-400">
                                <span className="px-1.5 py-0.5 rounded bg-slate-950 border border-slate-800 font-medium text-slate-300">
                                  {p.brand || 'জেনারেল'}
                                </span>
                                <span>•</span>
                                <span className="px-1.5 py-0.5 rounded bg-slate-950 border border-slate-800 font-medium text-slate-300">
                                  {p.unit || 'পিস'}
                                </span>
                                {p.category && p.category !== 'General' && (
                                  <>
                                    <span>•</span>
                                    <span className="text-slate-500">{p.category}</span>
                                  </>
                                )}
                              </div>
                            </div>
                          </div>

                          {/* Price & Stock Stats Card */}
                          <div className="grid grid-cols-2 gap-2 mt-3 p-2 rounded-xl bg-slate-950/80 border border-slate-800/80">
                            <div>
                              <span className="text-[10px] text-slate-400 block font-medium">
                                {saleMode === 'RETAIL' ? (language === 'bn' ? 'খুচরা দর:' : 'Retail Price:') : `${t.wholesalePrice}:`}
                              </span>
                              <span className="text-sm font-extrabold text-emerald-400 font-mono-num">
                                {formatCurrency(saleMode === 'RETAIL' ? (p.retailPrice || p.mrp || p.wholesalePrice) : p.wholesalePrice, language)}
                              </span>
                            </div>

                            <div className="text-right">
                              <span className="text-[10px] text-slate-400 block font-medium">{t.inStock}:</span>
                              <span
                                className={`text-sm font-bold font-mono-num ${
                                  isLowStock ? 'text-rose-400' : 'text-slate-200'
                                }`}
                              >
                                {p.stockQuantity} <span className="text-[10px] font-normal text-slate-400">{p.unit}</span>
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Solid, High-Contrast Action Buttons: + বিক্রি (Sale) and - রিপ্লেস (Replacement) */}
                        <div className="pt-2 border-t border-slate-800/90 w-full">
                          <div className="grid grid-cols-2 gap-2 w-full">
                            {/* Sale (+) Button or Stepper */}
                            {inSaleCart ? (
                              <div className="flex items-center justify-between bg-emerald-950/90 px-1.5 py-1.5 rounded-xl border-2 border-emerald-500 shadow-md min-w-0">
                                <button
                                  type="button"
                                    onClick={() => {
                                      if (inSaleCart.quantity > 0) {
                                        updateCartQty(inSaleCart.cartItemId, inSaleCart.quantity - 1);
                                      } else {
                                        removeFromCart(inSaleCart.cartItemId);
                                      }
                                    }}
                                  className="w-7 h-7 shrink-0 rounded-lg bg-emerald-900/80 hover:bg-emerald-800 text-emerald-200 hover:text-white flex items-center justify-center transition cursor-pointer"
                                  title="বিক্রয় পরিমাণ কমান"
                                >
                                  <Minus className="w-3.5 h-3.5" />
                                </button>
                                <div className="text-center px-1 min-w-0 flex-1">
                                  <span className="font-extrabold text-sm text-emerald-300 font-mono-num block leading-none">
                                    +{inSaleCart.quantity}
                                  </span>
                                  <span className="text-[9px] text-emerald-400 font-bold block mt-0.5 truncate">বিক্রি</span>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => updateCartQty(inSaleCart.cartItemId, inSaleCart.quantity + 1)}
                                  className="w-7 h-7 shrink-0 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white flex items-center justify-center transition shadow cursor-pointer"
                                  title="বিক্রয় পরিমাণ বাড়ান"
                                >
                                  <Plus className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            ) : (
                              <button
                                type="button"
                                onClick={() => addToCart(p, 'SALE')}
                                className="w-full py-2.5 px-2 bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white rounded-xl text-xs sm:text-[13px] font-black tracking-tight transition-all shadow-md hover:shadow-emerald-600/30 flex items-center justify-center gap-1.5 cursor-pointer active:scale-95 border border-emerald-400/40 select-none min-w-0"
                                title="চালানে নতুন বিক্রয় পণ্য হিসেবে যোগ করুন"
                              >
                                <Plus className="w-4 h-4 text-emerald-100 shrink-0" />
                                <span className="truncate">+ বিক্রি</span>
                              </button>
                            )}

                            {/* Market Replacement (-) Button or Stepper */}
                            {inReplaceCart ? (
                              <div className="flex items-center justify-between bg-rose-950/90 px-1.5 py-1.5 rounded-xl border-2 border-rose-500 shadow-md min-w-0">
                                <button
                                  type="button"
                                    onClick={() => {
                                      if (inReplaceCart.quantity > 0) {
                                        updateCartQty(inReplaceCart.cartItemId, inReplaceCart.quantity - 1);
                                      } else {
                                        removeFromCart(inReplaceCart.cartItemId);
                                      }
                                    }}
                                  className="w-7 h-7 shrink-0 rounded-lg bg-rose-900/80 hover:bg-rose-800 text-rose-200 hover:text-white flex items-center justify-center transition cursor-pointer"
                                  title="রিপ্লেস পরিমাণ কমান"
                                >
                                  <Minus className="w-3.5 h-3.5" />
                                </button>
                                <div className="text-center px-1 min-w-0 flex-1">
                                  <span className="font-extrabold text-sm text-rose-300 font-mono-num block leading-none">
                                    -{inReplaceCart.quantity}
                                  </span>
                                  <span className="text-[9px] text-rose-400 font-bold block mt-0.5 truncate">রিপ্লেস</span>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => updateCartQty(inReplaceCart.cartItemId, inReplaceCart.quantity + 1)}
                                  className="w-7 h-7 shrink-0 rounded-lg bg-rose-600 hover:bg-rose-500 text-white flex items-center justify-center transition shadow cursor-pointer"
                                  title="রিপ্লেস পরিমাণ বাড়ান"
                                >
                                  <Plus className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            ) : (
                              <button
                                type="button"
                                onClick={() => addToCart(p, 'REPLACEMENT')}
                                className="w-full py-2.5 px-2 bg-rose-600 hover:bg-rose-500 active:bg-rose-700 text-white rounded-xl text-xs sm:text-[13px] font-black tracking-tight transition-all shadow-md hover:shadow-rose-600/30 flex items-center justify-center gap-1.5 cursor-pointer active:scale-95 border border-rose-400/40 select-none min-w-0"
                                title="মার্কেট থেকে রিপ্লেস/ফেরত পণ্য হিসেবে ইনভয়েসে মাইনাস করুন"
                              >
                                <RotateCcw className="w-4 h-4 text-rose-100 shrink-0" />
                                <span className="truncate">- রিপ্লেস</span>
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Cart & Billing (5 cols on large screens, sticky for convenience) */}
            <div className="lg:col-span-5 space-y-3 lg:sticky lg:top-24">
              <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 shadow-lg space-y-4">
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                  <div className="flex items-center gap-2">
                    <ShoppingCart className="w-4 h-4 text-emerald-400" />
                    <h3 className="font-bold text-xs sm:text-sm text-white">{t.cartTitle}</h3>
                  </div>
                  {cart.length > 0 && (
                    <button
                      onClick={clearCart}
                      className="text-[11px] text-rose-400 hover:text-rose-300 font-semibold flex items-center gap-1"
                    >
                      <Trash2 className="w-3 h-3" />
                      <span>{language === 'bn' ? 'কার্ট খালি করুন' : 'Clear Cart'}</span>
                    </button>
                  )}
                </div>

                {/* Cart Items List */}
                {cart.length === 0 ? (
                  <div className="py-12 text-center text-slate-500 text-xs">
                    {t.cartEmpty}
                  </div>
                ) : (
                  <div className="space-y-2 max-h-[220px] lg:max-h-[340px] xl:max-h-[420px] overflow-y-auto pr-1">
                    {cart.map((item) => {
                      const isRep = item.itemType === 'REPLACEMENT';
                      const lineTotal = item.quantity * item.unitPrice;

                      return (
                        <div
                          key={item.cartItemId}
                          className={`p-2.5 rounded-xl border transition flex items-center justify-between gap-2 ${
                            isRep
                              ? 'bg-rose-950/20 border-rose-800/60 hover:border-rose-600/80'
                              : 'bg-slate-950 border-slate-800/80'
                          }`}
                        >
                          <div className="flex items-center gap-2 min-w-0 flex-1">
                            {item.product.image ? (
                              <img
                                src={item.product.image}
                                alt={item.product.name}
                                className="w-9 h-9 rounded-lg object-cover border border-slate-700 shrink-0"
                              />
                            ) : (
                              <div className="w-9 h-9 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-center shrink-0 text-slate-500">
                                <Package className="w-4 h-4 text-slate-500" />
                              </div>
                            )}
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="font-bold text-xs text-white break-words leading-tight" title={item.product.name}>
                                  {item.product.name}
                                </span>
                                {/* 1-Click Type Switcher Button */}
                                <button
                                  type="button"
                                  onClick={() => toggleCartItemType(item.cartItemId)}
                                  className={`px-1.5 py-0.2 rounded text-[9.5px] font-bold border transition flex items-center gap-0.5 cursor-pointer ${
                                    isRep
                                      ? 'bg-rose-900/60 text-rose-300 border-rose-600 hover:bg-rose-800'
                                      : 'bg-emerald-950 text-emerald-300 border-emerald-700 hover:bg-emerald-900'
                                  }`}
                                  title="ক্লিক করে ধরন পরিবর্তন করুন (বিক্রি বা মার্কেট রিপ্লেস)"
                                >
                                  {isRep ? (
                                    <>
                                      <RotateCcw className="w-2.5 h-2.5 text-rose-400" />
                                      <span>রিপ্লেস (-)</span>
                                    </>
                                  ) : (
                                    <>
                                      <Plus className="w-2.5 h-2.5 text-emerald-400" />
                                      <span>বিক্রি (+)</span>
                                    </>
                                  )}
                                </button>
                              </div>

                              {/* If replacement, allow reason select */}
                              {isRep && (
                                <div className="mt-0.5">
                                  <select
                                    value={item.replacementReason || 'মার্কেট থেকে রিপ্লেস ফেরত'}
                                    onChange={(e) => updateCartReplacementReason(item.cartItemId, e.target.value)}
                                    className="bg-slate-900 border border-rose-900/60 rounded px-1 py-0.2 text-[9px] text-rose-300 focus:outline-none max-w-[170px]"
                                  >
                                    <option value="মার্কেট থেকে রিপ্লেস ফেরত">মার্কেট রিপ্লেস (সাধারণ ফেরত)</option>
                                    <option value="মেয়াদোত্তীর্ণ পণ্য (Expired)">মেয়াদোত্তীর্ণ পণ্য (Expired)</option>
                                    <option value="ড্যামেজ বা নষ্ট পণ্য">ড্যামেজ বা নষ্ট পণ্য</option>
                                    <option value="ভেঙে যাওয়া বা লিকেজ">ভাঙা বা লিকেজ</option>
                                  </select>
                                </div>
                              )}

                              <div className="flex items-center gap-2 mt-1 flex-wrap">
                                {/* Editable Sales Unit Price */}
                                <div className="flex items-center gap-1 bg-slate-900 px-1.5 py-0.5 rounded border border-slate-800" title={language === 'bn' ? 'দর পরিবর্তন করুন' : 'Edit unit price'}>
                                  <span className="text-[10px] text-slate-400">দর: ৳</span>
                                  <input
                                    type="number"
                                    min="0"
                                    step="any"
                                    value={item.unitPrice}
                                    onChange={(e) => updateCartUnitPrice(item.cartItemId, e.target.value === '' ? 0 : Math.max(0, Number(e.target.value)))}
                                    className={`w-14 bg-slate-950 border border-slate-700 rounded px-1 py-0.5 text-xs font-bold font-mono focus:outline-none ${
                                      isRep ? 'text-rose-300 focus:border-rose-500' : 'text-emerald-300 focus:border-emerald-500'
                                    }`}
                                  />
                                </div>

                                {/* Quantity Stepper with direct 0 editable input and zero indicator */}
                                <div className="flex items-center bg-slate-900 rounded border border-slate-800">
                                  <button
                                    type="button"
                                    onClick={() => updateCartQty(item.cartItemId, Math.max(0, item.quantity - 1))}
                                    className="px-1.5 py-0.5 text-slate-400 hover:text-white hover:bg-slate-800 transition text-xs font-bold"
                                    title="কম করুন"
                                  >
                                    -
                                  </button>
                                  <input
                                    type="number"
                                    min="0"
                                    step="any"
                                    value={item.quantity}
                                    onChange={(e) => updateCartQty(item.cartItemId, e.target.value === '' ? 0 : Math.max(0, Number(e.target.value)))}
                                    className={`w-11 bg-slate-950 border-x border-slate-800 text-center text-xs font-mono font-bold focus:outline-none ${
                                      item.quantity === 0 ? 'text-amber-300 font-extrabold' : isRep ? 'text-rose-300' : 'text-white'
                                    }`}
                                    title="পরিমাণ লিখুন (০ গ্রহণযোগ্য)"
                                  />
                                  <button
                                    type="button"
                                    onClick={() => updateCartQty(item.cartItemId, item.quantity + 1)}
                                    className="px-1.5 py-0.5 text-slate-400 hover:text-white hover:bg-slate-800 transition text-xs font-bold"
                                    title="বৃদ্ধি করুন"
                                  >
                                    +
                                  </button>
                                </div>
                                {item.quantity !== 0 ? (
                                  <button
                                    type="button"
                                    onClick={() => updateCartQty(item.cartItemId, 0)}
                                    className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-slate-900 hover:bg-amber-950 text-slate-400 hover:text-amber-300 border border-slate-800 transition"
                                    title="পরিমাণ ০ (শূন্য) করে রাখুন"
                                  >
                                    ০
                                  </button>
                                ) : (
                                  <span className="px-1.5 py-0.5 rounded text-[9.5px] font-extrabold bg-amber-500/20 text-amber-300 border border-amber-500/40">
                                    ০ পিস
                                  </span>
                                )}
                                <span className="text-[10px] text-slate-400 font-medium">
                                  {item.product.unit}
                                </span>

                                {/* Free / Bonus Quantity Stepper/Input */}
                                {!isRep && (
                                  <div className="flex items-center gap-1 bg-amber-950/40 px-1.5 py-0.5 rounded border border-amber-800/60" title={language === 'bn' ? 'ফ্রি বা বোনাস পণ্য সংখ্যা' : 'Free / Bonus pieces'}>
                                    <span className="text-[10px] text-amber-300 font-bold">🎁 ফ্রি:</span>
                                    <input
                                      type="number"
                                      min="0"
                                      value={item.freeQuantity || 0}
                                      onChange={(e) => updateCartFreeQty(item.cartItemId, Math.max(0, parseInt(e.target.value) || 0))}
                                      className="w-9 bg-slate-950 border border-slate-700 rounded px-1 py-0.2 text-xs font-bold font-mono text-amber-300 focus:outline-none focus:border-amber-400 text-center"
                                    />
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            <div className="text-right">
                              <div className={`font-bold text-xs font-mono-num ${isRep ? 'text-rose-400 font-extrabold' : 'text-emerald-400'}`}>
                                {isRep ? '-' : '+'}{formatCurrency(lineTotal, language)}
                              </div>
                              <span className="text-[9px] text-slate-500 block">
                                {isRep ? 'রিপ্লেস ফেরত' : (saleMode === 'RETAIL' ? 'খুচরা' : 'পাইকারি')}
                              </span>
                            </div>
                            <button
                              onClick={() => removeFromCart(item.cartItemId)}
                              className="p-1 text-slate-500 hover:text-rose-400 transition cursor-pointer"
                              title="Remove item"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Financial Summary */}
                {cart.length > 0 && (
                  <div className="space-y-3 pt-3 border-t border-slate-800">
                    <div className="space-y-1.5 text-xs">
                      {totalReplacementAmount > 0 ? (
                        <div className="space-y-1 bg-slate-950/70 p-2 rounded-lg border border-slate-800/80 mb-1.5">
                          <div className="flex justify-between text-emerald-400 font-semibold">
                            <span>মোট বিক্রয় (+):</span>
                            <span className="font-mono-num font-bold">+{formatCurrency(totalSalesAmount, language)}</span>
                          </div>
                          <div className="flex justify-between text-rose-400 font-bold">
                            <span>মার্কেট রিপ্লেস ফেরত (-):</span>
                            <span className="font-mono-num font-bold">-{formatCurrency(totalReplacementAmount, language)}</span>
                          </div>
                          <div className="flex justify-between text-white border-t border-slate-800/80 pt-1">
                            <span>সমন্বিত উপমোট:</span>
                            <span className="font-mono-num font-extrabold">{formatCurrency(subtotal, language)}</span>
                          </div>
                        </div>
                      ) : (
                        <div className="flex justify-between text-slate-400">
                          <span>{t.subtotal}:</span>
                          <span className="font-mono-num font-semibold text-white">
                            {formatCurrency(subtotal, language)}
                          </span>
                        </div>
                      )}

                      {/* Discount selector */}
                      <div className="flex items-center justify-between text-slate-400">
                        <span className="flex items-center gap-1">
                          <Percent className="w-3 h-3 text-amber-400" />
                          <span>{t.discount}:</span>
                        </span>
                        <div className="flex items-center gap-1">
                          {[0, 2, 5, 10].map((pct) => (
                            <button
                              key={pct}
                              onClick={() => setDiscountPercent(pct)}
                              className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                                discountPercent === pct
                                  ? 'bg-amber-500/30 text-amber-300 border border-amber-500/40'
                                  : 'bg-slate-800 text-slate-400'
                              }`}
                            >
                              {pct}%
                            </button>
                          ))}
                        </div>
                      </div>

                      {discountAmount > 0 && (
                        <div className="flex justify-between text-amber-400">
                          <span>{t.discount} ({discountPercent}%):</span>
                          <span className="font-mono-num font-semibold">
                            -{formatCurrency(discountAmount, language)}
                          </span>
                        </div>
                      )}

                      <div className="flex justify-between text-sm font-extrabold text-white pt-1 border-t border-slate-800/80">
                        <span>{t.grandTotal}:</span>
                        <span className="font-mono-num text-emerald-400">
                          {formatCurrency(grandTotal, language)}
                        </span>
                      </div>

                      {/* User Request: মেমোতে কত টাকা গ্রহণ করল টাইপ করার ঘর ও লাভ/লস (+ / -) হিসাব */}
                      <div className="p-3 bg-slate-900/90 rounded-xl border border-slate-700/80 space-y-2 mt-2">
                        <div className="flex items-center justify-between">
                          <label className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                            <Banknote className="w-3.5 h-3.5 text-amber-400" />
                            <span>{language === 'bn' ? 'মেমোতে কত টাকা গ্রহণ করল / লেখা হলো:' : 'Amount Received on Memo:'}</span>
                          </label>
                          {receivedAmountInput !== '' && (
                            <button
                              type="button"
                              onClick={() => setReceivedAmountInput('')}
                              className="text-[10px] text-amber-400 hover:text-amber-300 font-semibold underline cursor-pointer"
                            >
                              {language === 'bn' ? 'রিসেট' : 'Reset'}
                            </button>
                          )}
                        </div>

                        <div className="relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-xs">৳</span>
                          <input
                            type="number"
                            min="0"
                            step="any"
                            value={receivedAmountInput}
                            onChange={(e) => setReceivedAmountInput(e.target.value)}
                            placeholder={`${grandTotal}`}
                            className="w-full bg-slate-950 border border-slate-700 focus:border-amber-400 rounded-lg pl-7 pr-3 py-1.5 text-sm font-bold text-white font-mono-num focus:outline-none"
                          />
                        </div>

                        {/* Real-time Profit / Loss Difference Indicator */}
                        {(() => {
                          const receivedVal = receivedAmountInput !== '' ? Number(receivedAmountInput) : grandTotal;
                          const diff = receivedVal - grandTotal;
                          return (
                            <div className={`p-2 rounded-lg text-xs font-bold flex items-center justify-between border transition-all ${
                              diff < 0
                                ? 'bg-rose-950/60 border-rose-500/40 text-rose-300'
                                : diff > 0
                                ? 'bg-emerald-950/60 border-emerald-500/40 text-emerald-300'
                                : 'bg-slate-800/60 border-slate-700 text-slate-300'
                            }`}>
                              <span className="flex items-center gap-1.5">
                                {diff < 0 ? (
                                  <>
                                    <TrendingDown className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                                    <span>{language === 'bn' ? 'পার্থক্য (কম / লস):' : 'Difference (Loss):'}</span>
                                  </>
                                ) : diff > 0 ? (
                                  <>
                                    <TrendingUp className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                                    <span>{language === 'bn' ? 'পার্থক্য (লাভ / বাড়তি লাভ):' : 'Difference (Profit):'}</span>
                                  </>
                                ) : (
                                  <>
                                    <Check className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                    <span>{language === 'bn' ? 'সফটওয়্যার মূল্যের সমান:' : 'Exact Software Rate:'}</span>
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
                          );
                        })()}
                      </div>
                    </div>

                    {/* Payment Mode */}
                    <div className="space-y-2 pt-2 border-t border-slate-800">
                      <label className="text-[11px] font-bold text-slate-400 block">
                        {t.paymentMethod}
                      </label>
                      <div className="grid grid-cols-3 gap-1.5">
                        <button
                          type="button"
                          onClick={() => setPaymentType('CASH')}
                          className={`py-1.5 px-2 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1 ${
                            paymentType === 'CASH'
                              ? 'bg-emerald-600 text-white shadow'
                              : 'bg-slate-950 text-slate-400 border border-slate-800'
                          }`}
                        >
                          <Banknote className="w-3.5 h-3.5" />
                          <span>{t.cash}</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setPaymentType('CREDIT')}
                          className={`py-1.5 px-2 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1 ${
                            paymentType === 'CREDIT'
                              ? 'bg-rose-600 text-white shadow'
                              : 'bg-slate-950 text-slate-400 border border-slate-800'
                          }`}
                        >
                          <CreditCard className="w-3.5 h-3.5" />
                          <span>{t.credit}</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setPaymentType('PARTIAL')}
                          className={`py-1.5 px-2 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1 ${
                            paymentType === 'PARTIAL'
                              ? 'bg-amber-600 text-white shadow'
                              : 'bg-slate-950 text-slate-400 border border-slate-800'
                          }`}
                        >
                          <Percent className="w-3.5 h-3.5" />
                          <span>{t.partial}</span>
                        </button>
                      </div>

                      {paymentType === 'PARTIAL' && (
                        <div className="space-y-1">
                          <label className="text-[10px] text-slate-400 block">
                            {language === 'bn' ? 'নগদ জমা টাকার পরিমাণ:' : 'Paid Cash Amount:'}
                          </label>
                          <input
                            type="number"
                            min="0"
                            step="any"
                            value={paidAmountInput || ''}
                            onChange={(e) => setPaidAmountInput(Number(e.target.value))}
                            placeholder="0.00"
                            className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-1.5 text-xs font-bold text-white focus:outline-none focus:border-amber-500"
                          />
                        </div>
                      )}

                      <div className="flex items-center justify-between text-xs pt-1">
                        <span className="text-slate-400">{t.due}:</span>
                        <span className="font-bold text-rose-400 font-mono-num">
                          {formatCurrency(dueAmount, language)}
                        </span>
                      </div>
                    </div>

                    {/* Transaction Date Selector */}
                    <div className="space-y-1.5 pt-2 border-t border-slate-800">
                      <div className="flex items-center justify-between">
                        <label className="text-[11px] font-bold text-slate-300 flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5 text-emerald-400" />
                          <span>{language === 'bn' ? 'চালানের তারিখ (Date):' : 'Invoice Date:'}</span>
                        </label>
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => setSaleDate(getTodayDateString())}
                            className={`text-[9px] px-2 py-0.5 rounded font-bold transition ${
                              saleDate === getTodayDateString()
                                ? 'bg-emerald-600 text-white'
                                : 'bg-slate-800 text-slate-400 hover:text-white'
                            }`}
                          >
                            {language === 'bn' ? 'আজ' : 'Today'}
                          </button>
                          <button
                            type="button"
                            onClick={() => setSaleDate(getYesterdayDateString())}
                            className={`text-[9px] px-2 py-0.5 rounded font-bold transition ${
                              saleDate === getYesterdayDateString()
                                ? 'bg-emerald-600 text-white'
                                : 'bg-slate-800 text-slate-400 hover:text-white'
                            }`}
                          >
                            {language === 'bn' ? 'গতকাল' : 'Yesterday'}
                          </button>
                        </div>
                      </div>
                      <input
                        type="date"
                        value={saleDate}
                        onChange={(e) => setSaleDate(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-1.5 text-xs font-mono font-bold text-white focus:outline-none focus:border-emerald-500"
                      />
                    </div>

                    {/* Invoice / Memo Number & Duplicate Prevention */}
                    <div className="space-y-1.5 pt-2 border-t border-slate-800">
                      <div className="flex items-center justify-between">
                        <label className="text-[11px] font-bold text-slate-300 flex items-center gap-1">
                          <FileCheck className="w-3.5 h-3.5 text-emerald-400" />
                          <span>{language === 'bn' ? 'ইনভয়েস / মেমো নম্বর:' : 'Invoice / Memo No:'}</span>
                        </label>
                        <button
                          type="button"
                          onClick={regenerateInvoiceNo}
                          className="text-[9px] px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-emerald-400 font-bold transition flex items-center gap-1 cursor-pointer"
                          title="Generate new unique invoice number"
                        >
                          <RotateCcw className="w-2.5 h-2.5" />
                          <span>{language === 'bn' ? 'নতুন নম্বর' : 'New #'}</span>
                        </button>
                      </div>
                      <input
                        type="text"
                        value={customInvoiceNo}
                        onChange={(e) => setCustomInvoiceNo(e.target.value)}
                        placeholder="e.g. INV-20260831-1001"
                        className={`w-full bg-slate-950 border rounded-xl px-3 py-1.5 text-xs font-mono font-bold focus:outline-none ${
                          isDuplicateInvoice
                            ? 'border-rose-500 text-rose-300 focus:border-rose-400 bg-rose-950/20'
                            : 'border-slate-700 text-white focus:border-emerald-500'
                        }`}
                      />
                      {isDuplicateInvoice && (
                        <p className="text-[10px] text-rose-400 font-semibold flex items-center gap-1">
                          <AlertTriangle className="w-3 h-3 text-rose-400 shrink-0" />
                          <span>
                            {language === 'bn'
                              ? '⚠️ এই ইনভয়েস নম্বরটি ইতিমধ্যে সিস্টেমে বিদ্যমান!'
                              : '⚠️ Duplicate invoice number detected!'}
                          </span>
                        </p>
                      )}
                    </div>

                    {/* Entry Creator / Staff Selector */}
                    <div className="space-y-1.5 pt-2 border-t border-slate-800">
                      <label className="text-[11px] font-bold text-slate-300 flex items-center gap-1">
                        <User className="w-3.5 h-3.5 text-indigo-400" />
                        <span>{language === 'bn' ? 'কে এন্ট্রি করছেন (Created By):' : 'Created By (DSR / Counter / Admin):'}</span>
                      </label>
                      <select
                        value={selectedCreatorId}
                        onChange={(e) => setSelectedCreatorId(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-1.5 text-xs font-semibold text-white focus:outline-none focus:border-indigo-500"
                      >
                        {Array.from(new Map<string, (typeof users)[0]>(users.map((u) => [u.id, u])).values()).map((u) => (
                          <option key={u.id} value={u.id}>
                            {u.role === 'admin' ? '👑 Admin - ' : u.role === 'dsr' ? '🚚 DSR - ' : '🖥️ Counter - '}
                            {u.name} ({u.phone})
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Checkout Button */}
                    <button
                      type="button"
                      onClick={handleCheckout}
                      disabled={isDuplicateInvoice}
                      className={`w-full py-2.5 rounded-xl text-xs font-bold transition shadow-lg flex items-center justify-center gap-2 cursor-pointer ${
                        isDuplicateInvoice
                          ? 'bg-rose-900/50 text-rose-300 border border-rose-700 cursor-not-allowed opacity-80'
                          : 'bg-emerald-600 hover:bg-emerald-500 text-white'
                      }`}
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      <span>{t.confirmSale}</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: INVOICES & HISTORY (WITH DELETION & MEMO PRINT) */}
      {activeTab === 'INVOICES' && (
        <div className="space-y-4">
          <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-3">
            {/* Type Switcher: Sales Memos vs Scanned Supplier Challans */}
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setHistoryType('SALES')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                    historyType === 'SALES'
                      ? 'bg-emerald-600 text-white shadow'
                      : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
                  }`}
                >
                  <ShoppingCart className="w-3.5 h-3.5" />
                  <span>{language === 'bn' ? 'কাস্টমার বিক্রয় মেমো' : 'Customer Sales Memos'}</span>
                  <span className="px-1.5 py-0.2 rounded-full bg-slate-900 text-[10px] font-bold text-emerald-300">
                    {filteredOrders.length}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setHistoryType('PURCHASES')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                    historyType === 'PURCHASES'
                      ? 'bg-emerald-600 text-white shadow'
                      : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
                  }`}
                >
                  <Package className="w-3.5 h-3.5" />
                  <span>{language === 'bn' ? 'স্ক্যানকৃত সাপ্লায়ার চালান' : 'Scanned Supplier Challans'}</span>
                  <span className="px-1.5 py-0.2 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-bold">
                    {scannedSupplierPurchases.length}
                  </span>
                </button>
              </div>

              {/* Reset System Data / Clear Invoices Trigger */}
              <button
                type="button"
                onClick={openResetModal}
                id="btn-reset-invoices-pos"
                className="px-2.5 py-1.5 rounded-xl bg-rose-950/60 hover:bg-rose-900/80 text-rose-300 border border-rose-500/40 text-[11px] font-bold transition active:scale-95 flex items-center gap-1.5 shadow-sm cursor-pointer"
                title={language === 'bn' ? 'সকল ভুল মেমো ও ক্যাশ হিসাব রিসেট করুন' : 'Reset Invoices & Cash'}
              >
                <RotateCcw className="w-3.5 h-3.5 text-rose-400" />
                <span>{language === 'bn' ? 'ডাটা রিসেট' : 'Reset Data'}</span>
              </button>
            </div>

            {/* Quick alert if user is on Sales tab but only has scanned supplier challan */}
            {historyType === 'SALES' && orders.length === 0 && scannedSupplierPurchases.length > 0 && (
              <div
                onClick={() => setHistoryType('PURCHASES')}
                className="p-3 rounded-xl bg-emerald-950/50 border border-emerald-500/40 flex items-center justify-between gap-3 text-xs text-emerald-300 cursor-pointer hover:bg-emerald-900/30 transition shadow"
              >
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>
                    {language === 'bn'
                      ? `আপনার ১টি স্ক্যানকৃত ক্রয় চালান (${scannedSupplierPurchases[0]?.supplierName || 'DOUBLE EXCEL POWER'}, ৳${scannedSupplierPurchases[0]?.amount.toLocaleString()}) সংরক্ষিত আছে। হিসাব দেখতে এখানে ক্লিক করুন।`
                      : `You have 1 scanned purchase challan saved (৳${scannedSupplierPurchases[0]?.amount.toLocaleString()}). Click to view calculation.`}
                  </span>
                </div>
                <span className="font-bold underline text-emerald-400 text-[11px] whitespace-nowrap">
                  {language === 'bn' ? 'চালান ও হিসাব দেখুন →' : 'View Calculation →'}
                </span>
              </div>
            )}

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
              <div>
                <h3 className="font-bold text-sm text-white flex items-center gap-2">
                  <History className="w-4 h-4 text-emerald-400" />
                  <span>
                    {historyType === 'PURCHASES'
                      ? language === 'bn'
                        ? 'স্ক্যানকৃত সাপ্লায়ার চালান তালিকা'
                        : 'Scanned Supplier Purchase Challans'
                      : language === 'bn'
                      ? 'বিক্রয় মেমো ও চালান তালিকা'
                      : 'Sales Invoices & Past Memos'}
                  </span>
                </h3>
                <p className="text-xs text-slate-400">
                  {historyType === 'PURCHASES'
                    ? language === 'bn'
                      ? 'ইনবক্স/স্ক্যানার থেকে গৃহীত পণ্য ও মূল্যের হিসাব'
                      : 'Calculations from scanned supplier invoices and inventory additions'
                    : language === 'bn'
                    ? 'ভুল মেমো এন্ট্রি হলে সরাসরি ডিলিট করতে পারবেন (স্বয়ংক্রিয় স্টক ও বকেয়া রিভার্স সহ)'
                    : 'Search past invoices, print memos, or delete wrong entries with auto-stock restoration'}
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {historyType === 'SALES' && (
                  <>
                    <button
                      type="button"
                      onClick={() => {
                        const exportDate = invoiceDateFilter === 'TODAY'
                          ? new Date().toISOString().slice(0, 10)
                          : invoiceDateFilter === 'YESTERDAY'
                          ? (() => { const d = new Date(); d.setDate(d.getDate() - 1); return d.toISOString().slice(0, 10); })()
                          : invoiceDateFilter !== 'ALL'
                          ? invoiceDateFilter
                          : 'ALL';
                        const res = generateDailySalesStatementPdf(filteredOrders, exportDate, businessProfile);
                        setPdfPreviewResult(res);
                      }}
                      id="btn-sales-statement-pdf"
                      className="px-2.5 py-1.5 bg-emerald-600/20 hover:bg-emerald-600 text-emerald-300 hover:text-white border border-emerald-500/40 rounded-xl text-[11px] font-bold transition flex items-center gap-1.5 active:scale-95 cursor-pointer shadow-sm"
                      title="Export Daily Sales Statement PDF"
                    >
                      <FileText className="w-3.5 h-3.5 text-emerald-400" />
                      <span>{language === 'bn' ? 'বিক্রয় রেজিস্টার PDF' : 'Sales Register PDF'}</span>
                    </button>

                    {isAdmin && (
                      <button
                        type="button"
                        onClick={() => {
                          const exportDate = invoiceDateFilter === 'TODAY'
                            ? new Date().toISOString().slice(0, 10)
                            : invoiceDateFilter === 'YESTERDAY'
                            ? (() => { const d = new Date(); d.setDate(d.getDate() - 1); return d.toISOString().slice(0, 10); })()
                            : invoiceDateFilter !== 'ALL'
                            ? invoiceDateFilter
                            : undefined;
                          const creatorLabel = creatorFilter === 'dsr' ? 'ডিএসআর (DSR)' : creatorFilter === 'counter' ? 'কাউন্টার' : creatorFilter === 'admin' ? 'এডমিন' : 'সকল স্টাফ';
                          const filterTitle = exportDate
                            ? `${creatorLabel} বিক্রয় ও নিট লাভ স্টেটমেন্ট (${exportDate})`
                            : `${creatorLabel} সকল বিক্রয়ের নিট লাভ স্টেটমেন্ট`;
                          const res = generateSalesProfitStatementPdf(
                            filteredOrders,
                            products,
                            { filterDate: exportDate, presetTitle: filterTitle },
                            businessProfile
                          );
                          setPdfPreviewResult(res);
                        }}
                        className="px-2.5 py-1.5 bg-amber-600/20 hover:bg-amber-600 text-amber-300 hover:text-white border border-amber-500/40 rounded-xl text-[11px] font-bold transition flex items-center gap-1.5 active:scale-95 cursor-pointer shadow-sm"
                        title="Export Sales Profit Statement PDF"
                      >
                        <TrendingUp className="w-3.5 h-3.5 text-amber-400" />
                        <span>{language === 'bn' ? 'লাভ স্টেটমেন্ট PDF' : 'Profit Statement PDF'}</span>
                      </button>
                    )}

                    {isAdmin ? (
                      <div className="flex flex-wrap items-center gap-1.5">
                        <div className="flex flex-wrap items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800 text-[11px]">
                          <button
                            type="button"
                            onClick={() => setCreatorFilter('admin')}
                            className={`px-2.5 py-1 rounded-lg font-bold transition flex items-center gap-1.5 cursor-pointer ${
                              creatorFilter === 'admin'
                                ? 'bg-amber-600 text-white shadow-sm'
                                : 'text-slate-400 hover:text-white'
                            }`}
                            title="এডমিন সরাসরি সেলস চালান"
                          >
                            <span>👑 এডমিন সেলস</span>
                            <span className="text-[10px] px-1.5 py-0.2 bg-black/40 rounded-full font-mono">{adminOrdersCount}</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => setCreatorFilter('dsr')}
                            className={`px-2.5 py-1 rounded-lg font-bold transition flex items-center gap-1.5 cursor-pointer ${
                              creatorFilter === 'dsr'
                                ? 'bg-indigo-600 text-white shadow-sm'
                                : 'text-slate-400 hover:text-white'
                            }`}
                            title="ডিএসআর ফিল্ড সেলস চালান"
                          >
                            <span>🚚 ডিএসআর সেলস</span>
                            <span className="text-[10px] px-1.5 py-0.2 bg-black/40 rounded-full font-mono">{dsrOrdersCount}</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => setCreatorFilter('counter')}
                            className={`px-2.5 py-1 rounded-lg font-bold transition flex items-center gap-1.5 cursor-pointer ${
                              creatorFilter === 'counter'
                                ? 'bg-sky-600 text-white shadow-sm'
                                : 'text-slate-400 hover:text-white'
                            }`}
                            title="ক্যাশ কাউন্টার পিওএস সেলস চালান"
                          >
                            <span>🖥️ কাউন্টার সেলস</span>
                            <span className="text-[10px] px-1.5 py-0.2 bg-black/40 rounded-full font-mono">{counterOrdersCount}</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => setCreatorFilter('ALL')}
                            className={`px-2.5 py-1 rounded-lg font-bold transition flex items-center gap-1.5 cursor-pointer ${
                              creatorFilter === 'ALL'
                                ? 'bg-emerald-600 text-white shadow-sm'
                                : 'text-slate-400 hover:text-white'
                            }`}
                            title="সকল বিক্রয় চালান"
                          >
                            <span>📋 সকল মেমো</span>
                            <span className="text-[10px] px-1.5 py-0.2 bg-black/40 rounded-full font-mono">{orders.length}</span>
                          </button>
                        </div>

                        <button
                          type="button"
                          onClick={openStaffSyncModal}
                          id="btn-pos-open-staff-sync"
                          className="px-2.5 py-1.5 rounded-xl bg-purple-950/80 hover:bg-purple-900 border border-purple-500/50 text-purple-200 text-[11px] font-bold flex items-center gap-1.5 transition active:scale-95 cursor-pointer shadow-sm"
                          title="মাল্টি-ডিভাইস স্টাফ ডাটা আপডেট কেন্দ্র"
                        >
                          <RefreshCw className="w-3.5 h-3.5 text-purple-400" />
                          <span>{language === 'bn' ? 'স্টাফ সিঙ্ক হাব' : 'Staff Sync'}</span>
                        </button>
                      </div>
                    ) : currentRole === 'dsr' ? (
                      <div className="flex flex-wrap items-center gap-2">
                        <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800 text-[11px]">
                          <button
                            type="button"
                            onClick={() => setCreatorFilter('dsr')}
                            className={`px-2.5 py-1 rounded-lg font-bold transition flex items-center gap-1.5 cursor-pointer ${
                              creatorFilter === 'dsr'
                                ? 'bg-indigo-600 text-white shadow-sm'
                                : 'text-slate-400 hover:text-white'
                            }`}
                            title="আমার ডিএসআর ফিল্ড সেলস চালান"
                          >
                            <Truck className="w-3.5 h-3.5" />
                            <span>🚚 আমার ডিএসআর ({dsrOrdersCount})</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => setCreatorFilter('ALL')}
                            className={`px-2.5 py-1 rounded-lg font-bold transition flex items-center gap-1.5 cursor-pointer ${
                              creatorFilter === 'ALL'
                                ? 'bg-emerald-600 text-white shadow-sm'
                                : 'text-slate-400 hover:text-white'
                            }`}
                            title="সকল বিক্রয় মেমো"
                          >
                            <FileText className="w-3.5 h-3.5" />
                            <span>📋 সকল মেমো ({orders.length})</span>
                          </button>
                        </div>
                        <button
                          type="button"
                          onClick={handleSyncRoleTransactions}
                          disabled={isSyncingRole}
                          id="btn-pos-sync-dsr"
                          className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-900 text-white font-bold text-xs flex items-center gap-1.5 transition active:scale-95 cursor-pointer shadow-sm"
                          title="ডিএসআরের মেমোগুলো এডমিন প্যানেলে আপলোড করুন"
                        >
                          <RefreshCw className={`w-3.5 h-3.5 ${isSyncingRole ? 'animate-spin' : ''}`} />
                          <span>{isSyncingRole ? (language === 'bn' ? 'আপলোড হচ্ছে...' : 'Uploading...') : (language === 'bn' ? 'ডিএসআর ডাটা এডমিনে আপলোড' : 'Upload DSR to Admin')}</span>
                        </button>
                      </div>
                    ) : (
                      <div className="flex flex-wrap items-center gap-2">
                        <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800 text-[11px]">
                          <button
                            type="button"
                            onClick={() => setCreatorFilter('counter')}
                            className={`px-2.5 py-1 rounded-lg font-bold transition flex items-center gap-1.5 cursor-pointer ${
                              creatorFilter === 'counter'
                                ? 'bg-sky-600 text-white shadow-sm'
                                : 'text-slate-400 hover:text-white'
                            }`}
                            title="আমার কাউন্টার সেলস চালান"
                          >
                            <Store className="w-3.5 h-3.5" />
                            <span>🖥️ আমার কাউন্টার ({counterOrdersCount})</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => setCreatorFilter('ALL')}
                            className={`px-2.5 py-1 rounded-lg font-bold transition flex items-center gap-1.5 cursor-pointer ${
                              creatorFilter === 'ALL'
                                ? 'bg-emerald-600 text-white shadow-sm'
                                : 'text-slate-400 hover:text-white'
                            }`}
                            title="সকল বিক্রয় মেমো"
                          >
                            <FileText className="w-3.5 h-3.5" />
                            <span>📋 সকল মেমো ({orders.length})</span>
                          </button>
                        </div>
                        <button
                          type="button"
                          onClick={handleSyncRoleTransactions}
                          disabled={isSyncingRole}
                          id="btn-pos-sync-counter"
                          className="px-3 py-1.5 rounded-xl bg-sky-600 hover:bg-sky-500 disabled:bg-sky-900 text-white font-bold text-xs flex items-center gap-1.5 transition active:scale-95 cursor-pointer shadow-sm"
                          title="কাউন্টারের মেমোগুলো এডমিন প্যানেলে আপলোড করুন"
                        >
                          <RefreshCw className={`w-3.5 h-3.5 ${isSyncingRole ? 'animate-spin' : ''}`} />
                          <span>{isSyncingRole ? (language === 'bn' ? 'আপলোড হচ্ছে...' : 'Uploading...') : (language === 'bn' ? 'কাউন্টার ডাটা এডমিনে আপলোড' : 'Upload Counter to Admin')}</span>
                        </button>
                      </div>
                    )}
                  </>
                )}

                {/* Date Filter Bar */}
                <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800 text-[11px]">
                  <button
                    type="button"
                    onClick={() => setInvoiceDateFilter('ALL')}
                    className={`px-2 py-1 rounded-lg font-bold transition ${
                      invoiceDateFilter === 'ALL'
                        ? 'bg-emerald-600 text-white'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    {language === 'bn' ? 'সব তারিখ' : 'All'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setInvoiceDateFilter('TODAY')}
                    className={`px-2 py-1 rounded-lg font-bold transition ${
                      invoiceDateFilter === 'TODAY'
                        ? 'bg-emerald-600 text-white'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    {language === 'bn' ? 'আজ' : 'Today'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setInvoiceDateFilter('YESTERDAY')}
                    className={`px-2 py-1 rounded-lg font-bold transition ${
                      invoiceDateFilter === 'YESTERDAY'
                        ? 'bg-emerald-600 text-white'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    {language === 'bn' ? 'গতকাল' : 'Yesterday'}
                  </button>
                  <input
                    type="date"
                    value={invoiceDateFilter !== 'ALL' && invoiceDateFilter !== 'TODAY' && invoiceDateFilter !== 'YESTERDAY' ? invoiceDateFilter : ''}
                    onChange={(e) => setInvoiceDateFilter(e.target.value || 'ALL')}
                    className="bg-slate-900 border border-slate-700 rounded-lg px-1.5 py-0.5 text-[11px] text-white font-mono focus:outline-none focus:border-emerald-500"
                    title="Filter by specific date"
                  />
                </div>

                <div className="relative sm:w-72">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    placeholder={
                      language === 'bn'
                        ? 'মেমো/চালান নং, সাপ্লায়ার/দোকান বা পণ্যের নাম...'
                        : 'Invoice/Challan #, supplier/shop or product name...'
                    }
                    value={searchInvoice}
                    onChange={(e) => setSearchInvoice(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>
            </div>

            {historyType === 'PURCHASES' ? (
              filteredPurchases.length === 0 ? (
                <div className="py-12 text-center text-slate-500 text-xs">
                  {language === 'bn' ? 'কোনো স্ক্যানকৃত ক্রয় চালান পাওয়া যায়নি' : 'No scanned purchase challans found.'}
                </div>
              ) : (
                <div className="space-y-2.5 max-h-[600px] overflow-y-auto pr-1">
                  {filteredPurchases.map((challan) => {
                    const sup = suppliers.find((s) => s.id === challan.supplierId);
                    const challanRef = (challan.referenceNo || '').trim().toLowerCase();
                    const linkedItemsSummary = Array.isArray(challan.items) && challan.items.length > 0
                      ? challan.items
                      : products
                          .filter((p) =>
                            (p.challanReferences || []).some((r) => (r.challanNo || '').trim().toLowerCase() === challanRef) ||
                            (p.latestChallanNo || '').trim().toLowerCase() === challanRef
                          )
                          .map((p) => {
                            const ref = (p.challanReferences || []).find((r) => (r.challanNo || '').trim().toLowerCase() === challanRef);
                            return {
                              name: p.name,
                              quantity: ref?.quantity !== undefined && !isNaN(Number(ref.quantity)) ? Math.max(0, Number(ref.quantity)) : 0,
                              costPrice: ref?.costPrice || p.costPrice || 0,
                              totalPrice: (ref?.quantity !== undefined && !isNaN(Number(ref.quantity)) ? Math.max(0, Number(ref.quantity)) : 0) * (ref?.costPrice || p.costPrice || 0),
                            };
                          });

                    return (
                      <div
                        key={challan.id}
                        className="p-3.5 rounded-xl bg-slate-950 border border-emerald-900/40 hover:border-emerald-700/60 transition flex flex-col md:flex-row md:items-center justify-between gap-3 shadow"
                      >
                        <div className="flex-1 min-w-0 space-y-1.5">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-mono font-bold text-xs text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-800/60">
                              #{challan.referenceNo || challan.id.slice(-6)}
                            </span>
                            <h4 className="font-bold text-xs sm:text-sm text-white truncate">
                              {challan.supplierName || sup?.name || 'সাপ্লায়ার চালান'}
                            </h4>
                            <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold border bg-emerald-950/60 text-emerald-300 border-emerald-800/60">
                              📦 {language === 'bn' ? 'স্ক্যানকৃত ক্রয় চালান' : 'Scanned Purchase'}
                            </span>
                            {challan.scannedByName && (
                              <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold border bg-sky-950/70 text-sky-300 border-sky-800/60 flex items-center gap-1">
                                <span>{challan.scannedByRole === 'dsr' ? '🚚 ডিএসআর:' : challan.scannedByRole === 'counter' ? '🖥️ কাউন্টার:' : '👑 অ্যাডমিন:'}</span>
                                <span className="font-bold text-white">{challan.scannedByName}</span>
                              </span>
                            )}
                            <span className="text-[10px] text-slate-400">
                              📅 {challan.date}
                            </span>
                          </div>

                          {/* Product Summary Tag */}
                          {linkedItemsSummary.length > 0 && (
                            <div className="flex items-center gap-1.5 text-xs text-emerald-300/90 bg-emerald-950/30 px-2.5 py-1 rounded-lg border border-emerald-800/30 flex-wrap">
                              <Package className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                              <span className="font-bold text-white">{linkedItemsSummary.length}টি পণ্য:</span>
                              <span className="text-[11px] text-slate-300">
                                {linkedItemsSummary
                                  .slice(0, 3)
                                  .map((it) => `${it.name} (${it.quantity} পিস)`)
                                  .join(', ')}
                                {linkedItemsSummary.length > 3 ? ` +${linkedItemsSummary.length - 3}টি আরও` : ''}
                              </span>
                            </div>
                          )}

                          <div className="flex items-center gap-3 text-xs text-slate-400 flex-wrap">
                            <span>{language === 'bn' ? 'বিবরণ:' : 'Notes:'} <b className="text-slate-200">{challan.notes || 'Inward stock addition'}</b></span>
                            <span>•</span>
                            <span>{language === 'bn' ? 'চালানের মোট মূল্য:' : 'Total Cost:'} <b className="text-emerald-400 font-mono-num">{formatCurrency(challan.amount, language)}</b></span>
                            {sup && (
                              <>
                                <span>•</span>
                                <span>{language === 'bn' ? 'কোম্পানি পরিশোধ:' : 'Paid:'} <b className="text-white font-mono-num">{formatCurrency(sup.totalPaid || 0, language)}</b></span>
                                <span>•</span>
                                <span>{language === 'bn' ? 'কোম্পানি বকেয়া দায়:' : 'Due:'} <b className="text-rose-400 font-mono-num">{formatCurrency(sup.outstandingPayable || 0, language)}</b></span>
                              </>
                            )}
                          </div>
                        </div>

                        {/* Action buttons and Amount */}
                        <div className="flex items-center gap-2 shrink-0 flex-wrap sm:flex-nowrap">
                          <div className="text-right font-mono-num mr-1">
                            <span className="text-xs sm:text-sm font-bold text-emerald-400 block">
                              {formatCurrency(challan.amount, language)}
                            </span>
                            <span className="text-[10px] text-slate-400">
                              {language === 'bn' ? 'স্টক ইনটেক সম্পন্ন' : 'Stock Inward'}
                            </span>
                          </div>

                          {/* Edit Challan & Reconcile Stock Button */}
                          <button
                            type="button"
                            onClick={() => setEditingChallan(challan)}
                            className="px-2.5 py-1.5 bg-amber-600/20 hover:bg-amber-600 text-amber-300 hover:text-white rounded-lg text-xs font-semibold transition flex items-center gap-1 border border-amber-500/30 cursor-pointer active:scale-95 shadow-sm"
                            title={language === 'bn' ? 'চালান ও স্টক এডিট করুন' : 'Edit challan & reconcile stock'}
                          >
                            <Edit2 className="w-3.5 h-3.5 text-amber-400" />
                            <span>{language === 'bn' ? 'এডিট' : 'Edit'}</span>
                          </button>

                          {/* Delete Challan & Deduct Stock Button */}
                          <button
                            type="button"
                            onClick={() => setDeletingChallan(challan)}
                            className="px-2.5 py-1.5 bg-rose-600/20 hover:bg-rose-600 text-rose-300 hover:text-white rounded-lg text-xs font-semibold transition flex items-center gap-1 border border-rose-500/30 cursor-pointer active:scale-95 shadow-sm"
                            title={language === 'bn' ? 'ভুল চালান ডিলিট ও স্টক মাইনাস করুন' : 'Delete wrong challan & deduct stock'}
                          >
                            <Trash2 className="w-3.5 h-3.5 text-rose-400" />
                            <span>{language === 'bn' ? 'ডিলিট' : 'Delete'}</span>
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )
            ) : filteredOrders.length === 0 ? (
              <div className="py-12 text-center space-y-3 bg-slate-950/60 rounded-2xl border border-slate-800 p-6">
                <FileText className="w-8 h-8 text-slate-500 mx-auto" />
                <p className="text-sm font-semibold text-slate-300">
                  {language === 'bn'
                    ? 'নির্বাচিত ফিল্টারে কোনো মেমো পাওয়া যায়নি'
                    : 'No sales invoices found matching the current filter.'}
                </p>
                {orders.length > 0 && (
                  <p className="text-xs text-slate-400">
                    {language === 'bn'
                      ? `সিস্টেমে মোট ${orders.length}টি বিক্রয় মেমো সংরক্ষিত রয়েছে। সকল মেমো ও লেনদেন দেখতে নিচের বাটন চাপুন:`
                      : `Total ${orders.length} memos available. Click below to view all:`}
                  </p>
                )}
                {orders.length > 0 && (
                  <div className="flex justify-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setInvoiceDateFilter('ALL');
                        setCreatorFilter('ALL');
                        setSearchInvoice('');
                      }}
                      className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-md active:scale-95 cursor-pointer"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      <span>{language === 'bn' ? 'সকল তারিখ ও লেনদেন দেখুন' : 'Show All Dates & Transactions'}</span>
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-2.5 max-h-[600px] overflow-y-auto pr-1">
                {filteredOrders.map((ord, idx) => {
                  if (!ord) return null;
                  const invNumber =
                    ord.invoiceNumber ||
                    ord.invoiceNo ||
                    (ord.id ? String(ord.id).slice(-6).toUpperCase() : `ORD-${idx + 1}`);
                  const total = ord.totalAmount || 0;
                  const paid = ord.paidAmount || 0;
                  const due = ord.dueAmount || 0;
                  const creatorRole = (ord.creatorRole || ord.salesPersonRole || 'counter').toLowerCase();
                  const creatorName = ord.creatorName || ord.salesPersonName || 'Staff';

                  return (
                    <div
                      key={ord.id || `ord-${idx}`}
                      className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 hover:border-slate-700 transition flex flex-col md:flex-row md:items-center justify-between gap-3"
                    >
                      <div className="flex-1 min-w-0 space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-mono font-bold text-xs text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-800/60">
                            #{invNumber}
                          </span>
                          <h4 className="font-bold text-xs sm:text-sm text-white truncate">
                            {ord.retailerName || ord.customerName || (language === 'bn' ? 'সাধারণ খদ্দের' : 'Counter Sale')}
                          </h4>
                          <span
                            className={`text-[10px] px-2 py-0.5 rounded-full font-semibold border ${
                              creatorRole === 'admin'
                                ? 'bg-purple-950/60 text-purple-300 border-purple-800/60'
                                : creatorRole === 'dsr'
                                ? 'bg-sky-950/60 text-sky-300 border-sky-800/60'
                                : 'bg-emerald-950/60 text-emerald-300 border-emerald-800/60'
                            }`}
                          >
                            {creatorRole === 'admin' ? '👑 Admin' : creatorRole === 'dsr' ? '🚚 DSR' : '🖥️ Counter'}: {creatorName}
                          </span>
                          <span className="text-[10px] text-slate-400">
                            📅 {formatDate(ord.date || ord.createdAt, language)}
                          </span>
                          {(ord.hasReplacements || (ord.totalReplacementAmount && ord.totalReplacementAmount > 0) || ord.items?.some((i: any) => i.isReplacement || i.itemType === 'REPLACEMENT' || Number(i.quantity) < 0)) && (
                            <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-rose-950/80 text-rose-300 border border-rose-800/80 flex items-center gap-1">
                              <RotateCcw className="w-2.5 h-2.5 text-rose-400" />
                              <span>মার্কেট রিপ্লেস সমন্বিত</span>
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-3 text-xs text-slate-400 flex-wrap">
                          <span>{language === 'bn' ? 'আইটেম:' : 'Items:'} <b className="text-slate-200">{ord.items?.length || 0} টি</b></span>
                          <span>•</span>
                          {/* Pieces Sold, Returned, and Net Total */}
                          {(() => {
                            const soldPcs = ord.totalSoldPieces !== undefined
                              ? ord.totalSoldPieces
                              : (ord.items || []).filter((i: any) => !(i.itemType === 'REPLACEMENT' || i.isReplacement || Number(i.quantity) < 0)).reduce((s: number, i: any) => s + (i.quantity !== undefined && !isNaN(Number(i.quantity)) ? Math.abs(Number(i.quantity)) : 0), 0);
                            const repPcs = ord.totalReturnedPieces !== undefined
                              ? ord.totalReturnedPieces
                              : (ord.items || []).filter((i: any) => (i.itemType === 'REPLACEMENT' || i.isReplacement || Number(i.quantity) < 0)).reduce((s: number, i: any) => s + (i.quantity !== undefined && !isNaN(Number(i.quantity)) ? Math.abs(Number(i.quantity)) : 0), 0);
                            const netPcs = soldPcs - repPcs;

                            return (
                              <>
                                <span className="text-[11px] font-semibold text-emerald-400 bg-emerald-950/40 px-2 py-0.5 rounded border border-emerald-800/40">
                                  📦 বিক্রয়: {soldPcs} পিস {repPcs > 0 ? `| ফেরত: -${repPcs} পিস` : ''} | নিট: {netPcs} পিস
                                </span>
                                <span>•</span>
                              </>
                            );
                          })()}
                          <span>{language === 'bn' ? 'মোট বিল:' : 'Total:'} <b className="text-emerald-400 font-mono-num">{formatCurrency(total, language)}</b></span>
                          {ord.totalReplacementAmount && ord.totalReplacementAmount > 0 && (
                            <>
                              <span>•</span>
                              <span>{language === 'bn' ? 'রিপ্লেস ফেরত:' : 'Replace:'} <b className="text-rose-400 font-mono-num">-{formatCurrency(ord.totalReplacementAmount, language)}</b></span>
                            </>
                          )}
                          <span>•</span>
                          <span>{language === 'bn' ? 'জমা:' : 'Paid:'} <b className="text-white font-mono-num">{formatCurrency(paid, language)}</b></span>
                          {due > 0 && (
                            <>
                              <span>•</span>
                              <span>{language === 'bn' ? 'বকেয়া:' : 'Due:'} <b className="text-rose-400 font-mono-num">{formatCurrency(due, language)}</b></span>
                            </>
                          )}
                          {isAdmin && (
                            <>
                              <span>•</span>
                              <span className="text-[11px] font-bold text-amber-300 bg-amber-950/60 px-2 py-0.5 rounded border border-amber-600/50">
                                💼 লভ্যাংশ: +{formatCurrency(ord.totalProfitAmount || ((ord.totalAmount || 0) * 0.15), language)}
                              </span>
                            </>
                          )}
                        </div>
                      </div>

                      {/* Action Buttons */}
                      <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
                        {/* Customer Memo PDF */}
                        <button
                          type="button"
                          onClick={() => {
                            const ret = retailers.find((r) => r.id === ord.retailerId);
                            const res = generateInvoiceMemoPdf(ord, ret, businessProfile, {
                              includeProfit: false,
                              isAdmin: false,
                              products,
                            });
                            setPdfPreviewResult(res);
                          }}
                          className="px-2.5 py-1.5 bg-emerald-950/60 hover:bg-emerald-900/70 text-emerald-300 hover:text-emerald-200 border border-emerald-500/40 rounded-lg text-xs font-semibold transition flex items-center gap-1 cursor-pointer"
                          title={language === 'bn' ? 'কাস্টমার মেমো PDF প্রিভিউ' : 'Customer Memo PDF'}
                        >
                          <FileText className="w-3.5 h-3.5 text-emerald-400" />
                          <span>PDF</span>
                        </button>

                        {/* Admin Profit PDF Button */}
                        {isAdmin && (
                          <button
                            type="button"
                            onClick={() => {
                              const ret = retailers.find((r) => r.id === ord.retailerId);
                              const res = generateAdminProfitInvoiceMemoPdf(ord, ret, businessProfile, products);
                              setPdfPreviewResult(res);
                            }}
                            className="px-2.5 py-1.5 bg-amber-950/70 hover:bg-amber-900/80 text-amber-300 hover:text-amber-200 border border-amber-500/50 rounded-lg text-xs font-bold transition flex items-center gap-1 cursor-pointer shadow-sm"
                            title={language === 'bn' ? 'প্রোডাক্টের লভ্যাংশ সহ এডমিন চালান PDF' : 'Admin Profit Invoice PDF'}
                          >
                            <TrendingUp className="w-3.5 h-3.5 text-amber-400" />
                            <span>{language === 'bn' ? 'লভ্যাংশ PDF' : 'Profit PDF'}</span>
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={() => setSelectedInvoiceForView(ord)}
                          className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white rounded-lg text-xs font-semibold transition flex items-center gap-1.5 border border-slate-700 cursor-pointer"
                        >
                          <Eye className="w-3.5 h-3.5 text-sky-400" />
                          <span>{language === 'bn' ? 'মেমো দেখুন' : 'View Memo'}</span>
                        </button>

                        {/* Edit / Revise Sales Memo Button */}
                        <button
                          type="button"
                          onClick={() => {
                            setEditingOrderForRevision(ord);
                            setIsEditOrderModalOpen(true);
                          }}
                          className="px-2.5 py-1.5 bg-amber-600/20 hover:bg-amber-600 text-amber-300 hover:text-white rounded-lg text-xs font-semibold transition flex items-center gap-1 border border-amber-500/40 cursor-pointer active:scale-95"
                          title="Edit invoice / Adjust quantities & replacements"
                        >
                          <Edit2 className="w-3.5 h-3.5 text-amber-400" />
                          <span>{language === 'bn' ? 'সংশোধন' : 'Edit'}</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => setDeletingOrder(ord)}
                          className="px-3 py-1.5 bg-rose-600/20 hover:bg-rose-600 text-rose-300 hover:text-white rounded-lg text-xs font-semibold transition flex items-center gap-1.5 border border-rose-500/30 cursor-pointer"
                          title="Delete wrong memo / Reverse stock"
                        >
                          <Trash2 className="w-3.5 h-3.5 text-rose-400 group-hover:text-white" />
                          <span>{language === 'bn' ? 'ভুল মেমো ডিলিট' : 'Delete / Void'}</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 3: PRODUCTS & INVENTORY MANAGEMENT */}
      {activeTab === 'PRODUCTS' && (
        <div className="space-y-4">
          <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="font-bold text-sm text-white flex items-center gap-2">
                  <Package className="w-4 h-4 text-emerald-400" />
                  <span>{language === 'bn' ? 'পণ্য তালিকা ও স্টক ব্যবস্থাপনা' : 'Product Inventory Management'}</span>
                </h3>
                <p className="text-xs text-slate-400">
                  {language === 'bn'
                    ? 'নতুন পণ্য এন্ট্রি করুন, পণ্যের দর/নাম পরিবর্তন করুন অথবা ভুল পণ্য তালিকা থেকে ডিলিট করুন'
                    : 'Add new items, modify price & stock, or delete mistaken product entries'}
                </p>
              </div>

              <button
                type="button"
                onClick={() => {
                  setAdminPriceTargetProductId(null);
                  setIsAdminPriceModalOpen(true);
                }}
                className="px-3.5 py-2 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow cursor-pointer active:scale-95"
                title="পাইকারি ও খুচরা বিক্রয় মূল্য এক সাথে এডিট করার ম্যানেজার"
              >
                <Tag className="w-4 h-4 text-amber-200" />
                <span>{language === 'bn' ? 'বিক্রয় দাম এডিটর (পাইকারি ও খুচরা)' : 'Sales Price Editor'}</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setStockPhotoTargetProductId(null);
                  setIsStockPhotoManagerOpen(true);
                }}
                className="px-3.5 py-2 bg-gradient-to-r from-teal-600 to-cyan-600 hover:from-teal-500 hover:to-cyan-500 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow cursor-pointer"
                title="স্টকের পণ্যে দ্রুত ছবি যুক্ত করার ম্যানেজার"
              >
                <Camera className="w-4 h-4 text-cyan-200" />
                <span>{language === 'bn' ? 'স্টক পণ্যের ছবি এন্ট্রি' : 'Stock Photos'}</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  const res = mergeAllDuplicateProducts();
                  setMergeFeedbackMsg(res.message);
                  setTimeout(() => setMergeFeedbackMsg(null), 6000);
                }}
                className="px-3.5 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow cursor-pointer active:scale-95"
                title="একাধিক ইনভয়েসে আসা একই নামের ডুপ্লিকেট পণ্য স্বয়ংক্রিয়ভাবে মার্জ ও স্টক একত্রিত করুন"
              >
                <RefreshCw className="w-4 h-4 text-purple-200" />
                <span>{language === 'bn' ? 'ডুপ্লিকেট স্টক মার্জ করুন' : 'Merge Duplicate Stock'}</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setEditingProduct(null);
                  setProductForm({
                    name: '',
                    brand: '',
                    category: 'General',
                    sku: '',
                    unit: 'pcs',
                    costPrice: 0,
                    wholesalePrice: 0,
                    retailPrice: 0,
                    stockQuantity: 0,
                    lowStockThreshold: 10,
                    image: '',
                  });
                  setIsAddProductOpen(true);
                }}
                className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow"
              >
                <PlusCircle className="w-4 h-4" />
                <span>{language === 'bn' ? 'নতুন পণ্য যুক্ত করুন' : 'Add New Product'}</span>
              </button>
            </div>

            {mergeFeedbackMsg && (
              <div className="p-3 rounded-xl bg-indigo-950/80 border border-indigo-500/50 flex items-center justify-between text-xs text-indigo-200 animate-in fade-in">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-indigo-400 shrink-0" />
                  <span className="font-semibold text-white">{mergeFeedbackMsg}</span>
                </div>
                <button
                  type="button"
                  onClick={() => setMergeFeedbackMsg(null)}
                  className="p-1 text-slate-400 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}

            {/* Quick Cart Status Banner in Products Tab */}
            {cart.length > 0 && (
              <div
                onClick={() => setActiveTab('POS')}
                className="p-3 rounded-2xl bg-emerald-950/70 border-2 border-emerald-500/60 flex items-center justify-between text-xs text-emerald-200 cursor-pointer hover:bg-emerald-900/50 transition shadow-lg"
              >
                <div className="flex items-center gap-2.5">
                  <ShoppingCart className="w-5 h-5 text-emerald-400 shrink-0" />
                  <div>
                    <span className="font-extrabold text-white text-sm">
                      {language === 'bn' ? 'চলতি বিক্রয় কার্ট সক্রিয় আছে:' : 'Active Sales Cart:'}{' '}
                    </span>
                    <span className="font-semibold text-emerald-300">
                      {salesCartItems.length} টি বিক্রি | {replacementCartItems.length} টি মার্কেট রিপ্লেস (নিট বিল: ৳{grandTotal.toLocaleString()})
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1.5 shadow"
                >
                  <span>{language === 'bn' ? 'POS মেমোতে যান' : 'Go to POS Cart'}</span>
                  <span>→</span>
                </button>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 min-[2200px]:grid-cols-5 gap-3.5">
              {filteredProducts.map((p) => {
                const inSaleCart = cart.find((item) => item.product.id === p.id && item.itemType === 'SALE');
                const inReplaceCart = cart.find((item) => item.product.id === p.id && item.itemType === 'REPLACEMENT');
                const breakdown = getProductChallanBreakdown(p, supplierLedger);

                return (
                  <div
                    key={p.id}
                    className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800/90 hover:border-slate-700 transition flex flex-col justify-between gap-3 shadow-md"
                  >
                    <div>
                      <div className="flex items-start gap-3">
                        <div
                          onClick={() => {
                            setStockPhotoTargetProductId(p.id);
                            setIsStockPhotoManagerOpen(true);
                          }}
                          className="relative group cursor-pointer shrink-0"
                          title={language === 'bn' ? 'ছবি তুলুন বা পরিবর্তন করুন' : 'Snap or change photo'}
                        >
                          {p.image ? (
                            <img
                              src={p.image}
                              alt={p.name}
                              className="w-14 h-14 rounded-xl object-cover border border-slate-700 shrink-0 shadow-sm group-hover:border-emerald-500 transition"
                            />
                          ) : (
                            <div className="w-14 h-14 rounded-xl bg-slate-900 border border-amber-500/40 flex flex-col items-center justify-center shrink-0 text-slate-500 group-hover:border-amber-400 transition">
                              <Camera className="w-4 h-4 text-amber-400" />
                              <span className="text-[8px] text-amber-300 font-bold">ছবি তুলুন</span>
                            </div>
                          )}
                          <div className="absolute inset-0 bg-black/50 rounded-xl opacity-0 group-hover:opacity-100 transition flex items-center justify-center">
                            <Camera className="w-4 h-4 text-white" />
                          </div>
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="flex items-start justify-between gap-1.5">
                            <h4 className="font-black text-sm sm:text-base text-white break-words leading-snug flex-1 tracking-tight" title={p.name}>
                              {p.name}
                            </h4>
                            <span className="text-[10px] px-2 py-0.5 rounded-md bg-slate-800 text-slate-300 font-mono font-semibold shrink-0 border border-slate-700/60">
                              {p.sku}
                            </span>
                          </div>
                          {p.bnName && p.bnName.trim() !== p.name.trim() && (
                            <p className="text-xs text-emerald-400/90 font-medium mt-0.5 leading-snug">
                              {p.bnName}
                            </p>
                          )}
                          <p className="text-[11px] text-slate-400 mt-1">{p.brand} • {p.category}</p>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 mt-3 text-xs bg-slate-900 p-2 rounded-xl border border-slate-800">
                        <div>
                          <span className="text-[10px] text-slate-500 block">{language === 'bn' ? 'ক্রয় দর' : 'Cost'}:</span>
                          <span className="font-semibold text-slate-300 font-mono-num">
                            {formatCurrency(p.costPrice, language)}
                          </span>
                        </div>
                        <div>
                          <span className="text-[10px] text-emerald-500/80 block">{language === 'bn' ? 'পাইকারি' : 'Wholesale'}:</span>
                          <span className="font-bold text-emerald-400 font-mono-num">
                            {formatCurrency(p.wholesalePrice, language)}
                          </span>
                        </div>
                        <div>
                          <span className="text-[10px] text-amber-500/80 block">{language === 'bn' ? 'খুচরা দর' : 'Retail'}:</span>
                          <span className="font-bold text-amber-300 font-mono-num">
                            {formatCurrency(p.retailPrice || p.mrp || Math.round(p.wholesalePrice * 1.15), language)}
                          </span>
                        </div>
                        <div>
                          <span className="text-[10px] text-slate-500 block">{language === 'bn' ? 'স্টক' : 'Stock'}:</span>
                          <span className="font-bold text-white font-mono-num">
                            {p.stockQuantity} {p.unit}
                          </span>
                        </div>
                      </div>

                      {/* Total Invoiced & Challan Breakdown Badge */}
                      <div className="mt-2.5 p-2 rounded-xl bg-slate-900/90 border border-slate-800/80 flex items-center justify-between gap-1 text-[11px]">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <FileText className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                          <span className="text-slate-400 shrink-0">{language === 'bn' ? 'মোট ক্রয়:' : 'Total Invoiced:'}</span>
                          <span className="font-bold text-sky-300 font-mono-num truncate">
                            {breakdown.totalPurchasedQty} {p.unit}
                          </span>
                          {breakdown.challans.length > 0 && (
                            <span className="text-[10px] px-1.5 py-0.2 rounded bg-sky-950 text-sky-300 border border-sky-800/60 font-semibold shrink-0">
                              {breakdown.challans.length}টি চালান
                            </span>
                          )}
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedProductForChallans(p);
                            setIsProductChallanBreakdownOpen(true);
                          }}
                          className="px-2 py-0.5 rounded-lg bg-sky-950/80 hover:bg-sky-900 text-sky-300 hover:text-white border border-sky-700/60 font-bold transition flex items-center gap-1 shrink-0 cursor-pointer text-[10px]"
                          title="এই প্রোডাক্টের সকল চালান ও ইনভয়েস হিস্ট্রি দেখুন"
                        >
                          <FileText className="w-3 h-3 text-sky-400" />
                          <span>{language === 'bn' ? 'চালান হিস্ট্রি' : 'History'}</span>
                        </button>
                      </div>
                    </div>

                    {/* Quick + বিক্রি and - রিপ্লেস Buttons in Products Tab */}
                    <div className="pt-2 border-t border-slate-800/80 space-y-2 w-full">
                      <div className="grid grid-cols-2 gap-2 w-full">
                        <button
                          type="button"
                          onClick={() => addToCart(p, 'SALE')}
                          className="w-full py-2 px-2 bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white rounded-xl text-xs sm:text-[13px] font-black transition flex items-center justify-center gap-1 shadow-sm cursor-pointer select-none min-w-0"
                          title="এই পণ্যটি মেমোতে বিক্রি হিসেবে যোগ করুন"
                        >
                          <Plus className="w-3.5 h-3.5 shrink-0" />
                          <span className="truncate">+ বিক্রি</span>
                          {inSaleCart && (
                            <span className="bg-emerald-950 text-emerald-300 px-1.5 py-0.2 rounded-full text-[10px] font-mono font-black ml-0.5 border border-emerald-400 shrink-0">
                              {inSaleCart.quantity}
                            </span>
                          )}
                        </button>

                        <button
                          type="button"
                          onClick={() => addToCart(p, 'REPLACEMENT')}
                          className="w-full py-2 px-2 bg-rose-600 hover:bg-rose-500 active:bg-rose-700 text-white rounded-xl text-xs sm:text-[13px] font-black transition flex items-center justify-center gap-1 shadow-sm cursor-pointer select-none min-w-0"
                          title="মার্কেট রিপ্লেস (ফেরত পণ্য) হিসেবে মেমোতে মাইনাস করুন"
                        >
                          <RotateCcw className="w-3.5 h-3.5 shrink-0" />
                          <span className="truncate">- রিপ্লেস</span>
                          {inReplaceCart && (
                            <span className="bg-rose-950 text-rose-300 px-1.5 py-0.2 rounded-full text-[10px] font-mono font-black ml-0.5 border border-rose-400 shrink-0">
                              {inReplaceCart.quantity}
                            </span>
                          )}
                        </button>
                      </div>

                      <div className="flex items-center justify-end gap-1.5 pt-1.5 border-t border-slate-800/60 flex-wrap">
                        <button
                          type="button"
                          onClick={() => {
                            setAdminPriceTargetProductId(p.id);
                            setIsAdminPriceModalOpen(true);
                          }}
                          className="px-2 py-1 bg-amber-950/60 hover:bg-amber-900/80 text-amber-300 hover:text-white rounded-lg text-xs font-semibold transition flex items-center gap-1 border border-amber-500/40 cursor-pointer"
                          title={language === 'bn' ? 'এই পণ্যের বিক্রয় দর (পাইকারি ও খুচরা) এডিট করুন' : 'Edit selling prices'}
                        >
                          <Tag className="w-3 h-3 text-amber-400" />
                          <span>{language === 'bn' ? 'বিক্রয় দর' : 'Price'}</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            setStockPhotoTargetProductId(p.id);
                            setIsStockPhotoManagerOpen(true);
                          }}
                          className="px-2 py-1 bg-emerald-950/60 hover:bg-emerald-900/80 text-emerald-300 hover:text-white rounded-lg text-xs font-semibold transition flex items-center gap-1 border border-emerald-500/40 cursor-pointer"
                          title={language === 'bn' ? 'ক্যামেরা দিয়ে ছবি তুলুন বা বদলান' : 'Snap photo'}
                        >
                          <Camera className="w-3 h-3 text-emerald-400" />
                          <span>{p.image ? (language === 'bn' ? 'ছবি বদল' : 'Change') : (language === 'bn' ? 'ছবি তুলুন' : 'Add Photo')}</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleOpenEditProduct(p)}
                          className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg text-xs font-semibold transition flex items-center gap-1"
                        >
                          <Edit2 className="w-3 h-3 text-emerald-400" />
                          <span>{language === 'bn' ? 'এডিট' : 'Edit'}</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => setDeletingProduct(p)}
                          className="px-2 py-1 bg-rose-600/20 hover:bg-rose-600 text-rose-300 hover:text-white rounded-lg text-xs font-semibold transition flex items-center gap-1 border border-rose-500/30"
                        >
                          <Trash2 className="w-3 h-3" />
                          <span>{language === 'bn' ? 'ডিলিট' : 'Delete'}</span>
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* VIEW 4: EXPENSES & PROFIT LOG (ক্যাশ কাউন্টার খরচ ও প্রফিট খাতা) */}
      {activeTab === 'EXPENSES' && (
        <div className="space-y-4 animate-in fade-in duration-200">
          {/* Hero Expense & Profit Card */}
          <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-slate-950 via-slate-900 to-amber-950/40 border-2 border-amber-500/40 shadow-xl space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 font-bold shrink-0 shadow-inner">
                  <Receipt className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base sm:text-lg font-black text-white tracking-tight">
                      {language === 'bn' ? 'ক্যাশ কাউন্টার ব্যয় ও প্রফিট সমন্বয়' : 'Counter Expenses & Profit Reconciliation'}
                    </h3>
                    <span className="px-2 py-0.5 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-300 text-[10px] font-bold">
                      {language === 'bn' ? 'লাইভ হিসাব' : 'Live Audit'}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400">
                    {language === 'bn'
                      ? 'বেতন, দোকান ভাড়া, বিদ্যুৎ বিল ও অন্যান্য খরচ যা প্রফিট থেকে মাইনাস হবে; প্রফিট পর্যাপ্ত না থাকলে মাইনাস ফিগার শো করবে'
                      : 'Salary, rent, electricity, and misc expenses deducted from profit (shows negative if deficit)'}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => openExpenseModal()}
                className="px-4 py-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 rounded-xl font-black text-xs flex items-center gap-2 shadow-lg shadow-amber-950 cursor-pointer active:scale-95 transition shrink-0 self-start sm:self-center"
              >
                <Plus className="w-4 h-4" />
                <span>{language === 'bn' ? '+ নতুন খরচ এন্ট্রি দিন' : '+ Record New Expense'}</span>
              </button>
            </div>

            {/* 4 Financial Matrix Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs">
              <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800">
                <span className="text-[10.5px] uppercase font-bold text-slate-400 block">
                  {language === 'bn' ? '১. কাউন্টার ড্রয়ার ক্যাশ' : '1. Counter Drawer Cash'}
                </span>
                <span className={`text-base sm:text-lg font-black font-mono-num mt-1 block ${cashCounter < 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
                  {formatCurrency(cashCounter, language)}
                </span>
                <span className="text-[10px] text-slate-500">
                  {cashCounter < 0 ? (language === 'bn' ? '⚠️ ড্রয়ার ঘাটতি' : 'Drawer Deficit') : (language === 'bn' ? 'বর্তমান ক্যাশ' : 'Live In Hand')}
                </span>
              </div>

              <div className="p-3 rounded-xl bg-slate-950/80 border border-emerald-500/30">
                <span className="text-[10.5px] uppercase font-bold text-emerald-400 block">
                  {language === 'bn' ? '২. বিক্রয় হতে মোট প্রফিট' : '2. Gross Sales Profit'}
                </span>
                <span className="text-base sm:text-lg font-black font-mono-num text-emerald-400 mt-1 block">
                  +{formatCurrency(grossProfit, language)}
                </span>
                <span className="text-[10px] text-slate-400">
                  {language === 'bn' ? 'সকল বিক্রয় মেমোর লাভ' : 'From All Invoices'}
                </span>
              </div>

              <div className="p-3 rounded-xl bg-slate-950/80 border border-rose-500/30">
                <span className="text-[10.5px] uppercase font-bold text-rose-400 block">
                  {language === 'bn' ? '৩. মোট দোকান খরচ (-)' : '3. Total Expenses (-)'}
                </span>
                <span className="text-base sm:text-lg font-black font-mono-num text-rose-400 mt-1 block">
                  -{formatCurrency(totalExpenses, language)}
                </span>
                <span className="text-[10px] text-rose-300/80">
                  {expenses.length} টি খরচ পরিশোধ
                </span>
              </div>

              {/* Net Realized Profit (Shows minus figure when deficit) */}
              <div className={`p-3 rounded-xl border-2 ${
                netRealizedProfit < 0
                  ? 'bg-rose-950/50 border-rose-500/70 shadow-lg shadow-rose-950/40'
                  : 'bg-emerald-950/50 border-emerald-500/70 shadow-lg shadow-emerald-950/40'
              }`}>
                <div className="flex items-center justify-between">
                  <span className={`text-[10.5px] uppercase font-extrabold ${netRealizedProfit < 0 ? 'text-rose-300' : 'text-emerald-300'}`}>
                    {language === 'bn' ? '৪. চূড়ান্ত নিট প্রফিট' : '4. Net Realized Profit'}
                  </span>
                  <span className={`text-[9px] font-bold px-1.5 py-0.2 rounded ${
                    netRealizedProfit < 0 ? 'bg-rose-500/30 text-rose-200' : 'bg-emerald-500/30 text-emerald-200'
                  }`}>
                    {netRealizedProfit < 0 ? (language === 'bn' ? 'মাইনাস ঘাটতি' : 'Deficit') : (language === 'bn' ? 'লাভ' : 'Net')}
                  </span>
                </div>
                <span className={`text-base sm:text-lg font-black font-mono-num mt-1 block ${
                  netRealizedProfit < 0 ? 'text-rose-400' : 'text-emerald-400'
                }`}>
                  {netRealizedProfit >= 0 ? '+' : ''}{formatCurrency(netRealizedProfit, language)}
                </span>
                <span className="text-[10px] text-slate-400 truncate block">
                  {netRealizedProfit < 0
                    ? (language === 'bn' ? '⚠️ লাভ পর্যাপ্ত নয় (মাইনাস)' : 'Deficit: expenses > profit')
                    : (language === 'bn' ? 'খরচ বাদে নীট মুনাফা' : 'Realized net profit')}
                </span>
              </div>
            </div>

            {netRealizedProfit < 0 && (
              <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 animate-pulse" />
                <span>
                  {language === 'bn'
                    ? `সতর্কতা: বিক্রয় মুনাফা অপেক্ষা খরচ বেশি থাকায় প্রফিট বর্তমানে মাইনাস ফিগার (${formatCurrency(netRealizedProfit, language)}) ঘাটতিতে দেখাচ্ছে।`
                    : `Alert: Operating expenses exceed sales profit. Net Profit is displayed as negative (${formatCurrency(netRealizedProfit, language)}).`}
                </span>
              </div>
            )}
          </div>

          {/* 4 Quick Category Action Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            {/* Card 1: Salary */}
            <div className="p-3.5 rounded-2xl bg-slate-900 border border-indigo-500/30 space-y-2 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-indigo-400 flex items-center gap-1.5">
                    <Users className="w-4 h-4" />
                    <span>{language === 'bn' ? '👔 স্টাফ বেতন' : 'Salary & Wages'}</span>
                  </span>
                  <span className="text-[10px] font-mono text-slate-400">
                    {expenses.filter((e) => e.category === 'SALARY').length} টি
                  </span>
                </div>
                <div className="text-base font-black font-mono-num text-indigo-300 mt-1">
                  {formatCurrency(
                    expenses.filter((e) => e.category === 'SALARY').reduce((s, e) => s + Number(e.amount || 0), 0),
                    language
                  )}
                </div>
              </div>
              <button
                type="button"
                onClick={() => openExpenseModal('SALARY')}
                className="w-full py-1.5 px-2 bg-indigo-600/30 hover:bg-indigo-600 text-indigo-200 hover:text-white rounded-lg text-xs font-bold transition flex items-center justify-center gap-1 cursor-pointer border border-indigo-500/40"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>{language === 'bn' ? 'বেতন এন্ট্রি নিন' : 'Add Salary'}</span>
              </button>
            </div>

            {/* Card 2: Shop Rent */}
            <div className="p-3.5 rounded-2xl bg-slate-900 border border-amber-500/30 space-y-2 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-amber-400 flex items-center gap-1.5">
                    <Building className="w-4 h-4" />
                    <span>{language === 'bn' ? '🏪 দোকান ভাড়া' : 'Shop Rent'}</span>
                  </span>
                  <span className="text-[10px] font-mono text-slate-400">
                    {expenses.filter((e) => e.category === 'SHOP_RENT').length} টি
                  </span>
                </div>
                <div className="text-base font-black font-mono-num text-amber-300 mt-1">
                  {formatCurrency(
                    expenses.filter((e) => e.category === 'SHOP_RENT').reduce((s, e) => s + Number(e.amount || 0), 0),
                    language
                  )}
                </div>
              </div>
              <button
                type="button"
                onClick={() => openExpenseModal('SHOP_RENT')}
                className="w-full py-1.5 px-2 bg-amber-600/30 hover:bg-amber-600 text-amber-200 hover:text-white rounded-lg text-xs font-bold transition flex items-center justify-center gap-1 cursor-pointer border border-amber-500/40"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>{language === 'bn' ? 'ভাড়া এন্ট্রি নিন' : 'Add Rent'}</span>
              </button>
            </div>

            {/* Card 3: Electricity Bill */}
            <div className="p-3.5 rounded-2xl bg-slate-900 border border-yellow-500/30 space-y-2 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-yellow-400 flex items-center gap-1.5">
                    <Zap className="w-4 h-4" />
                    <span>{language === 'bn' ? '⚡ বিদ্যুৎ বিল' : 'Electricity Bill'}</span>
                  </span>
                  <span className="text-[10px] font-mono text-slate-400">
                    {expenses.filter((e) => e.category === 'ELECTRICITY_BILL').length} টি
                  </span>
                </div>
                <div className="text-base font-black font-mono-num text-yellow-300 mt-1">
                  {formatCurrency(
                    expenses.filter((e) => e.category === 'ELECTRICITY_BILL').reduce((s, e) => s + Number(e.amount || 0), 0),
                    language
                  )}
                </div>
              </div>
              <button
                type="button"
                onClick={() => openExpenseModal('ELECTRICITY_BILL')}
                className="w-full py-1.5 px-2 bg-yellow-600/30 hover:bg-yellow-600 text-yellow-200 hover:text-white rounded-lg text-xs font-bold transition flex items-center justify-center gap-1 cursor-pointer border border-yellow-500/40"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>{language === 'bn' ? 'বিদ্যুৎ বিল দিন' : 'Add Power Bill'}</span>
              </button>
            </div>

            {/* Card 4: Other Expenses */}
            <div className="p-3.5 rounded-2xl bg-slate-900 border border-teal-500/30 space-y-2 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-teal-400 flex items-center gap-1.5">
                    <Receipt className="w-4 h-4" />
                    <span>{language === 'bn' ? '📦 অন্যান্য খরচ' : 'Other Expenses'}</span>
                  </span>
                  <span className="text-[10px] font-mono text-slate-400">
                    {expenses.filter((e) => e.category === 'OTHER').length} টি
                  </span>
                </div>
                <div className="text-base font-black font-mono-num text-teal-300 mt-1">
                  {formatCurrency(
                    expenses.filter((e) => e.category === 'OTHER').reduce((s, e) => s + Number(e.amount || 0), 0),
                    language
                  )}
                </div>
              </div>
              <button
                type="button"
                onClick={() => openExpenseModal('OTHER')}
                className="w-full py-1.5 px-2 bg-teal-600/30 hover:bg-teal-600 text-teal-200 hover:text-white rounded-lg text-xs font-bold transition flex items-center justify-center gap-1 cursor-pointer border border-teal-500/40"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>{language === 'bn' ? 'অন্যান্য খরচ দিন' : 'Add Misc'}</span>
              </button>
            </div>
          </div>

          {/* Expense History Table */}
          <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-3">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <h4 className="text-sm font-bold text-white flex items-center gap-2">
                <Receipt className="w-4 h-4 text-amber-400" />
                <span>{language === 'bn' ? 'কাউন্টার খরচের অডিট রেজিস্টার' : 'Counter Expense Audit Register'}</span>
                <span className="text-xs text-slate-400">({expenses.length} টি)</span>
              </h4>

              <button
                type="button"
                onClick={() => openExpenseModal()}
                className="px-3 py-1 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-lg text-xs flex items-center gap-1 transition cursor-pointer"
              >
                <Plus className="w-3 h-3" />
                <span>{language === 'bn' ? 'নতুন খরচ' : 'New Entry'}</span>
              </button>
            </div>

            <div className="rounded-xl border border-slate-800 overflow-hidden bg-slate-950/70">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-slate-900 text-slate-400 text-[10.5px] uppercase font-bold border-b border-slate-800">
                    <th className="py-2.5 px-3">তারিখ</th>
                    <th className="py-2.5 px-3">খাত</th>
                    <th className="py-2.5 px-3">বিবরণ / শিরোনাম</th>
                    <th className="py-2.5 px-3">প্রাপক</th>
                    <th className="py-2.5 px-3">পেমেন্ট সোর্স</th>
                    <th className="py-2.5 px-3 text-right">টাকা (৳)</th>
                    <th className="py-2.5 px-3 text-center">ডিলিট</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-sans">
                  {expenses.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-slate-500 text-xs">
                        {language === 'bn' ? 'এখনো কোনো খরচ এন্ট্রি করা হয়নি। "+ নতুন খরচ" বাটনে ক্লিক করে বেতন, ভাড়া বা বিল যোগ করুন।' : 'No expenses recorded yet.'}
                      </td>
                    </tr>
                  ) : (
                    expenses.map((exp) => (
                      <tr key={exp.id} className="hover:bg-slate-900/60 transition">
                        <td className="py-2 px-3 font-mono text-[11px] text-slate-400 whitespace-nowrap">
                          {exp.date}
                        </td>
                        <td className="py-2 px-3">
                          <span className="px-2 py-0.5 rounded-full bg-slate-800 text-[10px] font-bold text-amber-300 border border-slate-700">
                            {exp.categoryBn || exp.category}
                          </span>
                        </td>
                        <td className="py-2 px-3 font-bold text-white">
                          {exp.title}
                          {exp.notes && (
                            <span className="text-[10px] text-slate-500 block font-normal">নোট: {exp.notes}</span>
                          )}
                        </td>
                        <td className="py-2 px-3 text-slate-300">
                          {exp.recipientName || '-'}
                        </td>
                        <td className="py-2 px-3 text-[11px]">
                          {exp.paymentSource === 'CASH_DRAWER' ? (
                            <span className="text-emerald-400 font-semibold">🛒 কাউন্টার ড্রয়ার</span>
                          ) : (
                            <span className="text-sky-400 font-semibold">🏛️ ব্যাংক / অন্যান্য</span>
                          )}
                        </td>
                        <td className="py-2 px-3 text-right font-black font-mono-num text-rose-400 text-sm whitespace-nowrap">
                          -{formatCurrency(exp.amount, language)}
                        </td>
                        <td className="py-2 px-3 text-center">
                          <button
                            type="button"
                            onClick={() => {
                              if (confirm(language === 'bn' ? 'এই খরচ এন্ট্রিটি মুছে ফেলতে চান?' : 'Delete this expense entry?')) {
                                deleteExpense(exp.id);
                              }
                            }}
                            className="p-1 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-slate-800 transition cursor-pointer"
                            title="মুছে ফেলুন"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: MEMO / INVOICE PRINT & DETAILS VIEW */}
      {(createdMemo || selectedInvoiceForView) && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-5 space-y-4 shadow-2xl text-white">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <FileCheck className="w-5 h-5 text-emerald-400" />
                <h3 className="font-bold text-sm">
                  {language === 'bn' ? 'বিক্রয় চালান / ক্যাশ মেমো' : 'Sales Memo & Receipt'}
                </h3>
              </div>
              <button
                onClick={() => {
                  setCreatedMemo(null);
                  setSelectedInvoiceForView(null);
                }}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Printable Memo Layout */}
            {(() => {
              const inv = selectedInvoiceForView || createdMemo;
              const invNum = inv.invoiceNumber || inv.id?.slice(-6).toUpperCase();
              return (
                <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-3 text-xs font-mono">
                  <div className="text-center border-b border-slate-800 pb-2 relative">
                    <button
                      type="button"
                      onClick={openBusinessProfile}
                      className="absolute right-0 top-0 text-[10px] text-amber-400 hover:text-amber-300 flex items-center gap-1 bg-slate-900 border border-amber-500/30 px-1.5 py-0.5 rounded cursor-pointer transition"
                      title={language === 'bn' ? 'প্যাড ও ঠিকানা পরিবর্তন করুন' : 'Edit Business Header'}
                    >
                      <Building2 className="w-3 h-3 text-amber-400" />
                      <span>{language === 'bn' ? 'প্যাড' : 'Pad'}</span>
                    </button>
                    <h4 className="font-bold text-sm text-emerald-400">
                      {businessProfile.enterpriseName || activeAdminEnterprise || 'মাতৃছায়া টেলিকম'}
                    </h4>
                    {(businessProfile.address || businessProfile.godownAddress) && (
                      <p className="text-[10px] text-slate-300">
                        📍 {businessProfile.address}
                        {businessProfile.godownAddress ? ` • গুদাম: ${businessProfile.godownAddress}` : ''}
                      </p>
                    )}
                    <p className="text-[10px] text-slate-400">📞 {businessProfile.phone || activeAdminPhone || '01937200635'}</p>
                    <p className="text-[10px] text-slate-500 mt-1">Invoice #{invNum}</p>
                    <p className="text-[10px] text-slate-400">
                      📅 {inv.createdAt ? new Date(inv.createdAt).toLocaleString(language === 'bn' ? 'bn-BD' : 'en-US') : (inv.date ? formatDate(inv.date, language) : '')}
                    </p>
                  </div>

                  <div className="space-y-0.5 text-[11px]">
                    <p><b className="text-slate-400">Customer:</b> {inv.customerName || inv.shopName || inv.retailerName || inv.retailer?.shopName || 'নগদ ক্রেতা'}</p>
                    {(inv.retailerPhone || inv.retailer?.phone) && (
                      <p><b className="text-slate-400">Phone:</b> {inv.retailerPhone || inv.retailer?.phone}</p>
                    )}
                    <p><b className="text-slate-400">Sales By:</b> {inv.salesPersonRole?.toUpperCase()} ({inv.salesPersonName})</p>
                  </div>

                  {/* Piece Counts Box (কত পিস বিক্রয়, কত পিস ফেরত, সর্বমোট নিট ডেলিভারি) */}
                  {(() => {
                    const soldPcs = inv.totalSoldPieces !== undefined
                      ? inv.totalSoldPieces
                      : (inv.items || [])
                          .filter((i: any) => !(i.itemType === 'REPLACEMENT' || i.isReplacement || Number(i.quantity) < 0))
                          .reduce((sum: number, i: any) => sum + (i.quantity !== undefined && !isNaN(Number(i.quantity)) ? Math.abs(Number(i.quantity)) : 0), 0);
                    const repPcs = inv.totalReturnedPieces !== undefined
                      ? inv.totalReturnedPieces
                      : (inv.items || [])
                          .filter((i: any) => (i.itemType === 'REPLACEMENT' || i.isReplacement || Number(i.quantity) < 0))
                          .reduce((sum: number, i: any) => sum + (i.quantity !== undefined && !isNaN(Number(i.quantity)) ? Math.abs(Number(i.quantity)) : 0), 0);
                    const netPcs = soldPcs - repPcs;

                    return (
                      <div className="bg-slate-900 border border-slate-800 rounded-lg p-2.5 flex items-center justify-between text-[11px] font-sans">
                        <div className="flex items-center gap-1.5 text-emerald-400 font-semibold">
                          <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                          <span>{language === 'bn' ? 'বিক্রয়:' : 'Sold:'} <b className="font-mono text-xs">{soldPcs} পিস</b></span>
                        </div>
                        <div className="flex items-center gap-1.5 text-rose-400 font-semibold">
                          <span className="w-2 h-2 rounded-full bg-rose-400"></span>
                          <span>{language === 'bn' ? 'ফেরত:' : 'Return:'} <b className="font-mono text-xs">{repPcs} পিস</b></span>
                        </div>
                        <div className="flex items-center gap-1.5 text-sky-400 font-bold">
                          <span className="w-2 h-2 rounded-full bg-sky-400"></span>
                          <span>{language === 'bn' ? 'নিট ডেলিভারি:' : 'Net:'} <b className="font-mono text-xs">{netPcs} পিস</b></span>
                        </div>
                      </div>
                    );
                  })()}

                  <div className="border-t border-b border-slate-800 py-2 space-y-1.5">
                    {inv.items?.map((item: any, idx: number) => {
                      const isRep = item.itemType === 'REPLACEMENT' || item.isReplacement || Number(item.quantity) < 0;
                      const cleanQty = item.quantity !== undefined && !isNaN(Number(item.quantity)) ? Math.abs(Number(item.quantity)) : 0;
                      const lineVal = Math.abs(item.totalPrice ?? (cleanQty * (item.unitPrice || 0)));

                      return (
                        <div key={idx} className="flex justify-between items-start gap-2">
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="truncate font-medium max-w-[200px] text-white">
                                {item.productName || item.name}
                              </span>
                              {isRep ? (
                                <span className="px-1.5 py-0.2 rounded bg-rose-950 text-rose-300 border border-rose-800 text-[9.5px] font-bold">
                                  রিপ্লেস (-)
                                </span>
                              ) : (
                                <span className="px-1.5 py-0.2 rounded bg-emerald-950 text-emerald-300 border border-emerald-800 text-[9.5px] font-bold">
                                  বিক্রি (+)
                                </span>
                              )}
                            </div>
                            <div className="text-[10px] text-slate-400">
                              {isRep ? '-' : ''}{cleanQty} {item.unit || 'পিস'} × {formatCurrency(item.unitPrice || 0, language)}
                              {item.freeQuantity && item.freeQuantity > 0 ? (
                                <span className="ml-1.5 text-amber-300 font-bold bg-amber-950/80 px-1 py-0.2 rounded border border-amber-700/60 inline-flex items-center gap-0.5">
                                  🎁 +{item.freeQuantity} ফ্রি
                                </span>
                              ) : null}
                            </div>
                            {item.replacementReason && (
                              <span className="text-[9.5px] text-rose-400 block font-sans">কারণ: {item.replacementReason}</span>
                            )}
                            {item.challanRefNo && (
                              <span className="text-[9.5px] text-sky-400 font-mono block">রেফ চালান: #{item.challanRefNo}</span>
                            )}
                          </div>
                          <span className={`font-bold shrink-0 font-mono ${isRep ? 'text-rose-400 font-extrabold' : 'text-slate-200'}`}>
                            {isRep ? '-' : '+'}{formatCurrency(lineVal, language)}
                          </span>
                        </div>
                      );
                    })}
                  </div>

                  {/* Admin Product Profit Breakdown Card */}
                  {isAdmin && (
                    <div className="bg-emerald-950/40 border border-emerald-500/40 rounded-xl p-3 space-y-2 font-sans">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5 text-emerald-300 font-bold text-xs">
                          <TrendingUp className="w-4 h-4 text-emerald-400" />
                          <span>{language === 'bn' ? '💼 এডমিন প্রোডাক্ট লভ্যাংশ বিশ্লেষণ' : '💼 Admin Product Profit Analysis'}</span>
                        </div>
                        <label className="flex items-center gap-1.5 text-[10px] text-amber-300 font-semibold cursor-pointer">
                          <input
                            type="checkbox"
                            checked={isAdminProfitPdfMode}
                            onChange={(e) => setIsAdminProfitPdfMode(e.target.checked)}
                            className="rounded border-amber-500 text-amber-500 focus:ring-0 cursor-pointer"
                          />
                          <span>{language === 'bn' ? 'পিডিএফে লভ্যাংশ দেখান' : 'Include Profit in PDF'}</span>
                        </label>
                      </div>

                      <div className="space-y-1 text-[10px] border-t border-emerald-900/60 pt-2">
                        {(() => {
                          let sumCost = 0;
                          let sumProfit = 0;
                          const rows = (inv.items || []).map((item: any, idx: number) => {
                            const isRep = item.itemType === 'REPLACEMENT' || item.isReplacement || Number(item.quantity) < 0;
                            const cleanQty = item.quantity !== undefined && !isNaN(Number(item.quantity)) ? Math.abs(Number(item.quantity)) : 0;
                            const cleanPrice = Number(item.unitPrice || 0);
                            const matched = products.find(
                              (p) => p.id === item.productId || (p.name && item.productName && p.name.trim().toLowerCase() === item.productName.trim().toLowerCase())
                            );
                            const cleanCost = Number(item.costPrice ?? matched?.costPrice ?? 0);
                            const unitProfit = cleanPrice - cleanCost;
                            const lineProfit = isRep ? 0 : (cleanQty * unitProfit);
                            const marginPct = cleanPrice > 0 && !isRep ? ((unitProfit / cleanPrice) * 100) : 0;
                            if (!isRep) {
                              sumCost += cleanQty * cleanCost;
                              sumProfit += lineProfit;
                            }

                            return (
                              <div key={idx} className="flex items-center justify-between py-0.5 border-b border-emerald-950/40">
                                <span className="truncate max-w-[140px] text-slate-300 font-medium">
                                  {item.productName || item.name}
                                </span>
                                <div className="flex items-center gap-1.5 font-mono">
                                  <span className="text-slate-400" title="কেনা দর">কেনা: {formatCurrency(cleanCost, language)}</span>
                                  <span className={isRep ? 'text-slate-500' : (lineProfit >= 0 ? 'text-emerald-400 font-bold' : 'text-rose-400 font-bold')} title="লাভ">
                                    {isRep ? 'রিপ্লেস' : `লাভ: +${formatCurrency(lineProfit, language)} (${marginPct.toFixed(0)}%)`}
                                  </span>
                                </div>
                              </div>
                            );
                          });

                          const grossSalesVal = inv.totalSalesAmount || (inv.subtotal || inv.totalAmount);
                          const overallMargin = grossSalesVal > 0 ? (sumProfit / grossSalesVal) * 100 : 0;

                          return (
                            <>
                              {rows}
                              <div className="pt-2 flex justify-between items-center text-xs font-bold border-t border-emerald-800 text-emerald-300">
                                <span>মোট বিক্রয় লভ্যাংশ (Net Profit):</span>
                                <span className="font-mono">+{formatCurrency(sumProfit, language)} ({overallMargin.toFixed(1)}% মার্জিন)</span>
                              </div>
                            </>
                          );
                        })()}
                      </div>
                    </div>
                  )}

                  <div className="space-y-1 text-right">
                    {inv.totalReplacementAmount > 0 && (
                      <div className="space-y-0.5 pb-1 border-b border-slate-800/80 mb-1">
                        <div className="flex justify-between text-emerald-400">
                          <span>মোট নতুন বিক্রয় (+):</span>
                          <span className="font-bold">+{formatCurrency(inv.totalSalesAmount || ((inv.subtotal || inv.totalAmount) + inv.totalReplacementAmount), language)}</span>
                        </div>
                        <div className="flex justify-between text-rose-400 font-bold">
                          <span>মার্কেট রিপ্লেস ফেরত (-):</span>
                          <span>-{formatCurrency(inv.totalReplacementAmount, language)}</span>
                        </div>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span className="text-slate-400">সমন্বিত উপমোট:</span>
                      <span>{formatCurrency(inv.subtotal || inv.totalAmount, language)}</span>
                    </div>
                    {inv.discountAmount > 0 && (
                      <div className="flex justify-between text-amber-400">
                        <span>Discount:</span>
                        <span>-{formatCurrency(inv.discountAmount, language)}</span>
                      </div>
                    )}
                    <div className="flex justify-between font-bold text-white text-xs border-t border-slate-800 pt-1">
                      <span>Total:</span>
                      <span className="text-emerald-400">{formatCurrency(inv.totalAmount, language)}</span>
                    </div>
                    {inv.priceDifference !== undefined && inv.priceDifference !== 0 && (
                      <div className={`flex justify-between font-bold text-xs ${inv.priceDifference > 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                        <span>{inv.priceDifference > 0 ? (language === 'bn' ? 'মেমোতে বাড়তি লাভ:' : 'Extra Profit:') : (language === 'bn' ? 'মেমোতে লস / ছাড়:' : 'Below Price (Loss):')}</span>
                        <span>{inv.priceDifference > 0 ? `+${formatCurrency(inv.priceDifference, language)}` : `-${formatCurrency(Math.abs(inv.priceDifference), language)}`}</span>
                      </div>
                    )}
                    <div className="flex justify-between text-emerald-400">
                      <span>Paid ({inv.paymentType}):</span>
                      <span>{formatCurrency(inv.paidAmount, language)}</span>
                    </div>
                    {inv.dueAmount > 0 && (
                      <div className="flex justify-between text-rose-400 font-bold">
                        <span>Due:</span>
                        <span>{formatCurrency(inv.dueAmount, language)}</span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })()}

            <div className="flex flex-wrap items-center gap-2 pt-2">
              {(() => {
                const activeInv = selectedInvoiceForView || createdMemo;
                if (!activeInv) return null;
                const ret = retailers.find((r) => r.id === activeInv.retailerId);
                return (
                  <>
                    <button
                      type="button"
                      onClick={() => {
                        const res = generateInvoiceMemoPdf(activeInv, ret, businessProfile, {
                          includeProfit: isAdmin && isAdminProfitPdfMode,
                          isAdmin,
                          products,
                        });
                        setPdfPreviewResult(res);
                      }}
                      className="flex-1 py-2 bg-slate-800 hover:bg-slate-700 text-emerald-300 border border-slate-700 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer"
                      title="Preview PDF"
                    >
                      <Eye className="w-4 h-4 text-emerald-400" />
                      <span>{language === 'bn' ? (isAdmin && isAdminProfitPdfMode ? 'এডমিন কপি প্রিভিউ' : 'PDF প্রিভিউ') : 'PDF Preview'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        generateInvoiceMemoPdf(activeInv, ret, businessProfile, {
                          includeProfit: false,
                          isAdmin: false,
                          products,
                        }).download();
                      }}
                      className="py-2 px-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 shadow cursor-pointer"
                      title="Download Customer Memo PDF"
                    >
                      <Download className="w-4 h-4" />
                      <span>{language === 'bn' ? 'মেমো ডাউনলোড' : 'Download Memo'}</span>
                    </button>

                    {isAdmin && (
                      <button
                        type="button"
                        onClick={() => {
                          generateAdminProfitInvoiceMemoPdf(activeInv, ret, businessProfile, products).download();
                        }}
                        className="py-2 px-3 bg-amber-600 hover:bg-amber-500 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 shadow cursor-pointer"
                        title={language === 'bn' ? 'প্রোডাক্টের লভ্যাংশ সহ এডমিন চালান PDF ডাউনলোড' : 'Download Admin Profit Invoice PDF'}
                      >
                        <TrendingUp className="w-4 h-4" />
                        <span>{language === 'bn' ? 'এডমিন লভ্যাংশ PDF' : 'Admin Profit PDF'}</span>
                      </button>
                    )}
                  </>
                );
              })()}

              <button
                type="button"
                onClick={handlePrint}
                className="py-2 px-3 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 border border-slate-700 cursor-pointer"
              >
                <Printer className="w-4 h-4 text-emerald-400" />
                <span>{t.print}</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setCreatedMemo(null);
                  setSelectedInvoiceForView(null);
                }}
                className="py-2 px-4 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-bold transition cursor-pointer"
              >
                <span>{language === 'bn' ? 'সম্পন্ন' : 'Done'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: DELETE / VOID INVOICE CONFIRMATION */}
      {deletingOrder && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-rose-500/50 rounded-2xl w-full max-w-md p-5 space-y-4 shadow-2xl text-white">
            <div className="flex items-center gap-3 text-rose-400">
              <div className="w-10 h-10 rounded-xl bg-rose-500/20 flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-rose-400" />
              </div>
              <div>
                <h3 className="font-bold text-sm text-white">
                  {language === 'bn' ? 'ভুল মেমো ডিলিট / বাতিল করবেন?' : 'Delete & Void Mistaken Invoice?'}
                </h3>
                <p className="text-xs text-slate-400">
                  #{deletingOrder.invoiceNumber || deletingOrder.id.slice(-6).toUpperCase()} • {deletingOrder.retailerName}
                </p>
              </div>
            </div>

            <div className="p-3 bg-rose-950/30 border border-rose-500/30 rounded-xl space-y-2 text-xs text-rose-200">
              <p>
                {language === 'bn'
                  ? 'এই মেমোটি ডিলিট করলে নিম্নোক্ত পরিবর্তনগুলো স্বয়ংক্রিয়ভাবে কার্যকর হবে:'
                  : 'Deleting this invoice will automatically execute the following rollback steps:'}
              </p>
              <ul className="list-disc list-inside space-y-1 text-slate-300">
                <li>
                  {language === 'bn'
                    ? 'বিক্রিত পণ্যের স্টক স্বয়ংক্রিয়ভাবে গোডাউনে ফেরত যোগ হবে।'
                    : 'Sold items will be automatically restored back to warehouse inventory stock.'}
                </li>
                <li>
                  {language === 'bn'
                    ? 'কাস্টমারের বকেয়া ও মোট ক্রয়ের হিসাব থেকে এই মেমোর টাকা কর্তন হবে।'
                    : 'Retailer outstanding due and purchase records will be adjusted.'}
                </li>
                <li>
                  {language === 'bn'
                    ? 'ক্যাশ রিসিভ হয়ে থাকলে ক্যাশ ড্রয়ার ব্যালেন্স সমন্বয় হবে।'
                    : 'Cash collection drawer amounts will be rolled back.'}
                </li>
              </ul>
            </div>

            <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
              <input
                type="checkbox"
                checked={restoreStockOnDelete}
                onChange={(e) => setRestoreStockOnDelete(e.target.checked)}
                className="rounded border-slate-700 bg-slate-950 text-emerald-500 focus:ring-0"
              />
              <span>{language === 'bn' ? 'পণ্যের স্টক গোডাউনে ফেরত যোগ করুন (Restore Stock)' : 'Restore stock to warehouse'}</span>
            </label>

            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => setDeletingOrder(null)}
                className="flex-1 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold transition"
              >
                {t.cancel}
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteOrder}
                className="flex-1 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-lg"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>{language === 'bn' ? 'হ্যাঁ, ডিলিট করুন' : 'Yes, Delete Invoice'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: ADD / EDIT PRODUCT */}
      {(isAddProductOpen || editingProduct) && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-5 space-y-4 shadow-2xl text-white">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="font-bold text-sm flex items-center gap-2">
                <Package className="w-4 h-4 text-emerald-400" />
                <span>
                  {editingProduct
                    ? (language === 'bn' ? 'প্রোডাক্ট তথ্য সংশোধন' : 'Edit Product Details')
                    : (language === 'bn' ? 'নতুন প্রোডাক্ট এন্ট্রি' : 'Add New Product')}
                </span>
              </h3>
              <button
                onClick={() => {
                  setEditingProduct(null);
                  setIsAddProductOpen(false);
                }}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveProduct} className="space-y-3 text-xs">
              {/* Product Photo Uploader & Camera */}
              <div className="space-y-1.5 p-3 rounded-xl bg-slate-950 border border-slate-800">
                <div className="flex items-center justify-between">
                  <span className="text-slate-400 font-medium flex items-center gap-1.5">
                    <Camera className="w-3.5 h-3.5 text-emerald-400" />
                    <span>{language === 'bn' ? 'পণ্যের ছবি (ম্যানুয়াল / ক্যামেরা)' : 'Product Photo'}</span>
                  </span>
                  {productForm.image && (
                    <button
                      type="button"
                      onClick={() => setProductForm({ ...productForm, image: '' })}
                      className="text-[10px] text-rose-400 hover:text-rose-300 flex items-center gap-0.5 cursor-pointer"
                    >
                      <Trash2 className="w-3 h-3" />
                      <span>{language === 'bn' ? 'ছবি মুছুন' : 'Remove'}</span>
                    </button>
                  )}
                </div>

                {isFormCameraOpen ? (
                  <div className="relative rounded-xl overflow-hidden bg-black aspect-video flex items-center justify-center border border-emerald-500/50">
                    <video
                      ref={formVideoRef}
                      autoPlay
                      playsInline
                      muted
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-x-0 bottom-2 flex items-center justify-center gap-2">
                      <button
                        type="button"
                        onClick={handleFormSnapPhoto}
                        disabled={isFormCompressing}
                        className="px-4 py-1.5 rounded-full bg-emerald-500 text-slate-950 font-bold text-xs shadow-lg flex items-center gap-1 cursor-pointer"
                      >
                        <Camera className="w-3.5 h-3.5" />
                        <span>{isFormCompressing ? 'প্রসেসিং...' : (language === 'bn' ? 'ছবি তুলুন' : 'Snap')}</span>
                      </button>
                      <button
                        type="button"
                        onClick={handleStopFormCamera}
                        className="p-1.5 rounded-full bg-slate-900 text-white text-xs border border-slate-700 cursor-pointer"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-3">
                    {productForm.image ? (
                      <img
                        src={productForm.image}
                        alt="Product Preview"
                        className="w-16 h-16 rounded-xl object-cover border border-emerald-500/40 shadow-sm shrink-0"
                      />
                    ) : (
                      <div className="w-16 h-16 rounded-xl bg-slate-900 border border-slate-800 flex flex-col items-center justify-center text-slate-500 shrink-0">
                        <ImageIcon className="w-6 h-6" />
                        <span className="text-[9px] mt-0.5">ছবি নেই</span>
                      </div>
                    )}

                    <div className="flex-1 space-y-1.5">
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={handleStartFormCamera}
                          className="flex-1 py-1.5 px-2 bg-slate-900 hover:bg-slate-800 text-emerald-300 rounded-lg text-xs font-semibold border border-slate-700 hover:border-emerald-500/40 flex items-center justify-center gap-1.5 transition cursor-pointer"
                        >
                          <Camera className="w-3.5 h-3.5" />
                          <span>{language === 'bn' ? 'ক্যামেরা' : 'Take Photo'}</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => formFileInputRef.current?.click()}
                          className="flex-1 py-1.5 px-2 bg-slate-900 hover:bg-slate-800 text-sky-300 rounded-lg text-xs font-semibold border border-slate-700 hover:border-sky-500/40 flex items-center justify-center gap-1.5 transition cursor-pointer"
                        >
                          <Upload className="w-3.5 h-3.5" />
                          <span>{language === 'bn' ? 'ফাইল আপলোড' : 'Upload'}</span>
                        </button>
                      </div>
                      <p className="text-[10px] text-slate-500 leading-tight">
                        {language === 'bn'
                          ? 'ছবি দিলে সেলস ও রিপ্লেসমেন্ট এন্ট্রিতে সহজেই ছবি দিয়ে চিহ্নিত করা যাবে।'
                          : 'Product photo enables quick visual recognition in sales & replacements.'}
                      </p>
                    </div>

                    <input
                      ref={formFileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleFormFileUpload}
                      className="hidden"
                    />
                  </div>
                )}
              </div>

              <div className="space-y-1">
                <label className="text-slate-400 block font-medium">
                  {language === 'bn' ? 'পণ্যের নাম' : 'Product Name'} *
                </label>
                <input
                  type="text"
                  required
                  value={productForm.name}
                  onChange={(e) => setProductForm({ ...productForm, name: e.target.value })}
                  placeholder="e.g. Miniket Rice 50kg"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <label className="text-slate-400 block font-medium">
                    {language === 'bn' ? 'ব্র্যান্ড / কোম্পানি' : 'Brand'}
                  </label>
                  <input
                    type="text"
                    value={productForm.brand}
                    onChange={(e) => setProductForm({ ...productForm, brand: e.target.value })}
                    placeholder="e.g. ACI / Fresh"
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-slate-400 block font-medium">
                    {language === 'bn' ? 'একক (Unit)' : 'Unit'}
                  </label>
                  <input
                    type="text"
                    value={productForm.unit}
                    onChange={(e) => setProductForm({ ...productForm, unit: e.target.value })}
                    placeholder="e.g. bag / kg / carton"
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <div className="space-y-1">
                  <label className="text-slate-400 block font-medium">
                    {language === 'bn' ? 'কেনা দর (ক্রয়)' : 'Cost Price (Buy)'} *
                  </label>
                  <input
                    type="number"
                    required
                    min="0"
                    step="any"
                    value={productForm.costPrice || ''}
                    onChange={(e) => setProductForm({ ...productForm, costPrice: Number(e.target.value) })}
                    placeholder="0.00"
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-emerald-500 font-mono"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-emerald-400 block font-medium">
                    {language === 'bn' ? 'পাইকারি বিক্রয় দর' : 'Wholesale Price'} *
                  </label>
                  <input
                    type="number"
                    required
                    min="0"
                    step="any"
                    value={productForm.wholesalePrice || ''}
                    onChange={(e) => setProductForm({ ...productForm, wholesalePrice: Number(e.target.value) })}
                    placeholder="0.00"
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-emerald-300 focus:outline-none focus:border-emerald-500 font-mono font-bold"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-amber-400 block font-medium">
                    {language === 'bn' ? 'খুচরা বিক্রয় দর' : 'Retail Price'}
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    value={productForm.retailPrice || ''}
                    onChange={(e) => setProductForm({ ...productForm, retailPrice: Number(e.target.value) })}
                    placeholder={language === 'bn' ? 'ঐচ্ছিক (ডিফল্ট +15%)' : 'Optional'}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-amber-300 focus:outline-none focus:border-amber-500 font-mono font-bold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <label className="text-slate-400 block font-medium">
                    {language === 'bn' ? 'বর্তমান স্টক পরিমাণ' : 'Stock Quantity'}
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={productForm.stockQuantity || ''}
                    onChange={(e) => setProductForm({ ...productForm, stockQuantity: Number(e.target.value) })}
                    placeholder="0"
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-slate-400 block font-medium">
                    {language === 'bn' ? 'ক্যাটাগরি' : 'Category'}
                  </label>
                  <input
                    type="text"
                    value={productForm.category}
                    onChange={(e) => setProductForm({ ...productForm, category: e.target.value })}
                    placeholder="e.g. Rice, Oil, Sugar"
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => {
                    setEditingProduct(null);
                    setIsAddProductOpen(false);
                  }}
                  className="flex-1 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-bold transition"
                >
                  {t.cancel}
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold transition shadow"
                >
                  {t.save}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: DELETE PRODUCT CONFIRMATION */}
      {deletingProduct && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-rose-500/50 rounded-2xl w-full max-w-md p-5 space-y-4 shadow-2xl text-white">
            <div className="flex items-center gap-3 text-rose-400">
              <div className="w-10 h-10 rounded-xl bg-rose-500/20 flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-rose-400" />
              </div>
              <div>
                <h3 className="font-bold text-sm text-white">
                  {language === 'bn' ? 'প্রোডাক্ট ডিলিট করবেন?' : 'Delete Product?'}
                </h3>
                <p className="text-xs text-slate-400">
                  {deletingProduct.name} ({deletingProduct.sku})
                </p>
              </div>
            </div>

            <p className="text-xs text-slate-300">
              {language === 'bn'
                ? 'আপনি কি নিশ্চিত এই প্রোডাক্টটি তালিকা থেকে মুছে ফেলতে চান?'
                : 'Are you sure you want to remove this product from inventory catalog?'}
            </p>

            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => setDeletingProduct(null)}
                className="flex-1 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold transition"
              >
                {t.cancel}
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteProduct}
                className="flex-1 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 shadow"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>{language === 'bn' ? 'হ্যাঁ, মুছুন' : 'Yes, Delete'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: EDIT OR CREATE RETAILER / CUSTOMER */}
      {(editingRetailer || isCreatingNewRetailer) && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-5 space-y-4 shadow-2xl text-white">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="font-bold text-sm flex items-center gap-2">
                <Store className="w-4 h-4 text-emerald-400" />
                <span>
                  {isCreatingNewRetailer
                    ? language === 'bn'
                      ? 'নতুন গ্রাহক ও ফোন নম্বর যুক্ত করুন'
                      : 'Add New Customer & Phone'
                    : language === 'bn'
                    ? 'রিটেইলারের ফোন ও তথ্য পরিবর্তন'
                    : 'Edit Customer Phone & Details'}
                </span>
              </h3>
              <button
                onClick={() => {
                  setEditingRetailer(null);
                  setIsCreatingNewRetailer(false);
                }}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveRetailer} className="space-y-3 text-xs">
              <PhoneInputWithContactPicker
                label={language === 'bn' ? 'মোবাইল / ফোন নম্বর' : 'Phone Number'}
                required
                value={retailerPhoneForm.phone}
                onChange={(newPhone) => setRetailerPhoneForm({ ...retailerPhoneForm, phone: newPhone })}
                onSelectContactInfo={(info) => {
                  setRetailerPhoneForm((prev) => ({
                    ...prev,
                    phone: info.phone,
                    shopName: prev.shopName || info.organization || `${info.name} Store`,
                    ownerName: prev.ownerName || info.name,
                  }));
                }}
                placeholder="017XXXXXXXX"
              />

              <div className="space-y-1">
                <label className="text-slate-400 block font-medium">
                  {language === 'bn' ? 'দোকানের নাম' : 'Shop Name'} *
                </label>
                <input
                  type="text"
                  required
                  value={retailerPhoneForm.shopName}
                  onChange={(e) => setRetailerPhoneForm({ ...retailerPhoneForm, shopName: e.target.value })}
                  placeholder="e.g. Al-Madina Store"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-slate-400 block font-medium">
                  {language === 'bn' ? 'মালিক বা গ্রাহকের নাম' : 'Owner / Customer Name'} *
                </label>
                <input
                  type="text"
                  required
                  value={retailerPhoneForm.ownerName}
                  onChange={(e) => setRetailerPhoneForm({ ...retailerPhoneForm, ownerName: e.target.value })}
                  placeholder={language === 'bn' ? 'যেমন: জনাব আলমগীর / কাস্টমার' : 'e.g. Shop Owner / Customer Name'}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-slate-400 block font-medium">
                  {language === 'bn' ? 'রুট / এলাকা' : 'Route / Area'}
                </label>
                <input
                  type="text"
                  value={retailerPhoneForm.route}
                  onChange={(e) => setRetailerPhoneForm({ ...retailerPhoneForm, route: e.target.value })}
                  placeholder="e.g. Bazar Road / North Sector"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="flex items-center gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => {
                    setEditingRetailer(null);
                    setIsCreatingNewRetailer(false);
                  }}
                  className="flex-1 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-bold transition"
                >
                  {t.cancel}
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold transition shadow"
                >
                  {isCreatingNewRetailer
                    ? language === 'bn'
                      ? 'সংরক্ষণ ও মেমোতে নির্বাচন'
                      : 'Save & Select'
                    : t.save}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Photo Product Multi-Entry Inbox Modal (For Sales) */}
      <PhotoProductEntryModal
        isOpen={isPhotoInboxOpen}
        onClose={() => setIsPhotoInboxOpen(false)}
        mode="SALE"
        onAddSalesToCart={handleAddPhotoEntriesToCart}
      />

      {/* Stock Product Photo Manager Modal */}
      <StockPhotoManagerModal
        isOpen={isStockPhotoManagerOpen}
        onClose={() => {
          setIsStockPhotoManagerOpen(false);
          setStockPhotoTargetProductId(null);
        }}
        targetProductId={stockPhotoTargetProductId}
      />

      {/* Device Contact Picker Modal (Online & Offline Mobile Phonebook) */}
      <DeviceContactPickerModal
        isOpen={isDeviceContactModalOpen}
        onClose={() => setIsDeviceContactModalOpen(false)}
        onSelectContact={handleSelectContactFromModal}
        language={language}
      />

      {/* Admin Sales Price Manager Modal (Wholesale & Retail Bulk/Single Editor) */}
      <AdminSalesPriceModal
        isOpen={isAdminPriceModalOpen}
        onClose={() => {
          setIsAdminPriceModalOpen(false);
          setAdminPriceTargetProductId(null);
        }}
        products={products}
        onUpdatePrices={handleBatchUpdatePrices}
        targetProductId={adminPriceTargetProductId}
        language={language}
      />

      {/* PDF Statement Preview & Download Modal */}
      <PdfPreviewModal
        pdfResult={pdfPreviewResult}
        onClose={() => setPdfPreviewResult(null)}
      />

      {/* Edit Purchase Challan & Reconcile Stock Modal */}
      <EditPurchaseChallanModal
        isOpen={!!editingChallan}
        onClose={() => setEditingChallan(null)}
        challan={editingChallan}
        onSuccess={(msg) => setActionSuccessMsg(msg)}
      />

      {/* Delete Purchase Challan & Deduct Stock Modal */}
      <DeletePurchaseChallanModal
        isOpen={!!deletingChallan}
        onClose={() => setDeletingChallan(null)}
        challan={deletingChallan}
        onDeleted={(msg) => setActionSuccessMsg(msg)}
      />

      {/* Edit Sales Invoice Modal (Sales +, Market Replacement -, Stock & Due Reconciliation) */}
      <EditSalesInvoiceModal
        isOpen={isEditOrderModalOpen}
        onClose={() => {
          setIsEditOrderModalOpen(false);
          setEditingOrderForRevision(null);
        }}
        order={editingOrderForRevision}
        onSuccess={(msg) => setActionSuccessMsg(msg)}
      />

      {/* Unlisted / Non-Stock / Market Return Product Quick Entry Modal */}
      {isAddUnlistedModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-emerald-500/40 rounded-2xl w-full max-w-lg p-5 space-y-4 shadow-2xl text-white">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-emerald-950 border border-emerald-500/50 flex items-center justify-center text-emerald-400">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-sm sm:text-base text-white">
                    {language === 'bn' ? 'আনলিস্টেড / মার্কেট ফেরত পণ্য যোগ' : 'Add Unlisted / Return Item'}
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    {language === 'bn'
                      ? 'স্টকে নাম না থাকা পণ্য শূন্য টাকা (০) বা শূন্য কোয়ান্টিটি (০)-তেও মেমোতে জমা নিবে'
                      : 'Enter items with 0 price or 0 quantity directly into invoice'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsAddUnlistedModalOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddUnlistedItemToCart} className="space-y-3.5">
              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1">
                  {language === 'bn' ? 'পণ্যের নাম / বিবরণ (আবশ্যক):' : 'Product Name / Description:'}
                </label>
                <input
                  type="text"
                  required
                  autoFocus
                  value={unlistedForm.name}
                  onChange={(e) => setUnlistedForm({ ...unlistedForm, name: e.target.value })}
                  placeholder={language === 'bn' ? 'যেমন: মার্কেট ফেরত ব্যাটারি / আনলিস্টেড চার্জার / নষ্ট ডিসপ্লে' : 'e.g. Unlisted Charger / Return Battery'}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500 font-semibold"
                />
              </div>

              {/* Item Type: Sale (+) vs Market Replacement (-) */}
              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1">
                  {language === 'bn' ? 'চালানে ধরন:' : 'Item Type:'}
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setUnlistedForm({ ...unlistedForm, itemType: 'REPLACEMENT' })}
                    className={`p-2.5 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 transition cursor-pointer ${
                      unlistedForm.itemType === 'REPLACEMENT'
                        ? 'bg-rose-950/80 border-rose-500 text-rose-300 shadow-md ring-1 ring-rose-500'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                    }`}
                  >
                    <RotateCcw className="w-4 h-4 text-rose-400" />
                    <span>{language === 'bn' ? '🔄 মার্কেট রিপ্লেস ফেরত (-)' : 'Market Replacement (-)'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setUnlistedForm({ ...unlistedForm, itemType: 'SALE' })}
                    className={`p-2.5 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 transition cursor-pointer ${
                      unlistedForm.itemType === 'SALE'
                        ? 'bg-emerald-950/80 border-emerald-500 text-emerald-300 shadow-md ring-1 ring-emerald-500'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                    }`}
                  >
                    <Plus className="w-4 h-4 text-emerald-400" />
                    <span>{language === 'bn' ? '➕ বিক্রয় পণ্য (+)' : 'Sale Item (+)'}</span>
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-300 block mb-1">
                    {language === 'bn' ? 'পরিমাণ (শূন্য ০ গ্রহণযোগ্য):' : 'Quantity (0 accepted):'}
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    value={unlistedForm.quantity}
                    onChange={(e) => setUnlistedForm({ ...unlistedForm, quantity: e.target.value === '' ? 0 : Math.max(0, Number(e.target.value)) })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs font-mono font-bold text-white focus:outline-none focus:border-emerald-500"
                  />
                  <span className="text-[10px] text-slate-500 mt-0.5 block font-medium">
                    ০ দিলে ০ পিস হিসেবে যোগ হবে
                  </span>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-300 block mb-1">
                    {language === 'bn' ? 'দর / মূল্য (৳০ গ্রহণযোগ্য):' : 'Price (৳0 accepted):'}
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    value={unlistedForm.price}
                    onChange={(e) => setUnlistedForm({ ...unlistedForm, price: e.target.value === '' ? 0 : Math.max(0, Number(e.target.value)) })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs font-mono font-bold text-emerald-300 focus:outline-none focus:border-emerald-500"
                  />
                  <span className="text-[10px] text-slate-500 mt-0.5 block font-medium">
                    ০ দিলে ০ টাকা হিসেবে জমা নিবে
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-300 block mb-1">
                    {language === 'bn' ? 'একক (Unit):' : 'Unit:'}
                  </label>
                  <select
                    value={unlistedForm.unit}
                    onChange={(e) => setUnlistedForm({ ...unlistedForm, unit: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500 font-semibold"
                  >
                    <option value="pcs">pcs / পিস</option>
                    <option value="box">box / বক্স</option>
                    <option value="cartoon">cartoon / কার্টুন</option>
                    <option value="set">set / সেট</option>
                    <option value="pkt">pkt / প্যাকেট</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-300 block mb-1">
                    {language === 'bn' ? 'ব্র্যান্ড / কোম্পানি (ঐচ্ছিক):' : 'Brand / Company:'}
                  </label>
                  <input
                    type="text"
                    value={unlistedForm.brand}
                    onChange={(e) => setUnlistedForm({ ...unlistedForm, brand: e.target.value })}
                    placeholder="General / ব্র্যান্ড"
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              {unlistedForm.itemType === 'REPLACEMENT' && (
                <div>
                  <label className="text-xs font-bold text-rose-300 block mb-1">
                    {language === 'bn' ? 'ফেরত বা রিপ্লেসের কারণ:' : 'Replacement Reason:'}
                  </label>
                  <select
                    value={unlistedForm.reason}
                    onChange={(e) => setUnlistedForm({ ...unlistedForm, reason: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-rose-200 focus:outline-none focus:border-rose-500"
                  >
                    <option value="মার্কেট থেকে রিপ্লেস ফেরত">মার্কেট থেকে রিপ্লেস ফেরত (সাধারণ ফেরত)</option>
                    <option value="মেয়াদোত্তীর্ণ পণ্য (Expired)">মেয়াদোত্তীর্ণ পণ্য (Expired)</option>
                    <option value="ড্যামেজ বা নষ্ট পণ্য">ড্যামেজ বা নষ্ট পণ্য</option>
                    <option value="ভেঙে যাওয়া বা লিকেজ">ভেঙে যাওয়া বা লিকেজ</option>
                    <option value="ক্যাটালগে নাম নেই (আনলিস্টেড)">ক্যাটালগে নাম নেই (আনলিস্টেড ফেরত)</option>
                  </select>
                </div>
              )}

              <div className="pt-2 flex items-center justify-between border-t border-slate-800 gap-2 flex-wrap">
                <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-400 select-none">
                  <input
                    type="checkbox"
                    checked={unlistedForm.saveToCatalog}
                    onChange={(e) => setUnlistedForm({ ...unlistedForm, saveToCatalog: e.target.checked })}
                    className="w-4 h-4 rounded text-emerald-500 focus:ring-emerald-400 bg-slate-950 border-slate-700"
                  />
                  <span>ভবিষ্যতের জন্য প্রোডাক্ট ক্যাটালগেও সেভ রাখুন</span>
                </label>

                <div className="flex items-center gap-2 ml-auto">
                  <button
                    type="button"
                    onClick={() => setIsAddUnlistedModalOpen(false)}
                    className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold cursor-pointer"
                  >
                    {language === 'bn' ? 'বাতিল' : 'Cancel'}
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-lg shadow-emerald-950 cursor-pointer active:scale-95"
                  >
                    <Plus className="w-4 h-4" />
                    <span>{language === 'bn' ? 'মেমোতে যোগ করুন' : 'Add to Invoice'}</span>
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Product Challan / Invoice Breakdown Modal */}
      <ProductChallanBreakdownModal
        isOpen={isProductChallanBreakdownOpen}
        onClose={() => {
          setIsProductChallanBreakdownOpen(false);
          setSelectedProductForChallans(null);
        }}
        product={selectedProductForChallans}
        supplierLedger={supplierLedger}
        language={language}
      />
    </div>
  );
};
