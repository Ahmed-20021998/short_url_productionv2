# url_short_app_v1 — اختصار الروابط (URL Shortener)

هذا المشروع تنفيذ كامل لمعمارية النظام الموضحة في الرسم التخطيطي الذي أرسلته، مقسّم إلى backend (3 سيرفرات) و frontend (Next.js) و infra (البنية التحتية) و shared (تخزين مشترك).

## 1. شرح المعمارية (حسب الرسم)

```
client → rate limiting → load balancer → server1 / server2 / server3
```

- **rate limiting**: يحمي النظام من هجمات DDoS، ويعمل قبل أي شيء آخر (`infra/reteLimiting.js`).
- **load balancer**: يوزّع الطلبات بالتساوي (round-robin) بين السيرفرات الثلاثة (`infra/loadBalancer.js`).
- **server1 / server2 / server3**: نفس الكود بالضبط مكرر 3 مرات (stateless)، كل واحد بمنفذ مختلف (5001 / 5002 / 5003).

### مسار الكتابة (إنشاء رابط مختصر)
```
server → primary DB (write/delete/update) → warm the cache
```
Postgres هي primary DB، ولها fallback تلقائي إلى ملفات JSON في `shared/DB` إذا لم يتوفر `DATABASE_URL_PRIMARY` (يعني المشروع يشتغل محليًا بدون أي قاعدة بيانات حقيقية).

### مسار القراءة (Redirect) — المسار الأول "مهم للمستخدم"
```
server → Redis (if Hit) → redirect → user
server → Redis (if Miss) → 2nd DB (read) → save in cache → redirect → user
```
هذا منفّذ في `backend/server*/repository/url.repository.js`.

### المسار الثاني — Background (analytics)
```
server → Message Queue → Analytics Worker → Analytics DB
```
عند كل ضغطة على رابط مختصر، يرسل السيرفر حدثًا لهذا الشكل إلى الطابور بدون أن ينتظر الرد (fire-and-forget):
```json
{
  "short_code": "abc123",
  "timestamp": "...",
  "country": "Egypt",
  "device": "mobile"
}
```
ثم الـ `Analytics Worker` (`infra/worker.js`) يسحب الحدث من الطابور (`infra/queue.js`) ويحفظه في Analytics DB. هذا يبقي الـ redirect سريعًا لأن كتابة الإحصائيات لا تُعطّله أبدًا.

### كاش الجلسة (Session cache)
مذكور في الرسم: "هذا الكاش لمشاركة الجلسة بين السيرفرات الثلاثة حتى لا يحدث logout مع كل طلب". لذلك:
- عند تسجيل الدخول، يتم توليد JWT.
- يُخزَّن الـ token في Redis (`session:<token>` → `user_id`).
- يُخزَّن نفس الـ token في httpOnly cookie أيضًا.
- أي سيرفر من الثلاثة يستطيع التحقق من الجلسة مباشرة من Redis، بدون الحاجة لقاعدة البيانات ولا لتسجيل دخول جديد.

## 2. هيكل المجلدات

```
url_short_app_v1/
  backend/
    server1/ server2/ server3/   ← كود مطابق تمامًا، فقط PORT مختلف
      routes/        → استقبال الـ HTTP request فقط
      controller/     → يقرأ req/res وينادي service
      service/         → منطق العمل (business logic)
      repository/       → الطبقة الوحيدة التي تتكلم مع DB و Redis
      model/              → شكل الصف (row) في قاعدة البيانات
      config/               → اتصال Postgres و Redis (مع fallback تلقائي)
      middelware.js           → التحقق من تسجيل الدخول + معالجة الأخطاء
      app.js / server.js       → تجميع الـ express app وتشغيله
  frontend/                       → Next.js (App Router)
    app/page.js                    → شاشة اختصار الروابط
    app/auth/page.js                → شاشة تسجيل الدخول / إنشاء حساب
    app/analytics/page.js            → شاشة الإحصائيات
  infra/
    reteLimiting.js  → rate limiting (يحمي من DDoS)
    loadBalancer.js   → load balancer بسيط (round-robin)
    queue.js           → Message Queue (Redis list، قابل للاستبدال بـ BullMQ لاحقًا)
    worker.js           → Analytics Worker
  shared/
    DB/                  → url.json / Analytics.json / users.json (fallback بدون DB حقيقية)
    cach/                  → توثيق شكل الكاش (url.redis و sessionShared.redis)
  vercel.json               → إعدادات نشر الفرونت إند على Vercel
```

المعمارية داخل كل سيرفر: **route → controller → service → repository → DB** بالضبط كما طلبت.

## 3. التشغيل محليًا (بدون أي خدمات خارجية)

