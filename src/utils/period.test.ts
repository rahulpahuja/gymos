import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  defaultPeriod,
  filterByPeriod,
  isWithinPeriod,
  parseFlexibleDate,
  periodLabel,
  periodRange,
  PeriodState,
} from './period';

const basePeriod = (overrides: Partial<PeriodState>): PeriodState => ({
  mode: 'all',
  year: 2026,
  month: 0,
  quarter: 1,
  fromDate: '',
  toDate: '',
  ...overrides,
});

describe('defaultPeriod', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('derives year/month/quarter from the current date', () => {
    vi.setSystemTime(new Date(2026, 4, 15)); // May 2026 -> Q2
    const p = defaultPeriod();
    expect(p.mode).toBe('all');
    expect(p.year).toBe(2026);
    expect(p.month).toBe(4);
    expect(p.quarter).toBe(2);
    expect(p.fromDate).toBe('');
    expect(p.toDate).toBe('');
  });

  it('computes quarter correctly at every quarter boundary', () => {
    const cases: [month: number, quarter: number][] = [
      [0, 1], [2, 1], [3, 2], [5, 2], [6, 3], [8, 3], [9, 4], [11, 4],
    ];
    for (const [month, quarter] of cases) {
      vi.setSystemTime(new Date(2026, month, 1));
      expect(defaultPeriod().quarter).toBe(quarter);
    }
  });

  it('honors the requested mode', () => {
    expect(defaultPeriod('month').mode).toBe('month');
  });
});

describe('periodRange', () => {
  it('returns unbounded range for "all"', () => {
    expect(periodRange(basePeriod({ mode: 'all' }))).toEqual({ from: null, to: null });
  });

  it('spans the full calendar year for "year"', () => {
    const { from, to } = periodRange(basePeriod({ mode: 'year', year: 2026 }));
    expect(from).toEqual(new Date(2026, 0, 1));
    expect(to).toEqual(new Date(2026, 11, 31, 23, 59, 59, 999));
  });

  it('spans the correct days for "month", including a December year-boundary month', () => {
    const dec = periodRange(basePeriod({ mode: 'month', year: 2026, month: 11 }));
    expect(dec.from).toEqual(new Date(2026, 11, 1));
    expect(dec.to).toEqual(new Date(2026, 11, 31, 23, 59, 59, 999));

    // February in a non-leap year must not overrun into March.
    const feb = periodRange(basePeriod({ mode: 'month', year: 2025, month: 1 }));
    expect(feb.to).toEqual(new Date(2025, 1, 28, 23, 59, 59, 999));

    // February in a leap year.
    const febLeap = periodRange(basePeriod({ mode: 'month', year: 2024, month: 1 }));
    expect(febLeap.to).toEqual(new Date(2024, 1, 29, 23, 59, 59, 999));
  });

  it('spans exactly three months for each quarter', () => {
    const q1 = periodRange(basePeriod({ mode: 'quarter', year: 2026, quarter: 1 }));
    expect(q1.from).toEqual(new Date(2026, 0, 1));
    expect(q1.to).toEqual(new Date(2026, 2, 31, 23, 59, 59, 999));

    const q4 = periodRange(basePeriod({ mode: 'quarter', year: 2026, quarter: 4 }));
    expect(q4.from).toEqual(new Date(2026, 9, 1));
    expect(q4.to).toEqual(new Date(2026, 11, 31, 23, 59, 59, 999));
  });

  it('resolves custom ranges from fromDate/toDate, each bound independently optional', () => {
    const both = periodRange(basePeriod({ mode: 'custom', fromDate: '2026-01-01', toDate: '2026-01-31' }));
    expect(both.from).toEqual(new Date('2026-01-01T00:00:00'));
    expect(both.to).toEqual(new Date('2026-01-31T23:59:59.999'));

    const fromOnly = periodRange(basePeriod({ mode: 'custom', fromDate: '2026-01-01', toDate: '' }));
    expect(fromOnly.from).not.toBeNull();
    expect(fromOnly.to).toBeNull();

    const neither = periodRange(basePeriod({ mode: 'custom', fromDate: '', toDate: '' }));
    expect(neither).toEqual({ from: null, to: null });
  });
});

