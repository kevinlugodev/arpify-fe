import { inject, Service } from '@angular/core';
import { Observable } from 'rxjs';
import { Api } from '../../../core/services/api';
import { ApiResponse } from '../../../core/models/api-response.model';
import {
  CostCenter,
  CostCenterBudget,
  CostCenterBudgetFilters,
  CostCenterBudgetListResponse,
  CostCenterFilters,
  CostCenterListResponse,
  CreateCostCenterBudgetRequest,
  CreateCostCenterRequest,
  UpdateCostCenterBudgetRequest,
  UpdateCostCenterRequest,
} from '../../../core/models/cost-centers.model';

/**
 * Servicio de centros de costo. Expone operaciones HTTP de centros y presupuestos.
 */
@Service()
export class CostCentersService {
  private readonly api = inject(Api);

  // --- Cost Centers ---

  getCostCenters(filters: CostCenterFilters = {}): Observable<ApiResponse<CostCenterListResponse>> {
    return this.api.get<CostCenterListResponse>('cost-centers', filters);
  }

  createCostCenter(request: CreateCostCenterRequest): Observable<ApiResponse<{ cost_center: CostCenter }>> {
    return this.api.post<{ cost_center: CostCenter }>('cost-centers', request);
  }

  getCostCenter(id: string): Observable<ApiResponse<{ cost_center: CostCenter }>> {
    return this.api.get<{ cost_center: CostCenter }>(`cost-centers/${id}`);
  }

  updateCostCenter(id: string, request: UpdateCostCenterRequest): Observable<ApiResponse<{ cost_center: CostCenter }>> {
    return this.api.put<{ cost_center: CostCenter }>(`cost-centers/${id}`, request);
  }

  deleteCostCenter(id: string): Observable<ApiResponse<unknown>> {
    return this.api.delete<unknown>(`cost-centers/${id}`);
  }

  // --- Cost Center Budgets ---

  getCostCenterBudgets(
    id: string,
    filters: CostCenterBudgetFilters = {}
  ): Observable<ApiResponse<CostCenterBudgetListResponse>> {
    return this.api.get<CostCenterBudgetListResponse>(`cost-centers/${id}/budgets`, filters);
  }

  createCostCenterBudget(
    id: string,
    request: CreateCostCenterBudgetRequest
  ): Observable<ApiResponse<{ budget: CostCenterBudget }>> {
    return this.api.post<{ budget: CostCenterBudget }>(`cost-centers/${id}/budgets`, request);
  }

  getCostCenterBudget(id: string, budgetId: string): Observable<ApiResponse<{ budget: CostCenterBudget }>> {
    return this.api.get<{ budget: CostCenterBudget }>(`cost-centers/${id}/budgets/${budgetId}`);
  }

  updateCostCenterBudget(
    id: string,
    budgetId: string,
    request: UpdateCostCenterBudgetRequest
  ): Observable<ApiResponse<{ budget: CostCenterBudget }>> {
    return this.api.put<{ budget: CostCenterBudget }>(`cost-centers/${id}/budgets/${budgetId}`, request);
  }

  deleteCostCenterBudget(id: string, budgetId: string): Observable<ApiResponse<unknown>> {
    return this.api.delete<unknown>(`cost-centers/${id}/budgets/${budgetId}`);
  }
}
