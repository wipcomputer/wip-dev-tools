/**
 * wip-release/core.mjs
 * Local release tool. Bumps version, updates changelog + SKILL.md,
 * commits, tags, publishes to npm + GitHub Packages, creates GitHub release.
 * Zero dependencies.
 */

import { execSync, execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync, existsSync, readdirSync, mkdirSync, renameSync } from 'node:fs';
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
  const skillVersionMatch = content.match(/^---[\s\S]*?version:\s*"?(\d+\.\d+\.\d+)"?[\s\S]*?---/);
  if (skillVersionMatch) {
    const skillVersion = skillVersionMatch[1];
    const [sMaj, sMin] = skillVersion.split('.').map(Number);
    const [nMaj, nMin] = newVersion.split('.').map(Number);
    if (nMaj > sMaj || nMin > sMin + 1) {
      console.warn(`  ! SKILL.md is at ${skillVersion}, releasing ${newVersion}`);
      console.warn(`    SKILL.md content may be stale. Review tool list and interfaces.`);
    }
  }

  // Match version line in YAML frontmatter (between --- markers).
  // Uses "[^\n]* for quoted values (including corrupted multi-quote strings
  // like "1.9.5".9.4".9.3") or \S+ for unquoted values. This replaces the
  // ENTIRE value on the line, preventing the accumulation bug (#71).
  const updated = content.replace(
    /^(---[\s\S]*?version:\s*)(?:"[^\n]*|\S+)([\s\S]*?---)/,
    `$1"${newVersion}"$2`
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
  const d = new Date();
  const date = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;

  // Bug fix #121: never silently default to "Release." when notes are empty.
  // If notes are empty at this point, warn loudly.
  if (!notes || !notes.trim()) {
    console.warn(`  ! WARNING: No release notes provided for v${newVersion}. CHANGELOG entry will be minimal.`);
    notes = 'No release notes provided.';
  }

  const entry = `## ${newVersion} (${date})\n\n${notes}\n`;

  if (!existsSync(changelogPath)) {
    writeFileSync(changelogPath, `# Changelog\n\n${entry}`);
    return;
  }

  let content = readFileSync(changelogPath, 'utf8');
  // Insert after the # Changelog header (single newline, no accumulation)
  const headerMatch = content.match(/^# Changelog\s*\n+/);
  if (headerMatch) {
    const insertPoint = headerMatch[0].length;
    content = content.slice(0, insertPoint) + entry + '\n' + content.slice(insertPoint);
  } else {
    content = `# Changelog\n\n${entry}\n${content}`;
  }

  writeFileSync(changelogPath, content);
}

// ── Git ─────────────────────────────────────────────────────────────

/**
 * Move all RELEASE-NOTES-v*.md files to _trash/.
 * Returns the number of files moved.
 */
function trashReleaseNotes(repoPath) {
  const files = readdirSync(repoPath).filter(f => /^RELEASE-NOTES-v.*\.md$/i.test(f));
  if (files.length === 0) return 0;

  const trashDir = join(repoPath, '_trash');
  if (!existsSync(trashDir)) mkdirSync(trashDir);

  for (const f of files) {
    renameSync(join(repoPath, f), join(trashDir, f));
    execFileSync('git', ['add', join('_trash', f)], { cwd: repoPath, stdio: 'pipe' });
    // Only git rm if the file was tracked (committed or staged).
    // Untracked scaffolded files from failed releases just need the rename.
    try {
      execFileSync('git', ['ls-files', '--error-unmatch', f], { cwd: repoPath, stdio: 'pipe' });
      execFileSync('git', ['rm', '--cached', f], { cwd: repoPath, stdio: 'pipe' });
    } catch {
      // File wasn't tracked. Rename already moved it.
    }
  }
  return files.length;
}

function gitCommitAndTag(repoPath, newVersion, notes) {
  const msg = `v${newVersion}: ${notes || 'Release'}`;
  // Stage ALL files that wip-release modifies:
  // - Root: package.json, CHANGELOG.md, SKILL.md
  // - Sub-tools: tools/*/package.json
  // - Product docs: ai/product/plans-prds/roadmap.md, ai/product/readme-first-product.md
  // - Trashed release notes: _trash/RELEASE-NOTES-*.md
  // Using git add -A on specific paths instead of listing each file (#231)
  for (const f of ['package.json', 'CHANGELOG.md', 'SKILL.md']) {
    if (existsSync(join(repoPath, f))) {
      execFileSync('git', ['add', f], { cwd: repoPath, stdio: 'pipe' });
    }
  }
  // Stage sub-tool package.json files
  const toolsDir = join(repoPath, 'tools');
  if (existsSync(toolsDir)) {
    for (const sub of readdirSync(toolsDir, { withFileTypes: true })) {
      if (!sub.isDirectory()) continue;
      const subPkg = join('tools', sub.name, 'package.json');
      if (existsSync(join(repoPath, subPkg))) {
        execFileSync('git', ['add', subPkg], { cwd: repoPath, stdio: 'pipe' });
      }
    }
  }
  // Stage product docs and trashed release notes
  const aiProduct = join(repoPath, 'ai', 'product');
  if (existsSync(aiProduct)) {
    execFileSync('git', ['add', 'ai/product/'], { cwd: repoPath, stdio: 'pipe' });
  }
  const trash = join(repoPath, '_trash');
  if (existsSync(trash)) {
    execFileSync('git', ['add', '_trash/'], { cwd: repoPath, stdio: 'pipe' });
  }
  // Use execFileSync to avoid shell injection via notes.
  // --no-verify: wip-release legitimately commits on main (version bump + changelog).
  // The pre-commit hook blocks all commits on main, but wip-release is the one exception.
  execFileSync('git', ['commit', '--no-verify', '-m', msg], { cwd: repoPath, stdio: 'pipe' });
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
 * Check release notes quality. Returns { ok, issues[] }.
 *
 * notesSource: 'file' (RELEASE-NOTES-v*.md or --notes-file),
 *              'dev-update' (ai/dev-updates/ fallback),
 *              'flag' (bare --notes="string"),
 *              'none' (nothing provided).
 *
 * For minor/major: BLOCKS if notes came from bare --notes flag or are missing.
 *   Agents must write a RELEASE-NOTES-v{version}.md file and commit it.
 * For patch: WARNS only.
 */
function checkReleaseNotes(notes, notesSource, level) {
  const issues = [];

  if (!notes) {
    issues.push('No release notes found. A file is REQUIRED.');
    issues.push('Write RELEASE-NOTES-v{version}.md or ai/dev-updates/YYYY-MM-DD--description.md');
    issues.push('Commit it on your branch so it is reviewable in the PR.');
    return { ok: false, issues, block: true };
  }

  // HARD RULE: release notes must come from a file on disk.
  // --notes flag is NOT accepted. Write a file. Commit it. Review it.
  if (notesSource === 'flag') {
    issues.push('Release notes must come from a file, not the --notes flag.');
    issues.push('Write RELEASE-NOTES-v{version}.md or ai/dev-updates/YYYY-MM-DD--description.md');
    issues.push('Commit it on your branch so it is reviewable in the PR before merge.');
    return { ok: false, issues, block: true };
  }

  // Notes too short.
  if (notes.length < 50) {
    issues.push('Release notes are too short (under 50 chars). Explain what changed and why.');
  }

  // Check for changelog-style one-liners
  const looksLikeChangelog = /^(fix|add|update|remove|bump|chore|refactor|docs?)[\s:]/i.test(notes);
  if (looksLikeChangelog && notes.length < 100) {
    issues.push('Notes look like a changelog entry, not a narrative. Explain the impact.');
  }

  // Narrative quality: must have at least one paragraph (not just bullets/headers)
  // A paragraph is 2+ consecutive lines of prose (not starting with -, *, #, |, or ```)
  const lines = notes.split('\n').filter(l => l.trim().length > 0);
  const proseLines = lines.filter(l => {
    const t = l.trim();
    return !t.startsWith('#') && !t.startsWith('-') && !t.startsWith('*') &&
           !t.startsWith('|') && !t.startsWith('```') && !t.startsWith('>') &&
           t.length > 30;
  });
  if (proseLines.length < 2) {
    issues.push('Release notes need narrative, not just bullets. Write at least one paragraph explaining what changed and why it matters. Tell the story.');
  }

  // Must be substantial (not just a header + bullets)
  if (notes.length < 200) {
    issues.push('Release notes are too short (under 200 chars). Every release deserves a story: what was broken or missing, what we built, why the user should care.');
  }

  // Release notes should reference at least one issue
  const hasIssueRef = /#\d+/.test(notes);
  if (!hasIssueRef) {
    issues.push('No issue reference found (#XX). Every release should close or reference an issue.');
  }

  return { ok: issues.length === 0, issues, block: issues.length > 0 };
}

/**
 * Scaffold a RELEASE-NOTES-v{version}.md template if one doesn't exist.
 * Called when the release notes gate blocks. Gives the agent a file to fill in.
 */
export function scaffoldReleaseNotes(repoPath, version) {
  const dashed = version.replace(/\./g, '-');
  const notesPath = join(repoPath, `RELEASE-NOTES-v${dashed}.md`);
  if (existsSync(notesPath)) return notesPath;

  const pkg = JSON.parse(readFileSync(join(repoPath, 'package.json'), 'utf8'));
  const name = pkg.name?.replace(/^@[^/]+\//, '') || basename(repoPath);

  // Auto-detect issue references from commits since last tag
  let issueRefs = '';
  try {
    const lastTag = execFileSync('git', ['describe', '--tags', '--abbrev=0'],
      { cwd: repoPath, encoding: 'utf8' }).trim();
    const log = execFileSync('git', ['log', `${lastTag}..HEAD`, '--oneline'],
      { cwd: repoPath, encoding: 'utf8' });
    const issues = [...new Set(log.match(/#\d+/g) || [])];
    if (issues.length > 0) {
      issueRefs = issues.map(i => `- ${i}`).join('\n');
    }
  } catch {}

  const template = `# Release Notes: ${name} v${version}

**One-line summary of what this release does**

Tell the story. What was broken or missing? What did we build? Why does the user care?
Write at least one real paragraph of prose. Not just bullets. The release notes gate
will block if there is no narrative. Bullets are fine for details, but the story comes first.

## The story

(Write a paragraph here. What was the problem? What does this release fix? Why does it matter?
This is what users read. Make it worth reading.)

## Issues closed

${issueRefs || '- #XX (replace with actual issue numbers)'}

## How to verify

\`\`\`bash
# Commands to test the changes
\`\`\`
`;

  writeFileSync(notesPath, template);
  return notesPath;
}

/**
 * Check if a file was modified in commits since the last git tag.
 */
function fileModifiedSinceLastTag(repoPath, relativePath) {
  try {
    const lastTag = execFileSync('git', ['describe', '--tags', '--abbrev=0'],
      { cwd: repoPath, encoding: 'utf8' }).trim();
    const diff = execFileSync('git', ['diff', '--name-only', lastTag, 'HEAD'],
      { cwd: repoPath, encoding: 'utf8' });
    return diff.split('\n').some(f => f.trim() === relativePath);
  } catch {
    // No tags yet or git error ... skip check
    return true;
  }
}

/**
 * Check that product docs were updated for this release.
 * Returns { missing: string[], ok: boolean, skipped: boolean }.
 * Only runs if ai/ directory structure exists.
 */
function checkProductDocs(repoPath) {
  const missing = [];

  // Skip repos without ai/ structure
  const aiDir = join(repoPath, 'ai');
  if (!existsSync(aiDir)) return { missing: [], ok: true, skipped: true };

  // 1. Dev update: must have a file modified since last release tag.
  // Old check ("any file from last 3 days") let the same stale file pass
  // across 11 releases in one session. Now uses the same git-based check
  // as roadmap and readme-first: was the file actually changed since the tag?
  const devUpdatesDir = join(aiDir, 'dev-updates');
  if (existsSync(devUpdatesDir)) {
    const files = readdirSync(devUpdatesDir).filter(f => f.endsWith('.md'));
    if (files.length === 0) {
      missing.push('ai/dev-updates/ (no dev update files)');
    } else {
      const anyModified = files.some(f =>
        fileModifiedSinceLastTag(repoPath, `ai/dev-updates/${f}`)
      );
      if (!anyModified) {
        missing.push('ai/dev-updates/ (no dev update modified since last release)');
      }
    }
  }

  // 2. Roadmap: modified since last tag
  const roadmapPath = 'ai/product/plans-prds/roadmap.md';
  if (existsSync(join(repoPath, roadmapPath))) {
    if (!fileModifiedSinceLastTag(repoPath, roadmapPath)) {
      missing.push('ai/product/plans-prds/roadmap.md (not updated since last release)');
    }
  }

  // 3. Readme-first: modified since last tag
  const readmeFirstPath = 'ai/product/readme-first-product.md';
  if (existsSync(join(repoPath, readmeFirstPath))) {
    if (!fileModifiedSinceLastTag(repoPath, readmeFirstPath)) {
      missing.push('ai/product/readme-first-product.md (not updated since last release)');
    }
  }

  // 4. Product update doc: modified since last tag
  const productUpdateDir = join(aiDir, 'dev-updates', 'product-update');
  if (existsSync(productUpdateDir)) {
    const puFiles = readdirSync(productUpdateDir).filter(f => f.endsWith('.md'));
    if (puFiles.length > 0) {
      const anyModified = puFiles.some(f =>
        fileModifiedSinceLastTag(repoPath, `ai/dev-updates/product-update/${f}`)
      );
      if (!anyModified) {
        missing.push('ai/dev-updates/product-update/ (product update doc not updated since last release)');
      }
    }
  }

  return { missing, ok: missing.length === 0, skipped: false };
}

/**
 * Check that technical docs (SKILL.md, TECHNICAL.md) were updated
 * when source code changed since last release tag.
 * Returns { missing: string[], ok: boolean, skipped: boolean }.
 */
function checkTechnicalDocs(repoPath) {
  try {
    let lastTag;
    try {
      lastTag = execFileSync('git', ['describe', '--tags', '--abbrev=0'],
        { cwd: repoPath, encoding: 'utf8' }).trim();
    } catch {
      return { missing: [], ok: true, skipped: true }; // No tags yet
    }

    const diff = execFileSync('git', ['diff', '--name-only', lastTag, 'HEAD'],
      { cwd: repoPath, encoding: 'utf8' });
    const changedFiles = diff.split('\n').map(f => f.trim()).filter(Boolean);

    // Find source code changes (*.mjs, *.js, *.ts) excluding non-source dirs
    const excludePattern = /\/(node_modules|dist|_trash|examples)\//;
    const sourcePattern = /\.(mjs|js|ts)$/;
    const sourceChanges = changedFiles.filter(f =>
      sourcePattern.test(f) && !excludePattern.test(f) && !f.startsWith('ai/')
    );

    if (sourceChanges.length === 0) {
      return { missing: [], ok: true, skipped: false }; // No source changes
    }

    // Check if any doc files were also modified
    const docChanges = changedFiles.filter(f =>
      f === 'SKILL.md' || f === 'TECHNICAL.md' ||
      /^tools\/[^/]+\/SKILL\.md$/.test(f) ||
      /^tools\/[^/]+\/TECHNICAL\.md$/.test(f)
    );

    if (docChanges.length > 0) {
      return { missing: [], ok: true, skipped: false }; // Docs updated
    }

    // Source changed but no doc updates
    const missing = [];
    const preview = sourceChanges.slice(0, 5).join(', ');
    const more = sourceChanges.length > 5 ? ` (and ${sourceChanges.length - 5} more)` : '';
    missing.push('Source files changed since last tag but no SKILL.md or TECHNICAL.md was updated');
    missing.push(`Changed: ${preview}${more}`);
    missing.push('Update SKILL.md or TECHNICAL.md to document these changes');

    return { missing, ok: false, skipped: false };
  } catch {
    return { missing: [], ok: true, skipped: true }; // Graceful fallback
  }
}

/**
 * Parse the interface coverage table from a markdown file.
 * Returns array of { name, cli, module, mcp, openclaw, skill, ccHook } or null.
 */
function parseInterfaceCoverageTable(filePath) {
  if (!existsSync(filePath)) return null;
  const content = readFileSync(filePath, 'utf8');
  const lines = content.split('\n');

  const headerIdx = lines.findIndex(l => /^\|\s*#\s*\|\s*Tool\s*\|/i.test(l));
  if (headerIdx === -1) return null;

  const rows = [];
  for (let i = headerIdx + 2; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line.startsWith('|')) break;
    const cells = line.split('|').map(c => c.trim()).filter(c => c !== '');
    if (cells.length < 8) continue;
    // Skip category header rows (# cell is empty, non-numeric, or bold)
    const num = cells[0].trim();
    if (!num || /^\*\*/.test(num) || isNaN(parseInt(num))) continue;
    rows.push({
      name: cells[1].trim(),
      cli: /^Y$/i.test(cells[2]),
      module: /^Y$/i.test(cells[3]),
      mcp: /^Y$/i.test(cells[4]),
      openclaw: /^Y$/i.test(cells[5]),
      skill: /^Y$/i.test(cells[6]),
      ccHook: /^Y$/i.test(cells[7]),
    });
  }
  return rows.length > 0 ? rows : null;
}

/**
 * Read display name from a tool's SKILL.md frontmatter.
 * Tries display-name, then name field. Falls back to null.
 */
function getToolDisplayName(toolPath) {
  const skillPath = join(toolPath, 'SKILL.md');
  if (!existsSync(skillPath)) return null;
  try {
    const content = readFileSync(skillPath, 'utf8');
    const displayMatch = content.match(/^\s*display-name:\s*"?([^"\n]+)"?/m);
    if (displayMatch) return displayMatch[1].trim();
    const nameMatch = content.match(/^name:\s*"?([^"\n]+)"?/m);
    if (nameMatch) return nameMatch[1].trim();
  } catch {}
  return null;
}

/**
 * Check that the interface coverage table in README.md and SKILL.md
 * matches the actual interfaces detected in tools/* subdirectories.
 * Returns { missing: string[], ok: boolean, skipped: boolean }.
 */
function checkInterfaceCoverage(repoPath) {
  try {
    // Only applies to toolbox repos
    const toolsDir = join(repoPath, 'tools');
    if (!existsSync(toolsDir)) return { missing: [], ok: true, skipped: true };

    const entries = readdirSync(toolsDir, { withFileTypes: true });
    const tools = entries
      .filter(e => e.isDirectory() && existsSync(join(toolsDir, e.name, 'package.json')))
      .map(e => ({ name: e.name, path: join(toolsDir, e.name) }));

    if (tools.length === 0) return { missing: [], ok: true, skipped: true };

    // Detect actual interfaces for each tool
    const actualMap = {};
    for (const tool of tools) {
      const pkg = JSON.parse(readFileSync(join(tool.path, 'package.json'), 'utf8'));
      actualMap[tool.name] = {
        displayName: getToolDisplayName(tool.path) || tool.name,
        cli: !!(pkg.bin),
        module: !!(pkg.main || pkg.exports),
        mcp: ['mcp-server.mjs', 'mcp-server.js', 'dist/mcp-server.js'].some(f => existsSync(join(tool.path, f))),
        openclaw: existsSync(join(tool.path, 'openclaw.plugin.json')),
        skill: existsSync(join(tool.path, 'SKILL.md')),
        ccHook: !!(pkg.claudeCode?.hook) || existsSync(join(tool.path, 'guard.mjs')),
      };
    }

    const missing = [];

    // Check both README.md and SKILL.md tables
    for (const [label, filePath] of [['README.md', join(repoPath, 'README.md')], ['SKILL.md', join(repoPath, 'SKILL.md')]]) {
      const tableRows = parseInterfaceCoverageTable(filePath);
      if (!tableRows) continue;

      // Tool count
      if (tools.length !== tableRows.length) {
        missing.push(`${label}: tool count mismatch (${tools.length} in tools/, ${tableRows.length} in table)`);
      }

      // Check each actual tool against the table
      for (const tool of tools) {
        const actual = actualMap[tool.name];
        const displayName = actual.displayName;
        const tableRow = tableRows.find(r =>
          r.name === displayName ||
          r.name.toLowerCase() === displayName.toLowerCase() ||
          r.name.toLowerCase().includes(tool.name.replace(/^wip-/, '').replace(/-/g, ' '))
        );

        if (!tableRow) {
          missing.push(`${label}: ${tool.name} (${displayName}) missing from coverage table`);
          continue;
        }

        const ifaceMap = [
          ['cli', 'CLI'], ['module', 'Module'], ['mcp', 'MCP'],
          ['openclaw', 'OC Plugin'], ['skill', 'Skill'], ['ccHook', 'CC Hook']
        ];

        for (const [key, name] of ifaceMap) {
          if (actual[key] && !tableRow[key]) {
            missing.push(`${label}: ${displayName} has ${name} but table says no`);
          }
          if (tableRow[key] && !actual[key]) {
            missing.push(`${label}: ${displayName} marked ${name} in table but not detected`);
          }
        }
      }
    }

    return { missing, ok: missing.length === 0, skipped: false };
  } catch {
    return { missing: [], ok: true, skipped: true }; // Graceful fallback
  }
}

/**
 * Auto-update version/date lines in product docs before the release commit.
 * Updates roadmap.md "Current version" and "Last updated",
 * and readme-first-product.md "Last updated" and "What's Built (as of vX.Y.Z)".
 * Returns number of files updated.
 */
function syncProductDocs(repoPath, newVersion) {
  let updated = 0;
  const td = new Date();
  const today = `${td.getFullYear()}-${String(td.getMonth()+1).padStart(2,'0')}-${String(td.getDate()).padStart(2,'0')}`;

  // 1. roadmap.md
  const roadmapPath = join(repoPath, 'ai', 'product', 'plans-prds', 'roadmap.md');
  if (existsSync(roadmapPath)) {
    let content = readFileSync(roadmapPath, 'utf8');
    let changed = false;

    // Update "Current version: vX.Y.Z"
    const versionRe = /(\*\*Current version:\*\*\s*)v[\d.]+/;
    if (versionRe.test(content)) {
      content = content.replace(versionRe, `$1v${newVersion}`);
      changed = true;
    }

    // Update "Last updated: YYYY-MM-DD"
    const dateRe = /(\*\*Last updated:\*\*\s*)[\d-]+/;
    if (dateRe.test(content)) {
      content = content.replace(dateRe, `$1${today}`);
      changed = true;
    }

    if (changed) {
      writeFileSync(roadmapPath, content);
      updated++;
    }
  }

  // 2. readme-first-product.md
  const rfpPath = join(repoPath, 'ai', 'product', 'readme-first-product.md');
  if (existsSync(rfpPath)) {
    let content = readFileSync(rfpPath, 'utf8');
    let changed = false;

    // Update "Last updated: YYYY-MM-DD"
    const dateRe = /(\*\*Last updated:\*\*\s*)[\d-]+/;
    if (dateRe.test(content)) {
      content = content.replace(dateRe, `$1${today}`);
      changed = true;
    }

    // Update "What's Built (as of vX.Y.Z)"
    const builtRe = /(What's Built \(as of\s*)v[\d.]+(\))/;
    if (builtRe.test(content)) {
      content = content.replace(builtRe, `$1v${newVersion}$2`);
      changed = true;
    }

    if (changed) {
      writeFileSync(rfpPath, content);
      updated++;
    }
  }

  return updated;
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
  lines.push('### Install');
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

    // Bug fix #121: verify the release was actually created
    try {
      const verify = execFileSync('gh', [
        'release', 'view', `v${newVersion}`,
        '--repo', repoSlug, '--json', 'body', '--jq', '.body | length'
      ], { cwd: repoPath, encoding: 'utf8' }).trim();
      const bodyLen = parseInt(verify, 10);
      if (bodyLen < 50) {
        console.warn(`  ! GitHub release body is only ${bodyLen} chars. Notes may be truncated.`);
      }
    } catch {}

    // Auto-close referenced issues
    const issueNums = [...new Set((body.match(/#(\d+)/g) || []).map(m => m.slice(1)))];
    for (const num of issueNums) {
      try {
        // Only close if issue exists and is open on the public repo
        const publicSlug = repoSlug.replace(/-private$/, '');
        execFileSync('gh', [
          'issue', 'close', num,
          '--repo', publicSlug,
          '--comment', `Closed by v${newVersion}. See release notes.`
        ], { cwd: repoPath, stdio: 'pipe' });
        console.log(`  ✓ Closed #${num} on ${publicSlug}`);
      } catch {
        // Issue doesn't exist on public repo or already closed. Fine.
      }
    }
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

// ── Skill Publish ────────────────────────────────────────────────────

/**
 * Publish SKILL.md to website as plain text.
 *
 * Auto-detects: if SKILL.md exists and WIP_WEBSITE_REPO is set,
 * publishes automatically. No config file needed.
 *
 * Name resolution (first match wins):
 *   1. .publish-skill.json { "name": "memory-crystal" }
 *   2. SKILL.md frontmatter name: field
 *   3. Directory name (basename of repoPath)
 *
 * Copies SKILL.md to {website}/wip.computer/install/{name}.txt
 * Then runs deploy.sh to push to VPS.
 *
 * Non-blocking: returns result, never throws.
 */
export function publishSkillToWebsite(repoPath) {
  // Resolve website repo: .publish-skill.json > env var
  let websiteRepo;
  let targetName;
  const configPath = join(repoPath, '.publish-skill.json');
  let publishConfig = {};
  if (existsSync(configPath)) {
    try { publishConfig = JSON.parse(readFileSync(configPath, 'utf8')); } catch {}
  }

  websiteRepo = publishConfig.websiteRepo || process.env.WIP_WEBSITE_REPO;
  if (!websiteRepo) return { skipped: true, reason: 'no websiteRepo in .publish-skill.json and WIP_WEBSITE_REPO not set' };

  // Find SKILL.md: check root, then skills/*/SKILL.md
  let skillFile = join(repoPath, 'SKILL.md');
  if (!existsSync(skillFile)) {
    const skillsDir = join(repoPath, 'skills');
    if (existsSync(skillsDir)) {
      for (const sub of readdirSync(skillsDir)) {
        const candidate = join(skillsDir, sub, 'SKILL.md');
        if (existsSync(candidate)) { skillFile = candidate; break; }
      }
    }
  }
  if (!existsSync(skillFile)) return { skipped: true, reason: 'no SKILL.md found' };

  // Resolve target name: config > package.json > directory name
  // SKILL.md frontmatter name is skipped because it's a short slug
  // (e.g., "memory") not the full install name (e.g., "memory-crystal").

  // 1. Explicit config (optional, overrides auto-detect)
  if (publishConfig.name) targetName = publishConfig.name;

  // 2. package.json name (strip @scope/ prefix, most reliable)
  if (!targetName) {
    const pkgPath = join(repoPath, 'package.json');
    if (existsSync(pkgPath)) {
      try {
        const pkg = JSON.parse(readFileSync(pkgPath, 'utf8'));
        if (pkg.name) targetName = pkg.name.replace(/^@[^/]+\//, '');
      } catch {}
    }
  }

  // 3. Directory name fallback (strip -private suffix)
  if (!targetName) {
    targetName = basename(repoPath).replace(/-private$/, '').toLowerCase();
  }

  // Copy to website install dir
  const installDir = join(websiteRepo, 'wip.computer', 'install');
  if (!existsSync(installDir)) {
    try { mkdirSync(installDir, { recursive: true }); } catch {}
  }

  const targetFile = join(installDir, `${targetName}.txt`);
  try {
    const content = readFileSync(skillFile, 'utf8');
    writeFileSync(targetFile, content);
  } catch (e) {
    return { ok: false, error: `copy failed: ${e.message}` };
  }

  // Deploy to VPS (non-blocking ... warn on failure)
  const deployScript = join(websiteRepo, 'deploy.sh');
  if (existsSync(deployScript)) {
    try {
      execSync(`bash deploy.sh`, { cwd: websiteRepo, stdio: 'pipe', timeout: 30000 });
    } catch (e) {
      return { ok: true, deployed: false, target: targetName, error: `deploy failed: ${e.message}` };
    }
  } else {
    return { ok: true, deployed: false, target: targetName, error: 'no deploy.sh found' };
  }

  return { ok: true, deployed: true, target: targetName };
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
  // Read the name field from SKILL.md frontmatter (agentskills.io spec: lowercase-hyphen slug).
  // Falls back to directory name.
  const skillPath = join(repoPath, 'SKILL.md');
  if (existsSync(skillPath)) {
    const content = readFileSync(skillPath, 'utf8');
    const nameMatch = content.match(/^---[\s\S]*?\nname:\s*(.+?)\n/);
    if (nameMatch) {
      const name = nameMatch[1].trim().replace(/^["']|["']$/g, '');
      // Only use if it looks like a slug (lowercase, hyphens)
      if (/^[a-z][a-z0-9-]*$/.test(name)) return name;
    }
  }
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

// ── Stale Branch Check ──────────────────────────────────────────────

/**
 * Check for remote branches that are already merged into origin/main.
 * These should be cleaned up before releasing.
 *
 * For patch: WARN (non-blocking, just print stale branches).
 * For minor/major: BLOCK (return { failed: true }).
 *
 * Filters out origin/main, origin/HEAD, and already-renamed --merged- branches.
 */
export function checkStaleBranches(repoPath, level) {
  try {
    // Fetch latest remote state so --merged check is accurate
    try {
      execFileSync('git', ['fetch', '--prune'], { cwd: repoPath, stdio: 'pipe' });
    } catch {
      // Non-fatal: proceed with local state if fetch fails
    }

    const raw = execFileSync('git', ['branch', '-r', '--merged', 'origin/main'], {
      cwd: repoPath, encoding: 'utf8'
    }).trim();

    if (!raw) return { stale: [], ok: true };

    const stale = raw.split('\n')
      .map(b => b.trim())
      .filter(b =>
        b &&
        !b.includes('origin/main') &&
        !b.includes('origin/HEAD') &&
        !b.includes('--merged-')
      );

    if (stale.length === 0) return { stale: [], ok: true };

    const isMinorOrMajor = level === 'minor' || level === 'major';
    return {
      stale,
      ok: !isMinorOrMajor,
      blocked: isMinorOrMajor,
    };
  } catch {
    // Git command failed... skip check gracefully
    return { stale: [], ok: true, skipped: true };
  }
}

// ── Main ────────────────────────────────────────────────────────────

/**
 * Run the full release pipeline.
 */
export async function release({ repoPath, level, notes, notesSource, dryRun, noPublish, skipProductCheck, skipStaleCheck, skipWorktreeCheck, skipTechDocsCheck, skipCoverageCheck }) {
  repoPath = repoPath || process.cwd();
  const currentVersion = detectCurrentVersion(repoPath);
  const newVersion = bumpSemver(currentVersion, level);
  const repoName = basename(repoPath);

  console.log('');
  console.log(`  ${repoName}: ${currentVersion} -> ${newVersion} (${level})`);
  console.log(`  ${'─'.repeat(40)}`);

  // -1. Worktree guard: block releases from linked worktrees
  if (!skipWorktreeCheck) {
    try {
      const gitDir = execFileSync('git', ['rev-parse', '--git-dir'], {
        cwd: repoPath, encoding: 'utf8'
      }).trim();

      // Linked worktrees have "/worktrees/" in their git-dir path
      if (gitDir.includes('/worktrees/')) {
        // Get the main working tree path from `git worktree list`
        const worktreeList = execFileSync('git', ['worktree', 'list', '--porcelain'], {
          cwd: repoPath, encoding: 'utf8'
        });
        const mainWorktree = worktreeList.split('\n')
          .find(line => line.startsWith('worktree '));
        const mainPath = mainWorktree ? mainWorktree.replace('worktree ', '') : '(unknown)';

        console.log(`  \u2717 wip-release must run from the main working tree, not a worktree.`);
        console.log(`    Current: ${repoPath}`);
        console.log(`    Main working tree: ${mainPath}`);
        console.log(`    Switch to the main working tree and run again.`);
        console.log('');
        return { currentVersion, newVersion, dryRun: false, failed: true };
      }
      console.log('  \u2713 Running from main working tree');
    } catch {
      // Git command failed... skip check gracefully
    }
  }

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

  // 0.5. Product docs check
  if (!skipProductCheck) {
    const productCheck = checkProductDocs(repoPath);
    if (!productCheck.skipped) {
      if (productCheck.ok) {
        console.log('  ✓ Product docs up to date');
      } else {
        const isMinorOrMajor = level === 'minor' || level === 'major';
        const prefix = isMinorOrMajor ? '✗' : '!';
        console.log(`  ${prefix} Product docs need attention:`);
        for (const m of productCheck.missing) console.log(`    - ${m}`);
        if (isMinorOrMajor) {
          console.log('');
          console.log('  Update product docs before a minor/major release.');
          console.log('  Use --skip-product-check to override.');
          console.log('');
          return { currentVersion, newVersion, dryRun: false, failed: true };
        }
      }
    }
  }

  // 0.75. Release notes quality gate
  {
    const notesCheck = checkReleaseNotes(notes, notesSource || 'flag', level);
    if (notesCheck.ok) {
      const sourceLabel = notesSource === 'file' ? 'from file' : notesSource === 'dev-update' ? 'from dev update' : 'from --notes';
      console.log(`  ✓ Release notes OK (${sourceLabel})`);
    } else {
      console.log(`  ✗ Release notes blocked:`);
      for (const issue of notesCheck.issues) console.log(`    - ${issue}`);
      console.log('');
      // Scaffold a template so the agent has something to fill in
      const templatePath = scaffoldReleaseNotes(repoPath, newVersion);
      console.log(`  Scaffolded template: ${basename(templatePath)}`);
      console.log('  Fill it in, commit, then run wip-release again.');
      console.log('');
      return { currentVersion, newVersion, dryRun: false, failed: true };
    }
  }

  // 0.8. Stale remote branch check
  if (!skipStaleCheck) {
    const staleCheck = checkStaleBranches(repoPath, level);
    if (staleCheck.skipped) {
      // Silently skip if git command failed
    } else if (staleCheck.stale.length === 0) {
      console.log('  ✓ No stale remote branches');
    } else {
      const isMinorOrMajor = level === 'minor' || level === 'major';
      const prefix = isMinorOrMajor ? '✗' : '!';
      console.log(`  ${prefix} Stale remote branches merged into main:`);
      for (const b of staleCheck.stale) console.log(`    - ${b}`);
      if (isMinorOrMajor) {
        console.log('');
        console.log('  Clean up stale branches before a minor/major release.');
        console.log('  Delete them with: git push origin --delete <branch>');
        console.log('  Use --skip-stale-check to override.');
        console.log('');
        return { currentVersion, newVersion, dryRun: false, failed: true };
      }
    }
  }

  // 0.85. Technical docs check
  if (!skipTechDocsCheck) {
    const techDocsCheck = checkTechnicalDocs(repoPath);
    if (!techDocsCheck.skipped) {
      if (techDocsCheck.ok) {
        console.log('  ✓ Technical docs up to date');
      } else {
        const isMinorOrMajor = level === 'minor' || level === 'major';
        const prefix = isMinorOrMajor ? '✗' : '!';
        console.log(`  ${prefix} Technical docs need attention:`);
        for (const m of techDocsCheck.missing) console.log(`    - ${m}`);
        if (isMinorOrMajor) {
          console.log('');
          console.log('  Update SKILL.md or TECHNICAL.md before a minor/major release.');
          console.log('  Use --skip-tech-docs-check to override.');
          console.log('');
          return { currentVersion, newVersion, dryRun: false, failed: true };
        }
      }
    }
  }

  // 0.9. Interface coverage check
  if (!skipCoverageCheck) {
    const coverageCheck = checkInterfaceCoverage(repoPath);
    if (!coverageCheck.skipped) {
      if (coverageCheck.ok) {
        console.log('  ✓ Interface coverage table matches');
      } else {
        const isMinorOrMajor = level === 'minor' || level === 'major';
        const prefix = isMinorOrMajor ? '✗' : '!';
        console.log(`  ${prefix} Interface coverage table has mismatches:`);
        for (const m of coverageCheck.missing) console.log(`    - ${m}`);
        if (isMinorOrMajor) {
          console.log('');
          console.log('  Update the coverage table in README.md and SKILL.md.');
          console.log('  Use --skip-coverage-check to override.');
          console.log('');
          return { currentVersion, newVersion, dryRun: false, failed: true };
        }
      }
    }
  }

  // 0.95. Run test scripts (if any exist)
  {
    const toolsDir = join(repoPath, 'tools');
    const testFiles = [];
    if (existsSync(toolsDir)) {
      for (const sub of readdirSync(toolsDir)) {
        const testPath = join(toolsDir, sub, 'test.sh');
        if (existsSync(testPath)) testFiles.push({ tool: sub, path: testPath });
      }
    }
    // Also check repo root test.sh
    const rootTest = join(repoPath, 'test.sh');
    if (existsSync(rootTest)) testFiles.push({ tool: '(root)', path: rootTest });

    if (testFiles.length > 0) {
      let allPassed = true;
      for (const { tool, path } of testFiles) {
        try {
          execFileSync('bash', [path], { cwd: dirname(path), stdio: 'pipe', timeout: 30000 });
          console.log(`  ✓ Tests passed: ${tool}`);
        } catch (e) {
          allPassed = false;
          console.log(`  ✗ Tests FAILED: ${tool}`);
          const output = (e.stdout || '').toString().trim();
          if (output) {
            for (const line of output.split('\n').slice(-5)) console.log(`    ${line}`);
          }
        }
      }
      if (!allPassed) {
        console.log('');
        console.log('  Fix failing tests before releasing.');
        console.log('');
        return { currentVersion, newVersion, dryRun: false, failed: true };
      }
    }
  }

  if (dryRun) {
    // Product docs check (dry-run)
    if (!skipProductCheck) {
      const productCheck = checkProductDocs(repoPath);
      if (!productCheck.skipped) {
        if (productCheck.ok) {
          console.log('  [dry run] ✓ Product docs up to date');
        } else {
          const isMinorOrMajor = level === 'minor' || level === 'major';
          console.log(`  [dry run] ${isMinorOrMajor ? '✗ Would BLOCK' : '! Would WARN'}: product docs need updates`);
          for (const m of productCheck.missing) console.log(`    - ${m}`);
        }
      }
    }
    // Release notes check (dry-run)
    {
      const notesCheck = checkReleaseNotes(notes, notesSource || 'flag', level);
      if (notesCheck.ok) {
        const sourceLabel = notesSource === 'file' ? 'from file' : notesSource === 'dev-update' ? 'from dev update' : 'from --notes';
        console.log(`  [dry run] ✓ Release notes OK (${sourceLabel})`);
      } else {
        const isMinorOrMajor = level === 'minor' || level === 'major';
        console.log(`  [dry run] ${isMinorOrMajor ? '✗ Would BLOCK' : '! Would WARN'}: release notes need attention`);
        for (const issue of notesCheck.issues) console.log(`    - ${issue}`);
      }
    }
    // Stale branch check (dry-run)
    if (!skipStaleCheck) {
      const staleCheck = checkStaleBranches(repoPath, level);
      if (!staleCheck.skipped && staleCheck.stale.length > 0) {
        const isMinorOrMajor = level === 'minor' || level === 'major';
        console.log(`  [dry run] ${isMinorOrMajor ? '✗ Would BLOCK' : '! Would WARN'}: stale remote branches`);
        for (const b of staleCheck.stale) console.log(`    - ${b}`);
      } else if (!staleCheck.skipped) {
        console.log('  [dry run] ✓ No stale remote branches');
      }
    }
    // Technical docs check (dry-run)
    if (!skipTechDocsCheck) {
      const techDocsCheck = checkTechnicalDocs(repoPath);
      if (!techDocsCheck.skipped) {
        if (techDocsCheck.ok) {
          console.log('  [dry run] ✓ Technical docs up to date');
        } else {
          const isMinorOrMajor = level === 'minor' || level === 'major';
          console.log(`  [dry run] ${isMinorOrMajor ? '✗ Would BLOCK' : '! Would WARN'}: technical docs need updates`);
          for (const m of techDocsCheck.missing) console.log(`    - ${m}`);
        }
      }
    }
    // Interface coverage check (dry-run)
    if (!skipCoverageCheck) {
      const coverageCheck = checkInterfaceCoverage(repoPath);
      if (!coverageCheck.skipped) {
        if (coverageCheck.ok) {
          console.log('  [dry run] ✓ Interface coverage table matches');
        } else {
          const isMinorOrMajor = level === 'minor' || level === 'major';
          console.log(`  [dry run] ${isMinorOrMajor ? '✗ Would BLOCK' : '! Would WARN'}: interface coverage mismatches`);
          for (const m of coverageCheck.missing) console.log(`    - ${m}`);
        }
      }
    }
    const hasSkill = existsSync(join(repoPath, 'SKILL.md'));
    console.log(`  [dry run] Would bump package.json to ${newVersion}`);
    if (hasSkill) console.log(`  [dry run] Would update SKILL.md version`);
    console.log(`  [dry run] Would update CHANGELOG.md`);
    console.log(`  [dry run] Would commit and tag v${newVersion}`);
    if (!noPublish) {
      console.log(`  [dry run] Would publish to npm (@wipcomputer scope)`);
      console.log(`  [dry run] GitHub Packages: handled by deploy-public.sh`);
      console.log(`  [dry run] Would create GitHub release v${newVersion}`);
      if (hasSkill) console.log(`  [dry run] Would publish to ClawHub`);
      // Skill-to-website dry run (auto-detects SKILL.md, no config needed)
      if (hasSkill) {
        const envSet = !!process.env.WIP_WEBSITE_REPO;
        if (envSet) {
          // Resolve name same way as publishSkillToWebsite
          let dryName;
          const publishConfig = join(repoPath, '.publish-skill.json');
          if (existsSync(publishConfig)) {
            try { dryName = JSON.parse(readFileSync(publishConfig, 'utf8')).name; } catch {}
          }
          if (!dryName) {
            const pkgPath = join(repoPath, 'package.json');
            if (existsSync(pkgPath)) {
              try { dryName = JSON.parse(readFileSync(pkgPath, 'utf8')).name?.replace(/^@[^/]+\//, ''); } catch {}
            }
          }
          if (!dryName) dryName = basename(repoPath).replace(/-private$/, '').toLowerCase();
          console.log(`  [dry run] Would publish SKILL.md to website: install/${dryName}.txt`);
        } else {
          console.log(`  [dry run] Would publish SKILL.md to website but WIP_WEBSITE_REPO not set`);
        }
      }
    }
    console.log('');
    console.log(`  Dry run complete. No changes made.`);
    console.log('');
    return { currentVersion, newVersion, dryRun: true };
  }

  // 1. Bump package.json
  writePackageVersion(repoPath, newVersion);
  console.log(`  ✓ package.json -> ${newVersion}`);

  // 1.5. Bump sub-tool versions in toolbox repos (tools/*/)
  const toolsDir = join(repoPath, 'tools');
  if (existsSync(toolsDir)) {
    let subBumped = 0;
    try {
      const entries = readdirSync(toolsDir, { withFileTypes: true });
      for (const entry of entries) {
        if (!entry.isDirectory()) continue;
        const subPkgPath = join(toolsDir, entry.name, 'package.json');
        if (existsSync(subPkgPath)) {
          try {
            const subPkg = JSON.parse(readFileSync(subPkgPath, 'utf8'));
            subPkg.version = newVersion;
            writeFileSync(subPkgPath, JSON.stringify(subPkg, null, 2) + '\n');
            subBumped++;
          } catch {}
        }
      }
    } catch {}
    if (subBumped > 0) {
      console.log(`  ✓ ${subBumped} sub-tool(s) -> ${newVersion}`);
    }
  }

  // 2. Sync SKILL.md
  if (syncSkillVersion(repoPath, newVersion)) {
    console.log(`  ✓ SKILL.md -> ${newVersion}`);
  }

  // 3. Update CHANGELOG.md
  updateChangelog(repoPath, newVersion, notes);
  console.log(`  ✓ CHANGELOG.md updated`);

  // 3.5. Move RELEASE-NOTES-v*.md to _trash/
  const trashed = trashReleaseNotes(repoPath);
  if (trashed > 0) {
    console.log(`  ✓ Moved ${trashed} RELEASE-NOTES file(s) to _trash/`);
  }

  // 3.75. Auto-update product docs version/date
  const docsUpdated = syncProductDocs(repoPath, newVersion);
  if (docsUpdated > 0) {
    console.log(`  ✓ Product docs synced to v${newVersion} (${docsUpdated} file(s))`);
  }

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

  // Distribution results collector (#104)
  const distResults = [];

  if (!noPublish) {
    // 6. npm publish
    try {
      publishNpm(repoPath);
      const pkg = JSON.parse(readFileSync(join(repoPath, 'package.json'), 'utf8'));
      distResults.push({ target: 'npm', status: 'ok', detail: `${pkg.name}@${newVersion}` });
      console.log(`  ✓ Published to npm`);
    } catch (e) {
      distResults.push({ target: 'npm', status: 'failed', detail: e.message });
      console.log(`  ✗ npm publish failed: ${e.message}`);
    }

    // 7. GitHub Packages ... SKIPPED from private repos.
    // deploy-public.sh publishes to GitHub Packages from the public repo clone.
    // Publishing from private ties the package to the private repo, making it
    // invisible on the public repo's Packages tab. (#53)
    console.log(`  - GitHub Packages: handled by deploy-public.sh (from public repo)`);

    // 8. GitHub release
    try {
      createGitHubRelease(repoPath, newVersion, notes, currentVersion);
      distResults.push({ target: 'GitHub', status: 'ok', detail: `v${newVersion}` });
      console.log(`  ✓ GitHub release v${newVersion} created`);
    } catch (e) {
      distResults.push({ target: 'GitHub', status: 'failed', detail: e.message });
      console.log(`  ✗ GitHub release failed: ${e.message}`);
    }

    // 9. ClawHub skill publish (root + sub-tools)
    const rootSkill = join(repoPath, 'SKILL.md');
    const toolsDir = join(repoPath, 'tools');

    // Publish root SKILL.md
    if (existsSync(rootSkill)) {
      try {
        publishClawHub(repoPath, newVersion, notes);
        const slug = detectSkillSlug(repoPath);
        distResults.push({ target: `ClawHub`, status: 'ok', detail: `${slug}@${newVersion}` });
        console.log(`  ✓ Published to ClawHub: ${slug}`);
      } catch (e) {
        distResults.push({ target: 'ClawHub (root)', status: 'failed', detail: e.message });
        console.log(`  ✗ ClawHub publish failed: ${e.message}`);
      }
    }

    // Publish each sub-tool SKILL.md (#97)
    if (existsSync(toolsDir)) {
      for (const tool of readdirSync(toolsDir)) {
        const toolPath = join(toolsDir, tool);
        const toolSkill = join(toolPath, 'SKILL.md');
        if (existsSync(toolSkill)) {
          try {
            publishClawHub(toolPath, newVersion, notes);
            const slug = detectSkillSlug(toolPath);
            distResults.push({ target: `ClawHub`, status: 'ok', detail: `${slug}@${newVersion}` });
            console.log(`  ✓ Published to ClawHub: ${slug}`);
          } catch (e) {
            const slug = detectSkillSlug(toolPath);
            distResults.push({ target: `ClawHub (${slug})`, status: 'failed', detail: e.message });
            console.log(`  ✗ ClawHub publish failed for ${slug}: ${e.message}`);
          }
        }
      }
    }

    // 9.5. Publish SKILL.md to website as plain text
    const skillWebResult = publishSkillToWebsite(repoPath);
    if (skillWebResult.skipped) {
      // Silent skip ... no config or env var
    } else if (skillWebResult.ok) {
      const deployNote = skillWebResult.deployed ? '' : ' (copied, deploy skipped)';
      distResults.push({ target: 'Website', status: 'ok', detail: `install/${skillWebResult.target}.txt${deployNote}` });
      console.log(`  ✓ Published to website: install/${skillWebResult.target}.txt${deployNote}`);
      if (!skillWebResult.deployed && skillWebResult.error) {
        console.log(`    ! ${skillWebResult.error}`);
      }
    } else {
      distResults.push({ target: 'Website', status: 'failed', detail: skillWebResult.error });
      console.log(`  ✗ Website publish failed: ${skillWebResult.error}`);
    }
  }

  // Distribution summary (#104)
  if (distResults.length > 0) {
    console.log('');
    console.log('  Distribution:');
    for (const r of distResults) {
      const icon = r.status === 'ok' ? '✓' : '✗';
      console.log(`    ${icon} ${r.target}: ${r.detail}`);
    }
    const failed = distResults.filter(r => r.status !== 'ok');
    if (failed.length > 0) {
      console.log(`\n  ! ${failed.length} of ${distResults.length} target(s) failed.`);
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
      const current = execSync('git branch --show-current', { cwd: repoPath, encoding: 'utf8' }).trim();
      console.log(`  Scanning ${merged.length} merged branch(es) for rename...`);
      for (const branch of merged) {
        if (branch === current) continue;
        // Skip branches with characters that break git commands
        if (/[+\s~^:?*\[\]]/.test(branch)) continue;

        let mergeDate;
        try {
          // Use execFileSync (array args) instead of execSync (shell string) to avoid injection
          const mergeBase = execFileSync('git', ['merge-base', 'main', branch], { cwd: repoPath, encoding: 'utf8' }).trim();
          const logOutput = execFileSync('git', ['log', 'main', '--format=%ai', '--ancestry-path', `${mergeBase}..main`], { cwd: repoPath, encoding: 'utf8' }).trim();
          if (logOutput) mergeDate = logOutput.split('\n').pop().split(' ')[0];
        } catch {}
        if (!mergeDate) {
          try {
            mergeDate = execFileSync('git', ['log', branch, '-1', '--format=%ai'], { cwd: repoPath, encoding: 'utf8' }).trim().split(' ')[0];
          } catch {}
        }
        if (!mergeDate) continue;

        const newName = `${branch}--merged-${mergeDate}`;
        try {
          execFileSync('git', ['branch', '-m', branch, newName], { cwd: repoPath, stdio: 'pipe' });
          execFileSync('git', ['push', 'origin', newName], { cwd: repoPath, stdio: 'pipe' });
          // Remote branch may already be deleted by GitHub PR merge. That's fine.
          try { execFileSync('git', ['push', 'origin', '--delete', branch], { cwd: repoPath, stdio: 'pipe' }); } catch {}
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
            execFileSync('git', ['push', 'origin', '--delete', branches[i]], { cwd: repoPath, stdio: 'pipe' });
            try { execFileSync('git', ['branch', '-d', branches[i]], { cwd: repoPath, stdio: 'pipe' }); } catch {}
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
      if (/[+\s~^:?*\[\]]/.test(branch)) continue;
      try {
        execFileSync('git', ['merge-base', '--is-ancestor', `origin/${branch}`, 'origin/main'], { cwd: repoPath, stdio: 'pipe' });
        // If we get here, branch is fully merged
        try { execFileSync('git', ['push', 'origin', '--delete', branch], { cwd: repoPath, stdio: 'pipe' }); } catch {}
        try { execFileSync('git', ['branch', '-d', branch], { cwd: repoPath, stdio: 'pipe' }); } catch {}
        staleCleaned++;
      } catch {}
    }
    if (staleCleaned > 0) {
      console.log(`  ✓ Cleaned ${staleCleaned} stale branch(es)`);
    }
  } catch (e) {
    console.log(`  ! Branch prune skipped: ${e.message}`);
  }

  // 12. Prune stale worktrees (#212)
  try {
    execSync('git worktree prune', { cwd: repoPath, stdio: 'pipe' });
    // Also check .worktrees/ for dirs whose branches are now merged
    const worktreesDir = join(dirname(repoPath), '.worktrees');
    if (existsSync(worktreesDir)) {
      const repoBase = basename(repoPath);
      const wtDirs = readdirSync(worktreesDir, { withFileTypes: true })
        .filter(d => d.isDirectory() && d.name.startsWith(repoBase + '--'));
      let wtPruned = 0;
      for (const d of wtDirs) {
        const wtPath = join(worktreesDir, d.name);
        try {
          // Check if branch is merged into main
          const branch = execSync('git branch --show-current', {
            cwd: wtPath, encoding: 'utf8', timeout: 3000
          }).trim();
          if (branch) {
            execSync(`git merge-base --is-ancestor "${branch}" main`, {
              cwd: repoPath, stdio: 'pipe', timeout: 5000
            });
            // Branch is merged. Remove worktree.
            execSync(`git worktree remove "${wtPath}"`, { cwd: repoPath, stdio: 'pipe' });
            wtPruned++;
          }
        } catch {} // Branch not merged or other issue, leave it
      }
      if (wtPruned > 0) {
        console.log(`  ✓ Pruned ${wtPruned} merged worktree(s) from .worktrees/`);
      }
    }
  } catch {}

  // Write release marker so branch guard blocks immediate install (#73)
  try {
    const markerDir = join(process.env.HOME || '', '.ldm', 'state');
    const { mkdirSync, writeFileSync } = await import('node:fs');
    mkdirSync(markerDir, { recursive: true });
    writeFileSync(join(markerDir, '.last-release'), JSON.stringify({
      repo: repoName,
      version: newVersion,
      timestamp: new Date().toISOString(),
    }) + '\n');
  } catch {}

  console.log('');
  console.log(`  Done. ${repoName} v${newVersion} released.`);
  console.log('');

  return { currentVersion, newVersion, dryRun: false };
}
