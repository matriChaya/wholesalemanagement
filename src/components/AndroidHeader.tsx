import React, { useState, useEffect } from 'react';
import { useWholesale } from '../context/WholesaleContext';
import { translations, formatCurrency } from '../utils/translations';
import {
  Wifi,
  WifiOff,
  BatteryMedium,
  Globe,
  UserCheck,
  Shield,
  ShoppingCart,
  Truck,
  Store,
  Smartphone,
  Tablet,
  Laptop,
  Monitor,
  Sparkles,
  Maximize2,
  Bell,
  Coins,
  Cloud,
  CloudOff,
  Database,
  Fingerprint,
  Lock,
  Unlock,
  ShieldCheck,
  KeyRound,
  LogIn,
  LogOut,
  UserPlus,
  User,
  Users,
  RotateCcw,
  Download,
  Menu,
  FileText,
  RefreshCw,
  CheckCircle2
} from 'lucide-react';

interface AndroidHeaderProps {
  onOpenRoleModal: () => void;
  onOpenScannerModal: () => void;
  onOpenInstallModal?: () => void;
  onOpenDrawer?: () => void;
  onOpenAllStatements?: () => void;
  onOpenUpdateModal?: () => void;
  isUpdateAvailable?: boolean;
}

export const AndroidHeader: React.FC<AndroidHeaderProps> = ({
  onOpenRoleModal,
  onOpenScannerModal,
  onOpenInstallModal,
  onOpenDrawer,
  onOpenAllStatements,
  onOpenUpdateModal,
  isUpdateAvailable,
}) => {
  const {
    language,
    toggleLanguage,
    currentRole,
    currentUser,
    isAuthenticated,
    openAuthModal,
    logout,
    deviceFrame,
    setDeviceFrame,
    isOnline,
    isSimulatedOffline,
    toggleSimulateOffline,
    isFromCache,
    hasPendingWrites,
    isBiometricLocked,
    isBiometricEnabled,
    lockBiometric,
    openBiometricSettings,
    openRefSwitcher,
    activeAdminEnterprise,
    activeAdminPhone,
    activeAdminName,
    isLinkedToAdmin,
    openStaffManagement,
    openResetModal,
    openStaffSyncModal,
    openBackupModal,
    cashAdmin,
    cashCounter,
    cashDSR,
    cashTransfers,
    acceptCashTransfer,
    isTestMode,
    toggleTestMode,
    activeTenantId,
  } = useWholesale();

  const t = translations[language];

  // Resolve pending cash transfers awaiting approval by current role
  const pendingTransfersForMe = React.useMemo(() => {
    return (cashTransfers || []).filter(
      (tr) =>
        tr.status === 'PENDING' &&
        (currentUser.id === tr.toUserId ||
          currentUser.role === tr.toRole ||
          (currentRole === 'counter' &&
            (tr.toRole === 'counter' ||
              tr.toUserId === 'usr_counter_pc' ||
              (tr.toUserName || '').toLowerCase().includes('counter') ||
              (tr.toUserName || '').toLowerCase().includes('কাউন্টার'))) ||
          (currentRole === 'admin' &&
            (tr.toRole === 'admin' ||
              !tr.toRole ||
              tr.toUserId === 'usr_admin' ||
              (tr.toUserName || '').toLowerCase().includes('admin') ||
              (tr.toUserName || '').toLowerCase().includes('এডমিন'))))
    );
  }, [cashTransfers, currentUser, currentRole]);

  const totalPendingAmount = pendingTransfersForMe.reduce(
    (s, t) => s + (Number(t.amount) || 0),
    0
  );

  // Dynamically resolve active cash drawer balance based on role:
  const currentCashDrawerBalance =
    currentRole === 'admin' || currentUser.role === 'admin'
      ? cashAdmin
      : currentRole === 'counter' || currentUser.role === 'counter'
      ? cashCounter
      : currentRole === 'dsr' || currentUser.role === 'dsr'
      ? cashDSR
      : (currentUser.assignedCashDrawer || 0);

  const [timeStr, setTimeStr] = useState<string>('');
  const [dateStr, setDateStr] = useState<string>('');

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setTimeStr(
        now.toLocaleTimeString(language === 'bn' ? 'bn-BD' : 'en-US', {
          hour: '2-digit',
          minute: '2-digit',
          hour12: true,
        })
      );
      setDateStr(
        now.toLocaleDateString(language === 'bn' ? 'bn-BD' : 'en-US', {
          day: 'numeric',
          month: 'short',
          year: 'numeric',
        })
      );
    };
    updateTime();
    const interval = setInterval(updateTime, 30000);
    return () => clearInterval(interval);
  }, [language]);

  const getRoleIcon = () => {
    switch (currentRole) {
      case 'admin':
        return <Shield className="w-4 h-4 text-amber-400" />;
      case 'counter':
        return <ShoppingCart className="w-4 h-4 text-emerald-400" />;
      case 'dsr':
        return <Truck className="w-4 h-4 text-sky-400" />;
      case 'retailer':
        return <Store className="w-4 h-4 text-purple-400" />;
    }
  };

  const getRoleBadgeColor = () => {
    switch (currentRole) {
      case 'admin':
        return 'bg-amber-950/80 border-amber-500/40 text-amber-300';
      case 'counter':
        return 'bg-emerald-950/80 border-emerald-500/40 text-emerald-300';
      case 'dsr':
        return 'bg-sky-950/80 border-sky-500/40 text-sky-300';
      case 'retailer':
        return 'bg-purple-950/80 border-purple-500/40 text-purple-300';
    }
  };

  const isAndroidMockup = deviceFrame === 'android';

  return (
    <header className="sticky top-0 z-40 bg-slate-900/95 backdrop-blur-md border-b border-slate-800 text-slate-100 select-none">
      {/* Top Status & Display Mode Bar */}
      <div className="px-3 sm:px-4 py-1.5 flex flex-wrap items-center justify-between gap-2 text-[11px] font-medium text-slate-400 border-b border-slate-800/60 bg-slate-950/70">
        {isAndroidMockup ? (
          /* Mobile Phone Simulated Status Bar */
          <div className="flex items-center justify-between w-full">
            <div className="flex items-center space-x-1.5">
              <span className="font-mono-num font-semibold text-slate-300">{timeStr || '10:45 AM'}</span>
              <span className="text-[10px] text-emerald-400 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                5G
              </span>
            </div>

            {/* Display Switcher in Mobile Mode */}
            <div className="flex items-center bg-slate-900 rounded-lg p-0.5 border border-slate-800 shadow-inner">
              <button
                onClick={() => setDeviceFrame('auto')}
                title={language === 'bn' ? 'অটো ডিসপ্লে (Auto Responsive)' : 'Auto Responsive'}
                className={`px-1.5 py-0.5 rounded text-[10px] font-bold flex items-center gap-1 transition ${
                  (deviceFrame as string) === 'auto' ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                <Sparkles className="w-3 h-3" />
                <span className="hidden xs:inline">Auto</span>
              </button>
              <button
                onClick={() => setDeviceFrame('fullscreen')}
                title={language === 'bn' ? 'ল্যাপটপ ও পিসি ভিউ (Laptop/PC)' : 'Laptop / PC Desktop View'}
                className={`px-1.5 py-0.5 rounded text-[10px] font-bold flex items-center gap-1 transition ${
                  (deviceFrame as string) === 'fullscreen' ? 'bg-sky-600 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                <Laptop className="w-3 h-3" />
                <span>PC</span>
              </button>
              <button
                onClick={() => setDeviceFrame('tablet')}
                title={language === 'bn' ? 'ট্যাবলেট ভিউ (Tablet POS)' : 'Tablet POS View'}
                className={`px-1.5 py-0.5 rounded text-[10px] font-bold flex items-center gap-1 transition ${
                  (deviceFrame as string) === 'tablet' ? 'bg-amber-600 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                <Tablet className="w-3 h-3" />
              </button>
              <button
                onClick={() => setDeviceFrame('android')}
                title={language === 'bn' ? 'মোবাইল ভিউ (Mobile Android)' : 'Mobile Phone View'}
                className={`px-1.5 py-0.5 rounded text-[10px] font-bold flex items-center gap-1 transition ${
                  (deviceFrame as string) === 'android' ? 'bg-purple-600 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                <Smartphone className="w-3 h-3" />
              </button>
            </div>

            <div className="flex items-center space-x-2">
              {isOnline ? (
                <Wifi className="w-3.5 h-3.5 text-emerald-400" />
              ) : (
                <WifiOff className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
              )}
              <div className="flex items-center space-x-0.5">
                <span className="text-[10px] text-slate-300">95%</span>
                <BatteryMedium className="w-4 h-4 text-emerald-400" />
              </div>
            </div>
          </div>
        ) : (
          /* Enterprise Desktop & Laptop Status Bar */
          <div className="flex items-center justify-between w-full gap-3">
            {/* Left: Enterprise & Real-Time Date/Clock */}
            <div className="flex items-center gap-2.5 min-w-0">
              <span className="font-bold text-white text-xs truncate">
                {currentUser.enterpriseName || activeAdminEnterprise || 'মাতৃছায়া টেলিকম'}
              </span>
              <span className="text-slate-500 hidden sm:inline">•</span>
              <span className="text-slate-300 font-mono-num text-[11px] hidden sm:inline">
                {dateStr} • {timeStr}
              </span>
              <span className="hidden md:inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-950/70 border border-emerald-500/30 text-emerald-300 text-[10px] font-medium">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                <span>{language === 'bn' ? 'লাইভ ক্লাউড ডাটাবেজ' : 'Cloud DB Live'}</span>
              </span>
            </div>

            {/* Center: Prominent Display / Device Selector */}
            <div className="flex items-center bg-slate-900 rounded-xl p-0.5 border border-slate-700/80 shadow-inner">
              <button
                onClick={() => setDeviceFrame('auto')}
                id="btn-frame-auto"
                title={language === 'bn' ? 'ডিসপ্লের মাপ অনুযায়ী স্বয়ংক্রিয়ভাবে খাপ খাইয়ে নিবে' : 'Auto Responsive Display'}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold flex items-center gap-1.5 transition ${
                  deviceFrame === 'auto'
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                }`}
              >
                <Sparkles className="w-3.5 h-3.5 text-emerald-300" />
                <span>{language === 'bn' ? 'অটো' : 'Auto'}</span>
              </button>

              <button
                onClick={() => setDeviceFrame('fullscreen')}
                id="btn-frame-desktop"
                title={language === 'bn' ? 'ল্যাপটপ ও পিসির জন্য পূর্ণাঙ্গ ওয়াইডস্ক্রিন ERP মোড' : 'Full Laptop / PC Desktop Mode'}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold flex items-center gap-1.5 transition ${
                  deviceFrame === 'fullscreen'
                    ? 'bg-sky-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                }`}
              >
                <Laptop className="w-3.5 h-3.5 text-sky-300" />
                <span>{language === 'bn' ? 'ল্যাপটপ / পিসি' : 'Laptop / PC'}</span>
              </button>

              <button
                onClick={() => setDeviceFrame('tablet')}
                id="btn-frame-tablet"
                title={language === 'bn' ? 'ট্যাবলেট পিওএস রেজিস্টার মোড' : 'Tablet POS Register Mode'}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold flex items-center gap-1.5 transition ${
                  deviceFrame === 'tablet'
                    ? 'bg-amber-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                }`}
              >
                <Tablet className="w-3.5 h-3.5 text-amber-300" />
                <span className="hidden sm:inline">{language === 'bn' ? 'ট্যাবলেট' : 'Tablet'}</span>
              </button>

              <button
                onClick={() => setDeviceFrame('android')}
                id="btn-frame-mobile"
                title={language === 'bn' ? 'মোবাইল ফোন ফ্রেম মোড' : 'Mobile Phone Frame Mode'}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold flex items-center gap-1.5 transition ${
                  (deviceFrame as string) === 'android'
                    ? 'bg-purple-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                }`}
              >
                <Smartphone className="w-3.5 h-3.5 text-purple-300" />
                <span className="hidden sm:inline">{language === 'bn' ? 'মোবাইল' : 'Mobile'}</span>
              </button>
            </div>

            {/* Right: Offline Switch, Cash Drawer Pill & Language */}
            <div className="flex items-center gap-2">
              <button
                onClick={toggleSimulateOffline}
                id="btn-offline-mode-toggle"
                title={isOnline ? "Click to simulate offline network interruption" : "Click to restore online network connection"}
                className={`flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-semibold transition-all border ${
                  isOnline
                    ? 'bg-emerald-950/60 border-emerald-500/30 text-emerald-300 hover:bg-emerald-900/60'
                    : 'bg-amber-950/90 border-amber-500/60 text-amber-300 animate-pulse'
                }`}
              >
                {isOnline ? (
                  <>
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                    <span className="hidden sm:inline">{t.onlineMode}</span>
                    <Cloud className="w-3 h-3 text-emerald-400" />
                  </>
                ) : (
                  <>
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping"></span>
                    <span>{t.offlineMode}</span>
                    <CloudOff className="w-3 h-3 text-amber-400" />
                  </>
                )}
              </button>

              {/* Test Mode / Sandbox Indicator & Multi-Tenant Shop Tag */}
              <button
                onClick={toggleTestMode}
                id="btn-test-mode-toggle"
                title={
                  isTestMode
                    ? (language === 'bn' ? `স্যান্ডবক্স / টেস্ট মোড সক্রিয় (দোকান: ${activeTenantId}) - লাইভ মোডে ফিরতে ক্লিক করুন` : `Test Sandbox Active (Shop: ${activeTenantId}) - Click for Live`)
                    : (language === 'bn' ? `লাইভ মোড সক্রিয় (দোকান: ${activeTenantId}) - টেস্ট স্যান্ডবক্সে যেতে ক্লিক করুন` : `Live Shop (Shop: ${activeTenantId}) - Click for Test Sandbox`)
                }
                className={`flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-semibold transition-all border ${
                  isTestMode
                    ? 'bg-amber-950/80 border-amber-500/50 text-amber-300'
                    : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
                }`}
              >
                <span className={`w-1.5 h-1.5 rounded-full ${isTestMode ? 'bg-amber-400 animate-pulse' : 'bg-slate-500'}`}></span>
                <span className="hidden sm:inline">
                  {isTestMode ? (language === 'bn' ? 'টেস্ট মোড' : 'Test Mode') : (language === 'bn' ? 'লাইভ' : 'Live')}
                </span>
                <span className="text-[9px] font-mono opacity-80 max-w-[70px] truncate">
                  {activeTenantId.replace('shop_', '')}
                </span>
              </button>

              {currentRole !== 'retailer' && (
                <div className={`hidden lg:flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-[11px] ${
                  currentCashDrawerBalance < 0
                    ? 'bg-rose-950/40 border-rose-500/40 text-rose-300'
                    : 'bg-slate-900 border-slate-800'
                }`}>
                  <span className="text-slate-400">{t.cashDrawerBalance}:</span>
                  <span className={`font-mono-num font-extrabold ${
                    currentCashDrawerBalance < 0 ? 'text-rose-400' : 'text-emerald-400'
                  }`}>
                    {formatCurrency(currentCashDrawerBalance, language)}
                  </span>
                  {currentCashDrawerBalance < 0 && (
                    <span className="text-[9px] font-black px-1.5 py-0.2 rounded bg-rose-500/30 text-rose-300 border border-rose-500/40 animate-pulse">
                      {language === 'bn' ? 'ঘাটতি' : 'Deficit'}
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Offline Alert Strip when connection is offline / simulated offline */}
      {!isOnline && (
        <div className="bg-amber-950/90 border-b border-amber-500/40 px-3 py-1.5 flex items-center justify-between text-xs text-amber-200 animate-in slide-in-from-top-1">
          <div className="flex items-center gap-2 min-w-0">
            <Database className="w-3.5 h-3.5 text-amber-400 shrink-0" />
            <span className="truncate text-[11px]">
              <strong>{t.offlinePersistenceActive}:</strong> {t.offlineSyncDesc}
            </span>
          </div>
          <button
            onClick={toggleSimulateOffline}
            className="ml-2 px-2 py-0.5 rounded bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 text-[10px] font-bold shrink-0 transition"
          >
            {t.simulateOnlineBtn}
          </button>
        </div>
      )}

      {/* Main App Navigation Bar */}
      <div className="px-3.5 py-2.5 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2.5 min-w-0">
          {onOpenDrawer && (
            <button
              onClick={onOpenDrawer}
              id="btn-open-sidebar-drawer"
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 shadow-sm transition active:scale-95 cursor-pointer shrink-0"
              title={language === 'bn' ? 'মেনু খুলুন' : 'Open Menu'}
            >
              <Menu className="w-5 h-5 text-sky-400" />
            </button>
          )}
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-700 flex items-center justify-center shadow-lg shadow-emerald-900/30 shrink-0">
            <Coins className="w-5 h-5 text-white" />
          </div>
          <div className="min-w-0">
            <h1 className="text-sm sm:text-base font-bold tracking-tight text-white truncate flex items-center gap-1.5">
              <span>{t.appName}</span>
              <button
                type="button"
                onClick={onOpenUpdateModal}
                title={language === 'bn' ? 'সফটওয়্যার আপডেট ও ভার্সন কেন্দ্র' : 'Check Software Updates'}
                className={`text-[10px] uppercase font-semibold px-1.5 py-0.5 rounded-full border transition cursor-pointer ${
                  isUpdateAvailable
                    ? 'bg-amber-500/30 text-amber-300 border-amber-500/50 animate-pulse'
                    : 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/30'
                }`}
              >
                v2.7 Pro
              </button>
            </h1>
            <p className="text-[11px] text-slate-400 truncate">
              {currentUser.name} {currentUser.shopName ? `• ${currentUser.shopName}` : ''}
            </p>
          </div>
        </div>

        {/* Right side action controls */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          {/* 1-Click Pending Cash Handover Acceptance Alert Button */}
          {pendingTransfersForMe.length > 0 && (
            <button
              onClick={() => {
                pendingTransfersForMe.forEach((t) => acceptCashTransfer(t.id));
              }}
              id="btn-header-accept-pending-cash"
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-gradient-to-r from-amber-500 to-emerald-600 hover:from-amber-400 hover:to-emerald-500 text-white font-bold text-xs shadow-md shadow-emerald-950/40 animate-pulse active:scale-95 transition cursor-pointer"
              title={language === 'bn' ? 'ক্লিক করে এই ক্যাশ ড্রয়ারে গ্রহণ করুন (একসেপ্ট)' : 'Click to accept pending cash transfer into drawer'}
            >
              <CheckCircle2 className="w-3.5 h-3.5 text-white" />
              <span>
                {language === 'bn'
                  ? `৳${totalPendingAmount.toLocaleString()} গ্রহণ`
                  : `Accept ৳${totalPendingAmount.toLocaleString()}`}
              </span>
            </button>
          )}

          {/* Quick Lock Button */}
          {(currentRole === 'admin' || currentRole === 'counter' || currentRole === 'dsr') && (
            <button
              onClick={lockBiometric}
              id="btn-quick-lock-header"
              title={language === 'bn' ? 'অ্যাপ এখনই লক করুন (PIN / Biometric)' : 'Lock Screen Now'}
              className="p-1.5 rounded-lg border border-slate-700 bg-slate-800 hover:bg-rose-950/70 text-slate-300 hover:text-rose-300 transition active:scale-95 flex items-center gap-1 text-xs font-semibold cursor-pointer"
            >
              <Lock className="w-4 h-4 text-amber-400" />
              <span className="hidden sm:inline text-[11px]">{language === 'bn' ? 'লক' : 'Lock'}</span>
            </button>
          )}

          {/* Biometric Security Settings */}
          {(currentRole === 'admin' || currentRole === 'counter' || currentRole === 'dsr') && (
            <button
              onClick={openBiometricSettings}
              id="btn-biometric-settings-header"
              title={`${t.securitySettings} (WebAuthn / SHA-256 Vault)`}
              className={`p-1.5 rounded-lg border transition-all active:scale-95 flex items-center gap-1 text-xs font-semibold ${
                isBiometricEnabled
                  ? 'bg-slate-800/90 border-emerald-500/40 text-emerald-400 hover:bg-slate-700'
                  : 'bg-slate-800/60 border-slate-700 text-slate-400 hover:text-slate-200'
              }`}
            >
              <Fingerprint className="w-4 h-4 text-emerald-400" />
              <span className="hidden lg:inline text-[11px]">
                {isBiometricEnabled ? t.biometricProtected : 'Security'}
              </span>
            </button>
          )}

          {/* PDF Statements Quick Hub */}
          {onOpenAllStatements && (
            <button
              onClick={onOpenAllStatements}
              id="btn-all-statements-header"
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-emerald-950/70 hover:bg-emerald-900/80 text-emerald-300 border border-emerald-500/40 text-xs font-semibold transition-all active:scale-95 shadow-sm cursor-pointer"
              title={language === 'bn' ? 'সকল স্টেটমেন্ট ও PDF রিপোর্ট' : 'All Statements & PDF Reports'}
            >
              <FileText className="w-3.5 h-3.5 text-emerald-400" />
              <span className="hidden md:inline font-bold">
                {language === 'bn' ? 'PDF স্টেটমেন্ট' : 'PDF Reports'}
              </span>
            </button>
          )}

          {/* Dual Language Toggle Button */}
          <button
            onClick={toggleLanguage}
            id="btn-language-toggle"
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold transition-all active:scale-95 shadow-sm"
            title="Switch between English and Bengali"
          >
            <Globe className="w-3.5 h-3.5 text-emerald-400" />
            <span>{language === 'en' ? 'বাংলা' : 'English'}</span>
          </button>

          {/* Role Selector Trigger */}
          <button
            onClick={onOpenRoleModal}
            id="btn-role-selector"
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-semibold transition-all active:scale-95 shadow-sm ${getRoleBadgeColor()}`}
            title="Change active user role (Admin, Counter, DSR, Retailer)"
          >
            {getRoleIcon()}
            <span className="capitalize hidden xs:inline">{t[currentRole]}</span>
            <span className="text-[10px] opacity-75">▼</span>
          </button>

          {/* Multi-Device Staff Data Update Hub Trigger */}
          <button
            onClick={openStaffSyncModal}
            id="btn-header-staff-sync-trigger"
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-indigo-950/70 hover:bg-indigo-900/80 text-indigo-300 border border-indigo-500/40 text-xs font-semibold transition-all active:scale-95 shadow-sm cursor-pointer"
            title={language === 'bn' ? 'মাল্টি-ডিভাইস স্টাফ ডাটা আপডেট (ডিএসআর ও ক্যাশ কাউন্টার)' : 'Multi-Device Staff Data Sync Hub'}
          >
            <RefreshCw className="w-3.5 h-3.5 text-indigo-400" />
            <span className="hidden sm:inline font-bold">{language === 'bn' ? 'স্টাফ সিঙ্ক' : 'Sync'}</span>
          </button>

          {/* Cloud & Google Drive 15GB Backup Hub Trigger */}
          <button
            onClick={openBackupModal}
            id="btn-header-cloud-backup-trigger"
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-sky-950/70 hover:bg-sky-900/80 text-sky-300 border border-sky-500/40 text-xs font-semibold transition-all active:scale-95 shadow-sm cursor-pointer"
            title={language === 'bn' ? 'ক্লাউড ব্যাকআপ ও গুগল ড্রাইভ (১৫ জিবি)' : 'Cloud Backup & Google Drive (15 GB)'}
          >
            <Cloud className="w-3.5 h-3.5 text-sky-400" />
            <span className="hidden sm:inline font-bold">{language === 'bn' ? 'ড্রাইভ ব্যাকআপ' : 'Drive Backup'}</span>
          </button>

          {/* Staff & Team Management Trigger for Admin */}
          {currentRole === 'admin' && (
            <button
              onClick={openStaffManagement}
              id="btn-header-staff-trigger"
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-blue-950/70 hover:bg-blue-900/80 text-blue-300 border border-blue-500/40 text-xs font-semibold transition-all active:scale-95 shadow-sm cursor-pointer"
              title={language === 'bn' ? 'স্টাফ ম্যানেজমেন্ট (DSR ও ক্যাশ কাউন্টার কর্মী যোগ/লগইন)' : 'Staff Management (DSR & Cash Counter)'}
            >
              <Users className="w-3.5 h-3.5 text-blue-400" />
              <span className="hidden sm:inline">{language === 'bn' ? 'স্টাফ' : 'Staff'}</span>
            </button>
          )}

          {/* System Data Reset Trigger for Admin */}
          {currentRole === 'admin' && (
            <button
              onClick={openResetModal}
              id="btn-header-reset-system"
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-rose-950/70 hover:bg-rose-900/80 text-rose-300 border border-rose-500/40 text-xs font-semibold transition-all active:scale-95 shadow-sm cursor-pointer"
              title={language === 'bn' ? 'ডাটা রিসেট ও ফ্রেশ স্টার্ট (সকল ভুল চালান ও ক্যাশ হিসাব রিসেট)' : 'Reset System Data & Fresh Start'}
            >
              <RotateCcw className="w-3.5 h-3.5 text-rose-400" />
              <span className="hidden sm:inline">{language === 'bn' ? 'ডাটা রিসেট' : 'Reset'}</span>
            </button>
          )}

          {/* Install on Mobile / PC App Trigger */}
          {onOpenInstallModal && (
            <button
              onClick={onOpenInstallModal}
              id="btn-header-install-app"
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white border border-emerald-400/50 text-xs font-bold transition-all active:scale-95 shadow-md shadow-emerald-950/50 cursor-pointer"
              title={language === 'bn' ? 'ল্যাপটপ, পিসি, মোবাইল ও ট্যাবলেটে ইনস্টল করার নিয়ম ও ফাইল' : 'Install App on Laptop, PC, Mobile & Tablet'}
            >
              <Download className="w-3.5 h-3.5 animate-bounce" />
              <span>{language === 'bn' ? 'অ্যাপ ইন্সটল' : 'Install App'}</span>
            </button>
          )}

          {/* In-App Software Update Trigger */}
          {onOpenUpdateModal && (
            <button
              onClick={onOpenUpdateModal}
              id="btn-header-app-update"
              className={`relative flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-bold transition-all active:scale-95 shadow-md cursor-pointer ${
                isUpdateAvailable
                  ? 'bg-indigo-600 hover:bg-indigo-500 text-white border-indigo-400/80 shadow-indigo-950/60 ring-2 ring-indigo-400/60 animate-pulse'
                  : 'bg-slate-800 hover:bg-slate-700 text-sky-300 border-slate-700 shadow-slate-950/40'
              }`}
              title={
                language === 'bn'
                  ? isUpdateAvailable
                    ? 'নতুন আপডেট প্রস্তুত! ক্লিক করে এখনই ইনস্টল করা অ্যাপ আপডেট করুন'
                    : 'সফটওয়্যার আপডেট চেক ও ইনস্টল করুন'
                  : 'Check & Install App Updates'
              }
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isUpdateAvailable ? 'text-amber-300 animate-spin' : 'text-sky-400'}`} />
              <span>{language === 'bn' ? 'অ্যাপ আপডেট' : 'Update'}</span>
              {isUpdateAvailable && (
                <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-amber-500"></span>
                </span>
              )}
            </button>
          )}

          {/* Account / Registration / Login Trigger */}
          <button
            onClick={() => openAuthModal(isAuthenticated ? 'login' : 'register')}
            id="btn-header-auth-trigger"
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-emerald-950/70 hover:bg-emerald-900/80 text-emerald-300 border border-emerald-500/40 text-xs font-semibold transition-all active:scale-95 shadow-sm"
            title={isAuthenticated ? `${t.accountDetails} / Switch User` : t.loginBtn}
          >
            <User className="w-3.5 h-3.5 text-emerald-400" />
            <span className="hidden sm:inline">{isAuthenticated ? (language === 'bn' ? 'অ্যাকাউন্ট' : 'Account') : t.loginBtn}</span>
          </button>

          {/* Quick Cash Balance Pill for cash holders */}
          {currentRole !== 'retailer' && (
            <div className={`hidden md:flex flex-col items-end px-2.5 py-1 rounded-lg border text-[11px] ${
              currentCashDrawerBalance < 0
                ? 'bg-rose-950/40 border-rose-500/40 text-rose-300'
                : 'bg-slate-950/60 border-slate-800'
            }`}>
              <div className="flex items-center gap-1">
                <span className="text-[9px] text-slate-400">{t.cashDrawerBalance}</span>
                {currentCashDrawerBalance < 0 && (
                  <span className="text-[8px] font-bold text-rose-400">
                    ({language === 'bn' ? 'মাইনাস' : 'Deficit'})
                  </span>
                )}
              </div>
              <span className={`font-mono-num font-bold ${
                currentCashDrawerBalance < 0 ? 'text-rose-400' : 'text-emerald-400'
              }`}>
                {formatCurrency(currentCashDrawerBalance, language)}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Admin Reference & Enterprise Multi-Tenant Status Bar */}
      <div className="px-3.5 py-1 bg-slate-950/90 border-t border-slate-800/80 flex items-center justify-between text-[11px]">
        <button
          onClick={openRefSwitcher}
          id="btn-admin-ref-status-strip"
          className="flex items-center gap-2 text-left hover:opacity-90 transition min-w-0 flex-1 py-0.5"
          title="Click to view or switch Wholesaler Admin Reference"
        >
          <div className="w-2 h-2 rounded-full bg-emerald-400 shrink-0"></div>
          <div className="truncate text-slate-300">
            {currentRole === 'admin' ? (
              <span>
                <strong className="text-amber-400">{language === 'bn' ? 'মালিক কোড' : 'Owner Code'}:</strong>{' '}
                <span className="font-mono text-white font-bold">{currentUser.phone}</span>{' '}
                <span className="text-slate-400 hidden sm:inline">({currentUser.enterpriseName || currentUser.shopName || activeAdminEnterprise})</span>
              </span>
            ) : (
              <span>
                <strong className="text-emerald-400">{language === 'bn' ? 'যুক্ত পাইকারি প্রতিষ্ঠান' : 'Wholesaler'}:</strong>{' '}
                <span className="text-white font-bold">{activeAdminEnterprise}</span>{' '}
                <span className="text-slate-400 font-mono hidden xs:inline">({activeAdminPhone})</span>
              </span>
            )}
          </div>
        </button>

        <button
          onClick={openRefSwitcher}
          id="btn-change-admin-ref"
          className="px-2 py-0.5 rounded-md bg-slate-800 hover:bg-slate-700 text-emerald-400 border border-slate-700/80 text-[10px] font-semibold shrink-0 ml-2 transition active:scale-95"
        >
          {currentRole === 'admin' ? (language === 'bn' ? 'কোড শেয়ার' : 'Share Code') : (language === 'bn' ? 'পরিবর্তন / যাচাই' : 'Change / Verify')}
        </button>
      </div>
    </header>
  );
};
