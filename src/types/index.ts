export type UserRole = 'admin' | 'counter' | 'dsr' | 'retailer';

export type Language = 'en' | 'bn';

export interface UserProfile {
  id: string;
  name: string;
  bnName: string;
  role: UserRole;
  phone: string;
  email?: string;
  avatar?: string;
  pin?: string; // 4-digit security PIN for staff login across devices
  assignedCounterNo?: string; // For cash counter staff (e.g. Counter-1)
  isActive?: boolean;
  createdAt?: string;
  notes?: string;
  shopName?: string; // For retailer or enterprise name for admin
  enterpriseName?: string; // For admin / wholesaler business
  address?: string; // Main store/office address
  godownAddress?: string; // Godown / warehouse address
  alternatePhone?: string; // Secondary mobile / telephone
  retailerId?: string;
  routeArea?: string; // For DSR
  assignedCashDrawer?: number; // Live cash held in hand/drawer
  adminRef?: string; // Admin's Phone or Referral Code for Counter, DSR, and Retailer linking
  adminPhone?: string; // Explicit phone number of the linked Admin/Wholesaler
  adminName?: string; // Cached full name of the linked Admin/Wholesaler
  adminEnterprise?: string; // Cached business name of the linked Admin
  lastActiveAt?: string; // Timestamp of latest device heartbeat / activity
  isOnline?: boolean; // Online status
  deviceInfo?: string; // e.g. "Mobile", "Laptop / PC", "Web PWA"
}

export interface DevicePresence {
  userId: string;
  role: UserRole;
  phone: string;
  name: string;
  bnName?: string;
  lastActiveAt: string;
  deviceType?: 'mobile' | 'laptop' | 'desktop';
  isOnline: boolean;
}

export interface Product {
  id: string;
  sku: string;
  name: string;
  bnName?: string;
  brand?: string;
  category: string;
  bnCategory?: string;
  stockQuantity: number;
  currentStock?: number; // Alias for stockQuantity
  unit: string; // Pcs, Ctn, Box, Kg, Liter, Bag
  bnUnit?: string;
  costPrice: number; // Wholesale buy price
  wholesalePrice: number; // Selling price to retailers
  retailPrice?: number; // Selling price for retail customers
  mrp?: number; // Maximum retail price
  supplierId?: string;
  supplierName?: string;
  minOrderQty?: number;
  lowStockThreshold?: number; // Pre-set low stock threshold
  minStockLevel?: number; // Alias for lowStockThreshold
  image?: string;
  latestChallanNo?: string; // Latest challan reference number
  challanReferences?: Array<{
    challanNo: string;
    date?: string;
    quantity: number;
    costPrice?: number;
    supplierName?: string;
    supplierId?: string;
  }>;
  adminId?: string; // Id of the wholesale business owner/admin
  adminPhone?: string; // Phone/Ref of the admin
  adminRef?: string;
}

export interface Retailer {
  id: string;
  name: string;
  bnName?: string;
  shopName: string;
  bnShopName?: string;
  ownerName?: string;
  phone: string;
  altPhone?: string;
  address: string;
  area?: string;
  route?: string; // Beat / Territory
  routeArea?: string; // Route area alias
  creditLimit: number;
  outstandingDue: number; // Receivable
  currentDue?: number; // Alias for outstandingDue
  balance?: number; // Balance alias
  totalPurchases: number;
  lastOrderDate?: string;
  createdAt?: string;
  contactSource?: 'phonebook' | 'manual' | 'app';
  notes?: string;
}

export interface PhoneContact {
  id: string;
  name: string;
  phone: string;
  email?: string;
  organization?: string;
  address?: string;
}

