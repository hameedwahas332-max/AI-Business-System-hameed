export const openapiSpecification = {
  openapi: '3.0.3',
  info: {
    title: 'Enterprise ERP SaaS API',
    version: '2.0.0-phase12',
    description: 'Cloud accounting, POS, inventory, payments, and multi-tenant ERP platform',
  },
  servers: [
    {
      url: '/api/v1',
      description: 'Production API v1 Base Path',
    },
  ],
  paths: {
    '/roles/permissions': {
      get: {
        tags: ['Roles & Permissions'],
        summary: 'قائمة الصلاحيات ومصفوفة الوصول (Catalog of Permissions & RBAC Matrix)',
        responses: {
          200: {
            description: 'قائمة الصلاحيات الكاملة مع تفاصيل الوحدات',
          },
        },
      },
      post: {
        tags: ['Roles & Permissions'],
        summary: 'إنشاء أو تعديل صلاحية نظام',
        responses: {
          200: { description: 'تم تحديث الصلاحية بنجاح' },
        },
      },
    },
    '/roles': {
      get: {
        tags: ['Roles & Permissions'],
        summary: 'استعراض كافة الأدوار الوظيفية',
        responses: { 200: { description: 'قائمة الأدوار' } },
      },
      post: {
        tags: ['Roles & Permissions'],
        summary: 'إضافة دور وظيفي جديد',
        responses: { 201: { description: 'تم إنشاء الدور' } },
      },
    },
    '/roles/{id}': {
      get: {
        tags: ['Roles & Permissions'],
        summary: 'تفاصيل دور وظيفي محدد',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { 200: { description: 'تفاصيل الدور' } },
      },
      put: {
        tags: ['Roles & Permissions'],
        summary: 'تعديل بيانات الدور الوظيفي',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { 200: { description: 'تم التعديل' } },
      },
      delete: {
        tags: ['Roles & Permissions'],
        summary: 'حذف دور وظيفي مخصص',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { 200: { description: 'تم الحذف' } },
      },
    },
    '/roles/{id}/permissions': {
      put: {
        tags: ['Roles & Permissions'],
        summary: 'تحديث مصفوفة صلاحيات الدور',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { 200: { description: 'تم تحديث الصلاحيات' } },
      },
    },
    '/users': {
      get: {
        tags: ['Users Management'],
        summary: 'استعراض مستخدمي النظام',
        responses: { 200: { description: 'قائمة المستخدمين' } },
      },
      post: {
        tags: ['Users Management'],
        summary: 'إضافة مستخدم جديد',
        responses: { 201: { description: 'تم إنشاء المستخدم' } },
      },
    },
    '/users/{id}': {
      get: {
        tags: ['Users Management'],
        summary: 'تفاصيل مستخدم محدد',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { 200: { description: 'بيانات المستخدم' } },
      },
      put: {
        tags: ['Users Management'],
        summary: 'تحديث بيانات المستخدم',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { 200: { description: 'تم التعديل' } },
      },
      delete: {
        tags: ['Users Management'],
        summary: 'حذف مستخدم',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { 200: { description: 'تم الحذف' } },
      },
    },
    '/users/{id}/status': {
      put: {
        tags: ['Users Management'],
        summary: 'تفعيل أو تعطيل حساب المستخدم',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { 200: { description: 'تم تحديث الحالة' } },
      },
    },
    '/users/{id}/roles': {
      post: {
        tags: ['Users Management'],
        summary: 'تعيين أدوار للمستخدم',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { 200: { description: 'تم تعيين الأدوار' } },
      },
    },
    '/customers': {
      get: { tags: ['Customers'], summary: 'قائمة العملاء' },
      post: { tags: ['Customers'], summary: 'إضافة عميل جديد' },
    },
    '/customers/{id}': {
      get: { tags: ['Customers'], summary: 'بيانات العميل' },
      put: { tags: ['Customers'], summary: 'تحديث العميل' },
      delete: { tags: ['Customers'], summary: 'حذف العميل' },
    },
    '/customers/{id}/statement': {
      get: { tags: ['Customers'], summary: 'كشف حساب العميل' },
    },
    '/suppliers': {
      get: { tags: ['Suppliers'], summary: 'قائمة الموردين' },
      post: { tags: ['Suppliers'], summary: 'إضافة مورد جديد' },
    },
    '/suppliers/{id}': {
      get: { tags: ['Suppliers'], summary: 'بيانات المورد' },
      put: { tags: ['Suppliers'], summary: 'تحديث المورد' },
      delete: { tags: ['Suppliers'], summary: 'حذف المورد' },
    },
    '/products': {
      get: { tags: ['Products'], summary: 'قائمة المنتجات والخدمات' },
      post: { tags: ['Products'], summary: 'إضافة منتج جديد' },
    },
    '/products/{id}': {
      get: { tags: ['Products'], summary: 'بيانات المنتج' },
      put: { tags: ['Products'], summary: 'تحديث المنتج' },
      delete: { tags: ['Products'], summary: 'حذف المنتج' },
    },
    '/invoices': {
      get: { tags: ['Sales & Invoices'], summary: 'قائمة فواتير المبيعات' },
      post: { tags: ['Sales & Invoices'], summary: 'إصدار فاتورة مبيعات جديدة' },
    },
    '/invoices/{id}': {
      get: { tags: ['Sales & Invoices'], summary: 'تفاصيل الفاتورة' },
      put: { tags: ['Sales & Invoices'], summary: 'تعديل الفاتورة' },
      delete: { tags: ['Sales & Invoices'], summary: 'حذف الفاتورة' },
    },
    '/invoices/{id}/cancel': {
      post: { tags: ['Sales & Invoices'], summary: 'إلغاء الفاتورة' },
    },
    '/invoices/{id}/return': {
      post: { tags: ['Sales & Invoices'], summary: 'مرتجع مبيعات' },
    },
    '/payments': {
      get: { tags: ['Payments & Vouchers'], summary: 'قائمة سندات القبض والصرف' },
      post: { tags: ['Payments & Vouchers'], summary: 'تسجيل سند مالي جديد' },
    },
    '/pos/shifts/current': {
      get: { tags: ['Point of Sale (POS)'], summary: 'الوردية الحالية المفتوحة' },
    },
    '/pos/checkout': {
      post: { tags: ['Point of Sale (POS)'], summary: 'إنهاء فاتورة نقطة بيع' },
    },
    '/financial-reports/income-statement': {
      get: { tags: ['Financial Reports'], summary: 'قائمة الدخل والأرباح والخسائر' },
    },
    '/financial-reports/balance-sheet': {
      get: { tags: ['Financial Reports'], summary: 'الميزانية العمومية' },
    },
    '/control-center/settings': {
      get: { tags: ['Enterprise Control Center'], summary: 'إعدادات مركز التحكم' },
    },
    '/whatsapp/messages': {
      get: { tags: ['WhatsApp Integration'], summary: 'سجل رسائل واتساب' },
    },
  },
};

export default openapiSpecification;
