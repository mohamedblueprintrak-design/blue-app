# تقرير التدقيق العميق - BluePrint ERP
## تاريخ التدقيق: 2026-03-04 | المُدقّق: Senior Code Auditor | المهمة: #1

---

## 1. ملف `package.json`

### ✅ ما هو جيد
- **اسم الحزمة وإصدارها** واضحان: `blueprint-erp@0.2.0`
- **`private: true`** يمنع النشر العرضي إلى npm
- **سِكربتات شاملة**: `dev`, `build`, `start`, `lint`, `test`, `test:e2e`, `db:*`
- **استخدام `--webpack`** في سكربت `dev` مع تعليق واضح يشرح سبب عدم استخدام Turbopack
- **`husky` + `lint-staged`** لفرض جودة الكود قبل الالتزام
- **`prisma generate`** في `postinstall` يضمن توليد العميل دائماً
- **`output: 'standalone'`** متوافق مع سكربت `start`
- **`overrides`** لإصلاح تعارض PostCSS

### 🔴 حرج — أخطاء ومشاكل أمنية

#### 1. تعارض إصدارات `@dnd-kit` — 🔴 حرج
```
"@dnd-kit/core": "^6.3.1",
"@dnd-kit/sortable": "^10.0.0",
"@dnd-kit/utilities": "^3.2.2",
```
**المشكلة**: `@dnd-kit/sortable@10` يتطلب `@dnd-kit/core@10+` حسب سجل npm. الإصداران غير متوافقين. الكود يستورد `DndContext` من `@dnd-kit/core` (v6 API) و `SortableContext` من `@dnd-kit/sortable` (v10 API) — هذا سيفشل في وقت التشغيل أو يسبب سلوكاً غير متوقع.
**الإصلاح**: إما ترقية `@dnd-kit/core` إلى `^10.0.0` أو خفض `@dnd-kit/sortable` إلى `^7.0.0` (المتوافق مع core@6).

#### 2. حزم runtime في devDependencies — 🔴 حرج
```
"swagger-jsdoc": "^6.3.0",     → devDependencies
"swagger-ui-react": "^5.32.6",  → devDependencies
```
**المشكلة**: هاتان الحزمتان تُستخدمان في وقت التشغيل (`src/lib/swagger.ts` و `src/app/docs/page.tsx`). وضعهما في `devDependencies` يعني أنهما لن تُثبّتا عند تشغيل `npm ci --omit=dev` في مرحلة `prod-deps` من Dockerfile، مما سيؤدي إلى **انهيار صفحة التوثيق** في الإنتاج.
**الإصلاح**: نقلهما إلى `dependencies`.

#### 3. سكربت `postinstall` يُعدّل ملفات المشروع — 🔴 حرج
```
"postinstall": "prisma generate && npx tsx scripts/postinstall-fix.ts"
```
**المشكلة**: `postinstall-fix.ts` يقرأ `next.config.ts` ويحذف أنماط `:path*` وربما يحذف دالة `headers()` بالكامل! هذا يعني أن كل `npm install` يُعيد كتابة ملف إعداد الإنتاج تلقائياً، مما قد **يزيل رؤوس الأمان** بدون أي تحذير.
**الإصلاح**: يجب إزالة هذا السكربت تماماً. مشكلة Turbopack يجب أن تُعالج بطريقة أخرى (مثل إصلاح القوالب في الكود نفسه أو استخدام `--webpack` كما هو حالياً).

### 🟡 تحذيرات

#### 4. وجود ملفين lock مختلفين — 🟡 تحذير
```
bun.lock + package-lock.json
```
**المشكلة**: وجود `bun.lock` و `package-lock.json` معاً يشير إلى عدم اتساق في مدير الحزم المستخدم. Dockerfile يستخدم `npm ci` بينما `bun.lock` يُولّد بـ Bun.
**الإصلاح**: اختيار مدير حزم واحد وحذف ملف lock الآخر. إضافة `bun.lock` إلى `.gitignore` إذا كان npm هو المعتمد.

#### 5. `bun-types` في devDependencies بلا داعٍ — 🟡 تحذير
```
"bun-types": "^1.3.4"
```
**المشكلة**: المشروع يستخدم npm (كما هو واضح من Dockerfile و package-lock.json) وليس Bun runtime. هذه الحزمة غير ضرورية وقد تُضلل المطورين.
**الإصلاح**: إزالتها ما لم يكن هناك سبب محدد.

#### 6. `z-ai-web-dev-sdk` في production dependencies — 🟡 تحذير
```
"z-ai-web-dev-sdk": "^0.0.17"
```
**المشكلة**: إصدار `0.0.x` يشير إلى حزمة غير مستقرة. بالإضافة إلى أنها مُدرجة في `serverExternalPackages` في next.config.ts. يجب التأكد من أن هذه الحزمة ضرورية للإنتاج.
**الإصلاح**: مراجعة الضرورة وإضافة تعليق يشرح سبب تضمينها.

#### 7. `zod@^4.0.2` — إصدار رئيسي جديد — 🟡 تحذير
**المشكلة**: Zod v4 فيه تغييرات جوهرية عن v3 (API مختلف). يجب التأكد من أن الكود متوافق.
**الإصلاح**: مراجعة استخدامات Zod في الكود والتأكد من التوافق مع v4.

### 🟢 ملاحظات

- **`NEXT_PUBLIC_APP_NAME`** مُعرّف في `next.config.ts` لكنه **غير موجود** في `.env.example`
- **`ts-jest@^29.4.9`** مع `jest@^30.3.0` — إصدارات غير متطابقة رئيسياً، قد يكون هناك عدم توافق
- **لا يوجد `engines` field** لتحديد إصدارات Node.js المطلوبة

---

## 2. ملف `next.config.ts`

### ✅ ما هو جيد
- **`poweredByHeader: false`** — يزيل رأس `X-Powered-By` المعرّف للتقنية
- **`reactStrictMode: true`** — يُفعّل الوضع الصارم لـ React
- **`ignoreBuildErrors: false`** — لا يتجاهل أخطاء TypeScript أثناء البناء
- **رؤوس أمان ممتازة**: `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Referrer-Policy`, `HSTS`, `Permissions-Policy`, `X-DNS-Prefetch-Control`
- **تعليق واضح** يشرح لماذا لا يوجد CSP ثابت (يتم إنشاؤه بـ nonces في proxy.ts)
- **`optimizePackageImports`** شامل جداً لتقليل حجم الحزم
- **`serverExternalPackages`** مُعدّ بشكل صحيح — `jose` مُستبعد عمداً ليعمل في Edge Runtime
- **إعدادات الصور** صحيحة مع دعم AVIF و WebP
- **تكامل Sentry مشروط** — لا يفشل البناء إذا لم تكن الحزمة مثبتة
- **Sourcemaps معطلة** في Sentry لإنتاج — قرار أمني سليم

### 🔴 حرج

#### 1. `postinstall-fix.ts` قد يحذف رؤوس الأمان — 🔴 حرج (مُفصّل في قسم package.json)
السكربت يبحث عن `async headers()` في next.config.ts ويحذفها بالكامل إذا وجد أنماط `:path*`. حالياً الرأس `source: '/(.*)'` لا يحتوي على `:path*`، لكن إذا غيّر أي مطور المصدر إلى نمط يحتوي `:path*`، سيُحذف **كل** رؤوس الأمان في المرة القادمة التي يُشغّل فيها `npm install`.

### 🟡 تحذيرات

#### 2. تعرّض `NEXT_PUBLIC_APP_URL` الافتراضي — 🟡 تحذير
```typescript
NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
```
**المشكلة**: في الإنتاج، إذا لم يُعيّن المتغير، سيكون الرابط `http://localhost:3000` مما قد يُكسر روابط البريد الإلكتروني و CORS.
**الإصلاح**: إزالة القيمة الافتراضية أو جعلها مطلوبة في الإنتاج.

#### 3. `remotePatterns` للصور غير مكتمل — 🟡 تحذير
```typescript
remotePatterns: [
  { protocol: 'https', hostname: 'avatars.githubusercontent.com' },
  { protocol: 'https', hostname: 'lh3.googleusercontent.com' },
  { protocol: 'https', hostname: '*.stripe.com' },
]
```
**المشكلة**: لا يوجد نمط لـ S3/MinIO. إذا كان `STORAGE_TYPE=s3`، ستفشل تحسين الصور للصور المرفوعة.
**الإصلاح**: إضافة `{ protocol: 'https', hostname: process.env.S3_ENDPOINT }` ديناميكياً.

### 🟢 مفقود

- **رأس `Cross-Origin-Opener-Policy`** — مطلوب للحماية من هجمات Spectre
- **رأس `Cross-Origin-Embedder-Policy`** — لتحسين أمان العزل
- **رأس `X-Request-ID`** — مفيد للتتبع

---

## 3. ملف `tsconfig.json`

### ✅ ما هو جيد
- **`strict: true`** — يُفعّل كل خيارات الصرامة
- **`noImplicitAny: true`** — يمنع `any` الضمني
- **`moduleResolution: "bundler"`** — الإعداد الصحيح لـ Next.js 16
- **`isolatedModules: true`** — مطلوب لـ Next.js
- **مسار alias `@/*`** مُعدّ بشكل صحيح
- **`skipLibCheck: true`** — يُسرّع البناء
- **استبعاد `skills` و `mini-services`** — قرار سليم

### 🟡 تحذيرات

#### 1. `target: "ES2017"` قديم — 🟡 تحذير
**المشكلة**: ES2017 لا يدعم Optional Chaining (`?.`) ولا Nullish Coalescing (`??`) على مستوى الهدف. رغم أن Next.js يستخدم SWC ويتجاهل هذا الإعداد عملياً، إلا أنه قد يُضلل المطورين أو يسبب مشاكل مع أدوات أخرى (مثل Jest).
**الإصلاح**: تغيير إلى `"ES2022"` أو `"ESNext"` بما أن المشروع يستهدف متصفحات حديثة وخوادم Node.js 20.

#### 2. `jsx: "react-jsx"` بدلاً من `"preserve"` — 🟡 تحذير
**المشكلة**: Next.js يوصي بـ `"jsx": "preserve"` لأن SWC يتعامل مع تحويل JSX. `"react-jsx"` قد يتداخل.
**الإصلاح**: تغيير إلى `"preserve"` (Next.js يُعدّه تلقائياً عند `create-next-app`).

### 🟢 مفقود (خيارات أمان إضافية يُوصى بها)

- **`noUncheckedIndexedAccess: true`** — يضيف `undefined` للوصول بالفهرس
- **`noImplicitReturns: true`** — يتطلب `return` صريح في كل المسارات
- **`forceConsistentCasingInFileNames: true`** — يمنع مشاكل أنظمة الملفات (Windows vs Linux)
- **`exactOptionalPropertyTypes: true`** — صرامة أكبر في الخيارات الاختيارية

---

## 4. ملف `tailwind.config.ts`

### ✅ ما هو جيد
- **`darkMode: "class"`** — الإعداد الصحيح لدعم الوضع الداكن
- **خط عربي مُعرّف**: `'arabic'` مع IBM Plex Arabic و Noto Sans Arabic
- **ألوان الحالة الدلالية**: `success`, `warning`, `info` — ممتاز لنظام ERP
- **`borderRadius` مُتغير** — يسمح بتغيير الحدود من مكان واحد
- **أنيميشن مُخصصة** — shimmer, pulse-subtle, slide-in
- **`zIndex` scale** — يمنع تعارض z-index بين المكونات
- **ألوان مخططات 8** — كافية لمعظم الرسوم البيانية

### 🟡 تحذيرات

#### 1. لا يوجد دعم RTL حقيقي — 🟡 تحذير
**المشكلة**: رغم وجود خط عربي، لا يوجد إعداد RTL في Tailwind. المكونات لن تنعكس تلقائياً للعربية (مثل: `ml-` يجب أن تصبح `mr-` في RTL).
**الإصلاح**:
- تثبيت `tailwindcss-rtl` أو استخدام خصائص logical: `ms-`, `me-`, `ps-`, `pe-` (مدعومة في Tailwind v4)
- إضافة `<html dir="rtl">` ديناميكياً في layout.tsx
- استبدال `ml-`/`mr-` بـ `ms-`/`me-` و `pl-`/`pr-` بـ `ps-`/`pe-`

#### 2. تعارض محتمل بين `tailwindcss-animate` و `tw-animate-css` — 🟡 تحذير
```
package.json:
  dependencies: "tailwindcss-animate": "^1.0.7"
  devDependencies: "tw-animate-css": "^1.3.5"
```
**المشكلة**: حزمتان مختلفتان للأنيميشن. `tw-animate-css` هو البديل الجديد لـ Tailwind v4، لكن `tailwindcss-animate` (v1) لا يزال مُستخدماً في `plugins` في ملف الإعداد. هذا قد يسبب تعارضات.
**الإصلاح**: اختيار واحدة فقط. لـ Tailwind v4، يُفضّل `tw-animate-css` مع إزالة `tailwindcss-animate` من dependencies و plugins.

#### 3. مسارات `content` مُتكررة — 🟢 ملاحظة
```typescript
content: [
  "./src/app/**/*.{js,ts,jsx,tsx,mdx}",      // src/app
  "./src/components/**/*.{js,ts,jsx,tsx,mdx}", // src/components
  "./pages/**/*.{js,ts,jsx,tsx,mdx}",         // pages/ (قديم)
  "./components/**/*.{js,ts,jsx,tsx,mdx}",    // components/ (قديم)
  "./app/**/*.{js,ts,jsx,tsx,mdx}",           // app/ (قديم)
],
```
**المشكلة**: المسارات `./pages/**`, `./components/**`, `./app/**` تشير إلى بنية قديمة (Pages Router) لا تُستخدم في هذا المشروع (الذي يستخدم App Router مع `src/`).
**الإصلاح**: إزالة المسارات غير المستخدمة لتحسين أداء البناء.

---

## 5. ملف `eslint.config.mjs`

### ✅ ما هو جيد
- **استخدام Flat Config** (التنسيق الجديد لـ ESLint 9) — حديث
- **`nextCoreWebVitals` + `nextTypescript`** — إعدادات Next.js الرسمية
- **`@typescript-eslint/no-unused-vars`** مع نمط تجاهل `_` — ممتاز
- **`no-unreachable: "error"`** — يكتشف الكود الميت
- **`no-console`** مع استثناءات `warn`, `error`, `info` — عملي
- **قائمة `ignores`** شاملة

### 🟡 تحذيرات

#### 1. `@typescript-eslint/no-explicit-any: "warn"` بدلاً من `"error"` — 🟡 تحذير
**المشكلة**: في نظام ERP، استخدام `any` يُزيل فائدة TypeScript تماماً. يجب أن يكون `"error"` على الأقل في CI/CD.
**الإصلاح**: تغيير إلى `"error"` أو إضافة قاعدة منفصلة لـ CI تكون `"error"`.

#### 2. `@typescript-eslint/no-non-null-assertion: "off"` — 🟡 تحذير
**المشكلة**: إيقاف هذه القاعدة يسمح باستخدام `!` الذي قد يسبب أخطاء وقت التشغيل.
**الإصلاح**: تغيير إلى `"warn"` على الأقل.

#### 3. `react-hooks/purity: "off"` — 🟡 تحذير
**المشكلة**: هذه القاعدة تحمي من الآثار الجانبية في المكونات. إيقافها يُضعف حماية React Compiler.
**الإصلاح**: تفعيلها إذا كان React Compiler مُستخدماً.

### 🟢 مفقود

- **`eslint-plugin-security`** — يكتشف أنماط الكود غير الآمنة (مثل: `eval`, `innerHTML`)
- **`eslint-plugin-jsx-a11y`** — قواعد إمكانية الوصول (مطلوبة في كثير من الدول)
- **قواعد ترتيب الاستيراد** — مثل `eslint-plugin-import` أو `simple-import-sort`
- **`no-constant-binary-expression`** — يكتشف تعبيرات مثل `a ?? b ?? c` الخاطئة
- **`@typescript-eslint/consistent-type-imports`** — يُنفّض بين `import type` و `import`

---

## 6. ملف `postcss.config.mjs`

### ✅ ما هو جيد
- **بسيط وصحيح** — يستخدم `@tailwindcss/postcss` (الإعداد الصحيح لـ Tailwind v4)
- **`export default`** — ESM متوافق

### 🟢 مفقود
- لا يوجد شيء مفقود. هذا هو الإعداد المثالي لـ Tailwind v4.

---

## 7. ملف `components.json`

### ✅ ما هو جيد
- **`$schema`** مُعرّف — يُفعّل الإكمال التلقائي في IDE
- **`style: "new-york"`** — تصميم حديث
- **`rsc: true`** — يدعم React Server Components
- **`tsx: true`** — TypeScript مُفعّل
- **`cssVariables: true`** — يسمح بالتخصيص عبر CSS
- **`aliases`** متوافقة مع `tsconfig.json` paths
- **`iconLibrary: "lucide"`** — متوافق مع `lucide-react` في package.json

### 🟢 مفقود
- لا شيء. الإعداد مثالي لـ shadcn/ui.

---

## 8. ملف `.env.example`

### ✅ ما هو جيد
- **تنظيم ممتاز** مع أقسام واضحة وتعليقات
- **تعليمات أمان** واضحة (لا تلتزم .env!)
- **متغيرات الأمان** موجودة: `JWT_SECRET`, `ENCRYPTION_KEY`, `CSRF_SECRET`, `CRON_SECRET`
- **قيم افتراضية معقولة** للإعداد المحلي
- **أوضح الفرق** بين SQLite (تطوير) و PostgreSQL (إنتاج)

### 🔴 حرج

#### 1. `NEXT_PUBLIC_APP_NAME` مفقود — 🔴 حرج
**المشكلة**: `next.config.ts` يستخدم `NEXT_PUBLIC_APP_NAME` لكنه غير موجود في `.env.example`. هذا يعني أن المطورين لن يعرفوا أنهم بحاجة لتعيينه.
**الإصلاح**: إضافة:
```
# Application name (displayed in browser tab, emails, etc.)
NEXT_PUBLIC_APP_NAME=BluePrint ERP
```

#### 2. `SENTRY_ORG` و `SENTRY_PROJECT` مفقودان — 🔴 حرج
**المشكلة**: `next.config.ts` يستخدم `process.env.SENTRY_ORG` و `process.env.SENTRY_PROJECT` لكنهما غير موجودين في `.env.example`.
**الإصلاح**: إضافة:
```
# Sentry organization slug
SENTRY_ORG=
# Sentry project slug
SENTRY_PROJECT=
```

### 🟡 تحذيرات

#### 3. كلمة مرور Redis الافتراضية ضعيفة — 🟡 تحذير
```
REDIS_PASSWORD=dev_redis_password
```
**المشكلة**: حتى في التطوير، كلمة مرور افتراضية يمكن تخمينها بسهولة.
**الإصلاح**: تغيير إلى `<generate-a-strong-password>` مثل `DATABASE_PASSWORD`.

#### 4. `SMTP_PASSWORD` بدون توضيح — 🟡 تحذير
```
SMTP_PASSWORD=
```
**المشكلة**: يجب أن يكون `<app-password>` مع رابط لتعليمات Google App Passwords.

#### 5. `NODE_ENV=development` في .env.example — 🟡 تحذير
**المشكلة**: وضع `NODE_ENV` في `.env.example` قد يُسبب مشاكل إذا نُسخ إلى `.env.production`.
**الإصلاح**: إزالته وتركه لإطار العمل أو Docker.

### 🟢 مفقود
- **`.env.test`** — ملف بيئة اختبار منفصل
- **`NEXT_PUBLIC_GA_ID`** — إذا كان Google Analytics مُستخدماً
- **شرح واضح** لكل متغير `NEXT_PUBLIC_*` أنه يُعرّض للمتصفح

---

## 9. ملف `.gitignore`

### ✅ ما هو جيد
- **ملفات .env** مُتجاهلة بشكل شامل: `.env`, `.env.local`, `.env.production`, `.env.*.local`
- **قاعدة البيانات** مُتجاهلة: `db/*.db`, `prisma/db/`
- **مجلدات الذكاء الاصطناعي** مُتجاهلة: `skills/`, `.claude`, `.z-ai-config`
- **السجلات** مُتجاهلة: `*.log`, `logs/`
- **ملفات النظام** مُتجاهلة: `.DS_Store`
- **Playwright** مُتجاهل: `playwright-report/`, `test-results/`

### 🔴 حرج

#### 1. `*.pem` يتجاهل كل شهادات SSL — 🔴 حرج
```
*.pem
```
**المشكلة**: هذا النمط يتجاهل **كل** ملفات `.pma` بما فيها شهادات SSL المطلوبة للإنتاج (مثل `certbot/conf/live/`). قد يمنع تجديد شهادات Let's Encrypt.
**الإصلاح**: تغيير إلى نمط أكثر تحديداً:
```
# SSL certificates (private keys only, not full chain)
*.key.pem
*.priv.pem
# Keep public certs trackable
!*.cert.pem
!*.chain.pem
!certbot/
```

### 🟡 تحذيرات

#### 2. نمط `test` واسع جداً — 🟡 تحذير
```
test
```
(السطر 52)
**المشكلة**: هذا النمط سيتجاهل أي ملف أو مجلد اسمه `test`، بما فيها ملفات اختبار مشروعة.
**الإصلاح**: تغيير إلى `/test` أو `/test-results/` (الموجود بالفعل في السطر 69).

#### 3. نمط `prompt` غامض — 🟡 تحذير
```
prompt
```
(السطر 53)
**المشكلة**: يتجاهل أي ملف اسمه `prompt` بدون سياق واضح.
**الإصلاح**: تغيير إلى `prompts/` أو إضافة تعليق.

#### 4. مفقود: `.env.staging` — 🟡 تحذير
**المشكلة**: `.env.production` مُتجاهل لكن `.env.staging` ليس كذلك.
**الإصلاح**: إضافة `.env.staging`.

### 🟢 مفقود
- **`.dockerignore`** — غير موجود! (مهم جداً لـ Docker)
- **`.eslintcache`** — يجب تجاهله
- **`.stylelintcache`** — إذا كان Stylelint مُستخدماً
- **`*.tgz`** — ملفات الحزم المضغوطة
- **`.claude/`** موجود لكن يجب التأكد من أنه لا يحتوي على بيانات حساسة

---

## 10. ملف `Dockerfile` (الإنتاج)

### ✅ ما هو جيد
- **بناء متعدد المراحل** (4 مراحل) — ممتاز لتقليل حجم الصورة
- **مستخدم غير root** (`nextjs:nodejs`, uid 1001)
- **فحص صحة** (`HEALTHCHECK`) مع `/api/health`
- **`NEXT_TELEMETRY_DISABLED=1`** — يمنع إرسال بيانات الاستخدام
- **عدم تمرير أسرار** عبر ARG/ENV أثناء البناء — قرار أمني سليم
- **`npm cache clean --force`** — يقلل حجم الصورة
- **نسخة standalone** فقط — حجم صورة صغير

### 🔴 حرج

#### 1. `DATABASE_URL` placeholder مُضمّن في طبقة الصورة — 🔴 حرج
```dockerfile
ENV DATABASE_URL=postgresql://placeholder:placeholder@localhost:5432/placeholder
```
**المشكلة**: رغم أن القيمة placeholder، إلا أنها تُصبح جزءاً من طبقة الصورة. هذا يُظهر اسم المستخدم وكلمة المرور (حتى لو وهميين) واسم قاعدة البيانات. في أنظمة ERP، حتى البيانات الوهمية قد تُعطي معلومات عن البنية.
**الإصلاح**: استخدام `ARG` بدلاً من `ENV` أو تعيين قيمة فارغة وتمريرها في وقت التشغيل فقط:
```dockerfile
ARG DATABASE_URL=""
ENV DATABASE_URL=${DATABASE_URL}
```

### 🟡 تحذيرات

#### 2. لا يوجد `.dockerignore` — 🟡 تحذير (حرج عملياً)
**المشكلة**: بدون `.dockerignore`، سيُنسخ `node_modules`، `.next`، `skills/`، `bun.lock`، وكل شيء آخر إلى سياق البناء. هذا يُبطئ البناء بشكل كبير ويزيد حجم السياق.
**الإصلاح**: إنشاء `.dockerignore`:
```
node_modules
.next
.git
skills
*.md
.env*
docker-compose*.yml
Dockerfile*
coverage
test-results
```

#### 3. لا يوجد تثبيت لإصدارات حزم Alpine — 🟡 تحذير
```dockerfile
RUN apk add --no-cache libc6-compat openssl
```
**المشكلة**: بدون تحديد إصدارات، قد تختلف الحزم بين عمليات البناء.
**الإصلاح**: ليس حرجاً لـ Alpine لكن يجب مراعاته.

#### 4. فحص الصحة يستخدم `wget` — 🟡 تحذير
```dockerfile
HEALTHCHECK ... CMD wget --no-verbose --tries=1 --spider http://localhost:3000/api/health || exit 1
```
**المشكلة**: `wget` غير مُثبت افتراضياً في `node:20-alpine`. قد يفشل الفحص.
**الإصلاح**: إما تثبيت `wget` في مرحلة runner أو استخدام `curl` أو Node.js:
```dockerfile
HEALTHCHECK ... CMD node -e "require('http').get('http://localhost:3000/api/health', r => process.exit(r.statusCode === 200 ? 0 : 1))"
```

---

## 10b. ملف `Dockerfile.dev`

### ✅ ما هو جيد
- **مستخدم غير root** (`nextjs:nodejs`)
- **إنشاء مجلدات ضرورية** (`db`, `uploads`)

### 🟡 تحذيرات

#### 1. لا يوجد فحص صحة — 🟡 تحذير
**المشكلة**: على عكس Dockerfile الإنتاجي، لا يوجد `HEALTHCHECK`.
**الإصلاح**: إضافة:
```dockerfile
HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:3000/api/health || exit 1
```

#### 2. نسخ كل الكود قبل إنشاء المستخدم — 🟡 تحذير
```dockerfile
COPY . .                    # يُنسخ كroot
RUN mkdir -p ... && adduser # يُنشأ المستخدم بعد النسخ
USER nextjs                 # التبديل بعد فوات الأوان
```
**المشكلة**: الملفات المنسوخة تكون مملوكة لـ root. يجب `chown` صريح.
**الإصلاح**: إضافة `RUN chown -R nextjs:nodejs /app` قبل `USER nextjs`.

---

## 11. ملف `docker-compose.yml` (التطوير)

### ✅ ما هو جيد
- **التحقق من المتغيرات المطلوبة**: `${DATABASE_PASSWORD:?...}` و `${REDIS_PASSWORD:?...}`
- **ربط منافذ بـ 127.0.0.1 فقط** لـ PostgreSQL و Redis
- **حدود موارد** لكل خدمة
- **دوران السجلات** (`max-size`, `max-file`)
- **فحوصات صحة** مع `condition: service_healthy`
- **شبكة معزولة** `blueprint-network`
- **nginx + certbot** في `profiles: [production]` — لا يعملان في التطوير

### 🟡 تحذيرات

#### 1. كلمة مرور Redis الافتراضية في healthcheck — 🟡 تحذير
```yaml
command: >
  redis-server
  --requirepass ${REDIS_PASSWORD:-dev_redis_password}
healthcheck:
  test: ["CMD-SHELL", "REDISCLI_AUTH=$${REDIS_PASSWORD:-dev_redis_password} redis-cli ping"]
```
**المشكلة**: كلمة المرور الافتراضية `dev_redis_password` مُكررة في مكانين. إذا تغيرت، يجب تحديثها في كليهما.
**الإصلاح**: استخدام متغير بيئة Redis الرسمي:
```yaml
redis:
  environment:
    REDISCLI_AUTH: ${REDIS_PASSWORD:-dev_redis_password}
  command: >
    redis-server
    --requirepass ${REDIS_PASSWORD:-dev_redis_password}
  healthcheck:
    test: ["CMD-SHELL", "redis-cli ping"]
```

