// @vitest-environment jsdom
import { act, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { emptyProfile } from '../engine/profile';
import type { Lead } from '../lib/leads';
import { SITES } from '../sites';
import Broker from './Broker';

const m = vi.hoisted(() => {
  const state = { mode: 'local' as 'local' | 'supabase', client: null as unknown };
  return {
    state,
    claimBroker: vi.fn(),
    listLeads: vi.fn(),
    setLeadStatus: vi.fn(),
    getSupabase: vi.fn(),
  };
});

vi.mock('../lib/leads', () => ({
  get backendMode() {
    return m.state.mode;
  },
  LEAD_STATUSES: ['new', 'contacted', 'application', 'approved', 'settled', 'lost'],
  claimBroker: m.claimBroker,
  listLeads: m.listLeads,
  setLeadStatus: m.setLeadStatus,
  getSupabase: m.getSupabase,
}));

function lead(over: Partial<Lead> & { id: string }): Lead {
  return {
    created_at: '2026-05-01T02:30:00Z',
    name: `Lead ${over.id}`,
    email: `${over.id}@example.com`,
    phone: '0400 000 000',
    preferred_time: 'Mornings',
    consent: true,
    profile: { ...emptyProfile(), loan: 520000, price: 650000, savings: 130000, applicants: [{ ...emptyProfile().applicants[0], baseIncome: 120000, employment: 'part_time' }] },
    summary: { ready: 4, close: 2, lenders: 20, lvr: 80, borrowingPower: 610000, topLenders: ['Bank A', 'Bank B'], stampDuty: 25000, fhog: 10000, schemeEligible: false },
    site: 'core',
    segment: '',
    channel: 'web',
    attribution: { utm_source: 'google', utm_campaign: 'spring' },
    ...over,
  };
}

const renderBroker = () => render(<MemoryRouter><Broker /></MemoryRouter>);
const row = (name: string) => screen.getByText(name).closest('li')!;

function fakeClient(session: unknown) {
  const unsubscribe = vi.fn();
  let listener: (e: string, s: unknown) => void = () => {};
  const client = {
    auth: {
      getSession: vi.fn(async () => ({ data: { session } })),
      onAuthStateChange: vi.fn((cb: typeof listener) => {
        listener = cb;
        return { data: { subscription: { unsubscribe } } };
      }),
      signInWithOtp: vi.fn(async () => ({ error: null as null | { message: string } })),
    },
  };
  return { client, unsubscribe, emit: (s: unknown) => listener('SIGNED_IN', s) };
}

beforeEach(() => {
  m.state.mode = 'local';
  m.claimBroker.mockReset().mockResolvedValue({ name: 'Demo broker' });
  m.listLeads.mockReset().mockResolvedValue([]);
  m.setLeadStatus.mockReset().mockResolvedValue(undefined);
  m.getSupabase.mockReset().mockReturnValue(null);
});

describe('Broker (local demo mode)', () => {
  it('shows the demo banner, loading, then the empty state', async () => {
    let resolve!: (l: Lead[]) => void;
    m.listLeads.mockReturnValue(new Promise(r => (resolve = r)));
    renderBroker();
    expect(screen.getByText(/Demo mode: showing leads submitted from this browser/)).toBeInTheDocument();
    expect(await screen.findByText('Loading…')).toBeInTheDocument();
    await act(async () => resolve([]));
    expect(screen.getByRole('heading', { name: 'Your referrals', level: 1 })).toBeInTheDocument();
    expect(screen.getByText('No leads yet.')).toBeInTheDocument();
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
  });

  it('lists leads with the per-site conversion table', async () => {
    m.listLeads.mockResolvedValue([
      lead({ id: '1', site: 'core', status: 'settled' }),
      lead({ id: '2', site: 'core', status: 'contacted' }),
      lead({ id: '3', site: 'nurses', status: 'lost', channel: 'mcp' }),
      lead({ id: '4', site: 'nurses' }),
      lead({ id: '5', site: 'mystery-site', status: 'application' }),
      lead({ id: '6', site: undefined as unknown as string, status: 'new' }),
    ]);
    renderBroker();
    const table = await screen.findByRole('region', { name: 'Conversion by site' });
    const rows = within(table).getAllByRole('row').slice(1).map(r => within(r).getAllByRole('cell').map(c => c.textContent));
    expect(rows).toEqual([
      [SITES.core.name, '3', '2', '1', '0', '33%'],
      [SITES.nurses.name, '2', '0', '0', '1', '0%'],
      ['mystery-site', '1', '1', '0', '0', '0%'],
    ]);
    expect(within(row('Lead 3')).getByText(/via AI assistant/)).toBeInTheDocument();
    expect(within(row('Lead 1')).queryByText(/via AI assistant/)).not.toBeInTheDocument();
    expect(within(row('Lead 5')).getByText(/mystery-site/)).toBeInTheDocument();
    expect(within(row('Lead 6')).getByText(/KeyReady/)).toBeInTheDocument();
    expect(within(row('Lead 1')).getByRole('button', { name: 'settled' })).toHaveAttribute('aria-pressed', 'true');
    expect(within(row('Lead 4')).getByRole('button', { name: 'new' })).toHaveAttribute('aria-pressed', 'true');
    expect(within(row('Lead 6')).getByRole('button', { name: 'new' })).toHaveAttribute('aria-pressed', 'true');
  });

  it('colours each lead by how many lenders it fits', async () => {
    m.listLeads.mockResolvedValue([
      lead({ id: 'r' }),
      lead({ id: 'c', summary: { ...lead({ id: 'x' }).summary, ready: 0, close: 3 } }),
      lead({ id: 'n', summary: { ...lead({ id: 'x' }).summary, ready: 0, close: 0 } }),
    ]);
    renderBroker();
    expect(within(await screen.findByText('Lead r').then(e => e.closest('li')!)).getByText('4 ready · 2 close')).toBeInTheDocument();
    expect(within(row('Lead c')).getByText('0 ready · 3 close')).toBeInTheDocument();
    expect(within(row('Lead n')).getByText('0 ready · 0 close')).toBeInTheDocument();
  });

  it('expands and collapses a lead’s details', async () => {
    m.listLeads.mockResolvedValue([
      lead({ id: '1' }),
      lead({
        id: '2',
        attribution: {},
        profile: { ...emptyProfile(), mode: 'joint', firstHome: false },
        summary: { ...lead({ id: 'x' }).summary, topLenders: [], stampDuty: undefined as unknown as number, fhog: 0 },
      }),
    ]);
    const user = userEvent.setup();
    renderBroker();
    const toggle = (await screen.findByText('Lead 1')).closest('button')!;
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    await user.click(toggle);
    expect(toggle).toHaveAttribute('aria-expanded', 'true');
    const dl = () => row('Lead 1').querySelector('dl')!;
    const value = (scope: HTMLElement, k: string) => within(scope).getByText(k).nextElementSibling!.textContent;
    expect(value(dl(), 'Email')).toBe('1@example.com');
    expect(value(dl(), 'Applicants')).toBe('Solo');
    expect(value(dl(), 'First home')).toBe('Yes');
    expect(value(dl(), 'Employment (B1)')).toBe('part time');
    expect(value(dl(), 'Closest fits')).toBe('Bank A, Bank B');
    expect(value(dl(), 'Source')).toBe('google · spring');
    expect(value(dl(), 'Grant')).not.toBe('—');
    expect(value(dl(), 'Stamp duty')).not.toBe('—');

    const toggle2 = row('Lead 2').querySelector('button')!;
    await user.click(toggle2);
    expect(row('Lead 1').querySelector('dl')).toBeNull();
    const dl2 = row('Lead 2').querySelector('dl')!;
    expect(value(dl2, 'Applicants')).toBe('Joint');
    expect(value(dl2, 'First home')).toBe('No');
    expect(value(dl2, 'Closest fits')).toBe('—');
    expect(value(dl2, 'Source')).toBe('Direct');
    expect(value(dl2, 'Stamp duty')).toBe('—');
    expect(value(dl2, 'Grant')).toBe('—');

    await user.click(toggle2);
    expect(row('Lead 2').querySelector('dl')).toBeNull();
  });

  it('records an outcome and updates the table', async () => {
    m.listLeads.mockResolvedValue([lead({ id: '1' }), lead({ id: '2' })]);
    renderBroker();
    await userEvent.click(within(await screen.findByText('Lead 1').then(e => e.closest('li')!)).getByRole('button', { name: 'settled' }));
    expect(m.setLeadStatus).toHaveBeenCalledWith('1', 'settled');
    expect(within(row('Lead 1')).getByRole('button', { name: 'settled' })).toHaveAttribute('aria-pressed', 'true');
    expect(within(row('Lead 2')).getByRole('button', { name: 'new' })).toHaveAttribute('aria-pressed', 'true');
    const cells = within(screen.getByRole('region', { name: 'Conversion by site' })).getAllByRole('cell').map(c => c.textContent);
    expect(cells).toEqual([SITES.core.name, '2', '1', '1', '0', '50%']);
  });

  it('shows an error when recording an outcome fails', async () => {
    m.listLeads.mockResolvedValue([lead({ id: '1' })]);
    m.setLeadStatus.mockRejectedValue(new Error('Could not save status'));
    renderBroker();
    await userEvent.click(within(await screen.findByText('Lead 1').then(e => e.closest('li')!)).getByRole('button', { name: 'lost' }));
    expect(await screen.findByText('Could not save status')).toBeInTheDocument();
  });

  it('shows load errors', async () => {
    m.listLeads.mockRejectedValue(new Error('Network down'));
    renderBroker();
    expect(await screen.findByText('Network down')).toBeInTheDocument();
  });
});

describe('Broker (Supabase mode)', () => {
  beforeEach(() => {
    m.state.mode = 'supabase';
  });

  it('asks a signed-out broker to sign in by email', async () => {
    const f = fakeClient(null);
    m.getSupabase.mockReturnValue(Promise.resolve(f.client));
    const user = userEvent.setup();
    renderBroker();
    expect(screen.queryByText(/Demo mode/)).not.toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Broker sign in', level: 1 })).toBeInTheDocument();
    // A sign-in page only: no pitch about leads to anyone who opens it.
    expect(screen.queryByText(/lead|pre-qualified/i)).not.toBeInTheDocument();
    await user.type(screen.getByPlaceholderText('you@brokerage.com.au'), 'pat@broker.com.au');
    await user.click(screen.getByRole('button', { name: 'Email me a sign-in link' }));
    expect(await screen.findByText('Check your inbox for a sign-in link.')).toBeInTheDocument();
    expect(f.client.auth.signInWithOtp).toHaveBeenCalledWith({ email: 'pat@broker.com.au', options: { emailRedirectTo: window.location.href } });
    expect(m.claimBroker).not.toHaveBeenCalled();
  });

  it('shows sign-in errors', async () => {
    const f = fakeClient(null);
    f.client.auth.signInWithOtp.mockResolvedValue({ error: { message: 'Rate limited' } });
    m.getSupabase.mockReturnValue(Promise.resolve(f.client));
    const user = userEvent.setup();
    renderBroker();
    await user.type(screen.getByPlaceholderText('you@brokerage.com.au'), 'pat@broker.com.au');
    await user.click(screen.getByRole('button', { name: 'Email me a sign-in link' }));
    // The error only shows once signed in; the form stays up without the "sent" message.
    await vi.waitFor(() => expect(f.client.auth.signInWithOtp).toHaveBeenCalled());
    expect(screen.queryByText('Check your inbox for a sign-in link.')).not.toBeInTheDocument();
    await act(async () => f.emit({ user: {} }));
    expect(await screen.findByText('Rate limited')).toBeInTheDocument();
  });

  it('loads leads for a signed-in broker and unsubscribes on unmount', async () => {
    const f = fakeClient({ user: { id: 'u' } });
    m.getSupabase.mockReturnValue(Promise.resolve(f.client));
    m.listLeads.mockResolvedValue([lead({ id: '1' })]);
    const { unmount } = renderBroker();
    expect(await screen.findByText('Lead 1')).toBeInTheDocument();
    expect(m.claimBroker).toHaveBeenCalled();
    unmount();
    expect(f.unsubscribe).toHaveBeenCalled();
  });

  it('reacts to sign-out', async () => {
    const f = fakeClient({ user: { id: 'u' } });
    m.getSupabase.mockReturnValue(Promise.resolve(f.client));
    renderBroker();
    expect(await screen.findByText('No leads yet.')).toBeInTheDocument();
    await act(async () => f.emit(null));
    expect(screen.getByRole('heading', { name: 'Broker sign in' })).toBeInTheDocument();
  });

  it('tells an account that isn’t a broker to ask the operator', async () => {
    const f = fakeClient({ user: { id: 'u' } });
    m.getSupabase.mockReturnValue(Promise.resolve(f.client));
    m.claimBroker.mockResolvedValue(null);
    renderBroker();
    expect(await screen.findByText(/This account isn’t registered as a broker yet/)).toBeInTheDocument();
    expect(m.listLeads).not.toHaveBeenCalled();
  });

  it('can unmount before the client has loaded', () => {
    m.getSupabase.mockReturnValue(new Promise(() => {}));
    const { unmount } = renderBroker();
    expect(() => unmount()).not.toThrow();
  });
});
