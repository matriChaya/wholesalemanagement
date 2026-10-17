import React, { useState } from 'react';
import { useWholesale } from '../context/WholesaleContext';
import { CapitalTransaction } from '../types';
import { translations, formatCurrency, parseFlexibleNumber } from '../utils/translations';
import { generateCapitalStatementPdf, PdfDocumentResult } from '../utils/pdfExport';
import { PdfPreviewModal } from './PdfPreviewModal';
import {
  PieChart,
  Coins,
  TrendingUp,
  ArrowUpRight,
  ArrowDownLeft,
  DollarSign,
  Building,
  Truck,
  ShoppingCart,
  Boxes,
  Users,
  Plus,
  Minus,
  History,
  ShieldCheck,
  X,
  Trash2,
  AlertTriangle,
  Edit3,
  Eye,
  Download,
  FileText
} from 'lucide-react';

export const CapitalTrackerView: React.FC = () => {
  const {
    language,
    users,
    products,
    capitalTransactions,
    addCapitalTransaction,
    deleteCapitalTransaction,
    totalCapitalInjected,
    totalReceivables,
    totalPayables,
    totalInventoryValuation,
    totalLiquidCash,
    businessNetWorth,
    cashBank,
    openBalanceModal
  } = useWholesale();

  const t = translations[language];

  const [isCapitalModalOpen, setIsCapitalModalOpen] = useState<boolean>(false);
  const [modalType, setModalType] = useState<'CAPITAL_INJECTION' | 'OWNER_WITHDRAWAL'>(
    'CAPITAL_INJECTION'
  );
  const [amountInput, setAmountInput] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [account, setAccount] = useState<'BANK' | 'CASH_DRAWER'>('BANK');
  const [deletingTx, setDeletingTx] = useState<CapitalTransaction | null>(null);
  const [pdfPreviewResult, setPdfPreviewResult] = useState<PdfDocumentResult | null>(null);

  const cashAdmin = users.find((u) => u.role === 'admin')?.assignedCashDrawer || 0;
  const cashCounter = users.find((u) => u.role === 'counter')?.assignedCashDrawer || 0;
  const cashDSR = users.find((u) => u.role === 'dsr')?.assignedCashDrawer || 0;

  const handleOpenCapitalModal = (type: 'CAPITAL_INJECTION' | 'OWNER_WITHDRAWAL') => {
    setModalType(type);
    setAmountInput('');
    setDescription(
      type === 'CAPITAL_INJECTION'
        ? language === 'bn'
          ? 'ব্যবসায় নতুন মূলধন বিনিয়োগ'
          : 'Additional equity capital injection'
        : language === 'bn'
        ? 'মালিকের ব্যক্তিগত তহবিল উত্তোলন'
        : 'Proprietor personal drawing withdrawal'
    );
    setIsCapitalModalOpen(true);
  };

  const handleSaveCapitalTx = (e: React.FormEvent) => {
    e.preventDefault();
    const finalAmount = parseFlexibleNumber(amountInput);
    if (finalAmount <= 0) return;

    addCapitalTransaction(
      modalType,
      finalAmount,
      description || 'Capital Transaction',
      description || 'মূলধন লেনদেন',
      account
    );

    setIsCapitalModalOpen(false);
  };

  return (
    <div className="space-y-4 animate-in fade-in duration-200">
      {/* Top Hero Banner */}
      <div className="p-4 rounded-2xl bg-gradient-to-r from-slate-900 via-slate-900 to-amber-950/40 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-lg">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0">
            <PieChart className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
              <span>{t.capitalTrackingTitle}</span>
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                Admin Equity
              </span>
            </h2>
            <p className="text-xs text-slate-400">{t.capitalTrackingSubtitle}</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <button
            onClick={() => {
              const res = generateCapitalStatementPdf(capitalTransactions, {
                adminCash: cashAdmin,
                counterCash: cashCounter,
                dsrCash: cashDSR,
                bankCash: cashBank,
                stockValue: totalInventoryValuation,
                totalReceivables,
                totalPayables,
              });
              setPdfPreviewResult(res);
            }}
            id="btn-preview-capital-pdf"
            className="py-2 px-3 bg-slate-800 hover:bg-slate-700 text-blue-300 border border-slate-700 hover:border-slate-600 font-bold text-xs rounded-xl flex items-center gap-1.5 transition active:scale-95 cursor-pointer"
            title="Preview Capital & Net Worth Statement PDF"
          >
            <Eye className="w-4 h-4 text-blue-400" />
            <span className="hidden sm:inline">{language === 'bn' ? 'ব্যালেন্স শিট প্রিভিউ' : 'Preview Statement'}</span>
            <span className="sm:hidden">{language === 'bn' ? 'প্রিভিউ' : 'Preview'}</span>
          </button>

          <button
            onClick={() => {
              const res = generateCapitalStatementPdf(capitalTransactions, {
                adminCash: cashAdmin,
                counterCash: cashCounter,
                dsrCash: cashDSR,
                bankCash: cashBank,
                stockValue: totalInventoryValuation,
                totalReceivables,
                totalPayables,
              });
              res.download();
            }}
            id="btn-export-capital-pdf"
            className="py-2 px-3 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 shadow-md transition active:scale-95 cursor-pointer"
            title="Download Capital Statement PDF"
          >
            <Download className="w-4 h-4" />
            <span className="hidden sm:inline">{language === 'bn' ? 'ডাউনলোড' : 'Download'}</span>
            <span className="sm:hidden">PDF</span>
          </button>

          <button
            onClick={() => handleOpenCapitalModal('CAPITAL_INJECTION')}
            className="py-2 px-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 shadow-md transition active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span>{t.injectCapital}</span>
          </button>

          <button
            onClick={() => handleOpenCapitalModal('OWNER_WITHDRAWAL')}
            className="py-2 px-3 bg-rose-600/30 hover:bg-rose-600 text-rose-300 hover:text-white border border-rose-500/40 font-bold text-xs rounded-xl flex items-center gap-1.5 transition active:scale-95"
          >
            <Minus className="w-4 h-4" />
            <span>{t.withdrawCapital}</span>
          </button>
        </div>
      </div>

      {/* Main Net Worth & Assets Matrix */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        {/* Net Worth Hero Card */}
        <div className="p-4 rounded-2xl bg-gradient-to-br from-indigo-950/80 via-slate-900 to-slate-900 border border-indigo-500/40 shadow-xl space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs uppercase font-bold text-indigo-300 flex items-center gap-1.5">
              <TrendingUp className="w-4 h-4 text-indigo-400" />
              {t.netWorth}
            </span>
            <span className="text-[10px] px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 font-semibold">
              Live Balance
            </span>
          </div>

          <div>
            <p className="text-2xl sm:text-3xl font-extrabold text-white font-mono-num">
              {formatCurrency(businessNetWorth, language)}
            </p>
            <p className="text-xs text-slate-400 mt-1">
              {language === 'bn'
                ? '(মোট নগদ + দেনাদার রিটেইলার বাকি + মোট স্টক) - সাপ্লায়ারদের পাওনা'
                : '(Cash + Receivables + Inventory) - Supplier Payables'}
            </p>
          </div>

          <div className="pt-2 border-t border-indigo-500/20 grid grid-cols-2 gap-2 text-xs">
            <div>
              <span className="text-slate-400 text-[10px] uppercase font-semibold">{t.initialCapital}</span>
              <p className="font-bold text-slate-200 font-mono-num">
                {formatCurrency(totalCapitalInjected, language)}
              </p>
            </div>
            <div>
              <span className="text-slate-400 text-[10px] uppercase font-semibold">Liquidity Ratio</span>
              <p className="font-bold text-emerald-400 font-mono-num">
                {totalPayables > 0 ? ((totalLiquidCash / totalPayables) * 100).toFixed(1) : 100}%
              </p>
            </div>
          </div>
        </div>

        {/* Liquid Cash Breakdown Card */}
        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs uppercase font-bold text-emerald-400 flex items-center gap-1.5">
              <Coins className="w-4 h-4 text-emerald-400" />
              {t.liquidCash}
            </span>
            <span className="text-xs font-bold text-white font-mono-num">
              {formatCurrency(totalLiquidCash, language)}
            </span>
          </div>

          <div className="space-y-2 text-xs">
            <div className="flex items-center justify-between p-2 rounded-xl bg-slate-950/60 border border-slate-800/80 hover:border-sky-500/50 transition">
              <div className="flex items-center gap-2">
                <Building className="w-3.5 h-3.5 text-sky-400" />
                <span className="text-slate-300">Bank / MFS Accounts</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-mono-num font-bold text-slate-200">
                  {formatCurrency(cashBank, language)}
                </span>
                <button
                  type="button"
                  onClick={() => openBalanceModal('BANK')}
                  className="p-1 text-slate-400 hover:text-sky-400 hover:bg-slate-800 rounded transition cursor-pointer"
                  title={language === 'bn' ? 'ব্যাংক ব্যালেন্স এডিট করুন' : 'Edit Bank Balance'}
                >
                  <Edit3 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between p-2 rounded-xl bg-slate-950/60 border border-slate-800/80 hover:border-emerald-500/50 transition">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-3.5 h-3.5 text-indigo-400" />
                <span className="text-slate-300">Admin Cash Vault</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-mono-num font-bold text-slate-200">
                  {formatCurrency(cashAdmin, language)}
                </span>
                <button
                  type="button"
                  onClick={() => openBalanceModal('ADMIN_CASH')}
                  className="p-1 text-slate-400 hover:text-emerald-400 hover:bg-slate-800 rounded transition cursor-pointer"
                  title={language === 'bn' ? 'এডমিন ক্যাশ এডিট করুন' : 'Edit Admin Cash'}
                >
                  <Edit3 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between p-2 rounded-xl bg-slate-950/60 border border-slate-800/80 hover:border-amber-500/50 transition">
              <div className="flex items-center gap-2">
                <ShoppingCart className="w-3.5 h-3.5 text-amber-400" />
                <span className="text-slate-300">Counter Drawer</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-mono-num font-bold text-slate-200">
                  {formatCurrency(cashCounter, language)}
                </span>
                <button
                  type="button"
                  onClick={() => openBalanceModal('COUNTER_CASH')}
                  className="p-1 text-slate-400 hover:text-amber-400 hover:bg-slate-800 rounded transition cursor-pointer"
                  title={language === 'bn' ? 'কাউন্টার ক্যাশ এডিট করুন' : 'Edit Counter Cash'}
                >
                  <Edit3 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between p-2 rounded-xl bg-slate-950/60 border border-slate-800/80 hover:border-purple-500/50 transition">
              <div className="flex items-center gap-2">
                <Truck className="w-3.5 h-3.5 text-purple-400" />
                <span className="text-slate-300">DSR Field Cash</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-mono-num font-bold text-slate-200">
                  {formatCurrency(cashDSR, language)}
                </span>
                <button
                  type="button"
                  onClick={() => openBalanceModal('DSR_CASH')}
                  className="p-1 text-slate-400 hover:text-purple-400 hover:bg-slate-800 rounded transition cursor-pointer"
                  title={language === 'bn' ? 'ডিএসআর ক্যাশ এডিট করুন' : 'Edit DSR Cash'}
                >
                  <Edit3 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Working Capital & Assets Breakdown Card */}
        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-3">
          <span className="text-xs uppercase font-bold text-slate-400 flex items-center gap-1.5">
            <Boxes className="w-4 h-4 text-amber-400" />
            Balance Sheet Elements
          </span>

          <div className="space-y-2 text-xs">
            <div className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800 flex items-center justify-between">
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 block">{t.totalInventoryValuation}</span>
                <span className="text-slate-300">{products.length} catalog items</span>
              </div>
              <span className="font-mono-num font-extrabold text-amber-400 text-sm">
                {formatCurrency(totalInventoryValuation, language)}
              </span>
            </div>

            <div className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800 flex items-center justify-between">
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 block">{t.totalRetailerReceivable}</span>
                <span className="text-slate-300">Retailers Due</span>
              </div>
              <span className="font-mono-num font-extrabold text-emerald-400 text-sm">
                {formatCurrency(totalReceivables, language)}
              </span>
            </div>

            <div className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800 flex items-center justify-between">
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 block">{t.totalPayableToSuppliers}</span>
                <span className="text-slate-300">Supplier Dues</span>
              </div>
              <span className="font-mono-num font-extrabold text-rose-400 text-sm">
                {formatCurrency(totalPayables, language)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Capital Inflow & Outflow History Log */}
      <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <History className="w-4 h-4 text-indigo-400" />
            <h3 className="font-bold text-sm text-slate-200">
              {language === 'bn' ? 'মূলধন প্রবাহ ও উত্তোলন হিস্ট্রি' : 'Equity Transaction Log'}
            </h3>
          </div>
          <span className="text-xs text-slate-400">{capitalTransactions.length} records</span>
        </div>

        <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-950/50">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-800/80 text-slate-400 text-[11px] border-b border-slate-800">
              <tr>
                <th className="py-2.5 px-3">{t.date}</th>
                <th className="py-2.5 px-2">{t.transactionType}</th>
                <th className="py-2.5 px-2">Account</th>
                <th className="py-2.5 px-2">{t.notes}</th>
                <th className="py-2.5 px-2 text-right">{t.amount}</th>
                <th className="py-2.5 px-3 text-right">Cumulative Capital</th>
                <th className="py-2.5 px-2 text-center">{language === 'bn' ? 'অ্যাকশন' : 'Action'}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {capitalTransactions.map((tx) => {
                const isAdd = tx.type === 'CAPITAL_INJECTION';

                return (
                  <tr key={tx.id} className="hover:bg-slate-800/30 transition">
                    <td className="py-2.5 px-3 whitespace-nowrap text-slate-300 font-mono">
                      {tx.date}
                    </td>
                    <td className="py-2.5 px-2">
                      <span
                        className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          isAdd
                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                            : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                        }`}
                      >
                        {isAdd ? <ArrowDownLeft className="w-3 h-3" /> : <ArrowUpRight className="w-3 h-3" />}
                        {tx.type}
                      </span>
                    </td>
                    <td className="py-2.5 px-2 font-mono text-[11px] text-slate-300">
                      {tx.account}
                    </td>
                    <td className="py-2.5 px-2 text-slate-300 text-xs">
                      {language === 'bn' ? tx.bnDescription || tx.description : tx.description}
                    </td>
                    <td
                      className={`py-2.5 px-2 text-right font-mono-num font-bold whitespace-nowrap ${
                        isAdd ? 'text-emerald-400' : 'text-rose-400'
                      }`}
                    >
                      {isAdd ? '+' : '-'} {formatCurrency(tx.amount, language)}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono-num font-bold text-white whitespace-nowrap">
                      {formatCurrency(tx.runningCapital, language)}
                    </td>
                    <td className="py-2.5 px-2 text-center">
                      <button
                        onClick={() => setDeletingTx(tx)}
                        className="p-1.5 text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition"
                        title="Delete Transaction"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Capital Injection / Withdrawal Modal */}
      {isCapitalModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl">
            <div className="p-4 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                {modalType === 'CAPITAL_INJECTION' ? (
                  <Plus className="w-5 h-5 text-emerald-400" />
                ) : (
                  <Minus className="w-5 h-5 text-rose-400" />
                )}
                <h3 className="font-bold text-slate-100 text-sm sm:text-base">
                  {modalType === 'CAPITAL_INJECTION' ? t.injectCapital : t.withdrawCapital}
                </h3>
              </div>
              <button
                onClick={() => setIsCapitalModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveCapitalTx} className="p-4 space-y-3.5">
              <div>
                <div className="flex items-center justify-between">
                  <label className="text-[10px] uppercase font-bold text-slate-400">{t.amount}</label>
                  {parseFlexibleNumber(amountInput) > 0 && (
                    <span className="text-xs font-bold text-emerald-400">
                      {formatCurrency(parseFlexibleNumber(amountInput), language)}
                    </span>
                  )}
                </div>
                <div className="relative mt-1">
                  <span className="absolute left-3 top-2 font-bold text-emerald-400">৳</span>
                  <input
                    type="text"
                    inputMode="decimal"
                    value={amountInput}
                    onChange={(e) => setAmountInput(e.target.value)}
                    required
                    placeholder="0"
                    className="w-full pl-8 pr-4 py-2 bg-slate-900 border border-slate-700 rounded-xl text-sm font-bold font-mono-num text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] uppercase font-bold text-slate-400">Account Channel</label>
                <select
                  value={account}
                  onChange={(e) => setAccount(e.target.value as any)}
                  className="w-full mt-1 bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                >
                  <option value="BANK">Bank / MFS Account (ব্যাংক অ্যাকাউন্ট)</option>
                  <option value="CASH_DRAWER">Admin Cash Vault (নগদ ক্যাশ ভল্ট)</option>
                </select>
              </div>

              <div>
                <label className="text-[10px] uppercase font-bold text-slate-400">Description</label>
                <input
                  type="text"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full mt-1 bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsCapitalModalOpen(false)}
                  className="px-4 py-2 bg-slate-800 text-slate-300 text-xs font-semibold rounded-xl"
                >
                  {t.cancel}
                </button>
                <button
                  type="submit"
                  disabled={parseFlexibleNumber(amountInput) <= 0}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-bold rounded-xl shadow-lg transition"
                >
                  {t.confirm}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Capital Tx Confirmation Modal */}
      {deletingTx && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-rose-500/50 rounded-2xl w-full max-w-sm p-4 space-y-3 shadow-2xl text-white">
            <div className="flex items-center gap-2.5 text-rose-400">
              <AlertTriangle className="w-5 h-5" />
              <h4 className="font-bold text-sm text-white">
                {language === 'bn' ? 'মূলধন লেনদেন মুছবেন?' : 'Delete Capital Transaction?'}
              </h4>
            </div>
            <p className="text-xs text-slate-300">
              {txDescription(deletingTx, language)} • ৳{deletingTx.amount}
            </p>
            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => setDeletingTx(null)}
                className="flex-1 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold"
              >
                {t.cancel}
              </button>
              <button
                type="button"
                onClick={() => {
                  deleteCapitalTransaction(deletingTx.id);
                  setDeletingTx(null);
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

      {/* PDF Statement Preview and Download Modal */}
      <PdfPreviewModal
        pdfResult={pdfPreviewResult}
        onClose={() => setPdfPreviewResult(null)}
      />
    </div>
  );
};

function txDescription(tx: CapitalTransaction, lang: string) {
  return lang === 'bn' ? tx.bnDescription || tx.description : tx.description;
}
