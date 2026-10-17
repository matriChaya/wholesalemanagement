/**
 * Robust File Saver Utility for Web, PWA (Standalone Installed App), Android, iOS & Desktop
 * Fixes PWA file download silent failures where blob: URLs are blocked or ignored by WebAPK / standalone containers.
 */

export interface SaveFileResult {
  success: boolean;
  method: 'server_stream' | 'web_share' | 'file_picker' | 'blob_anchor' | 'window_open';
  message: string;
}

export interface SaveFileOptions {
  title?: string;
  description?: string;
  forceShare?: boolean;
  onStatus?: (status: string) => void;
}

/**
 * Checks if the application is currently running as an installed PWA (Standalone Mode)
 */
export const isStandaloneMode = (): boolean => {
  if (typeof window === 'undefined') return false;
  try {
    const isMediaStandalone = typeof window.matchMedia === 'function' ? window.matchMedia('(display-mode: standalone)').matches : false;
    const isNavStandalone = Boolean((window.navigator as unknown as { standalone?: boolean })?.standalone);
    const isAndroidApp = Boolean(typeof document !== 'undefined' && document?.referrer && document.referrer.includes('android-app://'));
    return isMediaStandalone || isNavStandalone || isAndroidApp;
  } catch {
    return false;
  }
};

/**
 * Checks if the user is on a mobile device (Android / iOS)
 */
export const isMobilePlatform = (): boolean => {
  if (typeof window === 'undefined') return false;
  return /android|iphone|ipad|ipod|mobile/i.test(navigator.userAgent || '');
};

/**
 * Converts a Blob to a base64 string
 */
export const blobToBase64 = (blob: Blob): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result as string;
      // Strip off the data URL prefix (e.g., "data:application/pdf;base64,")
      const base64 = result.includes(',') ? result.split(',')[1] : result;
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
};

/**
 * Checks if Web Share API with File sharing is supported in the current browser
 */
export const isWebShareSupported = (mimeType: string = 'application/pdf'): boolean => {
  if (typeof navigator === 'undefined' || !navigator.share || !navigator.canShare) {
    return false;
  }
  try {
    const dummyFile = new File(['test'], 'test.pdf', { type: mimeType });
    return navigator.canShare({ files: [dummyFile] });
  } catch {
    return false;
  }
};

/**
 * Triggers native OS Web Share dialog with the file (Works exceptionally well on Android PWA and iOS)
 */
export const shareFileBlob = async (
  blob: Blob,
  filename: string,
  mimeType: string = 'application/pdf',
  title?: string
): Promise<SaveFileResult> => {
  const file = new File([blob], filename, {
    type: mimeType,
    lastModified: Date.now(),
  });

  if (typeof navigator !== 'undefined' && navigator.share && navigator.canShare) {
    const shareData = {
      files: [file],
      title: title || filename,
      text: `${filename} — মাতৃছায়া টেলিকম`,
    };

    if (navigator.canShare(shareData)) {
      try {
        await navigator.share(shareData);
        return {
          success: true,
          method: 'web_share',
          message: 'শেয়ার বা সেভ অপশন সম্পন্ন হয়েছে',
        };
      } catch (err: unknown) {
        if ((err as { name?: string })?.name === 'AbortError') {
          return {
            success: true,
            method: 'web_share',
            message: 'শেয়ার বা সেভ বন্ধ করা হয়েছে',
          };
        }
        console.warn('Web Share failed:', err);
      }
    }
  }

  throw new Error('Web Share API is not supported on this device');
};

/**
 * Universal File Saver that adapts dynamically:
 * 1. Desktop Chrome/Edge PWA -> File System Access API (showSaveFilePicker)
 * 2. Installed Mobile PWA (WebAPK) -> HTTPS server stream (triggers Android OS DownloadManager to save to /Downloads)
 * 3. Web Share API fallback (Save to Device, WhatsApp, Drive)
 * 4. Standard Blob URL <a> download fallback
 */
