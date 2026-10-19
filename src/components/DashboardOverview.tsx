import React, { useState } from 'react';
import { useWholesale } from '../context/WholesaleContext';
import { translations, formatCurrency } from '../utils/translations';
import { LowStockAlertWidget } from './LowStockAlertWidget';
import { WeeklyStockMovementReport } from './WeeklyStockMovementReport';
import { DualCashBalanceWidget } from './DualCashBalanceWidget';
import { RecentActivityPanel } from './RecentActivityPanel';
import { DealerDashboardGrid } from './DealerDashboardGrid';
import { ConnectedDevicesFleetModal } from './ConnectedDevicesFleetModal';
import {
  Sparkles,
  Coins,
  BookUser,
  ShoppingCart,
  TrendingUp,
  RotateCcw,
  Building2,
  PieChart,
  ArrowUpRight,
  ArrowDownLeft,
  AlertTriangle,
  Clock,
  CheckCircle2,
  Send,
  Boxes,
  Users,
  ChevronRight,
  FileText,
  BarChart3,
  Database,
  CloudOff,
  Fingerprint,
  Lock,
  ShieldCheck,
  Download,
  Smartphone,
  RefreshCw,
  Zap,
  Radio,
  Laptop,
  Truck,
  Shield,
  Cloud
} from 'lucide-react';

interface DashboardOverviewProps {
  onNavigateTab: (tab: string) => void;
  onOpenScanner: () => void;
  onOpenPhonebook: () => void;
  onOpenCashTransfer: () => void;
  onOpenRoleModal: () => void;
  onOpenInstallGuide?: () => void;
  onOpenAllStatements?: () => void;
  onOpenCashDrawerStatement?: (role: 'admin' | 'counter' | 'dsr') => void;
  onOpenUpdateModal?: () => void;
  isUpdateAvailable?: boolean;
}

