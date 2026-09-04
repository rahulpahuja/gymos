export type UserRole = 'admin' | 'manager' | 'trainer' | 'trainee';
export type UserApprovalStatus = 'pending' | 'approved' | 'rejected';

/** Roles that see a personal self-service portal instead of the operations console. */
export const PORTAL_ROLES: UserRole[] = ['trainer', 'trainee'];

export interface UserAccount {
  id: string; // Firebase UID
  email: string;
  displayName: string;
  photoURL?: string;
  role: UserRole;
  branchId: string; // 'all' or specific branch ID
  status: UserApprovalStatus;
  requestedRole?: UserRole;
  requestedBranchId?: string;
  rejectionReason?: string;
  approvedBy?: string;
  approvedAt?: string;
  createdAt: string;
  lastLoginAt?: string;
  themePreference?: 'light' | 'dark';
  // Self-service portal linkage: ties a login to an operational record
  linkedTrainerId?: string;
  linkedTraineeId?: string;
}

export interface CurrentUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  branchId: string; // 'all' for admin or specific branch ID
  photoURL?: string;
  status?: UserApprovalStatus;
  themePreference?: 'light' | 'dark';
  linkedTrainerId?: string;
  linkedTraineeId?: string;
}

export interface Branch {
  id: string;
  name: string;
  code: string;
  city: string;
  state: string;
  address: string;
  phone: string;
  email: string;
  managerName: string;
  managerId: string;
  openingTime: string;
  closingTime: string;
  status: 'active' | 'inactive';
  gstNumber?: string;
  createdAt: string;
}

// -------------------------------------------------------------
// PT Domain Types (Sections 60 - 83)
// -------------------------------------------------------------

export type RevenueSplitModel = 'percentage' | 'fixed_trainer' | 'per_session' | 'hybrid';
export type RefundPolicy = 'proportional' | 'completed_sessions_only' | 'recalculate';
export type DiscountPolicy = 'net_price' | 'original_price';

export interface RevenueSharingRule {
  model: RevenueSplitModel;
  // For percentage split (e.g. 60/40, 70/30, 50/50)
  trainerPercent?: number;
  branchPercent?: number;
  // For fixed trainer amount (e.g. Trainer receives ₹10,000, Branch ₹10,000)
  fixedTrainerAmount?: number;
  // For per session commission (e.g. ₹600 per completed session)
  perSessionCommission?: number;
  // For hybrid (Base Trainer Amount + Percentage Commission)
  hybridBaseAmount?: number;
  hybridCommissionPercent?: number;
  // Discount policy (default: net_price)
  discountPolicy: DiscountPolicy;
  // Refund policy
  refundPolicy: RefundPolicy;
  description?: string;
}

export interface PTPackage {
  id: string;
  name: string;
  description: string;
  sessionsCount: number;
  durationDays: number;
  price: number;
  assignedBranchId: string; // 'all' or specific branch
  applicableTrainerIds: string[]; // ['all'] or list of trainer IDs
  revenueSharingRule: RevenueSharingRule;
  status: 'active' | 'inactive';
  createdAt: string;
  updatedAt: string;
}

export interface PTAssignmentHistoryItem {
  id: string;
  timestamp: string;
  action: 'assigned' | 'trainer_changed' | 'package_reassigned' | 'paused' | 'resumed' | 'cancelled' | 'renewed';
  previousTrainerId?: string;
  newTrainerId?: string;
  previousTrainerName?: string;
  newTrainerName?: string;
  reason?: string;
  performedBy: string;
}

export type PTSubscriptionStatus = 'active' | 'paused' | 'completed' | 'cancelled' | 'expired';

export interface PTSubscription {
  id: string;
  traineeId: string;
  traineeName: string;
  trainerId: string;
  trainerName: string;
  packageId: string;
  packageName: string;
  branchId: string;
  startDate: string;
  expiryDate: string;
  totalSessions: number;
  completedSessions: number;
  remainingSessions: number;
  cancelledSessions: number;
  noShowSessions: number;
  packagePrice: number;
  discount: number;
  netPrice: number;
  paidAmount: number;
  dueAmount: number;
  revenueRule: RevenueSharingRule;
  // Compatibility aliases
  price?: number;
  trainerShare?: number;
  revenueSharingRule?: RevenueSharingRule;
  // Calculated commission breakdown
  trainerCommissionTotal: number;
  trainerCommissionEarned: number; // based on completed sessions or full depending on rule
  trainerCommissionPaid: number;
  trainerCommissionOutstanding: number;
  branchShare: number;
  status: PTSubscriptionStatus;
  history: PTAssignmentHistoryItem[];
  createdAt: string;
  updatedAt: string;
}

export type PTSessionStatus = 'scheduled' | 'completed' | 'cancelled' | 'no_show' | 'rescheduled' | 'pending';

