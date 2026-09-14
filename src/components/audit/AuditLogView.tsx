import React, { useState } from 'react';
import { GitBranch, Shield, Search, X } from 'lucide-react';
import { AuditLog } from '../../types';
import { PeriodFilter } from '../common/PeriodFilter';
import { PeriodState, defaultPeriod, filterByPeriod } from '../../utils/period';

interface AuditLogViewProps {
  logs: AuditLog[];
}

const SELECT_CLASS =
  'px-2 py-1.5 rounded-lg bg-gray-50 dark:bg-slate-800 border border-gray-300 dark:border-slate-700 text-xs font-semibold text-gray-700 dark:text-slate-200 outline-none cursor-pointer';

const ALL = '__all__';

export const AuditLogView: React.FC<AuditLogViewProps> = ({ logs }) => {
  const [period, setPeriod] = useState<PeriodState>(defaultPeriod('all'));
  const [userFilter, setUserFilter] = useState<string>(ALL);
  const [actionFilter, setActionFilter] = useState<string>(ALL);
  const [search, setSearch] = useState('');

  // Distinct actor names and action types actually present, so the dropdowns
  // never show a choice that couldn't possibly match anything.
  const staffOptions = Array.from(new Set(logs.map((l) => l.userName))).sort();
  const actionOptions = Array.from(new Set(logs.map((l) => l.action))).sort();

  const byPeriod = filterByPeriod<AuditLog>(logs, (l) => l.timestamp, period);
  const q = search.trim().toLowerCase();
  const visibleLogs = byPeriod.filter((l) => {
    if (userFilter !== ALL && l.userName !== userFilter) return false;
    if (actionFilter !== ALL && l.action !== actionFilter) return false;
    if (q && !`${l.entity} ${l.entityId} ${l.details}`.toLowerCase().includes(q)) return false;
    return true;
  });

  const hasActiveFilters = userFilter !== ALL || actionFilter !== ALL || q !== '' || period.mode !== 'all';
  const clearFilters = () => {
    setPeriod(defaultPeriod('all'));
    setUserFilter(ALL);
    setActionFilter(ALL);
    setSearch('');
  };

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
            Immutable log of every recorded activity — profile edits, payments, commission settlements, coach
            transfers, PT session updates, biometric enrollment, and staff access changes
          </p>
        </div>

        <span className="px-3 py-1 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-full text-xs font-bold flex items-center gap-1.5">
          <Shield className="w-3.5 h-3.5 text-emerald-600" />
          Audit Logging: Active (Append-Only)
        </span>
      </div>

      {/* Filters */}
      <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-xs space-y-3">
        <PeriodFilter value={period} onChange={setPeriod} />

        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100">
          <select
            value={userFilter}
            onChange={(e) => setUserFilter(e.target.value)}
            className={SELECT_CLASS}
            aria-label="Filter by staff member"
          >
            <option value={ALL}>All Staff Members</option>
            {staffOptions.map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </select>

          <select
            value={actionFilter}
            onChange={(e) => setActionFilter(e.target.value)}
            className={SELECT_CLASS}
            aria-label="Filter by action type"
          >
            <option value={ALL}>All Action Types</option>
            {actionOptions.map((action) => (
              <option key={action} value={action}>
                {action}
              </option>
            ))}
          </select>

          <div className="relative flex-1 min-w-[10rem]">
            <Search className="w-3.5 h-3.5 text-gray-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search entity, ID, or details…"
              className="w-full pl-8 pr-3 py-1.5 bg-gray-50 dark:bg-slate-800 border border-gray-300 dark:border-slate-700 rounded-lg text-xs text-gray-800 dark:text-slate-200"
            />
          </div>

          {hasActiveFilters && (
            <button
              type="button"
              onClick={clearFilters}
              className="px-2.5 py-1.5 text-xs font-bold text-gray-500 hover:text-rose-600 flex items-center gap-1 rounded-lg hover:bg-rose-50 transition-colors"
            >
              <X className="w-3.5 h-3.5" />
              Clear Filters
            </button>
          )}

          <span className="text-[11px] text-slate-400 font-semibold ml-auto">
            Showing {visibleLogs.length} of {logs.length} entries
          </span>
        </div>
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
            {visibleLogs.map((log) => (
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
                  {log.entity} ({log.entityId})
                </td>
                <td className="px-4 py-3 text-slate-700">
                  <div className="font-semibold">{log.userName}</div>
                  <div className="text-[10px] text-slate-400 capitalize">{log.userRole}</div>
                </td>
                <td className="px-4 py-3 text-slate-600 max-w-[300px]">
                  {log.details}
                </td>
              </tr>
            ))}
            {visibleLogs.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-10 text-center text-slate-400 font-semibold">
                  {logs.length === 0 ? 'No activity has been recorded yet.' : 'No entries match the current filters.'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