export interface Supplier {
  id: string;
  name: string;
  bnName?: string;
  company: string;
  companyName?: string; // Alias for company
  bnCompany?: string;
  phone: string;
  email?: string;
  address: string;
  totalPurchases?: number;
  totalPaid?: number;
  outstandingPayable?: number; // Payable balance
  balance?: number; // Balance alias
  openingBalance?: number; // কোম্পানির ওপেন ডিও / হিসাব শুরুর প্রারম্ভিক বকেয়া
  openingDate?: string; // হিসাব শুরুর তারিখ (YYYY-MM-DD)
  openingNotes?: string; // হিসাব শুরুর বিবরণ বা পূর্বের ডিও নোট
  bankDetails?: string;
  paymentTerms?: string;
}

export type SupplierLedgerType = 'PURCHASE' | 'PAYMENT' | 'RETURN_ADJUSTMENT' | 'DISCOUNT_CREDIT';

export interface SupplierPurchaseItem {
  productId?: string;
  name: string;
  sku?: string;
  category?: string;
  quantity: number;
  unit?: string;
  costPrice: number;
  suggestedRetailPrice?: number;
  totalPrice: number;
}

export interface SupplierLedgerEntry {
  id: string;
  supplierId: string;
  supplierName: string;
  type: SupplierLedgerType;
  date: string;
  amount: number;
  referenceNo: string;
  previousDoNo?: string;
  previousDoDate?: string;
  paymentMethod?: 'Cash' | 'Bank Transfer' | 'bKash / Nagad' | 'Cheque' | string;
  balanceAfter: number;
  notes?: string;
  attachments?: string[];
  items?: SupplierPurchaseItem[];
  scannedByRole?: UserRole | string;
  scannedByName?: string;
  scannedByPhone?: string;
  scannedByUserId?: string;
  scannedAt?: string;
  createdAt?: string;
}

export type CashTransferStatus = 'PENDING' | 'ACCEPTED' | 'REJECTED';

export interface CashTransfer {
  id: string;
  transferNo: string;
  fromRole: UserRole;
  fromUserId: string;
  fromUserName: string;
  toRole: UserRole;
  toUserId: string;
  toUserName: string;
  amount: number;
  status: CashTransferStatus;
  createdAt: string;
  acceptedAt?: string;
  rejectedAt?: string;
  notes?: string;
  adminId?: string;
  adminPhone?: string;
  denominations?: {
    note1000?: number;
    note500?: number;
    note200?: number;
    note100?: number;
    note50?: number;
    note20?: number;
    note10?: number;
  };
  receiptImage?: string;
}

export type CapitalTransactionType = 
  | 'INITIAL_CAPITAL'
  | 'CAPITAL_INJECTION'
  | 'INJECTION'
  | 'OWNER_WITHDRAWAL'
  | 'PURCHASE_PAYOUT'
  | 'SALES_COLLECTION'
  | 'DAMAGE_LOSS_ADJUSTMENT'
  | 'EXPENSE';

export interface CapitalTransaction {
  id: string;
  type: CapitalTransactionType;
  amount: number;
  date: string;
  description: string;
  bnDescription: string;
  account: 'CASH_DRAWER' | 'BANK' | 'DSR_FLOAT' | 'INVENTORY';
  runningCapital: number;
}

export type ExpenseCategory =
  | 'SALARY' // বেতন
  | 'DAILY_SNACKS' // ডেইলি নাস্তা / চা-নাস্তা
  | 'SHOP_RENT' // দোকান ভাড়া
  | 'ELECTRICITY_BILL' // বিদ্যুৎ বিল
  | 'TRANSPORT' // যাতায়াত / পরিবহন
  | 'ENTERTAINMENT' // আপ্যায়ন
  | 'MAINTENANCE' // দোকান মেরামত / রক্ষণাবেক্ষণ
  | 'OTHER'; // অন্যান্য খরচ

export type ExpenseFrequency = 'DAILY' | 'MONTHLY' | 'OCCASIONAL';

export interface Expense {
  id: string;
  category: ExpenseCategory;
  categoryBn: string;
  title: string;
  titleBn: string;
  amount: number;
  date: string; // YYYY-MM-DD
  frequency: ExpenseFrequency;
  paymentSource: 'CASH_DRAWER' | 'BANK' | 'OWNER_PERSONAL';
  notes?: string;
  recipientName?: string; // কর্মচারী বা বাড়িওয়ালার নাম (যেমন: স্টাফের নাম)
  createdByRole?: string;
  createdByName?: string;
  createdAt?: string;
}

