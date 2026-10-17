import React, { useState } from 'react';
import { useWholesale } from '../context/WholesaleContext';
import { UserRole, UserProfile } from '../types';
import { translations, formatCurrency, getTodayDateString, getYesterdayDateString, formatDate } from '../utils/translations';
import {
  Coins,
  ArrowRight,
  Calculator,
  FileText,
  X,
  Send,
  Sparkles,
  ShieldCheck,
  Calendar
} from 'lucide-react';

interface CashTransferModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const CashTransferModal: React.FC<CashTransferModalProps> = ({ isOpen, onClose }) => {
  const { language, currentUser, currentRole, users, createCashTransfer } = useWholesale();
  const t = translations[language];

  const [date, setDate] = useState<string>(getTodayDateString());
  const [notes, setNotes] = useState<string>('');
  const [useDenominations, setUseDenominations] = useState<boolean>(true);

  // Denominations
  const [d1000, setD1000] = useState<number>(0);
  const [d500, setD500] = useState<number>(0);
  const [d200, setD200] = useState<number>(0);
  const [d100, setD100] = useState<number>(0);
  const [d50, setD50] = useState<number>(0);
  const [d20, setD20] = useState<number>(0);
  const [d10, setD10] = useState<number>(0);
  const [directAmount, setDirectAmount] = useState<number>(0);

  // Filter recipients strictly:
  // 1. If currentUser is DSR or Counter, show THEIR designated Admin (exactly ONE Admin!)
  // 2. Add eligible counter or DSR peers (excluding currentUser)
  // 3. Deduplicate strictly by user ID and ensure AT MOST ONE Admin
  const possibleRecipients = React.useMemo(() => {
    const list: UserProfile[] = [];
    const myAdminPhoneClean = (currentUser.adminRef || currentUser.adminPhone || '01937200635').replace(/[^0-9]/g, '');

    // Resolve the single linked Admin
    const linkedAdmin: UserProfile =
      users.find((u) => u.role === 'admin' && (u.phone || '').replace(/[^0-9]/g, '').endsWith(myAdminPhoneClean.slice(-10))) ||
      users.find((u) => u.id === 'usr_admin') ||
      users.find((u) => u.role === 'admin') || {
        id: 'usr_admin',
        name: 'মাতৃছায়া টেলিকম',
        bnName: 'প্রোপ্রাইটর (মাতৃছায়া টেলিকম)',
        role: 'admin' as UserRole,
        phone: '01937200635',
        enterpriseName: 'মাতৃছায়া টেলিকম',
        shopName: 'মাতৃছায়া টেলিকম',
        adminRef: '01937200635',
        adminPhone: '01937200635',
        assignedCashDrawer: 0,
      };

    if (currentRole === 'dsr') {
      // DSR can ONLY deposit to Cash Counter
      const counters = users.filter((u) => u.role === 'counter' && u.id !== currentUser.id);
      if (counters.length > 0) {
        list.push(...counters);
      } else {
        list.push({
          id: 'usr_counter_pc',
          name: 'Cash Counter POS',
          bnName: 'ক্যাশ কাউন্টার (ল্যাপটপ POS)',
          role: 'counter',
          phone: '01700000003',
        } as UserProfile);
      }
    } else if (currentRole === 'counter') {
      // Cash Counter can transfer to Admin (জমা) OR DSR (প্রদান) - two options!
      list.push(linkedAdmin);
      const dsrs = users.filter((u) => u.role === 'dsr' && u.id !== currentUser.id);
      if (dsrs.length > 0) {
        list.push(...dsrs);
      }
    } else if (currentRole === 'admin') {
      // Admin can transfer/deposit to Cash Counter
      const counters = users.filter((u) => u.role === 'counter' && u.id !== currentUser.id);
      if (counters.length > 0) {
        list.push(...counters);
      } else {
        list.push({
          id: 'usr_counter_pc',
          name: 'Cash Counter POS',
          bnName: 'ক্যাশ কাউন্টার (ল্যাপটপ POS)',
          role: 'counter',
          phone: '01700000003',
        } as UserProfile);
      }
    }

    // Deduplicate by ID and enforce exactly ONE admin
    const uniqueList: UserProfile[] = [];
    const seenIds = new Set<string>();
    let hasAdmin = false;

    for (const item of list) {
      if (!item || !item.id) continue;
      if (item.role === 'admin') {
        if (hasAdmin) continue; // NEVER allow more than one admin
        hasAdmin = true;
      }
      if (!seenIds.has(item.id)) {
        seenIds.add(item.id);
        uniqueList.push(item);
      }
    }

    return uniqueList;
  }, [users, currentRole, currentUser]);

