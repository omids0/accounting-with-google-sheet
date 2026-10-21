---
name: qa
description: Strict QA gate for this app. Use BEFORE implementing any UI/behavior task (end-user brief, side-effect scan, parity check) and AFTER it (real-browser screenshots, motion check, UX + performance review). Covers modals, forms, SMS/expense flows, lists, pages. Never claim a UI task done without this.
---

# QA — strict, end-user-first

Act as the QA who blocks the release. The author (you) is biased; assume the change is broken until the evidence says otherwise. The user is a real end user of this Persian RTL PWA, not a developer: judge what they see and feel.

## Why this exists

Recurring failures the user reported: (1) built without picturing the end user, (2) side effects not checked or not mentioned, (3) UI/UX below expectation, (4) never tested visually, so "fixed" bugs stay (modal opens with a jump; SMS-card category select behaves differently from manual expense entry). This skill exists to stop exactly these.

## Phases

| Phase | When | What |
|-------|------|------|
| 0 Brief | Before any edit | `references/brief.md` + `references/side-effects.md` + `references/parity.md` |
| 1 During | While coding | Reuse the shared component the sibling flow uses. Re-run phase 0 questions when scope grows. |
| 2 Verify | After edits, before saying "done" | `references/visual-verify.md` (screenshots + motion) → `references/ux-review.md` → `references/performance.md` |
| 3 Report | Final message | Evidence report (format below) |

Phase 0 and 2 are mandatory for UI or behavior changes. Docs/config-only change: still do the side-effect scan, skip screenshots and say why.

## Agents (Claude Code)

Independent reviewers in `.claude/agents/`, each reading the matching reference file. Use them so the check is not anchored on your own view; give them the diff or file list, never your conclusion.

- `qa-side-effects` — who else uses what changed (phase 0 and 2)
- `qa-parity` — compare with sibling flow, find reuse gaps (phase 0 and 2)
- `qa-visual-verifier` — runs the app, takes screenshots, measures motion (phase 2)
- `qa-ux-reviewer` — end-user walkthrough + RTL/Persian/a11y/performance review of screenshots (phase 2)

In Cursor, follow the same `references/` files yourself.

## Report format (phase 3)

Write for the user in Persian, every line starting with a Persian word. Include:

1. What the end user sees now (one short paragraph, plain words).
2. Side effects found: each with file, who is affected, whether I handled it. Say "none found" only after searching.
3. Parity: sibling flow compared, same component reused or not.
4. Screenshot paths + what each proves. Motion verdict numbers if a modal/sheet/transition changed.
5. Open doubts the user should look at with own eyes. Never hide a doubt to look finished.

If a check could not run (build fails, Chrome missing), say so. Do not claim PASS on unrun checks.

## Known recurring bugs

Re-check these whenever the area is touched: `references/known-issues.md`. Append a line when the user reports a bug that came back.
