import React, { useState, useEffect } from 'react';
import {
  LayoutDashboard,
  ShoppingCart,
  FileText,
  ShoppingBag,
  Users,
  Truck,
  Package,
  CreditCard,
  DollarSign,
  BookOpen,
  BarChart3,
  Sparkles,
  Bot,
  ScanText,
  MessageSquare,
  Bell,
  UserCheck,
  Shield,
  Zap,
  Building2,
  Activity,
  Database,
  History,
  Code2,
  CheckCircle2,
  Layers,
  TrendingUp,
  ChevronDown,
  PanelRightClose,
  PanelRight,
  Fuel,
  Sun,
  Moon,
} from 'lucide-react';
import { AppIcon } from './Common/AppIcon';
import { useModuleSettings } from '../context/ModuleSettingsContext';
import { CURRENT_APP_VERSION, normalizeVersionString } from '../services/updaterService';

export type TabType =
  | 'overview'
  | 'production_data_init'
  | 'whatsapp'
  | 'financial_intelligence'
  | 'real_business'
  | 'customer_success'
  | 'reports'
  | 'cashflow_forecast'
  | 'notifications'
  | 'ai'
  | 'ocr'
  | 'customers'
  | 'suppliers'
  | 'products'
  | 'pos'
  | 'invoices'
  | 'purchase_invoices'
  | 'payments'
  | 'expenses'
  | 'employees'
  | 'ledger'
  | 'inventory'
  | 'fuel_station'
  | 'users'
  | 'roles'
  | 'control_center'
  | 'subscription'
  | 'observability'
  | 'backups'
  | 'audit'
  | 'swagger'
  | 'production_verification'
  | 'test';

interface SidebarProps {
  activeTab: TabType;
  setActiveTab: (tab: TabType) => void;
  accentColor?: string;
}

interface NavSection {
  title: string;
  items: {
    id: TabType;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    badge?: string;
  }[];
}

