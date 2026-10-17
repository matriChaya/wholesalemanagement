import {
  Supplier,
  SupplierLedgerEntry,
  CashTransfer,
  Retailer,
  OrderInvoice,
  Product,
  CapitalTransaction,
  BusinessProfile,
  Expense,
} from '../types';
import { getStoredBusinessProfile } from './businessProfile';

export const formatCurrency = (amount: number, symbol: string = '৳'): string => {
  const safe = Number.isFinite(amount) ? amount : 0;
  return `${symbol} ${safe.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
};

export const formatDate = (isoString?: string): string => {
  if (!isoString) return '-';
  try {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return isoString;
    return d.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return isoString;
  }
};

/**
 * Converts numbers and digits to Bengali numerals: 1 -> ১, 2 -> ২, etc.
 */
export const toBnDigit = (num: number | string): string => {
  const bengaliDigits = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'];
  return String(num).replace(/[0-9]/g, (w) => bengaliDigits[+w] || w);
};

/**
 * Splits an array into clean chunks for multi-page A4 PDF documents.
 * First page usually has larger header & cards, so firstPageSize is smaller.
 */
export const chunkArray = <T>(array: T[], firstPageSize: number, otherPageSize: number): T[][] => {
  if (!array || array.length === 0) return [[]];
  if (array.length <= firstPageSize) return [array];

  const chunks: T[][] = [];
  chunks.push(array.slice(0, firstPageSize));

  let currentIdx = firstPageSize;
  while (currentIdx < array.length) {
    chunks.push(array.slice(currentIdx, currentIdx + otherPageSize));
    currentIdx += otherPageSize;
  }
  return chunks;
};

const renderDocumentHeader = (
  titleBn: string,
  titleEn: string,
  subtitleBn: string,
  badgeText: string = 'অফিশিয়াল হিসাব কপি',
  customProfile?: BusinessProfile
): string => {
  const profile = customProfile || getStoredBusinessProfile();
  const nowStr = formatDate(new Date().toISOString());

  // 1. Custom Letterhead mode (প্রি-প্রিন্টেড প্যাডের জন্য সংরক্ষিত ফাঁকা জায়গা)
  if (profile.padType === 'custom_letterhead') {
    const spacingHeight = profile.padTopSpacing > 0 ? profile.padTopSpacing : 140;
    return `
      <!-- Pre-printed Letterhead Clearance Space -->
      <div style="height: ${spacingHeight}px; margin-bottom: 14px; border-bottom: 1px dashed #cbd5e1; display: flex; align-items: flex-end; justify-content: space-between; padding-bottom: 6px; box-sizing: border-box;">
        <span style="font-size: 9px; color: #94a3b8; font-style: italic;">[অফিশিয়াল প্রি-প্রিন্টেড প্যাডের জন্য সংরক্ষিত স্থান]</span>
        <span style="font-size: 10px; color: #64748b;">প্রিন্ট তারিখ: <strong>${nowStr}</strong></span>
      </div>

      <div style="border-bottom: 2px solid #059669; padding-bottom: 14px; margin-bottom: 20px;">
        <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 16px;">
          <div>
            <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 4px;">
              <span style="background: #064e3b; color: #34d399; font-size: 10px; font-weight: 800; padding: 2px 8px; border-radius: 4px; border: 1px solid #10b981; text-transform: uppercase;">
                ${badgeText}
              </span>
              <span style="font-size: 11px; color: #64748b; font-weight: 600;">${profile.tagline || 'হোলসেল ইআরপি সিস্টেম'}</span>
            </div>
            <div style="font-size: 16px; font-weight: 800; color: #047857;">
              ${titleBn}
            </div>
            <div style="font-size: 11px; color: #475569; font-style: italic;">
              ${titleEn} • ${subtitleBn}
            </div>
          </div>
          <div style="text-align: right; font-size: 11px; color: #334155; line-height: 1.4;">
            <div style="font-weight: 800; color: #0f172a; font-size: 13px;">${profile.enterpriseName}</div>
            <div style="color: #475569;">📞 ${profile.phone}${profile.alternatePhone ? `, ${profile.alternatePhone}` : ''}</div>
          </div>
        </div>
      </div>
    `;
  }

  // 2. Standard Pad Format (পর্যাপ্ত জায়গা, সুস্পষ্ট ঠিকানা, গুদামঘর ও মোবাইল সহ পূর্ণাঙ্গ প্যাড)
  const topPadding = profile.padTopSpacing > 0 ? `<div style="height: ${profile.padTopSpacing}px;"></div>` : '';

  return `
    ${topPadding}
    <div style="border-bottom: 2.5px solid #059669; padding-bottom: 18px; margin-bottom: 22px;">
      <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 24px;">
        
        <!-- বাম পাশ: প্রতিষ্ঠানের নাম, প্রোপ্রাইটর ও ডকুমেন্টের শিরোনাম -->
        <div style="flex: 1.35; min-width: 0;">
          <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 6px;">
            <span style="background: #064e3b; color: #34d399; font-size: 10px; font-weight: 800; padding: 2px 9px; border-radius: 4px; border: 1px solid #10b981; text-transform: uppercase; letter-spacing: 0.5px;">
              ${badgeText}
            </span>
            <span style="font-size: 11px; color: #64748b; font-weight: 600;">
              ${profile.tagline || 'পাইকারি ডিস্ট্রিবিউশন অ্যান্ড ইনভেন্টরি ম্যানেজমেন্ট'}
            </span>
          </div>

          <h1 style="font-size: 22px; font-weight: 900; color: #0f172a; margin: 0 0 4px 0; line-height: 1.25; letter-spacing: -0.2px;">
            ${profile.enterpriseName}
          </h1>

          ${profile.proprietorName ? `
            <div style="font-size: 12px; font-weight: 700; color: #334155; margin-bottom: 6px;">
              স্বত্বাধিকারী / পরিচালক: <span style="color: #047857;">${profile.proprietorName}</span>
            </div>
          ` : ''}

          <div style="font-size: 14px; font-weight: 800; color: #047857; margin-top: 4px;">
            ${titleBn}
          </div>
          <div style="font-size: 11px; color: #475569; font-style: italic; margin-top: 1px;">
            ${titleEn} • ${subtitleBn}
          </div>
        </div>

        <!-- ডান পাশ: প্রধান ঠিকানা, গুদামঘর ও মোবাইল নাম্বার (পর্যাপ্ত জায়গা ও স্পষ্ট বর্ডার সহ) -->
        <div style="flex: 1.15; text-align: right; font-size: 11.5px; color: #334155; line-height: 1.55; background: #f8fafc; padding: 12px 16px; border-radius: 8px; border: 1px solid #e2e8f0; box-shadow: 0 1px 2px rgba(0,0,0,0.03);">
          <div style="font-weight: 800; color: #0f172a; font-size: 12.5px; margin-bottom: 3px;">
            📍 প্রধান কার্যালয় / শোরুম
          </div>
          <div style="color: #334155; font-weight: 500; margin-bottom: 5px;">
            ${profile.address}
          </div>

          ${profile.godownAddress ? `
            <div style="margin-top: 6px; padding-top: 5px; border-top: 1px dashed #cbd5e1;">
              <span style="font-weight: 700; color: #0f172a;">🏭 গুদামঘর / ডিপো:</span>
              <span style="color: #475569; display: block; font-weight: 500;">${profile.godownAddress}</span>
            </div>
          ` : ''}

          <div style="margin-top: 6px; padding-top: 5px; border-top: 1px dashed #cbd5e1; font-weight: 600; color: #047857;">
            📞 মোবাইল: <span style="font-weight: 800; color: #0f172a;">${profile.phone}</span>
            ${profile.alternatePhone ? `<span style="color: #475569;">, ${profile.alternatePhone}</span>` : ''}
          </div>

          ${profile.email ? `
            <div style="font-size: 10.5px; color: #64748b; margin-top: 3px;">
              ✉️ ইমেইল: ${profile.email}
            </div>
          ` : ''}

          <div style="margin-top: 6px; color: #64748b; font-size: 10px; border-top: 1px solid #e2e8f0; padding-top: 4px;">
            রিপোর্ট তৈরির সময়: <strong>${nowStr}</strong>
          </div>
        </div>

      </div>
    </div>
  `;
};

/**
 * Render compact continuation header on Page 2, 3, etc. of multi-page statements
 */
export const renderContinuationHeader = (
  titleBn: string,
  titleEn: string,
  pageNumber: number,
  totalPages: number,
  customProfile?: BusinessProfile
): string => {
  const profile = customProfile || getStoredBusinessProfile();
  const nowStr = formatDate(new Date().toISOString());
  return `
    <div style="border-bottom: 2px solid #059669; padding-bottom: 10px; margin-bottom: 16px; display: flex; justify-content: space-between; align-items: center; box-sizing: border-box;">
      <div style="display: flex; align-items: center; gap: 10px;">
        <span style="font-size: 15px; font-weight: 900; color: #0f172a;">${profile.enterpriseName}</span>
        <span style="background: #ecfdf5; color: #047857; font-size: 11px; font-weight: 800; padding: 3px 8px; border-radius: 4px; border: 1px solid #a7f3d0;">
          ${titleBn} (চলমান পাতা)
        </span>
      </div>
      <div style="display: flex; align-items: center; gap: 12px; font-size: 11px; color: #475569;">
        <span>তারিখ: <strong>${nowStr}</strong></span>
        <span style="background: #0f172a; color: #ffffff; font-weight: 800; padding: 3px 9px; border-radius: 4px; font-size: 10.5px;">
          পৃষ্ঠা ${toBnDigit(pageNumber)} / ${toBnDigit(totalPages)}
        </span>
      </div>
    </div>
  `;
};

export const renderDocumentFooter = (
  customProfile?: BusinessProfile,
  pageNumber: number = 1,
  totalPages: number = 1,
  isLastPage: boolean = true
): string => {
  const profile = customProfile || getStoredBusinessProfile();

  if (!isLastPage && totalPages > 1) {
    return `
      <div style="margin-top: auto; padding-top: 14px; border-top: 1px dashed #cbd5e1; display: flex; justify-content: space-between; align-items: center; font-size: 11px; color: #64748b;">
        <span style="font-weight: 700; color: #047857;">পরবর্তী পাতায় চলমান... (Continued on Page ${toBnDigit(pageNumber + 1)})</span>
        <div style="display: flex; align-items: center; gap: 8px;">
          <span>${profile.enterpriseName} • ফোন: ${profile.phone}</span>
          <span style="background: #f1f5f9; color: #0f172a; font-weight: 800; padding: 2px 8px; border-radius: 4px; border: 1px solid #cbd5e1;">
            পৃষ্ঠা ${toBnDigit(pageNumber)} / ${toBnDigit(totalPages)}
          </span>
        </div>
      </div>
    `;
  }

  return `
    <div style="margin-top: auto; padding-top: 20px; border-top: 1px dashed #cbd5e1;">
      <div style="display: flex; justify-content: space-between; align-items: flex-end; padding: 0 16px 16px 16px;">
        <div style="text-align: center; width: 180px;">
          <div style="border-bottom: 1px solid #94a3b8; height: 32px; margin-bottom: 6px;"></div>
          <div style="font-size: 11px; font-weight: 700; color: #334155;">হিসাব রক্ষক / প্রস্তুতকারক</div>
          <div style="font-size: 9px; color: #64748b;">Prepared by Accounts</div>
        </div>

        <div style="text-align: center; width: 140px;">
          <div style="display: inline-block; padding: 4px 12px; border: 1.5px solid #059669; border-radius: 6px; color: #059669; font-size: 10px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.5px;">
            ✓ সিঙ্কড ভেরিফাইড
          </div>
          <div style="font-size: 8.5px; color: #94a3b8; margin-top: 4px;">কম্পিউটার জেনারেটেড রেকর্ড</div>
        </div>

        <div style="text-align: center; width: 180px;">
          <div style="border-bottom: 1px solid #94a3b8; height: 32px; margin-bottom: 6px;"></div>
          <div style="font-size: 11px; font-weight: 700; color: #334155;">স্বত্বাধিকারী / অনুমোদিত স্বাক্ষর</div>
          <div style="font-size: 9px; color: #64748b;">Authorized Signature</div>
        </div>
      </div>

      <div style="display: flex; justify-content: space-between; align-items: center; font-size: 10px; color: #64748b; border-top: 1px solid #f1f5f9; padding-top: 8px;">
        <div>
          <strong>${profile.enterpriseName}</strong> • ${profile.address} • ফোন: <strong>${profile.phone}</strong>
          ${profile.godownAddress ? ` • গুদাম: ${profile.godownAddress}` : ''}
        </div>
        <div style="font-weight: 800; color: #0f172a; background: #f1f5f9; padding: 2px 8px; border-radius: 4px; border: 1px solid #cbd5e1;">
          পৃষ্ঠা ${toBnDigit(pageNumber)} / ${toBnDigit(totalPages)} ${totalPages > 1 ? '(সমাপ্ত)' : ''}
        </div>
      </div>
    </div>
  `;
};

// 1. Supplier Ledger HTML
export const renderSupplierLedgerHtml = (
  supplier: Supplier,
  entries: SupplierLedgerEntry[],
  profile?: BusinessProfile
): string => {
  // Sort chronologically by date ascending so statement matches actual calendar order & date serial
  const sortedEntries = [...entries].sort((a, b) => {
    const dateA = a.date || '';
    const dateB = b.date || '';
    const dateCmp = dateA.localeCompare(dateB);
    if (dateCmp !== 0) return dateCmp;
    // Same date: Purchases before Payments/Returns, then by reference/id
    if (a.type === 'PURCHASE' && b.type !== 'PURCHASE') return -1;
    if (a.type !== 'PURCHASE' && b.type === 'PURCHASE') return 1;
    return (a.referenceNo || a.id || '').localeCompare(b.referenceNo || b.id || '');
  });

  // Calculate opening balance & chronological running balance
  let sumPurchases = 0;
  let sumPayments = 0;
  let sumReturns = 0;
  sortedEntries.forEach((e) => {
    const amt = Number(e.amount) || 0;
    if (e.type === 'PURCHASE') {
      sumPurchases += amt;
    } else if (e.type === 'PAYMENT') {
      sumPayments += amt;
    } else {
      sumReturns += amt;
    }
  });

  const sumCredits = sumPayments + sumReturns;

  // Single official Opening D.O. / Initial Due
  const openingBalance = typeof supplier.openingBalance === 'number'
    ? Math.max(0, supplier.openingBalance)
    : Math.max(0, (supplier.outstandingPayable || 0) - sumPurchases + sumCredits);
  const openingDate = supplier.openingDate || 'প্রারম্ভিক';
  const openingNotes = (supplier.openingNotes || 'হিসাব শুরুর ওপেন ডিও / প্রারম্ভিক বকেয়া').trim();

  // Precompute row items with chronological runningBalance
  let tempBal = openingBalance;
  const computedEntries = sortedEntries.map((entry, idx) => {
    const isPayment = entry.type === 'PAYMENT';
    const isPurchase = entry.type === 'PURCHASE';
    const isReturn = entry.type === 'RETURN_ADJUSTMENT' || entry.type === 'DISCOUNT_CREDIT';
    const amt = Number(entry.amount) || 0;

    if (isPurchase) {
      tempBal += amt;
    } else {
      tempBal = Math.max(0, tempBal - amt);
    }

    return {
      entry,
      idx,
      isPayment,
      isPurchase,
      isReturn,
      amt,
      runningBalance: tempBal,
    };
  });

  const totalDebit = openingBalance + sumPurchases;
  const currentDue = tempBal;

  const renderRow = (item: typeof computedEntries[0]) => {
    const { entry, idx, isPayment, isPurchase, amt, runningBalance } = item;
    const debit = isPurchase ? formatCurrency(amt) : '-';
    const credit = !isPurchase ? formatCurrency(amt) : '-';

    const typeLabel = isPurchase
      ? 'মাল ক্রয় (চালান)'
      : isPayment
      ? 'নগদ/ব্যাংক পরিশোধ'
      : 'কোম্পানি রিটার্ন';

    const typeBadgeBg = isPurchase ? '#fef3c7' : isPayment ? '#dcfce7' : '#e0f2fe';
    const typeBadgeColor = isPurchase ? '#92400e' : isPayment ? '#166534' : '#0369a1';

    return `
      <tr style="border-bottom: 1px solid #e2e8f0; background: ${idx % 2 === 0 ? '#ffffff' : '#f8fafc'}; font-size: 11px;">
        <td style="padding: 7px 8px; text-align: center; color: #64748b; font-weight: 700; font-family: monospace;">${toBnDigit(idx + 1)}</td>
        <td style="padding: 7px 10px; color: #475569; white-space: nowrap; font-weight: 600;">${formatDate(entry.date)}</td>
        <td style="padding: 7px 10px; font-weight: 700; color: #0f172a; font-family: monospace;">${entry.referenceNo || 'চালান'}</td>
        <td style="padding: 7px 10px; color: #334155;">
          <span style="display: inline-block; padding: 2px 6px; border-radius: 4px; background: ${typeBadgeBg}; color: ${typeBadgeColor}; font-weight: 700; font-size: 10px; margin-right: 6px;">
            ${typeLabel}
          </span>
          ${entry.notes || (entry.paymentMethod ? `পেমেন্ট মোড: ${entry.paymentMethod}` : '')}
        </td>
        <td style="padding: 7px 10px; text-align: right; color: #b91c1c; font-weight: 700;">${debit}</td>
        <td style="padding: 7px 10px; text-align: right; color: #059669; font-weight: 700;">${credit}</td>
        <td style="padding: 7px 10px; text-align: right; font-weight: 800; color: #dc2626;">${formatCurrency(runningBalance)}</td>
      </tr>
    `;
  };

  const openingRowHtml = `
    <tr style="border-bottom: 1px solid #fcd34d; background: #fefce8; font-size: 11px; font-weight: 700;">
      <td style="padding: 8px; text-align: center; color: #b45309;">★</td>
      <td style="padding: 8px 10px; color: #78350f; white-space: nowrap;">${formatDate(openingDate)}</td>
      <td style="padding: 8px 10px; font-weight: 800; color: #92400e; font-family: monospace;">OPENING-DO</td>
      <td style="padding: 8px 10px; color: #854d0e;">🏢 ${openingNotes}</td>
      <td style="padding: 8px 10px; text-align: right; color: #b45309; font-weight: 800;">${formatCurrency(openingBalance)}</td>
      <td style="padding: 8px 10px; text-align: right; color: #94a3b8;">-</td>
      <td style="padding: 8px 10px; text-align: right; font-weight: 800; color: #b45309;">${formatCurrency(openingBalance)}</td>
    </tr>
  `;

  // Chunk entries: 10 rows on Page 1 (with large header/supplier box), 18 rows on subsequent pages
  const chunks = chunkArray(computedEntries, 10, 18);
  const totalPages = chunks.length;

  return chunks.map((chunk, pageIdx) => {
    const pageNum = pageIdx + 1;
    const isFirstPage = pageNum === 1;
    const isLastPage = pageNum === totalPages;

    const rowsHtml = chunk.map(renderRow).join('');

    return `
      <div class="pdf-page">
        <div>
          ${isFirstPage ? `
            ${renderDocumentHeader(
              'কোম্পানি লেজার স্টেটমেন্ট ও বাকি খাতা',
              'Company Ledger & Statement',
              `${supplier.company || supplier.name} (${supplier.name})`,
              'অফিশিয়াল হিসাব স্টেটমেন্ট • স্বয়ংক্রিয় তারিখ ক্রমিক',
              profile
            )}

            <!-- Supplier Information & Summary Box -->
            <div style="display: grid; grid-template-columns: 1.2fr 1fr; gap: 14px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 14px 16px; margin-bottom: 18px;">
              <div>
                <div style="font-size: 10px; font-weight: 700; color: #64748b; text-transform: uppercase;">কোম্পানি / সরবরাহকারী তথ্য</div>
                <div style="font-size: 15px; font-weight: 800; color: #0f172a; margin-top: 2px;">${supplier.company}</div>
                <div style="font-size: 12px; color: #334155; font-weight: 600;">যোগাযোগ ব্যক্তি: ${supplier.name}</div>
                <div style="font-size: 11px; color: #64748b; margin-top: 4px;">
                  <div>ফোন: <strong>${supplier.phone || '-'}</strong> | ঠিকানা: ${supplier.address || 'বাংলাদেশ'}</div>
                  ${supplier.bankDetails ? `<div>ব্যাংক/বিকাশ: <span style="font-family: monospace; color: #0284c7;">${supplier.bankDetails}</span></div>` : ''}
                </div>
              </div>

              <div style="border-left: 1px solid #e2e8f0; padding-left: 16px; font-size: 11px;">
                ${openingBalance > 0 ? `
                <div style="display: flex; justify-content: space-between; margin-bottom: 3px;">
                  <span style="color: #b45309; font-weight: 600;">• প্রারম্ভিক ওপেন ডিও:</span>
                  <strong style="color: #b45309;">${formatCurrency(openingBalance)}</strong>
                </div>` : ''}
                <div style="display: flex; justify-content: space-between; margin-bottom: 3px;">
                  <span style="color: #0f172a; font-weight: 600;">১. কত টাকার মাল কিনেছি (মোট ক্রয় +):</span>
                  <strong style="color: #0f172a; font-weight: 800;">${formatCurrency(sumPurchases)}</strong>
                </div>
                <div style="display: flex; justify-content: space-between; margin-bottom: 3px;">
                  <span style="color: #0284c7; font-weight: 600;">২. কত টাকা রিপ্লেস দিয়েছি (কোম্পানি ফেরত -):</span>
                  <strong style="color: #0284c7; font-weight: 800;">-${formatCurrency(sumReturns)}</strong>
                </div>
                <div style="display: flex; justify-content: space-between; margin-bottom: 3px;">
                  <span style="color: #059669; font-weight: 600;">৩. কত টাকা ক্যাশ দিয়েছি (পরিশোধ -):</span>
                  <strong style="color: #059669; font-weight: 800;">-${formatCurrency(sumPayments)}</strong>
                </div>
                <div style="display: flex; justify-content: space-between; margin-top: 6px; padding-top: 6px; border-top: 2px solid #cbd5e1; font-size: 13px;">
                  <span style="font-weight: 800; color: #dc2626;">৪. বর্তমান মোট ডিউ (বকেয়া দেনা):</span>
                  <strong style="font-weight: 900; color: #dc2626;">${formatCurrency(currentDue)}</strong>
                </div>
              </div>
            </div>
          ` : `
            ${renderContinuationHeader(
              'কোম্পানি লেজার স্টেটমেন্ট ও বাকি খাতা',
              'Company Ledger Statement',
              pageNum,
              totalPages,
              profile
            )}
          `}

          <!-- Ledger Table -->
          <table style="width: 100%; border-collapse: collapse; margin-bottom: 16px;">
            <thead>
              <tr style="background: #0f172a; color: #ffffff; font-size: 11px; font-weight: 700; text-align: left;">
                <th style="padding: 8px 8px; width: 32px; text-align: center; border-radius: 4px 0 0 0;">#</th>
                <th style="padding: 8px 10px; width: 85px;">তারিখ</th>
                <th style="padding: 8px 10px; width: 110px;">চালান / ভাউচার</th>
                <th style="padding: 8px 10px;">বিবরণ ও নোটস</th>
                <th style="padding: 8px 10px; text-align: right; width: 95px;">ডেবিট (ক্রয় +)</th>
                <th style="padding: 8px 10px; text-align: right; width: 95px;">ক্রেডিট (জমা -)</th>
                <th style="padding: 8px 10px; text-align: right; width: 105px; border-radius: 0 4px 0 0;">অবশিষ্ট ব্যালেন্স</th>
              </tr>
            </thead>
            <tbody>
              ${isFirstPage ? openingRowHtml : ''}
              ${rowsHtml}
            </tbody>
            ${isLastPage ? `
              <tfoot>
                <tr style="background: #f1f5f9; font-size: 11px; font-weight: 800; border-top: 2px solid #cbd5e1;">
                  <td colspan="4" style="padding: 8px 10px; text-align: right; color: #0f172a;">মোট যোগফল (ডেবিট ও ক্রেডিট):</td>
                  <td style="padding: 8px 10px; text-align: right; color: #b91c1c;">${formatCurrency(totalDebit)}</td>
                  <td style="padding: 8px 10px; text-align: right; color: #059669;">${formatCurrency(sumCredits)}</td>
                  <td style="padding: 8px 10px; text-align: right; color: #dc2626; font-size: 12px;">${formatCurrency(currentDue)}</td>
                </tr>
              </tfoot>
            ` : ''}
          </table>

          ${isLastPage ? `
            <!-- Statement Note & Audit Trail -->
            <div style="background: #fefce8; border: 1px solid #fef08a; border-radius: 6px; padding: 10px 14px; margin-bottom: 18px; font-size: 10.5px; color: #713f12; line-height: 1.6;">
              <strong>💡 স্টেটমেন্ট হিসাব পদ্ধতি:</strong> হিসাব শুরুর ওপেন ডিও (${formatCurrency(openingBalance)}) + ক্রয় চালান (${formatCurrency(sumPurchases)}) - নগদ/ব্যাংক পরিশোধ (${formatCurrency(sumPayments)}) - কোম্পানি রিটার্ন (${formatCurrency(sumReturns)}) = বর্তমান অবশিষ্ট দেনা <strong>${formatCurrency(currentDue)}</strong>।
            </div>
          ` : ''}
        </div>

        ${renderDocumentFooter(profile, pageNum, totalPages, isLastPage)}
      </div>
    `;
  }).join('');
};

// 2. All Suppliers Summary HTML
export const renderAllSuppliersHtml = (suppliers: Supplier[], profile?: BusinessProfile): string => {
  const totalPurchases = suppliers.reduce((acc, s) => acc + (s.totalPurchases || 0), 0);
  const totalPaid = suppliers.reduce((acc, s) => acc + (s.totalPaid || 0), 0);
  const totalPayable = suppliers.reduce((acc, s) => acc + (s.outstandingPayable || 0), 0);

  const chunks = chunkArray(suppliers, 12, 20);
  const totalPages = chunks.length;

  return chunks.map((chunk, pageIdx) => {
    const pageNum = pageIdx + 1;
    const isFirstPage = pageNum === 1;
    const isLastPage = pageNum === totalPages;
    const offset = isFirstPage ? 0 : 12 + (pageIdx - 1) * 20;

    const rows = chunk.map((s, idx) => {
      const globalIdx = offset + idx;
      return `
        <tr style="border-bottom: 1px solid #e2e8f0; background: ${globalIdx % 2 === 0 ? '#ffffff' : '#f8fafc'}; font-size: 11px;">
          <td style="padding: 8px 10px; color: #64748b; font-weight: 700; text-align: center;">${toBnDigit(globalIdx + 1)}</td>
          <td style="padding: 8px 10px; font-weight: 700; color: #0f172a;">${s.name}</td>
          <td style="padding: 8px 10px; color: #334155;">${s.company}</td>
          <td style="padding: 8px 10px; color: #64748b;">${s.phone || '-'}</td>
          <td style="padding: 8px 10px; text-align: right; font-weight: 600; color: #0f172a;">${formatCurrency(s.totalPurchases || 0)}</td>
          <td style="padding: 8px 10px; text-align: right; font-weight: 600; color: #059669;">${formatCurrency(s.totalPaid || 0)}</td>
          <td style="padding: 8px 10px; text-align: right; font-weight: 800; color: ${s.outstandingPayable > 0 ? '#dc2626' : '#059669'};">
            ${formatCurrency(s.outstandingPayable || 0)}
          </td>
        </tr>
      `;
    }).join('');

    return `
      <div class="pdf-page">
        <div>
          ${isFirstPage ? `
            ${renderDocumentHeader(
              'সকল সরবরাহকারী প্রতিষ্ঠানের দেনা-পাওনা বিবরণী',
              'All Suppliers Master Ledger Summary',
              `মোট সরবরাহকারী: ${suppliers.length} টি`,
              'অফিশিয়াল হিসাব কপি',
              profile
            )}

            <!-- Summary Stat Cards -->
            <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin-bottom: 20px;">
              <div style="background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 8px; padding: 12px; text-align: center;">
                <div style="font-size: 11px; color: #64748b; font-weight: 600;">সর্বমোট মাল ক্রয়</div>
                <div style="font-size: 16px; font-weight: 800; color: #0f172a; margin-top: 4px;">${formatCurrency(totalPurchases)}</div>
              </div>
              <div style="background: #ecfdf5; border: 1px solid #a7f3d0; border-radius: 8px; padding: 12px; text-align: center;">
                <div style="font-size: 11px; color: #065f46; font-weight: 600;">মোট পরিশোধকৃত টাকা</div>
                <div style="font-size: 16px; font-weight: 800; color: #059669; margin-top: 4px;">${formatCurrency(totalPaid)}</div>
              </div>
              <div style="background: #fef2f2; border: 1px solid #fecaca; border-radius: 8px; padding: 12px; text-align: center;">
                <div style="font-size: 11px; color: #991b1b; font-weight: 600;">মোট অবশিষ্ট দেনা (কোম্পানি পাবে)</div>
                <div style="font-size: 16px; font-weight: 800; color: #dc2626; margin-top: 4px;">${formatCurrency(totalPayable)}</div>
              </div>
            </div>
          ` : `
            ${renderContinuationHeader(
              'সকল সরবরাহকারী প্রতিষ্ঠানের দেনা-পাওনা বিবরণী',
              'All Suppliers Master Ledger Summary',
              pageNum,
              totalPages,
              profile
            )}
          `}

          <!-- Table -->
          <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
            <thead>
              <tr style="background: #0f172a; color: #ffffff; font-size: 11px; font-weight: 700; text-align: left;">
                <th style="padding: 8px 10px; width: 36px; text-align: center; border-radius: 4px 0 0 0;">#</th>
                <th style="padding: 8px 10px;">সাপ্লায়ার নাম</th>
                <th style="padding: 8px 10px;">কোম্পানি</th>
                <th style="padding: 8px 10px;">মোবাইল</th>
                <th style="padding: 8px 10px; text-align: right;">মোট ক্রয়</th>
                <th style="padding: 8px 10px; text-align: right;">মোট পরিশোধ</th>
                <th style="padding: 8px 10px; text-align: right; border-radius: 0 4px 0 0;">অবশিষ্ট পাওনা</th>
              </tr>
            </thead>
            <tbody>
              ${rows}
            </tbody>
            ${isLastPage ? `
              <tfoot>
                <tr style="background: #f1f5f9; font-size: 11px; font-weight: 800; border-top: 2px solid #cbd5e1;">
                  <td colspan="4" style="padding: 8px 10px; text-align: right; color: #0f172a;">মোট সর্বজনীন যোগফল:</td>
                  <td style="padding: 8px 10px; text-align: right; color: #0f172a;">${formatCurrency(totalPurchases)}</td>
                  <td style="padding: 8px 10px; text-align: right; color: #059669;">${formatCurrency(totalPaid)}</td>
                  <td style="padding: 8px 10px; text-align: right; color: #dc2626; font-size: 12px;">${formatCurrency(totalPayable)}</td>
                </tr>
              </tfoot>
            ` : ''}
          </table>
        </div>

        ${renderDocumentFooter(profile, pageNum, totalPages, isLastPage)}
      </div>
    `;
  }).join('');
};

// 3. Retailer Statement HTML
export const renderRetailerStatementHtml = (
  retailer: Retailer,
  orders: OrderInvoice[],
  profile?: BusinessProfile
): string => {
  const retailerOrders = orders.filter((o) => o.retailerId === retailer.id);

  // Sort chronologically by date ascending so even late-entered memos appear in exact calendar order
  const sortedOrders = [...retailerOrders].sort((a, b) => {
    const dateA = a.date || a.createdAt || '';
    const dateB = b.date || b.createdAt || '';
    const dateCmp = dateA.localeCompare(dateB);
    if (dateCmp !== 0) return dateCmp;
    const invA = a.invoiceNumber || a.invoiceNo || a.id || '';
    const invB = b.invoiceNumber || b.invoiceNo || b.id || '';
    return invA.localeCompare(invB);
  });

  const totalSales = retailer.totalPurchases || sortedOrders.reduce((sum, o) => sum + (o.totalAmount || 0), 0);
  const currentDue = retailer.outstandingDue || retailer.currentDue || 0;
  const totalPaid = Math.max(0, totalSales - currentDue);

  // Calculate opening due before these orders (if any)
  const totalOrderDue = sortedOrders.reduce((sum, o) => sum + (Number(o.dueAmount) || 0), 0);
  const calculatedOpeningDue = Math.max(0, currentDue - totalOrderDue);

  // Precompute row with chronological runningDue
  let tempDue = calculatedOpeningDue;
  const computedOrders = sortedOrders.map((ord, idx) => {
    const isPaid = (ord.dueAmount || 0) <= 0;
    const invNo = ord.invoiceNumber || ord.invoiceNo || ord.id.slice(0, 8);
    tempDue += (Number(ord.dueAmount) || 0);

    return {
      ord,
      idx,
      isPaid,
      invNo,
      runningDue: tempDue,
    };
  });

  const renderRow = (item: typeof computedOrders[0]) => {
    const { ord, idx, isPaid, invNo, runningDue } = item;
    return `
      <tr style="border-bottom: 1px solid #e2e8f0; background: ${idx % 2 === 0 ? '#ffffff' : '#f8fafc'}; font-size: 11px;">
        <td style="padding: 7px 8px; text-align: center; color: #64748b; font-weight: 700; font-family: monospace;">${toBnDigit(idx + 1)}</td>
        <td style="padding: 7px 10px; color: #475569; white-space: nowrap; font-weight: 600;">${formatDate(ord.date)}</td>
        <td style="padding: 7px 10px; font-weight: 700; color: #0f172a;">${invNo}</td>
        <td style="padding: 7px 10px; color: #334155;">${ord.paymentMethod || (isPaid ? 'নগদ বিক্রয়' : 'বাকি মেমো')}</td>
        <td style="padding: 7px 10px; text-align: right; font-weight: 600; color: #0f172a;">${formatCurrency(ord.totalAmount)}</td>
        <td style="padding: 7px 10px; text-align: right; font-weight: 600; color: #059669;">${formatCurrency(ord.paidAmount)}</td>
        <td style="padding: 7px 10px; text-align: right; font-weight: 700; color: ${ord.dueAmount > 0 ? '#dc2626' : '#64748b'};">${formatCurrency(ord.dueAmount)}</td>
        <td style="padding: 7px 10px; text-align: right; font-weight: 700; color: #dc2626;">${formatCurrency(runningDue)}</td>
        <td style="padding: 7px 10px; text-align: center;">
          <span style="padding: 2px 6px; border-radius: 4px; font-size: 9.5px; font-weight: 700; ${
            isPaid ? 'background: #dcfce7; color: #166534;' : 'background: #fee2e2; color: #991b1b;'
          }">
            ${isPaid ? 'পরিশোধিত' : 'বকেয়া'}
          </span>
        </td>
      </tr>
    `;
  };

  const chunks = chunkArray(computedOrders, 10, 18);
  const totalPages = chunks.length;

  return chunks.map((chunk, pageIdx) => {
    const pageNum = pageIdx + 1;
    const isFirstPage = pageNum === 1;
    const isLastPage = pageNum === totalPages;

    const rowsHtml = chunk.map(renderRow).join('');

    return `
      <div class="pdf-page">
        <div>
          ${isFirstPage ? `
            ${renderDocumentHeader(
              'খুচরা বিক্রেতা / রিটেইলার লেজার ও বাকি খাতা',
              'Retailer Ledger & Credit Statement',
              `${retailer.shopName || retailer.name}`,
              'অফিশিয়াল হিসাব কপি • স্বয়ংক্রিয় তারিখ ক্রমিক',
              profile
            )}

            <!-- Retailer Card -->
            <div style="display: grid; grid-template-columns: 1.4fr 1fr; gap: 16px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 14px 16px; margin-bottom: 20px;">
              <div>
                <div style="font-size: 10px; font-weight: 700; color: #64748b; text-transform: uppercase;">দোকানের বিবরণ (RETAILER SHOP)</div>
                <div style="font-size: 15px; font-weight: 800; color: #0f172a; margin-top: 2px;">${retailer.shopName || retailer.name}</div>
                <div style="font-size: 12px; color: #334155; font-weight: 600;">স্বত্বাধিকারী: ${retailer.ownerName || retailer.name}</div>
                <div style="font-size: 11px; color: #64748b; margin-top: 4px;">
                  <div>ফোন: <strong>${retailer.phone || '-'}</strong> | রুট/এলাকা: <strong>${retailer.route || 'সাধারণ'}</strong></div>
                  <div>ঠিকানা: ${retailer.address || 'বাংলাদেশ'}</div>
                </div>
              </div>

              <div style="text-align: right; border-left: 1px solid #e2e8f0; padding-left: 16px;">
                <div style="font-size: 11px; color: #64748b;">মোট মাল কেনা: <strong style="color: #0f172a;">${formatCurrency(totalSales)}</strong></div>
                <div style="font-size: 11px; color: #64748b; margin-top: 4px;">মোট ক্যাশ পরিশোধ: <strong style="color: #059669;">${formatCurrency(totalPaid)}</strong></div>
                <div style="font-size: 11px; color: #64748b; margin-top: 4px;">ক্রেডিট লিমিট: <strong>${formatCurrency(retailer.creditLimit || 0)}</strong></div>
                <div style="font-size: 14px; font-weight: 800; color: #dc2626; margin-top: 8px; padding-top: 6px; border-top: 1px solid #e2e8f0;">
                  বর্তমান মোট বাকি: ${formatCurrency(currentDue)}
                </div>
                ${calculatedOpeningDue > 0 ? `<div style="font-size: 10px; color: #64748b; margin-top: 2px;">পূর্ববর্তী প্রারম্ভিক বাকি: ${formatCurrency(calculatedOpeningDue)}</div>` : ''}
              </div>
            </div>
          ` : `
            ${renderContinuationHeader(
              'খুচরা বিক্রেতা / রিটেইলার লেজার ও বাকি খাতা',
              'Retailer Ledger Statement',
              pageNum,
              totalPages,
              profile
            )}
          `}

          <!-- Orders Table -->
          <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
            <thead>
              <tr style="background: #0f172a; color: #ffffff; font-size: 11px; font-weight: 700; text-align: left;">
                <th style="padding: 8px 8px; width: 35px; text-align: center; border-radius: 4px 0 0 0;">#</th>
                <th style="padding: 8px 10px;">তারিখ</th>
                <th style="padding: 8px 10px;">মেমো নং</th>
                <th style="padding: 8px 10px;">পেমেন্ট টাইপ</th>
                <th style="padding: 8px 10px; text-align: right;">মোট বিল</th>
                <th style="padding: 8px 10px; text-align: right;">জমা</th>
                <th style="padding: 8px 10px; text-align: right;">বাকি</th>
                <th style="padding: 8px 10px; text-align: right;">অবশিষ্ট বাকি</th>
                <th style="padding: 8px 10px; text-align: center; border-radius: 0 4px 0 0;">স্ট্যাটাস</th>
              </tr>
            </thead>
            <tbody>
              ${rowsHtml.length > 0 ? rowsHtml : `<tr><td colspan="9" style="text-align: center; padding: 20px; color: #94a3b8;">কোনো মেমোর তথ্য পাওয়া যায়নি।</td></tr>`}
            </tbody>
            ${isLastPage ? `
              <tfoot>
                <tr style="background: #f1f5f9; font-size: 11px; font-weight: 800; border-top: 2px solid #cbd5e1;">
                  <td colspan="4" style="padding: 8px 10px; text-align: right; color: #0f172a;">মোট যোগফল:</td>
                  <td style="padding: 8px 10px; text-align: right; color: #0f172a;">${formatCurrency(totalSales)}</td>
                  <td style="padding: 8px 10px; text-align: right; color: #059669;">${formatCurrency(totalPaid)}</td>
                  <td style="padding: 8px 10px; text-align: right; color: #dc2626;">${formatCurrency(currentDue)}</td>
                  <td style="padding: 8px 10px; text-align: right; color: #dc2626;">${formatCurrency(currentDue)}</td>
                  <td></td>
                </tr>
              </tfoot>
            ` : ''}
          </table>
        </div>

        ${renderDocumentFooter(profile, pageNum, totalPages, isLastPage)}
      </div>
    `;
  }).join('');
};

// 4. All Retailers Summary HTML
export const renderAllRetailersHtml = (retailers: Retailer[], profile?: BusinessProfile): string => {
  const totalSales = retailers.reduce((acc, r) => acc + (r.totalPurchases || 0), 0);
  const totalDue = retailers.reduce((acc, r) => acc + (r.outstandingDue || r.currentDue || 0), 0);
  const totalPaid = Math.max(0, totalSales - totalDue);

  const chunks = chunkArray(retailers, 12, 20);
  const totalPages = chunks.length;

  return chunks.map((chunk, pageIdx) => {
    const pageNum = pageIdx + 1;
    const isFirstPage = pageNum === 1;
    const isLastPage = pageNum === totalPages;
    const offset = isFirstPage ? 0 : 12 + (pageIdx - 1) * 20;

    const rows = chunk.map((r, idx) => {
      const globalIdx = offset + idx;
      const due = r.outstandingDue || r.currentDue || 0;
      const purchases = r.totalPurchases || 0;
      const paid = Math.max(0, purchases - due);

      return `
        <tr style="border-bottom: 1px solid #e2e8f0; background: ${globalIdx % 2 === 0 ? '#ffffff' : '#f8fafc'}; font-size: 11px;">
          <td style="padding: 8px 10px; color: #64748b; font-weight: 700; text-align: center;">${toBnDigit(globalIdx + 1)}</td>
          <td style="padding: 8px 10px; font-weight: 700; color: #0f172a;">${r.shopName || r.name}</td>
          <td style="padding: 8px 10px; color: #334155;">${r.ownerName || r.name}</td>
          <td style="padding: 8px 10px; color: #0284c7; font-weight: 600;">${r.route || '-'}</td>
          <td style="padding: 8px 10px; color: #64748b;">${r.phone || '-'}</td>
          <td style="padding: 8px 10px; text-align: right; font-weight: 600; color: #0f172a;">${formatCurrency(purchases)}</td>
          <td style="padding: 8px 10px; text-align: right; font-weight: 600; color: #059669;">${formatCurrency(paid)}</td>
          <td style="padding: 8px 10px; text-align: right; font-weight: 800; color: ${due > 0 ? '#dc2626' : '#059669'};">
            ${formatCurrency(due)}
          </td>
        </tr>
      `;
    }).join('');

    return `
      <div class="pdf-page">
        <div>
          ${isFirstPage ? `
            ${renderDocumentHeader(
              'সকল রিটেইলার দোকানের বাকি ও লেনদেন বিবরণী',
              'All Retailers Credit & Due Balance Summary',
              `মোট তালিকাভুক্ত দোকান: ${retailers.length} টি`,
              'অফিশিয়াল রিপোর্ট',
              profile
            )}

            <!-- Summary Stat Cards -->
            <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin-bottom: 20px;">
              <div style="background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 8px; padding: 12px; text-align: center;">
                <div style="font-size: 11px; color: #64748b; font-weight: 600;">সর্বমোট বিক্রয় মূল্য</div>
                <div style="font-size: 16px; font-weight: 800; color: #0f172a; margin-top: 4px;">${formatCurrency(totalSales)}</div>
              </div>
              <div style="background: #ecfdf5; border: 1px solid #a7f3d0; border-radius: 8px; padding: 12px; text-align: center;">
                <div style="font-size: 11px; color: #065f46; font-weight: 600;">মোট সংগৃহীত ক্যাশ টাকা</div>
                <div style="font-size: 16px; font-weight: 800; color: #059669; margin-top: 4px;">${formatCurrency(totalPaid)}</div>
              </div>
              <div style="background: #fef2f2; border: 1px solid #fecaca; border-radius: 8px; padding: 12px; text-align: center;">
                <div style="font-size: 11px; color: #991b1b; font-weight: 600;">বাজারে মোট অবশিষ্ট বাকি (পাওনা)</div>
                <div style="font-size: 16px; font-weight: 800; color: #dc2626; margin-top: 4px;">${formatCurrency(totalDue)}</div>
              </div>
            </div>
          ` : `
            ${renderContinuationHeader(
              'সকল রিটেইলার দোকানের বাকি ও লেনদেন বিবরণী',
              'All Retailers Credit & Due Balance Summary',
              pageNum,
              totalPages,
              profile
            )}
          `}

          <!-- Table -->
          <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
            <thead>
              <tr style="background: #0f172a; color: #ffffff; font-size: 11px; font-weight: 700; text-align: left;">
                <th style="padding: 8px 10px; width: 36px; border-radius: 4px 0 0 0;">#</th>
                <th style="padding: 8px 10px;">দোকানের নাম</th>
                <th style="padding: 8px 10px;">স্বত্বাধিকারী</th>
                <th style="padding: 8px 10px;">রুট</th>
                <th style="padding: 8px 10px;">মোবাইল</th>
                <th style="padding: 8px 10px; text-align: right;">মোট ক্রয়</th>
                <th style="padding: 8px 10px; text-align: right;">নগদ জমা</th>
                <th style="padding: 8px 10px; text-align: right; border-radius: 0 4px 0 0;">চলতি বাকি</th>
              </tr>
            </thead>
            <tbody>
              ${rows}
            </tbody>
            ${isLastPage ? `
              <tfoot>
                <tr style="background: #f1f5f9; font-size: 11px; font-weight: 800; border-top: 2px solid #cbd5e1;">
                  <td colspan="5" style="padding: 8px 10px; text-align: right; color: #0f172a;">মোট সর্বজনীন যোগফল:</td>
                  <td style="padding: 8px 10px; text-align: right; color: #0f172a;">${formatCurrency(totalSales)}</td>
                  <td style="padding: 8px 10px; text-align: right; color: #059669;">${formatCurrency(totalPaid)}</td>
                  <td style="padding: 8px 10px; text-align: right; color: #dc2626; font-size: 12px;">${formatCurrency(totalDue)}</td>
                </tr>
              </tfoot>
            ` : ''}
          </table>
        </div>

        ${renderDocumentFooter(profile, pageNum, totalPages, isLastPage)}
      </div>
    `;
  }).join('');
};

export interface InvoiceMemoPdfOptions {
  includeProfit?: boolean;
  isAdmin?: boolean;
  products?: Product[];
}

// 5. POS Invoice Wholesale Memo HTML
export const renderInvoiceMemoHtml = (
  invoice: OrderInvoice,
  retailer?: Retailer,
  profile?: BusinessProfile,
  options?: InvoiceMemoPdfOptions
): string => {
  const items = invoice.items || [];
  const isCash = (invoice.dueAmount || 0) <= 0;
  const invNo = invoice.invoiceNo || invoice.id.slice(0, 8);
  const discount = invoice.discountAmount || invoice.discount || 0;
  const showProfit = Boolean(options?.includeProfit || options?.isAdmin);
  const productsList = options?.products || [];

  // Compute piece counts (কত পিস বিক্রয়, কত পিস ফেরত, মোট নিট পিস)
  const totalSoldPieces = invoice.totalSoldPieces !== undefined
    ? invoice.totalSoldPieces
    : items
        .filter((i) => !(i.itemType === 'REPLACEMENT' || i.isReplacement || Number(i.quantity) < 0))
        .reduce((sum, i) => sum + (i.quantity !== undefined && !isNaN(Number(i.quantity)) ? Math.max(0, Number(i.quantity)) : 0), 0);

  const totalReturnedPieces = invoice.totalReturnedPieces !== undefined
    ? invoice.totalReturnedPieces
    : items
        .filter((i) => (i.itemType === 'REPLACEMENT' || i.isReplacement || Number(i.quantity) < 0))
        .reduce((sum, i) => sum + (i.quantity !== undefined && !isNaN(Number(i.quantity)) ? Math.max(0, Number(i.quantity)) : 0), 0);

  const netPieces = invoice.netPieces !== undefined ? invoice.netPieces : (totalSoldPieces - totalReturnedPieces);

  // Compute overall profit & cost with user's business rule:
  // "মার্কেট রিফ্লেক্স পণ্য থেকে মুনাফাটাও মাইনাস হবে কারণ পন্য ফেরত আসার সাথে সাথে ওই পণ্য থেকে মুনাফাটাও টাকা কমে গেছে, তাই ইনভয়সে বিক্রির মুনাফা থেকে রিপ্লেস মুনাফা মাইনাস হয়ে নিট মুনাফা দেখাবে ।"
  let totalCost = 0;
  let totalGrossProfit = 0;
  let totalReplacementCost = 0;
  let totalReplacementProfit = 0;

  items.forEach((item) => {
    const isRep = item.itemType === 'REPLACEMENT' || item.isReplacement || Number(item.quantity) < 0;
    const cleanQty = item.quantity !== undefined && item.quantity !== null && !isNaN(Number(item.quantity)) ? Math.max(0, Number(item.quantity)) : 0;
    const cleanPrice = Number(item.unitPrice || 0);
    const matched = productsList.find(
      (p) => p.id === item.productId || (p.name && item.productName && p.name.trim().toLowerCase() === item.productName.trim().toLowerCase())
    );
    const cleanCost = Number(item.costPrice ?? matched?.costPrice ?? (cleanPrice > 0 ? Math.round(cleanPrice * 0.85) : 0));

    if (!isRep) {
      const lineCost = cleanQty * cleanCost;
      const lineProfit = cleanQty * (cleanPrice - cleanCost);
      totalCost += lineCost;
      totalGrossProfit += lineProfit;
    } else {
      const repLineCost = cleanQty * cleanCost;
      const repLineProfit = cleanQty * Math.max(0, cleanPrice - cleanCost);
      totalReplacementCost += repLineCost;
      totalReplacementProfit += repLineProfit;
    }
  });

  const repTotal = invoice.totalReplacementAmount || items
    .filter((i) => i.isReplacement || i.itemType === 'REPLACEMENT' || Number(i.quantity) < 0)
    .reduce((sum, i) => sum + Math.abs((Number(i.quantity) || 0) * (Number(i.unitPrice) || 0)), 0);
  const grossSales = invoice.totalSalesAmount || (repTotal > 0 ? ((invoice.subtotal || invoice.totalAmount) + repTotal) : (invoice.subtotal || invoice.totalAmount));

  const memoDiscount = Number(invoice.discount || 0);
  const memoPriceDiff = Number(invoice.priceDifference || 0);
  const netRealizedProfit = Math.max(0, totalGrossProfit - totalReplacementProfit - memoDiscount + memoPriceDiff);

  // Chunk for pagination (8 items on first page, 14 on continuation)
  const chunks = chunkArray(items, showProfit ? 7 : 8, showProfit ? 12 : 14);
  const totalPages = chunks.length;

  return chunks.map((chunk, pageIdx) => {
    const pageNum = pageIdx + 1;
    const isFirstPage = pageNum === 1;
    const isLastPage = pageNum === totalPages;
    const offset = isFirstPage ? 0 : (showProfit ? 7 : 8) + (pageIdx - 1) * (showProfit ? 12 : 14);

    const rows = chunk.map((item, idx) => {
      const globalIdx = offset + idx;
      const isRep = item.itemType === 'REPLACEMENT' || item.isReplacement || Number(item.quantity) < 0;
      const cleanQty = item.quantity !== undefined && item.quantity !== null && !isNaN(Number(item.quantity)) ? Math.max(0, Number(item.quantity)) : 0;
      const cleanPrice = Number(item.unitPrice || 0);
      const matched = productsList.find(
        (p) => p.id === item.productId || (p.name && item.productName && p.name.trim().toLowerCase() === item.productName.trim().toLowerCase())
      );
      const cleanCost = Number(item.costPrice ?? matched?.costPrice ?? (cleanPrice > 0 ? Math.round(cleanPrice * 0.85) : 0));
      const unitProfit = cleanPrice - cleanCost;
      const lineProfit = isRep ? -(cleanQty * Math.max(0, unitProfit)) : (cleanQty * unitProfit);
      const marginPct = cleanPrice > 0 && !isRep ? ((unitProfit / cleanPrice) * 100) : 0;
      const itemTotal = isRep ? -(cleanQty * cleanPrice) : (cleanQty * cleanPrice);

      const challanRefBadge = item.challanRefNo
        ? `<div style="font-size: 8.5px; color: #0284c7; font-family: monospace; font-weight: 600; margin-top: 1px;">রেফ চালান: #${item.challanRefNo}</div>`
        : '';
      const repBadge = isRep
        ? `<span style="display:inline-block; font-size:8.5px; background:#fee2e2; color:#b91c1c; border:1px solid #fca5a5; padding:1px 4px; border-radius:3px; font-weight:700; margin-left:4px;">রিপ্লেস (-)</span>`
        : `<span style="display:inline-block; font-size:8.5px; background:#dcfce7; color:#15803d; border:1px solid #86efac; padding:1px 4px; border-radius:3px; font-weight:700; margin-left:4px;">বিক্রয় (+)</span>`;

      if (showProfit) {
        return `
          <tr style="border-bottom: 1px solid #e2e8f0; background: ${isRep ? '#fff5f5' : (globalIdx % 2 === 0 ? '#ffffff' : '#f8fafc')}; font-size: 10.5px;">
            <td style="padding: 6px 8px; color: #64748b; font-weight: 700; width: 28px; text-align: center;">${toBnDigit(globalIdx + 1)}</td>
            <td style="padding: 6px 8px; font-weight: 700; color: ${isRep ? '#991b1b' : '#0f172a'};">
              <div>${item.bnProductName || item.productName || 'পণ্য'} ${repBadge}</div>
              ${item.sku ? `<div style="font-size: 9px; color: #64748b; font-mono font-weight: normal;">SKU: ${item.sku}</div>` : ''}
              ${item.replacementReason ? `<div style="font-size: 9px; color: #dc2626; margin-top: 1px;">কারণ: ${item.replacementReason}</div>` : ''}
              ${challanRefBadge}
            </td>
            <td style="padding: 6px 8px; text-align: center; font-weight: 700; color: ${isRep ? '#dc2626' : '#0f172a'}; font-family: monospace;">
              ${isRep ? '-' : '+'}${toBnDigit(cleanQty)} ${item.unit || 'পিস'}
            </td>
            <td style="padding: 6px 8px; text-align: right; color: #334155; font-family: monospace;">${formatCurrency(cleanPrice)}</td>
            <td style="padding: 6px 8px; text-align: right; color: #64748b; font-family: monospace; font-size: 10px;">${formatCurrency(cleanCost)}</td>
            <td style="padding: 6px 8px; text-align: right; font-weight: 700; color: ${isRep ? '#dc2626' : (unitProfit >= 0 ? '#059669' : '#dc2626')}; font-family: monospace; font-size: 10px;">
              ${isRep ? '-' + formatCurrency(Math.max(0, unitProfit)) : (unitProfit >= 0 ? '+' : '') + formatCurrency(unitProfit)}
            </td>
            <td style="padding: 6px 8px; text-align: right; font-weight: 800; color: ${isRep ? '#b91c1c' : (lineProfit >= 0 ? '#047857' : '#dc2626')}; font-family: monospace;">
              ${isRep ? '-' + formatCurrency(Math.abs(lineProfit)) : (lineProfit >= 0 ? '+' : '') + formatCurrency(lineProfit)}
              ${isRep ? `<div style="font-size: 8px; font-weight: 700; color: #dc2626;">রিপ্লেস মুনাফা কর্তন</div>` : (cleanPrice > 0 ? `<div style="font-size: 8px; font-weight: 600; color: #64748b;">${marginPct.toFixed(0)}% লাভ</div>` : '')}
            </td>
            <td style="padding: 6px 8px; text-align: right; font-weight: 700; color: ${isRep ? '#dc2626' : '#0f172a'}; font-family: monospace;">
              ${isRep ? '-' : ''}${formatCurrency(Math.abs(itemTotal))}
            </td>
          </tr>
        `;
      }

      return `
        <tr style="border-bottom: 1px solid #e2e8f0; background: ${isRep ? '#fff5f5' : (globalIdx % 2 === 0 ? '#ffffff' : '#f8fafc')}; font-size: 11px;">
          <td style="padding: 7px 10px; color: #64748b; font-weight: 700; width: 30px; text-align: center;">${toBnDigit(globalIdx + 1)}</td>
          <td style="padding: 7px 10px; font-weight: 700; color: ${isRep ? '#991b1b' : '#0f172a'};">
            <div>${item.bnProductName || item.productName || 'পণ্য'} ${repBadge}</div>
            ${item.replacementReason ? `<div style="font-size: 9.5px; color: #dc2626; margin-top: 1px;">কারণ: ${item.replacementReason}</div>` : ''}
            ${challanRefBadge}
          </td>
          <td style="padding: 7px 10px; color: #64748b;">${item.sku || 'আইটেম'}</td>
          <td style="padding: 7px 10px; text-align: center; font-weight: 700; color: ${isRep ? '#dc2626' : '#0f172a'};">
            ${isRep ? '-' : ''}${toBnDigit(cleanQty)} ${item.unit || 'পিস'}
          </td>
          <td style="padding: 7px 10px; text-align: right; color: #334155;">${formatCurrency(cleanPrice)}</td>
          <td style="padding: 7px 10px; text-align: right; font-weight: 700; color: ${isRep ? '#dc2626' : '#0f172a'};">
            ${isRep ? '-' : ''}${formatCurrency(Math.abs(itemTotal))}
          </td>
        </tr>
      `;
    }).join('');

    return `
      <div class="pdf-page">
        <div>
          ${isFirstPage ? `
            ${renderDocumentHeader(
              showProfit ? 'পাইকারি বিক্রয় চালান ও লভ্যাংশ কপি (এডমিন)' : 'পাইকারি বিক্রয় চালান ও ক্যাশ মেমো',
              showProfit ? 'Wholesale Sales Invoice & Profit Statement (Admin Copy)' : 'Wholesale Sales Invoice & Memo',
              `চালান নং: ${invNo}`,
              showProfit ? 'এডমিন লভ্যাংশ কপি' : (isCash ? 'নগদ মেমো' : 'বাকি বিক্রয় মেমো'),
              profile
            )}

            <!-- Invoice Top Bar Details -->
            <div style="display: grid; grid-template-columns: 1.4fr 1fr; gap: 14px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px 14px; margin-bottom: 16px;">
              <div>
                <div style="font-size: 9.5px; font-weight: 700; color: #64748b; text-transform: uppercase;">ক্রেতা / দোকানের বিবরণ (CUSTOMER INFO)</div>
                <div style="font-size: 15px; font-weight: 800; color: #0f172a; margin-top: 2px;">
                  ${invoice.customerName || invoice.shopName || retailer?.shopName || invoice.retailerName || 'নগদ ক্রেতা'}
                </div>
                ${invoice.shopName && invoice.customerName && invoice.shopName !== invoice.customerName ? `<div style="font-size: 11.5px; color: #334155; font-weight: 600;">দোকান / প্রতিষ্ঠান: ${invoice.shopName}</div>` : ''}
                <div style="font-size: 10.5px; color: #64748b; margin-top: 3px;">
                  <div>ফোন: <strong>${invoice.retailerPhone || retailer?.phone || '-'}</strong> | রুট: ${retailer?.route || (invoice.saleMode === 'RETAIL' ? 'খুচরা বিক্রয়' : 'কাউন্টার')}</div>
                  <div>ঠিকানা: ${invoice.retailerAddress || retailer?.address || 'স্থানীয় বাজার'}</div>
                </div>

                <!-- Piece Counts Badge Ribbon (বিক্রয়, ফেরত ও নিট পিস) -->
                <div style="margin-top: 6px; display: inline-flex; align-items: center; gap: 8px; background: #ffffff; border: 1.5px solid #cbd5e1; padding: 3px 8px; border-radius: 5px; font-size: 10px; font-weight: 700;">
                  <span style="color: #15803d;">📦 মোট বিক্রয়: <strong>${toBnDigit(totalSoldPieces)} পিস</strong></span>
                  <span style="color: #cbd5e1;">•</span>
                  <span style="color: #dc2626;">🔄 মার্কেট ফেরত: <strong>${toBnDigit(totalReturnedPieces)} পিস</strong></span>
                  <span style="color: #cbd5e1;">•</span>
                  <span style="color: #0f172a;">⚡ নিট পণ্য: <strong>${toBnDigit(netPieces)} পিস</strong></span>
                  ${showProfit ? `<span style="background: #fef3c7; color: #92400e; border: 1px solid #fcd34d; padding: 1px 4px; border-radius: 3px; font-size: 9px; font-weight: 800;">💼 এডমিন লভ্যাংশ কপি</span>` : ''}
                </div>
              </div>

              <div style="text-align: right; border-left: 1px solid #e2e8f0; padding-left: 14px; font-size: 10.5px; color: #475569;">
                <div>চালান নং: <strong style="color: #0f172a; font-size: 12px;">${invNo}</strong></div>
                <div style="margin-top: 2px;">তারিখ: <strong>${formatDate(invoice.date)}</strong></div>
                <div style="margin-top: 2px;">বিক্রয়কর্মী: <strong>${invoice.salesPersonName || invoice.creatorName || 'ডিপো ক্যাশিয়ার'}</strong></div>
                <div style="margin-top: 4px;">
                  পেমেন্ট মোড: <span style="font-weight: 700; color: ${isCash ? '#059669' : '#dc2626'};">${isCash ? 'নগদ (CASH)' : 'বাকি (CREDIT)'}</span>
                </div>
              </div>
            </div>
          ` : `
            ${renderContinuationHeader(
              showProfit ? 'পাইকারি বিক্রয় চালান ও লভ্যাংশ কপি (এডমিন)' : 'পাইকারি বিক্রয় চালান ও ক্যাশ মেমো',
              `Invoice Memo #${invNo}`,
              pageNum,
              totalPages,
              profile
            )}
          `}

          <!-- Items Table -->
          <table style="width: 100%; border-collapse: collapse; margin-bottom: 16px;">
            <thead>
              ${showProfit ? `
                <tr style="background: #0f172a; color: #ffffff; font-size: 10px; font-weight: 700; text-align: left;">
                  <th style="padding: 7px 8px; width: 28px; border-radius: 4px 0 0 0; text-align: center;">#</th>
                  <th style="padding: 7px 8px;">পণ্যের বিবরণ</th>
                  <th style="padding: 7px 8px; text-align: center;">পরিমাণ</th>
                  <th style="padding: 7px 8px; text-align: right;">বিক্রয় দর</th>
                  <th style="padding: 7px 8px; text-align: right; background: #1e293b; color: #cbd5e1;">কেনা দর</th>
                  <th style="padding: 7px 8px; text-align: right; background: #064e3b; color: #a7f3d0;">একক লাভ</th>
                  <th style="padding: 7px 8px; text-align: right; background: #064e3b; color: #6ee7b7;">মোট লভ্যাংশ</th>
                  <th style="padding: 7px 8px; text-align: right; border-radius: 0 4px 0 0;">মোট বিক্রয়</th>
                </tr>
              ` : `
                <tr style="background: #0f172a; color: #ffffff; font-size: 11px; font-weight: 700; text-align: left;">
                  <th style="padding: 8px 10px; width: 30px; border-radius: 4px 0 0 0; text-align: center;">#</th>
                  <th style="padding: 8px 10px;">পণ্যের বিবরণ</th>
                  <th style="padding: 8px 10px;">SKU / কোড</th>
                  <th style="padding: 8px 10px; text-align: center;">পরিমাণ</th>
                  <th style="padding: 8px 10px; text-align: right;">দর (রেট)</th>
                  <th style="padding: 8px 10px; text-align: right; border-radius: 0 4px 0 0;">মোট মূল্য</th>
                </tr>
              `}
            </thead>
            <tbody>
              ${rows.length > 0 ? rows : `<tr><td colspan="${showProfit ? 8 : 6}" style="text-align: center; padding: 20px; color: #94a3b8;">কোনো পণ্য অন্তর্ভুক্ত নেই।</td></tr>`}
            </tbody>
            ${isLastPage ? `
              <tfoot>
                <tr style="background: #f1f5f9; font-size: 10.5px; font-weight: 800; border-top: 2px solid #cbd5e1;">
                  <td colspan="${showProfit ? 2 : 3}" style="padding: 7px 8px; text-align: right; color: #0f172a;">
                    মোট পরিমাণ হিসাব:
                  </td>
                  <td style="padding: 7px 8px; text-align: center; color: #0f172a; font-family: monospace;">
                    <span style="color: #15803d;">+${toBnDigit(totalSoldPieces)}</span> / <span style="color: #dc2626;">-${toBnDigit(totalReturnedPieces)}</span> = <strong>${toBnDigit(netPieces)} পিস</strong>
                  </td>
                  ${showProfit ? `
                    <td style="padding: 7px 8px; text-align: right; color: #475569;">-</td>
                    <td style="padding: 7px 8px; text-align: right; color: #64748b; font-size: 9.5px;">কেনা: ${formatCurrency(totalCost)}</td>
                    <td style="padding: 7px 8px; text-align: right; color: #047857; font-size: 9.5px;">-</td>
                    <td style="padding: 7px 8px; text-align: right; color: #047857; font-weight: 800;">+${formatCurrency(totalGrossProfit)}</td>
                    <td style="padding: 7px 8px; text-align: right; color: #0f172a; font-weight: 800;">${formatCurrency(invoice.subtotal || invoice.totalAmount)}</td>
                  ` : `
                    <td style="padding: 7px 10px; text-align: right; color: #64748b;">উপমোট:</td>
                    <td style="padding: 7px 10px; text-align: right; color: #0f172a; font-weight: 800;">${formatCurrency(invoice.subtotal || invoice.totalAmount)}</td>
                  `}
                </tr>
              </tfoot>
            ` : ''}
          </table>

          ${isLastPage ? `
            <!-- Bottom Financial Summary Box -->
            <div style="display: flex; justify-content: flex-end; margin-bottom: 18px;">
              <div style="width: 350px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px 14px; font-size: 11px;">
                
                <!-- Pieces Breakdown Box (কত পিস বিক্রয়, কত পিস ফেরত, মোট নিট পিস) -->
                <div style="background: #ffffff; border: 1px solid #e2e8f0; border-radius: 6px; padding: 6px 10px; margin-bottom: 8px; font-size: 10.5px;">
                  <div style="font-weight: 700; color: #475569; margin-bottom: 3px; text-transform: uppercase; font-size: 9px; letter-spacing: 0.3px;">পণ্য ডেলিভারি হিসাব (PIECE QUANTITY)</div>
                  <div style="display: flex; justify-content: space-between; color: #15803d; font-weight: 600; padding: 1px 0;">
                    <span>কত পিস বিক্রয় (Sold Pieces):</span>
                    <strong>${toBnDigit(totalSoldPieces)} পিস</strong>
                  </div>
                  <div style="display: flex; justify-content: space-between; color: #dc2626; font-weight: 600; padding: 1px 0;">
                    <span>কত পিস ফেরত (Market Returns):</span>
                    <strong>${toBnDigit(totalReturnedPieces)} পিস</strong>
                  </div>
                  <div style="display: flex; justify-content: space-between; border-top: 1px dashed #cbd5e1; padding-top: 2px; margin-top: 2px; color: #0f172a; font-weight: 800;">
                    <span>সর্বমোট নিট ডেলিভারি (Net Pieces):</span>
                    <strong>${toBnDigit(netPieces)} পিস</strong>
                  </div>
                </div>

                ${repTotal > 0 ? `
                  <div style="display: flex; justify-content: space-between; padding: 3px 0; color: #15803d; font-weight: 600;">
                    <span>মোট বিক্রয় পণ্য (+):</span>
                    <span>+${formatCurrency(grossSales)}</span>
                  </div>
                  <div style="display: flex; justify-content: space-between; padding: 3px 0; color: #b91c1c; font-weight: 700;">
                    <span>মার্কেট রিপ্লেস ফেরত (-):</span>
                    <span>-${formatCurrency(repTotal)}</span>
                  </div>
                  <div style="display: flex; justify-content: space-between; padding: 4px 0; border-top: 1px dashed #cbd5e1; color: #64748b; font-weight: 600;">
                    <span>সমন্বয়কৃত উপমোট:</span>
                    <strong style="color: #0f172a;">${formatCurrency(invoice.subtotal || (grossSales - repTotal))}</strong>
                  </div>
                ` : `
                  <div style="display: flex; justify-content: space-between; padding: 4px 0; color: #64748b;">
                    <span>মোট পণ্যের মূল্য (Subtotal):</span>
                    <strong style="color: #0f172a;">${formatCurrency(invoice.subtotal || invoice.totalAmount)}</strong>
                  </div>
                `}
                ${
                  discount > 0
                    ? `<div style="display: flex; justify-content: space-between; padding: 4px 0; color: #059669;">
                        <span>বিশেষ ছাড় (Discount):</span>
                        <strong>-${formatCurrency(discount)}</strong>
                      </div>`
                    : ''
                }
                <div style="display: flex; justify-content: space-between; padding: 6px 0; border-top: 1.5px solid #cbd5e1; font-size: 13px; font-weight: 800; color: #0f172a;">
                  <span>সর্বমোট বিল (Net Total):</span>
                  <span>${formatCurrency(invoice.totalAmount)}</span>
                </div>
                <div style="display: flex; justify-content: space-between; padding: 4px 0; color: #059669; font-weight: 700;">
                  <span>নগদ গ্রহণ (Paid Cash):</span>
                  <span>${formatCurrency(invoice.paidAmount)}</span>
                </div>
                <div style="display: flex; justify-content: space-between; padding: 6px 0; border-top: 1px dashed #cbd5e1; font-size: 13px; font-weight: 800; color: #dc2626;">
                  <span>চলতি মেমোর বাকি (Due):</span>
                  <span>${formatCurrency(invoice.dueAmount)}</span>
                </div>

                <!-- Admin Profit Breakdown Box (যদি এডমিন থেকে প্রিন্ট বা ডাউনলোড হয়) -->
                ${showProfit ? `
                  <div style="margin-top: 8px; background: #ecfdf5; border: 1.5px solid #10b981; border-radius: 6px; padding: 8px 10px; font-size: 10.5px;">
                    <div style="font-size: 9.5px; font-weight: 800; color: #047857; text-transform: uppercase; letter-spacing: 0.5px; border-bottom: 1px solid #a7f3d0; padding-bottom: 3px; margin-bottom: 5px;">
                      💼 এডমিন লভ্যাংশ সারসংক্ষেপ (ADMIN PROFIT SUMMARY)
                    </div>
                    <div style="display: flex; justify-content: space-between; color: #334155; padding: 2px 0;">
                      <span>মোট পণ্য বিক্রয় মূল্য (+):</span>
                      <strong>${formatCurrency(grossSales)}</strong>
                    </div>
                    ${repTotal > 0 ? `
                      <div style="display: flex; justify-content: space-between; color: #b91c1c; font-weight: 600; padding: 2px 0;">
                        <span>মার্কেট রিপ্লেস ফেরত (-):</span>
                        <span>-${formatCurrency(repTotal)}</span>
                      </div>
                      <div style="display: flex; justify-content: space-between; color: #475569; font-size: 10px; padding: 2px 0; border-top: 1px dashed #cbd5e1;">
                        <span>সমন্বয়কৃত নিট বিক্রয় বিল:</span>
                        <strong>${formatCurrency(invoice.subtotal || invoice.totalAmount)}</strong>
                      </div>
                    ` : ''}
                    <div style="display: flex; justify-content: space-between; color: #047857; font-weight: 700; padding: 2px 0; border-top: 1px dashed #a7f3d0; margin-top: 2px;">
                      <span>বিক্রিত পণ্যের লাভ (+):</span>
                      <span>+${formatCurrency(totalGrossProfit)}</span>
                    </div>
                    ${totalReplacementProfit > 0 ? `
                      <div style="display: flex; justify-content: space-between; color: #b91c1c; font-weight: 700; padding: 2px 0;">
                        <span>রিপ্লেস ফেরত কর্তন মুনাফা (-):</span>
                        <span>-${formatCurrency(totalReplacementProfit)}</span>
                      </div>
                    ` : ''}
                    ${memoDiscount > 0 ? `
                      <div style="display: flex; justify-content: space-between; color: #dc2626; font-size: 10px; padding: 2px 0;">
                        <span>মেমো বিশেষ ছাড় (-):</span>
                        <span>-${formatCurrency(memoDiscount)}</span>
                      </div>
                    ` : ''}
                    ${memoPriceDiff !== 0 ? `
                      <div style="display: flex; justify-content: space-between; color: ${memoPriceDiff > 0 ? '#059669' : '#dc2626'}; font-size: 10px; padding: 2px 0;">
                        <span>ক্যাশ মেমো সমন্বয়:</span>
                        <span>${memoPriceDiff > 0 ? '+' : ''}${formatCurrency(memoPriceDiff)}</span>
                      </div>
                    ` : ''}
                    <div style="display: flex; justify-content: space-between; color: #0f172a; font-weight: 900; font-size: 12px; border-top: 1.5px solid #10b981; padding-top: 4px; margin-top: 4px;">
                      <span>সর্বমোট নিট লাভ (Net Profit):</span>
                      <span style="color: #047857;">${formatCurrency(netRealizedProfit)}</span>
                    </div>
                  </div>
                ` : ''}
              </div>
            </div>
          ` : ''}
        </div>

        ${renderDocumentFooter(profile, pageNum, totalPages, isLastPage)}
      </div>
    `;
  }).join('');
};

