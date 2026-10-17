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

// In-memory access token cache (never stored in localStorage/sessionStorage per security guidelines)
let cachedAccessToken: string | null = null;
let isSigningIn = false;

// Ensure Google Drive scope is added to the provider
try {
  googleProvider.addScope('https://www.googleapis.com/auth/drive.file');
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
  user: User | null;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
}

// Initialize Auth listener to sync Google Auth state
export const initGoogleDriveAuth = (
  onStateChange: (state: GoogleDriveAuthState) => void
): (() => void) => {
  return onAuthStateChanged(auth, async (user: User | null) => {
    if (user && cachedAccessToken) {
      onStateChange({
        isConnected: true,
        user,
        email: user.email,
        displayName: user.displayName,
        photoURL: user.photoURL,
      });
    } else {
      if (!isSigningIn) {
        cachedAccessToken = null;
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

// Sign in with Google to obtain Google Drive OAuth Access Token
export const connectGoogleDrive = async (): Promise<
  { user: User; accessToken: string } | { cancelled: true } | null
> => {
  isSigningIn = true;
  try {
    const result = await signInWithPopup(auth, googleProvider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (!credential?.accessToken) {
      throw new Error('Google Drive access token not received');
    }

    cachedAccessToken = credential.accessToken;
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
      console.warn('Google sign-in popup was closed by user before completing sign-in.');
      return { cancelled: true };
    }

    // Gracefully handle popup blocked by browser
    if (errorCode === 'auth/popup-blocked' || errorMsg.includes('popup-blocked')) {
      console.warn('Google sign-in popup was blocked by browser.');
      throw new Error('ব্রাউজার দ্বারা গুগল সাইন-ইন পপআপ উইন্ডোটি ব্লক করা হয়েছে। দয়া করে ব্রাউজারের পপআপ এলাউ (Allow) করুন।');
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
  try {
    await signOut(auth);
  } catch (err) {
    console.warn('Sign out exception:', err);
  }
};

// Get active in-memory access token
export const getDriveAccessToken = (): string | null => {
  return cachedAccessToken;
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
      description: 'Automated 15GB Cloud Backup for Matrichaya Wholesale ERP (Admin, DSR, Cash Counter)',
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

// Upload Backup File to Google Drive
export const uploadBackupToGoogleDrive = async (
  backupData: any,
  fileName?: string
): Promise<{ success: boolean; file: GoogleDriveBackupFile; message: string }> => {
  const token = getDriveAccessToken();
  if (!token) {
    throw new Error('Google Drive not connected. Please sign in with Google.');
  }

  const folderId = await getOrCreateBackupFolder(token);
  const now = new Date();
  const dateStr = now.toISOString().slice(0, 10);
  const timeStr = now.toTimeString().slice(0, 8).replace(/:/g, '-');
  const finalFileName =
    fileName || `matrichaya_erp_backup_${dateStr}_${timeStr}.json`;

  const metadata = {
    name: finalFileName,
    parents: [folderId],
    description: `Matrichaya Telecom ERP Full Point-in-time Backup. DSR, Counter, & Admin records.`,
    mimeType: 'application/json',
  };

  const fileContent = JSON.stringify(backupData, null, 2);
  const boundary = '-------matrichayabackupboundary314159';
  const delimiter = `\r\n--${boundary}\r\n`;
  const closeDelimiter = `\r\n--${boundary}--`;

  const multipartRequestBody =
    delimiter +
    'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
    JSON.stringify(metadata) +
    delimiter +
    'Content-Type: application/json\r\n\r\n' +
    fileContent +
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

  const file = await uploadRes.json();
  return {
    success: true,
    file,
    message: `গুগল ড্রাইভে '${finalFileName}' সফলভাবে ব্যাকআপ হয়েছে!`,
  };
};

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
    throw new Error('Google Drive not connected');
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

// Delete a backup file from Google Drive (Requires explicit UI confirmation before calling)
export const deleteBackupFromGoogleDrive = async (fileId: string): Promise<void> => {
  const token = getDriveAccessToken();
  if (!token) throw new Error('Google Drive not connected');

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
