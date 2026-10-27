export type SectorType = 'construction' | 'campus' | 'hospital';
export type UserRole = 'worker' | 'supervisor' | 'admin';

export interface SiteRules {
  regularShiftHours: number;        // e.g. 8 hrs standard
  overtimeMultiplier: number;       // e.g. 2.0x as required by Indian Factories Act / Building & Construction Workers Act
  maxDailyHours: number;           // e.g. 12 hrs
  maxWeeklyHoursNormal: number;    // e.g. 48 hrs standard
  maxWeeklyHoursCap: number;       // e.g. 60 hrs
  minRestGapHours: number;         // e.g. 10 hrs rest between shifts
  nightShiftWindow: {
    startHour: number;             // e.g. 22 (10 PM)
    endHour: number;               // e.g. 6 (6 AM)
  };
  geofence: {
    name: string;
    latitude: number;
    longitude: number;
    radiusMeters: number;
  };
  qrSecretKey: string;
  defaultHourlyRate: number;
}

export interface SectorConfig {
  id: string;
  sector: SectorType;
  siteName: string;
  location: string;
  state: string;
  applicableAct: string;
  vocabulary: {
    workplaceLabel: string;
    workerLabel: string;
    supervisorLabel: string;
    shiftLabel: string;
    safetyAuditLabel: string;
  };
  zones: string[];
  roles: string[];
  hazardTaxonomy: Array<{
    id: string;
    label: string;
    severityDefault: 'low' | 'medium' | 'high' | 'critical';
    iconName: string;
  }>;
  shiftPatterns: Array<{
    id: string;
    name: string;
    startTime: string;
    endTime: string;
    isNightShift: boolean;
  }>;
  rules: SiteRules;
}

export interface WorkerProfile {
  id: string;
  name: string;
  sector: SectorType;
  siteId: string;
  role: string;
  baseHourlyRate: number;
  phoneEnding: string;
  preferredLanguage: 'en' | 'hi' | 'ta';
  avatarInitials: string;
  joinedDate: string;
  safetyPassportId: string;
}

export interface ShiftRecord {
  id: string;
  workerId: string;
  siteId: string;
  checkInTime: string;          // ISO string
  checkOutTime?: string;         // ISO string
  checkInMethod: 'qr' | 'gps' | 'offline_sync';
  checkOutMethod?: 'qr' | 'gps' | 'offline_sync';
  regularHours: number;
  overtimeHours: number;
  totalHours: number;
  isNightShift: boolean;
  baseHourlyRate: number;
  overtimeMultiplier: number;
  grossPay: number;
  advanceDeduction: number;
  statutoryDeductions: number;
  netPay: number;
  status: 'active' | 'completed' | 'disputed';
  disputeReason?: string;
  offlineQueued?: boolean;
}

export interface AnonymousReport {
  id: string;                   // Internal DB primary key
  caseCode: string;             // Format e.g. RPT-4K92 (shown to user, NO worker_id)
  siteId: string;
  sector: SectorType;
  category: 'safety' | 'payment' | 'behaviour';
  subcategory: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  urgent: boolean;
  summaryEn: string;
  originalLanguage: 'en' | 'hi' | 'ta';
  transcriptOriginal: string;
  transcriptEn: string;
  recommendedAction: string;
  confidence: number;
  needsHumanReview: boolean;
  possibleIdentifyingDetails?: boolean;
  status: 'open' | 'acknowledged' | 'in_progress' | 'resolved';
  supervisorNotes?: string;
  createdAt: string;            // Rounded to the hour (e.g. 2026-10-26T22:00:00Z)
  updatedAt: string;            // Rounded to the hour
  createdAtHour?: string;
  updatedAtHour?: string;
  siteZone?: string;            // Selected from site config zones
  locationDetail?: string;      // Optional extra label
}

export type PulseRating = 'terrible' | 'difficult' | 'acceptable' | 'good' | 'great';
export type PulseTopic = 'pay' | 'safety' | 'manager' | 'rest_shifts' | 'facilities';

export interface PulseParticipation {
  workerWeekHash: string;       // SHA256(workerId + ':' + isoWeek + ':' + salt)
  isoWeek: string;              // e.g. "2026-W44"
}

export interface PulseResponse {
  id: string;
  siteId: string;
  sector: SectorType;
  rating: PulseRating;
  ratingValue: number;          // 1 (terrible) to 5 (great)
  topic: PulseTopic;
  isoWeek: string;              // e.g. "2026-W44"
  summaryEn?: string;
  sentimentScore: number;       // 0.0 (terrible) to 1.0 (great)
  voiceNoteSummary?: string;    // Sanitized English summary, audio is discarded
}

