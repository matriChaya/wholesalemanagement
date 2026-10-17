import React, { useState } from 'react';
import { useWholesale } from '../context/WholesaleContext';
import { translations, formatCurrency, getTodayDateString, getYesterdayDateString, formatDate } from '../utils/translations';
import {
  Coins,
  Send,
  X,
  CheckCircle2,
  ArrowRight,
  ShieldCheck,
  User,
  Building2,
  Wallet,
  Calendar,
  AlertTriangle
} from 'lucide-react';

interface PayAdminModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const PayAdminModal: React.FC<PayAdminModalProps> = ({ isOpen, onClose }) => {
  const {
    language,
    currentUser,
    currentRole,
    users,
    cashCounter,
    cashDSR,
    createCashTransfer,
  } = useWholesale();

  const t = translations[language];

  const isAdmin = currentRole === 'admin';
  const isDsr = currentRole === 'dsr';
  const isCounter = currentRole === 'counter';

  const [adminSourceRole, setAdminSourceRole] = useState<'counter' | 'dsr'>('counter');
  const [dsrTargetRole, setDsrTargetRole] = useState<'counter' | 'admin'>('counter');

  const counterUser = users.find((u) => u.role === 'counter') || {
    id: 'usr_counter',
    name: 'Cash Counter',
    role: 'counter' as const,
    assignedCashDrawer: cashCounter,
  };
  const dsrUser = users.find((u) => u.role === 'dsr') || {
    id: 'usr_dsr',
    name: 'DSR Agent',
    role: 'dsr' as const,
    assignedCashDrawer: cashDSR,
  };

  const myDrawer = isAdmin
    ? (adminSourceRole === 'counter' ? (counterUser.assignedCashDrawer || cashCounter) : (dsrUser.assignedCashDrawer || cashDSR))
    : isDsr
    ? cashDSR
    : isCounter
    ? cashCounter
    : (currentUser.assignedCashDrawer || 0);

  const [amount, setAmount] = useState<number>(myDrawer > 0 ? myDrawer : 5000);
  const [date, setDate] = useState<string>(getTodayDateString());
  const [notes, setNotes] = useState<string>(
    isDsr
      ? (language === 'bn' ? 'ডিএসআর ফিল্ড কালেকশন ক্যাশ কাউন্টারে পেমেন্ট' : 'DSR sales collection deposit to Cash Counter')
      : isCounter
      ? (language === 'bn' ? 'কাউন্টার সেলস ও ডিএসআর কালেকশন এডমিনকে পেমেন্ট' : 'Counter & DSR collections payment to Admin')
      : (language === 'bn' ? 'দৈনিক সেলস কালেকশন ক্যাশ হস্তান্তর' : 'Daily sales cash handover')
  );
  const [isSuccess, setIsSuccess] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const myAdminRef = (currentUser.adminRef || currentUser.adminPhone || '01937200635').replace(/[^0-9]/g, '');
  const adminUser =
    users.find((u) => u.role === 'admin' && (u.phone || '').replace(/[^0-9]/g, '').endsWith(myAdminRef.slice(-10))) ||
    users.find((u) => u.id === 'usr_admin') ||
    users.find((u) => u.role === 'admin') || {
      id: 'usr_admin',
      name: 'মাতৃছায়া টেলিকম',
      role: 'admin' as const,
      phone: '01937200635',
    };

  const isDeficit = amount > myDrawer;
  const projectedBalance = myDrawer - amount;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (amount <= 0) {
      setErrorMsg(language === 'bn' ? 'সঠিক জমার পরিমাণ লিখুন।' : 'Enter a valid transfer amount.');
      return;
    }

