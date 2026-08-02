import {
  Component,
  computed,
  CUSTOM_ELEMENTS_SCHEMA,
  effect,
  inject,
  signal,
  viewChild,
  ViewEncapsulation,
} from '@angular/core';
import { form, FormField, required } from '@angular/forms/signals';
import { toast } from 'ngx-sonner';
import PageHeader from '../../../../shared/components/page-header/page-header';
import WorkflowTip from '../../../../shared/components/workflow-tip/workflow-tip';
import {
  FluentDropdown,
  FluentTextInput,
} from '../../../../shared/components/fluent-form-controls/fluent-form-controls';
import { ConfirmDialog } from '../../../../shared/components/confirm-dialog/confirm-dialog';
import {
  ExpenseClaim,
  ExpenseClaimFilters,
  ExpenseClaimStatus,
} from '../../../../core/models/expense-claims.model';
import { TeamMember } from '../../../../core/models/team.model';
import { BankAccount, PettyCashFund } from '../../../../core/models/treasury.model';
import { TeamsService } from '../../../teams/services/teams';
import { TreasuryService } from '../../../treasury/services/treasury';
import { ExpenseClaimsService } from '../../services/expense-claims';
import { ExpenseClaimsStore } from '../../store/expense-claims.store';
import { toApiPromise } from '../../../../core/utils/api-response';
import { apiResource, apiResourceWithRequest } from '../../../../core/utils/resource-helpers';
import ClaimListComponent from '../../components/claim-list/claim-list';
import ClaimFormComponent from '../../components/claim-form/claim-form';
import ClaimItemsComponent from '../../components/claim-items/claim-items';

type ExpenseClaimTab = 'list' | 'form' | 'items';

interface Option<T = string> {
  value: T;
  label: string;
}

interface FilterFormModel {
  status: ExpenseClaimStatus | '';
  search: string;
  employee_id: string;
}

const STATUS_OPTIONS: Option<ExpenseClaimStatus | ''>[] = [
  { value: '', label: 'Todos los estados' },
  { value: 'DRAFT', label: 'Borrador' },
  { value: 'SUBMITTED', label: 'Enviada' },
  { value: 'APPROVED', label: 'Aprobada' },
  { value: 'SETTLED', label: 'Liquidada' },
  { value: 'REJECTED', label: 'Rechazada' },
];

const EMPTY_FILTERS: FilterFormModel = {
  status: '',
  search: '',
  employee_id: '',
};

@Component({
  selector: 'app-expense-claims',
  standalone: true,
  imports: [
    PageHeader,
    WorkflowTip,
    FormField,
    FluentTextInput,
    FluentDropdown,
    ConfirmDialog,
    ClaimListComponent,
    ClaimFormComponent,
    ClaimItemsComponent,
  ],
  templateUrl: './expense-claims.html',
  styleUrl: './expense-claims.scss',
  encapsulation: ViewEncapsulation.None,
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
})
export default class ExpenseClaimsPage {
  private readonly expenseClaimsService = inject(ExpenseClaimsService);
  private readonly expenseClaimsStore = inject(ExpenseClaimsStore);
  private readonly teamsService = inject(TeamsService);
  private readonly treasuryService = inject(TreasuryService);

  protected readonly activeTab = signal<ExpenseClaimTab>('list');
  protected readonly selectedClaim = signal<ExpenseClaim | null>(null);

  protected readonly filterModel = signal<FilterFormModel>({ ...EMPTY_FILTERS });
  protected readonly filterForm;

  private readonly claimDeleteDialog = viewChild<ConfirmDialog>('claimDeleteDialog');
  protected readonly claimToDelete = signal<ExpenseClaim | null>(null);

  protected readonly statusOptions = STATUS_OPTIONS;

  private readonly claimsResource = apiResourceWithRequest<ExpenseClaim[], ExpenseClaimFilters>(
    () => {
      const filters: ExpenseClaimFilters = { limit: 100 };
      const model = this.filterModel();
      if (model.status) {
        filters.status = model.status;
      }
      if (model.search.trim()) {
        filters.search = model.search.trim();
      }
      if (model.employee_id) {
        filters.employee_id = model.employee_id;
      }
      return filters;
    },
    async ({ params }) => {
      try {
        const response = await toApiPromise(this.expenseClaimsService.getExpenseClaims(params));
        return response.items;
      } catch {
        toast.error('Error al cargar rendiciones');
        return [];
      }
    }
  );

  private readonly employeesResource = apiResource<TeamMember[]>(async () => {
    try {
      const response = await toApiPromise(this.teamsService.getTeamMembers({ limit: 200 }));
      return response.items;
    } catch {
      toast.error('Error al cargar colaboradores');
      return [];
    }
  });

  private readonly accountsResource = apiResource<BankAccount[]>(async () => {
    try {
      const response = await toApiPromise(this.treasuryService.getBankAccounts({ active_only: true, limit: 100 }));
      return response.items;
    } catch {
      toast.error('Error al cargar cuentas bancarias');
      return [];
    }
  });

