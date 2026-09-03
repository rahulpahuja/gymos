import React from 'react';
import {
  LayoutDashboard,
  Dumbbell,
  Users,
  Award,
  CalendarCheck,
  CreditCard,
  Receipt,
  FileSpreadsheet,
  FileText,
  Sliders,
  Sparkles,
  GitBranch,
  UserCheck,
  LogOut,
} from 'lucide-react';
import { CurrentUser } from '../../types';

export type NavigationTab =
  | 'dashboard'
  | 'pt_hub'
  | 'trainees'
  | 'trainers'
  | 'attendance'
  | 'payments'
  | 'expenses'
  | 'enquiries'
  | 'reports'
  | 'audit'
  | 'settings'
  | 'users';

interface SidebarProps {
  activeTab: NavigationTab;
  setActiveTab?: (tab: NavigationTab) => void;
  onSelectTab?: (tab: NavigationTab) => void;
  currentUser?: CurrentUser;
  currentRole?: 'admin' | 'manager' | 'trainer';
  pendingApprovalsCount?: number;
  onOpenCalculator?: () => void;
  onSignOut?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  setActiveTab,
  onSelectTab,
  currentUser,
  currentRole,
  pendingApprovalsCount = 0,
  onOpenCalculator,
  onSignOut,
}) => {
  const handleTabChange = (tab: NavigationTab) => {
    if (onSelectTab) onSelectTab(tab);
    else if (setActiveTab) setActiveTab(tab);
  };

  const effectiveRole = currentRole || currentUser?.role || 'admin';
  const userName = currentUser?.name || (effectiveRole === 'admin' ? 'Admin User' : 'Rajesh Sharma');
  const userRoleTitle = effectiveRole === 'admin' ? 'Global Manager' : 'Branch Manager';
  const userInitials = effectiveRole === 'admin' ? 'AD' : 'RS';

  const managementItems = [
    {
      id: 'pt_hub' as NavigationTab,
      label: 'Personal Training',
      icon: Dumbbell,
      roles: ['admin', 'manager'],
      badge: 'Split Engine',
    },
    {
      id: 'dashboard' as NavigationTab,
      label: 'Executive Dashboard',
      icon: LayoutDashboard,
      roles: ['admin', 'manager'],
    },
    {
      id: 'trainees' as NavigationTab,
      label: 'Membership & Trainees',
      icon: Users,
      roles: ['admin', 'manager'],
    },
    {
      id: 'trainers' as NavigationTab,
      label: 'Trainers & Coaches',
      icon: Award,
      roles: ['admin', 'manager'],
    },
    {
      id: 'attendance' as NavigationTab,
      label: 'Biometric Attendance',
      icon: CalendarCheck,
      roles: ['admin', 'manager'],
    },
    {
      id: 'enquiries' as NavigationTab,
      label: 'Lead Enquiries',
      icon: FileText,
      roles: ['admin', 'manager'],
    },
  ];

  const financialItems = [
    {
      id: 'payments' as NavigationTab,
      label: 'Payments & Split Receipts',
      icon: CreditCard,
      roles: ['admin', 'manager'],
    },
    {
      id: 'expenses' as NavigationTab,
      label: 'Expenses & Equipment',
      icon: Receipt,
      roles: ['admin', 'manager'],
    },
    {
      id: 'reports' as NavigationTab,
      label: 'Financial P&L Reports',
      icon: FileSpreadsheet,
      roles: ['admin', 'manager'],
    },
  ];

  const systemItems = [
    {
      id: 'users' as NavigationTab,
      label: 'Staff & Approvals',
      icon: UserCheck,
      roles: ['admin'],
      badge: (pendingApprovalsCount || 0) > 0 ? `${pendingApprovalsCount} New` : undefined,
    },
    {
      id: 'audit' as NavigationTab,
      label: 'Security & Audit Trail',
      icon: GitBranch,
      roles: ['admin'],
    },
    {
      id: 'settings' as NavigationTab,
      label: 'System & Branch Config',
      icon: Sliders,
      roles: ['admin'],
    },
  ];

  const filterRole = (items: typeof managementItems) =>
    items.filter((item) => item.roles.includes(effectiveRole));

  const renderNavGroup = (title: string, items: typeof managementItems) => {
    const visible = filterRole(items);
    if (visible.length === 0) return null;

    return (
      <div className="mb-4">
        <div className="text-gray-500 text-xs font-bold uppercase tracking-wider mb-2 px-2">
          {title}
        </div>
        <div className="space-y-1">
          {visible.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                id={`nav-tab-${item.id}`}
                onClick={() => handleTabChange(item.id)}
                className={`w-full flex items-center justify-between px-3 py-2 text-sm transition-colors rounded-md group text-left ${
                  isActive
                    ? 'bg-gray-800 text-white font-medium shadow-xs'
                    : 'text-gray-400 hover:bg-gray-800 hover:text-white'
                }`}
              >
                <div className="flex items-center gap-3">
                  {isActive ? (
                    <span className="w-1 h-4 bg-indigo-500 rounded-full shrink-0" />
                  ) : (
                    <span className="w-1 h-4 opacity-0 shrink-0" />
                  )}
                  <Icon
                    className={`w-4 h-4 transition-colors ${
                      isActive ? 'text-indigo-400' : 'text-gray-400 group-hover:text-gray-200'
                    }`}
                  />
                  <span>{item.label}</span>
                </div>

                {item.badge && (
                  <span
                    className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${
                      isActive
                        ? 'bg-indigo-500/30 text-indigo-300 border border-indigo-500/40'
                        : 'bg-gray-800 text-gray-400 border border-gray-700'
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <aside className="w-64 bg-[#111827] flex flex-col shrink-0 min-h-screen border-r border-gray-800 selection:bg-indigo-500 selection:text-white">
      {/* Brand Header */}
      <div className="p-6 flex items-center gap-3 border-b border-gray-800/80">
        <div className="w-8 h-8 bg-indigo-500 rounded-lg flex items-center justify-center shadow-md shadow-indigo-500/20">
          <span className="text-white font-bold text-base">G</span>
        </div>
        <div>
          <span className="text-white font-semibold text-lg tracking-tight leading-none block">
            FitOS Pro
          </span>
          <span className="text-[11px] text-gray-400 font-medium block mt-0.5">
            PT Revenue & Operations
          </span>
        </div>
      </div>

      {/* Navigation Sections */}
      <nav className="flex-1 px-4 py-4 overflow-y-auto space-y-2">
        {renderNavGroup('Management', managementItems)}
        {renderNavGroup('Financials', financialItems)}
        {renderNavGroup('System', systemItems)}
      </nav>

      {/* Bento User Profile Card at Footer */}
      <div className="p-4 border-t border-gray-800 bg-[#0d121d]">
        <div className="flex items-center gap-3 px-2">
          {currentUser?.photoURL ? (
            <img
              src={currentUser.photoURL}
              alt={userName}
              className="w-10 h-10 rounded-full object-cover border border-gray-700 shrink-0"
            />
          ) : (
            <div className="w-10 h-10 rounded-full bg-indigo-600 flex items-center justify-center text-sm font-bold text-white shadow-xs shrink-0">
              {userInitials}
            </div>
          )}
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-white truncate">{userName}</p>
            <p className="text-xs text-gray-400 truncate capitalize">
              {currentUser?.email || userRoleTitle}
            </p>
          </div>
          {onSignOut && (
            <button
              type="button"
              onClick={onSignOut}
              className="p-1.5 text-gray-400 hover:text-rose-400 hover:bg-gray-800 rounded-lg transition-colors cursor-pointer"
              title="Sign Out of GymOS"
            >
              <LogOut className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </aside>
  );
};