// 6. Daily Sales Statement HTML
export const renderDailySalesHtml = (orders: OrderInvoice[], filterDate?: string, profile?: BusinessProfile): string => {
  const isAllDates = filterDate === 'ALL' || (!filterDate && orders.length > 0 && !orders.every(o => (o.date || '').startsWith(new Date().toISOString().slice(0, 10))));
  const targetDateStr = filterDate && filterDate !== 'ALL' ? filterDate : new Date().toISOString().split('T')[0];
  const targetOrders = (isAllDates
    ? [...orders]
    : orders.filter((o) => (o.date || '').startsWith(targetDateStr))
  ).sort((a, b) => {
    const dateA = a.date || a.createdAt || '';
    const dateB = b.date || b.createdAt || '';
    const dateCmp = dateB.localeCompare(dateA); // Newest date first
    if (dateCmp !== 0) return dateCmp;
    const invA = a.invoiceNumber || a.invoiceNo || a.id || '';
    const invB = b.invoiceNumber || b.invoiceNo || b.id || '';
    return invA.localeCompare(invB);
  });

  const totalSales = targetOrders.reduce((acc, o) => acc + (o.totalAmount || 0), 0);
  const totalCash = targetOrders.reduce((acc, o) => acc + (o.paidAmount || 0), 0);
  const totalDue = targetOrders.reduce((acc, o) => acc + (o.dueAmount || 0), 0);

  const totalSoldPieces = targetOrders.reduce((acc, ord) => {
    return acc + (ord.totalSoldPieces !== undefined
      ? ord.totalSoldPieces
      : (ord.items || []).filter((i) => !(i.itemType === 'REPLACEMENT' || i.isReplacement || Number(i.quantity) < 0)).reduce((s, i) => s + (i.quantity !== undefined && !isNaN(Number(i.quantity)) ? Math.abs(Number(i.quantity)) : 0), 0));
  }, 0);

  const totalReturnedPieces = targetOrders.reduce((acc, ord) => {
    return acc + (ord.totalReturnedPieces !== undefined
      ? ord.totalReturnedPieces
      : (ord.items || []).filter((i) => (i.itemType === 'REPLACEMENT' || i.isReplacement || Number(i.quantity) < 0)).reduce((s, i) => s + (i.quantity !== undefined && !isNaN(Number(i.quantity)) ? Math.abs(Number(i.quantity)) : 0), 0));
  }, 0);

  const netPieces = totalSoldPieces - totalReturnedPieces;

  const chunks = chunkArray(targetOrders, 12, 20);
  const totalPages = chunks.length;

  return chunks.map((chunk, pageIdx) => {
    const pageNum = pageIdx + 1;
    const isFirstPage = pageNum === 1;
    const isLastPage = pageNum === totalPages;
    const offset = isFirstPage ? 0 : 12 + (pageIdx - 1) * 20;

    const rows = chunk.map((ord, idx) => {
      const globalIdx = offset + idx;
      return `
        <tr style="border-bottom: 1px solid #e2e8f0; background: ${globalIdx % 2 === 0 ? '#ffffff' : '#f8fafc'}; font-size: 11px;">
          <td style="padding: 7px 10px; color: #64748b; font-weight: 700; text-align: center;">${toBnDigit(globalIdx + 1)}</td>
          <td style="padding: 7px 10px; font-weight: 700; color: #0f172a;">${ord.invoiceNumber || ord.invoiceNo || ord.id.slice(0, 8)}</td>
          <td style="padding: 7px 10px; color: #0f172a; font-weight: 600;">${ord.retailerName}</td>
          <td style="padding: 7px 10px; color: #64748b;">${ord.salesPersonName || ord.creatorName || '-'}</td>
          <td style="padding: 7px 10px; text-align: right; font-weight: 600; color: #0f172a;">${formatCurrency(ord.totalAmount)}</td>
          <td style="padding: 7px 10px; text-align: right; font-weight: 600; color: #059669;">${formatCurrency(ord.paidAmount)}</td>
          <td style="padding: 7px 10px; text-align: right; font-weight: 700; color: ${ord.dueAmount > 0 ? '#dc2626' : '#64748b'};">
            ${formatCurrency(ord.dueAmount)}
          </td>
        </tr>
      `;
    }).join('');

    return `
      <div class="pdf-page">
        <div>
          ${isFirstPage ? `
            ${renderDocumentHeader(
              'দৈনিক বিক্রয় রেজিস্টার ও ক্যাশ আদায় বিবরণী',
              'Daily Wholesale Sales & Cash Collection Register',
              `${isAllDates ? 'সকল তারিখের চালান বিবরণী' : `তারিখ: ${targetDateStr}`} • মোট চালান: ${toBnDigit(targetOrders.length)} টি`,
              'দৈনিক বিক্রয় রেজিস্টার',
              profile
            )}

            <!-- Piece Counts Summary Banner -->
            <div style="background: #ffffff; border: 1.5px solid #cbd5e1; border-radius: 8px; padding: 7px 14px; margin-bottom: 12px; display: flex; justify-content: space-around; font-size: 11px; font-weight: 700;">
              <div style="color: #15803d;">📦 মোট বিক্রয় পণ্য: <strong>${toBnDigit(totalSoldPieces)} পিস</strong></div>
              <div style="color: #cbd5e1;">|</div>
              <div style="color: #dc2626;">🔄 মার্কেট ফেরত / রিপ্লেস: <strong>${toBnDigit(totalReturnedPieces)} পিস</strong></div>
              <div style="color: #cbd5e1;">|</div>
              <div style="color: #0f172a;">⚡ সর্বমোট নিট ডেলিভারি: <strong>${toBnDigit(netPieces)} পিস</strong></div>
            </div>

            <!-- Metric Cards -->
            <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-bottom: 20px;">
              <div style="background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 8px; padding: 10px; text-align: center;">
                <div style="font-size: 10px; color: #64748b;">মোট মেমো সংখ্যা</div>
                <div style="font-size: 16px; font-weight: 800; color: #0f172a; margin-top: 2px;">${targetOrders.length} টি</div>
              </div>
              <div style="background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 8px; padding: 10px; text-align: center;">
                <div style="font-size: 10px; color: #64748b;">মোট বিক্রয় মূল্য</div>
                <div style="font-size: 16px; font-weight: 800; color: #0f172a; margin-top: 2px;">${formatCurrency(totalSales)}</div>
              </div>
              <div style="background: #ecfdf5; border: 1px solid #a7f3d0; border-radius: 8px; padding: 10px; text-align: center;">
                <div style="font-size: 10px; color: #065f46;">নগদ আদায়</div>
                <div style="font-size: 16px; font-weight: 800; color: #059669; margin-top: 2px;">${formatCurrency(totalCash)}</div>
              </div>
              <div style="background: #fef2f2; border: 1px solid #fecaca; border-radius: 8px; padding: 10px; text-align: center;">
                <div style="font-size: 10px; color: #991b1b;">বাকি বিক্রয়</div>
                <div style="font-size: 16px; font-weight: 800; color: #dc2626; margin-top: 2px;">${formatCurrency(totalDue)}</div>
              </div>
            </div>
          ` : `
            ${renderContinuationHeader(
              'দৈনিক বিক্রয় রেজিস্টার ও ক্যাশ আদায় বিবরণী',
              'Daily Wholesale Sales Register',
              pageNum,
              totalPages,
              profile
            )}
          `}

          <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
            <thead>
              <tr style="background: #0f172a; color: #ffffff; font-size: 11px; font-weight: 700; text-align: left;">
                <th style="padding: 8px 10px; width: 30px; text-align: center; border-radius: 4px 0 0 0;">#</th>
                <th style="padding: 8px 10px;">মেমো নং</th>
                <th style="padding: 8px 10px;">দোকানের নাম</th>
                <th style="padding: 8px 10px;">বিক্রেতা</th>
                <th style="padding: 8px 10px; text-align: right;">মোট বিল</th>
                <th style="padding: 8px 10px; text-align: right;">নগদ জমা</th>
                <th style="padding: 8px 10px; text-align: right; border-radius: 0 4px 0 0;">বাকি</th>
              </tr>
            </thead>
            <tbody>
              ${rows.length > 0 ? rows : `<tr><td colspan="7" style="text-align: center; padding: 20px; color: #94a3b8;">এই তারিখে কোনো বিক্রয়ের মেমো নেই।</td></tr>`}
            </tbody>
            ${isLastPage ? `
              <tfoot>
                <tr style="background: #f1f5f9; font-size: 11px; font-weight: 800; border-top: 2px solid #cbd5e1;">
                  <td colspan="4" style="padding: 8px 10px; text-align: right; color: #0f172a;">সর্বমোট যোগফল:</td>
                  <td style="padding: 8px 10px; text-align: right; color: #0f172a;">${formatCurrency(totalSales)}</td>
                  <td style="padding: 8px 10px; text-align: right; color: #059669;">${formatCurrency(totalCash)}</td>
                  <td style="padding: 8px 10px; text-align: right; color: #dc2626;">${formatCurrency(totalDue)}</td>
                </tr>
              </tfoot>
            ` : ''}
          </table>
        </div>

        ${renderDocumentFooter(profile, pageNum, totalPages, isLastPage)}
      </div>
    `;
  }).join('');
};

