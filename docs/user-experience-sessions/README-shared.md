# Two phones, one fake Google (حساب مشترک)

The shared account is a separate spreadsheet that one Google account creates and shares with another.
To simulate it, two `driver.mjs` phones talk to ONE in-memory fake Google (`mockGoogle.mjs`) instead
of each having a private in-process Sheets mock. Without `--backend` the driver behaves as before.

## Start it

Run everything from the repo that has `dist/` (`npm run build` first), for example
`D:\project\myProjects\accounting`. `S` below is `docs/user-experience-sessions` (use the full path of
the worktree when you start it from another folder).

```bash
node S/mockGoogle.mjs --port 4900                      # the fake Google (add --strict-drive-file, see below)

node S/driver.mjs --port 4911 --backend http://127.0.0.1:4900 \
     --email mother@test.local --name مادر \
     --data S/data/mother.json --init S/data/init-mother.js --out S/runs/shared/A

node S/driver.mjs --port 4912 --backend http://127.0.0.1:4900 \
     --email merchant@test.local --name بازاری \
     --data S/data/merchant-manager.json --init S/data/init-merchant-manager.js --out S/runs/shared/B

node S/do.mjs 4911 goto path=/buildings               # phone A (same do.mjs / actions as before)
node S/do.mjs 4912 goto path=/buildings               # phone B
```

