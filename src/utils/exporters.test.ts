import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { downloadCSV, downloadJSON, downloadTextFile, fileStamp, rupee, toCSV } from './exporters';

describe('toCSV', () => {
  it('joins headers and rows with commas and newlines', () => {
    expect(toCSV(['A', 'B'], [['1', '2'], ['3', '4']])).toBe('A,B\n1,2\n3,4');
  });

  it('renders null/undefined cells as empty strings', () => {
    expect(toCSV(['A'], [[null], [undefined]])).toBe('A\n\n');
  });

  it('stringifies numeric cells', () => {
    expect(toCSV(['Amount'], [[1234]])).toBe('Amount\n1234');
  });

  it('quotes and escapes cells containing commas, quotes, or newlines', () => {
    expect(toCSV(['Name'], [['Smith, John']])).toBe('Name\n"Smith, John"');
    expect(toCSV(['Name'], [['Say "hi"']])).toBe('Name\n"Say ""hi"""');
    expect(toCSV(['Notes'], [['line1\nline2']])).toBe('Notes\n"line1\nline2"');
    expect(toCSV(['Notes'], [['a\r\nb']])).toBe('Notes\n"a\r\nb"');
  });

  it('handles a headers-only export with zero rows', () => {
    expect(toCSV(['A', 'B'], [])).toBe('A,B');
  });

  describe('security: CSV formula injection (OWASP CSV Injection)', () => {
    // A cell opening with = + - @ or a tab is executed as a formula by
    // Excel/Sheets on open. Values here come straight from user input
    // (trainee/vendor names, notes, reference numbers) into exported CSVs.
    it.each([
      '=cmd|\'/c calc\'!A1',
      '+1+1',
      '-1+1',
      '@SUM(1+1)',
      '\t=1+1',
    ])('neutralizes a leading-formula payload: %s', (payload) => {
      const csv = toCSV(['Cell'], [[payload]]);
      const dataLine = csv.split('\n')[1];
      // Excel/Sheets treat a cell starting with ' as forced text, so a
      // neutralized cell must not start (after optional quoting) with the
      // raw dangerous character.
      const unquoted = dataLine.replace(/^"|"$/g, '').replace(/""/g, '"');
      expect(/^[=+\-@\t]/.test(unquoted)).toBe(false);
      expect(unquoted.startsWith("'")).toBe(true);
    });

    it('leaves ordinary text and legitimate negative numbers looking like text unaffected in meaning', () => {
      // A plain minus-prefixed number is still a formula trigger in Excel,
      // so it must still be neutralized — this test locks in that we do NOT
      // special-case "looks like a number" and accidentally skip it.
      const csv = toCSV(['Amount'], [['-500']]);
      expect(csv.split('\n')[1].replace(/^"|"$/g, '')).toBe("'-500");
    });

    it('does not alter values that do not start with a formula-trigger character', () => {
      expect(toCSV(['Name'], [['Rahul Malhotra']])).toBe('Name\nRahul Malhotra');
      expect(toCSV(['Note'], [['cost = 500']])).toBe('Note\ncost = 500');
    });
  });
});

describe('rupee', () => {
  it('formats a positive amount with Indian digit grouping', () => {
    expect(rupee(1234567)).toBe('₹12,34,567');
  });

  it('treats null, undefined, and 0 as ₹0', () => {
    expect(rupee(null)).toBe('₹0');
    expect(rupee(undefined)).toBe('₹0');
    expect(rupee(0)).toBe('₹0');
  });

  it('formats negative amounts', () => {
    expect(rupee(-500)).toBe('₹-500');
  });
});

describe('fileStamp', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('produces a YYYY-MM-DD stamp from the current date', () => {
    vi.setSystemTime(new Date('2026-09-04T18:30:00.000Z'));
    expect(fileStamp()).toBe('2026-09-04');
    expect(fileStamp()).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});

describe('downloadTextFile / downloadCSV / downloadJSON (Blob download plumbing)', () => {
  let clickSpy: ReturnType<typeof vi.fn>;
  let appendSpy: ReturnType<typeof vi.spyOn>;
  let removeSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    clickSpy = vi.fn();
    const originalCreateElement = document.createElement.bind(document);
    vi.spyOn(document, 'createElement').mockImplementation((tag: string) => {
      const el = originalCreateElement(tag);
      if (tag === 'a') (el as HTMLAnchorElement).click = clickSpy;
      return el;
    });
    appendSpy = vi.spyOn(document.body, 'appendChild');
    removeSpy = vi.spyOn(document.body, 'removeChild');
  });

  it('creates an anchor with the right filename and mime, clicks it, and cleans up the object URL', () => {
    downloadTextFile('report.txt', 'hello world', 'text/plain;charset=utf-8;');

    expect(appendSpy).toHaveBeenCalledTimes(1);
    const anchor = appendSpy.mock.calls[0][0] as HTMLAnchorElement;
    expect(anchor.download).toBe('report.txt');
    expect(anchor.href).toContain('blob:');
    expect(clickSpy).toHaveBeenCalledTimes(1);
    expect(removeSpy).toHaveBeenCalledWith(anchor);
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:mock-url');
  });

  it('downloadCSV builds a CSV blob with a .csv filename', () => {
    downloadCSV('trainees.csv', ['Name'], [['Rahul']]);
    const anchor = appendSpy.mock.calls[0][0] as HTMLAnchorElement;
    expect(anchor.download).toBe('trainees.csv');
  });

  it('downloadJSON serializes the given data as pretty JSON', async () => {
    downloadJSON('backup.json', { a: 1 });
    const blob = vi.mocked(URL.createObjectURL).mock.calls[0][0] as Blob;
    expect(blob.type).toBe('application/json;charset=utf-8;');
    // jsdom's Blob has no .text()/.arrayBuffer(); FileReader is the portable way to read it back.
    const content = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsText(blob);
    });
    expect(content).toBe(JSON.stringify({ a: 1 }, null, 2));
  });
});