export type ReplacementEntity = 'RETAILER' | 'SUPPLIER';
export type ReplacementParty = ReplacementEntity;

export type ReplacementReason = 
  | 'EXPIRED'
  | 'DAMAGED_PACKAGING'
  | 'MANUFACTURING_DEFECT'
  | 'LEAKAGE_BROKEN'
  | 'WRONG_ITEM_SUPPLIED';

export type ReplacementStatus = 
  | 'PENDING'
  | 'APPROVED'
  | 'REPLACED_DISPATCHED'
  | 'REPLACED_WITH_GOODS'
  | 'CREDITED_TO_LEDGER'
  | 'SENT_TO_COMPANY'
  | 'REJECTED'
  | 'REPLACED'
  | 'ADJUSTED';

export interface ReplacementAdjustment {
  id: string;
  claimNo?: string;
  trackingNo?: string;
  partyType?: ReplacementParty;
  entityType?: ReplacementEntity; // Retailer returning to wholesale OR Wholesale returning to Supplier
  partyId?: string;
  entityId?: string;
  partyName?: string;
  entityName?: string;
  marketRetailerName?: string;
  supplierId?: string;
  supplierName?: string;
  companyChallanNo?: string;
  companyDispatchDate?: string;
  dispatchedToCompany?: boolean;
  productId: string;
  productName: string;
  bnProductName?: string;
  quantity: number;
  unit: string;
  unitCost?: number;
  estimatedValue?: number;
  totalAdjustmentValue?: number;
  reason: ReplacementReason | string;
  status: ReplacementStatus;
  resolutionType?: 'PRODUCT_REPLACEMENT' | 'BALANCE_DEDUCTION';
  date: string;
  claimDate?: string;
  claimNumber?: string;
  retailerId?: string;
  retailerName?: string;
  retailerPhone?: string;
  claimReasonBangla?: string;
  adjustmentAmount?: number;
  operatorRole?: string;
  operatorName?: string;
  createdAt?: string;
  resolvedAt?: string;
  notes?: string;
  photoUrl?: string;
  handledByRole?: UserRole;
  handledByName?: string;
}

export type ReplacementClaim = ReplacementAdjustment;

export interface CompanyReturnChallan {
  id: string;
  challanNo: string;
  supplierId: string;
  supplierName: string;
  supplierCompany?: string;
  dispatchDate: string;
  items: Array<{
    claimId?: string;
    productId: string;
    productName: string;
    quantity: number;
    unit: string;
    value: number;
    reason?: string;
    marketRetailerName?: string;
  }>;
  totalItemsCount: number;
  totalQuantity: number;
  totalValue: number;
  notes?: string;
  adjustSupplierLedger?: boolean;
  deductStock?: boolean;
  photoUrl?: string;
  sourceType?: 'SCAN' | 'PHOTO' | 'MEMO_KHATA' | 'DIRECT' | 'MARKET_CLAIMS';
  status?: 'DISPATCHED' | 'SETTLED' | 'PARTIAL';
  settledAmount?: number;
  creditNoteNo?: string;
  settledDate?: string;
  createdAt: string;
  dispatchedByName?: string;
  dispatchedByRole?: string;
}

export interface OrderItem {
  productId: string;
  productName: string;
  name?: string; // Alias for productName
  bnProductName?: string;
  sku?: string;
  quantity: number; // positive for sold items, or can be negative for returns/replacements
  freeQuantity?: number; // ফ্রি / বোনাস পিস (ফ্রি স্কিম হিসাব)
  unit: string;
  unitPrice: number;
  costPrice?: number;
  retailPrice?: number;
  total?: number;
  totalPrice?: number; // Alias for total
  image?: string; // Product photo thumbnail
  challanRefNo?: string; // Reference challan / invoice number of the stock batch
  itemType?: 'SALE' | 'REPLACEMENT'; // SALE (+) vs REPLACEMENT (-)
  isReplacement?: boolean; // true if this item is a market replacement return (মাইনাস কাউন্ট)
  replacementReason?: string; // e.g. ড্যামেজ, মেয়াদোত্তীর্ণ, প্যাকেট নষ্ট, মার্কেট রিপ্লেস
}

