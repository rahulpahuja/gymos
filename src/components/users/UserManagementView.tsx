import React, { useState, useEffect } from 'react';
import {
  Users,
  ShieldCheck,
  Clock,
  CheckCircle2,
  XCircle,
  Building2,
  Search,
  Filter,
  UserPlus,
  Mail,
  Shield,
  Trash2,
  AlertCircle,
  Check,
  UserX,
  Edit2,
  RefreshCw,
  ExternalLink,
} from 'lucide-react';
import { UserAccount, Branch, UserRole, UserApprovalStatus, CurrentUser, Trainer, Trainee } from '../../types';
import { firebaseAuthService } from '../../services/firebase';

interface UserManagementViewProps {
  branches: Branch[];
  currentUser: CurrentUser;
  trainers?: Trainer[];
  trainees?: Trainee[];
}

const ROLE_OPTIONS: { value: UserRole; label: string }[] = [
  { value: 'admin', label: 'Super Admin' },
  { value: 'manager', label: 'Branch Manager' },
  { value: 'trainer', label: 'PT Trainer / Coach' },
  { value: 'trainee', label: 'Member / Trainee' },
];

export const UserManagementView: React.FC<UserManagementViewProps> = ({
  branches,
  currentUser,
  trainers = [],
  trainees = [],
}) => {
  const isManagerOnly = currentUser.role === 'manager';
  const assignableRoles = isManagerOnly
    ? ROLE_OPTIONS.filter((r) => r.value === 'trainer' || r.value === 'trainee')
    : ROLE_OPTIONS;
  // Link a portal login to its operational record, keyed by user id
  const [approvalLinks, setApprovalLinks] = useState<Record<string, string>>({});
  const [users, setUsers] = useState<UserAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'pending' | 'approved' | 'all'>('pending');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedBranchFilter, setSelectedBranchFilter] = useState('all');

  // Approval state overrides per user
  const [approvalRoles, setApprovalRoles] = useState<Record<string, UserRole>>({});
  const [approvalBranches, setApprovalBranches] = useState<Record<string, string>>({});

  // Pre-authorize modal
  const [isPreAuthOpen, setIsPreAuthOpen] = useState(false);
  const [preAuthEmail, setPreAuthEmail] = useState('');
  const [preAuthRole, setPreAuthRole] = useState<UserRole>('manager');
  const [preAuthBranchId, setPreAuthBranchId] = useState(branches[0]?.id || 'branch-1');
  const [preAuthLoading, setPreAuthLoading] = useState(false);

  // Edit user modal
  const [editingUser, setEditingUser] = useState<UserAccount | null>(null);
  const [editRole, setEditRole] = useState<UserRole>('manager');
  const [editBranchId, setEditBranchId] = useState('all');
  const [editLinkId, setEditLinkId] = useState('');

  // Rejection modal
  const [rejectingUser, setRejectingUser] = useState<UserAccount | null>(null);
  const [rejectionReason, setRejectionReason] = useState('Staff role credentials could not be verified.');

  const [notification, setNotification] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 4000);
  };

  // Subscribe to real-time users collection from Firestore
  useEffect(() => {
    const unsub = firebaseAuthService.subscribeAllUsers((allUsers) => {
      setUsers(allUsers);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const pendingUsers = users.filter((u) => u.status === 'pending');
  const approvedUsers = users.filter((u) => u.status === 'approved');

  // Filtered users for lists
  const filteredUsers = users.filter((u) => {
    if (activeTab === 'pending' && u.status !== 'pending') return false;
    if (activeTab === 'approved' && u.status !== 'approved') return false;

    if (selectedBranchFilter !== 'all' && u.branchId !== selectedBranchFilter) {
      return false;
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        u.displayName?.toLowerCase().includes(q) ||
        u.email?.toLowerCase().includes(q) ||
        u.role?.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const suggestLink = (user: UserAccount, role: UserRole): string => {
    const pool = role === 'trainer' ? trainers : role === 'trainee' ? trainees : [];
    const match = pool.find(
      (p) => p.email?.toLowerCase() === user.email?.toLowerCase(),
    );
    return match?.id || '';
  };

  const handleApprove = async (user: UserAccount) => {
    let finalRole = approvalRoles[user.id] || user.requestedRole || user.role || 'manager';
    if (isManagerOnly && (finalRole === 'admin' || finalRole === 'manager')) {
      finalRole = 'trainer';
    }
    const finalBranch = isManagerOnly
      ? currentUser.branchId
      : approvalBranches[user.id] || user.requestedBranchId || user.branchId || 'branch-1';

    const linkId = approvalLinks[user.id] ?? suggestLink(user, finalRole);
    const links =
      finalRole === 'trainer'
        ? { linkedTrainerId: linkId }
        : finalRole === 'trainee'
        ? { linkedTraineeId: linkId }
        : undefined;

    try {
      await firebaseAuthService.approveUser(user.id, finalRole, finalBranch, currentUser.name, links);
      showToast(`User ${user.displayName || user.email} approved as ${finalRole.toUpperCase()}`);
    } catch (err) {
      console.error('Approval failed:', err);
      showToast('Error approving user');
    }
  };

  const handleConfirmReject = async () => {
    if (!rejectingUser) return;
    try {
      await firebaseAuthService.rejectUser(rejectingUser.id, rejectionReason, currentUser.name);
      showToast(`Access rejected for ${rejectingUser.email}`);
      setRejectingUser(null);
    } catch (err) {
      console.error('Rejection failed:', err);
      showToast('Error rejecting user');
    }
  };

  const handleSaveEdit = async () => {
    if (!editingUser) return;
    const links =
      editRole === 'trainer'
        ? { linkedTrainerId: editLinkId }
        : editRole === 'trainee'
        ? { linkedTraineeId: editLinkId }
        : undefined;
    try {
      await firebaseAuthService.updateUserAccess(editingUser.id, editRole, editBranchId, links);
      showToast(`Updated access for ${editingUser.displayName || editingUser.email}`);
      setEditingUser(null);
    } catch (err) {
      console.error('Update failed:', err);
      showToast('Error updating user');
    }
  };

  const handleDelete = async (userId: string, email: string) => {
    if (window.confirm(`Revoke access and delete account profile for ${email}?`)) {
      try {
        await firebaseAuthService.deleteUser(userId);
        showToast(`User account deleted for ${email}`);
      } catch (err) {
        console.error('Delete failed:', err);
        showToast('Error deleting user');
      }
    }
  };

  // Pre-authorize new email
  const handlePreAuthorize = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!preAuthEmail.trim()) return;

    setPreAuthLoading(true);
    try {
      // Create a pre-authorized placeholder profile
      const dummyId = `preauth-${Date.now()}`;
      const newAccount: UserAccount = {
        id: dummyId,
        email: preAuthEmail.trim().toLowerCase(),
        displayName: preAuthEmail.split('@')[0],
        role: preAuthRole,
        branchId: preAuthRole === 'admin' ? 'all' : preAuthBranchId,
        status: 'approved',
        approvedBy: currentUser.name,
        approvedAt: new Date().toISOString(),
        createdAt: new Date().toISOString(),
      };
      await firebaseAuthService.approveUser(
        newAccount.id,
        newAccount.role,
        newAccount.branchId,
        currentUser.name
      );
      showToast(`Pre-authorized ${preAuthEmail} for automatic Google sign-in.`);
      setIsPreAuthOpen(false);
      setPreAuthEmail('');
    } catch (err) {
      console.error('Preauth failed:', err);
      showToast('Failed to pre-authorize user.');
    } finally {
      setPreAuthLoading(false);
    }
  };

  const getBranchName = (branchId: string) => {
    if (branchId === 'all') return 'All Branches (HQ)';
    return branches.find((b) => b.id === branchId)?.name || branchId;
  };

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {notification && (
        <div className="fixed bottom-5 right-5 z-50 p-4 rounded-xl bg-slate-900 text-white border border-slate-700 shadow-xl flex items-center gap-3 animate-fade-in text-xs font-semibold">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>{notification}</span>
        </div>
      )}

      {/* Header Banner */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-indigo-50 text-indigo-600 border border-indigo-100">
              <ShieldCheck className="w-5 h-5" />
            </span>
            <h2 className="text-xl font-bold text-slate-900">
              Staff & User Access Management
            </h2>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Review incoming Google sign-in registrations, grant role privileges, and manage branch assignments in real-time.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => setIsPreAuthOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold transition-colors shadow-xs cursor-pointer"
          >
            <UserPlus className="w-4 h-4" />
            <span>Pre-Authorize Staff</span>
          </button>
        </div>
      </div>

      {/* KPI Counters */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div
          onClick={() => setActiveTab('pending')}
          className={`p-4 rounded-xl border transition-all cursor-pointer ${
            activeTab === 'pending'
              ? 'bg-amber-50/50 border-amber-300 ring-2 ring-amber-400/20'
              : 'bg-white border-slate-200 hover:border-slate-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Pending Approvals
            </span>
            <span
              className={`p-1.5 rounded-lg ${
                pendingUsers.length > 0
                  ? 'bg-amber-100 text-amber-700 animate-pulse'
                  : 'bg-slate-100 text-slate-400'
              }`}
            >
              <Clock className="w-4 h-4" />
            </span>
          </div>
          <div className="mt-2 text-2xl font-black text-slate-900">
            {pendingUsers.length}
          </div>
          <p className="text-[11px] text-slate-500 mt-0.5">
            Awaiting administrator branch verification
          </p>
        </div>

        <div
          onClick={() => setActiveTab('approved')}
          className={`p-4 rounded-xl border transition-all cursor-pointer ${
            activeTab === 'approved'
              ? 'bg-emerald-50/50 border-emerald-300 ring-2 ring-emerald-400/20'
              : 'bg-white border-slate-200 hover:border-slate-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Active Authorized Staff
            </span>
            <span className="p-1.5 rounded-lg bg-emerald-100 text-emerald-700">
              <CheckCircle2 className="w-4 h-4" />
            </span>
          </div>
          <div className="mt-2 text-2xl font-black text-slate-900">
            {approvedUsers.length}
          </div>
          <p className="text-[11px] text-slate-500 mt-0.5">
            Admins, branch managers, and trainers
          </p>
        </div>

        <div
          onClick={() => setActiveTab('all')}
          className={`p-4 rounded-xl border transition-all cursor-pointer ${
            activeTab === 'all'
              ? 'bg-indigo-50/50 border-indigo-300 ring-2 ring-indigo-400/20'
              : 'bg-white border-slate-200 hover:border-slate-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Total Accounts
            </span>
            <span className="p-1.5 rounded-lg bg-indigo-100 text-indigo-700">
              <Users className="w-4 h-4" />
            </span>
          </div>
          <div className="mt-2 text-2xl font-black text-slate-900">
            {users.length}
          </div>
          <p className="text-[11px] text-slate-500 mt-0.5">
            Synchronized via Firebase Realtime Firestore
          </p>
        </div>
      </div>

      {/* Tabs & Search Filter Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-3 rounded-xl border border-slate-200">
        <div className="flex items-center gap-1.5 w-full sm:w-auto">
          <button
            type="button"
            onClick={() => setActiveTab('pending')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
              activeTab === 'pending'
                ? 'bg-amber-600 text-white'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>Pending Queue</span>
            {pendingUsers.length > 0 && (
              <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-white text-amber-700 font-black">
                {pendingUsers.length}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('approved')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
              activeTab === 'approved'
                ? 'bg-indigo-600 text-white'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Approved Staff ({approvedUsers.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('all')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
              activeTab === 'all'
                ? 'bg-slate-800 text-white'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <span>All ({users.length})</span>
          </button>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-64">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search staff name, email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-800 outline-none focus:border-indigo-500"
            />
          </div>

          <select
            value={selectedBranchFilter}
            onChange={(e) => setSelectedBranchFilter(e.target.value)}
            className="px-2.5 py-1.5 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-700 font-medium outline-none cursor-pointer"
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

      {/* Content List */}
      {loading ? (
        <div className="p-12 text-center text-slate-500 text-xs flex flex-col items-center gap-2 bg-white rounded-2xl border border-slate-200">
          <RefreshCw className="w-6 h-6 animate-spin text-indigo-600" />
          <span>Connecting to Firebase Realtime Database...</span>
        </div>
      ) : filteredUsers.length === 0 ? (
        <div className="p-12 text-center text-slate-500 text-xs bg-white rounded-2xl border border-slate-200">
          <CheckCircle2 className="w-8 h-8 text-slate-300 mx-auto mb-2" />
          <p className="font-semibold text-slate-700">
            {activeTab === 'pending'
              ? 'No pending access requests in queue.'
              : 'No user accounts match current search filter.'}
          </p>
          <p className="text-slate-400 text-[11px] mt-1">
            New Google sign-ins will automatically pop up here for administrator review.
          </p>
        </div>
      ) : activeTab === 'pending' ? (
        /* Pending Queue Detailed Cards */
        <div className="space-y-3">
          {filteredUsers.map((user) => {
            const currentSelectedRole =
              approvalRoles[user.id] || user.requestedRole || user.role || 'manager';
            const currentSelectedBranch =
              approvalBranches[user.id] ||
              user.requestedBranchId ||
              user.branchId ||
              branches[0]?.id ||
              'branch-1';

            return (
              <div
                key={user.id}
                className="bg-white p-5 rounded-2xl border border-amber-200 shadow-xs flex flex-col lg:flex-row lg:items-center justify-between gap-4 hover:border-amber-300 transition-colors"
              >
                {/* Left: User Identity */}
                <div className="flex items-start gap-3.5 min-w-0">
                  {user.photoURL ? (
                    <img
                      src={user.photoURL}
                      alt={user.displayName}
                      className="w-12 h-12 rounded-xl object-cover border border-slate-200 shrink-0"
                    />
                  ) : (
                    <div className="w-12 h-12 rounded-xl bg-amber-100 text-amber-800 font-bold flex items-center justify-center text-base shrink-0">
                      {user.displayName?.substring(0, 2).toUpperCase() || 'U'}
                    </div>
                  )}

                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <h4 className="font-bold text-sm text-slate-900 truncate">
                        {user.displayName}
                      </h4>
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase bg-amber-100 text-amber-800 border border-amber-200">
                        Pending
                      </span>
                    </div>

                    <div className="flex items-center gap-2 text-xs text-slate-500 mt-0.5">
                      <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span className="truncate">{user.email}</span>
                    </div>

                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2 text-[11px] text-slate-500">
                      <div>
                        <span className="text-slate-400 font-medium">Requested: </span>
                        <span className="font-bold text-slate-700 capitalize">
                          {user.requestedRole || user.role}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-400 font-medium">Target Branch: </span>
                        <span className="font-bold text-slate-700">
                          {getBranchName(user.requestedBranchId || user.branchId)}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-400 font-medium">Registered: </span>
                        <span>{new Date(user.createdAt).toLocaleDateString('en-IN')}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Right: Assignment Controls & Actions */}
                <div className="flex flex-wrap items-center gap-2.5 pt-3 lg:pt-0 border-t lg:border-t-0 border-slate-100">
                  <div className="flex flex-col gap-1">
                    <span className="text-[10px] uppercase font-bold text-slate-400">
                      Assign Role
                    </span>
                    <select
                      value={currentSelectedRole}
                      onChange={(e) =>
                        setApprovalRoles((prev) => ({
                          ...prev,
                          [user.id]: e.target.value as UserRole,
                        }))
                      }
                      className="px-2.5 py-1.5 rounded-lg border border-slate-300 text-xs font-semibold text-slate-800 bg-slate-50 outline-none cursor-pointer"
                    >
                      {assignableRoles.map((r) => (
                        <option key={r.value} value={r.value}>
                          {r.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  {currentSelectedRole !== 'admin' && !isManagerOnly && (
                    <div className="flex flex-col gap-1">
                      <span className="text-[10px] uppercase font-bold text-slate-400">
                        Assign Branch
                      </span>
                      <select
                        value={currentSelectedBranch}
                        onChange={(e) =>
                          setApprovalBranches((prev) => ({
                            ...prev,
                            [user.id]: e.target.value,
                          }))
                        }
                        className="px-2.5 py-1.5 rounded-lg border border-slate-300 text-xs font-medium text-slate-800 bg-slate-50 outline-none cursor-pointer max-w-[150px]"
                      >
                        {branches.map((b) => (
                          <option key={b.id} value={b.id}>
                            {b.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  {(currentSelectedRole === 'trainer' || currentSelectedRole === 'trainee') && (
                    <div className="flex flex-col gap-1">
                      <span className="text-[10px] uppercase font-bold text-slate-400">
                        Link {currentSelectedRole === 'trainer' ? 'Trainer' : 'Member'} Record
                      </span>
                      <select
                        value={approvalLinks[user.id] ?? suggestLink(user, currentSelectedRole)}
                        onChange={(e) =>
                          setApprovalLinks((prev) => ({ ...prev, [user.id]: e.target.value }))
                        }
                        className="px-2.5 py-1.5 rounded-lg border border-slate-300 text-xs font-medium text-slate-800 bg-slate-50 outline-none cursor-pointer max-w-[180px]"
                      >
                        <option value="">— Not linked yet —</option>
                        {(currentSelectedRole === 'trainer' ? trainers : trainees).map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.fullName}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  <div className="flex items-center gap-1.5 self-end">
                    <button
                      type="button"
                      onClick={() => handleApprove(user)}
                      className="flex items-center gap-1 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-colors shadow-xs cursor-pointer"
                    >
                      <Check className="w-3.5 h-3.5" />
                      <span>Approve</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setRejectingUser(user)}
                      className="flex items-center gap-1 px-3 py-2 rounded-xl border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-semibold transition-colors cursor-pointer"
                    >
                      <UserX className="w-3.5 h-3.5" />
                      <span>Reject</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* Approved & All Directory Table */
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-700">
              <thead className="bg-slate-50 text-slate-500 font-bold uppercase tracking-wider text-[11px] border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4">Staff Member</th>
                  <th className="py-3 px-4">Role</th>
                  <th className="py-3 px-4">Branch Location</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Approved By</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-normal">
                {filteredUsers.map((u) => (
                  <tr key={u.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-3">
                        {u.photoURL ? (
                          <img
                            src={u.photoURL}
                            alt={u.displayName}
                            className="w-8 h-8 rounded-lg object-cover border border-slate-200"
                          />
                        ) : (
                          <div className="w-8 h-8 rounded-lg bg-indigo-100 text-indigo-700 font-bold flex items-center justify-center text-xs">
                            {u.displayName?.substring(0, 2).toUpperCase() || 'U'}
                          </div>
                        )}
                        <div>
                          <div className="font-bold text-slate-900">{u.displayName}</div>
                          <div className="text-[11px] text-slate-400">{u.email}</div>
                        </div>
                      </div>
                    </td>

                    <td className="py-3 px-4">
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                          u.role === 'admin'
                            ? 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                            : u.role === 'manager'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : 'bg-purple-50 text-purple-700 border border-purple-200'
                        }`}
                      >
                        <Shield className="w-3 h-3" />
                        <span className="capitalize">{u.role}</span>
                      </span>
                    </td>

                    <td className="py-3 px-4 font-medium text-slate-800">
                      {getBranchName(u.branchId)}
                    </td>

                    <td className="py-3 px-4">
                      <span
                        className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase ${
                          u.status === 'approved'
                            ? 'bg-emerald-100 text-emerald-800'
                            : u.status === 'pending'
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-rose-100 text-rose-800'
                        }`}
                      >
                        {u.status}
                      </span>
                    </td>

                    <td className="py-3 px-4 text-slate-500 text-[11px]">
                      {u.approvedBy ? (
                        <div>
                          <div className="font-medium text-slate-700">{u.approvedBy}</div>
                          <div className="text-slate-400">
                            {u.approvedAt ? new Date(u.approvedAt).toLocaleDateString('en-IN') : ''}
                          </div>
                        </div>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>

                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => {
                            setEditingUser(u);
                            setEditRole(u.role);
                            setEditBranchId(u.branchId);
                            setEditLinkId(u.linkedTrainerId || u.linkedTraineeId || '');
                          }}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"
                          title="Modify user role, branch & linked record"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>

                        <button
                          type="button"
                          onClick={() => handleDelete(u.id, u.email)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                          title="Revoke access & delete profile"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Pre-Authorize Staff Modal */}
      {isPreAuthOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-md w-full p-6">
            <h3 className="text-base font-bold text-slate-900 mb-1">
              Pre-Authorize Staff Google Account
            </h3>
            <p className="text-xs text-slate-500 mb-4 leading-relaxed">
              Enter the staff member's Google/Gmail address. When they sign in with Google, they will automatically be granted instant approved access without waiting.
            </p>

            <form onSubmit={handlePreAuthorize} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Google Email Address
                </label>
                <input
                  type="email"
                  required
                  placeholder="coach.alex@gymos.in or gmail.com"
                  value={preAuthEmail}
                  onChange={(e) => setPreAuthEmail(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-300 text-xs text-slate-900 outline-none focus:border-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Pre-Assigned Role
                  </label>
                  <select
                    value={preAuthRole}
                    onChange={(e) => setPreAuthRole(e.target.value as UserRole)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-300 text-xs text-slate-900 outline-none cursor-pointer"
                  >
                    {assignableRoles.map((r) => (
                      <option key={r.value} value={r.value}>
                        {r.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Assigned Branch
                  </label>
                  <select
                    value={preAuthBranchId}
                    disabled={preAuthRole === 'admin'}
                    onChange={(e) => setPreAuthBranchId(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-300 text-xs text-slate-900 outline-none cursor-pointer disabled:opacity-50"
                  >
                    {preAuthRole === 'admin' ? (
                      <option value="all">All Branches (HQ)</option>
                    ) : (
                      branches.map((b) => (
                        <option key={b.id} value={b.id}>
                          {b.name}
                        </option>
                      ))
                    )}
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsPreAuthOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={preAuthLoading}
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white transition-colors shadow-xs"
                >
                  {preAuthLoading ? 'Authorizing...' : 'Grant Pre-Authorization'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Access Modal */}
      {editingUser && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-sm w-full p-6">
            <h3 className="text-base font-bold text-slate-900 mb-1">
              Modify User Privileges
            </h3>
            <p className="text-xs text-slate-500 mb-4 truncate">
              {editingUser.displayName} ({editingUser.email})
            </p>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  System Role
                </label>
                <select
                  value={editRole}
                  onChange={(e) => setEditRole(e.target.value as UserRole)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-300 text-xs text-slate-900 outline-none cursor-pointer"
                >
                  {assignableRoles.map((r) => (
                    <option key={r.value} value={r.value}>
                      {r.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Branch Assignment
                </label>
                <select
                  value={editBranchId}
                  disabled={editRole === 'admin'}
                  onChange={(e) => setEditBranchId(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-300 text-xs text-slate-900 outline-none cursor-pointer disabled:opacity-50"
                >
                  <option value="all">All Branches (HQ)</option>
                  {branches.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name}
                    </option>
                  ))}
                </select>
              </div>

              {(editRole === 'trainer' || editRole === 'trainee') && (
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Linked {editRole === 'trainer' ? 'Trainer' : 'Member'} Record
                  </label>
                  <select
                    value={editLinkId}
                    onChange={(e) => setEditLinkId(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-300 text-xs text-slate-900 outline-none cursor-pointer"
                  >
                    <option value="">— Not linked —</option>
                    {(editRole === 'trainer' ? trainers : trainees).map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.fullName} · {p.email}
                      </option>
                    ))}
                  </select>
                  <p className="text-[10px] text-slate-400 mt-1">
                    Their portal shows this record's sessions, payments, dues and attendance.
                  </p>
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditingUser(null)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSaveEdit}
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs"
                >
                  Save Access
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Rejection Modal */}
      {rejectingUser && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-sm w-full p-6">
            <h3 className="text-base font-bold text-rose-700 mb-1">
              Decline Registration Request
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              Decline access for {rejectingUser.displayName} ({rejectingUser.email}). They will see this message upon login.
            </p>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Reason for Rejection
                </label>
                <textarea
                  rows={3}
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  className="w-full p-3 rounded-xl bg-slate-50 border border-slate-300 text-xs text-slate-900 outline-none focus:border-rose-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setRejectingUser(null)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirmReject}
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white shadow-xs"
                >
                  Confirm Rejection
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
