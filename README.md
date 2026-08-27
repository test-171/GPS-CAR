# GPS-CAR Web Dashboard

🚗 منصة تتبع المركبات والسائقين في الوقت الفعلي

## نظرة عامة

هذا المشروع عبارة عن واجهة ويب متكاملة لتتبع المركبات والسائقين، مع رسم المسارات على الخريطة بشكل حي وجميل. يتم التعامل مع البيانات من خلال Firebase Realtime Database و Firestore.

### الميزات الرئيسية ✨

#### 🗺️ نظام الخريطة المتقدم
- عرض المركبات على خريطة Google Maps بشكل مباشر
- رسم مسارات المركبات بخطوط ملونة جميلة
- تتبع حي للموقع مع تحديث فوري
- زوم وتركيز على المركبة المختارة
- نوافذ معلومات تفصيلية عند النقر على المركبة
- عرض نقاط البداية والنهاية للمسار

#### 📊 لوحة التحكم الرئيسية
- إحصائيات سريعة (المركبات النشطة، الإجمالية، عدد السائقين، المسافة اليومية)
- جدول يومي لسجل الحركة
- قائمة جانبية قابلة للبحث للمركبات
- بحث فوري عن المركبات

#### 🏢 لوحة إدارة الشركة
- إدارة السائقين (إضافة، تعديل، حذف)
- إدارة المركبات
- تقارير يومية مفصلة:
  - إجمالي المسافة
  - أقصى سرعة
  - متوسط السرعة
  - وقت التوقف
  - وقت بداية ونهاية الخدمة
- طباعة التقارير
- تحميل التقارير بصيغة PDF (قيد التطوير)

#### 🛠️ لوحة الإدارة العامة
- إدارة المستأجرين (Tenants)
- إدارة المستخدمين والأدوار
- إعدادات النظام العامة:
  - تفعيل/تعطيل التتبع الحي
  - تفعيل/تعطيل تنبيهات البريد الإلكتروني
  - تعديل فترة تحديث بيانات الموقع

#### 🔐 نظام المصادقة
- تسجيل دخول آمن باستخدام Firebase Auth
- نظام الأدوار (Admin, Company Manager, Viewer)
- تحكم في الوصول بناءً على الدور
- إدارة الجلسات

## البنية التقنية 🏗️

### الملفات ��لأساسية

```
GPS-CAR/
├── index.html              # الصفحة الرئيسية
├── firebase-config.js      # إعدادات Firebase
├── auth.js                 # نظام المصادقة
├── map.js                  # نظام الخريطة والمسارات
├── app.js                  # المنطق الرئيسي للتطبيق
├── company.js              # لوحة الشركة
├── admin.js                # لوحة الإدارة
├── styles.css              # التنسيقات
├── package.json            # معلومات المشروع
└── README.md              # هذا الملف
```

## التكنولوجيات المستخدمة 🛠️

- **Frontend**: HTML5, CSS3, JavaScript (Vanilla)
- **Maps**: Google Maps API
- **Backend**: Firebase (Realtime Database + Firestore)
- **Authentication**: Firebase Auth
- **Hosting**: Vercel

## الإعدادات المطلوبة ⚙️

### 1. Firebase Configuration

قم بإنشاء مشروع في Firebase وأضف البيانات التالية في `firebase-config.js`:

```javascript
const firebaseConfig = {
    apiKey: "YOUR_API_KEY",
    authDomain: "YOUR_AUTH_DOMAIN",
    databaseURL: "YOUR_DATABASE_URL",
    projectId: "YOUR_PROJECT_ID",
    storageBucket: "YOUR_STORAGE_BUCKET",
    messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
    appId: "YOUR_APP_ID",
    measurementId: "YOUR_MEASUREMENT_ID"
};
```

### 2. Google Maps API Key

قم بالحصول على مفتاح Google Maps API وأضفه في `index.html`:

```html
<script src="https://maps.googleapis.com/maps/api/js?key=YOUR_API_KEY&language=ar"></script>
```

### 3. Firebase Realtime Database Structure

```
liveLocation/
  driverCode/
    latitude: number
    longitude: number
    speed: number
    altitude: number
    location: string
    timestamp: number
    dailyDistance: number

vehicleDrivers/
  driverCode/
    name: string
    phone: string
    vehicleCode: string
    tenantId: string
    createdAt: string
    active: boolean

locationHistory/
  recordId/
    driverCode: string
    driverName: string
    latitude: number
    longitude: number
    speed: number
    altitude: number
    location: string
    timestamp: number
    tenantId: string

activationCodes/
  phone/
    driverCode: string
    driverName: string
    createdAt: string
    used: boolean
    tenantId: string
```

### 4. Firestore Collections

#### tenants
```json
{
  "name": "string",
  "email": "string",
  "phone": "string",
  "createdAt": "timestamp",
  "active": "boolean",
  "subscriptionStatus": "active|inactive|suspended",
  "maxVehicles": "number",
  "usedVehicles": "number"
}
```

#### users
```json
{
  "email": "string",
  "displayName": "string",
  "role": "admin|company_manager|viewer",
  "tenantId": "string (null for admins)",
  "createdAt": "timestamp",
  "active": "boolean",
  "lastLogin": "timestamp"
}
```