export const saveFileBlob = async (
  blob: Blob,
  filename: string,
  mimeType: string = 'application/pdf',
  options?: SaveFileOptions
): Promise<SaveFileResult> => {
  const isStandalone = isStandaloneMode();
  const isMobile = isMobilePlatform();

  // If user explicitly requested share action
  if (options?.forceShare) {
    try {
      return await shareFileBlob(blob, filename, mimeType, options?.title);
    } catch (e) {
      console.warn('Force share failed, falling back to download:', e);
    }
  }

  // METHOD 1: Desktop Native File System Access API (Chrome / Edge PC)
  if (typeof window !== 'undefined' && 'showSaveFilePicker' in window && !isMobile) {
    try {
      options?.onStatus?.('ফাইল সেভ করার স্থান নির্বাচন করুন...');
      const ext = filename.slice(filename.lastIndexOf('.'));
      const typeDesc =
        mimeType === 'application/pdf'
          ? 'PDF Document (*.pdf)'
          : mimeType === 'application/json'
          ? 'JSON File (*.json)'
          : 'Spreadsheet File (*.csv)';

      const handle = await (window as unknown as {
        showSaveFilePicker: (opts: unknown) => Promise<{ createWritable: () => Promise<{ write: (b: Blob) => Promise<void>; close: () => Promise<void> }> }>;
      }).showSaveFilePicker({
        suggestedName: filename,
        types: [
          {
            description: typeDesc,
            accept: { [mimeType]: [ext] },
          },
        ],
      });

      const writable = await handle.createWritable();
      await writable.write(blob);
      await writable.close();

      return {
        success: true,
        method: 'file_picker',
        message: 'ফাইলটি আপনার কম্পিউটারে সফলভাবে সেভ করা হয়েছে',
      };
    } catch (err: unknown) {
      if ((err as { name?: string })?.name === 'AbortError') {
        return {
          success: true,
          method: 'file_picker',
          message: 'ফাইল সেভ বাতিল করা হয়েছে',
        };
      }
      console.warn('showSaveFilePicker failed, trying server stream/fallback:', err);
    }
  }

  // METHOD 2: Server-assisted Stream Download (Crucial for Android Installed PWA / WebAPK)
  // In an installed WebAPK, blob: URLs are suppressed. A real HTTPS URL with Content-Disposition: attachment
  // tells the Android OS DownloadManager to download the file directly into /storage/emulated/0/Download
  if (navigator.onLine) {
    try {
      options?.onStatus?.('ফাইল প্রস্তুত হচ্ছে...');
      const base64 = await blobToBase64(blob);

      const resp = await fetch('/api/download/prepare', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          filename,
          mimeType,
          base64,
        }),
      });

      if (resp.ok) {
        const data = await resp.json();
        if (data.success && data.downloadUrl) {
          // Trigger the download via HTTPS link
          const link = document.createElement('a');
          link.href = data.downloadUrl;
          link.download = filename;
          link.target = '_self';
          link.rel = 'noopener';
          link.style.display = 'none';
          document.body.appendChild(link);
          link.click();

          setTimeout(() => {
            if (document.body.contains(link)) {
              document.body.removeChild(link);
            }
          }, 3000);

          return {
            success: true,
            method: 'server_stream',
            message: 'ফাইলটি আপনার ডিভাইসের ডাউনলোড ফোল্ডারে সেভ করা হয়েছে',
          };
        }
      }
    } catch (serverErr) {
      console.warn('Server download stream preparation note:', serverErr);
    }
  }

  // METHOD 3: Web Share API (Save to device, Drive, WhatsApp, Files)
  // Perfect for Mobile PWA when offline or when server stream is unreachable
  if (isMobile || isStandalone) {
    try {
      return await shareFileBlob(blob, filename, mimeType, options?.title);
    } catch (shareErr) {
      console.warn('Share API fallback note:', shareErr);
    }
  }

  // METHOD 4: Standard HTML5 Blob Anchor Download (Works reliably in standard browser tabs)
  try {
    const blobUrl = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = blobUrl;
    link.download = filename;
    link.rel = 'noopener';
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();

    setTimeout(() => {
      if (document.body.contains(link)) {
        document.body.removeChild(link);
      }
      URL.revokeObjectURL(blobUrl);
    }, 30000);

    return {
      success: true,
      method: 'blob_anchor',
      message: 'ফাইলটি ব্রাউজারে ডাউনলোড হয়েছে',
    };
  } catch (anchorErr) {
    console.warn('Blob anchor download failed, attempting window.open:', anchorErr);
  }

  // METHOD 5: Open in new window as last resort
  try {
    const blobUrl = URL.createObjectURL(blob);
    window.open(blobUrl, '_blank');
    return {
      success: true,
      method: 'window_open',
      message: 'ফাইলটি নতুন উইন্ডোতে ওপেন হয়েছে, সেখান থেকে সেভ বা প্রিন্ট করুন',
    };
  } catch (windowErr) {
    throw new Error('সকল সেভ পদ্ধতি ব্যর্থ হয়েছে। দয়া করে ইন্টারনেট সংযোগ চেক করুন।');
  }
};
