import { FatigueScoreBreakdown } from '../types';

export interface FatigueEngineInput {
  weeklyHours: number;             // Total hours worked in past 7 days
  consecutiveShifts: number;       // Number of consecutive days worked without rest
  restGapHours: number;            // Hours of rest between last two shifts
  nightShifts7d: number;           // Night shifts in the last 7 days
  longestShiftHours: number;       // Single longest shift in past 7 days
  overtimeHours: number;           // Overtime hours in past 7 days
  totalHours: number;              // Total hours in past 7 days (for overtime ratio)
}

/**
 * Deterministic, explainable Fatigue Risk Engine for FairShift
 * Evaluates physiological fatigue risk using ILO and Indian statutory shift thresholds.
 * Exposes a factor-by-factor points breakdown and actionable mitigation.
 */
export function calculateFatigueScore(input: FatigueEngineInput): FatigueScoreBreakdown {
  const weeklyHours = Math.max(0, input.weeklyHours);
  const consecutiveShifts = Math.max(0, input.consecutiveShifts);
  const restGapHours = Math.max(0, input.restGapHours);
  const nightShifts7d = Math.max(0, input.nightShifts7d);
  const longestShiftHours = Math.max(0, input.longestShiftHours);
  
  const totalHours = Math.max(0.1, input.totalHours);
  const rawOtRatio = (input.overtimeHours || 0) / totalHours;
  const overtimeRatio = Math.min(1, Math.max(0, rawOtRatio));

  // Factor contributions strictly matching the specification:
  // 1. Weekly Hours: max 25 points (saturated at 60 hrs)
  const weeklyHoursPoints = Math.round(25 * Math.min(weeklyHours / 60, 1) * 10) / 10;

  // 2. Consecutive Shifts: max 20 points (saturated at 6 consecutive days)
  const consecutiveShiftsPoints = Math.round(20 * Math.min(consecutiveShifts / 6, 1) * 10) / 10;

  // 3. Short Rest Gap (<10 hrs): max 20 points (0 points if rest >= 10h)
  const restGapPoints = Math.round(20 * Math.max(0, (10 - restGapHours) / 10) * 10) / 10;

  // 4. Night Shifts: max 15 points (saturated at 4 night shifts in 7 days)
  const nightShiftsPoints = Math.round(15 * Math.min(nightShifts7d / 4, 1) * 10) / 10;

  // 5. Longest Shift: max 10 points (saturated at 12 hours)
  const longestShiftPoints = Math.round(10 * Math.min(longestShiftHours / 12, 1) * 10) / 10;

  // 6. Overtime Ratio: max 10 points
  const overtimePoints = Math.round(10 * overtimeRatio * 10) / 10;

  const rawSum = weeklyHoursPoints + consecutiveShiftsPoints + restGapPoints + nightShiftsPoints + longestShiftPoints + overtimePoints;
  // Exact rounding to integer score, ensuring breakdown matches exactly
  const score = Math.min(100, Math.max(0, Math.round(rawSum)));

  // Adjust smallest fractional discrepancy in overtimePoints so the visible factors sum EXACTLY to the integer score
  const factorSumBeforeAdj = Math.round((weeklyHoursPoints + consecutiveShiftsPoints + restGapPoints + nightShiftsPoints + longestShiftPoints + overtimePoints) * 10) / 10;
  const diffToScore = Math.round((score - factorSumBeforeAdj) * 10) / 10;
  const adjustedOtPoints = Math.round((overtimePoints + diffToScore) * 10) / 10;

  // Bands strictly matching specification:
  // 0-39: green, 40-69: amber, 70-100: red
  let band: 'green' | 'amber' | 'red' = 'green';
  let recommendedAction = 'Shift load within safe physiological parameters. Continue standard scheduling.';

  if (score >= 70) {
    band = 'red';
    if (consecutiveShifts >= 6) {
      recommendedAction = `Mandatory rest day required. Worker has logged ${consecutiveShifts} consecutive days and ${weeklyHours}h weekly load.`;
    } else if (restGapHours < 10) {
      recommendedAction = `Short turnaround alert: only ${restGapHours}h rest gap. Reassign next shift start by +4h to allow circadian recovery.`;
    } else {
      recommendedAction = `Critical fatigue index (${score}/100). Enforce 24-hour stand-down to prevent site incidents.`;
    }
  } else if (score >= 40) {
    band = 'amber';
    if (nightShifts7d >= 2) {
      recommendedAction = `Elevated strain from ${nightShifts7d} night shifts. Avoid assigning double or overtime duties tomorrow.`;
    } else {
      recommendedAction = `Approaching weekly hour threshold (${weeklyHours}h). Cap tomorrow's shift to 8h without overtime.`;
    }
  }

  return {
    score,
    band,
    weeklyHours,
    weeklyHoursPoints,
    consecutiveShifts,
    consecutiveShiftsPoints,
    restGapHours,
    restGapPoints,
    nightShifts7d,
    nightShiftsPoints,
    longestShiftHours,
    longestShiftPoints,
    overtimeRatio: Math.round(overtimeRatio * 100) / 100,
    overtimePoints: adjustedOtPoints,
    recommendedAction,
  };
}
