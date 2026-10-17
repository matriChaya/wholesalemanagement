import { PhoneContact } from '../types';

// Convert Bengali numerals (০-৯) and clean spaces/hyphens to standard 0-9 digits
export function sanitizePhoneNumber(input: string): string {
  if (!input) return '';
  const bnToEnMap: Record<string, string> = {
    '০': '0', '১': '1', '২': '2', '৩': '3', '৪': '4',
    '৫': '5', '৬': '6', '৭': '7', '৮': '8', '৯': '9',
  };
  let cleaned = input
    .split('')
    .map((char) => bnToEnMap[char] || char)
    .join('')
    .replace(/[^\d+]/g, ''); // keep digits and '+'

  // Normalize Bangladesh country prefixes without trimming the leading '1'
  // Standard BD numbers are 11 digits: 01XXXXXXXXX (e.g., 01711223344)
  // International format: +8801711223344 (14 chars) or 8801711223344 (13 chars)
  if (cleaned.startsWith('+8801') && cleaned.length >= 13) {
    // Slicing first 3 chars ('+88') leaves '01...'
    cleaned = cleaned.slice(3);
  } else if (cleaned.startsWith('8801') && cleaned.length >= 12) {
    // Slicing first 2 chars ('88') leaves '01...'
    cleaned = cleaned.slice(2);
  } else if (cleaned.startsWith('008801') && cleaned.length >= 14) {
    cleaned = cleaned.slice(4);
  } else if (cleaned.startsWith('+880') && cleaned.length >= 13) {
    cleaned = '0' + cleaned.slice(4);
  } else if (cleaned.startsWith('880') && cleaned.length >= 12) {
    cleaned = '0' + cleaned.slice(3);
  }

  return cleaned;
}

// Check if native Android / W3C Contact Picker is supported
export function isContactPickerSupported(): boolean {
  return (
    typeof navigator !== 'undefined' &&
    'contacts' in navigator &&
    typeof (navigator as any).contacts?.select === 'function'
  );
}

// Check if running inside an iframe
export function isRunningInIframe(): boolean {
  try {
    return window.self !== window.top;
  } catch (e) {
    return true;
  }
}

export interface PickedContactResult {
  name: string;
  phone: string;
  address?: string;
  organization?: string;
}

/**
 * Safely invokes the device native Contact Picker API.
 * Handles Android Chrome capabilities and gracefully catches iframe/permission denials.
 */
export async function pickContactFromDevice(multiple: boolean = false): Promise<{
  success: boolean;
  contacts?: PickedContactResult[];
  error?: string;
  isIframeBlocked?: boolean;
  notSupported?: boolean;
}> {
  const isIframe = isRunningInIframe();

  // If navigator.contacts is not present, report not supported
  if (typeof navigator === 'undefined' || !('contacts' in navigator) || typeof (navigator as any).contacts?.select !== 'function') {
    return {
      success: false,
      notSupported: true,
      isIframeBlocked: isIframe,
      error: 'Contact Picker API is supported on Android mobile browsers (Chrome / Edge / Samsung Internet).',
    };
  }

  try {
    // CRITICAL: Call contacts.select directly with ['name', 'tel'] WITHOUT any preceding await!
    // Any prior await causes Chrome to revoke the transient user gesture and throw SecurityError!
    let rawContacts: any[] = [];
    try {
      rawContacts = await (navigator as any).contacts.select(['name', 'tel'], { multiple });
    } catch (primaryErr: any) {
      const msg = String(primaryErr?.message || primaryErr);
      if (primaryErr?.name === 'TypeError' || msg.toLowerCase().includes('property') || msg.toLowerCase().includes('properties')) {
        rawContacts = await (navigator as any).contacts.select(['tel'], { multiple });
      } else {
        throw primaryErr;
      }
    }

    if (!rawContacts || rawContacts.length === 0) {
      return { success: false, error: 'No contact selected by user.' };
    }

    const results: PickedContactResult[] = rawContacts
      .map((c: any) => {
        let name = 'Phone Contact';
        if (Array.isArray(c.name) && c.name.length > 0) {
          name = c.name[0] || 'Phone Contact';
        } else if (typeof c.name === 'string' && c.name.trim()) {
          name = c.name.trim();
        }

        const telList: string[] = Array.isArray(c.tel)
          ? c.tel
          : typeof c.tel === 'string'
          ? [c.tel]
          : [];

        // Find the best valid phone number
        let phone = '';
        for (const raw of telList) {
          const cleaned = sanitizePhoneNumber(raw);
          if (cleaned && cleaned.length >= 10) {
            phone = cleaned;
            break;
          }
        }
        if (!phone && telList.length > 0) {
          phone = sanitizePhoneNumber(telList[0]);
        }

        const address =
          (Array.isArray(c.address) && c.address[0]?.addressLine?.[0]) ||
          (typeof c.address === 'string' ? c.address : '') ||
          '';

        return {
          name,
          phone,
          address,
          organization: 'Mobile Contact',
        };
      })
      .filter((c: PickedContactResult) => !!c.phone);

    return {
      success: results.length > 0,
      contacts: results,
    };
  } catch (err: any) {
    const errString = String(err?.message || err);
    const isSecurity =
      errString.includes('SecurityError') ||
      errString.includes('top-level') ||
      errString.includes('user gesture') ||
      errString.includes('not allowed');

    return {
      success: false,
      error: errString,
      isIframeBlocked: isIframe || isSecurity,
    };
  }
}