export type FeedbackPulse = PulseResponse;

export interface Certification {
  id: string;
  name: string;
  issuingBody: string;
  issuedDate: string;
  expiryDate: string;
  credentialId: string;
  status: 'active' | 'expired' | 'pending_renewal';
}

export interface SkillPassport {
  id: string;
  workerId: string;
  workerName: string;
  sector: SectorType;
  skills: string[];
  certifications: Certification[];
  totalVerifiedHours: number;
  safetyScore: number;          // 0-100
  qrVerificationUrl: string;
  lastUpdated: string;
}

export interface FatigueScoreBreakdown {
  score: number;                // 0-100
  band: 'green' | 'amber' | 'red';
  weeklyHours: number;
  weeklyHoursPoints: number;    // 25 * min(weekly_hours/60, 1)
  consecutiveShifts: number;
  consecutiveShiftsPoints: number; // 20 * min(consecutive_shifts/6, 1)
  restGapHours: number;
  restGapPoints: number;        // 20 * max(0, (10 - rest_gap_hours)/10)
  nightShifts7d: number;
  nightShiftsPoints: number;    // 15 * min(night_shifts_7d/4, 1)
  longestShiftHours: number;
  longestShiftPoints: number;   // 10 * min(longest_shift_hours/12, 1)
  overtimeRatio: number;
  overtimePoints: number;       // 10 * overtime_ratio
  recommendedAction: string;
}

export interface AttritionScoreBreakdown {
  score: number;                // 0-100
  band: 'low' | 'medium' | 'high';
  attendanceDeclineNorm: number;
  attendanceDeclinePoints: number; // 30 * attendance_decline
  overtimeBurdenNorm: number;
  overtimeBurdenPoints: number;    // 20 * overtime_burden
  negativeFeedbackNorm: number;
  negativeFeedbackPoints: number;  // 20 * negative_feedback
  unresolvedGrievancesNorm: number;
  unresolvedGrievancesPoints: number; // 15 * unresolved_grievances_norm
  wageDelayNorm: number;
  wageDelayPoints: number;         // 10 * wage_delay_norm
  lowSkillGrowthNorm: number;
  lowSkillGrowthPoints: number;    // 5 * low_skill_growth
  recommendedAction: string;
}

export interface ReportCaseSummary {
  id: string;
  caseCode: string;
  siteId: string;
  sector: SectorType;
  category: 'safety' | 'payment' | 'behaviour';
  subcategory: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  urgent: boolean;
  summaryEn: string;
  recommendedAction: string;
  status: 'open' | 'acknowledged' | 'in_progress' | 'resolved';
  supervisorNotes?: string;
  siteZone?: string;
  locationDetail?: string;
  possibleIdentifyingDetails?: boolean;
  createdAt?: string;
  createdAtHour: string;
  updatedAtHour: string;
}

export interface HazardPin {
  zone: string;
  count: number;
  reportCount?: number;
  suppressed: boolean;
  message?: string;
  note?: string;
}

export interface TranscriptDetails {
  caseCode: string;
  originalLanguage: string;
  transcriptOriginal: string;
  transcriptEn: string;
  warning: string | null;
}

export interface AttentionQueueItem {
  id: string;
  type: 'critical_hazard' | 'red_fatigue' | 'high_hazard' | 'aging_case';
  rankScore: number;
  title: string;
  reason: string;
  severity: 'critical' | 'high' | 'medium';
  badgeVariant: 'critical' | 'high' | 'medium' | 'neutral' | 'success' | 'warning' | 'amber' | 'red';
  badgeLabel: string;
  actionType: 'open_case' | 'assign_rest' | 'acknowledge';
  actionLabel: string;
  targetId: string;
  timestamp?: string;
  workerName?: string;
  details?: unknown;
}

export interface DailyHeatmapCell {
  dayIndex: number;
  dayLabel: string;
  dateStr: string;
  hours: number;
  score: number;
  band: 'green' | 'amber' | 'red' | 'rest';
  symbol: 'G' | 'A' | 'R' | '·';
}

export interface RadarWorkerData {
  worker: WorkerProfile;
  fatigue: FatigueScoreBreakdown;
  attrition: AttritionScoreBreakdown;
  dailyHeatmap: DailyHeatmapCell[];
  restDayAssigned?: boolean;
}
