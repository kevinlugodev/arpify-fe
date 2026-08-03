import { inject } from '@angular/core';
import { patchState, signalStore, withMethods, withState } from '@ngrx/signals';
import { PartnerEquityService } from '../services/partner-equity';
import {
  CreateAdvanceDrawRequest,
  CreatePartnerAccountRequest,
  CreateProfitDistributionRequest,
  CreateSettlementPaymentRequest,
  PartnerAccount,
  PartnerDrawTransaction,
  ProfitDistribution,
  UpdatePartnerAccountRequest,
} from '../../../core/models/partner-equity.model';
import { initialStoreStatus, StoreStatus } from '../../../core/utils/store-status';
import { toApiPromise } from '../../../core/utils/api-response';
import { setStoreError, setStoreLoading, setStoreSuccess } from '../../../core/utils/store-helpers';

interface PartnerEquityState {
  status: StoreStatus;
}

const initialState: PartnerEquityState = {
  status: initialStoreStatus,
};

/**
 * Store de cuentas de socios y distribución de utilidades.
 */
export const PartnerEquityStore = signalStore(
  { providedIn: 'root' },
  withState(initialState),
  withMethods((store, partnerEquityService = inject(PartnerEquityService)) => ({
    async createPartnerAccount(request: CreatePartnerAccountRequest): Promise<PartnerAccount> {
      setStoreLoading(store);
      try {
        const response = await toApiPromise(partnerEquityService.createPartnerAccount(request));
        setStoreSuccess(store);
        return response.partner_account;
      } catch (error) {
        setStoreError(store, error, 'Error al crear la cuenta de socio');
        throw error;
      }
    },

    async updatePartnerAccount(id: string, request: UpdatePartnerAccountRequest): Promise<PartnerAccount> {
      setStoreLoading(store);
      try {
        const response = await toApiPromise(partnerEquityService.updatePartnerAccount(id, request));
        setStoreSuccess(store);
        return response.partner_account;
      } catch (error) {
        setStoreError(store, error, 'Error al actualizar la cuenta de socio');
        throw error;
      }
    },

    async deletePartnerAccount(id: string): Promise<void> {
      setStoreLoading(store);
      try {
        await toApiPromise(partnerEquityService.deletePartnerAccount(id));
        setStoreSuccess(store);
      } catch (error) {
        setStoreError(store, error, 'Error al eliminar la cuenta de socio');
        throw error;
      }
    },

    async createProfitDistribution(request: CreateProfitDistributionRequest): Promise<ProfitDistribution> {
      setStoreLoading(store);
      try {
        const response = await toApiPromise(partnerEquityService.createProfitDistribution(request));
        setStoreSuccess(store);
        return response.profit_distribution;
      } catch (error) {
        setStoreError(store, error, 'Error al crear la distribución de utilidades');
        throw error;
      }
    },

    async deleteProfitDistribution(id: string): Promise<void> {
      setStoreLoading(store);
      try {
        await toApiPromise(partnerEquityService.deleteProfitDistribution(id));
        setStoreSuccess(store);
      } catch (error) {
        setStoreError(store, error, 'Error al eliminar la distribución de utilidades');
        throw error;
      }
    },

    async createAdvanceDraw(id: string, request: CreateAdvanceDrawRequest): Promise<PartnerDrawTransaction> {
      setStoreLoading(store);
      try {
        const response = await toApiPromise(partnerEquityService.createAdvanceDraw(id, request));
        setStoreSuccess(store);
        return response.draw_transaction;
      } catch (error) {
        setStoreError(store, error, 'Error al registrar el adelanto de socio');
        throw error;
      }
    },

    async createSettlementPayment(
      id: string,
      request: CreateSettlementPaymentRequest
    ): Promise<PartnerDrawTransaction> {
      setStoreLoading(store);
      try {
        const response = await toApiPromise(partnerEquityService.createSettlementPayment(id, request));
        setStoreSuccess(store);
        return response.draw_transaction;
      } catch (error) {
        setStoreError(store, error, 'Error al registrar la liquidación RHE');
        throw error;
      }
    },

    async deleteDrawTransaction(id: string): Promise<void> {
      setStoreLoading(store);
      try {
        await toApiPromise(partnerEquityService.deleteDrawTransaction(id));
        setStoreSuccess(store);
      } catch (error) {
        setStoreError(store, error, 'Error al eliminar el movimiento de socio');
        throw error;
      }
    },

    clearError(): void {
      patchState(store, (state) => ({ status: { ...state.status, error: null } }));
    },
  }))
);
