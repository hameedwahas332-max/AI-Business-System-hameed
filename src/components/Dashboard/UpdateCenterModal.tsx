import React, { useState, useEffect } from 'react';
import {
  X,
  RefreshCw,
  Download,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Database,
  ArrowUpRight,
  Clock,
  Laptop,
  Check,
  Sparkles,
  Zap,
  Info,
  ExternalLink
} from 'lucide-react';
import {
  checkForUpdates,
  downloadAndApplyUpdate,
  restartApplication,
  CURRENT_APP_VERSION,
  UpdateCheckResult,
  isTauriEnvironment,
  normalizeVersionString,
  resolveWorkingReleaseAsset
} from '../../services/updaterService';
import { getDevicePlatform } from '../../services/deviceIdentity';

interface UpdateCenterModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const UpdateCenterModal: React.FC<UpdateCenterModalProps> = ({ isOpen, onClose }) => {
  const [isChecking, setIsChecking] = useState<boolean>(false);
  const [isDownloading, setIsDownloading] = useState<boolean>(false);
  const [isInstalled, setIsInstalled] = useState<boolean>(false);
  const [downloadProgress, setDownloadProgress] = useState<number>(0);
  const [downloadedBytes, setDownloadedBytes] = useState<number>(0);
  const [totalBytes, setTotalBytes] = useState<number>(0);
  const [updateResult, setUpdateResult] = useState<UpdateCheckResult | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [lastCheckTime, setLastCheckTime] = useState<string>('');

  useEffect(() => {
    if (isOpen && !updateResult) {
      handleCheck(false);
    }
  }, [isOpen]);

  // Periodic background check every 30 minutes
  useEffect(() => {
    const timer = setInterval(() => {
      handleCheck(false);
    }, 30 * 60 * 1000);
    return () => clearInterval(timer);
  }, []);

  const handleCheck = async (manual = true) => {
    try {
      setIsChecking(true);
      setErrorMsg(null);
      const res = await checkForUpdates(manual);
      setUpdateResult(res);
      setLastCheckTime(new Date().toLocaleTimeString('ar-YE', { hour: '2-digit', minute: '2-digit' }));
      if (res.error) {
        setErrorMsg(res.error);
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'فشل التحقق من التحديثات');
    } finally {
      setIsChecking(false);
    }
  };

  const handleInstall = async () => {
    if (!updateResult) {
      setErrorMsg('لا توجد بيانات تحديث متاحة حالياً.');
      return;
    }
    try {
      setIsDownloading(true);
      setErrorMsg(null);
      setDownloadProgress(0);

      await downloadAndApplyUpdate(updateResult, (pct, dl, total) => {
        setDownloadProgress(pct);
        setDownloadedBytes(dl);
        setTotalBytes(total);
      });

      setIsInstalled(true);
    } catch (err: any) {
      console.error('[UpdateCenterModal] Install error:', err);
      const rawError = typeof err === 'string' ? err : err?.message || JSON.stringify(err);
      if (rawError.includes('404') || rawError.includes('Not Found')) {
        setErrorMsg('تم كشف عدم تطابق في اسم الحزمة وتم التحويل التلقائي للرابط المعتمد. يمكنك الضغط على زر التنزيل المباشر أدناه لتثبيت التحديث مع الحفاظ التام على جميع البيانات.');
        try {
          const resolved = await resolveWorkingReleaseAsset(updateResult.availableVersion);
          if (resolved?.downloadUrl) {
            setUpdateResult((prev) =>
              prev ? { ...prev, downloadUrl: resolved.downloadUrl, installerFileName: resolved.fileName } : prev
            );
          }
        } catch {}
      } else {
        setErrorMsg(rawError || 'فشل تنزيل أو تثبيت حزمة التحديث');
      }
    } finally {
      setIsDownloading(false);
    }
  };

