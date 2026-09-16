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
  PlugZap,
  UserPlus,
  Trash2,
  AlertCircle,
  RefreshCw,
  Ban,
  ShieldCheck,
  Users,
  Search,
  Link2,
  History,
  LogIn,
  LogOut,
} from 'lucide-react';
import { Branch, UserAccount, BiometricEnrollment, BiometricPersonType, BiometricDeviceUser, BiometricPunchEvent, Trainee, Trainer } from '../../types';
import { storageService } from '../../services/storageService';
import { biometricBridge, buildEnrollment, computeTraineeValidity, DeviceStatus } from '../../services/biometricBridgeService';
import { firebaseAuthService } from '../../services/firebase';
import { firestoreSync } from '../../services/firestoreSync';
import { backupService, BackupEnvelope } from '../../services/backupService';

/** Enrollment capacity suffix (e.g. ", 549/2000 fingerprints, 18/1500 faces")
 * matching the terminal's own "Device Capacity" screen — omits a modality
 * entirely if the bridge didn't report it (older firmware/device). */
function formatCapacitySuffix(status: DeviceStatus): string {
  const parts: string[] = [];
  if (status.fingerprintsEnrolled !== undefined) {
    parts.push(`${status.fingerprintsEnrolled}${status.fingerprintsCapacity !== undefined ? `/${status.fingerprintsCapacity}` : ''} fingerprints`);
  }
  if (status.facesEnrolled !== undefined) {
    parts.push(`${status.facesEnrolled}${status.facesCapacity !== undefined ? `/${status.facesCapacity}` : ''} faces`);
  }
  return parts.length ? `, ${parts.join(', ')}` : '';
}

