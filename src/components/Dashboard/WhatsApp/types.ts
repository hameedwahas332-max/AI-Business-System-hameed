export interface WhatsAppMessage {
  id: string;
  company_id?: string;
  direction: 'INBOUND' | 'OUTBOUND';
  phone_number: string;
  message_body: string;
  status: 'QUEUED' | 'SENDING' | 'SENT' | 'DELIVERED' | 'READ' | 'FAILED' | 'RETRYING' | 'MOCK_SENT' | 'NEW' | 'RECEIVED';
  reference_id?: string | null;
  meta_message_id?: string | null;
  customer_id?: string | null;
  supplier_id?: string | null;
  message_type?: string;
  media_url?: string | null;
  delivered_at?: string | null;
  read_at?: string | null;
  error_details?: string | null;
  metadata?: any;
  created_at: string;
  customer_name?: string | null;
  customer_account?: string | null;
  supplier_name?: string | null;
}

export interface WhatsAppConversation {
  phone_number: string;
  last_message_id?: string | null;
  last_message: string;
  last_direction: 'INBOUND' | 'OUTBOUND';
  last_status: string;
  last_message_time: string;
  customer_id?: string | null;
  supplier_id?: string | null;
  unread_count: number;
  customer_name?: string | null;
  customer_account_number?: string | null;
  customer_balance?: number | string | null;
  customer_credit_limit?: number | string | null;
  customer_phone?: string | null;
  customer_email?: string | null;
  supplier_name?: string | null;
  supplier_account_number?: string | null;
  supplier_balance?: number | string | null;
  supplier_phone?: string | null;
}

export interface WhatsAppERPContext {
  customer?: any | null;
  supplier?: any | null;
  recentInvoices: any[];
  recentPurchaseInvoices?: any[];
  recentPayments: any[];
  relatedAttachments?: any[];
  authoritativeBalance?: number;
}

export interface WhatsAppTemplate {
  id: string;
  company_id?: string;
  name: string;
  purpose?: string;
  category: 'COLLECTION' | 'SALES' | 'PAYMENT' | 'INVOICE' | 'CUSTOMER_SERVICE' | 'SUPPLIER' | 'MARKETING' | 'SYSTEM';
  audience: 'ALL' | 'CUSTOMERS' | 'SUPPLIERS' | 'OVERDUE' | 'VIP';
  language: string;
  body: string;
  variables: string[];
  status: 'ACTIVE' | 'INACTIVE' | 'DRAFT';
  last_used_at?: string;
  created_by?: string;
  created_at?: string;
}

export interface WhatsAppScheduledMessage {
  id: string;
  company_id?: string;
  recipient_phone: string;
  recipient_name?: string;
  recipient_type?: 'CUSTOMER' | 'SUPPLIER' | 'OTHER';
  recipient_id?: string;
  message_body: string;
  message_type?: string;
  scheduled_at: string;
  status: 'SCHEDULED' | 'SENDING' | 'SENT' | 'FAILED' | 'CANCELLED';
  sent_at?: string;
  failure_reason?: string;
  created_by?: string;
  created_at?: string;
}

export interface WhatsAppAutomation {
  id: string;
  company_id?: string;
  name: string;
  trigger_event: string;
  condition_config?: any;
  action_config?: any;
  audience_filter?: string;
  template_id?: string;
  template_name?: string;
  custom_message?: string;
  is_active: boolean;
  last_run_at?: string | null;
  success_count: number;
  fail_count: number;
  created_at?: string;
}

export interface WhatsAppCampaign {
  id: string;
  company_id?: string;
  name: string;
  target_audience: string;
  template_id?: string;
  message_body: string;
  total_recipients: number;
  sent_count: number;
  delivered_count: number;
  failed_count: number;
  status: 'DRAFT' | 'SCHEDULED' | 'SENDING' | 'COMPLETED' | 'CANCELLED';
  scheduled_at?: string;
  completed_at?: string;
  created_by?: string;
  created_at?: string;
}

export interface WhatsAppKPIStats {
  totalConversations: number;
  unreadCount: number;
  sentToday: number;
  deliveredCount: number;
  readCount: number;
  failedCount: number;
  scheduledCount: number;
  deliveryRate: number;
  responseRatePercent?: number;
  [key: string]: any;
}
