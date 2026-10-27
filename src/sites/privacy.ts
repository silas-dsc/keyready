import { BROKER } from './broker';
import type { Guide } from './types';

const CONTACT = import.meta.env.VITE_CONTACT_EMAIL as string | undefined;

/**
 * Privacy policy and collection notice (APP 1 & 5), shared by every site. It describes the real
 * data flows in this codebase — keep it in step with them. Have it reviewed before launch.
 */
export function privacyPolicy(siteName: string): Guide {
  const contact = CONTACT ? `email ${CONTACT}` : 'reply to any email we have sent you';
  return {
    slug: 'privacy',
    title: `${siteName} privacy policy and collection notice`,
    description: `How ${siteName} handles your information: what stays in your browser, what is shared with ${BROKER.name} when you ask, and your rights.`,
    updated: '2026-10-27',
    intro: `${siteName} is a free home-loan readiness check. This notice explains what we collect, why, and who we share it with. We comply with the Privacy Act 1988 (Cth) and the Australian Privacy Principles.`,
    sections: [
      {
        heading: 'What stays on your device',
        body: [
          'Your answers to the readiness questions are saved in your own browser (local storage) so you can come back to them. They are not sent to us unless you ask to be connected to a broker. You can clear them with “Start over” or by clearing your browser data.',
          'We record which site and campaign link you arrived from (for example a “utm_source” tag) in your browser, and include it with a referral so we know which channels work.',
        ],
      },
      {
        heading: 'What we collect when you ask to be connected',
        body: [
          `If you choose “Connect with a broker” (on the website, or by agreeing in an AI assistant that uses our MCP tools), we collect your name, email, phone number, preferred contact time, your answers and your readiness report, and record your consent.`,
          `We use this to refer you to one broker: ${BROKER.name}, ${BROKER.entity}, Credit Representative ${BROKER.creditRepNumber} of ${BROKER.licensee} (ACL ${BROKER.acl}). The broker uses it to contact you about a home loan and, if you proceed, under its own privacy policy. The broker tells us how the referral progressed (for example contacted, application, settled) so we can measure our service.`,
          'We receive a referral fee from the broker if your loan settles. It is the same whichever lender you choose, and you never pay us.',
        ],
      },
      {
        heading: 'Who processes it',
        body: [
          'Referrals are stored with Supabase (database hosting). Confirmation emails are sent through Knock and Resend. Some of these providers may store or process data outside Australia, including in the United States. We use them only to run this service, and we never sell your information.',
        ],
      },
      {
        heading: 'Emails',
        body: ['We send you one confirmation email when you ask to be connected. We do not send marketing emails without your separate consent, and any marketing email will have a working unsubscribe link.'],
      },
      {
        heading: 'Keeping it, accessing it, deleting it',
        body: [
          `We keep referral records for as long as we need them to run and measure the service, and to meet legal obligations. You can ask to see, correct or delete your information at any time: ${contact}.`,
          'If you’re not satisfied with how we handle a privacy concern, you can complain to the Office of the Australian Information Commissioner (oaic.gov.au).',
        ],
      },
      {
        heading: 'What the check is, and isn’t',
        body: ['The readiness check is general information based on lenders’ published rules and typical policy settings. It is not credit assistance, financial advice, a comparison service or a loan approval.'],
      },
    ],
    sources: [
      { label: 'OAIC — Australian Privacy Principles', url: 'https://www.oaic.gov.au/privacy/australian-privacy-principles' },
      { label: `${BROKER.name}`, url: BROKER.url },
    ],
  };
}
