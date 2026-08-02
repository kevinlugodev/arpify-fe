import { Component, computed, CUSTOM_ELEMENTS_SCHEMA, input, output, ViewEncapsulation } from '@angular/core';
import DataTable, { DataTableAction, DataTableColumn } from '../../../../shared/components/data-table/data-table';
import EmptyState from '../../../../shared/components/empty-state/empty-state';
import { ProfitDistribution } from '../../../../core/models/partner-equity.model';

@Component({
  selector: 'app-profit-distribution-list',
  standalone: true,
  imports: [DataTable, EmptyState],
  templateUrl: './profit-distribution-list.html',
  styleUrl: './profit-distribution-list.scss',
  encapsulation: ViewEncapsulation.None,
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
})
export default class ProfitDistributionListComponent {
  readonly distributions = input.required<ProfitDistribution[]>();
  readonly loading = input<boolean>(false);

  readonly reload = output<void>();

  protected readonly rows = computed<ProfitDistribution[]>(() => this.distributions());

  protected readonly columns: DataTableColumn<ProfitDistribution>[] = [
    { key: 'distribution_code', header: 'Código' },
    { key: 'gross_pool_amount', header: 'Monto bruto' },
    { key: 'reserve_percentage', header: '% Reserva' },
    { key: 'reserved_tax_opex_amount', header: 'Reserva imp./opex' },
    { key: 'distributable_net_amount', header: 'Neto distribuible' },
    { key: 'distribution_date', header: 'Fecha' },
  ];

  protected readonly actions: DataTableAction<ProfitDistribution>[] = [];
}
