import React, { useState } from 'react';
import {
  CreditCard,
  Search,
  Printer,
  FileText,
  RotateCcw,
  Download,
  Filter,
  AlertTriangle,
  CheckCircle2,
  Receipt as ReceiptIcon,
} from 'lucide-react';
import { PaymentTransaction, Receipt, Branch, RefundRecord } from '../../types';
import { storageService } from '../../services/storageService';
import { RefundModal } from './RefundModal';
import { PrintService } from '../../services/printService';

interface PaymentLedgerViewProps {
  transactions: PaymentTransaction[];
  branches: Branch[];
  onOpenNewPayment: () => void;
  onViewReceipt: (receipt: Receipt) => void;
}

export const PaymentLedgerView: React.FC<PaymentLedgerViewProps> = ({
  transactions,
  branches,
  onOpenNewPayment,
  onViewReceipt,
}) => {
  const [activeTab, setActiveTab] = useState<'transactions' | 'refunds'>('transactions');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedBranchId, setSelectedBranchId] = useState<string>('all');
  const [isRefundModalOpen, setIsRefundModalOpen] = useState<boolean>(false);
  const [targetRefundTx, setTargetRefundTx] = useState<PaymentTransaction | null>(null);

  const refunds: RefundRecord[] = storageService.getRefunds();

  const filteredTransactions = transactions.filter((tx) => {
    if (selectedBranchId !== 'all' && tx.branchId !== selectedBranchId) return false;
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      const matchTrainee = tx.traineeName.toLowerCase().includes(term);
      const matchReceipt = tx.receiptNumber.toLowerCase().includes(term);
      const matchRef = tx.referenceNumber.toLowerCase().includes(term);
      if (!matchTrainee && !matchReceipt && !matchRef) return false;
    }
    return true;
  });

  const filteredRefunds = refunds.filter((rf) => {
    if (selectedBranchId !== 'all' && rf.branchId !== selectedBranchId) return false;
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      if (
        !rf.traineeName.toLowerCase().includes(term) &&
        !rf.receiptNumber.toLowerCase().includes(term) &&
        !rf.reason.toLowerCase().includes(term)
      ) {
        return false;
      }
    }
    return true;
  });

  const totalCollected = filteredTransactions.reduce((sum, tx) => sum + (tx.totalAmount || 0), 0);
  const totalMembership = filteredTransactions.reduce((sum, tx) => sum + (tx.membershipAmount || tx.allocation?.generalMembershipAmount || 0), 0);
  const totalPT = filteredTransactions.reduce((sum, tx) => sum + (tx.ptAmount || tx.allocation?.ptAmount || 0), 0);
  const totalRefunded = filteredRefunds.reduce((sum, rf) => sum + (rf.amount || 0), 0);
  const totalTrainerClawback = filteredRefunds.reduce(
    (sum, rf) => sum + (rf.trainerCommissionAdjustment || 0),
    0
  );

  const handleRowClick = (tx: PaymentTransaction) => {
    const r = storageService.getReceiptByNumber(tx.receiptNumber);
    if (r) onViewReceipt(r);
  };

  const handleOpenRefundForTx = (tx: PaymentTransaction) => {
    setTargetRefundTx(tx);
    setIsRefundModalOpen(true);
  };

  const handleExportPDF = () => {
    const branchName =
      selectedBranchId === 'all'
        ? 'Consolidated (All Branches)'
        : branches.find((b) => b.id === selectedBranchId)?.name || 'Branch';

    if (activeTab === 'transactions') {
      const txRows = filteredTransactions.map((tx) => [
        tx.receiptNumber,
        tx.traineeName,
        tx.paymentDate,
        tx.paymentMethod,
        `₹${(tx.membershipAmount || tx.allocation?.generalMembershipAmount || 0).toLocaleString('en-IN')}`,
        `₹${(tx.ptAmount || tx.allocation?.ptAmount || 0).toLocaleString('en-IN')}`,
        `₹${(tx.totalAmount || 0).toLocaleString('en-IN')}`,
        tx.isRefunded ? 'REFUNDED' : 'SETTLED',
      ]);

      PrintService.printReportDocument({
        title: 'Commercial Payment & Revenue Ledger',
        subtitle: 'Strict Segregation Compliance Audit (Sections 60, 70, 72)',
        branchName,
        dateRange: `Audit As Of ${new Date().toLocaleDateString('en-IN')}`,
        kpis: [
          {
            label: 'Total Collections',
            value: `₹${totalCollected.toLocaleString('en-IN')}`,
            subtext: `${filteredTransactions.length} Transactions`,
          },
          {
            label: 'General Membership',
            value: `₹${totalMembership.toLocaleString('en-IN')}`,
            subtext: '100% Gym Retained',
          },
          {
            label: 'Personal Training',
            value: `₹${totalPT.toLocaleString('en-IN')}`,
            subtext: 'Segregated PT Stream',
          },
          {
            label: 'Audited Refunds',
            value: `₹${totalRefunded.toLocaleString('en-IN')}`,
            subtext: 'Section 70 Clawbacks',
          },
        ],
        tables: [
          {
            title: 'Payment Transactions Register',
            headers: [
              'Receipt #',
              'Trainee',
              'Date',
              'Mode',
              'Gen. Membership',
              'PT Stream',
              'Total Paid',
              'Status',
            ],
            rows: txRows,
            summaryRow: [
              'TOTALS',
              `${filteredTransactions.length} Records`,
              '-',
              '-',
              `₹${totalMembership.toLocaleString('en-IN')}`,
              `₹${totalPT.toLocaleString('en-IN')}`,
              `₹${totalCollected.toLocaleString('en-IN')}`,
              'AUDITED',
            ],
          },
        ],
      });
    } else {
      const refundRows = filteredRefunds.map((rf) => [
        rf.receiptNumber,
        rf.traineeName,
        rf.refundDate,
        rf.policyApplied,
        `₹${(rf.amount || 0).toLocaleString('en-IN')}`,
        `₹${(rf.trainerCommissionAdjustment || 0).toLocaleString('en-IN')}`,
        `₹${(rf.branchRevenueAdjustment || 0).toLocaleString('en-IN')}`,
        rf.reason,
      ]);

      PrintService.printReportDocument({
        title: 'Audited Refunds & Clawbacks Register',
        subtitle: 'Section 70 Refund Protocol & Trainer Commission Clawbacks',
        branchName,
        dateRange: `Audit As Of ${new Date().toLocaleDateString('en-IN')}`,
        kpis: [
          {
            label: 'Total Refunded',
            value: `₹${totalRefunded.toLocaleString('en-IN')}`,
            subtext: `${filteredRefunds.length} Refunds Processed`,
          },
          {
            label: 'Trainer Clawbacks',
            value: `₹${totalTrainerClawback.toLocaleString('en-IN')}`,
            subtext: 'Commission Reversed',
          },
          {
            label: 'Branch Net Loss',
            value: `₹${(totalRefunded - totalTrainerClawback).toLocaleString('en-IN')}`,
            subtext: 'Gym Absorbed',
          },
        ],
        tables: [
          {
            title: 'Section 70 Refund Audit Trail',
            headers: [
              'Receipt #',
              'Trainee',
              'Refund Date',
              'Policy Tier',
              'Refund Amount',
              'Trainer Clawback',
              'Branch Share Adj.',
              'Reason',
            ],
            rows: refundRows,
            summaryRow: [
              'TOTALS',
              `${filteredRefunds.length} Refunds`,
              '-',
              '-',
              `₹${totalRefunded.toLocaleString('en-IN')}`,
              `₹${totalTrainerClawback.toLocaleString('en-IN')}`,
              `₹${(totalRefunded - totalTrainerClawback).toLocaleString('en-IN')}`,
              'CLOSED',
            ],
          },
        ],
      });
    }
  };

  const handleExportCSV = () => {
    if (activeTab === 'transactions') {
      let csv = 'Receipt #,Trainee Name,Payment Date,Payment Mode,General Membership Amount,PT Amount,Total Amount,Reference No,Branch ID,Status\n';
      filteredTransactions.forEach((tx) => {
        csv += `"${tx.receiptNumber}","${tx.traineeName}","${tx.paymentDate}","${tx.paymentMethod}",${tx.membershipAmount || tx.allocation?.generalMembershipAmount || 0},${tx.ptAmount || tx.allocation?.ptAmount || 0},${tx.totalAmount || 0},"${tx.referenceNumber || ''}","${tx.branchId}","${tx.isRefunded ? 'Refunded' : 'Settled'}"\n`;
      });
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `payment-ledger-${new Date().toISOString().substring(0, 10)}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } else {
      let csv = 'Refund ID,Receipt #,Trainee Name,Refund Date,Refund Amount,Policy Applied,Trainer Clawback,Branch Revenue Adjustment,Reason,Approved By,Branch ID\n';
      filteredRefunds.forEach((rf) => {
        csv += `"${rf.id}","${rf.receiptNumber}","${rf.traineeName}","${rf.refundDate}",${rf.amount},"${rf.policyApplied || ''}",${rf.trainerCommissionAdjustment || 0},${rf.branchRevenueAdjustment || 0},"${rf.reason}","${rf.approvedBy || ''}","${rf.branchId}"\n`;
      });
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `refunds-audit-${new Date().toISOString().substring(0, 10)}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    }
  };

  return (
    <div className="space-y-5">
      {/* Top Banner */}
      <div className="bg-white dark:bg-slate-800 p-5 rounded-xl border border-gray-200 dark:border-slate-700 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <CreditCard className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            Financial Transactions & Revenue Ledger
          </h2>
          <p className="text-xs text-gray-500 dark:text-slate-400 mt-0.5">
            Immutable log maintaining strict segregation between General Membership and PT streams (Section 60, 70, 72)
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={handleExportCSV}
            className="px-3 py-2 bg-gray-100 hover:bg-gray-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-gray-700 dark:text-slate-200 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 cursor-pointer"
            title="Download CSV file"
          >
            <Download className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            Export CSV
          </button>
          <button
            onClick={handleExportPDF}
            className="px-3 py-2 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/50 dark:hover:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 cursor-pointer"
            title="Export official audited PDF document"
          >
            <Printer className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
            Export PDF
          </button>
          <button
            id="btn-process-refund"
            onClick={() => {
              setTargetRefundTx(null);
              setIsRefundModalOpen(true);
            }}
            className="px-3.5 py-2 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 dark:hover:bg-rose-900/50 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800 rounded-lg text-xs font-bold transition-colors shadow-xs flex items-center gap-1.5 cursor-pointer"
          >
            <RotateCcw className="w-4 h-4 text-rose-600 dark:text-rose-400" />
            Process Refund (Section 70)
          </button>
          <button
            id="btn-ledger-new-payment"
            onClick={onOpenNewPayment}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold transition-colors shadow-xs cursor-pointer"
          >
            + Record Segregated Payment
          </button>
        </div>
      </div>

      {/* Summary Bento KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        {/* Dark Bento Tile: Gross Collected */}
        <div className="bg-[#111827] text-white p-4 rounded-xl border border-gray-900 shadow-sm flex flex-col justify-between">
          <div>
            <div className="text-[11px] font-bold text-gray-400 uppercase tracking-wide">
              Gross Collections
            </div>
            <div className="text-2xl font-black text-white mt-1">
              ₹{(totalCollected || 0).toLocaleString('en-IN')}
            </div>
          </div>
          <div className="text-[10px] text-gray-400 mt-2 border-t border-gray-800 pt-1.5 flex items-center justify-between">
            <span>All Streams Segregated</span>
            <span className="font-semibold text-emerald-400 font-mono">
              {filteredTransactions.length} Txs
            </span>
          </div>
        </div>

        {/* General Membership Revenue */}
        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
          <div className="text-[11px] font-bold text-blue-700 uppercase">
            General Membership
          </div>
          <div className="text-2xl font-black text-blue-600 mt-1">
            ₹{(totalMembership || 0).toLocaleString('en-IN')}
          </div>
          <div className="text-[10px] text-gray-400 mt-1">
            100% General Gym Operational Revenue
          </div>
        </div>

        {/* Personal Training Revenue */}
        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
          <div className="text-[11px] font-bold text-indigo-700 uppercase">
            Personal Training (PT)
          </div>
          <div className="text-2xl font-black text-indigo-600 mt-1">
            ₹{(totalPT || 0).toLocaleString('en-IN')}
          </div>
          <div className="text-[10px] text-gray-400 mt-1">
            Subject to trainer commission agreements
          </div>
        </div>

        {/* Audited Refunds & Clawbacks (Section 70) */}
        <div className="bg-white p-4 rounded-xl border border-rose-200 bg-rose-50/20 shadow-sm">
          <div className="text-[11px] font-bold text-rose-700 uppercase">
            Audited Refunds Issued
          </div>
          <div className="text-2xl font-black text-rose-600 mt-1">
            ₹{(totalRefunded || 0).toLocaleString('en-IN')}
          </div>
          <div className="text-[10px] text-rose-700 mt-1 flex items-center justify-between">
            <span>Trainer Clawback:</span>
            <span className="font-bold">₹{(totalTrainerClawback || 0).toLocaleString('en-IN')}</span>
          </div>
        </div>
      </div>

      {/* Tabs & Search Bar */}
      <div className="bg-white p-3 rounded-xl border border-gray-200 shadow-sm flex flex-col md:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-2 w-full md:w-auto">
          <button
            onClick={() => setActiveTab('transactions')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-colors ${
              activeTab === 'transactions'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            Payment Collections ({filteredTransactions.length})
          </button>
          <button
            onClick={() => setActiveTab('refunds')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-colors flex items-center gap-1.5 ${
              activeTab === 'refunds'
                ? 'bg-rose-600 text-white shadow-xs'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Refunds & Clawbacks ({filteredRefunds.length})</span>
          </button>
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto">
          <div className="relative flex-1 md:w-64">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search trainee, receipt #, or ref..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 bg-gray-50 border border-gray-300 rounded-lg text-xs focus:ring-1 focus:ring-indigo-500 focus:outline-none"
            />
          </div>

          <select
            value={selectedBranchId}
            onChange={(e) => setSelectedBranchId(e.target.value)}
            className="px-3 py-1.5 bg-gray-50 border border-gray-300 rounded-lg text-xs font-semibold text-gray-700"
          >
            <option value="all">All Branches</option>
            {branches.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Tab 1: Transactions Table */}
      {activeTab === 'transactions' && (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-gray-600">
              <thead className="bg-gray-50 border-b border-gray-200 text-gray-700 font-semibold uppercase text-[10px] tracking-wider">
                <tr>
                  <th className="px-4 py-3">Date & Time</th>
                  <th className="px-4 py-3">Receipt #</th>
                  <th className="px-4 py-3">Trainee / Member</th>
                  <th className="px-4 py-3">Payment Method</th>
                  <th className="px-4 py-3 text-right">Membership (₹)</th>
                  <th className="px-4 py-3 text-right">PT Stream (₹)</th>
                  <th className="px-4 py-3 text-right">Total Paid (₹)</th>
                  <th className="px-4 py-3 text-center">Status</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredTransactions.map((tx) => (
                  <tr key={tx.id} className="hover:bg-gray-50/80 transition-colors">
                    <td className="px-4 py-3">
                      <div className="font-mono text-gray-900 font-semibold">{tx.paymentDate}</div>
                      <div className="text-[10px] text-gray-400">By {tx.collectedBy}</div>
                    </td>

                    <td className="px-4 py-3 font-mono font-bold text-indigo-700">
                      {tx.receiptNumber}
                    </td>

                    <td className="px-4 py-3">
                      <div className="font-bold text-gray-900">{tx.traineeName}</div>
                      <div className="text-[10px] text-gray-400 font-mono">
                        Ref: {tx.referenceNumber}
                      </div>
                    </td>

                    <td className="px-4 py-3 capitalize">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-gray-100 text-gray-700 border border-gray-200">
                        {tx.paymentMethod.replace('_', ' ')}
                      </span>
                    </td>

                    <td className="px-4 py-3 text-right font-bold text-blue-700">
                      ₹{(tx.membershipAmount ?? tx.allocation?.generalMembershipAmount ?? 0).toLocaleString('en-IN')}
                    </td>

                    <td className="px-4 py-3 text-right font-bold text-indigo-700">
                      ₹{(tx.ptAmount ?? tx.allocation?.ptAmount ?? 0).toLocaleString('en-IN')}
                    </td>

                    <td className="px-4 py-3 text-right font-black text-gray-900 text-sm">
                      ₹{(tx.totalAmount || 0).toLocaleString('en-IN')}
                    </td>

                    <td className="px-4 py-3 text-center">
                      {tx.isRefunded ? (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                          Refunded (₹{(tx.refundedAmount ?? tx.totalAmount ?? 0).toLocaleString('en-IN')})
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          Settled
                        </span>
                      )}
                    </td>

                    <td className="px-4 py-3 text-right space-x-1.5 whitespace-nowrap">
                      <button
                        onClick={() => handleRowClick(tx)}
                        className="px-2 py-1 text-indigo-600 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100 rounded text-[11px] font-semibold transition-colors inline-flex items-center gap-1"
                      >
                        <FileText className="w-3 h-3" />
                        Receipt
                      </button>

                      {!tx.isRefunded && (
                        <button
                          onClick={() => handleOpenRefundForTx(tx)}
                          className="px-2 py-1 text-rose-600 hover:text-rose-800 bg-rose-50 hover:bg-rose-100 rounded text-[11px] font-semibold transition-colors inline-flex items-center gap-1"
                          title="Authorize refund with Section 70 policy engine"
                        >
                          <RotateCcw className="w-3 h-3" />
                          Refund
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 2: Refunds & Clawback Audit Log (Section 70) */}
      {activeTab === 'refunds' && (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
          <div className="p-4 bg-rose-50/40 border-b border-gray-200 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-600" />
              <h3 className="text-xs font-bold text-gray-900">
                Audited Refund Transactions & Clawback Ledger (Section 70)
              </h3>
            </div>
            <span className="text-[11px] text-gray-500 font-mono">
              Total Processed: {filteredRefunds.length}
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-gray-600">
              <thead className="bg-gray-50 border-b border-gray-200 text-gray-700 font-semibold uppercase text-[10px] tracking-wider">
                <tr>
                  <th className="px-4 py-3">Refund ID & Date</th>
                  <th className="px-4 py-3">Original Receipt</th>
                  <th className="px-4 py-3">Trainee / Member</th>
                  <th className="px-4 py-3">Policy Model</th>
                  <th className="px-4 py-3 text-right">Trainer Clawback (₹)</th>
                  <th className="px-4 py-3 text-right">Branch Loss (₹)</th>
                  <th className="px-4 py-3 text-right">Refund Amount (₹)</th>
                  <th className="px-4 py-3">Reason / Approved By</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredRefunds.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-4 py-8 text-center text-gray-400">
                      No refunds recorded yet. Use the "Process Refund" button to simulate a refund with policy clawbacks.
                    </td>
                  </tr>
                ) : (
                  filteredRefunds.map((rf) => (
                    <tr key={rf.id} className="hover:bg-gray-50/80 transition-colors">
                      <td className="px-4 py-3">
                        <div className="font-mono text-gray-900 font-bold">{rf.id}</div>
                        <div className="text-[10px] text-gray-400">{rf.refundDate}</div>
                      </td>

                      <td className="px-4 py-3 font-mono font-semibold text-indigo-600">
                        {rf.receiptNumber}
                      </td>

                      <td className="px-4 py-3 font-bold text-gray-900">{rf.traineeName}</td>

                      <td className="px-4 py-3">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-gray-100 text-gray-700 border border-gray-200 capitalize">
                          {rf.policyApplied.replace(/_/g, ' ')}
                        </span>
                      </td>

                      <td className="px-4 py-3 text-right font-bold text-rose-600">
                        -₹{(rf.trainerCommissionAdjustment || 0).toLocaleString('en-IN')}
                      </td>

                      <td className="px-4 py-3 text-right font-bold text-gray-700">
                        -₹{(rf.branchRevenueAdjustment || 0).toLocaleString('en-IN')}
                      </td>

                      <td className="px-4 py-3 text-right font-black text-rose-600 text-sm">
                        ₹{(rf.amount || 0).toLocaleString('en-IN')}
                      </td>

                      <td className="px-4 py-3">
                        <div className="text-gray-900">{rf.reason}</div>
                        <div className="text-[10px] text-gray-400">By {rf.approvedBy}</div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Section 70 Refund Modal */}
      <RefundModal
        isOpen={isRefundModalOpen}
        onClose={() => {
          setIsRefundModalOpen(false);
          setTargetRefundTx(null);
        }}
        transactions={transactions}
        preselectedTransaction={targetRefundTx}
        onRefundSuccess={() => {
          // Trigger storage refresh if needed
        }}
      />
    </div>
  );
};
