import React, { useState, useEffect, useRef } from 'react';
import {
  MessageSquare,
  Search,
  Send,
  Paperclip,
  Sparkles,
  Smile,
  Check,
  CheckCheck,
  Clock,
  AlertTriangle,
  FileText,
  CreditCard,
  Building,
  User,
  Phone,
  Calendar,
  DollarSign,
  ChevronRight,
  RefreshCw,
  ExternalLink,
  ShieldAlert,
  HelpCircle,
  Tag,
  ArrowDownLeft,
  ArrowUpRight,
  Flame,
  Info,
  Link,
  RotateCw,
  ShieldCheck,
  FileCheck,
  X,
  Trash2,
} from 'lucide-react';
import { WhatsAppConversation, WhatsAppMessage, WhatsAppERPContext, WhatsAppTemplate } from './types';

interface WhatsAppConversationsPanelProps {
  conversations?: WhatsAppConversation[];
  selectedPhone?: string | null;
  onSelectConversation?: (phone: string) => void;
  messages?: WhatsAppMessage[];
  isLoadingMessages?: boolean;
  onSendMessage?: (phone: string, text: string, meta?: any) => Promise<boolean>;
  onSendInvoiceReminder?: (invoiceId: string, phone: string) => Promise<boolean>;
  onSendPaymentReminder?: (paymentId: string, phone: string) => Promise<boolean>;
  onSendStatement?: (entityId: string, type: 'CUSTOMER' | 'SUPPLIER', phone: string) => Promise<boolean>;
  onRetryMessage?: (messageId: string) => Promise<boolean>;
  onLinkMessage?: (messageId: string, entityType: string, entityId: string) => Promise<boolean>;
  erpContext?: WhatsAppERPContext | null;
  isLoadingERPContext?: boolean;
  templates?: WhatsAppTemplate[];
  companyName?: string;
  onScheduleMessagePrompt?: (phone: string, text: string) => void;
  onSimulateReply?: (phone: string, text: string) => Promise<boolean>;
  onMarkAsRead?: (phone: string) => Promise<boolean>;
  onDeleteConversation?: (phone: string) => Promise<boolean>;
}

