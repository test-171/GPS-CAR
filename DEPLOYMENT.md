# GPS-CAR Deployment Guide

## نشر على Vercel 🚀

### الخطوة 1: إنشاء حساب Vercel
1. انتقل إلى [Vercel](https://vercel.com)
2. أنشئ حساب جديد أو سجل دخولك
3. ربط حسابك بـ GitHub

### الخطوة 2: نشر المستودع
```bash
# تثبيت Vercel CLI
npm i -g vercel

# تسجيل الدخول
vercel login

# النشر
vercel --prod
```

### الخطوة 3: إعداد متغيرات البيئة (إن لزم الأمر)
في لوحة تحكم Vercel:
1. انتقل إلى Settings
2. اختر Environment Variables
3. أضف المتغيرات المطلوبة

## الاختبار المحلي 🧪

```bash
# تشغيل الخادم المحلي
http-server

# أو استخدام npm
npm run dev

# ثم افتح http://localhost:8080
```

## الخطوات التالية ✨

1. **تحديث Firebase Config**: تأكد من تحديث بيانات Firebase
2. **اختبار الميزات**: اختبر جميع الوظائف
3. **إضافة البيانات**: أضف المستأجرين والمستخدمين والسائقين
4. **المراقبة**: استخدم Google Analytics للمراقبة

