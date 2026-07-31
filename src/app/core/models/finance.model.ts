export type TaxRegime = 'general' | 'mype_tributario' | 'rer' | 'regimen_especial';

export type TaxPeriodStatus = 'draft' | 'declared' | 'paid' | 'closed';

export type InvoiceFlow = 'sale' | 'purchase';

export type InvoiceType = '01' | '03' | '07' | '08' | '09' | '12' | '40';

export type PayrollPeriodStatus = 'draft' | 'approved' | 'paid' | 'closed';

export type PensionSystem = 'ONP' | 'AFP' | 'MIXED' | 'EXCLUDED';

export type FeeReceiptStatus = 'draft' | 'declared' | 'paid' | 'canceled';

export type SecondCategoryIncomeType = 'dividends' | 'interest' | 'royalties' | 'others';

export type SecondCategoryIncomeStatus = 'draft' | 'declared' | 'paid';

export type DetractionStatus = 'pending' | 'deposited' | 'applied';

export type ProrrataCalculationStatus = 'draft' | 'calculated' | 'applied';

export type SUNATValidationType = 'ruc' | 'dni' | 'receipt';

export type SUNATDeclarationType = 'sire_sales' | 'sire_purchases' | 'ple_sales' | 'ple_purchases' | 'plame';

export type SUNATDeclarationFileStatus = 'pending' | 'generated' | 'submitted';

export interface Representative {
  name: string;
  document: string;
  position: string;
}

export interface TaxProfile {
  id: string;
  tenant_id: string;
  legal_name: string;
  commercial_name: string;
  ruc: string;
  tax_regime: TaxRegime;
  address: string;
  phone: string;
  mobile: string;
  main_activity_code: string;
  main_activity_name: string;
  is_good_taxpayer: boolean;
  is_withholding_agent: boolean;
  activity_start_date: string;
  representatives: Representative[];
  created_at: string;
  updated_at: string;
}

export interface CreateTaxProfileRequest {
  legal_name: string;
  commercial_name?: string;
  ruc: string;
  tax_regime: TaxRegime;
  address?: string;
  phone?: string;
  mobile?: string;
  main_activity_code?: string;
  main_activity_name?: string;
  is_good_taxpayer?: boolean;
  is_withholding_agent?: boolean;
  activity_start_date?: string;
  representatives?: Representative[];
}

export type UpdateTaxProfileRequest = Partial<CreateTaxProfileRequest>;

