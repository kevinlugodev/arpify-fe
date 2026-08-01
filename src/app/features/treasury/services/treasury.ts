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
  BankTransaction,
  BankTransactionFilters,
  BankTransactionListResponse,
  CreateBankAccountRequest,
  CreateBankTransactionRequest,
  CreatePayableRequest,
  Payable,
  PayableFilters,
  PayableListResponse,
  ReverseBankTransactionResponse,
  UpdateBankAccountRequest,
  UpdatePayableRequest,
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
}
