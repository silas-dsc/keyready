#!/usr/bin/env node
/**
 * Builds every site in src/sites/ from the one shared codebase and rules engine.
 *
 *   node scripts/build-sites.mjs                    # GitHub Pages: dist/ (core) + dist/<id>/ sub-sites
 *   node scripts/build-sites.mjs --target=domains   # one root-based build per site in dist-sites/<id>/ (custom domains)
 *   node scripts/build-sites.mjs --only=doctors     # just one site
 *
 * For each site: client build → SSR build → prerendered landing + guide pages, JSON-LD,
 * sitemap.xml, robots.txt and llms.txt.
 */
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { build } from 'vite';

const args = Object.fromEntries(process.argv.slice(2).map(a => a.replace(/^--/, '').split('=')));
const target = args.target ?? 'pages';
// The Pages deploy is served from the keyready.au custom domain, so the hub sits at the root.
const PAGES_ORIGIN = 'https://keyready.au';
const REPO_PATH = '/';

// Site ids come from the registry itself (src/sites/index.ts), via a throwaway SSR build.
await build({ logLevel: 'warn', build: { ssr: 'src/entry-server.tsx', outDir: resolve('.ssr/_registry'), emptyOutDir: true } });
const registry = await import(pathToFileURL(resolve('.ssr/_registry/entry-server.js')).href);
const ids = registry.SITE_IDS
  .filter(id => !args.only || args.only.split(',').includes(id))
  // core first: its build empties dist/, the sub-sites then build into dist/<id>/.
  .sort((a, b) => (a === 'core' ? -1 : b === 'core' ? 1 : a.localeCompare(b)));

const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const ld = obj => `<script type="application/ld+json">${JSON.stringify(obj).replace(/</g, '\\u003c')}</script>`;

function layout(id) {
  if (target === 'domains') return { base: '/', outDir: `dist-sites/${id}` };
  return id === 'core' ? { base: REPO_PATH, outDir: 'dist' } : { base: `${REPO_PATH}${id}/`, outDir: `dist/${id}` };
}

function publicUrl(site, base) {
  if (target === 'domains' && site.domain) return `https://${site.domain}/`;
  return `${PAGES_ORIGIN}${base}`;
}

/** Fill the built index.html template for one page. */
function page(template, { title, description, canonical, body, theme, jsonLd, keepScripts }) {
  let html = template
    .replace(/<title>.*?<\/title>/s, `<title>${esc(title)}</title>`)
    .replace(/<meta name="description"[^>]*>/, `<meta name="description" content="${esc(description)}" />`)
    .replace('<div id="root"></div>', `<div id="root">${body}</div>`);
  const head = [
    `<link rel="canonical" href="${canonical}" />`,
    `<meta property="og:type" content="website" />`,
    `<meta property="og:title" content="${esc(title)}" />`,
    `<meta property="og:description" content="${esc(description)}" />`,
    `<meta property="og:url" content="${canonical}" />`,
    `<meta name="twitter:card" content="summary" />`,
    `<meta name="theme-color" content="${theme.ink}" />`,
    `<style>:root{--color-ink:${theme.ink};--color-ink-soft:${theme.inkSoft};--color-go:${theme.go};--color-mint:${theme.mint};--color-mint-soft:${theme.mintSoft};--color-paper:${theme.paper}}</style>`,
    ...jsonLd.map(ld),
  ].join('\n    ');
  html = html.replace(/<meta name="theme-color"[^>]*>/, '').replace('</head>', `    ${head}\n  </head>`);
  // Guide pages are pure HTML + CSS: the SPA would otherwise boot and replace them.
  if (!keepScripts) html = html.replace(/<script type="module"[^>]*><\/script>/g, '').replace(/<link rel="modulepreload"[^>]*>/g, '');
  return html;
}