#### drivers
```json
{
  "name": "string",
  "phone": "string",
  "vehicleCode": "string",
  "tenantId": "string",
  "createdAt": "timestamp",
  "active": "boolean"
}
```

#### settings
```json
{
  "liveTracking": "boolean",
  "emailAlerts": "boolean",
  "locationUpdateInterval": "number (in seconds)",
  "updatedAt": "timestamp",
  "updatedBy": "string"
}
```

## قواعد الأمان ببيانات Firebase 🔒

### Realtime Database Rules

```json
{
  "rules": {
    "liveLocation": {
      ".read": "auth != null",
      ".write": "root.child('services').child('admin').val() === auth.uid"
    },
    "locationHistory": {
      ".read": "auth != null",
      ".write": "root.child('services').child('admin').val() === auth.uid"
    },
    "vehicleDrivers": {
      ".read": "auth != null",
      ".write": "root.child('services').child('admin').val() === auth.uid"
    },
    "activationCodes": {
      ".read": "root.child('services').child('admin').val() === auth.uid",
      ".write": true
    }
  }
}
```

### Firestore Rules

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{document=**} {
      allow read: if request.auth != null;
      allow create, update, delete: if request.auth.uid == resource.data.uid;
    }
    
    match /tenants/{document=**} {
      allow read, write: if request.auth != null && 
        get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin';
    }
    
    match /drivers/{document=**} {
      allow read: if request.auth != null;
      allow write: if request.auth != null && 
        get(/databases/$(database)/documents/users/$(request.auth.uid)).data.tenantId == resource.data.tenantId;
    }
    
    match /settings/{document=**} {
      allow read: if request.auth != null;
      allow write: if request.auth != null && 
        get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin';
    }
  }
}
```

## الخطوات التشغيلية 🚀

### 1. الإعدادات الأولية

```bash
# استنساخ المستودع
git clone https://github.com/GPS-CAR/GPS-CAR.git
cd GPS-CAR

# تثبيت المتطلبات (إن وجدت)
npm install
```

### 2. إنشاء المستخدم الأول

1. انتقل إلى Firebase Console
2. أنشئ مستخدم في Firebase Authentication بدور `admin`
3. أنشئ مستند في Firestore في `users/{uid}` بالبيانات:
   ```json
   {
     "email": "admin@example.com",
     "displayName": "Admin",
     "role": "admin",
     "tenantId": null,
     "active": true
   }
   ```

### 3. النشر على Vercel

```bash
# ربط المستودع بـ Vercel
vercel

# أضف متغيرات البيئة إذا رغبت (اختياري)
# متغيرات البيانات الحساسة يفضل حفظها في Firebase Config
```

### 4. اختبار التطبيق

1. افتح الموقع على `https://gps-car-kappa.vercel.app`
2. قم بتسجيل الدخول بحساب الإدارة
3. اختبر الميزات المختلفة

## دليل الاستخدام 📖

### للمسؤول
- إنشاء وإدارة المستأجرين (Tenants)
- إنشاء وإدارة المستخدمين
- تعديل الإعدادات العامة للنظام
- مراقبة جميع المركبات والسائقين

### لمدير الشركة
- إضافة وتعديل السائقين
- عرض حالة المركبات
- إنشاء التقارير اليومية
- طباعة التقارير

### للعارض
- عرض المركبات على الخريطة فقط
- عرض المعلومات الأساسية

## الميزات المستقبلية 🔮

- [ ] تقارير أسبوعية وشهرية
- [ ] تنبيهات تلقائية (تجاوز السرعة، توقف مفاجئ)
- [ ] إحصائيات متقدمة
- [ ] تصدير البيانات بصيغ مختلفة
- [ ] نسخة تطبيق الهاتف
- [ ] دعم اللغات المتعددة
- [ ] تحسين الأداء والسرعة

## استكشاف الأخطاء 🐛

### المشكلة: الخريطة لا تظهر
**الحل**: تأكد من:
- إضافة Google Maps API Key بشكل صحيح
- تفعيل Maps API في Google Cloud Console
- السماح للنطاق الحالي في قيود المفتاح

### المشكلة: البيانات لا تتحدث
**الحل**: تأكد من:
- اتصال Firebase صحيح
- قواعد الأمان في Firebase
- أن التطبيق يتلقى بيانات من Realtime Database

### المشكلة: تسجيل الدخول يفشل
**الحل**: تأكد من:
- تفعيل Firebase Authentication
- وجود المستخدم في Firestore
- البيانات المدخلة صحيحة

## المساهمة 🤝

نرحب بالمساهمات! يرجى:
1. عمل Fork للمستودع
2. إنشاء فرع للميزة الجديدة
3. Commit التغييرات
4. Push إلى الفرع
5. فتح Pull Request

## الترخيص 📜

هذا المشروع مرخص تحت MIT License

## التواصل 📧

للأسئلة والدعم:
- البريد الإلكتروني: support@gps-car.com
- GitHub Issues: [GPS-CAR Issues](https://github.com/GPS-CAR/GPS-CAR/issues)

## الإحصائيات 📊

- **اللغات**: JavaScript (43.6%), Java (49.3%), HTML (5.1%), CSS (2%)
- **الإصدار**: 1.0.0
- **آخر تحديث**: 2026-08-27

---

**تم تطوير هذا المشروع بواسطة GPS-CAR Team** 🚗✨
