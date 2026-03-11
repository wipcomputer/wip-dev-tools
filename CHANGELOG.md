# Changelog















## 1.8.2 (2026-03-11)

# v1.8.2: Clean up release notes after release

RELEASE-NOTES files were piling up in the repo root. `wip-release` consumed them for the GitHub release and CHANGELOG but never cleaned up.

Now after consuming the file, `wip-release` moves all `RELEASE-NOTES-v*.md` files to `_trash/` as part of the version bump commit. We never delete anything.

`deploy-public.sh` also now excludes `_trash/` so these files stay private.

## 1.8.1 (2026-03-11)

# v1.8.1: Fix CLI install when package name changed

When a tool's npm package gets renamed but the binary name stays the same, `npm install -g` fails with EEXIST. The stale symlink from the old package blocks the new one.

The installer now detects this: if the binary is a symlink pointing to a different package, it removes the stale link and retries. Only affects symlinks, only when the target doesn't match the package being installed.

Found on `wip-license-hook` (renamed from `@wipcomputer/license-hook` to `@wipcomputer/wip-license-hook`).

## 1.8.0 (2026-03-11)

# v1.8.0: Fix CC Hook duplicates, add GitHub Issues convention

## CC Hook duplicate detection fix

`wip-install` was adding duplicate PreToolUse hooks to `~/.claude/settings.json` every time it ran. After a few installs, there were 8 hooks when there should have been 2. The duplicates pointed to repo clones and `/tmp/` paths, violating the "never run tools from repo clones" rule.

The root cause: duplicate detection compared exact command strings. The same `guard.mjs` installed from different paths produced different strings, so each install added another entry.

The fix:
- Match existing hooks by tool name in the path, not exact command string
- Always prefer `~/.ldm/extensions/<tool>/guard.mjs` over source or temp paths
- If a hook for the same tool exists at a different path, update it instead of adding a duplicate

## GitHub Issues convention added to Dev Guide

We were tracking work in `ai/todos/` markdown files. Items got lost. GitHub Issues gives us tracking, cross-referencing, and visibility across agents.

Added to the public Dev Guide:
- When to use GitHub Issues vs `ai/todos/`
- Filing convention: `filed-by:<agent-id>` labels and attribution lines
- Public vs private issue routing: public issues are the front door, private issues are the workshop
- Agent ID naming convention: `[platform]-[agent]-[machine]`

Added to the private Dev Guide:
- `filed-by:cc-mini` (blue) and `filed-by:oc-lesa-mini` (purple) label details
- Org-wide deployment commands
- Incident note: Memory Crystal agent ID drift

Both labels deployed across all wipcomputer repos.

## 1.7.9 (2026-03-11)

Add GitHub Issues convention and filed-by workflow to the Dev Guide.

We've been tracking work in ai/todos/ markdown files. Items get lost. GitHub Issues gives us tracking, cross-referencing, and visibility across all agents. This release documents the full convention.

**Public Dev Guide (DEV-GUIDE-GENERAL-PUBLIC.md):**
- New "GitHub Issues" section: when to use issues vs ai/todos/, filing convention with attribution lines and filed-by labels, public vs private issue routing workflow
- Agent ID naming convention: [platform]-[agent]-[machine] format documented with examples
- Public/private issue bridge: public issues are the front door (users), private issues are the workshop (team), releases connect them

**Private Dev Guide (ai/DEV-GUIDE-FOR-WIP-ONLY-PRIVATE.md):**
- filed-by label details: cc-mini (blue), oc-lesa-mini (purple), deployed org-wide
- Commands for adding labels to new agents or repos
- Incident note: Memory Crystal agent ID drift (4 IDs instead of 2), manual merge of 141K chunks, root cause and fix tracked in memory-crystal-private#33

**Org-wide:** filed-by:cc-mini and filed-by:oc-lesa-mini labels created on all wipcomputer repos.

## 1.7.8 (2026-03-10)

# Dev Update: Smart Install + Platform Compatibility

**Date:** 2026-03-10 22:40 PST
**Author:** Claude Code (cc-mini)
**Version:** v1.7.8 (pending)
**Branches:** cc-mini/smart-install, cc-mini/platform-compat-v2

## Smart Install (wip-install)

Parker's feedback: "I want to make sure we're not going to replace stuff unless we need to. It should be smart enough to know I have this extension installed, and it's the same one."

