/**
 * Global branch scoping. When a branch is selected in the header, every data
 * section is narrowed to records belonging to that branch.
 */

export const ALL_BRANCHES = 'all';

export function isAllBranches(branchId: string | undefined | null): boolean {
  return !branchId || branchId === ALL_BRANCHES;
}

export function scopeByBranch<T extends { branchId?: string }>(
  items: T[],
  branchId: string,
): T[] {
  if (isAllBranches(branchId)) return items;
  return items.filter((item) => item.branchId === branchId || item.branchId === ALL_BRANCHES);
}
