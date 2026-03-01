---
name: WIP Dev Tools
version: 1.1.2
description: Dev toolkit for AI-assisted software development. Release pipeline, license compliance, repo visibility guard, and best practices.
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
interface: CLI
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

Usage: `bash guide/scripts/deploy-public.sh <private-repo-path> <public-github-repo>`

### Dev Guide
Best practices for AI development teams: release process, repo structure, `ai/` folder convention, branch protection, private/public patterns.

Read: [DEV-GUIDE.md](guide/DEV-GUIDE.md)

## Setup

To install all tools:
```bash
npm install -g @wipcomputer/wip-release @wipcomputer/wip-license-hook
```

For the deploy script, clone this repo and run it directly:
```bash
bash guide/scripts/deploy-public.sh /path/to/private-repo org/public-repo
```
