import React, { useState } from 'react';
import {
  Fingerprint,
  X,
  CheckCircle2,
  AlertCircle,
  ShieldCheck,
  Dumbbell,
  Users,
  Award,
  Sparkles,
  Zap,
} from 'lucide-react';
import { Trainee, Trainer, AttendanceRecord, PTSubscription } from '../../types';
import { storageService } from '../../services/storageService';
import { biometricBridge } from '../../services/biometricBridgeService';

interface QuickBiometricModalProps {
  isOpen: boolean;
  onClose: () => void;
  trainees: Trainee[];
  trainers: Trainer[];
  subscriptions: PTSubscription[];
  onScanSuccess: () => void;
}

export const QuickBiometricModal: React.FC<QuickBiometricModalProps> = ({
  isOpen,
  onClose,
  trainees,
  trainers,
  subscriptions,
  onScanSuccess,
}) => {
  const [personType, setPersonType] = useState<'trainee' | 'trainer'>('trainee');
  const [selectedPersonId, setSelectedPersonId] = useState<string>(
    trainees[0]?.id || ''
  );
  const [punchMode, setPunchMode] = useState<'general_entry' | 'pt_session'>('general_entry');
  const [scanStatus, setScanStatus] = useState<'idle' | 'scanning' | 'success' | 'error'>('idle');
  const [scanMessage, setScanMessage] = useState<string>('');
  const [confidenceScore, setConfidenceScore] = useState<number>(0);

  const deviceStatus = biometricBridge.getDeviceStatus();

  if (!isOpen) return null;

  const currentTrainee = trainees.find((t) => t.id === selectedPersonId);
  const currentTrainer = trainers.find((t) => t.id === selectedPersonId);

  const activeSub = currentTrainee
    ? subscriptions.find((s) => s.traineeId === currentTrainee.id && s.status === 'active')
    : null;

  const handleScan = async () => {
    setScanStatus('scanning');
    setScanMessage('Biometric fingerprint scanner active. Reading optical sensor...');

    const personObj =
      personType === 'trainee'
        ? trainees.find((t) => t.id === selectedPersonId) || trainees[0]
        : trainers.find((t) => t.id === selectedPersonId) || trainers[0];

    const result = await biometricBridge.scanFingerprint(
      personObj ? { id: personObj.id, name: personObj.fullName, type: personType } : undefined
    );

    if (result.success && result.personId && result.personName) {
      setConfidenceScore(result.confidenceScore || 98.8);
      setScanStatus('success');

      const isPT = personType === 'trainee' && punchMode === 'pt_session' && !!activeSub;

      // Create attendance record
      const today = new Date().toISOString().substring(0, 10);
      const nowTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

      const newRec: AttendanceRecord = {
        id: `att-${Date.now()}`,
        personId: result.personId,
        personName: result.personName,
        personType: result.personType || personType,
        branchId: 'branch-1',
        date: today,
        checkInTime: nowTime,
        status: 'present',
        verificationMethod: 'fingerprint',
        isPTSessionAttendance: isPT,
        deviceId: 'SecuGen-Hamster-Pro-20',
      };

      storageService.recordAttendance(newRec);

      // If PT session attendance, consume session
      if (isPT && activeSub) {
        const completed = activeSub.completedSessions + 1;
        const remaining = Math.max(0, activeSub.remainingSessions - 1);
        const updatedSub: PTSubscription = {
          ...activeSub,
          completedSessions: completed,
          remainingSessions: remaining,
          trainerCommissionEarned: activeSub.trainerCommissionEarned + 600,
          trainerCommissionOutstanding: activeSub.trainerCommissionOutstanding + 600,
          status: remaining === 0 ? 'completed' : 'active',
        };
        storageService.savePTSubscription(updatedSub);

        // Also add completed PTSession
        storageService.savePTSession({
          id: `ses-${Date.now()}`,
          subscriptionId: activeSub.id,
          traineeId: activeSub.traineeId,
          traineeName: activeSub.traineeName,
          trainerId: activeSub.trainerId,
          trainerName: activeSub.trainerName,
          branchId: activeSub.branchId,
          scheduledDate: today,
          startTime: nowTime,
          endTime: new Date(Date.now() + 60 * 60 * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          actualCheckIn: nowTime,
          status: 'completed',
          notes: 'Biometric Turnstile Direct PT Check-in',
          createdBy: 'Biometric Scanner Gate',
          createdAt: new Date().toISOString(),
        });

        setScanMessage(
          `Verified: ${result.personName} • 1 PT Session consumed with Coach ${activeSub.trainerName} (${remaining} remaining)`
        );
      } else {
        setScanMessage(
          `Verified: ${result.personName} (${result.personType?.toUpperCase()}) • Turnstile Access Granted`
        );
      }

      setTimeout(() => {
        onScanSuccess();
        onClose();
      }, 1600);
    } else {
      setScanStatus('error');
      setScanMessage(result.error || 'Fingerprint match failed. Please reposition finger.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-gray-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-xl shadow-2xl border border-gray-200 w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gray-50">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
              <Fingerprint className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-gray-900 text-sm md:text-base">
                Hardware Biometric Check-In
              </h3>
              <p className="text-xs text-gray-500">{deviceStatus.model} • Bridge Active</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-4 text-xs">
          {/* Hardware visual indicator */}
          <div className="p-4 bg-gray-50 rounded-xl border border-gray-200 text-center space-y-2">
            <div
              className={`w-16 h-16 rounded-full mx-auto flex items-center justify-center transition-all ${
                scanStatus === 'scanning'
                  ? 'bg-indigo-50 border-2 border-indigo-400 text-indigo-600 animate-pulse'
                  : scanStatus === 'success'
                  ? 'bg-emerald-50 border-2 border-emerald-500 text-emerald-600'
                  : scanStatus === 'error'
                  ? 'bg-rose-50 border-2 border-rose-500 text-rose-600'
                  : 'bg-white border-2 border-gray-300 text-gray-600 shadow-sm'
              }`}
            >
              <Fingerprint className="w-9 h-9" />
            </div>

            <div className="flex items-center justify-center gap-1.5 text-xs text-emerald-600 font-semibold">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
              <span>USB Bridge Connected ({deviceStatus.port})</span>
            </div>

            {confidenceScore > 0 && scanStatus === 'success' && (
              <div className="text-[11px] font-mono text-emerald-700 font-bold">
                Confidence Match: {confidenceScore}%
              </div>
            )}
          </div>

          {scanMessage && (
            <div
              className={`p-3 rounded-lg text-xs font-semibold ${
                scanStatus === 'success'
                  ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                  : scanStatus === 'error'
                  ? 'bg-rose-50 text-rose-800 border border-rose-200'
                  : 'bg-indigo-50 text-indigo-800 border border-indigo-200'
              }`}
            >
              {scanMessage}
            </div>
          )}

          {/* Role selector */}
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => {
                setPersonType('trainee');
                setSelectedPersonId(trainees[0]?.id || '');
              }}
              className={`py-2 rounded-lg font-bold border transition-colors flex items-center justify-center gap-1.5 ${
                personType === 'trainee'
                  ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                  : 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100'
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              Trainee Member
            </button>

            <button
              type="button"
              onClick={() => {
                setPersonType('trainer');
                setSelectedPersonId(trainers[0]?.id || '');
              }}
              className={`py-2 rounded-lg font-bold border transition-colors flex items-center justify-center gap-1.5 ${
                personType === 'trainer'
                  ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                  : 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100'
              }`}
            >
              <Award className="w-3.5 h-3.5" />
              Trainer / Coach
            </button>
          </div>

          {/* Select member / trainer */}
          <div>
            <label className="block font-bold text-gray-700 mb-1">
              Select {personType === 'trainee' ? 'Trainee' : 'Trainer'} to Simulate Punch
            </label>
            <select
              value={selectedPersonId}
              onChange={(e) => setSelectedPersonId(e.target.value)}
              className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg text-xs font-semibold text-gray-800"
            >
              {personType === 'trainee'
                ? trainees.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.fullName} ({t.generalMembershipPlanName || 'Member'})
                    </option>
                  ))
                : trainers.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.fullName} (Coach - {t.branchId})
                    </option>
                  ))}
            </select>
          </div>

          {/* Mode Selection (Section 75 vs 76) */}
          {personType === 'trainee' && (
            <div className="space-y-1.5 pt-1">
              <label className="block font-bold text-gray-700">Check-in Intent (Section 75-76)</label>
              <div className="grid grid-cols-2 gap-2">
                <label
                  className={`p-2.5 rounded-lg border flex flex-col cursor-pointer transition-colors ${
                    punchMode === 'general_entry'
                      ? 'bg-blue-50 border-blue-300 text-blue-900'
                      : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  <div className="flex items-center gap-1.5 font-bold text-xs">
                    <input
                      type="radio"
                      name="punchMode"
                      value="general_entry"
                      checked={punchMode === 'general_entry'}
                      onChange={() => setPunchMode('general_entry')}
                      className="text-blue-600"
                    />
                    <span>General Gym Floor</span>
                  </div>
                  <span className="text-[10px] text-gray-500 mt-1">
                    Free gym floor workout. Does NOT consume PT sessions.
                  </span>
                </label>

                <label
                  className={`p-2.5 rounded-lg border flex flex-col cursor-pointer transition-colors ${
                    punchMode === 'pt_session'
                      ? 'bg-indigo-50 border-indigo-300 text-indigo-900'
                      : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  <div className="flex items-center gap-1.5 font-bold text-xs">
                    <input
                      type="radio"
                      name="punchMode"
                      value="pt_session"
                      checked={punchMode === 'pt_session'}
                      onChange={() => setPunchMode('pt_session')}
                      className="text-indigo-600"
                    />
                    <span>1-on-1 PT Session</span>
                  </div>
                  <span className="text-[10px] text-gray-500 mt-1">
                    {activeSub
                      ? `Consumes 1 session with Coach ${activeSub.trainerName}`
                      : 'No active PT subscription'}
                  </span>
                </label>
              </div>
            </div>
          )}

          {/* Trigger Button */}
          <div className="pt-2">
            <button
              type="button"
              onClick={handleScan}
              disabled={scanStatus === 'scanning'}
              className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-lg font-bold text-xs transition-colors shadow-xs flex items-center justify-center gap-2"
            >
              <Fingerprint className="w-4 h-4" />
              <span>
                {scanStatus === 'scanning' ? 'Scanning Fingerprint...' : 'Place Finger & Punch Attendance'}
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
