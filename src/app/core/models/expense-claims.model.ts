export type ExpenseClaimStatus = 'DRAFT' | 'SUBMITTED' | 'APPROVED' | 'SETTLED' | 'REJECTED';

export type ExpenseClaimDocumentType = 'INVOICE' | 'BOLETA' | 'RECEIPT' | 'TICKET';

export type ExpenseClaimCategory = 'TRAVEL' | 'MEALS' | 'SUPPLIES' | 'TRANSPORT' | 'OTHER';

export interface ExpenseClaim {
  id: string;
  tenant_id: string;
  claim_number: string;
  employee_id: string;
  title: string;
  purpose: string;
  total_advanced: number;
  total_expenses: number;
  balance_amount: number;
  status: ExpenseClaimStatus;
  submission_date: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface ExpenseClaimItem {
  id: string;
  tenant_id: string;
  expense_claim_id: string;
  document_type: ExpenseClaimDocumentType;
  document_number: string;
  supplier_name: string;
  supplier_tax_id: string;
  expense_date: string;
  amount: number;
  currency: string;
  category: ExpenseClaimCategory;
  created_at: string;
  updated_at: string;
}

export interface ExpenseClaimListResponse {
  items: ExpenseClaim[];
  total: number;
}

export interface ExpenseClaimFilters {
  status?: ExpenseClaimStatus;
  search?: string;
  employee_id?: string;
  limit?: number;
  offset?: number;
  [key: string]: string | number | undefined;
}

export interface CreateExpenseClaimRequest {
  claim_number: string;
  employee_id: string;
  title: string;
  purpose?: string;
  total_advanced: number;
}

export type UpdateExpenseClaimRequest = Partial<CreateExpenseClaimRequest>;

export interface CreateExpenseClaimItemRequest {
  document_type: ExpenseClaimDocumentType;
  document_number: string;
  supplier_name: string;
  supplier_tax_id?: string;
  expense_date: string;
  amount: number;
  currency: string;
  category: ExpenseClaimCategory;
}

export type UpdateExpenseClaimItemRequest = Partial<CreateExpenseClaimItemRequest>;

export interface SettleExpenseClaimRequest {
  bank_account_id?: string;
  petty_cash_fund_id?: string;
}

export interface ExpenseClaimItemListResponse {
  items: ExpenseClaimItem[];
  total: number;
}
