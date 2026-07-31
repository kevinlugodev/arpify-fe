import { inject } from '@angular/core';
import { patchState, signalStore, withMethods, withState } from '@ngrx/signals';
import { FinanceService } from '../services/finance';
import {
  BulkImportInvoicesRequest,
  BulkImportInvoicesResponse,
  CreateInvoiceRequest,
  CreateTaxPeriodRequest,
  CreateTaxProfileRequest,
  Invoice,
  TaxCalculation,
  TaxPeriod,
  TaxProfile,
  UpdateInvoiceRequest,
  UpdateTaxPeriodRequest,
  UpdateTaxProfileRequest,
} from '../../../core/models/finance.model';
import { initialStoreStatus, StoreStatus } from '../../../core/utils/store-status';
import { toApiPromise } from '../../../core/utils/api-response';
import { setStoreError, setStoreLoading, setStoreSuccess } from '../../../core/utils/store-helpers';

interface FinanceState {
  status: StoreStatus;
}

const initialState: FinanceState = {
  status: initialStoreStatus,
};

/**
 * Store de finanzas. Gestiona operaciones de escritura del módulo tributario.
 */
export const FinanceStore = signalStore(
  { providedIn: 'root' },
  withState(initialState),
  withMethods((store, financeService = inject(FinanceService)) => ({
    // --- TaxProfile ---

    async updateTaxProfile(request: CreateTaxProfileRequest | UpdateTaxProfileRequest): Promise<TaxProfile> {
      setStoreLoading(store);
      try {
        const response = await toApiPromise(financeService.updateTaxProfile(request));
        setStoreSuccess(store);
        return response.tax_profile;
      } catch (error) {
        setStoreError(store, error, 'Error al guardar el perfil tributario');
        throw error;
      }
    },

    // --- TaxPeriod ---

    async createTaxPeriod(request: CreateTaxPeriodRequest): Promise<TaxPeriod> {
      setStoreLoading(store);
      try {
        const response = await toApiPromise(financeService.createTaxPeriod(request));
        setStoreSuccess(store);
        return response;
      } catch (error) {
        setStoreError(store, error, 'Error al crear el periodo tributario');
        throw error;
      }
    },

    async updateTaxPeriod(id: string, request: UpdateTaxPeriodRequest): Promise<TaxPeriod> {
      setStoreLoading(store);
      try {
        const response = await toApiPromise(financeService.updateTaxPeriod(id, request));
        setStoreSuccess(store);
        return response;
      } catch (error) {
        setStoreError(store, error, 'Error al actualizar el periodo tributario');
        throw error;
      }
    },

    async deleteTaxPeriod(id: string): Promise<void> {
      setStoreLoading(store);
      try {
        await toApiPromise(financeService.deleteTaxPeriod(id));
        setStoreSuccess(store);
      } catch (error) {
        setStoreError(store, error, 'Error al eliminar el periodo tributario');
        throw error;
      }
    },

    async closeTaxPeriod(id: string): Promise<void> {
      setStoreLoading(store);
      try {
        await toApiPromise(financeService.closeTaxPeriod(id));
        setStoreSuccess(store);
      } catch (error) {
        setStoreError(store, error, 'Error al cerrar el periodo tributario');
        throw error;
      }
    },

    // --- Invoice ---

    async createInvoice(request: CreateInvoiceRequest): Promise<Invoice> {
      setStoreLoading(store);
      try {
        const response = await toApiPromise(financeService.createInvoice(request));
        setStoreSuccess(store);
        return response;
      } catch (error) {
        setStoreError(store, error, 'Error al crear la factura');
        throw error;
      }
    },

    async bulkImportInvoices(request: BulkImportInvoicesRequest): Promise<BulkImportInvoicesResponse> {
      setStoreLoading(store);
      try {
        const response = await toApiPromise(financeService.bulkImportInvoices(request));
        setStoreSuccess(store);
        return response;
      } catch (error) {
        setStoreError(store, error, 'Error al importar facturas');
        throw error;
      }
    },

    async updateInvoice(id: string, request: UpdateInvoiceRequest): Promise<Invoice> {
      setStoreLoading(store);
      try {
        const response = await toApiPromise(financeService.updateInvoice(id, request));
        setStoreSuccess(store);
        return response;
      } catch (error) {
        setStoreError(store, error, 'Error al actualizar la factura');
        throw error;
      }
    },

    async deleteInvoice(id: string): Promise<void> {
      setStoreLoading(store);
      try {
        await toApiPromise(financeService.deleteInvoice(id));
        setStoreSuccess(store);
      } catch (error) {
        setStoreError(store, error, 'Error al eliminar la factura');
        throw error;
      }
    },

    // --- TaxCalculation ---

    async calculateTax(taxPeriodId: string): Promise<TaxCalculation> {
      setStoreLoading(store);
      try {
        const response = await toApiPromise(financeService.calculateTax(taxPeriodId));
        setStoreSuccess(store);
        return response.tax_calculation;
      } catch (error) {
        setStoreError(store, error, 'Error al calcular la liquidación');
        throw error;
      }
    },

    async recalculateTax(taxPeriodId: string): Promise<TaxCalculation> {
      setStoreLoading(store);
      try {
        const response = await toApiPromise(financeService.recalculateTax(taxPeriodId));
        setStoreSuccess(store);
        return response.tax_calculation;
      } catch (error) {
        setStoreError(store, error, 'Error al recalcular la liquidación');
        throw error;
      }
    },

    clearError(): void {
      patchState(store, (state) => ({ status: { ...state.status, error: null } }));
    },
  }))
);
