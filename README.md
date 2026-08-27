# GPS-CAR Web Dashboard

هذا المشروع صغير ومتكامل لواجهة الويب التي تتوافق مع تطبيق Android الموجود في المستودع.

ملخص:
- يستخدم Firebase Realtime Database لقراءة liveLocation و locationHistory و activationCodes و vehicleDrivers (تماماً كما يرسل التطبيق).
- يستخدم Firestore لتخزين بيانات إدارية: tenants, users, drivers (mirror لسهولة الاستعلام).
- لا يتم تعديل أي ملفات Java.

الملفات الأساسية:
- index.html
- firebase-config.js (موجود ويحتوي على config الذي زودتني به)
- app.js
- auth.js
- map.js
- company.js
- admin.js
- styles.css
- README.md (هذا الملف)

نشر على Vercel:
1. اربط المستودع بـ Vercel.
2. ضع أي متغيرات بيئة إذا رغبت (أمان): لكن في هذه النسخة نستخدم firebase-config.js المباشر.

ملاحظات تشغيل:
- أنشئ مستخدم Admin يدوياً في Firebase Auth ثم أنشئ مستند في Firestore: users/<uid> مع الحقول {role: 'admin'}.
- عند إنشاء Tenant عبر Admin يجب أن تُنشئ مستند في tenants/{tenantId} بحقول المطلوبة.
- عند إضافة سائق عبر واجهة الشركة، تُكتب البيانات في Realtime DB تحت vehicleDrivers/{driverCode} و activationCodes/{phone}.

قواعد مهمة:
- لا تغير بنية Realtime DB لأن تطبيق Android يعتمد عليها.
- عند كتابة أي بيانات متعلقة بالمواقع لا تنقلها إلى Firestore إلا إن رغبت (التتبع real-time يبقى في Realtime DB).

قادم لاحقاً (قابل للتنفيذ بعد مراجعتك):
- حساب المسافات، تقارير يومية/أسبوعية.
- تحسين واجهة Admin، تحسين الأمن (قواعد Firebase).