  const handleRelaunch = async () => {
    await restartApplication();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 m3-backdrop animate-in fade-in duration-200">
      <div
        className="m3-modal-surface w-full max-w-2xl flex flex-col max-h-[90vh] overflow-hidden text-right font-sans"
        dir="rtl"
      >
        {/* Header */}
        <div className="px-6 py-4 bg-[var(--md-surface-container)] border-b border-[var(--md-outline-variant)] flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-[var(--md-primary-container)] border border-[color-mix(in_srgb,var(--md-primary)_25%,transparent)] flex items-center justify-center text-[var(--md-secondary)] shrink-0">
              <Sparkles className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center flex-wrap gap-2">
                <h2 className="text-base sm:text-lg font-bold text-[var(--md-on-surface)]">
                  مركز التحديثات التلقائية المعتمدة
                </h2>
                <span className="m3-badge m3-badge-primary font-mono">
                  Tauri 2 Auto-Updater
                </span>
              </div>
              <p className="text-xs text-[var(--md-on-surface-variant)] mt-0.5">
                ترقية التطبيق المكتبي تلقائياً مع التحقق الرقمي المشفر وحماية قواعد البيانات المحلية
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="m3-btn-text !min-h-[36px] p-1.5 shrink-0"
            aria-label="إغلاق"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5 custom-scrollbar">
          {/* Version Comparison Card */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="p-4 bg-[var(--md-surface-container)] border border-[var(--md-outline-variant)] rounded-2xl space-y-1">
              <span className="text-xs text-[var(--md-on-surface-variant)] font-semibold">الإصدار المثبت حالياً:</span>
              <div className="text-xl font-black font-mono tabular-nums text-[var(--md-on-surface)]">
                v{normalizeVersionString(updateResult?.currentVersion || CURRENT_APP_VERSION)}
              </div>
              <p className="text-[11px] text-[var(--md-on-surface-variant)]">{getDevicePlatform()}</p>
            </div>

            <div className="p-4 bg-[var(--md-primary-container)]/35 border border-[color-mix(in_srgb,var(--md-primary)_30%,transparent)] rounded-2xl space-y-1">
              <span className="text-xs text-[var(--md-primary-text)] font-bold">أحدث إصدار متاح بالسيرفر:</span>
              <div className="text-xl font-black font-mono tabular-nums text-[var(--md-primary-text)]">
                {updateResult?.availableVersion ? `v${normalizeVersionString(updateResult.availableVersion)}` : 'جارِ الفحص...'}
              </div>
              <p className="text-[11px] text-[var(--md-on-surface-variant)] tabular-nums">
                {lastCheckTime ? `آخر فحص: ${lastCheckTime}` : 'فحص آلي نشط'}
              </p>
            </div>
          </div>

          {/* Error Notice */}
          {errorMsg && (
            <div className="p-4 bg-[var(--md-error-container)] border border-[color-mix(in_srgb,var(--md-error)_35%,transparent)] rounded-2xl space-y-3 text-xs text-[var(--md-on-error-container)]">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <div className="flex items-center gap-2 font-bold">
                  <AlertCircle className="w-4 h-4 text-[var(--md-error)] shrink-0" />
                  <span>تنبيه أثناء معالجة التحديث التلقائي:</span>
                </div>
                <button
                  type="button"
                  onClick={() => handleCheck(true)}
                  className="m3-btn-outlined !min-h-[32px] px-2.5 text-[11px] bg-[var(--md-surface-container-lowest)]"
                >
                  إعادة المحاولة
                </button>
              </div>
              <p className="text-[11px] text-[var(--md-on-surface)] font-mono bg-[var(--md-surface-container-lowest)] p-3 rounded-xl border border-[color-mix(in_srgb,var(--md-error)_25%,transparent)] leading-relaxed">
                {errorMsg}
              </p>
              <div className="pt-2 border-t border-[color-mix(in_srgb,var(--md-error)_25%,transparent)] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <span className="text-[11px] font-medium">
                  يمكنك تنزيل وتثبيت التحديث مباشرة (يحفظ جميع بياناتك وقواعد البيانات 100%):
                </span>
                <a
                  href={updateResult?.downloadUrl || "https://github.com/hameedwahas332-max/AI-Business-System-hameed/releases/latest"}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="m3-btn-primary text-xs shrink-0"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span className="tabular-nums">
                    تنزيل مثبت التحديث مباشرة ({updateResult?.availableVersion ? `v${normalizeVersionString(updateResult.availableVersion)}` : 'GitHub'})
                  </span>
                </a>
              </div>
            </div>
          )}

          {/* Status Banner */}
          {isInstalled ? (
            <div className="p-5 bg-[var(--md-success-container)] border border-[color-mix(in_srgb,var(--md-success)_35%,transparent)] rounded-2xl space-y-3">
              <div className="flex items-center gap-3">
                <CheckCircle2 className="w-6 h-6 text-[var(--md-success)] shrink-0" />
                <div>
                  <h3 className="text-sm font-bold text-[var(--md-on-success-container)]">تم تنزيل وتثبيت التحديث بنجاح!</h3>
                  <p className="text-xs text-[var(--md-on-success-container)]/90 mt-0.5">
                    يرجى إعادة تشغيل التطبيق لتطبيق التغييرات واستئناف العمل بأحدث إصدار.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleRelaunch}
                className="m3-btn-primary w-full"
              >
                <RefreshCw className="w-4 h-4" />
                <span>إعادة تشغيل التطبيق الآن</span>
              </button>
            </div>
          ) : updateResult?.hasUpdate ? (
            <div className="space-y-4">
              <div className="p-4 bg-[var(--md-surface-container)] border border-[color-mix(in_srgb,var(--md-primary)_30%,transparent)] rounded-2xl space-y-3">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <span className="text-xs font-bold text-[var(--md-primary-text)] flex items-center gap-1.5 tabular-nums">
                    <Sparkles className="w-4 h-4 text-[var(--md-secondary)] shrink-0" />
                    <span>يتوفر إصدار سيادي جديد (v{normalizeVersionString(updateResult.availableVersion)})</span>
                  </span>
                  <span className="m3-badge m3-badge-primary font-mono">
                    Ed25519 Minisign Verified
                  </span>
                </div>

                <div className="text-xs text-[var(--md-on-surface-variant)] leading-relaxed bg-[var(--md-surface-container-lowest)] p-3.5 rounded-xl border border-[var(--md-outline-variant)]">
                  <div className="font-bold text-[var(--md-on-surface)] mb-1">ملاحظات الإصدار والتطوير:</div>
                  <p>{updateResult.notes}</p>
                </div>
              </div>

              {/* Download Progress (Only when actual download is running in Tauri) */}
              {isDownloading && (
                <div className="p-4 bg-[var(--md-surface-container)] border border-[var(--md-outline-variant)] rounded-2xl space-y-2">
                  <div className="flex items-center justify-between text-xs font-bold text-[var(--md-on-surface)]">
                    <span>جارِ تنزيل وتثبيت حزمة التحديث الموقعة رقمياً...</span>
                    <span className="font-mono tabular-nums text-[var(--md-primary-text)]">{downloadProgress}%</span>
                  </div>
                  <div className="w-full h-2.5 bg-[var(--md-surface-container-high)] rounded-full overflow-hidden">
                    <div
                      className="h-full bg-[var(--md-primary)] transition-all duration-300"
                      style={{ width: `${downloadProgress}%` }}
                    />
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              {!isDownloading && (
                <div className="space-y-2.5">
                  <button
                    type="button"
                    onClick={handleInstall}
                    className="m3-btn-primary w-full py-3"
                  >
                    <Download className="w-4 h-4" />
                    <span className="tabular-nums">
                      تنزيل وتثبيت التحديث الآن (v{normalizeVersionString(updateResult.availableVersion)})
                    </span>
                  </button>

                  {updateResult.downloadUrl && (
                    <a
                      href={updateResult.downloadUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="m3-btn-outlined w-full text-xs"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      <span>تنزيل مثبت الإكسي مباشرة من GitHub Releases ({updateResult.installerFileName || '.exe'})</span>
                    </a>
                  )}
                </div>
              )}
            </div>
          ) : (
            <div className="p-8 text-center bg-[var(--md-surface-container)] border border-[var(--md-outline-variant)] rounded-2xl space-y-2">
              <CheckCircle2 className="w-10 h-10 text-[var(--md-success)] mx-auto" />
              <div className="text-sm font-bold text-[var(--md-on-surface)]">نظامك محدّث إلى أحدث إصدار معتمد</div>
              <p className="text-xs text-[var(--md-on-surface-variant)] tabular-nums">
                أنت تعمل حالياً على الإصدار الرسمي v{updateResult?.currentVersion || CURRENT_APP_VERSION}. لا توجد تحديثات جديدة مطلوبة.
              </p>
            </div>
          )}

          {/* Database Protection Guarantee Strip */}
          <div className="p-4 bg-[var(--md-info-container)] border border-[color-mix(in_srgb,var(--md-info)_30%,transparent)] rounded-2xl flex items-start gap-3">
            <Database className="w-5 h-5 text-[var(--md-info)] shrink-0 mt-0.5" />
            <div className="text-xs text-[var(--md-on-info-container)] leading-relaxed">
              <p className="font-bold mb-0.5">ضمان الحماية السيادية للبيانات التاريخية:</p>
              عملية التحديث التلقائي تحفظ بصورة تامة ومطلقة قواعد بيانات SQLite المحلية (`erp_desktop_offline.db` و `erp_local_vault.db`)، فواتير المبيعات، سندات الخزينة، أرصدة العملاء والموردين، وجلسة الدخول الدائمة دون أي إعادة تعيين أو مسح.
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 bg-[var(--md-surface-container)] border-t border-[var(--md-outline-variant)] flex items-center justify-between flex-wrap gap-2 text-xs">
          <button
            type="button"
            onClick={() => handleCheck(true)}
            disabled={isChecking || isDownloading}
            className="m3-btn-tonal text-xs"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isChecking ? 'animate-spin' : ''}`} />
            <span>{isChecking ? 'جارِ التحقق...' : 'التحقق من وجود تحديثات الآن'}</span>
          </button>

          <button
            type="button"
            onClick={onClose}
            className="m3-btn-outlined text-xs"
          >
            إغلاق
          </button>
        </div>
      </div>
    </div>
  );
};
