import {
  Component,
  computed,
  CUSTOM_ELEMENTS_SCHEMA,
  input,
  output,
  signal,
  viewChild,
  ViewEncapsulation,
} from '@angular/core';
import DataTable, { DataTableAction, DataTableColumn } from '../../../../shared/components/data-table/data-table';
import EmptyState from '../../../../shared/components/empty-state/empty-state';
import { ConfirmDialog } from '../../../../shared/components/confirm-dialog/confirm-dialog';
import { ExpenseClaim } from '../../../../core/models/expense-claims.model';
import { TeamMember } from '../../../../core/models/team.model';

@Component({
  selector: 'app-claim-list',
  standalone: true,
  imports: [DataTable, EmptyState, ConfirmDialog],
  templateUrl: './claim-list.html',
  styleUrl: './claim-list.scss',
  encapsulation: ViewEncapsulation.None,
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
})
export default class ClaimListComponent {
  readonly claims = input.required<ExpenseClaim[]>();
  readonly employees = input.required<TeamMember[]>();
  readonly loading = input.required<boolean>();

  readonly newClaim = output<void>();
  readonly claimAction = output<{ action: string; claim: ExpenseClaim }>();

  private readonly deleteDialog = viewChild<ConfirmDialog>('deleteDialog');
  protected readonly claimToDelete = signal<ExpenseClaim | null>(null);

  protected readonly claimRows = computed(() =>
    this.claims().map((claim) => ({
      ...claim,
      employee_name: this.getEmployeeName(claim.employee_id),
    }))
  );

  protected readonly claimColumns: DataTableColumn<ExpenseClaim & { employee_name: string }>[] = [
    { key: 'claim_number', header: 'Número' },
    { key: 'employee_name', header: 'Colaborador' },
    { key: 'title', header: 'Título' },
    { key: 'total_advanced', header: 'Adelanto' },
    { key: 'total_expenses', header: 'Gastos' },
    { key: 'balance_amount', header: 'Saldo' },
    { key: 'status', header: 'Estado', type: 'status', statusDomain: 'expense-claim-status' },
  ];

  protected readonly claimActions: DataTableAction<ExpenseClaim>[] = [
    { key: 'edit', label: 'Editar', icon: 'bi-pencil' },
    { key: 'items', label: 'Comprobantes', icon: 'bi-receipt' },
    { key: 'submit', label: 'Enviar', icon: 'bi-send' },
    { key: 'approve', label: 'Aprobar', icon: 'bi-check-circle' },
    { key: 'reject', label: 'Rechazar', icon: 'bi-x-circle' },
    { key: 'settle', label: 'Liquidar', icon: 'bi-file-earmark-check' },
    { key: 'delete', label: 'Eliminar', icon: 'bi-trash' },
  ];

  protected getEmployeeName(id: string): string {
    const employee = this.employees().find((e) => e.id === id);
    return employee ? `${employee.first_name} ${employee.last_name}` : id;
  }

  protected onNewClaim(): void {
    this.newClaim.emit();
  }

  protected onAction(event: { action: string; row: ExpenseClaim }): void {
    if (event.action === 'delete') {
      this.claimToDelete.set(event.row);
      this.deleteDialog()?.open();
      return;
    }
    this.claimAction.emit({ action: event.action, claim: event.row });
  }

  protected onConfirmDelete(): void {
    const claim = this.claimToDelete();
    if (!claim) {
      return;
    }
    this.claimAction.emit({ action: 'delete', claim });
    this.claimToDelete.set(null);
  }
}
