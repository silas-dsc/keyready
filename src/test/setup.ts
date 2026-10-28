// Shared setup for DOM tests (files that opt in with `// @vitest-environment jsdom`).
import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach, vi } from 'vitest';

if (typeof window !== 'undefined') {
  afterEach(() => {
    cleanup();
    localStorage.clear();
  });
  // jsdom lacks these browser APIs, which the UI (framer-motion, reduced-motion checks) uses.
  window.matchMedia ??= vi.fn().mockImplementation((query: string) => ({
    matches: false, media: query, onchange: null,
    addEventListener: vi.fn(), removeEventListener: vi.fn(), addListener: vi.fn(), removeListener: vi.fn(), dispatchEvent: vi.fn(),
  }));
  window.scrollTo = vi.fn() as typeof window.scrollTo;
  globalThis.IntersectionObserver ??= class { observe() {} unobserve() {} disconnect() {} takeRecords() { return []; } root = null; rootMargin = ''; thresholds = []; } as unknown as typeof IntersectionObserver;
  globalThis.ResizeObserver ??= class { observe() {} unobserve() {} disconnect() {} } as unknown as typeof ResizeObserver;
}
