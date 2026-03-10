/**
 * wip-release/core.mjs
 * Local release tool. Bumps version, updates changelog + SKILL.md,
 * commits, tags, publishes to npm + GitHub Packages, creates GitHub release.
 * Zero dependencies.
 */

import { execSync, execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join, basename } from 'node:path';

// ── Version ─────────────────────────────────────────────────────────

/**
 * Read current version from package.json.
 */
export function detectCurrentVersion(repoPath) {
  const pkgPath = join(repoPath, 'package.json');
  if (!existsSync(pkgPath)) throw new Error(`No package.json found at ${repoPath}`);
  const pkg = JSON.parse(readFileSync(pkgPath, 'utf8'));
  return pkg.version;
}

/**
 * Bump a semver string by level.
 */
export function bumpSemver(version, level) {
  const [major, minor, patch] = version.split('.').map(Number);
  switch (level) {
    case 'major': return `${major + 1}.0.0`;
    case 'minor': return `${major}.${minor + 1}.0`;
    case 'patch': return `${major}.${minor}.${patch + 1}`;
    default: throw new Error(`Invalid level: ${level}. Use major, minor, or patch.`);
  }
}

/**
 * Write new version to package.json.
 */
function writePackageVersion(repoPath, newVersion) {
  const pkgPath = join(repoPath, 'package.json');
  const pkg = JSON.parse(readFileSync(pkgPath, 'utf8'));
  pkg.version = newVersion;
  writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n');
}

// ── SKILL.md ────────────────────────────────────────────────────────

/**
 * Update version in SKILL.md YAML frontmatter.
 */
export function syncSkillVersion(repoPath, newVersion) {
  const skillPath = join(repoPath, 'SKILL.md');
  if (!existsSync(skillPath)) return false;

  let content = readFileSync(skillPath, 'utf8');

  // Check for staleness: if SKILL.md version is more than a patch behind,
  // warn that content may need updating (not just the version number)
  const skillVersionMatch = content.match(/^---[\s\S]*?version:\s*(\S+)[\s\S]*?---/);
  if (skillVersionMatch) {
    const skillVersion = skillVersionMatch[1];
    const [sMaj, sMin] = skillVersion.split('.').map(Number);
    const [nMaj, nMin] = newVersion.split('.').map(Number);
    if (nMaj > sMaj || nMin > sMin + 1) {
      console.warn(`  ! SKILL.md is at ${skillVersion}, releasing ${newVersion}`);
      console.warn(`    SKILL.md content may be stale. Review tool list and interfaces.`);
    }
  }

  // Match version: X.Y.Z in YAML frontmatter (between --- markers)
  const updated = content.replace(
    /^(---[\s\S]*?)(version:\s*)\S+([\s\S]*?---)/,
    `$1$2${newVersion}$3`
  );

  if (updated === content) return false;
  writeFileSync(skillPath, updated);
  return true;
}

// ── CHANGELOG.md ────────────────────────────────────────────────────

/**
 * Prepend a new version entry to CHANGELOG.md.
 */
