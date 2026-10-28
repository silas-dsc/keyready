import { sanitizeProfile } from './sanitize';
import type { Profile } from './types';

/** Profile ↔ URL-safe string, so an AI assistant (MCP) can hand a result over to the full web report. */
export function encodeProfile(p: Profile): string {
  const bytes = new TextEncoder().encode(JSON.stringify(p));
  let bin = '';
  bytes.forEach(b => (bin += String.fromCharCode(b)));
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

/** Lenient decode: unknown or missing fields fall back to defaults; returns null if unreadable. */
export function decodeProfile(s: string): Profile | null {
  try {
    const bin = atob(s.replace(/-/g, '+').replace(/_/g, '/'));
    return sanitizeProfile(JSON.parse(new TextDecoder().decode(Uint8Array.from(bin, c => c.charCodeAt(0)))));
  } catch {
    return null;
  }
}
