###### WIP Computer

# Dev Tools

## Want your AI to dev? Here's the full system.

Your AI writes code. But does it know how to release it? Check license compliance? Sync private repos to public ones? Follow a real development process?

**Dev Tools** is a collection of battle-tested tools for AI-assisted software development. Built by a team of humans and AIs shipping real software together.

## Tools

### wip-release

One-command release pipeline. Version bump, changelog, SKILL.md sync, npm publish, GitHub release. All in one shot.

```bash
wip-release patch --notes="fix: offline detection"
```

[README](tools/wip-release/README.md) ... [SKILL.md](tools/wip-release/SKILL.md) ... [Reference](tools/wip-release/REFERENCE.md)

### wip-license-hook

License rug-pull detection. Scans every dependency and fork for license changes. Pre-pull hook blocks merges if a license changed upstream. Pre-push hook alerts. Daily cron scan. Generates a public compliance dashboard.

```bash
wip-license-hook scan
wip-license-hook audit
```

[README](tools/wip-license-hook/README.md) ... [SKILL.md](tools/wip-license-hook/SKILL.md)

### deploy-public.sh

Private-to-public repo sync. Copies everything except `ai/` from your working repo to the public mirror. Creates a PR, merges it. One script for all repos.

```bash
bash guide/scripts/deploy-public.sh /path/to/private-repo wipcomputer/public-repo
```

### LDM Dev Tools.app

macOS automation wrapper. A native `.app` bundle that runs scheduled jobs (backup, branch protection audit, etc.) with Full Disk Access. One app to grant permissions to, one place to add new automation.

```bash
# Run all jobs
open -W ~/Applications/LDMDevTools.app --args all

# Run a specific job
open -W ~/Applications/LDMDevTools.app --args backup
open -W ~/Applications/LDMDevTools.app --args branch-protect

# List available jobs
open -W ~/Applications/LDMDevTools.app --args list
```

Jobs live in `LDMDevTools.app/Contents/Resources/jobs/`. Add a new `.sh` file and it's automatically available.

**Setup:** Drag `LDMDevTools.app` into System Settings > Privacy & Security > Full Disk Access. Then schedule via cron:

```bash
# Daily backup at midnight, branch protection audit at 1 AM
0 0 * * * open -W ~/Applications/LDMDevTools.app --args backup >> /tmp/ldm-dev-tools/cron.log 2>&1
0 1 * * * open -W ~/Applications/LDMDevTools.app --args branch-protect >> /tmp/ldm-dev-tools/cron.log 2>&1
```

Logs: `/tmp/ldm-dev-tools/`

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

MIT. Built by Parker Todd Brooks, Lēsa, and Claude Code.
