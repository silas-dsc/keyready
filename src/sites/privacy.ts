import { BROKER } from './broker';
import type { Guide } from './types';

const CONTACT = (import.meta.env.VITE_CONTACT_EMAIL as string | undefined) || 'privacy@keyready.au';

/**
 * Privacy policy and collection notice (APP 1 & 5), shared by every site. It describes the real
 * data flows in this codebase — keep it in step with them. Have it reviewed before launch.
 */
export function privacyPolicy(siteName: string): Guide {
  return {
    slug: 'privacy',
    title: `${siteName} privacy policy and collection notice`,
    description: `How ${siteName} handles your information: what stays in your browser, what you share with ${BROKER.name} when you ask to be contacted, and your rights.`,
    updated: '2026-10-28',
    intro: `${siteName} is a free home-loan readiness check run by ${BROKER.name} (${BROKER.entity}), Credit Representative ${BROKER.creditRepNumber} of ${BROKER.licensee} (ACL ${BROKER.acl}). In this notice “we” and “us” means ${BROKER.name}. It explains what we collect, why, who processes it and your rights. We comply with the Privacy Act 1988 (Cth) and the Australian Privacy Principles. Contact us about privacy at ${CONTACT}.`,
    sections: [
      {
        heading: 'What stays on your device',
        body: [
          'Your answers to the readiness questions are saved in your own browser (local storage) so you can come back to them. They are not sent to us unless you ask to be contacted. You can clear them with “Start over” or by clearing your browser data.',
          'We record which site and campaign link you arrived from (for example a “utm_source” tag) in your browser, and include it if you ask to be contacted so we know which channels work. We use no advertising or analytics cookies.',
        ],
      },
      {
        heading: 'Using the check in an AI assistant',
        body: [
          'If you use our MCP tools in an AI assistant (such as Claude or ChatGPT), the assistant sends the details you give it to our server to run the check. The four checking tools use them only to calculate your result and do not store them. The request passes through Cloudflare and Supabase, whose servers may be outside Australia. Your AI assistant provider handles your conversation under its own privacy policy.',
        ],
      },
      {
        heading: 'What we collect when you ask to be contacted',
        body: [
          `If you choose “Connect with a broker” on the website, or agree in an AI assistant, we collect your name, email, phone number, preferred contact time, your answers and your readiness report, and record your consent. Giving us these details is optional: you can use the check and see your report without them.`,
          'If you ask through an AI assistant, we first email you a link to confirm the request. We only contact you about a loan after you click it, and we delete unconfirmed requests after 7 days.',
          `We use your details to contact you about a home loan and, if you go ahead, to help you apply, under ${BROKER.name}’s full privacy policy (linked below). We record how your enquiry progresses (for example contacted, application, settled) to measure which sites work.`,
          'If you take out a loan with our help, the lender pays us commission, as set out in the Credit Guide we give you before we help. You never pay us a fee.',
        ],
      },
      {
        heading: 'Who processes it',
        body: [
          'Enquiries are stored with Supabase (database hosting, Sydney region). Emails are sent through Knock and Resend, AI-assistant requests pass through Cloudflare, and the sites are hosted on GitHub Pages. Knock, Resend, Cloudflare and GitHub may store or process data in the United States and other countries. We use them only to run this service, and we never sell your information.',
        ],
      },
      {
        heading: 'Keeping it secure',
        body: [
          'Enquiries are stored in a database that visitors can only add to, never read. Only our broker team can see enquiries, after signing in. Data is encrypted in transit and at rest by our hosting providers.',
        ],
      },
      {
        heading: 'Emails',
        body: ['We send you a confirmation email when you ask to be contacted (and, for AI-assistant requests, a link to confirm it). We do not send marketing emails without your separate consent, and any marketing email will have a working unsubscribe link.'],
      },
      {
        heading: 'Keeping it, accessing it, deleting it',
        body: [
          `We keep enquiry records for as long as we need them to help you, measure the service and meet legal obligations. You can ask to see, correct or delete your information at any time by emailing ${CONTACT}.`,
          'If you’re not satisfied with how we handle a privacy concern, you can complain to the Office of the Australian Information Commissioner (oaic.gov.au).',
        ],
      },
      {
        heading: 'What the check is, and isn’t',
        body: [`The readiness check is general information based on lenders’ published rules and typical policy settings. It is not a comparison service, a recommendation or a loan approval. If you ask to be contacted, any help with a loan comes from ${BROKER.name} as a credit representative, with its Credit Guide.`],
      },
    ],
    sources: [
      { label: 'OAIC: Australian Privacy Principles', url: 'https://www.oaic.gov.au/privacy/australian-privacy-principles' },
      { label: `${BROKER.name} privacy policy`, url: `${BROKER.url}privacy-policy/` },
    ],
  };
}