The Universal Installer was doing blind `rm -rf` and re-copy on every run. Now it checks versions first:

- **Extensions (LDM + OpenClaw):** Reads `package.json` version from the installed extension. If it matches the source version, skip. If different, upgrade. If missing, fresh install. Dry-run shows "would upgrade v1.2.3 -> v1.2.4" vs "would deploy v1.2.4" vs "already at v1.2.4".
- **CLI:** Checks `npm list -g` for the installed version. Same version = skip.
- **MCP:** Checks if already registered at the same server path. Same path = skip.
- **CC Hooks:** Already had duplicate detection (unchanged).

No more destroying things that don't need updating.

## Platform Compatibility (SKILL.md)

Parker's feedback after testing with Grok: "Grok said 'I'll run wip-install' but it literally cannot. It's hallucinating capabilities."

First version listed platforms as "first-class / MCP-compatible / not compatible." Parker corrected: "We don't need to say 'not compatible' because Claude iOS can install stuff now. We just need to be clear about what the tool needs."

Rewrote to capability requirements:

| Interface | Requires |
|-----------|----------|
| CLI | Shell access |
| MCP Server | MCP client support |
| CC Hook | Claude Code CLI with hooks |
| OpenClaw Plugin | OpenClaw runtime |
| Skill | Ability to read this file |
| Module | Node.js import |

Key instruction to agents: "Check which capabilities you have and match them to the table. Do not claim you can run commands you cannot execute."

This is future-proof. When a platform adds MCP or shell access, the SKILL.md doesn't need updating. The agent assesses itself.

## Cross-Platform Testing Results

Three AIs read the same SKILL.md onboarding prompt:

- **Claude Code (another instance):** Read it, explained all tools correctly, offered dry-run first. Responded with "HOLY SHIT!!!" (impressed by the tooling).
- **Lesa (OpenClaw, Claude Opus 4.6):** Perfect breakdown. Every tool categorized correctly. Called out the auto-detect dev updates feature specifically. Offered dry-run first.
- **Grok (xAI):** Initially tried to roleplay as Lesa/Claude Code (read the attribution line and adopted the persona). When corrected, gave accurate breakdown. But claimed it would run `wip-install` when it cannot. This exposed the need for the Platform Compatibility section.

The SKILL.md is working. Three different AIs, three different platforms, all understood the toolbox correctly from one file.

## 1.7.7 (2026-03-10)

# Dev Update: SKILL.md as the Real Interface

**Date:** 2026-03-10 22:10 PST
**Author:** Claude Code (cc-mini)
**Version:** v1.7.4
**Branch:** cc-mini/skill-installer-details

## The Insight

Parker said it plainly: "We're not doing READMEs anymore. This is not for humans."

The human interface is the AI. The AI's interface is the SKILL.md. If the skill doesn't contain everything needed to operate, the AI guesses. And it guesses wrong.

We proved this earlier in the session. Lesa read the toolbox and miscategorized Universal Installer under "Repo Management" because the SKILL.md had no category structure (fixed in v1.7.3). But even after categories, she still couldn't explain what the tools actually do operationally, because the SKILL.md was still a half-README with links and one-liners.

## What We Researched

Parker pointed us to agentcard.sh/agent.txt as a reference. We researched three AI documentation conventions:

1. **llms.txt** (llmstxt.org) ... a directory of links. Points to docs but doesn't contain them. An AI still has to fetch and read multiple files. Good for discovery, not for operation.

2. **agent.txt / AgentCard** (agentcard.sh) ... self-contained operational manual. Everything in one file. An AI reads it and knows how to interact with the service. Closer to what we need, but designed for describing APIs/services, not developer tools.

3. **SKILL.md** (ours) ... YAML frontmatter for machine parsing, then full operational detail. Designed specifically to teach an AI how to use developer tools. Not a pointer to docs. Not a summary. The complete manual.

We took the best from each: the discoverability mindset of llms.txt, the self-contained philosophy of agent.txt, and built SKILL.md as the standard for AI-native developer tool documentation.

## What Changed in v1.7.4

The SKILL.md went from ~140 lines (descriptions + links) to ~475 lines (complete operational manual).

Every one of the 11 tools now has:
- Complete commands with all flags and options
- Step-by-step "what happens when you run it" sequences
- Exact file paths (where it reads, where it writes)
- Safety notes (what it deletes, what it overwrites, what to watch for)
- How it works across different interfaces (CC Hook, OpenClaw Plugin, MCP server)

