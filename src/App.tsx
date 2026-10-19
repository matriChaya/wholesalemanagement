import React, { useState } from 'react';
import { WholesaleProvider, useWholesale } from './context/WholesaleContext';
import { ErrorBoundary } from './components/ErrorBoundary';
import { translations } from './utils/translations';
import { AndroidHeader } from './components/AndroidHeader';
import { RoleSelectorModal } from './components/RoleSelectorModal';
import { ScannerModal } from './components/ScannerModal';
import { PhonebookPickerModal } from './components/PhonebookPickerModal';
import { CashTransferModal } from './components/CashTransferModal';
import { BiometricLockOverlay } from './components/BiometricLockOverlay';
import { BiometricSettingsModal } from './components/BiometricSettingsModal';
import { NetworkStatusNotifier } from './components/NetworkStatusNotifier';
import { AuthModal } from './components/AuthModal';
import { LoginScreen } from './components/LoginScreen';
import { AdminRefSwitcherModal } from './components/AdminRefSwitcherModal';
import { AdminInvestModal } from './components/AdminInvestModal';
import { AdminCompanyPaymentModal } from './components/AdminCompanyPaymentModal';
import { PayAdminModal } from './components/PayAdminModal';
import { AddSupplierModal } from './components/AddSupplierModal';
import { EditBalanceModal } from './components/EditBalanceModal';
import { StaffManagementModal } from './components/StaffManagementModal';
import { MultiDeviceStaffSyncModal } from './components/MultiDeviceStaffSyncModal';
import { SystemResetModal } from './components/SystemResetModal';
import { InstallGuideModal } from './components/InstallGuideModal';
import { BackupSyncModal } from './components/BackupSyncModal';
import { ConnectedDevicesFleetModal } from './components/ConnectedDevicesFleetModal';
import { DashboardOverview } from './components/DashboardOverview';
import { PosInvoiceView } from './components/PosInvoiceView';
import { CashTransferLog } from './components/CashTransferLog';
import { SupplierLedgerView } from './components/SupplierLedgerView';
import { CapitalTrackerView } from './components/CapitalTrackerView';
import { ReplacementAdjustmentView } from './components/ReplacementAdjustmentView';
import { RetailerPortalView } from './components/RetailerPortalView';
import { DealerDrawer } from './components/DealerDrawer';
import { AllStatementsModal } from './components/AllStatementsModal';
import { PdfPreviewModal } from './components/PdfPreviewModal';
import { BusinessProfileModal } from './components/BusinessProfileModal';
import { MemoKhataScannerModal } from './components/MemoKhataScannerModal';
import { AppUpdateModal } from './components/AppUpdateModal';
import { AppUpdateBanner } from './components/AppUpdateBanner';
import { MobilePWAInstallBanner } from './components/MobilePWAInstallBanner';
import { CashDrawerStatementModal } from './components/CashDrawerStatementModal';
import { ExpenseModal } from './components/ExpenseModal';
import { useAppUpdate } from './utils/appUpdate';
import { PdfDocumentResult } from './utils/pdfExport';
import {
  LayoutDashboard,
  ShoppingCart,
  Coins,
  Building2,
  PieChart,
  RotateCcw,
  Store,
  Sparkles,
  BookUser,
  Shield,
  Smartphone,
  Tablet,
  Maximize2,
  FileText,
  Menu
} from 'lucide-react';

type TabType =
  | 'dashboard'
  | 'pos'
  | 'transfers'
  | 'suppliers'
  | 'capital'
  | 'replacements'
  | 'retailer_portal';

