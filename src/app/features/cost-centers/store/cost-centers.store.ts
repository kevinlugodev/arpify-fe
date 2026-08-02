import { inject } from '@angular/core';
import { patchState, signalStore, withMethods, withState } from '@ngrx/signals';
import { CostCentersService } from '../services/cost-centers';
import {
  CostCenter,
  CostCenterBudget,
  CreateCostCenterBudgetRequest,
  CreateCostCenterRequest,
  UpdateCostCenterBudgetRequest,
  UpdateCostCenterRequest,
  UpdateCostCenterStatusRequest,
} from '../../../core/models/cost-centers.model';
import { initialStoreStatus, StoreStatus } from '../../../core/utils/store-status';
import { toApiPromise } from '../../../core/utils/api-response';
import { setStoreError, setStoreLoading, setStoreSuccess } from '../../../core/utils/store-helpers';

interface CostCentersState {
  status: StoreStatus;
}

const initialState: CostCentersState = {
  status: initialStoreStatus,
};

/**
 * Store de centros de costo. Gestiona operaciones de escritura sobre centros
 * y sus presupuestos mensuales.
 */
export const CostCentersStore = signalStore(
  { providedIn: 'root' },
  withState(initialState),
  withMethods((store, costCentersService = inject(CostCentersService)) => ({
    // --- Cost Centers ---

    async createCostCenter(request: CreateCostCenterRequest): Promise<CostCenter> {
      setStoreLoading(store);
      try {
        const response = await toApiPromise(costCentersService.createCostCenter(request));
        setStoreSuccess(store);
        return response.cost_center;
      } catch (error) {
        setStoreError(store, error, 'Error al crear el centro de costo');
        throw error;
      }
    },

    async updateCostCenter(id: string, request: UpdateCostCenterRequest): Promise<CostCenter> {
      setStoreLoading(store);
      try {
        const response = await toApiPromise(costCentersService.updateCostCenter(id, request));
        setStoreSuccess(store);
        return response.cost_center;
      } catch (error) {
        setStoreError(store, error, 'Error al actualizar el centro de costo');
        throw error;
      }
    },

    async deleteCostCenter(id: string): Promise<void> {
      setStoreLoading(store);
      try {
        await toApiPromise(costCentersService.deleteCostCenter(id));
        setStoreSuccess(store);
      } catch (error) {
        setStoreError(store, error, 'Error al eliminar el centro de costo');
        throw error;
      }
    },

    async updateCostCenterStatus(id: string, request: UpdateCostCenterStatusRequest): Promise<CostCenter> {
      setStoreLoading(store);
      try {
        const response = await toApiPromise(costCentersService.updateCostCenter(id, request));
        setStoreSuccess(store);
        return response.cost_center;
      } catch (error) {
        setStoreError(store, error, 'Error al cambiar el estado del centro de costo');
        throw error;
      }
    },

    // --- Cost Center Budgets ---

    async createCostCenterBudget(
      id: string,
      request: CreateCostCenterBudgetRequest
    ): Promise<CostCenterBudget> {
      setStoreLoading(store);
      try {
        const response = await toApiPromise(costCentersService.createCostCenterBudget(id, request));
        setStoreSuccess(store);
        return response.budget;
      } catch (error) {
        setStoreError(store, error, 'Error al crear el presupuesto');
        throw error;
      }
    },

    async updateCostCenterBudget(
      id: string,
      budgetId: string,
      request: UpdateCostCenterBudgetRequest
    ): Promise<CostCenterBudget> {
      setStoreLoading(store);
      try {
        const response = await toApiPromise(costCentersService.updateCostCenterBudget(id, budgetId, request));
        setStoreSuccess(store);
        return response.budget;
      } catch (error) {
        setStoreError(store, error, 'Error al actualizar el presupuesto');
        throw error;
      }
    },

    async deleteCostCenterBudget(id: string, budgetId: string): Promise<void> {
      setStoreLoading(store);
      try {
        await toApiPromise(costCentersService.deleteCostCenterBudget(id, budgetId));
        setStoreSuccess(store);
      } catch (error) {
        setStoreError(store, error, 'Error al eliminar el presupuesto');
        throw error;
      }
    },

    clearError(): void {
      patchState(store, (state) => ({ status: { ...state.status, error: null } }));
    },
  }))
);
