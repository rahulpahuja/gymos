/**
 * Repository & Persistence Service
 * Implements Repository Pattern (Section 37) so data source can easily be swapped
 * with Firestore, PostgreSQL, or Supabase.
 * Keeps data locally synchronized in browser localStorage with robust initial seed data.
 */

import {
  Branch,
  CurrentUser,
  Trainee,
  Trainer,
  PTPackage,
  PTSubscription,
  PTSession,
  PTCommissionSettlement,
  PaymentTransaction,
  GymExpense,
  GymEquipment,
  AttendanceRecord,
  TrainerSalaryRecord,
  TrainerAdvance,
  AuditLog,
  Enquiry,
  MembershipPlan,
  RefundRecord,
} from '../types';

const STORAGE_KEYS = {
  BRANCHES: 'gymos_branches_v1',
  CURRENT_USER: 'gymos_current_user_v1',
  TRAINEES: 'gymos_trainees_v1',
  TRAINERS: 'gymos_trainers_v1',
  PT_PACKAGES: 'gymos_pt_packages_v1',
  PT_SUBSCRIPTIONS: 'gymos_pt_subscriptions_v1',
  PT_SESSIONS: 'gymos_pt_sessions_v1',
  PT_SETTLEMENTS: 'gymos_pt_settlements_v1',
  PAYMENTS: 'gymos_payments_v1',
  REFUNDS: 'gymos_refunds_v1',
  EXPENSES: 'gymos_expenses_v1',
  EQUIPMENT: 'gymos_equipment_v1',
  ATTENDANCE: 'gymos_attendance_v1',
  TRAINER_SALARIES: 'gymos_trainer_salaries_v1',
  TRAINER_ADVANCES: 'gymos_trainer_advances_v1',
  ENQUIRIES: 'gymos_enquiries_v1',
  MEMBERSHIP_PLANS: 'gymos_membership_plans_v1',
  AUDIT_LOGS: 'gymos_audit_logs_v1',
};

// Default seed data
const SEED_BRANCHES: Branch[] = [
  {
    id: 'branch-1',
    name: 'Indore Central (Headquarters)',
    code: 'IND-01',
    city: 'Indore',
    state: 'Madhya Pradesh',
    address: '402, Race Course Road, New Palasia, Indore 452001',
    phone: '+91 731 498 7200',
    email: 'indore@gymos-fitness.com',
    managerName: 'Rajesh Sharma',
    managerId: 'mgr-1',
    openingTime: '05:30 AM',
    closingTime: '10:30 PM',
    status: 'active',
    gstNumber: '23AAAAA0000A1Z5',
    createdAt: '2025-01-10',
  },
  {
    id: 'branch-2',
    name: 'Bhopal South (Arera Hills)',
    code: 'BHP-02',
    city: 'Bhopal',
    state: 'Madhya Pradesh',
    address: 'Plot 18, Commercial Zone, Arera Colony, Bhopal 462016',
    phone: '+91 755 422 1900',
    email: 'bhopal@gymos-fitness.com',
    managerName: 'Meera Nair',
    managerId: 'mgr-2',
    openingTime: '06:00 AM',
    closingTime: '10:00 PM',
    status: 'active',
    gstNumber: '23BBBBB1111B2Z4',
    createdAt: '2025-06-15',
  },
  {
    id: 'branch-3',
    name: 'Pune West (Baner High Street)',
    code: 'PUN-03',
    city: 'Pune',
    state: 'Maharashtra',
    address: 'Level 2, Apex Tech Park, Baner, Pune 411045',
    phone: '+91 20 6711 4400',
    email: 'pune@gymos-fitness.com',
    managerName: 'Sunil Deshmukh',
    managerId: 'mgr-3',
    openingTime: '05:00 AM',
    closingTime: '11:00 PM',
    status: 'active',
    gstNumber: '27CCCCC2222C3Z3',
    createdAt: '2025-11-01',
  },
];

const SEED_MEMBERSHIP_PLANS: MembershipPlan[] = [
  {
    id: 'plan-monthly',
    name: 'Monthly General Gym',
    durationMonths: 1,
    price: 2500,
    discount: 0,
    tax: 450,
    finalAmount: 2950,
    description: 'Full cardio & strength access for 30 days',
    branchId: 'all',
    status: 'active',
  },
  {
    id: 'plan-quarterly',
    name: 'Quarterly General Gym',
    durationMonths: 3,
    price: 6500,
    discount: 500,
    tax: 1080,
    finalAmount: 7080,
    description: '3 months full fitness club access',
    branchId: 'all',
    status: 'active',
  },
  {
    id: 'plan-half-yearly',
    name: 'Half-Yearly Fitness Pass',
    durationMonths: 6,
    price: 11000,
    discount: 1000,
    tax: 1800,
    finalAmount: 11800,
    description: '6 months access with steam bath and locker',
    branchId: 'all',
    status: 'active',
  },
  {
    id: 'plan-annual',
    name: 'Annual General Membership',
    durationMonths: 12,
    price: 12000,
    discount: 0,
    tax: 0,
    finalAmount: 12000,
    description: '1 full year unmetered general gym floor access',
    branchId: 'all',
    status: 'active',
  },
];

const SEED_PT_PACKAGES: PTPackage[] = [
  {
    id: 'pt-pkg-basic',
    name: 'PT Basic',
    description: 'Foundation 1-on-1 personal coaching with customized posture & routine correction',
    sessionsCount: 10,
    durationDays: 30,
    price: 8000,
    assignedBranchId: 'all',
    applicableTrainerIds: ['all'],
    revenueSharingRule: {
      model: 'percentage',
      trainerPercent: 60,
      branchPercent: 40,
      discountPolicy: 'net_price',
      refundPolicy: 'proportional',
      description: 'Standard 60% Trainer / 40% Branch split',
    },
    status: 'active',
    createdAt: '2026-01-01',
    updatedAt: '2026-08-01',
  },
  {
    id: 'pt-pkg-standard',
    name: 'PT Standard',
    description: '20 intensive 1-on-1 sessions with nutrition planning and bi-weekly body composition assessments',
    sessionsCount: 20,
    durationDays: 60,
    price: 15000,
    assignedBranchId: 'all',
    applicableTrainerIds: ['all'],
    revenueSharingRule: {
      model: 'percentage',
      trainerPercent: 60,
      branchPercent: 40,
      discountPolicy: 'net_price',
      refundPolicy: 'proportional',
      description: 'Standard 60% Trainer / 40% Branch split',
    },
    status: 'active',
    createdAt: '2026-01-01',
    updatedAt: '2026-08-01',
  },
  {
    id: 'pt-pkg-premium',
    name: 'PT Premium Transformation',
    description: 'Comprehensive 30 sessions master conditioning with dedicated senior coach and recovery protocol',
    sessionsCount: 30,
    durationDays: 90,
    price: 25000,
    assignedBranchId: 'all',
    applicableTrainerIds: ['all'],
    revenueSharingRule: {
      model: 'percentage',
      trainerPercent: 70,
      branchPercent: 30,
      discountPolicy: 'net_price',
      refundPolicy: 'proportional',
      description: 'Senior Coach 70% Trainer / 30% Branch incentive',
    },
    status: 'active',
    createdAt: '2026-01-01',
    updatedAt: '2026-08-01',
  },
  {
    id: 'pt-pkg-elite-fixed',
    name: 'PT Pro Custom Agreement',
    description: 'Fixed trainer remuneration model for celebrity/physique athlete preparation',
    sessionsCount: 20,
    durationDays: 60,
    price: 20000,
    assignedBranchId: 'all',
    applicableTrainerIds: ['all'],
    revenueSharingRule: {
      model: 'fixed_trainer',
      fixedTrainerAmount: 12000,
      discountPolicy: 'net_price',
      refundPolicy: 'completed_sessions_only',
      description: 'Fixed ₹12,000 to Trainer, remaining ₹8,000 retained by Branch',
    },
    status: 'active',
    createdAt: '2026-02-15',
    updatedAt: '2026-08-15',
  },
  {
    id: 'pt-pkg-per-session',
    name: 'PT Flexi (Per Session Commission)',
    description: 'Pay-as-you-go commission model credited per completed check-in',
    sessionsCount: 20,
    durationDays: 60,
    price: 20000,
    assignedBranchId: 'all',
    applicableTrainerIds: ['all'],
    revenueSharingRule: {
      model: 'per_session',
      perSessionCommission: 600,
      discountPolicy: 'net_price',
      refundPolicy: 'completed_sessions_only',
      description: 'Trainer receives ₹600 per completed session (20 × ₹600 = ₹12,000)',
    },
    status: 'active',
    createdAt: '2026-03-01',
    updatedAt: '2026-08-20',
  },
];

