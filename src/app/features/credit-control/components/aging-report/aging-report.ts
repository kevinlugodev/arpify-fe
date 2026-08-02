import { Component, computed, CUSTOM_ELEMENTS_SCHEMA, inject, ViewEncapsulation } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { toast } from 'ngx-sonner';
import { AgingBucket, AgingBucketSummary, AgingReport } from '../../../../core/models/credit-control.model';
import { CreditControlService } from '../../services/credit-control';
import { toApiPromise } from '../../../../core/utils/api-response';
import { apiResource } from '../../../../core/utils/resource-helpers';

interface BucketView {
  key: AgingBucket;
  label: string;
  total: number;
  count: number;
}

const BUCKET_LABELS: Record<AgingBucket, string> = {
  CURRENT: 'Al día',
  OVERDUE_1_30: 'Vencido 1-30 días',
  OVERDUE_31_60: 'Vencido 31-60 días',
  OVERDUE_61_90: 'Vencido 61-90 días',
  OVERDUE_90_PLUS: 'Vencido más de 90 días',
};

@Component({
  selector: 'app-aging-report',
  standalone: true,
  imports: [DecimalPipe],
  templateUrl: './aging-report.html',
  styleUrl: './aging-report.scss',
  encapsulation: ViewEncapsulation.None,
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
})
export default class AgingReportComponent {
  private readonly creditControlService = inject(CreditControlService);

  private readonly reportResource = apiResource<AgingReport>(async () => {
    try {
      return await toApiPromise(this.creditControlService.getAgingReport());
    } catch {
      toast.error('Error al cargar el aging report');
      return {
        buckets: {
          CURRENT: { total: 0, count: 0 },
          OVERDUE_1_30: { total: 0, count: 0 },
          OVERDUE_31_60: { total: 0, count: 0 },
          OVERDUE_61_90: { total: 0, count: 0 },
          OVERDUE_90_PLUS: { total: 0, count: 0 },
        },
        total_outstanding: 0,
        total_count: 0,
      };
    }
  });

  protected readonly report = computed<AgingReport>(() => this.reportResource.value() ?? {
    buckets: {
      CURRENT: { total: 0, count: 0 },
      OVERDUE_1_30: { total: 0, count: 0 },
      OVERDUE_31_60: { total: 0, count: 0 },
      OVERDUE_61_90: { total: 0, count: 0 },
      OVERDUE_90_PLUS: { total: 0, count: 0 },
    },
    total_outstanding: 0,
    total_count: 0,
  });

  protected readonly loading = computed(() => this.reportResource.isLoading());

  protected readonly buckets = computed<BucketView[]>(() => {
    const report = this.report();
    const bucketKeys: AgingBucket[] = ['CURRENT', 'OVERDUE_1_30', 'OVERDUE_31_60', 'OVERDUE_61_90', 'OVERDUE_90_PLUS'];
    return bucketKeys.map((key) => ({
      key,
      label: BUCKET_LABELS[key],
      total: report.buckets[key]?.total ?? 0,
      count: report.buckets[key]?.count ?? 0,
    }));
  });

  protected readonly totalOutstanding = computed(() => this.report().total_outstanding);
  protected readonly totalCount = computed(() => this.report().total_count);
}
