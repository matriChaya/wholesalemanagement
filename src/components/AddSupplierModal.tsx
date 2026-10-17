import React, { useState } from 'react';
import { useWholesale } from '../context/WholesaleContext';
import { translations } from '../utils/translations';
import { Supplier } from '../types';
import { PhoneInputWithContactPicker } from './PhoneInputWithContactPicker';
import {
  Building2,
  Plus,
  X,
  Phone,
  MapPin,
  CreditCard,
  User,
  CheckCircle2,
  DollarSign
} from 'lucide-react';

interface AddSupplierModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSupplierAdded?: (supplier: Supplier) => void;
}

export const AddSupplierModal: React.FC<AddSupplierModalProps> = ({
  isOpen,
  onClose,
  onSupplierAdded,
}) => {
  const { language, addSupplier } = useWholesale();
  const t = translations[language];

  const [company, setCompany] = useState<string>('');
  const [name, setName] = useState<string>('');
  const [phone, setPhone] = useState<string>('');
  const [address, setAddress] = useState<string>('');
  const [bankDetails, setBankDetails] = useState<string>('');
  const [paymentTerms, setPaymentTerms] = useState<string>('Net 15');
  const [openingPayable, setOpeningPayable] = useState<number>(0);
  const [openingDate, setOpeningDate] = useState<string>(() => new Date().toISOString().split('T')[0]);
  const [openingNotes, setOpeningNotes] = useState<string>('');
  const [isSuccess, setIsSuccess] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    const cleanCompany = company.trim();
    const cleanPhone = phone.trim();

    if (!cleanCompany) {
      setErrorMsg(language === 'bn' ? 'কোম্পানি বা প্রতিষ্ঠানের নাম লিখুন।' : 'Company name is required.');
      return;
    }
    if (!cleanPhone) {
      setErrorMsg(language === 'bn' ? 'মোবাইল বা ফোন নম্বর লিখুন।' : 'Phone number is required.');
      return;
    }

    const newSupplier = addSupplier({
      company: cleanCompany,
      bnCompany: cleanCompany,
      name: name.trim() || cleanCompany,
      bnName: name.trim() || cleanCompany,
      phone: cleanPhone,
      address: address.trim() || 'Local Depot',
      bankDetails: bankDetails.trim() || undefined,
      paymentTerms: paymentTerms || 'Net 15',
      openingBalance: Number(openingPayable) || 0,
      openingDate: openingDate || new Date().toISOString().split('T')[0],
      openingNotes: openingNotes.trim() || (language === 'bn' ? 'হিসাব শুরুর ওপেন ডিও / প্রারম্ভিক বকেয়া' : 'Initial Opening DO Due'),
      outstandingPayable: Number(openingPayable) || 0,
      totalPurchases: 0,
      totalPaid: 0,
    });

    setIsSuccess(true);
    setTimeout(() => {
      setIsSuccess(false);
      if (onSupplierAdded) {
        onSupplierAdded(newSupplier);
      }
      onClose();
    }, 800);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/90">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-indigo-500 to-purple-600 flex items-center justify-center text-white shadow-lg shadow-indigo-950/40">
              <Building2 className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-white text-sm sm:text-base">
                {language === 'bn' ? 'নতুন সাপ্লায়ার / কোম্পানি যুক্ত করুন' : 'Add New Supplier / Company'}
              </h3>
              <p className="text-[11px] text-slate-400">
                {language === 'bn' ? 'পাইকারি মিল, কোম্পানি বা ডিপোর তথ্য' : 'Wholesale mill, agency or manufacturer'}
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

          {/* Company Name */}
          <div className="space-y-1">
            <label className="text-slate-300 font-bold block">
              {language === 'bn' ? 'কোম্পানি / মিল / এজেন্সির নাম *' : 'Company / Mill / Brand Name *'}
            </label>
            <div className="relative">
              <Building2 className="w-4 h-4 text-indigo-400 absolute left-3 top-2.5" />
              <input
                type="text"
                required
                id="input-supplier-company"
                value={company}
                onChange={(e) => setCompany(e.target.value)}
                placeholder={language === 'bn' ? 'যেমন: গ্রামীণফোন / সিম কোম্পানি / এক্সেসরিজ সাপ্লায়ার' : 'e.g. Telecom / Mobile Accessories Supplier'}
                className="w-full pl-9 pr-3 py-2 bg-slate-950 border border-slate-700 focus:border-indigo-500 rounded-xl text-white focus:outline-none"
              />
            </div>
          </div>

          {/* Contact Person & Phone */}
          <div className="grid grid-cols-2 gap-2.5">
            <div className="space-y-1">
              <label className="text-slate-300 font-bold block">
                {language === 'bn' ? 'প্রতিনিধি / সেলস অফিসার' : 'Contact Person'}
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder={language === 'bn' ? 'যেমন: আরিফুল ইসলাম' : 'e.g. Ariful Islam'}
                  className="w-full pl-9 pr-3 py-2 bg-slate-950 border border-slate-700 focus:border-indigo-500 rounded-xl text-white focus:outline-none"
                />
              </div>
            </div>

            <PhoneInputWithContactPicker
              label={language === 'bn' ? 'মোবাইল নম্বর' : 'Phone Number'}
              id="input-supplier-phone"
              required
              value={phone}
              onChange={(newPhone) => setPhone(newPhone)}
              onSelectContactInfo={(info) => {
                setPhone(info.phone);
                if (!name && info.name) setName(info.name);
                if (!company && info.organization) setCompany(info.organization);
                if (!address && info.address) setAddress(info.address);
              }}
              placeholder="017XXXXXXXX"
            />
          </div>

          {/* Address & Opening Balance */}
          <div className="grid grid-cols-2 gap-2.5">
            <div className="space-y-1">
              <label className="text-slate-300 font-bold block">
                {language === 'bn' ? 'ডিপো / অফিস ঠিকানা' : 'Depot / Office Address'}
              </label>
              <div className="relative">
                <MapPin className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder={language === 'bn' ? 'যেমন: তেজগাঁও ডিপো, ঢাকা' : 'e.g. Tejgaon Depot, Dhaka'}
                  className="w-full pl-9 pr-3 py-2 bg-slate-950 border border-slate-700 focus:border-indigo-500 rounded-xl text-white focus:outline-none"
                />
              </div>
            </div>

            <div className="space-y-1 sm:col-span-2 p-3 bg-amber-950/20 border border-amber-800/40 rounded-xl space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-amber-300 font-bold text-xs flex items-center gap-1.5">
                  <span>🏢</span>
                  {language === 'bn' ? 'কোম্পানির ওপেন ডিও / হিসাব শুরুর প্রারম্ভিক বকেয়া (একবারই সেট হবে)' : 'Company Opening D.O. / Initial Due'}
                </label>
                <span className="text-[10px] text-slate-400">
                  {language === 'bn' ? 'যেকোনো সময় এডিট করা যাবে' : 'Editable anytime'}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="space-y-1">
                  <label className="text-[11px] text-slate-300 font-medium block">
                    {language === 'bn' ? 'ওপেন ডিও বকেয়া (টাকা ৳)' : 'Opening Due Amount (৳)'}
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-2 font-bold text-amber-400">৳</span>
                    <input
                      type="number"
                      min="0"
                      step="any"
                      value={openingPayable || ''}
                      onChange={(e) => setOpeningPayable(Number(e.target.value))}
                      placeholder="0"
                      className="w-full pl-8 pr-3 py-2 bg-slate-950 border border-slate-700 focus:border-amber-500 rounded-lg text-white font-mono font-bold focus:outline-none text-sm"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] text-slate-300 font-medium block">
                    {language === 'bn' ? 'হিসাব শুরুর তারিখ' : 'Opening Date'}
                  </label>
                  <input
                    type="date"
                    value={openingDate}
                    onChange={(e) => setOpeningDate(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 focus:border-amber-500 rounded-lg text-white font-mono focus:outline-none text-sm"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] text-slate-300 font-medium block">
                    {language === 'bn' ? 'বিবরণ / পূর্বের ডিও নোট' : 'Opening Notes / DO Ref'}
                  </label>
                  <input
                    type="text"
                    value={openingNotes}
                    onChange={(e) => setOpeningNotes(e.target.value)}
                    placeholder={language === 'bn' ? 'যেমন: ওপেন ডিও #১০৪২ বকেয়া' : 'e.g. Initial DO #1042 due'}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 focus:border-amber-500 rounded-lg text-white focus:outline-none text-sm"
                  />
                </div>
              </div>
              <p className="text-[10px] text-amber-400/80 leading-relaxed">
                {language === 'bn'
                  ? '💡 সফটওয়্যার চালুর পর এই একটি জায়গায়ই কোম্পানির হিসাব শুরুর ওপেন ডিও / পূর্বের বকেয়া সেট হবে। চালানের ভেতরে লেখা পূর্বের ডিও মূল ব্যালেন্সে যোগ বা কাউন্ট হবে না।'
                  : '💡 Only this single place defines the supplier opening balance. Previous DO notes on invoices will not be double-counted.'}
              </p>
            </div>
          </div>

          {/* Bank & Payment Info */}
          <div className="space-y-1">
            <label className="text-slate-300 font-bold block">
              {language === 'bn' ? 'ব্যাংক বা বিকাশ একাউন্ট (ঐচ্ছিক)' : 'Bank or bKash Account (Optional)'}
            </label>
            <div className="relative">
              <CreditCard className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={bankDetails}
                onChange={(e) => setBankDetails(e.target.value)}
                placeholder={language === 'bn' ? 'যেমন: DBBL A/C: 1102938491823 বা bKash: 017XXXX' : 'e.g. Bank A/C or bKash number'}
                className="w-full pl-9 pr-3 py-2 bg-slate-950 border border-slate-700 focus:border-indigo-500 rounded-xl text-white focus:outline-none font-mono"
              />
            </div>
          </div>

          {isSuccess && (
            <div className="p-3 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 font-bold flex items-center justify-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>{language === 'bn' ? 'সাপ্লায়ার সফলভাবে যুক্ত হয়েছে!' : 'Supplier added successfully!'}</span>
            </div>
          )}

          {/* Action Buttons */}
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
              id="btn-save-new-supplier"
              className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold transition shadow-lg shadow-indigo-950/40 flex items-center justify-center gap-1.5 active:scale-95"
            >
              <Plus className="w-4 h-4" />
              <span>{language === 'bn' ? 'সাপ্লায়ার সেভ করুন' : 'Save Supplier'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
