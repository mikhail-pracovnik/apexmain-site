#!/usr/bin/env node
/**
 * Guard against third-party company names in the repository.
 * Runs as a git pre-commit hook (see .githooks/pre-commit) and on demand: `npm run check:names`.
 *
 * Checks staged files (or all tracked files with --all) for:
 *  1. terms from the local, git-ignored list `.names-denylist.txt` (one per line, # for comments);
 *  2. legal-entity patterns such as ТОО «…», ИП …, LLP, LLC;
 *  3. links to specific Instagram accounts or 2GIS business cards.
 * Exit code 1 blocks the commit and lists the matches.
 */
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';

const all = process.argv.includes('--all');
const git = (...args) => execFileSync('git', args, { encoding: 'utf8' });

const files = (all ? git('ls-files') : git('diff', '--cached', '--name-only', '--diff-filter=ACMR'))
  .split('\n')
  .map((f) => f.trim())
  .filter(Boolean);

const BINARY = /\.(png|jpe?g|webp|avif|gif|ico|woff2?|ttf|otf|mp4|webm|mov|pdf|zip)$/i;
// Font licences must keep their copyright lines; lock files list package authors.
const SKIP = [/^public\/fonts\/OFL-.*\.txt$/, /(^|\/)package-lock\.json$/, /^scripts\/check-third-party\.mjs$/];

const deny = existsSync('.names-denylist.txt')
  ? readFileSync('.names-denylist.txt', 'utf8')
      .split('\n')
      .map((l) => l.trim())
      .filter((l) => l && !l.startsWith('#'))
  : [];

const patterns = [
  { name: 'legal entity', re: /(?:ТОО|ИП|ООО|АО|LLP|LLC|Ltd\.?|GmbH)\s*[«"“][^»"”\n]{2,60}[»"”]/g },
  { name: 'legal entity', re: /\b(?:ИП)\s+[А-ЯЁӘҒҚҢӨҰҮҺІ][а-яёәғқңөұүһі]+\s+[А-ЯЁӘҒҚҢӨҰҮҺІ]\.?/g },
  { name: 'instagram account', re: /instagram\.com\/(?!p\/|reel\/|explore\/)[A-Za-z0-9_.]{2,30}/g },
  { name: '2GIS business card', re: /2gis\.(?:kz|ru|com)\/[^\s"')]*firm\/\d+/g },
];

const hits = [];
for (const file of files) {
  if (BINARY.test(file) || SKIP.some((re) => re.test(file)) || !existsSync(file)) continue;
  const text = readFileSync(file, 'utf8');
  const lines = text.split('\n');
  lines.forEach((line, i) => {
    const lower = line.toLowerCase();
    for (const term of deny) {
      if (lower.includes(term.toLowerCase())) hits.push(`${file}:${i + 1}  [denylist] ${term}`);
    }
    for (const { name, re } of patterns) {
      for (const m of line.matchAll(re)) hits.push(`${file}:${i + 1}  [${name}] ${m[0]}`);
    }
  });
}

if (hits.length) {
  console.error('\n✖ Possible third-party company names found:\n');
  for (const h of hits) console.error('  ' + h);
  console.error('\nRemove them or, if this is intended, commit with an explicit review.\n');
  process.exit(1);
}
console.log(`✓ Third-party names check passed (${files.length} file${files.length === 1 ? '' : 's'}${deny.length ? `, ${deny.length} denylist terms` : ''}).`);
