# دليل حوكمة وترحيلات قاعدة البيانات (Database Migrations Governance)

**معرّف الوثيقة:** `AUD-2026-002-MIGRATIONS`

---

## 1. آلية عمل الترحيل التلقائي المنضبط

عند إقلاع الخادم وتوفر اتصال قاعدة بيانات `PostgreSQL` (`DATABASE_URL`):
1. تقوم دالة `initPermanentPostgresTables(pool)` في `server/dataStore.ts` بإنشاء جدول التتبع `schema_migrations` إن لم يكن موجوداً.
2. تقرأ الدالة كافة ملفات `.sql` الموجودة داخل مجلد `migrations/` مرتبةً أبجدياً (`001_*.sql`, `002_*.sql`, ...).
3. يتم التحقق من كل ملف مقابل جدول `schema_migrations`؛ وتُنفّذ فقط الملفات التي لم يسبق تطبيقها، ثم يُسجّل اسم الملف ورقم نسخته وتوقيت تطبيقه فوراً.

---

## 2. القواعد الإلزامية لإضافة ترحيلات جديدة

1. **التسلسل الرقمي الصارم:**
   - يجب تسمية كل ملف ترحيل جديد برقم تسلسلي مكوّن من ثلاث خانات يتبع آخر ملف معتمد:
     - `001_init_enterprise_schema.sql`
     - `002_<descriptive_name>.sql`
     - `003_<descriptive_name>.sql`
2. **منع تعديل الترحيلات المعتمدة سابقاً (Immutable Applied Migrations):**
   - يُحظر قطعيّاً تعديل أو حذف أي ملف ترحيل بعد اعتماده وتنفيذه في بيئة الإنتاج.
   - أي تغيير لاحق في الجداول أو الفهارس يجب أن يتم عبر ملف ترحيل جديد ومستقل (`ALTER TABLE ... ADD COLUMN IF NOT EXISTS ...`).
3. **الأمان وعزل الشركات وعدم التدمير (Non-Destructive & Tenant-Isolated DDL):**
   - يُمنع استخدام أوامر الحذف المدمرة (`DROP TABLE`, `TRUNCATE`, `DROP COLUMN`) على جداول بيانات العملاء.
   - يجب أن يتضمن كل جدول جديد عمود `company_id VARCHAR(64) NOT NULL` وفهرساً مخصصاً له (`CREATE INDEX IF NOT EXISTS idx_<table>_company_id ON <table> (company_id)`).