// 7. Cash Transfers HTML
export const renderCashTransfersHtml = (transfers: CashTransfer[], filterName?: string, profile?: BusinessProfile): string => {
  const sortedTransfers = [...transfers].sort((a, b) => {
    const dateA = a.createdAt || '';
    const dateB = b.createdAt || '';
    return dateA.localeCompare(dateB);
  });

  const totalAmount = sortedTransfers.reduce((acc, t) => acc + (t.amount || 0), 0);

  const chunks = chunkArray(sortedTransfers, 12, 20);
  const totalPages = chunks.length;

  return chunks.map((chunk, pageIdx) => {
    const pageNum = pageIdx + 1;
    const isFirstPage = pageNum === 1;
    const isLastPage = pageNum === totalPages;
    const offset = isFirstPage ? 0 : 12 + (pageIdx - 1) * 20;

    const rows = chunk.map((tr, idx) => {
      const globalIdx = offset + idx;
      return `
        <tr style="border-bottom: 1px solid #e2e8f0; background: ${globalIdx % 2 === 0 ? '#ffffff' : '#f8fafc'}; font-size: 11px;">
          <td style="padding: 7px 8px; text-align: center; color: #64748b; font-weight: 700; font-family: monospace;">${toBnDigit(globalIdx + 1)}</td>
          <td style="padding: 7px 10px; color: #475569; white-space: nowrap;">${formatDate(tr.createdAt)}</td>
          <td style="padding: 7px 10px; font-weight: 700; color: #0f172a;">${tr.fromUserName} <span style="font-size: 9.5px; color: #64748b;">(${tr.fromRole.toUpperCase()})</span></td>
          <td style="padding: 7px 10px; font-weight: 700; color: #059669;">${tr.toUserName} <span style="font-size: 9.5px; color: #64748b;">(${tr.toRole.toUpperCase()})</span></td>
          <td style="padding: 7px 10px; color: #334155;">${tr.notes || 'ক্যাশ ড্রয়ার হ্যান্ডওভার'}</td>
          <td style="padding: 7px 10px; text-align: right; font-weight: 800; color: #0f172a;">${formatCurrency(tr.amount)}</td>
        </tr>
      `;
    }).join('');

    return `
      <div class="pdf-page">
        <div>
          ${isFirstPage ? `
            ${renderDocumentHeader(
              'ক্যাশ ড্রয়ার ট্রান্সফার ও হ্যান্ডওভার রেজিস্টার',
              'Cash Drawer Settlement & Handover Statement',
              filterName || 'সকল ক্যাশ ট্রান্সফার লগ • অটো তারিখ সিরিয়াল',
              'অফিশিয়াল অডিট কপি',
              profile
            )}

            <div style="background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 8px; padding: 12px 16px; margin-bottom: 20px; display: flex; justify-content: space-between; align-items: center;">
              <div>
                <div style="font-size: 11px; color: #64748b;">মোট ট্রান্সফার এন্ট্রি: <strong>${sortedTransfers.length} টি</strong></div>
              </div>
              <div style="text-align: right;">
                <div style="font-size: 11px; color: #64748b;">সর্বমোট স্থানান্তরিত ক্যাশ:</div>
                <div style="font-size: 16px; font-weight: 800; color: #059669;">${formatCurrency(totalAmount)}</div>
              </div>
            </div>
          ` : `
            ${renderContinuationHeader(
              'ক্যাশ ড্রয়ার ট্রান্সফার ও হ্যান্ডওভার রেজিস্টার',
              'Cash Drawer Settlement Register',
              pageNum,
              totalPages,
              profile
            )}
          `}

          <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
            <thead>
              <tr style="background: #0f172a; color: #ffffff; font-size: 11px; font-weight: 700; text-align: left;">
                <th style="padding: 8px 8px; width: 35px; text-align: center; border-radius: 4px 0 0 0;">#</th>
                <th style="padding: 8px 10px;">তারিখ ও সময়</th>
                <th style="padding: 8px 10px;">প্রেরক (From)</th>
                <th style="padding: 8px 10px;">প্রাপক (To)</th>
                <th style="padding: 8px 10px;">বিবরণ / নোটস</th>
                <th style="padding: 8px 10px; text-align: right; border-radius: 0 4px 0 0;">টাকার পরিমাণ</th>
              </tr>
            </thead>
            <tbody>
              ${rows.length > 0 ? rows : `<tr><td colspan="6" style="text-align: center; padding: 20px; color: #94a3b8;">কোনো ক্যাশ ট্রান্সফার রেকর্ড নেই।</td></tr>`}
            </tbody>
            ${isLastPage ? `
              <tfoot>
                <tr style="background: #f1f5f9; font-size: 11px; font-weight: 800; border-top: 2px solid #cbd5e1;">
                  <td colspan="5" style="padding: 8px 10px; text-align: right; color: #0f172a;">সর্বমোট স্থানান্তরিত ক্যাশ:</td>
                  <td style="padding: 8px 10px; text-align: right; color: #059669;">${formatCurrency(totalAmount)}</td>
                </tr>
              </tfoot>
            ` : ''}
          </table>
        </div>

        ${renderDocumentFooter(profile, pageNum, totalPages, isLastPage)}
      </div>
    `;
  }).join('');
};

