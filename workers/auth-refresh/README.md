# Auth Refresh Worker (Cloudflare Free)

این Worker توکن دسترسی گوگل را بدون باز شدن پنجره (popup) تمدید می‌کند. بدون آن، اپ هر یک ساعت یک
popup پنهان باز می‌کند که مرورگر دسکتاپ آن را می‌بندد و کاربر با پیام «نشست شما منقضی شده» روبه‌رو
می‌شود.

## چطور کار می‌کند

- ورود: مرورگر یک کد یک‌بارمصرف از گوگل می‌گیرد و به `POST /exchange` می‌فرستد. Worker کد را با
  `client_secret` به توکن تبدیل می‌کند، refresh token را با AES-GCM رمز می‌کند و در KV زیر یک شناسهٔ
  تصادفی (`sessionId`) نگه می‌دارد. به مرورگر فقط access token و `sessionId` برمی‌گردد؛ refresh token
  هرگز به مرورگر نمی‌رسد.
- تمدید: `POST /refresh` با `sessionId` یک access token تازه می‌دهد. اگر گوگل refresh token را رد کند
  (`invalid_grant`) ورودی KV پاک می‌شود و پاسخ `401` می‌آید؛ اپ آن‌وقت صفحهٔ ورود را نشان می‌دهد.
- خروج: `POST /logout` refresh token را در گوگل باطل و ورودی KV را حذف می‌کند.
- فقط Originهای فهرست `ALLOWED_ORIGINS` اجازهٔ تماس دارند؛ بدنهٔ درخواست حداکثر ۴ کیلوبایت است و
  `sessionId` باید دقیقاً ۴۳ نویسهٔ base64url باشد.

## ۱. OAuth Client در Google Cloud

در Google Cloud Console بخش APIs & Services > Credentials:

- از همان OAuth client فعلی اپ (`VITE_GOOGLE_CLIENT_ID`) استفاده کنید، به شرط آنکه نوعش
  **Web application** باشد؛ وگرنه یکی بسازید و `VITE_GOOGLE_CLIENT_ID` را عوض کنید.
- **Authorised JavaScript origins** باید این‌ها باشند:
  - `http://localhost:5173`
  - `https://omids0.github.io` (نسخهٔ dev زیر مسیر `/dev/` همین origin را دارد و جدا ثبت نمی‌شود)
- **Authorised redirect URIs** برای popup چیزی لازم ندارد؛ Worker با مقدار ویژهٔ `postmessage` کد را
  تبدیل می‌کند. اگر گوگل `redirect_uri_mismatch` داد، Worker خودش یک بار با origin صفحه تلاش می‌کند.
- در OAuth consent screen وضعیت Publishing باید **In production** باشد. در حالت Testing، refresh
  tokenها بعد از ۷ روز باطل می‌شوند. دسترسی `drive.file` غیرحساس است و تأیید گوگل لازم ندارد.
- `Client secret` همین client را بردارید؛ در مرحلهٔ ۳ فقط به Worker داده می‌شود، نه به اپ.

## ۲. ساخت KV

```bash
cd workers/auth-refresh
npm install
npx wrangler login
npx wrangler kv namespace create AUTH_KV
```

شناسهٔ چاپ‌شده را در `wrangler.toml` به‌جای `REPLACE_WITH_KV_NAMESPACE_ID` بگذارید.

## ۳. Secretها

```bash
npx wrangler secret put GOOGLE_CLIENT_ID
# همان Client ID وب

npx wrangler secret put GOOGLE_CLIENT_SECRET
# Client secret همان client

npx wrangler secret put TOKEN_ENC_KEY
# ۳۲ بایت تصادفی با base64، مثلاً خروجی: openssl rand -base64 32
```

`TOKEN_ENC_KEY` را جایی امن هم نگه دارید. اگر عوض یا گم شود، refresh tokenهای ذخیره‌شده خوانده
نمی‌شوند و همهٔ کاربران یک بار دوباره وارد می‌شوند.

## ۴. ALLOWED_ORIGINS

در `wrangler.toml` متغیر `ALLOWED_ORIGINS` فهرست originها با ویرگول است (بدون مسیر و بدون `/` پایانی).
پیش‌فرض: `http://localhost:5173,https://omids0.github.io`. اگر اپ روی دامنهٔ دیگری هم سرو می‌شود،
اینجا اضافه‌اش کنید.

## ۵. Deploy

```bash
npm run deploy
```

آدرس خروجی، مثلاً `https://accounting-auth-refresh.<subdomain>.workers.dev`، آدرس Worker است.

## ۶. وصل کردن اپ

متغیر `VITE_AUTH_WORKER_URL` را با آدرس Worker (بدون `/` پایانی) تنظیم کنید:

- محلی: در `.env`
- GitHub Pages: یک repository secret با نام `VITE_AUTH_WORKER_URL` بسازید و در
  `.github/workflows/deploy.yml` به محیط هر دو مرحلهٔ Build (production و dev) اضافه‌اش کنید:
  `VITE_AUTH_WORKER_URL: ${{ secrets.VITE_AUTH_WORKER_URL }}`

تا این متغیر خالی است، اپ مثل قبل رفتار می‌کند. بعد از تنظیم، هر کاربر با اولین ورود دستی خود به
تمدید با Worker منتقل می‌شود؛ نشست‌های قدیمی تا آن موقع همان روش قبلی را دارند. نسخهٔ اندروید (APK)
از افزونهٔ بومی استفاده می‌کند و به این Worker نیازی ندارد.

