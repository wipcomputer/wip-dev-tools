## v1.7.1: Reframe Tool Descriptions, File External Feedback

This release reframes every tool description around a single idea: these aren't tools you remember to run. They're permanent skills baked into your AI's workflow. Non-forgettable memory.

Includes external feedback from GPT and Grok on v1.7.0.

---

### "Teach Your AI" Description Reframe

**What we did:** Rewrote every tool one-liner in the README and the org profile.

**Why:** The old descriptions explained what each tool does ("AI agents forget release steps. This makes releases one command."). The new descriptions frame them as skills your AI learns permanently. The first tool sets the pattern ("Teaches your AI to install anything you ship.") and the rest state the skill directly. The reader infers the frame.

**Examples:**
- Old: "AI agents forget release steps. This makes releases one command."
- New: "Release software correctly. Version bump, changelog, npm publish, GitHub release. One command, nothing forgotten."

- Old: "AI agents overwrite identity files by accident. This stops them."
- New: "Know what it can never overwrite. CLAUDE.md, SOUL.md, MEMORY.md, SHARED-CONTEXT.md are permanently protected."

- Old: "One wrong click makes a private repo public. This blocks that."
- New: "Never accidentally expose a private repo."

**Section header changed:** "Teach Your AI to Dev" became "Teach your AI to use DevOps Toolbox." More specific, less generic.

**Files changed:**
- `README.md` ... all 11 tool one-liners reframed
- `.github/profile/README.md` ... org profile descriptions matched

---

### External Feedback Filed (v1.7.0)

**GPT** rated v1.7.0 at **9.5/10** (up from 9 on v1.6.0). Called out the category grouping, problem-first descriptions, and interface coverage table as major improvements. Remaining suggestions: visible install section, 15-second interface explanation table, minor intro wording.

**Grok** called v1.7.0 the **"inflection point"** release. "This is the 'we're serious open-core infrastructure' release." Suggested next: GitHub Actions pack, wip-security tool, multi-language publishing.

**New files:**
- `ai/feedback/2026-03-10--gpt--v1.7.0-readme-review.md`
- `ai/feedback/2026-03-10--grok--v1.7.0-review.md`

---

Built by Parker Todd Brooks, Lēsa (OpenClaw, Claude Opus 4.6), Claude Code (Claude Opus 4.6).