export interface PTSession {
  id: string;
  subscriptionId: string;
  traineeId: string;
  traineeName: string;
  trainerId: string;
  trainerName: string;
  branchId: string;
  scheduledDate: string;
  startTime: string;
  endTime: string;
  actualCheckIn?: string;
  actualCheckOut?: string;
  status: PTSessionStatus;
  notes?: string;
  createdBy: string;
  createdAt: string;
}

export interface PTRevenueSplitResult {
  ptGrossRevenue: number;
  discount: number;
  netPTRevenue: number;
  trainerShare: number;
  branchShare: number;
  calculationModel: RevenueSplitModel;
  formulaExplanation: string;
  perSessionRate?: number;
  auditBreakdown: {
    label: string;
    value: string | number;
  }[];
}

export interface PTCommissionSettlement {
  id: string;
  settlementNumber: string;
  trainerId: string;
  trainerName: string;
  branchId: string;
  amount: number;
  settlementDate: string;
  paymentMethod: 'cash' | 'upi' | 'bank_transfer' | 'cheque';
  referenceNumber: string;
  approvedBy: string;
  notes: string;
  createdAt: string;
}

// -------------------------------------------------------------
// General Gym Operations & Trainee/Trainer Models
// -------------------------------------------------------------

export interface MembershipPlan {
  id: string;
  name: string;
  durationMonths: number;
  price: number;
  discount: number;
  tax: number;
  finalAmount: number;
  description: string;
  branchId: string; // 'all' or specific
  status: 'active' | 'inactive';
}

export interface Trainee {
  id: string;
  fullName: string;
  photo?: string;
  phone: string;
  email: string;
  address: string;
  dob: string;
  gender: 'Male' | 'Female' | 'Other';
  emergencyContact: string;
  medicalNotes?: string;
  joiningDate: string;
  branchId: string;
  // General Membership info
  generalMembershipPlanId?: string;
  generalMembershipPlanName?: string;
  generalMembershipStartDate?: string;
  generalMembershipExpiryDate?: string;
  generalMembershipTrainerId?: string;
  generalMembershipTrainerName?: string;
  // Active PT subscription link
  activePTSubscriptionId?: string;
  activePTTrainerName?: string;
  activePTPackageName?: string;
  // Financial totals
  totalPaid: number;
  totalDue: number;
  status: 'active' | 'expired' | 'suspended' | 'cancelled' | 'inactive';
  referralSource?: string;
  notes?: string;
  createdAt: string;

  // Compatibility aliases
  membershipPlan?: string;
  membershipExpiry?: string;
  membershipDue?: number;
  ptDue?: number;
  hasPT?: boolean;
  joinDate?: string;
}

export type PaymentMethod = 'Cash' | 'UPI' | 'Card' | 'Bank Transfer' | 'cash' | 'upi' | 'credit_card' | 'bank_transfer' | 'cheque';
export type Expense = GymExpense;
export type Equipment = GymEquipment;
export type PTAssignmentHistory = PTAssignmentHistoryItem;

export interface Trainer {
  id: string;
  fullName: string;
  photo?: string;
  phone: string;
  email: string;
  address: string;
  dob: string;
  joiningDate: string;
  emergencyContact: string;
  qualifications: string;
  certifications: string[];
  specializations: string[];
  experienceYears: number;
  salaryType: 'monthly' | 'daily' | 'hourly';
  baseSalary: number;
  bankAccountDetails: string;
  branchId: string;
  status: 'active' | 'inactive' | 'on_leave' | 'terminated';
  // PT Financials
  ptRevenueGenerated: number;
  ptCommissionEarned: number;
  ptCommissionPaid: number;
  ptCommissionOutstanding: number;
  // General Salary & Advances
  salaryPayable: number;
  advancesOutstanding: number;
  totalSessionsConducted: number;
  createdAt: string;
}

export interface Enquiry {
  id: string;
  name: string;
  phone: string;
  email: string;
  age: number;
  gender: 'Male' | 'Female' | 'Other';
  interestedPlan: string;
  source: 'Walk-in' | 'Google' | 'Instagram' | 'Referral' | 'Website';
  assignedStaff: string;
  branchId: string;
  enquiryDate: string;
  followUpDate: string;
  status: 'new' | 'contacted' | 'follow_up' | 'trial' | 'converted' | 'not_interested' | 'lost';
  notes: string;
  expectedJoiningDate?: string;
  convertedTraineeId?: string;
  createdAt: string;
}

export interface PaymentAllocation {
  generalMembershipAmount: number; // e.g. ₹12,000
  ptAmount: number;                // e.g. ₹20,000
  otherAmount?: number;
}

