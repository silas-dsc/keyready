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

/** Plain-English disclosure shown wherever someone can ask to be referred. */
export const BROKER_DISCLOSURE =
  `If you ask to be connected, your details and report go to one broker: ${BROKER.name} ` +
  `(Credit Representative ${BROKER.creditRepNumber} of ${BROKER.licensee}, ACL ${BROKER.acl}). ` +
  'We receive a referral fee from the broker if your loan settles. It’s the same whichever lender you choose, and you never pay us.';
