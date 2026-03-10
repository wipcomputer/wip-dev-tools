---
name: WIP AI DevOps Toolbox
version: 1.7.4
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

## Install

```bash
npm install -g @wipcomputer/universal-installer
wip-install wipcomputer/wip-ai-devops-toolbox
```

Or install individually:
```bash
npm install -g @wipcomputer/wip-release @wipcomputer/wip-license-hook @wipcomputer/universal-installer @wipcomputer/wip-repos
```

---

## Setup & Onboarding

### wip-universal-installer

Takes anything you build and makes it work across every AI interface. You write code in any language. This tool turns it into a CLI, MCP Server, OpenClaw Plugin, Skill, and Claude Code Hook. One command, all six interfaces.

**Commands:**
```
wip-install wipcomputer/wip-ai-devops-toolbox       # install a toolbox from GitHub
wip-install /path/to/local/repo                      # install from local path
wip-install wipcomputer/wip-ai-devops-toolbox --dry-run   # preview without changes
wip-install --json /path/to/repo                     # output detection as JSON
```

**What happens when you run `wip-install`:**

1. Clones the repo (or reads a local path)
2. Detects which interfaces the repo supports (scans for package.json bin, mcp-server.mjs, openclaw.plugin.json, SKILL.md, guard.mjs)
3. If the repo has a `tools/` directory with sub-tools, it enters toolbox mode and installs each one
4. For each tool, it deploys every detected interface:

| Interface | What it does | Where it writes |
|-----------|-------------|-----------------|
| CLI | `npm install -g .` (falls back to `npm link`) | Global bin directory (`/opt/homebrew/bin/` or equivalent) |
| Module | Confirms importable. No extra deployment needed | Already available via npm |
| MCP Server | Registers via `claude mcp add --scope user`. Also adds to OpenClaw's `.mcp.json` if it exists | `~/.claude/` (user scope) and `~/.openclaw/.mcp.json` |
| OpenClaw Plugin | Copies to `~/.ldm/extensions/<name>/` and `~/.openclaw/extensions/<name>/`. Runs `npm install --omit=dev`. **Removes existing directory first for a clean copy** | `~/.ldm/extensions/` and `~/.openclaw/extensions/` |
| Skill | No deployment. SKILL.md stays in the repo. You read it | No writes |
| CC Hook | Adds a PreToolUse hook entry to Claude Code settings. Checks for duplicates first | `~/.claude/settings.json` |

5. Updates the extension registry at `~/.ldm/extensions/registry.json`

**Safety:**
- Always run `--dry-run` first on a system you don't fully control
- The OpenClaw plugin deploy does `rm -rf` on the target extension directory before copying. Safe as long as the tool name doesn't collide with an existing plugin that isn't part of the toolbox
- CC Hook installation checks for duplicates. Won't add the same hook twice
- MCP registration removes and re-adds (update behavior). Existing MCP servers with different names are untouched

**Interfaces:** CLI, Module, Skill

### Dev Guide

Your team's conventions, baked in. Best practices for AI-assisted development teams.

**What it covers:**
- Release process (branch, PR, merge, wip-release, deploy-public)
- Repo structure (the `ai/` folder convention, private/public pattern)
- Branch conventions (agent prefixes: `cc-mini/`, `lesa-mini/`, `cc-air/`)
- Branch protection rules
- Multi-agent clone workflow
- License compliance (dual MIT+AGPL, CLA)

**How to use it:** Read [DEV-GUIDE.md](DEV-GUIDE-GENERAL-PUBLIC.md) before doing repo work. It's the reference for how the team operates.

**Interface:** Documentation (no CLI, no MCP)

---

## Infrastructure

### LDM Dev Tools.app

Scheduled automation that runs whether anyone remembers or not. macOS .app bundle with Full Disk Access.

**What it runs:**
- `backup.sh` ... backs up critical files
- `branch-protect.sh` ... audits branch protection rules across all repos
- `visibility-audit.sh` ... checks repo visibility matches the public/private pattern
- `crystal-capture.sh` ... triggers memory crystal capture

**Commands:**
```
open -W ~/Applications/LDMDevTools.app --args backup
open -W ~/Applications/LDMDevTools.app --args branch-protect
open -W ~/Applications/LDMDevTools.app --args visibility-audit
```

Scripts can also run standalone without the .app:
```
bash tools/ldm-jobs/backup.sh
bash tools/ldm-jobs/branch-protect.sh
bash tools/ldm-jobs/visibility-audit.sh
```

