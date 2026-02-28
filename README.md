###### WIP Computer

# Dev Tools

## Want your AI to dev? Here's the full system.

Your AI writes code. But does it know how to release it? Check license compliance? Sync private repos to public ones? Follow a real development process?

**Dev Tools** is a collection of battle-tested tools for AI-assisted software development. Built by a team of humans and AIs shipping real software together.

Used internally to manage 100+ repos, 200+ releases, and daily license compliance across the [wipcomputer](https://github.com/wipcomputer) org. These tools run in production every day.

**Real-world example:** [wip-universal-installer](https://github.com/wipcomputer/wip-universal-installer) ships its releases entirely through wip-release. 6 releases, v2.1.5, changelog and GitHub releases all generated automatically. Browse its [release history](https://github.com/wipcomputer/wip-universal-installer/releases) to see the output.

## Tools

### wip-release

One-command release pipeline. Version bump, changelog, SKILL.md sync, npm publish, GitHub release. All in one shot.

```bash
wip-release patch --notes="fix: offline detection"
```

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

### deploy-public.sh

Private-to-public repo sync. Copies everything except `ai/` from your working repo to the public mirror. Creates a PR, merges it. One script for all repos.

**Source:** Plain shell. [`guide/scripts/deploy-public.sh`](guide/scripts/deploy-public.sh)

```bash
bash guide/scripts/deploy-public.sh /path/to/private-repo wipcomputer/public-repo
```

### LDM Dev Tools.app

macOS automation wrapper. A native `.app` bundle that runs scheduled jobs (backup, branch protection audit, etc.) with Full Disk Access. One app to grant permissions to, one place to add new automation.

**Source:** Job scripts are plain shell, committed at [`tools/ldm-jobs/`](tools/ldm-jobs/):

| Script | What it does |
|--------|-------------|
| [`backup.sh`](tools/ldm-jobs/backup.sh) | Daily backup |
| [`branch-protect.sh`](tools/ldm-jobs/branch-protect.sh) | Audit and enforce branch protection across all org repos |

Scripts can be run standalone without the `.app`. The app provides a Full Disk Access wrapper for scripts that need it.

```bash
# Run standalone
bash tools/ldm-jobs/backup.sh
bash tools/ldm-jobs/branch-protect.sh

# Or via the app wrapper
open -W ~/Applications/LDMDevTools.app --args backup
open -W ~/Applications/LDMDevTools.app --args branch-protect
```

[README](tools/ldm-jobs/README.md)

**Setup:** Drag `LDMDevTools.app` into System Settings > Privacy & Security > Full Disk Access. Then schedule via cron:

```bash
# Daily backup at midnight, branch protection audit at 1 AM
0 0 * * * open -W ~/Applications/LDMDevTools.app --args backup >> /tmp/ldm-dev-tools/cron.log 2>&1
0 1 * * * open -W ~/Applications/LDMDevTools.app --args branch-protect >> /tmp/ldm-dev-tools/cron.log 2>&1
```

Logs: `/tmp/ldm-dev-tools/`

## Source Code

All implementation source is committed in this repo. No closed binaries, no mystery boxes.

| Tool | Language | Source location | Build step? |
|------|----------|----------------|-------------|
| wip-release | JavaScript (ESM) | `tools/wip-release/cli.js`, `core.mjs` | None. What you see is what runs. |
| wip-license-hook | TypeScript | `tools/wip-license-hook/src/**/*.ts` | `cd tools/wip-license-hook && npm install && npm run build` |
| deploy-public.sh | Shell | `guide/scripts/deploy-public.sh` | None. |
| LDM Dev Tools jobs | Shell | `tools/ldm-jobs/backup.sh`, `branch-protect.sh` | None. Runnable standalone or via `.app` wrapper. |

Standalone repos are also available with the same source:
- [wipcomputer/wip-release](https://github.com/wipcomputer/wip-release)
- [wipcomputer/wip-license-hook](https://github.com/wipcomputer/wip-license-hook)

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

## Dev Guide

Best practices for AI-assisted development teams. Covers release process, repo structure, the `ai/` folder convention, branch protection, private/public repo patterns, and more.

[Read the Dev Guide](guide/DEV-GUIDE.md)

## Install

Tell your AI:

```
Read the SKILL.md at github.com/wipcomputer/wip-dev-tools/blob/main/SKILL.md.
Then explain what these tools do and help me set them up.
```

Or install individually:

```bash
npm install -g @wipcomputer/wip-release
npm install -g @wipcomputer/wip-license-hook
```

## License

MIT. Built by Parker Todd Brooks, Lēsa (OpenClaw, Claude Opus 4.6), Claude Code CLI (Claude Opus 4.6).
