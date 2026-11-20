import React, { useState, useEffect, useMemo } from 'react';
import {
  Users,
  DollarSign,
  TrendingDown,
  Plus,
  FileText,
  Printer,
  FileSpreadsheet,
  Calendar,
  Building,
  CheckCircle,
  AlertTriangle,
  Search,
  Filter,
  Eye,
  Edit2,
  Trash2,
  CreditCard,
  UserCheck,
  Briefcase,
  Layers,
  ArrowUpRight,
  ArrowDownRight,
  Phone,
  ChevronDown,
  X,
  Clock,
  Landmark,
  Wallet,
} from 'lucide-react';
import { api, Employee, EmployeeMovement, PayrollRecord, Expense } from '../../api';
import { toEnglishDigits, formatNumber, formatDateOnly } from '../../lib/formatters';
import {
  printExpenseVoucher,
  printEmployeeStatement,
  printMonthlyPayrollSheet,
  exportExpensesToExcel,
  exportPayrollToExcel,
} from '../../lib/exportUtils';
import { useAuth } from '../../context/AuthContext';

interface EmployeesAndExpensesTabProps {
  initialSubTab?: 'employees' | 'expenses';
}

const EXPENSE_CATEGORIES = [
  'رواتب وأجور وسلف موظفين',
  'إيجارات المحلات والمستودعات',
  'كهرباء ومياه وطاقة ومولدات',
  'نقل وشحن وتنزيل وحمالة',
  'ضيافة وبوفيه ونثريات يومية',
  'صيانة وتشغيل سيارات وطرمبات ومعدات',
  'ضرائب وزكاة ورسوم حكومية',
  'تسويق ومطبوعات وقرطاسية',
  'مصروفات تشغيلية أخرى',
];

const COST_CENTERS = [
  'المحل / المعرض الرئيسي',
  'المستودع المركزي',
  'محطة الوقود والغاز',
  'فرع الإطارات والبطاريات',
  'سيارات التوزيع والمناديب',
  'عام',
];

const TREASURIES = [
  'الصندوق النقدي الرئيسي',
  'الحساب البنكي - بنك التضامن',
  'حساب مصرف الكريمي المميز',
  'محفظة جوالي الإلكترونية',
  'محفظة ون كاش السريعة',
  'محفظة فلوسك الذكية',
  'محفظة جوبي كاش',
];

