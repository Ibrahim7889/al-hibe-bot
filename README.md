# Al Hibe Gold Bot (Messenger + Instagram)

بوت رسائل لصفحة **ذهب الهيبة**:
- لهجة **عرب 48**.
- يقفل الأوردر **بدون دفع**: يجمع (اسم، هاتف، منطقة، نوع القطعة، العيار، المقاس، تفضيل التواصل) ويسلّمك الحالة.
- يعمل على **Render** كـ Web Service.

## المتطلبات
- Node.js 18+
- حساب Meta Developers
- صفحة فيسبوك مربوطة بإنستجرام (Professional)
- Page Access Token + Verify Token

## التشغيل المحلي
1. انسخ `.env.example` إلى `.env` وعدّل القيم.
2. `npm i`
3. `npm start`
4. استخدم ngrok لتوفير HTTPS محلي (اختياري للتجارب مع Meta).

## النشر على Render
- اختر **New Web Service**
- Repo: هذا المشروع على GitHub
- Build Command: `npm install`
- Start Command: `node server.js`
- Environment:
  - `META_VERIFY_TOKEN` (نص سري)
  - `META_PAGE_TOKEN` (من Meta)
  - `BOT_LOCALE=ar-48`
  - (اختياري) `LEAD_WEBHOOK_URL`, `LEAD_WEBHOOK_TOKEN`

## ربط Webhook في Meta
- App → Webhooks → Callback URL: `https://<your-render-app>.onrender.com/webhook`
- Verify Token = `META_VERIFY_TOKEN`
- فعّل Products: **Messenger** + **Instagram Graph API**
- اربط الصفحة (صفحة ذهب الهيبة) واعطي صلاحيات

## التدفق
welcome → product → karat → size → city → name → phone → contact_pref → confirm (→ push lead)

## تخصيص
- عدّل الردود في `i18n.js` (تقدر تضيف لهجات ثانية).
- لو بدك تخزين منظم: استخدم Postgres/Firestore بدلاً من Map.
- لإرسال صور الموديلات: استخدم Send API مع attachments (قابل للإضافة لاحقًا).

## أمان
- لا تحفظ التوكن داخل الكود. استخدم Environment فقط.
- احرص على صلاحيات Meta ومراجعة الاستخدام.
