import { SectorConfig } from '../types';

export const LEGAL_DISCLAIMER_NOTE = 
  "Rules are configurable per site and state. FairShift supports transparency and helps employers align with working-hour norms; it is not legal advice.";

export const SECTOR_CONFIGS: Record<string, SectorConfig> = {
  'site-metro-const': {
    id: 'site-metro-const',
    sector: 'construction',
    siteName: 'Metro Rail Phase 4 - Station 12 & Viaduct',
    location: 'Outer Ring Road, Bengaluru',
    state: 'Karnataka',
    applicableAct: 'Building & Other Construction Workers (BOCW) Act & Karnataka Factories Rules',
    vocabulary: {
      workplaceLabel: 'Construction Site',
      workerLabel: 'Site Operative / Labourer',
      supervisorLabel: 'Site Foreman / Safety Engineer',
      shiftLabel: 'Site Shift',
      safetyAuditLabel: 'Daily Safety & Hazard Walk',
    },
    zones: [
      'Gate 2 Scaffold Area',
      'Pier 14 Viaduct',
      'Batching Plant East',
      'Pier 18 Viaduct Deck',
      'Main Entry Gate 1',
      'Labour Camp & Rest Shed',
    ],
    roles: [
      'Bar Bender & Steel Fixer',
      'Shuttering Carpenter',
      'Scaffold Erector',
      'Mason (Grade A)',
      'Heavy Equipment Operator',
      'General Helper / Labourer',
      'Site Electrician',
    ],
    hazardTaxonomy: [
      { id: 'scaffold', label: 'Unsecured Scaffold / Working at Height', severityDefault: 'high', iconName: 'ShieldAlert' },
      { id: 'electrical', label: 'Exposed Wiring / Power Distribution', severityDefault: 'high', iconName: 'Zap' },
      { id: 'ppe', label: 'Missing Safety Helmets / Harness / Steel-toe Boots', severityDefault: 'medium', iconName: 'HardHat' },
      { id: 'excavation', label: 'Trench Collapse / Barricading Defect', severityDefault: 'critical', iconName: 'AlertTriangle' },
      { id: 'heat_water', label: 'Heat Stress / Inadequate Potable Water', severityDefault: 'medium', iconName: 'Sun' },
    ],
    shiftPatterns: [
      { id: 'morn', name: 'General Shift (08:00 - 16:30)', startTime: '08:00', endTime: '16:30', isNightShift: false },
      { id: 'eve', name: 'Second Shift (16:00 - 00:30)', startTime: '16:00', endTime: '00:30', isNightShift: false },
      { id: 'night', name: 'Night Viaduct Shift (22:00 - 06:30)', startTime: '22:00', endTime: '06:30', isNightShift: true },
    ],
    rules: {
      regularShiftHours: 8,
      overtimeMultiplier: 2.0, // 2x statutory overtime in India
      maxDailyHours: 12,
      maxWeeklyHoursNormal: 48,
      maxWeeklyHoursCap: 60,
      minRestGapHours: 10,
      nightShiftWindow: {
        startHour: 22,
        endHour: 6,
      },
      geofence: {
        name: 'Metro Site Station 12 Gate 1-4',
        latitude: 12.9716,
        longitude: 77.5946,
        radiusMeters: 350,
      },
      qrSecretKey: 'fairshift_metro_station12_salt_99',
      defaultHourlyRate: 180, // ₹180/hr (~₹1440 for 8h)
    },
  },

  'site-srm-campus': {
    id: 'site-srm-campus',
    sector: 'campus',
    siteName: 'SRM University Tech Park & Residential Campus',
    location: 'Kattankulathur, Chennai',
    state: 'Tamil Nadu',
    applicableAct: 'Tamil Nadu Shops & Commercial Establishments Act & Minimum Wages Act',
    vocabulary: {
      workplaceLabel: 'Campus Facility',
      workerLabel: 'Campus Support Staff',
      supervisorLabel: 'Facility Supervisor / Operations Lead',
      shiftLabel: 'Duty Shift',
      safetyAuditLabel: 'Campus Facilities Inspection',
    },
    zones: [
      'Tech Park Block A',
      'Tech Park Block B',
      'Main Canteen & Mess',
      'Hostel Block 3 & 4',
      'Auditorium Complex',
      'Substation Yard',
    ],
    roles: [
      'Housekeeping Technician',
      'Campus Security Guard',
      'HVAC / Electrical Maintenance',
      'Horticulture & Grounds Crew',
      'Catering & Kitchen Assistant',
      'Plumbing Maintenance Specialist',
    ],
    hazardTaxonomy: [
      { id: 'chemical', label: 'Chemical Exposure / Cleaning Solvents', severityDefault: 'medium', iconName: 'FlaskConical' },
      { id: 'slip_fall', label: 'Wet Floors / Unmarked Spills', severityDefault: 'low', iconName: 'AlertCircle' },
      { id: 'electrical_campus', label: 'Substation / Transformer Panel Issue', severityDefault: 'high', iconName: 'Zap' },
      { id: 'harassment', label: 'Verbal Harassment / Denied Rest Breaks', severityDefault: 'high', iconName: 'UserX' },
      { id: 'fire_safety', label: 'Blocked Fire Exit / Faulty Extinguisher', severityDefault: 'critical', iconName: 'Flame' },
    ],
    shiftPatterns: [
      { id: 'camp_morn', name: 'Morning Shift (06:00 - 14:30)', startTime: '06:00', endTime: '14:30', isNightShift: false },
      { id: 'camp_afternoon', name: 'Afternoon Shift (14:00 - 22:30)', startTime: '14:00', endTime: '22:30', isNightShift: false },
      { id: 'camp_night', name: 'Night Security Shift (22:00 - 06:00)', startTime: '22:00', endTime: '06:00', isNightShift: true },
    ],
    rules: {
      regularShiftHours: 8,
      overtimeMultiplier: 2.0,
      maxDailyHours: 12,
      maxWeeklyHoursNormal: 48,
      maxWeeklyHoursCap: 60,
      minRestGapHours: 10,
      nightShiftWindow: {
        startHour: 22,
        endHour: 6,
      },
      geofence: {
        name: 'SRM University Main Campus Perimeter',
        latitude: 12.8230,
        longitude: 80.0444,
        radiusMeters: 600,
      },
      qrSecretKey: 'fairshift_srm_campus_salt_44',
      defaultHourlyRate: 160, // ₹160/hr (~₹1280 for 8h)
    },
  },

  'site-apollo-hospital': {
    id: 'site-apollo-hospital',
    sector: 'hospital',
    siteName: 'Apollo City Super-Specialty Medical Centre',
    location: 'Greams Road, Chennai',
    state: 'Tamil Nadu',
    applicableAct: 'Clinical Establishments (Registration & Regulation) Act & State Labour Norms',
    vocabulary: {
      workplaceLabel: 'Healthcare Facility',
      workerLabel: 'Clinical & Ward Support Staff',
      supervisorLabel: 'Ward Master / Quality Nurse Supervisor',
      shiftLabel: 'Clinical Shift',
      safetyAuditLabel: 'Infection Control & Biohazard Audit',
    },
    zones: [
      'Emergency Triage',
      'ICU Ward 3',
      'CSSD Sterilization Dept',
      'Biomedical Waste Depot',
      'Pharmacy Central',
      'Radiology Ground Floor',
    ],
    roles: [
      'Ward Assistant / Patient Porter',
      'Biohazard Sanitation Specialist',
      'Biomedical Waste Handler',
      'CSSD Sterilization Technician',
      'Pharmacy Inventory Runner',
      'Hospital Security & Triage Support',
    ],
    hazardTaxonomy: [
      { id: 'sharps', label: 'Improper Needlestick / Scalpel Disposal', severityDefault: 'critical', iconName: 'AlertTriangle' },
      { id: 'biohazard', label: 'Untreated Infectious Waste Spill', severityDefault: 'high', iconName: 'Biohazard' },
      { id: 'radiation', label: 'Radiology Door Interlock / Shielding Defect', severityDefault: 'critical', iconName: 'Radioactive' },
      { id: 'violence', label: 'Patient Attendant Aggression', severityDefault: 'high', iconName: 'ShieldAlert' },
      { id: 'shift_exhaustion', label: 'Continuous Double Shift in ICU', severityDefault: 'high', iconName: 'Clock' },
    ],
    shiftPatterns: [
      { id: 'hosp_morn', name: 'Day Ward Shift (07:00 - 15:30)', startTime: '07:00', endTime: '15:30', isNightShift: false },
      { id: 'hosp_eve', name: 'Evening Ward Shift (15:00 - 23:30)', startTime: '15:00', endTime: '23:30', isNightShift: false },
      { id: 'hosp_night', name: 'Night Critical Shift (23:00 - 07:30)', startTime: '23:00', endTime: '07:30', isNightShift: true },
    ],
    rules: {
      regularShiftHours: 8,
      overtimeMultiplier: 2.0,
      maxDailyHours: 12,
      maxWeeklyHoursNormal: 48,
      maxWeeklyHoursCap: 60,
      minRestGapHours: 11, // stricter rest in medical
      nightShiftWindow: {
        startHour: 22,
        endHour: 6,
      },
      geofence: {
        name: 'Apollo Hospital Greams Road Campus',
        latitude: 13.0604,
        longitude: 80.2496,
        radiusMeters: 250,
      },
      qrSecretKey: 'fairshift_apollo_hospital_salt_77',
      defaultHourlyRate: 210, // ₹210/hr
    },
  },
};
