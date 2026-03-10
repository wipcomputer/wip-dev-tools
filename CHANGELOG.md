# Changelog


## 1.6.0 (2026-03-10)

## v1.6.0: README Rewrite, Dual Licensing, License Guard, Release Notes Standard

Four systems that change how DevOps Toolbox presents itself, protects its licensing, and ships releases. The README is now for humans. Licensing is enforceable. Release notes tell a story.

This release spans PRs #46 through #50 and represents a complete rethink of how we present the toolbox, how we protect its licensing, and how we communicate what each release actually means.

---

### PR #46: License Format Standard

**What we did:** Rewrote the license section across the README and private Dev Guide to use a clear, scannable format that signals both openness and commercial intent.

**Why:** The old license section just said "MIT" in a badge. That's technically correct but it doesn't tell you the full story. We moved to dual licensing (MIT + AGPLv3) and needed a format that makes the distinction immediately clear: use it freely for personal work, need a commercial license if you're bundling it into something you sell.

**What changed:**
- License section switched to a code block format for readability: MIT for all CLI tools, MCP servers, skills, and hooks. AGPLv3 for commercial redistribution, marketplace listings, or bundling into paid services.
- Added "Commercial licenses available" as a one-line signal that this is a real product, not just an open source side project.
- AGPL renamed to AGPLv3 throughout for version specificity. Grok's feedback confirmed this matters for clarity.
- Private Dev Guide (`ai/DEV-GUIDE-private.md`) updated with the licensing standard so every repo going forward follows the same format.
- Fixed "Claude Code CLI" to "Claude Code" in attribution across all files.

**Commits:** `Update license section formatting for readability`, `License section: code block with Grok-style wording`, `License: personal vs commercial distinction, add standard to dev guide`, `License: AGPL -> AGPLv3 for version specificity`

---

### PR #47: LICENSE Files Across All Tools

**What we did:** Updated the actual LICENSE file in the root and all 10 sub-tool directories to dual MIT + AGPLv3.

**Why:** PR #46 changed how we talk about the license. This PR changed the legal documents themselves. Every sub-tool had its own LICENSE file that still said plain MIT. They all needed to match the new dual-license standard, and they needed to match each other exactly.

**What changed:**
- Root `LICENSE` rewritten to dual format. Section 1: MIT (full text). Section 2: GNU Affero General Public License v3.0 (commercial and cloud use). Starts with "Dual License: MIT + AGPLv3" so GitHub's license detection picks it up correctly.
- All 10 `tools/*/LICENSE` files updated to identical dual-license text with correct copyright holder (WIP Computer, Inc.).
- Bottom line on every LICENSE: "AGPLv3 for personal use is free. Commercial licenses available."

**Commits:** `LICENSE files: dual MIT+AGPLv3 on root and all sub-tools`

---

### PR #48: wip-license-guard (New Tool)

**What we did:** Built a new tool that enforces copyright, license format, and README structure across the toolbox.

**Why:** With 10 sub-tools, each needing its own LICENSE file, and a README standard that separates human content from technical content, manual enforcement doesn't scale. We needed a tool that catches drift before it ships. The tool also enforces the README standard from the session's feedback work: no install commands in the README (those go in TECHNICAL.md), no MCP config blocks, no Quick Start sections.

**How it works:**
- Interactive first-run (`wip-license-guard init`) asks for copyright holder, license type (MIT, AGPLv3, or dual MIT+AGPL), year, and attribution. Saves config to `.license-guard.json`.
- `wip-license-guard check` audits the repo against saved config. Checks LICENSE existence, copyright match, AGPLv3 terms (if dual-license), README license section, README structure.
- `wip-license-guard check --fix` auto-repairs: generates missing LICENSE files, updates wrong copyright, creates dual-license text.
- Toolbox-aware: automatically walks every `tools/` subdirectory and checks each sub-tool's LICENSE file.
- README structure standard enforcement: warns if README contains Quick Start sections, `npm install -g` commands, MCP config blocks, or Architecture/API/Config headings that belong in TECHNICAL.md.
- All 14 checks pass on this repo.

