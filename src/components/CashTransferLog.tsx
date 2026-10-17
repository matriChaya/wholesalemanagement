import React, { useState } from 'react';
import { useWholesale } from '../context/WholesaleContext';
import { CashTransfer, CashTransferStatus } from '../types';
import { translations, formatCurrency } from '../utils/translations';
import { exportCashTransfersToPdf, generateCashTransfersPdf, PdfDocumentResult } from '../utils/pdfExport';
import { PdfPreviewModal } from './PdfPreviewModal';
import {
  Coins,
  ArrowRight,
  CheckCircle2,
  Clock,
  XCircle,
  Plus,
  Send,
  ShieldCheck,
  Filter,
  Check,
  X,
  FileCheck2,
  Wallet,
  Download,
  FileDown,
  Search,
  RotateCcw,
  Trash2,
  AlertTriangle,
  History,
  Eye
} from 'lucide-react';
import { CashTransferModal } from './CashTransferModal';
import { RecentActivityPanel } from './RecentActivityPanel';

export const CashTransferLog: React.FC = () => {
  const {
    language,
    currentRole,
    currentUser,
    cashTransfers,
    acceptCashTransfer,
    rejectCashTransfer,
    deleteCashTransfer,
    openResetModal,
    isOnline,
    isFromCache,
  } = useWholesale();

  const t = translations[language];

  const [viewMode, setViewMode] = useState<'TRANSFERS' | 'AUDIT'>('TRANSFERS');
  const [statusFilter, setStatusFilter] = useState<'ALL' | CashTransferStatus>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isTransferModalOpen, setIsTransferModalOpen] = useState<boolean>(false);
  const [deletingTransfer, setDeletingTransfer] = useState<CashTransfer | null>(null);
  const [pdfPreviewResult, setPdfPreviewResult] = useState<PdfDocumentResult | null>(null);

  // Filter transfers by status and search query
  const filteredTransfers = cashTransfers.filter((tr) => {
    if (statusFilter !== 'ALL' && tr.status !== statusFilter) return false;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      const cleanAmount = q.replace(/[৳,\s]/g, '');

      const amountStr = tr.amount.toString();
      const formattedAmount = formatCurrency(tr.amount, language).toLowerCase();
      const amountMatch =
        amountStr.includes(cleanAmount) ||
        formattedAmount.includes(q) ||
        tr.amount.toLocaleString().includes(cleanAmount);

      const fromPartyMatch =
        tr.fromUserName.toLowerCase().includes(q) ||
        tr.fromRole.toLowerCase().includes(q);
      const toPartyMatch =
        tr.toUserName.toLowerCase().includes(q) ||
        tr.toRole.toLowerCase().includes(q);
      const transferNoMatch = tr.transferNo.toLowerCase().includes(q);
      const notesMatch = (tr.notes || '').toLowerCase().includes(q);

      const dateObj = new Date(tr.createdAt);
      const dateIso = tr.createdAt.toLowerCase();
      const dateLocale = dateObj.toLocaleDateString().toLowerCase();
      const dateString = dateObj.toDateString().toLowerCase();
      const dateTimeStr = dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }).toLowerCase();
      const dateMatch =
        dateIso.includes(q) ||
        dateLocale.includes(q) ||
        dateString.includes(q) ||
        dateTimeStr.includes(q);

      if (
        !amountMatch &&
        !fromPartyMatch &&
        !toPartyMatch &&
        !transferNoMatch &&
        !notesMatch &&
        !dateMatch
      ) {
        return false;
      }
    }

    return true;
  });

  const pendingCount = cashTransfers.filter((t) => t.status === 'PENDING').length;
  const acceptedTotal = cashTransfers
    .filter((t) => t.status === 'ACCEPTED')
    .reduce((acc, t) => acc + t.amount, 0);

  const handleAccept = (transferId: string) => {
    acceptCashTransfer(transferId);
  };

  const handleReject = (transferId: string) => {
    rejectCashTransfer(transferId);
  };

  return (
    <div className="space-y-4 animate-in fade-in duration-200">
      {/* Top Banner */}
      <div className="p-4 rounded-2xl bg-gradient-to-r from-slate-900 via-slate-900 to-emerald-950/40 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-lg">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0">
            <Coins className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
              <span>{t.transfersTitle}</span>
              {pendingCount > 0 && (
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 animate-pulse">
                  {pendingCount} {t.transferStatusPending}
                </span>
              )}
            </h2>
            <p className="text-xs text-slate-400">{t.transfersSubtitle}</p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0 flex-wrap">
          {/* View Mode Switcher */}
          <div className="p-1 bg-slate-950/80 border border-slate-800 rounded-xl flex items-center gap-1">
            <button
              onClick={() => setViewMode('TRANSFERS')}
              className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                viewMode === 'TRANSFERS'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Coins className="w-3.5 h-3.5" />
              <span>{language === 'bn' ? 'ক্যাশ ট্রান্সফার' : 'Cash Transfers'}</span>
            </button>
            <button
              onClick={() => setViewMode('AUDIT')}
              className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                viewMode === 'AUDIT'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <History className="w-3.5 h-3.5" />
              <span>{language === 'bn' ? 'সকল অডিট লগ' : 'Audit Trail'}</span>
            </button>
          </div>

          {viewMode === 'TRANSFERS' && (
            <>
              {currentRole === 'admin' && (
                <button
                  type="button"
                  onClick={openResetModal}
                  id="btn-reset-cash-log"
                  className="py-2 px-3 bg-rose-950/70 hover:bg-rose-900/90 text-rose-300 border border-rose-500/40 font-bold text-xs rounded-xl flex items-center gap-1.5 shadow-md transition active:scale-95 cursor-pointer"
                  title={language === 'bn' ? 'ক্যাশ বুক ও চালান ডাটা রিসেট করুন' : 'Reset Invoices & Cash Book'}
                >
                  <RotateCcw className="w-3.5 h-3.5 text-rose-400" />
                  <span className="hidden sm:inline">{language === 'bn' ? 'ডাটা রিসেট' : 'Reset'}</span>
                </button>
              )}

              <button
                onClick={() => {
                  const res = generateCashTransfersPdf(filteredTransfers);
                  setPdfPreviewResult(res);
                }}
                id="btn-preview-transfers-pdf"
                className="py-2 px-3 bg-slate-800 hover:bg-slate-700 text-teal-300 border border-slate-700 hover:border-slate-600 font-bold text-xs rounded-xl flex items-center gap-1.5 shadow-md transition active:scale-95 cursor-pointer"
                title="Preview Cash Transfer PDF"
              >
                <Eye className="w-4 h-4 text-teal-400" />
                <span className="hidden sm:inline">{language === 'bn' ? 'প্রিভিউ' : 'Preview'}</span>
              </button>

              <button
                onClick={() => generateCashTransfersPdf(filteredTransfers).download()}
                id="btn-export-transfers-pdf"
                className="py-2 px-3 bg-teal-600 hover:bg-teal-500 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 shadow-md transition active:scale-95 cursor-pointer"
                title={t.exportTransfersPdf}
              >
                <Download className="w-4 h-4" />
                <span className="hidden sm:inline">{language === 'bn' ? 'ডাউনলোড' : 'Download'}</span>
                <span className="sm:hidden">PDF</span>
              </button>

              <button
                onClick={() => setIsTransferModalOpen(true)}
                id="btn-open-send-cash-modal"
                className="py-2 px-3.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 shadow-lg shadow-emerald-950/40 transition active:scale-95"
              >
                <Send className="w-4 h-4" />
                <span>{t.sendCashBtn}</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* Render View Mode */}
      {viewMode === 'AUDIT' ? (
        <RecentActivityPanel showFilters={true} />
      ) : (
        <>
          {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-2 gap-2.5">
        <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800">
          <span className="text-[10px] uppercase font-bold text-slate-400 flex items-center gap-1">
            <Clock className="w-3.5 h-3.5 text-amber-400" />
            {t.transferStatusPending}
          </span>
          <p className="text-lg sm:text-xl font-extrabold text-amber-400 font-mono-num mt-1">
            {pendingCount}
          </p>
          <span className="text-[10px] text-slate-400">
            {language === 'bn' ? 'সম্মতির অপেক্ষায় লেনদেন' : 'Transfers awaiting confirmation'}
          </span>
        </div>

        <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800">
          <span className="text-[10px] uppercase font-bold text-slate-400 flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            {language === 'bn' ? 'মোট সম্পন্ন ক্যাশ হস্তান্তর' : 'Completed Cash Transfers'}
          </span>
          <p className="text-lg sm:text-xl font-extrabold text-emerald-400 font-mono-num mt-1">
            {formatCurrency(acceptedTotal, language)}
          </p>
          <span className="text-[10px] text-slate-400">
            {language === 'bn' ? 'স্বীকৃত ও ড্রয়ারে রেকর্ডকৃত টাকা' : 'Accepted and ledgered funds'}
          </span>
        </div>
      </div>

      {/* Search and Filters Bar */}
      <div className="p-3 rounded-2xl bg-slate-900 border border-slate-800 space-y-2.5">
        <div className="flex flex-col sm:flex-row gap-2 items-stretch sm:items-center">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-emerald-400 absolute left-3 top-2.5 pointer-events-none" />
            <input
              type="text"
              id="input-search-cash-transfers"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t.searchTransfersPlaceholder || (language === 'bn' ? 'টাকার পরিমাণ (৳), তারিখ, প্রেরক, প্রাপক বা রেফারেন্স দিয়ে খুঁজুন...' : 'Search by amount (৳), date, sender, receiver, ref #...')}
              className="w-full pl-9 pr-8 py-2 bg-slate-950 border border-slate-800 hover:border-slate-700 focus:border-emerald-500 rounded-xl text-xs text-white placeholder:text-slate-500 focus:outline-none transition shadow-inner"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-2 p-0.5 text-slate-400 hover:text-white"
                title="Clear search"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <div className="flex items-center gap-1 overflow-x-auto shrink-0">
            {(['ALL', 'PENDING', 'ACCEPTED', 'REJECTED'] as const).map((status) => (
              <button
                key={status}
                onClick={() => setStatusFilter(status)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition whitespace-nowrap ${
                  statusFilter === status
                    ? 'bg-slate-800 text-emerald-300 border border-slate-700 shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {status === 'ALL' && (language === 'bn' ? 'সকল' : 'All')}
                {status === 'PENDING' && t.transferStatusPending}
                {status === 'ACCEPTED' && t.transferStatusAccepted}
                {status === 'REJECTED' && t.transferStatusRejected}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center justify-between text-[11px] text-slate-400 px-0.5">
          <div className="flex items-center gap-2 flex-wrap">
            <span>
              {language === 'bn' ? 'প্রদর্শিত লেনদেন:' : 'Showing:'}{' '}
              <strong className="text-white font-mono-num">{filteredTransfers.length}</strong> / {cashTransfers.length}{' '}
              {language === 'bn' ? 'টি হস্তান্তর' : 'transfers'}
            </span>
            {searchQuery && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 text-[10px]">
                <Search className="w-3 h-3" />
                &ldquo;{searchQuery}&rdquo;
              </span>
            )}
          </div>

          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="text-slate-400 hover:text-rose-300 text-[11px] underline underline-offset-2 flex items-center gap-1 transition"
            >
              <RotateCcw className="w-3 h-3" />
              {language === 'bn' ? 'রিসেট' : 'Reset'}
            </button>
          )}
        </div>
      </div>

      {/* Transfers List */}
      <div className="space-y-2.5">
        {filteredTransfers.length === 0 ? (
          <div className="p-8 rounded-2xl bg-slate-900 border border-slate-800 text-center space-y-2">
            <Coins className="w-8 h-8 mx-auto text-slate-600 mb-1" />
            <div className="text-xs text-slate-400">
              {searchQuery
                ? language === 'bn'
                  ? `"${searchQuery}" এর সাথে মিলে এমন কোনো ক্যাশ লেনদেন পাওয়া যায়নি।`
                  : `No cash transfers found matching "${searchQuery}".`
                : language === 'bn'
                ? 'এই ফিল্টারে কোনো ক্যাশ হস্তান্তরের হিস্ট্রি নেই।'
                : 'No cash transfers found for this filter.'}
            </div>
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-emerald-400 border border-slate-700 rounded-xl text-xs font-bold transition"
              >
                {language === 'bn' ? 'সার্চ ক্লিয়ার করুন' : 'Clear Search Filter'}
              </button>
            )}
          </div>
        ) : (
          filteredTransfers.map((item) => {
            const isReceiver =
              currentUser.id === item.toUserId ||
              currentUser.role === item.toRole ||
              currentRole === item.toRole ||
              (currentRole === 'admin' && (item.toRole === 'admin' || !item.toRole || item.toUserId === 'usr_admin')) ||
              (currentRole === 'counter' && (item.toRole === 'counter' || item.toUserId === 'usr_counter_pc' || (item.toUserName || '').toLowerCase().includes('counter')));
            const isPending = item.status === 'PENDING';
            const isAccepted = item.status === 'ACCEPTED';
            const isRejected = item.status === 'REJECTED';

            return (
              <div
                key={item.id}
                className={`p-3.5 sm:p-4 rounded-2xl border transition-all ${
                  isPending && isReceiver
                    ? 'bg-gradient-to-r from-slate-900 to-amber-950/20 border-amber-500/40 shadow-lg ring-1 ring-amber-500/20'
                    : 'bg-slate-900/80 border-slate-800 hover:border-slate-700'
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  {/* Left: Transfer Details */}
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono text-[11px] text-slate-400 font-semibold">
                        {item.transferNo}
                      </span>
                      
                      {/* Status Chip */}
                      {isPending && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                          <Clock className="w-3 h-3" />
                          {t.transferStatusPending}
                        </span>
                      )}
                      {isAccepted && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                          <CheckCircle2 className="w-3 h-3" />
                          {t.transferStatusAccepted}
                        </span>
                      )}
                      {isRejected && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/30">
                          <XCircle className="w-3 h-3" />
                          {t.transferStatusRejected}
                        </span>
                      )}

                      <span className="text-[10px] text-slate-500">
                        {new Date(item.createdAt).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}{' '}
                        • {new Date(item.createdAt).toLocaleDateString()}
                      </span>
                    </div>

                    {/* Flow Route */}
                    <div className="flex items-center gap-2 text-xs font-semibold text-white">
                      <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-200 border border-slate-700">
                        {item.fromUserName}
                      </span>
                      <ArrowRight className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                      <span className="px-2 py-0.5 rounded bg-slate-800 text-emerald-300 border border-slate-700">
                        {item.toUserName}
                      </span>
                    </div>

                    {item.notes && (
                      <p className="text-[11px] text-slate-400 italic">
                        &ldquo;{item.notes}&rdquo;
                      </p>
                    )}

                    {/* Denominations Pill summary */}
                    {item.denominations && (
                      <div className="flex items-center gap-1.5 flex-wrap pt-1 text-[10px] text-slate-400">
                        <span className="font-semibold text-slate-300">Notes:</span>
                        {item.denominations.note1000 && (
                          <span className="bg-slate-800 px-1.5 py-0.5 rounded border border-slate-700">
                            ৳1000 × {item.denominations.note1000}
                          </span>
                        )}
                        {item.denominations.note500 && (
                          <span className="bg-slate-800 px-1.5 py-0.5 rounded border border-slate-700">
                            ৳500 × {item.denominations.note500}
                          </span>
                        )}
                        {item.denominations.note200 && (
                          <span className="bg-slate-800 px-1.5 py-0.5 rounded border border-slate-700">
                            ৳200 × {item.denominations.note200}
                          </span>
                        )}
                        {item.denominations.note100 && (
                          <span className="bg-slate-800 px-1.5 py-0.5 rounded border border-slate-700">
                            ৳100 × {item.denominations.note100}
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Right: Amount & Accept Button */}
                  <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-center gap-2 shrink-0 border-t sm:border-t-0 border-slate-800/80 pt-2 sm:pt-0">
                    <span className="text-base sm:text-lg font-extrabold text-emerald-400 font-mono-num">
                      {formatCurrency(item.amount, language)}
                    </span>

                    {/* Actionable Accept / Reject Buttons for Receiver */}
                    <div className="flex items-center gap-1.5">
                      {isPending && isReceiver && (
                        <>
                          <button
                            onClick={() => handleReject(item.id)}
                            className="p-2 bg-slate-800 hover:bg-rose-950 hover:text-rose-300 text-slate-400 border border-slate-700 rounded-xl transition text-xs"
                            title="Decline cash transfer"
                          >
                            <X className="w-4 h-4" />
                          </button>

                          <button
                            onClick={() => handleAccept(item.id)}
                            id={`btn-accept-cash-${item.id}`}
                            className="py-2 px-3.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 shadow-lg shadow-emerald-900/50 transition active:scale-95"
                            title="Confirm receiving cash"
                          >
                            <Check className="w-4 h-4" />
                            <span>{t.acceptCashBtn}</span>
                          </button>
                        </>
                      )}

                      {isAccepted && (
                        <span className="text-[10px] text-emerald-400 font-semibold flex items-center gap-1">
                          <FileCheck2 className="w-3.5 h-3.5" />
                          {language === 'bn' ? 'ড্রয়ারে জমা' : 'Deposited'}
                        </span>
                      )}

                      {/* Delete Wrong Transfer button */}
                      <button
                        onClick={() => setDeletingTransfer(item)}
                        className="p-1.5 text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition"
                        title="Delete Transfer Entry"
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
      </>
      )}

      {/* Delete Cash Transfer Modal */}
      {deletingTransfer && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-rose-500/50 rounded-2xl w-full max-w-sm p-4 space-y-3 shadow-2xl text-white">
            <div className="flex items-center gap-2.5 text-rose-400">
              <AlertTriangle className="w-5 h-5" />
              <h4 className="font-bold text-sm text-white">
                {language === 'bn' ? 'ক্যাশ হস্তান্তর মুছবেন?' : 'Delete Cash Transfer?'}
              </h4>
            </div>
            <p className="text-xs text-slate-300">
              {deletingTransfer.transferNo} • ৳{deletingTransfer.amount} ({deletingTransfer.fromUserName} → {deletingTransfer.toUserName})
            </p>
            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => setDeletingTransfer(null)}
                className="flex-1 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold"
              >
                {t.cancel}
              </button>
              <button
                type="button"
                onClick={() => {
                  deleteCashTransfer(deletingTransfer.id);
                  setDeletingTransfer(null);
                }}
                className="flex-1 py-1.5 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1 shadow"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>{language === 'bn' ? 'হ্যাঁ, মুছুন' : 'Yes, Delete'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* New Cash Transfer Modal */}
      <CashTransferModal
        isOpen={isTransferModalOpen}
        onClose={() => setIsTransferModalOpen(false)}
      />

      {/* PDF Statement Preview and Download Modal */}
      <PdfPreviewModal
        pdfResult={pdfPreviewResult}
        onClose={() => setPdfPreviewResult(null)}
      />
    </div>
  );
};
