import React, { useState, useEffect } from 'react';
import {
  Sliders,
  Building2,
  Receipt,
  Save,
  CheckCircle2,
  Plus,
  Fingerprint,
  Percent,
  X,
  Shield,
  Sun,
  Moon,
  Monitor,
  Cloud,
  Loader2,
  DatabaseBackup,
  Download,
  Upload,
} from 'lucide-react';
import { Branch, UserAccount } from '../../types';
import { storageService } from '../../services/storageService';
import { firebaseAuthService } from '../../services/firebase';
import { backupService, BackupEnvelope } from '../../services/backupService';

interface SettingsViewProps {
  branches: Branch[];
  currentTheme?: 'light' | 'dark';
  onToggleTheme?: (theme: 'light' | 'dark') => void;
  currentUser?: UserAccount | null;
  isAdmin?: boolean;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  branches,
  currentTheme,
  onToggleTheme,
  currentUser,
  isAdmin = false,
}) => {
  const [backupNote, setBackupNote] = useState<string | null>(null);
  const backupInputRef = React.useRef<HTMLInputElement>(null);

  const handleRestoreFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(String(reader.result)) as BackupEnvelope;
        const { restored } = backupService.restoreBackup(parsed);
        setBackupNote(`Restored ${restored.length} collections. Reloading…`);
        setTimeout(() => window.location.reload(), 1200);
      } catch (err) {
        setBackupNote(err instanceof Error ? err.message : 'Could not read backup file.');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };
  const [themeMode, setThemeMode] = useState<'light' | 'dark'>(() => {
    return currentTheme || storageService.getThemePreference();
  });
  const [themeSyncing, setThemeSyncing] = useState<boolean>(false);
  const [themeSyncSuccess, setThemeSyncSuccess] = useState<boolean>(false);

  useEffect(() => {
    if (currentTheme && currentTheme !== themeMode) {
      setThemeMode(currentTheme);
    }
  }, [currentTheme]);

  const handleSelectTheme = async (selected: 'light' | 'dark') => {
    setThemeMode(selected);
    storageService.setThemePreference(selected);

    if (selected === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }

    if (onToggleTheme) {
      onToggleTheme(selected);
    }

    if (currentUser?.id) {
      setThemeSyncing(true);
      try {
        await firebaseAuthService.updateUserTheme(currentUser.id, selected);
        setThemeSyncSuccess(true);
        setTimeout(() => setThemeSyncSuccess(false), 2500);
      } catch (err) {
        console.warn('Error syncing theme preference to Firestore:', err);
      } finally {
        setThemeSyncing(false);
      }
    }
  };

  const [gymName, setGymName] = useState('FitOS Commercial Gyms');
  const [gstNumber, setGstNumber] = useState('23AAACG0921M1Z4');
  const [receiptFooter, setReceiptFooter] = useState(
    'Thank you for working out with us! Fitness is a journey, not a destination. PT sessions valid 60-90 days.'
  );
  const [defaultSplitModel, setDefaultSplitModel] = useState<string>('percentage');
  const [defaultTrainerSplit, setDefaultTrainerSplit] = useState<number>(60);
  const [defaultBranchSplit, setDefaultBranchSplit] = useState<number>(40);
  const [defaultRefundPolicy, setDefaultRefundPolicy] = useState<string>('proportional');

  // Hardware Bridge Settings
  const [bridgeHost, setBridgeHost] = useState<string>('127.0.0.1:8088');
  const [deviceModel, setDeviceModel] = useState<string>('SecuGen Hamster Pro 20');
  const [autoCheckInTurnstile, setAutoCheckInTurnstile] = useState<boolean>(true);

  // New Branch Modal
  const [isAddBranchOpen, setIsAddBranchOpen] = useState<boolean>(false);
  const [newBranchName, setNewBranchName] = useState<string>('');
  const [newBranchCity, setNewBranchCity] = useState<string>('Jabalpur');
  const [newBranchAddress, setNewBranchAddress] = useState<string>('Civil Lines, Main Road');
  const [newBranchPhone, setNewBranchPhone] = useState<string>('+91 761-4022110');

  const [saved, setSaved] = useState<boolean>(false);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleAddBranch = (e: React.FormEvent) => {
    e.preventDefault();
    const newB: Branch = {
      id: `branch-${Date.now()}`,
      name: newBranchName,
      code: newBranchName.substring(0, 3).toUpperCase(),
      city: newBranchCity,
      state: 'Madhya Pradesh',
      address: newBranchAddress,
      phone: newBranchPhone,
      email: `${newBranchName.toLowerCase().replace(/\s+/g, '')}@gymos.com`,
      managerName: 'Branch Manager',
      managerId: 'usr-mgr',
      openingTime: '06:00',
      closingTime: '22:00',
      status: 'active',
      createdAt: new Date().toISOString().substring(0, 10),
    };
    storageService.saveBranch(newB);
    setIsAddBranchOpen(false);
    setNewBranchName('');
  };

  return (
    <div className="space-y-5 max-w-5xl">
      {/* Banner */}
      <div className="bg-white dark:bg-slate-800 p-5 rounded-xl border border-gray-200 dark:border-slate-700 shadow-sm transition-colors">
        <h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
          <Sliders className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
          Gym Settings & Multi-Branch Configuration
        </h2>
        <p className="text-xs text-gray-500 dark:text-slate-400 mt-0.5">
          Global branding, theme preferences, multi-branch parameters, tax credentials, and default printable voucher templates
        </p>
      </div>

      {/* Global Theme & Appearance Toggle (Persisted in Firestore) */}
      <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-gray-200 dark:border-slate-700 shadow-sm space-y-4 transition-colors">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-gray-100 dark:border-slate-700 pb-3">
          <div>
            <h3 className="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-2">
              {themeMode === 'dark' ? (
                <Moon className="w-4 h-4 text-indigo-400" />
              ) : (
                <Sun className="w-4 h-4 text-amber-500" />
              )}
              Display Appearance & Global Theme
            </h3>
            <p className="text-xs text-gray-500 dark:text-slate-400 mt-0.5">
              Switch between Light and Dark mode. Preference is saved locally and synchronized to your Firestore profile.
            </p>
          </div>

          <div className="flex items-center gap-2 text-xs">
            {themeSyncing ? (
              <span className="flex items-center gap-1.5 text-indigo-600 dark:text-indigo-400 font-medium">
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                Syncing to Cloud...
              </span>
            ) : themeSyncSuccess ? (
              <span className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-medium">
                <CheckCircle2 className="w-3.5 h-3.5" />
                Synced to Firestore
              </span>
            ) : (
              <span className="flex items-center gap-1.5 text-gray-400 dark:text-slate-500 font-medium">
                <Cloud className="w-3.5 h-3.5" />
                {currentUser ? `User: ${currentUser.email}` : 'Local Preference'}
              </span>
            )}
          </div>
        </div>

        {/* Interactive Theme Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
          {/* Light Theme Card */}
          <div
            onClick={() => handleSelectTheme('light')}
            className={`p-4 rounded-xl border-2 cursor-pointer transition-all duration-200 relative ${
              themeMode === 'light'
                ? 'border-indigo-600 bg-indigo-50/50 dark:bg-indigo-950/20 shadow-xs'
                : 'border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800/60 hover:border-gray-300 dark:hover:border-slate-600'
            }`}
          >
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-amber-100 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 flex items-center justify-center shadow-xs">
                  <Sun className="w-5 h-5" />
                </div>
                <div>
                  <div className="font-bold text-gray-900 dark:text-white text-sm">Light Mode</div>
                  <div className="text-xs text-gray-500 dark:text-slate-400">
                    High contrast daylight palette
                  </div>
                </div>
              </div>
              {themeMode === 'light' && (
                <span className="px-2 py-0.5 bg-indigo-600 text-white rounded-md text-[10px] font-black uppercase tracking-wider">
                  Active
                </span>
              )}
            </div>

            {/* Mini Visual Preview */}
            <div className="mt-3.5 p-2 bg-slate-100 rounded-lg border border-slate-200 flex items-center gap-2">
              <div className="w-4 h-4 rounded bg-indigo-600"></div>
              <div className="h-2 w-16 bg-slate-300 rounded"></div>
              <div className="h-2 w-10 bg-slate-200 rounded ml-auto"></div>
            </div>
          </div>

          {/* Dark Theme Card */}
          <div
            onClick={() => handleSelectTheme('dark')}
            className={`p-4 rounded-xl border-2 cursor-pointer transition-all duration-200 relative ${
              themeMode === 'dark'
                ? 'border-indigo-500 bg-indigo-950/30 dark:bg-indigo-950/40 shadow-xs'
                : 'border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800/60 hover:border-gray-300 dark:hover:border-slate-600'
            }`}
          >
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-indigo-900/60 text-indigo-400 flex items-center justify-center shadow-xs">
                  <Moon className="w-5 h-5" />
                </div>
                <div>
                  <div className="font-bold text-gray-900 dark:text-white text-sm">Dark Mode</div>
                  <div className="text-xs text-gray-500 dark:text-slate-400">
                    Low glare charcoal & slate palette
                  </div>
                </div>
              </div>
              {themeMode === 'dark' && (
                <span className="px-2 py-0.5 bg-indigo-500 text-white rounded-md text-[10px] font-black uppercase tracking-wider">
                  Active
                </span>
              )}
            </div>

            {/* Mini Visual Preview */}
            <div className="mt-3.5 p-2 bg-slate-900 rounded-lg border border-slate-700 flex items-center gap-2">
              <div className="w-4 h-4 rounded bg-indigo-500"></div>
              <div className="h-2 w-16 bg-slate-700 rounded"></div>
              <div className="h-2 w-10 bg-slate-800 rounded ml-auto"></div>
            </div>
          </div>
        </div>
      </div>

      {/* Full Data Backup & Restore (Admin only) */}
      {isAdmin && (
        <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-gray-200 dark:border-slate-700 shadow-sm space-y-4 transition-colors">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-gray-100 dark:border-slate-700 pb-3">
            <div>
              <h3 className="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <DatabaseBackup className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                Full Data Backup &amp; Restore
              </h3>
              <p className="text-xs text-gray-500 dark:text-slate-400 mt-0.5">
                Download a portable JSON snapshot of every GymOS collection, or restore from one. Administrator access only.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  backupService.downloadBackup();
                  setBackupNote('Backup downloaded.');
                }}
                className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold transition-colors shadow-xs flex items-center gap-1.5 cursor-pointer"
              >
                <Download className="w-4 h-4" />
                Download Backup
              </button>
              <button
                type="button"
                onClick={() => backupInputRef.current?.click()}
                className="px-3 py-2 bg-gray-100 hover:bg-gray-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-gray-700 dark:text-slate-200 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <Upload className="w-4 h-4" />
                Restore
              </button>
              <input
                ref={backupInputRef}
                type="file"
                accept="application/json"
                onChange={handleRestoreFile}
                className="hidden"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
            {backupService.summary().map((c) => (
              <div
                key={c.key}
                className="p-2.5 rounded-lg bg-gray-50 dark:bg-slate-900/50 border border-gray-200 dark:border-slate-700 text-center"
              >
                <div className="text-lg font-black text-gray-900 dark:text-white">{c.count}</div>
                <div className="text-[10px] text-gray-500 dark:text-slate-400 capitalize truncate">
                  {c.label}
                </div>
              </div>
            ))}
          </div>

          {backupNote && (
            <div className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5" />
              {backupNote}
            </div>
          )}
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-5">
        {/* Gym Legal & Receipt Config */}
        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm space-y-4">
          <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
            <Receipt className="w-4 h-4 text-indigo-600" />
            Receipt & Invoicing Details
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="block text-gray-700 font-bold mb-1">Gym Operating Name</label>
              <input
                type="text"
                value={gymName}
                onChange={(e) => setGymName(e.target.value)}
                className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg font-semibold text-gray-900"
              />
            </div>
            <div>
              <label className="block text-gray-700 font-bold mb-1">GSTIN / Tax Identification</label>
              <input
                type="text"
                value={gstNumber}
                onChange={(e) => setGstNumber(e.target.value)}
                className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg font-mono font-semibold text-gray-900"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-gray-700 font-bold mb-1">Receipt Footer Note</label>
              <input
                type="text"
                value={receiptFooter}
                onChange={(e) => setReceiptFooter(e.target.value)}
                className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg text-xs text-gray-900"
              />
            </div>
          </div>
        </div>

        {/* PT Revenue Sharing Default Rules (Section 64) */}
        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm space-y-4">
          <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
            <Percent className="w-4 h-4 text-indigo-600" />
            Default PT Revenue-Sharing & Commission Rules (Section 64)
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
            <div>
              <label className="block text-gray-700 font-bold mb-1">Default Split Model</label>
              <select
                value={defaultSplitModel}
                onChange={(e) => setDefaultSplitModel(e.target.value)}
                className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg font-semibold text-gray-800"
              >
                <option value="percentage">Percentage Split (e.g. 60/40)</option>
                <option value="fixed_trainer">Fixed Trainer Amount</option>
                <option value="per_session">Per-Session Fixed Commission</option>
                <option value="hybrid">Hybrid Base + Incentive</option>
              </select>
            </div>

            <div>
              <label className="block text-gray-700 font-bold mb-1">Default Trainer Share (%)</label>
              <input
                type="number"
                min={0}
                max={100}
                value={defaultTrainerSplit}
                onChange={(e) => {
                  const val = Number(e.target.value);
                  setDefaultTrainerSplit(val);
                  setDefaultBranchSplit(100 - val);
                }}
                className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg font-bold text-indigo-600"
              />
            </div>

            <div>
              <label className="block text-gray-700 font-bold mb-1">Default Branch Share (%)</label>
              <input
                type="number"
                disabled
                value={defaultBranchSplit}
                className="w-full px-3 py-2 bg-gray-100 border border-gray-300 rounded-lg font-bold text-gray-600"
              />
            </div>

            <div className="md:col-span-3">
              <label className="block text-gray-700 font-bold mb-1">
                Default Refund Clawback Policy (Section 70)
              </label>
              <select
                value={defaultRefundPolicy}
                onChange={(e) => setDefaultRefundPolicy(e.target.value)}
                className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg font-semibold text-gray-800"
              >
                <option value="proportional">Policy A: Proportional Clawback (Both shares reduced)</option>
                <option value="completed_sessions_only">Policy B: Completed Sessions Protected (Trainer keeps earned)</option>
                <option value="recalculate">Policy C: Recalculate Post-Refund (Rerun rule on net price)</option>
              </select>
            </div>
          </div>
        </div>

        {/* Biometric Turnstile Hardware Bridge Settings (Sections 21, 22, 75) */}
        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm space-y-4">
          <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
            <Fingerprint className="w-4 h-4 text-emerald-600" />
            Biometric Scanner & Turnstile Bridge (Sections 21, 22, 75)
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="block text-gray-700 font-bold mb-1">Optical Sensor Hardware</label>
              <input
                type="text"
                value={deviceModel}
                onChange={(e) => setDeviceModel(e.target.value)}
                className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg font-semibold text-gray-900 font-mono"
              />
            </div>
            <div>
              <label className="block text-gray-700 font-bold mb-1">Local Bridge Service URL</label>
              <input
                type="text"
                value={bridgeHost}
                onChange={(e) => setBridgeHost(e.target.value)}
                className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg font-mono text-gray-900"
              />
            </div>
            <div className="md:col-span-2 flex items-center gap-2">
              <input
                type="checkbox"
                id="autoTurnstile"
                checked={autoCheckInTurnstile}
                onChange={(e) => setAutoCheckInTurnstile(e.target.checked)}
                className="rounded text-indigo-600"
              />
              <label htmlFor="autoTurnstile" className="text-xs text-gray-700 font-medium">
                Auto-trip turnstile barrier pulse on valid biometric match score (&gt;80%)
              </label>
            </div>
          </div>
        </div>

        {/* Branch Configurations */}
        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
              <Building2 className="w-4 h-4 text-indigo-600" />
              Registered Branches ({branches.length})
            </h3>
            <button
              type="button"
              onClick={() => setIsAddBranchOpen(true)}
              className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold transition-colors shadow-xs flex items-center gap-1"
            >
              <Plus className="w-3.5 h-3.5" />
              Add Branch
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {branches.map((b) => (
              <div
                key={b.id}
                className="p-4 bg-gray-50 rounded-xl border border-gray-200 flex justify-between items-start text-xs"
              >
                <div>
                  <div className="font-bold text-gray-900 text-sm">{b.name}</div>
                  <div className="text-gray-500 mt-0.5">{b.address}</div>
                  <div className="text-gray-400 text-[11px] mt-1 font-mono">
                    Phone: {b.phone} • City: {b.city}
                  </div>
                </div>
                <span className="px-2.5 py-1 bg-white border border-gray-300 rounded-lg font-mono text-[11px] text-gray-700">
                  {b.id}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="flex items-center justify-end gap-3">
          {saved && (
            <span className="text-xs text-emerald-600 font-bold flex items-center gap-1">
              <CheckCircle2 className="w-4 h-4" />
              Settings Saved!
            </span>
          )}
          <button
            type="submit"
            className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold transition-colors shadow-xs flex items-center gap-1.5"
          >
            <Save className="w-4 h-4" />
            Save Configuration
          </button>
        </div>
      </form>

      {/* Add Branch Modal */}
      {isAddBranchOpen && (
        <div className="fixed inset-0 z-50 bg-gray-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl border border-gray-200 w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gray-50">
              <h3 className="font-bold text-gray-900 text-base">Register New Gym Branch</h3>
              <button
                onClick={() => setIsAddBranchOpen(false)}
                className="text-gray-400 hover:text-gray-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddBranch} className="p-6 space-y-3.5 text-xs">
              <div>
                <label className="block font-bold text-gray-700 mb-1">Branch Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Jabalpur Civil Lines"
                  value={newBranchName}
                  onChange={(e) => setNewBranchName(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg font-semibold text-gray-900"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-gray-700 mb-1">City</label>
                  <input
                    type="text"
                    required
                    value={newBranchCity}
                    onChange={(e) => setNewBranchCity(e.target.value)}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg text-gray-900"
                  />
                </div>
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Phone Number</label>
                  <input
                    type="text"
                    required
                    value={newBranchPhone}
                    onChange={(e) => setNewBranchPhone(e.target.value)}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg font-mono text-gray-900"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1">Full Facility Address</label>
                <input
                  type="text"
                  required
                  value={newBranchAddress}
                  onChange={(e) => setNewBranchAddress(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg text-gray-900"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setIsAddBranchOpen(false)}
                  className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg font-semibold hover:bg-gray-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-indigo-600 text-white rounded-lg font-bold hover:bg-indigo-700 shadow-xs"
                >
                  Register Branch
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
