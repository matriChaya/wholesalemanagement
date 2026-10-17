import React, { useState } from 'react';
import { useWholesale } from '../context/WholesaleContext';
import { translations, formatCurrency } from '../utils/translations';
import {
  generateRetailerStatementPdf,
  generateInvoiceMemoPdf,
  PdfDocumentResult,
} from '../utils/pdfExport';
import { PdfPreviewModal } from './PdfPreviewModal';
import {
  Store,
  CreditCard,
  Package,
  RotateCcw,
  ShoppingBag,
  Clock,
  CheckCircle2,
  AlertCircle,
  Plus,
  Send,
  Sparkles,
  Search,
  Eye,
  Download,
  FileText,
} from 'lucide-react';

interface RetailerPortalViewProps {
  onOpenDamageClaim: () => void;
}

export const RetailerPortalView: React.FC<RetailerPortalViewProps> = ({ onOpenDamageClaim }) => {
  const {
    language,
    currentUser,
    retailers,
    products,
    orders,
    replacements,
    createOrder,
  } = useWholesale();

  const t = translations[language];

  // Find linked retailer
  const myRetailer =
    retailers.find((r) => r.id === currentUser.retailerId) || retailers[0];

  const [orderQtyMap, setOrderQtyMap] = useState<Record<string, number>>({});
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [isOrderSubmitted, setIsOrderSubmitted] = useState<boolean>(false);
  const [pdfPreviewResult, setPdfPreviewResult] = useState<PdfDocumentResult | null>(null);

  const myOrders = orders
    .filter((o) => o.retailerId === myRetailer?.id)
    .sort((a, b) => {
      const dateA = a.date || a.createdAt || '';
      const dateB = b.date || b.createdAt || '';
      const dateCmp = dateB.localeCompare(dateA);
      if (dateCmp !== 0) return dateCmp;
      return (b.invoiceNo || b.id).localeCompare(a.invoiceNo || a.id);
    });
  const myClaims = replacements.filter(
    (r) => (r.partyId && r.partyId === myRetailer?.id) || (r.entityId && r.entityId === myRetailer?.id)
  );

  const filteredProducts = products.filter(
    (p) =>
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (p.brand && p.brand.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (p.category && p.category.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const handleQtyChange = (productId: string, delta: number) => {
    const current = orderQtyMap[productId] || 0;
    const next = Math.max(0, current + delta);
    setOrderQtyMap({ ...orderQtyMap, [productId]: next });
  };

  const selectedItemsCount = (Object.values(orderQtyMap) as number[]).filter((q) => q > 0).length;

  const orderSubtotal = (Object.entries(orderQtyMap) as [string, number][]).reduce((sum: number, [pId, qty]) => {
    if (qty <= 0) return sum;
    const p = products.find((prod) => prod.id === pId);
    return sum + (p ? p.wholesalePrice * qty : 0);
  }, 0);

  const handleSubmitRetailerOrder = () => {
    if (orderSubtotal <= 0 || !myRetailer) return;

    const items = (Object.entries(orderQtyMap) as [string, number][])
      .filter(([_, qty]) => qty > 0)
      .map(([pId, qty]) => {
        const prod = products.find((p) => p.id === pId)!;
        return {
          productId: prod.id,
          productName: prod.name,
          quantity: qty,
          unitPrice: prod.wholesalePrice,
          totalPrice: qty * prod.wholesalePrice,
          unit: prod.unit,
        };
      });

    createOrder({
      retailerId: myRetailer.id,
      retailerName: `${myRetailer.shopName} (${myRetailer.ownerName})`,
      salesPersonRole: 'retailer',
      salesPersonName: `${myRetailer.ownerName} (Self Order)`,
      items,
      subtotal: orderSubtotal,
      discountAmount: 0,
      totalAmount: orderSubtotal,
      paymentType: 'CREDIT',
      paidAmount: 0,
      dueAmount: orderSubtotal,
    });

    setOrderQtyMap({});
    setIsOrderSubmitted(true);
    setTimeout(() => setIsOrderSubmitted(false), 4000);
  };

  return (
    <div className="space-y-4 animate-in fade-in duration-200">
      {/* Retailer Shop Header */}
      <div className="p-4 rounded-2xl bg-gradient-to-r from-slate-900 via-slate-900 to-purple-950/40 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-lg">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-purple-500/20 border border-purple-500/30 flex items-center justify-center text-purple-400 shrink-0">
            <Store className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
              <span>{myRetailer?.shopName || 'Retailer Store'}</span>
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30">
                {t.retailer} Portal
              </span>
            </h2>
            <p className="text-xs text-slate-400">
              {myRetailer?.ownerName} • {myRetailer?.phone} • {myRetailer?.route}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          {myRetailer && (
            <>
              <button
                type="button"
                onClick={() => {
                  const res = generateRetailerStatementPdf(myRetailer, orders);
                  setPdfPreviewResult(res);
                }}
                id="btn-preview-retailer-statement"
                className="py-2.5 px-3.5 bg-purple-950/60 hover:bg-purple-900/80 text-purple-300 hover:text-white border border-purple-500/40 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-sm active:scale-95 cursor-pointer"
                title="Preview Statement PDF"
              >
                <Eye className="w-4 h-4 text-purple-400" />
                <span>{language === 'bn' ? 'খাতা স্টেটমেন্ট' : 'My Statement'}</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  generateRetailerStatementPdf(myRetailer, orders).download();
                }}
                id="btn-download-retailer-statement"
                className="py-2.5 px-3.5 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-md active:scale-95 cursor-pointer"
                title="Download Statement PDF"
              >
                <Download className="w-4 h-4" />
                <span className="hidden sm:inline">{language === 'bn' ? 'ডাউনলোড' : 'Download'}</span>
                <span className="sm:hidden">PDF</span>
              </button>
            </>
          )}

          <button
            onClick={onOpenDamageClaim}
            className="py-2.5 px-4 bg-amber-600/20 hover:bg-amber-600 text-amber-300 hover:text-white border border-amber-500/40 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shrink-0"
          >
            <RotateCcw className="w-4 h-4" />
            <span>{language === 'bn' ? 'নষ্ট পণ্যের আবেদন' : 'Report Damaged Goods'}</span>
          </button>
        </div>
      </div>

      {/* Account Balance KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
        <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800">
          <span className="text-[10px] uppercase font-bold text-rose-400 flex items-center gap-1">
            <CreditCard className="w-3.5 h-3.5" />
            {language === 'bn' ? 'আপনার বকেয়া বিল' : 'Current Due Balance'}
          </span>
          <p className="text-base sm:text-lg font-extrabold text-rose-400 font-mono-num mt-1">
            {formatCurrency(myRetailer?.currentDue || 0, language)}
          </p>
          <span className="text-[10px] text-slate-400">
            {language === 'bn' ? 'পরবর্তী চালানে পরিশোধযোগ্য' : 'Payable on next delivery'}
          </span>
        </div>

        <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800">
          <span className="text-[10px] uppercase font-bold text-emerald-400">
            {language === 'bn' ? 'বাকির লিমিট' : 'Approved Credit Limit'}
          </span>
          <p className="text-base sm:text-lg font-extrabold text-emerald-400 font-mono-num mt-1">
            {formatCurrency(myRetailer?.creditLimit || 50000, language)}
          </p>
          <span className="text-[10px] text-slate-400">
            Avail: {formatCurrency((myRetailer?.creditLimit || 50000) - (myRetailer?.currentDue || 0), language)}
          </span>
        </div>

        <div className="col-span-2 sm:col-span-1 p-3.5 rounded-xl bg-slate-900/80 border border-slate-800">
          <span className="text-[10px] uppercase font-bold text-purple-400">
            {language === 'bn' ? 'অর্ডার হিস্টোরি' : 'Total Orders'}
          </span>
          <p className="text-base sm:text-lg font-extrabold text-white font-mono-num mt-1">
            {myOrders.length} {language === 'bn' ? 'টি চালান' : 'Orders'}
          </p>
          <span className="text-[10px] text-slate-400">
            {myClaims.length} {language === 'bn' ? 'টি ড্যামেজ দাবি' : 'damage claims'}
          </span>
        </div>
      </div>

      {isOrderSubmitted && (
        <div className="p-3.5 rounded-xl bg-emerald-950/40 border border-emerald-500/40 text-emerald-300 text-xs flex items-center gap-2 animate-in fade-in">
          <CheckCircle2 className="w-5 h-5 text-emerald-400" />
          <span>
            {language === 'bn'
              ? 'আপনার অর্ডার সফলভাবে পাঠানো হয়েছে! আমাদের ডেলিভারি টিম খুব দ্রুত মাল পৌঁছে দেবে।'
              : 'Your wholesale order has been submitted! Our DSR delivery team will dispatch shortly.'}
          </span>
        </div>
      )}

      {/* Order Catalog */}
      <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-3.5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-2.5">
          <div>
            <h3 className="font-bold text-white text-sm">
              {language === 'bn' ? 'পাইকারি মূল্যে পণ্য অর্ডার করুন' : 'Wholesale Stock Catalog & Self-Order'}
            </h3>
            <p className="text-xs text-slate-400">
              {language === 'bn' ? 'সরাসরি ডিপো থেকে পণ্য কেনার পাইকারি দর' : 'Depot distributor direct trade rates'}
            </p>
          </div>

          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2" />
            <input
              type="text"
              placeholder={t.searchProduct}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-purple-500"
            />
          </div>
        </div>

        {/* Product Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {filteredProducts.map((p) => {
            const qty = orderQtyMap[p.id] || 0;

            return (
              <div
                key={p.id}
                className="p-3 rounded-xl bg-slate-950/70 border border-slate-800 hover:border-purple-500/40 transition flex flex-col justify-between gap-2"
              >
                <div>
                  <div className="flex justify-between items-start gap-1">
                    <h5 className="font-bold text-xs text-white">{p.name}</h5>
                    <span className="text-[10px] font-mono text-slate-400 bg-slate-800 px-1.5 py-0.2 rounded">
                      {p.unit}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-0.5">{p.brand} • {p.category}</p>

                  <div className="flex items-center justify-between mt-2">
                    <span className="text-xs font-bold text-emerald-400 font-mono-num">
                      ৳{p.wholesalePrice} <span className="text-[10px] text-slate-400 font-normal">/ {p.unit}</span>
                    </span>
                    <span className="text-[10px] text-slate-400">
                      Depot Stock: <span className="text-slate-200 font-bold">{p.stockQuantity}</span>
                    </span>
                  </div>
                </div>

                {/* Counter */}
                <div className="flex items-center justify-between pt-2 border-t border-slate-800/80">
                  <span className="text-[11px] text-slate-400">Qty:</span>
                  <div className="flex items-center gap-2 bg-slate-900 border border-slate-700 rounded-lg px-2 py-0.5">
                    <button
                      onClick={() => handleQtyChange(p.id, -1)}
                      className="text-slate-400 hover:text-white font-bold text-sm px-1"
                    >
                      -
                    </button>
                    <span className="font-mono-num font-bold text-xs text-purple-300 w-6 text-center">
                      {qty}
                    </span>
                    <button
                      onClick={() => handleQtyChange(p.id, 1)}
                      className="text-slate-400 hover:text-white font-bold text-sm px-1"
                    >
                      +
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Submit Order Floating Bar */}
        {orderSubtotal > 0 && (
          <div className="p-3.5 rounded-xl bg-gradient-to-r from-purple-950 via-slate-900 to-emerald-950 border border-purple-500/40 flex items-center justify-between gap-3 shadow-2xl animate-in slide-in-from-bottom">
            <div>
              <span className="text-xs text-slate-300">
                {selectedItemsCount} {language === 'bn' ? 'টি আইটেম নির্বাচিত' : 'items in order'}
              </span>
              <div className="text-base font-extrabold text-emerald-400 font-mono-num">
                {formatCurrency(orderSubtotal, language)}
              </div>
            </div>

            <button
              onClick={handleSubmitRetailerOrder}
              id="btn-submit-retailer-order"
              className="py-2.5 px-5 bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs rounded-xl flex items-center gap-2 shadow-lg transition active:scale-95"
            >
              <Send className="w-4 h-4" />
              <span>{language === 'bn' ? 'অর্ডার পাঠিয়ে দিন' : 'Place Depot Order'}</span>
            </button>
          </div>
        )}
      </div>

      {/* Past Invoices / Memos */}
      <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-3">
        <h3 className="font-bold text-white text-xs sm:text-sm flex items-center gap-2">
          <Clock className="w-4 h-4 text-purple-400" />
          <span>{language === 'bn' ? 'আমার পূর্ববর্তী চালান ও বিল' : 'My Previous Invoices'}</span>
        </h3>

        <div className="space-y-2">
          {myOrders.length === 0 ? (
            <div className="py-6 text-center text-slate-500 text-xs">
              No orders placed yet.
            </div>
          ) : (
            myOrders.map((ord) => (
              <div
                key={ord.id}
                className="p-3 rounded-xl bg-slate-950/70 border border-slate-800 flex items-center justify-between gap-2"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs text-white font-bold">{ord.invoiceNo}</span>
                    <span className="text-[10px] text-slate-400">{ord.date}</span>
                  </div>
                  <div className="text-[11px] text-slate-400 mt-0.5">
                    {ord.items.length} items • By {ord.salesPersonName || ord.creatorName || 'Depot Team'}
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="text-right font-mono-num">
                    <span className="text-xs font-bold text-emerald-400 block">
                      {formatCurrency(ord.totalAmount, language)}
                    </span>
                    <span className="text-[10px] text-rose-400">
                      Due: {formatCurrency(ord.dueAmount, language)}
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      const res = generateInvoiceMemoPdf(ord, myRetailer);
                      setPdfPreviewResult(res);
                    }}
                    className="p-2 bg-slate-800 hover:bg-slate-700 text-emerald-400 border border-slate-700 rounded-lg text-xs transition cursor-pointer"
                    title="Invoice PDF"
                  >
                    <FileText className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* PDF Statement Preview & Download Modal */}
      <PdfPreviewModal
        pdfResult={pdfPreviewResult}
        onClose={() => setPdfPreviewResult(null)}
      />
    </div>
  );
};