export interface OrderInvoice {
  id: string;
  invoiceNo: string;
  invoiceNumber?: string; // Alias for invoiceNo
  saleMode?: 'WHOLESALE' | 'RETAIL'; // পাইকারি নাকি খুচরা সেল
  customerName?: string; // কাস্টমারের নাম / প্রোপ্রাইটার
  shopName?: string; // প্রতিষ্ঠানের নাম / দোকান
  retailerId: string;
  retailerName: string;
  bnRetailerName?: string;
  retailerPhone?: string;
  customerPhone?: string; // Alias for retailerPhone
  retailerAddress?: string;
  adminId?: string;
  adminPhone?: string;
  creatorId?: string;
  creatorRole?: 'counter' | 'dsr' | 'retailer' | 'admin' | string;
  creatorName?: string;
  creatorPhone?: string;
  salesPersonId?: string;
  salesPersonRole?: 'counter' | 'dsr' | 'retailer' | 'admin' | string; // Alias for creatorRole
  salesPersonName?: string; // Alias for creatorName
  date: string;
  items: OrderItem[];
  subtotal: number;
  discount?: number;
  discountAmount?: number;
  totalAmount: number;
  totalSalesAmount?: number; // মোট বিক্রয় (প্লাস আইটেমদের যোগফল)
  totalReplacementAmount?: number; // মোট মার্কেট রিপ্লেস (মাইনাস আইটেমদের যোগফল)
  hasReplacements?: boolean; // মেমোতে মার্কেট রিপ্লেস সমন্বিত আছে কিনা
  totalSoldPieces?: number; // কত পিস বিক্রয়
  totalReturnedPieces?: number; // কত পিস ফেরত
  netPieces?: number; // সর্বমোট নিট পিস (বিক্রয় - ফেরত)
  totalCostAmount?: number; // মোট পণ্যের কেনা মূল্য / ক্রয় খরচ (COGS)
  totalProfitAmount?: number; // মোট অর্জিত লভ্যাংশ / মুনাফা (Sales - Cost)
  paidAmount: number;
  dueAmount: number;
  paymentMethod?: 'Cash' | 'bKash / Nagad' | 'Bank' | 'Credit' | string;
  paymentType?: 'CASH' | 'CREDIT' | 'PARTIAL' | string;
  paymentStatus?: 'PAID' | 'PARTIAL' | 'UNPAID' | 'DUE' | string;
  status?: 'PAID' | 'PARTIAL' | 'DUE' | string;
  deliveryStatus?: 'ORDERED' | 'DISPATCHED' | 'DELIVERED' | string;
  notes?: string;
  memoReceivedAmount?: number;
  priceDifference?: number;
  createdAt?: string;
}

export type BalanceAccountType = 'BANK' | 'ADMIN_CASH' | 'COUNTER_CASH' | 'DSR_CASH';

export interface BankAccount {
  id: string;
  name: string;
  bankName?: string; // Alias for name
  bnName: string;
  type: 'BANK' | 'MFS'; // Commercial Bank or Mobile Financial Service (bKash/Nagad/Rocket)
  accountNumber: string;
  branch?: string;
  balance: number;
}

export type ActivityActionType =
  | 'CASH_TRANSFER'
  | 'INVOICE_CREATE'
  | 'ORDER_CREATE'
  | 'BALANCE_UPDATE'
  | 'BALANCE_ADJUSTMENT'
  | 'STOCK_UPDATE'
  | 'STOCK_INWARD'
  | 'STOCK_OUTWARD'
  | 'SUPPLIER_PAYMENT'
  | 'REPLACEMENT_RESOLVED'
  | 'CAPITAL_TRANSACTION'
  | 'STAFF_ACTION'
  | 'CLOUD_BACKUP'
  | 'OFFLINE_SYNC'
  | 'EXPENSE_RECORDED'
  | 'SYSTEM_RESET';