  const [selectedRecipientId, setSelectedRecipientId] = useState<string>(() => {
    return possibleRecipients[0]?.id || '';
  });

  // Keep selectedRecipientId valid if list updates
  React.useEffect(() => {
    if (!possibleRecipients.some((u) => u.id === selectedRecipientId)) {
      if (possibleRecipients[0]) {
        setSelectedRecipientId(possibleRecipients[0].id);
      }
    }
  }, [possibleRecipients, selectedRecipientId]);

  if (!isOpen) return null;

  const totalDenominationAmount =
    d1000 * 1000 +
    d500 * 500 +
    d200 * 200 +
    d100 * 100 +
    d50 * 50 +
    d20 * 20 +
    d10 * 10;

  const finalAmount = useDenominations ? totalDenominationAmount : directAmount;

  const selectedRecipientUser =
    possibleRecipients.find((u) => u.id === selectedRecipientId) || possibleRecipients[0];
  const toRole = selectedRecipientUser?.role || 'admin';

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (finalAmount <= 0) return;

    createCashTransfer({
      fromRole: currentRole,
      fromUserId: currentUser.id,
      fromUserName: `${currentUser.name} (${(currentUser.role || '').toUpperCase()})`,
      toRole: toRole,
      toUserId: selectedRecipientUser?.id || `usr_${toRole}`,
      toUserName: selectedRecipientUser?.name
        ? `${selectedRecipientUser.name} (${(selectedRecipientUser.role || '').toUpperCase()})`
        : (toRole || '').toUpperCase(),
      amount: finalAmount,
      notes: notes || (language === 'bn' ? 'দৈনিক কালেকশন স্থানান্তর' : 'Daily sales cash handover'),
      customDate: date,
      denominations: useDenominations
        ? {
            note1000: d1000 || undefined,
            note500: d500 || undefined,
            note200: d200 || undefined,
            note100: d100 || undefined,
            note50: d50 || undefined,
            note20: d20 || undefined,
            note10: d10 || undefined,
          }
        : undefined,
      autoAccept: false, // Receiver must accept before cash is transferred into their drawer
    });

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-lg max-h-[92vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/90">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-600 flex items-center justify-center shadow-lg shadow-emerald-900/30">
              <Coins className="w-4 h-4 text-white" />
            </div>
            <div>
              <h3 className="font-bold text-slate-100 text-sm sm:text-base">{t.newCashTransfer}</h3>
              <p className="text-[11px] text-slate-400">
                {language === 'bn' ? 'ডিএসআর ➔ কাউন্টার ➔ এডমিন ক্যাশ হ্যান্ডওভার' : 'Inter-role cash handover protocol'}
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
        <form onSubmit={handleSubmit} className="p-4 overflow-y-auto space-y-4 flex-1">
          {/* Quick Flow Selector & Guidance */}
          {currentRole === 'counter' && (
            <div className="space-y-1.5">
              <span className="text-[10px] uppercase font-bold text-slate-400">
                {language === 'bn' ? 'হস্তান্তরের ধরন নির্বাচন করুন (২টি অপশন)' : 'Select Handover Flow (2 Options)'}
              </span>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const admin = possibleRecipients.find((u) => u.role === 'admin');
                    if (admin) setSelectedRecipientId(admin.id);
                  }}
                  className={`py-2 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 border ${
                    selectedRecipientUser?.role === 'admin'
                      ? 'bg-emerald-600 border-emerald-400 text-white shadow-lg shadow-emerald-900/40'
                      : 'bg-slate-800/80 border-slate-700 text-slate-300 hover:bg-slate-700'
                  }`}
                >
                  <span>🏢</span>
                  <span>{language === 'bn' ? 'এডমিনকে জমা' : 'Deposit to Admin'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const dsr = possibleRecipients.find((u) => u.role === 'dsr');
                    if (dsr) setSelectedRecipientId(dsr.id);
                  }}
                  className={`py-2 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 border ${
                    selectedRecipientUser?.role === 'dsr'
                      ? 'bg-amber-600 border-amber-400 text-white shadow-lg shadow-amber-900/40'
                      : 'bg-slate-800/80 border-slate-700 text-slate-300 hover:bg-slate-700'
                  }`}
                >
                  <span>🛵</span>
                  <span>{language === 'bn' ? 'ডিএসআর-কে প্রদান' : 'Disburse to DSR'}</span>
                </button>
              </div>
            </div>
          )}

          {currentRole === 'dsr' && (
            <div className="p-2.5 rounded-xl bg-sky-950/60 border border-sky-500/40 text-sky-200 text-xs flex items-center gap-2">
              <span className="text-base">🛵</span>
              <div>
                <span className="font-bold">{language === 'bn' ? 'ডিএসআর ➔ কাউন্টার জমা নিয়ম:' : 'DSR to Counter Rule:'}</span>{' '}
                <span className="text-sky-300">
                  {language === 'bn'
                    ? 'ডিএসআর শুধু ক্যাশ কাউন্টারে টাকা জমা দিতে পারবেন।'
                    : 'DSR can only deposit cash to the Cash Counter POS.'}
                </span>
              </div>
            </div>
          )}

          {currentRole === 'admin' && (
            <div className="p-2.5 rounded-xl bg-emerald-950/60 border border-emerald-500/40 text-emerald-200 text-xs flex items-center gap-2">
              <span className="text-base">🏢</span>
              <div>
                <span className="font-bold">{language === 'bn' ? 'এডমিন ➔ কাউন্টার নিয়ম:' : 'Admin to Counter Rule:'}</span>{' '}
                <span className="text-emerald-300">
                  {language === 'bn'
                    ? 'এডমিন ক্যাশ কাউন্টারে টাকা জমা বা হস্তান্তর করবেন।'
                    : 'Admin deposits/transfers cash to the Cash Counter POS.'}
                </span>
              </div>
            </div>
          )}

          {/* Sender & Receiver Card */}
          <div className="p-3.5 rounded-xl bg-slate-800/80 border border-slate-700 flex items-center justify-between gap-3">
            <div className="flex-1">
              <span className="text-[10px] uppercase font-bold text-slate-400">{t.fromUser}</span>
              <div className="font-bold text-xs text-white truncate mt-0.5">{currentUser.name}</div>
              <div className="flex items-center gap-1 mt-0.5">
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-700 text-emerald-300 font-semibold uppercase">
                  {currentUser.role}
                </span>
                <span className={`text-[10px] font-mono-num font-bold ${
                  (currentUser.assignedCashDrawer || 0) < 0 ? 'text-rose-400' : 'text-slate-300'
                }`}>
                  ({formatCurrency(currentUser.assignedCashDrawer || 0, language)})
                </span>
              </div>
            </div>

            <div className="w-7 h-7 rounded-full bg-slate-900 border border-slate-700 flex items-center justify-center text-emerald-400 shrink-0">
              <ArrowRight className="w-4 h-4" />
            </div>

            <div className="flex-1 text-right">
              <span className="text-[10px] uppercase font-bold text-slate-400">{t.toUser}</span>
              <select
                value={selectedRecipientId}
                onChange={(e) => setSelectedRecipientId(e.target.value)}
                className="mt-1 w-full bg-slate-900 border border-slate-700 rounded-lg px-2 py-1.5 text-xs text-white font-semibold focus:outline-none focus:border-emerald-500 truncate"
              >
                {possibleRecipients.map((u) => {
                  const roleLabel =
                    u.role === 'admin'
                      ? (language === 'bn' ? 'এডমিন (প্রধান)' : 'ADMIN')
                      : u.role === 'counter'
                      ? (language === 'bn' ? 'ক্যাশ কাউন্টার POS' : 'COUNTER')
                      : (language === 'bn' ? 'ডিএসআর ফিল্ড' : 'DSR');
                  return (
                    <option key={u.id} value={u.id}>
                      {u.name} ({roleLabel})
                    </option>
                  );
                })}
              </select>
            </div>
          </div>

          {/* Date Selection */}
          <div className="p-2.5 rounded-xl bg-slate-800/60 border border-emerald-500/20 text-xs">
            <div className="flex items-center justify-between mb-1">
              <label className="text-[11px] font-bold text-emerald-300 flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-emerald-400" />
                <span>{language === 'bn' ? 'হস্তান্তরের তারিখ (Date)' : 'Transfer Date'}</span>
              </label>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setDate(getTodayDateString())}
                  className={`text-[9px] px-2 py-0.5 rounded font-bold transition ${
                    date === getTodayDateString() ? 'bg-emerald-600 text-white' : 'bg-slate-700 text-slate-300 hover:text-white'
                  }`}
                >
                  {language === 'bn' ? 'আজ' : 'Today'}
                </button>
                <button
                  type="button"
                  onClick={() => setDate(getYesterdayDateString())}
                  className={`text-[9px] px-2 py-0.5 rounded font-bold transition ${
                    date === getYesterdayDateString() ? 'bg-emerald-600 text-white' : 'bg-slate-700 text-slate-300 hover:text-white'
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
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs font-mono text-white focus:outline-none focus:border-emerald-500"
            />
          </div>

          {/* Toggle Denominations vs Direct Amount */}
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
              <Calculator className="w-3.5 h-3.5 text-emerald-400" />
              <span>{t.notesBreakdown}</span>
            </span>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setUseDenominations(true)}
                className={`text-[11px] font-semibold px-2.5 py-1 rounded-lg border transition ${
                  useDenominations
                    ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                    : 'bg-slate-800 text-slate-400 border-slate-700'
                }`}
              >
                {language === 'bn' ? 'নোটের হিসাব' : 'Notes Breakdown'}
              </button>
              <button
                type="button"
                onClick={() => setUseDenominations(false)}
                className={`text-[11px] font-semibold px-2.5 py-1 rounded-lg border transition ${
                  !useDenominations
                    ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                    : 'bg-slate-800 text-slate-400 border-slate-700'
                }`}
              >
                {language === 'bn' ? 'সরাসরি টাকা' : 'Direct Amount'}
              </button>
            </div>
          </div>

          {/* Denomination Counter Table */}
          {useDenominations ? (
            <div className="rounded-xl border border-slate-700/80 bg-slate-950/60 p-3 space-y-2">
              <div className="grid grid-cols-2 gap-2 text-xs">
                {/* 1000 */}
                <div className="flex items-center justify-between bg-slate-900/80 p-2 rounded-lg border border-slate-800">
                  <span className="font-bold text-amber-300">৳ 1,000</span>
                  <div className="flex items-center gap-1">
                    <span className="text-slate-500 text-[11px]">×</span>
                    <input
                      type="number"
                      min="0"
                      value={d1000 || ''}
                      onChange={(e) => setD1000(Math.max(0, parseInt(e.target.value) || 0))}
                      placeholder="0"
                      className="w-14 text-center bg-slate-950 border border-slate-700 rounded px-1 py-0.5 text-xs text-white font-mono-num font-bold"
                    />
                  </div>
                </div>

                {/* 500 */}
                <div className="flex items-center justify-between bg-slate-900/80 p-2 rounded-lg border border-slate-800">
                  <span className="font-bold text-emerald-300">৳ 500</span>
                  <div className="flex items-center gap-1">
                    <span className="text-slate-500 text-[11px]">×</span>
                    <input
                      type="number"
                      min="0"
                      value={d500 || ''}
                      onChange={(e) => setD500(Math.max(0, parseInt(e.target.value) || 0))}
                      placeholder="0"
                      className="w-14 text-center bg-slate-950 border border-slate-700 rounded px-1 py-0.5 text-xs text-white font-mono-num font-bold"
                    />
                  </div>
                </div>

                {/* 200 */}
                <div className="flex items-center justify-between bg-slate-900/80 p-2 rounded-lg border border-slate-800">
                  <span className="font-bold text-sky-300">৳ 200</span>
                  <div className="flex items-center gap-1">
                    <span className="text-slate-500 text-[11px]">×</span>
                    <input
                      type="number"
                      min="0"
                      value={d200 || ''}
                      onChange={(e) => setD200(Math.max(0, parseInt(e.target.value) || 0))}
                      placeholder="0"
                      className="w-14 text-center bg-slate-950 border border-slate-700 rounded px-1 py-0.5 text-xs text-white font-mono-num font-bold"
                    />
                  </div>
                </div>

                {/* 100 */}
                <div className="flex items-center justify-between bg-slate-900/80 p-2 rounded-lg border border-slate-800">
                  <span className="font-bold text-indigo-300">৳ 100</span>
                  <div className="flex items-center gap-1">
                    <span className="text-slate-500 text-[11px]">×</span>
                    <input
                      type="number"
                      min="0"
                      value={d100 || ''}
                      onChange={(e) => setD100(Math.max(0, parseInt(e.target.value) || 0))}
                      placeholder="0"
                      className="w-14 text-center bg-slate-950 border border-slate-700 rounded px-1 py-0.5 text-xs text-white font-mono-num font-bold"
                    />
                  </div>
                </div>

                {/* 50 */}
                <div className="flex items-center justify-between bg-slate-900/80 p-2 rounded-lg border border-slate-800">
                  <span className="font-bold text-purple-300">৳ 50</span>
                  <div className="flex items-center gap-1">
                    <span className="text-slate-500 text-[11px]">×</span>
                    <input
                      type="number"
                      min="0"
                      value={d50 || ''}
                      onChange={(e) => setD50(Math.max(0, parseInt(e.target.value) || 0))}
                      placeholder="0"
                      className="w-14 text-center bg-slate-950 border border-slate-700 rounded px-1 py-0.5 text-xs text-white font-mono-num font-bold"
                    />
                  </div>
                </div>

                {/* 20 & 10 */}
                <div className="flex items-center justify-between bg-slate-900/80 p-2 rounded-lg border border-slate-800">
                  <span className="font-bold text-rose-300">৳ 20 / 10</span>
                  <div className="flex items-center gap-1">
                    <span className="text-slate-500 text-[11px]">×</span>
                    <input
                      type="number"
                      min="0"
                      value={d20 || ''}
                      onChange={(e) => setD20(Math.max(0, parseInt(e.target.value) || 0))}
                      placeholder="0"
                      className="w-14 text-center bg-slate-950 border border-slate-700 rounded px-1 py-0.5 text-xs text-white font-mono-num font-bold"
                    />
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="p-3.5 rounded-xl bg-slate-800/80 border border-slate-700">
              <label className="text-[10px] uppercase font-bold text-slate-400">{t.amount}</label>
              <div className="relative mt-1">
                <span className="absolute left-3 top-2 font-bold text-emerald-400">৳</span>
                <input
                  type="number"
                  min="0.01"
                  step="any"
                  value={directAmount || ''}
                  onChange={(e) => setDirectAmount(Number(e.target.value))}
                  placeholder="0"
                  className="w-full pl-8 pr-4 py-2 bg-slate-900 border border-slate-700 rounded-xl text-sm font-bold font-mono-num text-white focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>
          )}

          {/* Notes */}
          <div>
            <label className="text-[10px] uppercase font-bold text-slate-400">{t.notes}</label>
            <input
              type="text"
              placeholder={language === 'bn' ? 'যেমন: ধানমন্ডি রুটের কালেকশন' : 'e.g. Morning route collection handover'}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full mt-1 bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-emerald-500"
            />
          </div>

          {/* Drawer Impact / Negative Balance Notice */}
          {(() => {
            const currentDrawer = currentUser.assignedCashDrawer || 0;
            const projectedDrawer = currentDrawer - finalAmount;
            return (
              <div className="space-y-1.5">
                <div className="flex items-center justify-between px-3 py-1.5 rounded-lg bg-slate-950/60 border border-slate-800 text-xs">
                  <span className="text-slate-400">
                    {language === 'bn' ? 'বর্তমান ক্যাশ ড্রয়ার:' : 'Current Drawer:'}
                  </span>
                  <span className={`font-mono-num font-bold ${currentDrawer < 0 ? 'text-rose-400' : 'text-slate-200'}`}>
                    {formatCurrency(currentDrawer, language)}
                  </span>
                </div>

                <div className={`flex items-center justify-between px-3 py-1.5 rounded-lg border text-xs ${
                  projectedDrawer < 0 ? 'bg-rose-950/40 border-rose-500/40 text-rose-200' : 'bg-slate-950/60 border-slate-800 text-slate-200'
                }`}>
                  <span className={projectedDrawer < 0 ? 'text-rose-300 font-semibold' : 'text-slate-400'}>
                    {language === 'bn' ? 'হস্তান্তরের পর ক্যাশ ড্রয়ার:' : 'Drawer After Transfer:'}
                  </span>
                  <span className={`font-mono-num font-bold ${projectedDrawer < 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
                    {formatCurrency(projectedDrawer, language)}
                  </span>
                </div>

                {projectedDrawer < 0 && (
                  <div className="p-2 rounded-lg bg-amber-950/40 border border-amber-500/30 text-[11px] text-amber-200 leading-relaxed">
                    ⚠️ {language === 'bn'
                      ? `ক্যাশ ড্রয়ারে পর্যাপ্ত টাকা নেই। হস্তান্তর সম্পন্ন হলে ড্রয়ারে ${formatCurrency(projectedDrawer, language)} মাইনাস ফিগার দেখাবে। পরবর্তীতে টাকা জমা দিলে এই মাইনাস ফিগার সমন্বয় হয়ে যাবে।`
                      : `Drawer will show a negative balance of ${formatCurrency(projectedDrawer, language)}. Subsequent deposits will clear this balance.`}
                  </div>
                )}
              </div>
            );
          })()}

          {/* Grand Handover Total */}
          <div className="flex items-center justify-between p-3.5 bg-emerald-950/40 border border-emerald-500/40 rounded-xl">
            <span className="text-xs font-semibold text-slate-300">
              {language === 'bn' ? 'মোট হস্তান্তরযোগ্য নগদ' : 'Total Transfer Amount'}
            </span>
            <span className="text-lg font-extrabold text-emerald-400 font-mono-num">
              {formatCurrency(finalAmount, language)}
            </span>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-xl"
            >
              {t.cancel}
            </button>
            <button
              type="submit"
              disabled={finalAmount <= 0}
              className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 disabled:pointer-events-none text-white text-xs font-bold rounded-xl flex items-center gap-2 shadow-lg shadow-emerald-900/40 transition active:scale-95"
            >
              <Send className="w-4 h-4" />
              <span>{language === 'bn' ? 'ক্যাশ ট্রান্সফার পাঠান' : 'Submit Transfer'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
