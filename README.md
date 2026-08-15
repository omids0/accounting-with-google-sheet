# حسابداری شخصی (PWA)

اپ موبایل‌فرست حسابداری با **داشبورد نموداری** و ذخیره‌سازی در **Google Sheets**.

**لینک آنلاین:** https://omids0.github.io/accounting-with-google-sheet/

## ویژگی‌ها

- ورود با Google — شیت به‌صورت خودکار ساخته می‌شود
- داشبورد: درآمد، هزینه، مانده + نمودار دسته‌بندی
- فرم‌های درآمد و هزینه با دسته‌بندی قابل تنظیم
- فرم‌های سفارشی → هر فرم = یک Tab جدا در شیت

## راه‌اندازی محلی

```bash
cp .env.example .env
# VITE_GOOGLE_CLIENT_ID را در .env قرار بده

npm install
npm run dev
```

## Deploy روی GitHub Pages (یک‌بار)

### ۱. Secret در GitHub

1. ریپو → **Settings** → **Secrets and variables** → **Actions**
2. **New repository secret**
3. Name: `VITE_GOOGLE_CLIENT_ID`
4. Value: همان Client ID از Google Cloud

### ۲. فعال‌کردن Pages

1. **Settings** → **Pages**
2. **Source:** GitHub Actions

### ۳. Google Cloud — برای دوستان

در **OAuth Client** → **Authorized JavaScript origins** اضافه کن:

```
https://omids0.github.io
http://localhost:5173
```

در **OAuth consent screen** → **Test users** → ایمیل هر دوست را اضافه کن.

### ۴. Deploy

با هر push به `main`، GitHub Actions خودکار build و deploy می‌کند.

## تجربه کاربر

1. لینک اپ را باز کند
2. «ورود با Google» — با اکانت خودش
3. شیت در Drive خودش ساخته می‌شود
4. داشبورد، ثبت، رکوردها

## نکات

- هر کاربر شیت جدا در Google Drive خودش دارد
- در حالت Testing فقط Test users می‌توانند وارد شوند
- در ایران ممکن است برای لاگین VPN لازم باشد
