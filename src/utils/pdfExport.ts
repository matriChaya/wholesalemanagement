import html2canvas from 'html2canvas-pro';
import jsPDF from 'jspdf';
import {
  Supplier,
  SupplierLedgerEntry,
  CashTransfer,
  Retailer,
  OrderInvoice,
  Product,
  CapitalTransaction,
  BusinessProfile,
  BankAccount,
  UserProfile,
  Expense,
} from '../types';
import {
  renderSupplierLedgerHtml,
  renderAllSuppliersHtml,
  renderRetailerStatementHtml,
  renderAllRetailersHtml,
  renderInvoiceMemoHtml,
  InvoiceMemoPdfOptions,
  renderDailySalesHtml,
  renderCashTransfersHtml,
  renderStockStatementHtml,
  renderCapitalStatementHtml,
  renderCashValidationStatementHtml,
  renderBankStatementHtml,
  renderCashDrawerStatementHtml,
  renderSalesProfitStatementHtml,
  CashValidationStatementData,
  BankStatementData,
  BankStatementTransaction,
  CashDrawerStatementData,
  CashDrawerTransaction,
  DateRangeFilter,
  formatCurrency,
  formatDate,
} from './pdfHtmlTemplates';

export type { DateRangeFilter };
import { getStoredBusinessProfile } from './businessProfile';
import { saveFileBlob, shareFileBlob, SaveFileResult, isStandaloneMode, isMobilePlatform } from './fileSaver';

export interface PdfDocumentResult {
  doc?: jsPDF;
  filename: string;
  blob?: Blob;
  blobUrl: string;
  title: string;
  subtitle?: string;
  htmlContent: string;
  download: (fontFamily?: string, options?: { forceShare?: boolean; onStatus?: (s: string) => void }) => Promise<SaveFileResult | void> | void;
  share?: (fontFamily?: string) => Promise<SaveFileResult>;
  print: (fontFamily?: string) => void;
}

export { formatCurrency as formatPdfCurrency, formatDate as formatPdfDate };

/**
 * Safe text formatter for Bengali and Latin scripts
 */
export const sanitizePdfText = (str?: string): string => {
  if (!str) return '';
  return str.trim();
};

/**
 * Standard A4 HTML Wrapper with Google Fonts (Hind Siliguri, Noto Sans Bengali, Anek Bangla, Inter)
 * and print-optimized typography for razor-sharp rendering
 */
export const wrapHtmlWithA4Styles = (
  content: string,
  fontFamily: string = "'Hind Siliguri', 'Noto Sans Bengali', sans-serif"
): string => {
  return `<!DOCTYPE html>
<html lang="bn">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>অফিসিয়াল প্রিন্ট ও লেজার স্টেটমেন্ট</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Anek+Bangla:wght@400;500;600;700;800&family=Hind+Siliguri:wght@400;500;600;700&family=Noto+Sans+Bengali:wght@400;500;600;700;800&family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
  <style>
    @page {
      size: A4 portrait;
      margin: 14mm 10mm 15mm 10mm;
    }
    *, *::before, *::after {
      box-sizing: border-box;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    html, body {
      margin: 0;
      padding: 0;
      background: #ffffff;
      color: #0f172a;
      font-family: ${fontFamily};
      -webkit-font-smoothing: antialiased;
      -moz-osx-font-smoothing: grayscale;
      text-rendering: optimizeLegibility;
    }
    .pdf-page {
      width: 794px;
      min-height: 1123px;
      padding: 38px 32px 38px 32px;
      margin: 0 auto;
      background: #ffffff;
      color: #0f172a;
      box-sizing: border-box;
      position: relative;
      page-break-after: always;
      break-after: page;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
    }
    @media print {
      body {
        margin: 0;
        padding: 0;
        background: #ffffff;
      }
      .pdf-page {
        width: 100% !important;
        min-height: calc(297mm - 29mm) !important;
        margin: 0 !important;
        padding: 28px 24px 28px 24px !important;
        page-break-after: always !important;
        break-after: page !important;
      }
    }
    table {
      border-collapse: collapse;
      width: 100%;
    }
    th, td {
      border-color: #cbd5e1;
    }
  </style>
</head>
<body>
  ${content}
</body>
</html>`;
};

/**
 * Generates a high-definition PDF binary Blob from HTML using html2canvas & jsPDF
 */
export const generatePdfBlob = async (
  htmlContent: string,
  fontFamily: string = "'Hind Siliguri', 'Noto Sans Bengali', sans-serif"
): Promise<Blob> => {
  // Use an isolated hidden iframe to prevent parent Tailwind styles or oklch colors from leaking into canvas
  const iframe = document.createElement('iframe');
  iframe.style.position = 'fixed';
  iframe.style.left = '-9999px';
  iframe.style.top = '0';
  iframe.style.width = '794px';
  iframe.style.height = 'auto';
  iframe.style.minHeight = '1123px';
  iframe.style.border = 'none';
  iframe.style.zIndex = '-99999';
  iframe.style.visibility = 'hidden';

  document.body.appendChild(iframe);

  try {
    const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
    if (!iframeDoc) {
      throw new Error('Unable to access isolated iframe document for PDF generation');
    }

    const fullDocHtml = htmlContent.includes('<!DOCTYPE html>')
      ? htmlContent
      : wrapHtmlWithA4Styles(htmlContent, fontFamily);

    iframeDoc.open();
    iframeDoc.write(fullDocHtml);
    iframeDoc.close();

    // Await Google Fonts inside iframe and document
    if (iframeDoc.fonts) {
      await iframeDoc.fonts.ready;
    }
    if (document.fonts) {
      await document.fonts.ready;
    }
    // Allow font renderer to settle glyphs & ligatures
    await new Promise((r) => setTimeout(r, 260));

    const pageElements = iframeDoc.querySelectorAll<HTMLElement>('.pdf-page');

    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
      compress: true,
    });

    const pdfWidth = pdf.internal.pageSize.getWidth(); // 210mm
    const pdfHeight = pdf.internal.pageSize.getHeight(); // 297mm
    const a4Ratio = pdfHeight / pdfWidth; // 1.4142857

    let globalPageCount = 0;

    const renderElements = pageElements.length > 0
      ? Array.from(pageElements)
      : [iframeDoc.body || iframeDoc.documentElement];

    for (const pageEl of renderElements) {
      pageEl.style.fontFamily = fontFamily;
      
      const canvas = await html2canvas(pageEl, {
        scale: 2.5, // 240+ DPI crisp, pristine quality
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff',
        logging: false,
        width: 794,
        windowWidth: 794,
      });

      const singlePageCanvasHeight = Math.round(canvas.width * a4Ratio);
      // Determine how many A4 pages this element spans without vertical squishing
      const numSlices = Math.max(1, Math.ceil((canvas.height - 10) / singlePageCanvasHeight));

      if (numSlices === 1) {
        if (globalPageCount > 0) pdf.addPage();
        globalPageCount++;
        const imgData = canvas.toDataURL('image/jpeg', 0.98);
        pdf.addImage(imgData, 'JPEG', 0, 0, pdfWidth, pdfHeight, undefined, 'FAST');
      } else {
        // Multi-page slicing: cleanly slice without vertical distortion!
        for (let s = 0; s < numSlices; s++) {
          if (globalPageCount > 0) pdf.addPage();
          globalPageCount++;

          const yOffset = s * singlePageCanvasHeight;
          const sliceHeight = Math.min(singlePageCanvasHeight, canvas.height - yOffset);

          const sliceCanvas = document.createElement('canvas');
          sliceCanvas.width = canvas.width;
          sliceCanvas.height = singlePageCanvasHeight;
          const ctx = sliceCanvas.getContext('2d');
          if (ctx) {
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(0, 0, sliceCanvas.width, sliceCanvas.height);
            ctx.drawImage(
              canvas,
              0, yOffset, canvas.width, sliceHeight,
              0, 0, canvas.width, sliceHeight
            );
          }
          const sliceData = sliceCanvas.toDataURL('image/jpeg', 0.98);
          pdf.addImage(sliceData, 'JPEG', 0, 0, pdfWidth, pdfHeight, undefined, 'FAST');
        }
      }
    }

    return pdf.output('blob');
  } finally {
    if (document.body.contains(iframe)) {
      document.body.removeChild(iframe);
    }
  }
};

