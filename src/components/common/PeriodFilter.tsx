import React from 'react';
import { CalendarRange } from 'lucide-react';
import { PeriodState, PeriodMode, MONTHS_SHORT, periodLabel } from '../../utils/period';

const MODES: { id: PeriodMode; label: string }[] = [
  { id: 'all', label: 'All Time' },
  { id: 'month', label: 'Monthly' },
  { id: 'quarter', label: 'Quarterly' },
  { id: 'year', label: 'Yearly' },
  { id: 'custom', label: 'Custom' },
];

const SELECT_CLASS =
  'px-2 py-1 rounded-lg bg-gray-50 dark:bg-slate-800 border border-gray-300 dark:border-slate-700 text-xs font-semibold text-gray-700 dark:text-slate-200 outline-none cursor-pointer';

interface PeriodFilterProps {
  value: PeriodState;
  onChange: (next: PeriodState) => void;
  className?: string;
  /** Show the resolved label (e.g. "Q3 2026") alongside the controls. */
  showLabel?: boolean;
}

export const PeriodFilter: React.FC<PeriodFilterProps> = ({
  value,
  onChange,
  className = '',
  showLabel = true,
}) => {
  const thisYear = new Date().getFullYear();
  const years: number[] = [];
  for (let y = thisYear + 1; y >= thisYear - 6; y -= 1) years.push(y);

  const set = (patch: Partial<PeriodState>) => onChange({ ...value, ...patch });
  const needsYear = value.mode === 'month' || value.mode === 'quarter' || value.mode === 'year';

  return (
    <div className={`flex flex-wrap items-center gap-2 ${className}`}>
      <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-gray-500 dark:text-slate-400">
        <CalendarRange className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
        <span className="hidden sm:inline">Period</span>
      </div>

      <div className="flex bg-gray-100 dark:bg-slate-800 rounded-lg p-0.5 border border-gray-200 dark:border-slate-700">
        {MODES.map((m) => (
          <button
            key={m.id}
            type="button"
            onClick={() => set({ mode: m.id })}
            className={`px-2.5 py-1 text-[11px] font-semibold rounded-md transition-colors ${
              value.mode === m.id
                ? 'bg-white dark:bg-slate-700 text-indigo-700 dark:text-indigo-300 shadow-xs'
                : 'text-gray-500 dark:text-slate-400 hover:text-gray-800 dark:hover:text-slate-200'
            }`}
          >
            {m.label}
          </button>
        ))}
      </div>

      {needsYear && (
        <select
          value={value.year}
          onChange={(e) => set({ year: Number(e.target.value) })}
          className={SELECT_CLASS}
          aria-label="Year"
        >
          {years.map((y) => (
            <option key={y} value={y}>
              {y}
            </option>
          ))}
        </select>
      )}

      {value.mode === 'month' && (
        <select
          value={value.month}
          onChange={(e) => set({ month: Number(e.target.value) })}
          className={SELECT_CLASS}
          aria-label="Month"
        >
          {MONTHS_SHORT.map((mo, i) => (
            <option key={mo} value={i}>
              {mo}
            </option>
          ))}
        </select>
      )}

      {value.mode === 'quarter' && (
        <select
          value={value.quarter}
          onChange={(e) => set({ quarter: Number(e.target.value) })}
          className={SELECT_CLASS}
          aria-label="Quarter"
        >
          {[1, 2, 3, 4].map((q) => (
            <option key={q} value={q}>
              Q{q}
            </option>
          ))}
        </select>
      )}

      {value.mode === 'custom' && (
        <div className="flex items-center gap-1.5">
          <input
            type="date"
            value={value.fromDate}
            max={value.toDate || undefined}
            onChange={(e) => set({ fromDate: e.target.value })}
            className={SELECT_CLASS}
            aria-label="From date"
          />
          <span className="text-gray-400 text-xs">→</span>
          <input
            type="date"
            value={value.toDate}
            min={value.fromDate || undefined}
            onChange={(e) => set({ toDate: e.target.value })}
            className={SELECT_CLASS}
            aria-label="To date"
          />
        </div>
      )}

      {showLabel && value.mode !== 'all' && (
        <span className="text-[11px] font-semibold text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800 rounded-md px-2 py-0.5">
          {periodLabel(value)}
        </span>
      )}
    </div>
  );
};
