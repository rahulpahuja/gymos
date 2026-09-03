import React, { useState } from 'react';
import {
  Clock,
  ShieldAlert,
  LogOut,
  RefreshCw,
  Building2,
  Users,
  CheckCircle2,
  XCircle,
  Dumbbell,
  Shield,
} from 'lucide-react';
import { UserAccount, Branch } from '../../types';
import { firebaseAuthService } from '../../services/firebase';

interface ApprovalPendingScreenProps {
  user: UserAccount;
  branches: Branch[];
  onRefresh?: () => void;
  onSignOut: () => void;
}

export const ApprovalPendingScreen: React.FC<ApprovalPendingScreenProps> = ({
  user,
  branches,
  onRefresh,
  onSignOut,
}) => {
  const [checking, setChecking] = useState(false);
  const branchName =
    branches.find((b) => b.id === (user.requestedBranchId || user.branchId))?.name ||
    'Headquarters / All Branches';

  const isRejected = user.status === 'rejected';

  const handleManualCheck = async () => {
    setChecking(true);
    if (onRefresh) {
      await onRefresh();
    }
    setTimeout(() => setChecking(false), 800);
  };

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col justify-center items-center px-4 py-12 selection:bg-indigo-500 selection:text-white">
      <div className="w-full max-w-md bg-slate-800 border border-slate-700 rounded-2xl shadow-2xl p-8 backdrop-blur-xs text-center">
        {/* Status Icon */}
        <div className="inline-flex items-center justify-center mb-4">
          {isRejected ? (
            <div className="w-16 h-16 rounded-2xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-400">
              <XCircle className="w-8 h-8" />
            </div>
          ) : (
            <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 animate-pulse">
              <Clock className="w-8 h-8" />
            </div>
          )}
        </div>

        {/* Title & Status */}
        <h2 className="text-xl font-bold text-white mb-1">
          {isRejected ? 'Access Request Declined' : 'Account Approval Pending'}
        </h2>
        <p className="text-xs text-slate-400 mb-6 leading-relaxed">
          {isRejected
            ? 'Your access request to GymOS was not approved by the system administrator.'
            : 'Your registration was received. A Super Administrator or your Branch Manager must review and approve your account before you can access GymOS.'}
        </p>

        {/* User Card */}
        <div className="p-4 rounded-xl bg-slate-700/40 border border-slate-700 text-left mb-6 space-y-3">
          <div className="flex items-center gap-3">
            {user.photoURL ? (
              <img
                src={user.photoURL}
                alt={user.displayName}
                className="w-11 h-11 rounded-full border border-slate-600 object-cover"
              />
            ) : (
              <div className="w-11 h-11 rounded-full bg-indigo-600 flex items-center justify-center text-white font-bold text-sm">
                {user.displayName.substring(0, 2).toUpperCase()}
              </div>
            )}
            <div className="min-w-0 flex-1">
              <div className="text-sm font-bold text-white truncate">
                {user.displayName}
              </div>
              <div className="text-xs text-slate-400 truncate">{user.email}</div>
            </div>
          </div>

          <div className="pt-3 border-t border-slate-600/50 grid grid-cols-2 gap-2 text-xs">
            <div>
              <span className="text-slate-400 block text-[10px] uppercase font-bold">
                Requested Role
              </span>
              <span className="font-semibold text-slate-200 capitalize">
                {user.requestedRole || user.role}
              </span>
            </div>
            <div>
              <span className="text-slate-400 block text-[10px] uppercase font-bold">
                Target Branch
              </span>
              <span className="font-semibold text-slate-200 truncate block">
                {branchName}
              </span>
            </div>
          </div>

          {isRejected && user.rejectionReason && (
            <div className="p-2.5 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs mt-2">
              <span className="font-bold block text-[10px] uppercase text-rose-400">
                Administrator Reason:
              </span>
              {user.rejectionReason}
            </div>
          )}
        </div>

        {/* Action Controls */}
        <div className="space-y-2.5">
          {!isRejected && (
            <button
              type="button"
              disabled={checking}
              onClick={handleManualCheck}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs transition-colors shadow-xs cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${checking ? 'animate-spin' : ''}`} />
              <span>{checking ? 'Checking Status...' : 'Check Approval Status'}</span>
            </button>
          )}

          <button
            type="button"
            onClick={onSignOut}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-slate-700/50 hover:bg-slate-700 text-slate-300 hover:text-white font-semibold text-xs transition-colors cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sign Out / Switch Account</span>
          </button>
        </div>

        <div className="mt-6 pt-4 border-t border-slate-700/50 text-[11px] text-slate-500">
          GymOS Enterprise Security • Firestore ABAC Gated Access
        </div>
      </div>
    </div>
  );
};