const SEED_TRAINERS: Trainer[] = [
  {
    id: 'trainer-1',
    fullName: 'Amit Verma',
    phone: '+91 98260 12345',
    email: 'amit.verma@gymos.in',
    address: '74, Saket Nagar, Indore',
    dob: '1993-04-14',
    joiningDate: '2024-02-01',
    emergencyContact: 'Sunita Verma (Wife) +91 98260 54321',
    qualifications: 'K11 Certified Master Trainer, ACE Certified',
    certifications: ['ACE Personal Trainer', 'K11 Sports Nutrition', 'CPR/AED Certified'],
    specializations: ['Hypertrophy & Strength', 'Body Recomposition', 'Contest Prep'],
    experienceYears: 7,
    salaryType: 'monthly',
    baseSalary: 25000,
    bankAccountDetails: 'HDFC Bank - A/C 50100234891100 (IFSC: HDFC0000290)',
    branchId: 'branch-1',
    status: 'active',
    ptRevenueGenerated: 120000,
    ptCommissionEarned: 72000,
    ptCommissionPaid: 60000,
    ptCommissionOutstanding: 12000,
    salaryPayable: 25000,
    advancesOutstanding: 0,
    totalSessionsConducted: 85,
    createdAt: '2024-02-01',
  },
  {
    id: 'trainer-2',
    fullName: 'Priya Rao',
    phone: '+91 94250 88765',
    email: 'priya.rao@gymos.in',
    address: '12, Old Palasia, Indore',
    dob: '1996-08-22',
    joiningDate: '2024-07-15',
    emergencyContact: 'Venkatesh Rao (Father) +91 94250 11223',
    qualifications: 'Gold\'s Gym Fitness Institute Diploma, Clinical Nutritionist',
    certifications: ['GGFI Certified Trainer', 'Sports Yoga Specialist'],
    specializations: ['Fat Loss', 'Functional HIIT', 'Post-Partum Rehab'],
    experienceYears: 5,
    salaryType: 'monthly',
    baseSalary: 22000,
    bankAccountDetails: 'ICICI Bank - A/C 004101567823 (IFSC: ICIC0000041)',
    branchId: 'branch-1',
    status: 'active',
    ptRevenueGenerated: 95000,
    ptCommissionEarned: 57000,
    ptCommissionPaid: 45000,
    ptCommissionOutstanding: 12000,
    salaryPayable: 22000,
    advancesOutstanding: 5000,
    totalSessionsConducted: 64,
    createdAt: '2024-07-15',
  },
  {
    id: 'trainer-3',
    fullName: 'Karan Singh',
    phone: '+91 97550 43210',
    email: 'karan.singh@gymos.in',
    address: 'E-3/44, Arera Colony, Bhopal',
    dob: '1992-11-05',
    joiningDate: '2025-01-10',
    emergencyContact: 'Gurpreet Singh (Brother) +91 97550 99887',
    qualifications: 'NSCA CSCS, B.P.Ed Physical Education',
    certifications: ['NSCA CSCS', 'CrossFit Level 1 Coach'],
    specializations: ['Athletic Performance', 'Olympic Weightlifting', 'Mobility'],
    experienceYears: 8,
    salaryType: 'monthly',
    baseSalary: 28000,
    bankAccountDetails: 'State Bank of India - A/C 20456711902 (IFSC: SBIN0001053)',
    branchId: 'branch-2',
    status: 'active',
    ptRevenueGenerated: 80000,
    ptCommissionEarned: 48000,
    ptCommissionPaid: 40000,
    ptCommissionOutstanding: 8000,
    salaryPayable: 28000,
    advancesOutstanding: 10000,
    totalSessionsConducted: 52,
    createdAt: '2025-01-10',
  },
  {
    id: 'trainer-4',
    fullName: 'Sneha Patil',
    phone: '+91 98220 76543',
    email: 'sneha.patil@gymos.in',
    address: 'Fl. 402, High Street Towers, Baner, Pune',
    dob: '1995-02-18',
    joiningDate: '2025-05-01',
    emergencyContact: 'Ashok Patil (Father) +91 98220 33445',
    qualifications: 'Pilates Comprehensive Certified, B.Sc Sports Science',
    certifications: ['Balanced Body Pilates', 'TRX Suspension Master'],
    specializations: ['Pilates', 'Postural Restoration', 'Core Stability'],
    experienceYears: 6,
    salaryType: 'monthly',
    baseSalary: 26000,
    bankAccountDetails: 'Axis Bank - A/C 91401004561239 (IFSC: UTIB0000123)',
    branchId: 'branch-3',
    status: 'active',
    ptRevenueGenerated: 65000,
    ptCommissionEarned: 39000,
    ptCommissionPaid: 30000,
    ptCommissionOutstanding: 9000,
    salaryPayable: 26000,
    advancesOutstanding: 0,
    totalSessionsConducted: 40,
    createdAt: '2025-05-01',
  },
];

const SEED_TRAINEES: Trainee[] = [
  {
    id: 'trainee-1',
    fullName: 'Rahul Malhotra',
    phone: '+91 98930 11223',
    email: 'rahul.malhotra@gmail.com',
    address: 'Flat 301, Silver Crest, New Palasia, Indore',
    dob: '1990-06-12',
    gender: 'Male',
    emergencyContact: 'Sunil Malhotra (Father) +91 98930 44556',
    medicalNotes: 'Mild lower lumbar tightness; cleared by orthopedic',
    joiningDate: '2026-09-01',
    branchId: 'branch-1',
    generalMembershipPlanId: 'plan-annual',
    generalMembershipPlanName: 'Annual General Membership',
    generalMembershipStartDate: '2026-09-01',
    generalMembershipExpiryDate: '2027-08-31',
    generalMembershipTrainerId: 'trainer-1',
    generalMembershipTrainerName: 'Amit Verma',
    activePTSubscriptionId: 'pt-sub-1',
    activePTTrainerName: 'Amit Verma',
    activePTPackageName: 'PT Standard (20 Sessions)',
    totalPaid: 27000, // ₹12,000 GM + ₹15,000 PT (out of ₹20,000 PT package)
    totalDue: 5000,   // ₹5,000 PT balance remaining
    status: 'active',
    referralSource: 'Friend Referral',
    notes: 'Primary executive client. Trains morning 7:00 AM slot.',
    createdAt: '2026-09-01',
  },
  {
    id: 'trainee-2',
    fullName: 'Ananya Iyer',
    phone: '+91 98270 99887',
    email: 'ananya.iyer@outlook.com',
    address: 'B-12, Gulmohar Enclave, Indore',
    dob: '1997-03-25',
    gender: 'Female',
    emergencyContact: 'Karthik Iyer (Spouse) +91 98270 55443',
    medicalNotes: 'No pre-existing conditions',
    joiningDate: '2026-08-10',
    branchId: 'branch-1',
    generalMembershipPlanId: 'plan-quarterly',
    generalMembershipPlanName: 'Quarterly General Gym',
    generalMembershipStartDate: '2026-08-10',
    generalMembershipExpiryDate: '2026-11-09',
    activePTSubscriptionId: 'pt-sub-2',
    activePTTrainerName: 'Priya Rao',
    activePTPackageName: 'PT Basic (10 Sessions)',
    totalPaid: 14500, // ₹6,500 GM + ₹8,000 PT
    totalDue: 0,
    status: 'active',
    referralSource: 'Instagram Campaign',
    createdAt: '2026-08-10',
  },
  {
    id: 'trainee-3',
    fullName: 'Vikramaditya Joshi',
    phone: '+91 97520 33445',
    email: 'vikram.joshi@techcorp.in',
    address: 'Bungalow 4, Char Imli, Bhopal',
    dob: '1988-10-18',
    gender: 'Male',
    emergencyContact: 'Deepika Joshi (Wife) +91 97520 66778',
    joiningDate: '2026-07-01',
    branchId: 'branch-2',
    generalMembershipPlanId: 'plan-annual',
    generalMembershipPlanName: 'Annual General Membership',
    generalMembershipStartDate: '2026-07-01',
    generalMembershipExpiryDate: '2027-06-30',
    activePTSubscriptionId: 'pt-sub-3',
    activePTTrainerName: 'Karan Singh',
    activePTPackageName: 'PT Premium Transformation (30 Sessions)',
    totalPaid: 37000, // ₹12,000 GM + ₹25,000 PT
    totalDue: 0,
    status: 'active',
    referralSource: 'Corporate Tie-up',
    createdAt: '2026-07-01',
  },
  {
    id: 'trainee-4',
    fullName: 'Rohan Kapoor',
    phone: '+91 98261 44556',
    email: 'rohan.k@gmail.com',
    address: '45, Scheme 54, Vijay Nagar, Indore',
    dob: '2001-09-15',
    gender: 'Male',
    emergencyContact: 'Rakesh Kapoor (Father) +91 98261 11223',
    joiningDate: '2026-08-01',
    branchId: 'branch-1',
    generalMembershipPlanId: 'plan-half-yearly',
    generalMembershipPlanName: 'Half-Yearly Fitness Pass',
    generalMembershipStartDate: '2026-08-01',
    generalMembershipExpiryDate: '2027-01-31',
    totalPaid: 11000,
    totalDue: 0,
    status: 'active',
    referralSource: 'Walk-in',
    notes: 'General gym access only; does not utilize personal training.',
    createdAt: '2026-08-01',
  },
  {
    id: 'trainee-5',
    fullName: 'Dr. Radhika Sen',
    phone: '+91 98221 88990',
    email: 'radhika.sen@apollo.org',
    address: 'Tower A, Pancard Club Road, Baner, Pune',
    dob: '1985-12-04',
    gender: 'Female',
    emergencyContact: 'Arjun Sen (Spouse) +91 98221 22334',
    joiningDate: '2026-08-15',
    branchId: 'branch-3',
    // PT Only trainee (no general membership required - Section 60)
    activePTSubscriptionId: 'pt-sub-4',
    activePTTrainerName: 'Sneha Patil',
    activePTPackageName: 'PT Standard (20 Sessions)',
    totalPaid: 15000,
    totalDue: 0,
    status: 'active',
    referralSource: 'Physiotherapist Referral',
    notes: 'Exclusive 1-on-1 Pilates client. No general floor access needed.',
    createdAt: '2026-08-15',
  },
];

