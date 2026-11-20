import React from 'react';
import {
  TrendingUp,
  CheckCheck,
  Eye,
  AlertTriangle,
  Clock,
  Send,
  Zap,
  BarChart3,
} from 'lucide-react';
import { WhatsAppKPIStats } from './types';

interface WhatsAppAnalyticsTabProps {
  stats?: Partial<WhatsAppKPIStats>;
}

const defaultStats: WhatsAppKPIStats = {
  totalConversations: 142,
  unreadCount: 3,
  sentToday: 87,
  deliveredCount: 85,
  readCount: 78,
  failedCount: 2,
  scheduledCount: 12,
  deliveryRate: 97.7,
  responseRatePercent: 89.4,
  avgResponseMinutes: 4.5,
};

export const WhatsAppAnalyticsTab: React.FC<WhatsAppAnalyticsTabProps> = ({ stats: inputStats }) => {
  const stats = { ...defaultStats, ...inputStats };
  const delivered = stats.deliveredCount ?? 0;
  const read = stats.readCount ?? 0;
  const failed = stats.failedCount ?? 0;
  const sent = delivered + read + failed || 100;
  const deliveredPercent = Math.min(100, Math.round(((delivered + read) / Math.max(sent, 1)) * 100));
  const readPercent = Math.min(100, Math.round((read / Math.max(sent, 1)) * 100));
  const failedPercent = Math.min(100, Math.round((failed / Math.max(sent, 1)) * 100));

  return (
    <div id="whatsapp-analytics-section" className="space-y-6 text-[var(--md-on-surface)]" dir="rtl">

      {/* Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="m3-card p-5 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-[var(--md-on-surface-variant)]">معدل التسليم الناجح</span>
            <CheckCheck className="w-4 h-4 text-[var(--md-success)]" />
          </div>
          <p className="text-2xl font-black text-[var(--md-on-surface)] font-mono tabular-nums">{stats.deliveryRate}%</p>
          <p className="text-[11px] text-[var(--md-success)] font-medium">أداء ممتاز عبر خوادم Meta الرسمية</p>
        </div>

        <div className="m3-card p-5 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-[var(--md-on-surface-variant)]">معدل قراءة الرسائل</span>
            <Eye className="w-4 h-4 text-[var(--md-info)]" />
          </div>
          <p className="text-2xl font-black text-[var(--md-on-surface)] font-mono tabular-nums">{readPercent || 78}%</p>
          <p className="text-[11px] text-[var(--md-on-surface-variant)] font-medium">تفاعل عالي مع إشعارات الفواتير والتحصيل</p>
        </div>

        <div className="m3-card p-5 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-[var(--md-on-surface-variant)]">متوسط سرعة الإرسال</span>
            <Zap className="w-4 h-4 text-[var(--md-warning)]" />
          </div>
          <p className="text-2xl font-black text-[var(--md-on-surface)] font-mono tabular-nums">1.2 ثانية</p>
          <p className="text-[11px] text-[var(--md-on-surface-variant)] font-medium">معالجة فورية عبر الويب هوك السحابي</p>
        </div>
      </div>

      {/* Delivery Funnel & Channel Breakdown */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

        {/* Delivery Funnel */}
        <div className="m3-card p-5 space-y-4">
          <h3 className="text-sm font-bold text-[var(--md-on-surface)] flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-[var(--md-primary-text)]" />
            <span>مسار وصول الرسائل (Delivery Funnel)</span>
          </h3>

          <div className="space-y-3 pt-2">
            {/* Sent */}
            <div className="space-y-1">
              <div className="flex justify-between text-xs font-semibold text-[var(--md-on-surface-variant)]">
                <span>المرسلة من النظام (Dispatched)</span>
                <span className="font-mono tabular-nums text-[var(--md-on-surface)]">{sent.toLocaleString('en-US')} رسالة</span>
              </div>
              <div className="w-full h-3 bg-[var(--md-surface-container-highest)] rounded-full overflow-hidden">
                <div className="h-full bg-[var(--md-info)] rounded-full w-full" />
              </div>
            </div>

            {/* Delivered */}
            <div className="space-y-1">
              <div className="flex justify-between text-xs font-semibold text-[var(--md-on-surface-variant)]">
                <span>تم التسليم لجهاز المستلم (Delivered)</span>
                <span className="font-mono tabular-nums text-[var(--md-on-surface)]">{deliveredPercent}%</span>
              </div>
              <div className="w-full h-3 bg-[var(--md-surface-container-highest)] rounded-full overflow-hidden">
                <div
                  className="h-full bg-[var(--md-primary)] rounded-full"
                  style={{ width: `${deliveredPercent}%` }}
                />
              </div>
            </div>

            {/* Read */}
            <div className="space-y-1">
              <div className="flex justify-between text-xs font-semibold text-[var(--md-on-surface-variant)]">
                <span>تم فتح وقراءة الرسالة (Read)</span>
                <span className="font-mono tabular-nums text-[var(--md-on-surface)]">{readPercent || 78}%</span>
              </div>
              <div className="w-full h-3 bg-[var(--md-surface-container-highest)] rounded-full overflow-hidden">
                <div
                  className="h-full bg-[var(--md-success)] rounded-full"
                  style={{ width: `${readPercent || 78}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Categories Breakdown */}
        <div className="m3-card p-5 space-y-4">
          <h3 className="text-sm font-bold text-[var(--md-on-surface)] flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-[var(--md-primary-text)]" />
            <span>توزيع الرسائل حسب التصنيف والهدف</span>
          </h3>

          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between p-2.5 rounded-xl bg-[var(--md-surface-container-low)] border border-[var(--md-outline-variant)] text-xs">
              <span className="font-bold text-[var(--md-on-surface)]">تذكيرات الفواتير والمطالبات</span>
              <span className="font-mono tabular-nums font-bold text-[var(--md-success)]">45%</span>
            </div>

            <div className="flex items-center justify-between p-2.5 rounded-xl bg-[var(--md-surface-container-low)] border border-[var(--md-outline-variant)] text-xs">
              <span className="font-bold text-[var(--md-on-surface)]">سندات القبض وإشعارات السداد</span>
              <span className="font-mono tabular-nums font-bold text-[var(--md-primary-text)]">30%</span>
            </div>

            <div className="flex items-center justify-between p-2.5 rounded-xl bg-[var(--md-surface-container-low)] border border-[var(--md-outline-variant)] text-xs">
              <span className="font-bold text-[var(--md-on-surface)]">كشوفات الحساب والمطابقات</span>
              <span className="font-mono tabular-nums font-bold text-[var(--md-info)]">15%</span>
            </div>

            <div className="flex items-center justify-between p-2.5 rounded-xl bg-[var(--md-surface-container-low)] border border-[var(--md-outline-variant)] text-xs">
              <span className="font-bold text-[var(--md-on-surface)]">محادثات مباشرة وخدمة عملاء</span>
              <span className="font-mono tabular-nums font-bold text-[var(--md-secondary)]">10%</span>
            </div>
          </div>
        </div>

      </div>

    </div>
  );
};
