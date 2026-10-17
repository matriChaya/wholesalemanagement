import React, { useState, useEffect } from 'react';
import { useWholesale } from '../context/WholesaleContext';
import { translations } from '../utils/translations';
import { UserRole, UserProfile } from '../types';
import {
  Phone,
  Lock,
  Eye,
  EyeOff,
  Shield,
  ShoppingCart,
  Truck,
  Store,
  LogIn,
  CheckCircle2,
  AlertCircle,
  Laptop,
  Smartphone,
  ChevronDown,
  UserPlus,
  X,
  Sparkles,
  ArrowRight
} from 'lucide-react';
import { sanitizePhoneNumber } from '../utils/contactPickerHelper';

interface LoginScreenProps {
  isModal?: boolean;
  onClose?: () => void;
  initialRole?: UserRole;
  initialMode?: 'login' | 'register';
}

export const LoginScreen: React.FC<LoginScreenProps> = ({
  isModal = false,
  onClose,
  initialRole = 'admin',
  initialMode = 'login',
}) => {
  const {
    language,
    users,
    currentUser,
    isAuthenticated,
    loginWithPhone,
    loginWithGoogle,
    registerAccount,
    selectDemoUser,
    activeAdminPhone,
  } = useWholesale();

  const t = translations[language];

  // Primary states
  const [mode, setMode] = useState<'login' | 'register'>(initialMode);
  const [selectedRole, setSelectedRole] = useState<UserRole>(initialRole);
  const [phone, setPhone] = useState('');
  const [pin, setPin] = useState('1234');
  const [showPassword, setShowPassword] = useState(false);

  // Registration specific states
  const [fullName, setFullName] = useState('');
  const [banglaName, setBanglaName] = useState('');
  const [email, setEmail] = useState('');
  const [shopName, setShopName] = useState('');
  const [routeArea, setRouteArea] = useState('');
  const [adminRef, setAdminRef] = useState(activeAdminPhone || '01937200635');

  // Status feedback
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Role metadata definition for the dropdown
  const roleOptions: {
    id: UserRole;
    titleBn: string;
    titleEn: string;
    subtitleBn: string;
    subtitleEn: string;
    icon: React.ReactNode;
    badgeBn: string;
    badgeEn: string;
    colorClasses: {
      bg: string;
      border: string;
      text: string;
      accent: string;
    };
    defaultPhone: string;
    defaultPin: string;
  }[] = [
    {
      id: 'admin',
      titleBn: 'এডমিন (Admin)',
      titleEn: 'Admin',
      subtitleBn: 'মালিক ও সার্বিক নিয়ন্ত্রণ (মোবাইল / ড্যাশবোর্ড)',
      subtitleEn: 'Owner & Full Management',
      icon: <Shield className="w-4 h-4 text-amber-400" />,
      badgeBn: 'মোবাইল / প্রধান নিয়ন্ত্রণ',
      badgeEn: 'Owner / Mobile',
      colorClasses: {
        bg: 'bg-amber-950/40',
        border: 'border-amber-500/50',
        text: 'text-amber-300',
        accent: 'from-amber-600 to-amber-700 hover:from-amber-500 hover:to-amber-600',
      },
      defaultPhone: '01937200635',
      defaultPin: '1234',
    },
    {
      id: 'dsr',
      titleBn: 'ডিএসআর / ডিএসএল (DSR)',
      titleEn: 'DSR / Field Rep',
      subtitleBn: 'মাঠপর্যায়ে অর্ডার বুকিং ও দোকান থেকে নগদ কালেকশন',
      subtitleEn: 'Field Order Booking & Route Collections',
      icon: <Truck className="w-4 h-4 text-sky-400" />,
      badgeBn: 'ফিল্ড সেলস / অর্ডার',
      badgeEn: 'Field Sales',
      colorClasses: {
        bg: 'bg-sky-950/40',
        border: 'border-sky-500/50',
        text: 'text-sky-300',
        accent: 'from-sky-600 to-sky-700 hover:from-sky-500 hover:to-sky-600',
      },
      defaultPhone: '01615154653',
      defaultPin: '3456',
    },
    {
      id: 'counter',
      titleBn: 'ক্যাশ কাউন্টার (Cash Counter)',
      titleEn: 'Cash Counter POS',
      subtitleBn: 'দোকানের ক্যাশিয়ার ও কাউন্টার সেলস (ল্যাপটপ / পিসি)',
      subtitleEn: 'Shop Cashier & Fast POS Billing (Laptop / PC)',
      icon: <ShoppingCart className="w-4 h-4 text-emerald-400" />,
      badgeBn: 'ল্যাপটপ / পিসি POS',
      badgeEn: 'PC POS Counter',
      colorClasses: {
        bg: 'bg-emerald-950/40',
        border: 'border-emerald-500/50',
        text: 'text-emerald-300',
        accent: 'from-emerald-600 to-teal-700 hover:from-emerald-500 hover:to-teal-600',
      },
      defaultPhone: '01949663733',
      defaultPin: '2345',
    },
    {
      id: 'retailer',
      titleBn: 'রিটেইলার (Retailer)',
      titleEn: 'Retail Merchant',
      subtitleBn: 'খুচরা দোকানদার পোর্টাল, মেমো হিস্ট্রি ও রিপ্লেসমেন্ট ক্লেইম',
      subtitleEn: 'Store Portal, Invoices & Replacement Claims',
      icon: <Store className="w-4 h-4 text-purple-400" />,
      badgeBn: 'খুচরা দোকানদার',
      badgeEn: 'Retail Store',
      colorClasses: {
        bg: 'bg-purple-950/40',
        border: 'border-purple-500/50',
        text: 'text-purple-300',
        accent: 'from-purple-600 to-purple-700 hover:from-purple-500 hover:to-purple-600',
      },
      defaultPhone: '01700000004',
      defaultPin: '1234',
    },
  ];

  // Helper to get matching user or default phone for selected role
  const getPhoneForRole = (role: UserRole) => {
    const matched = users.find((u) => u.role === role);
    if (matched && matched.phone) return matched.phone;
    const def = roleOptions.find((r) => r.id === role);
    return def ? def.defaultPhone : '01937200635';
  };

  // Sync phone & PIN when role changes from dropdown
  const handleRoleChange = (newRole: UserRole) => {
    setSelectedRole(newRole);
    setErrorMsg(null);
    setSuccessMsg(null);
    const targetPhone = getPhoneForRole(newRole);
    setPhone(targetPhone);
    const matched = users.find((u) => u.role === newRole);
    const def = roleOptions.find((r) => r.id === newRole);
    setPin(matched?.pin || def?.defaultPin || '1234');
  };

  // Initialize on mount
  useEffect(() => {
    const initialTargetPhone = getPhoneForRole(selectedRole);
    setPhone(initialTargetPhone);
    const matched = users.find((u) => u.role === selectedRole);
    const def = roleOptions.find((r) => r.id === selectedRole);
    setPin(matched?.pin || def?.defaultPin || '1234');
  }, []);

  // Handle Login Submit
  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    const cleanPhone = phone.trim().replace(/[^0-9+]/g, '');
    if (!cleanPhone || cleanPhone.length < 8) {
      setErrorMsg(
        language === 'bn'
          ? 'অনুগ্রহ করে সঠিক মোবাইল নম্বর দিন।'
          : 'Please enter a valid mobile phone number.'
      );
      return;
    }

    if (!pin.trim()) {
      setErrorMsg(
        language === 'bn'
          ? 'অনুগ্রহ করে পাসওয়ার্ড / পিন লিখুন।'
          : 'Please enter your password or PIN.'
      );
      return;
    }

    setIsLoading(true);
    try {
      const res = await loginWithPhone(cleanPhone, pin.trim(), selectedRole);
      if (res.success) {
        setSuccessMsg(res.message || t.authSuccessMsg);
        setTimeout(() => {
          if (onClose) onClose();
        }, 500);
      } else {
        setErrorMsg(
          res.message ||
            (language === 'bn'
              ? 'মোবাইল নম্বর বা পাসওয়ার্ড সঠিক নয়।'
              : 'Login failed. Invalid mobile number or password.')
        );
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Login error occurred.');
    } finally {
      setIsLoading(false);
    }
  };

  // Direct 1-Click Fast Login shortcut
  const handleFastLogin = (role: UserRole) => {
    setSelectedRole(role);
    const targetPhone = getPhoneForRole(role);
    setPhone(targetPhone);
    const matched = users.find((u) => u.role === role);
    const targetPin = matched?.pin || '1234';
    setPin(targetPin);

    // If user profile exists in state, quick enter
    if (matched) {
      selectDemoUser(matched);
      localStorage.setItem('ws_has_registered', 'true');
      localStorage.setItem('ws_auth_logged_in', JSON.stringify(true));
      setSuccessMsg(
        language === 'bn'
          ? `${matched.bnName || matched.name} হিসেবে সফলভাবে প্রবেশ করা হয়েছে`
          : `Signed in as ${matched.name}`
      );
      setTimeout(() => {
        if (onClose) onClose();
      }, 400);
    } else {
      // Login via phone handler
      loginWithPhone(targetPhone, targetPin, role).then((res) => {
        if (res.success && onClose) onClose();
      });
    }
  };

  // Handle Registration Submit
  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    const cleanPhone = phone.trim().replace(/[^0-9+]/g, '');
    if (!cleanPhone || cleanPhone.length < 10) {
      setErrorMsg(t.phoneRequired);
      return;
    }
    if (!fullName.trim()) {
      setErrorMsg(t.nameRequired);
      return;
    }

    setIsLoading(true);
    try {
      const res = await registerAccount({
        phone: cleanPhone,
        name: fullName.trim(),
        bnName: banglaName.trim() || fullName.trim(),
        email: email.trim() || undefined,
        role: selectedRole,
        shopName:
          selectedRole === 'retailer' || selectedRole === 'admin'
            ? shopName.trim() || (selectedRole === 'admin' ? `${fullName.trim()} Enterprise` : 'My Retail Store')
            : undefined,
        routeArea: selectedRole === 'dsr' ? routeArea.trim() || 'General Supply Route' : undefined,
        adminRef: selectedRole === 'admin' ? cleanPhone : adminRef.trim() || activeAdminPhone,
        pin: pin.trim() || '1234',
      });

      if (res.success) {
        setSuccessMsg(
          language === 'bn'
            ? 'রেজিস্ট্রেশন সফল হয়েছে! সিস্টেমে স্বাগতম।'
            : 'Registration successful! Welcome to the system.'
        );
        setTimeout(() => {
          if (onClose) onClose();
        }, 600);
      } else {
        setErrorMsg(res.message || 'Registration failed.');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'An error occurred during registration.');
    } finally {
      setIsLoading(false);
    }
  };

  const activeOption = roleOptions.find((r) => r.id === selectedRole) || roleOptions[0];

  return (
    <div
      className={`${
        isModal
          ? 'relative w-full max-w-lg bg-slate-900 border border-slate-700/90 rounded-3xl shadow-2xl overflow-hidden text-slate-100 flex flex-col max-h-[94vh]'
          : 'w-full max-w-xl mx-auto my-auto p-4 sm:p-6'
      }`}
    >
      <div
        className={`${
          isModal
            ? 'overflow-y-auto p-5 sm:p-7 space-y-5'
            : 'bg-slate-900/95 border border-slate-800 rounded-3xl shadow-2xl shadow-black/80 backdrop-blur-xl p-5 sm:p-8 space-y-6'
        }`}
      >
        {/* Top Header / Branding */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-500 via-teal-600 to-indigo-700 p-0.5 shadow-xl shadow-emerald-950/60 flex items-center justify-center shrink-0">
              <div className="w-full h-full bg-slate-950/80 rounded-[14px] flex items-center justify-center">
                <LogIn className="w-6 h-6 text-emerald-400" />
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg sm:text-xl font-black text-white tracking-tight">
                  {language === 'bn' ? 'মাতৃছায়া টেলিকম' : 'Matrichaya Telecom'}
                </h1>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/30">
                  ERP Login
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                {language === 'bn'
                  ? 'পাইকারি ব্যবসা, মোবাইল ও পিসি সেলস ডিস্ট্রিবিউশন'
                  : 'Wholesale ERP, PC POS & DSR Route Sales'}
              </p>
            </div>
          </div>

          {/* Close button if rendered as modal and user is already logged in */}
          {isModal && isAuthenticated && onClose && (
            <button
              onClick={onClose}
              id="btn-close-login-screen"
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition"
              title="Close"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Tab Switcher: Login vs Register */}
        <div className="flex p-1 bg-slate-950/80 rounded-2xl border border-slate-800">
          <button
            type="button"
            onClick={() => {
              setMode('login');
              setErrorMsg(null);
              setSuccessMsg(null);
            }}
            id="tab-login-btn"
            className={`flex-1 py-2 text-xs font-bold rounded-xl transition flex items-center justify-center gap-2 ${
              mode === 'login'
                ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-md shadow-emerald-950/50'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <LogIn className="w-4 h-4" />
            <span>{language === 'bn' ? 'লগইন করুন' : 'Sign In'}</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setMode('register');
              setErrorMsg(null);
              setSuccessMsg(null);
            }}
            id="tab-register-btn"
            className={`flex-1 py-2 text-xs font-bold rounded-xl transition flex items-center justify-center gap-2 ${
              mode === 'register'
                ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-md shadow-emerald-950/50'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <UserPlus className="w-4 h-4" />
            <span>{language === 'bn' ? 'নতুন অ্যাকাউন্ট' : 'Register New'}</span>
          </button>
        </div>

        {/* Alert Feedback Messages */}
        {errorMsg && (
          <div className="p-3.5 bg-rose-950/80 border border-rose-500/50 rounded-2xl text-rose-200 text-xs flex items-start gap-2.5 animate-in fade-in slide-in-from-top-1">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
            <span className="font-medium leading-relaxed">{errorMsg}</span>
          </div>
        )}

        {successMsg && (
          <div className="p-3.5 bg-emerald-950/80 border border-emerald-500/50 rounded-2xl text-emerald-200 text-xs flex items-start gap-2.5 animate-in fade-in slide-in-from-top-1">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            <span className="font-medium leading-relaxed">{successMsg}</span>
          </div>
        )}

        {/* LOGIN MODE */}
        {mode === 'login' ? (
          <form onSubmit={handleLoginSubmit} className="space-y-4">
            {/* STEP 1: DROPDOWN SELECTION FOR ROLE / LOGIN TYPE */}
            <div className="space-y-2">
              <label
                htmlFor="login-role-dropdown"
                className="block text-xs font-bold text-slate-200 flex items-center justify-between"
              >
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                  {language === 'bn'
                    ? '১. লগইন টাইপ নির্বাচন করুন (ড্রপডাউন):'
                    : '1. Select Login Type (Dropdown):'}
                </span>
                <span className="text-[11px] font-semibold text-emerald-400">
                  {language === 'bn' ? activeOption.badgeBn : activeOption.badgeEn}
                </span>
              </label>

              {/* Native & Custom Responsive Dropdown Element */}
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                  {activeOption.icon}
                </div>
                <select
                  id="login-role-dropdown"
                  value={selectedRole}
                  onChange={(e) => handleRoleChange(e.target.value as UserRole)}
                  className="w-full pl-10 pr-10 py-3 bg-slate-950 border-2 border-emerald-500/60 hover:border-emerald-400 rounded-2xl text-sm font-bold text-white shadow-lg shadow-black/40 focus:outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-500/40 appearance-none cursor-pointer transition"
                >
                  <option value="admin" className="bg-slate-900 text-amber-300 py-2">
                    👑 {language === 'bn' ? 'এডমিন (Admin - মালিক ও সার্বিক নিয়ন্ত্রণ)' : 'Admin (Owner & Full Control)'}
                  </option>
                  <option value="dsr" className="bg-slate-900 text-sky-300 py-2">
                    🚚 {language === 'bn' ? 'ডিএসআর / ডিএসএল (DSR - ফিল্ড অর্ডার ও কালেকশন)' : 'DSR / DSL (Field Sales Rep)'}
                  </option>
                  <option value="counter" className="bg-slate-900 text-emerald-300 py-2">
                    💻 {language === 'bn' ? 'ক্যাশ কাউন্টার (Cash Counter - ল্যাপটপ/পিসি POS)' : 'Cash Counter (Laptop/PC POS)'}
                  </option>
                  <option value="retailer" className="bg-slate-900 text-purple-300 py-2">
                    🏪 {language === 'bn' ? 'রিটেইলার (Retailer - কাস্টমার/দোকান পোর্টাল)' : 'Retailer (Customer Store Portal)'}
                  </option>
                </select>
                <div className="absolute inset-y-0 right-0 pr-3.5 flex items-center pointer-events-none text-slate-400">
                  <ChevronDown className="w-5 h-5 text-emerald-400" />
                </div>
              </div>

              {/* Active Role Description Card */}
              <div
                className={`p-3 rounded-2xl ${activeOption.colorClasses.bg} border ${activeOption.colorClasses.border} flex items-center justify-between gap-3 text-xs`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-8 h-8 rounded-xl bg-slate-900/80 border border-slate-700/60 flex items-center justify-center shrink-0">
                    {activeOption.icon}
                  </div>
                  <div className="min-w-0">
                    <div className={`font-bold text-xs ${activeOption.colorClasses.text} truncate`}>
                      {language === 'bn' ? activeOption.titleBn : activeOption.titleEn}
                    </div>
                    <p className="text-[11px] text-slate-300 truncate">
                      {language === 'bn' ? activeOption.subtitleBn : activeOption.subtitleEn}
                    </p>
                  </div>
                </div>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-lg bg-slate-900/90 text-slate-300 border border-slate-700/50 shrink-0">
                  {language === 'bn' ? activeOption.badgeBn : activeOption.badgeEn}
                </span>
              </div>
            </div>

            {/* STEP 2: MOBILE NUMBER & PASSWORD */}
            <div className="space-y-3 pt-2">
              <div className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-sky-400"></span>
                <span>
                  {language === 'bn'
                    ? '২. মোবাইল নম্বর ও পাসওয়ার্ড দিন:'
                    : '2. Enter Mobile Phone & Password:'}
                </span>
              </div>

              {/* Mobile Phone Input */}
              <div className="space-y-1">
                <label className="block text-[11px] font-semibold text-slate-300 flex items-center justify-between">
                  <span>{language === 'bn' ? 'মোবাইল নম্বর' : 'Mobile Number'}</span>
                  <span className="text-[10px] text-slate-400 font-mono">
                    {language === 'bn' ? '১১ ডিজিট' : '11 Digits'}
                  </span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <Phone className="w-4 h-4 text-slate-400" />
                  </div>
                  <input
                    type="tel"
                    id="input-login-phone"
                    value={phone}
                    onChange={(e) => setPhone(sanitizePhoneNumber(e.target.value))}
                    placeholder="01937200635"
                    required
                    className="w-full pl-10 pr-3.5 py-2.5 bg-slate-950 border border-slate-700 hover:border-slate-600 focus:border-emerald-500 rounded-xl text-sm font-mono text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 transition"
                  />
                </div>
              </div>

              {/* Password / PIN Input */}
              <div className="space-y-1">
                <div className="flex items-center justify-between text-[11px] font-semibold text-slate-300">
                  <label htmlFor="input-login-password">
                    {language === 'bn' ? 'পাসওয়ার্ড / গোপন পিন' : 'Password / PIN'}
                  </label>
                  <span className="text-[10px] text-emerald-400 font-medium">
                    {language === 'bn' ? 'ডিফল্ট পিন: 1234' : 'Default: 1234'}
                  </span>
                </div>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <Lock className="w-4 h-4 text-slate-400" />
                  </div>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    id="input-login-password"
                    value={pin}
                    onChange={(e) => setPin(e.target.value)}
                    placeholder="••••"
                    required
                    className="w-full pl-10 pr-10 py-2.5 bg-slate-950 border border-slate-700 hover:border-slate-600 focus:border-emerald-500 rounded-xl text-sm font-mono text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 transition"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-200 transition"
                    title={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            </div>

            {/* STEP 3: SUBMIT / LOGIN BUTTON */}
            <button
              type="submit"
              disabled={isLoading}
              id="btn-login-submit"
              className={`w-full py-3 px-4 rounded-2xl bg-gradient-to-r ${activeOption.colorClasses.accent} text-white font-black text-sm shadow-xl shadow-black/50 transition-all active:scale-[0.98] flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50`}
            >
              {isLoading ? (
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>{language === 'bn' ? 'যাচাই করা হচ্ছে...' : 'Verifying & Signing In...'}</span>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <LogIn className="w-4 h-4" />
                  <span>
                    {language === 'bn'
                      ? `${activeOption.titleBn.split(' ')[0]} হিসেবে লগইন করুন`
                      : `Sign In as ${activeOption.titleEn}`}
                  </span>
                  <ArrowRight className="w-4 h-4 ml-1" />
                </div>
              )}
            </button>

            {/* QUICK 1-CLICK DEMO ACCESS BUTTONS */}
            <div className="pt-2 border-t border-slate-800/80">
              <div className="flex items-center justify-between text-[11px] font-semibold text-slate-400 mb-2">
                <span>{language === 'bn' ? '⚡ ১-ক্লিকে সরাসরি টেস্ট একাউন্টে প্রবেশ:' : '⚡ 1-Click Direct Role Switch:'}</span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                {roleOptions.map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => handleFastLogin(opt.id)}
                    className={`px-2 py-1.5 rounded-xl border text-[11px] font-semibold flex items-center justify-center gap-1.5 transition active:scale-95 cursor-pointer ${
                      selectedRole === opt.id
                        ? `${opt.colorClasses.bg} ${opt.colorClasses.border} ${opt.colorClasses.text} ring-1 ring-emerald-500/40`
                        : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:text-white hover:border-slate-700'
                    }`}
                  >
                    {opt.icon}
                    <span className="truncate">{language === 'bn' ? opt.titleBn.split(' ')[0] : opt.titleEn}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Independent Multi-Device Note */}
            <div className="p-3 rounded-2xl bg-slate-950/60 border border-slate-800/80 text-[11px] text-slate-300 flex items-start gap-2.5">
              <Laptop className="w-4 h-4 text-sky-400 shrink-0 mt-0.5" />
              <div className="leading-relaxed">
                <span className="font-bold text-white block mb-0.5">
                  {language === 'bn' ? 'মোবাইল ও পিসিতে স্বাধীন ব্যবহার:' : 'Multi-Device Simultaneous Sessions:'}
                </span>
                <span>
                  {language === 'bn'
                    ? 'মোবাইলে এডমিন চালু রেখে আপনি ল্যাপটপে ক্যাশ কাউন্টার বা ডিএসআর হিসেবে স্বতন্ত্রভাবে কাজ করতে পারবেন। সকল সেলস ও ক্যাশ হিসাব রিয়েল-টাইমে সিঙ্ক হবে।'
                    : 'Run Admin on mobile while running Cash Counter or DSR on your laptop. All sales, stocks and cash records sync instantly in cloud.'}
                </span>
              </div>
            </div>
          </form>
        ) : (
          /* REGISTRATION MODE */
          <form onSubmit={handleRegisterSubmit} className="space-y-3.5">
            <div className="space-y-1">
              <label className="block text-xs font-bold text-slate-200">
                {language === 'bn' ? 'ব্যবহারকারীর দায়িত্ব/রোল নির্বাচন করুন:' : 'Select Account Role:'}
              </label>
              <select
                value={selectedRole}
                onChange={(e) => setSelectedRole(e.target.value as UserRole)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs font-semibold text-white focus:outline-none focus:border-emerald-500"
              >
                <option value="retailer">🏪 {language === 'bn' ? 'রিটেইলার (খুচরা দোকানদার মার্চেন্ট)' : 'Retailer (Retail Store)'}</option>
                <option value="dsr">🚚 {language === 'bn' ? 'ডিএসআর (মাঠপর্যায়ের সেলস প্রতিনিধি)' : 'DSR (Field Sales Representative)'}</option>
                <option value="counter">💻 {language === 'bn' ? 'ক্যাশ কাউন্টার (দোকান ক্যাশিয়ার ও সেলস)' : 'Cash Counter (POS Cashier)'}</option>
                <option value="admin">👑 {language === 'bn' ? 'এডমিন (ব্যবসার মালিক / ম্যানেজিং ডিরেক্টর)' : 'Admin (Business Owner)'}</option>
              </select>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <div>
                <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                  {language === 'bn' ? 'মোবাইল নম্বর *' : 'Mobile Phone *'}
                </label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(sanitizePhoneNumber(e.target.value))}
                  placeholder="01937200635"
                  required
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs font-mono text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                  {language === 'bn' ? '৪-সংখ্যার পিন / পাসওয়ার্ড *' : 'PIN / Password *'}
                </label>
                <input
                  type="password"
                  maxLength={6}
                  value={pin}
                  onChange={(e) => setPin(e.target.value)}
                  placeholder="1234"
                  required
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs font-mono text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                {language === 'bn' ? 'আপনার পুরো নাম *' : 'Full Name *'}
              </label>
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="কামাল হোসেন"
                required
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
              />
            </div>

            {selectedRole === 'retailer' && (
              <div>
                <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                  {language === 'bn' ? 'দোকানের নাম (ঐচ্ছিক)' : 'Store Name (Optional)'}
                </label>
                <input
                  type="text"
                  value={shopName}
                  onChange={(e) => setShopName(e.target.value)}
                  placeholder="জননী টেলিকম"
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                />
              </div>
            )}

            {selectedRole === 'dsr' && (
              <div>
                <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                  {language === 'bn' ? 'বরাদ্দকৃত রুট / এলাকা' : 'Assigned Route / Area'}
                </label>
                <input
                  type="text"
                  value={routeArea}
                  onChange={(e) => setRouteArea(e.target.value)}
                  placeholder="চকবাজার ও সদরঘাট রুট"
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                />
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-2.5 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs shadow-lg shadow-emerald-950/60 transition active:scale-95 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {isLoading ? (
                <span>{language === 'bn' ? 'তৈরি করা হচ্ছে...' : 'Registering...'}</span>
              ) : (
                <>
                  <UserPlus className="w-4 h-4" />
                  <span>{language === 'bn' ? 'অ্যাকাউন্ট তৈরি করে প্রবেশ করুন' : 'Complete Registration & Enter'}</span>
                </>
              )}
            </button>
          </form>
        )}
      </div>
    </div>
  );
};
