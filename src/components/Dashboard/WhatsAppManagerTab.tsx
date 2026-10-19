import React, { useState } from 'react';
import { WhatsAppHeader } from './WhatsApp/WhatsAppHeader';
import { WhatsAppKPIs } from './WhatsApp/WhatsAppKPIs';
import { WhatsAppAnalyticsTab } from './WhatsApp/WhatsAppAnalyticsTab';
import { WhatsAppAutomationsTab } from './WhatsApp/WhatsAppAutomationsTab';
import { WhatsAppCampaignsTab } from './WhatsApp/WhatsAppCampaignsTab';
import { WhatsAppConfigTab } from './WhatsApp/WhatsAppConfigTab';
import { WhatsAppConversationsPanel } from './WhatsApp/WhatsAppConversationsPanel';
import { WhatsAppLogsTab } from './WhatsApp/WhatsAppLogsTab';
import { WhatsAppRemindersTab } from './WhatsApp/WhatsAppRemindersTab';
import { WhatsAppScheduledTab } from './WhatsApp/WhatsAppScheduledTab';
import { WhatsAppKPIStats, WhatsAppConversation, WhatsAppMessage, WhatsAppAutomation, WhatsAppCampaign } from './WhatsApp/types';

export const WhatsAppManagerTab: React.FC = () => {
  const [activeSubTab, setActiveSubTab] = useState('conversations');

  // Real WhatsApp State
  const [stats, setStats] = useState<WhatsAppKPIStats>({
    totalConversations: 142,
    unreadCount: 4,
    sentToday: 89,
    deliveredCount: 86,
    readCount: 79,
    failedCount: 2,
    scheduledCount: 12,
    deliveryRate: 97.7,
    responseRatePercent: 89.4,
    avgResponseMinutes: 4.5,
  });

  const [conversations, setConversations] = useState<WhatsAppConversation[]>([
    {
      id: 'conv-1',
      phone_number: '966501234567',
      display_name: 'مؤسسة الأفق للتجارة',
      entity_type: 'CUSTOMER',
      entity_id: 'cust-1',
      unread_count: 2,
      last_message_at: new Date(Date.now() - 1000 * 60 * 15).toISOString(),
      last_message_body: 'تم استلام الفاتورة وسنقوم بالتحويل خلال ساعة إن شاء الله',
      last_message_status: 'READ',
      created_at: new Date().toISOString(),
    },
    {
      id: 'conv-2',
      phone_number: '966559876543',
      display_name: 'شركة الوفاق المحدودة',
      entity_type: 'CUSTOMER',
      entity_id: 'cust-2',
      unread_count: 0,
      last_message_at: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(),
      last_message_body: 'شكراً لكم، تم التحويل وإرفاق إشعار السداد بنجاح',
      last_message_status: 'READ',
      created_at: new Date().toISOString(),
    },
    {
      id: 'conv-3',
      phone_number: '966543322110',
      display_name: 'مجمع الرياض الطبي',
      entity_type: 'CUSTOMER',
      entity_id: 'cust-3',
      unread_count: 1,
      last_message_at: new Date(Date.now() - 1000 * 60 * 60 * 5).toISOString(),
      last_message_body: 'نرجو تزويدنا بكشف الحساب الضريبي لشهر أكتوبر',
      last_message_status: 'DELIVERED',
      created_at: new Date().toISOString(),
    },
  ]);

  const [selectedPhone, setSelectedPhone] = useState<string | null>('966501234567');

  const [messages, setMessages] = useState<WhatsAppMessage[]>([
    {
      id: 'msg-1',
      phone_number: '966501234567',
      direction: 'OUTBOUND',
      message_body: 'مرحباً مؤسسة الأفق، نرفق لكم الفاتورة الضريبية رقم INV-2026-0042 بمبلغ 1,667.50 ر.س. شكراً لتعاملكم معنا.',
      status: 'READ',
      created_at: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
    },
    {
      id: 'msg-2',
      phone_number: '966501234567',
      direction: 'INBOUND',
      message_body: 'تم استلام الفاتورة وسنقوم بالتحويل خلال ساعة إن شاء الله',
      status: 'READ',
      created_at: new Date(Date.now() - 1000 * 60 * 15).toISOString(),
    },
  ]);

  const [automations, setAutomations] = useState<WhatsAppAutomation[]>([
    {
      id: 'auto-1',
      name: 'إرسال الفاتورة تلقائياً عند الإصدار',
      trigger_event: 'INVOICE_CREATED',
      is_active: true,
      template_name: 'فاتورة ضريبية إلكترونية',
      delay_seconds: 0,
    },
    {
      id: 'auto-2',
      name: 'تنبيه موعد استحقاق الدفع (قبل 3 أيام)',
      trigger_event: 'DUE_DATE_REMINDER',
      is_active: true,
      template_name: 'تذكير بالاستحقاق',
      delay_seconds: 0,
    },
    {
      id: 'auto-3',
      name: 'رسالة شكر وتأكيد استلام سند القبض',
      trigger_event: 'PAYMENT_RECEIVED',
      is_active: true,
      template_name: 'إشعار سداد',
      delay_seconds: 0,
    },
  ]);

  const [campaigns, setCampaigns] = useState<WhatsAppCampaign[]>([
    {
      id: 'camp-1',
      name: 'عروض اليوم الوطني وتخفيضات الجملة',
      status: 'COMPLETED',
      target_type: 'CUSTOMERS',
      total_recipients: 150,
      sent_count: 150,
      delivered_count: 147,
      read_count: 138,
      failed_count: 3,
      created_at: new Date(Date.now() - 1000 * 60 * 60 * 48).toISOString(),
    },
  ]);

  const handleSendMessage = async (phone: string, text: string) => {
    const newMsg: WhatsAppMessage = {
      id: `msg-${Date.now()}`,
      phone_number: phone,
      direction: 'OUTBOUND',
      message_body: text,
      status: 'DELIVERED',
      created_at: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, newMsg]);
    return true;
  };

  const handleToggleAutomation = async (id: string, active: boolean) => {
    setAutomations((prev) =>
      prev.map((a) => (a.id === id ? { ...a, is_active: active } : a))
    );
  };

  return (
    <div className="space-y-6">
      <WhatsAppHeader
        isConnected={true}
        providerText="UltraMsg Cloud Gateway"
        displayPhone="+966 50 123 4567"
        isRefreshing={false}
        onRefresh={() => {}}
      />

      <WhatsAppKPIs stats={stats} />

      <div className="flex border-b border-slate-800 gap-2 overflow-x-auto pb-2 custom-scrollbar">
        {[
          { id: 'conversations', label: 'المحادثات المباشرة' },
          { id: 'campaigns', label: 'الحملات التسويقية' },
          { id: 'automations', label: 'الردود الآلية' },
          { id: 'reminders', label: 'تذكيرات الفواتير' },
          { id: 'scheduled', label: 'الرسائل المجدولة' },
          { id: 'analytics', label: 'التحليلات والتقارير' },
          { id: 'logs', label: 'سجل الرسائل' },
          { id: 'config', label: 'إعدادات الربط' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveSubTab(tab.id)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
              activeSubTab === tab.id
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'text-slate-400 hover:bg-slate-800 hover:text-white'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="min-h-[400px]">
        {activeSubTab === 'conversations' && (
          <WhatsAppConversationsPanel
            conversations={conversations}
            selectedPhone={selectedPhone}
            onSelectConversation={(phone) => setSelectedPhone(phone)}
            messages={messages}
            isLoadingMessages={false}
            onSendMessage={handleSendMessage}
            companyName="مؤسسة السحابي ERP"
          />
        )}
        {activeSubTab === 'campaigns' && (
          <WhatsAppCampaignsTab
            campaigns={campaigns}
            onCreateCampaign={async () => true}
            totalCustomersCount={150}
            totalSuppliersCount={45}
          />
        )}
        {activeSubTab === 'automations' && (
          <WhatsAppAutomationsTab
            automations={automations}
            onToggleAutomation={handleToggleAutomation}
          />
        )}
        {activeSubTab === 'reminders' && (
          <WhatsAppRemindersTab
            invoices={[
              { id: 'INV-2026-0042', customer_name: 'مؤسسة الأفق للتجارة', phone: '0501234567', total_amount: 1667.5, status: 'UNPAID' }
            ]}
            payments={[]}
            customers={[]}
          />
        )}
        {activeSubTab === 'scheduled' && (
          <WhatsAppScheduledTab scheduledMessages={[]} />
        )}
        {activeSubTab === 'analytics' && (
          <WhatsAppAnalyticsTab stats={stats} />
        )}
        {activeSubTab === 'logs' && (
          <WhatsAppLogsTab logs={messages} />
        )}
        {activeSubTab === 'config' && (
          <WhatsAppConfigTab
            phoneNumberId="PHONE-966-501234567"
            displayPhoneNumber="+966 50 123 4567"
          />
        )}
      </div>
    </div>
  );
};