/**
 * High-definition Bengali PDF Downloader using universal PWA & Mobile fileSaver
 */
export const downloadHtmlAsPdf = async (
  htmlContent: string,
  filename: string,
  fontFamily: string = "'Hind Siliguri', 'Noto Sans Bengali', sans-serif",
  options?: { forceShare?: boolean; onStatus?: (status: string) => void }
): Promise<SaveFileResult> => {
  try {
    options?.onStatus?.('পিডিএফ ফাইল তৈরি করা হচ্ছে...');
    const pdfBlob = await generatePdfBlob(htmlContent, fontFamily);

    const result = await saveFileBlob(pdfBlob, filename, 'application/pdf', {
      title: filename.replace(/\.pdf$/i, ''),
      description: 'মাতৃছায়া টেলিকম - অফিসিয়াল চালান ও স্টেটমেন্ট',
      forceShare: options?.forceShare,
      onStatus: options?.onStatus,
    });

    return result;
  } catch (err) {
    console.error('Failed to generate or save PDF with html2canvas:', err);
    printHtmlDocument(htmlContent, fontFamily);
    return {
      success: false,
      method: 'blob_anchor',
      message: 'পিডিএফ তৈরি ব্যর্থ হওয়ায় সরাসরি প্রিন্ট মোড চালু করা হয়েছে',
    };
  }
};

/**
 * Direct Mobile Web Share trigger for PDF
 */
export const shareHtmlAsPdf = async (
  htmlContent: string,
  filename: string,
  fontFamily: string = "'Hind Siliguri', 'Noto Sans Bengali', sans-serif"
): Promise<SaveFileResult> => {
  const pdfBlob = await generatePdfBlob(htmlContent, fontFamily);
  return await shareFileBlob(pdfBlob, filename, 'application/pdf', filename.replace(/\.pdf$/i, ''));
};

/**
 * Direct High-DPI Print trigger for Bengali HTML documents
 */
export const printHtmlDocument = (
  htmlContent: string,
  fontFamily: string = "'Hind Siliguri', 'Noto Sans Bengali', sans-serif"
): void => {
  const iframe = document.createElement('iframe');
  iframe.style.position = 'fixed';
  iframe.style.right = '0';
  iframe.style.bottom = '0';
  iframe.style.width = '0';
  iframe.style.height = '0';
  iframe.style.border = '0';
  document.body.appendChild(iframe);

  const doc = iframe.contentWindow?.document;
  if (!doc) return;

  const fullPrintDoc = htmlContent.includes('<!DOCTYPE html>')
    ? htmlContent
    : wrapHtmlWithA4Styles(htmlContent, fontFamily);

  doc.open();
  doc.write(fullPrintDoc);
  doc.close();

  setTimeout(() => {
    try {
      iframe.contentWindow?.focus();
      iframe.contentWindow?.print();
    } catch (e) {
      console.error('Print iframe trigger failed:', e);
    } finally {
      setTimeout(() => {
        if (document.body.contains(iframe)) {
          document.body.removeChild(iframe);
        }
      }, 1200);
    }
  }, 400);
};

/**
 * Creates a PdfDocumentResult object
 */
const buildResult = (
  htmlContent: string,
  filename: string,
  title: string,
  subtitle: string = ''
): PdfDocumentResult => {
  const fullDoc = htmlContent.includes('<!DOCTYPE html>')
    ? htmlContent
    : wrapHtmlWithA4Styles(htmlContent);
  const blob = new Blob([fullDoc], { type: 'text/html;charset=utf-8' });
  const blobUrl = URL.createObjectURL(blob);

  return {
    filename,
    blob,
    blobUrl,
    title,
    subtitle,
    htmlContent,
    download: (fontFamily?: string, options?: { forceShare?: boolean; onStatus?: (s: string) => void }) =>
      downloadHtmlAsPdf(htmlContent, filename, fontFamily, options),
    share: (fontFamily?: string) => shareHtmlAsPdf(htmlContent, filename, fontFamily),
    print: (fontFamily?: string) => printHtmlDocument(htmlContent, fontFamily),
  };
};

// ----------------------------------------------------------------------
// 1. SUPPLIER LEDGER STATEMENT (একক সাপ্লায়ার খাতা)
// ----------------------------------------------------------------------
export const generateSupplierLedgerPdf = (
  supplier: Supplier,
  entries: SupplierLedgerEntry[],
  _allSuppliers?: Supplier[],
  profile?: BusinessProfile
): PdfDocumentResult => {
  const safeName = supplier.name.replace(/[^a-zA-Z0-9_\u0980-\u09FF-]/g, '_');
  const filename = `Supplier_Ledger_${safeName}_${new Date().toISOString().slice(0, 10)}.pdf`;
  const html = renderSupplierLedgerHtml(supplier, entries, profile);
  return buildResult(
    html,
    filename,
    `সাপ্লায়ার লেজার: ${supplier.name}`,
    `${supplier.company} • পাওনা: ${formatCurrency(supplier.outstandingPayable || 0)}`
  );
};

// ----------------------------------------------------------------------
// 2. ALL SUPPLIERS SUMMARY (সকল সাপ্লায়ার খাতা সামারি)
// ----------------------------------------------------------------------
export const generateAllSuppliersSummaryPdf = (suppliers: Supplier[], profile?: BusinessProfile): PdfDocumentResult => {
  const filename = `All_Suppliers_Summary_${new Date().toISOString().slice(0, 10)}.pdf`;
  const html = renderAllSuppliersHtml(suppliers, profile);
  const totalPayable = suppliers.reduce((acc, s) => acc + (s.outstandingPayable || 0), 0);
  return buildResult(
    html,
    filename,
    'সকল সাপ্লায়ারদের দেনা-পাওনা বিবরণী',
    `মোট ${suppliers.length} প্রতিষ্ঠান • সর্বমোট দেনা: ${formatCurrency(totalPayable)}`
  );
};

