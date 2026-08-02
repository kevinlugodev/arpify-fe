import {
  Component,
  computed,
  CUSTOM_ELEMENTS_SCHEMA,
  inject,
  input,
  output,
  signal,
  viewChild,
  ViewEncapsulation,
} from '@angular/core';
import { toast } from 'ngx-sonner';
import DataTable, { DataTableAction, DataTableColumn } from '../../../../shared/components/data-table/data-table';
import EmptyState from '../../../../shared/components/empty-state/empty-state';
import { ConfirmDialog } from '../../../../shared/components/confirm-dialog/confirm-dialog';
import { EmployeeCompensation } from '../../../../core/models/hr-payroll.model';
import { HrPayrollService } from '../../services/hr-payroll';
import { HrPayrollStore } from '../../store/hr-payroll.store';
import { toApiPromise } from '../../../../core/utils/api-response';
import { apiResourceWithRequest } from '../../../../core/utils/resource-helpers';

interface Option<T = string> {
  value: T;
  label: string;
}

@Component({
  selector: 'app-compensation-list',
  standalone: true,
  imports: [DataTable, EmptyState, ConfirmDialog],
  templateUrl: './compensation-list.html',
  styleUrl: './compensation-list.scss',
  encapsulation: ViewEncapsulation.None,
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
})
export default class CompensationListComponent {
  private readonly hrPayrollService = inject(HrPayrollService);
  private readonly hrPayrollStore = inject(HrPayrollStore);

  readonly employeesOptions = input.required<Option<string>[]>();
  readonly reloadTrigger = input<number>(0);

  readonly editCompensation = output<EmployeeCompensation>();
  readonly changed = output<void>();

  private readonly deleteDialog = viewChild<ConfirmDialog>('deleteDialog');
  protected readonly itemToDelete = signal<EmployeeCompensation | null>(null);

  private readonly compensationsResource = apiResourceWithRequest<EmployeeCompensation[], number>(
    () => this.reloadTrigger(),
    async ({ params }) => {
      try {
        const response = await toApiPromise(this.hrPayrollService.getCompensations({ limit: 200 }));
        return response.items;
      } catch {
        toast.error('Error al cargar compensaciones');
        return [];
      }
    }
  );

  protected readonly compensations = computed<EmployeeCompensation[]>(() => this.compensationsResource.value() ?? []);
  protected readonly compensationsLoading = computed(() => this.compensationsResource.isLoading());

  protected readonly columns: DataTableColumn<EmployeeCompensation & { employee_name: string }>[] = [
    { key: 'employee_name' as never, header: 'Colaborador' },
    { key: 'base_salary', header: 'Salario base' },
    { key: 'currency', header: 'Moneda' },
    { key: 'labor_regime', header: 'Régimen' },
    { key: 'pension_system', header: 'Pensión' },
    { key: 'effective_start_date', header: 'Inicio vigencia' },
    { key: 'effective_end_date', header: 'Fin vigencia' },
  ];

  protected readonly actions: DataTableAction<EmployeeCompensation>[] = [
    { key: 'edit', label: 'Editar', icon: 'bi-pencil' },
    { key: 'delete', label: 'Eliminar', icon: 'bi-trash' },
  ];

  protected readonly rowData = computed(() =>
    this.compensations().map((compensation) => ({
      ...compensation,
      employee_name: this.getEmployeeName(compensation.employee_id),
    }))
  );

  private getEmployeeName(employeeId: string): string {
    return this.employeesOptions().find((option) => option.value === employeeId)?.label ?? employeeId;
  }

  protected onAction(event: { action: string; row: EmployeeCompensation }): void {
    if (event.action === 'edit') {
      this.editCompensation.emit(event.row);
      return;
    }

    if (event.action === 'delete') {
      this.itemToDelete.set(event.row);
      this.deleteDialog()?.open();
    }
  }

  protected async onConfirmDelete(): Promise<void> {
    const compensation = this.itemToDelete();
    if (!compensation) {
      return;
    }

    try {
      await this.hrPayrollStore.deleteCompensation(compensation.id);
      toast.success('Compensación eliminada');
      this.itemToDelete.set(null);
      this.compensationsResource.reload();
      this.changed.emit();
    } catch {
      toast.error(this.hrPayrollStore.status().error ?? 'Error al eliminar la compensación');
    }
  }
}
