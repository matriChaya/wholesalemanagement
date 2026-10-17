import React, { useState } from 'react';
import { useWholesale } from '../context/WholesaleContext';
import { Supplier, SupplierLedgerEntry, SupplierLedgerType } from '../types';
import { translations, formatCurrency, getTodayDateString, getYesterdayDateString, formatDate } from '../utils/translations';
import { exportSupplierLedgerToPdf, exportAllSuppliersSummaryPdf, generateSupplierLedgerPdf, generateAllSuppliersSummaryPdf, PdfDocumentResult } from '../utils/pdfExport';
import { PhoneInputWithContactPicker } from './PhoneInputWithContactPicker';
import { PdfPreviewModal } from './PdfPreviewModal';
import { EditPurchaseChallanModal } from './EditPurchaseChallanModal';
import { DeletePurchaseChallanModal } from './DeletePurchaseChallanModal';
import {
  Building2,
  Plus,
  ArrowUpRight,
  ArrowDownLeft,
  FileText,
  DollarSign,
  Phone,
  CreditCard,
  Printer,
  Search,
  CheckCircle2,
  X,
  Sparkles,
  Calendar,
  AlertCircle,
  Download,
  FileDown,
  RotateCcw,
  Layers,
  UserCheck,
  Trash2,
  Edit2,
  Edit3,
  PlusCircle,
  AlertTriangle,
  Eye,
  Save,
  RefreshCw
} from 'lucide-react';

interface SupplierLedgerViewProps {
  onOpenScannerModal: () => void;
}

