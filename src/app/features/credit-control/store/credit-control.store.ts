import { inject } from '@angular/core';
import { patchState, signalStore, withMethods, withState } from '@ngrx/signals';
import { CreditControlService } from '../services/credit-control';
import {
  CollectionLog,
  CreateCollectionLogRequest,
  CreateCreditScheduleRequest,
  CreditAccountSchedule,
  RecordPaymentRequest,
  UpdateCollectionLogRequest,
  UpdateCreditScheduleRequest,
} from '../../../core/models/credit-control.model';
import { initialStoreStatus, StoreStatus } from '../../../core/utils/store-status';
import { toApiPromise } from '../../../core/utils/api-response';
import { setStoreError, setStoreLoading, setStoreSuccess } from '../../../core/utils/store-helpers';

interface CreditControlState {
  status: StoreStatus;
}

const initialState: CreditControlState = {
  status: initialStoreStatus,
};

/**
 * Store de control de crédito y cobranza.
 * Gestiona operaciones de escritura sobre cronogramas, pagos y bitácoras.
 */
export const CreditControlStore = signalStore(
  { providedIn: 'root' },
  withState(initialState),
  withMethods((store, creditControlService = inject(CreditControlService)) => ({
    async createSchedule(request: CreateCreditScheduleRequest): Promise<CreditAccountSchedule> {
      setStoreLoading(store);
      try {
        const response = await toApiPromise(creditControlService.createSchedule(request));
        setStoreSuccess(store);
        return response.schedule;
      } catch (error) {
        setStoreError(store, error, 'Error al crear el cronograma');
        throw error;
      }
    },

    async updateSchedule(id: string, request: UpdateCreditScheduleRequest): Promise<CreditAccountSchedule> {
      setStoreLoading(store);
      try {
        const response = await toApiPromise(creditControlService.updateSchedule(id, request));
        setStoreSuccess(store);
        return response.schedule;
      } catch (error) {
        setStoreError(store, error, 'Error al actualizar el cronograma');
        throw error;
      }
    },

    async deleteSchedule(id: string): Promise<void> {
      setStoreLoading(store);
      try {
        await toApiPromise(creditControlService.deleteSchedule(id));
        setStoreSuccess(store);
      } catch (error) {
        setStoreError(store, error, 'Error al eliminar el cronograma');
        throw error;
      }
    },

    async recordPayment(id: string, request: RecordPaymentRequest): Promise<CreditAccountSchedule> {
      setStoreLoading(store);
      try {
        const response = await toApiPromise(creditControlService.recordPayment(id, request));
        setStoreSuccess(store);
        return response.schedule;
      } catch (error) {
        setStoreError(store, error, 'Error al registrar el pago');
        throw error;
      }
    },

    async createCollectionLog(request: CreateCollectionLogRequest): Promise<CollectionLog> {
      setStoreLoading(store);
      try {
        const response = await toApiPromise(creditControlService.createCollectionLog(request));
        setStoreSuccess(store);
        return response.collection_log;
      } catch (error) {
        setStoreError(store, error, 'Error al registrar la bitácora');
        throw error;
      }
    },

    async updateCollectionLog(id: string, request: UpdateCollectionLogRequest): Promise<CollectionLog> {
      setStoreLoading(store);
      try {
        const response = await toApiPromise(creditControlService.updateCollectionLog(id, request));
        setStoreSuccess(store);
        return response.collection_log;
      } catch (error) {
        setStoreError(store, error, 'Error al actualizar la bitácora');
        throw error;
      }
    },

    async deleteCollectionLog(id: string): Promise<void> {
      setStoreLoading(store);
      try {
        await toApiPromise(creditControlService.deleteCollectionLog(id));
        setStoreSuccess(store);
      } catch (error) {
        setStoreError(store, error, 'Error al eliminar la bitácora');
        throw error;
      }
    },

    clearError(): void {
      patchState(store, (state) => ({ status: { ...state.status, error: null } }));
    },
  }))
);