**New files:**
- `tools/wip-license-guard/cli.mjs` (268 lines) ... CLI entry point. Commands: `init`, `check`, `check --fix`, `help`.
- `tools/wip-license-guard/core.mjs` ... `generateLicense()` produces MIT, AGPL, or dual MIT+AGPLv3 LICENSE text. `generateReadmeBlock()` produces the README license section.
- `.license-guard.json` ... config: copyright "WIP Computer, Inc.", license "MIT+AGPL", year 2026.

**Interfaces:** CLI, Module. Beta stability.

**Commits:** `Add wip-license-guard tool and .license-guard.json config`

---

### PR #49: SKILL.md v1.5.1

**What we did:** Updated the skill documentation that AI agents read when you say "read the SKILL.md."

**Why:** The SKILL.md was stuck at v1.4.0. It didn't include wip-license-guard (new in this release), didn't have the interface coverage matrix, and used incorrect tool names. When someone tells their AI to read the SKILL.md, it needs to be current and accurate. Stale skill docs mean the AI gives wrong answers about what the tools can do.

**What changed:**
- Version bumped from v1.4.0 to v1.5.1.
- Added interfaces column to tool table: CLI, Module, MCP, OpenClaw, Skill, CC Hook for every tool.
- Added wip-license-guard to the tool list.
- Fixed tool names: `deploy-public` (not `deploy-public.sh`), `post-merge-rename` (not `post-merge-rename.sh`).
- Added "Talk to Your Tools" section with concrete MCP prompts: "Scan all dependencies for license changes" calls `license_scan`. "Check if memory-crystal can go public" calls `repo_permissions_check`. Etc.
- Added license section matching the new README format.
- Updated frontmatter description and capabilities.
- Added SKILL.md staleness warning to wip-release: warns when SKILL.md version falls more than a patch behind the release version, so this can't happen again silently.

**Commits:** `SKILL.md: update to v1.5.1 with full tool table and interfaces`

---

### PR #50: README Rewrite + Release Notes Standard

**What we did:** Rewrote the entire README based on external feedback, and upgraded the release pipeline to enforce narrative release notes.

**Why:** External feedback from Grok and GPT confirmed what we suspected: the README was developer-brain. Install commands, MCP tool mappings, and Quick Start sections front and center. That's what developers write for themselves. It's not what someone landing on the repo needs to see. They want to know: what does this do for me?

The release notes problem came up during this same work. Every release was producing commit lists instead of stories. Parker had to manually rewrite the notes every time. That needed to be fixed at the tooling level.

**README changes:**

The README now follows a strict standard: tagline, "Teach Your AI to Dev" prompt block, features with stability tags, interface coverage matrix, and license. No install commands. No technical implementation details.

- **Removed Quick Start section.** Install commands belong in TECHNICAL.md, not the README. Added a guard in wip-license-guard to catch `npm install -g` commands and Quick Start headings in any README going forward.
- **Removed "Talk to Your Tools" MCP examples.** These are for AIs, not humans. Moved to SKILL.md where they belong.
- **Added Karpathy quote.** The sensor/actuator framing from Andrej Karpathy anchors the Features section. Both paragraphs, "Andrej Karpathy put it clearly:" intro, Source link. This is the future of software: not apps, tools.
- **Added Interface Coverage matrix.** Single table showing all 10 tools and their six possible interfaces. At a glance you can see what ships as CLI, Module, MCP, OpenClaw, Skill, or CC Hook.
- **Added "Can I use this?" section.** Plain-English licensing examples. "Yes, freely:" for personal use. "Need a commercial license:" for bundling into products. Last bullet: "Fork it and send us feedback via PRs (we'd love that)."
- **Added License Guard to features list.** New tool from PR #48 needed to be in the features section.

**Release pipeline changes:**

Three changes to `wip-release` that make release notes a first-class part of the process:

1. **Quality warning.** When `--notes` is missing, too short (under 50 characters), or looks like a changelog entry (starts with "fix:", "add:", "update:"), wip-release warns: "Explain what was built, why, and why it matters."

2. **`--notes-file` flag.** Pass a markdown file with the full release narrative: `wip-release minor --notes-file=RELEASE-NOTES-v{version}.md`. This is how you write proper release notes and review them before they go live.

