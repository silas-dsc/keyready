/**
 * The one broker every site refers to. Public licensing details only — the broker's notification
 * email lives in the database (public.brokers), never in this public repository.
 */
export const BROKER = {
  name: 'Goodlend Mortgage Brokers',
  url: 'https://goodlend.com.au/',
  /** As published on goodlend.com.au. */
  entity: 'Gariwed Falls Pty Ltd (ACN 682 875 798) ATF Holvor Investments Unit Trust No. 1',
  creditRepNumber: '556461',
  licensee: 'Connective Credit Services Pty Ltd',
  acl: '389328',
} as const;

/** KeyReady and its sub-sites are run by the broker itself, so "we" on every site is Goodlend. */
export const OPERATOR = BROKER;

/** Plain-English disclosure shown in every footer and wherever someone can ask to be contacted. */
export const BROKER_DISCLOSURE =
  `This site is run by ${BROKER.name} (${BROKER.entity}), Credit Representative ${BROKER.creditRepNumber} of ` +
  `${BROKER.licensee}, ACL ${BROKER.acl}. If you ask to be contacted, your details and report go only to us. ` +
  'If you take out a loan with our help, the lender pays us commission, as set out in the Credit Guide we give you before we help; you never pay us a fee.';
