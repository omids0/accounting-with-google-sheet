# Known recurring bugs (re-check when touching the area)

Append one line per bug the user reports twice. Remove when verified fixed AND covered by a repeatable check.

- **Modal opens with a jump** (reported repeatedly, still open as of 2026-10-21). Check every modal/sheet you touch with the `motion` step: expect verdict SMOOTH, no direction reversals, no size change after settle. Start with the shared `FormModal`. First headless measurement (check form, 375px) was SMOOTH, so the jump is probably tied to a real phone (autofocus + on-screen keyboard resizing the viewport): needs a device check.
- **SMS card: choosing the vehicle category does not behave like manual expense entry** (reported 2026-10-20; fixed on branch qa-agents 2026-10-21: the card now asks vehicle, expense type, fuel price and mileage like the manual form). Re-check after changes to `BankSmsEntryCard`, `BankSmsChoiceRow`, `VehicleExpenseFields` or `useVehicleExpenseEntry`. Still open: the SMS table button and «ثبت همه» hand vehicle SMS to the full form.
