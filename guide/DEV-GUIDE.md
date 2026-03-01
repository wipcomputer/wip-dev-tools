# Dev Guide ... Best Practices for AI-Assisted Development

## Repo Structure Convention

Every project follows this split:

### Public Repo
Clean. Code only.
- `README.md` ... what it is, how to use it
- `LICENSE` ... MIT (verified, always)
- `SKILL.md` ... agent skill definition (if applicable)
- `src/` or `core/` ... source code
- `cli/` ... CLI wrapper
- `package.json` / `pyproject.toml` ... package config
- `CHANGELOG.md` ... release notes

**No dev noise.** No todos, no conversations, no internal notes.

### Plans and Dev Notes (per-repo `ai/` folder)

Plans, todos, dev updates, and conversations live in the repo's own `ai/` folder. See the `ai/` folder section under Git Conventions for the full structure.

### Architecture (4-piece pattern)

Every tool follows the dual-interface architecture:
1. **core.ts** ... pure logic, zero framework deps
2. **cli.ts** ... thin wrapper (argv -> core -> stdout)
3. **mcp-server.ts** ... MCP wrapper for agents
4. *(optional)* **plugin wrapper** ... platform-specific integration

CLI is the universal fallback. MCP and plugin wrappers are optimizations.

## Release Process

### Branch, PR, Merge, Publish

```
1. Create feature branch:  git checkout -b <prefix>/<feature>
2. Make changes, commit
3. Push branch:            git push -u origin <prefix>/<feature>
4. Create PR:              gh pr create --title "..." --body "..."
5. Merge PR:               gh pr merge <number> --squash
6. Pull merged main:       git checkout main && git pull origin main
7. Release:                wip-release patch --notes="description"
                           # or: wip-release minor / wip-release major
                           # flags: --dry-run (preview), --no-publish (bump + tag only)
```

**Important:**
- **Every change goes through a PR.** No direct pushes to main. Not even "just a README fix." Branch, PR, merge. Every time.
- After merging, switch back to your dev branch. Don't sit on main.
- Use scoped npm tokens for publishing, not personal credentials.

### Release Quality Standards

Every release must have:

1. **Meaningful release notes.** Not just "Release v0.2.0". List what changed, why it matters, and how to install. wip-release generates this from commits automatically. Review it before publishing.
2. **All three contributors.** Parker, Lesa, and Claude Code must all have authored at least one commit in the repo. GitHub tracks contributors by commit author, not co-author trailers. If a contributor is missing, make a real commit with `--author`.
3. **Release on both repos.** The private repo gets the release from wip-release. The public repo gets a matching release from deploy-public.sh. Both must show the release in their GitHub Releases tab.
4. **npm package published.** Available via `npm install <package-name>@<version>`. Verify after publishing.
5. **CHANGELOG.md updated.** wip-release handles this, but verify it's accurate and complete.

**After every release, verify all of these.** Check the public repo's GitHub page. Does it show the release? Does it show all three contributors? Are the release notes complete? Is the npm package available? If any of these are missing, fix it before moving on.

### Pre-Publish Checklist

Before any repo goes public:

1. [ ] Code complete (all punchlist items done)
2. [ ] Code review (architecture, edge cases, quality)
3. [ ] Human review (spec, UX, direction)
4. [ ] LICENSE file present (MIT, verified)
5. [ ] README covers usage, installation, examples
6. [ ] CHANGELOG started
7. [ ] npm package published (scoped)
8. [ ] GitHub release created with tag
9. [ ] License compliance ledger initialized for all dependencies

## License Compliance

Use `wip-license-hook` for license rug-pull detection:
- Pre-pull hook: blocks upstream merges if license changed
- Pre-push hook: alerts if upstream has drifted
- LICENSE snapshots archived at adoption
- Daily cron scan of all dependencies
- Dashboard published for public verification

**Rule: never merge upstream if license changed. Hard stop.**

