import React, { useState } from 'react';
import {
  Users,
  Search,
  Plus,
  Dumbbell,
  Filter,
  CheckCircle2,
  AlertCircle,
  Eye,
  CreditCard,
} from 'lucide-react';
import { Trainee, PTSubscription, Branch } from '../../types';
import { storageService } from '../../services/storageService';
import { TraineeDetailModal } from './TraineeDetailModal';

interface TraineeListProps {
  trainees: Trainee[];
  ptSubscriptions: PTSubscription[];
  branches: Branch[];
  onOpenRecordPayment: () => void;
}

export const TraineeList: React.FC<TraineeListProps> = ({
  trainees,
  ptSubscriptions,
  branches,
  onOpenRecordPayment,
}) => {
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedBranchId, setSelectedBranchId] = useState<string>('all');
  const [ptFilter, setPtFilter] = useState<'all' | 'has_pt' | 'no_pt'>('all');
  const [selectedTrainee, setSelectedTrainee] = useState<Trainee | null>(null);

  // New Trainee Modal
  const [isNewModalOpen, setIsNewModalOpen] = useState<boolean>(false);
  const [fullName, setFullName] = useState<string>('');
  const [phone, setPhone] = useState<string>('');
  const [email, setEmail] = useState<string>('');
  const [branchId, setBranchId] = useState<string>('branch-1');
  const [membershipPlan, setMembershipPlan] = useState<string>('Quarterly Pro');

  const filteredTrainees = trainees.filter((t) => {
    if (selectedBranchId !== 'all' && t.branchId !== selectedBranchId) return false;
    if (ptFilter === 'has_pt' && !t.hasPT) return false;
    if (ptFilter === 'no_pt' && t.hasPT) return false;
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      if (
        !t.fullName.toLowerCase().includes(term) &&
        !t.phone.includes(term) &&
        !t.id.toLowerCase().includes(term)
      ) {
        return false;
      }
    }
    return true;
  });

  const handleCreateTrainee = (e: React.FormEvent) => {
    e.preventDefault();
    const newT: Trainee = {
      id: `trainee-${Date.now()}`,
      fullName,
      phone,
      email: email || `${fullName.toLowerCase().replace(/\s+/g, '.')}@gmail.com`,
      address: 'City Center, Main Road',
      dob: '1995-04-12',
      gender: 'Male',
      emergencyContact: '+91 98260 00000',
      joiningDate: new Date().toISOString().substring(0, 10),
      branchId,
      status: 'active',
      generalMembershipPlanName: membershipPlan,
      generalMembershipExpiryDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().substring(0, 10),
      totalPaid: 0,
      totalDue: 12000,
      createdAt: new Date().toISOString().substring(0, 10),
      joinDate: new Date().toISOString().substring(0, 10),
      membershipPlan,
      membershipExpiry: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().substring(0, 10),
      hasPT: false,
      membershipDue: 12000,
      ptDue: 0,
    };

    storageService.saveTrainee(newT);
    setIsNewModalOpen(false);
    setFullName('');
    setPhone('');
  };

  return (
    <div className="space-y-5">
      {/* Top Banner */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <Users className="w-5 h-5 text-indigo-600" />
            Trainees & Members Directory
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Member profiles, personal training engagements, attendance status, and financial balances
          </p>
        </div>

        <button
          id="btn-add-trainee"
          onClick={() => setIsNewModalOpen(true)}
          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold transition-colors shadow-xs flex items-center gap-1.5"
        >
          <Plus className="w-4 h-4" />
          Add New Trainee
        </button>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col md:flex-row items-center justify-between gap-3">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search member name, phone, or ID..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
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

          <select
            value={ptFilter}
            onChange={(e) => setPtFilter(e.target.value as any)}
            className="px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs font-semibold text-slate-700"
          >
            <option value="all">All Members</option>
            <option value="has_pt">🏋️ Enrolled in Personal Training</option>
            <option value="no_pt">General Gym Access Only</option>
          </select>
        </div>
      </div>

      {/* Trainee Table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-700 font-semibold uppercase text-[10px] tracking-wider">
              <tr>
                <th className="px-4 py-3">Member Name & ID</th>
                <th className="px-4 py-3">Phone & Branch</th>
                <th className="px-4 py-3">General Membership</th>
                <th className="px-4 py-3">Personal Training (PT)</th>
                <th className="px-4 py-3 text-right">Membership Due</th>
                <th className="px-4 py-3 text-right">PT Due</th>
                <th className="px-4 py-3 text-right">Total Due</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredTrainees.map((trainee) => {
                const ptSub = ptSubscriptions.find((s) => s.traineeId === trainee.id && s.status === 'active');
                return (
                  <tr key={trainee.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-4 py-3">
                      <div className="font-bold text-slate-900 text-sm">{trainee.fullName}</div>
                      <div className="text-[10px] text-slate-400 font-mono">{trainee.id}</div>
                    </td>

                    <td className="px-4 py-3">
                      <div className="font-semibold text-slate-800">{trainee.phone}</div>
                      <div className="text-[10px] text-slate-500">
                        {trainee.branchId === 'branch-1' ? 'Indore Central' : 'Bhopal Arera'}
                      </div>
                    </td>

                    <td className="px-4 py-3">
                      <div className="font-semibold text-slate-800">
                        {trainee.generalMembershipPlanName || trainee.membershipPlan || 'Quarterly Gym'}
                      </div>
                      <div className="text-[10px] text-slate-400">
                        Expires: {trainee.generalMembershipExpiryDate || trainee.membershipExpiry || '2026-11-30'}
                      </div>
                    </td>

                    <td className="px-4 py-3">
                      {ptSub ? (
                        <div>
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">
                            <Dumbbell className="w-3 h-3" />
                            {ptSub.packageName}
                          </span>
                          <div className="text-[10px] text-slate-500 mt-0.5">
                            Coach: <strong className="text-slate-700">{ptSub.trainerName}</strong> ({ptSub.remainingSessions} left)
                          </div>
                        </div>
                      ) : (
                        <span className="text-[11px] text-slate-400 italic">No Active PT</span>
                      )}
                    </td>

                    <td className="px-4 py-3 text-right font-bold text-blue-700">
                      ₹{(trainee.membershipDue ?? Math.max(0, trainee.totalDue - (ptSub?.dueAmount || 0))).toLocaleString('en-IN')}
                    </td>

                    <td className="px-4 py-3 text-right font-bold text-indigo-700">
                      ₹{(trainee.ptDue ?? (ptSub?.dueAmount || 0)).toLocaleString('en-IN')}
                    </td>

                    <td className="px-4 py-3 text-right font-black text-rose-600 text-sm">
                      ₹{(trainee.totalDue || 0).toLocaleString('en-IN')}
                    </td>

                    <td className="px-4 py-3 text-right space-x-1.5 whitespace-nowrap">
                      <button
                        onClick={() => setSelectedTrainee(trainee)}
                        className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-[11px] font-semibold transition-colors inline-flex items-center gap-1"
                        title="Open member file with Section 78 PT Tab"
                      >
                        <Eye className="w-3 h-3" />
                        View PT & Dues
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Trainee Detail Modal with Section 78 PT Tab */}
      <TraineeDetailModal
        trainee={selectedTrainee}
        onClose={() => setSelectedTrainee(null)}
        ptSubscriptions={ptSubscriptions}
        sessions={storageService.getPTSessions()}
        transactions={storageService.getPaymentTransactions()}
        onOpenRecordPayment={onOpenRecordPayment}
      />

      {/* Modal: Add Trainee */}
      {isNewModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <h3 className="font-bold text-slate-900 text-base">Onboard New Trainee Member</h3>
              <button
                onClick={() => setIsNewModalOpen(false)}
                className="text-slate-400 hover:text-slate-700"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateTrainee} className="p-6 space-y-4 text-sm">
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">Full Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Vikramaditya Rathore"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm font-semibold"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">Phone Number</label>
                  <input
                    type="text"
                    required
                    placeholder="98260XXXXX"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">Email</label>
                  <input
                    type="email"
                    placeholder="vikram@domain.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
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

                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">Membership Plan</label>
                  <select
                    value={membershipPlan}
                    onChange={(e) => setMembershipPlan(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-semibold"
                  >
                    <option value="Quarterly Pro">Quarterly Pro (₹12,000)</option>
                    <option value="Annual Elite">Annual Elite (₹32,000)</option>
                    <option value="Monthly Starter">Monthly Starter (₹4,500)</option>
                  </select>
                </div>
              </div>

              <div className="pt-2 flex justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsNewModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 text-slate-700 rounded-lg text-xs font-semibold hover:bg-slate-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-indigo-600 text-white rounded-lg text-xs font-bold hover:bg-indigo-700 shadow-xs"
                >
                  Enroll Trainee
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
