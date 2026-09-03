import React, { useState } from 'react';
import {
  CalendarCheck,
  Fingerprint,
  Users,
  Award,
  CheckCircle2,
  Clock,
  Dumbbell,
  ShieldCheck,
  AlertCircle,
  Download,
  Plus,
  LogOut,
  Sparkles,
} from 'lucide-react';
import { AttendanceRecord, Trainee, Trainer, Branch } from '../../types';
import { storageService } from '../../services/storageService';
import { biometricBridge } from '../../services/biometricBridgeService';

interface AttendanceViewProps {
  attendanceRecords: AttendanceRecord[];
  trainees: Trainee[];
  trainers: Trainer[];
  branches: Branch[];
}

export const AttendanceView: React.FC<AttendanceViewProps> = ({
  attendanceRecords,
  trainees,
  trainers,
  branches,
}) => {
  const [activeTab, setActiveTab] = useState<'trainees' | 'trainers'>('trainees');
  const [selectedBranchId, setSelectedBranchId] = useState<string>('all');
  const [isScanModalOpen, setIsScanModalOpen] = useState<boolean>(false);
  const [isManualModalOpen, setIsManualModalOpen] = useState<boolean>(false);
  const [scanStatus, setScanStatus] = useState<string>('idle');
  const [scanMessage, setScanMessage] = useState<string>('');

  // Manual Check-in Form State
  const [manualPersonType, setManualPersonType] = useState<'trainee' | 'trainer'>('trainee');
  const [manualPersonId, setManualPersonId] = useState<string>(trainees[0]?.id || '');
  const [manualMethod, setManualMethod] = useState<'manual' | 'rfid' | 'qr_code'>('manual');
  const [manualNotes, setManualNotes] = useState<string>('');

  const today = new Date().toISOString().substring(0, 10);

  const filteredRecords = attendanceRecords.filter((rec) => {
    if (rec.personType !== (activeTab === 'trainees' ? 'trainee' : 'trainer')) return false;
    if (selectedBranchId !== 'all' && rec.branchId !== selectedBranchId) return false;
    return true;
  });

  const todayRecords = attendanceRecords.filter((r) => r.date === today);
  const presentCount = todayRecords.length;
  const onPremisesCount = todayRecords.filter((r) => !r.checkOutTime).length;
  const ptPunchesToday = todayRecords.filter((r) => r.isPTSessionAttendance).length;

  const handleSimulateScan = async (type: 'trainee' | 'trainer', personId?: string) => {
    setScanStatus('scanning');
    setScanMessage('Scanning fingerprint on SecuGen Hamster Pro 20 USB Bridge...');

    let personObj: any = null;
    if (personId) {
      personObj =
        type === 'trainee'
          ? trainees.find((t) => t.id === personId)
          : trainers.find((t) => t.id === personId);
    } else {
      personObj = type === 'trainee' ? trainees[0] : trainers[0];
    }

    const result = await biometricBridge.scanFingerprint(
      personObj ? { id: personObj.id, name: personObj.fullName, type } : undefined
    );

    if (result.success && result.personId && result.personName) {
      setScanStatus('success');
      setScanMessage(
        `Verified: ${result.personName} (${result.personType?.toUpperCase()}) • Match Score ${result.confidenceScore}%`
      );

      const newRec: AttendanceRecord = {
        id: `att-${Date.now()}`,
        personId: result.personId,
        personName: result.personName,
        personType: result.personType || type,
        branchId: 'branch-1',
        date: today,
        checkInTime: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        verificationMethod: 'fingerprint',
        status: 'present',
        isPTSessionAttendance: false,
        deviceId: 'SecuGen-Hamster-Pro-20',
      };
      storageService.recordAttendance(newRec);

      setTimeout(() => {
        setIsScanModalOpen(false);
        setScanStatus('idle');
        setScanMessage('');
      }, 1500);
    } else {
      setScanStatus('error');
      setScanMessage(result.error || 'Biometric scan failed. Try again.');
    }
  };

  const handleManualCheckIn = (e: React.FormEvent) => {
    e.preventDefault();
    const person =
      manualPersonType === 'trainee'
        ? trainees.find((t) => t.id === manualPersonId)
        : trainers.find((t) => t.id === manualPersonId);

    if (!person) return;

    const newRec: AttendanceRecord = {
      id: `att-${Date.now()}`,
      personId: person.id,
      personName: person.fullName,
      personType: manualPersonType,
      branchId: person.branchId || 'branch-1',
      date: today,
      checkInTime: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      verificationMethod: manualMethod,
      status: 'present',
      isPTSessionAttendance: false,
      deviceId: 'Desk-Reception-Console',
    };

    storageService.recordAttendance(newRec);
    setIsManualModalOpen(false);
    setManualNotes('');
  };

  const handleCheckOut = (recordId: string) => {
    const records = storageService.getAttendanceRecords();
    const updated = records.map((r) => {
      if (r.id === recordId) {
        return {
          ...r,
          checkOutTime: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        };
      }
      return r;
    });
    localStorage.setItem('gymos_attendance_v1', JSON.stringify(updated));
    window.location.reload();
  };

  const handleExportCSV = () => {
    let csv = 'ID,Date,PersonName,Role,CheckIn,CheckOut,Method,Branch,PTSession\n';
    filteredRecords.forEach((r) => {
      csv += `${r.id},${r.date},"${r.personName}",${r.personType},${r.checkInTime || ''},${r.checkOutTime || ''},${r.verificationMethod},${r.branchId},${r.isPTSessionAttendance ? 'Yes' : 'No'}\n`;
    });
    const encoded = encodeURI('data:text/csv;charset=utf-8,' + csv);
    const link = document.createElement('a');
    link.href = encoded;
    link.download = `gymos-attendance-${Date.now()}.csv`;
    link.click();
  };

  return (
    <div className="space-y-5">
      {/* Top Banner */}
      <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
            <CalendarCheck className="w-5 h-5 text-indigo-600" />
            Attendance & Hardware Biometrics (Sections 21, 22, 75, 76)
          </h2>
          <p className="text-xs text-gray-500 mt-0.5">
            Turnstile check-ins, SecuGen Hamster Pro 20 optical fingerprint verification, and PT workout attendance
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={handleExportCSV}
            className="px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5"
          >
            <Download className="w-4 h-4" />
            Export CSV
          </button>
          <button
            onClick={() => setIsManualModalOpen(true)}
            className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg text-xs font-bold transition-colors flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" />
            Manual Check-In
          </button>
          <button
            id="btn-open-scanner"
            onClick={() => setIsScanModalOpen(true)}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition-colors shadow-xs flex items-center gap-1.5"
          >
            <Fingerprint className="w-4 h-4" />
            Simulate Biometric Scan
          </button>
        </div>
      </div>

      {/* Bento Grid Stats Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        {/* Dark Bento Tile: Present Today */}
        <div className="bg-[#111827] text-white p-4 rounded-xl border border-gray-900 shadow-sm flex flex-col justify-between">
          <div>
            <div className="text-[11px] font-bold text-gray-400 uppercase tracking-wide">
              Check-Ins Today
            </div>
            <div className="text-2xl font-black text-white mt-1">{presentCount}</div>
          </div>
          <div className="text-[10px] text-gray-400 mt-2 border-t border-gray-800 pt-1.5 flex items-center justify-between">
            <span>Floor Admissions</span>
            <span className="text-emerald-400 font-mono font-bold">100% Synced</span>
          </div>
        </div>

        {/* Currently On Premises */}
        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
          <div className="text-[11px] font-bold text-blue-700 uppercase">
            Currently In Gym
          </div>
          <div className="text-2xl font-black text-blue-600 mt-1">{onPremisesCount}</div>
          <div className="text-[10px] text-gray-400 mt-1">Active users on gym floor</div>
        </div>

        {/* 1-on-1 PT Sessions Consumed */}
        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
          <div className="text-[11px] font-bold text-indigo-700 uppercase">
            PT Workouts Punched
          </div>
          <div className="text-2xl font-black text-indigo-600 mt-1">{ptPunchesToday}</div>
          <div className="text-[10px] text-gray-400 mt-1">
            Deducted from active PT packages
          </div>
        </div>

        {/* Hardware Status */}
        <div className="bg-white p-4 rounded-xl border border-emerald-200 bg-emerald-50/20 shadow-sm">
          <div className="text-[11px] font-bold text-emerald-700 uppercase flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
            <span>Biometric Bridge Live</span>
          </div>
          <div className="text-sm font-bold text-gray-900 mt-1.5 font-mono">
            SecuGen Hamster Pro 20
          </div>
          <div className="text-[10px] text-gray-500 mt-0.5">
            Optical USB Sensor • WS Port 8088
          </div>
        </div>
      </div>

      {/* Distinction Banner (Sections 75-76) */}
      <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-4 grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
        <div className="flex items-start gap-2.5">
          <div className="p-1.5 rounded-lg bg-blue-100 text-blue-800 shrink-0 mt-0.5">
            <ShieldCheck className="w-4 h-4" />
          </div>
          <div>
            <div className="font-bold text-indigo-950">General Gym Access (Section 75)</div>
            <div className="text-indigo-800 text-[11px] mt-0.5">
              Turnstile / biometric swipe grants entrance to the gym floor.{' '}
              <strong>Does not consume PT package sessions</strong>.
            </div>
          </div>
        </div>

        <div className="flex items-start gap-2.5">
          <div className="p-1.5 rounded-lg bg-indigo-100 text-indigo-800 shrink-0 mt-0.5">
            <Dumbbell className="w-4 h-4" />
          </div>
          <div>
            <div className="font-bold text-indigo-950">1-on-1 PT Session Check-In (Section 76)</div>
            <div className="text-indigo-800 text-[11px] mt-0.5">
              Conducted through the PT Session Tracker or Biometric Modal.{' '}
              <strong>Consumes 1 session</strong> from trainee's active package and credits coach commission.
            </div>
          </div>
        </div>
      </div>

      {/* Tab & Filter Bar */}
      <div className="bg-white p-3 rounded-xl border border-gray-200 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab('trainees')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-colors flex items-center gap-1.5 ${
              activeTab === 'trainees'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            Trainee Check-Ins ({attendanceRecords.filter((r) => r.personType === 'trainee').length})
          </button>
          <button
            onClick={() => setActiveTab('trainers')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-colors flex items-center gap-1.5 ${
              activeTab === 'trainers'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            <Award className="w-3.5 h-3.5" />
            Trainer / Staff Log ({attendanceRecords.filter((r) => r.personType === 'trainer').length})
          </button>
        </div>

        <select
          value={selectedBranchId}
          onChange={(e) => setSelectedBranchId(e.target.value)}
          className="px-3 py-1.5 bg-gray-50 border border-gray-300 rounded-lg text-xs font-semibold text-gray-700"
        >
          <option value="all">All Branches</option>
          {branches.map((b) => (
            <option key={b.id} value={b.id}>
              {b.name}
            </option>
          ))}
        </select>
      </div>

      {/* Attendance Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-gray-600">
            <thead className="bg-gray-50 border-b border-gray-200 text-gray-700 font-semibold uppercase text-[10px] tracking-wider">
              <tr>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Person Name</th>
                <th className="px-4 py-3">Role Type</th>
                <th className="px-4 py-3">Check-In Time</th>
                <th className="px-4 py-3">Check-Out Time</th>
                <th className="px-4 py-3">Hardware Verification</th>
                <th className="px-4 py-3">Category</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredRecords.map((rec) => (
                <tr key={rec.id} className="hover:bg-gray-50/80 transition-colors">
                  <td className="px-4 py-3 font-mono text-gray-800">{rec.date}</td>
                  <td className="px-4 py-3 font-bold text-gray-900">{rec.personName}</td>
                  <td className="px-4 py-3 capitalize text-gray-700">{rec.personType}</td>
                  <td className="px-4 py-3 font-mono font-bold text-emerald-700">
                    {rec.checkInTime}
                  </td>
                  <td className="px-4 py-3 font-mono text-gray-500">
                    {rec.checkOutTime ? (
                      rec.checkOutTime
                    ) : (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                        On Premises
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200">
                      <Fingerprint className="w-3 h-3 text-emerald-600" />
                      {rec.verificationMethod === 'fingerprint'
                        ? 'SecuGen Biometric USB'
                        : rec.verificationMethod.toUpperCase()}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {rec.isPTSessionAttendance ? (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">
                        1-on-1 PT Session
                      </span>
                    ) : (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-gray-100 text-gray-700 border border-gray-200">
                        Gym Floor Entry
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {!rec.checkOutTime && (
                      <button
                        onClick={() => handleCheckOut(rec.id)}
                        className="px-2 py-1 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded text-[11px] font-semibold transition-colors inline-flex items-center gap-1"
                        title="Punch check-out timestamp"
                      >
                        <LogOut className="w-3 h-3" />
                        Check Out
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Biometric Scan Simulator Modal (Sections 21-22) */}
      {isScanModalOpen && (
        <div className="fixed inset-0 z-50 bg-gray-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl border border-gray-200 w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gray-50">
              <div className="flex items-center gap-2">
                <Fingerprint className="w-5 h-5 text-emerald-600" />
                <h3 className="font-bold text-gray-900 text-base">
                  USB Biometric Fingerprint Bridge
                </h3>
              </div>
              <button
                onClick={() => setIsScanModalOpen(false)}
                className="text-gray-400 hover:text-gray-700"
              >
                ✕
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs">
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
                  <Fingerprint className="w-8 h-8" />
                </div>
                <div className="text-gray-500">
                  Target device: SecuGen Hamster Pro 20 (Simulated Bridge Active)
                </div>
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

              <div className="space-y-2">
                <div className="font-bold text-gray-700">Quick Scan as:</div>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => handleSimulateScan('trainee')}
                    disabled={scanStatus === 'scanning'}
                    className="p-3 bg-indigo-50 hover:bg-indigo-100 text-indigo-900 border border-indigo-200 rounded-xl text-left font-bold transition-colors disabled:opacity-50"
                  >
                    <Users className="w-4 h-4 mb-1 text-indigo-600" />
                    Member Trainee
                    <div className="text-[10px] text-indigo-700 font-normal mt-0.5">
                      {trainees[0]?.fullName || 'Rahul Sharma'}
                    </div>
                  </button>

                  <button
                    onClick={() => handleSimulateScan('trainer')}
                    disabled={scanStatus === 'scanning'}
                    className="p-3 bg-emerald-50 hover:bg-emerald-100 text-emerald-900 border border-emerald-200 rounded-xl text-left font-bold transition-colors disabled:opacity-50"
                  >
                    <Award className="w-4 h-4 mb-1 text-emerald-600" />
                    Head Coach
                    <div className="text-[10px] text-emerald-700 font-normal mt-0.5">
                      {trainers[0]?.fullName || 'Vikram Singh'}
                    </div>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Manual Check-in Modal */}
      {isManualModalOpen && (
        <div className="fixed inset-0 z-50 bg-gray-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl border border-gray-200 w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gray-50">
              <h3 className="font-bold text-gray-900 text-base">Desk Manual Check-In</h3>
              <button
                onClick={() => setIsManualModalOpen(false)}
                className="text-gray-400 hover:text-gray-700"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleManualCheckIn} className="p-6 space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setManualPersonType('trainee');
                    setManualPersonId(trainees[0]?.id || '');
                  }}
                  className={`py-2 rounded-lg font-bold border ${
                    manualPersonType === 'trainee'
                      ? 'bg-indigo-600 text-white border-indigo-600'
                      : 'bg-gray-50 text-gray-700 border-gray-200'
                  }`}
                >
                  Trainee Member
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setManualPersonType('trainer');
                    setManualPersonId(trainers[0]?.id || '');
                  }}
                  className={`py-2 rounded-lg font-bold border ${
                    manualPersonType === 'trainer'
                      ? 'bg-indigo-600 text-white border-indigo-600'
                      : 'bg-gray-50 text-gray-700 border-gray-200'
                  }`}
                >
                  Trainer / Coach
                </button>
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1">
                  Select {manualPersonType === 'trainee' ? 'Trainee' : 'Trainer'}
                </label>
                <select
                  value={manualPersonId}
                  onChange={(e) => setManualPersonId(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg font-semibold text-gray-800"
                >
                  {manualPersonType === 'trainee'
                    ? trainees.map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.fullName} ({t.phone})
                        </option>
                      ))
                    : trainers.map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.fullName} (Coach)
                        </option>
                      ))}
                </select>
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1">Verification Reason</label>
                <select
                  value={manualMethod}
                  onChange={(e) => setManualMethod(e.target.value as any)}
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg font-semibold text-gray-800"
                >
                  <option value="manual">Manual Override (Fingerprint sensor failed / soiled)</option>
                  <option value="rfid">RFID Proximity Card Swipe</option>
                  <option value="qr_code">Mobile App QR Code Scan</option>
                </select>
              </div>

              <div className="pt-2 flex justify-end gap-2 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setIsManualModalOpen(false)}
                  className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg font-semibold hover:bg-gray-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-indigo-600 text-white rounded-lg font-bold hover:bg-indigo-700 shadow-xs"
                >
                  Authorize Entry
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
