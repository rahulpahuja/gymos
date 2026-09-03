/**
 * Client-side file export helpers (CSV / JSON / plain text) via Blob download.
 */

type Cell = string | number | null | undefined;

export function toCSV(headers: string[], rows: Cell[][]): string {
  const escape = (value: Cell): string => {
    const s = value === null || value === undefined ? '' : String(value);
    return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return [headers.map(escape).join(','), ...rows.map((r) => r.map(escape).join(','))].join('\n');
}

export function downloadTextFile(
  filename: string,
  content: string,
  mime = 'text/plain;charset=utf-8;',
): void {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function downloadCSV(filename: string, headers: string[], rows: Cell[][]): void {
  downloadTextFile(filename, toCSV(headers, rows), 'text/csv;charset=utf-8;');
}

export function downloadJSON(filename: string, data: unknown): void {
  downloadTextFile(filename, JSON.stringify(data, null, 2), 'application/json;charset=utf-8;');
}

/** Short date stamp for filenames, e.g. 2026-09-04. */
export function fileStamp(): string {
  return new Date().toISOString().substring(0, 10);
}

export const rupee = (n: number | undefined | null): string =>
  `₹${(n || 0).toLocaleString('en-IN')}`;
