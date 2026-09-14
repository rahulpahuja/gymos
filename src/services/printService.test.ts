import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { PrintService } from './printService';
import { Receipt } from '../types';

describe('PrintService.printReportDocument', () => {
  let writtenHtml = '';
  let fakeWindow: { document: { open: () => void; write: (html: string) => void; close: () => void } };
  let openSpy: ReturnType<typeof vi.spyOn>;
  let printSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    writtenHtml = '';
    fakeWindow = {
      document: {
        open: vi.fn(),
        write: (html: string) => { writtenHtml += html; },
        close: vi.fn(),
      },
    };
    openSpy = vi.spyOn(window, 'open').mockReturnValue(fakeWindow as unknown as Window);
    printSpy = vi.spyOn(window, 'print').mockImplementation(() => {});
  });

  afterEach(() => {
    openSpy.mockRestore();
    printSpy.mockRestore();
  });

  it('renders title, subtitle, branch, KPIs, and table content into the popup document', () => {
    PrintService.printReportDocument({
      title: 'Trainer Salary Statement',
      subtitle: 'Amit Verma',
      branchName: 'Indore Central',
      tables: [{ title: 'Earnings', headers: ['Component', 'Amount'], rows: [['Base Salary', '₹25,000']] }],
      kpis: [{ label: 'Net Payable', value: '₹25,000', subtext: 'Final' }],
    });
    expect(writtenHtml).toContain('Trainer Salary Statement');
    expect(writtenHtml).toContain('Indore Central');
    expect(writtenHtml).toContain('Net Payable');
    expect(writtenHtml).toContain('Base Salary');
  });

  it('renders the dateRange field when provided (regression: it was accepted by the config type but silently dropped)', () => {
    PrintService.printReportDocument({
      title: 'Statement',
      subtitle: 'x',
      dateRange: 'Period: FY 2026',
      tables: [],
    });
    expect(writtenHtml).toContain('Period: FY 2026');
  });

  it('omits the date-range line entirely when dateRange is not provided', () => {
    PrintService.printReportDocument({ title: 'Statement', subtitle: 'x', tables: [] });
    expect(writtenHtml).not.toContain('Period:');
  });

  it('falls back to window.print() when the popup is blocked, without throwing', () => {
    openSpy.mockReturnValue(null);
    expect(() =>
      PrintService.printReportDocument({ title: 'X', subtitle: 'Y', tables: [] })
    ).not.toThrow();
    expect(printSpy).toHaveBeenCalledTimes(1);
  });

  describe('security: HTML/script injection from report data', () => {
    it('escapes a <script> payload in the title so it cannot execute in the printed document', () => {
      PrintService.printReportDocument({
        title: '<script>window.__pwned = true</script>',
        subtitle: 'x',
        tables: [],
      });
      expect(writtenHtml).not.toContain('<script>window.__pwned');
      expect(writtenHtml).toContain('&lt;script&gt;');
    });

    it('escapes an injected payload coming from user-editable table cell data (e.g. a trainee note)', () => {
      PrintService.printReportDocument({
        title: 'Statement',
        subtitle: 'x',
        tables: [{
          title: 'Notes',
          headers: ['Notes'],
          rows: [['"><img src=x onerror=alert(1)>']],
        }],
      });
      expect(writtenHtml).not.toContain('<img src=x onerror=alert(1)>');
      expect(writtenHtml).toContain('&lt;img');
    });

    it('escapes an injected payload in KPI label/value/subtext and the summary row', () => {
      PrintService.printReportDocument({
        title: 'Statement',
        subtitle: 'x',
        kpis: [{ label: '<b>Total</b>', value: '</td><script>1</script>', subtext: '<i>x</i>' }],
        tables: [{
          title: 'T',
          headers: ['<h1>H</h1>'],
          rows: [],
          summaryRow: ['<script>2</script>'],
        }],
      });
      expect(writtenHtml).not.toContain('<script>1</script>');
      expect(writtenHtml).not.toContain('<script>2</script>');
      expect(writtenHtml).not.toContain('<h1>H</h1>');
      expect(writtenHtml).toContain('&lt;h1&gt;');
    });

    it('escapes an injected branch name', () => {
      PrintService.printReportDocument({
        title: 'Statement',
        subtitle: 'x',
        branchName: '<svg onload=alert(1)>',
        tables: [],
      });
      expect(writtenHtml).not.toContain('<svg onload=alert(1)>');
    });

    it('still renders plain ampersands and safe punctuation legibly (no double-escaping regressions)', () => {
      PrintService.printReportDocument({
        title: 'Fitness & Wellness',
        subtitle: "Owner's Report",
        tables: [],
      });
      expect(writtenHtml).toContain('Fitness &amp; Wellness');
      expect(writtenHtml).toContain('Owner&#39;s Report');
    });
  });
});

describe('PrintService.formatThermalSlip', () => {
  const receipt: Receipt = {
    receiptNumber: 'REC-1', transactionId: 'tx1', date: '2026-09-01',
    traineeId: 'tr1', traineeName: 'Rahul Malhotra', traineePhone: '9000000000',
    branchId: 'branch-1', branchName: 'Indore Central', branchAddress: 'Race Course Rd', branchPhone: '0731',
    items: [{ description: 'Annual Membership', category: 'General Membership', amount: 12000 }],
    totalAmount: 12000, paymentMethod: 'UPI', previousDue: 12000, currentPayment: 12000, remainingDue: 0,
    authorizedSignature: 'Admin', terms: '',
  };

  it('includes every core receipt field in the generated slip text', () => {
    const slip = PrintService.formatThermalSlip(receipt);
    expect(slip).toContain('REC-1');
    expect(slip).toContain(receipt.branchName.toUpperCase());
    expect(slip).toContain('Rahul Malhotra');
    expect(slip).toContain('₹12,000');
  });

  it('handles multiple line items and defaults a missing item amount to zero', () => {
    const slip = PrintService.formatThermalSlip({
      ...receipt,
      items: [
        { description: 'Annual Membership', category: 'General Membership', amount: 12000 },
        { description: 'Registration Fee', category: 'Registration', amount: undefined as unknown as number },
      ],
    });
    expect(slip).toContain('₹0');
    expect((slip.match(/\[/g) || []).length).toBe(2);
  });

  it('truncates an overly long item description to fit the fixed-width slip layout', () => {
    const slip = PrintService.formatThermalSlip({
      ...receipt,
      items: [{ description: 'A'.repeat(60), category: 'Other', amount: 100 }],
    });
    const line = slip.split('\n').find((l) => l.startsWith('AAAA'))!;
    expect(line.slice(0, 26)).toBe('A'.repeat(26));
  });
});
