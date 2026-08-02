import { inject } from '@angular/core';
import { patchState, signalStore, withMethods, withState } from '@ngrx/signals';
import { ExpenseClaimsService } from '../services/expense-claims';
import {
  CreateExpenseClaimItemRequest,
  CreateExpenseClaimRequest,
  ExpenseClaim,
  ExpenseClaimItem,
  SettleExpenseClaimRequest,
  UpdateExpenseClaimItemRequest,
  UpdateExpenseClaimRequest,
} from '../../../core/models/expense-claims.model';
import { initialStoreStatus, StoreStatus } from '../../../core/utils/store-status';
import { toApiPromise } from '../../../core/utils/api-response';
import { setStoreError, setStoreLoading, setStoreSuccess } from '../../../core/utils/store-helpers';

interface ExpenseClaimsState {
  status: StoreStatus;
}

const initialState: ExpenseClaimsState = {
  status: initialStoreStatus,
};

/**
 * Store de rendición de gastos. Gestiona operaciones de escritura sobre rendiciones,
 * sus transiciones de estado y los comprobantes asociados.
 */
export const ExpenseClaimsStore = signalStore(
  { providedIn: 'root' },
  withState(initialState),
  withMethods((store, expenseClaimsService = inject(ExpenseClaimsService)) => ({
    async createExpenseClaim(request: CreateExpenseClaimRequest): Promise<ExpenseClaim> {
      setStoreLoading(store);
      try {
        const response = await toApiPromise(expenseClaimsService.createExpenseClaim(request));
        setStoreSuccess(store);
        return response.expense_claim;
      } catch (error) {
        setStoreError(store, error, 'Error al crear la rendición');
        throw error;
      }
    },

    async updateExpenseClaim(id: string, request: UpdateExpenseClaimRequest): Promise<ExpenseClaim> {
      setStoreLoading(store);
      try {
        const response = await toApiPromise(expenseClaimsService.updateExpenseClaim(id, request));
        setStoreSuccess(store);
        return response.expense_claim;
      } catch (error) {
        setStoreError(store, error, 'Error al actualizar la rendición');
        throw error;
      }
    },

    async deleteExpenseClaim(id: string): Promise<void> {
      setStoreLoading(store);
      try {
        await toApiPromise(expenseClaimsService.deleteExpenseClaim(id));
        setStoreSuccess(store);
      } catch (error) {
        setStoreError(store, error, 'Error al eliminar la rendición');
        throw error;
      }
    },

    async submitExpenseClaim(id: string): Promise<ExpenseClaim> {
      setStoreLoading(store);
      try {
        const response = await toApiPromise(expenseClaimsService.submitExpenseClaim(id));
        setStoreSuccess(store);
        return response.expense_claim;
      } catch (error) {
        setStoreError(store, error, 'Error al enviar la rendición');
        throw error;
      }
    },

    async approveExpenseClaim(id: string): Promise<ExpenseClaim> {
      setStoreLoading(store);
      try {
        const response = await toApiPromise(expenseClaimsService.approveExpenseClaim(id));
        setStoreSuccess(store);
        return response.expense_claim;
      } catch (error) {
        setStoreError(store, error, 'Error al aprobar la rendición');
        throw error;
      }
    },

    async rejectExpenseClaim(id: string): Promise<ExpenseClaim> {
      setStoreLoading(store);
      try {
        const response = await toApiPromise(expenseClaimsService.rejectExpenseClaim(id));
        setStoreSuccess(store);
        return response.expense_claim;
      } catch (error) {
        setStoreError(store, error, 'Error al rechazar la rendición');
        throw error;
      }
    },

    async settleExpenseClaim(id: string, request: SettleExpenseClaimRequest = {}): Promise<ExpenseClaim> {
      setStoreLoading(store);
      try {
        const response = await toApiPromise(expenseClaimsService.settleExpenseClaim(id, request));
        setStoreSuccess(store);
        return response.expense_claim;
      } catch (error) {
        setStoreError(store, error, 'Error al liquidar la rendición');
        throw error;
      }
    },

    async createExpenseClaimItem(
      id: string,
      request: CreateExpenseClaimItemRequest
    ): Promise<ExpenseClaimItem> {
      setStoreLoading(store);
      try {
        const response = await toApiPromise(expenseClaimsService.createExpenseClaimItem(id, request));
        setStoreSuccess(store);
        return response.item;
      } catch (error) {
        setStoreError(store, error, 'Error al crear el comprobante');
        throw error;
      }
    },

    async updateExpenseClaimItem(
      id: string,
      itemId: string,
      request: UpdateExpenseClaimItemRequest
    ): Promise<ExpenseClaimItem> {
      setStoreLoading(store);
      try {
        const response = await toApiPromise(
          expenseClaimsService.updateExpenseClaimItem(id, itemId, request)
        );
        setStoreSuccess(store);
        return response.item;
      } catch (error) {
        setStoreError(store, error, 'Error al actualizar el comprobante');
        throw error;
      }
    },

    async deleteExpenseClaimItem(id: string, itemId: string): Promise<void> {
      setStoreLoading(store);
      try {
        await toApiPromise(expenseClaimsService.deleteExpenseClaimItem(id, itemId));
        setStoreSuccess(store);
      } catch (error) {
        setStoreError(store, error, 'Error al eliminar el comprobante');
        throw error;
      }
    },

    clearError(): void {
      patchState(store, (state) => ({ status: { ...state.status, error: null } }));
    },
  }))
);