#### 2. تحميل المجلد الجذري `.` — 🟡 تحذير
```yaml
volumes:
  - .:/app
  - /app/node_modules
```
**المشكلة**: تحميل مجلد المشروع بالكامل يعني أن التغييرات في الملفات المحلية تُنعكس فوراً (مرغوب للتطوير)، لكنه قد يُسبب مشاكل مع `node_modules` إذا كانت مختلفة بين المضيف والحاوية.
**الإصلاح**: هذا نمط شائع للتطوير، لكن يجب توثيقه بتعليق.

---

## 11b. ملف `docker-compose.prod.yml`

### ✅ ما هو جيد
- **لا منافذ مكشوفة** لـ PostgreSQL و Redis — أمان ممتاز
- **`security_opt: no-new-privileges:true`** لكل خدمة
- **`cap_drop: ALL` + `cap_add` محدد** للتطبيق
- **فحص صحة** لكل خدمة
- **فحص صحة nginx** مع `nginx -t`
- **الاعتماد على فحص الصحة** (`condition: service_healthy`)
- **شهادات SSL** مع certbot للتجديد التلقائي

### 🔴 حرج

#### 1. `read_only: false` في خدمة التطبيق — 🔴 حرج
```yaml
app:
  read_only: false
```
**المشكلة**: في الإنتاج، يجب أن يكون نظام الملفات للقراءة فقط قدر الإمكان. `read_only: false` يسمح بالكتابة في أي مكان، مما يُسهّل الهجمات.
**الإصلاح**: تغيير إلى `read_only: true` مع إضافة `tmpfs`:
```yaml
app:
  read_only: true
  tmpfs:
    - /tmp
    - /app/.next/cache
```

#### 2. `internal: false` في الشبكة — 🔴 حرج
```yaml
networks:
  blueprint-network:
    driver: bridge
    internal: false  # Allow external access only through nginx
```
**المشكلة**: `internal: false` يسمح للحاويات بالوصول إلى الإنترنت مباشرة. إذا خُترقت حاوية، يمكنها الاتصال بخوادم خارجية (exfiltration).
**الإصلاح**: تغيير إلى `internal: true`. فقط nginx يحتاج وصولاً خارجياً (مُعرّض عبر المنافذ 80/443).

#### 3. لا يوجد تحقق من المتغيرات المطلوبة — 🔴 حرج
```yaml
# الإنتاج
- DATABASE_URL=postgresql://blueprint:${DATABASE_PASSWORD}@postgres:5432/blueprint
# مقابل التطوير
- DATABASE_URL=postgresql://blueprint:${DATABASE_PASSWORD:?DATABASE_PASSWORD must be set}@postgres:5432/blueprint
```
**المشكلة**: في الإنتاج، إذا نُسي `DATABASE_PASSWORD`، سيفشل الاتصال بصمت أو يستخدم قيمة فارغة. التحقق `:?` الموجود في docker-compose.yml (التطوير) **غير موجود** هنا!
**الإصلاح**: إضافة `:?` لكل متغير مطلوب:
```yaml
- DATABASE_URL=postgresql://blueprint:${DATABASE_PASSWORD:?DATABASE_PASSWORD must be set}@postgres:5432/blueprint
- JWT_SECRET=${JWT_SECRET:?JWT_SECRET must be set}
- ENCRYPTION_KEY=${ENCRYPTION_KEY:?ENCRYPTION_KEY must be set}
- REDIS_URL=redis://:${REDIS_PASSWORD:?REDIS_PASSWORD must be set}@redis:6379
```

### 🟡 تحذيرات

#### 4. Redis healthcheck لا يستخدم `REDISCLI_AUTH` بشكل صحيح — 🟡 تحذير
```yaml
test: ["CMD-SHELL", "REDISCLI_AUTH=\"$$REDIS_PASSWORD\" redis-cli ping"]
```
**المشكلة**: `$$REDIS_PASSWORD` يُشير إلى متغير بيئة الحاوية `REDIS_PASSWORD`، لكن هذا المتغير **غير مُعرّف** في قسم `environment` لخدمة Redis! يجب تمريره صراحةً.
**الإصلاح**: إضافة `REDIS_PASSWORD` إلى بيئة Redis:
```yaml
redis:
  environment:
    REDIS_PASSWORD: ${REDIS_PASSWORD}
```

#### 5. `postgres:16-alpine` بدون تحديثات أمنية — 🟡 تحذير
**المشكلة**: بدون `apt-get upgrade` أو تحديد إصدار patch، قد تكون هناك ثغرات أمنية معروفة.
**الإصلاح**: تحديد إصدار patch: `postgres:16.8-alpine` (أو أحدث).

#### 6. certbot بدون `profiles: [production]` — 🟡 تحذير
**المشكلة**: في docker-compose.yml (التطوير)، certbot كان في `profiles: [production]`. هنا في الإنتاج، يعمل دائماً. هذا صحيح، لكن شهادات SSL غير موجودة مبدئياً ستُسبب فشل nginx.
**الإصلاح**: إضافة فحص صحة أو تأخير بدء لـ nginx حتى تكون الشهادات جاهزة.

---

## ملخص الأولويات

### 🔴 حرج — يجب إصلاحه فوراً (7 مشاكل)
| # | الملف | المشكلة |
|---|-------|---------|
| 1 | package.json | تعارض إصدارات `@dnd-kit` (core@6 vs sortable@10) |
| 2 | package.json | `swagger-jsdoc` و `swagger-ui-react` في devDependencies |
| 3 | package.json | `postinstall-fix.ts` يُعدّل `next.config.ts` تلقائياً |
| 4 | .env.example | `NEXT_PUBLIC_APP_NAME` و `SENTRY_ORG/PROJECT` مفقودة |
| 5 | Dockerfile | `DATABASE_URL` placeholder مُضمّن في طبقة الصورة |
| 6 | docker-compose.prod.yml | `read_only: false` + `internal: false` |
| 7 | docker-compose.prod.yml | لا تحقق من المتغيرات المطلوبة (بدون `:?`) |

### 🟡 تحذير — يجب إصلاحه قريباً (15 مشكلة)
| # | الملف | المشكلة |
|---|-------|---------|
| 1 | package.json | ملفان lock مختلفان (bun.lock + package-lock.json) |
| 2 | package.json | `bun-types` بلا داعٍ |
| 3 | package.json | `z-ai-web-dev-sdk@0.0.x` غير مستقر |
| 4 | next.config.ts | `NEXT_PUBLIC_APP_URL` افتراضي خطر في الإنتاج |
| 5 | next.config.ts | `remotePatterns` لا يشمل S3 |
| 6 | tsconfig.json | `target: ES2017` قديم |
| 7 | tailwind.config.ts | لا دعم RTL حقيقي |
| 8 | tailwind.config.ts | تعارض `tailwindcss-animate` vs `tw-animate-css` |
| 9 | eslint.config.mjs | `no-explicit-any: warn` بدلاً من `error` |
| 10 | .env.example | `REDIS_PASSWORD` ضعيف + `NODE_ENV` |
| 11 | .gitignore | `*.pem` يتجاهل شهادات SSL |
| 12 | .gitignore | نمط `test` واسع جداً |
| 13 | Dockerfile.dev | لا فحص صحة |
| 14 | docker-compose.prod.yml | `REDIS_PASSWORD` غير مُمرر لبيئة Redis |
| 15 | Dockerfile | لا `.dockerignore` |

### 🟢 مفقود — يُوصى بإضافته (8 عناصر)
| # | العنصر | التفاصيل |
|---|--------|----------|
| 1 | `.dockerignore` | مطلوب لتحسين بناء Docker |
| 2 | رؤوس أمان إضافية | `Cross-Origin-Opener-Policy`, `Cross-Origin-Embedder-Policy` |
| 3 | قواعد ESLint | `eslint-plugin-security`, `eslint-plugin-jsx-a11y` |
| 4 | خيارات TypeScript | `noUncheckedIndexedAccess`, `noImplicitReturns` |
| 5 | `.env.test` | بيئة اختبار منفصلة |
| 6 | `engines` في package.json | تحديد إصدار Node.js المطلوب |
| 7 | دعم RTL | استخدام `ms-`/`me-` بدلاً من `ml-`/`mr-` |
| 8 | ترتيب الاستيراد | `eslint-plugin-import` أو `simple-import-sort` |

---

## التوصيات الرئيسية

1. **إصلاح تعارض `@dnd-kit` فوراً** — هذا سيُسبب أخطاء وقت التشغيل
2. **حذف `postinstall-fix.ts`** — لا يجب أن يُعدّل سكربت ملفات الإعداد تلقائياً
3. **نقل swagger إلى dependencies** — مطلوب في وقت التشغيل
4. **إنشاء `.dockerignore`** — ضروري لأداء وأمان Docker
5. **إصلاح docker-compose.prod.yml** — `internal: true`, `read_only: true`, تحقق المتغيرات
6. **توحيد مدير الحزم** — إما npm أو Bun، ليس كلاهما
7. **إضافة دعم RTL** — ضروري لنظام ERP عربي

---

*انتهى التدقيق — تم فحص 11 ملف إعداد سطراً بسطر*

---

# تقرير التدقيق الأمني العميق — المصادقة والتفويض
## تاريخ التدقيق: 2026-03-05 | المُدقّق: Senior Security Auditor | المهمة: #3
## النظام: BluePrint ERP | النطاق: Auth & Security (27 ملف)

---

## نظرة عامة

| المعيار | القيمة |
|---------|--------|
| إجمالي الملفات المُدققة | **27 ملف** |
| إجمالي الأسطر المفحوصة | **~5,500+ سطر** |
| الثغرات الحرجة (🔴) | **4** |
| التحذيرات (🟡) | **18** |
| الملاحظات الإيجابية (🟢) | **12** |

---

## 🔴 الثغرات الحرجة (Critical)

### 🔴 1. تزوير رؤوس الهوية — Header Forgery في `getAuthContext()`
**الملف**: `src/app/api/utils/auth.ts` (سطر 51-69)

```typescript
export function getAuthContext(request: NextRequest): AuthContext | null {
  const userId = request.headers.get('x-user-id');
  const email = request.headers.get('x-user-email');
  const role = request.headers.get('x-user-role');
  // ...
}
```

**المشكلة**: هذه الدالة تقرأ هوية المستخدم من رؤوس HTTP (`x-user-id`, `x-user-email`, `x-user-role`) يضعها الـ middleware/proxy بعد التحقق من JWT. لكن إذا تم تجاوز الـ proxy (مثلاً: وصول مباشر لمنفذ Node.js)، يمكن لمهاجم **تزوير هذه الرؤوس وانتحال هوية أي مستخدم**.

**التأثير**: الدوال التالية تعتمد كلياً على `getAuthContext()` **بدون إعادة التحقق من JWT**:
- `requireAuthContext()` (سطر 80)
- `requirePermission()` (سطر 266)
- `requireAdmin()` (سطر 283)
- `requireFinancialAccess()` (سطر 299)
- `requireHRAccess()` (سطر 315)

**التخفيف الموجود**: `requireVerifiedAuth()` (سطر 356) يعيد التحقق من JWT ويتطابق مع الرؤوس، لكنه **غير مُستخدم في معظم المسارات العادية**.

**الإصلاح المُقترح**:
1. جعل `requireVerifiedAuth()` هو الإعداد الافتراضي لجميع مسارات API
2. استخدام `requireAuthContext()` فقط للمسارات غير الحرجة مع تعليق يشرح السبب
3. التحقق من أن الـ proxy يزيل أي رؤوس `x-user-*` واردة من العميل

---

### 🔴 2. تسريب وجود البريد الإلكتروني في التسجيل — Email Enumeration
**الملف**: `src/app/api/auth/register/route.ts` (سطر 186)

```typescript
if (existingEmail) {
  return errorResponse('البريد الإلكتروني مسجل مسبقاً', 'EMAIL_EXISTS', 400);
}
```

**المشكلة**: عند تسجيل حساب جديد، إذا كان البريد الإلكتروني مسجلاً مسبقاً، يُرجع الخادم رسالة صريحة "البريد الإلكتروني مسجل مسبقاً" مع رمز `EMAIL_EXISTS`. هذا يُمكّن المهاجم من **بناء قائمة بجميع البريدات المسجلة** في النظام عبر أتمتة طلبات التسجيل.

**التناقض**: مسار `forgot-password/route.ts` يُعالج هذا بشكل صحيح:
```typescript
if (!user) {
  // Don't reveal if user exists or not
  return NextResponse.json({ success: true });
}
```

**الإصلاح المُقترح**: إرجاع رسالة عامة مثل: "إذا كان هذا البريد غير مسجل، تم إنشاء حساب جديد. إذا كان مسجلاً، يرجى تسجيل الدخول." أو إرسال بريد إلكتروني للبريد المسجل مسبقاً يُعلمه بمحاولة التسجيل.

---

### 🔴 3. عدم التحقق من `passwordChangedAt` في مسارات session/me — Token Invalidation Gap
**الملف**: `src/app/api/auth/session/route.ts` (سطر 22-25) و `src/app/api/auth/me/route.ts` (سطر 30-33)

```typescript
const { payload } = await jwtVerify(tokenCookie.value, getJwtSecretBytes(), {
  issuer: 'blueprint-saas',
  audience: 'blueprint-users',
});
// ← لا يوجد تحقق من passwordChangedAt مقابل iat!
```

**المشكلة**: عند تغيير كلمة المرور، يُحدّث `passwordChangedAt` في قاعدة البيانات ويُدرج في JWT كـ claim. لكن مسارات `session` و `me` لا تتحقق مما إذا كان قد تم تغيير كلمة المرور بعد إصدار الرمز. هذا يعني أن **رمز الوصول القديم يظل صالحاً لمدة 15 دقيقة** بعد تغيير كلمة المرور.

**التخفيف الموجود**: `requireVerifiedAuth()` في `auth.ts` (سطر 404-408) يتحقق من هذا:
```typescript
const iat = payload.iat as number | undefined;
const passwordChangedAt = payload.passwordChangedAt as number | undefined;
if (iat && passwordChangedAt && passwordChangedAt > iat) {
  return { error: unauthorizedResponse() };
}
```

لكن مسارات session/me لا تستخدم هذه الدالة.

**الإصلاح المُقترح**: إضافة تحقق `passwordChangedAt > iat` في مسارات session و me.

---

### 🔴 4. شرط سباق في تحديد معدل 2FA — Race Condition in 2FA Rate Limiting
**الملف**: `src/app/api/auth/2fa/verify/route.ts` (سطر 37-60)

```typescript
// check2FARateLimit: تقرأ العدد
async function check2FARateLimit(userId: string) {
  const attempts = parseInt(await redis.get(key) || '0', 10);
  if (attempts >= MAX_2FA_ATTEMPTS) return { allowed: false, attemptsLeft: 0 };
  return { allowed: true, attemptsLeft: MAX_2FA_ATTEMPTS - attempts };
}

// record2FAAttempt: تزيد العدد (atomic INCR)
async function record2FAAttempt(userId: string) {
  const count = await redis.incr(key);
  // ...
}
```

**المشكلة**: بين `check2FARateLimit()` و `record2FAAttempt()` هناك نافذة زمنية. مهاجم يمكنه إرسال 5 طلبات متزامنة، وكلها ستجتاز فحص المعدل لأن `INCR` يحدث **بعد** الفحص. هذا يسمح بتجاوز حد 5 محاولات.

رمز TOTP من 6 أرقام لديه 1,000,000 احتمال. مع 5 محاولات متزامنة × عدة جولات، يمكن للمهاجم تجربة آلاف الرموز.

**الإصلاح المُقترح**: استخدام عملية ذرية (Lua script في Redis) تجمع بين الفحص والتسجيل:
```lua
local count = redis.call('INCR', KEYS[1])
if count == 1 then redis.call('EXPIRE', KEYS[1], ARGV[1]) end
if count > tonumber(ARGV[2]) then
  return {0, count}
else
  return {1, count}
end
```

---

## 🟡 التحذيرات (Warnings)

### 🟡 1. رمز إعادة تعيين كلمة المرور في URL — Password Reset Token in URL
**الملف**: `src/app/api/auth/forgot-password/route.ts` (سطر 50)

```typescript
const resetUrl = `${process.env.NEXT_PUBLIC_APP_URL}/reset-password?token=${resetToken}`;
```

**المشكلة**: رمز إعادة التعيين يُرسل كمعامل URL. عناوين URL يمكن أن تُسجّل في:
- سجل المتصفح (Browser History)
- سجلات الخادم الوكيل (Proxy Logs)
- سجلات خادم الويب (Access Logs)
- أدوات تحليل الروابط (Referer headers)

**الإصلاح المُقترح**: استخدام جزء الشظية (fragment identifier) `#token=` الذي لا يُرسل للخادم، أو إرسال الرمز عبر POST body في صفحة وسيطة.

---

### 🟡 2. رموز الاسترداد 2FA بدون تتبع فردي — Backup Codes Lack Individual Tracking
**الملف**: `src/lib/auth/auth-service.ts` (سطر 1258-1269)

```typescript
const hashedBackupCodes = await Promise.all(backupCodes.map(code => hashToken(code)));
await db.twoFactorSecret.update({
  where: { userId },
  data: { backupCodes: JSON.stringify(hashedBackupCodes) },
});
```

**المشكلة**: رموز الاسترداد تُخزّن كـ JSON array من الـ hashes بدون تتبع أي رمز تم استخدامه. هذا يعني:
- لا يمكن إبطال رمز استرداد فردي بعد استخدامه
- يجب فك تشفير/تحليل المصفوفة بالكامل لكل تحقق
- إذا سُرق رمز استرداد واحد، لا يمكن إبطاله دون إعادة توليد الكل

**الإصلاح المُقترح**: إنشاء جدول منفصل `BackupCode` مع حقول `codeHash`, `usedAt`, أو إضافة علامة `used` لكل رمز.

---

### 🟡 3. مسار رموز الاسترداد بدون تحديد معدل — Missing Rate Limiting on Backup Codes
**الملف**: `src/app/api/auth/2fa/backup-codes/route.ts`

**المشكلة**: مسار إعادة توليد رموز الاسترداد ليس لديه rate limiting. مهاجم يمتلك جلسة مسروقة يمكنه إعادة توليد رموز الاسترداد بلا حدود، مما يُبطل الرموز القديمة وينشئ رموز جديدة لا يعرفها المالك الشرعي.

**الإصلاح المُقترح**: إضافة `withRateLimit(request, 'strict')` (5 طلبات/دقيقة).

---

### 🟡 4. عدم فرض HTTPS — No HTTPS Enforcement
**الملف**: `src/lib/auth/token-utils.ts` (سطر 226)

```typescript
secure: process.env.NODE_ENV === 'production',
```

**المشكلة**: علامة `secure` على الكوكيز تعتمد على `NODE_ENV`. إذا نُشر التطبيق في إنتاج بدون تعيين `NODE_ENV=production`، ستُرسل الكوكيز عبر HTTP. لا يوجد HSTS أو إعادة توجيه HTTPS على مستوى التطبيق.

**الإصلاح المُقترح**: إضافة تحقق إضافي أو توجيه HTTPS في middleware.

---

### 🟡 5. كوكيز CSRF قابلة للقراءة من JavaScript — CSRF Token Vulnerable to XSS
**الملف**: `src/lib/csrf-client.ts` (سطر 17-21)

```typescript
export function getCsrfToken(): string {
  if (typeof document === 'undefined') return '';
  const match = document.cookie.match(/(?:^|;\s*)csrf_token=([^;]*)/);
  return match ? decodeURIComponent(match[1]) : '';
}
```

**المشكلة**: كوكي `csrf_token` ليس `httpOnly` (بالتصميم، لنمط Double Submit Cookie). هذا يعني أن أي هجوم XSS يمكنه قراءة الرمز وتجاوز حماية CSRF. الحماية من CSRF تعتمد كلياً على عدم وجود XSS.

**الإصلاح المُقترح**: النظر في استخدام نمط Synchronizer Token مع تخزين الرمز في كوكي httpOnly والتحقق من جانب الخادم، بدلاً من الاعتماد على JavaScript لقراءة الكوكي.

---

### 🟡 6. تحقق CSRF يعتمد كلياً على الـ proxy — No Server-Side CSRF Validation
**الملفات**: جميع مسارات API

**المشكلة**: لا يوجد أي مسار API يتحقق من رمز CSRF من جانب الخادم. التحقق يتم بالكامل في طبقة الـ proxy. إذا تم تجاوز الـ proxy أو أُسيء تكوينه، لا توجد حماية CSRF على الإطلاق.

**الإصلاح المُقترح**: إضافة middleware في Next.js يتحقق من `X-CSRF-Token` header مقابل كوكي `csrf_token` لجميع طلبات POST/PUT/PATCH/DELETE.

---

### 🟡 7. التطهير من XSS يعتمد على Regex — Regex-Based XSS Sanitization
**الملف**: `src/lib/security/sanitize.ts` (سطر 11-31)

```typescript
const XSS_PATTERNS: RegExp[] = [
  /<script[\s\S]*?>[\s\S]*?<\/script>/gi,
  /<script[\s\S]*?>/gi,
  /javascript\s*:/gi,
  /on\w+\s*=\s*["']?/gi,
  // ...
];
```

**المشكلة**: الكشف عن XSS عبر أنماط Regex غير مكتمل بطبيعته. تقنيات XSS جديدة يمكن أن تتجاوز هذه الأنماط. أمثلة على تجاوزات محتملة:
- `<img/src=x onerror=alert(1)>` (بدون مسافة بعد اسم العنصر)
- `java\tscript:` (حرف tab في المنتصف)
- `\x3cscript\x3e` (ترميز Unicode)

**التخفيف الموجود**: التعليق يوضح أن هذا "defense-in-depth" وليس الخط الدفاعي الأول. يتم استخدام Prisma (parameterized queries) كحماية أساسية.

**الإصلاح المُقترح**: استخدام مكتبة متخصصة مثل `DOMPurify` (للخادم عبر `isomorphic-dompurify`) بدلاً من أو بالإضافة إلى Regex.

---

### 🟡 8. الكشف عن حقن SQL يعتمد على Regex — Regex-Based SQL Injection Detection
**الملف**: `src/lib/security/sanitize.ts` (سطر 36-47)

**المشكلة**: نفس مشكلة XSS — أنماط Regex لا يمكنها تغطية كل تقنيات حقن SQL. الأنماط الحالية قد تُنتج إيجابيات كاذبة (false positives) مع نصوص عادية تحتوي كلمات مثل "SELECT" أو "FROM".

**التخفيف الموجود**: Prisma يستخدم parameterized queries بشكل افتراضي. هذا هو الخط الدفاعي الرئيسي والفعّال.

**الإصلاح المُقترح**: إزالة هذه الأنماط أو جعلها اختيارية لتجنب الإيجابيات الكاذبة. الاعتماد على Prisma كحماية أساسية.

---

### 🟡 9. عدم التحقق من البريد الإلكتروني قبل تسجيل الدخول — No Email Verification Before Login
**الملف**: `src/app/api/auth/login/route.ts` و `src/app/api/auth/register/route.ts`

**المشكلة**: يمكن للمستخدم تسجيل الدخول فوراً بعد التسجيل دون التحقق من بريده الإلكتروني. هذا يسمح بـ:
- إنشاء حسابات بعناوين بريد أشخاص آخرين
- انتحال الهوية عبر استخدام بريد شخص آخر

**الإصلاح المُقترح**: تقييد الوصول للمستخدمين الذين لم يتحققوا من بريدهم (السماح بتسجيل الدخول لكن مع دور محدود أو صفحة إلزامية للتحقق).

---

### 🟡 10. عدم استخدام فحص HaveIBeenPwned — Breached Password Check Not Used
**الملف**: `src/lib/auth/modules/password.ts` (سطر 170-197)

```typescript
export async function checkPasswordBreached(password: string): Promise<boolean> {
  // ... استخدام k-anonymity API ...
}
```

**المشكلة**: الدالة `checkPasswordBreached()` موجودة ومُنفذة بشكل صحيح (باستخدام k-anonymity API)، لكنها **لا تُستدعى أبداً** في مسارات التسجيل أو تغيير كلمة المرور. هذه فرصة ضائعة لمنع استخدام كلمات مرور مخترقة.

**الإصلاح المُقترح**: إضافة استدعاء `checkPasswordBreached()` في:
- `register/route.ts` أثناء التسجيل
- `reset-password/route.ts` أثناء إعادة التعيين
- `auth-service.ts` أثناء تغيير كلمة المرور

---

### 🟡 11. عدم وجود حد أقصى لطول كلمة المرور — No Maximum Password Length
**الملف**: `src/lib/auth/modules/password.ts` (سطر 64-126)

**المشكلة**: التحقق من قوة كلمة المرور يفحص الحد الأدنى (8 أحرف) لكن لا يوجد حد أقصى. bcrypt لديه حد 72 بايت. كلمات مرور أطول من 72 بايت تُقطع بصمت. أسوأ من ذلك، مهاجم يمكنه إرسال كلمة مرور بطول ميجابايت لإحداث **هجوم DoS** عبر إبطاع خادم bcrypt.

**الإصلاح المُقترح**: إضافة حد أقصى مثل 128 حرف:
```typescript
if (password.length > 128) {
  errors.push('Password must be at most 128 characters long');
}
```

---

### 🟡 12. حذف رموز التحديث خارج المعاملة — Refresh Token Delete Outside Transaction
**الملف**: `src/lib/auth/auth-service.ts` (سطر 679-681)

```typescript
// Update password
await db.user.update({ where: { id: userId }, data: { ... } });

// Invalidate all existing refresh tokens — خارج المعاملة!
await db.refreshToken.deleteMany({ where: { userId } });
```

**المشكلة**: `deleteMany` لرموز التحديث يتم **خارج المعاملة** (`$transaction`). إذا فشل الاتصال بقاعدة البيانات بين التحديث والحذف، ستُغيّر كلمة المرور لكن رموز التحديث القديمة ستبقى صالحة.

**الإصلاح المُقترح**: نقل `deleteMany` داخل `$transaction`.

---

### 🟡 13. مسار الخروج لا يُبطل رمز 2FA المؤقت — Logout Doesn't Clear 2FA Temp Token
**الملف**: `src/app/api/auth/logout/route.ts`

**المشكلة**: مسار الخروج يُبطل كوكيز `blue_token` و `blue_refresh_token` لكنه لا يمسح كوكي `blue_2fa_temp`. إذا كان المستخدم في مرحلة 2FA وخرج، يمكن استخدام الرمز المؤقت لمدة 5 دقائق.

**الإصلاح المُقترح**: إضافة مسح كوكي `blue_2fa_temp`:
```typescript
response.cookies.set('blue_2fa_temp', '', { path: '/', maxAge: 0, httpOnly: true, sameSite: 'lax' });
```

---

### 🟡 14. رسائل خطأ تسجيل الدخول تكشف حالة الحساب — Login Error Messages Leak Account State
**الملف**: `src/app/api/auth/login/route.ts` (سطر 249-252)

```typescript
return NextResponse.json(
  { error: "بيانات الدخول غير صحيحة. تأكد من البريد الإلكتروني وكلمة المرور" },
  { status: 401 }
);
```

**المشكلة**: الحساب المقفل يُرجع رسالة مختلفة (423 + "الحساب مقفل") عن كلمة المرور الخاطئة (401 + "بيانات الدخول غير صحيحة"). هذا يسمح للمهاجم بمعرفة أن البريد الإلكتروني موجود (لأنه وصل لمرحلة التحقق من القفل) وأن الحساب مقفل.

**الإصلاح المُقترح**: توحيد رسائل الخطأ أكثر، أو إرجاع 401 لكل الحالات مع تسجيل الفرق في سجلات المراجعة فقط.

---

### 🟡 15. `ENCRYPTION_KEY` يُشتق من `JWT_SECRET` في التطوير — Encryption Key Derived from JWT Secret
**الملف**: `src/lib/auth/token-utils.ts` (سطر 100-117)

```typescript
// DEVELOPMENT: Allow fallback from JWT_SECRET with prominent warning
if (process.env.JWT_SECRET) {
  return createHash('sha256').update(process.env.JWT_SECRET).digest();
}
```

