export type AssetCategory = 'IT_EQUIPMENT' | 'FURNITURE' | 'VEHICLES' | 'MACHINERY' | 'OTHER';

export type AssetStatus = 'ACTIVE' | 'FULLY_DEPRECIATED' | 'DISPOSED';

export interface FixedAsset {
  id: string;
  tenant_id: string;
  asset_code: string;
  name: string;
  category: AssetCategory;
  purchase_date: string;
  purchase_cost: number;
  residual_value: number;
  useful_life_months: number;
  accumulated_depreciation: number;
  current_book_value: number;
  assigned_employee_id: string | null;
  status: AssetStatus;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface DepreciationLog {
  id: string;
  tenant_id: string;
  fixed_asset_id: string;
  period_year: number;
  period_month: number;
  depreciation_amount: number;
  accumulated_total_after: number;
  book_value_after: number;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface FixedAssetListResponse {
  items: FixedAsset[];
  total: number;
}

export interface DepreciationLogListResponse {
  items: DepreciationLog[];
  total: number;
}

export interface FixedAssetFilters {
  status?: AssetStatus;
  category?: AssetCategory;
  search?: string;
  limit?: number;
  offset?: number;
  [key: string]: string | number | undefined;
}

export interface DepreciationLogFilters {
  limit?: number;
  offset?: number;
  [key: string]: string | number | undefined;
}

export interface CreateFixedAssetRequest {
  asset_code: string;
  name: string;
  category: AssetCategory;
  purchase_date: string;
  purchase_cost: number;
  residual_value: number;
  useful_life_months: number;
  assigned_employee_id?: string | null;
  status?: AssetStatus;
}

export type UpdateFixedAssetRequest = Partial<CreateFixedAssetRequest>;

export interface DepreciateRequest {
  period_year: number;
  period_month: number;
}
