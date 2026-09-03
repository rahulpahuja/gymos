import React, { useState } from 'react';
import {
  Calendar,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  User,
  Plus,
  Filter,
  Check,
  RotateCcw,
} from 'lucide-react';
import { PTSession, PTSubscription, Trainer, Trainee, Branch, PTSessionStatus } from '../../types';
import { storageService } from '../../services/storageService';

interface PTSessionTrackerProps {
  sessions: PTSession[];
  subscriptions: PTSubscription[];
  trainers: Trainer[];
  trainees: Trainee[];
  branches: Branch[];
}

export const PTSessionTracker: React.FC<PTSessionTrackerProps> = ({
  sessions,
  subscriptions,
  trainers,
  trainees,
  branches,
}) => {
  const [selectedTrainerId, setSelectedTrainerId] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [isScheduleModalOpen, setIsScheduleModalOpen] = useState<boolean>(false);

  // Scheduling state
  const [subId, setSubId] = useState<string>(subscriptions[0]?.id || '');
  const [scheduledDate, setScheduledDate] = useState<string>(new Date().toISOString().substring(0, 10));
  const [startTime, setStartTime] = useState<string>('07:00 AM');
  const [endTime, setEndTime] = useState<string>('08:00 AM');
  const [notes, setNotes] = useState<string>('');

  // Status Metrics (Section 63)
  const totalSessions = sessions.length;
  const completed = sessions.filter((s) => s.status === 'completed').length;
  const scheduled = sessions.filter((s) => s.status === 'scheduled').length;
  const cancelled = sessions.filter((s) => s.status === 'cancelled').length;
  const noShow = sessions.filter((s) => s.status === 'no_show').length;

  const filteredSessions = sessions.filter((s) => {
    if (selectedTrainerId !== 'all' && s.trainerId !== selectedTrainerId) return false;
    if (selectedStatus !== 'all' && s.status !== selectedStatus) return false;
    return true;
  });

  const handleCompleteSession = (session: PTSession) => {
    const updated: PTSession = {
      ...session,
      status: 'completed',
      actualCheckIn: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      actualCheckOut: new Date(Date.now() + 60 * 60 * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };
    storageService.savePTSession(updated);
  };

  const handleStatusChange = (session: PTSession, newStatus: PTSessionStatus) => {
    const updated: PTSession = {
      ...session,
      status: newStatus,
    };
    storageService.savePTSession(updated);
  };

  const handleScheduleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const selectedSub = subscriptions.find((s) => s.id === subId);
    if (!selectedSub) return;

    const newSession: PTSession = {
      id: `ses-${Date.now()}`,
      subscriptionId: selectedSub.id,
      traineeId: selectedSub.traineeId,
      traineeName: selectedSub.traineeName,
      trainerId: selectedSub.trainerId,
      trainerName: selectedSub.trainerName,
      branchId: selectedSub.branchId,
      scheduledDate,
      startTime,
      endTime,
      status: 'scheduled',
      notes,
      createdBy: selectedSub.trainerName,
      createdAt: new Date().toISOString(),
    };

    storageService.savePTSession(newSession);
    setIsScheduleModalOpen(false);
    setNotes('');
  };

  return (
    <div className="space-y-5">
      {/* Metrics Banner (Section 63 Example) */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="text-[11px] text-slate-500 font-semibold uppercase">Total Tracked</div>
          <div className="text-xl font-black text-slate-900 mt-1">{totalSessions}</div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-emerald-100 bg-emerald-50/20 shadow-xs">
          <div className="text-[11px] text-emerald-700 font-semibold uppercase">Completed</div>
          <div className="text-xl font-black text-emerald-600 mt-1">{completed}</div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-blue-100 bg-blue-50/20 shadow-xs">
          <div className="text-[11px] text-blue-700 font-semibold uppercase">Upcoming</div>
          <div className="text-xl font-black text-blue-600 mt-1">{scheduled}</div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-amber-100 bg-amber-50/20 shadow-xs">
          <div className="text-[11px] text-amber-700 font-semibold uppercase">Cancelled</div>
          <div className="text-xl font-black text-amber-600 mt-1">{cancelled}</div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-rose-100 bg-rose-50/20 shadow-xs">
          <div className="text-[11px] text-rose-700 font-semibold uppercase">No Shows</div>
          <div className="text-xl font-black text-rose-600 mt-1">{noShow}</div>
        </div>
      </div>

      {/* Control Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2.5">
          <Filter className="w-4 h-4 text-slate-400" />
          <select
            value={selectedTrainerId}
            onChange={(e) => setSelectedTrainerId(e.target.value)}
            className="px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs font-semibold text-slate-700"
          >
            <option value="all">All Trainers</option>
            {trainers.map((t) => (
              <option key={t.id} value={t.id}>
                Trainer: {t.fullName}
              </option>
            ))}
          </select>

          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs font-semibold text-slate-700"
          >
            <option value="all">All Statuses</option>
            <option value="scheduled">Scheduled</option>
            <option value="completed">Completed</option>
            <option value="no_show">No Show</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>

        <button
          id="btn-schedule-session"
          onClick={() => setIsScheduleModalOpen(true)}
          className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-xs font-bold hover:bg-indigo-700 transition-colors flex items-center gap-1.5 shadow-xs"
        >
          <Plus className="w-4 h-4" />
          Schedule PT Session
        </button>
      </div>

      {/* Sessions Table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-700 font-semibold uppercase text-[10px] tracking-wider">
              <tr>
                <th className="px-4 py-3">Session ID & Date</th>
                <th className="px-4 py-3">Trainee</th>
                <th className="px-4 py-3">PT Trainer</th>
                <th className="px-4 py-3">Time Window</th>
                <th className="px-4 py-3">Check-In / Out</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Notes</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredSessions.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-slate-400">
                    No PT sessions match the selected filter.
                  </td>
                </tr>
              ) : (
                filteredSessions.map((ses) => (
                  <tr key={ses.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-4 py-3">
                      <div className="font-mono text-[11px] font-bold text-slate-800">{ses.id}</div>
                      <div className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5">
                        <Calendar className="w-3 h-3 text-indigo-500" />
                        {ses.scheduledDate}
                      </div>
                    </td>

                    <td className="px-4 py-3">
                      <div className="font-bold text-slate-900">{ses.traineeName}</div>
                      <div className="text-[10px] text-slate-400 font-mono">{ses.traineeId}</div>
                    </td>

                    <td className="px-4 py-3">
                      <div className="font-semibold text-slate-800">{ses.trainerName}</div>
                      <div className="text-[10px] text-indigo-600 font-medium">Coach</div>
                    </td>

                    <td className="px-4 py-3 font-mono text-[11px] text-slate-700">
                      {ses.startTime} - {ses.endTime}
                    </td>

                    <td className="px-4 py-3 font-mono text-[11px]">
                      {ses.actualCheckIn ? (
                        <span className="text-emerald-700 font-semibold">
                          {ses.actualCheckIn} - {ses.actualCheckOut || 'In progress'}
                        </span>
                      ) : (
                        <span className="text-slate-400 italic">Not checked in</span>
                      )}
                    </td>

                    <td className="px-4 py-3">
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full capitalize ${
                          ses.status === 'completed'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : ses.status === 'scheduled'
                            ? 'bg-blue-50 text-blue-700 border border-blue-200'
                            : ses.status === 'no_show'
                            ? 'bg-rose-50 text-rose-700 border border-rose-200'
                            : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        {ses.status.replace('_', ' ')}
                      </span>
                    </td>

                    <td className="px-4 py-3 max-w-[200px] truncate text-[11px] text-slate-500" title={ses.notes}>
                      {ses.notes || '-'}
                    </td>

                    <td className="px-4 py-3 text-right space-x-1">
                      {ses.status === 'scheduled' && (
                        <>
                          <button
                            onClick={() => handleCompleteSession(ses)}
                            className="px-2 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-[10px] font-bold transition-colors inline-flex items-center gap-1"
                            title="Complete session and deduct 1 from remaining"
                          >
                            <Check className="w-3 h-3" />
                            Check-In
                          </button>
                          <button
                            onClick={() => handleStatusChange(ses, 'no_show')}
                            className="px-2 py-1 bg-rose-100 hover:bg-rose-200 text-rose-700 rounded text-[10px] font-semibold transition-colors"
                            title="Mark No Show"
                          >
                            No Show
                          </button>
                        </>
                      )}

                      {ses.status === 'completed' && (
                        <span className="text-[10px] text-emerald-600 font-semibold inline-flex items-center gap-0.5">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          Logged
                        </span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Schedule Session Modal */}
      {isScheduleModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <h3 className="font-bold text-slate-900 text-base">Schedule 1-on-1 PT Session</h3>
              <button
                onClick={() => setIsScheduleModalOpen(false)}
                className="text-slate-400 hover:text-slate-700"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleScheduleSubmit} className="p-6 space-y-4 text-sm">
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">
                  Active PT Subscription
                </label>
                <select
                  value={subId}
                  onChange={(e) => setSubId(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-semibold"
                >
                  {subscriptions
                    .filter((s) => s.status === 'active')
                    .map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.traineeName} - {s.packageName} ({s.remainingSessions} left)
                      </option>
                    ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">Scheduled Date</label>
                <input
                  type="date"
                  required
                  value={scheduledDate}
                  onChange={(e) => setScheduledDate(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-semibold"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">Start Time</label>
                  <input
                    type="text"
                    required
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    placeholder="07:00 AM"
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">End Time</label>
                  <input
                    type="text"
                    required
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                    placeholder="08:00 AM"
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">Session Target / Workout Notes</label>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="e.g. Legs Hypertrophy & Squat Form Correction"
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs"
                />
              </div>

              <div className="pt-3 flex justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsScheduleModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 text-slate-700 rounded-lg text-xs font-semibold hover:bg-slate-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-indigo-600 text-white rounded-lg text-xs font-bold hover:bg-indigo-700 shadow-xs"
                >
                  Book Session
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
