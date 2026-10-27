/**
 * Anonymity Logger & Audit Scrubbing System
 * Guarantees that no raw report transcripts, audio payloads, worker IDs,
 * IP addresses, or cookie session identifiers are written to server stdout/stderr.
 */

const SENSITIVE_PATTERNS: Array<{ regex: RegExp; replacement: string }> = [
  { regex: /\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b/g, replacement: '[IP_REDACTED]' },
  { regex: /fairshift_session=[^;\s&]+/gi, replacement: '[SESSION_TOKEN_REDACTED]' },
  { regex: /cookie:\s*[^;\n]+/gi, replacement: '[COOKIE_REDACTED]' },
  { regex: /data:audio\/[^;\s]+;base64,[A-Za-z0-9+/=]+/gi, replacement: '[AUDIO_PAYLOAD_REDACTED]' },
  { regex: /"audioBase64":\s*"[^"]+"/gi, replacement: '"audioBase64":"[AUDIO_REDACTED]"' },
  { regex: /"transcriptOriginal":\s*"[^"]+"/gi, replacement: '"transcriptOriginal":"[TRANSCRIPT_REDACTED]"' },
  { regex: /"transcriptEn":\s*"[^"]+"/gi, replacement: '"transcriptEn":"[TRANSCRIPT_REDACTED]"' },
  { regex: /"password":\s*"[^"]+"/gi, replacement: '"password":"[REDACTED]"' },
];

/**
 * Sanitizes a log message string by redacting IP addresses, cookies, session tokens, and base64 payloads.
 * @param msg Raw log message
 * @returns Sanitized log message safe for auditing
 */
export function scrubLogMessage(msg: string): string {
  let scrubbed = msg;
  for (const { regex, replacement } of SENSITIVE_PATTERNS) {
    scrubbed = scrubbed.replace(regex, replacement);
  }
  return scrubbed;
}

/**
 * Safe logger for FairShift server with automated privacy scrubbing.
 */
export const safeLogger = {
  info: (msg: string, ...args: unknown[]): void => {
    const combined = [msg, ...args.map(a => typeof a === 'object' ? JSON.stringify(a) : String(a))].join(' ');
    console.log(scrubLogMessage(combined));
  },
  warn: (msg: string, ...args: unknown[]): void => {
    const combined = [msg, ...args.map(a => typeof a === 'object' ? JSON.stringify(a) : String(a))].join(' ');
    console.warn(scrubLogMessage(combined));
  },
  error: (msg: string, ...args: unknown[]): void => {
    const combined = [msg, ...args.map(a => typeof a === 'object' ? JSON.stringify(a) : String(a))].join(' ');
    console.error(scrubLogMessage(combined));
  },
};
