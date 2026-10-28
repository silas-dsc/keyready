import { useCallback, useEffect, useState } from 'react';
import { emptyProfile } from '../engine/profile';
import { sanitizeProfile } from '../engine/sanitize';
import type { Profile } from '../engine/types';
import { SITE } from '../sites';

// Per site: every GitHub Pages sub-site shares one origin, so one browser storage.
const KEY = `keyready:v1:${SITE.id}`;
const fresh = () => (SITE.wizard.defaults ?? (p => p))(emptyProfile());

export interface Saved {
  profile: Profile;
  /** Id of the question the user is on. */
  stepId: string | null;
  completed: boolean;
  /** Step ids the user has answered (so defaults don't look pre-selected). */
  answered: string[];
  updatedAt: number;
}

export function loadSaved(): Saved | null {
  try {
    const raw = localStorage.getItem(KEY);
    const s = raw ? (JSON.parse(raw) as Partial<Record<keyof Saved, unknown>> | null) : null;
    const profile = sanitizeProfile(s?.profile);
    if (!s || !profile) return null;
    return {
      profile,
      stepId: typeof s.stepId === 'string' ? s.stepId : null,
      completed: s.completed === true,
      answered: Array.isArray(s.answered) ? s.answered.filter((a): a is string => typeof a === 'string') : [],
      updatedAt: typeof s.updatedAt === 'number' ? s.updatedAt : Date.now(),
    };
  } catch {
    return null;
  }
}

function save(s: Saved) {
  try {
    localStorage.setItem(KEY, JSON.stringify(s));
  } catch {
    /* private mode — progress just won't persist */
  }
}

export function clearSaved() {
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* ignore */
  }
}

/** Single source of truth for the questionnaire, autosaved to this device. */
export function useSavedProfile() {
  const [state, setState] = useState<Saved>(() => loadSaved() ?? { profile: fresh(), stepId: null, completed: false, answered: [], updatedAt: Date.now() });

  useEffect(() => save(state), [state]);

  const update = useCallback((fn: (p: Profile) => Profile) => {
    setState(s => ({ ...s, profile: fn(s.profile), updatedAt: Date.now() }));
  }, []);
  const setStep = useCallback((stepId: string) => setState(s => ({ ...s, stepId })), []);
  const markAnswered = useCallback((id: string) => setState(s => (s.answered.includes(id) ? s : { ...s, answered: [...s.answered, id] })), []);
  const complete = useCallback(() => setState(s => ({ ...s, completed: true })), []);
  const replace = useCallback((profile: Profile) => setState(s => ({ ...s, profile, updatedAt: Date.now() })), []);
  const reset = useCallback(() => setState({ profile: fresh(), stepId: null, completed: false, answered: [], updatedAt: Date.now() }), []);

  return { ...state, update, setStep, markAnswered, complete, replace, reset };
}