  private readonly fundsResource = apiResource<PettyCashFund[]>(async () => {
    try {
      const response = await toApiPromise(this.treasuryService.getPettyCashFunds({ limit: 100 }));
      return response.items;
    } catch {
      toast.error('Error al cargar cajas chicas');
      return [];
    }
  });

  protected readonly claims = computed<ExpenseClaim[]>(() => this.claimsResource.value() ?? []);
  protected readonly claimsLoading = computed(() => this.claimsResource.isLoading());

  protected readonly employees = computed<TeamMember[]>(() => this.employeesResource.value() ?? []);
  protected readonly employeesLoading = computed(() => this.employeesResource.isLoading());

  protected readonly accounts = computed<BankAccount[]>(() => this.accountsResource.value() ?? []);
  protected readonly accountsLoading = computed(() => this.accountsResource.isLoading());

  protected readonly funds = computed<PettyCashFund[]>(() => this.fundsResource.value() ?? []);
  protected readonly fundsLoading = computed(() => this.fundsResource.isLoading());

  protected readonly employeeOptions = computed<Option<string>[]>(() => [
    { value: '', label: 'Todos los colaboradores' },
    ...this.employees().map((employee) => ({
      value: employee.id,
      label: `${employee.first_name} ${employee.last_name}`,
    })),
  ]);

  protected readonly isLoading = computed(
    () =>
      this.claimsLoading() ||
      this.employeesLoading() ||
      this.accountsLoading() ||
      this.fundsLoading()
  );

  constructor() {
    this.filterForm = form(this.filterModel, (schema) => {
      // Filtros libres, sin validación requerida.
      void schema;
    });

    effect(() => {
      // Recargar listado cuando cambian los filtros (apiResourceWithRequest ya lo hace),
      // pero nos aseguramos de mantener la selección sincronizada cuando se edita.
      const claim = this.selectedClaim();
      if (!claim) {
        return;
      }
      const refreshed = this.claims().find((c) => c.id === claim.id);
      if (refreshed) {
        this.selectedClaim.set(refreshed);
      }
    });
  }

  protected onNewClaim(): void {
    this.selectedClaim.set(null);
    this.activeTab.set('form');
  }

  protected onClaimAction(event: { action: string; claim: ExpenseClaim }): void {
    const claim = event.claim;

    switch (event.action) {
      case 'edit':
        this.selectedClaim.set(claim);
        this.activeTab.set('form');
        break;
      case 'items':
        this.selectedClaim.set(claim);
        this.activeTab.set('items');
        break;
      case 'delete':
        this.claimToDelete.set(claim);
        this.claimDeleteDialog()?.open();
        break;
      case 'submit':
        void this.submitClaim(claim);
        break;
      case 'approve':
        void this.approveClaim(claim);
        break;
      case 'reject':
        void this.rejectClaim(claim);
        break;
      case 'settle':
        this.selectedClaim.set(claim);
        this.activeTab.set('items');
        break;
    }
  }

  protected async onConfirmClaimDelete(): Promise<void> {
    const claim = this.claimToDelete();
    if (!claim) {
      return;
    }

    try {
      await this.expenseClaimsStore.deleteExpenseClaim(claim.id);
      toast.success('Rendición eliminada');
      this.claimToDelete.set(null);
      this.claimsResource.reload();
    } catch {
      toast.error(this.expenseClaimsStore.status().error ?? 'Error al eliminar la rendición');
    }
  }

  protected onFormSaved(): void {
    this.selectedClaim.set(null);
    this.activeTab.set('list');
    this.claimsResource.reload();
  }

  protected onFormCancel(): void {
    this.selectedClaim.set(null);
    this.activeTab.set('list');
  }

  protected onItemsSaved(): void {
    this.claimsResource.reload();
  }

  private async submitClaim(claim: ExpenseClaim): Promise<void> {
    try {
      await this.expenseClaimsStore.submitExpenseClaim(claim.id);
      toast.success('Rendición enviada');
      this.claimsResource.reload();
    } catch {
      toast.error(this.expenseClaimsStore.status().error ?? 'Error al enviar la rendición');
    }
  }

  private async approveClaim(claim: ExpenseClaim): Promise<void> {
    try {
      await this.expenseClaimsStore.approveExpenseClaim(claim.id);
      toast.success('Rendición aprobada');
      this.claimsResource.reload();
    } catch {
      toast.error(this.expenseClaimsStore.status().error ?? 'Error al aprobar la rendición');
    }
  }

  private async rejectClaim(claim: ExpenseClaim): Promise<void> {
    try {
      await this.expenseClaimsStore.rejectExpenseClaim(claim.id);
      toast.success('Rendición rechazada');
      this.claimsResource.reload();
    } catch {
      toast.error(this.expenseClaimsStore.status().error ?? 'Error al rechazar la rendición');
    }
  }
}
