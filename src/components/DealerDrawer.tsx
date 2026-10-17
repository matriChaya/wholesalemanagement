import React, { useState } from 'react';
import { useWholesale } from '../context/WholesaleContext';
import { translations } from '../utils/translations';
import {
  LayoutDashboard,
  ShoppingCart,
  RotateCcw,
  Users,
  UserCheck,
  Target,
  CreditCard,
  ShoppingBag,
  AlertTriangle,
  Building2,
  Share2,
  Package,
  Sliders,
  Warehouse,
  TrendingUp,
  BarChart3,
  Receipt,
  CheckSquare,
  Sparkles,
  MessageCircle,
  Settings,
  Shield,
  BookOpen,
  Calculator,
  History,
  HardDrive,
  GraduationCap,
  Code2,
  X,
  Store,
  PieChart,
  Coins,
  Cloud,
  FileText,
  Download,
  RefreshCw,
  LogIn,
  LogOut
} from 'lucide-react';

export interface DealerDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  activeTab: string;
  onSelectTab: (tabId: string) => void;
  onOpenScannerModal: () => void;
  onOpenPhonebookModal: () => void;
  onOpenCashTransferModal: () => void;
  onOpenRoleModal: () => void;
  onOpenInstallModal: () => void;
  onOpenAllStatementsModal?: () => void;
  onOpenUpdateModal?: () => void;
  isUpdateAvailable?: boolean;
}

