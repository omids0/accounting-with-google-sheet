# Reminder Push Worker (Cloudflare Free)

Worker رایگان برای ارسال Web Push. Google Apps Script هر ۱۵ دقیقه این Worker را صدا می‌زند.

## ۱. کلید VAPID

```bash
npx @pushforge/builder vapid
```

- `publicKey` → `VITE_VAPID_PUBLIC_KEY` در `.env` اپ
- `privateJWK` → secret در Cloudflare (کل JSON)

## ۲. Deploy

```bash
cd workers/reminder-push
npm install
npx wrangler login
npx wrangler secret put VAPID_PRIVATE_JWK
# JSON private JWK را paste کنید

npx wrangler secret put PUSH_WORKER_SECRET
# یک رمز تصادفی طولانی (همان را در Apps Script هم بگذارید)

npm run deploy
```

URL خروجی را در Apps Script Property `PUSH_WORKER_URL` بگذارید.

## ۳. GitHub Pages build

در GitHub Secrets:

- `VITE_VAPID_PUBLIC_KEY` = publicKey

## هزینه

Cloudflare Workers Free: ۱۰۰٬۰۰۰ request/day — برای یادآوری شخصی کافی است.
