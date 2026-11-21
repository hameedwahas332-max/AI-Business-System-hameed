import React, { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../api';
import { Bell, Check, CheckCheck, Clock, ShoppingBag, FileText, Package, RefreshCw } from 'lucide-react';

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
      await fetchNotifications();
      window.dispatchEvent(new CustomEvent('erp-notifications-updated'));
    } catch (err) {
      console.error('Failed to mark read:', err);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await api.markAllNotificationsRead();
      await fetchNotifications();
      window.dispatchEvent(new CustomEvent('erp-notifications-updated'));
    } catch (err) {
      console.error('Failed to mark all read:', err);
    }
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'LOW_STOCK':
        return <Package className="w-5 h-5" style={{ color: 'var(--md-error)' }} />;
      case 'OVERDUE_CUSTOMER_INVOICE':
        return <FileText className="w-5 h-5" style={{ color: 'var(--md-warning)' }} />;
      case 'UPCOMING_CUSTOMER_PAYMENT':
        return <Clock className="w-5 h-5" style={{ color: 'var(--md-success)' }} />;
      case 'OVERDUE_SUPPLIER_INVOICE':
        return <ShoppingBag className="w-5 h-5" style={{ color: 'var(--md-error)' }} />;
      case 'UPCOMING_SUPPLIER_PAYMENT':
        return <Clock className="w-5 h-5" style={{ color: 'var(--md-info)' }} />;
      default:
        return <Bell className="w-5 h-5 text-[var(--md-on-surface-variant)]" />;
    }
  };

  return (
    <div className="space-y-6 text-right text-[var(--md-on-surface)] font-sans" dir="rtl">
      {/* Header Banner */}
      <div className="m3-card p-5 sm:p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="space-y-1.5">
          <div
            className="m3-badge font-mono"
            style={{
              backgroundColor: 'var(--md-primary-container)',
              color: 'var(--md-on-primary-container)',
              borderColor: 'transparent',
            }}
          >
            <Bell className="w-3.5 h-3.5" />
            <span>Alerts & Notifications</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-[var(--md-on-surface)] tracking-tight">
            مركز التنبيهات المباشر
          </h1>
          <p className="text-xs sm:text-sm text-[var(--md-on-surface-variant)]">
            متابعة الفواتير المتأخرة، المبالغ المستحقة القريبة، وحدود أمان المخزون
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {unreadCount > 0 && (
            <button
              type="button"
              onClick={handleMarkAllRead}
              className="m3-btn-primary h-10 px-4 text-xs"
            >
              <CheckCheck className="w-4 h-4" />
              <span className="tabular-nums">تحديد الكل كمقروء ({unreadCount})</span>
            </button>
          )}
          <button
            type="button"
            onClick={fetchNotifications}
            className="m3-btn-outlined w-10 h-10 p-0 justify-center"
            title="تحديث"
            aria-label="تحديث التنبيهات"
          >
            <RefreshCw
              className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`}
              style={{ color: loading ? 'var(--md-primary)' : undefined }}
            />
          </button>
        </div>
      </div>

      {/* Filter Toggle */}
      <div className="m3-card p-4 flex items-center justify-between gap-4 text-xs">
        <label className="flex items-center gap-2.5 cursor-pointer font-semibold text-[var(--md-on-surface)]">
          <input
            type="checkbox"
            checked={unreadOnly}
            onChange={(e) => setUnreadOnly(e.target.checked)}
            className="rounded w-4 h-4 cursor-pointer"
            style={{ accentColor: 'var(--md-primary)' }}
          />
          <span>عرض التنبيهات غير المقروءة فقط</span>
        </label>
        <span className="text-[var(--md-on-surface-variant)] tabular-nums">
          إجمالي التنبيهات: <strong className="text-[var(--md-on-surface)] font-mono">{notifications.length}</strong>
        </span>
      </div>

      {/* Notifications List */}
      <div className="m3-card overflow-hidden divide-y divide-[var(--md-outline-variant)]">
        {notifications.length > 0 ? (
          notifications.map((item) => (
            <div
              key={item.id}
              className={`p-4 flex items-start justify-between gap-4 transition-colors ${
                !item.is_read
                  ? 'bg-[var(--md-surface-container-high)]/60 hover:bg-[var(--md-surface-container-high)]'
                  : 'hover:bg-[var(--md-surface-container-low)]'
              }`}
            >
              <div className="flex items-start gap-3 min-w-0">
                <div className="p-2.5 bg-[var(--md-surface-container-low)] rounded-xl border border-[var(--md-outline-variant)] mt-0.5 shrink-0">
                  {getIcon(item.type)}
                </div>
                <div className="space-y-1 min-w-0">
                  <div className="flex items-center flex-wrap gap-2">
                    <span className="text-sm font-bold text-[var(--md-on-surface)]">{item.title}</span>
                    {!item.is_read && (
                      <span
                        className="m3-badge"
                        style={{
                          backgroundColor: 'var(--md-primary-container)',
                          color: 'var(--md-on-primary-container)',
                          borderColor: 'transparent',
                        }}
                      >
                        جديد
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-[var(--md-on-surface-variant)] leading-relaxed">{item.message}</p>
                  <div className="text-[11px] text-[var(--md-on-surface-variant)] font-mono tabular-nums">
                    {new Date(item.created_at).toLocaleString('ar-YE')}
                  </div>
                </div>
              </div>

              {!item.is_read && (
                <button
                  type="button"
                  onClick={() => handleMarkAsRead(item.id)}
                  className="m3-btn-outlined h-9 px-3 text-xs shrink-0"
                >
                  <Check className="w-3.5 h-3.5" style={{ color: 'var(--md-success)' }} />
                  <span>تم الاطلاع</span>
                </button>
              )}
            </div>
          ))
        ) : (
          <div className="p-12 text-center space-y-2">
            <CheckCheck className="w-10 h-10 mx-auto" style={{ color: 'var(--md-success)' }} />
            <div className="text-sm font-bold text-[var(--md-on-surface)]">لا توجد تنبيهات حالية</div>
            <p className="text-xs text-[var(--md-on-surface-variant)]">
              جميع الفواتير والمخزون في حدود الأمان المالي
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
