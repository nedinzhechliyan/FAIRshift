import { AttritionScoreBreakdown } from '../types';

export interface AttritionEngineInput {
  attendanceDecline: number;       // 0-1 (e.g. drop from 100% to 70% = 0.3 decline; unexcused absences or sudden drops)
  overtimeBurden: number;          // 0-1 (e.g. overtime ratio exceeding healthy 0.2 threshold)
  negativeFeedback: number;        // 0-1 (fraction of shift pulse responses marked 'poor')
  unresolvedGrievances: number;    // Count of open grievances (normalized: min(count / 2, 1))
  wageDelayDays: number;           // Days of advance or wage dispute pending (normalized: min(days / 10, 1))
  monthsWithoutCertification: number; // Months with no new skill/badge logged (normalized: min(months / 6, 1))
}

/**
 * Deterministic Attrition Risk Engine for FairShift
 * Predicts workforce turnover and dissatisfaction using transparent workplace friction signals.
 */
export function calculateAttritionRisk(input: AttritionEngineInput): AttritionScoreBreakdown {
  const attendanceDeclineNorm = Math.min(1, Math.max(0, input.attendanceDecline));
  const overtimeBurdenNorm = Math.min(1, Math.max(0, input.overtimeBurden));
  const negativeFeedbackNorm = Math.min(1, Math.max(0, input.negativeFeedback));
  const unresolvedGrievancesNorm = Math.min(1, Math.max(0, input.unresolvedGrievances / 2));
  const wageDelayNorm = Math.min(1, Math.max(0, input.wageDelayDays / 10));
  const lowSkillGrowthNorm = Math.min(1, Math.max(0, input.monthsWithoutCertification / 6));

  // Factor contributions:
  // 1. Attendance decline: 30 points
  const attendanceDeclinePoints = Math.round(30 * attendanceDeclineNorm * 10) / 10;
  // 2. Overtime burden: 20 points
  const overtimeBurdenPoints = Math.round(20 * overtimeBurdenNorm * 10) / 10;
  // 3. Negative pulse feedback: 20 points
  const negativeFeedbackPoints = Math.round(20 * negativeFeedbackNorm * 10) / 10;
  // 4. Unresolved grievances: 15 points
  const unresolvedGrievancesPoints = Math.round(15 * unresolvedGrievancesNorm * 10) / 10;
  // 5. Wage delay / pay discrepancy: 10 points
  const wageDelayPoints = Math.round(10 * wageDelayNorm * 10) / 10;
  // 6. Stagnant skills growth: 5 points
  const lowSkillGrowthPoints = Math.round(5 * lowSkillGrowthNorm * 10) / 10;

  const totalRaw = attendanceDeclinePoints + overtimeBurdenPoints + negativeFeedbackPoints + 
                   unresolvedGrievancesPoints + wageDelayPoints + lowSkillGrowthPoints;
  const score = Math.min(100, Math.max(0, Math.round(totalRaw)));

  let band: 'low' | 'medium' | 'high' = 'low';
  let recommendedAction = 'Workforce satisfaction and retention metrics healthy.';

  if (score >= 70) {
    band = 'high';
    if (unresolvedGrievancesNorm > 0.4 || wageDelayNorm > 0.4) {
      recommendedAction = 'Immediate supervisor intervention required: resolve open payment dispute and schedule 1-on-1 retention discussion.';
    } else if (attendanceDeclineNorm > 0.5) {
      recommendedAction = 'Sharp attendance drop detected. Check on worker health, family emergency, or supervisor friction.';
    } else if (negativeFeedbackNorm > 0.5) {
      recommendedAction = 'Team morale in your group is low this week. Investigate workplace climate and equipment bottlenecks.';
    } else {
      recommendedAction = 'High churn risk. Review shift allocations and alleviate chronic overtime burden.';
    }
  } else if (score >= 40) {
    band = 'medium';
    if (negativeFeedbackNorm > 0.3) {
      recommendedAction = 'Team morale in your group is low this week. Inquire about equipment availability and heat breaks.';
    } else {
      recommendedAction = 'Moderate strain. Recommend offering a skill passport upgrade or schedule preference.';
    }
  }

  return {
    score,
    band,
    attendanceDeclineNorm: Math.round(attendanceDeclineNorm * 100) / 100,
    attendanceDeclinePoints,
    overtimeBurdenNorm: Math.round(overtimeBurdenNorm * 100) / 100,
    overtimeBurdenPoints,
    negativeFeedbackNorm: Math.round(negativeFeedbackNorm * 100) / 100,
    negativeFeedbackPoints,
    unresolvedGrievancesNorm: Math.round(unresolvedGrievancesNorm * 100) / 100,
    unresolvedGrievancesPoints,
    wageDelayNorm: Math.round(wageDelayNorm * 100) / 100,
    wageDelayPoints,
    lowSkillGrowthNorm: Math.round(lowSkillGrowthNorm * 100) / 100,
    lowSkillGrowthPoints,
    recommendedAction,
  };
}
