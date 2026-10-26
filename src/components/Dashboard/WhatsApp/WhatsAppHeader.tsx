import React from 'react';
import {
  MessageSquare,
  Plus,
  FileText,
  CreditCard,
  Bell,
  Clock,
  Sparkles,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Settings,
  Zap,
} from 'lucide-react';

interface WhatsAppHeaderProps {
  isConnected?: boolean;
  providerText?: string;
  displayPhone?: string;
  isRefreshing?: boolean;
  onRefresh?: () => void;
  onOpenNewMessage?: () => void;
  onOpenSendStatement?: () => void;
  onOpenSendInvoice?: () => void;
  onOpenSendReminder?: () => void;
  onOpenCreateTemplate?: () => void;
  onOpenScheduleMessage?: () => void;
  onOpenConfig?: () => void;
}

export const WhatsAppHeader: React.FC<WhatsAppHeaderProps> = ({
  isConnected = true,
  providerText = 'UltraMsg Cloud Gateway',
  displayPhone = '+967 770 000 000',
  isRefreshing = false,
  onRefresh = () => {},
  onOpenNewMessage = () => {},
  onOpenSendStatement = () => {},
  onOpenSendInvoice = () => {},
  onOpenSendReminder = () => {},
  onOpenCreateTemplate = () => {},
  onOpenScheduleMessage = () => {},
  onOpenConfig = () => {},
}) => {
  return (
    <header id="whatsapp-main-header" className="bg-[#091511] rounded-2xl border border-emerald-500/30 p-5 shadow-xl space-y-4">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        {/* Title & Connection Status */}
        <div className="space-y-1.5">
          <div className="flex flex-wrap items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-500 text-white flex items-center justify-center shadow-lg shadow-emerald-950">
              <MessageSquare className="w-5 h-5 text-emerald-100" />
            </div>
            <div>
              <h1 className="text-xl font-black text-white tracking-tight flex items-center gap-2">
                <span>رسائل وإشعارات WhatsApp</span>
                <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  ERP Cloud Hub
                </span>
              </h1>
              <p className="text-xs text-slate-400 font-medium">
                مركز التواصل والتنبيهات وإرسال الفواتير وكشوفات الحساب الذكية للعملاء والموردين
              </p>
            </div>
          </div>
        </div>

        {/* Status Indicator & Main Connection Badge */}
        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={onOpenConfig}
            className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-[#06120d] border border-emerald-500/30 text-xs hover:border-emerald-400 transition-colors cursor-pointer"
            title="انقر لتعديل إعدادات الربط والرقم"
          >
            <span className="relative flex h-2.5 w-2.5">
              {isConnected ? (
                <>
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                </>
              ) : (
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-rose-500"></span>
              )}
            </span>
            <span className="font-bold text-white">
              {isConnected ? 'متصل برقم:' : 'غير متصل'}
            </span>
            <span className="text-[11px] text-emerald-400 font-mono" dir="ltr">
              {displayPhone || '+967 770 000 000'}
            </span>
            <Settings className="w-3.5 h-3.5 text-slate-400 hover:text-white ml-1" />
          </button>

          <button
            id="btn-whatsapp-refresh"
            onClick={onRefresh}
            disabled={isRefreshing}
            className="p-2 rounded-xl border border-emerald-500/30 bg-[#06120d] text-slate-300 hover:bg-[#0c2419] hover:text-emerald-300 transition-colors disabled:opacity-50 cursor-pointer"
            title="تحديث ومزامنة البيانات"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-emerald-400' : ''}`} />
          </button>
        </div>
      </div>

      {/* Primary Action Buttons Bar */}
      <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-emerald-500/20">
        <button
          id="btn-whatsapp-new-message"
          onClick={onOpenNewMessage}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs transition-all shadow-md shadow-emerald-950 active:scale-95 cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>+ رسالة جديدة</span>
        </button>

        <button
          id="btn-whatsapp-send-statement"
          onClick={onOpenSendStatement}
          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#06120d] hover:bg-emerald-500/10 text-slate-300 hover:text-emerald-300 border border-emerald-500/30 hover:border-emerald-400 font-bold text-xs transition-all cursor-pointer"
        >
          <FileText className="w-3.5 h-3.5 text-emerald-400" />
          <span>إرسال كشف حساب</span>
        </button>

        <button
          id="btn-whatsapp-send-invoice"
          onClick={onOpenSendInvoice}
          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#06120d] hover:bg-teal-500/10 text-slate-300 hover:text-teal-300 border border-emerald-500/30 hover:border-teal-400 font-bold text-xs transition-all cursor-pointer"
        >
          <CreditCard className="w-3.5 h-3.5 text-teal-400" />
          <span>إرسال فاتورة</span>
        </button>

        <button
          id="btn-whatsapp-send-reminder"
          onClick={onOpenSendReminder}
          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#06120d] hover:bg-amber-500/10 text-slate-300 hover:text-amber-300 border border-emerald-500/30 hover:border-amber-400 font-bold text-xs transition-all cursor-pointer"
        >
          <Bell className="w-3.5 h-3.5 text-amber-400" />
          <span>تذكيرات الديون والذمم</span>
        </button>

        <button
          id="btn-whatsapp-schedule-message"
          onClick={onOpenScheduleMessage}
          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#06120d] hover:bg-emerald-500/10 text-slate-300 hover:text-emerald-300 border border-emerald-500/30 hover:border-emerald-400 font-bold text-xs transition-all cursor-pointer"
        >
          <Clock className="w-3.5 h-3.5 text-emerald-400" />
          <span>جدولة رسالة</span>
        </button>

        <button
          id="btn-whatsapp-config-tab"
          onClick={onOpenConfig}
          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#06120d] hover:bg-slate-800 text-slate-400 hover:text-white border border-emerald-500/20 font-bold text-xs transition-all cursor-pointer mr-auto"
        >
          <Settings className="w-3.5 h-3.5 text-emerald-400" />
          <span>إعدادات الربط والرقم</span>
        </button>
      </div>
    </header>
  );
};
