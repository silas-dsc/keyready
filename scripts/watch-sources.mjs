#!/usr/bin/env node
/**
 * Rules watch: snapshots the text of every official source in rules/sources.json and reports
 * which ones changed since the last run, plus rules due for review (expiry, financial-year rollover).
 *
 *   node scripts/watch-sources.mjs [--report=rules/report.md]
 *
 * Snapshots live in rules/snapshots/<id>.txt and are committed, so `git diff` on a change shows
 * exactly what an official page now says. Behind a proxy on Node 22: NODE_USE_ENV_PROXY=1.
 * Exit code is 0 either way; the report says whether anything needs a human (or Claude).
 */
import { readFile, writeFile, mkdir } from 'node:fs/promises';

const args = Object.fromEntries(process.argv.slice(2).map(a => a.replace(/^--/, '').split('=')));
const REPORT = args.report ?? 'rules/report.md';
const { sources } = JSON.parse(await readFile('rules/sources.json', 'utf8'));
const today = new Date().toISOString().slice(0, 10);
const soon = new Date(Date.now() + 45 * 864e5).toISOString().slice(0, 10);

/** Visible text only, without volatile chrome (scripts, nav, "last updated" stamps, cache-busters). */
function text(html) {
  return html
    .replace(/<(script|style|noscript|svg|nav|header|footer)[\s\S]*?<\/\1>/gi, ' ')
    .replace(/<!--[\s\S]*?-->/g, ' ')
    .replace(/<br\s*\/?>|<\/(p|li|tr|h[1-6]|div|td|th)>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&#39;|&rsquo;/g, "'").replace(/&quot;/g, '"')
    .replace(/(last (updated|modified|reviewed)|page updated|published)[^\n]{0,60}/gi, '')
    .split('\n').map(l => l.replace(/\s+/g, ' ').trim()).filter(Boolean).join('\n');
}

const changed = [], failed = [], unchanged = [];
await mkdir('rules/snapshots', { recursive: true });
for (const s of sources.filter(s => s.check === 'fetch')) {
  const file = `rules/snapshots/${s.id}.txt`;
  try {
    const res = await fetch(s.url, { headers: { 'user-agent': 'KeyReady-rules-watch/1.0 (+https://github.com/silas-dsc/keyready)' }, signal: AbortSignal.timeout(30_000) });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const now = text(await res.text());
    if (now.length < 200) throw new Error('page text too short — likely a bot challenge');
    const before = await readFile(file, 'utf8').catch(() => null);
    if (before === null) {
      await writeFile(file, now + '\n');
      unchanged.push(`${s.id} (first snapshot)`);
    } else if (before.trim() !== now.trim()) {
      await writeFile(file, now + '\n');
      changed.push(s);
    } else unchanged.push(s.id);
  } catch (e) {
    failed.push({ s, error: e.message });
  }
}

const due = sources.filter(s => s.reviewBy && s.reviewBy <= soon);
const manual = sources.filter(s => s.check === 'manual');
const needsAttention = changed.length > 0 || due.length > 0 || failed.length > 0;

const lines = [
  `# Rules watch — ${today}`,
  '',
  needsAttention ? 'Some official sources need a look. For each item: confirm against the official page, update `src/engine` / `src/data` and their tests, then tick it off.' : 'No changes detected.',
  '',
];
if (changed.length) {
  lines.push('## Official pages that changed', '', 'The snapshot diff in this run’s commit (`rules/snapshots/`) shows exactly what changed.', '');
  for (const s of changed) lines.push(`- [ ] **${s.id}**: ${s.url}  \n  Affects: ${s.covers.join(', ')}`);
  lines.push('');
}
if (due.length) {
  lines.push('## Due for review (expiring or rolling over within 45 days)', '');
  for (const s of due) lines.push(`- [ ] **${s.id}**: review by ${s.reviewBy}${s.note ? ` (${s.note})` : ''}: ${s.url}`);
  lines.push('');
}
if (failed.length) {
  lines.push('## Could not fetch', '');
  for (const { s, error } of failed) lines.push(`- **${s.id}**: ${error}: ${s.url}`);
  lines.push('');
}
lines.push(`<details><summary>${manual.length} bot-protected sources are checked by hand with /verify-data</summary>`, '', ...manual.map(s => `- ${s.id}: ${s.url}`), '', '</details>', '');
await writeFile(REPORT, lines.join('\n'));
console.log(`changed=${changed.length} due=${due.length} failed=${failed.length} unchanged=${unchanged.length}`);
console.log(`needs_attention=${needsAttention}`);
