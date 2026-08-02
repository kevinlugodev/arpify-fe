import { Component, computed, CUSTOM_ELEMENTS_SCHEMA, input, output, ViewEncapsulation } from '@angular/core';
import DataTable, { DataTableAction, DataTableColumn } from '../../../../shared/components/data-table/data-table';
import EmptyState from '../../../../shared/components/empty-state/empty-state';
import { PartnerAccount } from '../../../../core/models/partner-equity.model';
import { TeamMember } from '../../../../core/models/team.model';

export interface PartnerAccountRow extends PartnerAccount {
  employee_name: string;
}

@Component({
  selector: 'app-partner-account-list',
  standalone: true,
  imports: [DataTable, EmptyState],
  templateUrl: './partner-account-list.html',
  styleUrl: './partner-account-list.scss',
  encapsulation: ViewEncapsulation.None,
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
})
export default class PartnerAccountListComponent {
  readonly accounts = input.required<PartnerAccount[]>();
  readonly teamMembers = input.required<TeamMember[]>();
  readonly loading = input<boolean>(false);
  readonly editingAccountId = input<string | null>(null);

  readonly edit = output<PartnerAccount>();
  readonly delete = output<PartnerAccount>();
  readonly viewStatement = output<PartnerAccount>();
  readonly reload = output<void>();

  protected readonly rows = computed<PartnerAccountRow[]>(() =>
    this.accounts().map((account) => ({
      ...account,
      employee_name: this.getEmployeeName(account.partner_employee_id),
    }))
  );

  protected readonly columns: DataTableColumn<PartnerAccountRow>[] = [
    { key: 'employee_name', header: 'Socio' },
    { key: 'equity_percentage', header: '% Participación' },
    { key: 'accumulated_earnings', header: 'Ganancias acumuladas' },
    { key: 'total_draws_paid', header: 'Retiros pagados' },
    { key: 'current_available_balance', header: 'Saldo disponible' },
  ];

  protected readonly actions: DataTableAction<PartnerAccountRow>[] = [
    { key: 'statement', label: 'Estado de cuenta', icon: 'bi-file-earmark-text' },
    { key: 'edit', label: 'Editar', icon: 'bi-pencil' },
    { key: 'delete', label: 'Eliminar', icon: 'bi-trash' },
  ];

  protected readonly editingRowClass = (row: PartnerAccountRow) =>
    row.id === this.editingAccountId() ? 'partner-account-list__row--editing' : '';

  protected onAction(event: { action: string; row: PartnerAccountRow }): void {
    if (event.action === 'edit') {
      this.edit.emit(event.row);
      return;
    }
    if (event.action === 'delete') {
      this.delete.emit(event.row);
      return;
    }
    if (event.action === 'statement') {
      this.viewStatement.emit(event.row);
    }
  }

  private getEmployeeName(id: string): string {
    const member = this.teamMembers().find((m) => m.id === id);
    return member ? `${member.first_name} ${member.last_name}` : id;
  }
}
