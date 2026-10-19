import React, { useState, useEffect } from 'react';
import { api } from '../../api';
import { safeFetchJson } from '../../lib/safeFetch';
import { formatCustomerAmount } from '../../lib/formatters';
import { Bot, Sparkles, Send, MessageSquare, AlertCircle, CheckCircle2, ArrowRight, Lightbulb, PhoneCall, Copy, Check, RefreshCw } from 'lucide-react';

export const AIAssistantTab: React.FC = () => {
  const [activeSubTab, setActiveSubTab] = useState<'chat' | 'insights' | 'messaging'>('chat');

  // Chat State
  const [conversationId, setConversationId] = useState<string>('new');
  const [messages, setMessages] = useState<Array<{
    id: string;
    sender: 'user' | 'assistant';
    content: string;
    toolCalls?: any[];
    proposedAction?: any;
    createdAt?: string;
  }>>([
    {
      id: 'welcome',
      sender: 'assistant',
      content: 'مرحباً بك! أنا مساعدك الذكي للأعمال (Arabic AI Business Assistant). يمكنني إجابة استفساراتك المالية، استخراج المبيعات والمخزون، صياغة إشعارات السداد للعملاء، وإعداد مسودات الفواتير المعتمدة بالتأكيد البشري.',
    },
  ]);
  const [input, setInput] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [confirmingAction, setConfirmingAction] = useState<any | null>(null);
  const [confirmStatus, setConfirmStatus] = useState<string | null>(null);

  // Smart Insights State
  const [insights, setInsights] = useState<any[]>([]);
  const [isLoadingInsights, setIsLoadingInsights] = useState(false);

  // Message Drafting State
  const [customers, setCustomers] = useState<any[]>([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [messageType, setMessageType] = useState<'REMINDER' | 'STATEMENT' | 'THANK_YOU'>('REMINDER');
  const [draftResult, setDraftResult] = useState<any | null>(null);
  const [isDrafting, setIsDrafting] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    fetchInsights();
    fetchCustomers();
  }, []);

  const fetchInsights = async () => {
    setIsLoadingInsights(true);
    try {
      const token = api.getToken();
      const res = await fetch('/api/v1/ai/insights', {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });
      const data = await res.json();
      if (data.data) {
        setInsights(data.data);
      }
    } catch (err) {
      console.error('Failed to fetch smart insights', err);
    } finally {
      setIsLoadingInsights(false);
    }
  };

  const fetchCustomers = async () => {
    try {
      const token = api.getToken();
      const res = await fetch('/api/v1/customers', {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });
      const data = await res.json();
      if (data.data) {
        setCustomers(data.data);
        if (data.data.length > 0) setSelectedCustomerId(data.data[0].id);
      }
    } catch (err) {
      console.error('Failed to fetch customers', err);
    }
  };

  const handleSend = async (e?: React.FormEvent, customText?: string) => {
    if (e) e.preventDefault();
    const textToSend = customText || input;
    if (!textToSend.trim() || isSending) return;

    const userMsgId = `usr_${Date.now()}`;
    setMessages((prev) => [...prev, { id: userMsgId, sender: 'user', content: textToSend }]);
    if (!customText) setInput('');
    setIsSending(true);

    try {
      const token = api.getToken();
      const res = await safeFetchJson(`/api/v1/ai/conversations/${conversationId}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify({ message: textToSend })
      });

      if (!res.ok || !res.data) {
        throw new Error(res.error || res.data?.error?.message || 'فشل معالجة الطلب');
      }

      const data = res.data;
      if (data.data?.conversationId) {
        setConversationId(data.data.conversationId);
      }

      const asstMsg = {
        id: `asst_${Date.now()}`,
        sender: 'assistant' as const,
        content: data.data?.responseMessage || 'تم معالجة استفسارك بنجاح.',
        toolCalls: data.data?.toolCallsExecuted,
        proposedAction: data.data?.proposedAction
      };

      setMessages((prev) => [...prev, asstMsg]);

      if (data.data?.proposedAction) {
        setConfirmingAction(data.data.proposedAction);
      }
    } catch (err: any) {
      setMessages((prev) => [
        ...prev,
        {
          id: `err_${Date.now()}`,
          sender: 'assistant',
          content: `تنبيه: ${err.message || 'حدث خطأ في التواصل مع المساعد الذكي'}`
        }
      ]);
    } finally {
      setIsSending(false);
    }
  };

  const handleConfirmAction = async () => {
    if (!confirmingAction) return;
    setConfirmStatus('جاري الاعتماد المحاسبي المزدوج...');

    try {
      const token = api.getToken();
      const res = await safeFetchJson('/api/v1/ai/actions/confirm', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify({ proposedAction: confirmingAction })
      });

      if (!res.ok || !res.data) {
        throw new Error(res.error || res.data?.error?.message || 'فشل اعتماد الإجراء');
      }

      setConfirmStatus(`تم الاعتماد بنجاح! ${res.data.data?.message || 'تم الترحيل بنجاح'}`);
      setConfirmingAction(null);
    } catch (err: any) {
      setConfirmStatus(`خطأ في الاعتماد: ${err.message}`);
    }
  };

  const handleGenerateDraftMessage = async () => {
    if (!selectedCustomerId) return;
    setIsDrafting(true);
    setDraftResult(null);

    try {
      const token = api.getToken();
      const res = await safeFetchJson('/api/v1/ai/draft-message', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify({ customerId: selectedCustomerId, messageType })
      });

      if (res.ok && res.data?.data) {
        setDraftResult(res.data.data);
      }
    } catch (err) {
      console.error('Failed to draft message', err);
    } finally {
      setIsDrafting(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-6 text-right text-slate-100 font-sans" dir="rtl">
      
      {/* Header Banner */}
      <div className="p-5 rounded-2xl bg-slate-900 border border-emerald-900/50 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <Bot className="w-5 h-5 text-emerald-400" />
            <span>المساعد الذكي للأعمال (AI Business Assistant)</span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            تحليل مالي فوري، استشارات ذكية، صياغة إشعارات السداد، وإعداد المسودات المؤكدة بشرط الاعتماد البشري
          </p>
        </div>

        {/* Sub-tab navigation pill */}
        <div className="flex items-center gap-1 p-1 bg-slate-950 rounded-xl text-xs font-medium border border-slate-800">
          <button
            onClick={() => setActiveSubTab('chat')}
            className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
              activeSubTab === 'chat' ? 'bg-emerald-600 text-white font-bold shadow-md shadow-emerald-950/50' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            المحادثة والمسودات
          </button>
          <button
            onClick={() => setActiveSubTab('insights')}
            className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
              activeSubTab === 'insights' ? 'bg-emerald-600 text-white font-bold shadow-md shadow-emerald-950/50' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            الرؤى والتحليلات الذكية
          </button>
          <button
            onClick={() => setActiveSubTab('messaging')}
            className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
              activeSubTab === 'messaging' ? 'bg-emerald-600 text-white font-bold shadow-md shadow-emerald-950/50' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            مراسل المطالبات والمطالبات
          </button>
        </div>
      </div>

      {activeSubTab === 'chat' && (
        <div className="space-y-4">
          
          {/* Quick Prompts Bar */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs">
            <span className="text-slate-400 font-medium shrink-0">أسئلة سريعة:</span>
            {[
              'كم إجمالي المبيعات والأرباح هذا الشهر؟',
              'من أكبر العملاء وأكثرهم ديوناً؟',
              'هل يوجد أصناف مخزون منخفضة؟',
              'أنشئ فاتورة مبيعات مسودة جديدة'
            ].map((prompt, i) => (
              <button
                key={i}
                onClick={() => handleSend(undefined, prompt)}
                className="px-3 py-1.5 bg-slate-900 border border-slate-700 hover:border-emerald-600 hover:bg-slate-800 text-slate-300 rounded-full transition-all shrink-0 font-medium cursor-pointer"
              >
                {prompt}
              </button>
            ))}
          </div>

          {/* Chat Container */}
          <div className="bg-slate-900 border border-emerald-900/50 rounded-2xl p-4 h-[520px] flex flex-col justify-between shadow-xl">
            
            {/* Messages Display */}
            <div className="space-y-4 overflow-y-auto p-2">
              {messages.map((m) => (
                <div key={m.id} className="space-y-2">
                  <div className={`flex items-start gap-2.5 text-xs ${m.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                    {m.sender === 'assistant' && (
                      <div className="p-1.5 bg-emerald-950 text-emerald-400 rounded-lg shrink-0 border border-emerald-800/80">
                        <Sparkles className="w-4 h-4" />
                      </div>
                    )}
                    <div className={`p-3.5 rounded-2xl max-w-xl leading-relaxed whitespace-pre-wrap ${
                      m.sender === 'user'
                        ? 'bg-emerald-600 text-white font-medium rounded-tl-none shadow-md shadow-emerald-950/40'
                        : 'bg-slate-950 border border-slate-800 text-slate-200 rounded-tr-none'
                    }`}>
                      {m.content}

                      {/* Render Executed Tool Badges */}
                      {m.toolCalls && m.toolCalls.length > 0 && (
                        <div className="mt-2.5 pt-2 border-t border-slate-800/80 flex flex-wrap gap-1.5">
                          {m.toolCalls.map((tc, idx) => (
                            <span key={idx} className="text-[10px] px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-800 font-mono">
                              ✓ أداة: {tc.toolName}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}

              {isSending && (
                <div className="flex items-center gap-2 text-xs text-emerald-400 font-medium py-2">
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>جاري استشارة السجلات المحاسبية والتحليل الفوري...</span>
                </div>
              )}
            </div>

            {/* Proposed Action Confirmation Card overlay */}
            {confirmingAction && (
              <div className="m-2 p-4 bg-slate-950 border border-amber-600/60 rounded-xl text-xs space-y-3 shadow-xl">
                <div className="flex items-center justify-between">
                  <div className="font-bold text-amber-400 flex items-center gap-1.5">
                    <AlertCircle className="w-4 h-4 text-amber-400" />
                    <span>طلب تأكيد إجراء مالية (تأكيد بشرية مطلوب)</span>
                  </div>
                  <span className="text-[10px] px-2 py-0.5 rounded bg-amber-950 text-amber-300 border border-amber-800 font-mono font-bold">
                    PENDING HUMAN APPROVAL
                  </span>
                </div>

                <div className="p-3 bg-slate-900 rounded-lg border border-amber-900/50 text-slate-200 font-mono space-y-1">
                  <p><span className="text-slate-400">نوع الإجراء:</span> {confirmingAction.type}</p>
                  <p><span className="text-slate-400">البيانات:</span> {JSON.stringify(confirmingAction.data)}</p>
                </div>

                {confirmStatus && <p className="font-bold text-emerald-400">{confirmStatus}</p>}

                <div className="flex items-center justify-end gap-2">
                  <button
                    onClick={() => setConfirmingAction(null)}
                    className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-semibold cursor-pointer"
                  >
                    إلغاء
                  </button>
                  <button
                    onClick={handleConfirmAction}
                    className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-lg shadow-emerald-950/50 cursor-pointer"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>تأكيد واعتماد الإجراء المالي</span>
                  </button>
                </div>
              </div>
            )}

            {/* Input Form */}
            <form onSubmit={handleSend} className="flex gap-2 pt-3 border-t border-slate-800">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="اسأل المساعد الذكي عن الأرباح، المبيعات، المخزون، أو أنشئ مسودة فاتورة..."
                className="flex-1 px-4 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition-colors"
              />
              <button
                type="submit"
                disabled={isSending}
                className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-800 text-white rounded-xl text-xs font-bold transition-all shadow-lg shadow-emerald-950/50 flex items-center gap-1.5 cursor-pointer"
              >
                <span>إرسال</span>
                <Send className="w-3.5 h-3.5" />
              </button>
            </form>

          </div>

        </div>
      )}

      {/* Smart Insights Subtab */}
      {activeSubTab === 'insights' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Lightbulb className="w-4 h-4 text-amber-400" />
              <span>الرؤى والتوصيات الذكية الشاملة (Fact / Calc / Interpretation / Recommendation)</span>
            </h3>
            <button
              onClick={fetchInsights}
              className="text-xs text-emerald-400 hover:text-emerald-300 flex items-center gap-1 font-semibold cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoadingInsights ? 'animate-spin' : ''}`} />
              <span>تحديث الرؤى</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {insights.map((insight) => (
              <div key={insight.id} className="p-4 rounded-2xl bg-slate-900 border border-emerald-900/40 shadow-xl space-y-2">
                <div className="flex items-center justify-between">
                  <span className={`text-[10px] px-2 py-0.5 rounded font-mono font-bold ${
                    insight.category === 'FACT' ? 'bg-blue-950 text-blue-300 border border-blue-800' :
                    insight.category === 'CALCULATION' ? 'bg-purple-950 text-purple-300 border border-purple-800' :
                    insight.category === 'INTERPRETATION' ? 'bg-amber-950 text-amber-300 border border-amber-800' :
                    'bg-emerald-950 text-emerald-300 border border-emerald-800'
                  }`}>
                    {insight.category}
                  </span>
                  <span className={`text-[10px] font-bold ${
                    insight.impact === 'HIGH' ? 'text-rose-400' : 'text-slate-400'
                  }`}>
                    أهمية {insight.impact}
                  </span>
                </div>

                <h4 className="text-xs font-bold text-white">{insight.title}</h4>
                <p className="text-xs text-slate-300 leading-relaxed">{insight.description}</p>

                {insight.actionableStep && (
                  <div className="pt-2 border-t border-slate-800 text-xs font-semibold text-emerald-400 flex items-center gap-1">
                    <ArrowRight className="w-3.5 h-3.5 text-emerald-400" />
                    <span>التوصية التنفيذية: {insight.actionableStep}</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Customer Message Drafting Subtab */}
      {activeSubTab === 'messaging' && (
        <div className="bg-slate-900 border border-emerald-900/50 rounded-2xl p-5 space-y-5 shadow-xl">
          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <PhoneCall className="w-4 h-4 text-emerald-400" />
              <span>صياغة رسائل المطالبات والواتساب الذكية</span>
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              إعداد رسائل مطالبات الديون باللغة العربية بأسلوب مهني مبني على أرصدة دقيقة
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
            <div>
              <label className="block text-slate-300 font-medium mb-1">اختر العميل</label>
              <select
                value={selectedCustomerId}
                onChange={(e) => setSelectedCustomerId(e.target.value)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white text-xs focus:outline-none focus:border-emerald-500 transition-colors"
              >
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} (رصيد مستحق: {formatCustomerAmount(c.current_balance)} ريال)
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-slate-300 font-medium mb-1">نوع الرسالة</label>
              <select
                value={messageType}
                onChange={(e) => setMessageType(e.target.value as any)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white text-xs focus:outline-none focus:border-emerald-500 transition-colors"
              >
                <option value="REMINDER">تذكير بسداد المستحقات المتأخرة</option>
                <option value="STATEMENT">كشف حساب ملخص</option>
                <option value="THANK_YOU">رسالة شكر وتقدير للسداد</option>
              </select>
            </div>

            <div className="flex items-end">
              <button
                onClick={handleGenerateDraftMessage}
                disabled={isDrafting}
                className="w-full py-2 bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-800 text-white rounded-xl text-xs font-bold shadow-lg shadow-emerald-950/50 flex items-center justify-center gap-1.5 cursor-pointer transition-all"
              >
                {isDrafting ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                <span>صياغة الرسالة الذكية</span>
              </button>
            </div>
          </div>

          {draftResult && (
            <div className="p-4 bg-slate-950 border border-emerald-900/40 rounded-xl space-y-3">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-white">صياغة الرسالة المهنية لـ: {draftResult.customerName}</span>
                <span className="text-slate-400 font-mono">الهاتف: {draftResult.recipientPhone || 'غير مسجل'}</span>
              </div>

              <div className="p-3 bg-slate-900 rounded-lg border border-slate-800 text-xs text-slate-100 whitespace-pre-wrap font-sans leading-relaxed">
                {draftResult.draftText}
              </div>

              <div className="flex items-center justify-end gap-2">
                <button
                  onClick={() => copyToClipboard(draftResult.draftText)}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-emerald-300 border border-emerald-900/40 rounded-lg text-xs font-semibold flex items-center gap-1 cursor-pointer transition-colors"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copied ? 'تم النسخ!' : 'نسخ الرسالة'}</span>
                </button>
              </div>
            </div>
          )}

        </div>
      )}

    </div>
  );
};
