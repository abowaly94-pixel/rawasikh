# ربط دومين `rawasikheg.com` (Hostinger DNS) بمشروع Vercel

> آخر تحديث: 2026-11-15
> الهدف: تحويل `rawasikheg.com` من (Cloudflare Proxy → الاستضافة القديمة) إلى (Hostinger DNS → Vercel).
> الدومين نفسه **مش بيتغير**، فمفيش تعديل على الكود ولا على Supabase.

---

## 0) الوضع الحالي المُتحقَّق منه (2026-11-15)

| البند | القيمة الحالية | المصدر |
|---|---|---|
| Nameservers | `howard.ns.cloudflare.com` + `karsyn.ns.cloudflare.com` | DNS query |
| A record (`@`) | `104.21.93.126` + `172.67.209.227` (Cloudflare proxy) | DNS query |
| AAAA record (`@`) | `2a06:98c1:3121::6` + `2a06:98c1:3120::6` | DNS query |
| MX (`@`) | `mx1.hostinger.com` (5) + `mx2.hostinger.com` (10) | DNS query |
| TXT (`@`) | `v=spf1 include:_spf.mail.hostinger.com ~all` | DNS query |
| TXT (`_dmarc`) | `v=DMARC1; p=none` | DNS query |
| CAA | غير موجود | DNS query ✅ |
| الاستضافة الحالية للموقع | Cloudflare proxy → سيرفر قديم | HTML response |
| مشروع Vercel | `rawasikh` — `prj_XPFxTP8SsOXpPDUGYX7KR648E5dU` | `.vercel/project.json` |
| رابط Vercel | `https://rawasikh-mu.vercel.app` (200 OK) | HTTP check |
| آخر commit | `7507ca6` "done" | `git log` |
| Backend | Supabase `modjallmgsapfxbkdrpo` | `.env` |

### ⚠️ ملاحظة مهمة: الموقع الحي **أقدم** من نسخة Vercel
- `https://rawasikheg.com` حالياً بيقدّم build قديم (`assets/index-6Sq7V7WK.js`، خط Tajawal من Google Fonts، بدون `canonical`، بدون OG per-page).
- `https://rawasikh-mu.vercel.app` بيقدّم البناء الجديد (`assets/index-D2e0RMXY.js`، خط Tajawal self-hosted، `react-helmet-async`، `canonical`، structured data، `<noscript>` fallback).

**النتيجة: التحويل ده تحسين للموقع الحي، مش مجرد نقل.** بعد الـ cutover الموقع هيفتح بالنسخة الأحدث.

---

## 1) قبل ما تلمس — خد نسخة من كل سجلات Cloudflare

Cloudflare zone هيفصل عن الدومين فور تغيير الـ NS. **انسخ كل حاجة قبل**، من:
`Cloudflare → rawasikheg.com → DNS → Records`

انسخ حرفياً:

```
A      @      <IP السيرفر القديم>        ← احفظه كـ rollback
AAAA   @      <IPv6 القديم>
CNAME  www    <الوجهة القديمة>
MX     @      mx1.hostinger.com   pri 5
MX     @      mx2.hostinger.com   pri 10
TXT    @      v=spf1 include:_spf.mail.hostinger.com ~all
TXT    _dmarc v=DMARC1; p=none
TXT    <selector>._domainkey   v=DKIM1; ...    ← DKIM (الاسم متغيّر، لازم تنسخه بالظبط)
```

> 🔴 **DKIM**: محددُ الـ DKIM عند Hostinger بيتولّد عشوائي ومش `default`. لازم تنسخه من Cloudflare بالاسم الكامل (مثلاً `abc123._domainkey`). من غيره، رسايلك هتروح للسبام.

**الأفضل:** من صفحة DNS في Cloudflare اضغط **Export** للـ zone كله كـ Zone File. ده ملف `rawasikheg.com.zone` بتحطه بعدين في Hostinger.

---

## 2) Vercel الأول: ضيف الدومين (عشان يبقى عندك القيم الصحيحة)

1. افتح المشروع: `https://vercel.com/d?to=%2Fteam_KbU343EuuZeC2qmYtwrORonz%2Frawasikh%2Fsettings%2Fdomains`
2. **Add Existing Domain** → اكتب `rawasikheg.com` → **Add**.
   - Vercel هيطلب منك تضيف `www` → وافق (أو هتلاقي `www.rawasikheg.com` في نفس الشاشة).
3. من نفس الصفحة هتلاقي **"Recommended Records"** — **انسخ القيم دي بالظبط**:

   | Type | Name | Value |
   |---|---|---|
   | A | `@` | IP بتاع Vercel (غالباً `76.76.21.21`) |
   | CNAME | `www` | `cname.vercel-dns.com` |

   > ⚠️ **لا تنسخ IP من مشروع تاني.** Vercel بقى بيدّي IP مخصّص لكل مشروع. القيمة الصح **هي اللي باينة في شاشة Domains بتاع مشروعك** — خدها من هناك.

