import React from 'react';
import { X, Printer, FileText, CheckCircle2, Building2 } from 'lucide-react';
import { Receipt } from '../../types';
import { PrintService } from '../../services/printService';

interface ReceiptModalProps {
  receipt: Receipt | null;
  onClose: () => void;
}

export const ReceiptModal: React.FC<ReceiptModalProps> = ({ receipt, onClose }) => {
  if (!receipt) return null;

  const handlePrint = () => {
    PrintService.printCurrentView();
  };

  const handleThermalPrint = () => {
    const text = PrintService.formatThermalSlip(receipt);
    const w = window.open('', '_blank', 'width=350,height=600');
    if (w) {
      w.document.write(`<pre style="font-family: monospace; font-size: 12px; padding: 10px;">${text}</pre>`);
      w.document.close();
      w.focus();
      w.print();
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Modal Controls (Hidden in Print) */}
        <div className="px-6 py-3 border-b border-slate-200 flex items-center justify-between bg-slate-50 print:hidden">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-700">
            <FileText className="w-4 h-4 text-indigo-600" />
            <span>Official Segregated Money Receipt</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleThermalPrint}
              className="px-2.5 py-1 text-xs font-semibold bg-slate-200 text-slate-800 rounded hover:bg-slate-300"
              title="Print 58mm/80mm Thermal POS Slip"
            >
              Thermal Slip
            </button>
            <button
              onClick={handlePrint}
              className="px-3 py-1 text-xs font-bold bg-indigo-600 text-white rounded hover:bg-indigo-700 flex items-center gap-1"
            >
              <Printer className="w-3.5 h-3.5" />
              Print Receipt
            </button>
            <button
              onClick={onClose}
              className="p-1 rounded text-slate-400 hover:text-slate-700"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Voucher Paper */}
        <div className="p-8 space-y-6 text-slate-800 text-xs font-sans print:p-0 print:m-0" id="printable-receipt-area">
          {/* Gym Header */}
          <div className="border-b-2 border-slate-900 pb-4 flex justify-between items-start">
            <div>
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-indigo-600 text-white font-black flex items-center justify-center text-sm">
                  G
                </div>
                <h1 className="text-xl font-black text-slate-900 tracking-tight">
                  GYMOS FITNESS CLUB
                </h1>
              </div>
              <div className="text-[11px] text-slate-600 mt-1">
                <strong>Branch:</strong> {receipt.branchName}
              </div>
              <div className="text-[11px] text-slate-500">{receipt.branchAddress}</div>
              <div className="text-[11px] text-slate-500">Phone: {receipt.branchPhone} | GSTIN: {receipt.gstNumber || '23AAACG0921M1Z4'}</div>
            </div>

            <div className="text-right">
              <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-sm bg-emerald-50 text-emerald-800 border border-emerald-300">
                Payment Confirmed
              </span>
              <div className="font-mono font-bold text-sm text-slate-900 mt-1">
                {receipt.receiptNumber}
              </div>
              <div className="text-slate-500 text-[11px] mt-0.5">Date: {receipt.date}</div>
            </div>
          </div>

          {/* Trainee Details */}
          <div className="grid grid-cols-2 gap-4 bg-slate-50 p-3 rounded-lg border border-slate-200 text-xs">
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-400">Received From</span>
              <div className="font-bold text-slate-900 text-sm">{receipt.traineeName}</div>
              <div className="text-slate-600">{receipt.traineePhone}</div>
            </div>
            <div className="text-right">
              <span className="text-[10px] uppercase font-bold text-slate-400">Payment Details</span>
              <div className="font-bold text-slate-900 capitalize">
                Mode: {receipt.paymentMethod.replace('_', ' ')}
              </div>
              <div className="text-slate-500 font-mono text-[11px]">
                {receipt.transactionRef ? `Ref: ${receipt.transactionRef}` : 'Cash In Hand'}
              </div>
            </div>
          </div>

          {/* Itemized Segregated Bill (Crucial Prompt Section 72) */}
          <div>
            <table className="w-full text-left text-xs border border-slate-200">
              <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                <tr>
                  <th className="p-2.5">Item / Service Category</th>
                  <th className="p-2.5">Description</th>
                  <th className="p-2.5 text-right">Amount (₹)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {receipt.items.map((item, idx) => (
                  <tr key={idx}>
                    <td className="p-2.5 font-semibold text-slate-900">
                      <span className="text-[10px] font-bold uppercase px-1.5 py-0.5 rounded-sm bg-indigo-50 text-indigo-700 mr-1.5 border border-indigo-100">
                        {item.category === 'personal_training' ? 'PT Revenue' : 'General Gym'}
                      </span>
                    </td>
                    <td className="p-2.5 text-slate-700">{item.description}</td>
                    <td className="p-2.5 text-right font-bold text-slate-900">
                      ₹{(item.amount || 0).toLocaleString('en-IN')}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="border-t-2 border-slate-300 bg-slate-50 font-bold text-xs">
                <tr>
                  <td colSpan={2} className="p-2.5 text-slate-700 text-right">
                    Total Amount Paid:
                  </td>
                  <td className="p-2.5 text-right text-sm font-black text-indigo-700">
                    ₹{(receipt.currentPayment || 0).toLocaleString('en-IN')}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>

          {/* Dues Audit Summary */}
          <div className="grid grid-cols-3 gap-2 p-3 bg-slate-50 rounded-lg border border-slate-200 text-center text-xs">
            <div>
              <span className="text-slate-400 text-[10px] uppercase font-bold">Previous Due</span>
              <div className="font-bold text-slate-800 mt-0.5">₹{(receipt.previousDue || 0).toLocaleString('en-IN')}</div>
            </div>
            <div>
              <span className="text-slate-400 text-[10px] uppercase font-bold">This Payment</span>
              <div className="font-bold text-emerald-600 mt-0.5">₹{(receipt.currentPayment || 0).toLocaleString('en-IN')}</div>
            </div>
            <div>
              <span className="text-slate-400 text-[10px] uppercase font-bold">Remaining Due</span>
              <div className="font-bold text-rose-600 mt-0.5">₹{(receipt.remainingDue || 0).toLocaleString('en-IN')}</div>
            </div>
          </div>

          {/* Signatures */}
          <div className="pt-8 flex justify-between items-end text-xs border-t border-slate-200">
            <div className="text-[11px] text-slate-500">
              <p>Generated by: {receipt.generatedBy}</p>
              <p>Computer generated tax invoice receipt.</p>
            </div>
            <div className="text-center">
              <div className="w-40 border-b border-slate-400 pb-1 mb-1"></div>
              <span className="text-[10px] font-bold uppercase text-slate-600">
                Authorized Signatory
              </span>
            </div>
          </div>
        </div>

        {/* Modal Close Footer */}
        <div className="px-6 py-3 border-t border-slate-200 bg-slate-50 flex justify-end print:hidden">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 text-white rounded-lg text-xs font-semibold hover:bg-slate-900"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
