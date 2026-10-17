import React, { useState, useRef } from 'react';
import { useWholesale } from '../context/WholesaleContext';
import { PhoneContact } from '../types';
import { translations } from '../utils/translations';
import {
  BookUser,
  Search,
  UserPlus,
  Phone,
  Store,
  MapPin,
  Check,
  X,
  Smartphone,
  Plus,
  Sparkles,
  Trash2,
  Edit2,
  AlertTriangle,
  FileText,
  ClipboardPaste,
  ExternalLink,
  AlertCircle,
  Save,
  CheckCircle2,
  Info
} from 'lucide-react';
import {
  sanitizePhoneNumber,
  isContactPickerSupported,
  isRunningInIframe,
  pickContactFromDevice,
  parseVCardContent,
  parsePastedContactText,
} from '../utils/contactPickerHelper';

interface PhonebookPickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectContact?: (contact: PhoneContact) => void;
}

export const PhonebookPickerModal: React.FC<PhonebookPickerModalProps> = ({
  isOpen,
  onClose,
  onSelectContact,
}) => {
  const {
    language,
    phoneContacts,
    addPhoneContact,
    deletePhoneContact,
    updatePhoneContact,
    addRetailerFromPhonebook,
    retailers,
  } = useWholesale();

  const t = translations[language];

  // Active Main Tab inside Modal: 'LIST' | 'ADD_NEW' | 'MOBILE_IMPORT'
  const [activeModalTab, setActiveModalTab] = useState<'LIST' | 'ADD_NEW' | 'MOBILE_IMPORT'>('LIST');

  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedContact, setSelectedContact] = useState<PhoneContact | null>(null);
  const [shopNameInput, setShopNameInput] = useState<string>('');
  const [routeInput, setRouteInput] = useState<string>('Route A - Dhanmondi');
  const [creditLimitInput, setCreditLimitInput] = useState<number>(30000);
  const [isRegistering, setIsRegistering] = useState<boolean>(false);
  const [pasteInputText, setPasteInputText] = useState<string>('');
  const [notification, setNotification] = useState<{ text: string; type: 'success' | 'error' | 'info' } | null>(null);

  // Editing contact state
  const [editingContact, setEditingContact] = useState<PhoneContact | null>(null);
  const [deletingContact, setDeletingContact] = useState<PhoneContact | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // New/Edit Contact form states
  const [contactForm, setContactForm] = useState({
    name: '',
    phone: '',
    organization: '',
    address: '',
  });

  if (!isOpen) return null;

  const isNativeSupported = isContactPickerSupported();
  const isIframe = isRunningInIframe();

  const showToast = (text: string, type: 'success' | 'error' | 'info' = 'info') => {
    setNotification({ text, type });
    setTimeout(() => {
      setNotification(null);
    }, 4000);
  };

  // Filter contacts
  const filteredContacts = phoneContacts.filter(
    (c) =>
      c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.phone.includes(searchTerm) ||
      (c.organization && c.organization.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  // Quick seed contacts if empty
  const handleSeedSampleContacts = () => {
    const samples = [
      { name: 'করিম উল্লাহ', phone: '01711223344', organization: 'করিম জেনারেল স্টোর', address: 'মিরপুর ১০, ঢাকা' },
      { name: 'রহিম সওদাগর', phone: '01819876543', organization: 'রহিম অ্যান্ড ব্রাদার্স', address: 'চকবাজার, ঢাকা' },
      { name: 'হাজী মোশাররফ হোসেন', phone: '01912345678', organization: 'মা ভ্যারাইটিজ', address: 'উত্তরা সেক্টর ৭, ঢাকা' },
    ];
    samples.forEach(s => {
      addPhoneContact({
        name: s.name,
        phone: s.phone,
        organization: s.organization,
        address: s.address,
      });
    });
    showToast(
      language === 'bn' ? '৩টি নমুনা কন্টাক্ট ফোনবুকে যুক্ত হয়েছে!' : 'Added 3 sample contacts to phonebook!',
      'success'
    );
  };

  const handleNativeContactPick = async () => {
    const res = await pickContactFromDevice(false);
    if (res.success && res.contacts && res.contacts.length > 0) {
      const c = res.contacts[0];
      const imported: PhoneContact = {
        id: `con_${Date.now()}`,
        name: c.name || 'Phone Contact',
        phone: c.phone,
        address: c.address || 'Dhaka',
        organization: c.organization || 'Device Contact',
      };
      addPhoneContact(imported);
      
      // Auto-create/link retailer
      addRetailerFromPhonebook(
        imported,
        imported.organization || `${imported.name} Store`,
        'Route A - Dhanmondi',
        30000
      );

      if (onSelectContact) {
        onSelectContact(imported);
      }

      showToast(
        language === 'bn'
          ? `মোবাইল থেকে "${imported.name}" (${imported.phone}) ফোনবুকে ও কাস্টমার হিসেবে যুক্ত হয়েছে!`
          : `Added "${imported.name}" (${imported.phone}) to Phonebook & Retailers!`,
        'success'
      );
      onClose();
    } else if (res.isIframeBlocked) {
      showToast(
        language === 'bn'
          ? 'ব্রাউজার সিকিউরিটির জন্য নতুন ট্যাবে খুলুন অথবা সরাসরি টাইপ/পেস্ট করুন।'
          : 'Security policy blocked contact picker. Open in new tab or paste number.',
        'error'
      );
    } else if (!isNativeSupported) {
      showToast(
        language === 'bn'
          ? 'এই ডিভাইসে কন্টাক্ট ডায়ালগ ব্রাউজার সাপোর্ট করছে না। নিচে সরাসরি লিখুন বা পেস্ট করুন।'
          : 'Direct Contact API not available. Type name & phone directly or paste.',
        'info'
      );
      setActiveModalTab('ADD_NEW');
    } else if (res.error && !res.error.includes('No contact selected') && !res.error.includes('cancel')) {
      showToast(res.error, 'error');
    }
  };

  const handlePickForContactForm = async () => {
    const res = await pickContactFromDevice(false);
    if (res.success && res.contacts && res.contacts.length > 0) {
      const c = res.contacts[0];
      setContactForm((prev) => ({
        ...prev,
        phone: c.phone,
        name: prev.name.trim() ? prev.name : (c.name || ''),
        organization: prev.organization.trim() ? prev.organization : (c.organization || `${c.name || 'গ্রাহক'} স্টোর`),
        address: prev.address.trim() ? prev.address : (c.address || ''),
      }));
      showToast(
        language === 'bn'
          ? `মোবাইল থেকে "${c.name}" (${c.phone}) সফলভাবে ইনপুট বক্সে এসেছে!`
          : `Selected "${c.name}" (${c.phone}) from mobile!`,
        'success'
      );
    } else if (res.isIframeBlocked) {
      showToast(
        language === 'bn'
          ? 'ব্রাউজার সিকিউরিটির জন্য নতুন ট্যাবে খুলুন অথবা সরাসরি টাইপ করুন।'
          : 'Open in new tab or type phone number directly.',
        'error'
      );
    } else if (!isNativeSupported) {
      showToast(
        language === 'bn'
          ? 'এই ডিভাইসে সরাসরি কন্টাক্ট ব্রাউজার সাপোর্ট করছে না। নম্বর সরাসরি টাইপ করুন।'
          : 'Direct Contact API not available on this browser. Type number directly.',
        'info'
      );
    } else if (res.error && !res.error.includes('cancel') && !res.error.includes('No contact')) {
      showToast(res.error, 'error');
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      const text = evt.target?.result as string;
      if (!text) return;

      const parsedContacts = parseVCardContent(text);
      if (parsedContacts.length > 0) {
        parsedContacts.forEach((c) => {
          addPhoneContact({
            name: c.name,
            phone: c.phone,
            address: c.address,
            organization: c.organization || 'VCF Contact',
          });
        });

        showToast(
          language === 'bn'
            ? `${parsedContacts.length} টি কন্টাক্ট VCF ফাইল থেকে ফোনবুকে সংরক্ষিত হয়েছে!`
            : `Imported ${parsedContacts.length} contacts to Phonebook!`,
          'success'
        );
        setActiveModalTab('LIST');
      } else {
        showToast(
          language === 'bn' ? 'ফাইলে কোন বৈধ কন্টাক্ট পাওয়া যায়নি' : 'No valid contacts found in file',
          'error'
        );
      }
    };
    reader.readAsText(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handlePasteExtract = () => {
    const parsed = parsePastedContactText(pasteInputText);
    if (!parsed || !parsed.phone) {
      showToast(
        language === 'bn' ? 'সঠিক ফোন নম্বর খুঁজে পাওয়া যায়নি' : 'No valid phone number found',
        'error'
      );
      return;
    }

    const newContact: PhoneContact = {
      id: `con_${Date.now()}`,
      name: parsed.name || 'Pasted Contact',
      phone: parsed.phone,
      organization: 'Direct Paste',
    };

    addPhoneContact(newContact);
    setPasteInputText('');

    showToast(
      language === 'bn' ? `ফোন নম্বর সংরক্ষিত হয়েছে: ${parsed.phone}` : `Saved phone: ${parsed.phone}`,
      'success'
    );
    setActiveModalTab('LIST');
  };

  // Instant 1-Click Use Contact for Order/Memo
  const handleQuickUseContact = (contact: PhoneContact) => {
    // If not already in retailers, auto add as retailer
    const cleanP = sanitizePhoneNumber(contact.phone);
    const existingRetailer = retailers.find((r) => sanitizePhoneNumber(r.phone) === cleanP);

    if (!existingRetailer) {
      addRetailerFromPhonebook(
        contact,
        contact.organization || `${contact.name} Store`,
        'Route A - Dhanmondi',
        30000
      );
    }

    if (onSelectContact) {
      onSelectContact(contact);
    }

    showToast(
      language === 'bn' ? `"${contact.name}" মেমোর জন্য নির্বাচিত হয়েছে!` : `Selected "${contact.name}"!`,
      'success'
    );
    onClose();
  };

  const handleOpenEdit = (c: PhoneContact) => {
    setEditingContact(c);
    setContactForm({
      name: c.name,
      phone: c.phone,
      organization: c.organization || '',
      address: c.address || '',
    });
    setActiveModalTab('ADD_NEW');
  };

  const handleSaveContact = (e: React.FormEvent) => {
    e.preventDefault();
    if (!contactForm.name || !contactForm.phone) {
      showToast(
        language === 'bn' ? 'দয়া করে নাম ও ফোন নম্বর লিখুন' : 'Please enter name and phone number',
        'error'
      );
      return;
    }

    const cleanPhone = sanitizePhoneNumber(contactForm.phone);

    if (editingContact) {
      updatePhoneContact({
        ...editingContact,
        ...contactForm,
        phone: cleanPhone,
      });
      setEditingContact(null);
      showToast(
        language === 'bn' ? 'কন্টাক্ট সফলভাবে আপডেট হয়েছে!' : 'Contact updated successfully!',
        'success'
      );
    } else {
      addPhoneContact({
        ...contactForm,
        phone: cleanPhone,
      });
      showToast(
        language === 'bn' ? 'নতুন কন্টাক্ট ফোনবুকে সেভ হয়েছে!' : 'New contact saved to phonebook!',
        'success'
      );
    }

    setContactForm({ name: '', phone: '', organization: '', address: '' });
    setActiveModalTab('LIST');
  };

  const isAlreadyRetailer = (phone: string) => {
    const cleanP = sanitizePhoneNumber(phone);
    return retailers.some((r) => sanitizePhoneNumber(r.phone) === cleanP);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-lg max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        
        {/* Header */}
        <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-950">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-sky-500 to-emerald-500 flex items-center justify-center shadow-lg shadow-sky-900/30 text-white">
              <BookUser className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-slate-100 text-sm sm:text-base flex items-center gap-2">
                <span>{language === 'bn' ? 'ফোনবুক ও কন্টাক্ট ডিরেক্টরি' : 'Phonebook & Contacts'}</span>
                <span className="px-2 py-0.5 rounded-full bg-sky-500/20 text-sky-300 text-[10px] font-bold">
                  {phoneContacts.length} {language === 'bn' ? 'টি সংরক্ষিত' : 'saved'}
                </span>
              </h3>
              <p className="text-[11px] text-slate-400">
                {language === 'bn' ? 'নাম্বার টাইপ করুন, সংরক্ষণ করুন অথবা তালিকা থেকে মেমোতে নিন' : 'Add contacts, manage directory or use in sales invoice'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 3 Main Navigation Tabs */}
        <div className="grid grid-cols-3 border-b border-slate-800 bg-slate-950 text-xs font-bold">
          <button
            type="button"
            onClick={() => {
              setEditingContact(null);
              setActiveModalTab('LIST');
            }}
            className={`py-3 px-2 flex items-center justify-center gap-1.5 border-b-2 transition cursor-pointer ${
              activeModalTab === 'LIST'
                ? 'border-sky-500 text-sky-400 bg-sky-500/10'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <BookUser className="w-3.5 h-3.5" />
            <span>{language === 'bn' ? 'ফোনবুক লিস্ট' : 'Book List'}</span>
            <span className="px-1.5 py-0.2 rounded-full bg-slate-800 text-[10px]">
              {phoneContacts.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => {
              if (!editingContact) {
                setContactForm({ name: '', phone: '', organization: '', address: '' });
              }
              setActiveModalTab('ADD_NEW');
            }}
            className={`py-3 px-2 flex items-center justify-center gap-1.5 border-b-2 transition cursor-pointer ${
              activeModalTab === 'ADD_NEW'
                ? 'border-emerald-500 text-emerald-400 bg-emerald-500/10'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Plus className="w-3.5 h-3.5 text-emerald-400" />
            <span>
              {editingContact 
                ? (language === 'bn' ? 'এডিট করুন' : 'Edit Contact') 
                : (language === 'bn' ? '➕ নতুন সেভ করুন' : '➕ Add Contact')}
            </span>
          </button>

          <button
            type="button"
            onClick={() => {
              setEditingContact(null);
              setActiveModalTab('MOBILE_IMPORT');
            }}
            className={`py-3 px-2 flex items-center justify-center gap-1.5 border-b-2 transition cursor-pointer ${
              activeModalTab === 'MOBILE_IMPORT'
                ? 'border-indigo-500 text-indigo-400 bg-indigo-500/10'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Smartphone className="w-3.5 h-3.5 text-indigo-400" />
            <span>{language === 'bn' ? 'মোবাইল / VCF' : 'Mobile / VCF'}</span>
          </button>
        </div>

        {/* Hidden VCF File Input */}
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileUpload}
          accept=".vcf,.vcard,text/vcard,text/x-vcard"
          className="hidden"
        />

        {/* Notification Toast Alert */}
        {notification && (
          <div
            className={`px-4 py-2 text-xs flex items-center gap-2 ${
              notification.type === 'success'
                ? 'bg-emerald-950 border-b border-emerald-500/40 text-emerald-300'
                : notification.type === 'error'
                ? 'bg-rose-950 border-b border-rose-500/40 text-rose-300'
                : 'bg-sky-950 border-b border-sky-500/40 text-sky-300'
            }`}
          >
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span className="flex-1 font-semibold">{notification.text}</span>
          </div>
        )}

        {/* Modal Body */}
        <div className="p-4 overflow-y-auto space-y-3.5 flex-1">
          
          {/* TAB 1: PHONEBOOK LIST VIEW */}
          {activeModalTab === 'LIST' && (
            <div className="space-y-3">
              {/* Direct Quick Actions: Mobile Device Contacts, Clipboard, VCF */}
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={handleNativeContactPick}
                  className="p-2.5 rounded-xl bg-sky-600/20 hover:bg-sky-600/35 text-sky-300 hover:text-white border border-sky-500/40 text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-sm active:scale-95 cursor-pointer"
                  title="মোবাইলের নিজস্ব কন্টাক্ট তালিকা খুলুন"
                >
                  <Smartphone className="w-4 h-4 text-sky-400 shrink-0" />
                  <span className="truncate">{language === 'bn' ? '📱 মোবাইল কন্টাক্ট' : '📱 Mobile'}</span>
                </button>

                <button
                  type="button"
                  onClick={async () => {
                    try {
                      if (navigator.clipboard && navigator.clipboard.readText) {
                        const text = await navigator.clipboard.readText();
                        const cleaned = sanitizePhoneNumber(text);
                        if (cleaned && cleaned.length >= 10) {
                          setSearchTerm(cleaned);
                          showToast(
                            language === 'bn' ? `ক্লিপবোর্ড থেকে নম্বর নেওয়া হয়েছে: ${cleaned}` : `Pasted: ${cleaned}`,
                            'success'
                          );
                          return;
                        }
                      }
                      showToast(
                        language === 'bn' ? 'ক্লিপবোর্ডে কোনো মোবাইল নম্বর পাওয়া যায়নি।' : 'No phone number found in clipboard.',
                        'info'
                      );
                    } catch {
                      showToast(
                        language === 'bn' ? 'ক্লিপবোর্ড অ্যাক্সেস করতে অনুমতি পাওয়া যায়নি।' : 'Clipboard access denied.',
                        'error'
                      );
                    }
                  }}
                  className="p-2.5 rounded-xl bg-amber-600/20 hover:bg-amber-600/35 text-amber-300 hover:text-white border border-amber-500/40 text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-sm active:scale-95 cursor-pointer"
                  title="ক্লিপবোর্ড থেকে পেস্ট করুন"
                >
                  <ClipboardPaste className="w-4 h-4 text-amber-400 shrink-0" />
                  <span className="truncate">{language === 'bn' ? '📋 পেস্ট করুন' : '📋 Paste'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="p-2.5 rounded-xl bg-indigo-600/20 hover:bg-indigo-600/35 text-indigo-300 hover:text-white border border-indigo-500/40 text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-sm active:scale-95 cursor-pointer"
                  title="VCF কন্টাক্ট ফাইল ইমপোর্ট করুন"
                >
                  <Smartphone className="w-4 h-4 text-indigo-400 shrink-0" />
                  <span className="truncate">{language === 'bn' ? '📁 VCF ফাইল' : '📁 VCF File'}</span>
                </button>
              </div>

              {/* Search & Quick Add Bar */}
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    placeholder={language === 'bn' ? 'নাম, ফোন নম্বর বা দোকান খুঁজুন...' : 'Search by name, phone or shop...'}
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-sky-500 transition"
                  />
                  {searchTerm && (
                    <button
                      type="button"
                      onClick={() => setSearchTerm('')}
                      className="absolute right-2.5 top-2.5 text-slate-400 hover:text-white"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setEditingContact(null);
                    setContactForm({ name: '', phone: '', organization: '', address: '' });
                    setActiveModalTab('ADD_NEW');
                  }}
                  className="px-3 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition flex items-center gap-1 shrink-0 shadow cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>{language === 'bn' ? 'নতুন নম্বর' : 'Add New'}</span>
                </button>
              </div>

              {/* Contacts List Items */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-[11px] font-semibold text-slate-400 px-1">
                  <span>
                    {filteredContacts.length} {language === 'bn' ? 'টি কন্টাক্ট পাওয়া গেছে' : 'contacts found'}
                  </span>
                  <span className="text-[10px] text-emerald-400 font-bold">
                    {language === 'bn' ? '১-ক্লিকে মেমোতে ব্যবহার করুন' : '1-Click use in Invoice'}
                  </span>
                </div>

                <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                  {filteredContacts.map((contact) => {
                    const registered = isAlreadyRetailer(contact.phone);
                    return (
                      <div
                        key={contact.id}
                        className="p-3 rounded-xl bg-slate-950/70 border border-slate-800 hover:border-sky-500/50 hover:bg-slate-800/40 transition flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 group"
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-bold text-xs text-white group-hover:text-sky-300 transition">
                              {contact.name}
                            </span>
                            {contact.organization && (
                              <span className="text-[10px] bg-slate-800 text-slate-300 px-2 py-0.5 rounded-md font-medium border border-slate-700 truncate max-w-[150px]">
                                {contact.organization}
                              </span>
                            )}
                            {registered ? (
                              <span className="text-[9px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-1.5 py-0.5 rounded-full font-bold flex items-center gap-0.5">
                                <Check className="w-2.5 h-2.5" /> Retailer
                              </span>
                            ) : null}
                          </div>

                          <div className="flex items-center gap-3 mt-1 flex-wrap">
                            <span className="text-xs text-emerald-400 font-mono font-bold flex items-center gap-1">
                              <Phone className="w-3 h-3 text-emerald-500" />
                              {contact.phone}
                            </span>
                            {contact.address && (
                              <span className="text-[10px] text-slate-400 flex items-center gap-0.5 truncate max-w-[160px]">
                                <MapPin className="w-2.5 h-2.5 text-slate-500" />
                                {contact.address}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Action Buttons Strip */}
                        <div className="flex items-center gap-1.5 self-end sm:self-center shrink-0">
                          {/* 1-Click Select / Use in Memo */}
                          <button
                            type="button"
                            onClick={() => handleQuickUseContact(contact)}
                            className="px-3 py-1.5 bg-gradient-to-r from-sky-600 to-emerald-600 hover:opacity-95 text-white rounded-lg text-xs font-bold transition flex items-center gap-1 shadow cursor-pointer active:scale-95"
                            title="Use this contact for current bill/invoice"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>{language === 'bn' ? 'মেমোতে নিন' : 'Use in Memo'}</span>
                          </button>

                          {/* Edit Button */}
                          <button
                            type="button"
                            onClick={() => handleOpenEdit(contact)}
                            className="p-1.5 text-slate-400 hover:text-sky-400 hover:bg-slate-800 rounded-lg transition cursor-pointer"
                            title="Edit Contact"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>

                          {/* Delete Button */}
                          <button
                            type="button"
                            onClick={() => setDeletingContact(contact)}
                            className="p-1.5 text-slate-500 hover:text-rose-400 hover:bg-slate-800 rounded-lg transition cursor-pointer"
                            title="Delete Contact"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })}

                  {filteredContacts.length === 0 && (
                    <div className="text-center py-8 text-slate-400 text-xs bg-slate-950/40 rounded-2xl border border-dashed border-slate-800 space-y-3">
                      <div className="w-10 h-10 rounded-full bg-slate-800 mx-auto flex items-center justify-center text-slate-400">
                        <BookUser className="w-5 h-5" />
                      </div>
                      <p className="font-semibold text-slate-300">
                        {language === 'bn' ? 'ফোনবুকে কোন নম্বর পাওয়া যায়নি' : 'No contacts in phonebook'}
                      </p>
                      <div className="flex flex-wrap items-center justify-center gap-2">
                        <button
                          type="button"
                          onClick={() => setActiveModalTab('ADD_NEW')}
                          className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold flex items-center gap-1 shadow"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>{language === 'bn' ? 'নতুন নম্বর যোগ করুন' : 'Add New Contact'}</span>
                        </button>

                        <button
                          type="button"
                          onClick={handleSeedSampleContacts}
                          className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold flex items-center gap-1 border border-slate-700"
                        >
                          <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                          <span>{language === 'bn' ? '৩টি ডেমো কন্টাক্ট লোড করুন' : 'Load 3 Samples'}</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: ADD / EDIT CONTACT FORM (Always open & visible when active) */}
          {activeModalTab === 'ADD_NEW' && (
            <div className="p-4 rounded-2xl bg-slate-950 border border-emerald-500/40 shadow-inner space-y-3 animate-in fade-in">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <div className="flex items-center gap-2 text-emerald-400 font-bold text-xs">
                  <UserPlus className="w-4 h-4" />
                  <span>
                    {editingContact
                      ? (language === 'bn' ? 'কন্টাক্ট ও ফোন নম্বর পরিবর্তন করুন' : 'Edit Contact Details')
                      : (language === 'bn' ? 'ফোনবুকে নতুন কন্টাক্ট যোগ করুন' : 'Add New Contact to Phonebook')}
                  </span>
                </div>
                {editingContact && (
                  <button
                    type="button"
                    onClick={() => {
                      setEditingContact(null);
                      setContactForm({ name: '', phone: '', organization: '', address: '' });
                      setActiveModalTab('LIST');
                    }}
                    className="text-slate-400 hover:text-white text-xs"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>

              <form onSubmit={handleSaveContact} className="space-y-3 text-xs">
                <div>
                  <label className="text-slate-300 block font-bold mb-1">
                    {language === 'bn' ? 'মালিক বা কন্টাক্টের নাম *' : 'Contact / Owner Name *'}
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="যেমন: হাজী আবুল কাশেম"
                    value={contactForm.name}
                    onChange={(e) => setContactForm({ ...contactForm, name: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 font-semibold"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-slate-300 font-bold flex items-center gap-1.5 text-xs">
                      <Phone className="w-3.5 h-3.5 text-sky-400" />
                      <span>{language === 'bn' ? 'মোবাইল / ফোন নম্বর *' : 'Mobile / Phone Number *'}</span>
                    </label>
                    <button
                      type="button"
                      onClick={handlePickForContactForm}
                      className="px-2.5 py-1 rounded-lg bg-sky-500/20 hover:bg-sky-500/35 text-sky-300 border border-sky-500/40 text-[11px] font-bold transition flex items-center gap-1.5 active:scale-95 cursor-pointer shadow-sm"
                      title={language === 'bn' ? 'মোবাইলের কন্টাক্ট লিস্ট থেকে নম্বর আনুন' : 'Pick from mobile phone contacts'}
                    >
                      <Smartphone className="w-3.5 h-3.5 text-sky-400" />
                      <span>{language === 'bn' ? '📱 মোবাইল কন্টাক্ট থেকে নিন' : '📱 Pick from Mobile'}</span>
                    </button>
                  </div>
                  
                  <div className="relative flex items-center">
                    <input
                      type="tel"
                      required
                      placeholder="017XXXXXXXX"
                      value={contactForm.phone}
                      onChange={(e) => setContactForm({ ...contactForm, phone: sanitizePhoneNumber(e.target.value) })}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl pl-3.5 pr-28 py-2.5 text-white font-mono font-bold text-sm placeholder-slate-500 focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500 transition shadow-inner"
                    />
                    <div className="absolute right-1.5 top-1/2 -translate-y-1/2 flex items-center gap-1">
                      <button
                        type="button"
                        onClick={handlePickForContactForm}
                        className="px-2 py-1 bg-sky-600/25 hover:bg-sky-600/40 text-sky-300 border border-sky-500/40 rounded-lg text-[10px] font-bold transition flex items-center gap-1 cursor-pointer active:scale-95"
                        title={language === 'bn' ? 'মোবাইল কন্টাক্ট তালিকা' : 'Mobile contacts'}
                      >
                        <Smartphone className="w-3 h-3 text-sky-400" />
                        <span>{language === 'bn' ? 'মোবাইল' : 'Device'}</span>
                      </button>
                    </div>
                  </div>
                  <span className="text-[10px] text-slate-400 mt-1 block">
                    {language === 'bn'
                      ? '💡 সরাসরি টাইপ করতে পারেন (ইংরেজি বা বাংলা সংখ্যা) অথবা "📱 মোবাইল" বাটনে চাপ দিয়ে ফোনবুক থেকে সিলেক্ট করতে পারেন।'
                      : '💡 Type number directly or click "📱 Mobile" to select from phonebook.'}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <div>
                    <label className="text-slate-300 block font-bold mb-1">
                      {language === 'bn' ? 'দোকান / প্রতিষ্ঠানের নাম' : 'Shop / Organization Name'}
                    </label>
                    <input
                      type="text"
                      placeholder="যেমন: কাশেম জেনারেল স্টোর"
                      value={contactForm.organization}
                      onChange={(e) => setContactForm({ ...contactForm, organization: e.target.value })}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                    />
                  </div>

                  <div>
                    <label className="text-slate-300 block font-bold mb-1">
                      {language === 'bn' ? 'ঠিকানা / এলাকা' : 'Address / Route'}
                    </label>
                    <input
                      type="text"
                      placeholder="যেমন: মিরপুর ১০, ঢাকা"
                      value={contactForm.address}
                      onChange={(e) => setContactForm({ ...contactForm, address: e.target.value })}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                </div>

                <div className="flex gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setEditingContact(null);
                      setContactForm({ name: '', phone: '', organization: '', address: '' });
                      setActiveModalTab('LIST');
                    }}
                    className="flex-1 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-xl transition cursor-pointer"
                  >
                    {language === 'bn' ? 'বাতিল' : 'Cancel'}
                  </button>

                  <button
                    type="submit"
                    className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl transition flex items-center justify-center gap-1.5 shadow-lg shadow-emerald-900/40 cursor-pointer"
                  >
                    <Save className="w-4 h-4" />
                    <span>{language === 'bn' ? '💾 ফোনবুকে সেভ করুন' : 'Save to Phonebook'}</span>
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* TAB 3: MOBILE & BACKUP IMPORT OPTIONS */}
          {activeModalTab === 'MOBILE_IMPORT' && (
            <div className="space-y-3 text-xs animate-in fade-in">
              {/* Option 1: Native Device Contacts API */}
              <div className="p-3.5 rounded-2xl bg-slate-950 border border-sky-500/30 space-y-2">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-xl bg-sky-500/20 text-sky-400">
                    <Smartphone className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="font-bold text-white text-xs">
                      {language === 'bn' ? '📱 মোবাইলের Contact ডায়ালগ' : 'Mobile Device Contacts'}
                    </h4>
                    <p className="text-[10px] text-slate-400">
                      {language === 'bn'
                        ? 'Android Chrome এ মোবাইলের Contact Selector খুলে সরাসরি নম্বর আনুন'
                        : 'Open Android native contact selector to pick numbers directly'}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleNativeContactPick}
                  className="w-full py-2.5 px-3 bg-gradient-to-r from-sky-600 via-indigo-600 to-emerald-600 hover:opacity-95 text-white font-bold rounded-xl transition shadow flex items-center justify-center gap-2 cursor-pointer active:scale-98"
                >
                  <Smartphone className="w-4 h-4" />
                  <span>{language === 'bn' ? 'মোবাইল থেকে কন্টাক্ট বাছুন' : 'Pick from Device Contacts'}</span>
                </button>

                {isIframe && (
                  <div className="p-2 bg-sky-950/60 rounded-xl border border-sky-800/60 text-[11px] text-sky-200 flex items-start gap-2">
                    <Info className="w-4 h-4 text-sky-400 shrink-0 mt-0.5" />
                    <div className="space-y-1">
                      <p>
                        {language === 'bn'
                          ? 'আইফ্রেম প্রিভিউতে সিকিউরিটির কারণে সরাসরি ডায়ালগ না আসলে নতুন ট্যাবে খুলুন।'
                          : 'If mobile contacts are blocked by iframe, open in standalone tab.'}
                      </p>
                      <a
                        href={window.location.href}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 px-2.5 py-1 bg-sky-600 hover:bg-sky-500 text-white rounded-lg font-bold text-[10px]"
                      >
                        <ExternalLink className="w-3 h-3" />
                        <span>{language === 'bn' ? 'নতুন ফুলস্ক্রিন ট্যাবে খুলুন' : 'Open in New Tab'}</span>
                      </a>
                    </div>
                  </div>
                )}
              </div>

              {/* Option 2: .VCF Contact Backup File Import */}
              <div className="p-3.5 rounded-2xl bg-slate-950 border border-amber-500/30 space-y-2">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-xl bg-amber-500/20 text-amber-400">
                    <FileText className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="font-bold text-white text-xs">
                      {language === 'bn' ? '📁 .VCF কন্টাক্ট ব্যাকআপ ফাইল' : 'Import .VCF Backup File'}
                    </h4>
                    <p className="text-[10px] text-slate-400">
                      {language === 'bn'
                        ? 'মোবাইলের Contacts App এর Settings > Export to .vcf ফাইল এখান থেকে ইমপোর্ট করুন'
                        : 'Exported contacts from Android/iOS Contacts app (.vcf format)'}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full py-2.5 px-3 bg-slate-800 hover:bg-slate-700 text-amber-300 border border-amber-500/40 font-bold rounded-xl transition flex items-center justify-center gap-2 cursor-pointer"
                >
                  <FileText className="w-4 h-4" />
                  <span>{language === 'bn' ? '.VCF ফাইল সিলেক্ট করুন' : 'Select .VCF File'}</span>
                </button>
              </div>

              {/* Option 3: Quick Paste Text */}
              <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 space-y-2">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-xl bg-slate-800 text-slate-300">
                    <ClipboardPaste className="w-4 h-4 text-emerald-400" />
                  </div>
                  <div>
                    <h4 className="font-bold text-white text-xs">
                      {language === 'bn' ? '📋 মেসেজ বা WhatsApp থেকে পেস্ট' : 'Paste from SMS / WhatsApp'}
                    </h4>
                    <p className="text-[10px] text-slate-400">
                      {language === 'bn'
                        ? 'কপি করা টেক্সট বা ফোন নম্বর এখানে পেস্ট করুন, স্বয়ংক্রিয়ভাবে শনাক্ত হবে'
                        : 'Paste text or phone number to auto-detect'}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 bg-slate-900 border border-slate-700 rounded-xl px-3 py-1.5">
                  <input
                    type="text"
                    value={pasteInputText}
                    onChange={(e) => setPasteInputText(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handlePasteExtract();
                      }
                    }}
                    placeholder={language === 'bn' ? 'নম্বর বা টেক্সট পেস্ট করুন (যেমন: 01712...)' : 'Paste phone number...'}
                    className="w-full bg-transparent text-xs text-white placeholder-slate-500 focus:outline-none font-mono"
                  />
                  {pasteInputText && (
                    <button
                      type="button"
                      onClick={handlePasteExtract}
                      className="px-3 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold shrink-0 cursor-pointer"
                    >
                      {language === 'bn' ? 'শনাক্ত করুন' : 'Extract'}
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="p-3 border-t border-slate-800 bg-slate-950 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2 text-slate-400">
            <span>
              {language === 'bn' ? 'ফোনবুকে মোট:' : 'Total saved:'} <b className="text-white">{phoneContacts.length}</b> {language === 'bn' ? 'জন' : 'contacts'}
            </span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold rounded-xl text-xs transition cursor-pointer"
          >
            {t.close}
          </button>
        </div>

      </div>

      {/* Delete Confirmation Modal */}
      {deletingContact && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs">
          <div className="bg-slate-900 border border-rose-500/40 rounded-xl p-4 max-w-xs w-full shadow-2xl space-y-3 animate-in zoom-in-95">
            <div className="flex items-center gap-2 text-rose-400 font-bold text-sm">
              <AlertTriangle className="w-4 h-4" />
              <span>
                {language === 'bn' ? 'ফোন কন্টাক্ট ডিলিট করবেন?' : 'Delete Phone Contact?'}
              </span>
            </div>
            <p className="text-xs text-slate-300">
              {deletingContact.name} ({deletingContact.phone})
            </p>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setDeletingContact(null)}
                className="px-3 py-1 bg-slate-800 text-slate-300 rounded-lg text-xs font-semibold cursor-pointer"
              >
                {language === 'bn' ? 'না' : 'Cancel'}
              </button>
              <button
                type="button"
                onClick={() => {
                  deletePhoneContact(deletingContact.id);
                  setDeletingContact(null);
                  showToast(language === 'bn' ? 'কন্টাক্ট ডিলিট করা হয়েছে' : 'Contact deleted', 'info');
                }}
                className="px-3 py-1 bg-rose-600 hover:bg-rose-500 text-white rounded-lg text-xs font-bold cursor-pointer"
              >
                {language === 'bn' ? 'ডিলিট করুন' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