function MainAppContent() {
  const {
    language,
    currentRole,
    currentUser,
    isAuthenticated,
    cashTransfers,
    deviceFrame,
    setDeviceFrame,
    isBiometricLocked,
    isBiometricEnabled,
    unlockBiometric,
    isBiometricSettingsOpen,
    closeBiometricSettings,
    isAuthModalOpen,
    closeAuthModal,
    isRefSwitcherOpen,
    closeRefSwitcher,
    isInvestModalOpen,
    closeInvestModal,
    isCompanyPaymentModalOpen,
    closeCompanyPaymentModal,
    isPayAdminModalOpen,
    closePayAdminModal,
    isAddSupplierModalOpen,
    closeAddSupplierModal,
    isBalanceModalOpen,
    closeBalanceModal,
    balanceModalType,
    isStaffManagementOpen,
    closeStaffManagement,
    isResetModalOpen,
    closeResetModal,
    isBusinessProfileOpen,
    closeBusinessProfile,
    isMemoKhataScannerOpen,
    closeMemoKhataScanner,
    memoKhataScannerInitialMode,
    isExpenseModalOpen,
    closeExpenseModal,
    expenseModalDefaultCategory,
    isFleetModalOpen,
    closeFleetModal,
  } = useWholesale();

  const t = translations[language];

  const [activeTab, setActiveTab] = useState<TabType>(
    currentRole === 'retailer' ? 'retailer_portal' : 'dashboard'
  );

  // Modal states
  const [isDrawerOpen, setIsDrawerOpen] = useState<boolean>(false);
  const [isRoleModalOpen, setIsRoleModalOpen] = useState<boolean>(false);
  const [isScannerModalOpen, setIsScannerModalOpen] = useState<boolean>(false);
  const [isPhonebookModalOpen, setIsPhonebookModalOpen] = useState<boolean>(false);
  const [isCashTransferModalOpen, setIsCashTransferModalOpen] = useState<boolean>(false);
  const [isInstallModalOpen, setIsInstallModalOpen] = useState<boolean>(false);
  const [isAllStatementsOpen, setIsAllStatementsOpen] = useState<boolean>(false);
  const [isCashDrawerStatementOpen, setIsCashDrawerStatementOpen] = useState<boolean>(false);
  const [cashDrawerStatementRole, setCashDrawerStatementRole] = useState<'admin' | 'counter' | 'dsr'>('admin');
  const [isUpdateModalOpen, setIsUpdateModalOpen] = useState<boolean>(false);
  const [pdfPreviewResult, setPdfPreviewResult] = useState<PdfDocumentResult | null>(null);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);

  const handleOpenCashDrawerStatement = (role: 'admin' | 'counter' | 'dsr') => {
    setCashDrawerStatementRole(role);
    setIsCashDrawerStatementOpen(true);
  };

  // In-App Software Update hook & lifecycle
  const {
    isUpdateAvailable,
    isChecking: isCheckingUpdate,
    isUpdating: isApplyingUpdate,
    updateStatusText,
    serverVersion,
    currentVersion,
    isBannerDismissed,
    isStandalone,
    checkForUpdates,
    triggerUpdate,
    dismissBanner,
  } = useAppUpdate();

  React.useEffect(() => {
    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handleBeforeInstall);
    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
    };
  }, []);

  // Pending count for badge
  const pendingCashCount = cashTransfers.filter(
    (tr) =>
      tr.status === 'PENDING' &&
      (currentUser.id === tr.toUserId ||
        currentUser.role === tr.toRole ||
        currentRole === tr.toRole ||
        (currentRole === 'admin' && (tr.toRole === 'admin' || !tr.toRole || tr.toUserId === 'usr_admin')) ||
        (currentRole === 'counter' && (tr.toRole === 'counter' || tr.toUserId === 'usr_counter_pc' || (tr.toUserName || '').toLowerCase().includes('counter'))))
  ).length;

  // Render main tab view
  const renderTabContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return (
          <DashboardOverview
            onNavigateTab={(tab) => setActiveTab(tab as TabType)}
            onOpenScanner={() => setIsScannerModalOpen(true)}
            onOpenPhonebook={() => setIsPhonebookModalOpen(true)}
            onOpenCashTransfer={() => setIsCashTransferModalOpen(true)}
            onOpenRoleModal={() => setIsRoleModalOpen(true)}
            onOpenInstallGuide={() => setIsInstallModalOpen(true)}
            onOpenAllStatements={() => setIsAllStatementsOpen(true)}
            onOpenCashDrawerStatement={handleOpenCashDrawerStatement}
            onOpenUpdateModal={() => setIsUpdateModalOpen(true)}
            isUpdateAvailable={isUpdateAvailable}
          />
        );
      case 'pos':
        return (
          <PosInvoiceView
            onOpenPhonebookModal={() => setIsPhonebookModalOpen(true)}
          />
        );
      case 'transfers':
        return <CashTransferLog />;
      case 'suppliers':
        return (
          <SupplierLedgerView
            onOpenScannerModal={() => setIsScannerModalOpen(true)}
          />
        );
      case 'capital':
        return <CapitalTrackerView />;
      case 'replacements':
        return (
          <ReplacementAdjustmentView
            onOpenScannerModal={() => setIsScannerModalOpen(true)}
          />
        );
      case 'retailer_portal':
        return (
          <RetailerPortalView
            onOpenDamageClaim={() => {
              setActiveTab('replacements');
            }}
          />
        );
      default:
        return null;
    }
  };

  // Nav Items based on role
  const navItems = [
    {
      id: 'dashboard',
      label: t.dashboard,
      icon: <LayoutDashboard className="w-4 h-4" />,
      show: currentRole !== 'retailer',
    },
    {
      id: 'pos',
      label: currentRole === 'dsr' ? 'Order Booking' : t.pos,
      icon: <ShoppingCart className="w-4 h-4" />,
      show: currentRole !== 'retailer',
    },
    {
      id: 'transfers',
      label: t.cashTransfers,
      icon: <Coins className="w-4 h-4" />,
      badge: pendingCashCount,
      show: currentRole !== 'retailer',
    },
    {
      id: 'suppliers',
      label: t.suppliers,
      icon: <Building2 className="w-4 h-4" />,
      show: currentRole === 'admin',
    },
    {
      id: 'capital',
      label: t.capitalTracking,
      icon: <PieChart className="w-4 h-4" />,
      show: currentRole === 'admin',
    },
    {
      id: 'replacements',
      label: t.replacements,
      icon: <RotateCcw className="w-4 h-4" />,
      show: true,
    },
    {
      id: 'retailer_portal',
      label: t.retailerPortal,
      icon: <Store className="w-4 h-4" />,
      show: currentRole === 'retailer' || currentRole === 'admin',
    },
  ].filter((item) => item.show);

  // Outer frame container classes
  const getContainerStyle = () => {
    if (deviceFrame === 'android') {
      return 'w-full max-w-md my-4 sm:my-6 rounded-[44px] shadow-[0_25px_70px_rgba(0,0,0,0.95)] border-[10px] border-slate-900 ring-1 ring-slate-800/80 overflow-hidden relative flex flex-col min-h-[840px] max-h-[92vh]';
    }
    if (deviceFrame === 'tablet') {
      return 'w-full max-w-4xl my-4 sm:my-6 rounded-[32px] shadow-2xl border-4 border-slate-800 ring-1 ring-slate-700/60 overflow-hidden relative flex flex-col min-h-[90vh]';
    }
    if (deviceFrame === 'fullscreen') {
      return 'w-full min-h-screen max-w-[1720px] mx-auto flex flex-col shadow-2xl border-x border-slate-800/60';
    }
    // 'auto' mode: fluid responsiveness. Naturally adapts to mobile, laptop or multi-monitor desktop
    return 'w-full min-h-screen max-w-[1720px] mx-auto flex flex-col shadow-2xl border-x border-slate-800/60';
  };

  const isAndroidMockup = deviceFrame === 'android';

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-start antialiased selection:bg-emerald-500/30 selection:text-emerald-200">
      {/* Real-time Network & Connectivity Toast Notifier */}
      <NetworkStatusNotifier />

      {/* Device Wrapper */}
      <div className={`${getContainerStyle()} bg-slate-950 transition-all`}>
        {!isAuthenticated ? (
          <div className="w-full flex-1 flex flex-col justify-center items-center p-2 sm:p-6 min-h-[85vh]">
            <LoginScreen isModal={false} />
          </div>
        ) : (
          <>
            {/* Mobile PWA Install Banner */}
            <MobilePWAInstallBanner onOpenDetailedGuide={() => setIsInstallModalOpen(true)} />

            {/* Responsive Header & Status Bar */}
            <AndroidHeader
              onOpenRoleModal={() => setIsRoleModalOpen(true)}
              onOpenScannerModal={() => setIsScannerModalOpen(true)}
              onOpenInstallModal={() => setIsInstallModalOpen(true)}
              onOpenDrawer={() => setIsDrawerOpen(true)}
              onOpenAllStatements={() => setIsAllStatementsOpen(true)}
              onOpenUpdateModal={() => setIsUpdateModalOpen(true)}
              isUpdateAvailable={isUpdateAvailable}
            />

            {/* Dealer ERP Side Navigation Drawer */}
            <DealerDrawer
              isOpen={isDrawerOpen}
              onClose={() => setIsDrawerOpen(false)}
              activeTab={activeTab}
              onSelectTab={(tabId) => setActiveTab(tabId as TabType)}
              onOpenScannerModal={() => setIsScannerModalOpen(true)}
              onOpenPhonebookModal={() => setIsPhonebookModalOpen(true)}
              onOpenCashTransferModal={() => setIsCashTransferModalOpen(true)}
              onOpenRoleModal={() => setIsRoleModalOpen(true)}
              onOpenInstallModal={() => setIsInstallModalOpen(true)}
              onOpenAllStatementsModal={() => setIsAllStatementsOpen(true)}
              onOpenUpdateModal={() => setIsUpdateModalOpen(true)}
              isUpdateAvailable={isUpdateAvailable}
            />

            {/* Top Navigation Strip ("সাইট বার" / Site Bar): Visible on mobile screens and desktop alike */}
            <div className="flex items-center justify-between gap-1 px-2 sm:px-4 lg:px-6 py-1.5 sm:py-2 bg-slate-900/90 border-b border-slate-800 overflow-x-auto no-print no-scrollbar">
              <div className="flex items-center gap-1 sm:gap-1.5 overflow-x-auto py-0.5 no-scrollbar shrink-0">
                {/* Quick Sidebar Button ("সাইডবার") */}
                <button
                  onClick={() => setIsDrawerOpen(true)}
                  id="btn-nav-sidebar-toggle"
                  className="px-2 sm:px-2.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1 sm:gap-1.5 whitespace-nowrap bg-sky-950/70 hover:bg-sky-900/90 text-sky-300 border border-sky-500/40 active:scale-95 cursor-pointer shrink-0 shadow-sm"
                  title={language === 'bn' ? 'কম্পিউটারের মতো পূর্ণাঙ্গ সাইডবার মেনু খুলুন' : 'Open Full Sidebar Menu'}
                >
                  <Menu className="w-3.5 h-3.5 text-sky-400" />
                  <span>{language === 'bn' ? 'সাইডবার' : 'Sidebar'}</span>
                </button>

                {navItems.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => setActiveTab(item.id as TabType)}
                    className={`px-2.5 sm:px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1 sm:gap-1.5 whitespace-nowrap relative shrink-0 ${
                      activeTab === item.id
                        ? 'bg-emerald-600 text-white shadow-md shadow-emerald-950/50'
                        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/70'
                    }`}
                  >
                    {item.icon}
                    <span>{item.label}</span>
                    {item.badge ? (
                      <span className="w-4 h-4 rounded-full bg-amber-400 text-slate-950 text-[10px] font-black flex items-center justify-center animate-pulse">
                        {item.badge}
                      </span>
                    ) : null}
                  </button>
                ))}
              </div>

              {currentRole !== 'retailer' && (
                <div className="flex items-center gap-1.5 sm:gap-2 shrink-0 ml-2">
                  {activeTab !== 'pos' && (
                    <button
                      onClick={() => setActiveTab('pos')}
                      className="px-2 sm:px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1 sm:gap-1.5 whitespace-nowrap bg-emerald-600 hover:bg-emerald-500 text-white shadow-sm cursor-pointer"
                    >
                      <ShoppingCart className="w-3.5 h-3.5" />
                      <span>{language === 'bn' ? '+ নতুন মেমো' : '+ New Invoice'}</span>
                    </button>
                  )}

                  <button
                    onClick={() => setIsAllStatementsOpen(true)}
                    id="btn-all-statements-nav"
                    className="px-2 sm:px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1 sm:gap-1.5 whitespace-nowrap bg-emerald-950/60 hover:bg-emerald-900/80 text-emerald-300 border border-emerald-500/40 active:scale-95 cursor-pointer"
                  >
                    <FileText className="w-3.5 h-3.5 text-emerald-400" />
                    <span>{language === 'bn' ? 'PDF স্টেটমেন্ট' : 'PDF Statements'}</span>
                  </button>
                </div>
              )}
            </div>

            {/* Main Dynamic View Content */}
            <main className={`flex-1 p-3 sm:p-5 lg:p-6 overflow-y-auto ${isAndroidMockup ? 'pb-16' : 'pb-20 md:pb-8'}`}>
              {renderTabContent()}
            </main>

            {/* Bottom Navigation Bar: Visible on Mobile screens, or inside the Android frame */}
            {(isAndroidMockup || (!isAndroidMockup && true)) && (
              <nav
                className={`${
                  isAndroidMockup
                    ? 'sticky bottom-0 inset-x-0 z-40 bg-slate-900/95 backdrop-blur-lg border-t border-slate-800 px-2 py-1.5 flex items-center justify-around no-print'
                    : 'fixed md:hidden bottom-0 inset-x-0 z-40 bg-slate-900/95 backdrop-blur-lg border-t border-slate-800 px-2 py-1.5 flex items-center justify-around no-print'
                }`}
              >
                {navItems.slice(0, 4).map((item) => {
                  const isActive = activeTab === item.id;

                  return (
                    <button
                      key={item.id}
                      onClick={() => setActiveTab(item.id as TabType)}
                      className={`flex flex-col items-center justify-center p-1.5 rounded-xl transition relative min-w-[56px] ${
                        isActive ? 'text-emerald-400 font-bold' : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      <div
                        className={`p-1 rounded-lg transition ${
                          isActive ? 'bg-emerald-500/20 text-emerald-300' : ''
                        }`}
                      >
                        {item.icon}
                      </div>
                      <span className="text-[10px] mt-0.5 tracking-tight truncate max-w-[64px]">
                        {item.label}
                      </span>

                      {item.badge ? (
                        <span className="absolute top-1 right-2 w-4 h-4 rounded-full bg-amber-400 text-slate-950 text-[10px] font-black flex items-center justify-center">
                          {item.badge}
                        </span>
                      ) : null}
                    </button>
                  );
                })}

                {/* Direct Sidebar Button in Mobile Bottom Bar */}
                <button
                  onClick={() => setIsDrawerOpen(true)}
                  id="btn-bottom-open-sidebar"
                  className="flex flex-col items-center justify-center p-1.5 rounded-xl transition relative min-w-[56px] text-sky-400 hover:text-sky-300 active:scale-95 cursor-pointer"
                  title={language === 'bn' ? 'কম্পিউটারের মতো পূর্ণাঙ্গ সাইডবার খুলুন' : 'Open Full Sidebar'}
                >
                  <div className="p-1 rounded-lg transition bg-sky-500/20 text-sky-300">
                    <Menu className="w-4 h-4" />
                  </div>
                  <span className="text-[10px] mt-0.5 tracking-tight truncate max-w-[64px] font-bold">
                    {language === 'bn' ? 'সাইডবার' : 'Sidebar'}
                  </span>
                </button>
              </nav>
            )}
          </>
        )}
      </div>

      {/* Global Modals */}
      <RoleSelectorModal
        isOpen={isRoleModalOpen}
        onClose={() => setIsRoleModalOpen(false)}
      />

      <ScannerModal
        isOpen={isScannerModalOpen}
        onClose={() => setIsScannerModalOpen(false)}
      />

      {/* Cash Counter & DSR Sales and Replacement Memo/Khata Scanner Modal */}
      <MemoKhataScannerModal
        isOpen={isMemoKhataScannerOpen}
        onClose={closeMemoKhataScanner}
        initialMode={memoKhataScannerInitialMode}
      />

      <PhonebookPickerModal
        isOpen={isPhonebookModalOpen}
        onClose={() => setIsPhonebookModalOpen(false)}
      />

      <CashTransferModal
        isOpen={isCashTransferModalOpen}
        onClose={() => setIsCashTransferModalOpen(false)}
      />

      {/* Biometric & Security Settings Modal */}
      <BiometricSettingsModal
        isOpen={isBiometricSettingsOpen}
        onClose={closeBiometricSettings}
      />

      {/* Authentication & Registration Gateway Modal */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={closeAuthModal}
      />

      {/* Admin Reference & Multi-Tenant Wholesaler Switcher */}
      <AdminRefSwitcherModal
        isOpen={isRefSwitcherOpen}
        onClose={closeRefSwitcher}
      />

      {/* Admin Capital Investment Modal (When Cash Balance is Low or 0) */}
      <AdminInvestModal
        isOpen={isInvestModalOpen}
        onClose={closeInvestModal}
      />

      {/* Admin Direct Supplier/Company Payment Modal */}
      <AdminCompanyPaymentModal
        isOpen={isCompanyPaymentModalOpen}
        onClose={closeCompanyPaymentModal}
      />

      {/* DSR & Counter Pay Admin Modal */}
      <PayAdminModal
        isOpen={isPayAdminModalOpen}
        onClose={closePayAdminModal}
      />

      {/* Add New Supplier Modal */}
      <AddSupplierModal
        isOpen={isAddSupplierModalOpen}
        onClose={closeAddSupplierModal}
      />

      {/* Edit Bank & Cash Balance Modal */}
      <EditBalanceModal
        isOpen={isBalanceModalOpen}
        onClose={closeBalanceModal}
        initialType={balanceModalType}
      />

      {/* Cash Counter Expense Modal (বেতন, দোকান ভাড়া, বিদ্যুৎ বিল, অন্যান্য) */}
      <ExpenseModal
        isOpen={isExpenseModalOpen}
        onClose={closeExpenseModal}
        defaultCategory={expenseModalDefaultCategory}
      />

      {/* Staff & Team Management Modal (DSR & Cash Counter multi-device access) */}
      <StaffManagementModal
        isOpen={isStaffManagementOpen}
        onClose={closeStaffManagement}
      />

      {/* Multi-Device Staff Data Sync Hub (DSR, Counter & Admin Cloud Sync) */}
      <MultiDeviceStaffSyncModal />

      {/* System Data Reset & Fresh Start Modal */}
      <SystemResetModal
        isOpen={isResetModalOpen}
        onClose={closeResetModal}
      />

      {/* Mobile App PWA Install Guide Modal */}
      <InstallGuideModal
        isOpen={isInstallModalOpen}
        onClose={() => setIsInstallModalOpen(false)}
        deferredPrompt={deferredPrompt}
        onOpenUpdateModal={() => setIsUpdateModalOpen(true)}
        isUpdateAvailable={isUpdateAvailable}
      />

      {/* Floating Live App Update Banner (Appears when new release is detected) */}
      {isUpdateAvailable && !isBannerDismissed && (
        <AppUpdateBanner
          language={language}
          serverVersion={serverVersion}
          isUpdating={isApplyingUpdate}
          updateStatusText={updateStatusText}
          onOpenModal={() => setIsUpdateModalOpen(true)}
          onApplyUpdate={triggerUpdate}
          onDismiss={dismissBanner}
        />
      )}

      {/* In-App Live Software Update Modal & Cache Purger */}
      <AppUpdateModal
        isOpen={isUpdateModalOpen}
        onClose={() => setIsUpdateModalOpen(false)}
        language={language}
        currentVersion={currentVersion}
        serverVersion={serverVersion}
        isUpdateAvailable={isUpdateAvailable}
        isChecking={isCheckingUpdate}
        isUpdating={isApplyingUpdate}
        updateStatusText={updateStatusText}
        isStandalone={isStandalone}
        onCheckUpdates={checkForUpdates}
        onTriggerUpdate={triggerUpdate}
      />

      {/* Cloud Backup & Offline Synchronization Hub Modal */}
      <BackupSyncModal />

      {/* Connected Devices Fleet & Pending Files Manager Modal */}
      <ConnectedDevicesFleetModal
        isOpen={isFleetModalOpen}
        onClose={closeFleetModal}
      />

      {/* Official Company Profile, Warehouse & Letterhead Settings Modal */}
      <BusinessProfileModal
        isOpen={isBusinessProfileOpen}
        onClose={closeBusinessProfile}
      />

      {/* All Statements & Accounts PDF Hub Modal */}
      <AllStatementsModal
        isOpen={isAllStatementsOpen}
        onClose={() => setIsAllStatementsOpen(false)}
        onPreviewPdf={(res) => setPdfPreviewResult(res)}
        onOpenCashDrawerStatement={handleOpenCashDrawerStatement}
      />

      {/* Interactive Cash Drawer Statement & Audit Modal */}
      <CashDrawerStatementModal
        isOpen={isCashDrawerStatementOpen}
        onClose={() => setIsCashDrawerStatementOpen(false)}
        initialRole={cashDrawerStatementRole}
        onOpenPdfPreview={(res) => setPdfPreviewResult(res)}
      />

      {/* Universal PDF Document Interactive Preview & Download Modal */}
      <PdfPreviewModal
        pdfResult={pdfPreviewResult}
        onClose={() => setPdfPreviewResult(null)}
      />

      {/* Biometric & PIN Security Lock Screen (App Open Protection) */}
      {isBiometricLocked && (
        <BiometricLockOverlay
          onUnlockSuccess={unlockBiometric}
          onSwitchRole={() => setIsRoleModalOpen(true)}
        />
      )}
    </div>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <WholesaleProvider>
        <MainAppContent />
      </WholesaleProvider>
    </ErrorBoundary>
  );
}
