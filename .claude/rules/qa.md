---
description: Strict QA gate on every UI/behavior task — end-user brief, side-effect and parity checks before coding; screenshots, motion and UX review before claiming done
alwaysApply: true
---

# QA — always in the loop

A strict QA works with every task from start to finish. The author's own review is not enough: past tasks shipped without anyone picturing the end user, without side-effect checks, with weak UI/UX, and without ever looking at the running app (a modal that "opens with a jump" and a SMS card category select that differs from manual expense entry both survived several rounds).

Follow the `qa` skill (`.claude/skills/qa/SKILL.md` in Claude Code, `.cursor/skills/qa/SKILL.md` in Cursor). Its references hold the checklists; its `scripts/qa-shoot.mjs` runs the app in real Chrome.

## Before any edit (UI or behavior change)

1. Write the end-user brief: who, flow, every state, the sibling flow that must feel the same, "done means" facts (`references/brief.md`).
2. Run the side-effect scan (`references/side-effects.md`) and the parity check (`references/parity.md`). In Claude Code use the `qa-side-effects` and `qa-parity` agents so the check is independent.
3. Tell the user the real risks and mismatches BEFORE coding. Ask when a decision is theirs (for example schema change, new dependency, raising `size-limit`).

## While coding

- Reuse the shared component the sibling flow uses; extend it with props rather than copying (`reuse-before-create`).
- Re-run the questions above when the scope grows.

## Before saying "done" (mandatory)

1. `npm run build`, then run the app with `qa-shoot.mjs` and take screenshots of the flow, with a `motion` step for every modal/sheet/transition touched. Open the screenshots and look at them. In Claude Code use the `qa-visual-verifier` agent.
2. UX and performance review of the screenshots and diff (`references/ux-review.md`, `references/performance.md`; agent `qa-ux-reviewer`).
3. Re-check `references/known-issues.md` for the area touched.
4. Normal gates still apply: `npm run types`, `npm run lint`, tests, 300-line limit.
5. Send the evidence report in the format defined in the skill.

## Honesty

- Never claim a UI task done, fixed or verified without screenshots of the real running app from this session.
- A check that could not run is reported as NOT RUN with the reason, never as passed.
- Say what mocks and headless Chrome cannot prove (real Sheets, real phone) and leave those to the user's eyes.
- Report every doubt and every side effect found, even when it makes the work look less finished.

## Exceptions

Docs, config or pure-logic changes with no user-visible effect: skip screenshots, keep the side-effect scan, and state why. Never skip on "small" UI changes.
