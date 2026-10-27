import { SectorType } from '../types';

export const UNAMBIGUOUS_CODE_ALPHABET = '23456789ABCDEFGHJKMNPQRSTUVWXYZ'; // 31 chars, no 0/O/1/I/L

/**
 * Generates an unambiguous, cryptographically secure 4-character case code.
 * Format: RPT-XXXX (e.g. RPT-4K92)
 */
export function generateCaseCode(existingCodes?: Set<string>): string {
  let code = '';
  do {
    let suffix = '';
    if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
      const bytes = new Uint8Array(4);
      crypto.getRandomValues(bytes);
      for (let i = 0; i < 4; i++) {
        suffix += UNAMBIGUOUS_CODE_ALPHABET[bytes[i] % UNAMBIGUOUS_CODE_ALPHABET.length];
      }
    } else {
      for (let i = 0; i < 4; i++) {
        suffix += UNAMBIGUOUS_CODE_ALPHABET[Math.floor(Math.random() * UNAMBIGUOUS_CODE_ALPHABET.length)];
      }
    }
    code = `RPT-${suffix}`;
  } while (existingCodes && existingCodes.has(code));

  return code;
}

/**
 * Rounds a timestamp to the exact hour for privacy & anonymity.
 * Prevents correlating reports with CCTV, gate logs, or precise shift events.
 */
export function roundToHour(dateOrIso?: string | Date): string {
  const d = dateOrIso ? new Date(dateOrIso) : new Date();
  const ms = d.getTime();
  const roundedMs = Math.floor(ms / (60 * 60 * 1000)) * (60 * 60 * 1000);
  return new Date(roundedMs).toISOString();
}

/**
 * Sector-specific subcategory taxonomies
 */
export const SECTOR_TAXONOMIES: Record<SectorType, string[]> = {
  construction: ['scaffolding', 'electrical', 'ppe', 'falls', 'heavy machinery', 'other'],
  campus: ['electrical', 'slips', 'chemicals', 'security', 'other'],
  hospital: ['sharps', 'infection control', 'patient handling', 'other'],
};

/**
 * Maps a subcategory to an allowed taxonomy item, mapping unknown values to "other".
 */
export function normalizeSubcategory(subcat: string, sector: SectorType): { normalized: string; wasMappedToOther: boolean } {
  const clean = (subcat || '').trim().toLowerCase();
  const allowed = SECTOR_TAXONOMIES[sector] || SECTOR_TAXONOMIES.construction;

  for (const item of allowed) {
    if (clean.includes(item) || item.includes(clean)) {
      return { normalized: item, wasMappedToOther: false };
    }
  }

  // Specialized synonyms
  if (/scaffold|मचान|சாரக்கட்டு/i.test(clean)) return { normalized: 'scaffolding', wasMappedToOther: false };
  if (/electric|wire|shock|करंट|மின்சாரம்/i.test(clean)) return { normalized: 'electrical', wasMappedToOther: false };
  if (/chemical|acid|solvent|கெமிக்கல்/i.test(clean)) return { normalized: 'chemicals', wasMappedToOther: false };
  if (/sharp|needle|scalpel|ஊசி/i.test(clean)) return { normalized: 'sharps', wasMappedToOther: false };

  return { normalized: 'other', wasMappedToOther: true };
}

/**
 * Deterministic Safety Floor Rule Engine
 * Ensures that high-risk hazards (fire, collapse, electrical shock, falling from height, gas leaks)
 * are NEVER downgraded by LLM output or prompt injection.
 * The model can raise severity to critical, but can never lower it below the rule floor.
 */
const HIGH_RISK_KEYWORDS = [
  // English
  'fire', 'collapse', 'electric shock', 'exposed wire', 'fall from height', 'falling object',
  'gas leak', 'bleeding', 'unconscious', 'scaffold', 'scaffolding', 'trench cave', 'crane',
  'vibrat', 'hazard', 'danger', 'shaking', 'falling',
  // Hindi
  'आग', 'गिरना', 'गिरने', 'करंट', 'बिजली', 'झटका', 'मचान', 'गैस लीक', 'बेहोश', 'खून', 'खतरा',
  // Tamil
  'தீ', 'விபத்து', 'மின்சாரம்', 'கீழே விழுதல்', 'விழும்', 'சாரக்கட்டு', 'வாயு கசிவு', 'மயக்கம்', 'இரத்தம்', 'ஆபத்து', 'ஆபத்தான'
];

export interface SafetyFloorResult {
  severity: 'low' | 'medium' | 'high' | 'critical';
  urgent: boolean;
  floorTriggered: boolean;
  overridden: boolean;
  matchedKeyword?: string;
}

export function applySafetyFloor(
  arg1: string,
  arg2: 'low' | 'medium' | 'high' | 'critical' | boolean,
  arg3: boolean | string
): SafetyFloorResult {
  let text = '';
  let modelSeverity: 'low' | 'medium' | 'high' | 'critical' = 'low';
  let modelUrgent = false;

  // Flexible argument order: (text, severity, urgent) or (severity, urgent, text)
  if (['low', 'medium', 'high', 'critical'].includes(arg1)) {
    modelSeverity = arg1 as 'low' | 'medium' | 'high' | 'critical';
    modelUrgent = Boolean(arg2);
    text = String(arg3 || '');
  } else {
    text = String(arg1 || '');
    modelSeverity = (typeof arg2 === 'string' && ['low', 'medium', 'high', 'critical'].includes(arg2) ? arg2 : 'low') as 'low' | 'medium' | 'high' | 'critical';
    modelUrgent = Boolean(arg3);
  }

  const cleanText = text.toLowerCase();

  let matchedKeyword: string | undefined;
  for (const kw of HIGH_RISK_KEYWORDS) {
    if (cleanText.includes(kw.toLowerCase())) {
      matchedKeyword = kw;
      break;
    }
  }

  // If high-risk keyword matched, floor is at least "high" and urgent = true
  if (matchedKeyword) {
    const finalSeverity: 'low' | 'medium' | 'high' | 'critical' = 
      modelSeverity === 'critical' ? 'critical' : 'high';
    const isOverridden = modelSeverity === 'low' || modelSeverity === 'medium' || !modelUrgent;
    return {
      severity: finalSeverity,
      urgent: true,
      floorTriggered: isOverridden,
      overridden: isOverridden,
      matchedKeyword,
    };
  }

  return {
    severity: modelSeverity,
    urgent: modelUrgent,
    floorTriggered: false,
    overridden: false,
  };
}
