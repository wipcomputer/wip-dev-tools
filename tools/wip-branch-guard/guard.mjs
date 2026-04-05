#!/usr/bin/env node
// wip-branch-guard/guard.mjs
// PreToolUse hook for Claude Code.
// Blocks ALL file writes and git commits when on main branch.
// Agents must work on branches or worktrees. Never on main.
// Also blocks dangerous flags (--no-verify, --force) on ANY branch.

import { execSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { statSync, readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

if (process.argv.includes('--version') || process.argv.includes('-v')) {
  const __dirname = dirname(fileURLToPath(import.meta.url));
  const pkg = JSON.parse(readFileSync(join(__dirname, 'package.json'), 'utf8'));
  console.log(pkg.version);
  process.exit(0);
}

// Tools that modify files or git state
const WRITE_TOOLS = new Set(['Write', 'Edit', 'NotebookEdit']);
const BASH_TOOL = 'Bash';

// Git commands that should be blocked on main
const BLOCKED_GIT_PATTERNS = [
  /\bgit\s+commit\b/,
  /\bgit\s+add\b/,
  /\bgit\s+stash\b/,
  /\bgit\s+reset\b/,
  /\bgit\s+revert\b/,
  /\bgit\s+clean\b/,
  /\bgit\s+restore\b/,
];

// Destructive git commands blocked on ANY branch, not just main.
// These destroy work that may belong to other agents or the user.
// Checked against STRIPPED command (quoted content removed) to avoid false positives (#232).
const DESTRUCTIVE_PATTERNS = [
  /\bgit\s+clean\s+-[a-zA-Z]*f/,        // git clean -f, -fd, -fdx (deletes untracked files)
  /\bgit\s+checkout\s+--\s/,             // git checkout -- <path> (reverts files)
  /\bgit\s+checkout\s+\.\s*$/,           // git checkout . (reverts everything)
  /\bgit\s+stash\s+drop\b/,             // git stash drop (permanently deletes stashed work)
  /\bgit\s+stash\s+pop\b/,              // git stash pop (overwrites working tree, drops on success)
  /\bgit\s+stash\s+clear\b/,            // git stash clear (drops all stashes)
  /\bgit\s+reset\s+--hard\b/,           // git reset --hard (nukes all uncommitted changes)
  /\bgit\s+restore\s+(?!--staged)/,     // git restore <path> (reverts files, but --staged is safe)
];

// Code execution bypass patterns. Checked against ORIGINAL command because
// the attack IS inside quotes (e.g. python -c "open('f').write('x')").
const DESTRUCTIVE_CODE_PATTERNS = [
  /\bpython3?\s+-c\s+.*\bopen\s*\(/,    // python -c "open().write()" bypass (#241)
  /\bnode\s+-e\s+.*\bwriteFile/,         // node -e "require('fs').writeFile()" or "fs.writeFile()" bypass
];

// Strip quoted string contents to prevent regex matching inside data.
// "gh issue create --body 'use git checkout -- to fix'" becomes
// "gh issue create --body ''" so git checkout -- doesn't false-positive.
function stripQuotedContent(cmd) {
  return cmd.replace(/"(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'/g, '""');
}

// Check each segment of a compound command independently.
// "rm -f file ; echo done" splits into ["rm -f file", "echo done"].
// Each segment checked against blocked, then allowed. An allowed match
// on one segment can't excuse a blocked match on a different segment (#232).
function isBlockedCompoundCommand(cmd, blockedPatterns, allowedPatterns) {
  const stripped = stripQuotedContent(cmd);
  const segments = stripped.split(/\s*(?:&&|\|\||[;|])\s*/).filter(Boolean);
  for (const segment of segments) {
    if (blockedPatterns.some(p => p.test(segment))) {
      if (!allowedPatterns.some(p => p.test(segment))) return true;
    }
  }
  return false;
}

// Git commands that are ALLOWED on main (read-only or safe operations)
const ALLOWED_GIT_PATTERNS = [
  /\bgit\s+merge\b/,
  /\bgit\s+pull\b/,
  /\bgit\s+fetch\b/,
  /\bgit\s+push\b/,
  /\bgit\s+status\b/,
  /\bgit\s+log\b/,
  /\bgit\s+diff\b/,
  /\bgit\s+branch\b/,
  /\bgit\s+checkout\s+(?!--)[\w\-\/]+/,  // git checkout <branch> only, NOT git checkout -- <path>
  /\bgit\s+worktree\b/,
  /\bgit\s+stash\s+list\b/,              // read-only, just lists stashes
  /\bgit\s+stash\s+show\b/,              // read-only, just shows stash contents
  /\bgit\s+stash\s+(push|save)\b/,       // saving to stash is non-destructive; drop/pop/clear blocked in DESTRUCTIVE_PATTERNS
  /\bgit\s+stash\s*$/,                   // bare "git stash" = "git stash push"; same safety
  /\bgit\s+remote\b/,
  /\bgit\s+describe\b/,
  /\bgit\s+tag\b/,
  /\bgit\s+rev-parse\b/,
  /\bgit\s+show\b/,
  /\bgit\s+restore\s+--staged\b/,        // unstaging is safe (doesn't change working tree)
];

// Non-git bash commands that write files (common patterns)
const BLOCKED_BASH_PATTERNS = [
  /\bcp\s+/,
  /\bmv\s+/,
  /\brm\s+/,
  /\bmkdir\s+/,
  /\btouch\s+/,
  />\s/,          // redirects
  /\btee\s+/,
  /\bsed\s+-i/,
];

// Allowed bash patterns (read-only operations, even though they match blocked patterns)
const ALLOWED_BASH_PATTERNS = [
  /\bls\b/,
  /\bcat\b/,
  /\bhead\b/,
  /\btail\b/,
  /\bgrep\b/,
  /\brg\b/,
  /\bfind\b/,
  /\bwc\b/,
  /\becho\b/,
  /\bcurl\b/,
  /\bgh\s+(issue|pr|release|api)\b/,
  /\bgh\s+pr\s+merge\b/,
  /\blsof\b/,
  /\bopen\s+-a\b/,
  /\bpwd\b/,
  /--dry-run/,
  /--help/,
  /\bwip-release\b.*--dry-run/,
  /\bnpm\s+install\s+-g\b/,   // global installs modify /opt/homebrew/, not the repo
  /\bnpm\s+link\b/,            // global operation, not repo-local
  /\bldm\s+(install|init|doctor|stack|updates)\b/,  // LDM OS commands modify ~/.ldm/, not the repo
  /\brm\s+.*\.ldm\/state\//,    // cleaning LDM state files only, not repo files
  /\brm\s+.*\.(openclaw|ldm)\/extensions\//,  // cleaning deployed extensions (managed by ldm install, not source code)
  /\bcp\s+.*\.(openclaw|ldm)\/extensions\//,  // hotfix deploy: cp plugin builds to extensions (ldm install is canonical)
  /\bmv\s+.*\.(openclaw|ldm)\/extensions\//,  // hotfix deploy: mv within extensions
  /\bmkdir\s+.*\.(openclaw|ldm)\/extensions\//, // hotfix deploy: create extension dirs
  /\bclaude\s+mcp\b/,          // MCP registration, not repo files
  /\bmkdir\s+.*\.worktrees\b/,  // creating .worktrees/ directory is part of the process
  /\brm\s+.*\.trash-approved-to-rm/,  // Parker's approved-for-deletion folder (only Parker moves files here, agents only rm)
  /\brm\s+.*\/_trash\//,              // agent trash directories (agents can mv here and rm here)
];

// Workflow steps for error messages (#213)
const WORKFLOW_ON_MAIN = `
The process: worktree -> branch -> commit -> push -> PR -> merge -> wip-release -> deploy-public.

Step 1: git worktree add .worktrees/<repo>--<branch> -b cc-mini/your-feature
Step 2: Edit files in the worktree
Step 3: git add + git commit (with co-authors)
Step 4: git push -u origin cc-mini/your-feature
Step 5: gh pr create, then gh pr merge --merge --delete-branch
Step 6: Back in main repo: git pull
Step 7: wip-release patch (with RELEASE-NOTES on the branch, not after)
Step 8: deploy-public.sh to sync public repo

Release notes go ON the feature branch, committed with the code. Not as a separate PR.

STUCK clearing an untracked file before git pull? Use stash (non-destructive):
  git stash push -u -- <path>    # move untracked file aside
  git pull                       # pulls cleanly
  git stash list                 # file is preserved in stash, not lost`.trim();

const WORKFLOW_NOT_WORKTREE = `
You're on a branch but not in a worktree. Use a worktree so the main working tree stays clean.

Step 1: git checkout main (go back to main first)
Step 2: git worktree add ../my-worktree -b your-branch-name
Step 3: Edit files in the worktree directory`.trim();

function deny(reason) {
  const output = {
    hookSpecificOutput: {
      hookEventName: 'PreToolUse',
      permissionDecision: 'deny',
      permissionDecisionReason: reason,
    },
  };
  process.stdout.write(JSON.stringify(output));
}

function findRepoRoot(filePath) {
  // Walk up from a file path to find the git repo root
  try {
    let dir = filePath;
    // If it's a file, start from its directory
    try {
      if (statSync(dir).isFile()) dir = dirname(dir);
    } catch {
      dir = dirname(dir); // File might not exist yet
    }

    // Walk up until we find an existing directory (handles mkdir for new paths)
    while (dir && dir !== '/') {
      try {
        const s = statSync(dir);
        if (s.isDirectory()) break;
        dir = dirname(dir);
      } catch {
        dir = dirname(dir);
      }
    }

    // Use git rev-parse from the directory
    const result = execSync('git rev-parse --show-toplevel 2>/dev/null', {
      cwd: dir,
      encoding: 'utf8',
      timeout: 3000,
    }).trim();
    return result;
  } catch {}
  return null;
}

function extractPathsFromCommand(command) {
  // Extract absolute paths from a bash command
  // Matches paths like /Users/foo/bar, /tmp/something, etc.
  const paths = [];
  const regex = /(\/(?:Users|home|tmp|var|opt|etc|private)[^\s"'|;&>)]+)/g;
  let match;
  while ((match = regex.exec(command)) !== null) {
    paths.push(match[1]);
  }
  return paths;
}

function getCurrentBranch(cwd) {
  try {
    return execSync('git branch --show-current 2>/dev/null', {
      cwd: cwd || process.cwd(),
      encoding: 'utf8',
      timeout: 3000,
    }).trim();
  } catch {
    return null; // Not in a git repo
  }
}

function isInWorktree(cwd) {
  try {
    const gitDir = execSync('git rev-parse --git-dir 2>/dev/null', {
      cwd: cwd || process.cwd(),
      encoding: 'utf8',
      timeout: 3000,
    }).trim();
    return gitDir.includes('/worktrees/');
  } catch {
    return false;
  }
}

// CLI mode
if (process.argv.includes('--check')) {
  const branch = getCurrentBranch();
  const worktree = isInWorktree();
  console.log(`Branch: ${branch || '(not in git repo)'}`);
  console.log(`Worktree: ${worktree ? 'yes' : 'no'}`);
  console.log(`Status: ${branch === 'main' || branch === 'master' ? 'BLOCKED (on main)' : 'OK'}`);
  process.exit(branch === 'main' || branch === 'master' ? 1 : 0);
}

/**
 * SessionStart handler. Fires once per session boot (startup, resume,
 * and post-compaction resume). If the session's CWD is a main-branch
 * working tree of a protected git repo, inject a warning into the boot
 * context with available worktrees and the stash workaround so the
 * agent does not enter the compaction loop that wasted approximately
 * $900 of tokens on 2026-04-05.
 *
 * Uses `additionalContext` in the hookSpecificOutput response to
 * inject text into the session's context without blocking boot.
 *
 * Related:
 *   ai/product/bugs/guard/2026-04-05--cc-mini--guard-master-plan.md Phase 7
 *   ai/product/bugs/master-plans/bugs-plan-04-05-2026-002.md Wave 2 phase 13
 */
function handleSessionStart(input) {
  const cwd = input.cwd || process.cwd();
  let branch = null;
  let repoRoot = null;
  try {
    repoRoot = execSync('git rev-parse --show-toplevel 2>/dev/null', {
      cwd, encoding: 'utf8', timeout: 3000,
    }).trim();
    branch = execSync('git branch --show-current 2>/dev/null', {
      cwd, encoding: 'utf8', timeout: 3000,
    }).trim();
  } catch {
    // Not a git repo, or git plumbing unavailable. Nothing to warn about.
    process.exit(0);
  }

  if (!branch || (branch !== 'main' && branch !== 'master')) {
    // Already on a feature branch, no warning needed.
    process.exit(0);
  }

  // We are on main. Enumerate available worktrees so the warning is actionable.
  const worktrees = [];
  try {
    const raw = execSync('git worktree list --porcelain 2>/dev/null', {
      cwd, encoding: 'utf8', timeout: 3000,
    });
    let current = {};
    for (const line of raw.split('\n')) {
      if (line.startsWith('worktree ')) {
        if (current.path) worktrees.push(current);
        current = { path: line.slice('worktree '.length) };
      } else if (line.startsWith('branch ')) {
        current.branch = line.slice('branch '.length).replace(/^refs\/heads\//, '');
      } else if (line.startsWith('HEAD ')) {
        current.head = line.slice('HEAD '.length);
      } else if (line === 'detached') {
        current.detached = true;
      }
    }
    if (current.path) worktrees.push(current);
  } catch {}

  // The first entry is always the main working tree. Drop it to get
  // the list of linked worktrees only.
  const linkedWorktrees = worktrees.filter(w => w.path !== repoRoot);

  let worktreeList;
  if (linkedWorktrees.length === 0) {
    worktreeList = '  (no existing worktrees; create one with: git worktree add .worktrees/<repo>--cc-mini--<feature> -b cc-mini/<feature>)';
  } else {
    worktreeList = linkedWorktrees
      .slice(0, 10)
      .map(w => `  cd ${w.path}  # branch: ${w.branch || '(detached)'}`)
      .join('\n');
    if (linkedWorktrees.length > 10) {
      worktreeList += `\n  ... and ${linkedWorktrees.length - 10} more (see: git worktree list)`;
    }
  }

  const warning = `⚠️  GUARD WARNING: You are in ${repoRoot} on the main branch.

The branch-guard will block file-modifying operations here. Before editing any file, switch to a worktree:

${worktreeList}

Or create a fresh worktree:
  git worktree add .worktrees/<repo>--cc-mini--<feature> -b cc-mini/<feature>

If you hit "git pull" failing on an untracked file that is already on origin/main, use the native stash escape hatch (shipped 2026-04-05):
  git stash push -u -- <path>
  git pull
  git stash list

Related context:
  ai/product/bugs/guard/2026-04-05--cc-mini--guard-master-plan.md
  ai/product/bugs/master-plans/bugs-plan-04-05-2026-002.md`;

  const output = {
    hookSpecificOutput: {
      hookEventName: 'SessionStart',
      additionalContext: warning,
    },
  };
  process.stdout.write(JSON.stringify(output));
  process.exit(0);
}

async function main() {
  let raw = '';
  for await (const chunk of process.stdin) {
    raw += chunk;
  }

  let input;
  try {
    input = JSON.parse(raw);
  } catch {
    process.exit(0);
  }

  // Branch on hook event. Claude Code sends `hook_event_name` in the input
  // for every hook, so we can dispatch without a separate script per event.
  // PreToolUse payloads carry tool_name + tool_input; SessionStart payloads
  // carry cwd + source. Fall back on shape detection for harnesses that omit
  // hook_event_name (older Claude Code versions, OpenClaw, etc.).
  const eventName =
    input.hook_event_name ||
    input.hookEventName ||
    (input.tool_name ? 'PreToolUse' : (input.cwd || input.source ? 'SessionStart' : 'unknown'));

  if (eventName === 'SessionStart') {
    handleSessionStart(input);
    return; // handleSessionStart exits
  }

  const toolName = input.tool_name || '';
  const toolInput = input.tool_input || {};

  // Block destructive commands on ANY branch.
  // These destroy work that may belong to other agents or the user.
  if (toolName === BASH_TOOL) {
    const cmd = (toolInput.command || '');
    const strippedCmd = stripQuotedContent(cmd);

    // Git destructive patterns: check against stripped command (no quoted content)
    for (const pattern of DESTRUCTIVE_PATTERNS) {
      if (pattern.test(strippedCmd)) {
        deny(`BLOCKED: Destructive command detected.

"${cmd.substring(0, 80)}" can permanently destroy uncommitted work (yours, the user's, or another agent's).

DO NOT retry. DO NOT work around this. Instead:
1. STOP. Think about what you actually need to accomplish.
2. If you need a clean working tree, use a WORKTREE instead of destroying files on main.
3. If something is stuck (merge conflict, dirty state), create a safety checkpoint first:
   git stash create  (saves all uncommitted work without modifying the tree)
   git stash store <sha> -m "checkpoint before cleanup"
4. THEN proceed carefully with the minimum necessary operation.

These commands have destroyed work belonging to the user and other agents multiple times.`);
        process.exit(0);
      }
    }
    // Code execution bypasses: check against original command (the attack IS inside quotes)
    for (const pattern of DESTRUCTIVE_CODE_PATTERNS) {
      if (pattern.test(cmd)) {
        deny(`BLOCKED: Code execution bypass detected.

"${cmd.substring(0, 80)}" writes files through a scripting language, bypassing git protections.

Use the proper workflow: edit files in a worktree, commit, push, PR.`);
        process.exit(0);
      }
    }
  }

  // Block dangerous flags on ANY branch (these bypass safety checks)
  if (toolName === BASH_TOOL) {
    const cmd = (toolInput.command || '');
    if (/--no-verify\b/.test(cmd)) {
      deny('BLOCKED: --no-verify bypasses git hooks. Remove it and let the hooks run.');
      process.exit(0);
    }
    if (/\bgit\s+push\b.*--force\b/.test(cmd) && !/--force-with-lease\b/.test(cmd)) {
      deny('BLOCKED: git push --force can destroy remote history. Use --force-with-lease or ask Parker.');
      process.exit(0);
    }

    // Block npm install -g right after a release (#73)
    // wip-release writes ~/.ldm/state/.last-release on completion.
    // If a release happened < 5 minutes ago, block install unless user explicitly said "install".
    // Exception: prerelease installs (@alpha, @beta) skip the cooldown. The cooldown exists
    // to enforce dogfooding stable releases. Prerelease installs ARE the dogfooding.
    if (/\bnpm\s+install\s+-g\b/.test(cmd) && !/@(alpha|beta)\b/.test(cmd)) {
      try {
        const releasePath = join(process.env.HOME || '', '.ldm', 'state', '.last-release');
        if (existsSync(releasePath)) {
          const data = JSON.parse(readFileSync(releasePath, 'utf8'));
          const age = Date.now() - new Date(data.timestamp).getTime();
          if (age < 5 * 60 * 1000) { // 5 minutes
            deny(`BLOCKED: Release completed ${Math.round(age / 1000)}s ago. Dogfood first. Remove ~/.ldm/state/.last-release when ready to install.`);
            process.exit(0);
          }
        }
      } catch {}
    }

    // Warn when creating worktrees outside .worktrees/ (#212)
    const wtMatch = cmd.match(/\bgit\s+worktree\s+add\s+["']?([^\s"']+)/);
    if (wtMatch) {
      const wtPath = wtMatch[1];
      if (!wtPath.includes('.worktrees')) {
        deny(`WARNING: Creating worktree outside .worktrees/. Use: ldm worktree add <branch>

The convention is .worktrees/<repo>--<branch>/ so worktrees are hidden and don't mix with real repos.
Manual equivalent: git worktree add .worktrees/<repo>--<branch> -b <branch>

This is a warning, not a block. If you need to create it here, retry.`);
        process.exit(0);
      }
    }
  }

  // Determine which repo to check.
  // Claude Code always opens in .openclaw, but edits files in other repos.
  // We need to check the branch of THE REPO THE FILE LIVES IN, not the CWD.
  const filePath = toolInput.file_path || toolInput.filePath || '';
  const command = toolInput.command || '';

  // For Write/Edit: derive repo from the file path
  // For Bash: try to extract repo path from the command (cd, or file paths in args)
  let repoDir = null;

  if (filePath) {
    // Walk up from file path to find .git directory
    repoDir = findRepoRoot(filePath);
    if (!repoDir) {
      // File is outside any git repo (e.g. ~/.claude/plans/, /tmp/).
      // The guard only protects git repos. Allow it.
      process.exit(0);
    }
  }

  if (!repoDir && command) {
    // Try to extract a path from the bash command
    // Common patterns: cd "/path/to/repo" && ..., or paths in arguments
    const cdMatch = command.match(/cd\s+["']?([^"'&|;]+?)["']?\s*(?:&&|;|$)/);
    if (cdMatch) {
      repoDir = findRepoRoot(cdMatch[1].trim());
    }
    // Also check for git -C /path/to/repo
    const gitCMatch = command.match(/git\s+-C\s+["']?([^"'&|;]+?)["']?\s/);
    if (!repoDir && gitCMatch) {
      repoDir = findRepoRoot(gitCMatch[1].trim());
    }
    // Extract absolute paths from the command itself (handles mkdir, cp, mv, etc.)
    if (!repoDir) {
      const paths = extractPathsFromCommand(command);
      for (const p of paths) {
        const resolved = findRepoRoot(p);
        if (resolved) {
          repoDir = resolved;
          break;
        }
      }
    }
  }

  // Fall back to CWD
  if (!repoDir) {
    repoDir = process.env.CWD || process.cwd();
  }

  // Check if the target repo is on main AND if we're in a worktree
  const branch = getCurrentBranch(repoDir);
  const worktree = isInWorktree(repoDir);

  if (!branch) {
    // Not in a git repo, allow
    process.exit(0);
  }

  // Allow everything in repos with zero commits (bootstrap)
  try {
    const hasCommits = execSync('git rev-parse HEAD', { cwd: repoDir, stdio: 'pipe' });
  } catch {
    // No commits yet. Allow the first commit so the repo can be bootstrapped.
    process.exit(0);
  }

  if (branch !== 'main' && branch !== 'master' && worktree) {
    // On a branch AND in a worktree. Correct workflow. Allow.
    process.exit(0);
  }

  if (branch !== 'main' && branch !== 'master' && !worktree) {
    // On a branch but NOT in a worktree. Block writes.
    const isWriteOp = WRITE_TOOLS.has(toolName) ||
      (toolName === BASH_TOOL && command &&
        isBlockedCompoundCommand(command, BLOCKED_BASH_PATTERNS, ALLOWED_BASH_PATTERNS));
    if (isWriteOp) {
      deny(`BLOCKED: On branch "${branch}" but not in a worktree.\n\n${WORKFLOW_NOT_WORKTREE}`);
      process.exit(0);
    }
    process.exit(0);
  }

  // We're on main. Check if this is a shared state file (always writable).
  // These are not code. They're shared context between agents.
  const SHARED_STATE_PATTERNS = [
    /CLAUDE\.md$/,
    /workspace\/SHARED-CONTEXT\.md$/,
    /workspace\/TOOLS\.md$/,
    /workspace\/MEMORY\.md$/,
    /workspace\/IDENTITY\.md$/,
    /workspace\/SOUL\.md$/,
    /workspace\/WHERE-TO-WRITE\.md$/,
    /workspace\/HEARTBEAT\.md$/,
    /workspace\/memory\/.*\.md$/,
    /\.ldm\/agents\/.*\/memory\/daily\/.*\.md$/,
    /\.ldm\/memory\/shared-log\.jsonl$/,
    /\.ldm\/memory\/daily\/.*\.md$/,
    /\.ldm\/logs\//,
    /\.claude\/plans\//,              // Claude Code plan files (plan mode)
    /\.ldm\/shared\//,               // Agent docs (deployed by installer)
    /\.ldm\/messages\//,             // Agent inbox (bridge messages)
    /\.ldm\/templates\//,            // Templates (deployed by installer)
    /\.claude\/rules\//,             // Deployed rules
    /\.openclaw\/extensions\//,      // Deployed OpenClaw extensions (runtime, not source)
    /\.ldm\/extensions\//,           // Deployed LDM extensions (runtime, not source; symmetry with openclaw)
  ];

  if (filePath && SHARED_STATE_PATTERNS.some(p => p.test(filePath))) {
    process.exit(0); // Shared state, always allow
  }

  // Block Write/Edit tools entirely on main
  if (WRITE_TOOLS.has(toolName)) {
    deny(`BLOCKED: Cannot ${toolName} while on main branch.\n\n${WORKFLOW_ON_MAIN}`);
    process.exit(0);
  }

  // For Bash, check each command segment independently (#232).
  // No fast-path: an allowed pattern on one segment can't excuse a blocked pattern on another.
  if (toolName === BASH_TOOL && command) {
    // Check for blocked git commands (per-segment, quote-stripped)
    if (isBlockedCompoundCommand(command, BLOCKED_GIT_PATTERNS, ALLOWED_GIT_PATTERNS)) {
      deny(`BLOCKED: Cannot run "${command.substring(0, 60)}..." on main branch.\n\n${WORKFLOW_ON_MAIN}`);
      process.exit(0);
    }

    // Check for file-writing bash commands (per-segment, quote-stripped)
    if (isBlockedCompoundCommand(command, BLOCKED_BASH_PATTERNS, ALLOWED_BASH_PATTERNS)) {
      deny(`BLOCKED: Cannot run file-modifying command on main branch.\n\n${WORKFLOW_ON_MAIN}`);
      process.exit(0);
    }
  }

  // Allow everything else (Read, Glob, Grep, Agent, etc.)
  process.exit(0);
}

main().catch(() => process.exit(0));
