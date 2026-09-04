import React, { useState, useEffect } from 'react';
import { Header } from './components/layout/Header';
import { Sidebar } from './components/layout/Sidebar';
import { PTHub } from './components/pt/PTHub';
import { AdminDashboard } from './components/dashboard/AdminDashboard';
import { ManagerDashboard } from './components/dashboard/ManagerDashboard';
import { TraineeList } from './components/trainees/TraineeList';
import { TrainerList } from './components/trainers/TrainerList';
import { PaymentLedgerView } from './components/payments/PaymentLedgerView';
import { PaymentModal } from './components/payments/PaymentModal';
import { ReceiptModal } from './components/payments/ReceiptModal';
import { AttendanceView } from './components/attendance/AttendanceView';
import { EnquiriesView } from './components/enquiries/EnquiriesView';
import { ExpensesView } from './components/expenses/ExpensesView';
import { CombinedRevenueReport } from './components/reports/CombinedRevenueReport';
import { AuditLogView } from './components/audit/AuditLogView';
import { SettingsView } from './components/settings/SettingsView';
import { PTCalculatorModal } from './components/pt/PTCalculatorModal';
import { PTCommissionSettlementModal } from './components/pt/PTCommissionSettlementModal';
import { QuickBiometricModal } from './components/attendance/QuickBiometricModal';
import { storageService } from './services/storageService';
import { firebaseAuthService } from './services/firebase';
import { firestoreSync } from './services/firestoreSync';
import { AuthScreen } from './components/auth/AuthScreen';
import { ApprovalPendingScreen } from './components/auth/ApprovalPendingScreen';
import { UserManagementView } from './components/users/UserManagementView';
import { TrainerPortal } from './components/portal/TrainerPortal';
import { TraineePortal } from './components/portal/TraineePortal';
import { LogOut } from 'lucide-react';
import {
  Trainee,
  Trainer,
  PTPackage,
  PTSubscription,
  PTSession,
  PaymentTransaction,
  AttendanceRecord,
  Receipt,
  AuditLog,
  Branch,
  Enquiry,
  GymExpense,
  GymEquipment,
  PTCommissionSettlement,
  UserAccount,
  CurrentUser,
  UserRole,
  PORTAL_ROLES,
} from './types';
import { scopeByBranch } from './utils/branchScope';
import { NavigationTab } from './components/layout/Sidebar';

