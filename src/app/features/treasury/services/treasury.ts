import { inject, Service } from '@angular/core';
import { Observable } from 'rxjs';
import { Api } from '../../../core/services/api';
import { ApiResponse } from '../../../core/models/api-response.model';
import {
  Bank,
  BankAccount,
  BankAccountFilters,
  BankAccountListResponse,
  BankFilters,
  BankListResponse,
  BankStatement,
  BankStatementFilters,
  BankStatementItem,
  BankStatementListResponse,
  BankTransaction,
  BankTransactionFilters,
  BankTransactionListResponse,
  CashFlowForecast,
  CashFlowForecastFilters,
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
  PayableFilters,
  PayableListResponse,
  PettyCashFund,
  PettyCashFundFilters,
  PettyCashFundListResponse,
  ReplenishPettyCashFundRequest,
  ReverseBankTransactionResponse,
  ServiceOrder,
  ServiceOrderAdvance,
  ServiceOrderFilters,
  ServiceOrderListResponse,
  UpdateBankAccountRequest,
  UpdatePayableRequest,
  UpdatePettyCashFundRequest,
  UpdateServiceOrderRequest,
} from '../../../core/models/treasury.model';

/**
 * Servicio de tesorería. Expone operaciones HTTP del módulo Treasury.
 */
@Service()
export class TreasuryService {
  private readonly api = inject(Api);

  // --- Bank Accounts ---

  getBankAccounts(filters: BankAccountFilters = {}): Observable<ApiResponse<BankAccountListResponse>> {
    return this.api.get<BankAccountListResponse>('treasury/bank-accounts', filters);
  }

  createBankAccount(request: CreateBankAccountRequest): Observable<ApiResponse<{ bank_account: BankAccount }>> {
    return this.api.post<{ bank_account: BankAccount }>('treasury/bank-accounts', request);
  }

  updateBankAccount(id: string, request: UpdateBankAccountRequest): Observable<ApiResponse<{ bank_account: BankAccount }>> {
    return this.api.put<{ bank_account: BankAccount }>(`treasury/bank-accounts/${id}`, request);
  }

  deleteBankAccount(id: string): Observable<ApiResponse<unknown>> {
    return this.api.delete<unknown>(`treasury/bank-accounts/${id}`);
  }

  // --- Banks ---

  getBanks(filters: BankFilters = {}): Observable<ApiResponse<BankListResponse>> {
    return this.api.get<BankListResponse>('treasury/banks', filters);
  }

  getBank(id: string): Observable<ApiResponse<{ bank: Bank }>> {
    return this.api.get<{ bank: Bank }>(`treasury/banks/${id}`);
  }

  // --- Payables ---

  getPayables(filters: PayableFilters = {}): Observable<ApiResponse<PayableListResponse>> {
    return this.api.get<PayableListResponse>('treasury/payables', filters);
  }

  createPayable(request: CreatePayableRequest): Observable<ApiResponse<{ payable: Payable }>> {
    return this.api.post<{ payable: Payable }>('treasury/payables', request);
  }

  updatePayable(id: string, request: UpdatePayableRequest): Observable<ApiResponse<{ payable: Payable }>> {
    return this.api.put<{ payable: Payable }>(`treasury/payables/${id}`, request);
  }

  deletePayable(id: string): Observable<ApiResponse<unknown>> {
    return this.api.delete<unknown>(`treasury/payables/${id}`);
  }

  // --- Bank Transactions ---

  getTransactions(filters: BankTransactionFilters = {}): Observable<ApiResponse<BankTransactionListResponse>> {
    return this.api.get<BankTransactionListResponse>('treasury/transactions', filters);
  }

  createTransaction(request: CreateBankTransactionRequest): Observable<ApiResponse<{ bank_transaction: BankTransaction }>> {
    return this.api.post<{ bank_transaction: BankTransaction }>('treasury/transactions', request);
  }

  reverseTransaction(id: string): Observable<ApiResponse<ReverseBankTransactionResponse>> {
    return this.api.post<ReverseBankTransactionResponse>(`treasury/transactions/${id}/reverse`, {});
  }

  // --- Service Orders ---

  getServiceOrders(filters: ServiceOrderFilters = {}): Observable<ApiResponse<ServiceOrderListResponse>> {
    return this.api.get<ServiceOrderListResponse>('treasury/service-orders', filters);
  }

  getServiceOrder(id: string): Observable<ApiResponse<{ service_order: ServiceOrder }>> {
    return this.api.get<{ service_order: ServiceOrder }>(`treasury/service-orders/${id}`);
  }

  createServiceOrder(request: CreateServiceOrderRequest): Observable<ApiResponse<{ service_order: ServiceOrder }>> {
    return this.api.post<{ service_order: ServiceOrder }>('treasury/service-orders', request);
  }

