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
