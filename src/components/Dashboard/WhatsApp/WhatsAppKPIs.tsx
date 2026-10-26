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
      color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30',
    },
    {
      id: 'kpi-unread',
      title: 'غير مقروءة',
      value: (stats.unreadCount ?? 0).toLocaleString('en-US'),
      icon: MailCheck,
      color: (stats.unreadCount ?? 0) > 0 ? 'text-amber-400 bg-amber-500/10 border-amber-500/30' : 'text-slate-400 bg-slate-900 border-slate-800',
    },
    {
      id: 'kpi-sent-today',
      title: 'المرسلة اليوم',
      value: (stats.sentToday ?? 0).toLocaleString('en-US'),
      icon: Send,
      color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30',
    },
    {
      id: 'kpi-delivered',
      title: 'تم التسليم',
      value: (stats.deliveredCount ?? 0).toLocaleString('en-US'),
      icon: CheckCheck,
      color: 'text-teal-400 bg-teal-500/10 border-teal-500/30',
    },
    {
      id: 'kpi-read',
      title: 'تمت القراءة',
      value: (stats.readCount ?? 0).toLocaleString('en-US'),
      icon: Eye,
      color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30',
    },
    {
      id: 'kpi-failed',
      title: 'فشل الإرسال',
      value: (stats.failedCount ?? 0).toLocaleString('en-US'),
      icon: AlertTriangle,
      color: (stats.failedCount ?? 0) > 0 ? 'text-rose-400 bg-rose-500/10 border-rose-500/30' : 'text-slate-500 bg-slate-900 border-slate-800',
    },
    {
      id: 'kpi-scheduled',
      title: 'رسائل مجدولة',
      value: (stats.scheduledCount ?? 0).toLocaleString('en-US'),
      icon: Clock,
      color: 'text-teal-400 bg-teal-500/10 border-teal-500/30',
    },
    {
      id: 'kpi-delivery-rate',
      title: 'نسبة التسليم',
      value: `${stats.deliveryRate ?? 100}%`,
      icon: TrendingUp,
      color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30',
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
            className="bg-[#091511] rounded-2xl border border-emerald-500/20 p-3 shadow-lg space-y-1.5 hover:border-emerald-500/40 transition-colors"
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-400 truncate">{kpi.title}</span>
              <div className={`p-1 rounded-md border ${kpi.color}`}>
                <Icon className="w-3.5 h-3.5" />
              </div>
            </div>
            <p className="text-base font-black text-white tracking-tight font-mono">{kpi.value}</p>
          </div>
        );
      })}
    </div>
  );
};
