import { Language } from '../types';

export const translations = {
  en: {
    appName: "Matrichaya Telecom",
    appSubtitle: "Wholesale & Telecom Distribution ERP",
    switchRole: "Switch Role",
    activeRole: "Current Role",
    admin: "Admin (Owner)",
    counter: "Counter Sales",
    dsr: "DSR (Field Rep)",
    retailer: "Retailer (Client)",
    langToggle: "বাংলা",
    
    // Bottom Nav Tabs
    tabDashboard: "Dashboard",
    tabPOS: "Billing / POS",
    tabTransfers: "Cash Logs",
    tabSuppliers: "Suppliers",
    tabCapital: "Capital",
    tabReplacements: "Damages",
    tabCatalog: "Catalog",
    tabOrders: "Orders",
    tabRetailers: "Retailers",
    dashboard: "Dashboard",
    pos: "Billing / POS",
    cashTransfers: "Cash Logs",
    suppliers: "Suppliers",
    capitalTracking: "Capital",
    replacements: "Damages",
    retailerPortal: "Retailer Portal",
    
    // Common Actions
    save: "Save",
    cancel: "Cancel",
    confirm: "Confirm",
    close: "Close",
    lockNow: "Lock App",
    posTitle: "Point of Sale (POS)",
    posSubtitle: "Create invoices and billing",
    wholesalePrice: "Wholesale Price",
    inStock: "In Stock",
    cartTitle: "Cart",
    cartEmpty: "Cart is empty",
    cash: "Cash",
    credit: "Credit",
    delete: "Delete",
    edit: "Edit",
    add: "Add New",
    search: "Search...",
    filter: "Filter",
    status: "Status",
    date: "Date",
    amount: "Amount",
    action: "Action",
    details: "Details",
    print: "Print Memo",
    download: "Download",
    refresh: "Refresh",
    scanAI: "Scan Invoice (AI)",
    importPhonebook: "Phonebook",
    accept: "Accept Cash",
    reject: "Reject",
    pending: "Pending",
    accepted: "Accepted",
    rejected: "Rejected",
    all: "All",
    total: "Total",
    subtotal: "Subtotal",
    discount: "Discount",
    grandTotal: "Grand Total",
    paid: "Paid",
    due: "Due",
    partial: "Partial",
    products: "Products",
    searchProduct: "Search Product...",
    confirmSale: "Confirm Sale",
    paymentMethod: "Payment Method",
    notes: "Notes / Remarks",
    
    // AI Receipt Scanner
    aiScannerTitle: "AI Invoice & Receipt Scanner",
    aiScannerSubtitle: "Powered by Gemini Flash to auto-extract company & stock items",
    dropPhotoHere: "Take photo or upload supplier invoice bill",
    useCamera: "Use Camera",
    uploadFile: "Upload Image",
    sampleInvoice: "Load Sample Supplier Invoice",
    scanningReceipt: "Gemini Flash is analyzing the invoice...",
    extractSuccess: "Invoice items and supplier details extracted successfully!",
    companyDetected: "Supplier / Company",
    invoiceNoDetected: "Invoice / Memo #",
    extractedStockItems: "Extracted Stock & Products",
    itemColName: "Product Name",
    itemColQty: "Qty",
    itemColUnit: "Unit",
    itemColCost: "Cost (Buy)",
    itemColRetail: "Wholesale (Sell)",
    itemColTotal: "Line Total",
    addToInventoryAndLedger: "Add to Inventory & Update Supplier Ledger",
    
    // Phonebook Integration
    phonebookTitle: "Phonebook Contact Selection",
    phonebookSubtitle: "Import and link retailers directly from device contacts",
    openNativePicker: "Pick from Device Phonebook",
    searchPhonebook: "Search phone contacts...",
    contactsFound: "contacts available",
    createRetailerFromContact: "Register as Retailer",
    contactSelected: "Contact selected from phonebook",
    
    // Cash Transfer Log
    cashTransferTitle: "Cash Transfer Ledger",
    transfersTitle: "Cash Transfers",
    cashTransferSubtitle: "Inter-role cash handovers (DSR ➔ Counter ➔ Admin)",
    transfersSubtitle: "Inter-role cash handovers (DSR ➔ Counter ➔ Admin)",
    searchTransfersPlaceholder: "Search by amount (৳), date, sender, or receiver...",
    newCashTransfer: "Send Cash Transfer",
    sendCashBtn: "Send Cash",
    fromUser: "From",
    toUser: "To",
    transferStatusPending: "Pending Approval",
    transferStatusAccepted: "Cash Received & Verified",
    transferStatusRejected: "Transfer Declined",
    acceptCashBtn: "Accept & Deposit",
    acceptCashConfirm: "Are you sure you received this exact cash amount?",
    cashDrawerBalance: "Current Cash in Drawer / Pocket",
    notesBreakdown: "Denomination Notes Breakdown",
    
    // Supplier Ledger
    supplierLedgerTitle: "Supplier Ledger & Payables",
    supplierLedgerSubtitle: "Track supplier purchases, payments, and balance adjustments",
    searchLedgerPlaceholder: "Search entries by amount (৳), date, ref #, or notes...",
    searchAllLedgerPlaceholder: "Search all transactions by amount, date, supplier, or memo...",
    addNewSupplier: "Add Supplier",
    totalPayableToSuppliers: "Total Supplier Due (Payable)",
    totalPurchasesDone: "Total Purchases",
    makePayment: "Pay Supplier",
    viewLedgerHistory: "View Statement",
    transactionType: "Entry Type",
    balanceAfter: "Balance After",
    purchaseInvoice: "Purchase Invoice",
    paymentVoucher: "Payment Voucher",
    returnAdjustment: "Damage/Return Adjustment",
    
    // Admin Capital Tracking
    capitalTrackingTitle: "Admin Capital & Net Worth",
    capitalTrackingSubtitle: "Track business investments, liquid cash, stock valuation & net equity",
    totalNetWorth: "Total Business Net Worth",
    netWorth: "Total Business Net Worth",
    totalCapitalInjected: "Invested Capital",
    initialCapital: "Invested Capital",
    liquidCashBalance: "Total Liquid Cash",
    liquidCash: "Total Liquid Cash",
    cashInCounter: "Cash in Counter Drawer",
    cashWithDSR: "Cash with Field DSRs",
    cashInBank: "Cash in Bank / Mobile Wallet",
    inventoryValuation: "Stock Valuation (Cost)",
    totalInventoryValuation: "Stock Valuation (Cost)",
    accountsReceivable: "Receivables (Retailer Dues)",
    totalRetailerReceivable: "Receivables (Retailer Dues)",
    accountsPayable: "Payables (Supplier Dues)",
    injectCapital: "Inject Capital",
    withdrawCapital: "Owner Withdrawal",
    
    // Product Replacement / Damage Adjustments
    replacementTitle: "Damage & Replacement Adjustments",
    replacementSubtitle: "Manage replacement claims for Retailers and Supplier returns",
    retailerClaims: "Retailer Customer Returns",
    supplierClaims: "Supplier Vendor Returns",
    newClaim: "Submit Replacement Claim",
    claimReason: "Return Reason",
    reasonExpired: "Expired Stock",
    reasonDamaged: "Damaged Packaging",
    reasonDefect: "Manufacturing Defect",
    reasonBroken: "Leakage / Broken",
    resolutionType: "Resolution Type",
    resReplaceItem: "Dispatch Fresh Item Replacement",
    resCreditDeduct: "Credit Adjustment on Ledger",
    approveClaim: "Approve Replacement",
    markDispatched: "Mark as Replaced & Dispatched",
    markCredited: "Apply Ledger Credit Note",
    
    // Roles description
    roleAdminDesc: "Full administrative visibility, capital tracking, supplier settlement, and approvals.",
    roleCounterDesc: "Speed billing POS, register cash collections, receive field DSR transfers.",
    roleDSRDesc: "Field order booking with phonebook retailers, daily route collections, handover cash.",
    roleRetailerDesc: "Browse wholesale pricing, check outstanding ledger balance, order stock & submit damage claims.",

    // Offline Firestore Persistence
    offlineMode: "Offline Mode",
    onlineMode: "Online Connected",
    offlinePersistenceActive: "Offline Persistence Active",
    offlineSyncDesc: "All dashboard metrics & pending cash transfers are stored in persistent local cache and accessible offline.",
    pendingTransfersOfflineReady: "Pending Cash Transfers are available offline",
    offlineNotice: "Internet connection interrupted. Operating securely in offline cache mode.",
    simulateOfflineBtn: "Simulate Offline",
    simulateOnlineBtn: "Go Online",
    cachedDataBadge: "Offline Cached",
    connectivityToastOnlineTitle: "Back Online",
    connectivityToastOnlineMsg: "Internet connection restored. Transactions and offline changes are synced with the cloud.",
    connectivityToastOfflineTitle: "You are Offline",
    connectivityToastOfflineMsg: "No internet connection detected. Operating in offline mode with secure local caching.",
    connectivityDismiss: "Dismiss",
    connectivitySyncing: "Syncing data with cloud...",
    connectivitySyncComplete: "All records synced",
    connectivitySimulateBtn: "Simulate Offline Mode",
    connectivityCheckBtn: "Check Connectivity",

    // Biometric Authentication & Secure Storage Bridge
    biometricTitle: "Biometric Authentication",
    biometricProtected: "Biometric Protected",
    biometricLockNotice: "Authentication Required",
    touchSensorPrompt: "Touch Fingerprint Sensor or Scan Face",
    adminVaultLocked: "Executive Admin Vault Locked",
    counterVaultLocked: "Cashier Sales Drawer Locked",
    biometricSubtext: "Verify your identity via platform biometric sensor (Fingerprint / Face ID) or enter fallback PIN.",
    useFallbackPin: "Use Fallback PIN",
    useBiometrics: "Use Fingerprint / Face Unlock",
    enterSecurityPin: "Enter 4-Digit Security PIN",
    defaultPinHint: "Default security PIN is 1234",
    invalidPinError: "Incorrect PIN. Please try again.",
    biometricScanSuccess: "Identity Verified Successfully",
    biometricScanFailed: "Biometric scan failed or cancelled. Try PIN.",
    lockDashboardNow: "Lock Session",
    unlockDashboard: "Unlock Dashboard",
    securitySettings: "Biometric & Security Settings",
    enableBiometrics: "Enable Biometric Protection",
    biometricStatusActive: "Hardware Sensor & WebAuthn Active",
    biometricStatusBridge: "Cryptographic Secure Storage Active",
    autoLockTimer: "Auto-Lock Timeout",
    autoLockImmediate: "Immediately on role switch",
    autoLock1Min: "1 Minute Inactivity",
    autoLock5Min: "5 Minutes Inactivity",
    autoLock15Min: "15 Minutes Inactivity",
    autoLockNever: "Manual Lock Only",
    changePin: "Change Security PIN",
    currentPin: "Current PIN",
    newPin: "New 4-Digit PIN",
    confirmNewPin: "Confirm New PIN",
    pinChangedSuccess: "Security PIN updated successfully",
    enrollBiometricBtn: "Enroll Device Biometrics",
    testSensorBtn: "Test Biometric Sensor",
    switchUnrestrictedRole: "Switch to Field / Retailer Mode",
    protectedRolesLabel: "Protected Roles (Admin & Counter)",

    // PDF Export for Offline Records
    exportPdfBtn: "Export PDF",
    exportLedgerPdf: "Download Ledger PDF",
    exportAllSuppliersPdf: "Export All Vendors PDF",
    exportTransfersPdf: "Download Cash Audit PDF",
    pdfExportSuccess: "PDF document generated & downloaded for offline records",
    pdfExportSubtitle: "High-resolution downloadable PDF formatted for offline archiving & printing",

    // Authentication & Registration
    authGatewayTitle: "Wholesale Management & Distribution",
    authGatewaySubtitle: "Sign in or register with mobile number or Gmail to access your account",
    loginTab: "Login",
    registerTab: "Register New Account",
    phoneLoginLabel: "Mobile Phone Number",
    gmailLoginLabel: "Sign in with Google / Gmail",
    enterPhoneNumber: "Enter 11-digit mobile number",
    enterFullName: "Full Name",
    enterBanglaName: "Full Name in Bengali (Optional)",
    enterBusinessName: "Store / Business Name",
    enterRouteArea: "Territory / Route Area (For DSR)",
    chooseRoleLabel: "Select Your Business Role",
    adminRoleDesc: "Business Owner / Managing Director (Full Access)",
    counterRoleDesc: "Cashier & Counter Sales (Daily POS Billing & Cash Drawer)",
    dsrRoleDesc: "Field Sales Rep (Order Booking & Route Collections)",
    retailerRoleDesc: "Retail Merchant / Storekeeper (Product Catalog & Replacements)",
    loginBtn: "Sign In",
    registerBtn: "Complete Registration & Enter",
    continueWithGoogle: "Continue with Google (Gmail)",
    demoAccountsTitle: "Quick Demo Profiles (1-Click Instant Access)",
    demoAccountsSubtitle: "Tap any pre-configured profile to test specific permissions immediately",
    signOutBtn: "Sign Out",
    signedInAs: "Signed in as",
    accountDetails: "Account Details",
    phoneRequired: "Please enter a valid 11-digit mobile number (e.g. 01937200635)",
    nameRequired: "Please enter your full name",
    pinOrPassword: "4-Digit Security PIN",
    enterPin: "Enter 4-digit PIN",
    rememberMe: "Remember my session on this device",
    newToApp: "New user? Create an account",
    existingUser: "Already registered? Sign in here",
    authSuccessMsg: "Authentication successful! Welcome to Wholesale Hub.",
    distinctDeviceNotice: "Each role (Admin, Counter, DSR) operates from their own distinct registered mobile account. Counter and DSR connect to the Admin's inventory via the Admin Reference Number.",
    adminRefLabel: "Wholesaler / Admin Reference Number",
    adminRefPlaceholder: "Enter Admin's mobile (e.g. 01937200635)",
    adminRefHelper: "Linking with Admin connects you directly to that wholesaler's product catalog, stock inventory, and sales records.",
    adminRefRequiredForStaff: "Admin reference number is required for Counter & DSR staff to link with their business owner.",
    yourAdminRefCode: "Your Admin Reference Code",
    shareWithStaff: "Share this mobile number with your Counter and DSR staff to link them to your business inventory.",
    linkedAdminEnterprise: "Linked Wholesaler",
    changeAdminRef: "Change / Verify Admin Reference",
    adminNotFound: "No wholesaler found with this reference number. Please verify the mobile number.",
    adminLinkedSuccess: "Successfully linked with Wholesaler:",
    staffLinkedTitle: "Business Linking Information",
    sampleAdminCodes: "Sample Registered Wholesalers (Tap to paste):",
    switchAdminPrompt: "Connected Wholesaler & Enterprise Database",
    noAdminLinkedWarning: "No Wholesaler linked yet. Please provide an Admin reference number to load product inventory.",
    deleteWrongEntry: "Delete Wrong Entry",
    deleteConfirmTitle: "Confirm Deletion",
    deleteConfirmDesc: "Are you sure you want to delete this entry? This cannot be undone.",
    deleteInvoiceConfirm: "Deleting this invoice will automatically restore inventory stock and adjust retailer balance.",
    editDetails: "Edit Details",
    editPhone: "Edit Phone Number",
    invoicesHistory: "Sales History & Invoices",
    newSaleTab: "New Sale / Billing",
    voidInvoice: "Void / Delete Invoice",

    // Dual Cash Balance & Payment Hub
    paymentHubTitle: "Payment Hub & Cash Settlements",
    paymentHubSubtitle: "Admin company payments & DSR / Counter cash handovers to Admin",
    adminCashBalance: "Admin Cash Vault Balance (Available)",
    dsrAndCounterPendingCash: "Cash Held with DSR & Counter (Pending to Admin)",
    totalDepotLiquidity: "Total Depot Liquid Cash",
    zeroCashAlert: "Cash Balance is Zero! Add money to Admin Investment option to disburse company payments.",
    addInvestment: "Add Investment / Capital",
    payCompany: "Pay Company / Supplier",
    payAdmin: "Pay / Handover Cash to Admin",
    payAllToAdmin: "Deposit Entire Cash Drawer to Admin",
    insufficientCashAdmin: "Insufficient cash balance in Admin Vault. Please add investment first.",
    receiveFromStaff: "Accept Staff Cash Handover",
    companyPaymentSuccess: "Payment disbursed to company successfully!",
    staffPaymentSuccess: "Cash handover voucher sent to Admin for acceptance!",
    investmentAddedSuccess: "Investment capital successfully injected into Admin Cash Vault!",
  },
  bn: {
    appName: "মাতৃছায়া টেলিকম",
    appSubtitle: "টেলিকম ও পাইকারি ডিস্ট্রিবিউশন ইআরপি",
    switchRole: "রোল পরিবর্তন করুন",
    activeRole: "বর্তমান রোল",
    admin: "এডমিন (মালিক)",
    counter: "কাউন্টার সেলস",
    dsr: "ডিএসআর (ফিল্ড রিপ্রেজেন্টেটিভ)",
    retailer: "রিটেইলার (দোকানদার)",
    langToggle: "English",
    
    // Bottom Nav Tabs
    tabDashboard: "ড্যাশবোর্ড",
    tabPOS: "বিলিং / পিওএস",
    tabTransfers: "ক্যাশ লগ",
    tabSuppliers: "সাপ্লায়ার খাতা",
    tabCapital: "মূলধন ও তহবিল",
    tabReplacements: "ড্যামেজ ও রিপ্লেসমেন্ট",
    tabCatalog: "পণ্য ক্যাটালগ",
    tabOrders: "অর্ডারসমূহ",
    tabRetailers: "রিটেইলার তালিকা",
    dashboard: "ড্যাশবোর্ড",
    pos: "বিলিং / পিওএস",
    cashTransfers: "ক্যাশ লগ",
    suppliers: "সাপ্লায়ার খাতা",
    capitalTracking: "মূলধন ও তহবিল",
    replacements: "ড্যামেজ ও রিপ্লেসমেন্ট",
    retailerPortal: "রিটেইলার পোর্টাল",
    
    // Common Actions
    save: "সংরক্ষণ করুন",
    cancel: "বাতিল",
    confirm: "নিশ্চিত করুন",
    close: "বন্ধ করুন",
    lockNow: "লক করুন",
    posTitle: "পয়েন্ট অব সেল (পিওএস)",
    posSubtitle: "ইনভয়েস তৈরি ও দ্রুত মেমো বিলিং",
    wholesalePrice: "পাইকারি দর",
    inStock: "স্টকে আছে",
    cartTitle: "কার্ট",
    cartEmpty: "কার্ট সম্পূর্ণ খালি",
    cash: "নগদ ক্যাশ",
    credit: "বাকি (বাকিতে বিক্রয়)",
    delete: "মুছে ফেলুন",
    edit: "সম্পাদনা",
    add: "নতুন যোগ করুন",
    search: "অনুসন্ধান...",
    filter: "ফিল্টার",
    status: "অবস্থা",
    date: "তারিখ",
    amount: "টাকার পরিমাণ",
    action: "কার্যক্রম",
    details: "বিস্তারিত",
    print: "মেমো প্রিন্ট করুন",
    download: "ডাউনলোড",
    refresh: "রিফ্রেশ",
    scanAI: "ইনভয়েস স্ক্যান (এআই)",
    importPhonebook: "ফোনবুক",
    accept: "ক্যাশ গ্রহণ করুন",
    reject: "প্রত্যাখ্যান",
    pending: "অপেক্ষমান",
    accepted: "গৃহীত ও জমাকৃত",
    rejected: "বাতিলকৃত",
    all: "সব",
    total: "মোট",
    subtotal: "সাবটোটাল",
    discount: "ছাড় / ডিসকাউন্ট",
    grandTotal: "সর্বমোট দেয়",
    paid: "পরিশোধিত",
    due: "বকেয়া",
    partial: "আংশিক",
    products: "পণ্যসমূহ",
    searchProduct: "পণ্য খুঁজুন...",
    confirmSale: "বিক্রয় নিশ্চিত করুন",
    paymentMethod: "পেমেন্ট মাধ্যম",
    notes: "মন্তব্য / বিবরণ",
    
    // AI Receipt Scanner
    aiScannerTitle: "এআই রসিদ ও ইনভয়েস স্ক্যানার",
    aiScannerSubtitle: "জেমিনাই ফ্ল্যাশ দ্বারা স্বয়ংক্রিয়ভাবে কোম্পানি নাম ও স্টক আইটেম চিহ্নিতকরণ",
    dropPhotoHere: "সাপ্লায়ার চালানের ছবি তুলুন বা আপলোড করুন",
    useCamera: "ক্যামেরা ব্যবহার করুন",
    uploadFile: "ছবি আপলোড করুন",
    sampleInvoice: "নমুনা সাপ্লায়ার ইনভয়েস লোড করুন",
    scanningReceipt: "জেমিনাই ফ্ল্যাশ এআই চালানটি বিশ্লেষণ করছে...",
    extractSuccess: "চালানের পণ্যের তালিকা ও মোট হিসাব সফলভাবে বের করা হয়েছে!",
    companyDetected: "সাপ্লায়ার / কোম্পানি",
    invoiceNoDetected: "ইনভয়েস / মেমো নম্বর",
    extractedStockItems: "চিহ্নিত স্টক ও পণ্যসমূহ",
    itemColName: "পণ্যের নাম",
    itemColQty: "পরিমাণ",
    itemColUnit: "একক",
    itemColCost: "কেনা দর (ক্রয়)",
    itemColRetail: "পাইকারি দর (বিক্রয়)",
    itemColTotal: "মোট মূল্য",
    addToInventoryAndLedger: "ইনভেন্টরিতে স্টক যুক্ত করুন ও সাপ্লায়ার লেজার আপডেট করুন",
    
    // Phonebook Integration
    phonebookTitle: "ফোনবুক থেকে রিটেইলার নির্বাচন",
    phonebookSubtitle: "মোবাইলের কনট্যাক্ট লিস্ট থেকে সরাসরি রিটেইলার যুক্ত করুন",
    openNativePicker: "ডিভাইস ফোনবুক খুলুন",
    searchPhonebook: "ফোন নাম্বার বা নাম দিয়ে খুঁজুন...",
    contactsFound: "টি কনট্যাক্ট পাওয়া গেছে",
    createRetailerFromContact: "রিটেইলার হিসেবে নিবন্ধন করুন",
    contactSelected: "ফোনবুক থেকে কনট্যাক্ট নির্বাচিত হয়েছে",
    
    // Cash Transfer Log
    cashTransferTitle: "ক্যাশ ট্রান্সফার লেজার",
    transfersTitle: "ক্যাশ ট্রান্সফার",
    cashTransferSubtitle: "ডিএসআর ➔ কাউন্টার ➔ এডমিন নগদ টাকা স্থানান্তর ও গ্রহণ",
    transfersSubtitle: "ডিএসআর ➔ কাউন্টার ➔ এডমিন নগদ টাকা স্থানান্তর ও গ্রহণ",
    searchTransfersPlaceholder: "টাকার পরিমাণ (৳), তারিখ, প্রেরক বা প্রাপকের নাম দিয়ে খুঁজুন...",
    newCashTransfer: "টাকা ট্রান্সফার করুন",
    sendCashBtn: "টাকা পাঠান",
    fromUser: "প্রেরক",
    toUser: "প্রাপক",
    transferStatusPending: "অনুমোদনের অপেক্ষায়",
    transferStatusAccepted: "টাকা বুঝে নেওয়া হয়েছে",
    transferStatusRejected: "ট্রান্সফার বাতিল",
    acceptCashBtn: "টাকা গ্রহণ করুন ও জমা নিন",
    acceptCashConfirm: "আপনি কি নিশ্চিত যে নগদ টাকা হাতে পেয়েছেন?",
    cashDrawerBalance: "হাতে / ড্রয়ারে বর্তমান নগদ টাকা",
    notesBreakdown: "টাকার নোটের হিসাব (ডিনোমিনেশন)",
    
    // Supplier Ledger
    supplierLedgerTitle: "সাপ্লায়ার খাতা ও বাকি ট্র্যাকার",
    supplierLedgerSubtitle: "কোম্পানি অনুযায়ী ক্রয় হিসাব, পেমেন্ট ও সমন্বয় বিবরণী",
    searchLedgerPlaceholder: "টাকার পরিমাণ (৳), তারিখ, মেমো বা মন্তব্য দিয়ে খুঁজুন...",
    searchAllLedgerPlaceholder: "টাকার পরিমাণ, তারিখ, সাপ্লায়ার বা মেমো দিয়ে খুঁজুন...",
    addNewSupplier: "নতুন সাপ্লায়ার যুক্ত করুন",
    totalPayableToSuppliers: "সাপ্লায়ারের মোট পাওনা (প্যায়েবল)",
    totalPurchasesDone: "সর্বমোট মালামাল ক্রয়",
    makePayment: "টাকা পরিশোধ করুন",
    viewLedgerHistory: "স্টেটমেন্ট দেখুন",
    transactionType: "এন্ট্রি ধরন",
    balanceAfter: "পরবর্তী মোট বকেয়া",
    purchaseInvoice: "ক্রয় চালান",
    paymentVoucher: "পেমেন্ট ভাউচার",
    returnAdjustment: "ড্যামেজ ফেরত সমন্বয়",
    
    // Admin Capital Tracking
    capitalTrackingTitle: "মূলধন ও মোট সম্পদের হিসাব",
    capitalTrackingSubtitle: "বিনিয়োগকৃত ক্যাপিটাল, নগদ অর্থ, মজুদ পণ্যের মূল্য ও নিট সম্পদ",
    totalNetWorth: "ব্যবসার মোট নিট সম্পদ (Net Worth)",
    netWorth: "ব্যবসার মোট নিট সম্পদ (Net Worth)",
    totalCapitalInjected: "বিনিয়োগকৃত মোট মূলধন",
    initialCapital: "বিনিয়োগকৃত মোট মূলধন",
    liquidCashBalance: "মোট তরল নগদ টাকা",
    liquidCash: "মোট তরল নগদ টাকা",
    cashInCounter: "কাউন্টার ড্রয়ারে নগদ",
    cashWithDSR: "ডিএসআরদের নিকট নগদ",
    cashInBank: "ব্যাংক / মোবাইল ব্যাংকিংয়ে ব্যালেন্স",
    inventoryValuation: "মজুদ পণ্যের মূল্য (ক্রয়মূল্যে)",
    totalInventoryValuation: "মজুদ পণ্যের মূল্য (ক্রয়মূল্যে)",
    accountsReceivable: "দোকানদারদের নিকট পাওনা (রিসিভেবল)",
    totalRetailerReceivable: "দোকানদারদের নিকট পাওনা (রিসিভেবল)",
    accountsPayable: "সাপ্লায়ারদের বকেয়া (প্যায়েবল)",
    injectCapital: "নতুন মূলধন যোগ করুন",
    withdrawCapital: "মালিকের ব্যক্তিগত উত্তোলন",
    
    // Product Replacement / Damage Adjustments
    replacementTitle: "ড্যামেজ ও পণ্য রিপ্লেসমেন্ট খাতা",
    replacementSubtitle: "রিটেইলারের নষ্ট পণ্য ও সাপ্লায়ারকে ফেরত পাঠানো পণ্যের সমন্বয়",
    retailerClaims: "দোকানদারদের ফেরত দাবি",
    supplierClaims: "কোম্পানি / সাপ্লায়ার ফেরত দাবি",
    newClaim: "নতুন ড্যামেজ ক্লেইম দাখিল করুন",
    claimReason: "ফেরতের কারণ",
    reasonExpired: "মেয়াদোত্তীর্ণ পণ্য (Expired)",
    reasonDamaged: "প্যাকেট নষ্ট বা ছেঁড়া",
    reasonDefect: "ম্যানুফ্যাকচারিং ত্রুটি",
    reasonBroken: "ভেঙে যাওয়া বা লিক হওয়া",
    resolutionType: "সমাধানের পদ্ধতি",
    resReplaceItem: "নতুন ফ্রেশ পণ্য প্রদান",
    resCreditDeduct: "খাতার বাকি টাকা থেকে বাদ দেওয়া (Credit)",
    approveClaim: "ক্লেইম অনুমোদন করুন",
    markDispatched: "পণ্য সরবরাহ সম্পন্ন",
    markCredited: "খাতায় ক্রেডিট সমন্বয় সম্পন্ন",
    
    // Roles description
    roleAdminDesc: "সম্পূর্ণ নিয়ন্ত্রণ, মূলধন ট্র্যাকিং, সাপ্লায়ার পেমেন্ট ও ক্যাশ অনুমোদন।",
    roleCounterDesc: "দ্রুত কাউন্টার বিক্রয়, নগদ ড্রয়ার হিসাব ও এডমিনের কাছে টাকা জমা।",
    roleDSRDesc: "ফোনবুক থেকে দোকানদার নির্বাচন, ফিল্ড অর্ডার গ্রহণ ও কাউন্টারে ক্যাশ জমা।",
    roleRetailerDesc: "পাইকারি দর দেখা, বকেয়া লেজার চেক করা, নতুন অর্ডার ও ড্যামেজ ক্লেইম দাখিল।",

    // Offline Firestore Persistence
    offlineMode: "অফলাইন মোড",
    onlineMode: "অনলাইন সংযুক্ত",
    offlinePersistenceActive: "অফলাইন মেমোরি সক্রিয়",
    offlineSyncDesc: "সকল ড্যাশবোর্ড উপাত্ত ও অপেক্ষমান ক্যাশ ট্রান্সফার লোকাল মেমোরিতে সংরক্ষিত আছে এবং অফলাইনেও সম্পূর্ণ দৃশ্যমান।",
    pendingTransfersOfflineReady: "অপেক্ষমান ক্যাশ ট্রান্সফার অফলাইনে উপলব্ধ",
    offlineNotice: "ইন্টারনেট সংযোগ বিচ্ছিন্ন। অ্যাপটি নিরাপদ অফলাইন ক্যাশ মোডে চলছে।",
    simulateOfflineBtn: "অফলাইন পরীক্ষা",
    simulateOnlineBtn: "অনলাইনে যান",
    cachedDataBadge: "অফলাইন ক্যাশে সংরক্ষিত",
    connectivityToastOnlineTitle: "অনলাইন সংযুক্ত হয়েছে",
    connectivityToastOnlineMsg: "ইন্টারনেট সংযোগ পুনঃস্থাপিত হয়েছে। অফলাইনে সংরক্ষিত তথ্য ক্লাউডের সাথে স্বয়ংক্রিয়ভাবে সিঙ্ক হচ্ছে।",
    connectivityToastOfflineTitle: "আপনি অফলাইনে আছেন",
    connectivityToastOfflineMsg: "ইন্টারনেট সংযোগ বিচ্ছিন্ন। অ্যাপটি অফলাইন লোকাল ক্যাশে কাজ করছে এবং নেট পেলেই স্বয়ংক্রিয়ভাবে সিঙ্ক হবে।",
    connectivityDismiss: "বন্ধ করুন",
    connectivitySyncing: "উপাত্ত ক্লাউডে সিঙ্ক হচ্ছে...",
    connectivitySyncComplete: "সকল তথ্য সিঙ্ক হয়েছে",
    connectivitySimulateBtn: "অফলাইন মোড পরীক্ষা করুন",
    connectivityCheckBtn: "সংযোগ যাচাই করুন",

    // Biometric Authentication & Secure Storage Bridge
    biometricTitle: "বায়োমেট্রিক অথেন্টিকেশন",
    biometricProtected: "বায়োমেট্রিক দ্বারা সুরক্ষিত",
    biometricLockNotice: "সুরক্ষা যাচাই প্রয়োজন",
    touchSensorPrompt: "আঙুলের ছাপ (ফিঙ্গারপ্রিন্ট) দিন বা ফেস আনলক করুন",
    adminVaultLocked: "মালিক/এডমিন সিকিউরিটি ভল্ট লক করা",
    counterVaultLocked: "কাউন্টার ক্যাশিয়ার ড্রয়ার লক করা",
    biometricSubtext: "আপনার ডিভাইসের ফিঙ্গারপ্রিন্ট বা ফেস স্ক্যানারের মাধ্যমে যাচাই করুন অথবা বিকল্প সিকিউরিটি পিন দিন।",
    useFallbackPin: "বিকল্প সিকিউরিটি পিন দিন",
    useBiometrics: "ফিঙ্গারপ্রিন্ট / ফেস আনলক ব্যবহার করুন",
    enterSecurityPin: "৪-সংখ্যার সিকিউরিটি পিন দিন",
    defaultPinHint: "ডিফল্ট সিকিউরিটি পিন হলো 1234",
    invalidPinError: "ভুল সিকিউরিটি পিন। আবার চেষ্টা করুন।",
    biometricScanSuccess: "পরিচয় সফলভাবে যাচাই হয়েছে",
    biometricScanFailed: "বায়োমেট্রিক স্ক্যান ব্যর্থ বা বাতিল হয়েছে। পিন দিয়ে চেষ্টা করুন।",
    lockDashboardNow: "সেশন লক করুন",
    unlockDashboard: "ড্যাশবোর্ড আনলক করুন",
    securitySettings: "বায়োমেট্রিক ও নিরাপত্তা সেটিংস",
    enableBiometrics: "বায়োমেট্রিক সুরক্ষা চালু রাখুন",
    biometricStatusActive: "ডিভাইস সেন্সর ও WebAuthn সক্রিয়",
    biometricStatusBridge: "ক্রিপ্টোগ্রাফিক সিকিউর স্টোরেজ সক্রিয়",
    autoLockTimer: "অটো-লক সময়সীমা",
    autoLockImmediate: "রোল পরিবর্তনের সাথে সাথে",
    autoLock1Min: "১ মিনিট নিষ্ক্রিয় থাকলে",
    autoLock5Min: "৫ মিনিট নিষ্ক্রিয় থাকলে",
    autoLock15Min: "১৫ মিনিট নিষ্ক্রিয় থাকলে",
    autoLockNever: "শুধুমাত্র ম্যানুয়াল লক",
    changePin: "সিকিউরিটি পিন পরিবর্তন করুন",
    currentPin: "বর্তমান পিন",
    newPin: "নতুন ৪-সংখ্যার পিন",
    confirmNewPin: "নতুন পিন নিশ্চিত করুন",
    pinChangedSuccess: "সিকিউরিটি পিন সফলভাবে পরিবর্তন হয়েছে",
    enrollBiometricBtn: "বায়োমেট্রিক রেজিস্টার করুন",
    testSensorBtn: "সেন্সর টেস্ট করুন",
    switchUnrestrictedRole: "ফিল্ড বা রিটেইলার মোডে যান",
    protectedRolesLabel: "সুরক্ষিত রোল (এডমিন ও কাউন্টার)",

    // PDF Export for Offline Records
    exportPdfBtn: "পিডিএফ ডাউনলোড",
    exportLedgerPdf: "লেজার পিডিএফ ডাউনলোড",
    exportAllSuppliersPdf: "সকল সরবরাহকারীর রিপোর্ট",
    exportTransfersPdf: "ক্যাশ ট্রান্সফার পিডিএফ",
    pdfExportSuccess: "পিডিএফ সফলভাবে তৈরি ও অফলাইন রেকর্ডের জন্য ডাউনলোড হয়েছে",
    pdfExportSubtitle: "অফলাইন সংরক্ষণ ও প্রিন্ট উপযোগী হাই-রেজোলিউশন পিডিএফ",

    // Authentication & Registration
    authGatewayTitle: "হোলসেল ম্যানেজমেন্ট অ্যান্ড ডিস্ট্রিবিউশন",
    authGatewaySubtitle: "আপনার অ্যাকাউন্টে প্রবেশ করতে মোবাইল নম্বর বা জিমেইল দিয়ে লগইন অথবা নতুন রেজিস্ট্রেশন করুন",
    loginTab: "লগইন করুন",
    registerTab: "নতুন অ্যাকাউন্ট রেজিস্ট্রেশন",
    phoneLoginLabel: "মোবাইল নম্বর",
    gmailLoginLabel: "Google / Gmail দিয়ে প্রবেশ",
    enterPhoneNumber: "১১-সংখ্যার মোবাইল নম্বর দিন",
    enterFullName: "আপনার পুরো নাম",
    enterBanglaName: "বাংলা নাম (ঐচ্ছিক)",
    enterBusinessName: "দোকান / প্রতিষ্ঠানের নাম",
    enterRouteArea: "রুট বা এলাকা (ডিএসআর-এর জন্য)",
    chooseRoleLabel: "ব্যবহারকারীর দায়িত্ব/রোল নির্বাচন করুন",
    adminRoleDesc: "ব্যবসার মালিক / ম্যানেজিং ডিরেক্টর (সম্পূর্ণ এক্সেস)",
    counterRoleDesc: "কাউন্টার ক্যাশিয়ার ও সেলসম্যান (দৈনিক পিওএস ও ক্যাশ ড্রয়ার)",
    dsrRoleDesc: "মাঠপর্যায়ের ডিএসআর (অর্ডার গ্রহণ ও রুট কালেকশন)",
    retailerRoleDesc: "খুচরা দোকানি / মার্চেন্ট (পণ্য ক্যাটালগ ও রিপ্লেসমেন্ট)",
    loginBtn: "প্রবেশ করুন",
    registerBtn: "রেজিস্ট্রেশন সম্পন্ন করুন",
    continueWithGoogle: "গুগল (Gmail) অ্যাকাউন্ট দিয়ে প্রবেশ করুন",
    demoAccountsTitle: "দ্রুত ডেমো প্রোফাইল (এক ক্লিকে প্রবেশ)",
    demoAccountsSubtitle: "নির্দিষ্ট রোলের ফিচারগুলো সরাসরি যাচাই করতে নিচের যেকোনো একটি প্রোফাইল বেছে নিন",
    signOutBtn: "লগআউট",
    signedInAs: "লগইন আছেন:",
    accountDetails: "অ্যাকাউন্ট তথ্য",
    phoneRequired: "সঠিক ১১-সংখ্যার মোবাইল নম্বর লিখুন (যেমন: 01937200635)",
    nameRequired: "আপনার পুরো নাম লিখুন",
    pinOrPassword: "৪-সংখ্যার সিকিউরিটি পিন",
    enterPin: "৪-সংখ্যার পিন দিন",
    rememberMe: "এই ডিভাইসে লগইন মনে রাখুন",
    newToApp: "নতুন ব্যবহারকারী? রেজিস্ট্রেশন করুন",
    existingUser: "ইতোমধ্যে অ্যাকাউন্ট আছে? লগইন করুন",
    authSuccessMsg: "স্বাগতম! সফলভাবে প্রবেশ করেছেন।",
    distinctDeviceNotice: "এডমিন, কাউন্টার ও ডিএসআর প্রত্যেকে আলাদা আলাদা মোবাইল দিয়ে রেজিস্ট্রেশন করে নিজস্ব অ্যাকাউন্টে লগইন করবে। কাউন্টার ও ডিএসআর এডমিনের রেফারেন্স নম্বর দিয়ে সেই এডমিনের প্রোডাক্ট ও সেলস স্টকের সাথে যুক্ত হবে।",
    adminRefLabel: "হোলসেলার / এডমিন রেফারেন্স নম্বর",
    adminRefPlaceholder: "এডমিনের মোবাইল নম্বর দিন (যেমন: 01937200635)",
    adminRefHelper: "কাউন্টার বা ডিএসআর হিসেবে এডমিনের নম্বর দিলে উক্ত পাইকারি প্রতিষ্ঠানের প্রোডাক্ট স্টক, কেনাবেচা ও রেট তালিকা স্বয়ংক্রিয়ভাবে লোড হবে।",
    adminRefRequiredForStaff: "কাউন্টার ও ডিএসআর কর্মীদের তাদের প্রতিষ্ঠানের সাথে যুক্ত হতে এডমিনের রেফারেন্স নম্বর প্রদান করা আবশ্যক।",
    yourAdminRefCode: "আপনার এডমিন রেফারেন্স কোড",
    shareWithStaff: "আপনার কাউন্টার ও ডিএসআর কর্মীদের এই নম্বরটি দিন যাতে তারা আপনার পণ্যের স্টক ও সেলস দেখতে পারে।",
    linkedAdminEnterprise: "যুক্ত পাইকারি প্রতিষ্ঠান / এডমিন",
    changeAdminRef: "এডমিন রেফারেন্স পরিবর্তন / যাচাই",
    adminNotFound: "এই রেফারেন্স নম্বরে কোনো এডমিন বা হোলসেলার পাওয়া যায়নি। মোবাইল নম্বর যাচাই করুন।",
    adminLinkedSuccess: "সফলভাবে যুক্ত হয়েছেন হোলসেলার:",
    staffLinkedTitle: "বিজনেস লিংকিং ও হোলসেলার তথ্য",
    sampleAdminCodes: "রেজিস্টার্ড হোলসেলারদের রেফারেন্স নম্বর (ক্লিক করে কপি/পেস্ট করুন):",
    switchAdminPrompt: "সংযুক্ত হোলসেলার ও বিজনেস ডাটাবেস",
    noAdminLinkedWarning: "কোনো এডমিন লিঙ্ক করা নেই। পণ্যের তালিকা ও স্টক দেখতে অনুগ্রহ করে আপনার এডমিন রেফারেন্স নম্বর দিন।",
    deleteWrongEntry: "ভুল এন্ট্রি মুছুন",
    deleteConfirmTitle: "এন্ট্রি মুছে ফেলার নিশ্চিতকরণ",
    deleteConfirmDesc: "আপনি কি নিশ্চিত এই ভুল এন্ট্রিটি মুছে ফেলতে চান? এটি আর ফিরিয়ে আনা যাবে না।",
    deleteInvoiceConfirm: "এই মেমোটি ডিলিট করলে বিক্রয়কৃত পণ্যের স্টক গুদামে স্বয়ংক্রিয়ভাবে ফেরত যোগ হবে এবং কাস্টমারের বকেয়া সমন্বয় হবে।",
    editDetails: "তথ্য পরিবর্তন করুন",
    editPhone: "ফোন নম্বর পরিবর্তন",
    invoicesHistory: "মেমো ও বিক্রয় হিস্ট্রি",
    newSaleTab: "নতুন বিক্রয় / বিলিং",
    voidInvoice: "ভুল মেমো বাতিল / ডিলিট",

    // Dual Cash Balance & Payment Hub
    paymentHubTitle: "পেমেন্ট হাব ও ক্যাশ লেনদেন",
    paymentHubSubtitle: "কোম্পানিতে এডমিনের পেমেন্ট এবং এডমিনকে ডিএসআর ও ক্যাশ কাউন্টারের টাকা জমা",
    adminCashBalance: "এডমিনের বর্তমান ক্যাশ ব্যালেন্স (ভল্ট ও নগদ)",
    dsrAndCounterPendingCash: "ডিএসআর ও ক্যাশ কাউন্টারে জমা (এডমিনের প্রাপ্য ক্যাশ)",
    totalDepotLiquidity: "ডিপোর মোট সর্বমোট তরল নগদ",
    zeroCashAlert: "ক্যাশ ব্যালেন্স শূন্য (০ টাকা)! কোম্পানিতে পেমেন্ট বা খরচের জন্য এডমিনের ইনভেস্ট অপশনে টাকা যোগ করুন।",
    addInvestment: "ইনভেস্ট / মূলধন যোগ করুন",
    payCompany: "কোম্পানি / সাপ্লায়ারকে পেমেন্ট করুন",
    payAdmin: "এডমিনকে ক্যাশ পেমেন্ট / জমা দিন",
    payAllToAdmin: "হাতের সম্পূর্ণ ক্যাশ এডমিনকে জমা দিন",
    insufficientCashAdmin: "এডমিনের ভল্টে পর্যাপ্ত ক্যাশ ব্যালেন্স নেই। দয়া করে আগে ইনভেস্ট / মূলধন যোগ করুন।",
    receiveFromStaff: "ডিএসআর/কাউন্টারের ক্যাশ গ্রহণ",
    companyPaymentSuccess: "কোম্পানিতে পেমেন্ট সফলভাবে সম্পন্ন হয়েছে!",
    staffPaymentSuccess: "এডমিনের নিকট ক্যাশ জমার ভাউচার পাঠানো হয়েছে!",
    investmentAddedSuccess: "এডমিনের ক্যাশ ভল্টে নতুন ইনভেস্টমেন্ট মূলধন সফলভাবে যোগ হয়েছে!",
    
    // Date Selection & Filtering
    entryDateLabel: "লেনদেন / ভাউচার তারিখ",
    selectDate: "তারিখ নির্বাচন করুন",
    today: "আজ",
    yesterday: "গতকাল",
    pastDateEntry: "পূর্ববর্তী তারিখের এন্ট্রি",
    filterByDate: "তারিখ অনুযায়ী ফিল্টার",
    allDates: "সকল তারিখ",
    previousTransactions: "পূর্ববর্তী লেনদেন ও লেজার",
    noTransactionsFound: "এই তারিখে কোনো লেনদেন পাওয়া যায়নি।",
  },
};

