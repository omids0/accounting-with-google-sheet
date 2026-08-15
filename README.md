# حسابداری شخصی (PWA)

## راه‌اندازی Firebase (یک‌بار — برای توسعه‌دهنده)

1. برو به [Firebase Console](https://console.firebase.google.com/)
2. پروژه جدید بساز
3. **Authentication** → Sign-in method → **Google** را فعال کن
4. **Project Settings** → Your apps → **Web** (`</>`) → اپ بساز
5. مقادیر config را کپی کن و در `.env` بگذار:

```bash
cp .env.example .env
```

6. در Google Cloud (لینک از Firebase):
   - **Google Sheets API** را فعال کن
   - در OAuth consent screen، scope مربوط به Sheets را اضافه کن (معمولاً خودکار است)

7. در Firebase → Authentication → Settings → **Authorized domains**:
   - `localhost` برای dev
   - دامنه production برای deploy

```bash
npm install
npm run dev
```

## تجربه کاربر

1. اپ باز می‌شود
2. «ورود با Google» — یک کلیک
3. داخل اپ — تنظیم شیت و ثبت داده

## Build

```bash
npm run build
```