**المشكلة**: في بيئة التطوير، إذا لم يُعيّن `ENCRYPTION_KEY`، يُشتق من `JWT_SECRET` عبر SHA-256. هذا يعني:
- إذا تسرب `JWT_SECRET`، تنكشف كل البيانات المشفرة
- البيانات المشفرة في التطوير لن يمكن فك تشفيرها بـ `ENCRYPTION_KEY` حقيقي في الإنتاج
- هذا قد يُخفي سوء التكوين بدلاً من إظهاره

**التخفيف الموجود**: يُعرّض تحذير كبير واضح. في الإنتاج يفشل التطبيق إذا لم يُعيّن.

**الإصلاح المُقترح**: إزالة الـ fallback بالكامل وجعل `ENCRYPTION_KEY` مطلوباً دائماً.

---

### 🟡 16. عنوان IP العميل يعتمد على رؤوس يمكن تزويرها — Client IP from Spoofable Headers
**الملف**: `src/lib/rate-limiter.ts` (سطر 375-411)

```typescript
const forwarded = headers.get('x-forwarded-for');
if (forwarded) {
  const parts = forwarded.split(',');
  const candidate = parts[parts.length - 1].trim(); // أخذ آخر IP
  // ...
}
```

**المشكلة**: رغم أن أخذ آخر IP في `X-Forwarded-For` هو الممارسة الصحيحة (لأن الـ proxy الموثوق يُضيف في النهاية)، إلا أن هذا يعتمد على وجود proxy واحد موثوق. إذا كان هناك عدة طبقات proxy أو إذا أُسيء التكوين، يمكن تزوير IP لتجاوز تحديد المعدل.

**الإصلاح المُقترح**: إضافة تكوين `TRUSTED_PROXY_IPS` والتحقق من أن الطلب قادم من proxy موثوق قبل الوثوق بالرؤوس.

---

### 🟡 17. نفس السر JWT لجميع أنواع الرموز — Same JWT Secret for All Token Types
**الملفات**: `jwt-secret.ts`, `token-utils.ts`, `auth-service.ts`, `2fa/verify/route.ts`, `ws-token/route.ts`

**المشكلة**: جميع أنواع الرموز (access, password-reset, email-verification, 2fa-pending, ws) تستخدم نفس `JWT_SECRET` وخوارزمية `HS256`. رغم أن كل نوع رمز لديه `type` claim و audience مختلف (في بعض الحالات)، استخدام نفس السر يعني أن تسريبه يُخوّل المهاجم من تزوير **كل أنواع الرموز**.

**التخفيف الموجود**: 
- الرموز لها `type` claim يُتحقق منه
- رمز 2FA المؤقت يستخدم audience مختلف (`blueprint-2fa`)
- رمز WS يستخدم audience مختلف (`blueprint-ws`)

**الإصلاح المُقترح**: استخدام أسرار مختلفة على الأقل للرموز عالية الحساسية (password-reset, 2fa-pending).

---

### 🟡 18. `generateToken()` في auth.ts يحتوي فقط على userId — Incomplete Token Payload
**الملف**: `src/app/api/utils/auth.ts` (سطر 200-208)

```typescript
export async function generateToken(userId: string): Promise<string> {
  return new jose.SignJWT({ userId })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuer('blueprint-saas')
    .setAudience('blueprint-users')
    .setExpirationTime('15m')
    .setIssuedAt()
    .sign(getJWTSecret());
}
```

**المشكلة**: هذا الرمز يحتوي فقط على `userId` بدون `role`, `email`, أو `organizationId`. إذا استُخدم هذا الرمز في سياق يتطلب صلاحيات، فلن يكون هناك معلومات كافية للتحقق. كما أنه لا يحتوي على `type` claim، مما يجعله يُقبل كرمز وصول عادي.

**الإصلاح المُقترح**: إضافة تعليق واضح يوضح أن هذه الدالة للاستخدام الداخلي فقط، أو إضافة `type: 'internal'` claim.

---

## 🟢 الملاحظات الإيجابية (Positive Findings)

### 🟢 1. تشفير كلمات المرور بـ bcrypt مع 12 جولة
**الملف**: `src/lib/auth/modules/password.ts` (سطر 21)
- استخدام bcrypt مع 12 جولة يُوفر توازناً ممتازاً بين الأمان والأداء

### 🟢 2. تخفيف هجمات التوقيت في تسجيل الدخول
**الملف**: `src/app/api/auth/login/route.ts` (سطر 173-174)
```typescript
// Timing attack mitigation: always perform bcrypt compare even when user not found
await bcrypt.compare(password, '$2a$10$XXXXXXXX...');
```
- مقارنة bcrypt وهمية عند عدم وجود المستخدم تمنع الكشف عن وجود البريد عبر التوقيت

### 🟢 3. قفل الحساب بعد محاولات فاشلة
**الملفات**: `login/route.ts`, `auth-service.ts`
- 5 محاولات فاشلة → قفل 15 دقيقة
- إعادة تعيين العداد عند النجاح

### 🟢 4. دوران رموز التحديث مع كشف إعادة الاستخدام
**الملفات**: `refresh/route.ts`, `auth-service.ts`
- عند اكتشاف إعادة استخدام رمز محظور → إبطال **جميع** رموز المستخدم
- دوران رمز التحديث في كل طلب تجديد

### 🟢 5. تخزين رموز إعادة التعيين كـ hash
**الملفات**: `forgot-password/route.ts`, `reset-password/route.ts`, `auth-service.ts`
- الرمز الأصلي يُرسل فقط عبر البريد الإلكتروني
- يُخزّن SHA-256 hash فقط في قاعدة البيانات

### 🟢 6. فصل أنواع الرموز عبر `type` claim
**الملفات**: جميع ملفات JWT
- `type: 'access'` للرموز العادية
- `type: 'password-reset'` لإعادة التعيين
- `type: '2fa-pending'` للمصادقة الثنائية
- `type: 'ws'` لـ WebSocket
- دالة `verifyToken()` ترفض الرموز غير المخصصة للوصول

### 🟢 7. حماية القوة الغاشمة لـ 2FA عبر Redis
**الملف**: `src/app/api/auth/2fa/verify/route.ts`
- 5 محاولات فاشلة لكل مستخدم في 15 دقيقة
- يفشل مغلق (fail-closed) عند عدم توفر Redis
- استخدام `INCR` ذري لتسجيل المحاولات

### 🟢 8. إلغاء صلاحية الرموز عند تغيير كلمة المرور
**الملفات**: `auth-service.ts`, `reset-password/route.ts`
- `passwordChangedAt` يُحدّث ويُدرج في JWT
- `requireVerifiedAuth()` يتحقق من `passwordChangedAt > iat`
- حذف جميع رموز التحديث عند تغيير كلمة المرور

### 🟢 9. تحديد المعدل على مسارات حساسة
**الملفات**: جميع مسارات API
- تسجيل الدخول: 10 طلبات/دقيقة (auth)
- إعادة تعيين كلمة المرور: 3 طلبات/ساعة (passwordReset)
- عمليات حساسة: 5 طلبات/دقيقة (strict)

### 🟢 10. سجلات المراجعة الشاملة
**الملف**: `src/lib/security/audit-logger.ts`
- تصفية البيانات الحساسة تلقائياً (كلمات المرور، رموز، مفاتيح)
- مستويات شدة (INFO, WARNING, ERROR, CRITICAL)
- كتابة دفعية لتحسين الأداء

### 🟢 11. منع تزوير الرؤوس عبر `requireVerifiedAuth()`
**الملف**: `src/app/api/utils/auth.ts` (سطر 356-434)
- إعادة التحقق من JWT
- التطابق مع رؤوس x-user-*
- التحقق من passwordChangedAt
- رفض رموز 2fa-pending
- تسجيل محاولات التزوير

### 🟢 12. كوكيز httpOnly مع SameSite=Lax
**الملف**: `src/lib/auth/token-utils.ts` (سطر 221-229)
- رمز الوصول ورمز التحديث في كوكيز httpOnly
- SameSite=Lax يحمي من CSRF عبر الروابط
- Secure=true في الإنتاج

---

## ملخص الأولويات

### 🔴 حرج — يجب إصلاحه فوراً (4 مشاكل)
| # | الملف | المشكلة | CWE |
|---|-------|---------|-----|
| 1 | auth.ts | تزوير رؤوس الهوية عبر `getAuthContext()` | CWE-290 |
| 2 | register/route.ts | تسريب وجود البريد الإلكتروني | CWE-204 |
| 3 | session/route.ts, me/route.ts | عدم التحقق من passwordChangedAt | CWE-613 |
| 4 | 2fa/verify/route.ts | شرط سباق في تحديد معدل 2FA | CWE-362 |

### 🟡 تحذير — يجب إصلاحه قريباً (18 مشكلة)
| # | الملف | المشكلة | CWE |
|---|-------|---------|-----|
| 1 | forgot-password/route.ts | رمز إعادة التعيين في URL | CWE-200 |
| 2 | auth-service.ts | رموز استرداد بدون تتبع فردي | CWE-326 |
| 3 | backup-codes/route.ts | بدون تحديد معدل | CWE-307 |
| 4 | token-utils.ts | عدم فرض HTTPS | CWE-614 |
| 5 | csrf-client.ts | CSRF token قابل للقراءة من JS | CWE-352 |
| 6 | مسارات API | لا تحقق CSRF من جانب الخادم | CWE-352 |
| 7 | sanitize.ts | تطهير XSS يعتمد على Regex | CWE-79 |
| 8 | sanitize.ts | كشف حقن SQL يعتمد على Regex | CWE-89 |
| 9 | login/register | لا تحقق من البريد قبل الدخول | CWE-287 |
| 10 | password.ts | فحص HaveIBeenPwned غير مُستخدم | CWE-521 |
| 11 | password.ts | لا حد أقصى لطول كلمة المرور | CWE-400 |
| 12 | auth-service.ts | حذف رموز التحديث خارج المعاملة | CWE-362 |
| 13 | logout/route.ts | لا مسح لكوكي 2FA المؤقت | CWE-613 |
| 14 | login/route.ts | رسائل خطأ تكشف حالة الحساب | CWE-204 |
| 15 | token-utils.ts | اشتقاق مفتاح التشفير من JWT_SECRET | CWE-326 |
| 16 | rate-limiter.ts | IP العميل من رؤوس قابلة للتزوير | CWE-290 |
| 17 | jwt-secret.ts | نفس السر لجميع أنواع الرموز | CWE-321 |
| 18 | auth.ts | `generateToken()` بدون role/type | CWE-287 |

### 🟢 إيجابي — ممارسات أمنية ممتازة (12 عنصر)
| # | الممارسة | الملف |
|---|---------|-------|
| 1 | bcrypt 12 جولة | password.ts |
| 2 | تخفيف هجمات التوقيت | login/route.ts |
| 3 | قفل الحساب بعد 5 محاولات | login/route.ts |
| 4 | دوران رموز التحديث | refresh/route.ts |
| 5 | تخزين hash فقط للرموز | forgot-password/route.ts |
| 6 | فصل أنواع الرموز | jwt.ts |
| 7 | حماية 2FA عبر Redis | 2fa/verify/route.ts |
| 8 | إلغاء رموز عند تغيير كلمة المرور | auth-service.ts |
| 9 | تحديد المعدل على المسارات الحساسة | rate-limiter.ts |
| 10 | سجلات مراجعة شاملة | audit-logger.ts |
| 11 | `requireVerifiedAuth()` ضد التزوير | auth.ts |
| 12 | كوكيز httpOnly + SameSite | token-utils.ts |

---

## التوصيات الرئيسية

1. **جعل `requireVerifiedAuth()` الإعداد الافتراضي** لجميع مسارات API التي تعدّل بيانات أو تنفّذ عمليات حساسة. `getAuthContext()` يجب أن يُستخدم فقط للمسارات القرائية مع تعليق يشرح السبب.

2. **توحيد رسائل الخطأ** في تسجيل الدخول والتسجيل لمنع تسريب المعلومات. استخدام رسائل عامة مثل "العملية فشلت" بدلاً من تحديد السبب.

3. **إضافة تحقق `passwordChangedAt > iat`** في جميع مسارات التحقق من الرموز (session, me) وليس فقط في `requireVerifiedAuth()`.

4. **إصلاح شرط السباق في 2FA** باستخدام عملية Redis ذرية (Lua script).

5. **إضافة تحقق CSRF من جانب الخادم** في Next.js middleware بدلاً من الاعتماد الكلي على الـ proxy.

6. **استدعاء `checkPasswordBreached()`** في مسارات التسجيل وتغيير كلمة المرور وإعادة تعيينها.

7. **إضافة حد أقصى لطول كلمة المرور** (128 حرف) لمنع هجمات DoS على bcrypt.

8. **مسح كوكي `blue_2fa_temp`** في مسار الخروج.

---

*انتهى التدقيق الأمني — تم فحص 27 ملف سطراً بسطر | 4 ثغرات حرجة | 18 تحذير | 12 ممارسة إيجابية*

---

# تقرير التدقيق العميق — مخطط Prisma (Prisma Schema)
## تاريخ التدقيق: 2026-03-05 | المُدقّق: Senior Database Architect | المهمة: #2

---

## نظرة عامة

| المعيار | القيمة |
|---------|--------|
| إجمالي النماذج (Models) | **94 نموذج** |
| إجمالي الـ Enums | **58 enum** |
| ملف المخطط الرئيسي | `prisma/schema.prisma` (3448 سطر) — SQLite |
| مخطط PostgreSQL | `prisma/schema.postgresql.prisma` (2656 سطر) — مع `@db.Text`, `@@map` |
| مخطط SQLite | `prisma/schema.sqlite.prisma` (2525 سطر) |
| ملف البذرة | `prisma/seed.ts` (1053 سطر) |
| اتصال قاعدة البيانات | `src/lib/db.ts` (53 سطر) |
| عدد التهيجات | 3 ملفات SQL |

---

## ✅ ما هو جيد

### 1. تصميم Multi-Tenant ممتاز
- كل نموذج أعمال تقريباً يحتوي على `organizationId` مع فهرس `@@index([organizationId])`
- الهجرة `20260518_add_organization_id` أضافت `organizationId` لـ ~31 نموذج كان يفتقر إليه
- القيود الفريدة مُحددة بالمنظمة: `@@unique([number, organizationId])` للمشاريع والفواتير

### 2. أمان المصادقة
- `RefreshToken.tokenHash` يُخزّن SHA-256 hash وليس النص الصريح
- `TwoFactorSecret` يُخزّن التشفير المشفر AES-256-GCM (حسب التعليقات)
- نموذج منفصل `EmailVerificationToken` و `PasswordResetToken` بدلاً من حقول في User
- `User.passwordChangedAt` لإلغاء صلاحية الرموز القديمة
- `User.failedLoginAttempts` و `lockedUntil` لحماية القوة الغاشمة
- `SecurityAuditLog` لتتبع العمليات الحساسة

### 3. الحذف الناعم (Soft Delete)
- `User`، `Project`، `Client`، `Task`، `Contract`، `Invoice`، `Defect`، `Document`، `Supplier`، `Timesheet` لديها `deletedAt`
- فهارس على `deletedAt` في معظم النماذج

### 4. فهارس مُركبة ذكية
- `Task`: `@@index([projectId, status])`, `@@index([assigneeId, status])`, `@@index([status, dueDate])`
- `Notification`: `@@index([userId, isRead])`
- `Attendance`: `@@index([employeeId, date])`
- `ActivityLog`: `@@index([userId, createdAt])`, `@@index([entityType, entityId])`

### 5. قواعد onDelete واضحة
- معظم العلاقات الابن→أب تستخدم `onDelete: Cascade`
- العلاقات الحرجة تستخدم `onDelete: Restrict` (مثل: Project→Client)
- الروابط الاختيارية تستخدم `onDelete: SetNull` (مثل: Project→Contractor)

### 6. نموذج البذرة
- كلمات مرور تجريبية مُدارة عبر ملف منفصل `demo-credentials.ts`
- استخدام `bcrypt.hash` بكلفة 10
- تعطيل FK checks أثناء التنظيف ثم إعادة تفعيلها
- تواريخ ديناميكية (نسبية لليوم الحالي)

---

## 🔴 حرج — مشاكل أمنية وسلامة بيانات

### 🔴 1. نموذج `Leave` يُشير إلى `User` بدلاً من `Employee`
```prisma
model Leave {
  employeeId      String     // ⚠️ اسم الحقل يوحي بـ Employee
  employee        User       @relation(fields: [employeeId], references: [id], onDelete: Cascade)
  //                ^^^^ يجب أن يكون Employee وليس User!
}
```
**المشكلة**: الحقل اسمه `employeeId` لكنه يُشير إلى جدول `User`. هذا:
- يُربك المطورين ويُضعف قابلية القراءة
- لا يضمن أن المستخدم لديه سجل موظف (`Employee`)
- يُفقد العلاقة `Employee.leaves` الحقيقية
**الإصلاح**: تغيير العلاقة لتُشير إلى `Employee`:
```prisma
employee  Employee @relation(fields: [employeeId], references: [id], onDelete: Cascade)
```

### 🔴 2. علاقات تفتقر لـ `onDelete` — بيانات يتيمة محتملة
النماذج التالية لها علاقات FK **بدون** تحديد `onDelete`:

| النموذج | الحقل | النموذج المُشار إليه | الخطر |
|---------|-------|---------------------|-------|
| `Contract` | `clientId` | `Client` | فاتورة يتيمة إذا حُذف العميل |
| `Invoice` | `clientId` | `Client` | فاتورة يتيمة |
| `Proposal` | `clientId` | `Client` | عرض يتيم |
| `Bid` | `contractorId` | `Contractor` | عطاء يتيم |
| `RiskAction` | `assigneeId` | `User` | إجراء يتيم |
| `Task` | `parentId` | `Task` | مهام فرعية يتيمة عند حذف الأب |
| `TwoFactorSecret` | `userId` | `User` (ضمني عبر @unique) | سر يتيم |
| `TwoFactorChallenge` | `userId` | `User` | تحدي يتيم |
| `EmailVerificationToken` | `userId` | `User` | رمز يتيم |
| `PasswordResetToken` | `userId` | `User` | رمز يتيم |
| `Document` | `contractId` | `Contract` | مستند يتيم |

**الإصلاح**: إضافة `onDelete: Cascade` أو `onDelete: SetNull` حسب المنطق الأعمالي.

### 🔴 3. `organizationId` قابل للقيم الفارغة في نماذج أعمال حرجة
```prisma
model Project {
  organizationId  String?   // ⚠️ يجب أن يكون String (غير قابل لـ null)
}
model Client {
  organizationId  String?   // ⚠️ نفس المشكلة
}
model Invoice {
  organizationId  String?   // ⚠️ نفس المشكلة
}
```
**المشكلة**: في نظام SaaS متعدد المستأجرين، إذا كان `organizationId` فارغاً:
- السجل لن ينتمي لأي منظومة → **تسريب بيانات بين المستأجرين**
- استعلامات `WHERE organizationId = ?` ستتجاهل هذه السجلات
- لا يوجد ضمان على مستوى قاعدة البيانات يمنع هذا
**الإصلاح**: جعل `organizationId` **إلزامياً** (`String` بدون `?`) في النماذج الأساسية: `Project`, `Client`, `Invoice`, `Contract`, `Task`, `Payment`, `Budget`.

### 🔴 4. حقول `String` لا تُشير لمستخدمين حقيقيين (Foreign Keys معلقة)
الحقول التالية تُخزّن معرّفات مستخدمين كـ `String?` **بدون علاقة Prisma**:

| النموذج | الحقل | يجب أن يُشير إلى |
|---------|-------|------------------|
| `DesignPhase` | `designerId` | `User` |
| `SupervisionChecklist` | `engineerId`, `approvedById` | `User` |
| `ProgressClaim` | `certifiedById` | `User` |
| `Approval` | `requestedBy`, `assignedTo` | `User` |
| `ProjectStage` | `engineerId` | `User` |
| `ContractorEvaluation` | `evaluatedBy` | `User` |

**المشكلة**: بدون علاقة Prisma:
- لا يمكن استخدام `include` لجلب بيانات المستخدم
- لا ضمان على مستوى قاعدة البيانات أن المعرّف موجود فعلاً
- `onDelete: SetNull` لن يعمل تلقائياً
**الإصلاح**: إضافة علاقات `@relation` صحيحة مع `onDelete: SetNull`.

### 🔴 5. `User.preferences` كـ `String?` بدلاً من `Json`
```prisma
preferences  String?   // JSON string: { accentColor, notifications: { ... } }
```
**المشكلة**: تخزين JSON كنص عادي يُفقد:
- التحقق من الصحة على مستوى التطبيق
- إمكانية الاستعلام داخل JSON في PostgreSQL
- الأمان ضد حقن JSON المعطوب
**الإصلاح**: تغيير إلى `Json?` أو إنشاء نموذج `UserPreferences` منفصل.

---

## 🟡 تحذيرات — مشاكل أداء وتصميم

### 🟡 1. حقول `updatedAt` مفقودة في نماذج فرعية
النماذج التالية **تفتقر** لـ `updatedAt`:

| النموذج | لديه `createdAt` | يفتقد `updatedAt` |
|---------|-----------------|-------------------|
| `InvoiceItem` | ✅ | ❌ |
| `PurchaseOrderItem` | ✅ | ❌ |
| `ProposalItem` | ✅ | ❌ |
| `TenderDocument` | ✅ | ❌ |
| `InspectionPhoto` | ✅ | ❌ |
| `ChecklistItem` | ✅ | ❌ |
| `AIChatMessage` | ✅ | ❌ |
| `SecurityAuditLog` | ✅ | ❌ |

**الإصلاح**: إضافة `updatedAt DateTime @updatedAt` لكل نموذج قابل للتعديل.

### 🟡 2. حقل مكرر في `BOQItem`
```prisma
model BOQItem {
  total       Decimal  @default(0)   // ⚠️ حقل مكرر
  totalPrice  Decimal  @default(0)   // ⚠️ حقل مكرر
}
```
**المشكلة**: حقلان يخزنان نفس القيمة المحسوبة. إذا اختلفا → تناقض بيانات.
**الإصلاح**: الاحتفاظ بحقل واحد فقط (`totalPrice`) وحساب `total` في وقت الاستعلام أو عبر Prisma middleware.

### 🟡 3. فهارس مفقودة على مفاتيح أجنبية
| النموذج | الحقل | يحتاج فهرس |
|---------|-------|-----------|
| `MeetingAttendee` | `userId` | ❌ لا فهرس |
| `ContractAmendment` | (يحتوي `@@index([contractId])`) | ✅ |
| `DesignRevision` | `uploadedById` | فهرس موجود ✅ |
| `InvoicePayment` | `createdById` | ❌ لا فهرس |
| `ProgressClaim` | `certifiedById` | ❌ لا فهرس |
| `Violation` | `checklistId` | فهرس موجود ✅ |

### 🟡 4. فهارس مركبة مفقودة لأنماط استعلام شائعة
```prisma
// مفقود: فلتر المشاريع حسب المنظمة والحالة
@@index([organizationId, status])  // Project

// مفقود: فلتر الفواتير حسب المنظمة والحالة
@@index([organizationId, status])  // Invoice

// مفقود: فلتر المدفوعات حسب المنظمة والحالة
@@index([organizationId, status])  // Payment

// مفقود: فلتر العملاء حسب المنظمة والاسم
@@index([organizationId, name])    // Client
```

### 🟡 5. `SchedulePhase.section` نص حر بدلاً من enum
```prisma
section  String  @default("architectural")
```
**المشكلة**: القيم المسموحة هي `architectural`, `structural`, `electrical`, `governmental` لكن لا يوجد تحقق.
**الإصلاح**: إنشاء enum `ScheduleSection` أو استخدام `ProjectDepartment`.

### 🟡 6. `Task.projectId` قابل للقيم الفارغة
```prisma
projectId  String?   // مهمة بدون مشروع
```
**المشكلة**: في نظام ERP، هل يمكن أن توجد مهمة بدون مشروع؟ إذا لا، يجب أن يكون إلزامياً.
**الإصلاح**: مراجعة منطق الأعمال وتغيير إلى `String` إذا كان المشروع إلزامياً.

### 🟡 7. تكرار في Enums — أسماء شدة غير متسقة
| Enum | أدنى شدة |
|------|---------|
| `DefectSeverity` | `NORMAL` |
| `FindingSeverity` | `LOW` |
| `ViolationSeverity` | `LOW` |
| `WorkflowStepSeverity` | `NORMAL` |
| `RiskLevel` | `GREEN` (لون!) |

**المشكلة**: نفس مفهوم "الشدة" له أسماء مختلفة عبر النماذج. `NORMAL` مقابل `LOW` مقابل `GREEN`.
**الإصلاح**: توحيد على `LOW/MEDIUM/HIGH/CRITICAL` أو `MINOR/MAJOR/CRITICAL/BLOCKER`.

### 🟡 8. Enums متشابهة — `PaymentMethod` مقابل `TransactionPayMethod`
```prisma
enum PaymentMethod { CASH; CHEQUE; TRANSFER; INSTALLMENTS }
enum TransactionPayMethod { CASH; CHEQUE; TRANSFER; ONLINE }
```
**المشكلة**: تقريباً نفس الـ enum مع اختلاف بسيط (INSTALLMENTS مقابل ONLINE).
**الإصلاح**: دمجهما في enum واحد `PayMethod` مع كل الخيارات.

### 🟡 9. `ContractorEvaluation.projectId` ليس FK
```prisma
projectId  String   // لا توجد علاقة @relation إلى Project
```
**المشكلة**: الحقل موجود لكن بدون علاقة Prisma، لا يمكن تضمين بيانات المشروع.
**الإصلاح**: إضافة علاقة `project Project @relation(fields: [projectId], references: [id])`.

### 🟡 10. انعدام التناسق بين مخططات SQLite و PostgreSQL
- مخطط PostgreSQL يحتوي على `@@map("enum_name")` على 10 enums بينما SQLite لا يحتوي عليها
- مخطط PostgreSQL يستخدم `@db.Text` و `@db.VarChar()` في 106 مكان
- مخطط PostgreSQL يحتوي على 2656 سطر مقابل 2525 لـ SQLite — اختلاف 131 سطر
- **الخطر**: النماذج قد تتباعد مع الوقت بدون آلية مزامنة
**الإصلاح**: استخدام مخطط واحد مع كتلة `provider` ديناميكية، أو إنشاء سكربت تحقق تلقائي.

---

## 🟡 تحذيرات — ملف البذرة (seed.ts)

### 🟡 11. تعطيل قيود FK أثناء البذرة
```typescript
await db.$executeRawUnsafe('PRAGMA foreign_keys = OFF');
// ... عمليات حذف ...
await db.$executeRawUnsafe('PRAGMA foreign_keys = ON');
```
**المشكلة**: 
- هذا خاص بـ SQLite ولن يعمل مع PostgreSQL
- إذا فشل السكربت بين التعطيل وإعادة التفعيل، تبقى القيود معطلة
- حذف `organization` أولاً قد يُخلّف سجلات يتيمة
**الإصلاح**: ترتيب الحذف بشكل صحيح (الابن قبل الأب) بدلاً من تعطيل القيود، واستخدام `$transaction` مع try/catch.

### 🟡 12. موردين مكررين في البذرة
```typescript
// القسم 17: 3 موردين بدون organizationId
await db.supplier.createMany({ data: [
  { name: 'شركة الخليج للمواد الإنشائية', ... },  // بدون orgId
  ...
]});

// القسم 37: 3 موردين آخرون مع organizationId
const supplier1 = await db.supplier.create({ data: { name: 'شركة الإمارات للحديد', ..., organizationId: org1.id } });
```
**المشكلة**: 6 موردين بدلاً من 3، والـ 3 الأوائل بدون `organizationId` = تسريب بيانات محتمل.
**الإصلاح**: توحيد الموردين وإضافة `organizationId` للجميع.

