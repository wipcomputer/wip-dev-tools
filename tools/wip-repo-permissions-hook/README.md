###### WIP Computer

# wip-repo-permissions-hook

## Repo visibility guard. Blocks repos from going public without a -private counterpart.

Every repo follows the public/private pattern. The private repo is the working repo with `ai/` folders (plans, todos, dev updates). The public repo is the same code without `ai/`. Making a repo public without the -private counterpart exposes internal development context.

This tool blocks that.

## How It Works

Before any repo visibility change to public, the guard checks:

1. Is this a fork of an external project? If yes, allow (exempt).
2. Does `{repo-name}-private` exist on GitHub? If yes, allow.
3. Otherwise, block with an error.

## Surfaces

- **CLI** ... `wip-repo-permissions check|audit|can-publish`
- **Claude Code hook** ... PreToolUse:Bash, blocks `gh repo edit --visibility public`
- **OpenClaw plugin** ... before_tool_use lifecycle hook
- **Cron audit** ... periodic scan of all public repos via ldm-jobs

## CLI Usage

```bash
# Check a single repo
node cli.js check wipcomputer/memory-crystal
# -> OK: memory-crystal-private exists

# Check a repo without -private (blocked)
node cli.js check wipcomputer/wip-bridge
# -> BLOCKED: no -private counterpart

# Audit all public repos in org
node cli.js audit wipcomputer

# Alias for check
node cli.js can-publish wipcomputer/wip-dev-tools
```

## Claude Code Setup

Add to `~/.claude/settings.json`:

```json
{
  "hooks": {
    "PreToolUse": [
      {
        "matcher": "Bash",
        "hooks": [{
          "type": "command",
          "command": "node /path/to/wip-repo-permissions-hook/guard.mjs",
          "timeout": 10
        }]
      }
    ]
  }
}
```

## OpenClaw Setup

Symlink or copy to extensions:

```bash
cp -r tools/wip-repo-permissions-hook ~/.ldm/extensions/wip-repo-permissions-hook
ln -sf ~/.ldm/extensions/wip-repo-permissions-hook ~/.openclaw/extensions/wip-repo-permissions-hook
openclaw gateway restart
```

## License

MIT

Built by Parker Todd Brooks, Lēsa (OpenClaw, Claude Opus 4.6), Claude Code CLI (Claude Opus 4.6).
