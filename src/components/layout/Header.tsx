import React from 'react';
import {
  Building2,
  Shield,
  UserCheck,
  Fingerprint,
  PlusCircle,
  RotateCcw,
  Calculator,
  Bell,
  LogOut,
  Sun,
  Moon,
} from 'lucide-react';
import { Branch, CurrentUser, UserRole } from '../../types';
import { storageService } from '../../services/storageService';

interface HeaderProps {
  currentUser?: CurrentUser;
  setCurrentUser?: (u: CurrentUser) => void;
  currentRole?: UserRole;
  onChangeRole?: (role: UserRole) => void;
  branches: Branch[];
  selectedBranchId?: string;
  setSelectedBranchId?: (id: string) => void;
  currentBranchId?: string;
  onChangeBranch?: (id: string) => void;
  onOpenNewPayment?: () => void;
  onOpenRecordPayment?: () => void;
  onOpenQuickScan?: () => void;
  onOpenCalculator?: () => void;
  pendingApprovalsCount?: number;
  onOpenUsers?: () => void;
  onSignOut?: () => void;
  currentTheme?: 'light' | 'dark';
  onToggleTheme?: (theme: 'light' | 'dark') => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentUser,
  setCurrentUser,
  currentRole,
  onChangeRole,
  branches,
  selectedBranchId,
  setSelectedBranchId,
  currentBranchId,
  onChangeBranch,
  onOpenNewPayment,
  onOpenRecordPayment,
  onOpenQuickScan,
  onOpenCalculator,
  pendingApprovalsCount = 0,
  onOpenUsers,
  onSignOut,
  currentTheme = 'light',
  onToggleTheme,
}) => {
  const effectiveRole = currentRole || currentUser?.role || 'admin';
  const effectiveBranchId = currentBranchId || selectedBranchId || 'all';

  const handleBranchSelect = (branchId: string) => {
    if (onChangeBranch) onChangeBranch(branchId);
    if (setSelectedBranchId) setSelectedBranchId(branchId);
  };

  const handleRoleToggle = () => {
    const nextRole = effectiveRole === 'admin' ? 'manager' : 'admin';
    if (onChangeRole) {
      onChangeRole(nextRole);
    }
    if (setCurrentUser) {
      if (nextRole === 'manager') {
        const updated: CurrentUser = {
          id: 'mgr-1',
          name: 'Rajesh Sharma (Branch Manager)',
          email: 'rajesh.sharma@gymos.in',
          role: 'manager',
          branchId: 'branch-1',
        };
        setCurrentUser(updated);
        storageService.setCurrentUser(updated);
      } else {
        const updated: CurrentUser = {
          id: 'admin-1',
          name: 'Super Administrator',
          email: 'admin@gymos-fitness.com',
          role: 'admin',
          branchId: 'all',
        };
        setCurrentUser(updated);
        storageService.setCurrentUser(updated);
      }
    }
  };

  const handlePaymentClick = () => {
    if (onOpenRecordPayment) onOpenRecordPayment();
    else if (onOpenNewPayment) onOpenNewPayment();
  };

  const handleResetData = () => {
    if (window.confirm('Reset all demo data back to clean factory state?')) {
      storageService.resetToDefaults();
      window.location.reload();
    }
  };

  const handleQuickThemeToggle = () => {
    const nextTheme = currentTheme === 'dark' ? 'light' : 'dark';
    if (onToggleTheme) {
      onToggleTheme(nextTheme);
    }
  };

  return (
    <header className="h-16 bg-white dark:bg-slate-900 border-b border-gray-200 dark:border-slate-800 px-4 md:px-8 flex items-center justify-between sticky top-0 z-30 shadow-xs transition-colors">
      {/* Left: Scope & Branch Selector (Bento Grid Header design) */}
      <div className="flex items-center gap-3 md:gap-4">
        <div>
          <h1 className="text-base md:text-lg font-bold text-gray-900 dark:text-white leading-tight">
            FitOS Pro
          </h1>
          <p className="text-[11px] text-gray-500 dark:text-slate-400 hidden sm:block">
            Commercial PT & Operations Hub
          </p>
        </div>

        {/* Branch Selector Badge */}
        <div className="flex items-center gap-2 px-3 py-1.5 border border-gray-200 dark:border-slate-700 rounded-lg bg-gray-50 dark:bg-slate-800 text-xs md:text-sm">
          <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></span>
          <select
            id="global-branch-selector"
            value={effectiveBranchId}
            onChange={(e) => handleBranchSelect(e.target.value)}
            className="bg-transparent outline-none font-medium text-gray-800 dark:text-slate-200 cursor-pointer pr-1"
          >
            <option value="all">Consolidated (All Branches)</option>
            {branches.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name} ({b.city})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Right: Actions & Role Pill */}
      <div className="flex items-center gap-2 md:gap-3">
        {/* Quick Calculator Bento Trigger */}
        {onOpenCalculator && (
          <button
            onClick={onOpenCalculator}
            className="hidden lg:flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800 text-gray-700 dark:text-slate-200 hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors cursor-pointer"
            title="Open Interactive Revenue Split Calculator"
          >
            <Calculator className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
            <span>PT Split Calc</span>
          </button>
        )}

        {/* Quick Theme Toggle in Header */}
        <button
          onClick={handleQuickThemeToggle}
          className="p-2 rounded-lg border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800 text-gray-700 dark:text-slate-200 hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors cursor-pointer"
          title={`Switch to ${currentTheme === 'dark' ? 'Light' : 'Dark'} mode`}
          aria-label="Toggle theme"
        >
          {currentTheme === 'dark' ? (
            <Sun className="w-4 h-4 text-amber-400" />
          ) : (
            <Moon className="w-4 h-4 text-indigo-600" />
          )}
        </button>

        {/* Biometric Bridge Status */}
        {onOpenQuickScan && (
          <button
            id="btn-biometric-scanner-header"
            onClick={onOpenQuickScan}
            className="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 hover:bg-emerald-100 transition-colors cursor-pointer"
            title="USB Biometric / Fingerprint Bridge is Active"
          >
            <Fingerprint className="w-3.5 h-3.5" />
            <span className="hidden md:inline">Biometric Live</span>
          </button>
        )}

        {/* Pending Approvals Alert Pill */}
        {pendingApprovalsCount > 0 && onOpenUsers && (
          <button
            onClick={onOpenUsers}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-bold bg-amber-500 text-white hover:bg-amber-600 transition-colors shadow-xs animate-pulse cursor-pointer"
            title={`${pendingApprovalsCount} new user sign-up approval(s) waiting`}
          >
            <Bell className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Approvals</span>
            <span className="px-1.5 py-0.2 rounded-full bg-white text-amber-800 text-[10px] font-black">
              {pendingApprovalsCount}
            </span>
          </button>
        )}

        {/* Quick Payment Action */}
        <button
          id="btn-quick-record-payment"
          onClick={handlePaymentClick}
          className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white transition-all shadow-xs cursor-pointer"
        >
          <PlusCircle className="w-3.5 h-3.5" />
          <span>Record Payment</span>
        </button>

        {/* User Google Avatar & Profile Chip */}
        {currentUser && (
          <div className="flex items-center gap-2 pl-1 border-l border-gray-200 dark:border-slate-700">
            {currentUser.photoURL ? (
              <img
                src={currentUser.photoURL}
                alt={currentUser.name}
                className="w-8 h-8 rounded-full object-cover border border-gray-300 dark:border-slate-600"
              />
            ) : (
              <div className="w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center text-white text-xs font-bold shadow-xs">
                {currentUser.name?.substring(0, 2).toUpperCase() || 'U'}
              </div>
            )}
            {onSignOut && (
              <button
                onClick={onSignOut}
                className="p-1.5 text-gray-400 hover:text-rose-600 dark:hover:text-rose-400 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
                title="Sign Out"
              >
                <LogOut className="w-4 h-4" />
              </button>
            )}
          </div>
        )}

        {/* Role Toggle Switcher in Bento Pill Style */}
        <div className="hidden xl:flex bg-gray-100 dark:bg-slate-800 rounded-full p-0.5 border border-gray-200 dark:border-slate-700">
          <button
            onClick={handleRoleToggle}
            className={`px-3 py-1 text-xs font-medium rounded-full transition-all flex items-center gap-1.5 cursor-pointer ${
              effectiveRole === 'admin'
                ? 'bg-white dark:bg-slate-700 text-gray-900 dark:text-white shadow-xs font-semibold'
                : 'text-gray-500 dark:text-slate-400 hover:text-gray-900 dark:hover:text-white'
            }`}
            title="Switch between Admin and Manager View"
          >
            <Shield className="w-3 h-3 text-indigo-600 dark:text-indigo-400" />
            <span>Admin</span>
          </button>
          <button
            onClick={handleRoleToggle}
            className={`px-3 py-1 text-xs font-medium rounded-full transition-all flex items-center gap-1.5 cursor-pointer ${
              effectiveRole === 'manager'
                ? 'bg-white dark:bg-slate-700 text-gray-900 dark:text-white shadow-xs font-semibold'
                : 'text-gray-500 dark:text-slate-400 hover:text-gray-900 dark:hover:text-white'
            }`}
            title="Switch between Admin and Manager View"
          >
            <UserCheck className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
            <span>Manager</span>
          </button>
        </div>

        {/* Reset Demo Data Button */}
        <button
          id="btn-reset-demo-data"
          onClick={handleResetData}
          className="p-1.5 text-gray-400 hover:text-gray-700 dark:hover:text-slate-200 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          title="Reset sample data back to clean factory state"
        >
          <RotateCcw className="w-4 h-4" />
        </button>
      </div>
    </header>
  );
};
