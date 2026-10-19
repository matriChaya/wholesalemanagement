import {
  UserProfile,
  Product,
  Retailer,
  Supplier,
  SupplierLedgerEntry,
  CashTransfer,
  CapitalTransaction,
  ReplacementAdjustment,
  OrderInvoice,
  PhoneContact,
  BankAccount,
  ActivityLog,
  Expense,
} from '../types';
import { initialOrders } from './ordersData';
export { initialOrders };

export const initialUsers: UserProfile[] = [
  {
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
  },
  {
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
    assignedCashDrawer: 0,
  },
  {
    id: 'usr_dsr_razo',
    name: 'Razo Alom',
    bnName: 'রাজু আলম (ডিএসআর)',
    role: 'dsr',
    phone: '01615154653',
    pin: '3456',
    email: 'razo@matrichayatelecom.com',
    avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80',
    enterpriseName: 'মাতৃছায়া টেলিকম',
    shopName: 'মাতৃছায়া টেলিকম',
    adminRef: '01937200635',
    adminPhone: '01937200635',
    adminEnterprise: 'মাতৃছায়া টেলিকম',
    adminName: 'মাতৃছায়া টেলিকম',
    assignedCashDrawer: 0,
    routeArea: 'সদর ও বাজার ডেলিভারি রুট',
    notes: 'রাজু আহমেদ',
  },
];

import {
  masterProducts,
  masterSuppliers,
  masterRetailers,
  masterSupplierLedger,
  masterCashTransfers,
  masterReplacements,
  masterActivityLogs,
} from './masterBackupData';

/**
 * Master verified data from system backup:
 * Preserves all genuine products, suppliers, retailers, ledger entries,
 * cash transfers, and replacements across laptop, mobile, and web.
 */
export const initialSuppliers: Supplier[] = masterSuppliers;
export const initialProducts: Product[] = masterProducts;

export const initialRetailers: Retailer[] = masterRetailers;

export const initialSupplierLedger: SupplierLedgerEntry[] = masterSupplierLedger;

// initialOrders (clean slate, manual / scanned entries only) imported from ./ordersData

export const initialCashTransfers: CashTransfer[] = masterCashTransfers;

export const initialBankAccounts: BankAccount[] = [
  {
    id: 'acc_ibbl',
    name: 'Islami Bank Bangladesh PLC',
    bnName: 'ইসলামী ব্যাংক বাংলাদেশ পিএলসি',
    type: 'BANK',
    accountNumber: '20501450201889001',
    branch: 'সদর ব্রাঞ্চ',
    balance: 285000,
  },
  {
    id: 'acc_dbbl',
    name: 'Dutch-Bangla Bank Ltd',
    bnName: 'ডাচ-বাংলা ব্যাংক লিমিটেড',
    type: 'BANK',
    accountNumber: '1151200034567',
    branch: 'প্রিন্সিপাল ব্রাঞ্চ',
    balance: 165000,
  },
  {
    id: 'acc_bkash',
    name: 'bKash Merchant Account',
    bnName: 'বিকাশ মার্চেন্ট অ্যাকাউন্ট',
    type: 'MFS',
    accountNumber: '01937200635',
    balance: 42500,
  },
  {
    id: 'acc_nagad',
    name: 'Nagad Merchant Account',
    bnName: 'নগদ মার্চেন্ট অ্যাকাউন্ট',
    type: 'MFS',
    accountNumber: '01937200635',
    balance: 28000,
  },
];

export const initialCapitalTransactions: CapitalTransaction[] = [];

export const initialReplacements: ReplacementAdjustment[] = masterReplacements;

export const samplePhonebookContacts: PhoneContact[] = [];

export const initialActivityLogs: ActivityLog[] = masterActivityLogs;

export const initialExpenses: Expense[] = [];