export const Sidebar: React.FC<SidebarProps> = ({ activeTab, setActiveTab }) => {
  // 1. Overall Sidebar collapse state (expanded w-64 vs collapsed w-20)
  const [isCollapsed, setIsCollapsed] = useState<boolean>(() => {
    try {
      return localStorage.getItem('erp_sidebar_collapsed') === 'true';
    } catch {
      return false;
    }
  });

  // 2. Individual section collapse state
  const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>(() => {
    try {
      const saved = localStorage.getItem('erp_sidebar_sections');
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  const toggleSidebar = () => {
    setIsCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('erp_sidebar_collapsed', String(next));
      } catch {}
      return next;
    });
  };

  useEffect(() => {
    const handleToggleSidebar = () => toggleSidebar();
    const handleNavigateTab = (e: Event) => {
      const tab = (e as CustomEvent<{ tab?: TabType }>)?.detail?.tab;
      if (tab) setActiveTab(tab);
    };
    window.addEventListener('erp:toggle-sidebar', handleToggleSidebar);
    window.addEventListener('erp:navigate-tab', handleNavigateTab);
    return () => {
      window.removeEventListener('erp:toggle-sidebar', handleToggleSidebar);
      window.removeEventListener('erp:navigate-tab', handleNavigateTab);
    };
  }, [setActiveTab]);

  const toggleSection = (sectionTitle: string) => {
    setCollapsedSections((prev) => {
      const next = { ...prev, [sectionTitle]: !prev[sectionTitle] };
      try {
        localStorage.setItem('erp_sidebar_sections', JSON.stringify(next));
      } catch {}
      return next;
    });
  };

  // 3. Updater state & events
  const [appVersion, setAppVersion] = useState<string>(() => normalizeVersionString(CURRENT_APP_VERSION));
  const [hasUpdate, setHasUpdate] = useState<boolean>(false);
  const [availableVersion, setAvailableVersion] = useState<string>('');

  useEffect(() => {
    const handleStatusChanged = (e: any) => {
      if (e?.detail) {
        setHasUpdate(Boolean(e.detail.hasUpdate));
        if (e.detail.availableVersion) setAvailableVersion(normalizeVersionString(e.detail.availableVersion));
        if (e.detail.currentVersion) setAppVersion(normalizeVersionString(e.detail.currentVersion));
      }
    };
    const handleUpdateAvailable = (e: any) => {
      setHasUpdate(true);
      if (e?.detail?.availableVersion) setAvailableVersion(normalizeVersionString(e.detail.availableVersion));
      if (e?.detail?.currentVersion) setAppVersion(normalizeVersionString(e.detail.currentVersion));
    };

    window.addEventListener('erp-update-status-changed', handleStatusChanged);
    window.addEventListener('erp:update-available', handleUpdateAvailable);
    return () => {
      window.removeEventListener('erp-update-status-changed', handleStatusChanged);
      window.removeEventListener('erp:update-available', handleUpdateAvailable);
    };
  }, []);

  // 4. Theme state & listener
  const [sidebarTheme, setSidebarTheme] = useState<'dark' | 'light'>(() => {
    try {
      return (localStorage.getItem('erp_theme_mode') as 'dark' | 'light') || 'dark';
    } catch {
      return 'dark';
    }
  });

  useEffect(() => {
    const handleThemeChange = (e: any) => {
      const t = e.detail?.theme || e.detail;
      if (t === 'dark' || t === 'light') setSidebarTheme(t);
    };
    window.addEventListener('erp-theme-changed', handleThemeChange as EventListener);
    return () => window.removeEventListener('erp-theme-changed', handleThemeChange as EventListener);
  }, []);

  const toggleThemeFromSidebar = () => {
    const next = sidebarTheme === 'dark' ? 'light' : 'dark';
    setSidebarTheme(next);
    localStorage.setItem('erp_theme_mode', next);
    window.dispatchEvent(new CustomEvent('erp-theme-changed', { detail: { theme: next } }));
  };

  const sections: NavSection[] = [
    {
      title: 'الرئيسية',
      items: [
        { id: 'overview', label: 'لوحة التحكم', icon: LayoutDashboard },
        { id: 'real_business', label: 'مركز عمليات الأعمال والبيانات التشغيلية', icon: TrendingUp, badge: 'تشغيل' },
        { id: 'notifications', label: 'التنبيهات', icon: Bell },
      ],
    },
    {
      title: 'المبيعات ونقاط البيع',
      items: [
        { id: 'pos', label: 'الكاشير السريع (POS)', icon: ShoppingCart, badge: 'سريع' },
        { id: 'invoices', label: 'فواتير المبيعات', icon: FileText },
        { id: 'customers', label: 'العملاء والمدينون', icon: Users },
      ],
    },
    {
      title: 'المشتريات والمخزون',
      items: [
        { id: 'purchase_invoices', label: 'فواتير المشتريات', icon: ShoppingBag },
        { id: 'suppliers', label: 'الموردين والدائنون', icon: Truck },
        { id: 'products', label: 'الأصناف والأسعار', icon: Package },
        { id: 'inventory', label: 'حركة المخزون', icon: Layers },
        { id: 'fuel_station', label: 'محطة الغاز والوقود (العدادات والخزانات)', icon: Fuel, badge: 'عدادات' },
      ],
    },
    {
      title: 'الخزينة والحسابات والضرائب',
      items: [
        { id: 'payments', label: 'الخزينة وسندات القبض والصرف', icon: CreditCard },
        { id: 'expenses', label: 'المصروفات والتكاليف التشغيلية', icon: DollarSign, badge: 'تكاليف' },
        { id: 'employees', label: 'الموظفين والرواتب والسلف', icon: UserCheck, badge: 'رواتب' },
        { id: 'ledger', label: 'دليل الحسابات ودفتر الأستاذ', icon: BookOpen },
        { id: 'reports', label: 'الضرائب والتقارير المالية', icon: BarChart3 },
        { id: 'financial_intelligence', label: 'القوائم المالية والذكاء المحاسبي', icon: TrendingUp },
        { id: 'cashflow_forecast', label: 'التنبؤ الذكي بالسيولة', icon: Sparkles, badge: 'AI' },
      ],
    },
    {
      title: 'الذكاء الاصطناعي والتواصل',
      items: [
        { id: 'ai', label: 'المساعد المالي الذكي', icon: Bot, badge: 'Gemini' },
        { id: 'ocr', label: 'المسح الضوئي للفواتير', icon: ScanText, badge: 'OCR' },
        { id: 'whatsapp', label: 'مركز واتساب التجاري', icon: MessageSquare },
      ],
    },
    {
      title: 'إدارة الأعمال والموظفين',
      items: [
        { id: 'customer_success', label: 'خدمة ورضا العملاء', icon: Users },
        { id: 'users', label: 'فريق العمل والموظفين', icon: UserCheck },
        { id: 'roles', label: 'الصلاحيات والأدوار', icon: Shield },
        { id: 'control_center', label: 'مركز تحكم المنشأة', icon: Building2 },
        { id: 'subscription', label: 'الباقة والترقيات', icon: Zap },
      ],
    },
    {
      title: 'الأمان والتشغيل',
      items: [
        { id: 'observability', label: 'صحة ومراقبة النظام', icon: Activity },
        { id: 'backups', label: 'النسخ الاحتياطي (DR)', icon: Database },
        { id: 'audit', label: 'سجل العمليات والأمان', icon: History },
        { id: 'swagger', label: 'واجهات برمجة API', icon: Code2 },
        { id: 'test', label: 'منصة الاختبارات', icon: CheckCircle2 },
      ],
    },
  ];

  const { settings } = useModuleSettings();
  const hiddenTabs = settings?.hiddenSidebarTabs || [];

  const visibleSections = sections
    .map((section) => ({
      ...section,
      items: section.items.filter((item) => !hiddenTabs.includes(item.id)),
    }))
    .filter((section) => section.items.length > 0);

  return (
    <aside
      className={`bg-[var(--md-surface-container-low)] border-l border-[var(--md-outline-variant)] flex flex-col h-full flex-shrink-0 select-none z-20 transition-[width] duration-200 ease-out ${
        isCollapsed ? 'w-20' : 'w-64 lg:w-[272px]'
      }`}
    >
      {/* Brand Header & Toggle */}
      <div
        className={`h-16 flex items-center border-b border-[var(--md-outline-variant)] bg-[var(--md-surface-container-low)] ${
          isCollapsed ? 'justify-center px-2 flex-col py-2 gap-1' : 'justify-between px-4'
        }`}
      >
        <div className="flex items-center gap-3 min-w-0">
          <AppIcon className="w-8 h-8 shrink-0" />
          {!isCollapsed && (
            <div className="flex flex-col min-w-0">
              <span className="font-bold text-sm text-[var(--md-on-surface)] tracking-tight truncate">
                نظام المحاسبي الذكي ERP
              </span>
              <span className="text-[11px] text-[var(--md-secondary)] font-semibold truncate">
                Smart Accounting & ERP
              </span>
            </div>
          )}
        </div>

        <button
          type="button"
          onClick={toggleSidebar}
          className="m3-btn-text p-2 min-h-[36px] shrink-0"
          title={isCollapsed ? 'توسيع القائمة الجانبية (Expand Sidebar)' : 'طي القائمة الجانبية (Collapse Sidebar)'}
          aria-label={isCollapsed ? 'توسيع القائمة' : 'طي القائمة'}
        >
          {isCollapsed ? (
            <PanelRight className="w-5 h-5 text-[var(--md-primary)]" />
          ) : (
            <PanelRightClose className="w-4 h-4 text-[var(--md-on-surface-variant)]" />
          )}
        </button>
      </div>

      {/* Navigation Drawer Links */}
      <nav aria-label="التنقل الرئيسي" className="flex-1 overflow-y-auto px-3 py-3 space-y-4 custom-scrollbar">
        {visibleSections.map((section, idx) => {
          const isSectionCollapsed = Boolean(collapsedSections[section.title]);
          const hasActiveItem = section.items.some((item) => item.id === activeTab);

          return (
            <div key={section.title} className="space-y-1">
              {!isCollapsed ? (
                <button
                  type="button"
                  onClick={() => toggleSection(section.title)}
                  className={`w-full flex items-center justify-between text-[11px] font-bold tracking-wide px-3 py-1.5 rounded-lg transition-colors cursor-pointer group ${
                    hasActiveItem
                      ? 'text-[var(--md-primary)]'
                      : 'text-[var(--md-on-surface-variant)] hover:text-[var(--md-on-surface)] hover:bg-[var(--md-surface-container-high)]'
                  }`}
                  title={isSectionCollapsed ? 'فرد هذا القسم' : 'طي هذا القسم'}
                >
                  <span className="truncate">{section.title}</span>
                  <ChevronDown
                    className={`w-3.5 h-3.5 text-[var(--md-on-surface-variant)] transition-transform duration-150 ${
                      isSectionCollapsed ? '-rotate-90' : 'rotate-0'
                    }`}
                  />
                </button>
              ) : (
                idx > 0 && <div className="h-px bg-[var(--md-outline-variant)] my-2 mx-2" />
              )}

              {/* Items List */}
              {(!isSectionCollapsed || isCollapsed) && (
                <div className="space-y-1">
                  {section.items.map((item) => {
                    const Icon = item.icon;
                    const isActive = activeTab === item.id;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => setActiveTab(item.id)}
                        title={item.label}
                        aria-current={isActive ? 'page' : undefined}
                        className={`m3-nav-item group ${
                          isCollapsed ? 'justify-center px-2 py-2' : 'justify-between px-3 py-2'
                        } ${isActive ? 'm3-nav-item-active' : ''}`}
                      >
                        {/* Active Pill Side Accent for Non-Color State Signaling */}
                        {isActive && !isCollapsed && (
                          <span
                            aria-hidden="true"
                            className="absolute right-1.5 top-1/2 -translate-y-1/2 w-1 h-5 rounded-full bg-[var(--md-secondary)]"
                          />
                        )}

                        <div
                          className={`flex items-center min-w-0 ${
                            isCollapsed ? 'justify-center' : 'gap-3 pr-1'
                          }`}
                        >
                          <Icon
                            className={`w-4 h-4 shrink-0 transition-colors ${
                              isActive
                                ? 'text-[var(--md-on-primary-container)]'
                                : 'text-[var(--md-on-surface-variant)] group-hover:text-[var(--md-on-surface)]'
                            }`}
                          />
                          {!isCollapsed && <span className="truncate">{item.label}</span>}
                        </div>

                        {!isCollapsed && item.badge && (
                          <span
                            className="m3-badge shrink-0"
                            style={
                              isActive
                                ? {
                                    backgroundColor: 'var(--md-primary)',
                                    color: 'var(--md-on-primary)',
                                    borderColor: 'transparent',
                                  }
                                : undefined
                            }
                          >
                            {item.badge}
                          </span>
                        )}

                        {isCollapsed && item.badge && (
                          <span
                            aria-hidden="true"
                            className="absolute top-1.5 right-2 w-1.5 h-1.5 rounded-full bg-[var(--md-secondary)]"
                          />
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </nav>

      {/* Footer status & Controls */}
      <div className="p-3 border-t border-[var(--md-outline-variant)] bg-[var(--md-surface-container-low)] space-y-2">
        {!isCollapsed ? (
          <>
            <button
              type="button"
              onClick={() => window.dispatchEvent(new CustomEvent('erp:open-updater-modal'))}
              className="m3-btn-outlined w-full justify-between px-3 text-xs"
              style={
                hasUpdate
                  ? {
                      backgroundColor: 'var(--md-secondary-container)',
                      borderColor: 'var(--md-secondary)',
                      color: 'var(--md-on-secondary-container)',
                    }
                  : undefined
              }
              title="فتح مركز التحديثات التلقائية المعتمدة"
            >
              <div className="flex items-center gap-2 min-w-0">
                <Sparkles
                  className="w-3.5 h-3.5 shrink-0"
                  style={{ color: hasUpdate ? 'var(--md-secondary)' : 'var(--md-primary)' }}
                />
                <span className="font-semibold truncate">
                  {hasUpdate ? `تحديث v${availableVersion}` : 'إصدار النظام'}
                </span>
              </div>
              <span className="m3-badge font-mono">v{appVersion}</span>
            </button>

            {/* Theme Mode Toggle in Sidebar */}
            <button
              type="button"
              onClick={toggleThemeFromSidebar}
              className="m3-btn-outlined w-full justify-between px-3 text-xs"
              title="تبديل مظهر النظام بين الوضع الليلي والوضع الفاتح"
            >
              <div className="flex items-center gap-2">
                {sidebarTheme === 'dark' ? (
                  <Sun className="w-3.5 h-3.5" style={{ color: 'var(--md-secondary)' }} />
                ) : (
                  <Moon className="w-3.5 h-3.5" style={{ color: 'var(--md-primary)' }} />
                )}
                <span className="font-semibold">مظهر النظام</span>
              </div>
              <span
                className="m3-badge"
                style={{
                  backgroundColor: 'var(--md-primary-container)',
                  color: 'var(--md-on-primary-container)',
                  borderColor: 'transparent',
                }}
              >
                {sidebarTheme === 'dark' ? 'الوضع المظلم' : 'الوضع الفاتح'}
              </span>
            </button>

            <div className="flex items-center justify-between text-xs px-3 py-2 rounded-xl bg-[var(--md-surface-container)] border border-[var(--md-outline-variant)]">
              <div className="flex items-center gap-2">
                <span
                  className="w-2 h-2 rounded-full shrink-0"
                  style={{ backgroundColor: 'var(--md-success)' }}
                />
                <span className="text-[var(--md-on-surface)] font-medium">PostgreSQL: نشط</span>
              </div>
              <span className="text-[11px] text-[var(--md-on-surface-variant)] font-mono">
                B2 DR Ready
              </span>
            </div>
          </>
        ) : (
          <div className="space-y-2 flex flex-col items-center">
            <button
              type="button"
              onClick={toggleThemeFromSidebar}
              className="m3-btn-outlined w-full p-2 justify-center"
              title={sidebarTheme === 'dark' ? 'التحويل إلى الوضع الفاتح' : 'التحويل إلى الوضع المظلم'}
              aria-label="تبديل مظهر النظام"
            >
              {sidebarTheme === 'dark' ? (
                <Sun className="w-4 h-4" style={{ color: 'var(--md-secondary)' }} />
              ) : (
                <Moon className="w-4 h-4" style={{ color: 'var(--md-primary)' }} />
              )}
            </button>
            <button
              type="button"
              onClick={() => window.dispatchEvent(new CustomEvent('erp:open-updater-modal'))}
              className="m3-btn-outlined w-full p-2 justify-center relative"
              title={hasUpdate ? `تحديث جديد v${availableVersion} متاح - اضغط للترقية` : `الإصدار المثبت v${appVersion}`}
              aria-label="مركز التحديثات"
            >
              <Sparkles
                className="w-4 h-4"
                style={{ color: hasUpdate ? 'var(--md-secondary)' : 'var(--md-on-surface-variant)' }}
              />
              {hasUpdate && (
                <span
                  aria-hidden="true"
                  className="absolute top-1.5 right-2 w-2 h-2 rounded-full bg-[var(--md-secondary)]"
                />
              )}
            </button>
            <div
              className="w-full h-9 flex items-center justify-center rounded-xl bg-[var(--md-surface-container)] border border-[var(--md-outline-variant)]"
              title="PostgreSQL متصل • النسخ B2 جاهز"
            >
              <span
                className="w-2.5 h-2.5 rounded-full"
                style={{ backgroundColor: 'var(--md-success)' }}
              />
            </div>
          </div>
        )}
      </div>
    </aside>
  );
};