export const SupplierLedgerView: React.FC<SupplierLedgerViewProps> = ({ onOpenScannerModal }) => {
  const {
    language,
    suppliers,
    supplierLedger,
    products,
    addSupplierPayment,
    addSupplierPurchase,
    deleteSupplierLedgerEntry,
    updateSupplier,
    updateSupplierOpeningDue,
    deleteSupplier,
    addSupplier,
    currentUser,
    currentRole,
    cashAdmin,
    isAdminCashZero,
    openCompanyPaymentModal,
    openInvestModal,
    openAddSupplierModal,
  } = useWholesale();

  const t = translations[language];

  // Supplier list search
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedSupplierId, setSelectedSupplierId] = useState<string | null>(
    suppliers[0]?.id || null
  );

  React.useEffect(() => {
    if ((!selectedSupplierId || !suppliers.some(s => s.id === selectedSupplierId)) && suppliers.length > 0) {
      setSelectedSupplierId(suppliers[0].id);
    }
  }, [suppliers, selectedSupplierId]);

  // Transactions ledger search & filters
  const [txnSearchQuery, setTxnSearchQuery] = useState<string>('');
  const [txnDateFilter, setTxnDateFilter] = useState<string>('');
  const [viewScope, setViewScope] = useState<'SELECTED' | 'ALL'>('SELECTED');
  const [typeFilter, setTypeFilter] = useState<'ALL' | SupplierLedgerType>('ALL');

  // Edit and Delete Challan states
  const [editingChallan, setEditingChallan] = useState<SupplierLedgerEntry | null>(null);
  const [deletingChallan, setDeletingChallan] = useState<SupplierLedgerEntry | null>(null);

  // Add Purchase / Challan Modal (রেফারেন্স ও পূর্বের ডিও সহ)
  const [isPurchaseModalOpen, setIsPurchaseModalOpen] = useState<boolean>(false);
  const [purchaseSupplierId, setPurchaseSupplierId] = useState<string>('');
  const [purchaseReferenceNo, setPurchaseReferenceNo] = useState<string>('');
  const [purchasePreviousDoNo, setPurchasePreviousDoNo] = useState<string>('');
  const [purchasePreviousDoDate, setPurchasePreviousDoDate] = useState<string>('');
  const [purchaseDate, setPurchaseDate] = useState<string>(getTodayDateString());
  const [purchaseAmount, setPurchaseAmount] = useState<number>(0);
  const [purchasePaymentStatus, setPurchasePaymentStatus] = useState<'Unpaid' | 'Paid'>('Unpaid');
  const [purchaseNotes, setPurchaseNotes] = useState<string>('');

  // Payment Modal
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState<boolean>(false);
  const [paymentAmount, setPaymentAmount] = useState<number>(0);
  const [paymentDate, setPaymentDate] = useState<string>(getTodayDateString());
  const [paymentMethod, setPaymentMethod] = useState<
    'Cash' | 'Bank Transfer' | 'bKash / Nagad' | 'Cheque'
  >('Bank Transfer');
  const [paymentRef, setPaymentRef] = useState<string>('');
  const [paymentNotes, setPaymentNotes] = useState<string>('');

  // Toast / Notification
  const [actionSuccessMsg, setActionSuccessMsg] = useState<string | null>(null);
  const [pdfPreviewResult, setPdfPreviewResult] = useState<PdfDocumentResult | null>(null);

  // Delete Ledger Entry Modal
  const [deletingEntry, setDeletingEntry] = useState<SupplierLedgerEntry | null>(null);
  const [revertBalanceOnDelete, setRevertBalanceOnDelete] = useState<boolean>(true);

  // Add / Edit Supplier Modal
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
  const [isAddSupplierOpen, setIsAddSupplierOpen] = useState<boolean>(false);
  const [deletingSupplier, setDeletingSupplier] = useState<Supplier | null>(null);

  // Dedicated Opening D.O. & Initial Due Modal State
  const [isOpeningDoModalOpen, setIsOpeningDoModalOpen] = useState<boolean>(false);
  const [openingDoBalance, setOpeningDoBalance] = useState<number>(0);
  const [openingDoDate, setOpeningDoDate] = useState<string>(getTodayDateString());
  const [openingDoNotes, setOpeningDoNotes] = useState<string>('');

  const [supplierForm, setSupplierForm] = useState({
    name: '',
    company: '',
    phone: '',
    address: '',
    bankDetails: '',
    paymentTerms: 'Net 15',
    outstandingPayable: 0,
    openingBalance: 0,
    openingDate: getTodayDateString(),
    openingNotes: '',
  });

  const showNotification = (msg: string) => {
    setActionSuccessMsg(msg);
    setTimeout(() => setActionSuccessMsg(null), 4000);
  };

  const filteredSuppliers = suppliers.filter(
    (s) =>
      s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.company.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.phone.includes(searchTerm)
  );

  const activeSupplier =
    suppliers.find((s) => s.id === selectedSupplierId) || suppliers[0];

  // Helper to match ledger entry with active supplier by ID or company/supplier name
  const matchesActiveSupplier = (entry: SupplierLedgerEntry) => {
    if (!activeSupplier) return false;
    if (entry.supplierId === activeSupplier.id) return true;
    const nameMatch = entry.supplierName && activeSupplier.name && entry.supplierName.trim().toLowerCase() === activeSupplier.name.trim().toLowerCase();
    const compMatch = entry.supplierName && activeSupplier.company && entry.supplierName.trim().toLowerCase() === activeSupplier.company.trim().toLowerCase();
    return Boolean(nameMatch || compMatch);
  };

  // Base ledger entries according to view scope
  const baseLedgerEntries =
    viewScope === 'SELECTED' && activeSupplier
      ? supplierLedger.filter((entry) => matchesActiveSupplier(entry))
      : supplierLedger;

  // Filter transactions by type, amount, date, counter-party name, ref, notes
  const filteredLedgerEntries = baseLedgerEntries.filter((entry) => {
    if (typeFilter !== 'ALL' && entry.type !== typeFilter) return false;
    if (txnDateFilter && entry.date !== txnDateFilter) return false;

    if (txnSearchQuery.trim()) {
      const q = txnSearchQuery.toLowerCase().trim();
      const cleanAmount = q.replace(/[৳,\s\+\-]/g, '');

      const amountStr = entry.amount.toString();
      const balanceStr = entry.balanceAfter.toString();
      const formattedAmount = formatCurrency(entry.amount, language).toLowerCase();
      const formattedBalance = formatCurrency(entry.balanceAfter, language).toLowerCase();
      const amountMatch =
        (cleanAmount && (amountStr.includes(cleanAmount) || balanceStr.includes(cleanAmount))) ||
        formattedAmount.includes(q) ||
        formattedBalance.includes(q);

      const dateMatch = entry.date.toLowerCase().includes(q);

      const supplierObj = suppliers.find((s) => s.id === entry.supplierId);
      const counterPartyName = (entry.supplierName || supplierObj?.name || '').toLowerCase();
      const counterPartyCompany = (supplierObj?.company || '').toLowerCase();
      const partyMatch =
        counterPartyName.includes(q) ||
        counterPartyCompany.includes(q);

      const refMatch = entry.referenceNo.toLowerCase().includes(q);
      const notesMatch = (entry.notes || '').toLowerCase().includes(q);
      const methodMatch = (entry.paymentMethod || '').toLowerCase().includes(q);
      const typeMatch = entry.type.toLowerCase().includes(q);
      const prevDoMatch = (entry.previousDoNo || '').toLowerCase().includes(q);

      // Search product names in entry items
      const itemProductMatch =
        Array.isArray(entry.items) &&
        entry.items.some(
          (it) =>
            (it.name || '').toLowerCase().includes(q) ||
            (it.sku || '').toLowerCase().includes(q) ||
            (it.category || '').toLowerCase().includes(q)
        );

      // Search linked inventory products
      const linkedProductMatch = products.some(
        (prod) =>
          ((prod.challanReferences || []).some(
            (r) => (r.challanNo || '').trim().toLowerCase() === entry.referenceNo.toLowerCase()
          ) || (prod.latestChallanNo || '').trim().toLowerCase() === entry.referenceNo.toLowerCase()) &&
          ((prod.name || '').toLowerCase().includes(q) ||
            (prod.bnName || '').toLowerCase().includes(q) ||
            (prod.sku || '').toLowerCase().includes(q))
      );

      if (
        !amountMatch &&
        !dateMatch &&
        !partyMatch &&
        !refMatch &&
        !notesMatch &&
        !methodMatch &&
        !typeMatch &&
        !prevDoMatch &&
        !itemProductMatch &&
        !linkedProductMatch
      ) {
        return false;
      }
    }

    return true;
  });

  // Chronologically sort entries by transaction date (newest date first for on-screen ledger table)
  // so late-entered records automatically jump into their correct date position
  const sortedLedgerEntries = [...filteredLedgerEntries].sort((a, b) => {
    const dateA = a.date || '';
    const dateB = b.date || '';
    const dateCmp = dateB.localeCompare(dateA);
    if (dateCmp !== 0) return dateCmp;
    return (b.createdAt || '').localeCompare(a.createdAt || '');
  });

  const totalOutstandingPayable = suppliers.reduce(
    (acc, s) => acc + (s.outstandingPayable || 0),
    0
  );
  const totalPurchasesOverall = Math.max(
    suppliers.reduce((acc, s) => acc + (s.totalPurchases || 0), 0),
    supplierLedger.filter((e) => e.type === 'PURCHASE').reduce((acc, e) => acc + (Number(e.amount) || 0), 0)
  );
  const totalPaidOverall = Math.max(
    suppliers.reduce((acc, s) => acc + (s.totalPaid || 0), 0),
    supplierLedger.filter((e) => e.type === 'PAYMENT').reduce((acc, e) => acc + (Number(e.amount) || 0), 0),
    suppliers.reduce((sum, s) => {
      const rec = supplierLedger
        .filter((e) => (e.supplierId === s.id || (e.supplierName && s.name && e.supplierName.trim().toLowerCase() === s.name.trim().toLowerCase()) || (e.supplierName && s.company && e.supplierName.trim().toLowerCase() === s.company.trim().toLowerCase())) && e.type === 'PAYMENT')
        .reduce((a, e) => a + (Number(e.amount) || 0), 0);
      return sum + Math.max(Number(s.totalPaid) || 0, rec);
    }, 0)
  );
  const totalOpeningBalanceOverall = suppliers.reduce(
    (acc, s) => acc + (s.openingBalance || 0),
    0
  );
  const totalReturnsOverall = supplierLedger
    .filter((e) => e.type === 'RETURN_ADJUSTMENT' || e.type === 'DISCOUNT_CREDIT')
    .reduce((acc, e) => acc + (Number(e.amount) || 0), 0);

  const selectedSupplierPurchases = activeSupplier
    ? Math.max(
        activeSupplier.totalPurchases || 0,
        supplierLedger
          .filter((e) => matchesActiveSupplier(e) && e.type === 'PURCHASE')
          .reduce((acc, e) => acc + (Number(e.amount) || 0), 0)
      )
    : 0;

  const selectedSupplierPaid = activeSupplier
    ? Math.max(
        activeSupplier.totalPaid || 0,
        supplierLedger
          .filter((e) => matchesActiveSupplier(e) && e.type === 'PAYMENT')
          .reduce((acc, e) => acc + (Number(e.amount) || 0), 0)
      )
    : 0;

  const selectedSupplierReturns = activeSupplier
    ? supplierLedger
        .filter((e) => matchesActiveSupplier(e) && (e.type === 'RETURN_ADJUSTMENT' || e.type === 'DISCOUNT_CREDIT'))
        .reduce((acc, e) => acc + (Number(e.amount) || 0), 0)
    : 0;

  // Open Edit Opening D.O. Modal
  const handleOpenEditOpeningDo = () => {
    if (!activeSupplier) return;
    setOpeningDoBalance(activeSupplier.openingBalance ?? 0);
    setOpeningDoDate(activeSupplier.openingDate || getTodayDateString());
    setOpeningDoNotes(activeSupplier.openingNotes || 'হিসাব শুরুর ওপেন ডিও / প্রারম্ভিক বকেয়া');
    setIsOpeningDoModalOpen(true);
  };

  // Save Opening D.O. Modal
  const handleSaveOpeningDo = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeSupplier) return;
    updateSupplierOpeningDue({
      supplierId: activeSupplier.id,
      openingBalance: Number(openingDoBalance) || 0,
      openingDate: openingDoDate,
      openingNotes: openingDoNotes,
    });
    showNotification(
      language === 'bn'
        ? 'কোম্পানির ওপেন ডিও ও প্রারম্ভিক বকেয়া সংরক্ষিত হয়েছে!'
        : 'Company Opening D.O. and initial due updated!'
    );
    setIsOpeningDoModalOpen(false);
  };

  const generateFreshChallanNo = () => {
    let fresh = `CHAL-${Date.now().toString().slice(-6)}`;
    while (supplierLedger.some((e) => e.referenceNo?.toLowerCase() === fresh.toLowerCase())) {
      fresh = `CHAL-${(Date.now() + Math.floor(Math.random() * 900 + 100)).toString().slice(-6)}`;
    }
    return fresh;
  };

  const generateFreshPaymentRef = () => {
    let fresh = `PAY-${Date.now().toString().slice(-6)}`;
    while (supplierLedger.some((e) => e.referenceNo?.toLowerCase() === fresh.toLowerCase())) {
      fresh = `PAY-${(Date.now() + Math.floor(Math.random() * 900 + 100)).toString().slice(-6)}`;
    }
    return fresh;
  };

  const handleOpenAddPurchase = (supplier?: Supplier) => {
    const targetSup = supplier || activeSupplier || suppliers[0];
    if (targetSup) {
      setPurchaseSupplierId(targetSup.id);
    }
    setPurchaseReferenceNo(generateFreshChallanNo());
    setPurchasePreviousDoNo('');
    setPurchasePreviousDoDate('');
    setPurchaseDate(getTodayDateString());
    setPurchaseAmount(0);
    setPurchasePaymentStatus('Unpaid');
    setPurchaseNotes('সাপ্লাই চালান ও পূর্বের ডিও এন্ট্রি');
    setIsPurchaseModalOpen(true);
  };

  const handleSubmitPurchase = (e: React.FormEvent) => {
    e.preventDefault();
    if (!purchaseSupplierId || purchaseAmount <= 0) {
      alert(language === 'bn' ? 'দয়া করে সাপ্লায়ার ও টাকার পরিমাণ সঠিকভাবে পূরণ করুন।' : 'Please enter valid supplier and amount.');
      return;
    }
    const finalChallanNo = purchaseReferenceNo.trim() || generateFreshChallanNo();
    addSupplierPurchase({
      supplierId: purchaseSupplierId,
      amount: purchaseAmount,
      date: purchaseDate,
      referenceNo: finalChallanNo,
      previousDoNo: purchasePreviousDoNo.trim(),
      previousDoDate: purchasePreviousDoDate.trim(),
      paymentStatus: purchasePaymentStatus,
      notes: purchaseNotes,
    });
    setIsPurchaseModalOpen(false);
    setPurchaseAmount(0);
    // Auto-advance to the next unique Challan number for subsequent entry
    setPurchaseReferenceNo(generateFreshChallanNo());
    showNotification(
      language === 'bn'
        ? `সাপ্লাই চালান ও ডিও (#${finalChallanNo}) সফলভাবে সংরক্ষণ করা হয়েছে!`
        : `Supply Challan & D.O. (#${finalChallanNo}) recorded successfully!`
    );
  };

  const handleOpenPayment = (supplier: Supplier) => {
    setSelectedSupplierId(supplier.id);
    setPaymentAmount(supplier.outstandingPayable > 0 ? supplier.outstandingPayable : 0);
    setPaymentDate(getTodayDateString());
    setPaymentRef(generateFreshPaymentRef());
    setIsPaymentModalOpen(true);
  };

  const handleSubmitPayment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeSupplier || paymentAmount <= 0) return;

    const finalPaymentRef = paymentRef.trim() || generateFreshPaymentRef();
    addSupplierPayment(
      activeSupplier.id,
      paymentAmount,
      paymentMethod,
      finalPaymentRef,
      paymentNotes,
      paymentDate
    );

    setIsPaymentModalOpen(false);
    setPaymentAmount(0);
    setPaymentNotes('');
    // Auto-advance to the next unique payment voucher number for subsequent entry
    setPaymentRef(generateFreshPaymentRef());
    showNotification(language === 'bn' ? `সাপ্লায়ার পেমেন্ট ভাউচার (#${finalPaymentRef}) সফলভাবে সম্পন্ন হয়েছে!` : `Payment voucher (#${finalPaymentRef}) recorded successfully!`);
  };

  const handlePrintStatement = () => {
    window.print();
  };

  // Confirm delete of mistaken ledger entry
  const handleConfirmDeleteEntry = () => {
    if (!deletingEntry) return;
    const res = deleteSupplierLedgerEntry(deletingEntry.id, revertBalanceOnDelete);
    if (res.success) {
      showNotification(
        language === 'bn'
          ? `ভুল লেজার এন্ট্রি #${deletingEntry.referenceNo} সফলভাবে ডিলিট করা হয়েছে!`
          : `Ledger entry #${deletingEntry.referenceNo} deleted successfully!`
      );
    }
    setDeletingEntry(null);
  };

  // Open Edit Supplier Modal
  const handleOpenEditSupplier = (sup: Supplier) => {
    setEditingSupplier(sup);
    setSupplierForm({
      name: sup.name,
      company: sup.company,
      phone: sup.phone,
      address: sup.address || '',
      bankDetails: sup.bankDetails || '',
      paymentTerms: sup.paymentTerms || 'Net 15',
      outstandingPayable: sup.outstandingPayable || 0,
      openingBalance: sup.openingBalance ?? sup.outstandingPayable ?? 0,
      openingDate: sup.openingDate || getTodayDateString(),
      openingNotes: sup.openingNotes || 'হিসাব শুরুর ওপেন ডিও / প্রারম্ভিক বকেয়া',
    });
  };

  // Save Supplier (Add or Edit)
  const handleSaveSupplier = (e: React.FormEvent) => {
    e.preventDefault();
    if (!supplierForm.company.trim() || !supplierForm.phone.trim()) return;

    if (editingSupplier) {
      const openingBal = Number(supplierForm.openingBalance) || 0;
      updateSupplierOpeningDue({
        supplierId: editingSupplier.id,
        openingBalance: openingBal,
        openingDate: supplierForm.openingDate,
        openingNotes: supplierForm.openingNotes,
      });
      updateSupplier({
        ...editingSupplier,
        ...supplierForm,
        openingBalance: openingBal,
        openingDate: supplierForm.openingDate,
        openingNotes: supplierForm.openingNotes,
      });
      showNotification(language === 'bn' ? 'সাপ্লায়ার তথ্য ও ওপেন ডিও আপডেট হয়েছে!' : 'Supplier contact & details updated!');
      setEditingSupplier(null);
    } else {
      const newSup = addSupplier({
        ...supplierForm,
        name: supplierForm.name || supplierForm.company,
        outstandingPayable: Number(supplierForm.outstandingPayable || supplierForm.openingBalance || 0),
        openingBalance: Number(supplierForm.openingBalance || supplierForm.outstandingPayable || 0),
        openingDate: supplierForm.openingDate || getTodayDateString(),
        openingNotes: supplierForm.openingNotes || '',
        totalPurchases: Number(supplierForm.outstandingPayable || 0),
      });
      setSelectedSupplierId(newSup.id);
      showNotification(language === 'bn' ? 'নতুন সাপ্লায়ার সফলভাবে যুক্ত হয়েছে!' : 'New supplier added successfully!');
      setIsAddSupplierOpen(false);
    }
  };

  // Confirm Delete Supplier
  const handleConfirmDeleteSupplier = () => {
    if (!deletingSupplier) return;
    deleteSupplier(deletingSupplier.id);
    showNotification(
      language === 'bn'
        ? `সাপ্লায়ার "${deletingSupplier.company}" ডিলিট করা হয়েছে!`
        : `Supplier "${deletingSupplier.company}" deleted successfully!`
    );
    if (selectedSupplierId === deletingSupplier.id) {
      setSelectedSupplierId(suppliers.find((s) => s.id !== deletingSupplier.id)?.id || null);
    }
    setDeletingSupplier(null);
  };

  return (
    <div className="space-y-4 animate-in fade-in duration-200">
      {/* Toast Notification */}
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

      {/* Top Banner */}
      <div className="p-4 rounded-2xl bg-gradient-to-r from-slate-900 via-slate-900 to-indigo-950/40 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-lg">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400 shrink-0">
            <Building2 className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
              <span>{t.supplierLedgerTitle}</span>
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                {suppliers.length} {language === 'bn' ? 'কোম্পানি' : 'Suppliers'}
              </span>
            </h2>
            <p className="text-xs text-slate-400">{t.supplierLedgerSubtitle}</p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0 flex-wrap">
          {currentRole === 'admin' && (
            <button
              onClick={openCompanyPaymentModal}
              id="btn-admin-pay-company"
              className="py-2.5 px-3 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs rounded-xl flex items-center gap-1.5 shadow-lg shadow-amber-950/40 transition active:scale-95 cursor-pointer"
            >
              <DollarSign className="w-4 h-4" />
              <span>{language === 'bn' ? 'কোম্পানিকে পেমেন্ট' : 'Pay Company'}</span>
            </button>
          )}

          <button
            onClick={() => {
              setEditingSupplier(null);
              setSupplierForm({
                name: '',
                company: '',
                phone: '',
                address: '',
                bankDetails: '',
                paymentTerms: 'Net 15',
                outstandingPayable: 0,
                openingBalance: 0,
                openingDate: '',
                openingNotes: '',
              });
              setIsAddSupplierOpen(true);
            }}
            id="btn-open-add-supplier"
            className="py-2.5 px-3 bg-emerald-600/30 hover:bg-emerald-600 text-emerald-300 hover:text-white border border-emerald-500/40 font-bold text-xs rounded-xl flex items-center gap-1.5 shadow-md transition cursor-pointer"
          >
            <PlusCircle className="w-4 h-4" />
            <span>{language === 'bn' ? 'নতুন সাপ্লায়ার' : 'Add Supplier'}</span>
          </button>

          <button
            onClick={() => {
              const res = generateAllSuppliersSummaryPdf(suppliers);
              setPdfPreviewResult(res);
            }}
            id="btn-preview-all-suppliers-pdf"
            className="py-2.5 px-3 bg-slate-800 hover:bg-slate-700 text-indigo-300 border border-slate-700 hover:border-slate-600 font-bold text-xs rounded-xl flex items-center gap-1.5 shadow-md transition active:scale-95 cursor-pointer"
            title="Preview All Suppliers PDF"
          >
            <Eye className="w-4 h-4 text-indigo-400" />
            <span className="hidden sm:inline">{language === 'bn' ? 'সকল সাপ্লায়ার প্রিভিউ' : 'Preview All'}</span>
            <span className="sm:hidden">{language === 'bn' ? 'প্রিভিউ' : 'Preview'}</span>
          </button>

          <button
            onClick={() => generateAllSuppliersSummaryPdf(suppliers).download()}
            id="btn-export-all-suppliers-pdf"
            className="py-2.5 px-3 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 shadow-md transition active:scale-95 cursor-pointer"
            title={t.exportAllSuppliersPdf}
          >
            <Download className="w-4 h-4" />
            <span className="hidden sm:inline">{language === 'bn' ? 'ডাউনলোড' : 'Download'}</span>
            <span className="sm:hidden">PDF</span>
          </button>

          <button
            onClick={onOpenScannerModal}
            className="py-2.5 px-3.5 bg-gradient-to-r from-rose-600 to-amber-600 hover:from-rose-500 hover:to-amber-500 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 shadow-lg shadow-rose-950/40 transition active:scale-95"
          >
            <Sparkles className="w-4 h-4" />
            <span>{t.scanAI}</span>
          </button>
        </div>
      </div>

      {/* KPI Overview */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
        <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800">
          <span className="text-[10px] uppercase font-bold text-rose-400 flex items-center gap-1">
            <ArrowDownLeft className="w-3.5 h-3.5 text-rose-400" />
            {t.totalPayableToSuppliers}
          </span>
          <p className="text-lg sm:text-xl font-extrabold text-rose-400 font-mono-num mt-1">
            {formatCurrency(totalOutstandingPayable, language)}
          </p>
          <span className="text-[10px] text-slate-400">
            {language === 'bn' ? 'কোম্পানিকে অপরিশোধিত মোট দেনা' : 'Total wholesale accounts payable'}
          </span>
        </div>

        <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800">
          <span className="text-[10px] uppercase font-bold text-slate-400 flex items-center gap-1">
            <CreditCard className="w-3.5 h-3.5 text-indigo-400" />
            {t.totalPurchasesDone}
          </span>
          <p className="text-lg sm:text-xl font-extrabold text-white font-mono-num mt-1">
            {formatCurrency(totalPurchasesOverall, language)}
          </p>
          <span className="text-[10px] text-slate-400">
            {language === 'bn' ? 'সকল সাপ্লায়ার থেকে মোট মালামাল ক্রয়' : 'Cumulative supplier purchases'}
          </span>
        </div>

        <div className="p-3.5 rounded-xl bg-slate-900/80 border border-emerald-500/30 bg-emerald-950/20">
          <span className="text-[10px] uppercase font-bold text-emerald-400 flex items-center gap-1">
            <DollarSign className="w-3.5 h-3.5 text-emerald-400" />
            {language === 'bn' ? 'মোট কোম্পানি পরিশোধ' : 'Total Paid to Companies'}
          </span>
          <p className="text-lg sm:text-xl font-extrabold text-emerald-400 font-mono-num mt-1">
            {formatCurrency(totalPaidOverall, language)}
          </p>
          <span className="text-[10px] text-emerald-300/80">
            {language === 'bn' ? 'সকল কোম্পানিকে মোট চালান পরিশোধ' : 'All-time supplier payments disbursed'}
          </span>
        </div>
      </div>

      {/* Main Grid: Supplier List (Left) + Detailed Statement & Search (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Supplier List Selector */}
        <div className="lg:col-span-5 space-y-3">
          {/* Search Supplier Bar */}
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              id="input-search-suppliers-list"
              placeholder={language === 'bn' ? 'সাপ্লায়ার কোম্পানি বা ফোন খুঁজুন...' : 'Search supplier company or phone...'}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-8 py-2 bg-slate-900 border border-slate-800 focus:border-indigo-500 rounded-xl text-xs text-white placeholder:text-slate-500 focus:outline-none transition shadow-inner"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-2.5 top-2 p-1 text-slate-400 hover:text-white"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <div className="space-y-2 max-h-[520px] overflow-y-auto pr-1">
            {filteredSuppliers.length === 0 ? (
              <div className="p-6 rounded-xl bg-slate-900/60 border border-slate-800 text-center text-xs text-slate-400">
                {language === 'bn' ? 'কোনো সাপ্লায়ার পাওয়া যায়নি।' : 'No suppliers match your search.'}
              </div>
            ) : (
              filteredSuppliers.map((supplier) => {
                const isSelected = selectedSupplierId === supplier.id && viewScope === 'SELECTED';

                return (
                  <div
                    key={supplier.id}
                    onClick={() => {
                      setSelectedSupplierId(supplier.id);
                      setViewScope('SELECTED');
                    }}
                    className={`p-3.5 rounded-xl border transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-slate-800/90 border-indigo-500/60 shadow-md ring-1 ring-indigo-500/30'
                        : 'bg-slate-900/70 border-slate-800 hover:border-slate-700 hover:bg-slate-800/50'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <h4 className="font-bold text-xs sm:text-sm text-white truncate">
                          {supplier.company}
                        </h4>
                        <p className="text-[11px] text-slate-400 truncate mt-0.5">
                          {supplier.name}
                        </p>
                        <div className="flex items-center gap-1.5 text-[10px] text-slate-400 mt-1">
                          <Phone className="w-3 h-3 text-indigo-400" />
                          <span className="font-mono">{supplier.phone}</span>
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <span className="text-[10px] text-slate-400">{t.due}</span>
                        <p
                          className={`text-xs sm:text-sm font-extrabold font-mono-num ${
                            supplier.outstandingPayable > 0 ? 'text-rose-400' : 'text-emerald-400'
                          }`}
                        >
                          {formatCurrency(supplier.outstandingPayable, language)}
                        </p>
                        <div className="flex items-center gap-1 mt-1 justify-end">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleOpenEditSupplier(supplier);
                            }}
                            className="p-1 text-slate-400 hover:text-indigo-300 hover:bg-slate-700 rounded transition"
                            title="Edit Supplier"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>

                          {currentRole === 'admin' && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleOpenPayment(supplier);
                              }}
                              className="px-2 py-0.5 bg-indigo-600/30 hover:bg-indigo-600 text-indigo-300 hover:text-white border border-indigo-500/40 rounded text-[10px] font-semibold transition"
                            >
                              {t.makePayment}
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right Details Panel: Active Statement & Ledger Entries */}
        <div className="lg:col-span-7 space-y-3">
          {activeSupplier ? (
            <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-4 shadow-lg">
              {/* Active Supplier Header Bar with Edit & Delete */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-base font-bold text-white">
                      {viewScope === 'SELECTED' ? activeSupplier.company : (language === 'bn' ? 'সকল সাপ্লায়ার ও ভেন্ডর' : 'All Vendors')}
                    </h3>
                    <span className="text-[10px] px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 font-semibold">
                      {viewScope === 'SELECTED'
                        ? (language === 'bn' ? 'সাপ্লায়ার খাতা' : 'Ledger Account')
                        : (language === 'bn' ? 'সকল ভেন্ডর' : 'All Vendors')}
                    </span>
                  </div>
                  {viewScope === 'SELECTED' ? (
                    <>
                      <p className="text-xs text-slate-400 mt-0.5">
                        {activeSupplier.name} • {activeSupplier.address} • 📞 <span className="font-mono text-indigo-300">{activeSupplier.phone}</span>
                      </p>
                      {activeSupplier.bankDetails && (
                        <p className="text-[11px] font-mono text-emerald-400 mt-0.5">
                          {activeSupplier.bankDetails}
                        </p>
                      )}
                    </>
                  ) : (
                    <p className="text-xs text-slate-400 mt-0.5">
                      {language === 'bn'
                        ? 'সকল সাপ্লায়ার ও ভেন্ডরের ক্রয় এবং পেমেন্ট ভাউচার অনুসন্ধান'
                        : 'Search and filter purchases and payment vouchers across all vendors'}
                    </p>
                  )}
                </div>

                <div className="flex items-center gap-1.5 sm:gap-2 no-print shrink-0 flex-wrap">
                  {viewScope === 'SELECTED' && (
                    <>
                      <button
                        onClick={() => handleOpenEditSupplier(activeSupplier)}
                        className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-xl border border-slate-700 transition text-xs flex items-center gap-1"
                        title="Edit Supplier Details / Phone"
                      >
                        <Edit2 className="w-3.5 h-3.5 text-emerald-400" />
                        <span className="hidden sm:inline">{language === 'bn' ? 'এডিট' : 'Edit'}</span>
                      </button>

                      <button
                        onClick={() => setDeletingSupplier(activeSupplier)}
                        className="p-2 bg-rose-600/20 hover:bg-rose-600 text-rose-300 hover:text-white rounded-xl border border-rose-500/30 transition text-xs flex items-center gap-1"
                        title="Delete Supplier"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">{language === 'bn' ? 'মুছুন' : 'Delete'}</span>
                      </button>
                    </>
                  )}

                  <button
                    onClick={() => {
                      const res = generateSupplierLedgerPdf(activeSupplier, filteredLedgerEntries, suppliers);
                      setPdfPreviewResult(res);
                    }}
                    id="btn-preview-single-supplier-pdf"
                    className="p-2 bg-slate-800 hover:bg-slate-700 text-indigo-300 hover:text-white rounded-xl border border-slate-700 transition text-xs flex items-center gap-1.5 active:scale-95 cursor-pointer"
                    title="Preview Supplier Ledger PDF"
                  >
                    <Eye className="w-3.5 h-3.5 text-indigo-400" />
                    <span className="hidden sm:inline">{language === 'bn' ? 'প্রিভিউ' : 'Preview'}</span>
                  </button>

                  <button
                    onClick={() => generateSupplierLedgerPdf(activeSupplier, filteredLedgerEntries, suppliers).download()}
                    id="btn-export-single-supplier-pdf"
                    className="p-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl transition text-xs flex items-center gap-1.5 active:scale-95 shadow cursor-pointer"
                    title={t.exportLedgerPdf}
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">{language === 'bn' ? 'ডাউনলোড' : 'Download'}</span>
                    <span className="sm:hidden">PDF</span>
                  </button>

                  <button
                    onClick={handlePrintStatement}
                    className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl border border-slate-700 transition text-xs flex items-center gap-1.5"
                    title="Print Supplier Memo"
                  >
                    <Printer className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">{t.print}</span>
                  </button>

                  {currentRole === 'admin' && (
                    <>
                      <button
                        onClick={() => handleOpenAddPurchase(activeSupplier)}
                        id="btn-add-supplier-purchase"
                        className="py-2 px-3 bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 shadow-md transition active:scale-95 cursor-pointer"
                        title={language === 'bn' ? 'সাপ্লাই চালান ও পূর্বের ডিও এন্ট্রি' : 'Add Supply Challan & D.O.'}
                      >
                        <PlusCircle className="w-3.5 h-3.5" />
                        <span>{language === 'bn' ? '+ চালান / ডিও' : '+ Challan / D.O.'}</span>
                      </button>

                      <button
                        onClick={() => handleOpenPayment(activeSupplier)}
                        className="py-2 px-3.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 shadow-md transition active:scale-95"
                      >
                        <DollarSign className="w-3.5 h-3.5" />
                        <span>{t.makePayment}</span>
                      </button>
                    </>
                  )}
                </div>
              </div>

              {/* View Scope Toggle: Active Supplier vs All Suppliers */}
              <div className="flex items-center justify-between gap-2 p-1.5 bg-slate-950/70 rounded-xl border border-slate-800 text-xs">
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setViewScope('SELECTED')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                      viewScope === 'SELECTED'
                        ? 'bg-indigo-600 text-white shadow-sm'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <UserCheck className="w-3.5 h-3.5" />
                    <span>{activeSupplier.company}</span>
                  </button>

                  <button
                    onClick={() => setViewScope('ALL')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                      viewScope === 'ALL'
                        ? 'bg-indigo-600 text-white shadow-sm'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <Layers className="w-3.5 h-3.5" />
                    <span>{language === 'bn' ? 'সকল সাপ্লায়ার খাতা' : 'All Vendors Log'}</span>
                  </button>
                </div>

                {viewScope === 'SELECTED' && (
                  <span className="text-[11px] text-slate-400 font-medium hidden sm:inline pr-2">
                    {t.due}: <strong className="text-rose-400 font-mono-num">{formatCurrency(activeSupplier.outstandingPayable, language)}</strong>
                  </span>
                )}
              </div>

              {/* Outstanding Balance & Opening D.O. Overview (When in Single Supplier mode) */}
              {viewScope === 'SELECTED' && activeSupplier && (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {/* Card 1: Official Opening D.O. / Initial Due */}
                  <div className="p-3 rounded-xl bg-amber-950/30 border border-amber-800/40 flex flex-col justify-between shadow-inner">
                    <div className="flex items-center justify-between gap-1">
                      <span className="text-[10px] uppercase font-bold text-amber-300 flex items-center gap-1">
                        <span>🏢</span>
                        <span>{language === 'bn' ? 'হিসাব শুরুর ওপেন ডিও' : 'Opening D.O. Due'}</span>
                      </span>
                      <button
                        type="button"
                        onClick={handleOpenEditOpeningDo}
                        className="px-2 py-0.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 text-[10px] font-bold transition flex items-center gap-1 active:scale-95"
                        title={language === 'bn' ? 'ওপেন ডিও ও তারিখ এডিট করুন' : 'Edit Opening D.O.'}
                      >
                        <Edit3 className="w-3 h-3" />
                        <span>{language === 'bn' ? 'এডিট' : 'Edit'}</span>
                      </button>
                    </div>
                    <div className="mt-2">
                      <p className="text-lg sm:text-xl font-extrabold text-amber-400 font-mono-num">
                        {formatCurrency(activeSupplier.openingBalance ?? 0, language)}
                      </p>
                      <div className="text-[10px] text-slate-400 flex items-center gap-1 mt-0.5 font-mono">
                        <Calendar className="w-3 h-3 text-amber-400/80" />
                        <span>{activeSupplier.openingDate || 'প্রারম্ভিক'}</span>
                      </div>
                      {activeSupplier.openingNotes && (
                        <p className="text-[10px] text-slate-400 truncate mt-0.5" title={activeSupplier.openingNotes}>
                          📝 {activeSupplier.openingNotes}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Card 2: Purchases, Returns & Payments Breakdown */}
                  <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800 flex flex-col justify-between">
                    <span className="text-[10px] uppercase font-bold text-slate-400">
                      {language === 'bn' ? 'ক্রয়, রিপ্লেস ফেরত ও পরিশোধ' : 'Purchases, Returns & Paid'}
                    </span>
                    <div className="mt-2 space-y-1 font-mono">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-slate-300 font-sans">{language === 'bn' ? '১. মোট ক্রয় (+):' : '1. Purchases (+):'}</span>
                        <span className="font-bold text-slate-100 font-mono-num">{formatCurrency(selectedSupplierPurchases, language)}</span>
                      </div>
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-sky-400 font-sans">{language === 'bn' ? '২. কোম্পানি ফেরত (-):' : '2. Returns (-):'}</span>
                        <span className="font-bold text-sky-400 font-mono-num">-{formatCurrency(selectedSupplierReturns, language)}</span>
                      </div>
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-emerald-400 font-sans">{language === 'bn' ? '৩. ক্যাশ পরিশোধ (-):' : '3. Paid (-):'}</span>
                        <span className="font-bold text-emerald-400 font-mono-num">-{formatCurrency(selectedSupplierPaid, language)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Card 3: Current Net Outstanding Balance */}
                  <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800 flex flex-col justify-between">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] uppercase font-bold text-slate-400">
                        {language === 'bn' ? '৪. বর্তমান মোট ডিউ (বকেয়া দেনা)' : '4. Current Due Payable'}
                      </span>
                      {currentRole === 'admin' && (
                        <button
                          type="button"
                          onClick={() => handleOpenEditSupplier(activeSupplier)}
                          className="px-1.5 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px] transition flex items-center gap-1"
                          title="Supplier info & balance adjust"
                        >
                          <Edit3 className="w-2.5 h-2.5" />
                          <span>{language === 'bn' ? 'সংশোধন' : 'Adjust'}</span>
                        </button>
                      )}
                    </div>
                    <div className="mt-2">
                      <p className={`text-lg sm:text-xl font-extrabold font-mono-num ${activeSupplier.outstandingPayable > 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
                        {formatCurrency(activeSupplier.outstandingPayable, language)}
                      </p>
                      <p className="text-[10px] text-slate-500 mt-0.5">
                        {language === 'bn' ? '= ওপেন ডিও + মোট ক্রয় - কোম্পানি ফেরত - পরিশোধ' : '= Opening + Purchases - Returns - Paid'}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Outstanding Balance & Consolidated Overview (When in All Suppliers mode) */}
              {viewScope === 'ALL' && (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {/* Card 1: Combined Opening D.O. Due */}
                  <div className="p-3 rounded-xl bg-amber-950/30 border border-amber-800/40 flex flex-col justify-between shadow-inner">
                    <span className="text-[10px] uppercase font-bold text-amber-300 flex items-center gap-1">
                      <span>🏢</span>
                      <span>{language === 'bn' ? 'সকল কোম্পানির ওপেন ডিও' : 'All Opening D.O. Due'}</span>
                    </span>
                    <div className="mt-2">
                      <p className="text-lg sm:text-xl font-extrabold text-amber-400 font-mono-num">
                        {formatCurrency(totalOpeningBalanceOverall, language)}
                      </p>
                      <p className="text-[10px] text-slate-400 mt-0.5">
                        {suppliers.length} {language === 'bn' ? 'টি কোম্পানির প্রারম্ভিক দেনা' : 'vendors opening balance'}
                      </p>
                    </div>
                  </div>

                  {/* Card 2: Combined Purchases, Returns & Paid */}
                  <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800 flex flex-col justify-between">
                    <span className="text-[10px] uppercase font-bold text-slate-400">
                      {language === 'bn' ? 'মোট ক্রয়, ফেরত ও পরিশোধ (সকল)' : 'Total Purchases, Returns & Paid'}
                    </span>
                    <div className="mt-2 space-y-1 font-mono">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-slate-300 font-sans">{language === 'bn' ? '১. মোট ক্রয় (+):' : '1. Purchases (+):'}</span>
                        <span className="font-bold text-slate-100 font-mono-num">{formatCurrency(totalPurchasesOverall, language)}</span>
                      </div>
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-sky-400 font-sans">{language === 'bn' ? '২. কোম্পানি ফেরত (-):' : '2. Returns (-):'}</span>
                        <span className="font-bold text-sky-400 font-mono-num">-{formatCurrency(totalReturnsOverall, language)}</span>
                      </div>
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-emerald-400 font-sans">{language === 'bn' ? '৩. মোট পরিশোধ (-):' : '3. Total Paid (-):'}</span>
                        <span className="font-bold text-emerald-400 font-mono-num">-{formatCurrency(totalPaidOverall, language)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Card 3: Total Company Outstanding Due */}
                  <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800 flex flex-col justify-between">
                    <span className="text-[10px] uppercase font-bold text-slate-400">
                      {language === 'bn' ? '৪. কোম্পানিকে বর্তমান মোট বকেয়া দেনা' : '4. Total Current Accounts Payable'}
                    </span>
                    <div className="mt-2">
                      <p className={`text-lg sm:text-xl font-extrabold font-mono-num ${totalOutstandingPayable > 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
                        {formatCurrency(totalOutstandingPayable, language)}
                      </p>
                      <p className="text-[10px] text-slate-500 mt-0.5">
                        {language === 'bn' ? '= সকল কোম্পানির নিট পাওনা' : '= Total net vendor balance'}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Search Bar for Transactions / Ledger Entries */}
              <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 space-y-2.5">
                <div className="flex flex-col sm:flex-row gap-2 items-stretch sm:items-center">
                  <div className="relative flex-1">
                    <Search className="w-4 h-4 text-indigo-400 absolute left-3 top-2.5 pointer-events-none" />
                    <input
                      type="text"
                      id="input-search-supplier-ledger"
                      value={txnSearchQuery}
                      onChange={(e) => setTxnSearchQuery(e.target.value)}
                      placeholder={
                        viewScope === 'ALL'
                          ? (language === 'bn' ? 'চালান নং, সাপ্লায়ার, প্রোডাক্টের নাম বা টাকার পরিমাণ দিয়ে খুঁজুন...' : 'Search by challan #, supplier, product name, or amount...')
                          : (language === 'bn' ? 'চালান নং, প্রোডাক্টের নাম, টাকার পরিমাণ বা মন্তব্য দিয়ে খুঁজুন...' : 'Search by challan #, product name, amount, or notes...')
                      }
                      className="w-full pl-9 pr-8 py-2 bg-slate-900 border border-slate-800 hover:border-slate-700 focus:border-indigo-500 rounded-xl text-xs text-white placeholder:text-slate-500 focus:outline-none transition shadow-inner"
                    />
                    {txnSearchQuery && (
                      <button
                        onClick={() => setTxnSearchQuery('')}
                        className="absolute right-2.5 top-2 p-0.5 text-slate-400 hover:text-white"
                        title="Clear search"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  {/* Date Filter */}
                  <div className="flex items-center gap-1.5 shrink-0">
                    <div className="relative">
                      <input
                        type="date"
                        value={txnDateFilter}
                        onChange={(e) => setTxnDateFilter(e.target.value)}
                        className="px-2.5 py-1.5 bg-slate-900 border border-slate-700 rounded-xl text-white font-mono text-xs focus:outline-none focus:border-indigo-500"
                      />
                    </div>
                    {txnDateFilter && (
                      <button
                        onClick={() => setTxnDateFilter('')}
                        className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs"
                        title="Clear date"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  {/* Type Filter Tabs */}
                  <div className="flex items-center gap-1 overflow-x-auto shrink-0">
                    {(['ALL', 'PURCHASE', 'PAYMENT', 'RETURN_ADJUSTMENT'] as const).map((type) => (
                      <button
                        key={type}
                        onClick={() => setTypeFilter(type)}
                        className={`px-2.5 py-1.5 rounded-lg text-[11px] font-bold transition whitespace-nowrap ${
                          typeFilter === type
                            ? 'bg-slate-800 text-indigo-300 border border-slate-700 shadow-sm'
                            : 'text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        {type === 'ALL' && (language === 'bn' ? 'সকল এন্ট্রি' : 'All')}
                        {type === 'PURCHASE' && (language === 'bn' ? 'ক্রয়' : 'Purchases')}
                        {type === 'PAYMENT' && (language === 'bn' ? 'পেমেন্ট' : 'Payments')}
                        {type === 'RETURN_ADJUSTMENT' && (language === 'bn' ? 'ফেরত' : 'Returns')}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Filter info indicator & date presets */}
                <div className="flex items-center justify-between text-[11px] text-slate-400 px-0.5 flex-wrap gap-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span>
                      {language === 'bn' ? 'প্রদর্শিত লেনদেন:' : 'Showing:'}{' '}
                      <strong className="text-white font-mono-num">{filteredLedgerEntries.length}</strong> / {baseLedgerEntries.length}{' '}
                      {language === 'bn' ? 'টি এন্ট্রি' : 'entries'}
                    </span>
                    {txnSearchQuery && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 text-[10px]">
                        <Search className="w-3 h-3" />
                        &ldquo;{txnSearchQuery}&rdquo;
                      </span>
                    )}
                    {txnDateFilter && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-purple-500/10 text-purple-300 border border-purple-500/20 text-[10px] font-mono">
                        <Calendar className="w-3 h-3" />
                        {formatDate(txnDateFilter, language)}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => setTxnDateFilter(getTodayDateString())}
                        className={`text-[10px] px-2 py-0.5 rounded font-bold transition ${
                          txnDateFilter === getTodayDateString() ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-400 hover:text-white'
                        }`}
                      >
                        {language === 'bn' ? 'আজ' : 'Today'}
                      </button>
                      <button
                        type="button"
                        onClick={() => setTxnDateFilter(getYesterdayDateString())}
                        className={`text-[10px] px-2 py-0.5 rounded font-bold transition ${
                          txnDateFilter === getYesterdayDateString() ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-400 hover:text-white'
                        }`}
                      >
                        {language === 'bn' ? 'গতকাল' : 'Yesterday'}
                      </button>
                    </div>

                    {(txnSearchQuery || txnDateFilter || typeFilter !== 'ALL') && (
                      <button
                        onClick={() => {
                          setTxnSearchQuery('');
                          setTxnDateFilter('');
                          setTypeFilter('ALL');
                        }}
                        className="text-slate-400 hover:text-rose-300 text-[11px] underline underline-offset-2 flex items-center gap-1 transition"
                      >
                        <RotateCcw className="w-3 h-3" />
                        {language === 'bn' ? 'রিসেট' : 'Reset'}
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Transactions Table with Delete Action */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-slate-300">
                    {language === 'bn' ? 'লেনদেন ও চালান বিবরণী (ভুল এন্ট্রি হলে ডিলিট করতে পারেন)' : 'Ledger Entries (Delete wrong entries if mistaken)'}
                  </h4>
                </div>

                <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-950/50">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-800/80 text-slate-400 text-[11px] border-b border-slate-800">
                      <tr>
                        <th className="py-2.5 px-3">{t.date}</th>
                        {viewScope === 'ALL' && (
                          <th className="py-2.5 px-2">{language === 'bn' ? 'সাপ্লায়ার' : 'Vendor'}</th>
                        )}
                        <th className="py-2.5 px-2">{t.transactionType}</th>
                        <th className="py-2.5 px-2">Ref / Memo #</th>
                        <th className="py-2.5 px-2 text-slate-300">{language === 'bn' ? 'বিবরণ ও রেফারেন্স' : 'Details & Ref'}</th>
                        <th className="py-2.5 px-2 text-right">{language === 'bn' ? 'ডেবিট / ক্রেডিট' : t.amount}</th>
                        <th className="py-2.5 px-3 text-right">{t.balanceAfter}</th>
                        <th className="py-2.5 px-2 text-center">{language === 'bn' ? 'অ্যাকশন' : 'Action'}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60">
                      {/* Official Opening D.O. Anchor Row */}
                      {viewScope === 'SELECTED' && activeSupplier && (
                        <tr className="bg-amber-950/20 hover:bg-amber-950/30 transition border-b border-amber-800/30">
                          <td className="py-2.5 px-3 whitespace-nowrap text-amber-300 font-mono text-xs">
                            {activeSupplier.openingDate || 'প্রারম্ভিক'}
                          </td>
                          <td className="py-2.5 px-2">
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                              🏢 {language === 'bn' ? 'ওপেন ডিও' : 'Opening D.O.'}
                            </span>
                          </td>
                          <td className="py-2.5 px-2 font-mono text-[11px] text-amber-300 font-bold">
                            OPENING-DO
                          </td>
                          <td className="py-2.5 px-2 text-[11px] text-slate-300">
                            <span>{activeSupplier.openingNotes || (language === 'bn' ? 'হিসাব শুরুর ওপেন ডিও / প্রারম্ভিক বকেয়া' : 'Initial Opening Balance')}</span>
                          </td>
                          <td className="py-2.5 px-2 text-right font-mono-num font-bold text-amber-400 whitespace-nowrap">
                            + {formatCurrency(activeSupplier.openingBalance ?? 0, language)}
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono-num font-bold text-amber-300 whitespace-nowrap">
                            {formatCurrency(activeSupplier.openingBalance ?? 0, language)}
                          </td>
                          <td className="py-2.5 px-2 text-center">
                            <button
                              type="button"
                              onClick={handleOpenEditOpeningDo}
                              className="p-1.5 text-amber-400 hover:text-amber-200 hover:bg-amber-900/40 rounded-lg transition"
                              title={language === 'bn' ? 'ওপেন ডিও এডিট করুন' : 'Edit Opening D.O.'}
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      )}

                      {filteredLedgerEntries.length === 0 ? (
                        <tr>
                          <td colSpan={viewScope === 'ALL' ? 8 : 7} className="py-8 text-center text-slate-500 text-xs space-y-2">
                            <Search className="w-5 h-5 mx-auto text-slate-600 mb-1" />
                            <p>
                              {txnSearchQuery
                                ? language === 'bn'
                                  ? `"${txnSearchQuery}" এর সাথে মিলে এমন কোনো লেনদেন রেকর্ড পাওয়া যায়নি।`
                                  : `No ledger transactions matching "${txnSearchQuery}".`
                                : language === 'bn'
                                ? 'এই ফিল্টারে কোনো লেনদেন রেকর্ড নেই।'
                                : 'No ledger history recorded for this criteria.'}
                            </p>
                          </td>
                        </tr>
                      ) : (
                        sortedLedgerEntries.map((entry) => {
                          const isPurchase = entry.type === 'PURCHASE';
                          const isPayment = entry.type === 'PAYMENT';
                          const supplierInfo = suppliers.find((s) => s.id === entry.supplierId);

                          return (
                            <tr key={entry.id} className="hover:bg-slate-800/30 transition">
                              <td className="py-2.5 px-3 whitespace-nowrap text-slate-300 font-mono">
                                {entry.date}
                              </td>
                              {viewScope === 'ALL' && (
                                <td className="py-2.5 px-2 font-semibold text-slate-200 max-w-[120px] truncate">
                                  {entry.supplierName || supplierInfo?.company || supplierInfo?.name}
                                </td>
                              )}
                              <td className="py-2.5 px-2">
                                <span
                                  className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                    isPurchase
                                      ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                                      : isPayment
                                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                                      : 'bg-sky-500/20 text-sky-300 border border-sky-500/30'
                                  }`}
                                >
                                  {isPurchase && <ArrowDownLeft className="w-3 h-3" />}
                                  {isPayment && <ArrowUpRight className="w-3 h-3" />}
                                  {entry.type}
                                </span>
                              </td>
                              <td className="py-2.5 px-2 font-mono text-[11px] text-slate-300">
                                <div className="font-bold">{entry.referenceNo}</div>
                                {entry.scannedByName && (
                                  <div className="mt-0.5 inline-flex items-center gap-1 text-[10px] text-sky-400 bg-sky-950/60 px-1.5 py-0.5 rounded border border-sky-800/40">
                                    <span>{entry.scannedByRole === 'dsr' ? '🚚 ডিএসআর:' : entry.scannedByRole === 'counter' ? '🖥️ কাউন্টার:' : '👑 অ্যাডমিন:'}</span>
                                    <span className="font-semibold text-slate-200">{entry.scannedByName}</span>
                                  </div>
                                )}
                              </td>
                              {/* বিবরণ ও রেফারেন্স (পূর্বের ডিও থাকলে রেফারেন্স হিসেবে প্রদর্শন) */}
                              <td className="py-2.5 px-2 text-[11px] text-slate-300 max-w-[220px]">
                                {entry.previousDoNo && (
                                  <div className="inline-flex items-center gap-1 font-mono text-[10px] text-amber-300 bg-amber-950/50 px-1.5 py-0.5 rounded border border-amber-800/40 mr-1.5 mb-0.5">
                                    <FileText className="w-2.5 h-2.5 text-amber-400" />
                                    <span>ডিও #{entry.previousDoNo}</span>
                                    {entry.previousDoDate && <span className="text-slate-400 font-mono">({entry.previousDoDate})</span>}
                                  </div>
                                )}
                                {Array.isArray(entry.items) && entry.items.length > 0 && (
                                  <div
                                    className="text-[10px] text-emerald-300 font-semibold truncate mb-0.5 bg-emerald-950/40 px-1.5 py-0.5 rounded border border-emerald-800/30"
                                    title={entry.items.map((it) => `${it.name} (${it.quantity})`).join(', ')}
                                  >
                                    📦 {entry.items.map((it) => `${it.name} (${it.quantity})`).join(', ')}
                                  </div>
                                )}
                                <span className="text-slate-400 truncate block" title={entry.notes || ''}>
                                  {entry.notes || '-'}
                                </span>
                              </td>
                              <td
                                className={`py-2.5 px-2 text-right font-mono-num font-bold whitespace-nowrap ${
                                  isPurchase ? 'text-rose-400' : 'text-emerald-400'
                                }`}
                              >
                                {isPurchase ? '+' : '-'} {formatCurrency(entry.amount, language)}
                              </td>
                              <td className="py-2.5 px-3 text-right font-mono-num font-bold text-white whitespace-nowrap">
                                {formatCurrency(entry.balanceAfter, language)}
                              </td>
                              <td className="py-2.5 px-2 text-center whitespace-nowrap">
                                <div className="flex items-center justify-center gap-1">
                                  {isPurchase && (
                                    <button
                                      type="button"
                                      onClick={() => setEditingChallan(entry)}
                                      className="p-1.5 text-slate-400 hover:text-amber-400 hover:bg-amber-500/10 rounded-lg transition cursor-pointer"
                                      title={language === 'bn' ? 'চালান ও স্টক এডিট করুন' : 'Edit Challan & Stock'}
                                    >
                                      <Edit2 className="w-3.5 h-3.5" />
                                    </button>
                                  )}
                                  <button
                                    type="button"
                                    onClick={() => {
                                      if (isPurchase) {
                                        setDeletingChallan(entry);
                                      } else {
                                        setDeletingEntry(entry);
                                      }
                                    }}
                                    className="p-1.5 text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition cursor-pointer"
                                    title={isPurchase ? (language === 'bn' ? 'চালান ডিলিট ও স্টক মাইনাস' : 'Delete Challan & Deduct Stock') : 'Delete Wrong Entry'}
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          ) : (
            <div className="p-8 text-center text-slate-400 bg-slate-900 rounded-2xl border border-slate-800 text-xs">
              {language === 'bn' ? 'লেজার হিসাব দেখতে বাম পাশ থেকে সাপ্লায়ার নির্বাচন করুন।' : 'Select a supplier to view detailed ledger statements.'}
            </div>
          )}
        </div>
      </div>

      {/* MODAL: ADD PURCHASE / SUPPLY CHALLAN WITH D.O. */}
      {isPurchaseModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl">
            <div className="p-4 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <PlusCircle className="w-5 h-5 text-amber-400" />
                <h3 className="font-bold text-slate-100 text-sm sm:text-base">
                  {language === 'bn' ? 'সাপ্লাই চালান ও পূর্বের ডিও এন্ট্রি' : 'Add Supply Challan & Prev D.O.'}
                </h3>
              </div>
              <button
                onClick={() => setIsPurchaseModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitPurchase} className="p-4 space-y-3.5">
              <div>
                <label className="text-[10px] uppercase font-bold text-slate-400">
                  {language === 'bn' ? 'সাপ্লায়ার নির্বাচন করুন' : 'Select Supplier'}
                </label>
                <select
                  value={purchaseSupplierId}
                  onChange={(e) => setPurchaseSupplierId(e.target.value)}
                  className="w-full mt-1 bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
                  required
                >
                  {suppliers.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.company || s.name} ({s.name})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* রেফারেন্স / চালান নং */}
                <div>
                  <div className="flex items-center justify-between">
                    <label className="text-[10px] uppercase font-bold text-sky-400 flex items-center gap-1">
                      <FileText className="w-3 h-3" />
                      <span>{language === 'bn' ? 'চালান / রেফারেন্স নং' : 'Challan / Reference #'}</span>
                    </label>
                    <span className="text-[9px] text-sky-400 font-mono">
                      {language === 'bn' ? 'অটো-ইউনিক' : 'Auto-Unique'}
                    </span>
                  </div>
                  <div className="relative flex items-center mt-1">
                    <input
                      type="text"
                      value={purchaseReferenceNo}
                      onChange={(e) => setPurchaseReferenceNo(e.target.value)}
                      required
                      placeholder="e.g. CHAL-20260901"
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 pr-8 text-xs font-mono font-bold text-white focus:outline-none focus:border-sky-500"
                    />
                    <button
                      type="button"
                      onClick={() => setPurchaseReferenceNo(generateFreshChallanNo())}
                      title={language === 'bn' ? 'পরবর্তী নতুন চালান নম্বর নিন' : 'Generate next challan number'}
                      className="absolute right-2 text-slate-400 hover:text-sky-400 p-1 transition-colors"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* চালান তারিখ */}
                <div>
                  <div className="flex items-center justify-between">
                    <label className="text-[10px] uppercase font-bold text-slate-400 flex items-center gap-1">
                      <Calendar className="w-3 h-3 text-slate-400" />
                      <span>{language === 'bn' ? 'চালান তারিখ' : 'Challan Date'}</span>
                    </label>
                    <button
                      type="button"
                      onClick={() => setPurchaseDate(getTodayDateString())}
                      className="text-[9px] text-amber-400 hover:underline cursor-pointer"
                    >
                      {language === 'bn' ? 'আজ' : 'Today'}
                    </button>
                  </div>
                  <input
                    type="date"
                    value={purchaseDate}
                    onChange={(e) => setPurchaseDate(e.target.value)}
                    required
                    className="w-full mt-1 bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              {/* পূর্বের ডিও নং এবং পূর্বের ডিও তারিখ (রেফারেন্সের ঠিক পরেই) */}
              <div className="p-3 rounded-xl bg-amber-950/20 border border-amber-500/30 space-y-2.5">
                <div className="flex items-center gap-1.5 text-xs font-bold text-amber-300">
                  <FileText className="w-3.5 h-3.5 text-amber-400" />
                  <span>{language === 'bn' ? 'পূর্বের ডিও (Delivery Order) তথ্য' : 'Previous D.O. Details'}</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <div>
                    <label className="text-[10px] uppercase font-bold text-amber-300/80">
                      {language === 'bn' ? 'পূর্বের ডিও নং (Prev D.O. No)' : 'Previous D.O. Number'}
                    </label>
                    <input
                      type="text"
                      value={purchasePreviousDoNo}
                      onChange={(e) => setPurchasePreviousDoNo(e.target.value)}
                      placeholder="e.g. DO-98214"
                      className="w-full mt-1 bg-slate-900 border border-slate-700 focus:border-amber-400 rounded-lg px-2.5 py-1.5 text-xs text-amber-200 font-mono font-bold focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] uppercase font-bold text-amber-300/80">
                      {language === 'bn' ? 'পূর্বের ডিও তারিখ (Prev D.O. Date)' : 'Previous D.O. Date'}
                    </label>
                    <input
                      type="date"
                      value={purchasePreviousDoDate}
                      onChange={(e) => setPurchasePreviousDoDate(e.target.value)}
                      className="w-full mt-1 bg-slate-900 border border-slate-700 focus:border-amber-400 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 font-mono focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] uppercase font-bold text-slate-400">{t.amount} (৳)</label>
                  <div className="relative mt-1">
                    <span className="absolute left-3 top-2 font-bold text-rose-400">৳</span>
                    <input
                      type="number"
                      min="0"
                      step="any"
                      value={purchaseAmount || ''}
                      onChange={(e) => setPurchaseAmount(Number(e.target.value))}
                      required
                      placeholder="0"
                      className="w-full pl-8 pr-4 py-2 bg-slate-900 border border-slate-700 rounded-xl text-sm font-bold font-mono-num text-white focus:outline-none focus:border-amber-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[10px] uppercase font-bold text-slate-400">
                    {language === 'bn' ? 'পেমেন্ট অবস্থা' : 'Payment Status'}
                  </label>
                  <select
                    value={purchasePaymentStatus}
                    onChange={(e) => setPurchasePaymentStatus(e.target.value as any)}
                    className="w-full mt-1 bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
                  >
                    <option value="Unpaid">{language === 'bn' ? 'বকেয়া (Unpaid)' : 'Unpaid'}</option>
                    <option value="Paid">{language === 'bn' ? 'পরিশোধিত (Paid)' : 'Paid'}</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-[10px] uppercase font-bold text-slate-400">
                  {language === 'bn' ? 'নোট / মন্তব্য' : 'Notes / Remarks'}
                </label>
                <input
                  type="text"
                  value={purchaseNotes}
                  onChange={(e) => setPurchaseNotes(e.target.value)}
                  placeholder="e.g. নতুন মালামাল চালান"
                  className="w-full mt-1 bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="flex gap-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsPurchaseModalOpen(false)}
                  className="flex-1 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold"
                >
                  {t.cancel}
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold shadow-lg transition active:scale-95"
                >
                  {language === 'bn' ? 'চালান সংরক্ষণ করুন' : 'Save Challan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: PAY SUPPLIER */}
      {isPaymentModalOpen && activeSupplier && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl">
            <div className="p-4 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <DollarSign className="w-5 h-5 text-emerald-400" />
                <h3 className="font-bold text-slate-100 text-sm sm:text-base">
                  {language === 'bn' ? 'সাপ্লায়ারকে টাকা পরিশোধ' : 'Disburse Supplier Payment'}
                </h3>
              </div>
              <button
                onClick={() => setIsPaymentModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitPayment} className="p-4 space-y-3.5">
              <div className="p-3 rounded-xl bg-slate-800/80 border border-slate-700 text-xs">
                <div className="text-slate-400">Supplier:</div>
                <div className="font-bold text-white text-sm">{activeSupplier.company} ({activeSupplier.name})</div>
                <div className="text-rose-400 font-mono-num mt-1">
                  Current Due: {formatCurrency(activeSupplier.outstandingPayable, language)}
                </div>
              </div>

              {/* Date Selection */}
              <div className="space-y-1 p-2.5 rounded-xl bg-slate-950/70 border border-indigo-500/20 text-xs">
                <div className="flex items-center justify-between">
                  <label className="text-[10px] uppercase font-bold text-indigo-300 flex items-center gap-1">
                    <Calendar className="w-3 h-3 text-indigo-400" />
                    <span>{language === 'bn' ? 'ভাউচার তারিখ' : 'Voucher Date'}</span>
                  </label>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => setPaymentDate(getTodayDateString())}
                      className={`text-[9px] px-1.5 py-0.5 rounded font-bold transition ${
                        paymentDate === getTodayDateString() ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-400'
                      }`}
                    >
                      {language === 'bn' ? 'আজ' : 'Today'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setPaymentDate(getYesterdayDateString())}
                      className={`text-[9px] px-1.5 py-0.5 rounded font-bold transition ${
                        paymentDate === getYesterdayDateString() ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-400'
                      }`}
                    >
                      {language === 'bn' ? 'গতকাল' : 'Yesterday'}
                    </button>
                  </div>
                </div>
                <input
                  type="date"
                  value={paymentDate}
                  onChange={(e) => setPaymentDate(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs font-mono text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="text-[10px] uppercase font-bold text-slate-400">{t.amount}</label>
                <div className="relative mt-1">
                  <span className="absolute left-3 top-2 font-bold text-emerald-400">৳</span>
                  <input
                    type="number"
                    min="0.01"
                    step="any"
                    value={paymentAmount || ''}
                    onChange={(e) => setPaymentAmount(Number(e.target.value))}
                    required
                    className="w-full pl-8 pr-4 py-2 bg-slate-900 border border-slate-700 rounded-xl text-sm font-bold font-mono-num text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] uppercase font-bold text-slate-400">
                  {t.paymentMethod}
                </label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value as any)}
                  className="w-full mt-1 bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                >
                  <option value="Bank Transfer">Bank Transfer (ব্যাংক ট্রান্সফার)</option>
                  <option value="Cash">Cash (ড্রয়ারের নগদ টাকা)</option>
                  <option value="bKash / Nagad">bKash / Nagad (মোবাইল ব্যাংকিং)</option>
                  <option value="Cheque">Cheque (ব্যাংক চেক)</option>
                </select>
              </div>

              <div>
                <div className="flex items-center justify-between">
                  <label className="text-[10px] uppercase font-bold text-slate-400">
                    {language === 'bn' ? 'ভাউচার / রেফারেন্স নং' : 'Reference Voucher #'}
                  </label>
                  <span className="text-[9px] text-emerald-400 font-mono">
                    {language === 'bn' ? 'অটো-ইউনিক' : 'Auto-Unique'}
                  </span>
                </div>
                <div className="relative flex items-center mt-1">
                  <input
                    type="text"
                    value={paymentRef}
                    onChange={(e) => setPaymentRef(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 pr-8 text-xs font-mono text-white focus:outline-none focus:border-emerald-500"
                  />
                  <button
                    type="button"
                    onClick={() => setPaymentRef(generateFreshPaymentRef())}
                    title={language === 'bn' ? 'পরবর্তী নতুন ভাউচার নম্বর নিন' : 'Generate next voucher number'}
                    className="absolute right-2 text-slate-400 hover:text-emerald-400 p-1 transition-colors"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              <div>
                <label className="text-[10px] uppercase font-bold text-slate-400">{t.notes}</label>
                <input
                  type="text"
                  placeholder="e.g. Month-end clearance via DBBL"
                  value={paymentNotes}
                  onChange={(e) => setPaymentNotes(e.target.value)}
                  className="w-full mt-1 bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsPaymentModalOpen(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-xl"
                >
                  {t.cancel}
                </button>
                <button
                  type="submit"
                  disabled={paymentAmount <= 0}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl shadow-lg transition active:scale-95"
                >
                  {language === 'bn' ? 'পেমেন্ট সম্পন্ন করুন' : 'Confirm Payment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: DELETE WRONG LEDGER ENTRY */}
      {deletingEntry && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-rose-500/50 rounded-2xl w-full max-w-md p-5 space-y-4 shadow-2xl text-white">
            <div className="flex items-center gap-3 text-rose-400">
              <div className="w-10 h-10 rounded-xl bg-rose-500/20 flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-rose-400" />
              </div>
              <div>
                <h3 className="font-bold text-sm text-white">
                  {language === 'bn' ? 'ভুল লেজার এন্ট্রি ডিলিট করবেন?' : 'Delete Wrong Ledger Entry?'}
                </h3>
                <p className="text-xs text-slate-400 font-mono">
                  Ref #{deletingEntry.referenceNo} • ৳{deletingEntry.amount} ({deletingEntry.type})
                </p>
              </div>
            </div>

            <p className="text-xs text-slate-300">
              {language === 'bn'
                ? 'ভুলবশত এন্ট্রি হয়ে থাকলে এই রেকর্ডটি লেজার খাতা থেকে স্থায়ীভাবে মুছে ফেলতে পারেন।'
                : 'Delete this mistaken purchase or payment voucher entry from the ledger ledger.'}
            </p>

            <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
              <input
                type="checkbox"
                checked={revertBalanceOnDelete}
                onChange={(e) => setRevertBalanceOnDelete(e.target.checked)}
                className="rounded border-slate-700 bg-slate-950 text-emerald-500 focus:ring-0"
              />
              <span>{language === 'bn' ? 'সাপ্লায়ারের মোট দেনা / বকেয়া স্বয়ংক্রিয়ভাবে সমন্বয় করুন' : 'Auto-adjust supplier outstanding balance'}</span>
            </label>

            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => setDeletingEntry(null)}
                className="flex-1 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold transition"
              >
                {t.cancel}
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteEntry}
                className="flex-1 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-lg"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>{language === 'bn' ? 'হ্যাঁ, এন্ট্রি মুছুন' : 'Yes, Delete'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: ADD / EDIT SUPPLIER */}
      {(isAddSupplierOpen || editingSupplier) && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-5 space-y-4 shadow-2xl text-white">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="font-bold text-sm flex items-center gap-2">
                <Building2 className="w-4 h-4 text-indigo-400" />
                <span>
                  {editingSupplier
                    ? (language === 'bn' ? 'সাপ্লায়ার তথ্য ও ফোন পরিবর্তন' : 'Edit Supplier Details & Phone')
                    : (language === 'bn' ? 'নতুন সাপ্লায়ার যোগ' : 'Add New Supplier')}
                </span>
              </h3>
              <button
                onClick={() => {
                  setEditingSupplier(null);
                  setIsAddSupplierOpen(false);
                }}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveSupplier} className="space-y-3 text-xs">
              <div className="space-y-1">
                <label className="text-slate-400 block font-medium">
                  {language === 'bn' ? 'কোম্পানি / প্রতিষ্ঠানের নাম' : 'Company / Business Name'} *
                </label>
                <input
                  type="text"
                  required
                  value={supplierForm.company}
                  onChange={(e) => setSupplierForm({ ...supplierForm, company: e.target.value })}
                  placeholder="e.g. Meghna Group of Industries"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <label className="text-slate-400 block font-medium">
                    {language === 'bn' ? 'যোগাযোগকারীর নাম' : 'Contact Person'}
                  </label>
                  <input
                    type="text"
                    value={supplierForm.name}
                    onChange={(e) => setSupplierForm({ ...supplierForm, name: e.target.value })}
                    placeholder="e.g. Md. Shahidul Islam"
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <PhoneInputWithContactPicker
                  label={language === 'bn' ? 'মোবাইল / ফোন নম্বর' : 'Phone Number'}
                  required
                  value={supplierForm.phone}
                  onChange={(newPhone) => setSupplierForm({ ...supplierForm, phone: newPhone })}
                  onSelectContactInfo={(info) => {
                    setSupplierForm((prev) => ({
                      ...prev,
                      phone: info.phone,
                      name: prev.name || info.name,
                      company: prev.company || info.organization || '',
                      address: prev.address || info.address || '',
                    }));
                  }}
                  placeholder="018XXXXXXXX"
                />
              </div>

              <div className="space-y-1">
                <label className="text-slate-400 block font-medium">
                  {language === 'bn' ? 'ঠিকানা / অফিস' : 'Office Address'}
                </label>
                <input
                  type="text"
                  value={supplierForm.address}
                  onChange={(e) => setSupplierForm({ ...supplierForm, address: e.target.value })}
                  placeholder="e.g. Khatungonj, Chittagong"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-slate-400 block font-medium">
                  {language === 'bn' ? 'ব্যাংক একাউন্ট নম্বর' : 'Bank Account Details'}
                </label>
                <input
                  type="text"
                  value={supplierForm.bankDetails}
                  onChange={(e) => setSupplierForm({ ...supplierForm, bankDetails: e.target.value })}
                  placeholder="e.g. City Bank A/C: 1102938491823"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-indigo-500 font-mono"
                />
              </div>

              <div className="p-3 rounded-xl bg-amber-950/20 border border-amber-800/40 space-y-2.5">
                <div className="flex items-center justify-between">
                  <label className="text-amber-300 block font-bold text-xs flex items-center gap-1.5">
                    <span>🏢</span>
                    <span>{language === 'bn' ? 'কোম্পানি ওপেন ডিও / হিসাব শুরুর বকেয়া' : 'Opening D.O. / Initial Balance'}</span>
                  </label>
                  <span className="text-[10px] text-amber-400/80 bg-amber-900/40 px-2 py-0.5 rounded border border-amber-800/40">
                    {language === 'bn' ? 'একমাত্র শুরুর বকেয়া' : 'Single Source of Due'}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <span className="text-[10px] text-slate-400 block">{language === 'bn' ? 'ওপেন ডিও টাকার পরিমাণ (৳)' : 'Opening Amount (৳)'}</span>
                    <div className="relative">
                      <input
                        type="number"
                        min="0"
                        step="any"
                        value={supplierForm.openingBalance !== undefined ? supplierForm.openingBalance : ''}
                        onChange={(e) =>
                          setSupplierForm({
                            ...supplierForm,
                            openingBalance: Math.max(0, Number(e.target.value) || 0),
                            outstandingPayable: Math.max(0, Number(e.target.value) || 0),
                          })
                        }
                        placeholder="0"
                        className="w-full bg-slate-950 border border-amber-500/40 rounded-xl px-3 py-2 text-amber-300 font-mono text-sm focus:outline-none focus:border-amber-400"
                      />
                      <span className="absolute right-3 top-2 text-slate-500 text-xs">BDT (৳)</span>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <span className="text-[10px] text-slate-400 block">{language === 'bn' ? 'হিসাব শুরুর তারিখ' : 'Opening Date'}</span>
                    <input
                      type="date"
                      value={supplierForm.openingDate}
                      onChange={(e) => setSupplierForm({ ...supplierForm, openingDate: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-amber-400 font-mono"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <span className="text-[10px] text-slate-400 block">{language === 'bn' ? 'ওপেন ডিও বিবরণ / নোট' : 'Opening Notes / D.O. Memo'}</span>
                  <input
                    type="text"
                    value={supplierForm.openingNotes}
                    onChange={(e) => setSupplierForm({ ...supplierForm, openingNotes: e.target.value })}
                    placeholder={language === 'bn' ? 'যেমন: হিসাব শুরুর ওপেন ডিও বা খাতার জের' : 'e.g. Opening delivery order ledger note'}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-slate-200 focus:outline-none focus:border-amber-400"
                  />
                </div>

                <p className="text-[10px] text-slate-400">
                  {language === 'bn'
                    ? '💡 ইনভয়েসের পূর্বের ডিও কাউন্ট হবে না; শুধুমাত্র এই ওপেন ডিও যোগ হবে, এরপর নতুন ক্রয় যোগ ও রিটার্ন/পরিশোধ মাইনাস হবে।'
                    : '💡 Invoice previous DO is ignored; only this unified Opening D.O. counts towards the company balance.'}
                </p>
              </div>

              <div className="flex items-center gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => {
                    setEditingSupplier(null);
                    setIsAddSupplierOpen(false);
                  }}
                  className="flex-1 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-bold transition"
                >
                  {t.cancel}
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold transition shadow"
                >
                  {t.save}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DEDICATED MODAL: EDIT OPENING D.O. & INITIAL DUE */}
      {isOpeningDoModalOpen && activeSupplier && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div className="bg-slate-900 border border-amber-500/50 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl">
            <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-amber-950/30">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400">
                  🏢
                </div>
                <div>
                  <h3 className="font-bold text-sm text-white">
                    {language === 'bn' ? 'কোম্পানির ওপেন ডিও (হিসাব শুরুর বকেয়া)' : 'Edit Opening D.O. (Initial Due)'}
                  </h3>
                  <p className="text-[11px] text-amber-300 font-semibold">{activeSupplier.company}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsOpeningDoModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveOpeningDo} className="p-5 space-y-4 text-xs">
              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
                <div className="text-[11px] text-slate-400">
                  {language === 'bn' ? 'বর্তমানে খাতা অনুযায়ী হিসাব:' : 'Current Ledger Calculation Summary:'}
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs font-mono pt-1">
                  <div>
                    <span className="text-slate-400 block text-[10px]">{language === 'bn' ? 'পরবর্তী মোট ক্রয় (+):' : 'Total Purchases (+):'}</span>
                    <span className="text-slate-200 font-bold">{formatCurrency(selectedSupplierPurchases, language)}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px]">{language === 'bn' ? 'পরিশোধ ও রিটার্ন (-):' : 'Paid & Returns (-):'}</span>
                    <span className="text-emerald-400 font-bold">{formatCurrency(selectedSupplierPaid + selectedSupplierReturns, language)}</span>
                  </div>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-amber-300 block font-bold">
                  {language === 'bn' ? 'কোম্পানির ওপেন ডিও / প্রারম্ভিক বকেয়া টাকা (৳) *' : 'Opening D.O. Initial Due (৳) *'}
                </label>
                <div className="relative">
                  <input
                    type="number"
                    min="0"
                    step="any"
                    required
                    value={openingDoBalance}
                    onChange={(e) => setOpeningDoBalance(Math.max(0, Number(e.target.value) || 0))}
                    placeholder="0"
                    className="w-full bg-slate-950 border border-amber-500/50 rounded-xl px-3 py-2.5 text-amber-300 font-mono text-base font-bold focus:outline-none focus:border-amber-400 shadow-inner"
                  />
                  <span className="absolute right-3 top-3 text-slate-500 text-xs">BDT (৳)</span>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-slate-300 block font-medium">
                  {language === 'bn' ? 'হিসাব শুরুর তারিখ' : 'Opening Date'}
                </label>
                <input
                  type="date"
                  required
                  value={openingDoDate}
                  onChange={(e) => setOpeningDoDate(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-indigo-500 font-mono"
                />
              </div>

              <div className="space-y-1">
                <label className="text-slate-300 block font-medium">
                  {language === 'bn' ? 'বিবরণ বা রেফারেন্স নোট' : 'Opening Notes / Memo'}
                </label>
                <input
                  type="text"
                  value={openingDoNotes}
                  onChange={(e) => setOpeningDoNotes(e.target.value)}
                  placeholder={language === 'bn' ? 'যেমন: সফটওয়্যার ইনস্টলকালীন কোম্পানি বকেয়া' : 'e.g. Initial balance at onboarding'}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              {/* Calculated Result Preview */}
              <div className="p-3 rounded-xl bg-amber-950/30 border border-amber-800/40 flex items-center justify-between">
                <div>
                  <span className="text-[10px] text-amber-300/80 block uppercase font-bold">
                    {language === 'bn' ? 'পরিবর্তনের পর নতুন নিট বকেয়া' : 'Estimated New Net Due'}
                  </span>
                  <p className="text-base font-extrabold text-amber-400 font-mono-num">
                    {formatCurrency(
                      Math.max(0, openingDoBalance + selectedSupplierPurchases - selectedSupplierPaid - selectedSupplierReturns),
                      language
                    )}
                  </p>
                </div>
                <div className="text-[10px] text-right text-slate-400 font-mono">
                  <div>+ {openingDoBalance} (ওপেন ডিও)</div>
                  <div>+ {selectedSupplierPurchases} (ক্রয়)</div>
                  <div>- {selectedSupplierPaid + selectedSupplierReturns} (পরিশোধ/রিটার্ন)</div>
                </div>
              </div>

              <div className="flex items-center gap-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsOpeningDoModalOpen(false)}
                  className="flex-1 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-bold transition"
                >
                  {t.cancel}
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-xl font-bold transition shadow flex items-center justify-center gap-1.5"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>{language === 'bn' ? 'ওপেন ডিও সেভ করুন' : 'Save Opening D.O.'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: DELETE SUPPLIER CONFIRMATION */}
      {deletingSupplier && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-rose-500/50 rounded-2xl w-full max-w-md p-5 space-y-4 shadow-2xl text-white">
            <div className="flex items-center gap-3 text-rose-400">
              <div className="w-10 h-10 rounded-xl bg-rose-500/20 flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-rose-400" />
              </div>
              <div>
                <h3 className="font-bold text-sm text-white">
                  {language === 'bn' ? 'সাপ্লায়ার ডিলিট করবেন?' : 'Delete Supplier?'}
                </h3>
                <p className="text-xs text-slate-400">
                  {deletingSupplier.company} ({deletingSupplier.name})
                </p>
              </div>
            </div>

            <p className="text-xs text-slate-300">
              {language === 'bn'
                ? 'আপনি কি নিশ্চিত এই সাপ্লায়ারকে তালিকা থেকে ডিলিট করতে চান?'
                : 'Are you sure you want to remove this supplier company from the ledger?'}
            </p>

            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => setDeletingSupplier(null)}
                className="flex-1 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold transition"
              >
                {t.cancel}
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteSupplier}
                className="flex-1 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 shadow"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>{language === 'bn' ? 'হ্যাঁ, ডিলিট করুন' : 'Yes, Delete'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PDF Statement Preview and Download Modal */}
      <PdfPreviewModal
        pdfResult={pdfPreviewResult}
        onClose={() => setPdfPreviewResult(null)}
      />

      {/* Edit Purchase Challan & Stock Modal */}
      <EditPurchaseChallanModal
        isOpen={!!editingChallan}
        onClose={() => setEditingChallan(null)}
        challan={editingChallan}
      />

      {/* Delete Purchase Challan & Deduct Stock Modal */}
      <DeletePurchaseChallanModal
        isOpen={!!deletingChallan}
        onClose={() => setDeletingChallan(null)}
        challan={deletingChallan}
      />
    </div>
  );
};
