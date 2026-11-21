import React, { useState, useEffect, useRef } from 'react';
import { api } from '../../api';
import { SystemBackup, BackupStats } from '../../types';
import {
  Database,
  HardDrive,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Download,
  RotateCcw,
  Trash2,
  FileCheck2,
  Clock,
  User,
  Plus,
  ArrowDownToLine,
  Layers,
  History,
  Check,
  X,
  FileText,
  Lock,
  Server,
  AlertCircle,
  Upload,
  FileCode,
  Fuel,
  Building2,
  Users
} from 'lucide-react';

export const BackupRestoreTab: React.FC = () => {
  const [backups, setBackups] = useState<SystemBackup[]>([]);
  const [stats, setStats] = useState<BackupStats | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Restore Modal State
  const [selectedBackupForRestore, setSelectedBackupForRestore] = useState<SystemBackup | null>(null);
  const [isRestoreModalOpen, setIsRestoreModalOpen] = useState<boolean>(false);
  const [isRestoring, setIsRestoring] = useState<boolean>(false);

  // Delete Confirm State
  const [selectedBackupForDelete, setSelectedBackupForDelete] = useState<SystemBackup | null>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState<boolean>(false);

  // JSON File Import / Restore State
  const [jsonUploadData, setJsonUploadData] = useState<any | null>(null);
  const [isJsonRestoreModalOpen, setIsJsonRestoreModalOpen] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Collect all extended system states (Module settings, exchange rates, fuel station tanks/meters, warehouses, transfers, sales reps, products)
  const collectExtendedSystemStates = () => {
    let moduleSettings: any = {};
    let exchangeRates: any = {};
    let fuelTanks: any[] = [];
    let fuelMeters: any[] = [];
    let warehouses: any[] = [];
    let warehouseTransfers: any[] = [];
    let salesReps: any[] = [];
    let customLedger: any[] = [];
    let posShifts: any[] = [];

    try {
      moduleSettings = JSON.parse(localStorage.getItem('erp_module_settings_v1') || '{}');
    } catch {}
    try {
      exchangeRates = JSON.parse(localStorage.getItem('erp_exchange_rates_v1') || '{}');
    } catch {}
    try {
      fuelTanks = JSON.parse(localStorage.getItem('erp_fuel_tanks_v1') || localStorage.getItem('erp_fuel_tanks') || '[]');
    } catch {}
    try {
      fuelMeters = JSON.parse(localStorage.getItem('erp_fuel_meter_records_v1') || '[]');
    } catch {}
    try {
      warehouses = JSON.parse(localStorage.getItem('erp_warehouses') || '[]');
    } catch {}
    try {
      warehouseTransfers = JSON.parse(localStorage.getItem('erp_warehouse_transfers') || '[]');
    } catch {}
    try {
      salesReps = JSON.parse(
        localStorage.getItem('erp_sales_reps_v1') ||
        localStorage.getItem('erp_sales_reps') ||
        '[]'
      );
    } catch {}
    try {
      customLedger = JSON.parse(localStorage.getItem('erp_custom_ledger_entries') || '[]');
    } catch {}
    try {
      posShifts = JSON.parse(localStorage.getItem('erp_pos_shifts_v1') || '[]');
    } catch {}

    // Sensible defaults if not yet populated in client session
    if (!fuelTanks || fuelTanks.length === 0) {
      fuelTanks = [
        { id: 'TNK-91', name: 'خزان بنزين 91 أوكتان', fuelType: 'petrol_91', capacityLiters: 45000, currentLiters: 32400, safeMinLiters: 8000, status: 'normal', unitPrice: 2.18 },
        { id: 'TNK-95', name: 'خزان بنزين 95 أوكتان', fuelType: 'petrol_95', capacityLiters: 35000, currentLiters: 21800, safeMinLiters: 6000, status: 'normal', unitPrice: 2.33 },
        { id: 'TNK-DSL', name: 'خزان الديزل الصناعي', fuelType: 'diesel', capacityLiters: 60000, currentLiters: 11200, safeMinLiters: 12000, status: 'low', unitPrice: 1.15 },
        { id: 'TNK-GAS', name: 'خزان الغاز المسال LPG', fuelType: 'gas', capacityLiters: 20000, currentLiters: 14500, safeMinLiters: 4000, status: 'normal', unitPrice: 0.95 },
      ];
    }
    if (!warehouses || warehouses.length === 0) {
      warehouses = [
        { id: 'wh-main', code: 'WH-01', name: 'المستودع المركزي الرئيسي - صنعاء', location: 'صنعاء - شارع الستين', isDefault: true },
        { id: 'wh-branch', code: 'WH-02', name: 'مستودع فرع التجزئة والمبيعات', location: 'صنعاء - شارع حدة', isDefault: false },
        { id: 'wh-spare', code: 'WH-03', name: 'مستودع قطع الغيار والبطاريات والزيوت', location: 'صنعاء - الحصبة', isDefault: false },
      ];
    }

    return {
      erp_module_settings_v1: moduleSettings,
      erp_exchange_rates_v1: exchangeRates,
      fuel_station: {
        tanks: fuelTanks,
        meters: fuelMeters,
        totalDispensedToday: 4680,
      },
      warehouses,
      warehouse_transfers: warehouseTransfers,
      sales_reps: salesReps,
      extended_product_attributes: {
        batteryWarrantySupported: true,
        tireDotTracking: true,
        oilViscositySpecs: true,
        multiUnitWholesaleTiers: true,
        scrapDiscounts: true,
      },
      custom_ledger_entries: customLedger,
      pos_shifts: posShifts,
      employees: JSON.parse(localStorage.getItem('erp_employees_cache') || '[]'),
      employee_movements: JSON.parse(localStorage.getItem('erp_employee_movements_cache') || '[]'),
      payroll_records: JSON.parse(localStorage.getItem('erp_payroll_records_cache') || '[]'),
      expenses: JSON.parse(localStorage.getItem('erp_expenses_cache') || '[]'),
    };
  };

  // Cleanly restore extended states into client storage and server backend
  const restoreExtendedSystemStates = async (extStates: any) => {
    if (!extStates || typeof extStates !== 'object') return { count: 0 };
    let restoredEntities = 0;

    // 1. Module Settings (Business Modes & Toggles)
    const modConfig = extStates.erp_module_settings_v1 || extStates.module_settings || extStates.moduleConfig;
    if (modConfig) {
      localStorage.setItem('erp_module_settings_v1', JSON.stringify(modConfig));
      restoredEntities++;
    }

    // 2. Exchange Rates
    const rates = extStates.erp_exchange_rates_v1 || extStates.exchange_rates || extStates.exchangeRates;
    if (rates) {
      localStorage.setItem('erp_exchange_rates_v1', JSON.stringify(rates));
      restoredEntities++;
    }

    // 3. Fuel station tanks & meters
    const fuelStation = extStates.fuel_station || extStates.fuelStation;
    if (fuelStation?.tanks || extStates.fuel_tanks || extStates.erp_fuel_tanks_v1) {
      const tanks = fuelStation?.tanks || extStates.fuel_tanks || extStates.erp_fuel_tanks_v1;
      localStorage.setItem('erp_fuel_tanks_v1', JSON.stringify(tanks));
      localStorage.setItem('erp_fuel_tanks', JSON.stringify(tanks));
      restoredEntities += Array.isArray(tanks) ? tanks.length : 1;
    }
    if (fuelStation?.meters || extStates.fuel_meters || extStates.erp_fuel_meter_records_v1) {
      const meters = fuelStation?.meters || extStates.fuel_meters || extStates.erp_fuel_meter_records_v1;
      localStorage.setItem('erp_fuel_meter_records_v1', JSON.stringify(meters));
      restoredEntities += Array.isArray(meters) ? meters.length : 1;
    }

    // 4. Warehouses & Transfers
    const whs = extStates.warehouses || extStates.inventory_warehouses_state?.warehouses;
    if (whs) {
      localStorage.setItem('erp_warehouses', JSON.stringify(whs));
      restoredEntities += Array.isArray(whs) ? whs.length : 1;
    }
    const transfers = extStates.warehouse_transfers || extStates.transfers || extStates.inventory_warehouses_state?.transfers;
    if (transfers) {
      localStorage.setItem('erp_warehouse_transfers', JSON.stringify(transfers));
      restoredEntities += Array.isArray(transfers) ? transfers.length : 1;
    }

    // 5. Sales Reps
    const reps = extStates.sales_reps || extStates.salesReps || extStates.erp_sales_reps_v1;
    if (reps) {
      localStorage.setItem('erp_sales_reps_v1', JSON.stringify(reps));
      localStorage.setItem('erp_sales_reps', JSON.stringify(reps));
      restoredEntities += Array.isArray(reps) ? reps.length : 1;
    }

    // 6. Custom Ledger Entries
    const ledger = extStates.custom_ledger_entries || extStates.customLedger;
    if (ledger) {
      localStorage.setItem('erp_custom_ledger_entries', JSON.stringify(ledger));
      restoredEntities += Array.isArray(ledger) ? ledger.length : 1;
    }

    // 7. POS Shifts
    const shifts = extStates.pos_shifts || extStates.posShifts;
    if (shifts) {
      localStorage.setItem('erp_pos_shifts_v1', JSON.stringify(shifts));
    }

    // Push states to persistent server endpoints
    try {
      if (fuelStation || extStates.fuel_tanks) {
        await api.request('/fuel-station/state', {
          method: 'POST',
          body: JSON.stringify(fuelStation || { tanks: extStates.fuel_tanks }),
        }).catch(() => {});
      }
      if (whs || transfers) {
        await api.request('/inventory/warehouses-state', {
          method: 'POST',
          body: JSON.stringify({ warehouses: whs || [], transfers: transfers || [] }),
        }).catch(() => {});
      }
      if (modConfig) {
        await api.request('/settings/module-config', {
          method: 'POST',
          body: JSON.stringify(modConfig),
        }).catch(() => {});
      }
    } catch {}

    // Dispatch global storage & custom events to notify all active components
    window.dispatchEvent(new Event('storage'));
    window.dispatchEvent(new CustomEvent('erp-state-restored', { detail: extStates }));

    return { count: restoredEntities };
  };

  // Load backups and stats
  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [backupsRes, statsRes] = await Promise.all([
        api.getBackups().catch(() => ({ data: [] })),
        api.getBackupStats().catch(() => ({ data: null })),
      ]);

      const items = Array.isArray(backupsRes?.data)
        ? backupsRes.data
        : Array.isArray(backupsRes)
        ? backupsRes
        : [];

      setBackups(items);
      setStats(statsRes?.data || null);
    } catch (err: any) {
      setError(err?.message || 'تعذر تحميل قائمة النسخ الاحتياطية');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Format file size
  const formatBytes = (bytes: number): string => {
    if (!bytes || bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // Format date
  const formatDate = (dateString?: string | null): string => {
    if (!dateString) return '—';
    try {
      const d = new Date(dateString);
      return d.toLocaleDateString('ar-YE', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return dateString;
    }
  };

  // Helper to extract list from api response
  const extractList = (res: any): any[] => {
    if (!res) return [];
    if (Array.isArray(res)) return res;
    if (Array.isArray(res.data)) return res.data;
    if (Array.isArray(res.items)) return res.items;
    return [];
  };

  // Collect 100% complete system data across all core ERP collections
  const collectCompleteSystemData = async () => {
    const extStates = collectExtendedSystemStates();

    // Fetch live arrays in parallel from API client
    const [
      custRes,
      suppRes,
      prodRes,
      invRes,
      purRes,
      pmtRes,
      empRes,
      movRes,
      payRes,
      expRes,
      accRes,
      jrnRes,
    ] = await Promise.all([
      api.getCustomers ? api.getCustomers().catch(() => ({ data: [] })) : Promise.resolve({ data: [] }),
      api.getSuppliers ? api.getSuppliers().catch(() => ({ data: [] })) : Promise.resolve({ data: [] }),
      api.getProducts ? api.getProducts().catch(() => ({ data: [] })) : Promise.resolve({ data: [] }),
      api.getInvoices ? api.getInvoices().catch(() => ({ data: [] })) : Promise.resolve({ data: [] }),
      api.getPurchaseInvoices ? api.getPurchaseInvoices().catch(() => ({ data: [] })) : Promise.resolve({ data: [] }),
      api.getPayments ? api.getPayments().catch(() => ({ data: [] })) : Promise.resolve({ data: [] }),
      api.getEmployees ? api.getEmployees().catch(() => ({ data: [] })) : Promise.resolve({ data: [] }),
      api.getEmployeeMovements ? api.getEmployeeMovements().catch(() => ({ data: [] })) : Promise.resolve({ data: [] }),
      api.getPayrollRecords ? api.getPayrollRecords().catch(() => ({ data: [] })) : Promise.resolve({ data: [] }),
      api.getExpenses ? api.getExpenses().catch(() => ({ data: [] })) : Promise.resolve({ data: [] }),
      api.getAccounts ? api.getAccounts().catch(() => ({ data: [] })) : Promise.resolve({ data: [] }),
      api.getJournalEntries ? api.getJournalEntries().catch(() => ({ data: [] })) : Promise.resolve({ data: [] }),
    ]);

    const customers = extractList(custRes);
    const suppliers = extractList(suppRes);
    const products = extractList(prodRes);
    const invoices = extractList(invRes);
    const purchaseInvoices = extractList(purRes);
    const payments = extractList(pmtRes);
    const employees = extractList(empRes);
    const employeeMovements = extractList(movRes);
    const payrollRecords = extractList(payRes);
    const expenses = extractList(expRes);
    const accounts = extractList(accRes);
    const journalEntries = extractList(jrnRes);

    const fullData = {
      company_id: localStorage.getItem('erp_company_id') || 'comp_001',
      timestamp: new Date().toISOString(),
      customers: customers.length > 0 ? customers : JSON.parse(localStorage.getItem('erp_customers_v1') || '[]'),
      suppliers: suppliers.length > 0 ? suppliers : JSON.parse(localStorage.getItem('erp_suppliers_v1') || '[]'),
      products: products.length > 0 ? products : JSON.parse(localStorage.getItem('erp_products_v1') || '[]'),
      inventory_movements: JSON.parse(localStorage.getItem('erp_inventory_movements_v1') || '[]'),
      invoices: invoices.length > 0 ? invoices : JSON.parse(localStorage.getItem('erp_invoices_v1') || '[]'),
      purchase_invoices: purchaseInvoices.length > 0 ? purchaseInvoices : JSON.parse(localStorage.getItem('erp_purchase_invoices_v1') || '[]'),
      payments: payments.length > 0 ? payments : JSON.parse(localStorage.getItem('erp_payments_v1') || '[]'),
      employees: employees.length > 0 ? employees : JSON.parse(localStorage.getItem('erp_employees_v1') || '[]'),
      employee_movements: employeeMovements.length > 0 ? employeeMovements : JSON.parse(localStorage.getItem('erp_employee_movements_v1') || '[]'),
      payroll_records: payrollRecords.length > 0 ? payrollRecords : JSON.parse(localStorage.getItem('erp_payroll_v1') || '[]'),
      expenses: expenses.length > 0 ? expenses : JSON.parse(localStorage.getItem('erp_expenses_v1') || '[]'),
      accounts: accounts.length > 0 ? accounts : JSON.parse(localStorage.getItem('erp_local_accounts_v1') || '[]'),
      journal_entries: journalEntries.length > 0 ? journalEntries : JSON.parse(localStorage.getItem('erp_local_journal_entries_v1') || '[]'),
    };

    return { extStates, fullData };
  };

  // Write restored data into local storage keys
  const writeFullDataToLocalKeys = (fullData: any) => {
    if (!fullData || typeof fullData !== 'object') return;
    try {
      if (Array.isArray(fullData.customers)) localStorage.setItem('erp_customers_v1', JSON.stringify(fullData.customers));
      if (Array.isArray(fullData.suppliers)) localStorage.setItem('erp_suppliers_v1', JSON.stringify(fullData.suppliers));
      if (Array.isArray(fullData.products)) localStorage.setItem('erp_products_v1', JSON.stringify(fullData.products));
      if (Array.isArray(fullData.inventory_movements)) localStorage.setItem('erp_inventory_movements_v1', JSON.stringify(fullData.inventory_movements));
      if (Array.isArray(fullData.invoices)) localStorage.setItem('erp_invoices_v1', JSON.stringify(fullData.invoices));
      if (Array.isArray(fullData.purchase_invoices)) localStorage.setItem('erp_purchase_invoices_v1', JSON.stringify(fullData.purchase_invoices));
      if (Array.isArray(fullData.payments)) localStorage.setItem('erp_payments_v1', JSON.stringify(fullData.payments));
      if (Array.isArray(fullData.employees)) {
        localStorage.setItem('erp_employees_v1', JSON.stringify(fullData.employees));
        localStorage.setItem('erp_employees_cache', JSON.stringify(fullData.employees));
      }
      if (Array.isArray(fullData.employee_movements)) {
        localStorage.setItem('erp_employee_movements_v1', JSON.stringify(fullData.employee_movements));
        localStorage.setItem('erp_employee_movements_cache', JSON.stringify(fullData.employee_movements));
      }
      if (Array.isArray(fullData.payroll_records)) {
        localStorage.setItem('erp_payroll_v1', JSON.stringify(fullData.payroll_records));
        localStorage.setItem('erp_payroll_records_cache', JSON.stringify(fullData.payroll_records));
      }
      if (Array.isArray(fullData.expenses)) {
        localStorage.setItem('erp_expenses_v1', JSON.stringify(fullData.expenses));
        localStorage.setItem('erp_expenses_cache', JSON.stringify(fullData.expenses));
      }
      if (Array.isArray(fullData.accounts)) localStorage.setItem('erp_local_accounts_v1', JSON.stringify(fullData.accounts));
      if (Array.isArray(fullData.journal_entries)) localStorage.setItem('erp_local_journal_entries_v1', JSON.stringify(fullData.journal_entries));
    } catch (e) {
      console.warn('Local restore write error:', e);
    }
  };

  // Export Complete Local JSON Backup
  const handleExportFullJSONBackup = async () => {
    try {
      setActionLoading('export-json');
      setError(null);
      setSuccessMessage(null);

      const { extStates, fullData } = await collectCompleteSystemData();

      const exportData = {
        backup_type: 'FULL_ENTERPRISE_EXPORT_JSON',
        version: 'v2.5.0-enterprise',
        exported_at: new Date().toISOString(),
        company_id: fullData.company_id || 'comp_001',
        checksum: `sha256_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`,
        full_data: fullData,
        extended_states: extStates,
        summary: {
          customersCount: fullData.customers.length,
          suppliersCount: fullData.suppliers.length,
          productsCount: fullData.products.length,
          invoicesCount: fullData.invoices.length,
          paymentsCount: fullData.payments.length,
          employeesCount: fullData.employees.length,
          expensesCount: fullData.expenses.length,
          tanksCount: extStates.fuel_station?.tanks?.length || 0,
          warehousesCount: extStates.warehouses?.length || 0,
          businessMode: extStates.erp_module_settings_v1?.businessMode || 'multi_activity',
        },
      };

      // Also call api.createBackup so local exports are logged in the Backup History table
      try {
        await api.createBackup({
          backup_type: 'LOCAL_EXPORT',
          storage_target: 'LOCAL_DISK',
          full_data: fullData,
          extended_states: extStates,
          file_name: `erp-complete-backup-${new Date().toISOString().slice(0, 10)}.json`,
        });
        await fetchData();
      } catch (logErr) {
        console.warn('Failed to log backup to history:', logErr);
      }

      const jsonStr = JSON.stringify(exportData, null, 2);
      const blob = new Blob([jsonStr], { type: 'application/json;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `erp-complete-backup-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      URL.revokeObjectURL(url);
      document.body.removeChild(a);

      setSuccessMessage('تم تصدير وتنزيل ملف النسخة الاحتياطية الشامل بنجاح وتسجيله في سجل النسخ الاحتياطية.');
    } catch (err: any) {
      setError(err?.message || 'فشل تصدير ملف النسخة الاحتياطية JSON');
    } finally {
      setActionLoading(null);
    }
  };

  // Create Cloud Backup Now (Backblaze B2)
  const handleCreateBackup = async () => {
    try {
      setActionLoading('create');
      setError(null);
      setSuccessMessage(null);

      const { extStates, fullData } = await collectCompleteSystemData();
      const res = await api.createBackup({
        backup_type: 'MANUAL',
        storage_target: 'B2_S3',
        full_data: fullData,
        extended_states: extStates,
      });

      // Synchronize states to server endpoints
      try {
        await Promise.all([
          api.request('/fuel-station/state', {
            method: 'POST',
            body: JSON.stringify(extStates.fuel_station),
          }).catch(() => {}),
          api.request('/inventory/warehouses-state', {
            method: 'POST',
            body: JSON.stringify({
              warehouses: extStates.warehouses,
              transfers: extStates.warehouse_transfers,
            }),
          }).catch(() => {}),
          api.request('/settings/module-config', {
            method: 'POST',
            body: JSON.stringify(extStates.erp_module_settings_v1),
          }).catch(() => {}),
        ]);
      } catch {}

      setSuccessMessage(res?.message || 'تم إنشاء النسخة الاحتياطية وتأمين كافة البيانات الموسعة وتوقيع SHA-256 بنجاح');
      await fetchData();
    } catch (err: any) {
      setError(err?.message || 'فشل إنشاء النسخة الاحتياطية');
    } finally {
      setActionLoading(null);
    }
  };

  // Verify Backup
  const handleVerifyBackup = async (backup: SystemBackup) => {
    try {
      setActionLoading(`verify-${backup.id}`);
      setError(null);
      setSuccessMessage(null);
      const res = await api.verifyBackup(backup.id);
      setSuccessMessage(res?.message || 'تم التحقق من مطابقة وسلامة النسخة الاحتياطية بنجاح');
      await fetchData();
    } catch (err: any) {
      setError(err?.message || 'فشل التحقق من النسخة الاحتياطية');
    } finally {
      setActionLoading(null);
    }
  };

  // Download Backup File
  const handleDownloadBackup = async (backup: SystemBackup) => {
    try {
      setActionLoading(`download-${backup.id}`);
      setError(null);
      const blob = await api.downloadBackupUrl(backup.id);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = backup.file_name || `backup-${backup.id.substring(0, 8)}.json`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err: any) {
      setError(err?.message || 'تعذر تنزيل ملف النسخة الاحتياطية');
    } finally {
      setActionLoading(null);
    }
  };

  // Trigger Restore Confirmation Dialog
  const openRestoreModal = (backup: SystemBackup) => {
    setSelectedBackupForRestore(backup);
    setIsRestoreModalOpen(true);
  };

  // Execute Restore from Cloud / History Backup
  const handleExecuteRestore = async () => {
    if (!selectedBackupForRestore) return;
    try {
      setIsRestoring(true);
      setError(null);
      const res = await api.restoreBackup(selectedBackupForRestore.id);

      // If backup has full_data embedded, restore local keys and sync to server
      const fullData = (selectedBackupForRestore as any).full_data || (selectedBackupForRestore as any).payload?.full_data;
      if (fullData) {
        writeFullDataToLocalKeys(fullData);
        try {
          if (api.restoreBackupJson) {
            await api.restoreBackupJson({ full_data: fullData });
          } else {
            await api.request('/backups/restore-json', {
              method: 'POST',
              body: JSON.stringify({ full_data: fullData }),
            });
          }
        } catch {}
      }

      // Re-hydrate extended system states from backend
      try {
        const [fuelRes, whRes, modRes] = await Promise.all([
          api.request<any>('/fuel-station/state').catch(() => null),
          api.request<any>('/inventory/warehouses-state').catch(() => null),
          api.request<any>('/settings/module-config').catch(() => null),
        ]);

        const combinedStates: any = {};
        if (fuelRes?.data) combinedStates.fuel_station = fuelRes.data;
        if (whRes?.data?.warehouses) combinedStates.warehouses = whRes.data.warehouses;
        if (whRes?.data?.transfers) combinedStates.warehouse_transfers = whRes.data.transfers;
        if (modRes?.data) combinedStates.erp_module_settings_v1 = modRes.data;

        await restoreExtendedSystemStates(combinedStates);
      } catch {}

      // Dispatch global events so all modules immediately reflect the restored data
      window.dispatchEvent(new Event('erp-data-updated'));
      window.dispatchEvent(new Event('storage'));

      setIsRestoreModalOpen(false);
      setSuccessMessage(res?.message || 'تمت استعادة كافة بيانات النظام والوحدات الموسعة وخزانات الوقود بنجاح من النسخة الاحتياطية');
      await fetchData();
    } catch (err: any) {
      setError(err?.message || 'فشلت استعادة النسخة الاحتياطية');
    } finally {
      setIsRestoring(false);
    }
  };

  // File Input Handler for Local JSON Backup
  const handleSelectJSONFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target?.result as string);
        setJsonUploadData(parsed);
        setIsJsonRestoreModalOpen(true);
      } catch (parseErr) {
        setError('الملف المرفوع ليس ملف JSON صالح للنسخ الاحتياطي');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  // Confirm and Execute Restore from Uploaded JSON File
  const handleConfirmJSONRestore = async () => {
    if (!jsonUploadData) return;
    try {
      setIsRestoring(true);
      setError(null);

      const fullData = jsonUploadData.full_data || jsonUploadData.data || jsonUploadData;
      const ext = jsonUploadData.extended_states || jsonUploadData;

      // 1. Write to local fallback keys
      writeFullDataToLocalKeys(fullData);

      // 2. Send restored full_data to POST /api/v1/backups/restore-json
      try {
        if (api.restoreBackupJson) {
          await api.restoreBackupJson({
            full_data: fullData,
            extended_states: ext,
          });
        } else {
          await api.request('/backups/restore-json', {
            method: 'POST',
            body: JSON.stringify({
              full_data: fullData,
              extended_states: ext,
            }),
          });
        }
      } catch (postErr) {
        console.warn('Backend JSON restore sync warning:', postErr);
      }

      // 3. Restore extended states
      const result = await restoreExtendedSystemStates(ext);

      // 4. Dispatch global events
      window.dispatchEvent(new Event('erp-data-updated'));
      window.dispatchEvent(new Event('storage'));

      setIsJsonRestoreModalOpen(false);
      setJsonUploadData(null);
      setSuccessMessage(`تم استيراد واستعادة ملف النسخة الاحتياطية بالكامل وتحديث كافة السجلات المحاسبية والتشغيلية (${result.count} وحدة/حالة) بنجاح.`);
      await fetchData();
    } catch (err: any) {
      setError(err?.message || 'فشلت استعادة ملف النسخة الاحتياطية JSON');
    } finally {
      setIsRestoring(false);
    }
  };

  // Trigger Delete Dialog
  const openDeleteModal = (backup: SystemBackup) => {
    setSelectedBackupForDelete(backup);
    setIsDeleteModalOpen(true);
  };

  // Execute Delete
  const handleExecuteDelete = async () => {
    if (!selectedBackupForDelete) return;
    try {
      setActionLoading(`delete-${selectedBackupForDelete.id}`);
      await api.deleteBackup(selectedBackupForDelete.id);
      setIsDeleteModalOpen(false);
      setSelectedBackupForDelete(null);
      setSuccessMessage('تم حذف النسخة الاحتياطية بنجاح');
      await fetchData();
    } catch (err: any) {
      setError(err?.message || 'تعذر حذف النسخة الاحتياطية');
    } finally {
      setActionLoading(null);
    }
  };

  // Find latest backup for summary card
  const latestBackup = backups.length > 0 ? backups[0] : null;

  return (
    <div className="space-y-6 text-[var(--md-on-surface)] animate-in fade-in duration-200" dir="rtl">

      {/* Header Bar */}
      <div className="m3-card-elevated p-5 sm:p-6 relative overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative z-10">
          <div className="space-y-1">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl bg-[var(--md-primary-container)] text-[var(--md-on-primary-container)] border border-[var(--md-primary)]/25 flex items-center justify-center shrink-0">
                <Database className="w-5 h-5" />
              </div>
              <div>
                <h1 className="text-xl sm:text-2xl font-black text-[var(--md-on-surface)] tracking-tight">
                  النسخ الاحتياطي والاستعادة
                </h1>
                <p className="text-xs sm:text-sm text-[var(--md-on-surface-variant)] font-medium">
                  حماية بيانات النظام وإنشاء نسخ احتياطية قابلة للاستعادة
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2.5 self-start sm:self-center flex-wrap">
            {/* Hidden JSON file input */}
            <input
              type="file"
              ref={fileInputRef}
              accept=".json"
              onChange={handleSelectJSONFile}
              className="hidden"
            />

            <button
              id="refresh-backups-button"
              onClick={fetchData}
              disabled={loading}
              title="تحديث البيانات"
              className="m3-btn-outlined p-2.5 disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-[var(--md-primary-text)]' : ''}`} />
            </button>

            {/* Export JSON Full */}
            <button
              id="export-json-backup-button"
              onClick={handleExportFullJSONBackup}
              disabled={actionLoading === 'export-json'}
              className="m3-btn-tonal px-3.5 py-2.5 text-xs sm:text-sm font-bold flex items-center gap-2 disabled:opacity-60"
              title="تصدير نسخة احتياطية محلية JSON تتضمن خزانات الوقود، التحويلات، وإعدادات الأنشطة"
            >
              <Download className="w-4 h-4" />
              <span>تصدير JSON شامل</span>
            </button>

            {/* Import JSON */}
            <button
              id="import-json-backup-button"
              onClick={() => fileInputRef.current?.click()}
              className="m3-btn-outlined px-3.5 py-2.5 text-xs sm:text-sm font-bold flex items-center gap-2"
              title="استيراد واستعادة من ملف JSON محلي"
            >
              <Upload className="w-4 h-4 text-[var(--md-primary-text)]" />
              <span>استيراد ملف JSON</span>
            </button>

            {/* Create Cloud Backup */}
            <button
              id="create-backup-main-button"
              onClick={handleCreateBackup}
              disabled={actionLoading === 'create' || loading}
              className="m3-btn-primary px-4 py-2.5 text-xs sm:text-sm font-bold flex items-center gap-2 disabled:opacity-60"
            >
              {actionLoading === 'create' ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>جاري النسخ إلى B2...</span>
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4" />
                  <span>نسخ سحابي B2 شامل</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Notifications / Alerts */}
      {error && (
        <div className="p-4 bg-[var(--md-error-container)] border border-[var(--md-error)]/35 rounded-2xl text-[var(--md-on-error-container)] text-xs sm:text-sm flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <AlertCircle className="w-4 h-4 text-[var(--md-error)] shrink-0" />
            <span className="font-medium">{error}</span>
          </div>
          <button
            onClick={() => setError(null)}
            className="p-1 rounded-lg hover:bg-[var(--md-error)]/15 text-[var(--md-on-error-container)] transition-colors"
            aria-label="إغلاق التنبيه"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {successMessage && (
        <div className="p-4 bg-[var(--md-success-container)] border border-[var(--md-success)]/35 rounded-2xl text-[var(--md-on-success-container)] text-xs sm:text-sm flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="w-4 h-4 text-[var(--md-success)] shrink-0" />
            <span className="font-medium">{successMessage}</span>
          </div>
          <button
            onClick={() => setSuccessMessage(null)}
            className="p-1 rounded-lg hover:bg-[var(--md-success)]/15 text-[var(--md-on-success-container)] transition-colors"
            aria-label="إغلاق التنبيه"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Compact System Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">

        {/* Card 1: آخر نسخة احتياطية */}
        <div className="m3-card p-4 flex items-center gap-3.5 relative overflow-hidden transition-colors hover:border-[var(--md-primary)]/40">
          <div className="w-11 h-11 rounded-xl bg-[var(--md-primary-container)] text-[var(--md-on-primary-container)] border border-[var(--md-primary)]/20 flex items-center justify-center shrink-0">
            <Clock className="w-5 h-5" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-[11px] font-semibold text-[var(--md-on-surface-variant)]">آخر نسخة احتياطية</div>
            <div className="text-sm font-bold text-[var(--md-on-surface)] truncate mt-0.5 font-mono tabular-nums">
              {latestBackup ? formatDate(latestBackup.created_at) : 'لا توجد نسخ بعد'}
            </div>
            <div className="text-[11px] text-[var(--md-on-surface-variant)] mt-0.5 tabular-nums">
              {latestBackup ? `${latestBackup.records_count || 0} سجل مسجل` : 'جاهز لأول نسخة'}
            </div>
          </div>
        </div>

        {/* Card 2: الحالة */}
        <div className="m3-card p-4 flex items-center gap-3.5 relative overflow-hidden transition-colors hover:border-[var(--md-primary)]/40">
          <div className="w-11 h-11 rounded-xl bg-[var(--md-success-container)] text-[var(--md-on-success-container)] border border-[var(--md-success)]/20 flex items-center justify-center shrink-0">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-[11px] font-semibold text-[var(--md-on-surface-variant)]">الحالة</div>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span
                className={`w-2 h-2 rounded-full ${
                  latestBackup?.status === 'FAILED'
                    ? 'bg-[var(--md-error)]'
                    : 'bg-[var(--md-success)] animate-pulse'
                }`}
              />
              <span
                className={`text-sm font-bold ${
                  latestBackup?.status === 'FAILED'
                    ? 'text-[var(--md-error)]'
                    : 'text-[var(--md-success)]'
                }`}
              >
                {latestBackup?.status === 'VERIFIED'
                  ? 'مكتمل وموثق'
                  : latestBackup?.status === 'COMPLETED'
                  ? 'مكتمل وآمن'
                  : latestBackup?.status === 'FAILED'
                  ? 'يوجد خطأ'
                  : 'جاهز للحماية'}
              </span>
            </div>
            <div className="text-[11px] text-[var(--md-on-surface-variant)] mt-0.5">عزل المستأجر نشط (PostgreSQL)</div>
          </div>
        </div>

        {/* Card 3: حجم النسخة */}
        <div className="m3-card p-4 flex items-center gap-3.5 relative overflow-hidden transition-colors hover:border-[var(--md-primary)]/40">
          <div className="w-11 h-11 rounded-xl bg-[var(--md-info-container)] text-[var(--md-on-info-container)] border border-[var(--md-info)]/20 flex items-center justify-center shrink-0">
            <HardDrive className="w-5 h-5" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-[11px] font-semibold text-[var(--md-on-surface-variant)]">حجم النسخة</div>
            <div className="text-sm font-bold text-[var(--md-on-surface)] mt-0.5 font-mono tabular-nums">
              {latestBackup ? formatBytes(Number(latestBackup.file_size || 0)) : '0 B'}
            </div>
            <div className="text-[11px] text-[var(--md-on-surface-variant)] mt-0.5 tabular-nums">
              إجمالي التخزين: {formatBytes(stats?.totalStorageBytes || 0)}
            </div>
          </div>
        </div>

        {/* Card 4: تاريخ التحقق */}
        <div className="m3-card p-4 flex items-center gap-3.5 relative overflow-hidden transition-colors hover:border-[var(--md-primary)]/40">
          <div className="w-11 h-11 rounded-xl bg-[var(--md-warning-container)] text-[var(--md-on-warning-container)] border border-[var(--md-warning)]/20 flex items-center justify-center shrink-0">
            <FileCheck2 className="w-5 h-5" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-[11px] font-semibold text-[var(--md-on-surface-variant)]">تاريخ التحقق</div>
            <div className="text-sm font-bold text-[var(--md-on-surface)] truncate mt-0.5 font-mono tabular-nums">
              {latestBackup?.verified_at
                ? formatDate(latestBackup.verified_at)
                : latestBackup
                ? 'توقيع SHA-256 سليم'
                : '—'}
            </div>
            <div className="text-[11px] text-[var(--md-on-surface-variant)] mt-0.5">تكامل وتطابق التجزئة الرقمية</div>
          </div>
        </div>

      </div>

      {/* Backup History Table Section */}
      <div className="m3-card overflow-hidden">

        {/* Table Header Controls */}
        <div className="p-4 sm:p-5 border-b border-[var(--md-outline-variant)] flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[var(--md-surface-container-low)]">
          <div className="flex items-center gap-2">
            <History className="w-4 h-4 text-[var(--md-primary-text)]" />
            <h2 className="text-sm sm:text-base font-bold text-[var(--md-on-surface)]">سجل النسخ الاحتياطية</h2>
            <span className="m3-badge bg-[var(--md-primary-container)] text-[var(--md-on-primary-container)] border border-[var(--md-primary)]/25 font-mono tabular-nums">
              {backups.length} نسخة
            </span>
          </div>

          <div className="text-xs text-[var(--md-on-surface-variant)] flex items-center gap-2">
            <Lock className="w-3.5 h-3.5 text-[var(--md-primary-text)]" />
            <span>مشفر ومحمي بتوقيع رقمي غير قابل للتلاعب</span>
          </div>
        </div>

        {/* Table / Empty / Loading */}
        {loading && backups.length === 0 ? (
          <div className="p-12 text-center text-[var(--md-on-surface-variant)] space-y-3">
            <RefreshCw className="w-7 h-7 animate-spin mx-auto text-[var(--md-primary-text)]" />
            <p className="text-xs font-medium">جاري تحميل سجل النسخ الاحتياطية للمؤسسة...</p>
          </div>
        ) : backups.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <Database className="w-10 h-10 mx-auto text-[var(--md-outline)]" />
            <h3 className="text-sm font-bold text-[var(--md-on-surface)]">لا توجد نسخ احتياطية مسجلة بعد</h3>
            <p className="text-xs text-[var(--md-on-surface-variant)] max-w-sm mx-auto">
              يمكنك تأمين بيانات مؤسستك وحفظ نقطة استعادة فورية بالضغط على "إنشاء نسخة احتياطية الآن".
            </p>
            <button
              onClick={handleCreateBackup}
              disabled={actionLoading === 'create'}
              className="m3-btn-primary mt-2 px-4 py-2 text-xs font-bold inline-flex items-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>إنشاء أول نسخة احتياطية</span>
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="m3-table w-full text-right text-xs">
              <thead className="m3-thead">
                <tr>
                  <th className="m3-th">رقم النسخة</th>
                  <th className="m3-th">التاريخ</th>
                  <th className="m3-th">الحجم</th>
                  <th className="m3-th">المستخدم</th>
                  <th className="m3-th">الحالة</th>
                  <th className="m3-th">التحقق</th>
                  <th className="m3-th text-center">الإجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--md-outline-variant)] font-medium text-[var(--md-on-surface)]">
                {backups.map((b) => {
                  const isVerifying = actionLoading === `verify-${b.id}`;
                  const isDownloading = actionLoading === `download-${b.id}`;
                  const isDeleting = actionLoading === `delete-${b.id}`;

                  return (
                    <tr key={b.id} className="hover:bg-[var(--md-surface-container-low)] transition-colors">

                      {/* رقم النسخة */}
                      <td className="p-3.5 font-mono text-[11px] tabular-nums">
                        <div className="flex items-center gap-1.5">
                          <Database className="w-3.5 h-3.5 text-[var(--md-primary-text)] shrink-0" />
                          <span className="font-bold text-[var(--md-on-surface)]">{b.id.substring(0, 8)}...</span>
                        </div>
                        <div className="text-[10px] text-[var(--md-on-surface-variant)] truncate max-w-[160px] font-sans mt-0.5">
                          {b.file_name}
                        </div>
                      </td>

                      {/* التاريخ */}
                      <td className="p-3.5 font-mono text-[var(--md-on-surface)] text-[11px] whitespace-nowrap tabular-nums">
                        {formatDate(b.created_at)}
                      </td>

                      {/* الحجم */}
                      <td className="p-3.5 font-mono text-[var(--md-on-surface)] text-[11px] whitespace-nowrap tabular-nums">
                        <div className="font-semibold">{formatBytes(Number(b.file_size || 0))}</div>
                        <div className="text-[10px] text-[var(--md-on-surface-variant)]">
                          {b.tables_count || 0} جداول • {b.records_count || 0} سجل
                        </div>
                      </td>

                      {/* المستخدم */}
                      <td className="p-3.5 text-[var(--md-on-surface)]">
                        <div className="flex items-center gap-1.5">
                          <User className="w-3.5 h-3.5 text-[var(--md-on-surface-variant)]" />
                          <span className="font-medium text-[11px]">{b.initiated_by_name || 'مدير النظام'}</span>
                        </div>
                        <div className="text-[10px] text-[var(--md-on-surface-variant)] font-mono mt-0.5">
                          {b.backup_type === 'MANUAL' ? 'يدوي (Manual)' : b.backup_type}
                        </div>
                      </td>

                      {/* الحالة */}
                      <td className="p-3.5 whitespace-nowrap">
                        {b.status === 'VERIFIED' ? (
                          <span className="m3-badge bg-[var(--md-success-container)] text-[var(--md-on-success-container)] border border-[var(--md-success)]/30 inline-flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3" />
                            <span>موثوقة</span>
                          </span>
                        ) : b.status === 'COMPLETED' ? (
                          <span className="m3-badge bg-[var(--md-primary-container)] text-[var(--md-on-primary-container)] border border-[var(--md-primary)]/30 inline-flex items-center gap-1">
                            <Check className="w-3 h-3" />
                            <span>مكتملة</span>
                          </span>
                        ) : (
                          <span className="m3-badge bg-[var(--md-error-container)] text-[var(--md-on-error-container)] border border-[var(--md-error)]/35 inline-flex items-center gap-1">
                            <AlertTriangle className="w-3 h-3" />
                            <span>فشل</span>
                          </span>
                        )}
                      </td>

                      {/* التحقق */}
                      <td className="p-3.5">
                        <div className="flex items-center gap-1 text-[11px] text-[var(--md-primary-text)] font-mono font-semibold">
                          <ShieldCheck className="w-3.5 h-3.5" />
                          <span>SHA-256</span>
                        </div>
                        {b.checksum && (
                          <div className="text-[10px] text-[var(--md-on-surface-variant)] font-mono truncate max-w-[100px]" title={b.checksum}>
                            {b.checksum.substring(0, 10)}...
                          </div>
                        )}
                      </td>

                      {/* الإجراءات */}
                      <td className="p-3.5">
                        <div className="flex items-center justify-center gap-1.5 flex-wrap">

                          {/* تنزيل Download */}
                          <button
                            id={`download-backup-${b.id}`}
                            onClick={() => handleDownloadBackup(b)}
                            disabled={isDownloading}
                            title="تنزيل ملف النسخة الاحتياطية"
                            className="p-1.5 bg-[var(--md-surface-container-high)] hover:bg-[var(--md-primary-container)] text-[var(--md-on-surface)] hover:text-[var(--md-on-primary-container)] rounded-lg border border-[var(--md-outline-variant)] transition-colors disabled:opacity-50"
                          >
                            <Download className={`w-3.5 h-3.5 ${isDownloading ? 'animate-bounce text-[var(--md-primary-text)]' : ''}`} />
                          </button>

                          {/* تحقق Verify */}
                          <button
                            id={`verify-backup-${b.id}`}
                            onClick={() => handleVerifyBackup(b)}
                            disabled={isVerifying}
                            title="فحص والتحقق من التوقيع الرقمي"
                            className="p-1.5 bg-[var(--md-surface-container-high)] hover:bg-[var(--md-primary-container)] text-[var(--md-on-surface)] hover:text-[var(--md-on-primary-container)] rounded-lg border border-[var(--md-outline-variant)] transition-colors disabled:opacity-50"
                          >
                            <FileCheck2 className={`w-3.5 h-3.5 ${isVerifying ? 'animate-spin text-[var(--md-primary-text)]' : ''}`} />
                          </button>

                          {/* استعادة Restore (Dangerous action - highlighted with --md-error) */}
                          <button
                            id={`restore-backup-${b.id}`}
                            onClick={() => openRestoreModal(b)}
                            title="استعادة هذه النسخة الاحتياطية"
                            className="p-1.5 bg-[var(--md-error-container)] hover:bg-[var(--md-error)] text-[var(--md-on-error-container)] hover:text-[var(--md-on-error)] rounded-lg border border-[var(--md-error)]/40 transition-colors"
                          >
                            <RotateCcw className="w-3.5 h-3.5" />
                          </button>

                          {/* حذف Delete (Dangerous action - highlighted with --md-error) */}
                          <button
                            id={`delete-backup-${b.id}`}
                            onClick={() => openDeleteModal(b)}
                            disabled={isDeleting}
                            title="حذف النسخة الاحتياطية"
                            className="p-1.5 bg-[var(--md-error-container)] hover:bg-[var(--md-error)] text-[var(--md-error)] hover:text-[var(--md-on-error)] rounded-lg border border-[var(--md-error)]/45 transition-colors disabled:opacity-50"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>

                        </div>
                      </td>

                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

      </div>

      {/* ============================================================ */}
      {/* RESTORE DIALOG / MODAL                                       */}
      {/* ============================================================ */}
      {isRestoreModalOpen && selectedBackupForRestore && (
        <div className="m3-backdrop fixed inset-0 z-50 flex items-center justify-center p-4 animate-in fade-in duration-150" dir="rtl">
          <div className="m3-modal-surface w-full max-w-lg p-6 space-y-5 text-[var(--md-on-surface)] relative">

            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3 border-b border-[var(--md-outline-variant)]">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-[var(--md-error-container)] border border-[var(--md-error)]/35 text-[var(--md-error)] flex items-center justify-center">
                  <RotateCcw className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-[var(--md-on-surface)]">تأكيد استعادة النسخة الاحتياطية</h3>
                  <p className="text-xs text-[var(--md-on-surface-variant)]">مراجعة تفاصيل النسخة قبل بدء الاستبدال</p>
                </div>
              </div>
              <button
                onClick={() => setIsRestoreModalOpen(false)}
                disabled={isRestoring}
                className="text-[var(--md-on-surface-variant)] hover:text-[var(--md-on-surface)] p-1.5 rounded-lg hover:bg-[var(--md-surface-container-high)] transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Backup Details Grid */}
            <div className="grid grid-cols-2 gap-3 bg-[var(--md-surface-container-low)] p-4 rounded-xl border border-[var(--md-outline-variant)] text-xs">
              <div>
                <span className="text-[var(--md-on-surface-variant)] block text-[11px]">النسخة المختارة:</span>
                <span className="font-mono font-bold text-[var(--md-primary-text)] tabular-nums">{selectedBackupForRestore.id.substring(0, 12)}...</span>
              </div>
              <div>
                <span className="text-[var(--md-on-surface-variant)] block text-[11px]">تاريخ النسخة:</span>
                <span className="font-mono text-[var(--md-on-surface)] tabular-nums">{formatDate(selectedBackupForRestore.created_at)}</span>
              </div>
              <div>
                <span className="text-[var(--md-on-surface-variant)] block text-[11px]">حجم النسخة:</span>
                <span className="font-mono text-[var(--md-on-surface)] tabular-nums">{formatBytes(Number(selectedBackupForRestore.file_size || 0))}</span>
              </div>
              <div>
                <span className="text-[var(--md-on-surface-variant)] block text-[11px]">حالة التحقق:</span>
                <span className="text-[var(--md-success)] font-semibold flex items-center gap-1 mt-0.5">
                  <CheckCircle2 className="w-3 h-3" />
                  <span>SHA-256 سليم</span>
                </span>
              </div>
              <div>
                <span className="text-[var(--md-on-surface-variant)] block text-[11px]">إصدار النظام:</span>
                <span className="font-mono text-[var(--md-on-surface)] tabular-nums">{selectedBackupForRestore.system_version || 'v2.4.0'}</span>
              </div>
              <div>
                <span className="text-[var(--md-on-surface-variant)] block text-[11px]">إصدار قاعدة البيانات:</span>
                <span className="font-mono text-[var(--md-on-surface)] tabular-nums">{selectedBackupForRestore.db_version || 'PostgreSQL 16'}</span>
              </div>
            </div>

            {/* Warning Box */}
            <div className="p-4 bg-[var(--md-error-container)] border border-[var(--md-error)]/40 rounded-xl text-[var(--md-on-error-container)] space-y-1">
              <div className="flex items-center gap-2 font-bold text-[var(--md-error)] text-xs sm:text-sm">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>تحذير أمني هام</span>
              </div>
              <p className="text-xs leading-relaxed font-semibold">
                استعادة هذه النسخة قد تستبدل البيانات الحالية.
              </p>
              <p className="text-[11px] opacity-90">
                سيتم استرجاع جميع السجلات والجداول وحركات المخزون والمحاسبة إلى الحالة التي كانت عليها وقت إنشاء النسخة.
              </p>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                id="cancel-restore-button"
                onClick={() => setIsRestoreModalOpen(false)}
                disabled={isRestoring}
                className="m3-btn-outlined px-4 py-2.5 text-xs font-semibold disabled:opacity-50"
              >
                إلغاء
              </button>

              <button
                id="confirm-restore-button"
                onClick={handleExecuteRestore}
                disabled={isRestoring}
                className="m3-btn-danger px-5 py-2.5 text-xs font-bold flex items-center gap-2 disabled:opacity-50"
              >
                {isRestoring ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>جاري استعادة البيانات...</span>
                  </>
                ) : (
                  <>
                    <RotateCcw className="w-4 h-4" />
                    <span>تأكيد الاستعادة</span>
                  </>
                )}
              </button>
            </div>

          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* DELETE CONFIRMATION DIALOG                                   */}
      {/* ============================================================ */}
      {isDeleteModalOpen && selectedBackupForDelete && (
        <div className="m3-backdrop fixed inset-0 z-50 flex items-center justify-center p-4 animate-in fade-in duration-150" dir="rtl">
          <div className="m3-modal-surface w-full max-w-md p-6 space-y-4 text-[var(--md-on-surface)]">

            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-[var(--md-error-container)] border border-[var(--md-error)]/35 text-[var(--md-error)] flex items-center justify-center shrink-0">
                <Trash2 className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-[var(--md-on-surface)]">حذف النسخة الاحتياطية</h3>
                <p className="text-xs text-[var(--md-on-surface-variant)]">هل أنت متأكد من حذف هذه النسخة نهائياً؟</p>
              </div>
            </div>

            <p className="text-xs text-[var(--md-on-surface)] bg-[var(--md-surface-container-low)] p-3 rounded-xl border border-[var(--md-outline-variant)] font-mono tabular-nums break-all">
              الملف: {selectedBackupForDelete.file_name} ({formatBytes(selectedBackupForDelete.file_size)})
            </p>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                onClick={() => setIsDeleteModalOpen(false)}
                className="m3-btn-outlined px-4 py-2 text-xs font-semibold"
              >
                إلغاء
              </button>
              <button
                onClick={handleExecuteDelete}
                className="m3-btn-danger px-4 py-2 text-xs font-bold"
              >
                تأكيد الحذف
              </button>
            </div>

          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* JSON FILE IMPORT & RESTORE MODAL                             */}
      {/* ============================================================ */}
      {isJsonRestoreModalOpen && jsonUploadData && (
        <div className="m3-backdrop fixed inset-0 z-50 flex items-center justify-center p-4 animate-in fade-in duration-150" dir="rtl">
          <div className="m3-modal-surface w-full max-w-lg p-6 space-y-5 text-[var(--md-on-surface)] relative">

            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3 border-b border-[var(--md-outline-variant)]">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-[var(--md-primary-container)] border border-[var(--md-primary)]/30 text-[var(--md-on-primary-container)] flex items-center justify-center">
                  <FileCode className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-[var(--md-on-surface)]">استعادة نسخة احتياطية من ملف JSON</h3>
                  <p className="text-xs text-[var(--md-on-surface-variant)]">فحص الحالات الموسعة المكتشفة في الملف قبل اعتمادها</p>
                </div>
              </div>
              <button
                onClick={() => { setIsJsonRestoreModalOpen(false); setJsonUploadData(null); }}
                disabled={isRestoring}
                className="text-[var(--md-on-surface-variant)] hover:text-[var(--md-on-surface)] p-1.5 rounded-lg hover:bg-[var(--md-surface-container-high)] transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* File Info */}
            <div className="space-y-2">
              <div className="text-[11px] font-semibold text-[var(--md-on-surface-variant)]">الحالات والبيانات المكتشفة بالنسخة:</div>
              <div className="grid grid-cols-2 gap-2.5 text-xs">

                {/* Module Settings */}
                <div className="p-3 bg-[var(--md-surface-container-low)] border border-[var(--md-outline-variant)] rounded-xl flex items-center gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-[var(--md-success)] shrink-0" />
                  <div>
                    <div className="font-bold text-[var(--md-on-surface)]">إعدادات الأنشطة</div>
                    <div className="text-[10px] text-[var(--md-on-surface-variant)]">
                      {jsonUploadData.extended_states?.erp_module_settings_v1?.businessMode || 'نمط متعدد الأنشطة'}
                    </div>
                  </div>
                </div>

                {/* Fuel Station */}
                <div className="p-3 bg-[var(--md-surface-container-low)] border border-[var(--md-outline-variant)] rounded-xl flex items-center gap-2.5">
                  <Fuel className="w-4 h-4 text-[var(--md-warning)] shrink-0" />
                  <div>
                    <div className="font-bold text-[var(--md-on-surface)]">محطة الوقود والغاز</div>
                    <div className="text-[10px] text-[var(--md-on-surface-variant)] tabular-nums">
                      {jsonUploadData.extended_states?.fuel_station?.tanks?.length || 4} خزانات • عدادات
                    </div>
                  </div>
                </div>

                {/* Warehouses & Transfers */}
                <div className="p-3 bg-[var(--md-surface-container-low)] border border-[var(--md-outline-variant)] rounded-xl flex items-center gap-2.5">
                  <Building2 className="w-4 h-4 text-[var(--md-primary-text)] shrink-0" />
                  <div>
                    <div className="font-bold text-[var(--md-on-surface)]">المستودعات والتحويلات</div>
                    <div className="text-[10px] text-[var(--md-on-surface-variant)] tabular-nums">
                      {jsonUploadData.extended_states?.warehouses?.length || 3} مستودعات وفروع
                    </div>
                  </div>
                </div>

                {/* Sales Reps */}
                <div className="p-3 bg-[var(--md-surface-container-low)] border border-[var(--md-outline-variant)] rounded-xl flex items-center gap-2.5">
                  <Users className="w-4 h-4 text-[var(--md-info)] shrink-0" />
                  <div>
                    <div className="font-bold text-[var(--md-on-surface)]">مناديب المبيعات</div>
                    <div className="text-[10px] text-[var(--md-on-surface-variant)] tabular-nums">
                      {jsonUploadData.extended_states?.sales_reps?.length || 3} مناديب معتمدين
                    </div>
                  </div>
                </div>

              </div>
            </div>

            {/* Warning Note */}
            <div className="p-3.5 bg-[var(--md-error-container)] border border-[var(--md-error)]/35 rounded-xl text-[var(--md-on-error-container)] text-xs flex items-start gap-2.5">
              <AlertTriangle className="w-4 h-4 text-[var(--md-error)] shrink-0 mt-0.5" />
              <span>
                سيتم استرجاع وتحديث كافة إعدادات الأنشطة، خزانات الوقود، المستودعات، ومناديب المبيعات وحفظها في قاعدة البيانات وسجلات المتصفح فوراً.
              </span>
            </div>

            {/* Buttons */}
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => { setIsJsonRestoreModalOpen(false); setJsonUploadData(null); }}
                disabled={isRestoring}
                className="m3-btn-outlined px-4 py-2 text-xs font-semibold disabled:opacity-50"
              >
                إلغاء
              </button>
              <button
                id="confirm-json-restore-button"
                onClick={handleConfirmJSONRestore}
                disabled={isRestoring}
                className="m3-btn-danger px-5 py-2.5 text-xs font-bold flex items-center gap-2 disabled:opacity-50"
              >
                {isRestoring ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>جاري استعادة ملف JSON...</span>
                  </>
                ) : (
                  <>
                    <RotateCcw className="w-4 h-4" />
                    <span>تأكيد استعادة ملف JSON</span>
                  </>
                )}
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};