### 🟡 13. سجلات بدون `organizationId` في البذرة
السجلات التالية في البذرة **تفتقر** لـ `organizationId`:
- الفواتير الـ 6 (Invoice)
- العقود الـ 3 (Contract)
- العطاءات الـ 6 (Bid)
- الموافقات الـ 5 (Approval)
- المدفوعات الـ 4 (Payment)
- الميزانيات الـ 11 (Budget)
- العيوب الـ 4 (Defect)
- طلبات المعلومات الـ 3 (RFI)
- التعليقات على المهام (TaskComment)
- الإشعارات الـ 5 (Notification)
- الموردين الأوائل (Supplier)

**الخطر**: في بيئة SaaS حقيقية، هذه السجلات لن تظهر لأي مستأجر.
**الإصلاح**: إضافة `organizationId` لكل سجل في البذرة.

### 🟡 14. كلمات مرور مطبوعة في الكونسول
```typescript
console.info(`   ${cred.labelAr} (${cred.email}): ${cred.password}`);
```
**المشكلة**: كلمات المرور تظهر في سجلات البناء و CI/CD.
**الإصلاح**: إزالة طباعة كلمات المرور أو جعلها مشروطة بـ `NODE_ENV === 'development'`.

### 🟡 15. استخدام `monthsAgo(0)` قد يُعطي تاريخاً غير متوقع
```typescript
const project5 = await db.project.create({
  endDate: monthsAgo(0),  // هذا اليوم قبل 0 شهر = اليوم
```
**الإصلاح**: استخدام `now` بدلاً من `monthsAgo(0)`.

---

## 🟡 تحذيرات — اتصال قاعدة البيانات (db.ts)

### 🟡 16. لا إعداد لتجميع الاتصالات (Connection Pooling)
```typescript
export const db = globalThis.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : [],
  })
```
**المشكلة**: لا يوجد إعداد لـ `connection_limit` أو `pool_timeout`. في PostgreSQL الإنتاجي:
- الافتراضي هو `num_cpus * 2 + 1` اتصالات
- بدون تحديد، قد يتجاوز حد الاتصالات في قاعدة البيانات
**الإصلاح**:
```typescript
new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL + '?connection_limit=10&pool_timeout=20',
    },
  },
})
```

### 🟡 17. لا معالجة إيقاف نظيف (Graceful Shutdown)
```typescript
// لا يوجد process.on('SIGTERM') أو process.on('SIGINT')
```
**المشكلة**: عند إيقاف الحاوية، لا يتم إغلاق اتصالات قاعدة البيانات بشكل نظيف.
**الإصلاح**:
```typescript
process.on('SIGTERM', async () => {
  await db.$disconnect()
  process.exit(0)
})
```

### 🟡 18. تسجيل الأخطاء في الإنتاج معطّل بالكامل
```typescript
log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : [],
//                                                             ^^ مصفوفة فارغة في الإنتاج!
```
**المشكلة**: في الإنتاج، لن يُسجّل Prisma أي أخطاء استعلام حتى. هذا يُصعّب تصحيح المشاكل.
**الإصلاح**: على الأقل `['error']` في الإنتاج:
```typescript
log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
```

---

## 🟡 تحذيرات — التهيجات (Migrations)

### 🟡 19. تهيجة PostgreSQL الأولية قديمة
```sql
-- في 20250101000000_init_postgresql/migration.sql:
"verifyToken" TEXT,
"verifyTokenExpiry" TIMESTAMP(3),
"resetToken" TEXT,
"resetTokenExpiry" TIMESTAMP(3),
"twoFactorSecret" TEXT,
"backupCodes" TEXT,
"isGovernmental" BOOLEAN NOT NULL DEFAULT false,
```
**المشكلة**: هذه الحقول **حُذفت** من المخطط الحالي (نُقلت إلى نماذج منفصلة) لكنها لا تزال في التهيجة الأولية. إذا شُغّلت التهيجات من الصفر على PostgreSQL، ستحتوي قاعدة البيانات على أعمدة غير موجودة في المخطط → **عدم تطابق**.
**الإصلاح**: إنشاء تهيجة تنظيف (cleanup migration) تحذف هذه الأعمدة، أو تحديث التهيجة الأولية.

### 🟡 20. تهيجة إضافة `organizationId` لا تضيف قيود FK
```sql
-- 20260518_add_organization_id/migration.sql
ALTER TABLE `CompanySettings` ADD COLUMN `organizationId` TEXT;
-- بدون ADD CONSTRAINT ... FOREIGN KEY ...
```
**المشكلة**: تُضاف أعمدة بدون قيود FK فعلية في SQLite. التعليق يقول "Prisma handles FK enforcement at the application level" لكن هذا يعني أن قاعدة البيانات **لا تفرض** سلامة المراجع.
**الإصلاح**: على الأقل إضافة قيود FK في مخطط PostgreSQL حيث يتم دعمها.

---

## 🟢 ملاحظات — تحسينات مقترحة

### 🟢 1. نموذج `Project` مُثقّل بالعلاقات
يحتوي على **40+ علاقة** (مجموعة واحدة لكل نوع كيان فرعي). يمكن تحسينه بـ:
- تجميع بعض العلاقات في جدول وسيط
- استخدام `projectType` للتحقق من العلاقات المسموحة

### 🟢 2. `WeatherCondition` Enum — `CLEAR` و `SUNNY` متكرران
في سياق الإمارات، `SUNNY` هو الحالة الافتراضية و `CLEAR` يكاد يكون مطابقاً.

### 🟢 3. تخزين `Contractor.specialties` كنص مفصول بفواصل
```prisma
specialties  String? // comma-separated specialties
```
**التحسين**: استخدام `Json?` مع مصفوفة أو إنشاء نموذج `ContractorSpecialty`.

### 🟢 4. `Approval.requestedBy` و `assignedTo` كـ String
```prisma
requestedBy  String  // اسم شخص، لا معرّف FK
assignedTo   String  // اسم شخص، لا معرّف FK
```
**التحسين**: تحويلها إلى معرّفات مستخدمين حقيقية مع علاقات `@relation`.

### 🟢 5. لا يوجد فهرس على `User.email` بشكل مُركب مع `organizationId`
```prisma
email  String  @unique  // فريد عالمياً
```
**المشكلة**: في نظام SaaS، قد يريد مستخدمان في منظمتين مختلفتين استخدام نفس البريد. حالياً، القيد الفريد عالمي.
**التحسين**: تغيير إلى `@@unique([email, organizationId])` مثل `Client`.

### 🟢 6. نماذج الفرص الصوتية (Voice) غير موجودة
لا يوجد نموذج لتخزين بيانات الدفع الإلكتروني لجهات حكومية إماراتية (مثل: هيئة الطرق، بلدية دبي الإلكترونية).

### 🟢 7. `Enum` عدم استخدام `@default` بشكل متسق
بعض Enums لها default وبعضها لا يوجد. يجب توحيد السياسة.

---

## ملخص الأولويات

### 🔴 حرج — يجب إصلاحه فوراً (5 مشاكل)
| # | الملف/النموذج | المشكلة |
|---|--------------|---------|
| 1 | `Leave` | `employeeId` يُشير إلى `User` بدلاً من `Employee` |
| 2 | علاقات متعددة | 11 علاقة FK بدون `onDelete` → بيانات يتيمة |
| 3 | نماذج أعمال | `organizationId` قابل لـ null في نماذج حرجة → تسريب بيانات بين المستأجرين |
| 4 | 6 نماذج | حقول `String?` تُخزّن معرّفات مستخدمين بدون علاقة `@relation` |
| 5 | `User.preferences` | JSON مُخزّن كـ `String?` بدلاً من `Json?` |

### 🟡 تحذير — يجب إصلاحه قريباً (20 مشكلة)
| # | الملف/النموذج | المشكلة |
|---|--------------|---------|
| 1 | 8 نماذج فرعية | `updatedAt` مفقود |
| 2 | `BOQItem` | حقلا `total` و `totalPrice` مكرران |
| 3 | فهارس FK | فهارس مفقودة على عدة مفاتيح أجنبية |
| 4 | نماذج أعمال | فهارس مركبة مفقودة لأنماط استعلام شائعة |
| 5 | `SchedulePhase` | `section` نص حر بدلاً من enum |
| 6 | `Task` | `projectId` قابل لـ null — مراجعة منطق الأعمال |
| 7 | Enums شدة | أسماء غير متسقة (NORMAL/LOW/GREEN) |
| 8 | Enums دفع | `PaymentMethod` و `TransactionPayMethod` متكرران |
| 9 | `ContractorEvaluation` | `projectId` بدون علاقة `@relation` |
| 10 | مخططات | انعدام التناسق بين SQLite و PostgreSQL |
| 11 | seed.ts | تعطيل FK checks خاص بـ SQLite |
| 12 | seed.ts | موردين مكررين (6 بدلاً من 3) |
| 13 | seed.ts | سجلات بدون `organizationId` (فواتير، عقود، عطاءات...) |
| 14 | seed.ts | كلمات مرور مطبوعة في الكونسول |
| 15 | seed.ts | `monthsAgo(0)` بدلاً من `now` |
| 16 | db.ts | لا إعداد لتجميع الاتصالات |
| 17 | db.ts | لا معالجة إيقاف نظيف |
| 18 | db.ts | تسجيل الأخطاء معطّل في الإنتاج |
| 19 | migrations | تهيجة PostgreSQL أولية تحتوي أعمدة محذوفة |
| 20 | migrations | قيود FK غير مُضافة في تهيجة organizationId |

### 🟢 ملاحظات — تحسينات مقترحة (7 عناصر)
| # | العنصر | التفاصيل |
|---|--------|----------|
| 1 | نموذج `Project` | 40+ علاقة — يحتاج إعادة هيكلة |
| 2 | `WeatherCondition` | `CLEAR` و `SUNNY` متكرران |
| 3 | `Contractor.specialties` | نص مفصول بفواصل بدلاً من JSON |
| 4 | `Approval.requestedBy/assignedTo` | نص بدلاً من FK |
| 5 | `User.email` | فريد عالمياً — يجب أن يكون فريد لكل منظمة |
| 6 | نماذج حكومية | لا دعم لبوابات الدفع الإلكتروني الإماراتية |
| 7 | `@default` في Enums | سياسة غير متسقة |

---

## التوصيات الرئيسية

1. **إصلاح علاقة `Leave → Employee` فوراً** — هذا خطأ تصميمي سيُسبب ارتباكاً كبيراً
2. **إضافة `onDelete` لكل علاقة FK** — يمنع البيانات اليتيمة في الإنتاج
3. **جعل `organizationId` إلزامياً في النماذج الحرجة** — يمنع تسريب البيانات بين المستأجرين
4. **تحويل حقول المعرّفات المعلقة إلى علاقات Prisma حقيقية** — يُحسّن أمان البيانات وقابلية الصيانة
5. **إضافة `organizationId` لكل سجل في البذرة** — يمنع سيناريو "بيانات بدون مستأجر"
6. **إضافة فهارس مركبة للاستعلامات الشائعة** — يحسّن الأداء بشكل كبير مع نمو البيانات
7. **توحيد مخططي SQLite/PostgreSQL** — يمنع الانحراف مع الوقت
8. **تفعيل تسجيل الأخطاء في الإنتاج** — يُسهّل تشخيص المشاكل

---

*انتهى التدقيق — تم فحص 94 نموذج + 58 enum + 3 تهيجات + ملف بذرة + اتصال قاعدة البيانات سطراً بسطر*

---

# تقرير التدقيق العميق — مسارات API (API Routes)
## تاريخ التدقيق: 2026-03-05 | المُدقّق: Senior Backend Code Auditor | المهمة: #4
## النظام: BluePrint ERP | النطاق: 30 مسار API عبر جميع الوحدات

---

## نظرة عامة

| المعيار | القيمة |
|---------|--------|
| إجمالي الملفات المُدققة | **30 ملف** (5 أدوات مساعدة + 25 مسار) |
| إجمالي المسارات المُفحوصة | **~7,200+ سطر** |
| الثغرات الحرجة (🔴) | **5** |
| التحذيرات (🟡) | **22** |
| الملاحظات الإيجابية (🟢) | **15** |

---

## ✅ نقاط القوة العامة

### 1. نظام مصادقة متعدد الطبقات ممتاز
المشروع يستخدم `requireVerifiedPermission()` و `requireVerifiedAdmin()` في **جميع** المسارات المُدققة الـ 30. هذا يعني:
- ✅ إعادة التحقق من JWT في كل مسار
- ✅ تطابق مطالبات JWT مع رؤوس `x-user-*` (منع تزوير الرؤوس)
- ✅ فحص `passwordChangedAt` بعد إصدار الرمز
- ✅ رفض رموز `2fa-pending`

### 2. عزل المستأجرين (Multi-tenancy) متين
- ✅ `orgFilter()` يُطبّق على كل استعلام قراءة
- ✅ `orgCreate()` يُطبّق على كل إنشاء سجل
- ✅ `orgCheck()` يتحقق من ملكية السجل قبل التعديل/الحذف
- ✅ قيمة حارس `__DENIED__` تمنع تسريب البيانات عبر المستأجرين
- ✅ `orgFilterNested()` للموديلات التي لا تملك `organizationId` مباشرة

### 3. تحديد المعدل (Rate Limiting) شامل
- ✅ معظم المسارات تستخدم `withRateLimit(request, 'api')` (100 طلب/دقيقة)
- ✅ المسارات الحساسة تستخدم `'strict'` (5 طلبات/دقيقة): backup, stripe checkout, user DELETE, settings PUT
- ✅ مسارات AI تستخدم `'ai'` مخصص

### 4. التنظيف (Sanitization) منتظم
- ✅ `sanitizeObject()` يُستخدم على كل جسم الطلب قبل المعالجة
- ✅ `sanitizeString()` في مسار البحث
- ✅ `escapeSqlLike()` يمنع حقن أحرف البدل SQL

### 5. حذف ناعم (Soft Delete) متسق
- ✅ المشاريع، الفواتير، المهام، المستخدمين يُحذفون ناعماً عبر `deletedAt`
- ✅ استعلامات القراءة ترشح `deletedAt: null`

---

## 🔴 الثغرات الحرجة (Critical)

### 🔴 1. ثغرة SSRF في مسار تحليل الصور — Server-Side Request Forgery
**الملف**: `src/app/api/ai/analyze-image/route.ts` (سطر 215-221)

```typescript
if (image.startsWith('http')) {
  // URL - convert to base64 or pass directly
  base64ImageUrl = image;
}
```

**المشكلة**: عندما تكون قيمة `image` رابط HTTP، يتم تمريره مباشرة إلى API الرؤية بدون أي تحقق. مهاجم يمكنه:
- جعل الخادم يطلب عناوين داخلية: `http://169.254.169.254/latest/meta-data/` (AWS metadata)
- مسح المنافذ الداخلية: `http://192.168.1.1:8080/`
- طلب خدمات داخلية: `http://localhost:6379/` (Redis)

**التأثير**: تسريب بيانات اعتماد السحابة، مسح الشبكة الداخلية، الوصول لخدمات غير محمية.

**الإصلاح المُقترح**:
```typescript
// قائمة بيضاء للنطاقات المسموح بها
const ALLOWED_IMAGE_DOMAINS = ['localhost:3000', '*.amazonaws.com'];
const url = new URL(image);
if (!ALLOWED_IMAGE_DOMAINS.some(d => url.hostname.endsWith(d))) {
  return NextResponse.json({ error: 'نطاق الصورة غير مسموح' }, { status: 400 });
}
// منع عناوين IP الداخلية
if (/^(10\.|172\.(1[6-9]|2[0-9]|3[01])\.|192\.168\.|169\.254\.|127\.|0\.)/.test(url.hostname)) {
  return NextResponse.json({ error: 'عنوان IP داخلي غير مسموح' }, { status: 400 });
}
```

---

### 🔴 2. عدم التحقق من المدخلات في مسارات الذكاء الاصطناعي — Missing Zod Validation
**الملفات**:
- `src/app/api/ai/analyze-document/route.ts` (سطر 275-279)
- `src/app/api/ai/analyze-image/route.ts` (سطر 193-198)

```typescript
const body = await request.json();
const { document, prompt = '...', taskType = '...' } = body;
// ← لا يوجد تحقق Zod!
```

**المشكلة**: هذه المسارات تقبل أي JSON بدون تحقق. هذا يعني:
- `prompt` يمكن أن يكون أي طول (هجوم إرهاق الموارد)
- `taskType` يُستخدم كمفتاح `SYSTEM_PROMPTS` بدون تحقق (يعود لافتراضي آمن لكن غير صريح)
- `document` يمكن أن يحتوي على أحرف خاصة أو بيانات ضارة
- يمكن تمرير خصائص إضافية غير متوقعة

**الإصلاح المُقترح**:
```typescript
const aiDocumentSchema = z.object({
  document: z.string().min(1).max(500000),
  prompt: z.string().min(1).max(5000).default('قم بتحليل هذا المستند'),
  taskType: z.enum(['contract-analysis', 'document-review', 'invoice-extraction', 
                     'document-analysis', 'legal-analysis']).default('document-analysis'),
});

const aiImageSchema = z.object({
  image: z.string().min(1).max(10_000_000),
  prompt: z.string().min(1).max(5000).default('قم بتحليل هذه الصورة'),
  taskType: z.enum(['site-photo', 'blueprint-read', 'progress-detection',
                     'safety-inspection', 'damage-assessment', 'defect-analysis',
                     'image-analysis']).default('image-analysis'),
});
```

---

### 🔴 3. عدم التحقق من مدخلات Stripe Checkout — Missing Zod Validation on Payment Route
**الملف**: `src/app/api/stripe/checkout/route.ts` (سطر 30-31)

```typescript
const body = await request.json();
const { planId, interval = 'month', organizationId, email, name } = body;
// ← لا يوجد تحقق Zod!
```

**المشكلة**: مسار الدفع لا يتحقق من المدخلات:
- `email` يمكن أن يكون أي سلسلة (ليس بريداً إلكترونياً صالحاً)
- `name` يمكن أن يكون فارغاً أو طويلاً جداً
- `planId` يمكن أن يكون أي سلسلة (يعود `PLAN_NOT_FOUND` لكن بدون رسالة واضحة)
- `interval` يمكن أن يكون أي قيمة

**التأثير**: قد يُسبب أخطاء في Stripe API أو سلوكاً غير متوقع.

**الإصلاح المُقترح**:
```typescript
const checkoutSchema = z.object({
  planId: z.string().min(1),
  interval: z.enum(['month', 'year']).default('month'),
  organizationId: z.string().uuid(),
  email: z.string().email(),
  name: z.string().min(1).max(200),
});
```

---

### 🔴 4. حذف فعلي (Hard Delete) للمستندات — بدلاً من الحذف الناعم
**الملف**: `src/app/api/documents/[id]/route.ts` (سطر 124)

```typescript
await db.document.delete({ where: { id } });
```

**المشكلة**: على عكس **كل** الموارد الأخرى (مشاريع، فواتير، مهام، مستخدمين) التي تستخدم الحذف الناعم `deletedAt`، المستندات تُحذف فعلياً. هذا:
- يُفقد سجل التدقيق (Audit Trail)
- لا يمكن استرجاع المستندات المحذوفة بالخطأ
- يتعارض مع سياسة الاحتفاظ بالبيانات لنظام ERP
- الملف الفعلي على التخزين لا يُحذف (بقاء ملفات يتيمة)

**الإصلاح المُقترح**:
```typescript
// استخدام الحذف الناعم مثل باقي الموارد
await db.document.update({ where: { id }, data: { deletedAt: new Date() } });
```
مع إضافة فلتر `deletedAt: null` في استعلامات القراءة.

---

### 🔴 5. صلاحية خاطئة لقراءة الميزانيات — Wrong Permission for Budget GET
**الملف**: `src/app/api/budgets/route.ts` (سطر 17)

```typescript
const rbac = await requireVerifiedPermission(request, Permission.BUDGET_MANAGE);
```

**المشكلة**: مسار `GET /api/budgets` يتطلب صلاحية `BUDGET_MANAGE` وهي صلاحية **كتابة**، لكنه مسار **قراءة**. هذا يعني:
- المستخدمون الذين لديهم صلاحية قراءة المشاريع فقط لا يمكنهم رؤية الميزانيات
- يجب أن تكون الصلاحية المطلوبة أضعف (مثل `PROJECT_READ` أو صلاحية مخصصة `BUDGET_READ`)
- `BUDGET_MANAGE` يُستخدم أيضاً في POST مما يعني أن أي شخص يمكنه إنشاء ميزانيات يمكنه أيضاً قراءة كل الميزانيات

**الإصلاح المُقترح**: استخدام `Permission.PROJECT_READ` أو إنشاء `Permission.BUDGET_READ` في نظام الصلاحيات.

---

## 🟡 التحذيرات (Warnings)

### 🟡 1. عدم اتساق تنسيق الاستجابة — Inconsistent Response Format
**الملفات المتأثرة**: جميع المسارات تقريباً

**المشكلة**: المشروع يملك أدوات استجابة ممتازة في `utils/response.ts` (`successResponse`, `errorResponse`, `createdResponse`, `notFoundResponse`, `validationErrorResponse`، إلخ)، لكن المسارات لا تستخدمها بشكل متسق:

| المسار | الاستجابة الناجحة | الاستجابة الخاطئة |
|--------|------------------|------------------|
| invoices | `NextResponse.json({ invoices, pagination })` | `errorResponse()` ✅ |
| payments | `NextResponse.json({ payments, pagination })` | `NextResponse.json({ error: ... })` ❌ |
| budgets | `NextResponse.json(topLevel)` | `NextResponse.json({ error: ... })` ❌ |
| contracts | `NextResponse.json({ contracts, pagination })` | `NextResponse.json({ error: ... })` ❌ |
| attendance | `NextResponse.json({ records, summary })` | `NextResponse.json({ error: ... })` ❌ |
| leave | `NextResponse.json({ records, summary })` | `NextResponse.json({ error: ... })` ❌ |

**الإصلاح المُقترح**: استخدام `successResponse()` و `errorResponse()` بشكل موحد في جميع المسارات.

---

### 🟡 2. استخدام واسع لـ `as any` — Extensive Type Casting
**الملفات المتأثرة**: invoices, contracts, tasks, payments, employees, attendance, leave

```typescript
status: (status || "DRAFT") as any           // invoices
type: (type || "ENGINEERING_SERVICES") as any // contracts
priority: (priority || "NORMAL") as any       // tasks
payMethod: payMethod as any                   // payments
employmentStatus: (employmentStatus || "ACTIVE") as any // employees
status: (status || "PRESENT") as any          // attendance
type: type || "ANNUAL"                        // leave (بدون even as any!)
```

**المشكلة**: استخدام `as any` يُبطل فائدة TypeScript ويسمح بتمرير قيم enum غير صالحة. يمكن أن يُسبب أخطاء وقت التشغيل أو سلوكاً غير متوقع.

**الإصلاح المُقترح**: استخدام نوع Prisma الفعلي:
```typescript
import { InvoiceStatus, TaskPriority, PaymentMethod } from '@prisma/client';
// بدلاً من as any، استخدم النوع الصحيح
status: (status || "DRAFT") as InvoiceStatus,
```

---

### 🟡 3. تجاوز تحقق Zod لحقل `progress` — Zod Bypass in Tasks
**الملف**: `src/app/api/tasks/route.ts` (سطر 331-332)

```typescript
// progress is not part of the schema but may be passed
const { progress } = body as Record<string, unknown>;
```

**المشكلة**: حقل `progress` يُستخرج من الجسم مباشرةً بدون تحقق Zod، بينما باقي الحقول مُتحقق منها. هذا يعني:
- يمكن تمرير أي قيمة (سلسلة، كائن، مصفوفة) كـ `progress`
- `parseInt(String(progress)) || 0` يُعالج بعض الحالات لكن ليس كلها
- يمكن تمرير `progress: 999` (أكبر من 100%) بدون اعتراض

**الإصلاح المُقترح**: إضافة `progress` إلى `taskSchema`:
```typescript
progress: z.number().int().min(0).max(100).optional().default(0),
```

---

### 🟡 4. عدم التحقق من نوع الملف فعلياً — No Magic Byte Verification
**الملف**: `src/app/api/documents/route.ts` (سطر 44-65)

**المشكلة**: دالة `validateFile()` تتحقق فقط من:
- امتداد الملف (`.pdf`, `.docx`, إلخ)
- تطابق الامتداد مع Content-Type المُعلن

لكنها لا تتحقق من **محتوى الملف الفعلي** (magic bytes). مهاجم يمكنه:
- تسمية ملف خبيث `malware.exe` إلى `malware.pdf` — سيُقبل
- رفع ملف HTML يحتوي على JavaScript باسم `document.svg` — سيُقبل (XSS عند التحميل)
- رفع ملف ZIP يحتوي على مسار عبور (path traversal)

**الإصلاح المُقترح**: إضافة تحقق من magic bytes:
```typescript
import { fileTypeFromBuffer } from 'file-type';

const buffer = Buffer.from(await file.arrayBuffer());
const detectedType = await fileTypeFromBuffer(buffer);
if (detectedType && !ALLOWED_MIME_TYPES.has(detectedType.mime)) {
  return NextResponse.json({ error: 'نوع الملف الفعلي غير مسموح' }, { status: 400 });
}
```

---

### 🟡 5. مسار JSON للمستندات بدون تحقق Zod
**الملف**: `src/app/api/documents/route.ts` (سطر 179-217)

```typescript
const body = await request.json();
const sanitizedBody = sanitizeObject(body);
const { projectId, contractId, name, fileType, fileSize, category, version } = sanitizedBody;
// ← لا يوجد تحقق Zod!
```

**المشكلة**: مسار إنشاء المستندات JSON (للتوافق الخلفي) لا يستخدم Zod. يمكن تمرير قيم غير صالحة.

---

### 🟡 6. تحديد معدل مفقود في عدة مسارات GET
**الملفات المتأثرة**:
- `payments/route.ts` GET ❌
- `employees/route.ts` GET ❌
- `attendance/route.ts` GET ❌
- `leave/route.ts` GET ❌
- `users/route.ts` GET ❌
- `documents/route.ts` GET ❌
- `documents/[id]/route.ts` GET, PUT ❌
- `reports/financial/route.ts` GET ❌

**المشكلة**: مسارات القراءة بدون تحديد معدل يمكن استغلالها لاستخراج البيانات أو هجمات DoS.

---

### 🟡 7. عدم وجود ترقيم صفحات في عدة مسارات — Missing Pagination
**الملفات المتأثرة**:
- `budgets/route.ts` — يُرجع كل الميزانيات بدون ترقيم
- `attendance/route.ts` — يُرجع كل سجلات الحضور بدون ترقيم
- `leave/route.ts` — يُرجع كل سجلات الإجازات بدون ترقيم
- `documents/route.ts` — يُرجع كل المستندات بدون ترقيم

**المشكلة**: في نظام ERP بآلاف السجلات، هذا يُسبب استهلاك ذاكرة عالي وأوقات استجابة بطيئة.

---

### 🟡 8. بحث بدون حساسية حالة في المشاريع فقط — Inconsistent Case-Insensitive Search
**الملف**: `src/app/api/projects/route.ts` (سطر 130-136)

```typescript
{ name: { contains: search } },           // ← ليس insensitiveContains!
```

بينما في `invoices/route.ts` و `tasks/route.ts`:
```typescript
{ number: insensitiveContains(search) },  // ✅ صحيح
```

**المشكلة**: على PostgreSQL (حساس للحالة)، البحث في المشاريع لن يجد نتائج إذا اختلفت حالة الأحرف.

---

### 🟡 9. بيانات HR حساسة مرئية لكل من يملك صلاحية USER_READ
**الملف**: `src/app/api/users/route.ts` (سطر 55-60)

```typescript
employee: {
  select: {
    salary: true,           // ← راتب الموظف!
    employmentStatus: true,
    hireDate: true,
  },
},
```

**المشكلة**: أي مستخدم بصلاحية `USER_READ` يمكنه رؤية رواتب جميع الموظفين.

**الإصلاح المُقترح**: تقييد حقل `salary` بصلاحية إضافية.