**Where it writes:** Depends on the script. Backup writes to the backup target. Audits write to stdout.

**Interface:** Standalone macOS app

---

## Release & Deploy

### wip-release

Release software correctly. Version bump, changelog, npm publish, GitHub release. One command, nothing forgotten.

**Commands:**
```
wip-release patch --notes="description"     # bump patch (1.0.0 -> 1.0.1)
wip-release minor --notes="description"     # bump minor (1.0.0 -> 1.1.0)
wip-release major --notes="description"     # bump major (1.0.0 -> 2.0.0)
wip-release patch --dry-run                 # preview without changes
wip-release patch --no-publish              # bump + tag only, skip npm/GitHub
```

**What happens when you run `wip-release`:**

1. **Step 0:** License compliance gate. If `.license-guard.json` exists, checks LICENSE file, copyright, CLA.md, README license section. Aborts if any check fails.
2. **Step 1:** Bumps version in `package.json`
3. **Step 2:** Syncs version to `SKILL.md` (if it exists)
4. **Step 3:** Updates `CHANGELOG.md` with the new version entry
5. **Step 4:** Looks for `RELEASE-NOTES-v*.md` on the current branch. If found, uses it for the GitHub release body. If not, uses the `--notes` string.
6. **Step 5:** Commits the version bump
7. **Step 6:** Creates git tag `v{version}`
8. **Step 7:** Pushes commit and tag to origin
9. **Step 8:** Publishes to npm (if not `private: true`)
10. **Step 9:** Publishes to GitHub Packages
11. **Step 10:** Creates GitHub release with release notes
12. **Step 11:** Renames merged branches with `--merged-YYYY-MM-DD`
13. **Step 12:** Prunes old merged branches (keeps last 3 per developer prefix)

**Where it writes:** `package.json`, `SKILL.md`, `CHANGELOG.md`, git tags, npm registry, GitHub Releases

**Safety:**
- `--dry-run` previews everything without writing
- License gate prevents releasing with broken compliance
- If push fails (branch protection), it tells you to push manually via PR
- npm publish failure (e.g., `private: true`) is non-fatal; release continues

**MCP tools:** `release`, `release_status`

**Interfaces:** CLI, Module, MCP, Skill

### deploy-public

Publish safely. Syncs a private repo to its clean public counterpart.

**Commands:**
```
bash scripts/deploy-public.sh <private-repo-path> <public-github-repo>

# Example:
bash scripts/deploy-public.sh /path/to/memory-crystal-private wipcomputer/memory-crystal
```

**What happens when you run it:**

1. Clones the public repo to `/tmp/`
2. Copies all files from the private repo, excluding `ai/` and `.git/`
3. Creates a branch (`cc-mini/deploy-YYYYMMDD-HHMMSS`)
4. Commits with the latest merge commit message from private
5. Pushes the branch, creates a PR, merges it
6. Deletes the deploy branch
7. Creates or updates the GitHub release on the public repo (syncs release notes from private)
8. Checks for and deletes stale branches on the public repo

**Where it writes:** Public GitHub repo (via PR). Local `/tmp/` for the clone (cleaned up).

**Safety:**
- Never pushes directly to main. Always uses a PR.
- The `ai/` folder is automatically excluded. Internal plans, todos, dev context never reach public.
- If the public repo doesn't exist, the script fails (doesn't create repos).

**Interfaces:** CLI, Skill

### post-merge-rename

Cleans up after itself. Renames merged branches so you know what's done.

**Commands:**
```
bash scripts/post-merge-rename.sh              # rename merged branches
bash scripts/post-merge-rename.sh --prune      # rename + delete old ones
bash scripts/post-merge-rename.sh --dry-run    # preview without changes
```

**What happens:**

1. Scans remote branches that are fully merged into main
2. Renames them by appending `--merged-YYYY-MM-DD` (e.g., `cc-mini/feature` becomes `cc-mini/feature--merged-2026-03-10`)
3. With `--prune`: for each developer prefix (`cc-mini/`, `lesa-mini/`, etc.), keeps the last 3 merged branches and deletes the rest from the remote
4. Also finds stale branches that are fully merged but were never renamed, and deletes them

**Rules:**
- Never deletes `main`
- Never deletes the current working branch
- Always keeps the last 3 per developer prefix

**Where it writes:** Remote branch names on GitHub (renames and deletes)

**Interfaces:** CLI, Skill

