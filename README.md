# صندوق أكناف القربى — عائلة البادي

منصة متكاملة لإدارة صندوق العائلة على Next.js 15 + Vercel + Postgres.
جمع الاشتراكات والتبرعات، نشر الأخبار، طلبات المعونات، وتقارير مالية شفافة.

## ✨ المميزات

- **نظام عضوية كامل** مع طلبات انضمام تنتظر تفعيل اللجنة
- **٥ أدوار**: عضو · لجنة معونات · أمين صندوق · رئيس صندوق · مدير نظام
- **٣ طرق دفع**: تحويل بنكي · STC Pay · بطاقة دفع (Moyasar) — جميعها متاحة للعضو بدون أي زيادة في الرسوم
- **طلبات المعونات سرية** مع نظام محادثة وقرارات اللجنة
- **أخبار وإعلانات** بإشعارات تلقائية للأعضاء
- **تقارير مالية شاملة** مع رسوم بيانية تفاعلية
- **عربي 100%** RTL بخط Cairo + Tajawal مع هوية بصرية كاملة

## 🛠️ البنية التقنية

| | |
|---|---|
| **Framework** | Next.js 15 (App Router) + React 19 + TypeScript |
| **Styling** | Tailwind CSS + Lucide Icons + Recharts |
| **Database** | Postgres (Vercel Postgres / Neon / Supabase) |
| **Storage** | Vercel Blob (للإيصالات وصور الأخبار) |
| **Auth** | جلسات Cookie + bcrypt (مخصص — يدعم تدفق موافقة الإدارة) |
| **Hosting** | Vercel (مجاناً للاستخدام العائلي) |

## 🚀 النشر على Vercel — خطوة بخطوة

### 1) ادفع الكود إلى GitHub
```bash
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/afalbadi-byte/aknaafalqurba.git
git branch -M main
git push -u origin main --force
```

### 2) أنشئ قاعدة بيانات Postgres
خياران مجانيان:

