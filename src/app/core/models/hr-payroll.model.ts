export type HrPayrollCurrency = 'PEN' | 'USD';

export type LaborRegime = 'GENERAL' | 'MYPE_SMALL' | 'MYPE_MICRO' | 'INTERN';

export type PayrollPensionSystem = 'ONP' | 'AFP_INTEGRA' | 'AFP_PRIMA' | 'AFP_PROFUTURO' | 'AFP_HABITAT';

export type PayrollRunStatus = 'DRAFT' | 'APPROVED' | 'PAID' | 'CANCELLED';

export type PayrollItemPaymentStatus = 'PENDING' | 'PAID';

export interface EmployeeCompensation {
  id: string;
  tenant_id: string;
  employee_id: string;
  base_salary: number;
  currency: HrPayrollCurrency;
  labor_regime: LaborRegime;
  pension_system: PayrollPensionSystem;
  cuspp_number: string;
  has_medical_insurance: boolean;
  bank_account_number: string;
  bank_cci: string;
  bank_name: string;
  effective_start_date: string;
  effective_end_date: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface EmployeeCompensationFilters {
  employee_id?: string;
  limit?: number;
  offset?: number;
  [key: string]: string | number | undefined;
}

export interface EmployeeCompensationListResponse {
  items: EmployeeCompensation[];
  total: number;
}

export interface CreateEmployeeCompensationRequest {
  employee_id: string;
  base_salary: number;
  currency: HrPayrollCurrency;
  labor_regime: LaborRegime;
  pension_system: PayrollPensionSystem;
  cuspp_number?: string;
  has_medical_insurance?: boolean;
  bank_account_number?: string;
  bank_cci?: string;
  bank_name?: string;
  effective_start_date: string;
  effective_end_date?: string | null;
}

export type UpdateEmployeeCompensationRequest = Partial<CreateEmployeeCompensationRequest>;

export interface PayrollRun {
  id: string;
  tenant_id: string;
  period_year: number;
  period_month: number;
  total_gross_amount: number;
  total_employee_deductions: number;
  total_employer_contributions: number;
  total_net_payable: number;
  status: PayrollRunStatus;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface PayrollRunFilters {
  status?: PayrollRunStatus;
  limit?: number;
  offset?: number;
  [key: string]: string | number | undefined;
}

export interface PayrollRunListResponse {
  items: PayrollRun[];
  total: number;
}

export interface CreatePayrollRunRequest {
  period_year: number;
  period_month: number;
}

export type UpdatePayrollRunRequest = Partial<CreatePayrollRunRequest>;

export interface PayrollItem {
  id: string;
  tenant_id: string;
  payroll_run_id: string;
  employee_id: string;
  base_salary: number;
  gross_earnings: number;
  pension_deduction: number;
  other_deductions: number;
  employer_essalud: number;
  net_payable: number;
  payment_status: PayrollItemPaymentStatus;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface PayrollItemListResponse {
  items: PayrollItem[];
  total: number;
}

export interface AddEmployeeToPayrollRunRequest {
  employee_id: string;
  other_deductions?: number;
}

export interface ApprovePayrollRunResponse {
  payroll_run: PayrollRun;
}

export interface CancelPayrollRunResponse {
  payroll_run: PayrollRun;
}
