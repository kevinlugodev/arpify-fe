export type PartnerDrawType = 'EARNED_DISTRIBUTION' | 'ADVANCE_DRAW' | 'SETTLEMENT_PAYMENT';

export interface PartnerAccount {
  id: string;
  tenant_id: string;
  partner_employee_id: string;
  equity_percentage: number;
  accumulated_earnings: number;
  total_draws_paid: number;
  current_available_balance: number;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface ProfitDistribution {
  id: string;
  tenant_id: string;
  distribution_code: string;
  gross_pool_amount: number;
  reserve_percentage: number;
  reserved_tax_opex_amount: number;
  distributable_net_amount: number;
  distribution_date: string;
  created_at: string;
  updated_at: string;
}

export interface PartnerDrawTransaction {
  id: string;
  tenant_id: string;
  partner_account_id: string;
  profit_distribution_id: string | null;
  bank_transaction_id: string | null;
  type: PartnerDrawType;
  amount: number;
  rhe_document_number: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreatePartnerAccountRequest {
  partner_employee_id: string;
  equity_percentage: number;
}

export type UpdatePartnerAccountRequest = Partial<CreatePartnerAccountRequest>;

export interface PartnerAccountListResponse {
  items: PartnerAccount[];
  total: number;
}

export interface PartnerAccountFilters {
  limit?: number;
  offset?: number;
  [key: string]: string | number | undefined;
}

export interface CreateProfitDistributionRequest {
  distribution_code: string;
  gross_pool_amount: number;
  reserve_percentage: number;
  distribution_date: string;
}

export interface ProfitDistributionListResponse {
  items: ProfitDistribution[];
  total: number;
}

export interface ProfitDistributionFilters {
  limit?: number;
  offset?: number;
  [key: string]: string | number | undefined;
}

export interface CreateAdvanceDrawRequest {
  bank_account_id: string;
  amount: number;
}

export interface CreateSettlementPaymentRequest {
  rhe_document_number: string;
  amount: number;
  notes?: string;
}

export interface PartnerDrawTransactionListResponse {
  items: PartnerDrawTransaction[];
  total: number;
}

export interface PartnerDrawTransactionFilters {
  partner_account_id?: string;
  type?: PartnerDrawType;
  limit?: number;
  offset?: number;
  [key: string]: string | number | undefined;
}

export interface PartnerAccountStatementResponse {
  partner_account: PartnerAccount;
  transactions: PartnerDrawTransaction[];
  total: number;
}
