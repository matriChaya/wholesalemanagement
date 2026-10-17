import React, { useState, useRef, useMemo, useEffect } from 'react';
import { useWholesale } from '../context/WholesaleContext';
import { PhoneContact } from '../types';
import {
  Phone,
  BookOpen,
  Smartphone,
  Search,
  Check,
  X,
  Plus,
  User,
  Store,
  Truck,
  Building,
  FileText,
  ClipboardPaste,
  ExternalLink,
  AlertCircle,
  Sparkles,
  Info
} from 'lucide-react';
import {
  sanitizePhoneNumber,
  isContactPickerSupported,
  isRunningInIframe,
  pickContactFromDevice,
  parseVCardContent,
  parsePastedContactText,
  PickedContactResult
} from '../utils/contactPickerHelper';

export interface ContactInfoPayload {
  name: string;
  phone: string;
  address?: string;
  organization?: string;
}

interface PhoneInputWithContactPickerProps {
  id?: string;
  name?: string;
  value: string;
  onChange: (phone: string) => void;
  onSelectContactInfo?: (info: ContactInfoPayload) => void;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  className?: string;
  label?: string;
  helperText?: string;
  showNativePicker?: boolean;
  showPhonebookPicker?: boolean;
}

export function normalizePhoneDigits(input: string): string {
  return sanitizePhoneNumber(input);
}

