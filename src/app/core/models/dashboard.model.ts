export interface DashboardMetrics {
  team_members_not_terminated_count: number;
  active_managements_count: number;
  active_areas_count: number;
  active_customers_count: number;
}

export interface DashboardMetricsResponse {
  metrics: DashboardMetrics;
}