export function updateChangelog(repoPath, newVersion, notes) {
  const changelogPath = join(repoPath, 'CHANGELOG.md');
  const date = new Date().toISOString().split('T')[0];
  const entry = `## ${newVersion} (${date})\n\n${notes || 'Release.'}\n`;

  if (!existsSync(changelogPath)) {
    writeFileSync(changelogPath, `# Changelog\n\n${entry}\n`);
    return;
  }

  let content = readFileSync(changelogPath, 'utf8');
  // Insert after the # Changelog header
  const headerMatch = content.match(/^# Changelog\s*\n/);
  if (headerMatch) {
    const insertPoint = headerMatch[0].length;
    content = content.slice(0, insertPoint) + '\n' + entry + '\n' + content.slice(insertPoint);
  } else {
    content = `# Changelog\n\n${entry}\n${content}`;
  }

  writeFileSync(changelogPath, content);
}

// ── Git ─────────────────────────────────────────────────────────────

function gitCommitAndTag(repoPath, newVersion, notes) {
  const msg = `v${newVersion}: ${notes || 'Release'}`;
  // Stage known files (ignore missing ones)
  for (const f of ['package.json', 'CHANGELOG.md', 'SKILL.md']) {
    if (existsSync(join(repoPath, f))) {
      execFileSync('git', ['add', f], { cwd: repoPath, stdio: 'pipe' });
    }
  }
  // Use execFileSync to avoid shell injection via notes
  execFileSync('git', ['commit', '-m', msg], { cwd: repoPath, stdio: 'pipe' });
  execFileSync('git', ['tag', `v${newVersion}`], { cwd: repoPath, stdio: 'pipe' });
}

// ── Publish ─────────────────────────────────────────────────────────

/**
 * Publish to npm via 1Password for auth.
 */
export function publishNpm(repoPath) {
  const token = getNpmToken();
  execFileSync('npm', [
    'publish', '--access', 'public',
    `--//registry.npmjs.org/:_authToken=${token}`
  ], { cwd: repoPath, stdio: 'inherit' });
}

/**
 * Publish to GitHub Packages.
 */
export function publishGitHubPackages(repoPath) {
  const ghToken = execSync('gh auth token', { encoding: 'utf8' }).trim();
  execFileSync('npm', [
    'publish',
    '--registry', 'https://npm.pkg.github.com',
    `--//npm.pkg.github.com/:_authToken=${ghToken}`
  ], { cwd: repoPath, stdio: 'inherit' });
}

/**
 * Categorize a commit message into a section.
 * Returns: 'changes', 'fixes', 'docs', 'internal'
 */
function categorizeCommit(subject) {
  const lower = subject.toLowerCase();

  // Fixes
  if (lower.startsWith('fix') || lower.startsWith('hotfix') || lower.startsWith('bugfix') ||
      lower.includes('fix:') || lower.includes('bug:')) {
    return 'fixes';
  }

  // Docs
  if (lower.startsWith('doc') || lower.startsWith('readme') ||
      lower.includes('docs:') || lower.includes('doc:') ||
      lower.startsWith('update readme') || lower.startsWith('rewrite readme') ||
      lower.startsWith('update technical') || lower.startsWith('rewrite relay') ||
      lower.startsWith('update relay')) {
    return 'docs';
  }

  // Internal (skip in release notes)
  if (lower.startsWith('chore') || lower.startsWith('auto-commit') ||
      lower.startsWith('merge pull request') || lower.startsWith('merge branch') ||
      lower.match(/^v\d+\.\d+\.\d+/) || lower.startsWith('mark ') ||
      lower.startsWith('clean up todo') || lower.startsWith('keep ')) {
    return 'internal';
  }

  // Everything else is a change
  return 'changes';
}

/**
 * Warn if release notes are too thin. Release notes should be narrative:
 * what was built, why it was built, and why it matters. Not just a changelog.
 */
function warnIfNotesAreThin(notes) {
  if (!notes) {
    console.warn('  ! No --notes provided. Release notes will be commit-only.');
    console.warn('    For better releases, use --notes="narrative" or --notes-file=path.');
    console.warn('    Explain what was built, why, and why it matters.');
    return;
  }

  // Check for changelog-style one-liners
  const looksLikeChangelog = /^(fix|add|update|remove|bump|chore|refactor|docs?)[\s:]/i.test(notes);
  const isTooShort = notes.length < 50;

  if (looksLikeChangelog && isTooShort) {
    console.warn('  ! Release notes look like a changelog entry, not a narrative.');
    console.warn('    Explain what was built, why, and why it matters.');
  } else if (isTooShort) {
    console.warn('  ! Release notes are very short. Consider explaining what changed and why.');
  }
}

/**
 * Build release notes with narrative first, commit details second.
 *
 * Release notes should tell the story: what was built, why, and why it matters.
 * Commit history is included as supporting detail, not the main content.
 * ai/ files are excluded from the files-changed stats.
 */
export function buildReleaseNotes(repoPath, currentVersion, newVersion, notes) {
  const slug = detectRepoSlug(repoPath);
  const pkg = JSON.parse(readFileSync(join(repoPath, 'package.json'), 'utf8'));
  const lines = [];

  // Narrative summary (the main content of the release notes)
  if (notes) {
    lines.push(notes);
    lines.push('');
  }

  // Gather commits since last tag
  const prevTag = `v${currentVersion}`;
  let rawCommits = [];
  try {
    const raw = execFileSync('git', [
      'log', `${prevTag}..HEAD`, '--pretty=format:%h\t%s'
    ], { cwd: repoPath, encoding: 'utf8' }).trim();
    if (raw) rawCommits = raw.split('\n').map(line => {
      const [hash, ...rest] = line.split('\t');
      return { hash, subject: rest.join('\t') };
    });
  } catch {
    try {
      const raw = execFileSync('git', [
        'log', '--pretty=format:%h\t%s', '-30'
      ], { cwd: repoPath, encoding: 'utf8' }).trim();
      if (raw) rawCommits = raw.split('\n').map(line => {
        const [hash, ...rest] = line.split('\t');
        return { hash, subject: rest.join('\t') };
      });
    } catch {}
  }

  // Categorize commits
  const categories = { changes: [], fixes: [], docs: [], internal: [] };
  for (const commit of rawCommits) {
    const cat = categorizeCommit(commit.subject);
    categories[cat].push(commit);
  }

  // Commit details section (supporting detail, not the headline)
  const hasCommits = categories.changes.length + categories.fixes.length + categories.docs.length > 0;
  if (hasCommits) {
    lines.push('<details>');
    lines.push('<summary>What changed (commits)</summary>');
    lines.push('');

    if (categories.changes.length > 0) {
      lines.push('**Changes**');
      for (const c of categories.changes) {
        lines.push(`- ${c.subject} (${c.hash})`);
      }
      lines.push('');
    }

    if (categories.fixes.length > 0) {
      lines.push('**Fixes**');
      for (const c of categories.fixes) {
        lines.push(`- ${c.subject} (${c.hash})`);
      }
      lines.push('');
    }

    if (categories.docs.length > 0) {
      lines.push('**Docs**');
      for (const c of categories.docs) {
        lines.push(`- ${c.subject} (${c.hash})`);
      }
      lines.push('');
    }

    lines.push('</details>');
    lines.push('');
  }

  // Install section
  lines.push('### Install\n');
  lines.push('```bash');
  lines.push(`npm install -g ${pkg.name}@${newVersion}`);
  lines.push('```');
  lines.push('');
  lines.push('Or update your local clone:');
  lines.push('```bash');
  lines.push('git pull origin main');
  lines.push('```');
  lines.push('');

  // Attribution
  lines.push('---');
  lines.push('');
  lines.push('Built by Parker Todd Brooks, Lēsa (OpenClaw, Claude Opus 4.6), Claude Code (Claude Opus 4.6).');

  // Compare URL
  if (slug) {
    lines.push('');
    lines.push(`Full changelog: https://github.com/${slug}/compare/v${currentVersion}...v${newVersion}`);
  }

  return lines.join('\n');
}

/**
 * Create a GitHub release with detailed notes.
 */
export function createGitHubRelease(repoPath, newVersion, notes, currentVersion) {
  const repoSlug = detectRepoSlug(repoPath);
  const body = buildReleaseNotes(repoPath, currentVersion, newVersion, notes);

  // Write notes to a temp file to avoid shell escaping issues
  const tmpFile = join(repoPath, '.release-notes-tmp.md');
  writeFileSync(tmpFile, body);

  try {
    execFileSync('gh', [
      'release', 'create', `v${newVersion}`,
      '--title', `v${newVersion}`,
      '--notes-file', '.release-notes-tmp.md',
      '--repo', repoSlug
    ], { cwd: repoPath, stdio: 'inherit' });
  } finally {
    try { execFileSync('rm', ['-f', tmpFile]); } catch {}
  }
}

/**
 * Publish skill to ClawHub.
 */
export function publishClawHub(repoPath, newVersion, notes) {
  const skillPath = join(repoPath, 'SKILL.md');
  if (!existsSync(skillPath)) return false;

  const slug = detectSkillSlug(repoPath);
  const changelog = notes || 'Release.';

  execFileSync('clawhub', [
    'publish', repoPath,
    '--slug', slug,
    '--version', newVersion,
    '--changelog', changelog
  ], { cwd: repoPath, stdio: 'inherit' });
  return true;
}

// ── Helpers ──────────────────────────────────────────────────────────

function getNpmToken() {
  try {
    return execSync(
      `OP_SERVICE_ACCOUNT_TOKEN=$(cat ~/.openclaw/secrets/op-sa-token) op item get "npm Token" --vault "Agent Secrets" --fields label=password --reveal 2>/dev/null`,
      { encoding: 'utf8' }
    ).trim();
  } catch {
    throw new Error('Could not fetch npm token from 1Password. Check op CLI and SA token.');
  }
}

function detectSkillSlug(repoPath) {
  // Slug must be lowercase and url-safe. Use directory name, not SKILL.md name
  // (SKILL.md name can be display-formatted like "WIP.release").
  return basename(repoPath).toLowerCase();
}

function detectRepoSlug(repoPath) {
  try {
    const url = execSync('git remote get-url origin', { cwd: repoPath, encoding: 'utf8' }).trim();
    // git@github.com:wipcomputer/wip-grok.git or https://github.com/wipcomputer/wip-grok.git
    const match = url.match(/github\.com[:/](.+?)(?:\.git)?$/);
    return match ? match[1] : null;
  } catch {
    return null;
  }
}

// ── Main ────────────────────────────────────────────────────────────

/**
 * Run the full release pipeline.
 */
export async function release({ repoPath, level, notes, dryRun, noPublish }) {
  repoPath = repoPath || process.cwd();
  const currentVersion = detectCurrentVersion(repoPath);
  const newVersion = bumpSemver(currentVersion, level);
  const repoName = basename(repoPath);

  console.log('');
  console.log(`  ${repoName}: ${currentVersion} -> ${newVersion} (${level})`);
  console.log(`  ${'─'.repeat(40)}`);

  // 0. License compliance gate
  const configPath = join(repoPath, '.license-guard.json');
  if (existsSync(configPath)) {
    const config = JSON.parse(readFileSync(configPath, 'utf8'));
    const licenseIssues = [];

    const licensePath = join(repoPath, 'LICENSE');
    if (!existsSync(licensePath)) {
      licenseIssues.push('LICENSE file is missing');
    } else {
      const licenseText = readFileSync(licensePath, 'utf8');
      if (!licenseText.includes(config.copyright)) {
        licenseIssues.push(`LICENSE copyright does not match "${config.copyright}"`);
      }
      if (config.license === 'MIT+AGPL' && !licenseText.includes('AGPL') && !licenseText.includes('GNU Affero')) {
        licenseIssues.push('LICENSE is MIT-only but config requires MIT+AGPL');
      }
    }

    if (!existsSync(join(repoPath, 'CLA.md'))) {
      licenseIssues.push('CLA.md is missing');
    }

    const readmePath = join(repoPath, 'README.md');
    if (existsSync(readmePath)) {
      const readme = readFileSync(readmePath, 'utf8');
      if (!readme.includes('## License')) licenseIssues.push('README.md missing ## License section');
      if (config.license === 'MIT+AGPL' && !readme.includes('AGPL')) licenseIssues.push('README.md License section missing AGPL reference');
    }

    if (licenseIssues.length > 0) {
      console.log(`  ✗ License compliance failed:`);
      for (const issue of licenseIssues) console.log(`    - ${issue}`);
      console.log(`\n  Run \`wip-license-guard check --fix\` to auto-repair, then try again.`);
      console.log('');
      return { currentVersion, newVersion, dryRun: false, failed: true };
    }
    console.log(`  ✓ License compliance passed`);
  }

  if (dryRun) {
    const hasSkill = existsSync(join(repoPath, 'SKILL.md'));
    console.log(`  [dry run] Would bump package.json to ${newVersion}`);
    if (hasSkill) console.log(`  [dry run] Would update SKILL.md version`);
    console.log(`  [dry run] Would update CHANGELOG.md`);
    console.log(`  [dry run] Would commit and tag v${newVersion}`);
    if (!noPublish) {
      console.log(`  [dry run] Would publish to npm (@wipcomputer scope)`);
      console.log(`  [dry run] Would publish to GitHub Packages`);
      console.log(`  [dry run] Would create GitHub release v${newVersion}`);
      if (hasSkill) console.log(`  [dry run] Would publish to ClawHub`);
    }
    console.log('');
    console.log(`  Dry run complete. No changes made.`);
    console.log('');
    return { currentVersion, newVersion, dryRun: true };
  }

  // 1. Bump package.json
  writePackageVersion(repoPath, newVersion);
  console.log(`  ✓ package.json -> ${newVersion}`);

  // 2. Sync SKILL.md
  if (syncSkillVersion(repoPath, newVersion)) {
    console.log(`  ✓ SKILL.md -> ${newVersion}`);
  }

  // 3. Update CHANGELOG.md
  updateChangelog(repoPath, newVersion, notes);
  console.log(`  ✓ CHANGELOG.md updated`);

  // 4. Git commit + tag
  gitCommitAndTag(repoPath, newVersion, notes);
  console.log(`  ✓ Committed and tagged v${newVersion}`);

  // 5. Push commit + tag
  try {
    execSync('git push && git push --tags', { cwd: repoPath, stdio: 'pipe' });
    console.log(`  ✓ Pushed to remote`);
  } catch {
    console.log(`  ! Push failed (maybe branch protection). Push manually.`);
  }

  if (!noPublish) {
    // 6. npm publish
    try {
      publishNpm(repoPath);
      console.log(`  ✓ Published to npm`);
    } catch (e) {
      console.log(`  ✗ npm publish failed: ${e.message}`);
    }

    // 7. GitHub Packages
    try {
      publishGitHubPackages(repoPath);
      console.log(`  ✓ Published to GitHub Packages`);
    } catch (e) {
      console.log(`  ✗ GitHub Packages publish failed: ${e.message}`);
    }

    // 8. GitHub release (warn if notes are thin)
    warnIfNotesAreThin(notes);
    try {
      createGitHubRelease(repoPath, newVersion, notes, currentVersion);
      console.log(`  ✓ GitHub release v${newVersion} created`);
    } catch (e) {
      console.log(`  ✗ GitHub release failed: ${e.message}`);
    }

    // 9. ClawHub skill publish
    const skillPath = join(repoPath, 'SKILL.md');
    if (existsSync(skillPath)) {
      try {
        publishClawHub(repoPath, newVersion, notes);
        console.log(`  ✓ Published to ClawHub`);
      } catch (e) {
        console.log(`  ✗ ClawHub publish failed: ${e.message}`);
      }
    }
  }

  // 10. Post-merge branch cleanup: rename merged branches with --merged-YYYY-MM-DD
  try {
    const merged = execSync(
      'git branch --merged main', { cwd: repoPath, encoding: 'utf8' }
    ).split('\n')
      .map(b => b.trim())
      .filter(b => b && b !== 'main' && b !== 'master' && !b.startsWith('*') && !b.includes('--merged-'));

    if (merged.length > 0) {
      console.log(`  Scanning ${merged.length} merged branch(es) for rename...`);
      for (const branch of merged) {
        const current = execSync('git branch --show-current', { cwd: repoPath, encoding: 'utf8' }).trim();
        if (branch === current) continue;

        let mergeDate;
        try {
          const mergeBase = execSync(`git merge-base main ${branch}`, { cwd: repoPath, encoding: 'utf8' }).trim();
          mergeDate = execSync(
            `git log main --format="%ai" --ancestry-path ${mergeBase}..main`,
            { cwd: repoPath, encoding: 'utf8' }
          ).trim().split('\n').pop().split(' ')[0];
        } catch {}
        if (!mergeDate) {
          try {
            mergeDate = execSync(`git log ${branch} -1 --format="%ai"`, { cwd: repoPath, encoding: 'utf8' }).trim().split(' ')[0];
          } catch {}
        }
        if (!mergeDate) continue;

        const newName = `${branch}--merged-${mergeDate}`;
        try {
          execSync(`git branch -m "${branch}" "${newName}"`, { cwd: repoPath, stdio: 'pipe' });
          execSync(`git push origin "${newName}"`, { cwd: repoPath, stdio: 'pipe' });
          execSync(`git push origin --delete "${branch}"`, { cwd: repoPath, stdio: 'pipe' });
          console.log(`  ✓ Renamed: ${branch} -> ${newName}`);
        } catch (e) {
          console.log(`  ! Could not rename ${branch}: ${e.message}`);
        }
      }
    }
  } catch (e) {
    // Non-fatal: branch cleanup is a convenience, not a blocker
    console.log(`  ! Branch cleanup skipped: ${e.message}`);
  }

  // 11. Prune old merged branches (keep last 3 per developer prefix)
  try {
    const KEEP_COUNT = 3;
    const remoteBranches = execSync(
      'git branch -r', { cwd: repoPath, encoding: 'utf8' }
    ).split('\n')
      .map(b => b.trim())
      .filter(b => b && !b.includes('HEAD') && b.includes('--merged-'))
      .map(b => b.replace('origin/', ''));

    if (remoteBranches.length > 0) {
      // Group by developer prefix (everything before first /)
      const byPrefix = {};
      for (const branch of remoteBranches) {
        const prefix = branch.split('/')[0];
        if (!byPrefix[prefix]) byPrefix[prefix] = [];
        byPrefix[prefix].push(branch);
      }

      let pruned = 0;
      for (const [prefix, branches] of Object.entries(byPrefix)) {
        // Sort by date descending (date is at the end: --merged-YYYY-MM-DD)
        branches.sort((a, b) => {
          const dateA = a.match(/--merged-(\d{4}-\d{2}-\d{2})/)?.[1] || '';
          const dateB = b.match(/--merged-(\d{4}-\d{2}-\d{2})/)?.[1] || '';
          return dateB.localeCompare(dateA);
        });

        for (let i = KEEP_COUNT; i < branches.length; i++) {
          try {
            execSync(`git push origin --delete "${branches[i]}"`, { cwd: repoPath, stdio: 'pipe' });
            execSync(`git branch -d "${branches[i]}" 2>/dev/null || true`, { cwd: repoPath, stdio: 'pipe', shell: true });
            pruned++;
          } catch {}
        }
      }

      if (pruned > 0) {
        console.log(`  ✓ Pruned ${pruned} old merged branch(es)`);
      }
    }

    // Clean stale branches (merged into main but never renamed)
    const current = execSync('git branch --show-current', { cwd: repoPath, encoding: 'utf8' }).trim();
    const allRemote = execSync(
      'git branch -r', { cwd: repoPath, encoding: 'utf8' }
    ).split('\n')
      .map(b => b.trim())
      .filter(b => b && !b.includes('HEAD') && !b.includes('origin/main') && !b.includes('--merged-'))
      .map(b => b.replace('origin/', ''));

    let staleCleaned = 0;
    for (const branch of allRemote) {
      if (branch === current) continue;
      try {
        execSync(`git merge-base --is-ancestor origin/${branch} origin/main`, { cwd: repoPath, stdio: 'pipe' });
        // If we get here, branch is fully merged
        execSync(`git push origin --delete "${branch}"`, { cwd: repoPath, stdio: 'pipe' });
        execSync(`git branch -d "${branch}" 2>/dev/null || true`, { cwd: repoPath, stdio: 'pipe', shell: true });
        staleCleaned++;
      } catch {}
    }
    if (staleCleaned > 0) {
      console.log(`  ✓ Cleaned ${staleCleaned} stale branch(es)`);
    }
  } catch (e) {
    console.log(`  ! Branch prune skipped: ${e.message}`);
  }

  console.log('');
  console.log(`  Done. ${repoName} v${newVersion} released.`);
  console.log('');

  return { currentVersion, newVersion, dryRun: false };
}
