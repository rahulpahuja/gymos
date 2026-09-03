/**
 * Reusable period / date-range filtering primitives.
 * Supports monthly, quarterly, yearly, and custom from/to reviews across every data section.
 */

export type PeriodMode = 'all' | 'month' | 'quarter' | 'year' | 'custom';

export interface PeriodState {
  mode: PeriodMode;
  year: number;
  month: number; // 0-11, used when mode === 'month'
  quarter: number; // 1-4, used when mode === 'quarter'
  fromDate: string; // 'YYYY-MM-DD', used when mode === 'custom'
  toDate: string; // 'YYYY-MM-DD', used when mode === 'custom'
}

const MONTHS_LONG = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

export const MONTHS_SHORT = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];

export function defaultPeriod(mode: PeriodMode = 'all'): PeriodState {
  const now = new Date();
  return {
    mode,
    year: now.getFullYear(),
    month: now.getMonth(),
    quarter: Math.floor(now.getMonth() / 3) + 1,
    fromDate: '',
    toDate: '',
  };
}

/** Resolve a period to an inclusive [from, to] range. `null` bounds mean unbounded. */
export function periodRange(p: PeriodState): { from: Date | null; to: Date | null } {
  switch (p.mode) {
    case 'year':
      return { from: new Date(p.year, 0, 1), to: new Date(p.year, 11, 31, 23, 59, 59, 999) };
    case 'month':
      return { from: new Date(p.year, p.month, 1), to: new Date(p.year, p.month + 1, 0, 23, 59, 59, 999) };
    case 'quarter': {
      const startMonth = (p.quarter - 1) * 3;
      return { from: new Date(p.year, startMonth, 1), to: new Date(p.year, startMonth + 3, 0, 23, 59, 59, 999) };
    }
    case 'custom':
      return {
        from: p.fromDate ? new Date(`${p.fromDate}T00:00:00`) : null,
        to: p.toDate ? new Date(`${p.toDate}T23:59:59.999`) : null,
      };
    default:
      return { from: null, to: null };
  }
}

/** Parse the varied date shapes used across the app ('YYYY-MM-DD', 'YYYY-MM-DD HH:mm[:ss]', ISO). */
export function parseFlexibleDate(raw?: string | null): Date | null {
  if (!raw) return null;
  const s = String(raw).trim();
  if (!s) return null;
  const normalized = s.includes('T') ? s : s.replace(' ', 'T');
  const d = new Date(normalized);
  if (!Number.isNaN(d.getTime())) return d;
  const fallback = new Date(s);
  return Number.isNaN(fallback.getTime()) ? null : fallback;
}

export function isWithinPeriod(dateRaw: string | undefined | null, p: PeriodState): boolean {
  if (p.mode === 'all') return true;
  const d = parseFlexibleDate(dateRaw);
  if (!d) return false;
  const { from, to } = periodRange(p);
  if (from && d < from) return false;
  if (to && d > to) return false;
  return true;
}

export function filterByPeriod<T>(
  items: T[],
  getDate: (item: T) => string | undefined | null,
  p: PeriodState,
): T[] {
  if (p.mode === 'all') return items;
  return items.filter((item) => isWithinPeriod(getDate(item), p));
}

export function periodLabel(p: PeriodState): string {
  switch (p.mode) {
    case 'year':
      return `FY ${p.year}`;
    case 'month':
      return `${MONTHS_LONG[p.month]} ${p.year}`;
    case 'quarter':
      return `Q${p.quarter} ${p.year}`;
    case 'custom':
      if (p.fromDate && p.toDate) return `${p.fromDate} to ${p.toDate}`;
      if (p.fromDate) return `From ${p.fromDate}`;
      if (p.toDate) return `Until ${p.toDate}`;
      return 'Custom Range';
    default:
      return 'All Time';
  }
}