3. **Commits fold under narrative.** Commit history is still included, but inside a collapsible `<details>` section labeled "What changed (commits)". The narrative is the headline. The commits are supporting detail.

**New convention:** `RELEASE-NOTES-v{version}.md` lives on the feature branch. It's part of the PR diff. You review the release notes alongside the code. When the PR merges, `wip-release` reads from the file. The notes you approved are the notes that ship.

**Files changed:**
- `README.md` ... full rewrite
- `TECHNICAL.md` ... received Quick Start and npm install commands from README
- `tools/wip-release/core.mjs` ... `buildReleaseNotes()` restructured, new `warnIfNotesAreThin()`
- `tools/wip-release/cli.js` ... new `--notes-file=path` flag
- `tools/wip-license-guard/cli.mjs` ... README structure standard checks added
- `RELEASE-NOTES-v{version}.md` ... new convention file
- `ai/notes/2026-03-10--grok-feedback--readme-and-licensing.md` ... Grok feedback documented
- `ai/notes/2026-03-10--gpt-feedback--product-and-adoption.md` ... GPT feedback documented
- `ai/plan/current/2026-03-10--cc-mini--readme-polish-and-mcp-examples.md` ... 7-phase plan, all complete

**Commits:** `Add feedback notes, plan for README polish + MCP examples`, `README: golden path, MCP examples, interface matrix, license examples`, `Plan: mark phases 1-5 as DONE`, `README: add Karpathy quote on tools vs apps`, `wip-license-guard: add README structure standard checks`, `Move Quick Start to TECHNICAL.md, guard against install commands in README`, `Remove Talk to Your Tools section from README`, `README: full Karpathy argument with both quotes and source link`, `License: replace cloud instances bullet with fork/PR invitation`, `Karpathy quote: remove headline, inline attribution, semicolon`, `Fix Karpathy quote format: intro line, source outside blockquote`, `wip-release: narrative release notes standard`, `Add RELEASE-NOTES-v{version}.md for PR review`

---

### Install

```bash
npm install -g @wipcomputer/universal-installer
wip-install wipcomputer/wip-devops-toolbox
```

Or update your local clone:
```bash
git pull origin main
```

---

Built by Parker Todd Brooks, Lēsa (OpenClaw, Claude Opus 4.6), Claude Code (Claude Opus 4.6).

## 1.4.0 (2026-03-09)

MCP unlock. All core tools are now agent-callable.

### MCP Servers (new)
- **wip-release**: `mcp-server.mjs` wrapping `core.mjs`. Tools: `release`, `release_status`
- **wip-license-hook**: `mcp-server.mjs` wrapping compiled `dist/`. Tools: `license_scan`, `license_audit`, `license_gate`, `license_ledger`
- **wip-repo-permissions-hook**: `mcp-server.mjs` wrapping `core.mjs`. Tools: `repo_permissions_check`, `repo_permissions_audit`
- **wip-repos**: `mcp-server.mjs` wrapping `core.mjs`. Tools: `repos_check`, `repos_sync_plan`, `repos_add`, `repos_move`, `repos_tree`

### SKILL.md files (new)
- **wip-repos**: added SKILL.md (was the only tool without one)
- **deploy-public**: added `scripts/SKILL-deploy-public.md`
- **post-merge-rename**: added `scripts/SKILL-post-merge-rename.md`

### Interface updates
- wip-release SKILL.md: interface updated from CLI to [cli, module, mcp], added MCP section
- wip-license-hook SKILL.md: added version, interface [cli, mcp], added MCP section
- wip-repo-permissions-hook SKILL.md: interface updated to [cli, module, mcp, hook, plugin], added MCP section
- All 4 tools: `@modelcontextprotocol/sdk` added as dependency

### Dev Guide updates
- Added "Universal Installer Checklist" section to DEV-GUIDE-GENERAL-PUBLIC.md
- Added "Universal Installer ... Dogfooding Rule" section to private Dev Guide
- Documented the v1.3.0 zero-MCP-servers incident

### Other
- Root SKILL.md bumped to 1.4.0, added all missing tools (wip-file-guard, wip-universal-installer, wip-repos, LDM Dev Tools.app), added MCP Servers section
- README source code table updated with mcp-server.mjs files

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