  updateServiceOrder(id: string, request: UpdateServiceOrderRequest): Observable<ApiResponse<{ service_order: ServiceOrder }>> {
    return this.api.put<{ service_order: ServiceOrder }>(`treasury/service-orders/${id}`, request);
  }

  deleteServiceOrder(id: string): Observable<ApiResponse<unknown>> {
    return this.api.delete<unknown>(`treasury/service-orders/${id}`);
  }

  createServiceOrderAdvance(
    id: string,
    request: CreateServiceOrderAdvanceRequest
  ): Observable<ApiResponse<{ advance: ServiceOrderAdvance; bank_transaction: BankTransaction }>> {
    return this.api.post<{ advance: ServiceOrderAdvance; bank_transaction: BankTransaction }>(
      `treasury/service-orders/${id}/advances`,
      request
    );
  }

  linkServiceOrderPayable(
    id: string,
    request: LinkServiceOrderPayableRequest
  ): Observable<ApiResponse<{ payable: Payable }>> {
    return this.api.post<{ payable: Payable }>(`treasury/service-orders/${id}/link-payable`, request);
  }

  // --- Petty Cash Funds ---

  getPettyCashFunds(filters: PettyCashFundFilters = {}): Observable<ApiResponse<PettyCashFundListResponse>> {
    return this.api.get<PettyCashFundListResponse>('treasury/petty-cash-funds', filters);
  }

  getPettyCashFund(id: string): Observable<ApiResponse<{ petty_cash_fund: PettyCashFund }>> {
    return this.api.get<{ petty_cash_fund: PettyCashFund }>(`treasury/petty-cash-funds/${id}`);
  }

  createPettyCashFund(request: CreatePettyCashFundRequest): Observable<ApiResponse<{ petty_cash_fund: PettyCashFund }>> {
    return this.api.post<{ petty_cash_fund: PettyCashFund }>('treasury/petty-cash-funds', request);
  }

  updatePettyCashFund(
    id: string,
    request: UpdatePettyCashFundRequest
  ): Observable<ApiResponse<{ petty_cash_fund: PettyCashFund }>> {
    return this.api.put<{ petty_cash_fund: PettyCashFund }>(`treasury/petty-cash-funds/${id}`, request);
  }

  deletePettyCashFund(id: string): Observable<ApiResponse<unknown>> {
    return this.api.delete<unknown>(`treasury/petty-cash-funds/${id}`);
  }

  replenishPettyCashFund(
    id: string,
    request: ReplenishPettyCashFundRequest
  ): Observable<ApiResponse<{ bank_transaction: BankTransaction; petty_cash_fund: PettyCashFund }>> {
    return this.api.post<{ bank_transaction: BankTransaction; petty_cash_fund: PettyCashFund }>(
      `treasury/petty-cash-funds/${id}/replenish`,
      request
    );
  }

  createPettyCashExpense(
    id: string,
    request: CreatePettyCashExpenseRequest
  ): Observable<ApiResponse<{ petty_cash_fund: PettyCashFund }>> {
    return this.api.post<{ petty_cash_fund: PettyCashFund }>(`treasury/petty-cash-funds/${id}/expenses`, request);
  }

  // --- Bank Statements ---

  getBankStatements(filters: BankStatementFilters = {}): Observable<ApiResponse<BankStatementListResponse>> {
    return this.api.get<BankStatementListResponse>('treasury/bank-statements', filters);
  }

  getBankStatement(id: string): Observable<ApiResponse<{ bank_statement: BankStatement }>> {
    return this.api.get<{ bank_statement: BankStatement }>(`treasury/bank-statements/${id}`);
  }

  createBankStatement(request: CreateBankStatementRequest): Observable<ApiResponse<{ bank_statement: BankStatement }>> {
    return this.api.post<{ bank_statement: BankStatement }>('treasury/bank-statements', request);
  }

  deleteBankStatement(id: string): Observable<ApiResponse<unknown>> {
    return this.api.delete<unknown>(`treasury/bank-statements/${id}`);
  }

  getBankStatementItems(id: string): Observable<ApiResponse<{ items: BankStatementItem[]; total: number }>> {
    return this.api.get<{ items: BankStatementItem[]; total: number }>(`treasury/bank-statements/${id}/items`);
  }

  matchBankStatementItem(id: string, request: MatchBankStatementItemRequest): Observable<ApiResponse<unknown>> {
    return this.api.post<unknown>(`treasury/bank-statement-items/${id}/match`, request);
  }

  // --- Cash Flow Forecast ---

  getCashFlowForecast(filters: CashFlowForecastFilters): Observable<ApiResponse<{ forecast: CashFlowForecast }>> {
    return this.api.get<{ forecast: CashFlowForecast }>('treasury/cash-flow-forecast', filters);
  }
}