`--backend` needs `--email`; `--name` is the display name (default: the part before `@`). The first time
an e-mail is seen, the backend creates that user's personal spreadsheet «حسابداری · <name>» from `--data`
(any `--data` file; none = the app's empty tabs). Preview ports are `port + 100` (5011, 5012) as always.
`--sms`, `--init`, `--dark`, `--viewport`, `--headed` work as before.

Seeding happens ONCE per browser: a reload keeps the registry, the mirror and the session the app has
changed (the shared account it listed, for example). The token is `mock-token-<email>`, valid 12 hours.

One command runs the whole scenario below and closes everything it started:

```bash
node S/sharedSmoke.mjs [--keep] [--headed] [--backend-port 4900] [--a-port 4911] [--b-port 4912]
# log: S/runs/shared/smoke-log.txt, screenshots: S/runs/shared/{A,B}/, process logs: S/runs/shared/*.log
```

`--keep` leaves the backend and both phones running after a green run (close them with
`node S/do.mjs <port> close`; the backend is a plain `node` process on the backend port).

## What the smoke walks through (all through the app's UI)

1. A opens «فضاهای من» (`/buildings`), taps «راه‌اندازی», «ادامه», types the account name «خرج خانه» and
   B's e-mail, «ادامه», «ساخت فضا و ارسال دعوت». The app creates «حسابداری · مشترک خرج خانه» in A's Drive,
   shares it with B (writer, mail logged), writes the type marker and the roles, opens `/shared`.
2. B opens «فضاهای من», taps «اتصال به حساب مشترک», sees «مشترک خرج خانه» in the Drive list, taps it, lands
   on `/shared` of the same file.
3. A taps the + button, «هزینه», keypad 450000, title, category «خوراک», «ثبت». The row reaches the backend.
4. B reloads: sees A's expense and «شما به مادر بدهکارید» 225,000.
5. B adds 120,000; A reloads: both expenses, net 165,000 «بازاری به شما بدهکار است».
6. Both open `/shared/members`: both e-mails, «مالک» and «شریک».
7. The two personal books stay private (one permission each).

## Endpoints implemented

Sheets v4 (`sheets.googleapis.com`; every path under `/v4/spreadsheets`): `POST /v4/spreadsheets` (create
with tabs and grids), `GET /{id}` (metadata, tabs, `developerMetadata`), `values/{range}` GET/PUT,
`values/{range}:append`, `:clear`, `values:batchGet`, `values:batchUpdate`, `values:batchClear`,
`:batchUpdate` with `addSheet` (explicit `sheetId`), `deleteSheet`, `deleteDimension`, `appendDimension`,
`deleteRange`, `copyPaste`, `updateSheetProperties` (rename, grid), `updateSpreadsheetProperties`,
`create/update/deleteDeveloperMetadata` (the `accounting_rev` change tokens and the archive marker).
The spreadsheet logic is `sheetsBook.mjs`, shared with the single-phone `sheetsMock.mjs`.

Drive v3 (`www.googleapis.com/drive/v3`, `/upload/drive/v3`): `files.list` (`q`: `mimeType`, `name =`/
`contains`, `trashed`, `'x' in parents|owners`, `appProperties has {…}`, `sharedWithMe`; `fields`,
`orderBy`, `pageSize`, `pageToken`), `files.get` (`fields` mask, `alt=media`), `files.create` (folders),
multipart and media upload, `files.update` (rename, trash), `files.copy`, `files.delete`, `generateIds`,
`about`, `permissions` create / list / get / update / delete by e-mail (`reader`, `writer`, …; the owner
can never be changed or removed), `files.get?fields=permissions(...)`. Owners alone see `parents`.
«Shared with me» = a permission for the caller; the sharing e-mail is logged at `/__debug/mails`.

Auth: `GET /oauth2/v3/userinfo` (and v1/v2, `userinfo/v2/me`) answer for the bearer token's user;
`POST /token` (refresh token `mock-refresh-<email>`), `tokeninfo`, `revoke`. No bearer token or a
token that is not `mock-token-…` is `401 UNAUTHENTICATED`. Unknown endpoints return `{}` and are logged
(console and `/__debug/requests` → `unknown`).

Status rules: no permission or unknown id → `404 Requested entity was not found.`; a reader writing →
`403 The caller does not have permission`; a reader sharing → 403; invalid e-mail → 400.

Debug (no auth): `GET /__debug/state?spreadsheet=ID[&tab=NAME&n=20]` (tabs + metadata, or a tab's raw rows),
`GET /__debug/requests?n=30`, `GET /__debug/files`, `GET /__debug/mails`, `GET /__health`,
`POST /__debug/open {email,id}` (strict mode), `POST /__admin/user {email,name,title,data,tabNames}`.
The driver adds: `sheet title=<tab> [n=20] [spreadsheet=<id>|active]`, `backend path=/__debug/files`,
`me`.

## Endpoints added after a failure while building this

None of the Google endpoints had to be added after the first full run: the list above came from reading
`driveShare.ts`, `driveFiles.ts`, `sheetRevisions.ts`, `sheetsCreate.ts`, `sharedConnect.ts` and friends.
What did need a fix were test-side gaps: the kept-alive socket of the smoke's own `fetch` going stale
while `execFileSync` blocked the process (`connection: close`), numbers stored as numbers by the backend
(the smoke compares `String(cell)`), and a category click that hit a record row behind the picker.

## Known gaps: what the fake cannot prove

- **drive.file and the Picker.** Real Google lists a shared file for B only after B opened it with the
  Google Picker («باز کردن شیت با گوگل»). By default the fake lists every file the caller has a permission
  for, so the invitee can use the Drive list or a pasted link. Start with `--strict-drive-file` to hide a
  shared file from list and Sheets until `POST /__debug/open` was called for that user (the Picker itself,
  `apis.google.com/js/api.js`, is not simulated).
- **Invitations.** No real e-mail, no «invitation accepted» step, no check that the address is a Google
  account (a made-up address is accepted); mails are only logged.
- **Revision times.** `modifiedTime` moves on every write and on sharing, strictly increasing, but it is
  not Google's clock or its eventual consistency. Drive's modifiedTime after an API write can lag in real
  life; here it is instant. A hand edit in Google Sheets does not exist.
- **Quotas, latency, errors.** No 429 or per-minute quota, no latency, no random 5xx, no concurrent-edit
  conflicts beyond "last write wins" per request. The app's retry and quota paths are not exercised.
- **Sheets semantics.** Cells keep the raw JSON value; no formulas, formats, number parsing or locale
  rendering (`FORMATTED_VALUE` is `String(value)`); the `fields` mask of Sheets is ignored (full object);
  a missing tab is a 400 like Google, but grid limits are not enforced on writes beyond the tracked
  `rowCount/columnCount`. Unknown `batchUpdate` requests are ignored with a log line.
- **Tokens.** No real OAuth, scopes, consent or expiry: every request is signed in as the e-mail inside
  the token. The app's silent refresh (Google Identity Services script) is stubbed by the stock
  `mockGoogleApis`; sessions last 12 h.
- **Live sync.** The smoke checks the other phone after a **reload**. Whether the app picks up a change
  without a reload (changed-tabs poll) is not asserted; the backend does stamp `accounting_rev` tokens
  and a new `modifiedTime`, so it would see one.
- **Real phone.** Android, push, background SMS and the real keyboard are not part of this.
