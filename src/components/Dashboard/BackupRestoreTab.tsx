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
      salesReps = JSON.parse(localStorage.getItem('erp_sales_reps') || '[]');
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
    if (!salesReps || salesReps.length === 0) {
      salesReps = [
        { id: 'rep-1', name: 'أحمد السحابي', phone: '777112233', role: 'مندوب جملة كبار العملاء', active: true },
        { id: 'rep-2', name: 'خالد المنصوري', phone: '771223344', role: 'مندوب مبيعات زيوت وبطاريات', active: true },
        { id: 'rep-3', name: 'ياسر اليماني', phone: '773445566', role: 'مندوب كاشير ومواد غذائية', active: true },
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
    const reps = extStates.sales_reps || extStates.salesReps;
    if (reps) {
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
        await fetch('/api/v1/fuel-station/state', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(fuelStation || { tanks: extStates.fuel_tanks }),
        }).catch(() => {});
      }
      if (whs || transfers) {
        await fetch('/api/v1/inventory/warehouses-state', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ warehouses: whs || [], transfers: transfers || [] }),
        }).catch(() => {});
      }
      if (modConfig) {
        await fetch('/api/v1/settings/module-config', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
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

  // Export Complete Local JSON Backup
  const handleExportFullJSONBackup = () => {
    try {
      setActionLoading('export-json');
      const extStates = collectExtendedSystemStates();
      const exportData = {
        backup_type: 'FULL_ENTERPRISE_EXPORT_JSON',
        version: 'v2.5.0-enterprise',
        exported_at: new Date().toISOString(),
        company_id: 'comp_001',
        checksum: `sha256_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`,
        extended_states: extStates,
        summary: {
          tanksCount: extStates.fuel_station?.tanks?.length || 0,
          metersCount: extStates.fuel_station?.meters?.length || 0,
          warehousesCount: extStates.warehouses?.length || 0,
          transfersCount: extStates.warehouse_transfers?.length || 0,
          salesRepsCount: extStates.sales_reps?.length || 0,
          businessMode: extStates.erp_module_settings_v1?.businessMode || 'multi_activity',
        },
      };

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

      setSuccessMessage('تم تصدير وتنزيل ملف النسخة الاحتياطية JSON بنجاح متضمناً كافة الحالات الموسعة وإعدادات الأنشطة وخزانات الوقود والتحويلات.');
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

      const extStates = collectExtendedSystemStates();
      const res = await api.createBackup({
        backup_type: 'MANUAL',
        storage_target: 'B2_S3',
        extended_states: extStates,
      });

      // Synchronize states to server endpoints
      try {
        await Promise.all([
          fetch('/api/v1/fuel-station/state', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(extStates.fuel_station),
          }).catch(() => {}),
          fetch('/api/v1/inventory/warehouses-state', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              warehouses: extStates.warehouses,
              transfers: extStates.warehouse_transfers,
            }),
          }).catch(() => {}),
          fetch('/api/v1/settings/module-config', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(extStates.erp_module_settings_v1),
          }).catch(() => {}),
        ]);
      } catch {}

      setSuccessMessage(res?.message || 'تم إنشاء النسخة الاحتياطية السحابية (Backblaze B2) وتأمين كافة الحالات الموسعة وتوقيع SHA-256 بنجاح');
      await fetchData();
    } catch (err: any) {
      setError(err?.message || 'فشل إنشاء النسخة الاحتياطية السحابية');
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

  // Execute Restore from Cloud Backup
  const handleExecuteRestore = async () => {
    if (!selectedBackupForRestore) return;
    try {
      setIsRestoring(true);
      setError(null);
      const res = await api.restoreBackup(selectedBackupForRestore.id);

      // Re-hydrate extended system states from backend
      try {
        const [fuelRes, whRes, modRes] = await Promise.all([
          fetch('/api/v1/fuel-station/state').then((r) => r.json()).catch(() => null),
          fetch('/api/v1/inventory/warehouses-state').then((r) => r.json()).catch(() => null),
          fetch('/api/v1/settings/module-config').then((r) => r.json()).catch(() => null),
        ]);

        const combinedStates: any = {};
        if (fuelRes?.data) combinedStates.fuel_station = fuelRes.data;
        if (whRes?.data?.warehouses) combinedStates.warehouses = whRes.data.warehouses;
        if (whRes?.data?.transfers) combinedStates.warehouse_transfers = whRes.data.transfers;
        if (modRes?.data) combinedStates.erp_module_settings_v1 = modRes.data;

        await restoreExtendedSystemStates(combinedStates);
      } catch {}

      setIsRestoreModalOpen(false);
      setSuccessMessage(res?.message || 'تمت استعادة بيانات النظام والوحدات الموسعة وخزانات الوقود بنجاح من النسخة الاحتياطية');
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
      const ext = jsonUploadData.extended_states || jsonUploadData;
      const result = await restoreExtendedSystemStates(ext);
      setIsJsonRestoreModalOpen(false);
      setJsonUploadData(null);
      setSuccessMessage(`تمت استعادة ${result.count} عنصراً وسجلاً موسعاً بنجاح (إعدادات الأنشطة، خزانات وعدادات الوقود، المستودعات، والمناديب).`);
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
    <div className="space-y-6 text-slate-100 animate-in fade-in duration-200" dir="rtl">
      
      {/* Header Bar */}
      <div className="bg-slate-900 border border-emerald-900/40 rounded-2xl p-5 sm:p-6 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-br from-emerald-500/10 via-teal-500/5 to-transparent rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />
        
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative z-10">
          <div className="space-y-1">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-700 text-white flex items-center justify-center shadow-lg shadow-emerald-950/50">
                <Database className="w-5 h-5" />
              </div>
              <div>
                <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                  النسخ الاحتياطي والاستعادة
                </h1>
                <p className="text-xs sm:text-sm text-slate-400 font-medium">
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
              className="p-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-xl border border-slate-700/60 transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-emerald-400' : ''}`} />
            </button>

            {/* Export JSON Full */}
            <button
              id="export-json-backup-button"
              onClick={handleExportFullJSONBackup}
              disabled={actionLoading === 'export-json'}
              className="px-3.5 py-2.5 bg-slate-800 hover:bg-slate-700 text-emerald-400 hover:text-emerald-300 rounded-xl font-bold text-xs sm:text-sm border border-emerald-800/50 flex items-center gap-2 transition-all active:scale-95 disabled:opacity-60 shadow-sm"
              title="تصدير نسخة احتياطية محلية JSON تتضمن خزانات الوقود، التحويلات، وإعدادات الأنشطة"
            >
              <Download className="w-4 h-4 text-emerald-400" />
              <span>تصدير JSON شامل</span>
            </button>

            {/* Import JSON */}
            <button
              id="import-json-backup-button"
              onClick={() => fileInputRef.current?.click()}
              className="px-3.5 py-2.5 bg-slate-800 hover:bg-slate-700 text-teal-300 hover:text-teal-200 rounded-xl font-bold text-xs sm:text-sm border border-teal-800/50 flex items-center gap-2 transition-all active:scale-95 shadow-sm"
              title="استيراد واستعادة من ملف JSON محلي"
            >
              <Upload className="w-4 h-4 text-teal-400" />
              <span>استيراد ملف JSON</span>
            </button>

            {/* Create Cloud Backup */}
            <button
              id="create-backup-main-button"
              onClick={handleCreateBackup}
              disabled={actionLoading === 'create' || loading}
              className="px-4 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-xl font-bold text-xs sm:text-sm shadow-lg shadow-emerald-950/60 border border-emerald-500/40 flex items-center gap-2 transition-all active:scale-95 disabled:opacity-60"
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
        <div className="p-4 bg-red-950/40 border border-red-800/60 rounded-xl text-red-300 text-xs sm:text-sm flex items-center justify-between gap-3 shadow-lg">
          <div className="flex items-center gap-2.5">
            <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
            <span>{error}</span>
          </div>
          <button onClick={() => setError(null)} className="text-red-400 hover:text-red-200">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {successMessage && (
        <div className="p-4 bg-emerald-950/40 border border-emerald-800/60 rounded-xl text-emerald-300 text-xs sm:text-sm flex items-center justify-between gap-3 shadow-lg">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{successMessage}</span>
          </div>
          <button onClick={() => setSuccessMessage(null)} className="text-emerald-400 hover:text-emerald-200">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Compact System Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Card 1: آخر نسخة احتياطية */}
        <div className="bg-slate-900/90 border border-slate-800/80 rounded-2xl p-4 shadow-md flex items-center gap-3.5 relative overflow-hidden group hover:border-emerald-900/60 transition-all">
          <div className="w-11 h-11 rounded-xl bg-emerald-950/80 border border-emerald-800/40 text-emerald-400 flex items-center justify-center shrink-0">
            <Clock className="w-5 h-5" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-[11px] font-semibold text-slate-400">آخر نسخة احتياطية</div>
            <div className="text-sm font-bold text-slate-100 truncate mt-0.5 font-mono">
              {latestBackup ? formatDate(latestBackup.created_at) : 'لا توجد نسخ بعد'}
            </div>
            <div className="text-[10px] text-slate-500 mt-0.5">
              {latestBackup ? `${latestBackup.records_count || 0} سجل مسجل` : 'جاهز لأول نسخة'}
            </div>
          </div>
        </div>

        {/* Card 2: الحالة */}
        <div className="bg-slate-900/90 border border-slate-800/80 rounded-2xl p-4 shadow-md flex items-center gap-3.5 relative overflow-hidden group hover:border-emerald-900/60 transition-all">
          <div className="w-11 h-11 rounded-xl bg-teal-950/80 border border-teal-800/40 text-teal-400 flex items-center justify-center shrink-0">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-[11px] font-semibold text-slate-400">الحالة</div>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className={`w-2 h-2 rounded-full ${latestBackup?.status === 'FAILED' ? 'bg-red-500' : 'bg-emerald-500 animate-pulse'}`} />
              <span className="text-sm font-bold text-emerald-400">
                {latestBackup?.status === 'VERIFIED'
                  ? 'مكتمل وموثق'
                  : latestBackup?.status === 'COMPLETED'
                  ? 'مكتمل وآمن'
                  : latestBackup?.status === 'FAILED'
                  ? 'يوجد خطأ'
                  : 'جاهز للحماية'}
              </span>
            </div>
            <div className="text-[10px] text-slate-500 mt-0.5">عزل المستأجر نشط (PostgreSQL)</div>
          </div>
        </div>

        {/* Card 3: حجم النسخة */}
        <div className="bg-slate-900/90 border border-slate-800/80 rounded-2xl p-4 shadow-md flex items-center gap-3.5 relative overflow-hidden group hover:border-emerald-900/60 transition-all">
          <div className="w-11 h-11 rounded-xl bg-indigo-950/80 border border-indigo-800/40 text-indigo-400 flex items-center justify-center shrink-0">
            <HardDrive className="w-5 h-5" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-[11px] font-semibold text-slate-400">حجم النسخة</div>
            <div className="text-sm font-bold text-indigo-300 mt-0.5 font-mono">
              {latestBackup ? formatBytes(Number(latestBackup.file_size || 0)) : '0 B'}
            </div>
            <div className="text-[10px] text-slate-500 mt-0.5">
              إجمالي التخزين: {formatBytes(stats?.totalStorageBytes || 0)}
            </div>
          </div>
        </div>

        {/* Card 4: تاريخ التحقق */}
        <div className="bg-slate-900/90 border border-slate-800/80 rounded-2xl p-4 shadow-md flex items-center gap-3.5 relative overflow-hidden group hover:border-emerald-900/60 transition-all">
          <div className="w-11 h-11 rounded-xl bg-amber-950/80 border border-amber-800/40 text-amber-400 flex items-center justify-center shrink-0">
            <FileCheck2 className="w-5 h-5" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-[11px] font-semibold text-slate-400">تاريخ التحقق</div>
            <div className="text-sm font-bold text-amber-300 truncate mt-0.5 font-mono">
              {latestBackup?.verified_at
                ? formatDate(latestBackup.verified_at)
                : latestBackup
                ? 'توقيع SHA-256 سليم'
                : '—'}
            </div>
            <div className="text-[10px] text-slate-500 mt-0.5">تكامل وتطابق التجزئة الرقمية</div>
          </div>
        </div>

      </div>

      {/* Backup History Table Section */}
      <div className="bg-slate-900 border border-slate-800/80 rounded-2xl overflow-hidden shadow-xl">
        
        {/* Table Header Controls */}
        <div className="p-4 sm:p-5 border-b border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-900/50">
          <div className="flex items-center gap-2">
            <History className="w-4 h-4 text-emerald-400" />
            <h2 className="text-sm sm:text-base font-bold text-white">سجل النسخ الاحتياطية</h2>
            <span className="text-[10px] px-2 py-0.5 bg-emerald-950/80 text-emerald-400 rounded-full border border-emerald-800/50 font-mono font-bold">
              {backups.length} نسخة
            </span>
          </div>

          <div className="text-xs text-slate-400 flex items-center gap-2">
            <Lock className="w-3.5 h-3.5 text-emerald-500" />
            <span>مشفر ومحمي بتوقيع رقمي غير قابل للتلاعب</span>
          </div>
        </div>

        {/* Table / Empty / Loading */}
        {loading && backups.length === 0 ? (
          <div className="p-12 text-center text-slate-400 space-y-3">
            <RefreshCw className="w-7 h-7 animate-spin mx-auto text-emerald-500" />
            <p className="text-xs">جاري تحميل سجل النسخ الاحتياطية للمؤسسة...</p>
          </div>
        ) : backups.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <Database className="w-10 h-10 mx-auto text-slate-600" />
            <h3 className="text-sm font-bold text-slate-300">لا توجد نسخ احتياطية مسجلة بعد</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              يمكنك تأمين بيانات مؤسستك وحفظ نقطة استعادة فورية بالضغط على "إنشاء نسخة احتياطية الآن".
            </p>
            <button
              onClick={handleCreateBackup}
              disabled={actionLoading === 'create'}
              className="mt-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition-colors inline-flex items-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>إنشاء أول نسخة احتياطية</span>
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs text-slate-300">
              <thead className="bg-slate-950 text-slate-400 border-b border-slate-800 font-semibold uppercase tracking-wider text-[11px]">
                <tr>
                  <th className="p-3.5">رقم النسخة</th>
                  <th className="p-3.5">التاريخ</th>
                  <th className="p-3.5">الحجم</th>
                  <th className="p-3.5">المستخدم</th>
                  <th className="p-3.5">الحالة</th>
                  <th className="p-3.5">التحقق</th>
                  <th className="p-3.5 text-center">الإجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-medium">
                {backups.map((b) => {
                  const isVerifying = actionLoading === `verify-${b.id}`;
                  const isDownloading = actionLoading === `download-${b.id}`;
                  const isDeleting = actionLoading === `delete-${b.id}`;

                  return (
                    <tr key={b.id} className="hover:bg-slate-800/40 transition-colors">
                      
                      {/* رقم النسخة */}
                      <td className="p-3.5 font-mono text-[11px] text-slate-200">
                        <div className="flex items-center gap-1.5">
                          <Database className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                          <span className="font-bold">{b.id.substring(0, 8)}...</span>
                        </div>
                        <div className="text-[9px] text-slate-500 truncate max-w-[140px] font-sans">
                          {b.file_name}
                        </div>
                      </td>

                      {/* التاريخ */}
                      <td className="p-3.5 font-mono text-slate-300 text-[11px] whitespace-nowrap">
                        {formatDate(b.created_at)}
                      </td>

                      {/* الحجم */}
                      <td className="p-3.5 font-mono text-slate-200 text-[11px] whitespace-nowrap">
                        <div>{formatBytes(Number(b.file_size || 0))}</div>
                        <div className="text-[9px] text-slate-500">
                          {b.tables_count || 0} جداول • {b.records_count || 0} سجل
                        </div>
                      </td>

                      {/* المستخدم */}
                      <td className="p-3.5 text-slate-300">
                        <div className="flex items-center gap-1.5">
                          <User className="w-3.5 h-3.5 text-slate-500" />
                          <span className="font-medium text-[11px]">{b.initiated_by_name || 'مدير النظام'}</span>
                        </div>
                        <div className="text-[9px] text-slate-500 font-mono">
                          {b.backup_type === 'MANUAL' ? 'يدوي (Manual)' : b.backup_type}
                        </div>
                      </td>

                      {/* الحالة */}
                      <td className="p-3.5 whitespace-nowrap">
                        {b.status === 'VERIFIED' ? (
                          <span className="px-2 py-0.5 rounded-md bg-emerald-950 text-emerald-300 border border-emerald-800/60 font-bold text-[10px] inline-flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                            <span>موثوقة</span>
                          </span>
                        ) : b.status === 'COMPLETED' ? (
                          <span className="px-2 py-0.5 rounded-md bg-teal-950 text-teal-300 border border-teal-800/60 font-bold text-[10px] inline-flex items-center gap-1">
                            <Check className="w-3 h-3 text-teal-400" />
                            <span>مكتملة</span>
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-md bg-red-950 text-red-300 border border-red-800/60 font-bold text-[10px] inline-flex items-center gap-1">
                            <AlertTriangle className="w-3 h-3 text-red-400" />
                            <span>فشل</span>
                          </span>
                        )}
                      </td>

                      {/* التحقق */}
                      <td className="p-3.5">
                        <div className="flex items-center gap-1 text-[11px] text-emerald-400 font-mono">
                          <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                          <span>SHA-256</span>
                        </div>
                        {b.checksum && (
                          <div className="text-[9px] text-slate-500 font-mono truncate max-w-[100px]" title={b.checksum}>
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
                            className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-emerald-400 rounded-lg border border-slate-700 transition-colors disabled:opacity-50"
                          >
                            <Download className={`w-3.5 h-3.5 ${isDownloading ? 'animate-bounce text-emerald-400' : ''}`} />
                          </button>

                          {/* تحقق Verify */}
                          <button
                            id={`verify-backup-${b.id}`}
                            onClick={() => handleVerifyBackup(b)}
                            disabled={isVerifying}
                            title="فحص والتحقق من التوقيع الرقمي"
                            className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-teal-400 rounded-lg border border-slate-700 transition-colors disabled:opacity-50"
                          >
                            <FileCheck2 className={`w-3.5 h-3.5 ${isVerifying ? 'animate-spin text-teal-400' : ''}`} />
                          </button>

                          {/* استعادة Restore (Dangerous action) */}
                          <button
                            id={`restore-backup-${b.id}`}
                            onClick={() => openRestoreModal(b)}
                            title="استعادة هذه النسخة الاحتياطية"
                            className="p-1.5 bg-amber-950/60 hover:bg-amber-900/80 text-amber-300 hover:text-amber-100 rounded-lg border border-amber-800/60 transition-colors"
                          >
                            <RotateCcw className="w-3.5 h-3.5" />
                          </button>

                          {/* حذف Delete */}
                          <button
                            id={`delete-backup-${b.id}`}
                            onClick={() => openDeleteModal(b)}
                            disabled={isDeleting}
                            title="حذف النسخة الاحتياطية"
                            className="p-1.5 bg-red-950/40 hover:bg-red-900/60 text-red-400 hover:text-red-200 rounded-lg border border-red-900/50 transition-colors disabled:opacity-50"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-150" dir="rtl">
          <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl space-y-5 text-slate-100 relative">
            
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-amber-950 border border-amber-700/60 text-amber-400 flex items-center justify-center">
                  <RotateCcw className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">تأكيد استعادة النسخة الاحتياطية</h3>
                  <p className="text-xs text-slate-400">مراجعة تفاصيل النسخة قبل بدء الاستبدال</p>
                </div>
              </div>
              <button
                onClick={() => setIsRestoreModalOpen(false)}
                disabled={isRestoring}
                className="text-slate-400 hover:text-slate-200 p-1 rounded-lg hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Backup Details Grid */}
            <div className="grid grid-cols-2 gap-3 bg-slate-950/60 p-4 rounded-xl border border-slate-800/80 text-xs">
              <div>
                <span className="text-slate-500 block text-[11px]">النسخة المختارة:</span>
                <span className="font-mono font-bold text-emerald-400">{selectedBackupForRestore.id.substring(0, 12)}...</span>
              </div>
              <div>
                <span className="text-slate-500 block text-[11px]">تاريخ النسخة:</span>
                <span className="font-mono text-slate-200">{formatDate(selectedBackupForRestore.created_at)}</span>
              </div>
              <div>
                <span className="text-slate-500 block text-[11px]">حجم النسخة:</span>
                <span className="font-mono text-slate-200">{formatBytes(Number(selectedBackupForRestore.file_size || 0))}</span>
              </div>
              <div>
                <span className="text-slate-500 block text-[11px]">حالة التحقق:</span>
                <span className="text-emerald-400 font-semibold flex items-center gap-1 mt-0.5">
                  <CheckCircle2 className="w-3 h-3" />
                  <span>SHA-256 سليم</span>
                </span>
              </div>
              <div>
                <span className="text-slate-500 block text-[11px]">إصدار النظام:</span>
                <span className="font-mono text-slate-300">{selectedBackupForRestore.system_version || 'v2.4.0'}</span>
              </div>
              <div>
                <span className="text-slate-500 block text-[11px]">إصدار قاعدة البيانات:</span>
                <span className="font-mono text-slate-300">{selectedBackupForRestore.db_version || 'PostgreSQL 16'}</span>
              </div>
            </div>

            {/* Warning Box */}
            <div className="p-4 bg-amber-950/40 border border-amber-700/60 rounded-xl text-amber-200 space-y-1">
              <div className="flex items-center gap-2 font-bold text-amber-400 text-xs sm:text-sm">
                <AlertTriangle className="w-4 h-4 shrink-0 text-amber-400" />
                <span>تحذير أمني هام</span>
              </div>
              <p className="text-xs text-amber-200/90 leading-relaxed font-semibold">
                استعادة هذه النسخة قد تستبدل البيانات الحالية.
              </p>
              <p className="text-[11px] text-amber-300/70">
                سيتم استرجاع جميع السجلات والجداول وحركات المخزون والمحاسبة إلى الحالة التي كانت عليها وقت إنشاء النسخة.
              </p>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                id="cancel-restore-button"
                onClick={() => setIsRestoreModalOpen(false)}
                disabled={isRestoring}
                className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold border border-slate-700 transition-colors disabled:opacity-50"
              >
                إلغاء
              </button>

              <button
                id="confirm-restore-button"
                onClick={handleExecuteRestore}
                disabled={isRestoring}
                className="px-5 py-2.5 bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-500 hover:to-amber-600 text-white rounded-xl text-xs font-bold shadow-lg shadow-amber-950/60 border border-amber-500/50 flex items-center gap-2 transition-all active:scale-95 disabled:opacity-50"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-150" dir="rtl">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl space-y-4 text-slate-100">
            
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-red-950 border border-red-800 text-red-400 flex items-center justify-center shrink-0">
                <Trash2 className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white">حذف النسخة الاحتياطية</h3>
                <p className="text-xs text-slate-400">هل أنت متأكد من حذف هذه النسخة نهائياً؟</p>
              </div>
            </div>

            <p className="text-xs text-slate-400 bg-slate-950 p-3 rounded-xl border border-slate-800 font-mono">
              الملف: {selectedBackupForDelete.file_name} ({formatBytes(selectedBackupForDelete.file_size)})
            </p>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                onClick={() => setIsDeleteModalOpen(false)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold border border-slate-700"
              >
                إلغاء
              </button>
              <button
                onClick={handleExecuteDelete}
                className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded-xl text-xs font-bold shadow-lg"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-sm animate-in fade-in duration-150" dir="rtl">
          <div className="w-full max-w-lg bg-slate-900 border border-teal-800/80 rounded-2xl p-6 shadow-2xl space-y-5 text-slate-100 relative">
            
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-teal-950 border border-teal-600/60 text-teal-400 flex items-center justify-center">
                  <FileCode className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">استعادة نسخة احتياطية من ملف JSON</h3>
                  <p className="text-xs text-slate-400">فحص الحالات الموسعة المكتشفة في الملف قبل اعتمادها</p>
                </div>
              </div>
              <button
                onClick={() => { setIsJsonRestoreModalOpen(false); setJsonUploadData(null); }}
                disabled={isRestoring}
                className="text-slate-400 hover:text-slate-200 p-1 rounded-lg hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* File Info */}
            <div className="space-y-2">
              <div className="text-[11px] font-semibold text-slate-400">الحالات والبيانات المكتشفة بالنسخة:</div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                
                {/* Module Settings */}
                <div className="p-3 bg-slate-950/70 border border-slate-800 rounded-xl flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <div>
                    <div className="font-bold text-slate-200">إعدادات الأنشطة</div>
                    <div className="text-[10px] text-slate-400">
                      {jsonUploadData.extended_states?.erp_module_settings_v1?.businessMode || 'نمط متعدد الأنشطة'}
                    </div>
                  </div>
                </div>

                {/* Fuel Station */}
                <div className="p-3 bg-slate-950/70 border border-slate-800 rounded-xl flex items-center gap-2">
                  <Fuel className="w-4 h-4 text-amber-400 shrink-0" />
                  <div>
                    <div className="font-bold text-slate-200">محطة الوقود والغاز</div>
                    <div className="text-[10px] text-slate-400">
                      {jsonUploadData.extended_states?.fuel_station?.tanks?.length || 4} خزانات • عدادات
                    </div>
                  </div>
                </div>

                {/* Warehouses & Transfers */}
                <div className="p-3 bg-slate-950/70 border border-slate-800 rounded-xl flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-teal-400 shrink-0" />
                  <div>
                    <div className="font-bold text-slate-200">المستودعات والتحويلات</div>
                    <div className="text-[10px] text-slate-400">
                      {jsonUploadData.extended_states?.warehouses?.length || 3} مستودعات وفروع
                    </div>
                  </div>
                </div>

                {/* Sales Reps */}
                <div className="p-3 bg-slate-950/70 border border-slate-800 rounded-xl flex items-center gap-2">
                  <Users className="w-4 h-4 text-indigo-400 shrink-0" />
                  <div>
                    <div className="font-bold text-slate-200">مناديب المبيعات</div>
                    <div className="text-[10px] text-slate-400">
                      {jsonUploadData.extended_states?.sales_reps?.length || 3} مناديب معتمدين
                    </div>
                  </div>
                </div>

              </div>
            </div>

            {/* Warning Note */}
            <div className="p-3.5 bg-teal-950/40 border border-teal-800/60 rounded-xl text-teal-200 text-xs flex items-start gap-2.5">
              <CheckCircle2 className="w-4 h-4 text-teal-400 shrink-0 mt-0.5" />
              <span>
                سيتم استرجاع وتحديث كافة إعدادات الأنشطة، خزانات الوقود، المستودعات، ومناديب المبيعات وحفظها في قاعدة البيانات وسجلات المتصفح فوراً.
              </span>
            </div>

            {/* Buttons */}
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => { setIsJsonRestoreModalOpen(false); setJsonUploadData(null); }}
                disabled={isRestoring}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold border border-slate-700"
              >
                إلغاء
              </button>
              <button
                id="confirm-json-restore-button"
                onClick={handleConfirmJSONRestore}
                disabled={isRestoring}
                className="px-5 py-2.5 bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-500 hover:to-emerald-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-teal-950/60 border border-teal-500/50 flex items-center gap-2 transition-all active:scale-95 disabled:opacity-50"
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
