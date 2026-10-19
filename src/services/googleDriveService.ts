import {
  signInWithPopup,
  GoogleAuthProvider,
  onAuthStateChanged,
  signOut,
  User,
} from 'firebase/auth';
import { auth, googleProvider } from '../lib/firebase';

// Required Google Drive scope for application backups
export const DRIVE_SCOPES = ['https://www.googleapis.com/auth/drive.file'];

const STORAGE_TOKEN_KEY = 'ws_gdrive_access_token';
const STORAGE_USER_KEY = 'ws_gdrive_user';
const STORAGE_SAVED_AT_KEY = 'ws_gdrive_token_saved_at';

// Memory cache with fallback to local persistent storage
let cachedAccessToken: string | null = null;
let isSigningIn = false;

// Ensure Google Drive scope is added to the provider and prompt account selection for any Gmail
try {
  googleProvider.addScope('https://www.googleapis.com/auth/drive.file');
  googleProvider.setCustomParameters({ prompt: 'select_account' });
} catch {
  // Scope already attached
}

export interface GoogleDriveBackupFile {
  id: string;
  name: string;
  size?: string;
  createdTime?: string;
  modifiedTime?: string;
  webViewLink?: string;
}

export interface GoogleDriveAuthState {
  isConnected: boolean;
  user: User | { email: string | null; displayName: string | null; photoURL: string | null; uid?: string } | null;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
}

// Get active in-memory or persisted access token
export const getDriveAccessToken = (): string | null => {
  if (cachedAccessToken) return cachedAccessToken;
  if (typeof window !== 'undefined') {
    try {
      const stored = localStorage.getItem(STORAGE_TOKEN_KEY);
      if (stored) {
        cachedAccessToken = stored;
        return stored;
      }
    } catch {}
  }
  return null;
};

// Check if currently connected with Google Drive
export const isGoogleDriveConnected = (): boolean => {
  return Boolean(getDriveAccessToken());
};

