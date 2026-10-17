import React, { useState, useRef } from 'react';
import {
  FileText,
  Download,
  Printer,
  X,
  CheckCircle2,
  FileCheck,
  Type,
  ZoomIn,
  ZoomOut,
  RefreshCw,
  Sparkles,
  Building2,
  Share2,
  Smartphone,
} from 'lucide-react';
import { PdfDocumentResult, downloadHtmlAsPdf, printHtmlDocument, shareHtmlAsPdf } from '../utils/pdfExport';
import { useWholesale } from '../context/WholesaleContext';
import { isStandaloneMode, isMobilePlatform, isWebShareSupported } from '../utils/fileSaver';

export interface PdfPreviewModalProps {
  pdfResult: PdfDocumentResult | null;
  onClose: () => void;
}

interface BengaliFontOption {
  id: string;
  nameBn: string;
  nameEn: string;
  fontFamily: string;
  descBn: string;
}

const BENGALI_FONTS: BengaliFontOption[] = [
  {
    id: 'hind-siliguri',
    nameBn: 'হিন্দ শিলিগুড়ি (Hind Siliguri)',
    nameEn: 'Hind Siliguri',
    fontFamily: "'Hind Siliguri', 'Noto Sans Bengali', sans-serif",
    descBn: 'আধুনিক, অত্যন্ত স্পষ্ট ও পরিষ্কার (ডিফল্ট)',
  },
  {
    id: 'noto-sans',
    nameBn: 'নোটো সান্স বাংলা (Noto Sans)',
    nameEn: 'Noto Sans Bengali',
    fontFamily: "'Noto Sans Bengali', 'Hind Siliguri', sans-serif",
    descBn: 'গুগল অফিশিয়াল বাংলা ফন্ট',
  },
  {
    id: 'anek-bangla',
    nameBn: 'অনেক বাংলা (Anek Bangla)',
    nameEn: 'Anek Bangla',
    fontFamily: "'Anek Bangla', 'Hind Siliguri', sans-serif",
    descBn: 'বোল্ড ও পরিষ্কার টাইটেল খাতা ফন্ট',
  },
  {
    id: 'kalpurush',
    nameBn: 'কালপুরুষ (Kalpurush / Classic)',
    nameEn: 'Kalpurush',
    fontFamily: "'Kalpurush', 'Hind Siliguri', sans-serif",
    descBn: 'ঐতিহ্যবাহী বাংলা চালান ও লেজার স্টাইল',
  },
];