---

### 🟡 10. ملف `.z-ai-config` يُقرأ بدون حماية كافية
**الملفات**: `ai/chat/route.ts`, `ai/analyze-document/route.ts`, `ai/analyze-image/route.ts`

**المشكلة**: ملف `.z-ai-config` يُقرأ من 3 مواقع ويُخزّن مؤقتاً في الذاكرة للأبد. يحتوي على `apiKey` و `token`. التخزين المؤقت لا ينتهي صلاحيته أبداً.

---

### 🟡 11. تسريب معلومات في وضع التطوير — Dev Error Leak in Stripe
**الملف**: `src/app/api/stripe/checkout/route.ts` (سطر 185-186)

```typescript
details: process.env.NODE_ENV === 'development' 
  ? (error instanceof Error ? error.message : 'Unknown error') 
  : undefined,
```

**المشكلة**: رسالة الخطأ الكاملة قد تحتوي على معلومات عن بنية Stripe أو مفاتيح API.

---

### 🟡 12. حقل `days` في الإجازات يُحلل بشكل غير آمن
**الملف**: `src/app/api/leave/route.ts` (سطر 124)

```typescript
days: parseInt(days) || 1,
```

**المشكلة**: بدون تحديد الجذر (radix) والقيمة الافتراضية `1` تعني أن إجازة يومين ستصبح 1 إذا فشل `parseInt`.

---

### 🟡 13. نوع الإجازة غير مُتحقق ضد enum
**الملف**: `src/app/api/leave/route.ts` (سطر 121)

```typescript
type: type || "ANNUAL",
```

**المشكلة**: يمكن تمرير أي سلسلة كنوع إجازة.

---

### 🟡 14. مسار العقود يفتقر لفلتر `deletedAt`
**الملف**: `src/app/api/contracts/route.ts` (سطر 27)

**المشكلة**: العقود المحذوفة ناعماً قد تظهر في نتائج البحث.

---

### 🟡 15. عدم التحقق من ملكية `projectId` عند إنشاء مستند
**الملف**: `src/app/api/documents/route.ts` (سطر 129)

**المشكلة**: يمكن رفع مستند لمشروع لا يتبع مؤسسة المستخدم.

---

### 🟡 16. استجابة حذف غير متسقة
بعض المسارات تُرجع `NextResponse.json({ success: true })` بينما يجب استخدام `noContentResponse()` (204 No Content — معيار REST).

---

### 🟡 17. متغير `_totalRemaining` غير مُستخدم
**الملف**: `src/app/api/reports/financial/route.ts` (سطر 22)

**المشكلة**: مؤشر على كود غير مكتمل. المبلغ المتبقي الإجمالي معلومة مهمة يجب إرجاعها.

---

### 🟡 18. مسار chat AI بدون حد لطول الرسالة
**الملف**: `src/app/api/ai/chat/route.ts`

**المشكلة**: رسالة المستخدم لا يوجد لها حد أقصى للطول. يسمح بإرهاق موارد AI.

---

### 🟡 19. `console.info` بدلاً من `log.info` في Stripe
**الملف**: `src/app/api/stripe/checkout/route.ts` (سطر 95)

**المشكلة**: يجب استخدام `log.info()` المتوفر في المشروع.

---

### 🟡 20. مسار التقارير المالية بدون معاملات نطاق زمني
**الملف**: `src/app/api/reports/financial/route.ts`

**المشكلة**: النطاق الزمني hardcoded لآخر 6 أشهر.

---

### 🟡 21. معاملات تصفية غير مُتحققة — Unvalidated Query Parameters
**الملفات المتأثرة**: جميع مسارات GET

```typescript
const status = searchParams.get("status");
const clientId = searchParams.get("clientId");
```

**المشكلة**: معاملات التصفية تُمرر مباشرة لـ Prisma بدون تحقق Zod. ليس خطر حقن SQL لكن يسمح بقيم enum غير صالحة.

---

### 🟡 22. محتوى AI مضمن في مسار chat ضخم
**الملف**: `src/app/api/ai/chat/route.ts` (~950+ سطر)

**المشكلة**: ملف chat وحده يتجاوز 950 سطراً مع استجابات demo مُضمّنة. يجب فصل:
- منطق AI عن منطق البحث عن السياق
- استجابات Demo في ملف منفصل
- ملف إعداد AI في وحدة منفصلة

---

## 🟢 نقاط إيجابية إضافية

### 🟢 1. حماية تصعيد الصلاحيات في إنشاء المستخدمين
**الملف**: `users/route.ts` (سطر 92-110)
- ✅ لا يمكن لمدير إنشاء حساب مدير
- ✅ التحقق من مستوى الدور مقابل المُنشئ

### 🟢 2. استبعاد `role` من schema تحديث المستخدم
**الملف**: `users/[id]/route.ts` (سطر 87-88)
- ✅ مع تعليق واضح يشرح أن تغيير الدور يتطلب مسار مخصص

### 🟢 3. منع حذف الحساب الذاتي
**الملف**: `users/[id]/route.ts` (سطر 122-124)

### 🟢 4. ترقيم صفحات جيد في الأدوات المساعدة
**الملف**: `utils/pagination.ts` - حد أقصى 100، بيانات تعريف كاملة

### 🟢 5. توقيع Webhook Stripe مُتحقق
**الملف**: `stripe/webhook/route.ts` - `constructWebhookEvent()` يتحقق من التوقيع

### 🟢 6. بحث آمن مع عزل صلاحيات
**الملف**: `search/route.ts` - كل نوع كيان يتطلب صلاحية قراءة منفصلة

### 🟢 7. أصل مصادقة createdById من JWT
جميع مسارات POST تستخدم `createdById: ctx.userId` من الرمز وليس من جسم الطلب

### 🟢 8. ترتيب التحقق والتنظيف الصحيح في المشاريع
**الملف**: `projects/route.ts` - التحقق أولاً ثم التنظيف

### 🟢 9. التحقق من أصل الدفع في Stripe
**الملف**: `stripe/checkout/route.ts` - التحقق من `Origin` مقابل `CORS_ORIGINS`

---

## ملخص الأولويات

### 🔴 حرج — يجب إصلاحه فوراً (5 مشاكل)
| # | المسار | المشكلة |
|---|--------|---------|
| 1 | ai/analyze-image | ثغرة SSRF — قبول روابط HTTP خارجية بدون تحقق |
| 2 | ai/analyze-document + analyze-image | عدم التحقق من المدخلات بـ Zod |
| 3 | stripe/checkout | عدم التحقق من مدخلات الدفع بـ Zod |
| 4 | documents/[id] DELETE | حذف فعلي بدلاً من حذف ناعم |
| 5 | budgets GET | صلاحية `BUDGET_MANAGE` (كتابة) مطلوبة للقراءة |

### 🟡 تحذير — يجب إصلاحه قريباً (22 مشكلة)
| # | المسار | المشكلة |
|---|--------|---------|
| 1 | جميع المسارات | عدم اتساق تنسيق الاستجابة |
| 2 | invoices, contracts, tasks, payments, employees, attendance | استخدام واسع لـ `as any` |
| 3 | tasks POST | تجاوز تحقق Zod لحقل `progress` |
| 4 | documents POST | عدم التحقق من محتوى الملف الفعلي (magic bytes) |
| 5 | documents POST (JSON) | عدم التحقق من المدخلات بـ Zod |
| 6 | 8+ مسارات GET | تحديد معدل مفقود |
| 7 | budgets, attendance, leave, documents | ترقيم صفحات مفقود |
| 8 | projects GET | بحث حساس للحالة على PostgreSQL |
| 9 | users GET | راتب الموظفين مرئي لكل من يملك USER_READ |
| 10 | ai/chat, ai/analyze-* | ملف `.z-ai-config` يُقرأ بدون حماية |
| 11 | stripe/checkout | تسريب معلومات في وضع التطوير |
| 12 | leave POST | `days` يُحلل بشكل غير آمن |
| 13 | leave POST | نوع الإجازة غير مُتحقق ضد enum |
| 14 | contracts GET | فلتر `deletedAt` مفقود |
| 15 | documents POST | عدم التحقق من ملكية `projectId` |
| 16 | DELETE routes | استجابة حذف غير متسقة |
| 17 | reports/financial | متغير غير مُستخدم (`_totalRemaining`) |
| 18 | ai/chat | عدم وجود حد لطول الرسالة |
| 19 | stripe/checkout | `console.info` بدلاً من `log.info` |
| 20 | reports/financial | نطاق زمني مُ hardcoded |
| 21 | جميع مسارات GET | معاملات تصفية غير مُتحققة |
| 22 | ai/chat | ملف ضخم (950+ سطر) يحتاج إعادة هيكلة |

---

## التوصيات الرئيسية

1. **إصلاح ثغرة SSRF فوراً** — قبول روابط HTTP خارجية في مسار تحليل الصور يمثل خطراً أمنياً خطيراً
2. **إضافة تحقق Zod لكل مسار** — خاصة AI و Stripe و Documents (JSON path)
3. **توحيد تنسيق الاستجابة** — استخدام `successResponse()` / `errorResponse()` من `utils/response.ts` في كل مكان
4. **إزالة `as any`** — استخدام أنواع Prisma الفعلية (`InvoiceStatus`، `TaskPriority`، إلخ)
5. **إضافة ترقيم صفحات** — لكل مسارات GET التي تُرجع قوائم بدون ترقيم
6. **تحديد معدل لكل المسارات** — حتى مسارات القراءة
7. **إصلاح الحذف الناعم للمستندات** — التوافق مع باقي الموارد
8. **تقييد الوصول للرواتب** — فصل صلاحية `USER_READ` عن `SALARY_READ`
9. **إضافة حد لطول رسالة AI** — منع إرهاق الموارد
10. **التحقق من محتوى الملفات** — استخدام magic bytes بدلاً من الاعتماد على الامتداد فقط

---

*انتهى التدقيق — تم فحص 30 مسار API عبر 5 أدوات مساعدة و 25 مسار تشغيلي*

---

# تقرير التدقيق العميق — مكونات React
## تاريخ التدقيق: 2026-03-05 | المُدقّق: Senior React/Next.js Code Auditor | المهمة: #5
## النظام: BluePrint ERP | النطاق: React Components (23 ملف من أصل 343)

---

## نظرة عامة

| المعيار | القيمة |
|---------|--------|
| إجمالي الملفات المُدققة | **23 ملف** |
| إجمالي الأسطر المفحوصة | **~8,000+ سطر** |
| الثغرات الحرجة (🔴) | **6** |
| التحذيرات (🟡) | **24** |
| الملاحظات الإيجابية (🟢) | **14** |
| فئات التدقيق | 'use client/server', hooks, memory leaks, loading/error, XSS, keys, props, re-renders, a11y, RTL, error boundaries, types, null checks, i18n, Framer Motion, console.log |

---

## 🔴 الثغرات الحرجة (Critical)

### 🔴 1. `dangerouslySetInnerHTML` في ملف Layout الجذري — XSS Vector
**الملف**: `src/app/layout.tsx` (سطر 66-69)

```html
<script
  dangerouslySetInnerHTML={{
    __html: `(function(){try{var l=localStorage.getItem("blueprint-lang")||"ar";document.documentElement.lang=l;document.documentElement.dir=l==="ar"?"rtl":"ltr"}catch(e){}})()`,
  }}
/>
```

**المشكلة**: رغم أن السكربت الحالي ثابت ولا يحتوي على مدخلات مستخدم، إلا أن نمط `dangerouslySetInnerHTML` في ملف Layout الجذري يُمثّل نقطة انطلاق خطيرة. إذا أُضيف أي متغير ديناميكي مستقبلاً، سيكون هناك خطر XSS مباشر. كما أن `<script>` في `<head>` يمنع Next.js من تطبيق سياسة أمان المحتوى (CSP) على هذا السكربت.

**الإصلاح المُقترح**: استخدام `next/script` مع `strategy="beforeInteractive"` أو نقل المنطق إلى `ThemeProvider`:

---

### 🔴 2. تسريب بيانات اعتماد Demo في كود العميل — Credential Exposure
**الملف**: `src/components/auth/login-page.tsx` (سطر 40-53)

```typescript
const ROLES = [
  { value: "admin@blueprint.ae", labelAr: "المدير العام", labelEn: "Admin" },
  { value: "pm@blueprint.ae", labelAr: "مدير مشاريع", labelEn: "Manager" },
  // ... 10 بريداً إلكترونياً آخر
];
```

**المشكلة**: مصفوفة `ROLES` تُخزّن عناوين بريد إلكتروني حقيقية في كود العميل ('use client'). هذه تُكشف لكل مستخدم (بما فيهم المهاجمون). مع كلمات مرور demo المُرسلة من `/api/auth/demo-credentials`، يُمكن تسجيل الدخول بأي دور.

**التأثير**: مهاجم يُمكنه الدخول كـ admin مباشرة في وضع demo.

**الإصلاح المُقترح**: 
1. إزالة `ROLES` من كود العميل واستخدام API endpoint لجلبها
2. تعطيل demo credentials في الإنتاج عبر `NODE_ENV` check

---

### 🔴 3. طلبات شبكة مكررة لنفس النقطة — Duplicate API Calls
**الملف**: `src/components/layout/app-layout.tsx` (سطر 208-216) و `src/components/layout/sidebar-stats.tsx` (سطر 21-29)

كلا المكونين يستدعيان `/api/dashboard?statsOnly=true` بنفس `queryKey` مختلف:
- `SidebarQuickStats`: `queryKey: ["sidebar-stats"]`  
- `SidebarStats`: `queryKey: ["sidebar-quick-stats"]`

**المشكلة**: نظراً لاختلاف `queryKey`، يُرسل React Query **طلبين منفصلين** لنفس الـ endpoint في كل مرة يُفتح فيها الـ sidebar. مع `refetchInterval: 60000`، هذا يعني طلبين كل دقيقة.

**الإصلاح المُقترح**: توحيد `queryKey` لكلا الاستعلامين أو دمج المكونين:

```typescript
// استخدم نفس queryKey
queryKey: ["sidebar-stats"]
```

---

### 🔴 4. استخدام `window.confirm()` للحذف — ليس متاحاً ولا آمناً
**الملف**: `src/components/pages/tasks/task-kanban.tsx` (سطر 82) و `src/components/pages/invoices.tsx` (سطر 275)

```typescript
if (confirm(ar ? `هل أنت متأكد من حذف "${taskTitle}"؟` : `Delete "${taskTitle}"?`)) {
  deleteMutation.mutate();
}
```

**المشكلة**: 
1. `window.confirm()` يُوقف الخيط الرئيسي (blocking)
2. غير قابل للتنسيق ولا يدعم RTL بشكل صحيح
3. لا يُمكن ترجمته بشكل كامل (أزرار المتصفح باللغة الإنجليزية دائماً)
4. لا يُمكن الوصول إليه عبر قارئات الشاشة بشكل موثوق
5. في بعض المتصفحات المُقيّدة، يُمكن تعطيله

**الإصلاح المُقترح**: استخدام `<AlertDialog>` من shadcn/ui بدلاً من `confirm()`.

---

### 🔴 5. قراءة حالة React داخل Promise — Anti-pattern خطير
**الملف**: `src/components/pages/ai-assistant.tsx` (سطر 302-307)

```typescript
const currentMessages = await new Promise<Message[]>((resolve) => {
  setMessages((prev) => {
    resolve(prev);
    return prev;
  });
});
```

**المشكلة**: هذا النمط يُسيء استخدام `setState` callback لقراءة الحالة داخل `catch` block. هذا:
1. **مُضاد للأنماط** — يُخالف مبادئ React
2. قد يُسبب سلوكاً غير متوقع في Strict Mode (استدعاء مزدوج)
3. يُعقد تتبع الأخطاء بشكل كبير
4. غير مضمون في الإصدارات المستقبلية من React

**الإصلاح المُقترح**: استخدام `useRef` لتتبع آخر حالة:

```typescript
const messagesRef = useRef<Message[]>([]);
// تحديث ref في كل مرة تتغير messages
useEffect(() => { messagesRef.current = messages; }, [messages]);
// ثم استخدام messagesRef.current في catch
```

---

### 🔴 6. مكونات صفحة كاملة تُحمّل ديناميكياً بدون SSR — تأثير SEO
**الملف**: `src/components/layout/app-layout.tsx` (سطر 94-128)

```typescript
const Dashboard = dynamic(() => import("@/components/pages/dashboard"), { loading: PageLoading });
const InvoicesPage = dynamic(() => import("@/components/pages/invoices"), { loading: PageLoading });
// ... 30+ مكوناً
```

**المشكلة**: جميع مكونات الصفحات (34+) تُحمّل ديناميكياً بدون `ssr: false`. بينما هذا جيد لأداء التحميل الأولي، إلا أن:
1. لا يوجد `suspense` boundary منفصل لكل صفحة
2. إذا فشل تحميل مكون (شبكة ضعيفة)، يظهر `PageLoading` بدون أي زر إعادة محاولة
3. المكون `PageLoading` يستدعي `<PageLoadingSkeleton statCards={3} showChart={false} />` لكل الصفحات، حتى تلك التي ليست Dashboard

**الإصلاح المُقترح**: إضافة Error Boundary لكل صفحة مع زر إعادة محاولة.

---

## 🟡 التحذيرات (Warnings)

### 🟡 1. مكون صفحة هبوط ضخم — 590 سطر في مكون واحد
**الملف**: `src/app/page.tsx`

**المشكلة**: المكون `LandingPage` يحتوي على 590 سطراً مع 14 حالة `useState`. هذا:
- صعب الصيانة والاختبار
- يُعيد التصيير بالكامل عند تغيير أي حالة
- يجب تقسيمه إلى مكونات فرعية (HeroSection, StatsSection, ProjectsSection, ServicesSection, ContactSection, Footer)

---

### 🟡 2. طلب fetch بدون AbortController — تسريب ذاكرة محتمل
**الملف**: `src/app/page.tsx` (سطر 44-58)

```typescript
useEffect(() => {
  fetch('/api/public/stats')
    .then(res => res.ok ? res.json() : null)
    .then(data => { /* ... */ })
    .catch(() => {});
}, []);
```

**المشكلة**: لا يوجد AbortController لإلغاء الطلب إذا غادر المستخدم الصفحة قبل اكتماله. الـ `catch(() => {})` يبتلع الأخطاء بصمت.

**الإصلاح المُقترح**:
```typescript
useEffect(() => {
  const controller = new AbortController();
  fetch('/api/public/stats', { signal: controller.signal })
    .then(...)
    .catch((e) => { if (!e.name?.includes('Abort')) console.error(e); });
  return () => controller.abort();
}, []);
```

---

### 🟡 3. `console.error` متروك في كود الإنتاج
**الملفات**:
- `src/app/error.tsx` (سطر 19): `console.error("Application error:", error);`
- `src/app/global-error.tsx` (سطر 24): `console.error("[GlobalError] Unhandled error:", error);`

**المشكلة**: هذا يُسجّل بيانات الخطأ (التي قد تحتوي على معلومات حساسة) في وحدة تحكم المتصفح. يجب إرسالها إلى خدمة تتبع الأخطاء (مثل Sentry) بدلاً من ذلك.

---

### 🟡 4. `as any` في نماذج Zod — فقدان أمان الأنواع
**الملفات**:
- `src/components/pages/invoices.tsx` (سطر 53): `resolver: zodResolver(invoiceSchema) as any`
- `src/components/pages/project-form.tsx` (سطر 62): `resolver: zodResolver(projectSchema) as any`

**المشكلة**: استخدام `as any` يُلغي فائدة TypeScript في نماذج الإدخال — أكثر الأماكن أهمية للتحقق من الأنواع في نظام ERP.

**الإصلاح المُقترح**: استخدام `Resolver<InvoiceFormData>` كما في client-form.tsx (سطر 76):
```typescript
resolver: zodResolver(invoiceSchema) as Resolver<InvoiceFormData>,
```

---

### 🟡 5. استخدام الفهرس كمفتاح في قوائم — `key={i}`
**الملف**: `src/components/pages/dashboard/stat-cards.tsx` (سطر 40)

```typescript
{statCards.map((card, i) => (
  <motion.div key={i} variants={fadeUp} custom={i}>
```

**المشكلة**: استخدام الفهرس كمفتاح يُسبب مشاكل في React reconciliation إذا تغير ترتيب البطاقات أو أُضيفت بطاقة جديدة. رغم أن البطاقات حالياً ثابتة (4 بطاقات)، إلا أن هذا نمط خاطئ.

**الإصلاح المُقترح**: استخدام معرّف فريد مثل `card.label`:
```typescript
<motion.div key={card.label} variants={fadeUp} custom={i}>
```

---

### 🟡 6. `not-found.tsx` بدون دعم i18n — نصوص عربية مُشفّرة
**الملف**: `src/app/not-found.tsx`

```typescript
<h2 className="...">الصفحة غير موجودة</h2>
<p className="...">عذراً، الصفحة التي تبحث عنها غير موجودة أو تم نقلها.</p>
```

**المشكلة**: جميع النصوص عربية مُشفّرة بدون دعم ثنائي اللغة. عندما يُغيّر المستخدم اللغة لإنجليزية، صفحة 404 تظل بالعربية.

**الإصلاح المُقترح**: استخدام `useLanguage()` hook أو تمرير `language` prop.

---

### 🟡 7. ملف app-layout.tsx ضخم — 937 سطر
**الملف**: `src/components/layout/app-layout.tsx`

**المشكلة**: الملف يحتوي على 5 مكونات مختلفة (`SidebarQuickStats`, `AppSidebar`, `AppHeader`, `AppLayout`, `groupNavItems`) ومئات الأسطر. هذا:
- صعب الاختبار
- يُبطئ مراجعة الكود
- يزيد من احتمال تعارضات Git

**الإصلاح المُقترح**: تقسيم إلى ملفات منفصلة:
- `sidebar/app-sidebar.tsx`
- `sidebar/sidebar-quick-stats.tsx`
- `header/app-header.tsx`
- `app-layout.tsx` (فقط الجسم الرئيسي)

---

### 🟡 8. `SidebarQuickStats` مُعرّف داخل app-layout.tsx بدلاً من ملف منفصل
**الملف**: `src/components/layout/app-layout.tsx` (سطر 205-241)

**المشكلة**: `SidebarQuickStats` مُعرّف كـ function داخل نفس الملف الضخم. هذا يمنع:
1. استخدامه في أماكن أخرى
2. اختباره بشكل منفصل
3. تحميله بشكل كسول

---

### 🟡 9. قائمة الصفحات الثابتة هشة — Hard-coded page list
**الملف**: `src/components/layout/app-layout.tsx` (سطر 888-906)

```typescript
{!["dashboard", "projects", "clients", "contractors",
   "finance-revenue", "finance-expenses", "finance-reports",
   // ... 30+ معرّف صفحة
   "hr-employees", "hr-attendance", "hr-leave", "hr-workload",
].includes(currentPage) && (
  /* صفحة "قيد التطوير" */
)}
```

**المشكلة**: قائمة معرّفات الصفحات مُشفّرة يدوياً ومُكررة مرتين (مرة في الشروط ومرة في القائمة). إضافة صفحة جديدة تتطلب تعديل ثلاثة أماكن على الأقل.

**الإصلاح المُقترح**: استخدام Map أو Record:
```typescript
const PAGE_COMPONENTS: Record<string, React.LazyExoticComponent<...>> = {
  dashboard: Dashboard,
  projects: ProjectsList,
  // ...
};
const PageComponent = PAGE_COMPONENTS[currentPage];
```

---

### 🟡 10. إشعارات غير مقروءة مُشفّرة كـ 0 — Hardcoded unread count
**الملف**: `src/components/layout/sidebar-stats.tsx` (سطر 37)

```typescript
const unreadNotifs = 0;
```

**المشكلة**: عدد الإشعارات غير المقروءة مُشفّر كـ 0 دائماً مع تعليق "static placeholder". هذا يُظهر بيانات خاطئة للمستخدم.

**الإصلاح المُقترح**: جلب العدد من API أو إزالة الإحصائية.

---

### 🟡 11. أنيميشن Framer Motion لا نهائي — استهلاك موارد
**الملف**: `src/app/page.tsx` (سطر 222-231)

```typescript
<motion.div
  animate={{ scale: [1, 1.2, 1], opacity: [0.05, 0.1, 0.05] }}
  transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
/>
<motion.div
  animate={{ scale: [1, 1.3, 1], opacity: [0.05, 0.1, 0.05] }}
  transition={{ duration: 5, repeat: Infinity, ease: "easeInOut", delay: 0.5 }}
/>
```

**المشكلة**: أنيميشن لا نهائي يحتاج GPU طوال الوقت. على الأجهزة الضعيفة، هذا:
1. يُستهلك البطارية
2. يُقلل أداء الصفحة
3. يُسبب مشاكل لأصحاب اضطرابات الحركة ( vestibular disorders)

**الإصلاح المُقترح**: استخدام `prefers-reduced-motion` media query:
```typescript
const prefersReducedMotion = usePrefersReducedMotion();
// وتعطيل الأنيميشن إذا كان مُفعّلاً
```

---

### 🟡 12. `handleRequestApproval` يستخدم بيانات مُشفّرة — Hardcoded strings
**الملف**: `src/components/pages/invoices.tsx` (سطر 278-301)

```typescript
body: JSON.stringify({
  requestedBy: "المستخدم الحالي",
  assignedTo: "المدير",
  // ...
}),
```

**المشكلة**: 
1. `requestedBy` مُشفّر كنص عربي بدلاً من استخدام معرّف المستخدم الحالي
2. `assignedTo` مُشفّر كـ "المدير" بدلاً من جلب المدير الفعلي
3. هذه البيانات ستكون خاطئة في النسخة الإنجليزية

---

### 🟡 13. ضريبة VAT مُشفّرة كـ 5% — Hardcoded tax rate
**الملف**: `src/components/pages/invoices.tsx` (سطر 103, 132, 262)

```typescript
const tax = subtotal * 0.05;
```

**المشكلة**: نسبة ضريبة القيمة المضافة (5% للإمارات) مُشفّرة في 3 أماكن. إذا تغيرت النسبة أو احتاج النظام لدعم دول أخرى، يجب تعديل 3 أماكن.

**الإصلاح المُقترح**: تعريف ثابت مركزي:
```typescript
const VAT_RATE = 0.05; // UAE VAT
```

---

### 🟡 14. `gantt-timeline.tsx` بدون `'use client'` — لكنه يعمل كـ client component
**الملف**: `src/components/pages/dashboard/gantt-timeline.tsx`

**المشكلة**: الملف لا يبدأ بـ `'use client'` لكنه يُستخدم داخل client components. هذا يعمل حالياً لأنه "مُستهلك" من client component، لكنه:
1. يُضلل المطورين
2. إذا حاول أحد استخدامه كـ server component، سيفشل
3. من الأفضل إضافة `'use client'` صراحةً

---

### 🟡 15. رفع ملفات بدون تحقيق — Stub upload handlers
**الملف**: `src/components/pages/client-form.tsx` (سطر 668-676)

```typescript
onClick={() => {
  const input = document.createElement("input");
  input.type = "file";
  input.onchange = () => {
    if (input.files && input.files[0]) {
      // File selected — upload logic to be implemented
    }
  };
  input.click();
}}
```

**المشكلة**: رفع الملفات "وهمي" — يفتح منتقي الملفات لكن لا يرفع أي شيء. المستخدم يعتقد أنه رفع ملفاً لكن لم يحدث شيء.

---

### 🟡 16. مفتاح `BUILDING` بأحرف كبيرة في `setFormAddress` — غير متسق
**الملف**: `src/components/pages/client-form.tsx` (سطر 478)

```typescript
onChange={(e) => setFormAddress((p) => ({ ...p, BUILDING: e.target.value }))}
```

**المشكلة**: المفتاح `BUILDING` بأحرف كبيرة بينما بقية المفاتيح صغيرة (`emirate`, `city`, `area`, `street`, `unit`). هذا سيسبب مشاكل عند إرسال البيانات أو التحقق منها.

---

