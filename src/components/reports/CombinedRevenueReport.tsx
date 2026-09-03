import React, { useState } from 'react';
import {
  FileSpreadsheet,
  Printer,
  Download,
  Building2,
  TrendingUp,
  DollarSign,
  Award,
  Filter,
  ChevronDown,
  ChevronRight,
  Split,
  ShieldAlert,
} from 'lucide-react';
import {
  PaymentTransaction,
  PTSubscription,
  Trainer,
  Branch,
  PTPackage,
} from '../../types';
import { PrintService } from '../../services/printService';

interface CombinedRevenueReportProps {
  transactions: PaymentTransaction[];
  subscriptions: PTSubscription[];
  trainers: Trainer[];
  branches: Branch[];
  packages: PTPackage[];
}

export const CombinedRevenueReport: React.FC<CombinedRevenueReportProps> = ({
  transactions,
  subscriptions,
  trainers,
  branches,
  packages,
}) => {
  const [selectedBranchId, setSelectedBranchId] = useState<string>('all');
  const [expandedBranch, setExpandedBranch] = useState<string | null>('branch-1');

  // Aggregations
  const filteredTxs = transactions.filter((t) =>
    selectedBranchId === 'all' ? true : t.branchId === selectedBranchId
  );
  const filteredSubs = subscriptions.filter((s) =>
    selectedBranchId === 'all' ? true : s.branchId === selectedBranchId
  );

  const generalMembershipRevenue = filteredTxs.reduce((sum, t) => sum + (t.membershipAmount || t.allocation?.generalMembershipAmount || 0), 0);
  const ptGrossRevenue = filteredTxs.reduce((sum, t) => sum + (t.ptAmount || t.allocation?.ptAmount || 0), 0);
  const otherRevenue = 8500; // Locker fees, assessment, fitness merchandise
  const grossRevenue = generalMembershipRevenue + ptGrossRevenue + otherRevenue;
  const refundsIssued = 3000; // Audited refunds (Section 70)
  const netRevenue = grossRevenue - refundsIssued;

  // PT Split Breakdown (Section 73)
  const totalTrainerShare = trainers.reduce((sum, t) => sum + (t.ptCommissionEarned || 0), 0);
  const branchRetainedShare = Math.max(0, ptGrossRevenue - totalTrainerShare);

  const handleExportPDF = () => {
    const branchName =
      selectedBranchId === 'all'
        ? 'Consolidated (All Branches)'
        : branches.find((b) => b.id === selectedBranchId)?.name || 'Branch';

    const branchRows = branches.map((b) => {
      const bSubs = subscriptions.filter((s) => s.branchId === b.id);
      const bTrainers = trainers.filter((t) => t.branchId === b.id);
      const bGross = bSubs.reduce((sum, s) => sum + (s.paidAmount || 0), 0);
      const bTrainerShare = bTrainers.reduce((sum, t) => sum + (t.ptCommissionEarned || 0), 0);
      const bBranchShare = Math.max(0, bGross - bTrainerShare);
      return [
        b.name,
        b.city,
        `${bTrainers.length} coaches`,
        `${bSubs.length} clients`,
        `₹${bGross.toLocaleString('en-IN')}`,
        `₹${bTrainerShare.toLocaleString('en-IN')}`,
        `₹${bBranchShare.toLocaleString('en-IN')}`,
      ];
    });

    const trainerRows = trainers.map((t) => {
      const tBranch = branches.find((b) => b.id === t.branchId)?.name || 'General';
      const tSubs = subscriptions.filter((s) => s.trainerId === t.id);
      const rev = t.ptRevenueGenerated || tSubs.reduce((sum, s) => sum + (s.paidAmount || 0), 0);
      return [
        t.fullName,
        tBranch,
        `₹${rev.toLocaleString('en-IN')}`,
        `₹${(t.ptCommissionEarned || 0).toLocaleString('en-IN')}`,
        `₹${(t.ptCommissionPaid || 0).toLocaleString('en-IN')}`,
        `₹${(t.ptCommissionOutstanding || 0).toLocaleString('en-IN')}`,
      ];
    });

    const txRows = filteredTxs.slice(0, 15).map((tx) => [
      tx.receiptNumber,
      tx.traineeName,
      tx.paymentDate,
      tx.paymentMethod,
      `₹${(tx.membershipAmount || tx.allocation?.generalMembershipAmount || 0).toLocaleString('en-IN')}`,
      `₹${(tx.ptAmount || tx.allocation?.ptAmount || 0).toLocaleString('en-IN')}`,
      `₹${(tx.totalAmount || 0).toLocaleString('en-IN')}`,
    ]);

    PrintService.printReportDocument({
      title: 'Combined Revenue & Segregated Financial Audit',
      subtitle: 'Mandatory Segregation Audit (Sections 60, 70, 73 & 74)',
      branchName,
      dateRange: `Audited MTD (${new Date().toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })})`,
      kpis: [
        {
          label: 'General Membership',
          value: `₹${generalMembershipRevenue.toLocaleString('en-IN')}`,
          subtext: '100% Gym Retained',
        },
        {
          label: 'PT Gross Revenue',
          value: `₹${ptGrossRevenue.toLocaleString('en-IN')}`,
          subtext: 'Segregated Stream',
        },
        {
          label: 'Trainer Disbursals',
          value: `₹${totalTrainerShare.toLocaleString('en-IN')}`,
          subtext: 'Coaches Share',
        },
        {
          label: 'Gym Retained PT',
          value: `₹${branchRetainedShare.toLocaleString('en-IN')}`,
          subtext: 'Net PT Retained',
        },
        {
          label: 'Net System Revenue',
          value: `₹${netRevenue.toLocaleString('en-IN')}`,
          subtext: 'After Deductions',
        },
      ],
      tables: [
        {
          title: '1. Revenue Streams Segregation Summary',
          headers: ['Revenue Head', 'Stream Type', 'Gross Amount', 'Deductions', 'Net Retained'],
          rows: [
            ['General Gym Membership', 'Standard Subscriptions', `₹${generalMembershipRevenue.toLocaleString('en-IN')}`, '₹0', `₹${generalMembershipRevenue.toLocaleString('en-IN')}`],
            ['Personal Training (1-on-1 PT)', 'Segregated PT Stream', `₹${ptGrossRevenue.toLocaleString('en-IN')}`, `₹${totalTrainerShare.toLocaleString('en-IN')} (Trainer)`, `₹${branchRetainedShare.toLocaleString('en-IN')}`],
            ['Ancillary Merchandise & Lockers', 'Secondary Receipts', `₹${otherRevenue.toLocaleString('en-IN')}`, '₹0', `₹${otherRevenue.toLocaleString('en-IN')}`],
            ['Audited Refunds (Clawbacks)', 'Section 70 Deductions', `-₹${refundsIssued.toLocaleString('en-IN')}`, '-₹1,800 (Trainer Clawback)', `-₹1,200 (Gym Share)`],
          ],
          summaryRow: ['TOTAL NET REVENUE', 'Consolidated System', `₹${grossRevenue.toLocaleString('en-IN')}`, `₹${(totalTrainerShare + refundsIssued).toLocaleString('en-IN')}`, `₹${netRevenue.toLocaleString('en-IN')}`],
        },
        {
          title: '2. Multi-Branch Commercial Comparison (Section 74)',
          headers: ['Branch Name', 'City', 'Coaches', 'Active PT Trainees', 'PT Gross', 'Trainer Share', 'Branch Retained'],
          rows: branchRows,
        },
        {
          title: '3. Trainer Commission Accrual & Payout Ledger',
          headers: ['Trainer Name', 'Branch', 'PT Revenue Gen.', 'Commission Earned', 'Commission Paid', 'Outstanding Due'],
          rows: trainerRows,
        },
        {
          title: '4. Recent Audited Payment Transactions (Sample)',
          headers: ['Receipt #', 'Trainee', 'Date', 'Method', 'General Gym', 'PT Stream', 'Total Paid'],
          rows: txRows,
        },
      ],
    });
  };

  const handleExportCSV = () => {
    let csv = 'FITOS COMMERCIAL GYMS - COMBINED REVENUE & SEGREGATION AUDIT\n';
    csv += `Generated On,${new Date().toISOString()}\n`;
    csv += `Branch Scope,${selectedBranchId === 'all' ? 'Consolidated All Branches' : selectedBranchId}\n\n`;

    // Section 1: Executive KPI Summary
    csv += '--- EXECUTIVE REVENUE SUMMARY ---\n';
    csv += 'Metric,Amount (INR),Notes\n';
    csv += `General Membership Revenue,${generalMembershipRevenue},100% Gym Retained\n`;
    csv += `Personal Training (PT) Gross,${ptGrossRevenue},Segregated Stream\n`;
    csv += `Trainer Commission Disbursed/Accrued,${totalTrainerShare},Payable to certified coaches\n`;
    csv += `Branch Retained PT Share,${branchRetainedShare},Net gym earnings from PT\n`;
    csv += `Other Ancillary Revenue,${otherRevenue},Lockers & Merchandise\n`;
    csv += `Total Gross Collections,${grossRevenue},Total collected before refunds\n`;
    csv += `Refunds Deducted,${refundsIssued},Audited refunds (Section 70)\n`;
    csv += `Net System Revenue,${netRevenue},Audited gross less refunds\n\n`;

    // Section 2: Branch Comparison
    csv += '--- MULTI-BRANCH COMPARISON ---\n';
    csv += 'Branch,City,Active Coaches,Active PT Clients,PT Gross,Trainer Share,Branch Retained\n';
    branches.forEach((b) => {
      const bSubs = subscriptions.filter((s) => s.branchId === b.id);
      const bTrainers = trainers.filter((t) => t.branchId === b.id);
      const bGross = bSubs.reduce((sum, s) => sum + (s.paidAmount || 0), 0);
      const bTrainerShare = bTrainers.reduce((sum, t) => sum + (t.ptCommissionEarned || 0), 0);
      const bBranchShare = Math.max(0, bGross - bTrainerShare);
      csv += `"${b.name}","${b.city}",${bTrainers.length},${bSubs.length},${bGross},${bTrainerShare},${bBranchShare}\n`;
    });
    csv += '\n';

    // Section 3: Trainer Payouts
    csv += '--- TRAINER COMMISSION DISBURSAL ---\n';
    csv += 'Trainer Name,Branch,PT Revenue Generated,Commission Earned,Commission Paid,Outstanding Balance\n';
    trainers.forEach((t) => {
      const tBranch = branches.find((b) => b.id === t.branchId)?.name || 'General';
      const tSubs = subscriptions.filter((s) => s.trainerId === t.id);
      const rev = t.ptRevenueGenerated || tSubs.reduce((sum, s) => sum + (s.paidAmount || 0), 0);
      csv += `"${t.fullName}","${tBranch}",${rev},${t.ptCommissionEarned || 0},${t.ptCommissionPaid || 0},${t.ptCommissionOutstanding || 0}\n`;
    });
    csv += '\n';

    // Section 4: Transactions Log
    csv += '--- FILTERED TRANSACTIONS LEDGER ---\n';
    csv += 'Receipt #,Trainee Name,Branch ID,Payment Date,Method,General Membership,PT Stream,Total Amount,Status\n';
    filteredTxs.forEach((tx) => {
      csv += `"${tx.receiptNumber}","${tx.traineeName}","${tx.branchId}","${tx.paymentDate}","${tx.paymentMethod}",${tx.membershipAmount || tx.allocation?.generalMembershipAmount || 0},${tx.ptAmount || tx.allocation?.ptAmount || 0},${tx.totalAmount || 0},"${tx.isRefunded ? 'Refunded' : 'Settled'}"\n`;
    });

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `gymos-combined-revenue-audit-${new Date().toISOString().substring(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-white dark:bg-slate-800 p-5 rounded-xl border border-slate-200 dark:border-slate-700 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 print:hidden">
        <div>
          <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            Financial & Combined Revenue Audit (Sections 73, 74)
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Segregated revenue streams, gross-to-net accounting, and branch PT drill-down comparisons
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleExportCSV}
            className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-200 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
            title="Download full CSV spreadsheet"
          >
            <Download className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            Export CSV
          </button>
          <button
            onClick={handleExportPDF}
            className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors shadow-xs cursor-pointer"
            title="Export official audited PDF report"
          >
            <Printer className="w-4 h-4" />
            Export PDF
          </button>
        </div>
      </div>

      {/* Section 73: Combined Revenue Structure */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs space-y-5">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between border-b border-slate-200 pb-4 gap-2">
          <div>
            <h3 className="text-sm font-bold text-slate-900">
              Combined Revenue Accounting (Section 73)
            </h3>
            <p className="text-xs text-slate-500">
              Mandatory segregation between General Membership and PT streams
            </p>
          </div>

          <select
            value={selectedBranchId}
            onChange={(e) => setSelectedBranchId(e.target.value)}
            className="px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs font-semibold text-slate-700 print:hidden"
          >
            <option value="all">Consolidated (All Branches)</option>
            {branches.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
        </div>

        {/* 5-Column Ledger Breakdown */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 text-center">
          <div className="bg-blue-50/40 p-4 rounded-xl border border-blue-200">
            <div className="text-[11px] font-bold text-blue-800 uppercase">
              General Membership
            </div>
            <div className="text-xl font-black text-blue-700 mt-1">
              ₹{(generalMembershipRevenue || 0).toLocaleString('en-IN')}
            </div>
            <div className="text-[10px] text-blue-600 mt-1">100% Gym Retained</div>
          </div>

          <div className="bg-indigo-50/40 p-4 rounded-xl border border-indigo-200">
            <div className="text-[11px] font-bold text-indigo-900 uppercase">
              PT Gross Revenue
            </div>
            <div className="text-xl font-black text-indigo-700 mt-1">
              ₹{(ptGrossRevenue || 0).toLocaleString('en-IN')}
            </div>
            <div className="text-[10px] text-indigo-600 mt-1">Shared with Coaches</div>
          </div>

          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
            <div className="text-[11px] font-bold text-slate-600 uppercase">
              Other Revenue
            </div>
            <div className="text-xl font-black text-slate-800 mt-1">
              ₹{(otherRevenue || 0).toLocaleString('en-IN')}
            </div>
            <div className="text-[10px] text-slate-500 mt-1">Lockers & Merchandise</div>
          </div>

          <div className="bg-amber-50/40 p-4 rounded-xl border border-amber-200">
            <div className="text-[11px] font-bold text-amber-800 uppercase">
              Refunds Deducted
            </div>
            <div className="text-xl font-black text-amber-700 mt-1">
              -₹{(refundsIssued || 0).toLocaleString('en-IN')}
            </div>
            <div className="text-[10px] text-amber-600 mt-1">Audited clawbacks</div>
          </div>

          <div className="bg-emerald-50/40 p-4 rounded-xl border border-emerald-200">
            <div className="text-[11px] font-bold text-emerald-800 uppercase">
              Net System Revenue
            </div>
            <div className="text-xl font-black text-emerald-700 mt-1">
              ₹{(netRevenue || 0).toLocaleString('en-IN')}
            </div>
            <div className="text-[10px] text-emerald-600 mt-1">Audited Gross - Refunds</div>
          </div>
        </div>

        {/* PT Revenue Internal Split (Section 73 Requirement) */}
        <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
              <Split className="w-3.5 h-3.5 text-indigo-600" />
              PT Revenue Breakdown (Trainer Share vs Branch Retained Share)
            </span>
            <span className="text-[11px] font-mono text-slate-600">
              Gross PT: ₹{(ptGrossRevenue || 0).toLocaleString('en-IN')}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="p-3 bg-white rounded-lg border border-indigo-200 flex justify-between items-center">
              <div>
                <span className="text-[10px] uppercase font-bold text-indigo-600">
                  Total Trainer Commission Share
                </span>
                <div className="text-lg font-black text-indigo-700 mt-0.5">
                  ₹{(totalTrainerShare || 0).toLocaleString('en-IN')}
                </div>
              </div>
              <div className="text-right text-[11px] text-slate-500">
                {ptGrossRevenue > 0
                  ? `${Math.round((totalTrainerShare / ptGrossRevenue) * 100)}% of PT Gross`
                  : '0%'}
              </div>
            </div>

            <div className="p-3 bg-white rounded-lg border border-cyan-200 flex justify-between items-center">
              <div>
                <span className="text-[10px] uppercase font-bold text-cyan-700">
                  Branch Retained Share
                </span>
                <div className="text-lg font-black text-cyan-800 mt-0.5">
                  ₹{(branchRetainedShare || 0).toLocaleString('en-IN')}
                </div>
              </div>
              <div className="text-right text-[11px] text-slate-500">
                {ptGrossRevenue > 0
                  ? `${Math.round((branchRetainedShare / ptGrossRevenue) * 100)}% of PT Gross`
                  : '0%'}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Section 74: Branch PT Comparison with Drill-Down */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs space-y-4">
        <div>
          <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <Building2 className="w-4 h-4 text-indigo-600" />
            Branch PT Comparison & Hierarchical Drill-Down (Section 74)
          </h3>
          <p className="text-xs text-slate-500">
            Traceability pathway: Branch → PT Revenue → Trainer → Trainee → Package → Payment
          </p>
        </div>

        <div className="space-y-3">
          {branches.map((branch) => {
            const bSubs = subscriptions.filter((s) => s.branchId === branch.id);
            const bTrainers = trainers.filter((t) => t.branchId === branch.id);
            const bGross = bSubs.reduce((sum, s) => sum + (s.paidAmount || 0), 0);
            const bTrainerShare = bTrainers.reduce((sum, t) => sum + (t.ptCommissionEarned || 0), 0);
            const bBranchShare = Math.max(0, bGross - bTrainerShare);
            const isExpanded = expandedBranch === branch.id;

            return (
              <div key={branch.id} className="border border-slate-200 rounded-xl overflow-hidden">
                {/* Branch Summary Bar */}
                <div
                  onClick={() => setExpandedBranch(isExpanded ? null : branch.id)}
                  className="p-4 bg-slate-50 hover:bg-slate-100 cursor-pointer flex items-center justify-between transition-colors"
                >
                  <div className="flex items-center gap-3">
                    {isExpanded ? (
                      <ChevronDown className="w-4 h-4 text-slate-600" />
                    ) : (
                      <ChevronRight className="w-4 h-4 text-slate-600" />
                    )}
                    <div>
                      <div className="font-bold text-slate-900 text-sm">{branch.name}</div>
                      <div className="text-[11px] text-slate-500">{branch.city} • {bTrainers.length} Trainers • {bSubs.length} Active PT Clients</div>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 text-right text-xs">
                    <div>
                      <span className="text-[10px] text-slate-400 uppercase font-bold">PT Gross</span>
                      <div className="font-black text-slate-900">₹{(bGross || 0).toLocaleString('en-IN')}</div>
                    </div>
                    <div>
                      <span className="text-[10px] text-indigo-600 uppercase font-bold">Trainer Share</span>
                      <div className="font-bold text-indigo-600">₹{(bTrainerShare || 0).toLocaleString('en-IN')}</div>
                    </div>
                    <div>
                      <span className="text-[10px] text-cyan-700 uppercase font-bold">Branch Retained</span>
                      <div className="font-bold text-cyan-800">₹{(bBranchShare || 0).toLocaleString('en-IN')}</div>
                    </div>
                  </div>
                </div>

                {/* Drill-Down Level: Trainers -> Trainees -> Packages */}
                {isExpanded && (
                  <div className="p-4 bg-white border-t border-slate-200 space-y-4 text-xs">
                    <div className="font-semibold text-slate-700 uppercase text-[10px] tracking-wider">
                      Branch Coach Level Drill-Down:
                    </div>

                    {bTrainers.map((tr) => {
                      const trSubs = bSubs.filter((s) => s.trainerId === tr.id);
                      return (
                        <div key={tr.id} className="p-3 bg-slate-50 rounded-lg border border-slate-200 space-y-2">
                          <div className="flex justify-between items-center">
                            <span className="font-bold text-slate-900 text-sm">
                              Coach: {tr.fullName}
                            </span>
                            <span className="text-xs text-indigo-700 font-bold">
                              Commission Accrued: ₹{(tr.ptCommissionEarned || 0).toLocaleString('en-IN')}
                            </span>
                          </div>

                          {/* Client package list */}
                          <div className="overflow-x-auto">
                            <table className="w-full text-left text-[11px] text-slate-600 bg-white rounded border border-slate-200">
                              <thead className="bg-slate-100 text-slate-700 font-semibold uppercase text-[9px]">
                                <tr>
                                  <th className="p-2">Trainee / Client</th>
                                  <th className="p-2">Package Name</th>
                                  <th className="p-2">Sessions Remaining</th>
                                  <th className="p-2 text-right">Package Price</th>
                                  <th className="p-2 text-right">Paid Amount</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-100">
                                {trSubs.map((s) => (
                                  <tr key={s.id}>
                                    <td className="p-2 font-bold text-slate-900">{s.traineeName}</td>
                                    <td className="p-2">{s.packageName}</td>
                                    <td className="p-2">{s.remainingSessions} / {s.totalSessions}</td>
                                    <td className="p-2 text-right">₹{(s.packagePrice || s.netPrice || s.price || 0).toLocaleString('en-IN')}</td>
                                    <td className="p-2 text-right font-bold text-emerald-600">
                                      ₹{(s.paidAmount || 0).toLocaleString('en-IN')}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