describe('parseFlexibleDate', () => {
  it('returns null for empty/nullish input', () => {
    expect(parseFlexibleDate(undefined)).toBeNull();
    expect(parseFlexibleDate(null)).toBeNull();
    expect(parseFlexibleDate('')).toBeNull();
    expect(parseFlexibleDate('   ')).toBeNull();
  });

  it('parses plain YYYY-MM-DD dates', () => {
    const d = parseFlexibleDate('2026-09-05');
    expect(d?.getFullYear()).toBe(2026);
    expect(d?.getMonth()).toBe(8);
    expect(d?.getDate()).toBe(5);
  });

  it('parses "YYYY-MM-DD HH:mm" and "YYYY-MM-DD HH:mm:ss" shapes (space, not T)', () => {
    const withMinutes = parseFlexibleDate('2026-09-05 14:30');
    expect(withMinutes?.getHours()).toBe(14);
    expect(withMinutes?.getMinutes()).toBe(30);

    const withSeconds = parseFlexibleDate('2026-09-05 14:30:15');
    expect(withSeconds?.getSeconds()).toBe(15);
  });

  it('parses full ISO strings unchanged', () => {
    const d = parseFlexibleDate('2026-09-05T14:30:00.000Z');
    expect(d).not.toBeNull();
    expect(d?.toISOString()).toBe('2026-09-05T14:30:00.000Z');
  });

  it('returns null for garbage / unparsable input instead of throwing', () => {
    expect(parseFlexibleDate('not-a-date')).toBeNull();
    expect(parseFlexibleDate('<script>alert(1)</script>')).toBeNull();
    expect(parseFlexibleDate('0000-00-00')).toBeNull();
  });
});

describe('isWithinPeriod', () => {
  it('is always true in "all" mode, even for a missing/garbage date', () => {
    expect(isWithinPeriod(undefined, basePeriod({ mode: 'all' }))).toBe(true);
    expect(isWithinPeriod('garbage', basePeriod({ mode: 'all' }))).toBe(true);
  });

  it('is false when the date is missing or unparsable in any bounded mode', () => {
    const p = basePeriod({ mode: 'year', year: 2026 });
    expect(isWithinPeriod(undefined, p)).toBe(false);
    expect(isWithinPeriod('not-a-date', p)).toBe(false);
  });

  it('includes dates exactly on the inclusive boundary', () => {
    const p = basePeriod({ mode: 'year', year: 2026 });
    expect(isWithinPeriod('2026-01-01T00:00:00', p)).toBe(true);
    expect(isWithinPeriod('2026-12-31T23:59:59.999', p)).toBe(true);
  });

  it('excludes dates just outside the boundary', () => {
    const p = basePeriod({ mode: 'year', year: 2026 });
    expect(isWithinPeriod('2025-12-31T23:59:59.999', p)).toBe(false);
    expect(isWithinPeriod('2027-01-01T00:00:00', p)).toBe(false);
  });
});

describe('filterByPeriod', () => {
  it('short-circuits in "all" mode without ever calling the date accessor', () => {
    const getDate = vi.fn(() => '2026-01-01');
    const items = [{ x: 1 }, { x: 2 }];
    const result = filterByPeriod(items, getDate, basePeriod({ mode: 'all' }));
    expect(result).toEqual(items);
    expect(getDate).not.toHaveBeenCalled();
  });

  it('filters items whose accessor date falls outside the period', () => {
    const items = [
      { id: 'in', date: '2026-06-15' },
      { id: 'out', date: '2025-06-15' },
      { id: 'missing', date: undefined },
    ];
    const result = filterByPeriod(items, (i) => i.date, basePeriod({ mode: 'year', year: 2026 }));
    expect(result.map((i) => i.id)).toEqual(['in']);
  });
});

describe('periodLabel', () => {
  it('formats every mode distinctly', () => {
    expect(periodLabel(basePeriod({ mode: 'all' }))).toBe('All Time');
    expect(periodLabel(basePeriod({ mode: 'year', year: 2026 }))).toBe('FY 2026');
    expect(periodLabel(basePeriod({ mode: 'month', year: 2026, month: 0 }))).toBe('January 2026');
    expect(periodLabel(basePeriod({ mode: 'quarter', year: 2026, quarter: 3 }))).toBe('Q3 2026');
  });

  it('formats custom ranges for every from/to combination', () => {
    expect(periodLabel(basePeriod({ mode: 'custom', fromDate: '2026-01-01', toDate: '2026-01-31' }))).toBe(
      '2026-01-01 to 2026-01-31'
    );
    expect(periodLabel(basePeriod({ mode: 'custom', fromDate: '2026-01-01', toDate: '' }))).toBe('From 2026-01-01');
    expect(periodLabel(basePeriod({ mode: 'custom', fromDate: '', toDate: '2026-01-31' }))).toBe('Until 2026-01-31');
    expect(periodLabel(basePeriod({ mode: 'custom', fromDate: '', toDate: '' }))).toBe('Custom Range');
  });
});
