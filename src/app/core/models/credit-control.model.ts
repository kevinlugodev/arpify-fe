export type CreditScheduleStatus = 'PENDING' | 'PARTIALLY_PAID' | 'PAID_ON_TIME' | 'PAID_LATE' | 'DEFAULTED';

export type ContactChannel = 'EMAIL' | 'PHONE' | 'WHATSAPP';

export type AgingBucket = 'CURRENT' | 'OVERDUE_1_30' | 'OVERDUE_31_60' | 'OVERDUE_61_90' | 'OVERDUE_90_PLUS';

export interface CreditAccountSchedule {
  id: string;
  tenant_id: string;
  receivable_id: string;
  customer_id: string | null;
  original_due_date: string;
  actual_payment_date: string | null;
  invoice_amount: number;
  paid_amount: number;
  days_overdue: number;
  is_late_payment: boolean;
  collection_status: CreditScheduleStatus;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface CollectionLog {
  id: string;
  tenant_id: string;
  credit_account_schedule_id: string;
  contact_date: string;
  contact_channel: ContactChannel;
  notes: string;
  next_follow_up_date: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateCreditScheduleRequest {
  receivable_id: string;
  customer_id?: string | null;
  original_due_date: string;
  invoice_amount: number;
}

export type UpdateCreditScheduleRequest = Partial<CreateCreditScheduleRequest>;

export interface RecordPaymentRequest {
  actual_payment_date: string;
  paid_amount: number;
}

export interface CreateCollectionLogRequest {
  credit_account_schedule_id: string;
  contact_date: string;
  contact_channel: ContactChannel;
  notes: string;
  next_follow_up_date?: string | null;
}

export type UpdateCollectionLogRequest = Partial<CreateCollectionLogRequest>;

export interface CreditScheduleListResponse {
  items: CreditAccountSchedule[];
  total: number;
}

export interface CreditScheduleFilters {
  status?: CreditScheduleStatus;
  customer_id?: string;
  limit?: number;
  offset?: number;
  [key: string]: string | number | undefined;
}

export interface CollectionLogListResponse {
  items: CollectionLog[];
  total: number;
}

export interface CollectionLogFilters {
  schedule_id?: string;
  limit?: number;
  offset?: number;
  [key: string]: string | number | undefined;
}

export interface AgingBucketSummary {
  total: number;
  count: number;
}

export interface AgingReport {
  buckets: Record<AgingBucket, AgingBucketSummary>;
  total_outstanding: number;
  total_count: number;
}
