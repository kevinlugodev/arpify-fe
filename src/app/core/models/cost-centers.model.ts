export type CostCenterStatus = 'active' | 'inactive';

export interface CostCenter {
  id: string;
  tenant_id: string;
  code: string;
  name: string;
  description: string | null;
  is_active: boolean;
  status: CostCenterStatus;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface CostCenterBudget {
  id: string;
  tenant_id: string;
  cost_center_id: string;
  period_year: number;
  period_month: number;
  allocated_budget: number;
  committed_amount: number;
  spent_amount: number;
  currency: string;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface CostCenterListItem {
  cost_center: CostCenter;
}

export interface CostCenterListResponse {
  items: CostCenterListItem[];
  total: number;
}

export interface CostCenterBudgetListItem {
  budget: CostCenterBudget;
}

export interface CostCenterBudgetListResponse {
  items: CostCenterBudgetListItem[];
  total: number;
}

export interface CostCenterFilters {
  status?: CostCenterStatus;
  search?: string;
  limit?: number;
  offset?: number;
  [key: string]: string | number | boolean | undefined;
}

export interface CostCenterBudgetFilters {
  limit?: number;
  offset?: number;
  [key: string]: string | number | boolean | undefined;
}

export interface CreateCostCenterRequest {
  code: string;
  name: string;
  description?: string;
  is_active?: boolean;
  status?: CostCenterStatus;
}

export type UpdateCostCenterRequest = Partial<CreateCostCenterRequest>;

export interface UpdateCostCenterStatusRequest {
  status: CostCenterStatus;
}

export interface CreateCostCenterBudgetRequest {
  period_year: number;
  period_month: number;
  allocated_budget: number;
  committed_amount?: number;
  spent_amount?: number;
  currency: string;
}

export type UpdateCostCenterBudgetRequest = Partial<CreateCostCenterBudgetRequest>;
