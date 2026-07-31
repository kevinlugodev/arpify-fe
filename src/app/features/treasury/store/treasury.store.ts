import { inject } from '@angular/core';
import { patchState, signalStore, withMethods, withState } from '@ngrx/signals';
import { TreasuryService } from '../services/treasury';
import {
  BankAccount,
  BankTransaction,
  CreateBankAccountRequest,
  CreateBankTransactionRequest,
  CreatePayableRequest,
  Payable,
  UpdateBankAccountRequest,
  UpdatePayableRequest,
} from '../../../core/models/treasury.model';
import { initialStoreStatus, StoreStatus } from '../../../core/utils/store-status';
import { toApiPromise } from '../../../core/utils/api-response';
import { setStoreError, setStoreLoading, setStoreSuccess } from '../../../core/utils/store-helpers';

interface TreasuryState {
  status: StoreStatus;
}

const initialState: TreasuryState = {
  status: initialStoreStatus,
};

/**
 * Store de tesorería. Gestiona operaciones de escritura sobre cuentas,
 * obligaciones por pagar y movimientos bancarios.
 */
export const TreasuryStore = signalStore(
  { providedIn: 'root' },
  withState(initialState),
  withMethods((store, treasuryService = inject(TreasuryService)) => ({
    // --- Bank Accounts ---

    async createBankAccount(request: CreateBankAccountRequest): Promise<BankAccount> {
      setStoreLoading(store);
      try {
        const response = await toApiPromise(treasuryService.createBankAccount(request));
        setStoreSuccess(store);
        return response.bank_account;
      } catch (error) {
        setStoreError(store, error, 'Error al crear la cuenta bancaria');
        throw error;
      }
    },

    async updateBankAccount(id: string, request: UpdateBankAccountRequest): Promise<BankAccount> {
      setStoreLoading(store);
      try {
        const response = await toApiPromise(treasuryService.updateBankAccount(id, request));
        setStoreSuccess(store);
        return response.bank_account;
      } catch (error) {
        setStoreError(store, error, 'Error al actualizar la cuenta bancaria');
        throw error;
      }
    },

    async deleteBankAccount(id: string): Promise<void> {
      setStoreLoading(store);
      try {
        await toApiPromise(treasuryService.deleteBankAccount(id));
        setStoreSuccess(store);
      } catch (error) {
        setStoreError(store, error, 'Error al eliminar la cuenta bancaria');
        throw error;
      }
    },

    // --- Payables ---

    async createPayable(request: CreatePayableRequest): Promise<Payable> {
      setStoreLoading(store);
      try {
        const response = await toApiPromise(treasuryService.createPayable(request));
        setStoreSuccess(store);
        return response.payable;
      } catch (error) {
        setStoreError(store, error, 'Error al crear la obligación');
        throw error;
      }
    },

    async updatePayable(id: string, request: UpdatePayableRequest): Promise<Payable> {
      setStoreLoading(store);
      try {
        const response = await toApiPromise(treasuryService.updatePayable(id, request));
        setStoreSuccess(store);
        return response.payable;
      } catch (error) {
        setStoreError(store, error, 'Error al actualizar la obligación');
        throw error;
      }
    },

    async deletePayable(id: string): Promise<void> {
      setStoreLoading(store);
      try {
        await toApiPromise(treasuryService.deletePayable(id));
        setStoreSuccess(store);
      } catch (error) {
        setStoreError(store, error, 'Error al eliminar la obligación');
        throw error;
      }
    },

    // --- Bank Transactions ---

    async createTransaction(request: CreateBankTransactionRequest): Promise<BankTransaction> {
      setStoreLoading(store);
      try {
        const response = await toApiPromise(treasuryService.createTransaction(request));
        setStoreSuccess(store);
        return response.bank_transaction;
      } catch (error) {
        setStoreError(store, error, 'Error al crear el movimiento');
        throw error;
      }
    },

    async reverseTransaction(id: string): Promise<BankTransaction> {
      setStoreLoading(store);
      try {
        const response = await toApiPromise(treasuryService.reverseTransaction(id));
        setStoreSuccess(store);
        return response.bank_transaction;
      } catch (error) {
        setStoreError(store, error, 'Error al revertir el movimiento');
        throw error;
      }
    },

    clearError(): void {
      patchState(store, (state) => ({ status: { ...state.status, error: null } }));
    },
  }))
);