    if (isAdmin) {
      const sourceUser = adminSourceRole === 'counter' ? counterUser : dsrUser;
      createCashTransfer({
        fromRole: adminSourceRole,
        fromUserId: sourceUser.id,
        fromUserName: `${sourceUser.name} (${adminSourceRole.toUpperCase()})`,
        toRole: 'admin',
        toUserId: currentUser.id,
        toUserName: `${currentUser.name} (ADMIN)`,
        amount,
        notes: notes || (language === 'bn' ? `${adminSourceRole.toUpperCase()} থেকে ক্যাশ গ্রহণ` : `Cash collected from ${adminSourceRole}`),
        customDate: date,
        autoAccept: true,
      });
    } else if (isDsr) {
      // DSR paying Cash Counter (or Admin)
      const targetRole = dsrTargetRole;
      const targetUser = targetRole === 'counter' ? counterUser : adminUser;
      createCashTransfer({
        fromRole: 'dsr',
        fromUserId: currentUser.id,
        fromUserName: `${currentUser.name} (DSR)`,
        toRole: targetRole,
        toUserId: targetUser.id,
        toUserName: `${targetUser.name} (${targetRole.toUpperCase()})`,
        amount,
        notes: notes || (targetRole === 'counter'
          ? (language === 'bn' ? 'ডিএসআর ক্যাশ কাউন্টারে পেমেন্ট' : 'DSR payment to Cash Counter')
          : (language === 'bn' ? 'ডিএসআর এডমিনকে সরাসরি জমা' : 'DSR payment to Admin')),
        customDate: date,
        autoAccept: false, // Recipient must accept before cash deposits into drawer
      });
    } else {
      // Counter paying Admin
      createCashTransfer({
        fromRole: 'counter',
        fromUserId: currentUser.id,
        fromUserName: `${currentUser.name} (COUNTER)`,
        toRole: 'admin',
        toUserId: adminUser.id,
        toUserName: `${adminUser.name} (ADMIN)`,
        amount,
        notes: notes || (language === 'bn' ? 'কাউন্টার ক্যাশ এডমিনকে পেমেন্ট' : 'Counter cash payment to Admin'),
        customDate: date,
        autoAccept: false, // Admin must accept before cash is minused from Counter and plussed to Admin
      });
    }