export const WhatsAppConversationsPanel: React.FC<WhatsAppConversationsPanelProps> = ({
  conversations = [],
  selectedPhone = null,
  onSelectConversation = (_phone: string) => {},
  messages = [],
  isLoadingMessages = false,
  onSendMessage = async (_phone: string, _text: string, _meta?: any) => true,
  onSendInvoiceReminder = async (_invoiceId: string, _phone: string) => true,
  onSendPaymentReminder = async (_paymentId: string, _phone: string) => true,
  onSendStatement = async (_entityId: string, _type: 'CUSTOMER' | 'SUPPLIER', _phone: string) => true,
  onRetryMessage = async (_messageId: string) => true,
  onLinkMessage = async (_messageId: string, _entityType: string, _entityId: string) => true,
  erpContext = null,
  isLoadingERPContext = false,
  templates = [],
  companyName = 'نظام المحاسبي الذكي ERP',
  onScheduleMessagePrompt = (_phone: string, _text: string) => {},
  onSimulateReply = async (_phone: string, _text: string) => true,
  onMarkAsRead = async (_phone: string) => true,
  onDeleteConversation = async (_phone: string) => true,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<'ALL' | 'CUSTOMERS' | 'SUPPLIERS' | 'UNREAD' | 'OVERDUE'>('ALL');
  const [messageInput, setMessageInput] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [showTemplatesMenu, setShowTemplatesMenu] = useState(false);
  const [showAttachmentMenu, setShowAttachmentMenu] = useState(false);
  const [validationWarning, setValidationWarning] = useState<string | null>(null);
  const [activeTabMobile, setActiveTabMobile] = useState<'LIST' | 'CHAT' | 'CONTEXT'>('LIST');

  // Retry & Link State
  const [retryingMessageId, setRetryingMessageId] = useState<string | null>(null);
  const [linkingMessage, setLinkingMessage] = useState<WhatsAppMessage | null>(null);
  const [linkEntityType, setLinkEntityType] = useState<'CUSTOMER' | 'SUPPLIER' | 'INVOICE' | 'PURCHASE_INVOICE' | 'PAYMENT'>('INVOICE');
  const [linkEntityId, setLinkEntityId] = useState('');
  const [isLinking, setIsLinking] = useState(false);
  const [selectedAttachment, setSelectedAttachment] = useState<any | null>(null);

  const messagesContainerRef = useRef<HTMLDivElement>(null);

  // Internal container scroll only when message count or active conversation changes (never scrolls outer page)
  useEffect(() => {
    if (messagesContainerRef.current) {
      messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
    }
  }, [messages.length, selectedPhone]);

  // Find active conversation
  const activeConversation = conversations.find(
    (c) => c.phone_number === selectedPhone || c.customer_phone === selectedPhone
  );

  // Filter conversations
  const filteredConversations = conversations.filter((c) => {
    const name = (c.customer_name || c.supplier_name || '').toLowerCase();
    const phone = (c.phone_number || '').toLowerCase();
    const acc = (c.customer_account_number || c.supplier_account_number || '').toLowerCase();
    const q = searchQuery.toLowerCase().trim();

    const matchesSearch = !q || name.includes(q) || phone.includes(q) || acc.includes(q);

    if (!matchesSearch) return false;

    if (filterType === 'CUSTOMERS') return !!c.customer_id || !!c.customer_name;
    if (filterType === 'SUPPLIERS') return !!c.supplier_id || !!c.supplier_name;
    if (filterType === 'UNREAD') return c.unread_count > 0;
    if (filterType === 'OVERDUE') {
      const bal = typeof c.customer_balance === 'string' ? parseFloat(c.customer_balance) : (c.customer_balance || 0);
      return bal > 0;
    }

    return true;
  });

  // Dynamic variable insertion helper
  const handleInsertVariable = (varName: string) => {
    setMessageInput((prev) => `${prev} {{${varName}}}`);
    setValidationWarning(null);
  };

  // Quick template application
  const handleApplyTemplate = (tmpl: WhatsAppTemplate) => {
    let resolvedText = tmpl.body;

    // Resolve available variables if context exists
    if (erpContext?.customer) {
      const cust = erpContext.customer;
      resolvedText = resolvedText
        .replace(/\{\{\s*customer_name\s*\}\}/g, cust.name || '')
        .replace(/\{\{\s*account_number\s*\}\}/g, cust.account_number || '')
        .replace(/\{\{\s*remaining_balance\s*\}\}/g, parseFloat(cust.current_balance || 0).toLocaleString('en-US'))
        .replace(/\{\{\s*company_name\s*\}\}/g, companyName || 'الشركة');
    }

    setMessageInput(resolvedText);
    setShowTemplatesMenu(false);
    setValidationWarning(null);
  };

  // AI draft assistant
  const handleGenerateAIDraft = (type: 'POLITE_REMINDER' | 'PAYMENT_THANKS' | 'STATEMENT_NOTICE') => {
    const custName = erpContext?.customer?.name || activeConversation?.customer_name || 'العميل الكريم';
    const balance = erpContext?.customer?.current_balance 
      ? parseFloat(erpContext.customer.current_balance).toLocaleString('en-US')
      : (activeConversation?.customer_balance ? parseFloat(String(activeConversation.customer_balance)).toLocaleString('en-US') : '0');

    if (type === 'POLITE_REMINDER') {
      setMessageInput(
        `السلام عليكم ورحمة الله، الأخ/الأخت ${custName} المحترم،\nنود تذكيركم بمستحقاتكم المالية البالغة ${balance} ر.ي. نرجو التكرم بالاطلاع والمبادرة بالسداد شاكرين تعاونكم الدائم معنا.`
      );
    } else if (type === 'PAYMENT_THANKS') {
      setMessageInput(
        `أهلاً بك ${custName}،\nنشكركم على سداد الدفعة المالية الموثقة بحسابكم. تم قيد المبلغ بنجاح وتحديث كشف الحساب. دمتم بخير.`
      );
    } else {
      setMessageInput(
        `الأخ ${custName} المحترم،\nمرفق لكم ملخص كشف الحساب المالي حتى تاريخ اليوم، رصيدكم الحالي هو ${balance} ر.ي. يرجى مراجعة الكشف وإفادتنا بالمطابقة.`
      );
    }
    setValidationWarning(null);
  };

  const handleQuickTemplate = (type: 'REMINDER' | 'STATEMENT' | 'PAYMENT' | 'INVOICE') => {
    const custName = erpContext?.customer?.name || activeConversation?.customer_name || (activeConversation as any)?.display_name || 'العميل الكريم';
    const balance = erpContext?.customer?.current_balance
      ? parseFloat(erpContext.customer.current_balance).toLocaleString('en-US')
      : (activeConversation?.customer_balance ? parseFloat(String(activeConversation.customer_balance)).toLocaleString('en-US') : '0');

    if (type === 'REMINDER') {
      setMessageInput(`مرحباً ${custName} المحترم،\nنود تذكيركم بمستحقاتكم المالية البالغة ${balance} ر.ي. نرجو التكرم بالاطلاع والمبادرة بالسداد شاكرين حسن تعاونكم الدائم معنا.\n— ${companyName}`);
    } else if (type === 'STATEMENT') {
      setMessageInput(`الأخ ${custName} المحترم،\nمرفق لكم كشف الحساب المالي حتى تاريخ ${new Date().toLocaleDateString('en-US')}.\nالرصيد المعتمد المستحق: ${balance} ر.ي.\nنأمل مراجعة العمليات واعتمادها.\n— ${companyName}`);
    } else if (type === 'PAYMENT') {
      setMessageInput(`أهلاً بك ${custName}،\nنشكركم على سداد الدفعة المالية الموثقة بحسابكم. تم قيد المبلغ بنجاح وتحديث الرصيد المتبقي ليصبح: ${balance} ر.ي.\nشكراً لتعاملكم الراقي.\n— ${companyName}`);
    } else if (type === 'INVOICE') {
      const invNum = erpContext?.recentInvoices?.[0]?.invoice_number || 'INV-2026-001';
      const invAmount = erpContext?.recentInvoices?.[0]?.total ? parseFloat(erpContext.recentInvoices[0].total).toLocaleString('en-US') : balance;
      setMessageInput(`الأخ ${custName} المحترم،\nنرفق لكم تفاصيل الفاتورة رقم #${invNum} بإجمالي ${invAmount} ر.ي. يرجى الاطلاع والتحويل على حسابنا المعتمد.\n— ${companyName}`);
    }
    setValidationWarning(null);
  };

  // Send message validation & dispatch
  const handleSend = async () => {
    if (!messageInput.trim() || !selectedPhone) return;

    // Check for unresolved {{placeholders}}
    const unresolvedMatches = messageInput.match(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g);
    if (unresolvedMatches && unresolvedMatches.length > 0) {
      setValidationWarning(`تنبيه: تحتوي الرسالة على متغيرات غير مستبدلة (${unresolvedMatches.join(', ')}). يرجى التأكد من استبدالها قبل الإرسال.`);
      return;
    }

    setIsSending(true);
    setValidationWarning(null);
    try {
      let ok = false;
      if (typeof onSendMessage === 'function') {
        ok = await onSendMessage(selectedPhone, messageInput.trim(), {
          customerId: activeConversation?.customer_id || erpContext?.customer?.id,
          supplierId: activeConversation?.supplier_id || erpContext?.supplier?.id,
          attachmentId: selectedAttachment?.id,
        });
      }
      if (ok) {
        setMessageInput('');
        setSelectedAttachment(null);
      }
    } finally {
      setIsSending(false);
    }
  };

  const handleRetry = async (msgId: string) => {
    if (typeof onRetryMessage !== 'function') return;
    setRetryingMessageId(msgId);
    try {
      await onRetryMessage(msgId);
    } finally {
      setRetryingMessageId(null);
    }
  };

  const handleExecuteLink = async () => {
    if (!linkingMessage || !linkEntityId.trim() || typeof onLinkMessage !== 'function') return;
    setIsLinking(true);
    try {
      const ok = await onLinkMessage(linkingMessage.id, linkEntityType, linkEntityId.trim());
      if (ok) {
        setLinkingMessage(null);
        setLinkEntityId('');
      }
    } finally {
      setIsLinking(false);
    }
  };

  return (
    <div id="whatsapp-3panel-container" dir="rtl" className="m3-card overflow-hidden flex flex-col lg:flex-row h-[780px]">
      
      {/* ========================================================================= */}
      {/* PANEL 1: CONVERSATION LIST (LEFT) */}
      {/* ========================================================================= */}
      <div
        id="whatsapp-panel-conversations-list"
        className={`w-full lg:w-80 xl:w-96 border-b lg:border-b-0 lg:border-l border-[var(--md-outline-variant)] flex flex-col bg-[var(--md-surface-container-low)] ${
          activeTabMobile !== 'LIST' ? 'hidden lg:flex' : 'flex'
        }`}
      >
        {/* Search & Filter Header */}
        <div className="p-3.5 border-b border-[var(--md-outline-variant)] bg-[var(--md-surface-container)] space-y-2.5">
          <div className="relative">
            <Search className="w-4 h-4 text-[var(--md-on-surface-variant)] absolute right-3 top-1/2 -translate-y-1/2" />
            <input
              id="input-search-conversations"
              type="text"
              placeholder="بحث بالاسم، الهاتف، أو الحساب..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="m3-input !h-9 !pr-9 !pl-3 text-xs"
            />
          </div>

          {/* Filter Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-[11px] font-bold scrollbar-none">
            <button
              onClick={() => setFilterType('ALL')}
              className={`!min-h-[28px] !px-2.5 !py-1 !rounded-lg text-[11px] whitespace-nowrap cursor-pointer tabular-nums ${
                filterType === 'ALL' ? 'm3-btn-primary' : 'm3-btn-outlined'
              }`}
            >
              الكل ({conversations.length})
            </button>
            <button
              onClick={() => setFilterType('CUSTOMERS')}
              className={`!min-h-[28px] !px-2.5 !py-1 !rounded-lg text-[11px] whitespace-nowrap cursor-pointer ${
                filterType === 'CUSTOMERS' ? 'm3-btn-primary' : 'm3-btn-outlined'
              }`}
            >
              عملاء
            </button>
            <button
              onClick={() => setFilterType('SUPPLIERS')}
              className={`!min-h-[28px] !px-2.5 !py-1 !rounded-lg text-[11px] whitespace-nowrap cursor-pointer ${
                filterType === 'SUPPLIERS' ? 'm3-btn-primary' : 'm3-btn-outlined'
              }`}
            >
              موردون
            </button>
            <button
              onClick={() => setFilterType('OVERDUE')}
              className={`!min-h-[28px] !px-2.5 !py-1 !rounded-lg text-[11px] whitespace-nowrap cursor-pointer ${
                filterType === 'OVERDUE'
                  ? 'm3-btn-tonal !bg-[var(--md-warning-container)] !text-[var(--md-on-warning-container)] border border-[var(--md-warning)]/40'
                  : 'm3-btn-outlined'
              }`}
            >
              متأخرون
            </button>
            <button
              onClick={() => setFilterType('UNREAD')}
              className={`!min-h-[28px] !px-2.5 !py-1 !rounded-lg text-[11px] whitespace-nowrap cursor-pointer ${
                filterType === 'UNREAD' ? 'm3-btn-primary' : 'm3-btn-outlined'
              }`}
            >
              غير مقروء
            </button>
          </div>
        </div>

        {/* Conversations Scrollable List */}
        <div className="flex-1 overflow-y-auto divide-y divide-[var(--md-outline-variant)]/70">
          {filteredConversations.length === 0 ? (
            <div className="p-8 text-center text-[var(--md-on-surface-variant)] space-y-2">
              <User className="w-8 h-8 mx-auto opacity-50" />
              <p className="text-xs font-semibold text-[var(--md-on-surface)]">لا توجد محادثات مطابقة</p>
              <p className="text-[11px] text-[var(--md-on-surface-variant)]">يمكنك بدء محادثة جديدة باستخدام زر "+ رسالة جديدة".</p>
            </div>
          ) : (
            filteredConversations.map((conv) => {
              const isSelected = selectedPhone === conv.phone_number || selectedPhone === conv.customer_phone;
              const name = conv.customer_name || conv.supplier_name || 'جهة اتصال';
              const isCustomer = !!conv.customer_id || !!conv.customer_name;
              const balance = conv.customer_balance || conv.supplier_balance || 0;
              const numBalance = typeof balance === 'string' ? parseFloat(balance) : balance;

              return (
                <div
                  key={conv.phone_number || conv.customer_phone}
                  id={`conv-item-${conv.phone_number}`}
                  onClick={() => {
                    onSelectConversation(conv.phone_number || conv.customer_phone || '');
                    setActiveTabMobile('CHAT');
                  }}
                  className={`p-3.5 cursor-pointer transition-all flex items-start gap-3 hover:bg-[var(--md-surface-container-high)]/60 ${
                    isSelected ? 'bg-[var(--md-primary-container)]/50 border-r-4 border-r-[var(--md-primary)]' : 'bg-transparent'
                  }`}
                >
                  {/* Avatar */}
                  <div className="relative shrink-0">
                    <div className="w-10 h-10 rounded-xl bg-[var(--md-surface-container-high)] border border-[var(--md-outline-variant)] text-[var(--md-on-surface)] flex items-center justify-center font-bold text-sm">
                      {name.slice(0, 2)}
                    </div>
                    {isCustomer ? (
                      <span className="absolute -bottom-1 -right-1 p-0.5 bg-[var(--md-primary)] rounded-full text-[var(--md-on-primary)]" title="عميل">
                        <User className="w-2.5 h-2.5" />
                      </span>
                    ) : (
                      <span className="absolute -bottom-1 -right-1 p-0.5 bg-[var(--md-info)] rounded-full text-white" title="مورد">
                        <Building className="w-2.5 h-2.5" />
                      </span>
                    )}
                  </div>

                  {/* Details */}
                  <div className="flex-1 min-w-0 space-y-1">
                    <div className="flex items-center justify-between gap-1">
                      <h4 className="text-xs font-bold text-[var(--md-on-surface)] truncate">{name}</h4>
                      <span className="text-[10px] text-[var(--md-on-surface-variant)] font-mono tabular-nums shrink-0">
                        {conv.last_message_time ? new Date(conv.last_message_time).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) : ''}
                      </span>
                    </div>

                    <p className="text-[11px] text-[var(--md-on-surface-variant)] truncate leading-tight">
                      {conv.last_direction === 'OUTBOUND' && <span className="font-semibold text-[var(--md-primary-text)]">أنت: </span>}
                      {conv.last_message || 'لا توجد رسائل سابقة'}
                    </p>

                    <div className="flex items-center justify-between gap-1 pt-0.5">
                      <span className="text-[10px] text-[var(--md-on-surface-variant)] font-mono tabular-nums" dir="ltr">
                        {conv.phone_number}
                      </span>

                      <div className="flex items-center gap-1">
                        {numBalance > 0 && (
                          <span className="m3-badge m3-badge-warning !px-1.5 !py-0.5 text-[9px] font-mono tabular-nums">
                            مستحق: {numBalance.toLocaleString('en-US')}
                          </span>
                        )}
                        {conv.unread_count > 0 && (
                          <span className="px-1.5 py-0.5 rounded-full bg-[var(--md-primary)] text-[var(--md-on-primary)] font-bold text-[10px] tabular-nums">
                            {conv.unread_count}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* PANEL 2: ACTIVE CONVERSATION & INTERACTIVE COMPOSER (CENTER) */}
      {/* ========================================================================= */}
      <div
        id="whatsapp-panel-active-chat"
        className={`flex-1 flex flex-col bg-[var(--md-surface)] border-b lg:border-b-0 lg:border-l border-[var(--md-outline-variant)] ${
          activeTabMobile !== 'CHAT' ? 'hidden lg:flex' : 'flex'
        }`}
      >
        {selectedPhone ? (
          <>
            {/* Conversation Header */}
            <div className="p-3.5 bg-[var(--md-surface-container)] border-b border-[var(--md-outline-variant)] flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <button
                  onClick={() => setActiveTabMobile('LIST')}
                  className="lg:hidden m3-btn-outlined !min-h-[32px] !p-1.5"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>

                <div className="w-9 h-9 rounded-xl bg-[var(--md-primary-container)] text-[var(--md-on-primary-container)] flex items-center justify-center font-bold text-xs border border-[var(--md-primary)]/30 shrink-0">
                  {(activeConversation?.customer_name || activeConversation?.supplier_name || 'WA').slice(0, 2)}
                </div>

                <div className="min-w-0">
                  <h3 className="text-sm font-bold text-[var(--md-on-surface)] flex items-center gap-2 flex-wrap">
                    <span className="truncate">{activeConversation?.customer_name || activeConversation?.supplier_name || 'محادثة مباشرة'}</span>
                    <span className="m3-badge m3-badge-primary text-[10px] font-bold">
                      {activeConversation?.customer_id ? 'عميل نشط' : (activeConversation?.supplier_id ? 'مورد' : 'جهة اتصال')}
                    </span>
                  </h3>
                  <p className="text-[11px] text-[var(--md-on-surface-variant)] font-mono tabular-nums flex items-center gap-2" dir="ltr">
                    <span>{selectedPhone}</span>
                    {activeConversation?.customer_account_number && (
                      <span className="text-[10px] opacity-80">#{activeConversation.customer_account_number}</span>
                    )}
                  </p>
                </div>
              </div>

              {/* Header Actions */}
              <div className="flex items-center gap-1.5 flex-wrap shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    if (!selectedPhone) return;
                    const defaultReply = 'وعليكم السلام، تم الاطلاع وجاري التحويل اليوم إن شاء الله.';
                    const replyText = window.prompt('أدخل نص الرد الوارد لاختبار استلام رسائل العملاء:', defaultReply);
                    if (replyText && typeof onSimulateReply === 'function') {
                      onSimulateReply(selectedPhone, replyText);
                    }
                  }}
                  className="m3-btn-tonal !min-h-[30px] !px-2.5 !py-1 !rounded-lg text-[11px] cursor-pointer"
                  title="محاكاة وصول رد وارد من العميل داخل النظام"
                >
                  <Sparkles className="w-3 h-3" />
                  <span className="hidden sm:inline">محاكاة رد وارد</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    if (selectedPhone && typeof onMarkAsRead === 'function') {
                      onMarkAsRead(selectedPhone);
                    }
                  }}
                  className="m3-btn-outlined !min-h-[30px] !px-2.5 !py-1 !rounded-lg text-[11px] cursor-pointer"
                  title="تعيين المحادثة كمقروءة"
                >
                  <CheckCheck className="w-3 h-3 text-[var(--md-info)]" />
                  <span className="hidden sm:inline">كمقروء</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    if (!selectedPhone) return;
                    if (window.confirm('هل أنت متأكد من حذف هذه المحادثة من قائمة المحادثات النشطة؟')) {
                      if (typeof onDeleteConversation === 'function') {
                        onDeleteConversation(selectedPhone);
                      }
                    }
                  }}
                  className="p-1.5 rounded-lg text-[var(--md-on-surface-variant)] hover:text-[var(--md-error)] hover:bg-[var(--md-error-container)] border border-[var(--md-outline-variant)] transition-colors cursor-pointer"
                  title="حذف المحادثة"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>

                {/* Header Context View Toggle (Mobile) */}
                <button
                  onClick={() => setActiveTabMobile('CONTEXT')}
                  className="lg:hidden m3-btn-tonal !min-h-[30px] !px-2.5 !py-1 text-xs"
                >
                  البيانات
                </button>
              </div>
            </div>

            {/* Messages Scroll View */}
            <div ref={messagesContainerRef} className="flex-1 overflow-y-auto p-4 space-y-3 bg-[var(--md-surface-container-lowest)]/40">
              {isLoadingMessages && messages.length === 0 ? (
                <div className="h-full flex items-center justify-center text-[var(--md-on-surface-variant)] space-y-2">
                  <RefreshCw className="w-6 h-6 animate-spin text-[var(--md-primary-text)]" />
                </div>
              ) : messages.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center p-6 text-[var(--md-on-surface-variant)] space-y-3">
                  <div className="w-12 h-12 rounded-2xl bg-[var(--md-primary-container)] text-[var(--md-on-primary-container)] flex items-center justify-center border border-[var(--md-primary)]/30">
                    <Send className="w-6 h-6" />
                  </div>
                  <div className="space-y-1">
                    <h4 className="text-sm font-bold text-[var(--md-on-surface)]">ابدأ المحادثة عبر WhatsApp</h4>
                    <p className="text-xs max-w-sm text-[var(--md-on-surface-variant)]">
                      يمكنك إرسال رسالة ترحيبية، تذكير بفاتورة مستحقة، أو كشف حساب فوري.
                    </p>
                  </div>

                  {/* AI Quick Starters */}
                  <div className="flex flex-wrap justify-center gap-2 pt-2">
                    <button
                      onClick={() => handleGenerateAIDraft('POLITE_REMINDER')}
                      className="m3-btn-outlined !min-h-[34px] text-xs cursor-pointer"
                    >
                      ✨ كتابة تذكير ودي بالمستحقات
                    </button>
                    <button
                      onClick={() => handleGenerateAIDraft('STATEMENT_NOTICE')}
                      className="m3-btn-outlined !min-h-[34px] text-xs cursor-pointer"
                    >
                      ✨ ملخص كشف الحساب
                    </button>
                  </div>
                </div>
              ) : (
                messages.map((msg) => {
                  const isOut = msg.direction === 'OUTBOUND';
                  return (
                    <div
                      key={msg.id}
                      className={`flex flex-col ${isOut ? 'items-end' : 'items-start'}`}
                    >
                      <div
                        className={`max-w-[82%] sm:max-w-[70%] p-3.5 rounded-2xl space-y-1.5 text-xs leading-relaxed ${
                          isOut
                            ? 'bg-[var(--md-primary-container)] text-[var(--md-on-primary-container)] border border-[var(--md-primary)]/30 rounded-br-none'
                            : 'bg-[var(--md-surface-container-high)] text-[var(--md-on-surface)] border border-[var(--md-outline-variant)] rounded-bl-none'
                        }`}
                      >
                        {/* Message Type Badge */}
                        {msg.message_type && msg.message_type !== 'TEXT' && (
                          <div
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold border ${
                              isOut
                                ? 'bg-[var(--md-surface-container-lowest)]/60 text-[var(--md-on-primary-container)] border-[var(--md-primary)]/25'
                                : 'bg-[var(--md-surface-container)] text-[var(--md-on-surface-variant)] border-[var(--md-outline-variant)]'
                            }`}
                          >
                            <FileText className="w-2.5 h-2.5" />
                            <span>
                              {msg.message_type === 'INVOICE_REMINDER'
                                ? 'تذكير فاتورة'
                                : msg.message_type === 'PAYMENT_RECEIPT'
                                ? 'سند قبض'
                                : msg.message_type === 'STATEMENT'
                                ? 'كشف حساب'
                                : msg.message_type}
                            </span>
                          </div>
                        )}

                        <p className="whitespace-pre-wrap font-sans">{msg.message_body}</p>

                        {/* ERP Linked Badge or Action */}
                        <div className="flex items-center justify-between gap-3 pt-1.5 border-t border-[var(--md-outline-variant)]/50 text-[10px]">
                          {msg.reference_id || msg.customer_id || msg.supplier_id ? (
                            <span className={`inline-flex items-center gap-1 font-mono text-[10px] font-semibold ${
                              isOut ? 'text-[var(--md-on-primary-container)]/85' : 'text-[var(--md-on-surface-variant)]'
                            }`}>
                              <Link className="w-2.5 h-2.5" />
                              <span>مرتبط بـ ERP</span>
                            </span>
                          ) : (
                            onLinkMessage && (
                              <button
                                onClick={() => {
                                  setLinkingMessage(msg);
                                  setLinkEntityId(erpContext?.customer?.id || erpContext?.supplier?.id || '');
                                }}
                                className={`inline-flex items-center gap-1 text-[10px] hover:underline font-semibold cursor-pointer ${
                                  isOut ? 'text-[var(--md-on-primary-container)]' : 'text-[var(--md-primary-text)]'
                                }`}
                                title="ربط هذه الرسالة بسجل عميل أو مورد أو فاتورة"
                              >
                                <Link className="w-2.5 h-2.5" />
                                <span>ربط بـ ERP</span>
                              </button>
                            )
                          )}

                          <div className="flex items-center gap-1.5">
                            <span className={`font-mono tabular-nums font-semibold ${
                              isOut ? 'text-[var(--md-on-primary-container)]/85' : 'text-[var(--md-on-surface-variant)]'
                            }`}>
                              {new Date(msg.created_at).toLocaleTimeString('en-US', {
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </span>

                            {isOut && (
                              <span>
                                {msg.status === 'READ' ? (
                                  <CheckCheck className="w-3.5 h-3.5 text-[var(--md-info)] inline" title="تمت القراءة" />
                                ) : msg.status === 'DELIVERED' ? (
                                  <CheckCheck className="w-3.5 h-3.5 text-[var(--md-primary-text)] inline" title="تم التسليم" />
                                ) : msg.status === 'FAILED' ? (
                                  <AlertTriangle className="w-3.5 h-3.5 text-[var(--md-error)] inline" title="فشل الإرسال" />
                                ) : (
                                  <Check className="w-3.5 h-3.5 text-[var(--md-on-primary-container)]/80 inline" title="تم الإرسال" />
                                )}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Failed message retry bar */}
                        {isOut && msg.status === 'FAILED' && onRetryMessage && (
                          <div className="pt-1.5 flex items-center justify-between gap-2 border-t border-[var(--md-error)]/30">
                            <span className="text-[10px] text-[var(--md-error)] font-bold">فشل الإرسال</span>
                            <button
                              onClick={() => handleRetry(msg.id)}
                              disabled={retryingMessageId === msg.id}
                              className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-[var(--md-error-container)] text-[var(--md-on-error-container)] border border-[var(--md-error)]/30 text-[10px] font-bold transition-all disabled:opacity-40 cursor-pointer"
                              title="إعادة إرسال الرسالة الفاشلة"
                            >
                              <RotateCw className={`w-3 h-3 ${retryingMessageId === msg.id ? 'animate-spin' : ''}`} />
                              <span>{retryingMessageId === msg.id ? 'جارٍ الإعادة...' : 'إعادة الإرسال'}</span>
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Validation Warning Alert */}
            {validationWarning && (
              <div className="mx-4 mb-2 p-2.5 bg-[var(--md-error-container)] border border-[var(--md-error)]/30 text-[var(--md-on-error-container)] rounded-xl text-xs font-semibold flex items-center justify-between gap-2 animate-shake">
                <div className="flex items-center gap-1.5">
                  <AlertTriangle className="w-4 h-4 text-[var(--md-error)] shrink-0" />
                  <span>{validationWarning}</span>
                </div>
                <button
                  onClick={() => setValidationWarning(null)}
                  className="text-[11px] font-bold underline cursor-pointer"
                >
                  إغلاق
                </button>
              </div>
            )}

            {/* Interactive Composer */}
            <div className="p-3 bg-[var(--md-surface-container)] border-t border-[var(--md-outline-variant)] space-y-2">
              {/* Quick Template Shortcuts */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-[11px] font-bold scrollbar-none">
                <span className="text-[var(--md-on-surface-variant)] text-[10px] shrink-0 font-bold">قوالب سريعة:</span>
                <button
                  type="button"
                  onClick={() => handleQuickTemplate('REMINDER')}
                  className="px-2.5 py-1 rounded-lg bg-[var(--md-warning-container)] text-[var(--md-on-warning-container)] border border-[var(--md-warning)]/25 hover:opacity-85 transition-all whitespace-nowrap cursor-pointer"
                >
                  🔔 تذكير برصيد
                </button>
                <button
                  type="button"
                  onClick={() => handleQuickTemplate('STATEMENT')}
                  className="px-2.5 py-1 rounded-lg bg-[var(--md-primary-container)] text-[var(--md-on-primary-container)] border border-[var(--md-primary)]/25 hover:opacity-85 transition-all whitespace-nowrap cursor-pointer"
                >
                  📄 إرسال كشف حساب
                </button>
                <button
                  type="button"
                  onClick={() => handleQuickTemplate('PAYMENT')}
                  className="px-2.5 py-1 rounded-lg bg-[var(--md-success-container)] text-[var(--md-on-success-container)] border border-[var(--md-success)]/25 hover:opacity-85 transition-all whitespace-nowrap cursor-pointer"
                >
                  💳 تأكيد استلام دفعة
                </button>
                <button
                  type="button"
                  onClick={() => handleQuickTemplate('INVOICE')}
                  className="px-2.5 py-1 rounded-lg bg-[var(--md-info-container)] text-[var(--md-on-info-container)] border border-[var(--md-info)]/25 hover:opacity-85 transition-all whitespace-nowrap cursor-pointer"
                >
                  🧾 إرسال فاتورة
                </button>
              </div>

              {/* Dynamic Variables Bar */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-[10px] font-bold scrollbar-none text-[var(--md-on-surface-variant)]">
                <span className="shrink-0 flex items-center gap-1">
                  <Tag className="w-3 h-3" /> متغيرات:
                </span>
                <button
                  onClick={() => handleInsertVariable('customer_name')}
                  className="px-2 py-0.5 rounded-md bg-[var(--md-surface-container-high)] hover:bg-[var(--md-primary-container)] hover:text-[var(--md-on-primary-container)] border border-[var(--md-outline-variant)] transition-colors whitespace-nowrap text-[var(--md-on-surface)] cursor-pointer"
                >
                  اسم العميل
                </button>
                <button
                  onClick={() => handleInsertVariable('remaining_balance')}
                  className="px-2 py-0.5 rounded-md bg-[var(--md-surface-container-high)] hover:bg-[var(--md-primary-container)] hover:text-[var(--md-on-primary-container)] border border-[var(--md-outline-variant)] transition-colors whitespace-nowrap text-[var(--md-on-surface)] cursor-pointer"
                >
                  الرصيد المتبقي
                </button>
                <button
                  onClick={() => handleInsertVariable('invoice_number')}
                  className="px-2 py-0.5 rounded-md bg-[var(--md-surface-container-high)] hover:bg-[var(--md-primary-container)] hover:text-[var(--md-on-primary-container)] border border-[var(--md-outline-variant)] transition-colors whitespace-nowrap text-[var(--md-on-surface)] cursor-pointer"
                >
                  رقم الفاتورة
                </button>
                <button
                  onClick={() => handleInsertVariable('due_date')}
                  className="px-2 py-0.5 rounded-md bg-[var(--md-surface-container-high)] hover:bg-[var(--md-primary-container)] hover:text-[var(--md-on-primary-container)] border border-[var(--md-outline-variant)] transition-colors whitespace-nowrap text-[var(--md-on-surface)] cursor-pointer"
                >
                  تاريخ الاستحقاق
                </button>
                <button
                  onClick={() => handleInsertVariable('paid_amount')}
                  className="px-2 py-0.5 rounded-md bg-[var(--md-surface-container-high)] hover:bg-[var(--md-primary-container)] hover:text-[var(--md-on-primary-container)] border border-[var(--md-outline-variant)] transition-colors whitespace-nowrap text-[var(--md-on-surface)] cursor-pointer"
                >
                  المبلغ المسدد
                </button>
                <button
                  onClick={() => handleInsertVariable('company_name')}
                  className="px-2 py-0.5 rounded-md bg-[var(--md-surface-container-high)] hover:bg-[var(--md-primary-container)] hover:text-[var(--md-on-primary-container)] border border-[var(--md-outline-variant)] transition-colors whitespace-nowrap text-[var(--md-on-surface)] cursor-pointer"
                >
                  اسم الشركة
                </button>
              </div>

              {/* Text Input Box */}
              <div className="relative border border-[var(--md-outline)] rounded-2xl bg-[var(--md-surface-container-lowest)] focus-within:border-[var(--md-primary)] focus-within:ring-2 focus-within:ring-[var(--md-primary)]/20 transition-all">
                <textarea
                  id="whatsapp-composer-textarea"
                  value={messageInput}
                  onChange={(e) => {
                    setMessageInput(e.target.value);
                    setValidationWarning(null);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                      e.preventDefault();
                      handleSend();
                    }
                  }}
                  placeholder="اكتب رسالتك هنا... (اضغط Ctrl+Enter للإرسال)"
                  rows={3}
                  className="w-full p-3 bg-transparent text-xs text-[var(--md-on-surface)] placeholder:text-[var(--md-on-surface-variant)]/70 focus:outline-none resize-none leading-relaxed"
                />

                {/* Composer Footer Actions */}
                <div className="flex items-center justify-between p-2 border-t border-[var(--md-outline-variant)] bg-[var(--md-surface-container-low)] rounded-b-2xl gap-2 flex-wrap">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {/* Attachment Chip */}
                    {selectedAttachment && (
                      <div className="m3-badge m3-badge-primary inline-flex items-center gap-1 text-[10px]">
                        <Paperclip className="w-3 h-3" />
                        <span className="truncate max-w-[120px]">{selectedAttachment.fileName || selectedAttachment.name}</span>
                        <button
                          type="button"
                          onClick={() => setSelectedAttachment(null)}
                          className="hover:text-[var(--md-error)] ml-0.5 cursor-pointer"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    )}

                    {/* Templates Menu Button */}
                    <div className="relative">
                      <button
                        onClick={() => setShowTemplatesMenu(!showTemplatesMenu)}
                        className="m3-btn-text !min-h-[30px] !px-2 !py-1 text-xs font-bold cursor-pointer"
                        title="اختيار قالب جاهز"
                      >
                        <Sparkles className="w-3.5 h-3.5 text-[var(--md-warning)]" />
                        <span className="hidden sm:inline">قوالب</span>
                      </button>

                      {showTemplatesMenu && (
                        <div className="absolute bottom-full right-0 mb-2 w-72 m3-modal-surface p-2 z-20 space-y-1">
                          <p className="text-[11px] font-bold text-[var(--md-on-surface-variant)] px-2 py-1">قوالب جاهزة سريعة:</p>
                          <div className="max-h-48 overflow-y-auto space-y-1">
                            {templates.map((t) => (
                              <button
                                key={t.id}
                                onClick={() => handleApplyTemplate(t)}
                                className="w-full text-right p-2 rounded-lg hover:bg-[var(--md-primary-container)] hover:text-[var(--md-on-primary-container)] text-xs font-semibold text-[var(--md-on-surface)] transition-colors block truncate cursor-pointer"
                              >
                                {t.name}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* AI Draft Helpers */}
                    <button
                      onClick={() => handleGenerateAIDraft('POLITE_REMINDER')}
                      className="m3-btn-text !min-h-[30px] !px-2 !py-1 text-xs font-medium hidden sm:flex cursor-pointer"
                      title="صياغة تذكير ذكي"
                    >
                      <Sparkles className="w-3.5 h-3.5 text-[var(--md-primary-text)]" />
                      <span>صياغة ذكية</span>
                    </button>

                    {/* Schedule Button */}
                    <button
                      onClick={() => {
                        if (typeof onScheduleMessagePrompt === 'function') {
                          onScheduleMessagePrompt(selectedPhone || '', messageInput);
                        }
                      }}
                      className="m3-btn-text !min-h-[30px] !px-2 !py-1 text-xs font-medium cursor-pointer"
                      title="جدولة الرسالة لوقت لاحق"
                    >
                      <Clock className="w-3.5 h-3.5 text-[var(--md-info)]" />
                      <span className="hidden sm:inline">جدولة</span>
                    </button>
                  </div>

                  {/* Send Actions */}
                  <div className="flex items-center gap-2">
                    <a
                      href={`https://wa.me/${(selectedPhone || '').replace(/\D/g, '')}${
                        messageInput.trim() ? `?text=${encodeURIComponent(messageInput.trim())}` : ''
                      }`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={`m3-btn-outlined !min-h-[34px] !px-3 !py-1 text-xs ${
                        !selectedPhone ? 'pointer-events-none opacity-40' : ''
                      }`}
                      title="إرسال عبر تطبيق واتساب الخارجي (wa.me)"
                    >
                      <ExternalLink className="w-3.5 h-3.5 text-[var(--md-primary-text)]" />
                      <span className="hidden sm:inline">إرسال عبر تطبيق واتساب الخارجي (wa.me)</span>
                      <span className="sm:hidden">wa.me</span>
                    </a>

                    <button
                      id="btn-whatsapp-send-action"
                      onClick={handleSend}
                      disabled={isSending || !messageInput.trim()}
                      className="m3-btn-primary !min-h-[34px] !px-4 !py-1 text-xs cursor-pointer disabled:opacity-40"
                    >
                      {isSending ? (
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Send className="w-3.5 h-3.5" />
                      )}
                      <span>إرسال</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </>
        ) : (
          <div className="h-full flex flex-col items-center justify-center p-8 text-center text-[var(--md-on-surface-variant)] space-y-3">
            <div className="w-14 h-14 rounded-2xl bg-[var(--md-surface-container-high)] text-[var(--md-on-surface-variant)] flex items-center justify-center border border-[var(--md-outline-variant)]">
              <MessageSquare className="w-7 h-7" />
            </div>
            <div className="space-y-1">
              <h3 className="text-sm font-bold text-[var(--md-on-surface)]">لم يتم تحديد محادثة</h3>
              <p className="text-xs max-w-xs text-[var(--md-on-surface-variant)]">
                اختر عميلاً أو مورداً من القائمة الجانبية لعرض المحادثة والبيانات المالية المحاسبية المرتبطة به.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* PANEL 3: REAL-TIME ERP CONTEXT CARD (RIGHT) */}
      {/* ========================================================================= */}
      <div
        id="whatsapp-panel-erp-context"
        className={`w-full lg:w-72 xl:w-80 bg-[var(--md-surface-container)] flex flex-col overflow-y-auto ${
          activeTabMobile !== 'CONTEXT' ? 'hidden lg:flex' : 'flex'
        }`}
      >
        {/* Header */}
        <div className="p-3.5 border-b border-[var(--md-outline-variant)] flex items-center justify-between bg-[var(--md-surface-container-low)]">
          <h3 className="text-xs font-bold text-[var(--md-on-surface)] flex items-center gap-1.5">
            <Building className="w-4 h-4 text-[var(--md-primary-text)]" />
            <span>السياق المحاسبي والمالي</span>
          </h3>
          <button
            onClick={() => setActiveTabMobile('CHAT')}
            className="lg:hidden text-xs text-[var(--md-primary-text)] font-bold cursor-pointer"
          >
            العودة للمحادثة
          </button>
        </div>

        {/* Content */}
        <div className="p-4 space-y-4 flex-1">
          {isLoadingERPContext ? (
            <div className="p-8 text-center text-[var(--md-on-surface-variant)]">
              <RefreshCw className="w-5 h-5 animate-spin mx-auto text-[var(--md-primary-text)]" />
            </div>
          ) : erpContext?.customer || erpContext?.supplier ? (
            <>
              {/* Profile Card */}
              <div className="p-3 rounded-xl bg-[var(--md-surface-container-low)] border border-[var(--md-outline-variant)] space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] font-bold text-[var(--md-on-surface-variant)]">بيانات الحساب</span>
                    <span className={`m3-badge !px-1.5 !py-0.5 text-[10px] font-bold ${
                      erpContext.customer ? 'm3-badge-info' : 'm3-badge-warning'
                    }`}>
                      {erpContext.customer ? 'عميل' : 'مورد'}
                    </span>
                  </div>
                  <span className="m3-badge m3-badge-primary !px-1.5 !py-0.5 text-[10px] font-mono tabular-nums font-bold">
                    #{erpContext.customer?.account_number || erpContext.supplier?.account_number || 'ACC-001'}
                  </span>
                </div>
                <h4 className="text-xs font-bold text-[var(--md-on-surface)]">
                  {erpContext.customer?.name || erpContext.supplier?.name}
                </h4>
                <p className="text-[11px] text-[var(--md-on-surface-variant)] font-mono tabular-nums" dir="ltr">
                  {erpContext.customer?.phone || erpContext.supplier?.phone || selectedPhone}
                </p>
              </div>

              {/* Financial Balance Card */}
              <div className="p-3.5 rounded-xl bg-[var(--md-primary-container)]/50 border border-[var(--md-primary)]/30 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-[var(--md-on-primary-container)]">الرصيد المالي المعتمد</span>
                  <DollarSign className="w-4 h-4 text-[var(--md-primary-text)]" />
                </div>
                <p className="text-lg font-black text-[var(--md-on-surface)] font-mono tabular-nums">
                  {parseFloat(
                    (erpContext.authoritativeBalance !== undefined
                      ? erpContext.authoritativeBalance
                      : erpContext.customer?.current_balance || erpContext.supplier?.current_balance || 0) as any
                  ).toLocaleString('en-US')}{' '}
                  <span className="text-xs font-bold text-[var(--md-on-surface-variant)]">ر.ي.</span>
                </p>
                <p className="text-[10px] text-[var(--md-on-primary-container)] font-semibold">
                  {parseFloat((erpContext.customer?.current_balance || erpContext.supplier?.current_balance || 0) as any) > 0
                    ? (erpContext.customer ? '⚠️ رصيد مدين مستحق التحصيل' : '✅ رصيد دائن للمورد مستحق السداد')
                    : parseFloat((erpContext.customer?.current_balance || erpContext.supplier?.current_balance || 0) as any) < 0
                    ? (erpContext.customer ? '✅ رصيد دائن لصالح العميل' : '⚠️ رصيد مدين على المورد')
                    : '✅ الحساب متزن تماماً'}
                </p>
              </div>

              {/* Quick Action ERP Shortcuts */}
              <div className="space-y-1.5 pt-1">
                <p className="text-[11px] font-bold text-[var(--md-on-surface-variant)]">إجراءات محاسبية فورية عبر واتساب:</p>

                <button
                  onClick={() => {
                    const entityId = erpContext.customer?.id || erpContext.supplier?.id;
                    const type = erpContext.customer ? 'CUSTOMER' : 'SUPPLIER';
                    if (entityId && selectedPhone && typeof onSendStatement === 'function') {
                      onSendStatement(entityId, type, selectedPhone);
                    }
                  }}
                  className="m3-btn-outlined w-full !justify-between !min-h-[36px] !px-3 text-xs cursor-pointer"
                >
                  <span className="flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5 text-[var(--md-primary-text)]" />
                    <span>إرسال كشف الحساب ({erpContext.customer ? 'عميل' : 'مورد'})</span>
                  </span>
                  <ArrowDownLeft className="w-3.5 h-3.5 text-[var(--md-on-surface-variant)]" />
                </button>

                {erpContext.customer && (
                  <button
                    onClick={() => handleGenerateAIDraft('POLITE_REMINDER')}
                    className="m3-btn-outlined w-full !justify-between !min-h-[36px] !px-3 text-xs cursor-pointer"
                  >
                    <span className="flex items-center gap-1.5">
                      <Flame className="w-3.5 h-3.5 text-[var(--md-warning)]" />
                      <span>تذكير بمطابقة الرصيد</span>
                    </span>
                    <ArrowDownLeft className="w-3.5 h-3.5 text-[var(--md-on-surface-variant)]" />
                  </button>
                )}
              </div>

              {/* Recent Sales Invoices list (Customer) */}
              {erpContext.recentInvoices && erpContext.recentInvoices.length > 0 && (
                <div className="space-y-2 pt-2 border-t border-[var(--md-outline-variant)]">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-[var(--md-on-surface)]">آخر فواتير المبيعات</span>
                    <span className="text-[10px] text-[var(--md-on-surface-variant)] tabular-nums">({erpContext.recentInvoices.length})</span>
                  </div>

                  <div className="space-y-1.5">
                    {erpContext.recentInvoices.map((inv: any) => (
                      <div
                        key={inv.id}
                        className="p-2 rounded-lg border border-[var(--md-outline-variant)] bg-[var(--md-surface-container-low)] flex items-center justify-between text-[11px]"
                      >
                        <div>
                          <p className="font-mono tabular-nums font-bold text-[var(--md-on-surface)]">#{inv.invoice_number}</p>
                          <p className="text-[10px] text-[var(--md-on-surface-variant)] font-mono tabular-nums">
                            المتبقي: {parseFloat(inv.remaining_amount || inv.total).toLocaleString('en-US')} ر.ي.
                          </p>
                        </div>

                        <button
                          onClick={() => {
                            if (selectedPhone && typeof onSendInvoiceReminder === 'function') {
                              onSendInvoiceReminder(inv.id, selectedPhone);
                            }
                          }}
                          className="m3-btn-tonal !min-h-[26px] !px-2 !py-0.5 !rounded-md text-[10px] cursor-pointer"
                          title="إرسال تذكير بهذه الفاتورة"
                        >
                          تذكير
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Recent Purchase Invoices list (Supplier) */}
              {erpContext.recentPurchaseInvoices && erpContext.recentPurchaseInvoices.length > 0 && (
                <div className="space-y-2 pt-2 border-t border-[var(--md-outline-variant)]">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-[var(--md-on-surface)]">آخر فواتير المشتريات</span>
                    <span className="text-[10px] text-[var(--md-on-surface-variant)] tabular-nums">({erpContext.recentPurchaseInvoices.length})</span>
                  </div>

                  <div className="space-y-1.5">
                    {erpContext.recentPurchaseInvoices.map((pinv: any) => (
                      <div
                        key={pinv.id}
                        className="p-2 rounded-lg border border-[var(--md-outline-variant)] bg-[var(--md-surface-container-low)] flex items-center justify-between text-[11px]"
                      >
                        <div>
                          <p className="font-mono tabular-nums font-bold text-[var(--md-on-surface)]">#{pinv.invoice_number}</p>
                          <p className="text-[10px] text-[var(--md-on-surface-variant)] font-mono tabular-nums">
                            الإجمالي: {parseFloat(pinv.total_amount || pinv.total || 0).toLocaleString('en-US')} ر.ي.
                          </p>
                        </div>

                        <button
                          onClick={() => {
                            setMessageInput(
                              `الأخوة شركة ${erpContext.supplier?.name || ''} المحترمين،\nنود تأكيد استلام ومطابقة فاتورة المشتريات رقم #${pinv.invoice_number} البالغ إجماليها ${parseFloat(pinv.total_amount || pinv.total || 0).toLocaleString('en-US')} ر.ي. شاكرين حسن تعاونكم.`
                            );
                          }}
                          className="px-2 py-1 rounded-md bg-[var(--md-warning-container)] text-[var(--md-on-warning-container)] border border-[var(--md-warning)]/25 hover:opacity-85 text-[10px] font-bold transition-colors cursor-pointer"
                          title="صياغة رسالة مطابقة فاتورة المشتريات"
                        >
                          مطابقة
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Recent Payments list */}
              {erpContext.recentPayments && erpContext.recentPayments.length > 0 && (
                <div className="space-y-2 pt-2 border-t border-[var(--md-outline-variant)]">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-[var(--md-on-surface)]">
                      {erpContext.customer ? 'آخر سندات القبض' : 'آخر سندات الصرف'}
                    </span>
                  </div>

                  <div className="space-y-1.5">
                    {erpContext.recentPayments.map((pay: any) => (
                      <div
                        key={pay.id}
                        className="p-2 rounded-lg border border-[var(--md-outline-variant)] bg-[var(--md-surface-container-low)] flex items-center justify-between text-[11px]"
                      >
                        <div>
                          <p className="font-mono tabular-nums font-bold text-[var(--md-on-surface)]">{pay.payment_number || `PAY-${pay.id.slice(0, 6)}`}</p>
                          <p className="text-[10px] text-[var(--md-success)] font-mono tabular-nums font-bold">
                            {parseFloat(pay.amount).toLocaleString('en-US')} ر.ي.
                          </p>
                        </div>

                        <button
                          onClick={() => selectedPhone && onSendPaymentReminder(pay.id, selectedPhone)}
                          className="m3-btn-tonal !min-h-[26px] !px-2 !py-0.5 !rounded-md text-[10px] cursor-pointer"
                          title="إرسال إشعار السند"
                        >
                          إشعار
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Related Attachments with SHA256 integrity */}
              {erpContext.relatedAttachments && erpContext.relatedAttachments.length > 0 && (
                <div className="space-y-2 pt-2 border-t border-[var(--md-outline-variant)]">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-[var(--md-on-surface)]">المرفقات والوثائق المحاسبية</span>
                    <span className="text-[10px] text-[var(--md-on-surface-variant)] tabular-nums">({erpContext.relatedAttachments.length})</span>
                  </div>

                  <div className="space-y-1.5">
                    {erpContext.relatedAttachments.map((att: any) => (
                      <div
                        key={att.id}
                        className="p-2 rounded-lg border border-[var(--md-outline-variant)] bg-[var(--md-surface-container-low)] space-y-1.5 text-[11px]"
                      >
                        <div className="flex items-start justify-between gap-1.5">
                          <div className="truncate max-w-[170px]">
                            <p className="font-semibold text-[var(--md-on-surface)] truncate">{att.fileName || att.file_name || 'وثيقة'}</p>
                            <p className="text-[10px] text-[var(--md-on-surface-variant)] font-mono tabular-nums">
                              {att.fileSize ? `${Math.round(att.fileSize / 1024)} KB` : 'ملف'}
                            </p>
                          </div>
                          <span className="m3-badge m3-badge-success !px-1.5 !py-0.5 inline-flex items-center gap-0.5 text-[9px] font-mono">
                            <ShieldCheck className="w-2.5 h-2.5" />
                            <span>SHA-256</span>
                          </span>
                        </div>

                        <div className="flex items-center justify-end gap-1 pt-1 border-t border-[var(--md-outline-variant)]/70">
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedAttachment(att);
                              setMessageInput((prev) => `${prev} مرفق: ${att.fileName || att.file_name}`.trim());
                            }}
                            className="m3-btn-tonal !min-h-[24px] !px-2 !py-0.5 !rounded-md text-[10px] cursor-pointer"
                          >
                            <Paperclip className="w-2.5 h-2.5" />
                            <span>إرفاق بالمحادثة</span>
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="p-6 text-center text-[var(--md-on-surface-variant)] space-y-2">
              <Info className="w-6 h-6 mx-auto opacity-50" />
              <p className="text-xs font-semibold text-[var(--md-on-surface)]">لا تتوفر بيانات محاسبية</p>
              <p className="text-[11px] text-[var(--md-on-surface-variant)]">
                هذا الرقم غير مرتبط بسجل عميل أو مورد مسجل في النظام المحاسبي بعد.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Linking Modal */}
      {linkingMessage && (
        <div className="fixed inset-0 z-50 m3-backdrop flex items-center justify-center p-4 animate-fade-in">
          <div className="m3-modal-surface max-w-md w-full p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-[var(--md-outline-variant)] pb-3">
              <div className="flex items-center gap-2 text-[var(--md-on-surface)] font-bold text-sm">
                <Link className="w-4 h-4 text-[var(--md-primary-text)]" />
                <span>ربط رسالة الواتساب بسجل محاسبي (ERP)</span>
              </div>
              <button
                onClick={() => setLinkingMessage(null)}
                className="m3-btn-text !min-h-[30px] !p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-3 bg-[var(--md-surface-container-low)] rounded-xl border border-[var(--md-outline-variant)] text-xs text-[var(--md-on-surface)] space-y-1">
              <span className="text-[10px] font-bold text-[var(--md-on-surface-variant)]">نص الرسالة:</span>
              <p className="line-clamp-2 italic font-sans">{linkingMessage.message_body}</p>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-[var(--md-on-surface)] font-bold mb-1">نوع السجل المراد الربط به:</label>
                <select
                  value={linkEntityType}
                  onChange={(e) => setLinkEntityType(e.target.value as any)}
                  className="m3-select !h-10 text-xs"
                >
                  <option value="CUSTOMER">عميل (Customer)</option>
                  <option value="SUPPLIER">مورد (Supplier)</option>
                  <option value="INVOICE">فاتورة مبيعات (Sales Invoice)</option>
                  <option value="PURCHASE_INVOICE">فاتورة مشتريات (Purchase Invoice)</option>
                  <option value="PAYMENT">سند مالي (Payment / Receipt)</option>
                </select>
              </div>

              <div>
                <label className="block text-[var(--md-on-surface)] font-bold mb-1">المعرف أو الكود المحاسبي (ID):</label>
                <input
                  type="text"
                  value={linkEntityId}
                  onChange={(e) => setLinkEntityId(e.target.value)}
                  placeholder="أدخل معرّف السجل..."
                  className="m3-input !h-10 text-xs font-mono"
                />
                {/* Context Quick Fill */}
                {(erpContext?.customer || erpContext?.supplier || erpContext?.recentInvoices?.length || erpContext?.recentPurchaseInvoices?.length) && (
                  <div className="mt-2 space-y-1">
                    <span className="text-[10px] text-[var(--md-on-surface-variant)] font-bold">اقتراحات سريعة من السياق الحالي:</span>
                    <div className="flex flex-wrap gap-1.5">
                      {erpContext?.customer && (
                        <button
                          type="button"
                          onClick={() => {
                            setLinkEntityType('CUSTOMER');
                            setLinkEntityId(erpContext.customer!.id);
                          }}
                          className="m3-btn-outlined !min-h-[26px] !px-2 !py-0.5 !rounded-md text-[10px] cursor-pointer"
                        >
                          العميل الحالي
                        </button>
                      )}
                      {erpContext?.supplier && (
                        <button
                          type="button"
                          onClick={() => {
                            setLinkEntityType('SUPPLIER');
                            setLinkEntityId(erpContext.supplier!.id);
                          }}
                          className="m3-btn-outlined !min-h-[26px] !px-2 !py-0.5 !rounded-md text-[10px] cursor-pointer"
                        >
                          المورد الحالي
                        </button>
                      )}
                      {erpContext?.recentInvoices?.[0] && (
                        <button
                          type="button"
                          onClick={() => {
                            setLinkEntityType('INVOICE');
                            setLinkEntityId(erpContext.recentInvoices![0].id);
                          }}
                          className="m3-btn-outlined !min-h-[26px] !px-2 !py-0.5 !rounded-md text-[10px] tabular-nums cursor-pointer"
                        >
                          فاتورة #{erpContext.recentInvoices[0].invoice_number}
                        </button>
                      )}
                      {erpContext?.recentPurchaseInvoices?.[0] && (
                        <button
                          type="button"
                          onClick={() => {
                            setLinkEntityType('PURCHASE_INVOICE');
                            setLinkEntityId(erpContext.recentPurchaseInvoices![0].id);
                          }}
                          className="m3-btn-outlined !min-h-[26px] !px-2 !py-0.5 !rounded-md text-[10px] tabular-nums cursor-pointer"
                        >
                          فاتورة مشتريات #{erpContext.recentPurchaseInvoices[0].invoice_number}
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-[var(--md-outline-variant)]">
              <button
                type="button"
                onClick={() => setLinkingMessage(null)}
                className="m3-btn-outlined text-xs"
              >
                إلغاء
              </button>
              <button
                type="button"
                onClick={handleExecuteLink}
                disabled={isLinking || !linkEntityId.trim()}
                className="m3-btn-primary text-xs cursor-pointer disabled:opacity-40"
              >
                {isLinking && <RotateCw className="w-3 h-3 animate-spin" />}
                <span>حفظ الربط بالسجل</span>
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
