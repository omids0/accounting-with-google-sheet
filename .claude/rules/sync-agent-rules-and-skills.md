---
name: sync-agent-rules-and-skills
description: Every agent rule and skill must exist in both .cursor and .claude
alwaysApply: true
---

# Keep Cursor and Claude Config in Sync

This repo is worked on with **both** Cursor and Claude Code. Agent rules and skills must exist in both trees, with the same content.

| Concern | Cursor | Claude Code |
|---------|--------|-------------|
| Rules | `.cursor/rules/<name>.mdc` | `.claude/rules/<name>.md` + `@.claude/rules/<name>.md` import in `CLAUDE.md` |
| Skills | `.cursor/skills/<name>/` | `.claude/skills/<name>/` |

## Required behavior

Whenever you add, edit, rename, or delete a rule or a skill, apply the same change to **both** trees in the same commit. Never leave one side updated and the other stale.

### Adding or editing a rule

1. Write `.cursor/rules/<name>.mdc` with Cursor front matter (`description`, `alwaysApply`, optional `globs`).
2. Write `.claude/rules/<name>.md` with the same front matter keys and an identical body.
3. If `alwaysApply: true`, add `@.claude/rules/<name>.md` under **Always-on rules** in `CLAUDE.md` — that import is what makes the rule load every session for Claude.

### Adding or editing a skill

1. Put the skill under `.cursor/skills/<name>/` (`SKILL.md` plus `references/`, `scripts/`, `data/`, `templates/`).
2. Mirror the whole folder to `.claude/skills/<name>/`.
3. Rewrite paths inside the mirrored copy so each tree points at itself: `.cursor/skills/...` in the Cursor copy, `.claude/skills/...` in the Claude copy. Every other byte stays identical.
4. Do not mirror `__pycache__/` or `*.pyc`.

### Deleting

Delete from both trees.

## Verification before commit

```bash
diff -r --brief .cursor/rules .claude/rules      # only the .mdc/.md extension should differ
diff -r --brief .cursor/skills .claude/skills    # only self-referential paths should differ
```

Any other difference means the sync is incomplete — fix it before committing.

## Formatting note

Husky's pre-commit hook runs Prettier on staged `*.json`. Run `npx prettier --write` over the JSON in **both** skill trees before staging, so the hook cannot reformat one copy and leave the other behind.

## Do not

- Update only the tree for the editor you happen to be using.
- Add a rule to `.claude/rules/` without the matching `@` import in `CLAUDE.md` — it will never load.
- Let the two copies drift and plan to reconcile them later.
