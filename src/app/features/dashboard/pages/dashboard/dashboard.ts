import { Component, computed, CUSTOM_ELEMENTS_SCHEMA, inject, ViewEncapsulation } from '@angular/core';
import { RouterLink } from '@angular/router';
import { toast } from 'ngx-sonner';
import InfoTip from '../../../../shared/components/info-tip/info-tip';
import PageHeader from '../../../../shared/components/page-header/page-header';
import StatCard from '../../../../shared/components/stat-card/stat-card';
import { WelcomeModal } from '../../../../shared/components/welcome-modal/welcome-modal';
import { DashboardService } from '../../services/dashboard';
import { apiResource } from '../../../../core/utils/resource-helpers';
import { toApiPromise } from '../../../../core/utils/api-response';
import { DashboardMetrics } from '../../../../core/models/dashboard.model';

@Component({
  selector: 'app-dashboard',
  imports: [RouterLink, PageHeader, StatCard, InfoTip, WelcomeModal],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.scss',
  encapsulation: ViewEncapsulation.None,
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
})
export default class Dashboard {
  private readonly dashboardService = inject(DashboardService);

  /** Recurso reactivo de métricas del dashboard. */
  private readonly metricsResource = apiResource<DashboardMetrics>(async () => {
    try {
      const response = await toApiPromise(this.dashboardService.getMetrics());
      return response.metrics;
    } catch {
      toast.error('Error al cargar métricas del dashboard');
      return {
        team_members_not_terminated_count: 0,
        active_managements_count: 0,
        active_areas_count: 0,
        active_customers_count: 0,
      };
    }
  });

  protected readonly metrics = computed(() => this.metricsResource.value());
  protected readonly loadingMetrics = computed(() => this.metricsResource.isLoading());
}