async function buildSite(id) {
  const { base, outDir } = layout(id);
  process.env.VITE_SITE = id;
  process.env.BASE_PATH = base;
  const quiet = { logLevel: 'warn' };
  await build({ ...quiet, base, build: { outDir, emptyOutDir: id === 'core' || target === 'domains', chunkSizeWarningLimit: 700 } });
  const ssrDir = resolve(`.ssr/${id}`);
  await build({ ...quiet, base, build: { ssr: 'src/entry-server.tsx', outDir: ssrDir, emptyOutDir: true } });

  const ssr = await import(pathToFileURL(join(ssrDir, 'entry-server.js')).href);
  const site = ssr.SITE;
  const url = publicUrl(site, base);
  const template = await readFile(join(outDir, 'index.html'), 'utf8');
  const org = { '@type': 'Organization', name: site.name, url };

  // Landing page — keeps the app's scripts so it becomes the live SPA after load.
  await writeFile(join(outDir, 'index.html'), page(template, {
    title: site.seo.title,
    description: site.seo.description,
    canonical: url,
    body: ssr.renderLanding(),
    theme: site.theme,
    keepScripts: true,
    jsonLd: [
      { '@context': 'https://schema.org', '@type': 'WebApplication', name: site.name, url, applicationCategory: 'FinanceApplication', operatingSystem: 'Any', description: site.seo.description, offers: { '@type': 'Offer', price: '0', priceCurrency: 'AUD' }, publisher: org, areaServed: 'AU' },
      { '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: site.faq.map(([q, a]) => ({ '@type': 'Question', name: q, acceptedAnswer: { '@type': 'Answer', text: a } })) },
    ],
  }));

  const urls = [{ loc: url, lastmod: new Date().toISOString().slice(0, 10) }];
  for (const g of site.guides) {
    const gUrl = `${url}guides/${g.slug}/`;
    const dir = join(outDir, 'guides', g.slug);
    await mkdir(dir, { recursive: true });
    await writeFile(join(dir, 'index.html'), page(template, {
      title: `${g.title} | ${site.name}`,
      description: g.description,
      canonical: gUrl,
      body: ssr.renderGuide(g.slug, base),
      theme: site.theme,
      keepScripts: false,
      jsonLd: [
        { '@context': 'https://schema.org', '@type': 'Article', headline: g.title, description: g.description, dateModified: g.updated, author: org, publisher: org, mainEntityOfPage: gUrl, citation: g.sources.map(s => s.url) },
        { '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: [
          { '@type': 'ListItem', position: 1, name: site.name, item: url },
          { '@type': 'ListItem', position: 2, name: g.title, item: gUrl },
        ] },
        ...(g.faq?.length ? [{ '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: g.faq.map(([q, a]) => ({ '@type': 'Question', name: q, acceptedAnswer: { '@type': 'Answer', text: a } })) }] : []),
      ],
    }));
    urls.push({ loc: gUrl, lastmod: g.updated });
  }

  // Privacy policy and collection notice (not in the sitemap; linked from every footer and the consent form).
  await mkdir(join(outDir, 'privacy'), { recursive: true });
  await writeFile(join(outDir, 'privacy', 'index.html'), page(template, {
    title: ssr.PRIVACY.title, description: ssr.PRIVACY.description, canonical: `${url}privacy/`,
    body: ssr.renderGuide('privacy', base), theme: site.theme, keepScripts: false, jsonLd: [],
  }));

  await writeFile(join(outDir, 'sitemap.xml'), `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map(u => `  <url><loc>${u.loc}</loc><lastmod>${u.lastmod}</lastmod></url>`).join('\n')}
</urlset>
`);
  // AI search and answer engines are explicitly welcome: being cited is the point.
  await writeFile(join(outDir, 'robots.txt'), `User-agent: *
Allow: /

# AI search & assistants
User-agent: OAI-SearchBot
Allow: /
User-agent: ChatGPT-User
Allow: /
User-agent: GPTBot
Allow: /
User-agent: ClaudeBot
Allow: /
User-agent: Claude-SearchBot
Allow: /
User-agent: Claude-User
Allow: /
User-agent: PerplexityBot
Allow: /
User-agent: Google-Extended
Allow: /

Sitemap: ${url}sitemap.xml
`);
  await writeFile(join(outDir, 'llms.txt'), `# ${site.name}

> ${site.seo.description}

${site.name} is a free Australian home-loan readiness check. It compares a borrower's situation with ~90 lenders' live Open Banking rates and published rules, applies APRA's 3% serviceability buffer, and calculates 2026–27 stamp duty and grants for every state. It gives general information only, not credit assistance. People can ask to be referred to one licensed mortgage broker.

## Pages
- [Readiness check](${url}): the interactive 5-minute check
${site.guides.map(g => `- [${g.title}](${url}guides/${g.slug}/): ${g.description}`).join('\n')}

## For AI assistants
- An MCP server exposes the same engine as tools (assess readiness, stamp duty, 5% Deposit Scheme, lender rates, consented broker referral). See ${PAGES_ORIGIN}${REPO_PATH}mcp/ for the endpoint and setup.
`);
  console.log(`✓ ${id.padEnd(16)} ${url}  (${site.guides.length} guides)`);
  return { id, url, name: site.name, segment: site.segment };
}

/** Public setup page for AI assistants: the MCP endpoint plus per-client instructions. */
async function mcpPage(outDir) {
  const supabase = process.env.VITE_SUPABASE_URL;
  const endpoint = supabase ? `${supabase.replace(/\/$/, '')}/functions/v1/mcp` : null;
  const ep = endpoint ? `<code>${esc(endpoint)}</code>` : '<em>not deployed yet — coming soon</em>';
  const clients = [
    ['Claude (claude.ai, Desktop, mobile)', 'Customize → Connectors → Add custom connector → paste the URL. No sign-in needed.'],
    ['Claude Code', `<code>claude mcp add --transport http keyready ${esc(endpoint ?? '<url>')}</code>`],
    ['ChatGPT', 'Settings → Apps &amp; connectors → developer mode → add a custom MCP server with the URL (authentication: none). Referrals ask for confirmation.'],
    ['Google Gemini', 'Gemini app (web) → Settings → Connected apps → Custom apps → add the URL. Gemini CLI: <code>gemini mcp add --transport http keyready &lt;url&gt;</code>.'],
    ['Perplexity, Mistral Le Chat, Cursor', 'Add a custom remote MCP connector with the URL; authentication: none.'],
  ];
  await mkdir(join(outDir, 'mcp'), { recursive: true });
  await writeFile(join(outDir, 'mcp', 'index.html'), `<!doctype html><html lang="en-AU"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>KeyReady for AI assistants (MCP)</title><meta name="description" content="Use KeyReady's Australian home-loan readiness check inside Claude, ChatGPT, Gemini and other AI assistants via MCP.">
<style>body{font:16px/1.6 system-ui,sans-serif;max-width:760px;margin:40px auto;padding:0 16px;color:#0e3b3a;background:#f7f5ef}code{background:#fff;padding:2px 6px;border-radius:6px;word-break:break-all}li{margin:10px 0}.box{background:#fff;border-radius:16px;padding:16px 20px;margin:20px 0}</style></head><body>
<h1>KeyReady for AI assistants</h1>
<p>Ask Claude, ChatGPT, Gemini and other assistants to check your home-loan readiness. They use the same rules engine as the KeyReady sites: ~90 lenders’ published rules, 2026–27 stamp duty and grants, and the 5% Deposit Scheme.</p>
<div class="box"><strong>MCP endpoint (Streamable HTTP):</strong><br>${ep}</div>
<h2>Add it to your assistant</h2><ul>${clients.map(([c, h]) => `<li><strong>${c}:</strong> ${h}</li>`).join('')}</ul>
<h2>Tools</h2><ul>
<li><strong>assess_home_loan_readiness</strong>: which lenders’ published rules you fit, borrowing power, LVR, duty, grants, LMI waivers, fastest fixes, plus a link to the full report</li>
<li><strong>calculate_stamp_duty</strong>: exact 2026–27 duty, concessions, First Home Owner Grant and foreign surcharge for any state</li>
<li><strong>check_5_percent_deposit_scheme</strong>: eligibility and price cap</li>
<li><strong>list_lender_rates</strong>: live Open Banking rates at your LVR (names masked)</li>
<li><strong>refer_to_broker</strong>: only with your explicit consent in the conversation</li></ul>
<p style="font-size:14px;color:#3d5f5d">General information only: not credit assistance, financial advice or a comparison service. ${esc(registry.BROKER_DISCLOSURE)}</p>
</body></html>
`);
}

const built = [];
for (const id of ids) built.push(await buildSite(id));
if (target === 'pages') await mcpPage('dist');
await rm('.ssr', { recursive: true, force: true });
await writeFile(target === 'domains' ? 'dist-sites/sites.json' : 'dist/sites.json', JSON.stringify(built, null, 2) + '\n');
