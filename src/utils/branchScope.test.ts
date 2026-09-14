import { describe, expect, it } from 'vitest';
import { ALL_BRANCHES, isAllBranches, scopeByBranch } from './branchScope';

describe('isAllBranches', () => {
  it('treats undefined, null, empty string, and the ALL_BRANCHES sentinel as "all"', () => {
    expect(isAllBranches(undefined)).toBe(true);
    expect(isAllBranches(null)).toBe(true);
    expect(isAllBranches('')).toBe(true);
    expect(isAllBranches(ALL_BRANCHES)).toBe(true);
  });

  it('treats any concrete branch id as scoped', () => {
    expect(isAllBranches('branch-1')).toBe(false);
    expect(isAllBranches('0')).toBe(false); // falsy-looking but real id
  });
});

describe('scopeByBranch', () => {
  const items = [
    { id: '1', branchId: 'branch-1' },
    { id: '2', branchId: 'branch-2' },
    { id: '3', branchId: 'all' },
    { id: '4' }, // no branchId at all
  ];

  it('returns every item unfiltered when the target is "all"', () => {
    expect(scopeByBranch(items, 'all')).toEqual(items);
    expect(scopeByBranch(items, '')).toEqual(items);
  });

  it('keeps items matching the exact branch plus globally-shared ("all") items', () => {
    const result = scopeByBranch(items, 'branch-1');
    expect(result.map((i) => i.id)).toEqual(['1', '3']);
  });

  it('excludes items belonging to a different branch and items with no branchId', () => {
    const result = scopeByBranch(items, 'branch-2');
    expect(result.map((i) => i.id)).toEqual(['2', '3']);
    expect(result.some((i) => i.id === '4')).toBe(false);
  });

  it('returns an empty array when nothing matches, without throwing on an empty input', () => {
    expect(scopeByBranch([], 'branch-1')).toEqual([]);
    expect(scopeByBranch(items, 'branch-nonexistent')).toEqual([{ id: '3', branchId: 'all' }]);
  });

  it('does not mutate the input array', () => {
    const copy = items.map((i) => ({ ...i }));
    scopeByBranch(items, 'branch-1');
    expect(items).toEqual(copy);
  });
});
