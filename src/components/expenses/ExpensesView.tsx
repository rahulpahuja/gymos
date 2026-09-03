import React, { useState } from 'react';
import {
  Receipt,
  Plus,
  Search,
  Filter,
  Dumbbell,
  Wrench,
  DollarSign,
  Building2,
} from 'lucide-react';
import { GymExpense, GymEquipment, Branch } from '../../types';
import { storageService } from '../../services/storageService';
import { PeriodFilter } from '../common/PeriodFilter';
import { PeriodState, defaultPeriod, filterByPeriod } from '../../utils/period';

interface ExpensesViewProps {
  expenses: GymExpense[];
  equipment: GymEquipment[];
  branches: Branch[];
}

export const ExpensesView: React.FC<ExpensesViewProps> = ({
  expenses,
  equipment,
  branches,
}) => {
  const [activeTab, setActiveTab] = useState<'expenses' | 'equipment'>('expenses');
  const [selectedBranchId, setSelectedBranchId] = useState<string>('all');
  const [period, setPeriod] = useState<PeriodState>(defaultPeriod('all'));
  const [isAddExpenseOpen, setIsAddExpenseOpen] = useState<boolean>(false);

  // Form state
  const [category, setCategory] = useState<string>('Maintenance');
  const [amount, setAmount] = useState<number>(3500);
  const [description, setDescription] = useState<string>('');
  const [branchId, setBranchId] = useState<string>('branch-1');

  const filteredExpenses = filterByPeriod<GymExpense>(expenses, (e) => e.date, period).filter((e) =>
    selectedBranchId === 'all' ? true : e.branchId === selectedBranchId
  );
  const filteredEquipment = equipment.filter((eq) =>
    selectedBranchId === 'all' ? true : eq.branchId === selectedBranchId
  );

  const totalExpenseAmount = filteredExpenses.reduce((sum, e) => sum + e.amount, 0);

  const handleAddExpense = (e: React.FormEvent) => {
    e.preventDefault();
    const newExp: GymExpense = {
      id: `exp-${Date.now()}`,
      branchId,
      category: category as any,
      vendor: 'Vendor Supply Partner',
      amount,
      date: new Date().toISOString().substring(0, 10),
      paymentMethod: 'UPI',
      description,
      createdBy: 'Admin (Cashier)',
      createdAt: new Date().toISOString().substring(0, 10),
    };
    storageService.saveExpense(newExp);
    setIsAddExpenseOpen(false);
    setDescription('');
  };

  return (
    <div className="space-y-5">
      {/* Top Banner */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <Receipt className="w-5 h-5 text-indigo-600" />
            Expenses & Equipment Maintenance Ledger
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Operational gym outflows, utility expenses, equipment servicing, and asset tracking
          </p>
        </div>

        <button
          onClick={() => setIsAddExpenseOpen(true)}
          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold transition-colors shadow-xs flex items-center gap-1.5"
        >
          <Plus className="w-4 h-4" />
          Record Gym Expense
        </button>
      </div>

      {/* Tabs & Filter Bar */}
      <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab('expenses')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-colors ${
              activeTab === 'expenses'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            Operating Expenses (₹{(totalExpenseAmount || 0).toLocaleString('en-IN')})
          </button>
          <button
            onClick={() => setActiveTab('equipment')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-colors ${
              activeTab === 'equipment'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            Gym Assets & Machinery ({filteredEquipment.length})
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <PeriodFilter value={period} onChange={setPeriod} />
          <select
            value={selectedBranchId}
            onChange={(e) => setSelectedBranchId(e.target.value)}
            className="px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs font-semibold text-slate-700"
          >
            <option value="all">All Branches</option>
            {branches.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Tab 1: Expenses Table */}
      {activeTab === 'expenses' && (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
          <table className="w-full text-left text-xs text-slate-600">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-700 font-semibold uppercase text-[10px] tracking-wider">
              <tr>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Category</th>
                <th className="px-4 py-3">Description</th>
                <th className="px-4 py-3">Branch</th>
                <th className="px-4 py-3">Paid By</th>
                <th className="px-4 py-3 text-right">Amount (₹)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredExpenses.map((exp) => (
                <tr key={exp.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-3 font-mono text-slate-800">{exp.date}</td>
                  <td className="px-4 py-3 capitalize">
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                      {exp.category}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-medium text-slate-800">{exp.description}</td>
                  <td className="px-4 py-3 text-slate-500">
                    {exp.branchId === 'branch-1' ? 'Indore' : 'Bhopal'}
                  </td>
                  <td className="px-4 py-3 text-slate-600">{exp.createdBy || 'Admin'}</td>
                  <td className="px-4 py-3 text-right font-bold text-rose-600 text-sm">
                    ₹{(exp.amount || 0).toLocaleString('en-IN')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Tab 2: Equipment Table */}
      {activeTab === 'equipment' && (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
          <table className="w-full text-left text-xs text-slate-600">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-700 font-semibold uppercase text-[10px] tracking-wider">
              <tr>
                <th className="px-4 py-3">Equipment Name</th>
                <th className="px-4 py-3">Category & Brand</th>
                <th className="px-4 py-3">Purchase Date</th>
                <th className="px-4 py-3">Last Service</th>
                <th className="px-4 py-3">Next Service</th>
                <th className="px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredEquipment.map((eq) => (
                <tr key={eq.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-3 font-bold text-slate-900">{eq.name}</td>
                  <td className="px-4 py-3">
                    <span className="font-semibold text-slate-800 capitalize">{eq.category}</span>
                    <span className="text-slate-400 text-[10px] ml-1">({eq.brand})</span>
                  </td>
                  <td className="px-4 py-3 font-mono text-slate-700">{eq.purchaseDate}</td>
                  <td className="px-4 py-3 font-mono text-slate-600">{eq.lastMaintenanceDate}</td>
                  <td className="px-4 py-3 font-mono text-indigo-600 font-semibold">{eq.nextMaintenanceDate}</td>
                  <td className="px-4 py-3">
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 capitalize">
                      {eq.status.replace('_', ' ')}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal: Add Expense */}
      {isAddExpenseOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <h3 className="font-bold text-slate-900 text-base">Record Gym Outflow Expense</h3>
              <button
                onClick={() => setIsAddExpenseOpen(false)}
                className="text-slate-400 hover:text-slate-700"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAddExpense} className="p-6 space-y-4 text-sm">
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">Expense Category</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-semibold"
                >
                  <option value="maintenance">Equipment Maintenance / Repairs</option>
                  <option value="electricity">Electricity / Power Utilities</option>
                  <option value="rent">Premises Rent</option>
                  <option value="supplies">Gym Cleaning & Sanitization</option>
                  <option value="marketing">Local Advertising & Social</option>
                  <option value="software">Software & Biometric Licenses</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">Amount (₹)</label>
                <input
                  type="number"
                  required
                  min="1"
                  value={amount}
                  onChange={(e) => setAmount(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm font-bold text-rose-600"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">Description / Vendor</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. LifeFitness Treadmill motor belt lubrication"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">Branch</label>
                <select
                  value={branchId}
                  onChange={(e) => setBranchId(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-semibold"
                >
                  {branches.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="pt-2 flex justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAddExpenseOpen(false)}
                  className="px-4 py-2 bg-slate-100 text-slate-700 rounded-lg text-xs font-semibold hover:bg-slate-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-rose-600 text-white rounded-lg text-xs font-bold hover:bg-rose-700 shadow-xs"
                >
                  Record Outflow
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