// 8. Stock & Inventory Valuation HTML
export const renderStockStatementHtml = (products: Product[], profile?: BusinessProfile): string => {
  const totalStockQty = products.reduce((acc, p) => acc + (p.stockQuantity || 0), 0);
  const totalCostValue = products.reduce((acc, p) => acc + (p.stockQuantity || 0) * (p.costPrice || 0), 0);
  const totalRetailValue = products.reduce((acc, p) => acc + (p.stockQuantity || 0) * (p.wholesalePrice || p.costPrice || 0), 0);

  const chunks = chunkArray(products, 12, 20);
  const totalPages = chunks.length;

  return chunks.map((chunk, pageIdx) => {
    const pageNum = pageIdx + 1;
    const isFirstPage = pageNum === 1;
    const isLastPage = pageNum === totalPages;
    const offset = isFirstPage ? 0 : 12 + (pageIdx - 1) * 20;

    const rows = chunk.map((p, idx) => {
      const globalIdx = offset + idx;
      const cost = p.costPrice || 0;
      const stock = p.stockQuantity || 0;
      const itemTotalVal = stock * cost;
      const isLow = stock <= (p.minStockLevel || p.lowStockThreshold || 5);

      const challanBadge = (p.latestChallanNo || (p.challanReferences && p.challanReferences[0]?.challanNo))
        ? `<span style="display: block; font-size: 9.5px; color: #0284c7; font-family: monospace; margin-top: 1px;">রেফ চালান: #${p.latestChallanNo || p.challanReferences?.[0]?.challanNo}</span>`
        : '';

      return `
        <tr style="border-bottom: 1px solid #e2e8f0; background: ${globalIdx % 2 === 0 ? '#ffffff' : '#f8fafc'}; font-size: 11px;">
          <td style="padding: 7px 10px; color: #64748b; font-weight: 700; text-align: center;">${toBnDigit(globalIdx + 1)}</td>
          <td style="padding: 7px 10px; font-weight: 700; color: #0f172a;">
            ${p.bnName || p.name}
            ${challanBadge}
          </td>
          <td style="padding: 7px 10px; color: #64748b;">${p.bnCategory || p.category || 'জেনারেল'}</td>
          <td style="padding: 7px 10px; text-align: center; font-weight: 700; color: ${isLow ? '#dc2626' : '#0f172a'};">
            ${toBnDigit(stock)} ${p.bnUnit || p.unit || 'পিস'}
            ${isLow ? '<span style="font-size: 9px; color: #dc2626; display: block;">(লো স্টক)</span>' : ''}
          </td>
          <td style="padding: 7px 10px; text-align: right; color: #334155;">${formatCurrency(cost)}</td>
          <td style="padding: 7px 10px; text-align: right; color: #059669; font-weight: 600;">${formatCurrency(p.wholesalePrice || cost)}</td>
          <td style="padding: 7px 10px; text-align: right; font-weight: 800; color: #0f172a;">${formatCurrency(itemTotalVal)}</td>
        </tr>
      `;
    }).join('');

    return `
      <div class="pdf-page">
        <div>
          ${isFirstPage ? `
            ${renderDocumentHeader(
              'ইনভেন্টরি মজুদ ও স্টক ভ্যালুয়েশন বিবরণী',
              'Warehouse Inventory & Stock Valuation Statement',
              `মোট পণ্যের আইটেম: ${products.length} টি`,
              'স্টক অডিট কপি',
              profile
            )}

            <!-- Valuation Cards -->
            <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin-bottom: 20px;">
              <div style="background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 8px; padding: 12px; text-align: center;">
                <div style="font-size: 11px; color: #64748b; font-weight: 600;">মোট মজুদ পণ্যের সংখ্যা</div>
                <div style="font-size: 16px; font-weight: 800; color: #0f172a; margin-top: 4px;">${totalStockQty.toLocaleString()} ইউনিট</div>
              </div>
              <div style="background: #ecfdf5; border: 1px solid #a7f3d0; border-radius: 8px; padding: 12px; text-align: center;">
                <div style="font-size: 11px; color: #065f46; font-weight: 600;">ক্রয়মূল্যে মোট স্টক ভ্যালু</div>
                <div style="font-size: 16px; font-weight: 800; color: #059669; margin-top: 4px;">${formatCurrency(totalCostValue)}</div>
              </div>
              <div style="background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 8px; padding: 12px; text-align: center;">
                <div style="font-size: 11px; color: #1e40af; font-weight: 600;">সম্ভাব্য পাইকারি মূল্য</div>
                <div style="font-size: 16px; font-weight: 800; color: #2563eb; margin-top: 4px;">${formatCurrency(totalRetailValue)}</div>
              </div>
            </div>
          ` : `
            ${renderContinuationHeader(
              'ইনভেন্টরি মজুদ ও স্টক ভ্যালুয়েশন বিবরণী',
              'Inventory Stock Valuation',
              pageNum,
              totalPages,
              profile
            )}
          `}

          <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
            <thead>
              <tr style="background: #0f172a; color: #ffffff; font-size: 11px; font-weight: 700; text-align: left;">
                <th style="padding: 8px 10px; width: 30px; border-radius: 4px 0 0 0; text-align: center;">#</th>
                <th style="padding: 8px 10px;">পণ্যের নাম</th>
                <th style="padding: 8px 10px;">ক্যাটাগরি</th>
                <th style="padding: 8px 10px; text-align: center;">বর্তমান স্টক</th>
                <th style="padding: 8px 10px; text-align: right;">ক্রয়মূল্য/পিস</th>
                <th style="padding: 8px 10px; text-align: right;">পাইকারি রেট</th>
                <th style="padding: 8px 10px; text-align: right; border-radius: 0 4px 0 0;">মোট ইনভেস্টমেন্ট</th>
              </tr>
            </thead>
            <tbody>
              ${rows}
            </tbody>
            ${isLastPage ? `
              <tfoot>
                <tr style="background: #f1f5f9; font-size: 11px; font-weight: 800; border-top: 2px solid #cbd5e1;">
                  <td colspan="3" style="padding: 8px 10px; text-align: right; color: #0f172a;">মোট সর্বজনীন যোগফল:</td>
                  <td style="padding: 8px 10px; text-align: center; color: #0f172a;">${toBnDigit(totalStockQty)}</td>
                  <td colspan="2" style="padding: 8px 10px; text-align: right; color: #64748b;">ইনভেন্টরি ভ্যালু:</td>
                  <td style="padding: 8px 10px; text-align: right; color: #059669; font-size: 12px;">${formatCurrency(totalCostValue)}</td>
                </tr>
              </tfoot>
            ` : ''}
          </table>
        </div>

        ${renderDocumentFooter(profile, pageNum, totalPages, isLastPage)}
      </div>
    `;
  }).join('');
};

