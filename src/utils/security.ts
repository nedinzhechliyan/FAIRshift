/**
 * Security and Verification Utilities for FairShift
 * Handles HMAC-signed short-lived QR tokens and Haversine geofence calculations.
 */

// Simple deterministic HMAC-SHA256 simulation using Web Crypto API or Node crypto
export async function createHmacToken(payload: string, secretKey: string): Promise<string> {
  if (typeof crypto !== 'undefined' && crypto.subtle) {
    const enc = new TextEncoder();
    const keyData = enc.encode(secretKey);
    const key = await crypto.subtle.importKey(
      'raw',
      keyData,
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );
    const signature = await crypto.subtle.sign('HMAC', key, enc.encode(payload));
    const hashArray = Array.from(new Uint8Array(signature));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('').slice(0, 32);
  } else {
    // Fallback simple hash for headless test environments
    let hash = 0;
    const combined = payload + ':' + secretKey;
    for (let i = 0; i < combined.length; i++) {
      hash = ((hash << 5) - hash) + combined.charCodeAt(i);
      hash |= 0;
    }
    return Math.abs(hash).toString(16).padStart(16, '0');
  }
}

/**
 * Generates a short-lived QR token valid for 60 seconds.
 * Format: siteId:expiryTimestamp:nonce:signature
 */
export async function generateSiteQrToken(siteId: string, secretKey: string, expirySeconds: number = 60): Promise<string> {
  const expiry = Date.now() + expirySeconds * 1000;
  const nonce = Math.random().toString(36).substring(2, 8);
  const payload = `${siteId}:${expiry}:${nonce}`;
  const sig = await createHmacToken(payload, secretKey);
  return `${payload}:${sig}`;
}

export interface QrVerificationResult {
  valid: boolean;
  siteId?: string;
  expiry?: number;
  reason?: 'expired' | 'tampered' | 'wrong_site' | 'malformed';
}

export async function verifySiteQrToken(
  token: string, 
  secretKey: string, 
  expectedSiteId?: string
): Promise<QrVerificationResult> {
  if (!token || typeof token !== 'string') {
    return { valid: false, reason: 'malformed' };
  }

  const parts = token.split(':');
  if (parts.length !== 4) {
    return { valid: false, reason: 'malformed' };
  }

  const [siteId, expiryStr, nonce, receivedSig] = parts;
  const expiry = parseInt(expiryStr, 10);
  if (isNaN(expiry)) {
    return { valid: false, reason: 'malformed' };
  }

  // 1. Check expiration (with 5-second grace window for slight network delay)
  if (Date.now() > expiry + 5000) {
    return { valid: false, reason: 'expired', siteId, expiry };
  }

  // 2. Check site match if expectedSiteId provided
  if (expectedSiteId && siteId !== expectedSiteId) {
    return { valid: false, reason: 'wrong_site', siteId, expiry };
  }

  // 3. Verify signature
  const payload = `${siteId}:${expiry}:${nonce}`;
  const expectedSig = await createHmacToken(payload, secretKey);
  if (receivedSig !== expectedSig) {
    return { valid: false, reason: 'tampered', siteId, expiry };
  }

  return { valid: true, siteId, expiry };
}

/**
 * Calculates Great-Circle distance between two coordinates in meters using the Haversine formula.
 */
export function haversineDistanceMeters(
  lat1: number, 
  lon1: number, 
  lat2: number, 
  lon2: number
): number {
  const R = 6371e3; // Earth radius in meters
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c);
}

export function isWithinGeofence(
  workerLat: number, 
  workerLon: number, 
  siteLat: number, 
  siteLon: number, 
  radiusMeters: number
): { inside: boolean; distanceMeters: number } {
  const distance = haversineDistanceMeters(workerLat, workerLon, siteLat, siteLon);
  return {
    inside: distance <= radiusMeters,
    distanceMeters: distance,
  };
}
