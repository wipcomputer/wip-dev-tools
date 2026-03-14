###### WIP Computer

# AI DevOps Toolbox

## Want your AI to dev? Here's the full system.

Your AI writes code. But does it know how to release it? Check license compliance? Sync private repos to public ones? Follow a real development process?

**AI DevOps Toolbox** is a collection of battle-tested tools for AI-assisted software development. Built by a team of humans and AIs shipping real software together.

Used internally to manage 100+ repos, 200+ releases, and daily license compliance across the [wipcomputer](https://github.com/wipcomputer) org. These tools run in production every day.

**Real-world example:** [wip-universal-installer](tools/wip-universal-installer/) ships its releases entirely through wip-release. 6 releases, v2.1.5, changelog and GitHub releases all generated automatically.

## Quick Start (manual install)

```bash
# Install the universal installer
npm install -g @wipcomputer/universal-installer

# Preview what will be installed (9 tools, 30+ interfaces)
wip-install wipcomputer/wip-ai-devops-toolbox --dry-run

# Install everything
wip-install wipcomputer/wip-ai-devops-toolbox

# Verify: run one check from each major category
wip-license-guard check              # copyright compliance
wip-repo-permissions audit wipcomputer  # visibility guard
wip-repos check                      # manifest reconciliation
```

Or install individual tools:
```bash
npm install -g @wipcomputer/wip-release @wipcomputer/wip-license-hook @wipcomputer/universal-installer @wipcomputer/wip-repos
```

## Tools

### wip-universal-installer

The Universal Interface specification for agent-native software. Defines how every tool ships six interfaces: CLI, importable module, MCP Server, OpenClaw Plugin, Skill, Claude Code Hook. Includes a reference installer and a minimal example template.

```bash
# Detect what interfaces a repo supports
wip-install /path/to/repo --dry-run

# Install a tool from GitHub
wip-install wipcomputer/wip-file-guard
```

**Source:** Pure JavaScript, no build step. [`tools/wip-universal-installer/detect.mjs`](tools/wip-universal-installer/detect.mjs) (detection), [`tools/wip-universal-installer/install.js`](tools/wip-universal-installer/install.js) (installer). Zero dependencies.

[README](tools/wip-universal-installer/README.md) ... [SKILL.md](tools/wip-universal-installer/SKILL.md) ... [SPEC.md](tools/wip-universal-installer/SPEC.md) ... [Reference](tools/wip-universal-installer/REFERENCE.md)

Also available as `UNIVERSAL-INTERFACE.md` at the repo root.

### Dev Guide

Best practices for AI-assisted development teams. Covers release process, repo structure, the `ai/` folder convention, branch protection, private/public repo patterns, post-merge branch renaming, repo directory structure, Cloudflare Workers deploy guards, and more.

[Read the Dev Guide](DEV-GUIDE-GENERAL-PUBLIC.md)

### LDM Dev Tools.app

macOS automation wrapper. A native `.app` bundle that runs scheduled jobs (backup, branch protection audit, etc.) with Full Disk Access. One app to grant permissions to, one place to add new automation.

**Source:** Job scripts are plain shell, committed at [`tools/ldm-jobs/`](tools/ldm-jobs/):

| Script | What it does |
|--------|-------------|
| [`backup.sh`](tools/ldm-jobs/backup.sh) | Daily backup |
| [`branch-protect.sh`](tools/ldm-jobs/branch-protect.sh) | Audit and enforce branch protection across all org repos |
| [`visibility-audit.sh`](tools/ldm-jobs/visibility-audit.sh) | Audit public repos for missing -private counterparts |

Scripts can be run standalone without the `.app`. The app provides a Full Disk Access wrapper for scripts that need it.

```bash
# Run standalone
bash tools/ldm-jobs/backup.sh
bash tools/ldm-jobs/branch-protect.sh
bash tools/ldm-jobs/visibility-audit.sh

# Or via the app wrapper
open -W ~/Applications/LDMDevTools.app --args backup
open -W ~/Applications/LDMDevTools.app --args branch-protect
open -W ~/Applications/LDMDevTools.app --args visibility-audit
```

[README](tools/ldm-jobs/README.md)

**Setup:** Drag `LDMDevTools.app` into System Settings > Privacy & Security > Full Disk Access. Then schedule via cron:

```bash
# Daily backup at midnight, branch protection audit at 1 AM, visibility audit at 2 AM
0 0 * * * open -W ~/Applications/LDMDevTools.app --args backup >> /tmp/ldm-dev-tools/cron.log 2>&1
0 1 * * * open -W ~/Applications/LDMDevTools.app --args branch-protect >> /tmp/ldm-dev-tools/cron.log 2>&1
0 2 * * * open -W ~/Applications/LDMDevTools.app --args visibility-audit >> /tmp/ldm-dev-tools/cron.log 2>&1
```

Logs: `/tmp/ldm-dev-tools/`

### wip-release

One-command release pipeline. Version bump, changelog, SKILL.md sync, npm publish, GitHub release. All in one shot. Release notes live on the branch so you review them in the PR before they go live.

```bash
wip-release patch --notes="description of what was built and why"
wip-release minor                               # auto-detects RELEASE-NOTES-v{version}.md
wip-release major --dry-run
```

**Release notes convention:** Write `RELEASE-NOTES-v{version}.md` (e.g. `RELEASE-NOTES-v1-6-0.md`) on your feature branch. It shows up in the PR diff for review. On release, wip-release auto-detects the file and uses it as the GitHub release body. One file, renamed each release. Warns when notes are missing, too short, or look like changelog entries instead of narrative.

**Source:** Pure JavaScript, no build step. [`tools/wip-release/cli.js`](tools/wip-release/cli.js) (entry point), [`tools/wip-release/core.mjs`](tools/wip-release/core.mjs) (main logic). Zero dependencies.

[README](tools/wip-release/README.md) ... [SKILL.md](tools/wip-release/SKILL.md) ... [Reference](tools/wip-release/REFERENCE.md)

### wip-license-hook

License rug-pull detection. Scans every dependency and fork for license changes. Pre-pull hook blocks merges if a license changed upstream. Pre-push hook alerts. Daily cron scan. Generates a public compliance dashboard.

```bash
wip-license-hook scan
wip-license-hook audit
```

**Source:** TypeScript. All source in [`tools/wip-license-hook/src/`](tools/wip-license-hook/src/):

| File | What it does |
|------|-------------|
| `src/cli/index.ts` | CLI entry point |
| `src/core/scanner.ts` | Dependency scanning (npm, pip, cargo, go, forks) |
| `src/core/detector.ts` | License text fingerprinting |
| `src/core/ledger.ts` | Ledger persistence and snapshots |
| `src/core/reporter.ts` | Reporting and dashboard HTML generation |

[README](tools/wip-license-hook/README.md) ... [SKILL.md](tools/wip-license-hook/SKILL.md)

### wip-repo-permissions-hook

Repo visibility guard. Blocks repos from going public without a `-private` counterpart. Works as a CLI, Claude Code hook, and OpenClaw plugin. Catches accidental exposure of internal plans, todos, and development context.

```bash
# Check a single repo
wip-repo-permissions check wipcomputer/memory-crystal
# -> OK: memory-crystal-private exists

# Audit all public repos in org
wip-repo-permissions audit wipcomputer
# -> Lists violations, exit code 1 if any found
```

**Source:** Pure JavaScript, no build step. [`tools/wip-repo-permissions-hook/core.mjs`](tools/wip-repo-permissions-hook/core.mjs) (logic), [`tools/wip-repo-permissions-hook/cli.js`](tools/wip-repo-permissions-hook/cli.js) (CLI), [`tools/wip-repo-permissions-hook/guard.mjs`](tools/wip-repo-permissions-hook/guard.mjs) (Claude Code hook). Zero dependencies.

[README](tools/wip-repo-permissions-hook/README.md) ... [SKILL.md](tools/wip-repo-permissions-hook/SKILL.md)

### post-merge-rename.sh

Post-merge branch renaming. Scans for merged branches that haven't been renamed, appends `--merged-YYYY-MM-DD` to preserve history. Runs automatically as part of `wip-release`, or standalone.

**Source:** Plain shell. [`scripts/post-merge-rename.sh`](scripts/post-merge-rename.sh)

```bash
bash scripts/post-merge-rename.sh              # scan + rename all
bash scripts/post-merge-rename.sh --dry-run     # preview only
bash scripts/post-merge-rename.sh <branch>      # rename specific branch
```

### wip-file-guard

Hook that blocks destructive edits to protected identity files. Works with Claude Code CLI and OpenClaw. Protects CLAUDE.md, SHARED-CONTEXT.md, SOUL.md, IDENTITY.md, MEMORY.md, and pattern-matched memory/journal files.

Two rules: block `Write` on protected files entirely, block `Edit` when removing more than 2 lines or replacing more than 4 lines.

```bash
# List protected files
wip-file-guard --list
```

**Source:** Pure JavaScript, no build step. [`tools/wip-file-guard/guard.mjs`](tools/wip-file-guard/guard.mjs) (single file, all logic). Zero dependencies.

[README](tools/wip-file-guard/README.md) ... [SKILL.md](tools/wip-file-guard/SKILL.md) ... [Reference](tools/wip-file-guard/REFERENCE.md)

### deploy-public.sh

Private-to-public repo sync. Copies everything except `ai/` from your working repo to the public mirror. Creates a PR, merges it. One script for all repos.

**Source:** Plain shell. [`scripts/deploy-public.sh`](scripts/deploy-public.sh)

```bash
bash scripts/deploy-public.sh /path/to/private-repo wipcomputer/public-repo
```

### wip-repos

Repo manifest reconciler. Makes `repos-manifest.json` the single source of truth for repo organization. Like prettier for folder structure. Move folders around all day; on sync, everything snaps back to where the manifest says.

```bash
# Check for drift
wip-repos check

# Sync filesystem to match manifest
wip-repos sync --dry-run

# Add a repo
wip-repos add ldm-os/utilities/my-tool --remote wipcomputer/my-tool

# Move a repo in the manifest
wip-repos move ldm-os/utilities/my-tool --to ldm-os/devops/my-tool

# Generate directory tree
wip-repos tree
```

**Source:** Pure JavaScript, no build step. [`tools/wip-repos/core.mjs`](tools/wip-repos/core.mjs) (logic), [`tools/wip-repos/cli.mjs`](tools/wip-repos/cli.mjs) (CLI). Zero dependencies.

[README](tools/wip-repos/README.md)

## Source Code

All implementation source is committed in this repo. No closed binaries, no mystery boxes.

| Tool | Language | Source location | Build step? |
|------|----------|----------------|-------------|
| Dev Guide | Markdown | `DEV-GUIDE-GENERAL-PUBLIC.md` | None. |
| LDM Dev Tools jobs | Shell | `tools/ldm-jobs/backup.sh`, `branch-protect.sh`, `visibility-audit.sh` | None. Runnable standalone or via `.app` wrapper. |
| wip-release | JavaScript (ESM) | `tools/wip-release/cli.js`, `core.mjs`, `mcp-server.mjs` | None. What you see is what runs. |
| wip-license-hook | TypeScript | `tools/wip-license-hook/src/**/*.ts`, `mcp-server.mjs` | `cd tools/wip-license-hook && npm install && npm run build` |
| wip-license-guard | JavaScript (ESM) | `tools/wip-license-guard/cli.mjs`, `core.mjs` | None. What you see is what runs. |
| wip-repo-permissions-hook | JavaScript (ESM) | `tools/wip-repo-permissions-hook/core.mjs`, `cli.js`, `guard.mjs`, `mcp-server.mjs` | None. What you see is what runs. |
| post-merge-rename.sh | Shell | `scripts/post-merge-rename.sh` | None. |
| wip-file-guard | JavaScript (ESM) | `tools/wip-file-guard/guard.mjs` | None. What you see is what runs. |
| wip-branch-guard | JavaScript (ESM) | `tools/wip-branch-guard/guard.mjs` | None. What you see is what runs. |
| wip-universal-installer | JavaScript (ESM) | `tools/wip-universal-installer/detect.mjs`, `install.js` | None. What you see is what runs. |
| deploy-public.sh | Shell | `scripts/deploy-public.sh` | None. |
| wip-repos | JavaScript (ESM) | `tools/wip-repos/core.mjs`, `cli.mjs`, `mcp-server.mjs` | None. What you see is what runs. |
| wip-repo-init | JavaScript (ESM) | `tools/wip-repo-init/init.mjs` | None. What you see is what runs. |
| wip-readme-format | JavaScript (ESM) | `tools/wip-readme-format/format.mjs` | None. What you see is what runs. |

Previously standalone tools (wip-release, wip-license-hook, wip-file-guard, wip-universal-installer) were merged here. The standalone repos redirect to this one.

### Private/Public Repo Pattern

Development happens in private repos (with `ai/` folders for internal notes, plans, dev updates). When publishing, `deploy-public.sh` syncs everything except `ai/` to the public repo. Source files are always committed. Compiled output (`dist/`) is gitignored and only published to npm.

## Development

### wip-license-hook (TypeScript)

```bash
cd tools/wip-license-hook
npm install
npm run build          # compiles src/ -> dist/
node dist/cli/index.js scan   # test locally
```

### wip-release (JavaScript)

No build step needed. Edit `cli.js` or `core.mjs` and test directly:

```bash
cd tools/wip-release
node cli.js --dry-run patch --notes="test"
```

## Install

Tell your AI:

```
Read the SKILL.md at github.com/wipcomputer/wip-ai-devops-toolbox/blob/main/SKILL.md.
Then explain what these tools do and help me set them up.
```

Or install individually:

```bash
npm install -g @wipcomputer/wip-release
npm install -g @wipcomputer/wip-license-hook
npm install -g @wipcomputer/wip-file-guard
npm install -g @wipcomputer/universal-installer
npm install -g @wipcomputer/wip-repos
```

## License

MIT. Built by Parker Todd Brooks, Lēsa (OpenClaw, Claude Opus 4.6), Claude Code CLI (Claude Opus 4.6).