4. لو Vercel طلب **TXT verification** على `_vercel` → هيديك القيمة، ضيفها في Hostinger.

**سيب الصفحة دي مفتوحة** — هي اللي هتتابع منها حالة "Valid Configuration" و SSL.

---

## 3) Hostinger: انقل الـ Nameservers (دي الخطوة الحسّاسة)

> ⚠️ **DNS Zone Editor في Hostinger بيظهر بس لما الدومين يستخدم Hostinger nameservers.** لازم تعمل الخطوة دي الأول.

1. hPanel → **Domains** → اختر `rawasikheg.com` → تبويب **DNS / Nameservers**.
2. **Change Nameservers** → اختار **Hostinger nameservers** (مش custom).
   - **مهم:** Hostinger بيدي nameservers **فريدة لكل دومين**. **ما تنسخش قيم من أي جود تانية ولا من أي دليل** — خدها من الشاشة دي بس.
3. **Save**.

> ⏱️ الـ propagation بياخد من ساعات لـ 24 ساعة. خلال الفترة دي الموقع ممكن يكون مش متاح أو بيشتغل من مكان للتاني (DNS caches).
> **تخطّي الـ rollback المتاح:** الـ commit `7507ca6` موجود على `abowaly94-pixel/rawasikh` — لو حصل أسوأ حاجة، رجّع الـ NS لـ `howard.ns.cloudflare.com` + `karsyn.ns.cloudflare.com` وارجع كل حاجة زي ما كانت.

---

## 4) Hostinger: املا الـ DNS Zone

بعد ما الـ NS يتبّل، هتبقى الـ zone editor متاحة. **DNS → rawasikheg.com → Add Record**:

### سجلات الموقع (ضرورية)
| Type | Name | Value | TTL | ملاحظة |
|---|---|---|---|---|
| A | `@` | IP بتاع Vercel (من شاشة Vercel) | 3600 | **متنسخش** الـ IP القديم بتاع Cloudflare |
| CNAME | `www` | `cname.vercel-dns.com` | 3600 | |

### ❌ سجلات **متنسخش** من Cloudflare
| Type | Name | السبب |
|---|---|---|
| AAAA | `@` | ❗ Vercel **مش بيقدّم** custom domains over IPv6. أي AAAA بيوصّل الـ traffic لـ IP تاني أو هيفشل التحقق |
| A | `@` (القديم) | كان proxy لـ Cloudflare — لازم يتشال ويحل محل |
| AAAA | `@` (القديم) | نفس الح的理由 |
| CNAME | `www` (القديم) | كان proxy لـ Cloudflare |

### سجلات الإيميل (لازم تنسخها — من غيرها الإيميل هيقف)
| Type | Name | Value | Priority |
|---|---|---|---|
| MX | `@` | `mx1.hostinger.com` | 5 |
| MX | `@` | `mx2.hostinger.com` | 10 |
| TXT | `@` | `v=spf1 include:_spf.mail.hostinger.com ~all` | — |
| TXT | `_dmarc` | `v=DMARC1; p=none` | — |
| TXT | `<selector>` | `v=DKIM1; ...` (من Cloudflare) | — |

> 💡 **Hostinger بيعمل ده لوحده** لو Hostinger Email مفعّل على الدومين — بس **اتأكد** من الـ zone editor قبل ما تسيب الـ NS، لإن الـ zone فاضية = إيميل مكسور.

### لو مستخدم Zone File
Hostinger → DNS → **Import Zone File** → ارفع `rawasikheg.com.zone` اللي صدّرته من Cloudflare، **وبعدين** عدّل سجلات الموقع (A/CNAME) واحذف AAAA.

---

## 5) SSL

- Vercel **بيصدر شهادة Let's Encrypt لوحده** أول ما الـ DNS يتتحقق (عادةً خلال دقايق).
- بتلمس القفل الأخضر على `https://rawasikheg.com` خلال 5–30 دقيقة من الـ cutover.
- **مفيش حاجة تعملها في Hostinger** (Hostinger مش بيقدّم certificate للموقع لأن الموقع مش على Hostinger — بس الـ Email محتاج سجلات MX/DKIM اللي فوق).

---

## 6) الـ www والدومين الأساسي

في Vercel → `Settings → Domains`:

1. حدّد `rawasikheg.com` كـ **Primary Domain** (أو `www` — بس اختار واحد واتبعه في كل حاجة).
2. فعّل **Redirect** من التاني للتاني (Vercel بيعمل ده تلقائياً لو سبتّهم اتنين).
3. **مهم للـ SEO:** الكود مربوط بـ `https://rawasikheg.com` (بدون www) في:
   - `public/sitemap.xml` + `public/robots.txt`
   - `index.html` → `og:url` + `canonical`
   - `public/.htaccess` + `scripts/generate-og-pages.mjs`
   - `src/components/blog/BlogShareButtons.tsx`

   ⇒ **خلي `rawasikheg.com` (بدون www) هو الأساسي** عشان مفيش تعارض. لو عملت www هو الأساسي، التعديل ده هيلزم إعادة build.