/**
 * Parses VCF (vCard) text into contact objects.
 * Supports standard vCard 2.1 / 3.0 / 4.0 formats from Android/iOS.
 */
export function parseVCardContent(vcfText: string): PickedContactResult[] {
  const contacts: PickedContactResult[] = [];
  const cardBlocks = vcfText.split(/BEGIN:VCARD/i);

  for (const block of cardBlocks) {
    if (!block.trim()) continue;

    let name = '';
    let phone = '';
    let org = '';
    let address = '';

    const lines = block.split(/\r\n|\r|\n/);
    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed.startsWith('FN:') || trimmed.startsWith('FN;')) {
        name = trimmed.replace(/^FN[^:]*:/i, '').trim();
      } else if (!name && (trimmed.startsWith('N:') || trimmed.startsWith('N;'))) {
        const parts = trimmed.replace(/^N[^:]*:/i, '').split(';');
        name = parts.filter(Boolean).reverse().join(' ').trim();
      } else if (trimmed.startsWith('TEL') || trimmed.startsWith('TEL;')) {
        const rawTel = trimmed.replace(/^TEL[^:]*:/i, '').trim();
        const cleanTel = sanitizePhoneNumber(rawTel);
        if (cleanTel && !phone) {
          phone = cleanTel;
        }
      } else if (trimmed.startsWith('ORG:') || trimmed.startsWith('ORG;')) {
        org = trimmed.replace(/^ORG[^:]*:/i, '').replace(/;/g, ' ').trim();
      } else if (trimmed.startsWith('ADR:') || trimmed.startsWith('ADR;')) {
        address = trimmed.replace(/^ADR[^:]*:/i, '').replace(/;/g, ', ').trim();
      }
    }

    if (phone) {
      contacts.push({
        name: name || 'Contact',
        phone,
        organization: org || 'VCF Import',
        address: address || undefined,
      });
    }
  }

  return contacts;
}

/**
 * Smart Text Parser: Extracts phone number and contact name from any raw pasted text
 */
export function parsePastedContactText(text: string): PickedContactResult | null {
  if (!text) return null;
  const cleanDigits = sanitizePhoneNumber(text);
  
  // Look for Bangladeshi 11-digit pattern (013/014/015/016/017/018/019...)
  const phoneMatch = text.match(/(?:\+?880|0)?1[3-9]\d{8}/);
  if (phoneMatch) {
    const rawPhone = phoneMatch[0];
    const phone = sanitizePhoneNumber(rawPhone);
    const remainingText = text.replace(rawPhone, '').replace(/[-:,()|]/g, ' ').trim();
    const name = remainingText.length > 1 ? remainingText : 'Direct Contact';
    return {
      name,
      phone,
    };
  }

  if (cleanDigits.length >= 10) {
    return {
      name: 'Direct Contact',
      phone: cleanDigits,
    };
  }

  return null;
}

/**
 * Triggers native device file picker to select a .vcf / vCard contacts file
 * Works 100% offline, on any device (Android, iPhone, PC) without permission issues.
 */
export function triggerDeviceVcfPicker(): Promise<PickedContactResult[]> {
  return new Promise((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.vcf,text/vcard,text/x-vcard,text/directory';
    input.style.display = 'none';

    input.onchange = async (e: Event) => {
      const target = e.target as HTMLInputElement;
      const file = target.files?.[0];
      if (!file) {
        resolve([]);
        return;
      }
      try {
        const text = await file.text();
        const contacts = parseVCardContent(text);
        resolve(contacts);
      } catch (err) {
        console.error('Failed to read VCF file', err);
        resolve([]);
      } finally {
        document.body.removeChild(input);
      }
    };

    input.oncancel = () => {
      try {
        document.body.removeChild(input);
      } catch (e) {}
      resolve([]);
    };

    document.body.appendChild(input);
    input.click();
  });
}

