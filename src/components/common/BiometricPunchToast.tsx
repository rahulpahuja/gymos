import React, { useEffect, useRef, useState } from 'react';
import { Fingerprint, LogIn, LogOut } from 'lucide-react';
import { biometricBridge } from '../../services/biometricBridgeService';
import { storageService } from '../../services/storageService';
import { BiometricPunchEvent } from '../../types';

/**
 * Global listener for real punches coming off the physical ESSL terminal via
 * the biometric-bridge service. Mirrors the popup EasyBio used to show
 * (person ID, name, punch time) and records the attendance entry itself, so
 * this works everywhere in the app without any screen needing to be open.
 */
export const BiometricPunchToast: React.FC = () => {
  const [toast, setToast] = useState<BiometricPunchEvent | null>(null);
  const dismissTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    let unsubscribe: (() => void) | null = null;
    let cancelled = false;

    (async () => {
      const ok = await biometricBridge.connect();
      if (cancelled || !ok) return;
      unsubscribe = biometricBridge.subscribeLive((event) => {
        if (event.personId && event.personName) {
          storageService.recordAttendance({
            id: `att-live-${event.deviceUserId}-${event.timestamp}`,
            personId: event.personId,
            personName: event.personName,
            personType: event.personType === 'staff' ? 'trainer' : event.personType || 'trainee',
            branchId: 'branch-1',
            date: new Date(event.timestamp).toISOString().substring(0, 10),
            checkInTime: new Date(event.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            status: 'present',
            verificationMethod: 'fingerprint',
            isPTSessionAttendance: false,
            deviceId: event.deviceUserId,
          });
        }
        setToast(event);
        if (dismissTimer.current) clearTimeout(dismissTimer.current);
        dismissTimer.current = setTimeout(() => setToast(null), 6000);
      });
    })();

    return () => {
      cancelled = true;
      if (unsubscribe) unsubscribe();
      if (dismissTimer.current) clearTimeout(dismissTimer.current);
    };
  }, []);

  if (!toast) return null;

  const isCheckOut = toast.punch === 1; // ZK protocol: 0 = check-in, 1 = check-out
  const time = new Date(toast.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });

  return (
    <div className="fixed top-4 right-4 z-[100] animate-in fade-in slide-in-from-top-4 duration-200">
      <div className="bg-white rounded-xl shadow-2xl border border-gray-200 px-4 py-3 flex items-center gap-3 min-w-[280px]">
        <div
          className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
            isCheckOut ? 'bg-amber-50 text-amber-600' : 'bg-emerald-50 text-emerald-600'
          }`}
        >
          <Fingerprint className="w-5 h-5" />
        </div>
        <div className="text-xs flex-1">
          <div className="font-bold text-gray-900 text-sm">
            {toast.personName || `Device ID ${toast.deviceUserId}`}
          </div>
          <div className="text-gray-500 flex items-center gap-1 mt-0.5">
            {isCheckOut ? <LogOut className="w-3 h-3" /> : <LogIn className="w-3 h-3" />}
            <span className="font-semibold">{isCheckOut ? 'Checked out' : 'Checked in'}</span>
            <span>• {time}</span>
          </div>
          {toast.personId && (
            <div className="text-gray-400 font-mono text-[10px] mt-0.5">ID: {toast.personId}</div>
          )}
        </div>
      </div>
    </div>
  );
};
