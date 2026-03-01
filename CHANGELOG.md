# Changelog

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
