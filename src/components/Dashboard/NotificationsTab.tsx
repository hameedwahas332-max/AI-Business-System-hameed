import React, { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../api';
import { formatNumber } from '../../lib/formatters';
import { Bell, Check, CheckCheck, Clock, ShoppingBag, FileText, Package, RefreshCw, AlertTriangle } from 'lucide-react';

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
      const res: any = await api.getNotifications(unreadOnly);
      const rawList = Array.isArray(res?.data)
        ? res.data
        : (res?.data?.notifications || res?.notifications || []);
      const filteredList = unreadOnly
        ? rawList.filter((n: any) => !n.is_read && !n.read)
        : rawList;
      const computedUnread =
        !Array.isArray(res?.data) && res?.data?.unreadCount !== undefined
          ? Number(res.data.unreadCount)
          : rawList.filter((n: any) => !n.is_read && !n.read).length;

      setNotifications(filteredList);
      setUnreadCount(computedUnread);
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

  useEffect(() => {
    if (authLoading || !isAuthenticated) return;
    const handleRefresh = () => {
      fetchNotifications();
    };
    window.addEventListener('erp-inventory-updated', handleRefresh);
    window.addEventListener('erp-data-updated', handleRefresh);
    window.addEventListener('erp-notifications-updated', handleRefresh);
    return () => {
      window.removeEventListener('erp-inventory-updated', handleRefresh);
      window.removeEventListener('erp-data-updated', handleRefresh);
      window.removeEventListener('erp-notifications-updated', handleRefresh);
    };
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

  const getIcon = (type: string, isOutOfStock = false) => {
    switch (type) {
      case 'LOW_STOCK':
      case 'OUT_OF_STOCK':
        return isOutOfStock ? (
          <AlertTriangle className="w-5 h-5" style={{ color: 'var(--md-error)' }} />
        ) : (
          <Package className="w-5 h-5" style={{ color: 'var(--md-warning)' }} />
        );
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
            متابعة الفواتير المتأخرة، المبالغ المستحقة القريبة، وحدود التنبيه المخصصة للمخزون قبل النفاذ
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
          notifications.map((item) => {
            const isRead = Boolean(item.is_read ?? item.read);
            const isStockAlert = item.type === 'LOW_STOCK' || item.type === 'OUT_OF_STOCK';
            const hasStockMeta =
              isStockAlert &&
              (item.current_stock !== undefined || item.qty !== undefined || item.min_stock_level !== undefined);
            const remQty = Number(item.current_stock ?? item.qty ?? 0);
            const minThreshold = Number(item.min_stock_level ?? item.custom_min_stock_level ?? 5);
            const unit = item.baseUnitName || item.unit || 'حبة';
            const isCustomThreshold =
              item.custom_min_stock_level !== null && item.custom_min_stock_level !== undefined;
            const isOutOfStock =
              isStockAlert &&
              (item.type === 'OUT_OF_STOCK' ||
                item.severity === 'CRITICAL' ||
                item.status === 'OUT_OF_STOCK' ||
                (hasStockMeta && remQty <= 0));

            const rowToneClass = isStockAlert
              ? isOutOfStock
                ? 'bg-[var(--md-error-container)]/25 hover:bg-[var(--md-error-container)]/35'
                : 'bg-[var(--md-warning-container)]/25 hover:bg-[var(--md-warning-container)]/35'
              : !isRead
              ? 'bg-[var(--md-surface-container-high)]/60 hover:bg-[var(--md-surface-container-high)]'
              : 'hover:bg-[var(--md-surface-container-low)]';

            const iconBoxToneClass = isStockAlert
              ? isOutOfStock
                ? 'bg-[var(--md-error-container)] border-[var(--md-error)]/35'
                : 'bg-[var(--md-warning-container)] border-[var(--md-warning)]/35'
              : 'bg-[var(--md-surface-container-low)] border-[var(--md-outline-variant)]';

            const formattedDate = item.created_at
              ? new Date(item.created_at).toLocaleString('ar-YE')
              : '';

            return (
              <div
                key={item.id}
                className={`p-4 flex items-start justify-between gap-4 transition-colors ${rowToneClass}`}
              >
                <div className="flex items-start gap-3 min-w-0">
                  <div className={`p-2.5 rounded-xl border mt-0.5 shrink-0 ${iconBoxToneClass}`}>
                    {getIcon(item.type, isOutOfStock)}
                  </div>
                  <div className="space-y-1.5 min-w-0">
                    <div className="flex items-center flex-wrap gap-2">
                      <span className="text-sm font-bold text-[var(--md-on-surface)]">{item.title}</span>
                      {isStockAlert && (
                        <span className={`m3-badge ${isOutOfStock ? 'm3-badge-error' : 'm3-badge-warning'}`}>
                          {isOutOfStock ? 'نفد المخزون' : 'مخزون منخفض'}
                        </span>
                      )}
                      {!isRead && (
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

                    {hasStockMeta && (
                      <div className="flex items-center flex-wrap gap-2 pt-0.5">
                        <span
                          className={`m3-badge font-mono tabular-nums ${
                            isOutOfStock ? 'm3-badge-error' : 'm3-badge-warning'
                          }`}
                        >
                          {remQty <= 0
                            ? `المتبقي: 0 ${unit} (نفد بالكامل)`
                            : `المتبقي: ${formatNumber(remQty)} ${unit} فقط`}
                        </span>
                        <span className="m3-badge font-mono tabular-nums">
                          {isCustomThreshold ? 'حد التنبيه المخصص' : 'حد التنبيه'}: {formatNumber(minThreshold)} {unit}
                        </span>
                      </div>
                    )}

                    {formattedDate && (
                      <div className="text-[11px] text-[var(--md-on-surface-variant)] font-mono tabular-nums">
                        {formattedDate}
                      </div>
                    )}
                  </div>
                </div>

                {!isRead && (
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
            );
          })
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
