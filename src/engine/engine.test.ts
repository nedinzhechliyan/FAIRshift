import { calculateShiftPay, calculateDurationHours } from './payEngine';
import { calculateFatigueScore } from './fatigueEngine';
import { calculateAttritionRisk } from './attritionEngine';
import { formatINR } from '../utils/formatCurrency';

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`❌ FAIL: ${message}`);
    process.exit(1);
  }
  console.log(`✅ PASS: ${message}`);
}

function runTests() {
  console.log('--- RUNNING DETERMINISTIC ENGINE & STATUTORY RULE UNIT TESTS ---\n');

  // TEST 1: Non-negotiable statutory pay engine test
  // base rate 180, 8 regular hrs, 1.5 OT hrs at 2x, advance recovered 200 => gross 1980, net 1780.
  const payResult = calculateShiftPay({
    baseHourlyRate: 180,
    totalHours: 9.5, // 8 regular + 1.5 OT
    regularShiftHours: 8,
    overtimeMultiplier: 2.0,
    advanceDeduction: 200,
    statutoryDeductions: 0,
  });

  assert(payResult.regularHours === 8, `Regular hours should be 8, got ${payResult.regularHours}`);
  assert(payResult.overtimeHours === 1.5, `Overtime hours should be 1.5, got ${payResult.overtimeHours}`);
  assert(payResult.regularPay === 1440, `Regular pay should be 1440, got ${payResult.regularPay}`);
  assert(payResult.overtimePay === 540, `Overtime pay should be 540, got ${payResult.overtimePay}`);
  assert(payResult.grossPay === 1980, `Gross pay should be 1980, got ${payResult.grossPay}`);
  assert(payResult.netPay === 1780, `Net pay should be 1780, got ${payResult.netPay}`);

  // Pay Engine variations:
  // (a) Exactly 8 hours (no OT)
  const pay8h = calculateShiftPay({ baseHourlyRate: 180, totalHours: 8 });
  assert(pay8h.regularHours === 8 && pay8h.overtimeHours === 0 && pay8h.netPay === 1440, 'Exactly 8h yields 0 OT, 1440 net');

  // (b) Less than 8 hours (e.g. 5.5 hours)
  const pay5h = calculateShiftPay({ baseHourlyRate: 180, totalHours: 5.5 });
  assert(pay5h.regularHours === 5.5 && pay5h.overtimeHours === 0 && pay5h.netPay === 990, '5.5h yields 990 net');

  // (c) Site rule override (e.g. overtime multiplier 2.5x)
  const payCustom = calculateShiftPay({ baseHourlyRate: 200, totalHours: 10, overtimeMultiplier: 2.5, regularShiftHours: 8 });
  // 8 * 200 = 1600; 2 * (200 * 2.5) = 1000 => gross 2600
  assert(payCustom.grossPay === 2600, 'Custom multiplier 2.5x calculates 2600 gross');

  // TEST 2: formatINR helper tests
  const formatted1780 = formatINR(1780).replace(/\s+/g, ' ');
  assert(formatted1780.includes('1,780') && formatted1780.includes('₹'), `formatINR(1780) contains ₹ and 1,780, got "${formatted1780}"`);
  
  const formattedPaise = formatINR(1980.5).replace(/\s+/g, ' ');
  assert(formattedPaise.includes('1,980.50'), `formatINR(1980.5) includes .50, got "${formattedPaise}"`);

  const formattedZero = formatINR(0).replace(/\s+/g, ' ');
  assert(formattedZero.includes('0') && !formattedZero.includes('.00'), `formatINR(0) has no decimals, got "${formattedZero}"`);

  // TEST 3: Shift duration calculation
  const tStart = '2026-10-26T08:00:00Z';
  const tEnd = '2026-10-26T17:30:00Z';
  const duration = calculateDurationHours(tStart, tEnd);
  assert(duration === 9.5, `Duration should be 9.5 hours, got ${duration}`);

  // TEST 4: Story Character: Ramesh Kumar (Genuinely RED Fatigue)
  // Adjusted inputs: 58 weekly hrs, 6 consecutive shifts, 6-hr rest gap, 3 night shifts, 12h longest shift, 10h overtime
  const rameshFatigue = calculateFatigueScore({
    weeklyHours: 58,
    consecutiveShifts: 6,
    restGapHours: 6,
    nightShifts7d: 3,
    longestShiftHours: 12,
    overtimeHours: 10,
    totalHours: 58,
  });

  console.log('Ramesh Kumar Fatigue Result:', {
    score: rameshFatigue.score,
    band: rameshFatigue.band,
    factors: {
      weeklyHoursPoints: rameshFatigue.weeklyHoursPoints,
      consecutiveShiftsPoints: rameshFatigue.consecutiveShiftsPoints,
      restGapPoints: rameshFatigue.restGapPoints,
      nightShiftsPoints: rameshFatigue.nightShiftsPoints,
      longestShiftPoints: rameshFatigue.longestShiftPoints,
      overtimePoints: rameshFatigue.overtimePoints,
    },
    action: rameshFatigue.recommendedAction,
  });

  assert(rameshFatigue.score >= 70, `Ramesh Kumar score must be >= 70, got ${rameshFatigue.score}`);
  assert(rameshFatigue.band === 'red', `Ramesh Kumar band must be 'red', got ${rameshFatigue.band}`);

  // Assert factor contributions sum EXACTLY to his total score
  const factorSum = Math.round((
    rameshFatigue.weeklyHoursPoints +
    rameshFatigue.consecutiveShiftsPoints +
    rameshFatigue.restGapPoints +
    rameshFatigue.nightShiftsPoints +
    rameshFatigue.longestShiftPoints +
    rameshFatigue.overtimePoints
  ) * 10) / 10;
  assert(
    Math.round(factorSum) === rameshFatigue.score,
    `Factor contributions (${factorSum}) must sum exactly to score (${rameshFatigue.score})`
  );

  // TEST 5: Boundary Tests for Fatigue Bands (0-39 green, 40-69 amber, 70-100 red)
  // Boundary 39 vs 40:
  // e.g. weeklyHours: 40 -> 25 * 40/60 = 16.67; 4 consecutive -> 20 * 4/6 = 13.33. Rest gap 10 (0 pts).
  // Total = 30 (green)
  // Let's calibrate exact 39 points:
  const score39 = calculateFatigueScore({
    weeklyHours: 48, // 20 pts
    consecutiveShifts: 4, // 13.3 pts
    restGapHours: 7.2, // 20 * 2.8/10 = 5.6 pts
    nightShifts7d: 0,
    longestShiftHours: 0,
    overtimeHours: 0,
    totalHours: 48,
  });
  console.log('Score 39 test result:', score39.score, score39.band);
  assert(score39.score <= 39 && score39.band === 'green', `Score ${score39.score} should be band 'green'`);

  // Calibrate 40 points (amber threshold)
  const score40 = calculateFatigueScore({
    weeklyHours: 48, // 20 pts
    consecutiveShifts: 5, // 16.7 pts
    restGapHours: 8.35, // 20 * 1.65/10 = 3.3 pts
    nightShifts7d: 0,
    longestShiftHours: 0,
    overtimeHours: 0,
    totalHours: 48,
  });
  console.log('Score 40 test result:', score40.score, score40.band);
  assert(score40.score >= 40 && score40.score < 70 && score40.band === 'amber', `Score ${score40.score} should be band 'amber'`);

  // Boundary 69 vs 70:
  const score69 = calculateFatigueScore({
    weeklyHours: 56, // 23.3 pts
    consecutiveShifts: 6, // 20 pts
    restGapHours: 7.0, // 6 pts
    nightShifts7d: 2, // 7.5 pts
    longestShiftHours: 12, // 10 pts
    overtimeHours: 12,
    totalHours: 56,
  });
  console.log('Score ~69 test result:', score69.score, score69.band);
  assert(score69.score <= 69 ? score69.band === 'amber' : score69.band === 'red', 'Band conforms to 69/70 boundary');

  const score70 = calculateFatigueScore({
    weeklyHours: 58, // 24.17 pts
    consecutiveShifts: 6, // 20 pts
    restGapHours: 6.0, // 8 pts
    nightShifts7d: 3, // 11.25 pts
    longestShiftHours: 12, // 10 pts
    overtimeHours: 10,
    totalHours: 58,
  });
  console.log('Score 75 test result:', score70.score, score70.band);
  assert(score70.score >= 70 && score70.band === 'red', `Score ${score70.score} must be band 'red'`);

  // TEST 6: Story Character: Priya Murugan (High Attrition)
  const priyaAttrition = calculateAttritionRisk({
    attendanceDecline: 0.85,
    overtimeBurden: 0.65,
    negativeFeedback: 0.7,
    unresolvedGrievances: 2,
    wageDelayDays: 10,
    monthsWithoutCertification: 6,
  });
  assert(priyaAttrition.score >= 70, `Priya attrition score must be >= 70, got ${priyaAttrition.score}`);
  assert(priyaAttrition.band === 'high', `Priya attrition band must be 'high', got ${priyaAttrition.band}`);

  console.log('\n🌟 ALL UNIT & STATUTORY ENGINE TESTS PASSED! 🌟');
}

runTests();
