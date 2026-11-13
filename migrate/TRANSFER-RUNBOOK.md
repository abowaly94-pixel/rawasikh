# RUNBOOK — نقل ملكية مشروع Supabase

> الهدف: نقل المشروع `modjallmgsapfxbkdrpo` من Organization الشركة إلى Organization بتاعتك
> **بدون نسخ بيانات، وبدون تغيير في الواجهة** (الرابط بيفضل زي ما هو).
>
> ⏱️ الوقت الإجمالي: 30–60 دقيقة (منها 5 دقايق فعلية)
> 👤 المسؤول: انت (تحضير + تحقق) · الشركة (خطوة واحدة فقط)

---

## المرحلة 0 — تحضير (اعملها النهاردة)

### 0.1 حساب Supabase
- [ ] سجّل على https://supabase.com بحساب **شركة** (مش إيميل شخصي مؤقت)
- [ ] فعّل تأكيد الإيميل
- [ ] فعّل **2FA** (اختياري بس مهم)

### 0.2 إنشاء Organization
```
Dashboard → (أعلى اليسار) Org selector → New organization
  Name: Rawasikh
  Plan:  اقرأ 0.3 الأول
  → Create
```
- [ ] الـ Organization اتعملت
- [ ] انسخ **اسم الـ Organization** — ده اللي هتبعته للشركة

> ⚠️ **متعملش مشروع جديد.** انت محتاج الـ Organization فاضية.

### 0.3 اختيار الخطة (قرار مهم)
| حالة المشروع الحالي | خطتك | النتيجة |
|---|---|---|
| Free | Free | ✅ نقل سلس، بدون توقف |
| Free | Pro | ✅ أفضل |
| **Pro** | **Free** | ⚠️ توقف 1–2 دقيقة + تفقد النسخ الاحتياطي التلقائي |
| Pro | Pro | ✅ النقل الأنضف |

**التوصية:** لو المشروع مدفوع، رقّي الـ Organization لـ **Pro قبل النقل**.

حدود لازم تراعيها:
- الخطة المجانية: **مشروعين بالكتل** في الأورجانيزيشن
- لو وصلت الحد → النقل هيفشل (`organization has reached its project limit`)

### 0.4 باك أب طازج (إجراء أمان)
- [ ] افتح `https://rawasikheg.com/backup` → سجّل دخول أدمن → نزّل نسخة **جديدة**
- [ ] احفظها + `migrate/storage/` في مكانين مختلفين

### 0.5 إيميل الطلب للشركة
- [ ] ابعته كتابيًا (إيميل رسمي — مش واتساب)
- [ ] اذكر فيه: اسم الـ Organization + إيميل الحساب + الطلب الفني
- [ ] حدّد **5 أيام عمل** للرد

---

## المرحلة 1 — الشركة تزيل العوائق (دي أهم مرحلة)

النقل **بيفشل** لو فيه أي حاجة من دول. لازم الشركة تتأكد قبل ما تدوس Transfer:

### 1.1 صلاحية
- [ ] الشخص اللي هيعمل النقل لازم يكون **Owner** على Organization المصدر
  (لو هو Admin مش Owner → لازم الـ Owner يعملها)

### 1.2 إزالة GitHub Integration
```
Project Settings → Integrations → GitHub → Disconnect
```
> لو فيه ربط Git نشط → زر النقل هيبقى معطّل

### 1.3 إزالة Log Drains
```
Project Settings → Integrations → Log Drains → Remove
```

### 1.4 إنهاء أي project-scoped roles
> بتظهر في خطط Team/Enterprise بس. لو المشروع Free/Pro → مفيش مشكلة.

### 1.5 (مهم) متخلّيهمش يمسحوا حاجة
- ❌ متعملش `Pause project`
- ❌ متغيرش Region
- ❌ متغيرش الـ Organization تاني

---

## المرحلة 2 — تنفيذ النقل (5 دقايق)

### 2.1 الشركة تعمل الخطوة دي
```
Supabase Dashboard (بتاعهم)
  → افتح المشروع modjallmgsapfxbkdrpo
  → Project Settings → General
  → انزل لآخر الصفحة: "Transfer project"
  → Target organization: [Organization بتاعتك]
  → اكتب اسم المشروع للتأكيد
  → Transfer
```

### 2.2 إيه اللي بيحصل
- ⏱️ **Free → Free:** فوري، بدون توقف
- ⏱️ **Paid → Free:** توقف **1–2 دقيقة**
- 🔗 **الـ URL بيفضل زي ما هو** — `modjallmgsapfxbkdrpo.supabase.co`
- 💰 الفاتورة: الشركة لحد لحظة النقل، وانت بعدها

### 2.3 التأكيد
- [ ] المشروع ظهر في الـ Organization بتاعتك
- [ ] دورك عليه **Owner**
- [ ] حالة المشروع **Active / Healthy**

---

## المرحلة 3 — التحقق (15 دقيقة) ✅ متكملش غير بعدها

### 3.1 فحص الداتابيز
```
Login → SQL Editor → New query → الصق:

select 'profiles' as t, count(*) from profiles
union all select 'site_visits', count(*) from site_visits
union all select 'lecture_attendance', count(*) from lecture_attendance
union all select 'certificates', count(*) from certificates
union all select 'course_payment_plans', count(*) from course_payment_plans
union all select 'staff_permissions', count(*) from staff_permissions;
```
**الأرقام المتوقعة:** `110` · `10505` · `138` · `20` · `66` · `11`
- [ ] كل الأرقام مطابقة