// Retrieve stored Google account info
export const getStoredGoogleAccount = (): { email: string | null; displayName: string | null; photoURL: string | null } => {
  if (typeof window === 'undefined') return { email: null, displayName: null, photoURL: null };
  try {
    const raw = localStorage.getItem(STORAGE_USER_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return { email: null, displayName: null, photoURL: null };
};

// Initialize Auth listener to sync Google Auth state
export const initGoogleDriveAuth = (
  onStateChange: (state: GoogleDriveAuthState) => void
): (() => void) => {
  // First notify using persisted storage so the app connects instantly upon open
  const storedToken = getDriveAccessToken();
  const storedUser = getStoredGoogleAccount();

  if (storedToken && storedUser.email) {
    onStateChange({
      isConnected: true,
      user: storedUser as any,
      email: storedUser.email,
      displayName: storedUser.displayName || 'Google Drive User',
      photoURL: storedUser.photoURL,
    });
  }

  // Subscribe to Firebase Auth state
  return onAuthStateChanged(auth, async (user: User | null) => {
    const activeToken = getDriveAccessToken();

    if (user && activeToken) {
      const uData = {
        email: user.email,
        displayName: user.displayName,
        photoURL: user.photoURL,
        uid: user.uid,
      };
      if (typeof window !== 'undefined') {
        localStorage.setItem(STORAGE_USER_KEY, JSON.stringify(uData));
      }
      onStateChange({
        isConnected: true,
        user,
        email: user.email,
        displayName: user.displayName,
        photoURL: user.photoURL,
      });
    } else if (activeToken && storedUser.email) {
      // Retain connection state using persisted token & user data even if Firebase Auth session refreshed
      onStateChange({
        isConnected: true,
        user: storedUser as any,
        email: storedUser.email,
        displayName: storedUser.displayName || 'Google Drive User',
        photoURL: storedUser.photoURL,
      });
    } else {
      if (!isSigningIn) {
        cachedAccessToken = null;
        if (typeof window !== 'undefined') {
          localStorage.removeItem(STORAGE_TOKEN_KEY);
          localStorage.removeItem(STORAGE_USER_KEY);
        }
      }
      onStateChange({
        isConnected: false,
        user: null,
        email: null,
        displayName: null,
        photoURL: null,
      });
    }
  });
};

// Sign in with ANY Google account to obtain Google Drive OAuth Access Token
export const connectGoogleDrive = async (): Promise<
  { user: User; accessToken: string } | { cancelled: true } | null
> => {
  isSigningIn = true;
  try {
    googleProvider.setCustomParameters({ prompt: 'select_account' });
    const result = await signInWithPopup(auth, googleProvider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (!credential?.accessToken) {
      throw new Error('Google Drive access token not received from Google');
    }

    cachedAccessToken = credential.accessToken;
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_TOKEN_KEY, credential.accessToken);
      localStorage.setItem(STORAGE_SAVED_AT_KEY, String(Date.now()));
      localStorage.setItem(
        STORAGE_USER_KEY,
        JSON.stringify({
          email: result.user.email,
          displayName: result.user.displayName,
          photoURL: result.user.photoURL,
          uid: result.user.uid,
        })
      );
      // Automatically enable auto-sync on successful connection
      localStorage.setItem('ws_gdrive_auto_sync', 'true');
    }

    return { user: result.user, accessToken: cachedAccessToken };
  } catch (error: any) {
    const errorCode = error?.code || '';
    const errorMsg = error?.message || '';

    // Gracefully handle user closing or dismissing the popup
    if (
      errorCode === 'auth/popup-closed-by-user' ||
      errorCode === 'auth/cancelled-popup-request' ||
      errorMsg.includes('popup-closed-by-user') ||
      errorMsg.includes('cancelled-popup-request')
    ) {
      console.warn('Google sign-in popup was closed by user.');
      return { cancelled: true };
    }

    if (errorCode === 'auth/popup-blocked' || errorMsg.includes('popup-blocked')) {
      console.warn('Google sign-in popup was blocked by browser.');
      throw new Error('ব্রাউজার দ্বারা গুগল সাইন-ইন উইন্ডো ব্লক হয়েছে। দয়া করে ব্রাউজারের পপআপ এলাউ (Allow) করুন।');
    }

    console.warn('Google Drive sign-in notice:', errorMsg || error);
    throw error;
  } finally {
    isSigningIn = false;
  }
};

// Disconnect / Sign out from Google Drive
export const disconnectGoogleDrive = async (): Promise<void> => {
  cachedAccessToken = null;
  if (typeof window !== 'undefined') {
    localStorage.removeItem(STORAGE_TOKEN_KEY);
    localStorage.removeItem(STORAGE_USER_KEY);
    localStorage.removeItem(STORAGE_SAVED_AT_KEY);
    localStorage.setItem('ws_gdrive_auto_sync', 'false');
  }
  try {
    await signOut(auth);
  } catch (err) {
    console.warn('Sign out exception:', err);
  }
};

// Find or create dedicated folder 'Matrichaya_ERP_Cloud_Backups' in user's Google Drive
export const getOrCreateBackupFolder = async (accessToken: string): Promise<string> => {
  const folderName = 'Matrichaya_ERP_Cloud_Backups';

  // 1. Search if folder already exists
  const query = encodeURIComponent(`name = '${folderName}' and mimeType = 'application/vnd.google-apps.folder' and trashed = false`);
  const searchRes = await fetch(
    `https://www.googleapis.com/drive/v3/files?q=${query}&fields=files(id,name)`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }
  );

  if (searchRes.ok) {
    const searchData = await searchRes.json();
    if (searchData.files && searchData.files.length > 0) {
      return searchData.files[0].id;
    }
  }

  // 2. Folder does not exist, create it
  const createRes = await fetch('https://www.googleapis.com/drive/v3/files', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      name: folderName,
      mimeType: 'application/vnd.google-apps.folder',
      description: 'Automated 15GB Cloud Backup & Multi-Device Sync for Matrichaya Wholesale ERP',
    }),
  });

  if (!createRes.ok) {
    const err = await createRes.json();
    throw new Error(err.error?.message || 'Failed to create Google Drive backup folder');
  }

  const folderData = await createRes.json();
  return folderData.id;
};

