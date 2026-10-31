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
  isTauriEnvironment
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
    if (!updateResult?.updateHandle) {
      setErrorMsg('حزمة التحديث الموقعة غير متاحة عبر المتصفح. يرجى استخدام تطبيق ويندوز المكتبي.');
      return;
    }
    try {
      setIsDownloading(true);
      setErrorMsg(null);
      setDownloadProgress(0);

      await downloadAndApplyUpdate(updateResult.updateHandle, (pct, dl, total) => {
        setDownloadProgress(pct);
        setDownloadedBytes(dl);
        setTotalBytes(total);
      });

      setIsInstalled(true);
    } catch (err: any) {
      setErrorMsg(err.message || 'فشل تنزيل أو تثبيت حزمة التحديث');
    } finally {
      setIsDownloading(false);
    }
  };

  const handleRelaunch = async () => {
    await restartApplication();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
      <div
        className="w-full max-w-2xl bg-slate-900 border border-emerald-900/40 rounded-3xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden text-right font-sans"
        dir="rtl"
      >
        {/* Header - Brand: Emerald (#0F766E), Forest (#064E3B), Gold (#C9A227) */}
        <div className="px-6 py-4.5 bg-gradient-to-l from-emerald-950/70 via-slate-900 to-slate-900 border-b border-emerald-800/40 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-600/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shadow-inner">
              <Sparkles className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-black text-white">مركز التحديثات التلقائية المعتمدة</h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-300 border border-emerald-500/30">
                  Tauri 2 Auto-Updater
                </span>
              </div>
              <p className="text-xs text-slate-400">
                ترقية التطبيق المكتبي تلقائياً مع التحقق الرقمي المشفر وحماية قواعد البيانات المحلية
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Version Comparison Card */}
          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 bg-slate-950/60 border border-slate-800 rounded-2xl space-y-1">
              <span className="text-xs text-slate-400 font-bold">الإصدار المثبت حالياً:</span>
              <div className="text-xl font-black font-mono text-slate-200">
                v{updateResult?.currentVersion || CURRENT_APP_VERSION}
              </div>
              <p className="text-[10px] text-slate-500">{getDevicePlatform()}</p>
            </div>

            <div className="p-4 bg-slate-950/60 border border-emerald-900/30 rounded-2xl space-y-1">
              <span className="text-xs text-emerald-400 font-bold">أحدث إصدار متاح بالسيرفر:</span>
              <div className="text-xl font-black font-mono text-emerald-400">
                {updateResult?.availableVersion ? `v${updateResult.availableVersion}` : 'جارِ الفحص...'}
              </div>
              <p className="text-[10px] text-slate-500">
                {lastCheckTime ? `آخر فحص: ${lastCheckTime}` : 'فحص آلي نشط'}
              </p>
            </div>
          </div>

          {/* Error Notice */}
          {errorMsg && (
            <div className="p-3.5 bg-rose-950/40 border border-rose-800/60 rounded-2xl flex items-center justify-between text-xs text-rose-300 font-bold">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0" />
                <span>{errorMsg}</span>
              </div>
              <button
                onClick={() => handleCheck(true)}
                className="px-2.5 py-1 bg-rose-900/40 hover:bg-rose-900/60 rounded-lg text-[11px] cursor-pointer"
              >
                إعادة المحاولة
              </button>
            </div>
          )}

          {/* Status Banner */}
          {isInstalled ? (
            <div className="p-5 bg-emerald-950/50 border border-emerald-500/40 rounded-2xl space-y-3">
              <div className="flex items-center gap-3">
                <CheckCircle2 className="w-6 h-6 text-emerald-400 flex-shrink-0" />
                <div>
                  <h3 className="text-sm font-black text-white">تم تنزيل وتثبيت التحديث بنجاح!</h3>
                  <p className="text-xs text-emerald-300">
                    يرجى إعادة تشغيل التطبيق لتطبيق التغييرات واستئناف العمل بأحدث إصدار.
                  </p>
                </div>
              </div>
              <button
                onClick={handleRelaunch}
                className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-black shadow-lg transition-all cursor-pointer flex items-center justify-center gap-2"
              >
                <RefreshCw className="w-4 h-4" />
                <span>إعادة تشغيل التطبيق الآن</span>
              </button>
            </div>
          ) : updateResult?.hasUpdate ? (
            <div className="space-y-4">
              <div className="p-4 bg-emerald-950/30 border border-emerald-800/40 rounded-2xl space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black text-emerald-400 flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-amber-400" />
                    <span>يتوفر إصدار سيادي جديد (v{updateResult.availableVersion})</span>
                  </span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                    Ed25519 Minisign Verified
                  </span>
                </div>

                <div className="text-xs text-slate-300 leading-relaxed bg-slate-950/60 p-3 rounded-xl border border-slate-800">
                  <div className="font-bold text-slate-200 mb-1">ملاحظات الإصدار والتطوير:</div>
                  <p>{updateResult.notes}</p>
                </div>
              </div>

              {/* Download Progress (Only when actual download is running in Tauri) */}
              {isDownloading && (
                <div className="p-4 bg-slate-950/60 border border-slate-800 rounded-2xl space-y-2">
                  <div className="flex items-center justify-between text-xs font-bold text-slate-300">
                    <span>جارِ تنزيل وتثبيت حزمة التحديث الموقعة رقمياً...</span>
                    <span className="font-mono text-emerald-400">{downloadProgress}%</span>
                  </div>
                  <div className="w-full h-2.5 bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-l from-emerald-500 to-teal-400 transition-all duration-300"
                      style={{ width: `${downloadProgress}%` }}
                    />
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              {!isDownloading && (
                updateResult.isWebPreview ? (
                  <div className="p-4 bg-slate-950/70 border border-amber-500/30 rounded-2xl space-y-2">
                    <div className="flex items-center gap-2 text-xs text-amber-300 font-bold">
                      <Info className="w-4 h-4 flex-shrink-0" />
                      <span>أنت تتصفح النظام في بيئة الويب (معاينة).</span>
                    </div>
                    <p className="text-xs text-slate-400">
                      التثبيت التلقائي الصامت متاح حصراً داخل تطبيق ويندوز المكتبي المثبت على الجهاز. لتحديث نسختك، يمكنك تنزيل ملف التثبيت المعتمد مباشرة:
                    </p>
                    <a
                      href="https://github.com/hameedwahas332-max/AI-Business-System-hameed/releases/latest"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center justify-center gap-2 w-full py-2.5 bg-slate-800 hover:bg-slate-700 text-emerald-400 border border-emerald-500/30 rounded-xl text-xs font-bold transition"
                    >
                      <ExternalLink className="w-4 h-4" />
                      <span>تنزيل أحدث مثبت لويندوز من GitHub Releases</span>
                    </a>
                  </div>
                ) : (
                  <button
                    onClick={handleInstall}
                    className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-black shadow-lg transition-all cursor-pointer flex items-center justify-center gap-2"
                  >
                    <Download className="w-4 h-4" />
                    <span>تنزيل وتثبيت التحديث (v{updateResult.availableVersion})</span>
                  </button>
                )
              )}
            </div>
          ) : (
            <div className="p-8 text-center bg-slate-950/40 border border-slate-800 rounded-2xl space-y-2">
              <CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto" />
              <div className="text-sm font-bold text-white">نظامك محدّث إلى أحدث إصدار معتمد</div>
              <p className="text-xs text-slate-500">
                أنت تعمل حالياً على الإصدار الرسمي v{updateResult?.currentVersion || CURRENT_APP_VERSION}. لا توجد تحديثات جديدة مطلوبة.
              </p>
            </div>
          )}

          {/* Database Protection Guarantee Strip */}
          <div className="p-4 bg-blue-950/20 border border-blue-900/30 rounded-2xl flex items-start gap-3">
            <Database className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
            <div className="text-xs text-blue-200 leading-relaxed">
              <p className="font-bold text-blue-300 mb-0.5">ضمان الحماية السيادية للبيانات التاريخية:</p>
              عملية التحديث التلقائي تحفظ بصورة تامة ومطلقة قواعد بيانات SQLite المحلية (`erp_desktop_offline.db` و `erp_local_vault.db`)، فواتير المبيعات، سندات الخزينة، أرصدة العملاء والموردين، وجلسة الدخول الدائمة دون أي إعادة تعيين أو مسح.
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 bg-slate-950/80 border-t border-slate-800 flex items-center justify-between text-xs">
          <button
            onClick={() => handleCheck(true)}
            disabled={isChecking || isDownloading}
            className="flex items-center gap-2 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl transition cursor-pointer font-bold disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isChecking ? 'animate-spin' : ''}`} />
            <span>{isChecking ? 'جارِ التحقق...' : 'التحقق من وجود تحديثات الآن'}</span>
          </button>

          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl transition cursor-pointer"
          >
            إغلاق
          </button>
        </div>
      </div>
    </div>
  );
};