export const parseFlexibleNumber = (val: string | number | null | undefined): number => {
  if (val === null || val === undefined) return 0;
  if (typeof val === 'number') return isNaN(val) ? 0 : val;
  const bengaliToEnglishMap: Record<string, string> = {
    '০': '0', '১': '1', '২': '2', '৩': '3', '৪': '4',
    '৫': '5', '৬': '6', '৭': '7', '৮': '8', '৯': '9',
  };
  const normalized = String(val)
    .replace(/[০-৯]/g, (digit) => bengaliToEnglishMap[digit] || digit)
    .replace(/[^\d.-]/g, '')
    .trim();
  const num = parseFloat(normalized);
  return isNaN(num) ? 0 : num;
};

export const round2 = (num: number): number => {
  return Math.round((num + Number.EPSILON) * 100) / 100;
};

export const formatDecimal = (
  num?: number | null | string,
  minDecimals: number = 0,
  maxDecimals: number = 2,
  lang: Language = 'en'
): string => {
  const val = typeof num === 'number' ? num : Number(num) || 0;
  const safe = isNaN(val) ? 0 : round2(val);
  const formatted = new Intl.NumberFormat('en-IN', {
    minimumFractionDigits: minDecimals,
    maximumFractionDigits: maxDecimals,
  }).format(safe);

  if (lang === 'bn') {
    const bengaliDigits = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'];
    return formatted.replace(/[0-9]/g, (w) => bengaliDigits[+w]);
  }
  return formatted;
};

