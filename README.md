# حسابداری شخصی (PWA)

اپ موبایل‌فرست حسابداری با **داشبورد نموداری** و ذخیره خودکار در **Google Sheets**.

## ویژگی‌ها

- ورود با Google — شیت به‌صورت خودکار ساخته می‌شود
- داشبورد: درآمد، هزینه، مانده + نمودار دسته‌بندی
- فرم‌های درآمد و هزینه با دسته‌بندی قابل تنظیم
- فرم‌های سفارشی → هر فرم = یک Tab جدا در شیت

## راه‌اندازی (یک‌بار برای توسعه‌دهنده)

### ۱. Google Cloud Console

1. برو [Google Cloud Console](https://console.cloud.google.com/) (پروژه Firebase هم قابل استفاده است)
2. **APIs & Services** → **Library** → **Google Sheets API** → Enable
3. **Credentials** → **OAuth 2.0 Client ID** → نوع **Web application**
4. **Authorized JavaScript origins:** `http://localhost:5173`
5. Client ID را کپی کن

### ۲. OAuth Consent Screen

- Scopes: `email`, `profile`, `Google Sheets API`
- در حالت Testing، ایمیل خودت را به Test users اضافه کن

### ۳. فایل `.env`

```bash
cp .env.example .env
```

```
VITE_GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
```

### ۴. اجرا

```bash
npm install
npm run dev
```

## تجربه کاربر

1. «ورود با Google» — یک کلیک
2. شیت «حسابداری» با برگه‌های درآمد و هزینه خودکار ساخته می‌شود
3. داشبورد: نمودار دسته‌بندی‌ها
4. ثبت درآمد/هزینه یا فرم سفارشی
5. تنظیمات: افزودن فرم جدید = Tab جدید در شیت

## نکته شبکه

برای اولین ورود ممکن است VPN لازم باشد. بعد از آن تا انقضای توکن (~۱ ساعت) بدون ورود مجدد کار می‌کند.

## Build

```bash
npm run build
```
