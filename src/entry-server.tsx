import { renderToString } from 'react-dom/server';
import { StaticRouter } from 'react-router-dom';
import GuidePage from './pages/GuidePage';
import Landing from './pages/Landing';
import { SITE, SITES } from './sites';
import { privacyPolicy } from './sites/privacy';

/** Build-time prerendering (scripts/build-sites.mjs). One SSR bundle per site, like the client build. */
export { SITE };
export const SITE_IDS = Object.keys(SITES);
export { BROKER_DISCLOSURE } from './sites/broker';

export function renderLanding(): string {
  return renderToString(
    <StaticRouter location="/">
      <Landing />
    </StaticRouter>,
  );
}

export const PRIVACY = privacyPolicy(SITE.name);

export function renderGuide(slug: string, appUrl: string): string {
  const guide = slug === 'privacy' ? PRIVACY : SITE.guides.find(g => g.slug === slug);
  if (!guide) throw new Error(`No guide ${slug} on site ${SITE.id}`);
  return renderToString(<GuidePage guide={guide} appUrl={appUrl} />);
}