## ۷. آزمایش دستی

```bash
npx wrangler tail
```

در مرورگر وارد شوید، در DevTools بخش Network باید `POST /exchange` با وضعیت 200 و در تمدید بعدی
`POST /refresh` دیده شود. برای آزمایش خطا، از
[حساب گوگل](https://myaccount.google.com/permissions) دسترسی اپ را بردارید؛ تمدید بعدی باید `401`
بدهد و صفحهٔ ورود ظاهر شود. Worker هیچ توکنی را لاگ نمی‌کند.

## نکات امنیتی و محدودیت‌ها

- `sessionId` مثل یک رمز عمل می‌کند: هر کس آن را داشته باشد (و از Origin مجاز بیاید) می‌تواند access
  token بگیرد. اپ آن را فقط در localStorage همین مرورگر کنار نشست نگه می‌دارد.
- گوگل refresh token را فقط در اولین رضایت می‌دهد. اگر در یک ورود refresh token نیامد، اپ با همان
  روش قبلی ادامه می‌دهد و نشست `sessionId` ندارد؛ بعد از «خروج» (که دسترسی را باطل می‌کند) ورود بعدی
  دوباره refresh token می‌گیرد.
- ورودی KV بعد از ۱۸۰ روز بی‌استفاده پاک می‌شود و با هر تمدید (حداکثر ماهی یک بار) تمدید می‌شود.
- طرح رایگان Workers روزی ۱۰۰٬۰۰۰ درخواست و KV روزی ۱۰۰٬۰۰۰ خواندن و ۱٬۰۰۰ نوشتن دارد؛ مصرف این
  اپ (یک تمدید در ساعت برای هر دستگاه) بسیار کمتر است. نوشتن در KV فقط هنگام ورود و حداکثر ماهی یک بار
  برای هر نشست انجام می‌شود، و اگر همان نوشتن هم شکست بخورد تمدید جواب می‌دهد.
- خطاهای دائمی (مثلاً `invalid_client` چون `GOOGLE_CLIENT_SECRET` غلط است، یا `TOKEN_ENC_KEY` تنظیم
  نشده) پاسخ 401 `fatal` یا 500 `misconfigured` می‌دهند؛ اپ آن نشست را کنار می‌گذارد و به ورود
  دوباره یا روش قبلی برمی‌گردد، به‌جای اینکه همیشه تلاش کند. خطای موقت گوگل (429 و 5xx) پاسخ 502 می‌دهد
  و اپ بعداً دوباره تلاش می‌کند.
- اگر `/exchange` اصلاً جواب ندهد، همان صفحهٔ ورود اپ به روش قبلی (پنجرهٔ توکن) برمی‌گردد تا کسی قفل
  نشود؛ کاربر باید یک بار دیگر روی «ورود با Google» بزند.
- `POST /logout` با `{"sessionId": "...", "revoke": false}` فقط نسخهٔ ذخیره‌شده را پاک می‌کند و در
  گوگل چیزی را باطل نمی‌کند؛ اپ از آن برای ورود دوباره با همان حساب یا بازیابی رمز قفل استفاده می‌کند،
  چون باطل کردن refresh token قدیمی ممکن است کل دسترسی همان کاربر را ببندد.

## محدودیت نرخ درخواست (Rate limiting)

Worker خودش شمارنده ندارد. یکی از این دو راه را فعال کنید:

**۱. بدون دامنهٔ اختصاصی (آدرس `workers.dev`): Workers Rate Limiting binding.** این بخش را به
`wrangler.toml` اضافه و دوباره deploy کنید. Worker کلید `IP + مسیر` را می‌سازد و بعد از سقف، پاسخ
429 می‌دهد؛ بدون این binding کد بی‌اثر است:

```toml
[[unsafe.bindings]]
name = "RATE_LIMITER"
type = "ratelimit"
namespace_id = "1001"
simple = { limit = 30, period = 60 }
```

سقف ۳۰ درخواست در هر ۶۰ ثانیه برای هر IP و هر مسیر است (period فقط ۱۰ یا ۶۰ ثانیه می‌تواند باشد).
این قابلیت در wrangler هنوز زیر `unsafe` است؛ اگر نسخهٔ wrangler شما نمی‌شناسدش، راه دوم را بروید.

**۲. با دامنهٔ اختصاصی روی یک zone خودتان:** در Cloudflare Dashboard بخش Security > WAF > Rate limiting
rules یک قانون بسازید. آدرس `workers.dev` به zone شما تعلق ندارد و این قانون رویش اجرا نمی‌شود.

- Expression: `(http.host eq "auth.example.com" and http.request.method eq "POST")`
- Characteristics: IP
- Rate: ۳۰ درخواست در ۱ دقیقه (روی طرح رایگان فقط ۱۰ ثانیه ممکن است: ۶ درخواست در ۱۰ ثانیه)
- Action: Block، به مدت ۱۰ دقیقه

مصرف عادی یک کاربر یک `/refresh` در ساعت است، پس این سقف‌ها به کاربران واقعی نمی‌خورند.

## بعد از deploy: قاعدهٔ CSP اپ را تنگ کنید

در `index.html` اپ، `connect-src` فعلاً کل `https://*.workers.dev` را مجاز می‌کند تا هر آدرسی که
گرفتید کار کند. بعد از deploy آن را با آدرس دقیق Worker جایگزین کنید، مثلاً
`https://accounting-auth-refresh.<subdomain>.workers.dev`، تا مرورگر به Workerهای دیگران اجازهٔ
ارتباط ندهد.