---

## License, Compliance, and Protection

### wip-file-guard

Knows what it can never overwrite. Blocks destructive edits to identity files.

**Protected files:** CLAUDE.md, SOUL.md, MEMORY.md, SHARED-CONTEXT.md, IDENTITY.md

**How it works as a CC Hook:**
- Runs as a PreToolUse hook in Claude Code
- Intercepts `Write` and `Edit` tool calls
- If the target file is a protected identity file:
  - `Write` (full overwrite) is **blocked**
  - `Edit` (partial edit) is **allowed** (appending/updating sections is fine)
- Returns JSON: `{"decision": "block", "reason": "..."}` or `{"decision": "allow"}`

**Commands:**
```
wip-file-guard --list                    # list protected files
wip-file-guard --check <filepath>        # check if a file is protected
```

**As a CC Hook (automatic):**
Configured in `~/.claude/settings.json` under `hooks.PreToolUse`. Runs automatically on every Write/Edit call. No manual invocation needed.

**As an OpenClaw Plugin:**
Deployed to `~/.openclaw/extensions/wip-file-guard/`. Blocks destructive edits in the OpenClaw agent pipeline.

**Where it writes:** Nothing. It only reads and blocks.

**Interfaces:** CLI, Module, OpenClaw Plugin, Skill, CC Hook

### wip-license-guard

Enforces licensing on every commit. Copyright, dual-license, CLA. Checked automatically.

**Commands:**
```
wip-license-guard check                  # audit current repo
wip-license-guard check --fix            # audit and auto-fix issues
wip-license-guard init                   # interactive first-run setup
wip-license-guard init --from-standard   # apply WIP Computer defaults without prompting
```

**What it checks:**
- LICENSE file exists and matches configured license type
- Copyright line is correct and current year
- CLA.md exists (if configured)
- README has a `## License` section
- For toolbox repos: checks every sub-tool in `tools/`

**Config:** `.license-guard.json` in repo root. Created by `init`. Contains copyright holder, license type, year, and what to enforce.

**As a CC Hook (automatic):**
Intercepts `git commit` and `git push` commands in Claude Code. Runs all checks before allowing the commit. Blocks if any check fails.

**As a wip-release gate:**
Step 0 of wip-release reads `.license-guard.json` and runs the same checks. Aborts the release if compliance fails.

**`--from-standard` generates:**
- `.license-guard.json` with WIP Computer defaults
- `LICENSE` file (dual MIT+AGPL)
- `CLA.md`

**Where it writes:** `.license-guard.json`, `LICENSE`, `CLA.md`, README (with `--fix`)

**Interfaces:** CLI, Module, CC Hook

### wip-license-hook

Catches license changes in dependencies before they ship.

**Commands:**
```
wip-license-hook scan                    # scan all dependencies for license changes
wip-license-hook scan --json             # output as JSON
wip-license-hook audit                   # full compliance audit
wip-license-hook ledger                  # show the license compliance ledger
wip-license-hook gate                    # pass/fail gate for CI or pre-merge
```

**What it does:**
1. Reads `package.json` and `package-lock.json`
2. For each dependency, checks the current license against the last known license in the ledger
3. If a license changed (rug-pull), flags it
4. The ledger (`license-ledger.json`) tracks every dependency's license over time
5. `gate` returns exit code 0 (pass) or 1 (fail) for CI integration

**Git hooks:**
- `pre-push` hook blocks pushes if license changes are detected
- `pre-pull` hook warns on pull if upstream changed licenses

**MCP tools:** `license_scan`, `license_audit`, `license_gate`, `license_ledger`

**Where it writes:** `license-ledger.json` (the compliance record)

**Interfaces:** CLI, Module, MCP, Skill

---

## Repo Management

### wip-repo-permissions-hook

Never accidentally exposes a private repo.

**Commands:**
```
wip-repo-permissions check wipcomputer/memory-crystal    # check one repo
wip-repo-permissions audit wipcomputer                   # audit entire org
```

**What it checks:**
- If a repo is public, does it have a `-private` counterpart?
- If not, it's flagged as exposed (internal content may be visible)

**As a CC Hook (automatic):**
Intercepts commands that could change repo visibility (e.g., `gh repo edit --visibility public`). Blocks if the `-private` counterpart doesn't exist.

**As an OpenClaw Plugin:**
Deployed to `~/.openclaw/extensions/wip-repo-permissions-hook/`. Same check in the agent pipeline.

