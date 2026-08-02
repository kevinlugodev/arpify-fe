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
import { PayrollRun } from '../../../../core/models/hr-payroll.model';
import { HrPayrollService } from '../../services/hr-payroll';
import { HrPayrollStore } from '../../store/hr-payroll.store';
import { toApiPromise } from '../../../../core/utils/api-response';
import { apiResourceWithRequest } from '../../../../core/utils/resource-helpers';

@Component({
  selector: 'app-payroll-run-list',
  standalone: true,
  imports: [DataTable, EmptyState, ConfirmDialog],
  templateUrl: './payroll-run-list.html',
  styleUrl: './payroll-run-list.scss',
  encapsulation: ViewEncapsulation.None,
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
})
export default class PayrollRunListComponent {
  private readonly hrPayrollService = inject(HrPayrollService);
  private readonly hrPayrollStore = inject(HrPayrollStore);

  readonly reloadTrigger = input<number>(0);

  readonly editPayrollRun = output<PayrollRun>();
  readonly selectPayrollRun = output<PayrollRun>();
  readonly changed = output<void>();

  private readonly deleteDialog = viewChild<ConfirmDialog>('deleteDialog');
  private readonly approveDialog = viewChild<ConfirmDialog>('approveDialog');
  private readonly cancelDialog = viewChild<ConfirmDialog>('cancelDialog');

  protected readonly itemToDelete = signal<PayrollRun | null>(null);
  protected readonly itemToApprove = signal<PayrollRun | null>(null);
  protected readonly itemToCancel = signal<PayrollRun | null>(null);

  private readonly payrollRunsResource = apiResourceWithRequest<PayrollRun[], number>(
    () => this.reloadTrigger(),
    async ({ params }) => {
      try {
        const response = await toApiPromise(this.hrPayrollService.getPayrollRuns({ limit: 200 }));
        return response.items;
      } catch {
        toast.error('Error al cargar planillas');
        return [];
      }
    }
  );

  protected readonly payrollRuns = computed<PayrollRun[]>(() => this.payrollRunsResource.value() ?? []);
  protected readonly payrollRunsLoading = computed(() => this.payrollRunsResource.isLoading());

  protected readonly columns: DataTableColumn<PayrollRun & { period_label: string }>[] = [
    { key: 'period_label' as never, header: 'Periodo' },
    { key: 'total_gross_amount', header: 'Total bruto' },
    { key: 'total_employee_deductions', header: 'Descuentos' },
    { key: 'total_employer_contributions', header: 'Aportes' },
    { key: 'total_net_payable', header: 'Neto a pagar' },
    { key: 'status', header: 'Estado', type: 'status', statusDomain: 'payroll-status' },
  ];

  protected readonly actions: DataTableAction<PayrollRun>[] = [
    { key: 'select', label: 'Gestionar', icon: 'bi-people' },
    { key: 'edit', label: 'Editar', icon: 'bi-pencil' },
    { key: 'approve', label: 'Aprobar', icon: 'bi-check-circle' },
    { key: 'cancel', label: 'Cancelar', icon: 'bi-x-circle' },
    { key: 'delete', label: 'Eliminar', icon: 'bi-trash' },
  ];

  protected readonly rowData = computed(() =>
    this.payrollRuns().map((payrollRun) => ({
      ...payrollRun,
      period_label: `${String(payrollRun.period_month).padStart(2, '0')}/${payrollRun.period_year}`,
    }))
  );

  protected onAction(event: { action: string; row: PayrollRun }): void {
    const payrollRun = event.row;

    if (event.action === 'select') {
      this.selectPayrollRun.emit(payrollRun);
      return;
    }

    if (event.action === 'edit') {
      if (payrollRun.status !== 'DRAFT') {
        toast.error('Solo se pueden editar planillas en borrador');
        return;
      }
      this.editPayrollRun.emit(payrollRun);
      return;
    }

    if (event.action === 'delete') {
      if (payrollRun.status !== 'DRAFT') {
        toast.error('Solo se pueden eliminar planillas en borrador');
        return;
      }
      this.itemToDelete.set(payrollRun);
      this.deleteDialog()?.open();
      return;
    }

    if (event.action === 'approve') {
      if (payrollRun.status !== 'DRAFT') {
        toast.error('Solo se pueden aprobar planillas en borrador');
        return;
      }
      this.itemToApprove.set(payrollRun);
      this.approveDialog()?.open();
      return;
    }

    if (event.action === 'cancel') {
      if (payrollRun.status === 'PAID' || payrollRun.status === 'CANCELLED') {
        toast.error('No se puede cancelar una planilla pagada o ya cancelada');
        return;
      }
      this.itemToCancel.set(payrollRun);
      this.cancelDialog()?.open();
    }
  }

  protected async onConfirmDelete(): Promise<void> {
    const payrollRun = this.itemToDelete();
    if (!payrollRun) {
      return;
    }

    try {
      await this.hrPayrollStore.deletePayrollRun(payrollRun.id);
      toast.success('Planilla eliminada');
      this.itemToDelete.set(null);
      this.payrollRunsResource.reload();
      this.changed.emit();
    } catch {
      toast.error(this.hrPayrollStore.status().error ?? 'Error al eliminar la planilla');
    }
  }

  protected async onConfirmApprove(): Promise<void> {
    const payrollRun = this.itemToApprove();
    if (!payrollRun) {
      return;
    }

    try {
      await this.hrPayrollStore.approvePayrollRun(payrollRun.id);
      toast.success('Planilla aprobada');
      this.itemToApprove.set(null);
      this.payrollRunsResource.reload();
      this.changed.emit();
    } catch {
      toast.error(this.hrPayrollStore.status().error ?? 'Error al aprobar la planilla');
    }
  }

  protected async onConfirmCancel(): Promise<void> {
    const payrollRun = this.itemToCancel();
    if (!payrollRun) {
      return;
    }

    try {
      await this.hrPayrollStore.cancelPayrollRun(payrollRun.id);
      toast.success('Planilla cancelada');
      this.itemToCancel.set(null);
      this.payrollRunsResource.reload();
      this.changed.emit();
    } catch {
      toast.error(this.hrPayrollStore.status().error ?? 'Error al cancelar la planilla');
    }
  }
}