const SEED_PT_SUBSCRIPTIONS: PTSubscription[] = [
  {
    id: 'pt-sub-1',
    traineeId: 'trainee-1',
    traineeName: 'Rahul Malhotra',
    trainerId: 'trainer-1',
    trainerName: 'Amit Verma',
    packageId: 'pt-pkg-standard',
    packageName: 'PT Standard (20 Sessions)',
    branchId: 'branch-1',
    startDate: '2026-09-01',
    expiryDate: '2026-10-30',
    totalSessions: 20,
    completedSessions: 12,
    remainingSessions: 8,
    cancelledSessions: 1,
    noShowSessions: 1,
    packagePrice: 20000,
    discount: 0,
    netPrice: 20000,
    paidAmount: 15000,
    dueAmount: 5000,
    revenueRule: {
      model: 'percentage',
      trainerPercent: 60,
      branchPercent: 40,
      discountPolicy: 'net_price',
      refundPolicy: 'proportional',
      description: '60% Trainer / 40% Branch',
    },
    trainerCommissionTotal: 12000,
    trainerCommissionEarned: 12000,
    trainerCommissionPaid: 8000,
    trainerCommissionOutstanding: 4000,
    branchShare: 8000,
    status: 'active',
    history: [
      {
        id: 'hist-1',
        timestamp: '2026-09-01 10:00',
        action: 'assigned',
        newTrainerId: 'trainer-1',
        newTrainerName: 'Amit Verma',
        reason: 'Initial enrollment for 20 sessions target conditioning',
        performedBy: 'Rajesh Sharma (Manager)',
      },
    ],
    createdAt: '2026-09-01',
    updatedAt: '2026-09-03',
  },
  {
    id: 'pt-sub-2',
    traineeId: 'trainee-2',
    traineeName: 'Ananya Iyer',
    trainerId: 'trainer-2',
    trainerName: 'Priya Rao',
    packageId: 'pt-pkg-basic',
    packageName: 'PT Basic (10 Sessions)',
    branchId: 'branch-1',
    startDate: '2026-08-10',
    expiryDate: '2026-09-10',
    totalSessions: 10,
    completedSessions: 7,
    remainingSessions: 3,
    cancelledSessions: 0,
    noShowSessions: 0,
    packagePrice: 8000,
    discount: 0,
    netPrice: 8000,
    paidAmount: 8000,
    dueAmount: 0,
    revenueRule: {
      model: 'percentage',
      trainerPercent: 60,
      branchPercent: 40,
      discountPolicy: 'net_price',
      refundPolicy: 'proportional',
    },
    trainerCommissionTotal: 4800,
    trainerCommissionEarned: 4800,
    trainerCommissionPaid: 4800,
    trainerCommissionOutstanding: 0,
    branchShare: 3200,
    status: 'active',
    history: [
      {
        id: 'hist-2',
        timestamp: '2026-08-10 11:30',
        action: 'assigned',
        newTrainerId: 'trainer-2',
        newTrainerName: 'Priya Rao',
        reason: 'Fat loss foundation package',
        performedBy: 'Rajesh Sharma (Manager)',
      },
    ],
    createdAt: '2026-08-10',
    updatedAt: '2026-09-02',
  },
  {
    id: 'pt-sub-3',
    traineeId: 'trainee-3',
    traineeName: 'Vikramaditya Joshi',
    trainerId: 'trainer-3',
    trainerName: 'Karan Singh',
    packageId: 'pt-pkg-premium',
    packageName: 'PT Premium Transformation (30 Sessions)',
    branchId: 'branch-2',
    startDate: '2026-07-01',
    expiryDate: '2026-09-30',
    totalSessions: 30,
    completedSessions: 18,
    remainingSessions: 12,
    cancelledSessions: 2,
    noShowSessions: 0,
    packagePrice: 25000,
    discount: 0,
    netPrice: 25000,
    paidAmount: 25000,
    dueAmount: 0,
    revenueRule: {
      model: 'percentage',
      trainerPercent: 70,
      branchPercent: 30,
      discountPolicy: 'net_price',
      refundPolicy: 'proportional',
    },
    trainerCommissionTotal: 17500,
    trainerCommissionEarned: 17500,
    trainerCommissionPaid: 15000,
    trainerCommissionOutstanding: 2500,
    branchShare: 7500,
    status: 'active',
    history: [
      {
        id: 'hist-3',
        timestamp: '2026-07-01 09:15',
        action: 'assigned',
        newTrainerId: 'trainer-3',
        newTrainerName: 'Karan Singh',
        reason: 'Elite strength conditioning',
        performedBy: 'Meera Nair (Manager)',
      },
    ],
    createdAt: '2026-07-01',
    updatedAt: '2026-09-02',
  },
  {
    id: 'pt-sub-4',
    traineeId: 'trainee-5',
    traineeName: 'Dr. Radhika Sen',
    trainerId: 'trainer-4',
    trainerName: 'Sneha Patil',
    packageId: 'pt-pkg-standard',
    packageName: 'PT Standard (20 Sessions)',
    branchId: 'branch-3',
    startDate: '2026-08-15',
    expiryDate: '2026-10-15',
    totalSessions: 20,
    completedSessions: 8,
    remainingSessions: 12,
    cancelledSessions: 0,
    noShowSessions: 0,
    packagePrice: 15000,
    discount: 0,
    netPrice: 15000,
    paidAmount: 15000,
    dueAmount: 0,
    revenueRule: {
      model: 'percentage',
      trainerPercent: 60,
      branchPercent: 40,
      discountPolicy: 'net_price',
      refundPolicy: 'proportional',
    },
    trainerCommissionTotal: 9000,
    trainerCommissionEarned: 9000,
    trainerCommissionPaid: 5000,
    trainerCommissionOutstanding: 4000,
    branchShare: 6000,
    status: 'active',
    history: [
      {
        id: 'hist-4',
        timestamp: '2026-08-15 14:00',
        action: 'assigned',
        newTrainerId: 'trainer-4',
        newTrainerName: 'Sneha Patil',
        reason: 'Postural Pilates sessions',
        performedBy: 'Sunil Deshmukh (Manager)',
      },
    ],
    createdAt: '2026-08-15',
    updatedAt: '2026-09-01',
  },
];

