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
} from 'lucide-react';
import { AppIcon } from './Common/AppIcon';
import { useModuleSettings } from '../context/ModuleSettingsContext';

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
  | 'ledger'
  | 'inventory'
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

  const toggleSection = (sectionTitle: string) => {
    setCollapsedSections((prev) => {
      const next = { ...prev, [sectionTitle]: !prev[sectionTitle] };
      try {
        localStorage.setItem('erp_sidebar_sections', JSON.stringify(next));
      } catch {}
      return next;
    });
  };

  const sections: NavSection[] = [
    {
      title: 'الرئيسية',
      items: [
        { id: 'overview', label: 'لوحة التحكم', icon: LayoutDashboard },
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
      ],
    },
    {
      title: 'الخزينة والحسابات والضرائب',
      items: [
        { id: 'payments', label: 'الخزينة وسندات القبض والصرف', icon: CreditCard },
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
        { id: 'real_business', label: 'العمليات التشغيلية', icon: TrendingUp },
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
      className={`bg-slate-900 border-l border-slate-800 flex flex-col h-full flex-shrink-0 select-none z-20 transition-all duration-300 ease-in-out ${
        isCollapsed ? 'w-20' : 'w-64'
      }`}
    >
      {/* Brand Header & Toggle */}
      <div
        className={`h-16 flex items-center border-b border-slate-800 bg-slate-900/40 transition-all ${
          isCollapsed ? 'justify-center px-2 flex-col py-2 gap-1' : 'justify-between px-4'
        }`}
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <AppIcon className="w-8 h-8 text-indigo-400 shrink-0" />
          {!isCollapsed && (
            <div className="flex flex-col min-w-0">
              <span className="font-bold text-sm text-white tracking-wide truncate">نظام السحابي ERP</span>
              <span className="text-[10px] text-indigo-400 font-medium tracking-tight truncate">Enterprise ERP SaaS</span>
            </div>
          )}
        </div>

        <button
          type="button"
          onClick={toggleSidebar}
          className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-all cursor-pointer shrink-0"
          title={isCollapsed ? 'توسيع القائمة الجانبية (Expand Sidebar)' : 'طي القائمة الجانبية (Collapse Sidebar)'}
          aria-label={isCollapsed ? 'توسيع القائمة' : 'طي القائمة'}
        >
          {isCollapsed ? (
            <PanelRight className="w-5 h-5 text-indigo-400" />
          ) : (
            <PanelRightClose className="w-4 h-4" />
          )}
        </button>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 overflow-y-auto p-2 space-y-3 custom-scrollbar">
        {visibleSections.map((section, idx) => {
          const isSectionCollapsed = Boolean(collapsedSections[section.title]);
          const hasActiveItem = section.items.some((item) => item.id === activeTab);

          return (
            <div key={section.title} className="space-y-1">
              {!isCollapsed ? (
                // Collapsible Section Header in Expanded Mode
                <button
                  type="button"
                  onClick={() => toggleSection(section.title)}
                  className={`w-full flex items-center justify-between text-[11px] font-semibold uppercase tracking-wider px-2.5 py-1.5 rounded-lg transition-colors cursor-pointer group ${
                    hasActiveItem
                      ? 'text-indigo-300 bg-indigo-950/30'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
                  }`}
                  title={isSectionCollapsed ? 'فرد هذا القسم' : 'طي هذا القسم'}
                >
                  <span className="truncate">{section.title}</span>
                  <ChevronDown
                    className={`w-3.5 h-3.5 text-slate-500 group-hover:text-slate-300 transition-transform duration-200 ${
                      isSectionCollapsed ? '-rotate-90' : 'rotate-0'
                    }`}
                  />
                </button>
              ) : (
                // Subtle divider in Collapsed Mode
                idx > 0 && <div className="h-px bg-slate-800/80 my-2 mx-1" />
              )}

              {/* Items List (Hidden if section is collapsed in expanded mode) */}
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
                        className={`w-full flex items-center rounded-xl text-sm font-medium transition-all group cursor-pointer relative ${
                          isCollapsed
                            ? 'justify-center p-2.5'
                            : 'justify-between px-3 py-2'
                        } ${
                          isActive
                            ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30'
                            : 'text-slate-300 hover:bg-slate-800/60 hover:text-white'
                        }`}
                      >
                        <div className={`flex items-center min-w-0 ${isCollapsed ? 'justify-center' : 'gap-3'}`}>
                          <Icon
                            className={`w-4 h-4 shrink-0 transition-transform ${
                              isActive ? 'text-white' : 'text-slate-400 group-hover:text-slate-200'
                            } ${isCollapsed && 'group-hover:scale-110'}`}
                          />
                          {!isCollapsed && <span className="truncate">{item.label}</span>}
                        </div>

                        {!isCollapsed && item.badge && (
                          <span
                            className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold shrink-0 ${
                              isActive
                                ? 'bg-indigo-700 text-white'
                                : 'bg-slate-800 text-indigo-400 border border-indigo-500/20'
                            }`}
                          >
                            {item.badge}
                          </span>
                        )}

                        {isCollapsed && item.badge && (
                          <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-indigo-500 ring-2 ring-slate-900" />
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

      {/* Footer status */}
      <div className="p-2.5 border-t border-slate-800 bg-slate-900/60">
        {!isCollapsed ? (
          <div className="flex items-center justify-between text-xs px-2.5 py-1.5 bg-slate-800/50 rounded-xl">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-slate-300 font-medium">PostgreSQL: نشط</span>
            </div>
            <span className="text-[10px] text-slate-400 font-mono">B2 DR Ready</span>
          </div>
        ) : (
          <div
            className="flex items-center justify-center p-2 bg-slate-800/50 rounded-xl text-center"
            title="PostgreSQL متصل • النسخ B2 جاهز"
          >
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
          </div>
        )}
      </div>
    </aside>
  );
};
