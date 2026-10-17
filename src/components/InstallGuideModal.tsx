import React, { useState } from 'react';
import { useWholesale } from '../context/WholesaleContext';
import {
  Download,
  Smartphone,
  Laptop,
  Tablet,
  CheckCircle2,
  Copy,
  ExternalLink,
  X,
  Sparkles,
  HelpCircle,
  Share2,
  Database,
  FileCode,
  Monitor,
  Printer,
  Wifi,
  ShieldCheck,
  HardDrive,
  RefreshCw,
  QrCode,
  Send,
  Check
} from 'lucide-react';

interface InstallGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
  deferredPrompt?: any;
  onOpenUpdateModal?: () => void;
  isUpdateAvailable?: boolean;
}

export const InstallGuideModal: React.FC<InstallGuideModalProps> = ({
  isOpen,
  onClose,
  deferredPrompt,
  onOpenUpdateModal,
  isUpdateAvailable,
}) => {
  const { language, downloadLocalBackupJSON } = useWholesale();
  const [activeTab, setActiveTab] = useState<'android' | 'desktop' | 'tablet' | 'offline_files'>('android');
  const [copied, setCopied] = useState(false);
  const [isInstalling, setIsInstalling] = useState(false);
  const [installSuccess, setInstallSuccess] = useState(false);
  const [showQrCode, setShowQrCode] = useState(true);

  const isBn = language === 'bn';
  const productionSharedUrl = 'https://ais-pre-3wgi4u4u3ifdnk7qypox2b-897026234874.asia-southeast1.run.app';
  const currentOrigin = typeof window !== 'undefined' && window.location ? window.location.origin : '';
  const liveUrl = currentOrigin && !currentOrigin.includes('localhost') ? currentOrigin : productionSharedUrl;

  const isStandalone = typeof window !== 'undefined' && (
    (typeof window.matchMedia === 'function' && window.matchMedia('(display-mode: standalone)').matches) ||
    Boolean((window.navigator as unknown as { standalone?: boolean })?.standalone)
  );

  const copyUrl = () => {
    navigator.clipboard.writeText(liveUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleShareWhatsApp = () => {
    const text = isBn
      ? `মাতৃছায়া টেলিকম মোবাইল অ্যাপ ইনস্টল লিংক:\n${liveUrl}\n(ফোনের গুগোল ক্রোমে খুলে ৩-ডট মেনু থেকে 'Install app' বা 'Add to Home screen' চাপুন)`
      : `Matrichhaya Telecom Mobile App Install Link:\n${liveUrl}`;
    const url = `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
  };

  const handleNativeShare = async () => {
    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({
          title: 'মাতৃছায়া টেলিকম (Paikari Trade)',
          text: 'মাতৃছায়া টেলিকম পাইকারি ব্যবসা, মোবাইল ও ডিস্ট্রিবিউশন ইআরপি অ্যাপ',
          url: liveUrl,
        });
      } catch (e) {
        copyUrl();
      }
    } else {
      copyUrl();
    }
  };

  const handleNativeInstall = async () => {
    if (deferredPrompt) {
      setIsInstalling(true);
      try {
        await deferredPrompt.prompt();
        const choice = await deferredPrompt.userChoice;
        if (choice.outcome === 'accepted') {
          setInstallSuccess(true);
          setTimeout(() => {
            onClose();
          }, 1500);
        }
      } catch (e) {
        console.warn('Install prompt note:', e);
      } finally {
        setIsInstalling(false);
      }
    } else {
      copyUrl();
    }
  };

  const handleDownloadDesktopLauncher = () => {
    const link = document.createElement('a');
    link.href = '/Matrichhaya-Telecom-Desktop-Launcher.html';
    link.download = 'Matrichhaya-Telecom-Desktop-Launcher.html';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleDownloadMobileLauncher = () => {
    const link = document.createElement('a');
    link.href = '/Matrichhaya-Telecom-Mobile-Install.html';
    link.download = 'Matrichhaya-Telecom-Mobile-Install.html';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-fadeIn">
      <div className="bg-slate-900 border border-slate-700/80 rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl my-auto text-slate-100 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-5 py-4 bg-gradient-to-r from-emerald-950/90 via-slate-900 to-slate-900 border-b border-slate-800 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
              <Smartphone className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base text-white flex items-center gap-2">
                {isBn ? 'মোবাইল ও পিসিতে অ্যাপ ইনস্টল সেন্টার' : 'Install App Center (Mobile & PC)'}
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-medium">
                  WebAPK / PWA
                </span>
              </h3>
              <p className="text-xs text-slate-400">
                {isBn ? 'যেকোনো মোবাইল বা কম্পিউটারে ইনস্টল করে ফুলস্ক্রিন অ্যাপ হিসেবে চালান' : 'Install as a standalone fullscreen app with live cloud sync'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Current App State Banner */}
        <div className="px-5 py-2.5 bg-slate-950/80 border-b border-slate-800/80 flex items-center justify-between text-xs shrink-0">
          <div className="flex items-center gap-2">
            <span className={`w-2.5 h-2.5 rounded-full ${isStandalone ? 'bg-emerald-400' : 'bg-emerald-500 animate-pulse'}`}></span>
            <span className="text-slate-300 font-medium">
              {isStandalone
                ? (isBn ? 'সফটওয়্যারটি ইতোমধ্যে স্বতন্ত্র মোবাইল অ্যাপ হিসেবে চালু আছে' : 'App is running in standalone mode')
                : (isBn ? 'সহজেই অ্যান্ড্রয়েড মোবাইল, ল্যাপটপ বা ট্যাবলেটে ইনস্টলযোগ্য' : 'Ready to install on Android, PC or Tablet')}
            </span>
          </div>
          <span className="text-[11px] text-emerald-400 font-mono font-semibold">
            v2.5 Pro Live
          </span>
        </div>

        {/* Multi-Platform Navigation Tabs */}
        <div className="flex items-center gap-1.5 p-2 bg-slate-950/60 border-b border-slate-800 overflow-x-auto no-scrollbar shrink-0">
          <button
            onClick={() => setActiveTab('android')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition whitespace-nowrap cursor-pointer ${
              activeTab === 'android'
                ? 'bg-emerald-600 text-white shadow-md shadow-emerald-950/50'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <Smartphone className="w-4 h-4" />
            <span>{isBn ? '📱 অ্যান্ড্রয়েড মোবাইল ও APK' : 'Android Mobile & APK'}</span>
          </button>

          <button
            onClick={() => setActiveTab('desktop')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition whitespace-nowrap cursor-pointer ${
              activeTab === 'desktop'
                ? 'bg-sky-600 text-white shadow-md shadow-sky-950/50'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <Laptop className="w-4 h-4" />
            <span>{isBn ? '💻 ল্যাপটপ ও কম্পিউটার' : 'Laptop & PC'}</span>
          </button>

          <button
            onClick={() => setActiveTab('tablet')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition whitespace-nowrap cursor-pointer ${
              activeTab === 'tablet'
                ? 'bg-amber-600 text-white shadow-md shadow-amber-950/50'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <Tablet className="w-4 h-4" />
            <span>{isBn ? '📱 ট্যাবলেট ও আইপ্যাড' : 'Tablet & iPad'}</span>
          </button>

          <button
            onClick={() => setActiveTab('offline_files')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition whitespace-nowrap cursor-pointer ${
              activeTab === 'offline_files'
                ? 'bg-purple-600 text-white shadow-md shadow-purple-950/50'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <HardDrive className="w-4 h-4" />
            <span>{isBn ? '💾 ফাইল ও অফলাইন ব্যাকআপ' : 'Launcher & Backup'}</span>
          </button>
        </div>

        {/* Tab Contents Area */}
        <div className="p-5 space-y-4 overflow-y-auto flex-1">
          {/* One-Click Direct Install Button if supported by browser */}
          {deferredPrompt && (
            <div className="p-4 rounded-2xl bg-emerald-950/70 border border-emerald-500/50 text-center space-y-2.5 shadow-lg shadow-emerald-950/50">
              <div className="text-xs font-bold text-emerald-300 flex items-center justify-center gap-1.5">
                <Sparkles className="w-4 h-4 text-emerald-400 animate-pulse" />
                <span>{isBn ? 'আপনার ডিভাইসে সরাসরি এক-ক্লিকে ইনস্টলেশন প্রস্তুত:' : 'One-Click Instant Install Available:'}</span>
              </div>
              <button
                onClick={handleNativeInstall}
                disabled={isInstalling || installSuccess}
                id="btn-direct-pwa-install-modal"
                className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-extrabold text-sm shadow-lg shadow-emerald-900/60 flex items-center justify-center gap-2 transition active:scale-95 cursor-pointer"
              >
                <Download className="w-4 h-4" />
                <span>
                  {installSuccess
                    ? (isBn ? 'সফলভাবে ইনস্টল হয়েছে!' : 'Successfully Installed!')
                    : isInstalling
                    ? (isBn ? 'ইনস্টল হচ্ছে...' : 'Installing...')
                    : (isBn ? 'এক ক্লিকে মোবাইল / ডিভাইসে ইনস্টল করুন' : 'Click Here to Install App Now')}
                </span>
              </button>
            </div>
          )}

          {/* TAB 1: Android Mobile & APK */}
          {activeTab === 'android' && (
            <div className="space-y-4">
              {/* Top Quick Actions Bar for Mobile (QR Code & WhatsApp Share) */}
              <div className="p-4 rounded-2xl bg-gradient-to-br from-emerald-950/60 via-slate-900 to-slate-950 border border-emerald-500/30 space-y-3.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <QrCode className="w-4 h-4 text-emerald-400" />
                    <span className="font-bold text-xs text-emerald-300">
                      {isBn ? 'মোবাইল ক্যামেরা দিয়ে স্ক্যান করে সরাসরি ইনস্টল করুন:' : 'Scan with Mobile Camera to Install:'}
                    </span>
                  </div>
                  <button
                    onClick={() => setShowQrCode(!showQrCode)}
                    className="text-[11px] text-slate-400 hover:text-white underline cursor-pointer"
                  >
                    {showQrCode ? (isBn ? 'কিউআর কোড লুকান' : 'Hide QR') : (isBn ? 'কিউআর কোড দেখুন' : 'Show QR')}
                  </button>
                </div>

                {showQrCode && (
                  <div className="flex flex-col sm:flex-row items-center gap-4 bg-slate-950/80 p-3.5 rounded-xl border border-slate-800">
                    <div className="bg-white p-2 rounded-xl shadow-md shrink-0">
                      <img
                        src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&margin=4&data=${encodeURIComponent(liveUrl)}`}
                        alt="QR Code to Install on Mobile"
                        className="w-28 h-28 object-contain"
                      />
                    </div>
                    <div className="text-xs space-y-2 flex-1 text-center sm:text-left">
                      <p className="text-slate-300 font-medium leading-relaxed">
                        {isBn
                          ? 'আপনার ফোনের ক্যামেরা বা Google Lens চালু করে এই কিউআর কোডের দিকে ধরুন। লিংকে ক্লিক করলেই সঙ্গে সঙ্গে অ্যাপটি ফোনে খুলে যাবে।'
                          : 'Point your mobile camera or Google Lens at this QR code to instantly open and install the app on your phone.'}
                      </p>
                      <div className="flex flex-wrap gap-2 justify-center sm:justify-start pt-1">
                        <button
                          onClick={handleShareWhatsApp}
                          className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1.5 transition active:scale-95 shadow-sm cursor-pointer"
                        >
                          <Send className="w-3.5 h-3.5" />
                          <span>{isBn ? 'হোয়াটসঅ্যাপে পাঠান' : 'Share WhatsApp'}</span>
                        </button>
                        <button
                          onClick={handleNativeShare}
                          className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-1.5 transition active:scale-95 cursor-pointer"
                        >
                          <Share2 className="w-3.5 h-3.5 text-sky-400" />
                          <span>{isBn ? 'শেয়ার করুন' : 'Share Link'}</span>
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Direct Link Input with 1-click Copy */}
                <div className="space-y-1.5">
                  <label className="text-[11px] font-semibold text-slate-300 flex items-center justify-between">
                    <span>{isBn ? 'মোবাইল ইনস্টলেশন লিংক:' : 'Mobile Installation Link:'}</span>
                    <span className="text-[10px] text-emerald-400 font-mono">
                      {isBn ? 'যেকোনো ফোনে শেয়ারযোগ্য' : 'Shareable'}
                    </span>
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      readOnly
                      value={liveUrl}
                      className="w-full text-xs font-mono bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-emerald-400 select-all"
                    />
                    <button
                      onClick={copyUrl}
                      className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1.5 transition active:scale-95 shrink-0 shadow-md cursor-pointer"
                    >
                      {copied ? (
                        <>
                          <Check className="w-4 h-4" />
                          <span>{isBn ? 'কপি হয়েছে!' : 'Copied!'}</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-4 h-4" />
                          <span>{isBn ? 'কপি করুন' : 'Copy'}</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>

              {/* 3 Step Guide for Android Mobile */}
              <div className="space-y-2.5">
                <div className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                  <Smartphone className="w-4 h-4 text-emerald-400" />
                  <span>{isBn ? 'অ্যান্ড্রয়েড ফোনে ৩টি সহজ ধাপে ইনস্টল করার নিয়ম:' : '3 Easy Steps to Install on Android Phone:'}</span>
                </div>

                <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-emerald-600/30 border border-emerald-500/50 text-emerald-400 font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
                    ১
                  </div>
                  <div className="text-xs space-y-1">
                    <div className="font-bold text-white">
                      {isBn ? '১. গুগল ক্রোম (Google Chrome) এ লিংকটি ওপেন করুন' : '1. Open the link in Google Chrome on your phone'}
                    </div>
                    <p className="text-slate-400 leading-relaxed">
                      {isBn
                        ? 'উপরের কপি করা লিংকটি আপনার মোবাইলের Google Chrome ব্রাউজারে পেস্ট করে প্রবেশ করুন।'
                        : 'Paste the copied link in your mobile Google Chrome browser and open it.'}
                    </p>
                  </div>
                </div>

                <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-emerald-600/30 border border-emerald-500/50 text-emerald-400 font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
                    ২
                  </div>
                  <div className="text-xs space-y-1">
                    <div className="font-bold text-white">
                      {isBn ? '২. ক্রোম ব্রাউজারের ৩-ডট মেন্যু (⋮) চাপুন' : '2. Tap Chrome 3-dots menu (⋮)'}
                    </div>
                    <p className="text-slate-400 leading-relaxed">
                      {isBn
                        ? 'ক্রোম ব্রাউজারের একদম উপরে ডান কোণায় থাকা ৩টি ফোঁটা (⋮) আইকনে ট্যাপ করুন।'
                        : 'Tap the three vertical dots (⋮) in the top-right corner of Google Chrome.'}
                    </p>
                  </div>
                </div>

                <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-emerald-600/30 border border-emerald-500/50 text-emerald-400 font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
                    ৩
                  </div>
                  <div className="text-xs space-y-1">
                    <div className="font-bold text-white">
                      {isBn ? '৩. "Install app" বা "Add to Home screen" চাপুন' : '3. Tap "Install app" or "Add to Home screen"'}
                    </div>
                    <p className="text-slate-400 leading-relaxed">
                      {isBn
                        ? 'মেন্যু থেকে "Install app" অথবা "হোম স্ক্রিনে যোগ করুন" চাপলেই আপনার ফোনের হোমস্ক্রিন ও অ্যাপ ড্রয়ারে মাতৃছায়া টেলিকম আসল মোবাইল অ্যাপের মতো ইনস্টল হয়ে যাবে।'
                        : 'Tap "Install app" or "Add to Home screen". Google will compile a native WebAPK and place the app icon directly on your home screen.'}
                    </p>
                  </div>
                </div>
              </div>

              {/* WebAPK & Standalone APK Explanation */}
              <div className="p-3.5 rounded-2xl bg-sky-950/40 border border-sky-500/30 space-y-2 text-xs">
                <div className="font-bold text-sky-300 flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-sky-400" />
                  <span>{isBn ? 'কেন এটি সাধারণ ওয়েবসাইটের চেয়ে সেরা ও শক্তিশালী?' : 'Why is this better than normal websites?'}</span>
                </div>
                <p className="text-slate-300 leading-relaxed text-[11px]">
                  {isBn
                    ? 'এটি আধুনিক WebAPK স্ট্যান্ডার্ড সমর্থন করে। ফোনে একবার ইনস্টল করার পর ব্রাউজারের অ্যাড্রেস বার বা বাড়তি কোনো বোতাম থাকে না — এটি পুরোপুরি ফুলস্ক্রিন আসল অ্যাপের মতো কাজ করে এবং ইন্টারনেট চলে গেলেও অফলাইন ক্যাশ দিয়ে সব হিসাব নিরাপদ রাখে।'
                    : 'This app is a PWA / WebAPK standard. Once installed, it runs in fullscreen standalone mode without browser bars and caches all data offline.'}
                </p>
              </div>

              {/* APK Creator Generator Help */}
              <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 space-y-2 text-xs">
                <div className="font-bold text-white flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <FileCode className="w-4 h-4 text-emerald-400" />
                    {isBn ? 'আলাদা অফলাইন APK ফাইল বানাতে চান?' : 'Want a standalone APK file?'}
                  </span>
                  <span className="text-[10px] text-slate-400">Easy Tool</span>
                </div>
                <p className="text-slate-400 text-[11px] leading-relaxed">
                  {isBn
                    ? 'যদি আপনি ডেলিভারি বা ফিল্ড বয়দের পেনড্রাইভ বা ব্লুটুথে অফলাইন .apk ফাইল দিতে চান, তবে pwabuilder.com বা Hermit এ গিয়ে এই লিংকটি দিলেই গুগল থেকে সরাসরি সাইন করা .apk ফাইল ডাউনলোড করে নেওয়া যায়।'
                    : 'If you need a physical .apk file for distribution via Bluetooth or USB, you can paste this URL into pwabuilder.com to generate a signed Android APK package.'}
                </p>
                <div className="pt-1 flex gap-2">
                  <button
                    onClick={handleDownloadMobileLauncher}
                    className="w-full py-2 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center justify-center gap-1.5 transition cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5 text-emerald-400" />
                    <span>{isBn ? 'মোবাইল ইনস্টলার ফাইল ডাউনলোড (.html)' : 'Download Mobile Launcher (.html)'}</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: Laptop & Desktop PC */}
          {activeTab === 'desktop' && (
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-sky-950/40 border border-sky-500/30 flex items-start gap-3 text-xs text-sky-200">
                <Monitor className="w-5 h-5 text-sky-400 shrink-0 mt-0.5" />
                <div className="leading-relaxed">
                  <span className="font-bold text-sky-300 block mb-1">
                    {isBn ? 'ল্যাপটপ বা কম্পিউটারে ব্যবহারের সুবিধা:' : 'Laptop & PC Desktop Features:'}
                  </span>
                  {isBn
                    ? 'কোনো হেভি সফটওয়্যার বা বিশাল সেটআপ ফাইলের প্রয়োজন নেই। এটি গুগল ক্রোম বা মাইক্রোসফট এজের মাধ্যমে সম্পূর্ণ স্বতন্ত্র ডেস্কটপ অ্যাপ (.exe এর মতো) হিসেবে চালু হয় এবং টাস্কবারে পিন করে রাখা যায়।'
                    : 'No heavy manual setup required. It launches as a standalone desktop application via Google Chrome or Microsoft Edge and can be pinned to your Windows taskbar.'}
                </div>
              </div>

              {/* Steps for PC */}
              <div className="space-y-3">
                <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-sky-600/30 border border-sky-500/50 text-sky-400 font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
                    ১
                  </div>
                  <div className="text-xs space-y-1">
                    <div className="font-bold text-white">
                      {isBn ? 'পদ্ধতি ১: ক্রোম বা এজ এর অ্যাড্রেস বারের "Install" আইকন' : 'Method 1: Click "Install" in Chrome/Edge Address Bar'}
                    </div>
                    <p className="text-slate-400 leading-relaxed">
                      {isBn
                        ? 'আপনার ব্রাউজারের অ্যাড্রেস বারের একদম ডান পাশে থাকা (⊕) বা কম্পিউটার ডাউনলোড আইকনে ক্লিক করুন এবং "Install" চাপুন।'
                        : 'Click the install icon (⊕ or computer download badge) on the right side of your browser address bar and select "Install".'}
                    </p>
                  </div>
                </div>

                <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-sky-600/30 border border-sky-500/50 text-sky-400 font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
                    ২
                  </div>
                  <div className="text-xs space-y-1">
                    <div className="font-bold text-white">
                      {isBn ? 'পদ্ধতি ২: ৩-ডট মেনু থেকে ইনস্টল' : 'Method 2: From 3-Dot Browser Menu'}
                    </div>
                    <p className="text-slate-400 leading-relaxed">
                      {isBn
                        ? 'ব্রাউজারের ৩-ডট মেনু (⋮) চাপুন > "Save and share" অথবা "Apps" > "Install Matrichhaya Telecom" চাপুন।'
                        : 'Click the three dots (⋮) in Chrome > "Save and share" or "Apps" > "Install Matrichhaya Telecom".'}
                    </p>
                  </div>
                </div>

                <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-sky-600/30 border border-sky-500/50 text-sky-400 font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
                    ৩
                  </div>
                  <div className="text-xs space-y-1">
                    <div className="font-bold text-white">
                      {isBn ? 'ডেস্কটপ ও টাস্কবারে পিন করা' : 'Pin to Windows Taskbar / Mac Dock'}
                    </div>
                    <p className="text-slate-400 leading-relaxed">
                      {isBn
                        ? 'ইনস্টল সম্পন্ন হওয়ার সাথে সাথে উইন্ডোজ টাস্কবারে রাইট ক্লিক করে "Pin to taskbar" করে রাখুন। এখন থেকে এক ক্লিকেই সরাসরি ওপেন হবে।'
                        : 'Once installed, right-click the taskbar icon and select "Pin to taskbar" for instant 1-click launch.'}
                    </p>
                  </div>
                </div>
              </div>

              {/* PC Productivity Shortcuts */}
              <div className="p-3.5 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-2 text-xs">
                <div className="font-bold text-slate-200 flex items-center gap-1.5">
                  <Printer className="w-4 h-4 text-sky-400" />
                  <span>{isBn ? 'ল্যাপটপ/পিসি কিবোর্ড শর্টকাট:' : 'Keyboard Shortcuts:'}</span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-400">
                  <div className="flex items-center justify-between p-2 rounded-lg bg-slate-900 border border-slate-800">
                    <span>{isBn ? 'চালান সরাসরি প্রিন্ট:' : 'Print Invoice:'}</span>
                    <kbd className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-200 font-mono">Ctrl + P</kbd>
                  </div>
                  <div className="flex items-center justify-between p-2 rounded-lg bg-slate-900 border border-slate-800">
                    <span>{isBn ? 'ফুলস্ক্রিন মোড:' : 'Fullscreen Kiosk:'}</span>
                    <kbd className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-200 font-mono">F11</kbd>
                  </div>
                  <div className="flex items-center justify-between p-2 rounded-lg bg-slate-900 border border-slate-800">
                    <span>{isBn ? 'উইন্ডো রিলোড:' : 'Refresh DB:'}</span>
                    <kbd className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-200 font-mono">Ctrl + R</kbd>
                  </div>
                  <div className="flex items-center justify-between p-2 rounded-lg bg-slate-900 border border-slate-800">
                    <span>{isBn ? 'ডায়ালগ বন্ধ:' : 'Close Dialog:'}</span>
                    <kbd className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-200 font-mono">Esc</kbd>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: Tablet & iPad */}
          {activeTab === 'tablet' && (
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-amber-950/40 border border-amber-500/30 flex items-start gap-3 text-xs text-amber-200">
                <Tablet className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                <div className="leading-relaxed">
                  <span className="font-bold text-amber-300 block mb-1">
                    {isBn ? 'ট্যাবলেট ও আইপ্যাডে পয়েন্ট অফ সেল (POS) রেজিস্টার:' : 'Tablet POS Register Mode:'}
                  </span>
                  {isBn
                    ? 'ট্যাবলেট স্ক্রিনে সফটওয়্যারটি অটোমেটিক ওয়াইড পিওএস লেআউটে সুইচ করে, যেখানে বাম পাশে প্রোডাক্ট ক্যাটালগ ও ডান পাশে রিয়েল-টাইম মেমো দেখা যায়।'
                    : 'On tablets, the software automatically adapts to a widescreen dual-column POS layout with inventory on the left and live invoice cart on the right.'}
                </div>
              </div>

              <div className="space-y-3">
                <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-amber-600/30 border border-amber-500/50 text-amber-400 font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
                    ১
                  </div>
                  <div className="text-xs space-y-1">
                    <div className="font-bold text-white">
                      {isBn ? 'আইপ্যাড (iPad Safari) ইউজারদের জন্য:' : 'For iPad Users (Safari):'}
                    </div>
                    <p className="text-slate-400 leading-relaxed">
                      {isBn
                        ? 'সাফারি ব্রাউজারের শেয়ার বাটন (বক্স থেকে ওপরের দিকে তীর ⬆) চাপুন > নিচে স্ক্রোল করে "Add to Home Screen" নির্বাচন করুন।'
                        : 'Tap the Share icon (box with upward arrow ⬆) in Safari > Scroll down and tap "Add to Home Screen".'}
                    </p>
                  </div>
                </div>

                <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-amber-600/30 border border-amber-500/50 text-amber-400 font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
                    ২
                  </div>
                  <div className="text-xs space-y-1">
                    <div className="font-bold text-white">
                      {isBn ? 'অ্যান্ড্রয়েড ট্যাবলেট (Android Tablet) ইউজারদের জন্য:' : 'For Android Tablet Users:'}
                    </div>
                    <p className="text-slate-400 leading-relaxed">
                      {isBn
                        ? 'গুগল ক্রোম ব্রাউজারের ৩-ডট মেনু থেকে "Install app" চাপলেই ট্যাবলেটের হোম স্ক্রিনে চলে আসবে।'
                        : 'Open Chrome on tablet > Tap 3 dots menu > "Install app" for instant home screen placement.'}
                    </p>
                  </div>
                </div>

                <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-amber-600/30 border border-amber-500/50 text-amber-400 font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
                    ৩
                  </div>
                  <div className="text-xs space-y-1">
                    <div className="font-bold text-white">
                      {isBn ? 'ব্লুটুথ বারকোড স্ক্যানার ও থার্মাল প্রিন্টার:' : 'Bluetooth Scanner & Printer Support:'}
                    </div>
                    <p className="text-slate-400 leading-relaxed">
                      {isBn
                        ? 'ট্যাবলেটের সাথে ব্লুটুথ বা ওটিজি বারকোড স্ক্যানার কানেক্ট করে খুব দ্রুত চালানে প্রোডাক্ট যুক্ত করা যায়।'
                        : 'Supports Bluetooth barcode scanners and wireless 58mm / 80mm thermal POS printers.'}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: Offline Files & Data Backup */}
          {activeTab === 'offline_files' && (
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-purple-950/40 border border-purple-500/30 flex items-start gap-3 text-xs text-purple-200">
                <Database className="w-5 h-5 text-purple-400 shrink-0 mt-0.5" />
                <div className="leading-relaxed">
                  <span className="font-bold text-purple-300 block mb-1">
                    {isBn ? 'ইনস্টল ও ব্যাকআপ ফাইলসমূহ:' : 'Offline Launchers & Full Database Backup:'}
                  </span>
                  {isBn
                    ? 'আপনি চাইলে একটি অফলাইন লঞ্চার ফাইল ডাউনলোড করে যেকোনো কম্পিউটার বা ফোনে রেখে দিতে পারেন, এবং যেকোনো সময় পুরো ডেটাবেজের সুরক্ষিত ব্যাকআপ ডাউনলোড করতে পারেন।'
                    : 'Download a standalone launcher file or export a full JSON database snapshot for safe local retention.'}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Mobile Launcher File */}
                <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-3 flex flex-col justify-between">
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2 text-sm font-bold text-emerald-300">
                      <Smartphone className="w-4 h-4 text-emerald-400" />
                      <span>{isBn ? 'মোবাইল ইনস্টলার ফাইল' : 'Mobile Installer'}</span>
                    </div>
                    <p className="text-xs text-slate-400">
                      {isBn
                        ? 'একটি ছোট .html ফাইল যা ফোনে রেখে দিলে যেকোনো সময় এক ক্লিকে অ্যাপ চালু করা যায়।'
                        : 'A lightweight mobile launcher HTML file to save on phone for 1-click launch.'}
                    </p>
                  </div>

                  <button
                    onClick={handleDownloadMobileLauncher}
                    id="btn-download-mobile-launcher"
                    className="w-full py-2.5 px-3 rounded-xl bg-emerald-900/60 hover:bg-emerald-800/80 text-emerald-200 border border-emerald-500/40 text-xs font-bold flex items-center justify-center gap-2 transition cursor-pointer"
                  >
                    <Download className="w-4 h-4" />
                    <span>{isBn ? 'মোবাইল লঞ্চার ডাউনলোড' : 'Download Mobile (.html)'}</span>
                  </button>
                </div>

                {/* Desktop Launcher File Download */}
                <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-3 flex flex-col justify-between">
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2 text-sm font-bold text-white">
                      <FileCode className="w-4 h-4 text-sky-400" />
                      <span>{isBn ? 'ডেস্কটপ লঞ্চার ফাইল' : 'Desktop Launcher'}</span>
                    </div>
                    <p className="text-xs text-slate-400">
                      {isBn
                        ? 'একটি ছোট .html ফাইল যা পিসির ডেস্কটপে সেভ করে ডাবল-ক্লিক করলেই সরাসরি সফটওয়্যার ওপেন হবে।'
                        : 'A lightweight launcher file to save on desktop for quick 1-click execution.'}
                    </p>
                  </div>

                  <button
                    onClick={handleDownloadDesktopLauncher}
                    id="btn-download-desktop-launcher"
                    className="w-full py-2.5 px-3 rounded-xl bg-sky-900/60 hover:bg-sky-800/80 text-sky-200 border border-sky-500/40 text-xs font-bold flex items-center justify-center gap-2 transition cursor-pointer"
                  >
                    <Download className="w-4 h-4" />
                    <span>{isBn ? 'ডেস্কটপ লঞ্চার ডাউনলোড' : 'Download Desktop (.html)'}</span>
                  </button>
                </div>

                {/* Local JSON Database Backup */}
                <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-3 flex flex-col justify-between sm:col-span-2">
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2 text-sm font-bold text-white">
                      <HardDrive className="w-4 h-4 text-emerald-400" />
                      <span>{isBn ? 'সম্পূর্ণ ডেটাবেজ ব্যাকআপ (Full DB Backup)' : 'Full DB Backup'}</span>
                    </div>
                    <p className="text-xs text-slate-400">
                      {isBn
                        ? 'সকল মেমো, স্টক, বাকি খাতা, ভাউচার ও ক্যাশের সম্পূর্ণ ব্যাকআপ ফাইল (JSON) ডাউনলোড করুন।'
                        : 'Download a complete offline JSON snapshot of all invoices, stock, ledger, and cash balance.'}
                    </p>
                  </div>

                  <button
                    onClick={downloadLocalBackupJSON}
                    id="btn-download-db-backup-json"
                    className="w-full py-2.5 px-3 rounded-xl bg-purple-900/60 hover:bg-purple-800/80 text-purple-200 border border-purple-500/40 text-xs font-bold flex items-center justify-center gap-2 transition cursor-pointer"
                  >
                    <Download className="w-4 h-4" />
                    <span>{isBn ? 'ব্যাকআপ JSON ডাউনলোড' : 'Download Backup (.json)'}</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* In-App Live Update Card */}
          <div className="p-3.5 rounded-2xl bg-gradient-to-r from-indigo-950/70 via-slate-950 to-indigo-950/70 border border-indigo-500/40 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
            <div className="flex items-start gap-2.5">
              <div className="p-2 rounded-xl bg-indigo-500/20 text-indigo-300 shrink-0 mt-0.5">
                <RefreshCw className={`w-4 h-4 ${isUpdateAvailable ? 'animate-spin text-amber-300' : 'text-indigo-400'}`} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h4 className="font-bold text-white text-xs sm:text-sm">
                    {isBn ? 'ইনস্টল করা অ্যাপ আপডেট করবেন কীভাবে?' : 'How to Update the Installed App?'}
                  </h4>
                  {isUpdateAvailable && (
                    <span className="text-[10px] px-1.5 py-0.2 rounded-full font-bold bg-amber-500/30 text-amber-300 border border-amber-500/40 animate-pulse">
                      Update Ready
                    </span>
                  )}
                </div>
                <p className="text-slate-300 text-[11px] mt-0.5 leading-relaxed">
                  {isBn
                    ? 'ডেভেলপার যখনই অ্যাপে নতুন ফিচার যুক্ত করবেন, এক ক্লিকে ইনস্টল করা অ্যাপের পুরনো ক্যাশ আপডেট করে নেওয়া যায়।'
                    : 'Whenever updates are published, click below to immediately sync and update your installed app.'}
                </p>
              </div>
            </div>

            {onOpenUpdateModal && (
              <button
                type="button"
                onClick={() => {
                  onOpenUpdateModal();
                  onClose();
                }}
                id="btn-install-modal-open-update"
                className="w-full sm:w-auto py-2 px-3.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs flex items-center justify-center gap-2 shrink-0 shadow-md shadow-indigo-950/40 transition active:scale-95 cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                <span>{isBn ? 'সফটওয়্যার আপডেট কেন্দ্র' : 'Update Manager'}</span>
              </button>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3.5 bg-slate-950 border-t border-slate-800 flex items-center justify-between shrink-0">
          <button
            onClick={handleShareWhatsApp}
            className="text-xs font-semibold text-emerald-400 hover:underline flex items-center gap-1.5 cursor-pointer"
          >
            <Send className="w-3.5 h-3.5" />
            <span>{isBn ? 'হোয়াটসঅ্যাপে পাঠান' : 'Share on WhatsApp'}</span>
          </button>

          <button
            onClick={onClose}
            className="py-2 px-5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs transition cursor-pointer"
          >
            {isBn ? 'বুঝেছি / বন্ধ করুন' : 'Close'}
          </button>
        </div>
      </div>
    </div>
  );
};
