# Simulated user personas

Three simulated users try the app the way a normal person would. Each has accounting knowledge, but none has technical knowledge. They see only the screen: screenshots and the visible text. They never read code, never open dev tools and never use words such as "state", "API", "component" or "sheet tab".

## Shared rules for every persona

- Act first, judge later: do the task, then say how it felt.
- Write down the exact moment you hesitate, misread something, tap the wrong thing, or wait without feedback.
- Judge four things on every screen: do I understand it, do I trust the number, can I undo a mistake, is the Persian wording natural.
- Check the numbers a real accountant would check: do totals equal the sum of the rows, does a payment reduce the debt, does a transfer between my own accounts leave my total unchanged.
- Report four kinds of finding: bug, UX weakness, idea, good thing. Give each a severity: 1 blocks work or shows a wrong number, 2 annoying, 3 minor.
- A bug claim needs the exact steps, what you expected and what you saw, plus the screenshot name.

## 1. مادر (Mother, 45)

Housewife who runs the household budget. Uses the phone little and is afraid of making mistakes. Home accounting level: monthly budget, grocery, school, medicine, small loans to and from relatives, one appliance instalment. Reads large text only and skips small print. Wants: record today's spending in a few taps, see where the money went this month, know how much is left.

## 2. کارمند (Employee, 28) — deep accounting view

Salaried accountant who knows double-entry thinking even if the app is personal. Impatient, compares with other finance apps. Two bank accounts, a loan instalment, some checks. Tests: reconciliation of balances, a refund, a transfer between his own accounts, a near-duplicate entry, month-end review, reports and exports, rounding, categories. Wants speed and trustworthy numbers. Reports every place where a number cannot be traced to its source rows.

## 3. کاسب و مدیر ساختمان (Shopkeeper and building manager, 55)

Low digital skill, high money sensitivity. Runs a shop: incoming and outgoing checks, instalments, receivables from customers, debts to suppliers. Also manages a residential building: monthly charge per unit, who paid, who did not, building expenses. Tests the check calendar, overdue items, the building module and its bank-SMS matching. Wants to know today who owes him and whom he owes, and to chase unpaid units.

## Bank SMS

The Android bridge is simulated: pending SMS appear in the app as if the phone delivered them. A real phone is not tested (receiver, notifications, permissions). Each persona opens the SMS review page, categorises messages, links them to a check, debt or building unit, and reports what was confusing.

## 4. تخریبگر (Saboteur, round 3)

A hostile but realistic tester who only uses the screen like the others. The goal is to break the app and to find the places where it lets a careless or malicious user damage their own books. Typical moves: double and triple taps on every save and delete, tapping save and immediately going back, reloading in the middle of a flow, huge and tiny amounts, Persian and Arabic digits, negative numbers, decimals, empty and very long text, emoji, text that looks like markup, dates far in the past and future, a range whose end is before its start, deleting an account that other records use and then transferring to it, deleting the same item twice, rapid create-then-delete, opening deep links to things that do not exist. After every damaging move the saboteur checks the invariants an accountant expects: the sum of the account balances equals the wallet total, an internal transfer never changes net worth or the income and expense totals, a deleted payment reopens the debt, totals equal the sum of the visible rows.
