/**
 * Printing Service (Section 25)
 * Centralized printing abstraction supporting browser print,
 * thermal printer vouchers, and audited PDF/Print reports.
 */

import { Receipt } from '../types';

export interface ReportKPI {
  label: string;
  value: string;
  subtext?: string;
}

export interface ReportTable {
  title: string;
  headers: string[];
  rows: string[][];
  summaryRow?: string[];
}

export interface PrintableReportConfig {
  title: string;
  subtitle: string;
  branchName?: string;
  dateRange?: string;
  kpis?: ReportKPI[];
  tables: ReportTable[];
}

export class PrintService {
  /**
   * Triggers system print for the currently opened receipt modal or report view
   */
  static printCurrentView(): void {
    if (typeof window !== 'undefined') {
      window.print();
    }
  }

  /**
   * Generates and prints an official audited corporate report formatted for PDF export
   */
  static printReportDocument(config: PrintableReportConfig): void {
    const printWindow = window.open('', '_blank', 'width=950,height=800');
    if (!printWindow) {
      // Fallback if popup blocked: print current view
      window.print();
      return;
    }

    const currentDate = new Date().toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

    let kpiHtml = '';
    if (config.kpis && config.kpis.length > 0) {
      kpiHtml = `
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 12px; margin: 18px 0;">
          ${config.kpis
            .map(
              (k) => `
            <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px;">
              <div style="font-size: 10px; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px;">${k.label}</div>
              <div style="font-size: 18px; font-weight: 800; color: #0f172a; margin-top: 4px;">${k.value}</div>
              ${k.subtext ? `<div style="font-size: 10px; color: #475569; margin-top: 2px;">${k.subtext}</div>` : ''}
            </div>
          `
            )
            .join('')}
        </div>
      `;
    }

    let tablesHtml = '';
    config.tables.forEach((t) => {
      tablesHtml += `
        <div style="margin-top: 24px;">
          <h3 style="font-size: 13px; font-weight: 700; color: #1e293b; margin-bottom: 8px; border-bottom: 2px solid #e2e8f0; padding-bottom: 4px;">${t.title}</h3>
          <table style="width: 100%; border-collapse: collapse; font-size: 11px; margin-top: 6px;">
            <thead>
              <tr style="background: #f1f5f9; border-bottom: 2px solid #cbd5e1;">
                ${t.headers
                  .map(
                    (h, idx) => `
                  <th style="padding: 8px 10px; text-align: ${idx > 1 ? 'right' : 'left'}; font-weight: 700; color: #334155; text-transform: uppercase; font-size: 10px;">${h}</th>
                `
                  )
                  .join('')}
              </tr>
            </thead>
            <tbody>
              ${t.rows
                .map(
                  (row, rIdx) => `
                <tr style="border-bottom: 1px solid #e2e8f0; background: ${rIdx % 2 === 0 ? '#ffffff' : '#f8fafc'};">
                  ${row
                    .map(
                      (cell, cIdx) => `
                    <td style="padding: 7px 10px; text-align: ${cIdx > 1 ? 'right' : 'left'}; color: #1e293b;">${cell}</td>
                  `
                    )
                    .join('')}
                </tr>
              `
                )
                .join('')}
              ${
                t.summaryRow
                  ? `
                <tr style="border-top: 2px solid #0f172a; background: #e2e8f0; font-weight: bold;">
                  ${t.summaryRow
                    .map(
                      (cell, cIdx) => `
                    <td style="padding: 8px 10px; text-align: ${cIdx > 1 ? 'right' : 'left'}; color: #0f172a;">${cell}</td>
                  `
                    )
                    .join('')}
                </tr>
              `
                  : ''
              }
            </tbody>
          </table>
        </div>
      `;
    });

    const docContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>${config.title} - FitOS Commercial Audit</title>
          <style>
            @page {
              size: A4 portrait;
              margin: 15mm;
            }
            body {
              font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
              color: #0f172a;
              background: #ffffff;
              margin: 0;
              padding: 20px;
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
            }
            .header {
              display: flex;
              justify-content: space-between;
              align-items: flex-start;
              border-bottom: 2px solid #4f46e5;
              padding-bottom: 14px;
            }
            .brand {
              display: flex;
              align-items: center;
              gap: 10px;
            }
            .badge {
              background: #4f46e5;
              color: white;
              padding: 4px 10px;
              border-radius: 6px;
              font-weight: 800;
              font-size: 14px;
            }
            .meta {
              text-align: right;
              font-size: 11px;
              color: #64748b;
            }
            .footer {
              margin-top: 40px;
              padding-top: 15px;
              border-top: 1px solid #cbd5e1;
              display: flex;
              justify-content: space-between;
              font-size: 10px;
              color: #64748b;
            }
            .signatures {
              margin-top: 45px;
              display: flex;
              justify-content: space-between;
              padding: 0 40px;
            }
            .sig-line {
              width: 180px;
              border-top: 1px solid #0f172a;
              text-align: center;
              padding-top: 5px;
              font-size: 11px;
              font-weight: 600;
            }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="brand">
              <span class="badge">FitOS</span>
              <div>
                <h1 style="margin: 0; font-size: 18px; font-weight: 800; color: #0f172a;">${config.title}</h1>
                <p style="margin: 2px 0 0 0; font-size: 11px; color: #475569;">${config.subtitle}</p>
              </div>
            </div>
            <div class="meta">
              <div><strong>Branch:</strong> ${config.branchName || 'All Branches (Consolidated)'}</div>
              <div><strong>Generated:</strong> ${currentDate}</div>
              <div><strong>Audit Code:</strong> SEC-60-73-AUDIT</div>
            </div>
          </div>

          ${kpiHtml}
          ${tablesHtml}

          <div class="signatures">
            <div>
              <div class="sig-line">Branch Accountant / Auditor</div>
            </div>
            <div>
              <div class="sig-line">Authorized Signatory / MD</div>
            </div>
          </div>

          <div class="footer">
            <span>FitOS Pro • Commercial Fitness Operations & PT Segregated Revenue Ledger</span>
            <span>Page 1 of 1 • System Generated Audited Record</span>
          </div>

          <script>
            window.onload = function() {
              setTimeout(function() {
                window.print();
              }, 400);
            };
          </script>
        </body>
      </html>
    `;

    printWindow.document.open();
    printWindow.document.write(docContent);
    printWindow.document.close();
  }

  /**
   * Generates a thermal-printer receipt formatted string for POS slips
   */
  static formatThermalSlip(receipt: Receipt): string {
    const divider = '==========================================\n';
    let output = '';
    output += `        ${receipt.branchName.toUpperCase()}\n`;
    output += `   ${receipt.branchAddress}\n`;
    output += `   Tel: ${receipt.branchPhone}\n`;
    output += divider;
    output += `Receipt #: ${receipt.receiptNumber}\n`;
    output += `Date:      ${receipt.date}\n`;
    output += `Member:    ${receipt.traineeName}\n`;
    output += `Phone:     ${receipt.traineePhone}\n`;
    output += divider;
    output += `ITEM / SERVICE              AMOUNT\n`;
    output += divider;
    receipt.items.forEach((item) => {
      const desc = item.description.padEnd(26, ' ').substring(0, 26);
      const amt = `₹${(item.amount || 0).toLocaleString('en-IN')}`.padStart(14, ' ');
      output += `${desc}${amt}\n`;
      output += `  [${item.category}]\n`;
    });
    output += divider;
    output += `TOTAL PAID:          ₹${(receipt.currentPayment || 0).toLocaleString('en-IN')}\n`;
    output += `Payment Mode:        ${receipt.paymentMethod}\n`;
    output += `Prev Balance:        ₹${(receipt.previousDue || 0).toLocaleString('en-IN')}\n`;
    output += `Current Balance:     ₹${(receipt.remainingDue || 0).toLocaleString('en-IN')}\n`;
    output += divider;
    output += `   Thank you for working out with us!\n`;
    output += `        Authorized Signatory\n`;
    return output;
  }
}
