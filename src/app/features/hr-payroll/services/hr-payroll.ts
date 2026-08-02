import { inject, Service } from '@angular/core';
import { Observable } from 'rxjs';
import { Api } from '../../../core/services/api';
import { ApiResponse } from '../../../core/models/api-response.model';
import {
  AddEmployeeToPayrollRunRequest,
  ApprovePayrollRunResponse,
  CancelPayrollRunResponse,
  CreateEmployeeCompensationRequest,
  CreatePayrollRunRequest,
  EmployeeCompensation,
  EmployeeCompensationFilters,
  EmployeeCompensationListResponse,
  PayrollItem,
  PayrollItemListResponse,
  PayrollRun,
  PayrollRunFilters,
  PayrollRunListResponse,
  UpdateEmployeeCompensationRequest,
  UpdatePayrollRunRequest,
} from '../../../core/models/hr-payroll.model';

/**
 * Servicio de planillas (HR Payroll). Expone operaciones HTTP del módulo.
 */
@Service()
export class HrPayrollService {
  private readonly api = inject(Api);

  // --- Employee Compensations ---

  createCompensation(
    request: CreateEmployeeCompensationRequest
  ): Observable<ApiResponse<{ compensation: EmployeeCompensation }>> {
    return this.api.post<{ compensation: EmployeeCompensation }>('hr-payroll/compensations', request);
  }

  getCompensation(id: string): Observable<ApiResponse<{ compensation: EmployeeCompensation }>> {
    return this.api.get<{ compensation: EmployeeCompensation }>(`hr-payroll/compensations/${id}`);
  }

  getCompensations(filters: EmployeeCompensationFilters = {}): Observable<ApiResponse<EmployeeCompensationListResponse>> {
    return this.api.get<EmployeeCompensationListResponse>('hr-payroll/compensations', filters);
  }

  updateCompensation(
    id: string,
    request: UpdateEmployeeCompensationRequest
  ): Observable<ApiResponse<{ compensation: EmployeeCompensation }>> {
    return this.api.put<{ compensation: EmployeeCompensation }>(`hr-payroll/compensations/${id}`, request);
  }

  deleteCompensation(id: string): Observable<ApiResponse<unknown>> {
    return this.api.delete<unknown>(`hr-payroll/compensations/${id}`);
  }

  // --- Payroll Runs ---

  createPayrollRun(request: CreatePayrollRunRequest): Observable<ApiResponse<{ payroll_run: PayrollRun }>> {
    return this.api.post<{ payroll_run: PayrollRun }>('hr-payroll/payroll-runs', request);
  }

  getPayrollRun(id: string): Observable<ApiResponse<{ payroll_run: PayrollRun }>> {
    return this.api.get<{ payroll_run: PayrollRun }>(`hr-payroll/payroll-runs/${id}`);
  }

  getPayrollRuns(filters: PayrollRunFilters = {}): Observable<ApiResponse<PayrollRunListResponse>> {
    return this.api.get<PayrollRunListResponse>('hr-payroll/payroll-runs', filters);
  }

  updatePayrollRun(id: string, request: UpdatePayrollRunRequest): Observable<ApiResponse<{ payroll_run: PayrollRun }>> {
    return this.api.put<{ payroll_run: PayrollRun }>(`hr-payroll/payroll-runs/${id}`, request);
  }

  deletePayrollRun(id: string): Observable<ApiResponse<unknown>> {
    return this.api.delete<unknown>(`hr-payroll/payroll-runs/${id}`);
  }

  // --- Payroll Run Employees / Items ---

  addEmployeeToPayrollRun(
    id: string,
    request: AddEmployeeToPayrollRunRequest
  ): Observable<ApiResponse<{ item: PayrollItem }>> {
    return this.api.post<{ item: PayrollItem }>(`hr-payroll/payroll-runs/${id}/employees`, request);
  }

  removeEmployeeFromPayrollRun(id: string, employeeId: string): Observable<ApiResponse<unknown>> {
    return this.api.delete<unknown>(`hr-payroll/payroll-runs/${id}/employees/${employeeId}`);
  }

  getPayrollRunItems(id: string, limit = 200, offset = 0): Observable<ApiResponse<PayrollItemListResponse>> {
    return this.api.get<PayrollItemListResponse>(`hr-payroll/payroll-runs/${id}/items`, { limit, offset });
  }

  // --- Payroll Run Transitions ---

  approvePayrollRun(id: string): Observable<ApiResponse<ApprovePayrollRunResponse>> {
    return this.api.post<ApprovePayrollRunResponse>(`hr-payroll/payroll-runs/${id}/approve`, {});
  }

  cancelPayrollRun(id: string): Observable<ApiResponse<CancelPayrollRunResponse>> {
    return this.api.post<CancelPayrollRunResponse>(`hr-payroll/payroll-runs/${id}/cancel`, {});
  }
}