export const formatCurrency = (
  amount?: number | null | string,
  lang: Language = 'en',
  options?: { forceDecimals?: boolean; maxFractionDigits?: number; minimumFractionDigits?: number }
): string => {
  const num = typeof amount === 'number' ? amount : Number(amount) || 0;
  const safeAmount = isNaN(num) ? 0 : round2(num);
  const isNegative = safeAmount < 0;
  const absAmount = Math.abs(safeAmount);

  // If amount has decimal fractions (e.g. 10.50) or caller specifically requests decimals
  const hasFractions = Math.abs(absAmount - Math.floor(absAmount)) > 0.0001;
  const maxFraction = options?.maxFractionDigits ?? 2;
  const minFraction = options?.minimumFractionDigits ?? (options?.forceDecimals ? 2 : (hasFractions ? 2 : 0));

  const formattedNumber = new Intl.NumberFormat('en-IN', {
    maximumFractionDigits: maxFraction,
    minimumFractionDigits: minFraction,
  }).format(absAmount);

  if (lang === 'bn') {
    // English numerals to Bengali digits
    const bengaliDigits = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'];
    const bnFormatted = formattedNumber.replace(/[0-9]/g, (w) => bengaliDigits[+w]);
    return isNegative ? `-৳ ${bnFormatted}` : `৳ ${bnFormatted}`;
  }
  return isNegative ? `-৳ ${formattedNumber}` : `৳ ${formattedNumber}`;
};

export const getTodayDateString = (): string => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export const getYesterdayDateString = (): string => {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export const formatDate = (dateStr?: string, lang: Language = 'en'): string => {
  if (!dateStr) return '';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;

    const day = d.getDate();
    const year = d.getFullYear();
    const monthsEn = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const monthsBn = ['জানু', 'ফেব্রু', 'মার্চ', 'এপ্রিল', 'মে', 'জুন', 'জুলাই', 'আগস্ট', 'সেপ্টে', 'অক্টো', 'নভে', 'ডিসে'];

    if (lang === 'bn') {
      const bengaliDigits = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'];
      const bnDay = String(day).replace(/[0-9]/g, (w) => bengaliDigits[+w]);
      const bnYear = String(year).replace(/[0-9]/g, (w) => bengaliDigits[+w]);
      return `${bnDay} ${monthsBn[d.getMonth()]}, ${bnYear}`;
    }
    return `${day} ${monthsEn[d.getMonth()]} ${year}`;
  } catch {
    return dateStr;
  }
};