export const EmployeesAndExpensesTab: React.FC<EmployeesAndExpensesTabProps> = ({
  initialSubTab = 'employees',
}) => {
  const { company, currentCompany } = useAuth();
  const activeCompany = company || currentCompany;
  const companyName = activeCompany?.name || 'المؤسسة التجارية';
  const systemCurrency = activeCompany?.currency || localStorage.getItem('erp_currency') || 'YER';

  // Navigation State
  const [activeTab, setActiveTab] = useState<'employees' | 'expenses'>(initialSubTab);
  const [employeeSubView, setEmployeeSubView] = useState<'directory' | 'movements' | 'payroll'>('directory');

  // Data States
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [movements, setMovements] = useState<EmployeeMovement[]>([]);
  const [payrollRecords, setPayrollRecords] = useState<PayrollRecord[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Month selector for Payroll
  const [payrollMonth, setPayrollMonth] = useState<string>(() => {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    return `${y}-${m}`;
  });

  // Filter States for Expenses
  const [expenseSearch, setExpenseSearch] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('الكل');
  const [selectedCostCenter, setSelectedCostCenter] = useState<string>('الكل');
  const [selectedTreasury, setSelectedTreasury] = useState<string>('الكل');
  const [selectedCurrency, setSelectedCurrency] = useState<string>('الكل');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');

  // Modals
  const [showEmployeeModal, setShowEmployeeModal] = useState<boolean>(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);

  const [showMovementModal, setShowMovementModal] = useState<boolean>(false);
  const [movementTargetEmp, setMovementTargetEmp] = useState<Employee | null>(null);

  const [showExpenseModal, setShowExpenseModal] = useState<boolean>(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);

  const [showDisburseModal, setShowDisburseModal] = useState<boolean>(false);
  const [disburseEmp, setDisburseEmp] = useState<Employee | null>(null);

  const [viewingStatementEmp, setViewingStatementEmp] = useState<Employee | null>(null);

  // Status message
  const [alertMessage, setAlertMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    if (initialSubTab) {
      setActiveTab(initialSubTab);
    }
  }, [initialSubTab]);

  // Load all initial data
  const loadData = async () => {
    setLoading(true);
    try {
      const [empRes, movRes, payRes, expRes] = await Promise.all([
        api.getEmployees(),
        api.getEmployeeMovements(),
        api.getPayrollRecords(),
        api.getExpenses(),
      ]);

      const emps = Array.isArray(empRes) ? empRes : ((empRes as any)?.data || (empRes as any)?.items || []);
      const movs = Array.isArray(movRes) ? movRes : ((movRes as any)?.data || (movRes as any)?.items || []);
      const pays = Array.isArray(payRes) ? payRes : ((payRes as any)?.data || (payRes as any)?.items || []);
      const exps = Array.isArray(expRes) ? expRes : ((expRes as any)?.data || (expRes as any)?.items || []);

      if (Array.isArray(emps)) setEmployees(emps);
      if (Array.isArray(movs)) setMovements(movs);
      if (Array.isArray(pays)) setPayrollRecords(pays);
      if (Array.isArray(exps)) setExpenses(exps);
    } catch (err: any) {
      console.error('Error loading employee/expense data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    const handleWiped = () => {
      setEmployees([]);
      setMovements([]);
      setPayrollRecords([]);
      setExpenses([]);
      loadData();
    };
    const handleUpdated = () => {
      loadData();
    };
    window.addEventListener('erp-demo-data-wiped', handleWiped);
    window.addEventListener('erp-employees-updated', handleUpdated);
    window.addEventListener('erp-expenses-updated', handleUpdated);
    window.addEventListener('erp-data-updated', handleUpdated);
    window.addEventListener('storage', handleUpdated);
    return () => {
      window.removeEventListener('erp-demo-data-wiped', handleWiped);
      window.removeEventListener('erp-employees-updated', handleUpdated);
      window.removeEventListener('erp-expenses-updated', handleUpdated);
      window.removeEventListener('erp-data-updated', handleUpdated);
      window.removeEventListener('storage', handleUpdated);
    };
  }, []);

  const triggerAlert = (text: string, type: 'success' | 'error' = 'success') => {
    setAlertMessage({ text, type });
    setTimeout(() => setAlertMessage(null), 4000);
  };

  // -------------------------------------------------------------
  // Calculations & Summaries
  // -------------------------------------------------------------
  const employeeStats = useMemo(() => {
    const totalEmployees = employees.length;
    const activeEmployees = employees.filter((e) => e.status === 'نشط').length;
    const totalBaseSalaries = employees.reduce((sum, e) => sum + (Number(e.baseSalary) || 0), 0);

    const totalAdvances = movements
      .filter((m) => m.type === 'advance')
      .reduce((sum, m) => sum + (Number(m.amount) || 0), 0);

    const totalBonuses = movements
      .filter((m) => m.type === 'bonus')
      .reduce((sum, m) => sum + (Number(m.amount) || 0), 0);

    const totalDeductions = movements
      .filter((m) => m.type === 'deduction')
      .reduce((sum, m) => sum + (Number(m.amount) || 0), 0);

    return {
      totalEmployees,
      activeEmployees,
      totalBaseSalaries,
      totalAdvances,
      totalBonuses,
      totalDeductions,
    };
  }, [employees, movements]);

  const expenseStats = useMemo(() => {
    const total = expenses.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
    const salariesExpense = expenses
      .filter((e) => e.category === 'رواتب وأجور وسلف موظفين')
      .reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
    const rentAndUtilities = expenses
      .filter(
        (e) =>
          e.category === 'إيجارات المحلات والمستودعات' ||
          e.category === 'كهرباء ومياه وطاقة ومولدات'
      )
      .reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
    const otherExpenses = total - salariesExpense - rentAndUtilities;

    // Top cost center
    const centerSums: Record<string, number> = {};
    expenses.forEach((e) => {
      const c = e.costCenter || 'عام';
      centerSums[c] = (centerSums[c] || 0) + Number(e.amount || 0);
    });
    let topCenter = 'المحل الرئيسي';
    let topCenterVal = 0;
    Object.entries(centerSums).forEach(([k, v]) => {
      if (v > topCenterVal) {
        topCenter = k;
        topCenterVal = v;
      }
    });

    return {
      total,
      salariesExpense,
      rentAndUtilities,
      otherExpenses,
      topCenter,
      topCenterVal,
    };
  }, [expenses]);

  // Filtered Expenses
  const filteredExpenses = useMemo(() => {
    return expenses.filter((e) => {
      if (selectedCategory !== 'الكل' && e.category !== selectedCategory) return false;
      if (selectedCostCenter !== 'الكل' && e.costCenter !== selectedCostCenter) return false;
      if (selectedTreasury !== 'الكل' && e.treasury !== selectedTreasury) return false;
      if (selectedCurrency !== 'الكل' && e.currency !== selectedCurrency) return false;
      if (startDate && e.date < startDate) return false;
      if (endDate && e.date > endDate) return false;
      if (expenseSearch.trim()) {
        const q = expenseSearch.toLowerCase();
        const match =
          e.voucherNumber?.toLowerCase().includes(q) ||
          e.beneficiary?.toLowerCase().includes(q) ||
          e.description?.toLowerCase().includes(q) ||
          e.notes?.toLowerCase().includes(q);
        if (!match) return false;
      }
      return true;
    });
  }, [
    expenses,
    selectedCategory,
    selectedCostCenter,
    selectedTreasury,
    selectedCurrency,
    startDate,
    endDate,
    expenseSearch,
  ]);

  // -------------------------------------------------------------
  // Employee Directory Handlers
  // -------------------------------------------------------------
  const handleSaveEmployee = async (formData: any) => {
    try {
      if (editingEmployee) {
        const res = await api.updateEmployee(editingEmployee.id, formData);
        if (res?.success) {
          triggerAlert('تم تحديث بيانات الموظف بنجاح');
          loadData();
          setShowEmployeeModal(false);
          setEditingEmployee(null);
        }
      } else {
        const res = await api.createEmployee(formData);
        if (res?.success) {
          triggerAlert('تمت إضافة الموظف الجديد بنجاح');
          loadData();
          setShowEmployeeModal(false);
        }
      }
    } catch (err: any) {
      triggerAlert(err?.message || 'فشلت عملية حفظ الموظف', 'error');
    }
  };

  const handleDeleteEmployee = async (id: string, name: string) => {
    if (!window.confirm(`هل أنت متأكد من حذف الموظف (${name}) نهائياً؟`)) return;
    try {
      const res = await api.deleteEmployee(id);
      if (res?.success) {
        triggerAlert('تم حذف الموظف بنجاح');
        loadData();
      }
    } catch (err: any) {
      triggerAlert(err?.message || 'تعذر حذف الموظف', 'error');
    }
  };

  // -------------------------------------------------------------
  // Movement Handlers (Advances, Bonuses, Deductions)
  // -------------------------------------------------------------
  const handleSaveMovement = async (formData: any) => {
    try {
      const res = await api.createEmployeeMovement(formData);
      if (res?.success) {
        triggerAlert('تم تسجيل الحركة المالية للموظف بنجاح وترحيلها');
        loadData();
        setShowMovementModal(false);
        setMovementTargetEmp(null);
      }
    } catch (err: any) {
      triggerAlert(err?.message || 'فشل تسجيل الحركة', 'error');
    }
  };

  // -------------------------------------------------------------
  // Payroll Disburse Handlers
  // -------------------------------------------------------------
  const handleDisbursePayroll = async (formData: any) => {
    try {
      const res = await api.disbursePayroll(formData);
      if (res?.success) {
        triggerAlert(res.message || 'تم صرف الراتب بنجاح وترحيله إلى المصروفات والخزينة');
        loadData();
        setShowDisburseModal(false);
        setDisburseEmp(null);
      }
    } catch (err: any) {
      triggerAlert(err?.message || 'فشلت عملية صرف الراتب', 'error');
    }
  };

  // -------------------------------------------------------------
  // Expense Handlers
  // -------------------------------------------------------------
  const handleSaveExpense = async (formData: any) => {
    try {
      if (editingExpense) {
        const res = await api.updateExpense(editingExpense.id, formData);
        if (res?.success) {
          triggerAlert('تم تحديث سند المصروف بنجاح');
          loadData();
          setShowExpenseModal(false);
          setEditingExpense(null);
        }
      } else {
        const res = await api.createExpense(formData);
        if (res?.success) {
          triggerAlert('تم تسجيل سند المصروف وترحيله إلى الخزينة والقيود المحاسبية بنجاح');
          loadData();
          setShowExpenseModal(false);
        }
      }
    } catch (err: any) {
      triggerAlert(err?.message || 'فشلت عملية تسجيل المصروف', 'error');
    }
  };

  const handleDeleteExpense = async (id: string, voucherNumber: string) => {
    if (!window.confirm(`هل أنت متأكد من حذف سند المصروف رقم (${voucherNumber})؟`)) return;
    try {
      const res = await api.deleteExpense(id);
      if (res?.success) {
        triggerAlert('تم حذف سند المصروف بنجاح');
        loadData();
      }
    } catch (err: any) {
      triggerAlert(err?.message || 'تعذر حذف سند المصروف', 'error');
    }
  };

  return (
    <div className="space-y-6 pb-12 font-sans text-[var(--md-on-surface)]" dir="rtl">
      {/* Alert Banner */}
      {alertMessage && (
        <div
          className={`p-4 rounded-xl flex items-center justify-between border ${
            alertMessage.type === 'success'
              ? 'bg-[var(--md-success-container)] text-[var(--md-on-success-container)] border-[var(--md-success)]/30'
              : 'bg-[var(--md-error-container)] text-[var(--md-on-error-container)] border-[var(--md-error)]/30'
          }`}
        >
          <div className="flex items-center gap-3 font-semibold text-sm">
            {alertMessage.type === 'success' ? (
              <CheckCircle className="w-5 h-5 text-[var(--md-success)] shrink-0" />
            ) : (
              <AlertTriangle className="w-5 h-5 text-[var(--md-error)] shrink-0" />
            )}
            <span>{alertMessage.text}</span>
          </div>
          <button
            onClick={() => setAlertMessage(null)}
            className="m3-btn-text !min-h-[28px] !p-1 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Main Module Header & Sub-Tab Switcher */}
      <div className="m3-card-elevated p-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-[var(--md-primary-container)] text-[var(--md-on-primary-container)] border border-[var(--md-primary)]/20 rounded-xl shrink-0">
                {activeTab === 'employees' ? (
                  <Users className="w-6 h-6" />
                ) : (
                  <CreditCard className="w-6 h-6" />
                )}
              </div>
              <div>
                <h1 className="text-xl font-bold text-[var(--md-on-surface)]">
                  {activeTab === 'employees'
                    ? 'إدارة الموظفين والرواتب والسلف والحضور'
                    : 'إدارة المصروفات والتكاليف التشغيلية ومراكز التكلفة'}
                </h1>
                <p className="text-xs text-[var(--md-on-surface-variant)] mt-0.5">
                  ربط محاسبي مباشر مع الخزينة والمصارف ودفتر الأستاذ وقائمة الأرباح والخسائر
                </p>
              </div>
            </div>
          </div>

          {/* Tab Switcher */}
          <div className="flex flex-wrap items-center bg-[var(--md-surface-container-low)] p-1 rounded-xl border border-[var(--md-outline-variant)] gap-1">
            <button
              onClick={() => setActiveTab('employees')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all cursor-pointer ${
                activeTab === 'employees'
                  ? 'bg-[var(--md-primary)] text-[var(--md-on-primary)]'
                  : 'text-[var(--md-on-surface-variant)] hover:text-[var(--md-on-surface)]'
              }`}
            >
              <Users className="w-4 h-4" />
              <span>الموظفين والرواتب والسلف</span>
              <span className="m3-badge m3-badge-primary !px-2 !py-0.5 text-xs font-mono tabular-nums">
                {employees.length}
              </span>
            </button>

            <button
              onClick={() => setActiveTab('expenses')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all cursor-pointer ${
                activeTab === 'expenses'
                  ? 'bg-[var(--md-primary)] text-[var(--md-on-primary)]'
                  : 'text-[var(--md-on-surface-variant)] hover:text-[var(--md-on-surface)]'
              }`}
            >
              <DollarSign className="w-4 h-4" />
              <span>المصروفات والتكاليف التشغيلية</span>
              <span className="m3-badge m3-badge-success !px-2 !py-0.5 text-xs font-mono tabular-nums">
                {expenses.length}
              </span>
            </button>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* SECTION 1: EMPLOYEES & PAYROLL */}
      {/* ========================================================================= */}
      {activeTab === 'employees' && (
        <div className="space-y-6">
          {/* KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="m3-card p-4">
              <div className="flex items-center justify-between text-[var(--md-on-surface-variant)] mb-2">
                <span className="text-xs font-bold">إجمالي الموظفين</span>
                <div className="p-2 bg-[var(--md-info-container)] text-[var(--md-on-info-container)] rounded-xl">
                  <Users className="w-4 h-4" />
                </div>
              </div>
              <div className="text-2xl font-black text-[var(--md-on-surface)] font-mono tabular-nums">
                {employeeStats.totalEmployees}
              </div>
              <div className="text-xs text-[var(--md-success)] mt-1 flex items-center gap-1">
                <CheckCircle className="w-3.5 h-3.5" />
                <span>{employeeStats.activeEmployees} موظف نشط بالخدمة</span>
              </div>
            </div>

            <div className="m3-card p-4">
              <div className="flex items-center justify-between text-[var(--md-on-surface-variant)] mb-2">
                <span className="text-xs font-bold">إجمالي الرواتب الأساسية</span>
                <div className="p-2 bg-[var(--md-success-container)] text-[var(--md-on-success-container)] rounded-xl">
                  <Briefcase className="w-4 h-4" />
                </div>
              </div>
              <div className="text-2xl font-black text-[var(--md-on-surface)] font-mono tabular-nums">
                {formatNumber(employeeStats.totalBaseSalaries)}{' '}
                <span className="text-xs font-normal text-[var(--md-on-surface-variant)]">{systemCurrency}</span>
              </div>
              <div className="text-xs text-[var(--md-on-surface-variant)] mt-1">قبل البدلات والسلف والاستقطاعات</div>
            </div>

            <div className="m3-card p-4">
              <div className="flex items-center justify-between text-[var(--md-on-surface-variant)] mb-2">
                <span className="text-xs font-bold">إجمالي السلف المسحوبة</span>
                <div className="p-2 bg-[var(--md-warning-container)] text-[var(--md-on-warning-container)] rounded-xl">
                  <ArrowDownRight className="w-4 h-4" />
                </div>
              </div>
              <div className="text-2xl font-black text-[var(--md-warning)] font-mono tabular-nums">
                {formatNumber(employeeStats.totalAdvances)}{' '}
                <span className="text-xs font-normal text-[var(--md-on-surface-variant)]">{systemCurrency}</span>
              </div>
              <div className="text-xs text-[var(--md-on-surface-variant)] mt-1">تستقطع تلقائياً من مسير الرواتب</div>
            </div>

            <div className="m3-card p-4">
              <div className="flex items-center justify-between text-[var(--md-on-surface-variant)] mb-2">
                <span className="text-xs font-bold">صافي مسير الرواتب التقديري</span>
                <div className="p-2 bg-[var(--md-primary-container)] text-[var(--md-on-primary-container)] rounded-xl">
                  <DollarSign className="w-4 h-4" />
                </div>
              </div>
              <div className="text-2xl font-black text-[var(--md-primary-text)] font-mono tabular-nums">
                {formatNumber(
                  employeeStats.totalBaseSalaries +
                    employeeStats.totalBonuses -
                    employeeStats.totalAdvances -
                    employeeStats.totalDeductions
                )}{' '}
                <span className="text-xs font-normal text-[var(--md-on-surface-variant)]">{systemCurrency}</span>
              </div>
              <div className="text-xs text-[var(--md-on-surface-variant)] mt-1">شامل البدلات والمكافآت والخصم</div>
            </div>
          </div>

          {/* Sub-View Navigation & Action Bar */}
          <div className="m3-card p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={() => setEmployeeSubView('directory')}
                className={`text-xs cursor-pointer ${
                  employeeSubView === 'directory' ? 'm3-btn-primary' : 'm3-btn-outlined'
                }`}
              >
                دليل وبطاقات الموظفين
              </button>

              <button
                onClick={() => setEmployeeSubView('movements')}
                className={`text-xs cursor-pointer ${
                  employeeSubView === 'movements' ? 'm3-btn-primary' : 'm3-btn-outlined'
                }`}
              >
                سجل السلف والمكافآت والغياب
              </button>

              <button
                onClick={() => setEmployeeSubView('payroll')}
                className={`text-xs cursor-pointer ${
                  employeeSubView === 'payroll' ? 'm3-btn-primary' : 'm3-btn-outlined'
                }`}
              >
                مسير الرواتب الشهري المعتمد
              </button>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <button
                onClick={() => {
                  setEditingEmployee(null);
                  setShowEmployeeModal(true);
                }}
                className="m3-btn-primary text-xs cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>إضافة موظف جديد</span>
              </button>

              <button
                onClick={() => {
                  setMovementTargetEmp(null);
                  setShowMovementModal(true);
                }}
                className="m3-btn-tonal text-xs cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>تسجيل سلفة / مكافأة</span>
              </button>

              {employeeSubView === 'payroll' && (
                <>
                  <button
                    onClick={() =>
                      printMonthlyPayrollSheet(
                        payrollRecords.length > 0
                          ? payrollRecords
                          : employees.map((e) => ({
                              id: `tmp-${e.id}`,
                              employeeId: e.id,
                              employeeName: e.name,
                              month: payrollMonth,
                              baseSalary: e.baseSalary,
                              bonuses: 0,
                              advancesDeducted: 0,
                              otherDeductions: 0,
                              netSalary: e.baseSalary,
                              currency: e.currency,
                              treasury: 'الصندوق الرئيسي',
                              status: 'draft',
                              paymentDate: formatDateOnly(new Date()),
                            })),
                        payrollMonth,
                        undefined,
                        companyName
                      )
                    }
                    className="m3-btn-outlined text-xs cursor-pointer"
                  >
                    <Printer className="w-4 h-4" />
                    <span>طباعة مسير الرواتب A4</span>
                  </button>

                  <button
                    onClick={() =>
                      exportPayrollToExcel(
                        payrollRecords.length > 0
                          ? payrollRecords
                          : employees.map((e) => ({
                              employeeCode: e.code,
                              employeeName: e.name,
                              month: payrollMonth,
                              baseSalary: e.baseSalary,
                              bonuses: 0,
                              advancesDeducted: 0,
                              otherDeductions: 0,
                              netSalary: e.baseSalary,
                              currency: e.currency,
                              treasury: 'الصندوق الرئيسي',
                              status: 'draft',
                            })),
                        payrollMonth,
                        companyName
                      )
                    }
                    className="m3-btn-tonal text-xs cursor-pointer"
                  >
                    <FileSpreadsheet className="w-4 h-4" />
                    <span>تصدير إكسل</span>
                  </button>
                </>
              )}
            </div>
          </div>

          {/* VIEW A: EMPLOYEES DIRECTORY */}
          {employeeSubView === 'directory' && (
            <div className="m3-card overflow-hidden">
              <div className="p-4 border-b border-[var(--md-outline-variant)] flex items-center justify-between">
                <h3 className="font-bold text-[var(--md-on-surface)] text-sm flex items-center gap-2">
                  <Users className="w-4 h-4 text-[var(--md-primary-text)]" />
                  <span>دليل وبطاقات الموظفين المسجلين ({employees.length})</span>
                </h3>
              </div>

              <div className="overflow-x-auto">
                <table className="m3-table text-right text-xs" dir="rtl">
                  <thead className="m3-thead">
                    <tr>
                      <th className="m3-th">الكود</th>
                      <th className="m3-th">اسم الموظف</th>
                      <th className="m3-th">المسمى الوظيفي</th>
                      <th className="m3-th">الفرع / الموقع</th>
                      <th className="m3-th">رقم الهاتف</th>
                      <th className="m3-th">تاريخ التعيين</th>
                      <th className="m3-th">الراتب الأساسي</th>
                      <th className="m3-th">الحالة</th>
                      <th className="m3-th text-center">إجراءات</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--md-outline-variant)]">
                    {employees.length === 0 ? (
                      <tr>
                        <td colSpan={9} className="p-8 text-center text-[var(--md-on-surface-variant)]">
                          لا يوجد موظفين مسجلين حالياً. اضغط على "إضافة موظف جديد" للبدء.
                        </td>
                      </tr>
                    ) : (
                      employees.map((emp) => (
                        <tr key={emp.id} className="hover:bg-[var(--md-surface-container-low)] transition-colors">
                          <td className="p-3.5 font-mono tabular-nums font-bold text-[var(--md-primary-text)]">{emp.code}</td>
                          <td className="p-3.5 font-bold text-[var(--md-on-surface)]">
                            <div className="flex items-center gap-2">
                              <div className="w-7 h-7 rounded-full bg-[var(--md-primary-container)] text-[var(--md-on-primary-container)] flex items-center justify-center font-bold text-xs shrink-0">
                                {emp.name.charAt(0)}
                              </div>
                              <span>{emp.name}</span>
                            </div>
                          </td>
                          <td className="p-3.5 text-[var(--md-on-surface)] font-medium">{emp.roleTitle}</td>
                          <td className="p-3.5 text-[var(--md-on-surface-variant)]">{emp.branch}</td>
                          <td className="p-3.5 font-mono tabular-nums text-[var(--md-on-surface-variant)]" dir="ltr">
                            {emp.phone || '-'}
                          </td>
                          <td className="p-3.5 font-mono tabular-nums text-[var(--md-on-surface-variant)]">
                            {formatDateOnly(emp.hireDate)}
                          </td>
                          <td className="p-3.5 font-mono tabular-nums font-bold text-[var(--md-on-surface)]">
                            {formatNumber(emp.baseSalary)} {emp.currency}
                          </td>
                          <td className="p-3.5">
                            <span
                              className={`m3-badge text-xs ${
                                emp.status === 'نشط'
                                  ? 'm3-badge-success'
                                  : emp.status === 'في إجازة'
                                  ? 'm3-badge-warning'
                                  : 'm3-badge-error'
                              }`}
                            >
                              {emp.status}
                            </span>
                          </td>
                          <td className="p-3.5">
                            <div className="flex items-center justify-center gap-1.5">
                              {/* Quick Advance */}
                              <button
                                onClick={() => {
                                  setMovementTargetEmp(emp);
                                  setShowMovementModal(true);
                                }}
                                title="تسجيل سلفة / مكافأة"
                                className="m3-btn-text !min-h-[30px] !p-1.5 !text-[var(--md-warning)] cursor-pointer"
                              >
                                <ArrowDownRight className="w-4 h-4" />
                              </button>

                              {/* Disburse Salary */}
                              <button
                                onClick={() => {
                                  setDisburseEmp(emp);
                                  setShowDisburseModal(true);
                                }}
                                title="صرف راتب الموظف"
                                className="m3-btn-text !min-h-[30px] !p-1.5 !text-[var(--md-success)] cursor-pointer"
                              >
                                <DollarSign className="w-4 h-4" />
                              </button>

                              {/* Statement / Print */}
                              <button
                                onClick={() => {
                                  const empMovs = movements.filter((m) => m.employeeId === emp.id);
                                  printEmployeeStatement(emp, empMovs, undefined, companyName);
                                }}
                                title="طباعة كشف حساب وسلف الموظف"
                                className="m3-btn-text !min-h-[30px] !p-1.5 !text-[var(--md-info)] cursor-pointer"
                              >
                                <Printer className="w-4 h-4" />
                              </button>

                              {/* Edit */}
                              <button
                                onClick={() => {
                                  setEditingEmployee(emp);
                                  setShowEmployeeModal(true);
                                }}
                                title="تعديل الموظف"
                                className="m3-btn-text !min-h-[30px] !p-1.5 cursor-pointer"
                              >
                                <Edit2 className="w-4 h-4" />
                              </button>

                              {/* Delete */}
                              <button
                                onClick={() => handleDeleteEmployee(emp.id, emp.name)}
                                title="حذف الموظف"
                                className="m3-btn-text !min-h-[30px] !p-1.5 !text-[var(--md-error)] cursor-pointer"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* VIEW B: FINANCIAL MOVEMENTS & ATTENDANCE */}
          {employeeSubView === 'movements' && (
            <div className="m3-card overflow-hidden">
              <div className="p-4 border-b border-[var(--md-outline-variant)] flex items-center justify-between">
                <h3 className="font-bold text-[var(--md-on-surface)] text-sm flex items-center gap-2">
                  <ArrowDownRight className="w-4 h-4 text-[var(--md-warning)]" />
                  <span>سجل حركات السلف والمكافآت والخصومات والغياب ({movements.length})</span>
                </h3>
              </div>

              <div className="overflow-x-auto">
                <table className="m3-table text-right text-xs" dir="rtl">
                  <thead className="m3-thead">
                    <tr>
                      <th className="m3-th">التاريخ</th>
                      <th className="m3-th">الموظف</th>
                      <th className="m3-th">نوع الحركة</th>
                      <th className="m3-th">المبلغ</th>
                      <th className="m3-th">الخزينة / المصدر</th>
                      <th className="m3-th">البيان والتفاصيل</th>
                      <th className="m3-th">حالة الحضور</th>
                      <th className="m3-th">ملاحظات</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--md-outline-variant)]">
                    {movements.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="p-8 text-center text-[var(--md-on-surface-variant)]">
                          لا توجد حركات مالية مسجلة بعد.
                        </td>
                      </tr>
                    ) : (
                      movements.map((mov) => {
                        const isAdv = mov.type === 'advance';
                        const isBonus = mov.type === 'bonus';
                        const isDed = mov.type === 'deduction';
                        const isPay = mov.type === 'salary_payment';

                        return (
                          <tr key={mov.id} className="hover:bg-[var(--md-surface-container-low)] transition-colors">
                            <td className="p-3.5 font-mono tabular-nums text-[var(--md-on-surface-variant)]">{formatDateOnly(mov.date)}</td>
                            <td className="p-3.5 font-bold text-[var(--md-on-surface)]">{mov.employeeName}</td>
                            <td className="p-3.5">
                              <span
                                className={`m3-badge text-xs ${
                                  isAdv
                                    ? 'm3-badge-warning'
                                    : isBonus
                                    ? 'm3-badge-success'
                                    : isDed
                                    ? 'm3-badge-error'
                                    : 'm3-badge-info'
                                }`}
                              >
                                {isAdv
                                  ? 'سلفة نقدية'
                                  : isBonus
                                  ? 'مكافأة / حافز'
                                  : isDed
                                  ? 'خصم / جزاء'
                                  : 'صرف راتب'}
                              </span>
                            </td>
                            <td className="p-3.5 font-mono tabular-nums font-bold">
                              <span
                                className={
                                  isAdv || isDed
                                    ? 'text-[var(--md-error)]'
                                    : isBonus || isPay
                                    ? 'text-[var(--md-success)]'
                                    : 'text-[var(--md-on-surface)]'
                                }
                              >
                                {formatNumber(mov.amount)} {mov.currency}
                              </span>
                            </td>
                            <td className="p-3.5 text-[var(--md-on-surface-variant)]">{mov.treasury}</td>
                            <td className="p-3.5 text-[var(--md-on-surface)] font-medium">{mov.description || '-'}</td>
                            <td className="p-3.5">
                              {mov.attendanceStatus ? (
                                <span className="m3-badge m3-badge-secondary text-xs">
                                  {mov.attendanceStatus === 'present'
                                    ? 'حاضر'
                                    : mov.attendanceStatus === 'absent'
                                    ? 'غائب'
                                    : mov.attendanceStatus === 'leave'
                                    ? 'إجازة'
                                    : 'إضافي'}
                                </span>
                              ) : (
                                '-'
                              )}
                            </td>
                            <td className="p-3.5 text-[var(--md-on-surface-variant)]">{mov.notes || '-'}</td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* VIEW C: MONTHLY PAYROLL SHEET */}
          {employeeSubView === 'payroll' && (
            <div className="m3-card overflow-hidden">
              <div className="p-4 border-b border-[var(--md-outline-variant)] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h3 className="font-bold text-[var(--md-on-surface)] text-sm flex items-center gap-2">
                    <Briefcase className="w-4 h-4 text-[var(--md-primary-text)]" />
                    <span>مسير الرواتب المعتمد لشهر: {payrollMonth}</span>
                  </h3>
                  <p className="text-xs text-[var(--md-on-surface-variant)] mt-0.5">
                    حساب آلي للمستحقات: الراتب الأساسي + المكافآت - السلف المسحوبة - الخصومات
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  <label className="text-xs font-bold text-[var(--md-on-surface-variant)]">الشهر المستحق:</label>
                  <input
                    type="month"
                    value={payrollMonth}
                    onChange={(e) => setPayrollMonth(e.target.value)}
                    className="m3-input !h-9 !w-auto !px-3 text-xs font-mono tabular-nums font-bold"
                  />
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="m3-table text-right text-xs" dir="rtl">
                  <thead className="m3-thead">
                    <tr>
                      <th className="m3-th">كود الموظف</th>
                      <th className="m3-th">اسم الموظف</th>
                      <th className="m3-th">المسمى الوظيفي</th>
                      <th className="m3-th">الراتب الأساسي</th>
                      <th className="m3-th">المكافآت والبدلات</th>
                      <th className="m3-th">السلف المسحوبة</th>
                      <th className="m3-th">الخصومات والغياب</th>
                      <th className="m3-th">صافي المستحق</th>
                      <th className="m3-th text-center">إجراء الصرف</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--md-outline-variant)]">
                    {employees.map((emp) => {
                      // Filter movements for this employee
                      const empMovs = movements.filter((m) => m.employeeId === emp.id);
                      const totalAdv = empMovs
                        .filter((m) => m.type === 'advance')
                        .reduce((s, m) => s + (Number(m.amount) || 0), 0);
                      const totalBonuses = empMovs
                        .filter((m) => m.type === 'bonus')
                        .reduce((s, m) => s + (Number(m.amount) || 0), 0);
                      const totalDeductions = empMovs
                        .filter((m) => m.type === 'deduction')
                        .reduce((s, m) => s + (Number(m.amount) || 0), 0);

                      const netPayable = emp.baseSalary + totalBonuses - totalAdv - totalDeductions;

                      // Check if already paid this month
                      const existingRecord = payrollRecords.find(
                        (p) => p.employeeId === emp.id && p.month === payrollMonth
                      );

                      return (
                        <tr key={emp.id} className="hover:bg-[var(--md-surface-container-low)] transition-colors">
                          <td className="p-3.5 font-mono tabular-nums font-bold text-[var(--md-on-surface-variant)]">{emp.code}</td>
                          <td className="p-3.5 font-bold text-[var(--md-on-surface)]">{emp.name}</td>
                          <td className="p-3.5 text-[var(--md-on-surface-variant)]">{emp.roleTitle}</td>
                          <td className="p-3.5 font-mono tabular-nums font-bold text-[var(--md-on-surface)]">
                            {formatNumber(emp.baseSalary)} {emp.currency}
                          </td>
                          <td className="p-3.5 font-mono tabular-nums text-[var(--md-success)] font-bold">
                            +{formatNumber(totalBonuses)}
                          </td>
                          <td className="p-3.5 font-mono tabular-nums text-[var(--md-warning)] font-bold">
                            -{formatNumber(totalAdv)}
                          </td>
                          <td className="p-3.5 font-mono tabular-nums text-[var(--md-error)] font-bold">
                            -{formatNumber(totalDeductions)}
                          </td>
                          <td className="p-3.5 font-mono tabular-nums font-black text-[var(--md-primary-text)] bg-[var(--md-primary-container)]/35">
                            {formatNumber(netPayable)} {emp.currency}
                          </td>
                          <td className="p-3.5 text-center">
                            {existingRecord ? (
                              <span className="m3-badge m3-badge-success inline-flex items-center gap-1 px-3 py-1 text-xs">
                                <CheckCircle className="w-3.5 h-3.5" />
                                <span>تم الصرف</span>
                              </span>
                            ) : (
                              <button
                                onClick={() => {
                                  setDisburseEmp(emp);
                                  setShowDisburseModal(true);
                                }}
                                className="m3-btn-primary !min-h-[30px] !px-3 !py-1 text-xs cursor-pointer"
                              >
                                <DollarSign className="w-3.5 h-3.5" />
                                <span>صرف الراتب</span>
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* SECTION 2: OPERATING EXPENSES & COST CENTERS */}
      {/* ========================================================================= */}
      {activeTab === 'expenses' && (
        <div className="space-y-6">
          {/* KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="m3-card p-4">
              <div className="flex items-center justify-between text-[var(--md-on-surface-variant)] mb-2">
                <span className="text-xs font-bold">إجمالي المصروفات التشغيلية</span>
                <div className="p-2 bg-[var(--md-success-container)] text-[var(--md-on-success-container)] rounded-xl">
                  <DollarSign className="w-4 h-4" />
                </div>
              </div>
              <div className="text-2xl font-black text-[var(--md-on-surface)] font-mono tabular-nums">
                {formatNumber(expenseStats.total)}{' '}
                <span className="text-xs font-normal text-[var(--md-on-surface-variant)]">{systemCurrency}</span>
              </div>
              <div className="text-xs text-[var(--md-on-surface-variant)] mt-1">
                سجلات الصرف المعتمدة ({expenses.length} سند)
              </div>
            </div>

            <div className="m3-card p-4">
              <div className="flex items-center justify-between text-[var(--md-on-surface-variant)] mb-2">
                <span className="text-xs font-bold">بند الرواتب والأجور والسلف</span>
                <div className="p-2 bg-[var(--md-info-container)] text-[var(--md-on-info-container)] rounded-xl">
                  <Users className="w-4 h-4" />
                </div>
              </div>
              <div className="text-2xl font-black text-[var(--md-info)] font-mono tabular-nums">
                {formatNumber(expenseStats.salariesExpense)}{' '}
                <span className="text-xs font-normal text-[var(--md-on-surface-variant)]">{systemCurrency}</span>
              </div>
              <div className="text-xs text-[var(--md-on-surface-variant)] mt-1">ترحيل تلقائي من مسير الرواتب</div>
            </div>

            <div className="m3-card p-4">
              <div className="flex items-center justify-between text-[var(--md-on-surface-variant)] mb-2">
                <span className="text-xs font-bold">الإيجارات والطاقة والخدمات</span>
                <div className="p-2 bg-[var(--md-secondary-container)] text-[var(--md-on-secondary-container)] rounded-xl">
                  <Building className="w-4 h-4" />
                </div>
              </div>
              <div className="text-2xl font-black text-[var(--md-secondary)] font-mono tabular-nums">
                {formatNumber(expenseStats.rentAndUtilities)}{' '}
                <span className="text-xs font-normal text-[var(--md-on-surface-variant)]">{systemCurrency}</span>
              </div>
              <div className="text-xs text-[var(--md-on-surface-variant)] mt-1">إيجارات ومولدات وكهرباء ومياه</div>
            </div>

            <div className="m3-card p-4">
              <div className="flex items-center justify-between text-[var(--md-on-surface-variant)] mb-2">
                <span className="text-xs font-bold">أعلى مركز تكلفة تحميلاً</span>
                <div className="p-2 bg-[var(--md-warning-container)] text-[var(--md-on-warning-container)] rounded-xl">
                  <Layers className="w-4 h-4" />
                </div>
              </div>
              <div className="text-base font-black text-[var(--md-on-surface)] truncate">
                {expenseStats.topCenter}
              </div>
              <div className="text-xs text-[var(--md-warning)] font-mono tabular-nums font-bold mt-1">
                {formatNumber(expenseStats.topCenterVal)} {systemCurrency}
              </div>
            </div>
          </div>

          {/* Filter Bar & Actions */}
          <div className="m3-card p-4 space-y-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
              {/* Search */}
              <div className="relative flex-1">
                <Search className="w-4 h-4 absolute right-3.5 top-1/2 -translate-y-1/2 text-[var(--md-on-surface-variant)]" />
                <input
                  type="text"
                  placeholder="بحث برقم السند، المستفيد، البيان..."
                  value={expenseSearch}
                  onChange={(e) => setExpenseSearch(e.target.value)}
                  className="m3-input !h-10 !pr-10 text-xs"
                />
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2 flex-wrap">
                <button
                  onClick={() => {
                    setEditingExpense(null);
                    setShowExpenseModal(true);
                  }}
                  className="m3-btn-primary text-xs cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>تسجيل سند مصروف جديد</span>
                </button>

                <button
                  onClick={() => exportExpensesToExcel(filteredExpenses, companyName)}
                  className="m3-btn-tonal text-xs cursor-pointer"
                >
                  <FileSpreadsheet className="w-4 h-4" />
                  <span>تصدير إكسل منظم</span>
                </button>
              </div>
            </div>

            {/* Dropdown Filters */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2 text-xs">
              <div>
                <label className="block text-[var(--md-on-surface-variant)] mb-1">التصنيف:</label>
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="m3-select !h-9 text-xs"
                >
                  <option value="الكل">كل التصنيفات</option>
                  {EXPENSE_CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[var(--md-on-surface-variant)] mb-1">مركز التكلفة:</label>
                <select
                  value={selectedCostCenter}
                  onChange={(e) => setSelectedCostCenter(e.target.value)}
                  className="m3-select !h-9 text-xs"
                >
                  <option value="الكل">كل مراكز التكلفة</option>
                  {COST_CENTERS.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[var(--md-on-surface-variant)] mb-1">الخزينة / المصدر:</label>
                <select
                  value={selectedTreasury}
                  onChange={(e) => setSelectedTreasury(e.target.value)}
                  className="m3-select !h-9 text-xs"
                >
                  <option value="الكل">كل الخزائن</option>
                  {TREASURIES.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[var(--md-on-surface-variant)] mb-1">العملة:</label>
                <select
                  value={selectedCurrency}
                  onChange={(e) => setSelectedCurrency(e.target.value)}
                  className="m3-select !h-9 text-xs"
                >
                  <option value="الكل">كل العملات</option>
                  <option value="YER">ريال يمني (YER)</option>
                  <option value="SAR">ريال سعودي (SAR)</option>
                  <option value="USD">دولار أمريكي (USD)</option>
                </select>
              </div>

              <div>
                <label className="block text-[var(--md-on-surface-variant)] mb-1">من تاريخ:</label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="m3-input !h-9 text-xs font-mono tabular-nums"
                />
              </div>

              <div>
                <label className="block text-[var(--md-on-surface-variant)] mb-1">إلى تاريخ:</label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="m3-input !h-9 text-xs font-mono tabular-nums"
                />
              </div>
            </div>
          </div>

          {/* Expenses Table */}
          <div className="m3-card overflow-hidden">
            <div className="p-4 border-b border-[var(--md-outline-variant)] flex items-center justify-between">
              <h3 className="font-bold text-[var(--md-on-surface)] text-sm flex items-center gap-2">
                <FileText className="w-4 h-4 text-[var(--md-primary-text)]" />
                <span>سجل وسندات صرف المصروفات ({filteredExpenses.length})</span>
              </h3>
            </div>

            <div className="overflow-x-auto">
              <table className="m3-table text-right text-xs" dir="rtl">
                <thead className="m3-thead">
                  <tr>
                    <th className="m3-th">رقم السند</th>
                    <th className="m3-th">التاريخ</th>
                    <th className="m3-th">التصنيف المحاسبي</th>
                    <th className="m3-th">مركز التكلفة</th>
                    <th className="m3-th">المستفيد</th>
                    <th className="m3-th">الخزينة / المصدر</th>
                    <th className="m3-th">المبلغ</th>
                    <th className="m3-th">البيان</th>
                    <th className="m3-th text-center">طباعة وإجراءات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--md-outline-variant)]">
                  {filteredExpenses.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="p-8 text-center text-[var(--md-on-surface-variant)]">
                        لا توجد سندات صرف تطابق معايير البحث الحالية.
                      </td>
                    </tr>
                  ) : (
                    filteredExpenses.map((exp) => (
                      <tr key={exp.id} className="hover:bg-[var(--md-surface-container-low)] transition-colors">
                        <td className="p-3.5 font-mono tabular-nums font-bold text-[var(--md-primary-text)]">
                          {exp.voucherNumber}
                        </td>
                        <td className="p-3.5 font-mono tabular-nums text-[var(--md-on-surface-variant)]">{formatDateOnly(exp.date)}</td>
                        <td className="p-3.5 font-bold text-[var(--md-on-surface)]">{exp.category}</td>
                        <td className="p-3.5">
                          <span className="m3-badge m3-badge-secondary text-xs">
                            {exp.costCenter}
                          </span>
                        </td>
                        <td className="p-3.5 font-medium text-[var(--md-on-surface)]">{exp.beneficiary}</td>
                        <td className="p-3.5 text-[var(--md-on-surface-variant)]">{exp.treasury}</td>
                        <td className="p-3.5 font-mono tabular-nums font-black text-[var(--md-success)]">
                          {formatNumber(exp.amount)} {exp.currency}
                        </td>
                        <td className="p-3.5 text-[var(--md-on-surface-variant)] max-w-xs truncate">
                          {exp.description || '-'}
                        </td>
                        <td className="p-3.5">
                          <div className="flex items-center justify-center gap-1.5">
                            {/* Print A4 */}
                            <button
                              onClick={() =>
                                printExpenseVoucher(exp, { companyName, format: 'a4' })
                              }
                              title="طباعة سند صرف A4"
                              className="m3-btn-text !min-h-[30px] !p-1.5 !text-[var(--md-info)] cursor-pointer"
                            >
                              <Printer className="w-4 h-4" />
                            </button>

                            {/* Print Thermal 80mm */}
                            <button
                              onClick={() =>
                                printExpenseVoucher(exp, { companyName, format: 'thermal' })
                              }
                              title="طباعة إيصال كاشير 80mm"
                              className="m3-btn-text !min-h-[30px] !px-2 !py-1 !text-[var(--md-secondary)] text-xs font-mono font-bold cursor-pointer"
                            >
                              80mm
                            </button>

                            {/* Edit */}
                            <button
                              onClick={() => {
                                setEditingExpense(exp);
                                setShowExpenseModal(true);
                              }}
                              title="تعديل السند"
                              className="m3-btn-text !min-h-[30px] !p-1.5 cursor-pointer"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>

                            {/* Delete */}
                            <button
                              onClick={() => handleDeleteExpense(exp.id, exp.voucherNumber)}
                              title="حذف السند"
                              className="m3-btn-text !min-h-[30px] !p-1.5 !text-[var(--md-error)] cursor-pointer"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 1: ADD / EDIT EMPLOYEE */}
      {/* ========================================================================= */}
      {showEmployeeModal && (
        <EmployeeFormModal
          employee={editingEmployee}
          onClose={() => {
            setShowEmployeeModal(false);
            setEditingEmployee(null);
          }}
          onSave={handleSaveEmployee}
        />
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: ADD EMPLOYEE MOVEMENT (ADVANCE, BONUS, DEDUCTION) */}
      {/* ========================================================================= */}
      {showMovementModal && (
        <MovementFormModal
          employees={employees}
          preselectedEmployee={movementTargetEmp}
          onClose={() => {
            setShowMovementModal(false);
            setMovementTargetEmp(null);
          }}
          onSave={handleSaveMovement}
        />
      )}

      {/* ========================================================================= */}
      {/* MODAL 3: DISBURSE PAYROLL */}
      {/* ========================================================================= */}
      {showDisburseModal && disburseEmp && (
        <PayrollDisburseModal
          employee={disburseEmp}
          month={payrollMonth}
          movements={movements.filter((m) => m.employeeId === disburseEmp.id)}
          onClose={() => {
            setShowDisburseModal(false);
            setDisburseEmp(null);
          }}
          onDisburse={handleDisbursePayroll}
        />
      )}

      {/* ========================================================================= */}
      {/* MODAL 4: ADD / EDIT EXPENSE VOUCHER */}
      {/* ========================================================================= */}
      {showExpenseModal && (
        <ExpenseFormModal
          expense={editingExpense}
          onClose={() => {
            setShowExpenseModal(false);
            setEditingExpense(null);
          }}
          onSave={handleSaveExpense}
        />
      )}
    </div>
  );
};

// -------------------------------------------------------------
// Sub-Modal: Add / Edit Employee
// -------------------------------------------------------------
interface EmployeeModalProps {
  employee: Employee | null;
  onClose: () => void;
  onSave: (data: any) => void;
}

const EmployeeFormModal: React.FC<EmployeeModalProps> = ({ employee, onClose, onSave }) => {
  const { company, currentCompany } = useAuth();
  const activeCompany = company || currentCompany;
  const systemCurrency = activeCompany?.currency || localStorage.getItem('erp_currency') || 'YER';
  const [name, setName] = useState(employee?.name || '');
  const [code, setCode] = useState(employee?.code || `EMP-${Date.now().toString().slice(-4)}`);
  const [roleTitle, setRoleTitle] = useState(employee?.roleTitle || 'عامل');
  const [phone, setPhone] = useState(employee?.phone || '');
  const [branch, setBranch] = useState(employee?.branch || 'المحل / المعرض الرئيسي');
  const [hireDate, setHireDate] = useState(
    employee?.hireDate ? formatDateOnly(employee.hireDate) : new Date().toISOString().split('T')[0]
  );
  const [baseSalary, setBaseSalary] = useState(String(employee?.baseSalary || 2000));
  const [currency, setCurrency] = useState(employee?.currency || systemCurrency);
  const [status, setStatus] = useState(employee?.status || 'نشط');
  const [notes, setNotes] = useState(employee?.notes || '');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    onSave({
      name: name.trim(),
      code: code.trim(),
      roleTitle: roleTitle.trim(),
      phone: phone.trim(),
      branch: branch.trim(),
      hireDate,
      baseSalary: Number(toEnglishDigits(baseSalary)) || 0,
      currency,
      status,
      notes: notes.trim(),
    });
  };

  return (
    <div className="fixed inset-0 z-50 m3-backdrop flex items-center justify-center p-4">
      <div className="m3-modal-surface max-w-lg w-full p-6 space-y-4 max-h-[90vh] overflow-y-auto text-[var(--md-on-surface)]" dir="rtl">
        <div className="flex items-center justify-between border-b border-[var(--md-outline-variant)] pb-3">
          <h3 className="font-bold text-[var(--md-on-surface)] text-base flex items-center gap-2">
            <Users className="w-5 h-5 text-[var(--md-primary-text)]" />
            <span>{employee ? 'تعديل بيانات الموظف' : 'إضافة موظف جديد'}</span>
          </h3>
          <button onClick={onClose} className="m3-btn-text !min-h-[32px] !p-1.5 cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[var(--md-on-surface-variant)] font-bold mb-1">كود الموظف *</label>
              <input
                type="text"
                required
                value={code}
                onChange={(e) => setCode(e.target.value)}
                className="m3-input !h-10 font-mono tabular-nums text-xs"
              />
            </div>
            <div>
              <label className="block text-[var(--md-on-surface-variant)] font-bold mb-1">اسم الموظف الرباعي *</label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="m3-input !h-10 font-bold text-xs"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[var(--md-on-surface-variant)] font-bold mb-1">المسمى الوظيفي *</label>
              <select
                value={roleTitle}
                onChange={(e) => setRoleTitle(e.target.value)}
                className="m3-select !h-10 text-xs"
              >
                <option value="كاشير ومحاسب مبيعات">كاشير ومحاسب مبيعات</option>
                <option value="محاسب عام ومدير حسابات">محاسب عام ومدير حسابات</option>
                <option value="أمين مستودع ومخازن">أمين مستودع ومخازن</option>
                <option value="عامل طرمبة محطة وقود">عامل طرمبة محطة وقود</option>
                <option value="فني بنشر وإطارات وبطاريات">فني بنشر وإطارات وبطاريات</option>
                <option value="مندوب مبيعات وتوزيع">مندوب مبيعات وتوزيع</option>
                <option value="عامل خدمات وبوفيه">عامل خدمات وبوفيه</option>
                <option value="حارس أمن ومشرف فرع">حارس أمن ومشرف فرع</option>
              </select>
            </div>
            <div>
              <label className="block text-[var(--md-on-surface-variant)] font-bold mb-1">رقم الهاتف</label>
              <input
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="77xxxxxxx"
                className="m3-input !h-10 font-mono tabular-nums text-left text-xs"
                dir="ltr"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[var(--md-on-surface-variant)] font-bold mb-1">الفرع / موقع العمل</label>
              <select
                value={branch}
                onChange={(e) => setBranch(e.target.value)}
                className="m3-select !h-10 text-xs"
              >
                {COST_CENTERS.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-[var(--md-on-surface-variant)] font-bold mb-1">تاريخ التعيين (تاريخ فقط)</label>
              <input
                type="date"
                required
                value={hireDate}
                onChange={(e) => setHireDate(e.target.value)}
                className="m3-input !h-10 font-mono tabular-nums text-xs"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-[var(--md-on-surface-variant)] font-bold mb-1">الراتب الأساسي *</label>
              <input
                type="text"
                required
                value={baseSalary}
                onChange={(e) => setBaseSalary(toEnglishDigits(e.target.value))}
                className="m3-input !h-10 font-mono tabular-nums font-bold text-xs"
              />
            </div>
            <div>
              <label className="block text-[var(--md-on-surface-variant)] font-bold mb-1">العملة</label>
              <select
                value={currency}
                onChange={(e: any) => setCurrency(e.target.value)}
                className="m3-select !h-10 font-bold text-xs"
              >
                <option value="SAR">ريال سعودي (SAR)</option>
                <option value="YER">ريال يمني (YER)</option>
                <option value="USD">دولار أمريكي (USD)</option>
              </select>
            </div>
            <div>
              <label className="block text-[var(--md-on-surface-variant)] font-bold mb-1">حالة الموظف</label>
              <select
                value={status}
                onChange={(e: any) => setStatus(e.target.value)}
                className="m3-select !h-10 text-xs"
              >
                <option value="نشط">نشط</option>
                <option value="في إجازة">في إجازة</option>
                <option value="موقوف">موقوف</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-[var(--md-on-surface-variant)] font-bold mb-1">ملاحظات إضافية</label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="m3-input !h-auto py-2.5 text-xs"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-[var(--md-outline-variant)]">
            <button
              type="button"
              onClick={onClose}
              className="m3-btn-outlined text-xs cursor-pointer"
            >
              إلغاء
            </button>
            <button
              type="submit"
              className="m3-btn-primary text-xs cursor-pointer"
            >
              حفظ الموظف
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// -------------------------------------------------------------
// Sub-Modal: Add Employee Movement
// -------------------------------------------------------------
interface MovementModalProps {
  employees: Employee[];
  preselectedEmployee: Employee | null;
  onClose: () => void;
  onSave: (data: any) => void;
}

const MovementFormModal: React.FC<MovementModalProps> = ({
  employees,
  preselectedEmployee,
  onClose,
  onSave,
}) => {
  const { company, currentCompany } = useAuth();
  const activeCompany = company || currentCompany;
  const systemCurrency = activeCompany?.currency || localStorage.getItem('erp_currency') || 'YER';
  const [employeeId, setEmployeeId] = useState(
    preselectedEmployee?.id || employees[0]?.id || ''
  );
  const [type, setType] = useState<'advance' | 'bonus' | 'deduction'>('advance');
  const [amount, setAmount] = useState('200');
  const [currency, setCurrency] = useState(preselectedEmployee?.currency || systemCurrency);
  const [date, setDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [treasury, setTreasury] = useState(TREASURIES[0]);
  const [description, setDescription] = useState('');
  const [attendanceStatus, setAttendanceStatus] = useState<'present' | 'absent' | 'leave' | 'overtime'>('present');
  const [notes, setNotes] = useState('');

  const targetEmp = employees.find((e) => e.id === employeeId);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!employeeId) return;

    onSave({
      employeeId,
      employeeName: targetEmp?.name || '',
      type,
      amount: Number(toEnglishDigits(amount)) || 0,
      currency,
      date,
      treasury,
      description: description.trim() || (type === 'advance' ? 'سلفة موظف نقدية' : type === 'bonus' ? 'مكافأة / حافز' : 'خصم غياب / جزاء'),
      attendanceStatus,
      notes: notes.trim(),
    });
  };

  return (
    <div className="fixed inset-0 z-50 m3-backdrop flex items-center justify-center p-4">
      <div className="m3-modal-surface max-w-lg w-full p-6 space-y-4 max-h-[90vh] overflow-y-auto text-[var(--md-on-surface)]" dir="rtl">
        <div className="flex items-center justify-between border-b border-[var(--md-outline-variant)] pb-3">
          <h3 className="font-bold text-[var(--md-on-surface)] text-base flex items-center gap-2">
            <ArrowDownRight className="w-5 h-5 text-[var(--md-warning)]" />
            <span>تسجيل سلفة / مكافأة / خصم / حضور</span>
          </h3>
          <button onClick={onClose} className="m3-btn-text !min-h-[32px] !p-1.5 cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <div>
            <label className="block text-[var(--md-on-surface-variant)] font-bold mb-1">الموظف *</label>
            <select
              required
              value={employeeId}
              onChange={(e) => setEmployeeId(e.target.value)}
              className="m3-select !h-10 font-bold text-xs"
            >
              {employees.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.code} - {e.name} ({e.roleTitle})
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[var(--md-on-surface-variant)] font-bold mb-1">نوع الحركة المالية *</label>
              <select
                value={type}
                onChange={(e: any) => setType(e.target.value)}
                className="m3-select !h-10 font-bold text-xs"
              >
                <option value="advance">سلفة نقدية (تخصم من الراتب)</option>
                <option value="bonus">مكافأة / بدل إضافي (تزيد الراتب)</option>
                <option value="deduction">خصم / جزاء / عجز (يخصم من الراتب)</option>
              </select>
            </div>
            <div>
              <label className="block text-[var(--md-on-surface-variant)] font-bold mb-1">التاريخ (YYYY-MM-DD) *</label>
              <input
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="m3-input !h-10 font-mono tabular-nums font-bold text-xs"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[var(--md-on-surface-variant)] font-bold mb-1">المبلغ *</label>
              <input
                type="text"
                required
                value={amount}
                onChange={(e) => setAmount(toEnglishDigits(e.target.value))}
                className="m3-input !h-10 font-mono tabular-nums font-bold text-base"
              />
            </div>
            <div>
              <label className="block text-[var(--md-on-surface-variant)] font-bold mb-1">العملة</label>
              <select
                value={currency}
                onChange={(e: any) => setCurrency(e.target.value)}
                className="m3-select !h-10 font-bold text-xs"
              >
                <option value="SAR">ريال سعودي (SAR)</option>
                <option value="YER">ريال يمني (YER)</option>
                <option value="USD">دولار أمريكي (USD)</option>
              </select>
            </div>
          </div>

          {type === 'advance' && (
            <div>
              <label className="block text-[var(--md-on-surface-variant)] font-bold mb-1">
                الخزينة المسحوب منها السلفة *
              </label>
              <select
                value={treasury}
                onChange={(e) => setTreasury(e.target.value)}
                className="m3-select !h-10 text-xs"
              >
                {TREASURIES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label className="block text-[var(--md-on-surface-variant)] font-bold mb-1">البيان والسبب</label>
            <input
              type="text"
              placeholder="مثال: سلفة نقدية لعلاج عائلي / مكافأة تميز بالعمل..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="m3-input !h-10 text-xs"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-[var(--md-outline-variant)]">
            <button
              type="button"
              onClick={onClose}
              className="m3-btn-outlined text-xs cursor-pointer"
            >
              إلغاء
            </button>
            <button
              type="submit"
              className="m3-btn-primary text-xs cursor-pointer"
            >
              تسجيل الحركة المالية
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// -------------------------------------------------------------
// Sub-Modal: Disburse Payroll
// -------------------------------------------------------------
interface PayrollDisburseModalProps {
  employee: Employee;
  month: string;
  movements: EmployeeMovement[];
  onClose: () => void;
  onDisburse: (data: any) => void;
}

const PayrollDisburseModal: React.FC<PayrollDisburseModalProps> = ({
  employee,
  month,
  movements,
  onClose,
  onDisburse,
}) => {
  const [paymentDate, setPaymentDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [treasury, setTreasury] = useState(TREASURIES[0]);
  const [notes, setNotes] = useState('');

  // Calculations
  const baseSalary = employee.baseSalary || 0;
  const totalAdvances = movements
    .filter((m) => m.type === 'advance')
    .reduce((s, m) => s + (Number(m.amount) || 0), 0);
  const totalBonuses = movements
    .filter((m) => m.type === 'bonus')
    .reduce((s, m) => s + (Number(m.amount) || 0), 0);
  const totalDeductions = movements
    .filter((m) => m.type === 'deduction')
    .reduce((s, m) => s + (Number(m.amount) || 0), 0);

  const [advancesDeducted, setAdvancesDeducted] = useState(String(totalAdvances));
  const [bonuses, setBonuses] = useState(String(totalBonuses));
  const [otherDeductions, setOtherDeductions] = useState(String(totalDeductions));

  const advNum = Number(toEnglishDigits(advancesDeducted)) || 0;
  const bonNum = Number(toEnglishDigits(bonuses)) || 0;
  const dedNum = Number(toEnglishDigits(otherDeductions)) || 0;

  const netSalary = Math.max(0, baseSalary + bonNum - advNum - dedNum);

  const handleConfirm = (e: React.FormEvent) => {
    e.preventDefault();
    onDisburse({
      employeeId: employee.id,
      employeeName: employee.name,
      month,
      baseSalary,
      bonuses: bonNum,
      advancesDeducted: advNum,
      otherDeductions: dedNum,
      netSalary,
      currency: employee.currency,
      paymentDate,
      treasury,
      notes: notes.trim(),
    });
  };

  return (
    <div className="fixed inset-0 z-50 m3-backdrop flex items-center justify-center p-4">
      <div className="m3-modal-surface max-w-lg w-full p-6 space-y-4 max-h-[90vh] overflow-y-auto text-[var(--md-on-surface)]" dir="rtl">
        <div className="flex items-center justify-between border-b border-[var(--md-outline-variant)] pb-3">
          <h3 className="font-bold text-[var(--md-on-surface)] text-base flex items-center gap-2">
            <DollarSign className="w-5 h-5 text-[var(--md-success)]" />
            <span>صرف راتب الموظف: {employee.name}</span>
          </h3>
          <button onClick={onClose} className="m3-btn-text !min-h-[32px] !p-1.5 cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleConfirm} className="space-y-4 text-xs">
          <div className="bg-[var(--md-surface-container-low)] border border-[var(--md-outline-variant)] rounded-xl p-3 grid grid-cols-2 gap-2 text-[var(--md-on-surface-variant)]">
            <div>
              الكود: <strong className="font-mono tabular-nums text-[var(--md-on-surface)]">{employee.code}</strong>
            </div>
            <div>
              المسمى: <strong className="text-[var(--md-on-surface)]">{employee.roleTitle}</strong>
            </div>
            <div>
              الفرع: <strong className="text-[var(--md-on-surface)]">{employee.branch}</strong>
            </div>
            <div>
              شهر الاستحقاق: <strong className="font-mono tabular-nums text-[var(--md-on-surface)]">{month}</strong>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[var(--md-on-surface-variant)] font-bold mb-1">الراتب الأساسي</label>
              <input
                type="text"
                disabled
                value={`${formatNumber(baseSalary)} ${employee.currency}`}
                className="m3-input !h-10 opacity-75 font-mono tabular-nums font-bold text-xs"
              />
            </div>
            <div>
              <label className="block text-[var(--md-on-surface-variant)] font-bold mb-1">المكافآت والبدلات (+)</label>
              <input
                type="text"
                value={bonuses}
                onChange={(e) => setBonuses(toEnglishDigits(e.target.value))}
                className="m3-input !h-10 !border-[var(--md-success)] font-mono tabular-nums font-bold text-[var(--md-success)] text-xs"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[var(--md-on-surface-variant)] font-bold mb-1">
                سلف مستقطعة من الراتب (-)
              </label>
              <input
                type="text"
                value={advancesDeducted}
                onChange={(e) => setAdvancesDeducted(toEnglishDigits(e.target.value))}
                className="m3-input !h-10 !border-[var(--md-warning)] font-mono tabular-nums font-bold text-[var(--md-warning)] text-xs"
              />
            </div>
            <div>
              <label className="block text-[var(--md-on-surface-variant)] font-bold mb-1">
                خصومات وغياب وجزاءات (-)
              </label>
              <input
                type="text"
                value={otherDeductions}
                onChange={(e) => setOtherDeductions(toEnglishDigits(e.target.value))}
                className="m3-input !h-10 !border-[var(--md-error)] font-mono tabular-nums font-bold text-[var(--md-error)] text-xs"
              />
            </div>
          </div>

          <div className="bg-[var(--md-success-container)] border border-[var(--md-success)]/30 rounded-xl p-4 flex items-center justify-between">
            <div>
              <div className="text-xs text-[var(--md-on-success-container)] font-bold">صافي المبلغ المصروف نقداً</div>
              <div className="text-xs text-[var(--md-on-success-container)] opacity-80">يرحل للمصروفات وقيد الأستاذ فوراً</div>
            </div>
            <div className="text-2xl font-black text-[var(--md-on-success-container)] font-mono tabular-nums">
              {formatNumber(netSalary)} {employee.currency}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[var(--md-on-surface-variant)] font-bold mb-1">خزينة الصرف *</label>
              <select
                value={treasury}
                onChange={(e) => setTreasury(e.target.value)}
                className="m3-select !h-10 font-bold text-xs"
              >
                {TREASURIES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-[var(--md-on-surface-variant)] font-bold mb-1">تاريخ الصرف *</label>
              <input
                type="date"
                required
                value={paymentDate}
                onChange={(e) => setPaymentDate(e.target.value)}
                className="m3-input !h-10 font-mono tabular-nums text-xs"
              />
            </div>
          </div>

          <div>
            <label className="block text-[var(--md-on-surface-variant)] font-bold mb-1">ملاحظات الصرف</label>
            <input
              type="text"
              placeholder="مثال: اعتماد مسير رواتب شهر أكتوبر..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="m3-input !h-10 text-xs"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-[var(--md-outline-variant)]">
            <button
              type="button"
              onClick={onClose}
              className="m3-btn-outlined text-xs cursor-pointer"
            >
              إلغاء
            </button>
            <button
              type="submit"
              className="m3-btn-primary text-xs cursor-pointer"
            >
              تأكيد صرف الراتب وترحيله
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// -------------------------------------------------------------
// Sub-Modal: Add / Edit Expense Voucher
// -------------------------------------------------------------
interface ExpenseModalProps {
  expense: Expense | null;
  onClose: () => void;
  onSave: (data: any) => void;
}

const ExpenseFormModal: React.FC<ExpenseModalProps> = ({ expense, onClose, onSave }) => {
  const { company, currentCompany } = useAuth();
  const activeCompany = company || currentCompany;
  const systemCurrency = activeCompany?.currency || localStorage.getItem('erp_currency') || 'YER';
  const [voucherNumber, setVoucherNumber] = useState(
    expense?.voucherNumber || `EXP-${Date.now().toString().slice(-5)}`
  );
  const [date, setDate] = useState(
    expense?.date ? formatDateOnly(expense.date) : new Date().toISOString().split('T')[0]
  );
  const [category, setCategory] = useState(expense?.category || EXPENSE_CATEGORIES[0]);
  const [costCenter, setCostCenter] = useState(expense?.costCenter || COST_CENTERS[0]);
  const [beneficiary, setBeneficiary] = useState(expense?.beneficiary || '');
  const [amount, setAmount] = useState(String(expense?.amount || 150));
  const [currency, setCurrency] = useState(expense?.currency || systemCurrency);
  const [paymentMethod, setPaymentMethod] = useState(expense?.paymentMethod || 'نقداً');
  const [treasury, setTreasury] = useState(expense?.treasury || TREASURIES[0]);
  const [description, setDescription] = useState(expense?.description || '');
  const [notes, setNotes] = useState(expense?.notes || '');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!beneficiary.trim() || !category) return;

    onSave({
      voucherNumber: voucherNumber.trim(),
      date,
      category,
      costCenter,
      beneficiary: beneficiary.trim(),
      amount: Number(toEnglishDigits(amount)) || 0,
      currency,
      paymentMethod,
      treasury,
      description: description.trim(),
      notes: notes.trim(),
    });
  };

  return (
    <div className="fixed inset-0 z-50 m3-backdrop flex items-center justify-center p-4">
      <div className="m3-modal-surface max-w-lg w-full p-6 space-y-4 max-h-[90vh] overflow-y-auto text-[var(--md-on-surface)]" dir="rtl">
        <div className="flex items-center justify-between border-b border-[var(--md-outline-variant)] pb-3">
          <h3 className="font-bold text-[var(--md-on-surface)] text-base flex items-center gap-2">
            <DollarSign className="w-5 h-5 text-[var(--md-success)]" />
            <span>{expense ? 'تعديل سند المصروف' : 'تسجيل سند صرف مصروفات تشغيلية'}</span>
          </h3>
          <button onClick={onClose} className="m3-btn-text !min-h-[32px] !p-1.5 cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[var(--md-on-surface-variant)] font-bold mb-1">رقم سند الصرف *</label>
              <input
                type="text"
                required
                value={voucherNumber}
                onChange={(e) => setVoucherNumber(e.target.value)}
                className="m3-input !h-10 font-mono tabular-nums font-bold text-xs"
              />
            </div>
            <div>
              <label className="block text-[var(--md-on-surface-variant)] font-bold mb-1">تاريخ السند (YYYY-MM-DD) *</label>
              <input
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="m3-input !h-10 font-mono tabular-nums text-xs"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[var(--md-on-surface-variant)] font-bold mb-1">التصنيف المحاسبي للمصروف *</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="m3-select !h-10 font-bold text-xs"
              >
                {EXPENSE_CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-[var(--md-on-surface-variant)] font-bold mb-1">مركز التكلفة *</label>
              <select
                value={costCenter}
                onChange={(e) => setCostCenter(e.target.value)}
                className="m3-select !h-10 font-bold text-xs"
              >
                {COST_CENTERS.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-2">
              <label className="block text-[var(--md-on-surface-variant)] font-bold mb-1">يصرف للمستفيد *</label>
              <input
                type="text"
                required
                placeholder="اسم المورد، المالك، الشركة، الموظف..."
                value={beneficiary}
                onChange={(e) => setBeneficiary(e.target.value)}
                className="m3-input !h-10 font-bold text-xs"
              />
            </div>
            <div>
              <label className="block text-[var(--md-on-surface-variant)] font-bold mb-1">المبلغ المصروف *</label>
              <input
                type="text"
                required
                value={amount}
                onChange={(e) => setAmount(toEnglishDigits(e.target.value))}
                className="m3-input !h-10 font-mono tabular-nums font-bold text-[var(--md-success)] text-base"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-[var(--md-on-surface-variant)] font-bold mb-1">العملة</label>
              <select
                value={currency}
                onChange={(e: any) => setCurrency(e.target.value)}
                className="m3-select !h-10 font-bold text-xs"
              >
                <option value="SAR">ريال سعودي (SAR)</option>
                <option value="YER">ريال يمني (YER)</option>
                <option value="USD">دولار أمريكي (USD)</option>
              </select>
            </div>
            <div>
              <label className="block text-[var(--md-on-surface-variant)] font-bold mb-1">طريقة الدفع</label>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
                className="m3-select !h-10 text-xs"
              >
                <option value="نقداً">نقداً من الصندوق</option>
                <option value="تحويل بنكي">تحويل بنكي</option>
                <option value="محفظة إلكترونية">محفظة إلكترونية</option>
                <option value="شيك">شيك مصرفي</option>
              </select>
            </div>
            <div>
              <label className="block text-[var(--md-on-surface-variant)] font-bold mb-1">الخزينة المسحوب منها *</label>
              <select
                value={treasury}
                onChange={(e) => setTreasury(e.target.value)}
                className="m3-select !h-10 font-bold text-xs"
              >
                {TREASURIES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-[var(--md-on-surface-variant)] font-bold mb-1">البيان والشرح التفصيلي</label>
            <input
              type="text"
              placeholder="مثال: سداد فاتورة كهرباء شهر أكتوبر / إيجار المستودع..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="m3-input !h-10 text-xs"
            />
          </div>

          <div>
            <label className="block text-[var(--md-on-surface-variant)] font-bold mb-1">ملاحظات أو مراجع فواتير</label>
            <textarea
              rows={2}
              placeholder="أرقام فواتير المورد أو السندات الورقية المرفقة..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="m3-input !h-auto py-2.5 text-xs"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-[var(--md-outline-variant)]">
            <button
              type="button"
              onClick={onClose}
              className="m3-btn-outlined text-xs cursor-pointer"
            >
              إلغاء
            </button>
            <button
              type="submit"
              className="m3-btn-primary text-xs cursor-pointer"
            >
              حفظ وترحيل السند
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
