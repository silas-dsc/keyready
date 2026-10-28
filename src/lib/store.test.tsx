// @vitest-environment jsdom
import { act, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { emptyProfile } from '../engine/profile';
import { SITE } from '../sites';
import { clearSaved, loadSaved, useSavedProfile } from './store';

const KEY = `keyready:v1:${SITE.id}`;
const put = (v: unknown) => localStorage.setItem(KEY, JSON.stringify(v));

afterEach(() => {
  vi.restoreAllMocks();
  vi.useRealTimers();
});

describe('loadSaved', () => {
  it('returns null when nothing (or nothing usable) is saved', () => {
    expect(loadSaved()).toBeNull();
    localStorage.setItem(KEY, 'null');
    expect(loadSaved()).toBeNull();
    put({ profile: 'broken' });
    expect(loadSaved()).toBeNull();
    localStorage.setItem(KEY, '{not json');
    expect(loadSaved()).toBeNull();
  });

  it('reads a full save back', () => {
    const profile = { ...emptyProfile(), price: 700000 };
    put({ profile, stepId: 'price', completed: true, answered: ['a', 3, 'b'], updatedAt: 42 });
    expect(loadSaved()).toEqual({ profile, stepId: 'price', completed: true, answered: ['a', 'b'], updatedAt: 42 });
  });

  it('defaults malformed fields', () => {
    vi.useFakeTimers({ now: 1000 });
    put({ profile: emptyProfile(), stepId: 5, completed: 'yes', answered: 'a', updatedAt: 'x' });
    expect(loadSaved()).toEqual({ profile: emptyProfile(), stepId: null, completed: false, answered: [], updatedAt: 1000 });
  });
});

describe('clearSaved', () => {
  it('removes the save, and ignores blocked storage', () => {
    put({ profile: emptyProfile() });
    clearSaved();
    expect(localStorage.getItem(KEY)).toBeNull();
    vi.spyOn(Storage.prototype, 'removeItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    expect(() => clearSaved()).not.toThrow();
  });
});

describe('useSavedProfile', () => {
  it('starts blank, autosaves every change and resets', () => {
    const { result } = renderHook(() => useSavedProfile());
    expect(result.current).toMatchObject({ profile: emptyProfile(), stepId: null, completed: false, answered: [] });
    expect(JSON.parse(localStorage.getItem(KEY)!).stepId).toBeNull();

    act(() => result.current.update(p => ({ ...p, price: 900000 })));
    expect(result.current.profile.price).toBe(900000);
    act(() => result.current.setStep('loan'));
    act(() => result.current.markAnswered('price'));
    act(() => result.current.markAnswered('price'));
    act(() => result.current.markAnswered('loan'));
    act(() => result.current.complete());
    expect(result.current).toMatchObject({ stepId: 'loan', answered: ['price', 'loan'], completed: true });
    expect(loadSaved()).toMatchObject({ stepId: 'loan', answered: ['price', 'loan'], completed: true, profile: { price: 900000 } });

    act(() => result.current.replace({ ...emptyProfile(), savings: 5 }));
    expect(result.current.profile.savings).toBe(5);
    expect(result.current.profile.price).toBe(0);

    act(() => result.current.reset());
    expect(result.current).toMatchObject({ profile: emptyProfile(), stepId: null, completed: false, answered: [] });
  });

  it('resumes from a previous save', () => {
    put({ profile: { ...emptyProfile(), loan: 400000 }, stepId: 'state', completed: false, answered: ['loan'], updatedAt: 1 });
    const { result } = renderHook(() => useSavedProfile());
    expect(result.current).toMatchObject({ stepId: 'state', answered: ['loan'], profile: { loan: 400000 } });
  });

  it('applies the site’s wizard defaults to a fresh profile', () => {
    const orig = SITE.wizard.defaults;
    SITE.wizard.defaults = p => ({ ...p, state: 'QLD' });
    try {
      const { result } = renderHook(() => useSavedProfile());
      expect(result.current.profile.state).toBe('QLD');
    } finally {
      SITE.wizard.defaults = orig;
    }
  });

  it('keeps working when storage is blocked', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('private mode');
    });
    const { result } = renderHook(() => useSavedProfile());
    act(() => result.current.setStep('x'));
    expect(result.current.stepId).toBe('x');
  });
});
