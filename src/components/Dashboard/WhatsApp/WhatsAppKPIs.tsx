import React from 'react';
import {
  MessageSquare,
  MailCheck,
  Send,
  CheckCheck,
  Eye,
  AlertTriangle,
  Clock,
  TrendingUp,
} from 'lucide-react';
import { WhatsAppKPIStats } from './types';

interface WhatsAppKPIsProps {
  stats?: Partial<WhatsAppKPIStats>;
}

const defaultStats: WhatsAppKPIStats = {
  totalConversations: 0,
  unreadCount: 0,
  sentToday: 0,
  deliveredCount: 0,
  readCount: 0,
  failedCount: 0,
  scheduledCount: 0,
  deliveryRate: 100,
  responseRatePercent: 95,
};

export const WhatsAppKPIs: React.FC<WhatsAppKPIsProps> = ({ stats: inputStats }) => {
  const stats = { ...defaultStats, ...inputStats };

  const kpis = [
    {
      id: 'kpi-total-conversations',
      title: 'إجمالي المحادثات',
      value: (stats.totalConversations ?? 0).toLocaleString('en-US'),
      icon: MessageSquare,
      color: 'text-[var(--md-on-primary-container)] bg-[var(--md-primary-container)] border-[var(--md-primary)]/25',
    },
    {
      id: 'kpi-unread',
      title: 'غير مقروءة',
      value: (stats.unreadCount ?? 0).toLocaleString('en-US'),
      icon: MailCheck,
      color: (stats.unreadCount ?? 0) > 0
        ? 'text-[var(--md-on-warning-container)] bg-[var(--md-warning-container)] border-[var(--md-warning)]/30'
        : 'text-[var(--md-on-surface-variant)] bg-[var(--md-surface-container-low)] border-[var(--md-outline-variant)]',
    },
    {
      id: 'kpi-sent-today',
      title: 'المرسلة اليوم',
      value: (stats.sentToday ?? 0).toLocaleString('en-US'),
      icon: Send,
      color: 'text-[var(--md-on-primary-container)] bg-[var(--md-primary-container)] border-[var(--md-primary)]/25',
    },
    {
      id: 'kpi-delivered',
      title: 'تم التسليم',
      value: (stats.deliveredCount ?? 0).toLocaleString('en-US'),
      icon: CheckCheck,
      color: 'text-[var(--md-on-info-container)] bg-[var(--md-info-container)] border-[var(--md-info)]/25',
    },
    {
      id: 'kpi-read',
      title: 'تمت القراءة',
      value: (stats.readCount ?? 0).toLocaleString('en-US'),
      icon: Eye,
      color: 'text-[var(--md-on-success-container)] bg-[var(--md-success-container)] border-[var(--md-success)]/25',
    },
    {
      id: 'kpi-failed',
      title: 'فشل الإرسال',
      value: (stats.failedCount ?? 0).toLocaleString('en-US'),
      icon: AlertTriangle,
      color: (stats.failedCount ?? 0) > 0
        ? 'text-[var(--md-on-error-container)] bg-[var(--md-error-container)] border-[var(--md-error)]/30'
        : 'text-[var(--md-on-surface-variant)] bg-[var(--md-surface-container-low)] border-[var(--md-outline-variant)]',
    },
    {
      id: 'kpi-scheduled',
      title: 'رسائل مجدولة',
      value: (stats.scheduledCount ?? 0).toLocaleString('en-US'),
      icon: Clock,
      color: 'text-[var(--md-on-secondary-container)] bg-[var(--md-secondary-container)] border-[var(--md-secondary)]/25',
    },
    {
      id: 'kpi-delivery-rate',
      title: 'نسبة التسليم',
      value: `${stats.deliveryRate ?? 100}%`,
      icon: TrendingUp,
      color: 'text-[var(--md-on-success-container)] bg-[var(--md-success-container)] border-[var(--md-success)]/25',
    },
  ];

  return (
    <div id="whatsapp-executive-kpis" className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
      {kpis.map((kpi) => {
        const Icon = kpi.icon;
        return (
          <div
            key={kpi.id}
            id={kpi.id}
            className="m3-card p-3 space-y-1.5 hover:border-[var(--md-primary)]/40 transition-colors"
          >
            <div className="flex items-center justify-between gap-1">
              <span className="text-[11px] font-bold text-[var(--md-on-surface-variant)] truncate">{kpi.title}</span>
              <div className={`p-1 rounded-md border shrink-0 ${kpi.color}`}>
                <Icon className="w-3.5 h-3.5" />
              </div>
            </div>
            <p className="text-base font-black text-[var(--md-on-surface)] tracking-tight font-mono tabular-nums">{kpi.value}</p>
          </div>
        );
      })}
    </div>
  );
};
