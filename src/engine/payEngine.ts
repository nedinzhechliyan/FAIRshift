import { SiteRules } from '../types';

export interface PayEngineInput {
  baseHourlyRate: number;
  totalHours: number;
  regularShiftHours?: number;       // Defaults to rules.regularShiftHours (e.g. 8)
  overtimeMultiplier?: number;      // Defaults to rules.overtimeMultiplier (e.g. 2.0)
  advanceDeduction?: number;        // e.g. 200
  statutoryDeductions?: number;     // e.g. PF / ESI if applicable
}

export interface PayEngineResult {
  regularHours: number;
  overtimeHours: number;
  totalHours: number;
  baseHourlyRate: number;
  overtimeMultiplier: number;
  regularPay: number;
  overtimePay: number;
  grossPay: number;
  advanceDeduction: number;
  statutoryDeductions: number;
  netPay: number;
  exceedsDailyCap: boolean;
  explanation: {
    regularPayText: string;
    overtimePayText: string;
    grossPayText: string;
    netPayText: string;
  };
}

/**
 * Deterministic Pay Engine for FairShift
 * Conforms strictly to statutory rules (e.g. Indian Factories Act 2x overtime rate).
 * The LLM never computes pay or hours; this engine is authoritative.
 */
export function calculateShiftPay(
  input: PayEngineInput,
  siteRules?: Partial<SiteRules>
): PayEngineResult {
  const standardRegularHours = input.regularShiftHours ?? siteRules?.regularShiftHours ?? 8;
  const otMultiplier = input.overtimeMultiplier ?? siteRules?.overtimeMultiplier ?? 2.0;
  const maxDaily = siteRules?.maxDailyHours ?? 12;

  const totalHoursClamped = Math.max(0, Math.round(input.totalHours * 100) / 100);
  const exceedsDailyCap = totalHoursClamped > maxDaily;

  // Split hours into regular and overtime
  const regularHours = Math.min(totalHoursClamped, standardRegularHours);
  const overtimeHours = Math.max(0, Math.round((totalHoursClamped - regularHours) * 100) / 100);

  // Exact calculations rounded to 2 decimal places
  const baseRate = input.baseHourlyRate;
  const regularPay = Math.round(regularHours * baseRate * 100) / 100;
  const overtimePay = Math.round(overtimeHours * (baseRate * otMultiplier) * 100) / 100;
  const grossPay = Math.round((regularPay + overtimePay) * 100) / 100;

  const advanceDeduction = Math.max(0, Math.round((input.advanceDeduction ?? 0) * 100) / 100);
  const statutoryDeductions = Math.max(0, Math.round((input.statutoryDeductions ?? 0) * 100) / 100);

  // Net cannot drop below 0
  const netPay = Math.max(0, Math.round((grossPay - advanceDeduction - statutoryDeductions) * 100) / 100);

  return {
    regularHours,
    overtimeHours,
    totalHours: totalHoursClamped,
    baseHourlyRate: baseRate,
    overtimeMultiplier: otMultiplier,
    regularPay,
    overtimePay,
    grossPay,
    advanceDeduction,
    statutoryDeductions,
    netPay,
    exceedsDailyCap,
    explanation: {
      regularPayText: `${regularHours} hrs @ ₹${baseRate}/hr = ₹${regularPay.toLocaleString('en-IN')}`,
      overtimePayText: overtimeHours > 0 
        ? `${overtimeHours} hrs @ ₹${baseRate * otMultiplier}/hr (${otMultiplier}x) = ₹${overtimePay.toLocaleString('en-IN')}`
        : '0 hrs OT = ₹0',
      grossPayText: `₹${regularPay} + ₹${overtimePay} = ₹${grossPay.toLocaleString('en-IN')}`,
      netPayText: `₹${grossPay} - ₹${advanceDeduction} advance = ₹${netPay.toLocaleString('en-IN')}`,
    },
  };
}

/**
 * Calculates shift duration in decimal hours between check-in and check-out timestamps
 */
export function calculateDurationHours(checkInTime: string | Date, checkOutTime: string | Date): number {
  const t1 = new Date(checkInTime).getTime();
  const t2 = new Date(checkOutTime).getTime();
  if (isNaN(t1) || isNaN(t2) || t2 < t1) return 0;
  const diffHours = (t2 - t1) / (1000 * 60 * 60);
  return Math.round(diffHours * 100) / 100;
}