// ----------------------------------------------------------------------
// 3. RETAILER ACCOUNT STATEMENT (রিটেইলার বাকি খাতা ও লেজার)
// ----------------------------------------------------------------------
export const generateRetailerStatementPdf = (
  retailer: Retailer,
  orders: OrderInvoice[],
  profile?: BusinessProfile
): PdfDocumentResult => {
  const safeShop = (retailer.shopName || retailer.name).replace(/[^a-zA-Z0-9_\u0980-\u09FF-]/g, '_');
  const filename = `Retailer_Statement_${safeShop}_${new Date().toISOString().slice(0, 10)}.pdf`;
  const html = renderRetailerStatementHtml(retailer, orders, profile);
  return buildResult(
    html,
    filename,
    `রিটেইলার খাতা: ${retailer.shopName || retailer.name}`,
    `রুট: ${retailer.route || 'সাধারণ'} • বাকি: ${formatCurrency(retailer.outstandingDue || 0)}`
  );
};

// ----------------------------------------------------------------------
// 4. ALL RETAILERS SUMMARY (সকল রিটেইলারের বাকি তালিকা)
// ----------------------------------------------------------------------
export const generateAllRetailersSummaryPdf = (retailers: Retailer[], profile?: BusinessProfile): PdfDocumentResult => {
  const filename = `All_Retailers_Summary_${new Date().toISOString().slice(0, 10)}.pdf`;
  const html = renderAllRetailersHtml(retailers, profile);
  const totalDue = retailers.reduce((acc, r) => acc + (r.outstandingDue || 0), 0);
  return buildResult(
    html,
    filename,
    'সকল রিটেইলারদের বাকি তালিকা বিবরণী',
    `মোট ${retailers.length} দোকান • বাজারে মোট বাকি: ${formatCurrency(totalDue)}`
  );
};

// ----------------------------------------------------------------------
// 5. WHOLESALE POS INVOICE MEMO (পাইকারি মেমো / চালান)
// ----------------------------------------------------------------------
export const generateInvoiceMemoPdf = (
  invoice: OrderInvoice,
  retailer?: Retailer,
  profile?: BusinessProfile,
  options?: InvoiceMemoPdfOptions
): PdfDocumentResult => {
  const invNo = invoice.invoiceNo || invoice.id.slice(0, 8);
  const showProfit = Boolean(options?.includeProfit || options?.isAdmin);
  const filename = `Invoice_${invNo}_${showProfit ? 'AdminProfit_' : ''}${new Date().toISOString().slice(0, 10)}.pdf`;
  const html = renderInvoiceMemoHtml(invoice, retailer, profile, options);
  return buildResult(
    html,
    filename,
    `পাইকারি বিক্রয় চালান #${invNo}${showProfit ? ' (এডমিন লভ্যাংশ কপি)' : ''}`,
    `ক্রেতা: ${retailer?.shopName || invoice.retailerName} • বিল: ${formatCurrency(invoice.totalAmount)}`
  );
};

export const generateAdminProfitInvoiceMemoPdf = (
  invoice: OrderInvoice,
  retailer?: Retailer,
  profile?: BusinessProfile,
  products?: Product[]
): PdfDocumentResult => {
  return generateInvoiceMemoPdf(invoice, retailer, profile, {
    includeProfit: true,
    isAdmin: true,
    products,
  });
};

// ----------------------------------------------------------------------
// 6. DAILY SALES STATEMENT (দৈনিক বিক্রয় রেজিস্টার)
// ----------------------------------------------------------------------
export const generateDailySalesStatementPdf = (
  orders: OrderInvoice[],
  filterDate?: string,
  profile?: BusinessProfile
): PdfDocumentResult => {
  const dateStr = filterDate || new Date().toISOString().slice(0, 10);
  const filename = `Daily_Sales_Register_${dateStr}.pdf`;
  const html = renderDailySalesHtml(orders, filterDate, profile);
  const dayOrders = orders.filter((o) => (o.date || '').startsWith(dateStr));
  const totalSales = dayOrders.reduce((acc, o) => acc + (o.totalAmount || 0), 0);
  return buildResult(
    html,
    filename,
    `দৈনিক বিক্রয় রেজিস্টার (${dateStr})`,
    `মোট মেমো: ${dayOrders.length} টি • সর্বমোট বিক্রয়: ${formatCurrency(totalSales)}`
  );
};

// ----------------------------------------------------------------------
// 6B. SALES & NET PROFIT STATEMENT (বিক্রয় ও লাভ বিবরণী স্টেটমেন্ট)
// ----------------------------------------------------------------------
export const generateSalesProfitStatementPdf = (
  orders: OrderInvoice[],
  products: Product[],
  dateFilter?: { startDate?: string; endDate?: string; filterDate?: string; presetTitle?: string },
  profile?: BusinessProfile,
  expenses?: Expense[]
): PdfDocumentResult => {
  const dateStr = dateFilter?.filterDate || dateFilter?.startDate || new Date().toISOString().slice(0, 10);
  const filename = `Sales_Profit_Statement_${dateStr}.pdf`;
  const html = renderSalesProfitStatementHtml(orders, products, dateFilter, profile, expenses);

  const filtered = orders.filter((o) => {
    const d = (o.date || o.createdAt || '').slice(0, 10);
    if (dateFilter?.filterDate) return d === dateFilter.filterDate;
    if (dateFilter?.startDate && dateFilter?.endDate) return d >= dateFilter.startDate && d <= dateFilter.endDate;
    return true;
  });

  const totalSales = filtered.reduce((acc, o) => acc + (Number(o.totalAmount) || 0), 0);

  return buildResult(
    html,
    filename,
    'বিক্রয় ও লাভ স্টেটমেন্ট (Profit Statement)',
    `মোট মেমো: ${filtered.length} টি • সর্বমোট বিক্রয়: ${formatCurrency(totalSales)}`
  );
};

// ----------------------------------------------------------------------
// 7. CASH TRANSFERS REGISTER (ক্যাশ ড্রয়ার ও হ্যান্ডওভার রেজিস্টার)
// ----------------------------------------------------------------------
export const generateCashTransfersPdf = (
  transfers: CashTransfer[],
  filterNameOrProfile?: string | BusinessProfile,
  profileArg?: BusinessProfile
): PdfDocumentResult => {
  const filterName = typeof filterNameOrProfile === 'string' ? filterNameOrProfile : undefined;
  const profile = typeof filterNameOrProfile === 'object' ? filterNameOrProfile : profileArg;
  const filename = `Cash_Transfers_${new Date().toISOString().slice(0, 10)}.pdf`;
  const html = renderCashTransfersHtml(transfers, filterName, profile);
  const totalAmt = transfers.reduce((acc, t) => acc + (t.amount || 0), 0);
  return buildResult(
    html,
    filename,
    'ক্যাশ ড্রয়ার ট্রান্সফার রেজিস্টার',
    `মোট এন্ট্রি: ${transfers.length} টি • মোট স্থানান্তরিত ক্যাশ: ${formatCurrency(totalAmt)}`
  );
};

