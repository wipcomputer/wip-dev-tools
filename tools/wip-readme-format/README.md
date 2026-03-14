###### WIP Computer

# README Formatter

Generate or validate READMEs that follow the WIP Computer standard. Badges, title, tagline, "Teach Your AI" block, features, interface coverage table, license.

## What it does

- Generates separate section files (README-init-badges.md, README-init-features.md, etc.) so you can edit any section independently
- Deploy assembles them into the final README
- Same pattern as release notes: staging, review, deploy
- Validates existing READMEs against the standard

## Usage

```bash
node tools/wip-readme-format/format.mjs /path/to/repo
```

## Requirements

- node (18+)

## Interfaces

- **CLI**: Command-line tool
- **Skill**: SKILL.md for agent instructions

## Part of [AI DevOps Toolbox](https://github.com/wipcomputer/wip-ai-devops-toolbox)
