import { emptyProfile } from './profile';
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
    const p = JSON.parse(new TextDecoder().decode(Uint8Array.from(bin, c => c.charCodeAt(0)))) as Partial<Profile>;
    if (!Array.isArray(p.applicants) || p.applicants.length === 0) return null;
    const base = emptyProfile();
    return { ...base, ...p, applicants: p.applicants.slice(0, 2).map(a => ({ ...base.applicants[0], ...a })) };
  } catch {
    return null;
  }
}
