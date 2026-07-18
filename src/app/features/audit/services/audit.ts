import { inject, Service } from '@angular/core';
import { Observable } from 'rxjs';
import { Api } from '../../../core/services/api';
import { ApiResponse } from '../../../core/models/api-response.model';
import { AuditLogFilters, AuditLogListResponse } from '../../../core/models/audit.model';

/**
 * Servicio de auditoría. Expone operaciones HTTP de logs del tenant.
 */
@Service()
export class AuditService {
  private readonly api = inject(Api);

  /**
   * Obtiene los logs de auditoría del tenant.
   * @param filters Filtros de paginación y entidad.
   */
  getAuditLogs(filters: AuditLogFilters = {}): Observable<ApiResponse<AuditLogListResponse>> {
    return this.api.get<AuditLogListResponse>('audit', filters);
  }
}
