import { BusinessProfile, UserProfile } from '../types';

export const DEFAULT_BUSINESS_PROFILE: BusinessProfile = {
  enterpriseName: 'মাতৃছায়া টেলিকম',
  proprietorName: 'মো: রফিকুল ইসলাম',
  address: 'চকবাজার পাইকারি মার্কেট, দোকান নং-১২/এ, ঢাকা-১২১১',
  godownAddress: 'গুদামঘর: গোডাউন রোড, প্লট নং-৪৫, তেজগাঁও বাণিজ্যিক এলাকা, ঢাকা',
  phone: '01937200635',
  alternatePhone: '01811234567',
  email: 'matrichaya.telecom@gmail.com',
  tagline: 'সকল প্রকার মোবাইল ও ইলেকট্রনিক্স এক্সেসরিজের নির্ভরযোগ্য পাইকারি পরিবেশক',
  padType: 'standard_pad',
  padTopSpacing: 0,
};

const STORAGE_KEY = 'ws_business_profile';

export const getStoredBusinessProfile = (): BusinessProfile => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    let profile = { ...DEFAULT_BUSINESS_PROFILE };
    
    if (stored) {
      const parsed = JSON.parse(stored);
      profile = { ...profile, ...parsed };
    }

    // Always check if admin user in ws_users or ws_current_user has the official business address
    // User requirement: "অফিসিয়াল পেড এর ঠিকানা এডমিন যে ঠিকানাটা ব্যবহার করবে সেইটাই ডিএসআর ও ক্যাশ কাউন্টার পেডে একটি ঠিকানা অটোমেটিক্যালি আসবো"
    const rawUsers = localStorage.getItem('ws_users');
    let admin: UserProfile | undefined;
    if (rawUsers) {
      try {
        const users: UserProfile[] = JSON.parse(rawUsers);
        admin = users.find((u) => u.role === 'admin' || u.id === 'usr_admin');
      } catch (e) {
        // Ignore JSON error
      }
    }

    if (!admin) {
      const rawCurrentUser = localStorage.getItem('ws_current_user');
      if (rawCurrentUser) {
        try {
          const curr = JSON.parse(rawCurrentUser);
          if (curr.role === 'admin' || curr.id === 'usr_admin') {
            admin = curr;
          }
        } catch (e) {}
      }
    }

    if (admin) {
      if (admin.enterpriseName || admin.shopName) {
        profile.enterpriseName = (admin.enterpriseName || admin.shopName || profile.enterpriseName).trim();
      }
      if (admin.name && admin.name !== 'Admin') {
        profile.proprietorName = admin.name.trim();
      }
      if (admin.phone) {
        profile.phone = admin.phone.trim();
      }
      if (admin.address && admin.address.trim()) {
        profile.address = admin.address.trim();
      }
      if (admin.godownAddress && admin.godownAddress.trim()) {
        profile.godownAddress = admin.godownAddress.trim();
      }
      if (admin.alternatePhone) {
        profile.alternatePhone = admin.alternatePhone.trim();
      }
    }

    return profile;
  } catch (err) {
    console.error('Failed to read stored business profile:', err);
    return DEFAULT_BUSINESS_PROFILE;
  }
};

export const saveStoredBusinessProfile = (updates: Partial<BusinessProfile>): BusinessProfile => {
  try {
    const current = getStoredBusinessProfile();
    const updated: BusinessProfile = {
      ...current,
      ...updates,
      // Ensure strings are trimmed
      enterpriseName: updates.enterpriseName?.trim() || current.enterpriseName,
      proprietorName: updates.proprietorName?.trim() || current.proprietorName,
      address: updates.address?.trim() || current.address,
      godownAddress: updates.godownAddress?.trim() || current.godownAddress,
      phone: updates.phone?.trim() || current.phone,
      alternatePhone: updates.alternatePhone !== undefined ? updates.alternatePhone.trim() : current.alternatePhone,
      email: updates.email !== undefined ? updates.email.trim() : current.email,
      tagline: updates.tagline !== undefined ? updates.tagline.trim() : current.tagline,
      padType: updates.padType || current.padType,
      padTopSpacing: typeof updates.padTopSpacing === 'number' ? Math.max(0, updates.padTopSpacing) : current.padTopSpacing,
    };

    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));

    // Synchronize with ws_users
    try {
      const rawUsers = localStorage.getItem('ws_users');
      if (rawUsers) {
        const users: UserProfile[] = JSON.parse(rawUsers);
        const adminIdx = users.findIndex((u) => u.role === 'admin' || u.id === 'usr_admin');
        if (adminIdx >= 0) {
          users[adminIdx] = {
            ...users[adminIdx],
            enterpriseName: updated.enterpriseName,
            shopName: updated.enterpriseName,
            phone: updated.phone,
            address: updated.address,
            godownAddress: updated.godownAddress,
            alternatePhone: updated.alternatePhone,
          };
          localStorage.setItem('ws_users', JSON.stringify(users));
        }
      }

      // Also sync ws_current_user if admin
      const rawCurrentUser = localStorage.getItem('ws_current_user');
      if (rawCurrentUser) {
        const curr = JSON.parse(rawCurrentUser);
        if (curr.role === 'admin' || curr.id === 'usr_admin') {
          const updatedCurr = {
            ...curr,
            enterpriseName: updated.enterpriseName,
            shopName: updated.enterpriseName,
            phone: updated.phone,
            address: updated.address,
            godownAddress: updated.godownAddress,
            alternatePhone: updated.alternatePhone,
          };
          localStorage.setItem('ws_current_user', JSON.stringify(updatedCurr));
        }
      }
    } catch (e) {
      console.warn('Failed to sync business profile to user records:', e);
    }

    // Trigger update event
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('business-profile-updated', { detail: updated }));
    }

    return updated;
  } catch (err) {
    console.error('Failed to save business profile:', err);
    return getStoredBusinessProfile();
  }
};
