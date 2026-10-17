import React, { useState, useMemo } from 'react';
import { useWholesale } from '../context/WholesaleContext';
import { ActivityActionType, ActivityLog, UserRole } from '../types';
import { saveFileBlob } from '../utils/fileSaver';
import {
  History,
  ArrowRightLeft,
  FileText,
  DollarSign,
  Truck,
  Package,
  RotateCcw,
  UserCheck,
  Search,
  Filter,
  Clock,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  XCircle,
  SlidersHorizontal,
  ChevronDown,
  ChevronUp,
  Download,
  Calendar,
  Sparkles,
  ShieldCheck,
  Layers,
  Trash2,
  X
} from 'lucide-react';

interface RecentActivityPanelProps {
  limit?: number;
  showFilters?: boolean;
  className?: string;
  onViewAll?: () => void;
}

export const RecentActivityPanel: React.FC<RecentActivityPanelProps> = ({
  limit,
  showFilters = true,
  className = '',
  onViewAll
}) => {
  const { activityLogs, language, users, currentUser, currentRole, clearAllActivityLogs, deleteActivityLog } = useWholesale();
  const isBn = language === 'bn';
  const isAdmin = currentRole === 'admin' || currentUser.role === 'admin';

  const [selectedActionType, setSelectedActionType] = useState<string>('ALL');
  const [selectedRole, setSelectedRole] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [expandedLogId, setExpandedLogId] = useState<string | null>(null);
  const [isConfirmClearModalOpen, setIsConfirmClearModalOpen] = useState<boolean>(false);
  const [actionSuccessMsg, setActionSuccessMsg] = useState<string | null>(null);

  // Filter and Search logs
  const filteredLogs = useMemo(() => {
    return activityLogs.filter((log) => {
      // Action Type filter
      if (selectedActionType !== 'ALL') {
        if (selectedActionType === 'TRANSFERS' && log.actionType !== 'CASH_TRANSFER') return false;
        if (selectedActionType === 'INVOICES' && log.actionType !== 'INVOICE_CREATE') return false;
        if (
          selectedActionType === 'BALANCES' &&
          log.actionType !== 'BALANCE_UPDATE' &&
          log.actionType !== 'CAPITAL_TRANSACTION'
        )
          return false;
        if (
          selectedActionType === 'SUPPLIERS' &&
          log.actionType !== 'SUPPLIER_PAYMENT' &&
          log.actionType !== 'STOCK_UPDATE'
        )
          return false;
      }

      // Role filter
      if (selectedRole !== 'ALL' && log.actorRole !== selectedRole) {
        return false;
      }

      // Search Query filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchTitle = log.title?.toLowerCase().includes(q) || log.bnTitle?.toLowerCase().includes(q);
        const matchDesc = log.description?.toLowerCase().includes(q) || log.bnDescription?.toLowerCase().includes(q);
        const matchActor = log.actorName?.toLowerCase().includes(q) || log.actorPhone?.includes(q);
        const matchRelated = log.relatedId?.toLowerCase().includes(q);
        if (!matchTitle && !matchDesc && !matchActor && !matchRelated) return false;
      }

      return true;
    });
  }, [activityLogs, selectedActionType, selectedRole, searchQuery]);

  const displayedLogs = limit ? filteredLogs.slice(0, limit) : filteredLogs;

  const toggleExpand = (id: string) => {
    setExpandedLogId((prev) => (prev === id ? null : id));
  };

  const getActionConfig = (type: ActivityActionType) => {
    switch (type) {
      case 'CASH_TRANSFER':
        return {
          icon: ArrowRightLeft,
          color: 'text-emerald-700 dark:text-emerald-400',
          bg: 'bg-emerald-50 dark:bg-emerald-950/50 border-emerald-200 dark:border-emerald-800',
          badge: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-300',
          labelEn: 'Cash Transfer',
          labelBn: 'ক্যাশ হস্তান্তর',
        };
      case 'INVOICE_CREATE':
        return {
          icon: FileText,
          color: 'text-blue-700 dark:text-blue-400',
          bg: 'bg-blue-50 dark:bg-blue-950/50 border-blue-200 dark:border-blue-800',
          badge: 'bg-blue-100 text-blue-800 dark:bg-blue-900/60 dark:text-blue-300',
          labelEn: 'Sales Invoice',
          labelBn: 'বিক্রয় চালান',
        };
      case 'BALANCE_UPDATE':
      case 'CAPITAL_TRANSACTION':
        return {
          icon: DollarSign,
          color: 'text-amber-700 dark:text-amber-400',
          bg: 'bg-amber-50 dark:bg-amber-950/50 border-amber-200 dark:border-amber-800',
          badge: 'bg-amber-100 text-amber-800 dark:bg-amber-900/60 dark:text-amber-300',
          labelEn: 'Balance Audit',
          labelBn: 'ব্যালেন্স অডিট',
        };
      case 'SUPPLIER_PAYMENT':
        return {
          icon: Truck,
          color: 'text-purple-700 dark:text-purple-400',
          bg: 'bg-purple-50 dark:bg-purple-950/50 border-purple-200 dark:border-purple-800',
          badge: 'bg-purple-100 text-purple-800 dark:bg-purple-900/60 dark:text-purple-300',
          labelEn: 'Supplier Payment',
          labelBn: 'সাপ্লায়ার বিল পরিশোধ',
        };
      case 'STOCK_UPDATE':
        return {
          icon: Package,
          color: 'text-cyan-700 dark:text-cyan-400',
          bg: 'bg-cyan-50 dark:bg-cyan-950/50 border-cyan-200 dark:border-cyan-800',
          badge: 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900/60 dark:text-cyan-300',
          labelEn: 'Stock Inventory',
          labelBn: 'স্টক সংযোজন',
        };
      case 'REPLACEMENT_RESOLVED':
        return {
          icon: RotateCcw,
          color: 'text-rose-700 dark:text-rose-400',
          bg: 'bg-rose-50 dark:bg-rose-950/50 border-rose-200 dark:border-rose-800',
          badge: 'bg-rose-100 text-rose-800 dark:bg-rose-900/60 dark:text-rose-300',
          labelEn: 'Replacement Claim',
          labelBn: 'রিপ্লেসমেন্ট দাবি',
        };
      case 'STAFF_ACTION':
        return {
          icon: UserCheck,
          color: 'text-indigo-700 dark:text-indigo-400',
          bg: 'bg-indigo-50 dark:bg-indigo-950/50 border-indigo-200 dark:border-indigo-800',
          badge: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/60 dark:text-indigo-300',
          labelEn: 'Staff Update',
          labelBn: 'কর্মী তথ্য আপডেট',
        };
      default:
        return {
          icon: ShieldCheck,
          color: 'text-gray-700 dark:text-gray-300',
          bg: 'bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700',
          badge: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200',
          labelEn: 'General Action',
          labelBn: 'সাধারণ কার্যক্রম',
        };
    }
  };

  const getRoleBadge = (role: UserRole) => {
    switch (role) {
      case 'admin':
        return {
          bg: 'bg-red-50 text-red-700 border-red-200 dark:bg-red-950/50 dark:text-red-300 dark:border-red-800',
          label: isBn ? 'এডমিন' : 'ADMIN',
        };
      case 'counter':
        return {
          bg: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/50 dark:text-blue-300 dark:border-blue-800',
          label: isBn ? 'ক্যাশ কাউন্টার' : 'COUNTER',
        };
      case 'dsr':
        return {
          bg: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-800',
          label: isBn ? 'ডিএসআর' : 'DSR',
        };
    }
  };

  const getStatusBadge = (status?: string) => {
    switch (status) {
      case 'COMPLETED':
        return {
          icon: CheckCircle2,
          color: 'text-emerald-600 dark:text-emerald-400',
          bg: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300',
          label: isBn ? 'সম্পন্ন' : 'Completed',
        };
      case 'PENDING':
        return {
          icon: Clock,
          color: 'text-amber-600 dark:text-amber-400',
          bg: 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300',
          label: isBn ? 'অপেক্ষমাণ' : 'Pending',
        };
      case 'REJECTED':
        return {
          icon: XCircle,
          color: 'text-rose-600 dark:text-rose-400',
          bg: 'bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300',
          label: isBn ? 'বাতিল' : 'Rejected',
        };
      case 'ADJUSTED':
        return {
          icon: SlidersHorizontal,
          color: 'text-indigo-600 dark:text-indigo-400',
          bg: 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300',
          label: isBn ? 'সমন্বয়কৃত' : 'Adjusted',
        };
      default:
        return null;
    }
  };

  const formatTimeAgo = (dateStr: string) => {
    try {
      const now = new Date();
      const past = new Date(dateStr);
      const diffMs = now.getTime() - past.getTime();
      const diffMins = Math.floor(diffMs / 60000);
      const diffHours = Math.floor(diffMins / 60);
      const diffDays = Math.floor(diffHours / 24);

      if (diffMins < 1) return isBn ? 'এইমাত্র' : 'Just now';
      if (diffMins < 60) return isBn ? `${diffMins} মিনিট আগে` : `${diffMins}m ago`;
      if (diffHours < 24) return isBn ? `${diffHours} ঘণ্টা আগে` : `${diffHours}h ago`;
      return isBn ? `${diffDays} দিন আগে` : `${diffDays}d ago`;
    } catch {
      return dateStr;
    }
  };

  const formatExactDate = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString(isBn ? 'bn-BD' : 'en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return dateStr;
    }
  };

  const exportAuditCsv = () => {
    const headers = ['ID', 'Timestamp', 'Action Type', 'Actor Role', 'Actor Name', 'Title', 'Description', 'Amount', 'Status'];
    const rows = filteredLogs.map((log) => [
      log.id,
      log.timestamp,
      log.actionType,
      log.actorRole,
      `"${log.actorName || ''}"`,
      `"${log.title || ''}"`,
      `"${(log.description || '').replace(/"/g, '""')}"`,
      log.amount || 0,
      log.status || '',
    ]);

    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8' });
    const filename = `wholesale_audit_log_${new Date().toISOString().slice(0, 10)}.csv`;
    saveFileBlob(blob, filename, 'text/csv', {
      title: 'মাতৃছায়া টেলিকম অডিট লগ CSV',
    });
  };

  return (
    <div
      id="recent-activity-panel"
      className={`bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm overflow-hidden flex flex-col ${className}`}
    >
      {/* Top Header */}
      <div className="p-4 sm:p-5 border-b border-gray-100 dark:border-gray-800 flex flex-wrap items-center justify-between gap-3 bg-gradient-to-r from-gray-50/70 via-white to-gray-50/70 dark:from-gray-900 dark:via-gray-900/90 dark:to-gray-900">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-100 dark:border-indigo-800 flex items-center justify-center text-indigo-600 dark:text-indigo-400 shadow-xs">
            <History className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-gray-900 dark:text-white text-base sm:text-lg">
                {isBn ? 'সাম্প্রতিক কার্যক্রম ও অডিট লগ' : 'Recent Activity & Audit Trail'}
              </h3>
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300">
                {filteredLogs.length}
              </span>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {isBn
                ? 'ক্যাশ হস্তান্তর, বিক্রয় চালান ও ব্যালেন্স পরিবর্তনের রিয়েল-টাইম হিস্ট্রি'
                : 'Real-time trace of cash transfers, sales invoices & balance adjustments'}
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2 ml-auto">
          {/* Admin Clear All Logs Button */}
          {isAdmin && activityLogs.length > 0 && (
            <button
              onClick={() => setIsConfirmClearModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-rose-200 dark:border-rose-900/60 bg-rose-50 dark:bg-rose-950/40 text-xs font-semibold text-rose-700 dark:text-rose-300 hover:bg-rose-100 dark:hover:bg-rose-900/60 transition-colors shadow-xs"
              title={isBn ? 'সমস্ত অডিট লগ মুছে ফেলুন' : 'Clear All Audit Logs'}
            >
              <Trash2 className="w-3.5 h-3.5 text-rose-500" />
              <span className="hidden sm:inline">{isBn ? 'লগ ক্লিয়ার করুন' : 'Clear All Logs'}</span>
            </button>
          )}

          <button
            onClick={exportAuditCsv}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-xs font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors shadow-xs"
            title={isBn ? 'অডিট রিপোর্ট সিএসভি ডাউনলোড' : 'Download Audit CSV'}
          >
            <Download className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">{isBn ? 'সিএসভি ডাউনলোড' : 'Export Log'}</span>
          </button>

          {limit && onViewAll && (
            <button
              onClick={onViewAll}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/50 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400 text-xs font-semibold transition-colors"
            >
              {isBn ? 'সবগুলো দেখুন' : 'View All'}
            </button>
          )}
        </div>
      </div>

      {/* Success Notification Banner */}
      {actionSuccessMsg && (
        <div className="p-3 bg-emerald-500/20 border-b border-emerald-500/40 text-emerald-300 text-xs font-semibold flex items-center justify-between gap-2 px-5">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{actionSuccessMsg}</span>
          </div>
          <button onClick={() => setActionSuccessMsg(null)} className="text-emerald-400 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Filter and Search Bar */}
      {showFilters && (
        <div className="p-3 sm:p-4 bg-gray-50/50 dark:bg-gray-850/50 border-b border-gray-100 dark:border-gray-800 flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
          {/* Action Type Filter Chips */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
            <button
              onClick={() => setSelectedActionType('ALL')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
                selectedActionType === 'ALL'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-700'
              }`}
            >
              {isBn ? 'সকল কার্যকলাপ' : 'All Activity'}
            </button>
            <button
              onClick={() => setSelectedActionType('TRANSFERS')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
                selectedActionType === 'TRANSFERS'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-700'
              }`}
            >
              <span className="flex items-center gap-1">
                <ArrowRightLeft className="w-3 h-3" />
                {isBn ? 'ক্যাশ হস্তান্তর' : 'Cash Transfers'}
              </span>
            </button>
            <button
              onClick={() => setSelectedActionType('INVOICES')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
                selectedActionType === 'INVOICES'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-700'
              }`}
            >
              <span className="flex items-center gap-1">
                <FileText className="w-3 h-3" />
                {isBn ? 'চালান তৈরি' : 'Invoices'}
              </span>
            </button>
            <button
              onClick={() => setSelectedActionType('BALANCES')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
                selectedActionType === 'BALANCES'
                  ? 'bg-amber-600 text-white shadow-xs'
                  : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-700'
              }`}
            >
              <span className="flex items-center gap-1">
                <DollarSign className="w-3 h-3" />
                {isBn ? 'ব্যালেন্স অডিট' : 'Balance Adjust'}
              </span>
            </button>
            <button
              onClick={() => setSelectedActionType('SUPPLIERS')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
                selectedActionType === 'SUPPLIERS'
                  ? 'bg-purple-600 text-white shadow-xs'
                  : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-700'
              }`}
            >
              <span className="flex items-center gap-1">
                <Truck className="w-3 h-3" />
                {isBn ? 'সাপ্লায়ার' : 'Suppliers'}
              </span>
            </button>
          </div>

          {/* Search & Role Filters */}
          <div className="flex items-center gap-2">
            {/* Role Filter */}
            <select
              value={selectedRole}
              onChange={(e) => setSelectedRole(e.target.value)}
              aria-label={isBn ? 'রোল নির্বাচন করুন' : 'Filter by role'}
              className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-2.5 py-1.5 text-xs text-gray-700 dark:text-gray-300 font-medium focus:ring-2 focus:ring-indigo-500 outline-none"
            >
              <option value="ALL">{isBn ? 'সকল ইউজার রোল' : 'All Roles'}</option>
              <option value="admin">{isBn ? 'এডমিন (Admin)' : 'Admin'}</option>
              <option value="counter">{isBn ? 'ক্যাশ কাউন্টার (Counter)' : 'Counter'}</option>
              <option value="dsr">{isBn ? 'ডিএসআর (DSR)' : 'DSR'}</option>
            </select>

            {/* Search Input */}
            <div className="relative flex-1 sm:w-48">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={isBn ? 'লগ অনুসন্ধান...' : 'Search logs...'}
                className="w-full pl-8 pr-3 py-1.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-xs text-gray-800 dark:text-gray-200 placeholder-gray-400 focus:ring-2 focus:ring-indigo-500 outline-none"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 text-xs"
                >
                  ×
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Activity Logs Stream */}
      <div className="divide-y divide-gray-100 dark:divide-gray-800 max-h-[520px] overflow-y-auto">
        {displayedLogs.length === 0 ? (
          <div className="py-12 px-4 text-center">
            <div className="w-12 h-12 mx-auto rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-gray-400 mb-3">
              <Layers className="w-6 h-6" />
            </div>
            <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">
              {isBn ? 'কোন কার্যকলাপ পাওয়া যায়নি' : 'No activity logs found'}
            </p>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-1 max-w-sm mx-auto">
              {isBn
                ? 'নির্বাচিত ফিল্টারের সাথে মিলে এমন কোন লগ পাওয়া যায়নি অথবা এখনো কোন নতুন লেনদেন সম্পন্ন হয়নি।'
                : 'No actions match the current filter or no activity has been logged yet.'}
            </p>
          </div>
        ) : (
          displayedLogs.map((log) => {
            const config = getActionConfig(log.actionType);
            const roleBadge = getRoleBadge(log.actorRole);
            const statusBadge = getStatusBadge(log.status);
            const isExpanded = expandedLogId === log.id;
            const Icon = config.icon;

            return (
              <div
                key={log.id}
                className="p-3.5 sm:p-4 hover:bg-gray-50/70 dark:hover:bg-gray-850/60 transition-colors"
              >
                <div className="flex items-start gap-3">
                  {/* Action Icon Badge */}
                  <div
                    className={`w-9 h-9 rounded-xl border flex-shrink-0 flex items-center justify-center ${config.bg} ${config.color} mt-0.5`}
                  >
                    <Icon className="w-4 h-4" />
                  </div>

                  {/* Main Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center justify-between gap-1.5 mb-1">
                      <div className="flex flex-wrap items-center gap-2">
                        {/* Action Title */}
                        <h4 className="text-xs sm:text-sm font-bold text-gray-900 dark:text-white">
                          {isBn ? log.bnTitle || log.title : log.title}
                        </h4>

                        {/* Amount Badge if present */}
                        {log.amount !== undefined && log.amount > 0 && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800">
                            ৳{log.amount.toLocaleString()}
                          </span>
                        )}

                        {/* Status Badge */}
                        {statusBadge && (
                          <span
                            className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[11px] font-medium ${statusBadge.bg}`}
                          >
                            <statusBadge.icon className="w-3 h-3" />
                            {statusBadge.label}
                          </span>
                        )}
                      </div>

                      {/* Timestamp */}
                      <div className="flex items-center gap-1.5 text-xs text-gray-400 dark:text-gray-500 whitespace-nowrap ml-auto">
                        <Clock className="w-3 h-3" />
                        <span title={formatExactDate(log.timestamp)}>
                          {formatTimeAgo(log.timestamp)}
                        </span>
                      </div>
                    </div>

                    {/* Description */}
                    <p className="text-xs text-gray-600 dark:text-gray-300 leading-relaxed mb-2">
                      {isBn ? log.bnDescription || log.description : log.description}
                    </p>

                    {/* Meta Bar: Actor, Role, Reference, Expand Details */}
                    <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                      <div className="flex flex-wrap items-center gap-2">
                        {/* Actor Name & Role */}
                        <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-xs">
                          <UserCheck className="w-3 h-3 text-gray-500" />
                          <span className="font-semibold text-gray-800 dark:text-gray-200">
                            {log.actorName || log.actorPhone}
                          </span>
                          <span
                            className={`px-1.5 py-0.2 rounded text-[10px] font-bold uppercase ${roleBadge.bg}`}
                          >
                            {roleBadge.label}
                          </span>
                        </div>

                        {/* Reference / Invoice / Transfer ID */}
                        {log.relatedId && (
                          <span className="text-[11px] font-mono font-medium px-2 py-0.5 rounded bg-gray-50 dark:bg-gray-800/80 text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-gray-700">
                            Ref: {log.relatedId}
                          </span>
                        )}
                      </div>

                      {/* Action buttons: Toggle Details & Delete */}
                      <div className="flex items-center gap-2">
                        {log.metadata && Object.keys(log.metadata).length > 0 && (
                          <button
                            onClick={() => toggleExpand(log.id)}
                            className="inline-flex items-center gap-1 text-[11px] font-medium text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 transition-colors"
                          >
                            {isExpanded ? (
                              <>
                                {isBn ? 'কম তথ্য' : 'Less info'}
                                <ChevronUp className="w-3 h-3" />
                              </>
                            ) : (
                              <>
                                {isBn ? 'বিস্তারিত অডিট' : 'Audit details'}
                                <ChevronDown className="w-3 h-3" />
                              </>
                            )}
                          </button>
                        )}

                        {isAdmin && (
                          <button
                            onClick={() => {
                              deleteActivityLog(log.id);
                              setActionSuccessMsg(isBn ? 'লগটি সফলভাবে মুছে ফেলা হয়েছে!' : 'Activity log removed!');
                              setTimeout(() => setActionSuccessMsg(null), 3000);
                            }}
                            className="p-1 rounded hover:bg-rose-50 dark:hover:bg-rose-950/40 text-gray-400 hover:text-rose-500 transition-colors"
                            title={isBn ? 'এই লগটি মুছুন' : 'Delete this log entry'}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Expandable Audit Metadata */}
                    {isExpanded && log.metadata && (
                      <div className="mt-2.5 p-2.5 rounded-lg bg-gray-50 dark:bg-gray-800/60 border border-gray-100 dark:border-gray-750 text-xs space-y-1 animate-fadeIn">
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-gray-600 dark:text-gray-300">
                          <div>
                            <span className="text-gray-400 dark:text-gray-500 block text-[10px]">
                              {isBn ? 'সঠিক সময়' : 'Exact Time'}
                            </span>
                            <span className="font-mono text-[11px]">{formatExactDate(log.timestamp)}</span>
                          </div>
                          {log.actorPhone && (
                            <div>
                              <span className="text-gray-400 dark:text-gray-500 block text-[10px]">
                                {isBn ? 'মোবাইল নম্বর' : 'Phone Number'}
                              </span>
                              <span className="font-mono text-[11px]">{log.actorPhone}</span>
                            </div>
                          )}
                          {Object.entries(log.metadata).map(([k, v]) => (
                            <div key={k}>
                              <span className="text-gray-400 dark:text-gray-500 block text-[10px] uppercase">
                                {k}
                              </span>
                              <span className="font-mono text-[11px] truncate block">
                                {typeof v === 'object' ? JSON.stringify(v) : String(v)}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Footer Audit Summary */}
      <div className="p-3 bg-gray-50 dark:bg-gray-850 border-t border-gray-100 dark:border-gray-800 flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
        <div className="flex items-center gap-1.5">
          <ShieldCheck className="w-4 h-4 text-indigo-500" />
          <span>
            {isBn
              ? 'নিরাপদ ক্লাউড ডাটাবেজ দ্বারা অডিট লগ সংরক্ষিত'
              : 'Secure tamper-evident activity ledger'}
          </span>
        </div>
        <span className="font-mono text-[11px]">
          {isBn
            ? `প্রদর্শিত: ${displayedLogs.length} / মোট: ${activityLogs.length}`
            : `Showing: ${displayedLogs.length} of ${activityLogs.length}`}
        </span>
      </div>

      {/* Secondary Confirmation Modal for Clearing All Logs */}
      {isConfirmClearModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl p-6 space-y-4 animate-in zoom-in-95 duration-200">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-rose-500/20 border border-rose-500/30 flex items-center justify-center text-rose-400 shrink-0">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <h4 className="font-bold text-base text-gray-900 dark:text-white">
                  {isBn ? 'সমস্ত অডিট লগ মুছে ফেলতে চান?' : 'Clear All Activity Logs?'}
                </h4>
                <p className="text-xs text-rose-600 dark:text-rose-400 font-semibold">
                  {isBn ? '⚠️ এই কাজটি আর পূর্বাবস্থায় ফিরিয়ে আনা সম্ভব নয়!' : '⚠️ This action is permanent and cannot be undone!'}
                </p>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-300 space-y-2">
              <p>
                {isBn
                  ? `আপনি কি নিশ্চিত যে আপনি সমস্ত (${activityLogs.length} টি) কার্যকলাপের লগ স্থায়ীভাবে মুছে ফেলতে চান?`
                  : `Are you sure you want to permanently delete all ${activityLogs.length} activity audit log records?`}
              </p>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                {isBn
                  ? 'ক্যাশ ব্যালেন্স বা প্রোডাক্ট স্টকে কোনো প্রভাব পড়বে না, শুধুমাত্র হিস্ট্রি তালিকা খালি হবে।'
                  : 'Your live balances, products, and invoices will not be modified, only the historical audit log ledger will be cleared.'}
              </p>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setIsConfirmClearModalOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
              >
                {isBn ? 'বাতিল করুন' : 'Cancel'}
              </button>
              <button
                type="button"
                onClick={() => {
                  clearAllActivityLogs();
                  setIsConfirmClearModalOpen(false);
                  setActionSuccessMsg(
                    isBn ? 'সমস্ত অডিট লগ সফলভাবে মুছে ফেলা হয়েছে!' : 'All activity audit logs cleared successfully!'
                  );
                  setTimeout(() => setActionSuccessMsg(null), 4000);
                }}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-bold transition shadow flex items-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>{isBn ? 'হ্যাঁ, সব লগ মুছুন' : 'Yes, Clear All Logs'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RecentActivityPanel;