// Retrieve Folder URL and ID
export const getBackupFolderInfo = async (accessToken: string): Promise<{ id: string; url: string }> => {
  const folderId = await getOrCreateBackupFolder(accessToken);
  return {
    id: folderId,
    url: `https://drive.google.com/drive/folders/${folderId}`,
  };
};

// Query Google Drive Storage Quota
export const getDriveStorageInfo = async (): Promise<{ limit: number; usage: number; percent: number } | null> => {
  const token = getDriveAccessToken();
  if (!token) return null;
  try {
    const res = await fetch('https://www.googleapis.com/drive/v3/about?fields=storageQuota', {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) return null;
    const data = await res.json();
    if (data.storageQuota) {
      const limit = Number(data.storageQuota.limit) || 15 * 1024 * 1024 * 1024; // 15 GB default
      const usage = Number(data.storageQuota.usage) || 0;
      const percent = limit > 0 ? Math.min(100, Math.round((usage / limit) * 100)) : 0;
      return { limit, usage, percent };
    }
    return null;
  } catch {
    return null;
  }
};

// Upload or Update Master Sync File in Google Drive
export const uploadBackupToGoogleDrive = async (
  backupData: any,
  fileName?: string
): Promise<{ success: boolean; file: GoogleDriveBackupFile; message: string }> => {
  const token = getDriveAccessToken();
  if (!token) {
    throw new Error('Google Drive সংযুক্ত নেই। দয়া করে যে কোনো জিমেইল দিয়ে গুগল ড্রাইভে সাইন-ইন করুন।');
  }

  const folderId = await getOrCreateBackupFolder(token);
  const now = new Date();
  const dateStr = now.toISOString().slice(0, 10);
  const timeStr = now.toTimeString().slice(0, 8).replace(/:/g, '-');
  const finalFileName = fileName || `matrichaya_erp_backup_${dateStr}_${timeStr}.json`;

  const fileContent = JSON.stringify(backupData, null, 2);

  // 1. Maintain a permanent master sync file 'matrichaya_telecom_erp_master_sync.json'
  // for instant multi-device syncing across devices
  try {
    const masterName = 'matrichaya_telecom_erp_master_sync.json';
    const query = encodeURIComponent(`name = '${masterName}' and '${folderId}' in parents and trashed = false`);
    const searchMaster = await fetch(
      `https://www.googleapis.com/drive/v3/files?q=${query}&fields=files(id,name)`,
      { headers: { Authorization: `Bearer ${token}` } }
    );

    if (searchMaster.ok) {
      const sData = await searchMaster.json();
      if (sData.files && sData.files.length > 0) {
        // Update existing master sync file
        const masterFileId = sData.files[0].id;
        await fetch(
          `https://www.googleapis.com/upload/drive/v3/files/${masterFileId}?uploadType=media`,
          {
            method: 'PATCH',
            headers: {
              Authorization: `Bearer ${token}`,
              'Content-Type': 'application/json; charset=UTF-8',
            },
            body: fileContent,
          }
        );
      } else {
        // Create master sync file
        await createDriveFile(token, folderId, masterName, fileContent, 'Master live multi-device ERP database');
      }
    }
  } catch (e) {
    console.warn('Master sync update non-fatal note:', e);
  }

  // 2. Also save timestamped version for restore history
  const createdFile = await createDriveFile(
    token,
    folderId,
    finalFileName,
    fileContent,
    `Point-in-time ERP Backup from ${backupData?.createdByName || 'User'}`
  );

  return {
    success: true,
    file: createdFile,
    message: `গুগল ড্রাইভে '${finalFileName}' এবং মাস্টার সিঙ্ক ফাইলে সফলভাবে সংরক্ষিত হয়েছে!`,
  };
};

// Helper to create a file with multipart upload
async function createDriveFile(
  token: string,
  folderId: string,
  fileName: string,
  content: string,
  description: string
): Promise<GoogleDriveBackupFile> {
  const metadata = {
    name: fileName,
    parents: [folderId],
    description,
    mimeType: 'application/json',
  };

  const boundary = '-------matrichayabackupboundary314159';
  const delimiter = `\r\n--${boundary}\r\n`;
  const closeDelimiter = `\r\n--${boundary}--`;

  const multipartRequestBody =
    delimiter +
    'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
    JSON.stringify(metadata) +
    delimiter +
    'Content-Type: application/json\r\n\r\n' +
    content +
    closeDelimiter;

  const uploadRes = await fetch(
    'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,size,createdTime,webViewLink',
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': `multipart/related; boundary=${boundary}`,
      },
      body: multipartRequestBody,
    }
  );

  if (!uploadRes.ok) {
    const err = await uploadRes.json();
    throw new Error(err.error?.message || 'Failed to upload backup to Google Drive');
  }

  return await uploadRes.json();
}

