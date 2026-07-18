import { Component, CUSTOM_ELEMENTS_SCHEMA, input, output, ViewEncapsulation } from '@angular/core';
import EmptyState from '../empty-state/empty-state';

export interface DataTableColumn<T = object> {
  key: keyof T | string;
  header: string;
  width?: string;
}

export interface DataTableAction<T = object> {
  key: string;
  label: string;
  icon?: string;
}

@Component({
  selector: 'app-data-table',
  standalone: true,
  imports: [EmptyState],
  templateUrl: './data-table.html',
  styleUrl: './data-table.scss',
  encapsulation: ViewEncapsulation.None,
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
})
export default class DataTable<T extends object> {
  readonly columns = input.required<DataTableColumn<T>[]>();
  readonly rows = input.required<T[]>();
  readonly loading = input<boolean>(false);
  readonly rowActions = input<DataTableAction<T>[]>([]);
  readonly rowClick = output<T>();
  readonly rowActionClick = output<{ action: string; row: T }>();

  protected getCellValue(row: T, column: DataTableColumn<T>): unknown {
    return (row as Record<string, unknown>)[column.key as string];
  }

  protected onRowClick(row: T): void {
    this.rowClick.emit(row);
  }

  protected onActionClick(event: Event, action: string, row: T): void {
    event.stopPropagation();
    this.rowActionClick.emit({ action, row });
  }
}
