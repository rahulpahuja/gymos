import React, { useState } from 'react';
import {
  Dumbbell,
  LayoutDashboard,
  Tag,
  Users,
  CalendarCheck,
  Award,
  Calculator,
  HandCoins,
} from 'lucide-react';
import {
  PTSubscription,
  PTSession,
  PTPackage,
  Trainer,
  Trainee,
  Branch,
  PTCommissionSettlement,
  CurrentUser,
} from '../../types';
import { PTDashboardOverview } from './PTDashboardOverview';
import { PTPackageManager } from './PTPackageManager';
import { PTSubscriptionsView } from './PTSubscriptionsView';
import { PTSessionTracker } from './PTSessionTracker';
import { PTTrainerEarningsDashboard } from './PTTrainerEarningsDashboard';
import { PTCalculatorModal } from './PTCalculatorModal';
import { PTCommissionSettlementModal } from './PTCommissionSettlementModal';
import { storageService } from '../../services/storageService';

export type PTTab = 'overview' | 'packages' | 'subscriptions' | 'sessions' | 'earnings';

interface PTHubProps {
  subscriptions: PTSubscription[];
  sessions: PTSession[];
  packages: PTPackage[];
  trainers: Trainer[];
  trainees: Trainee[];
  branches: Branch[];
  settlements?: PTCommissionSettlement[];
  currentUser?: CurrentUser;
  onOpenRecordPayment?: () => void;
  onOpenNewPayment?: () => void;
  onOpenCalculator?: () => void;
  onOpenSettlement?: (trainerId?: string) => void;
}

export const PTHub: React.FC<PTHubProps> = ({
  subscriptions,
  sessions,
  packages,
  trainers,
  trainees,
  branches,
  settlements,
  currentUser,
  onOpenRecordPayment,
  onOpenNewPayment,
  onOpenCalculator,
  onOpenSettlement,
}) => {
  const [activeTab, setActiveTab] = useState<PTTab>('overview');
  const [isCalculatorOpen, setIsCalculatorOpen] = useState<boolean>(false);
  const [isSettlementOpen, setIsSettlementOpen] = useState<boolean>(false);
  const [selectedTrainerForSettlement, setSelectedTrainerForSettlement] = useState<string>('');

  const effectiveSettlements = settlements || storageService.getPTCommissionSettlements();
  const effectiveUser = currentUser || storageService.getCurrentUser();
  const handlePayment = onOpenRecordPayment || onOpenNewPayment || (() => {});

  const handleOpenSettlement = (trainerId?: string) => {
    if (onOpenSettlement) {
      onOpenSettlement(trainerId);
    } else {
      setSelectedTrainerForSettlement(trainerId || trainers[0]?.id || '');
      setIsSettlementOpen(true);
    }
  };

  const handleOpenCalculator = () => {
    if (onOpenCalculator) {
      onOpenCalculator();
    } else {
      setIsCalculatorOpen(true);
    }
  };

  return (
    <div className="space-y-6">
      {/* Tab Navigation Header */}
      <div className="bg-white border border-slate-200 rounded-xl p-2 shadow-xs flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-1">
          <button
            id="pt-tab-overview"
            onClick={() => setActiveTab('overview')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-bold transition-all ${
              activeTab === 'overview'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
            }`}
          >
            <LayoutDashboard className="w-4 h-4" />
            <span>PT Dashboard</span>
          </button>

          <button
            id="pt-tab-packages"
            onClick={() => setActiveTab('packages')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-bold transition-all ${
              activeTab === 'packages'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
            }`}
          >
            <Tag className="w-4 h-4" />
            <span>Packages ({packages.length})</span>
          </button>

          <button
            id="pt-tab-subscriptions"
            onClick={() => setActiveTab('subscriptions')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-bold transition-all ${
              activeTab === 'subscriptions'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Assignments & Clients ({subscriptions.length})</span>
          </button>

          <button
            id="pt-tab-sessions"
            onClick={() => setActiveTab('sessions')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-bold transition-all ${
              activeTab === 'sessions'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
            }`}
          >
            <CalendarCheck className="w-4 h-4" />
            <span>Sessions Tracker ({sessions.length})</span>
          </button>

          <button
            id="pt-tab-earnings"
            onClick={() => setActiveTab('earnings')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-bold transition-all ${
              activeTab === 'earnings'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
            }`}
          >
            <Award className="w-4 h-4" />
            <span>Trainer Earnings & Payouts</span>
          </button>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleOpenCalculator}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-300 bg-slate-50 text-slate-700 text-xs font-semibold hover:bg-slate-100 transition-colors"
            title="Interactive revenue splitting and refund simulator"
          >
            <Calculator className="w-3.5 h-3.5 text-indigo-600" />
            <span className="hidden sm:inline">Split Sandbox</span>
          </button>

          <button
            onClick={() => handleOpenSettlement()}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-700 transition-colors shadow-xs"
            title="Settle trainer commission disbursement"
          >
            <HandCoins className="w-3.5 h-3.5" />
            <span>Settle Commission</span>
          </button>
        </div>
      </div>

      {/* Active Tab View */}
      {activeTab === 'overview' && (
        <PTDashboardOverview
          subscriptions={subscriptions}
          sessions={sessions}
          trainers={trainers}
          packages={packages}
          branches={branches}
          onOpenCalculator={handleOpenCalculator}
          onOpenSettlement={() => handleOpenSettlement()}
          onNavigateTab={(tab) => setActiveTab(tab)}
        />
      )}

      {activeTab === 'packages' && (
        <PTPackageManager
          packages={packages}
          branches={branches}
          trainers={trainers}
          onOpenCalculator={handleOpenCalculator}
        />
      )}

      {activeTab === 'subscriptions' && (
        <PTSubscriptionsView
          subscriptions={subscriptions}
          trainers={trainers}
          trainees={trainees}
          packages={packages}
          branches={branches}
          onOpenRecordPayment={handlePayment}
        />
      )}

      {activeTab === 'sessions' && (
        <PTSessionTracker
          sessions={sessions}
          subscriptions={subscriptions}
          trainers={trainers}
          trainees={trainees}
          branches={branches}
        />
      )}

      {activeTab === 'earnings' && (
        <PTTrainerEarningsDashboard
          trainers={trainers}
          subscriptions={subscriptions}
          sessions={sessions}
          settlements={effectiveSettlements}
          branches={branches}
          onOpenSettlement={(id) => handleOpenSettlement(id)}
        />
      )}

      {/* Modals */}
      <PTCalculatorModal
        isOpen={isCalculatorOpen}
        onClose={() => setIsCalculatorOpen(false)}
        packages={packages}
      />

      <PTCommissionSettlementModal
        isOpen={isSettlementOpen}
        onClose={() => setIsSettlementOpen(false)}
        trainers={trainers}
        currentUser={effectiveUser}
        selectedTrainerId={selectedTrainerForSettlement}
      />
    </div>
  );
};