// 9. Capital Statement HTML
export const renderCapitalStatementHtml = (
  capitalTransactions: CapitalTransaction[],
  balances: {
    adminCash: number;
    counterCash: number;
    dsrCash: number;
    bankCash: number;
    inventoryValuation: number;
    receivables: number;
    payables: number;
    stockValue?: number;
  },
  profile?: BusinessProfile
): string => {
  const invVal = balances.inventoryValuation || balances.stockValue || 0;
  const totalCash = balances.adminCash + balances.counterCash + balances.dsrCash + balances.bankCash;
  const totalAssets = totalCash + invVal + balances.receivables;
  const netWorth = totalAssets - balances.payables;

  const sortedCapitalTransactions = [...capitalTransactions].sort((a, b) => {
    const dateA = a.date || '';
    const dateB = b.date || '';
    return dateA.localeCompare(dateB);
  });

  const rows = sortedCapitalTransactions.map((tx, idx) => {
    const isAddition =
      tx.type === 'CAPITAL_INJECTION' ||
      tx.type === 'INITIAL_CAPITAL' ||
      tx.type === 'SALES_COLLECTION';

    return `
      <tr style="border-bottom: 1px solid #e2e8f0; background: ${idx % 2 === 0 ? '#ffffff' : '#f8fafc'}; font-size: 11px;">
        <td style="padding: 7px 8px; text-align: center; color: #64748b; font-weight: 700; font-family: monospace;">${idx + 1}</td>
        <td style="padding: 7px 10px; color: #475569; white-space: nowrap; font-weight: 600;">${formatDate(tx.date)}</td>
        <td style="padding: 7px 10px; font-weight: 700; color: #0f172a;">${isAddition ? 'মূলধন বিনিয়োগ (+)' : 'উত্তোলন / খরচ (-)'}</td>
        <td style="padding: 7px 10px; color: #334155;">${tx.bnDescription || tx.description || '-'}</td>
        <td style="padding: 7px 10px; text-align: right; font-weight: 800; color: ${isAddition ? '#059669' : '#dc2626'};">
          ${isAddition ? '+' : '-'}${formatCurrency(tx.amount)}
        </td>
      </tr>
    `;
  }).join('');

  return `
    <div class="pdf-page" style="width: 794px; min-height: 1123px; padding: 36px; background: #ffffff; color: #0f172a; box-sizing: border-box; margin: 0 auto;">
      ${renderDocumentHeader(
        'ডেপো ব্যালেন্স শিট ও মোট মূলধন বিবরণী',
        'Depot Balance Sheet & Financial Net Worth Statement',
        'ব্যবসায়ের আর্থিক স্থিতি',
        'ব্যালেন্স শিট',
        profile
      )}

      <!-- Assets & Liabilities Grid -->
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 20px;">
        <!-- Assets Box -->
        <div style="background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 8px; padding: 14px 16px; font-size: 11px;">
          <div style="font-size: 12px; font-weight: 800; color: #059669; border-bottom: 1.5px solid #a7f3d0; padding-bottom: 6px; margin-bottom: 10px; text-transform: uppercase;">
            চলতি সম্পদসমূহ (ASSETS)
          </div>
          <div style="display: flex; justify-content: space-between; padding: 3px 0; color: #475569;">
            <span>অ্যাডমিন ভল্ট ক্যাশ:</span>
            <strong>${formatCurrency(balances.adminCash)}</strong>
          </div>
          <div style="display: flex; justify-content: space-between; padding: 3px 0; color: #475569;">
            <span>কাউন্টার ড্রয়ার ক্যাশ:</span>
            <strong>${formatCurrency(balances.counterCash)}</strong>
          </div>
          <div style="display: flex; justify-content: space-between; padding: 3px 0; color: #475569;">
            <span>ডিএসআর ফিল্ড ক্যাশ:</span>
            <strong>${formatCurrency(balances.dsrCash)}</strong>
          </div>
          <div style="display: flex; justify-content: space-between; padding: 3px 0; color: #475569;">
            <span>ব্যাংক ব্যালেন্স:</span>
            <strong>${formatCurrency(balances.bankCash)}</strong>
          </div>
          <div style="display: flex; justify-content: space-between; padding: 3px 0; color: #0369a1; font-weight: 600;">
            <span>মোট ইনভেন্টরি স্টক মূল্য:</span>
            <strong>${formatCurrency(invVal)}</strong>
          </div>
          <div style="display: flex; justify-content: space-between; padding: 3px 0; color: #0369a1; font-weight: 600;">
            <span>বাজারে মোট বাকি (প্রাপ্য):</span>
            <strong>${formatCurrency(balances.receivables)}</strong>
          </div>
          <div style="display: flex; justify-content: space-between; padding: 6px 0; border-top: 1.5px solid #cbd5e1; margin-top: 6px; font-size: 13px; font-weight: 800; color: #0f172a;">
            <span>মোট সম্পদ (Total Assets):</span>
            <span>${formatCurrency(totalAssets)}</span>
          </div>
        </div>

        <!-- Liabilities & Net Worth Box -->
        <div style="background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 8px; padding: 14px 16px; font-size: 11px; display: flex; flex-direction: column; justify-content: space-between;">
          <div>
            <div style="font-size: 12px; font-weight: 800; color: #dc2626; border-bottom: 1.5px solid #fecaca; padding-bottom: 6px; margin-bottom: 10px; text-transform: uppercase;">
              দায়সমূহ ও বকেয়া (LIABILITIES)
            </div>
            <div style="display: flex; justify-content: space-between; padding: 4px 0; color: #475569;">
              <span>কোম্পানি/সাপ্লায়ার দেনা:</span>
              <strong style="color: #dc2626;">${formatCurrency(balances.payables)}</strong>
            </div>
            <div style="display: flex; justify-content: space-between; padding: 6px 0; border-top: 1.5px solid #cbd5e1; margin-top: 6px; font-size: 13px; font-weight: 800; color: #dc2626;">
              <span>মোট দায় (Total Liabilities):</span>
              <span>${formatCurrency(balances.payables)}</span>
            </div>
          </div>

          <div style="background: #ecfdf5; border: 2px solid #059669; border-radius: 8px; padding: 12px; text-align: center; margin-top: 16px;">
            <div style="font-size: 11px; color: #065f46; font-weight: 700; text-transform: uppercase;">ব্যবসায়ের প্রকৃত নীট মূলধন (NET CAPITAL)</div>
            <div style="font-size: 20px; font-weight: 900; color: #047857; margin-top: 4px;">${formatCurrency(netWorth)}</div>
            <div style="font-size: 9.5px; color: #059669; margin-top: 2px;">(মোট সম্পদ - মোট দেনা)</div>
          </div>
        </div>
      </div>

      <!-- Capital Transactions Table -->
      <div style="font-size: 12px; font-weight: 700; color: #0f172a; margin-bottom: 8px;">মূলধন লেনদেন লগ (Capital Flow • অটো তারিখ সিরিয়াল)</div>
      <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
        <thead>
          <tr style="background: #0f172a; color: #ffffff; font-size: 11px; font-weight: 700; text-align: left;">
            <th style="padding: 8px 8px; width: 35px; text-align: center; border-radius: 4px 0 0 0;">#</th>
            <th style="padding: 8px 10px;">তারিখ</th>
            <th style="padding: 8px 10px;">লেনদেনের ধরন</th>
            <th style="padding: 8px 10px;">বিবরণ / খাত</th>
            <th style="padding: 8px 10px; text-align: right; border-radius: 0 4px 0 0;">টাকা</th>
          </tr>
        </thead>
        <tbody>
          ${rows.length > 0 ? rows : `<tr><td colspan="5" style="text-align: center; padding: 20px; color: #94a3b8;">কোনো অতিরিক্ত মূলধন লেনদেনের তথ্য নেই।</td></tr>`}
        </tbody>
      </table>

      ${renderDocumentFooter(profile)}
    </div>
  `;
};

// ----------------------------------------------------------------------
// 10. BANK STATEMENT (স্টেট ব্যাংক / ব্যাংক স্টেটমেন্ট)
// ----------------------------------------------------------------------
export interface DateRangeFilter {
  startDate?: string;
  endDate?: string;
  label?: string;
}

export interface BankStatementTransaction {
  id: string;
  date: string;
  type: 'DEPOSIT' | 'WITHDRAWAL';
  amount: number;
  payerName: string; // কে টাকা দিল (Payer)
  receiverName: string; // কে টাকা রিসিভ করল (Receiver)
  referenceNo?: string; // চেক নং / ভাউচার / ট্রানজেকশন আইডি
  particulars: string; // বিবরণ / খাত
  accountName?: string;
  balanceAfter?: number;
}

export interface BankStatementData {
  accountName: string;
  accountNumber?: string;
  bankBranch?: string;
  openingBalance: number;
  totalDeposits: number;
  totalWithdrawals: number;
  closingBalance: number;
  dateRange: DateRangeFilter;
  transactions: BankStatementTransaction[];
}

