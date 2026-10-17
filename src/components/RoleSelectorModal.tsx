import React, { useState } from 'react';
import { useWholesale } from '../context/WholesaleContext';
import { UserRole } from '../types';
import { translations } from '../utils/translations';
import {
  Shield,
  ShoppingCart,
  Truck,
  Store,
  Check,
  X,
  User,
  UserPlus,
  LogIn,
  LogOut,
  Laptop,
  Lock,
  Unlock,
  KeyRound,
  Fingerprint,
  AlertCircle,
  Delete,
  ArrowLeft,
  CheckCircle2
} from 'lucide-react';
import {
  verifyRolePin,
  authenticateBiometricCredentialForRole,
  playFeedbackSound,
  triggerHaptic,
  ROLE_DEFAULT_PINS
} from '../lib/biometrics';

interface RoleSelectorModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const RoleSelectorModal: React.FC<RoleSelectorModalProps> = ({ isOpen, onClose }) => {
  const {
    language,
    currentRole,
    setRole,
    users,
    currentUser,
    setCurrentUser,
    openAuthModal,
    logout,
    isAuthenticated,
    unlockBiometric,
  } = useWholesale();
  const t = translations[language];

  // Challenge state for cross-role protection
  const [pendingRole, setPendingRole] = useState<UserRole | null>(null);
  const [pinDigits, setPinDigits] = useState<string[]>([]);
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [isVerifyingBio, setIsVerifyingBio] = useState<boolean>(false);
  const [isSuccess, setIsSuccess] = useState<boolean>(false);
  const [showHint, setShowHint] = useState<boolean>(false);

  if (!isOpen) return null;

  const roleConfigs: Array<{
    role: UserRole;
    title: string;
    desc: string;
    icon: React.ReactNode;
    color: string;
    bg: string;
  }> = [
    {
      role: 'admin',
      title: t.admin,
      desc: t.roleAdminDesc,
      icon: <Shield className="w-5 h-5 text-amber-400" />,
      color: 'border-amber-500/50 bg-amber-950/20 text-amber-300',
      bg: 'hover:border-amber-500/60',
    },
    {
      role: 'counter',
      title: t.counter,
      desc: t.roleCounterDesc,
      icon: <ShoppingCart className="w-5 h-5 text-emerald-400" />,
      color: 'border-emerald-500/50 bg-emerald-950/20 text-emerald-300',
      bg: 'hover:border-emerald-500/60',
    },
    {
      role: 'dsr',
      title: t.dsr,
      desc: t.roleDSRDesc,
      icon: <Truck className="w-5 h-5 text-sky-400" />,
      color: 'border-sky-500/50 bg-sky-950/20 text-sky-300',
      bg: 'hover:border-sky-500/60',
    },
    {
      role: 'retailer',
      title: t.retailer,
      desc: t.roleRetailerDesc,
      icon: <Store className="w-5 h-5 text-purple-400" />,
      color: 'border-purple-500/50 bg-purple-950/20 text-purple-300',
      bg: 'hover:border-purple-500/60',
    },
  ];

  const handleSelectRole = (role: UserRole) => {
    // If already in this role, simply close
    if (role === currentRole) {
      onClose();
      return;
    }

    // Admin, Counter, and DSR roles strictly require that role's PIN or Fingerprint
    if (['admin', 'counter', 'dsr'].includes(role)) {
      setPendingRole(role);
      setPinDigits([]);
      setErrorMsg('');
      setIsSuccess(false);
      return;
    }

    // Retailer role switch
    setRole(role);
    onClose();
  };

  const cancelChallenge = () => {
    setPendingRole(null);
    setPinDigits([]);
    setErrorMsg('');
    setIsSuccess(false);
  };

  const completeRoleSwitch = (targetRole: UserRole) => {
    setIsSuccess(true);
    playFeedbackSound('success');
    triggerHaptic([40, 60, 100]);

    setTimeout(() => {
      setRole(targetRole);
      const matchingUser = users.find((u) => u.role === targetRole);
      if (matchingUser) {
        setCurrentUser(matchingUser);
      }
      unlockBiometric();
      onClose();
      setPendingRole(null);
      setIsSuccess(false);
    }, 450);
  };

