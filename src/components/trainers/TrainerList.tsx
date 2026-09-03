import React, { useState } from 'react';
import {
  Award,
  Search,
  Plus,
  Eye,
  HandCoins,
  DollarSign,
  Calendar,
  Filter,
  CheckCircle2,
  Users,
  X,
} from 'lucide-react';
import { Trainer, PTSubscription, Branch } from '../../types';
import { TrainerDetailModal } from './TrainerDetailModal';
import { storageService } from '../../services/storageService';

interface TrainerListProps {
  trainers: Trainer[];
  ptSubscriptions: PTSubscription[];
  branches: Branch[];
  onOpenSettlement: (trainerId: string) => void;
}

export const TrainerList: React.FC<TrainerListProps> = ({
  trainers,
  ptSubscriptions,
  branches,
  onOpenSettlement,
}) => {
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedBranchId, setSelectedBranchId] = useState<string>('all');
  const [selectedTrainer, setSelectedTrainer] = useState<Trainer | null>(null);

  // New Trainer Modal State
  const [isAddModalOpen, setIsAddModalOpen] = useState<boolean>(false);
  const [fullName, setFullName] = useState<string>('');
  const [phone, setPhone] = useState<string>('');
  const [email, setEmail] = useState<string>('');
  const [specializations, setSpecializations] = useState<string>('Hypertrophy, Strength & Conditioning');
  const [baseSalary, setBaseSalary] = useState<number>(25000);
  const [salaryType, setSalaryType] = useState<'monthly' | 'daily' | 'hourly'>('monthly');
  const [branchId, setBranchId] = useState<string>('branch-1');

  const filteredTrainers = trainers.filter((t) => {
    if (selectedBranchId !== 'all' && t.branchId !== selectedBranchId) return false;
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      if (!t.fullName.toLowerCase().includes(term) && !t.phone.includes(term)) return false;
    }
    return true;
  });

  const totalCommissionEarned = trainers.reduce((sum, t) => sum + (t.ptCommissionEarned || 0), 0);
  const totalCommissionPaid = trainers.reduce((sum, t) => sum + (t.ptCommissionPaid || 0), 0);
  const totalCommissionOutstanding = trainers.reduce((sum, t) => sum + (t.ptCommissionOutstanding || 0), 0);

  const handleAddTrainer = (e: React.FormEvent) => {
    e.preventDefault();
    const newTrainer: Trainer = {
      id: `trainer-${Date.now()}`,
      fullName,
      phone,
      email: email || `${fullName.toLowerCase().replace(/\s+/g, '.')}@gymos.com`,
      address: 'Near Gym Facility, Main Road',
      dob: '1992-06-15',
      joiningDate: new Date().toISOString().substring(0, 10),
      emergencyContact: '+91 98260 99999',
      qualifications: 'Certified Personal Trainer (CPT), Sports Nutrition',
      certifications: ['ACE-CPT', 'CPR/AED'],
      specializations: specializations.split(',').map((s) => s.trim()),
      experienceYears: 4,
      salaryType,
      baseSalary,
      bankAccountDetails: 'HDFC Bank, A/C: 5010023491823, IFSC: HDFC0001234',
      branchId,
      status: 'active',
      ptRevenueGenerated: 0,
      ptCommissionEarned: 0,
      ptCommissionPaid: 0,
      ptCommissionOutstanding: 0,
      salaryPayable: baseSalary,
      advancesOutstanding: 0,
      totalSessionsConducted: 0,
      createdAt: new Date().toISOString().substring(0, 10),
    };

    storageService.saveTrainer(newTrainer);
    setIsAddModalOpen(false);
    setFullName('');
    setPhone('');
  };

  return (
    <div className="space-y-5">
      {/* Top Banner */}
      <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
            <Award className="w-5 h-5 text-indigo-600" />
            Trainers & Coaches Roster (Section 79)
          </h2>
          <p className="text-xs text-gray-500 mt-0.5">
            Base salaries, PT commission accruals, disbursements, and active client load
          </p>
        </div>

        <button
          onClick={() => setIsAddModalOpen(true)}
          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold transition-colors shadow-xs flex items-center gap-1.5"
        >
          <Plus className="w-4 h-4" />
          Onboard New Coach
        </button>
      </div>

      {/* Bento Grid Stats Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        {/* Dark Bento Tile: Total Active Coaches */}
        <div className="bg-[#111827] text-white p-4 rounded-xl border border-gray-900 shadow-sm flex flex-col justify-between">
          <div>
            <div className="text-[11px] font-bold text-gray-400 uppercase tracking-wide">
              Active Head Coaches
            </div>
            <div className="text-2xl font-black text-white mt-1">{trainers.length}</div>
          </div>
          <div className="text-[10px] text-gray-400 mt-2 border-t border-gray-800 pt-1.5 flex items-center justify-between">
            <span>Roster Capacity</span>
            <span className="text-emerald-400 font-mono font-bold">100% Certified</span>
          </div>
        </div>

        {/* Commission Earned */}
        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
          <div className="text-[11px] font-bold text-indigo-700 uppercase">
            Total Accrued Commission
          </div>
          <div className="text-2xl font-black text-indigo-600 mt-1">
            ₹{(totalCommissionEarned || 0).toLocaleString('en-IN')}
          </div>
          <div className="text-[10px] text-gray-400 mt-1">Lifetime earned across PT sessions</div>
        </div>

        {/* Commission Paid */}
        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
          <div className="text-[11px] font-bold text-emerald-700 uppercase">
            Disbursed Payouts
          </div>
          <div className="text-2xl font-black text-emerald-600 mt-1">
            ₹{(totalCommissionPaid || 0).toLocaleString('en-IN')}
          </div>
          <div className="text-[10px] text-gray-400 mt-1">Settled via audited bank transfers</div>
        </div>

        {/* Commission Outstanding */}
        <div className="bg-white p-4 rounded-xl border border-rose-200 bg-rose-50/20 shadow-sm">
          <div className="text-[11px] font-bold text-rose-700 uppercase">
            Pending Commission Payable
          </div>
          <div className="text-2xl font-black text-rose-600 mt-1">
            ₹{(totalCommissionOutstanding || 0).toLocaleString('en-IN')}
          </div>
          <div className="text-[10px] text-rose-700 mt-1">Ready for settlement batch</div>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-white p-3 rounded-xl border border-gray-200 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search trainer name or phone..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 bg-gray-50 border border-gray-300 rounded-lg text-xs focus:ring-1 focus:ring-indigo-500 focus:outline-none"
          />
        </div>

        <select
          value={selectedBranchId}
          onChange={(e) => setSelectedBranchId(e.target.value)}
          className="px-3 py-1.5 bg-gray-50 border border-gray-300 rounded-lg text-xs font-semibold text-gray-700"
        >
          <option value="all">All Branches</option>
          {branches.map((b) => (
            <option key={b.id} value={b.id}>
              {b.name}
            </option>
          ))}
        </select>
      </div>

      {/* Trainers Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-gray-600">
            <thead className="bg-gray-50 border-b border-gray-200 text-gray-700 font-semibold uppercase text-[10px] tracking-wider">
              <tr>
                <th className="px-4 py-3">Trainer / Coach</th>
                <th className="px-4 py-3">Specialization & Branch</th>
                <th className="px-4 py-3">Base Salary</th>
                <th className="px-4 py-3 text-center">Active Clients</th>
                <th className="px-4 py-3 text-right">Commission Earned (₹)</th>
                <th className="px-4 py-3 text-right">Disbursed (₹)</th>
                <th className="px-4 py-3 text-right">Payable Dues (₹)</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredTrainers.map((t) => {
                const assignedSubs = ptSubscriptions.filter((s) => s.trainerId === t.id);
                const activeCount = assignedSubs.filter((s) => s.status === 'active').length;

                return (
                  <tr key={t.id} className="hover:bg-gray-50/80 transition-colors">
                    <td className="px-4 py-3">
                      <div className="font-bold text-gray-900">{t.fullName}</div>
                      <div className="text-[11px] text-gray-500 font-mono">{t.phone}</div>
                    </td>

                    <td className="px-4 py-3">
                      <div className="text-gray-800 font-medium">
                        {t.specializations?.join(', ') || 'General Fitness'}
                      </div>
                      <div className="text-[10px] text-gray-400">
                        {t.branchId === 'branch-1' ? 'Indore Central' : 'Bhopal Arera'}
                      </div>
                    </td>

                    <td className="px-4 py-3">
                      <div className="font-semibold text-gray-900">
                        ₹{(t.baseSalary || 0).toLocaleString('en-IN')}
                      </div>
                      <div className="text-[10px] text-gray-400 capitalize">{t.salaryType} Base</div>
                    </td>

                    <td className="px-4 py-3 text-center">
                      <span className="px-2.5 py-0.5 rounded-full font-bold text-[11px] bg-indigo-50 text-indigo-700 border border-indigo-200">
                        {activeCount} Trainees
                      </span>
                    </td>

                    <td className="px-4 py-3 text-right font-bold text-indigo-700">
                      ₹{(t.ptCommissionEarned || 0).toLocaleString('en-IN')}
                    </td>

                    <td className="px-4 py-3 text-right font-bold text-emerald-600">
                      ₹{(t.ptCommissionPaid || 0).toLocaleString('en-IN')}
                    </td>

                    <td className="px-4 py-3 text-right font-black text-rose-600 text-sm">
                      ₹{(t.ptCommissionOutstanding || 0).toLocaleString('en-IN')}
                    </td>

                    <td className="px-4 py-3 text-right space-x-1.5 whitespace-nowrap">
                      <button
                        onClick={() => setSelectedTrainer(t)}
                        className="px-2.5 py-1 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded text-[11px] font-semibold transition-colors inline-flex items-center gap-1"
                        title="View full coach profile and Section 79 PT Tab"
                      >
                        <Eye className="w-3 h-3" />
                        PT Tab (79)
                      </button>
                      <button
                        onClick={() => onOpenSettlement(t.id)}
                        className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-[11px] font-bold transition-colors inline-flex items-center gap-1 shadow-xs"
                      >
                        <HandCoins className="w-3 h-3" />
                        Settle
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Trainer Detail Modal */}
      <TrainerDetailModal
        trainer={selectedTrainer}
        onClose={() => setSelectedTrainer(null)}
        ptSubscriptions={ptSubscriptions}
        sessions={storageService.getPTSessions()}
        settlements={storageService.getPTCommissionSettlements()}
        onOpenSettlement={(id) => {
          setSelectedTrainer(null);
          onOpenSettlement(id);
        }}
      />

      {/* Onboard Trainer Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 bg-gray-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl border border-gray-200 w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gray-50">
              <h3 className="font-bold text-gray-900 text-base">Onboard New Coach / Trainer</h3>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="text-gray-400 hover:text-gray-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddTrainer} className="p-6 space-y-3.5 text-xs">
              <div>
                <label className="block font-bold text-gray-700 mb-1">Full Legal Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Arjun Kapoor"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg font-semibold text-gray-900"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Contact Phone</label>
                  <input
                    type="tel"
                    required
                    placeholder="+91 98260 00000"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg font-mono text-gray-900"
                  />
                </div>
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Email Address</label>
                  <input
                    type="email"
                    placeholder="coach@gymos.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg text-gray-900"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1">Specializations</label>
                <input
                  type="text"
                  placeholder="e.g. Hypertrophy, Crossfit, Powerlifting"
                  value={specializations}
                  onChange={(e) => setSpecializations(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg text-gray-900"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Base Salary (₹)</label>
                  <input
                    type="number"
                    min={0}
                    value={baseSalary}
                    onChange={(e) => setBaseSalary(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg font-bold text-gray-900"
                  />
                </div>
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Assigned Branch</label>
                  <select
                    value={branchId}
                    onChange={(e) => setBranchId(e.target.value)}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg font-semibold text-gray-800"
                  >
                    {branches.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="pt-2 flex justify-end gap-2 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg font-semibold hover:bg-gray-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-indigo-600 text-white rounded-lg font-bold hover:bg-indigo-700 shadow-xs"
                >
                  Save & Register
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