## Git Conventions

### Never Work on Main

**Main is for merged, released code only.** Never make changes directly on main. Every repo should have a dev branch checked out as the working branch at all times.

When you clone a repo or finish a PR, immediately create or switch to a dev branch:

```bash
git checkout -b <prefix>/dev           # new repo, first time
git checkout <prefix>/<feature>        # existing feature work
```

If you find yourself on main with uncommitted changes, stash, branch, and apply:

```bash
git stash
git checkout -b <prefix>/fix-name
git stash pop
```

### Branch Prefixes

Branch names use the **harness name** (agent + machine) as the prefix. Every harness is a distinct entity. Claude Code on the Mini is not the same as Claude Code on the Air.

```
<harness>/<feature>
```

Examples: `cc-mini/fix-search`, `cc-air/add-relay`, `lesa-mini/weekly-tuning`

### Multi-Agent Clone Workflow

**Every harness gets their own clone of every repo.** This prevents checkout collisions when multiple agents work on the same repo at the same time.

```
staff/
  Parker/
    Claude Code - Mini/repos/
      memory-crystal-private/     <- cc-mini works here, cc-mini/ branches
    Claude Code - MBA/repos/
      memory-crystal-private/     <- cc-air works here, cc-air/ branches
  Lēsa/
    repos/
      memory-crystal-private/     <- lesa-mini works here, lesa-mini/ branches
```

**Rules:**
- Never work in another agent's folder. If Lesa originated a repo, CC still clones it to their own folder.
- Each harness uses their own branch prefix (`cc-mini/`, `cc-air/`, `lesa-mini/`).
- PRs merge to `main` on GitHub. That's the shared integration point.
- If something needs to change in another agent's working tree, open a PR or ask them.

**When a new repo is created:**
1. Whoever creates it pushes to GitHub (wipcomputer org)
2. Every other agent clones it to their own repos folder
3. Each agent creates their dev branch with their prefix

This is how we avoid the "two agents have different branches checked out in the same folder" problem. It doesn't work. Separate folders, separate clones, shared remote.

### Commit Messages

- Imperative mood, concise (`add: license scanner`, `fix: offline detection`)
- Co-author trailers for all contributors on every commit
- PRs for cross-agent edits: don't edit another agent's working tree directly
- Never push directly to main. Always branch, PR, merge. No exceptions.

### File Naming Convention

All files authored by an agent use this format:

```
YYYY-MM-DD--HH-MM-SS--{agent}--{description}.md
```

Single dashes within date and time. Double dashes between segments. 24-hour clock.

This applies to dev updates, plans, todos, notes, session exports, daily logs ... everything with an author and a timestamp.

### Daily Logs

Each entry is its own file, not appended to a shared file.

```
agents/{agent-id}/memory/daily/
  2026-02-27--17-45-30--agent-a--feature-deploy.md
  2026-02-27--19-12-00--agent-a--config-migration.md
```

One file per entry. Full timestamp. Agent ID in the name. Nothing gets overwritten or collided.

### The `ai/` Folder (per-repo standard)

Every repo gets an `ai/` folder. It holds all the thinking between humans and agents ... plans, dev updates, todos, conversations, notes. Scoped to the repo it belongs to.

```
ai/
  plan/              ... architecture plans, roadmaps, convention notes
  dev-updates/       ... what was built, session logs
  todos/
    Parker-todo.md   ... Parker's action items
    CC-Mini-todo.md  ... CC-Mini's action items
    OC-Lesa-Mini-todo.md  ... OC-Lesa-Mini's action items
  notes/             ... research, raw conversation logs, references
```

### Todo Files

One file per person/agent. Named `{Name}-todo.md`. Lives in `ai/todos/`.

**Three sections, always in this order:**

