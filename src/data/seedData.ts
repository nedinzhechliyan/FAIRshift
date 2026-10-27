import { 
  WorkerProfile, 
  ShiftRecord, 
  AnonymousReport, 
  FeedbackPulse, 
  SkillPassport,
  PulseRating,
  PulseTopic
} from '../types';
import { calculateShiftPay } from '../engine/payEngine';

// Deterministic Mulberry32 seeded pseudo-random number generator
function createRng(seed: number) {
  let s = seed >>> 0;
  return function() {
    s = (s + 0x6D2B79F5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export interface SeedDataStore {
  workers: WorkerProfile[];
  shifts: ShiftRecord[];
  reports: AnonymousReport[];
  feedback: FeedbackPulse[];
  passports: SkillPassport[];
}

export function generateSeedData(): SeedDataStore {
  const rng = createRng(19842026); // Deterministic fixed seed

  const constructionNames = [
    'Ramesh Kumar', 'Arjun Verma', 'Suresh Paswan', 'Dinesh Yadav', 'Manish Mondal',
    'Rajesh Sahani', 'Sunil Soren', 'Babloo Oraon', 'Vikas Mahato', 'Deepak Chauhan',
    'Santosh Rawat', 'Manoj Thakur', 'Amit Biswas', 'Ravi Shankar', 'Pankaj Barman',
    'Mohan Lal', 'Karan Rajbhar', 'Ranjit Das', 'Gopal Majhi', 'Mukesh Hansda',
    'Birendra Murmu', 'Ajay Kanojia', 'Suraj Khatik', 'Chandan Baitha', 'Pradeep Tudu',
    'Akhilesh Bind', 'Mahesh Kewat', 'Naresh Tanti', 'Sanjay Mallah', 'Dharmendra Beldar',
    'Vijay Nonia', 'Lalit Pasi', 'Vinod Gope', 'Anil Kamat', 'Harish Kurmi',
    'Jitendra Pal', 'Rakesh Kol', 'Rohit Bauri', 'Prem Kumar', 'Shyam Sundar'
  ];

  const campusNames = [
    'Priya Murugan', 'Kavitha Selvam', 'Anitha Rajan', 'Lakshmi Narayanan', 'Meena Sundaram',
    'Karthik Pandian', 'Saravanan Muthu', 'Vignesh Balan', 'Mani Kandan', 'Senthil Kumar',
    'Revathi Sekar', 'Bhuvaneswari K', 'Deepa Arumugam', 'Gomathi Pillai', 'Shanthi Mohan',
    'Ramesh Chandran', 'Vijayalakshmi S', 'Radhika Natarajan', 'Devi Thangavel', 'Jayanthi R',
    'Subramanian P', 'Vasanth G', 'Prakash Velu', 'Murugesan C', 'Dhandapani M',
    'Kalaiyarasi T', 'Sumathi Kannan', 'Geetha Raman', 'Nithya Saravanan', 'Pavithra D',
    'Elango Mani', 'Thangaraj S', 'Sivaraman K', 'Marimuthu V', 'Shanmugam A',
    'Selvi Durai', 'Usha Rani', 'Malathi Babu', 'Hemalatha J', 'Kamala Bose'
  ];

  const constRoles = [
    'Bar Bender & Steel Fixer',
    'Shuttering Carpenter',
    'Scaffold Erector',
    'Mason (Grade A)',
    'Heavy Equipment Operator',
    'General Helper / Labourer',
    'Site Electrician',
  ];

  const campRoles = [
    'Housekeeping Technician',
    'Campus Security Guard',
    'HVAC / Electrical Maintenance',
    'Horticulture & Grounds Crew',
    'Catering & Kitchen Assistant',
    'Plumbing Maintenance Specialist',
  ];

  const workers: WorkerProfile[] = [];
  const passports: SkillPassport[] = [];

  // Generate 40 Construction Workers
  for (let i = 0; i < 40; i++) {
    const id = i === 0 ? 'worker_const_01' : (i === 1 ? 'worker_const_02' : `worker_const_${String(i + 1).padStart(2, '0')}`);
    const name = constructionNames[i];
    const role = i === 0 ? 'Scaffold Erector' : (i === 1 ? 'Bar Bender & Steel Fixer' : constRoles[Math.floor(rng() * constRoles.length)]);
    const baseHourlyRate = 180; // Standard Metro Construction Rate
    const lang = i % 3 === 0 ? 'hi' : (i % 3 === 1 ? 'ta' : 'en');
    const passportId = `FS-PASS-CON-${1000 + i}`;

    workers.push({
      id,
      name,
      sector: 'construction',
      siteId: 'site-metro-const',
      role,
      baseHourlyRate,
      phoneEnding: String(8000 + Math.floor(rng() * 1999)),
      preferredLanguage: lang,
      avatarInitials: name.split(' ').map(n => n[0]).join(''),
      joinedDate: '2025-06-15',
      safetyPassportId: passportId,
    });

    passports.push({
      id: passportId,
      workerId: id,
      workerName: name,
      sector: 'construction',
      skills: ['Height Safety Level 2', 'BOCW Scaffold Rigging', 'First Aid Certified'],
      certifications: [
        {
          id: `CERT-${1000 + i}-1`,
          name: 'BOCW Working at Heights & Fall Arrest',
          issuingBody: 'National Skill Development Corp (NSDC)',
          issuedDate: '2025-07-10',
          expiryDate: '2027-07-10',
          credentialId: `NSDC-BOCW-${5000 + i}`,
          status: 'active',
        },
        {
          id: `CERT-${1000 + i}-2`,
          name: 'Site Scaffold Rigging Safety',
          issuingBody: 'Construction Industry Development Council (CIDC)',
          issuedDate: '2025-09-01',
          expiryDate: '2027-09-01',
          credentialId: `CIDC-RIG-${7000 + i}`,
          status: 'active',
        },
      ],
      totalVerifiedHours: 1120 + Math.floor(rng() * 600),
      safetyScore: i === 0 ? 82 : (88 + Math.floor(rng() * 10)),
      qrVerificationUrl: `/verify/${passportId}`,
      lastUpdated: '2026-10-20',
    });
  }

  // Generate 40 Campus Workers
  for (let i = 0; i < 40; i++) {
    const id = i === 0 ? 'worker_camp_01' : `worker_camp_${String(i + 1).padStart(2, '0')}`;
    const name = campusNames[i];
    const role = i === 0 ? 'Housekeeping Technician' : campRoles[Math.floor(rng() * campRoles.length)];
    const baseHourlyRate = 160; // Standard SRM Campus Support Rate
    const lang = i % 4 === 0 ? 'hi' : (i % 4 === 1 ? 'en' : 'ta');
    const passportId = `FS-PASS-CMP-${2000 + i}`;

    workers.push({
      id,
      name,
      sector: 'campus',
      siteId: 'site-srm-campus',
      role,
      baseHourlyRate,
      phoneEnding: String(6000 + Math.floor(rng() * 1999)),
      preferredLanguage: lang,
      avatarInitials: name.split(' ').map(n => n[0]).join(''),
      joinedDate: '2025-08-01',
      safetyPassportId: passportId,
    });

    passports.push({
      id: passportId,
      workerId: id,
      workerName: name,
      sector: 'campus',
      skills: ['Chemical Handling Safety', 'Hostel Sanitation Standard', 'Fire Extinguisher Protocol'],
      certifications: [
        {
          id: `CERT-${2000 + i}-1`,
          name: 'Facility Health & Chemical Safety',
          issuingBody: 'Tourism & Hospitality Skill Council (THSC)',
          issuedDate: '2025-08-20',
          expiryDate: '2027-08-20',
          credentialId: `THSC-SAN-${4000 + i}`,
          status: 'active',
        },
      ],
      totalVerifiedHours: 850 + Math.floor(rng() * 500),
      safetyScore: i === 0 ? 76 : (90 + Math.floor(rng() * 8)),
      qrVerificationUrl: `/verify/${passportId}`,
      lastUpdated: '2026-10-18',
    });
  }

  // Generate 20 Hospital Workers
  const hospitalNames = [
    'Anjali Nair', 'Deepak Thomas', 'Karpagam Sundaram', 'Mohammed Faizal', 'Prabhavathi R',
    'Siddharth Menon', 'Mary Varghese', 'Gowtham Raj', 'Sangeetha Paul', 'Balaji Subramanian',
    'Nisha Kurian', 'Dhanush Kumar', 'Shalini Joseph', 'Arul Xavier', 'Vinothini K',
    'Chandrasekhar N', 'Sheela Dsouza', 'Girish Warrier', 'Archana Pillai', 'Mervin Rozario'
  ];
  const hospRoles = [
    'Ward Assistant / Patient Porter',
    'Biohazard Sanitation Specialist',
    'Biomedical Waste Handler',
    'CSSD Sterilization Technician',
    'Pharmacy Inventory Runner',
    'Hospital Security & Triage Support',
  ];

  for (let i = 0; i < 20; i++) {
    const id = `worker_hosp_${String(i + 1).padStart(2, '0')}`;
    const name = hospitalNames[i];
    const role = hospRoles[i % hospRoles.length];
    const baseHourlyRate = 210;
    const lang = i % 3 === 0 ? 'ta' : (i % 3 === 1 ? 'en' : 'hi');
    const passportId = `FS-PASS-HSP-${3000 + i}`;

    workers.push({
      id,
      name,
      sector: 'hospital',
      siteId: 'site-apollo-hospital',
      role,
      baseHourlyRate,
      phoneEnding: String(5000 + Math.floor(rng() * 1999)),
      preferredLanguage: lang,
      avatarInitials: name.split(' ').map(n => n[0]).join(''),
      joinedDate: '2025-09-01',
      safetyPassportId: passportId,
    });

    passports.push({
      id: passportId,
      workerId: id,
      workerName: name,
      sector: 'hospital',
      skills: ['Sharps Safety Protocol', 'Biohazard Disposal Level 2', 'Infection Control'],
      certifications: [
        {
          id: `CERT-${3000 + i}-1`,
          name: 'Healthcare Sanitation & Infection Control',
          issuingBody: 'Healthcare Sector Skill Council (HSSC)',
          issuedDate: '2025-09-10',
          expiryDate: '2027-09-10',
          credentialId: `HSSC-BIO-${6000 + i}`,
          status: 'active',
        },
      ],
      totalVerifiedHours: 920 + Math.floor(rng() * 400),
      safetyScore: 92 + Math.floor(rng() * 6),
      qrVerificationUrl: `/verify/${passportId}`,
      lastUpdated: '2026-10-22',
    });
  }

  const shifts: ShiftRecord[] = [];
  const now = new Date('2026-10-26T17:00:00Z');

  // Generate shifts for the past 90 days
  // Ensure the Story Characters have exact designated patterns:

  // 1. Arjun Verma (`worker_const_02`):
  // Demo Shift: today 9h30m (8h regular + 1h30m OT @ 2x), advance recovered 200, gross 1980, net 1780
  const arjunPay = calculateShiftPay({
    baseHourlyRate: 180,
    totalHours: 9.5,
    regularShiftHours: 8,
    overtimeMultiplier: 2.0,
    advanceDeduction: 200,
    statutoryDeductions: 0,
  });

  shifts.push({
    id: 'shift_arjun_demo_today',
    workerId: 'worker_const_02',
    siteId: 'site-metro-const',
    checkInTime: '2026-10-26T07:30:00Z',
    checkOutTime: '2026-10-26T17:00:00Z',
    checkInMethod: 'qr',
    checkOutMethod: 'qr',
    regularHours: arjunPay.regularHours,
    overtimeHours: arjunPay.overtimeHours,
    totalHours: arjunPay.totalHours,
    isNightShift: false,
    baseHourlyRate: 180,
    overtimeMultiplier: 2.0,
    grossPay: arjunPay.grossPay,
    advanceDeduction: arjunPay.advanceDeduction,
    statutoryDeductions: arjunPay.statutoryDeductions,
    netPay: arjunPay.netPay,
    status: 'completed',
  });

  // 2. Ramesh Kumar (`worker_const_01`):
  // Red-fatigue: 6 consecutive shifts, 58 weekly hrs, 6-hr rest gap, 3 night shifts, longest shift 12h
  const rameshShiftSchedule = [
    { dayOffset: 6, startH: 8, dur: 8, isNight: false },
    { dayOffset: 5, startH: 8, dur: 10, isNight: false },
    { dayOffset: 4, startH: 22, dur: 10, isNight: true },
    { dayOffset: 3, startH: 22, dur: 10, isNight: true },
    { dayOffset: 2, startH: 22, dur: 12, isNight: true }, // Longest shift 12h, ends next day at 10:00
    { dayOffset: 1, startH: 16, dur: 8, isNight: false }, // 6-hr rest gap from 10:00 to 16:00
  ];

  rameshShiftSchedule.forEach((sc, idx) => {
    const shiftDate = new Date(now.getTime() - sc.dayOffset * 24 * 60 * 60 * 1000);
    shiftDate.setUTCHours(sc.startH, 0, 0, 0);
    const endDate = new Date(shiftDate.getTime() + sc.dur * 60 * 60 * 1000);

    const pay = calculateShiftPay({
      baseHourlyRate: 180,
      totalHours: sc.dur,
      regularShiftHours: 8,
      overtimeMultiplier: 2.0,
      advanceDeduction: 0,
      statutoryDeductions: 0,
    });

    shifts.push({
      id: `shift_ramesh_${idx}`,
      workerId: 'worker_const_01',
      siteId: 'site-metro-const',
      checkInTime: shiftDate.toISOString(),
      checkOutTime: endDate.toISOString(),
      checkInMethod: 'qr',
      checkOutMethod: 'qr',
      regularHours: pay.regularHours,
      overtimeHours: pay.overtimeHours,
      totalHours: pay.totalHours,
      isNightShift: sc.isNight,
      baseHourlyRate: 180,
      overtimeMultiplier: 2.0,
      grossPay: pay.grossPay,
      advanceDeduction: 0,
      statutoryDeductions: 0,
      netPay: pay.netPay,
      status: 'completed',
    });
  });

  // Today active shift for Ramesh (so supervisor can see live red-fatigue and assign rest day)
  shifts.push({
    id: 'shift_ramesh_today_active',
    workerId: 'worker_const_01',
    siteId: 'site-metro-const',
    checkInTime: '2026-10-26T08:00:00Z',
    checkInMethod: 'qr',
    regularHours: 8,
    overtimeHours: 0,
    totalHours: 8,
    isNightShift: false,
    baseHourlyRate: 180,
    overtimeMultiplier: 2.0,
    grossPay: 1440,
    advanceDeduction: 0,
    statutoryDeductions: 0,
    netPay: 1440,
    status: 'active',
  });

  // 3. Priya Murugan (`worker_camp_01`):
  // High attrition: attendance decline + unresolved payment grievance
  for (let d = 14; d >= 1; d--) {
    // Only attended 4 shifts in last 14 days (severe attendance decline)
    if (d === 13 || d === 10 || d === 6 || d === 2) {
      const shiftDate = new Date(now.getTime() - d * 24 * 60 * 60 * 1000);
      shiftDate.setUTCHours(6, 0, 0, 0);
      const endDate = new Date(shiftDate.getTime() + 8.5 * 60 * 60 * 1000);
      const pay = calculateShiftPay({
        baseHourlyRate: 160,
        totalHours: 8.5,
        regularShiftHours: 8,
        overtimeMultiplier: 2.0,
        advanceDeduction: 150, // disputed advance
      });

      shifts.push({
        id: `shift_priya_${d}`,
        workerId: 'worker_camp_01',
        siteId: 'site-srm-campus',
        checkInTime: shiftDate.toISOString(),
        checkOutTime: endDate.toISOString(),
        checkInMethod: 'gps',
        checkOutMethod: 'gps',
        regularHours: pay.regularHours,
        overtimeHours: pay.overtimeHours,
        totalHours: pay.totalHours,
        isNightShift: false,
        baseHourlyRate: 160,
        overtimeMultiplier: 2.0,
        grossPay: pay.grossPay,
        advanceDeduction: pay.advanceDeduction,
        statutoryDeductions: 0,
        netPay: pay.netPay,
        status: d === 2 ? 'disputed' : 'completed',
        disputeReason: d === 2 ? 'Overtime 0.5h recorded but ₹150 advance deducted without consent' : undefined,
      });
    }
  }

  // Populate realistic recent shifts for other workers
  const otherWorkers = workers.filter(w => !['worker_const_01', 'worker_const_02', 'worker_camp_01'].includes(w.id));
  
  otherWorkers.slice(0, 35).forEach((w, wIdx) => {
    // For past 7 days, generate 5-6 shifts per worker
    for (let d = 6; d >= 0; d--) {
      // 85% attendance
      if (rng() > 0.15) {
        const isNight = rng() < 0.15;
        const startH = isNight ? 22 : (w.sector === 'construction' ? 8 : 6);
        const shiftDuration = 8 + (rng() < 0.35 ? (rng() < 0.7 ? 1.0 : 2.0) : 0);
        
        const shiftDate = new Date(now.getTime() - d * 24 * 60 * 60 * 1000);
        shiftDate.setUTCHours(startH, 0, 0, 0);
        const endDate = new Date(shiftDate.getTime() + shiftDuration * 60 * 60 * 1000);
        const isActive = d === 0 && rng() > 0.6;

        const pay = calculateShiftPay({
          baseHourlyRate: w.baseHourlyRate,
          totalHours: shiftDuration,
          regularShiftHours: 8,
          overtimeMultiplier: 2.0,
          advanceDeduction: rng() < 0.2 ? 100 : 0,
        });

        shifts.push({
          id: `shift_${w.id}_d${d}`,
          workerId: w.id,
          siteId: w.siteId,
          checkInTime: shiftDate.toISOString(),
          checkOutTime: isActive ? undefined : endDate.toISOString(),
          checkInMethod: rng() > 0.3 ? 'qr' : 'gps',
          checkOutMethod: isActive ? undefined : 'qr',
          regularHours: pay.regularHours,
          overtimeHours: isActive ? 0 : pay.overtimeHours,
          totalHours: isActive ? 5.5 : pay.totalHours,
          isNightShift: isNight,
          baseHourlyRate: w.baseHourlyRate,
          overtimeMultiplier: 2.0,
          grossPay: pay.grossPay,
          advanceDeduction: pay.advanceDeduction,
          statutoryDeductions: 0,
          netPay: pay.netPay,
          status: isActive ? 'active' : 'completed',
        });
      }
    }
  });

  // Seed 25 Anonymous Reports
  // CRITICAL: NO worker_id in the reports table!
  const reports: AnonymousReport[] = [
    {
      id: 'rpt_seed_01',
      caseCode: 'RPT-4K92',
      siteId: 'site-metro-const',
      sector: 'construction',
      category: 'safety',
      subcategory: 'Scaffold Defect',
      severity: 'high',
      urgent: true,
      summaryEn: 'Scaffold near Gate 2 has missing toe-boards and loosened cross-brace clamp at 14m level. Vibration from batching plant causing structural tremor.',
      originalLanguage: 'ta',
      transcriptOriginal: 'கேட் 2 அருகே உள்ள சாரக்கட்டு 14 மீட்டர் உயரத்தில் நட்டு தளர்ந்து ஆடுகிறது. கீழ் கான்கிரீட் வண்டி போகும்போது ஆட்டம் அதிகமாக உள்ளது. உடனே சரி செய்ய வேண்டும்.',
      transcriptEn: 'Scaffold near Gate 2 at 14m height has loose clamps and shakes when concrete trucks pass below. Must be repaired immediately.',
      recommendedAction: 'Dispatch certified scaffold rigger to Gate 2 pillar 14; restrict ground perimeter access with red hazard tape.',
      confidence: 0.96,
      needsHumanReview: false,
      status: 'open',
      locationDetail: 'Station 12 · Gate 2 Viaduct Pillar P-14',
      createdAt: new Date(now.getTime() - 3 * 60 * 60 * 1000).toISOString(), // Open 3h ago
      updatedAt: new Date(now.getTime() - 3 * 60 * 60 * 1000).toISOString(),
    },
    {
      id: 'rpt_seed_02',
      caseCode: 'RPT-8B19',
      siteId: 'site-metro-const',
      sector: 'construction',
      category: 'safety',
      subcategory: 'Electrical Exposure',
      severity: 'critical',
      urgent: true,
      summaryEn: 'Exposed 415V distribution cable submersed in drainage water near batching plant pump.',
      originalLanguage: 'hi',
      transcriptOriginal: 'बैचिंग प्लांट के पास 415 वोल्ट का केबल पानी में डूबा हुआ है। कोई अर्थिंग कट नहीं है, बड़ा करंट लग सकता है।',
      transcriptEn: 'A 415V cable is submerged in water near the batching plant pump with no earthing cutoff. High electrocution hazard.',
      recommendedAction: 'Isolate main breaker DB-4 immediately. De-water trench before re-energizing.',
      confidence: 0.98,
      needsHumanReview: false,
      status: 'acknowledged',
      locationDetail: 'Batching Plant East Trench',
      supervisorNotes: 'Breaker DB-4 tripped manually. Electrician team en route.',
      createdAt: new Date(now.getTime() - 5 * 60 * 60 * 1000).toISOString(),
      updatedAt: new Date(now.getTime() - 4 * 60 * 60 * 1000).toISOString(),
    },
    {
      id: 'rpt_seed_03',
      caseCode: 'RPT-2M74',
      siteId: 'site-srm-campus',
      sector: 'campus',
      category: 'payment',
      subcategory: 'Advance Cut Without Authorization',
      severity: 'medium',
      urgent: false,
      summaryEn: 'Subcontractor deducted ₹200 festival advance recovery twice from bi-weekly timesheet.',
      originalLanguage: 'ta',
      transcriptOriginal: 'தீபாவளி அட்வான்ஸ் 200 ரூபாய் ஏற்கனவே கழித்தார்கள். இந்த வாரம் மீண்டும் 200 ரூபாய் பிடித்தம் செய்துள்ளனர். கேட்கும்போது சரியாக பதில் சொல்லவில்லை.',
      transcriptEn: 'They already recovered the ₹200 advance. This week another ₹200 was deducted again. Subcontractor gave no clear response.',
      recommendedAction: 'Audit payroll ledger for contractor batch SR-14; credit ₹200 adjustment to next shift settlement.',
      confidence: 0.94,
      needsHumanReview: false,
      status: 'open',
      locationDetail: 'Tech Park Block B Housekeeping Depot',
      createdAt: new Date(now.getTime() - 18 * 60 * 60 * 1000).toISOString(),
      updatedAt: new Date(now.getTime() - 18 * 60 * 60 * 1000).toISOString(),
    },
    {
      id: 'rpt_seed_04',
      caseCode: 'RPT-9T31',
      siteId: 'site-srm-campus',
      sector: 'campus',
      category: 'behaviour',
      subcategory: 'Denied Break / Verbal Abuse',
      severity: 'high',
      urgent: false,
      summaryEn: 'Shift lead forced 3 sanitation workers to skip mandatory lunch break during parent-teacher conference day and shouted abusive language.',
      originalLanguage: 'en',
      transcriptOriginal: 'Shift lead refused lunch break for the sanitation team on campus event day and used abusive language when water was requested.',
      transcriptEn: 'Shift lead refused lunch break for the sanitation team on campus event day and used abusive language when water was requested.',
      recommendedAction: 'HR to issue formal reprimand to Shift Lead; enforce staggered lunch rotations on high-density event days.',
      confidence: 0.92,
      needsHumanReview: false,
      status: 'open',
      locationDetail: 'Campus Auditorium Sanitation Post',
      createdAt: new Date(now.getTime() - 28 * 60 * 60 * 1000).toISOString(),
      updatedAt: new Date(now.getTime() - 28 * 60 * 60 * 1000).toISOString(),
    },
    {
      id: 'rpt_seed_05',
      caseCode: 'RPT-3W65',
      siteId: 'site-metro-const',
      sector: 'construction',
      category: 'safety',
      subcategory: 'Missing Heat Stress Drinking Water',
      severity: 'medium',
      urgent: false,
      summaryEn: 'Drinking water chiller at Pier 18 has been empty for two consecutive shifts during peak afternoon heat (34°C).',
      originalLanguage: 'hi',
      transcriptOriginal: 'पियर 18 पर पीने का पानी का ड्रम दो दिन से खाली है। दोपहर की धूप में चक्कर आ रहे हैं।',
      transcriptEn: 'Drinking water drum at Pier 18 has been empty for two days. Workers experiencing dizziness in afternoon heat.',
      recommendedAction: 'Replenish 20L water cans immediately and set recurring water carrier schedule.',
      confidence: 0.95,
      needsHumanReview: false,
      status: 'resolved',
      locationDetail: 'Pier 18 Viaduct Deck',
      supervisorNotes: 'Water supplier restocked at 11:00 AM. Additional shade canopy installed.',
      createdAt: new Date(now.getTime() - 48 * 60 * 60 * 1000).toISOString(),
      updatedAt: new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString(),
    },
  ];

  // Add remaining 20 reports deterministically across both sites
  const extraCategories: Array<'safety' | 'payment' | 'behaviour'> = ['safety', 'safety', 'payment', 'behaviour'];
  const extraSubcats: Record<string, string[]> = {
    safety: ['Trench barricading collapsed', 'Welding flash without screens', 'Worn harness safety lanyard', 'Blocked fire exit stairs'],
    payment: ['Unpaid 2h Sunday overtime', 'Incorrect piece-rate classification', 'Overtime paid at 1x instead of 2x statutory'],
    behaviour: ['Forced late shift after 10h workday', 'Deduction threat for taking sick leave', 'Inadequate rest room ventilation'],
  };

  const extraCodes = [
    'RPT-5X12', 'RPT-7P83', 'RPT-1J45', 'RPT-6L99', 'RPT-2Q38',
    'RPT-4D77', 'RPT-8N21', 'RPT-3K54', 'RPT-9R88', 'RPT-7V16',
    'RPT-2H63', 'RPT-5Z91', 'RPT-4F32', 'RPT-8C74', 'RPT-1Y85',
    'RPT-6G43', 'RPT-9B27', 'RPT-3A61', 'RPT-7E94', 'RPT-2U18'
  ];

  for (let i = 0; i < 20; i++) {
    const isConst = i % 2 === 0;
    const cat = extraCategories[i % extraCategories.length];
    const subcatList = extraSubcats[cat];
    const subcat = subcatList[i % subcatList.length];
    const severity: 'low' | 'medium' | 'high' = i % 5 === 0 ? 'high' : (i % 2 === 0 ? 'medium' : 'low');
    const hoursAgo = 12 + i * 8;
    const status: 'open' | 'acknowledged' | 'resolved' = i < 7 ? 'open' : (i < 14 ? 'acknowledged' : 'resolved');

    reports.push({
      id: `rpt_seed_extra_${i}`,
      caseCode: extraCodes[i],
      siteId: isConst ? 'site-metro-const' : 'site-srm-campus',
      sector: isConst ? 'construction' : 'campus',
      category: cat,
      subcategory: subcat,
      severity,
      urgent: severity === 'high',
      summaryEn: `${subcat} observed in ${isConst ? 'Metro Sector ' + ((i % 4) + 1) : 'Campus Wing ' + String.fromCharCode(65 + (i % 3))}.`,
      originalLanguage: i % 3 === 0 ? 'hi' : (i % 3 === 1 ? 'ta' : 'en'),
      transcriptOriginal: `Report concerning ${subcat.toLowerCase()} requiring supervisor review.`,
      transcriptEn: `Report concerning ${subcat.toLowerCase()} requiring supervisor review.`,
      recommendedAction: `Inspect workplace area and address ${cat} concern with responsible supervisor.`,
      confidence: 0.88 + (i % 10) * 0.01,
      needsHumanReview: false,
      status,
      createdAt: new Date(now.getTime() - hoursAgo * 60 * 60 * 1000).toISOString(),
      updatedAt: new Date(now.getTime() - (hoursAgo - 4) * 60 * 60 * 1000).toISOString(),
    });
  }

  // Seed 40 Feedback Pulses
  const feedback: FeedbackPulse[] = [];
  const pulseTopics: PulseTopic[] = ['rest_shifts', 'safety', 'manager', 'pay', 'facilities'];
  const pulseRatings: Array<{ rating: PulseRating; value: number; sentiment: number }> = [
    { rating: 'terrible', value: 1, sentiment: 0.0 },
    { rating: 'difficult', value: 2, sentiment: 0.25 },
    { rating: 'acceptable', value: 3, sentiment: 0.5 },
    { rating: 'good', value: 4, sentiment: 0.75 },
    { rating: 'great', value: 5, sentiment: 1.0 },
  ];
  
  for (let i = 0; i < 40; i++) {
    const isConst = i % 2 === 0;
    const rObj = pulseRatings[i % pulseRatings.length];
    const topic = pulseTopics[i % pulseTopics.length];
    const daysAgo = Math.floor(i / 4);

    feedback.push({
      id: `pulse_${i}`,
      siteId: isConst ? 'site-metro-const' : 'site-srm-campus',
      sector: isConst ? 'construction' : 'campus',
      rating: rObj.rating,
      ratingValue: rObj.value,
      topic,
      isoWeek: `2026-W${String(40 + Math.floor(i / 10)).padStart(2, '0')}`,
      sentimentScore: rObj.sentiment,
      voiceNoteSummary: rObj.value <= 2 ? 'Shift ran 2 hours late without drinking water refill.' : undefined,
    });
  }

  return {
    workers,
    shifts,
    reports,
    feedback,
    passports,
  };
}