const SEED_PT_SESSIONS: PTSession[] = [
  // Rahul's sessions (12 completed, 1 cancelled, 1 no-show, remaining scheduled)
  {
    id: 'ses-1',
    subscriptionId: 'pt-sub-1',
    traineeId: 'trainee-1',
    traineeName: 'Rahul Malhotra',
    trainerId: 'trainer-1',
    trainerName: 'Amit Verma',
    branchId: 'branch-1',
    scheduledDate: '2026-09-01',
    startTime: '07:00 AM',
    endTime: '08:00 AM',
    actualCheckIn: '06:58 AM',
    actualCheckOut: '08:02 AM',
    status: 'completed',
    notes: 'Chest & Triceps progressive overload. Form excellent.',
    createdBy: 'Amit Verma',
    createdAt: '2026-09-01',
  },
  {
    id: 'ses-2',
    subscriptionId: 'pt-sub-1',
    traineeId: 'trainee-1',
    traineeName: 'Rahul Malhotra',
    trainerId: 'trainer-1',
    trainerName: 'Amit Verma',
    branchId: 'branch-1',
    scheduledDate: '2026-09-02',
    startTime: '07:00 AM',
    endTime: '08:00 AM',
    actualCheckIn: '07:02 AM',
    actualCheckOut: '08:05 AM',
    status: 'completed',
    notes: 'Back & Biceps. Deadlift technique checked.',
    createdBy: 'Amit Verma',
    createdAt: '2026-09-02',
  },
  {
    id: 'ses-3',
    subscriptionId: 'pt-sub-1',
    traineeId: 'trainee-1',
    traineeName: 'Rahul Malhotra',
    trainerId: 'trainer-1',
    trainerName: 'Amit Verma',
    branchId: 'branch-1',
    scheduledDate: '2026-09-03',
    startTime: '07:00 AM',
    endTime: '08:00 AM',
    actualCheckIn: '07:00 AM',
    actualCheckOut: '08:00 AM',
    status: 'completed',
    notes: 'Leg day - Barbell Squats 80kg × 4 sets.',
    createdBy: 'Amit Verma',
    createdAt: '2026-09-03',
  },
  {
    id: 'ses-4',
    subscriptionId: 'pt-sub-1',
    traineeId: 'trainee-1',
    traineeName: 'Rahul Malhotra',
    trainerId: 'trainer-1',
    trainerName: 'Amit Verma',
    branchId: 'branch-1',
    scheduledDate: '2026-09-04',
    startTime: '07:00 AM',
    endTime: '08:00 AM',
    status: 'scheduled',
    notes: 'Shoulders & Core routine scheduled',
    createdBy: 'Amit Verma',
    createdAt: '2026-09-03',
  },
  {
    id: 'ses-5',
    subscriptionId: 'pt-sub-1',
    traineeId: 'trainee-1',
    traineeName: 'Rahul Malhotra',
    trainerId: 'trainer-1',
    trainerName: 'Amit Verma',
    branchId: 'branch-1',
    scheduledDate: '2026-09-05',
    startTime: '07:00 AM',
    endTime: '08:00 AM',
    status: 'scheduled',
    notes: 'High Intensity Cardio Circuit',
    createdBy: 'Amit Verma',
    createdAt: '2026-09-03',
  },
  {
    id: 'ses-6',
    subscriptionId: 'pt-sub-1',
    traineeId: 'trainee-1',
    traineeName: 'Rahul Malhotra',
    trainerId: 'trainer-1',
    trainerName: 'Amit Verma',
    branchId: 'branch-1',
    scheduledDate: '2026-08-28',
    startTime: '07:00 AM',
    endTime: '08:00 AM',
    status: 'no_show',
    notes: 'Client had out-of-town client meeting; did not inform in advance',
    createdBy: 'Amit Verma',
    createdAt: '2026-08-28',
  },
  {
    id: 'ses-7',
    subscriptionId: 'pt-sub-1',
    traineeId: 'trainee-1',
    traineeName: 'Rahul Malhotra',
    trainerId: 'trainer-1',
    trainerName: 'Amit Verma',
    branchId: 'branch-1',
    scheduledDate: '2026-08-25',
    startTime: '07:00 AM',
    endTime: '08:00 AM',
    status: 'cancelled',
    notes: 'Cancelled 24h prior due to slight fever. No session deducted.',
    createdBy: 'Amit Verma',
    createdAt: '2026-08-25',
  },
  // Ananya's sessions
  {
    id: 'ses-8',
    subscriptionId: 'pt-sub-2',
    traineeId: 'trainee-2',
    traineeName: 'Ananya Iyer',
    trainerId: 'trainer-2',
    trainerName: 'Priya Rao',
    branchId: 'branch-1',
    scheduledDate: '2026-09-03',
    startTime: '06:00 PM',
    endTime: '07:00 PM',
    actualCheckIn: '05:55 PM',
    actualCheckOut: '06:55 PM',
    status: 'completed',
    notes: 'Kettlebell swings & plyometric intervals',
    createdBy: 'Priya Rao',
    createdAt: '2026-09-03',
  },
];

const SEED_PAYMENTS: PaymentTransaction[] = [
  // Combined Payment Example from Prompt Section 60:
  // General Membership ₹12,000 + PT ₹15,000 (part of ₹20k PT) = Total ₹27,000
  {
    id: 'pay-1',
    receiptNumber: 'REC-2026-001',
    traineeId: 'trainee-1',
    traineeName: 'Rahul Malhotra',
    branchId: 'branch-1',
    paymentDate: '2026-09-01',
    paymentMethod: 'UPI',
    referenceNumber: 'UPI/HDFC/2899120938',
    totalAmount: 20000,
    membershipAmount: 12000,
    ptAmount: 8000,
    allocation: {
      generalMembershipAmount: 12000,
      ptAmount: 8000, // Partial PT payment 1 (Section 69: Payment 1 = ₹8,000)
    },
    generalMembershipPlanId: 'plan-annual',
    ptSubscriptionId: 'pt-sub-1',
    discount: 0,
    tax: 0,
    previousDue: 32000,
    remainingDue: 12000,
    notes: 'Combined Annual GM (₹12,000) + PT Initial Deposit (₹8,000)',
    createdBy: 'Rajesh Sharma',
    createdAt: '2026-09-01 10:15',
  },
  {
    id: 'pay-2',
    receiptNumber: 'REC-2026-002',
    traineeId: 'trainee-1',
    traineeName: 'Rahul Malhotra',
    branchId: 'branch-1',
    paymentDate: '2026-09-02',
    paymentMethod: 'Card',
    referenceNumber: 'POS-TXN-984210',
    totalAmount: 7000,
    membershipAmount: 0,
    ptAmount: 7000,
    allocation: {
      generalMembershipAmount: 0,
      ptAmount: 7000, // Partial PT payment 2 (Section 69: Payment 2 = ₹7,000)
    },
    ptSubscriptionId: 'pt-sub-1',
    discount: 0,
    tax: 0,
    previousDue: 12000,
    remainingDue: 5000, // Paid: ₹15,000 PT, Due: ₹5,000 PT!
    notes: 'Second installment for PT Standard (₹7,000). Balance ₹5,000 due next week.',
    createdBy: 'Rajesh Sharma',
    createdAt: '2026-09-02 18:30',
  },
  {
    id: 'pay-3',
    receiptNumber: 'REC-2026-003',
    traineeId: 'trainee-2',
    traineeName: 'Ananya Iyer',
    branchId: 'branch-1',
    paymentDate: '2026-08-10',
    paymentMethod: 'UPI',
    referenceNumber: 'UPI/ICIC/8839210041',
    totalAmount: 14500,
    membershipAmount: 6500,
    ptAmount: 8000,
    allocation: {
      generalMembershipAmount: 6500,
      ptAmount: 8000,
    },
    generalMembershipPlanId: 'plan-quarterly',
    ptSubscriptionId: 'pt-sub-2',
    discount: 0,
    tax: 0,
    previousDue: 14500,
    remainingDue: 0,
    notes: 'Full payment for 3-Month GM + 10-Session PT Basic',
    createdBy: 'Rajesh Sharma',
    createdAt: '2026-08-10 12:00',
  },
  {
    id: 'pay-4',
    receiptNumber: 'REC-2026-004',
    traineeId: 'trainee-3',
    traineeName: 'Vikramaditya Joshi',
    branchId: 'branch-2',
    paymentDate: '2026-07-01',
    paymentMethod: 'Bank Transfer',
    referenceNumber: 'NEFT-SBIN-20260701048',
    totalAmount: 37000,
    membershipAmount: 12000,
    ptAmount: 25000,
    allocation: {
      generalMembershipAmount: 12000,
      ptAmount: 25000,
    },
    generalMembershipPlanId: 'plan-annual',
    ptSubscriptionId: 'pt-sub-3',
    discount: 0,
    tax: 0,
    previousDue: 37000,
    remainingDue: 0,
    notes: 'Annual Membership + PT Premium Transformation 30 sessions paid in full',
    createdBy: 'Meera Nair',
    createdAt: '2026-07-01 10:45',
  },
  {
    id: 'pay-5',
    receiptNumber: 'REC-2026-005',
    traineeId: 'trainee-5',
    traineeName: 'Dr. Radhika Sen',
    branchId: 'branch-3',
    paymentDate: '2026-08-15',
    paymentMethod: 'Card',
    referenceNumber: 'POS-TXN-449102',
    totalAmount: 15000,
    membershipAmount: 0,
    ptAmount: 15000,
    allocation: {
      generalMembershipAmount: 0,
      ptAmount: 15000, // PT Only payment
    },
    ptSubscriptionId: 'pt-sub-4',
    discount: 0,
    tax: 0,
    previousDue: 15000,
    remainingDue: 0,
    notes: 'PT Standard standalone package enrollment',
    createdBy: 'Sunil Deshmukh',
    createdAt: '2026-08-15 14:15',
  },
];