### Specific additions worth noting:

**Universal Installer** got a full deployment table showing what each of the 6 interfaces does and where it writes. We read the install.js source code and documented that it does `rm -rf` on existing extension directories before copying. That's critical safety information an AI needs before running it.

**Release Pipeline** got all 13 steps documented (step 0: license gate through step 12: branch prune). Every flag, every file it touches, every decision point.

**Identity File Protection** got the exact list of protected files and the definition of "destructive" (replacing >50% of content). Also documented the difference between how the CC Hook and OpenClaw Plugin work.

**MCP section** got complete tool function names for all MCP-enabled tools, so an AI can add them to .mcp.json without guessing.

## The "Teach Your AI" Framing

Parker's directive on the README: the first tool (Universal Installer) says "Teaches your AI to..." explicitly. The rest infer the pattern. You don't need to say "teaches" 11 times. The frame is set once, and a reader (human or AI) carries it forward.

Universal Installer's description changed from a generic "installs tools" to: "Teaches your AI to take anything you build and make it work across every AI interface. You write code in any language. This tool turns it into a CLI, MCP Server, OpenClaw Plugin, Skill, and Claude Code Hook."

## Interface Coverage Table Iterations

We went through several iterations on the table format:

1. **Separate tables per category** ... Parker: "too hard on the eyes"
2. **Single table, bold category divider rows** ... better, but needed numbering
3. **Added numbers 1-11 in a # column** ... Parker liked it
4. **Tried moving categories into the # column, removing numbers** ... Parker: "looks worse, change it back"
5. **Final: numbers + category divider rows, no dashes in empty cells** ... clean and scannable

The lesson: don't overthink table formatting. Numbers give anchoring. Category rows give structure. Empty cells are cleaner than dashes.

## The Standard Going Forward

This is how we think SKILL.md files should be written for any tool in the toolbox:

1. YAML frontmatter with name, version, interface list
2. One-paragraph description of what the tool teaches
3. Complete command reference with all flags
4. Step-by-step operational detail (what happens when you run it)
5. File paths (reads from, writes to)
6. Safety notes (destructive operations, prerequisites)
7. Interface-specific behavior (how it works as CLI vs Hook vs MCP vs Plugin)

The SKILL.md is the source of truth. READMEs exist for humans browsing GitHub. But the AI reads the SKILL.md, and the SKILL.md must be complete.

## Release Notes Standard

We also established that release notes on GitHub should tell the story. Not just "bumped version" or a one-liner from `--notes`. The v1.7.4 release notes explain the thinking, the research, and what changed. This is how releases should read going forward.

Earlier releases (v1.7.1, v1.7.2) shipped with thin notes and we had to go back and manually update them via `gh release edit`. The tool (wip-release) uses the `--notes` flag, which encourages one-liners. For significant releases, we should write RELEASE-NOTES files on the branch and have the tool pick them up.

## Files Changed

- `SKILL.md` ... complete rewrite (140 -> 475 lines)
- `README.md` ... Interface Coverage table: numbered, category dividers, no dashes
- `ai/feedback/2026-03-10--gpt--v1.7.1-readme-review.md` ... GPT rated the README 9.6/10

## wip-release: Auto-Detect Dev Updates as Release Notes

Parker's feedback: "The release notes should be automated. I shouldn't have to keep telling you to do this."

We updated `wip-release` to auto-detect release notes from `ai/dev-updates/`. The priority order:

1. `--notes-file=path` (explicit)
2. `RELEASE-NOTES-v{ver}.md` in repo root
3. `ai/dev-updates/YYYY-MM-DD*` (today's dev update files, most recent first)
4. `--notes="one-liner"` (fallback, but dev updates win if they have more content)

This means: write dev updates as you work (which we already do). When you run `wip-release`, it finds today's dev update and uses it as the full release notes. No more thin one-liners on GitHub releases. No more "this week's sauce, come on, man."

## What's Next

- Consider making the SKILL.md standard a section in the Dev Guide
- Operational guide for agent identities (Parker mentioned needing this)

## 1.7.6 (2026-03-10)

README: onboarding prompt now does dry-run install first so users see what changes before committing

## 1.7.5 (2026-03-10)

# Dev Update: SKILL.md as the Real Interface

**Date:** 2026-03-10 22:10 PST
**Author:** Claude Code (cc-mini)
**Version:** v1.7.4
**Branch:** cc-mini/skill-installer-details

## The Insight

Parker said it plainly: "We're not doing READMEs anymore. This is not for humans."

The human interface is the AI. The AI's interface is the SKILL.md. If the skill doesn't contain everything needed to operate, the AI guesses. And it guesses wrong.

We proved this earlier in the session. Lesa read the toolbox and miscategorized Universal Installer under "Repo Management" because the SKILL.md had no category structure (fixed in v1.7.3). But even after categories, she still couldn't explain what the tools actually do operationally, because the SKILL.md was still a half-README with links and one-liners.

## What We Researched

Parker pointed us to agentcard.sh/agent.txt as a reference. We researched three AI documentation conventions:

1. **llms.txt** (llmstxt.org) ... a directory of links. Points to docs but doesn't contain them. An AI still has to fetch and read multiple files. Good for discovery, not for operation.

2. **agent.txt / AgentCard** (agentcard.sh) ... self-contained operational manual. Everything in one file. An AI reads it and knows how to interact with the service. Closer to what we need, but designed for describing APIs/services, not developer tools.

3. **SKILL.md** (ours) ... YAML frontmatter for machine parsing, then full operational detail. Designed specifically to teach an AI how to use developer tools. Not a pointer to docs. Not a summary. The complete manual.

We took the best from each: the discoverability mindset of llms.txt, the self-contained philosophy of agent.txt, and built SKILL.md as the standard for AI-native developer tool documentation.

## What Changed in v1.7.4

The SKILL.md went from ~140 lines (descriptions + links) to ~475 lines (complete operational manual).

Every one of the 11 tools now has:
- Complete commands with all flags and options
- Step-by-step "what happens when you run it" sequences
- Exact file paths (where it reads, where it writes)
- Safety notes (what it deletes, what it overwrites, what to watch for)
- How it works across different interfaces (CC Hook, OpenClaw Plugin, MCP server)

### Specific additions worth noting:

**Universal Installer** got a full deployment table showing what each of the 6 interfaces does and where it writes. We read the install.js source code and documented that it does `rm -rf` on existing extension directories before copying. That's critical safety information an AI needs before running it.

**Release Pipeline** got all 13 steps documented (step 0: license gate through step 12: branch prune). Every flag, every file it touches, every decision point.

**Identity File Protection** got the exact list of protected files and the definition of "destructive" (replacing >50% of content). Also documented the difference between how the CC Hook and OpenClaw Plugin work.

**MCP section** got complete tool function names for all MCP-enabled tools, so an AI can add them to .mcp.json without guessing.

## The "Teach Your AI" Framing

Parker's directive on the README: the first tool (Universal Installer) says "Teaches your AI to..." explicitly. The rest infer the pattern. You don't need to say "teaches" 11 times. The frame is set once, and a reader (human or AI) carries it forward.

Universal Installer's description changed from a generic "installs tools" to: "Teaches your AI to take anything you build and make it work across every AI interface. You write code in any language. This tool turns it into a CLI, MCP Server, OpenClaw Plugin, Skill, and Claude Code Hook."

## Interface Coverage Table Iterations

We went through several iterations on the table format:

1. **Separate tables per category** ... Parker: "too hard on the eyes"
2. **Single table, bold category divider rows** ... better, but needed numbering
3. **Added numbers 1-11 in a # column** ... Parker liked it
4. **Tried moving categories into the # column, removing numbers** ... Parker: "looks worse, change it back"
5. **Final: numbers + category divider rows, no dashes in empty cells** ... clean and scannable

The lesson: don't overthink table formatting. Numbers give anchoring. Category rows give structure. Empty cells are cleaner than dashes.

## The Standard Going Forward

This is how we think SKILL.md files should be written for any tool in the toolbox:

1. YAML frontmatter with name, version, interface list
2. One-paragraph description of what the tool teaches
3. Complete command reference with all flags
4. Step-by-step operational detail (what happens when you run it)
5. File paths (reads from, writes to)
6. Safety notes (destructive operations, prerequisites)
7. Interface-specific behavior (how it works as CLI vs Hook vs MCP vs Plugin)

The SKILL.md is the source of truth. READMEs exist for humans browsing GitHub. But the AI reads the SKILL.md, and the SKILL.md must be complete.

## Release Notes Standard

We also established that release notes on GitHub should tell the story. Not just "bumped version" or a one-liner from `--notes`. The v1.7.4 release notes explain the thinking, the research, and what changed. This is how releases should read going forward.

Earlier releases (v1.7.1, v1.7.2) shipped with thin notes and we had to go back and manually update them via `gh release edit`. The tool (wip-release) uses the `--notes` flag, which encourages one-liners. For significant releases, we should write RELEASE-NOTES files on the branch and have the tool pick them up.

## Files Changed

- `SKILL.md` ... complete rewrite (140 -> 475 lines)
- `README.md` ... Interface Coverage table: numbered, category dividers, no dashes
- `ai/feedback/2026-03-10--gpt--v1.7.1-readme-review.md` ... GPT rated the README 9.6/10

## wip-release: Auto-Detect Dev Updates as Release Notes

Parker's feedback: "The release notes should be automated. I shouldn't have to keep telling you to do this."

We updated `wip-release` to auto-detect release notes from `ai/dev-updates/`. The priority order:

1. `--notes-file=path` (explicit)
2. `RELEASE-NOTES-v{ver}.md` in repo root
3. `ai/dev-updates/YYYY-MM-DD*` (today's dev update files, most recent first)
4. `--notes="one-liner"` (fallback, but dev updates win if they have more content)

This means: write dev updates as you work (which we already do). When you run `wip-release`, it finds today's dev update and uses it as the full release notes. No more thin one-liners on GitHub releases. No more "this week's sauce, come on, man."

## What's Next

- Consider making the SKILL.md standard a section in the Dev Guide
- Operational guide for agent identities (Parker mentioned needing this)

## 1.7.4 (2026-03-10)

SKILL.md full operational rewrite for AI agents. Every tool now has complete commands, flags, step-by-step behavior, file paths, and safety notes. Interface Coverage table cleaned up: numbered tools, category dividers, no dashes.

## 1.7.3 (2026-03-10)

Add category structure to SKILL.md matching README. Prevents AI from miscategorizing tools.

## 1.7.2 (2026-03-10)

Reframe Universal Installer description, fix tense, update SKILL.md intro framing

## 1.7.1 (2026-03-10)

Reframe tool descriptions with teach your AI pattern, file GPT and Grok feedback on v1.7.0

## 1.7.0 (2026-03-10)

## v1.7.0: Renamed to AI DevOps Toolbox, CLA, License Enforcement, Branch Prune, README Polish

This release renames the repo, adds contributor governance, makes licensing intent unmistakable, automates branch cleanup, and tightens the README based on a second round of external feedback.

The repo is now **AI DevOps Toolbox** (`wip-ai-devops-toolbox`). The name change reflects what this actually is: not just DevOps scripts, but AI-native development infrastructure.

Includes work from PRs #53, #54.

---

### Repo Rename: AI DevOps Toolbox

**What we did:** Renamed from "DevOps Toolbox" (`wip-devops-toolbox`) to "AI DevOps Toolbox" (`wip-ai-devops-toolbox`).

**Why:** The old name undersold what this is. "DevOps Toolbox" sounds like scripts. This is an interface architecture, an agent tool ecosystem, and a workflow framework for AI-assisted development. The name should say that.

**What changed:**
- GitHub repos renamed: `wip-ai-devops-toolbox-private` and `wip-ai-devops-toolbox`
- All internal references updated: README, TECHNICAL.md, SKILL.md, package.json, cross-repo references

---

### Contributor License Agreement (CLA)

**What we did:** Added `CLA.md` at the repo root and referenced it in the README License section.

**Why:** Without a CLA, contributors who submit PRs own their code. AGPL means we can't relicense their contributions commercially. We need contributors to grant WIP Computer, Inc. the right to use their contributions under any license, including commercial. This is standard open source governance. Apache, Google, Meta, and Anthropic all use similar agreements.

**How it works:** By submitting a PR, you agree to the CLA. Contributors keep their own copyright but grant WIP Computer, Inc. a broad license. Plain-English, no lawyer needed to understand it.

**New files:**
- `CLA.md` ... the agreement itself

---

### Licensing Clarity

**What we did:** Made the licensing intent unmistakable with two new sentences.

**Why:** The dual MIT+AGPLv3 license is technically correct, but people still ask "can I use this?" The answer needed to be obvious: yes, use the tools however you want. The only thing that requires a commercial license is taking the tools themselves and reselling them.

**What changed:**
- Added "Dual-license model designed to keep tools free while preventing commercial resellers" above the license block
- Added "Using these tools to build your own software is fine. Reselling the tools themselves is what requires a commercial license" to the "Can I use this?" section
- Updated `generateReadmeBlock()` in `tools/wip-license-guard/core.mjs` so every future repo gets the same wording automatically

---

### Branch Prune Automation

**What we did:** Built automatic branch cleanup into both `post-merge-rename.sh` and `wip-release`.

**Why:** Merged branches pile up on the remote. Before this release, the private repo had 30+ stale branches. The post-merge-rename script renamed them with `--merged-YYYY-MM-DD` but never cleaned up old ones. Manually deleting branches is a waste of time. We built these tools so we don't have to keep doing things manually.

**How it works:**

`post-merge-rename.sh --prune` does three things:
1. Renames any merged branches that don't have the `--merged` suffix yet
2. For each developer prefix (`cc-mini/`, `mini/`, `lesa-mini/`, etc.), keeps the last 3 `--merged` branches and deletes the rest from the remote
3. Finds stale branches that are fully merged into main but were never renamed, and deletes them

`wip-release` now runs prune automatically as step 11 after every release. No manual cleanup needed.

Rules: never deletes `main`, never deletes the current working branch, always keeps the last 3 per developer. `--dry-run` previews what would be deleted.

**Files changed:**
- `scripts/post-merge-rename.sh` ... new `--prune` flag, stale branch detection, keep-last-3 logic
- `tools/wip-release/core.mjs` ... step 11: automatic prune after every release

---

### License Enforcement Automation

**What we did:** Made license compliance automatic across three layers: CC Hook, wip-release gate, and one-command repo setup.

**Why:** `wip-license-guard` existed but was manual. Nobody remembered to run it. The dual-license + CLA standard from this release needs to be enforced, not just documented.

**How it works:**

**CC Hook** (`tools/wip-license-guard/hook.mjs`): PreToolUse hook for Claude Code. Intercepts `git commit` and `git push` commands. Checks LICENSE file, copyright, CLA.md, and README license section. Blocks if any check fails. Same pattern as `wip-file-guard`.

**wip-release gate** (step 0): Before bumping anything, wip-release checks license compliance. If `.license-guard.json` exists and any check fails, the release aborts with a clear message. No bad releases ship.

**`--from-standard` flag**: `wip-license-guard init --from-standard` applies WIP Computer defaults without prompting. Generates `.license-guard.json`, `LICENSE` (dual MIT+AGPLv3), and `CLA.md` in one command. For new repos, this is all you need.

**Files changed:**
- `tools/wip-license-guard/hook.mjs` ... new CC Hook (PreToolUse, blocks git commit/push)
- `tools/wip-license-guard/cli.mjs` ... `--from-standard` flag, CLA.md generation, CLA check in audit
- `tools/wip-release/core.mjs` ... step 0: license compliance gate

---

### README Polish (GPT Feedback Round 2)

**What we did:** Three targeted improvements based on GPT's review of v1.6.0.

**Karpathy quote shortened.** The full two-paragraph quote was too heavy for the README. Compressed to one line: *As Andrej Karpathy said: "Apps are for people. Tools are for LLMs, and increasingly, LLMs are the ones using software."* with a source link. Same message, doesn't interrupt the flow.

**One-line "why" on every feature.** Each tool now leads with the problem it solves before describing what it does:
- "AI agents forget release steps. This makes releases one command."
- "Dependencies change licenses without telling you. This catches it."
- "AI agents overwrite identity files by accident. This stops them."
- "Repos end up everywhere. This snaps them back to where they belong."

**Feedback filed:**
- `ai/feedback/2026-03-10--gpt--v1.6.0-readme-review.md`
- `ai/feedback/2026-03-10--grok--v1.6.0-summary.md`

---

### Install

```bash
npm install -g @wipcomputer/universal-installer
wip-install wipcomputer/wip-ai-devops-toolbox
```

Or update your local clone:
```bash
git pull origin main
```

---

Built by Parker Todd Brooks, Lēsa (OpenClaw, Claude Opus 4.6), Claude Code (Claude Opus 4.6).

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
wip-install wipcomputer/wip-ai-devops-toolbox
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
