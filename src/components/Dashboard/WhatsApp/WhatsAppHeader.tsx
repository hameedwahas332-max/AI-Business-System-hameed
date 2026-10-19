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
  Share2,
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
}

export const WhatsAppHeader: React.FC<WhatsAppHeaderProps> = ({
  isConnected = true,
  providerText = 'UltraMsg Cloud Gateway',
  displayPhone = '+966 50 123 4567',
  isRefreshing = false,
  onRefresh = () => {},
  onOpenNewMessage = () => {},
  onOpenSendStatement = () => {},
  onOpenSendInvoice = () => {},
  onOpenSendReminder = () => {},
  onOpenCreateTemplate = () => {},
  onOpenScheduleMessage = () => {},
}) => {
  return (
    <header id="whatsapp-main-header" className="bg-slate-900 rounded-2xl border border-slate-800 p-5 shadow-xl space-y-4">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        {/* Title & Connection Status */}
        <div className="space-y-1.5">
          <div className="flex flex-wrap items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-500 text-white flex items-center justify-center shadow-lg shadow-emerald-950/40">
              <MessageSquare className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl font-black text-slate-100 tracking-tight flex items-center gap-2">
                <span>رسائل وإشعارات WhatsApp</span>
                <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  ERP Cloud Hub
                </span>
              </h1>
              <p className="text-xs text-slate-400 font-medium">
                مركز التواصل والتنبيهات والأتمتة مع العملاء والموردين
              </p>
            </div>
          </div>
        </div>

        {/* Status Indicator & Main Connection Badge */}
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-slate-950/70 border border-slate-800 text-xs">
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
            <span className="font-bold text-slate-200">
              {isConnected ? 'WhatsApp متصل' : 'WhatsApp غير متصل'}
            </span>
            <span className="text-[11px] text-slate-400 font-mono" dir="ltr">
              {displayPhone || 'Meta Cloud API'}
            </span>
          </div>

          <button
            id="btn-whatsapp-refresh"
            onClick={onRefresh}
            disabled={isRefreshing}
            className="p-2 rounded-xl border border-slate-800 bg-slate-950/50 text-slate-300 hover:bg-slate-800 hover:text-slate-100 transition-colors disabled:opacity-50"
            title="تحديث البيانات"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-emerald-400' : ''}`} />
          </button>
        </div>
      </div>

      {/* Primary Action Buttons Bar */}
      <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-800">
        <button
          id="btn-whatsapp-new-message"
          onClick={onOpenNewMessage}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs transition-all shadow-md shadow-emerald-950/40 active:scale-95"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>+ رسالة جديدة</span>
        </button>

        <button
          id="btn-whatsapp-send-statement"
          onClick={onOpenSendStatement}
          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-950/60 hover:bg-emerald-500/10 text-slate-300 hover:text-emerald-300 border border-slate-800 hover:border-emerald-500/30 font-bold text-xs transition-all"
        >
          <FileText className="w-3.5 h-3.5 text-emerald-400" />
          <span>إرسال كشف حساب</span>
        </button>

        <button
          id="btn-whatsapp-send-invoice"
          onClick={onOpenSendInvoice}
          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-950/60 hover:bg-teal-500/10 text-slate-300 hover:text-teal-300 border border-slate-800 hover:border-teal-500/30 font-bold text-xs transition-all"
        >
          <CreditCard className="w-3.5 h-3.5 text-teal-400" />
          <span>إرسال فاتورة</span>
        </button>

        <button
          id="btn-whatsapp-send-reminder"
          onClick={onOpenSendReminder}
          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-950/60 hover:bg-amber-500/10 text-slate-300 hover:text-amber-300 border border-slate-800 hover:border-amber-500/30 font-bold text-xs transition-all"
        >
          <Bell className="w-3.5 h-3.5 text-amber-400" />
          <span>إرسال تذكير</span>
        </button>

        <button
          id="btn-whatsapp-create-template"
          onClick={onOpenCreateTemplate}
          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-950/60 hover:bg-teal-500/10 text-slate-300 hover:text-teal-300 border border-slate-800 hover:border-teal-500/30 font-bold text-xs transition-all"
        >
          <Sparkles className="w-3.5 h-3.5 text-teal-400" />
          <span>إنشاء قالب</span>
        </button>

        <button
          id="btn-whatsapp-schedule-message"
          onClick={onOpenScheduleMessage}
          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-950/60 hover:bg-emerald-500/10 text-slate-300 hover:text-emerald-300 border border-slate-800 hover:border-emerald-500/30 font-bold text-xs transition-all"
        >
          <Clock className="w-3.5 h-3.5 text-emerald-400" />
          <span>جدولة رسالة</span>
        </button>
      </div>
    </header>
  );
};
