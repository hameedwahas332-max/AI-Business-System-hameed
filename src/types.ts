export interface Company {
  id: string;
  name: string;
  commercialRegister?: string;
  taxNumber?: string;
  address?: string;
  city?: string;
  postalCode?: string;
  phone?: string;
  email?: string;
  currency?: string;
  status?: string;
  created_at?: string;
  updated_at?: string;
}

export interface User {
  id: string;
  username: string;
  full_name?: string;
  email: string;
  role: string;
  company_id: string;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface Role {
  id: string;
  name: string;
  name_ar?: string;
  description?: string;
  permissions?: string[];
  created_at?: string;
}

export interface Customer {
  id: string;
  company_id?: string;
  name: string;
  phone?: string;
  email?: string;
  address?: string;
  balance?: number;
  credit_limit?: number;
  creditLimit?: number;
  tax_number?: string;
  created_at?: string;
}

export interface Supplier {
  id: string;
  company_id?: string;
  name: string;
  phone?: string;
  email?: string;
  category?: string;
  balance?: number;
  tax_number?: string;
  created_at?: string;
}

export interface Product {
  id: string;
  sku: string;
  name: string;
  category?: string;
  price: number;
  cost_price?: number;
  qty: number;
  min_qty?: number;
  status?: string;
  created_at?: string;
}

export interface Invoice {
  id: string;
  company_id?: string;
  customer_id?: string;
  customer?: string;
  customer_name?: string;
  date: string;
  subtotal?: number;
  tax_amount?: number;
  total_amount?: number;
  amount?: number;
  status: string;
  payment_method?: string;
  items?: any[];
  created_at?: string;
}

export interface Payment {
  id: string;
  company_id?: string;
  type: 'RECEIPT' | 'PAYMENT';
  reference_number?: string;
  party_type?: 'CUSTOMER' | 'SUPPLIER';
  party_id?: string;
  party_name?: string;
  amount: number;
  payment_method: string;
  date: string;
  notes?: string;
  created_at?: string;
}
