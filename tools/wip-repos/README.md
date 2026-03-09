# wip-repos

Repo manifest reconciler. Single source of truth for repo organization.

## The Problem

You have 50 repos. Someone moves a folder. The README drifts. The manifest drifts. Your AI agent references a path that doesn't exist anymore. Everyone wastes time.

## The Solution

`repos-manifest.json` is the single source of truth. The filesystem adapts to it. Like prettier for folder structure.

Move folders around all day. On sync, everything snaps back to where the manifest says it belongs. Want to change the structure? PR to the manifest. Org owner approves or rejects. Rejected? Your folders snap back on next sync.

## Usage

```bash
# Check for drift between filesystem and manifest
wip-repos check

# See what sync would do
wip-repos sync --dry-run

# Actually move folders to match manifest
wip-repos sync

# Add a new repo
wip-repos add ldm-os/utilities/my-tool --remote wipcomputer/my-tool

# Move a repo to a different category
wip-repos move ldm-os/utilities/my-tool --to ldm-os/devops/my-tool

# Generate directory tree from manifest
wip-repos tree
```

## Options

```
--manifest   Path to repos-manifest.json (default: ./repos-manifest.json)
--root       Path to repos root directory (default: directory containing manifest)
--dry-run    Show what would happen without making changes
--json       Output as JSON
```

## How It Works

1. **check** walks the filesystem, finds all git repos, compares against the manifest. Reports what's on disk but not in manifest, and what's in manifest but not on disk. Exit code 1 if drift detected.

2. **sync** matches repos by their git remote URL. If a repo's remote matches a manifest entry but it's at the wrong path, sync moves it to the manifest path.

3. **add/move** update the manifest file. The actual folder moves happen on the next `sync`.

## Integration

- `deploy-public` and `wip-release` can call `wip-repos check` before running. Stale manifest blocks deploys.
- CI: run `wip-repos check` as a PR check. Drift = blocked merge.
- README generation: `wip-repos tree` outputs a directory tree from the manifest.

## Source

Pure JavaScript. Zero dependencies. `core.mjs` (logic), `cli.mjs` (CLI). No build step.

## License

MIT
