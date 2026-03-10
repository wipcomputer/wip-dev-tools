---
name: WIP AI DevOps Toolbox
version: 1.7.2
description: Complete DevOps toolkit for AI-assisted software development. Release pipeline, license compliance, copyright enforcement, repo visibility guard, identity file protection, manifest reconciler, and best practices. All core tools are agent-callable via MCP.
category: dev-tools
capabilities:
  - version-bump
  - changelog-update
  - npm-publish
  - github-release
  - license-scanning
  - license-compliance
  - copyright-enforcement
  - repo-sync
  - repo-visibility-guard
  - identity-file-protection
  - manifest-reconciliation
  - mcp-server
interface: [cli, module, mcp, skill, hook, plugin]
requires:
  binaries: [git, npm, gh, node]
---

# WIP AI DevOps Toolbox

Your AI writes code. But does it know how to release it? Check license compliance? Protect your identity files? Sync private repos to public? Follow a real development process?

AI DevOps Toolbox is 11 tools that teach your AI how to do all of this. Once installed, you don't run them manually. Your AI knows how to use them and does it automatically. Built by a team of humans and AIs shipping real software together.

## What's Included

| Tool | What it does | Interfaces |
|------|-------------|------------|
| wip-universal-installer | Takes anything you build and makes it work across every AI interface. One command, all six interfaces | CLI, Module, Skill |
| wip-release | One-command release (bump, changelog, SKILL.md sync, npm publish, GitHub) | CLI, Module, MCP, Skill |
| wip-license-hook | Blocks license rug-pulls on dependencies and forks (pre-push/pre-pull) | CLI, Module, MCP, Skill |
| wip-license-guard | Ensures your repos have correct copyright, LICENSE file, and license type | CLI, Module |
| wip-repo-permissions-hook | Never go public without a -private mirror (blocks accidental exposure) | CLI, Module, MCP, OpenClaw, Skill, CC Hook |
| wip-file-guard | Protects CLAUDE.md, SHARED-CONTEXT.md, SOUL.md from being overwritten | CLI, Module, OpenClaw, Skill, CC Hook |
| wip-repos | Repo manifest reconciler. Keeps your org structure matching the manifest | CLI, Module, MCP, Skill |
| deploy-public | Syncs private repo to clean public mirror (auto-strips ai/ folder) | CLI, Skill |
| post-merge-rename | Auto-renames merged branches with --merged-YYYY-MM-DD | CLI, Skill |
| LDM Dev Tools.app | macOS scheduler for daily audits and backups | Standalone app |
| Dev Guide | Best practices for AI-assisted development teams | Documentation |

## Tool Details

### wip-universal-installer
Takes anything you build and makes it work across every AI interface. You write code in any language. This tool turns it into a CLI, MCP Server, OpenClaw Plugin, Skill, and Claude Code Hook. One command, all six interfaces. Detects what a repo supports and deploys it all. Toolbox mode walks every sub-tool automatically.

Install: `npm install -g @wipcomputer/universal-installer`
Usage: `wip-install wipcomputer/wip-ai-devops-toolbox`
Docs: [README](tools/wip-universal-installer/README.md) | [SPEC](tools/wip-universal-installer/SPEC.md)

### wip-release
One-command release pipeline. Bumps version, updates changelog + SKILL.md, publishes to npm + GitHub Packages, creates GitHub release.

Install: `npm install -g @wipcomputer/wip-release`
Usage: `wip-release patch --notes="description"`
Docs: [README](tools/wip-release/README.md) | [REFERENCE](tools/wip-release/REFERENCE.md)

### wip-license-hook
License rug-pull detection. Scans dependencies and forks for license changes. Git hooks block bad merges. Daily cron scan. Generates compliance dashboard.

Install: `npm install -g @wipcomputer/wip-license-hook`
Usage: `wip-license-hook scan`
Docs: [README](tools/wip-license-hook/README.md)

### wip-license-guard
Copyright and license enforcement for your own repos. Interactive first-run setup asks what licensing you want. Subsequent runs audit and enforce. Toolbox-aware: checks every sub-tool. Auto-fix mode repairs issues.

Usage: `wip-license-guard check` or `wip-license-guard check --fix`
Setup: `wip-license-guard init`
Docs: [cli.mjs](tools/wip-license-guard/cli.mjs)

