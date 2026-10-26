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

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

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
      const ok = await onSendMessage(selectedPhone, messageInput.trim(), {
        customerId: activeConversation?.customer_id || erpContext?.customer?.id,
        supplierId: activeConversation?.supplier_id || erpContext?.supplier?.id,
        attachmentId: selectedAttachment?.id,
      });
      if (ok) {
        setMessageInput('');
        setSelectedAttachment(null);
      }
    } finally {
      setIsSending(false);
    }
  };

  const handleRetry = async (msgId: string) => {
    if (!onRetryMessage) return;
    setRetryingMessageId(msgId);
    try {
      await onRetryMessage(msgId);
    } finally {
      setRetryingMessageId(null);
    }
  };

  const handleExecuteLink = async () => {
    if (!linkingMessage || !linkEntityId.trim() || !onLinkMessage) return;
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
    <div id="whatsapp-3panel-container" className="bg-slate-900 rounded-2xl border border-slate-800 shadow-xl overflow-hidden flex flex-col lg:flex-row h-[780px]">
      
      {/* ========================================================================= */}
      {/* PANEL 1: CONVERSATION LIST (LEFT) */}
      {/* ========================================================================= */}
      <div
        id="whatsapp-panel-conversations-list"
        className={`w-full lg:w-80 xl:w-96 border-b lg:border-b-0 lg:border-l border-slate-800 flex flex-col bg-slate-950/40 ${
          activeTabMobile !== 'LIST' ? 'hidden lg:flex' : 'flex'
        }`}
      >
        {/* Search & Filter Header */}
        <div className="p-3.5 border-b border-slate-800 bg-slate-900 space-y-2.5">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2" />
            <input
              id="input-search-conversations"
              type="text"
              placeholder="بحث بالاسم، الهاتف، أو الحساب..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-3 pr-9 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-100 placeholder:text-slate-500"
            />
          </div>

          {/* Filter Pills */}
          <div className="flex items-center gap-1 overflow-x-auto pb-1 text-[11px] font-bold scrollbar-none">
            <button
              onClick={() => setFilterType('ALL')}
              className={`px-2.5 py-1 rounded-lg transition-all whitespace-nowrap ${
                filterType === 'ALL'
                  ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-xs'
                  : 'bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-slate-200'
              }`}
            >
              الكل ({conversations.length})
            </button>
            <button
              onClick={() => setFilterType('CUSTOMERS')}
              className={`px-2.5 py-1 rounded-lg transition-all whitespace-nowrap ${
                filterType === 'CUSTOMERS'
                  ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-xs'
                  : 'bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-slate-200'
              }`}
            >
              عملاء
            </button>
            <button
              onClick={() => setFilterType('SUPPLIERS')}
              className={`px-2.5 py-1 rounded-lg transition-all whitespace-nowrap ${
                filterType === 'SUPPLIERS'
                  ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-xs'
                  : 'bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-slate-200'
              }`}
            >
              موردون
            </button>
            <button
              onClick={() => setFilterType('OVERDUE')}
              className={`px-2.5 py-1 rounded-lg transition-all whitespace-nowrap ${
                filterType === 'OVERDUE'
                  ? 'bg-amber-600 text-white shadow-xs'
                  : 'bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-slate-200'
              }`}
            >
              متأخرون
            </button>
            <button
              onClick={() => setFilterType('UNREAD')}
              className={`px-2.5 py-1 rounded-lg transition-all whitespace-nowrap ${
                filterType === 'UNREAD'
                  ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-xs'
                  : 'bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-slate-200'
              }`}
            >
              غير مقروء
            </button>
          </div>
        </div>

        {/* Conversations Scrollable List */}
        <div className="flex-1 overflow-y-auto divide-y divide-slate-800/60">
          {filteredConversations.length === 0 ? (
            <div className="p-8 text-center text-slate-500 space-y-2">
              <User className="w-8 h-8 mx-auto text-slate-600" />
              <p className="text-xs font-semibold text-slate-300">لا توجد محادثات مطابقة</p>
              <p className="text-[11px] text-slate-500">يمكنك بدء محادثة جديدة باستخدام زر "+ رسالة جديدة".</p>
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
                  className={`p-3.5 cursor-pointer transition-all flex items-start gap-3 hover:bg-slate-800/50 ${
                    isSelected ? 'bg-emerald-500/10 border-r-4 border-r-emerald-500' : 'bg-transparent'
                  }`}
                >
                  {/* Avatar */}
                  <div className="relative">
                    <div className="w-10 h-10 rounded-xl bg-slate-800 border border-slate-700 text-slate-200 flex items-center justify-center font-bold text-sm">
                      {name.slice(0, 2)}
                    </div>
                    {isCustomer ? (
                      <span className="absolute -bottom-1 -right-1 p-0.5 bg-emerald-600 rounded-full text-white" title="عميل">
                        <User className="w-2.5 h-2.5" />
                      </span>
                    ) : (
                      <span className="absolute -bottom-1 -right-1 p-0.5 bg-teal-600 rounded-full text-white" title="مورد">
                        <Building className="w-2.5 h-2.5" />
                      </span>
                    )}
                  </div>

                  {/* Details */}
                  <div className="flex-1 min-w-0 space-y-1">
                    <div className="flex items-center justify-between gap-1">
                      <h4 className="text-xs font-bold text-slate-100 truncate">{name}</h4>
                      <span className="text-[10px] text-slate-400 font-mono shrink-0">
                        {conv.last_message_time ? new Date(conv.last_message_time).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) : ''}
                      </span>
                    </div>

                    <p className="text-[11px] text-slate-400 truncate leading-tight">
                      {conv.last_direction === 'OUTBOUND' && <span className="text-slate-500">أنت: </span>}
                      {conv.last_message || 'لا توجد رسائل سابقة'}
                    </p>

                    <div className="flex items-center justify-between gap-1 pt-0.5">
                      <span className="text-[10px] text-slate-500 font-mono" dir="ltr">
                        {conv.phone_number}
                      </span>

                      <div className="flex items-center gap-1">
                        {numBalance > 0 && (
                          <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20 font-mono">
                            مستحق: {numBalance.toLocaleString('en-US')}
                          </span>
                        )}
                        {conv.unread_count > 0 && (
                          <span className="px-1.5 py-0.5 rounded-full bg-emerald-600 text-white font-bold text-[10px] animate-pulse">
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
        className={`flex-1 flex flex-col bg-slate-950/20 border-b lg:border-b-0 lg:border-l border-slate-800 ${
          activeTabMobile !== 'CHAT' ? 'hidden lg:flex' : 'flex'
        }`}
      >
        {selectedPhone ? (
          <>
            {/* Conversation Header */}
            <div className="p-3.5 bg-slate-900 border-b border-slate-800 flex items-center justify-between gap-3 shadow-sm">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setActiveTabMobile('LIST')}
                  className="lg:hidden p-1.5 rounded-lg border border-slate-700 text-slate-300"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>

                <div className="w-9 h-9 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold text-xs border border-emerald-500/30">
                  {(activeConversation?.customer_name || activeConversation?.supplier_name || 'WA').slice(0, 2)}
                </div>

                <div>
                  <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                    <span>{activeConversation?.customer_name || activeConversation?.supplier_name || 'محادثة مباشرة'}</span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                      {activeConversation?.customer_id ? 'عميل نشط' : (activeConversation?.supplier_id ? 'مورد' : 'جهة اتصال')}
                    </span>
                  </h3>
                  <p className="text-[11px] text-slate-400 font-mono flex items-center gap-2" dir="ltr">
                    <span>{selectedPhone}</span>
                    {activeConversation?.customer_account_number && (
                      <span className="text-[10px] text-slate-500">#{activeConversation.customer_account_number}</span>
                    )}
                  </p>
                </div>
              </div>

              {/* Header Context View Toggle (Mobile) */}
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => setActiveTabMobile('CONTEXT')}
                  className="lg:hidden px-2.5 py-1.5 rounded-lg bg-slate-800 text-slate-200 text-xs font-bold"
                >
                  البيانات المحاسبية
                </button>
              </div>
            </div>

            {/* Messages Scroll View */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {isLoadingMessages ? (
                <div className="h-full flex items-center justify-center text-slate-400 space-y-2">
                  <RefreshCw className="w-6 h-6 animate-spin text-emerald-400" />
                </div>
              ) : messages.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-400 space-y-3">
                  <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center border border-emerald-500/20">
                    <Send className="w-6 h-6" />
                  </div>
                  <div className="space-y-1">
                    <h4 className="text-sm font-bold text-slate-200">ابدأ المحادثة عبر WhatsApp</h4>
                    <p className="text-xs max-w-sm text-slate-400">
                      يمكنك إرسال رسالة ترحيبية، تذكير بفاتورة مستحقة، أو كشف حساب فوري.
                    </p>
                  </div>

                  {/* AI Quick Starters */}
                  <div className="flex flex-wrap justify-center gap-2 pt-2">
                    <button
                      onClick={() => handleGenerateAIDraft('POLITE_REMINDER')}
                      className="px-3 py-1.5 rounded-xl bg-slate-800 border border-slate-700 hover:border-emerald-500 text-slate-200 text-xs font-medium transition-all"
                    >
                      ✨ كتابة تذكير ودي بالمستحقات
                    </button>
                    <button
                      onClick={() => handleGenerateAIDraft('STATEMENT_NOTICE')}
                      className="px-3 py-1.5 rounded-xl bg-slate-800 border border-slate-700 hover:border-emerald-500 text-slate-200 text-xs font-medium transition-all"
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
                        className={`max-w-[82%] sm:max-w-[70%] p-3.5 rounded-2xl space-y-1.5 shadow-md text-xs leading-relaxed ${
                          isOut
                            ? 'bg-emerald-700 text-white rounded-br-none'
                            : 'bg-slate-800 text-slate-100 border border-slate-700 rounded-bl-none'
                        }`}
                      >
                        {/* Message Type Badge */}
                        {msg.message_type && msg.message_type !== 'TEXT' && (
                          <div
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold ${
                              isOut ? 'bg-emerald-800/80 text-emerald-100' : 'bg-slate-900 text-slate-300'
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
                        <div className="flex items-center justify-between gap-2 pt-1 border-t border-white/10 text-[10px]">
                          {msg.reference_id || msg.customer_id || msg.supplier_id ? (
                            <span className={`inline-flex items-center gap-1 font-mono text-[10px] ${
                              isOut ? 'text-emerald-100/80' : 'text-slate-400'
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
                                className={`inline-flex items-center gap-1 text-[10px] hover:underline font-semibold ${
                                  isOut ? 'text-emerald-100 hover:text-white' : 'text-slate-400 hover:text-emerald-300'
                                }`}
                                title="ربط هذه الرسالة بسجل عميل أو مورد أو فاتورة"
                              >
                                <Link className="w-2.5 h-2.5" />
                                <span>ربط بـ ERP</span>
                              </button>
                            )
                          )}

                          <div className="flex items-center gap-1.5">
                            <span className="font-mono">
                              {new Date(msg.created_at).toLocaleTimeString('en-US', {
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </span>

                            {isOut && (
                              <span>
                                {msg.status === 'READ' ? (
                                  <CheckCheck className="w-3.5 h-3.5 text-cyan-300 inline" title="تمت القراءة" />
                                ) : msg.status === 'DELIVERED' ? (
                                  <CheckCheck className="w-3.5 h-3.5 text-emerald-200 inline" title="تم التسليم" />
                                ) : msg.status === 'FAILED' ? (
                                  <AlertTriangle className="w-3.5 h-3.5 text-rose-300 inline" title="فشل الإرسال" />
                                ) : (
                                  <Check className="w-3.5 h-3.5 text-emerald-300 inline" title="تم الإرسال" />
                                )}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Failed message retry bar */}
                        {isOut && msg.status === 'FAILED' && onRetryMessage && (
                          <div className="pt-1 flex items-center justify-between gap-2 border-t border-rose-400/20">
                            <span className="text-[10px] text-rose-200 font-bold">فشل الإرسال</span>
                            <button
                              onClick={() => handleRetry(msg.id)}
                              disabled={retryingMessageId === msg.id}
                              className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-rose-500/30 hover:bg-rose-500/50 text-rose-100 text-[10px] font-bold transition-all disabled:opacity-40"
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
              <div ref={messagesEndRef} />
            </div>

            {/* Validation Warning Alert */}
            {validationWarning && (
              <div className="mx-4 mb-2 p-2.5 bg-rose-500/10 border border-rose-500/30 text-rose-300 rounded-xl text-xs font-semibold flex items-center justify-between gap-2 animate-shake">
                <div className="flex items-center gap-1.5">
                  <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
                  <span>{validationWarning}</span>
                </div>
                <button
                  onClick={() => setValidationWarning(null)}
                  className="text-rose-300 hover:text-rose-100 text-[11px] font-bold"
                >
                  إغلاق
                </button>
              </div>
            )}

            {/* Interactive Composer */}
            <div className="p-3 bg-slate-900 border-t border-slate-800 space-y-2">
              {/* Dynamic Variables Bar */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-[10px] font-bold scrollbar-none text-slate-400">
                <span className="text-slate-500 shrink-0 flex items-center gap-1">
                  <Tag className="w-3 h-3" /> متغيرات:
                </span>
                <button
                  onClick={() => handleInsertVariable('customer_name')}
                  className="px-2 py-0.5 rounded-md bg-slate-800 hover:bg-emerald-500/20 hover:text-emerald-300 border border-slate-700 transition-colors whitespace-nowrap text-slate-300"
                >
                  اسم العميل
                </button>
                <button
                  onClick={() => handleInsertVariable('remaining_balance')}
                  className="px-2 py-0.5 rounded-md bg-slate-800 hover:bg-emerald-500/20 hover:text-emerald-300 border border-slate-700 transition-colors whitespace-nowrap text-slate-300"
                >
                  الرصيد المتبقي
                </button>
                <button
                  onClick={() => handleInsertVariable('invoice_number')}
                  className="px-2 py-0.5 rounded-md bg-slate-800 hover:bg-emerald-500/20 hover:text-emerald-300 border border-slate-700 transition-colors whitespace-nowrap text-slate-300"
                >
                  رقم الفاتورة
                </button>
                <button
                  onClick={() => handleInsertVariable('due_date')}
                  className="px-2 py-0.5 rounded-md bg-slate-800 hover:bg-emerald-500/20 hover:text-emerald-300 border border-slate-700 transition-colors whitespace-nowrap text-slate-300"
                >
                  تاريخ الاستحقاق
                </button>
                <button
                  onClick={() => handleInsertVariable('paid_amount')}
                  className="px-2 py-0.5 rounded-md bg-slate-800 hover:bg-emerald-500/20 hover:text-emerald-300 border border-slate-700 transition-colors whitespace-nowrap text-slate-300"
                >
                  المبلغ المسدد
                </button>
                <button
                  onClick={() => handleInsertVariable('company_name')}
                  className="px-2 py-0.5 rounded-md bg-slate-800 hover:bg-emerald-500/20 hover:text-emerald-300 border border-slate-700 transition-colors whitespace-nowrap text-slate-300"
                >
                  اسم الشركة
                </button>
              </div>

              {/* Text Input Box */}
              <div className="relative border border-slate-700 rounded-2xl bg-slate-950 focus-within:border-emerald-500 focus-within:ring-2 focus-within:ring-emerald-500/20 transition-all">
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
                  className="w-full p-3 bg-transparent text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none resize-none leading-relaxed"
                />

                {/* Composer Footer Actions */}
                <div className="flex items-center justify-between p-2 border-t border-slate-800/80 bg-slate-900/90 rounded-b-2xl">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {/* Attachment Chip */}
                    {selectedAttachment && (
                      <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-emerald-500/20 text-emerald-200 border border-emerald-500/30 text-[10px]">
                        <Paperclip className="w-3 h-3" />
                        <span className="truncate max-w-[120px]">{selectedAttachment.fileName || selectedAttachment.name}</span>
                        <button
                          type="button"
                          onClick={() => setSelectedAttachment(null)}
                          className="text-slate-400 hover:text-rose-300 ml-0.5"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    )}

                    {/* Templates Menu Button */}
                    <div className="relative">
                      <button
                        onClick={() => setShowTemplatesMenu(!showTemplatesMenu)}
                        className="p-1.5 rounded-lg text-slate-300 hover:bg-slate-800 hover:text-slate-100 transition-colors text-xs font-bold flex items-center gap-1"
                        title="اختيار قالب جاهز"
                      >
                        <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                        <span className="hidden sm:inline">قوالب</span>
                      </button>

                      {showTemplatesMenu && (
                        <div className="absolute bottom-full right-0 mb-2 w-72 bg-slate-900 border border-slate-800 rounded-xl shadow-xl p-2 z-20 space-y-1">
                          <p className="text-[11px] font-bold text-slate-400 px-2 py-1">قوالب جاهزة سريعة:</p>
                          <div className="max-h-48 overflow-y-auto space-y-1">
                            {templates.map((t) => (
                              <button
                                key={t.id}
                                onClick={() => handleApplyTemplate(t)}
                                className="w-full text-right p-2 rounded-lg hover:bg-emerald-500/10 text-xs font-semibold text-slate-200 transition-colors block truncate"
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
                      className="p-1.5 rounded-lg text-slate-300 hover:bg-slate-800 hover:text-slate-100 transition-colors text-xs font-medium hidden sm:flex items-center gap-1"
                      title="صياغة تذكير ذكي"
                    >
                      <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                      <span>صياغة ذكية</span>
                    </button>

                    {/* Schedule Button */}
                    <button
                      onClick={() => onScheduleMessagePrompt(selectedPhone, messageInput)}
                      className="p-1.5 rounded-lg text-slate-300 hover:bg-slate-800 hover:text-slate-100 transition-colors text-xs font-medium flex items-center gap-1"
                      title="جدولة الرسالة لوقت لاحق"
                    >
                      <Clock className="w-3.5 h-3.5 text-teal-400" />
                      <span className="hidden sm:inline">جدولة</span>
                    </button>
                  </div>

                  {/* Send Button */}
                  <button
                    id="btn-whatsapp-send-action"
                    onClick={handleSend}
                    disabled={isSending || !messageInput.trim()}
                    className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs transition-all shadow-md shadow-emerald-950/40 disabled:opacity-40 active:scale-95"
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
          </>
        ) : (
          <div className="h-full flex flex-col items-center justify-center p-8 text-center text-slate-500 space-y-3">
            <div className="w-14 h-14 rounded-2xl bg-slate-800 text-slate-400 flex items-center justify-center">
              <MessageSquare className="w-7 h-7" />
            </div>
            <div className="space-y-1">
              <h3 className="text-sm font-bold text-slate-300">لم يتم تحديد محادثة</h3>
              <p className="text-xs max-w-xs text-slate-500">
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
        className={`w-full lg:w-72 xl:w-80 bg-slate-900 flex flex-col overflow-y-auto ${
          activeTabMobile !== 'CONTEXT' ? 'hidden lg:flex' : 'flex'
        }`}
      >
        {/* Header */}
        <div className="p-3.5 border-b border-slate-800 flex items-center justify-between bg-slate-950/40">
          <h3 className="text-xs font-bold text-slate-100 flex items-center gap-1.5">
            <Building className="w-4 h-4 text-emerald-400" />
            <span>السياق المحاسبي والمالي</span>
          </h3>
          <button
            onClick={() => setActiveTabMobile('CHAT')}
            className="lg:hidden text-xs text-emerald-400 font-bold"
          >
            العودة للمحادثة
          </button>
        </div>

        {/* Content */}
        <div className="p-4 space-y-4 flex-1">
          {isLoadingERPContext ? (
            <div className="p-8 text-center text-slate-500">
              <RefreshCw className="w-5 h-5 animate-spin mx-auto text-emerald-400" />
            </div>
          ) : erpContext?.customer || erpContext?.supplier ? (
            <>
              {/* Profile Card */}
              <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] font-bold text-slate-500">بيانات الحساب</span>
                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                      erpContext.customer
                        ? 'bg-blue-500/10 text-blue-300 border border-blue-500/20'
                        : 'bg-amber-500/10 text-amber-300 border border-amber-500/20'
                    }`}>
                      {erpContext.customer ? 'عميل' : 'مورد'}
                    </span>
                  </div>
                  <span className="text-[10px] font-mono font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-1.5 py-0.5 rounded">
                    #{erpContext.customer?.account_number || erpContext.supplier?.account_number || 'ACC-001'}
                  </span>
                </div>
                <h4 className="text-xs font-bold text-slate-100">
                  {erpContext.customer?.name || erpContext.supplier?.name}
                </h4>
                <p className="text-[11px] text-slate-400 font-mono" dir="ltr">
                  {erpContext.customer?.phone || erpContext.supplier?.phone || selectedPhone}
                </p>
              </div>

              {/* Financial Balance Card */}
              <div className="p-3.5 rounded-xl bg-emerald-500/5 border border-emerald-500/20 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-emerald-300">الرصيد المالي المعتمد</span>
                  <DollarSign className="w-4 h-4 text-emerald-400" />
                </div>
                <p className="text-lg font-black text-slate-100 font-mono">
                  {parseFloat(
                    (erpContext.authoritativeBalance !== undefined
                      ? erpContext.authoritativeBalance
                      : erpContext.customer?.current_balance || erpContext.supplier?.current_balance || 0) as any
                  ).toLocaleString('en-US')}{' '}
                  <span className="text-xs font-bold text-slate-400">ر.ي.</span>
                </p>
                <p className="text-[10px] text-emerald-400 font-semibold">
                  {parseFloat((erpContext.customer?.current_balance || erpContext.supplier?.current_balance || 0) as any) > 0
                    ? (erpContext.customer ? '⚠️ رصيد مدين مستحق التحصيل' : '✅ رصيد دائن للمورد مستحق السداد')
                    : parseFloat((erpContext.customer?.current_balance || erpContext.supplier?.current_balance || 0) as any) < 0
                    ? (erpContext.customer ? '✅ رصيد دائن لصالح العميل' : '⚠️ رصيد مدين على المورد')
                    : '✅ الحساب متزن تماماً'}
                </p>
              </div>

              {/* Quick Action ERP Shortcuts */}
              <div className="space-y-1.5 pt-1">
                <p className="text-[11px] font-bold text-slate-400">إجراءات محاسبية فورية عبر واتساب:</p>

                <button
                  onClick={() => {
                    const entityId = erpContext.customer?.id || erpContext.supplier?.id;
                    const type = erpContext.customer ? 'CUSTOMER' : 'SUPPLIER';
                    if (entityId && selectedPhone) {
                      onSendStatement(entityId, type, selectedPhone);
                    }
                  }}
                  className="w-full flex items-center justify-between p-2 rounded-xl bg-slate-800 hover:bg-emerald-500/10 text-slate-200 hover:text-emerald-300 border border-slate-700 hover:border-emerald-500/30 text-xs font-bold transition-colors"
                >
                  <span className="flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5 text-emerald-400" />
                    <span>إرسال كشف الحساب ({erpContext.customer ? 'عميل' : 'مورد'})</span>
                  </span>
                  <ArrowDownLeft className="w-3.5 h-3.5 text-slate-400" />
                </button>

                {erpContext.customer && (
                  <button
                    onClick={() => handleGenerateAIDraft('POLITE_REMINDER')}
                    className="w-full flex items-center justify-between p-2 rounded-xl bg-slate-800 hover:bg-amber-500/10 text-slate-200 hover:text-amber-300 border border-slate-700 hover:border-amber-500/30 text-xs font-bold transition-colors"
                  >
                    <span className="flex items-center gap-1.5">
                      <Flame className="w-3.5 h-3.5 text-amber-400" />
                      <span>تذكير بمطابقة الرصيد</span>
                    </span>
                    <ArrowDownLeft className="w-3.5 h-3.5 text-slate-400" />
                  </button>
                )}
              </div>

              {/* Recent Sales Invoices list (Customer) */}
              {erpContext.recentInvoices && erpContext.recentInvoices.length > 0 && (
                <div className="space-y-2 pt-2 border-t border-slate-800">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-slate-300">آخر فواتير المبيعات</span>
                    <span className="text-[10px] text-slate-500">({erpContext.recentInvoices.length})</span>
                  </div>

                  <div className="space-y-1.5">
                    {erpContext.recentInvoices.map((inv: any) => (
                      <div
                        key={inv.id}
                        className="p-2 rounded-lg border border-slate-800 bg-slate-950/50 flex items-center justify-between text-[11px]"
                      >
                        <div>
                          <p className="font-mono font-bold text-slate-200">#{inv.invoice_number}</p>
                          <p className="text-[10px] text-slate-400 font-mono">
                            المتبقي: {parseFloat(inv.remaining_amount || inv.total).toLocaleString('en-US')} ر.ي.
                          </p>
                        </div>

                        <button
                          onClick={() => selectedPhone && onSendInvoiceReminder(inv.id, selectedPhone)}
                          className="px-2 py-1 rounded bg-emerald-500/20 hover:bg-emerald-600 hover:text-white text-emerald-400 text-[10px] font-bold transition-colors"
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
                <div className="space-y-2 pt-2 border-t border-slate-800">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-slate-300">آخر فواتير المشتريات</span>
                    <span className="text-[10px] text-slate-500">({erpContext.recentPurchaseInvoices.length})</span>
                  </div>

                  <div className="space-y-1.5">
                    {erpContext.recentPurchaseInvoices.map((pinv: any) => (
                      <div
                        key={pinv.id}
                        className="p-2 rounded-lg border border-slate-800 bg-slate-950/50 flex items-center justify-between text-[11px]"
                      >
                        <div>
                          <p className="font-mono font-bold text-slate-200">#{pinv.invoice_number}</p>
                          <p className="text-[10px] text-slate-400 font-mono">
                            الإجمالي: {parseFloat(pinv.total_amount || pinv.total || 0).toLocaleString('en-US')} ر.ي.
                          </p>
                        </div>

                        <button
                          onClick={() => {
                            setMessageInput(
                              `الأخوة شركة ${erpContext.supplier?.name || ''} المحترمين،\nنود تأكيد استلام ومطابقة فاتورة المشتريات رقم #${pinv.invoice_number} البالغ إجماليها ${parseFloat(pinv.total_amount || pinv.total || 0).toLocaleString('en-US')} ر.ي. شاكرين حسن تعاونكم.`
                            );
                          }}
                          className="px-2 py-1 rounded bg-amber-500/20 hover:bg-amber-600 hover:text-white text-amber-300 text-[10px] font-bold transition-colors"
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
                <div className="space-y-2 pt-2 border-t border-slate-800">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-slate-300">
                      {erpContext.customer ? 'آخر سندات القبض' : 'آخر سندات الصرف'}
                    </span>
                  </div>

                  <div className="space-y-1.5">
                    {erpContext.recentPayments.map((pay: any) => (
                      <div
                        key={pay.id}
                        className="p-2 rounded-lg border border-slate-800 bg-slate-950/50 flex items-center justify-between text-[11px]"
                      >
                        <div>
                          <p className="font-mono font-bold text-slate-200">{pay.payment_number || `PAY-${pay.id.slice(0, 6)}`}</p>
                          <p className="text-[10px] text-emerald-400 font-mono font-bold">
                            {parseFloat(pay.amount).toLocaleString('en-US')} ر.ي.
                          </p>
                        </div>

                        <button
                          onClick={() => selectedPhone && onSendPaymentReminder(pay.id, selectedPhone)}
                          className="px-2 py-1 rounded bg-teal-500/20 hover:bg-teal-600 hover:text-white text-teal-300 text-[10px] font-bold transition-colors"
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
                <div className="space-y-2 pt-2 border-t border-slate-800">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-slate-300">المرفقات والوثائق المحاسبية</span>
                    <span className="text-[10px] text-slate-500">({erpContext.relatedAttachments.length})</span>
                  </div>

                  <div className="space-y-1.5">
                    {erpContext.relatedAttachments.map((att: any) => (
                      <div
                        key={att.id}
                        className="p-2 rounded-lg border border-slate-800 bg-slate-950/50 space-y-1.5 text-[11px]"
                      >
                        <div className="flex items-start justify-between gap-1.5">
                          <div className="truncate max-w-[170px]">
                            <p className="font-semibold text-slate-200 truncate">{att.fileName || att.file_name || 'وثيقة'}</p>
                            <p className="text-[10px] text-slate-500 font-mono">
                              {att.fileSize ? `${Math.round(att.fileSize / 1024)} KB` : 'ملف'}
                            </p>
                          </div>
                          <span className="inline-flex items-center gap-0.5 text-[9px] px-1 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-mono">
                            <ShieldCheck className="w-2.5 h-2.5" />
                            <span>SHA-256</span>
                          </span>
                        </div>

                        <div className="flex items-center justify-end gap-1 pt-1 border-t border-slate-800/80">
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedAttachment(att);
                              setMessageInput((prev) => `${prev} مرفق: ${att.fileName || att.file_name}`.trim());
                            }}
                            className="px-2 py-0.5 rounded bg-slate-800 hover:bg-emerald-500/20 hover:text-emerald-300 text-slate-300 text-[10px] font-bold transition-colors flex items-center gap-1"
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
            <div className="p-6 text-center text-slate-500 space-y-2">
              <Info className="w-6 h-6 mx-auto text-slate-600" />
              <p className="text-xs font-semibold text-slate-300">لا تتوفر بيانات محاسبية</p>
              <p className="text-[11px] text-slate-500">
                هذا الرقم غير مرتبط بسجل عميل أو مورد مسجل في النظام المحاسبي بعد.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Linking Modal */}
      {linkingMessage && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-md w-full p-5 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2 text-slate-100 font-bold text-sm">
                <Link className="w-4 h-4 text-emerald-400" />
                <span>ربط رسالة الواتساب بسجل محاسبي (ERP)</span>
              </div>
              <button
                onClick={() => setLinkingMessage(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 text-xs text-slate-300 space-y-1">
              <span className="text-[10px] font-bold text-slate-500">نص الرسالة:</span>
              <p className="line-clamp-2 italic font-sans">{linkingMessage.message_body}</p>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-400 font-bold mb-1">نوع السجل المراد الربط به:</label>
                <select
                  value={linkEntityType}
                  onChange={(e) => setLinkEntityType(e.target.value as any)}
                  className="w-full p-2.5 bg-slate-950 border border-slate-700 rounded-xl text-slate-200 font-medium focus:border-emerald-500 focus:outline-none"
                >
                  <option value="CUSTOMER">عميل (Customer)</option>
                  <option value="SUPPLIER">مورد (Supplier)</option>
                  <option value="INVOICE">فاتورة مبيعات (Sales Invoice)</option>
                  <option value="PURCHASE_INVOICE">فاتورة مشتريات (Purchase Invoice)</option>
                  <option value="PAYMENT">سند مالي (Payment / Receipt)</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-400 font-bold mb-1">المعرف أو الكود المحاسبي (ID):</label>
                <input
                  type="text"
                  value={linkEntityId}
                  onChange={(e) => setLinkEntityId(e.target.value)}
                  placeholder="أدخل معرّف السجل..."
                  className="w-full p-2.5 bg-slate-950 border border-slate-700 rounded-xl text-slate-200 font-mono focus:border-emerald-500 focus:outline-none"
                />
                {/* Context Quick Fill */}
                {(erpContext?.customer || erpContext?.supplier || erpContext?.recentInvoices?.length || erpContext?.recentPurchaseInvoices?.length) && (
                  <div className="mt-2 space-y-1">
                    <span className="text-[10px] text-slate-500 font-bold">اقتراحات سريعة من السياق الحالي:</span>
                    <div className="flex flex-wrap gap-1.5">
                      {erpContext?.customer && (
                        <button
                          type="button"
                          onClick={() => {
                            setLinkEntityType('CUSTOMER');
                            setLinkEntityId(erpContext.customer!.id);
                          }}
                          className="text-[10px] px-2 py-0.5 rounded bg-slate-800 text-slate-300 hover:bg-emerald-500/20 hover:text-emerald-300 border border-slate-700"
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
                          className="text-[10px] px-2 py-0.5 rounded bg-slate-800 text-slate-300 hover:bg-emerald-500/20 hover:text-emerald-300 border border-slate-700"
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
                          className="text-[10px] px-2 py-0.5 rounded bg-slate-800 text-slate-300 hover:bg-emerald-500/20 hover:text-emerald-300 border border-slate-700"
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
                          className="text-[10px] px-2 py-0.5 rounded bg-slate-800 text-slate-300 hover:bg-emerald-500/20 hover:text-emerald-300 border border-slate-700"
                        >
                          فاتورة مشتريات #{erpContext.recentPurchaseInvoices[0].invoice_number}
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setLinkingMessage(null)}
                className="px-3.5 py-1.5 rounded-xl text-slate-400 hover:text-slate-200 text-xs font-bold"
              >
                إلغاء
              </button>
              <button
                type="button"
                onClick={handleExecuteLink}
                disabled={isLinking || !linkEntityId.trim()}
                className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md disabled:opacity-40"
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
