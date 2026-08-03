import {
  Component,
  computed,
  CUSTOM_ELEMENTS_SCHEMA,
  inject,
  signal,
  viewChild,
  ViewEncapsulation,
} from '@angular/core';
import { toast } from 'ngx-sonner';
import PageHeader from '../../../../shared/components/page-header/page-header';
import WorkflowTip from '../../../../shared/components/workflow-tip/workflow-tip';
import { ConfirmDialog } from '../../../../shared/components/confirm-dialog/confirm-dialog';
import DataTable from '../../../../shared/components/data-table/data-table';
import EmptyState from '../../../../shared/components/empty-state/empty-state';
import PartnerAccountListComponent from '../../components/partner-account-list/partner-account-list';
import PartnerAccountFormComponent from '../../components/partner-account-form/partner-account-form';
import ProfitDistributionListComponent from '../../components/profit-distribution-list/profit-distribution-list';
import ProfitDistributionFormComponent from '../../components/profit-distribution-form/profit-distribution-form';
import PartnerDrawsComponent from '../../components/partner-draws/partner-draws';
import { PartnerEquityService } from '../../services/partner-equity';
import { PartnerEquityStore } from '../../store/partner-equity.store';
import { TreasuryService } from '../../../treasury/services/treasury';
import { TeamsService } from '../../../teams/services/teams';
import { toApiPromise } from '../../../../core/utils/api-response';
import { apiResource, apiResourceWithRequest } from '../../../../core/utils/resource-helpers';
import {
  BankAccount,
} from '../../../../core/models/treasury.model';
import {
  PartnerAccount,
  PartnerAccountStatementResponse,
  PartnerDrawTransaction,
  ProfitDistribution,
} from '../../../../core/models/partner-equity.model';
import { TeamMember } from '../../../../core/models/team.model';

type PartnerEquityTab = 'partner-accounts' | 'profit-distributions' | 'partner-draws';

@Component({
  selector: 'app-partner-equity',
  standalone: true,
  imports: [
    PageHeader,
    WorkflowTip,
    ConfirmDialog,
    DataTable,
    EmptyState,
    PartnerAccountListComponent,
    PartnerAccountFormComponent,
    ProfitDistributionListComponent,
    ProfitDistributionFormComponent,
    PartnerDrawsComponent,
  ],
  templateUrl: './partner-equity.html',
  styleUrl: './partner-equity.scss',
  encapsulation: ViewEncapsulation.None,
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
})
export default class PartnerEquityPage {
  private readonly partnerEquityService = inject(PartnerEquityService);
  private readonly partnerEquityStore = inject(PartnerEquityStore);
  private readonly treasuryService = inject(TreasuryService);
  private readonly teamsService = inject(TeamsService);

  protected readonly activeTab = signal<PartnerEquityTab>('partner-accounts');
  protected readonly editingAccount = signal<PartnerAccount | null>(null);
  protected readonly selectedStatementAccountId = signal<string | null>(null);

  private readonly deleteDialog = viewChild<ConfirmDialog>('deleteDialog');
  private readonly deleteDistributionDialog = viewChild<ConfirmDialog>('deleteDistributionDialog');
  private readonly deleteDrawDialog = viewChild<ConfirmDialog>('deleteDrawDialog');

  protected readonly accountToDelete = signal<PartnerAccount | null>(null);
  protected readonly distributionToDelete = signal<ProfitDistribution | null>(null);
  protected readonly drawTransactionToDelete = signal<PartnerDrawTransaction | null>(null);

  private readonly teamMembersResource = apiResource<TeamMember[]>(async () => {
    try {
      const response = await toApiPromise(this.teamsService.getTeamMembers({ limit: 200 }));
      return response.items;
    } catch {
      toast.error('Error al cargar colaboradores');
      return [];
    }
  });

  private readonly partnerAccountsResource = apiResource<PartnerAccount[]>(async () => {
    try {
      const response = await toApiPromise(this.partnerEquityService.getPartnerAccounts({ limit: 200 }));
      return response.items;
    } catch {
      toast.error('Error al cargar cuentas de socios');
      return [];
    }
  });

  private readonly profitDistributionsResource = apiResource<ProfitDistribution[]>(async () => {
    try {
      const response = await toApiPromise(this.partnerEquityService.getProfitDistributions({ limit: 200 }));
      return response.items;
    } catch {
      toast.error('Error al cargar distribuciones de utilidades');
      return [];
    }
  });

  private readonly drawTransactionsResource = apiResource<PartnerDrawTransaction[]>(async () => {
    try {
      const response = await toApiPromise(this.partnerEquityService.getDrawTransactions({ limit: 200 }));
      return response.items;
    } catch {
      toast.error('Error al cargar movimientos de socios');
      return [];
    }
  });

  private readonly bankAccountsResource = apiResource<BankAccount[]>(async () => {
    try {
      const response = await toApiPromise(this.treasuryService.getBankAccounts({ active_only: true, limit: 100 }));
      return response.items;
    } catch {
      toast.error('Error al cargar cuentas bancarias');
      return [];
    }
  });