const SEED_SETTLEMENTS: PTCommissionSettlement[] = [
  // Prompt Section 68: Commission Earned ₹12,000, Commission Paid ₹8,000, Due ₹4,000
  {
    id: 'set-1',
    settlementNumber: 'SET-2026-001',
    trainerId: 'trainer-1',
    trainerName: 'Amit Verma',
    branchId: 'branch-1',
    amount: 8000,
    settlementDate: '2026-09-02',
    paymentMethod: 'bank_transfer',
    referenceNumber: 'IMPS/HDFC/9041289',
    approvedBy: 'Rajesh Sharma (Admin)',
    notes: 'Partial settlement for PT revenue on Rahul Malhotra subscription',
    createdAt: '2026-09-02 16:00',
  },
  {
    id: 'set-2',
    settlementNumber: 'SET-2026-002',
    trainerId: 'trainer-2',
    trainerName: 'Priya Rao',
    branchId: 'branch-1',
    amount: 4800,
    settlementDate: '2026-08-31',
    paymentMethod: 'upi',
    referenceNumber: 'UPI/ICIC/7733221',
    approvedBy: 'Rajesh Sharma (Admin)',
    notes: 'Full settlement for Ananya Iyer PT Basic completed cycle',
    createdAt: '2026-08-31 18:00',
  },
  {
    id: 'set-3',
    settlementNumber: 'SET-2026-003',
    trainerId: 'trainer-3',
    trainerName: 'Karan Singh',
    branchId: 'branch-2',
    amount: 15000,
    settlementDate: '2026-08-20',
    paymentMethod: 'bank_transfer',
    referenceNumber: 'NEFT/SBIN/8812903',
    approvedBy: 'Meera Nair (Manager)',
    notes: 'Mid-package commission release for Vikramaditya Joshi PT package',
    createdAt: '2026-08-20 11:30',
  },
];

const SEED_EXPENSES: GymExpense[] = [
  {
    id: 'exp-1',
    branchId: 'branch-1',
    category: 'Rent',
    vendor: 'Palasia Commercial Plaza Properties',
    amount: 120000,
    date: '2026-09-01',
    paymentMethod: 'Bank Transfer',
    referenceNumber: 'RTGS/HDFC/00192834',
    description: 'Monthly facility lease for September 2026',
    createdBy: 'Rajesh Sharma',
    createdAt: '2026-09-01',
  },
  {
    id: 'exp-2',
    branchId: 'branch-1',
    category: 'Electricity',
    vendor: 'MP West Discom (Electricity Board)',
    amount: 34500,
    date: '2026-09-02',
    paymentMethod: 'UPI',
    referenceNumber: 'BILL/MPPKVVCL/88391',
    description: 'Commercial power bill for August air conditioning & sauna',
    createdBy: 'Rajesh Sharma',
    createdAt: '2026-09-02',
  },
  {
    id: 'exp-3',
    branchId: 'branch-2',
    category: 'Equipment Repair',
    vendor: 'LifeFitness Service Center Bhopal',
    amount: 8500,
    date: '2026-08-28',
    paymentMethod: 'UPI',
    description: 'Treadmill #03 belt replacement and motor calibration',
    equipmentId: 'eq-1',
    createdBy: 'Meera Nair',
    createdAt: '2026-08-28',
  },
];

const SEED_EQUIPMENT: GymEquipment[] = [
  {
    id: 'eq-1',
    name: 'LifeFitness Commercial Treadmill 95T',
    category: 'Cardio',
    brand: 'LifeFitness',
    model: 'Integrity Series 95T',
    purchaseDate: '2025-02-10',
    purchaseCost: 350000,
    warrantyExpiry: '2027-02-10',
    vendor: 'Fitness World India',
    branchId: 'branch-1',
    condition: 'Good',
    status: 'active',
    lastMaintenanceDate: '2026-08-15',
    nextMaintenanceDate: '2026-11-15',
  },
  {
    id: 'eq-2',
    name: 'Hammer Strength Dual Adjustable Pulley (Cable Crossover)',
    category: 'Strength',
    brand: 'Hammer Strength',
    model: 'HD Elite Pro',
    purchaseDate: '2025-03-01',
    purchaseCost: 420000,
    warrantyExpiry: '2028-03-01',
    vendor: 'Fitline Equipments',
    branchId: 'branch-1',
    condition: 'Excellent',
    status: 'active',
    lastMaintenanceDate: '2026-07-20',
    nextMaintenanceDate: '2026-10-20',
  },
];

const SEED_ATTENDANCE: AttendanceRecord[] = [
  {
    id: 'att-1',
    personId: 'trainee-1',
    personType: 'trainee',
    personName: 'Rahul Malhotra',
    branchId: 'branch-1',
    date: '2026-09-03',
    checkInTime: '06:55 AM',
    checkOutTime: '08:15 AM',
    status: 'present',
    verificationMethod: 'fingerprint',
    isPTSessionAttendance: true, // PT Session attendance
    ptSessionId: 'ses-3',
    deviceId: 'BIO-IND-01',
    notes: 'PT Session with Amit Verma confirmed',
  },
  {
    id: 'att-2',
    personId: 'trainer-1',
    personType: 'trainer',
    personName: 'Amit Verma',
    branchId: 'branch-1',
    date: '2026-09-03',
    checkInTime: '06:30 AM',
    checkOutTime: '02:30 PM',
    status: 'present',
    verificationMethod: 'fingerprint',
    isPTSessionAttendance: false, // Trainer shift attendance
    deviceId: 'BIO-IND-01',
    notes: 'Morning Shift. Conducted 4 PT sessions.',
  },
  {
    id: 'att-3',
    personId: 'trainee-4',
    personType: 'trainee',
    personName: 'Rohan Kapoor',
    branchId: 'branch-1',
    date: '2026-09-03',
    checkInTime: '07:30 AM',
    checkOutTime: '08:45 AM',
    status: 'present',
    verificationMethod: 'rfid',
    isPTSessionAttendance: false, // Normal gym visit - does NOT consume PT session (Section 75!)
    deviceId: 'RFID-GATE-1',
    notes: 'General gym visit floor workout only.',
  },
];