interface SettingsViewProps {
  branches: Branch[];
  trainees?: Trainee[];
  trainers?: Trainer[];
  staff?: UserAccount[];
  currentTheme?: 'light' | 'dark';
  onToggleTheme?: (theme: 'light' | 'dark') => void;
  currentUser?: UserAccount | null;
  isAdmin?: boolean;
  isDemoMode?: boolean;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  branches,
  trainees: traineesProp,
  trainers: trainersProp,
  staff: staffProp,
  currentTheme,
  onToggleTheme,
  currentUser,
  isAdmin = false,
  isDemoMode = false,
}) => {
  const [backupNote, setBackupNote] = useState<string | null>(null);
  const backupInputRef = React.useRef<HTMLInputElement>(null);

  // One-time cleanup for real accounts that got seeded with fake sample data
  // before that was fixed to only ever happen in demo mode.
  const [cleanupBusy, setCleanupBusy] = useState(false);
  const [cleanupMsg, setCleanupMsg] = useState<string | null>(null);

  const handleClearSeedData = async () => {
    const confirmed = window.confirm(
      'This permanently deletes ALL branches, trainees, trainers, payments, attendance, and every other ' +
        'operational record for this account — both on this device and in the cloud. This cannot be undone. ' +
        'Only do this if everything currently shown is leftover fake sample data, not real records. Continue?'
    );
    if (!confirmed) return;

    setCleanupBusy(true);
    setCleanupMsg('Clearing local data…');
    storageService.clearOperationalData();

    setCleanupMsg('Clearing cloud data (this also stops live sync until you reload)…');
    const result = await firestoreSync.clearAllCollections();

    setCleanupBusy(false);
    const countsText = Object.entries(result.counts)
      .map(([name, n]) => `${name}: ${n}`)
      .join(', ');
    if (result.errors.length) {
      setCleanupMsg(
        `Deleted (${countsText || 'nothing counted'}), but FAILED on: ${result.errors.join(', ')} — those still have their old data. Check the browser console for the exact error.`
      );
    } else {
      setCleanupMsg(`Deleted per collection — ${countsText || 'nothing to delete'}. Reloading…`);
      setTimeout(() => window.location.reload(), 2000);
    }
  };

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

  // Hardware Bridge Settings (persisted via storageService + biometricBridge)
  const [bioConfig] = useState(() => storageService.getBiometricConfig());
  const [bridgeUrl, setBridgeUrl] = useState<string>(bioConfig.bridgeUrl);
  const [deviceModel, setDeviceModel] = useState<string>(bioConfig.deviceModel);
  const [autoCheckInTurnstile, setAutoCheckInTurnstile] = useState<boolean>(bioConfig.autoTurnstile);

  // Biometric bridge connection test
  const [connStatus, setConnStatus] = useState<'idle' | 'connecting' | 'connected' | 'error'>('idle');
  const [connMsg, setConnMsg] = useState<string>('');

  // Auto-reconnect on mount: a browser refresh always tears down the old
  // connection state (a fresh page load means a brand-new adapter instance),
  // which used to leave this page stuck showing "idle" until someone
  // manually clicked "Test Connection" — looking exactly like the bridge had
  // dropped. Warm-start the badge from the adapter's persisted last-known
  // status, then silently re-verify in the background.
  useEffect(() => {
    if (biometricBridge.isConnected()) {
      setConnStatus('connected');
      setConnMsg('Reconnecting to confirm the bridge is still reachable…');
    }
    let cancelled = false;
    (async () => {
      const ok = await biometricBridge.connect();
      if (cancelled) return;
      const status = biometricBridge.getDeviceStatus();
      if (ok) {
        setConnStatus('connected');
        setConnMsg(
          `Connected to ${status.model} — firmware ${status.firmware}, serial ${status.serialNumber}${
            status.userCount !== undefined ? `, ${status.userCount} users on device` : ''
          }${formatCapacitySuffix(status)}.`
        );
      } else {
        setConnStatus('error');
        setConnMsg(biometricBridge.getLastError() || `Could not reach the bridge at ${status.port}.`);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Device actions — force-open, synchronize, refresh (Settings & Configuration)
  const [actionBusy, setActionBusy] = useState<'test-open' | 'force-open' | 'sync' | 'refresh' | null>(null);
  const [actionMsg, setActionMsg] = useState<{ text: string; ok: boolean } | null>(null);

  // Fingerprint enrollment — people are branch-scoped by the caller so this
  // works identically for demo admin (all branches) and demo manager (one branch).
  const [allTrainees] = useState(() => storageService.getTrainees());
  const [allTrainers] = useState(() => storageService.getTrainers());
  const trainees = traineesProp ?? allTrainees;
  const trainers = trainersProp ?? allTrainers;
  const staffMembers = staffProp ?? [];
  const [enrollments, setEnrollments] = useState<BiometricEnrollment[]>(() =>
    storageService.getBiometricEnrollments()
  );
  const [enrollType, setEnrollType] = useState<BiometricPersonType>('trainee');
  const [enrollPersonId, setEnrollPersonId] = useState<string>('');
  const [enrollStatus, setEnrollStatus] = useState<'idle' | 'capturing' | 'success' | 'error'>('idle');
  const [enrollMsg, setEnrollMsg] = useState<string>('');

  const getPeopleForType = (type: BiometricPersonType): { id: string; fullName: string }[] =>
    type === 'trainee'
      ? trainees.map((t) => ({ id: t.id, fullName: t.fullName }))
      : type === 'trainer'
      ? trainers.map((t) => ({ id: t.id, fullName: t.fullName }))
      : staffMembers.map((s) => ({ id: s.id, fullName: s.displayName }));

  const enrollPeople = getPeopleForType(enrollType);

  // Existing device users (e.g. enrolled long ago via EasyBio) that can be
  // linked to a gymos person, disabled, or removed — without needing a fresh
  // fingerprint capture since their template already exists on the device.
  const [deviceUsers, setDeviceUsers] = useState<BiometricDeviceUser[]>([]);
  const [deviceUsersLoading, setDeviceUsersLoading] = useState(false);
  const [deviceUsersMsg, setDeviceUsersMsg] = useState<string>('');
  const [deviceUserSearch, setDeviceUserSearch] = useState('');
  const [linkDrafts, setLinkDrafts] = useState<Record<string, { type: BiometricPersonType; personId: string }>>({});
  const [linkBusyUid, setLinkBusyUid] = useState<string | null>(null);

  const handleLoadDeviceUsers = async () => {
    setDeviceUsersLoading(true);
    setDeviceUsersMsg('');
    const result = await biometricBridge.listDeviceUsers();
    setDeviceUsersLoading(false);
    if (result.success) {
      setDeviceUsers(result.users);
    } else {
      setDeviceUsersMsg(result.error || 'Could not load device users.');
    }
  };

  // Read-only view of every punch the device is holding — for auditing what
  // the device has actually logged, independent of what Synchronize has (or
  // hasn't) already pulled into gymos.
  const [deviceLog, setDeviceLog] = useState<BiometricPunchEvent[]>([]);
  const [deviceLogLoading, setDeviceLogLoading] = useState(false);
  const [deviceLogMsg, setDeviceLogMsg] = useState('');

  const handleLoadDeviceLog = async () => {
    setDeviceLogLoading(true);
    setDeviceLogMsg('');
    const result = await biometricBridge.getDeviceAttendanceLog();
    setDeviceLogLoading(false);
    if (result.success) {
      setDeviceLog(result.records);
    } else {
      setDeviceLogMsg(result.error || 'Could not read the device attendance log.');
    }
  };

  const handleLinkDeviceUser = async (uid: string) => {
    const draft = linkDrafts[uid];
    if (!draft?.personId) return;
    const person = getPeopleForType(draft.type).find((p) => p.id === draft.personId);
    if (!person) return;
    setLinkBusyUid(uid);
    const result = await biometricBridge.linkDeviceUser({ uid, id: person.id, name: person.fullName, type: draft.type });
    if (result.success) {
      storageService.saveBiometricEnrollment({
        personId: person.id,
        personName: person.fullName,
        personType: draft.type,
        templateId: `zk-uid-${uid}`,
        confidenceScore: 100,
        enrolledAt: new Date().toISOString(),
        deviceUserId: uid,
        status: 'active',
      });
      setEnrollments(storageService.getBiometricEnrollments());
      setDeviceUsers((prev) =>
        prev.map((u) =>
          u.uid === uid ? { ...u, linked: true, personId: person.id, personName: person.fullName, personType: draft.type } : u
        )
      );
      if (draft.type === 'trainee') {
        const trainee = trainees.find((t) => t.id === person.id);
        if (trainee) biometricBridge.pushValidity(trainee.id, computeTraineeValidity(trainee));
      }
    } else {
      setDeviceUsersMsg(result.error || 'Linking failed.');
    }
    setLinkBusyUid(null);
  };

  const handleToggleEnrollmentStatus = (personId: string) => {
    const entry = enrollments.find((e) => e.personId === personId);
    if (!entry) return;
    storageService.saveBiometricEnrollment({ ...entry, status: entry.status === 'disabled' ? 'active' : 'disabled' });
    setEnrollments(storageService.getBiometricEnrollments());
  };

  const filteredDeviceUsers = deviceUsers.filter((u) => {
    if (!deviceUserSearch.trim()) return true;
    const q = deviceUserSearch.trim().toLowerCase();
    return (
      u.deviceName.toLowerCase().includes(q) ||
      u.uid.includes(q) ||
      u.deviceUserId.includes(q) ||
      (u.personName || '').toLowerCase().includes(q)
    );
  });

  const persistBiometricConfig = () => {
    biometricBridge.configure({
      bridgeUrl: bridgeUrl.trim(),
      deviceModel: deviceModel.trim(),
      autoTurnstile: autoCheckInTurnstile,
    });
  };

  const handleTestConnection = async () => {
    persistBiometricConfig();
    setConnStatus('connecting');
    setConnMsg('Opening bridge connection…');
    const ok = await biometricBridge.connect();
    const status = biometricBridge.getDeviceStatus();
    if (ok) {
      setConnStatus('connected');
      setConnMsg(`Connected to ${status.model} — firmware ${status.firmware}, serial ${status.serialNumber}${
        status.userCount !== undefined ? `, ${status.userCount} users on device` : ''
      }${formatCapacitySuffix(status)}.`);
    } else {
      setConnStatus('error');
      setConnMsg(biometricBridge.getLastError() || `Could not reach the bridge at ${status.port}.`);
    }
  };

  const handleTestOpen = async () => {
    setActionBusy('test-open');
    setActionMsg(null);
    const result = await biometricBridge.forceOpen(1);
    setActionBusy(null);
    setActionMsg({
      text: result.success
        ? 'Test signal sent — relay pulsed for 1s. If the door/turnstile didn\'t click, this model likely has no wired relay.'
        : result.error || 'Test failed.',
      ok: result.success,
    });
  };

  const handleForceOpen = async () => {
    setActionBusy('force-open');
    setActionMsg(null);
    const result = await biometricBridge.forceOpen(3);
    setActionBusy(null);
    setActionMsg({
      text: result.success ? 'Door relay pulsed — turnstile/door should open now.' : result.error || 'Force-open failed.',
      ok: result.success,
    });
  };

  const handleSynchronize = async () => {
    setActionBusy('sync');
    setActionMsg(null);

    // Refresh cached membership-validity snapshots on the bridge for every
    // enrolled trainee, so the live-punch toast doesn't show stale plan info.
    const currentEnrollmentsForValidity = storageService.getBiometricEnrollments();
    for (const en of currentEnrollmentsForValidity) {
      if (en.personType !== 'trainee') continue;
      const trainee = trainees.find((t) => t.id === en.personId);
      if (trainee) biometricBridge.pushValidity(trainee.id, computeTraineeValidity(trainee));
    }

    const result = await biometricBridge.synchronize();
    if (result.success) {
      const currentEnrollments = storageService.getBiometricEnrollments();
      let recorded = 0;
      let denied = 0;
      for (const rec of result.records) {
        if (!rec.personId || !rec.personName) continue;
        const enrollment = currentEnrollments.find((e) => e.personId === rec.personId);
        if (enrollment?.status === 'disabled') {
          denied++;
          continue;
        }
        storageService.recordBiometricPunch({
          personId: rec.personId,
          personName: rec.personName,
          personType: rec.personType === 'staff' ? 'trainer' : rec.personType || 'trainee',
          timestamp: rec.timestamp,
          punchType: rec.punch,
          deviceId: biometricBridge.getDeviceStatus().serialNumber,
        });
        recorded++;
      }
      setActionMsg({
        text: `Synchronized ${result.count} new punch(es) from device — ${recorded} recorded to attendance${
          denied ? `, ${denied} skipped (biometric disabled)` : ''
        }.`,
        ok: true,
      });
    } else {
      setActionMsg({ text: result.error || 'Synchronize failed.', ok: false });
    }
    setActionBusy(null);
  };

  const handleRefreshDevice = async () => {
    setActionBusy('refresh');
    setActionMsg(null);
    const result = await biometricBridge.refreshDevice();
    const status = biometricBridge.getDeviceStatus();
    setActionMsg({
      text: result.success
        ? `Refreshed — ${status.model}, firmware ${status.firmware}, ${status.userCount ?? '?'} users on device${formatCapacitySuffix(status)}.`
        : result.error || 'Refresh failed.',
      ok: result.success,
    });
    setActionBusy(null);
  };

  const handleEnrollFingerprint = async () => {
    const person = enrollPeople.find((p) => p.id === enrollPersonId);
    if (!person) {
      setEnrollStatus('error');
      setEnrollMsg('Select a person to enrol first.');
      return;
    }
    setEnrollStatus('capturing');
    setEnrollMsg(`Place ${person.fullName}'s finger on the device sensor — it will prompt for up to 3 scans…`);
    const result = await biometricBridge.enrollFingerprint({
      id: person.id,
      name: person.fullName,
      type: enrollType,
    });
    if (result.success) {
      storageService.saveBiometricEnrollment(buildEnrollment(
        { id: person.id, name: person.fullName, type: enrollType },
        result
      ));
      setEnrollments(storageService.getBiometricEnrollments());
      setEnrollStatus('success');
      setEnrollMsg(`Saved fingerprint for ${person.fullName} on the device.`);
      if (enrollType === 'trainee') {
        const trainee = trainees.find((t) => t.id === person.id);
        if (trainee) biometricBridge.pushValidity(trainee.id, computeTraineeValidity(trainee));
      }
    } else {
      setEnrollStatus('error');
      setEnrollMsg(result.error || 'Capture failed. Reposition the finger and retry.');
    }
  };

  const handleRemoveEnrollment = async (personId: string) => {
    await biometricBridge.removeEnrollment(personId);
    storageService.deleteBiometricEnrollment(personId);
    setEnrollments(storageService.getBiometricEnrollments());
  };

  // Pre-fills the capture form for an already-enrolled person and scrolls it
  // into view — /api/enroll already reuses their existing device uid and
  // re-captures a fresh template when called again, so no backend change
  // was needed to support this.
  const handleReEnroll = (personId: string, personType: BiometricPersonType) => {
    setEnrollType(personType);
    setEnrollPersonId(personId);
    setEnrollStatus('idle');
    setEnrollMsg('Ready to re-capture — click "Capture & Save Fingerprint" below.');
    document.getElementById('biometric-enroll-form')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  };

  const handleRemoveDeviceUser = async (uid: string) => {
    if (!window.confirm('Remove this entry from the device entirely? Its fingerprint/face template will be deleted and this cannot be undone.')) {
      return;
    }
    const result = await biometricBridge.removeDeviceUser(uid);
    if (result.success) {
      setDeviceUsers((prev) => prev.filter((u) => u.uid !== uid));
    } else {
      setDeviceUsersMsg(result.error || 'Could not remove this entry from the device.');
    }
  };

  // New Branch Modal
  const [isAddBranchOpen, setIsAddBranchOpen] = useState<boolean>(false);
  const [newBranchName, setNewBranchName] = useState<string>('');
  const [newBranchCity, setNewBranchCity] = useState<string>('Jabalpur');
  const [newBranchAddress, setNewBranchAddress] = useState<string>('Civil Lines, Main Road');
  const [newBranchPhone, setNewBranchPhone] = useState<string>('+91 761-4022110');

  const [saved, setSaved] = useState<boolean>(false);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    persistBiometricConfig();
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

      {/* One-time cleanup: real accounts that got seeded with fake sample data
          before that was fixed to only ever happen in demo mode. */}
      {isAdmin && !isDemoMode && (
        <div className="bg-rose-50 dark:bg-rose-950/30 p-5 rounded-xl border border-rose-200 dark:border-rose-900 shadow-sm space-y-3">
          <h3 className="text-sm font-bold text-rose-900 dark:text-rose-300 flex items-center gap-2">
            <AlertCircle className="w-4 h-4" />
            Clear Leftover Sample Data
          </h3>
          <p className="text-xs text-rose-800/80 dark:text-rose-300/80">
            If this account still shows old fake sample records (e.g. "Indore Central", "Rahul Malhotra") that were
            written before this was fixed to only affect Demo Login, use this to permanently delete them — locally
            and from the cloud. Only use this if nothing currently shown is real data you want to keep.
          </p>
          <button
            type="button"
            onClick={handleClearSeedData}
            disabled={cleanupBusy}
            className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white rounded-lg text-xs font-bold transition-colors shadow-xs flex items-center gap-1.5"
          >
            {cleanupBusy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
            {cleanupBusy ? 'Clearing…' : 'Clear All Sample Data'}
          </button>
          {cleanupMsg && <p className="text-xs font-semibold text-rose-900 dark:text-rose-300">{cleanupMsg}</p>}
        </div>
      )}

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
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
              <Fingerprint className="w-4 h-4 text-emerald-600" />
              Biometric Scanner & Turnstile Bridge (Sections 21, 22, 75)
            </h3>
            <a
              href="/biometric-bridge.zip"
              download="biometric-bridge.zip"
              className="px-3 py-1.5 bg-gray-900 hover:bg-black text-white rounded-lg text-xs font-bold transition-colors shadow-xs flex items-center gap-1.5"
            >
              <Download className="w-3.5 h-3.5" />
              Download Biometric Bridge (.zip)
            </a>
          </div>
          <p className="text-[11px] text-gray-400 -mt-2">
            Unzip on the PC connected to the fingerprint terminal, then run <code>install.bat</code> (Windows) once —
            it sets everything up (certificate, firewall, silent auto-start on login) so nothing needs running by
            hand afterward. See the included README for details.
          </p>

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
                value={bridgeUrl}
                onChange={(e) => setBridgeUrl(e.target.value)}
                placeholder="https://127.0.0.1:8090"
                className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg font-mono text-gray-900"
              />
              <p className="text-[11px] text-gray-400 mt-1">
                Use <code>https://</code> on port <code>8090</code> (not 8000 — that's the old EasyBio dashboard) —
                the IP of whichever machine runs <code>biometric-bridge/server.py</code>, not the terminal's own IP.
                First time from a given browser, open that same URL directly in a new tab and click through the
                "not secure" warning once to trust its certificate.
              </p>
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

          {/* Open / Test the bridge connection */}
          <div className="flex flex-wrap items-center gap-3 pt-1 border-t border-gray-100">
            <button
              type="button"
              onClick={handleTestConnection}
              disabled={connStatus === 'connecting'}
              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-lg text-xs font-bold transition-colors shadow-xs flex items-center gap-1.5 mt-3"
            >
              {connStatus === 'connecting' ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <PlugZap className="w-3.5 h-3.5" />
              )}
              {connStatus === 'connecting' ? 'Opening…' : 'Open / Test Connection'}
            </button>
            {connMsg && (
              <span
                className={`text-xs font-semibold flex items-center gap-1.5 mt-3 ${
                  connStatus === 'connected'
                    ? 'text-emerald-600'
                    : connStatus === 'error'
                    ? 'text-rose-600'
                    : 'text-gray-500'
                }`}
              >
                {connStatus === 'connected' ? (
                  <CheckCircle2 className="w-3.5 h-3.5" />
                ) : connStatus === 'error' ? (
                  <AlertCircle className="w-3.5 h-3.5" />
                ) : null}
                {connMsg}
              </span>
            )}
          </div>

          {/* Device actions: test-open, force-open, synchronize, refresh */}
          <div className="flex flex-wrap items-center gap-3 pt-1 border-t border-gray-100">
            <button
              type="button"
              onClick={handleTestOpen}
              disabled={actionBusy !== null}
              className="px-3 py-1.5 bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white rounded-lg text-xs font-bold transition-colors shadow-xs flex items-center gap-1.5 mt-3"
            >
              {actionBusy === 'test-open' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Fingerprint className="w-3.5 h-3.5" />}
              {actionBusy === 'test-open' ? 'Testing…' : 'Test Open Door'}
            </button>
            <button
              type="button"
              onClick={handleForceOpen}
              disabled={actionBusy !== null}
              className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white rounded-lg text-xs font-bold transition-colors shadow-xs flex items-center gap-1.5 mt-3"
            >
              {actionBusy === 'force-open' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <PlugZap className="w-3.5 h-3.5" />}
              {actionBusy === 'force-open' ? 'Opening…' : 'Force Open Door'}
            </button>
            <button
              type="button"
              onClick={handleSynchronize}
              disabled={actionBusy !== null}
              className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-lg text-xs font-bold transition-colors shadow-xs flex items-center gap-1.5 mt-3"
            >
              {actionBusy === 'sync' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <DatabaseBackup className="w-3.5 h-3.5" />}
              {actionBusy === 'sync' ? 'Synchronizing…' : 'Synchronize'}
            </button>
            <button
              type="button"
              onClick={handleRefreshDevice}
              disabled={actionBusy !== null}
              className="px-3 py-1.5 bg-gray-700 hover:bg-gray-800 disabled:opacity-50 text-white rounded-lg text-xs font-bold transition-colors shadow-xs flex items-center gap-1.5 mt-3"
            >
              {actionBusy === 'refresh' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
              {actionBusy === 'refresh' ? 'Refreshing…' : 'Refresh'}
            </button>
            {actionMsg && (
              <span
                className={`text-xs font-semibold flex items-center gap-1.5 mt-3 ${
                  actionMsg.ok ? 'text-emerald-600' : 'text-rose-600'
                }`}
              >
                {actionMsg.ok ? <CheckCircle2 className="w-3.5 h-3.5" /> : <AlertCircle className="w-3.5 h-3.5" />}
                {actionMsg.text}
              </span>
            )}
          </div>

          {/* Fingerprint enrollment (Save a biometric per person) */}
          <div className="pt-4 border-t border-gray-100 space-y-3">
            <h4 className="text-xs font-bold text-gray-900 flex items-center gap-1.5">
              <UserPlus className="w-3.5 h-3.5 text-indigo-600" />
              Enrolled Fingerprints ({enrollments.length})
            </h4>
            <p className="text-[11px] text-gray-400">
              Capturing here registers a fingerprint remotely through the bridge. The terminal's face recognition
              can't be triggered from software — a new face must be enrolled directly on the device's own touchscreen.
              Once enrolled either way, every check-in (fingerprint or face) syncs to gymos identically.
            </p>

            <div id="biometric-enroll-form" className="grid grid-cols-1 md:grid-cols-[auto_1fr_auto] gap-2 text-xs items-end">
              <div>
                <label className="block text-gray-700 font-bold mb-1">Role</label>
                <select
                  value={enrollType}
                  onChange={(e) => {
                    setEnrollType(e.target.value as BiometricPersonType);
                    setEnrollPersonId('');
                    setEnrollStatus('idle');
                    setEnrollMsg('');
                  }}
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg font-semibold text-gray-800"
                >
                  <option value="trainee">Trainee (Client)</option>
                  <option value="trainer">Trainer</option>
                  <option value="staff">Employee (Staff)</option>
                </select>
              </div>
              <div>
                <label className="block text-gray-700 font-bold mb-1">Person</label>
                <select
                  value={enrollPersonId}
                  onChange={(e) => setEnrollPersonId(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg font-semibold text-gray-800"
                >
                  <option value="">Select {enrollType}…</option>
                  {enrollPeople.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.fullName}
                    </option>
                  ))}
                </select>
              </div>
              <button
                type="button"
                onClick={handleEnrollFingerprint}
                disabled={enrollStatus === 'capturing' || !enrollPersonId}
                className="px-3 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-lg text-xs font-bold transition-colors shadow-xs flex items-center gap-1.5"
              >
                {enrollStatus === 'capturing' ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Fingerprint className="w-3.5 h-3.5" />
                )}
                {enrollStatus === 'capturing' ? 'Capturing…' : 'Capture & Save Fingerprint'}
              </button>
            </div>

            {enrollMsg && (
              <div
                className={`p-2.5 rounded-lg text-xs font-semibold ${
                  enrollStatus === 'success'
                    ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                    : enrollStatus === 'error'
                    ? 'bg-rose-50 text-rose-800 border border-rose-200'
                    : 'bg-indigo-50 text-indigo-800 border border-indigo-200'
                }`}
              >
                {enrollMsg}
              </div>
            )}

            {enrollments.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {enrollments.map((en) => (
                  <div
                    key={en.personId}
                    className={`p-3 rounded-lg border flex justify-between items-start text-xs ${
                      en.status === 'disabled' ? 'bg-gray-100 border-gray-300 opacity-70' : 'bg-gray-50 border-gray-200'
                    }`}
                  >
                    <div>
                      <div className="font-bold text-gray-900 flex items-center gap-1.5">
                        {en.personName}
                        {en.status === 'disabled' && (
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-gray-200 text-gray-600">
                            DISABLED
                          </span>
                        )}
                      </div>
                      <div className="text-gray-400 text-[11px] mt-0.5 font-mono">
                        {en.personType} • {en.confidenceScore}% • {new Date(en.enrolledAt).toLocaleDateString()}
                        {en.deviceUserId ? ` • device uid ${en.deviceUserId}` : ''}
                      </div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => handleReEnroll(en.personId, en.personType)}
                        className="p-1 rounded-md text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"
                        aria-label={`Re-enroll fingerprint for ${en.personName}`}
                        title="Re-enroll (capture a fresh fingerprint template)"
                      >
                        <RefreshCw className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleToggleEnrollmentStatus(en.personId)}
                        className="p-1 rounded-md text-gray-400 hover:text-amber-600 hover:bg-amber-50 transition-colors"
                        aria-label={en.status === 'disabled' ? `Re-enable access for ${en.personName}` : `Disable access for ${en.personName}`}
                        title={en.status === 'disabled' ? 'Re-enable access' : 'Disable access (keeps fingerprint on device)'}
                      >
                        {en.status === 'disabled' ? <ShieldCheck className="w-3.5 h-3.5" /> : <Ban className="w-3.5 h-3.5" />}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleRemoveEnrollment(en.personId)}
                        className="p-1 rounded-md text-gray-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                        aria-label={`Remove fingerprint for ${en.personName}`}
                        title="Remove fingerprint from device entirely"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Existing device users (e.g. enrolled via EasyBio before gymos existed) */}
          <div className="pt-4 border-t border-gray-100 space-y-3">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <h4 className="text-xs font-bold text-gray-900 flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-indigo-600" />
                Device-Registered Users {deviceUsers.length > 0 ? `(${deviceUsers.length})` : ''}
              </h4>
              <button
                type="button"
                onClick={handleLoadDeviceUsers}
                disabled={deviceUsersLoading}
                className="px-3 py-1.5 bg-gray-700 hover:bg-gray-800 disabled:opacity-50 text-white rounded-lg text-xs font-bold transition-colors shadow-xs flex items-center gap-1.5"
              >
                {deviceUsersLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
                {deviceUsersLoading ? 'Loading…' : deviceUsers.length ? 'Reload from Device' : 'Load Users from Device'}
              </button>
            </div>
            <p className="text-[11px] text-gray-400">
              Everyone already fingerprint-enrolled on the terminal (including from before gymos was connected). Link
              each one to a gymos trainee, trainer, or staff record — no new fingerprint scan needed, it's already on
              the device.
            </p>

            {deviceUsersMsg && (
              <div className="p-2.5 rounded-lg text-xs font-semibold bg-rose-50 text-rose-800 border border-rose-200">
                {deviceUsersMsg}
              </div>
            )}

            {deviceUsers.length > 0 && (
              <>
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-gray-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={deviceUserSearch}
                    onChange={(e) => setDeviceUserSearch(e.target.value)}
                    placeholder="Search by device name, UID, or linked person…"
                    className="w-full pl-8 pr-3 py-2 bg-gray-50 border border-gray-300 rounded-lg text-xs text-gray-800"
                  />
                </div>

                <div className="max-h-96 overflow-y-auto space-y-1.5 border border-gray-200 rounded-lg p-2">
                  {filteredDeviceUsers.map((du) => {
                    const draft = linkDrafts[du.uid] || { type: 'trainee' as BiometricPersonType, personId: '' };
                    const options = getPeopleForType(draft.type);
                    return (
                      <div
                        key={du.uid}
                        className="p-2.5 bg-gray-50 rounded-lg border border-gray-200 flex flex-col md:flex-row md:items-center gap-2 text-xs"
                      >
                        <div className="md:w-56 shrink-0">
                          <div className="font-bold text-gray-900">{du.deviceName || `(unnamed) uid ${du.uid}`}</div>
                          <div className="text-gray-400 text-[10px] font-mono">
                            uid {du.uid} • device id {du.deviceUserId}
                          </div>
                        </div>

                        {du.linked ? (
                          <div className="flex flex-col gap-0.5 w-fit">
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 w-fit">
                              <CheckCircle2 className="w-3 h-3" />
                              Linked to {du.personName} ({du.personType})
                            </span>
                            {du.enrolledAt && (
                              <span className="text-[10px] text-gray-400 font-mono pl-1">
                                Enrolled {new Date(du.enrolledAt).toLocaleString()}
                              </span>
                            )}
                          </div>
                        ) : (
                          <div className="flex flex-1 flex-wrap items-center gap-1.5">
                            <select
                              value={draft.type}
                              onChange={(e) =>
                                setLinkDrafts((prev) => ({
                                  ...prev,
                                  [du.uid]: { type: e.target.value as BiometricPersonType, personId: '' },
                                }))
                              }
                              className="px-2 py-1.5 bg-white border border-gray-300 rounded-lg font-semibold text-gray-800"
                            >
                              <option value="trainee">Trainee</option>
                              <option value="trainer">Trainer</option>
                              <option value="staff">Staff</option>
                            </select>
                            <select
                              value={draft.personId}
                              onChange={(e) =>
                                setLinkDrafts((prev) => ({ ...prev, [du.uid]: { type: draft.type, personId: e.target.value } }))
                              }
                              className="flex-1 min-w-[10rem] px-2 py-1.5 bg-white border border-gray-300 rounded-lg font-semibold text-gray-800"
                            >
                              <option value="">Select person…</option>
                              {options.map((p) => (
                                <option key={p.id} value={p.id}>
                                  {p.fullName}
                                </option>
                              ))}
                            </select>
                            <button
                              type="button"
                              onClick={() => handleLinkDeviceUser(du.uid)}
                              disabled={!draft.personId || linkBusyUid === du.uid}
                              className="px-2.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-lg font-bold transition-colors shadow-xs flex items-center gap-1"
                            >
                              {linkBusyUid === du.uid ? <Loader2 className="w-3 h-3 animate-spin" /> : <Link2 className="w-3 h-3" />}
                              Link
                            </button>
                            <button
                              type="button"
                              onClick={() => handleRemoveDeviceUser(du.uid)}
                              className="p-1.5 rounded-md text-gray-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                              aria-label={`Remove ${du.deviceName || `uid ${du.uid}`} from the device`}
                              title="Remove from device entirely (deletes their fingerprint/face template)"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </div>

          {/* Full device attendance log — read-only, does not touch the Synchronize cursor */}
          <div className="pt-4 border-t border-gray-100 space-y-3">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <h4 className="text-xs font-bold text-gray-900 flex items-center gap-1.5">
                <History className="w-3.5 h-3.5 text-indigo-600" />
                Device Attendance Log {deviceLog.length > 0 ? `(${deviceLog.length})` : ''}
              </h4>
              <button
                type="button"
                onClick={handleLoadDeviceLog}
                disabled={deviceLogLoading}
                className="px-3 py-1.5 bg-gray-700 hover:bg-gray-800 disabled:opacity-50 text-white rounded-lg text-xs font-bold transition-colors shadow-xs flex items-center gap-1.5"
              >
                {deviceLogLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <History className="w-3.5 h-3.5" />}
                {deviceLogLoading ? 'Reading…' : deviceLog.length ? 'Reload Full Log' : 'Query Full Device Log'}
              </button>
            </div>
            <p className="text-[11px] text-gray-400">
              Every punch the device has ever recorded, most recent first — independent of what Synchronize has
              already pulled into gymos. Use this to audit the raw device history or spot punches from people not
              yet linked above.
            </p>

            {deviceLogMsg && (
              <div className="p-2.5 rounded-lg text-xs font-semibold bg-rose-50 text-rose-800 border border-rose-200">
                {deviceLogMsg}
              </div>
            )}

            {deviceLog.length > 0 && (
              <div className="max-h-96 overflow-y-auto space-y-1 border border-gray-200 rounded-lg p-2">
                {deviceLog.map((r, idx) => {
                  const isCheckOut = r.punch === 1; // ZK protocol: 0 = check-in, 1 = check-out
                  return (
                    <div
                      key={`${r.deviceUserId}-${r.timestamp}-${idx}`}
                      className="p-2 bg-gray-50 rounded-lg border border-gray-200 flex items-center justify-between gap-2 text-xs"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        {isCheckOut ? (
                          <LogOut className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                        ) : (
                          <LogIn className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                        )}
                        <div className="truncate">
                          <span className="font-bold text-gray-900">
                            {r.personName || `Unlinked device ID ${r.deviceUserId}`}
                          </span>
                          {r.personType && <span className="text-gray-400"> • {r.personType}</span>}
                        </div>
                      </div>
                      <span className="text-gray-500 font-mono text-[11px] shrink-0">
                        {new Date(r.timestamp).toLocaleString()}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
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