---

## 7) التحقق بعد الـ cutover

```powershell
# 1) الـ NS اتغير؟
nslookup -type=NS rawasikheg.com 1.1.1.1
# لازم يطلع Hostinger nameservers بتوعك

# 2) سجل الموقع صح؟
nslookup -type=A rawasikheg.com 1.1.1.1
nslookup -type=CNAME www.rawasikheg.com 1.1.1.1

# 3) مفيش AAAA قديم؟
nslookup -type=AAAA rawasikheg.com 1.1.1.1

# 4) الإيميل سليم؟
nslookup -type=MX rawasikheg.com 1.1.1.1

# 5) الموقع شغال + SSL؟
curl.exe -I https://rawasikheg.com
curl.exe -I https://www.rawasikheg.com
```

قائمة الفحص اليدوي:

- [ ] `https://rawasikheg.com` بيفتح — **والنسخة الجديدة** (لازم `<title>` "رواسخ | للخدمات التعليمية..." مش "رواسخ - للخدمات...")
- [ ] certificate SSL ساري (قفل أخضر، مش تحذير)
- [ ] `http://` بيتحوّل لـ `https://`
- [ ] `www` وبدون `www` بيوصلوا لنفس المحتوى، والتاني بيعمل redirect
- [ ] صفحة داخلية مباشرة: `https://rawasikheg.com/courses` و `/blog` → **مش 404** (SPA rewrite شغال)
- [ ] **معاينة OG شغالة**: افتح `/blog/<slug>` ب	user-agent بوت → لازم图片 OG تطلع. (ده شغال بـ `vercel.json` rewrites — ومكتوب في `MIGRATION-HOSTING.md` إن `.htaccess` بيعمل نفس الحاجة على الاستضافة القديمة)
- [ ] تسجيل دخول طالب/أدمن شغال
- [ ] الداشبورد بيحمّل بيانات من Supabase
- [ ] رفع صورة شغال (Supabase Storage)
- [ ] `https://rawasikheg.com/sitemap.xml` بيفتح وبيشير على `rawasikheg.com`
- [ ] إيميل `@rawasikheg.com` بيوصل (اختبر من Gmail)
- [ ] Console المتصفح: مفيش أخطاء حمراء

---

## 8) Supabase (تحقق فقط — مفيش تعديل)

الدومين مش بيتغير، فالإعداد المفروض يبقى زي ما هو. بس **افتح وتأكد**:
`Supabase → Authentication → URL Configuration`
- **Site URL** = `https://rawasikheg.com`
- **Redirect URLs** = `https://rawasikheg.com/**` (+ `https://www.rawasikheg.com/**` لو هتسمح بالـ www)

الـ Paymob webhook بيضرب على Supabase، فمش متأثر.

---

## 9) بعد ما يبقى شغال (خلال 24–48 ساعة)

- [ ] **Cloudflare**: احذف الـ zone بتاع `rawasikheg.com` (أو على الأقل اعمل **DNS only** للـ records القديمة)._zone اللي فاتح على Cloudflare بـ nameservers مش متطابقة بيبقى مصدر لبس.
- [ ] **Google Search Console**: إعادة إرسال `sitemap.xml` — الرابط بقى。此次 cutover
- [ ] **Facebook Sharing Debugger** → إعادةScrape للصفحة الرئيسية
- [ ] **whatsapp**: ابعت لينك `/blog/<slug>` لنفسك — لازم الـ preview يطلع صورة وعنوان صح
- [ ] **Hostinger hPanel** → Domains → تأكد إن الدومين متصل و NS status = Active
- [ ] **خلي الـ TTL على 300** بعد ما تستقر (تسريع أي تعديلات جاية)

---

## 10) Rollback (لو حصل مشكلة)

1. Cloudflare → الـ zone لسه موجودة → الـ A record لـ `@` رجّعه للـ IP القديم.
2. أو: Hostinger → **Change Nameservers** → رجّع لـ `howard.ns.cloudflare.com` + `karsyn.ns.cloudflare.com`.
3. استنى propagation (ساعات).
4. **متلغيش الاستضافة القديمة / الـ zone القديمة لحد ما يبقى كل حاجة مستقرة أسبوعين.**

---

## ملخص الخطوات في سطر واحد

```
1. صدّر zone من Cloudflare (احتفظ بالـ IP القديم + DKIM)
2. Vercel → Add Existing Domain: rawasikheg.com + www  → خد الـ A/CNAME
3. Hostinger → Change Nameservers → Hostinger nameservers
4. Hostinger DNS Zone → A @ → Vercel IP | CNAME www → cname.vercel-dns.com
                       + MX/TXT/SPF/DKIM/DMARC (مفيش AAAA)
5. استنى → Vercel يطلع SSL → خليه primary → www redirect
6. اختبر → امسح zone Cloudflare → GSC
```
