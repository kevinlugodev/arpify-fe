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
import ScheduleFormComponent from '../schedule-form/schedule-form';
import { CreditAccountSchedule } from '../../../../core/models/credit-control.model';
import { Customer } from '../../../../core/models/clients.model';
import { Invoice } from '../../../../core/models/finance.model';
import { CreditControlStore } from '../../store/credit-control.store';

export interface ScheduleSelectEvent {
  id: string;
  tab: 'payments' | 'logs';
}

@Component({
  selector: 'app-schedule-list',
  standalone: true,
  imports: [DataTable, EmptyState, ConfirmDialog, ScheduleFormComponent],
  templateUrl: './schedule-list.html',
  styleUrl: './schedule-list.scss',
  encapsulation: ViewEncapsulation.None,
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
})
export default class ScheduleListComponent {
  private readonly creditControlStore = inject(CreditControlStore);

  readonly schedules = input.required<CreditAccountSchedule[]>();
  readonly customers = input.required<Customer[]>();
  readonly invoices = input.required<Invoice[]>();
  readonly loading = input<boolean>(false);

  readonly scheduleSelect = output<ScheduleSelectEvent>();
  readonly schedulesChanged = output<void>();

  protected readonly editingScheduleId = signal<string | null>(null);
  protected readonly itemToDelete = signal<CreditAccountSchedule | null>(null);

  private readonly deleteDialog = viewChild<ConfirmDialog>('deleteDialog');

  protected readonly editingSchedule = computed<CreditAccountSchedule | null>(() => {
    const id = this.editingScheduleId();
    if (!id) {
      return null;
    }
    return this.schedules().find((schedule) => schedule.id === id) ?? null;
  });

  protected readonly columns: DataTableColumn<CreditAccountSchedule>[] = [
    { key: 'receivable_id', header: 'Factura' },
    { key: 'customer_name', header: 'Cliente' },
    { key: 'original_due_date', header: 'Vencimiento' },
    { key: 'invoice_amount', header: 'Monto' },
    { key: 'paid_amount', header: 'Pagado' },
    { key: 'remaining_amount', header: 'Saldo' },
    { key: 'days_overdue', header: 'Días venc.' },
    { key: 'collection_status', header: 'Estado', type: 'status', statusDomain: 'credit-schedule-status' },
  ];

  protected readonly actions: DataTableAction<CreditAccountSchedule & { customer_name: string; remaining_amount: number }>[] = [
    { key: 'edit', label: 'Editar', icon: 'bi-pencil' },
    { key: 'payments', label: 'Pagos', icon: 'bi-cash-coin' },
    { key: 'logs', label: 'Cobranzas', icon: 'bi-journal-text' },
    { key: 'delete', label: 'Eliminar', icon: 'bi-trash' },
  ];

  protected readonly rows = computed(() =>
    this.schedules().map((schedule) => ({
      ...schedule,
      customer_name: this.getCustomerName(schedule.customer_id),
      remaining_amount: schedule.invoice_amount - schedule.paid_amount,
    }))
  );

  protected readonly editingRowClass = (row: CreditAccountSchedule & { customer_name: string; remaining_amount: number }) =>
    row.id === this.editingScheduleId() ? 'schedule-list__row--editing' : '';

  protected onScheduleSaved(): void {
    this.editingScheduleId.set(null);
    this.schedulesChanged.emit();
  }

  protected onScheduleCancelled(): void {
    this.editingScheduleId.set(null);
  }

  protected onAction(event: {
    action: string;
    row: CreditAccountSchedule & { customer_name: string; remaining_amount: number };
  }): void {
    const schedule = event.row;

    if (event.action === 'edit') {
      this.editingScheduleId.set(schedule.id);
      return;
    }

    if (event.action === 'payments') {
      this.scheduleSelect.emit({ id: schedule.id, tab: 'payments' });
      return;
    }

    if (event.action === 'logs') {
      this.scheduleSelect.emit({ id: schedule.id, tab: 'logs' });
      return;
    }

    if (event.action === 'delete') {
      this.itemToDelete.set(schedule);
      this.deleteDialog()?.open();
    }
  }

  protected async onConfirmDelete(): Promise<void> {
    const schedule = this.itemToDelete();
    if (!schedule) {
      return;
    }

    try {
      await this.creditControlStore.deleteSchedule(schedule.id);
      toast.success('Cronograma eliminado');
      this.itemToDelete.set(null);
      this.editingScheduleId.set(null);
      this.schedulesChanged.emit();
    } catch {
      toast.error(this.creditControlStore.status().error ?? 'Error al eliminar el cronograma');
    }
  }

  private getCustomerName(customerId: string | null): string {
    if (!customerId) {
      return '—';
    }
    const customer = this.customers().find((c) => c.id === customerId);
    return customer?.legal_name ?? customerId;
  }
}
