import { inject } from '@angular/core';
import { patchState, signalStore, withMethods, withState } from '@ngrx/signals';
import { TreasuryService } from '../services/treasury';
import {
  BankAccount,
  BankStatement,
  BankTransaction,
  CreateBankAccountRequest,
  CreateBankStatementRequest,
  CreateBankTransactionRequest,
  CreatePayableRequest,
  CreatePettyCashExpenseRequest,
  CreatePettyCashFundRequest,
  CreateServiceOrderAdvanceRequest,
  CreateServiceOrderRequest,
  LinkServiceOrderPayableRequest,
  MatchBankStatementItemRequest,
  Payable,
  PettyCashFund,
  ReplenishPettyCashFundRequest,
  ServiceOrder,
  ServiceOrderAdvance,
  UpdateBankAccountRequest,
  UpdatePayableRequest,
  UpdatePettyCashFundRequest,
  UpdateServiceOrderRequest,
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

    // --- Service Orders ---

    async createServiceOrder(request: CreateServiceOrderRequest): Promise<ServiceOrder> {
      setStoreLoading(store);
      try {
        const response = await toApiPromise(treasuryService.createServiceOrder(request));
        setStoreSuccess(store);
        return response.service_order;
      } catch (error) {
        setStoreError(store, error, 'Error al crear la orden de servicio');
        throw error;
      }
    },

    async updateServiceOrder(id: string, request: UpdateServiceOrderRequest): Promise<ServiceOrder> {
      setStoreLoading(store);
      try {
        const response = await toApiPromise(treasuryService.updateServiceOrder(id, request));
        setStoreSuccess(store);
        return response.service_order;
      } catch (error) {
        setStoreError(store, error, 'Error al actualizar la orden de servicio');
        throw error;
      }
    },

    async deleteServiceOrder(id: string): Promise<void> {
      setStoreLoading(store);
      try {
        await toApiPromise(treasuryService.deleteServiceOrder(id));
        setStoreSuccess(store);
      } catch (error) {
        setStoreError(store, error, 'Error al eliminar la orden de servicio');
        throw error;
      }
    },

    async createServiceOrderAdvance(
      id: string,
      request: CreateServiceOrderAdvanceRequest
    ): Promise<{ advance: ServiceOrderAdvance; bank_transaction: BankTransaction }> {
      setStoreLoading(store);
      try {
        const response = await toApiPromise(treasuryService.createServiceOrderAdvance(id, request));
        setStoreSuccess(store);
        return { advance: response.advance, bank_transaction: response.bank_transaction };
      } catch (error) {
        setStoreError(store, error, 'Error al registrar el anticipo');
        throw error;
      }
    },

    async linkServiceOrderPayable(id: string, request: LinkServiceOrderPayableRequest): Promise<Payable> {
      setStoreLoading(store);
      try {
        const response = await toApiPromise(treasuryService.linkServiceOrderPayable(id, request));
        setStoreSuccess(store);
        return response.payable;
      } catch (error) {
        setStoreError(store, error, 'Error al vincular la obligación');
        throw error;
      }
    },

    // --- Petty Cash Funds ---

    async createPettyCashFund(request: CreatePettyCashFundRequest): Promise<PettyCashFund> {
      setStoreLoading(store);
      try {
        const response = await toApiPromise(treasuryService.createPettyCashFund(request));
        setStoreSuccess(store);
        return response.petty_cash_fund;
      } catch (error) {
        setStoreError(store, error, 'Error al crear la caja chica');
        throw error;
      }
    },

    async updatePettyCashFund(id: string, request: UpdatePettyCashFundRequest): Promise<PettyCashFund> {
      setStoreLoading(store);
      try {
        const response = await toApiPromise(treasuryService.updatePettyCashFund(id, request));
        setStoreSuccess(store);
        return response.petty_cash_fund;
      } catch (error) {
        setStoreError(store, error, 'Error al actualizar la caja chica');
        throw error;
      }
    },

    async deletePettyCashFund(id: string): Promise<void> {
      setStoreLoading(store);
      try {
        await toApiPromise(treasuryService.deletePettyCashFund(id));
        setStoreSuccess(store);
      } catch (error) {
        setStoreError(store, error, 'Error al eliminar la caja chica');
        throw error;
      }
    },

    async replenishPettyCashFund(
      id: string,
      request: ReplenishPettyCashFundRequest
    ): Promise<{ bank_transaction: BankTransaction; petty_cash_fund: PettyCashFund }> {
      setStoreLoading(store);
      try {
        const response = await toApiPromise(treasuryService.replenishPettyCashFund(id, request));
        setStoreSuccess(store);
        return { bank_transaction: response.bank_transaction, petty_cash_fund: response.petty_cash_fund };
      } catch (error) {
        setStoreError(store, error, 'Error al reponer la caja chica');
        throw error;
      }
    },

    async createPettyCashExpense(id: string, request: CreatePettyCashExpenseRequest): Promise<PettyCashFund> {
      setStoreLoading(store);
      try {
        const response = await toApiPromise(treasuryService.createPettyCashExpense(id, request));
        setStoreSuccess(store);
        return response.petty_cash_fund;
      } catch (error) {
        setStoreError(store, error, 'Error al registrar el gasto de caja chica');
        throw error;
      }
    },

    // --- Bank Statements ---

    async createBankStatement(request: CreateBankStatementRequest): Promise<BankStatement> {
      setStoreLoading(store);
      try {
        const response = await toApiPromise(treasuryService.createBankStatement(request));
        setStoreSuccess(store);
        return response.bank_statement;
      } catch (error) {
        setStoreError(store, error, 'Error al importar el estado de cuenta');
        throw error;
      }
    },

    async deleteBankStatement(id: string): Promise<void> {
      setStoreLoading(store);
      try {
        await toApiPromise(treasuryService.deleteBankStatement(id));
        setStoreSuccess(store);
      } catch (error) {
        setStoreError(store, error, 'Error al eliminar el estado de cuenta');
        throw error;
      }
    },

    async matchBankStatementItem(id: string, request: MatchBankStatementItemRequest): Promise<void> {
      setStoreLoading(store);
      try {
        await toApiPromise(treasuryService.matchBankStatementItem(id, request));
        setStoreSuccess(store);
      } catch (error) {
        setStoreError(store, error, 'Error al emparejar el ítem');
        throw error;
      }
    },

    clearError(): void {
      patchState(store, (state) => ({ status: { ...state.status, error: null } }));
    },
  }))
);
