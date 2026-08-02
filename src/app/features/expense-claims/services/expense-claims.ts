import { inject, Service } from '@angular/core';
import { Observable } from 'rxjs';
import { Api } from '../../../core/services/api';
import { ApiResponse } from '../../../core/models/api-response.model';
import {
  CreateExpenseClaimItemRequest,
  CreateExpenseClaimRequest,
  ExpenseClaim,
  ExpenseClaimFilters,
  ExpenseClaimItem,
  ExpenseClaimItemListResponse,
  ExpenseClaimListResponse,
  SettleExpenseClaimRequest,
  UpdateExpenseClaimItemRequest,
  UpdateExpenseClaimRequest,
} from '../../../core/models/expense-claims.model';

/**
 * Servicio de rendición de gastos. Expone operaciones HTTP del módulo Expense Claims.
 */
@Service()
export class ExpenseClaimsService {
  private readonly api = inject(Api);

  getExpenseClaims(filters: ExpenseClaimFilters = {}): Observable<ApiResponse<ExpenseClaimListResponse>> {
    return this.api.get<ExpenseClaimListResponse>('expense-claims', filters);
  }

  getExpenseClaim(id: string): Observable<ApiResponse<{ expense_claim: ExpenseClaim }>> {
    return this.api.get<{ expense_claim: ExpenseClaim }>(`expense-claims/${id}`);
  }

  createExpenseClaim(
    request: CreateExpenseClaimRequest
  ): Observable<ApiResponse<{ expense_claim: ExpenseClaim }>> {
    return this.api.post<{ expense_claim: ExpenseClaim }>('expense-claims', request);
  }

  updateExpenseClaim(
    id: string,
    request: UpdateExpenseClaimRequest
  ): Observable<ApiResponse<{ expense_claim: ExpenseClaim }>> {
    return this.api.put<{ expense_claim: ExpenseClaim }>(`expense-claims/${id}`, request);
  }

  deleteExpenseClaim(id: string): Observable<ApiResponse<unknown>> {
    return this.api.delete<unknown>(`expense-claims/${id}`);
  }

  submitExpenseClaim(id: string): Observable<ApiResponse<{ expense_claim: ExpenseClaim }>> {
    return this.api.post<{ expense_claim: ExpenseClaim }>(`expense-claims/${id}/submit`, {});
  }

  approveExpenseClaim(id: string): Observable<ApiResponse<{ expense_claim: ExpenseClaim }>> {
    return this.api.post<{ expense_claim: ExpenseClaim }>(`expense-claims/${id}/approve`, {});
  }

  rejectExpenseClaim(id: string): Observable<ApiResponse<{ expense_claim: ExpenseClaim }>> {
    return this.api.post<{ expense_claim: ExpenseClaim }>(`expense-claims/${id}/reject`, {});
  }

  settleExpenseClaim(
    id: string,
    request: SettleExpenseClaimRequest = {}
  ): Observable<ApiResponse<{ expense_claim: ExpenseClaim }>> {
    return this.api.post<{ expense_claim: ExpenseClaim }>(`expense-claims/${id}/settle`, request);
  }

  getExpenseClaimItems(
    id: string,
    filters: { limit?: number; offset?: number } = {}
  ): Observable<ApiResponse<ExpenseClaimItemListResponse>> {
    return this.api.get<ExpenseClaimItemListResponse>(`expense-claims/${id}/items`, filters);
  }

  getExpenseClaimItem(
    id: string,
    itemId: string
  ): Observable<ApiResponse<{ item: ExpenseClaimItem }>> {
    return this.api.get<{ item: ExpenseClaimItem }>(`expense-claims/${id}/items/${itemId}`);
  }

  createExpenseClaimItem(
    id: string,
    request: CreateExpenseClaimItemRequest
  ): Observable<ApiResponse<{ item: ExpenseClaimItem }>> {
    return this.api.post<{ item: ExpenseClaimItem }>(`expense-claims/${id}/items`, request);
  }

  updateExpenseClaimItem(
    id: string,
    itemId: string,
    request: UpdateExpenseClaimItemRequest
  ): Observable<ApiResponse<{ item: ExpenseClaimItem }>> {
    return this.api.put<{ item: ExpenseClaimItem }>(`expense-claims/${id}/items/${itemId}`, request);
  }

  deleteExpenseClaimItem(id: string, itemId: string): Observable<ApiResponse<unknown>> {
    return this.api.delete<unknown>(`expense-claims/${id}/items/${itemId}`);
  }
}
