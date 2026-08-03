import { Component, CUSTOM_ELEMENTS_SCHEMA, input, output, ViewEncapsulation } from '@angular/core';
import DataTable, { DataTableAction, DataTableColumn } from '../../../../shared/components/data-table/data-table';
import EmptyState from '../../../../shared/components/empty-state/empty-state';
import { CostCenter } from '../../../../core/models/cost-centers.model';

@Component({
  selector: 'app-cost-center-list',
  standalone: true,
  imports: [DataTable, EmptyState],
  templateUrl: './cost-center-list.html',
  styleUrl: './cost-center-list.scss',
  encapsulation: ViewEncapsulation.None,
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
})
export default class CostCenterListComponent {
  readonly costCenters = input.required<CostCenter[]>();
  readonly loading = input<boolean>(false);

  readonly edit = output<CostCenter>();
  readonly delete = output<CostCenter>();

  protected readonly columns: DataTableColumn<CostCenter>[] = [
    { key: 'code', header: 'Código' },
    { key: 'name', header: 'Nombre' },
    { key: 'description', header: 'Descripción' },
    { key: 'status', header: 'Estado', type: 'status', statusDomain: 'cost-center' },
  ];

  protected readonly actions: DataTableAction<CostCenter>[] = [
    { key: 'edit', label: 'Editar', icon: 'bi-pencil' },
    { key: 'delete', label: 'Eliminar', icon: 'bi-trash' },
  ];

  protected onAction(event: { action: string; row: CostCenter }): void {
    if (event.action === 'edit') {
      this.edit.emit(event.row);
      return;
    }
    if (event.action === 'delete') {
      this.delete.emit(event.row);
    }
  }
}
