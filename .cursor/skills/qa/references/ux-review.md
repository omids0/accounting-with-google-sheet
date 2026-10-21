# UX review — through the end user's eyes

Review the screenshots from `visual-verify.md` and the code. "Looks fine in code" is not evidence. Be strict: a visible flaw is a BLOCK, not a nit.

## Checklist (phone 375px first, then 768px if layout differs)

**First impression**
- Is the purpose of the screen clear in 2 seconds? Is the primary action obvious and reachable with the thumb?
- Visual hierarchy: one main action, secondary actions quieter. Spacing consistent with neighboring screens.

**Persian / RTL**
- Text direction and alignment correct; icons that imply direction (back, next, chevrons) mirrored.
- Numbers: Persian digits where the app uses them; amounts grouped; no Latin/Persian digit mixing in one value.
- No clipped, overlapping or overflowing text with long Persian strings or large amounts.
- Copy matches the labels used elsewhere (tab titles in `layout/types.ts`); no developer wording.

**States**: loading (skeleton, not blank), empty (says what to do next), error (says what happened and how to recover), success feedback, disabled with reason.

**Interaction**
- Touch targets ≥ 44px; spacing between adjacent targets.
- Keyboard: opening a field must not hide it behind the on-screen keyboard; focus order logical; focus moves into a modal and returns after.
- Modal/sheet: opens without jump, closes on backdrop/Escape/back, background does not scroll.
- Double tap and rapid taps do not duplicate records.
- Destructive actions confirm; typed data is not lost silently.

**Visual quality**
- Alignment, equal paddings, consistent radius/shadow/colors from the design tokens (`design-system/`, Tailwind classes already used).
- Light AND dark mode contrast (text ≥ 4.5:1). Check dark with `--dark`.
- Reduced motion respected (`--reduced-motion`): no essential info carried by animation only.

**Accessibility**: labels on inputs and icon buttons, roles, focus ring visible. The `e2e:a11y` suite covers part of this; it does not replace looking.

For deeper design questions use the `ui-ux-pro-max` skill (Quick Reference §1–§3 for the final review; focused queries such as `"modal focus animation" --domain ux`).

## Verdict

PASS / BLOCK, with a numbered list of defects. Each defect: what the user sees, where (screenshot + element), suggested fix. Do not soften.
