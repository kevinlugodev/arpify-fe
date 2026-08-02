import { inject, Service } from '@angular/core';
import { Observable } from 'rxjs';
import { Api } from '../../../core/services/api';
import { ApiResponse } from '../../../core/models/api-response.model';
import {
  CreateAdvanceDrawRequest,
  CreatePartnerAccountRequest,
  CreateProfitDistributionRequest,
  CreateSettlementPaymentRequest,
  PartnerAccount,
  PartnerAccountFilters,
  PartnerAccountListResponse,
  PartnerAccountStatementResponse,
  PartnerDrawTransaction,
  PartnerDrawTransactionFilters,
  PartnerDrawTransactionListResponse,
  ProfitDistribution,
  ProfitDistributionFilters,
  ProfitDistributionListResponse,
  UpdatePartnerAccountRequest,
} from '../../../core/models/partner-equity.model';

/**
 * Servicio de cuentas de socios, distribución de utilidades y retiros.
 */
@Service()
export class PartnerEquityService {
  private readonly api = inject(Api);

  // --- Partner Accounts ---

  getPartnerAccounts(filters: PartnerAccountFilters = {}): Observable<ApiResponse<PartnerAccountListResponse>> {
    return this.api.get<PartnerAccountListResponse>('partner-equity/partner-accounts', filters);
  }

  getPartnerAccount(id: string): Observable<ApiResponse<{ partner_account: PartnerAccount }>> {
    return this.api.get<{ partner_account: PartnerAccount }>(`partner-equity/partner-accounts/${id}`);
  }

  createPartnerAccount(
    request: CreatePartnerAccountRequest
  ): Observable<ApiResponse<{ partner_account: PartnerAccount }>> {
    return this.api.post<{ partner_account: PartnerAccount }>('partner-equity/partner-accounts', request);
  }

  updatePartnerAccount(
    id: string,
    request: UpdatePartnerAccountRequest
  ): Observable<ApiResponse<{ partner_account: PartnerAccount }>> {
    return this.api.put<{ partner_account: PartnerAccount }>(`partner-equity/partner-accounts/${id}`, request);
  }

  deletePartnerAccount(id: string): Observable<ApiResponse<unknown>> {
    return this.api.delete<unknown>(`partner-equity/partner-accounts/${id}`);
  }

  getPartnerAccountStatement(
    id: string,
    filters: PartnerAccountFilters = {}
  ): Observable<ApiResponse<PartnerAccountStatementResponse>> {
    return this.api.get<PartnerAccountStatementResponse>(`partner-equity/partner-accounts/${id}/statement`, filters);
  }

  // --- Profit Distributions ---

  getProfitDistributions(
    filters: ProfitDistributionFilters = {}
  ): Observable<ApiResponse<ProfitDistributionListResponse>> {
    return this.api.get<ProfitDistributionListResponse>('partner-equity/profit-distributions', filters);
  }

  getProfitDistribution(id: string): Observable<ApiResponse<{ profit_distribution: ProfitDistribution }>> {
    return this.api.get<{ profit_distribution: ProfitDistribution }>(`partner-equity/profit-distributions/${id}`);
  }

  createProfitDistribution(
    request: CreateProfitDistributionRequest
  ): Observable<ApiResponse<{ profit_distribution: ProfitDistribution }>> {
    return this.api.post<{ profit_distribution: ProfitDistribution }>('partner-equity/profit-distributions', request);
  }

  // --- Partner Draw Transactions ---

  getDrawTransactions(
    filters: PartnerDrawTransactionFilters = {}
  ): Observable<ApiResponse<PartnerDrawTransactionListResponse>> {
    return this.api.get<PartnerDrawTransactionListResponse>('partner-equity/draw-transactions', filters);
  }

  getDrawTransaction(id: string): Observable<ApiResponse<{ draw_transaction: PartnerDrawTransaction }>> {
    return this.api.get<{ draw_transaction: PartnerDrawTransaction }>(`partner-equity/draw-transactions/${id}`);
  }

  createAdvanceDraw(
    id: string,
    request: CreateAdvanceDrawRequest
  ): Observable<ApiResponse<{ draw_transaction: PartnerDrawTransaction }>> {
    return this.api.post<{ draw_transaction: PartnerDrawTransaction }>(
      `partner-equity/partner-accounts/${id}/advance-draw`,
      request
    );
  }

  createSettlementPayment(
    id: string,
    request: CreateSettlementPaymentRequest
  ): Observable<ApiResponse<{ draw_transaction: PartnerDrawTransaction }>> {
    return this.api.post<{ draw_transaction: PartnerDrawTransaction }>(
      `partner-equity/partner-accounts/${id}/settlement-payment`,
      request
    );
  }
}