```markdown
# {Name} ... {Project} To-Do

**Updated:** YYYY-MM-DD

---

## To Do
- [ ] Thing that needs doing
- [ ] Another thing

---

## Done
- [x] Thing that was completed ... YYYY-MM-DD

---

## Deprecated
- ~~Thing that's no longer needed~~ ... reason. (YYYY-MM-DD)
```

**Rules:**
- **Never delete anything.** Items move between sections, never off the page.
- **To Do** ... work that needs to happen.
- **Done** ... work that was completed. Check the box, add the date.
- **Deprecated** ... work that was planned but is no longer needed (code changed, approach changed, requirement dropped). Strikethrough the text, add the reason and date. This is NOT the same as Done. Deprecated means "we decided not to do this."
- **Update the date** at the top of the file every time you edit it.
- Each person/agent has exactly one file. Don't create per-date or per-feature todo files.

**Our todo files:**

| File | Who |
|------|-----|
| `Parker-todo.md` | Parker (human tasks, setup, deploy, review) |
| `CC-Mini-todo.md` | Claude Code on Mac Mini (code, docs, builds) |
| `OC-Lesa-Mini-todo.md` | OpenClaw Lesa on Mac Mini (agent tasks, testing) |

Add more as harnesses are added (e.g., `CC-Air-todo.md` for the MacBook Air).

## Branch Protection

All repos should have branch protection on `main` with `enforce_admins=true`. This means:
- No direct pushes to main (even for admins)
- All changes go through PRs

**To add protection:**
```bash
gh api "repos/<org>/<repo>/branches/main/protection" -X PUT \
  -F "required_pull_request_reviews[required_approving_review_count]=0" \
  -F "enforce_admins=true" \
  -F "restrictions=null" \
  -F "required_status_checks=null"
```

## Review Flow

```
Agent builds -> pushes to dev branch
  -> Code review (another agent or human)
  -> Human reviews (direction, spec)
  -> merge to main
  -> publish (npm, GitHub, skill registry)
```

## Public/Private Repo Pattern

### The Rule

**Never make a repo public unless it has a `-private` counterpart with all `ai/` content separated out.** If a repo doesn't have a `-private` counterpart yet, it stays private until one is created. No exceptions. Violating this exposes internal plans, todos, and development context.

**The private repo is the working repo. The public repo is everything except `ai/`.**

**You only need the private repo locally.** Clone `<name>-private`, work in it, release from it, deploy to public from it. Never clone the public repo for development. The public repo is a deployment target, not a working tree. The deploy script handles syncing.

Every repo has an `ai/` folder where agents and humans collaborate ... plans, todos, dev updates, notes, conversations. This is the development process. It doesn't ship publicly.

The private repo tracks everything, including `ai/`. The public repo is the same codebase without `ai/`. Two repos, same code, clean boundary.

```
<name>-private/      <- working repo (clone this one, work here)
  src/, README.md, LICENSE, package.json, SKILL.md ...
  ai/                <- plans, todos, notes, dev updates
    plan/
    todos/
    dev-updates/
    notes/

<name>/              <- public repo (deploy target only, never clone for dev)
  src/, README.md, LICENSE, package.json, SKILL.md ...
  (no ai/ folder)
```

### Why

The `ai/` folder contains personal notes, half-formed ideas, internal debates, agent inboxes. Useful for the team. Irrelevant to users. Can be taken out of context. Should not be public.

The public repo has everything an LLM or human needs to understand and use the project: README, code, docs, SKILL.md, LICENSE. The `ai/` folder is operational context, not conceptual context.

### Workflow

1. All work happens in the private repo
2. Merge PR to main on the private repo
3. Run `wip-release` on the private repo (version bump, changelog, npm publish, GitHub release)
4. Deploy to public repo (everything except `ai/`)

**The order matters.** Release first, then deploy. The public repo should always reflect a released version with correct version numbers, changelog, and SKILL.md.

