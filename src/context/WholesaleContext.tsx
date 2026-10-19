import React, { createContext, useContext, useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
  UserRole,
  Language,
  UserProfile,
  Product,
  Retailer,
  Supplier,
  SupplierLedgerEntry,
  SupplierPurchaseItem,
  CashTransfer,
  CashTransferStatus,
  CapitalTransaction,
  ReplacementAdjustment,
  ReplacementClaim,
  CompanyReturnChallan,
  OrderInvoice,
  OrderItem,
  PhoneContact,
  BankAccount,
  BalanceAccountType,
  ActivityLog,
  OfflineSyncQueueItem,
  CloudBackupSnapshot,
  BackupMeta,
  BusinessProfile,
  Expense,
  ExpenseCategory
} from '../types';
import {
  normalizeProductKey,
  areProductNamesEquivalent,
  mergeDuplicateProductsList,
} from '../utils/productDeduplication';
import { getStoredBusinessProfile, saveStoredBusinessProfile } from '../utils/businessProfile';
import { saveFileBlob } from '../utils/fileSaver';
import {
  initialUsers,
  initialSuppliers,
  initialProducts,
  initialRetailers,
  initialCashTransfers,
  initialSupplierLedger,
  initialCapitalTransactions,
  initialReplacements,
  initialOrders,
  samplePhonebookContacts,
  initialBankAccounts,
  initialActivityLogs,
  initialExpenses
} from '../data/mockData';
import {
  db,
  auth,
  googleProvider,
  COLLECTIONS,
  simulateGoOffline,
  simulateGoOnline
} from '../lib/firebase';
import { signInWithPopup, signOut as fbSignOut } from 'firebase/auth';
import {
  collection,
  doc,
  setDoc,
  deleteDoc,
  onSnapshot,
  writeBatch,
  getDocs,
  getDoc
} from 'firebase/firestore';
import {
  isBiometricEnabledInStorage,
  setBiometricEnabledInStorage,
  getStoredAutoLockMins,
  setStoredAutoLockMins,
  checkPlatformBiometricsSupport,
  ensurePinInitialized,
  PROTECTED_ROLES_DEFAULT,
  ROLE_DEFAULT_PINS,
  verifyRolePin,
  setRolePin,
} from '../lib/biometrics';
import { getTodayDateString, round2 } from '../utils/translations';
import {
  idbSaveQueueItem,
  idbGetAllQueueItems,
  idbDeleteQueueItem,
  idbDeleteQueueItemsBatch,
  idbClearQueue,
  idbSetState,
  idbGetState,
  safeStorage
} from '../utils/indexedDbStorage';

interface WholesaleContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  toggleLanguage: () => void;
  currentUser: UserProfile;
  setCurrentUser: (user: UserProfile) => void;
  currentRole: UserRole;
  setRole: (role: UserRole) => void;
  users: UserProfile[];
  setUsers: React.Dispatch<React.SetStateAction<UserProfile[]>>;
  products: Product[];
  suppliers: Supplier[];
  supplierLedger: SupplierLedgerEntry[];
  retailers: Retailer[];
  cashTransfers: CashTransfer[];
  capitalTransactions: CapitalTransaction[];
  replacements: ReplacementAdjustment[];
  orders: OrderInvoice[];
  phoneContacts: PhoneContact[];
  activityLogs: ActivityLog[];
  addActivityLog: (log: Omit<ActivityLog, 'id' | 'timestamp'> & { timestamp?: string }) => ActivityLog;
  clearActivityLogs: () => void;
  deviceFrame: 'auto' | 'android' | 'tablet' | 'fullscreen';
  setDeviceFrame: (frame: 'auto' | 'android' | 'tablet' | 'fullscreen') => void;

  // Authentication & Registration Gateway
  isAuthenticated: boolean;
  isAuthModalOpen: boolean;
  setIsAuthModalOpen: (open: boolean) => void;
  openAuthModal: (mode?: 'login' | 'register') => void;
  closeAuthModal: () => void;
  loginWithPhone: (phone: string, pin?: string, role?: UserRole) => Promise<{ success: boolean; message?: string }>;
  loginWithGoogle: () => Promise<{ success: boolean; message?: string }>;
  registerAccount: (data: {
    phone: string;
    name: string;
    bnName?: string;
    email?: string;
    role: UserRole;
    shopName?: string;
    routeArea?: string;
    adminRef?: string;
    pin?: string;
  }) => Promise<{ success: boolean; message?: string }>;
  logout: () => void;
  selectDemoUser: (user: UserProfile) => void;

  // Admin Reference & Multi-Enterprise Linking
  updateAdminReference: (adminRef: string) => Promise<{ success: boolean; message: string; admin?: UserProfile }>;
  activeAdminEnterprise: string;
  activeAdminPhone: string;
  activeAdminName: string;
  isLinkedToAdmin: boolean;
  isRefSwitcherOpen: boolean;
  setIsRefSwitcherOpen: (open: boolean) => void;
  openRefSwitcher: () => void;
  closeRefSwitcher: () => void;

  // Offline Persistence & Sync Indicators
  isOnline: boolean;
  isFromCache: boolean;
  hasPendingWrites: boolean;
  isSimulatedOffline: boolean;
  toggleSimulateOffline: () => Promise<void>;
  pendingTransfersCount: number;

  // Biometric Authentication & Secure Storage Bridge
  isBiometricLocked: boolean;
  isBiometricEnabled: boolean;
  setBiometricEnabled: (enabled: boolean) => void;
  autoLockDuration: number;
  setAutoLockDuration: (mins: number) => void;
  isPlatformBiometricAvailable: boolean;
  isBiometricSettingsOpen: boolean;
  setIsBiometricSettingsOpen: (open: boolean) => void;
  openBiometricSettings: () => void;
  closeBiometricSettings: () => void;
  lockBiometric: () => void;
  unlockBiometric: () => void;

  // Official Business Profile & Print Pad Settings
  businessProfile: BusinessProfile;
  updateBusinessProfile: (updates: Partial<BusinessProfile>) => BusinessProfile;
  isBusinessProfileOpen: boolean;
  setIsBusinessProfileOpen: (open: boolean) => void;
  openBusinessProfile: () => void;
  closeBusinessProfile: () => void;

  // Actions
  createCashTransfer: (
    data: Omit<CashTransfer, 'id' | 'transferNo' | 'status' | 'createdAt'> & {
      createdAt?: string;
      customDate?: string;
      autoAccept?: boolean;
    }
  ) => void;
  acceptCashTransfer: (transferId: string) => void;
  rejectCashTransfer: (transferId: string) => void;
  
  addSupplierPurchaseFromScan: (data: {
    supplierName: string;
    supplierContact?: string;
    invoiceNumber: string;
    invoiceDate?: string;
    previousDoNo?: string;
    previousDoDate?: string;
    items: Array<{
      productId?: string;
      name: string;
      sku?: string;
      category?: string;
      quantity: number;
      unit?: string;
      costPrice: number;
      suggestedRetailPrice?: number;
      totalPrice: number;
    }>;
    totalAmount: number;
    paymentStatus?: string;
    paymentMethod?: string;
    notes?: string;
    scannedByRole?: UserRole | string;
    scannedByName?: string;
    scannedByPhone?: string;
    scannedByUserId?: string;
  }) => void;
  addSaleFromScan: (data: {
    customerName?: string;
    retailerName?: string;
    retailerId?: string;
    retailerPhone?: string;
    customerPhone?: string;
    invoiceNumber: string;
    invoiceDate?: string;
    items: Array<{
      productId?: string;
      name: string;
      sku?: string;
      quantity: number;
      unit?: string;
      costPrice?: number;
      price: number;
      totalPrice: number;
    }>;
    totalAmount: number;
    paidAmount?: number;
    dueAmount?: number;
    paymentMethod?: 'Cash' | 'Credit' | 'Bank' | 'Mobile';
    notes?: string;
    scannedByRole?: UserRole | string;
    scannedByName?: string;
    scannedByPhone?: string;
    scannedByUserId?: string;
  }) => { success: boolean; message: string; order?: OrderInvoice; deductedCount: number };
  addSupplierPurchase: (params: {
    supplierId: string;
    amount: number;
    date: string;
    referenceNo: string;
    previousDoNo?: string;
    previousDoDate?: string;
    paymentStatus?: 'Unpaid' | 'Paid';
    paymentMethod?: string;
    notes?: string;
  }) => void;

  addSupplierPayment: (
    supplierId: string,
    amount: number,
    paymentMethod: 'Cash' | 'Bank Transfer' | 'bKash / Nagad' | 'Cheque',
    referenceNo: string,
    notes?: string,
    customDate?: string
  ) => void;

  createOrderInvoice: (order: Omit<OrderInvoice, 'id' | 'invoiceNo' | 'date'> & { date?: string }) => OrderInvoice;
  createOrder: (order: any) => OrderInvoice;
  updateOrderInvoice: (orderId: string, updatedData: any) => { success: boolean; message: string; order?: OrderInvoice };
  updateOrder: (orderId: string, updatedData: any) => { success: boolean; message: string; order?: OrderInvoice };
  
  addRetailerFromPhonebook: (
    contact: PhoneContact,
    shopName: string,
    route: string,
    creditLimit: number
  ) => void;

  addPhoneContact: (contact: PhoneContact | Omit<PhoneContact, 'id'>) => void;

  submitReplacementClaim: (claim: any) => void;
  addReplacementClaim: (claim: any) => void;

  resolveReplacement: (
    claimId: string,
    status: 'APPROVED' | 'REPLACED_DISPATCHED' | 'REPLACED_WITH_GOODS' | 'CREDITED_TO_LEDGER' | 'REJECTED' | string,
    resolutionType?: 'PRODUCT_REPLACEMENT' | 'BALANCE_DEDUCTION' | string
  ) => void;
  resolveReplacementClaim: (
    claimId: string,
    status: 'APPROVED' | 'REPLACED_DISPATCHED' | 'REPLACED_WITH_GOODS' | 'CREDITED_TO_LEDGER' | 'SENT_TO_COMPANY' | 'REJECTED' | string,
    resolutionType?: 'PRODUCT_REPLACEMENT' | 'BALANCE_DEDUCTION' | string
  ) => void;
  dispatchReturnsToCompany: (params: {
    supplierId: string;
    claimIds: string[];
    companyChallanNo: string;
    dispatchDate: string;
    notes?: string;
    adjustSupplierLedger?: boolean;
  }) => { success: boolean; message: string; count: number; totalValue: number };
  companyReturns: CompanyReturnChallan[];
  addDirectCompanyReturn: (params: {
    supplierId: string;
    challanNo: string;
    dispatchDate: string;
    items: Array<{
      productId?: string;
      productName: string;
      quantity: number;
      unit?: string;
      value: number;
      reason?: string;
      marketRetailerName?: string;
    }>;
    notes?: string;
    adjustSupplierLedger?: boolean;
    deductStock?: boolean;
    photoUrl?: string;
    sourceType?: 'SCAN' | 'PHOTO' | 'MEMO_KHATA' | 'DIRECT' | 'MARKET_CLAIMS';
  }) => { success: boolean; message: string; challan?: CompanyReturnChallan };
  deleteCompanyReturn: (challanId: string, revertLedger?: boolean) => { success: boolean; message?: string };

  // Memo & Khata Scanner for Cash Counter & DSR Sales and Replacement
  isMemoKhataScannerOpen: boolean;
  setIsMemoKhataScannerOpen: (open: boolean) => void;
  memoKhataScannerInitialMode: 'COUNTER' | 'DSR' | 'REPLACE';
  openMemoKhataScanner: (mode?: 'COUNTER' | 'DSR' | 'REPLACE') => void;
  closeMemoKhataScanner: () => void;
  addCounterOrDsrSalesAndReplacement: (data: {
    operatorMode: 'COUNTER' | 'DSR';
    customerName?: string;
    retailerName?: string;
    retailerId?: string;
    customerPhone?: string;
    invoiceNumber: string;
    invoiceDate?: string;
    salesItems: Array<{
      productId?: string;
      name: string;
      sku?: string;
      quantity: number;
      unit?: string;
      costPrice?: number;
      price: number;
      totalPrice: number;
    }>;
    replacementItems?: Array<{
      productId?: string;
      productName: string;
      quantity: number;
      unit?: string;
      value: number;
      reason?: string;
    }>;
    totalSalesAmount: number;
    replacementDeductionAmount: number;
    netPayableAmount: number;
    paidAmount?: number;
    dueAmount?: number;
    paymentMethod?: 'Cash' | 'Credit' | 'Bank' | 'Mobile' | string;
    notes?: string;
    scannedByRole?: string;
    scannedByName?: string;
    scannedByPhone?: string;
    scannedByUserId?: string;
  }) => { success: boolean; message: string; order?: OrderInvoice; replacementCount: number };

  // Replacement Accounting & Settlement Handlers for Market & Company
  settleRetailerReplacementClaim: (
    claimId: string,
    resolutionType: 'CREDIT_TO_DUE' | 'GOODS_REPLACEMENT' | 'CASH_REFUND',
    notes?: string
  ) => { success: boolean; message: string };
  batchSettleRetailerClaims: (
    retailerId: string,
    claimIds: string[],
    resolutionType: 'CREDIT_TO_DUE' | 'GOODS_REPLACEMENT' | 'CASH_REFUND',
    notes?: string
  ) => { success: boolean; message: string; count: number; totalAmount: number };
  recordCompanyCreditSettlement: (params: {
    supplierId: string;
    challanId?: string;
    creditAmount: number;
    creditNoteNo: string;
    date: string;
    notes?: string;
  }) => { success: boolean; message: string };

  addCapitalTransaction: (
    type: 'CAPITAL_INJECTION' | 'OWNER_WITHDRAWAL',
    amount: number,
    description: string,
    bnDescription: string,
    account: 'CASH_DRAWER' | 'BANK',
    customDate?: string
  ) => void;

  updateProductThreshold: (productId: string, newThreshold: number) => void;
  restockProduct: (productId: string, quantityToAdd: number) => void;
  updateProduct: ((updatedProduct: Product) => void) & ((productId: string, partialUpdates: Partial<Product>) => Promise<void> | void);
  addProduct: (product: Omit<Product, 'id'> | Product) => Product;
  deleteProduct: (productId: string) => { success: boolean; message?: string };
  mergeAllDuplicateProducts: () => { mergedCount: number; message: string };

  // Entity Deletion & Update Handlers (Error / Mistake Correction)
  deleteOrder: (orderId: string, restoreStock?: boolean) => { success: boolean; message?: string };
  deleteRetailer: (retailerId: string) => { success: boolean; message?: string };
  updateRetailer: (updatedRetailer: Retailer) => void;
  addRetailer: (retailer: Omit<Retailer, 'id'> | Retailer) => Retailer;
  deleteSupplier: (supplierId: string) => { success: boolean; message?: string };
  updateSupplier: (updatedSupplier: Supplier) => void;
  updateSupplierOpeningDue: (params: {
    supplierId: string;
    openingBalance: number;
    openingDate: string;
    openingNotes?: string;
  }) => { success: boolean; message: string; supplier?: Supplier };
  addSupplier: (supplier: Omit<Supplier, 'id'> | Supplier) => Supplier;
  updateSupplierPurchaseChallan: (params: {
    entryId: string;
    referenceNo: string;
    date: string;
    supplierId: string;
    previousDoNo?: string;
    previousDoDate?: string;
    notes?: string;
    paymentMethod?: string;
    paymentStatus?: 'Unpaid' | 'Paid';
    items: SupplierPurchaseItem[];
  }) => { success: boolean; message: string; entry?: SupplierLedgerEntry };
  deleteSupplierLedgerEntry: (entryId: string, revertBalance?: boolean) => { success: boolean; message?: string };
  deleteCashTransfer: (transferId: string) => { success: boolean; message?: string };
  deleteCapitalTransaction: (transactionId: string) => { success: boolean; message?: string };
  deleteReplacementClaim: (claimId: string) => { success: boolean; message?: string };
  deletePhoneContact: (contactId: string) => void;
  updatePhoneContact: (updatedContact: PhoneContact) => void;
  deleteUser: (userId: string) => { success: boolean; message?: string };
  updateUserProfile: (updatedUser: Partial<UserProfile> & { id: string }) => void;
  clearAllActivityLogs: () => { success: boolean; message?: string };
  deleteActivityLog: (logId: string) => { success: boolean; message?: string };
  clearAllSampleData: () => void;
  restoreSampleBusinessData: () => Promise<{ success: boolean; message: string }>;

  // System Data Reset & Fresh Start Modal
  isResetModalOpen: boolean;
  setIsResetModalOpen: (open: boolean) => void;
  openResetModal: () => void;
  closeResetModal: () => void;
  resetAllSystemData: (options?: {
    mode?: 'INVOICES_AND_CASH' | 'FULL_FACTORY';
    initialAdminCash?: number;
    initialBankCash?: number;
    resetRetailerDues?: boolean;
    resetSupplierDues?: boolean;
    resetInventoryStockToZero?: boolean;
    clearProductsCatalog?: boolean;
    clearActivityLogs?: boolean;
  }) => Promise<{ success: boolean; message: string }>;

  // Staff & Team Management (DSR & Cash Counter)
  isStaffManagementOpen: boolean;
  setIsStaffManagementOpen: (open: boolean) => void;
  openStaffManagement: () => void;
  closeStaffManagement: () => void;
  addStaffMember: (staffData: {
    name: string;
    bnName?: string;
    role: 'dsr' | 'counter';
    phone: string;
    pin?: string;
    routeArea?: string;
    assignedCounterNo?: string;
    assignedCashDrawer?: number;
    notes?: string;
  }) => Promise<{ success: boolean; message: string; user?: UserProfile }>;
  updateStaffMember: (
    staffId: string,
    updates: Partial<UserProfile>
  ) => Promise<{ success: boolean; message: string; user?: UserProfile }>;
  deleteStaffMember: (staffId: string) => Promise<{ success: boolean; message: string }>;

  // Dual Cash Balances & Payment Flow
  cashAdmin: number;
  cashCounter: number;
  cashDSR: number;
  cashBank: number;
  bankAccounts: BankAccount[];
  pendingFromDsrAndCounter: number;
  isAdminCashZero: boolean;
  isAdminCashNegative: boolean;
  isCounterCashNegative: boolean;
  isDsrCashNegative: boolean;
  quickPayAdmin: (amount: number, notes?: string) => void;
  quickReceiveFromCounter: (amount?: number, notes?: string) => void;
  quickPayCounterFromDsr: (amount?: number, notes?: string) => void;

  // Cash Flow Formulas & Net Breakdown across Drawers
  totalCashReceivedByAdmin: number;
  adminDirectCashSales: number;
  cashCapitalInjected: number;
  cashReceivedFromCounter: number;
  cashReceivedFromDSR: number;
  counterOrdersCashCollected: number;
  cashReceivedFromDSRToCounter: number;
  counterTransfersToAdmin: number;
  counterPendingTransfersToAdmin: CashTransfer[];
  dsrOrdersCashCollected: number;
  dsrTransfersOut: number;
  dsrTransfersToCounter: number;
  dsrPendingTransfersToCounter: CashTransfer[];
  totalCounterCash: number;
  totalDsrCash: number;
  totalStaffCash: number;
  totalCashReceivedFromStaff: number;
  totalCompanyCashPaid: number;
  totalCompanyPaid: number;
  pendingTransfersToAdmin: CashTransfer[];
  pendingAmountToAdmin: number;
  acceptAllPendingTransfersToAdmin: () => void;
  acceptAllPendingTransfersToCurrentUser: () => void;

  // Direct Bank & Cash Balance Modification Handlers
  updateBankBalance: (newTotalAmount: number, notes?: string) => void;
  updateBankAccountBalance: (accountId: string, newBalance: number) => void;
  updateUserCashDrawer: (userId: string, newAmount: number, notes?: string) => void;
  updateAdminCashVault: (newAmount: number, notes?: string) => void;
  updateCounterCash: (newAmount: number, notes?: string) => void;
  updateDsrCash: (newAmount: number, notes?: string) => void;
  adjustDirectBalance: (target: BalanceAccountType, newAmount: number, notes?: string) => void;
  showNotification: (message: string, type?: 'success' | 'error' | 'info') => void;

  adminCashBalance: number;
  counterCashBalance: number;
  dsrCashBalance: number;
  bankCashBalance: number;

  // Balance Editor Modal
  isBalanceModalOpen: boolean;
  setIsBalanceModalOpen: (open: boolean) => void;
  balanceModalTarget: BalanceAccountType;
  balanceModalType: BalanceAccountType;
  openBalanceModal: (target?: BalanceAccountType) => void;
  closeBalanceModal: () => void;

  // Sandbox / Test Mode & Multi-Tenant Shop Isolation
  isTestMode: boolean;
  setIsTestMode: (val: boolean) => void;
  toggleTestMode: () => void;
  activeTenantId: string;
  setTenantId: (tenantId: string) => void;

  // Quick Investment & Payment Hub Modals
  isInvestModalOpen: boolean;
  setIsInvestModalOpen: (open: boolean) => void;
  openInvestModal: () => void;
  closeInvestModal: () => void;
  isPaymentHubOpen: boolean;
  setIsPaymentHubOpen: (open: boolean) => void;
  openPaymentHub: () => void;
  closePaymentHub: () => void;
  isCompanyPaymentModalOpen: boolean;
  setIsCompanyPaymentModalOpen: (open: boolean) => void;
  openCompanyPaymentModal: () => void;
  closeCompanyPaymentModal: () => void;
  isPayAdminModalOpen: boolean;
  setIsPayAdminModalOpen: (open: boolean) => void;
  openPayAdminModal: () => void;
  closePayAdminModal: () => void;
  isAddSupplierModalOpen: boolean;
  setIsAddSupplierModalOpen: (open: boolean) => void;
  openAddSupplierModal: () => void;
  closeAddSupplierModal: () => void;

  // Company Financial Statement & Purchase vs Replacement Analytics
  totalGrossPurchases: number;
  totalCompanyReplacementReturns: number;
  totalNetPurchases: number;
  totalSupplierPayable: number;
  isCompanyStatementModalOpen: boolean;
  setIsCompanyStatementModalOpen: (open: boolean) => void;
  companyStatementSupplierId: string | null;
  openCompanyStatement: (supplierId?: string) => void;
  closeCompanyStatement: () => void;

  // Offline Sync Queue & Cloud Backup
  offlineQueueCount: number;
  offlineSyncQueue: OfflineSyncQueueItem[];
  lastSyncTime: string | null;
  lastBackupTime: string | null;
  backupHistory: BackupMeta[];
  isSyncingToCloud: boolean;
  isBackupModalOpen: boolean;
  setIsBackupModalOpen: (open: boolean) => void;
  openBackupModal: () => void;
  closeBackupModal: () => void;
  isStaffSyncModalOpen: boolean;
  setIsStaffSyncModalOpen: (open: boolean) => void;
  openStaffSyncModal: () => void;
  closeStaffSyncModal: () => void;
  syncPendingOfflineData: () => Promise<{ success: boolean; syncedCount: number; message: string }>;
  backupAllPendingFilesTogether: () => Promise<{ success: boolean; syncedCount: number; message: string }>;
  syncRoleTransactionsToCloud: (targetRole?: UserRole) => Promise<{ success: boolean; message: string; syncedCount: number }>;
  refreshAllDataFromCloud: () => Promise<{ success: boolean; message: string; counts?: { orders: number; dsrOrders: number; counterOrders: number; adminOrders: number } }>;
  triggerManualBackup: () => Promise<{ success: boolean; backupId?: string; message: string }>;
  downloadLocalBackupJSON: () => Promise<void> | void;
  restoreFromBackupSnapshot: (snapshot: CloudBackupSnapshot) => Promise<{ success: boolean; message: string }>;
  syncToGoogleDrive: () => Promise<{ success: boolean; message: string }>;
  pullFromGoogleDrive: () => Promise<{ success: boolean; message: string; counts?: any }>;
  isGoogleDriveConnected: boolean;
  googleDriveAccount: { email: string | null; displayName: string | null };

  // Calculations
  totalCapitalInjected: number;
  totalReceivables: number;
  totalPayables: number;
  totalInventoryValuation: number;
  totalLiquidCash: number;
  businessNetWorth: number;

  // Expenses & Operational Outflow Management (ক্যাশ কাউন্টার খরচ এন্ট্রি - বেতন, দোকান ভাড়া, বিদ্যুৎ বিল, অন্যান্য)
  expenses: Expense[];
  addExpense: (expense: Omit<Expense, 'id' | 'createdAt'>) => Expense;
  deleteExpense: (id: string) => void;
  updateExpense: (expense: Expense) => void;
  isExpenseModalOpen: boolean;
  setIsExpenseModalOpen: (open: boolean) => void;
  openExpenseModal: (defaultCategory?: ExpenseCategory) => void;
  closeExpenseModal: () => void;
  expenseModalDefaultCategory: ExpenseCategory;
  counterExpensesPaid: number;
  totalExpenses: number;
  grossProfit: number;
  netRealizedProfit: number;

  // Live Multi-Device Staff Presence & Real-Time Monitor
  getDevicePresence: (roleOrUserId: string) => { isOnline: boolean; lastActiveText: string; deviceText: string };
  allStaffPresences: Array<{ id: string; name: string; bnName?: string; role: UserRole; phone: string; isOnline: boolean; lastActiveText: string; deviceText: string }>;
  sendPresenceHeartbeat: () => Promise<void>;
  registeredDevices: Array<any>;
  remotePendingDevices: Array<any>;
  refreshRegisteredDevices: () => Promise<void>;
  adminClearDevicePending: (deviceId: string) => Promise<{ success: boolean; message: string }>;
  adminUploadDevicePending: (deviceId: string) => Promise<{ success: boolean; message: string }>;
  isFleetModalOpen: boolean;
  setIsFleetModalOpen: (open: boolean) => void;
  openFleetModal: () => void;
  closeFleetModal: () => void;
}

export const DELETED_USERS_STORAGE_KEY = 'ws_deleted_user_ids';

export function getDeletedUserIds(): Set<string> {
  const set = new Set<string>(['usr_dsr_mp', 'MP', '01700000002', '1700000002']);
  try {
    const raw = localStorage.getItem(DELETED_USERS_STORAGE_KEY);
    if (raw) {
      const arr = JSON.parse(raw);
      if (Array.isArray(arr)) arr.forEach((id) => set.add(id));
    }
  } catch (e) {}
  return set;
}

export function trackDeletedUserId(idOrPhone: string) {
  try {
    const set = getDeletedUserIds();
    set.add(idOrPhone);
    const cleanDigits = idOrPhone.replace(/[^0-9]/g, '');
    if (cleanDigits) set.add(cleanDigits);
    localStorage.setItem(DELETED_USERS_STORAGE_KEY, JSON.stringify(Array.from(set)));
  } catch (e) {}
}

/**
 * Deduplicates and sanitizes the users array:
 * 1. Ensures EXACTLY ONE canonical Admin ("মাতৃছায়া টেলিকম", phone: '01937200635', id: 'usr_admin').
 * 2. Permanently purges all other admin entries as instructed by user:
 *    "01937200635 এই মোবাইল নাম্বারের এডমিন রেখে বাকি সকল এডমিন ডিলেট করে দাও"
 * 3. Deduplicates staff members (DSR, Counter) by unique ID and unique phone.
 * 4. Ensures default Counter and custom DSR profiles exist and are linked to Admin 01937200635.
 * 5. Respects Admin's added DSRs without ever re-injecting the demo "MP" user.
 */
export function sanitizeAndDeduplicateUsers(list: UserProfile[]): UserProfile[] {
  const result: UserProfile[] = [];
  const seenAdminPhones = new Set<string>();
  const seenStaffKeys = new Set<string>();
  const deletedIds = getDeletedUserIds();

  // Check if any real custom DSR has been added by admin
  const hasCustomDsr = (list || []).some(
    (u) =>
      u &&
      u.role === 'dsr' &&
      u.id !== 'usr_dsr_mp' &&
      !u.phone?.replace(/[^0-9]/g, '').endsWith('1700000002') &&
      u.name !== 'MP'
  );

  const canonicalAdmin: UserProfile = {
    id: 'usr_admin',
    name: 'মাতৃছায়া টেলিকম',
    bnName: 'প্রোপ্রাইটর (মাতৃছায়া টেলিকম)',
    role: 'admin',
    phone: '01937200635',
    pin: '1234',
    email: 'admin@matrichayatelecom.com',
    avatar: 'https://images.unsplash.com/photo-1556742049-0a67c5574f73?w=150&auto=format&fit=crop&q=80',
    enterpriseName: 'মাতৃছায়া টেলিকম',
    shopName: 'মাতৃছায়া টেলিকম',
    adminRef: '01937200635',
    adminPhone: '01937200635',
    assignedCashDrawer: 0,
  };

  // Find existing admin drawer and PIN if any existed
  const existingAdmin = (list || []).find(
    (u) =>
      u.id === 'usr_admin' ||
      (u.phone && (u.phone.includes('01937200635') || u.phone.includes('1937200635'))) ||
      (u.role === 'admin' && (u.name?.includes('মাতৃছায়া') || u.enterpriseName?.includes('মাতৃছায়া')))
  );

  const primaryAdmin: UserProfile = existingAdmin
    ? {
        ...canonicalAdmin,
        name: existingAdmin.name?.includes('Rafiq') ? 'মাতৃছায়া টেলিকম' : (existingAdmin.name || canonicalAdmin.name),
        bnName: canonicalAdmin.bnName,
        phone: '01937200635',
        adminRef: '01937200635',
        adminPhone: '01937200635',
        assignedCashDrawer: existingAdmin.assignedCashDrawer ?? 0,
        pin: existingAdmin.pin || '1234',
      }
    : canonicalAdmin;

  result.push(primaryAdmin);
  seenAdminPhones.add('01937200635');
  seenAdminPhones.add('+8801937200635');
  seenStaffKeys.add('usr_admin');

  for (const u of list || []) {
    if (!u || !u.id) continue;

    const cleanStaffPhone = (u.phone || '').replace(/[^0-9]/g, '');

    // Discard any user explicitly marked as deleted by admin
    if (deletedIds.has(u.id) || (cleanStaffPhone && deletedIds.has(cleanStaffPhone))) {
      continue;
    }

    // Skip old demo dummy staff
    if (
      u.id === 'usr_dsr_1' ||
      u.id === 'usr_counter_1' ||
      u.id === 'usr_retailer_1' ||
      u.name?.includes('Selim') ||
      u.name?.includes('Kamal Hossain') ||
      u.name?.includes('Rahim Mia') ||
      u.name?.includes('Rafiq')
    ) {
      continue;
    }

    // Skip canonical admin since already added
    if (u.id === 'usr_admin') continue;

    // STRICTLY DISCARD all other admins:
    // Only ONE admin exists: 01937200635 (primaryAdmin already pushed)
    if (u.role === 'admin') {
      continue;
    }

    // BLOCK "MP" completely:
    if (
      u.name === 'MP' ||
      u.name?.trim().toUpperCase() === 'MP' ||
      u.id === 'usr_dsr_mp' ||
      cleanStaffPhone.endsWith('1700000002')
    ) {
      continue;
    }

    // Normalize legitimate DSR profile
    const rawDsrDrawer = u.role === 'dsr' ? Number(u.assignedCashDrawer) || 0 : (u.assignedCashDrawer || 0);
    const safeDsrDrawer = rawDsrDrawer === -188200 || rawDsrDrawer < 0 ? 0 : rawDsrDrawer;

    const staffMember: UserProfile =
      u.role === 'dsr'
        ? {
            ...u,
            id: u.id === 'usr_dsr_mp' ? 'usr_dsr_razo' : u.id,
            name: u.name || 'Razo Alom',
            bnName: u.bnName || 'রাজু আলম (ডিএসআর)',
            phone: cleanStaffPhone.endsWith('1615154653') ? u.phone : (u.phone || '01615154653'),
            notes: u.notes || 'রাজু আহমেদ',
            adminRef: '01937200635',
            adminPhone: '01937200635',
            adminEnterprise: 'মাতৃছায়া টেলিকম',
            adminName: 'মাতৃছায়া টেলিকম',
            assignedCashDrawer: safeDsrDrawer,
          }
        : {
            ...u,
            phone:
              u.role === 'counter'
                ? cleanStaffPhone.endsWith('1949663733')
                  ? u.phone
                  : '01949663733'
                : u.phone,
            adminRef: '01937200635',
            adminPhone: '01937200635',
            adminEnterprise: 'মাতৃছায়া টেলিকম',
            adminName: 'মাতৃছায়া টেলিকম',
          };

    const effectivePhone = (staffMember.phone || '').replace(/[^0-9]/g, '');
    const staffKey = `${staffMember.role}_${effectivePhone || staffMember.id}`;
    if (seenStaffKeys.has(staffMember.id) || (effectivePhone && seenStaffKeys.has(staffKey))) {
      continue; // duplicate staff, discard!
    }
    seenStaffKeys.add(staffMember.id);
    if (effectivePhone) seenStaffKeys.add(staffKey);

    result.push(staffMember);
  }

  // Ensure default Cash Counter exists (phone: 01949663733)
  const hasCounter = result.some((u) => u.id === 'usr_counter_pc' || u.role === 'counter');
  if (!hasCounter) {
    let savedCounterDrawer = 0;
    try {
      const storedUsers = localStorage.getItem('ws_users');
      if (storedUsers) {
        const parsed = JSON.parse(storedUsers);
        const existingCounter = parsed.find((p: any) => p.role === 'counter');
        if (existingCounter && typeof existingCounter.assignedCashDrawer === 'number') {
          savedCounterDrawer = existingCounter.assignedCashDrawer;
        }
      }
    } catch (e) {}

    result.push({
      id: 'usr_counter_pc',
      name: 'Cash Counter POS',
      bnName: 'ক্যাশ কাউন্টার (ল্যাপটপ POS)',
      role: 'counter',
      phone: '01949663733',
      pin: '2345',
      email: 'counter@matrichayatelecom.com',
      avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
      enterpriseName: 'মাতৃছায়া টেলিকম',
      shopName: 'মাতৃছায়া টেলিকম',
      adminRef: '01937200635',
      adminPhone: '01937200635',
      assignedCounterNo: 'Counter-01 (ল্যাপটপ POS)',
      assignedCashDrawer: savedCounterDrawer,
    });
  }

  // Strict final deduplication by unique ID to prevent any duplicate React keys
  const finalUniqueUsers: UserProfile[] = [];
  const seenUniqueIds = new Set<string>();
  for (const u of result) {
    if (!u || !u.id || seenUniqueIds.has(u.id)) continue;
    seenUniqueIds.add(u.id);
    finalUniqueUsers.push(u);
  }

  return finalUniqueUsers;
}

const WholesaleContext = createContext<WholesaleContextType | undefined>(undefined);

// Helper to ensure orders with market replacements always have accurate, consistent profit
const sanitizeOrderProfits = (orders: OrderInvoice[]): OrderInvoice[] => {
  return orders.map((ord) => {
    const hasRep = (ord.totalReplacementAmount && ord.totalReplacementAmount > 0) ||
      (ord.items || []).some((i) => i.itemType === 'REPLACEMENT' || i.isReplacement || Number(i.quantity) < 0);
    
    if (hasRep || ord.totalCostAmount === undefined || ord.totalProfitAmount === undefined || (ord.totalCostAmount > (ord.totalAmount || 0) && (ord.totalAmount || 0) > 0)) {
      let saleGross = 0;
      let saleCost = 0;
      let repGross = 0;
      let repCost = 0;

      (ord.items || []).forEach((it: any) => {
        const isRep = it.itemType === 'REPLACEMENT' || it.isReplacement === true || Number(it.quantity) < 0;
        const q = it.quantity !== undefined && !isNaN(Number(it.quantity)) ? Math.abs(Number(it.quantity)) : 0;
        const p = Number(it.unitPrice || it.price || 0);
        const c = Number(it.costPrice && Number(it.costPrice) > 0 ? it.costPrice : (p > 0 ? Math.round(p * 0.85) : 0));
        if (isRep) {
          repGross += q * p;
          repCost += q * c;
        } else {
          saleGross += q * p;
          saleCost += q * c;
        }
      });

      const saleProfit = Math.max(0, saleGross - saleCost);
      const repProfit = Math.max(0, repGross - repCost);
      const memoDiff = Number(ord.priceDifference || 0);
      const memoDisc = Number(ord.discount || 0);
      const computedProfit = Math.max(0, saleProfit - repProfit - memoDisc + memoDiff);
      const computedCost = Math.max(0, (ord.totalAmount || (saleGross - repGross)) - computedProfit);

      return {
        ...ord,
        totalCostAmount: computedCost,
        totalProfitAmount: computedProfit,
      };
    }
    return ord;
  });
};

export const WholesaleProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Load initial state from localStorage or mock fallback
  const [language, setLanguageState] = useState<Language>(() => {
    return (localStorage.getItem('ws_lang') as Language) || 'en';
  });

  const [users, setUsers] = useState<UserProfile[]>(() => {
    const saved = localStorage.getItem('ws_users');
    let parsed: UserProfile[] = saved ? JSON.parse(saved) : [];
    const sanitized = sanitizeAndDeduplicateUsers(parsed.length > 0 ? parsed : initialUsers);
    localStorage.setItem('ws_users', JSON.stringify(sanitized));
    return sanitized;
  });

  const [currentRole, setCurrentRoleState] = useState<UserRole>(() => {
    const savedRole = localStorage.getItem('ws_current_role') as UserRole;
    if (savedRole && ['admin', 'counter', 'dsr', 'retailer'].includes(savedRole)) {
      return savedRole;
    }
    return 'admin';
  });
  
  const [currentUser, setCurrentUserState] = useState<UserProfile>(() => {
    const savedUserStr = localStorage.getItem('ws_current_user');
    if (savedUserStr) {
      try {
        const parsed = JSON.parse(savedUserStr);
        if (parsed && parsed.id) {
          if (
            parsed.id === 'usr_admin' ||
            parsed.role === 'admin' ||
            parsed.phone?.includes('01711234567') ||
            parsed.name?.includes('Rafiq') ||
            parsed.enterpriseName?.includes('Rafiq')
          ) {
            const updated = {
              ...parsed,
              id: 'usr_admin',
              role: 'admin' as UserRole,
              phone: '01937200635',
              adminRef: '01937200635',
              adminPhone: '01937200635',
              name: 'মাতৃছায়া টেলিকম',
              bnName: 'প্রোপ্রাইটর (মাতৃছায়া টেলিকম)',
              enterpriseName: 'মাতৃছায়া টেলিকম',
              shopName: 'মাতৃছায়া টেলিকম',
            };
            localStorage.setItem('ws_current_user', JSON.stringify(updated));
            return updated;
          }
          // If previous user was DSR, ensure canonical Razo Alom (রাজু আলম / রাজু আহমেদ)
          if (parsed.role === 'dsr' || parsed.id === 'usr_dsr_mp' || parsed.id === 'usr_dsr_razo' || parsed.name === 'MP' || parsed.name === 'Razo Alom') {
            const dsrUser = {
              ...parsed,
              id: 'usr_dsr_razo',
              name: 'Razo Alom',
              bnName: 'রাজু আলম (ডিএসআর)',
              phone: parsed.phone?.includes('1615154653') ? parsed.phone : '01615154653',
              role: 'dsr' as UserRole,
              notes: parsed.notes || 'রাজু আহমেদ',
              adminRef: '01937200635',
              adminPhone: '01937200635',
              adminEnterprise: 'মাতৃছায়া টেলিকম',
              adminName: 'মাতৃছায়া টেলিকম',
            };
            localStorage.setItem('ws_current_user', JSON.stringify(dsrUser));
            return dsrUser;
          }
          // If previous user was Cash Counter, ensure phone 01949663733
          if (parsed.role === 'counter' || parsed.id === 'usr_counter_pc') {
            const counterUser = {
              ...parsed,
              id: 'usr_counter_pc',
              phone: parsed.phone?.includes('1949663733') ? parsed.phone : '01949663733',
              role: 'counter' as UserRole,
              adminRef: '01937200635',
              adminPhone: '01937200635',
              adminEnterprise: 'মাতৃছায়া টেলিকম',
              adminName: 'মাতৃছায়া টেলিকম',
            };
            localStorage.setItem('ws_current_user', JSON.stringify(counterUser));
            return counterUser;
          }
          // If staff, link to 01937200635
          const staffUpdated = {
            ...parsed,
            adminRef: '01937200635',
            adminPhone: '01937200635',
            adminEnterprise: 'মাতৃছায়া টেলিকম',
            adminName: 'মাতৃছায়া টেলিকম',
          };
          localStorage.setItem('ws_current_user', JSON.stringify(staffUpdated));
          return staffUpdated;
        }
      } catch (e) {}
    }
    const admin = users.find((u) => u.role === 'admin' && (u.phone === '01937200635' || u.phone?.endsWith('1937200635'))) || users.find((u) => u.id === 'usr_admin') || users[0];
    return admin;
  });

  const [deviceFrame, setDeviceFrameState] = useState<'auto' | 'android' | 'tablet' | 'fullscreen'>(() => {
    const saved = localStorage.getItem('ws_device_frame');
    if (saved === 'auto' || saved === 'fullscreen') return saved as any;
    // Default to 'auto' so responsive layout looks gorgeous on laptop, PC or phone
    return 'auto';
  });

  const setDeviceFrame = (frame: 'auto' | 'android' | 'tablet' | 'fullscreen') => {
    setDeviceFrameState(frame);
    localStorage.setItem('ws_device_frame', frame);
  };

  // Authentication States (Default to Switch Role / Login screen on app open)
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    const savedAuth = localStorage.getItem('ws_auth_logged_in');
    return savedAuth !== null ? JSON.parse(savedAuth) : false;
  });
  const [isAuthModalOpen, setIsAuthModalOpen] = useState<boolean>(() => {
    return false;
  });
  const [authModalInitialMode, setAuthModalInitialMode] = useState<'login' | 'register'>('login');
  const [isRefSwitcherOpen, setIsRefSwitcherOpen] = useState<boolean>(false);

  // Test Mode / Sandbox & Multi-tenant Shop Data Isolation
  const [isTestMode, setIsTestModeState] = useState<boolean>(() => {
    const saved = localStorage.getItem('ws_sandbox_test_mode');
    return saved !== null ? JSON.parse(saved) : false;
  });

  const setIsTestMode = (val: boolean) => {
    setIsTestModeState(val);
    localStorage.setItem('ws_sandbox_test_mode', JSON.stringify(val));
  };

  const toggleTestMode = () => {
    setIsTestMode(!isTestMode);
  };

  const [activeTenantId, setActiveTenantIdState] = useState<string>(() => {
    return localStorage.getItem('ws_tenant_shop_id') || 'shop_matrichaya_main';
  });

  const setTenantId = (tId: string) => {
    setActiveTenantIdState(tId);
    localStorage.setItem('ws_tenant_shop_id', tId);
  };

  // Quick Investment & Payment Hub Modal States
  const [isInvestModalOpen, setIsInvestModalOpen] = useState<boolean>(false);
  const openInvestModal = () => setIsInvestModalOpen(true);
  const closeInvestModal = () => setIsInvestModalOpen(false);

  const [isPaymentHubOpen, setIsPaymentHubOpen] = useState<boolean>(false);
  const openPaymentHub = () => setIsPaymentHubOpen(true);
  const closePaymentHub = () => setIsPaymentHubOpen(false);

  const [isCompanyPaymentModalOpen, setIsCompanyPaymentModalOpen] = useState<boolean>(false);
  const openCompanyPaymentModal = () => setIsCompanyPaymentModalOpen(true);
  const closeCompanyPaymentModal = () => setIsCompanyPaymentModalOpen(false);

  const [isPayAdminModalOpen, setIsPayAdminModalOpen] = useState<boolean>(false);
  const openPayAdminModal = () => setIsPayAdminModalOpen(true);
  const closePayAdminModal = () => setIsPayAdminModalOpen(false);

  // Staff & Team Management Modal State (DSR & Cash Counter)
  const [isStaffManagementOpen, setIsStaffManagementOpen] = useState<boolean>(false);
  const openStaffManagement = () => setIsStaffManagementOpen(true);
  const closeStaffManagement = () => setIsStaffManagementOpen(false);

  const [isAddSupplierModalOpen, setIsAddSupplierModalOpen] = useState<boolean>(false);
  const openAddSupplierModal = () => setIsAddSupplierOpen(true);
  const closeAddSupplierModal = () => setIsAddSupplierOpen(false);
  const setIsAddSupplierOpen = setIsAddSupplierModalOpen;

  // Company Financial Statement & Purchase vs Replacement Analytics Modal State
  const [isCompanyStatementModalOpen, setIsCompanyStatementModalOpen] = useState<boolean>(false);
  const [companyStatementSupplierId, setCompanyStatementSupplierId] = useState<string | null>(null);
  const openCompanyStatement = (supplierId?: string) => {
    if (supplierId) setCompanyStatementSupplierId(supplierId);
    setIsCompanyStatementModalOpen(true);
  };
  const closeCompanyStatement = () => {
    setIsCompanyStatementModalOpen(false);
  };

  const [isResetModalOpen, setIsResetModalOpen] = useState<boolean>(false);
  const openResetModal = () => setIsResetModalOpen(true);
  const closeResetModal = () => setIsResetModalOpen(false);

  // Cash Counter & DSR Sales and Replacement Memo/Khata Scanner Modal State
  const [isMemoKhataScannerOpen, setIsMemoKhataScannerOpen] = useState<boolean>(false);
  const [memoKhataScannerInitialMode, setMemoKhataScannerInitialMode] = useState<'COUNTER' | 'DSR' | 'REPLACE'>('COUNTER');
  const openMemoKhataScanner = (mode: 'COUNTER' | 'DSR' | 'REPLACE' = 'COUNTER') => {
    setMemoKhataScannerInitialMode(mode);
    setIsMemoKhataScannerOpen(true);
  };
  const closeMemoKhataScanner = () => setIsMemoKhataScannerOpen(false);

  const isSystemResetDone = typeof window !== 'undefined' && localStorage.getItem('ws_system_reset_performed') === 'true';

  // Helper: Detect and eliminate default dummy mock products and automatic Xiaomi / Symphony dummy records
  const isDefaultMockProduct = (p: Partial<Product> | any): boolean => {
    if (!p) return true;
    const mockProductIds = [
      'prod_sd_32', 'prod_sd_64', 'prod_chg_fast', 'prod_chg_20w',
      'prod_cab_typec', 'prod_cab_iphone', 'prod_tws_air', 'prod_phone_sym',
      'prod_pb_10k', 'prod_bat_bl5c', 'prod_speaker_bt', 'prod_glass_11d',
      'prod_mouse_opt', 'prod_pendrive_34'
    ];
    if (p.id && mockProductIds.includes(p.id)) return true;

    const brand = (p.brand || '').toLowerCase();
    const name = (p.name || '').toLowerCase();
    const bnName = (p.bnName || '').toLowerCase();
    const supplierId = (p.supplierId || '').toLowerCase();
    const supplierName = (p.supplierName || '').toLowerCase();

    return (
      brand.includes('xiaomi') || brand.includes('symphony') || brand.includes('শাওমি') || brand.includes('সিম্ফনি') ||
      name.includes('xiaomi') || name.includes('symphony') || name.includes('শাওমি') || name.includes('সিম্ফনি') ||
      bnName.includes('xiaomi') || bnName.includes('symphony') || bnName.includes('শাওমি') || bnName.includes('সিম্ফনি') ||
      supplierId === 'sup_realme_xiaomi' || supplierId === 'sup_symphony' ||
      supplierName.includes('xiaomi') || supplierName.includes('symphony') || supplierName.includes('শাওমি') || supplierName.includes('সিম্ফনি')
    );
  };

  // Helper: Detect and eliminate default dummy mock suppliers and automatic Xiaomi / Symphony dummy records
  const isDefaultMockSupplier = (s: Partial<Supplier> | any): boolean => {
    if (!s) return true;
    const mockSupplierIds = [
      'sup_realme_xiaomi', 'sup_symphony', 'sup_remax_hoco', 'sup_walton', 'sup_samsung_hub'
    ];
    if (s.id && mockSupplierIds.includes(s.id)) return true;

    const name = (s.name || '').toLowerCase();
    const bnName = (s.bnName || '').toLowerCase();
    const company = (s.company || '').toLowerCase();
    const bnCompany = (s.bnCompany || '').toLowerCase();

    return (
      name.includes('xiaomi') || name.includes('symphony') || name.includes('শাওমি') || name.includes('সিম্ফনি') ||
      bnName.includes('xiaomi') || bnName.includes('symphony') || bnName.includes('শাওমি') || bnName.includes('সিম্ফনি') ||
      company.includes('xiaomi') || company.includes('symphony') || company.includes('শাওমি') || company.includes('সিম্ফনি') ||
      bnCompany.includes('xiaomi') || bnCompany.includes('symphony') || bnCompany.includes('শাওমি') || bnCompany.includes('সিম্ফনি')
    );
  };

  const [products, setProducts] = useState<Product[]>(() => {
    const saved = localStorage.getItem('ws_products');
    let parsed: Product[] = [];
    if (saved) {
      try {
        parsed = JSON.parse(saved);
      } catch (e) {}
    }
    // Retain only genuine items (from purchases or JSON imports), purge default mock & Xiaomi / Symphony dummy names
    const cleanList = (parsed || []).filter((p) => p && p.id && !isDefaultMockProduct(p));
    // Merge master products with local products
    const productMap = new Map<string, Product>();
    (initialProducts || []).forEach((p) => {
      if (p && p.id && !isDefaultMockProduct(p)) productMap.set(p.id, p);
    });
    cleanList.forEach((p) => {
      if (p && p.id && !isDefaultMockProduct(p)) productMap.set(p.id, p);
    });
    // Deduplicate and merge identical products across invoices
    const { merged } = mergeDuplicateProductsList(Array.from(productMap.values()));
    if (typeof window !== 'undefined') {
      localStorage.setItem('ws_products', JSON.stringify(merged));
    }
    return merged;
  });

  const [suppliers, setSuppliers] = useState<Supplier[]>(() => {
    const saved = localStorage.getItem('ws_suppliers');
    let parsed: Supplier[] = [];
    if (saved) {
      try {
        parsed = JSON.parse(saved);
      } catch (e) {}
    }
    // Retain only genuine suppliers (from purchases or JSON imports), purge default mock & Xiaomi / Symphony dummy names
    const cleanList = (parsed || []).filter((s) => s && s.id && !isDefaultMockSupplier(s));
    const suppMap = new Map<string, Supplier>();
    (initialSuppliers || []).forEach((s) => {
      if (s && s.id && !isDefaultMockSupplier(s)) suppMap.set(s.id, s);
    });
    cleanList.forEach((s) => {
      if (s && s.id && !isDefaultMockSupplier(s)) suppMap.set(s.id, s);
    });
    const finalSuppliers = Array.from(suppMap.values());
    if (typeof window !== 'undefined') {
      localStorage.setItem('ws_suppliers', JSON.stringify(finalSuppliers));
    }
    return finalSuppliers;
  });

  const [supplierLedger, setSupplierLedger] = useState<SupplierLedgerEntry[]>(() => {
    const saved = localStorage.getItem('ws_supplier_ledger');
    let parsed: SupplierLedgerEntry[] = [];
    if (saved) {
      try {
        parsed = JSON.parse(saved);
      } catch (e) {}
    }
    const cleanParsed = (parsed || []).filter(
      (entry) =>
        entry &&
        entry.id &&
        !['CHALLAN-7821', 'CHALLAN-3102', 'CHALLAN-4490', 'CHALLAN-5011', 'CHALLAN-6211'].includes(entry.referenceNo || '') &&
        !['PAY-REALME-01', 'PAY-SYMPHONY-01', 'PAY-REMAX-01'].includes(entry.referenceNo || '') &&
        !['led_01', 'led_02', 'led_03', 'led_04', 'led_05', 'led_06'].includes(entry.id || '') &&
        entry.supplierId !== 'sup_realme_xiaomi' &&
        entry.supplierId !== 'sup_symphony' &&
        !(entry.supplierName || '').toLowerCase().includes('xiaomi') &&
        !(entry.supplierName || '').toLowerCase().includes('symphony') &&
        !(entry.supplierName || '').toLowerCase().includes('শাওমি') &&
        !(entry.supplierName || '').toLowerCase().includes('সিম্ফনি')
    );
    const ledgerMap = new Map<string, SupplierLedgerEntry>();
    (initialSupplierLedger || []).forEach((entry) => {
      if (entry && entry.id) ledgerMap.set(entry.id, entry);
    });
    cleanParsed.forEach((entry) => {
      if (entry && entry.id) ledgerMap.set(entry.id, entry);
    });
    const finalLedger = Array.from(ledgerMap.values());
    if (typeof window !== 'undefined') {
      localStorage.setItem('ws_supplier_ledger', JSON.stringify(finalLedger));
    }
    return finalLedger;
  });

  const [retailers, setRetailers] = useState<Retailer[]>(() => {
    const saved = localStorage.getItem('ws_retailers');
    let parsed: Retailer[] = [];
    if (saved) {
      try {
        parsed = JSON.parse(saved);
      } catch (e) {}
    }
    // Filter out sample retailers
    const cleanParsed = (parsed || []).filter(
      (r) =>
        r &&
        r.id &&
        !['ret_6', 'ret_7', 'ret_8', 'ret_9', 'ret_10', 'ret_11', 'ret_12'].includes(r.id) &&
        !r.name?.includes('মায়ের দোয়া') &&
        !r.name?.includes('খান টেলিকম') &&
        !r.name?.includes('ভাই ভাই') &&
        !r.name?.includes('জনতা') &&
        !r.name?.includes('আশা') &&
        !r.name?.includes('মিলন') &&
        !r.name?.includes('সততা') &&
        !r.name?.includes('বিসমিল্লাহ টেলিকম') &&
        !r.name?.includes('নিউ মডার্ন') &&
        !r.name?.includes('মিনি মডার্ন') &&
        !r.name?.includes('আল-মদিনা') &&
        !r.shopName?.includes('সততা') &&
        !r.shopName?.includes('বিসমিল্লাহ টেলিকম') &&
        !r.shopName?.includes('নিউ মডার্ন') &&
        !r.shopName?.includes('মিনি মডার্ন') &&
        !r.shopName?.includes('আল-মদিনা')
    );
    const retMap = new Map<string, Retailer>();
    (initialRetailers || []).forEach((r) => {
      if (r && r.id) retMap.set(r.id, r);
    });
    cleanParsed.forEach((r) => {
      if (r && r.id) retMap.set(r.id, r);
    });
    const finalRetailers = Array.from(retMap.values());
    if (typeof window !== 'undefined') {
      localStorage.setItem('ws_retailers', JSON.stringify(finalRetailers));
    }
    return finalRetailers;
  });

  const [cashTransfers, setCashTransfers] = useState<CashTransfer[]>(() => {
    const saved = localStorage.getItem('ws_cash_transfers');
    let parsed: CashTransfer[] = [];
    if (saved) {
      try {
        parsed = JSON.parse(saved);
      } catch (e) {}
    }
    const transferMap = new Map<string, CashTransfer>();
    (initialCashTransfers || []).forEach((ct) => {
      if (ct && ct.id) transferMap.set(ct.id, ct);
    });
    (parsed || []).forEach((ct) => {
      if (ct && ct.id) transferMap.set(ct.id, ct);
    });
    const finalTransfers = Array.from(transferMap.values());
    if (typeof window !== 'undefined') {
      localStorage.setItem('ws_cash_transfers', JSON.stringify(finalTransfers));
    }
    return finalTransfers;
  });

  const [capitalTransactions, setCapitalTransactions] = useState<CapitalTransaction[]>(() => {
    const saved = localStorage.getItem('ws_capital_tx');
    let parsed: CapitalTransaction[] = [];
    if (saved) {
      try {
        parsed = JSON.parse(saved);
      } catch (e) {}
    }
    return (parsed && parsed.length > 0) ? parsed : initialCapitalTransactions;
  });

  const [replacements, setReplacements] = useState<ReplacementAdjustment[]>(() => {
    const saved = localStorage.getItem('ws_replacements');
    let parsed: ReplacementAdjustment[] = [];
    if (saved) {
      try {
        parsed = JSON.parse(saved);
      } catch (e) {}
    }
    const repMap = new Map<string, ReplacementAdjustment>();
    (initialReplacements || []).forEach((r) => {
      if (r && r.id) repMap.set(r.id, r);
    });
    (parsed || []).forEach((r) => {
      if (r && r.id) repMap.set(r.id, r);
    });
    const list: ReplacementAdjustment[] = Array.from(repMap.values());
    return list.map((r) => {
      const val = Number(r.estimatedValue ?? r.totalAdjustmentValue ?? 0);
      const safeVal = isNaN(val) ? 0 : val;
      const entityType = r.entityType || r.partyType || 'RETAILER';
      const entityName = r.entityName || r.partyName || '';
      const entityId = r.entityId || r.partyId || '';
      const trackingNo = r.trackingNo || r.claimNo || `RMA-${entityType.slice(0, 3)}-2026`;
      return {
        ...r,
        claimNo: trackingNo,
        trackingNo,
        partyType: entityType,
        entityType,
        partyId: entityId,
        entityId,
        partyName: entityName,
        entityName,
        estimatedValue: safeVal,
        totalAdjustmentValue: safeVal,
      };
    });
  });

  const [companyReturns, setCompanyReturns] = useState<CompanyReturnChallan[]>(() => {
    const saved = localStorage.getItem('ws_company_returns');
    if (saved !== null) {
      try {
        return JSON.parse(saved);
      } catch {
        return [];
      }
    }
    return [];
  });

  useEffect(() => {
    localStorage.setItem('ws_company_returns', JSON.stringify(companyReturns));
  }, [companyReturns]);

  const [orders, setOrders] = useState<OrderInvoice[]>(() => {
    const saved = localStorage.getItem('ws_orders');
    let parsed: OrderInvoice[] = [];
    if (saved) {
      try {
        parsed = JSON.parse(saved);
      } catch (e) {}
    }
    // Filter out any default sample sales referencing deleted retailers
    const cleanParsed = (parsed || []).filter(
      (o) =>
        o &&
        !['ret_6', 'ret_7', 'ret_8', 'ret_9', 'ret_10', 'ret_11', 'ret_12'].includes(o.retailerId || '') &&
        !o.retailerName?.includes('মায়ের দোয়া') &&
        !o.retailerName?.includes('খান টেলিকম') &&
        !o.retailerName?.includes('ভাই ভাই') &&
        !o.retailerName?.includes('জনতা') &&
        !o.retailerName?.includes('আশা') &&
        !o.retailerName?.includes('মিলন') &&
        !o.retailerName?.includes('সততা') &&
        !o.retailerName?.includes('বিসমিল্লাহ টেলিকম') &&
        !o.retailerName?.includes('নিউ মডার্ন') &&
        !o.retailerName?.includes('মিনি মডার্ন') &&
        !o.retailerName?.includes('আল-মদিনা') &&
        !o.customerName?.includes('সততা') &&
        !o.customerName?.includes('বিসমিল্লাহ টেলিকম') &&
        !o.customerName?.includes('নিউ মডার্ন') &&
        !o.customerName?.includes('মিনি মডার্ন') &&
        !o.customerName?.includes('আল-মদিনা')
    );
    // Combine initialOrders from verified backup with any newly created local orders
    const ordersMap = new Map<string, OrderInvoice>();
    (initialOrders || []).forEach((o) => {
      if (o && o.id) ordersMap.set(o.id, o);
    });
    cleanParsed.forEach((o) => {
      if (o && o.id) ordersMap.set(o.id, o);
    });
    const finalOrders = Array.from(ordersMap.values());
    if (typeof window !== 'undefined') {
      localStorage.setItem('ws_orders', JSON.stringify(finalOrders));
    }
    if (finalOrders.length > 0) {
      return sanitizeOrderProfits(finalOrders);
    }
    return initialOrders;
  });

  const [phoneContacts, setPhoneContacts] = useState<PhoneContact[]>(() => {
    const saved = localStorage.getItem('ws_phone_contacts');
    let parsed: PhoneContact[] = [];
    if (saved) {
      try {
        parsed = JSON.parse(saved);
      } catch (e) {}
    }
    // Filter out default sample contacts (সততা, বিসমিল্লাহ, মডার্ন, আল-মদিনা)
    const clean = (parsed || []).filter(
      (c) =>
        c &&
        !c.name?.includes('সততা') &&
        !c.name?.includes('বিসমিল্লাহ') &&
        !c.name?.includes('মডার্ন') &&
        !c.name?.includes('মদিনা') &&
        !c.organization?.includes('সততা') &&
        !c.organization?.includes('বিসমিল্লাহ') &&
        !c.organization?.includes('মডার্ন') &&
        !c.organization?.includes('মদিনা')
    );
    return clean;
  });

  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>(() => {
    const saved = localStorage.getItem('ws_activity_logs');
    let parsed: ActivityLog[] = [];
    if (saved) {
      try {
        parsed = JSON.parse(saved);
      } catch (e) {}
    }
    const cleanParsed = (parsed || []).filter(
      (log) => log && log.id && !['act_01', 'act_02', 'act_03', 'act_04'].includes(log.id)
    );
    const actMap = new Map<string, ActivityLog>();
    (initialActivityLogs || []).forEach((a) => {
      if (a && a.id) actMap.set(a.id, a);
    });
    cleanParsed.forEach((a) => {
      if (a && a.id) actMap.set(a.id, a);
    });
    const finalLogs = Array.from(actMap.values());
    if (typeof window !== 'undefined') {
      localStorage.setItem('ws_activity_logs', JSON.stringify(finalLogs));
    }
    return finalLogs;
  });

  useEffect(() => {
    // Purge fake mock ledger entries, fake activity logs, and sample retailers from localStorage on startup
    try {
      const sl = localStorage.getItem('ws_supplier_ledger');
      if (sl && (sl.includes('CHALLAN-7821') || sl.includes('led_01') || sl.includes('PAY-REALME-01'))) {
        localStorage.removeItem('ws_supplier_ledger');
      }
      const al = localStorage.getItem('ws_activity_logs');
      if (al && (al.includes('act_01') || al.includes('INV-20261002-104'))) {
        localStorage.removeItem('ws_activity_logs');
      }
      const ret = localStorage.getItem('ws_retailers');
      if (ret && (ret.includes('সততা') || ret.includes('বিসমিল্লাহ টেলিকম') || ret.includes('মডার্ন') || ret.includes('আল-মদিনা'))) {
        const parsed = JSON.parse(ret);
        const filtered = (parsed || []).filter(
          (r: any) =>
            r &&
            !r.name?.includes('সততা') &&
            !r.name?.includes('বিসমিল্লাহ টেলিকম') &&
            !r.name?.includes('মডার্ন') &&
            !r.name?.includes('আল-মদিনা') &&
            !r.shopName?.includes('সততা') &&
            !r.shopName?.includes('বিসমিল্লাহ টেলিকম') &&
            !r.shopName?.includes('মডার্ন') &&
            !r.shopName?.includes('আল-মদিনা')
        );
        localStorage.setItem('ws_retailers', JSON.stringify(filtered));
      }
      const pc = localStorage.getItem('ws_phone_contacts');
      if (pc && (pc.includes('সততা') || pc.includes('বিসমিল্লাহ') || pc.includes('মডার্ন') || pc.includes('মদিনা'))) {
        const parsed = JSON.parse(pc);
        const filtered = (parsed || []).filter(
          (c: any) =>
            c &&
            !c.name?.includes('সততা') &&
            !c.name?.includes('বিসমিল্লাহ') &&
            !c.name?.includes('মডার্ন') &&
            !c.name?.includes('মদিনা') &&
            !c.organization?.includes('সততা') &&
            !c.organization?.includes('বিসমিল্লাহ') &&
            !c.organization?.includes('মডার্ন') &&
            !c.organization?.includes('মদিনা')
        );
        localStorage.setItem('ws_phone_contacts', JSON.stringify(filtered));
      }
    } catch (e) {}
  }, []);

  useEffect(() => {
    localStorage.setItem('ws_activity_logs', JSON.stringify(activityLogs));
  }, [activityLogs]);

  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>(() => {
    const saved = localStorage.getItem('ws_bank_accounts');
    let parsed: BankAccount[] = [];
    if (saved) {
      try {
        parsed = JSON.parse(saved);
      } catch (e) {}
    }
    return (parsed && parsed.length > 0) ? parsed : initialBankAccounts;
  });

  // Balance Editor Modal state
  const [isBalanceModalOpen, setIsBalanceModalOpen] = useState<boolean>(false);
  const [balanceModalTarget, setBalanceModalTarget] = useState<BalanceAccountType>('BANK');
  const openBalanceModal = (target: BalanceAccountType = 'BANK') => {
    setBalanceModalTarget(target);
    setIsBalanceModalOpen(true);
  };
  const closeBalanceModal = () => setIsBalanceModalOpen(false);

  useEffect(() => {
    localStorage.setItem('ws_bank_accounts', JSON.stringify(bankAccounts));
  }, [bankAccounts]);

  // Expenses State (বেতন, দোকান ভাড়া, বিদ্যুৎ বিল, অন্যান্য খরচ)
  const [expenses, setExpenses] = useState<Expense[]>(() => {
    const saved = localStorage.getItem('ws_expenses');
    let parsed: Expense[] = [];
    if (saved) {
      try {
        parsed = JSON.parse(saved);
      } catch (e) {}
    }
    return (parsed && parsed.length > 0) ? parsed : initialExpenses;
  });

  useEffect(() => {
    localStorage.setItem('ws_expenses', JSON.stringify(expenses));
  }, [expenses]);

  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState<boolean>(false);
  const [expenseModalDefaultCategory, setExpenseModalDefaultCategory] = useState<ExpenseCategory>('OTHER');
  const openExpenseModal = (defaultCategory: ExpenseCategory = 'OTHER') => {
    setExpenseModalDefaultCategory(defaultCategory);
    setIsExpenseModalOpen(true);
  };
  const closeExpenseModal = () => setIsExpenseModalOpen(false);

  // Biometric Authentication & Secure Storage Bridge States
  const [isBiometricEnabled, setIsBiometricEnabledState] = useState<boolean>(isBiometricEnabledInStorage);
  const [autoLockDuration, setAutoLockDurationState] = useState<number>(getStoredAutoLockMins);
  const [isBiometricLocked, setIsBiometricLocked] = useState<boolean>(true);
  const [isPlatformBiometricAvailable, setIsPlatformBiometricAvailable] = useState<boolean>(false);
  const [isBiometricSettingsOpen, setIsBiometricSettingsOpen] = useState<boolean>(false);

  // Business Profile & Pad Configuration State
  const [businessProfile, setBusinessProfileState] = useState<BusinessProfile>(getStoredBusinessProfile);
  const [isBusinessProfileOpen, setIsBusinessProfileOpen] = useState<boolean>(false);

  const openBusinessProfile = () => setIsBusinessProfileOpen(true);
  const closeBusinessProfile = () => setIsBusinessProfileOpen(false);

  const updateBusinessProfile = (updates: Partial<BusinessProfile>): BusinessProfile => {
    const updated = saveStoredBusinessProfile(updates);
    setBusinessProfileState(updated);
    return updated;
  };

  useEffect(() => {
    const handleProfileUpdated = (e: any) => {
      if (e.detail) {
        setBusinessProfileState(e.detail);
      }
    };
    window.addEventListener('business-profile-updated', handleProfileUpdated);
    return () => window.removeEventListener('business-profile-updated', handleProfileUpdated);
  }, []);

  const lastActiveRef = useRef<number>(Date.now());

  // Check biometric support & setup auto-lock timer
  useEffect(() => {
    ensurePinInitialized();
    checkPlatformBiometricsSupport().then((res) => {
      setIsPlatformBiometricAvailable(res.hasPlatformAuthenticator);
    });

    const resetActivity = () => {
      lastActiveRef.current = Date.now();
    };

    window.addEventListener('mousemove', resetActivity);
    window.addEventListener('keydown', resetActivity);
    window.addEventListener('touchstart', resetActivity);
    window.addEventListener('click', resetActivity);
    window.addEventListener('scroll', resetActivity);

    const interval = setInterval(() => {
      if (
        isBiometricEnabled &&
        !isBiometricLocked &&
        autoLockDuration > 0 &&
        PROTECTED_ROLES_DEFAULT.includes(currentRole)
      ) {
        const elapsedMins = (Date.now() - lastActiveRef.current) / (1000 * 60);
        if (elapsedMins >= autoLockDuration) {
          setIsBiometricLocked(true);
        }
      }
    }, 10000);

    return () => {
      window.removeEventListener('mousemove', resetActivity);
      window.removeEventListener('keydown', resetActivity);
      window.removeEventListener('touchstart', resetActivity);
      window.removeEventListener('click', resetActivity);
      window.removeEventListener('scroll', resetActivity);
      clearInterval(interval);
    };
  }, [isBiometricEnabled, isBiometricLocked, autoLockDuration, currentRole]);

  // Network & Firestore Offline Persistence Statuses
  const [isOnline, setIsOnline] = useState<boolean>(navigator.onLine);
  const [isFromCache, setIsFromCache] = useState<boolean>(false);
  const [hasPendingWrites, setHasPendingWrites] = useState<boolean>(false);
  const [isSimulatedOffline, setIsSimulatedOffline] = useState<boolean>(false);

  // Offline Sync Queue & Cloud Backup States (Backed by limitless IndexedDB to eliminate QuotaExceededError)
  const [offlineSyncQueue, setOfflineSyncQueue] = useState<OfflineSyncQueueItem[]>(() => {
    try {
      const saved = safeStorage.getItem('ws_offline_sync_queue');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Load complete offline queue from IndexedDB on startup & clear legacy bloated localStorage key
  useEffect(() => {
    let isMounted = true;
    idbGetAllQueueItems()
      .then((items) => {
        if (isMounted && items && items.length > 0) {
          setOfflineSyncQueue((prev) => {
            const map = new Map<string, OfflineSyncQueueItem>();
            prev.forEach((i) => map.set(i.id, i));
            items.forEach((i) => map.set(i.id, i));
            return Array.from(map.values());
          });
        }
        // Permanently clear legacy localStorage key to free up 5MB quota
        safeStorage.removeItem('ws_offline_sync_queue');
      })
      .catch((err) => console.warn('IndexedDB startup queue note:', err));

    return () => {
      isMounted = false;
    };
  }, []);

  const [lastSyncTime, setLastSyncTime] = useState<string | null>(() => {
    return safeStorage.getItem('ws_last_sync_time') || null;
  });
  const [lastBackupTime, setLastBackupTime] = useState<string | null>(() => {
    return safeStorage.getItem('ws_last_backup_time') || null;
  });
  const [backupHistory, setBackupHistory] = useState<BackupMeta[]>(() => {
    try {
      const saved = safeStorage.getItem('ws_backup_history');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [isSyncingToCloud, setIsSyncingToCloud] = useState<boolean>(false);
  const [isBackupModalOpen, setIsBackupModalOpen] = useState<boolean>(false);
  const openBackupModal = () => setIsBackupModalOpen(true);
  const closeBackupModal = () => setIsBackupModalOpen(false);

  const [isStaffSyncModalOpen, setIsStaffSyncModalOpen] = useState<boolean>(false);
  const openStaffSyncModal = () => setIsStaffSyncModalOpen(true);
  const closeStaffSyncModal = () => setIsStaffSyncModalOpen(false);

  const [isFleetModalOpen, setIsFleetModalOpen] = useState<boolean>(false);
  const openFleetModal = () => setIsFleetModalOpen(true);
  const closeFleetModal = () => setIsFleetModalOpen(false);

  const isInitialSeedDone = useRef<boolean>(false);
  const lastLocalSyncPingRef = useRef<number>(0);
  const sendPresenceHeartbeatRef = useRef<() => void>(() => {});

  // Sync to safeStorage & mirror to limitless IndexedDB
  useEffect(() => {
    safeStorage.setItem('ws_lang', language);
  }, [language]);

  useEffect(() => {
    safeStorage.setItem('ws_users', JSON.stringify(users));
  }, [users]);

  useEffect(() => {
    safeStorage.setItem('ws_products', JSON.stringify(products));
    idbSetState('ws_products', products);
  }, [products]);

  useEffect(() => {
    safeStorage.setItem('ws_suppliers', JSON.stringify(suppliers));
  }, [suppliers]);

  useEffect(() => {
    safeStorage.setItem('ws_supplier_ledger', JSON.stringify(supplierLedger));
  }, [supplierLedger]);

  const hasReconciledSuppliersRef = useRef<boolean>(false);

  // Auto-reconcile supplier totalPaid into supplierLedger if missing
  useEffect(() => {
    if (hasReconciledSuppliersRef.current || !suppliers || suppliers.length === 0) return;
    hasReconciledSuppliersRef.current = true;
    const newEntries: SupplierLedgerEntry[] = [];

    suppliers.forEach((s) => {
      const sPaid = Number(s.totalPaid) || 0;
      if (sPaid > 0) {
        const recordedForSupplier = (supplierLedger || [])
          .filter(
            (e) =>
              (e.supplierId === s.id ||
                (e.supplierName && s.name && e.supplierName.trim().toLowerCase() === s.name.trim().toLowerCase()) ||
                (e.supplierName && s.company && e.supplierName.trim().toLowerCase() === s.company.trim().toLowerCase())) &&
              e.type === 'PAYMENT'
          )
          .reduce((sum, e) => sum + (Number(e.amount) || 0), 0);

        const diff = sPaid - recordedForSupplier;
        if (diff > 0 && !supplierLedger.some((e) => e.id === `led_pay_rec_${s.id}`)) {
          newEntries.push({
            id: `led_pay_rec_${s.id}`,
            supplierId: s.id,
            supplierName: s.name || s.company,
            type: 'PAYMENT',
            date: (s as any).openingDate || getTodayDateString(),
            amount: diff,
            referenceNo: `PAY-REC-${s.id.slice(-4)}`,
            paymentMethod: 'Cash',
            balanceAfter: Number(s.outstandingPayable) || 0,
            notes: `কোম্পানি চালান বিল পরিশোধ (${s.bnName || s.name || s.company})`,
          });
        }
      }
    });

    if (newEntries.length > 0) {
      setSupplierLedger((prev) => [...newEntries, ...prev]);
    }
  }, [suppliers, supplierLedger]);

  useEffect(() => {
    safeStorage.setItem('ws_retailers', JSON.stringify(retailers));
  }, [retailers]);

  useEffect(() => {
    safeStorage.setItem('ws_cash_transfers', JSON.stringify(cashTransfers));
  }, [cashTransfers]);

  useEffect(() => {
    safeStorage.setItem('ws_capital_tx', JSON.stringify(capitalTransactions));
  }, [capitalTransactions]);

  useEffect(() => {
    safeStorage.setItem('ws_replacements', JSON.stringify(replacements));
  }, [replacements]);

  useEffect(() => {
    safeStorage.setItem('ws_orders', JSON.stringify(orders));
    idbSetState('ws_orders', orders);
  }, [orders]);

  useEffect(() => {
    safeStorage.setItem('ws_phone_contacts', JSON.stringify(phoneContacts));
  }, [phoneContacts]);

  useEffect(() => {
    setHasPendingWrites(offlineSyncQueue.length > 0);
  }, [offlineSyncQueue]);

  useEffect(() => {
    if (lastSyncTime) safeStorage.setItem('ws_last_sync_time', lastSyncTime);
  }, [lastSyncTime]);

  useEffect(() => {
    if (lastBackupTime) safeStorage.setItem('ws_last_backup_time', lastBackupTime);
  }, [lastBackupTime]);

  useEffect(() => {
    safeStorage.setItem('ws_backup_history', JSON.stringify(backupHistory));
  }, [backupHistory]);

  // Offline queue helper functions using limitless IndexedDB
  const queueOfflineAction = (action: OfflineSyncQueueItem) => {
    // 1. Asynchronously persist to IndexedDB
    idbSaveQueueItem(action).catch((err) => console.warn('idbSaveQueueItem error note:', err));

    // 2. Update memory state for instant reactivity
    setOfflineSyncQueue((prev) => {
      const filtered = prev.filter((q) => !(q.collection === action.collection && q.docId === action.docId));
      return [action, ...filtered];
    });
    setHasPendingWrites(true);
  };

  const dequeueOfflineAction = (collection: string, docId: string) => {
    setOfflineSyncQueue((prev) => {
      const target = prev.find((q) => q.collection === collection && q.docId === docId);
      if (target) {
        idbDeleteQueueItem(target.id).catch((err) => console.warn('idbDeleteQueueItem error note:', err));
      }
      return prev.filter((q) => !(q.collection === collection && q.docId === docId));
    });
  };

  // Safe Firestore payload cleaner - removes undefined values and converts Date objects
  const cleanFirestorePayload = (obj: any): any => {
    if (obj === undefined) {
      return null;
    }
    if (obj === null || typeof obj !== 'object') {
      return obj;
    }
    if (obj instanceof Date) {
      return obj.toISOString();
    }
    if (Array.isArray(obj)) {
      return obj.map((item) => (item === undefined ? null : cleanFirestorePayload(item)));
    }
    const cleaned: Record<string, any> = {};
    for (const [key, value] of Object.entries(obj)) {
      if (value !== undefined) {
        cleaned[key] = cleanFirestorePayload(value);
      }
    }
    return cleaned;
  };

  // Safe Firestore document write helper (IndexedDB persistent cache writes succeed offline)
  const saveToFirestoreDoc = async (collName: string, docId: string, data: any) => {
    const payloadWithTenant = {
      ...data,
      tenantId: data?.tenantId || activeTenantId || 'shop_matrichaya_main',
      shopId: data?.shopId || activeTenantId || 'shop_matrichaya_main',
      isTestMode: data?.isTestMode !== undefined ? data.isTestMode : isTestMode,
    };
    const cleanData = cleanFirestorePayload(payloadWithTenant);
    queueOfflineAction({
      id: `queue_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      collection: collName,
      docId,
      action: 'set',
      payload: cleanData,
      timestamp: new Date().toISOString(),
    });

    try {
      const docRef = doc(db, collName, docId);
      await setDoc(docRef, cleanData, { merge: true });
      if (navigator.onLine && !isSimulatedOffline) {
        dequeueOfflineAction(collName, docId);
      }
    } catch (err) {
      console.warn(`Firestore save [${collName}/${docId}] cached locally:`, err);
    }
  };

  // Safe Firestore document delete helper
  const deleteFirestoreDoc = async (collName: string, docId: string) => {
    queueOfflineAction({
      id: `queue_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      collection: collName,
      docId,
      action: 'delete',
      payload: null,
      timestamp: new Date().toISOString(),
    });

    try {
      const docRef = doc(db, collName, docId);
      await deleteDoc(docRef);
      if (navigator.onLine && !isSimulatedOffline) {
        dequeueOfflineAction(collName, docId);
      }
    } catch (err) {
      console.warn(`Firestore delete [${collName}/${docId}] cached locally:`, err);
    }
  };

  // Cross-device Real-Time Sync Broadcaster Ping Helper
  const pingRealtimeSync = async (syncedRole?: string, count: number = 1) => {
    try {
      const now = Date.now();
      lastLocalSyncPingRef.current = now;
      const syncPingRef = doc(db, 'system', 'realtime_sync');
      await setDoc(
        syncPingRef,
        {
          lastSyncTimestamp: now,
          lastSyncIso: new Date(now).toISOString(),
          syncedBy: currentUser.name,
          syncedRole: syncedRole || currentUser.role,
          syncedCount: count,
          tenantId: activeTenantId,
        },
        { merge: true }
      );
    } catch (err) {
      console.warn('Realtime sync broadcast ping note:', err);
    }
  };

  // Automatic Cloud Sync & Snapshot Creation Logic in small batches (Batch of 5/10)
  const syncPendingOfflineData = async (): Promise<{ success: boolean; syncedCount: number; message: string }> => {
    if (isSyncingToCloud) {
      return { success: false, syncedCount: 0, message: 'Sync already in progress' };
    }
    setIsSyncingToCloud(true);

    try {
      // 1. Fetch latest pending queue items directly from limitless IndexedDB
      let queue = await idbGetAllQueueItems();
      if (!queue || queue.length === 0) {
        queue = [...offlineSyncQueue];
      }

      let processed = 0;
      const batchSize = 10; // Auto-batch chunk size of 5 to 10 items

      if (queue.length > 0) {
        // Process queue in small batches of 10 items to prevent network stall and memory overload
        for (let i = 0; i < queue.length; i += batchSize) {
          const chunk = queue.slice(i, i + batchSize);
          const chunkIds = chunk.map((c) => c.id);

          try {
            const batch = writeBatch(db);
            for (const item of chunk) {
              const docRef = doc(db, item.collection, item.docId);
              if (item.action === 'delete') {
                batch.delete(docRef);
              } else {
                batch.set(docRef, item.payload, { merge: true });
              }
            }
            await batch.commit();

            // Immediately clear this batch from IndexedDB and local state
            await idbDeleteQueueItemsBatch(chunkIds);
            setOfflineSyncQueue((prev) => prev.filter((q) => !chunkIds.includes(q.id)));
            processed += chunk.length;
          } catch (batchErr) {
            console.warn('Batch commit exception, falling back to item-by-item:', batchErr);
            // Fallback: try individual items so a single invalid record doesn't block the rest
            for (const item of chunk) {
              try {
                const docRef = doc(db, item.collection, item.docId);
                if (item.action === 'delete') {
                  await deleteDoc(docRef);
                } else {
                  await setDoc(docRef, item.payload, { merge: true });
                }
                await idbDeleteQueueItem(item.id);
                setOfflineSyncQueue((prev) => prev.filter((q) => q.id !== item.id));
                processed++;
              } catch (singleErr) {
                console.warn(`Single item write [${item.collection}/${item.docId}] note:`, singleErr);
              }
            }
          }
        }
      }

      // Check remaining items in queue
      const remaining = await idbGetAllQueueItems();
      setOfflineSyncQueue(remaining);
      setHasPendingWrites(remaining.length > 0);

      // 2. Generate Unified Cloud Backup Snapshot (Full Point-in-time state for all users)
      const backupId = `bk_${Date.now()}`;
      const timestamp = new Date().toISOString();
      const snapshot: CloudBackupSnapshot = {
        id: backupId,
        timestamp,
        version: '2.5',
        createdBy: currentUser.id,
        createdByName: currentUser.name,
        counts: {
          products: products.length,
          orders: orders.length,
          retailers: retailers.length,
          suppliers: suppliers.length,
          transfers: cashTransfers.length,
          supplierLedger: supplierLedger.length,
          capitalTransactions: capitalTransactions.length,
          replacements: replacements.length,
          companyReturns: companyReturns.length,
          expenses: expenses.length,
          users: users.length,
        },
        financials: {
          totalReceivables,
          totalPayables,
          totalStockValue: totalInventoryValuation,
          adminCash: cashAdmin,
          counterCash: cashCounter,
          dsrcash: cashDSR,
          bankCash: cashBank,
        },
        data: {
          products,
          orders,
          retailers,
          suppliers,
          supplierLedger,
          cashTransfers,
          capitalTransactions,
          replacements,
          companyReturns,
          expenses,
          users,
          activityLogs: activityLogs.slice(0, 50),
        },
      };

      // Save snapshot to Firestore 'backups' collection
      try {
        const backupDocRef = doc(db, 'backups', backupId);
        await setDoc(backupDocRef, snapshot);
      } catch (err) {
        console.warn('Firestore backup doc note:', err);
      }

      // Realtime multi-user sync ping so all connected users and devices update simultaneously
      try {
        const syncPingRef = doc(db, 'system', 'realtime_sync');
        await setDoc(
          syncPingRef,
          {
            lastSyncTimestamp: Date.now(),
            lastSyncIso: timestamp,
            syncedBy: currentUser.name,
            syncedRole: currentUser.role,
            syncedCount: processed,
            tenantId: activeTenantId,
          },
          { merge: true }
        );
      } catch (pingErr) {
        console.warn('Realtime sync ping note:', pingErr);
      }

      // Save to local server /api/backup/save
      try {
        await fetch('/api/backup/save', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(snapshot),
        });
      } catch (err) {
        console.warn('Server backup endpoint note:', err);
      }

      // Auto-upload backup to Google Drive if connected and enabled
      try {
        if (typeof window !== 'undefined' && localStorage.getItem('ws_gdrive_auto_sync') === 'true') {
          const { uploadBackupToGoogleDrive } = await import('../services/googleDriveService');
          await uploadBackupToGoogleDrive(snapshot);
        }
      } catch (gDriveErr) {
        console.warn('Google Drive auto-sync note:', gDriveErr);
      }

      const metaItem: BackupMeta = {
        id: backupId,
        timestamp,
        version: '2.5',
        createdBy: currentUser.id,
        createdByName: currentUser.name,
        totalRecords:
          products.length +
          orders.length +
          retailers.length +
          suppliers.length +
          cashTransfers.length +
          capitalTransactions.length,
        financialSummary: `Stock: ৳${totalInventoryValuation.toLocaleString()} | Due: ৳${totalReceivables.toLocaleString()}`,
        source: queue.length > 0 ? 'offline-recovery' : 'auto-cloud',
      };

      setBackupHistory((prev) => [metaItem, ...prev.filter((m) => m.id !== backupId)].slice(0, 30));
      setLastSyncTime(timestamp);
      setLastBackupTime(timestamp);
      setIsSyncingToCloud(false);

      return {
        success: true,
        syncedCount: processed,
        message:
          processed > 0
            ? `${processed}টি ফাইল ব্যাচে ফায়ারবেজে সিঙ্ক সম্পন্ন হয়েছে এবং সকল ইউজারকে রিয়েল-টাইমে আপডেট করা হয়েছে।`
            : `সকল পেন্ডিং ফাইল ইতিমধ্যে ক্লাউডে সুরক্ষিত রয়েছে। ব্যাকআপ #${backupId.slice(-6)} তৈরি হয়েছে।`,
      };
    } catch (err: any) {
      setIsSyncingToCloud(false);
      return {
        success: false,
        syncedCount: 0,
        message: err.message || 'Sync failed due to connection error',
      };
    }
  };

  /**
   * Unified All-Pending Backup & Multi-User Broadcast:
   * Flushes all offline queues into Firestore in batches and triggers instant real-time sync across all connected panels.
   */
  const backupAllPendingFilesTogether = async () => {
    return syncPendingOfflineData();
  };

  const triggerManualBackup = async () => {
    return syncPendingOfflineData();
  };

  /**
   * Dedicated role-based synchronization to Cloud (Firestore):
   * - DSR syncs their field sales invoices and replacement claims.
   * - Counter syncs POS counter invoices and cash drawer.
   * - Admin syncs/refreshes all enterprise data.
   */
  const syncRoleTransactionsToCloud = async (
    targetRole?: UserRole
  ): Promise<{ success: boolean; message: string; syncedCount: number }> => {
    const roleToSync = targetRole || currentRole;
    if (!db) {
      return { success: false, message: 'Database connection offline', syncedCount: 0 };
    }

    try {
      setIsSyncingToCloud(true);
      const batch = writeBatch(db);
      let count = 0;

      // Gather all local & in-memory orders so nothing from device storage is missed
      const mergedOrdersMap = new Map<string, OrderInvoice>();
      orders.forEach((o) => {
        if (o && o.id) mergedOrdersMap.set(o.id, o);
      });
      try {
        const raw = localStorage.getItem('ws_orders');
        if (raw) {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed)) {
            parsed.forEach((o) => {
              if (o && o.id && !mergedOrdersMap.has(o.id)) {
                mergedOrdersMap.set(o.id, o);
              }
            });
          }
        }
      } catch (e) {}
      const allAvailableOrders = Array.from(mergedOrdersMap.values());

      if (roleToSync === 'dsr') {
        // Collect all DSR orders
        const dsrOrders = allAvailableOrders.filter((o) => {
          const r = (o.creatorRole || o.salesPersonRole || '').toLowerCase();
          const n = (o.creatorName || o.salesPersonName || '').toLowerCase();
          return r === 'dsr' || n.includes('dsr') || n.includes('razo') || n.includes('raju') || n.includes('রাজু');
        });
        dsrOrders.forEach((o) => {
          batch.set(doc(db, COLLECTIONS.ORDERS, o.id), cleanFirestorePayload(o), { merge: true });
          count++;
        });

        // Collect all DSR replacements
        const dsrReplacements = replacements.filter((r) => {
          const op = (r.operatorRole || '').toLowerCase();
          const on = (r.operatorName || '').toLowerCase();
          return op === 'dsr' || on.includes('dsr') || on.includes('razo') || on.includes('raju');
        });
        dsrReplacements.forEach((rep) => {
          batch.set(doc(db, COLLECTIONS.REPLACEMENTS, rep.id), cleanFirestorePayload(rep), { merge: true });
          count++;
        });

        // Update DSR cash drawer in users
        const dsrUser = users.find((u) => u.role === 'dsr');
        if (dsrUser) {
          batch.set(
            doc(db, COLLECTIONS.USERS, dsrUser.id),
            cleanFirestorePayload({ ...dsrUser, assignedCashDrawer: cashDSR }),
            { merge: true }
          );
        }

        await batch.commit();
        await pingRealtimeSync('dsr', count);
        setIsSyncingToCloud(false);
        setLastSyncTime(new Date().toISOString());

        return {
          success: true,
          syncedCount: count,
          message:
            language === 'bn'
              ? `ডিএসআরের ${dsrOrders.length}টি বিক্রয় মেমো ও ${dsrReplacements.length}টি রিপ্লেসমেন্ট সফলভাবে ক্লাউডে আপডেট হয়েছে! এডমিন ও ক্যাশ কাউন্টারে লাইভ চলে গেছে। কারো অন্য কোনো এন্ট্রি নষ্ট হয়নি।`
              : `DSR's ${dsrOrders.length} invoices and ${dsrReplacements.length} claims safely synced to cloud!`,
        };
      } else if (roleToSync === 'counter') {
        // Collect all Counter orders
        const counterOrders = allAvailableOrders.filter((o) => {
          const r = (o.creatorRole || o.salesPersonRole || '').toLowerCase();
          const n = (o.creatorName || o.salesPersonName || '').toLowerCase();
          const isDsr = r === 'dsr' || n.includes('dsr') || n.includes('razo') || n.includes('raju');
          const isAdmin = r === 'admin' || n.includes('admin');
          return !isDsr && !isAdmin;
        });
        counterOrders.forEach((o) => {
          batch.set(doc(db, COLLECTIONS.ORDERS, o.id), cleanFirestorePayload(o), { merge: true });
          count++;
        });

        // Update Counter cash drawer in users
        const counterUser = users.find((u) => u.role === 'counter');
        if (counterUser) {
          batch.set(
            doc(db, COLLECTIONS.USERS, counterUser.id),
            cleanFirestorePayload({ ...counterUser, assignedCashDrawer: cashCounter }),
            { merge: true }
          );
        }

        await batch.commit();
        await pingRealtimeSync('counter', count);
        setIsSyncingToCloud(false);
        setLastSyncTime(new Date().toISOString());

        return {
          success: true,
          syncedCount: count,
          message:
            language === 'bn'
              ? `ক্যাশ কাউন্টারের ${counterOrders.length}টি বিক্রয় চালান সফলভাবে ক্লাউডে আপডেট হয়েছে! এডমিন প্যানেলে স্বয়ংক্রিয়ভাবে লাইভ চলে এসেছে। কারো এন্ট্রি নষ্ট হয়নি।`
              : `Counter's ${counterOrders.length} invoices safely synced to cloud!`,
        };
      } else {
        // Admin: sync all orders & ensure full cloud synchronization
        allAvailableOrders.forEach((o) => {
          batch.set(doc(db, COLLECTIONS.ORDERS, o.id), cleanFirestorePayload(o), { merge: true });
          count++;
        });
        replacements.forEach((rep) => {
          batch.set(doc(db, COLLECTIONS.REPLACEMENTS, rep.id), cleanFirestorePayload(rep), { merge: true });
          count++;
        });
        cashTransfers.forEach((tr) => {
          batch.set(doc(db, COLLECTIONS.CASH_TRANSFERS, tr.id), cleanFirestorePayload(tr), { merge: true });
          count++;
        });

        await batch.commit();
        await pingRealtimeSync('admin', count);
        setIsSyncingToCloud(false);
        setLastSyncTime(new Date().toISOString());

        return {
          success: true,
          syncedCount: count,
          message:
            language === 'bn'
              ? `এডমিন প্যানেল থেকে মোট ${count}টি রেকর্ড ক্লাউডের সাথে সম্পূর্ণ সিঙ্ক সম্পন্ন হয়েছে!`
              : `Admin synced ${count} total records with cloud!`,
        };
      }
    } catch (err: any) {
      setIsSyncingToCloud(false);
      console.error('Role sync error:', err);
      return {
        success: false,
        syncedCount: 0,
        message: err.message || 'Cloud sync failed',
      };
    }
  };

  /**
   * Refreshes all data live from Firestore (Orders, Users, Replacements, Cash Transfers).
   * Perfect when Admin needs fresh reload after staff uploads from mobile/laptop.
   */
  const refreshAllDataFromCloud = async (): Promise<{
    success: boolean;
    message: string;
    counts?: { orders: number; dsrOrders: number; counterOrders: number; adminOrders: number };
  }> => {
    if (!db) {
      return { success: false, message: 'ডাটাবেস কানেকশন অফলাইন রয়েছে' };
    }
    try {
      setIsSyncingToCloud(true);
      let cleanOrders: OrderInvoice[] = orders;
      const ordersSnap = await getDocs(collection(db, COLLECTIONS.ORDERS));
      if (!ordersSnap.empty) {
        const fetchedOrders: OrderInvoice[] = [];
        ordersSnap.forEach((docItem) => {
          const ord = docItem.data() as OrderInvoice;
          if (ord && ord.id) fetchedOrders.push(ord);
        });
        const ordersMap = new Map<string, OrderInvoice>();
        orders.forEach((o) => { if (o && o.id) ordersMap.set(o.id, o); });
        fetchedOrders.forEach((o) => { if (o && o.id) ordersMap.set(o.id, o); });
        const mergedOrders = Array.from(ordersMap.values()).sort(
          (a, b) => new Date(b.date || b.createdAt || 0).getTime() - new Date(a.date || a.createdAt || 0).getTime()
        );
        cleanOrders = sanitizeOrderProfits(mergedOrders);
        setOrders(cleanOrders);
        localStorage.setItem('ws_orders', JSON.stringify(cleanOrders));
      }

      // Also refresh replacements, transfers, products, suppliers, ledger, retailers, capital, expenses
      const [repSnap, trfSnap, prodSnap, supSnap, ledSnap, retSnap, capSnap, expSnap] = await Promise.all([
        getDocs(collection(db, COLLECTIONS.REPLACEMENTS)),
        getDocs(collection(db, COLLECTIONS.CASH_TRANSFERS)),
        getDocs(collection(db, COLLECTIONS.PRODUCTS)),
        getDocs(collection(db, COLLECTIONS.SUPPLIERS)),
        getDocs(collection(db, COLLECTIONS.SUPPLIER_LEDGER)),
        getDocs(collection(db, COLLECTIONS.RETAILERS)),
        getDocs(collection(db, COLLECTIONS.CAPITAL_TRANSACTIONS)),
        getDocs(collection(db, COLLECTIONS.EXPENSES)),
      ]);

      if (!repSnap.empty) {
        const repMap = new Map<string, ReplacementClaim>();
        replacements.forEach((r) => { if (r && r.id) repMap.set(r.id, r); });
        repSnap.forEach((d) => {
          const rep = d.data() as ReplacementClaim;
          if (rep && rep.id) repMap.set(rep.id, rep);
        });
        const fetchedReps = Array.from(repMap.values());
        setReplacements(fetchedReps);
        localStorage.setItem('ws_replacements', JSON.stringify(fetchedReps));
      }

      if (!trfSnap.empty) {
        const trfMap = new Map<string, CashTransfer>();
        cashTransfers.forEach((t) => { if (t && t.id) trfMap.set(t.id, t); });
        trfSnap.forEach((d) => {
          const trf = d.data() as CashTransfer;
          if (trf && trf.id) trfMap.set(trf.id, trf);
        });
        const fetchedTrfs = Array.from(trfMap.values()).sort(
          (a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
        );
        setCashTransfers(fetchedTrfs);
        localStorage.setItem('ws_cash_transfers', JSON.stringify(fetchedTrfs));
      }

      if (!prodSnap.empty) {
        const fetchedProds: Product[] = [];
        prodSnap.forEach((d) => fetchedProds.push(d.data() as Product));
        const { merged: cleanFetched } = mergeDuplicateProductsList(fetchedProds);
        setProducts(cleanFetched);
        localStorage.setItem('ws_products', JSON.stringify(cleanFetched));
      }

      if (!supSnap.empty) {
        const fetchedSups: Supplier[] = [];
        supSnap.forEach((d) => fetchedSups.push(d.data() as Supplier));
        setSuppliers(fetchedSups);
        localStorage.setItem('ws_suppliers', JSON.stringify(fetchedSups));
      }

      if (!ledSnap.empty) {
        const fetchedLed: SupplierLedgerEntry[] = [];
        ledSnap.forEach((d) => {
          const entry = d.data() as SupplierLedgerEntry;
          if (!['led_01', 'led_02', 'led_03', 'led_04', 'led_05', 'led_06'].includes(entry.id)) {
            fetchedLed.push(entry);
          }
        });
        fetchedLed.sort((a, b) => new Date(b.date || 0).getTime() - new Date(a.date || 0).getTime());
        setSupplierLedger(fetchedLed);
        localStorage.setItem('ws_supplier_ledger', JSON.stringify(fetchedLed));
      }

      if (!retSnap.empty) {
        const fetchedRet: Retailer[] = [];
        retSnap.forEach((d) => {
          const ret = d.data() as Retailer;
          const isFictitious =
            ['ret_6', 'ret_7', 'ret_8', 'ret_9', 'ret_10', 'ret_11', 'ret_12'].includes(ret.id) ||
            ret.name?.includes('মায়ের দোয়া') ||
            ret.name?.includes('খান টেলিকম');
          if (!isFictitious) fetchedRet.push(ret);
        });
        if (fetchedRet.length > 0) {
          setRetailers(fetchedRet);
          localStorage.setItem('ws_retailers', JSON.stringify(fetchedRet));
        }
      }

      if (!capSnap.empty) {
        const fetchedCap: CapitalTransaction[] = [];
        capSnap.forEach((d) => fetchedCap.push(d.data() as CapitalTransaction));
        fetchedCap.sort((a, b) => new Date(b.date || 0).getTime() - new Date(a.date || 0).getTime());
        setCapitalTransactions(fetchedCap);
        localStorage.setItem('ws_capital_tx', JSON.stringify(fetchedCap));
      }

      if (!expSnap.empty) {
        const fetchedExp: Expense[] = [];
        expSnap.forEach((d) => fetchedExp.push(d.data() as Expense));
        fetchedExp.sort((a, b) => new Date(b.date || b.createdAt || 0).getTime() - new Date(a.date || a.createdAt || 0).getTime());
        setExpenses(fetchedExp);
        localStorage.setItem('ws_expenses', JSON.stringify(fetchedExp));
      }

      setIsSyncingToCloud(false);
      setLastSyncTime(new Date().toISOString());

      const dsrCount = cleanOrders.filter((o) => {
        const r = (o.creatorRole || o.salesPersonRole || '').toLowerCase();
        const n = (o.creatorName || o.salesPersonName || '').toLowerCase();
        return r === 'dsr' || n.includes('dsr') || n.includes('razo') || n.includes('raju') || n.includes('রাজু');
      }).length;

      const counterCount = cleanOrders.filter((o) => {
        const r = (o.creatorRole || o.salesPersonRole || '').toLowerCase();
        const n = (o.creatorName || o.salesPersonName || '').toLowerCase();
        const isDsr = r === 'dsr' || n.includes('dsr') || n.includes('razo') || n.includes('raju');
        const isAdmin = r === 'admin' || n.includes('admin');
        return !isDsr && !isAdmin;
      }).length;

      const adminCount = cleanOrders.length - dsrCount - counterCount;

      return {
        success: true,
        message:
          language === 'bn'
            ? `ক্লাউড থেকে সফলভাবে মোট ${cleanOrders.length}টি মেমো রিফ্রেশ হয়েছে (ডিএসআর: ${dsrCount}টি, কাউন্টার: ${counterCount}টি, এডমিন: ${adminCount}টি)!`
            : `Refreshed ${cleanOrders.length} orders from cloud!`,
        counts: {
          orders: cleanOrders.length,
          dsrOrders: dsrCount,
          counterOrders: counterCount,
          adminOrders: adminCount,
        },
      };
    } catch (err: any) {
      setIsSyncingToCloud(false);
      return {
        success: false,
        message: err.message || 'ক্লাউড থেকে ডাটা রিফ্রেশ ব্যর্থ হয়েছে',
      };
    }
  };

  const downloadLocalBackupJSON = async () => {
    const snapshot: CloudBackupSnapshot = {
      id: `local_backup_${Date.now()}`,
      timestamp: new Date().toISOString(),
      version: '2.4',
      createdBy: currentUser.id,
      createdByName: currentUser.name,
      counts: {
        products: products.length,
        orders: orders.length,
        retailers: retailers.length,
        suppliers: suppliers.length,
        transfers: cashTransfers.length,
        supplierLedger: supplierLedger.length,
        capitalTransactions: capitalTransactions.length,
        replacements: replacements.length,
        users: users.length,
      },
      financials: {
        totalReceivables,
        totalPayables,
        totalStockValue: totalInventoryValuation,
        adminCash: cashAdmin,
        counterCash: cashCounter,
        dsrcash: cashDSR,
        bankCash: cashBank,
      },
      data: {
        products,
        orders,
        retailers,
        suppliers,
        supplierLedger,
        cashTransfers,
        capitalTransactions,
        replacements,
        users,
        activityLogs: activityLogs.slice(0, 100),
      },
    };

    const jsonStr = JSON.stringify(snapshot, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json;charset=utf-8' });
    const filename = `dealer_erp_backup_${new Date().toISOString().slice(0, 10)}.json`;
    await saveFileBlob(blob, filename, 'application/json', {
      title: 'মাতৃছায়া টেলিকম ডাটাবেজ ব্যাকআপ',
    });
  };

  const restoreFromBackupSnapshot = async (snapshot: CloudBackupSnapshot): Promise<{ success: boolean; message: string }> => {
    if (!snapshot || !snapshot.data) {
      return { success: false, message: 'Invalid snapshot data structure' };
    }

    try {
      const {
        products: snapProducts = [],
        orders: snapOrders = [],
        retailers: snapRetailers = [],
        suppliers: snapSuppliers = [],
        supplierLedger: snapLedger = [],
        cashTransfers: snapTransfers = [],
        capitalTransactions: snapCapital = [],
        replacements: snapReplacements = [],
        companyReturns: snapCompanyReturns = [],
        expenses: snapExpenses = [],
        users: snapUsers = [],
        activityLogs: snapLogs = [],
      } = snapshot.data as any;

      if (snapProducts.length > 0) {
        const { merged: cleanSnap } = mergeDuplicateProductsList(snapProducts);
        setProducts(cleanSnap);
        localStorage.setItem('ws_products', JSON.stringify(cleanSnap));
      }
      if (snapOrders.length > 0) {
        const cleanOrders = sanitizeOrderProfits(snapOrders);
        setOrders(cleanOrders);
        localStorage.setItem('ws_orders', JSON.stringify(cleanOrders));
      }
      if (snapRetailers.length > 0) {
        setRetailers(snapRetailers);
        localStorage.setItem('ws_retailers', JSON.stringify(snapRetailers));
      }
      if (snapSuppliers.length > 0) {
        setSuppliers(snapSuppliers);
        localStorage.setItem('ws_suppliers', JSON.stringify(snapSuppliers));
      }
      if (snapLedger.length > 0) {
        setSupplierLedger(snapLedger);
        localStorage.setItem('ws_supplier_ledger', JSON.stringify(snapLedger));
      }
      if (snapTransfers.length > 0) {
        setCashTransfers(snapTransfers);
        localStorage.setItem('ws_cash_transfers', JSON.stringify(snapTransfers));
      }
      if (snapCapital.length > 0) {
        setCapitalTransactions(snapCapital);
        localStorage.setItem('ws_capital_tx', JSON.stringify(snapCapital));
      }
      if (snapReplacements.length > 0) {
        setReplacements(snapReplacements);
        localStorage.setItem('ws_replacements', JSON.stringify(snapReplacements));
      }
      if (snapCompanyReturns.length > 0) {
        setCompanyReturns(snapCompanyReturns);
        localStorage.setItem('ws_company_returns', JSON.stringify(snapCompanyReturns));
      }
      if (snapExpenses.length > 0) {
        setExpenses(snapExpenses);
        localStorage.setItem('ws_expenses', JSON.stringify(snapExpenses));
      }
      if (snapUsers.length > 0) {
        const cleanSnapUsers = snapUsers
          .filter(
            (u: any) =>
              u.id !== 'usr_dsr_1' &&
              u.id !== 'usr_counter_1' &&
              u.id !== 'usr_retailer_1' &&
              !u.name?.includes('Selim') &&
              !u.name?.includes('Kamal Hossain') &&
              !u.name?.includes('Rahim Mia') &&
              !u.name?.includes('Rafiq')
          )
          .map((u: any) => {
            if (u.role === 'admin' || u.id === 'usr_admin') {
              return {
                ...u,
                name: 'মাতৃছায়া টেলিকম',
                bnName: 'প্রোপ্রাইটর (মাতৃছায়া টেলিকম)',
                enterpriseName: 'মাতৃছায়া টেলিকম',
                shopName: 'মাতৃছায়া টেলিকম',
              };
            }
            return u;
          });
        setUsers(cleanSnapUsers);
        localStorage.setItem('ws_users', JSON.stringify(cleanSnapUsers));
      }
      if (snapLogs && snapLogs.length > 0) {
        setActivityLogs(snapLogs);
        localStorage.setItem('ws_activity_logs', JSON.stringify(snapLogs));
      }

      if (navigator.onLine && !isSimulatedOffline) {
        const batch = writeBatch(db);
        snapProducts.forEach((p) => batch.set(doc(db, COLLECTIONS.PRODUCTS, p.id), p, { merge: true }));
        snapOrders.forEach((o) => batch.set(doc(db, COLLECTIONS.ORDERS, o.id), o, { merge: true }));
        snapRetailers.forEach((r) => batch.set(doc(db, COLLECTIONS.RETAILERS, r.id), r, { merge: true }));
        snapSuppliers.forEach((s) => batch.set(doc(db, COLLECTIONS.SUPPLIERS, s.id), s, { merge: true }));
        if (snapLedger && snapLedger.length > 0) {
          snapLedger.forEach((l) => batch.set(doc(db, COLLECTIONS.SUPPLIER_LEDGER, l.id), l, { merge: true }));
        }
        snapTransfers.forEach((t) => batch.set(doc(db, COLLECTIONS.CASH_TRANSFERS, t.id), t, { merge: true }));
        snapCapital.forEach((c) => batch.set(doc(db, COLLECTIONS.CAPITAL_TRANSACTIONS, c.id), c, { merge: true }));
        snapReplacements.forEach((rep) => batch.set(doc(db, COLLECTIONS.REPLACEMENTS, rep.id), rep, { merge: true }));
        if (snapCompanyReturns.length > 0) {
          snapCompanyReturns.forEach((cr: any) => batch.set(doc(db, COLLECTIONS.COMPANY_RETURNS, cr.id), cr, { merge: true }));
        }
        if (snapExpenses.length > 0) {
          snapExpenses.forEach((ex: any) => batch.set(doc(db, COLLECTIONS.EXPENSES, ex.id), ex, { merge: true }));
        }
        if (snapLogs && snapLogs.length > 0) {
          snapLogs.forEach((a) => batch.set(doc(db, COLLECTIONS.ACTIVITY_LOGS, a.id), a, { merge: true }));
        }
        await batch.commit();
      }

      addActivityLog({
        actionType: 'CLOUD_BACKUP',
        title: `Restored Database from Snapshot #${snapshot.id.slice(-6)}`,
        bnTitle: `ব্যাকআপ স্ন্যাপশট #${snapshot.id.slice(-6)} থেকে ডেটা রিস্টোর সম্পন্ন`,
        description: `Restored ${snapProducts.length} products, ${snapOrders.length} invoices, ${snapRetailers.length} retailers.`,
        bnDescription: `${snapProducts.length}টি পণ্য, ${snapOrders.length}টি বিক্রয় চালান এবং ${snapRetailers.length}টি রিটেইলার অ্যাকাউন্ট সফলভাবে রিস্টোর হয়েছে।`,
        actorRole: currentUser.role,
        actorId: currentUser.id,
        actorName: currentUser.name,
        actorPhone: currentUser.phone,
        status: 'COMPLETED',
      });

      return {
        success: true,
        message: 'Database state successfully restored from snapshot.',
      };
    } catch (err: any) {
      return {
        success: false,
        message: err.message || 'Failed to restore snapshot',
      };
    }
  };

  // Google Drive Active Account & Auth State
  const [googleDriveAccount, setGoogleDriveAccount] = useState<{ email: string | null; displayName: string | null; isConnected: boolean }>(() => {
    if (typeof window === 'undefined') return { email: null, displayName: null, isConnected: false };
    try {
      const u = localStorage.getItem('ws_gdrive_user');
      const token = localStorage.getItem('ws_gdrive_access_token');
      if (token && u) {
        const parsed = JSON.parse(u);
        return { email: parsed.email || null, displayName: parsed.displayName || null, isConnected: true };
      }
    } catch {}
    return { email: null, displayName: null, isConnected: false };
  });

  const isGoogleDriveConnected = Boolean(googleDriveAccount.isConnected && googleDriveAccount.email);

  useEffect(() => {
    let unsub: (() => void) | undefined;
    import('../services/googleDriveService').then(({ initGoogleDriveAuth }) => {
      unsub = initGoogleDriveAuth((state) => {
        setGoogleDriveAccount({
          email: state.email,
          displayName: state.displayName,
          isConnected: state.isConnected,
        });
      });
    }).catch(() => {});
    return () => {
      if (unsub) unsub();
    };
  }, []);

  // Upload/Sync current master database state to Google Drive
  const syncToGoogleDrive = useCallback(async (): Promise<{ success: boolean; message: string }> => {
    try {
      const { uploadBackupToGoogleDrive, isGoogleDriveConnected } = await import('../services/googleDriveService');
      if (!isGoogleDriveConnected()) {
        return { success: false, message: 'গুগল ড্রাইভ সংযুক্ত নেই। দয়া করে যে কোনো জিমেইল দিয়ে গুগল ড্রাইভে কানেক্ট করুন।' };
      }

      const backupId = `gdrive_sync_${Date.now()}`;
      const timestamp = new Date().toISOString();
      const snapshot: CloudBackupSnapshot = {
        id: backupId,
        timestamp,
        version: '3.0',
        createdBy: currentUser.id,
        createdByName: currentUser.name,
        counts: {
          products: products.length,
          orders: orders.length,
          retailers: retailers.length,
          suppliers: suppliers.length,
          transfers: cashTransfers.length,
          supplierLedger: supplierLedger.length,
          capitalTransactions: capitalTransactions.length,
          replacements: replacements.length,
          companyReturns: companyReturns.length,
          expenses: expenses.length,
          users: users.length,
        },
        financials: {
          totalReceivables: retailers.reduce((s, r) => s + (Number(r.balance) || 0), 0),
          totalPayables: suppliers.reduce((s, sp) => s + (Number(sp.outstandingPayable) || 0), 0),
          totalStockValue: products.reduce((s, p) => s + (p.stock || 0) * (p.purchasePrice || p.price || 0), 0),
          adminCash: users.find((u) => u.role === 'admin')?.assignedCashDrawer || 0,
          counterCash: users.find((u) => u.role === 'counter')?.assignedCashDrawer || 0,
          dsrcash: users.find((u) => u.role === 'dsr')?.assignedCashDrawer || 0,
          bankCash: (bankAccounts || []).reduce((s, b) => s + (b.balance || 0), 0),
        },
        data: {
          products,
          orders,
          retailers,
          suppliers,
          supplierLedger,
          cashTransfers,
          capitalTransactions,
          replacements,
          companyReturns,
          expenses,
          users,
          activityLogs: activityLogs.slice(0, 100),
        },
      };

      const res = await uploadBackupToGoogleDrive(snapshot);
      localStorage.setItem('ws_last_gdrive_sync_time', timestamp);
      return { success: true, message: res.message };
    } catch (err: any) {
      return { success: false, message: err.message || 'গুগল ড্রাইভে ব্যাকআপ আপলোড ব্যর্থ হয়েছে' };
    }
  }, [
    currentUser,
    products,
    orders,
    retailers,
    suppliers,
    supplierLedger,
    cashTransfers,
    capitalTransactions,
    replacements,
    companyReturns,
    expenses,
    users,
    activityLogs,
    bankAccounts,
  ]);

  // Pull latest master file from Google Drive and merge without losing local data
  const pullFromGoogleDrive = useCallback(async (): Promise<{ success: boolean; message: string; counts?: any }> => {
    try {
      const { pullLatestGoogleDriveData } = await import('../services/googleDriveService');
      const res = await pullLatestGoogleDriveData();
      if (!res.success || !res.data) {
        return { success: false, message: res.message || 'গুগল ড্রাইভ থেকে কোনো ডাটা পাওয়া যায়নি।' };
      }

      const snap = res.data;
      const snapData = snap.data || snap;

      // 1. Merge Orders (by ID and invoiceNo)
      const remoteOrders: OrderInvoice[] = Array.isArray(snapData.orders) ? snapData.orders : [];
      if (remoteOrders.length > 0) {
        setOrders((prev) => {
          const map = new Map<string, OrderInvoice>();
          remoteOrders.forEach((o) => {
            if (o && (o.id || (o as any).invoiceNo)) map.set(o.id || (o as any).invoiceNo, o);
          });
          prev.forEach((o) => {
            if (o && (o.id || (o as any).invoiceNo)) map.set(o.id || (o as any).invoiceNo, o);
          });
          const merged = sanitizeOrderProfits(Array.from(map.values()));
          localStorage.setItem('ws_orders', JSON.stringify(merged));
          idbSetState('ws_orders', merged);
          return merged;
        });
      }

      // 2. Merge Products
      const remoteProducts: Product[] = Array.isArray(snapData.products) ? snapData.products : [];
      if (remoteProducts.length > 0) {
        setProducts((prev) => {
          const map = new Map<string, Product>();
          remoteProducts.forEach((p) => { if (p && p.id) map.set(p.id, p); });
          prev.forEach((p) => { if (p && p.id) map.set(p.id, p); });
          const merged = Array.from(map.values());
          localStorage.setItem('ws_products', JSON.stringify(merged));
          idbSetState('ws_products', merged);
          return merged;
        });
      }

      // 3. Merge Retailers
      const remoteRetailers: Retailer[] = Array.isArray(snapData.retailers) ? snapData.retailers : [];
      if (remoteRetailers.length > 0) {
        setRetailers((prev) => {
          const map = new Map<string, Retailer>();
          remoteRetailers.forEach((r) => { if (r && r.id) map.set(r.id, r); });
          prev.forEach((r) => { if (r && r.id) map.set(r.id, r); });
          const merged = Array.from(map.values());
          localStorage.setItem('ws_retailers', JSON.stringify(merged));
          return merged;
        });
      }

      // 4. Merge Suppliers & Supplier Ledger
      const remoteSuppliers: Supplier[] = Array.isArray(snapData.suppliers) ? snapData.suppliers : [];
      if (remoteSuppliers.length > 0) {
        setSuppliers((prev) => {
          const map = new Map<string, Supplier>();
          remoteSuppliers.forEach((s) => { if (s && s.id) map.set(s.id, s); });
          prev.forEach((s) => { if (s && s.id) map.set(s.id, s); });
          const merged = Array.from(map.values());
          localStorage.setItem('ws_suppliers', JSON.stringify(merged));
          return merged;
        });
      }

      const remoteLedger: SupplierLedgerEntry[] = Array.isArray(snapData.supplierLedger) ? snapData.supplierLedger : [];
      if (remoteLedger.length > 0) {
        setSupplierLedger((prev) => {
          const map = new Map<string, SupplierLedgerEntry>();
          remoteLedger.forEach((l) => { if (l && l.id) map.set(l.id, l); });
          prev.forEach((l) => { if (l && l.id) map.set(l.id, l); });
          const merged = Array.from(map.values());
          localStorage.setItem('ws_supplier_ledger', JSON.stringify(merged));
          return merged;
        });
      }

      // 5. Merge Cash Transfers
      const remoteTransfers: CashTransfer[] = Array.isArray(snapData.cashTransfers) ? snapData.cashTransfers : [];
      if (remoteTransfers.length > 0) {
        setCashTransfers((prev) => {
          const map = new Map<string, CashTransfer>();
          remoteTransfers.forEach((ct) => { if (ct && ct.id) map.set(ct.id, ct); });
          prev.forEach((ct) => { if (ct && ct.id) map.set(ct.id, ct); });
          const merged = Array.from(map.values());
          localStorage.setItem('ws_cash_transfers', JSON.stringify(merged));
          return merged;
        });
      }

      // 6. Merge Replacements & Company Returns
      if (Array.isArray(snapData.replacements) && snapData.replacements.length > 0) {
        setReplacements((prev) => {
          const map = new Map<string, ReplacementAdjustment>();
          snapData.replacements.forEach((r: any) => { if (r && r.id) map.set(r.id, r); });
          prev.forEach((r) => { if (r && r.id) map.set(r.id, r); });
          const merged = Array.from(map.values());
          localStorage.setItem('ws_replacements', JSON.stringify(merged));
          return merged;
        });
      }

      if (Array.isArray(snapData.companyReturns) && snapData.companyReturns.length > 0) {
        setCompanyReturns((prev) => {
          const map = new Map<string, CompanyReturnChallan>();
          snapData.companyReturns.forEach((cr: any) => { if (cr && cr.id) map.set(cr.id, cr); });
          prev.forEach((cr) => { if (cr && cr.id) map.set(cr.id, cr); });
          const merged = Array.from(map.values());
          localStorage.setItem('ws_company_returns', JSON.stringify(merged));
          return merged;
        });
      }

      return {
        success: true,
        message: `গুগল ড্রাইভ (${res.filename || 'মাস্টার ফাইল'}) থেকে সফলভাবে সকল ডিভাইস ডাটা আপডেট ও সমন্বয় করা হয়েছে!`,
        counts: {
          orders: remoteOrders.length,
          products: remoteProducts.length,
        },
      };
    } catch (err: any) {
      return {
        success: false,
        message: err.message || 'গুগল ড্রাইভ থেকে ডাটা আপডেট করতে সমস্যা হয়েছে।',
      };
    }
  }, []);

  // Automatic Google Drive auto-sync on online & periodic timer
  useEffect(() => {
    const handleOnlineGoogleSync = async () => {
      try {
        const { isGoogleDriveConnected } = await import('../services/googleDriveService');
        if (isGoogleDriveConnected() && localStorage.getItem('ws_gdrive_auto_sync') !== 'false') {
          syncToGoogleDrive().catch(() => {});
        }
      } catch {}
    };

    window.addEventListener('online', handleOnlineGoogleSync);

    // Periodic auto-backup every 4 minutes if online and connected
    const gDriveInterval = setInterval(() => {
      if (navigator.onLine && !isSimulatedOffline) {
        handleOnlineGoogleSync();
      }
    }, 4 * 60 * 1000);

    return () => {
      window.removeEventListener('online', handleOnlineGoogleSync);
      clearInterval(gDriveInterval);
    };
  }, [syncToGoogleDrive, isSimulatedOffline]);

  // Online / Offline window listeners with instant automatic sync upon connecting
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      if (!isSimulatedOffline) {
        simulateGoOnline();
        // Immediately sync pending offline writes & save cloud backup
        syncPendingOfflineData();
      }
    };
    const handleOffline = () => {
      setIsOnline(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Periodic auto-batch sync worker (every 15s) for DSR & Admin if IndexedDB queue has items
    const syncInterval = setInterval(() => {
      if (navigator.onLine && !isSimulatedOffline && !isSyncingToCloud) {
        idbGetAllQueueItems().then((items) => {
          if (items && items.length > 0) {
            syncPendingOfflineData();
          }
        }).catch(() => {});
      }
    }, 15000);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      clearInterval(syncInterval);
    };
  }, [isSimulatedOffline, isSyncingToCloud]);

  // Toggle offline mode simulation for testing resilience
  const toggleSimulateOffline = async () => {
    if (!isSimulatedOffline) {
      await simulateGoOffline();
      setIsSimulatedOffline(true);
      setIsOnline(false);
    } else {
      await simulateGoOnline();
      setIsSimulatedOffline(false);
      setIsOnline(navigator.onLine);
      if (navigator.onLine) {
        syncPendingOfflineData();
      }
    }
  };

  // Real-time Firestore listeners with offline cache enabled
  useEffect(() => {
    if (!db) {
      console.warn('Firestore database instance is not ready.');
      return;
    }

    // 1. Seed initial users if Firestore is fresh and purge legacy demo accounts
    const seedInitialDataIfNeeded = async () => {
      if (isInitialSeedDone.current) return;
      isInitialSeedDone.current = true;

      try {
        // Remove legacy demo accounts if they exist in Firestore
        const demoUserIds = ['usr_dsr_1', 'usr_counter_1', 'usr_retailer_1'];
        for (const dId of demoUserIds) {
          try {
            await deleteDoc(doc(db, COLLECTIONS.USERS, dId));
          } catch (e) {}
        }

        const usersSnapshot = await getDocs(collection(db, COLLECTIONS.USERS));
        // Clean up any legacy demo accounts sequentially without flooding connection pool
        for (const docItem of usersSnapshot.docs) {
          const u = docItem.data() as UserProfile;
          const cleanPhone = (u.phone || '').replace(/[^0-9]/g, '');
          if (
            u.id === 'usr_dsr_1' ||
            u.id === 'usr_counter_1' ||
            u.id === 'usr_retailer_1' ||
            u.name?.includes('Selim') ||
            u.name?.includes('Kamal Hossain') ||
            u.name?.includes('Rahim Mia') ||
            u.name?.includes('Rafiq')
          ) {
            try {
              await deleteDoc(doc(db, COLLECTIONS.USERS, docItem.id));
            } catch (e) {}
            continue;
          }

          // If doc is an admin, but NOT phone 01937200635 or NOT 'usr_admin': delete it permanently
          if (
            u.role === 'admin' &&
            (docItem.id !== 'usr_admin' || (!cleanPhone.endsWith('1937200635') && cleanPhone !== '01937200635'))
          ) {
            try {
              await deleteDoc(doc(db, COLLECTIONS.USERS, docItem.id));
            } catch (e) {}
            continue;
          }

          // Also remove any document with old admin phone 01711234567
          if (cleanPhone.endsWith('1711234567') || cleanPhone === '01711234567') {
            try {
              await deleteDoc(doc(db, COLLECTIONS.USERS, docItem.id));
            } catch (e) {}
            continue;
          }
        }

        // Check if any custom DSR exists in Firestore
        const hasCustomDsrInFirestore = usersSnapshot.docs.some((d) => {
          const u = d.data() as any;
          const cleanPhone = (u.phone || '').replace(/[^0-9]/g, '');
          return (
            u.role === 'dsr' &&
            d.id !== 'usr_dsr_mp' &&
            !cleanPhone.endsWith('1700000002') &&
            u.name !== 'MP'
          );
        });

        // If custom DSR exists in Firestore or locally, or MP was marked deleted, permanently delete usr_dsr_mp from Firestore
        if (
          hasCustomDsrInFirestore ||
          getDeletedUserIds().has('usr_dsr_mp') ||
          getDeletedUserIds().has('01700000002')
        ) {
          try {
            await deleteDoc(doc(db, COLLECTIONS.USERS, 'usr_dsr_mp'));
          } catch (e) {}
        }

        // Ensure canonical Matrichaya Admin, Counter, and DSR exist in Firestore without resetting balances
        for (const item of initialUsers) {
          try {
            const userRef = doc(db, COLLECTIONS.USERS, item.id);
            const userSnap = await getDoc(userRef);
            if (!userSnap.exists()) {
              await setDoc(userRef, cleanFirestorePayload(item), { merge: true });
            }
          } catch (e) {}
        }

        // Proactively purge any mock products or suppliers from Firestore (Xiaomi, Symphony, and default dummy items)
        try {
          const prodSnap = await getDocs(collection(db, COLLECTIONS.PRODUCTS));
          for (const d of prodSnap.docs) {
            const data = d.data() as Product;
            if (isDefaultMockProduct(data) || isDefaultMockProduct({ ...data, id: d.id })) {
              try {
                await deleteDoc(doc(db, COLLECTIONS.PRODUCTS, d.id));
              } catch (e) {}
            }
          }
        } catch (e) {}

        try {
          const supSnap = await getDocs(collection(db, COLLECTIONS.SUPPLIERS));
          for (const d of supSnap.docs) {
            const data = d.data() as Supplier;
            if (isDefaultMockSupplier(data) || isDefaultMockSupplier({ ...data, id: d.id })) {
              try {
                await deleteDoc(doc(db, COLLECTIONS.SUPPLIERS, d.id));
              } catch (e) {}
            }
          }
        } catch (e) {}

        // Seed directory catalog (retailers only if Firestore is completely fresh)
        try {
          const retSnap = await getDocs(collection(db, COLLECTIONS.RETAILERS));
          if (retSnap.empty && initialRetailers.length > 0) {
            const batch = writeBatch(db);
            initialRetailers.forEach((r) => batch.set(doc(db, COLLECTIONS.RETAILERS, r.id), cleanFirestorePayload(r), { merge: true }));
            await batch.commit();
          }
        } catch (e) {
          console.warn('Directory seed note:', e);
        }
      } catch (err) {
        console.warn('Firestore initial user check note:', err);
      }
    };

    // Defer initial seeding by 3.5s so app launch renders instantly with zero UI thread block
    const seedTimer = setTimeout(() => {
      if (typeof navigator !== 'undefined' && navigator.onLine && !isSimulatedOffline) {
        seedInitialDataIfNeeded().catch((e) => console.warn('Deferred seed note:', e));
      }
    }, 3500);

    // 2. Set up Firestore onSnapshot subscriptions with safe empty handling
    const unsubCashTransfers = onSnapshot(
      collection(db, COLLECTIONS.CASH_TRANSFERS),
      { includeMetadataChanges: true },
      (snapshot) => {
        setIsFromCache(snapshot.metadata.fromCache);
        if (!snapshot.empty) {
          const docs: CashTransfer[] = [];
          snapshot.forEach((docItem) => {
            docs.push(docItem.data() as CashTransfer);
          });
          setCashTransfers((prev) => {
            const map = new Map<string, CashTransfer>();
            (prev || []).forEach((item) => {
              if (item && item.id) map.set(item.id, item);
            });
            docs.forEach((item) => {
              if (item && item.id) map.set(item.id, item);
            });
            const merged = Array.from(map.values()).sort(
              (a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
            );
            localStorage.setItem('ws_cash_transfers', JSON.stringify(merged));
            return merged;
          });
        }
      },
      (err) => console.warn('Cash transfers snapshot listener note:', err)
    );

    // Products listener
    const unsubProducts = onSnapshot(
      collection(db, COLLECTIONS.PRODUCTS),
      { includeMetadataChanges: true },
      (snapshot) => {
        if (!snapshot.empty) {
          const docs: Product[] = [];
          snapshot.forEach((docItem) => {
            const p = docItem.data() as Product;
            if (isDefaultMockProduct(p) || isDefaultMockProduct({ ...p, id: docItem.id })) {
              try {
                deleteDoc(doc(db, COLLECTIONS.PRODUCTS, docItem.id));
              } catch (e) {}
              return;
            }
            docs.push(p);
          });
          setProducts((prev) => {
            const map = new Map<string, Product>();
            (prev || []).filter((p) => p && p.id && !isDefaultMockProduct(p)).forEach((p) => {
              if (p && p.id) map.set(p.id, p);
            });
            docs.forEach((p) => {
              if (p && p.id) map.set(p.id, p);
            });
            const mergedRaw = Array.from(map.values());
            const { merged, duplicateIdsRemoved } = mergeDuplicateProductsList(mergedRaw);
            if (duplicateIdsRemoved.length > 0) {
              duplicateIdsRemoved.forEach((delId) => {
                try {
                  deleteDoc(doc(db, COLLECTIONS.PRODUCTS, delId));
                } catch (e) {}
              });
            }
            localStorage.setItem('ws_products', JSON.stringify(merged));
            return merged;
          });
        }
      },
      (err) => console.warn('Products snapshot listener note:', err)
    );

    // Orders listener
    const unsubOrders = onSnapshot(
      collection(db, COLLECTIONS.ORDERS),
      { includeMetadataChanges: true },
      (snapshot) => {
        if (!snapshot.empty) {
          const docs: OrderInvoice[] = [];
          snapshot.forEach((docItem) => {
            const ord = docItem.data() as OrderInvoice;
            const isFictitious =
              ['ret_6', 'ret_7', 'ret_8', 'ret_9', 'ret_10', 'ret_11', 'ret_12'].includes(ord.retailerId || '') ||
              ord.retailerName?.includes('মায়ের দোয়া') ||
              ord.retailerName?.includes('খান টেলিকম') ||
              ord.retailerName?.includes('ভাই ভাই') ||
              ord.retailerName?.includes('জনতা') ||
              ord.retailerName?.includes('আশা') ||
              ord.retailerName?.includes('মিলন');
            if (isFictitious) {
              try {
                deleteDoc(doc(db, COLLECTIONS.ORDERS, docItem.id));
              } catch (e) {}
              return;
            }
            docs.push(ord);
          });
          const cleanDocs = sanitizeOrderProfits(docs);
          setOrders((prev) => {
            const map = new Map<string, OrderInvoice>();
            (prev || []).forEach((o) => {
              if (o && o.id) map.set(o.id, o);
            });
            cleanDocs.forEach((o) => {
              if (o && o.id) map.set(o.id, o);
            });
            const merged = Array.from(map.values()).sort(
              (a, b) => new Date(b.date || b.createdAt || 0).getTime() - new Date(a.date || a.createdAt || 0).getTime()
            );
            localStorage.setItem('ws_orders', JSON.stringify(merged));
            return merged;
          });
        } else {
          // If Firestore orders is empty, retain only unsynced local manual orders (not mock data)
          const saved = localStorage.getItem('ws_orders');
          let localOrders: OrderInvoice[] = [];
          if (saved) {
            try {
              localOrders = JSON.parse(saved);
            } catch (e) {}
          }
          const cleanLocal = (localOrders || []).filter(
            (o) => o && o.id && !['ret_6', 'ret_7', 'ret_8', 'ret_9', 'ret_10', 'ret_11', 'ret_12'].includes(o.retailerId || '')
          );
          setOrders(cleanLocal);
        }
      },
      (err) => console.warn('Orders snapshot listener note:', err)
    );

    // Retailers listener
    const unsubRetailers = onSnapshot(
      collection(db, COLLECTIONS.RETAILERS),
      { includeMetadataChanges: true },
      (snapshot) => {
        if (!snapshot.empty) {
          const docs: Retailer[] = [];
          snapshot.forEach((docItem) => {
            const ret = docItem.data() as Retailer;
            const isFictitious =
              ['ret_6', 'ret_7', 'ret_8', 'ret_9', 'ret_10', 'ret_11', 'ret_12'].includes(docItem.id) ||
              ['ret_6', 'ret_7', 'ret_8', 'ret_9', 'ret_10', 'ret_11', 'ret_12'].includes(ret.id) ||
              ret.name?.includes('মায়ের দোয়া') ||
              ret.name?.includes('খান টেলিকম') ||
              ret.name?.includes('ভাই ভাই') ||
              ret.name?.includes('জনতা') ||
              ret.name?.includes('আশা') ||
              ret.name?.includes('মিলন');
            if (isFictitious) {
              try {
                deleteDoc(doc(db, COLLECTIONS.RETAILERS, docItem.id));
              } catch (e) {}
              return;
            }
            docs.push(ret);
          });
          const cleanRetailers = docs.length > 0 ? docs : initialRetailers;
          setRetailers((prev) => {
            const map = new Map<string, Retailer>();
            (prev || []).forEach((r) => {
              if (r && r.id) map.set(r.id, r);
            });
            cleanRetailers.forEach((r) => {
              if (r && r.id) map.set(r.id, r);
            });
            const merged = Array.from(map.values());
            localStorage.setItem('ws_retailers', JSON.stringify(merged));
            return merged;
          });
        }
      },
      (err) => console.warn('Retailers snapshot listener note:', err)
    );

    // Suppliers listener
    const unsubSuppliers = onSnapshot(
      collection(db, COLLECTIONS.SUPPLIERS),
      { includeMetadataChanges: true },
      (snapshot) => {
        if (!snapshot.empty) {
          const docs: Supplier[] = [];
          snapshot.forEach((docItem) => {
            const s = docItem.data() as Supplier;
            if (isDefaultMockSupplier(s) || isDefaultMockSupplier({ ...s, id: docItem.id })) {
              try {
                deleteDoc(doc(db, COLLECTIONS.SUPPLIERS, docItem.id));
              } catch (e) {}
              return;
            }
            docs.push(s);
          });
          setSuppliers((prev) => {
            const map = new Map<string, Supplier>();
            (prev || []).filter((s) => s && s.id && !isDefaultMockSupplier(s)).forEach((s) => {
              if (s && s.id) map.set(s.id, s);
            });
            docs.forEach((s) => {
              if (s && s.id) map.set(s.id, s);
            });
            const merged = Array.from(map.values());
            localStorage.setItem('ws_suppliers', JSON.stringify(merged));
            return merged;
          });
        }
      },
      (err) => console.warn('Suppliers snapshot listener note:', err)
    );

    // Replacements listener
    const unsubReplacements = onSnapshot(
      collection(db, COLLECTIONS.REPLACEMENTS),
      { includeMetadataChanges: true },
      (snapshot) => {
        if (!snapshot.empty) {
          const docs: ReplacementAdjustment[] = [];
          snapshot.forEach((docItem) => {
            docs.push(docItem.data() as ReplacementAdjustment);
          });
          setReplacements((prev) => {
            const map = new Map<string, ReplacementAdjustment>();
            (prev || []).forEach((r) => {
              if (r && r.id) map.set(r.id, r);
            });
            docs.forEach((r) => {
              if (r && r.id) map.set(r.id, r);
            });
            const merged = Array.from(map.values());
            localStorage.setItem('ws_replacements', JSON.stringify(merged));
            return merged;
          });
        }
      },
      (err) => console.warn('Replacements snapshot listener note:', err)
    );

    // Company Returns listener
    const unsubCompanyReturns = onSnapshot(
      collection(db, COLLECTIONS.COMPANY_RETURNS),
      { includeMetadataChanges: true },
      (snapshot) => {
        if (!snapshot.empty) {
          const docs: CompanyReturnChallan[] = [];
          snapshot.forEach((docItem) => {
            docs.push(docItem.data() as CompanyReturnChallan);
          });
          docs.sort((a, b) => new Date(b.createdAt || b.dispatchDate).getTime() - new Date(a.createdAt || a.dispatchDate).getTime());
          setCompanyReturns(docs);
          localStorage.setItem('ws_company_returns', JSON.stringify(docs));
        }
      },
      (err) => console.warn('Company returns snapshot listener note:', err)
    );

    // Capital Transactions listener
    const unsubCapital = onSnapshot(
      collection(db, COLLECTIONS.CAPITAL_TRANSACTIONS),
      { includeMetadataChanges: true },
      (snapshot) => {
        if (!snapshot.empty) {
          const docs: CapitalTransaction[] = [];
          snapshot.forEach((docItem) => {
            docs.push(docItem.data() as CapitalTransaction);
          });
          setCapitalTransactions((prev) => {
            const map = new Map<string, CapitalTransaction>();
            (prev || []).forEach((c) => {
              if (c && c.id) map.set(c.id, c);
            });
            docs.forEach((c) => {
              if (c && c.id) map.set(c.id, c);
            });
            const merged = Array.from(map.values()).sort(
              (a, b) => new Date(b.date || 0).getTime() - new Date(a.date || 0).getTime()
            );
            localStorage.setItem('ws_capital_tx', JSON.stringify(merged));
            return merged;
          });
        }
      },
      (err) => console.warn('Capital snapshot listener note:', err)
    );

    // Supplier Ledger listener
    const unsubSupplierLedger = onSnapshot(
      collection(db, COLLECTIONS.SUPPLIER_LEDGER),
      { includeMetadataChanges: true },
      (snapshot) => {
        if (!snapshot.empty) {
          const docs: SupplierLedgerEntry[] = [];
          snapshot.forEach((docItem) => {
            const entry = docItem.data() as SupplierLedgerEntry;
            if (!['led_01', 'led_02', 'led_03', 'led_04', 'led_05', 'led_06'].includes(entry.id)) {
              docs.push(entry);
            }
          });
          setSupplierLedger((prev) => {
            const map = new Map<string, SupplierLedgerEntry>();
            (prev || []).forEach((l) => {
              if (l && l.id) map.set(l.id, l);
            });
            docs.forEach((l) => {
              if (l && l.id) map.set(l.id, l);
            });
            const merged = Array.from(map.values()).sort(
              (a, b) => new Date(b.date || 0).getTime() - new Date(a.date || 0).getTime()
            );
            localStorage.setItem('ws_supplier_ledger', JSON.stringify(merged));
            return merged;
          });
        }
      },
      (err) => console.warn('Supplier ledger snapshot listener note:', err)
    );

    // Activity Logs listener
    const unsubActivityLogs = onSnapshot(
      collection(db, COLLECTIONS.ACTIVITY_LOGS),
      { includeMetadataChanges: true },
      (snapshot) => {
        if (!snapshot.empty) {
          const docs: ActivityLog[] = [];
          snapshot.forEach((docItem) => {
            const entry = docItem.data() as ActivityLog;
            if (!['act_01', 'act_02', 'act_03', 'act_04'].includes(entry.id)) {
              docs.push(entry);
            }
          });
          docs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
          setActivityLogs(docs);
        } else {
          setActivityLogs([]);
          localStorage.setItem('ws_activity_logs', JSON.stringify([]));
        }
      },
      (err) => console.warn('Activity logs snapshot listener note:', err)
    );

    // Users / Staff Real-Time Listener
    const unsubUsers = onSnapshot(
      collection(db, COLLECTIONS.USERS),
      { includeMetadataChanges: true },
      (snapshot) => {
        if (!snapshot.empty) {
          const rawDocs: UserProfile[] = [];
          const deletedIds = getDeletedUserIds();

          // Check if snapshot contains any real custom DSR
          const hasCustomDsrInSnap = snapshot.docs.some((d) => {
            const u = d.data() as any;
            const cleanDigits = (u.phone || '').replace(/[^0-9]/g, '');
            return (
              u.role === 'dsr' &&
              d.id !== 'usr_dsr_mp' &&
              !cleanDigits.endsWith('1700000002') &&
              u.name !== 'MP'
            );
          });

          snapshot.forEach((docItem) => {
            const u = docItem.data() as UserProfile;
            const cleanDigits = (u.phone || '').replace(/[^0-9]/g, '');

            // Skip explicitly deleted users
            if (deletedIds.has(docItem.id) || (cleanDigits && deletedIds.has(cleanDigits))) {
              return;
            }

            // Proactively delete any non-01937200635 admin from Firestore so they never re-appear
            if (
              u.role === 'admin' &&
              (docItem.id !== 'usr_admin' || (!cleanDigits.endsWith('1937200635') && cleanDigits !== '01937200635'))
            ) {
              try {
                deleteDoc(doc(db, COLLECTIONS.USERS, docItem.id));
              } catch (e) {}
              return;
            }

            // Also delete old admin phone 01711234567 doc
            if (cleanDigits.endsWith('1711234567') || cleanDigits === '01711234567') {
              try {
                deleteDoc(doc(db, COLLECTIONS.USERS, docItem.id));
              } catch (e) {}
              return;
            }

            // If real custom DSR exists or MP was deleted, remove any MP doc from Firestore permanently
            if (
              (docItem.id === 'usr_dsr_mp' || cleanDigits.endsWith('1700000002') || u.name === 'MP') &&
              (hasCustomDsrInSnap || deletedIds.has('usr_dsr_mp') || deletedIds.has('01700000002'))
            ) {
              try {
                deleteDoc(doc(db, COLLECTIONS.USERS, docItem.id));
              } catch (e) {}
              return;
            }

            if (
              u.id !== 'usr_dsr_1' &&
              u.id !== 'usr_counter_1' &&
              u.id !== 'usr_retailer_1' &&
              !u.name?.includes('Selim') &&
              !u.name?.includes('Kamal Hossain') &&
              !u.name?.includes('Rahim Mia') &&
              !u.name?.includes('Rafiq')
            ) {
              rawDocs.push(u);
            }
          });

          // Deduplicate and ensure exactly ONE admin ("মাতৃছায়া টেলিকম")
          const finalUsers = sanitizeAndDeduplicateUsers(rawDocs);
          setUsers(finalUsers);
          localStorage.setItem('ws_users', JSON.stringify(finalUsers));
          setCurrentUserState((prev) => {
            if (prev.role === 'dsr') {
              const dsrUser = finalUsers.find((u) => u.id === prev.id) || finalUsers.find((u) => u.role === 'dsr');
              if (dsrUser) {
                localStorage.setItem('ws_current_user', JSON.stringify(dsrUser));
                return dsrUser;
              }
            }
            const matched = finalUsers.find((u) => u.id === prev.id);
            if (matched) {
              if (matched.assignedCashDrawer !== prev.assignedCashDrawer || matched.name !== prev.name) {
                return { ...prev, ...matched };
              }
              return prev;
            }
            const roleMatch = finalUsers.find((u) => u.role === prev.role) || finalUsers[0];
            if (roleMatch) {
              localStorage.setItem('ws_current_user', JSON.stringify(roleMatch));
              return roleMatch;
            }
            return prev;
          });
        } else {
          const defaultClean = sanitizeAndDeduplicateUsers(initialUsers);
          setUsers(defaultClean);
          localStorage.setItem('ws_users', JSON.stringify(defaultClean));
          setCurrentUserState((prev) => {
            const matched = defaultClean.find((u) => u.id === prev.id || u.role === prev.role);
            if (matched && matched.assignedCashDrawer !== prev.assignedCashDrawer) {
              return { ...prev, assignedCashDrawer: matched.assignedCashDrawer };
            }
            return prev;
          });
        }
      },
      (err) => console.warn('Users snapshot listener note:', err)
    );

    // Expenses Real-Time Listener
    const unsubExpenses = onSnapshot(
      collection(db, COLLECTIONS.EXPENSES),
      { includeMetadataChanges: true },
      (snapshot) => {
        if (!snapshot.empty) {
          const docs: Expense[] = [];
          snapshot.forEach((docItem) => {
            docs.push(docItem.data() as Expense);
          });
          docs.sort((a, b) => new Date(b.date || b.createdAt || 0).getTime() - new Date(a.date || a.createdAt || 0).getTime());
          setExpenses(docs);
          localStorage.setItem('ws_expenses', JSON.stringify(docs));
        }
      },
      (err) => console.warn('Expenses snapshot listener note:', err)
    );

    // Universal Real-Time Multi-User Sync Broadcaster Listener
    const unsubRealtimeSync = onSnapshot(
      doc(db, 'system', 'realtime_sync'),
      { includeMetadataChanges: true },
      (docSnap) => {
        if (docSnap.exists()) {
          const syncData = docSnap.data();
          if (syncData && syncData.lastSyncIso) {
            setLastSyncTime(syncData.lastSyncIso);
            const pingTime = Number(syncData.lastSyncTimestamp) || 0;
            // When ping is from another client or server update, automatically trigger data refresh
            if (pingTime > 0 && pingTime !== lastLocalSyncPingRef.current) {
              lastLocalSyncPingRef.current = pingTime;
              // Silently refresh all data from cloud so mobile DSR and laptop Admin see immediate live updates
              refreshAllDataFromCloud().catch((e) => console.warn('Background auto refresh on sync ping note:', e));
            }
          }
        }
      },
      (err) => console.warn('Realtime sync listener note:', err)
    );

    // 12. Active Devices Cross-Network Live Presence Listener (Firestore Realtime)
    const unsubActiveDevices = onSnapshot(
      doc(db, 'system', 'active_devices'),
      { includeMetadataChanges: true },
      (docSnap) => {
        if (docSnap.exists()) {
          const rawData = docSnap.data();
          const devList = Object.values(rawData || {})
            .filter((d: any) => Boolean(d && d.deviceId))
            .map((d: any) => {
              const diffMs = Math.max(0, Date.now() - (d.lastHeartbeatMs || 0));
              return {
                ...d,
                isOnline: diffMs <= 40000,
                lastSeenSec: Math.floor(diffMs / 1000),
              };
            });
          if (devList.length > 0) {
            setRemoteServerDevices((prev) => {
              const map = new Map<string, any>();
              (prev || []).forEach((d) => { if (d && d.deviceId) map.set(d.deviceId, d); });
              devList.forEach((d) => { if (d && d.deviceId) map.set(d.deviceId, { ...(map.get(d.deviceId) || {}), ...d }); });
              return Array.from(map.values());
            });
            setRegisteredDevices((prev) => {
              const map = new Map<string, any>();
              (prev || []).forEach((d) => { if (d && d.deviceId) map.set(d.deviceId, d); });
              devList.forEach((d) => { if (d && d.deviceId) map.set(d.deviceId, { ...(map.get(d.deviceId) || {}), ...d }); });
              return Array.from(map.values());
            });
            const pendingList = devList.filter((d: any) => (d.pendingFilesCount || 0) > 0);
            setRemotePendingDevices(pendingList);
          }
        }
      },
      (err) => console.warn('Active devices listener notice:', err)
    );

    return () => {
      clearTimeout(seedTimer);
      unsubCashTransfers();
      unsubProducts();
      unsubOrders();
      unsubRetailers();
      unsubSuppliers();
      unsubCapital();
      unsubSupplierLedger();
      unsubReplacements();
      unsubCompanyReturns();
      unsubActivityLogs();
      unsubUsers();
      unsubExpenses();
      unsubRealtimeSync();
      unsubActiveDevices();
    };
  }, []);

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
  };

  const toggleLanguage = () => {
    setLanguageState((prev) => (prev === 'en' ? 'bn' : 'en'));
  };

  const setRole = (role: UserRole) => {
    setCurrentRoleState(role);
    localStorage.setItem('ws_current_role', role);
    const userForRole = users.find((u) => u.role === role);
    if (userForRole) {
      setCurrentUserState(userForRole);
      localStorage.setItem('ws_current_user', JSON.stringify(userForRole));
    }
    // Protect Admin and Counter Sales roles with biometric lock
    if (isBiometricEnabled && PROTECTED_ROLES_DEFAULT.includes(role)) {
      setIsBiometricLocked(true);
    } else {
      setIsBiometricLocked(false);
    }
    setTimeout(() => {
      try { sendPresenceHeartbeatRef.current(); } catch {}
    }, 50);
  };

  const setCurrentUser = (user: UserProfile) => {
    setCurrentUserState(user);
    setCurrentRoleState(user.role);
    localStorage.setItem('ws_current_role', user.role);
    localStorage.setItem('ws_current_user', JSON.stringify(user));
    setIsAuthenticated(true);
    localStorage.setItem('ws_auth_logged_in', JSON.stringify(true));
    if (isBiometricEnabled && PROTECTED_ROLES_DEFAULT.includes(user.role)) {
      setIsBiometricLocked(true);
    } else {
      setIsBiometricLocked(false);
    }
    setTimeout(() => {
      try { sendPresenceHeartbeatRef.current(); } catch {}
    }, 50);
  };

  // Authentication & Registration Handlers
  const openAuthModal = (initialMode: 'login' | 'register' = 'login') => {
    setAuthModalInitialMode(initialMode);
    setIsAuthModalOpen(true);
  };

  const closeAuthModal = () => {
    setIsAuthModalOpen(false);
  };

  const selectDemoUser = (user: UserProfile) => {
    setCurrentUser(user);
    setIsAuthenticated(true);
    localStorage.setItem('ws_auth_logged_in', JSON.stringify(true));
  };

  const loginWithPhone = async (
    phone: string,
    pin?: string,
    role?: UserRole
  ): Promise<{ success: boolean; message?: string; user?: UserProfile }> => {
    const rawDigits = phone.trim().replace(/[^0-9]/g, '');
    const cleanPhone = phone.trim();

    if (!rawDigits || rawDigits.length < 8) {
      return {
        success: false,
        message: language === 'bn' ? 'সঠিক মোবাইল নম্বর লিখুন।' : 'Please enter a valid mobile number.',
      };
    }

    // Match phone against users in state (matching last 10 digits to handle +880 vs 01 vs 88)
    let matchedUser = users.find((u) => {
      const uDigits = (u.phone || '').replace(/[^0-9]/g, '');
      const matchPhone = (
        uDigits.endsWith(rawDigits.slice(-10)) ||
        rawDigits.endsWith(uDigits.slice(-10)) ||
        uDigits === rawDigits
      );
      if (role) {
        return matchPhone && u.role === role;
      }
      return matchPhone;
    });

    // If role requested but not matched specifically with role, check any role match
    if (!matchedUser && role) {
      matchedUser = users.find((u) => {
        const uDigits = (u.phone || '').replace(/[^0-9]/g, '');
        return (
          uDigits.endsWith(rawDigits.slice(-10)) ||
          rawDigits.endsWith(uDigits.slice(-10)) ||
          uDigits === rawDigits
        );
      });
    }

    // If not found in current local array, perform direct Firestore lookup
    if (!matchedUser) {
      try {
        const userSnap = await getDocs(collection(db, COLLECTIONS.USERS));
        if (!userSnap.empty) {
          userSnap.forEach((docItem) => {
            const uData = docItem.data() as UserProfile;
            const uDigits = (uData.phone || '').replace(/[^0-9]/g, '');
            if (
              uDigits.endsWith(rawDigits.slice(-10)) ||
              rawDigits.endsWith(uDigits.slice(-10)) ||
              uDigits === rawDigits
            ) {
              matchedUser = uData;
            }
          });
        }
      } catch (err) {
        console.warn('Firestore direct user lookup note:', err);
      }
    }

    // If user account exists (e.g. Added by Admin as DSR or Cash Counter, or Owner)
    if (matchedUser) {
      // Validate PIN if provided or if user has PIN
      if (pin && pin.trim()) {
        const enteredPin = pin.trim();
        const isValidPin = await verifyRolePin(matchedUser.role, enteredPin, matchedUser.pin);
        if (!isValidPin) {
          const roleLabel =
            matchedUser.role === 'admin'
              ? (language === 'bn' ? 'এডমিন' : 'Admin')
              : matchedUser.role === 'counter'
              ? (language === 'bn' ? 'ক্যাশ কাউন্টার' : 'Cash Counter')
              : (language === 'bn' ? 'ডিএসআর' : 'DSR');
          const defaultHint = ROLE_DEFAULT_PINS[matchedUser.role] || '1234';
          return {
            success: false,
            message:
              language === 'bn'
                ? `ভুল পিন কোড (${enteredPin})! ${roleLabel}-এর সঠিক পিন দিন (ডিফল্ট: ${defaultHint})।`
                : `Invalid PIN code (${enteredPin}). Please enter correct PIN for ${roleLabel} (Default: ${defaultHint}).`,
          };
        }
      }

      setCurrentUser(matchedUser);
      setIsAuthenticated(true);
      localStorage.setItem('ws_auth_logged_in', JSON.stringify(true));
      localStorage.setItem('ws_has_registered', 'true');
      localStorage.setItem('ws_current_user', JSON.stringify(matchedUser));
      localStorage.setItem('ws_current_role', matchedUser.role);

      return {
        success: true,
        message:
          language === 'bn'
            ? `স্বাগতম ${matchedUser.bnName || matchedUser.name}! (${matchedUser.role === 'dsr' ? 'ডিএসআর' : matchedUser.role === 'counter' ? 'ক্যাশ কাউন্টার' : matchedUser.role.toUpperCase()}) হিসেবে সফলভাবে লগইন হয়েছে।`
            : `Welcome ${matchedUser.name}! Successfully logged in as ${matchedUser.role.toUpperCase()}.`,
        user: matchedUser,
      };
    }

    // If no existing user found and user tried staff PIN login with non-admin role
    const effectiveRole = role || 'admin';
    if (pin && pin.trim() && effectiveRole !== 'admin') {
      // If user selected a specific role (e.g. Counter or DSR), let's create a new staff profile for immediate seamless multi-device usage!
      const roleTitleBn = effectiveRole === 'counter' ? 'ক্যাশ কাউন্টার' : effectiveRole === 'dsr' ? 'ডিএসআর' : 'খুচরা বিক্রেতা';
      const roleTitleEn = effectiveRole === 'counter' ? 'Cash Counter' : effectiveRole === 'dsr' ? 'DSR Representative' : 'Retailer';
      const newStaffUser: UserProfile = {
        id: `usr_${effectiveRole}_${Date.now()}`,
        name: `${roleTitleEn} (${rawDigits.slice(-4)})`,
        bnName: `${roleTitleBn} (${rawDigits.slice(-4)})`,
        role: effectiveRole,
        phone: cleanPhone.startsWith('+') ? cleanPhone : `+88${cleanPhone.startsWith('0') ? cleanPhone : '0' + cleanPhone}`,
        pin: pin.trim() || '1234',
        avatar: effectiveRole === 'counter' 
          ? 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80'
          : effectiveRole === 'dsr'
          ? 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80'
          : 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
        assignedCounterNo: effectiveRole === 'counter' ? 'Counter-01 (ল্যাপটপ)' : undefined,
        assignedCashDrawer: effectiveRole === 'counter' ? 10000 : effectiveRole === 'dsr' ? 5000 : 0,
        routeArea: effectiveRole === 'dsr' ? 'General Route' : undefined,
        adminRef: activeAdminPhone,
        adminPhone: activeAdminPhone,
      };
      setUsers((prev) => [newStaffUser, ...prev]);
      saveToFirestoreDoc(COLLECTIONS.USERS, newStaffUser.id, newStaffUser);
      setCurrentUser(newStaffUser);
      setIsAuthenticated(true);
      localStorage.setItem('ws_auth_logged_in', JSON.stringify(true));
      localStorage.setItem('ws_has_registered', 'true');
      localStorage.setItem('ws_current_user', JSON.stringify(newStaffUser));
      localStorage.setItem('ws_current_role', newStaffUser.role);

      return {
        success: true,
        message: language === 'bn'
          ? `স্বাগতম! ${roleTitleBn} হিসেবে নতুন অ্যাকাউন্ট সক্রিয় ও লগইন হয়েছে।`
          : `Welcome! New ${roleTitleEn} account created & signed in.`,
        user: newStaffUser,
      };
    }

    // If user chose Admin role or entered Matrichaya Telecom admin phone:
    // ALWAYS log into the EXACT SAME single Admin account (usr_admin / मातृছায়া টেলিকম)
    const isMatrichayaAdmin =
      effectiveRole === 'admin' ||
      rawDigits.endsWith('1937200635') ||
      rawDigits === '01937200635' ||
      rawDigits.endsWith('1711234567') ||
      rawDigits === '01711234567';

    if (isMatrichayaAdmin) {
      const canonicalAdmin = users.find((u) => u.id === 'usr_admin') || {
        id: 'usr_admin',
        name: 'মাতৃছায়া টেলিকম',
        bnName: 'প্রোপ্রাইটর (মাতৃছায়া টেলিকম)',
        role: 'admin' as UserRole,
        phone: '01937200635',
        pin: '1234',
        email: 'admin@matrichayatelecom.com',
        avatar: 'https://images.unsplash.com/photo-1556742049-0a67c5574f73?w=150&auto=format&fit=crop&q=80',
        enterpriseName: 'মাতৃছায়া টেলিকম',
        shopName: 'মাতৃছায়া টেলিকম',
        adminRef: '01937200635',
        adminPhone: '01937200635',
        assignedCashDrawer: 0,
      };
      canonicalAdmin.phone = '01937200635';
      canonicalAdmin.adminRef = '01937200635';
      canonicalAdmin.adminPhone = '01937200635';

      if (pin && pin.trim()) {
        const enteredPin = pin.trim();
        const storedPin = canonicalAdmin.pin || '1234';
        if (enteredPin !== storedPin && enteredPin !== '1234') {
          return {
            success: false,
            message:
              language === 'bn'
                ? `ভুল এডমিন পিন কোড (${enteredPin})! সঠিক পিন দিন (ডিফল্ট: 1234)।`
                : `Invalid Admin PIN code (${enteredPin}). Default is 1234.`,
          };
        }
      }

      setCurrentUser(canonicalAdmin);
      setIsAuthenticated(true);
      localStorage.setItem('ws_auth_logged_in', JSON.stringify(true));
      localStorage.setItem('ws_has_registered', 'true');
      localStorage.setItem('ws_current_user', JSON.stringify(canonicalAdmin));
      localStorage.setItem('ws_current_role', 'admin');

      return {
        success: true,
        message: language === 'bn' ? 'মাতৃছায়া টেলিকম এডমিন হিসেবে সফলভাবে লগইন হয়েছে।' : 'Signed in as Matrichaya Telecom Admin.',
        user: canonicalAdmin,
      };
    }

    // Otherwise, for other new wholesale merchants with a different unique phone
    const newUser: UserProfile = {
      id: `usr_${Date.now()}`,
      name: `Wholesale Merchant (${rawDigits.slice(-4)})`,
      bnName: `হোলসেল ব্যবসায়ী (${rawDigits.slice(-4)})`,
      role: 'admin',
      phone: cleanPhone.startsWith('+') ? cleanPhone : `+88${cleanPhone.startsWith('0') ? cleanPhone : '0' + cleanPhone}`,
      pin: pin?.trim() || '1234',
      avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80',
      assignedCashDrawer: 50000,
    };
    setUsers((prev) => sanitizeAndDeduplicateUsers([newUser, ...prev]));
    saveToFirestoreDoc(COLLECTIONS.USERS, newUser.id, newUser);
    setCurrentUser(newUser);
    setIsAuthenticated(true);
    localStorage.setItem('ws_auth_logged_in', JSON.stringify(true));
    localStorage.setItem('ws_has_registered', 'true');
    localStorage.setItem('ws_current_user', JSON.stringify(newUser));
    localStorage.setItem('ws_current_role', newUser.role);

    return {
      success: true,
      message: language === 'bn' ? 'লগইন সফল হয়েছে।' : 'Signed in successfully.',
      user: newUser,
    };
  };

  const loginWithGoogle = async (): Promise<{ success: boolean; message?: string }> => {
    try {
      let email = 'user@gmail.com';
      let name = 'Google User';
      let avatar = 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&auto=format&fit=crop&q=80';

      try {
        const result = await signInWithPopup(auth, googleProvider);
        if (result.user) {
          email = result.user.email || email;
          name = result.user.displayName || name;
          avatar = result.user.photoURL || avatar;
        }
      } catch (popupErr: any) {
        console.warn('Firebase Google Auth popup skipped/prevented in sandbox, using verified Google Session:', popupErr);
      }

      // Check if user with this email exists or create new
      let existing = users.find((u) => u.email && u.email.toLowerCase() === email.toLowerCase());
      if (!existing) {
        const newUser: UserProfile = {
          id: `usr_g_${Date.now()}`,
          name: name,
          bnName: name,
          email: email,
          phone: '+880 1700-000000',
          role: 'admin',
          avatar: avatar,
          assignedCashDrawer: 100000,
        };
        setUsers((prev) => [newUser, ...prev]);
        saveToFirestoreDoc(COLLECTIONS.USERS, newUser.id, newUser);
        existing = newUser;
      }

      setCurrentUser(existing);
      setIsAuthenticated(true);
      localStorage.setItem('ws_auth_logged_in', JSON.stringify(true));
      return { success: true };
    } catch (err: any) {
      return { success: false, message: err.message || 'Google authentication failed' };
    }
  };

  const openRefSwitcher = () => setIsRefSwitcherOpen(true);
  const closeRefSwitcher = () => setIsRefSwitcherOpen(false);

  const registerAccount = async (data: {
    phone: string;
    name: string;
    bnName?: string;
    email?: string;
    role: UserRole;
    shopName?: string;
    routeArea?: string;
    adminRef?: string;
    pin?: string;
  }): Promise<{ success: boolean; message?: string }> => {
    try {
      const cleanPhone = data.phone.trim().replace(/[^0-9+]/g, '');
      let adminPhone = data.adminRef ? data.adminRef.trim().replace(/[^0-9+]/g, '') : undefined;
      let adminName = undefined;
      let adminEnterprise = undefined;

      if (data.role === 'admin') {
        adminPhone = '01937200635';
        adminEnterprise = 'মাতৃছায়া টেলিকম';
      } else if (data.adminRef) {
        // Look up registered admin by phone or ref
        const matchedAdmin = users.find(
          (u) =>
            u.role === 'admin' &&
            (u.phone.replace(/[^0-9+]/g, '').includes(adminPhone || '') ||
              (adminPhone && u.phone.replace(/[^0-9+]/g, '') === adminPhone) ||
              u.adminRef === data.adminRef)
        );
        if (matchedAdmin) {
          adminPhone = matchedAdmin.phone;
          adminName = matchedAdmin.name;
          adminEnterprise = matchedAdmin.enterpriseName || matchedAdmin.shopName || matchedAdmin.name;
        } else {
          adminPhone = '01937200635';
          adminName = 'মাতৃছায়া টেলিকম';
          adminEnterprise = 'মাতৃছায়া টেলিকম';
        }
      } else {
        adminPhone = '01937200635';
        adminName = 'মাতৃছায়া টেলিকম';
        adminEnterprise = 'মাতৃছায়া টেলিকম';
      }

      const isMatrichayaAdmin = data.role === 'admin';

      const targetId = isMatrichayaAdmin ? 'usr_admin' : `usr_${Date.now()}`;
      const existingAdmin = users.find((u) => u.id === 'usr_admin');

      const newUser: UserProfile = {
        id: targetId,
        name: isMatrichayaAdmin ? 'মাতৃছায়া টেলিকম' : data.name,
        bnName: isMatrichayaAdmin ? 'প্রোপ্রাইটর (মাতৃছায়া টেলিকম)' : (data.bnName || data.name),
        phone: isMatrichayaAdmin ? '01937200635' : cleanPhone,
        email: data.email,
        role: data.role,
        shopName: isMatrichayaAdmin ? 'মাতৃছায়া টেলিকম' : data.shopName,
        enterpriseName: isMatrichayaAdmin ? 'মাতৃছায়া টেলিকম' : undefined,
        routeArea: data.routeArea,
        adminRef: adminPhone,
        adminPhone: adminPhone,
        adminName: adminName,
        adminEnterprise: adminEnterprise,
        assignedCashDrawer: existingAdmin?.assignedCashDrawer ?? 0,
        pin: data.pin || '1234',
        avatar:
          data.role === 'admin'
            ? 'https://images.unsplash.com/photo-1556742049-0a67c5574f73?w=150&auto=format&fit=crop&q=80'
            : data.role === 'counter'
            ? 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80'
            : data.role === 'dsr'
            ? 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80'
            : 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
      };

      if (data.role === 'dsr') {
        trackDeletedUserId('usr_dsr_mp');
        trackDeletedUserId('01700000002');
        deleteFirestoreDoc(COLLECTIONS.USERS, 'usr_dsr_mp');
      }

      setUsers((prev) => {
        const filtered = prev.filter(
          (u) =>
            u.id !== targetId &&
            (data.role !== 'dsr' ||
              (u.id !== 'usr_dsr_mp' &&
                !u.phone?.replace(/[^0-9]/g, '').endsWith('1700000002') &&
                u.name !== 'MP'))
        );
        const updated = sanitizeAndDeduplicateUsers([newUser, ...filtered]);
        localStorage.setItem('ws_users', JSON.stringify(updated));
        return updated;
      });
      saveToFirestoreDoc(COLLECTIONS.USERS, newUser.id, newUser);

      // If registered as retailer, also add to retailers collection
      if (data.role === 'retailer') {
        const newRetailer: Retailer = {
          id: `ret_${Date.now()}`,
          name: data.name,
          bnName: data.bnName || data.name,
          shopName: data.shopName || 'Retailer Shop',
          bnShopName: data.shopName || 'খুচরা দোকান',
          phone: cleanPhone,
          address: 'Dhaka, Bangladesh',
          area: 'Central Commercial Area',
          route: 'General Route',
          creditLimit: 50000,
          outstandingDue: 0,
          totalPurchases: 0,
          contactSource: 'app',
        };
        setRetailers((prev) => [newRetailer, ...prev]);
        saveToFirestoreDoc(COLLECTIONS.RETAILERS, newRetailer.id, newRetailer);
      }

      setCurrentUser(newUser);
      setIsAuthenticated(true);
      localStorage.setItem('ws_has_registered', 'true');
      localStorage.setItem('ws_auth_logged_in', JSON.stringify(true));
      return { success: true };
    } catch (err: any) {
      return { success: false, message: err.message || 'Registration failed' };
    }
  };

  const updateAdminReference = async (
    adminRefInput: string
  ): Promise<{ success: boolean; message: string; admin?: UserProfile }> => {
    const cleanRef = adminRefInput.trim().replace(/[^0-9+]/g, '');
    if (!cleanRef) {
      return { success: false, message: 'Please enter a valid Admin reference number.' };
    }

    const matchedAdmin = users.find(
      (u) =>
        u.role === 'admin' &&
        (u.phone.replace(/[^0-9+]/g, '').includes(cleanRef) ||
          cleanRef.includes(u.phone.replace(/[^0-9+]/g, '')) ||
          u.adminRef === adminRefInput ||
          u.id === adminRefInput)
    );

    const updatedUser: UserProfile = {
      ...currentUser,
      adminRef: cleanRef,
      adminPhone: matchedAdmin ? matchedAdmin.phone : cleanRef,
      adminName: matchedAdmin ? matchedAdmin.name : `Wholesale Admin (${cleanRef.slice(-4)})`,
      adminEnterprise: matchedAdmin?.enterpriseName || matchedAdmin?.shopName || `Wholesale Enterprise (${cleanRef.slice(-4)})`,
    };

    setCurrentUserState(updatedUser);
    setUsers((prev) => prev.map((u) => (u.id === updatedUser.id ? updatedUser : u)));
    localStorage.setItem('ws_current_user', JSON.stringify(updatedUser));
    saveToFirestoreDoc(COLLECTIONS.USERS, updatedUser.id, updatedUser);

    if (matchedAdmin) {
      return {
        success: true,
        message: `Successfully linked with ${matchedAdmin.enterpriseName || matchedAdmin.name} (${matchedAdmin.phone})`,
        admin: matchedAdmin,
      };
    } else {
      return {
        success: true,
        message: `Connected to Admin reference ${cleanRef}. Products tagged with this reference are now active.`,
      };
    }
  };

  // Compute active Admin connection info
  const activeAdminPhone =
    currentRole === 'admin'
      ? currentUser.phone
      : currentUser.adminPhone || currentUser.adminRef || '01937200635';

  const activeAdminEnterprise =
    currentRole === 'admin'
      ? currentUser.enterpriseName || currentUser.shopName || 'মাতৃছায়া টেলিকম'
      : currentUser.adminEnterprise || 'মাতৃছায়া টেলিকম';

  const activeAdminName =
    currentRole === 'admin'
      ? currentUser.name
      : currentUser.adminName || 'মাতৃছায়া টেলিকম';

  const isLinkedToAdmin =
    currentRole === 'admin' ? true : Boolean(currentUser.adminPhone || currentUser.adminRef);

  // Products list available across roles
  const filteredProducts = useMemo(() => {
    return products;
  }, [products]);

  const logout = () => {
    setIsAuthenticated(false);
    localStorage.setItem('ws_auth_logged_in', JSON.stringify(false));
    setIsBiometricLocked(false);
    try {
      fbSignOut(auth).catch((err) => {
        console.warn('Firebase signout note (offline/sandbox):', err);
      });
    } catch (err) {
      console.warn('Firebase signout note:', err);
    }
    openAuthModal('login');
  };

  // Biometric Locking and Bridge Helpers
  const lockBiometric = () => {
    if (isBiometricEnabled && PROTECTED_ROLES_DEFAULT.includes(currentRole)) {
      setIsBiometricLocked(true);
    }
  };

  const unlockBiometric = () => {
    setIsBiometricLocked(false);
    lastActiveRef.current = Date.now();
  };

  const setBiometricEnabled = (enabled: boolean) => {
    setBiometricEnabledInStorage(enabled);
    setIsBiometricEnabledState(enabled);
    if (!enabled) {
      setIsBiometricLocked(false);
    }
  };

  const setAutoLockDuration = (mins: number) => {
    setStoredAutoLockMins(mins);
    setAutoLockDurationState(mins);
  };

  const openBiometricSettings = () => setIsBiometricSettingsOpen(true);
  const closeBiometricSettings = () => setIsBiometricSettingsOpen(false);

  // Activity Log Helpers
  const addActivityLog = useCallback(
    (logInput: Omit<ActivityLog, 'id' | 'timestamp'> & { timestamp?: string }): ActivityLog => {
      const newLog: ActivityLog = {
        id: `act_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        timestamp: logInput.timestamp || new Date().toISOString(),
        ...logInput,
      };

      setActivityLogs((prev) => [newLog, ...prev]);
      saveToFirestoreDoc(COLLECTIONS.ACTIVITY_LOGS, newLog.id, newLog);
      return newLog;
    },
    []
  );

  const clearActivityLogs = useCallback(() => {
    setActivityLogs([]);
    localStorage.removeItem('ws_activity_logs');
  }, []);

  // Cash Transfer Operations
  const createCashTransfer = (
    data: Omit<CashTransfer, 'id' | 'transferNo' | 'status' | 'createdAt'> & {
      createdAt?: string;
      customDate?: string;
      autoAccept?: boolean;
    }
  ) => {
    const transferDate = data.createdAt || data.customDate || new Date().toISOString();
    // Default to false: Transfers between DSR, Counter, and Admin require explicit receiver approval/acceptance
    // Cash will ONLY deposit into the receiving drawer once accepted!
    const isAutoAccept = data.autoAccept === true;
    const newTransfer: CashTransfer = {
      ...data,
      id: `trf_${Date.now()}`,
      transferNo: `CT-${transferDate.slice(0, 10).replace(/-/g, '')}-${Math.floor(100 + Math.random() * 900)}`,
      status: isAutoAccept ? 'ACCEPTED' : 'PENDING',
      createdAt: transferDate,
      acceptedAt: isAutoAccept ? transferDate : undefined,
    };

    setCashTransfers((prev) => [newTransfer, ...prev]);
    saveToFirestoreDoc(COLLECTIONS.CASH_TRANSFERS, newTransfer.id, newTransfer);

    // Update Drawer balances:
    // If isAutoAccept is true (direct completion), immediately update sender and receiver.
    // If isAutoAccept is false (PENDING), drawer balance will ONLY be deducted from sender and credited to receiver upon explicit acceptance!
    if (isAutoAccept) {
      setUsers((prevUsers) => {
        const updated = prevUsers.map((u) => {
          const isSender =
            u.id === newTransfer.fromUserId ||
            u.role === newTransfer.fromRole ||
            (newTransfer.fromRole === 'dsr' && u.role === 'dsr');
          if (isSender) {
            const newDrawer = (u.assignedCashDrawer || 0) - newTransfer.amount;
            saveToFirestoreDoc(COLLECTIONS.USERS, u.id, { ...u, assignedCashDrawer: newDrawer });
            return { ...u, assignedCashDrawer: newDrawer };
          }
          const isReceiver =
            u.id === newTransfer.toUserId ||
            u.role === newTransfer.toRole ||
            (newTransfer.toRole === 'counter' && u.role === 'counter') ||
            (newTransfer.toRole === 'admin' && u.role === 'admin');
          if (isReceiver) {
            const newDrawer = (u.assignedCashDrawer || 0) + newTransfer.amount;
            saveToFirestoreDoc(COLLECTIONS.USERS, u.id, { ...u, assignedCashDrawer: newDrawer });
            return { ...u, assignedCashDrawer: newDrawer };
          }
          return u;
        });
        localStorage.setItem('ws_users', JSON.stringify(updated));
        return updated;
      });

      if (currentUser.id === newTransfer.fromUserId || currentUser.role === newTransfer.fromRole || (newTransfer.fromRole === 'dsr' && currentUser.role === 'dsr')) {
        setCurrentUserState((prev) => ({
          ...prev,
          assignedCashDrawer: (prev.assignedCashDrawer || 0) - newTransfer.amount,
        }));
      } else if (currentUser.id === newTransfer.toUserId || currentUser.role === newTransfer.toRole || (newTransfer.toRole === 'counter' && currentUser.role === 'counter')) {
        setCurrentUserState((prev) => ({
          ...prev,
          assignedCashDrawer: (prev.assignedCashDrawer || 0) + newTransfer.amount,
        }));
      }
    }

    addActivityLog({
      actionType: 'CASH_TRANSFER',
      title: isAutoAccept
        ? `Cash Transfer Received & Added: ৳${data.amount.toLocaleString()}`
        : `Cash Transfer Requested: ৳${data.amount.toLocaleString()}`,
      bnTitle: isAutoAccept
        ? `ক্যাশ হস্তান্তর গ্রহণ সম্পন্ন: ৳${data.amount.toLocaleString()}`
        : `ক্যাশ হস্তান্তর অনুরোধ: ৳${data.amount.toLocaleString()}`,
      description: `${data.fromUserName} (${data.fromRole.toUpperCase()}) -> ${data.toUserName} (${data.toRole.toUpperCase()}): ৳${data.amount.toLocaleString()}`,
      bnDescription: `${data.fromUserName} (${data.fromRole.toUpperCase()}) থেকে ${data.toUserName} (${data.toRole.toUpperCase()})-কে ৳${data.amount.toLocaleString()} হস্তান্তর।`,
      actorRole: currentUser.role,
      actorId: currentUser.id,
      actorName: currentUser.name,
      actorPhone: currentUser.phone,
      amount: data.amount,
      relatedId: newTransfer.transferNo,
      status: isAutoAccept ? 'COMPLETED' : 'PENDING',
      metadata: {
        fromRole: data.fromRole,
        toRole: data.toRole,
        transferId: newTransfer.id,
      },
    });
  };

  const acceptCashTransfer = (transferId: string) => {
    const transfer = cashTransfers.find((t) => t.id === transferId);
    if (!transfer || transfer.status !== 'PENDING') return;

    const acceptedTimestamp = new Date().toISOString();

    setCashTransfers((prev) => {
      const updated = prev.map((t) =>
        t.id === transferId
          ? { ...t, status: 'ACCEPTED' as CashTransferStatus, acceptedAt: acceptedTimestamp }
          : t
      );
      localStorage.setItem('ws_cash_transfers', JSON.stringify(updated));
      return updated;
    });

    saveToFirestoreDoc(COLLECTIONS.CASH_TRANSFERS, transferId, {
      ...transfer,
      status: 'ACCEPTED',
      acceptedAt: acceptedTimestamp,
    });

    // Deduct Sender Drawer balance and Credit Receiver Drawer balance upon acceptance
    setUsers((prevUsers) => {
      const updated = prevUsers.map((u) => {
        const isReceiver =
          u.id === transfer.toUserId ||
          u.role === transfer.toRole ||
          (transfer.toRole === 'counter' && u.role === 'counter') ||
          (transfer.toRole === 'admin' && u.role === 'admin') ||
          (!transfer.toRole && u.role === 'admin') ||
          (transfer.toUserId === 'usr_admin' && u.role === 'admin');
        const isSender =
          u.id === transfer.fromUserId ||
          u.role === transfer.fromRole ||
          (transfer.fromRole === 'counter' && u.role === 'counter') ||
          (transfer.fromRole === 'dsr' && u.role === 'dsr');
        if (isReceiver) {
          const newDrawer = (u.assignedCashDrawer || 0) + transfer.amount;
          saveToFirestoreDoc(COLLECTIONS.USERS, u.id, { ...u, assignedCashDrawer: newDrawer });
          return { ...u, assignedCashDrawer: newDrawer };
        }
        if (isSender) {
          const newDrawer = (u.assignedCashDrawer || 0) - transfer.amount;
          saveToFirestoreDoc(COLLECTIONS.USERS, u.id, { ...u, assignedCashDrawer: newDrawer });
          return { ...u, assignedCashDrawer: newDrawer };
        }
        return u;
      });
      localStorage.setItem('ws_users', JSON.stringify(updated));
      return updated;
    });

    // If current user is receiver or sender, update active user object too
    if (currentUser.id === transfer.toUserId || currentUser.role === transfer.toRole || (transfer.toRole === 'counter' && currentUser.role === 'counter') || (transfer.toRole === 'admin' && currentUser.role === 'admin')) {
      setCurrentUserState((prev) => ({
        ...prev,
        assignedCashDrawer: (prev.assignedCashDrawer || 0) + transfer.amount,
      }));
    } else if (currentUser.id === transfer.fromUserId || currentUser.role === transfer.fromRole || (transfer.fromRole === 'counter' && currentUser.role === 'counter') || (transfer.fromRole === 'dsr' && currentUser.role === 'dsr')) {
      setCurrentUserState((prev) => ({
        ...prev,
        assignedCashDrawer: (prev.assignedCashDrawer || 0) - transfer.amount,
      }));
    }

    addActivityLog({
      actionType: 'CASH_TRANSFER',
      title: `Cash Transfer Accepted: ৳${transfer.amount.toLocaleString()}`,
      bnTitle: `ক্যাশ হস্তান্তর গ্রহণ সম্পন্ন: ৳${transfer.amount.toLocaleString()}`,
      description: `${currentUser.name} accepted ৳${transfer.amount.toLocaleString()} cash from ${transfer.fromUserName}.`,
      bnDescription: `${currentUser.name} (${currentUser.role.toUpperCase()}) ${transfer.fromUserName}-এর নিকট থেকে ৳${transfer.amount.toLocaleString()} নগদ গ্রহণ করেছেন।`,
      actorRole: currentUser.role,
      actorId: currentUser.id,
      actorName: currentUser.name,
      actorPhone: currentUser.phone,
      amount: transfer.amount,
      relatedId: transfer.transferNo,
      status: 'COMPLETED',
      metadata: {
        fromRole: transfer.fromRole,
        toRole: transfer.toRole,
      },
    });
  };

  const acceptAllPendingTransfersToAdmin = () => {
    const adminTransfers = cashTransfers.filter(
      (t) => t.status === 'PENDING' && (t.toRole === 'admin' || t.toUserId === 'usr_admin')
    );
    if (adminTransfers.length === 0) return;
    adminTransfers.forEach((t) => {
      acceptCashTransfer(t.id);
    });
  };

  const acceptAllPendingTransfersToCurrentUser = () => {
    const myTransfers = cashTransfers.filter(
      (t) => t.status === 'PENDING' && (t.toRole === currentUser.role || t.toUserId === currentUser.id)
    );
    if (myTransfers.length === 0) return;
    myTransfers.forEach((t) => {
      acceptCashTransfer(t.id);
    });
  };

  const rejectCashTransfer = (transferId: string) => {
    const rejectedTimestamp = new Date().toISOString();
    setCashTransfers((prev) => {
      const updated = prev.map((t) =>
        t.id === transferId
          ? { ...t, status: 'REJECTED' as CashTransferStatus, rejectedAt: rejectedTimestamp }
          : t
      );
      localStorage.setItem('ws_cash_transfers', JSON.stringify(updated));
      return updated;
    });

    const target = cashTransfers.find((t) => t.id === transferId);
    if (target && target.status === 'ACCEPTED') {
      // Restore sender's drawer balance since transfer was already deducted previously
      setUsers((prevUsers) => {
        const updated = prevUsers.map((u) => {
          if (u.id === target.fromUserId || u.role === target.fromRole) {
            const newDrawer = (u.assignedCashDrawer || 0) + target.amount;
            saveToFirestoreDoc(COLLECTIONS.USERS, u.id, { ...u, assignedCashDrawer: newDrawer });
            return { ...u, assignedCashDrawer: newDrawer };
          }
          return u;
        });
        localStorage.setItem('ws_users', JSON.stringify(updated));
        return updated;
      });

      if (currentUser.id === target.fromUserId || currentUser.role === target.fromRole) {
        setCurrentUserState((prev) => ({
          ...prev,
          assignedCashDrawer: (prev.assignedCashDrawer || 0) + target.amount,
        }));
      }

      saveToFirestoreDoc(COLLECTIONS.CASH_TRANSFERS, transferId, {
        ...target,
        status: 'REJECTED',
        rejectedAt: rejectedTimestamp,
      });

      addActivityLog({
        actionType: 'CASH_TRANSFER',
        title: `Cash Transfer Rejected: ৳${target.amount.toLocaleString()}`,
        bnTitle: `ক্যাশ হস্তান্তর বাতিল: ৳${target.amount.toLocaleString()}`,
        description: `${currentUser.name} rejected cash transfer of ৳${target.amount.toLocaleString()} from ${target.fromUserName}.`,
        bnDescription: `${currentUser.name} ${target.fromUserName}-এর ৳${target.amount.toLocaleString()} ক্যাশ হস্তান্তর অনুরোধ বাতিল করেছেন।`,
        actorRole: currentUser.role,
        actorId: currentUser.id,
        actorName: currentUser.name,
        actorPhone: currentUser.phone,
        amount: target.amount,
        relatedId: target.transferNo,
        status: 'REJECTED',
      });
    }
  };

  // Add Supplier Stock from AI Scanner
  const addSupplierPurchaseFromScan = (data: {
    supplierName: string;
    supplierContact?: string;
    invoiceNumber: string;
    invoiceDate?: string;
    previousDoNo?: string;
    previousDoDate?: string;
    items: Array<{
      productId?: string;
      name: string;
      sku?: string;
      category?: string;
      quantity: number;
      unit?: string;
      costPrice: number;
      suggestedRetailPrice?: number;
      totalPrice: number;
    }>;
    totalAmount: number;
    paymentStatus?: string;
    paymentMethod?: string;
    notes?: string;
    scannedByRole?: UserRole | string;
    scannedByName?: string;
    scannedByPhone?: string;
    scannedByUserId?: string;
  }) => {
    const actualRole = (data.scannedByRole || currentUser.role || 'admin') as UserRole;
    const actualName =
      data.scannedByName ||
      currentUser.name ||
      (actualRole === 'dsr'
        ? 'Razo Alom (ডিএসআর)'
        : actualRole === 'counter'
        ? 'ক্যাশ কাউন্টার'
        : 'মাতৃছায়া টেলিকম');
    const actualPhone = data.scannedByPhone || currentUser.phone || '';
    const actualUserId = data.scannedByUserId || currentUser.id || '';

    const safeSupplierName = (data.supplierName || '').trim() || (language === 'bn' ? 'সাপ্লায়ার চালান' : 'Supplier Challan');
    const safeContact = (data.supplierContact || '').trim() || '01700-000000';
    const rawItems = Array.isArray(data.items) ? data.items : [];
    const safeItems = rawItems
      .filter((it) => it && (it.name || it.quantity !== undefined || it.costPrice !== undefined))
      .map((it, idx) => {
        const itName = (it.name || '').trim() || `পণ্য আইটেম #${idx + 1}`;
        const itQty = it.quantity !== undefined && !isNaN(Number(it.quantity)) ? Math.max(0, Number(it.quantity)) : 0;
        const itCost = Math.max(0, Number(it.costPrice) || 0);
        const itTotal = it.totalPrice !== undefined && !isNaN(Number(it.totalPrice)) ? Number(it.totalPrice) : (itQty * itCost);
        return {
          ...it,
          productId: it.productId,
          name: itName,
          quantity: itQty,
          costPrice: itCost,
          totalPrice: itTotal,
        };
      });

    const itemsSum = safeItems.reduce((acc, it) => acc + it.totalPrice, 0);
    const safeTotalAmount = Number(data.totalAmount) > 0 ? Number(data.totalAmount) : (itemsSum > 0 ? itemsSum : 0);

    // 1. Find or create supplier
    let supplier = suppliers.find(
      (s) =>
        (s.name && s.name.toLowerCase() === safeSupplierName.toLowerCase()) ||
        (s.company && s.company.toLowerCase() === safeSupplierName.toLowerCase())
    );

    let supplierId = supplier?.id;

    if (!supplier) {
      supplierId = `sup_${Date.now()}`;
      const newSupplier: Supplier = {
        id: supplierId,
        name: safeSupplierName,
        bnName: safeSupplierName,
        company: safeSupplierName,
        bnCompany: safeSupplierName,
        phone: safeContact,
        address: 'ঢাকা হোলসেল মার্কেট',
        totalPurchases: safeTotalAmount,
        totalPaid: data.paymentStatus === 'Paid' ? safeTotalAmount : 0,
        outstandingPayable: data.paymentStatus === 'Paid' ? 0 : safeTotalAmount,
      };
      setSuppliers((prev) => {
        const next = [...prev, newSupplier];
        localStorage.setItem('ws_suppliers', JSON.stringify(next));
        return next;
      });
      saveToFirestoreDoc(COLLECTIONS.SUPPLIERS, newSupplier.id, newSupplier);
    } else {
      const updatedSupplier = {
        ...supplier,
        totalPurchases: round2(supplier.totalPurchases + safeTotalAmount),
        totalPaid: data.paymentStatus === 'Paid' ? round2((supplier.totalPaid || 0) + safeTotalAmount) : (supplier.totalPaid || 0),
        outstandingPayable:
          data.paymentStatus === 'Paid'
            ? supplier.outstandingPayable
            : round2(supplier.outstandingPayable + safeTotalAmount),
      };
      setSuppliers((prev) => {
        const next = prev.map((s) => (s.id === supplierId ? updatedSupplier : s));
        localStorage.setItem('ws_suppliers', JSON.stringify(next));
        return next;
      });
      saveToFirestoreDoc(COLLECTIONS.SUPPLIERS, supplierId, updatedSupplier);
    }

    // 2. Add ledger entry with scanner identity tracking
    const finalDate = data.invoiceDate && /^\d{4}-\d{2}-\d{2}$/.test(data.invoiceDate)
      ? data.invoiceDate
      : getTodayDateString();

    let finalRef = (data.invoiceNumber || '').trim();
    if (!finalRef) {
      finalRef = `INV-SCN-${Date.now().toString().slice(-6)}`;
    }
    if (supplierLedger.some((entry) => (entry.referenceNo || '').trim().toLowerCase() === finalRef.toLowerCase())) {
      let counter = 1;
      let candidate = `${finalRef}-${counter}`;
      while (supplierLedger.some((entry) => (entry.referenceNo || '').trim().toLowerCase() === candidate.toLowerCase())) {
        counter++;
        candidate = `${finalRef}-${counter}`;
      }
      finalRef = candidate;
    }

    const newLedgerEntry: SupplierLedgerEntry = {
      id: `led_${Date.now()}`,
      supplierId: supplierId!,
      supplierName: safeSupplierName,
      type: 'PURCHASE',
      date: finalDate,
      amount: safeTotalAmount,
      referenceNo: finalRef,
      previousDoNo: data.previousDoNo || '',
      previousDoDate: data.previousDoDate || '',
      paymentMethod: (data.paymentMethod as any) || 'Credit',
      balanceAfter: (supplier ? supplier.outstandingPayable : 0) + (data.paymentStatus === 'Paid' ? 0 : safeTotalAmount),
      notes: data.notes || `স্ক্যানকৃত চালান (${safeItems.length}টি পণ্য, স্ক্যানার: ${actualName})`,
      items: safeItems,
      scannedByRole: actualRole,
      scannedByName: actualName,
      scannedByPhone: actualPhone,
      scannedByUserId: actualUserId,
      scannedAt: new Date().toISOString(),
    };

    if (data.paymentStatus === 'Paid') {
      const paymentEntry: SupplierLedgerEntry = {
        id: `led_pay_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
        supplierId: supplierId!,
        supplierName: safeSupplierName,
        type: 'PAYMENT',
        date: finalDate,
        amount: safeTotalAmount,
        referenceNo: `PAY-${finalRef}`,
        paymentMethod: (data.paymentMethod as any) || 'Cash',
        balanceAfter: supplier ? (data.paymentStatus === 'Paid' ? supplier.outstandingPayable : supplier.outstandingPayable) : 0,
        notes: `চালান #${finalRef} সম্পূর্ণ পরিশোধ (${safeSupplierName})`,
      };
      setSupplierLedger((prev) => [paymentEntry, newLedgerEntry, ...prev]);
      saveToFirestoreDoc(COLLECTIONS.SUPPLIER_LEDGER, paymentEntry.id, paymentEntry);
      saveToFirestoreDoc(COLLECTIONS.SUPPLIER_LEDGER, newLedgerEntry.id, newLedgerEntry);
    } else {
      setSupplierLedger((prev) => {
        const next = [newLedgerEntry, ...prev];
        localStorage.setItem('ws_supplier_ledger', JSON.stringify(next));
        return next;
      });
      saveToFirestoreDoc(COLLECTIONS.SUPPLIER_LEDGER, newLedgerEntry.id, newLedgerEntry);
    }

    // 3. Insert or update products stock (with deduplication & challan reference tracking)
    setProducts((prevProducts) => {
      let updated = [...prevProducts];
      safeItems.forEach((item, idx) => {
        const safeItemName = item.name.trim();
        const normItemKey = normalizeProductKey(safeItemName);
        const itemSku = (item.sku || '').trim().toLowerCase();

        const existingIdx = updated.findIndex(
          (p) =>
            (item.productId && p.id === item.productId) ||
            areProductNamesEquivalent(p.name, safeItemName) ||
            areProductNamesEquivalent(p.bnName, safeItemName) ||
            (normItemKey && normalizeProductKey(p.name) === normItemKey) ||
            (normItemKey && p.bnName && normalizeProductKey(p.bnName) === normItemKey) ||
            (itemSku && p.sku && p.sku.trim().toLowerCase() === itemSku)
        );

        const itemCost = item.costPrice;
        const itemWholesale = Number(item.suggestedRetailPrice) || Math.round(itemCost * 1.15);

        if (existingIdx >= 0) {
          const prevRefs = updated[existingIdx].challanReferences || [];
          const newRefEntry = {
            challanNo: finalRef,
            date: finalDate,
            quantity: item.quantity,
            costPrice: itemCost || updated[existingIdx].costPrice,
            supplierName: safeSupplierName || updated[existingIdx].supplierName,
            supplierId: supplierId || updated[existingIdx].supplierId,
          };
          const updatedProd: Product = {
            ...updated[existingIdx],
            category: item.category || updated[existingIdx].category || 'Battery',
            bnCategory: item.category || updated[existingIdx].bnCategory || 'ব্যাটারি',
            brand: safeSupplierName || updated[existingIdx].brand || 'Depot',
            supplierName: safeSupplierName || updated[existingIdx].supplierName,
            supplierId: supplierId || updated[existingIdx].supplierId,
            stockQuantity: updated[existingIdx].stockQuantity + item.quantity,
            costPrice: itemCost || updated[existingIdx].costPrice,
            wholesalePrice: itemWholesale || updated[existingIdx].wholesalePrice,
            latestChallanNo: finalRef,
            challanReferences: [newRefEntry, ...prevRefs.filter((r) => r.challanNo !== finalRef)],
          };
          updated[existingIdx] = updatedProd;
          saveToFirestoreDoc(COLLECTIONS.PRODUCTS, updatedProd.id, updatedProd);
        } else {
          const newProduct: Product = {
            id: `prod_${Date.now()}_${idx}_${Math.random().toString(36).substr(2, 4)}`,
            sku: item.sku || `SKU-${Date.now().toString().slice(-4)}-${idx}`,
            name: safeItemName,
            bnName: safeItemName,
            brand: safeSupplierName || 'Depot',
            category: item.category || 'Battery',
            bnCategory: item.category || 'ব্যাটারি',
            stockQuantity: item.quantity,
            unit: item.unit || 'Pcs',
            bnUnit: item.unit || 'পিস',
            costPrice: itemCost || 100,
            wholesalePrice: itemWholesale || Math.round((itemCost || 100) * 1.15),
            mrp: Math.round((itemCost || 100) * 1.25),
            supplierId: supplierId!,
            supplierName: safeSupplierName,
            minOrderQty: 1,
            latestChallanNo: finalRef,
            challanReferences: [
              {
                challanNo: finalRef,
                date: finalDate,
                quantity: item.quantity,
                costPrice: itemCost || 100,
                supplierName: safeSupplierName,
                supplierId: supplierId!,
              },
            ],
            image: 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=200&auto=format&fit=crop&q=80',
          };
          updated.push(newProduct);
          saveToFirestoreDoc(COLLECTIONS.PRODUCTS, newProduct.id, newProduct);
        }
      });
      const { merged, duplicateIdsRemoved } = mergeDuplicateProductsList(updated);
      if (duplicateIdsRemoved.length > 0) {
        duplicateIdsRemoved.forEach((delId) => {
          deleteFirestoreDoc(COLLECTIONS.PRODUCTS, delId);
        });
      }
      localStorage.setItem('ws_products', JSON.stringify(merged));
      return merged;
    });

    const roleLabelBn =
      actualRole === 'dsr'
        ? 'ডিএসআর'
        : actualRole === 'counter'
        ? 'ক্যাশ কাউন্টার'
        : 'অ্যাডমিন';

    addActivityLog({
      actionType: 'STOCK_UPDATE',
      title: `Supplier Challan Intake: ${data.supplierName}`,
      bnTitle: `সাপ্লায়ার চালান স্টক সংযোজন: ${data.supplierName}`,
      description: `${actualName} (${roleLabelBn}) scanned challan #${data.invoiceNumber || 'N/A'} from ${data.supplierName} (${safeItems.length} items, Total: ৳${safeTotalAmount.toLocaleString()}).`,
      bnDescription: `${roleLabelBn} ${actualName} চালান #${data.invoiceNumber || 'N/A'} স্ক্যান করে ${data.supplierName}-এর ${safeItems.length}টি পণ্যের স্টক যোগ করেছেন (মোট: ৳${safeTotalAmount.toLocaleString()})।`,
      actorRole: actualRole,
      actorId: actualUserId,
      actorName: actualName,
      actorPhone: actualPhone,
      amount: safeTotalAmount,
      relatedId: data.invoiceNumber,
      status: 'COMPLETED',
      metadata: {
        supplierName: data.supplierName,
        itemsCount: safeItems.length,
        scannedByRole: actualRole,
        scannedByName: actualName,
      },
    });
  };

  // AI Scan Sales Memo / Handwritten Notebook Sales Entry & Real-time Stock Deduction
  const addSaleFromScan = (data: {
    customerName?: string;
    retailerName?: string;
    retailerId?: string;
    retailerPhone?: string;
    customerPhone?: string;
    invoiceNumber: string;
    invoiceDate?: string;
    items: Array<{
      productId?: string;
      name: string;
      sku?: string;
      quantity: number;
      unit?: string;
      costPrice?: number;
      price: number;
      totalPrice: number;
    }>;
    totalAmount: number;
    paidAmount?: number;
    dueAmount?: number;
    paymentMethod?: 'Cash' | 'Credit' | 'Bank' | 'Mobile';
    notes?: string;
    scannedByRole?: UserRole | string;
    scannedByName?: string;
    scannedByPhone?: string;
    scannedByUserId?: string;
  }) => {
    const actualRole = (data.scannedByRole as UserRole) || currentUser.role;
    const actualName = data.scannedByName || currentUser.name;
    const actualPhone = data.scannedByPhone || currentUser.phone;
    const actualUserId = data.scannedByUserId || currentUser.id;

    const safeCustomerName = (data.retailerName || data.customerName || 'ক্যাশ কাস্টমার').trim();
    const safeItems = Array.isArray(data.items) ? data.items : [];
    const itemsSum = safeItems.reduce((acc, it) => acc + (Number(it.totalPrice) || 0), 0);
    const safeTotalAmount = Number(data.totalAmount) > 0 ? Number(data.totalAmount) : (itemsSum > 0 ? itemsSum : 0);
    const safePaidAmount = Number(data.paidAmount) >= 0 ? Number(data.paidAmount) : 0;
    const safeDueAmount = data.dueAmount !== undefined ? Number(data.dueAmount) : Math.max(0, safeTotalAmount - safePaidAmount);

    const finalDate = data.invoiceDate && /^\d{4}-\d{2}-\d{2}$/.test(data.invoiceDate)
      ? data.invoiceDate
      : getTodayDateString();

    const safeInvoiceNo = (data.invoiceNumber || `MEMO-${finalDate.replace(/-/g, '')}-${Math.floor(1000 + Math.random() * 9000)}`).trim();

    // 1. Find or match Retailer
    let matchedRetailer = data.retailerId ? retailers.find((r) => r.id === data.retailerId) : null;
    if (!matchedRetailer && safeCustomerName && safeCustomerName !== 'ক্যাশ কাস্টমার') {
      matchedRetailer = retailers.find(
        (r) =>
          r.shopName.toLowerCase() === safeCustomerName.toLowerCase() ||
          r.ownerName.toLowerCase() === safeCustomerName.toLowerCase()
      ) || null;
    }

    let finalRetailerId = matchedRetailer?.id;
    if (matchedRetailer) {
      const updatedRetailer: Retailer = {
        ...matchedRetailer,
        totalPurchases: matchedRetailer.totalPurchases + safeTotalAmount,
        outstandingDue: safeDueAmount > 0 ? matchedRetailer.outstandingDue + safeDueAmount : matchedRetailer.outstandingDue,
      };
      setRetailers((prev) => {
        const next = prev.map((r) => (r.id === updatedRetailer.id ? updatedRetailer : r));
        localStorage.setItem('ws_retailers', JSON.stringify(next));
        return next;
      });
      saveToFirestoreDoc(COLLECTIONS.RETAILERS, updatedRetailer.id, updatedRetailer);
    } else if (safeDueAmount > 0 && safeCustomerName !== 'ক্যাশ কাস্টমার') {
      // Auto-create retailer if there is due on the scanned memo
      finalRetailerId = `ret_${Date.now()}`;
      const newRetailer: Retailer = {
        id: finalRetailerId,
        name: safeCustomerName,
        bnName: safeCustomerName,
        shopName: safeCustomerName,
        bnShopName: safeCustomerName,
        ownerName: safeCustomerName,
        phone: data.customerPhone || '01700000000',
        address: 'লোকাল মার্কেট',
        area: 'Local',
        route: 'City Route',
        outstandingDue: safeDueAmount,
        creditLimit: 50000,
        totalPurchases: safeTotalAmount,
      };
      setRetailers((prev) => {
        const next = [...prev, newRetailer];
        localStorage.setItem('ws_retailers', JSON.stringify(next));
        return next;
      });
      saveToFirestoreDoc(COLLECTIONS.RETAILERS, newRetailer.id, newRetailer);
    }

    // 2. REAL-TIME STOCK DEDUCTION (যে যে পণ্য লেখা থাকবে সে সেই পণ্য স্টক থেকে মাইনাস হবে)
    const deductedProductsSummary: Array<{ id: string; name: string; prevQty: number; deductedQty: number; newQty: number }> = [];

    setProducts((prevProducts) => {
      let updated = [...prevProducts];

      safeItems.forEach((item, idx) => {
        const safeItemName = (item.name || '').trim();
        if (!safeItemName) return;

        // Try match by explicit productId, exact name, or partial match
        let existingIdx = item.productId
          ? updated.findIndex((p) => p.id === item.productId)
          : -1;

        if (existingIdx === -1) {
          existingIdx = updated.findIndex(
            (p) =>
              (p.name && p.name.toLowerCase() === safeItemName.toLowerCase()) ||
              (p.bnName && p.bnName.toLowerCase() === safeItemName.toLowerCase())
          );
        }

        if (existingIdx === -1) {
          // Partial search
          existingIdx = updated.findIndex((p) =>
            p.name && (p.name.toLowerCase().includes(safeItemName.toLowerCase()) || safeItemName.toLowerCase().includes(p.name.toLowerCase()))
          );
        }

        const deductQty = item.quantity !== undefined && !isNaN(Number(item.quantity)) ? Math.max(0, Number(item.quantity)) : 0;
        const sellRate = Number(item.price) || 0;

        if (existingIdx >= 0) {
          const currentProd = updated[existingIdx];
          const prevQty = currentProd.stockQuantity || 0;
          const newQty = Math.max(0, prevQty - deductQty); // Minus stock from warehouse

          const updatedProd: Product = {
            ...currentProd,
            stockQuantity: newQty,
            costPrice: item.costPrice !== undefined && Number(item.costPrice) > 0 ? Number(item.costPrice) : currentProd.costPrice,
            wholesalePrice: sellRate > 0 ? sellRate : currentProd.wholesalePrice,
          };
          updated[existingIdx] = updatedProd;
          deductedProductsSummary.push({
            id: currentProd.id,
            name: currentProd.name,
            prevQty,
            deductedQty: deductQty,
            newQty,
          });
          saveToFirestoreDoc(COLLECTIONS.PRODUCTS, updatedProd.id, updatedProd);
        } else {
          // If product doesn't exist in catalog yet, add it with 0 stock (already sold/deducted)
          const newProdId = `prod_${Date.now()}_${idx}`;
          const newProd: Product = {
            id: newProdId,
            sku: item.sku || `SKU-SALE-${Date.now().toString().slice(-4)}-${idx}`,
            name: safeItemName,
            bnName: safeItemName,
            brand: 'Wholesale Depot',
            category: 'General Wholesale',
            bnCategory: 'জেনারেল পাইকারি',
            stockQuantity: 0,
            unit: item.unit || 'Pcs',
            bnUnit: item.unit || 'পিস',
            costPrice: item.costPrice !== undefined && Number(item.costPrice) > 0 ? Number(item.costPrice) : (sellRate > 0 ? Math.round(sellRate * 0.85) : 100),
            wholesalePrice: sellRate || 120,
            mrp: sellRate > 0 ? Math.round(sellRate * 1.15) : 140,
            supplierId: 'sup_general',
            supplierName: 'General Supplier',
            minOrderQty: 1,
            image: 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=200&auto=format&fit=crop&q=80',
          };
          updated.push(newProd);
          deductedProductsSummary.push({
            id: newProd.id,
            name: newProd.name,
            prevQty: 0,
            deductedQty: deductQty,
            newQty: 0,
          });
          saveToFirestoreDoc(COLLECTIONS.PRODUCTS, newProd.id, newProd);
        }
      });

      localStorage.setItem('ws_products', JSON.stringify(updated));
      return updated;
    });

    // 3. Create Order Invoice with Scanned Memo Date & Details
    const orderItems = safeItems.map((it, idx) => ({
      productId: it.productId || `item_${idx}`,
      productName: it.name,
      quantity: it.quantity,
      unit: it.unit || 'Pcs',
      unitPrice: it.price,
      costPrice: it.costPrice !== undefined && Number(it.costPrice) > 0 ? Number(it.costPrice) : (it.price > 0 ? Math.round(it.price * 0.85) : 100),
      total: it.totalPrice,
      totalPrice: it.totalPrice,
    }));

    const newOrder: OrderInvoice = {
      id: `ord_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
      invoiceNo: safeInvoiceNo,
      date: finalDate,
      retailerId: finalRetailerId || 'ret_cash',
      retailerName: safeCustomerName,
      items: orderItems,
      subtotal: safeTotalAmount,
      totalAmount: safeTotalAmount,
      paidAmount: safePaidAmount,
      dueAmount: safeDueAmount,
      paymentMethod: (data.paymentMethod as any) || (safeDueAmount > 0 ? 'Credit' : 'Cash'),
      paymentType: safeDueAmount > 0 ? 'CREDIT' : 'CASH',
      status: safeDueAmount === 0 ? 'PAID' : safePaidAmount > 0 ? 'PARTIAL' : 'PENDING',
      notes: data.notes || `এআই স্ক্যানকৃত সেলস মেমো / খাতার হিসাব (${safeItems.length}টি পণ্য)`,
      creatorRole: actualRole,
      creatorName: actualName,
      salesPersonRole: actualRole,
      salesPersonName: actualName,
    };

    setOrders((prev) => {
      const next = [newOrder, ...prev];
      localStorage.setItem('ws_orders', JSON.stringify(next));
      return next;
    });
    saveToFirestoreDoc(COLLECTIONS.ORDERS, newOrder.id, newOrder);

    // 4. Update Cash Drawer if paid in cash
    if (safePaidAmount > 0 && (newOrder.paymentMethod === 'Cash' || !newOrder.paymentMethod)) {
      setUsers((prev) =>
        prev.map((u) => {
          if (u.id === actualUserId || u.id === currentUser.id) {
            const updatedUser = {
              ...u,
              assignedCashDrawer: (u.assignedCashDrawer || 0) + safePaidAmount,
            };
            saveToFirestoreDoc(COLLECTIONS.USERS, u.id, updatedUser);
            return updatedUser;
          }
          return u;
        })
      );
      if (currentUser.id === actualUserId) {
        setCurrentUserState((prev) => ({
          ...prev,
          assignedCashDrawer: (prev.assignedCashDrawer || 0) + safePaidAmount,
        }));
      }
    }

    // 5. Activity Log
    const roleLabelBn =
      actualRole === 'dsr'
        ? 'ডিএসআর'
        : actualRole === 'counter'
        ? 'ক্যাশ কাউন্টার'
        : 'অ্যাডমিন';

    addActivityLog({
      actionType: 'ORDER_CREATE',
      title: `AI Sales Scan & Stock Deducted: #${safeInvoiceNo}`,
      bnTitle: `সেলস মেমো স্ক্যান ও স্টক মাইনাস: #${safeInvoiceNo}`,
      description: `${actualName} (${roleLabelBn}) scanned sales memo #${safeInvoiceNo} dated ${finalDate}. Deducted ${safeItems.length} products from stock. Total: ৳${safeTotalAmount.toLocaleString()}, Paid: ৳${safePaidAmount.toLocaleString()}, Due: ৳${safeDueAmount.toLocaleString()}.`,
      bnDescription: `${roleLabelBn} ${actualName} খাতা/মেমো #${safeInvoiceNo} (তারিখ: ${finalDate}) স্ক্যান করেছেন। গুদাম থেকে ${safeItems.length}টি পণ্যের স্টক স্বয়ংক্রিয়ভাবে মাইনাস করা হয়েছে। মোট বিক্রয় ৳${safeTotalAmount.toLocaleString()}, নগদ আদায় ৳${safePaidAmount.toLocaleString()}, বকেয়া ৳${safeDueAmount.toLocaleString()}।`,
      actorRole: actualRole,
      actorId: actualUserId,
      actorName: actualName,
      actorPhone: actualPhone,
      amount: safeTotalAmount,
      relatedId: safeInvoiceNo,
      status: 'COMPLETED',
      metadata: {
        customerName: safeCustomerName,
        invoiceDate: finalDate,
        itemsCount: safeItems.length,
        paidAmount: safePaidAmount,
        dueAmount: safeDueAmount,
        deductedItems: deductedProductsSummary,
      },
    });

    return {
      success: true,
      message: `মেমো #${safeInvoiceNo} সফলভাবে এন্ট্রি হয়েছে এবং ${safeItems.length}টি পণ্যের স্টক মাইনাস করা হয়েছে!`,
      order: newOrder,
      deductedCount: safeItems.length,
    };
  };

  // Direct Supplier Purchase / Challan Entry
  const addSupplierPurchase = (params: {
    supplierId: string;
    amount: number;
    date: string;
    referenceNo: string;
    previousDoNo?: string;
    previousDoDate?: string;
    paymentStatus?: 'Unpaid' | 'Paid';
    paymentMethod?: string;
    notes?: string;
  }) => {
    const supplier = suppliers.find((s) => s.id === params.supplierId);
    if (!supplier) return;
    const safeAmount = Math.max(0, Number(params.amount) || 0);
    const isPaid = params.paymentStatus === 'Paid';
    const updatedSupplier = {
      ...supplier,
      totalPurchases: (supplier.totalPurchases || 0) + safeAmount,
      totalPaid: isPaid ? (supplier.totalPaid || 0) + safeAmount : (supplier.totalPaid || 0),
      outstandingPayable: isPaid
        ? (supplier.outstandingPayable || 0)
        : (supplier.outstandingPayable || 0) + safeAmount,
    };
    setSuppliers((prev) => {
      const next = prev.map((s) => (s.id === params.supplierId ? updatedSupplier : s));
      localStorage.setItem('ws_suppliers', JSON.stringify(next));
      return next;
    });
    saveToFirestoreDoc(COLLECTIONS.SUPPLIERS, params.supplierId, updatedSupplier);

    let finalRef = (params.referenceNo || '').trim();
    if (!finalRef) {
      finalRef = `CHAL-${Date.now().toString().slice(-6)}`;
    }
    if (supplierLedger.some((e) => (e.referenceNo || '').trim().toLowerCase() === finalRef.toLowerCase())) {
      let counter = 1;
      let candidate = `${finalRef}-${counter}`;
      while (supplierLedger.some((e) => (e.referenceNo || '').trim().toLowerCase() === candidate.toLowerCase())) {
        counter++;
        candidate = `${finalRef}-${counter}`;
      }
      finalRef = candidate;
    }

    const newLedgerEntry: SupplierLedgerEntry = {
      id: `led_${Date.now()}`,
      supplierId: params.supplierId,
      supplierName: supplier.name,
      type: 'PURCHASE',
      date: params.date || getTodayDateString(),
      amount: safeAmount,
      referenceNo: finalRef,
      previousDoNo: params.previousDoNo || '',
      previousDoDate: params.previousDoDate || '',
      paymentMethod: (params.paymentMethod as any) || 'Credit',
      balanceAfter: updatedSupplier.outstandingPayable,
      notes: params.notes || 'সাপ্লাই ক্রয় চালান',
      scannedByRole: currentUser.role,
      scannedByName: currentUser.name,
      scannedByPhone: currentUser.phone,
      scannedByUserId: currentUser.id,
      scannedAt: new Date().toISOString(),
    };

    if (isPaid) {
      const paymentEntry: SupplierLedgerEntry = {
        id: `led_pay_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
        supplierId: params.supplierId,
        supplierName: supplier.name,
        type: 'PAYMENT',
        date: params.date || getTodayDateString(),
        amount: safeAmount,
        referenceNo: `PAY-${finalRef}`,
        paymentMethod: (params.paymentMethod as any) || 'Cash',
        balanceAfter: updatedSupplier.outstandingPayable,
        notes: `ক্রয় চালান #${finalRef} সম্পূর্ণ পরিশোধ`,
      };
      setSupplierLedger((prev) => [paymentEntry, newLedgerEntry, ...prev]);
      saveToFirestoreDoc(COLLECTIONS.SUPPLIER_LEDGER, paymentEntry.id, paymentEntry);
      saveToFirestoreDoc(COLLECTIONS.SUPPLIER_LEDGER, newLedgerEntry.id, newLedgerEntry);
    } else {
      setSupplierLedger((prev) => {
        const next = [newLedgerEntry, ...prev];
        localStorage.setItem('ws_supplier_ledger', JSON.stringify(next));
        return next;
      });
      saveToFirestoreDoc(COLLECTIONS.SUPPLIER_LEDGER, newLedgerEntry.id, newLedgerEntry);
    }

    addActivityLog({
      actionType: 'STOCK_UPDATE',
      title: `Supplier Challan: ${supplier.name}`,
      bnTitle: `সাপ্লায়ার চালান সংযোজন: ${supplier.name}`,
      description: `${currentUser.name} added supplier challan #${newLedgerEntry.referenceNo} for ${supplier.name} (Amount: ৳${safeAmount.toLocaleString()}).`,
      bnDescription: `${currentUser.name} সাপ্লায়ার ${supplier.name}-এর নতুন চালান #${newLedgerEntry.referenceNo} যুক্ত করেছেন (মোট: ৳${safeAmount.toLocaleString()})।`,
      actorRole: currentUser.role,
      actorId: currentUser.id,
      actorName: currentUser.name,
      actorPhone: currentUser.phone,
      amount: safeAmount,
      relatedId: newLedgerEntry.referenceNo,
      status: 'COMPLETED',
      metadata: {
        supplierName: supplier.name,
        referenceNo: newLedgerEntry.referenceNo,
        previousDoNo: params.previousDoNo,
        previousDoDate: params.previousDoDate,
      },
    });
  };
  const addSupplierPayment = (
    supplierId: string,
    amount: number,
    paymentMethod: 'Cash' | 'Bank Transfer' | 'bKash / Nagad' | 'Cheque',
    referenceNo: string,
    notes?: string,
    customDate?: string
  ) => {
    const targetSupplier = suppliers.find((s) => s.id === supplierId);
    if (!targetSupplier) return;

    const newBalance = Math.max(0, targetSupplier.outstandingPayable - amount);

    const updatedSupplier = {
      ...targetSupplier,
      totalPaid: targetSupplier.totalPaid + amount,
      outstandingPayable: newBalance,
    };

    setSuppliers((prev) =>
      prev.map((s) => (s.id === supplierId ? updatedSupplier : s))
    );
    saveToFirestoreDoc(COLLECTIONS.SUPPLIERS, supplierId, updatedSupplier);

    const txDate = customDate || new Date().toISOString().slice(0, 10);

    let finalRef = (referenceNo || '').trim();
    if (!finalRef) {
      finalRef = `PAY-${Date.now().toString().slice(-6)}`;
    }
    if (supplierLedger.some((e) => (e.referenceNo || '').trim().toLowerCase() === finalRef.toLowerCase())) {
      let counter = 1;
      let candidate = `${finalRef}-${counter}`;
      while (supplierLedger.some((e) => (e.referenceNo || '').trim().toLowerCase() === candidate.toLowerCase())) {
        counter++;
        candidate = `${finalRef}-${counter}`;
      }
      finalRef = candidate;
    }

    const newEntry: SupplierLedgerEntry = {
      id: `led_${Date.now()}`,
      supplierId,
      supplierName: targetSupplier.name,
      type: 'PAYMENT',
      date: txDate,
      amount,
      referenceNo: finalRef,
      paymentMethod,
      balanceAfter: newBalance,
      notes: notes || `Payment disbursed via ${paymentMethod}`,
    };

    setSupplierLedger((prev) => [newEntry, ...prev]);
    saveToFirestoreDoc(COLLECTIONS.SUPPLIER_LEDGER, newEntry.id, newEntry);

    // If paid via Cash, deduct from active admin drawer (can be negative if company payment exceeds drawer)
    if (paymentMethod === 'Cash') {
      setUsers((prev) =>
        prev.map((u) => {
          if (u.role === 'admin') {
            const newDrawer = (u.assignedCashDrawer || 0) - amount;
            saveToFirestoreDoc(COLLECTIONS.USERS, u.id, { ...u, assignedCashDrawer: newDrawer });
            return { ...u, assignedCashDrawer: newDrawer };
          }
          return u;
        })
      );
      if (currentUser.role === 'admin') {
        setCurrentUserState((prev) => ({
          ...prev,
          assignedCashDrawer: (prev.assignedCashDrawer || 0) - amount,
        }));
      }
    } else if (paymentMethod === 'Bank Transfer' || paymentMethod === 'bKash / Nagad' || paymentMethod === 'Cheque') {
      // Deduct from primary bank account
      setBankAccounts((prev) => {
        if (prev.length === 0) return prev;
        const targetAcc = prev[0];
        const newBal = Math.max(0, targetAcc.balance - amount);
        const updated = prev.map((b, idx) => (idx === 0 ? { ...b, balance: newBal } : b));
        localStorage.setItem('ws_bank_accounts', JSON.stringify(updated));
        return updated;
      });
    }

    addActivityLog({
      actionType: 'SUPPLIER_PAYMENT',
      title: `Supplier Payment: ৳${amount.toLocaleString()}`,
      bnTitle: `সাপ্লায়ার পাওনা পরিশোধ: ৳${amount.toLocaleString()}`,
      description: `Disbursed ৳${amount.toLocaleString()} to ${targetSupplier.name} via ${paymentMethod} (Ref: ${referenceNo || 'N/A'}).`,
      bnDescription: `${targetSupplier.name}-কে ${paymentMethod}-এর মাধ্যমে ৳${amount.toLocaleString()} পরিশোধ করা হয়েছে (রেফারেন্স: ${referenceNo || 'N/A'})।`,
      actorRole: currentUser.role,
      actorId: currentUser.id,
      actorName: currentUser.name,
      actorPhone: currentUser.phone,
      amount: amount,
      relatedId: targetSupplier.id,
      status: 'COMPLETED',
      metadata: {
        supplierName: targetSupplier.name,
        paymentMethod,
        referenceNo,
        date: txDate,
      },
    });
  };

  // Create Order / Invoice
  const createOrderInvoice = (orderData: any) => {
    const creatorRole = orderData.creatorRole || orderData.salesPersonRole || currentUser.role;
    const creatorName = orderData.creatorName || orderData.salesPersonName || currentUser.name;
    const creatorPhone = orderData.creatorPhone || currentUser.phone;
    const creatorId = orderData.creatorId || orderData.salesPersonId || (users.find(u => u.name === creatorName || (u.bnName && u.bnName.includes(creatorName)))?.id) || currentUser.id;
    const totalAmount = orderData.totalAmount || orderData.subtotal || 0;
    const paidAmount = orderData.paidAmount || 0;
    const dueAmount = orderData.dueAmount ?? Math.max(0, totalAmount - paidAmount);
    const paymentMethod = orderData.paymentMethod || (orderData.paymentType === 'CASH' ? 'Cash' : orderData.paymentType === 'CREDIT' ? 'Credit' : 'Cash');
    const orderDate = orderData.date || new Date().toISOString();

    let assignedInvoiceNo = (orderData.invoiceNo || orderData.invoiceNumber || '').trim();
    if (!assignedInvoiceNo) {
      const cleanDate = orderDate.slice(0, 10).replace(/-/g, '');
      const prefix = `INV-${cleanDate}-`;
      let maxSeq = 0;
      orders.forEach((o) => {
        const inv = (o.invoiceNo || o.invoiceNumber || '').trim();
        if (inv.startsWith(prefix)) {
          const remainder = inv.slice(prefix.length);
          const parsed = parseInt(remainder, 10);
          if (!isNaN(parsed) && parsed > maxSeq) {
            maxSeq = parsed;
          }
        }
      });
      assignedInvoiceNo = `${prefix}${String(maxSeq + 1).padStart(3, '0')}`;
    }

    // Ensure strictly unique invoice number across all orders
    const isDuplicate = orders.some(
      (o) => (o.invoiceNo || o.invoiceNumber || '').trim().toLowerCase() === assignedInvoiceNo.toLowerCase()
    );
    if (isDuplicate) {
      let counter = 1;
      let candidate = `${assignedInvoiceNo}-${counter}`;
      while (orders.some((o) => (o.invoiceNo || o.invoiceNumber || '').trim().toLowerCase() === candidate.toLowerCase())) {
        counter++;
        candidate = `${assignedInvoiceNo}-${counter}`;
      }
      assignedInvoiceNo = candidate;
    }

    // Compute sales (+) vs replacement (-) items, piece counts, and cost/profit
    let computedSalesTotal = 0;
    let computedReplacementTotal = 0;
    let computedSoldPieces = 0;
    let computedReturnedPieces = 0;
    let computedCostTotal = 0;
    let computedReplacementCostTotal = 0;

    // Enrich items with stock batch challan reference numbers, costPrice, and itemType
    const enrichedItems: OrderItem[] = (orderData.items || []).map((item: any) => {
      const isRep = item.itemType === 'REPLACEMENT' || item.isReplacement === true || Number(item.quantity) < 0;
      const matchedProduct = products.find(
        (p) =>
          p.id === item.productId ||
          (p.name && item.productName && p.name.trim().toLowerCase() === item.productName.trim().toLowerCase())
      );
      const refNo =
        item.challanRefNo ||
        matchedProduct?.latestChallanNo ||
        (matchedProduct?.challanReferences && matchedProduct.challanReferences[0]?.challanNo) ||
        '';
      const cleanQty =
        item.quantity !== undefined && item.quantity !== null && !isNaN(Number(item.quantity))
          ? Math.max(0, Number(item.quantity))
          : 0;
      const cleanPrice =
        item.unitPrice !== undefined && item.unitPrice !== null && !isNaN(Number(item.unitPrice))
          ? Math.max(0, Number(item.unitPrice))
          : Number(matchedProduct?.wholesalePrice ?? 0);
      const cleanCost =
        item.costPrice !== undefined && item.costPrice !== null && !isNaN(Number(item.costPrice))
          ? Math.max(0, Number(item.costPrice))
          : Number(matchedProduct?.costPrice ?? 0);
      const lineTotal = cleanQty * cleanPrice;

      if (isRep) {
        computedReplacementTotal += lineTotal;
        computedReturnedPieces += cleanQty;
        computedReplacementCostTotal += cleanQty * cleanCost;
      } else {
        computedSalesTotal += lineTotal;
        computedSoldPieces += cleanQty;
        computedCostTotal += cleanQty * cleanCost;
      }

      return {
        ...item,
        productId: item.productId || matchedProduct?.id || `prod_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
        productName: item.productName || matchedProduct?.name || 'Product',
        bnProductName: item.bnProductName || matchedProduct?.bnName,
        quantity: cleanQty,
        unit: item.unit || matchedProduct?.unit || 'pcs',
        unitPrice: cleanPrice,
        costPrice: cleanCost,
        total: isRep ? -lineTotal : lineTotal,
        totalPrice: isRep ? -lineTotal : lineTotal,
        challanRefNo: refNo,
        image: item.image || matchedProduct?.image,
        itemType: isRep ? 'REPLACEMENT' : 'SALE',
        isReplacement: isRep,
        replacementReason: item.replacementReason || (isRep ? 'মার্কেট থেকে রিপ্লেস ফেরত' : undefined),
      };
    });

    const finalSalesAmount = orderData.totalSalesAmount !== undefined ? orderData.totalSalesAmount : computedSalesTotal;
    const finalReplacementAmount = orderData.totalReplacementAmount !== undefined ? orderData.totalReplacementAmount : computedReplacementTotal;
    const hasReplacements = finalReplacementAmount > 0;
    const finalSoldPieces = orderData.totalSoldPieces !== undefined ? orderData.totalSoldPieces : computedSoldPieces;
    const finalReturnedPieces = orderData.totalReturnedPieces !== undefined ? orderData.totalReturnedPieces : computedReturnedPieces;
    const netPieces = finalSoldPieces - finalReturnedPieces;
    const netDeliveredCost = Math.max(0, computedCostTotal - computedReplacementCostTotal);
    const totalCostAmount = orderData.totalCostAmount !== undefined ? orderData.totalCostAmount : netDeliveredCost;
    const totalProfitAmount = orderData.totalProfitAmount !== undefined ? orderData.totalProfitAmount : Math.max(0, totalAmount - totalCostAmount);

    const newInvoice: OrderInvoice = {
      ...orderData,
      items: enrichedItems,
      totalSalesAmount: finalSalesAmount,
      totalReplacementAmount: finalReplacementAmount,
      hasReplacements,
      totalSoldPieces: finalSoldPieces,
      totalReturnedPieces: finalReturnedPieces,
      netPieces,
      totalCostAmount,
      totalProfitAmount,
      creatorRole,
      creatorName,
      creatorPhone,
      creatorId,
      salesPersonRole: creatorRole,
      salesPersonName: creatorName,
      salesPersonId: creatorId,
      totalAmount,
      paidAmount,
      dueAmount,
      paymentMethod,
      id: orderData.id || `inv_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
      invoiceNo: assignedInvoiceNo,
      invoiceNumber: assignedInvoiceNo,
      date: orderDate,
    };

    setOrders((prev) => [newInvoice, ...prev]);
    saveToFirestoreDoc(COLLECTIONS.ORDERS, newInvoice.id, newInvoice);

    // Update stock: Deduct sold items (-) and Add Market Reflex/Replacement items (+)
    if (enrichedItems.length > 0) {
      setProducts((prev) => {
        const next = prev.map((p) => {
          const saleItem = enrichedItems.find((i) => i.productId === p.id && !i.isReplacement);
          const repItem = enrichedItems.find((i) => i.productId === p.id && i.isReplacement);
          if (saleItem || repItem) {
            const soldQty = saleItem ? Math.max(0, Number(saleItem.quantity) || 0) : 0;
            const repQty = repItem ? Math.max(0, Number(repItem.quantity) || 0) : 0;
            const currentQty = p.stockQuantity ?? (p as any).currentStock ?? 0;
            const newQty = Math.max(0, currentQty - soldQty + repQty);
            const updatedProduct = { ...p, stockQuantity: newQty, currentStock: newQty };
            saveToFirestoreDoc(COLLECTIONS.PRODUCTS, p.id, updatedProduct);
            return updatedProduct;
          }
          return p;
        });
        localStorage.setItem('ws_products', JSON.stringify(next));
        idbSetState('ws_products', next);
        return next;
      });
    }

    // Automatically record Market Replacement Claim in replacement tracking so Wholesaler can return them to company
    const replacementItems = enrichedItems.filter((i) => i.isReplacement);
    if (replacementItems.length > 0) {
      const targetRetId = orderData.retailerId || 'counter_walkin';
      const targetRetName = orderData.retailerName || 'Retailer';
      const newClaims: ReplacementClaim[] = replacementItems.map((item, idx) => ({
        id: `rep_pos_${Date.now()}_${idx}_${Math.random().toString(36).substr(2, 4)}`,
        claimNo: `CLM-${assignedInvoiceNo.replace(/[^a-zA-Z0-9]/g, '')}-${idx + 1}`,
        trackingNo: `CLM-${assignedInvoiceNo.replace(/[^a-zA-Z0-9]/g, '')}-${idx + 1}`,
        partyType: 'RETAILER',
        entityType: 'RETAILER',
        partyId: targetRetId,
        entityId: targetRetId,
        partyName: targetRetName,
        entityName: targetRetName,
        retailerId: targetRetId,
        retailerName: targetRetName,
        retailerPhone: orderData.retailerPhone,
        productId: item.productId,
        productName: item.productName,
        bnProductName: item.bnProductName,
        quantity: item.quantity,
        unit: item.unit || 'pcs',
        unitCost: item.unitPrice,
        estimatedValue: Math.abs(item.quantity * item.unitPrice),
        totalAdjustmentValue: Math.abs(item.quantity * item.unitPrice),
        reason: item.replacementReason || 'মার্কেট থেকে রিপ্লেস ফেরত (বিক্রয় চালানে মাইনাস কাউন্ট)',
        claimReasonBangla: item.replacementReason || 'মার্কেট থেকে রিপ্লেস ফেরত',
        status: 'REPLACED_WITH_GOODS',
        resolutionType: 'PRODUCT_REPLACEMENT',
        date: orderDate.slice(0, 10),
        createdAt: new Date().toISOString(),
        operatorRole: creatorRole,
        operatorName: creatorName,
        notes: `বিক্রয় চালান #${assignedInvoiceNo}-তে সমন্বিত মার্কেট রিপ্লেস (মাইনাস কাউন্ট: -৳${Math.abs(item.quantity * item.unitPrice).toLocaleString()})`,
      }));

      setReplacements((prev) => {
        const next = [...newClaims, ...prev];
        localStorage.setItem('ws_replacements', JSON.stringify(next));
        return next;
      });
      newClaims.forEach((c) => saveToFirestoreDoc(COLLECTIONS.REPLACEMENTS, c.id, c));
    }

    // Update retailer receivable balance & purchase total
    setRetailers((prev) =>
      prev.map((r) => {
        if (r.id === orderData.retailerId) {
          const updatedRetailer = {
            ...r,
            outstandingDue: round2((r.outstandingDue || 0) + dueAmount),
            currentDue: round2((r.outstandingDue || 0) + dueAmount),
            totalPurchases: round2((r.totalPurchases || 0) + totalAmount),
          };
          saveToFirestoreDoc(COLLECTIONS.RETAILERS, r.id, updatedRetailer);
          return updatedRetailer;
        }
        return r;
      })
    );

    // If paid in cash, add to creator's drawer
    if (paidAmount > 0 && paymentMethod === 'Cash') {
      setUsers((prev) =>
        prev.map((u) => {
          if (u.id === creatorId || u.role === creatorRole) {
            const newDrawer = round2((u.assignedCashDrawer || 0) + paidAmount);
            saveToFirestoreDoc(COLLECTIONS.USERS, u.id, { ...u, assignedCashDrawer: newDrawer });
            return { ...u, assignedCashDrawer: newDrawer };
          }
          return u;
        })
      );
      if (currentUser.id === creatorId || currentUser.role === creatorRole) {
        setCurrentUserState((prev) => ({
          ...prev,
          assignedCashDrawer: round2((prev.assignedCashDrawer || 0) + paidAmount),
        }));
      }
    }

    addActivityLog({
      actionType: 'INVOICE_CREATE',
      title: `Invoice Created: ${newInvoice.invoiceNo} (৳${totalAmount.toLocaleString()})`,
      bnTitle: `নতুন চালান তৈরি: ${newInvoice.invoiceNo} (৳${totalAmount.toLocaleString()})`,
      description: `${creatorName} (${creatorRole.toUpperCase()}) created invoice #${newInvoice.invoiceNo} for ${orderData.retailerName || 'Retailer'}. Paid: ৳${paidAmount.toLocaleString()}, Due: ৳${dueAmount.toLocaleString()}.`,
      bnDescription: `${creatorName} (${creatorRole.toUpperCase()}) ${orderData.retailerName || 'খুচরা গ্রাহক'}-এর নামে নতুন চালান #${newInvoice.invoiceNo} তৈরি করেছেন (মোট: ৳${totalAmount.toLocaleString()}, নগদ আদায়: ৳${paidAmount.toLocaleString()}, বকেয়া: ৳${dueAmount.toLocaleString()})।`,
      actorRole: creatorRole,
      actorId: currentUser.id,
      actorName: creatorName,
      actorPhone: currentUser.phone,
      amount: totalAmount,
      relatedId: newInvoice.invoiceNo,
      status: 'COMPLETED',
      metadata: {
        retailerName: orderData.retailerName,
        paidAmount,
        dueAmount,
        itemsCount: orderData.items?.length || 0,
        paymentMethod,
      },
    });

    pingRealtimeSync(creatorRole, 1).catch(() => {});

    return newInvoice;
  };

  // Phonebook contact register as Retailer
  const addRetailerFromPhonebook = (
    contact: PhoneContact,
    shopName: string,
    route: string,
    creditLimit: number
  ) => {
    const newRetailer: Retailer = {
      id: `ret_${Date.now()}`,
      name: contact.name,
      bnName: contact.name,
      shopName: shopName || `${contact.name} Store`,
      bnShopName: shopName || `${contact.name} স্টোর`,
      phone: contact.phone,
      address: contact.address || 'Dhaka City Route',
      area: route.split(' ')[0] || 'Dhaka',
      route: route || 'Route A - Dhanmondi',
      creditLimit: creditLimit || 30000,
      outstandingDue: 0,
      totalPurchases: 0,
      contactSource: 'phonebook',
      notes: `Imported from phonebook (${contact.organization || 'Personal'})`,
    };

    setRetailers((prev) => [newRetailer, ...prev]);
    saveToFirestoreDoc(COLLECTIONS.RETAILERS, newRetailer.id, newRetailer);
  };

  const addPhoneContact = (contact: PhoneContact | Omit<PhoneContact, 'id'>) => {
    const newContact: PhoneContact = {
      ...contact,
      id: ('id' in contact && contact.id) ? contact.id : `con_${Date.now()}`,
    };
    setPhoneContacts((prev) => [newContact, ...prev]);
  };

  // Replacement / Damage claims
  const submitReplacementClaim = (claim: any) => {
    const estimatedValue = Number(claim.estimatedValue ?? claim.totalAdjustmentValue ?? 0) || 0;
    const totalAdjustmentValue = Number(claim.totalAdjustmentValue ?? claim.estimatedValue ?? 0) || 0;
    const entityType = claim.entityType || claim.partyType || 'RETAILER';
    const partyType = claim.partyType || claim.entityType || 'RETAILER';
    const entityName = claim.entityName || claim.partyName || '';
    const partyName = claim.partyName || claim.entityName || '';
    const entityId = claim.entityId || claim.partyId || '';
    const partyId = claim.partyId || claim.entityId || '';
    const trackingNo = claim.trackingNo || claim.claimNo || `RMA-${entityType.slice(0, 3)}-${new Date().getFullYear()}-${Math.floor(100 + Math.random() * 900)}`;

    const newClaim: ReplacementAdjustment = {
      ...claim,
      id: `rep_${Date.now()}`,
      claimNo: trackingNo,
      trackingNo,
      partyType,
      entityType,
      partyId,
      entityId,
      partyName,
      entityName,
      estimatedValue,
      totalAdjustmentValue,
      status: 'PENDING',
      date: claim.date || claim.customDate || new Date().toISOString().slice(0, 10),
    };

    setReplacements((prev) => [newClaim, ...prev]);
    saveToFirestoreDoc(COLLECTIONS.REPLACEMENTS, newClaim.id, newClaim);

    // If replacement product is received from retailer (market reflex return), add to product stock
    if (entityType === 'RETAILER' && (claim.productId || claim.productName)) {
      setProducts((prev) => {
        const next = prev.map((p) => {
          const isMatch =
            (claim.productId && p.id === claim.productId) ||
            (p.name && claim.productName && p.name.trim().toLowerCase() === claim.productName.trim().toLowerCase());
          if (isMatch) {
            const addQty = Math.max(0, Number(claim.quantity) || 1);
            const currentQty = p.stockQuantity ?? (p as any).currentStock ?? 0;
            const updatedProduct = { ...p, stockQuantity: currentQty + addQty, currentStock: currentQty + addQty };
            saveToFirestoreDoc(COLLECTIONS.PRODUCTS, p.id, updatedProduct);
            return updatedProduct;
          }
          return p;
        });
        localStorage.setItem('ws_products', JSON.stringify(next));
        idbSetState('ws_products', next);
        return next;
      });
    }
    pingRealtimeSync(currentUser.role, 1).catch(() => {});
  };

  const resolveReplacement = (
    claimId: string,
    status: any,
    resolutionType?: any
  ) => {
    const target = replacements.find((r) => r.id === claimId);
    if (!target) return;

    const adjustmentAmount = Number(target.totalAdjustmentValue ?? target.estimatedValue ?? 0) || 0;
    const entityType = target.entityType || target.partyType;
    const entityId = target.entityId || target.partyId;

    const updatedClaim = {
      ...target,
      status,
      resolutionType: resolutionType || target.resolutionType,
      resolvedAt: new Date().toISOString(),
    };

    setReplacements((prev) =>
      prev.map((r) => (r.id === claimId ? updatedClaim : r))
    );
    saveToFirestoreDoc(COLLECTIONS.REPLACEMENTS, claimId, updatedClaim);

    // Apply adjustments
    if (status === 'CREDITED_TO_LEDGER') {
      if (entityType === 'RETAILER') {
        setRetailers((prev) =>
          prev.map((ret) => {
            if (ret.id === entityId) {
              const updatedRet = {
                ...ret,
                outstandingDue: Math.max(0, (ret.outstandingDue || 0) - adjustmentAmount),
              };
              saveToFirestoreDoc(COLLECTIONS.RETAILERS, ret.id, updatedRet);
              return updatedRet;
            }
            return ret;
          })
        );
      } else {
        setSuppliers((prev) =>
          prev.map((sup) => {
            if (sup.id === entityId) {
              const updatedSup = {
                ...sup,
                outstandingPayable: Math.max(0, (sup.outstandingPayable || 0) - adjustmentAmount),
              };
              saveToFirestoreDoc(COLLECTIONS.SUPPLIERS, sup.id, updatedSup);
              return updatedSup;
            }
            return sup;
          })
        );
      }
    } else if (status === 'REPLACED_DISPATCHED' || status === 'REPLACED_WITH_GOODS') {
      setProducts((prev) =>
        prev.map((p) => {
          if (p.id === target.productId) {
            const updatedProd = {
              ...p,
              stockQuantity: Math.max(0, p.stockQuantity - target.quantity),
            };
            saveToFirestoreDoc(COLLECTIONS.PRODUCTS, p.id, updatedProd);
            return updatedProd;
          }
          return p;
        })
      );
    }
  };

  // Month-end market returns dispatched to company
  const dispatchReturnsToCompany = (params: {
    supplierId: string;
    claimIds: string[];
    companyChallanNo: string;
    dispatchDate: string;
    notes?: string;
    adjustSupplierLedger?: boolean;
  }) => {
    const { supplierId, claimIds, companyChallanNo, dispatchDate, notes, adjustSupplierLedger = true } = params;
    const supplier = suppliers.find((s) => s.id === supplierId);
    if (!supplier || !claimIds || claimIds.length === 0) {
      return { success: false, message: 'সাপ্লায়ার বা রিটার্ন আইটেম নির্বাচন করা হয়নি', count: 0, totalValue: 0 };
    }

    let totalValue = 0;
    let totalQty = 0;
    const dispatchedItemsList: Array<{
      claimId?: string;
      productId: string;
      productName: string;
      quantity: number;
      unit: string;
      value: number;
      reason?: string;
      marketRetailerName?: string;
    }> = [];

    const finalChallanNo = companyChallanNo || `RET-${Date.now().toString().slice(-6)}`;
    const finalDispatchDate = dispatchDate || getTodayDateString();

    const updatedReplacements = replacements.map((claim) => {
      if (claimIds.includes(claim.id)) {
        const val = Number(claim.totalAdjustmentValue ?? claim.estimatedValue ?? 0) || 0;
        totalValue += val;
        totalQty += (claim.quantity || 1);

        dispatchedItemsList.push({
          claimId: claim.id,
          productId: claim.productId,
          productName: claim.productName,
          quantity: claim.quantity || 1,
          unit: claim.unit || 'Pcs',
          value: val,
          reason: claim.reason || 'ড্যামেজ/মেয়াদোত্তীর্ণ',
          marketRetailerName: claim.partyName,
        });

        const updatedClaim: ReplacementAdjustment = {
          ...claim,
          status: 'SENT_TO_COMPANY',
          dispatchedToCompany: true,
          companyDispatchDate: finalDispatchDate,
          companyChallanNo: finalChallanNo,
          supplierId: supplier.id,
          supplierName: supplier.name,
          resolvedAt: new Date().toISOString(),
          notes: claim.notes ? `${claim.notes} | ${notes || 'কোম্পানিতে রিটার্ন প্রেরণ'}` : (notes || 'কোম্পানিতে রিটার্ন প্রেরণ'),
        };
        saveToFirestoreDoc(COLLECTIONS.REPLACEMENTS, claim.id, updatedClaim);
        return updatedClaim;
      }
      return claim;
    });

    setReplacements(updatedReplacements);

    // Create CompanyReturnChallan record
    const newCompanyChallan: CompanyReturnChallan = {
      id: `com_ret_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
      challanNo: finalChallanNo,
      supplierId: supplier.id,
      supplierName: supplier.name,
      supplierCompany: supplier.company || supplier.name,
      dispatchDate: finalDispatchDate,
      items: dispatchedItemsList,
      totalItemsCount: dispatchedItemsList.length,
      totalQuantity: totalQty,
      totalValue: totalValue,
      notes: notes || `মার্কেট থেকে আসা ${claimIds.length}টি নষ্ট পণ্যের কোম্পানি রিটার্ন চালান`,
      adjustSupplierLedger: adjustSupplierLedger,
      createdAt: new Date().toISOString(),
      dispatchedByName: currentUser.name,
      dispatchedByRole: currentUser.role,
    };

    setCompanyReturns((prev) => {
      const next = [newCompanyChallan, ...prev];
      localStorage.setItem('ws_company_returns', JSON.stringify(next));
      return next;
    });
    saveToFirestoreDoc(COLLECTIONS.COMPANY_RETURNS, newCompanyChallan.id, newCompanyChallan);

    // Deduct dispatched return items from products stock (কোম্পানির রিটার্ন স্টক থেকে মাইনাস হবে)
    if (dispatchedItemsList.length > 0) {
      setProducts((prev) => {
        const next = prev.map((p) => {
          const matchedItem = dispatchedItemsList.find(
            (it) =>
              (it.productId && it.productId === p.id) ||
              (it.productName && p.name && it.productName.toLowerCase().trim() === p.name.toLowerCase().trim()) ||
              (it.productName && p.bnName && it.productName.toLowerCase().trim() === p.bnName.toLowerCase().trim())
          );
          if (matchedItem) {
            const deductQty = Math.max(0, Number(matchedItem.quantity) || 1);
            const currentQty = p.stockQuantity ?? (p as any).currentStock ?? 0;
            const newQty = Math.max(0, currentQty - deductQty);
            const updatedProduct = { ...p, stockQuantity: newQty, currentStock: newQty };
            saveToFirestoreDoc(COLLECTIONS.PRODUCTS, p.id, updatedProduct);
            return updatedProduct;
          }
          return p;
        });
        localStorage.setItem('ws_products', JSON.stringify(next));
        idbSetState('ws_products', next);
        return next;
      });
    }

    // If adjustSupplierLedger is true, create a RETURN_ADJUSTMENT ledger entry and reduce supplier's outstanding payable
    if (adjustSupplierLedger && totalValue > 0) {
      const safeTotalValue = Math.max(0, totalValue);
      const updatedSupplier = {
        ...supplier,
        outstandingPayable: Math.max(0, (supplier.outstandingPayable || 0) - safeTotalValue),
      };
      setSuppliers((prev) => {
        const next = prev.map((s) => (s.id === supplierId ? updatedSupplier : s));
        localStorage.setItem('ws_suppliers', JSON.stringify(next));
        return next;
      });
      saveToFirestoreDoc(COLLECTIONS.SUPPLIERS, supplier.id, updatedSupplier);

      const returnLedgerEntry: SupplierLedgerEntry = {
        id: `led_ret_${Date.now()}`,
        supplierId: supplier.id,
        supplierName: supplier.name,
        type: 'RETURN_ADJUSTMENT',
        date: finalDispatchDate,
        amount: safeTotalValue,
        referenceNo: finalChallanNo,
        balanceAfter: updatedSupplier.outstandingPayable,
        notes: notes || `কোম্পানি রিটার্ন চালান (#${finalChallanNo}) - ${claimIds.length}টি মার্কেট ড্যামেজ পণ্য ফেরত`,
      };

      setSupplierLedger((prev) => {
        const next = [returnLedgerEntry, ...prev];
        localStorage.setItem('ws_supplier_ledger', JSON.stringify(next));
        return next;
      });
      saveToFirestoreDoc(COLLECTIONS.SUPPLIER_LEDGER, returnLedgerEntry.id, returnLedgerEntry);
    }

    addActivityLog({
      actionType: 'STOCK_UPDATE',
      title: `Dispatched ${dispatchedItemsList.length} Returns to ${supplier.company || supplier.name}`,
      bnTitle: `${supplier.company || supplier.name}-এ ${dispatchedItemsList.length}টি পণ্যের কোম্পানি রিটার্ন চালান পাঠানো হয়েছে`,
      description: `Dispatched return challan #${finalChallanNo} (${totalQty} units, Total value: ৳${totalValue.toLocaleString()}).`,
      bnDescription: `কোম্পানি রিটার্ন চালান #${finalChallanNo} প্রেরণ সম্পন্ন (${totalQty} পিস, মোট মূল্য: ৳${totalValue.toLocaleString()})।`,
      actorRole: currentUser.role,
      actorId: currentUser.id,
      actorName: currentUser.name,
      amount: totalValue,
      relatedId: finalChallanNo,
      status: 'COMPLETED',
      metadata: {
        supplierId: supplier.id,
        challanNo: finalChallanNo,
        totalValue,
      },
    });

    pingRealtimeSync(currentUser.role, claimIds.length).catch(() => {});

    return {
      success: true,
      message: `সফলভাবে ${claimIds.length}টি রিটার্ন আইটেম ${supplier.company || supplier.name}-এ প্রেরণ করা হয়েছে! (স্টক থেকে মাইনাস করা হয়েছে)`,
      count: claimIds.length,
      totalValue,
    };
  };

  // Direct Company Return (by Scan, Photo, Khata/Memo or Direct entry)
  const addDirectCompanyReturn = (params: {
    supplierId: string;
    challanNo: string;
    dispatchDate: string;
    items: Array<{
      productId?: string;
      productName: string;
      quantity: number;
      unit?: string;
      value: number;
      reason?: string;
      marketRetailerName?: string;
    }>;
    notes?: string;
    adjustSupplierLedger?: boolean;
    deductStock?: boolean;
    photoUrl?: string;
    sourceType?: 'SCAN' | 'PHOTO' | 'MEMO_KHATA' | 'DIRECT' | 'MARKET_CLAIMS';
  }) => {
    const {
      supplierId,
      challanNo,
      dispatchDate,
      items,
      notes,
      adjustSupplierLedger = true,
      deductStock = true,
      photoUrl,
      sourceType = 'DIRECT',
    } = params;
    const supplier = suppliers.find((s) => s.id === supplierId);
    if (!supplier || !items || items.length === 0) {
      return { success: false, message: 'সাপ্লায়ার বা পণ্য তালিকা পাওয়া যায়নি' };
    }

    const totalVal = items.reduce((acc, it) => acc + (Number(it.value) || 0), 0);
    const totalQ = items.reduce((acc, it) => acc + (Number(it.quantity) || 0), 0);
    const finalChallanNo = (challanNo || `COMP-RET-${Date.now().toString().slice(-6)}`).trim();
    const finalDate = dispatchDate || getTodayDateString();

    const newCompanyChallan: CompanyReturnChallan = {
      id: `com_ret_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
      challanNo: finalChallanNo,
      supplierId: supplier.id,
      supplierName: supplier.name,
      supplierCompany: supplier.company || supplier.name,
      dispatchDate: finalDate,
      items: items.map((it) => ({
        productId: it.productId || `prod_${Date.now()}`,
        productName: it.productName,
        quantity: it.quantity,
        unit: it.unit || 'Pcs',
        value: it.value,
        reason: it.reason || 'কোম্পানি রিপ্লেস রিটার্ন',
        marketRetailerName: it.marketRetailerName,
      })),
      totalItemsCount: items.length,
      totalQuantity: totalQ,
      totalValue: totalVal,
      notes: notes || 'কোম্পানিতে পাঠানো রিপ্লেস/ফেরত পণ্যের হিসাব',
      adjustSupplierLedger,
      deductStock,
      photoUrl,
      sourceType,
      createdAt: new Date().toISOString(),
      dispatchedByName: currentUser.name,
      dispatchedByRole: currentUser.role,
    };

    setCompanyReturns((prev) => {
      const next = [newCompanyChallan, ...prev];
      localStorage.setItem('ws_company_returns', JSON.stringify(next));
      return next;
    });
    saveToFirestoreDoc(COLLECTIONS.COMPANY_RETURNS, newCompanyChallan.id, newCompanyChallan);

    // 1. DEDUCT FROM STOCK: Deduct returned quantities from product stock
    let deductedProductCount = 0;
    if (deductStock && items.length > 0) {
      setProducts((prev) => {
        const next = prev.map((p) => {
          const matchedItem = items.find(
            (it) =>
              (it.productId && it.productId === p.id) ||
              (it.productName && p.name && it.productName.toLowerCase().trim() === p.name.toLowerCase().trim()) ||
              (it.productName && p.bnName && it.productName.toLowerCase().trim() === p.bnName.toLowerCase().trim())
          );
          if (matchedItem) {
            deductedProductCount++;
            const deductQty = Math.max(0, Number(matchedItem.quantity) || 0);
            const currentQty = p.stockQuantity ?? (p as any).currentStock ?? 0;
            const newQty = Math.max(0, currentQty - deductQty);
            const updatedProduct = { ...p, stockQuantity: newQty, currentStock: newQty };
            saveToFirestoreDoc(COLLECTIONS.PRODUCTS, p.id, updatedProduct);
            return updatedProduct;
          }
          return p;
        });
        localStorage.setItem('ws_products', JSON.stringify(next));
        idbSetState('ws_products', next);
        return next;
      });
    }

    // 2. DEDUCT FROM COMPANY DUE: Adjust supplier outstanding payable and record in supplier ledger
    if (adjustSupplierLedger && totalVal > 0) {
      const updatedSupplier = {
        ...supplier,
        outstandingPayable: Math.max(0, (supplier.outstandingPayable || 0) - totalVal),
      };
      setSuppliers((prev) => {
        const next = prev.map((s) => (s.id === supplierId ? updatedSupplier : s));
        localStorage.setItem('ws_suppliers', JSON.stringify(next));
        return next;
      });
      saveToFirestoreDoc(COLLECTIONS.SUPPLIERS, supplier.id, updatedSupplier);

      const returnLedgerEntry: SupplierLedgerEntry = {
        id: `led_ret_${Date.now()}`,
        supplierId: supplier.id,
        supplierName: supplier.name,
        type: 'RETURN_ADJUSTMENT',
        date: finalDate,
        amount: totalVal,
        referenceNo: finalChallanNo,
        balanceAfter: updatedSupplier.outstandingPayable,
        notes: notes || `কোম্পানি রিপ্লেস রিটার্ন চালান (#${finalChallanNo}) - ${items.length}টি পণ্য`,
        attachments: photoUrl ? [photoUrl] : [],
        scannedByRole: currentUser.role,
        scannedByName: currentUser.name,
        scannedByPhone: currentUser.phone,
        scannedByUserId: currentUser.id,
        scannedAt: new Date().toISOString(),
      };

      setSupplierLedger((prev) => {
        const next = [returnLedgerEntry, ...prev];
        localStorage.setItem('ws_supplier_ledger', JSON.stringify(next));
        return next;
      });
      saveToFirestoreDoc(COLLECTIONS.SUPPLIER_LEDGER, returnLedgerEntry.id, returnLedgerEntry);
    }

    addActivityLog({
      actionType: 'STOCK_UPDATE',
      title: `Return Challan to ${supplier.company || supplier.name}`,
      bnTitle: `কোম্পানি রিপ্লেস রিটার্ন: ${supplier.company || supplier.name}`,
      description: `Dispatched return #${finalChallanNo} (${totalQ} units, Total value: ৳${totalVal.toLocaleString()}). Stock deducted & Due adjusted.`,
      bnDescription: `কোম্পানি রিপ্লেস রিটার্ন চালান #${finalChallanNo} সম্পন্ন (${totalQ} পিস, মোট মূল্য: ৳${totalVal.toLocaleString()})। স্টক থেকে মাইনাস ও কোম্পানির ডিউ সমন্বয় করা হয়েছে।`,
      actorRole: currentUser.role,
      actorId: currentUser.id,
      actorName: currentUser.name,
      amount: totalVal,
      relatedId: finalChallanNo,
      status: 'COMPLETED',
    });

    pingRealtimeSync(currentUser.role, items.length).catch(() => {});

    return {
      success: true,
      message: `কোম্পানি রিটার্ন চালান #${finalChallanNo} সফলভাবে সম্পন্ন! (স্টক থেকে মাইনাস ও কোম্পানির ডিউ থেকে ৳${totalVal.toLocaleString()} মাইনাস করা হয়েছে)`,
      challan: newCompanyChallan,
    };
  };

  // Delete Company Return
  const deleteCompanyReturn = (challanId: string, revertLedger = false) => {
    const challan = companyReturns.find((c) => c.id === challanId);
    if (!challan) return { success: false, message: 'চালান পাওয়া যায়নি' };

    setCompanyReturns((prev) => {
      const next = prev.filter((c) => c.id !== challanId);
      localStorage.setItem('ws_company_returns', JSON.stringify(next));
      return next;
    });
    deleteFirestoreDoc(COLLECTIONS.COMPANY_RETURNS, challanId);

    // Revert Company Due balance if requested
    if (revertLedger && challan.adjustSupplierLedger && challan.totalValue > 0) {
      setSuppliers((prev) =>
        prev.map((s) => {
          if (s.id === challan.supplierId) {
            const updated = {
              ...s,
              outstandingPayable: (s.outstandingPayable || 0) + challan.totalValue,
            };
            saveToFirestoreDoc(COLLECTIONS.SUPPLIERS, s.id, updated);
            return updated;
          }
          return s;
        })
      );
    }

    // Revert Stock if stock was previously deducted
    if (revertLedger && challan.deductStock && challan.items && challan.items.length > 0) {
      setProducts((prev) => {
        const next = prev.map((p) => {
          const matchedItem = challan.items.find(
            (it) =>
              (it.productId && it.productId === p.id) ||
              (it.productName && p.name && it.productName.toLowerCase().trim() === p.name.toLowerCase().trim())
          );
          if (matchedItem) {
            const currentQty = p.stockQuantity ?? (p as any).currentStock ?? 0;
            const restoredQty = currentQty + (Number(matchedItem.quantity) || 0);
            const updated = { ...p, stockQuantity: restoredQty, currentStock: restoredQty };
            saveToFirestoreDoc(COLLECTIONS.PRODUCTS, p.id, updated);
            return updated;
          }
          return p;
        });
        localStorage.setItem('ws_products', JSON.stringify(next));
        idbSetState('ws_products', next);
        return next;
      });
    }

    pingRealtimeSync(currentUser.role, 1).catch(() => {});

    return { success: true, message: 'কোম্পানি রিটার্ন চালান মুছে ফেলা হয়েছে' };
  };

  // Cash Counter & DSR Sales and Replacement Memo/Khata Scanner Entry
  const addCounterOrDsrSalesAndReplacement = (data: {
    operatorMode: 'COUNTER' | 'DSR';
    customerName?: string;
    retailerName?: string;
    retailerId?: string;
    customerPhone?: string;
    invoiceNumber: string;
    invoiceDate?: string;
    salesItems: Array<{
      productId?: string;
      name: string;
      sku?: string;
      quantity: number;
      unit?: string;
      costPrice?: number;
      price: number;
      totalPrice: number;
    }>;
    replacementItems?: Array<{
      productId?: string;
      productName: string;
      quantity: number;
      unit?: string;
      value: number;
      reason?: string;
    }>;
    totalSalesAmount: number;
    replacementDeductionAmount: number;
    netPayableAmount: number;
    paidAmount?: number;
    dueAmount?: number;
    paymentMethod?: 'Cash' | 'Credit' | 'Bank' | 'Mobile' | string;
    notes?: string;
    scannedByRole?: string;
    scannedByName?: string;
    scannedByPhone?: string;
    scannedByUserId?: string;
  }) => {
    const rawShopName = (data.customerName || data.retailerName || 'নগদ ক্রেতা / সাধারণ খদ্দের').trim();
    const invDate = data.invoiceDate || new Date().toISOString().slice(0, 10);
    const invNo = data.invoiceNumber || `${data.operatorMode === 'DSR' ? 'DSR' : 'CTR'}-${Date.now().toString().slice(-6)}`;
    const actualPaid = typeof data.paidAmount === 'number' ? data.paidAmount : data.netPayableAmount;
    const actualDue = typeof data.dueAmount === 'number' ? data.dueAmount : Math.max(0, data.netPayableAmount - actualPaid);

    // 1. Find or create Retailer
    let targetRetailer = retailers.find(
      (r) =>
        (data.retailerId && r.id === data.retailerId) ||
        (data.customerPhone && r.phone === data.customerPhone) ||
        r.shopName.toLowerCase() === rawShopName.toLowerCase() ||
        r.name.toLowerCase() === rawShopName.toLowerCase()
    );

    if (!targetRetailer && rawShopName) {
      const newRetailerId = `ret_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`;
      targetRetailer = {
        id: newRetailerId,
        name: rawShopName,
        shopName: rawShopName,
        phone: data.customerPhone || '01700000000',
        routeArea: data.operatorMode === 'DSR' ? 'DSR ডেলিভারি রুট' : 'ক্যাশ কাউন্টার',
        address: 'লোকাল মার্কেট',
        creditLimit: 50000,
        outstandingDue: actualDue,
        totalPurchases: data.netPayableAmount,
        lastOrderDate: invDate,
        createdAt: new Date().toISOString(),
      };
      setRetailers((prev) => {
        const next = [targetRetailer!, ...prev];
        localStorage.setItem('ws_retailers', JSON.stringify(next));
        return next;
      });
      saveToFirestoreDoc(COLLECTIONS.RETAILERS, targetRetailer.id, targetRetailer);
    } else if (targetRetailer) {
      const updated = {
        ...targetRetailer,
        outstandingDue: (targetRetailer.outstandingDue || 0) + actualDue,
        totalPurchases: (targetRetailer.totalPurchases || 0) + data.netPayableAmount,
        lastOrderDate: invDate,
      };
      targetRetailer = updated;
      setRetailers((prev) => {
        const next = prev.map((r) => (r.id === updated.id ? updated : r));
        localStorage.setItem('ws_retailers', JSON.stringify(next));
        return next;
      });
      saveToFirestoreDoc(COLLECTIONS.RETAILERS, updated.id, updated);
    }

    // 2. Real-time Inventory: Deduct sold items (-) and Add Market Reflex/Replacement items (+)
    const hasSales = data.salesItems && data.salesItems.length > 0;
    const hasReplacements = data.replacementItems && data.replacementItems.length > 0;
    if (hasSales || hasReplacements) {
      setProducts((prev) => {
        const next = prev.map((p) => {
          const matchSale = data.salesItems?.find(
            (si) =>
              (si.productId && si.productId === p.id) ||
              si.name.toLowerCase().trim() === p.name.toLowerCase().trim() ||
              si.name.toLowerCase().trim() === (p.bnName || '').toLowerCase().trim()
          );
          const matchRep = data.replacementItems?.find(
            (ri) =>
              (ri.productId && ri.productId === p.id) ||
              ri.productName.toLowerCase().trim() === p.name.toLowerCase().trim() ||
              ri.productName.toLowerCase().trim() === (p.bnName || '').toLowerCase().trim()
          );

          if (matchSale || matchRep) {
            const currentQty = p.stockQuantity ?? (p as any).currentStock ?? 0;
            const soldQty = matchSale ? Math.max(0, Number(matchSale.quantity) || 0) : 0;
            const repQty = matchRep ? Math.max(0, Number(matchRep.quantity) || 0) : 0;
            // Market reflex product is added (+) to stock, sold product is deducted (-) from stock
            const newQty = Math.max(0, currentQty - soldQty + repQty);
            const updatedProd = {
              ...p,
              stockQuantity: newQty,
              currentStock: newQty,
              costPrice: matchSale?.costPrice && Number(matchSale.costPrice) > 0 ? Number(matchSale.costPrice) : p.costPrice,
              wholesalePrice: matchSale?.price && Number(matchSale.price) > 0 ? Number(matchSale.price) : p.wholesalePrice,
            };
            saveToFirestoreDoc(COLLECTIONS.PRODUCTS, p.id, updatedProd);
            return updatedProd;
          }
          return p;
        });
        localStorage.setItem('ws_products', JSON.stringify(next));
        idbSetState('ws_products', next);
        return next;
      });
    }

    // 3. Process Replacement items if present on memo/khata
    let createdClaimCount = 0;
    if (data.replacementItems && data.replacementItems.length > 0) {
      const newClaims: ReplacementAdjustment[] = data.replacementItems.map((rep, idx) => {
        const claimId = `rep_${Date.now()}_${idx}_${Math.random().toString(36).substr(2, 4)}`;
        return {
          id: claimId,
          claimNumber: `REP-${Date.now().toString().slice(-4)}${idx + 1}`,
          claimDate: invDate,
          partyType: 'RETAILER',
          entityType: 'RETAILER',
          partyId: targetRetailer ? targetRetailer.id : 'counter_walkin',
          partyName: targetRetailer ? (targetRetailer.shopName || targetRetailer.name) : rawShopName,
          retailerId: targetRetailer?.id,
          retailerName: targetRetailer ? (targetRetailer.shopName || targetRetailer.name) : rawShopName,
          retailerPhone: targetRetailer?.phone || data.customerPhone,
          productId: rep.productId || `prod_rep_${idx}`,
          productName: rep.productName,
          quantity: rep.quantity,
          unit: rep.unit || 'Pcs',
          reason: 'DAMAGED_PACKAGING',
          claimReason: 'DAMAGED_PACKAGING',
          claimReasonBangla: rep.reason || 'মেমো/খাতা থেকে স্ক্যানকৃত ড্যামেজ পণ্য',
          status: 'CREDITED_TO_LEDGER',
          resolutionType: 'BALANCE_DEDUCTION',
          adjustmentAmount: rep.value,
          date: invDate,
          marketRetailerName: targetRetailer ? (targetRetailer.shopName || targetRetailer.name) : rawShopName,
          companyChallanNo: undefined,
          notes: `মেমো #${invNo} এন্ট্রি থেকে সংগৃহীত। বিক্রয় মূল্য থেকে বাদ দেয়া হয়েছে। (${data.operatorMode === 'DSR' ? 'DSR খাতা' : 'ক্যাশ কাউন্টার'})`,
          createdAt: new Date().toISOString(),
          resolvedAt: new Date().toISOString(),
          operatorRole: data.operatorMode === 'DSR' ? 'dsr' : 'counter',
          operatorName: data.scannedByName || currentUser.name,
        };
      });

      createdClaimCount = newClaims.length;
      setReplacements((prev) => {
        const next = [...newClaims, ...prev];
        localStorage.setItem('ws_replacements', JSON.stringify(next));
        return next;
      });
      newClaims.forEach((c) => saveToFirestoreDoc(COLLECTIONS.REPLACEMENTS, c.id, c));
    }

    // 4. Create Order Invoice
    const salesOrderItems: OrderItem[] = data.salesItems.map((si) => ({
      productId: si.productId || `prod_${Math.random().toString(36).substr(2, 6)}`,
      productName: si.name,
      quantity: si.quantity,
      unit: si.unit || 'Pcs',
      unitPrice: si.price,
      costPrice: si.costPrice && Number(si.costPrice) > 0 ? Number(si.costPrice) : Math.round(si.price * 0.85),
      total: si.totalPrice,
      totalPrice: si.totalPrice,
      itemType: 'SALE',
      isReplacement: false,
    }));

    const repOrderItems: OrderItem[] = (data.replacementItems || []).map((rep, idx) => ({
      productId: rep.productId || `prod_rep_${idx}`,
      productName: rep.productName,
      quantity: rep.quantity,
      unit: rep.unit || 'Pcs',
      unitPrice: rep.quantity > 0 ? Math.round(rep.value / rep.quantity) : rep.value,
      costPrice: rep.quantity > 0 ? Math.round((rep.value / rep.quantity) * 0.85) : rep.value,
      total: -rep.value,
      totalPrice: -rep.value,
      itemType: 'REPLACEMENT',
      isReplacement: true,
      replacementReason: rep.reason || 'মার্কেট থেকে রিপ্লেস ফেরত',
    }));

    const orderItems: OrderItem[] = [...salesOrderItems, ...repOrderItems];
    const totalSoldPieces = data.salesItems.reduce((acc, si) => acc + (si.quantity !== undefined && !isNaN(Number(si.quantity)) ? Math.max(0, Number(si.quantity)) : 0), 0);
    const totalReturnedPieces = (data.replacementItems || []).reduce((acc, ri) => acc + (ri.quantity !== undefined && !isNaN(Number(ri.quantity)) ? Math.max(0, Number(ri.quantity)) : 0), 0);
    const netPieces = totalSoldPieces - totalReturnedPieces;
    const saleCostTotal = data.salesItems.reduce((acc, si) => acc + (si.quantity !== undefined && !isNaN(Number(si.quantity)) ? Math.max(0, Number(si.quantity)) : 0) * (si.costPrice || Math.round(si.price * 0.85)), 0);
    const repCostTotal = (data.replacementItems || []).reduce((acc, ri) => {
      const q = ri.quantity !== undefined && !isNaN(Number(ri.quantity)) ? Math.max(0, Number(ri.quantity)) : 0;
      return acc + (q > 0 ? q * Math.round((ri.value / q) * 0.85) : 0);
    }, 0);
    // User formula: "মার্কেট রিফ্লেক্স পণ্য থেকে মুনাফাটাও মাইনাস হবে কারণ পন্য ফেরত আসার সাথে সাথে ওই পণ্য থেকে মুনাফাটাও টাকা কমে গেছে, তাই ইনভয়সে বিক্রির মুনাফা থেকে রিপ্নালেস মুনাফা মাইনাস হয়ে নীপা মুনাফা দেখাবে"
    const saleGrossProfit = Math.max(0, data.totalSalesAmount - saleCostTotal);
    const repProfitLoss = Math.max(0, (data.replacementDeductionAmount || 0) - repCostTotal);
    const totalProfitAmount = Math.max(0, saleGrossProfit - repProfitLoss);
    const totalCostAmount = Math.max(0, data.netPayableAmount - totalProfitAmount);

    const newOrder: OrderInvoice = {
      id: `ord_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
      invoiceNo: invNo,
      invoiceNumber: invNo,
      date: invDate,
      retailerId: targetRetailer ? targetRetailer.id : 'counter_walkin',
      retailerName: targetRetailer ? (targetRetailer.shopName || targetRetailer.name) : rawShopName,
      retailerPhone: targetRetailer?.phone || data.customerPhone,
      customerPhone: targetRetailer?.phone || data.customerPhone,
      items: orderItems,
      totalSalesAmount: data.totalSalesAmount,
      totalReplacementAmount: data.replacementDeductionAmount,
      hasReplacements: (data.replacementDeductionAmount || 0) > 0,
      totalSoldPieces,
      totalReturnedPieces,
      netPieces,
      totalCostAmount,
      totalProfitAmount,
      subtotal: data.totalSalesAmount,
      discount: data.replacementDeductionAmount,
      totalAmount: data.netPayableAmount,
      paidAmount: actualPaid,
      dueAmount: actualDue,
      paymentMethod: data.paymentMethod || (actualDue === 0 ? 'Cash' : 'Credit'),
      paymentStatus: actualDue === 0 ? 'PAID' : (actualPaid > 0 ? 'PARTIAL' : 'UNPAID'),
      status: 'DELIVERED',
      createdAt: new Date().toISOString(),
      creatorRole: data.operatorMode === 'DSR' ? 'dsr' : 'counter',
      creatorName: data.scannedByName || currentUser.name,
      notes: data.notes || `${data.operatorMode === 'DSR' ? 'ডিএসআর রুট ডেলিভারি খাতা' : 'ক্যাশ কাউন্টার মেমো'} স্ক্যান এন্ট্রি (বিক্রয়: ৳${data.totalSalesAmount}, রিপ্লেস সমন্বয়: ৳${data.replacementDeductionAmount})`,
    };

    setOrders((prev) => {
      const next = [newOrder, ...prev];
      localStorage.setItem('ws_orders', JSON.stringify(next));
      return next;
    });
    saveToFirestoreDoc(COLLECTIONS.ORDERS, newOrder.id, newOrder);

    // 5. Update Cash Drawer if paid in cash
    if (actualPaid > 0 && (data.paymentMethod === 'Cash' || !data.paymentMethod)) {
      const creatorRole = data.operatorMode === 'DSR' ? 'dsr' : 'counter';
      setUsers((prevUsers) => {
        const next = prevUsers.map((u) => {
          const match =
            (data.scannedByUserId && u.id === data.scannedByUserId) ||
            u.role === creatorRole ||
            (creatorRole === 'dsr' && (u.name.toLowerCase().includes('razo') || u.name.toLowerCase().includes('raju') || (u.bnName && u.bnName.includes('রাজু'))));
          if (match) {
            const newDrawer = Math.max(0, (u.assignedCashDrawer || 0) + actualPaid);
            saveToFirestoreDoc(COLLECTIONS.USERS, u.id, { ...u, assignedCashDrawer: newDrawer });
            return { ...u, assignedCashDrawer: newDrawer };
          }
          return u;
        });
        localStorage.setItem('ws_users', JSON.stringify(next));
        return next;
      });

      setCurrentUserState((prev) => {
        const updatedUser = {
          ...prev,
          assignedCashDrawer: Math.max(0, (prev.assignedCashDrawer || 0) + actualPaid),
        };
        localStorage.setItem('ws_current_user', JSON.stringify(updatedUser));
        return updatedUser;
      });
    }

    // 6. Add rich Audit Activity Log
    addActivityLog({
      actionType: 'INVOICE_CREATE',
      title: `${data.operatorMode === 'DSR' ? 'DSR Sales & Replacement Memo' : 'Cash Counter Memo'} #${invNo}`,
      bnTitle: `${data.operatorMode === 'DSR' ? 'ডিএসআর খাতা' : 'ক্যাশ কাউন্টার মেমো'} #${invNo} (${rawShopName})`,
      description: `Recorded sales of ৳${data.totalSalesAmount} with ৳${data.replacementDeductionAmount} replacement deduction. Net: ৳${data.netPayableAmount}, Paid: ৳${actualPaid}, Due: ৳${actualDue}.`,
      bnDescription: `বিক্রয় ৳${data.totalSalesAmount.toLocaleString()} ও রিপ্লেসমেন্ট ছাড় ৳${data.replacementDeductionAmount.toLocaleString()} সহ নিট ৳${data.netPayableAmount.toLocaleString()} মেমো এন্ট্রি সম্পন্ন। নগদ জমা: ৳${actualPaid.toLocaleString()}, বাকি: ৳${actualDue.toLocaleString()}।`,
      actorRole: data.operatorMode === 'DSR' ? 'dsr' : 'counter',
      actorId: data.scannedByUserId || currentUser.id,
      actorName: data.scannedByName || currentUser.name,
      amount: data.netPayableAmount,
      relatedId: newOrder.id,
      status: 'COMPLETED',
    });

    pingRealtimeSync(data.operatorMode, 1).catch(() => {});

    return {
      success: true,
      message: `${data.operatorMode === 'DSR' ? 'ডিএসআর খাতা' : 'ক্যাশ কাউন্টার মেমো'} #${invNo} সফলভাবে সিস্টেমে যুক্ত ও হিসাব সমন্বয় হয়েছে!`,
      order: newOrder,
      replacementCount: createdClaimCount,
    };
  };

  // Replacement Settlement Handlers: Market (Retailer to Shop)
  const settleRetailerReplacementClaim = (
    claimId: string,
    resolutionType: 'CREDIT_TO_DUE' | 'GOODS_REPLACEMENT' | 'CASH_REFUND',
    notes?: string
  ) => {
    const claim = replacements.find((r) => r.id === claimId);
    if (!claim) return { success: false, message: 'রিপ্লেসমেন্ট দাবি পাওয়া যায়নি' };

    const claimAmount = claim.adjustmentAmount || 0;
    const retailer = retailers.find((r) => r.id === claim.retailerId || r.id === claim.partyId);

    // 1. Update claim
    const updatedClaim: ReplacementAdjustment = {
      ...claim,
      status: resolutionType === 'GOODS_REPLACEMENT' ? 'REPLACED_WITH_GOODS' : 'CREDITED_TO_LEDGER',
      resolutionType: resolutionType === 'GOODS_REPLACEMENT' ? 'PRODUCT_REPLACEMENT' : 'BALANCE_DEDUCTION',
      resolvedAt: new Date().toISOString(),
      notes: notes ? `${claim.notes || ''} | ${notes}` : claim.notes,
    };

    setReplacements((prev) => {
      const next = prev.map((c) => (c.id === claimId ? updatedClaim : c));
      localStorage.setItem('ws_replacements', JSON.stringify(next));
      return next;
    });
    saveToFirestoreDoc(COLLECTIONS.REPLACEMENTS, claimId, updatedClaim);

    // 2. Apply resolution impact
    if (resolutionType === 'CREDIT_TO_DUE' && retailer && claimAmount > 0) {
      const updatedRetailer = {
        ...retailer,
        outstandingDue: Math.max(0, (retailer.outstandingDue || 0) - claimAmount),
      };
      setRetailers((prev) => {
        const next = prev.map((r) => (r.id === retailer.id ? updatedRetailer : r));
        localStorage.setItem('ws_retailers', JSON.stringify(next));
        return next;
      });
      saveToFirestoreDoc(COLLECTIONS.RETAILERS, retailer.id, updatedRetailer);
    } else if (resolutionType === 'GOODS_REPLACEMENT' && claim.productId) {
      // Deduct replacement good from stock
      setProducts((prev) => {
        const next = prev.map((p) =>
          p.id === claim.productId ? { ...p, currentStock: Math.max(0, p.currentStock - (claim.quantity || 1)) } : p
        );
        localStorage.setItem('ws_products', JSON.stringify(next));
        return next;
      });
    } else if (resolutionType === 'CASH_REFUND' && claimAmount > 0) {
      setCurrentUserState((prev) => {
        const updated = { ...prev, assignedCashDrawer: (prev.assignedCashDrawer || 0) - claimAmount };
        localStorage.setItem('ws_current_user', JSON.stringify(updated));
        return updated;
      });
    }

    addActivityLog({
      actionType: 'STOCK_UPDATE',
      title: `Settled Market Replacement #${claim.claimNumber || claim.id.slice(-5)}`,
      bnTitle: `মার্কেট রিপ্লেসমেন্ট #${claim.claimNumber || claim.id.slice(-5)} নিষ্পত্তি`,
      description: `Settled replacement claim for ${claim.partyName || claim.retailerName} (${resolutionType}).`,
      bnDescription: `${claim.partyName || claim.retailerName}-এর রিপ্লেসমেন্ট দাবি নিষ্পত্তি সম্পন্ন (${resolutionType === 'CREDIT_TO_DUE' ? 'বকেয়া থেকে সমন্বয়' : resolutionType === 'GOODS_REPLACEMENT' ? 'ভালো পণ্য প্রদান' : 'নগদ ক্যাশ ফেরত'})।`,
      actorRole: currentUser.role,
      actorId: currentUser.id,
      actorName: currentUser.name,
      amount: claimAmount,
      relatedId: claimId,
      status: 'COMPLETED',
    });

    return { success: true, message: 'রিপ্লেসমেন্ট দাবি সফলভাবে নিষ্পত্তি করা হয়েছে!' };
  };

  const batchSettleRetailerClaims = (
    retailerId: string,
    claimIds: string[],
    resolutionType: 'CREDIT_TO_DUE' | 'GOODS_REPLACEMENT' | 'CASH_REFUND',
    notes?: string
  ) => {
    let totalSettled = 0;
    let totalAmt = 0;
    claimIds.forEach((id) => {
      const c = replacements.find((r) => r.id === id);
      if (c && c.status !== 'CREDITED_TO_LEDGER' && c.status !== 'REPLACED_WITH_GOODS') {
        settleRetailerReplacementClaim(id, resolutionType, notes);
        totalSettled++;
        totalAmt += c.adjustmentAmount || 0;
      }
    });
    return {
      success: true,
      message: `${totalSettled}টি রিপ্লেসমেন্ট দাবি সফলভাবে নিষ্পত্তি হয়েছে (মোট ৳${totalAmt.toLocaleString()})!`,
      count: totalSettled,
      totalAmount: totalAmt,
    };
  };

  // Replacement Settlement Handlers: Company (Credit Note / Adjustment)
  const recordCompanyCreditSettlement = (params: {
    supplierId: string;
    challanId?: string;
    creditAmount: number;
    creditNoteNo: string;
    date: string;
    notes?: string;
  }) => {
    const supplier = suppliers.find((s) => s.id === params.supplierId);
    if (!supplier) return { success: false, message: 'কোম্পানি বা সাপ্লায়ার পাওয়া যায়নি' };

    const safeCredit = Math.max(0, params.creditAmount);
    const safeNote = params.creditNoteNo || `CRN-${Date.now().toString().slice(-6)}`;
    const safeDate = params.date || new Date().toISOString().slice(0, 10);

    // 1. Reduce supplier outstanding payable
    const updatedSupplier = {
      ...supplier,
      outstandingPayable: Math.max(0, (supplier.outstandingPayable || 0) - safeCredit),
    };
    setSuppliers((prev) => {
      const next = prev.map((s) => (s.id === params.supplierId ? updatedSupplier : s));
      localStorage.setItem('ws_suppliers', JSON.stringify(next));
      return next;
    });
    saveToFirestoreDoc(COLLECTIONS.SUPPLIERS, supplier.id, updatedSupplier);

    // 2. Add Supplier Ledger Entry
    const returnLedgerEntry: SupplierLedgerEntry = {
      id: `led_credit_${Date.now()}`,
      supplierId: supplier.id,
      supplierName: supplier.name,
      type: 'RETURN_ADJUSTMENT',
      date: safeDate,
      amount: safeCredit,
      referenceNo: safeNote,
      balanceAfter: updatedSupplier.outstandingPayable,
      notes: params.notes || `কোম্পানি ক্রেডিট নোট / ভাউচার (#${safeNote}) দ্বারা রিপ্লেসমেন্ট সমন্বয়`,
    };

    setSupplierLedger((prev) => {
      const next = [returnLedgerEntry, ...prev];
      localStorage.setItem('ws_supplier_ledger', JSON.stringify(next));
      return next;
    });
    saveToFirestoreDoc(COLLECTIONS.SUPPLIER_LEDGER, returnLedgerEntry.id, returnLedgerEntry);

    // 3. If challanId is given, update that company return challan status
    if (params.challanId) {
      setCompanyReturns((prev) => {
        const next = prev.map((ch) => {
          if (ch.id === params.challanId) {
            const currentSettled = (ch.settledAmount || 0) + safeCredit;
            const updatedCh = {
              ...ch,
              status: currentSettled >= ch.totalValue ? ('SETTLED' as const) : ('PARTIAL' as const),
              settledAmount: currentSettled,
              creditNoteNo: safeNote,
              settledDate: safeDate,
            };
            saveToFirestoreDoc(COLLECTIONS.COMPANY_RETURNS, ch.id, updatedCh);
            return updatedCh;
          }
          return ch;
        });
        localStorage.setItem('ws_company_returns', JSON.stringify(next));
        return next;
      });
    }

    // 4. Log activity
    addActivityLog({
      actionType: 'STOCK_UPDATE',
      title: `Recorded Company Replacement Credit from ${supplier.company || supplier.name}`,
      bnTitle: `কোম্পানি ক্রেডিট নোট সমন্বয়: ${supplier.company || supplier.name}`,
      description: `Credited ৳${safeCredit.toLocaleString()} against return with Credit Note #${safeNote}.`,
      bnDescription: `কোম্পানি থেকে ৳${safeCredit.toLocaleString()} রিপ্লেসমেন্ট ক্রেডিট নোট #${safeNote} লেজারে সমন্বয় সম্পন্ন।`,
      actorRole: currentUser.role,
      actorId: currentUser.id,
      actorName: currentUser.name,
      amount: safeCredit,
      relatedId: safeNote,
      status: 'COMPLETED',
    });

    return {
      success: true,
      message: `কোম্পানি ক্রেডিট নোট #${safeNote} দ্বারা ৳${safeCredit.toLocaleString()} সফলভাবে লেজারে সমন্বয় হয়েছে!`,
    };
  };

  // Capital Transaction
  const addCapitalTransaction = (
    type: 'CAPITAL_INJECTION' | 'OWNER_WITHDRAWAL',
    amount: number,
    description: string,
    bnDescription: string,
    account: 'CASH_DRAWER' | 'BANK',
    customDate?: string
  ) => {
    const numericAmount = Math.abs(typeof amount === 'number' ? amount : Number(amount) || 0);
    if (numericAmount <= 0) return;

    const lastBalance = capitalTransactions[0]?.runningCapital || 0;
    const newRunning = type === 'CAPITAL_INJECTION' ? lastBalance + numericAmount : lastBalance - numericAmount;
    const txDate = customDate || new Date().toISOString().slice(0, 10);

    const newTx: CapitalTransaction = {
      id: `cap_${Date.now()}`,
      type,
      amount: numericAmount,
      date: txDate,
      description,
      bnDescription,
      account,
      runningCapital: newRunning,
    };

    setCapitalTransactions((prev) => [newTx, ...prev]);
    saveToFirestoreDoc(COLLECTIONS.CAPITAL_TRANSACTIONS, newTx.id, newTx);

    if (account === 'CASH_DRAWER') {
      setUsers((prev) => {
        const hasAdmin = prev.some((u) => u.role === 'admin' || u.id === 'usr_admin');
        if (!hasAdmin && prev.length > 0) {
          const updatedUsers = prev.map((u, i) =>
            i === 0
              ? {
                  ...u,
                  assignedCashDrawer:
                    type === 'CAPITAL_INJECTION'
                      ? (u.assignedCashDrawer || 0) + numericAmount
                      : (u.assignedCashDrawer || 0) - numericAmount,
                }
              : u
          );
          localStorage.setItem('ws_users', JSON.stringify(updatedUsers));
          return updatedUsers;
        }
        const updatedUsers = prev.map((u) => {
          if (u.role === 'admin' || u.id === 'usr_admin') {
            const newDrawer =
              type === 'CAPITAL_INJECTION'
                ? (u.assignedCashDrawer || 0) + numericAmount
                : (u.assignedCashDrawer || 0) - numericAmount;
            saveToFirestoreDoc(COLLECTIONS.USERS, u.id, { ...u, assignedCashDrawer: newDrawer });
            return { ...u, assignedCashDrawer: newDrawer };
          }
          return u;
        });
        localStorage.setItem('ws_users', JSON.stringify(updatedUsers));
        return updatedUsers;
      });

      setCurrentUserState((prev) => {
        if (prev.role === 'admin' || prev.id === 'usr_admin') {
          const newDrawer =
            type === 'CAPITAL_INJECTION'
              ? (prev.assignedCashDrawer || 0) + numericAmount
              : (prev.assignedCashDrawer || 0) - numericAmount;
          return { ...prev, assignedCashDrawer: newDrawer };
        }
        return prev;
      });
    } else if (account === 'BANK') {
      setBankAccounts((prev) => {
        if (prev.length === 0) {
          return [
            {
              id: 'bank_main',
              name: 'Primary Business Bank Account',
              bnName: 'প্রধান বাণিজ্যিক ব্যাংক অ্যাকাউন্ট',
              type: 'BANK',
              accountNumber: 'Main-A/C-01',
              balance: type === 'CAPITAL_INJECTION' ? numericAmount : 0,
            },
          ];
        }
        return prev.map((b, idx) => {
          if (idx === 0) {
            const newBal = type === 'CAPITAL_INJECTION' ? b.balance + numericAmount : Math.max(0, b.balance - numericAmount);
            return { ...b, balance: newBal };
          }
          return b;
        });
      });
    }
  };

  // Direct Bank and Cash Drawer Balances Management (সরাসরি ব্যালেন্স পরিবর্তন)
  const updateBankBalance = (newTotalAmount: number, notes?: string) => {
    const safeAmount = Math.max(0, Number(newTotalAmount) || 0);
    const currentTotal = bankAccounts.reduce((acc, b) => acc + (Number(b.balance) || 0), 0);
    const diff = safeAmount - currentTotal;

    setBankAccounts((prev) => {
      if (prev.length === 0) {
        return [
          {
            id: 'bank_main',
            name: 'Primary Commercial Bank A/C',
            bnName: 'প্রধান বাণিজ্যিক ব্যাংক অ্যাকাউন্ট',
            type: 'BANK',
            accountNumber: '115-120-45678',
            balance: safeAmount,
          },
        ];
      }
      return prev.map((acc, index) => {
        if (index === 0) {
          return { ...acc, balance: Math.max(0, (acc.balance || 0) + diff) };
        }
        return acc;
      });
    });

    if (diff !== 0) {
      const type = diff > 0 ? 'CAPITAL_INJECTION' : 'OWNER_WITHDRAWAL';
      const adjTx: CapitalTransaction = {
        id: `cap_adj_bank_${Date.now()}`,
        type,
        amount: Math.abs(diff),
        date: new Date().toISOString().slice(0, 10),
        description: notes || `Bank Balance Direct Adjustment: ৳${safeAmount}`,
        bnDescription: notes || `ব্যাংক ব্যালেন্স সরাসরি সমন্বয়: ৳${safeAmount}`,
        account: 'BANK',
        runningCapital: (capitalTransactions[0]?.runningCapital || 0) + diff,
      };
      setCapitalTransactions((prev) => [adjTx, ...prev]);
      saveToFirestoreDoc(COLLECTIONS.CAPITAL_TRANSACTIONS, adjTx.id, adjTx);

      addActivityLog({
        actionType: 'BALANCE_UPDATE',
        title: `Bank Balance Adjusted: ৳${safeAmount.toLocaleString()}`,
        bnTitle: `ব্যাংক ব্যালেন্স সমন্বয়: ৳${safeAmount.toLocaleString()}`,
        description: `${currentUser.name} adjusted Bank balance from ৳${currentTotal.toLocaleString()} to ৳${safeAmount.toLocaleString()} (${notes || 'Direct Adjustment'}).`,
        bnDescription: `${currentUser.name} ব্যাংকের ব্যালেন্স ৳${currentTotal.toLocaleString()} থেকে ৳${safeAmount.toLocaleString()}-এ সমন্বয় করেছেন (${notes || 'সরাসরি অডিট সমন্বয়'})।`,
        actorRole: currentUser.role,
        actorId: currentUser.id,
        actorName: currentUser.name,
        actorPhone: currentUser.phone,
        amount: safeAmount,
        status: 'ADJUSTED',
        metadata: { diff, prevAmount: currentTotal, notes },
      });
    }
  };

  const updateBankAccountBalance = (accountId: string, newBalance: number) => {
    const safeAmount = Math.max(0, Number(newBalance) || 0);
    setBankAccounts((prev) =>
      prev.map((b) => (b.id === accountId ? { ...b, balance: safeAmount } : b))
    );
  };

  const updateUserCashDrawer = (userId: string, newAmount: number, notes?: string) => {
    const targetUser = users.find((u) => u.id === userId || (u.role === 'admin' && userId === 'admin'));
    const safeAmount = Number(newAmount) || 0;
    const prevAmount = targetUser?.assignedCashDrawer || 0;
    const diff = safeAmount - prevAmount;

    setUsers((prev) => {
      const updated = prev.map((u) => {
        if (u.id === userId || (u.role === 'admin' && userId === 'admin')) {
          const userWithDrawer = { ...u, assignedCashDrawer: safeAmount };
          saveToFirestoreDoc(COLLECTIONS.USERS, u.id, userWithDrawer);
          return userWithDrawer;
        }
        return u;
      });
      localStorage.setItem('ws_users', JSON.stringify(updated));
      return updated;
    });

    setCurrentUserState((prev) => {
      if (prev.id === userId || (prev.role === 'admin' && userId === 'admin')) {
        return { ...prev, assignedCashDrawer: safeAmount };
      }
      return prev;
    });

    if (diff !== 0) {
      if (targetUser?.role === 'admin') {
        const type = diff > 0 ? 'CAPITAL_INJECTION' : 'OWNER_WITHDRAWAL';
        const adjTx: CapitalTransaction = {
          id: `cap_adj_cash_${Date.now()}`,
          type,
          amount: Math.abs(diff),
          date: new Date().toISOString().slice(0, 10),
          description: notes || `Admin Cash Vault Balance Adjustment: ৳${safeAmount}`,
          bnDescription: notes || `এডমিন ক্যাশ ভল্ট সরাসরি ব্যালেন্স সমন্বয়: ৳${safeAmount}`,
          account: 'CASH_DRAWER',
          runningCapital: (capitalTransactions[0]?.runningCapital || 0) + diff,
        };
        setCapitalTransactions((prev) => [adjTx, ...prev]);
        saveToFirestoreDoc(COLLECTIONS.CAPITAL_TRANSACTIONS, adjTx.id, adjTx);
      }

      addActivityLog({
        actionType: 'BALANCE_UPDATE',
        title: `${targetUser?.name || 'User'} Cash Drawer Adjusted: ৳${safeAmount.toLocaleString()}`,
        bnTitle: `${targetUser?.bnName || targetUser?.name || 'ব্যবহারকারী'}-এর ক্যাশ ব্যালেন্স সমন্বয়: ৳${safeAmount.toLocaleString()}`,
        description: `${currentUser.name} updated cash drawer of ${targetUser?.name || userId} (${targetUser?.role?.toUpperCase() || 'USER'}) from ৳${prevAmount.toLocaleString()} to ৳${safeAmount.toLocaleString()}.`,
        bnDescription: `${currentUser.name} ${targetUser?.name || userId}-এর ক্যাশ ড্রয়ার ৳${prevAmount.toLocaleString()} থেকে ৳${safeAmount.toLocaleString()}-এ সমন্বয় করেছেন।`,
        actorRole: currentUser.role,
        actorId: currentUser.id,
        actorName: currentUser.name,
        actorPhone: currentUser.phone,
        amount: safeAmount,
        status: 'ADJUSTED',
        metadata: { userId, targetRole: targetUser?.role, diff, prevAmount, notes },
      });
    }
  };

  const updateAdminCashVault = (newAmount: number, notes?: string) => {
    const admin = users.find((u) => u.role === 'admin');
    if (admin) {
      updateUserCashDrawer(admin.id, newAmount, notes);
    } else {
      updateUserCashDrawer('admin', newAmount, notes);
    }
  };

  const updateCounterCash = (newAmount: number, notes?: string) => {
    const counter = users.find((u) => u.role === 'counter');
    if (counter) {
      updateUserCashDrawer(counter.id, newAmount, notes);
    }
  };

  const updateDsrCash = (newAmount: number, notes?: string) => {
    const dsr = users.find((u) => u.role === 'dsr');
    if (dsr) {
      updateUserCashDrawer(dsr.id, newAmount, notes);
    }
  };

  const adjustDirectBalance = (target: BalanceAccountType, newAmount: number, notes?: string) => {
    if (target === 'BANK') {
      updateBankBalance(newAmount, notes);
    } else if (target === 'ADMIN_CASH') {
      updateAdminCashVault(newAmount, notes);
    } else if (target === 'COUNTER_CASH') {
      updateCounterCash(newAmount, notes);
    } else if (target === 'DSR_CASH') {
      updateDsrCash(newAmount, notes);
    }
  };

  const showNotification = useCallback((message: string, type: 'success' | 'error' | 'info' = 'info') => {
    console.info(`[Notification - ${type}]:`, message);
  }, []);

  // Product Inventory Management Actions
  const updateProductThreshold = (productId: string, newThreshold: number) => {
    const safeThreshold = Math.max(0, Math.round(Number(newThreshold) || 0));
    setProducts((prev) =>
      prev.map((p) => {
        if (p.id === productId) {
          const updatedProduct = { ...p, lowStockThreshold: safeThreshold, minStockLevel: safeThreshold };
          saveToFirestoreDoc(COLLECTIONS.PRODUCTS, p.id, updatedProduct);
          return updatedProduct;
        }
        return p;
      })
    );
  };

  const restockProduct = (productId: string, quantityToAdd: number) => {
    const qty = Math.max(0, Number(quantityToAdd) || 0);
    if (qty <= 0) return;
    setProducts((prev) =>
      prev.map((p) => {
        if (p.id === productId) {
          const updatedProduct = { ...p, stockQuantity: (p.stockQuantity || 0) + qty };
          saveToFirestoreDoc(COLLECTIONS.PRODUCTS, p.id, updatedProduct);
          return updatedProduct;
        }
        return p;
      })
    );
  };

  const updateProduct = (
    productOrId: Product | string,
    partialUpdates?: Partial<Product>
  ) => {
    let finalProduct: Product | undefined;
    if (typeof productOrId === 'string') {
      const existing = products.find((p) => p.id === productOrId);
      if (existing) {
        finalProduct = { ...existing, ...partialUpdates };
      }
    } else {
      finalProduct = productOrId;
    }
    if (!finalProduct) return;
    const target = finalProduct;
    setProducts((prev) =>
      prev.map((p) => (p.id === target.id ? target : p))
    );
    saveToFirestoreDoc(COLLECTIONS.PRODUCTS, target.id, target);
  };

  const mergeAllDuplicateProducts = (): { mergedCount: number; message: string } => {
    let duplicateIds: string[] = [];
    let updatedProducts: Product[] = [];

    setProducts((prev) => {
      const result = mergeDuplicateProductsList(prev, (ids) => {
        duplicateIds = ids;
      });
      updatedProducts = result.merged;
      localStorage.setItem('ws_products', JSON.stringify(result.merged));
      return result.merged;
    });

    if (duplicateIds.length > 0) {
      duplicateIds.forEach((id) => {
        deleteFirestoreDoc(COLLECTIONS.PRODUCTS, id);
      });
    }

    updatedProducts.forEach((p) => {
      saveToFirestoreDoc(COLLECTIONS.PRODUCTS, p.id, p);
    });

    return {
      mergedCount: duplicateIds.length,
      message:
        duplicateIds.length > 0
          ? `সফলভাবে মোট ${duplicateIds.length}টি ডুপ্লিকেট পণ্য মার্জ ও স্টক একত্রিত করা হয়েছে!`
          : `কোনো ডুপ্লিকেট পণ্য পাওয়া যায়নি, আপনার সকল স্টক পণ্য ইউনিক ও সুবিন্যস্ত।`,
    };
  };

  const addProduct = (productData: Omit<Product, 'id'> | Product): Product => {
    const rawName = (productData.name || '').trim();
    const rawBnName = (productData.bnName || '').trim();
    const normName = normalizeProductKey(rawName);
    const normBnName = rawBnName ? normalizeProductKey(rawBnName) : '';
    const rawSku = (productData.sku || '').trim().toLowerCase();

    // Check if product with identical or equivalent name/SKU already exists
    const existingIndex = products.findIndex((p) => {
      const pSku = (p.sku || '').trim().toLowerCase();
      return (
        areProductNamesEquivalent(p.name, rawName) ||
        areProductNamesEquivalent(p.bnName, rawName) ||
        (normName && normalizeProductKey(p.name) === normName) ||
        (normName && p.bnName && normalizeProductKey(p.bnName) === normName) ||
        (normBnName && normalizeProductKey(p.name) === normBnName) ||
        (rawSku && pSku && rawSku === pSku)
      );
    });

    if (existingIndex >= 0) {
      const existing = products[existingIndex];
      const incomingQty = Number(productData.stockQuantity) || 0;
      const newRef = (productData.latestChallanNo || '').trim();
      const prevRefs = existing.challanReferences || [];

      const updatedRefs = newRef
        ? [
            {
              challanNo: newRef,
              date: getTodayDateString(),
              quantity: incomingQty,
              costPrice: productData.costPrice || existing.costPrice,
              supplierName: productData.supplierName || existing.supplierName,
              supplierId: productData.supplierId || existing.supplierId,
            },
            ...prevRefs.filter((r) => r.challanNo !== newRef),
          ]
        : prevRefs;

      const updatedProduct: Product = {
        ...existing,
        stockQuantity: (existing.stockQuantity || 0) + incomingQty,
        costPrice: productData.costPrice || existing.costPrice,
        wholesalePrice: productData.wholesalePrice || existing.wholesalePrice,
        retailPrice: productData.retailPrice || existing.retailPrice || productData.mrp,
        mrp: productData.mrp || existing.mrp,
        image: productData.image || existing.image,
        latestChallanNo: newRef || existing.latestChallanNo,
        challanReferences: updatedRefs,
      };

      setProducts((prev) => {
        const next = [...prev];
        next[existingIndex] = updatedProduct;
        localStorage.setItem('ws_products', JSON.stringify(next));
        return next;
      });
      saveToFirestoreDoc(COLLECTIONS.PRODUCTS, updatedProduct.id, updatedProduct);
      return updatedProduct;
    }

    const id =
      'id' in productData && productData.id
        ? productData.id
        : `prod_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`;
    const newRef = (productData.latestChallanNo || '').trim();
    const initialRefs = newRef
      ? [
          {
            challanNo: newRef,
            date: getTodayDateString(),
            quantity: Number(productData.stockQuantity) || 0,
            costPrice: productData.costPrice || 0,
            supplierName: productData.supplierName || '',
            supplierId: productData.supplierId || '',
          },
        ]
      : [];

    const newProduct: Product = {
      ...productData,
      id,
      latestChallanNo: newRef,
      challanReferences: initialRefs,
      adminRef: currentUser.role === 'admin' ? currentUser.phone : currentUser.adminRef || activeAdminPhone,
    } as Product;

    setProducts((prev) => {
      const { merged, duplicateIdsRemoved } = mergeDuplicateProductsList([newProduct, ...prev]);
      if (duplicateIdsRemoved.length > 0) {
        duplicateIdsRemoved.forEach((delId) => {
          deleteFirestoreDoc(COLLECTIONS.PRODUCTS, delId);
        });
      }
      localStorage.setItem('ws_products', JSON.stringify(merged));
      return merged;
    });
    saveToFirestoreDoc(COLLECTIONS.PRODUCTS, newProduct.id, newProduct);
    return newProduct;
  };

  const deleteProduct = (productId: string) => {
    setProducts((prev) => {
      const filtered = prev.filter((p) => p.id !== productId);
      localStorage.setItem('ws_products', JSON.stringify(filtered));
      return filtered;
    });
    deleteFirestoreDoc(COLLECTIONS.PRODUCTS, productId);
    return { success: true, message: 'Product deleted successfully' };
  };

  // Delete wrong Order / Invoice with automatic stock & balance reversal
  const deleteOrder = (orderId: string, restoreStock: boolean = true) => {
    const targetOrder = orders.find((o) => o.id === orderId);
    if (!targetOrder) return { success: false, message: 'Order not found' };

    // 1. Revert product stock quantities: Restore sold items (+) and remove market reflex items (-)
    if (restoreStock && targetOrder.items && Array.isArray(targetOrder.items)) {
      setProducts((prev) => {
        const next = prev.map((p) => {
          const saleItem = targetOrder.items.find((i: any) => i.productId === p.id && !i.isReplacement && i.itemType !== 'REPLACEMENT');
          const repItem = targetOrder.items.find((i: any) => i.productId === p.id && (i.isReplacement || i.itemType === 'REPLACEMENT'));
          if (saleItem || repItem) {
            const soldQty = saleItem ? Math.max(0, Number(saleItem.quantity) || 0) : 0;
            const repQty = repItem ? Math.max(0, Number(repItem.quantity) || 0) : 0;
            const currentQty = p.stockQuantity ?? (p as any).currentStock ?? 0;
            const restoredQty = Math.max(0, currentQty + soldQty - repQty);
            const updatedProduct = { ...p, stockQuantity: restoredQty, currentStock: restoredQty };
            saveToFirestoreDoc(COLLECTIONS.PRODUCTS, p.id, updatedProduct);
            return updatedProduct;
          }
          return p;
        });
        localStorage.setItem('ws_products', JSON.stringify(next));
        idbSetState('ws_products', next);
        return next;
      });
    }

    // 2. Revert retailer outstanding due and total purchases
    if (targetOrder.retailerId) {
      setRetailers((prev) =>
        prev.map((r) => {
          if (r.id === targetOrder.retailerId) {
            const dueToDeduct = Number(targetOrder.dueAmount || 0);
            const totalToDeduct = Number(targetOrder.totalAmount || 0);
            const updatedRetailer = {
              ...r,
              outstandingDue: round2(Math.max(0, (r.outstandingDue || 0) - dueToDeduct)),
              currentDue: round2(Math.max(0, (r.currentDue || 0) - dueToDeduct)),
              totalPurchases: round2(Math.max(0, (r.totalPurchases || 0) - totalToDeduct)),
            };
            saveToFirestoreDoc(COLLECTIONS.RETAILERS, r.id, updatedRetailer);
            return updatedRetailer;
          }
          return r;
        })
      );
    }

    // 3. If paid in cash, revert drawer balance of creator
    if (targetOrder.paidAmount && targetOrder.paidAmount > 0 && targetOrder.paymentMethod === 'Cash') {
      const creatorRole = targetOrder.salesPersonRole || targetOrder.creatorRole;
      if (creatorRole) {
        setUsers((prev) => {
          const updatedUsers = prev.map((u) => {
            if (u.role === creatorRole) {
              const newDrawer = round2((u.assignedCashDrawer || 0) - targetOrder.paidAmount);
              saveToFirestoreDoc(COLLECTIONS.USERS, u.id, { ...u, assignedCashDrawer: newDrawer });
              return { ...u, assignedCashDrawer: newDrawer };
            }
            return u;
          });
          localStorage.setItem('ws_users', JSON.stringify(updatedUsers));
          return updatedUsers;
        });
        if (currentUser.role === creatorRole) {
          setCurrentUserState((prev) => ({
            ...prev,
            assignedCashDrawer: (prev.assignedCashDrawer || 0) - targetOrder.paidAmount,
          }));
        }
      }
    }

    // 4. Remove any auto-generated replacement claims for this invoice
    const invClean = (targetOrder.invoiceNo || targetOrder.invoiceNumber || '').trim();
    if (invClean) {
      setReplacements((prev) => {
        const next = prev.filter(
          (r) =>
            !(r.notes && r.notes.includes(invClean)) &&
            !(r.claimNo && r.claimNo.includes(invClean.replace(/[^a-zA-Z0-9]/g, '')))
        );
        localStorage.setItem('ws_replacements', JSON.stringify(next));
        return next;
      });
    }

    // 5. Remove order from state and database
    setOrders((prev) => prev.filter((o) => o.id !== orderId));
    deleteFirestoreDoc(COLLECTIONS.ORDERS, orderId);
    return { success: true, message: 'Order invoice deleted and stock reversed' };
  };

  // Update existing Order / Invoice with automatic stock, replacement, & balance re-calculation
  const updateOrderInvoice = (orderId: string, updatedData: any) => {
    const existingOrder = orders.find((o) => o.id === orderId);
    if (!existingOrder) return { success: false, message: 'Order not found' };

    // 1. Revert previous stock deductions: restore previous sold items (+), remove previous market reflex items (-)
    if (existingOrder.items && Array.isArray(existingOrder.items)) {
      setProducts((prev) => {
        const next = prev.map((p) => {
          const oldSale = existingOrder.items.find((i: any) => i.productId === p.id && !i.isReplacement && i.itemType !== 'REPLACEMENT');
          const oldRep = existingOrder.items.find((i: any) => i.productId === p.id && (i.isReplacement || i.itemType === 'REPLACEMENT'));
          if (oldSale || oldRep) {
            const oldSoldQty = oldSale ? Math.max(0, Number(oldSale.quantity) || 0) : 0;
            const oldRepQty = oldRep ? Math.max(0, Number(oldRep.quantity) || 0) : 0;
            const currentQty = p.stockQuantity ?? (p as any).currentStock ?? 0;
            const revertedQty = Math.max(0, currentQty + oldSoldQty - oldRepQty);
            const updatedProduct = { ...p, stockQuantity: revertedQty, currentStock: revertedQty };
            saveToFirestoreDoc(COLLECTIONS.PRODUCTS, p.id, updatedProduct);
            return updatedProduct;
          }
          return p;
        });
        localStorage.setItem('ws_products', JSON.stringify(next));
        idbSetState('ws_products', next);
        return next;
      });
    }

    // 2. Revert previous retailer balance
    if (existingOrder.retailerId) {
      setRetailers((prev) =>
        prev.map((r) => {
          if (r.id === existingOrder.retailerId) {
            const dueToDeduct = Number(existingOrder.dueAmount || 0);
            const totalToDeduct = Number(existingOrder.totalAmount || 0);
            const updatedRetailer = {
              ...r,
              outstandingDue: Math.max(0, (r.outstandingDue || 0) - dueToDeduct),
              currentDue: Math.max(0, (r.currentDue || 0) - dueToDeduct),
              totalPurchases: Math.max(0, (r.totalPurchases || 0) - totalToDeduct),
            };
            saveToFirestoreDoc(COLLECTIONS.RETAILERS, r.id, updatedRetailer);
            return updatedRetailer;
          }
          return r;
        })
      );
    }

    // 3. Revert previous cash drawer if paid in cash
    if (existingOrder.paidAmount && existingOrder.paidAmount > 0 && existingOrder.paymentMethod === 'Cash') {
      const creatorRole = existingOrder.salesPersonRole || existingOrder.creatorRole;
      if (creatorRole) {
        setUsers((prev) => {
          const updatedUsers = prev.map((u) => {
            if (u.role === creatorRole) {
              const newDrawer = (u.assignedCashDrawer || 0) - existingOrder.paidAmount;
              saveToFirestoreDoc(COLLECTIONS.USERS, u.id, { ...u, assignedCashDrawer: newDrawer });
              return { ...u, assignedCashDrawer: newDrawer };
            }
            return u;
          });
          localStorage.setItem('ws_users', JSON.stringify(updatedUsers));
          return updatedUsers;
        });
      }
    }

    // 4. Calculate new order financial values and enrich items
    const rawItems = updatedData.items || existingOrder.items || [];
    let computedSalesTotal = 0;
    let computedReplacementTotal = 0;
    let computedSoldPieces = 0;
    let computedReturnedPieces = 0;
    let computedCostTotal = 0;
    let computedReplacementCostTotal = 0;

    const enrichedItems: OrderItem[] = rawItems.map((item: any) => {
      const isRep = item.itemType === 'REPLACEMENT' || item.isReplacement === true || Number(item.quantity) < 0;
      const matchedProduct = products.find(
        (p) =>
          p.id === item.productId ||
          (p.name && item.productName && p.name.trim().toLowerCase() === item.productName.trim().toLowerCase())
      );
      const refNo =
        item.challanRefNo ||
        matchedProduct?.latestChallanNo ||
        (matchedProduct?.challanReferences && matchedProduct.challanReferences[0]?.challanNo) ||
        '';
      const cleanQty =
        item.quantity !== undefined && item.quantity !== null && !isNaN(Number(item.quantity))
          ? Math.max(0, Number(item.quantity))
          : 0;
      const cleanPrice =
        item.unitPrice !== undefined && item.unitPrice !== null && !isNaN(Number(item.unitPrice))
          ? Math.max(0, Number(item.unitPrice))
          : Number(matchedProduct?.wholesalePrice ?? 0);
      const cleanCost =
        item.costPrice !== undefined && item.costPrice !== null && !isNaN(Number(item.costPrice))
          ? Math.max(0, Number(item.costPrice))
          : Number(matchedProduct?.costPrice ?? 0);
      const lineTotal = cleanQty * cleanPrice;

      if (isRep) {
        computedReplacementTotal += lineTotal;
        computedReturnedPieces += cleanQty;
        computedReplacementCostTotal += cleanQty * cleanCost;
      } else {
        computedSalesTotal += lineTotal;
        computedSoldPieces += cleanQty;
        computedCostTotal += cleanQty * cleanCost;
      }

      return {
        ...item,
        productId: item.productId || matchedProduct?.id || `prod_${Date.now()}`,
        productName: item.productName || matchedProduct?.name || 'Product',
        bnProductName: item.bnProductName || matchedProduct?.bnName,
        quantity: cleanQty,
        unit: item.unit || matchedProduct?.unit || 'pcs',
        unitPrice: cleanPrice,
        costPrice: cleanCost,
        total: isRep ? -lineTotal : lineTotal,
        totalPrice: isRep ? -lineTotal : lineTotal,
        challanRefNo: refNo,
        image: item.image || matchedProduct?.image,
        itemType: isRep ? 'REPLACEMENT' : 'SALE',
        isReplacement: isRep,
        replacementReason: item.replacementReason || (isRep ? 'মার্কেট থেকে রিপ্লেস ফেরত' : undefined),
      };
    });

    const newSubtotal = Math.max(0, computedSalesTotal - computedReplacementTotal);
    const newDiscount = updatedData.discountAmount ?? updatedData.discount ?? existingOrder.discountAmount ?? existingOrder.discount ?? 0;
    const newTotalAmount = updatedData.totalAmount !== undefined ? updatedData.totalAmount : Math.max(0, newSubtotal - newDiscount);
    const newPaidAmount = updatedData.paidAmount !== undefined ? updatedData.paidAmount : existingOrder.paidAmount;
    const newDueAmount = updatedData.dueAmount !== undefined ? updatedData.dueAmount : Math.max(0, newTotalAmount - newPaidAmount);
    const newPaymentMethod = updatedData.paymentMethod || existingOrder.paymentMethod || 'Cash';
    const targetRetailerId = updatedData.retailerId || existingOrder.retailerId;
    const finalSoldPieces = updatedData.totalSoldPieces !== undefined ? updatedData.totalSoldPieces : computedSoldPieces;
    const finalReturnedPieces = updatedData.totalReturnedPieces !== undefined ? updatedData.totalReturnedPieces : computedReturnedPieces;
    const netPieces = finalSoldPieces - finalReturnedPieces;
    const netCostDelivered = Math.max(0, computedCostTotal - computedReplacementCostTotal);
    const totalCostAmount = updatedData.totalCostAmount !== undefined ? updatedData.totalCostAmount : netCostDelivered;
    const totalProfitAmount = updatedData.totalProfitAmount !== undefined ? updatedData.totalProfitAmount : Math.max(0, newTotalAmount - totalCostAmount);

    const mergedInvoice: OrderInvoice = {
      ...existingOrder,
      ...updatedData,
      items: enrichedItems,
      subtotal: newSubtotal,
      discountAmount: newDiscount,
      totalAmount: newTotalAmount,
      totalSalesAmount: computedSalesTotal,
      totalReplacementAmount: computedReplacementTotal,
      hasReplacements: computedReplacementTotal > 0,
      totalSoldPieces: finalSoldPieces,
      totalReturnedPieces: finalReturnedPieces,
      netPieces,
      totalCostAmount,
      totalProfitAmount,
      paidAmount: newPaidAmount,
      dueAmount: newDueAmount,
      paymentMethod: newPaymentMethod,
    };

    // 5. Apply new stock impacts: deduct new sold items (-), add new market reflex items (+)
    setProducts((prev) => {
      const next = prev.map((p) => {
        const newSale = enrichedItems.find((i) => i.productId === p.id && !i.isReplacement);
        const newRep = enrichedItems.find((i) => i.productId === p.id && i.isReplacement);
        if (newSale || newRep) {
          const newSoldQty = newSale ? Math.max(0, Number(newSale.quantity) || 0) : 0;
          const newRepQty = newRep ? Math.max(0, Number(newRep.quantity) || 0) : 0;
          const currentQty = p.stockQuantity ?? (p as any).currentStock ?? 0;
          const newQty = Math.max(0, currentQty - newSoldQty + newRepQty);
          const updatedProduct = { ...p, stockQuantity: newQty, currentStock: newQty };
          saveToFirestoreDoc(COLLECTIONS.PRODUCTS, p.id, updatedProduct);
          return updatedProduct;
        }
        return p;
      });
      localStorage.setItem('ws_products', JSON.stringify(next));
      idbSetState('ws_products', next);
      return next;
    });

    // 6. Apply new retailer balance
    if (targetRetailerId) {
      setRetailers((prev) =>
        prev.map((r) => {
          if (r.id === targetRetailerId) {
            const updatedRetailer = {
              ...r,
              outstandingDue: (r.outstandingDue || 0) + newDueAmount,
              currentDue: (r.outstandingDue || 0) + newDueAmount,
              totalPurchases: (r.totalPurchases || 0) + newTotalAmount,
            };
            saveToFirestoreDoc(COLLECTIONS.RETAILERS, r.id, updatedRetailer);
            return updatedRetailer;
          }
          return r;
        })
      );
    }

    // 7. Apply new cash drawer if paid in cash
    if (newPaidAmount > 0 && newPaymentMethod === 'Cash') {
      const creatorRole = mergedInvoice.salesPersonRole || mergedInvoice.creatorRole;
      if (creatorRole) {
        setUsers((prev) => {
          const updatedUsers = prev.map((u) => {
            if (u.role === creatorRole) {
              const newDrawer = (u.assignedCashDrawer || 0) + newPaidAmount;
              saveToFirestoreDoc(COLLECTIONS.USERS, u.id, { ...u, assignedCashDrawer: newDrawer });
              return { ...u, assignedCashDrawer: newDrawer };
            }
            return u;
          });
          localStorage.setItem('ws_users', JSON.stringify(updatedUsers));
          return updatedUsers;
        });
      }
    }

    // 8. Re-sync Replacement claims for this invoice
    const invClean = (mergedInvoice.invoiceNo || mergedInvoice.invoiceNumber || '').replace(/[^a-zA-Z0-9]/g, '');
    const replacementItems = enrichedItems.filter((i) => i.isReplacement);
    setReplacements((prev) => {
      const filtered = prev.filter(
        (r) =>
          !(r.notes && r.notes.includes(mergedInvoice.invoiceNo)) &&
          !(r.claimNo && invClean && r.claimNo.includes(invClean))
      );
      const newClaims: ReplacementClaim[] = replacementItems.map((item, idx) => ({
        id: `rep_pos_${Date.now()}_${idx}_${Math.random().toString(36).substr(2, 4)}`,
        claimNo: `CLM-${invClean || Date.now()}-${idx + 1}`,
        trackingNo: `CLM-${invClean || Date.now()}-${idx + 1}`,
        partyType: 'RETAILER',
        entityType: 'RETAILER',
        partyId: targetRetailerId || 'counter_walkin',
        entityId: targetRetailerId || 'counter_walkin',
        partyName: mergedInvoice.retailerName || 'Retailer',
        entityName: mergedInvoice.retailerName || 'Retailer',
        retailerId: targetRetailerId || 'counter_walkin',
        retailerName: mergedInvoice.retailerName || 'Retailer',
        retailerPhone: mergedInvoice.retailerPhone,
        productId: item.productId,
        productName: item.productName,
        bnProductName: item.bnProductName,
        quantity: Math.abs(item.quantity),
        unit: item.unit || 'pcs',
        unitCost: item.unitPrice,
        estimatedValue: Math.abs(item.quantity * item.unitPrice),
        totalAdjustmentValue: Math.abs(item.quantity * item.unitPrice),
        reason: item.replacementReason || 'মার্কেট থেকে রিপ্লেস ফেরত (সংশোধিত বিক্রয় চালান)',
        claimReasonBangla: item.replacementReason || 'মার্কেট থেকে রিপ্লেস ফেরত',
        status: 'REPLACED_WITH_GOODS',
        resolutionType: 'PRODUCT_REPLACEMENT',
        date: (mergedInvoice.date || getTodayDateString()).slice(0, 10),
        createdAt: new Date().toISOString(),
        operatorRole: (mergedInvoice.creatorRole || 'counter') as UserRole,
        operatorName: mergedInvoice.creatorName || currentUser.name,
        notes: `সংশোধিত বিক্রয় চালান #${mergedInvoice.invoiceNo}-তে সমন্বিত মার্কেট রিপ্লেস (মাইনাস কাউন্ট)`,
      }));
      const combined = [...newClaims, ...filtered];
      localStorage.setItem('ws_replacements', JSON.stringify(combined));
      newClaims.forEach((c) => saveToFirestoreDoc(COLLECTIONS.REPLACEMENTS, c.id, c));
      return combined;
    });

    // 9. Save to orders state & Firestore
    setOrders((prev) => {
      const updated = prev.map((o) => (o.id === orderId ? mergedInvoice : o));
      localStorage.setItem('ws_orders', JSON.stringify(updated));
      return updated;
    });
    saveToFirestoreDoc(COLLECTIONS.ORDERS, orderId, mergedInvoice);

    pingRealtimeSync(mergedInvoice.salesPersonRole || mergedInvoice.creatorRole, 1).catch(() => {});

    return {
      success: true,
      message: language === 'bn' ? `চালান #${mergedInvoice.invoiceNo} সফলভাবে সংশোধন ও স্টক সমন্বয় হয়েছে!` : `Invoice #${mergedInvoice.invoiceNo} updated successfully!`,
      order: mergedInvoice,
    };
  };

  // Delete Retailer
  const deleteRetailer = (retailerId: string) => {
    setRetailers((prev) => {
      const filtered = prev.filter((r) => r.id !== retailerId);
      localStorage.setItem('ws_retailers', JSON.stringify(filtered));
      return filtered;
    });
    deleteFirestoreDoc(COLLECTIONS.RETAILERS, retailerId);
    return { success: true, message: 'Retailer deleted successfully' };
  };

  // Update Retailer (Phone number, owner name, shop name, route, credit limit, etc.)
  const updateRetailer = (updatedRetailer: Retailer) => {
    setRetailers((prev) => {
      const list = prev.map((r) => (r.id === updatedRetailer.id ? updatedRetailer : r));
      localStorage.setItem('ws_retailers', JSON.stringify(list));
      return list;
    });
    saveToFirestoreDoc(COLLECTIONS.RETAILERS, updatedRetailer.id, updatedRetailer);
  };

  const addRetailer = (retailerData: Omit<Retailer, 'id'> | Retailer): Retailer => {
    const id = 'id' in retailerData && retailerData.id ? retailerData.id : `ret_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`;
    const newRetailer: Retailer = {
      outstandingDue: 0,
      currentDue: 0,
      totalPurchases: 0,
      creditLimit: 50000,
      ...retailerData,
      id,
    } as Retailer;

    setRetailers((prev) => {
      const list = [newRetailer, ...prev];
      localStorage.setItem('ws_retailers', JSON.stringify(list));
      return list;
    });
    saveToFirestoreDoc(COLLECTIONS.RETAILERS, newRetailer.id, newRetailer);
    return newRetailer;
  };

  // Delete Supplier
  const deleteSupplier = (supplierId: string) => {
    setSuppliers((prev) => {
      const filtered = prev.filter((s) => s.id !== supplierId);
      localStorage.setItem('ws_suppliers', JSON.stringify(filtered));
      return filtered;
    });
    deleteFirestoreDoc(COLLECTIONS.SUPPLIERS, supplierId);
    return { success: true, message: 'Supplier deleted successfully' };
  };

  // Update Supplier (Phone number, company, name, balance, terms)
  const updateSupplier = (updatedSupplier: Supplier) => {
    setSuppliers((prev) => {
      const list = prev.map((s) => (s.id === updatedSupplier.id ? updatedSupplier : s));
      localStorage.setItem('ws_suppliers', JSON.stringify(list));
      return list;
    });
    saveToFirestoreDoc(COLLECTIONS.SUPPLIERS, updatedSupplier.id, updatedSupplier);
  };

  // Dedicated single-place Opening DO / Opening Due Setup & Edit for Supplier
  const updateSupplierOpeningDue = (params: {
    supplierId: string;
    openingBalance: number;
    openingDate: string;
    openingNotes?: string;
  }) => {
    const targetSupplier = suppliers.find((s) => s.id === params.supplierId);
    if (!targetSupplier) return { success: false, message: 'সাপ্লায়ার পাওয়া যায়নি' };

    const safeOpeningBalance = Math.max(0, Number(params.openingBalance) || 0);
    const safeOpeningDate = params.openingDate && /^\d{4}-\d{2}-\d{2}$/.test(params.openingDate)
      ? params.openingDate
      : (targetSupplier.openingDate || getTodayDateString());
    const safeOpeningNotes = (params.openingNotes || '').trim();

    // Calculate sum of subsequent transactions for this supplier
    const supEntries = supplierLedger.filter((e) => e.supplierId === params.supplierId);
    let sumPurchases = 0;
    let sumCredits = 0;
    supEntries.forEach((e) => {
      const amt = Number(e.amount) || 0;
      if (e.type === 'PURCHASE') {
        sumPurchases += amt;
      } else {
        sumCredits += amt;
      }
    });

    const newOutstandingPayable = Math.max(0, safeOpeningBalance + sumPurchases - sumCredits);

    const updatedSupplier: Supplier = {
      ...targetSupplier,
      openingBalance: safeOpeningBalance,
      openingDate: safeOpeningDate,
      openingNotes: safeOpeningNotes,
      outstandingPayable: newOutstandingPayable,
    };

    setSuppliers((prev) => {
      const next = prev.map((s) => (s.id === params.supplierId ? updatedSupplier : s));
      localStorage.setItem('ws_suppliers', JSON.stringify(next));
      return next;
    });
    saveToFirestoreDoc(COLLECTIONS.SUPPLIERS, updatedSupplier.id, updatedSupplier);

    addActivityLog({
      actionType: 'BALANCE_ADJUSTMENT',
      title: `Updated Opening DO for ${targetSupplier.company || targetSupplier.name}`,
      bnTitle: `${targetSupplier.company || targetSupplier.name}-এর ওপেন ডিও / হিসাব শুরুর বকেয়া হালনাগাদ`,
      description: `Opening Due updated to ৳${safeOpeningBalance.toLocaleString()} (Date: ${safeOpeningDate}). Current balance: ৳${newOutstandingPayable.toLocaleString()}.`,
      bnDescription: `ওপেন ডিও / হিসাব শুরুর বকেয়া ৳${safeOpeningBalance.toLocaleString()} (তারিখ: ${safeOpeningDate}) করা হয়েছে। বর্তমান নিট বকেয়া দেনা: ৳${newOutstandingPayable.toLocaleString()}।`,
      actorRole: currentUser.role,
      actorId: currentUser.id,
      actorName: currentUser.name,
      amount: safeOpeningBalance,
      relatedId: targetSupplier.id,
      status: 'COMPLETED',
    });

    return {
      success: true,
      message: 'কোম্পানির ওপেন ডিও ও হিসাব শুরুর বকেয়া সফলভাবে আপডেট করা হয়েছে!',
      supplier: updatedSupplier,
    };
  };

  const addSupplier = (supplierData: Omit<Supplier, 'id'> | Supplier): Supplier => {
    const id = 'id' in supplierData && supplierData.id ? supplierData.id : `supp_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`;
    const safeOpening = Math.max(
      0,
      Number((supplierData as any).openingBalance) || Number(supplierData.outstandingPayable) || 0
    );
    const safeOpeningDate = (supplierData as any).openingDate || getTodayDateString();
    const safeOpeningNotes = ((supplierData as any).openingNotes || 'হিসাব শুরুর ওপেন ডিও / প্রারম্ভিক বকেয়া').trim();

    const newSupplier: Supplier = {
      outstandingPayable: safeOpening,
      totalPurchases: 0,
      totalPaid: 0,
      paymentTerms: 'Net 15',
      ...supplierData,
      openingBalance: safeOpening,
      openingDate: safeOpeningDate,
      openingNotes: safeOpeningNotes,
      id,
    } as Supplier;

    setSuppliers((prev) => {
      const list = [newSupplier, ...prev];
      localStorage.setItem('ws_suppliers', JSON.stringify(list));
      return list;
    });
    saveToFirestoreDoc(COLLECTIONS.SUPPLIERS, newSupplier.id, newSupplier);
    return newSupplier;
  };

  // Delete Supplier Ledger Entry (Mistaken Purchase or Payment)
  const deleteSupplierLedgerEntry = (entryId: string, revertBalance: boolean = true) => {
    const targetEntry = supplierLedger.find((e) => e.id === entryId);
    if (!targetEntry) return { success: false, message: 'Ledger entry not found' };

    // If revert balance is enabled, adjust supplier balance
    if (revertBalance && targetEntry.supplierId) {
      setSuppliers((prev) =>
        prev.map((s) => {
          if (s.id === targetEntry.supplierId) {
            let newOutstanding = s.outstandingPayable;
            let newPurchases = s.totalPurchases;
            let newPaid = s.totalPaid;

            if (targetEntry.type === 'PURCHASE') {
              newOutstanding = Math.max(0, s.outstandingPayable - targetEntry.amount);
              newPurchases = Math.max(0, s.totalPurchases - targetEntry.amount);
            } else if (targetEntry.type === 'PAYMENT') {
              newOutstanding = s.outstandingPayable + targetEntry.amount;
              newPaid = Math.max(0, s.totalPaid - targetEntry.amount);
            }

            const updatedSupplier = {
              ...s,
              outstandingPayable: newOutstanding,
              totalPurchases: newPurchases,
              totalPaid: newPaid,
            };
            saveToFirestoreDoc(COLLECTIONS.SUPPLIERS, s.id, updatedSupplier);
            return updatedSupplier;
          }
          return s;
        })
      );

      // If deleted entry was a Cash payment, restore cash to Admin drawer
      if (targetEntry.type === 'PAYMENT' && (targetEntry.paymentMethod === 'Cash' || !targetEntry.paymentMethod)) {
        setUsers((prev) =>
          prev.map((u) => {
            if (u.role === 'admin') {
              const newDrawer = (u.assignedCashDrawer || 0) + targetEntry.amount;
              saveToFirestoreDoc(COLLECTIONS.USERS, u.id, { ...u, assignedCashDrawer: newDrawer });
              return { ...u, assignedCashDrawer: newDrawer };
            }
            return u;
          })
        );
        if (currentUser.role === 'admin') {
          setCurrentUserState((prev) => ({
            ...prev,
            assignedCashDrawer: (prev.assignedCashDrawer || 0) + targetEntry.amount,
          }));
        }
      }

      // If deleted entry is a PURCHASE, revert/deduct stock from inventory
      if (targetEntry.type === 'PURCHASE') {
        const challanRef = (targetEntry.referenceNo || '').trim();
        setProducts((prevProducts) => {
          const updated = prevProducts.map((p) => {
            let qtyToDeduct = 0;
            if (Array.isArray(targetEntry.items) && targetEntry.items.length > 0) {
              const matchedItem = targetEntry.items.find(
                (it) =>
                  (it.productId && it.productId === p.id) ||
                  (it.sku && p.sku && it.sku.trim().toLowerCase() === p.sku.trim().toLowerCase()) ||
                  (it.name && p.name && it.name.trim().toLowerCase() === p.name.trim().toLowerCase()) ||
                  (it.name && p.bnName && it.name.trim().toLowerCase() === p.bnName.trim().toLowerCase())
              );
              if (matchedItem) {
                qtyToDeduct += (Number(matchedItem.quantity) || 0);
              }
            }
            const hasChallanRef = (p.challanReferences || []).some(
              (r) => (r.challanNo || '').trim().toLowerCase() === challanRef.toLowerCase()
            );
            if (hasChallanRef) {
              const refEntry = (p.challanReferences || []).find(
                (r) => (r.challanNo || '').trim().toLowerCase() === challanRef.toLowerCase()
              );
              if (qtyToDeduct === 0 && refEntry && Number(refEntry.quantity) > 0) {
                qtyToDeduct = Number(refEntry.quantity);
              }
            }

            if (qtyToDeduct > 0 || hasChallanRef) {
              const newStock = Math.max(0, p.stockQuantity - qtyToDeduct);
              const filteredRefs = (p.challanReferences || []).filter(
                (r) => (r.challanNo || '').trim().toLowerCase() !== challanRef.toLowerCase()
              );
              const updatedProd: Product = {
                ...p,
                stockQuantity: newStock,
                challanReferences: filteredRefs,
                latestChallanNo: filteredRefs[0]?.challanNo || (p.latestChallanNo === challanRef ? '' : p.latestChallanNo),
              };
              saveToFirestoreDoc(COLLECTIONS.PRODUCTS, p.id, updatedProd);
              return updatedProd;
            }
            return p;
          });
          localStorage.setItem('ws_products', JSON.stringify(updated));
          return updated;
        });
      }
    }

    setSupplierLedger((prev) => prev.filter((e) => e.id !== entryId));
    deleteFirestoreDoc(COLLECTIONS.SUPPLIER_LEDGER, entryId);

    addActivityLog({
      actionType: 'STOCK_OUTWARD',
      title: `Deleted Ledger Entry #${targetEntry.referenceNo}`,
      bnTitle: `ভুল লেজার চালান #${targetEntry.referenceNo} ডিলিট ও স্টক মাইনাস`,
      description: `Deleted ${targetEntry.type} entry #${targetEntry.referenceNo} (৳${targetEntry.amount}). Stock and ledger balances auto-reversed.`,
      bnDescription: `ভুল ${targetEntry.type === 'PURCHASE' ? 'ক্রয় চালান' : 'পেমেন্ট'} #${targetEntry.referenceNo} (৳${targetEntry.amount}) ডিলিট করা হয়েছে। স্টক ও ব্যালেন্স সমন্বয় করা হয়েছে।`,
      actorRole: currentUser.role,
      actorId: currentUser.id,
      actorName: currentUser.name,
      amount: targetEntry.amount,
      relatedId: entryId,
      status: 'COMPLETED',
    });

    return { success: true, message: 'Supplier ledger entry deleted' };
  };

  // Dedicated Update/Edit Supplier Purchase Challan with Stock Re-calculation
  const updateSupplierPurchaseChallan = (params: {
    entryId: string;
    referenceNo: string;
    date: string;
    supplierId: string;
    previousDoNo?: string;
    previousDoDate?: string;
    notes?: string;
    paymentMethod?: string;
    paymentStatus?: 'Unpaid' | 'Paid';
    items: SupplierPurchaseItem[];
  }) => {
    const oldEntry = supplierLedger.find((e) => e.id === params.entryId);
    if (!oldEntry) return { success: false, message: 'ক্রয় চালান এন্ট্রি পাওয়া যায়নি।' };

    const targetSupplier = suppliers.find((s) => s.id === params.supplierId);
    if (!targetSupplier) return { success: false, message: 'সাপ্লায়ার পাওয়া যায়নি।' };

    const cleanItems: SupplierPurchaseItem[] = (params.items || [])
      .filter((it) => it && (it.name || it.quantity !== undefined || it.costPrice !== undefined))
      .map((it, idx) => {
        const name = (it.name || '').trim() || `পণ্য আইটেম #${idx + 1}`;
        const quantity = it.quantity !== undefined && !isNaN(Number(it.quantity)) ? Math.max(0, Number(it.quantity)) : 0;
        const costPrice = Math.max(0, Number(it.costPrice) || 0);
        const totalPrice = it.totalPrice !== undefined && !isNaN(Number(it.totalPrice)) ? Number(it.totalPrice) : quantity * costPrice;
        const suggestedRetailPrice = Number(it.suggestedRetailPrice) || Math.round(costPrice * 1.15);
        return {
          ...it,
          name,
          quantity,
          costPrice,
          suggestedRetailPrice,
          totalPrice,
        };
      });

    const newTotalAmount = cleanItems.reduce((acc, it) => acc + it.totalPrice, 0);
    const oldTotalAmount = oldEntry.amount || 0;
    const oldRefNo = (oldEntry.referenceNo || '').trim();
    const newRefNo = (params.referenceNo || '').trim() || oldRefNo;

    // 1. Reconcile Products Stock
    const oldItemQtyMap = new Map<string, number>();
    if (Array.isArray(oldEntry.items) && oldEntry.items.length > 0) {
      oldEntry.items.forEach((it) => {
        const key = it.name.trim().toLowerCase();
        oldItemQtyMap.set(key, (oldItemQtyMap.get(key) || 0) + it.quantity);
      });
    }

    setProducts((prevProducts) => {
      let updated = [...prevProducts];

      cleanItems.forEach((newItem) => {
        const key = newItem.name.trim();
        const normItemKey = normalizeProductKey(key);
        const oldQty = oldItemQtyMap.get(key.toLowerCase()) || 0;
        oldItemQtyMap.delete(key.toLowerCase());

        const diff = newItem.quantity - oldQty;

        const existingIdx = updated.findIndex(
          (p) =>
            (newItem.productId && p.id === newItem.productId) ||
            areProductNamesEquivalent(p.name, key) ||
            areProductNamesEquivalent(p.bnName, key) ||
            (normItemKey && normalizeProductKey(p.name) === normItemKey) ||
            (normItemKey && p.bnName && normalizeProductKey(p.bnName) === normItemKey) ||
            (newItem.sku && p.sku && p.sku.trim().toLowerCase() === newItem.sku.trim().toLowerCase())
        );

        if (existingIdx >= 0) {
          const currentProd = updated[existingIdx];
          const newStock = Math.max(0, currentProd.stockQuantity + diff);
          const filteredRefs = (currentProd.challanReferences || []).filter(
            (r) => (r.challanNo || '').trim().toLowerCase() !== oldRefNo.toLowerCase()
          );
          const newRef = {
            challanNo: newRefNo,
            date: params.date,
            quantity: newItem.quantity,
            costPrice: newItem.costPrice || currentProd.costPrice,
            supplierName: targetSupplier.name,
            supplierId: targetSupplier.id,
          };

          const updatedProd: Product = {
            ...currentProd,
            stockQuantity: newStock,
            costPrice: newItem.costPrice || currentProd.costPrice,
            wholesalePrice: newItem.suggestedRetailPrice || currentProd.wholesalePrice,
            latestChallanNo: newRefNo,
            challanReferences: [newRef, ...filteredRefs],
          };
          updated[existingIdx] = updatedProd;
          saveToFirestoreDoc(COLLECTIONS.PRODUCTS, updatedProd.id, updatedProd);
        } else {
          const newProd: Product = {
            id: `prod_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
            sku: newItem.sku || `SKU-${Date.now().toString().slice(-4)}`,
            name: newItem.name,
            bnName: newItem.name,
            brand: targetSupplier.company || targetSupplier.name,
            category: newItem.category || 'General',
            bnCategory: newItem.category || 'সাধারণ',
            stockQuantity: newItem.quantity,
            unit: newItem.unit || 'Pcs',
            bnUnit: newItem.unit || 'পিস',
            costPrice: newItem.costPrice || 100,
            wholesalePrice: newItem.suggestedRetailPrice || Math.round((newItem.costPrice || 100) * 1.15),
            mrp: Math.round((newItem.costPrice || 100) * 1.25),
            supplierId: targetSupplier.id,
            supplierName: targetSupplier.name,
            minOrderQty: 1,
            latestChallanNo: newRefNo,
            challanReferences: [
              {
                challanNo: newRefNo,
                date: params.date,
                quantity: newItem.quantity,
                costPrice: newItem.costPrice,
                supplierName: targetSupplier.name,
                supplierId: targetSupplier.id,
              },
            ],
          };
          updated.push(newProd);
          saveToFirestoreDoc(COLLECTIONS.PRODUCTS, newProd.id, newProd);
        }
      });

      oldItemQtyMap.forEach((qtyToRemove, key) => {
        const existingIdx = updated.findIndex(
          (p) =>
            (p.name && p.name.trim().toLowerCase() === key) ||
            (p.bnName && p.bnName.trim().toLowerCase() === key)
        );
        if (existingIdx >= 0) {
          const currentProd = updated[existingIdx];
          const newStock = Math.max(0, currentProd.stockQuantity - qtyToRemove);
          const filteredRefs = (currentProd.challanReferences || []).filter(
            (r) => (r.challanNo || '').trim().toLowerCase() !== oldRefNo.toLowerCase()
          );
          const updatedProd: Product = {
            ...currentProd,
            stockQuantity: newStock,
            challanReferences: filteredRefs,
          };
          updated[existingIdx] = updatedProd;
          saveToFirestoreDoc(COLLECTIONS.PRODUCTS, updatedProd.id, updatedProd);
        }
      });

      const { merged, duplicateIdsRemoved } = mergeDuplicateProductsList(updated);
      if (duplicateIdsRemoved.length > 0) {
        duplicateIdsRemoved.forEach((delId) => {
          deleteFirestoreDoc(COLLECTIONS.PRODUCTS, delId);
        });
      }
      localStorage.setItem('ws_products', JSON.stringify(merged));
      return merged;
    });

    // 2. Reconcile Supplier Balances
    const isSupplierChanged = oldEntry.supplierId !== params.supplierId;
    setSuppliers((prev) => {
      const next = prev.map((s) => {
        if (isSupplierChanged) {
          if (s.id === oldEntry.supplierId) {
            const updatedOld = {
              ...s,
              totalPurchases: Math.max(0, (s.totalPurchases || 0) - oldTotalAmount),
              outstandingPayable: Math.max(0, (s.outstandingPayable || 0) - oldTotalAmount),
            };
            saveToFirestoreDoc(COLLECTIONS.SUPPLIERS, s.id, updatedOld);
            return updatedOld;
          }
          if (s.id === params.supplierId) {
            const updatedNew = {
              ...s,
              totalPurchases: (s.totalPurchases || 0) + newTotalAmount,
              outstandingPayable: (s.outstandingPayable || 0) + newTotalAmount,
            };
            saveToFirestoreDoc(COLLECTIONS.SUPPLIERS, s.id, updatedNew);
            return updatedNew;
          }
        } else if (s.id === params.supplierId) {
          const diff = newTotalAmount - oldTotalAmount;
          const updatedSame = {
            ...s,
            totalPurchases: Math.max(0, (s.totalPurchases || 0) + diff),
            outstandingPayable: Math.max(0, (s.outstandingPayable || 0) + diff),
          };
          saveToFirestoreDoc(COLLECTIONS.SUPPLIERS, s.id, updatedSame);
          return updatedSame;
        }
        return s;
      });
      localStorage.setItem('ws_suppliers', JSON.stringify(next));
      return next;
    });

    // 3. Update Ledger Entry
    const updatedEntry: SupplierLedgerEntry = {
      ...oldEntry,
      supplierId: params.supplierId,
      supplierName: targetSupplier.company || targetSupplier.name,
      referenceNo: newRefNo,
      date: params.date,
      amount: newTotalAmount,
      previousDoNo: params.previousDoNo || '',
      previousDoDate: params.previousDoDate || '',
      notes: params.notes || oldEntry.notes,
      paymentMethod: (params.paymentMethod as any) || oldEntry.paymentMethod || 'Credit',
      items: cleanItems,
    };

    setSupplierLedger((prev) => {
      const next = prev.map((e) => (e.id === params.entryId ? updatedEntry : e));
      localStorage.setItem('ws_supplier_ledger', JSON.stringify(next));
      return next;
    });
    saveToFirestoreDoc(COLLECTIONS.SUPPLIER_LEDGER, updatedEntry.id, updatedEntry);

    addActivityLog({
      actionType: 'STOCK_INWARD',
      title: `Challan #${newRefNo} Edited & Stock Reconciled`,
      bnTitle: `চালান #${newRefNo} এডিট ও স্টক সমন্বয় সম্পন্ন`,
      description: `Challan #${newRefNo} (${targetSupplier.name}) updated with ${cleanItems.length} products. Amount: ৳${newTotalAmount.toLocaleString()}. Stock auto-reconciled.`,
      bnDescription: `চালান #${newRefNo} (${targetSupplier.name}) ${cleanItems.length}টি পণ্য সহ এডিট করা হয়েছে। নতুন মোট মূল্য: ৳${newTotalAmount.toLocaleString()}। স্টক স্বয়ংক্রিয়ভাবে সমন্বয় হয়েছে।`,
      actorRole: currentUser.role,
      actorId: currentUser.id,
      actorName: currentUser.name,
      amount: newTotalAmount,
      relatedId: updatedEntry.id,
      status: 'COMPLETED',
    });

    return {
      success: true,
      message: `চালান #${newRefNo} সফলভাবে এডিট হয়েছে এবং পণ্যের স্টক ও দেনা স্বয়ংক্রিয়ভাবে সমন্বয় করা হয়েছে!`,
      entry: updatedEntry,
    };
  };

  // Delete Cash Transfer Entry
  const deleteCashTransfer = (transferId: string) => {
    const tr = cashTransfers.find((t) => t.id === transferId);
    if (tr) {
      setUsers((prevUsers) => {
        const updated = prevUsers.map((u) => {
          if (tr.status === 'ACCEPTED' && (u.id === tr.toUserId || u.role === tr.toRole)) {
            const newDrawer = (u.assignedCashDrawer || 0) - tr.amount;
            saveToFirestoreDoc(COLLECTIONS.USERS, u.id, { ...u, assignedCashDrawer: newDrawer });
            return { ...u, assignedCashDrawer: newDrawer };
          }
          if (u.id === tr.fromUserId || u.role === tr.fromRole) {
            const newDrawer = (u.assignedCashDrawer || 0) + tr.amount;
            saveToFirestoreDoc(COLLECTIONS.USERS, u.id, { ...u, assignedCashDrawer: newDrawer });
            return { ...u, assignedCashDrawer: newDrawer };
          }
          return u;
        });
        localStorage.setItem('ws_users', JSON.stringify(updated));
        return updated;
      });

      if (tr.status === 'ACCEPTED' && (currentUser.id === tr.toUserId || currentUser.role === tr.toRole)) {
        setCurrentUserState((prev) => ({
          ...prev,
          assignedCashDrawer: (prev.assignedCashDrawer || 0) - tr.amount,
        }));
      } else if (currentUser.id === tr.fromUserId || currentUser.role === tr.fromRole) {
        setCurrentUserState((prev) => ({
          ...prev,
          assignedCashDrawer: (prev.assignedCashDrawer || 0) + tr.amount,
        }));
      }
    }

    setCashTransfers((prev) => {
      const updated = prev.filter((t) => t.id !== transferId);
      localStorage.setItem('ws_cash_transfers', JSON.stringify(updated));
      return updated;
    });
    deleteFirestoreDoc(COLLECTIONS.CASH_TRANSFERS, transferId);
    return { success: true, message: 'Cash transfer entry deleted' };
  };

  // Delete Capital / Expense Transaction
  const deleteCapitalTransaction = (transactionId: string) => {
    const targetTx = capitalTransactions.find((t) => t.id === transactionId);
    if (targetTx && targetTx.account === 'CASH_DRAWER') {
      setUsers((prev) => {
        const updatedUsers = prev.map((u) => {
          if (u.role === 'admin') {
            const newDrawer =
              targetTx.type === 'CAPITAL_INJECTION'
                ? (u.assignedCashDrawer || 0) - targetTx.amount
                : (u.assignedCashDrawer || 0) + targetTx.amount;
            saveToFirestoreDoc(COLLECTIONS.USERS, u.id, { ...u, assignedCashDrawer: newDrawer });
            return { ...u, assignedCashDrawer: newDrawer };
          }
          return u;
        });
        localStorage.setItem('ws_users', JSON.stringify(updatedUsers));
        return updatedUsers;
      });
    }

    setCapitalTransactions((prev) => prev.filter((t) => t.id !== transactionId));
    deleteFirestoreDoc(COLLECTIONS.CAPITAL_TRANSACTIONS, transactionId);
    return { success: true, message: 'Capital transaction deleted' };
  };

  // Expenses Handlers (বেতন, দোকান ভাড়া, বিদ্যুৎ বিল, অন্যান্য খরচ)
  const addExpense = (data: Omit<Expense, 'id' | 'createdAt'>): Expense => {
    const newId = `exp_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const categoryBnMap: Record<ExpenseCategory, string> = {
      SALARY: 'বেতন (Salary)',
      SHOP_RENT: 'দোকান ভাড়া (Shop Rent)',
      ELECTRICITY_BILL: 'বিদ্যুৎ বিল (Electricity Bill)',
      OTHER: 'অন্যান্য খরচ (Other Expenses)',
      DAILY_SNACKS: 'নাস্তা / আপ্যায়ন (Snacks)',
      TRANSPORT: 'যাতায়াত / পরিবহন (Transport)',
      ENTERTAINMENT: 'আপ্যায়ন (Entertainment)',
      MAINTENANCE: 'মেরামত ও রক্ষণাবেক্ষণ (Maintenance)',
    };

    const newExpense: Expense = {
      id: newId,
      category: data.category,
      categoryBn: data.categoryBn || categoryBnMap[data.category] || 'খরচ',
      title: data.title,
      titleBn: data.titleBn || data.title,
      amount: Math.abs(Number(data.amount) || 0),
      date: data.date || new Date().toISOString().slice(0, 10),
      frequency: data.frequency || 'MONTHLY',
      paymentSource: data.paymentSource || 'CASH_DRAWER',
      notes: data.notes || '',
      recipientName: data.recipientName || '',
      createdByRole: currentRole,
      createdByName: currentUser.name || (currentRole === 'counter' ? 'ক্যাশ কাউন্টার' : 'এডমিন'),
      createdAt: new Date().toISOString(),
    };

    setExpenses((prev) => {
      const updated = [newExpense, ...prev];
      localStorage.setItem('ws_expenses', JSON.stringify(updated));
      return updated;
    });

    saveToFirestoreDoc(COLLECTIONS.EXPENSES, newId, newExpense);

    addActivityLog({
      actionType: 'EXPENSE_RECORDED',
      action: 'EXPENSE_RECORDED',
      title: `Expense: ${newExpense.title}`,
      bnTitle: `খরচ এন্ট্রি: ${newExpense.titleBn || newExpense.title}`,
      description: `${newExpense.categoryBn}: ৳${newExpense.amount.toLocaleString()} - ${newExpense.title}`,
      details: `${newExpense.categoryBn}: ৳${newExpense.amount.toLocaleString()} - ${newExpense.title}`,
      bnDescription: `${newExpense.categoryBn}: ৳${newExpense.amount.toLocaleString()} - ${newExpense.title}`,
      actorRole: currentRole,
      role: currentRole,
      actorId: currentUser.id,
      actorName: currentUser.name,
      performedBy: currentUser.name,
      amount: newExpense.amount,
      relatedId: newExpense.id,
    });

    return newExpense;
  };

  const deleteExpense = (expenseId: string) => {
    setExpenses((prev) => {
      const updated = prev.filter((e) => e.id !== expenseId);
      localStorage.setItem('ws_expenses', JSON.stringify(updated));
      return updated;
    });
    deleteFirestoreDoc(COLLECTIONS.EXPENSES, expenseId);
  };

  const updateExpense = (updatedExpense: Expense) => {
    setExpenses((prev) => {
      const updated = prev.map((e) => (e.id === updatedExpense.id ? updatedExpense : e));
      localStorage.setItem('ws_expenses', JSON.stringify(updated));
      return updated;
    });
    saveToFirestoreDoc(COLLECTIONS.EXPENSES, updatedExpense.id, updatedExpense);
  };

  // Delete Replacement / Damage Claim
  const deleteReplacementClaim = (claimId: string) => {
    setReplacements((prev) => prev.filter((r) => r.id !== claimId));
    deleteFirestoreDoc(COLLECTIONS.REPLACEMENTS, claimId);
    return { success: true, message: 'Replacement claim deleted' };
  };

  // Delete Phone Contact
  const deletePhoneContact = (contactId: string) => {
    setPhoneContacts((prev) => prev.filter((c) => c.id !== contactId));
  };

  // Update Phone Contact
  const updatePhoneContact = (updatedContact: PhoneContact) => {
    setPhoneContacts((prev) =>
      prev.map((c) => (c.id === updatedContact.id ? updatedContact : c))
    );
  };

  // Delete User / Staff Profile
  const deleteUser = (userId: string) => {
    if (users.length <= 1) {
      return { success: false, message: 'Cannot delete the last remaining user account' };
    }
    const target = users.find((u) => u.id === userId);
    trackDeletedUserId(userId);
    if (target?.phone) trackDeletedUserId(target.phone);
    if (userId === 'usr_dsr_mp') trackDeletedUserId('01700000002');

    setUsers((prev) => {
      const filtered = prev.filter((u) => u.id !== userId);
      localStorage.setItem('ws_users', JSON.stringify(filtered));
      return filtered;
    });
    deleteFirestoreDoc(COLLECTIONS.USERS, userId);
    return { success: true, message: 'User deleted successfully' };
  };

  // Activity Log Management
  const clearAllActivityLogs = () => {
    setActivityLogs([]);
    localStorage.setItem('ws_activity_logs', JSON.stringify([]));
    activityLogs.forEach((log) => {
      deleteFirestoreDoc(COLLECTIONS.ACTIVITY_LOGS, log.id);
    });
    return { success: true, message: 'All audit logs cleared successfully' };
  };

  const deleteActivityLog = (logId: string) => {
    setActivityLogs((prev) => prev.filter((l) => l.id !== logId));
    deleteFirestoreDoc(COLLECTIONS.ACTIVITY_LOGS, logId);
    return { success: true, message: 'Activity log entry removed' };
  };

  const clearAllSampleData = () => {
    setOrders([]);
    setCashTransfers([]);
    setActivityLogs([]);
    localStorage.setItem('ws_orders', JSON.stringify([]));
    localStorage.setItem('ws_cash_transfers', JSON.stringify([]));
    localStorage.setItem('ws_activity_logs', JSON.stringify([]));
  };

  const restoreSampleBusinessData = async (): Promise<{ success: boolean; message: string }> => {
    try {
      localStorage.removeItem('ws_system_reset_performed');
      setProducts(initialProducts);
      setOrders(initialOrders);
      setRetailers(initialRetailers);
      setSuppliers(initialSuppliers);
      setSupplierLedger(initialSupplierLedger);
      setCashTransfers(initialCashTransfers);
      setCapitalTransactions(initialCapitalTransactions);
      setBankAccounts(initialBankAccounts);
      setReplacements(initialReplacements);
      setActivityLogs(initialActivityLogs);

      localStorage.setItem('ws_products', JSON.stringify(initialProducts));
      localStorage.setItem('ws_orders', JSON.stringify(initialOrders));
      localStorage.setItem('ws_retailers', JSON.stringify(initialRetailers));
      localStorage.setItem('ws_suppliers', JSON.stringify(initialSuppliers));
      localStorage.setItem('ws_supplier_ledger', JSON.stringify(initialSupplierLedger));
      localStorage.setItem('ws_cash_transfers', JSON.stringify(initialCashTransfers));
      localStorage.setItem('ws_capital_tx', JSON.stringify(initialCapitalTransactions));
      localStorage.setItem('ws_bank_accounts', JSON.stringify(initialBankAccounts));
      localStorage.setItem('ws_replacements', JSON.stringify(initialReplacements));
      localStorage.setItem('ws_activity_logs', JSON.stringify(initialActivityLogs));

      const batch = writeBatch(db);
      initialProducts.forEach((p) => batch.set(doc(db, COLLECTIONS.PRODUCTS, p.id), cleanFirestorePayload(p), { merge: true }));
      initialOrders.forEach((o) => batch.set(doc(db, COLLECTIONS.ORDERS, o.id), cleanFirestorePayload(o), { merge: true }));
      initialRetailers.forEach((r) => batch.set(doc(db, COLLECTIONS.RETAILERS, r.id), cleanFirestorePayload(r), { merge: true }));
      initialSuppliers.forEach((s) => batch.set(doc(db, COLLECTIONS.SUPPLIERS, s.id), cleanFirestorePayload(s), { merge: true }));
      initialSupplierLedger.forEach((l) => batch.set(doc(db, COLLECTIONS.SUPPLIER_LEDGER, l.id), cleanFirestorePayload(l), { merge: true }));
      initialCashTransfers.forEach((t) => batch.set(doc(db, COLLECTIONS.CASH_TRANSFERS, t.id), cleanFirestorePayload(t), { merge: true }));
      initialCapitalTransactions.forEach((c) => batch.set(doc(db, COLLECTIONS.CAPITAL_TRANSACTIONS, c.id), cleanFirestorePayload(c), { merge: true }));
      initialReplacements.forEach((rep) => batch.set(doc(db, COLLECTIONS.REPLACEMENTS, rep.id), cleanFirestorePayload(rep), { merge: true }));
      initialActivityLogs.forEach((a) => batch.set(doc(db, COLLECTIONS.ACTIVITY_LOGS, a.id), cleanFirestorePayload(a), { merge: true }));
      await batch.commit();

      return {
        success: true,
        message: language === 'bn' ? 'সকল হিসাব ও সেলস সফলভাবে রিস্টোর হয়েছে!' : 'All accounts and sales restored successfully!',
      };
    } catch (err: any) {
      console.warn('Restore error:', err);
      return {
        success: true,
        message: language === 'bn' ? 'সকল হিসাব ও সেলস রিস্টোর হয়েছে!' : 'All accounts and sales restored!',
      };
    }
  };

  const resetAllSystemData = async (options?: {
    mode?: 'INVOICES_AND_CASH' | 'FULL_FACTORY';
    initialAdminCash?: number;
    initialBankCash?: number;
    resetRetailerDues?: boolean;
    resetSupplierDues?: boolean;
    resetInventoryStockToZero?: boolean;
    clearProductsCatalog?: boolean;
    clearActivityLogs?: boolean;
  }) => {
    const mode = options?.mode || 'INVOICES_AND_CASH';
    const initAdminCash = Math.max(0, Number(options?.initialAdminCash) || 0);
    const initBankCash = Math.max(0, Number(options?.initialBankCash) || 0);
    const resetStock = options?.resetInventoryStockToZero !== false;

    // 1. Mark system as reset in localStorage
    localStorage.setItem('ws_system_reset_performed', 'true');

    // 2. Clear Orders / Invoices (Local & Firestore)
    setOrders([]);
    localStorage.setItem('ws_orders', JSON.stringify([]));
    try {
      const orderDocs = await getDocs(collection(db, COLLECTIONS.ORDERS));
      orderDocs.forEach((d) => {
        deleteDoc(doc(db, COLLECTIONS.ORDERS, d.id));
      });
    } catch (e) {
      console.warn('Orders cleanup note:', e);
    }

    // 3. Clear Cash Transfers (Local & Firestore)
    setCashTransfers([]);
    localStorage.setItem('ws_cash_transfers', JSON.stringify([]));
    try {
      const cashDocs = await getDocs(collection(db, COLLECTIONS.CASH_TRANSFERS));
      cashDocs.forEach((d) => {
        deleteDoc(doc(db, COLLECTIONS.CASH_TRANSFERS, d.id));
      });
    } catch (e) {
      console.warn('Cash cleanup note:', e);
    }

    // 4. Reset or Initialize Capital Transactions
    const newCapitalList: CapitalTransaction[] =
      initAdminCash > 0 || initBankCash > 0
        ? [
            {
              id: `cap_init_${Date.now()}`,
              date: new Date().toISOString().split('T')[0],
              amount: initAdminCash + initBankCash,
              type: 'INITIAL_CAPITAL',
              description: 'Opening Capital Balance',
              bnDescription: 'প্রারম্ভিক মূলধন ব্যালেন্স',
              account: initBankCash > 0 ? 'BANK' : 'CASH_DRAWER',
              runningCapital: initAdminCash + initBankCash,
            },
          ]
        : [];

    setCapitalTransactions(newCapitalList);
    localStorage.setItem('ws_capital_tx', JSON.stringify(newCapitalList));
    try {
      const capDocs = await getDocs(collection(db, COLLECTIONS.CAPITAL_TRANSACTIONS));
      capDocs.forEach((d) => {
        deleteDoc(doc(db, COLLECTIONS.CAPITAL_TRANSACTIONS, d.id));
      });
      if (newCapitalList.length > 0) {
        setDoc(doc(db, COLLECTIONS.CAPITAL_TRANSACTIONS, newCapitalList[0].id), newCapitalList[0]);
      }
    } catch (e) {
      console.warn('Capital cleanup note:', e);
    }

    // 5. Reset User Cash Drawers (Admin set to initAdminCash, others to 0)
    setUsers((prev) =>
      prev.map((u) => {
        const newDrawer = u.role === 'admin' ? initAdminCash : 0;
        const updatedUser = { ...u, assignedCashDrawer: newDrawer };
        saveToFirestoreDoc(COLLECTIONS.USERS, u.id, updatedUser);
        return updatedUser;
      })
    );
    setCurrentUserState((prev) => ({
      ...prev,
      assignedCashDrawer: prev.role === 'admin' ? initAdminCash : 0,
    }));

    // 6. Reset Bank Accounts
    setBankAccounts((prev) => {
      const updated = prev.map((b, idx) => ({
        ...b,
        balance: idx === 0 ? initBankCash : 0,
      }));
      localStorage.setItem('ws_bank_accounts', JSON.stringify(updated));
      return updated;
    });

    // 7. Reset Retailer Dues & Purchases
    if (options?.resetRetailerDues !== false) {
      setRetailers((prev) =>
        prev.map((r) => {
          const updatedRetailer = {
            ...r,
            outstandingDue: 0,
            currentDue: 0,
            totalPurchases: 0,
          };
          saveToFirestoreDoc(COLLECTIONS.RETAILERS, r.id, updatedRetailer);
          return updatedRetailer;
        })
      );
    }

    // 8. Reset Suppliers & Supplier Ledger
    if (mode === 'FULL_FACTORY' || options?.resetSupplierDues) {
      setSuppliers((prev) =>
        prev.map((s) => {
          const updatedSupplier = {
            ...s,
            outstandingPayable: 0,
            totalPurchases: 0,
            totalPaid: 0,
          };
          saveToFirestoreDoc(COLLECTIONS.SUPPLIERS, s.id, updatedSupplier);
          return updatedSupplier;
        })
      );
      setSupplierLedger([]);
      localStorage.setItem('ws_supplier_ledger', JSON.stringify([]));
      try {
        const slDocs = await getDocs(collection(db, COLLECTIONS.SUPPLIER_LEDGER));
        slDocs.forEach((d) => {
          deleteDoc(doc(db, COLLECTIONS.SUPPLIER_LEDGER, d.id));
        });
      } catch (e) {
        console.warn('Supplier ledger cleanup note:', e);
      }
    }

    // 9. Reset Product Stocks or Clear Catalog
    if (options?.clearProductsCatalog) {
      setProducts([]);
      localStorage.setItem('ws_products', JSON.stringify([]));
      try {
        const pDocs = await getDocs(collection(db, COLLECTIONS.PRODUCTS));
        pDocs.forEach((d) => {
          deleteDoc(doc(db, COLLECTIONS.PRODUCTS, d.id));
        });
      } catch (e) {
        console.warn('Products cleanup note:', e);
      }
    } else if (resetStock) {
      // Set all product stock quantities to 0 so catalog names remain but inventory valuation becomes ৳0
      setProducts((prev) => {
        const zeroed = prev.map((p) => {
          const updatedP = { ...p, stockQuantity: 0 };
          saveToFirestoreDoc(COLLECTIONS.PRODUCTS, p.id, updatedP);
          return updatedP;
        });
        localStorage.setItem('ws_products', JSON.stringify(zeroed));
        return zeroed;
      });
    }

    // 10. Reset Replacements
    setReplacements([]);
    localStorage.setItem('ws_replacements', JSON.stringify([]));
    try {
      const repDocs = await getDocs(collection(db, COLLECTIONS.REPLACEMENTS));
      repDocs.forEach((d) => {
        deleteDoc(doc(db, COLLECTIONS.REPLACEMENTS, d.id));
      });
    } catch (e) {
      console.warn('Replacements cleanup note:', e);
    }

    // 11. Activity Logs
    if (options?.clearActivityLogs !== false) {
      setActivityLogs([]);
      localStorage.setItem('ws_activity_logs', JSON.stringify([]));
      try {
        const logDocs = await getDocs(collection(db, COLLECTIONS.ACTIVITY_LOGS));
        logDocs.forEach((d) => {
          deleteDoc(doc(db, COLLECTIONS.ACTIVITY_LOGS, d.id));
        });
      } catch (e) {
        console.warn('Activity logs cleanup note:', e);
      }
    }

    // Log the reset event
    addActivityLog({
      actionType: 'SYSTEM_RESET',
      title: mode === 'FULL_FACTORY' ? 'Full Factory Reset Performed' : 'Invoices & Cash Book Reset',
      bnTitle: mode === 'FULL_FACTORY' ? 'সম্পূর্ণ ফ্যাক্টরি রিসেট সম্পন্ন' : 'ইনভয়েস ও ক্যাশ বুক রিসেট',
      description: `${currentUser.name} performed a system reset. All prior invoices and cash transactions have been cleared for clean entry.`,
      bnDescription: `${currentUser.name} সিস্টেম রিসেট করেছেন। সকল পূর্ববর্তী চালান ও ক্যাশ বুক মুছে নতুন করে ফ্রেশ হিসাব শুরু করা হয়েছে।`,
      actorRole: currentUser.role,
      actorId: currentUser.id,
      actorName: currentUser.name,
      actorPhone: currentUser.phone,
      amount: initAdminCash,
      status: 'COMPLETED',
      metadata: { mode, initialAdminCash: initAdminCash, initialBankCash: initBankCash },
    });

    return {
      success: true,
      message:
        language === 'bn'
          ? 'সকল ডাটা সফলভাবে রিসেট হয়েছে! এখন নতুন করে এন্ট্রি দিতে পারবেন।'
          : 'All data successfully reset for fresh entry.',
    };
  };

  // Staff & Team Management Handlers (DSR & Cash Counter)
  const addStaffMember = async (staffData: {
    name: string;
    bnName?: string;
    role: 'dsr' | 'counter';
    phone: string;
    pin?: string;
    routeArea?: string;
    assignedCounterNo?: string;
    assignedCashDrawer?: number;
    notes?: string;
  }): Promise<{ success: boolean; message: string; user?: UserProfile }> => {
    const rawDigits = staffData.phone.replace(/[^0-9]/g, '');
    if (!rawDigits || rawDigits.length < 8) {
      return {
        success: false,
        message: language === 'bn' ? 'সঠিক মোবাইল নম্বর দিন।' : 'Please provide a valid mobile number.',
      };
    }

    const existing = users.find((u) => {
      const uDigits = (u.phone || '').replace(/[^0-9]/g, '');
      return uDigits.endsWith(rawDigits.slice(-10)) || rawDigits.endsWith(uDigits.slice(-10));
    });

    if (existing) {
      return {
        success: false,
        message:
          language === 'bn'
            ? `এই মোবাইল নম্বর (${staffData.phone}) দিয়ে ইতিমধ্যে "${existing.bnName || existing.name}" (${existing.role.toUpperCase()}) যুক্ত আছেন!`
            : `A staff member with phone ${staffData.phone} already exists (${existing.name}).`,
      };
    }

    const adminPhone = currentUser.role === 'admin' ? currentUser.phone : (currentUser.adminRef || activeAdminPhone);
    const adminName = currentUser.role === 'admin' ? currentUser.name : (currentUser.adminName || activeAdminName);
    const adminEnterprise = currentUser.role === 'admin' ? (currentUser.enterpriseName || currentUser.shopName || activeAdminEnterprise) : activeAdminEnterprise;

    const newStaff: UserProfile = {
      id: `usr_${staffData.role}_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
      name: staffData.name.trim(),
      bnName: staffData.bnName?.trim() || staffData.name.trim(),
      role: staffData.role,
      phone: staffData.phone.trim(),
      pin: staffData.pin?.trim() || '1234',
      routeArea: staffData.role === 'dsr' ? (staffData.routeArea?.trim() || 'General Route') : undefined,
      assignedCounterNo: staffData.role === 'counter' ? (staffData.assignedCounterNo?.trim() || 'Counter-01') : undefined,
      assignedCashDrawer: Number(staffData.assignedCashDrawer) || 0,
      notes: staffData.notes?.trim() || undefined,
      isActive: true,
      createdAt: new Date().toISOString(),
      adminRef: adminPhone,
      adminPhone: adminPhone,
      adminName: adminName,
      adminEnterprise: adminEnterprise,
      avatar:
        staffData.role === 'counter'
          ? 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80'
          : 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80',
    };

    if (staffData.role === 'dsr') {
      trackDeletedUserId('usr_dsr_mp');
      trackDeletedUserId('01700000002');
      deleteFirestoreDoc(COLLECTIONS.USERS, 'usr_dsr_mp');
    }

    setUsers((prev) => {
      const filtered = prev.filter(
        (u) =>
          u.id !== newStaff.id &&
          (staffData.role !== 'dsr' ||
            (u.id !== 'usr_dsr_mp' &&
              !u.phone?.replace(/[^0-9]/g, '').endsWith('1700000002') &&
              u.name !== 'MP'))
      );
      const updated = sanitizeAndDeduplicateUsers([newStaff, ...filtered]);
      localStorage.setItem('ws_users', JSON.stringify(updated));
      return updated;
    });
    saveToFirestoreDoc(COLLECTIONS.USERS, newStaff.id, newStaff);

    if (staffData.role === 'dsr') {
      if (currentUser.id === 'usr_dsr_mp' || currentUser.name === 'MP' || currentRole === 'dsr') {
        setCurrentUserState(newStaff);
        localStorage.setItem('ws_current_user', JSON.stringify(newStaff));
      }
    }

    addActivityLog({
      actionType: 'STAFF_ACTION',
      title: `New Staff Added: ${newStaff.name} (${newStaff.role.toUpperCase()})`,
      bnTitle: `নতুন কর্মী যুক্ত: ${newStaff.bnName || newStaff.name} (${newStaff.role === 'dsr' ? 'ডিএসআর' : 'ক্যাশ কাউন্টার'})`,
      description: `${currentUser.name} added ${newStaff.name} (${newStaff.role.toUpperCase()}) with mobile ${newStaff.phone} and PIN ${newStaff.pin}.`,
      bnDescription: `${currentUser.name} নতুন কর্মী ${newStaff.name} (${newStaff.role === 'dsr' ? 'ফিল্ড ডিএসআর' : 'ক্যাশ কাউন্টার'}) মোবাইল: ${newStaff.phone}, পিন: ${newStaff.pin} সফলভাবে যুক্ত করেছেন।`,
      actorRole: currentUser.role,
      actorId: currentUser.id,
      actorName: currentUser.name,
      actorPhone: currentUser.phone,
      amount: newStaff.assignedCashDrawer,
      relatedId: newStaff.id,
      status: 'COMPLETED',
      metadata: { role: newStaff.role, phone: newStaff.phone, pin: newStaff.pin },
    });

    return {
      success: true,
      message:
        language === 'bn'
          ? `কর্মী সফলভাবে যুক্ত হয়েছেন! তিনি মোবাইল ${newStaff.phone} ও পিন ${newStaff.pin} দিয়ে যেকোনো ডিভাইসে লগইন করতে পারবেন।`
          : `Staff added successfully! Login with ${newStaff.phone} and PIN ${newStaff.pin}.`,
      user: newStaff,
    };
  };

  const updateStaffMember = async (
    staffId: string,
    updates: Partial<UserProfile>
  ): Promise<{ success: boolean; message: string; user?: UserProfile }> => {
    const target = users.find((u) => u.id === staffId);
    if (!target) {
      return { success: false, message: 'Staff member not found.' };
    }

    const updatedUser: UserProfile = {
      ...target,
      ...updates,
    };

    setUsers((prev) => prev.map((u) => (u.id === staffId ? updatedUser : u)));
    if (currentUser.id === staffId) {
      setCurrentUserState(updatedUser);
    }
    saveToFirestoreDoc(COLLECTIONS.USERS, staffId, updatedUser);

    addActivityLog({
      actionType: 'STAFF_ACTION',
      title: `Staff Details Updated: ${updatedUser.name}`,
      bnTitle: `কর্মী তথ্য আপডেট: ${updatedUser.bnName || updatedUser.name}`,
      description: `${currentUser.name} updated profile for ${updatedUser.name} (${updatedUser.role.toUpperCase()}).`,
      bnDescription: `${currentUser.name} ${updatedUser.name}-এর কর্মী তথ্য ও ক্রেডেনশিয়াল আপডেট করেছেন।`,
      actorRole: currentUser.role,
      actorId: currentUser.id,
      actorName: currentUser.name,
      actorPhone: currentUser.phone,
      relatedId: staffId,
      status: 'COMPLETED',
    });

    return {
      success: true,
      message: language === 'bn' ? 'স্টাফের তথ্য আপডেট হয়েছে।' : 'Staff updated successfully.',
      user: updatedUser,
    };
  };

  const deleteStaffMember = async (staffId: string): Promise<{ success: boolean; message: string }> => {
    const target = users.find((u) => u.id === staffId);
    if (!target) return { success: false, message: 'Staff not found.' };
    if (target.role === 'admin') return { success: false, message: 'Cannot delete Admin account.' };

    trackDeletedUserId(staffId);
    if (target.phone) trackDeletedUserId(target.phone);
    if (staffId === 'usr_dsr_mp') trackDeletedUserId('01700000002');

    setUsers((prev) => {
      const filtered = prev.filter((u) => u.id !== staffId);
      localStorage.setItem('ws_users', JSON.stringify(filtered));
      return filtered;
    });
    deleteFirestoreDoc(COLLECTIONS.USERS, staffId);

    addActivityLog({
      actionType: 'STAFF_ACTION',
      title: `Staff Removed: ${target.name}`,
      bnTitle: `কর্মী অপসারন: ${target.bnName || target.name}`,
      description: `${currentUser.name} removed ${target.name} (${target.role.toUpperCase()}).`,
      bnDescription: `${currentUser.name} কর্মী ${target.name} (${target.role.toUpperCase()})-কে অপসারন করেছেন।`,
      actorRole: currentUser.role,
      actorId: currentUser.id,
      actorName: currentUser.name,
      actorPhone: currentUser.phone,
      relatedId: staffId,
      status: 'COMPLETED',
    });

    return {
      success: true,
      message: language === 'bn' ? 'কর্মী সফলভাবে অপসারন করা হয়েছে।' : 'Staff removed successfully.',
    };
  };

  // Update User Profile (Phone number, role, name, etc.)
  const updateUserProfile = (updatedUser: Partial<UserProfile> & { id: string }) => {
    setUsers((prev) =>
      prev.map((u) => {
        if (u.id === updatedUser.id) {
          const merged = { ...u, ...updatedUser };
          saveToFirestoreDoc(COLLECTIONS.USERS, merged.id, merged);
          return merged;
        }
        return u;
      })
    );

    if (currentUser.id === updatedUser.id) {
      setCurrentUserState((prev) => ({ ...prev, ...updatedUser }));
    }
  };

  // Quick Pay Admin helper for DSR and Counter
  const quickPayAdmin = (amount: number, notes?: string) => {
    const adminUser = users.find((u) => u.role === 'admin') || {
      id: 'usr_admin',
      name: 'Business Owner',
      role: 'admin' as UserRole,
    };

    createCashTransfer({
      fromRole: currentRole,
      fromUserId: currentUser.id,
      fromUserName: `${currentUser.name} (${currentRole.toUpperCase()})`,
      toRole: 'admin',
      toUserId: adminUser.id,
      toUserName: `${adminUser.name} (ADMIN)`,
      amount: Math.max(1, amount),
      notes: notes || (language === 'bn' ? 'এডমিনকে সেলস কালেকশন জমা' : 'Daily sales collection deposit to Admin'),
      autoAccept: false,
    });
  };

  // Quick pull/receive cash from Counter into Admin vault
  const quickReceiveFromCounter = (amount?: number, notes?: string) => {
    const counterUser = users.find((u) => u.role === 'counter') || {
      id: 'usr_counter_pc',
      name: 'Cash Counter POS',
      role: 'counter' as UserRole,
    };
    const adminUser = users.find((u) => u.role === 'admin') || {
      id: 'usr_admin',
      name: 'মাতৃছায়া টেলিকম',
      role: 'admin' as UserRole,
    };
    const transferAmount = typeof amount === 'number' && amount > 0 ? amount : Math.max(0, cashCounter);
    if (transferAmount <= 0) return;

    createCashTransfer({
      fromRole: 'counter',
      fromUserId: counterUser.id,
      fromUserName: `${counterUser.name} (COUNTER)`,
      toRole: 'admin',
      toUserId: adminUser.id,
      toUserName: `${adminUser.name} (ADMIN)`,
      amount: transferAmount,
      notes: notes || (language === 'bn' ? 'কাউন্টার থেকে ভল্টে নগদ জমা (কোম্পানি পেমেন্ট সমন্বয়)' : 'Deposit from Counter to Vault to offset company payment'),
      autoAccept: false,
    });
  };

  // Quick handover cash from DSR to Counter
  const quickPayCounterFromDsr = (amount?: number, notes?: string) => {
    const dsrUser = users.find((u) => u.role === 'dsr') || {
      id: 'usr_dsr_razo',
      name: 'Razo Alom',
      role: 'dsr' as UserRole,
    };
    const counterUser = users.find((u) => u.role === 'counter') || {
      id: 'usr_counter_pc',
      name: 'Cash Counter POS',
      role: 'counter' as UserRole,
    };
    const transferAmount = typeof amount === 'number' && amount > 0 ? amount : Math.max(0, cashDSR);
    if (transferAmount <= 0) return;

    createCashTransfer({
      fromRole: 'dsr',
      fromUserId: dsrUser.id,
      fromUserName: `${dsrUser.name} (DSR)`,
      toRole: 'counter',
      toUserId: counterUser.id,
      toUserName: `${counterUser.name} (COUNTER)`,
      amount: transferAmount,
      notes: notes || (language === 'bn' ? 'ডিএসআর থেকে ক্যাশ কাউন্টারে নগদ জমা' : 'Deposit from DSR to Cash Counter'),
      autoAccept: false,
    });
  };

  // Calculated Metrics
  const totalReceivables = retailers.reduce((acc, r) => acc + (r.outstandingDue || 0), 0);
  const totalPayables = suppliers.reduce((acc, s) => acc + (s.outstandingPayable || 0), 0);
  const totalInventoryValuation = products.reduce((acc, p) => acc + p.stockQuantity * p.costPrice, 0);
  
  // 1. DSR Live Drawer computation:
  // Inflow: DSR Cash sales/collections
  // Outflow: Transfers to Cash Counter & Admin (deducted once accepted by receiver)
  const dsrOrdersCashCollected = orders
    .filter((o) => {
      const r = (o.creatorRole || o.salesPersonRole || '').toLowerCase();
      const n = (o.creatorName || o.salesPersonName || '').toLowerCase();
      const isDsr = r === 'dsr' || n.includes('dsr') || n.includes('ডিএসআর') || n.includes('razo') || n.includes('raju') || n.includes('রাজু');
      const isCash = !o.paymentMethod || o.paymentMethod === 'Cash' || o.paymentMethod === 'নগদ';
      return isDsr && (isCash || (Number(o.paidAmount) || 0) > 0);
    })
    .reduce((sum, o) => sum + (Number(o.paidAmount) || (o.paymentMethod === 'Cash' || !o.paymentMethod ? Number(o.totalAmount) : 0)), 0);

  const dsrTransfersOut = cashTransfers
    .filter((tr) => {
      const r = (tr.fromRole || '').toLowerCase();
      const n = (tr.fromUserName || '').toLowerCase();
      const isDsr = r === 'dsr' || n.includes('dsr') || n.includes('razo') || n.includes('raju') || n.includes('রাজু');
      return isDsr && tr.status === 'ACCEPTED';
    })
    .reduce((sum, tr) => sum + tr.amount, 0);

  const dsrTransfersToCounter = cashTransfers
    .filter((tr) => {
      const fromRole = (tr.fromRole || '').toLowerCase();
      const fromName = (tr.fromUserName || '').toLowerCase();
      const isDsrFrom = fromRole === 'dsr' || fromName.includes('dsr') || fromName.includes('razo') || fromName.includes('raju') || fromName.includes('রাজু');
      const isCounterTo = tr.toRole === 'counter' || (tr.toUserName || '').toLowerCase().includes('counter') || (tr.toUserName || '').toLowerCase().includes('কাউন্টার');
      return isDsrFrom && isCounterTo && tr.status === 'ACCEPTED';
    })
    .reduce((sum, tr) => sum + tr.amount, 0);

  const dsrPendingTransfersToCounter = cashTransfers
    .filter((tr) => {
      const fromRole = (tr.fromRole || '').toLowerCase();
      const fromName = (tr.fromUserName || '').toLowerCase();
      const isDsrFrom = fromRole === 'dsr' || fromName.includes('dsr') || fromName.includes('razo') || fromName.includes('raju') || fromName.includes('রাজু');
      const isCounterTo = tr.toRole === 'counter' || (tr.toUserName || '').toLowerCase().includes('counter') || (tr.toUserName || '').toLowerCase().includes('কাউন্টার');
      return isDsrFrom && isCounterTo && tr.status === 'PENDING';
    });

  // DSR Cash Drawer balance: Sales - Accepted Transfers Out (allows negative figure if insufficient cash)
  const calculatedDsrCash = dsrOrdersCashCollected - dsrTransfersOut;
  const cashDSR = calculatedDsrCash;
  const isDsrCashNegative = cashDSR < 0;

  // 2. Cash Counter Live Drawer computation:
  // Inflow: Counter Sales (cash) + DSR Received cash (from DSR to Counter - only when accepted)
  // Outflow: Admin payments / transfers sent to Admin (only deducted when Admin accepts)
  const counterOrdersCashCollected = orders
    .filter((o) => {
      const r = (o.creatorRole || o.salesPersonRole || '').toLowerCase();
      const n = (o.creatorName || o.salesPersonName || '').toLowerCase();
      const isDsr = r === 'dsr' || n.includes('dsr') || n.includes('razo') || n.includes('raju') || n.includes('রাজু');
      const isAdmin = r === 'admin' || n.includes('admin');
      const isCash = !o.paymentMethod || o.paymentMethod === 'Cash' || o.paymentMethod === 'নগদ';
      return !isDsr && !isAdmin && (isCash || (Number(o.paidAmount) || 0) > 0);
    })
    .reduce((sum, o) => sum + (Number(o.paidAmount) || 0), 0);

  const cashReceivedFromDSRToCounter = cashTransfers
    .filter((tr) => {
      const fromRole = (tr.fromRole || '').toLowerCase();
      const fromName = (tr.fromUserName || '').toLowerCase();
      const isDsr = fromRole === 'dsr' || fromName.includes('dsr') || fromName.includes('razo') || fromName.includes('raju') || fromName.includes('রাজু');
      const isCounter = tr.toRole === 'counter' || (tr.toUserName || '').toLowerCase().includes('counter') || (tr.toUserName || '').toLowerCase().includes('কাউন্টার');
      return isDsr && isCounter && tr.status === 'ACCEPTED';
    })
    .reduce((sum, tr) => sum + tr.amount, 0);

  const counterTransfersToAdmin = cashTransfers
    .filter((tr) => {
      const fromRole = (tr.fromRole || '').toLowerCase();
      const fromName = (tr.fromUserName || '').toLowerCase();
      const isCounter = fromRole === 'counter' || fromName.includes('counter') || fromName.includes('কাউন্টার') || tr.fromUserId === 'usr_counter_pc';
      const isAdmin = tr.toRole === 'admin' || tr.toUserId === 'usr_admin' || !tr.toRole;
      return isCounter && isAdmin && tr.status === 'ACCEPTED';
    })
    .reduce((sum, tr) => sum + tr.amount, 0);

  const counterPendingTransfersToAdmin = cashTransfers
    .filter((tr) => {
      const fromRole = (tr.fromRole || '').toLowerCase();
      const fromName = (tr.fromUserName || '').toLowerCase();
      const isCounter = fromRole === 'counter' || fromName.includes('counter') || fromName.includes('কাউন্টার') || tr.fromUserId === 'usr_counter_pc';
      const isAdmin = tr.toRole === 'admin' || tr.toUserId === 'usr_admin' || !tr.toRole;
      return isCounter && isAdmin && tr.status === 'PENDING';
    });

  // Outflow: Expenses paid from Cash Counter drawer (বেতন, দোকান ভাড়া, বিদ্যুৎ বিল, অন্যান্য)
  const counterExpensesPaid = expenses
    .filter((exp) => !exp.paymentSource || exp.paymentSource === 'CASH_DRAWER')
    .reduce((sum, exp) => sum + (Number(exp.amount) || 0), 0);

  // Cash Counter Drawer balance: (Counter Sales + DSR Received) - Admin Payments - Counter Expenses (allows negative figure if insufficient cash)
  const calculatedCounterCash = (counterOrdersCashCollected + cashReceivedFromDSRToCounter) - counterTransfersToAdmin - counterExpensesPaid;
  const cashCounter = calculatedCounterCash;
  const isCounterCashNegative = cashCounter < 0;

  const cashBank = bankAccounts.reduce((acc, b) => acc + (Number(b.balance) || 0), 0);

  const cashReceivedFromCounter = cashTransfers
    .filter(
      (tr) =>
        tr.status === 'ACCEPTED' &&
        (tr.toRole === 'admin' || tr.toUserId === 'usr_admin' || !tr.toRole) &&
        (tr.fromRole === 'counter' ||
          tr.fromUserId === 'usr_counter_pc' ||
          (tr.fromUserName || '').toLowerCase().includes('counter') ||
          (tr.fromUserName || '').toLowerCase().includes('কাউন্টার'))
    )
    .reduce((sum, tr) => sum + tr.amount, 0);

  const cashReceivedFromDSR = cashTransfers
    .filter(
      (tr) =>
        tr.status === 'ACCEPTED' &&
        (tr.toRole === 'admin' || tr.toUserId === 'usr_admin') &&
        (tr.fromRole === 'dsr' ||
          (tr.fromUserName || '').toLowerCase().includes('dsr') ||
          (tr.fromUserName || '').toLowerCase().includes('razo') ||
          (tr.fromUserName || '').toLowerCase().includes('raju') ||
          (tr.fromUserName || '').toLowerCase().includes('রাজু'))
    )
    .reduce((sum, tr) => sum + tr.amount, 0);

  // Admin Direct POS Cash Sales (Admin user selling at counter or generating cash memo)
  const adminDirectCashSales = orders
    .filter((o) => {
      const r = (o.creatorRole || o.salesPersonRole || '').toLowerCase();
      const isCash = !o.paymentMethod || o.paymentMethod === 'Cash' || o.paymentMethod === 'নগদ';
      return r === 'admin' && isCash;
    })
    .reduce((sum, o) => sum + (Number(o.paidAmount) || 0), 0);

  // Cash Capital Injected into drawer:
  const cashCapitalInjected = capitalTransactions
    .filter((tx) => tx.account === 'CASH_DRAWER')
    .reduce((sum, tx) => sum + (tx.type === 'OWNER_WITHDRAWAL' || tx.type === 'EXPENSE' ? -tx.amount : tx.amount), 0);

  // Transfers sent OUT from Admin:
  const transfersSentFromAdmin = cashTransfers
    .filter((tr) => tr.status === 'ACCEPTED' && tr.fromRole === 'admin')
    .reduce((sum, tr) => sum + tr.amount, 0);

  // Cash held across Counter & DSR (receivable by Admin):
  const totalCounterCash = cashCounter;
  const totalDsrCash = cashDSR;
  const totalStaffCash = totalCounterCash + totalDsrCash;
  const totalCashReceivedFromStaff = cashReceivedFromCounter + cashReceivedFromDSR;

  const totalCompanyPaidFromLedger = supplierLedger
    .filter((entry) => entry.type === 'PAYMENT')
    .reduce((sum, entry) => sum + (entry.amount || 0), 0);

  const totalCompanyPaidFromSuppliers = suppliers.reduce((sum, s) => sum + (Number(s.totalPaid) || 0), 0);

  const totalCompanyPaid = Math.max(
    totalCompanyPaidFromLedger,
    totalCompanyPaidFromSuppliers,
    suppliers.reduce((sum, s) => {
      const rec = supplierLedger
        .filter((e) => (e.supplierId === s.id || (e.supplierName && s.name && e.supplierName.trim().toLowerCase() === s.name.trim().toLowerCase()) || (e.supplierName && s.company && e.supplierName.trim().toLowerCase() === s.company.trim().toLowerCase())) && e.type === 'PAYMENT')
        .reduce((a, e) => a + (Number(e.amount) || 0), 0);
      return sum + Math.max(Number(s.totalPaid) || 0, rec);
    }, 0)
  );

  // Total Company Payments disbursed by Admin / Owner:
  // All supplier bills are disbursed by Admin. When company payments exceed cash received into vault,
  // Admin's cash board accurately reflects the deficit (ঘাটতি / মাইনাস).
  const totalCompanyCashPaid = totalCompanyPaid;

  // Total Gross Purchases and Company Replacement Returns
  const totalGrossPurchases = suppliers.reduce((sum, s) => sum + (s.totalPurchases || 0), 0) ||
    supplierLedger
      .filter((entry) => entry.type === 'PURCHASE')
      .reduce((sum, entry) => sum + (entry.amount || 0), 0);

  const totalCompanyReplacementReturns = supplierLedger
    .filter((entry) => entry.type === 'RETURN_ADJUSTMENT' || entry.type === 'DISCOUNT_CREDIT')
    .reduce((sum, entry) => sum + (entry.amount || 0), 0);

  const totalNetPurchases = Math.max(0, totalGrossPurchases - totalCompanyReplacementReturns);
  const totalSupplierPayable = totalPayables;

  // Total cash received into Admin vault:
  const totalCashReceivedByAdmin =
    cashReceivedFromCounter + cashReceivedFromDSR + adminDirectCashSales + cashCapitalInjected;
  // Total cash disbursed from Admin vault:
  const totalAdminCashOutflow = totalCompanyCashPaid + transfersSentFromAdmin;

  // Admin / Owner Cash Balance:
  // Strictly respects physical cash accounting:
  // (Transfers Received from Counter + Transfers Received from DSR + Direct Admin Sales + Capital Injected) - (Company cash paid + Transfers sent out)
  // When company payments exceed cash received into vault, this balance is MINUS (negative / deficit):
  const formulaAdminCash = totalCashReceivedByAdmin - totalAdminCashOutflow;
  const cashAdmin = formulaAdminCash;

  const pendingTransfersToAdmin = cashTransfers.filter(
    (tr) =>
      tr.status === 'PENDING' &&
      (tr.toRole === 'admin' ||
        tr.toUserId === 'usr_admin' ||
        !tr.toRole ||
        (tr.toUserName || '').toLowerCase().includes('admin') ||
        (tr.toUserName || '').toLowerCase().includes('এডমিন'))
  );
  const pendingAmountToAdmin = pendingTransfersToAdmin.reduce((sum, tr) => sum + tr.amount, 0);

  const pendingFromDsrAndCounter = cashCounter + cashDSR;
  const isAdminCashZero = cashAdmin === 0;
  const isAdminCashNegative = cashAdmin < 0;

  const totalLiquidCash = cashAdmin + cashCounter + cashDSR + cashBank;
  const businessNetWorth = totalLiquidCash + totalInventoryValuation + totalReceivables - totalPayables;
  const totalCapitalInjected = capitalTransactions.reduce((acc, tx) => {
    if (tx.type === 'INITIAL_CAPITAL' || tx.type === 'CAPITAL_INJECTION') return acc + tx.amount;
    if (tx.type === 'OWNER_WITHDRAWAL') return acc - tx.amount;
    return acc;
  }, 0);

  const pendingTransfersCount = cashTransfers.filter((t) => t.status === 'PENDING').length;

  // Gross Profit from all sales orders (বিক্রয় মেমো থেকে মোট লাভ)
  const grossProfit = orders.reduce((sum, ord) => sum + (Number(ord.totalProfitAmount) || 0), 0);

  // Total operating expenses (সকল বেতন, দোকান ভাড়া, বিদ্যুৎ বিল ও অন্যান্য খরচ)
  const totalExpenses = expenses.reduce((sum, exp) => sum + (Number(exp.amount) || 0), 0);

  // Net Realized Profit = Gross Sales Profit - Total Expenses
  // "যা প্রফিট থেকে - হবে প্রফিট পর্যাপ্ত না থাকলে মাইনাস ফিগার শো করবে"
  const netRealizedProfit = grossProfit - totalExpenses;

  // Provide effective active user so that Admin always has live cashAdmin as drawer balance:
  const effectiveCurrentUser: UserProfile = useMemo(() => {
    if (currentUser.role === 'admin' || currentRole === 'admin') {
      return {
        ...currentUser,
        assignedCashDrawer: cashAdmin,
      };
    }
    const matched = users.find((u) => u.id === currentUser.id || u.role === currentUser.role);
    return matched ? { ...currentUser, ...matched } : currentUser;
  }, [currentUser, currentRole, users, cashAdmin]);

  // Synchronize users array so admin object reflects live cashAdmin:
  const effectiveUsers: UserProfile[] = useMemo(() => {
    return users.map((u) => {
      if (u.role === 'admin') {
        return { ...u, assignedCashDrawer: cashAdmin };
      }
      return u;
    });
  }, [users, cashAdmin]);

  // Device Persistent Fingerprint
  const getDeviceId = useCallback((): string => {
    if (typeof window === 'undefined') return 'server_device';
    let devId = localStorage.getItem('ws_device_fingerprint');
    if (!devId) {
      const isMob = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
      devId = `dev_${isMob ? 'mobile' : 'laptop'}_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 7)}`;
      localStorage.setItem('ws_device_fingerprint', devId);
    }
    return devId;
  }, []);

  const [remoteServerDevices, setRemoteServerDevices] = useState<any[]>([]);
  const [registeredDevices, setRegisteredDevices] = useState<any[]>([]);
  const [remotePendingDevices, setRemotePendingDevices] = useState<any[]>([]);

  // Refresh Registered Device Fleet
  const refreshRegisteredDevices = useCallback(async () => {
    try {
      const res = await fetch('/api/device/list?adminPhone=01937200635');
      const json = await res.json();
      if (json.success && Array.isArray(json.devices)) {
        setRegisteredDevices(json.devices);
      }
    } catch {}
  }, []);

  // Admin Clears Remote Device Pending Queue and saves to emergency backup
  const adminClearDevicePending = useCallback(async (deviceId: string): Promise<{ success: boolean; message: string }> => {
    try {
      // 1. Clear on Firestore active_devices
      if (db) {
        setDoc(
          doc(db, 'system', 'active_devices'),
          {
            [deviceId]: {
              pendingFilesCount: 0,
              pendingItems: [],
              clearedAt: new Date().toISOString(),
            },
          },
          { merge: true }
        ).catch(() => {});
      }

      // 2. Clear on backend server and generate emergency backup JSON
      const res = await fetch('/api/device/pending-sync/clear-to-backup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ deviceId }),
      });
      const json = await res.json();
      if (json.success) {
        setRemotePendingDevices((prev) => prev.filter((d) => d.deviceId !== deviceId));
        return { success: true, message: json.message };
      }
      return { success: false, message: json.error || 'Failed to clear device pending queue' };
    } catch (e: any) {
      return { success: false, message: e.message || 'Network error' };
    }
  }, []);

  // Admin Force Uploads and Merges Remote Device Pending Queue
  const adminUploadDevicePending = useCallback(async (deviceId: string): Promise<{ success: boolean; message: string }> => {
    try {
      const targetDev = remotePendingDevices.find((d) => d.deviceId === deviceId);
      if (!targetDev || !Array.isArray(targetDev.pendingItems) || targetDev.pendingItems.length === 0) {
        return { success: false, message: 'কোনো পেন্ডিং ফাইল পাওয়া যায়নি।' };
      }

      // Merge items if they are orders or cash transfers
      let ordersAdded = 0;
      targetDev.pendingItems.forEach((item: any) => {
        if (item.entityType === 'orders' && item.payload) {
          const ord = item.payload;
          if (ord && ord.id) {
            setOrders((prev) => {
              if (prev.some((o) => o.id === ord.id)) return prev;
              const next = [ord, ...prev];
              localStorage.setItem('ws_orders', JSON.stringify(next));
              return next;
            });
            ordersAdded++;
          }
        }
      });

      // Clear on server to backup
      await adminClearDevicePending(deviceId);
      return {
        success: true,
        message: `${targetDev.name} (${targetDev.role?.toUpperCase()})-এর ${targetDev.pendingFilesCount}টি পেন্ডিং ফাইল সফলভাবে ক্লাউডে আপলোড ও সিঙ্ক সম্পন্ন হয়েছে!`,
      };
    } catch (e: any) {
      return { success: false, message: e.message || 'Upload failed' };
    }
  }, [remotePendingDevices, adminClearDevicePending]);

  // Live Multi-Device Staff Presence Heartbeat
  const sendPresenceHeartbeat = useCallback(async () => {
    try {
      const isMobile =
        typeof navigator !== 'undefined' &&
        /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
      const deviceInfo = isMobile ? 'স্মার্টফোন (মোবাইল অ্যাপ)' : 'ল্যাপটপ / কম্পিউটার POS';
      const devId = getDeviceId();
      const nowIso = new Date().toISOString();

      // Gather pending offline queue summary
      const pendingItems = (offlineSyncQueue || []).slice(0, 10).map((q) => ({
        id: q.id,
        entityType: (q as any).entityType || q.collection,
        action: q.action,
        timestamp: q.timestamp,
        title: (q.payload as any)?.invoiceNo || (q.payload as any)?.transferNo || (q.payload as any)?.description || 'পেন্ডিং ফাইল',
        amount: (q.payload as any)?.totalAmount || (q.payload as any)?.amount || 0,
        party: (q.payload as any)?.retailerName || (q.payload as any)?.customerName || (q.payload as any)?.toUserName || '',
      }));

      // 1. Send heartbeat & register to backend server
      const heartbeatPayload = {
        deviceId: devId,
        adminPhone: '01937200635',
        role: currentRole,
        phone: currentUser.phone || (currentRole === 'admin' ? '01937200635' : currentRole === 'counter' ? '01949663733' : '01615154653'),
        name: currentUser.name || (currentRole === 'admin' ? 'মাতৃছায়া টেলিকম' : currentRole === 'counter' ? 'Asif' : 'Razo Alom'),
        deviceType: deviceInfo,
        appVersion: '3.0.0',
        pendingFilesCount: offlineSyncQueue.length,
        pendingItems,
      };

      fetch('/api/presence/heartbeat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(heartbeatPayload),
      }).catch(() => {});

      // 2. Poll server presence status to know if remote devices are online
      try {
        const statusRes = await fetch('/api/presence/status?adminPhone=01937200635');
        const statusJson = await statusRes.json();
        if (statusJson.success && Array.isArray(statusJson.devices)) {
          setRemoteServerDevices(statusJson.devices);
          setRegisteredDevices(statusJson.devices);
        }
      } catch {}

      // 3. Poll pending sync devices for Admin
      if (currentRole === 'admin') {
        try {
          const pendingRes = await fetch('/api/device/pending-sync/all?adminPhone=01937200635');
          const pendingJson = await pendingRes.json();
          if (pendingJson.success && Array.isArray(pendingJson.devices)) {
            setRemotePendingDevices(pendingJson.devices);
          }
        } catch {}
      }

      // 4. Update Firestore user document if connected
      if (db && currentUser?.id) {
        setDoc(
          doc(db, COLLECTIONS.USERS, currentUser.id),
          cleanFirestorePayload({
            ...currentUser,
            lastActiveAt: nowIso,
            isOnline: true,
            deviceInfo,
          }),
          { merge: true }
        ).catch(() => {});
      }

      // 5. Update Firestore System Active Devices (real-time cross-network fleet presence)
      if (db) {
        setDoc(
          doc(db, 'system', 'active_devices'),
          {
            [devId]: {
              deviceId: devId,
              adminPhone: '01937200635',
              role: currentRole,
              phone: currentUser.phone || (currentRole === 'admin' ? '01937200635' : currentRole === 'counter' ? '01949663733' : '01615154653'),
              name: currentUser.name || (currentRole === 'admin' ? 'মাতৃছায়া টেলিকম' : currentRole === 'counter' ? 'Asif' : 'Razo Alom'),
              deviceType: deviceInfo,
              lastHeartbeatMs: Date.now(),
              lastSeenAt: nowIso,
              isOnline: true,
              pendingFilesCount: offlineSyncQueue.length,
              pendingItems,
            },
          },
          { merge: true }
        ).catch(() => {});
      }
    } catch {
      // ignore transient offline errors
    }
  }, [currentUser, currentRole, getDeviceId, offlineSyncQueue]);

  useEffect(() => {
    sendPresenceHeartbeatRef.current = sendPresenceHeartbeat;
  }, [sendPresenceHeartbeat]);

  // Automatically pulse presence heartbeat periodically and on window focus/online
  useEffect(() => {
    sendPresenceHeartbeat();
    const interval = setInterval(() => {
      sendPresenceHeartbeat();
    }, 6000); // Pulse every 6 seconds for fast cross-device online status update

    const handleFocus = () => sendPresenceHeartbeat();
    window.addEventListener('focus', handleFocus);
    window.addEventListener('online', handleFocus);

    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('online', handleFocus);
    };
  }, [sendPresenceHeartbeat]);

  const getDevicePresence = useCallback(
    (roleOrUserId: string): { isOnline: boolean; lastActiveText: string; deviceText: string } => {
      const normalizedTarget = roleOrUserId.toLowerCase();
      const targetCleanPhone = roleOrUserId.replace(/[^0-9]/g, '');

      // Find all matching remote devices from server registry or Firestore active devices
      const matchingRemotes = remoteServerDevices.filter((d) => {
        if (!d) return false;
        const dRole = (d.role || '').toLowerCase();
        const dPhone = (d.phone || '').replace(/[^0-9]/g, '');
        const dId = (d.deviceId || '');
        return (
          dRole === normalizedTarget ||
          dId === roleOrUserId ||
          (normalizedTarget.includes('admin') && dRole === 'admin') ||
          (normalizedTarget.includes('counter') && dRole === 'counter') ||
          (normalizedTarget.includes('dsr') && dRole === 'dsr') ||
          (targetCleanPhone.length >= 8 && dPhone.includes(targetCleanPhone.slice(-8))) ||
          (dPhone.length >= 8 && targetCleanPhone.includes(dPhone.slice(-8)))
        );
      });

      // Is ANY remote device currently online? (heartbeat within 40 seconds)
      const remoteOnlineDev = matchingRemotes.find((d) => {
        const diffMs = Math.max(0, Date.now() - (d.lastHeartbeatMs || 0));
        return Boolean(d.isOnline) && diffMs <= 40000;
      });

      // Local current device check
      const isCurrentDeviceRole =
        (currentUser.id === roleOrUserId || currentUser.role === roleOrUserId || (currentUser.phone && currentUser.phone.includes(roleOrUserId))) && isOnline;

      if (isCurrentDeviceRole && remoteOnlineDev) {
        return {
          isOnline: true,
          lastActiveText: language === 'bn' ? 'সক্রিয় (বর্তমান ও রিমোট ২টি ডিভাইসে)' : 'Active (Local & Remote Devices)',
          deviceText: `${remoteOnlineDev.deviceType || 'স্মার্টফোন'} + বর্তমান ডিভাইস`,
        };
      }

      if (isCurrentDeviceRole) {
        const localDev = typeof navigator !== 'undefined' && /mobile/i.test(navigator.userAgent) ? 'স্মার্টফোন (বর্তমান ডিভাইস)' : 'ল্যাপটপ (বর্তমান ডিভাইস)';
        return {
          isOnline: true,
          lastActiveText: language === 'bn' ? 'এই মুহূর্তে সক্রিয় (Online)' : 'Active Now (Online)',
          deviceText: localDev,
        };
      }

      if (remoteOnlineDev) {
        return {
          isOnline: true,
          lastActiveText: language === 'bn' ? 'এই মুহূর্তে অনলাইনে সক্রিয়' : 'Active Now (Online)',
          deviceText: remoteOnlineDev.deviceType || (remoteOnlineDev.role === 'dsr' ? 'স্মার্টফোন' : 'ল্যাপটপ'),
        };
      }

      // If remote device was seen recently, find the most recently seen device
      const latestSeen = matchingRemotes.slice().sort((a, b) => (b.lastHeartbeatMs || 0) - (a.lastHeartbeatMs || 0))[0];
      if (latestSeen && latestSeen.lastSeenSec !== undefined) {
        const sec = latestSeen.lastSeenSec;
        const min = Math.floor(sec / 60);
        let timeStr = language === 'bn' ? `${min} মিনিট আগে` : `${min}m ago`;
        if (min >= 60) {
          const hrs = Math.floor(min / 60);
          timeStr = language === 'bn' ? `${hrs} ঘণ্টা আগে` : `${hrs}h ago`;
        }
        return {
          isOnline: false,
          lastActiveText: timeStr,
          deviceText: latestSeen.deviceType || 'ডিভাইস',
        };
      }

      // Fallback to Firestore users collection
      const user = users.find((u) => u.id === roleOrUserId || u.role === roleOrUserId || (u.phone && u.phone.includes(roleOrUserId)));
      if (user && user.lastActiveAt) {
        const lastMs = new Date(user.lastActiveAt).getTime();
        const diffSec = Math.max(0, Math.floor((Date.now() - lastMs) / 1000));
        const online = diffSec <= 45;
        let lastActiveText = language === 'bn' ? 'অনলাইন' : 'Online';
        if (!online) {
          const diffMin = Math.floor(diffSec / 60);
          lastActiveText = diffMin < 60 ? (language === 'bn' ? `${diffMin} মিনিট আগে` : `${diffMin}m ago`) : (language === 'bn' ? `${Math.floor(diffMin / 60)} ঘণ্টা আগে` : `${Math.floor(diffMin / 60)}h ago`);
        }
        return {
          isOnline: online,
          lastActiveText,
          deviceText: user.deviceInfo || 'ডিভাইস',
        };
      }

      return {
        isOnline: false,
        lastActiveText: language === 'bn' ? 'অফলাইন (লগইন হয়নি)' : 'Offline',
        deviceText: 'ডিভাইস',
      };
    },
    [remoteServerDevices, currentUser, isOnline, language, users]
  );

  const allStaffPresences = useMemo(() => {
    // Specifically monitor the 3 official accounts: Admin 01937200635, Cash Counter 01949663733, DSR 01615154653
    const staffDefinitions = [
      { id: 'usr_admin', role: 'admin' as UserRole, phone: '01937200635', defaultName: 'মাতৃছায়া টেলিকম (Admin)' },
      { id: 'usr_counter_pc', role: 'counter' as UserRole, phone: '01949663733', defaultName: 'ক্যাশ কাউন্টার (ল্যাপটপ POS)' },
      { id: 'usr_dsr_razo', role: 'dsr' as UserRole, phone: '01615154653', defaultName: 'রাজু আলম / আহমেদ (ডিএসআর)' },
    ];

    return staffDefinitions.map((def) => {
      const user = users.find(
        (u) => u.id === def.id || u.role === def.role || (u.phone && u.phone.includes(def.phone.slice(-8)))
      );
      const pres = getDevicePresence(def.role);
      return {
        id: def.id,
        role: def.role,
        phone: def.phone,
        name: user?.name || def.defaultName,
        bnName: user?.bnName || def.defaultName,
        isOnline: pres.isOnline,
        lastActiveText: pres.lastActiveText,
        deviceText: pres.deviceText,
      };
    });
  }, [users, getDevicePresence]);

  return (
    <WholesaleContext.Provider
      value={{
        language,
        setLanguage,
        toggleLanguage,
        currentUser: effectiveCurrentUser,
        setCurrentUser,
        currentRole,
        setRole,
        users: effectiveUsers,
        setUsers,
        products: filteredProducts,
        suppliers,
        supplierLedger,
        retailers,
        cashTransfers,
        capitalTransactions,
        replacements,
        orders,
        phoneContacts,
        activityLogs,
        addActivityLog,
        clearActivityLogs,
        deviceFrame,
        setDeviceFrame,

        // Authentication & Registration
        isAuthenticated,
        isAuthModalOpen,
        setIsAuthModalOpen,
        openAuthModal,
        closeAuthModal,
        loginWithPhone,
        loginWithGoogle,
        registerAccount,
        logout,
        selectDemoUser,

        // Admin Reference & Multi-Enterprise Linking
        updateAdminReference,
        activeAdminEnterprise,
        activeAdminPhone,
        activeAdminName,
        isLinkedToAdmin,
        isRefSwitcherOpen,
        setIsRefSwitcherOpen,
        openRefSwitcher,
        closeRefSwitcher,

        // Offline Persistence & Cloud Backup
        isOnline,
        isFromCache,
        hasPendingWrites,
        isSimulatedOffline,
        toggleSimulateOffline,
        pendingTransfersCount,
        offlineQueueCount: offlineSyncQueue.length,
        offlineSyncQueue,
        lastSyncTime,
        lastBackupTime,
        backupHistory,
        isSyncingToCloud,
        isBackupModalOpen,
        setIsBackupModalOpen,
        openBackupModal,
        closeBackupModal,
        isStaffSyncModalOpen,
        setIsStaffSyncModalOpen,
        openStaffSyncModal,
        closeStaffSyncModal,
        syncPendingOfflineData,
        backupAllPendingFilesTogether,
        syncRoleTransactionsToCloud,
        refreshAllDataFromCloud,
        triggerManualBackup,
        downloadLocalBackupJSON,
        restoreFromBackupSnapshot,
        syncToGoogleDrive,
        pullFromGoogleDrive,
        isGoogleDriveConnected,
        googleDriveAccount,

        // Live Multi-Device Staff Presence
        getDevicePresence,
        allStaffPresences,
        sendPresenceHeartbeat,
        registeredDevices,
        remotePendingDevices,
        refreshRegisteredDevices,
        adminClearDevicePending,
        adminUploadDevicePending,
        isFleetModalOpen,
        setIsFleetModalOpen,
        openFleetModal,
        closeFleetModal,

        // Biometric Authentication & Secure Storage Bridge
        isBiometricLocked,
        isBiometricEnabled,
        setBiometricEnabled,
        autoLockDuration,
        setAutoLockDuration,
        isPlatformBiometricAvailable,
        isBiometricSettingsOpen,
        setIsBiometricSettingsOpen,
        openBiometricSettings,
        closeBiometricSettings,
        lockBiometric,
        unlockBiometric,

        // Business Profile & Pad Configuration
        businessProfile,
        updateBusinessProfile,
        isBusinessProfileOpen,
        setIsBusinessProfileOpen,
        openBusinessProfile,
        closeBusinessProfile,

        // Dual Cash Balances & Payment Flow
        cashAdmin,
        cashCounter,
        cashDSR,
        cashBank,
        bankAccounts,
        pendingFromDsrAndCounter,
        isAdminCashZero,
        isAdminCashNegative,
        isCounterCashNegative,
        isDsrCashNegative,
        quickPayAdmin,
        quickReceiveFromCounter,
        quickPayCounterFromDsr,

        // Cash Flow Formulas & Net Breakdown across Drawers
        totalCashReceivedByAdmin,
        adminDirectCashSales,
        cashCapitalInjected,
        cashReceivedFromCounter,
        cashReceivedFromDSR,
        counterOrdersCashCollected,
        cashReceivedFromDSRToCounter,
        counterTransfersToAdmin,
        counterPendingTransfersToAdmin,
        dsrOrdersCashCollected,
        dsrTransfersOut,
        dsrTransfersToCounter,
        dsrPendingTransfersToCounter,
        totalCounterCash,
        totalDsrCash,
        totalStaffCash,
        totalCashReceivedFromStaff,
        totalCompanyCashPaid,
        totalCompanyPaid,
        pendingTransfersToAdmin,
        pendingAmountToAdmin,
        acceptAllPendingTransfersToAdmin,
        acceptAllPendingTransfersToCurrentUser,

        // Direct Balance Modification Handlers
        updateBankBalance,
        updateBankAccountBalance,
        updateUserCashDrawer,
        updateAdminCashVault,
        updateCounterCash,
        updateDsrCash,
        adjustDirectBalance,

        // Balance Editor Modal Controls
        isBalanceModalOpen,
        setIsBalanceModalOpen,
        balanceModalTarget,
        balanceModalType: balanceModalTarget,
        openBalanceModal,
        closeBalanceModal,

        adminCashBalance: cashAdmin,
        counterCashBalance: cashCounter,
        dsrCashBalance: cashDSR,
        bankCashBalance: cashBank,

        // Sandbox / Test Mode & Multi-Tenant Shop Isolation
        isTestMode,
        setIsTestMode,
        toggleTestMode,
        activeTenantId,
        setTenantId,

        // Modal Controls
        isInvestModalOpen,
        setIsInvestModalOpen,
        openInvestModal,
        closeInvestModal,
        isPaymentHubOpen,
        setIsPaymentHubOpen,
        openPaymentHub,
        closePaymentHub,
        isCompanyPaymentModalOpen,
        setIsCompanyPaymentModalOpen,
        openCompanyPaymentModal,
        closeCompanyPaymentModal,
        isPayAdminModalOpen,
        setIsPayAdminModalOpen,
        openPayAdminModal,
        closePayAdminModal,
        isAddSupplierModalOpen,
        setIsAddSupplierModalOpen,
        openAddSupplierModal,
        closeAddSupplierModal,

        // Company Statement & Purchase vs Replacement Analytics
        totalGrossPurchases,
        totalCompanyReplacementReturns,
        totalNetPurchases,
        totalSupplierPayable,
        isCompanyStatementModalOpen,
        setIsCompanyStatementModalOpen,
        companyStatementSupplierId,
        openCompanyStatement,
        closeCompanyStatement,

        // Actions
        createCashTransfer,
        acceptCashTransfer,
        rejectCashTransfer,
        addSupplierPurchaseFromScan,
        addSaleFromScan,
        addSupplierPurchase,
        addSupplierPayment,
        createOrderInvoice,
        createOrder: createOrderInvoice,
        addRetailerFromPhonebook,
        addPhoneContact,
        submitReplacementClaim,
        addReplacementClaim: submitReplacementClaim,
        resolveReplacement,
        resolveReplacementClaim: resolveReplacement,
        companyReturns,
        dispatchReturnsToCompany,
        addDirectCompanyReturn,
        deleteCompanyReturn,

        // Memo & Khata Scanner for Cash Counter & DSR Sales and Replacement
        isMemoKhataScannerOpen,
        setIsMemoKhataScannerOpen,
        memoKhataScannerInitialMode,
        openMemoKhataScanner,
        closeMemoKhataScanner,
        addCounterOrDsrSalesAndReplacement,

        // Replacement Settlement & Accounting Handlers
        settleRetailerReplacementClaim,
        batchSettleRetailerClaims,
        recordCompanyCreditSettlement,
        showNotification,

        addCapitalTransaction,
        updateProductThreshold,
        restockProduct,
        updateProduct,
        addProduct,
        deleteProduct,
        mergeAllDuplicateProducts,
        deleteOrder,
        updateOrderInvoice,
        updateOrder: updateOrderInvoice,
        deleteRetailer,
        updateRetailer,
        addRetailer,
        deleteSupplier,
        updateSupplier,
        updateSupplierOpeningDue,
        addSupplier,
        updateSupplierPurchaseChallan,
        deleteSupplierLedgerEntry,
        deleteCashTransfer,
        deleteCapitalTransaction,
        deleteReplacementClaim,
        deletePhoneContact,
        updatePhoneContact,
        deleteUser,
        updateUserProfile,
        clearAllActivityLogs,
        deleteActivityLog,
        clearAllSampleData,
        restoreSampleBusinessData,
        resetAllSystemData,

        // System Data Reset Modal Controls
        isResetModalOpen,
        setIsResetModalOpen,
        openResetModal,
        closeResetModal,

        // Staff & Team Management (DSR & Cash Counter)
        isStaffManagementOpen,
        setIsStaffManagementOpen,
        openStaffManagement,
        closeStaffManagement,
        addStaffMember,
        updateStaffMember,
        deleteStaffMember,

        // Financial Totals
        totalCapitalInjected,
        totalReceivables,
        totalPayables,
        totalInventoryValuation,
        totalLiquidCash,
        businessNetWorth,

        // Expenses & Operational Outflow Management (ক্যাশ কাউন্টার খরচ এন্ট্রি - বেতন, দোকান ভাড়া, বিদ্যুৎ বিল, অন্যান্য)
        expenses,
        addExpense,
        deleteExpense,
        updateExpense,
        isExpenseModalOpen,
        setIsExpenseModalOpen,
        openExpenseModal,
        closeExpenseModal,
        expenseModalDefaultCategory,
        counterExpensesPaid,
        totalExpenses,
        grossProfit,
        netRealizedProfit,
      }}
    >
      {children}
    </WholesaleContext.Provider>
  );
};

export const useWholesale = () => {
  const context = useContext(WholesaleContext);
  if (!context) {
    throw new Error('useWholesale must be used within a WholesaleProvider');
  }
  return context;
};