  // Keypad actions for PIN challenge
  const handlePinKey = async (num: string) => {
    if (!pendingRole || pinDigits.length >= 4 || isSuccess) return;
    playFeedbackSound('click');
    triggerHaptic(25);
    setErrorMsg('');

    const newDigits = [...pinDigits, num];
    setPinDigits(newDigits);

    if (newDigits.length === 4) {
      const fullPin = newDigits.join('');
      const targetUser = users.find((u) => u.role === pendingRole);
      const isValid = await verifyRolePin(pendingRole, fullPin, targetUser?.pin);

      if (isValid) {
        completeRoleSwitch(pendingRole);
      } else {
        playFeedbackSound('error');
        triggerHaptic([80, 100, 80]);
        const roleName =
          pendingRole === 'admin'
            ? (language === 'bn' ? 'এডমিন' : 'Admin')
            : pendingRole === 'counter'
            ? (language === 'bn' ? 'ক্যাশ কাউন্টার' : 'Cash Counter')
            : (language === 'bn' ? 'ডিএসআর' : 'DSR');
        setErrorMsg(
          language === 'bn'
            ? `ভুল পিন! ${roleName}-এর নির্দিষ্ট পিন ছাড়া প্রবেশ করা যাবে না।`
            : `Incorrect PIN for ${roleName}. Access denied.`
        );
        setPinDigits([]);
      }
    }
  };

  const handleBackspace = () => {
    if (pinDigits.length > 0) {
      playFeedbackSound('click');
      triggerHaptic(20);
      setPinDigits((prev) => prev.slice(0, -1));
    }
  };

  const handleClearPin = () => {
    playFeedbackSound('click');
    setPinDigits([]);
    setErrorMsg('');
  };

  // Biometric authentication for pending role
  const handleBiometricChallenge = async () => {
    if (!pendingRole || isVerifyingBio || isSuccess) return;
    setIsVerifyingBio(true);
    setErrorMsg('');
    playFeedbackSound('scan');
    triggerHaptic(30);

    try {
      const res = await authenticateBiometricCredentialForRole(pendingRole);
      setIsVerifyingBio(false);
      if (res.success) {
        completeRoleSwitch(pendingRole);
      } else {
        playFeedbackSound('error');
        triggerHaptic([60, 80]);
        setErrorMsg(
          language === 'bn'
            ? 'ফিঙ্গারপ্রিন্ট স্ক্যান ব্যর্থ বা বাতিল হয়েছে। ৪-ডিজিট পিন দিয়ে চেষ্টা করুন।'
            : 'Biometric verification failed or cancelled. Try PIN.'
        );
      }
    } catch {
      setIsVerifyingBio(false);
      setErrorMsg(
        language === 'bn'
          ? 'ফিঙ্গারপ্রিন্ট স্ক্যান পাওয়া যায়নি। পিন ব্যবহার করুন।'
          : 'Biometric not available. Use PIN.'
      );
    }
  };