export interface PaymentTransaction {
  id: string;
  receiptNumber: string;
  traineeId: string;
  traineeName: string;
  branchId: string;
  paymentDate: string;
  paymentMethod: 'Cash' | 'UPI' | 'Card' | 'Bank Transfer';
  referenceNumber: string;
  totalAmount: number;
  allocation: PaymentAllocation;
  membershipAmount?: number;
  ptAmount?: number;
  generalMembershipPlanId?: string;
  ptSubscriptionId?: string;
  discount: number;
  tax: number;
  previousDue: number;
  remainingDue: number;
  notes?: string;
  createdBy: string;
  isRefunded?: boolean;
  refundedAmount?: number;
  createdAt: string;
}

export interface ReceiptItem {
  description: string;
  category: 'General Membership' | 'Personal Training' | 'Registration' | 'Other';
  amount: number;
}

export interface Receipt {
  receiptNumber: string;
  transactionId: string;
  date: string;
  traineeId: string;
  traineeName: string;
  traineePhone: string;
  branchId: string;
  branchName: string;
  branchAddress: string;
  branchPhone: string;
  items: ReceiptItem[];
  totalAmount: number;
  paymentMethod: string;
  referenceNumber?: string;
  previousDue: number;
  currentPayment: number;
  remainingDue: number;
  authorizedSignature: string;
  terms: string;
}

export interface RefundRecord {
  id: string;
  paymentId: string;
  receiptNumber: string;
  traineeId: string;
  traineeName: string;
  branchId: string;
  refundType: 'pt' | 'general' | 'total';
  amount: number;
  reason: string;
  refundDate: string;
  paymentMethod: string;
  approvedBy: string;
  notes?: string;
  // PT Impact
  trainerCommissionAdjustment?: number;
  branchRevenueAdjustment?: number;
  policyApplied?: string;
  createdAt: string;
}

export interface GymExpense {
  id: string;
  branchId: string;
  category: 'Rent' | 'Electricity' | 'Water' | 'Internet' | 'Equipment' | 'Equipment Repair' | 'Maintenance' | 'Cleaning' | 'Salaries' | 'Marketing' | 'Software' | 'Utilities' | 'Taxes' | 'Office Supplies' | 'Other';
  vendor: string;
  amount: number;
  date: string;
  paymentMethod: string;
  referenceNumber?: string;
  description: string;
  equipmentId?: string;
  createdBy: string;
  createdAt: string;
}

export interface GymEquipment {
  id: string;
  name: string;
  category: string;
  brand: string;
  model: string;
  purchaseDate: string;
  purchaseCost: number;
  warrantyExpiry: string;
  vendor: string;
  branchId: string;
  condition: 'Excellent' | 'Good' | 'Fair' | 'Needs Repair';
  status: 'active' | 'under_maintenance' | 'damaged' | 'retired';
  lastMaintenanceDate?: string;
  nextMaintenanceDate?: string;
}

export interface AttendanceRecord {
  id: string;
  personId: string;
  personType: 'trainee' | 'trainer';
  personName: string;
  branchId: string;
  date: string; // YYYY-MM-DD
  checkInTime: string;
  checkOutTime?: string;
  status: 'present' | 'absent' | 'late' | 'leave';
  verificationMethod: 'fingerprint' | 'rfid' | 'qr' | 'manual';
  isPTSessionAttendance: boolean;
  ptSessionId?: string;
  deviceId?: string;
  notes?: string;
}

export interface TrainerSalaryRecord {
  id: string;
  trainerId: string;
  trainerName: string;
  branchId: string;
  salaryPeriod: string; // e.g. "August 2026"
  baseSalary: number;
  ptCommissionsEarned: number;
  bonus: number;
  deductions: number;
  advanceAdjustment: number;
  netPayable: number;
  amountPaid: number;
  remainingAmount: number;
  status: 'pending' | 'partially_paid' | 'paid';
  paymentDate?: string;
  paymentMethod?: string;
  referenceNumber?: string;
  notes?: string;
  createdBy: string;
  createdAt: string;
}

export interface TrainerAdvance {
  id: string;
  trainerId: string;
  trainerName: string;
  branchId: string;
  advanceAmount: number;
  date: string;
  reason: string;
  paymentMethod: string;
  referenceNumber?: string;
  amountAdjusted: number;
  remainingAdvance: number;
  status: 'outstanding' | 'partially_adjusted' | 'fully_adjusted';
  createdAt: string;
}

export interface AuditLog {
  id: string;
  timestamp: string;
  userName: string;
  userRole: string;
  action: string;
  entity: string;
  entityId: string;
  branchId: string;
  details: string;
}

export interface BiometricBridgeConfig {
  bridgeUrl: string;
  deviceModel: string;
  autoTurnstile: boolean;
}

export interface BiometricEnrollment {
  personId: string;
  personName: string;
  personType: 'trainee' | 'trainer';
  templateId: string;
  confidenceScore: number;
  enrolledAt: string;
}
