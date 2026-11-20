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
  onNewMessage?: () => void;
  onOpenSendStatement?: () => void;
  onSendStatement?: () => void;
  onOpenSendInvoice?: () => void;
  onSendInvoice?: () => void;
  onOpenSendReminder?: () => void;
  onSendReminder?: () => void;
  onOpenCreateTemplate?: () => void;
  onCreateTemplate?: () => void;
  onOpenScheduleMessage?: () => void;
  onScheduleMessage?: () => void;
  onOpenConfig?: () => void;
  onConfig?: () => void;
}

export const WhatsAppHeader: React.FC<WhatsAppHeaderProps> = ({
  isConnected = true,
  providerText = 'UltraMsg Cloud Gateway',
  displayPhone = '+967 770 000 000',
  isRefreshing = false,
  onRefresh,
  onOpenNewMessage,
  onNewMessage,
  onOpenSendStatement,
  onSendStatement,
  onOpenSendInvoice,
  onSendInvoice,
  onOpenSendReminder,
  onSendReminder,
  onOpenCreateTemplate,
  onCreateTemplate,
  onOpenScheduleMessage,
  onScheduleMessage,
  onOpenConfig,
  onConfig,
}) => {
  const handleRefresh = () => {
    if (typeof onRefresh === 'function') onRefresh();
  };
  const handleNewMessage = () => {
    const fn = onOpenNewMessage || onNewMessage;
    if (typeof fn === 'function') fn();
  };
  const handleSendStatement = () => {
    const fn = onOpenSendStatement || onSendStatement;
    if (typeof fn === 'function') fn();
  };
  const handleSendInvoice = () => {
    const fn = onOpenSendInvoice || onSendInvoice;
    if (typeof fn === 'function') fn();
  };
  const handleSendReminder = () => {
    const fn = onOpenSendReminder || onSendReminder;
    if (typeof fn === 'function') fn();
  };
  const handleSchedule = () => {
    const fn = onOpenScheduleMessage || onScheduleMessage;
    if (typeof fn === 'function') fn();
  };
  const handleConfig = () => {
    const fn = onOpenConfig || onConfig;
    if (typeof fn === 'function') fn();
  };

  return (
    <header id="whatsapp-main-header" className="m3-card-elevated p-5 space-y-4">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        {/* Title & Connection Status */}
        <div className="space-y-1.5">
          <div className="flex flex-wrap items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[var(--md-primary-container)] text-[var(--md-on-primary-container)] border border-[var(--md-primary)]/20 flex items-center justify-center shrink-0">
              <MessageSquare className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-[var(--md-on-surface)] tracking-tight flex flex-wrap items-center gap-2">
                <span>رسائل وإشعارات WhatsApp</span>
                <span className="m3-badge m3-badge-primary text-[11px]">
                  ERP Cloud Hub
                </span>
              </h1>
              <p className="text-xs text-[var(--md-on-surface-variant)] font-medium">
                مركز التواصل والتنبيهات وإرسال الفواتير وكشوفات الحساب الذكية للعملاء والموردين
              </p>
            </div>
          </div>
        </div>

        {/* Status Indicator & Main Connection Badge */}
        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={handleConfig}
            className="m3-btn-outlined !min-h-[38px] text-xs cursor-pointer"
            title="انقر لتعديل إعدادات الربط والرقم"
          >
            <span className="relative flex h-2.5 w-2.5">
              {isConnected ? (
                <>
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[var(--md-success)] opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-[var(--md-success)]"></span>
                </>
              ) : (
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-[var(--md-error)]"></span>
              )}
            </span>
            <span className="font-bold text-[var(--md-on-surface)]">
              {isConnected ? 'متصل برقم:' : 'غير متصل'}
            </span>
            <span className="text-[11px] text-[var(--md-primary-text)] font-mono tabular-nums" dir="ltr">
              {displayPhone || '+967 770 000 000'}
            </span>
            <Settings className="w-3.5 h-3.5 text-[var(--md-on-surface-variant)] mr-1" />
          </button>

          <button
            id="btn-whatsapp-refresh"
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="m3-btn-outlined !min-h-[38px] !px-2.5 disabled:opacity-50 cursor-pointer"
            title="تحديث ومزامنة البيانات"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-[var(--md-primary-text)]' : ''}`} />
          </button>
        </div>
      </div>

      {/* Primary Action Buttons Bar */}
      <div className="flex flex-wrap items-center gap-2 pt-3 border-t border-[var(--md-outline-variant)]">
        <button
          id="btn-whatsapp-new-message"
          onClick={handleNewMessage}
          className="m3-btn-primary text-xs cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>+ رسالة جديدة</span>
        </button>

        <button
          id="btn-whatsapp-send-statement"
          onClick={handleSendStatement}
          className="m3-btn-outlined text-xs cursor-pointer"
        >
          <FileText className="w-3.5 h-3.5 text-[var(--md-primary-text)]" />
          <span>إرسال كشف حساب</span>
        </button>

        <button
          id="btn-whatsapp-send-invoice"
          onClick={handleSendInvoice}
          className="m3-btn-outlined text-xs cursor-pointer"
        >
          <CreditCard className="w-3.5 h-3.5 text-[var(--md-info)]" />
          <span>إرسال فاتورة</span>
        </button>

        <button
          id="btn-whatsapp-send-reminder"
          onClick={handleSendReminder}
          className="m3-btn-outlined text-xs cursor-pointer"
        >
          <Bell className="w-3.5 h-3.5 text-[var(--md-warning)]" />
          <span>تذكيرات الديون والذمم</span>
        </button>

        <button
          id="btn-whatsapp-schedule-message"
          onClick={handleSchedule}
          className="m3-btn-outlined text-xs cursor-pointer"
        >
          <Clock className="w-3.5 h-3.5 text-[var(--md-primary-text)]" />
          <span>جدولة رسالة</span>
        </button>

        <button
          id="btn-whatsapp-config-tab"
          onClick={handleConfig}
          className="m3-btn-tonal text-xs cursor-pointer mr-auto"
        >
          <Settings className="w-3.5 h-3.5" />
          <span>إعدادات الربط والرقم</span>
        </button>
      </div>
    </header>
  );
};