### 🟡 17. `dbReady = true` دائماً — كود ميت
**الملف**: `src/components/auth/login-page.tsx` (سطر 104)

```typescript
const dbReady = true; // DB is always ready — seeding is done via `bun run db:seed`
```

**المشكلة**: هذا المتغير لا يُغيّر أبداً. الشروط المرتبطة به (`!dbReady && "opacity-60 cursor-not-allowed"`) هي كود ميت.

---

### 🟡 18. متغيرات `_toast` و `_user` غير مستخدمة — Unused variables
**الملفات**:
- `src/components/auth/login-page.tsx` (سطر 106): `const { toast: _toast } = useToast();`
- `src/components/pages/ai-assistant.tsx` (سطر 24): `const { user: _user } = useAuthStore();`
- `src/components/pages/ai-assistant.tsx` (سطر 36): `const [_availableModels, setAvailableModels]`
- `src/components/pages/ai-assistant.tsx` (سطر 72): `const [_lastApiTokens, setLastApiTokens]`

**المشكلة**: استدعاء hooks وإهمال نتيجتها يُهدر موارد ويُربك المطورين.

---

### 🟡 19. استخدام `localStorage` بدون try/catch في AI Assistant
**الملف**: `src/components/pages/ai-assistant.tsx` (سطر 34, 54-59)

```typescript
const [selectedModelId, setSelectedModelId] = useState<string>(() => {
  if (typeof window === 'undefined') return 'zai-default';
  return localStorage.getItem('bp_selected_model') || 'zai-default';
});
```

**المشكلة**: `localStorage` قد يرمي استثناءً في:
1. وضع التصفح الخاص (Safari)
2. عندما تكون مساحة التخزين ممتلئة
3. عند تعطيل التخزين المحلي عبر سياسة الأمان

---

### 🟡 20. `ChartStyle` يستخدم `dangerouslySetInnerHTML` — يجب المراجعة
**الملف**: `src/components/ui/chart.tsx` (سطر 83-101)

```typescript
<style
  dangerouslySetInnerHTML={{
    __html: Object.entries(THEMES)
      .map(/* ... */)
      .join("\n"),
  }}
/>
```

**المشكلة**: هذا نمط shadcn/ui الرسمي لكنه يُولّد CSS ديناميكياً. يجب التأكد من أن `config` لا يحتوي على مدخلات مستخدم غير مُطهّرة.

**الخطورة**: منخفضة — لأن البيانات تأتي من `ChartConfig` المُعرّف في الكود، لكن يجب توثيقها.

---

### 🟡 21. معالم المشروع (Milestones) مُشفّرة — Hardcoded milestone positions
**الملف**: `src/components/pages/dashboard/gantt-timeline.tsx` (سطر 76)

```typescript
const milestonePct = [35, 60, 45, 75, 50][idx % 5];
```

**المشكلة**: مواقع المعالم مُشفّرة ولا تعكس بيانات حقيقية من API. المستخدم يرى معالم وهمية.

---

### 🟡 22. `GanttTimeline` يعرض فقط 5 مشاريع بدون تبرير
**الملف**: `src/components/pages/dashboard/gantt-timeline.tsx` (سطر 61)

```typescript
{recentProjects.slice(0, 5).map((project, idx) => {
```

**المشكلة**: القيمة `5` مُشفّرة بدون إمكانية التخصيص أو التبرير.

---

### 🟡 23. نص تحميل الخريطة بالعربية فقط — No i18n for map loading
**الملف**: `src/components/pages/project-form.tsx` (سطر 33-36)

```typescript
loading: () => (
  <div ...>جارٍ تحميل الخريطة...</div>
),
```

**المشكلة**: نص التحميل بالعربية فقط، حتى في النسخة الإنجليزية.

---

### 🟡 24. معلومات اتصال حساسة مُشفّرة — Hardcoded contact info
**الملف**: `src/app/page.tsx` (سطر 272, 473, 482)

```html
<a href="tel:+971501611234">
info@blueprint-rak.com
رأس الخيمة، الإمارات العربية المتحدة
```

**المشكلة**: معلومات الاتصال مُشفّرة في كود العميل. يجب أن تأتي من API أو إعدادات لسهولة التحديث.

---

## 🟢 الملاحظات الإيجابية (Positive Findings)

### 🟢 1. دعم RTL ممتاز في الجذر
**الملف**: `src/app/layout.tsx`

- `<html lang="ar" dir="rtl">` — إعداد صحيح
- استخدام `--font-ibm-plex-arabic` — خط عربي احترافي
- سكربت مبكر لمنع وميض RTL — ممتاز

### 🟢 2. Error Boundaries متعددة الطبقات
- `ErrorBoundary` في `layout.tsx` (سطر 80)
- `ErrorBoundary` في `app-layout.tsx` (سطر 784)
- `error.tsx` و `global-error.tsx` — معالجة شاملة

### 🟢 3. SkipNavLink و SkipNavContent — إمكانية الوصول
**الملفات**: layout.tsx, error.tsx, global-error.tsx, app-layout.tsx
- `SkipNavLink` للتنقل بلوحة المفاتيح
- `SkipNavContent` كنقطة هدف

### 🟢 4. CSRF Provider — تنفيذ صحيح
**الملف**: `src/components/providers/csrf-provider.tsx`
- `sameSite=strict` — ممتاز
- `secure` flag في HTTPS
- `max-age=86400` — مدة معقولة
- توليد عبر `crypto.randomUUID()` — آمن

### 🟢 5. React Query Provider — النمط الموصى به
**الملف**: `src/components/providers/react-query-provider.tsx`
- `useState` lazy initializer — يمنع مشاركة الحالة على الخادم
- `staleTime: 60s` — معقول
- `refetchOnWindowFocus: false` — مناسب لنظام ERP

### 🟢 6. تحميل ديناميكي للمكونات الثقيلة
**الملف**: `src/components/layout/app-layout.tsx`
- 30+ مكوناً مُحمّلاً ديناميكياً — ممتاز لأداء التحميل الأولي
- `PageLoading` fallback — تجربة مستخدم جيدة

### 🟢 7. معالجة حالة التحميل والخطأ في Dashboard
**الملف**: `src/components/pages/dashboard.tsx`

```typescript
if (isLoading) return <DashboardSkeleton isAr={isAr} />;
if (isError || !data) { return /* ... */ }
```

### 🟢 8. فحوصات `Array.isArray` دفاعية
**الملف**: `src/components/pages/dashboard.tsx` (سطر 66-69)

```typescript
const recentProjects = Array.isArray(data?.recentProjects) ? data.recentProjects : [];
```

### 🟢 9. تنظيف useEffect بشكل صحيح
**الملفات**: app-layout.tsx, page.tsx, login-page.tsx
- إزالة event listeners في cleanup
- `AbortController` (في بعض الأماكن)

### 🟢 10. استخدام `requestAnimationFrame` لتحسين الأداء
**الملف**: `src/app/page.tsx` (سطر 70-83)
- تمرير passive listener
- استخدام rAF لتحديثات التمرير

### 🟢 11. صفحة خطأ عالمية تحتوي على `<html>` و `<body>` — صحيح لـ Next.js
**الملف**: `src/app/global-error.tsx`

### 🟢 12. Framer Motion `viewport={{ once: true }}` — منع إعادة الأنيميشن
**الملف**: `src/app/page.tsx`

### 🟢 13. Sidebar `sr-only` text للإمكانية
**الملف**: `src/components/ui/sidebar.tsx` (سطر 277)

### 🟢 14. استخدام `Zod` للتحقق من صحة النماذج
**الملفات**: invoices.tsx, project-form.tsx, client-form.tsx

---

## ملخص الأولويات

### 🔴 حرج — يجب إصلاحه فوراً (6 مشاكل)
| # | الملف | المشكلة |
|---|-------|---------|
| 1 | layout.tsx | `dangerouslySetInnerHTML` في ملف Layout الجذري |
| 2 | login-page.tsx | عناوين بريد إلكتروني حقيقية في كود العميل |
| 3 | app-layout.tsx + sidebar-stats.tsx | طلبات شبكة مكررة لنفس endpoint |
| 4 | task-kanban.tsx + invoices.tsx | `window.confirm()` غير متاح ولا آمن |
| 5 | ai-assistant.tsx | قراءة حالة React داخل Promise — anti-pattern |
| 6 | app-layout.tsx | تحميل ديناميكي بدون Error Boundaries منفصلة |

### 🟡 تحذير — يجب إصلاحه قريباً (24 مشكلة)
| # | الملف | المشكلة |
|---|-------|---------|
| 1 | page.tsx | مكون 590 سطر — يجب تقسيمه |
| 2 | page.tsx | fetch بدون AbortController |
| 3 | error.tsx + global-error.tsx | `console.error` في الإنتاج |
| 4 | invoices.tsx + project-form.tsx | `as any` في Zod resolver |
| 5 | stat-cards.tsx | `key={i}` بدلاً من معرّف فريد |
| 6 | not-found.tsx | نصوص عربية بدون i18n |
| 7 | app-layout.tsx | ملف 937 سطر — يجب تقسيمه |
| 8 | app-layout.tsx | SidebarQuickStats داخل الملف الرئيسي |
| 9 | app-layout.tsx | قائمة صفحات ثابتة هشة |
| 10 | sidebar-stats.tsx | إشعارات غير مقروءة = 0 دائماً |
| 11 | page.tsx | أنيميشن لا نهائي بدون prefers-reduced-motion |
| 12 | invoices.tsx | بيانات مُشفّرة في handleRequestApproval |
| 13 | invoices.tsx | ضريبة VAT مُشفّرة كـ 5% |
| 14 | gantt-timeline.tsx | بدون 'use client' صريح |
| 15 | client-form.tsx | رفع ملفات وهمي |
| 16 | client-form.tsx | مفتاح BUILDING غير متسق |
| 17 | login-page.tsx | `dbReady = true` — كود ميت |
| 18 | login-page.tsx + ai-assistant.tsx | متغيرات unused |
| 19 | ai-assistant.tsx | localStorage بدون try/catch |
| 20 | chart.tsx | dangerouslySetInnerHTML في ChartStyle |
| 21 | gantt-timeline.tsx | مواقع معالم مُشفّرة |
| 22 | gantt-timeline.tsx | عرض 5 مشاريع فقط بدون مبرر |
| 23 | project-form.tsx | نص تحميل الخريطة بالعربية فقط |
| 24 | page.tsx | معلومات اتصال مُشفّرة |

### 🟢 إيجابي — نقاط القوة (14 عنصر)
- دعم RTL في الجذر
- Error Boundaries متعددة الطبقات
- SkipNavLink/SkipNavContent للوصول
- CSRF Provider صحيح
- React Query Provider بالنمط الموصى به
- تحميل ديناميكي للمكونات الثقيلة
- معالجة التحميل والخطأ في Dashboard
- فحوصات Array.isArray دفاعية
- تنظيف useEffect صحيح
- requestAnimationFrame للتمرير
- global-error.tsx يحتوي html/body
- viewport={{ once: true }} لـ Framer Motion
- sr-only text في Sidebar
- Zod للتحقق من النماذج

---

## التوصيات الرئيسية

1. **استبدال `window.confirm()` بـ AlertDialog** — ضرورة أمنية وإمكانية وصول
2. **إصلاح قراءة حالة React داخل Promise** — استخدام useRef بدلاً من ذلك
3. **توحيد queryKey في sidebar-stats** — منع طلبات مكررة
4. **تقسيم المكونات الضخمة** — page.tsx (590 سطر) و app-layout.tsx (937 سطر)
5. **إزالة البيانات الحساسة من كود العميل** — عناوين البريد الإلكتروني
6. **إضافة AbortController لكل fetch في useEffect** — منع تسريب الذاكرة
7. **استبدال `as any` بـ `Resolver<T>`** — في Zod resolvers
8. **إضافة `prefers-reduced-motion`** — لجميع الأنيميشن اللانهائية
9. **توحيد دعم i18n** — not-found.tsx ونصوص التحميل
10. **إزالة الكود الميت** — dbReady، متغيرات unused

---

*انتهى التدقيق — تم فحص 23 ملف مكون سطراً بسطر من أصل 343 مكون*

---

# تقرير التدقيق العميق — مكتبات النواة (Lib Modules)
## تاريخ التدقيق: 2026-03-05 | المُدقّق: Senior Code Auditor | المهمة: #6
## النظام: BluePrint ERP | النطاق: 35 ملف مكتبة أساسية

---

## نظرة عامة

| المعيار | القيمة |
|---------|--------|
| إجمالي الملفات المُدققة | **35 ملف** |
| إجمالي الأسطر المفحوصة | **~7,200+ سطر** |
| الثغرات الحرجة (🔴) | **6** |
| التحذيرات (🟡) | **22** |
| الملاحظات الإيجابية (🟢) | **14** |

---

## 1. طبقة عميل API (API Client Layer)

### 1.1 `auth-fetch.ts`

**🟢 الإيجابيات:**
- منع حلقة إعادة المحاولة اللانهائية عبر `X-Auth-Retry` header
- مشاركة Promise إعادة التحديث لمنع طلبات تحديث متزامنة
- إمكانية الاستعادة عبر `restoreAuthFetch()`

**🔴 حرج:**
- 🔴 **إعادة التوجيه إلى `/dashboard` عند فشل التحديث** (سطر 96): بعد فشل تحديث الرمز، يُعاد توجيه المستخدم إلى `/dashboard` بدلاً من `/login`. هذا قد يُسبب حلقة إعادة توجيه إذا كانت لوحة التحكم تتطلب مصادقة. يجب التوجيه إلى صفحة تسجيل الدخول.

**🟡 تحذيرات:**
- 🟡 **`attemptTokenRefresh` يستخدم `fetch` المُعدّل** (سطر 66): دالة تحديث الرمز تستدعي `fetch('/api/auth/refresh')` والذي يمر عبر `csrfAwareFetch` المُعدّل. هذا صحيح وظيفياً، لكن إذا كان `csrfAwareFetch` مُعطلاً، سيفشل التحديث. يجب استخدام `NATIVE_FETCH` مباشرة لتجنب الاعتماد على الطبقات المُعدّلة.
- 🟡 **لا مهلة زمنية (timeout) لطلب التحديث** (سطر 66-70): إذا كان خادم التحديث بطيئاً، ستعلق الطلبات. يُوصى بإضافة `AbortController` مع مهلة 5 ثوانٍ.

### 1.2 `csrf-fetch.ts`

**🟢 الإيجابيات:**
- تطبيق نمط Double Submit Cookie الصحيح
- الكشف الذكي لمسارات API (`url.startsWith('/api/')`)

**🟡 تحذيرات:**
- 🟡 **عدم التحقق من وجود الرمز**: إذا أعادت `getCsrfToken()` قيمة فارغة، لا يوجد سجل تحذير أو إشعار. في الإنتاج، يجب تنبيه المطور إذا كان الرمز فارغاً لطلب تحويل.
- 🟡 **`originalFetch!` تأكيد عدم القيمة الفارغة بدون تحقق** (سطر 59): استخدام `!` قد يُسبب خطأ وقت التشغيل إذا استُدعيت الدالة قبل التهيئة.

### 1.3 `fetch-client.ts`

**🟢 الإيجابيات:**
- واجهة موحدة مع أنواع TypeScript قوية
- دالة `unwrapResponse` مع `ApiError` مُهيكل
- دالة `extractErrorMessage` متينة
- دعم تحميل الملفات مع CSRF

**🔴 حرج:**
- 🔴 **`JSON.parse(text)` بدون try-catch** (سطر 83): دالة `parseResponse` تستدعي `JSON.parse(text)` بدون حماية. إذا أعاد الخادم نصاً غير JSON صالح (مثلاً: HTML خطأ من proxy)، سيُرمى استثناء غير مُعالج بدلاً من `ApiResponse` منظم.

**🟡 تحذيرات:**
- 🟡 **لا مهلة زمنية (timeout) لأي طلب**: لا يوجد `AbortController` أو `timeout` في أي دالة طلب. الطلبات قد تعلق إلى الأبد.
- 🟡 **`apiRequest` يمرر `data` كـ `URLSearchParams` لطلبات GET** (سطر 105): يتم تحويل `data` إلى `Record<string, string>` بشكل ضمني، مما قد يُسبب فقدان بيانات إذا كانت القيم كائنات متداخلة.

---

## 2. وحدة الذكاء الاصطناعي (AI Module)

### 2.1 `ai-router.ts`

**🟢 الإيجابيات:**
- دعم 16 نوع مهمة مع system prompts مُتخصصة
- اختيار نموذج تلقائي حسب نوع المهمة
- singleton pattern للـ router

**🔴 حرج:**
- 🔴 **حظر الذاكرة مع `image` كـ base64** (سطر 237-249): صورة base64 قد تكون حجمها عدة ميغابايت. تمريرها كـ `string` في `body: JSON.stringify()` يُنشئ سلسلة JSON ضخمة قد تتجاوز حد ذاكرة V8 (~1.5GB). يجب تقييد حجم الصورة أو استخدام streaming.

**🟡 تحذيرات:**
- 🟡 **لا تقييد حجم `prompt` أو `document`**: مستخدم يمكنه تمرير مستند بحجم مئات الميغابايت. يجب إضافة حد أقصى للحجم.
- 🟡 **`maxTokens: 4000` كقيمة افتراضية** (سطر 248): لبعض النماذج مثل Gemini ذات 1M token، هذا محدود جداً. يجب أن يكون متغيراً حسب النموذج.
- 🟡 **لا timeout لطلب AI** (سطر 231): طلبات AI قد تستغرق دقائق. يجب إضافة `AbortController`.
- 🟡 **`getModelDisplayName` و `isVisionModel` تعتمدان على AVAILABLE_MODELS المُصلب** (سطر 346-354): هذه القائمة لا تتضمن النماذج من `registry.ts`. يجب توحيد مصدر النماذج.

### 2.2 `model-config.ts`

**🟡 تحذيرات:**
- 🟡 **القائمة المُصلبة ستتقادم بسرعة**: أسماء النماذج وإصداراتها تتغير. يُفضل تحميلها من ملف إعداد أو API.
- 🟡 **`getBestModelForTask` يُرتب حسب التكلفة فقط** (سطر 234): لا يأخذ بالاعتبار زمن الاستجابة أو التوفر الفعلي.

### 2.3 `openai-compatible.ts`

**🟢 الإيجابيات:**
- دعم streaming مع `AsyncGenerator` وتنظيف الـ reader في `finally`
- معالجة SSE بشكل صحيح مع `buffer` للأسطر غير المكتملة

**🔴 حرج:**
- 🔴 **مفتاح API مُخزّن في الذاكرة بوضوح** (سطر 5): `this.apiKey` يُخزّن كسلسلة نصية عادية. إذا تم تفريغ الذاكرة (heap dump) أو تسريبها، يُكشف المفتاح. يُوصى بتشفيره أو استخدام `Buffer` مع مسح بعد الاستخدام.

**🟡 تحذيرات:**
- 🟡 **لا retry لطلبات API**: فشل شبكة عابر سيُرمى كاستثناء بدون إعادة محاولة.
- 🟡 **لا تقييد حجم الرد**: رد model قد يكون كبيراً جداً. يجب إضافة حد.

### 2.4 `registry.ts`

**🟢 الإيجابيات:**
- تخزين مؤقت للـ provider instances
- كشف ذكي للتوفر عبر مفاتيح البيئة
- `loggedMissing` لمنع تسجيل متكرر

**🟡 تحذيرات:**
- 🟡 **`process.env[config.apiKeyEnvVar]` يُقرأ في وقت الاستدعاء** (سطر 128): هذا يعني أن تغيير متغير البيئة أثناء التشغيل يُمكن أن يُنشئ provider جديد بمفتاح مختلف بينما القديم لا يزال في الذاكرة المؤقتة.
- 🟡 **`findProviderForModel` يُرجع أول تطابق فقط** (سطر 252): إذا كان النموذج موجوداً في عدة مزودين، قد لا يكون المزود المُرجع هو الأنسب.

---

## 3. وحدة التخزين المؤقت (Cache)

### 3.1 `cache-manager.ts`

**🟢 الإيجابيات:**
- تصميم ممتاز مع fallback للذاكرة عند تعطل Redis
- دعم tags للإبطال الجماعي
- أسماء مفتاح مُسماة (`blueprint:{feature}:{id}`)
- إحصائيات تفصيلية (hits, misses, hitRate)

**🔴 حرج:**
- 🔴 **`KEYS` command في Redis للإبطال** (سطر 394): `this.redisClient.keys(pattern)` هو أمر O(N) يحظر Redis أحادي الخيط. في الإنتاج مع ملايين المفاتيح، هذا سيُجمّد Redis لثوانٍ. يجب استخدام `SCAN` بدلاً من ذلك.

**🟡 تحذيرات:**
- 🟡 **`resetCacheManager()` يستدعي `close()` بدون `await`** (سطر 643): `_instance.close()` يُرجع Promise لكن لا يُنتظر. اتصال Redis لن يُغلق بشكل صحيح.
- 🟡 **الـ Proxy namespaces تُنشئ كائناً جديداً لكل استدعاء خاصية** (سطر 652-694): كل وصول لخاصية في `projectCache`, `taskCache` الخ يُنشئ `createCacheNamespace` جديداً. هذا غير فعال.
- 🟡 **`createCacheNamespace` يصل لحقل خاص عبر bracket notation** (سطر 577): `cacheManager['keyPrefix']` يتجاوز التغليف. إذا تغير اسم الحقل، سيفشل الكود بصمت.

### 3.2 `redis.ts`

**🟢 الإيجابيات:**
- استخدام `SCAN` بدلاً من `KEYS` في `cacheDeletePattern` — ممتاز!
- إعادة تلقائية بعد 60 ثانية من الفشل
- معدل محدود في الذاكرة عند تعطل Redis

**🟡 تحذيرات:**
- 🟡 **`setInterval` للت تنظيف لا يُنظف أبداً** (سطر 257): `setInterval` لمعدل الذاكرة يُنشئ مؤقتاً لا يُزال أبداً. في عمليات طويلة الأمد، هذا تسريب موارد.
- 🟡 **`slidingWindowRateLimit` يستخدم `Math.random()` كقيمة ZSET** (سطر 390): `Math.random()` قد يُنتج قيماً متكررة. يُفضل استخدام `${now}-${crypto.randomUUID()}`.
- 🟡 **بيانات الجلسة بدون تشفير** (سطر 422-441): بيانات الجلسة (userId, email, role) تُخزّن في Redis كنص عادي JSON. يجب تشفيرها.

### 3.3 `query-cache.ts`

**🟢 الإيجابيات:**
- قيم TTL مُخصصة حسب نوع البيانات
- `fail-open` عند فشل التخزين المؤقت — تصميم متين
- `Promise.allSettled` للإبطال الجماعي

**🟡 تحذيرات:**
- 🟡 **`cachedQuery` تُنفذ الاستعلام مرتين عند فشل التخزين المؤقت** (سطر 104-108): إذا فشلت `cacheManager.set`، سيتم تنفيذ الاستعلام مرة أخرى في `catch`. يجب تخزين النتيجة قبل `return` في `try`.

---

## 4. وحدة البريد الإلكتروني (Email)

### 4.1 `email.ts`

**🟢 الإيجابيات:**
- دعم ثلاث مزودات (SMTP, Resend, dev mode)
- طابور بريد مع إعادة محاولة exponential backoff
- تسجيل مفصل لكل حالة

**🟡 تحذيرات:**
- 🟡 **طابور البريد في الذاكرة فقط** (سطر 73): `EmailQueue` يخزن الرسائل في `Map`. عند إعادة تشغيل الخادم، تُفقد جميع الرسائل المعلقة. يجب استخدام BullMQ (الموجود بالفعل في المشروع!) بدلاً من طابور مخصص.
- 🟡 **لا تحقق من صحة عنوان البريد** (سطر 8): `to` يُقبل أي سلسلة نصية. يجب التحقق من صيغة البريد.
- 🟡 **`sendBatchEmails` تُرسل بشكل تسلسلي** (سطر 411): إرسال متتابع بطيء. يُفضل `Promise.allSettled` للإرسال المتوازي.
- 🟡 **`createTransporter` يُنشئ transporter في كل استدعاء** (سطر 252): لا يوجد تخزين مؤقت. يجب إنشاء transporter واحد وإعادة استخدامه.

### 4.2 `email-templates.ts`

**🟢 الإيجابيات:**
- `escapeHtml` لمنع XSS في القوالب
- `sanitizeUrl` يسمح فقط بـ http/https — حماية ممتازة من `javascript:` injection
- دعم ثنائي اللغة كامل

**🔴 حرج:**
- 🔴 **رمز 2FA بدون `escapeHtml`** (سطر 410): في قالب `twoFactorCode`، الرمز `code` يُعرض مباشرة في HTML بدون تنظيف: `${code}`. رغم أن الرمز يجب أن يكون أرقاماً فقط، إذا تم تمرير قيمة خبيثة، يمكن حقن HTML. يجب استخدام `escapeHtml(code)`.

**🟡 تحذيرات:**
- 🟡 **القوالب مُصلبة في الكود**: تغيير أي نص يتطلب إعادة نشر. يُفضل استخدام نظام قوالب خارجي أو تخزينها في قاعدة البيانات.

---

## 5. وحدة توليد PDF

### 5.1 `pdf-generator.ts`

**🟢 الإيجابيات:**
- استيراد ديناميكي لـ `jspdf` لتجنب التجميع في جانب العميل
- دعم RTL للغة العربية
- أنواع TypeScript قوية لبيانات التقارير

**🟡 تحذيرات:**
- 🟡 **`jspdfCache` عام بدون آلية تنظيف** (سطر 114): التخزين المؤقت لا يُنظف أبداً. في عمليات طويلة الأمد، هذا يحتفظ بالوحدات في الذاكرة.
- 🟡 **`getCompanySettings` يستعلم قاعدة البيانات في كل مرة** (سطر 559): يجب تخزينها مؤقتاً.
- 🟡 **لا توجد حدود لحجم البيانات**: تقرير بآلاف الصفوف قد يُستهلك ذاكرة كبيرة.

### 5.2 `invoice-pdf.ts` و 5.3 `contract-pdf.ts`

**🟢 الإيجابيات:**
- استعلام قاعدة البيانات مع علاقات كاملة
- تصميم PDF احترافي مع دعم ثنائي اللغة

**🔴 حرج:**
- 🔴 **لا التحقق من ملكية الفاتورة/العقد** (سطر 31 و 50): الدالتان `generateInvoicePDFBuffer` و `generateContractPDFBuffer` تأخذان `invoiceId`/`contractId` فقط بدون `userId`. أي مستخدم مصادق يمكنه توليد PDF لأي فاتورة أو عقد في النظام — ثغرة IDOR.

**🟡 تحذيرات:**
- 🟡 **`jspdfCache` مُكرر ثلاث مرات**: كل ملف PDF (`pdf-generator`, `invoice-pdf`, `contract-pdf`) يُخزن مؤقتاً `jspdf` بشكل مستقل. يجب مشاركة التخزين المؤقت.
- 🟡 **`Number(item.unitPrice)` بدون تحقق** (سطر 179): إذا كانت القيمة `null`، ستكون `0` وقد يُظهر مبلغاً خاطئاً.

---

## 6. وحدة التخزين (Storage)

### 6.1 `index.ts`

**🟢 الإيجابيات:**
- واجهة `StorageProvider` موحدة
- دالة `generateStorageKey` مع تنظيف اسم الملف

**🟡 تحذيرات:**
- 🟡 **`getStorageProvider()` يُنشئ مزوداً جديداً في كل استدعاء** (سطر 33-38): يُنشئ `new S3StorageProvider()` أو `new LocalStorageProvider()` في كل مرة. `S3StorageProvider` يُنشئ اتصال S3 جديد. يجب استخدام singleton.

### 6.2 `s3.ts`

**🟢 الإيجابيات:**
- حد أقصى لحجم الملف (50MB)
- استخدام `for await...of` لقراءة الـ stream
- `getSignedUrl` مع مدة انتهاء قابلة للتخصيص

