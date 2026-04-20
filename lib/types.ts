export interface Profile {
  id: string;
  company_name: string;
  owner_name: string;
  pib: string;
  maticni_broj: string;
  address: string;
  city: string;
  zip_code: string;
  phone: string;
  email: string;
  bank_account: string;
  logo_url: string;
  invoice_prefix: string;
  next_invoice_number: number;
  is_admin: boolean;
  created_at: string;
  updated_at: string;
}

export interface Client {
  id: string;
  user_id: string;
  company_name: string;
  contact_name: string;
  pib: string;
  maticni_broj: string;
  address: string;
  city: string;
  zip_code: string;
  email: string;
  phone: string;
  notes: string;
  created_at: string;
  updated_at: string;
}

export type InvoiceStatus = "draft" | "sent" | "paid" | "overdue" | "cancelled";

export interface Invoice {
  id: string;
  user_id: string;
  client_id: string;
  invoice_number: string;
  issue_date: string;
  due_date: string | null;
  status: InvoiceStatus;
  subtotal: number;
  tax_rate: number;
  tax_amount: number;
  total: number;
  currency: string;
  notes: string;
  payment_method: string;
  paid_at: string | null;
  sent_at: string | null;
  created_at: string;
  updated_at: string;
  // Joined
  client?: Client;
  items?: InvoiceItem[];
}

export interface InvoiceItem {
  id: string;
  invoice_id: string;
  description: string;
  quantity: number;
  unit: string;
  unit_price: number;
  total: number;
  sort_order: number;
  created_at: string;
}

export interface DashboardStats {
  totalInvoices: number;
  totalRevenue: number;
  paidCount: number;
  pendingCount: number;
  overdueCount: number;
  totalClients: number;
}