export interface TaxPeriod {
  id: string;
  tenant_id: string;
  year: number;
  month: number;
  status: TaxPeriodStatus;
  due_date: string | null;
  declared_at: string | null;
  paid_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateTaxPeriodRequest {
  year: number;
  month: number;
  status: TaxPeriodStatus;
  due_date?: string | null;
}

export interface UpdateTaxPeriodRequest {
  status?: TaxPeriodStatus;
  due_date?: string | null;
}

export interface TaxPeriodListResponse {
  items: TaxPeriod[];
  total: number;
}

export interface Invoice {
  id: string;
  tenant_id: string;
  tax_period_id: string;
  flow: InvoiceFlow;
  document_type: InvoiceType;
  serie: string;
  number: string;
  issue_date: string;
  due_date: string | null;
  customer_ruc: string;
  customer_name: string;
  supplier_ruc: string;
  supplier_name: string;
  taxable_amount: number;
  tax_amount: number;
  exempt_amount: number;
  inafect_amount: number;
  isc_amount: number;
  icbper_amount: number;
  other_taxes_amount: number;
  total_amount: number;
  currency: string;
  exchange_rate: number;
  modified_document_id: string | null;
  is_detraction: boolean;
  detraction_amount: number;
  sunat_status: string;
  created_at: string;
  updated_at: string;
}

export interface CreateInvoiceRequest {
  tax_period_id: string;
  flow: InvoiceFlow;
  document_type: InvoiceType;
  serie: string;
  number: string;
  issue_date: string;
  due_date?: string | null;
  customer_ruc?: string;
  customer_name?: string;
  supplier_ruc?: string;
  supplier_name?: string;
  taxable_amount?: number;
  tax_amount?: number;
  exempt_amount?: number;
  inafect_amount?: number;
  isc_amount?: number;
  icbper_amount?: number;
  other_taxes_amount?: number;
  total_amount: number;
  currency: string;
  exchange_rate: number;
  modified_document_id?: string | null;
  is_detraction?: boolean;
  detraction_amount?: number;
  sunat_status?: string;
}

export type UpdateInvoiceRequest = Partial<CreateInvoiceRequest>;

export interface BulkImportInvoicesRequest {
  tax_period_id: string;
  flow: InvoiceFlow;
  invoices: CreateInvoiceRequest[];
}

export interface BulkImportInvoicesResponse {
  imported: number;
}

export interface InvoiceListFilters {
  tax_period_id?: string;
  flow?: InvoiceFlow;
  document_type?: InvoiceType;
  serie?: string;
  number?: string;
  counterparty_ruc?: string;
  limit?: number;
  offset?: number;
  [key: string]: string | number | undefined;
}

export interface InvoiceListResponse {
  items: Invoice[];
  total: number;
}

export interface Concept {
  id: string;
  tax_calculation_id: string;
  code: string;
  name: string;
  base_amount: number;
  tax_amount: number;
  payment_amount: number;
  order_index: number;
}

export interface TaxCalculation {
  id: string;
  tenant_id: string;
  tax_period_id: string;
  igv_net_sales: number;
  igv_tax_debit: number;
  igv_tax_credit: number;
  igv_result: number;
  igv_credit_balance: number;
  income_tax_coefficient: number;
  income_tax_net_income: number;
  income_tax_payment: number;
  itan_quota: number;
  total_to_pay: number;
  concepts: Concept[];
  created_at: string;
  updated_at: string;
}

export interface PayrollPeriod {
  id: string;
  tenant_id: string;
  tax_period_id: string;
  year: number;
  month: number;
  status: PayrollPeriodStatus;
  paid_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreatePayrollPeriodRequest {
  tax_period_id: string;
  year: number;
  month: number;
  status: PayrollPeriodStatus;
}

export interface UpdatePayrollPeriodRequest {
  status?: PayrollPeriodStatus;
  paid_at?: string | null;
}

export interface PayrollEntry {
  id: string;
  tenant_id: string;
  payroll_period_id: string;
  team_member_id: string | null;
  document_type: string;
  document_number: string;
  full_name: string;
  pension_system: PensionSystem;
  salary: number;
  family_allowance: number;
  vacation_pay: number;
  overtime_pay: number;
  commissions: number;
  bonuses: number;
  total_income: number;
  pension_contribution: number;
  invalidity_insurance: number;
  afp_commission: number;
  fifth_category_tax: number;
  other_deductions: number;
  total_deductions: number;
  essalud_contribution: number;
  net_pay: number;
  created_at: string;
  updated_at: string;
}

export interface CreatePayrollEntryRequest {
  team_member_id?: string | null;
  document_type: string;
  document_number: string;
  full_name: string;
  pension_system: PensionSystem;
  salary?: number;
  family_allowance?: number;
  vacation_pay?: number;
  overtime_pay?: number;
  commissions?: number;
  bonuses?: number;
  pension_contribution?: number;
  invalidity_insurance?: number;
  afp_commission?: number;
  fifth_category_tax?: number;
  other_deductions?: number;
  essalud_contribution?: number;
}

export type UpdatePayrollEntryRequest = Partial<CreatePayrollEntryRequest>;

export interface FeeReceipt {
  id: string;
  tenant_id: string;
  tax_period_id: string;
  issue_date: string;
  serie: string;
  number: string;
  payer_ruc: string;
  payer_name: string;
  recipient_document_type: string;
  recipient_document_number: string;
  recipient_name: string;
  gross_amount: number;
  ir_withholding_rate: number;
  ir_withholding_amount: number;
  net_amount: number;
  status: FeeReceiptStatus;
  sunat_status: string;
  created_at: string;
  updated_at: string;
}

export interface CreateFeeReceiptRequest {
  tax_period_id: string;
  issue_date: string;
  serie: string;
  number: string;
  payer_ruc: string;
  payer_name: string;
  recipient_document_type: string;
  recipient_document_number: string;
  recipient_name: string;
  gross_amount: number;
  ir_withholding_rate?: number;
  status: FeeReceiptStatus;
  sunat_status?: string;
}

export type UpdateFeeReceiptRequest = Partial<CreateFeeReceiptRequest>;

export interface SecondCategoryIncome {
  id: string;
  tenant_id: string;
  tax_period_id: string;
  income_date: string;
  income_type: SecondCategoryIncomeType;
  payer_ruc: string;
  payer_name: string;
  beneficiary_document_type: string;
  beneficiary_document_number: string;
  beneficiary_name: string;
  gross_amount: number;
  withholding_rate: number;
  withholding_amount: number;
  net_amount: number;
  status: SecondCategoryIncomeStatus;
  created_at: string;
  updated_at: string;
}

export interface CreateSecondCategoryIncomeRequest {
  tax_period_id: string;
  income_date: string;
  income_type: SecondCategoryIncomeType;
  payer_ruc: string;
  payer_name: string;
  beneficiary_document_type: string;
  beneficiary_document_number: string;
  beneficiary_name: string;
  gross_amount: number;
  withholding_rate: number;
  status: SecondCategoryIncomeStatus;
}

export type UpdateSecondCategoryIncomeRequest = Partial<CreateSecondCategoryIncomeRequest>;

export interface Detraction {
  id: string;
  tenant_id: string;
  tax_period_id: string;
  invoice_id: string | null;
  operation_date: string;
  detraction_code: string;
  detraction_percentage: number;
  taxable_amount: number;
  detraction_amount: number;
  deposit_date: string | null;
  cip: string;
  status: DetractionStatus;
  created_at: string;
  updated_at: string;
}

export interface CreateDetractionRequest {
  tax_period_id: string;
  invoice_id?: string | null;
  operation_date: string;
  detraction_code: string;
  detraction_percentage: number;
  taxable_amount: number;
  deposit_date?: string | null;
  cip?: string;
  status: DetractionStatus;
}

export type UpdateDetractionRequest = Partial<CreateDetractionRequest>;

export interface IGVMonthlyHistory {
  id: string;
  tenant_id: string;
  year: number;
  month: number;
  tax_debit: number;
  tax_credit: number;
  net_tax: number;
  credit_balance: number;
  created_at: string;
  updated_at: string;
}

export interface CreateIGVMonthlyHistoryRequest {
  year: number;
  month: number;
  tax_debit?: number;
  tax_credit?: number;
  net_tax?: number;
  credit_balance?: number;
}

export type UpdateIGVMonthlyHistoryRequest = Partial<CreateIGVMonthlyHistoryRequest>;

export interface IncomeTaxPaymentHistory {
  id: string;
  tenant_id: string;
  year: number;
  month: number;
  tax_regime: string;
  net_income: number;
  coefficient: number;
  calculated_tax: number;
  previous_payments: number;
  payment_amount: number;
  created_at: string;
  updated_at: string;
}

export interface CreateIncomeTaxPaymentHistoryRequest {
  year: number;
  month: number;
  tax_regime: string;
  net_income?: number;
  coefficient?: number;
  calculated_tax?: number;
  previous_payments?: number;
  payment_amount?: number;
}

export type UpdateIncomeTaxPaymentHistoryRequest = Partial<CreateIncomeTaxPaymentHistoryRequest>;

export interface ProrrataCalculation {
  id: string;
  tenant_id: string;
  tax_period_id: string;
  taxable_sales: number;
  exempt_sales: number;
  total_sales: number;
  taxable_purchases: number;
  exempt_purchases: number;
  total_purchases: number;
  prorrata_percentage: number;
  deductible_tax_credit: number;
  non_deductible_tax_credit: number;
  status: ProrrataCalculationStatus;
  created_at: string;
  updated_at: string;
}

export interface CreateProrrataCalculationRequest {
  tax_period_id: string;
  taxable_sales?: number;
  exempt_sales?: number;
  taxable_purchases?: number;
  exempt_purchases?: number;
  status: ProrrataCalculationStatus;
}

export type UpdateProrrataCalculationRequest = Partial<CreateProrrataCalculationRequest>;

export interface SUNATValidationResult {
  id: string;
  tenant_id: string;
  ruc: string;
  validation_type: SUNATValidationType;
  is_valid: boolean;
  message: string;
  validated_at: string;
  created_at: string;
}

export interface ValidateRUCRequest {
  ruc: string;
}

export interface SUNATDeclarationFile {
  id: string;
  tenant_id: string;
  tax_period_id: string;
  declaration_type: SUNATDeclarationType;
  file_name: string;
  file_content: string;
  status: SUNATDeclarationFileStatus;
  created_at: string;
  updated_at: string;
}

export interface CreateSUNATDeclarationFileRequest {
  tax_period_id: string;
  declaration_type: SUNATDeclarationType;
  file_name: string;
  file_content: string;
  status: SUNATDeclarationFileStatus;
}

export type UpdateSUNATDeclarationFileRequest = Partial<CreateSUNATDeclarationFileRequest>;
