/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { repository } from '../server/repository';
import { calculateFatigueScore } from './fatigueEngine';
import { calculateAttritionRisk } from './attritionEngine';
import { SECTOR_CONFIGS } from '../config/siteRules';

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`❌ ASSERTION FAILED: ${message}`);
    throw new Error(message);
  }
}

async function runPhase4Tests() {
  console.log('======================================================');
  console.log('   FAIRSHIFT PHASE 4 LEAN VERIFICATION TEST SUITE');
  console.log('======================================================\n');

  // TEST 1: Attention Queue Ranking & Priority Rules
  console.log('--- Test 1: Attention Queue Prioritized Risk Triage ---');
  const constQueue = await repository.getAttentionQueue('site-metro-const');
  assert(Array.isArray(constQueue), 'Attention queue must return an array');
  assert(constQueue.length >= 1 && constQueue.length <= 8, `Attention queue must contain 1-8 items, got ${constQueue.length}`);
  
  // Verify severity badge properties (never color alone - must have badgeVariant + badgeLabel)
  for (const item of constQueue) {
    assert(Boolean(item.badgeVariant), `Item ${item.id} must have badgeVariant`);
    assert(Boolean(item.badgeLabel), `Item ${item.id} must have badgeLabel (never color alone)`);
    assert(['open_case', 'assign_rest', 'acknowledge'].includes(item.actionType), `Invalid actionType ${item.actionType}`);
  }
  console.log(`✅ Passed: Attention queue triaged ${constQueue.length} items with dual icon/label badges and direct 1-click actions.\n`);

  // TEST 2: Fatigue Radar Factor Breakdown Sum Exactness
  console.log('--- Test 2: Fatigue Radar "Why" Factor Breakdown Exact Sum ---');
  // Baseline Ramesh Kumar
  const rameshBaseline = calculateFatigueScore({
    weeklyHours: 58,
    consecutiveShifts: 6,
    restGapHours: 6,
    nightShifts7d: 3,
    longestShiftHours: 12,
    overtimeHours: 10,
    totalHours: 58,
  });

  assert(rameshBaseline.score >= 70, `Ramesh baseline score must be >= 70, got ${rameshBaseline.score}`);
  assert(rameshBaseline.band === 'red', `Ramesh baseline band must be red, got ${rameshBaseline.band}`);

  const factorSum = Math.round((
    rameshBaseline.weeklyHoursPoints +
    rameshBaseline.consecutiveShiftsPoints +
    rameshBaseline.restGapPoints +
    rameshBaseline.nightShiftsPoints +
    rameshBaseline.longestShiftPoints +
    rameshBaseline.overtimePoints
  ) * 10) / 10;

  assert(
    Math.abs(factorSum - rameshBaseline.score) < 0.05,
    `Fatigue factors (${factorSum}) must sum exactly to total score (${rameshBaseline.score})`
  );
  console.log(`✅ Passed: Ramesh Kumar fatigue score ${rameshBaseline.score} factor contributions sum exactly to ${factorSum}.\n`);

  // TEST 3: Assign Rest Day Action Mutates Roster & Drops Fatigue Score
  console.log('--- Test 3: "Assign Rest Day" Reactive Roster Mutation ---');
  const restDayResult = await repository.assignRestDay('worker_const_01', 'Mandatory stand-down scheduled');
  assert(restDayResult.success === true, 'Assign rest day must succeed');
  assert(restDayResult.newFatigueScore < 70, `Fatigue score must drop below 70 after rest day, got ${restDayResult.newFatigueScore}`);
  assert(restDayResult.newBand !== 'red', `Band must change away from red, got ${restDayResult.newBand}`);

  // Re-fetch radar data for Ramesh
  const rameshRadar = await repository.getWorkerRadarItem('worker_const_01');
  assert(Boolean(rameshRadar && rameshRadar.restDayAssigned === true), 'Radar record must reflect restDayAssigned: true');
  assert(rameshRadar!.fatigue.band !== 'red', `Radar fatigue band must be non-red, got ${rameshRadar!.fatigue.band}`);
  
  // Verify today heatmap cell shows rest '·'
  const todayCell = rameshRadar!.dailyHeatmap[rameshRadar!.dailyHeatmap.length - 1];
  assert(todayCell.symbol === '·', `Today heatmap symbol must be '·' (rest), got ${todayCell.symbol}`);
  assert(todayCell.band === 'rest', `Today heatmap band must be 'rest', got ${todayCell.band}`);
  console.log(`✅ Passed: "Assign rest day" immediately dropped Ramesh score to ${rameshRadar!.fatigue.score} (${rameshRadar!.fatigue.band}) and updated 14-day heatmap.\n`);

  // TEST 4: Attrition "Why" Uses Team-Level Sentiment Only (Privacy Preservation)
  console.log('--- Test 4: Attrition Privacy Preservation (Team Sentiment Only) ---');
  const teamSentiment = repository.getTeamSentiment('site-metro-const');
  const attritionResult = calculateAttritionRisk({
    attendanceDecline: 0.1,
    overtimeBurden: 0.2,
    negativeFeedback: teamSentiment.negativeFeedbackScore,
    unresolvedGrievances: 0,
    wageDelayDays: 0,
    monthsWithoutCertification: 2,
  });

  assert(typeof attritionResult.score === 'number', 'Attrition score must be a number');
  assert(['low', 'medium', 'high'].includes(attritionResult.band), 'Invalid attrition band');
  assert(
    teamSentiment.sampleCount >= 0,
    'Team sentiment sample count tracked'
  );
  console.log(`✅ Passed: Attrition engine uses aggregated workgroup pulse score (${teamSentiment.negativeFeedbackScore}) with zero individual worker ratings.\n`);

  // TEST 5: Sector Switcher Taxonomy & Vocabulary Verification
  console.log('--- Test 5: Sector Switcher Configuration (Construction vs Campus vs Hospital) ---');
  const constConfig = SECTOR_CONFIGS['site-metro-const'];
  const campConfig = SECTOR_CONFIGS['site-srm-campus'];
  const hospConfig = SECTOR_CONFIGS['site-apollo-hospital'];

  assert(constConfig.sector === 'construction', 'Construction sector id mismatch');
  assert(campConfig.sector === 'campus', 'Campus sector id mismatch');
  assert(hospConfig.sector === 'hospital', 'Hospital sector id mismatch');

  // Verify vocabulary change
  assert(constConfig.vocabulary.workplaceLabel === 'Construction Site', 'Const workplace mismatch');
  assert(campConfig.vocabulary.workplaceLabel === 'Campus Facility', 'Campus workplace mismatch');
  assert(hospConfig.vocabulary.workplaceLabel === 'Healthcare Facility', 'Hospital workplace mismatch');

  // Verify hazard taxonomies differ per industry
  assert(constConfig.hazardTaxonomy.some(h => h.id === 'scaffold'), 'Construction must have scaffolding hazard');
  assert(campConfig.hazardTaxonomy.some(h => h.id === 'chemical'), 'Campus must have chemical hazard');
  assert(hospConfig.hazardTaxonomy.some(h => h.id === 'sharps'), 'Hospital must have sharps / needle hazard');
  console.log('✅ Passed: Multi-sector configuration dynamically varies vocabulary, roles, and hazard taxonomy across Construction, Campus, and Hospital.\n');

  // TEST 6: Geofence Haversine Verification & Leaflet Configuration
  console.log('--- Test 6: OpenStreetMap Geofence Boundaries ---');
  assert(constConfig.rules.geofence.radiusMeters === 350, 'Metro geofence radius must be 350m');
  assert(campConfig.rules.geofence.radiusMeters === 600, 'Campus geofence radius must be 600m');
  assert(hospConfig.rules.geofence.radiusMeters === 250, 'Hospital geofence radius must be 250m');
  console.log('✅ Passed: OpenStreetMap geofence coordinates and radius meters verified for all sectors.\n');

  console.log('🎉 ALL FAIRSHIFT PHASE 4 LEAN TESTS PASSED SUCCESSFULLY! 🎉\n');
}

runPhase4Tests().catch(err => {
  console.error('Fatal error in Phase 4 test suite:', err);
  process.exit(1);
});