export const renderBankStatementHtml = (
  data: BankStatementData,
  profile?: BusinessProfile
): string => {
  const chunks = chunkArray(data.transactions, 10, 18);
  const totalPages = chunks.length;

  return chunks.map((chunk, pageIdx) => {
    const pageNum = pageIdx + 1;
    const isFirstPage = pageNum === 1;
    const isLastPage = pageNum === totalPages;
    const offset = isFirstPage ? 0 : 10 + (pageIdx - 1) * 18;

    const rows = chunk.map((tx, idx) => {
      const globalIdx = offset + idx;
      const isDeposit = tx.type === 'DEPOSIT';
      return `
        <tr style="border-bottom: 1px solid #e2e8f0; font-size: 11px; background: ${globalIdx % 2 === 0 ? '#ffffff' : '#f8fafc'};">
          <td style="padding: 7px 8px; text-align: center; color: #64748b; font-weight: 700;">${toBnDigit(globalIdx + 1)}</td>
          <td style="padding: 7px 10px; color: #334155; white-space: nowrap; font-size: 10.5px;">${formatDate(tx.date)}</td>
          <td style="padding: 7px 10px; font-weight: 700; color: #0f172a;">${tx.payerName || '-'}</td>
          <td style="padding: 7px 10px; font-weight: 700; color: #0369a1;">${tx.receiverName || '-'}</td>
          <td style="padding: 7px 10px; color: #475569;">
            <div>${tx.particulars}</div>
            ${tx.referenceNo ? `<span style="font-size: 9.5px; color: #64748b; background: #f1f5f9; padding: 1px 4px; border-radius: 3px;">রেফ: ${tx.referenceNo}</span>` : ''}
          </td>
          <td style="padding: 7px 10px; text-align: right; font-weight: 700; color: #dc2626;">
            ${!isDeposit ? `-${formatCurrency(tx.amount)}` : '-'}
          </td>
          <td style="padding: 7px 10px; text-align: right; font-weight: 700; color: #059669;">
            ${isDeposit ? `+${formatCurrency(tx.amount)}` : '-'}
          </td>
          <td style="padding: 7px 10px; text-align: right; font-weight: 800; color: #0f172a;">
            ${tx.balanceAfter !== undefined ? formatCurrency(tx.balanceAfter) : '-'}
          </td>
        </tr>
      `;
    }).join('');

    return `
      <div class="pdf-page">
        <div>
          ${isFirstPage ? `
            ${renderDocumentHeader(
              'অফিশিয়াল ব্যাংক হিসাব বিবরণী ও স্টেটমেন্ট',
              'Official Bank Account Statement & Transaction Audit',
              `হিসাব: ${data.accountName} ${data.accountNumber ? `• A/C: ${data.accountNumber}` : ''} • সময়কাল: ${data.dateRange.label || 'সকল সময়'}`,
              'ব্যাংক অডিট স্টেটমেন্ট',
              profile
            )}

            <!-- Date Period Banner -->
            <div style="background: #f0f9ff; border: 1.5px solid #bae6fd; border-radius: 8px; padding: 10px 14px; margin-bottom: 18px; display: flex; justify-content: space-between; align-items: center; font-size: 11px;">
              <div style="color: #0369a1;">
                <strong>তারিখ রেঞ্জ:</strong> ${data.dateRange.label || 'সকল সময়ের লেনদেন'}
                ${data.bankBranch ? `<span style="margin-left: 12px; color: #475569;">শাখা: <strong>${data.bankBranch}</strong></span>` : ''}
              </div>
              <div style="color: #075985; font-weight: 700;">
                মোট লেনদেন সংখ্যা: ${toBnDigit(data.transactions.length)} টি
              </div>
            </div>

            <!-- 4 Pillars: Opening, Deposits (+), Withdrawals (-), Closing Balance -->
            <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; margin-bottom: 20px;">
              <div style="background: #f8fafc; border: 1.5px solid #cbd5e1; border-radius: 8px; padding: 10px 12px; text-align: center;">
                <div style="font-size: 10px; color: #64748b; font-weight: 700; text-transform: uppercase;">১. প্রারম্ভিক স্থিতি (Opening)</div>
                <div style="font-size: 16px; font-weight: 900; color: #334155; margin-top: 4px;">
                  ${formatCurrency(data.openingBalance)}
                </div>
                <div style="font-size: 9px; color: #94a3b8; margin-top: 2px;">তারিখ শুরুর পূর্বের জের</div>
              </div>

              <div style="background: #f0fdf4; border: 1.5px solid #86efac; border-radius: 8px; padding: 10px 12px; text-align: center;">
                <div style="font-size: 10px; color: #15803d; font-weight: 800; text-transform: uppercase;">২. মোট জমা / রিসিভ (+)</div>
                <div style="font-size: 16px; font-weight: 900; color: #15803d; margin-top: 4px;">
                  +${formatCurrency(data.totalDeposits)}
                </div>
                <div style="font-size: 9px; color: #166534; margin-top: 2px;">ব্যাংক ও অনলাইন প্রাপ্তি</div>
              </div>

              <div style="background: #fef2f2; border: 1.5px solid #fca5a5; border-radius: 8px; padding: 10px 12px; text-align: center;">
                <div style="font-size: 10px; color: #b91c1c; font-weight: 800; text-transform: uppercase;">৩. মোট খরচ / পেমেন্ট (-)</div>
                <div style="font-size: 16px; font-weight: 900; color: #b91c1c; margin-top: 4px;">
                  -${formatCurrency(data.totalWithdrawals)}
                </div>
                <div style="font-size: 9px; color: #991b1b; margin-top: 2px;">কোম্পানি বিল ও প্রদান</div>
              </div>

              <div style="background: #eff6ff; border: 1.5px solid #93c5fd; border-radius: 8px; padding: 10px 12px; text-align: center;">
                <div style="font-size: 10px; color: #1d4ed8; font-weight: 800; text-transform: uppercase;">৪. সমাপনী ব্যালেন্স (Closing)</div>
                <div style="font-size: 16px; font-weight: 900; color: #1d4ed8; margin-top: 4px;">
                  ${formatCurrency(data.closingBalance)}
                </div>
                <div style="font-size: 9px; color: #2563eb; margin-top: 2px;">নিট ব্যাংক ব্যালেন্স স্থিতি</div>
              </div>
            </div>
          ` : `
            ${renderContinuationHeader(
              'অফিশিয়াল ব্যাংক হিসাব বিবরণী ও স্টেটমেন্ট',
              `A/C: ${data.accountName}`,
              pageNum,
              totalPages,
              profile
            )}
          `}

          <!-- Bank Statement Table -->
          <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
            <thead>
              <tr style="background: #0f172a; color: #ffffff; font-size: 10.5px; font-weight: 700; text-align: left;">
                <th style="padding: 8px 6px; width: 28px; text-align: center; border-radius: 4px 0 0 0;">#</th>
                <th style="padding: 8px 8px; width: 110px;">তারিখ ও সময়</th>
                <th style="padding: 8px 8px;">কে দিল (Payer)</th>
                <th style="padding: 8px 8px;">কে পেল (Receiver)</th>
                <th style="padding: 8px 8px;">বিবরণ ও রেফারেন্স</th>
                <th style="padding: 8px 8px; text-align: right; width: 85px;">উত্তোলন (-)</th>
                <th style="padding: 8px 8px; text-align: right; width: 85px;">জমা (+)</th>
                <th style="padding: 8px 8px; text-align: right; width: 95px; border-radius: 0 4px 0 0;">ব্যালেন্স স্থিতি</th>
              </tr>
            </thead>
            <tbody>
              ${isFirstPage ? `
                <tr style="background: #f1f5f9; border-bottom: 1.5px solid #cbd5e1; font-size: 11px; font-weight: 700;">
                  <td style="padding: 6px 8px; text-align: center; color: #64748b;">-</td>
                  <td style="padding: 6px 8px; color: #475569;" colspan="4">
                    🔹 প্রারম্ভিক স্থিতি (Opening Balance)
                  </td>
                  <td style="padding: 6px 8px; text-align: right; color: #64748b;">-</td>
                  <td style="padding: 6px 8px; text-align: right; color: #64748b;">-</td>
                  <td style="padding: 6px 8px; text-align: right; color: #0f172a;">
                    ${formatCurrency(data.openingBalance)}
                  </td>
                </tr>
              ` : ''}
              ${rows.length > 0 ? rows : `<tr><td colspan="8" style="text-align: center; padding: 20px; color: #94a3b8; font-size: 11px;">এই তারিখ পরিসীমায় কোনো ব্যাংক লেনদেনের রেকর্ড নেই।</td></tr>`}
              ${isLastPage ? `
                <tr style="background: #eff6ff; border-top: 2px solid #93c5fd; font-size: 11.5px; font-weight: 800;">
                  <td style="padding: 7px 8px; text-align: center; color: #1d4ed8;">-</td>
                  <td style="padding: 7px 8px; color: #1e40af;" colspan="4">
                    ⭐ সমাপনী স্থিতি (Net Closing Balance)
                  </td>
                  <td style="padding: 7px 8px; text-align: right; color: #dc2626;">
                    -${formatCurrency(data.totalWithdrawals)}
                  </td>
                  <td style="padding: 7px 8px; text-align: right; color: #059669;">
                    +${formatCurrency(data.totalDeposits)}
                  </td>
                  <td style="padding: 7px 8px; text-align: right; color: #1d4ed8; font-size: 12.5px;">
                    ${formatCurrency(data.closingBalance)}
                  </td>
                </tr>
              ` : ''}
            </tbody>
          </table>
        </div>

        ${renderDocumentFooter(profile, pageNum, totalPages, isLastPage)}
      </div>
    `;
  }).join('');
};

// ----------------------------------------------------------------------
// 11. CASH DRAWER STATEMENT (ক্যাশ ড্রয়ার স্টেটমেন্ট: এডমিন, কাউন্টার, ডিএসআর)
// ----------------------------------------------------------------------
export interface CashDrawerTransaction {
  id: string;
  date: string;
  type: 'INFLOW' | 'OUTFLOW';
  amount: number;
  payerName: string; // কে টাকা দিল (Payer)
  receiverName: string; // কে টাকা রিসিভ করল (Receiver)
  referenceNo?: string;
  particulars: string;
  sourceOrCategory?: string;
  balanceAfter?: number;
}

export interface CashDrawerStatementData {
  drawerRole: 'admin' | 'counter' | 'dsr';
  drawerTitleBn: string;
  drawerTitleEn: string;
  custodianName?: string;
  custodianPhone?: string;
  openingBalance: number;
  totalInflow: number;
  totalOutflow: number;
  closingBalance: number;
  dateRange: DateRangeFilter;
  transactions: CashDrawerTransaction[];
}

export const renderCashDrawerStatementHtml = (
  data: CashDrawerStatementData,
  profile?: BusinessProfile
): string => {
  const chunks = chunkArray(data.transactions, 10, 18);
  const totalPages = chunks.length;

  return chunks.map((chunk, pageIdx) => {
    const pageNum = pageIdx + 1;
    const isFirstPage = pageNum === 1;
    const isLastPage = pageNum === totalPages;
    const offset = isFirstPage ? 0 : 10 + (pageIdx - 1) * 18;

    const rows = chunk.map((tx, idx) => {
      const globalIdx = offset + idx;
      const isInflow = tx.type === 'INFLOW';
      return `
        <tr style="border-bottom: 1px solid #e2e8f0; font-size: 11px; background: ${globalIdx % 2 === 0 ? '#ffffff' : '#f8fafc'};">
          <td style="padding: 7px 8px; text-align: center; color: #64748b; font-weight: 700;">${toBnDigit(globalIdx + 1)}</td>
          <td style="padding: 7px 10px; color: #334155; white-space: nowrap; font-size: 10.5px;">${formatDate(tx.date)}</td>
          <td style="padding: 7px 10px; font-weight: 700; color: #0f172a;">${tx.payerName || '-'}</td>
          <td style="padding: 7px 10px; font-weight: 700; color: #047857;">${tx.receiverName || '-'}</td>
          <td style="padding: 7px 10px; color: #475569;">
            <div>${tx.particulars}</div>
            ${tx.referenceNo ? `<span style="font-size: 9.5px; color: #64748b; background: #f1f5f9; padding: 1px 4px; border-radius: 3px;">ভাউচার/মেমো: ${tx.referenceNo}</span>` : ''}
          </td>
          <td style="padding: 7px 10px; text-align: right; font-weight: 700; color: #059669;">
            ${isInflow ? `+${formatCurrency(tx.amount)}` : '-'}
          </td>
          <td style="padding: 7px 10px; text-align: right; font-weight: 700; color: #dc2626;">
            ${!isInflow ? `-${formatCurrency(tx.amount)}` : '-'}
          </td>
          <td style="padding: 7px 10px; text-align: right; font-weight: 800; color: #0f172a;">
            ${tx.balanceAfter !== undefined ? formatCurrency(tx.balanceAfter) : '-'}
          </td>
        </tr>
      `;
    }).join('');

    return `
      <div class="pdf-page">
        <div>
          ${isFirstPage ? `
            ${renderDocumentHeader(
              data.drawerTitleBn,
              data.drawerTitleEn,
              `${data.custodianName ? `দায়িত্বপ্রাপ্ত: ${data.custodianName} • ` : ''}সময়কাল: ${data.dateRange.label || 'সকল সময়'}`,
              'ক্যাশ ড্রয়ার অডিট কপি',
              profile
            )}

            <!-- Custodian & Date Banner -->
            <div style="background: #f8fafc; border: 1.5px solid #cbd5e1; border-radius: 8px; padding: 10px 14px; margin-bottom: 18px; display: flex; justify-content: space-between; align-items: center; font-size: 11px;">
              <div>
                <span style="color: #64748b;">হিসাবের আওতা:</span> <strong style="color: #0f172a;">${data.drawerTitleBn}</strong>
                ${data.custodianName ? `<span style="margin-left: 10px; color: #047857;">(হিসাব রক্ষক: <strong>${data.custodianName}</strong>)</span>` : ''}
              </div>
              <div style="color: #047857; font-weight: 700;">
                সময়কাল: <strong>${data.dateRange.label || 'সকল সময়'}</strong>
              </div>
            </div>

            <!-- 4 Pillars: Opening, Cash Inflows (+), Cash Outflows (-), Closing Balance -->
            <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; margin-bottom: 20px;">
              <div style="background: #f8fafc; border: 1.5px solid #cbd5e1; border-radius: 8px; padding: 10px 12px; text-align: center;">
                <div style="font-size: 10px; color: #64748b; font-weight: 700; text-transform: uppercase;">১. প্রারম্ভিক ক্যাশ (Opening)</div>
                <div style="font-size: 16px; font-weight: 900; color: #334155; margin-top: 4px;">
                  ${formatCurrency(data.openingBalance)}
                </div>
                <div style="font-size: 9px; color: #94a3b8; margin-top: 2px;">তারিখ শুরুর পূর্বে ক্যাশ স্থিতি</div>
              </div>

              <div style="background: #f0fdf4; border: 1.5px solid #86efac; border-radius: 8px; padding: 10px 12px; text-align: center;">
                <div style="font-size: 10px; color: #15803d; font-weight: 800; text-transform: uppercase;">২. মোট প্রাপ্তি / রিসিভ (+)</div>
                <div style="font-size: 16px; font-weight: 900; color: #15803d; margin-top: 4px;">
                  +${formatCurrency(data.totalInflow)}
                </div>
                <div style="font-size: 9px; color: #166534; margin-top: 2px;">বিক্রয় আদায় / ক্যাশ গ্রহণ</div>
              </div>

              <div style="background: #fef2f2; border: 1.5px solid #fca5a5; border-radius: 8px; padding: 10px 12px; text-align: center;">
                <div style="font-size: 10px; color: #b91c1c; font-weight: 800; text-transform: uppercase;">৩. মোট প্রদান / পেমেন্ট (-)</div>
                <div style="font-size: 16px; font-weight: 900; color: #b91c1c; margin-top: 4px;">
                  -${formatCurrency(data.totalOutflow)}
                </div>
                <div style="font-size: 9px; color: #991b1b; margin-top: 2px;">কোম্পানি বিল / হস্তান্তর</div>
              </div>

              <div style="background: #ecfdf5; border: 1.5px solid #6ee7b7; border-radius: 8px; padding: 10px 12px; text-align: center;">
                <div style="font-size: 10px; color: #047857; font-weight: 800; text-transform: uppercase;">৪. সমাপনী ব্যালেন্স (Closing)</div>
                <div style="font-size: 16px; font-weight: 900; color: #047857; margin-top: 4px;">
                  ${formatCurrency(data.closingBalance)}
                </div>
                <div style="font-size: 9px; color: #059669; margin-top: 2px;">ড্রয়ারে বর্তমান অবশিষ্ট ক্যাশ</div>
              </div>
            </div>
          ` : `
            ${renderContinuationHeader(
              data.drawerTitleBn,
              data.drawerTitleEn,
              pageNum,
              totalPages,
              profile
            )}
          `}

          <!-- Cash Drawer Audit Table -->
          <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
            <thead>
              <tr style="background: #0f172a; color: #ffffff; font-size: 10.5px; font-weight: 700; text-align: left;">
                <th style="padding: 8px 6px; width: 28px; text-align: center; border-radius: 4px 0 0 0;">#</th>
                <th style="padding: 8px 8px; width: 110px;">তারিখ ও সময়</th>
                <th style="padding: 8px 8px;">কে টাকা দিল (Payer)</th>
                <th style="padding: 8px 8px;">কে পেল (Receiver)</th>
                <th style="padding: 8px 8px;">বিবরণ ও রেফারেন্স</th>
                <th style="padding: 8px 8px; text-align: right; width: 85px;">প্রাপ্তি (+)</th>
                <th style="padding: 8px 8px; text-align: right; width: 85px;">প্রদান (-)</th>
                <th style="padding: 8px 8px; text-align: right; width: 95px; border-radius: 0 4px 0 0;">ড্রয়ার ব্যালেন্স</th>
              </tr>
            </thead>
            <tbody>
              ${isFirstPage ? `
                <tr style="background: #f1f5f9; border-bottom: 1.5px solid #cbd5e1; font-size: 11px; font-weight: 700;">
                  <td style="padding: 6px 8px; text-align: center; color: #64748b;">-</td>
                  <td style="padding: 6px 8px; color: #475569;" colspan="4">
                    🔹 প্রারম্ভিক ক্যাশ স্থিতি (Opening Cash Balance)
                  </td>
                  <td style="padding: 6px 8px; text-align: right; color: #64748b;">-</td>
                  <td style="padding: 6px 8px; text-align: right; color: #64748b;">-</td>
                  <td style="padding: 6px 8px; text-align: right; color: #0f172a;">
                    ${formatCurrency(data.openingBalance)}
                  </td>
                </tr>
              ` : ''}
              ${rows.length > 0 ? rows : `<tr><td colspan="8" style="text-align: center; padding: 20px; color: #94a3b8; font-size: 11px;">এই তারিখ পরিসীমায় কোনো ক্যাশ লেনদেনের রেকর্ড নেই।</td></tr>`}
              ${isLastPage ? `
                <tr style="background: #ecfdf5; border-top: 2px solid #6ee7b7; font-size: 11.5px; font-weight: 800;">
                  <td style="padding: 7px 8px; text-align: center; color: #047857;">-</td>
                  <td style="padding: 7px 8px; color: #065f46;" colspan="4">
                    ⭐ সমাপনী ক্যাশ স্থিতি (Net Closing Cash Balance)
                  </td>
                  <td style="padding: 7px 8px; text-align: right; color: #059669;">
                    +${formatCurrency(data.totalInflow)}
                  </td>
                  <td style="padding: 7px 8px; text-align: right; color: #dc2626;">
                    -${formatCurrency(data.totalOutflow)}
                  </td>
                  <td style="padding: 7px 8px; text-align: right; color: #047857; font-size: 12.5px;">
                    ${formatCurrency(data.closingBalance)}
                  </td>
                </tr>
              ` : ''}
            </tbody>
          </table>
        </div>

        ${renderDocumentFooter(profile, pageNum, totalPages, isLastPage)}
      </div>
    `;
  }).join('');
};

// ----------------------------------------------------------------------
// 12. CASH VALIDATION & RECONCILIATION STATEMENT (ক্যাশ ভ্যালিড স্টেটমেন্ট)
// ----------------------------------------------------------------------
export interface CashValidationStatementData {
  totalCashReceived: number; // কত টাকা পাওয়া গেছে (মোট নগদ আদায় +)
  cashSalesReceived: number; // নগদ বিক্রয় থেকে প্রাপ্তি
  dueCollectionsReceived: number; // কাস্টমারদের বকেয়া আদায়
  capitalInflowReceived: number; // মূলধন বিনিয়োগ / জমা

  totalCompanyPayments: number; // কোম্পানির পেমেন্ট (পরিশোধ -)
  supplierPurchasesTotal: number; // মোট সরবরাহ ক্রয় (+)
  supplierReturnsTotal: number; // কোম্পানি রিপ্লেস / ফেরত সমন্বয় (-)
  supplierOutstandingPayable: number; // কোম্পানি পাবে (বকেয়া দেনা)

  totalReceivables: number; // কত টাকা পাবো (বাজারে কাস্টমারদের কাছে মোট পাওনা +)
  dueRetailersCount?: number; // কতজন গ্রাহক বাকি

  adminCash: number;
  counterCash: number;
  dsrCash: number;
  bankCash: number;
  totalLiquidCash: number;

  inventoryValuation?: number;

  inflowItems?: Array<{
    date: string;
    description: string;
    memoNo?: string;
    amount: number;
  }>;

  outflowItems?: Array<{
    date: string;
    companyName: string;
    referenceNo?: string;
    amount: number;
  }>;
}