// ----------------------------------------------------------------------
// 8. STOCK & INVENTORY VALUATION (ইনভেন্টরি মজুদ ও স্টক মূল্য)
// ----------------------------------------------------------------------
export const generateStockStatementPdf = (products: Product[], profile?: BusinessProfile): PdfDocumentResult => {
  const filename = `Inventory_Stock_Valuation_${new Date().toISOString().slice(0, 10)}.pdf`;
  const html = renderStockStatementHtml(products, profile);
  const totalCost = products.reduce((acc, p) => acc + (p.stockQuantity || 0) * (p.costPrice || 0), 0);
  return buildResult(
    html,
    filename,
    'ইনভেন্টরি মজুদ ও স্টক ভ্যালুয়েশন',
    `মোট আইটেম: ${products.length} টি • মোট স্টক ইনভেস্টমেন্ট: ${formatCurrency(totalCost)}`
  );
};

// ----------------------------------------------------------------------
// 9. CAPITAL STATEMENT & BALANCE SHEET (ব্যালেন্স শিট ও মূলধন হিসাব)
// ----------------------------------------------------------------------
export const generateCapitalStatementPdf = (
  capitalTransactions: CapitalTransaction[],
  balances: {
    adminCash: number;
    counterCash: number;
    dsrCash: number;
    bankCash: number;
    inventoryValuation?: number;
    receivables?: number;
    totalReceivables?: number;
    payables?: number;
    totalPayables?: number;
    stockValue?: number;
  },
  profile?: BusinessProfile
): PdfDocumentResult => {
  const filename = `Depot_Balance_Sheet_${new Date().toISOString().slice(0, 10)}.pdf`;
  const safeBalances = {
    adminCash: balances.adminCash,
    counterCash: balances.counterCash,
    dsrCash: balances.dsrCash,
    bankCash: balances.bankCash,
    inventoryValuation: balances.inventoryValuation ?? balances.stockValue ?? 0,
    receivables: balances.receivables ?? balances.totalReceivables ?? 0,
    payables: balances.payables ?? balances.totalPayables ?? 0,
  };
  const html = renderCapitalStatementHtml(capitalTransactions, safeBalances, profile);
  const totalAssets =
    safeBalances.adminCash +
    safeBalances.counterCash +
    safeBalances.dsrCash +
    safeBalances.bankCash +
    safeBalances.inventoryValuation +
    safeBalances.receivables;
  const netWorth = totalAssets - safeBalances.payables;
  return buildResult(
    html,
    filename,
    'ডেপো ব্যালেন্স শিট ও মূলধন বিবরণী',
    `মোট সম্পদ: ${formatCurrency(totalAssets)} • নীট মূলধন: ${formatCurrency(netWorth)}`
  );
};

export const generateCashValidationStatementPdf = (
  data: CashValidationStatementData,
  profile?: BusinessProfile
): PdfDocumentResult => {
  const customProfile = profile || getStoredBusinessProfile();
  const html = renderCashValidationStatementHtml(data, customProfile);
  const now = new Date();
  const dateStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  const filename = `Cash_Validation_Statement_${dateStr}.pdf`;

  return buildResult(
    html,
    filename,
    'ক্যাশ ভ্যালিড স্টেটমেন্ট ও আর্থিক স্থিতি',
    `প্রাপ্তি: +${formatCurrency(data.totalCashReceived)} • কোম্পানি পেমেন্ট: -${formatCurrency(data.totalCompanyPayments)} • পাবো: +${formatCurrency(data.totalReceivables)}`
  );
};

// ----------------------------------------------------------------------
// 10. BANK STATEMENT (স্টেট ব্যাংক / ব্যাংক স্টেটমেন্ট)
// ----------------------------------------------------------------------
export const generateBankStatementPdf = (params: {
  bankAccounts?: BankAccount[];
  selectedAccountId?: string;
  orders?: OrderInvoice[];
  supplierLedger?: SupplierLedgerEntry[];
  capitalTransactions?: CapitalTransaction[];
  currentBankBalance?: number;
  dateRange: DateRangeFilter;
  profile?: BusinessProfile;
}): PdfDocumentResult => {
  const {
    bankAccounts = [],
    selectedAccountId = 'ALL',
    orders = [],
    supplierLedger = [],
    capitalTransactions = [],
    currentBankBalance = 0,
    dateRange,
    profile,
  } = params;

  let accountName = 'সকল ব্যাংক ও ডিজিটাল একাউন্ট (Consolidated)';
  let accountNumber = '';
  let bankBranch = '';

  if (selectedAccountId !== 'ALL' && selectedAccountId) {
    const matched = bankAccounts.find((b) => b.id === selectedAccountId);
    if (matched) {
      accountName = matched.bnName || matched.name;
      accountNumber = matched.accountNumber;
      bankBranch = matched.branch || '';
    }
  }

  const allTx: BankStatementTransaction[] = [];

  // 1. Bank Capital Injections / Withdrawals
  capitalTransactions.forEach((tx) => {
    if (tx.account === 'BANK') {
      const isDeposit = tx.type === 'CAPITAL_INJECTION' || tx.type === 'INITIAL_CAPITAL' || tx.type === 'SALES_COLLECTION';
      allTx.push({
        id: tx.id,
        date: tx.date,
        type: isDeposit ? 'DEPOSIT' : 'WITHDRAWAL',
        amount: Math.abs(tx.amount || 0),
        payerName: isDeposit ? 'মালিক / বিনিয়োগকারী' : 'ব্যাংক হিসাব',
        receiverName: isDeposit ? 'ব্যাংক হিসাব (মাতৃছায়া)' : 'মালিক / স্বত্বাধিকারী',
        referenceNo: tx.id.slice(0, 8),
        particulars: tx.bnDescription || tx.description || (isDeposit ? 'ব্যাংক মূলধন বিনিয়োগ' : 'ব্যাংক হতে উত্তোলন'),
      });
    }
  });

  // 2. Orders paid via Bank/MFS
  orders.forEach((o) => {
    const isBankOrDigital =
      o.paymentMethod === 'Bank' ||
      o.paymentMethod === 'bKash / Nagad' ||
      o.paymentMethod === 'Mobile' ||
      o.paymentMethod === 'Card';
    if (isBankOrDigital && (o.paidAmount || 0) > 0) {
      allTx.push({
        id: o.id,
        date: o.date,
        type: 'DEPOSIT',
        amount: o.paidAmount,
        payerName: o.retailerName || o.customerName || 'খুচরা গ্রাহক',
        receiverName: 'ব্যাংক / ডিজিটাল হিসাব',
        referenceNo: o.invoiceNo || o.id.slice(0, 8),
        particulars: `ডিজিটাল/ব্যাংক বিক্রয় আদায় (চালান #${o.invoiceNo || o.id.slice(0, 6)})`,
      });
    }
  });

  // 3. Supplier Payments paid via Bank
  supplierLedger.forEach((entry) => {
    if (entry.type === 'PAYMENT' && entry.paymentMethod && entry.paymentMethod !== 'Cash') {
      allTx.push({
        id: entry.id,
        date: entry.date,
        type: 'WITHDRAWAL',
        amount: Math.abs(entry.amount || 0),
        payerName: 'ব্যাংক হিসাব',
        receiverName: entry.supplierName || 'সাপ্লায়ার / কোম্পানি',
        referenceNo: entry.referenceNo || 'VOUCHER',
        particulars: `কোম্পানি বিল পরিশোধ (${entry.paymentMethod} - ${entry.referenceNo || ''})`,
      });
    }
  });

  // Sort chronological
  allTx.sort((a, b) => (a.date || '').localeCompare(b.date || ''));

  const startDate = dateRange.startDate;
  const endDate = dateRange.endDate;

  const totalAllDeposits = allTx.filter((t) => t.type === 'DEPOSIT').reduce((acc, t) => acc + t.amount, 0);
  const totalAllWithdrawals = allTx.filter((t) => t.type === 'WITHDRAWAL').reduce((acc, t) => acc + t.amount, 0);
  const baseOffset = currentBankBalance - (totalAllDeposits - totalAllWithdrawals);

  const txBefore = startDate ? allTx.filter((t) => (t.date || '').slice(0, 10) < startDate) : [];
  const depositsBefore = txBefore.filter((t) => t.type === 'DEPOSIT').reduce((acc, t) => acc + t.amount, 0);
  const withdrawalsBefore = txBefore.filter((t) => t.type === 'WITHDRAWAL').reduce((acc, t) => acc + t.amount, 0);

  const openingBalance = baseOffset + depositsBefore - withdrawalsBefore;

  const inRangeTx = allTx.filter((t) => {
    const d = (t.date || '').slice(0, 10);
    if (startDate && d < startDate) return false;
    if (endDate && d > endDate) return false;
    return true;
  });

  let running = openingBalance;
  inRangeTx.forEach((tx) => {
    if (tx.type === 'DEPOSIT') {
      running += tx.amount;
    } else {
      running -= tx.amount;
    }
    tx.balanceAfter = running;
  });

  const totalDeposits = inRangeTx.filter((t) => t.type === 'DEPOSIT').reduce((acc, t) => acc + t.amount, 0);
  const totalWithdrawals = inRangeTx.filter((t) => t.type === 'WITHDRAWAL').reduce((acc, t) => acc + t.amount, 0);
  const closingBalance = running;

  const statementData: BankStatementData = {
    accountName,
    accountNumber,
    bankBranch,
    openingBalance,
    totalDeposits,
    totalWithdrawals,
    closingBalance,
    dateRange,
    transactions: inRangeTx,
  };

  const html = renderBankStatementHtml(statementData, profile);
  const dateStr = new Date().toISOString().slice(0, 10);
  const filename = `Bank_Statement_${accountNumber || 'All'}_${dateRange.startDate || 'start'}_to_${dateRange.endDate || dateStr}.pdf`;

  return buildResult(
    html,
    filename,
    'অফিশিয়াল ব্যাংক স্টেটমেন্ট',
    `${accountName} • সময়কাল: ${dateRange.label || 'সকল সময়'} • সমাপনী ব্যালেন্স: ${formatCurrency(closingBalance)}`
  );
};

