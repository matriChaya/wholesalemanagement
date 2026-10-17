import React, { useState, useEffect } from 'react';
import { useWholesale } from '../context/WholesaleContext';
import { translations } from '../utils/translations';
import {
  ShieldCheck,
  Fingerprint,
  KeyRound,
  Clock,
  CheckCircle2,
  AlertCircle,
  X,
  Lock,
  Smartphone,
  Cpu,
  Sparkles,
  ShieldAlert,
  Scan
} from 'lucide-react';
import {
  registerBiometricCredentialForRole,
  authenticateBiometricCredentialForRole,
  updateRolePin,
  verifyRolePin,
  setRolePin,
  getStoredRolePin,
  playFeedbackSound,
  triggerHaptic,
  ROLE_DEFAULT_PINS
} from '../lib/biometrics';
import { UserRole } from '../types';

interface BiometricSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const BiometricSettingsModal: React.FC<BiometricSettingsModalProps> = ({
  isOpen,
  onClose,
}) => {
  const {
    language,
    currentRole,
    currentUser,
    users,
    setUsers,
    isBiometricEnabled,
    setBiometricEnabled,
    autoLockDuration,
    setAutoLockDuration,
    isPlatformBiometricAvailable,
    lockBiometric,
  } = useWholesale();

  const t = translations[language];

  const [activeSubTab, setActiveSubTab] = useState<'general' | 'pin' | 'enroll'>('general');
  const [selectedRoleTarget, setSelectedRoleTarget] = useState<UserRole>(currentRole || 'admin');
  
  // PIN change state
  const [currentPin, setCurrentPin] = useState<string>('');
  const [newPin, setNewPin] = useState<string>('');
  const [confirmPin, setConfirmPin] = useState<string>('');
  const [pinStatus, setPinStatus] = useState<{ type: 'success' | 'error' | ''; message: string }>({
    type: '',
    message: '',
  });

  // Sensor Test State
  const [testResult, setTestResult] = useState<string>('');
  const [isTestingSensor, setIsTestingSensor] = useState<boolean>(false);

  // Biometric Enrollment State
  const [isEnrolling, setIsEnrolling] = useState<boolean>(false);
  const [enrollResult, setEnrollResult] = useState<{ success: boolean; msg: string } | null>(null);

  if (!isOpen) return null;

  // Selected role's user profile
  const targetUser = users.find((u) => u.role === selectedRoleTarget);

  // Handle PIN Change for selected role
  const handleChangePin = async (e: React.FormEvent) => {
    e.preventDefault();
    setPinStatus({ type: '', message: '' });

    if (newPin.length !== 4 || !/^\d+$/.test(newPin)) {
      setPinStatus({ type: 'error', message: language === 'bn' ? 'নতুন পিন অবশ্যই ঠিক ৪ ডিজিটের হতে হবে।' : 'New PIN must be exactly 4 digits' });
      playFeedbackSound('error');
      return;
    }

    if (newPin !== confirmPin) {
      setPinStatus({ type: 'error', message: language === 'bn' ? 'নতুন পিন এবং নিশ্চিতকরণ পিন মেলেনি।' : 'New PIN and Confirm PIN do not match' });
      playFeedbackSound('error');
      return;
    }

    const targetDefault = ROLE_DEFAULT_PINS[selectedRoleTarget];
    const success = await updateRolePin(selectedRoleTarget, currentPin, newPin, targetUser?.pin);
    if (success) {
      // Sync to user profile in users state & localStorage
      const updatedUsers = users.map((u) => {
        if (u.role === selectedRoleTarget) {
          return { ...u, pin: newPin };
        }
        return u;
      });
      setUsers(updatedUsers);
      localStorage.setItem('ws_users', JSON.stringify(updatedUsers));

      const roleLabel =
        selectedRoleTarget === 'admin'
          ? (language === 'bn' ? 'এডমিন' : 'Admin')
          : selectedRoleTarget === 'counter'
          ? (language === 'bn' ? 'ক্যাশ কাউন্টার' : 'Cash Counter')
          : (language === 'bn' ? 'ডিএসআর' : 'DSR');

      setPinStatus({
        type: 'success',
        message: language === 'bn'
          ? `${roleLabel}-এর সিকিউরিটি পিন সফলভাবে পরিবর্তন হয়েছে!`
          : `${roleLabel} security PIN updated successfully!`,
      });
      playFeedbackSound('success');
      triggerHaptic([40, 80]);
      setCurrentPin('');
      setNewPin('');
      setConfirmPin('');
    } else {
      setPinStatus({
        type: 'error',
        message: language === 'bn'
          ? `বর্তমান পিন ভুল হয়েছে। (ডিফল্ট: ${targetDefault})`
          : `Current PIN is incorrect. (Default: ${targetDefault})`,
      });
      playFeedbackSound('error');
    }
  };

  // Test Biometric Sensor Prompt for Selected Role
  const handleTestSensor = async () => {
    setIsTestingSensor(true);
    setTestResult('');
    playFeedbackSound('scan');

    const res = await authenticateBiometricCredentialForRole(selectedRoleTarget);
    setIsTestingSensor(false);
    if (res.success) {
      setTestResult(
        language === 'bn'
          ? 'ফিঙ্গারপ্রিন্ট সফলভাবে যাচাই হয়েছে! WebAuthn সেন্সর কার্যকর।'
          : 'Sensor verified successfully! WebAuthn Platform Authenticator confirmed.'
      );
      playFeedbackSound('success');
      triggerHaptic([40, 80]);
    } else {
      setTestResult(
        res.error || (language === 'bn' ? 'বায়োমেট্রিক স্ক্যান বাতিল বা পাওয়া যায়নি।' : 'Biometric sensor test was cancelled or unavailable.')
      );
      playFeedbackSound('error');
    }
  };

  // Enroll Device Biometrics for Selected Role
  const handleEnrollBiometrics = async () => {
    setIsEnrolling(true);
    setEnrollResult(null);
    playFeedbackSound('scan');

    const roleName =
      selectedRoleTarget === 'admin'
        ? 'Admin Owner'
        : selectedRoleTarget === 'counter'
        ? 'Counter Cashier'
        : 'DSR Sales';

    const res = await registerBiometricCredentialForRole(selectedRoleTarget, roleName);
    setIsEnrolling(false);

    if (res.success) {
      setEnrollResult({
        success: true,
        msg: language === 'bn'
          ? `${roleName}-এর জন্য ফিঙ্গারপ্রিন্ট বায়োমেট্রিক সফলভাবে ডিভাইসে নিবন্ধিত হয়েছে।`
          : `Biometric credential securely registered for ${roleName}.`,
      });
      playFeedbackSound('success');
      triggerHaptic([50, 50, 100]);
    } else {
      setEnrollResult({
        success: false,
        msg: res.error || (language === 'bn' ? 'বায়োমেট্রিক নিবন্ধন ব্যর্থ হয়েছে।' : 'Failed to register biometric credential.'),
      });
      playFeedbackSound('error');
    }
  };

  const roleTabConfigs: { role: UserRole; titleBn: string; titleEn: string; defaultPin: string }[] = [
    { role: 'admin', titleBn: 'এডমিন (Admin)', titleEn: 'Admin', defaultPin: '1234' },
    { role: 'counter', titleBn: 'ক্যাশ কাউন্টার (Counter)', titleEn: 'Cash Counter', defaultPin: '2345' },
    { role: 'dsr', titleBn: 'ডিএসআর (DSR)', titleEn: 'DSR', defaultPin: '3456' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-700 rounded-3xl w-full max-w-md overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
              <Fingerprint className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-black text-slate-100 text-base">{t.securitySettings}</h3>
              <p className="text-[11px] text-slate-400">WebAuthn & Secure Storage Bridge</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Sub Navigation */}
        <div className="grid grid-cols-3 p-1 bg-slate-950/80 border-b border-slate-800 gap-1 text-xs font-bold">
          <button
            onClick={() => setActiveSubTab('general')}
            className={`py-2 rounded-xl transition flex items-center justify-center gap-1.5 ${
              activeSubTab === 'general'
                ? 'bg-slate-800 text-emerald-400 shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>General</span>
          </button>
          <button
            onClick={() => setActiveSubTab('enroll')}
            className={`py-2 rounded-xl transition flex items-center justify-center gap-1.5 ${
              activeSubTab === 'enroll'
                ? 'bg-slate-800 text-emerald-400 shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Fingerprint className="w-3.5 h-3.5" />
            <span>Biometrics</span>
          </button>
          <button
            onClick={() => setActiveSubTab('pin')}
            className={`py-2 rounded-xl transition flex items-center justify-center gap-1.5 ${
              activeSubTab === 'pin'
                ? 'bg-slate-800 text-emerald-400 shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <KeyRound className="w-3.5 h-3.5" />
            <span>PIN</span>
          </button>
        </div>

        {/* Content Area */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-4 flex-1">
          {/* GENERAL TAB */}
          {activeSubTab === 'general' && (
            <div className="space-y-4">
              {/* Biometric Toggle Switch */}
              <div className="p-3.5 rounded-2xl bg-slate-800/60 border border-slate-700/80 flex items-center justify-between">
                <div>
                  <div className="font-bold text-sm text-white flex items-center gap-2">
                    <span>{t.enableBiometrics}</span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-black">
                      RECOMMENDED
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {t.protectedRolesLabel}
                  </p>
                </div>
                <button
                  onClick={() => {
                    playFeedbackSound('click');
                    setBiometricEnabled(!isBiometricEnabled);
                  }}
                  id="toggle-biometric-protection"
                  className={`w-12 h-6.5 rounded-full p-0.5 transition-colors duration-200 ease-in-out focus:outline-none ${
                    isBiometricEnabled ? 'bg-emerald-500' : 'bg-slate-700'
                  }`}
                >
                  <div
                    className={`w-5.5 h-5.5 rounded-full bg-white shadow-md transform transition-transform duration-200 ease-in-out ${
                      isBiometricEnabled ? 'translate-x-5.5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>

              {/* Hardware / Platform Bridge Status */}
              <div className="p-3.5 rounded-2xl bg-slate-950/70 border border-slate-800 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                    <Cpu className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Security Bridge Status</span>
                  </span>
                  <span className="text-[10px] font-bold text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded-full border border-emerald-500/30 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                    ACTIVE
                  </span>
                </div>
                <p className="text-xs text-slate-400 leading-relaxed">
                  {isPlatformBiometricAvailable
                    ? 'Device supports WebAuthn Platform Authenticators (Android BiometricPrompt, Touch ID, Windows Hello).'
                    : 'Operating on Cryptographic SHA-256 secure storage bridge with hardware keystore simulation.'}
                </p>
              </div>

              {/* Auto-Lock Timeout */}
              <div className="p-3.5 rounded-2xl bg-slate-800/60 border border-slate-700/80 space-y-2">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-sky-400" />
                  <span className="font-bold text-sm text-white">{t.autoLockTimer}</span>
                </div>
                <div className="grid grid-cols-2 gap-2 pt-1">
                  {[
                    { val: 0, label: t.autoLockImmediate },
                    { val: 1, label: t.autoLock1Min },
                    { val: 5, label: t.autoLock5Min },
                    { val: 15, label: t.autoLock15Min },
                  ].map((option) => (
                    <button
                      key={option.val}
                      onClick={() => {
                        playFeedbackSound('click');
                        setAutoLockDuration(option.val);
                      }}
                      className={`p-2.5 rounded-xl border text-xs font-semibold text-left transition ${
                        autoLockDuration === option.val
                          ? 'border-emerald-500 bg-emerald-950/30 text-emerald-300 font-bold ring-1 ring-emerald-500/30'
                          : 'border-slate-700 bg-slate-900/60 text-slate-300 hover:bg-slate-900'
                      }`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Quick Lock Session Button */}
              <button
                onClick={() => {
                  playFeedbackSound('click');
                  lockBiometric();
                  onClose();
                }}
                id="btn-lock-session-now"
                className="w-full py-2.5 rounded-xl bg-amber-600/20 hover:bg-amber-600/30 border border-amber-500/40 text-amber-300 text-xs font-bold transition flex items-center justify-center gap-2"
              >
                <Lock className="w-4 h-4" />
                <span>{t.lockDashboardNow}</span>
              </button>
            </div>
          )}

          {/* BIOMETRIC ENROLLMENT & TESTING TAB */}
          {activeSubTab === 'enroll' && (
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-gradient-to-br from-slate-900 to-emerald-950/30 border border-slate-800 text-center">
                <div className="w-14 h-14 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 mx-auto flex items-center justify-center mb-2.5">
                  <Fingerprint className="w-8 h-8" />
                </div>
                <h4 className="font-bold text-white text-sm">Platform Biometric Enrollment</h4>
                <p className="text-xs text-slate-400 mt-1 max-w-[280px] mx-auto">
                  Register this device’s biometric sensor (Fingerprint, Touch ID, Face ID) for instant passwordless dashboard unlock.
                </p>

                <div className="mt-4 flex flex-col gap-2">
                  <button
                    onClick={handleEnrollBiometrics}
                    disabled={isEnrolling}
                    id="btn-enroll-biometrics"
                    className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition flex items-center justify-center gap-2 shadow-lg"
                  >
                    <Fingerprint className="w-4 h-4" />
                    <span>{isEnrolling ? 'Enrolling Sensor...' : t.enrollBiometricBtn}</span>
                  </button>

                  <button
                    onClick={handleTestSensor}
                    disabled={isTestingSensor}
                    id="btn-test-biometric-sensor"
                    className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs font-bold transition flex items-center justify-center gap-2"
                  >
                    <Scan className="w-4 h-4 text-emerald-400" />
                    <span>{isTestingSensor ? 'Testing...' : t.testSensorBtn}</span>
                  </button>
                </div>
              </div>

              {/* Enrollment status note */}
              {enrollResult && (
                <div
                  className={`p-3 rounded-xl border text-xs flex items-start gap-2 ${
                    enrollResult.success
                      ? 'bg-emerald-950/60 border-emerald-500/40 text-emerald-300'
                      : 'bg-amber-950/60 border-amber-500/40 text-amber-300'
                  }`}
                >
                  <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-emerald-400" />
                  <span>{enrollResult.msg}</span>
                </div>
              )}

              {/* Test result note */}
              {testResult && (
                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-300">
                  <strong>Test Result:</strong> {testResult}
                </div>
              )}
            </div>
          )}

          {/* PIN MANAGEMENT TAB */}
          {activeSubTab === 'pin' && (
            <form onSubmit={handleChangePin} className="space-y-3.5">
              <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                <span className="text-[11px] font-bold text-slate-300 block">
                  {language === 'bn' ? 'কোন রোলের পিন পরিবর্তন করবেন:' : 'Select role to update PIN:'}
                </span>
                <div className="grid grid-cols-3 gap-1.5">
                  {roleTabConfigs.map((r) => (
                    <button
                      key={r.role}
                      type="button"
                      onClick={() => {
                        setSelectedRoleTarget(r.role);
                        setPinStatus({ type: '', message: '' });
                      }}
                      className={`py-1.5 px-2 rounded-lg text-xs font-bold border transition text-center cursor-pointer ${
                        selectedRoleTarget === r.role
                          ? 'bg-emerald-600 text-white border-emerald-500 shadow-sm'
                          : 'bg-slate-900 text-slate-400 border-slate-700 hover:text-white'
                      }`}
                    >
                      <span>{language === 'bn' ? r.titleBn : r.titleEn}</span>
                      <span className="block text-[10px] opacity-75 font-mono">({r.defaultPin})</span>
                    </button>
                  ))}
                </div>
              </div>

              <p className="text-xs text-slate-400">
                {language === 'bn'
                  ? `নির্বাচিত রোলের ৪-ডিজিট পিন পরিবর্তন করুন। (ডিফল্ট: ${ROLE_DEFAULT_PINS[selectedRoleTarget]})`
                  : `Change 4-digit security PIN for selected role. (Default: ${ROLE_DEFAULT_PINS[selectedRoleTarget]})`}
              </p>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  {t.currentPin}
                </label>
                <input
                  type="password"
                  maxLength={4}
                  value={currentPin}
                  onChange={(e) => setCurrentPin(e.target.value)}
                  placeholder={`Enter current PIN (Default: ${ROLE_DEFAULT_PINS[selectedRoleTarget]})`}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500 font-mono"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  {t.newPin}
                </label>
                <input
                  type="password"
                  maxLength={4}
                  value={newPin}
                  onChange={(e) => setNewPin(e.target.value)}
                  placeholder="Enter new 4-digit PIN"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  {t.confirmNewPin}
                </label>
                <input
                  type="password"
                  maxLength={4}
                  value={confirmPin}
                  onChange={(e) => setConfirmPin(e.target.value)}
                  placeholder="Confirm new 4-digit PIN"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500"
                  required
                />
              </div>

              {pinStatus.message && (
                <div
                  className={`p-2.5 rounded-xl border text-xs flex items-center gap-2 ${
                    pinStatus.type === 'success'
                      ? 'bg-emerald-950/80 border-emerald-500/50 text-emerald-300'
                      : 'bg-rose-950/80 border-rose-500/50 text-rose-300'
                  }`}
                >
                  {pinStatus.type === 'success' ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-rose-400" />
                  )}
                  <span>{pinStatus.message}</span>
                </div>
              )}

              <button
                type="submit"
                id="btn-submit-change-pin"
                className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition shadow-md"
              >
                {t.changePin}
              </button>
            </form>
          )}
        </div>

        {/* Footer */}
        <div className="p-3 bg-slate-950/80 border-t border-slate-800 text-center">
          <button
            onClick={onClose}
            className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-xl transition"
          >
            {t.save} / {t.cancel}
          </button>
        </div>
      </div>
    </div>
  );
};
