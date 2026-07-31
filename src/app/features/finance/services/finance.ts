import { inject, Service } from '@angular/core';
import { Observable } from 'rxjs';
import { Api } from '../../../core/services/api';
import { ApiResponse } from '../../../core/models/api-response.model';
import {
  BulkImportInvoicesRequest,
  BulkImportInvoicesResponse,
  CreateInvoiceRequest,
  CreateTaxPeriodRequest,
  CreateTaxProfileRequest,
  Invoice,
  InvoiceListFilters,
  InvoiceListResponse,
  TaxCalculation,
  TaxPeriod,
  TaxPeriodListResponse,
  TaxProfile,
  UpdateInvoiceRequest,
  UpdateTaxPeriodRequest,
  UpdateTaxProfileRequest,
} from '../../../core/models/finance.model';

/**
 * Servicio de finanzas. Expone operaciones HTTP del namespace `/finance`.
 */
@Service()
export class FinanceService {
  private readonly api = inject(Api);

  // --- TaxProfile ---

  getTaxProfile(): Observable<ApiResponse<{ tax_profile: TaxProfile }>> {
    return this.api.get<{ tax_profile: TaxProfile }>('finance/tax-profile');
  }

  updateTaxProfile(request: CreateTaxProfileRequest | UpdateTaxProfileRequest): Observable<ApiResponse<{ tax_profile: TaxProfile }>> {
    return this.api.put<{ tax_profile: TaxProfile }>('finance/tax-profile', request);
  }

  // --- TaxPeriod ---

  getTaxPeriods(filters: { year?: number; limit?: number; offset?: number } = {}): Observable<ApiResponse<TaxPeriodListResponse>> {
    return this.api.get<TaxPeriodListResponse>('finance/tax-periods', filters);
  }

  createTaxPeriod(request: CreateTaxPeriodRequest): Observable<ApiResponse<TaxPeriod>> {
    return this.api.post<TaxPeriod>('finance/tax-periods', request);
  }

  getTaxPeriod(id: string): Observable<ApiResponse<TaxPeriod>> {
    return this.api.get<TaxPeriod>(`finance/tax-periods/${id}`);
  }

  updateTaxPeriod(id: string, request: UpdateTaxPeriodRequest): Observable<ApiResponse<TaxPeriod>> {
    return this.api.put<TaxPeriod>(`finance/tax-periods/${id}`, request);
  }

  deleteTaxPeriod(id: string): Observable<ApiResponse<unknown>> {
    return this.api.delete<unknown>(`finance/tax-periods/${id}`);
  }

  closeTaxPeriod(id: string): Observable<ApiResponse<unknown>> {
    return this.api.post<unknown>(`finance/tax-periods/${id}/close`, {});
  }

  // --- Invoice ---

  getInvoices(filters: InvoiceListFilters = {}): Observable<ApiResponse<InvoiceListResponse>> {
    return this.api.get<InvoiceListResponse>('finance/invoices', filters);
  }

  createInvoice(request: CreateInvoiceRequest): Observable<ApiResponse<Invoice>> {
    return this.api.post<Invoice>('finance/invoices', request);
  }

  bulkImportInvoices(request: BulkImportInvoicesRequest): Observable<ApiResponse<BulkImportInvoicesResponse>> {
    return this.api.post<BulkImportInvoicesResponse>('finance/invoices/bulk-import', request);
  }

  getInvoice(id: string): Observable<ApiResponse<Invoice>> {
    return this.api.get<Invoice>(`finance/invoices/${id}`);
  }

  updateInvoice(id: string, request: UpdateInvoiceRequest): Observable<ApiResponse<Invoice>> {
    return this.api.put<Invoice>(`finance/invoices/${id}`, request);
  }

  deleteInvoice(id: string): Observable<ApiResponse<unknown>> {
    return this.api.delete<unknown>(`finance/invoices/${id}`);
  }

  // --- TaxCalculation ---

  getTaxCalculation(taxPeriodId: string): Observable<ApiResponse<{ tax_calculation: TaxCalculation }>> {
    return this.api.get<{ tax_calculation: TaxCalculation }>(`finance/tax-calculations/${taxPeriodId}`);
  }

  calculateTax(taxPeriodId: string): Observable<ApiResponse<{ tax_calculation: TaxCalculation }>> {
    return this.api.post<{ tax_calculation: TaxCalculation }>(`finance/tax-calculations/${taxPeriodId}/calculate`, {});
  }

  recalculateTax(taxPeriodId: string): Observable<ApiResponse<{ tax_calculation: TaxCalculation }>> {
    return this.api.post<{ tax_calculation: TaxCalculation }>(`finance/tax-calculations/${taxPeriodId}/recalculate`, {});
  }
}
