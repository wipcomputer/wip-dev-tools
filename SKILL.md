---
name: WIP Dev Tools
version: 1.4.0
description: Dev toolkit for AI-assisted software development. Release pipeline, license compliance, repo visibility guard, manifest reconciler, and best practices. All core tools are agent-callable via MCP.
category: dev-tools
capabilities:
  - version-bump
  - changelog-update
  - npm-publish
  - github-release
  - license-scanning
  - license-compliance
  - repo-sync
  - repo-visibility-guard
  - manifest-reconciliation
  - mcp-server
interface: [cli, module, mcp, skill]
requires:
  binaries: [git, npm, gh, node]
---

# WIP Dev Tools

A collection of tools for AI-assisted software development.

## What's Included

### wip-release
One-command release pipeline. Bumps version, updates changelog + SKILL.md, publishes to npm + GitHub Packages, creates GitHub release.

Install: `npm install -g @wipcomputer/wip-release`
Usage: `wip-release patch --notes="description"`
Docs: [README](tools/wip-release/README.md) | [REFERENCE](tools/wip-release/REFERENCE.md)

### wip-license-hook
License rug-pull detection. Scans dependencies and forks for license changes. Git hooks block bad merges. Generates compliance dashboard.

Install: `npm install -g @wipcomputer/wip-license-hook`
Usage: `wip-license-hook scan`
Docs: [README](tools/wip-license-hook/README.md)

### wip-repo-permissions-hook
Repo visibility guard. Blocks repos from going public without a `-private` counterpart. CLI, Claude Code hook, OpenClaw plugin.

Usage: `wip-repo-permissions check <org/repo>` or `wip-repo-permissions audit <org>`
Docs: [README](tools/wip-repo-permissions-hook/README.md)

### deploy-public.sh
Private-to-public repo sync. Excludes `ai/` folder. Creates PR and merges.

Usage: `bash scripts/deploy-public.sh <private-repo-path> <public-github-repo>`

### post-merge-rename.sh
Post-merge branch renaming. Scans for merged branches, appends `--merged-YYYY-MM-DD`.

Usage: `bash scripts/post-merge-rename.sh` (scan + rename all) or `--dry-run` (preview)

### Dev Guide
Best practices for AI development teams: release process, repo structure, `ai/` folder convention, branch protection, private/public patterns, post-merge branch renaming, repo directory structure, Cloudflare deploy guards.

Read: [DEV-GUIDE.md](DEV-GUIDE-GENERAL-PUBLIC.md)

### wip-file-guard
Identity file protection. Blocks destructive edits to CLAUDE.md, SHARED-CONTEXT.md, SOUL.md, and other protected files. Claude Code hook and OpenClaw plugin.

Usage: `wip-file-guard --list`
Docs: [README](tools/wip-file-guard/README.md)

### wip-universal-installer
The Universal Interface specification for agent-native software. Detects and installs six interfaces: CLI, Module, MCP Server, OpenClaw Plugin, Skill, Claude Code Hook.

Install: `npm install -g @wipcomputer/universal-installer`
Usage: `wip-install /path/to/tool --dry-run`
Docs: [README](tools/wip-universal-installer/README.md) | [SPEC](UNIVERSAL-INTERFACE.md)

### wip-repos
Repo manifest reconciler. Makes `repos-manifest.json` the single source of truth. Check, sync, add, move, tree.

Install: `npm install -g @wipcomputer/wip-repos`
Usage: `wip-repos check` or `wip-repos sync --dry-run`
Docs: [README](tools/wip-repos/README.md)

### LDM Dev Tools.app
macOS automation wrapper. Scheduled jobs (backup, branch protection audit, visibility audit) with Full Disk Access.

Usage: `open -W ~/Applications/LDMDevTools.app --args backup`
Docs: [README](tools/ldm-jobs/README.md)

## MCP Servers

Core tools are agent-callable via MCP. Add to `.mcp.json`:

```json
{
  "wip-release": {
    "command": "node",
    "args": ["/path/to/tools/wip-release/mcp-server.mjs"]
  },
  "wip-license-hook": {
    "command": "node",
    "args": ["/path/to/tools/wip-license-hook/mcp-server.mjs"]
  },
  "wip-repo-permissions": {
    "command": "node",
    "args": ["/path/to/tools/wip-repo-permissions-hook/mcp-server.mjs"]
  },
  "wip-repos": {
    "command": "node",
    "args": ["/path/to/tools/wip-repos/mcp-server.mjs"]
  }
}
```

MCP tools available: `release`, `release_status`, `license_scan`, `license_audit`, `license_gate`, `license_ledger`, `repo_permissions_check`, `repo_permissions_audit`, `repos_check`, `repos_sync_plan`, `repos_add`, `repos_move`, `repos_tree`

## Setup

To install all tools:
```bash
npm install -g @wipcomputer/wip-release @wipcomputer/wip-license-hook
```

For the deploy script, clone this repo and run it directly:
```bash
bash scripts/deploy-public.sh /path/to/private-repo org/public-repo
```
