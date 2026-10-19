import React, { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../api';
import { Bell, Check, CheckCheck, AlertCircle, Clock, ShoppingBag, FileText, Package, RefreshCw } from 'lucide-react';

export const NotificationsTab: React.FC = () => {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const [notifications, setNotifications] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [unreadOnly, setUnreadOnly] = useState(false);

  const fetchNotifications = async () => {
    if (!isAuthenticated) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const res = await api.getNotifications(unreadOnly);
      if (res?.data) {
        setNotifications(res.data.notifications || []);
        setUnreadCount(res.data.unreadCount || 0);
      }
    } catch (err) {
      console.error('Failed to load notifications:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!authLoading) {
      fetchNotifications();
    }
  }, [authLoading, isAuthenticated, unreadOnly]);

  const handleMarkAsRead = async (id: string) => {
    try {
      await api.markNotificationRead(id);
      fetchNotifications();
    } catch (err) {
      console.error('Failed to mark read:', err);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await api.markAllNotificationsRead();
      fetchNotifications();
    } catch (err) {
      console.error('Failed to mark all read:', err);
    }
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'LOW_STOCK':
        return <Package className="w-5 h-5 text-rose-400" />;
      case 'OVERDUE_CUSTOMER_INVOICE':
        return <FileText className="w-5 h-5 text-amber-400" />;
      case 'UPCOMING_CUSTOMER_PAYMENT':
        return <Clock className="w-5 h-5 text-emerald-400" />;
      case 'OVERDUE_SUPPLIER_INVOICE':
        return <ShoppingBag className="w-5 h-5 text-rose-400" />;
      case 'UPCOMING_SUPPLIER_PAYMENT':
        return <Clock className="w-5 h-5 text-teal-400" />;
      default:
        return <Bell className="w-5 h-5 text-slate-400" />;
    }
  };

  return (
    <div className="space-y-6 text-right text-slate-100 font-sans" dir="rtl">
      
      {/* Header Banner */}
      <div className="bg-slate-900 border border-emerald-900/40 rounded-2xl p-5 sm:p-6 shadow-xl relative overflow-hidden text-white flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-br from-emerald-500/10 via-teal-500/5 to-transparent rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />

        <div className="relative z-10">
          <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px] font-bold font-mono mb-2">
            <Bell className="w-3.5 h-3.5" />
            <span>Alerts & Notifications</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">مركز التنبيهات المباشر</h1>
          <p className="text-xs sm:text-sm text-slate-400 font-medium mt-1">متابعة الفواتير المتأخرة، المبالغ المستحقة القريبة، وحدود أمان المخزون</p>
        </div>

        <div className="flex items-center gap-2 relative z-10">
          {unreadCount > 0 && (
            <button
              onClick={handleMarkAllRead}
              className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-xl text-xs font-bold transition-all shadow-lg shadow-emerald-950/60 border border-emerald-500/40 cursor-pointer active:scale-95"
            >
              <CheckCheck className="w-4 h-4" />
              <span>تحديد الكل كمقروء ({unreadCount})</span>
            </button>
          )}
          <button
            onClick={fetchNotifications}
            className="p-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl transition-colors border border-slate-700"
            title="تحديث"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-emerald-400' : ''}`} />
          </button>
        </div>
      </div>

      {/* Filter Toggle */}
      <div className="flex items-center justify-between bg-slate-900 p-4 rounded-2xl border border-slate-800/80 text-xs font-bold shadow-xl">
        <div className="flex items-center gap-2">
          <label className="flex items-center gap-2 cursor-pointer text-slate-200">
            <input
              type="checkbox"
              checked={unreadOnly}
              onChange={(e) => setUnreadOnly(e.target.checked)}
              className="rounded accent-emerald-600 w-4 h-4 bg-slate-950 border-slate-700"
            />
            <span>عرض التنبيهات غير المقروءة فقط</span>
          </label>
        </div>
        <span className="text-slate-400 font-normal">إجمالي التنبيهات: {notifications.length}</span>
      </div>

      {/* Notifications List */}
      <div className="bg-slate-900 rounded-2xl border border-slate-800/80 shadow-xl overflow-hidden divide-y divide-slate-800/70">
        {notifications.length > 0 ? (
          notifications.map((item) => (
            <div
              key={item.id}
              className={`p-4 flex items-start justify-between gap-4 transition-colors ${
                !item.is_read ? 'bg-emerald-500/5 hover:bg-emerald-500/10' : 'hover:bg-slate-800/40'
              }`}
            >
              <div className="flex items-start gap-3">
                <div className="p-2.5 bg-slate-950 rounded-xl border border-slate-800 mt-0.5 shrink-0">
                  {getIcon(item.type)}
                </div>
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-white">{item.title}</span>
                    {!item.is_read && (
                      <span className="text-[10px] bg-emerald-950 text-emerald-300 border border-emerald-800/60 px-2 py-0.5 rounded-full font-bold">جديد</span>
                    )}
                  </div>
                  <p className="text-xs text-slate-400 leading-relaxed">{item.message}</p>
                  <div className="text-[10px] text-slate-500 font-mono">
                    {new Date(item.created_at).toLocaleString('ar-YE')}
                  </div>
                </div>
              </div>

              {!item.is_read && (
                <button
                  onClick={() => handleMarkAsRead(item.id)}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 rounded-xl text-xs font-bold shrink-0 transition-colors flex items-center gap-1.5"
                >
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span>تم الاطلاع</span>
                </button>
              )}
            </div>
          ))
        ) : (
          <div className="p-12 text-center text-slate-400 space-y-2">
            <CheckCheck className="w-10 h-10 mx-auto text-emerald-400" />
            <div className="text-sm font-bold text-white">لا توجد تنبيهات حالية</div>
            <p className="text-xs text-slate-400">جميع الفواتير والمخزون في حدود الأمان المالي</p>
          </div>
        )}
      </div>

    </div>
  );
};
