/**
 * FairShift Platform Named Constants
 * Centralized configuration eliminating magic numbers across engines and APIs.
 */

export const CONSTANTS = {
  // Privacy & Anonymity Standards
  K_ANONYMITY_THRESHOLD: 5,             // Minimum reports required in a zone/breakdown before revealing counts
  CASE_CODE_SUFFIX_LENGTH: 4,          // Format: RPT-XXXX (4 CSPRNG chars)
  TEMPORAL_COARSENING_WINDOW_MS: 3600000, // 1 hour in ms (prevents time correlation with CCTV)
  
  // Statutory Shift & Pay Norms (Factories Act / Building & Construction Workers Act)
  STANDARD_SHIFT_HOURS: 8,
  STATUTORY_OVERTIME_MULTIPLIER: 2.0,
  DEFAULT_HOURLY_RATE_INR: 180,
  MAX_DAILY_HOURS_CAP: 12,
  MAX_WEEKLY_HOURS_CAP: 60,
  MIN_REST_GAP_HOURS: 10,

  // Fatigue & Physiological Risk Engine Thresholds
  FATIGUE_BAND_GREEN_MAX: 39,
  FATIGUE_BAND_AMBER_MAX: 69,
  FATIGUE_BAND_RED_MIN: 70,
  FATIGUE_WEEKLY_HOURS_SATURATION: 60,
  FATIGUE_CONSECUTIVE_DAYS_SATURATION: 6,
  FATIGUE_NIGHT_SHIFTS_SATURATION: 4,
  FATIGUE_LONGEST_SHIFT_SATURATION: 12,

  // Security, Session & Rate Limiting
  SESSION_COOKIE_MAX_AGE_MS: 7 * 24 * 60 * 60 * 1000, // 7 days
  AI_RATE_LIMIT_PER_MINUTE: 20,
  REPORT_RATE_LIMIT_PER_MINUTE: 15,
  AI_CALL_TIMEOUT_MS: 10000,
  AI_MIN_CONFIDENCE_THRESHOLD: 0.6,

  // Accessibility (WCAG 2.1 AA)
  MIN_TOUCH_TARGET_PX: 56,
  MIN_CONTRAST_RATIO: 4.5,
} as const;
