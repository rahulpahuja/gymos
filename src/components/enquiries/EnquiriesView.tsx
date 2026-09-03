import React, { useState } from 'react';
import {
  FileText,
  Search,
  Plus,
  Phone,
  Calendar,
  CheckCircle2,
  ArrowRight,
  UserCheck,
} from 'lucide-react';
import { Enquiry, Branch } from '../../types';
import { storageService } from '../../services/storageService';

interface EnquiriesViewProps {
  enquiries: Enquiry[];
  branches: Branch[];
  onConvertToTrainee: (enquiry: Enquiry) => void;
}

export const EnquiriesView: React.FC<EnquiriesViewProps> = ({
  enquiries,
  branches,
  onConvertToTrainee,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedBranchId, setSelectedBranchId] = useState('all');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  // New enquiry state
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [branchId, setBranchId] = useState('branch-1');
  const [interestedIn, setInterestedIn] = useState<'membership' | 'personal_training' | 'both'>('both');
  const [notes, setNotes] = useState('');

  const filteredEnquiries = enquiries.filter((e) => {
    if (selectedBranchId !== 'all' && e.branchId !== selectedBranchId) return false;
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      if (!e.name.toLowerCase().includes(term) && !e.phone.includes(term)) return false;
    }
    return true;
  });

  const handleAddEnquiry = (e: React.FormEvent) => {
    e.preventDefault();
    const newEnq: Enquiry = {
      id: `enq-${Date.now()}`,
      name: fullName,
      phone,
      email: `${fullName.toLowerCase().replace(/\s+/g, '.')}@gmail.com`,
      age: 26,
      gender: 'Male',
      branchId,
      source: 'Walk-in',
      assignedStaff: 'Branch Manager',
      interestedPlan: interestedIn === 'both' ? 'Membership + PT' : interestedIn === 'personal_training' ? 'Personal Training' : 'General Gym',
      enquiryDate: new Date().toISOString().substring(0, 10),
      status: 'trial',
      followUpDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString().substring(0, 10),
      notes,
      createdAt: new Date().toISOString().substring(0, 10),
    };
    storageService.saveEnquiry(newEnq);
    setIsAddModalOpen(false);
    setFullName('');
    setPhone('');
    setNotes('');
  };

  const handleConvert = (enq: Enquiry) => {
    onConvertToTrainee(enq);
  };

  return (
    <div className="space-y-5">
      {/* Top Banner */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <FileText className="w-5 h-5 text-indigo-600" />
            Enquiries & Prospect Pipeline
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Lead tracking, trial bookings, and instant conversion to member and PT clients
          </p>
        </div>

        <button
          onClick={() => setIsAddModalOpen(true)}
          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold transition-colors shadow-xs flex items-center gap-1.5"
        >
          <Plus className="w-4 h-4" />
          Add Walk-In Enquiry
        </button>
      </div>

      {/* Filter Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search lead name or phone..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs"
          />
        </div>

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

      {/* Enquiries Table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
        <table className="w-full text-left text-xs text-slate-600">
          <thead className="bg-slate-50 border-b border-slate-200 text-slate-700 font-semibold uppercase text-[10px] tracking-wider">
            <tr>
              <th className="px-4 py-3">Lead Name & Phone</th>
              <th className="px-4 py-3">Source & Branch</th>
              <th className="px-4 py-3">Interest Area</th>
              <th className="px-4 py-3">Follow-Up Date</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Notes</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filteredEnquiries.map((enq) => (
              <tr key={enq.id} className="hover:bg-slate-50 transition-colors">
                <td className="px-4 py-3">
                  <div className="font-bold text-slate-900">{enq.name}</div>
                  <div className="text-[11px] text-slate-500 font-mono">{enq.phone}</div>
                </td>
                <td className="px-4 py-3">
                  <div className="text-slate-800">{enq.source}</div>
                  <div className="text-[10px] text-slate-400">
                    {enq.branchId === 'branch-1' ? 'Indore' : 'Bhopal'}
                  </div>
                </td>
                <td className="px-4 py-3">
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-50 text-purple-700 border border-purple-200">
                    {enq.interestedPlan}
                  </span>
                </td>
                <td className="px-4 py-3 font-mono text-slate-700">{enq.followUpDate}</td>
                <td className="px-4 py-3">
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full capitalize ${
                      enq.status === 'converted'
                        ? 'bg-emerald-50 text-emerald-700'
                        : enq.status === 'trial_booked'
                        ? 'bg-blue-50 text-blue-700'
                        : 'bg-slate-100 text-slate-700'
                    }`}
                  >
                    {enq.status.replace('_', ' ')}
                  </span>
                </td>
                <td className="px-4 py-3 max-w-[200px] truncate text-slate-500">{enq.notes}</td>
                <td className="px-4 py-3 text-right">
                  {enq.status !== 'converted' ? (
                    <button
                      onClick={() => handleConvert(enq)}
                      className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded text-[11px] font-semibold transition-colors inline-flex items-center gap-1 shadow-xs"
                    >
                      <UserCheck className="w-3.5 h-3.5" />
                      Convert to Trainee
                    </button>
                  ) : (
                    <span className="text-[11px] text-emerald-600 font-semibold inline-flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Converted
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Add Enquiry Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <h3 className="font-bold text-slate-900 text-base">New Gym & PT Prospect Enquiry</h3>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="text-slate-400 hover:text-slate-700"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAddEnquiry} className="p-6 space-y-4 text-sm">
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">Prospect Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Sameer Verma"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-semibold"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">Phone Number</label>
                <input
                  type="text"
                  required
                  placeholder="98270XXXXX"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-mono"
                />
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
                  <label className="block text-xs font-bold text-slate-600 mb-1">Interest Area</label>
                  <select
                    value={interestedIn}
                    onChange={(e) => setInterestedIn(e.target.value as any)}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-semibold"
                  >
                    <option value="both">Both (Gym + PT)</option>
                    <option value="personal_training">Personal Training</option>
                    <option value="membership">General Membership</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">Trial / Fitness Goal Notes</label>
                <input
                  type="text"
                  placeholder="Weight loss target, requested evening slots..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 text-slate-700 rounded-lg text-xs font-semibold hover:bg-slate-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-indigo-600 text-white rounded-lg text-xs font-bold hover:bg-indigo-700 shadow-xs"
                >
                  Save Enquiry
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