export const DashboardOverview: React.FC<DashboardOverviewProps> = ({
  onNavigateTab,
  onOpenScanner,
  onOpenPhonebook,
  onOpenCashTransfer,
  onOpenRoleModal,
  onOpenInstallGuide,
  onOpenAllStatements,
  onOpenCashDrawerStatement,
  onOpenUpdateModal,
  isUpdateAvailable,
}) => {
  const {
    language,
    currentRole,
    currentUser,
    businessNetWorth,
    totalLiquidCash,
    totalReceivables,
    totalPayables,
    totalInventoryValuation,
    cashTransfers,
    acceptCashTransfer,
    orders,
    products,
    suppliers,
    supplierLedger,
    replacements,
    isOnline,
    isFromCache,
    isSimulatedOffline,
    isBiometricEnabled,
    lockBiometric,
    openBiometricSettings,
    openInvestModal,
    openCompanyPaymentModal,
    openPayAdminModal,
    openStaffManagement,
    openMemoKhataScanner,
    cashAdmin,
    cashCounter,
    cashDSR,
    restoreSampleBusinessData,
    allStaffPresences,
    openStaffSyncModal,
    openBackupModal,
    downloadLocalBackupJSON,
    remotePendingDevices,
    registeredDevices,
  } = useWholesale();

  const [isRestoringData, setIsRestoringData] = useState<boolean>(false);
  const [isFleetModalOpen, setIsFleetModalOpen] = useState<boolean>(false);

  const totalPendingCount = (remotePendingDevices || []).reduce((sum, d) => sum + (d.pendingFilesCount || 0), 0);

  const handleQuickRestore = async () => {
    setIsRestoringData(true);
    try {
      await restoreSampleBusinessData();
    } finally {
      setIsRestoringData(false);
    }
  };

  const t = translations[language];

  // Dynamically resolve active cash drawer balance based on role:
  const currentCashDrawerBalance =
    currentRole === 'admin' || currentUser.role === 'admin'
      ? cashAdmin
      : currentRole === 'counter' || currentUser.role === 'counter'
      ? cashCounter
      : currentRole === 'dsr' || currentUser.role === 'dsr'
      ? cashDSR
      : (currentUser.assignedCashDrawer || 0);

  // Pending transfers for user
  const incomingPending = cashTransfers.filter(
    (t) =>
      t.status === 'PENDING' &&
      (currentUser.id === t.toUserId || currentUser.role === t.toRole)
  );

  const lowStockProducts = products.filter((p) => p.stockQuantity <= 10);
  const pendingReplacements = replacements.filter((r) => r.status === 'PENDING');

  const todaySales = orders.reduce((sum, o) => sum + o.totalAmount, 0);

  const [recentInvoiceTab, setRecentInvoiceTab] = useState<'ALL' | 'ORDERS' | 'PURCHASES'>('ALL');

  const scannedChallans = (supplierLedger || []).filter((l) => l.type === 'PURCHASE');

  return (
    <div className="space-y-4 animate-in fade-in duration-200">
      {/* Quick Role & Greeting Banner */}
      <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-slate-900 via-slate-900 to-emerald-950/40 border border-slate-800 shadow-xl relative overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-400">
                {t[currentRole]} Dashboard
              </span>
              <button
                onClick={onOpenRoleModal}
                className="text-[10px] text-slate-400 hover:text-white underline cursor-pointer"
              >
                ({t.switchRole})
              </button>
              <span className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full border ${
                isOnline
                  ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30'
                  : 'bg-amber-500/20 text-amber-300 border-amber-500/40'
              }`}>
                <Database className="w-2.5 h-2.5" />
                {isOnline
                  ? (language === 'bn' ? 'ফায়ারস্টোর অফলাইন পারসিস্টেন্স সক্রিয়' : 'Firestore Offline Ready')
                  : (language === 'bn' ? 'অফলাইন ক্যাশ ভিউ' : 'Offline Local Cache Active')}
              </span>

              {(currentRole === 'admin' || currentRole === 'counter') && isBiometricEnabled && (
                <button
                  onClick={openBiometricSettings}
                  id="badge-biometric-active"
                  className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-950/70 border border-emerald-500/40 text-emerald-300 hover:bg-emerald-900/60 transition"
                  title="Biometric & Vault Protection Active. Click to configure."
                >
                  <Fingerprint className="w-2.5 h-2.5 text-emerald-400" />
                  <span>{t.biometricProtected}</span>
                </button>
              )}
            </div>

            <h2 className="text-lg sm:text-2xl font-black text-white mt-1">
              {language === 'bn' ? `স্বাগতম, ${currentUser.name}` : `Welcome back, ${currentUser.name}`}
            </h2>

            <p className="text-xs text-slate-400 mt-1">
              {currentRole === 'admin'
                ? language === 'bn'
                  ? 'পাইকারি ডিপোর মূলধন, স্টক, ক্যাশ কালেকশন ও সাপ্লায়ার হিসাব'
                  : 'Wholesale Depot Equity, Stock, Cash Drawer & Supplier Management'
                : currentRole === 'counter'
                ? language === 'bn'
                  ? 'কাউন্টার ক্যাশ সেলস, দ্রুত চালান তৈরি ও ডিএসআর ক্যাশ রিসিভ'
                  : 'Fast Counter Invoicing & DSR Cash Reconciliations'
                : currentRole === 'dsr'
                ? language === 'bn'
                  ? 'ফিল্ড অর্ডার বুকিং, মার্কেট কালেকশন ও কাউন্টারে ক্যাশ জমা'
                  : 'Field Route Invoicing, Retailer Collections & Cash Handover'
                : language === 'bn'
                ? 'ডিপো থেকে সরাসরি পাইকারি কেনাকাটা ও বাকি বিল'
                : 'Direct Depot Wholesale Purchasing & Credit Due Management'}
            </p>
          </div>

          {/* Quick Cash Balance Pill & Vault Lock for Cash Holders */}
          {currentRole !== 'retailer' && (
            <div className="flex items-center gap-2 shrink-0">
              {(currentRole === 'admin' || currentRole === 'counter') && isBiometricEnabled && (
                <button
                  onClick={lockBiometric}
                  id="btn-quick-lock-vault"
                  title={t.lockNow}
                  className="p-3 bg-slate-950/80 hover:bg-rose-950/40 text-slate-300 hover:text-rose-300 rounded-xl border border-slate-800 hover:border-rose-500/40 transition flex flex-col items-center justify-center gap-1 active:scale-95 cursor-pointer"
                >
                  <Lock className="w-4 h-4 text-emerald-400" />
                  <span className="text-[9px] font-bold uppercase tracking-wider">{t.lockNow}</span>
                </button>
              )}
              <div className={`p-3 rounded-xl border text-right transition-all ${
                currentCashDrawerBalance < 0
                  ? 'bg-rose-950/40 border-rose-500/50 shadow-lg shadow-rose-950/30'
                  : 'bg-slate-950/80 border-slate-800'
              }`}>
                <div className="flex items-center justify-end gap-1.5">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">
                    {t.cashDrawerBalance}
                  </span>
                  {currentCashDrawerBalance < 0 && (
                    <span className="text-[9px] font-black px-1.5 py-0.2 rounded bg-rose-500/30 text-rose-300 border border-rose-500/50 animate-pulse">
                      {language === 'bn' ? 'মাইনাস ঘাটতি' : 'Deficit'}
                    </span>
                  )}
                </div>
                <span className={`text-lg sm:text-xl font-extrabold font-mono-num ${
                  currentCashDrawerBalance < 0 ? 'text-rose-400' : 'text-emerald-400'
                }`}>
                  {formatCurrency(currentCashDrawerBalance, language)}
                </span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Dynamic In-App Live Update Alert Card */}
      {isUpdateAvailable && onOpenUpdateModal && (
        <div className="p-3.5 sm:p-4 rounded-2xl bg-gradient-to-r from-indigo-950 via-slate-900 to-indigo-950 border border-indigo-500/60 flex items-center justify-between gap-3 shadow-xl shadow-indigo-950/40 animate-in fade-in">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-indigo-500/20 border border-indigo-500/40 flex items-center justify-center text-indigo-400 shrink-0">
              <RefreshCw className="w-5 h-5 text-amber-300 animate-spin" />
            </div>
            <div className="min-w-0">
              <div className="text-xs sm:text-sm font-bold text-white flex items-center gap-1.5 truncate">
                <span>{language === 'bn' ? '🚀 সফটওয়্যার আপডেট প্রস্তুত রয়েছে!' : '🚀 New Software Update Available!'}</span>
                <span className="text-[9px] px-1.5 py-0.2 rounded-full bg-amber-500/30 text-amber-300 font-bold border border-amber-500/40 animate-pulse">
                  NEW
                </span>
              </div>
              <p className="text-[11px] text-slate-300 truncate">
                {language === 'bn' ? 'ইনস্টল করা অ্যাপে নতুন ফিচার কার্যকর করতে ১-ক্লিকে আপডেট করুন' : 'Click to apply latest developer release to installed app'}
              </p>
            </div>
          </div>
          <button
            onClick={onOpenUpdateModal}
            id="btn-dash-update-app"
            className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shrink-0 flex items-center gap-1.5 shadow-lg shadow-emerald-950/50 transition active:scale-95 cursor-pointer"
          >
            <Zap className="w-3.5 h-3.5 text-amber-300 fill-amber-300" />
            <span>{language === 'bn' ? 'আপডেট করুন' : 'Update Now'}</span>
          </button>
        </div>
      )}

      {/* Mobile App Install Card */}
      {onOpenInstallGuide && (
        <div className="p-3 sm:p-4 rounded-2xl bg-gradient-to-r from-emerald-950/60 via-slate-900 to-teal-950/60 border border-emerald-500/40 flex items-center justify-between gap-3 shadow-lg">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 shrink-0">
              <Smartphone className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="text-xs font-bold text-white flex items-center gap-1.5 truncate">
                <span>{language === 'bn' ? 'মোবাইলে সাধারণ অ্যাপের মতো ব্যবহার করুন' : 'Install as Mobile App'}</span>
                <span className="text-[9px] px-1.5 py-0.2 rounded bg-emerald-500/30 text-emerald-300 font-normal">
                  PWA
                </span>
              </div>
              <p className="text-[11px] text-slate-300 truncate">
                {language === 'bn' ? 'হোম স্ক্রিনে যুক্ত করে ১-ক্লিকে ওপেন ও অফলাইন সাপোর্ট' : 'Add to home screen for 1-tap open & offline use'}
              </p>
            </div>
          </div>
          <button
            onClick={onOpenInstallGuide}
            id="btn-dash-install-guide"
            className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shrink-0 flex items-center gap-1.5 shadow-md transition active:scale-95 cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>{language === 'bn' ? 'ইন্সটল করুন' : 'Install App'}</span>
          </button>
        </div>
      )}

      {/* Live Multi-Device Staff Presence & Real-Time Sync Monitor */}
      <div className="p-4 sm:p-5 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800/80 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0">
              <Radio className="w-4 h-4 animate-pulse text-emerald-400" />
            </div>
            <div>
              <h3 className="text-xs sm:text-sm font-bold text-white flex items-center gap-2">
                <span>{language === 'bn' ? 'মাল্টি-ডিভাইস ও স্টাফ লাইভ উপস্থিতি' : 'Live Staff & Multi-Device Presence'}</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-semibold">
                  {language === 'bn' ? 'অটো-সিঙ্ক সক্রিয়' : 'Real-Time Sync Active'}
                </span>
              </h3>
              <p className="text-[11px] text-slate-400">
                {language === 'bn'
                  ? 'এডমিন, ক্যাশ কাউন্টার ও ডিএসআর ডিভাইসগুলোর অনলাইন/অফলাইন অবস্থান'
                  : 'Monitor live connection of Admin, Cash Counter, and DSR devices'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={openStaffSyncModal}
              id="btn-dash-open-staff-sync"
              className="px-3 py-1.5 rounded-xl bg-indigo-600/90 hover:bg-indigo-600 text-white font-bold text-xs flex items-center gap-1.5 transition active:scale-95 cursor-pointer shadow-sm"
              title="ডিএসআর ও কাউন্টার মেমো সিঙ্ক হাব"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>{language === 'bn' ? 'স্টাফ সিঙ্ক হাব' : 'Staff Sync Hub'}</span>
            </button>
            <button
              type="button"
              onClick={openBackupModal}
              id="btn-dash-open-gdrive-backup"
              className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-bold text-xs flex items-center gap-1.5 transition active:scale-95 cursor-pointer shadow-sm"
              title="গুগল ড্রাইভ ও ক্লাউড ব্যাকআপ"
            >
              <Cloud className="w-3.5 h-3.5 text-sky-400" />
              <span>{language === 'bn' ? 'গুগল ড্রাইভ ও ব্যাকআপ' : 'Google Drive & Backup'}</span>
            </button>
            <button
              type="button"
              onClick={() => setIsFleetModalOpen(true)}
              id="btn-dash-open-fleet-modal"
              className="px-3 py-1.5 rounded-xl bg-purple-700 hover:bg-purple-600 text-white font-bold text-xs flex items-center gap-1.5 transition active:scale-95 cursor-pointer shadow-sm relative"
              title="সকল কানেক্টেড মোবাইল ও কম্পিউটার ডিভাইস ও পেন্ডিং ফাইলস তালিকা"
            >
              <Smartphone className="w-3.5 h-3.5 text-purple-200" />
              <span>{language === 'bn' ? 'কানেক্টেড ডিভাইস ও পেন্ডিং' : 'Devices & Pending Files'}</span>
              {totalPendingCount > 0 && (
                <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-amber-400 text-slate-950 font-mono animate-bounce">
                  {totalPendingCount}
                </span>
              )}
            </button>
            <button
              type="button"
              onClick={downloadLocalBackupJSON}
              id="btn-dash-download-master-json"
              className="px-3 py-1.5 rounded-xl bg-emerald-700 hover:bg-emerald-600 text-white font-bold text-xs flex items-center gap-1.5 transition active:scale-95 cursor-pointer shadow-sm"
              title="সকল হিসাবের ব্যাকআপ ফাইল ডাউনলোড করুন"
            >
              <Download className="w-3.5 h-3.5" />
              <span>{language === 'bn' ? 'মাস্টার ব্যাকআপ (.JSON)' : 'Master JSON'}</span>
            </button>
          </div>
        </div>

        {/* 3 Staff Presence Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-1">
          {allStaffPresences.map((staff) => {
            const isDsr = staff.role === 'dsr';
            const isCounter = staff.role === 'counter';
            const isAdmin = staff.role === 'admin';

            return (
              <div
                key={staff.id}
                className={`p-3 rounded-xl border transition flex items-center justify-between gap-3 ${
                  staff.isOnline
                    ? 'bg-slate-950/90 border-emerald-500/40 shadow-sm'
                    : 'bg-slate-950/50 border-slate-800/80 opacity-80'
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div
                    className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border ${
                      isAdmin
                        ? 'bg-amber-950/60 text-amber-400 border-amber-500/40'
                        : isCounter
                        ? 'bg-emerald-950/60 text-emerald-400 border-emerald-500/40'
                        : 'bg-sky-950/60 text-sky-400 border-sky-500/40'
                    }`}
                  >
                    {isAdmin && <Shield className="w-4 h-4" />}
                    {isCounter && <Laptop className="w-4 h-4" />}
                    {isDsr && <Truck className="w-4 h-4" />}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="font-bold text-xs text-white truncate">{staff.bnName || staff.name}</span>
                    </div>
                    <p className="text-[10px] text-slate-400 font-mono flex items-center gap-1">
                      <span>📞 {staff.phone}</span>
                      <span className="text-slate-600">•</span>
                      <span className="truncate">{staff.deviceText}</span>
                    </p>
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <div className="flex items-center justify-end gap-1.5">
                    <span
                      className={`w-2 h-2 rounded-full ${
                        staff.isOnline ? 'bg-emerald-400 animate-ping' : 'bg-slate-500'
                      }`}
                    />
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                        staff.isOnline
                          ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                          : 'bg-slate-800 text-slate-400 border-slate-700'
                      }`}
                    >
                      {staff.isOnline
                        ? language === 'bn'
                          ? 'অনলাইন'
                          : 'Online'
                        : language === 'bn'
                        ? 'অফলাইন'
                        : 'Offline'}
                    </span>
                  </div>
                  <span className="text-[9px] text-slate-400 block mt-0.5">
                    {staff.lastActiveText}
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Pending Offline Files Alert Banner */}
        {totalPendingCount > 0 && (
          <div className="mt-2.5 p-3 rounded-xl bg-amber-950/60 border border-amber-500/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs animate-in fade-in">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-amber-500/20 text-amber-400 border border-amber-500/40 flex items-center justify-center shrink-0 font-bold">
                ⚠️
              </div>
              <div>
                <span className="font-bold text-amber-200 block text-xs sm:text-sm">
                  {language === 'bn'
                    ? `সতর্কতা: স্টাফ ডিভাইসে মোট ${totalPendingCount}টি অফলাইন ফাইল পেন্ডিং রয়েছে!`
                    : `Alert: ${totalPendingCount} offline pending files found across staff devices!`}
                </span>
                <p className="text-[11px] text-amber-300/80 mt-0.5">
                  {language === 'bn'
                    ? 'এডমিন প্যানেল থেকে এই ফাইলগুলো সরাসরি ক্লাউড ডাটাবেসে আপলোড করতে পারেন অথবা ক্লিয়ার করে ইমার্জেন্সি ব্যাকআপে রাখতে পারেন।'
                    : 'Upload these pending files to cloud database or clear them to an emergency backup.'}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setIsFleetModalOpen(true)}
              className="px-3 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs flex items-center gap-1.5 shrink-0 transition active:scale-95 cursor-pointer shadow-sm"
            >
              <Smartphone className="w-3.5 h-3.5" />
              <span>{language === 'bn' ? 'পেন্ডিং ফাইল কন্ট্রোল ও আপলোড' : 'Manage Pending Files'}</span>
            </button>
          </div>
        )}
      </div>

      {/* Quick Recovery Banner if Accounts or Sales are 0/empty */}
      {(orders.length === 0 || products.length === 0) && (
        <div className="p-4 rounded-2xl bg-gradient-to-r from-amber-950/80 via-slate-900 to-emerald-950/70 border border-amber-500/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xl shadow-amber-950/30 animate-in fade-in">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 shrink-0">
              <Database className="w-5 h-5 text-amber-300" />
            </div>
            <div className="min-w-0">
              <div className="text-xs sm:text-sm font-bold text-white flex items-center gap-1.5">
                <span>{language === 'bn' ? 'সকল হিসাব ও সেলস রিস্টোর করুন' : 'Restore All Accounts & Sales Data'}</span>
                <span className="text-[9px] px-1.5 py-0.2 rounded-full bg-amber-500/30 text-amber-300 font-bold border border-amber-500/40">
                  {language === 'bn' ? 'রিস্টোর' : 'Restore'}
                </span>
              </div>
              <p className="text-[11px] text-slate-300 mt-0.5">
                {language === 'bn'
                  ? 'সকল পণ্য ক্যাটালগ, কাস্টমার/দোকানদার বকেয়া, বিক্রয় মেমো এবং সাপ্লায়ার লেজার ১-ক্লিকে লোড করুন।'
                  : 'Restore all products catalog, customer dues, sales invoices and supplier ledgers in one click.'}
              </p>
            </div>
          </div>
          <button
            onClick={handleQuickRestore}
            disabled={isRestoringData}
            id="btn-dash-restore-data"
            className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shrink-0 flex items-center justify-center gap-2 shadow-lg shadow-emerald-950/50 transition active:scale-95 cursor-pointer disabled:opacity-50"
          >
            {isRestoringData ? (
              <>
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                <span>{language === 'bn' ? 'রিস্টোর হচ্ছে...' : 'Restoring...'}</span>
              </>
            ) : (
              <>
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-200" />
                <span>{language === 'bn' ? 'হিসাব ও সেল লোড করুন' : 'Load Accounts & Sales'}</span>
              </>
            )}
          </button>
        </div>
      )}

      {/* Dealer ERP Monthly & Daily KPI Summary Grid (Mirrors the Screenshot Cards) */}
      <DealerDashboardGrid
        onNavigateTab={onNavigateTab}
        onOpenScanner={onOpenScanner}
      />

      {/* Dual Cash Balances & Direct Payment Flow (Admin Cash vs DSR/Counter Field Cash) */}
      {currentRole !== 'retailer' && (
        <DualCashBalanceWidget
          onOpenInvestModal={openInvestModal}
          onOpenCompanyPaymentModal={openCompanyPaymentModal}
          onOpenPayAdminModal={openPayAdminModal}
          onOpenCashTransfers={() => onNavigateTab('transfers')}
          onOpenCashDrawerStatement={onOpenCashDrawerStatement}
        />
      )}

      {/* PDF Statements Hub Banner */}
      {onOpenAllStatements && currentRole !== 'retailer' && (
        <div className="p-3.5 rounded-2xl bg-gradient-to-r from-emerald-950/70 via-slate-900 to-teal-950/70 border border-emerald-500/40 shadow-xl flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 shrink-0">
              <FileText className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 font-bold text-xs sm:text-sm text-white">
                <span>{language === 'bn' ? 'সকল স্টেটমেন্ট ও বিক্রয় লাভ খাতা (PDF)' : 'Statements & Profit Reports (PDF)'}</span>
                <span className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-mono">
                  {language === 'bn' ? 'প্রফিট অডিট ও ডাউনলোড' : 'PROFIT AUDIT & PDF'}
                </span>
              </div>
              <p className="text-[11px] text-slate-400 truncate">
                {language === 'bn'
                  ? 'বিক্রয় লাভ স্টেটমেন্ট, ক্যাশ ভ্যালিডেশন, সাপ্লায়ার ও কাস্টমার লেজার, স্টক ও ব্যালেন্স শিট'
                  : 'Sales Profit Statement, Cash Audit, Supplier & Retailer Ledgers, Stock & Balance Sheet'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={onOpenAllStatements}
              id="btn-dash-open-all-statements"
              className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shrink-0 flex items-center gap-1.5 shadow-md transition active:scale-95 cursor-pointer"
            >
              <TrendingUp className="w-3.5 h-3.5" />
              <span>{language === 'bn' ? 'লাভ স্টেটমেন্ট ও অন্যান্য' : 'View Statements'}</span>
            </button>
          </div>
        </div>
      )}

      {/* Quick Action Grid (1-Tap Fast Triggers) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5">
        {/* Memo & Khata Scanner (Counter & DSR Sales & Replacement) */}
        <button
          onClick={() => openMemoKhataScanner(currentRole === 'dsr' ? 'DSR' : 'COUNTER')}
          id="quick-action-scan-memo-khata"
          className="p-3.5 rounded-2xl bg-gradient-to-br from-teal-950/50 via-slate-900 to-emerald-950/40 border border-teal-500/40 hover:border-teal-400 transition-all flex flex-col items-start justify-between gap-3 text-left group shadow-lg active:scale-95 cursor-pointer ring-1 ring-teal-500/20"
        >
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-teal-500 to-emerald-600 flex items-center justify-center text-white shadow-md group-hover:scale-105 transition">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <div className="font-bold text-xs sm:text-sm text-white flex items-center gap-1">
              <span>{language === 'bn' ? 'মেমো/খাতা স্ক্যান' : 'Memo/Khata Scan'}</span>
              <span className="text-[9px] px-1 bg-emerald-500/30 text-emerald-300 rounded font-normal">
                NEW
              </span>
            </div>
            <p className="text-[11px] text-slate-400 mt-0.5 line-clamp-1">
              {language === 'bn' ? 'সেলস ও রিপ্লেস হিসাব' : 'Sales & Replacement'}
            </p>
          </div>
        </button>

        {/* AI Scanner Button */}
        <button
          onClick={onOpenScanner}
          id="quick-action-scan-ai"
          className="p-3.5 rounded-2xl bg-gradient-to-br from-rose-950/40 via-slate-900 to-amber-950/40 border border-rose-500/30 hover:border-rose-500/60 transition-all flex flex-col items-start justify-between gap-3 text-left group shadow-lg active:scale-95 cursor-pointer"
        >
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-rose-500 to-amber-500 flex items-center justify-center text-white shadow-md group-hover:scale-105 transition">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <div className="font-bold text-xs sm:text-sm text-white flex items-center gap-1">
              <span>{t.scanAI}</span>
              <span className="text-[9px] px-1 bg-rose-500/30 text-rose-300 rounded font-normal">
                Flash
              </span>
            </div>
            <p className="text-[11px] text-slate-400 mt-0.5 line-clamp-1">
              {language === 'bn' ? 'চালানের ছবি থেকে স্টক' : 'Auto extract stock'}
            </p>
          </div>
        </button>

        {/* Cash Transfer Button */}
        <button
          onClick={onOpenCashTransfer}
          id="quick-action-cash-transfer"
          className="p-3.5 rounded-2xl bg-gradient-to-br from-emerald-950/40 via-slate-900 to-teal-950/40 border border-emerald-500/30 hover:border-emerald-500/60 transition-all flex flex-col items-start justify-between gap-3 text-left group shadow-lg active:scale-95 cursor-pointer"
        >
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-white shadow-md group-hover:scale-105 transition">
            <Coins className="w-5 h-5" />
          </div>
          <div>
            <div className="font-bold text-xs sm:text-sm text-white">
              {t.cashTransferTitle}
            </div>
            <p className="text-[11px] text-slate-400 mt-0.5 line-clamp-1">
              {language === 'bn' ? 'ক্যাশ হস্তান্তর ও গ্রহণ' : 'Handover & Accept'}
            </p>
          </div>
        </button>

        {/* Phonebook Retailer Picker */}
        <button
          onClick={onOpenPhonebook}
          id="quick-action-phonebook"
          className="p-3.5 rounded-2xl bg-gradient-to-br from-sky-950/40 via-slate-900 to-indigo-950/40 border border-sky-500/30 hover:border-sky-500/60 transition-all flex flex-col items-start justify-between gap-3 text-left group shadow-lg active:scale-95 cursor-pointer"
        >
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-sky-500 to-indigo-600 flex items-center justify-center text-white shadow-md group-hover:scale-105 transition">
            <BookUser className="w-5 h-5" />
          </div>
          <div>
            <div className="font-bold text-xs sm:text-sm text-white">
              {t.importPhonebook}
            </div>
            <p className="text-[11px] text-slate-400 mt-0.5 line-clamp-1">
              {language === 'bn' ? 'ফোনবুক থেকে রিটেইলার' : 'Phone contact picker'}
            </p>
          </div>
        </button>

        {/* New POS Order Memo */}
        <button
          onClick={() => onNavigateTab('pos')}
          id="quick-action-pos"
          className="p-3.5 rounded-2xl bg-gradient-to-br from-purple-950/40 via-slate-900 to-slate-900 border border-purple-500/30 hover:border-purple-500/60 transition-all flex flex-col items-start justify-between gap-3 text-left group shadow-lg active:scale-95 cursor-pointer"
        >
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center text-white shadow-md group-hover:scale-105 transition">
            <ShoppingCart className="w-5 h-5" />
          </div>
          <div>
            <div className="font-bold text-xs sm:text-sm text-white">
              {t.posTitle}
            </div>
            <p className="text-[11px] text-slate-400 mt-0.5 line-clamp-1">
              {language === 'bn' ? 'নতুন পাইকারি চালান' : 'New Sales Memo'}
            </p>
          </div>
        </button>
      </div>

      {/* Admin Staff & Team Management Banner (Add DSR & Counter for cross-device login) */}
      {currentRole === 'admin' && (
        <div className="p-4 rounded-2xl bg-gradient-to-r from-blue-950/60 via-slate-900 to-indigo-950/50 border border-blue-500/40 shadow-lg flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600/30 border border-blue-500/50 flex items-center justify-center text-blue-400 shrink-0 mt-0.5">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-white text-sm sm:text-base">
                  {language === 'bn'
                    ? 'স্টাফ ও টিম ম্যানেজমেন্ট (DSR ও ক্যাশ কাউন্টার)'
                    : 'Staff Management (DSR & Cash Counter)'}
                </h3>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/30">
                  {language === 'bn' ? 'অন্য মোবাইল/পিসি লগইন' : 'Multi-Device Login'}
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-1 max-w-2xl leading-relaxed">
                {language === 'bn'
                  ? 'এডমিন এখান থেকে DSR ও ক্যাশ কাউন্টার কর্মী যোগ করে দিবে। পরবর্তীতে কর্মীরা তাদের মোবাইল নম্বর ও পিন দিয়ে যেকোনো অন্য মোবাইল বা কম্পিউটারে লগইন করতে পারবে।'
                  : 'Add DSR field sales and Cash Counter staff with phone & PIN. Staff can independently log in from any mobile phone or computer.'}
              </p>
            </div>
          </div>

          <button
            onClick={openStaffManagement}
            id="btn-admin-manage-staff-dashboard"
            className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs flex items-center gap-2 shadow-lg shadow-blue-900/30 active:scale-95 transition shrink-0 cursor-pointer"
          >
            <Users className="w-4 h-4" />
            <span>{language === 'bn' ? 'স্টাফ যুক্ত / ম্যানেজ করুন' : 'Manage Staff & PINs'}</span>
          </button>
        </div>
      )}

      {/* Urgent Action: Incoming Cash Transfer Alerts */}
      {incomingPending.length > 0 && (
        <div className="p-4 rounded-2xl bg-gradient-to-r from-amber-950/50 via-slate-900 to-slate-900 border border-amber-500/50 shadow-lg space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Coins className="w-5 h-5 text-amber-400 animate-bounce" />
              <h3 className="font-bold text-white text-xs sm:text-sm">
                {language === 'bn'
                  ? 'আপনার জন্য অপেক্ষমান ক্যাশ গ্রহণ রিকুয়েস্ট!'
                  : 'Incoming Cash Transfer Awaiting Your Acceptance!'}
              </h3>
            </div>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300">
              {incomingPending.length} {language === 'bn' ? 'টি' : 'Pending'}
            </span>
          </div>

          <div className="space-y-2">
            {incomingPending.map((tr) => (
              <div
                key={tr.id}
                className="p-3 rounded-xl bg-slate-950/80 border border-amber-500/30 flex items-center justify-between gap-3"
              >
                <div>
                  <div className="font-bold text-xs text-white">
                    {tr.fromUserName} ➔ You
                  </div>
                  <div className="text-[11px] text-slate-400 mt-0.5 font-mono">
                    {tr.transferNo} • {tr.notes}
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <span className="font-mono-num font-extrabold text-sm text-emerald-400">
                    {formatCurrency(tr.amount, language)}
                  </span>
                  <button
                    onClick={() => acceptCashTransfer(tr.id)}
                    className="py-1.5 px-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-lg flex items-center gap-1 shadow-md active:scale-95 transition"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>{t.acceptCashBtn}</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Financial KPIs for Admin & Counter */}
      {currentRole === 'admin' && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          {/* Net Worth */}
          <div
            onClick={() => onNavigateTab('capital')}
            className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 hover:border-amber-500/40 transition cursor-pointer"
          >
            <span className="text-[10px] uppercase font-bold text-amber-400 flex items-center gap-1">
              <PieChart className="w-3.5 h-3.5 text-amber-400" />
              {t.totalNetWorth}
            </span>
            <p className="text-base sm:text-lg font-extrabold text-white font-mono-num mt-1">
              {formatCurrency(businessNetWorth, language)}
            </p>
            <span className="text-[10px] text-slate-400">Total Valuation</span>
          </div>

          {/* Liquid Cash */}
          <div
            onClick={() => onNavigateTab('transfers')}
            className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 hover:border-emerald-500/40 transition cursor-pointer"
          >
            <span className="text-[10px] uppercase font-bold text-emerald-400 flex items-center gap-1">
              <Coins className="w-3.5 h-3.5 text-emerald-400" />
              {t.liquidCashBalance}
            </span>
            <p className="text-base sm:text-lg font-extrabold text-emerald-400 font-mono-num mt-1">
              {formatCurrency(totalLiquidCash, language)}
            </p>
            <span className="text-[10px] text-slate-400">Vault, Drawers, Bank</span>
          </div>

          {/* Receivables */}
          <div
            onClick={() => onNavigateTab('pos')}
            className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 hover:border-sky-500/40 transition cursor-pointer"
          >
            <span className="text-[10px] uppercase font-bold text-sky-400 flex items-center gap-1">
              <Users className="w-3.5 h-3.5 text-sky-400" />
              {t.accountsReceivable}
            </span>
            <p className="text-base sm:text-lg font-extrabold text-sky-300 font-mono-num mt-1">
              {formatCurrency(totalReceivables, language)}
            </p>
            <span className="text-[10px] text-slate-400">Retailers Due</span>
          </div>

          {/* Payables */}
          <div
            onClick={() => onNavigateTab('suppliers')}
            className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 hover:border-rose-500/40 transition cursor-pointer"
          >
            <span className="text-[10px] uppercase font-bold text-rose-400 flex items-center gap-1">
              <Building2 className="w-3.5 h-3.5 text-rose-400" />
              {t.accountsPayable}
            </span>
            <p className="text-base sm:text-lg font-extrabold text-rose-400 font-mono-num mt-1">
              {formatCurrency(totalPayables, language)}
            </p>
            <span className="text-[10px] text-slate-400">Suppliers Due</span>
          </div>
        </div>
      )}

      {/* Dedicated Low Stock Alert Widget */}
      <LowStockAlertWidget
        onOpenScanner={onOpenScanner}
        onNavigateTab={onNavigateTab}
      />

      {/* Weekly Stock Movement & Inventory Trends Report (Recharts) */}
      <WeeklyStockMovementReport
        onOpenScanner={onOpenScanner}
        onNavigateTab={onNavigateTab}
      />

      {/* Two Column Grid: Pending Replacements & Recent Orders */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Pending Damage Claims (5 cols) */}
        <div className="lg:col-span-5 space-y-3">
          <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-white text-xs sm:text-sm flex items-center gap-2">
                <RotateCcw className="w-4 h-4 text-rose-400" />
                <span>{language === 'bn' ? 'নষ্ট পণ্যের দাবি' : 'Damage Claims'}</span>
              </h3>
              <button
                onClick={() => onNavigateTab('replacements')}
                className="text-[11px] text-amber-400 hover:underline flex items-center gap-0.5"
              >
                <span>{language === 'bn' ? 'সবগুলো' : 'View All'}</span>
                <ChevronRight className="w-3 h-3" />
              </button>
            </div>

            <div className="space-y-2">
              {pendingReplacements.length === 0 ? (
                <div className="py-4 text-center text-slate-500 text-xs">
                  {language === 'bn' ? 'কোনো অপেক্ষমান ড্যামেজ দাবি নেই' : 'No pending damage claims.'}
                </div>
              ) : (
                pendingReplacements.slice(0, 4).map((r) => {
                  const claimValue = r.estimatedValue ?? r.totalAdjustmentValue ?? 0;
                  const partyDisplayName = r.partyName || r.entityName || (r.partyType === 'RETAILER' ? 'Retailer' : 'Supplier');
                  return (
                    <div
                      key={r.id}
                      className="p-2.5 rounded-xl bg-slate-950/70 border border-slate-800 flex items-center justify-between gap-2 text-xs"
                    >
                      <div>
                        <div className="font-bold text-white truncate max-w-[150px]">{r.productName}</div>
                        <div className="text-[10px] text-rose-400">{r.reason}</div>
                      </div>
                      <div className="text-right">
                        <span className="font-bold font-mono-num text-white">
                          {formatCurrency(claimValue, language)}
                        </span>
                        <span className="text-[10px] block text-amber-400">{partyDisplayName}</span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* Recent Wholesale Orders & Scanned Supplier Challans (7 cols) */}
        <div className="lg:col-span-7">
          <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <h3 className="font-bold text-white text-xs sm:text-sm flex items-center gap-2">
                <FileText className="w-4 h-4 text-emerald-400" />
                <span>{language === 'bn' ? 'সাম্প্রতিক চালান ও বিক্রয় মেমো' : 'Recent Invoices & Memos'}</span>
              </h3>
              
              <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800 text-[11px]">
                <button
                  type="button"
                  onClick={() => setRecentInvoiceTab('ALL')}
                  className={`px-2 py-0.5 rounded-lg font-bold transition ${
                    recentInvoiceTab === 'ALL' ? 'bg-emerald-600 text-white shadow' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {language === 'bn' ? 'সবগুলো' : 'All'}
                </button>
                <button
                  type="button"
                  onClick={() => setRecentInvoiceTab('PURCHASES')}
                  className={`px-2 py-0.5 rounded-lg font-bold transition flex items-center gap-1 ${
                    recentInvoiceTab === 'PURCHASES' ? 'bg-emerald-600 text-white shadow' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <span>{language === 'bn' ? 'ক্রয় চালান' : 'Purchases'}</span>
                  {scannedChallans.length > 0 && (
                    <span className="px-1 py-0.2 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px]">
                      {scannedChallans.length}
                    </span>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => setRecentInvoiceTab('ORDERS')}
                  className={`px-2 py-0.5 rounded-lg font-bold transition flex items-center gap-1 ${
                    recentInvoiceTab === 'ORDERS' ? 'bg-emerald-600 text-white shadow' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <span>{language === 'bn' ? 'বিক্রয় মেমো' : 'Sales'}</span>
                  {orders.length > 0 && (
                    <span className="px-1 py-0.2 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px]">
                      {orders.length}
                    </span>
                  )}
                </button>
              </div>
            </div>

            <div className="space-y-2.5">
              {/* Show Scanned Supplier Challans */}
              {(recentInvoiceTab === 'ALL' || recentInvoiceTab === 'PURCHASES') &&
                scannedChallans.slice(0, recentInvoiceTab === 'PURCHASES' ? 5 : 2).map((challan) => {
                  const sup = suppliers.find((s) => s.id === challan.supplierId);
                  return (
                    <div
                      key={challan.id}
                      onClick={() => onNavigateTab('suppliers')}
                      className="p-3 rounded-xl bg-slate-950/70 border border-emerald-900/40 hover:border-emerald-600/60 transition flex items-center justify-between gap-3 cursor-pointer group"
                    >
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                          <span className="px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] font-bold">
                            {language === 'bn' ? '📦 ক্রয় চালান' : '📦 Purchase'}
                          </span>
                          <span className="font-mono text-xs font-bold text-white">
                            #{challan.referenceNo || challan.id.slice(-6)}
                          </span>
                          <span className="text-[10px] text-slate-400">{challan.date}</span>
                        </div>
                        <div className="text-xs font-medium text-slate-200">
                          {challan.supplierName || sup?.name || 'Supplier'}
                        </div>
                        <div className="text-[11px] text-slate-500">
                          {challan.notes || 'Scanned supplier purchase invoice'}
                        </div>
                      </div>

                      <div className="text-right font-mono-num">
                        <span className="text-xs sm:text-sm font-bold text-emerald-400 block">
                          {formatCurrency(challan.amount, language)}
                        </span>
                        {sup && (
                          <span className="text-[10px] text-slate-400">
                            Paid: ৳{sup.totalPaid || 0} | <span className="text-rose-400 font-bold">Due: ৳{sup.outstandingPayable || 0}</span>
                          </span>
                        )}
                        <span className="text-[10px] text-emerald-400 group-hover:underline block mt-0.5">
                          {language === 'bn' ? 'খাতা দেখুন →' : 'View Ledger →'}
                        </span>
                      </div>
                    </div>
                  );
                })}

              {/* Show Sales Orders */}
              {(recentInvoiceTab === 'ALL' || recentInvoiceTab === 'ORDERS') &&
                orders.slice(0, recentInvoiceTab === 'ORDERS' ? 5 : 3).map((ord) => (
                  <div
                    key={ord.id}
                    onClick={() => onNavigateTab('pos')}
                    className="p-3 rounded-xl bg-slate-950/70 border border-slate-800/80 hover:border-slate-700 transition flex items-center justify-between gap-3 cursor-pointer"
                  >
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <span className="px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20 text-[10px] font-bold">
                          {language === 'bn' ? '🛒 বিক্রয়' : '🛒 Sale'}
                        </span>
                        <span className="font-mono text-xs font-bold text-white">{ord.invoiceNo}</span>
                        <span className="text-[10px] text-slate-400">{ord.date}</span>
                      </div>
                      <div className="text-xs font-medium text-slate-300">{ord.retailerName}</div>
                      <div className="text-[11px] text-slate-500">
                        By {ord.salesPersonName || ord.creatorName || 'Depot Team'} ({((ord.salesPersonRole || ord.creatorRole || 'Staff') as string).toUpperCase()})
                      </div>
                    </div>

                    <div className="text-right font-mono-num">
                      <span className="text-xs sm:text-sm font-bold text-emerald-400 block">
                        {formatCurrency(ord.totalAmount, language)}
                      </span>
                      <span className="text-[10px] text-slate-400">
                        Paid: ৳{ord.paidAmount} | <span className="text-rose-400 font-bold">Due: ৳{ord.dueAmount}</span>
                      </span>
                    </div>
                  </div>
                ))}

              {/* Empty state when neither exists */}
              {((recentInvoiceTab === 'ALL' && orders.length === 0 && scannedChallans.length === 0) ||
                (recentInvoiceTab === 'ORDERS' && orders.length === 0) ||
                (recentInvoiceTab === 'PURCHASES' && scannedChallans.length === 0)) && (
                <div className="py-6 text-center text-slate-500 text-xs">
                  {recentInvoiceTab === 'PURCHASES'
                    ? language === 'bn'
                      ? 'কোনো স্ক্যানকৃত ক্রয় চালান নেই'
                      : 'No scanned purchase challans.'
                    : recentInvoiceTab === 'ORDERS'
                    ? language === 'bn'
                      ? 'কোনো বিক্রয় মেমো নেই'
                      : 'No sales memos.'
                    : language === 'bn'
                    ? 'কোনো সাম্প্রতিক মেমো বা চালান নেই'
                    : 'No recent invoices or challans.'}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Admin Audit & Recent User Activity Panel */}
      <div className="pt-2">
        <RecentActivityPanel
          limit={6}
          showFilters={true}
          onViewAll={() => onNavigateTab('transfers')}
        />
      </div>

      {/* Connected Devices Fleet & Pending Files Manager Modal */}
      <ConnectedDevicesFleetModal
        isOpen={isFleetModalOpen}
        onClose={() => setIsFleetModalOpen(false)}
      />
    </div>
  );
};
