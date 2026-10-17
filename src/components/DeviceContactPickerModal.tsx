import React, { useState, useRef } from 'react';
import { useWholesale } from '../context/WholesaleContext';
import { PhoneContact, Retailer, Language } from '../types';
import {
  Smartphone,
  BookUser,
  Upload,
  ClipboardPaste,
  Search,
  Check,
  X,
  ExternalLink,
  User,
  Store,
  Phone,
  Plus,
  Info,
  Sparkles,
  FileText
} from 'lucide-react';
import {
  pickContactFromDevice,
  sanitizePhoneNumber,
  triggerDeviceVcfPicker,
  parsePastedContactText,
  isRunningInIframe,
  isContactPickerSupported,
  PickedContactResult
} from '../utils/contactPickerHelper';

interface DeviceContactPickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectContact: (contact: {
    name: string;
    phone: string;
    organization?: string;
    address?: string;
  }) => void;
  language?: Language;
}

export const DeviceContactPickerModal: React.FC<DeviceContactPickerModalProps> = ({
  isOpen,
  onClose,
  onSelectContact,
}) => {
  const { language, phoneContacts, addPhoneContact, retailers, addRetailer } = useWholesale();

  const [activeSubTab, setActiveSubTab] = useState<'device' | 'type' | 'saved' | 'paste'>('device');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [manualShopName, setManualShopName] = useState<string>('');
  const [manualCustomerName, setManualCustomerName] = useState<string>('');
  const [manualPhone, setManualPhone] = useState<string>('');
  const [pasteText, setPasteText] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isPicking, setIsPicking] = useState<boolean>(false);

  const isIframe = isRunningInIframe();
  const isSupported = isContactPickerSupported();

  if (!isOpen) return null;

  const showMsg = (msg: string, isError: boolean = false) => {
    if (isError) {
      setErrorMessage(msg);
      setTimeout(() => setErrorMessage(null), 4000);
    } else {
      setSuccessMessage(msg);
      setTimeout(() => setSuccessMessage(null), 3000);
    }
  };

  // 1. Native Mobile Contact Picker
  const handleNativeContactPick = async () => {
    setIsPicking(true);
    setErrorMessage(null);
    try {
      const res = await pickContactFromDevice(false);
      if (res.success && res.contacts && res.contacts.length > 0) {
        const c = res.contacts[0];
        onSelectContact({
          name: c.name || 'Mobile Contact',
          phone: c.phone,
          organization: c.organization || '',
          address: c.address || '',
        });
        onClose();
      } else if (res.isIframeBlocked) {
        showMsg(
          language === 'bn'
            ? 'ব্রাউজার ফ্রেমের কারণে সরাসরি কন্টাক্ট ডায়ালগ ব্লক হলে "নতুন ট্যাবে খুলুন" বা "কন্টাক্ট ফাইল (.vcf)" ব্যবহার করুন।'
            : 'Device dialog restricted in iframe. Please use "Open in New Tab" or ".vcf file".',
          true
        );
      } else if (res.error && !res.error.includes('cancel') && !res.error.includes('No contact')) {
        showMsg(res.error, true);
      }
    } catch (e: any) {
      showMsg(String(e?.message || e), true);
    } finally {
      setIsPicking(false);
    }
  };

  // 2. Offline Device VCF / Contacts File Picker
  const handlePickVcfFile = async () => {
    try {
      const contacts = await triggerDeviceVcfPicker();
      if (contacts.length > 0) {
        // If single contact, select immediately
        if (contacts.length === 1) {
          const c = contacts[0];
          onSelectContact({
            name: c.name,
            phone: c.phone,
            organization: c.organization || '',
            address: c.address || '',
          });
          onClose();
        } else {
          // Multiple contacts in VCF file: save them to in-app phoneContacts & notify
          let addedCount = 0;
          contacts.forEach((c) => {
            const cleanPhone = sanitizePhoneNumber(c.phone);
            if (cleanPhone && cleanPhone.length >= 10) {
              addPhoneContact({
                id: `pb_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
                name: c.name,
                phone: cleanPhone,
                organization: c.organization || 'VCF Contact',
                address: c.address || '',
              });
              addedCount++;
            }
          });
          // Pick the first contact for the current memo
          const first = contacts[0];
          onSelectContact({
            name: first.name,
            phone: first.phone,
            organization: first.organization || '',
            address: first.address || '',
          });
          showMsg(
            language === 'bn'
              ? `কন্টাক্ট ফাইল থেকে ${addedCount} টি নম্বর ফোনবুকে সংরক্ষিত হয়েছে এবং প্রথমটি মেমোতে নেওয়া হয়েছে!`
              : `Imported ${addedCount} contacts from VCF file!`
          );
          setTimeout(() => onClose(), 800);
        }
      }
    } catch (err: any) {
      showMsg(String(err?.message || err), true);
    }
  };

  // 3. Paste from Clipboard
  const handlePasteClipboard = async () => {
    try {
      let text = pasteText;
      if (!text && navigator.clipboard?.readText) {
        text = await navigator.clipboard.readText();
      }
      if (!text) {
        showMsg(language === 'bn' ? 'কোনো নম্বর বা টেক্সট পাওয়া যায়নি' : 'No text in clipboard', true);
        return;
      }
      const parsed = parsePastedContactText(text);
      if (parsed && parsed.phone) {
        onSelectContact({
          name: parsed.name || 'Pasted Contact',
          phone: parsed.phone,
          organization: '',
        });
        onClose();
      } else {
        showMsg(language === 'bn' ? 'সঠিক ১১ ডিজিটের মোবাইল নম্বর পাওয়া যায়নি' : 'Valid 11-digit phone not found', true);
      }
    } catch (err: any) {
      showMsg(language === 'bn' ? 'ক্লিপবোর্ড পড়ার অনুমতি দিন' : 'Clipboard access denied', true);
    }
  };

  // 4. Manual Add Customer (Name + Shop + Phone)
  const handleSaveManualCustomer = () => {
    const cleanPhone = sanitizePhoneNumber(manualPhone);
    if (!cleanPhone || cleanPhone.length < 10) {
      showMsg(language === 'bn' ? 'অনুগ্রহ করে সঠিক মোবাইল নম্বর দিন (১১ ডিজিট)' : 'Please enter valid phone number', true);
      return;
    }

    const shop = manualShopName.trim() || manualCustomerName.trim() || `কাস্টমার ${cleanPhone.slice(-4)}`;
    const custName = manualCustomerName.trim() || shop;

    onSelectContact({
      name: custName,
      organization: shop,
      phone: cleanPhone,
    });
    onClose();
  };

  // Filter saved contacts and retailers
  const filteredSavedContacts = phoneContacts.concat(
    retailers.map((r) => ({
      id: r.id,
      name: r.ownerName || r.name,
      organization: r.shopName || r.name,
      phone: r.phone,
      address: r.address,
    }))
  ).filter((c) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      (c.name || '').toLowerCase().includes(q) ||
      (c.organization || '').toLowerCase().includes(q) ||
      (c.phone || '').includes(q)
    );
  });

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-700 w-full max-w-xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="p-4 bg-gradient-to-r from-sky-950/80 via-slate-900 to-indigo-950/80 border-b border-slate-800 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-sky-600/30 border border-sky-500/50 flex items-center justify-center text-sky-400 shrink-0">
              <Smartphone className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-white text-base flex items-center gap-2">
                <span>{language === 'bn' ? 'মোবাইল ফোনবুক ও কাস্টমার নির্বাচন' : 'Mobile Phonebook & Customer Picker'}</span>
              </h3>
              <p className="text-xs text-slate-400">
                {language === 'bn'
                  ? 'সরাসরি মোবাইল ফোনবুক, কন্টাক্ট ফাইল, ক্লিপবোর্ড বা টাইপ করে কাস্টমার যুক্ত করুন'
                  : 'Pick directly from device contacts, VCF file, clipboard, or type'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Notifications */}
        {errorMessage && (
          <div className="mx-4 mt-3 p-2.5 rounded-xl bg-rose-950/80 border border-rose-600 text-rose-300 text-xs font-semibold flex items-center gap-2">
            <X className="w-4 h-4 text-rose-400 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}
        {successMessage && (
          <div className="mx-4 mt-3 p-2.5 rounded-xl bg-emerald-950/80 border border-emerald-600 text-emerald-300 text-xs font-semibold flex items-center gap-2">
            <Check className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{successMessage}</span>
          </div>
        )}

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-800 bg-slate-950/60 px-2 pt-2 gap-1 overflow-x-auto">
          <button
            type="button"
            onClick={() => setActiveSubTab('device')}
            className={`px-3 py-2 rounded-t-xl text-xs font-bold transition flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
              activeSubTab === 'device'
                ? 'bg-slate-900 text-sky-400 border-t-2 border-sky-500'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Smartphone className="w-3.5 h-3.5" />
            <span>{language === 'bn' ? 'মোবাইলের ফোনবুক' : 'Mobile Phonebook'}</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSubTab('type')}
            className={`px-3 py-2 rounded-t-xl text-xs font-bold transition flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
              activeSubTab === 'type'
                ? 'bg-slate-900 text-emerald-400 border-t-2 border-emerald-500'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <User className="w-3.5 h-3.5" />
            <span>{language === 'bn' ? 'সরাসরি টাইপ করুন' : 'Direct Type'}</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSubTab('saved')}
            className={`px-3 py-2 rounded-t-xl text-xs font-bold transition flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
              activeSubTab === 'saved'
                ? 'bg-slate-900 text-purple-400 border-t-2 border-purple-500'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <BookUser className="w-3.5 h-3.5" />
            <span>{language === 'bn' ? 'সংরক্ষিত তালিকা' : 'Saved List'}</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSubTab('paste')}
            className={`px-3 py-2 rounded-t-xl text-xs font-bold transition flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
              activeSubTab === 'paste'
                ? 'bg-slate-900 text-amber-400 border-t-2 border-amber-500'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <ClipboardPaste className="w-3.5 h-3.5" />
            <span>{language === 'bn' ? 'পেস্ট' : 'Paste'}</span>
          </button>
        </div>

        {/* Tab Body */}
        <div className="p-4 flex-1 overflow-y-auto space-y-4">
          {/* TAB 1: DEVICE CONTACTS & OFFLINE GALLERY */}
          {activeSubTab === 'device' && (
            <div className="space-y-3">
              {/* Native Mobile Contact Selector */}
              <div className="p-4 rounded-xl bg-gradient-to-r from-sky-950/40 to-slate-950 border border-sky-500/30 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Smartphone className="w-5 h-5 text-sky-400" />
                    <h4 className="font-bold text-sm text-white">
                      {language === 'bn' ? 'সরাসরি মোবাইলের কন্টাক্ট ডায়ালগ' : 'Device Native Contact Picker'}
                    </h4>
                  </div>
                  <span className="text-[10px] px-2 py-0.5 rounded bg-sky-900/60 text-sky-300 font-medium">
                    Android / Chrome
                  </span>
                </div>
                <p className="text-xs text-slate-400">
                  {language === 'bn'
                    ? 'নিচের বাটনে চাপ দিলে সরাসরি আপনার মোবাইলের সেভ করা ফোনবুক ওপেন হবে।'
                    : 'Tap below to launch your phone’s native contacts dialog.'}
                </p>
                <button
                  type="button"
                  onClick={handleNativeContactPick}
                  disabled={isPicking}
                  className="w-full py-2.5 px-4 bg-sky-600 hover:bg-sky-500 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 shadow-lg active:scale-95 cursor-pointer"
                >
                  <Smartphone className="w-4 h-4" />
                  <span>{isPicking ? (language === 'bn' ? 'খুলছে...' : 'Opening...') : (language === 'bn' ? 'মোবাইলের ফোনবুক কন্টাক্ট সিলেক্ট করুন' : 'Select from Mobile Contacts')}</span>
                </button>
              </div>

              {/* Offline VCF / Contacts Gallery Picker */}
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Upload className="w-5 h-5 text-emerald-400" />
                    <h4 className="font-bold text-sm text-white">
                      {language === 'bn' ? 'মোবাইলের কন্টাক্ট ফাইল (.vcf) সিলেক্ট করুন' : 'Device Contacts File (.vcf / Offline)'}
                    </h4>
                  </div>
                  <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-950 text-emerald-400 border border-emerald-800">
                    ১০০% অফলাইন
                  </span>
                </div>
                <p className="text-xs text-slate-400">
                  {language === 'bn'
                    ? 'মোবাইলের ফোনবুক থেকে এক্সপোর্ট করা .vcf ফাইল সিলেক্ট করে যেকোনো কন্টাক্ট বা পুরো ফোনবুক সরাসরি যুক্ত করুন।'
                    : 'Select exported .vcf contacts file from device storage. Works offline without browser restrictions.'}
                </p>
                <button
                  type="button"
                  onClick={handlePickVcfFile}
                  className="w-full py-2.5 px-4 bg-emerald-700/80 hover:bg-emerald-600 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 shadow active:scale-95 cursor-pointer"
                >
                  <Upload className="w-4 h-4" />
                  <span>{language === 'bn' ? 'ডিভাইস ফাইল গ্যালারি থেকে .vcf সিলেক্ট করুন' : 'Choose .vcf File from Phone'}</span>
                </button>
              </div>

              {/* Open in New Tab option (for iframe bypass) */}
              {isIframe && (
                <div className="p-3.5 rounded-xl bg-amber-950/30 border border-amber-500/30 flex items-center justify-between gap-3">
                  <div className="flex items-start gap-2.5 min-w-0">
                    <Info className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                    <div className="text-xs">
                      <p className="font-bold text-amber-300">
                        {language === 'bn' ? 'ব্রাউজারে পূর্ণ অ্যাক্সেস পেতে চান?' : 'Want full browser device access?'}
                      </p>
                      <p className="text-slate-400 text-[11px]">
                        {language === 'bn'
                          ? 'নতুন ট্যাবে খুললে সরাসরি মোবাইলের ফোনবুক সম্পূর্ণ আনরেস্ট্রিক্টেড কাজ করবে।'
                          : 'Opening in a new tab provides 100% unrestricted native mobile contacts access.'}
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => window.open(window.location.href, '_blank')}
                    className="px-3 py-1.5 bg-amber-600 hover:bg-amber-500 text-white rounded-lg text-xs font-bold flex items-center gap-1 shrink-0 cursor-pointer"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span>{language === 'bn' ? 'নতুন ট্যাবে খুলুন' : 'Open Tab'}</span>
                  </button>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: DIRECT TYPE CUSTOMER NAME + SHOP + PHONE */}
          {activeSubTab === 'type' && (
            <div className="space-y-3.5">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                  <Store className="w-3.5 h-3.5 text-emerald-400" />
                  <span>{language === 'bn' ? 'প্রতিষ্ঠানের নাম / দোকান (ঐচ্ছিক)' : 'Shop / Organization Name'}</span>
                </label>
                <input
                  type="text"
                  placeholder={language === 'bn' ? 'যেমন: মেসার্স ভাই ভাই টেলিকম' : 'e.g. Bhai Bhai Telecom'}
                  value={manualShopName}
                  onChange={(e) => setManualShopName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-sky-400" />
                  <span>{language === 'bn' ? 'কাস্টমারের নাম (প্রোপ্রাইটার / ব্যক্তি)' : 'Customer Name'}</span>
                </label>
                <input
                  type="text"
                  placeholder={language === 'bn' ? 'যেমন: মোঃ রহিম উদ্দিন' : 'e.g. Md. Rahim Uddin'}
                  value={manualCustomerName}
                  onChange={(e) => setManualCustomerName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-sky-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                  <Phone className="w-3.5 h-3.5 text-amber-400" />
                  <span>{language === 'bn' ? 'মোবাইল নম্বর (১১ ডিজিট)' : 'Mobile Phone Number'}</span>
                </label>
                <input
                  type="tel"
                  placeholder="017XXXXXXXX"
                  value={manualPhone}
                  onChange={(e) => setManualPhone(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs font-mono text-white placeholder:text-slate-500 focus:outline-none focus:border-amber-500"
                />
              </div>

              <button
                type="button"
                onClick={handleSaveManualCustomer}
                className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 shadow-lg active:scale-95 cursor-pointer mt-2"
              >
                <Check className="w-4 h-4" />
                <span>{language === 'bn' ? 'কাস্টমার নিশ্চিত ও মেমোতে যুক্ত করুন' : 'Confirm & Add to Memo'}</span>
              </button>
            </div>
          )}

          {/* TAB 3: SEARCH SAVED CONTACTS & RETAILERS */}
          {activeSubTab === 'saved' && (
            <div className="space-y-3">
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder={language === 'bn' ? 'নাম, দোকান বা মোবাইল নম্বর দিয়ে খুঁজুন...' : 'Search by name, shop or phone...'}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-purple-500"
                />
              </div>

              <div className="max-h-60 overflow-y-auto space-y-1.5 pr-1">
                {filteredSavedContacts.length === 0 ? (
                  <div className="py-8 text-center text-slate-500 text-xs">
                    {language === 'bn' ? 'কোনো কন্টাক্ট পাওয়া যায়নি' : 'No contacts found.'}
                  </div>
                ) : (
                  filteredSavedContacts.map((c, i) => (
                    <div
                      key={c.id || i}
                      onClick={() => {
                        onSelectContact({
                          name: c.name,
                          organization: c.organization || '',
                          phone: c.phone,
                          address: c.address || '',
                        });
                        onClose();
                      }}
                      className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 hover:border-purple-500/50 hover:bg-slate-900 transition flex items-center justify-between gap-3 cursor-pointer group"
                    >
                      <div className="min-w-0">
                        <h5 className="font-bold text-xs text-white group-hover:text-purple-300 truncate">
                          {c.organization || c.name}
                        </h5>
                        <div className="flex items-center gap-2 text-[11px] text-slate-400">
                          {c.name && c.name !== c.organization && (
                            <span className="truncate">👤 {c.name}</span>
                          )}
                          <span className="font-mono text-emerald-400 font-semibold">{c.phone}</span>
                        </div>
                      </div>
                      <button
                        type="button"
                        className="px-2 py-1 bg-purple-950/60 text-purple-300 border border-purple-800/40 rounded-lg text-[11px] font-bold group-hover:bg-purple-600 group-hover:text-white transition"
                      >
                        {language === 'bn' ? 'সিলেক্ট' : 'Select'}
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* TAB 4: QUICK PASTE */}
          {activeSubTab === 'paste' && (
            <div className="space-y-3">
              <p className="text-xs text-slate-400">
                {language === 'bn'
                  ? 'হোয়াটসঅ্যাপ, মেসেজ বা ফেসবুক থেকে কপি করা টেক্সট বা ফোন নম্বর এখানে পেস্ট করুন।'
                  : 'Paste customer text or phone number copied from WhatsApp, SMS or messages.'}
              </p>
              <textarea
                rows={3}
                placeholder={language === 'bn' ? 'এখানে টেক্সট বা নম্বর পেস্ট করুন...' : 'Paste text containing phone number here...'}
                value={pasteText}
                onChange={(e) => setPasteText(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-amber-500"
              />
              <button
                type="button"
                onClick={handlePasteClipboard}
                className="w-full py-2.5 px-4 bg-amber-600 hover:bg-amber-500 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 shadow active:scale-95 cursor-pointer"
              >
                <ClipboardPaste className="w-4 h-4" />
                <span>{language === 'bn' ? 'নম্বর এক্সট্র্যাক্ট ও নির্বাচন করুন' : 'Extract Phone & Select'}</span>
              </button>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-3 bg-slate-950 border-t border-slate-800 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg text-xs font-medium transition cursor-pointer"
          >
            {language === 'bn' ? 'বাতিল' : 'Cancel'}
          </button>
        </div>
      </div>
    </div>
  );
};
