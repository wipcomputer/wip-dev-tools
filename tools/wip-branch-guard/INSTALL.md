# wip-branch-guard Installation

Add this hook to `~/.claude/settings.json` under `hooks.PreToolUse`:

```json
{
  "matcher": "Write|Edit|NotebookEdit|Bash",
  "hooks": [
    {
      "type": "command",
      "command": "node /Users/lesa/.ldm/extensions/wip-branch-guard/guard.mjs",
      "timeout": 5
    }
  ]
}
```

Then copy the guard to the extensions directory:

```bash
mkdir -p ~/.ldm/extensions/wip-branch-guard
cp guard.mjs package.json ~/.ldm/extensions/wip-branch-guard/
```

## What it does

Blocks ALL file writes and git commits when Claude Code is on main branch.
Agents must create a branch or use a worktree before editing anything.

## What it allows on main

- Read, Glob, Grep (read-only tools)
- git status, git log, git diff, git branch, git checkout, git pull, git merge, git push
- gh commands (issues, PRs, releases)
- Opening files in browser/mdview

## Test

```bash
node ~/.ldm/extensions/wip-branch-guard/guard.mjs --check
```