export const renderCashValidationStatementHtml = (
  data: CashValidationStatementData,
  profile?: BusinessProfile
): string => {
  const inflows = data.inflowItems || [];
  const outflows = data.outflowItems || [];

  const inflowRows = inflows.slice(0, 10).map((item, idx) => `
    <tr style="border-bottom: 1px solid #e2e8f0; font-size: 11px; background: ${idx % 2 === 0 ? '#ffffff' : '#f0fdf4'};">
      <td style="padding: 6px 8px; text-align: center; color: #64748b; font-family: monospace;">${idx + 1}</td>
      <td style="padding: 6px 8px; color: #475569; white-space: nowrap;">${item.date ? formatDate(item.date) : '-'}</td>
      <td style="padding: 6px 8px; font-weight: 600; color: #0f172a;">${item.description || 'নগদ আদায়'}</td>
      <td style="padding: 6px 8px; font-family: monospace; color: #0369a1; font-weight: 700;">${item.memoNo || '-'}</td>
      <td style="padding: 6px 8px; text-align: right; font-weight: 800; color: #059669; font-family: monospace;">
        +${formatCurrency(item.amount)}
      </td>
    </tr>
  `).join('');

  const outflowRows = outflows.slice(0, 10).map((item, idx) => `
    <tr style="border-bottom: 1px solid #e2e8f0; font-size: 11px; background: ${idx % 2 === 0 ? '#ffffff' : '#fef2f2'};">
      <td style="padding: 6px 8px; text-align: center; color: #64748b; font-family: monospace;">${idx + 1}</td>
      <td style="padding: 6px 8px; color: #475569; white-space: nowrap;">${item.date ? formatDate(item.date) : '-'}</td>
      <td style="padding: 6px 8px; font-weight: 600; color: #0f172a;">${item.companyName || 'কোম্পানি পেমেন্ট'}</td>
      <td style="padding: 6px 8px; font-family: monospace; color: #b91c1c; font-weight: 700;">${item.referenceNo || '-'}</td>
      <td style="padding: 6px 8px; text-align: right; font-weight: 800; color: #dc2626; font-family: monospace;">
        -${formatCurrency(item.amount)}
      </td>
    </tr>
  `).join('');

  return `
    <div class="pdf-page" style="width: 794px; min-height: 1123px; padding: 36px; background: #ffffff; color: #0f172a; box-sizing: border-box; margin: 0 auto; font-family: sans-serif;">
      ${renderDocumentHeader(
        'ক্যাশ ভ্যালিড স্টেটমেন্ট ও আর্থিক স্থিতি',
        'Cash Validation & Financial Liquidity Position Statement',
        'আদায়, কোম্পানি পেমেন্ট ও মার্কেট বকেয়া মেলানোর অডিট শিট',
        'ক্যাশ ভ্যালিডেশন কপি',
        profile
      )}

      <!-- 4 High-Impact Metric Cards with Plus/Minus Figures -->
      <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 14px; margin-bottom: 20px;">
        
        <!-- Box 1: কত টাকা পাওয়া গেছে (Total Cash Received +) -->
        <div style="background: #f0fdf4; border: 1.5px solid #86efac; border-radius: 8px; padding: 14px 16px;">
          <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #bbf7d0; padding-bottom: 6px; margin-bottom: 8px;">
            <span style="font-size: 11px; font-weight: 800; color: #15803d; text-transform: uppercase;">
              ১. কত টাকা পাওয়া গেছে (CASH RECEIVED +)
            </span>
            <span style="background: #dcfce7; color: #166534; font-size: 10px; font-weight: 800; padding: 2px 6px; border-radius: 4px;">
              মোট প্রাপ্তি (+)
            </span>
          </div>
          <div style="font-size: 22px; font-weight: 900; color: #15803d; font-family: monospace; margin-bottom: 10px;">
            +${formatCurrency(data.totalCashReceived)}
          </div>
          <div style="font-size: 10.5px; color: #374151;">
            <div style="display: flex; justify-content: space-between; padding: 2px 0;">
              <span>• নগদ বিক্রয় আদায় (Cash Sales):</span>
              <strong style="color: #15803d;">+${formatCurrency(data.cashSalesReceived)}</strong>
            </div>
            <div style="display: flex; justify-content: space-between; padding: 2px 0;">
              <span>• কাস্টমার বকেয়া আদায় (Dues Recovered):</span>
              <strong style="color: #15803d;">+${formatCurrency(data.dueCollectionsReceived)}</strong>
            </div>
            <div style="display: flex; justify-content: space-between; padding: 2px 0;">
              <span>• মূলধন ও অন্যান্য ক্যাশ জমা:</span>
              <strong style="color: #15803d;">+${formatCurrency(data.capitalInflowReceived)}</strong>
            </div>
          </div>
        </div>

        <!-- Box 2: কোম্পানির পেমেন্ট (Company Payments - মাইনাস ফিগার) -->
        <div style="background: #fef2f2; border: 1.5px solid #fca5a5; border-radius: 8px; padding: 14px 16px;">
          <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #fecaca; padding-bottom: 6px; margin-bottom: 8px;">
            <span style="font-size: 11px; font-weight: 800; color: #b91c1c; text-transform: uppercase;">
              ২. কোম্পানির পেমেন্ট (COMPANY PAYMENTS -)
            </span>
            <span style="background: #fee2e2; color: #991b1b; font-size: 10px; font-weight: 800; padding: 2px 6px; border-radius: 4px;">
              পরিশোধ (-)
            </span>
          </div>
          <div style="font-size: 22px; font-weight: 900; color: #b91c1c; font-family: monospace; margin-bottom: 10px;">
            -${formatCurrency(data.totalCompanyPayments)}
          </div>
          <div style="font-size: 10.5px; color: #374151;">
            <div style="display: flex; justify-content: space-between; padding: 2px 0;">
              <span>• মোট চালান ক্রয় (+):</span>
              <strong>+${formatCurrency(data.supplierPurchasesTotal)}</strong>
            </div>
            <div style="display: flex; justify-content: space-between; padding: 2px 0;">
              <span>• কোম্পানি ফেরত / রিপ্লেস (-):</span>
              <strong style="color: #0284c7;">-${formatCurrency(data.supplierReturnsTotal)}</strong>
            </div>
            <div style="display: flex; justify-content: space-between; padding: 2px 0; border-top: 1px dashed #fca5a5; margin-top: 4px; padding-top: 4px; font-weight: 700; color: #991b1b;">
              <span>• কোম্পানিকে মোট দিতে হবে (দেনা):</span>
              <span>-${formatCurrency(data.supplierOutstandingPayable)}</span>
            </div>
          </div>
        </div>

        <!-- Box 3: কত টাকা পাবো (Total Market Receivables +) -->
        <div style="background: #f0f9ff; border: 1.5px solid #bae6fd; border-radius: 8px; padding: 14px 16px;">
          <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #e0f2fe; padding-bottom: 6px; margin-bottom: 8px;">
            <span style="font-size: 11px; font-weight: 800; color: #0369a1; text-transform: uppercase;">
              ৩. কত টাকা পাবো (MARKET RECEIVABLES +)
            </span>
            <span style="background: #e0f2fe; color: #075985; font-size: 10px; font-weight: 800; padding: 2px 6px; border-radius: 4px;">
              প্রাপ্য বাকি (+)
            </span>
          </div>
          <div style="font-size: 22px; font-weight: 900; color: #0284c7; font-family: monospace; margin-bottom: 10px;">
            +${formatCurrency(data.totalReceivables)}
          </div>
          <div style="font-size: 10.5px; color: #374151;">
            <div style="display: flex; justify-content: space-between; padding: 2px 0;">
              <span>• খুচরা দোকানদারদের কাছে মোট বাকি:</span>
              <strong style="color: #0369a1;">+${formatCurrency(data.totalReceivables)}</strong>
            </div>
            <div style="display: flex; justify-content: space-between; padding: 2px 0;">
              <span>• বাকি থাকা রিটেইলার কাস্টমার:</span>
              <strong>${data.dueRetailersCount || 0} জন</strong>
            </div>
            <div style="display: flex; justify-content: space-between; padding: 2px 0; color: #059669; font-weight: 700;">
              <span>• রুট ও বাজার থেকে সংগ্রহযোগ্য সম্পদ</span>
              <span>সচল বাজার বাকি</span>
            </div>
          </div>
        </div>

        <!-- Box 4: বর্তমান ক্যাশ ব্যালেন্স (Drawers & Vault Cash) -->
        <div style="background: #f8fafc; border: 1.5px solid #cbd5e1; border-radius: 8px; padding: 14px 16px;">
          <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #e2e8f0; padding-bottom: 6px; margin-bottom: 8px;">
            <span style="font-size: 11px; font-weight: 800; color: #334155; text-transform: uppercase;">
              ৪. বর্তমান ক্যাশ ব্যালেন্স (DRAWER & VAULT CASH)
            </span>
            <span style="background: #e2e8f0; color: #334155; font-size: 10px; font-weight: 800; padding: 2px 6px; border-radius: 4px;">
              মোট তারল্য
            </span>
          </div>
          <div style="font-size: 22px; font-weight: 900; color: #0f172a; font-family: monospace; margin-bottom: 10px;">
            ${formatCurrency(data.totalLiquidCash)}
          </div>
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 4px; font-size: 10px; color: #475569;">
            <div style="background: #ffffff; padding: 3px 6px; border-radius: 4px; border: 1px solid #e2e8f0;">
              <span>কাউন্টার:</span> <strong>${formatCurrency(data.counterCash)}</strong>
            </div>
            <div style="background: #ffffff; padding: 3px 6px; border-radius: 4px; border: 1px solid #e2e8f0;">
              <span>ডিএসআর:</span> <strong>${formatCurrency(data.dsrCash)}</strong>
            </div>
            <div style="background: #ffffff; padding: 3px 6px; border-radius: 4px; border: 1px solid #e2e8f0;">
              <span>এডমিন ভল্ট:</span> <strong>${formatCurrency(data.adminCash)}</strong>
            </div>
            <div style="background: #ffffff; padding: 3px 6px; border-radius: 4px; border: 1px solid #e2e8f0;">
              <span>ব্যাংক ব্যালেন্স:</span> <strong>${formatCurrency(data.bankCash)}</strong>
            </div>
          </div>
        </div>

      </div>

      <!-- Quick Formula / Reconciliation Summary Banner -->
      <div style="background: #0f172a; color: #ffffff; border-radius: 8px; padding: 12px 16px; margin-bottom: 20px; font-size: 11px;">
        <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 8px;">
          <div>
            <span style="color: #94a3b8;">ক্যাশ ভ্যালিডেশন সূত্র:</span>
            <strong style="color: #38bdf8; margin-left: 6px;">
              মোট ক্যাশ প্রাপ্তি (+) - কোম্পানির পেমেন্ট (-) = নিট অপারেটিং ক্যাশ
            </strong>
          </div>
          <div>
            <span style="color: #94a3b8;">মার্কেট নিট স্থিতি (পাবো - দেনা):</span>
            <strong style="color: ${(data.totalReceivables - data.supplierOutstandingPayable) >= 0 ? '#4ade80' : '#f87171'}; margin-left: 6px; font-family: monospace;">
              ${(data.totalReceivables - data.supplierOutstandingPayable) >= 0 ? '+' : ''}${formatCurrency(data.totalReceivables - data.supplierOutstandingPayable)}
            </strong>
          </div>
        </div>
      </div>

      <!-- Split Table: Recent Inflows vs Company Outflows -->
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 14px; margin-bottom: 20px;">
        
        <!-- Left Table: Recent Cash Inflows -->
        <div>
          <div style="font-size: 11px; font-weight: 800; color: #15803d; margin-bottom: 6px; display: flex; justify-content: space-between;">
            <span>ক্যাশ প্রাপ্তি লগ (সর্বশেষ ১০টি +)</span>
            <span>জমা (+)</span>
          </div>
          <table style="width: 100%; border-collapse: collapse;">
            <thead>
              <tr style="background: #15803d; color: #ffffff; font-size: 10px; font-weight: 700; text-align: left;">
                <th style="padding: 6px 6px; width: 25px; text-align: center;">#</th>
                <th style="padding: 6px 6px;">তারিখ</th>
                <th style="padding: 6px 6px;">বিবরণ</th>
                <th style="padding: 6px 6px;">মেমো</th>
                <th style="padding: 6px 6px; text-align: right;">টাকা (+)</th>
              </tr>
            </thead>
            <tbody>
              ${inflowRows.length > 0 ? inflowRows : `<tr><td colspan="5" style="text-align: center; padding: 15px; color: #94a3b8; font-size: 10px;">কোনো প্রাপ্তির রেকর্ড নেই</td></tr>`}
            </tbody>
          </table>
        </div>

        <!-- Right Table: Recent Company Payments Outflow -->
        <div>
          <div style="font-size: 11px; font-weight: 800; color: #b91c1c; margin-bottom: 6px; display: flex; justify-content: space-between;">
            <span>কোম্পানির পেমেন্ট লগ (সর্বশেষ ১০টি -)</span>
            <span>পরিশোধ (-)</span>
          </div>
          <table style="width: 100%; border-collapse: collapse;">
            <thead>
              <tr style="background: #b91c1c; color: #ffffff; font-size: 10px; font-weight: 700; text-align: left;">
                <th style="padding: 6px 6px; width: 25px; text-align: center;">#</th>
                <th style="padding: 6px 6px;">তারিখ</th>
                <th style="padding: 6px 6px;">সাপ্লায়ার / কোম্পানি</th>
                <th style="padding: 6px 6px;">রেফারেন্স</th>
                <th style="padding: 6px 6px; text-align: right;">টাকা (-)</th>
              </tr>
            </thead>
            <tbody>
              ${outflowRows.length > 0 ? outflowRows : `<tr><td colspan="5" style="text-align: center; padding: 15px; color: #94a3b8; font-size: 10px;">কোনো পেমেন্টের রেকর্ড নেই</td></tr>`}
            </tbody>
          </table>
        </div>

      </div>

      <!-- Official Audit Sign-off Section -->
      <div style="margin-top: 24px; padding-top: 14px; border-top: 1.5px dashed #cbd5e1; display: grid; grid-template-columns: repeat(3, 1fr); text-align: center; font-size: 10.5px; color: #475569;">
        <div>
          <div style="height: 35px;"></div>
          <div style="border-top: 1px solid #94a3b8; width: 80%; margin: 0 auto; padding-top: 4px; font-weight: 700;">
            ক্যাশ কাউন্টার ইনচার্জ
          </div>
        </div>
        <div>
          <div style="height: 35px;"></div>
          <div style="border-top: 1px solid #94a3b8; width: 80%; margin: 0 auto; padding-top: 4px; font-weight: 700;">
            হিসাব নিরীক্ষক / অডিটর
          </div>
        </div>
        <div>
          <div style="height: 35px;"></div>
          <div style="border-top: 1px solid #94a3b8; width: 80%; margin: 0 auto; padding-top: 4px; font-weight: 700;">
            স্বত্বাধিকারী / অনুমোদিত স্বাক্ষর
          </div>
        </div>
      </div>

      ${renderDocumentFooter(profile)}
    </div>
  `;
};

