# 📁 دليل ودليل التشغيل والنشر الذاتي للنظام على خادم Synology NAS

يقدم هذا الدليل خطة تشغيل ونشر نظام **BluePrint ERP** بنجاح على خوادم **Synology NAS** باستخدام **Container Manager** (أو Docker Compose عبر SSH)، مع تحصين الذاكرة وقواعد البيانات، ودعم حاوية **MinIO S3** للتخزين السحابي المحلي عالي السرعة.

---

## 🛠️ 1. الملفات المجهزة للإنتاج

1. **[docker-compose.prod.yml](file:///C:/Users/Dell/Desktop/blue-app-main/docker-compose.prod.yml):**
   - **`app` (Next.js Application):** معالج حد أقصى للذاكرة 1.5GB RAM ومعدل 2 Cores CPU.
   - **`postgres` (PostgreSQL 16):** قاعدة البيانات الإنتاجية مع وحدات تخزين دائمة وحماية الـ Healthcheck.
   - **`redis` (Redis 7 Alpine):** مهيأة مع خيار `--maxmemory 512mb` وسياسة `--maxmemory-policy allkeys-lru` لتجنب مشكلة الـ Swap Memory في Synology.
   - **`minio` (Local S3 Storage):** حاوية تخزين سحابي محلي فائقة السرعة للمخططات الهندسية مع واجهة إدارة Console على البورت `9001` وبورت S3 API `9000`.
   - **`backup` (Auto Backup Service):** خدمة أخذ النسخ الاحتياطية اليومية التلقائية لقاعدة البيانات الساعة 2:00 صباحاً.

2. **[Dockerfile.prod](file:///C:/Users/Dell/Desktop/blue-app-main/Dockerfile.prod):**
   - بناء مخصص على مرحلتين (Multi-stage Standalone) يقلل حجم الصورة ويضمن التشغيل السريع والأمين لـ Next.js.

---

## 🚀 2. خطوات التشغيل والنشر على Synology NAS

### الطريقة الأولى: عبر واجهة Synology Container Manager (الأسهل)

1. افتح **Container Manager** على خادم Synology.
2. انتقل إلى تبويب **Project** واضغط على **Create**.
3. قم بتسمية المشروع `blueprint-erp`.
4. حدد المسار المفضل لتخزين البيانات (مثلاً `/volume1/docker/blueprint`).
5. اختر **Upload docker-compose.yml** ثم ارفع الملف [docker-compose.prod.yml](file:///C:/Users/Dell/Desktop/blue-app-main/docker-compose.prod.yml).
6. أنشئ ملف `.env` يحتوي على متغيرات البيئة السرية:
   ```env
   NODE_ENV=production
   DATABASE_PASSWORD=StrongDatabasePassword2026!
   REDIS_PASSWORD=StrongRedisPassword2026!
   JWT_SECRET=YourSuperSecretJWTKey2026!
   ENCRYPTION_KEY=0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef
   MINIO_ROOT_USER=blueprint_admin
   MINIO_ROOT_PASSWORD=BlueprintMinioPassword2026!
   ```
7. اضغط **Next** ثم **Done** لتبدأ عملية بناء وحظر الحاوية وتفعيلها.

---

### الطريقة الثانية: عبر السطر البرمجي (SSH)

1. قم بالاتصال بخادم Synology عبر SSH:
   ```bash
   ssh admin@your-synology-ip
   ```
2. انتقل إلى مجلد المشروع وقم بتشغيل الأمر:
   ```bash
   docker-compose -f docker-compose.prod.yml up -d --build
   ```

---

## 📊 3. المنافذ المفتوحة ولوحات التحكم (Access Ports)

- **نظام BluePrint ERP الرئيسي:** `http://your-synology-ip:3000`
- **لوحة تحكم MinIO Console (إدارة التخزين):** `http://your-synology-ip:9001`
- **منفذ MinIO S3 API:** `http://your-synology-ip:9000`

---

## 🔒 4. جدول حماية الموارد وضمان عدم الانهيار (Resource Limits)

| الخدمة | الحد الأقصى للذاكرة (Memory Limit) | الحد الأقصى للمعالج (CPU Limit) |
| :--- | :---: | :---: |
| **Next.js App (`app`)** | 1.5 GB | 2.0 Cores |
| **PostgreSQL Database (`postgres`)** | 1.0 GB | 1.5 Cores |
| **MinIO S3 Storage (`minio`)** | 768 MB | 1.0 Core |
| **Redis Cache & BullMQ (`redis`)** | 512 MB | 0.75 Cores |

---

بهذا الدليل وتنسيق الحاويات المجهز، أصبح النظام جاهزاً للنشر والعمل المستقر والمحمي على خوادم Synology NAS وجميع سيرفرات Docker الخاصة!
