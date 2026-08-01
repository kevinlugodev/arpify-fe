export type TreasuryCurrency = 'PEN' | 'USD';

export interface Bank {
  id: string;
  name: string;
  short_name: string;
  code: string;
  country_code: string;
  swift_code: string | null;
  sbs_code: string | null;
  website_url: string | null;
  logo_url: string | null;
  icon: string | null;
  sort_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface BankListResponse {
  items: Bank[];
  total: number;
}

export interface BankFilters {
  active_only?: boolean;
  country_code?: string;
  limit?: number;
  offset?: number;
  [key: string]: string | number | boolean | undefined;
}

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
  | 'SERVICE_ORDER_ADVANCE'
  | 'PETTY_CASH_FUNDING'
  | 'PETTY_CASH_EXPENSE'
  | 'OTHER';

export type PaymentStatus = 'PENDING' | 'PARTIALLY_PAID' | 'PAID' | 'CANCELLED';

export type ReconciliationStatus = 'UNRECONCILED' | 'MATCHED' | 'DISCREPANCY';

export type PayableDocumentType = 'RHE' | 'INVOICE' | 'TAX_SETTLEMENT';

export interface BankAccount {
  id: string;
  tenant_id: string;
  bank_id: string;
  bank_name: string;
  name: string;
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
  bank_id: string;
  name: string;
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

export type ServiceOrderStatus = 'DRAFT' | 'APPROVED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';

export type AdvanceApplicationStatus = 'UNAPPLIED' | 'PARTIALLY_APPLIED' | 'FULLY_APPLIED';

export interface ServiceOrder {
  id: string;
  tenant_id: string;
  supplier_ruc: string | null;
  supplier_name: string;
  description: string;
  total_amount: number;
  advance_amount_paid: number;
  advance_amount_applied: number;
  status: ServiceOrderStatus;
  created_at: string;
  updated_at: string;
}

export interface ServiceOrderListResponse {
  items: ServiceOrder[];
  total: number;
}

export interface ServiceOrderFilters {
  status?: ServiceOrderStatus;
  supplier_name?: string;
  limit?: number;
  offset?: number;
  [key: string]: string | number | boolean | undefined;
}

export interface ServiceOrderAdvance {
  id: string;
  tenant_id: string;
  service_order_id: string;
  bank_account_id: string;
  bank_transaction_id: string;
  amount: number;
  currency: TreasuryCurrency;
  application_status: AdvanceApplicationStatus;
  transaction_date: string;
  created_at: string;
  updated_at: string;
}

export interface CreateServiceOrderRequest {
  supplier_ruc?: string | null;
  supplier_name: string;
  description: string;
  total_amount: number;
  status?: ServiceOrderStatus;
}

export type UpdateServiceOrderRequest = Partial<CreateServiceOrderRequest>;

export interface CreateServiceOrderAdvanceRequest {
  bank_account_id: string;
  amount: number;
  currency: TreasuryCurrency;
  transaction_date: string;
  operation_number?: string;
  notes?: string;
}

export interface LinkServiceOrderPayableRequest {
  payable_id: string;
}

export interface PettyCashFund {
  id: string;
  tenant_id: string;
  name: string;
  responsible_name: string;
  currency: TreasuryCurrency;
  real_balance: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface PettyCashFundListResponse {
  items: PettyCashFund[];
  total: number;
}

export interface PettyCashFundFilters {
  is_active?: boolean;
  limit?: number;
  offset?: number;
  [key: string]: string | number | boolean | undefined;
}

export interface CreatePettyCashFundRequest {
  name: string;
  responsible_name: string;
  currency: TreasuryCurrency;
}

export type UpdatePettyCashFundRequest = Partial<CreatePettyCashFundRequest> & {
  is_active?: boolean;
};

export interface ReplenishPettyCashFundRequest {
  bank_account_id: string;
  amount: number;
  currency: TreasuryCurrency;
  exchange_rate?: number;
  transaction_date: string;
  operation_number?: string;
  notes?: string;
}

export interface CreatePettyCashExpenseRequest {
  amount: number;
  currency: TreasuryCurrency;
  transaction_date: string;
  description: string;
  notes?: string;
}

export interface BankStatementItem {
  id: string;
  tenant_id: string;
  bank_statement_id: string;
  transaction_date: string;
  operation_number: string;
  description: string;
  amount: number;
  type: TransactionType;
  is_matched: boolean;
  bank_transaction_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface BankStatement {
  id: string;
  tenant_id: string;
  bank_account_id: string;
  file_name: string;
  period_start_date: string;
  period_end_date: string;
  items?: BankStatementItem[];
  created_at: string;
  updated_at: string;
}

export interface BankStatementListResponse {
  items: BankStatement[];
  total: number;
}

export interface BankStatementFilters {
  bank_account_id?: string;
  limit?: number;
  offset?: number;
  [key: string]: string | number | boolean | undefined;
}

export interface CreateBankStatementRequest {
  bank_account_id: string;
  file_name: string;
  period_start_date: string;
  period_end_date: string;
  items: Array<{
    transaction_date: string;
    operation_number?: string;
    description: string;
    amount: number;
    type: TransactionType;
  }>;
}

export interface MatchBankStatementItemRequest {
  bank_transaction_id: string;
}

export interface CashFlowForecastItem {
  date: string;
  projected_balance: number;
  pending_inflows: number;
  pending_outflows: number;
}

export interface CashFlowForecast {
  base_date: string;
  items: CashFlowForecastItem[];
  total_bank_accounts: number;
}

export interface CashFlowForecastFilters {
  start_date: string;
  end_date: string;
  interval_days?: number;
  [key: string]: string | number | undefined;
}
