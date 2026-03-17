#!/usr/bin/env node

/**
 * wip-release/cli.mjs
 * Release tool CLI. Bumps version, updates docs, publishes.
 */

import { release, detectCurrentVersion } from './core.mjs';

const args = process.argv.slice(2);
const level = args.find(a => ['patch', 'minor', 'major'].includes(a));

function flag(name) {
  const prefix = `--${name}=`;
  const found = args.find(a => a.startsWith(prefix));
  return found ? found.slice(prefix.length) : null;
}

const dryRun = args.includes('--dry-run');
const noPublish = args.includes('--no-publish');
const skipProductCheck = args.includes('--skip-product-check');
const skipStaleCheck = args.includes('--skip-stale-check');
const skipWorktreeCheck = args.includes('--skip-worktree-check');
const skipTechDocsCheck = args.includes('--skip-tech-docs-check');
const skipCoverageCheck = args.includes('--skip-coverage-check');
const notesFilePath = flag('notes-file');
let notes = flag('notes');
// Bug fix #121: use strict check, not truthiness. --notes="" is empty, not absent.
let notesSource = (notes !== null && notes !== undefined && notes !== '') ? 'flag' : 'none';

// Release notes priority (highest wins):
//   1. --notes-file=path          Explicit file path (always wins)
//   2. RELEASE-NOTES-v{ver}.md    In repo root (always wins over --notes flag)
//   3. ai/dev-updates/YYYY-MM-DD* Today's dev update (wins over --notes flag if longer)
//   4. --notes="text"             Flag fallback (only if nothing better exists)
//
// Rule: written release notes on disk ALWAYS beat a CLI one-liner.
// The --notes flag is a fallback, not an override.
{
  const { readFileSync, existsSync } = await import('node:fs');
  const { resolve, join } = await import('node:path');
  const flagNotes = notes; // save original flag value for fallback

  if (notesFilePath) {
    // 1. Explicit --notes-file (highest priority)
    const resolved = resolve(notesFilePath);
    if (!existsSync(resolved)) {
      console.error(`  ✗ Notes file not found: ${resolved}`);
      process.exit(1);
    }
    notes = readFileSync(resolved, 'utf8').trim();
    notesSource = 'file';
  } else if (level) {
    // 2. Auto-detect RELEASE-NOTES-v{version}.md (ALWAYS checks, even if --notes provided)
    try {
      const { detectCurrentVersion, bumpSemver } = await import('./core.mjs');
      const cwd = process.cwd();
      const currentVersion = detectCurrentVersion(cwd);
      const newVersion = bumpSemver(currentVersion, level);
      const dashed = newVersion.replace(/\./g, '-');
      const autoFile = join(cwd, `RELEASE-NOTES-v${dashed}.md`);
      if (existsSync(autoFile)) {
        const fileContent = readFileSync(autoFile, 'utf8').trim();
        if (flagNotes && flagNotes !== fileContent) {
          console.log(`  ! --notes flag ignored: RELEASE-NOTES-v${dashed}.md takes priority`);
        }
        notes = fileContent;
        notesSource = 'file';
        console.log(`  ✓ Found RELEASE-NOTES-v${dashed}.md`);
      }
    } catch {}
  }

  // 3. Auto-detect dev update from ai/dev-updates/ (wins over --notes flag if longer)
  if (level && (!notes || (notesSource === 'flag' && notes.length < 200))) {
    try {
      const { readdirSync } = await import('node:fs');
      const devUpdatesDir = join(process.cwd(), 'ai', 'dev-updates');
      if (existsSync(devUpdatesDir)) {
        const d = new Date();
        const today = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
        const todayFiles = readdirSync(devUpdatesDir)
          .filter(f => f.startsWith(today) && f.endsWith('.md'))
          .sort()
          .reverse();

        if (todayFiles.length > 0) {
          const devUpdatePath = join(devUpdatesDir, todayFiles[0]);
          const devUpdateContent = readFileSync(devUpdatePath, 'utf8').trim();
          if (devUpdateContent.length > (notes || '').length) {
            if (flagNotes) {
              console.log(`  ! --notes flag ignored: dev update takes priority`);
            }
            notes = devUpdateContent;
            notesSource = 'dev-update';
            console.log(`  ✓ Found dev update: ai/dev-updates/${todayFiles[0]}`);
          }
        }
      }
    } catch {}
  }
}

if (args.includes('--version') || args.includes('-v')) {
  const { readFileSync } = await import('node:fs');
  const { join, dirname } = await import('node:path');
  const { fileURLToPath } = await import('node:url');
  const pkg = JSON.parse(readFileSync(join(dirname(fileURLToPath(import.meta.url)), 'package.json'), 'utf8'));
  console.log(pkg.version);
  process.exit(0);
}

if (!level || args.includes('--help') || args.includes('-h')) {
  const cwd = process.cwd();
  let current = '';
  try { current = ` (current: ${detectCurrentVersion(cwd)})`; } catch {}

  console.log(`wip-release ... local release tool${current}

Usage:
  wip-release patch                    1.0.0 -> 1.0.1
  wip-release minor                    1.0.0 -> 1.1.0
  wip-release major                    1.0.0 -> 2.0.0

Flags:
  --notes="description"    Release narrative (what was built and why)
  --notes-file=path        Read release narrative from a markdown file
  --dry-run                Show what would happen, change nothing
  --no-publish             Bump + tag only, skip npm/GitHub
  --skip-product-check     Skip product docs check (dev update, roadmap, readme-first)
  --skip-stale-check       Skip stale remote branch check
  --skip-worktree-check    Skip worktree guard (allow release from worktree)

Release notes (REQUIRED, must be a file on disk):
  1. --notes-file=path          Explicit file path
  2. RELEASE-NOTES-v{ver}.md    In repo root (auto-detected)
  3. ai/dev-updates/YYYY-MM-DD* Today's dev update (auto-detected)
  The --notes flag is NOT accepted. Write a file. Commit it on your branch.
  The file shows up in the PR diff so it can be reviewed before merge.

Skill publish to website:
  Add .publish-skill.json to repo root: { "name": "my-tool" }
  Set WIP_WEBSITE_REPO env var to your website repo path.
  After release, SKILL.md is copied to {website}/wip.computer/install/{name}.txt
  and deploy.sh is run to push to VPS.

Pipeline:
  1. Bump package.json version
  2. Sync SKILL.md version (if exists)
  3. Update CHANGELOG.md
  4. Git commit + tag
  5. Push to remote
  6. npm publish (via 1Password)
  7. GitHub Packages publish
  8. GitHub release create
  9. Publish SKILL.md to website (if configured)`);
  process.exit(level ? 0 : 1);
}

release({
  repoPath: process.cwd(),
  level,
  notes,
  notesSource,
  dryRun,
  noPublish,
  skipProductCheck,
  skipStaleCheck,
  skipWorktreeCheck,
  skipTechDocsCheck,
  skipCoverageCheck,
}).catch(err => {
  console.error(`  ✗ ${err.message}`);
  process.exit(1);
});