  private readonly statementResource = apiResourceWithRequest<PartnerAccountStatementResponse | null, string | null>(
    () => this.selectedStatementAccountId(),
    async ({ params }) => {
      if (!params) {
        return null;
      }
      try {
        const response = await toApiPromise(
          this.partnerEquityService.getPartnerAccountStatement(params, { limit: 100 })
        );
        return response;
      } catch {
        toast.error('Error al cargar el estado de cuenta');
        return null;
      }
    }
  );

  protected readonly teamMembers = computed<TeamMember[]>(() => this.teamMembersResource.value() ?? []);
  protected readonly teamMembersLoading = computed(() => this.teamMembersResource.isLoading());

  protected readonly partnerAccounts = computed<PartnerAccount[]>(() => this.partnerAccountsResource.value() ?? []);
  protected readonly partnerAccountsLoading = computed(() => this.partnerAccountsResource.isLoading());

  protected readonly profitDistributions = computed<ProfitDistribution[]>(
    () => this.profitDistributionsResource.value() ?? []
  );
  protected readonly profitDistributionsLoading = computed(() => this.profitDistributionsResource.isLoading());

  protected readonly drawTransactions = computed<PartnerDrawTransaction[]>(
    () => this.drawTransactionsResource.value() ?? []
  );
  protected readonly drawTransactionsLoading = computed(() => this.drawTransactionsResource.isLoading());

  protected readonly bankAccounts = computed<BankAccount[]>(() => this.bankAccountsResource.value() ?? []);
  protected readonly bankAccountsLoading = computed(() => this.bankAccountsResource.isLoading());

  protected readonly statement = computed<PartnerAccountStatementResponse | null>(
    () => this.statementResource.value() ?? null
  );
  protected readonly statementLoading = computed(() => this.statementResource.isLoading());

  protected readonly statementAccountName = computed<string>(() => {
    const id = this.selectedStatementAccountId();
    if (!id) {
      return '';
    }
    const account = this.partnerAccounts().find((a) => a.id === id);
    if (!account) {
      return '';
    }
    const member = this.teamMembers().find((m) => m.id === account.partner_employee_id);
    return member ? `${member.first_name} ${member.last_name}` : id;
  });

  protected onAccountEdit(account: PartnerAccount): void {
    this.editingAccount.set(account);
  }

  protected onAccountFormSuccess(): void {
    this.editingAccount.set(null);
    this.partnerAccountsResource.reload();
    this.drawTransactionsResource.reload();
  }

  protected onAccountFormCancel(): void {
    this.editingAccount.set(null);
  }

  protected onAccountDelete(account: PartnerAccount): void {
    this.accountToDelete.set(account);
    this.deleteDialog()?.open();
  }

  protected async onConfirmAccountDelete(): Promise<void> {
    const account = this.accountToDelete();
    if (!account) {
      return;
    }

    try {
      await this.partnerEquityStore.deletePartnerAccount(account.id);
      toast.success('Cuenta de socio eliminada');
      this.accountToDelete.set(null);
      this.partnerAccountsResource.reload();
    } catch {
      toast.error(this.partnerEquityStore.status().error ?? 'Error al eliminar la cuenta de socio');
    }
  }

  protected onViewStatement(account: PartnerAccount): void {
    this.selectedStatementAccountId.set(account.id);
  }

  protected closeStatement(): void {
    this.selectedStatementAccountId.set(null);
  }

  protected onDistributionCreated(): void {
    this.partnerAccountsResource.reload();
    this.profitDistributionsResource.reload();
    this.drawTransactionsResource.reload();
  }

  protected onDistributionDelete(distribution: ProfitDistribution): void {
    this.distributionToDelete.set(distribution);
    this.deleteDistributionDialog()?.open();
  }

  protected async onConfirmDistributionDelete(): Promise<void> {
    const distribution = this.distributionToDelete();
    if (!distribution) {
      return;
    }

    try {
      await this.partnerEquityStore.deleteProfitDistribution(distribution.id);
      toast.success('Distribución eliminada');
      this.distributionToDelete.set(null);
      this.profitDistributionsResource.reload();
      this.partnerAccountsResource.reload();
      this.drawTransactionsResource.reload();
    } catch {
      toast.error(this.partnerEquityStore.status().error ?? 'Error al eliminar la distribución');
    }
  }

  protected onDrawsReload(): void {
    this.partnerAccountsResource.reload();
    this.drawTransactionsResource.reload();
  }

  protected onDrawTransactionDelete(transaction: PartnerDrawTransaction): void {
    this.drawTransactionToDelete.set(transaction);
    this.deleteDrawDialog()?.open();
  }

  protected async onConfirmDrawTransactionDelete(): Promise<void> {
    const transaction = this.drawTransactionToDelete();
    if (!transaction) {
      return;
    }

    try {
      await this.partnerEquityStore.deleteDrawTransaction(transaction.id);
      toast.success('Movimiento de socio eliminado');
      this.drawTransactionToDelete.set(null);
      this.drawTransactionsResource.reload();
      this.partnerAccountsResource.reload();
    } catch {
      toast.error(this.partnerEquityStore.status().error ?? 'Error al eliminar el movimiento de socio');
    }
  }
}