### wip-repo-permissions-hook
Repo visibility guard. Blocks repos from going public without a `-private` counterpart. Catches accidental exposure of internal plans, todos, and development context.

Usage: `wip-repo-permissions check <org/repo>` or `wip-repo-permissions audit <org>`
Docs: [README](tools/wip-repo-permissions-hook/README.md)

### wip-file-guard
Identity file protection. Blocks destructive edits to CLAUDE.md, SHARED-CONTEXT.md, SOUL.md, MEMORY.md. Your AI can read them but can't blow them away.

Usage: `wip-file-guard --list`
Docs: [README](tools/wip-file-guard/README.md)

### wip-repos
Repo manifest reconciler. Makes `repos-manifest.json` the single source of truth. Like prettier for folder structure. Move folders around all day; on sync, everything snaps back.

Install: `npm install -g @wipcomputer/wip-repos`
Usage: `wip-repos check` or `wip-repos sync --dry-run`
Docs: [README](tools/wip-repos/README.md)

### deploy-public
Private-to-public repo sync. Excludes `ai/` folder automatically. Creates PR, merges it, syncs release notes, cleans up branches.

Usage: `bash tools/deploy-public/deploy-public.sh <private-repo-path> <public-github-repo>`
Docs: [SKILL](tools/deploy-public/SKILL.md)

### post-merge-rename
Post-merge branch renaming. Scans for merged branches, appends `--merged-YYYY-MM-DD`. Preserves history without cluttering your branch list.

Usage: `bash tools/post-merge-rename/post-merge-rename.sh` or `--dry-run`
Docs: [SKILL](tools/post-merge-rename/SKILL.md)

### LDM Dev Tools.app
macOS automation wrapper. A native .app bundle that runs scheduled jobs (backup, branch protection audit, visibility audit) with Full Disk Access.

Usage: `open -W ~/Applications/LDMDevTools.app --args backup`
Docs: [README](tools/ldm-jobs/README.md)

### Dev Guide
Best practices for AI-assisted development teams. Covers release process, repo structure, branch protection, the `ai/` folder convention, private/public patterns, and more.

Read: [DEV-GUIDE.md](DEV-GUIDE-GENERAL-PUBLIC.md)

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

### Talk to Your Tools

Example prompts your AI can act on directly:

```
"Scan all dependencies for license changes"       -> license_scan
"Check if memory-crystal can go public"            -> repo_permissions_check
"Do a patch release with notes 'fix login bug'"    -> release
"Show me which repos aren't in the manifest"       -> repos_check
"Audit the whole org's repo visibility"             -> repo_permissions_audit
"What version is this repo at?"                     -> release_status
"Gate this merge on license compliance"             -> license_gate
"Show the license compliance ledger"                -> license_ledger
```

## Interface Coverage

| Tool | CLI | Module | MCP | OpenClaw | Skill | CC Hook |
|------|-----|--------|-----|----------|-------|---------|
| Universal Installer | Y | Y | - | - | Y | - |
| Release Pipeline | Y | Y | Y | - | Y | - |
| License Rug-Pull Detection | Y | Y | Y | - | Y | - |
| License Guard | Y | Y | - | - | - | - |
| Repo Visibility Guard | Y | Y | Y | Y | Y | Y |
| Identity File Protection | Y | Y | - | Y | Y | Y |
| Repo Manifest | Y | Y | Y | - | Y | - |
| Deploy Public | Y | - | - | - | Y | - |
| Post-Merge Rename | Y | - | - | - | Y | - |
| LDM Dev Tools.app | - | - | - | - | - | - |

## Setup

Install all tools with one command:
```bash
wip-install wipcomputer/wip-ai-devops-toolbox
```

Or install individually:
```bash
npm install -g @wipcomputer/wip-release @wipcomputer/wip-license-hook @wipcomputer/universal-installer @wipcomputer/wip-repos
```

## License

```
MIT      All CLI tools, MCP servers, skills, and hooks (use anywhere, no restrictions).
AGPLv3   Commercial redistribution, marketplace listings, or bundling into paid services.
```

AGPLv3 for personal use is free. Commercial licenses available.

Built by Parker Todd Brooks, Lēsa (OpenClaw, Claude Opus 4.6), Claude Code (Claude Opus 4.6).
