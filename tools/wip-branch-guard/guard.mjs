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
];

// Git commands that are ALLOWED on main (read-only or merge operations)
const ALLOWED_GIT_PATTERNS = [
  /\bgit\s+merge\b/,
  /\bgit\s+pull\b/,
  /\bgit\s+fetch\b/,
  /\bgit\s+push\b/,
  /\bgit\s+status\b/,
  /\bgit\s+log\b/,
  /\bgit\s+diff\b/,
  /\bgit\s+branch\b/,
  /\bgit\s+checkout\b/,
  /\bgit\s+worktree\b/,
  /\bgit\s+stash\s+drop\b/,
  /\bgit\s+stash\s+list\b/,
  /\bgit\s+remote\b/,
  /\bgit\s+describe\b/,
  /\bgit\s+tag\b/,
  /\bgit\s+rev-parse\b/,
  /\bgit\s+show\b/,
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
  /\bnode\s+-e\b/,
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
  /\bclaude\s+mcp\b/,          // MCP registration, not repo files
];

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

  const toolName = input.tool_name || '';
  const toolInput = input.tool_input || {};

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
    if (/\bnpm\s+install\s+-g\b/.test(cmd)) {
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

  if (branch !== 'main' && branch !== 'master' && worktree) {
    // On a branch AND in a worktree. Correct workflow. Allow.
    process.exit(0);
  }

  if (branch !== 'main' && branch !== 'master' && !worktree) {
    // On a branch but NOT in a worktree. Block writes.
    const isWriteOp = WRITE_TOOLS.has(toolName) ||
      (toolName === BASH_TOOL && command &&
        BLOCKED_BASH_PATTERNS.some(p => p.test(command)) &&
        !ALLOWED_BASH_PATTERNS.some(p => p.test(command)));
    if (isWriteOp) {
      deny(`BLOCKED: On branch "${branch}" but not in a worktree. Use: git worktree add ../my-worktree -b ${branch}`);
      process.exit(0);
    }
    process.exit(0);
  }

  // We're on main. Check if this is a write operation.

  // Block Write/Edit tools entirely on main
  if (WRITE_TOOLS.has(toolName)) {
    deny(`BLOCKED: Cannot ${toolName} while on main branch. Use a worktree: git worktree add ../my-worktree -b cc-mini/your-feature`);
    process.exit(0);
  }

  // For Bash, check the command
  if (toolName === BASH_TOOL && command) {
    // First check if it's explicitly allowed (read-only)
    for (const pattern of ALLOWED_BASH_PATTERNS) {
      if (pattern.test(command)) {
        process.exit(0);
      }
    }

    // Check for blocked git commands
    for (const pattern of BLOCKED_GIT_PATTERNS) {
      if (pattern.test(command)) {
        // Make sure it's not an allowed git operation
        let isAllowed = false;
        for (const ap of ALLOWED_GIT_PATTERNS) {
          if (ap.test(command)) { isAllowed = true; break; }
        }
        if (!isAllowed) {
          deny(`BLOCKED: Cannot run "${command.substring(0, 60)}..." on main branch. Use a worktree: git worktree add ../my-worktree -b cc-mini/your-feature`);
          process.exit(0);
        }
      }
    }

    // Check for file-writing bash commands
    for (const pattern of BLOCKED_BASH_PATTERNS) {
      if (pattern.test(command)) {
        // Check it's not a read-only context
        let isAllowed = false;
        for (const ap of ALLOWED_BASH_PATTERNS) {
          if (ap.test(command)) { isAllowed = true; break; }
        }
        if (!isAllowed) {
          deny(`BLOCKED: Cannot run file-modifying command on main branch. Use a worktree: git worktree add ../my-worktree -b cc-mini/your-feature`);
          process.exit(0);
        }
      }
    }
  }

  // Allow everything else (Read, Glob, Grep, Agent, etc.)
  process.exit(0);
}

main().catch(() => process.exit(0));