    setIsSuccess(true);
    setTimeout(() => {
      setIsSuccess(false);
      onClose();
    }, 1000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden flex flex-col max-h-[92vh] overflow-y-auto">
        {/* Header */}
        <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/90">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-sky-500 to-teal-600 flex items-center justify-center text-white shadow-lg shadow-sky-950/40">
              <Send className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-white text-sm sm:text-base">
                {isAdmin
                  ? (language === 'bn' ? 'কাউন্টার/ডিএসআর থেকে ক্যাশ জমা গ্রহণ' : 'Collect Cash from Counter / DSR')
                  : isDsr
                  ? (language === 'bn' ? 'ক্যাশ কাউন্টারে টাকা জমা / পেমেন্ট' : 'Pay / Handover Cash to Counter')
                  : (language === 'bn' ? 'এডমিনকে ক্যাশ পেমেন্ট / জমা দিন' : 'Pay / Handover Cash to Admin')}
              </h3>
              <p className="text-[11px] text-slate-400">
                {isAdmin
                  ? (language === 'bn' ? 'সংগৃহীত ক্যাশ সরাসরি এডমিন ভল্টে যুক্ত হবে' : 'Cash will be deposited directly to Admin Vault')
                  : isDsr
                  ? (language === 'bn' ? 'ডিএসআর ক্যাশ মাইনাস হবে এবং কাউন্টার ক্যাশ ড্রয়ার প্লাস হবে' : 'DSR drawer deducted, Counter drawer credited')
                  : (language === 'bn' ? 'কাউন্টার জমা থেকে এডমিন পেমেন্ট মাইনাস হবে' : 'Deducted from Counter and added to Admin Vault')}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-4 space-y-3.5 text-xs">
          {errorMsg && (
            <div className="p-2.5 rounded-xl bg-rose-500/20 border border-rose-500/40 text-rose-300 text-xs font-semibold">
              {errorMsg}
            </div>
          )}

          {/* DSR Recipient Selector */}
          {isDsr && (
            <div className="space-y-1.5">
              <label className="text-slate-300 font-bold block text-[11px]">
                {language === 'bn' ? 'কোথায় টাকা পেমেন্ট / জমা দিচ্ছেন?' : 'Where are you transferring cash?'}
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setDsrTargetRole('counter');
                    setNotes(language === 'bn' ? 'ডিএসআর ক্যাশ কাউন্টারে পেমেন্ট' : 'DSR payment to Cash Counter');
                  }}
                  className={`p-2.5 rounded-xl border text-left transition cursor-pointer ${
                    dsrTargetRole === 'counter'
                      ? 'bg-emerald-950/70 border-emerald-500 text-emerald-300 font-bold shadow-md shadow-emerald-950/40'
                      : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <div className="text-[10px] uppercase font-bold flex items-center justify-between">
                    <span>{language === 'bn' ? '১. ক্যাশ কাউন্টার' : '1. Cash Counter'}</span>
                    <span className="text-[9px] bg-emerald-500/20 px-1 py-0.5 rounded text-emerald-400 font-bold">ডিফল্ট</span>
                  </div>
                  <div className="text-xs font-mono font-bold text-white mt-1">{counterUser.name}</div>
                  <div className="text-[10px] text-slate-400 mt-0.5">{language === 'bn' ? 'কাউন্টার ড্রয়ার প্লাস হবে' : 'Will credit counter'}</div>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setDsrTargetRole('admin');
                    setNotes(language === 'bn' ? 'ডিএসআর সরাসরি এডমিনকে জমা' : 'DSR direct payment to Admin');
                  }}
                  className={`p-2.5 rounded-xl border text-left transition cursor-pointer ${
                    dsrTargetRole === 'admin'
                      ? 'bg-sky-950/70 border-sky-500 text-sky-300 font-bold shadow-md shadow-sky-950/40'
                      : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <div className="text-[10px] uppercase font-bold">{language === 'bn' ? '২. এডমিন ভল্ট' : '2. Admin Vault'}</div>
                  <div className="text-xs font-mono font-bold text-white mt-1">{adminUser.name}</div>
                  <div className="text-[10px] text-slate-400 mt-0.5">{language === 'bn' ? 'মালিককে সরাসরি জমা' : 'Direct to owner'}</div>
                </button>
              </div>
            </div>
          )}

          {isAdmin && (
            <div className="space-y-1.5">
              <label className="text-slate-300 font-bold block text-[11px]">
                {language === 'bn' ? 'কার কাছ থেকে ক্যাশ জমা নিচ্ছেন?' : 'Collect cash from:'}
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setAdminSourceRole('counter');
                    const bal = counterUser.assignedCashDrawer || cashCounter;
                    if (bal > 0) setAmount(bal);
                  }}
                  className={`p-2 rounded-xl border text-left transition cursor-pointer ${
                    adminSourceRole === 'counter'
                      ? 'bg-emerald-950/60 border-emerald-500 text-emerald-300 font-bold shadow-md shadow-emerald-950/40'
                      : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <div className="text-[10px] uppercase font-bold">{language === 'bn' ? '১. ক্যাশ কাউন্টার' : '1. Cash Counter'}</div>
                  <div className="text-xs font-mono font-bold text-white mt-0.5">{formatCurrency(cashCounter, language)}</div>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setAdminSourceRole('dsr');
                    const bal = dsrUser.assignedCashDrawer || cashDSR;
                    if (bal > 0) setAmount(bal);
                  }}
                  className={`p-2 rounded-xl border text-left transition cursor-pointer ${
                    adminSourceRole === 'dsr'
                      ? 'bg-amber-950/60 border-amber-500 text-amber-300 font-bold shadow-md shadow-amber-950/40'
                      : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <div className="text-[10px] uppercase font-bold">{language === 'bn' ? '২. ডিএসআর কর্মী' : '2. DSR Staff'}</div>
                  <div className="text-xs font-mono font-bold text-white mt-0.5">{formatCurrency(cashDSR, language)}</div>
                </button>
              </div>
            </div>
          )}

          {/* Sender & Receiver Summary */}
          <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 flex items-center justify-between gap-3">
            <div className="flex-1">
              <span className="text-[10px] text-slate-400 uppercase font-bold block">
                {isAdmin
                  ? (adminSourceRole === 'counter' ? (language === 'bn' ? 'প্রেরক: ক্যাশ কাউন্টার' : 'From: Counter') : (language === 'bn' ? 'প্রেরক: ডিএসআর' : 'From: DSR'))
                  : isDsr
                  ? (language === 'bn' ? 'প্রেরক: ডিএসআর ফিল্ড' : 'From: DSR Field')
                  : (language === 'bn' ? 'প্রেরক: ক্যাশ কাউন্টার' : 'From: Cash Counter')}
              </span>
              <div className="font-bold text-white truncate text-xs">
                {isAdmin ? (adminSourceRole === 'counter' ? counterUser.name : dsrUser.name) : currentUser.name}
              </div>
              <div className={`text-[11px] font-mono-num font-bold ${myDrawer < 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
                {language === 'bn' ? 'বর্তমান ব্যালেন্স:' : 'Current Balance:'} {formatCurrency(myDrawer, language)}
              </div>
            </div>

            <div className="w-7 h-7 rounded-full bg-slate-900 border border-slate-700 flex items-center justify-center text-sky-400 shrink-0">
              <ArrowRight className="w-4 h-4" />
            </div>

            <div className="flex-1 text-right">
              <span className="text-[10px] text-slate-400 uppercase font-bold block">
                {isAdmin
                  ? (language === 'bn' ? 'প্রাপক (এডমিন ভল্ট)' : 'To (Admin Vault)')
                  : isDsr
                  ? (dsrTargetRole === 'counter' ? (language === 'bn' ? 'প্রাপক (ক্যাশ কাউন্টার)' : 'To (Cash Counter)') : (language === 'bn' ? 'প্রাপক (এডমিন)' : 'To (Admin)'))
                  : (language === 'bn' ? 'প্রাপক (এডমিন ভল্ট)' : 'To (Admin Vault)')}
              </span>
              <div className="font-bold text-sky-300 truncate text-xs">
                {isAdmin
                  ? currentUser.name
                  : isDsr
                  ? (dsrTargetRole === 'counter' ? counterUser.name : adminUser.name)
                  : adminUser.name}
              </div>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-sky-950 text-sky-300 font-semibold uppercase">
                {isAdmin ? 'ADMIN' : isDsr ? (dsrTargetRole === 'counter' ? 'COUNTER' : 'ADMIN') : 'ADMIN'}
              </span>
            </div>
          </div>

          {/* Date Picker */}
          <div className="space-y-1.5 p-2.5 rounded-xl bg-slate-950/80 border border-sky-500/20">
            <div className="flex items-center justify-between">
              <label className="text-slate-300 font-bold flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-sky-400" />
                <span>{language === 'bn' ? 'জমার তারিখ (Date)' : 'Handover Date'}</span>
              </label>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setDate(getTodayDateString())}
                  className={`text-[10px] px-2 py-0.5 rounded font-bold transition ${
                    date === getTodayDateString() ? 'bg-sky-600 text-white' : 'bg-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  {language === 'bn' ? 'আজ' : 'Today'}
                </button>
                <button
                  type="button"
                  onClick={() => setDate(getYesterdayDateString())}
                  className={`text-[10px] px-2 py-0.5 rounded font-bold transition ${
                    date === getYesterdayDateString() ? 'bg-sky-600 text-white' : 'bg-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  {language === 'bn' ? 'গতকাল' : 'Yesterday'}
                </button>
              </div>
            </div>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full px-3 py-1.5 bg-slate-900 border border-slate-700 rounded-xl text-white font-mono text-xs focus:outline-none focus:border-sky-500"
            />
          </div>

          {/* Quick Amount Selector */}
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <label className="text-slate-300 font-bold block">
                {language === 'bn' ? 'জমার পরিমাণ (টাকা)' : 'Transfer Amount (৳)'} *
              </label>
              {myDrawer > 0 && (
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setAmount(Math.round(myDrawer / 2))}
                    className="text-[10px] text-sky-400 hover:text-white px-2 py-0.5 bg-slate-800 rounded font-semibold"
                  >
                    50%
                  </button>
                  <button
                    type="button"
                    onClick={() => setAmount(myDrawer)}
                    className="text-[10px] text-emerald-400 hover:text-white px-2 py-0.5 bg-slate-800 rounded font-semibold"
                  >
                    {language === 'bn' ? 'সব টাকা জমা (১০০%)' : '100% Full'}
                  </button>
                </div>
              )}
            </div>

            <div className="relative">
              <span className="absolute left-3 top-2.5 font-bold text-emerald-400">৳</span>
              <input
                type="number"
                min="0.01"
                step="any"
                required
                id="input-pay-admin-amount"
                value={amount || ''}
                onChange={(e) => setAmount(Number(e.target.value))}
                placeholder="5000"
                className="w-full pl-8 pr-3 py-2 bg-slate-950 border border-slate-700 focus:border-sky-500 rounded-xl text-white font-mono font-bold text-sm focus:outline-none"
              />
            </div>

            {isDeficit && (
              <div className="mt-1.5 p-2 rounded-xl bg-amber-500/10 border border-amber-500/30 text-[11px] text-amber-300 space-y-0.5">
                <div className="font-bold flex items-center gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                  <span>{language === 'bn' ? 'পর্যাপ্ত ব্যালেন্স নেই (মাইনাস ফিগার প্রযোজ্য)' : 'Insufficient balance (Will result in minus figure)'}</span>
                </div>
                <p className="text-[10px] text-slate-300 pl-5">
                  {language === 'bn'
                    ? `বর্তমান ক্যাশ ড্রয়ারে ${formatCurrency(myDrawer, language)} রয়েছে। ${formatCurrency(amount, language)} পেমেন্ট প্রদান করলে আপনার ক্যাশ ড্রয়ারে মাইনাস ফিগার (${formatCurrency(projectedBalance, language)}) প্রদর্শন করবে।`
                    : `Current drawer has ${formatCurrency(myDrawer, language)}. Transferring ${formatCurrency(amount, language)} will result in a negative balance (${formatCurrency(projectedBalance, language)}).`}
                </p>
              </div>
            )}
          </div>

          {/* Notes */}
          <div className="space-y-1">
            <label className="text-slate-300 font-bold block">
              {language === 'bn' ? 'মন্তব্য / বিবরণ' : 'Handover Notes'}
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Route collections for Tuesday"
              className="w-full px-3 py-2 bg-slate-950 border border-slate-700 focus:border-sky-500 rounded-xl text-white focus:outline-none"
            />
          </div>

          {isSuccess && (
            <div className="p-3 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 font-bold flex items-center justify-center gap-2 animate-in zoom-in-95">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>
                {isAdmin
                  ? (language === 'bn' ? 'ক্যাশ সফলভাবে এডমিন ভল্টে জমা নেওয়া হয়েছে!' : 'Cash successfully collected into Admin Vault!')
                  : isDsr
                  ? (dsrTargetRole === 'counter'
                      ? (language === 'bn' ? 'ক্যাশ কাউন্টারে পেমেন্ট সম্পন্ন হয়েছে!' : 'Paid to Cash Counter successfully!')
                      : (language === 'bn' ? 'এডমিনকে জমা রিকুয়েস্ট সফলভাবে পাঠানো হয়েছে!' : 'Handover submitted to Admin!'))
                  : (language === 'bn' ? 'এডমিনকে ক্যাশ পেমেন্ট সম্পন্ন হয়েছে!' : 'Payment to Admin completed!')}
              </span>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center gap-2 pt-2 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-bold transition"
            >
              {t.cancel}
            </button>
            <button
              type="submit"
              id="btn-confirm-pay-admin"
              className="flex-1 py-2.5 bg-gradient-to-r from-sky-600 to-teal-600 hover:from-sky-500 hover:to-teal-500 text-white rounded-xl font-bold transition shadow-lg shadow-sky-950/40 flex items-center justify-center gap-1.5 active:scale-95 cursor-pointer"
            >
              <Send className="w-4 h-4" />
              <span>
                {isAdmin
                  ? (language === 'bn' ? 'ক্যাশ জমা গ্রহণ সম্পন্ন করুন' : 'Confirm Cash Collection')
                  : isDsr
                  ? (dsrTargetRole === 'counter'
                      ? (language === 'bn' ? 'কাউন্টারে ক্যাশ পেমেন্ট দিন' : 'Pay to Cash Counter')
                      : (language === 'bn' ? 'এডমিনকে জমা দিন' : 'Submit to Admin'))
                  : (language === 'bn' ? 'এডমিনকে ক্যাশ পেমেন্ট দিন' : 'Pay to Admin')}
              </span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