// ----------------------------------------------------------------------
// 11. CASH DRAWER STATEMENT (এডমিন, কাউন্টার, ডিএসআর ক্যাশ)
// ----------------------------------------------------------------------
export const computeCashDrawerStatementData = (params: {
  drawerRole: 'admin' | 'counter' | 'dsr';
  drawerTitleBn?: string;
  drawerTitleEn?: string;
  custodianName?: string;
  selectedUserId?: string;
  orders?: OrderInvoice[];
  cashTransfers?: CashTransfer[];
  supplierLedger?: SupplierLedgerEntry[];
  suppliers?: Supplier[];
  capitalTransactions?: CapitalTransaction[];
  currentBalance?: number;
  users?: UserProfile[];
  expenses?: Expense[];
  dateRange: DateRangeFilter;
}): CashDrawerStatementData => {
  const {
    drawerRole,
    selectedUserId,
    orders = [],
    cashTransfers = [],
    supplierLedger = [],
    suppliers = [],
    capitalTransactions = [],
    currentBalance = 0,
    users = [],
    expenses = [],
    dateRange,
  } = params;

  let drawerTitleBn = params.drawerTitleBn;
  let drawerTitleEn = params.drawerTitleEn;
  let custodianName = params.custodianName;

  if (drawerRole === 'admin') {
    drawerTitleBn = drawerTitleBn || 'এডমিন মূল ক্যাশ ভল্ট স্টেটমেন্ট';
    drawerTitleEn = drawerTitleEn || 'Admin Main Cash Vault Statement & Audit';
    custodianName = custodianName || 'এডমিন / প্রোপ্রাইটর';
  } else if (drawerRole === 'counter') {
    drawerTitleBn = drawerTitleBn || 'ক্যাশ কাউন্টার ড্রয়ার স্টেটমেন্ট';
    drawerTitleEn = drawerTitleEn || 'POS Cash Counter Drawer Daily Statement';
    custodianName = custodianName || 'কাউন্টার ক্যাশিয়ার';
  } else {
    const dsrUser = selectedUserId ? users.find((u) => u.id === selectedUserId) : null;
    drawerTitleBn = dsrUser
      ? `ডিএসআর ফিল্ড ক্যাশ স্টেটমেন্ট (${dsrUser.bnName || dsrUser.name})`
      : 'ডিএসআর ফিল্ড কালেকশন ক্যাশ স্টেটমেন্ট (একত্রিত)';
    drawerTitleEn = drawerTitleEn || 'DSR Field Sales & Cash Collection Statement';
    custodianName = dsrUser ? dsrUser.bnName || dsrUser.name : 'ফিল্ড সেলস অফিসার (DSR)';
  }

  const allTx: CashDrawerTransaction[] = [];

  if (drawerRole === 'admin') {
    // ADMIN CASH FLOW:
    // Inflow: transfers to admin
    cashTransfers.forEach((t) => {
      if (t.toRole === 'admin' && t.status === 'ACCEPTED') {
        const fromRoleLabel = t.fromRole === 'counter' ? 'ক্যাশ কাউন্টার' : 'ডিএসআর ফিল্ড';
        allTx.push({
          id: t.id,
          date: t.acceptedAt || t.createdAt,
          type: 'INFLOW',
          amount: t.amount,
          payerName: `${t.fromUserName} (${fromRoleLabel})`,
          receiverName: t.toUserName || 'এডমিন ভল্ট',
          referenceNo: t.transferNo,
          particulars: `ভল্টে ক্যাশ জমা (${t.notes || 'হস্তান্তর গ্রহণ'})`,
          sourceOrCategory: 'TRANSFER_IN',
        });
      }
    });

    // Inflow: Admin direct POS / memo cash sales
    orders.forEach((o) => {
      const isCash = !o.paymentMethod || o.paymentMethod === 'Cash' || o.paymentMethod === 'নগদ';
      const isAdminOrder = o.creatorRole === 'admin' || o.salesPersonRole === 'admin';
      if (isCash && isAdminOrder && (o.paidAmount || 0) > 0) {
        allTx.push({
          id: o.id,
          date: o.date || (o as any).createdAt,
          type: 'INFLOW',
          amount: o.paidAmount,
          payerName: o.retailerName || o.customerName || 'খুচরা ক্রেতা',
          receiverName: o.creatorName || 'এডমিন / স্বত্বাধিকারী',
          referenceNo: o.invoiceNo || o.id.slice(0, 8),
          particulars: `এডমিন সরাসরি নগদ বিক্রয় (চালান #${o.invoiceNo || o.id.slice(0, 6)})`,
          sourceOrCategory: 'ADMIN_SALE',
        });
      }
    });

    // Inflow: cash capital injections
    capitalTransactions.forEach((tx) => {
      if (tx.account === 'CASH_DRAWER' && (tx.type === 'CAPITAL_INJECTION' || tx.type === 'INITIAL_CAPITAL')) {
        allTx.push({
          id: tx.id,
          date: tx.date,
          type: 'INFLOW',
          amount: Math.abs(tx.amount || 0),
          payerName: 'মালিক / বিনিয়োগকারী',
          receiverName: 'এডমিন ক্যাশ ভল্ট',
          referenceNo: tx.id.slice(0, 8),
          particulars: tx.bnDescription || tx.description || 'মূলধন বিনিয়োগ জমা',
          sourceOrCategory: 'CAPITAL',
        });
      }
    });

    // Outflow: ALL company / supplier payments (নগদ, ব্যাংক, বিকাশ, চেক ও সকল কোম্পানির পরিশোধ)
    const recordedPaidPerSupplier = new Map<string, number>();

    supplierLedger.forEach((entry) => {
      if (entry.type === 'PAYMENT') {
        const amt = Math.abs(entry.amount || 0);
        if (amt > 0) {
          const sKey = (entry.supplierId || entry.supplierName || '').trim().toLowerCase();
          recordedPaidPerSupplier.set(sKey, (recordedPaidPerSupplier.get(sKey) || 0) + amt);

          const methodSuffix = entry.paymentMethod && entry.paymentMethod !== 'Cash'
            ? ` [${entry.paymentMethod}]`
            : '';
          allTx.push({
            id: entry.id,
            date: entry.date,
            type: 'OUTFLOW',
            amount: amt,
            payerName: 'এডমিন ক্যাশ ভল্ট',
            receiverName: entry.supplierName || 'কোম্পানি / সরবরাহকারী',
            referenceNo: entry.referenceNo || 'VOUCHER',
            particulars: `কোম্পানি চালান পরিশোধ${methodSuffix} (${entry.referenceNo || 'ভাউচার বিল'})`,
            sourceOrCategory: 'SUPPLIER_PAYMENT',
          });
        }
      }
    });

    // Also include any supplier payments recorded on supplier profiles (s.totalPaid) that haven't been accounted for
    if (suppliers && suppliers.length > 0) {
      suppliers.forEach((s) => {
        const sTotalPaid = Number(s.totalPaid) || 0;
        if (sTotalPaid > 0) {
          const idKey = (s.id || '').trim().toLowerCase();
          const nameKey = (s.name || '').trim().toLowerCase();
          const compKey = (s.company || '').trim().toLowerCase();

          const alreadyRecorded =
            (recordedPaidPerSupplier.get(idKey) || 0) +
            (nameKey && nameKey !== idKey ? (recordedPaidPerSupplier.get(nameKey) || 0) : 0) +
            (compKey && compKey !== idKey && compKey !== nameKey ? (recordedPaidPerSupplier.get(compKey) || 0) : 0);

          const unrecordedDiff = Math.max(0, sTotalPaid - alreadyRecorded);
          if (unrecordedDiff > 0) {
            allTx.push({
              id: `pay_supplier_${s.id}`,
              date: (s as any).openingDate || new Date().toISOString().slice(0, 10),
              type: 'OUTFLOW',
              amount: unrecordedDiff,
              payerName: 'এডমিন ক্যাশ ভল্ট',
              receiverName: s.bnName || s.name || s.company || 'কোম্পানি / সরবরাহকারী',
              referenceNo: 'BILL-PAY',
              particulars: `কোম্পানি বিল পরিশোধ (${s.bnName || s.company || s.name})`,
              sourceOrCategory: 'SUPPLIER_PAYMENT',
            });
          }
        }
      });
    }

    // Outflow: owner withdrawals
    capitalTransactions.forEach((tx) => {
      if (tx.account === 'CASH_DRAWER' && (tx.type === 'OWNER_WITHDRAWAL' || tx.type === 'EXPENSE')) {
        allTx.push({
          id: tx.id,
          date: tx.date,
          type: 'OUTFLOW',
          amount: Math.abs(tx.amount || 0),
          payerName: 'এডমিন ক্যাশ ভল্ট',
          receiverName: 'মালিক / স্বত্বাধিকারী',
          referenceNo: tx.id.slice(0, 8),
          particulars: tx.bnDescription || tx.description || 'মালিকের ব্যক্তিগত উত্তোলন / খরচ',
          sourceOrCategory: 'WITHDRAWAL',
        });
      }
    });

    // Outflow: transfers sent from admin
    cashTransfers.forEach((t) => {
      if (t.fromRole === 'admin' && t.status === 'ACCEPTED') {
        const toRoleLabel = t.toRole === 'counter' ? 'ক্যাশ কাউন্টার' : 'ডিএসআর';
        allTx.push({
          id: t.id,
          date: t.acceptedAt || t.createdAt,
          type: 'OUTFLOW',
          amount: t.amount,
          payerName: t.fromUserName || 'এডমিন ভল্ট',
          receiverName: `${t.toUserName} (${toRoleLabel})`,
          referenceNo: t.transferNo,
          particulars: `কাউন্টার/ডিএসআর-এ ক্যাশ প্রদান (${t.notes || 'হস্তান্তর'})`,
          sourceOrCategory: 'TRANSFER_OUT',
        });
      }
    });
  } else if (drawerRole === 'counter') {
    // COUNTER CASH FLOW:
    // Inflow: POS cash sales
    orders.forEach((o) => {
      const isCash = !o.paymentMethod || o.paymentMethod === 'Cash' || o.paymentMethod === 'নগদ';
      const isCounterOrder = o.creatorRole !== 'dsr' && o.salesPersonRole !== 'dsr' && o.creatorRole !== 'admin' && o.salesPersonRole !== 'admin';
      if (isCash && isCounterOrder && (o.paidAmount || 0) > 0) {
        allTx.push({
          id: o.id,
          date: o.date || (o as any).createdAt,
          type: 'INFLOW',
          amount: o.paidAmount,
          payerName: o.retailerName || o.customerName || 'গ্রাহক',
          receiverName: o.creatorName || 'কাউন্টার ক্যাশিয়ার',
          referenceNo: o.invoiceNo || o.id.slice(0, 8),
          particulars: `কাউন্টার নগদ বিক্রয় (চালান #${o.invoiceNo || o.id.slice(0, 6)})`,
          sourceOrCategory: 'POS_SALE',
        });
      }
    });

    // Inflow: transfers received into counter (strictly when accepted)
    cashTransfers.forEach((t) => {
      const isCounterTo = t.toRole === 'counter' || (t.toUserName || '').toLowerCase().includes('counter') || (t.toUserName || '').toLowerCase().includes('কাউন্টার');
      if (isCounterTo && t.status === 'ACCEPTED') {
        const fromRoleLabel = t.fromRole === 'dsr' ? 'ডিএসআর ফিল্ড' : 'এডমিন';
        allTx.push({
          id: t.id,
          date: t.acceptedAt || t.createdAt,
          type: 'INFLOW',
          amount: t.amount,
          payerName: `${t.fromUserName} (${fromRoleLabel})`,
          receiverName: t.toUserName || 'কাউন্টার ক্যাশিয়ার',
          referenceNo: t.transferNo,
          particulars: `কাউন্টারে ক্যাশ জমা (${t.notes || 'হস্তান্তর গ্রহণ'})`,
          sourceOrCategory: 'TRANSFER_IN',
        });
      }
    });

    // Outflow: transfers sent from counter (e.g. to admin vault)
    cashTransfers.forEach((t) => {
      if (t.fromRole === 'counter' && t.status === 'ACCEPTED') {
        const toRoleLabel = t.toRole === 'admin' ? 'এডমিন ভল্ট' : 'ডিএসআর';
        allTx.push({
          id: t.id,
          date: t.acceptedAt || t.createdAt,
          type: 'OUTFLOW',
          amount: t.amount,
          payerName: t.fromUserName || 'কাউন্টার ক্যাশিয়ার',
          receiverName: `${t.toUserName} (${toRoleLabel})`,
          referenceNo: t.transferNo,
          particulars: `এডমিন ভল্টে ক্যাশ হস্তান্তর (${t.notes || 'জমা প্রদান'})`,
          sourceOrCategory: 'TRANSFER_OUT',
        });
      }
    });

    // Outflow: Expenses paid from Cash Counter drawer (বেতন, দোকান ভাড়া, বিদ্যুৎ বিল, অন্যান্য খরচ)
    expenses.forEach((exp) => {
      if (!exp.paymentSource || exp.paymentSource === 'CASH_DRAWER') {
        const catBn =
          exp.categoryBn ||
          (exp.category === 'SALARY'
            ? 'বেতন'
            : exp.category === 'SHOP_RENT'
            ? 'দোকান ভাড়া'
            : exp.category === 'ELECTRICITY_BILL'
            ? 'বিদ্যুৎ বিল'
            : 'অন্যান্য খরচ');
        allTx.push({
          id: exp.id,
          date: exp.date || exp.createdAt || new Date().toISOString(),
          type: 'OUTFLOW',
          amount: Number(exp.amount) || 0,
          payerName: exp.createdByName || 'কাউন্টার ক্যাশিয়ার',
          receiverName: exp.recipientName || catBn,
          referenceNo: exp.id.slice(-6).toUpperCase(),
          particulars: `${catBn}: ${exp.title || ''}${exp.notes ? ` (${exp.notes})` : ''}`,
          sourceOrCategory: 'EXPENSE',
        });
      }
    });
  } else {
    // DSR CASH FLOW:
    const dsrUser = selectedUserId ? users.find((u) => u.id === selectedUserId) : null;
    const uName = (dsrUser?.name || '').toLowerCase();
    const uBnName = (dsrUser?.bnName || '').toLowerCase();
    const uNotes = (dsrUser?.notes || '').toLowerCase();

    // Inflow: Field order collections
    orders.forEach((o) => {
      const creatorRole = (o.creatorRole || o.salesPersonRole || '').toLowerCase();
      const creatorName = (o.creatorName || o.salesPersonName || '').toLowerCase();
      const creatorId = (o as any).creatorId || (o as any).salesPersonId || '';

      const isDsr =
        creatorRole === 'dsr' ||
        creatorName.includes('dsr') ||
        creatorName.includes('ডিএসআর') ||
        creatorName.includes('razo') ||
        creatorName.includes('raju') ||
        creatorName.includes('রাজু');

      let matchesUser = true;
      if (selectedUserId && dsrUser) {
        matchesUser =
          creatorId === dsrUser.id ||
          creatorName === uName ||
          (uName && creatorName.includes(uName)) ||
          (uBnName && creatorName.includes(uBnName)) ||
          (uNotes && creatorName.includes(uNotes)) ||
          creatorName.includes('razo') ||
          creatorName.includes('raju') ||
          creatorName.includes('রাজু') ||
          (creatorRole === 'dsr' && !users.some((u) => u.role === 'dsr' && u.id !== dsrUser.id));
      }

      const isCash = !o.paymentMethod || o.paymentMethod === 'Cash' || o.paymentMethod === 'নগদ' || (o as any).paymentType === 'CASH';
      const paid = Number(o.paidAmount) || (isCash ? Number(o.totalAmount) : 0);

      if (isDsr && matchesUser && paid > 0) {
        allTx.push({
          id: o.id,
          date: o.date || (o as any).createdAt,
          type: 'INFLOW',
          amount: paid,
          payerName: o.retailerName || o.customerName || 'খুচরা দোকানদার',
          receiverName: o.salesPersonName || o.creatorName || (dsrUser ? (dsrUser.bnName || dsrUser.name) : 'রাজু আলম (ডিএসআর)'),
          referenceNo: o.invoiceNo || o.id.slice(0, 8),
          particulars: `ফিল্ড ক্যাশ আদায় (মেমো #${o.invoiceNo || o.id.slice(0, 6)})`,
          sourceOrCategory: 'FIELD_COLLECTION',
        });
      }
    });

    // Inflow: transfers received by DSR
    cashTransfers.forEach((t) => {
      const toRole = (t.toRole || '').toLowerCase();
      const toName = (t.toUserName || '').toLowerCase();
      const isDsrTo =
        toRole === 'dsr' ||
        toName.includes('dsr') ||
        toName.includes('ডিএসআর') ||
        toName.includes('razo') ||
        toName.includes('raju') ||
        toName.includes('রাজু');

      let matchesUser = true;
      if (selectedUserId && dsrUser) {
        matchesUser =
          t.toUserId === dsrUser.id ||
          toName.includes(uName) ||
          (uBnName && toName.includes(uBnName)) ||
          toName.includes('razo') ||
          toName.includes('raju') ||
          toName.includes('রাজু') ||
          (toRole === 'dsr' && !users.some((u) => u.role === 'dsr' && u.id !== dsrUser.id));
      }

      if (isDsrTo && matchesUser && t.status !== 'REJECTED') {
        allTx.push({
          id: t.id,
          date: t.acceptedAt || t.createdAt,
          type: 'INFLOW',
          amount: Number(t.amount) || 0,
          payerName: `${t.fromUserName} (${t.fromRole === 'admin' ? 'এডমিন' : 'কাউন্টার'})`,
          receiverName: t.toUserName || (dsrUser ? (dsrUser.bnName || dsrUser.name) : 'ডিএসআর'),
          referenceNo: t.transferNo,
          particulars: `ডিএসআর ক্যাশ গ্রহণ (${t.status === 'PENDING' ? 'অপেক্ষমান - ' : ''}${t.notes || 'হস্তান্তর'})`,
          sourceOrCategory: 'TRANSFER_IN',
        });
      }
    });

    // Outflow: transfers sent by DSR (to counter or admin)
    cashTransfers.forEach((t) => {
      const fromRole = (t.fromRole || '').toLowerCase();
      const fromName = (t.fromUserName || '').toLowerCase();
      const isDsrFrom =
        fromRole === 'dsr' ||
        fromName.includes('dsr') ||
        fromName.includes('ডিএসআর') ||
        fromName.includes('razo') ||
        fromName.includes('raju') ||
        fromName.includes('রাজু');

      let matchesUser = true;
      if (selectedUserId && dsrUser) {
        matchesUser =
          t.fromUserId === dsrUser.id ||
          fromName.includes(uName) ||
          (uBnName && fromName.includes(uBnName)) ||
          fromName.includes('razo') ||
          fromName.includes('raju') ||
          fromName.includes('রাজু') ||
          (fromRole === 'dsr' && !users.some((u) => u.role === 'dsr' && u.id !== dsrUser.id));
      }

      if (isDsrFrom && matchesUser && t.status !== 'REJECTED') {
        const toRole = (t.toRole || '').toLowerCase();
        const toLabel = toRole === 'counter' ? 'ক্যাশ কাউন্টার' : 'এডমিন ভল্ট';
        allTx.push({
          id: t.id,
          date: t.acceptedAt || t.createdAt,
          type: 'OUTFLOW',
          amount: Number(t.amount) || 0,
          payerName: t.fromUserName || (dsrUser ? (dsrUser.bnName || dsrUser.name) : 'রাজু আলম (ডিএসআর)'),
          receiverName: `${t.toUserName || toLabel} (${toLabel})`,
          referenceNo: t.transferNo,
          particulars: `${toLabel}-এ ক্যাশ হস্তান্তর (${t.status === 'PENDING' ? 'অপেক্ষমান - ' : ''}${t.notes || 'হস্তান্তর'})`,
          sourceOrCategory: 'TRANSFER_OUT',
        });
      }
    });
  }

  // Helper to normalize date string to YYYY-MM-DD
  const normalizeDateKey = (raw: string | undefined): string => {
    if (!raw) return '';
    const clean = raw.trim().slice(0, 10);
    const parts = clean.split(/[-/]/);
    if (parts.length === 3) {
      if (parts[0].length === 4) {
        return `${parts[0]}-${parts[1].padStart(2, '0')}-${parts[2].padStart(2, '0')}`;
      } else if (parts[2].length === 4) {
        return `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
      }
    }
    return clean;
  };

  // Sort chronological
  allTx.sort((a, b) => (a.date || '').localeCompare(b.date || ''));

  const startDate = dateRange.startDate;
  const endDate = dateRange.endDate;

  const totalAllIn = allTx.filter((t) => t.type === 'INFLOW').reduce((acc, t) => acc + t.amount, 0);
  const totalAllOut = allTx.filter((t) => t.type === 'OUTFLOW').reduce((acc, t) => acc + t.amount, 0);
  const baseOffset = currentBalance - (totalAllIn - totalAllOut);

  const txBefore = startDate ? allTx.filter((t) => normalizeDateKey(t.date) < startDate) : [];
  const inBefore = txBefore.filter((t) => t.type === 'INFLOW').reduce((acc, t) => acc + t.amount, 0);
  const outBefore = txBefore.filter((t) => t.type === 'OUTFLOW').reduce((acc, t) => acc + t.amount, 0);

  const openingBalance = baseOffset + inBefore - outBefore;

  const inRangeTx = allTx.filter((t) => {
    const d = normalizeDateKey(t.date);
    if (startDate && d && d < startDate) return false;
    if (endDate && d && d > endDate) return false;
    return true;
  });

  let running = openingBalance;
  inRangeTx.forEach((tx) => {
    if (tx.type === 'INFLOW') {
      running += tx.amount;
    } else {
      running -= tx.amount;
    }
    tx.balanceAfter = running;
  });

  const totalInflow = inRangeTx.filter((t) => t.type === 'INFLOW').reduce((acc, t) => acc + t.amount, 0);
  const totalOutflow = inRangeTx.filter((t) => t.type === 'OUTFLOW').reduce((acc, t) => acc + t.amount, 0);
  const closingBalance = running;

  return {
    drawerRole,
    drawerTitleBn,
    drawerTitleEn,
    custodianName,
    openingBalance,
    totalInflow,
    totalOutflow,
    closingBalance,
    dateRange,
    transactions: inRangeTx,
  };
};

export const generateCashDrawerStatementPdf = (params: {
  drawerRole: 'admin' | 'counter' | 'dsr';
  drawerTitleBn?: string;
  drawerTitleEn?: string;
  custodianName?: string;
  selectedUserId?: string;
  orders?: OrderInvoice[];
  cashTransfers?: CashTransfer[];
  supplierLedger?: SupplierLedgerEntry[];
  suppliers?: Supplier[];
  capitalTransactions?: CapitalTransaction[];
  currentBalance?: number;
  users?: UserProfile[];
  expenses?: Expense[];
  dateRange: DateRangeFilter;
  profile?: BusinessProfile;
}): PdfDocumentResult => {
  const statementData = computeCashDrawerStatementData(params);
  const { drawerRole, drawerTitleBn, dateRange } = statementData;
  const html = renderCashDrawerStatementHtml(statementData, params.profile);
  const dateStr = new Date().toISOString().slice(0, 10);
  const filename = `${drawerRole.toUpperCase()}_Cash_Statement_${dateRange.startDate || 'start'}_to_${dateRange.endDate || dateStr}.pdf`;

  return buildResult(
    html,
    filename,
    drawerTitleBn,
    `দায়িত্বপ্রাপ্ত: ${statementData.custodianName || 'ক্যাশিয়ার'} • সময়কাল: ${dateRange.label || 'সকল সময়'} • সমাপনী ক্যাশ: ${formatCurrency(statementData.closingBalance)}`
  );
};

// ----------------------------------------------------------------------
// Backward Compatibility Direct Export Functions
// ----------------------------------------------------------------------
export const exportSupplierLedgerToPdf = (supplier: Supplier, entries: SupplierLedgerEntry[]): void => {
  generateSupplierLedgerPdf(supplier, entries).download();
};

export const exportAllSuppliersSummaryPdf = (suppliers: Supplier[]): void => {
  generateAllSuppliersSummaryPdf(suppliers).download();
};

export const exportCashTransfersToPdf = (transfers: CashTransfer[], filterName?: string): void => {
  generateCashTransfersPdf(transfers, filterName).download();
};