const SEED_ENQUIRIES: Enquiry[] = [
  {
    id: 'enq-1',
    name: 'Siddharth Deshmukh',
    phone: '+91 99260 77112',
    email: 'sid.deshmukh@gmail.com',
    age: 28,
    gender: 'Male',
    interestedPlan: 'Personal Training + Annual Gym',
    source: 'Instagram',
    assignedStaff: 'Rajesh Sharma',
    branchId: 'branch-1',
    enquiryDate: '2026-09-02',
    followUpDate: '2026-09-04',
    status: 'trial',
    notes: 'Wants body recomposition for upcoming wedding in December. Booked trial with Amit Verma.',
    expectedJoiningDate: '2026-09-06',
    createdAt: '2026-09-02',
  },
  {
    id: 'enq-2',
    name: 'Pooja Aggarwal',
    phone: '+91 94255 33221',
    email: 'pooja.aggarwal@tcs.com',
    age: 32,
    gender: 'Female',
    interestedPlan: 'Quarterly General Pass',
    source: 'Walk-in',
    assignedStaff: 'Meera Nair',
    branchId: 'branch-2',
    enquiryDate: '2026-09-01',
    followUpDate: '2026-09-05',
    status: 'follow_up',
    notes: 'Inquiring for evening Zumba and strength zone. Offered corporate discount.',
    createdAt: '2026-09-01',
  },
];

const SEED_AUDIT_LOGS: AuditLog[] = [
  {
    id: 'aud-1',
    timestamp: '2026-09-01 10:15:00',
    userName: 'Rajesh Sharma',
    userRole: 'admin',
    action: 'Payment Recorded & Revenue Split',
    entity: 'PaymentTransaction',
    entityId: 'pay-1',
    branchId: 'branch-1',
    details: 'Recorded ₹20,000 combined payment for Rahul Malhotra: ₹12,000 GM allocated, ₹8,000 PT allocated with 60/40 rule.',
  },
  {
    id: 'aud-2',
    timestamp: '2026-09-02 16:00:00',
    userName: 'Rajesh Sharma',
    userRole: 'admin',
    action: 'Commission Settled',
    entity: 'PTCommissionSettlement',
    entityId: 'set-1',
    branchId: 'branch-1',
    details: 'Settled ₹8,000 PT commission to Amit Verma via IMPS. Remaining due ₹4,000.',
  },
  {
    id: 'aud-3',
    timestamp: '2026-09-03 07:00:00',
    userName: 'Amit Verma',
    userRole: 'trainer',
    action: 'PT Session Check-in',
    entity: 'PTSession',
    entityId: 'ses-3',
    branchId: 'branch-1',
    details: 'Completed Session 12 of 20 for Rahul Malhotra. Remaining sessions: 8.',
  },
];

// In-Memory & LocalStorage Cache Manager
class StorageService {
  private listeners: Map<string, Array<() => void>> = new Map();

  constructor() {
    this.init();
  }

  private init() {
    if (typeof window === 'undefined') return;

    // Load or seed default records
    if (!localStorage.getItem(STORAGE_KEYS.BRANCHES)) {
      this.resetToDefaults();
    }
  }

  public resetToDefaults() {
    localStorage.setItem(STORAGE_KEYS.BRANCHES, JSON.stringify(SEED_BRANCHES));
    localStorage.setItem(
      STORAGE_KEYS.CURRENT_USER,
      JSON.stringify({
        id: 'admin-1',
        name: 'Super Administrator',
        email: 'admin@gymos-fitness.com',
        role: 'admin',
        branchId: 'all',
      } as CurrentUser)
    );
    localStorage.setItem(STORAGE_KEYS.MEMBERSHIP_PLANS, JSON.stringify(SEED_MEMBERSHIP_PLANS));
    localStorage.setItem(STORAGE_KEYS.PT_PACKAGES, JSON.stringify(SEED_PT_PACKAGES));
    localStorage.setItem(STORAGE_KEYS.TRAINERS, JSON.stringify(SEED_TRAINERS));
    localStorage.setItem(STORAGE_KEYS.TRAINEES, JSON.stringify(SEED_TRAINEES));
    localStorage.setItem(STORAGE_KEYS.PT_SUBSCRIPTIONS, JSON.stringify(SEED_PT_SUBSCRIPTIONS));
    localStorage.setItem(STORAGE_KEYS.PT_SESSIONS, JSON.stringify(SEED_PT_SESSIONS));
    localStorage.setItem(STORAGE_KEYS.PAYMENTS, JSON.stringify(SEED_PAYMENTS));
    localStorage.setItem(STORAGE_KEYS.PT_SETTLEMENTS, JSON.stringify(SEED_SETTLEMENTS));
    localStorage.setItem(STORAGE_KEYS.EXPENSES, JSON.stringify(SEED_EXPENSES));
    localStorage.setItem(STORAGE_KEYS.EQUIPMENT, JSON.stringify(SEED_EQUIPMENT));
    localStorage.setItem(STORAGE_KEYS.ATTENDANCE, JSON.stringify(SEED_ATTENDANCE));
    localStorage.setItem(STORAGE_KEYS.ENQUIRIES, JSON.stringify(SEED_ENQUIRIES));
    localStorage.setItem(STORAGE_KEYS.AUDIT_LOGS, JSON.stringify(SEED_AUDIT_LOGS));
    localStorage.setItem(STORAGE_KEYS.REFUNDS, JSON.stringify([]));
    localStorage.setItem(STORAGE_KEYS.TRAINER_SALARIES, JSON.stringify([]));
    localStorage.setItem(STORAGE_KEYS.TRAINER_ADVANCES, JSON.stringify([]));

    this.notifyAll();
  }

  // Subscribe to changes for live UI refresh
  public subscribe(key: string, callback: () => void) {
    if (!this.listeners.has(key)) {
      this.listeners.set(key, []);
    }
    this.listeners.get(key)!.push(callback);
    return () => {
      const list = this.listeners.get(key);
      if (list) {
        this.listeners.set(
          key,
          list.filter((cb) => cb !== callback)
        );
      }
    };
  }

  public notify(key: string) {
    const list = this.listeners.get(key);
    if (list) {
      list.forEach((cb) => cb());
    }
    // Also notify global listener
    const globalList = this.listeners.get('*');
    if (globalList) {
      globalList.forEach((cb) => cb());
    }
  }

  private notifyAll() {
    this.listeners.forEach((list) => list.forEach((cb) => cb()));
  }

  private getItem<T>(key: string, fallback: T): T {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch {
      return fallback;
    }
  }