**🟡 تحذيرات:**
- 🟡 **`exists` يُرجع `false` عند أي خطأ** (سطر 199-209): إذا كان الخطأ ليس 404 (مثلاً: خطأ شبكة)، تُرجع `false` بدلاً من رمي الاستثناء. قد يُخفي مشاكل.
- 🟡 **لا تشفير جانب الخادم (SSE)**: يجب تفعيل SSE-S3 أو SSE-KMS للبيانات الحساسة في نظام ERP.

### 6.3 `local.ts`

**🔴 حرج:**
- 🔴 **Path Traversal عبر `key`** (سطر 73): `getFullPath(key)` يربط `uploadDir` بـ `key` بدون تنظيف المسار. مهاجم يمكنه تمرير `key` مثل `../../etc/passwd` للوصول لملفات النظام. يجب التحقق من أن المسار الناتج يبقى داخل `uploadDir`:
```typescript
const fullPath = path.resolve(this.uploadDir, key);
if (!fullPath.startsWith(path.resolve(this.uploadDir))) {
  throw new Error('Invalid storage key: path traversal detected');
}
```

**🟡 تحذيرات:**
- 🟡 **`JWT_SECRET` كـ fallback لـ HMAC signing** (سطر 158): استخدام `JWT_SECRET` لتوقيع URL التخزين المحلي يعني أن تسريب مفتاح JWT يُمكّن من تزوير روابط التحميل. يجب استخدام مفتاح منفصل `STORAGE_SIGNING_KEY`.
- 🟡 **عمليات الملفات متزامنة** (سطر 76, 107, 137): `writeFileSync`, `readFileSync`, `unlinkSync` تحجب حلقة الحدث. يجب استخدام النسخ غير المتزامنة.

---

## 7. وحدة الطابور (Queue)

### 7.1 `index.ts`

**🟢 الإيجابيات:**
- إعدادات BullMQ سليمة مع exponential backoff
- تنظيف تلقائي للوظائف المكتملة والفاشلة
- دالة `closeAllWorkers` للإغلاق السليم

**🟡 تحذيرات:**
- 🟡 **`activeWorkers[queueName].close()` بدون `await`** (سطر 123): إغلاق Worker القديم غير متزامن وقد لا يكتمل قبل بدء Worker جديد. قد يُسبب معالجة مزدوجة.
- 🟡 **`startWorker` لا يُرجع Worker مُنتظر** (سطر 115): الدالة تُرجع Worker لكنها لا تنتظر اتصاله.

### 7.2 `queue/redis.ts`

**🟢 الإيجابيات:**
- اتصال Redis مشترك عبر `lazyConnect`
- إعادة محاولة مع backoff تدريجي
- إغلاق سليم عبر `closeSharedRedisConnection`

**🟡 تحذيرات:**
- 🟡 **`parseInt(url.port)` بدون base** (سطر 31): `parseInt(url.port)` يُرجع `NaN` إذا كان المنفذ فارغاً. يجب استخدام `parseInt(url.port) || 6379`.

### 7.3 `processors/email.ts`

**🟢 الإيجابيات:**
- تمييز واضح بين `sent`, `simulated`, `failed`
- رمي الاستثناء لتفعيل إعادة المحاولة في BullMQ

**🟡 تحذيرات:**
- 🟡 **لا حد أقصى لحجم البريد**: `html` يمكن أن يكون بحجم ميجابايت. يجب تقييد الحجم.

### 7.4 `processors/notification.ts`

**🟢 الإيجابيات:**
- فحص تفضيلات المستخدم قبل إرسال البريد
- فشل WebSocket لا يُعطل الإشعار (يُحفظ في قاعدة البيانات)

**🟡 تحذيرات:**
- 🟡 **استيراد ديناميكي داخل معالج** (سطر 94, 130): استيراد `websocket-service` و `queue/index` داخل المعالج بطيء. يُفضل استيرادها مرة واحدة خارج المعالج.
- 🟡 **`as any` لتجاوز النوع** (سطر 103): `payload as any` يتجاوز فحص TypeScript. يجب تعريف نوع مشترك.

---

## 8. وحدة WebSocket

### 8.1 `websocket-service.ts`

**🟢 الإيجابيات:**
- مصادقة JWT مع `issuer` و `audience` — أمان قوي
- التحقق من ملكية الإشعار قبل التحديث (IDOR protection)
- غرف مُنظمة حسب المنظمة لمنع تسريب البيانات بين المستأجرين
- Redis adapter لدعم تعدد الخوادم

**🔴 حرج:**
- 🔴 **`connectedUsers` Map ينمو بلا حدود** (سطر 47): في حالة تسريب اتصالات (متصفح لا يُرسل `disconnect`)، ستتراكم سجلات المستخدمين المتصلين في الذاكرة. يجب إضافة آلية تنظيف دورية أو حد أقصى.
- 🔴 **`sendNotificationToOrganization` تستخدم `event` كسلسلة عشوائية** (سطر 384): `io.to(roomName).emit(event as keyof ServerToClientEvents, payload as never)` يسمح بإرسال أي حدث مع أي حمولة، مما يتجاول نظام الأنواع تماماً. هذا قد يُسبب أخطاء وقت التشغيل أو سلوكاً غير متوقع.

**🟡 تحذيرات:**
- 🟡 **`getOnlineUsersInOrganization` مسح O(N)** (سطر 541): يفحص كل الاتصالات. مع آلاف الاتصالات، هذا بطيء. يجب استخدام Map مُفهرس حسب المنظمة.
- 🟡 **لا حد أقصى للاتصالات لكل مستخدم**: مستخدم واحد يمكنه فتح آلاف التبويبات وإنشاء آلاف الاتصالات. يجب تحديد الحد الأقصى.

### 8.2 `use-websocket.ts`

**🟡 تحذيرات:**
- 🟡 **`globalSocket` متغير عام بدون تنظيف عند إلغاء تحميل المكون** (سطر 307-309): `return () => { /* Don't disconnect global socket on unmount */ }` يعني أن الـ socket يبقى حياً حتى بعد إلغاء تحميل جميع المكونات. هذا قد يُسبب تسريب ذاكرة إذا تغير المستخدم.
- 🟡 **`XTransformPort: '3003'` مُصلب** (سطر 122, 298): يجب أن يكون متغير بيئة.

### 8.3 `websocket-context.tsx`

**🟢 الإيجابيات:**
- تدهور سليم: إذا فشل WebSocket، يعمل التطبيق عبر polling
- إدارة مهلات الكتابة مع تنظيف صحيح
- سياق افتراضي آمن

**🟡 تحذيرات:**
- 🟡 **قائمة إشعارات غير محدودة** (سطر 93): `notifications` يقتصر على 50 عنصراً (سطر 179)، لكن `Map` للكتابة و `Map` للمستخدمين المتصلين ينموان بلا حدود.
- 🟡 **`requestAnimationFrame(() => setWsToken(tokenProp))`** (سطر 104): استخدام `requestAnimationFrame` لتحديث الحالة عمل بديل وليس الغرض الأصلي. يُفضل `queueMicrotask` أو `flushSync`.

---

## 9. الخدمات (Services)

### 9.1 `audit.service.ts`

**🟢 الإيجابيات:**
- واجهة بسيطة ونظيفة

**🟡 تحذيرات:**
- 🟡 **لا إرجاع قيمة من `logAudit`**: لا يمكن للمتصل معرفة ما إذا نجح التدقيق أم لا. في نظام ERP، فشل التدقيق قد يكون مشكلة امتثال.
- 🟡 **لا تحقق من المدخلات**: `entityType`, `action`, `entityId` تُمرر كما هي بدون تحقق.

### 9.2 `notification.service.ts`

**🟢 الإيجابيات:**
- تصميم شامل مع convenience methods
- `markAsRead` و `delete` يتطلبان `userId` — حماية IDOR

**🟡 تحذيرات:**
- 🟡 **`createBulk` O(N×M) — N users × M inputs** (سطر 97-103): إشعارات جماعية تُنشأ واحدة تلو الأخرى. يجب استخدام `db.notification.createMany`.
- 🟡 **`pushToUser` تستخدم `as any`** (سطر 139): يتجاول نظام الأنواع.

### 9.3 `stripe.ts`

**🟢 الإيجابيات:**
- `safeStripeOp` يُغلف كل العمليات بشكل آمن
- `constructWebhookEvent` يتحقق من التوقيع
- `beforeSend` في Sentry يُنظف البيانات الحساسة

**🔴 حرج:**
- 🔴 **`mapStripeStatus` لديها تعيينات غير صحيحة** (سطر 226-238): المفاتيح مثل `ACTIVE`, `UNPAID`, `PAUSED` بأحرف كبيرة لا تتطابق مع قيم Stripe الفعلية (`active`, `unpaid`, `paused` بأحرف صغيرة). هذا يعني أن معظم حالات الاشتراك ستُرجع `'unknown'`.

**🟡 تحذيرات:**
- 🟡 **`apiVersion: '2024-12-18.acacia'` مع `@ts-expect-error`** (سطر 44): استخدام إصدار API غير مدعوم من أنواع TypeScript قد يُسبب سلوكاً غير متوقع.
- 🟡 **`retrieveCustomer` يُلقي نوعاً بدون تحقق من `deleted`** (سطر 411): Stripe يُرجع `Customer | DeletedCustomer`. التحويل القسري يتجاهل الحالة المحذوفة.
- 🟡 **لا idempotency keys**: عمليات مثل `createPaymentIntent` و `createSubscription` بدون مفاتيح idempotency. إعادة المحاولة قد تُنشئ مدفوعات مكررة.

---

## 10. ملفات أخرى

### 10.1 `validations.ts`

**🟢 الإيجابيات:**
- استخدام Zod للتحقق
- رسائل خطأ ثنائية اللغة

**🟡 تحذيرات:**
- 🟡 **أنواع `string` بدلاً من أرقام** (سطر 5): `positiveNumberStr`, `budget`, `value`, `salary` كلها `z.string()`. هذا يسمح بتمرير نصوص غير رقمية. يجب استخدام `z.number()` أو `z.coerce.number()`.
- 🟡 **لا تحقق من صيغة التواريخ** (سطر 18-19): `startDate`, `endDate` هي `optionalString` بدون التحقق من صيغة التاريخ.

### 10.2 `export-utils.ts`

**🟡 تحذيرات:**
- 🟡 **يعمل فقط في المتصفح** (سطر 51-58): يستخدم `document.createElement` و `URL.createObjectURL`. لا يعمل في Server Components. يجب إضافة تحقق من البيئة.

### 10.3 `excel-generator.ts`

**🔴 حرج:**
- 🔴 **لا تنظيف لـ workbook بعد الإنشاء** (سطر 239): `workbook.xlsx.writeBuffer()` يُنشئ بيانات في الذاكرة. يجب استدعاء `workbook.cleanup()` أو `await workbook.xlsx.writeBuffer()` داخل `try/finally` لتنظيف الموارد.

**🟡 تحذيرات:**
- 🟡 **استعلامات قاعدة بيانات متعددة بدون transaction** (سطر 222-229): `exportFinancial` يُنفذ 6+ استعلامات منفصلة. قد تُرجع بيانات غير متسقة زمنياً.

### 10.4 `workflow-engine.ts`

**🟢 الإيجابيات:**
- تصميم سير عمل مرن مع مراحل وخطوات
- إشعارات تلقائية عند الانتقال بين المراحل

**🔴 حرج:**
- 🔴 **شرط سباق في `advanceWorkflow`** (سطر 145-234): عمليات متعددة لقاعدة البيانات (update stage, update workflow, update step) تُنفذ بدون transaction. إذا فشلت إحداها، يصبح سير العمل في حالة غير متسقة. يجب تغليفها في `db.$transaction()`.

**🟡 تحذيرات:**
- 🟡 **`executeStepAction` لا تتحقق من صلاحيات المستخدم** (سطر 239): أي مستخدم يمكنه تنفيذ أي خطوة بدون التحقق من دوره. يجب التحقق من أن المستخدم يملك الدور المطلوب.
- 🟡 **`sendNotification` داخل `catch` فارغ** (سطر 411): فشل إنشاء الإشعار يُتجاهل بصمت.

### 10.5 `monitoring/performance.ts`

**🟡 تحذيرات:**
- 🟡 **`metricsStore` في الذاكرة فقط** (سطر 22): يُفقد عند إعادة التشغيل. في تعدد الخوادم، كل خادم لديه إحصائياته الخاصة. يُفضل Redis أو external monitoring.
- 🟡 **`metricsStore.shift()` بطيء O(N)** (سطر 37): Array shift يعيد ترتيب كل العناصر. يُفضل Ring Buffer أو Deque.

### 10.6 `monitoring/sentry.ts`

**🟢 الإيجابيات:**
- تحميل كسول لـ Sentry — لا يُعطل التطبيق إذا لم تكن الحزمة مثبتة
- `beforeSend` يُنظف البيانات الحساسة (authorization, cookie, password)
- تكوين Replay مع `maskAllText: true`

**🟡 تحذيرات:**
- 🟡 **`require('@sentry/nextjs')` يُنفذ مرة واحدة عند تحميل الوحدة** (سطر 129): `const Sentry = getSentry()` يُنفذ `Sentry.init()` عند استيراد الملف. هذا قد يُهيّئ Sentry قبل أن تكون المتغيرات البيئية جاهزة.
- 🟡 **`captureDatabaseError` يمرر `query` كـ extra** (سطر 213): قد يحتوي الاستعلام على بيانات حساسة (أسماء مستخدمين، كلمات مرور).

### 10.7 `logger.ts`

**🟢 الإيجابيات:**
- Winston مع مستويات مُخصصة
- تدوير يومي للسجلات مع ضغط
- دوال مساعدة متخصصة (`apiRequest`, `apiResponse`, `security`)

**🟡 تحذيرات:**
- 🟡 **`error` meta تُمرر كـ `any`** (سطر 119): `const errorMeta = error instanceof Error ? { error: error.message, stack: error.stack, ...meta } : { error, ...meta }`. إذا كان `error` كائناً كبيراً (مثلاً: كائن طلب HTTP)، قد يُسجل بيانات حساسة أو يستهلك ذاكرة كبيرة.
- 🟡 **`require('winston-daily-rotate-file')` يُنفذ مرة واحدة** (سطر 67): إذا فشل الاستيراد، لا يُعاد المحاولة أبداً. يجب أن يكون هناك آلية لإعادة المحاولة.

---

## ملخص الأولويات

### 🔴 حرج — يجب إصلاحه فوراً (6 مشاكل)
| # | الملف | المشكلة |
|---|-------|---------|
| 1 | auth-fetch.ts | إعادة توجيه إلى `/dashboard` بدلاً من `/login` عند فشل التحديث |
| 2 | fetch-client.ts | `JSON.parse` بدون try-catch في `parseResponse` |
| 3 | ai-router.ts | خطر نفاد الذاكرة مع صور base64 كبيرة |
| 4 | local.ts | ثغرة Path Traversal في `getFullPath` |
| 5 | storage/index.ts | `getStorageProvider` يُنشئ اتصالاً جديداً في كل استدعاء |
| 6 | workflow-engine.ts | شرط سباق بدون transaction في `advanceWorkflow` |

### 🔴 حرج أمني (3 مشاكل إضافية)
| # | الملف | المشكلة |
|---|-------|---------|
| 7 | openai-compatible.ts | مفتاح API مُخزّن بوضوح في الذاكرة |
| 8 | invoice-pdf.ts / contract-pdf.ts | ثغرة IDOR — لا التحقق من ملكية الفاتورة/العقد |
| 9 | email-templates.ts | رمز 2FA بدون `escapeHtml` |

### 🟡 تحذير — يجب إصلاحه قريباً (22 مشكلة)
| # | الوحدة | المشكلة الرئيسية |
|---|--------|-----------------|
| 1 | API Client | لا timeout لأي طلب HTTP |
| 2 | AI | لا تقييد حجم prompt/document/image |
| 3 | AI | لا retry لطلبات API |
| 4 | AI | `maxTokens: 4000` ثابت لكل النماذج |
| 5 | Cache | `KEYS` command في Redis يحظر الخادم |
| 6 | Cache | `resetCacheManager` بدون `await close()` |
| 7 | Email | طابور بريد في الذاكرة فقط (يُفقد عند إعادة التشغيل) |
| 8 | Email | لا تحقق من صحة عنوان البريد |
| 9 | PDF | `jspdfCache` مُكرر ثلاث مرات |
| 10 | Queue | إغلاق Worker قديم بدون `await` |
| 11 | WebSocket | `connectedUsers` Map ينمو بلا حدود |
| 12 | WebSocket | `emit` بحدث عشوائي يتجاوز نظام الأنواع |
| 13 | Notification | `createBulk` O(N×M) بدون `createMany` |
| 14 | Stripe | `mapStripeStatus` بأحرف كبيرة غير متطابقة |
| 15 | Stripe | لا idempotency keys |
| 16 | Validations | أرقام كـ `string` بدلاً من `number` |
| 17 | Excel | لا تنظيف لـ workbook بعد writeBuffer |
| 18 | Workflow | `executeStepAction` لا تتحقق من الصلاحيات |
| 19 | Performance | `metricsStore` في الذاكرة فقط |
| 20 | Logger | كائن `error` كبير قد يُسجل بيانات حساسة |
| 21 | Local Storage | عمليات ملفات متزامنة تحجب حلقة الحدث |
| 22 | Redis | `setInterval` للت تنظيف لا يُزال أبداً |

### 🟢 ملاحظات إيجابية (14)
| # | الملاحظة |
|---|----------|
| 1 | نمط Double Submit Cookie لـ CSRF مُنفذ بشكل صحيح |
| 2 |Fallback متين للذاكرة عند تعطل Redis |
| 3 | `SCAN` بدلاً من `KEYS` في `redis.ts` |
| 4 | `escapeHtml` و `sanitizeUrl` في قوالب البريد |
| 5 | مصادقة WebSocket مع JWT issuer/audience |
| 6 | حماية IDOR في تحديث الإشعارات عبر WebSocket |
| 7 | غرف مُنظمة حسب المنظمة لمنع تسريب البيانات |
| 8 | `safeStripeOp` يُغلف كل عمليات Stripe بشكل آمن |
| 9 | `beforeSend` في Sentry يُنظف البيانات الحساسة |
| 10 | تدهور سليم في WebSocket Context |
| 11 | دعم RTL في توليد PDF |
| 12 | إعادة محاولة exponential backoff في طابور البريد |
| 13 | Redis adapter لدعم تعدد خوادم WebSocket |
| 14 | استيراد ديناميكي لـ jspdf لتجنب التجميع في جانب العميل |

---

## التوصيات الرئيسية

1. **إصلاح ثغرة Path Traversal فوراً** — `local.ts` يسمح بالوصول لأي ملف على الخادم
2. **إضافة ملكية المستخدم لتوليد PDF** — IDOR في `invoice-pdf.ts` و `contract-pdf.ts`
3. **استخدام `db.$transaction()` في workflow-engine** — شرط السباق يُسبب حالة غير متسقة
4. **استبدال `KEYS` بـ `SCAN` في cache-manager** — يحظر Redis في الإنتاج
5. **استخدام BullMQ لطابور البريد** بدلاً من الطابور المخصص في الذاكرة
6. **إضافة timeout لكل طلب HTTP** — عبر `AbortController`
7. **تقييد حجم المدخلات في وحدة AI** — prompt, document, image
8. **إصلاح `mapStripeStatus`** — الأحرف الكبيرة لا تتطابق مع Stripe API
9. **تنظيف `connectedUsers` دورياً** في WebSocket
10. **استخدام `z.coerce.number()` بدلاً من `z.string()`** للأرقام في validations

---

*انتهى التدقيق — تم فحص 35 ملف مكتبة أساسية سطراً بسطر*

---

# تقرير التدقيق العميق — الاختبارات والتغطية (Tests & Coverage)
## تاريخ التدقيق: 2026-03-05 | المُدقّق: Senior QA/Code Auditor | المهمة: #7
## النظام: BluePrint ERP | النطاق: 27 ملف اختبار + 2 إعداد

---

## نظرة عامة

| المعيار | القيمة |
|---------|--------|
| إجمالي ملفات الاختبار المُدققة | **27 ملف** |
| ملفات اختبار الوحدة (Unit) | **15 ملف** |
| ملفات اختبار التكامل (Integration) | **5 ملفات** |
| ملفات اختبار نهاية-نهاية (E2E) | **5 ملفات** |
| إعدادات الاختبار | **2 ملف** |
| إجمالي الأسطر المفحوصة | **~6,800+ سطر** |
| المشاكل الحرجة (🔴) | **8** |
| التحذيرات (🟡) | **22** |
| الملاحظات (🟢) | **15** |
| نسبة التغطية الفعلية المقدّرة | **~12-18%** |
| الوحدات بدون أي اختبار | **~85% من الكود** |

---

## 🔴 المشاكل الحرجة (Critical)

### 🔴 1. اختبارات تُعيد تنفيذ المنطق بدلاً من اختبار الكود الفعلي — اختبارات وهمية

**الملفات المتأثرة**: `auth-logic.test.ts`, `logger.test.ts`, `middleware.test.ts`, `workflow.test.ts`, `websocket.test.ts`, `services.test.ts`

**المشكلة الأكبر في مجموعة الاختبارات بأكملها**: عدة ملفات اختبار تُعيد كتابة المنطق المصدري داخل ملف الاختبار نفسه بدلاً من استيراد واختبار الدوال الفعلية من الكود المصدري. هذا يعني أن **الاختبارات تختبر نسخة من المنطق كتبها المختبر وليس الكود الفعلي الذي يعمل في الإنتاج**.

أمثلة مفصلة:

**`auth-logic.test.ts`** (الأسطر 12-20): دالة `validatePasswordStrength` أُعيد تنفيذها بالكامل داخل ملف الاختبار بدلاً من استيرادها من `auth-service.ts`:
```typescript
// تم إعادة تنفيذها داخل ملف الاختبار!
validatePasswordStrength = (password: string) => {
  const errors: string[] = [];
  if (password.length < 8) errors.push('Too short');
  // ...
};
```
لو تغيّر المنطق في الملف المصدري، الاختبار لن يفشل أبدًا — لأنه يختبر نسخة مختلفة!

**`logger.test.ts`** (الأسطر 9-28): كل دوال الـ logger أُعيد تنفيذها:
```typescript
const LOG_LEVELS = { error: 0, warn: 1, info: 2, http: 3, debug: 4 };
function determineLevel(env: string): string { ... }
function formatConsoleEntry(info): string { ... }
function buildErrorMeta(error, meta): Record<string, unknown> { ... }
```
هذه لا تختبر `src/lib/logger.ts` الفعلي إطلاقاً!

**`middleware.test.ts`** (الأسطر 11-29): دالة `detectRateLimitType` أُعيد تنفيذها:
```typescript
function detectRateLimitType(pathname: string): string {
  if (pathname.includes('/api/auth/') ...) return 'auth';
  // ...
}
```
ولكن الكود الفعلي في `src/proxy.ts` قد يكون مختلفًا!

**`workflow.test.ts`** (الأسطر 35-152): كل الدوال أُعيد تنفيذها (`calculateProgress`, `isStageComplete`, `getNextStep`, `advanceStage`, إلخ). فقط `WorkflowProgress` type هو المستورد الفعلي.

**`websocket.test.ts`**: الـ `WebSocketEventType` enum أُعيد تعريفه بالكامل بدلاً من استيراده.

**`services.test.ts`**: `PREDEFINED_TEMPLATES` أُعيد تعريفها بالكامل بدلاً من استيرادها من `project-template.service.ts`.

**التأثير**: إذا أُدخل خطأ في الكود المصدري، هذه الاختبارات **لن تكتشفه** أبدًا لأنها تختبر نسخة منفصلة من المنطق. هذا يُبطل الغرض الأساسي من الاختبارات.

---

### 🔴 2. تكرار هائل في الاختبارات — مئات الأسطر المكررة

**الملفات المتأثرة**: `auth.test.ts` vs `validation.test.ts` vs `auth-flow.test.ts`, `api-routes.test.ts` vs `api-utils.test.ts`, `rbac.test.ts` vs `middleware.test.ts`

| المنطق المُختبر | عدد مرات التكرار | الملفات |
|----------------|-----------------|---------|
| `loginSchema.safeParse()` | **4 مرات** | `auth.test.ts`, `validation.test.ts`, `auth-flow.test.ts`, ومرجع في `api-routes.test.ts` |
| `isAdmin()` | **4 مرات** | `api-routes.test.ts`, `api-utils.test.ts`, `rbac.test.ts`, `auth-flow.test.ts` |
| `canApproveLeave()` | **3 مرات** | `api-routes.test.ts`, `api-utils.test.ts`, `auth-flow.test.ts` |
| `canApproveExpense()` | **3 مرات** | `api-routes.test.ts`, `api-utils.test.ts`, `auth-flow.test.ts` |
| `getClientIP()` | **3 مرات** | `api-routes.test.ts`, `api-utils.test.ts`, `init-security.test.ts` |
| `rateLimiters` وجود | **3 مرات** | `api-routes.test.ts`, `api-utils.test.ts`, `rate-limiting.test.ts` |
| `getEmptyPaginationResponse()` | **3 مرات** | `api-routes.test.ts`, `api-utils.test.ts` |
| `isHR()` / `isAccountant()` | **3 مرات** | `api-routes.test.ts`, `api-utils.test.ts`, `rbac.test.ts` |
| `orgFilter()` / `orgCreate()` | **2 مرات** | `auth-flow.test.ts`, `multi-tenant-isolation.test.ts` |
| `Token Expiration Parsing` | **2 مرات** | `auth-logic.test.ts`, `jwt.test.ts` |
| `Role Normalization` | **3 مرات** | `auth.test.ts`, `permissions.test.ts`, `auth-flow.test.ts` |
| `ROLE_PROTECTED_PATHS` | **2 مرات** | `rbac.test.ts`, `middleware.test.ts` |

**التأثير**: صيانة صعبة، تغيير واحد يتطلب تحديث ملفات متعددة، ورسالة كاذبة عن حجم التغطية.

---

### 🔴 3. ~85% من الكود المصدري بدون أي اختبار — فجوات تغطية حرجة

**الوحدات بدون أي اختبار** (قائمة جزئية):

| الوحدة | الأهمية | ملفات | اختبارات |
|--------|---------|-------|----------|
| **Repositories** (`user.repository.ts`, `base.repository.ts`, `client.repository.ts`, `project.repository.ts`) | 🔴 حرج | 4 | 0 |
| **Services** (`client.service.ts`, `task.service.ts`, `project.service.ts`, `invoice.service.ts`, `notification.service.ts`) | 🔴 حرج | 5+ | 0 |
| **auth-service.ts** (تسجيل الدخول، التسجيل، 2FA) | 🔴 حرج | 1 | 0 |
| **password.ts** (hashing, verification, reset) | 🔴 حرج | 1 | 0 |
| **PDF Generation** (`pdf-generator.ts`, `invoice-pdf.ts`, `contract-pdf.ts`, `site-report-pdf.ts`, `proposal-pdf.ts`) | 🟡 متوسط | 5 | 0 |
| **Email** (`email.ts`, `email-templates.ts`) | 🟡 متوسط | 2 | 0 |
| **Storage** (`s3.ts`, `local.ts`) | 🟡 متوسط | 2 | 0 |
| **AI Module** (`ai-router.ts`, `model-config.ts`, `engineering-knowledge.ts`, `openai-compatible.ts`, `registry.ts`) | 🟡 متوسط | 5+ | 0 |
| **Stripe** (`stripe.ts`, `stripe-types.ts`) | 🔴 حرج | 2 | 0 |
| **Queue** (`redis.ts`, processors) | 🟡 متوسط | 4 | 0 |
| **Backup** (`backup-service.ts`) | 🟡 متوسط | 1 | 0 |
| **Monitoring** (`sentry.ts`, `performance.ts`) | 🟢 منخفض | 2 | 0 |
| **Excel** (`excel-generator.ts`, `export-utils.ts`) | 🟡 متوسط | 2 | 0 |
| **Security** (`audit-logger.ts`) | 🟡 متوسط | 1 | 0 |
| **formatters.ts**, **api-error.ts**, **validations.ts** | 🟡 متوسط | 3 | 0 |
| **~120+ API route handlers** | 🔴 حرج | 120+ | 0 |
| **Hooks** (`use-*.ts`, `api/*.ts`) | 🟢 منخفض | 30+ | 0 |
| **Components** (`components/pages/*.tsx`) | 🟢 منخفض | 50+ | 0 |
| **csrf-client.ts**, **fetch-client.ts**, **auth-fetch.ts** | 🟡 متوسط | 3 | 0 |

