# وثيقة خط الأساس المعماري والمحاسبي المعتمد (SYSTEM BASELINE)

**معرّف الوثيقة:** `AUD-2026-001-BASELINE`  
**الحالة:** معتمد ومجمّد للإنتاج (Production Frozen Baseline)

---

## 1. المعمارية التقنية المعتمدة (System Architecture)

- **الواجهة الأمامية (Frontend):**
  - إطار العمل: `React` + `TypeScript` + `Vite` مع تنسيقات `Tailwind CSS`.
  - دعم العمل دون اتصال (Offline-First) والمزامنة الذرية عبر صندوق الصادر (`Outbox Queue`) وعميل API الموحد (`src/api.ts`).
- **الخادم الخلفي (Backend):**
  - بيئة التشغيل: `Node.js` + `Express` (`server.ts`, `server/routes/enterpriseApi.ts`, `server/accountingEngine.ts`, `server/dataStore.ts`).
- **قواعد البيانات والتخزين الدائم (Persistence Layer):**
  - بيئة الإنتاج السحابية: `PostgreSQL` / `Neon` مع استعادة تلقائية لمخازن الشركات عند الإقلاع (`initPermanentPostgresTables`).
  - بيئة التشغيل المحلي والمتصفح: `SQLite` / `PGlite` / `IndexedDB` مع عزل صارم لكل شركة (`company_id`).
- **تطبيق سطح المكتب (Desktop Runtime):**
  - مبني على `Tauri v2` لنظام `Windows` مع سياسة أمان محتوى (`CSP Level 3`) صارمة ودعم الاتصال السحابي والمحلي.

---

## 2. القواعد المحاسبية الإلزامية (Mandatory Accounting Rules)

1. **نظام القيد المزدوج المتوازن (Balanced Double-Entry Bookkeeping):**
   - يخضع كل قيد محاسبي في دفتر اليومية العام للقاعدة الصارمة:
     $$\sum \text{المدين (Debit)} === \sum \text{الدائن (Credit)}$$
   - يُرفض برمجياً أي قيد غير متوازن أو سالب أو صفري عبر دالة التحقق الذرية قبل الترحيل.
2. **نظام الجرد المستمر (Perpetual Inventory System):**
   - تُحدَّث أرصدة المخزون وحالة التوفر (`متوفر` / `قريب من النفاذ` / `نفد`) وتكلفة البضاعة المباعة (`COGS`) لحظياً وذرياً مع كل عملية بيع أو شراء أو مرتجع أو إلغاء أو تسوية جردية.
3. **تسعير المخزون بالمتوسط المرجح للتكلفة (Weighted Average Cost - WAC):**
   - يُحتسب متوسط التكلفة المرجح للصنف عند كل عملية توريد/شراء جديدة وفق المعادلة المعتمدة قبل ترحيل قيد المخزون.
4. **دليل الحسابات القياسي الموحد (Standard Chart of Accounts):**

| رمز الحساب | اسم الحساب (عربي) | اسم الحساب (إنجليزي) | التصنيف | الطبيعة |
| :--- | :--- | :--- | :--- | :--- |
| `1101` | الصندوق / الخزينة النقدية | Cash on Hand | أصول (`ASSET`) | مدين (`DEBIT`) |
| `1102` | البنك / الحسابات الجارية | Bank Accounts | أصول (`ASSET`) | مدين (`DEBIT`) |
| `1103` | العملاء / الذمم المدينة | Accounts Receivable | أصول (`ASSET`) | مدين (`DEBIT`) |
| `1104` | المخزون السلعي | Merchandise Inventory | أصول (`ASSET`) | مدين (`DEBIT`) |
| `1105` | ضريبة القيمة المضافة - مدخلات | Input VAT Receivable | أصول (`ASSET`) | مدين (`DEBIT`) |
| `1106` | سلف وعهد الموظفين | Employee Advances & Petty Cash | أصول (`ASSET`) | مدين (`DEBIT`) |
| `1107` | المحافظ الإلكترونية والشبكات | Electronic Wallets & Mobile Money | أصول (`ASSET`) | مدين (`DEBIT`) |
| `2101` | الموردون / الذمم الدائنة | Accounts Payable | التزامات (`LIABILITY`) | دائن (`CREDIT`) |
| `2102` | ضريبة القيمة المضافة - مخرجات | Output VAT Payable | التزامات (`LIABILITY`) | دائن (`CREDIT`) |
| `3101` | رأس المال والأرباح المبقاة | Owner's Equity & Capital | حقوق ملكية (`EQUITY`) | دائن (`CREDIT`) |
| `4101` | إيرادات المبيعات | Sales Revenue | إيرادات (`REVENUE`) | دائن (`CREDIT`) |
| `4102` | مردودات ومسموحات المبيعات | Sales Returns & Allowances | إيرادات (`REVENUE`) | مدين (`DEBIT`) |
| `5101` | تكلفة البضاعة المباعة | Cost of Goods Sold (COGS) | مصروفات (`EXPENSE`) | مدين (`DEBIT`) |
| `5201-5209` | المصروفات التشغيلية والإدارية والرواتب | Operating, Admin & Payroll Expenses | مصروفات (`EXPENSE`) | مدين (`DEBIT`) |

---

## 3. قواعد الأمان وعزل الشركات (Security & Multi-Tenant Isolation)

- **العزل الصارم للشركات (Strict Multi-Tenant Isolation):**
  - تُعزل بيانات كل شركة بشكل كامل عبر معرف الشركة `company_id` المستخرج حصرياً من رمز المصادقة الموقّع (`Signed JWT Bearer Token`) للمستخدمين المصادق عليهم، ويُمنع قبول أي تلاعب بمعرّف الشركة عبر الترويسات أو المعاملات غير الموثوقة.
- **تشفير كلمات المرور والجلسات (Cryptographic Security):**
  - تُشفّر جميع كلمات المرور باستخدام خوارزمية `scrypt` مع ملح عشوائي (`Salt`) ومقارنة زمنية آمنة (`crypto.timingSafeEqual`).
  - تُوقّع رموز الجلسات (`JWT/HMAC-SHA256`) بمفتاح سري بيئي (`JWT_SECRET`) مع دعم إبطال الرموز الفوري عند تسجيل الخروج.
- **الصلاحيات والتحكم بالوصول (RBAC):**
  - تخضع كافة مسارات القراءة والكتابة والحذف والتصدير للتحقق الإلزامي من الصلاحيات (`requirePermission`) وتسجيل التدقيق (`Audit Logging`).
