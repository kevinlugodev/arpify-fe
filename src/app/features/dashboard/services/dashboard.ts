import { inject, Service } from '@angular/core';
import { Observable } from 'rxjs';
import { Api } from '../../../core/services/api';
import { ApiResponse } from '../../../core/models/api-response.model';
import { DashboardMetricsResponse } from '../../../core/models/dashboard.model';

/**
 * Servicio del dashboard. Expone métricas de resumen del tenant.
 */
@Service()
export class DashboardService {
  private readonly api = inject(Api);

  /**
   * Obtiene las métricas del dashboard.
   */
  getMetrics(): Observable<ApiResponse<DashboardMetricsResponse>> {
    return this.api.get<DashboardMetricsResponse>('dashboard/metrics');
  }
}
