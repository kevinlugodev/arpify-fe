export type TreasuryCurrency = 'PEN' | 'USD';

export type TransactionType = 'INFLOW' | 'OUTFLOW' | 'TRANSFER';

export type TransactionCategory =
  | 'CUSTOMER_PAYMENT'
  | 'SUPPLIER_PAYMENT'
  | 'RHE_PAYMENT'
  | 'TAX_PAYMENT'
  | 'PAYROLL'
  | 'PARTNER_DRAW'
  | 'BANK_FEE'
  | 'INTERNAL_TRANSFER'
  | 'OTHER';

export type PaymentStatus = 'PENDING' | 'PARTIALLY_PAID' | 'PAID' | 'CANCELLED';

export type ReconciliationStatus = 'UNRECONCILED' | 'MATCHED' | 'DISCREPANCY';

export type PayableDocumentType = 'RHE' | 'INVOICE' | 'TAX_SETTLEMENT';

export interface BankAccount {
  id: string;
  tenant_id: string;
  name: string;
  bank_name: string;
  account_number: string;
  cci: string;
  currency: TreasuryCurrency;
  real_balance: number;
  reserved_amount: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateBankAccountRequest {
  name: string;
  bank_name?: string;
  account_number?: string;
  cci?: string;
  currency: TreasuryCurrency;
  real_balance?: number;
  is_active?: boolean;
}

export type UpdateBankAccountRequest = Partial<CreateBankAccountRequest>;

export interface BankAccountListResponse {
  items: BankAccount[];
  total: number;
}

export interface BankAccountFilters {
  active_only?: boolean;
  limit?: number;
  offset?: number;
  [key: string]: string | number | boolean | undefined;
}

export interface Payable {
  id: string;
  tenant_id: string;
  bank_account_id: string | null;
  document_type: PayableDocumentType;
  document_number: string;
  entity_name: string;
  gross_amount: number;
  retention_amount: number;
  net_amount: number;
  paid_amount: number;
  status: PaymentStatus;
  due_date: string;
  notes: string;
  created_at: string;
  updated_at: string;
}

export interface CreatePayableRequest {
  bank_account_id?: string | null;
  document_type: PayableDocumentType;
  document_number?: string;
  entity_name: string;
  gross_amount: number;
  retention_amount?: number;
  net_amount: number;
  paid_amount?: number;
  status?: PaymentStatus;
  due_date?: string;
  notes?: string;
}

export type UpdatePayableRequest = Partial<CreatePayableRequest>;

export interface PayableListResponse {
  items: Payable[];
  total: number;
}

export interface PayableFilters {
  status?: PaymentStatus;
  limit?: number;
  offset?: number;
  [key: string]: string | number | undefined;
}

export interface BankTransaction {
  id: string;
  tenant_id: string;
  bank_account_id: string;
  destination_bank_account_id: string | null;
  type: TransactionType;
  category: TransactionCategory;
  amount: number;
  currency: TreasuryCurrency;
  exchange_rate: number;
  transaction_date: string;
  operation_number: string;
  reconciliation_status: ReconciliationStatus;
  payable_id: string | null;
  notes: string;
  reversed_transaction_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateBankTransactionRequest {
  bank_account_id: string;
  destination_bank_account_id?: string | null;
  type: TransactionType;
  category: TransactionCategory;
  amount: number;
  currency: TreasuryCurrency;
  exchange_rate: number;
  transaction_date: string;
  operation_number?: string;
  reconciliation_status?: ReconciliationStatus;
  payable_id?: string | null;
  notes?: string;
}

export interface BankTransactionListResponse {
  items: BankTransaction[];
  total: number;
}

export interface BankTransactionFilters {
  bank_account_id?: string;
  type?: TransactionType;
  limit?: number;
  offset?: number;
  [key: string]: string | number | undefined;
}

export interface ReverseBankTransactionResponse {
  bank_transaction: BankTransaction;
}