export const PdfPreviewModal: React.FC<PdfPreviewModalProps> = ({ pdfResult, onClose }) => {
  const { language, openBusinessProfile } = useWholesale();
  const [selectedFont, setSelectedFont] = useState<BengaliFontOption>(BENGALI_FONTS[0]);
  const [zoomScale, setZoomScale] = useState<number>(100);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string>('');
  const [feedbackInfo, setFeedbackInfo] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const documentContainerRef = useRef<HTMLDivElement>(null);

  const isStandalone = isStandaloneMode();
  const isMobile = isMobilePlatform();
  const canShare = isWebShareSupported('application/pdf');

  if (!pdfResult) return null;

  const handleDownload = async () => {
    setIsGeneratingPdf(true);
    setStatusMessage(language === 'bn' ? 'পিডিএফ তৈরি হচ্ছে...' : 'Generating PDF...');
    setFeedbackInfo(null);
    try {
      const result = await downloadHtmlAsPdf(
        pdfResult.htmlContent,
        pdfResult.filename,
        selectedFont.fontFamily,
        {
          onStatus: (msg) => setStatusMessage(msg),
        }
      );
      if (result && result.success) {
        setFeedbackInfo({
          type: 'success',
          text: result.message || (language === 'bn' ? 'ফাইলটি সফলভাবে সেভ হয়েছে' : 'File saved successfully'),
        });
      } else {
        setFeedbackInfo({
          type: 'success',
          text: language === 'bn' ? 'ডাউনলোড প্রসেস সম্পন্ন হয়েছে' : 'Download completed',
        });
      }
      setTimeout(() => setFeedbackInfo(null), 6000);
    } catch (e: unknown) {
      console.error('Download PDF error:', e);
      setFeedbackInfo({
        type: 'error',
        text: language === 'bn' ? 'ডাউনলোড ব্যর্থ হয়েছে। দয়া করে প্রিন্ট মোড ট্রাই করুন।' : 'Download failed.',
      });
    } finally {
      setIsGeneratingPdf(false);
      setStatusMessage('');
    }
  };

  const handleShare = async () => {
    setIsGeneratingPdf(true);
    setStatusMessage(language === 'bn' ? 'শেয়ার অপশন প্রস্তুত হচ্ছে...' : 'Preparing share...');
    setFeedbackInfo(null);
    try {
      const result = await shareHtmlAsPdf(
        pdfResult.htmlContent,
        pdfResult.filename,
        selectedFont.fontFamily
      );
      if (result && result.success) {
        setFeedbackInfo({
          type: 'success',
          text: result.message || (language === 'bn' ? 'শেয়ার বা সেভ সম্পন্ন হয়েছে' : 'Shared successfully'),
        });
      }
      setTimeout(() => setFeedbackInfo(null), 5000);
    } catch (e: unknown) {
      console.error('Share PDF error:', e);
    } finally {
      setIsGeneratingPdf(false);
      setStatusMessage('');
    }
  };

  const handlePrint = () => {
    printHtmlDocument(pdfResult.htmlContent, selectedFont.fontFamily);
  };

  const zoomIn = () => setZoomScale((prev) => Math.min(prev + 15, 140));
  const zoomOut = () => setZoomScale((prev) => Math.max(prev - 15, 70));
  const resetZoom = () => setZoomScale(100);

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-1 sm:p-3 animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-700/80 rounded-2xl w-full max-w-6xl h-[96vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header Bar */}
        <div className="px-3 sm:px-4 py-2.5 sm:py-3 bg-slate-950 border-b border-slate-800 flex flex-wrap items-center justify-between gap-2.5 shrink-0">
          {/* Title and Badge */}
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0">
              <FileText className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-xs sm:text-sm text-white truncate">
                  {pdfResult.title}
                </h3>
                <span className="hidden sm:inline-block text-[9px] font-mono px-2 py-0.5 rounded-full bg-emerald-950 border border-emerald-500/40 text-emerald-300">
                  HD PRINT & PDF
                </span>
              </div>
              <p className="text-[10.5px] text-slate-400 truncate">
                {pdfResult.subtitle || pdfResult.filename}
              </p>
            </div>
          </div>

          {/* Action Toolbar */}
          <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 ml-auto">
            {/* Bengali Font Selector Dropdown */}
            <div className="flex items-center gap-1.5 bg-slate-900 border border-slate-700/90 rounded-xl px-2.5 py-1.5 shadow-sm">
              <Type className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <span className="text-[11px] font-semibold text-slate-300 hidden md:inline">
                {language === 'bn' ? 'বাংলা ফন্ট:' : 'Font:'}
              </span>
              <select
                value={selectedFont.id}
                onChange={(e) => {
                  const font = BENGALI_FONTS.find((f) => f.id === e.target.value);
                  if (font) setSelectedFont(font);
                }}
                className="bg-transparent text-emerald-300 font-bold text-xs focus:outline-none cursor-pointer pr-1"
                title="Change Bengali Font"
              >
                {BENGALI_FONTS.map((font) => (
                  <option key={font.id} value={font.id} className="bg-slate-900 text-slate-100 py-1">
                    {font.nameBn}
                  </option>
                ))}
              </select>
            </div>

            {/* Zoom Controls */}
            <div className="hidden lg:flex items-center bg-slate-900 border border-slate-700/80 rounded-xl px-1.5 py-1 gap-1">
              <button
                type="button"
                onClick={zoomOut}
                disabled={zoomScale <= 70}
                className="p-1 text-slate-400 hover:text-white disabled:opacity-30 transition"
                title="Zoom Out"
              >
                <ZoomOut className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={resetZoom}
                className="px-1.5 text-[10px] font-mono text-slate-300 hover:text-emerald-300 transition"
                title="Reset Zoom"
              >
                {zoomScale}%
              </button>
              <button
                type="button"
                onClick={zoomIn}
                disabled={zoomScale >= 140}
                className="p-1 text-slate-400 hover:text-white disabled:opacity-30 transition"
                title="Zoom In"
              >
                <ZoomIn className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Pad & Address Settings Button */}
            <button
              type="button"
              onClick={openBusinessProfile}
              id="btn-pdf-modal-settings"
              className="px-2.5 py-1.5 bg-slate-800 hover:bg-amber-950/60 text-amber-300 hover:text-amber-200 border border-slate-700 hover:border-amber-500/40 font-bold text-xs rounded-xl flex items-center gap-1.5 transition active:scale-95 cursor-pointer shadow-sm"
              title={language === 'bn' ? 'অফিশিয়াল প্যাড ও ঠিকানা সেটিংস' : 'Official Pad & Address Settings'}
            >
              <Building2 className="w-3.5 h-3.5 text-amber-400" />
              <span className="hidden sm:inline">{language === 'bn' ? 'প্যাড ও ঠিকানা' : 'Pad & Info'}</span>
            </button>

            {/* Share / WhatsApp / Drive Button (Web Share API for Android/iOS) */}
            {canShare && (
              <button
                type="button"
                onClick={handleShare}
                disabled={isGeneratingPdf}
                id="btn-pdf-modal-share"
                className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-800 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 shadow-md shadow-indigo-950/40 transition active:scale-95 cursor-pointer"
                title={language === 'bn' ? 'হোয়াটসঅ্যাপ বা ড্রাইভে শেয়ার / সেভ করুন' : 'Share PDF to WhatsApp, Drive, or Files'}
              >
                <Share2 className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">{language === 'bn' ? 'শেয়ার / হোয়াটসঅ্যাপ' : 'Share'}</span>
              </button>
            )}

            {/* Print Button */}
            <button
              type="button"
              onClick={handlePrint}
              id="btn-pdf-modal-print"
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-bold text-xs rounded-xl flex items-center gap-1.5 transition active:scale-95 cursor-pointer shadow-sm"
              title="Print High Definition Document"
            >
              <Printer className="w-3.5 h-3.5 text-indigo-400" />
              <span className="hidden sm:inline">{language === 'bn' ? 'প্রিন্ট' : 'Print'}</span>
            </button>

            {/* Download PDF Button */}
            <button
              type="button"
              onClick={handleDownload}
              disabled={isGeneratingPdf}
              id="btn-pdf-modal-download"
              className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 disabled:bg-emerald-800 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 shadow-md shadow-emerald-950/40 transition active:scale-95 cursor-pointer"
              title={language === 'bn' ? 'ডিভাইসে পিডিএফ ডাউনলোড বা সেভ করুন' : 'Download PDF File'}
            >
              {isGeneratingPdf ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>{statusMessage || (language === 'bn' ? 'পিডিএফ হচ্ছে...' : 'Generating...')}</span>
                </>
              ) : (
                <>
                  <Download className="w-3.5 h-3.5" />
                  <span>{language === 'bn' ? 'পিডিএফ ডাউনলোড' : 'Download PDF'}</span>
                </>
              )}
            </button>

            {/* Close Button */}
            <button
              type="button"
              onClick={onClose}
              id="btn-pdf-modal-close"
              className="p-1.5 bg-slate-800 hover:bg-rose-950/60 hover:text-rose-300 text-slate-400 border border-slate-700 hover:border-rose-500/40 rounded-xl text-xs transition cursor-pointer"
              title="Close Preview"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Font Info & Toast Notification Banner */}
        <div className="px-3 sm:px-4 py-2 bg-slate-950/90 border-b border-slate-800/80 flex flex-wrap items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-2 text-slate-400 text-[11px]">
            <Sparkles className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            <span>
              {language === 'bn' ? 'বর্তমান সক্রিয় ফন্ট:' : 'Active Font:'}{' '}
              <strong className="text-emerald-300">{selectedFont.nameBn}</strong>
            </span>
            {isStandalone && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-950/80 border border-emerald-500/30 text-emerald-300 text-[10px] font-semibold">
                <Smartphone className="w-3 h-3" />
                {language === 'bn' ? 'অ্যাপ মোড' : 'App Mode'}
              </span>
            )}
          </div>

          {/* Status / Feedback messages */}
          {statusMessage && (
            <div className="px-2.5 py-1 rounded-lg bg-sky-950/90 border border-sky-500/40 text-sky-300 text-[11px] flex items-center gap-1.5 animate-in fade-in">
              <RefreshCw className="w-3 h-3 animate-spin text-sky-400" />
              <span>{statusMessage}</span>
            </div>
          )}

          {feedbackInfo && (
            <div
              className={`px-3 py-1 rounded-lg text-[11px] font-medium flex items-center gap-1.5 animate-in fade-in ${
                feedbackInfo.type === 'success'
                  ? 'bg-emerald-950 border border-emerald-500/40 text-emerald-200'
                  : 'bg-rose-950 border border-rose-500/40 text-rose-200'
              }`}
            >
              {feedbackInfo.type === 'success' ? (
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              ) : (
                <X className="w-3.5 h-3.5 text-rose-400 shrink-0" />
              )}
              <span>{feedbackInfo.text}</span>
            </div>
          )}
        </div>

        {/* Interactive Paper Preview Viewport */}
        <div className="flex-1 bg-slate-950 p-2 sm:p-6 overflow-auto flex justify-center items-start">
          <div
            style={{
              transform: `scale(${zoomScale / 100})`,
              transformOrigin: 'top center',
              transition: 'transform 0.15s ease-out',
            }}
            className="shrink-0"
          >
            {/* A4 Paper Sheet Representation */}
            <div
              ref={documentContainerRef}
              style={{
                fontFamily: selectedFont.fontFamily,
              }}
              className="bg-white text-slate-900 shadow-2xl rounded-sm border border-slate-300 overflow-hidden select-text transition-all"
              dangerouslySetInnerHTML={{ __html: pdfResult.htmlContent }}
            />
          </div>
        </div>

        {/* Bottom Sub-bar */}
        <div className="px-4 py-2 bg-slate-950/95 border-t border-slate-800/80 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-slate-400 shrink-0">
          <div className="flex items-center gap-2">
            <FileCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            <span className="text-[11px] truncate">
              {language === 'bn'
                ? 'বাংলা যুক্তাক্ষর ও কারচিহ্নসহ ১০০% নির্ভুল হাই-রেজোলিউশন অফিশিয়াল লেজার কপি'
                : '100% accurate Bengali Unicode typography with high-resolution vector print support'}
            </span>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <span className="text-[11px] font-mono text-slate-500">
              {pdfResult.filename}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
