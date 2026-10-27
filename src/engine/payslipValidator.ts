import { PayEngineResult } from './payEngine';
import { formatINR } from '../utils/formatCurrency';

export interface PayslipTextValidationResult {
  valid: boolean;
  reason?: string;
  sanitizedText: string;
}

/**
 * Validates that every numeric rupee figure mentioned in an AI-generated explanation
 * corresponds strictly to an authoritative engine number.
 * If any unauthorized or hallucinatory number is detected, returns valid: false.
 */
export function validatePayslipExplanation(
  aiGeneratedText: string,
  engine: PayEngineResult,
  language: 'en' | 'hi' | 'ta' = 'en'
): PayslipTextValidationResult {
  if (!aiGeneratedText || typeof aiGeneratedText !== 'string' || aiGeneratedText.trim().length === 0) {
    return {
      valid: false,
      reason: 'Empty explanation text',
      sanitizedText: getDeterministicPayslipTemplate(engine, language),
    };
  }

  // Permitted numeric values from the deterministic engine
  const permittedNumbers = new Set<number>([
    engine.baseHourlyRate,
    engine.regularHours,
    engine.overtimeHours,
    engine.regularPay,
    engine.overtimePay,
    engine.grossPay,
    engine.advanceDeduction,
    engine.statutoryDeductions,
    engine.netPay,
    engine.totalHours,
    engine.overtimeMultiplier,
    2, // 2x multiplier
    0, // 0 deductions
  ]);

  // Extract all standalone numbers (excluding punctuation like dates or hours like 8h)
  // Match currency tokens: ₹1,780, 1780, 1,980, 1980, 200, 1440, 540, etc.
  const regex = /(?:₹|Rs\.?|INR)?\s*([0-9]+(?:,[0-9]+)*(?:\.[0-9]+)?)/gi;
  let match;
  const foundNumbers: number[] = [];

  while ((match = regex.exec(aiGeneratedText)) !== null) {
    const rawNumStr = match[1].replace(/,/g, '');
    const num = parseFloat(rawNumStr);
    if (!isNaN(num)) {
      foundNumbers.push(num);
    }
  }

  // Check each detected number against permitted deterministic figures
  for (const num of foundNumbers) {
    // Check if within floating point tolerance of any permitted number
    let matched = false;
    for (const permitted of permittedNumbers) {
      if (Math.abs(num - permitted) < 0.05) {
        matched = true;
        break;
      }
    }

    if (!matched) {
      return {
        valid: false,
        reason: `Unauthorized number detected in text: ${num}. Did not match deterministic pay calculation.`,
        sanitizedText: getDeterministicPayslipTemplate(engine, language),
      };
    }
  }

  return {
    valid: true,
    sanitizedText: aiGeneratedText.trim(),
  };
}

/**
 * Deterministic template fallback in English, Hindi, and Tamil.
 * Guaranteed to reflect only the authoritative pay engine figures with zero hallucinations.
 */
export function getDeterministicPayslipTemplate(
  engine: PayEngineResult,
  language: 'en' | 'hi' | 'ta' = 'en'
): string {
  const regularFormatted = formatINR(engine.regularPay);
  const otFormatted = formatINR(engine.overtimePay);
  const grossFormatted = formatINR(engine.grossPay);
  const advFormatted = formatINR(engine.advanceDeduction);
  const netFormatted = formatINR(engine.netPay);

  if (language === 'hi') {
    return `आज आपने ${engine.regularHours} नियमित घंटे काम करके ${regularFormatted} कमाए। ${engine.overtimeHours} घंटे के 2x दर ओवरटाइम से ${otFormatted} मिले, जिससे कुल कमाई ${grossFormatted} हुई। ${advFormatted} की अग्रिम कटौती के बाद आपके हाथ में शुद्ध ${netFormatted} आया। यदि कोई विसंगति है, तो नीचे 'आपत्ति दर्ज करें' दबाएं।`;
  }

  if (language === 'ta') {
    return `இன்று நீங்கள் ${engine.regularHours} வழக்கமான மணிநேரம் உழைத்து ${regularFormatted} ஈட்டினீர்கள். ${engine.overtimeHours} மணி கூடுதல் நேரத்திற்கு 2x மடங்கு வீதத்தில் ${otFormatted} கிடைத்தது. மொத்த வருவாய் ${grossFormatted}. ${advFormatted} முன்பணம் பிடித்தம் போக நிகர ஊதியம் ${netFormatted}. ஏதேனும் முரண்பாடு இருப்பின் 'ஊதிய முரண்பாட்டை பதிவுசெய்' என்பதைத் தொடவும்.`;
  }

  return `Today you completed ${engine.regularHours} regular hours earning ${regularFormatted}. You earned ${otFormatted} for ${engine.overtimeHours} overtime hours at 2x statutory rate, making gross pay ${grossFormatted}. After ${advFormatted} advance recovery, your net take-home pay is ${netFormatted}. If you disagree with these figures, tap 'Raise Payment Issue' below.`;
}
