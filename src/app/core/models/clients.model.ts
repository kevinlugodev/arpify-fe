export type CustomerStatus = 'active' | 'inactive' | 'lead' | 'suspended';

export interface Customer {
  id: string;
  tenant_id: string;
  tax_id: string;
  legal_name: string;
  trade_name: string;
  business_sector: string;
  email: string;
  phone: string;
  website_url: string;
  key_contact_name: string;
  key_contact_role: string;
  key_contact_email: string;
  key_contact_phone: string;
  billing_address: string;
  city: string;
  state_province: string;
  postal_code: string;
  country_code: string;
  default_currency: string;
  payment_terms_days: number;
  credit_limit: number;
  status: CustomerStatus;
  notes: string;
  created_by: string;
  created_at: string;
  updated_at: string;
  deleted_at?: string | null;
}

export interface CreateCustomerRequest {
  tax_id: string;
  legal_name: string;
  trade_name?: string;
  business_sector?: string;
  email?: string;
  phone?: string;
  website_url?: string;
  key_contact_name?: string;
  key_contact_role?: string;
  key_contact_email?: string;
  key_contact_phone?: string;
  billing_address?: string;
  city?: string;
  state_province?: string;
  postal_code?: string;
  country_code: string;
  default_currency: string;
  payment_terms_days?: number;
  credit_limit?: number;
  status?: CustomerStatus;
  notes?: string;
}

export type UpdateCustomerRequest = Partial<CreateCustomerRequest>;

export interface CustomerListResponse {
  items: Customer[];
  total: number;
}

export interface CustomerListFilters {
  status?: CustomerStatus;
  search?: string;
  limit?: number;
  offset?: number;
  [key: string]: string | number | undefined;
}