**MCP tools:** `repo_permissions_check`, `repo_permissions_audit`

**Where it writes:** Nothing. It only reads and blocks.

**Interfaces:** CLI, Module, MCP, OpenClaw Plugin, Skill, CC Hook

### wip-repos

Knows where every repo belongs. One source of truth for folder structure.

**Commands:**
```
wip-repos check                          # compare filesystem to manifest
wip-repos sync --dry-run                 # preview what sync would move
wip-repos sync                           # move repos to match manifest
wip-repos add <org/repo> <category>      # add a repo to the manifest
wip-repos move <org/repo> <new-category> # move a repo in the manifest
wip-repos tree                           # show the manifest as a tree
```

**What it does:**
- Reads `repos-manifest.json` (the single source of truth)
- Compares against the actual filesystem
- `check` reports drift (repos in wrong locations, missing repos, unknown repos)
- `sync` moves repos to match the manifest

**MCP tools:** `repos_check`, `repos_sync_plan`, `repos_add`, `repos_move`, `repos_tree`

**Where it writes:** Moves directories on the filesystem (with `sync`). Updates `repos-manifest.json` (with `add`/`move`).

**Interfaces:** CLI, Module, MCP, Skill

---

## MCP Server Configuration

Tools with MCP interfaces are agent-callable. Add to `.mcp.json`:

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

**All MCP tools:**

| Tool | Function | What it does |
|------|----------|-------------|
| wip-release | `release` | Run a release (patch/minor/major) |
| wip-release | `release_status` | Get current version and release state |
| wip-license-hook | `license_scan` | Scan dependencies for license changes |
| wip-license-hook | `license_audit` | Full compliance audit |
| wip-license-hook | `license_gate` | Pass/fail gate for merges |
| wip-license-hook | `license_ledger` | Show the compliance record |
| wip-repo-permissions | `repo_permissions_check` | Check if a repo can go public |
| wip-repo-permissions | `repo_permissions_audit` | Audit entire org visibility |
| wip-repos | `repos_check` | Compare filesystem to manifest |
| wip-repos | `repos_sync_plan` | Preview what sync would change |
| wip-repos | `repos_add` | Add a repo to the manifest |
| wip-repos | `repos_move` | Move a repo in the manifest |
| wip-repos | `repos_tree` | Show manifest as a tree |

**Example prompts your AI can act on directly:**

```
"Scan all dependencies for license changes"       -> license_scan
"Check if memory-crystal can go public"            -> repo_permissions_check
"Do a patch release with notes 'fix login bug'"    -> release
"Show me which repos aren't in the manifest"       -> repos_check
"Audit the whole org's repo visibility"            -> repo_permissions_audit
"What version is this repo at?"                    -> release_status
"Gate this merge on license compliance"            -> license_gate
"Show the license compliance ledger"               -> license_ledger
```

---

## Interface Coverage

| # | Tool | CLI | Module | MCP | OpenClaw | Skill | CC Hook |
|---|------|-----|--------|-----|----------|-------|---------|
| | **Setup & Onboarding** | | | | | | |
| 1 | Universal Installer | Y | Y | | | Y | |
| 2 | Dev Guide | | | | | | |
| | **Infrastructure** | | | | | | |
| 3 | LDM Dev Tools.app | | | | | | |
| | **Release & Deploy** | | | | | | |
| 4 | Release Pipeline | Y | Y | Y | | Y | |
| 5 | Private-to-Public Sync | Y | | | | Y | |
| 6 | Post-Merge Branch Naming | Y | | | | Y | |
| | **License, Compliance, and Protection** | | | | | | |
| 7 | Identity File Protection | Y | Y | | Y | Y | Y |
| 8 | License Guard | Y | Y | | | | Y |
| 9 | License Rug-Pull Detection | Y | Y | Y | | Y | |
| | **Repo Management** | | | | | | |
| 10 | Repo Visibility Guard | Y | Y | Y | Y | Y | Y |
| 11 | Repo Manifest Reconciler | Y | Y | Y | | Y | |

---

## License

```
MIT      All CLI tools, MCP servers, skills, and hooks (use anywhere, no restrictions).
AGPLv3   Commercial redistribution, marketplace listings, or bundling into paid services.
```

AGPLv3 for personal use is free. Commercial licenses available.

Built by Parker Todd Brooks, Lēsa (OpenClaw, Claude Opus 4.6), Claude Code (Claude Opus 4.6).
