/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { repository } from '../server/repository';

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`❌ ASSERTION FAILED: ${message}`);
    throw new Error(message);
  }
}

async function runCrossDeviceDemoLoopTests() {
  console.log('======================================================');
  console.log('   FAIRSHIFT CROSS-DEVICE DEMO LOOP INTEGRATION TEST');
  console.log('======================================================\n');

  // STEP 1: Worker Client Submits Anonymous Report
  console.log('--- Step 1: Worker Mobile Client Submits Anonymous Report ---');
  const siteId = 'site-metro-const';
  
  const createdReport = await repository.createAnonymousReport({
    siteId,
    sector: 'construction',
    category: 'safety',
    subcategory: 'scaffolding',
    severity: 'high',
    urgent: true,
    summaryEn: 'Loose base clamps on Tower 3 scaffold platform near gate 2.',
    originalLanguage: 'en',
    transcriptOriginal: 'The scaffold base clamps on Tower 3 are rattling and loose.',
    transcriptEn: 'The scaffold base clamps on Tower 3 are rattling and loose.',
    recommendedAction: 'Inspect scaffolding base clamps immediately and halt high-elevation work.',
    confidence: 0.94,
    possibleIdentifyingDetails: false,
    siteZone: 'Tower A Scaffolding',
  });

  assert(Boolean(createdReport.caseCode), 'Report must be assigned a unique caseCode');
  assert(/^RPT-[23456789ABCDEFGHJKMNPQRSTUVWXYZ]{4}$/.test(createdReport.caseCode), `Case code ${createdReport.caseCode} must match RPT-XXXX format`);
  assert(createdReport.status === 'open', `Initial case status must be 'open', got '${createdReport.status}'`);
  
  // Verify strict anonymity contract on the created record
  const reportKeys = Object.keys(createdReport);
  assert(!reportKeys.includes('workerId') && !reportKeys.includes('worker_id'), 'Report record must NEVER contain worker_id');
  assert(!reportKeys.includes('deviceId') && !reportKeys.includes('device_id'), 'Report record must NEVER contain device_id');
  assert(!reportKeys.includes('sessionId') && !reportKeys.includes('session_id'), 'Report record must NEVER contain session_id');
  assert(!reportKeys.includes('ip') && !reportKeys.includes('ipAddress'), 'Report record must NEVER contain ip address');

  // Verify temporal coarsening (hour rounding)
  const createdDate = new Date(createdReport.createdAt);
  assert(createdDate.getUTCMinutes() === 0, 'Created timestamp minutes must be rounded to 0');
  assert(createdDate.getUTCSeconds() === 0, 'Created timestamp seconds must be rounded to 0');
  assert(createdDate.getUTCMilliseconds() === 0, 'Created timestamp milliseconds must be rounded to 0');

  console.log(`✅ Passed: Worker submitted report. Generated secret case code: ${createdReport.caseCode}`);
  console.log(`   Hour-coarsened timestamp: ${createdReport.createdAt}`);
  console.log(`   Zero worker/device identifiers present in record.\n`);

  // STEP 2: Supervisor Client Fetches Site Cases
  console.log('--- Step 2: Supervisor Desktop Client Fetches Case Queue ---');
  const supervisorCases = await repository.getReports({ siteId });
  assert(Array.isArray(supervisorCases), 'Supervisor cases must return an array');
  
  const foundInSupervisorQueue = supervisorCases.find(c => c.caseCode === createdReport.caseCode);
  assert(Boolean(foundInSupervisorQueue), `Newly created case ${createdReport.caseCode} must be visible in supervisor queue`);
  assert(foundInSupervisorQueue!.status === 'open', `Supervisor sees case status as 'open'`);
  assert(foundInSupervisorQueue!.subcategory === 'scaffolding', `Supervisor sees correct subcategory`);
  assert(foundInSupervisorQueue!.severity === 'high', `Supervisor sees high severity flag`);

  console.log(`✅ Passed: Supervisor client successfully retrieved case ${createdReport.caseCode} from shared server repository.`);
  console.log(`   Total site cases visible to supervisor: ${supervisorCases.length}\n`);

  // STEP 3: Supervisor Client Updates Case Status & Notes
  console.log('--- Step 3: Supervisor Client Updates Status to "acknowledged" ---');
  const supervisorNoteText = 'Safety engineer Kumar inspected Tower 3 scaffold and tightened 6 base clamps.';
  
  const updatedCase = await repository.updateReportStatus(
    createdReport.caseCode,
    'acknowledged',
    supervisorNoteText
  );

  assert(Boolean(updatedCase), 'updateReportStatus must return the updated case object');
  assert(updatedCase!.status === 'acknowledged', `Case status must be 'acknowledged', got '${updatedCase!.status}'`);
  assert(updatedCase!.supervisorNotes === supervisorNoteText, 'Supervisor notes must be persisted');

  console.log(`✅ Passed: Supervisor updated status of ${createdReport.caseCode} to 'acknowledged' with supervisor note.`);
  console.log(`   Persisted Note: "${updatedCase!.supervisorNotes}"\n`);

  // STEP 4: Worker Mobile Client Looks Up Status via Secret Case Code
  console.log('--- Step 4: Worker Client Queries Secret Case Code ---');
  const workerLookupResult = await repository.getReportByCaseCode(createdReport.caseCode);
  
  assert(Boolean(workerLookupResult), `Worker must be able to lookup report by case code ${createdReport.caseCode}`);
  assert(workerLookupResult!.caseCode === createdReport.caseCode, 'Lookup must return matching case code');
  assert(workerLookupResult!.status === 'acknowledged', `Worker sees updated status 'acknowledged', got '${workerLookupResult!.status}'`);
  assert(workerLookupResult!.supervisorNotes === supervisorNoteText, 'Worker receives supervisor action note for audio readout');

  console.log(`✅ Passed: Worker looked up ${createdReport.caseCode} and confirmed live status 'acknowledged'.`);
  console.log(`   Worker received action explanation: "${workerLookupResult!.supervisorNotes}"\n`);

  // STEP 5: Supervisor Resolves Case & Worker Re-checks
  console.log('--- Step 5: Final Resolution Transition (Open -> Acknowledged -> Resolved) ---');
  const resolutionNote = 'Full structural clearance signed off. Tagged green for shift.';
  const resolvedCase = await repository.updateReportStatus(
    createdReport.caseCode,
    'resolved',
    resolutionNote
  );

  assert(resolvedCase!.status === 'resolved', `Case status must now be 'resolved'`);
  
  const finalWorkerLookup = await repository.getReportByCaseCode(createdReport.caseCode);
  assert(finalWorkerLookup!.status === 'resolved', `Worker sees final status 'resolved'`);
  assert(finalWorkerLookup!.supervisorNotes === resolutionNote, 'Worker sees resolution note');

  console.log(`✅ Passed: Full multi-client lifecycle confirmed:`);
  console.log(`   1. Worker Anonymous Submission (${createdReport.caseCode})`);
  console.log(`   2. Supervisor Real-Time Queue Ingestion`);
  console.log(`   3. Supervisor Acknowledgment & Note Dispatch`);
  console.log(`   4. Worker Live Status & Audio Feedback`);
  console.log(`   5. Supervisor Safe Resolution`);
  console.log('\n🎉 ALL CROSS-DEVICE DEMO LOOP INTEGRATION TESTS PASSED! 🎉\n');
}

runCrossDeviceDemoLoopTests().catch((err) => {
  console.error('Cross-device test failed:', err);
  process.exit(1);
});
