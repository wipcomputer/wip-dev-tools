# Changelog

## 1.3.0 (2026-03-09)

Toolbox consolidation. Three new tools added.

### New tools
- **wip-file-guard**: blocks destructive edits to protected identity files. For Claude Code CLI and OpenClaw. Previously standalone repo, now folded into toolbox.
- **wip-universal-installer**: The Universal Interface specification for agent-native software. Six interfaces: CLI, Module, MCP Server, OpenClaw Plugin, Skill, Claude Code Hook. Previously standalone repo, now folded into toolbox.
- **wip-repos**: repo manifest reconciler. Makes repos-manifest.json the single source of truth for repo organization. Like prettier for folder structure. New tool, built from scratch.

### Other changes
- `UNIVERSAL-INTERFACE.md` promoted to repo root (from wip-universal-installer SPEC.md)
- README updated with all three new tools, source code table, install commands
- Standalone repos renamed to `-deprecated` on GitHub
- Toolbox now has 9 tools. All self-contained, zero shared dependencies.

## 1.2.0 (2026-03-09)

Major repo reorganization and Dev Guide expansion.

### Repo structure
- Separated public Dev Guide from private conventions
- `guide/DEV-GUIDE.md` → `DEV-GUIDE-GENERAL-PUBLIC.md` (genericized, root level, goes public)
- `ai/DEV-GUIDE-private.md` → `ai/DEV-GUIDE-FOR-WIP-ONLY-PRIVATE.md` (WIP-specific conventions)
- `guide/scripts/` → `scripts/` (moved to root level)
- Old `guide/` folder trashed

### New Dev Guide sections
- Post-merge branch rename convention (never delete branches, rename with `--merged-YYYY-MM-DD`)
- Repo directory structure (standard layout, staging folder conventions, create as `-private` from day one)
- The manifest (`repos-manifest.json` as source of truth for repo locations)
- Privatize Before You Work rule
- Cloudflare Workers deploy guard (commit before deploy, guarded npm scripts)
- PR checklist for private repos (dev update, roadmap, readme-first, plan archival)
- Expanded `_trash` convention
- Warning: never use `--no-publish` before `deploy-public.sh`

### New script
- `scripts/post-merge-rename.sh`: scans for merged branches missing `--merged-YYYY-MM-DD` suffix and renames them. Runs automatically as wip-release step 10, or standalone.

### README and SKILL.md
- Added post-merge-rename.sh to tools section and source table
- Fixed all paths for reorg
- Updated Dev Guide description with new sections

## 1.1.3 (2026-03-01)

- Fix npx package name in pre-pull.sh and pre-push.sh (@wipcomputer/license-hook → @wipcomputer/wip-license-hook)
- Fix wip-release test script (cli.mjs → cli.js)
- Clean up wip-release CHANGELOG blank lines
- Add visibility-audit.sh to DEV-GUIDE .app structure diagram
- Remove duplicate skill/SKILL.md subfolder

## 1.1.2 (2026-03-01)

- SKILL.md: sync version to 1.1.2
- CHANGELOG: add missing v1.1.0 and v1.1.1 entries
- ldm-jobs README: add visibility-audit.sh documentation

## 1.1.1 (2026-03-01)

- README: add wip-repo-permissions-hook section, source code table entry, cron schedule
- SKILL.md: bump version, add repo-visibility-guard capability, add tool section

## 1.1.0 (2026-03-01)

- New tool: wip-repo-permissions-hook. Blocks repos from going public without a -private counterpart
- Surfaces: CLI (check, audit, can-publish), Claude Code PreToolUse hook, OpenClaw plugin
- New cron job: visibility-audit.sh for LDM Dev Tools.app
- DEV-GUIDE: add hard rule for public/private repo pattern

## 1.0.4 (2026-03-01)

- DEV-GUIDE: replace inbox/punchlist system with per-agent todo files (To Do, Done, Deprecated. Never delete.)

## 1.0.3 (2026-02-28)

- deploy-public.sh: auto-detect harness ID from private repo path (cc-mini/, cc-air/, oc-lesa-mini/)

## 1.0.2 (2026-02-28)

- deploy-public.sh: fix branch prefix from mini/ to cc-mini/ per harness naming convention

## 1.0.1 (2026-02-28)

- DEV-GUIDE: add multi-agent clone workflow and harness branch convention (cc-mini/, cc-air/, lesa-mini/)

## 1.0.0 (2026-02-28)

- Production release: all tools battle-tested across 100+ repos, 200+ releases
- All source code visible and auditable in repo (no closed binaries)
- wip-license-hook bumped to v1.0.0
- LDM Dev Tools.app job scripts extracted to tools/ldm-jobs/
- Real-world example: wip-universal-installer release history
- Source code table, build instructions, and dev guide in README
- Standalone repos (wip-release, wip-license-hook) merged into umbrella

## 0.2.1 (2026-02-28)

- deploy-public.sh: fix release sync for repos without package.json (falls back to latest git tag)

## 0.2.0 (2026-02-28)

- deploy-public.sh: sync GitHub releases to public repos (pulls notes, rewrites references)
- DEV-GUIDE: add release quality standards (contributors, release notes, npm, both repos)
- DEV-GUIDE: add scheduled automation (.app pattern) documentation
- DEV-GUIDE: add built-by attribution standard
- LDM Dev Tools.app: macOS automation wrapper for cron jobs with Full Disk Access
- Add .npmignore to exclude ai/ from npm packages

## 0.1.1 (2026-02-27)

- DEV-GUIDE: add "never work on main" rule
- DEV-GUIDE: clarify private repo is the only local clone needed

## 0.1.0 (2026-02-27)

- Initial release: unified dev toolkit
- Includes wip-release (v1.2.4) and wip-license-hook (v0.1.0)
- DEV-GUIDE: general best practices for AI-assisted development
- deploy-public.sh: private-to-public repo sync tool