  private setItem<T>(key: string, value: T) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      this.notify(key);
    } catch (e) {
      console.error(`Storage error saving ${key}:`, e);
    }
  }

  // --- Current User & Role ---
  public getCurrentUser(): CurrentUser {
    return this.getItem<CurrentUser>(STORAGE_KEYS.CURRENT_USER, {
      id: 'admin-1',
      name: 'Super Administrator',
      email: 'admin@gymos-fitness.com',
      role: 'admin',
      branchId: 'all',
    });
  }

  public setCurrentUser(user: CurrentUser) {
    this.setItem(STORAGE_KEYS.CURRENT_USER, user);
  }

  // --- Theme Preference ---
  public getThemePreference(): 'light' | 'dark' {
    const raw = localStorage.getItem('fitos_theme');
    return raw === 'dark' ? 'dark' : 'light';
  }

  public setThemePreference(theme: 'light' | 'dark') {
    localStorage.setItem('fitos_theme', theme);
    this.notify('theme');
  }

  // --- Branches ---
  public getBranches(): Branch[] {
    return this.getItem<Branch[]>(STORAGE_KEYS.BRANCHES, SEED_BRANCHES);
  }

  public saveBranch(branch: Branch) {
    const list = this.getBranches();
    const idx = list.findIndex((b) => b.id === branch.id);
    if (idx >= 0) {
      list[idx] = branch;
    } else {
      list.push(branch);
    }
    this.setItem(STORAGE_KEYS.BRANCHES, list);
    this.logAudit('Branch Updated/Created', 'Branch', branch.id, branch.id, `Branch ${branch.name} saved`);
  }

  // --- Membership Plans ---
  public getMembershipPlans(): MembershipPlan[] {
    return this.getItem<MembershipPlan[]>(STORAGE_KEYS.MEMBERSHIP_PLANS, SEED_MEMBERSHIP_PLANS);
  }

  // --- PT Packages (Section 61) ---
  public getPTPackages(): PTPackage[] {
    return this.getItem<PTPackage[]>(STORAGE_KEYS.PT_PACKAGES, SEED_PT_PACKAGES);
  }

  public savePTPackage(pkg: PTPackage) {
    const list = this.getPTPackages();
    const idx = list.findIndex((p) => p.id === pkg.id);
    if (idx >= 0) {
      list[idx] = pkg;
    } else {
      list.unshift(pkg);
    }
    this.setItem(STORAGE_KEYS.PT_PACKAGES, list);
    this.logAudit('PT Package Saved', 'PTPackage', pkg.id, pkg.assignedBranchId, `Package ${pkg.name} saved with ${pkg.revenueSharingRule.model} split`);
  }

  // --- Trainers ---
  public getTrainers(): Trainer[] {
    const list = this.getItem<Trainer[]>(STORAGE_KEYS.TRAINERS, SEED_TRAINERS);
    return list.map((t) => ({
      ...t,
      baseSalary: t.baseSalary ?? 0,
      ptCommissionEarned: t.ptCommissionEarned ?? 0,
      ptCommissionPaid: t.ptCommissionPaid ?? 0,
      ptCommissionOutstanding: t.ptCommissionOutstanding ?? Math.max(0, (t.ptCommissionEarned ?? 0) - (t.ptCommissionPaid ?? 0)),
    }));
  }

  public saveTrainer(trainer: Trainer) {
    const list = this.getTrainers();
    const idx = list.findIndex((t) => t.id === trainer.id);
    if (idx >= 0) {
      list[idx] = trainer;
    } else {
      list.unshift(trainer);
    }
    this.setItem(STORAGE_KEYS.TRAINERS, list);
  }

  // --- Trainees ---
  public getTrainees(): Trainee[] {
    const list = this.getItem<Trainee[]>(STORAGE_KEYS.TRAINEES, SEED_TRAINEES);
    return list.map((t) => ({
      ...t,
      totalPaid: t.totalPaid ?? 0,
      totalDue: t.totalDue ?? 0,
    }));
  }

  public saveTrainee(trainee: Trainee) {
    const list = this.getTrainees();
    const idx = list.findIndex((t) => t.id === trainee.id);
    if (idx >= 0) {
      list[idx] = trainee;
    } else {
      list.unshift(trainee);
    }
    this.setItem(STORAGE_KEYS.TRAINEES, list);
  }

  // --- PT Subscriptions (Section 62) ---
  public getPTSubscriptions(): PTSubscription[] {
    const list = this.getItem<PTSubscription[]>(STORAGE_KEYS.PT_SUBSCRIPTIONS, SEED_PT_SUBSCRIPTIONS);
    return list.map((s) => ({
      ...s,
      packagePrice: s.packagePrice ?? s.netPrice ?? s.price ?? 0,
      price: s.price ?? s.packagePrice ?? s.netPrice ?? 0,
      paidAmount: s.paidAmount ?? 0,
      dueAmount: s.dueAmount ?? 0,
      trainerCommissionTotal: s.trainerCommissionTotal ?? s.trainerShare ?? 0,
      trainerShare: s.trainerShare ?? s.trainerCommissionTotal ?? 0,
      branchShare: s.branchShare ?? 0,
      revenueSharingRule: s.revenueSharingRule ?? s.revenueRule,
    }));
  }

  public savePTSubscription(sub: PTSubscription) {
    const list = this.getPTSubscriptions();
    const idx = list.findIndex((s) => s.id === sub.id);
    if (idx >= 0) {
      list[idx] = sub;
    } else {
      list.unshift(sub);
    }
    this.setItem(STORAGE_KEYS.PT_SUBSCRIPTIONS, list);

    // Also update trainee record link
    const trainees = this.getTrainees();
    const tr = trainees.find((t) => t.id === sub.traineeId);
    if (tr) {
      tr.activePTSubscriptionId = sub.id;
      tr.activePTTrainerName = sub.trainerName;
      tr.activePTPackageName = sub.packageName;
      this.saveTrainee(tr);
    }
  }

  // --- PT Sessions (Section 63) ---
  public getPTSessions(): PTSession[] {
    return this.getItem<PTSession[]>(STORAGE_KEYS.PT_SESSIONS, SEED_PT_SESSIONS);
  }

  public savePTSession(session: PTSession) {
    const list = this.getPTSessions();
    const idx = list.findIndex((s) => s.id === session.id);
    if (idx >= 0) {
      list[idx] = session;
    } else {
      list.unshift(session);
    }
    this.setItem(STORAGE_KEYS.PT_SESSIONS, list);

    // Update Subscription session counters
    this.recalculateSubscriptionSessions(session.subscriptionId);
  }

  public recalculateSubscriptionSessions(subscriptionId: string) {
    const subscriptions = this.getPTSubscriptions();
    const sub = subscriptions.find((s) => s.id === subscriptionId);
    if (!sub) return;

    const allSessions = this.getPTSessions().filter((s) => s.subscriptionId === subscriptionId);
    const completed = allSessions.filter((s) => s.status === 'completed').length;
    const cancelled = allSessions.filter((s) => s.status === 'cancelled').length;
    const noShow = allSessions.filter((s) => s.status === 'no_show').length;
    const remaining = Math.max(0, sub.totalSessions - completed - noShow);

    sub.completedSessions = completed;
    sub.cancelledSessions = cancelled;
    sub.noShowSessions = noShow;
    sub.remainingSessions = remaining;

    if (remaining === 0) {
      sub.status = 'completed';
    }

    this.savePTSubscription(sub);
  }

  // --- Payments (Sections 60, 69) ---
  public getPayments(): PaymentTransaction[] {
    const list = this.getItem<PaymentTransaction[]>(STORAGE_KEYS.PAYMENTS, SEED_PAYMENTS);
    return list.map((p) => {
      const membershipAmount = p.membershipAmount ?? p.allocation?.generalMembershipAmount ?? 0;
      const ptAmount = p.ptAmount ?? p.allocation?.ptAmount ?? 0;
      return {
        ...p,
        membershipAmount,
        ptAmount,
        totalAmount: p.totalAmount ?? (membershipAmount + ptAmount),
        allocation: p.allocation || {
          generalMembershipAmount: membershipAmount,
          ptAmount,
        },
      };
    });
  }

  public recordPayment(payment: PaymentTransaction) {
    payment.membershipAmount = payment.membershipAmount ?? payment.allocation?.generalMembershipAmount ?? 0;
    payment.ptAmount = payment.ptAmount ?? payment.allocation?.ptAmount ?? 0;
    payment.totalAmount = payment.totalAmount ?? (payment.membershipAmount + payment.ptAmount);
    if (!payment.allocation) {
      payment.allocation = {
        generalMembershipAmount: payment.membershipAmount,
        ptAmount: payment.ptAmount,
      };
    }
    const list = this.getPayments();
    list.unshift(payment);
    this.setItem(STORAGE_KEYS.PAYMENTS, list);

    // Update trainee dues and paid totals
    const trainees = this.getTrainees();
    const tr = trainees.find((t) => t.id === payment.traineeId);
    if (tr) {
      tr.totalPaid = (tr.totalPaid || 0) + payment.totalAmount;
      tr.totalDue = Math.max(0, (tr.totalDue || 0) - payment.totalAmount);
      this.saveTrainee(tr);
    }

    // Update PT Subscription if PT allocation exists
    if (payment.ptSubscriptionId && payment.allocation.ptAmount > 0) {
      const subs = this.getPTSubscriptions();
      const sub = subs.find((s) => s.id === payment.ptSubscriptionId);
      if (sub) {
        sub.paidAmount = (sub.paidAmount || 0) + payment.allocation.ptAmount;
        sub.dueAmount = Math.max(0, (sub.netPrice || sub.packagePrice || 0) - sub.paidAmount);
        this.savePTSubscription(sub);
      }
    }

    const gmAlloc = payment.allocation?.generalMembershipAmount ?? payment.membershipAmount ?? 0;
    const ptAlloc = payment.allocation?.ptAmount ?? payment.ptAmount ?? 0;
    this.logAudit(
      'Payment Recorded',
      'PaymentTransaction',
      payment.id,
      payment.branchId,
      `Payment of ₹${(payment.totalAmount || 0).toLocaleString('en-IN')} (GM: ₹${(gmAlloc || 0).toLocaleString('en-IN')}, PT: ₹${(ptAlloc || 0).toLocaleString('en-IN')}) for ${payment.traineeName}`
    );
  }

  // --- PT Commission Settlements (Section 68) ---
  public getSettlements(): PTCommissionSettlement[] {
    return this.getItem<PTCommissionSettlement[]>(STORAGE_KEYS.PT_SETTLEMENTS, SEED_SETTLEMENTS);
  }

  public recordSettlement(settlement: PTCommissionSettlement) {
    const list = this.getSettlements();
    list.unshift(settlement);
    this.setItem(STORAGE_KEYS.PT_SETTLEMENTS, list);

    // Update trainer commission paid and outstanding
    const trainers = this.getTrainers();
    const tr = trainers.find((t) => t.id === settlement.trainerId);
    if (tr) {
      tr.ptCommissionPaid += settlement.amount;
      tr.ptCommissionOutstanding = Math.max(0, tr.ptCommissionEarned - tr.ptCommissionPaid);
      this.saveTrainer(tr);
    }

    this.logAudit(
      'Commission Settled',
      'PTCommissionSettlement',
      settlement.id,
      settlement.branchId,
      `Settled ₹${(settlement.amount || 0).toLocaleString('en-IN')} commission to trainer ${settlement.trainerName} via ${settlement.paymentMethod}`
    );
  }

  // --- Refunds (Section 70) ---
  public getRefunds(): RefundRecord[] {
    return this.getItem<RefundRecord[]>(STORAGE_KEYS.REFUNDS, []);
  }

  public recordRefund(refund: RefundRecord) {
    const list = this.getRefunds();
    list.unshift(refund);
    this.setItem(STORAGE_KEYS.REFUNDS, list);

    // Mark payment as refunded/partially refunded
    const payments = this.getPayments();
    const pay = payments.find((p) => p.id === refund.paymentId);
    if (pay) {
      pay.isRefunded = true;
      pay.refundedAmount = (pay.refundedAmount || 0) + refund.amount;
      this.setItem(STORAGE_KEYS.PAYMENTS, payments);
    }

    this.logAudit(
      'Refund Processed',
      'RefundRecord',
      refund.id,
      refund.branchId,
      `Refund of ₹${(refund.amount || 0).toLocaleString('en-IN')} (${refund.refundType}) for ${refund.traineeName}: ${refund.reason}`
    );
  }

  // --- Expenses & Equipment ---
  public getExpenses(): GymExpense[] {
    return this.getItem<GymExpense[]>(STORAGE_KEYS.EXPENSES, SEED_EXPENSES);
  }

  public saveExpense(expense: GymExpense) {
    const list = this.getExpenses();
    list.unshift(expense);
    this.setItem(STORAGE_KEYS.EXPENSES, list);
    this.logAudit('Expense Recorded', 'GymExpense', expense.id, expense.branchId, `Expense ₹${expense.amount} under ${expense.category}`);
  }

  public getEquipment(): GymEquipment[] {
    return this.getItem<GymEquipment[]>(STORAGE_KEYS.EQUIPMENT, SEED_EQUIPMENT);
  }

  // --- Attendance ---
  public getAttendance(): AttendanceRecord[] {
    return this.getItem<AttendanceRecord[]>(STORAGE_KEYS.ATTENDANCE, SEED_ATTENDANCE);
  }

  public recordAttendance(record: AttendanceRecord) {
    const list = this.getAttendance();
    list.unshift(record);
    this.setItem(STORAGE_KEYS.ATTENDANCE, list);
    this.logAudit('Attendance Marked', 'AttendanceRecord', record.id, record.branchId, `${record.personType} ${record.personName} check-in via ${record.verificationMethod}`);
  }

  // --- Enquiries ---
  public getEnquiries(): Enquiry[] {
    return this.getItem<Enquiry[]>(STORAGE_KEYS.ENQUIRIES, SEED_ENQUIRIES);
  }

  public saveEnquiry(enquiry: Enquiry) {
    const list = this.getEnquiries();
    const idx = list.findIndex((e) => e.id === enquiry.id);
    if (idx >= 0) {
      list[idx] = enquiry;
    } else {
      list.unshift(enquiry);
    }
    this.setItem(STORAGE_KEYS.ENQUIRIES, list);
  }

  // --- Audit Logs ---
  public getAuditLogs(): AuditLog[] {
    return this.getItem<AuditLog[]>(STORAGE_KEYS.AUDIT_LOGS, SEED_AUDIT_LOGS);
  }

  public logAudit(action: string, entity: string, entityId: string, branchId: string, details: string) {
    const user = this.getCurrentUser();
    const log: AuditLog = {
      id: `aud-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19),
      userName: user.name,
      userRole: user.role,
      action,
      entity,
      entityId,
      branchId,
      details,
    };
    const list = this.getAuditLogs();
    list.unshift(log);
    // Keep max 200 logs
    if (list.length > 200) list.pop();
    this.setItem(STORAGE_KEYS.AUDIT_LOGS, list);
  }

  // Aliases and helpers
  public getPaymentTransactions(): PaymentTransaction[] {
    return this.getPayments();
  }

  public getAttendanceRecords(): AttendanceRecord[] {
    return this.getAttendance();
  }

  public getPTCommissionSettlements(): PTCommissionSettlement[] {
    return this.getSettlements();
  }

  public recordSegregatedPayment(payment: PaymentTransaction) {
    this.recordPayment(payment);
  }

  public getReceiptByNumber(receiptNo: string): import('../types').Receipt | null {
    const tx = this.getPayments().find((p) => p.receiptNumber === receiptNo);
    if (!tx) return null;
    const branch = this.getBranches().find((b) => b.id === tx.branchId) || this.getBranches()[0];
    const trainee = this.getTrainees().find((t) => t.id === tx.traineeId);

    const items: import('../types').ReceiptItem[] = [];
    if (tx.allocation.generalMembershipAmount > 0) {
      items.push({
        category: 'General Membership',
        description: 'General Gym Access Plan',
        amount: tx.allocation.generalMembershipAmount,
      });
    }
    if (tx.allocation.ptAmount > 0) {
      items.push({
        category: 'Personal Training',
        description: 'Personal Training Sessions Package',
        amount: tx.allocation.ptAmount,
      });
    }

    return {
      receiptNumber: tx.receiptNumber,
      transactionId: tx.id,
      date: tx.paymentDate,
      traineeId: tx.traineeId,
      traineeName: tx.traineeName,
      traineePhone: trainee?.phone || '+91 98260 11223',
      branchId: branch.id,
      branchName: branch.name,
      branchAddress: branch.address,
      branchPhone: branch.phone,
      items,
      totalAmount: tx.totalAmount,
      paymentMethod: tx.paymentMethod,
      referenceNumber: tx.referenceNumber,
      previousDue: tx.previousDue || 0,
      currentPayment: tx.totalAmount,
      remainingDue: tx.remainingDue || 0,
      authorizedSignature: 'Authorized Cashier / Gym Manager',
      terms: 'Payments are non-refundable after session delivery commences. Personal Training sessions must be utilized within validity.',
    };
  }

  public changeTrainerForSubscription(
    subscriptionId: string,
    newTrainerId: string,
    newTrainerName: string,
    reason: string,
    performedBy: string
  ) {
    const subs = this.getPTSubscriptions();
    const sub = subs.find((s) => s.id === subscriptionId);
    if (!sub) return;

    const oldTrainerId = sub.trainerId;
    const oldTrainerName = sub.trainerName;

    sub.trainerId = newTrainerId;
    sub.trainerName = newTrainerName;
    sub.history.push({
      id: `hist-${Date.now()}`,
      timestamp: new Date().toISOString().replace('T', ' ').substring(0, 16),
      action: 'trainer_changed',
      previousTrainerId: oldTrainerId,
      newTrainerId,
      previousTrainerName: oldTrainerName,
      newTrainerName,
      reason,
      performedBy,
    });

    this.savePTSubscription(sub);

    this.logAudit(
      'Trainer Reassigned',
      'PTSubscription',
      sub.id,
      sub.branchId,
      `Reassigned client ${sub.traineeName} from ${oldTrainerName} to ${newTrainerName}. Reason: ${reason}`
    );
  }
}

export const storageService = new StorageService();
