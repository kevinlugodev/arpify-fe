import {
  Component,
  computed,
  CUSTOM_ELEMENTS_SCHEMA,
  input,
  output,
  signal,
  ViewEncapsulation,
} from '@angular/core';
import DataTable, {
  DataTableAction,
  DataTableColumn,
} from '../../../../shared/components/data-table/data-table';
import EmptyState from '../../../../shared/components/empty-state/empty-state';
import SearchField from '../../../../shared/components/search-field/search-field';
import { FluentDropdown } from '../../../../shared/components/fluent-form-controls/fluent-form-controls';
import { AssetCategory, AssetStatus, FixedAsset } from '../../../../core/models/fixed-assets.model';
import { TeamMember } from '../../../../core/models/team.model';

interface AssetRow extends FixedAsset {
  assigned_employee_name: string;
}

interface Option<T = string> {
  value: T | '';
  label: string;
}

const CATEGORY_OPTIONS: Option<AssetCategory>[] = [
  { value: '', label: 'Todas las categorías' },
  { value: 'IT_EQUIPMENT', label: 'Equipos TI' },
  { value: 'FURNITURE', label: 'Muebles' },
  { value: 'VEHICLES', label: 'Vehículos' },
  { value: 'MACHINERY', label: 'Maquinaria' },
  { value: 'OTHER', label: 'Otro' },
];

const STATUS_OPTIONS: Option<AssetStatus>[] = [
  { value: '', label: 'Todos los estados' },
  { value: 'ACTIVE', label: 'Activo' },
  { value: 'FULLY_DEPRECIATED', label: 'Depreciado' },
  { value: 'DISPOSED', label: 'Dado de baja' },
];

@Component({
  selector: 'app-asset-list',
  standalone: true,
  imports: [DataTable, EmptyState, SearchField, FluentDropdown],
  templateUrl: './asset-list.html',
  styleUrl: './asset-list.scss',
  encapsulation: ViewEncapsulation.None,
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
})
export default class AssetListComponent {
  readonly assets = input.required<FixedAsset[]>();
  readonly loading = input<boolean>(false);
  readonly employees = input<TeamMember[]>([]);

  readonly create = output<void>();
  readonly edit = output<FixedAsset>();
  readonly remove = output<FixedAsset>();
  readonly depreciate = output<FixedAsset>();

  protected readonly search = signal('');
  protected readonly categoryFilter = signal<AssetCategory | ''>('');
  protected readonly statusFilter = signal<AssetStatus | ''>('');

  protected readonly categoryOptions = CATEGORY_OPTIONS;
  protected readonly statusOptions = STATUS_OPTIONS;

  protected readonly columns: DataTableColumn<AssetRow>[] = [
    { key: 'asset_code', header: 'Código' },
    { key: 'name', header: 'Nombre' },
    { key: 'category', header: 'Categoría', type: 'status', statusDomain: 'asset-category' },
    { key: 'purchase_date', header: 'Fecha compra' },
    { key: 'purchase_cost', header: 'Costo' },
    { key: 'residual_value', header: 'Valor residual' },
    { key: 'useful_life_months', header: 'Vida útil (meses)' },
    { key: 'accumulated_depreciation', header: 'Dep. acumulada' },
    { key: 'current_book_value', header: 'Valor contable' },
    { key: 'assigned_employee_name', header: 'Asignado a' },
    { key: 'status', header: 'Estado', type: 'status', statusDomain: 'asset-status' },
  ];

  protected readonly actions: DataTableAction<AssetRow>[] = [
    { key: 'edit', label: 'Editar', icon: 'bi-pencil' },
    { key: 'depreciate', label: 'Depreciar', icon: 'bi-graph-down-arrow' },
    { key: 'remove', label: 'Eliminar', icon: 'bi-trash' },
  ];

  protected readonly rows = computed<AssetRow[]>(() => {
    const search = this.search().trim().toLowerCase();
    const category = this.categoryFilter();
    const status = this.statusFilter();

    return this.assets()
      .filter((asset) => {
        if (category && asset.category !== category) {
          return false;
        }
        if (status && asset.status !== status) {
          return false;
        }
        if (search) {
          return (
            asset.asset_code.toLowerCase().includes(search) ||
            asset.name.toLowerCase().includes(search)
          );
        }
        return true;
      })
      .map((asset) => ({
        ...asset,
        assigned_employee_name: this.getEmployeeName(asset.assigned_employee_id),
      }));
  });

  protected onAction(event: { action: string; row: AssetRow }): void {
    if (event.action === 'edit') {
      this.edit.emit(event.row);
      return;
    }
    if (event.action === 'depreciate') {
      this.depreciate.emit(event.row);
      return;
    }
    if (event.action === 'remove') {
      this.remove.emit(event.row);
    }
  }

  protected onCategoryChange(value: string): void {
    this.categoryFilter.set((value as AssetCategory) || '');
  }

  protected onStatusChange(value: string): void {
    this.statusFilter.set((value as AssetStatus) || '');
  }

  private getEmployeeName(id: string | null): string {
    if (!id) {
      return '—';
    }
    const employee = this.employees().find((member) => member.id === id);
    return employee ? `${employee.first_name} ${employee.last_name}` : id;
  }
}
