import { inject, Service } from '@angular/core';
import { Observable } from 'rxjs';
import { Api } from '../../../core/services/api';
import { ApiResponse } from '../../../core/models/api-response.model';
import {
  AgingReport,
  CollectionLog,
  CollectionLogFilters,
  CollectionLogListResponse,
  CreateCollectionLogRequest,
  CreateCreditScheduleRequest,
  CreditAccountSchedule,
  CreditScheduleFilters,
  CreditScheduleListResponse,
  RecordPaymentRequest,
  UpdateCollectionLogRequest,
  UpdateCreditScheduleRequest,
} from '../../../core/models/credit-control.model';

/**
 * Servicio de control de crédito y cobranza.
 * Expone operaciones HTTP del namespace `/credit-control`.
 */
@Service()
export class CreditControlService {
  private readonly api = inject(Api);

  // --- Credit Schedules ---

  getSchedules(filters: CreditScheduleFilters = {}): Observable<ApiResponse<CreditScheduleListResponse>> {
    return this.api.get<CreditScheduleListResponse>('credit-control/schedules', filters);
  }

  getSchedule(id: string): Observable<ApiResponse<{ schedule: CreditAccountSchedule }>> {
    return this.api.get<{ schedule: CreditAccountSchedule }>(`credit-control/schedules/${id}`);
  }

  createSchedule(
    request: CreateCreditScheduleRequest
  ): Observable<ApiResponse<{ schedule: CreditAccountSchedule }>> {
    return this.api.post<{ schedule: CreditAccountSchedule }>('credit-control/schedules', request);
  }

  updateSchedule(
    id: string,
    request: UpdateCreditScheduleRequest
  ): Observable<ApiResponse<{ schedule: CreditAccountSchedule }>> {
    return this.api.put<{ schedule: CreditAccountSchedule }>(`credit-control/schedules/${id}`, request);
  }

  deleteSchedule(id: string): Observable<ApiResponse<unknown>> {
    return this.api.delete<unknown>(`credit-control/schedules/${id}`);
  }

  recordPayment(
    id: string,
    request: RecordPaymentRequest
  ): Observable<ApiResponse<{ schedule: CreditAccountSchedule }>> {
    return this.api.post<{ schedule: CreditAccountSchedule }>(
      `credit-control/schedules/${id}/record-payment`,
      request
    );
  }

  getScheduleLogs(
    id: string,
    filters: { limit?: number; offset?: number } = {}
  ): Observable<ApiResponse<CollectionLogListResponse>> {
    return this.api.get<CollectionLogListResponse>(`credit-control/schedules/${id}/logs`, filters);
  }

  // --- Collection Logs ---

  getCollectionLog(id: string): Observable<ApiResponse<{ collection_log: CollectionLog }>> {
    return this.api.get<{ collection_log: CollectionLog }>(`credit-control/collection-logs/${id}`);
  }

  getCollectionLogs(filters: CollectionLogFilters = {}): Observable<ApiResponse<CollectionLogListResponse>> {
    return this.api.get<CollectionLogListResponse>('credit-control/collection-logs', filters);
  }

  createCollectionLog(
    request: CreateCollectionLogRequest
  ): Observable<ApiResponse<{ collection_log: CollectionLog }>> {
    return this.api.post<{ collection_log: CollectionLog }>('credit-control/collection-logs', request);
  }

  updateCollectionLog(
    id: string,
    request: UpdateCollectionLogRequest
  ): Observable<ApiResponse<{ collection_log: CollectionLog }>> {
    return this.api.put<{ collection_log: CollectionLog }>(`credit-control/collection-logs/${id}`, request);
  }

  deleteCollectionLog(id: string): Observable<ApiResponse<unknown>> {
    return this.api.delete<unknown>(`credit-control/collection-logs/${id}`);
  }

  // --- Aging Report ---

  getAgingReport(): Observable<ApiResponse<AgingReport>> {
    return this.api.get<AgingReport>('credit-control/aging-report');
  }
}
