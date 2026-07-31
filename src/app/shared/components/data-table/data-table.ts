import { Component, CUSTOM_ELEMENTS_SCHEMA, input, output, ViewEncapsulation } from '@angular/core';
import EmptyState from '../empty-state/empty-state';
import { EmailLink } from '../email-link/email-link';
import { StatusDomain, StatusTag } from '../status-tag/status-tag';
import { UserCell } from '../user-cell/user-cell';
import { FluentDropdown } from '../fluent-form-controls/fluent-form-controls';

export interface DataTableStatusOption {
  value: string;
  label: string;
}

export type DataTableCellType = 'text' | 'status' | 'status-select' | 'email' | 'user';

export interface DataTableColumn<T = object> {
  key: keyof T | string;
  header: string;
  width?: string;
  type?: DataTableCellType;
  statusDomain?: StatusDomain;
  statusOptions?: DataTableStatusOption[];
  userNameKey?: keyof T | string;
  userEmailKey?: keyof T | string;
  userPrefixKey?: keyof T | string;
}

export interface DataTableAction<T = object> {
  key: string;
  label: string;
  icon?: string;
}

@Component({
  selector: 'app-data-table',
  standalone: true,
  imports: [EmptyState, StatusTag, EmailLink, UserCell, FluentDropdown],
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
  readonly clickable = input<boolean>(false);
  readonly rowClick = output<T>();
  readonly rowActionClick = output<{ action: string; row: T }>();
  readonly statusChange = output<{ row: T; value: string }>();

  protected getCellValue(row: T, column: DataTableColumn<T>): unknown {
    return this.resolveValue(row, column.key as string);
  }

  protected resolveValue(row: T, key: keyof T | string | undefined): unknown {
    if (!key) {
      return undefined;
    }

    const keys = (key as string).split('.');
    let value: unknown = row as Record<string, unknown>;

    for (const k of keys) {
      if (value == null) {
        return undefined;
      }
      value = (value as Record<string, unknown>)[k];
    }

    return value;
  }

  protected asString(value: unknown): string {
    if (value == null) {
      return '';
    }
    return String(value);
  }

  protected onRowClick(row: T): void {
    this.rowClick.emit(row);
  }

  protected onActionClick(event: Event, action: string, row: T): void {
    event.stopPropagation();
    this.rowActionClick.emit({ action, row });
  }

  protected onStatusChange(row: T, value: string): void {
    this.statusChange.emit({ row, value });
  }
}