export const PhoneInputWithContactPicker: React.FC<PhoneInputWithContactPickerProps> = ({
  id,
  name,
  value,
  onChange,
  onSelectContactInfo,
  placeholder = '017XXXXXXXX',
  required = false,
  disabled = false,
  className = '',
  label,
  helperText,
  showNativePicker = true,
  showPhonebookPicker = true,
}) => {
  const { language, phoneContacts, addPhoneContact, retailers, suppliers, users } = useWholesale();

  const [isPhonebookOpen, setIsPhonebookOpen] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'all' | 'phonebook' | 'retailers' | 'suppliers' | 'staff'>('all');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [isQuickAdding, setIsQuickAdding] = useState<boolean>(false);
  const [pasteInputText, setPasteInputText] = useState<string>('');
  const [newContactName, setNewContactName] = useState<string>('');
  const [newContactOrg, setNewContactOrg] = useState<string>('');
  const [feedbackMessage, setFeedbackMessage] = useState<{ text: string; type: 'success' | 'error' | 'info' } | null>(null);
  const [isIframeBlockedModalOpen, setIsIframeBlockedModalOpen] = useState<boolean>(false);
  const [showSuggestions, setShowSuggestions] = useState<boolean>(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const isNativeSupported = isContactPickerSupported();
  const isIframe = isRunningInIframe();

  // Auto-focus search bar when Phonebook modal opens
  useEffect(() => {
    if (isPhonebookOpen) {
      const timer = setTimeout(() => {
        searchInputRef.current?.focus();
      }, 120);
      return () => clearTimeout(timer);
    }
  }, [isPhonebookOpen]);

  // Close suggestions when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const showNotification = (text: string, type: 'success' | 'error' | 'info' = 'info') => {
    setFeedbackMessage({ text, type });
    setTimeout(() => {
      setFeedbackMessage(null);
    }, 4500);
  };

  // Compile unified contact list from phoneContacts, retailers, suppliers, users
  const unifiedContacts = useMemo(() => {
    const list: Array<{
      id: string;
      name: string;
      phone: string;
      category: 'phonebook' | 'retailers' | 'suppliers' | 'staff';
      organization?: string;
      address?: string;
    }> = [];

    // 1. Phonebook
    phoneContacts.forEach((c) => {
      if (c.phone) {
        list.push({
          id: `pb_${c.id}`,
          name: c.name,
          phone: sanitizePhoneNumber(c.phone),
          category: 'phonebook',
          organization: c.organization || (language === 'bn' ? 'ফোনবুক কন্টাক্ট' : 'Phonebook Contact'),
          address: c.address,
        });
      }
    });

    // 2. Retailers
    retailers.forEach((r) => {
      if (r.phone) {
        list.push({
          id: `ret_${r.id}`,
          name: r.shopName || r.name,
          phone: sanitizePhoneNumber(r.phone),
          category: 'retailers',
          organization: r.ownerName ? `${r.ownerName} (${r.shopName})` : r.shopName,
          address: r.address,
        });
      }
    });

    // 3. Suppliers
    suppliers.forEach((s) => {
      if (s.phone) {
        list.push({
          id: `sup_${s.id}`,
          name: s.name,
          phone: sanitizePhoneNumber(s.phone),
          category: 'suppliers',
          organization: s.companyName || (language === 'bn' ? 'সাপ্লায়ার / মহাজন' : 'Supplier Company'),
          address: s.address,
        });
      }
    });

    // 4. Users / Staff
    users.forEach((u) => {
      if (u.phone) {
        list.push({
          id: `usr_${u.id}`,
          name: u.name,
          phone: sanitizePhoneNumber(u.phone),
          category: 'staff',
          organization: u.role.toUpperCase(),
        });
      }
    });

    // Remove duplicates by phone number
    const seen = new Set<string>();
    return list.filter((item) => {
      if (!item.phone || seen.has(item.phone)) return false;
      seen.add(item.phone);
      return true;
    });
  }, [phoneContacts, retailers, suppliers, users, language]);

  // Handle direct typing with Bangla number normalization and suggestion triggering
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawValue = e.target.value;
    const normalized = sanitizePhoneNumber(rawValue);
    // If user typed letters (e.g. searching by name), allow it for search; if digits, sanitize
    onChange(normalized || rawValue);
    setShowSuggestions(true);
  };

  // Quick Paste Handler
  const handleQuickPaste = async () => {
    try {
      if (navigator.clipboard && navigator.clipboard.readText) {
        const clip = await navigator.clipboard.readText();
        if (clip) {
          const parsed = parsePastedContactText(clip);
          if (parsed && parsed.phone) {
            onChange(parsed.phone);
            if (onSelectContactInfo) onSelectContactInfo(parsed);
            showNotification(
              language === 'bn'
                ? `ক্লিপবোর্ড থেকে নম্বর পেস্ট হয়েছে: ${parsed.phone}`
                : `Pasted: ${parsed.phone}`,
              'success'
            );
            return;
          }
        }
      }
    } catch (e) {}
    setIsPhonebookOpen(true);
  };

  // Launch Mobile Device native Contact Picker
  const handlePickFromNativeDevice = async () => {
    const res = await pickContactFromDevice(false);

    if (res.success && res.contacts && res.contacts.length > 0) {
      const selected = res.contacts[0];
      onChange(selected.phone);

      // Save to app phonebook
      addPhoneContact({
        name: selected.name,
        phone: selected.phone,
        address: selected.address,
        organization: selected.organization || 'Device Contact',
      });

      if (onSelectContactInfo) {
        onSelectContactInfo(selected);
      }

      showNotification(
        language === 'bn'
          ? `মোবাইল থেকে "${selected.name}" (${selected.phone}) যুক্ত হয়েছে!`
          : `Selected "${selected.name}" (${selected.phone}) from mobile!`,
        'success'
      );
      setShowSuggestions(false);
      setIsPhonebookOpen(false);
      setIsIframeBlockedModalOpen(false);
      return;
    }

    if (res.isIframeBlocked || !isNativeSupported) {
      // In preview iframe or unsupported: open dedicated device contacts modal with full tab launch
      setIsIframeBlockedModalOpen(true);
    } else if (res.error && !res.error.includes('No contact selected') && !res.error.includes('cancel')) {
      showNotification(
        language === 'bn' ? `ত্রুটি: ${res.error}` : `Note: ${res.error}`,
        'error'
      );
    }
  };

  // Pick contact from unified contact list
  const handleSelectContactItem = (contact: {
    name: string;
    phone: string;
    address?: string;
    organization?: string;
  }) => {
    const cleanPhone = sanitizePhoneNumber(contact.phone);
    onChange(cleanPhone);

    if (onSelectContactInfo) {
      onSelectContactInfo({
        name: contact.name,
        phone: cleanPhone,
        address: contact.address,
        organization: contact.organization,
      });
    }

    setShowSuggestions(false);
    setIsPhonebookOpen(false);
    showNotification(
      language === 'bn'
        ? `ফোনবুক থেকে "${contact.name}" (${cleanPhone}) যুক্ত হয়েছে!`
        : `Selected "${contact.name}" (${cleanPhone})!`,
      'success'
    );
  };

  // Smart Paste Handler
  const handleSmartPasteSubmit = () => {
    const parsed = parsePastedContactText(pasteInputText);
    if (!parsed || !parsed.phone) {
      showNotification(
        language === 'bn' ? 'সঠিক ফোন নম্বর খুঁজে পাওয়া যায়নি' : 'No valid phone number found in pasted text',
        'error'
      );
      return;
    }

    onChange(parsed.phone);
    addPhoneContact({
      name: parsed.name || 'Pasted Contact',
      phone: parsed.phone,
      organization: 'Direct Paste',
    });

    if (onSelectContactInfo) {
      onSelectContactInfo(parsed);
    }

    showNotification(
      language === 'bn' ? `নম্বর শনাক্ত হয়েছে: ${parsed.phone}` : `Detected phone: ${parsed.phone}`,
      'success'
    );
    setPasteInputText('');
    setIsPhonebookOpen(false);
  };

  // VCF / vCard File Upload Handler
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      const text = evt.target?.result as string;
      if (!text) return;

      const parsedContacts = parseVCardContent(text);
      if (parsedContacts.length > 0) {
        // Add all to phonebook
        parsedContacts.forEach((c) => {
          addPhoneContact({
            name: c.name,
            phone: c.phone,
            address: c.address,
            organization: c.organization || 'VCF Contact',
          });
        });

        // Select the first one
        const first = parsedContacts[0];
        onChange(first.phone);
        if (onSelectContactInfo) {
          onSelectContactInfo(first);
        }

        showNotification(
          language === 'bn'
            ? `${parsedContacts.length} টি কন্টাক্ট ফাইল থেকে সফলভাবে সংরক্ষিত হয়েছে!`
            : `Imported ${parsedContacts.length} contacts from VCF file!`,
          'success'
        );
        setIsPhonebookOpen(false);
      } else {
        showNotification(
          language === 'bn' ? 'ফাইলে কোন বৈধ কন্টাক্ট বা ফোন নম্বর পাওয়া যায়নি' : 'No valid contacts found in file',
          'error'
        );
      }
    };
    reader.readAsText(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // Quick save current contact to phonebook
  const handleSaveToPhonebook = (e?: React.FormEvent | React.MouseEvent) => {
    if (e) e.preventDefault();
    if (!value || !newContactName) return;

    const cleanPhone = sanitizePhoneNumber(value);
    addPhoneContact({
      name: newContactName,
      phone: cleanPhone,
      organization: newContactOrg || undefined,
    });

    if (onSelectContactInfo) {
      onSelectContactInfo({
        name: newContactName,
        phone: cleanPhone,
        organization: newContactOrg || undefined,
      });
    }

    setIsQuickAdding(false);
    setNewContactName('');
    setNewContactOrg('');
    setIsPhonebookOpen(false);
  };

  // Matching saved contacts when user types in the input (matches by phone digits or name/org)
  const inlineSuggestions = useMemo(() => {
    const raw = (value || '').trim();
    if (!raw || raw.length < 1) return [];

    const cleanDigits = sanitizePhoneNumber(raw);
    const lower = raw.toLowerCase();

    return unifiedContacts
      .filter((c) => {
        const phoneMatch = cleanDigits.length >= 2 && c.phone.includes(cleanDigits);
        const nameMatch = c.name.toLowerCase().includes(lower);
        const orgMatch = Boolean(c.organization && c.organization.toLowerCase().includes(lower));
        return phoneMatch || nameMatch || orgMatch;
      })
      .slice(0, 6);
  }, [value, unifiedContacts]);

  // Is current value already an exact saved contact?
  const exactContactMatch = useMemo(() => {
    const cleanDigits = sanitizePhoneNumber(value);
    if (!cleanDigits || cleanDigits.length < 10) return null;
    return unifiedContacts.find((c) => c.phone === cleanDigits) || null;
  }, [value, unifiedContacts]);

  // Filter contacts by category and search in modal
  const filteredContacts = unifiedContacts.filter((c) => {
    const matchesCategory = activeTab === 'all' || c.category === activeTab;
    const matchesSearch =
      c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.phone.includes(searchTerm) ||
      (c.organization && c.organization.toLowerCase().includes(searchTerm.toLowerCase()));
    return matchesCategory && matchesSearch;
  });

  return (
    <div className={`space-y-1.5 relative ${className}`} ref={containerRef}>
      {label && (
        <div className="flex items-center justify-between">
          <label htmlFor={id} className="text-xs font-bold text-slate-300 flex items-center gap-1">
            <Phone className="w-3.5 h-3.5 text-sky-400" />
            <span>{label}</span>
            {required && <span className="text-rose-400">*</span>}
          </label>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePickFromNativeDevice}
              className="text-[11px] font-bold text-emerald-400 hover:text-emerald-300 flex items-center gap-1 transition cursor-pointer"
              title={language === 'bn' ? 'সরাসরি মোবাইলের ফোনবুক গ্যালারি থেকে নম্বর নিন' : 'Pick directly from mobile device contacts'}
            >
              <Smartphone className="w-3.5 h-3.5 text-emerald-400" />
              <span>{language === 'bn' ? '📱 মোবাইলের ফোনবুক' : '📱 Mobile Contacts'}</span>
            </button>
            {phoneContacts.length > 0 && (
              <>
                <span className="text-slate-600">|</span>
                <button
                  type="button"
                  onClick={() => {
                    setSearchTerm('');
                    setIsPhonebookOpen(true);
                  }}
                  className="text-[11px] font-bold text-slate-400 hover:text-slate-200 flex items-center gap-1 transition cursor-pointer"
                  title={language === 'bn' ? 'অ্যাপে সেভ করা লিস্ট' : 'App Saved List'}
                >
                  <BookOpen className="w-3 h-3 text-slate-400" />
                  <span>{language === 'bn' ? `সংরক্ষিত (${phoneContacts.length})` : `Saved (${phoneContacts.length})`}</span>
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {/* Main Input Strip with Action Buttons */}
      <div className="relative flex items-center">
        <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />

        <input
          type="tel"
          id={id}
          name={name || 'tel'}
          autoComplete="tel"
          inputMode="tel"
          required={required}
          disabled={disabled}
          value={value}
          onFocus={() => setShowSuggestions(true)}
          onChange={handleInputChange}
          placeholder={placeholder || (language === 'bn' ? '017XXXXXXXX বা নাম লিখে খুঁজুন...' : '017XXXXXXXX or type name...')}
          className="w-full bg-slate-950 border border-slate-700 hover:border-slate-600 focus:border-emerald-500 rounded-xl pl-9 pr-48 py-2.5 text-sm font-mono text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 transition shadow-inner"
        />

        {/* Action Button Strip on the Right */}
        <div className="absolute right-1.5 top-1/2 -translate-y-1/2 flex items-center gap-1">
          {/* Clear Button */}
          {value && (
            <button
              type="button"
              disabled={disabled}
              onClick={() => {
                onChange('');
                setShowSuggestions(false);
              }}
              title={language === 'bn' ? 'মুছে ফেলুন' : 'Clear'}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}

          {/* Primary Mobile Phonebook Gallery Button */}
          <button
            type="button"
            disabled={disabled}
            onClick={handlePickFromNativeDevice}
            title={
              language === 'bn'
                ? 'সরাসরি মোবাইলের নিজস্ব ফোনবুক / কন্টাক্ট গ্যালারি থেকে নম্বর নিন'
                : 'Directly pick from mobile device phonebook gallery'
            }
            className="py-1.5 px-3 rounded-lg bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-bold transition flex items-center gap-1.5 shadow-md active:scale-95 cursor-pointer"
          >
            <Smartphone className="w-3.5 h-3.5 text-emerald-200" />
            <span className="text-[11px] font-bold whitespace-nowrap">
              {language === 'bn' ? '📱 ফোনবুক' : '📱 Phonebook'}
            </span>
          </button>

          {/* Quick Paste Button */}
          <button
            type="button"
            disabled={disabled}
            onClick={handleQuickPaste}
            title={language === 'bn' ? 'ক্লিপবোর্ড থেকে নম্বর পেস্ট করুন' : 'Paste from clipboard'}
            className="p-1.5 px-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 text-xs font-bold transition flex items-center gap-1 cursor-pointer active:scale-95"
          >
            <ClipboardPaste className="w-3.5 h-3.5 text-slate-300" />
          </button>
        </div>
      </div>

      {/* Floating Suggestions Dropdown matching what user typed */}
      {showSuggestions && inlineSuggestions.length > 0 && (
        <div className="absolute left-0 right-0 top-full mt-1 z-40 bg-slate-900 border border-emerald-500/50 rounded-xl shadow-2xl overflow-hidden animate-in fade-in duration-100">
          <div className="p-2 bg-slate-950 border-b border-slate-800 text-[11px] text-emerald-400 font-bold flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <BookOpen className="w-3.5 h-3.5 text-emerald-400" />
              <span>
                {language === 'bn'
                  ? `🔍 ফোনবুকে পাওয়া গেছে (${inlineSuggestions.length}টি):`
                  : `Found in Phonebook (${inlineSuggestions.length}):`}
              </span>
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setShowSuggestions(false);
                  setSearchTerm(value);
                  setIsPhonebookOpen(true);
                }}
                className="text-[10px] font-bold text-sky-400 hover:underline cursor-pointer"
              >
                {language === 'bn' ? 'সব দেখুন ↗' : 'View All ↗'}
              </button>
              <button
                type="button"
                onClick={() => setShowSuggestions(false)}
                className="text-slate-400 hover:text-white p-0.5 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
          <div className="divide-y divide-slate-800/80 max-h-56 overflow-y-auto">
            {inlineSuggestions.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => handleSelectContactItem(item)}
                className="w-full text-left p-2.5 hover:bg-slate-800/90 transition flex items-center justify-between text-xs group cursor-pointer"
              >
                <div className="space-y-0.5">
                  <div className="font-bold text-white group-hover:text-emerald-300 flex items-center gap-1.5">
                    {item.category === 'retailers' ? (
                      <Store className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                    ) : item.category === 'suppliers' ? (
                      <Building className="w-3.5 h-3.5 text-purple-400 shrink-0" />
                    ) : item.category === 'staff' ? (
                      <Truck className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                    ) : (
                      <User className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    )}
                    <span>{item.name}</span>
                    <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-800 text-slate-300 font-normal">
                      {item.category === 'retailers'
                        ? (language === 'bn' ? 'দোকান/রিটেইলার' : 'Retailer')
                        : item.category === 'suppliers'
                        ? (language === 'bn' ? 'মহাজন/সাপ্লায়ার' : 'Supplier')
                        : item.category === 'staff'
                        ? (language === 'bn' ? 'স্টাফ' : 'Staff')
                        : (language === 'bn' ? 'ফোনবুক' : 'Phonebook')}
                    </span>
                    {item.organization && (
                      <span className="text-[10px] text-slate-400 font-normal truncate max-w-[120px]">
                        ({item.organization})
                      </span>
                    )}
                  </div>
                  <div className="text-[11px] font-mono text-emerald-400 font-bold flex items-center gap-2">
                    <span>{item.phone}</span>
                    {item.address && (
                      <span className="text-[10px] text-slate-500 font-normal">| {item.address}</span>
                    )}
                  </div>
                </div>
                <span className="px-2.5 py-1 rounded-lg bg-emerald-600/20 group-hover:bg-emerald-600 text-emerald-300 group-hover:text-white text-[11px] font-bold transition flex items-center gap-1 shadow-xs">
                  <Plus className="w-3 h-3" />
                  <span>{language === 'bn' ? 'অ্যাড করুন' : 'Add'}</span>
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Exact Match Status Badge */}
      {exactContactMatch && (
        <div className="flex items-center justify-between p-2 rounded-xl bg-emerald-950/40 border border-emerald-500/30 text-xs text-emerald-300 animate-in fade-in">
          <div className="flex items-center gap-1.5 text-[11px]">
            <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            <span>
              {language === 'bn' ? 'সংরক্ষিত কন্টাক্ট:' : 'Saved contact:'}{' '}
              <strong className="text-white">{exactContactMatch.name}</strong>{' '}
              {exactContactMatch.organization ? `(${exactContactMatch.organization})` : ''}
            </span>
          </div>
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-bold">
            {exactContactMatch.category === 'retailers'
              ? (language === 'bn' ? 'রিটেইলার' : 'Retailer')
              : exactContactMatch.category === 'suppliers'
              ? (language === 'bn' ? 'সাপ্লায়ার' : 'Supplier')
              : exactContactMatch.category === 'staff'
              ? (language === 'bn' ? 'স্টাফ' : 'Staff')
              : (language === 'bn' ? 'ফোনবুক' : 'Phonebook')}
          </span>
        </div>
      )}

      {/* Prompt to Save Unsaved Number to Phonebook */}
      {value && sanitizePhoneNumber(value).length >= 10 && !exactContactMatch && !isQuickAdding && (
        <div className="flex items-center justify-between p-2 rounded-xl bg-slate-900/90 border border-slate-800 text-xs text-slate-300 animate-in fade-in">
          <div className="flex items-center gap-1.5 text-[11px]">
            <Info className="w-3.5 h-3.5 text-sky-400 shrink-0" />
            <span>{language === 'bn' ? 'এই নম্বরটি ফোনবুকে সেভ করা নেই।' : 'Number not saved in phonebook.'}</span>
          </div>
          <button
            type="button"
            onClick={() => {
              setIsQuickAdding(true);
              setNewContactName('');
            }}
            className="px-2 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[10px] flex items-center gap-1 cursor-pointer transition shadow"
          >
            <Plus className="w-3 h-3" />
            <span>{language === 'bn' ? 'ফোনবুকে সেভ করুন' : 'Save to Phonebook'}</span>
          </button>
        </div>
      )}

      {/* Quick Add Form Drawer when adding typed number to phonebook */}
      {isQuickAdding && (
        <div className="p-3 rounded-xl bg-slate-950 border border-emerald-500/40 space-y-2 text-xs animate-in fade-in">
          <div className="font-bold text-emerald-400 flex items-center justify-between">
            <span className="flex items-center gap-1">
              <User className="w-3.5 h-3.5" />
              <span>
                {language === 'bn'
                  ? `ফোনবুকে সংরক্ষণ: ${sanitizePhoneNumber(value)}`
                  : `Save to Phonebook: ${sanitizePhoneNumber(value)}`}
              </span>
            </span>
            <button
              type="button"
              onClick={() => setIsQuickAdding(false)}
              className="text-slate-400 hover:text-white"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
          <input
            type="text"
            required
            value={newContactName}
            onChange={(e) => setNewContactName(e.target.value)}
            placeholder={language === 'bn' ? 'ব্যক্তি বা দোকানের নাম লিখুন *' : 'Person or Store Name *'}
            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white focus:outline-none focus:border-emerald-500"
          />
          <input
            type="text"
            value={newContactOrg}
            onChange={(e) => setNewContactOrg(e.target.value)}
            placeholder={language === 'bn' ? 'প্রতিষ্ঠান / পদবী (ঐচ্ছিক)' : 'Company / Role (Optional)'}
            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white focus:outline-none focus:border-emerald-500"
          />
          <div className="flex items-center gap-2 pt-1">
            <button
              type="button"
              onClick={handleSaveToPhonebook}
              disabled={!newContactName.trim()}
              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold rounded-lg text-xs cursor-pointer shadow"
            >
              {language === 'bn' ? 'সেভ করুন' : 'Save'}
            </button>
            <button
              type="button"
              onClick={() => setIsQuickAdding(false)}
              className="px-2.5 py-1.5 text-slate-400 hover:text-white cursor-pointer"
            >
              {language === 'bn' ? 'বাতিল' : 'Cancel'}
            </button>
          </div>
        </div>
      )}

      {/* Dedicated Iframe Fallback Modal with Direct Standalone Launch */}
      {isIframeBlockedModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/85 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="w-full max-w-md bg-slate-900 border border-sky-500/40 rounded-2xl shadow-2xl overflow-hidden">
            <div className="p-4 border-b border-slate-800 bg-slate-950 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-sky-500/20 text-sky-400 border border-sky-500/30">
                  <Smartphone className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">
                    {language === 'bn' ? '📱 মোবাইলের ফোনবুক থেকে নম্বর নির্বাচন' : 'Pick from Device Contacts'}
                  </h3>
                  <p className="text-[10px] text-sky-300">
                    {language === 'bn' ? 'সরাসরি আপনার মোবাইলের আসল কন্টাক্ট লিস্ট' : 'Direct mobile phonebook access'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsIframeBlockedModalOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 space-y-3.5 text-xs text-slate-300">
              <div className="p-3 rounded-xl bg-sky-950/60 border border-sky-800/80 space-y-1.5">
                <p className="font-semibold text-white">
                  {language === 'bn'
                    ? '💡 ব্রাউজার সিকিউরিটি পলিসি:'
                    : '💡 Browser Security Notice:'}
                </p>
                <p className="text-[11px] text-slate-300 leading-relaxed">
                  {language === 'bn'
                    ? 'প্রিভিউ আইফ্রেম ফ্রেমের ভেতর সরাসরি মোবাইলের ফোনবুক ডায়ালগ খোলা ব্রাউজার ব্লক করে। নিচের বাটনে চাপ দিন, অ্যাপটি ব্রাউজারের ফুলস্ক্রিনে খুলবে এবং সরাসরি আপনার মোবাইলের আসল কন্টাক্ট লিস্ট খুলে যাবে।'
                    : 'Iframe sandbox restricts direct contact dialog. Click below to open in full browser tab where device contacts will open directly.'}
                </p>
              </div>

              {/* Primary Action Button */}
              <button
                type="button"
                onClick={() => {
                  window.open(window.location.href, '_blank');
                  setIsIframeBlockedModalOpen(false);
                }}
                className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-sky-600 via-indigo-600 to-sky-500 hover:from-sky-500 hover:to-sky-400 text-white font-bold text-sm flex items-center justify-center gap-2 shadow-lg transition active:scale-98 cursor-pointer"
              >
                <ExternalLink className="w-4 h-4" />
                <span>
                  {language === 'bn'
                    ? '🚀 ফুলস্ক্রিনে মোবাইলের ফোনবুক ওপেন করুন'
                    : 'Open in Full Tab & Pick Contacts'}
                </span>
              </button>

              <div className="grid grid-cols-2 gap-2 pt-1">
                <button
                  type="button"
                  onClick={async () => {
                    try {
                      if (navigator.clipboard && navigator.clipboard.readText) {
                        const clip = await navigator.clipboard.readText();
                        if (clip) {
                          const parsed = parsePastedContactText(clip);
                          if (parsed && parsed.phone) {
                            onChange(parsed.phone);
                            if (onSelectContactInfo) onSelectContactInfo(parsed);
                            showNotification(
                              language === 'bn'
                                ? `ক্লিপবোর্ড থেকে নম্বর নেওয়া হয়েছে: ${parsed.phone}`
                                : `Extracted: ${parsed.phone}`,
                              'success'
                            );
                            setIsIframeBlockedModalOpen(false);
                            return;
                          }
                        }
                      }
                    } catch (e) {}
                    setIsIframeBlockedModalOpen(false);
                    setIsPhonebookOpen(true);
                  }}
                  className="py-2 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-bold text-xs flex items-center justify-center gap-1.5 transition cursor-pointer"
                >
                  <ClipboardPaste className="w-3.5 h-3.5 text-emerald-400" />
                  <span>{language === 'bn' ? 'ক্লিপবোর্ড পেস্ট' : 'Paste'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setIsIframeBlockedModalOpen(false);
                    fileInputRef.current?.click();
                  }}
                  className="py-2 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-bold text-xs flex items-center justify-center gap-1.5 transition cursor-pointer"
                >
                  <FileText className="w-3.5 h-3.5 text-amber-400" />
                  <span>{language === 'bn' ? '.VCF ফাইল' : 'VCF File'}</span>
                </button>
              </div>

              <div className="text-center pt-1">
                <button
                  type="button"
                  onClick={() => setIsIframeBlockedModalOpen(false)}
                  className="text-[11px] text-slate-400 hover:text-white underline cursor-pointer"
                >
                  {language === 'bn' ? 'সরাসরি টাইপ করব' : 'I will type manually'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {helperText && <p className="text-[10px] text-slate-400">{helperText}</p>}

      {/* Hidden File Input for VCF contacts import */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileUpload}
        accept=".vcf,.vcard,text/vcard,text/x-vcard"
        className="hidden"
      />

      {/* Unified Phonebook & Mobile Contact Picker Modal */}
      {isPhonebookOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/80 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="w-full max-w-md bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            {/* Header */}
            <div className="p-3.5 border-b border-slate-800 bg-slate-950 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-sky-500/20 text-sky-400 border border-sky-500/30">
                  <Smartphone className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">
                    {language === 'bn' ? 'মোবাইল কন্টাক্ট ও ফোনবুক' : 'Mobile Contacts & Phonebook'}
                  </h3>
                  <p className="text-[10px] text-slate-400">
                    {language === 'bn'
                      ? 'মোবাইল অ্যাড্রেস বুক, ফাইল বা তালিকা থেকে নিন'
                      : 'From mobile address book, VCF file or directory'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsPhonebookOpen(false);
                  setIsQuickAdding(false);
                }}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Notification / Alert Bar */}
            {feedbackMessage && (
              <div
                className={`px-3 py-2 text-xs flex items-center gap-2 ${
                  feedbackMessage.type === 'success'
                    ? 'bg-emerald-950/80 border-b border-emerald-500/40 text-emerald-300'
                    : feedbackMessage.type === 'error'
                    ? 'bg-rose-950/80 border-b border-rose-500/40 text-rose-300'
                    : 'bg-sky-950/80 border-b border-sky-500/40 text-sky-300'
                }`}
              >
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span className="flex-1">{feedbackMessage.text}</span>
              </div>
            )}

            {/* Actions Bar */}
            <div className="p-3 border-b border-slate-800 bg-slate-900/80 space-y-2.5">
              {/* Primary Mobile Native Contact Actions */}
              <div className="space-y-1.5">
                <button
                  type="button"
                  onClick={handlePickFromNativeDevice}
                  className="w-full py-2.5 px-3 rounded-xl bg-gradient-to-r from-sky-600 via-indigo-600 to-emerald-600 hover:opacity-95 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-md transition active:scale-98 cursor-pointer"
                >
                  <Smartphone className="w-4 h-4" />
                  <span>
                    {language === 'bn'
                      ? '📱 মোবাইলের কন্টাক্ট ডায়ালগ ওপেন করুন (Android Chrome)'
                      : '📱 Open Device Contacts Dialog (Android)'}
                  </span>
                </button>

                {/* Direct Help / Fallback Guide for Iframe / Desktop */}
                {isIframe && (
                  <div className="p-2 rounded-xl bg-sky-950/70 border border-sky-800/80 text-[11px] text-sky-200 flex items-start gap-2">
                    <Info className="w-4 h-4 text-sky-400 shrink-0 mt-0.5" />
                    <div className="space-y-1 flex-1">
                      <p>
                        {language === 'bn'
                          ? 'আইফ্রেম প্রিভিউতে সিকিউরিটির জন্য মোবাইলের ডায়ালগ সরাসরি না খুললে নিচের বোতাম চেপে নতুন ফুলস্ক্রিন ট্যাবে খুলুন।'
                          : 'If mobile contacts are blocked by iframe policy, open in full screen tab or use VCF file/paste.'}
                      </p>
                      <a
                        href={window.location.href}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 px-2.5 py-1 bg-sky-600 hover:bg-sky-500 text-white rounded-lg font-bold text-[10px] shadow"
                      >
                        <ExternalLink className="w-3 h-3" />
                        <span>{language === 'bn' ? 'ফুলস্ক্রিন ট্যাবে অ্যাপটি খুলুন' : 'Open in Standalone Tab'}</span>
                      </a>
                    </div>
                  </div>
                )}
              </div>

              {/* Extra Tools: Smart Paste Strip & Add New */}
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setIsQuickAdding(!isQuickAdding)}
                  className="py-2 px-2 rounded-xl bg-emerald-950/80 hover:bg-emerald-900/80 text-emerald-300 border border-emerald-500/40 text-xs font-bold flex items-center justify-center gap-1.5 transition cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5 text-emerald-400" />
                  <span>{language === 'bn' ? '➕ নতুন নম্বর লিখুন' : 'Add New'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="py-2 px-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 text-xs font-bold flex items-center justify-center gap-1.5 transition cursor-pointer"
                  title="Import contacts from .vcf contact backup file"
                >
                  <FileText className="w-3.5 h-3.5 text-amber-400" />
                  <span>{language === 'bn' ? '📁 VCF ফাইল ব্যাকআপ' : 'Import VCF'}</span>
                </button>
              </div>

              {/* Quick Paste & Auto-Extract Box */}
              <div className="flex items-center gap-1.5 bg-slate-950 border border-slate-700 rounded-xl px-2.5 py-1">
                <ClipboardPaste className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <input
                  type="text"
                  value={pasteInputText}
                  onChange={(e) => setPasteInputText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleSmartPasteSubmit();
                    }
                  }}
                  placeholder={
                    language === 'bn'
                      ? 'WhatsApp/SMS থেকে নম্বর বা টেক্সট পেস্ট করুন...'
                      : 'Paste text or phone to auto-detect...'
                  }
                  className="w-full bg-transparent text-xs text-white placeholder-slate-500 focus:outline-none"
                />
                {pasteInputText && (
                  <button
                    type="button"
                    onClick={handleSmartPasteSubmit}
                    className="px-2 py-0.5 bg-sky-600 hover:bg-sky-500 text-white rounded text-[10px] font-bold"
                  >
                    {language === 'bn' ? 'নিন' : 'Extract'}
                  </button>
                )}
              </div>

              {/* Quick Add Form Drawer */}
              {isQuickAdding && (
                <div className="p-3 rounded-xl bg-slate-950 border border-emerald-500/40 space-y-2 text-xs">
                  <div className="font-bold text-emerald-400 flex items-center gap-1">
                    <User className="w-3.5 h-3.5" />
                    <span>{language === 'bn' ? 'নতুন কন্টাক্ট সেভ ও সিলেক্ট' : 'Add New Contact'}</span>
                  </div>
                  <input
                    type="text"
                    required
                    value={newContactName}
                    onChange={(e) => setNewContactName(e.target.value)}
                    placeholder={language === 'bn' ? 'ব্যক্তি বা দোকানের নাম *' : 'Person or Store Name *'}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white"
                  />
                  <input
                    type="text"
                    value={newContactOrg}
                    onChange={(e) => setNewContactOrg(e.target.value)}
                    placeholder={language === 'bn' ? 'প্রতিষ্ঠান / পদবী (ঐচ্ছিক)' : 'Company / Role (Optional)'}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white"
                  />
                  <div className="flex items-center gap-2 pt-1">
                    <button
                      type="button"
                      onClick={handleSaveToPhonebook}
                      className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-lg text-xs"
                    >
                      {language === 'bn' ? 'সেভ ও সিলেক্ট করুন' : 'Save & Select'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsQuickAdding(false)}
                      className="px-2.5 py-1.5 text-slate-400 hover:text-white"
                    >
                      {language === 'bn' ? 'বাতিল' : 'Cancel'}
                    </button>
                  </div>
                </div>
              )}

              {/* Search Bar */}
              <div className="relative">
                <Search className="w-4 h-4 text-emerald-400 absolute left-3 top-2.5" />
                <input
                  ref={searchInputRef}
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder={
                    language === 'bn'
                      ? 'নাম, দোকান বা ফোন নম্বর দিয়ে সার্চ করুন...'
                      : 'Search by name, store, or phone...'
                  }
                  className="w-full bg-slate-950 border border-slate-700 hover:border-slate-600 focus:border-emerald-500 rounded-xl pl-9 pr-8 py-2 text-xs text-white placeholder-slate-500 focus:outline-none transition shadow-inner"
                />
                {searchTerm && (
                  <button
                    type="button"
                    onClick={() => setSearchTerm('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white p-0.5 cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Category Filter Tabs */}
              <div className="flex items-center gap-1 overflow-x-auto pb-1 text-[11px] no-scrollbar">
                <button
                  type="button"
                  onClick={() => setActiveTab('all')}
                  className={`px-2.5 py-1 rounded-lg font-bold transition whitespace-nowrap ${
                    activeTab === 'all'
                      ? 'bg-sky-600 text-white'
                      : 'bg-slate-800 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {language === 'bn' ? 'সব' : 'All'} ({unifiedContacts.length})
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('phonebook')}
                  className={`px-2.5 py-1 rounded-lg font-bold transition whitespace-nowrap ${
                    activeTab === 'phonebook'
                      ? 'bg-emerald-600 text-white'
                      : 'bg-slate-800 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {language === 'bn' ? 'ফোনবুক' : 'Phonebook'}
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('retailers')}
                  className={`px-2.5 py-1 rounded-lg font-bold transition whitespace-nowrap ${
                    activeTab === 'retailers'
                      ? 'bg-amber-600 text-white'
                      : 'bg-slate-800 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {language === 'bn' ? 'রিটেইলার' : 'Retailers'}
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('suppliers')}
                  className={`px-2.5 py-1 rounded-lg font-bold transition whitespace-nowrap ${
                    activeTab === 'suppliers'
                      ? 'bg-purple-600 text-white'
                      : 'bg-slate-800 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {language === 'bn' ? 'সাপ্লায়ার' : 'Suppliers'}
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('staff')}
                  className={`px-2.5 py-1 rounded-lg font-bold transition whitespace-nowrap ${
                    activeTab === 'staff'
                      ? 'bg-indigo-600 text-white'
                      : 'bg-slate-800 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {language === 'bn' ? 'স্টাফ' : 'Staff'}
                </button>
              </div>
            </div>

            {/* Unified Contact List */}
            <div className="flex-1 overflow-y-auto p-2 space-y-1.5 divide-y divide-slate-800/60">
              {filteredContacts.length === 0 ? (
                <div className="py-8 text-center text-slate-400 text-xs">
                  <p>{language === 'bn' ? 'কোন কন্টাক্ট পাওয়া যায়নি' : 'No contacts found'}</p>
                  <p className="text-[10px] text-slate-500 mt-1">
                    {language === 'bn'
                      ? 'উপরের বোতাম চেপে মোবাইল থেকে আনুন, VCF ফাইল দিন বা নতুন লিখুন।'
                      : 'Use buttons above to pick from mobile, import VCF or type new.'}
                  </p>
                </div>
              ) : (
                filteredContacts.map((contact) => (
                  <button
                    key={contact.id}
                    type="button"
                    onClick={() => handleSelectContactItem(contact)}
                    className="w-full text-left p-2.5 rounded-xl hover:bg-slate-800/80 transition flex items-center justify-between group cursor-pointer"
                  >
                    <div className="space-y-0.5">
                      <div className="text-xs font-bold text-white group-hover:text-sky-300 transition flex items-center gap-1.5">
                        {contact.category === 'retailers' ? (
                          <Store className="w-3.5 h-3.5 text-amber-400" />
                        ) : contact.category === 'suppliers' ? (
                          <Building className="w-3.5 h-3.5 text-purple-400" />
                        ) : contact.category === 'staff' ? (
                          <Truck className="w-3.5 h-3.5 text-indigo-400" />
                        ) : (
                          <User className="w-3.5 h-3.5 text-emerald-400" />
                        )}
                        <span>{contact.name}</span>
                        {contact.organization && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 font-normal">
                            {contact.organization}
                          </span>
                        )}
                      </div>
                      <div className="text-xs font-mono font-bold text-emerald-400">
                        {contact.phone}
                      </div>
                      {contact.address && (
                        <div className="text-[10px] text-slate-400">
                          {contact.address}
                        </div>
                      )}
                    </div>
                    <div className="px-2 py-1 rounded-lg bg-sky-500/20 text-sky-300 text-xs font-bold flex items-center gap-1 group-hover:bg-sky-500 group-hover:text-white transition">
                      <Check className="w-3.5 h-3.5" />
                      <span>{language === 'bn' ? 'নিন' : 'Pick'}</span>
                    </div>
                  </button>
                ))
              )}
            </div>

            {/* Footer */}
            <div className="p-2.5 border-t border-slate-800 bg-slate-950 flex items-center justify-between text-[11px] text-slate-400">
              <span>{filteredContacts.length} {language === 'bn' ? 'টি কন্টাক্ট' : 'contacts'}</span>
              <button
                type="button"
                onClick={() => setIsPhonebookOpen(false)}
                className="px-3 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg font-bold cursor-pointer"
              >
                {language === 'bn' ? 'বন্ধ করুন' : 'Close'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
