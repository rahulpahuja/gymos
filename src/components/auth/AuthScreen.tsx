import React, { useState } from 'react';
import {
  Shield,
  Building2,
  Dumbbell,
  CheckCircle2,
  Lock,
  ArrowRight,
  AlertCircle,
  Users,
  User,
} from 'lucide-react';
import { firebaseAuthService } from '../../services/firebase';
import { Branch, UserRole } from '../../types';

interface AuthScreenProps {
  branches: Branch[];
  onDemoLogin?: (role: UserRole) => void;
}

export const AuthScreen: React.FC<AuthScreenProps> = ({ branches, onDemoLogin }) => {
  const [selectedRole, setSelectedRole] = useState<UserRole>('manager');
  const [selectedBranchId, setSelectedBranchId] = useState<string>(
    branches[0]?.id || 'branch-1'
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGoogleSignIn = async () => {
    setLoading(true);
    setError(null);
    try {
      await firebaseAuthService.signInWithGoogle(selectedRole, selectedBranchId);
    } catch (err: any) {
      console.error('Google Sign In Error:', err);
      // Friendly message
      if (err.code === 'auth/popup-closed-by-user') {
        setError('Sign-in window was closed before completion. Please try again.');
      } else if (err.code === 'auth/cancelled-popup-request') {
        setError('Another sign-in window is already open.');
      } else {
        setError(err.message || 'Failed to sign in with Google. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col justify-center items-center px-4 py-12 selection:bg-indigo-500 selection:text-white">
      {/* Background Graphic Accents */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-20">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-indigo-600 rounded-full blur-3xl"></div>
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-emerald-600 rounded-full blur-3xl"></div>
      </div>

      <div className="relative w-full max-w-md bg-slate-800 border border-slate-700/80 rounded-2xl shadow-2xl p-8 backdrop-blur-xs">
        {/* Brand Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-tr from-indigo-600 to-indigo-500 text-white shadow-lg shadow-indigo-500/30 mb-4">
            <Dumbbell className="w-7 h-7" />
          </div>
          <h1 className="text-2xl font-black tracking-tight text-white">
            FitOS Pro
          </h1>
          <p className="text-xs text-slate-400 mt-1 font-medium">
            Commercial Fitness & Personal Training Operations
          </p>
          <div className="mt-3 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-700/50 border border-slate-600/50 text-[11px] font-semibold text-indigo-300">
            <Shield className="w-3.5 h-3.5 text-indigo-400" />
            <span>Firebase Auth & Live Approval Gate</span>
          </div>
        </div>

        {error && (
          <div className="mb-6 p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
            <p>{error}</p>
          </div>
        )}

        {/* Role & Branch Request Configuration */}
        <div className="space-y-4 mb-6">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
              Sign-Up Access Role
            </label>
            <div className="grid grid-cols-2 gap-2">
              {[
                { role: 'admin' as UserRole, label: 'Super Admin', icon: Shield },
                { role: 'manager' as UserRole, label: 'Branch Mgr', icon: Building2 },
                { role: 'trainer' as UserRole, label: 'PT Coach', icon: Users },
                { role: 'trainee' as UserRole, label: 'Member', icon: User },
              ].map((item) => {
                const Icon = item.icon;
                const isSelected = selectedRole === item.role;
                return (
                  <button
                    key={item.role}
                    type="button"
                    onClick={() => setSelectedRole(item.role)}
                    className={`p-2.5 rounded-xl border text-left transition-all ${
                      isSelected
                        ? 'bg-indigo-600/20 border-indigo-500 text-white shadow-xs'
                        : 'bg-slate-700/30 border-slate-700 text-slate-400 hover:bg-slate-700/60 hover:text-slate-200'
                    }`}
                  >
                    <Icon
                      className={`w-4 h-4 mb-1.5 ${
                        isSelected ? 'text-indigo-400' : 'text-slate-400'
                      }`}
                    />
                    <div className="text-xs font-bold leading-tight">{item.label}</div>
                  </button>
                );
              })}
            </div>
          </div>

          {selectedRole !== 'admin' && (
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                Target Branch Assignment
              </label>
              <select
                value={selectedBranchId}
                onChange={(e) => setSelectedBranchId(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-700/50 border border-slate-600 text-slate-200 text-xs font-medium focus:outline-hidden focus:border-indigo-500 cursor-pointer"
              >
                {branches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name} ({b.city})
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* Primary Action: Sign In with Google */}
        <button
          type="button"
          disabled={loading}
          onClick={handleGoogleSignIn}
          className="w-full flex items-center justify-center gap-3 px-4 py-3 rounded-xl bg-white hover:bg-slate-100 text-slate-800 font-bold text-sm transition-all shadow-md active:scale-[0.99] disabled:opacity-50 cursor-pointer"
        >
          {loading ? (
            <div className="w-5 h-5 border-2 border-slate-600 border-t-transparent rounded-full animate-spin"></div>
          ) : (
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
              />
            </svg>
          )}
          <span>{loading ? 'Authenticating...' : 'Continue with Google'}</span>
        </button>

        {/* Security Notice */}
        <p className="text-[11px] text-slate-400 text-center mt-4 leading-relaxed">
          Google Workspace & Gmail authentication enabled. First-time registrations
          will be routed to the Administrator verification queue for branch access.
        </p>

        {/* Fast Demo Mode Divider */}
        {onDemoLogin && (
          <div className="mt-6 pt-6 border-t border-slate-700/60">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                Instant Reviewer Access
              </span>
              <span className="text-[10px] text-emerald-400 font-semibold bg-emerald-500/10 px-2 py-0.5 rounded-md border border-emerald-500/20">
                Offline Capable
              </span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => onDemoLogin('admin')}
                className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-slate-700/40 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-semibold border border-slate-600/50 transition-colors"
              >
                <Shield className="w-3.5 h-3.5 text-indigo-400" />
                <span>Demo Admin</span>
              </button>
              <button
                type="button"
                onClick={() => onDemoLogin('manager')}
                className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-slate-700/40 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-semibold border border-slate-600/50 transition-colors"
              >
                <Building2 className="w-3.5 h-3.5 text-emerald-400" />
                <span>Demo Manager</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
