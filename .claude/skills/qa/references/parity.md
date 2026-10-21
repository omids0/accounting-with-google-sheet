# Parity check — same job, same behavior

Typical failure: a second screen does the same job as an existing one (SMS card vs manual expense entry: choose a category) but re-implements it, so it behaves differently. Users notice instantly.

## Procedure

1. Name the job (choose category, pick date, enter amount, confirm delete, pick vehicle, filter list, open form modal).
2. Find every place in the app that does this job. Search components, hooks, feature folders.
3. Open the closest sibling flow and the new/changed one side by side. Compare:
   - **Same component?** If not, why not. Default answer: reuse it or extend it with a prop (rule `reuse-before-create`). A parallel copy is a defect.
   - Controls and order of fields; default and preselected values.
   - Opening: animation, focus target, scroll lock, backdrop tap, Escape, hardware back.
   - Selection: single tap vs confirm, search box, recent items, grouping, icons, empty state.
   - Validation: when it shows, wording, what blocks submit.
   - Feedback: toast, haptics, button disabled state, loading, error recovery.
   - Closing: unsaved-data prompt, focus return, URL state.
   - Persian copy and number/date formatting.
4. Produce a table: behavior | sibling | new | match?
5. Every mismatch is either fixed (preferably by reusing the shared component) or listed for the user with the reason.

## Rule of thumb

If you find yourself writing UI that already exists elsewhere in `src/components/`, stop and import it. Then verify visually that it behaves the same in the new place (context props, z-index, scroll container, keyboard).