  const pendingConfig = roleConfigs.find((r) => r.role === pendingRole);
  const pendingUser = users.find((u) => u.role === pendingRole);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200 select-none">
      <div className="bg-slate-900 border border-slate-700 rounded-3xl w-full max-w-md overflow-hidden shadow-2xl relative">
        {/* If Challenge is active, show the PIN / Biometric verification screen */}
        {pendingRole && pendingConfig ? (
          <div className="p-5 sm:p-6 flex flex-col items-center text-center animate-in zoom-in-95 duration-200">
            {/* Top Back & Close Buttons */}
            <div className="w-full flex items-center justify-between mb-2">
              <button
                onClick={cancelChallenge}
                className="p-1.5 rounded-xl bg-slate-800 text-slate-400 hover:text-white transition flex items-center gap-1 text-xs cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>{language === 'bn' ? 'ফিরে যান' : 'Back'}</span>
              </button>
              <button
                onClick={onClose}
                className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Lock Header */}
            <div className="p-3 rounded-2xl bg-slate-800/80 border border-slate-700 text-amber-400 mb-2">
              {isSuccess ? (
                <Unlock className="w-7 h-7 text-emerald-400 animate-bounce" />
              ) : (
                <Lock className="w-7 h-7" />
              )}
            </div>

            <h3 className="font-extrabold text-white text-lg">
              {language === 'bn'
                ? `${pendingConfig.title}-এ প্রবেশের নিরাপত্তা যাচাই`
                : `Security Verification: ${pendingConfig.title}`}
            </h3>

            <p className="text-xs text-slate-400 mt-1 max-w-[300px]">
              {language === 'bn'
                ? 'একজনের একাউন্টে অন্যজন ঢুকতে পারবেন না। প্রবেশ করতে এই রোলের নিজস্ব পিন বা ফিঙ্গারপ্রিন্ট দিন।'
                : 'Cross-role access is restricted. Verify with target role PIN or fingerprint.'}
            </p>

            {/* Target Role Pill */}
            <div className={`mt-3 px-3 py-1.5 rounded-full border text-xs flex items-center gap-2 ${pendingConfig.color}`}>
              {pendingConfig.icon}
              <span className="font-bold">{pendingConfig.title}</span>
              {pendingUser && (
                <span className="text-[11px] opacity-80">({pendingUser.name})</span>
              )}
            </div>

            {/* PIN Dots */}
            <div className="flex items-center justify-center gap-3 my-4">
              {[0, 1, 2, 3].map((index) => {
                const isFilled = pinDigits.length > index;
                return (
                  <div
                    key={index}
                    className={`w-4 h-4 rounded-full border-2 transition-all ${
                      isFilled
                        ? isSuccess
                          ? 'bg-emerald-400 border-emerald-400 scale-110'
                          : 'bg-white border-white scale-110 shadow-sm shadow-white/30'
                        : 'border-slate-600 bg-slate-950/60'
                    }`}
                  />
                );
              })}
            </div>

            {/* Biometric Scan Trigger Button */}
            <button
              onClick={handleBiometricChallenge}
              disabled={isVerifyingBio || isSuccess}
              id="btn-role-challenge-biometric"
              className="mb-3 py-2 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs font-semibold transition flex items-center justify-center gap-2 cursor-pointer shadow-sm active:scale-95"
            >
              <Fingerprint className={`w-4 h-4 text-emerald-400 ${isVerifyingBio ? 'animate-bounce' : ''}`} />
              <span>
                {isVerifyingBio
                  ? (language === 'bn' ? 'ফিঙ্গারপ্রিন্ট যাচাই হচ্ছে...' : 'Scanning...')
                  : (language === 'bn' ? 'ফিঙ্গারপ্রিন্ট দিয়ে প্রবেশ করুন' : 'Authenticate via Fingerprint')}
              </span>
            </button>

            {/* Keypad */}
            <div className="grid grid-cols-3 gap-2 w-full max-w-[240px]">
              {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((digit) => (
                <button
                  key={digit}
                  onClick={() => handlePinKey(digit)}
                  id={`challenge-keypad-${digit}`}
                  className="h-11 rounded-xl bg-slate-800/80 hover:bg-slate-700 active:bg-slate-600 border border-slate-700/80 text-white font-bold text-base transition flex items-center justify-center shadow-sm cursor-pointer"
                >
                  {digit}
                </button>
              ))}
              <button
                onClick={handleClearPin}
                className="h-11 rounded-xl bg-slate-800/40 hover:bg-slate-700 text-slate-400 text-xs font-semibold transition flex items-center justify-center cursor-pointer"
              >
                C
              </button>
              <button
                onClick={() => handlePinKey('0')}
                className="h-11 rounded-xl bg-slate-800/80 hover:bg-slate-700 active:bg-slate-600 border border-slate-700/80 text-white font-bold text-base transition flex items-center justify-center shadow-sm cursor-pointer"
              >
                0
              </button>
              <button
                onClick={handleBackspace}
                className="h-11 rounded-xl bg-slate-800/40 hover:bg-slate-700 active:bg-slate-600 text-slate-300 transition flex items-center justify-center cursor-pointer"
              >
                <Delete className="w-4 h-4" />
              </button>
            </div>

            {/* Error Message */}
            {errorMsg && (
              <div className="mt-3 p-2 rounded-xl bg-rose-950/80 border border-rose-500/50 text-rose-300 text-xs flex items-center gap-1.5 animate-shake w-full justify-center">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate">{errorMsg}</span>
              </div>
            )}

            {/* Helper Hint */}
            <div className="mt-3">
              <button
                onClick={() => setShowHint(!showHint)}
                className="text-[11px] text-slate-400 hover:text-slate-300 underline cursor-pointer"
              >
                {showHint ? (language === 'bn' ? 'হিন্ট বন্ধ করুন' : 'Hide Hint') : (language === 'bn' ? 'ডিফল্ট পিন কোড কত?' : 'Default PIN?')}
              </button>
              {showHint && (
                <div className="mt-1.5 p-2 rounded-xl bg-slate-950 border border-slate-800 text-[11px] text-amber-300 text-center">
                  {language === 'bn'
                    ? `${pendingConfig.title}-এর ডিফল্ট পিন: `
                    : `Default PIN for ${pendingConfig.title}: `}
                  <strong className="text-white font-mono">{ROLE_DEFAULT_PINS[pendingRole]}</strong>
                </div>
              )}
            </div>
          </div>
        ) : (
          /* Normal Role Selection Menu */
          <>
            <div className="p-4 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <User className="w-5 h-5 text-emerald-400" />
                <h3 className="font-bold text-slate-100 text-base">{t.switchRole}</h3>
              </div>
              <button
                onClick={onClose}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 space-y-3 max-h-[75vh] overflow-y-auto">
              {/* Multi-Device Independence Notice */}
              <div className="p-2.5 rounded-xl bg-blue-950/40 border border-blue-500/30 text-blue-200 text-xs flex items-start gap-2">
                <Laptop className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
                <p className="text-[11px] leading-relaxed">
                  {language === 'bn'
                    ? 'এডমিন, ক্যাশ কাউন্টার ও ডিএসআর সবার আলাদা আলাদা পিন ও ফিঙ্গারপ্রিন্ট রয়েছে। এক রোলে লগইন করা অবস্থায় অন্য রোলে যেতে হলে সেই রোলের পিন বা ফিঙ্গারপ্রিন্ট দিতে হবে।'
                    : 'Admin, Cash Counter, and DSR each have distinct PINs & fingerprints. Switching roles requires target credentials.'}
                </p>
              </div>

              <p className="text-xs text-slate-400 leading-relaxed">
                {language === 'bn'
                  ? 'এই ডিভাইসের জন্য সক্রিয় ভূমিকা (রোল) নির্বাচন করুন:'
                  : 'Select active user role for this device:'}
              </p>

              <div className="space-y-2.5">
                {roleConfigs.map((item) => {
                  const isSelected = currentRole === item.role;
                  const matchingUser = users.find((u) => u.role === item.role);

                  return (
                    <button
                      key={item.role}
                      id={`role-select-${item.role}`}
                      onClick={() => handleSelectRole(item.role)}
                      className={`w-full text-left p-3.5 rounded-xl border transition-all flex items-start justify-between gap-3 cursor-pointer ${
                        isSelected
                          ? `${item.color} shadow-lg ring-1 ring-white/20`
                          : `bg-slate-800/60 border-slate-700/80 text-slate-300 ${item.bg} hover:bg-slate-800`
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div className="p-2 rounded-lg bg-slate-900/80 border border-slate-700/60 shrink-0">
                          {item.icon}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-sm text-white">{item.title}</span>
                            {matchingUser && (
                              <span className="text-[11px] text-slate-400">({matchingUser.name})</span>
                            )}
                          </div>
                          <p className="text-xs text-slate-400 mt-1 leading-snug">{item.desc}</p>
                        </div>
                      </div>

                      {isSelected ? (
                        <div className="w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center border border-emerald-500/40 shrink-0 mt-0.5">
                          <Check className="w-4 h-4" />
                        </div>
                      ) : (
                        <div className="w-6 h-6 rounded-full bg-slate-800 text-slate-500 flex items-center justify-center shrink-0 mt-0.5" title="PIN protected">
                          <Lock className="w-3.5 h-3.5" />
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="p-3.5 bg-slate-950/60 border-t border-slate-800 space-y-2">
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    onClose();
                    openAuthModal('register');
                  }}
                  className="flex-1 py-2 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/40 text-xs font-semibold rounded-xl transition flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  <span>{t.registerTab}</span>
                </button>
                <button
                  onClick={() => {
                    onClose();
                    openAuthModal('login');
                  }}
                  className="flex-1 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold rounded-xl transition flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <LogIn className="w-3.5 h-3.5" />
                  <span>{t.loginTab}</span>
                </button>
              </div>

              <div className="flex gap-2">
                {isAuthenticated && (
                  <button
                    onClick={() => {
                      onClose();
                      logout();
                    }}
                    className="py-2 px-3 bg-rose-950/40 hover:bg-rose-950/70 text-rose-300 border border-rose-500/30 text-xs font-semibold rounded-xl transition flex items-center justify-center gap-1.5 cursor-pointer"
                    title="Sign out of current account"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>{t.signOutBtn}</span>
                  </button>
                )}
                <button
                  onClick={onClose}
                  className="flex-1 py-2 bg-slate-850 hover:bg-slate-800 text-slate-400 hover:text-slate-200 text-xs font-semibold rounded-xl transition border border-slate-800 cursor-pointer"
                >
                  {t.cancel}
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