export interface ActivityLog {
  id: string;
  actionType: ActivityActionType;
  action?: ActivityActionType;
  title: string;
  bnTitle: string;
  description: string;
  details?: string;
  bnDescription: string;
  actorRole: UserRole;
  role?: UserRole; // Alias for actorRole
  actorId: string;
  actorName: string;
  actorPhone?: string;
  performedBy?: string;
  timestamp: string; // ISO String (e.g. 2026-08-30T10:15:00Z)
  amount?: number;
  relatedId?: string; // invoiceNo, transferNo, supplierId, etc.
  status?: 'COMPLETED' | 'PENDING' | 'REJECTED' | 'ADJUSTED';
  metadata?: Record<string, any>;
}

export interface OfflineSyncQueueItem {
  id: string;
  collection: string;
  docId: string;
  action: 'set' | 'update' | 'delete';
  payload: any;
  timestamp: string;
  description?: string;
  bnDescription?: string;
}

export interface BackupCounts {
  products: number;
  orders: number;
  retailers: number;
  suppliers: number;
  transfers: number;
  supplierLedger: number;
  capitalTransactions: number;
  replacements: number;
  companyReturns?: number;
  expenses?: number;
  users: number;
}

export interface BackupFinancials {
  totalReceivables: number;
  totalPayables: number;
  totalStockValue: number;
  adminCash: number;
  counterCash: number;
  dsrcash: number;
  bankCash: number;
}

export interface CloudBackupSnapshot {
  id: string;
  timestamp: string;
  version: string;
  createdBy: string;
  createdByName?: string;
  counts: BackupCounts;
  financials: BackupFinancials;
  data: {
    products: Product[];
    orders: OrderInvoice[];
    retailers: Retailer[];
    suppliers: Supplier[];
    supplierLedger: SupplierLedgerEntry[];
    cashTransfers: CashTransfer[];
    capitalTransactions: CapitalTransaction[];
    replacements: ReplacementAdjustment[];
    companyReturns?: any[];
    expenses?: any[];
    users: UserProfile[];
    activityLogs?: ActivityLog[];
  };
}

export interface BackupMeta {
  id: string;
  timestamp: string;
  version: string;
  createdBy: string;
  createdByName?: string;
  totalRecords: number;
  financialSummary: string;
  source: 'auto-cloud' | 'manual-snapshot' | 'offline-recovery' | 'server-file';
}

export interface BusinessProfile {
  enterpriseName: string; // প্রতিষ্ঠানের নাম (যেমন: মাতৃছায়া টেলিকম)
  proprietorName: string; // স্বত্বাধিকারী / পরিচালকের নাম (যেমন: মো: রফিকুল ইসলাম)
  address: string; // প্রধান দোকান / শোরুম / অফিসের ঠিকানা
  godownAddress: string; // গুদামঘর / গোডাউন / ডিপোর ঠিকানা
  warehouseAddress?: string; // Alias for godownAddress
  phone: string; // প্রধান মোবাইল নম্বর
  contactNumber?: string; // Alias for phone
  alternatePhone?: string; // বিকল্প / দ্বিতীয় মোবাইল নম্বর বা হটলাইন
  email?: string; // অফিসিয়াল ইমেইল
  tagline?: string; // সাব-টাইটেল / ব্যবসায়িক বিবরণ
  padType: 'standard_pad' | 'custom_letterhead'; // স্ট্যান্ডার্ড প্যাড নাকি ছাপা প্যাডের জন্য ফাঁকা জায়গা
  padTopSpacing: number; // ছাপা প্যাডের জন্য উপরে ফাঁকা জায়গা (পিক্সেল)
}