### 3.2 فحص الجداول الـ 17 (اللي مش في الكود)
```sql
select table_name from information_schema.tables
where table_schema='public' order by table_name;
```
- [ ] الناتج **89 جدول**

### 3.3 فحص الملفات
```
Storage → شوف الـ 5 buckets:
site-assets · lesson-thumbnails · lesson-pdfs · payment-screenshots · task-submissions
```
- [ ] `site-assets` ≈ 38 ملف
- [ ] `lesson-thumbnails` ≈ 53 ملف
- [ ] `lesson-pdfs` ≈ 10 ملفات

### 3.4 فحص الدوال
```
Edge Functions → لازم تشوف 20 دالة
```
- [ ] 20 دالة موجودة
- [ ] `paymob-create-payment` و `db-full-backup` موجودين

### 3.5 فحص الكرون
```sql
select jobname, schedule, active from cron.job;
```
- [ ] `mark-absent-students-hourly` (كل ساعة)
- [ ] `send-zoom-reminders-every-5m` (كل 5 دقايق)
> ⚠️ دول لسه بيشاوروا على **URL القديم** — لو المشروع نفسه اتنقل، الـ URL ما اتغيرش → شغالين زي ما هم ✅

### 3.6 فحص المستخدمين
```sql
select count(*) from auth.users;   -- المتوقع 110
```

### 3.7 فحص الموقع نفسه
- [ ] افتح الموقع → الصور ظاهرة
- [ ] تسجيل دخول شغال
- [ ] الداشبورد بيحمّل بيانات
- [ ] رفع صورة شغال
- [ ] `/backup` بيطلّع ملف

---

## المرحلة 4 — تأمين بعد النقل (مهم جدًا)

### 4.1 غيّر باسورد الداتابيز
```
Project Settings → Database → Reset database password
```
> الشركة كانت عارفاه — لازم يتغير.

### 4.2 شيل أعضاء الشركة
```
Organization → Team → Remove (أي إيميل مش بتاعك)
```
- [ ] مفيش حد من الشركة عنده وصول

### 4.3 راجع التكاملات والـ Webhooks
- [ ] `Database → Webhooks` — مفيش webhook غريب
- [ ] `Auth → Providers` — إعدادات صح
- [ ] `Integrations` — مفيش حاجة متبقية

### 4.4 إعدادات Auth
```js
// موقعك الحالي
Site URL: https://rawasikheg.com
Redirect URLs: https://rawasikheg.com/**
```
- [ ] متظبطة

### 4.5 النسخ الاحتياطي
- [ ] لو على Pro → `Database → Backups` → تأكد إن Daily backups شغالة
- [ ] لو Free → اعمل جدول باك أب يدوي أسبوعي

### 4.6 تنبيهات الفاتورة
```
Organization → Billing → Spending caps / Budget alerts
```

### 4.7 مفاتيح API
- ⚠️ **متغيّرهاش دلوقتي** — تدوير الـ keys بيكسر الواجهة المنشورة (لازم rebuild)
- 🟡 لو عايز تعملها: دوّر الـ keys → حدّث `.env` → `npm run build` → ارفع

---

## المرحلة 5 — بعد كل ده

- [ ] ارفع الواجهة على هوستنجر (مفيش أي تعديل مطلوب)
- [ ] غيّر الدومين في Cloudflare
- [ ] سيب الاستضافة القديمة شهر
- [ ] وثّق: كل الأسرار والإعدادات في ملف واحد آمن

---

## 🔧 لو النقل فشل — الأسباب الشائعة

| رسالة الخطأ | السبب | الحل |
|---|---|---|
| `You must be an owner of the source organization` | الشخص مش Owner | الـ Owner يعملها |
| `Organization has an active GitHub integration` | فيه ربط Git | Disconnect من Integrations |
| `Target organization has reached its project limit` | هدفك Free وعندك مشروعين | امسح مشروع أو رقّي Pro |
| `You must be a member of the target organization` | انت مش عضو | انت Owner فالمفروض تمام — تأكد من الإيميل |
| زر Transfer مش ظاهر | المشروع على خطة/حالة مش بتسمح | راجع الصلاحيات + الحالة |

---

## 🚫 لو رفضوا النقل

**البديل 1 — ينقلوك جوّه حسابهم:**
اطلب يكون دورك على المشروع **Owner** في الـ Organization بتاعتهم.
➖ بيديك تحكم كامل، لكن الفاتورة والـ Organization لسه باسمهم.

**البديل 2 — نقل يدوي (المسار اللي جهزناه):**
محتاج منهم **باسورد الداتابيز** فقط:
```powershell
pg_dump "postgresql://postgres.modjallmgsapfxbkdrpo:SENHA@aws-0-eu-central-1.pooler.supabase.com:5432/postgres" `
  --no-owner --no-privileges -Fc -f rawasikh-full.dump
```
+ عندك بالفعل: 101 ملف (114 ميجا) + هيكل الـ 17 جدول + كود الـ 20 دالة.
**الوقت: 5–7 أيام.**

---

## 📌 الملفات الجاهزة عندك

| الملف | إيه فيه |
|---|---|
| `migrate/storage/` | 101 ملف · 114 ميجا |
| `migrate/storage-manifest.json` | قائمة كاملة بالملفات وأحجامها |
| `migrate/schema-missing-tables.sql` | هيكل الـ 17 جدول |
| `migrate/schema-inference-report.md` | مراجعة الأنواع |
| `migrate/rescue-storage.mjs` | سكربت سحب/تحديث الملفات |
| `migrate/json-to-ddl.mjs` | مولّد الهيكل |
| `MIGRATION-HOSTING.md` | نقل الاستضافة |
