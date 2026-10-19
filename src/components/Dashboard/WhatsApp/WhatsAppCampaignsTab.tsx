import React, { useState } from 'react';
import {
  Share2,
  Users,
  Plus,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Sparkles,
  Send,
  ShieldAlert,
} from 'lucide-react';
import { WhatsAppCampaign } from './types';

interface WhatsAppCampaignsTabProps {
  campaigns?: WhatsAppCampaign[];
  onCreateCampaign?: (data: any) => Promise<boolean>;
  totalCustomersCount?: number;
  totalSuppliersCount?: number;
}

export const WhatsAppCampaignsTab: React.FC<WhatsAppCampaignsTabProps> = ({
  campaigns = [],
  onCreateCampaign = async () => true,
  totalCustomersCount = 120,
  totalSuppliersCount = 45,
}) => {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [name, setName] = useState('');
  const [targetAudience, setTargetAudience] = useState('ALL_CUSTOMERS');
  const [messageBody, setMessageBody] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);

  // Calculate estimated audience
  const getEstimatedCount = (audience: string) => {
    switch (audience) {
      case 'ALL_CUSTOMERS':
        return Math.max(totalCustomersCount, 24);
      case 'OVERDUE':
        return Math.max(Math.floor(totalCustomersCount * 0.4), 8);
      case 'VIP':
        return Math.max(Math.floor(totalCustomersCount * 0.2), 5);
      case 'SUPPLIERS':
        return Math.max(totalSuppliersCount, 12);
      default:
        return totalCustomersCount || 10;
    }
  };

  const estimatedRecipients = getEstimatedCount(targetAudience);

  const handleStartBroadcast = () => {
    if (!name.trim() || !messageBody.trim()) return;
    setShowConfirmDialog(true);
  };

  const handleConfirmAndSend = async () => {
    setIsSubmitting(true);
    try {
      const ok = await onCreateCampaign({
        name: name.trim(),
        target_audience: targetAudience,
        message_body: messageBody.trim(),
      });
      if (ok) {
        setName('');
        setMessageBody('');
        setShowConfirmDialog(false);
        setShowCreateModal(false);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div id="whatsapp-campaigns-section" className="space-y-6">
      
      {/* Header */}
      <div className="bg-slate-900 rounded-2xl border border-slate-800 p-5 shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <h2 className="text-base font-bold text-slate-100 flex items-center gap-2">
            <Share2 className="w-5 h-5 text-indigo-400" />
            <span>الحملات الإعلانية ورسائل البث الجماعي (Broadcast Campaigns)</span>
          </h2>
          <p className="text-xs text-slate-400">
            إرسال إشعارات وعروض ومطابقات جماعية مع حماية كاملة من الحظر وسياسات Meta المعتمدة.
          </p>
        </div>

        <button
          onClick={() => setShowCreateModal(true)}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs transition-all shadow-md shadow-emerald-950/40 active:scale-95 shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>+ إنشاء حملة بث جديدة</span>
        </button>
      </div>

      {/* Campaigns Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {campaigns.map((camp) => (
          <div
            key={camp.id}
            className="bg-slate-900 rounded-2xl border border-slate-800 p-5 shadow-xl space-y-4 hover:border-slate-700 transition-all"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-bold text-slate-100">{camp.name}</h3>
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                      camp.status === 'COMPLETED'
                        ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                        : 'bg-indigo-500/10 text-indigo-300 border-indigo-500/20'
                    }`}
                  >
                    {camp.status === 'COMPLETED' ? 'مكتملة بنجاح' : 'مجدولة'}
                  </span>
                </div>
                <p className="text-xs text-slate-400 flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5 text-indigo-400" />
                  <span>الجمهور: {camp.target_audience}</span>
                </p>
              </div>

              <div className="text-left font-mono">
                <span className="text-lg font-black text-slate-100">{camp.total_recipients.toLocaleString('en-US')}</span>
                <span className="text-[10px] text-slate-500 block">مستلم</span>
              </div>
            </div>

            <div className="p-3 bg-slate-950/60 rounded-xl text-xs text-slate-300 font-sans border border-slate-800 leading-relaxed">
              {camp.message_body}
            </div>

            {/* Delivery Stats Bar */}
            <div className="space-y-1.5 pt-2 border-t border-slate-800">
              <div className="flex items-center justify-between text-[11px] text-slate-400 font-mono">
                <span>تم التسليم: {(camp.delivered_count || camp.total_recipients).toLocaleString('en-US')}</span>
                <span>فشل: {(camp.failed_count || 0).toLocaleString('en-US')}</span>
                <span className="font-bold text-emerald-400">
                  نسبة النجاح: {Math.round(((camp.delivered_count || camp.total_recipients) / Math.max(camp.total_recipients, 1)) * 100)}%
                </span>
              </div>
              <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-emerald-500 rounded-full"
                  style={{
                    width: `${Math.round(((camp.delivered_count || camp.total_recipients) / Math.max(camp.total_recipients, 1)) * 100)}%`,
                  }}
                />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Create Campaign Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-slate-900 rounded-2xl border border-slate-800 shadow-2xl max-w-lg w-full p-6 space-y-4 animate-scale-in">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
                <Share2 className="w-5 h-5 text-indigo-400" />
                <span>إنشاء حملة رسائل جماعية جديدة</span>
              </h3>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-slate-400 hover:text-slate-200 text-lg font-bold"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">اسم الحملة *</label>
                <input
                  type="text"
                  required
                  placeholder="مثال: مطابقة أرصدة نهاية الربع الأول"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500 text-slate-100 placeholder:text-slate-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">الشريحة المستهدفة</label>
                <select
                  value={targetAudience}
                  onChange={(e) => setTargetAudience(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200"
                >
                  <option value="ALL_CUSTOMERS">جميع العملاء النشطين</option>
                  <option value="OVERDUE">العملاء أصحاب الأرصدة المتأخرة فقط</option>
                  <option value="VIP">كبار العملاء (VIP)</option>
                  <option value="SUPPLIERS">جميع الموردين</option>
                </select>
              </div>

              {/* Estimated audience callout */}
              <div className="p-3 bg-indigo-500/10 border border-indigo-500/20 rounded-xl flex items-center justify-between text-xs text-indigo-300 font-bold">
                <span className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-indigo-400" />
                  <span>العدد التقديري للمستلمين:</span>
                </span>
                <span className="font-mono text-sm text-indigo-200">{estimatedRecipients.toLocaleString('en-US')} جهة اتصال</span>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">نص الرسالة *</label>
                <textarea
                  rows={4}
                  required
                  placeholder="نص رسالة البث الجماعي..."
                  value={messageBody}
                  onChange={(e) => setMessageBody(e.target.value)}
                  className="w-full p-3 bg-slate-950 border border-slate-800 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500 text-slate-100 placeholder:text-slate-500 leading-relaxed"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 rounded-xl border border-slate-700 text-slate-300 text-xs font-bold hover:bg-slate-800"
                >
                  إلغاء
                </button>
                <button
                  type="button"
                  onClick={handleStartBroadcast}
                  disabled={!name.trim() || !messageBody.trim()}
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs transition-all shadow-md shadow-emerald-950/40 disabled:opacity-50"
                >
                  متابعة الإرسال والتأكيد
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Dialog before bulk broadcast */}
      {showConfirmDialog && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4 z-60 animate-fade-in">
          <div className="bg-slate-900 rounded-2xl border border-amber-500/30 shadow-2xl max-w-md w-full p-6 space-y-4 animate-scale-in text-right">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-400 flex items-center justify-center mx-auto border border-amber-500/20">
              <ShieldAlert className="w-6 h-6" />
            </div>

            <div className="text-center space-y-1">
              <h3 className="text-base font-bold text-slate-100">تأكيد إطلاق حملة البث الجماعي</h3>
              <p className="text-xs text-slate-400">
                أنت على وشك إرسال رسالة واتساب جماعية إلى{' '}
                <span className="font-bold text-slate-100 font-mono">{estimatedRecipients.toLocaleString('en-US')}</span> جهة اتصال.
              </p>
            </div>

            <div className="p-3 bg-amber-500/10 rounded-xl border border-amber-500/20 text-[11px] text-amber-300 space-y-1">
              <p className="font-bold">⚠️ تنبيه أمان وسياسات Meta:</p>
              <p>يتم توزيع الرسائل على دفعات آمنة لضمان عدم تجاوز معدلات الإرسال المسموحة للرقم.</p>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setShowConfirmDialog(false)}
                disabled={isSubmitting}
                className="px-4 py-2 rounded-xl border border-slate-700 text-slate-300 text-xs font-bold hover:bg-slate-800"
              >
                تراجع
              </button>
              <button
                type="button"
                onClick={handleConfirmAndSend}
                disabled={isSubmitting}
                className="px-5 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs transition-all shadow-md shadow-emerald-950/40 disabled:opacity-50"
              >
                {isSubmitting ? 'جاري الإطلاق...' : 'نعم، إطلاق الحملة الآن'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