**أ) Vercel Postgres (موصى به)**
1. ادخل على [vercel.com/dashboard](https://vercel.com/dashboard)
2. مشروعك → **Storage** → **Create Database** → **Postgres**
3. اختر منطقة قريبة (Frankfurt مثلاً)
4. سيُضاف `POSTGRES_URL` تلقائياً في Environment Variables

**ب) Neon.tech** (بديل مجاني وقوي)
1. سجّل في [neon.tech](https://neon.tech) → أنشئ Project
2. انسخ `Connection string` الذي يبدأ بـ `postgres://`
3. في Vercel → Project → **Settings → Environment Variables** أضف:
   ```
   DATABASE_URL = postgres://...
   ```

### 3) فعّل Vercel Blob (للإيصالات والصور)
1. في لوحة Vercel: **Storage** → **Create Blob Store**
2. سيُضاف `BLOB_READ_WRITE_TOKEN` تلقائياً

### 4) أضف باقي Environment Variables
في **Settings → Environment Variables** أضف:
```
DATABASE_URL=postgres://...                  # إذا استخدمت Neon
SESSION_SECRET=<32+ char random string>      # توليد: openssl rand -hex 32
NEXT_PUBLIC_SITE_URL=https://yourapp.vercel.app

# اختياري - بوابة الدفع
PAYMENT_API_KEY=sk_live_xxxxx                # من moyasar.com
PAYMENT_PUBLISHABLE_KEY=pk_live_xxxxx
```

> **ملاحظة لـ Vercel Postgres**: المتغير يُسمى `POSTGRES_URL` لا `DATABASE_URL`. أضف `DATABASE_URL` يدوياً وضع نفس القيمة.

### 5) شغّل schema قاعدة البيانات
من لوحة Vercel Postgres (أو Neon)، افتح **Query** ثم انسخ والصق محتوى `lib/schema.sql` وشغّل.

### 6) Deploy
- اربط المشروع بـ GitHub repo
- اضغط **Deploy** — سيكتشف Next.js تلقائياً
- بعد ٢-٣ دقائق، موقعك على الهواء

### 7) إنشاء حساب المدير الأول
افتح:
```
https://yourapp.vercel.app/setup
```
عبّئ بيانات المدير. الصفحة تعمل **مرة واحدة فقط** — بعدها ترفض إنشاء حسابات إدارية إضافية (تلقائياً).

## 💻 تشغيل محلي للتطوير

```bash
npm install

# انسخ ملف البيئة وعدّل القيم
cp .env.local.example .env.local
# اضبط DATABASE_URL على Postgres محلي أو سحابي

# شغّل schema (يدوياً عبر psql أو أي عميل)
psql $DATABASE_URL < lib/schema.sql

# شغّل خادم التطوير
npm run dev
```
افتح http://localhost:3000/setup لإنشاء حساب المدير.

## 💳 بوابة الدفع (Moyasar)

التكامل جاهز. لتفعيله:

1. سجّل في [moyasar.com](https://moyasar.com) (يحتاج سجل تجاري + IBAN)
2. خذ المفاتيح من لوحة ميسر
3. أضفها في Vercel Environment Variables:
   ```
   PAYMENT_API_KEY=sk_live_xxx
   PAYMENT_PUBLISHABLE_KEY=pk_live_xxx
   ```
4. أعد deploy المشروع
5. في لوحة ميسر، أضف Webhook URL:
   ```
   https://yourapp.vercel.app/api/gateway/webhook
   ```

**الرسوم** (يتحملها الصندوق):
- مدى: ~1.5% + 1 ريال
- فيزا/ماستركارد: ~2.1–2.2% + 1 ريال
- لا رسوم تأسيس ولا اشتراك شهري

## 🎨 الهوية البصرية

ضع ملفاتك في `public/brand/`:
- `logo.svg` — اللوقو الرسمي
- `letterhead.svg` — كليشة الطباعة A4
- `watermark.svg` — العلامة المائية

الألوان معتمدة من دليلك:
- الكحلي المؤسسي: `#0b2135`
- الذهبي الفاخر: `#b8934b`
- أخضر النماء: `#84a59d`
- بيج الأصالة: `#a68b5a`

## 📂 هيكل المشروع

```
app/
├── api/                 # API Routes (Serverless)
│   ├── auth/            #   login, register, logout, me, change-password
│   ├── members/         #   list, get, update, approve, role, status, dependents
│   ├── payments/        #   create, list, review, delete
│   ├── expenses/        #   list, create, delete
│   ├── aid/             #   create, list, get, status, updates
│   ├── news/            #   list, get, create, update, delete
│   ├── reports/         #   dashboard, financial, member-stats
│   ├── notifications/   #   list, mark-read
│   ├── settings/        #   public, all, update
│   ├── gateway/         #   start, verify, webhook (Moyasar)
│   └── setup/           #   one-time admin creation
│
├── (app)/               # Protected app layout
│   ├── dashboard/
│   ├── profile/
│   ├── payments/        #   list + new + payment-return
│   ├── aid/             #   list + new + [id]
│   ├── news/            #   list + [id]
│   └── admin/           #   committee pages
│
├── login/  register/  setup/  public-news/      # Public pages
├── layout.tsx           # Root layout (fonts, metadata)
├── globals.css          # Tailwind + theme
└── page.tsx             # Landing page

lib/
├── db.ts                # Postgres connection
├── auth.ts              # Sessions, cookies, requireUser/Role
├── storage.ts           # Vercel Blob uploads
├── notify.ts            # Notification helpers
├── api-client.ts        # Frontend API client
├── utils.ts             # Formatters, labels
└── schema.sql           # Database schema

components/
├── logo.tsx
├── modal.tsx
└── app-shell.tsx        # Sidebar + header + bell

public/brand/            # Logo, letterhead, watermark
```

## 🔒 الأمان

- كلمات المرور مشفّرة bcrypt
- الجلسات في cookie HttpOnly + Secure + SameSite=Lax
- جلسة تنتهي تلقائياً بعد 14 يوم
- كل الـ mutations تتحقق من الصلاحية حسب الدور
- طلبات المعونات سرية (لا تظهر للأعضاء العاديين)
- ملف `_archived_php_version/` مستثنى من النشر (gitignored)

## 📝 الترخيص

استخدام عائلي خاص — كل الحقوق لعائلة البادي.

---

> «وَآتِ ذَا الْقُرْبَىٰ حَقَّهُ» — سورة الإسراء، الآية 26
