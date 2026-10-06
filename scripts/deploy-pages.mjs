#!/usr/bin/env node
/**
 * Manual deploy to GitHub Pages: builds the site and force-pushes dist/ to the gh-pages branch.
 * Used until the GitHub Actions workflow is enabled (see README → «Публикация»).
 */
import { execSync } from 'node:child_process';
import { writeFileSync, rmSync } from 'node:fs';

const sh = (cmd, cwd = '.') => execSync(cmd, { cwd, stdio: 'inherit' });
const remote = execSync('git remote get-url origin', { encoding: 'utf8' }).trim();

sh('node scripts/check-third-party.mjs --all');
sh('npx astro build');
writeFileSync('dist/.nojekyll', ''); // keep the _astro/ folder (Jekyll would drop it)
rmSync('dist/.git', { recursive: true, force: true });
sh('git init -q -b gh-pages', 'dist');
sh('git add -A', 'dist');
sh('git -c user.name=deploy -c user.email=deploy@users.noreply.github.com commit -q -m "Deploy"', 'dist');
sh(`git push -q -f ${remote} gh-pages`, 'dist');
rmSync('dist/.git', { recursive: true, force: true });
console.log('Deployed to gh-pages.');
