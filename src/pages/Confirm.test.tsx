// @vitest-environment jsdom
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { BROKER, BROKER_DISCLOSURE } from '../sites/broker';
import Confirm from './Confirm';

// A plain fake rather than vi.fn(): the rejection case must stay a handled rejection.
const fake = vi.hoisted(() => ({ calls: [] as string[], result: (): Promise<string> => Promise.resolve('confirmed') }));
vi.mock('../lib/leads', () => ({
  confirmLead: (token: string) => {
    fake.calls.push(token);
    return fake.result();
  },
}));

const renderAt = (url: string) =>
  render(
    <MemoryRouter initialEntries={[url]}>
      <Routes>
        <Route path="/confirm" element={<Confirm />} />
        <Route path="/" element={<p>Home page</p>} />
      </Routes>
    </MemoryRouter>,
  );

const button = () => screen.getByRole('button', { name: `Yes, have ${BROKER.name} contact me` });

beforeEach(() => {
  fake.calls = [];
  fake.result = () => Promise.resolve('confirmed');
});

describe('Confirm', () => {
  it('needs a click: nothing is confirmed on page load', () => {
    renderAt('/confirm?token=abc');
    expect(screen.getByRole('heading', { name: 'Confirm your enquiry' })).toBeInTheDocument();
    expect(button()).toBeEnabled();
    expect(screen.getByText(BROKER_DISCLOSURE)).toBeInTheDocument();
    expect(fake.calls).toEqual([]);
  });

  it('disables the button without a token', () => {
    renderAt('/confirm');
    expect(button()).toBeDisabled();
  });

  it.each([
    ['confirmed', `Thanks. ${BROKER.name} now has your report`],
    ['already_confirmed', 'This request was already confirmed.'],
    ['expired', 'This link has expired'],
    ['not_found', 'We couldn’t find this request.'],
  ])('shows the %s result', async (result, text) => {
    fake.result = () => Promise.resolve(result);
    renderAt('/confirm?token=tok-1');
    await userEvent.click(button());
    expect(await screen.findByRole('status')).toHaveTextContent(text);
    expect(fake.calls).toEqual(['tok-1']);
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('shows a busy state while confirming', async () => {
    let resolve!: (v: string) => void;
    const pending = new Promise<string>(r => (resolve = r));
    fake.result = () => pending;
    renderAt('/confirm?token=t');
    await userEvent.click(button());
    expect(screen.getByRole('button', { name: 'Confirming…' })).toBeDisabled();
    resolve('confirmed');
    expect(await screen.findByRole('status')).toHaveTextContent('Thanks.');
  });

  it('shows an error when confirming fails', async () => {
    fake.result = () => Promise.reject(new Error('down'));
    renderAt('/confirm?token=t');
    await userEvent.click(button());
    expect(await screen.findByRole('status')).toHaveTextContent('Something went wrong. Please try again in a moment.');
  });

  it('links back to the check', async () => {
    renderAt('/confirm?token=t');
    await userEvent.click(screen.getByRole('link', { name: 'Back to the check' }));
    expect(screen.getByText('Home page')).toBeInTheDocument();
  });
});
