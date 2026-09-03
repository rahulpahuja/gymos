import React, { useState } from 'react';
import { Plus, Dumbbell, Tag, Calendar, Users, Edit2, CheckCircle2, Shield, Info } from 'lucide-react';
import { PTPackage, Branch, Trainer, RevenueSharingRule, RevenueSplitModel } from '../../types';
import { storageService } from '../../services/storageService';
import { PTRevenueService } from '../../services/ptRevenueService';

interface PTPackageManagerProps {
  packages: PTPackage[];
  branches: Branch[];
  trainers: Trainer[];
  onOpenCalculator: () => void;
}

export const PTPackageManager: React.FC<PTPackageManagerProps> = ({
  packages,
  branches,
  trainers,
  onOpenCalculator,
}) => {
  const [isCreateModalOpen, setIsCreateModalOpen] = useState<boolean>(false);
  const [editingPackage, setEditingPackage] = useState<PTPackage | null>(null);

  // Form State
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [sessionsCount, setSessionsCount] = useState<number>(20);
  const [durationDays, setDurationDays] = useState<number>(60);
  const [price, setPrice] = useState<number>(15000);
  const [assignedBranchId, setAssignedBranchId] = useState<string>('all');
  const [model, setModel] = useState<RevenueSplitModel>('percentage');
  const [trainerPercent, setTrainerPercent] = useState<number>(60);
  const [branchPercent, setBranchPercent] = useState<number>(40);
  const [fixedTrainerAmount, setFixedTrainerAmount] = useState<number>(10000);
  const [perSessionCommission, setPerSessionCommission] = useState<number>(600);
  const [status, setStatus] = useState<'active' | 'inactive'>('active');

  const openCreateModal = () => {
    setEditingPackage(null);
    setName('');
    setDescription('');
    setSessionsCount(20);
    setDurationDays(60);
    setPrice(15000);
    setAssignedBranchId('all');
    setModel('percentage');
    setTrainerPercent(60);
    setBranchPercent(40);
    setStatus('active');
    setIsCreateModalOpen(true);
  };

  const openEditModal = (pkg: PTPackage) => {
    setEditingPackage(pkg);
    setName(pkg.name);
    setDescription(pkg.description);
    setSessionsCount(pkg.sessionsCount);
    setDurationDays(pkg.durationDays);
    setPrice(pkg.price);
    setAssignedBranchId(pkg.assignedBranchId);
    setModel(pkg.revenueSharingRule.model);
    setTrainerPercent(pkg.revenueSharingRule.trainerPercent ?? 60);
    setBranchPercent(pkg.revenueSharingRule.branchPercent ?? 40);
    setFixedTrainerAmount(pkg.revenueSharingRule.fixedTrainerAmount ?? 10000);
    setPerSessionCommission(pkg.revenueSharingRule.perSessionCommission ?? 600);
    setStatus(pkg.status);
    setIsCreateModalOpen(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();

    const rule: RevenueSharingRule = {
      model,
      trainerPercent: model === 'percentage' ? trainerPercent : undefined,
      branchPercent: model === 'percentage' ? branchPercent : undefined,
      fixedTrainerAmount: model === 'fixed_trainer' ? fixedTrainerAmount : undefined,
      perSessionCommission: model === 'per_session' ? perSessionCommission : undefined,
      discountPolicy: 'net_price',
      refundPolicy: 'proportional',
      description:
        model === 'percentage'
          ? `${trainerPercent}% Trainer / ${branchPercent}% Branch Split`
          : model === 'fixed_trainer'
          ? `Fixed ₹${(fixedTrainerAmount || 0).toLocaleString('en-IN')} Trainer Amount`
          : `₹${perSessionCommission}/Session Commission`,
    };

    const pkgToSave: PTPackage = {
      id: editingPackage ? editingPackage.id : `pt-pkg-${Date.now()}`,
      name,
      description,
      sessionsCount,
      durationDays,
      price,
      assignedBranchId,
      applicableTrainerIds: ['all'],
      revenueSharingRule: rule,
      status,
      createdAt: editingPackage ? editingPackage.createdAt : new Date().toISOString().substring(0, 10),
      updatedAt: new Date().toISOString().substring(0, 10),
    };

    storageService.savePTPackage(pkgToSave);
    setIsCreateModalOpen(false);
  };

  return (
    <div className="space-y-5">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
        <div>
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <Tag className="w-5 h-5 text-indigo-600" />
            PT Package Management (Section 61)
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Configure dynamic session tiers, prices, validity periods, and custom revenue-sharing rules
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            id="btn-open-pt-calculator"
            onClick={onOpenCalculator}
            className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors"
          >
            <Shield className="w-4 h-4 text-indigo-600" />
            Audit & Math Sandbox
          </button>
          <button
            id="btn-create-pt-package"
            onClick={openCreateModal}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors shadow-xs"
          >
            <Plus className="w-4 h-4" />
            Create PT Package
          </button>
        </div>
      </div>

      {/* Package Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {packages.map((pkg) => {
          const splitPreview = PTRevenueService.calculateRevenueSplit(
            pkg.price,
            0,
            pkg.revenueSharingRule,
            pkg.sessionsCount,
            pkg.sessionsCount
          );

          return (
            <div
              key={pkg.id}
              className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs hover:border-indigo-300 transition-all flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between">
                  <div>
                    <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-sm bg-indigo-50 text-indigo-700 border border-indigo-100">
                      {pkg.id}
                    </span>
                    <h3 className="font-bold text-slate-900 text-base mt-1.5">{pkg.name}</h3>
                  </div>
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full capitalize ${
                      pkg.status === 'active'
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    {pkg.status}
                  </span>
                </div>

                <p className="text-xs text-slate-500 mt-2 line-clamp-2">{pkg.description}</p>

                {/* Key Specs */}
                <div className="grid grid-cols-3 gap-2 mt-4 p-3 bg-slate-50 rounded-lg border border-slate-100 text-center">
                  <div>
                    <div className="text-[10px] text-slate-400 font-semibold uppercase">Sessions</div>
                    <div className="text-sm font-extrabold text-slate-800 mt-0.5">{pkg.sessionsCount}</div>
                  </div>
                  <div>
                    <div className="text-[10px] text-slate-400 font-semibold uppercase">Validity</div>
                    <div className="text-sm font-extrabold text-slate-800 mt-0.5">{pkg.durationDays} Days</div>
                  </div>
                  <div>
                    <div className="text-[10px] text-slate-400 font-semibold uppercase">Price</div>
                    <div className="text-sm font-extrabold text-indigo-600 mt-0.5">
                      ₹{(pkg.price || 0).toLocaleString('en-IN')}
                    </div>
                  </div>
                </div>

                {/* Revenue Sharing Rule Preview (Section 64/65) */}
                <div className="mt-4 p-3 bg-indigo-50/50 rounded-lg border border-indigo-100 space-y-1.5 text-xs">
                  <div className="text-[11px] font-bold text-indigo-900 flex items-center justify-between">
                    <span>Revenue Sharing Agreement</span>
                    <span className="capitalize text-[10px] text-indigo-700 font-mono">
                      [{pkg.revenueSharingRule.model.replace('_', ' ')}]
                    </span>
                  </div>

                  <div className="text-[11px] text-slate-600">
                    {splitPreview.formulaExplanation}
                  </div>

                  <div className="flex items-center justify-between text-[11px] pt-1.5 border-t border-indigo-200/60">
                    <span className="text-slate-500">
                      Trainer: <strong className="text-slate-800">₹{(splitPreview.trainerShare || 0).toLocaleString('en-IN')}</strong>
                    </span>
                    <span className="text-slate-500">
                      Branch: <strong className="text-slate-800">₹{(splitPreview.branchShare || 0).toLocaleString('en-IN')}</strong>
                    </span>
                  </div>
                </div>
              </div>

              {/* Card Footer */}
              <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between">
                <span className="text-[11px] text-slate-400">
                  {pkg.assignedBranchId === 'all' ? 'All Branches' : 'Single Branch'}
                </span>
                <button
                  onClick={() => openEditModal(pkg)}
                  className="text-xs text-indigo-600 font-semibold hover:text-indigo-800 flex items-center gap-1"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                  Edit Rule & Price
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Modal: Create or Edit Package */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <h3 className="font-bold text-slate-900 text-base">
                {editingPackage ? 'Edit Personal Training Package' : 'Create New PT Package'}
              </h3>
              <button
                onClick={() => setIsCreateModalOpen(false)}
                className="text-slate-400 hover:text-slate-700"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSave} className="p-6 space-y-4 text-sm text-slate-700">
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <label className="block text-xs font-bold text-slate-600 mb-1">Package Name</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. PT Standard"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm font-semibold"
                  />
                </div>

                <div className="col-span-2">
                  <label className="block text-xs font-bold text-slate-600 mb-1">Description</label>
                  <textarea
                    rows={2}
                    placeholder="Short description of coaching targets and benefits..."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">Number of Sessions</label>
                  <input
                    type="number"
                    required
                    min="1"
                    value={sessionsCount}
                    onChange={(e) => setSessionsCount(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm font-semibold"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">Validity (Days)</label>
                  <input
                    type="number"
                    required
                    min="1"
                    value={durationDays}
                    onChange={(e) => setDurationDays(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm font-semibold"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">Package Price (₹)</label>
                  <input
                    type="number"
                    required
                    min="1"
                    value={price}
                    onChange={(e) => setPrice(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm font-bold text-indigo-700"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">Assigned Branch</label>
                  <select
                    value={assignedBranchId}
                    onChange={(e) => setAssignedBranchId(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-semibold"
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

              {/* Revenue Sharing Config */}
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
                <div className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                  Revenue Sharing Model (Sections 64, 65)
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-slate-600 font-semibold mb-1">Split Method</label>
                    <select
                      value={model}
                      onChange={(e) => setModel(e.target.value as any)}
                      className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-semibold"
                    >
                      <option value="percentage">Percentage (e.g. 60/40, 70/30)</option>
                      <option value="fixed_trainer">Fixed Trainer Amount</option>
                      <option value="per_session">Per Session Commission</option>
                    </select>
                  </div>

                  {model === 'percentage' && (
                    <div>
                      <label className="block text-xs text-slate-600 font-semibold mb-1">Trainer %</label>
                      <input
                        type="number"
                        value={trainerPercent}
                        onChange={(e) => {
                          const val = Number(e.target.value);
                          setTrainerPercent(val);
                          setBranchPercent(Math.max(0, 100 - val));
                        }}
                        className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-semibold"
                      />
                    </div>
                  )}

                  {model === 'fixed_trainer' && (
                    <div>
                      <label className="block text-xs text-slate-600 font-semibold mb-1">Fixed Amount (₹)</label>
                      <input
                        type="number"
                        value={fixedTrainerAmount}
                        onChange={(e) => setFixedTrainerAmount(Number(e.target.value))}
                        className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-semibold"
                      />
                    </div>
                  )}

                  {model === 'per_session' && (
                    <div>
                      <label className="block text-xs text-slate-600 font-semibold mb-1">₹ Per Session</label>
                      <input
                        type="number"
                        value={perSessionCommission}
                        onChange={(e) => setPerSessionCommission(Number(e.target.value))}
                        className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-semibold"
                      />
                    </div>
                  )}
                </div>
              </div>

              {/* Form Action buttons */}
              <div className="pt-3 flex items-center justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 text-slate-700 rounded-lg text-xs font-semibold hover:bg-slate-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-indigo-600 text-white rounded-lg text-xs font-bold hover:bg-indigo-700 transition-colors shadow-xs"
                >
                  {editingPackage ? 'Update Package' : 'Create Package'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
