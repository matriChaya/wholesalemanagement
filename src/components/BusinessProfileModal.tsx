import React, { useState, useEffect } from 'react';
import {
  Building2,
  MapPin,
  Warehouse,
  Phone,
  User,
  Mail,
  Save,
  X,
  FileText,
  Sliders,
  CheckCircle2,
  HelpCircle,
  Smartphone,
} from 'lucide-react';
import { BusinessProfile } from '../types';
import { getStoredBusinessProfile, saveStoredBusinessProfile } from '../utils/businessProfile';
import { useWholesale } from '../context/WholesaleContext';

export interface BusinessProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved?: (updated: BusinessProfile) => void;
}

export const BusinessProfileModal: React.FC<BusinessProfileModalProps> = ({
  isOpen,
  onClose,
  onSaved,
}) => {
  const { language, currentUser, updateUserProfile } = useWholesale();
  const [profile, setProfile] = useState<BusinessProfile>(getStoredBusinessProfile);
  const [isSuccess, setIsSuccess] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setProfile(getStoredBusinessProfile());
      setIsSuccess(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleChange = (field: keyof BusinessProfile, value: string | number) => {
    setProfile((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const updated = saveStoredBusinessProfile(profile);

    // Also sync to currentUser profile if applicable
    if (currentUser && currentUser.id) {
      updateUserProfile({
        id: currentUser.id,
        enterpriseName: updated.enterpriseName,
        phone: updated.phone,
        address: updated.address,
        godownAddress: updated.godownAddress,
        alternatePhone: updated.alternatePhone,
      });
    }

    setIsSuccess(true);
    if (onSaved) {
      onSaved(updated);
    }
    setTimeout(() => {
      setIsSuccess(false);
      onClose();
    }, 1000);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-700/80 rounded-2xl w-full max-w-2xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden font-sans">
        {/* Header */}
        <div className="px-5 py-4 bg-slate-950 border-b border-slate-800 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-white">
                {language === 'bn' ? 'অফিশিয়াল প্যাড ও ঠিকানা সেটিংস' : 'Official Pad & Business Profile'}
              </h2>
              <p className="text-xs text-slate-400">
                {language === 'bn'
                  ? 'পিডিএফ রিপোর্ট ও চালানে প্রতিষ্ঠানের নাম, ঠিকানা ও গুদামঘরের তথ্য'
                  : 'Customize company info, address & warehouse on PDF reports & invoices'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Form */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 space-y-4">
          {isSuccess && (
            <div className="p-3 bg-emerald-950/80 border border-emerald-500/40 rounded-xl text-emerald-300 text-sm flex items-center gap-2.5 animate-in fade-in">
              <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
              <span>
                {language === 'bn'
                  ? 'অফিশিয়াল তথ্য ও প্যাড সেটিংস সফলভাবে সংরক্ষিত হয়েছে!'
                  : 'Official info and pad settings saved successfully!'}
              </span>
            </div>
          )}

          {/* Business Core Info */}
          <div className="space-y-3 bg-slate-950/60 p-4 rounded-xl border border-slate-800">
            <h3 className="text-xs font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-2">
              <Building2 className="w-4 h-4" />
              <span>{language === 'bn' ? 'প্রতিষ্ঠানের পরিচিতি' : 'Company Identification'}</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  {language === 'bn' ? 'প্রতিষ্ঠানের নাম *' : 'Enterprise Name *'}
                </label>
                <div className="relative">
                  <input
                    type="text"
                    required
                    value={profile.enterpriseName}
                    onChange={(e) => handleChange('enterpriseName', e.target.value)}
                    placeholder="মেসার্স পাইকারি ট্রেডিং কর্পোরেশন"
                    className="w-full pl-3 pr-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-sm text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  {language === 'bn' ? 'স্বত্বাধিকারী / পরিচালক' : 'Proprietor / Director'}
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={profile.proprietorName}
                    onChange={(e) => handleChange('proprietorName', e.target.value)}
                    placeholder="জনাব মোহাম্মদ করিম"
                    className="w-full pl-3 pr-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-sm text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                {language === 'bn' ? 'ট্যাগলাইন / স্লোগান' : 'Tagline / Slogan'}
              </label>
              <input
                type="text"
                value={profile.tagline || ''}
                onChange={(e) => handleChange('tagline', e.target.value)}
                placeholder="পাইকারি ও খুচরা পরিবেশক এবং ডিলার"
                className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-sm text-white focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          {/* Location & Warehouse Info */}
          <div className="space-y-3 bg-slate-950/60 p-4 rounded-xl border border-slate-800">
            <h3 className="text-xs font-bold text-sky-400 uppercase tracking-wider flex items-center gap-2">
              <MapPin className="w-4 h-4" />
              <span>{language === 'bn' ? 'ঠিকানা ও গুদামঘর (Warehouse)' : 'Office & Warehouse Address'}</span>
            </h3>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                {language === 'bn' ? 'প্রধান কার্যালয় / শোরুমের ঠিকানা *' : 'Main Office / Showroom Address *'}
              </label>
              <textarea
                required
                rows={2}
                value={profile.address}
                onChange={(e) => handleChange('address', e.target.value)}
                placeholder="মৌলভীবাজার বাণিজ্যিক এলাকা, ঢাকা-১২০০"
                className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-sm text-white focus:outline-none focus:border-emerald-500 resize-none"
              />
              <span className="text-[11px] text-slate-400">
                {language === 'bn'
                  ? 'এই ঠিকানাটি চালানের হেডারে প্রদর্শিত হবে।'
                  : 'This address will appear prominently on the PDF invoice header.'}
              </span>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1 flex items-center justify-between">
                <span>{language === 'bn' ? 'গুদামঘর / ডিপোর ঠিকানা (Warehouse / Godown)' : 'Godown / Depot Address'}</span>
                <span className="text-[10px] text-emerald-400 font-semibold">{language === 'bn' ? 'প্রয়োজনীয়' : 'Important'}</span>
              </label>
              <textarea
                rows={2}
                value={profile.godownAddress || ''}
                onChange={(e) => handleChange('godownAddress', e.target.value)}
                placeholder="গুদাম নং ৪, কদমতলী পাইকারি ডিপো এলাকা"
                className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-sm text-white focus:outline-none focus:border-emerald-500 resize-none"
              />
              <span className="text-[11px] text-slate-400">
                {language === 'bn'
                  ? 'গুদামের ঠিকানা পিডিএফে স্পষ্ট আলাদা লাইনে জায়গা নিয়ে মুদ্রিত হবে।'
                  : 'Warehouse address will be formatted cleanly in its own dedicated section.'}
              </span>
            </div>
          </div>

          {/* Contact Information */}
          <div className="space-y-3 bg-slate-950/60 p-4 rounded-xl border border-slate-800">
            <h3 className="text-xs font-bold text-amber-400 uppercase tracking-wider flex items-center gap-2">
              <Phone className="w-4 h-4" />
              <span>{language === 'bn' ? 'মোবাইল ও যোগাযোগ' : 'Contact Numbers & Email'}</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  {language === 'bn' ? 'প্রধান মোবাইল নাম্বার *' : 'Primary Mobile *'}
                </label>
                <input
                  type="text"
                  required
                  value={profile.phone}
                  onChange={(e) => handleChange('phone', e.target.value)}
                  placeholder="০১৭১১-xxxxxx"
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-sm text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  {language === 'bn' ? 'বিকল্প মোবাইল নাম্বার (Optional)' : 'Alternate Mobile'}
                </label>
                <input
                  type="text"
                  value={profile.alternatePhone || ''}
                  onChange={(e) => handleChange('alternatePhone', e.target.value)}
                  placeholder="০১৮১১-xxxxxx"
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-sm text-white focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                {language === 'bn' ? 'অফিশিয়াল ইমেইল (Optional)' : 'Official Email'}
              </label>
              <input
                type="email"
                value={profile.email || ''}
                onChange={(e) => handleChange('email', e.target.value)}
                placeholder="info@wholesale.com"
                className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-sm text-white focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          {/* Letterhead and Spacing Preferences */}
          <div className="space-y-3 bg-slate-950/60 p-4 rounded-xl border border-slate-800">
            <h3 className="text-xs font-bold text-purple-400 uppercase tracking-wider flex items-center gap-2">
              <Sliders className="w-4 h-4" />
              <span>{language === 'bn' ? 'প্যাডের ধরন ও ফাঁকা জায়গা (Padding/Spacing)' : 'Pad Style & Spacing Clearance'}</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => handleChange('padType', 'standard_pad')}
                className={`p-3 rounded-xl border text-left transition ${
                  profile.padType === 'standard_pad' || profile.padType === ('standard' as any)
                    ? 'bg-emerald-950/40 border-emerald-500 text-white'
                    : 'bg-slate-900 border-slate-800 text-slate-300 hover:border-slate-700'
                }`}
              >
                <div className="font-bold text-xs flex items-center justify-between mb-1">
                  <span>{language === 'bn' ? 'ডিজিটাল প্যাড (পূর্ণাঙ্গ হেডার)' : 'Digital Full Pad'}</span>
                  {(profile.padType === 'standard_pad' || profile.padType === ('standard' as any)) && <CheckCircle2 className="w-4 h-4 text-emerald-400" />}
                </div>
                <div className="text-[11px] text-slate-400">
                  {language === 'bn'
                    ? 'প্রতিষ্ঠানের নাম, ঠিকানা, গুদাম ও ফোন নম্বর সরাসরি পিডিএফে সুন্দরভাবে প্রিন্ট হবে।'
                    : 'Company name, address, warehouse & phone printed directly on PDF.'}
                </div>
              </button>

              <button
                type="button"
                onClick={() => handleChange('padType', 'custom_letterhead')}
                className={`p-3 rounded-xl border text-left transition ${
                  profile.padType === 'custom_letterhead'
                    ? 'bg-emerald-950/40 border-emerald-500 text-white'
                    : 'bg-slate-900 border-slate-800 text-slate-300 hover:border-slate-700'
                }`}
              >
                <div className="font-bold text-xs flex items-center justify-between mb-1">
                  <span>{language === 'bn' ? 'ছাপানো প্যাড (লেটারহেড ফাঁকা স্পেস)' : 'Pre-printed Letterhead Pad'}</span>
                  {profile.padType === 'custom_letterhead' && <CheckCircle2 className="w-4 h-4 text-emerald-400" />}
                </div>
                <div className="text-[11px] text-slate-400">
                  {language === 'bn'
                    ? 'আপনার আগে থেকে ছাপানো নিজস্ব অফিস প্যাডের জন্য উপরে ফাঁকা জায়গা ছেড়ে প্রিন্ট হবে।'
                    : 'Leaves clearance at top for pre-printed letterhead paper.'}
                </div>
              </button>
            </div>

            {/* Spacing Control Slider */}
            <div>
              <div className="flex items-center justify-between text-xs font-medium text-slate-300 mb-1.5">
                <span>{language === 'bn' ? 'প্যাডের উপরের ফাঁকা জায়গা (মার্জিন):' : 'Top Clearance Spacing:'}</span>
                <span className="font-mono text-emerald-400 font-bold">{profile.padTopSpacing || 0} px</span>
              </div>
              <input
                type="range"
                min="0"
                max="250"
                step="10"
                value={profile.padTopSpacing || 0}
                onChange={(e) => handleChange('padTopSpacing', parseInt(e.target.value, 10))}
                className="w-full accent-emerald-500 cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-slate-500 mt-1">
                <span>0px (সাধারণ প্যাড)</span>
                <span>100px</span>
                <span>150px (প্রি-প্রিন্টেড প্যাড)</span>
                <span>250px</span>
              </div>
            </div>
          </div>
        </form>

        {/* Footer Actions */}
        <div className="px-5 py-3.5 bg-slate-950 border-t border-slate-800 flex items-center justify-end gap-2.5 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold transition"
          >
            {language === 'bn' ? 'বাতিল' : 'Cancel'}
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-md shadow-emerald-950/40 transition active:scale-95"
          >
            <Save className="w-4 h-4" />
            <span>{language === 'bn' ? 'তথ্য সেভ করুন' : 'Save Business Details'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