**ملاحظة**: `auth-service.ts` هو أكثر الملفات أهمية في النظام بأكمله (~1300 سطر) ويحتوي على منطق تسجيل الدخول، التسجيل، 2FA، وتغيير كلمة المرور — **وليس له أي اختبار مباشر!**

---

### 🔴 4. اختبارات التكامل تعتمد على خادم مشغّل وتُتجاوز بصمت

**الملف**: `critical-routes.test.ts` (الأسطر 14-31)

```typescript
const BASE_URL = process.env.TEST_URL || 'http://localhost:3000';
let serverAvailable = false;

beforeAll(async () => {
  try {
    const res = await fetch(`${BASE_URL}/api/health`, { signal: AbortSignal.timeout(3000) });
    serverAvailable = res.ok;
  } catch {
    serverAvailable = false;
  }
});

function itIfServer(name: string, fn: () => Promise<void>, timeout?: number) {
  it(name, async () => {
    if (!serverAvailable) return; // skip silently when server is not running
    await fn();
  }, timeout);
}
```

**المشكلة**: إذا لم يكن الخادم مشغّلاً (الحالة الاعتيادية في CI بدون إعداد `webServer`)، **كل الاختبارات تنجح بصمت** دون تشغيل أي سطر من الكود الفعلي! هذا يُعطي انطباعاً كاذباً بأن الاختبارات ناجحة بينما لم تُجرَ أي اختبارات حقيقية.

**التأثير**: في CI/CD، قد تمر مرحلة الاختبار بنجاح بينما لم تُختبر أي مسارات فعلية.

---

### 🔴 5. اختبار هجوم التوقيت غير مستقر (Flaky) — Timing Attack Test

**الملف**: `critical-routes.test.ts` (الأسطر 70-104)

```typescript
it('should mitigate timing attacks (similar response times)', async () => {
  const timings = { existing: [], nonexistent: [] };
  for (let i = 0; i < 3; i++) {
    const start = Date.now();
    await fetch(...);
    timings.nonexistent.push(Date.now() - start);
  }
  // ...
  expect(Math.abs(avgExisting - avgNonexistent)).toBeLessThan(200);
}, 30000);
```

**المشكلة**: هذا الاختبار يعتمد على قياس الوقت الذي يتأثر بـ:
- حمل الشبكة
- حمل الخادم
- تجميع GC
- عمليات أخرى متزامنة
- دقة `Date.now()` (محدودة بـ ~1ms على بعض الأنظمة)

مع 3 عينات فقط والسماح بفارق 200ms، هذا الاختبار سيفشل بشكل عشوائي في CI مما سيُسبب إحباطاً للمطورين.

---

### 🔴 6. عتبة التغطية منخفضة جداً (50%) وتقتصر على وحدتين فقط

**الملف**: `jest.config.ts` (الأسطر 28-41)

```typescript
collectCoverageFrom: [
  'src/lib/auth/**/*.ts',
  'src/lib/config/**/*.ts',    // ← هذا المجلد غير موجود!
  '!src/**/*.d.ts',
  '!src/**/types.ts',
],
coverageThreshold: {
  global: {
    branches: 50,
    functions: 50,
    lines: 50,
    statements: 50,
  },
},
```

**المشاكل**:
1. **`collectCoverageFrom` يغطي مجلدين فقط** من أصل ~20+ مجلد في `src/lib/`
2. **`src/lib/config/**/*.ts` غير موجود** — لا يوجد هذا المجلد في الكود المصدري!
3. **عتبة 50% منخفضة جداً** لنظام ERP يتعامل مع بيانات مالية وشخصية
4. **لا تغطية لأي route handler** (~120+ ملف)
5. **لا تغطية لأي service** (8+ ملفات)
6. **لا تغطية لأي repository** (4+ ملفات)
7. **لا وجود لـ `coverage` في CI** — لا يوجد فرض لعتبات التغطية

---

### 🔴 7. اختبارات E2E ذات تأكيدات ضعيفة جداً — Weak E2E Assertions

**الملفات**: `auth.spec.ts`, `full-auth.spec.ts`, `performance-a11y.spec.ts`

أمثلة على تأكيدات ضعيفة:

```typescript
// auth.spec.ts - سطر 19
const pageContent = await page.content();
expect(pageContent).toBeDefined();  // سينجح دائماً!

// full-auth.spec.ts - سطر 31
expect(pageContent.length).toBeGreaterThan(100);  // أي صفحة أكبر من 100 حرف!

// full-auth.spec.ts - سطر 80-81
expect([400, 401, 429]).toContain(response.status());
// يسمح بـ 3 رموز مختلفة — ليس محددًا بما يكفي

// performance-a11y.spec.ts - سطر 115
expect(h1.length).toBeGreaterThanOrEqual(0);  // دائماً صحيح!

// rbac.spec.ts - سطر 117
expect([401]).toContain(response.status());
// لماذا مصفوفة بعنصر واحد؟ يجب أن يكون: expect(response.status()).toBe(401)
```

**التأثير**: هذه التأكيدات ستنجح حتى لو كان السلوك خاطئاً تماماً. لا تضمن جودة حقيقية.

---

### 🔴 8. اختبارات CSRF سطحية ولا تختبر الحماية الفعلية

**الملف**: `auth-logic.test.ts` (الأسطر 152-178)

```typescript
describe('CSRF Protection Logic', () => {
  it('should match when cookie and header are equal', () => {
    const csrfCookie = 'abc123';
    const csrfHeader = 'abc123';
    expect(csrfCookie === csrfHeader).toBe(true);  // مقارنة سلسلتين ثابتتين!
  });

  it('should generate a valid CSRF token', () => {
    const token = 'a'.repeat(32) + 'b'.repeat(32);
    expect(token).toHaveLength(64);  // هذا ليس رمز CSRF حقيقي!
    expect(/^[a-f0-9]+$/.test(token)).toBe(true);  // 'a'.repeat(32) ليس hex حقيقي!
  });
});
```

**المشكلة**: هذه الاختبارات تقارن سلاسل ثابتة وتتحقق من طول سلسلة مُنشأة يدويًا. لا تختبر أيًا من:
- توليد رمز CSRF الفعلي
- التحقق من تطابق cookie و header في طلب حقيقي
- منع طلبات بدون رمز CSRF
- انتهاء صلاحية رمز CSRF

---

## 🟡 التحذيرات (Warnings)

### 🟡 1. Playwright يختبر Chromium فقط — لا يوجد اختبار عبر المتصفحات

**الملف**: `playwright.config.ts` (الأسطر 14-19)

```typescript
projects: [
  {
    name: 'chromium',
    use: { ...devices['Desktop Chrome'] },
  },
],
```

**المشكلة**: نظام ERP يُستخدم من متصفحات مختلفة. اختبار Chromium فقط لا يكشف مشاكل Firefox أو Safari أو الأجهزة المحمولة.

---

### 🟡 2. اختبارات التخزين المؤقت (Cache) لا تختبر انتهاء الصلاحية (TTL)

**الملف**: `cache.test.ts`

**المشكلة**: رغم أن `CacheManager` يُنشأ مع `defaultTtl: 300`، لا يوجد أي اختبار يتحقق من أن القيم تنتهي صلاحيتها بعد انقضاء TTL. هذا سلوك حرج ل نظام ERP.

---

### 🟡 3. `beforeAll` للاستيراد الديناميكي — نمط هش

**الملفات**: `auth.test.ts`, `permissions.test.ts`, `security.test.ts`, `validation.test.ts`, `auth-flow.test.ts`

```typescript
beforeAll(async () => {
  const mod = await import('@/lib/api-validation');
  loginSchema = mod.loginSchema;
});
```

**المشكلة**: إذا فشل الاستيراد (مثلاً بسبب خطأ في مسار الوحدة)، `loginSchema` يبقى `undefined` وكل الاختبارات تفشل برسالة خطأ غير واضحة بدلاً من خطأ استيراد واضح. الأفضل استخدام استيراد ثابت في أعلى الملف.

---

### 🟡 4. اختبار `isDemoMode` يُعدّل `process.env` بدون `afterEach` لإعادة التعيين

**الملف**: `auth-flow.test.ts` (الأسطر 167-198)

```typescript
it('should be in demo mode in development environment', () => {
  const originalEnv = process.env.NODE_ENV;
  (process.env as Record<string, string>).NODE_ENV = 'development';
  (process.env as Record<string, string>).DEMO_MODE = 'true';
  expect(isDemoMode()).toBe(true);
  // Restore
  (process.env as Record<string, string>).NODE_ENV = originalEnv;
  // ...
});
```

**المشكلة**: إذا فشل الاختبار في منتصفه (قبل سطر الاستعادة)، يبقى `process.env` في حالة معدّلة مما يؤثر على الاختبارات اللاحقة. يجب استخدام `afterEach` لضمان الاستعادة.

---

### 🟡 5. اختبارات Rate Limiting تُنشئ مثيلات جديدة ولا تختبر المُثيلات المُسبقة التعريف

**الملفات**: `rate-limiting.test.ts`, `init-security.test.ts`

**المشكلة**: معظم اختبارات rate limiting تُنشئ مثيلات `RateLimiter` جديدة مع معلمات مخصصة بدلاً من اختبار مثيلات `rateLimiters` المُعرّفة في التطبيق الفعلي. هذا يعني أن التطبيق الفعلي قد يكون مُعدّاً بشكل مختلف عما يُختبر.

---

### 🟡 6. اختبار `requirePermission` يستخدم رمز إذن غير موجود

**الملف**: `auth-flow.test.ts` (السطر 349)

```typescript
const result = requirePermission(request as never, 'INVOICE_CREATE' as never);
```

**المشكلة**: استخدام `as never` يُلغي فحص TypeScript تمامًا. إذا تغيّرت الدالة أو نوع الإذن، لن يُكتشف الخطأ.

---

### 🟡 7. اختبارات WebSocket تختبر أنواع البيانات فقط وليس السلوك

**الملف**: `websocket.test.ts`

**المشكلة**: كل الاختبارات تقريباً تختبر أن قيم الـ enum هي سلاسل نصية محددة (مثل `expect(WebSocketEventType.CONNECT).toBe('connect')`) لكنها لا تختبر:
- الاتصال الفعلي بالخادم
- إرسال واستقبال الرسائل
- إعادة الاتصال عند الانقطاع
- الانضمام والمغادرة من الغرف
- التعامل مع الأخطاء

---

### 🟡 8. لا يوجد اختبار لـ `jwt.ts` الفعلي (وحدة JWT في auth)

**المشكلة**: `jwt.test.ts` يختبر مكتبة `jose` مباشرةً لكنه لا يختبر `src/lib/auth/modules/jwt.ts` الذي يُستخدم في التطبيق الفعلي. الدوال الحقيقية مثل `generateAccessToken`, `generateRefreshToken`, `verifyAccessToken` ليست مُختبرة.

---

### 🟡 9. لا يوجد اختبار لـ `password.ts` الفعلي

**المشكلة**: `auth-logic.test.ts` يُعيد تنفيذ منطق التحقق من كلمة المرور بدلاً من اختبار `src/lib/auth/modules/password.ts`. دوال مثل `hashPassword`, `verifyPassword`, `validatePasswordStrength` الحقيقية ليست مُختبرة.

---

### 🟡 10. اختبار SLA يختبر بيانات مُعرّفة يدوياً وليس الخدمة الفعلية

**الملف**: `services.test.ts`

**المشكلة**: كل دوال SLA (`computeEscalation`, `computeSLAStats`) أُعيد تنفيذها داخل ملف الاختبار. `sla-monitor.service.ts` الفعلي قد يحتوي على منطق مختلف تماماً.

---

### 🟡 11. لا يوجد اختبار للتعامل مع الأخطاء في مسارات API

**المشكلة**: لا يوجد أي اختبار يتحقق من سلوك المسارات عند:
- فشل اتصال قاعدة البيانات
- تجاوز وقت الاستجابة (timeout)
- بيانات غير صالحة من Prisma
- خطأ في Redis
- خطأ في إرسال البريد الإلكتروني

---

### 🟡 12. اختبارات الأداء في E2E تعتمد على `Date.now()` غير الدقيق

**الملف**: `performance-a11y.spec.ts` (الأسطر 9-30)

```typescript
const start = Date.now();
await page.goto('/');
await page.waitForLoadState('networkidle');
const loadTime = Date.now() - start;
expect(loadTime).toBeLessThan(5000);
```

**المشكلة**: `Date.now()` لا يقيس وقت التحميل الفعلي بدقة. المتغيرات البيئية (حمل الشبكة، CDN، إلخ) تجعل هذه الاختبارات غير مستقرة. الأفضل استخدام Performance API أو Lighthouse CI.

---

### 🟡 13. لا يوجد اختبار لعملية إعادة تعيين كلمة المرور بالكامل

**المشكلة**: لا يوجد اختبار تكاملي يتحقق من التدفق الكامل:
1. طلب إعادة التعيين ← 2. استلام الرابط ← 3. تعيين كلمة جديدة ← 4. تسجيل الدخول بكلمة المرور الجديدة

---

### 🟡 14. لا يوجد اختبار لعملية 2FA بالكامل

**المشكلة**: لا يوجد اختبار يتحقق من:
- تفعيل 2FA (إعداد السر)
- التحقق من رمز TOTP
- استخدام رموز الاسترداد
- تعطيل 2FA

---

### 🟡 15. اختبارات Multi-tenant تُعدّل `process.env.MULTI_TENANT` بدون تنظيف موثوق

**الملف**: `multi-tenant-isolation.test.ts`

**المشكلة**: بعض الاختبارات تُعدّل `process.env.MULTI_TENANT` وتستعيده في نهاية الاختبار، لكن بدون `afterEach` لضمان التنظيف. إذا فشل اختبار في المنتصف، يبقى المتغير البيئي معدّلاً.

---

### 🟡 16. `auth-flow.test.ts` يحتوي على سطر مُكرّر فارغ في البداية

```typescript
/**

/**
```

مشكلة صغيرة لكنها تشير إلى عدم مراجعة الكود بعناية.

---

### 🟡 17. لا يوجد اختبار لتحديث بيانات المستخدم (Profile)

**المشكلة**: مسارات `profile/route.ts`, `profile/password/route.ts`, `profile/avatar/route.ts` ليس لها أي اختبار.

---

### 🟡 18. لا يوجد اختبار لعملية دفع Stripe

**المشكلة**: مسارات Stripe (checkout, webhook, subscriptions, payment-intent, payment-methods, portal) ليس لها أي اختبار. هذه مسارات مالية حرجة.

---

### 🟡 19. اختبارات CSRF في `session.spec.ts` ضعيفة

```typescript
test('CSRF protection should block mutation without token', async ({ request }) => {
  const response = await request.post('/api/users', {
    data: { name: 'test' },
    headers: { 'Content-Type': 'application/json' },
  });
  expect([401, 403]).toContain(response.status());
});
```

**المشكلة**: الطلب بدون مصادقة يُرجع 401 بغض النظر عن CSRF. لا يمكن تمييز ما إذا كان الحظر بسبب CSRF أو بسبب عدم المصادقة.

---

### 🟡 20. Jest يستخدم `ts-jest` مع `diagnostics: false`

**الملف**: `jest.config.ts` (السطر 14)

```typescript
'^.+\\.tsx?$': ['ts-jest', {
  tsconfig: 'tsconfig.json',
  diagnostics: false,  // ← يُلغي فحص TypeScript!
  useESM: true,
}],
```

**المشكلة**: `diagnostics: false` يُلغي فحص أخطاء TypeScript أثناء تشغيل الاختبارات، مما قد يسمح بأخطاء نوعية تمر بدون اكتشاف.

---

### 🟡 21. لا يوجد اختبار snapshot أو اختبار بصري لمكونات UI

**المشكلة**: المشروع يحتوي على 50+ مكون صفحة وعشرات مكونات UI بدون أي اختبار snapshot أو اختبار بصري. التغييرات في التصميم لن تُكتشف.

---

### 🟡 22. `testMatch` يقتصر على `**/__tests__/**/*.test.ts` فقط

**الملف**: `jest.config.ts` (السطر 26)

```typescript
testMatch: ['**/__tests__/**/*.test.ts'],
```

**المشكلة**: هذا يمنع وضع اختبارات بجانب الملفات المصدرة (co-located tests) مثل `auth-service.test.ts` بجانب `auth-service.ts`.

---

## 🟢 الملاحظات الإيجابية (Positive Notes)

### 🟢 1. اختبارات JWT ممتازة
`jwt.test.ts` يختبر مكتبة `jose` بشكل شامل: التوليد، التحقق، الرفض (issuer خاطئ، audience خاطئ، انتهاء صلاحية، سر خاطئ). هذه من أفضل الاختبارات في المجموعة لأنها تختبر مكتبة حقيقية بسلوك حقيقي.

### 🟢 2. اختبارات RBAC شاملة ودقيقة
`rbac.test.ts` يستورد الأنظمة الفعلية (`Permission`, `ROLE_PERMISSIONS`, `UserRoleValues` من `@/lib/auth/types` و `authorization`) ويختبرها بشكل منهجي مع كل الأدوار والصلاحيات.

### 🟢 3. اختبارات التخزين المؤقت (Cache) جيدة
`cache.test.ts` يستورد `CacheManager` و `createCacheNamespace` الفعليين ويختبر العمليات الأساسية (set, get, delete, exists, stats, invalidate, tags, warm, namespaces).

### 🟢 4. اختبارات Rate Limiting مفصلة
`rate-limiting.test.ts` يختبر أنواعًا متعددة من المحددات (auth, strict, api, passwordReset) مع التحقق من العد التنازلي وإعادة التعيين واستجابات HTTP.

### 🟢 5. اختبارات Multi-tenant مفصلة
`multi-tenant-isolation.test.ts` يختبر عزل المستأجرين بشكل شامل مع سيناريوهات واقعية (مستأجر يحاول الوصول لبيانات مستأجر آخر).

### 🟢 6. اختبارات التحقق من صحة المدخلات (Zod) جيدة
الاختبارات التي تستخدم `loginSchema.safeParse()` تختبر مكتبة Zod الفعلية وتتحقق من حالات القبول والرفض.

### 🟢 7. تنظيم مجلدات الاختبار واضح
البنية `__tests__/unit/`, `__tests__/integration/`, `e2e/` منظمة بشكل منطقي.

### 🟢 8. اختبارات API Utils شاملة
`api-routes.test.ts` يختبر `pagination`, `response`, `rate-limit`, `auth helpers`, `db utils` بشكل مفصل مع حالات حدية.

### 🟢 9. Playwright config يستخدم `trace: 'on-first-retry'`
هذا يُسهّل تشخيص الفشل بدون استهلاك موارد كبير.

### 🟢 10. اختبارات Workflow Engine مفصلة
رغم إعادة تنفيذ المنطق، تغطية الحالات شاملة: التقدم، إكمال المرحلة، الموافقة/الرفض، التحقق من الإجراءات، الصلاحيات.

### 🟢 11. اختبارات auth-flow.test.ts جيدة التكامل
تختبر عزل الوظائف الفعلية: `getAuthContext`, `requireAuthContext`, `requirePermission`, `requireAdmin`, `hashToken`, `getAuthCookieOptions`, `getJwtSecretBytes`, `orgFilter`, `orgCreate`.

### 🟢 12. CSRF token test في E2E يتحقق من httpOnly
`auth.spec.ts` (السطر 42-44) يتحقق من أن كوكي المصادقة httpOnly.

### 🟢 13. اختبارات Security Headers في E2E
`auth.spec.ts` يتحقق من رؤوس X-Content-Type-Options, X-Frame-Options, CSP.

### 🟢 14. اختبار تسريب كلمات المرور في init
`init-security.test.ts` يتحقق من أن مسار `/api/init` لا يُرجع كلمات مرور في الاستجابة.

### 🟢 15. `forbidOnly: !!process.env.CI` في Playwright config
يمنع إدراج `.only` في CI عن طريق الخطأ.

---

## تقدير التغطية الفعلية

### الوحدات المُختبرة فعلياً (مع كود حقيقي):

| الوحدة | نسبة التغطية المقدّرة | جودة الاختبار |
|--------|----------------------|--------------|
| `lib/auth/types.ts` | ~80% | جيدة (مستوردة فعلياً) |
| `lib/auth/modules/authorization.ts` | ~70% | جيدة |
| `lib/auth/token-utils.ts` | ~60% | جيدة |
| `lib/auth/jwt-secret.ts` | ~80% | جيدة |
| `lib/auth/modules/jwt.ts` (توابع pure فقط) | ~50% | متوسطة |
| `lib/rate-limiter.ts` | ~60% | جيدة |
| `lib/rate-limit-middleware.ts` | ~40% | متوسطة |
| `lib/cache/cache-manager.ts` | ~60% | جيدة |
| `lib/cache/query-cache.ts` | ~30% | ضعيفة (ثوابت فقط) |
| `lib/security/sanitize.ts` | ~50% | متوسطة |
| `lib/api-validation.ts` | ~30% | متوسطة |
| `lib/demo-credentials.ts` | ~40% | متوسطة |
| `lib/permissions.ts` | ~60% | جيدة |
| `lib/db.ts` (getEmptyPaginationResponse فقط) | ~5% | ضعيفة |
| `app/api/utils/auth.ts` | ~50% | جيدة |
| `app/api/utils/pagination.ts` | ~80% | جيدة |
| `app/api/utils/response.ts` | ~60% | متوسطة |

### الوحدات بدون أي اختبار:

| الوحدة | الأهمية |
|--------|---------|
| `lib/auth/auth-service.ts` (~1300 سطر) | 🔴 حرج |
| `lib/auth/modules/password.ts` | 🔴 حرج |
| `lib/repositories/*` (4 ملفات) | 🔴 حرج |
| `lib/services/*` (8+ ملفات) | 🔴 حرج |
| `lib/stripe.ts` + `stripe-types.ts` | 🔴 حرج |
| `lib/email.ts` + `email-templates.ts` | 🟡 متوسط |
| `lib/storage/*` (3 ملفات) | 🟡 متوسط |
| `lib/ai/*` (6+ ملفات) | 🟡 متوسط |
| `lib/pdf/*` (5 ملفات) | 🟡 متوسط |
| `lib/queue/*` (4 ملفات) | 🟡 متوسط |
| `lib/backup-service.ts` | 🟡 متوسط |
| `lib/excel-generator.ts` + `export-utils.ts` | 🟡 متوسط |
| `lib/formatters.ts` | 🟢 منخفض |
| `lib/api-error.ts` | 🟢 منخفض |
| `lib/validations.ts` | 🟡 متوسط |
| `lib/swagger.ts` | 🟢 منخفض |
| `lib/monitoring/*` (2 ملفات) | 🟢 منخفض |
| `lib/security/audit-logger.ts` | 🟡 متوسط |
| `lib/csrf-client.ts` | 🟡 متوسط |
| `lib/api/*` (3 ملفات fetch) | 🟡 متوسط |
| `proxy.ts` | 🔴 حرج |
| **~120+ API route handlers** | 🔴 حرج |
| **~30+ React hooks** | 🟢 منخفض |
| **~50+ مكون صفحة** | 🟢 منخفض |
| **~40+ مكون UI** | 🟢 منخفض |

---

## ملخص التوصيات حسب الأولوية

### 🔴 حرج — يجب إصلاحه فوراً

| # | المشكلة | الإصلاح المقترح |
|---|---------|----------------|
| 1 | اختبارات تُعيد تنفيذ المنطق بدلاً من اختبار الكود الفعلي | استبدال كل التنفيذات المُعادة باستيرادات حقيقية من الكود المصدري |
| 2 | تكرار هائل في الاختبارات | توحيد الاختبارات المكررة في ملفات مشتركة أو إزالة التكرار |
| 3 | 85% من الكود بدون اختبار | إضافة اختبارات لـ `auth-service.ts`, `repositories`, `services`, `routes` |
| 4 | اختبارات التكامل تُتجاوز بصمت | استخدام `test.skip` بدلاً من `return` الصامت أو إضافة `webServer` في Jest |
| 5 | اختبار التوقيت غير مستقر | استخدام `bcrypt.compare` مع وقت ثابت أو زيادة العينات |
| 6 | عتبة تغطية 50% لوحدتين فقط | توسيع `collectCoverageFrom` ليشمل كل `src/lib/` ورفع العتبة |
| 7 | تأكيدات E2E ضعيفة | كتابة تأكيدات محددة بدلاً من `toBeDefined()` و `toContain([أكواد متعددة])` |
| 8 | اختبارات CSRF سطحية | اختبار توليد CSRF والتحقق الفعلي |

### 🟡 تحذير — يجب إصلاحه قريباً

| # | المشكلة | الإصلاح المقترح |
|---|---------|----------------|
| 1 | Chromium فقط في E2E | إضافة Firefox و Mobile Safari |
| 2 | Cache TTL غير مُختبر | إضافة اختبارات انتهاء صلاحية |
| 3 | `beforeAll` للاستيراد الديناميكي | استخدام استيراد ثابت |
| 4 | `process.env` بدون تنظيف موثوق | استخدام `afterEach` للتنظيف |
| 5 | Rate limiting يختبر مثيلات جديدة | اختبار مثيلات `rateLimiters` المُسبقة |
| 6 | `as never` يُلغي فحص TypeScript | استخدام الأنواع الصحيحة |
| 7 | WebSocket يختبر أنواعاً فقط | إضافة اختبارات سلوكية |
| 8 | `jwt.ts` الفعلي غير مُختبر | إضافة اختبارات لـ `generateAccessToken`, `verifyAccessToken` |
| 9 | `password.ts` الفعلي غير مُختبر | إضافة اختبارات لـ `hashPassword`, `verifyPassword` |
| 10 | SLA يختبر بيانات يدوية | استيراد الخدمة الفعلية |
| 11 | لا اختبار لأخطاء API | إضافة اختبارات error handling |
| 12 | اختبارات أداء غير مستقرة | استخدام Performance API |
| 13 | لا اختبار لإعادة تعيين كلمة المرور | إضافة تدفق اختبار كامل |
| 14 | لا اختبار لـ 2FA | إضافة تدفق اختبار كامل |
| 15 | `diagnostics: false` في ts-jest | تفعيل diagnostics |
| 16 | لا اختبار بصري أو snapshot | إضافة اختبارات بصري |

---

## تقدير جودة الاختبارات

| المعيار | التقييم | التفاصيل |
|---------|---------|----------|
| **صحة الاختبارات** | ⭐⭐⭐ (3/5) | بعض الاختبارات ممتازة، لكن كثيراً منها يختبر نسخاً من المنطق |
| **تغطية الكود** | ⭐⭐ (2/5) | ~12-18% فقط من الكود المصدري مُغطّى فعلياً |
| **جودة التأكيدات** | ⭐⭐⭐ (3/5) | اختبارات RBAC و JWT جيدة، لكن E2E و CSRF ضعيفة |
| **استقرار الاختبارات** | ⭐⭐⭐ (3/5) | معظمها مستقر لكن اختبار التوقيت هش |
| **عزل الاختبارات** | ⭐⭐⭐ (3/5) | مشاكل مع `process.env` و rate limiting الشامل |
| **صيانة الاختبارات** | ⭐⭐ (2/5) | تكرار هائل وصعوبة في التتبع |

---

*انتهى التدقيق — تم فحص 27 ملف اختبار + 2 ملف إعداد سطراً بسطر*
*تم تحليل ~6,800+ سطر من اختبارات و~500+ ملف مصدري لتحديد فجوات التغطية*