// ----------------------------------------------------------------------
// 12. SALES & PROFIT STATEMENT HTML (বিক্রয় ও লাভ বিবরণী স্টেটমেন্ট)
// ----------------------------------------------------------------------
export const renderSalesProfitStatementHtml = (
  orders: OrderInvoice[],
  products: Product[],
  dateFilter?: { startDate?: string; endDate?: string; filterDate?: string; presetTitle?: string },
  profile?: BusinessProfile,
  expenses: Expense[] = []
): string => {
  // 1. Filter Orders by Date Range
  const filteredOrders = orders.filter((o) => {
    const dStr = (o.date || o.createdAt || '').slice(0, 10);
    if (dateFilter?.filterDate) {
      return dStr === dateFilter.filterDate;
    }
    if (dateFilter?.startDate && dateFilter?.endDate) {
      return dStr >= dateFilter.startDate && dStr <= dateFilter.endDate;
    }
    return true;
  }).sort((a, b) => {
    const dateA = a.date || a.createdAt || '';
    const dateB = b.date || b.createdAt || '';
    return dateB.localeCompare(dateA); // Newest first
  });

  // 1B. Filter Expenses by Date Range
  const filteredExpenses = (expenses || []).filter((e) => {
    const dStr = (e.date || e.createdAt || '').slice(0, 10);
    if (dateFilter?.filterDate) {
      return dStr === dateFilter.filterDate;
    }
    if (dateFilter?.startDate && dateFilter?.endDate) {
      return dStr >= dateFilter.startDate && dStr <= dateFilter.endDate;
    }
    return true;
  });

  const totalPeriodExpenses = filteredExpenses.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
  const salaryExpenses = filteredExpenses.filter((e) => e.category === 'SALARY').reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
  const rentExpenses = filteredExpenses.filter((e) => e.category === 'SHOP_RENT').reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
  const electricityExpenses = filteredExpenses.filter((e) => e.category === 'ELECTRICITY_BILL').reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
  const otherExpenses = filteredExpenses.filter((e) => e.category !== 'SALARY' && e.category !== 'SHOP_RENT' && e.category !== 'ELECTRICITY_BILL').reduce((sum, e) => sum + (Number(e.amount) || 0), 0);

  // 2. Compute Cost & Profit per Order
  interface OrderProfitData {
    order: OrderInvoice;
    saleAmount: number;
    costAmount: number;
    grossProfit: number;
    memoDifference: number;
    netProfit: number;
    marginPercent: number;
    cashPaid: number;
    dueRemaining: number;
  }

  const orderProfits: OrderProfitData[] = filteredOrders.map((ord) => {
    const cashPaid = Number(ord.paidAmount) || 0;
    const dueRemaining = Number(ord.dueAmount) || 0;

    let saleGrossAmount = 0;
    let replacementAmount = 0;
    let saleCostAmount = 0;
    let repCostAmount = 0;

    (ord.items || []).forEach((it: any) => {
      const isRep = it.itemType === 'REPLACEMENT' || it.isReplacement === true || Number(it.quantity) < 0 || (it.total && Number(it.total) < 0);
      const cleanQty = it.quantity !== undefined && !isNaN(Number(it.quantity)) ? Math.abs(Number(it.quantity)) : 0;
      const cleanPrice = Number(it.unitPrice || it.price || 0);

      let unitCost = Number(it.costPrice) || 0;
      if (!unitCost || unitCost <= 0) {
        const p = products.find(
          (prod) => prod.id === it.productId || (prod.name && (it.productName || it.name) && prod.name.toLowerCase() === (it.productName || it.name || '').toLowerCase())
        );
        if (p && p.costPrice && p.costPrice > 0) {
          unitCost = p.costPrice;
        } else {
          unitCost = cleanPrice > 0 ? Math.round(cleanPrice * 0.85) : 0;
        }
      }

      if (isRep) {
        replacementAmount += (cleanQty * cleanPrice);
        repCostAmount += (cleanQty * unitCost);
      } else {
        saleGrossAmount += (cleanQty * cleanPrice);
        saleCostAmount += (cleanQty * unitCost);
      }
    });

    const finalSalesGross = ord.totalSalesAmount && ord.totalSalesAmount > 0 ? ord.totalSalesAmount : (saleGrossAmount || Number(ord.totalAmount) || 0);
    const finalRepAmount = ord.totalReplacementAmount && ord.totalReplacementAmount > 0 ? ord.totalReplacementAmount : replacementAmount;

    // Net billed sales amount (what retailer actually owes / paid)
    const netSaleAmount = Number(ord.totalAmount) || Math.max(0, finalSalesGross - finalRepAmount);

    // User's core formula:
    // "মার্কেট রিফ্লেক্স পণ্য থেকে মুনাফাটাও মাইনাস হবে কারণ পন্য ফেরত আসার সাথে সাথে ওই পণ্য থেকে মুনাফাটাও টাকা কমে গেছে, তাই ইনভয়সে বিক্রির মুনাফা থেকে রিপ্লেস মুনাফা মাইনাস হয়ে নিট মুনাফা দেখাবে ।"
    const saleProfit = Math.max(0, saleGrossAmount - saleCostAmount);
    const repProfit = Math.max(0, replacementAmount - repCostAmount);
    const memoDifference = Number(ord.priceDifference) || 0;
    const memoDiscount = Number(ord.discount) || 0;

    // Realized Net Profit = বিক্রি মুনাফা - রিপ্লেস মুনাফা - মেমো ছাড় + ক্যাশ সমন্বয়
    const netProfit = Math.max(0, saleProfit - repProfit - memoDiscount + memoDifference);

    // Net Cost Amount = netSaleAmount - netProfit (guarantees mathematical harmony and prevents false losses on DSR statements)
    const netCostAmount = Math.max(0, netSaleAmount - netProfit);
    const grossProfit = netProfit;
    const marginPercent = netSaleAmount > 0 ? (netProfit / netSaleAmount) * 100 : 0;

    return {
      order: ord,
      saleAmount: netSaleAmount,
      costAmount: netCostAmount,
      grossProfit,
      memoDifference,
      netProfit,
      marginPercent,
      cashPaid,
      dueRemaining,
    };
  });

  // 3. Overall Totals
  const totalSales = orderProfits.reduce((acc, op) => acc + op.saleAmount, 0);
  const totalCost = orderProfits.reduce((acc, op) => acc + op.costAmount, 0);
  const totalGrossProfit = orderProfits.reduce((acc, op) => acc + op.grossProfit, 0);
  const totalMemoDiff = orderProfits.reduce((acc, op) => acc + op.memoDifference, 0);
  const totalNetProfit = orderProfits.reduce((acc, op) => acc + op.netProfit, 0);
  const totalCashCollected = orderProfits.reduce((acc, op) => acc + op.cashPaid, 0);
  const totalDuePending = orderProfits.reduce((acc, op) => acc + op.dueRemaining, 0);

  // User requirement: "যা প্রফিট থেকে - হবে প্রফিট পর্যাপ্ত না থাকলে মাইনাস ফিগার শো করবে"
  const finalRealizedProfit = totalNetProfit - totalPeriodExpenses;
  const isFinalProfitNegative = finalRealizedProfit < 0;
  const avgMargin = totalSales > 0 ? ((finalRealizedProfit / totalSales) * 100).toFixed(1) : '0.0';

  // 4. Product-level Profit aggregation
  const productSummaryMap: {
    [key: string]: { name: string; sku: string; qty: number; totalCost: number; totalSale: number; profit: number };
  } = {};

  filteredOrders.forEach((ord) => {
    (ord.items || []).forEach((it: any) => {
      const isRep = it.itemType === 'REPLACEMENT' || it.isReplacement === true || Number(it.quantity) < 0 || (it.total && Number(it.total) < 0);
      const pName = it.productName || it.name || 'Unknown Product';
      const key = it.productId || pName;
      const cleanQty = it.quantity !== undefined && !isNaN(Number(it.quantity)) ? Math.abs(Number(it.quantity)) : 0;
      const unitSale = Number(it.unitPrice || it.price || 0);
      let unitCost = Number(it.costPrice) || 0;
      if (!unitCost || unitCost <= 0) {
        const p = products.find((prod) => prod.id === it.productId || (prod.name && pName && prod.name.toLowerCase() === pName.toLowerCase()));
        unitCost = p?.costPrice || (unitSale > 0 ? Math.round(unitSale * 0.85) : 0);
      }
      const itemCostTotal = cleanQty * unitCost;
      const itemSaleTotal = cleanQty * unitSale;

      if (!productSummaryMap[key]) {
        productSummaryMap[key] = {
          name: pName,
          sku: it.sku || '',
          qty: 0,
          totalCost: 0,
          totalSale: 0,
          profit: 0,
        };
      }
      if (isRep) {
        productSummaryMap[key].qty = Math.max(0, productSummaryMap[key].qty - cleanQty);
        productSummaryMap[key].totalCost = Math.max(0, productSummaryMap[key].totalCost - itemCostTotal);
        productSummaryMap[key].totalSale = Math.max(0, productSummaryMap[key].totalSale - itemSaleTotal);
        productSummaryMap[key].profit = Math.max(0, productSummaryMap[key].totalSale - productSummaryMap[key].totalCost);
      } else {
        productSummaryMap[key].qty += cleanQty;
        productSummaryMap[key].totalCost += itemCostTotal;
        productSummaryMap[key].totalSale += itemSaleTotal;
        productSummaryMap[key].profit += (itemSaleTotal - itemCostTotal);
      }
    });
  });

  const topProducts = Object.values(productSummaryMap)
    .sort((a, b) => b.profit - a.profit)
    .slice(0, 8);

  // 5. Chunking for clean printing
  const chunks = chunkArray(orderProfits, 10, 16);
  const totalPages = Math.max(1, chunks.length);

  const dateSubTitle = dateFilter?.presetTitle
    ? dateFilter.presetTitle
    : dateFilter?.filterDate
    ? `তারিখ: ${dateFilter.filterDate}`
    : dateFilter?.startDate && dateFilter?.endDate
    ? `তারিখ পরিসীমা: ${dateFilter.startDate} হতে ${dateFilter.endDate}`
    : `সকল বিক্রয়ের মোট বিবরণী (${new Date().toLocaleDateString('bn-BD')})`;

  return chunks.map((chunk, pageIdx) => {
    const pageNum = pageIdx + 1;
    const isFirstPage = pageNum === 1;
    const isLastPage = pageNum === totalPages;
    const offset = isFirstPage ? 0 : 10 + (pageIdx - 1) * 16;

    const rows = chunk.map((item, idx) => {
      const globalIdx = offset + idx;
      const ord = item.order;
      const isProfit = item.netProfit >= 0;
      const dStr = (ord.date || ord.createdAt || '').slice(0, 10);

      return `
        <tr style="border-bottom: 1px solid #e2e8f0; background: ${globalIdx % 2 === 0 ? '#ffffff' : '#f8fafc'}; font-size: 10.5px;">
          <td style="padding: 6px 8px; color: #64748b; font-weight: 700; text-align: center;">${toBnDigit(globalIdx + 1)}</td>
          <td style="padding: 6px 8px; color: #334155; font-weight: 600; white-space: nowrap;">${dStr}</td>
          <td style="padding: 6px 8px; font-weight: 700; color: #0f172a; white-space: nowrap;">${ord.invoiceNumber || ord.invoiceNo || ord.id.slice(0, 8)}</td>
          <td style="padding: 6px 8px; color: #0f172a; font-weight: 600;">
            <div>${ord.retailerName || ord.customerName || ord.shopName || 'কাউন্টার ক্যাশ খদ্দের'}</div>
            <div style="font-size: 9px; color: #64748b; margin-top: 1px;">
              <span>বিক্রেতা: ${(ord.salesPersonRole === 'dsr' || ord.creatorRole === 'dsr') ? '🚚 DSR' : (ord.salesPersonRole === 'admin' || ord.creatorRole === 'admin') ? '👑 Admin' : '🖥️ কাউন্টার'} ${ord.salesPersonName || ord.creatorName || ''}</span>
              ${(ord.hasReplacements || (ord.totalReplacementAmount && ord.totalReplacementAmount > 0)) ? ` • <span style="color: #b91c1c; font-weight: 700;">🔄 রিপ্লেস -${formatCurrency(ord.totalReplacementAmount)}</span>` : ''}
            </div>
          </td>
          <td style="padding: 6px 8px; text-align: right; font-weight: 600; color: #0f172a;">${formatCurrency(item.saleAmount)}</td>
          <td style="padding: 6px 8px; text-align: right; font-weight: 500; color: #64748b;">${formatCurrency(item.costAmount)}</td>
          <td style="padding: 6px 8px; text-align: right; font-weight: 700; color: ${isProfit ? '#059669' : '#dc2626'};">
            ${isProfit ? '+' : ''}${formatCurrency(item.netProfit)}
          </td>
          <td style="padding: 6px 8px; text-align: right; font-weight: 700; color: #334155;">
            ${item.marginPercent.toFixed(1)}%
          </td>
          <td style="padding: 6px 8px; text-align: center;">
            <span style="display: inline-block; padding: 2px 6px; border-radius: 4px; font-size: 9.5px; font-weight: 800; ${
              isProfit ? 'background: #ecfdf5; color: #065f46; border: 1px solid #a7f3d0;' : 'background: #fef2f2; color: #991b1b; border: 1px solid #fecaca;'
            }">
              ${isProfit ? 'লাভ' : 'লস'}
            </span>
          </td>
        </tr>
      `;
    }).join('');

    return `
      <div class="pdf-page">
        <div>
          ${isFirstPage ? `
            ${renderDocumentHeader(
              'বিক্রয় লাভ ও মার্জিন স্টেটমেন্ট (প্রফিট অ্যান্ড লস বিবরণী)',
              'Sales Revenue, Product Cost & Net Profit Statement',
              `${dateSubTitle} • মোট মেমো: ${toBnDigit(filteredOrders.length)} টি`,
              'বিক্রয় প্রফিট স্টেটমেন্ট',
              profile
            )}

            <!-- Summary KPI Grid (বিক্রয়, খরচ ও চূড়ান্ত নিট প্রফিট) -->
            <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; margin-bottom: 12px;">
              <div style="background: #f8fafc; border: 1.5px solid #cbd5e1; border-radius: 8px; padding: 10px; text-align: center;">
                <div style="font-size: 10px; color: #64748b; font-weight: 700;">১. মোট বিক্রয় মূল্য</div>
                <div style="font-size: 15px; font-weight: 900; color: #0f172a; margin-top: 3px;">${formatCurrency(totalSales)}</div>
                <div style="font-size: 9.5px; color: #64748b; margin-top: 2px;">${toBnDigit(filteredOrders.length)} টি বিক্রয় মেমো</div>
              </div>

              <div style="background: #f8fafc; border: 1.5px solid #cbd5e1; border-radius: 8px; padding: 10px; text-align: center;">
                <div style="font-size: 10px; color: #047857; font-weight: 800;">২. বিক্রয় হতে লাভ</div>
                <div style="font-size: 15px; font-weight: 900; color: #059669; margin-top: 3px;">+${formatCurrency(totalNetProfit)}</div>
                <div style="font-size: 9.5px; color: #64748b; margin-top: 2px;">কেনা খরচ বাদে লাভ</div>
              </div>

              <div style="background: #fef2f2; border: 1.5px solid #fca5a5; border-radius: 8px; padding: 10px; text-align: center;">
                <div style="font-size: 10px; color: #b91c1c; font-weight: 800;">৩. দোকান খরচ (-)</div>
                <div style="font-size: 15px; font-weight: 900; color: #dc2626; margin-top: 3px;">-${formatCurrency(totalPeriodExpenses)}</div>
                <div style="font-size: 9.5px; color: #991b1b; margin-top: 2px;">${toBnDigit(filteredExpenses.length)} টি ব্যয় সমন্বয়</div>
              </div>

              <div style="background: ${isFinalProfitNegative ? '#fef2f2' : '#ecfdf5'}; border: 2px solid ${isFinalProfitNegative ? '#dc2626' : '#059669'}; border-radius: 8px; padding: 10px; text-align: center;">
                <div style="font-size: 10px; color: ${isFinalProfitNegative ? '#991b1b' : '#065f46'}; font-weight: 800;">
                  ৪. চূড়ান্ত নিট প্রফিট ${isFinalProfitNegative ? '(ঘাটতি/লস)' : '(লাভ)'}
                </div>
                <div style="font-size: 17px; font-weight: 900; color: ${isFinalProfitNegative ? '#dc2626' : '#059669'}; margin-top: 2px;">
                  ${finalRealizedProfit >= 0 ? '+' : ''}${formatCurrency(finalRealizedProfit)}
                </div>
                <div style="font-size: 9.5px; color: ${isFinalProfitNegative ? '#b91c1c' : '#047857'}; font-weight: 700; margin-top: 2px;">
                  ${isFinalProfitNegative ? '⚠️ প্রফিট পর্যাপ্ত নয় (মাইনাস ফিগার)' : `গড় মার্জিন: ${avgMargin}%`}
                </div>
              </div>
            </div>

            <!-- Operating Expenses Breakdown Banner (বেতন, দোকান ভাড়া, বিদ্যুৎ বিল, অন্যান্য) -->
            ${totalPeriodExpenses > 0 ? `
              <div style="margin-bottom: 14px; background: #fffbeb; border: 1.5px solid #fde68a; border-radius: 8px; padding: 8px 12px; font-size: 10px;">
                <div style="font-weight: 800; color: #92400e; display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #fef3c7; padding-bottom: 4px; margin-bottom: 6px;">
                  <span>🧾 ক্যাশ কাউন্টার ও দোকান পরিচালনা ব্যয় (প্রফিট হতে বাদ):</span>
                  <span style="font-weight: 900; color: #b45309;">মোট খরচ: -${formatCurrency(totalPeriodExpenses)}</span>
                </div>
                <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; text-align: center;">
                  <div style="background: #ffffff; padding: 4px 6px; border-radius: 6px; border: 1px solid #fef3c7;">
                    <span style="color: #64748b; font-size: 9px; display: block;">👔 স্টাফ বেতন</span>
                    <strong style="color: #4338ca; font-size: 11px;">${formatCurrency(salaryExpenses)}</strong>
                  </div>
                  <div style="background: #ffffff; padding: 4px 6px; border-radius: 6px; border: 1px solid #fef3c7;">
                    <span style="color: #64748b; font-size: 9px; display: block;">🏪 দোকান ভাড়া</span>
                    <strong style="color: #b45309; font-size: 11px;">${formatCurrency(rentExpenses)}</strong>
                  </div>
                  <div style="background: #ffffff; padding: 4px 6px; border-radius: 6px; border: 1px solid #fef3c7;">
                    <span style="color: #64748b; font-size: 9px; display: block;">⚡ বিদ্যুৎ বিল</span>
                    <strong style="color: #a16207; font-size: 11px;">${formatCurrency(electricityExpenses)}</strong>
                  </div>
                  <div style="background: #ffffff; padding: 4px 6px; border-radius: 6px; border: 1px solid #fef3c7;">
                    <span style="color: #64748b; font-size: 9px; display: block;">📦 অন্যান্য খরচ</span>
                    <strong style="color: #0f766e; font-size: 11px;">${formatCurrency(otherExpenses)}</strong>
                  </div>
                </div>
              </div>
            ` : ''}

            <!-- Top Profitable Products (On Page 1) -->
            ${topProducts.length > 0 ? `
              <div style="margin-bottom: 16px; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden;">
                <div style="padding: 6px 10px; background: #f1f5f9; border-bottom: 1px solid #e2e8f0; font-size: 10px; font-weight: 800; color: #334155; display: flex; justify-content: space-between;">
                  <span>🏆 শীর্ষ লাভজনক পণ্যসমূহ (Top Profitable Products)</span>
                  <span style="color: #64748b;">মোট আইটেম: ${toBnDigit(topProducts.length)} টি</span>
                </div>
                <table style="width: 100%; border-collapse: collapse; font-size: 10px;">
                  <thead>
                    <tr style="background: #f8fafc; color: #475569; font-weight: 700; border-bottom: 1px solid #cbd5e1; text-align: left;">
                      <th style="padding: 5px 8px;">পণ্যের নাম</th>
                      <th style="padding: 5px 8px; text-align: center;">বিক্রয় পরিমাণ</th>
                      <th style="padding: 5px 8px; text-align: right;">মোট বিক্রয় (৳)</th>
                      <th style="padding: 5px 8px; text-align: right;">মোট কেনা খরচ (৳)</th>
                      <th style="padding: 5px 8px; text-align: right;">মোট লাভ (৳)</th>
                      <th style="padding: 5px 8px; text-align: right;">মার্জিন %</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${topProducts.map((tp) => {
                      const m = tp.totalSale > 0 ? ((tp.profit / tp.totalSale) * 100).toFixed(1) : '0';
                      return `
                        <tr style="border-bottom: 1px solid #f1f5f9;">
                          <td style="padding: 4px 8px; font-weight: 600; color: #0f172a;">${tp.name}</td>
                          <td style="padding: 4px 8px; text-align: center; color: #475569;">${toBnDigit(tp.qty)}</td>
                          <td style="padding: 4px 8px; text-align: right; color: #0f172a;">${formatCurrency(tp.totalSale)}</td>
                          <td style="padding: 4px 8px; text-align: right; color: #64748b;">${formatCurrency(tp.totalCost)}</td>
                          <td style="padding: 4px 8px; text-align: right; font-weight: 800; color: #059669;">+${formatCurrency(tp.profit)}</td>
                          <td style="padding: 4px 8px; text-align: right; font-weight: 700; color: #334155;">${m}%</td>
                        </tr>
                      `;
                    }).join('')}
                  </tbody>
                </table>
              </div>
            ` : ''}
          ` : `
            ${renderContinuationHeader(
              'বিক্রয় লাভ ও মার্জিন স্টেটমেন্ট (প্রফিট বিবরণী)',
              'Sales & Profit Statement',
              pageNum,
              totalPages,
              profile
            )}
          `}

          <!-- Detailed Orders Table -->
          <div style="margin-bottom: 8px; font-size: 11px; font-weight: 800; color: #0f172a;">
            📋 মেমো ভিত্তিক বিক্রয় ও লাভ-লোকসান লগ (${isFirstPage ? 'পৃষ্ঠা ১' : `পৃষ্ঠা ${toBnDigit(pageNum)}`}):
          </div>

          <table style="width: 100%; border-collapse: collapse; margin-bottom: 16px;">
            <thead>
              <tr style="background: #0f172a; color: #ffffff; font-size: 10.5px; font-weight: 700; text-align: left;">
                <th style="padding: 7px 8px; width: 25px; text-align: center; border-radius: 4px 0 0 0;">#</th>
                <th style="padding: 7px 8px;">তারিখ</th>
                <th style="padding: 7px 8px;">মেমো নং</th>
                <th style="padding: 7px 8px;">ক্রেতা / প্রতিষ্ঠান</th>
                <th style="padding: 7px 8px; text-align: right;">বিক্রয় মূল্য</th>
                <th style="padding: 7px 8px; text-align: right;">কেনা খরচ</th>
                <th style="padding: 7px 8px; text-align: right;">নিট লাভ (৳)</th>
                <th style="padding: 7px 8px; text-align: right;">মার্জিন %</th>
                <th style="padding: 7px 8px; text-align: center; border-radius: 0 4px 0 0;">অবস্থা</th>
              </tr>
            </thead>
            <tbody>
              ${rows.length > 0 ? rows : `<tr><td colspan="9" style="text-align: center; padding: 20px; color: #94a3b8;">এই সময়ে কোনো বিক্রয়ের মেমো নেই।</td></tr>`}
            </tbody>
            ${isLastPage ? `
              <tfoot>
                <tr style="background: #f1f5f9; font-size: 11px; font-weight: 800; border-top: 2px solid #cbd5e1;">
                  <td colspan="4" style="padding: 8px 10px; text-align: right; color: #0f172a;">বিক্রয় মেমোর মোট লাভ:</td>
                  <td style="padding: 8px 10px; text-align: right; color: #0f172a;">${formatCurrency(totalSales)}</td>
                  <td style="padding: 8px 10px; text-align: right; color: #475569;">${formatCurrency(totalCost)}</td>
                  <td style="padding: 8px 10px; text-align: right; color: ${totalNetProfit >= 0 ? '#059669' : '#dc2626'}; font-weight: 900;">
                    ${totalNetProfit >= 0 ? '+' : ''}${formatCurrency(totalNetProfit)}
                  </td>
                  <td style="padding: 8px 10px; text-align: right; color: #0f172a;">${totalSales > 0 ? ((totalNetProfit / totalSales) * 100).toFixed(1) : '0.0'}%</td>
                  <td style="padding: 8px 10px; text-align: center; color: #059669;">বিক্রয় মুনাফা</td>
                </tr>
                ${totalPeriodExpenses > 0 ? `
                  <tr style="background: #fffbeb; font-size: 11px; font-weight: 800; border-top: 1px solid #fde68a;">
                    <td colspan="6" style="padding: 6px 10px; text-align: right; color: #b45309;">
                      দোকান পরিচালনা ব্যয় কর্তন (বেতন, দোকান ভাড়া, বিদ্যুৎ বিল, অন্যান্য):
                    </td>
                    <td style="padding: 6px 10px; text-align: right; color: #dc2626; font-weight: 900;">
                      -${formatCurrency(totalPeriodExpenses)}
                    </td>
                    <td colspan="2" style="padding: 6px 10px; text-align: center; color: #b45309; font-size: 10px;">
                      (${toBnDigit(filteredExpenses.length)} টি খরচ)
                    </td>
                  </tr>
                  <tr style="background: ${isFinalProfitNegative ? '#fef2f2' : '#ecfdf5'}; font-size: 11.5px; font-weight: 900; border-top: 2px solid ${isFinalProfitNegative ? '#f87171' : '#6ee7b7'};">
                    <td colspan="6" style="padding: 8px 10px; text-align: right; color: ${isFinalProfitNegative ? '#991b1b' : '#065f46'};">
                      চূড়ান্ত সমন্বিত নিট প্রফিট ${isFinalProfitNegative ? '(ঘাটতি / লোকসান)' : '(লাভ)'}:
                    </td>
                    <td style="padding: 8px 10px; text-align: right; color: ${isFinalProfitNegative ? '#dc2626' : '#059669'}; font-size: 13px;">
                      ${finalRealizedProfit >= 0 ? '+' : ''}${formatCurrency(finalRealizedProfit)}
                    </td>
                    <td style="padding: 8px 10px; text-align: right; color: ${isFinalProfitNegative ? '#b91c1c' : '#047857'};">
                      ${avgMargin}%
                    </td>
                    <td style="padding: 8px 10px; text-align: center; color: ${isFinalProfitNegative ? '#dc2626' : '#059669'};">
                      ${isFinalProfitNegative ? '⚠️ ঘাটতি' : 'চূড়ান্ত লাভ'}
                    </td>
                  </tr>
                ` : ''}
              </tfoot>
            ` : ''}
          </table>
        </div>

        ${isLastPage ? `
          <!-- Signatures on Last Page -->
          <div style="margin-top: 24px; padding-top: 14px; border-top: 1.5px dashed #cbd5e1; display: grid; grid-template-columns: repeat(3, 1fr); text-align: center; font-size: 10.5px; color: #475569;">
            <div>
              <div style="height: 35px;"></div>
              <div style="border-top: 1px solid #94a3b8; width: 80%; margin: 0 auto; padding-top: 4px; font-weight: 700;">
                ক্যাশ কাউন্টার / বিক্রেতা
              </div>
            </div>
            <div>
              <div style="height: 35px;"></div>
              <div style="border-top: 1px solid #94a3b8; width: 80%; margin: 0 auto; padding-top: 4px; font-weight: 700;">
                হিসাব নিরীক্ষক / অডিটর
              </div>
            </div>
            <div>
              <div style="height: 35px;"></div>
              <div style="border-top: 1px solid #94a3b8; width: 80%; margin: 0 auto; padding-top: 4px; font-weight: 700;">
                স্বত্বাধিকারী / অনুমোদিত স্বাক্ষর
              </div>
            </div>
          </div>
        ` : ''}

        ${renderDocumentFooter(profile, pageNum, totalPages, isLastPage)}
      </div>
    `;
  }).join('');
};
