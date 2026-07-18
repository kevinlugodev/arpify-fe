import { inject, Service } from '@angular/core';
import { Observable } from 'rxjs';
import { Api } from '../../../core/services/api';
import { ApiResponse } from '../../../core/models/api-response.model';
import { AuditLogFilters, AuditLogListResponse } from '../../../core/models/audit.model';
import { ChangePasswordRequest, UpdateProfileRequest, UserProfile } from '../../../core/models/user.model';

/**
 * Servicio de "Mi Cuenta". Expone operaciones HTTP del perfil y logs de auditoría.
 */
@Service()
export class MeService {
  private readonly api = inject(Api);

  /**
   * Obtiene el perfil del usuario autenticado.
   */
  getProfile(): Observable<ApiResponse<UserProfile>> {
    return this.api.get<UserProfile>('me');
  }

  /**
   * Actualiza el perfil del usuario autenticado.
   * @param request Datos a actualizar.
   */
  updateProfile(request: UpdateProfileRequest): Observable<ApiResponse<unknown>> {
    return this.api.put<unknown>('me', request);
  }

  /**
   * Cambia la contraseña del usuario autenticado.
   * @param request Contraseña actual y nueva contraseña.
   */
  changePassword(request: ChangePasswordRequest): Observable<ApiResponse<unknown>> {
    return this.api.post<unknown>('me/change-password', request);
  }

  /**
   * Obtiene los logs de auditoría del usuario actual.
   * @param filters Filtros de paginación y entidad.
   */
  getAuditLogs(filters: AuditLogFilters = {}): Observable<ApiResponse<AuditLogListResponse>> {
    return this.api.get<AuditLogListResponse>('me/audit-logs', filters);
  }
}