export default function App() {
  const [currentRole, setCurrentRole] = useState<UserRole>('admin');
  const [currentBranchId, setCurrentBranchId] = useState<string>('all');
  const [activeTab, setActiveTab] = useState<NavigationTab>('pt_hub');
  const [theme, setTheme] = useState<'light' | 'dark'>(() => storageService.getThemePreference());

  // Global theme synchronization with DOM
  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [theme]);

  const handleToggleTheme = async (newTheme: 'light' | 'dark') => {
    setTheme(newTheme);
    storageService.setThemePreference(newTheme);
    if (currentUserAccount?.id) {
      try {
        await firebaseAuthService.updateUserTheme(currentUserAccount.id, newTheme);
      } catch (err) {
        console.warn('Could not sync theme to Firestore:', err);
      }
    }
  };

  // Firebase Auth State
  const [currentUserAccount, setCurrentUserAccount] = useState<UserAccount | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [isDemoMode, setIsDemoMode] = useState<boolean>(() => {
    return sessionStorage.getItem('fitos_demo_mode') === 'true';
  });
  const [pendingApprovalsCount, setPendingApprovalsCount] = useState<number>(0);

  // Reactive state from storageService
  const [branches, setBranches] = useState<Branch[]>([]);
  const [trainees, setTrainees] = useState<Trainee[]>([]);
  const [trainers, setTrainers] = useState<Trainer[]>([]);
  const [packages, setPackages] = useState<PTPackage[]>([]);
  const [subscriptions, setSubscriptions] = useState<PTSubscription[]>([]);
  const [sessions, setSessions] = useState<PTSession[]>([]);
  const [transactions, setTransactions] = useState<PaymentTransaction[]>([]);
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [enquiries, setEnquiries] = useState<Enquiry[]>([]);
  const [expenses, setExpenses] = useState<GymExpense[]>([]);
  const [equipment, setEquipment] = useState<GymEquipment[]>([]);
  const [settlements, setSettlements] = useState<PTCommissionSettlement[]>([]);

  // Modals
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [selectedReceipt, setSelectedReceipt] = useState<Receipt | null>(null);
  const [isCalculatorOpen, setIsCalculatorOpen] = useState(false);
  const [settlementTrainerId, setSettlementTrainerId] = useState<string | null>(null);
  const [isQuickScanOpen, setIsQuickScanOpen] = useState(false);

  const reloadData = () => {
    setBranches(storageService.getBranches());
    setTrainees(storageService.getTrainees());
    setTrainers(storageService.getTrainers());
    setPackages(storageService.getPTPackages());
    setSubscriptions(storageService.getPTSubscriptions());
    setSessions(storageService.getPTSessions());
    setTransactions(storageService.getPaymentTransactions());
    setAttendance(storageService.getAttendanceRecords());
    setAuditLogs(storageService.getAuditLogs());
    setEnquiries(storageService.getEnquiries());
    setExpenses(storageService.getExpenses());
    setEquipment(storageService.getEquipment());
    setSettlements(storageService.getPTCommissionSettlements());
  };

  useEffect(() => {
    reloadData();
    const unsubscribe = storageService.subscribe('*', () => {
      reloadData();
    });
    return () => unsubscribe();
  }, []);

  // Firebase Realtime Auth & User Profile Listeners
  useEffect(() => {
    let unsubUsers: (() => void) | null = null;

    const unsubAuth = firebaseAuthService.onAuthState((account) => {
      setCurrentUserAccount(account);
      setAuthLoading(false);

      if (account?.themePreference) {
        setTheme(account.themePreference);
        storageService.setThemePreference(account.themePreference);
      }

      if (account && account.status === 'approved') {
        // Initialize Firestore Realtime Bidirectional Sync
        firestoreSync.initRealtimeSync();

        setCurrentRole(account.role);
        if (account.branchId && account.branchId !== 'all') {
          setCurrentBranchId(account.branchId);
        }

        const activeUser: CurrentUser = {
          id: account.id,
          name: account.displayName,
          email: account.email,
          role: account.role,
          branchId: account.branchId || 'all',
          photoURL: account.photoURL,
        };
        storageService.setCurrentUser(activeUser);

        // Realtime listener for pending approvals badge (admins and branch managers)
        if ((account.role === 'admin' || account.role === 'manager') && !unsubUsers) {
          unsubUsers = firebaseAuthService.subscribeAllUsers((allUsers) => {
            const pendingCount = allUsers.filter((u) => u.status === 'pending').length;
            setPendingApprovalsCount(pendingCount);
          });
        }
      } else {
        if (unsubUsers) {
          unsubUsers();
          unsubUsers = null;
        }
        setPendingApprovalsCount(0);
      }
    });

    return () => {
      unsubAuth();
      if (unsubUsers) unsubUsers();
    };
  }, []);

  const handleSignOut = async () => {
    sessionStorage.removeItem('fitos_demo_mode');
    setIsDemoMode(false);
    setCurrentUserAccount(null);
    firestoreSync.stop();
    await firebaseAuthService.signOut();
  };

  const handlePaymentSuccess = (receipt: Receipt) => {
    setSelectedReceipt(receipt);
  };

  const handleConvertToTrainee = (enquiry: Enquiry) => {
    const newTrainee: Trainee = {
      id: `trainee-${Date.now()}`,
      fullName: enquiry.name,
      phone: enquiry.phone,
      email: enquiry.email || `${enquiry.name.toLowerCase().replace(/\s+/g, '.')}@gmail.com`,
      address: 'City Center, Main Road',
      dob: '1996-05-14',
      gender: 'Male',
      emergencyContact: '+91 98260 00000',
      joiningDate: new Date().toISOString().substring(0, 10),
      branchId: enquiry.branchId,
      status: 'active',
      generalMembershipPlanName: 'Quarterly Pro',
      generalMembershipExpiryDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().substring(0, 10),
      totalPaid: 0,
      totalDue: 12000,
      createdAt: new Date().toISOString().substring(0, 10),
    };
    storageService.saveTrainee(newTrainee);

    // Update enquiry status
    storageService.saveEnquiry({
      ...enquiry,
      status: 'converted',
      convertedTraineeId: newTrainee.id,
    });

    setActiveTab('trainees');
  };

  const activeBranch = branches.find((b) => b.id === currentBranchId) || branches[0] || {
    id: 'branch-1',
    name: 'Indore Central (HQ)',
    city: 'Indore',
    address: 'Plot 42, Vijay Nagar, AB Road',
    phone: '+91 731-4099211',
  };

  const effectiveCurrentUser: CurrentUser = currentUserAccount
    ? {
        id: currentUserAccount.id,
        name: currentUserAccount.displayName,
        email: currentUserAccount.email,
        role: currentRole,
        branchId: currentBranchId,
        photoURL: currentUserAccount.photoURL,
        linkedTrainerId: currentUserAccount.linkedTrainerId,
        linkedTraineeId: currentUserAccount.linkedTraineeId,
      }
    : storageService.getCurrentUser();

  const isPortalRole = PORTAL_ROLES.includes(currentRole);

  // Global branch scope: every data section is narrowed to the selected branch.
  // Portal roles (trainer / trainee) are always locked to their own branch.
  const scopeBranchId = isPortalRole
    ? currentUserAccount?.branchId || currentBranchId
    : currentBranchId;
  const scopedTrainees = scopeByBranch(trainees, scopeBranchId);
  const scopedTrainers = scopeByBranch(trainers, scopeBranchId);
  const scopedSubscriptions = scopeByBranch(subscriptions, scopeBranchId);
  const scopedSessions = scopeByBranch(sessions, scopeBranchId);
  const scopedTransactions = scopeByBranch(transactions, scopeBranchId);
  const scopedAttendance = scopeByBranch(attendance, scopeBranchId);
  const scopedEnquiries = scopeByBranch(enquiries, scopeBranchId);
  const scopedExpenses = scopeByBranch(expenses, scopeBranchId);
  const scopedEquipment = scopeByBranch(equipment, scopeBranchId);
  const scopedSettlements = scopeByBranch(settlements, scopeBranchId);
  const scopedAuditLogs = scopeByBranch(auditLogs, scopeBranchId);

  // Loading Screen
  if (authLoading && !isDemoMode) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center text-white p-6 selection:bg-indigo-500 selection:text-white">
        <div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-sm font-bold text-slate-300">Connecting to FitOS Pro & Firebase Cloud...</p>
      </div>
    );
  }

  // Google Sign-In Screen
  if (!currentUserAccount && !isDemoMode) {
    return (
      <AuthScreen
        branches={branches.length ? branches : storageService.getBranches()}
        onDemoLogin={(role) => {
          sessionStorage.setItem('fitos_demo_mode', 'true');
          setIsDemoMode(true);
          setCurrentRole(role);
          const demoUser: CurrentUser = {
            id: 'demo-admin',
            name: role === 'admin' ? 'Super Administrator' : 'Branch Manager',
            email: role === 'admin' ? 'admin@gymos.in' : 'manager@gymos.in',
            role,
            branchId: role === 'admin' ? 'all' : 'branch-1',
          };
          storageService.setCurrentUser(demoUser);
        }}
      />
    );
  }

  // Live Approval Pending Screen
  if (currentUserAccount && currentUserAccount.status !== 'approved' && !isDemoMode) {
    return (
      <ApprovalPendingScreen
        user={currentUserAccount}
        branches={branches.length ? branches : storageService.getBranches()}
        onRefresh={async () => {
          const fresh = await firebaseAuthService.getCurrentUserAccount();
          if (fresh) setCurrentUserAccount(fresh);
        }}
        onSignOut={handleSignOut}
      />
    );
  }

  // Self-service portal shell for trainer / trainee logins
  if (isPortalRole && !isDemoMode) {
    return (
      <div className="min-h-screen w-full bg-[#F3F4F6] dark:bg-slate-950 text-gray-900 dark:text-slate-100 font-sans antialiased transition-colors">
        <header className="h-16 bg-white dark:bg-slate-900 border-b border-gray-200 dark:border-slate-800 px-4 md:px-8 flex items-center justify-between sticky top-0 z-30">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center text-white font-bold">
              G
            </div>
            <div>
              <h1 className="text-base font-bold leading-tight">GymOS</h1>
              <p className="text-[11px] text-gray-500 dark:text-slate-400 capitalize">
                {currentRole} Self-Service Portal
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {effectiveCurrentUser.photoURL ? (
              <img
                src={effectiveCurrentUser.photoURL}
                alt={effectiveCurrentUser.name}
                className="w-8 h-8 rounded-full object-cover border border-gray-300 dark:border-slate-600"
              />
            ) : (
              <div className="w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center text-white text-xs font-bold">
                {effectiveCurrentUser.name?.substring(0, 2).toUpperCase() || 'U'}
              </div>
            )}
            <button
              onClick={handleSignOut}
              className="p-1.5 text-gray-400 hover:text-rose-600 dark:hover:text-rose-400 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
              title="Sign Out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </header>
        <main className="p-4 md:p-6 lg:p-7">
          <div className="max-w-6xl mx-auto">
            {currentRole === 'trainer' ? (
              <TrainerPortal
                currentUser={effectiveCurrentUser}
                trainers={trainers}
                branches={branches}
                sessions={sessions}
                subscriptions={subscriptions}
                settlements={settlements}
                attendance={attendance}
              />
            ) : (
              <TraineePortal
                currentUser={effectiveCurrentUser}
                trainees={trainees}
                branches={branches}
                transactions={transactions}
                subscriptions={subscriptions}
                sessions={sessions}
                attendance={attendance}
              />
            )}
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="flex h-screen w-full bg-[#F3F4F6] dark:bg-slate-950 text-gray-900 dark:text-slate-100 font-sans antialiased overflow-hidden transition-colors">
      {/* Sidebar */}
      <Sidebar
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        currentRole={currentRole}
        currentUser={effectiveCurrentUser}
        pendingApprovalsCount={pendingApprovalsCount}
        onOpenCalculator={() => setIsCalculatorOpen(true)}
        onSignOut={handleSignOut}
      />

      {/* Main Container */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden bg-[#F3F4F6] dark:bg-slate-950 transition-colors">
        {/* Top Header */}
        <Header
          currentRole={currentRole}
          onChangeRole={(role) => setCurrentRole(role)}
          currentUser={effectiveCurrentUser}
          branches={branches}
          currentBranchId={currentBranchId}
          onChangeBranch={(bId) => setCurrentBranchId(bId)}
          onOpenRecordPayment={() => setIsPaymentModalOpen(true)}
          onOpenCalculator={() => setIsCalculatorOpen(true)}
          onOpenQuickScan={() => setIsQuickScanOpen(true)}
          pendingApprovalsCount={pendingApprovalsCount}
          onOpenUsers={() => setActiveTab('users')}
          onSignOut={handleSignOut}
          currentTheme={theme}
          onToggleTheme={handleToggleTheme}
        />

        {/* Dynamic Main Body Content */}
        <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-7 bg-[#F3F4F6] dark:bg-slate-950 transition-colors">
          <div className="max-w-7xl mx-auto space-y-6">
            {/* Staff & User Approval Management */}
            {activeTab === 'users' && (
              <UserManagementView
                branches={branches}
                currentUser={effectiveCurrentUser}
                trainers={trainers}
                trainees={trainees}
              />
            )}
            {/* Dashboard View */}
            {activeTab === 'dashboard' && (
              <>
                {currentRole === 'admin' ? (
                  <AdminDashboard
                    trainees={scopedTrainees}
                    trainers={scopedTrainers}
                    subscriptions={scopedSubscriptions}
                    sessions={scopedSessions}
                    transactions={scopedTransactions}
                    branches={branches}
                    onOpenNewPayment={() => setIsPaymentModalOpen(true)}
                    onNavigateTab={setActiveTab}
                    onOpenCalculator={() => setIsCalculatorOpen(true)}
                  />
                ) : (
                  <ManagerDashboard
                    branch={activeBranch}
                    trainees={scopedTrainees}
                    trainers={scopedTrainers}
                    subscriptions={scopedSubscriptions}
                    sessions={scopedSessions}
                    transactions={scopedTransactions}
                    onOpenNewPayment={() => setIsPaymentModalOpen(true)}
                    onNavigateTab={setActiveTab}
                  />
                )}
              </>
            )}

            {/* Dedicated Personal Training Hub */}
            {activeTab === 'pt_hub' && (
              <PTHub
                branches={branches}
                trainers={scopedTrainers}
                trainees={scopedTrainees}
                packages={packages}
                subscriptions={scopedSubscriptions}
                sessions={scopedSessions}
                settlements={scopedSettlements}
                onOpenCalculator={() => setIsCalculatorOpen(true)}
                onOpenNewPayment={() => setIsPaymentModalOpen(true)}
                onOpenRecordPayment={() => setIsPaymentModalOpen(true)}
                onOpenSettlement={(trainerId) => setSettlementTrainerId(trainerId || null)}
              />
            )}

            {/* Trainees Directory with Section 78 PT Tab */}
            {activeTab === 'trainees' && (
              <TraineeList
                trainees={scopedTrainees}
                ptSubscriptions={scopedSubscriptions}
                branches={branches}
                onOpenRecordPayment={() => setIsPaymentModalOpen(true)}
              />
            )}

            {/* Trainers Directory with Section 79 PT Tab */}
            {activeTab === 'trainers' && (
              <TrainerList
                trainers={scopedTrainers}
                ptSubscriptions={scopedSubscriptions}
                branches={branches}
                onOpenSettlement={(trainerId) => setSettlementTrainerId(trainerId)}
              />
            )}

            {/* Financial Ledger & Receipts */}
            {activeTab === 'payments' && (
              <PaymentLedgerView
                transactions={scopedTransactions}
                branches={branches}
                onOpenNewPayment={() => setIsPaymentModalOpen(true)}
                onViewReceipt={(receipt) => setSelectedReceipt(receipt)}
              />
            )}

            {/* Biometrics & Attendance */}
            {activeTab === 'attendance' && (
              <AttendanceView
                attendanceRecords={scopedAttendance}
                trainees={scopedTrainees}
                trainers={scopedTrainers}
                branches={branches}
              />
            )}

            {/* Enquiries & Lead Pipeline */}
            {activeTab === 'enquiries' && (
              <EnquiriesView
                enquiries={scopedEnquiries}
                branches={branches}
                onConvertToTrainee={handleConvertToTrainee}
              />
            )}

            {/* Expenses & Equipment */}
            {activeTab === 'expenses' && (
              <ExpensesView
                expenses={scopedExpenses}
                equipment={scopedEquipment}
                branches={branches}
              />
            )}

            {/* Combined Revenue Audit (Section 73 & 74) */}
            {activeTab === 'reports' && (
              <CombinedRevenueReport
                transactions={scopedTransactions}
                subscriptions={scopedSubscriptions}
                trainers={scopedTrainers}
                branches={branches}
                packages={packages}
              />
            )}

            {/* Audit Logs */}
            {activeTab === 'audit' && <AuditLogView logs={scopedAuditLogs} />}

            {/* Settings */}
            {activeTab === 'settings' && (
              <SettingsView
                branches={branches}
                trainees={scopedTrainees}
                trainers={scopedTrainers}
                currentTheme={theme}
                onToggleTheme={handleToggleTheme}
                currentUser={currentUserAccount}
                isAdmin={currentRole === 'admin'}
              />
            )}
          </div>
        </main>
      </div>

      {/* Global Modals */}

      {/* Segregated Payment Modal (Section 60 & 72) */}
      <PaymentModal
        isOpen={isPaymentModalOpen}
        onClose={() => setIsPaymentModalOpen(false)}
        trainees={scopedTrainees}
        packages={packages}
        branches={branches}
        onPaymentSuccess={handlePaymentSuccess}
      />

      {/* Official Thermal / Standard Receipt Modal (Section 72) */}
      <ReceiptModal
        receipt={selectedReceipt}
        onClose={() => setSelectedReceipt(null)}
      />

      {/* Revenue Sharing & Refund Math Sandbox (Section 62 & 70) */}
      <PTCalculatorModal
        isOpen={isCalculatorOpen}
        onClose={() => setIsCalculatorOpen(false)}
        packages={packages}
      />

      {/* Commission Settlement Modal (Section 68) */}
      <PTCommissionSettlementModal
        isOpen={settlementTrainerId !== null}
        onClose={() => setSettlementTrainerId(null)}
        trainers={scopedTrainers}
        preselectedTrainerId={settlementTrainerId || undefined}
        onSettlementCreated={() => {
          setSettlementTrainerId(null);
          reloadData();
        }}
      />

      {/* Hardware Biometric Check-In Modal (Sections 21, 22, 75, 76) */}
      <QuickBiometricModal
        isOpen={isQuickScanOpen}
        onClose={() => setIsQuickScanOpen(false)}
        trainees={scopedTrainees}
        trainers={scopedTrainers}
        subscriptions={scopedSubscriptions}
        onScanSuccess={reloadData}
      />
    </div>
  );
}