```bash
# Step 1-2: normal PR flow on private repo
cd /path/to/private-repo
git checkout main && git pull origin main

# Step 3: release
wip-release patch --notes="description of changes"

# Step 4: deploy to public (code sync + release)
bash deploy-public.sh /path/to/private-repo <org>/<public-repo>
```

The deploy script:
1. Clones the public repo
2. Rsyncs everything except `ai/` and `.git/`
3. Creates a branch, commits, opens a PR, merges it
4. Creates a matching GitHub release on the public repo (pulls notes from the private repo's release)

**After deploy, the public repo should show:**
- Updated code (matching private minus `ai/`)
- A GitHub release with the version tag and release notes
- npm package available via `npm install <package-name>`

**What goes where:**

| Artifact | Where it lives |
|----------|---------------|
| npm package | Public npm registry (anyone can install) |
| GitHub release (private) | `<name>-private` repo (internal reference) |
| GitHub release (public) | `<name>` repo (what users see) |
| GitHub Packages | Not used (npm registry is the source of truth) |

### Config-specific splits

Some repos also have deployment config that shouldn't be public (real paths, contacts, secrets references). Same pattern applies ... the private repo has `config.json`, the public repo has `config.example.json`.

**Key rule:** never put real paths, contacts, personal notes, or deployment values in the public repo.

## Scheduled Automation (.app Pattern)

macOS restricts cron and shell scripts from accessing protected files (Full Disk Access). The workaround: wrap automation in a native `.app` bundle and grant FDA to the app.

### How it works

`LDMDevTools.app` is a minimal macOS application that:
1. Contains a compiled Mach-O binary (so macOS recognizes it as a real app)
2. The binary calls a shell script that dispatches to individual job scripts
3. Jobs live in `LDMDevTools.app/Contents/Resources/jobs/*.sh`
4. Adding a new job = dropping a new `.sh` file in that folder

### Structure

```
~/Applications/LDMDevTools.app/
  Contents/
    Info.plist                    ... app metadata (bundle ID, version)
    MacOS/
      ldm-dev-tools               ... compiled binary (Mach-O, calls ldm-dev-tools-run)
      ldm-dev-tools-run           ... shell dispatcher (routes to jobs)
    Resources/
      jobs/
        backup.sh                 ... daily backup of databases + state
        branch-protect.sh         ... audit + enforce branch protection across org
        visibility-audit.sh       ... audit public repos for missing -private counterparts
```

### Setup

1. Build the app (or copy from dev-tools repo)
2. Drag `LDMDevTools.app` into **System Settings > Privacy & Security > Full Disk Access**
3. Schedule via cron:

```bash
0 0 * * * open -W ~/Applications/LDMDevTools.app --args backup >> /tmp/ldm-dev-tools/cron.log 2>&1
0 1 * * * open -W ~/Applications/LDMDevTools.app --args branch-protect >> /tmp/ldm-dev-tools/cron.log 2>&1
```

### Why not LaunchAgents?

LaunchAgents have been unreliable across macOS updates. FDA grants to `/bin/bash` and `cron` don't persist. The `.app` bundle is the one thing macOS consistently respects for FDA permissions.

### Adding a new job

Create a file in `Contents/Resources/jobs/`:

```bash
# ~/Applications/LDMDevTools.app/Contents/Resources/jobs/my-job.sh
#!/bin/bash
echo "=== My job: $(date) ==="
# ... your automation here
echo "=== Done ==="
```

Then: `open -W ~/Applications/LDMDevTools.app --args my-job`

### Logs

All job output goes to `/tmp/ldm-dev-tools/`:
- `ldm-dev-tools.log` ... dispatcher log (which jobs ran, exit codes)
- `<job-name>.log` ... individual job output
- `<job-name>-last-exit` ... last exit code (for monitoring)
- `<job-name>-last-run` ... last run timestamp

## The _trash Convention

**Never rm or delete files.** Always move to a `_trash/` folder. Applies everywhere: repos, agent data, extension installs. Makes recovery trivial without git archaeology.