// List existing backups in Google Drive folder
export const listGoogleDriveBackups = async (): Promise<GoogleDriveBackupFile[]> => {
  const token = getDriveAccessToken();
  if (!token) return [];

  try {
    const folderId = await getOrCreateBackupFolder(token);
    const query = encodeURIComponent(`'${folderId}' in parents and trashed = false`);
    const res = await fetch(
      `https://www.googleapis.com/drive/v3/files?q=${query}&fields=files(id,name,size,createdTime,modifiedTime,webViewLink)&orderBy=createdTime desc&pageSize=30`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    if (!res.ok) return [];
    const data = await res.json();
    return data.files || [];
  } catch (err) {
    console.warn('listGoogleDriveBackups error:', err);
    return [];
  }
};

// Download backup file content from Google Drive
export const downloadBackupFromGoogleDrive = async (fileId: string): Promise<any> => {
  const token = getDriveAccessToken();
  if (!token) {
    throw new Error('Google Drive সংযুক্ত নেই');
  }

  const res = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!res.ok) {
    throw new Error('Failed to download backup file from Google Drive');
  }

  return await res.json();
};

// Pull the latest master sync data from Google Drive for cross-device update
export const pullLatestGoogleDriveData = async (): Promise<{ success: boolean; data?: any; filename?: string; message: string }> => {
  const token = getDriveAccessToken();
  if (!token) {
    throw new Error('গুগল ড্রাইভ কানেক্টেড নেই। দয়া করে যে কোনো জিমেইল একাউন্ট দিয়ে কানেক্ট করুন।');
  }

  const folderId = await getOrCreateBackupFolder(token);

  // 1. First look for master sync file
  const masterQuery = encodeURIComponent(`name = 'matrichaya_telecom_erp_master_sync.json' and '${folderId}' in parents and trashed = false`);
  const masterRes = await fetch(
    `https://www.googleapis.com/drive/v3/files?q=${masterQuery}&fields=files(id,name,modifiedTime)`,
    { headers: { Authorization: `Bearer ${token}` } }
  );

  if (masterRes.ok) {
    const mData = await masterRes.json();
    if (mData.files && mData.files.length > 0) {
      const fileId = mData.files[0].id;
      const content = await downloadBackupFromGoogleDrive(fileId);
      return {
        success: true,
        data: content,
        filename: mData.files[0].name,
        message: 'গুগল ড্রাইভের মাস্টার ফাইল থেকে সফলভাবে সর্বশেষ ডাটা ডাউনলোড করা হয়েছে!',
      };
    }
  }

  // 2. Fallback: get the most recent backup in the folder
  const backups = await listGoogleDriveBackups();
  if (backups.length > 0) {
    const latest = backups[0];
    const content = await downloadBackupFromGoogleDrive(latest.id);
    return {
      success: true,
      data: content,
      filename: latest.name,
      message: `গুগল ড্রাইভের '${latest.name}' ফাইল থেকে সর্বশেষ ডাটা ডাউনলোড করা হয়েছে!`,
    };
  }

  return {
    success: false,
    message: 'গুগল ড্রাইভে কোনো ব্যাকআপ বা মাস্টার সিঙ্ক ফাইল পাওয়া যায়নি।',
  };
};

// Delete a backup file from Google Drive (Requires explicit UI confirmation before calling)
export const deleteBackupFromGoogleDrive = async (fileId: string): Promise<void> => {
  const token = getDriveAccessToken();
  if (!token) throw new Error('Google Drive সংযুক্ত নেই');

  const res = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}`, {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error?.message || 'Failed to delete file from Google Drive');
  }
};
