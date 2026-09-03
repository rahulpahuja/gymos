import React from 'react';
import { GitBranch, Shield, Clock, User, CheckCircle2, AlertTriangle } from 'lucide-react';
import { AuditLog } from '../../types';

interface AuditLogViewProps {
  logs: AuditLog[];
}

export const AuditLogView: React.FC<AuditLogViewProps> = ({ logs }) => {
  return (
    <div className="space-y-5">
      {/* Banner */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <GitBranch className="w-5 h-5 text-indigo-600" />
            System Audit Trail & Compliance Ledger
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Immutable log of coach transfers, financial allocations, commission disbursements, and package edits
          </p>
        </div>

        <span className="px-3 py-1 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-full text-xs font-bold flex items-center gap-1.5">
          <Shield className="w-3.5 h-3.5 text-emerald-600" />
          Audit Logging: Active (Append-Only)
        </span>
      </div>

      {/* Log list */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
        <table className="w-full text-left text-xs text-slate-600">
          <thead className="bg-slate-50 border-b border-slate-200 text-slate-700 font-semibold uppercase text-[10px] tracking-wider">
            <tr>
              <th className="px-4 py-3">Timestamp</th>
              <th className="px-4 py-3">Action Type</th>
              <th className="px-4 py-3">Entity</th>
              <th className="px-4 py-3">User & Role</th>
              <th className="px-4 py-3">Audit Details</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {logs.map((log) => (
              <tr key={log.id} className="hover:bg-slate-50 transition-colors">
                <td className="px-4 py-3 font-mono text-slate-800 whitespace-nowrap">
                  {log.timestamp}
                </td>
                <td className="px-4 py-3">
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200 uppercase">
                    {log.action.replace('_', ' ')}
                  </span>
                </td>
                <td className="px-4 py-3 font-semibold text-slate-900 capitalize">
                  {log.entityType} ({log.entityId})
                </td>
                <td className="px-4 py-3 text-slate-700">
                  <div className="font-semibold">{log.performedBy}</div>
                  <div className="text-[10px] text-slate-400 capitalize">{log.role}</div>
                </td>
                <td className="px-4 py-3 text-slate-600 max-w-[300px]">
                  {log.details}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