export const DealerDrawer: React.FC<DealerDrawerProps> = ({
  isOpen,
  onClose,
  activeTab,
  onSelectTab,
  onOpenScannerModal,
  onOpenPhonebookModal,
  onOpenCashTransferModal,
  onOpenRoleModal,
  onOpenInstallModal,
  onOpenAllStatementsModal,
  onOpenUpdateModal,
  isUpdateAvailable,
}) => {
  const {
    language,
    currentRole,
    currentUser,
    openStaffManagement,
    openBiometricSettings,
    openBusinessProfile,
    openResetModal,
    openBackupModal,
    openStaffSyncModal,
    openExpenseModal,
    isOnline,
    isSimulatedOffline,
    offlineQueueCount,
    isSyncingToCloud,
    openAuthModal,
    logout,
  } = useWholesale();

  const [activeCalculator, setActiveCalculator] = useState(false);
  const [calcInput, setCalcInput] = useState('');

  React.useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleNavClick = (tabId: string) => {
    onSelectTab(tabId);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex animate-in fade-in duration-200">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/75 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      {/* Drawer Panel */}
      <div className="relative w-80 max-w-[85vw] bg-[#0b101b] border-r border-slate-800 text-slate-100 flex flex-col h-full z-10 shadow-2xl overflow-hidden font-sans animate-in slide-in-from-left duration-300 ease-out">
        
        {/* Drawer Header */}
        <div className="px-4 py-4 bg-[#0d1424] border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-sky-600 flex items-center justify-center text-white font-black text-xl shadow-md">
              {currentUser.name ? currentUser.name.charAt(0).toUpperCase() : 'D'}
            </div>
            <div>
              <h2 className="text-lg font-bold text-white tracking-tight">
                {language === 'bn' ? 'ডিলারইআরপি' : 'Dealer ERP'}
              </h2>
              <span className="text-[11px] text-slate-400">
                {currentUser.enterpriseName || currentUser.shopName || (language === 'bn' ? 'হোলসেল ম্যানেজমেন্ট' : 'Wholesale Management')}
              </span>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800/80 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Navigation Sections */}
        <div className="flex-1 overflow-y-auto px-3 py-3 space-y-5 scrollbar-thin scrollbar-thumb-slate-800">

          {/* Section: Dashboard */}
          <div className="space-y-1">
            <div className="flex items-center gap-2 px-3 py-1 text-xs font-bold text-sky-400 uppercase tracking-wider border-b border-rose-900/60 pb-1 mb-1">
              <span>📊 {language === 'bn' ? 'ড্যাশবোর্ড' : 'Dashboard'}</span>
            </div>
            
            <button
              onClick={() => handleNavClick('dashboard')}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition ${
                activeTab === 'dashboard'
                  ? 'bg-slate-800/90 text-white shadow-sm border border-slate-700'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800/50'
              }`}
            >
              <LayoutDashboard className="w-4 h-4 text-sky-400" />
              <span>{language === 'bn' ? 'ড্যাশবোর্ড' : 'Dashboard'}</span>
            </button>
          </div>

          {/* Section: Sales Management (বিক্রয় ব্যবস্থাপনা) */}
          <div className="space-y-1">
            <div className="flex items-center gap-2 px-3 py-1 text-xs font-bold text-sky-400 uppercase tracking-wider border-b border-rose-900/60 pb-1 mb-1">
              <span>🛒 {language === 'bn' ? 'বিক্রয় ব্যবস্থাপনা' : 'Sales Management'}</span>
            </div>

            <button
              onClick={() => handleNavClick('pos')}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium transition ${
                activeTab === 'pos' ? 'bg-slate-800 text-white font-semibold' : 'text-slate-300 hover:text-white hover:bg-slate-800/50'
              }`}
            >
              <ShoppingCart className="w-4 h-4 text-slate-400" />
              <span>{language === 'bn' ? 'বিক্রয় (POS)' : 'Sales (POS)'}</span>
            </button>

            <button
              onClick={() => handleNavClick('pos_invoices')}
              className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium text-slate-300 hover:text-white hover:bg-slate-800/50 transition"
            >
              <RotateCcw className="w-4 h-4 text-slate-400" />
              <span>{language === 'bn' ? 'বিক্রয় চালান ও রিটার্ন' : 'Sales Invoices & Return'}</span>
            </button>

            <button
              onClick={() => {
                onOpenPhonebookModal();
                onClose();
              }}
              className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium text-slate-300 hover:text-white hover:bg-slate-800/50 transition"
            >
              <Users className="w-4 h-4 text-slate-400" />
              <span>{language === 'bn' ? 'গ্রাহক / রিটেইলার' : 'Customers / Retailers'}</span>
            </button>

            <button
              onClick={() => {
                openStaffManagement();
                onClose();
              }}
              className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium text-slate-300 hover:text-white hover:bg-slate-800/50 transition"
            >
              <UserCheck className="w-4 h-4 text-slate-400" />
              <span>{language === 'bn' ? 'ডিএসআর ও স্টাফ' : 'DSR & Field Staff'}</span>
            </button>

            <button
              onClick={() => handleNavClick('dashboard')}
              className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium text-slate-300 hover:text-white hover:bg-slate-800/50 transition"
            >
              <Target className="w-4 h-4 text-slate-400" />
              <span>{language === 'bn' ? 'টার্গেট ও পারফরম্যান্স' : 'Target & Performance'}</span>
            </button>

            <button
              onClick={() => {
                onOpenCashTransferModal();
                onClose();
              }}
              className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium text-slate-300 hover:text-white hover:bg-slate-800/50 transition"
            >
              <CreditCard className="w-4 h-4 text-slate-400" />
              <span>{language === 'bn' ? 'আদায় (Collection)' : 'Collection'}</span>
            </button>
          </div>

          {/* Section: Purchase Management (ক্রয় ব্যবস্থাপনা) */}
          <div className="space-y-1">
            <div className="flex items-center gap-2 px-3 py-1 text-xs font-bold text-sky-400 uppercase tracking-wider border-b border-rose-900/60 pb-1 mb-1">
              <span>📥 {language === 'bn' ? 'ক্রয় ব্যবস্থাপনা' : 'Purchase Management'}</span>
            </div>

            <button
              onClick={() => {
                onOpenScannerModal();
                onClose();
              }}
              className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium text-slate-300 hover:text-white hover:bg-slate-800/50 transition"
            >
              <ShoppingBag className="w-4 h-4 text-slate-400" />
              <span>{language === 'bn' ? 'ক্রয় চালান (AI স্ক্যান)' : 'Purchase / Invoice Scan'}</span>
            </button>

            <button
              onClick={() => handleNavClick('replacements')}
              className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium text-slate-300 hover:text-white hover:bg-slate-800/50 transition"
            >
              <AlertTriangle className="w-4 h-4 text-slate-400" />
              <span>{language === 'bn' ? 'ড্যামেজ চালান' : 'Damage Invoices'}</span>
            </button>

            <button
              onClick={() => handleNavClick('replacements')}
              className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium text-slate-300 hover:text-white hover:bg-slate-800/50 transition"
            >
              <RotateCcw className="w-4 h-4 text-slate-400" />
              <span>{language === 'bn' ? 'ক্রয় রিটার্ন' : 'Purchase Return'}</span>
            </button>

            <button
              onClick={() => handleNavClick('suppliers')}
              className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium text-slate-300 hover:text-white hover:bg-slate-800/50 transition"
            >
              <Building2 className="w-4 h-4 text-slate-400" />
              <span>{language === 'bn' ? 'সরবরাহকারী (সাপ্লায়ার)' : 'Suppliers'}</span>
            </button>

            <button
              onClick={() => handleNavClick('suppliers')}
              className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium text-slate-300 hover:text-white hover:bg-slate-800/50 transition"
            >
              <CreditCard className="w-4 h-4 text-slate-400" />
              <span>{language === 'bn' ? 'সরবরাহকারী পেমেন্ট' : 'Supplier Payment'}</span>
            </button>
          </div>

          {/* Section: Inventory Management (ইনভেন্টরি ব্যবস্থাপনা) */}
          <div className="space-y-1">
            <div className="flex items-center gap-2 px-3 py-1 text-xs font-bold text-sky-400 uppercase tracking-wider border-b border-rose-900/60 pb-1 mb-1">
              <span>📦 {language === 'bn' ? 'ইনভেন্টরি ব্যবস্থাপনা' : 'Inventory Management'}</span>
            </div>

            <button
              onClick={() => handleNavClick('pos_products')}
              className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium text-slate-300 hover:text-white hover:bg-slate-800/50 transition"
            >
              <Package className="w-4 h-4 text-slate-400" />
              <span>{language === 'bn' ? 'ইনভেন্টরি ও পণ্য তালিকা' : 'Inventory & Products'}</span>
            </button>

            <button
              onClick={() => handleNavClick('pos_products')}
              className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium text-slate-300 hover:text-white hover:bg-slate-800/50 transition"
            >
              <Sliders className="w-4 h-4 text-slate-400" />
              <span>{language === 'bn' ? 'স্টক অ্যাডজাস্টমেন্ট' : 'Stock Adjustment'}</span>
            </button>

            <button
              onClick={() => handleNavClick('pos_products')}
              className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium text-slate-300 hover:text-white hover:bg-slate-800/50 transition"
            >
              <Warehouse className="w-4 h-4 text-slate-400" />
              <span>{language === 'bn' ? 'গুদাম / ওয়্যারহাউজ' : 'Warehouse'}</span>
            </button>

            <button
              onClick={() => handleNavClick('replacements')}
              className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium text-slate-300 hover:text-white hover:bg-slate-800/50 transition"
            >
              <AlertTriangle className="w-4 h-4 text-slate-400" />
              <span>{language === 'bn' ? 'ড্যামেজ স্টক' : 'Damage Stock'}</span>
            </button>
          </div>

          {/* Section: Finance & Reports (অর্থ ও রিপোর্ট) */}
          <div className="space-y-1">
            <div className="flex items-center gap-2 px-3 py-1 text-xs font-bold text-sky-400 uppercase tracking-wider border-b border-rose-900/60 pb-1 mb-1">
              <span>💰 {language === 'bn' ? 'অর্থ ও রিপোর্ট' : 'Finance & Reports'}</span>
            </div>

            <button
              onClick={() => handleNavClick('capital')}
              className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium text-slate-300 hover:text-white hover:bg-slate-800/50 transition"
            >
              <TrendingUp className="w-4 h-4 text-slate-400" />
              <span>{language === 'bn' ? 'লাভ-ক্ষতি ও মূলধন' : 'Profit-Loss & Capital'}</span>
            </button>

            <button
              onClick={() => handleNavClick('capital')}
              className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium text-slate-300 hover:text-white hover:bg-slate-800/50 transition"
            >
              <BarChart3 className="w-4 h-4 text-slate-400" />
              <span>{language === 'bn' ? 'রিপোর্ট ও বিশ্লেষণ' : 'Reports & Analytics'}</span>
            </button>

            <button
              onClick={() => {
                openExpenseModal();
                onClose();
              }}
              className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium text-amber-300 hover:text-white hover:bg-slate-800/50 transition cursor-pointer"
            >
              <Receipt className="w-4 h-4 text-amber-400" />
              <span>{language === 'bn' ? 'দৈনিক খরচ ও বেতন খাতা' : 'Daily Expenses & Wages'}</span>
            </button>

            <button
              onClick={() => handleNavClick('transfers')}
              className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium text-slate-300 hover:text-white hover:bg-slate-800/50 transition"
            >
              <CheckSquare className="w-4 h-4 text-slate-400" />
              <span>{language === 'bn' ? 'ক্যাশ মিলাই (হিসাব মেলানো)' : 'Cash Reconciliation'}</span>
            </button>

            {onOpenAllStatementsModal && (
              <button
                onClick={() => {
                  onOpenAllStatementsModal();
                  onClose();
                }}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-bold text-emerald-300 bg-emerald-950/50 hover:bg-emerald-900/60 border border-emerald-500/40 transition shadow-sm"
              >
                <FileText className="w-4 h-4 text-emerald-400" />
                <span>{language === 'bn' ? '📄 সকল স্টেটমেন্ট ও PDF রিপোর্ট' : '📄 All Statements & PDF'}</span>
              </button>
            )}

            <button
              onClick={() => {
                openBusinessProfile();
                onClose();
              }}
              className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium text-amber-300 hover:text-amber-200 hover:bg-amber-950/40 border border-amber-500/30 transition"
            >
              <Building2 className="w-4 h-4 text-amber-400" />
              <span>{language === 'bn' ? 'অফিশিয়াল প্যাড ও ঠিকানা সেটিংস' : 'Official Pad & Business Profile'}</span>
            </button>
          </div>

          {/* Section: AI & Automation (AI ও অটোমেশন) */}
          <div className="space-y-1">
            <div className="flex items-center gap-2 px-3 py-1 text-xs font-bold text-sky-400 uppercase tracking-wider border-b border-rose-900/60 pb-1 mb-1">
              <span>🤖 {language === 'bn' ? 'AI ও অটোমেশন' : 'AI & Automation'}</span>
            </div>

            <button
              onClick={() => {
                onOpenScannerModal();
                onClose();
              }}
              className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium text-slate-300 hover:text-white hover:bg-slate-800/50 transition"
            >
              <Sparkles className="w-4 h-4 text-amber-400" />
              <span>{language === 'bn' ? 'AI ইনসাইটস ও স্ক্যানার' : 'AI Insights & Scanner'}</span>
            </button>

            <a
              href="https://wa.me"
              target="_blank"
              rel="noreferrer"
              className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium text-slate-300 hover:text-white hover:bg-slate-800/50 transition"
            >
              <MessageCircle className="w-4 h-4 text-emerald-400" />
              <span>{language === 'bn' ? 'হোয়াটসঅ্যাপ মেমো শেয়ার' : 'WhatsApp Share'}</span>
            </a>
          </div>

          {/* Section: System & Tools (সিস্টেম ও টুলস) */}
          <div className="space-y-1">
            <div className="flex items-center gap-2 px-3 py-1 text-xs font-bold text-sky-400 uppercase tracking-wider border-b border-rose-900/60 pb-1 mb-1">
              <span>⚙️ {language === 'bn' ? 'সিস্টেম ও টুলস' : 'System & Tools'}</span>
            </div>

            <button
              onClick={() => {
                openBiometricSettings();
                onClose();
              }}
              className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium text-slate-300 hover:text-white hover:bg-slate-800/50 transition"
            >
              <Settings className="w-4 h-4 text-slate-400" />
              <span>{language === 'bn' ? 'সেটিংস ও বায়োমেট্রিক' : 'Settings & Biometrics'}</span>
            </button>

            <button
              onClick={() => {
                openStaffManagement();
                onClose();
              }}
              className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium text-slate-300 hover:text-white hover:bg-slate-800/50 transition"
            >
              <Shield className="w-4 h-4 text-slate-400" />
              <span>{language === 'bn' ? 'স্টাফ একাউন্টস' : 'Staff Accounts'}</span>
            </button>

            <button
              onClick={() => {
                openBusinessProfile();
                onClose();
              }}
              className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium text-slate-300 hover:text-white hover:bg-slate-800/50 transition"
            >
              <Warehouse className="w-4 h-4 text-amber-400" />
              <span>{language === 'bn' ? 'কোম্পানি ঠিকানা ও গুদামঘর' : 'Warehouse & Company Address'}</span>
            </button>

            <button
              onClick={() => setActiveCalculator(!activeCalculator)}
              className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium text-slate-300 hover:text-white hover:bg-slate-800/50 transition"
            >
              <Calculator className="w-4 h-4 text-sky-400" />
              <span>{language === 'bn' ? 'ক্যালকুলেটর' : 'Calculator'}</span>
            </button>

            {activeCalculator && (
              <div className="p-3 bg-slate-900 rounded-xl border border-slate-800 space-y-2">
                <input
                  type="text"
                  readOnly
                  value={calcInput || '0'}
                  className="w-full px-2 py-1.5 bg-slate-950 text-right text-sm font-mono text-emerald-400 rounded border border-slate-800"
                />
                <div className="grid grid-cols-4 gap-1 text-xs">
                  {['7','8','9','/','4','5','6','*','1','2','3','-','C','0','=','+'].map((btn) => (
                    <button
                      key={btn}
                      type="button"
                      onClick={() => {
                        if (btn === 'C') setCalcInput('');
                        else if (btn === '=') {
                          try {
                            // eslint-disable-next-line no-eval
                            setCalcInput(String(Function(`'use strict'; return (${calcInput})`)()));
                          } catch {
                            setCalcInput('Error');
                          }
                        } else {
                          setCalcInput((prev) => prev + btn);
                        }
                      }}
                      className="p-1.5 bg-slate-800 hover:bg-slate-700 rounded text-slate-200 font-bold transition text-center"
                    >
                      {btn}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <button
              onClick={() => handleNavClick('transfers')}
              className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium text-slate-300 hover:text-white hover:bg-slate-800/50 transition"
            >
              <History className="w-4 h-4 text-slate-400" />
              <span>{language === 'bn' ? 'অ্যাক্টিভিটি লগ' : 'Activity Log'}</span>
            </button>

            <button
              onClick={() => {
                openBackupModal();
                onClose();
              }}
              className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-sm font-medium text-sky-300 hover:text-white hover:bg-sky-950/50 border border-sky-500/30 transition"
            >
              <div className="flex items-center gap-3">
                <Cloud className="w-4 h-4 text-sky-400" />
                <span>{language === 'bn' ? 'ক্লাউড ব্যাকআপ ও সিঙ্ক' : 'Cloud Backup & Sync'}</span>
              </div>
              {offlineQueueCount > 0 && (
                <span className="text-[10px] bg-amber-500/20 text-amber-300 px-1.5 py-0.5 rounded-full border border-amber-500/40 animate-pulse">
                  {offlineQueueCount}
                </span>
              )}
            </button>

            <button
              onClick={() => {
                openStaffSyncModal();
                onClose();
              }}
              className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium text-indigo-300 hover:text-white hover:bg-indigo-950/50 border border-indigo-500/30 transition"
            >
              <RefreshCw className="w-4 h-4 text-indigo-400" />
              <span>{language === 'bn' ? 'স্টাফ ডাটা আপডেট (মাল্টি-ডিভাইস)' : 'Multi-Device Staff Data Sync'}</span>
            </button>

            <button
              onClick={() => {
                openResetModal();
                onClose();
              }}
              className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium text-rose-300 hover:text-rose-200 hover:bg-rose-950/40 transition"
            >
              <HardDrive className="w-4 h-4 text-rose-400" />
              <span>{language === 'bn' ? 'ব্যাকআপ ও রিসেট' : 'Backup & Reset'}</span>
            </button>
          </div>

          {/* Section: Help & Info (সাহায্য ও তথ্য) */}
          <div className="space-y-1">
            <div className="flex items-center gap-2 px-3 py-1 text-xs font-bold text-sky-400 uppercase tracking-wider border-b border-rose-900/60 pb-1 mb-1">
              <span>🎓 {language === 'bn' ? 'সাহায্য ও তথ্য' : 'Help & Info'}</span>
            </div>

            <button
              onClick={() => {
                onOpenInstallModal();
                onClose();
              }}
              id="btn-drawer-install-center"
              className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-semibold text-emerald-300 hover:text-white hover:bg-emerald-950/50 border border-emerald-500/30 transition"
            >
              <Download className="w-4 h-4 text-emerald-400" />
              <span>{language === 'bn' ? '📱💻 অ্যাপ ইনস্টল সেন্টার (PWA)' : '📱💻 Install App Center'}</span>
            </button>

            {onOpenUpdateModal && (
              <button
                onClick={() => {
                  onOpenUpdateModal();
                  onClose();
                }}
                id="btn-drawer-update-center"
                className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-sm font-semibold transition ${
                  isUpdateAvailable
                    ? 'bg-indigo-950/80 text-indigo-200 hover:bg-indigo-900 border border-indigo-500/50 shadow-md shadow-indigo-950/40 animate-pulse'
                    : 'text-sky-300 hover:text-white hover:bg-sky-950/50 border border-sky-500/30'
                }`}
              >
                <div className="flex items-center gap-3">
                  <RefreshCw className={`w-4 h-4 ${isUpdateAvailable ? 'text-amber-300 animate-spin' : 'text-sky-400'}`} />
                  <span>{language === 'bn' ? '🔄 সফটওয়্যার আপডেট ও ভার্সন' : '🔄 Software Updates & PWA'}</span>
                </div>
                {isUpdateAvailable ? (
                  <span className="text-[10px] bg-amber-500/20 text-amber-300 px-1.5 py-0.5 rounded-full border border-amber-500/40 font-bold">
                    NEW
                  </span>
                ) : (
                  <span className="text-[10px] text-slate-400 font-mono">v2.5 Pro</span>
                )}
              </button>
            )}

            <button
              onClick={() => {
                onOpenRoleModal();
                onClose();
              }}
              className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium text-slate-300 hover:text-white hover:bg-slate-800/50 transition"
            >
              <Code2 className="w-4 h-4 text-slate-400" />
              <span>{language === 'bn' ? 'রোল ও একাউন্ট পরিবর্তন' : 'Role & Profile'}</span>
            </button>

            <button
              onClick={() => {
                openAuthModal('login');
                onClose();
              }}
              id="btn-drawer-login-switch"
              className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-semibold text-emerald-300 hover:text-emerald-200 hover:bg-emerald-950/40 border border-emerald-500/30 transition"
            >
              <LogIn className="w-4 h-4 text-emerald-400" />
              <span>{language === 'bn' ? '🔑 লগইন ও ড্রপডাউন রোল নির্বাচন' : '🔑 Login & Role Selection'}</span>
            </button>

            <button
              onClick={() => {
                logout();
                onClose();
              }}
              id="btn-drawer-logout"
              className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-semibold text-rose-400 hover:text-rose-300 hover:bg-rose-950/40 border border-rose-500/30 transition"
            >
              <LogOut className="w-4 h-4 text-rose-400" />
              <span>{language === 'bn' ? '🚪 লগআউট (লগইন ইন্টারফেসে যান)' : '🚪 Log Out to Login Screen'}</span>
            </button>
          </div>

        </div>

        {/* Footer */}
        <div className="p-3 bg-[#0d1424] border-t border-slate-800 text-[11px] text-slate-400 text-center">
          <span>{currentUser.name} ({currentRole.toUpperCase()}) • Dealer ERP</span>
        </div>
      </div>
    </div>
  );
};