المشروع مصمم ليعمل من أول لحظة بدون Postgres ولا Redis حقيقيين (fallback تلقائي لملفات JSON وذاكرة مؤقتة). هذا مناسب للتجربة والتطوير فقط.

```bash
# 1) تثبيت كل جزء
cd backend/server1 && npm install && cd ../server2 && npm install && cd ../server3 && npm install
cd ../../infra && npm install
cd ../frontend && npm install

# 2) انسخ ملفات البيئة
cp backend/server1/.env.example backend/server1/.env
cp backend/server2/.env.example backend/server2/.env
cp backend/server3/.env.example backend/server3/.env
cp infra/.env.example infra/.env
cp frontend/.env.local.example frontend/.env.local

# 3) شغّل كل قطعة في تيرمنال منفصل
node backend/server1/server.js     # منفذ 5001
node backend/server2/server.js     # منفذ 5002
node backend/server3/server.js     # منفذ 5003
node infra/loadBalancer.js         # منفذ 8080 (نقطة الدخول الموحدة)
node infra/worker.js               # يسحب من الطابور ويحفظ في Analytics DB
cd frontend && npm run dev         # منفذ 3000
```
افتح `http://localhost:3000`.

## 4. التشغيل بقواعد بيانات حقيقية (production)

في كل ملف `.env`:
```
DATABASE_URL_PRIMARY=postgres://user:pass@host:5432/db   # الكتابة
DATABASE_URL_READ=postgres://user:pass@read-replica:5432/db  # القراءة (2nd DB)
REDIS_URL=redis://user:pass@host:6379
JWT_SECRET=قيمة-عشوائية-طويلة-وسرية
```
شكل جداول Postgres موجود كتعليق في `backend/server1/model/url.model.js` و `user.model.js`، وجدول analytics تحتاج إنشاءه بنفس أعمدة الـ JSON event (`short_code, timestamp, country, device`).

## 5. رفع المشروع على GitHub ثم Vercel

```bash
git init
git add .
git commit -m "url shortener v1"
git branch -M main
git remote add origin https://github.com/<username>/url_short_app_v1.git
git push -u origin main
```
ثم في Vercel: **New Project → استورد الريبو**. ملف `vercel.json` في الجذر يخبر Vercel أن يبني فقط مجلد `frontend` (لأن Next.js هو الجزء الوحيد المناسب للنشر على Vercel كـ serverless).

⚠️ **ملاحظة مهمة جدًا للإنتاج**: Vercel مناسب للفرونت إند (Next.js) فقط. أما `backend/` (السيرفرات الثلاثة) و `infra/worker.js` (الذي يجب أن يبقى شغّالًا باستمرار ليسحب من الطابور) فهي عمليات state-full/long-running لا تعمل بشكل جيد على منصات serverless. الحل المعتاد للإنتاج:
- انشر الـ 3 سيرفرات + load balancer على منصة تدعم عمليات دائمة، مثل **Render / Railway / Fly.io / EC2 / a VPS + PM2 أو Docker**.
- شغّل `infra/worker.js` كـ background worker دائم على نفس المنصة.
- استخدم Postgres حقيقي (مثل Neon أو RDS) و Redis حقيقي (مثل Upstash — يدعم اتصال serverless وهو خيار ممتاز مع Vercel أيضًا لو احتجت أي API route على الفرونت تتكلم مع Redis مباشرة).
- بعد النشر، حدّث `NEXT_PUBLIC_API_URL` في إعدادات Vercel ليشير إلى رابط الـ load balancer/الباك إند المنشور (وليس localhost).

## 6. نقاط الـ API الأساسية

| Method | Path | الوصف |
|---|---|---|
| POST | /api/auth/register | إنشاء حساب |
| POST | /api/auth/login | تسجيل الدخول |
| POST | /api/auth/logout | تسجيل الخروج |
| GET  | /api/auth/me | بيانات المستخدم الحالي |
| POST | /api/url/shorten | اختصار رابط |
| GET  | /api/url/mine | روابطي (يتطلب تسجيل دخول) |
| GET  | /:code | إعادة التوجيه للرابط الأصلي |
| GET  | /api/analytics/mine | إحصائيات كل روابطي |
| GET  | /api/analytics/:code | إحصائيات رابط معيّن |

## 7. أشياء تحتاج ضبطها قبل production حقيقي

- استبدل `nanoid` الافتراضي بطول/أبجدية حسب رغبتك في `service/url.service.js`.
- أضف فحص فعلي لبلد الزائر (حاليًا مبني على header وهمي `x-country`) — استخدم خدمة IP geolocation.
- استبدل `infra/queue.js` بـ BullMQ أو RabbitMQ أو SQS عند الحاجة لضمانات تسليم أقوى (retries, dead-letter queue).
- فعّل HTTPS و `secure: true` على الكوكيز (مفعّل تلقائيًا عندما `NODE_ENV=production`).
