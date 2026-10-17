import React, { useState } from 'react';
import { useWholesale } from '../context/WholesaleContext';
import { translations, formatCurrency } from '../utils/translations';
import { UserProfile, UserRole } from '../types';
import { PhoneInputWithContactPicker } from './PhoneInputWithContactPicker';
import { setRolePin, ROLE_DEFAULT_PINS } from '../lib/biometrics';
import {
  Users,
  UserPlus,
  Truck,
  ShoppingCart,
  Shield,
  Phone,
  Lock,
  KeyRound,
  MapPin,
  Store,
  DollarSign,
  CheckCircle2,
  AlertCircle,
  X,
  Edit3,
  Trash2,
  Copy,
  Share2,
  Check,
  Send,
  Eye,
  EyeOff,
  Smartphone,
  Laptop,
  Coins,
  Sparkles
} from 'lucide-react';

interface StaffManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const StaffManagementModal: React.FC<StaffManagementModalProps> = ({
  isOpen,
  onClose,
}) => {
  const {
    language,
    users,
    currentUser,
    addStaffMember,
    updateStaffMember,
    deleteStaffMember,
    openBalanceModal,
  } = useWholesale();

  const t = translations[language];

  // Tab: 'list' | 'add' | 'edit'
  const [activeTab, setActiveTab] = useState<'list' | 'add' | 'edit'>('list');
  const [roleFilter, setRoleFilter] = useState<'all' | 'dsr' | 'counter'>('all');

  // Form State
  const [editingStaffId, setEditingStaffId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    bnName: '',
    role: 'dsr' as 'dsr' | 'counter',
    phone: '',
    pin: '1234',
    routeArea: '',
    assignedCounterNo: 'Counter-01',
    assignedCashDrawer: 10000,
    notes: '',
  });

  // UI state
  const [showPin, setShowPin] = useState<{ [id: string]: boolean }>({});
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [shareText, setShareText] = useState<string | null>(null);
  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  if (!isOpen) return null;

  // Filter staff members (DSR and Counter)
  const staffMembers = users.filter(
    (u) => u.role === 'dsr' || u.role === 'counter'
  );

  const filteredStaff = staffMembers.filter((u) => {
    if (roleFilter === 'all') return true;
    return u.role === roleFilter;
  });

  const dsrCount = staffMembers.filter((u) => u.role === 'dsr').length;
  const counterCount = staffMembers.filter((u) => u.role === 'counter').length;
  const totalStaffCash = staffMembers.reduce(
    (sum, u) => sum + (u.assignedCashDrawer || 0),
    0
  );

  const resetForm = () => {
    setFormData({
      name: '',
      bnName: '',
      role: 'dsr',
      phone: '',
      pin: ROLE_DEFAULT_PINS['dsr'] || '3456',
      routeArea: '',
      assignedCounterNo: 'Counter-01',
      assignedCashDrawer: 10000,
      notes: '',
    });
    setEditingStaffId(null);
    setStatusMsg(null);
  };

  const handleStartAdd = () => {
    resetForm();
    setActiveTab('add');
  };

  const handleStartEdit = (staff: UserProfile) => {
    setFormData({
      name: staff.name,
      bnName: staff.bnName || staff.name,
      role: (staff.role === 'counter' ? 'counter' : 'dsr'),
      phone: staff.phone,
      pin: staff.pin || ROLE_DEFAULT_PINS[staff.role] || (staff.role === 'counter' ? '2345' : '3456'),
      routeArea: staff.routeArea || '',
      assignedCounterNo: staff.assignedCounterNo || 'Counter-01',
      assignedCashDrawer: staff.assignedCashDrawer || 0,
      notes: staff.notes || '',
    });
    setEditingStaffId(staff.id);
    setActiveTab('edit');
    setStatusMsg(null);
  };

  const handleCopyCredentials = (staff: UserProfile) => {
    const rolePin = staff.pin || ROLE_DEFAULT_PINS[staff.role] || (staff.role === 'counter' ? '2345' : '3456');
    const text = language === 'bn'
      ? `📋 *${currentUser.enterpriseName || currentUser.name} - স্টাফ লগইন তথ্য*\n\n` +
        `👤 নাম: ${staff.bnName || staff.name}\n` +
        `💼 পদবী: ${staff.role === 'dsr' ? 'ডিএসআর (ফিল্ড সেলস)' : 'ক্যাশ কাউন্টার ইনচার্জ'}\n` +
        `📱 লগইন মোবাইল: ${staff.phone}\n` +
        `🔑 লগইন পিন: ${rolePin}\n` +
        (staff.routeArea ? `📍 নির্ধারিত রুট: ${staff.routeArea}\n` : '') +
        (staff.assignedCounterNo ? `🏬 কাউন্টার নং: ${staff.assignedCounterNo}\n` : '') +
        `🌐 লগইন লিংক: ${window.location.origin}\n\n` +
        `🔒 নিরাপত্তা সতর্কতা: এই পিনটি শুধুমাত্র ${staff.role === 'dsr' ? 'ডিএসআর' : 'ক্যাশ কাউন্টার'} অ্যাকাউন্টের জন্য সংরক্ষিত। অন্য কোনো অ্যাকাউন্টে এই পিন দিয়ে প্রবেশ করা যাবে না।\n` +
        `👉 যে কোনো মোবাইল বা কম্পিউটারের ব্রাউজারে লিংকটি খুলে এই মোবাইল নম্বর ও পিন দিয়ে সরাসরি লগইন করুন।`
      : `📋 *${currentUser.enterpriseName || currentUser.name} - Staff Login Details*\n\n` +
        `👤 Name: ${staff.name}\n` +
        `💼 Role: ${staff.role === 'dsr' ? 'DSR (Field Sales)' : 'Cash Counter Cashier'}\n` +
        `📱 Login Mobile: ${staff.phone}\n` +
        `🔑 Login PIN: ${rolePin}\n` +
        (staff.routeArea ? `📍 Route: ${staff.routeArea}\n` : '') +
        `🌐 App URL: ${window.location.origin}\n\n` +
        `🔒 Security Notice: This PIN is strictly restricted to ${staff.role.toUpperCase()} account.\n` +
        `👉 Open the link in any mobile phone or computer browser and login using this phone number and PIN.`;

    navigator.clipboard?.writeText(text);
    setCopiedId(staff.id);
    setShareText(text);
    setTimeout(() => {
      setCopiedId(null);
    }, 3000);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatusMsg(null);

    const cleanPhone = formData.phone.trim().replace(/[^0-9+]/g, '');
    if (!cleanPhone || cleanPhone.length < 10) {
      setStatusMsg({
        type: 'error',
        text: language === 'bn' ? 'সঠিক ১১-সংখ্যার মোবাইল নম্বর লিখুন।' : 'Please enter a valid 11-digit mobile number.',
      });
      return;
    }

    if (!formData.name.trim()) {
      setStatusMsg({
        type: 'error',
        text: language === 'bn' ? 'কর্মীর নাম লিখুন।' : 'Please enter staff name.',
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const finalPin = formData.pin.trim() || ROLE_DEFAULT_PINS[formData.role] || (formData.role === 'counter' ? '2345' : '3456');

      if (activeTab === 'edit' && editingStaffId) {
        const res = await updateStaffMember(editingStaffId, {
          name: formData.name.trim(),
          bnName: formData.bnName.trim() || formData.name.trim(),
          role: formData.role,
          phone: cleanPhone,
          pin: finalPin,
          routeArea: formData.role === 'dsr' ? formData.routeArea.trim() : undefined,
          assignedCounterNo: formData.role === 'counter' ? formData.assignedCounterNo.trim() : undefined,
          assignedCashDrawer: Number(formData.assignedCashDrawer) || 0,
          notes: formData.notes.trim() || undefined,
        });

        if (res.success) {
          await setRolePin(formData.role, finalPin);
          setStatusMsg({
            type: 'success',
            text: language === 'bn' ? 'স্টাফের তথ্য সফলভাবে আপডেট হয়েছে।' : 'Staff details updated successfully.',
          });
          setTimeout(() => {
            setActiveTab('list');
            resetForm();
          }, 800);
        } else {
          setStatusMsg({ type: 'error', text: res.message });
        }
      } else {
        const res = await addStaffMember({
          name: formData.name.trim(),
          bnName: formData.bnName.trim() || formData.name.trim(),
          role: formData.role,
          phone: cleanPhone,
          pin: finalPin,
          routeArea: formData.role === 'dsr' ? (formData.routeArea.trim() || 'General Field Route') : undefined,
          assignedCounterNo: formData.role === 'counter' ? (formData.assignedCounterNo.trim() || 'Counter-01') : undefined,
          assignedCashDrawer: Number(formData.assignedCashDrawer) || 0,
          notes: formData.notes.trim() || undefined,
        });

        if (res.success && res.user) {
          await setRolePin(formData.role, finalPin);
          setStatusMsg({
            type: 'success',
            text: language === 'bn'
              ? `✅ ${res.user.bnName || res.user.name} সফলভাবে যুক্ত হয়েছেন! তিনি যেকোনো ডিভাইস থেকে ${res.user.phone} নম্বর দিয়ে লগইন করতে পারবেন।`
              : `✅ ${res.user.name} added successfully! They can now log in from any device using ${res.user.phone}.`,
          });
          // Also set share text immediately
          handleCopyCredentials(res.user);
          setTimeout(() => {
            setActiveTab('list');
            resetForm();
          }, 1500);
        } else {
          setStatusMsg({ type: 'error', text: res.message });
        }
      }
    } catch (err: any) {
      setStatusMsg({
        type: 'error',
        text: err.message || 'Operation failed. Please try again.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (staffId: string) => {
    try {
      const res = await deleteStaffMember(staffId);
      if (res.success) {
        setConfirmDeleteId(null);
        setStatusMsg({
          type: 'success',
          text: language === 'bn' ? 'স্টাফ সফলভাবে অপসারন করা হয়েছে।' : 'Staff removed successfully.',
        });
      } else {
        setStatusMsg({ type: 'error', text: res.message });
      }
    } catch (err: any) {
      setStatusMsg({ type: 'error', text: err.message || 'Failed to remove staff.' });
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-700/80 rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col max-h-[92vh]">
        
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-800 flex items-center justify-between bg-gradient-to-r from-slate-900 via-slate-800/80 to-slate-900">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-sky-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-sky-500/20">
              <Users className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-white tracking-tight flex items-center gap-2">
                <span>{language === 'bn' ? 'স্টাফ ও টিম ম্যানেজমেন্ট' : 'Staff & Team Management'}</span>
                <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-sky-500/20 text-sky-300 border border-sky-500/30 uppercase">
                  DSR & Counter
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                {language === 'bn'
                  ? 'ডিএসআর ও ক্যাশ কাউন্টার কর্মী যোগ করুন, যাতে তারা যেকোনো মোবাইল বা পিসিতে লগইন করতে পারে'
                  : 'Add DSR & Counter staff so they can log in with their phone from any mobile or PC'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Cross-Device Login Explanatory Banner */}
        <div className="bg-sky-950/40 border-b border-sky-800/40 px-4 py-2.5 flex items-center justify-between gap-3 text-xs text-sky-200">
          <div className="flex items-center gap-2 min-w-0">
            <div className="p-1 rounded-lg bg-sky-500/20 text-sky-400 shrink-0">
              <Smartphone className="w-4 h-4" />
            </div>
            <p className="leading-snug text-[11px] sm:text-xs">
              <strong>{language === 'bn' ? 'মোবাইল ও পিসি লগইন সুবিধা:' : 'Multi-Device Login:'}</strong>{' '}
              {language === 'bn'
                ? 'এডমিন যে মোবাইল নম্বর দিয়ে স্টাফ যোগ করবেন, কর্মী যেকোনো ডিভাইস থেকে ঠিক সেই নম্বর ও পিন দিয়ে সরাসরি তার রোলে লগইন করতে পারবে।'
                : 'Staff members can log in directly into their assigned DSR or Counter role from any phone or computer browser.'}
            </p>
          </div>
          <div className="hidden sm:flex items-center gap-1 text-[10px] bg-sky-900/60 px-2 py-1 rounded-lg border border-sky-700/60 shrink-0">
            <Laptop className="w-3 h-3 text-sky-300" />
            <span>{language === 'bn' ? 'ক্লাউড সিঙ্ক সক্রিয়' : 'Cloud Synced'}</span>
          </div>
        </div>

        {/* Action / Mode Tabs */}
        <div className="px-4 pt-3 flex items-center justify-between gap-2 border-b border-slate-800 bg-slate-950/40 flex-wrap">
          <div className="flex items-center gap-1.5 pb-2">
            <button
              onClick={() => {
                setActiveTab('list');
                setStatusMsg(null);
              }}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'list'
                  ? 'bg-slate-800 text-white shadow-sm border border-slate-700'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              <span>{language === 'bn' ? 'কর্মীদের তালিকা' : 'Staff List'}</span>
              <span className="ml-1 px-1.5 py-0.2 text-[10px] rounded-full bg-slate-700 text-slate-300 font-mono">
                {staffMembers.length}
              </span>
            </button>

            <button
              onClick={handleStartAdd}
              id="btn-add-new-staff-tab"
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'add'
                  ? 'bg-emerald-600 text-white shadow-sm shadow-emerald-950'
                  : 'text-emerald-400 hover:bg-emerald-950/40 border border-emerald-500/30'
              }`}
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>{language === 'bn' ? '+ নতুন কর্মী যোগ করুন' : '+ Add New Staff'}</span>
            </button>
          </div>

          {activeTab === 'list' && (
            <div className="flex items-center gap-1 pb-2">
              <button
                onClick={() => setRoleFilter('all')}
                className={`px-2 py-1 rounded-lg text-[11px] font-semibold transition cursor-pointer ${
                  roleFilter === 'all'
                    ? 'bg-slate-700 text-white'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {language === 'bn' ? 'সকল' : 'All'}
              </button>
              <button
                onClick={() => setRoleFilter('dsr')}
                className={`px-2 py-1 rounded-lg text-[11px] font-semibold transition cursor-pointer flex items-center gap-1 ${
                  roleFilter === 'dsr'
                    ? 'bg-sky-600/30 text-sky-300 border border-sky-500/40'
                    : 'text-slate-400 hover:text-sky-300'
                }`}
              >
                <Truck className="w-3 h-3" />
                <span>DSR ({dsrCount})</span>
              </button>
              <button
                onClick={() => setRoleFilter('counter')}
                className={`px-2 py-1 rounded-lg text-[11px] font-semibold transition cursor-pointer flex items-center gap-1 ${
                  roleFilter === 'counter'
                    ? 'bg-emerald-600/30 text-emerald-300 border border-emerald-500/40'
                    : 'text-slate-400 hover:text-emerald-300'
                }`}
              >
                <ShoppingCart className="w-3 h-3" />
                <span>{language === 'bn' ? 'কাউন্টার' : 'Counter'} ({counterCount})</span>
              </button>
            </div>
          )}
        </div>

        {/* Status Notification Toast */}
        {statusMsg && (
          <div
            className={`mx-4 mt-3 p-3 rounded-xl border flex items-center justify-between text-xs animate-in slide-in-from-top-1 ${
              statusMsg.type === 'success'
                ? 'bg-emerald-950/80 border-emerald-500/40 text-emerald-300'
                : 'bg-rose-950/80 border-rose-500/40 text-rose-300'
            }`}
          >
            <div className="flex items-center gap-2">
              {statusMsg.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
              )}
              <span>{statusMsg.text}</span>
            </div>
            <button
              onClick={() => setStatusMsg(null)}
              className="text-slate-400 hover:text-white ml-2"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Modal Body */}
        <div className="p-4 sm:p-5 overflow-y-auto flex-1 space-y-4">
          
          {/* TAB 1: STAFF LIST */}
          {activeTab === 'list' && (
            <div className="space-y-4">
              {/* Summary Stats Row */}
              <div className="grid grid-cols-3 gap-2 sm:gap-3">
                <div className="p-3 rounded-2xl bg-slate-850 border border-slate-800 text-center">
                  <span className="text-[10px] text-slate-400 uppercase font-semibold">
                    {language === 'bn' ? 'মোট কর্মী' : 'Total Staff'}
                  </span>
                  <div className="text-lg sm:text-xl font-bold font-mono text-white mt-0.5">
                    {staffMembers.length}
                  </div>
                </div>

                <div className="p-3 rounded-2xl bg-sky-950/30 border border-sky-800/40 text-center">
                  <span className="text-[10px] text-sky-300 uppercase font-semibold flex items-center justify-center gap-1">
                    <Truck className="w-3 h-3" />
                    <span>DSR</span>
                  </span>
                  <div className="text-lg sm:text-xl font-bold font-mono text-sky-300 mt-0.5">
                    {dsrCount}
                  </div>
                </div>

                <div className="p-3 rounded-2xl bg-emerald-950/30 border border-emerald-800/40 text-center">
                  <span className="text-[10px] text-emerald-300 uppercase font-semibold flex items-center justify-center gap-1">
                    <ShoppingCart className="w-3 h-3" />
                    <span>{language === 'bn' ? 'কাউন্টার' : 'Counter'}</span>
                  </span>
                  <div className="text-lg sm:text-xl font-bold font-mono text-emerald-300 mt-0.5">
                    {counterCount}
                  </div>
                </div>
              </div>

              {/* Staff Cards List */}
              {filteredStaff.length === 0 ? (
                <div className="text-center py-10 px-4 rounded-2xl border border-dashed border-slate-800 bg-slate-950/40 space-y-3">
                  <div className="w-12 h-12 rounded-full bg-slate-800 flex items-center justify-center mx-auto text-slate-500">
                    <Users className="w-6 h-6" />
                  </div>
                  <h4 className="text-sm font-bold text-slate-300">
                    {language === 'bn' ? 'কোনো কর্মী পাওয়া যায়নি' : 'No staff members found'}
                  </h4>
                  <p className="text-xs text-slate-400 max-w-sm mx-auto">
                    {language === 'bn'
                      ? 'নতুন ডিএসআর বা ক্যাশ কাউন্টার কর্মী যোগ করতে উপরের "+ নতুন কর্মী যোগ করুন" বাটনে ক্লিক করুন।'
                      : 'Click the "+ Add New Staff" button above to register your DSR sales representatives or Cash Counter staff.'}
                  </p>
                  <div className="flex items-center justify-center gap-2 pt-2 flex-wrap">
                    <button
                      type="button"
                      onClick={handleStartAdd}
                      className="py-2.5 px-5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold inline-flex items-center gap-1.5 transition cursor-pointer shadow-lg shadow-emerald-950/40"
                    >
                      <UserPlus className="w-4 h-4" />
                      <span>{language === 'bn' ? '+ নতুন কর্মী যোগ করুন' : '+ Add Staff Member'}</span>
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredStaff.map((staff) => {
                    const isDSR = staff.role === 'dsr';
                    const isPinVisible = !!showPin[staff.id];
                    const isCopied = copiedId === staff.id;

                    return (
                      <div
                        key={staff.id}
                        className={`p-3.5 sm:p-4 rounded-2xl border transition-all ${
                          isDSR
                            ? 'bg-slate-900/90 border-sky-900/40 hover:border-sky-700/60'
                            : 'bg-slate-900/90 border-emerald-900/40 hover:border-emerald-700/60'
                        }`}
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                          
                          {/* Left Info */}
                          <div className="flex items-start gap-3">
                            <div
                              className={`w-11 h-11 rounded-2xl flex items-center justify-center font-bold text-white shrink-0 shadow-md ${
                                isDSR
                                  ? 'bg-gradient-to-br from-sky-500 to-indigo-600 shadow-sky-950'
                                  : 'bg-gradient-to-br from-emerald-500 to-teal-700 shadow-emerald-950'
                              }`}
                            >
                              {isDSR ? <Truck className="w-5 h-5" /> : <ShoppingCart className="w-5 h-5" />}
                            </div>

                            <div>
                              <div className="flex items-center gap-2 flex-wrap">
                                <h3 className="font-bold text-sm sm:text-base text-white">
                                  {staff.bnName || staff.name}
                                </h3>
                                <span
                                  className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full border uppercase tracking-wider ${
                                    isDSR
                                      ? 'bg-sky-500/20 text-sky-300 border-sky-500/30'
                                      : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                                  }`}
                                >
                                  {isDSR ? 'DSR (ফিল্ড সেলস)' : 'ক্যাশ কাউন্টার'}
                                </span>
                              </div>

                              {/* Phone & Route Details */}
                              <div className="flex items-center gap-3 mt-1 text-xs text-slate-400 flex-wrap">
                                <div className="flex items-center gap-1.5 text-slate-200">
                                  <Phone className="w-3.5 h-3.5 text-sky-400" />
                                  <strong className="font-mono text-white text-xs">{staff.phone}</strong>
                                </div>

                                {staff.routeArea && (
                                  <div className="flex items-center gap-1 text-slate-300">
                                    <MapPin className="w-3 h-3 text-purple-400" />
                                    <span>{staff.routeArea}</span>
                                  </div>
                                )}

                                {staff.assignedCounterNo && (
                                  <div className="flex items-center gap-1 text-slate-300">
                                    <Store className="w-3 h-3 text-amber-400" />
                                    <span>{staff.assignedCounterNo}</span>
                                  </div>
                                )}
                              </div>

                              {/* PIN & Live Cash Drawer Row */}
                              <div className="flex items-center gap-2 mt-2 flex-wrap text-xs">
                                {/* Login PIN Pill */}
                                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-slate-950 border border-slate-800 text-[11px]">
                                  <KeyRound className="w-3 h-3 text-amber-400" />
                                  <span className="text-slate-400">{language === 'bn' ? 'লগইন পিন:' : 'PIN:'}</span>
                                  <span className="font-mono font-bold text-amber-300">
                                    {isPinVisible ? staff.pin || '1234' : '••••'}
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() =>
                                      setShowPin((prev) => ({ ...prev, [staff.id]: !prev[staff.id] }))
                                    }
                                    className="p-0.5 text-slate-400 hover:text-slate-200 cursor-pointer"
                                    title="Toggle PIN Visibility"
                                  >
                                    {isPinVisible ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                                  </button>
                                </div>

                                {/* Live Drawer Cash */}
                                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-slate-950 border border-slate-800 text-[11px]">
                                  <Coins className="w-3 h-3 text-emerald-400" />
                                  <span className="text-slate-400">{language === 'bn' ? 'হাতে ক্যাশ:' : 'Drawer:'}</span>
                                  <strong className={`font-mono-num font-bold ${(staff.assignedCashDrawer || 0) < 0 ? 'text-rose-400 font-extrabold' : 'text-emerald-400'}`}>
                                    {formatCurrency(staff.assignedCashDrawer || 0, language)}
                                  </strong>
                                  <button
                                    type="button"
                                    onClick={() => openBalanceModal(isDSR ? 'DSR_CASH' : 'COUNTER_CASH')}
                                    className="p-0.5 text-slate-400 hover:text-emerald-400 cursor-pointer"
                                    title="Edit Cash Float"
                                  >
                                    <Edit3 className="w-3 h-3" />
                                  </button>
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* Right Action Controls */}
                          <div className="flex items-center gap-1.5 sm:self-center pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-800/80 justify-end">
                            {/* Copy / Share Login Info Button */}
                            <button
                              onClick={() => handleCopyCredentials(staff)}
                              className={`p-2 rounded-xl border text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer active:scale-95 ${
                                isCopied
                                  ? 'bg-emerald-600 text-white border-emerald-500'
                                  : 'bg-slate-800/80 hover:bg-slate-700 text-slate-200 border-slate-700'
                              }`}
                              title={language === 'bn' ? 'লগইন তথ্য কপি ও শেয়ার করুন' : 'Copy and share login details'}
                            >
                              {isCopied ? <Check className="w-3.5 h-3.5" /> : <Share2 className="w-3.5 h-3.5 text-sky-400" />}
                              <span className="hidden sm:inline">
                                {isCopied ? (language === 'bn' ? 'কপি হয়েছে' : 'Copied!') : (language === 'bn' ? 'লগইন শেয়ার' : 'Share Login')}
                              </span>
                            </button>

                            {/* Edit Button */}
                            <button
                              onClick={() => handleStartEdit(staff)}
                              className="p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-200 border border-slate-700 transition cursor-pointer"
                              title={language === 'bn' ? 'স্টাফের তথ্য এডিট করুন' : 'Edit staff details'}
                            >
                              <Edit3 className="w-3.5 h-3.5 text-amber-400" />
                            </button>

                            {/* Delete Button with inline confirmation */}
                            {confirmDeleteId === staff.id ? (
                              <div className="flex items-center gap-1 bg-rose-950/80 border border-rose-500/40 p-1 rounded-xl">
                                <button
                                  onClick={() => handleDelete(staff.id)}
                                  className="px-2 py-1 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-[11px] font-bold"
                                >
                                  {language === 'bn' ? 'হ্যাঁ, মুছুন' : 'Delete'}
                                </button>
                                <button
                                  onClick={() => setConfirmDeleteId(null)}
                                  className="px-2 py-1 rounded-lg bg-slate-800 text-slate-300 text-[11px]"
                                >
                                  {language === 'bn' ? 'বাতিল' : 'Cancel'}
                                </button>
                              </div>
                            ) : (
                              <button
                                onClick={() => setConfirmDeleteId(staff.id)}
                                className="p-2 rounded-xl bg-slate-800/80 hover:bg-rose-950/60 text-slate-400 hover:text-rose-400 border border-slate-700 hover:border-rose-500/40 transition cursor-pointer"
                                title={language === 'bn' ? 'স্টাফ রিমুভ করুন' : 'Remove staff'}
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* TAB 2 & 3: ADD / EDIT STAFF FORM */}
          {(activeTab === 'add' || activeTab === 'edit') && (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <UserPlus className="w-4 h-4 text-emerald-400" />
                  <span>
                    {activeTab === 'edit'
                      ? (language === 'bn' ? 'স্টাফের তথ্য সংশোধন (Edit Staff)' : 'Edit Staff Details')
                      : (language === 'bn' ? 'নতুন স্টাফ যোগ ফরম (Add New Staff)' : 'Add New Staff Member')}
                  </span>
                </h3>
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab('list');
                    resetForm();
                  }}
                  className="text-xs text-slate-400 hover:text-white underline cursor-pointer"
                >
                  {language === 'bn' ? 'তালিকায় ফিরে যান' : 'Back to list'}
                </button>
              </div>

              {/* Role Selection */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  {language === 'bn' ? '১. কর্মীর পদবী / ভূমিকা নির্বাচন করুন *' : '1. Select Staff Role *'}
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, role: 'dsr' })}
                    className={`p-3 rounded-2xl border text-left flex items-start gap-3 transition cursor-pointer ${
                      formData.role === 'dsr'
                        ? 'bg-sky-950/60 border-sky-500 text-sky-200 ring-1 ring-sky-500/40'
                        : 'bg-slate-850 border-slate-700 text-slate-400 hover:border-slate-600'
                    }`}
                  >
                    <div className="p-2 rounded-xl bg-sky-500/20 text-sky-400 shrink-0">
                      <Truck className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="font-bold text-sm text-white">
                        {language === 'bn' ? 'ডিএসআর (DSR)' : 'DSR (Field Sales)'}
                      </h4>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        {language === 'bn' ? 'দোকানে গিয়ে অর্ডার বুকিং ও ফিল্ড ক্যাশ কালেকশন' : 'Field sales booking & collection'}
                      </p>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, role: 'counter' })}
                    className={`p-3 rounded-2xl border text-left flex items-start gap-3 transition cursor-pointer ${
                      formData.role === 'counter'
                        ? 'bg-emerald-950/60 border-emerald-500 text-emerald-200 ring-1 ring-emerald-500/40'
                        : 'bg-slate-850 border-slate-700 text-slate-400 hover:border-slate-600'
                    }`}
                  >
                    <div className="p-2 rounded-xl bg-emerald-500/20 text-emerald-400 shrink-0">
                      <ShoppingCart className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="font-bold text-sm text-white">
                        {language === 'bn' ? 'ক্যাশ কাউন্টার' : 'Cash Counter'}
                      </h4>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        {language === 'bn' ? 'দোকানের ক্যাশ কাউন্টার ইনভয়েস ও ড্রয়ার পরিচালনা' : 'Store billing & cash drawer'}
                      </p>
                    </div>
                  </button>
                </div>
              </div>

              {/* Names: English & Bangla */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs font-semibold text-slate-300">
                    {language === 'bn' ? '২. কর্মীর নাম ও পরিচয় *' : '2. Staff Name & Identity *'}
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">
                      {language === 'bn' ? 'কর্মীর নাম (English) *' : 'Staff Name (English) *'}
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder={language === 'bn' ? 'যেমন: রাজু আলম' : 'e.g. Razo Alom'}
                      className="w-full bg-slate-950 border border-slate-700 focus:border-sky-500 rounded-xl py-2.5 px-3 text-sm text-white focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs text-slate-400 mb-1">
                      {language === 'bn' ? 'বাংলায় নাম' : 'Bangla Name (Optional)'}
                    </label>
                    <input
                      type="text"
                      value={formData.bnName}
                      onChange={(e) => setFormData({ ...formData, bnName: e.target.value })}
                      placeholder="যেমন: রাজু আলম (ডিএসআর)"
                      className="w-full bg-slate-950 border border-slate-700 focus:border-sky-500 rounded-xl py-2.5 px-3 text-sm text-white focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* Mobile Number & Login PIN (Crucial for multi-device login) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3.5 rounded-2xl bg-slate-950/80 border border-sky-900/40">
                <div>
                  <PhoneInputWithContactPicker
                    label={language === 'bn' ? 'লগইন মোবাইল নম্বর (১১ ডিজিট)' : 'Login Mobile Number (11 digits)'}
                    required
                    value={formData.phone}
                    onChange={(newPhone) => setFormData({ ...formData, phone: newPhone })}
                    onSelectContactInfo={(info) => {
                      setFormData((prev) => ({
                        ...prev,
                        phone: info.phone,
                        name: prev.name || info.name,
                        bnName: prev.bnName || info.name,
                      }));
                    }}
                    placeholder="017XXXXXXXX"
                    helperText={
                      language === 'bn'
                        ? '⚠️ এই নম্বরটি দিয়ে কর্মী অন্য মোবাইল/পিসিতে লগইন করবেন।'
                        : 'Staff will use this phone number to log in from any phone/PC.'
                    }
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-amber-300 mb-1 flex items-center gap-1">
                    <KeyRound className="w-3.5 h-3.5" />
                    <span>{language === 'bn' ? '৪-ডিজিটের লগইন পিন *' : '4-Digit Login PIN *'}</span>
                  </label>
                  <input
                    type="text"
                    maxLength={6}
                    required
                    value={formData.pin}
                    onChange={(e) => setFormData({ ...formData, pin: e.target.value })}
                    placeholder="1234"
                    className="w-full bg-slate-900 border border-slate-700 focus:border-amber-500 rounded-xl py-2.5 px-3 text-sm font-mono font-bold text-amber-300 focus:outline-none tracking-widest"
                  />
                  <span className="text-[10px] text-slate-400 block mt-1">
                    {language === 'bn' ? 'ডিফল্ট পিন: 1234 (পরিবর্তনযোগ্য)' : 'Default PIN: 1234 (changeable)'}
                  </span>
                </div>
              </div>

              {/* Conditional Fields: Route Area or Counter No. */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {formData.role === 'dsr' ? (
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1 flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5 text-purple-400" />
                      <span>{language === 'bn' ? 'নির্ধারিত ফিল্ড রুট / এলাকা' : 'Assigned Route / Territory'}</span>
                    </label>
                    <input
                      type="text"
                      value={formData.routeArea}
                      onChange={(e) => setFormData({ ...formData, routeArea: e.target.value })}
                      placeholder={language === 'bn' ? 'যেমন: ধানমন্ডি - লালবাগ রুট' : 'e.g. Dhanmondi Route'}
                      className="w-full bg-slate-950 border border-slate-700 focus:border-purple-500 rounded-xl py-2.5 px-3 text-sm text-white focus:outline-none"
                    />
                  </div>
                ) : (
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1 flex items-center gap-1">
                      <Store className="w-3.5 h-3.5 text-emerald-400" />
                      <span>{language === 'bn' ? 'কাউন্টার নং / শিফট' : 'Counter No. / Shift'}</span>
                    </label>
                    <input
                      type="text"
                      value={formData.assignedCounterNo}
                      onChange={(e) => setFormData({ ...formData, assignedCounterNo: e.target.value })}
                      placeholder="e.g. Counter-01 (Main Gate)"
                      className="w-full bg-slate-950 border border-slate-700 focus:border-emerald-500 rounded-xl py-2.5 px-3 text-sm text-white focus:outline-none"
                    />
                  </div>
                )}

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1 flex items-center gap-1">
                    <DollarSign className="w-3.5 h-3.5 text-emerald-400" />
                    <span>{language === 'bn' ? 'প্রারম্ভিক ক্যাশ ড্রয়ার / ফ্লোট (৳)' : 'Opening Cash Drawer Float (৳)'}</span>
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="100"
                    value={formData.assignedCashDrawer}
                    onChange={(e) => setFormData({ ...formData, assignedCashDrawer: Number(e.target.value) || 0 })}
                    placeholder="10000"
                    className="w-full bg-slate-950 border border-slate-700 focus:border-emerald-500 rounded-xl py-2.5 px-3 text-sm font-mono-num font-bold text-emerald-400 focus:outline-none"
                  />
                  <span className="text-[10px] text-slate-400 block mt-1">
                    {language === 'bn' ? 'ক্যাশ হ্যান্ডওভার বা খুচরা টাকা' : 'Opening cash in drawer or hand'}
                  </span>
                </div>
              </div>

              {/* Optional Notes */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  {language === 'bn' ? 'নোট / রিমার্কস (ঐচ্ছিক)' : 'Notes / Remarks (Optional)'}
                </label>
                <input
                  type="text"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder={language === 'bn' ? 'যেমন: সকাল ৯টা থেকে বিকাল ৫টা পর্যন্ত' : 'e.g. Morning Shift'}
                  className="w-full bg-slate-950 border border-slate-700 focus:border-sky-500 rounded-xl py-2 px-3 text-xs text-white focus:outline-none"
                />
              </div>

              {/* Submit Buttons */}
              <div className="pt-3 border-t border-slate-800 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab('list');
                    resetForm();
                  }}
                  className="py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition cursor-pointer"
                >
                  {language === 'bn' ? 'বাতিল' : 'Cancel'}
                </button>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  id="btn-save-staff-member"
                  className="py-2.5 px-5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-bold transition flex items-center gap-2 shadow-lg shadow-emerald-950 active:scale-95 cursor-pointer disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <span>{language === 'bn' ? 'সংরক্ষণ হচ্ছে...' : 'Saving...'}</span>
                  ) : (
                    <>
                      <Check className="w-4 h-4" />
                      <span>
                        {activeTab === 'edit'
                          ? (language === 'bn' ? 'আপডেট করুন' : 'Update Staff')
                          : (language === 'bn' ? 'কর্মী সংরক্ষণ ও আইডি তৈরি করুন' : 'Save & Create Staff Account')}
                      </span>
                    </>
                  )}
                </button>
              </div>
            </form>
          )}

        </div>

        {/* Footer info strip */}
        <div className="p-3 bg-slate-950 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400">
          <div className="flex items-center gap-1.5">
            <Shield className="w-3.5 h-3.5 text-amber-400" />
            <span>
              {language === 'bn' ? 'মালিক প্রতিষ্ঠান:' : 'Enterprise:'}{' '}
              <strong className="text-white">{currentUser.enterpriseName || currentUser.name}</strong>
            </span>
          </div>
          <span className="font-mono text-emerald-400">
            {language === 'bn' ? 'মোট ড্রয়ার ক্যাশ:' : 'Total Drawer Cash:'}{' '}
            {formatCurrency(totalStaffCash, language)}
          </span>
        </div>

      </div>
    </div>
  );
};
