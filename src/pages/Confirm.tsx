import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Button, Logo } from '../components/ui';
import { confirmLead, type ConfirmResult } from '../lib/leads';
import { BROKER, BROKER_DISCLOSURE } from '../sites/broker';

const MESSAGE: Record<ConfirmResult, string> = {
  confirmed: `Thanks — ${BROKER.name} now has your report and will be in touch at the time you chose.`,
  already_confirmed: `This request was already confirmed. ${BROKER.name} will be in touch.`,
  expired: 'This link has expired: requests are deleted after 7 days. You can run the check again and ask to be contacted.',
  not_found: 'We couldn’t find this request. It may have expired, or the link may be incomplete.',
};

/**
 * The link in the email we send after an AI-assistant referral. Confirming needs a click, not just a
 * page load, so email security scanners that open links can't confirm on the borrower's behalf.
 */
export default function Confirm() {
  const [params] = useSearchParams();
  const token = params.get('token') ?? '';
  const [state, setState] = useState<'idle' | 'busy' | ConfirmResult | 'error'>('idle');

  const confirm = async () => {
    setState('busy');
    try {
      setState(await confirmLead(token));
    } catch {
      setState('error');
    }
  };

  return (
    <div className="min-h-dvh">
      <header className="mx-auto max-w-3xl px-4 py-4"><Logo /></header>
      <main className="mx-auto max-w-xl px-4 py-12">
        <h1 className="text-3xl font-extrabold">Confirm your enquiry</h1>
        {state === 'idle' || state === 'busy' ? (
          <>
            <p className="mt-4 text-ink-soft">
              An AI assistant asked us to pass your home loan readiness report to {BROKER.name} so they can contact you. Nothing has been shared yet.
            </p>
            <Button size="lg" className="mt-8" disabled={!token || state === 'busy'} onClick={confirm}>
              {state === 'busy' ? 'Confirming…' : `Yes, have ${BROKER.name} contact me`}
            </Button>
            <p className="mt-4 text-sm text-muted">Not you? Close this page: the request is deleted after 7 days.</p>
          </>
        ) : (
          <p className="mt-4 text-lg text-ink-soft" role="status">
            {state === 'error' ? 'Something went wrong. Please try again in a moment.' : MESSAGE[state]}
          </p>
        )}
        <p className="mt-10 text-xs text-muted">{BROKER_DISCLOSURE}</p>
        <Link to="/" className="mt-6 inline-block text-sm font-semibold underline underline-offset-2">Back to the check</Link>
      </main>
    </div>
  );
}
