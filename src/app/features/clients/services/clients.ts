import { inject, Service } from '@angular/core';
import { Observable } from 'rxjs';
import { Api } from '../../../core/services/api';
import { ApiResponse } from '../../../core/models/api-response.model';
import {
  CreateCustomerRequest,
  Customer,
  CustomerListFilters,
  CustomerListResponse,
  UpdateCustomerRequest,
} from '../../../core/models/clients.model';

/**
 * Servicio de clientes. Expone operaciones HTTP del módulo de clientes.
 */
@Service()
export class ClientsService {
  private readonly api = inject(Api);

  /**
   * Lista los clientes del tenant con filtros opcionales.
   */
  getCustomers(filters: CustomerListFilters = {}): Observable<ApiResponse<CustomerListResponse>> {
    return this.api.get<CustomerListResponse>('clients', filters);
  }

  /**
   * Obtiene un cliente por su ID.
   */
  getCustomer(id: string): Observable<ApiResponse<{ customer: Customer }>> {
    return this.api.get<{ customer: Customer }>(`clients/${id}`);
  }

  /**
   * Crea un nuevo cliente.
   */
  createCustomer(request: CreateCustomerRequest): Observable<ApiResponse<{ customer: Customer }>> {
    return this.api.post<{ customer: Customer }>('clients', request);
  }

  /**
   * Actualiza un cliente existente.
   */
  updateCustomer(id: string, request: UpdateCustomerRequest): Observable<ApiResponse<{ customer: Customer }>> {
    return this.api.put<{ customer: Customer }>(`clients/${id}`, request);
  }

  /**
   * Elimina (soft-delete) un cliente.
   */
  deleteCustomer(id: string): Observable<ApiResponse<unknown>> {
    return this.api.delete<unknown>(`clients/${id}`);
  }
}
