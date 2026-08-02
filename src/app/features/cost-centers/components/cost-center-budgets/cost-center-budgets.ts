import {
  Component,
  computed,
  CUSTOM_ELEMENTS_SCHEMA,
  effect,
  inject,
  input,
  signal,
  viewChild,
  ViewEncapsulation,
} from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { form, FormField, required } from '@angular/forms/signals';
import { toast } from 'ngx-sonner';
import DataTable, { DataTableAction, DataTableColumn } from '../../../../shared/components/data-table/data-table';
import EmptyState from '../../../../shared/components/empty-state/empty-state';
import InfoTip from '../../../../shared/components/info-tip/info-tip';
import { ConfirmDialog } from '../../../../shared/components/confirm-dialog/confirm-dialog';
import {
  FluentDropdown,
  FluentTextInput,
} from '../../../../shared/components/fluent-form-controls/fluent-form-controls';
import {
  CostCenter,
  CostCenterBudget,
  CreateCostCenterBudgetRequest,
  UpdateCostCenterBudgetRequest,
} from '../../../../core/models/cost-centers.model';
import { CostCentersService } from '../../services/cost-centers';
import { CostCentersStore } from '../../store/cost-centers.store';
import { toApiPromise } from '../../../../core/utils/api-response';
import { apiResourceWithRequest } from '../../../../core/utils/resource-helpers';

interface CostCenterBudgetFormModel {
  period_year: string;
  period_month: string;
  allocated_budget: string;
  committed_amount: string;
  spent_amount: string;
  currency: string;
}

interface Option<T = string> {
  value: T;
  label: string;
}

interface BudgetRow extends CostCenterBudget {
  remaining_budget: number;
}

const CURRENCY_OPTIONS: Option<string>[] = [
  { value: 'PEN', label: 'Soles (PEN)' },
  { value: 'USD', label: 'Dólares (USD)' },
];

const EMPTY_BUDGET: CostCenterBudgetFormModel = {
  period_year: String(new Date().getFullYear()),
  period_month: String(new Date().getMonth() + 1),
  allocated_budget: '',
  committed_amount: '0',
  spent_amount: '0',
  currency: 'PEN',
};

@Component({
  selector: 'app-cost-center-budgets',
  standalone: true,
  imports: [
    DataTable,
    EmptyState,
    InfoTip,
    ConfirmDialog,
    FormField,
    FluentTextInput,
    FluentDropdown,
  ],
  templateUrl: './cost-center-budgets.html',
  styleUrl: './cost-center-budgets.scss',
  encapsulation: ViewEncapsulation.None,
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
})
export default class CostCenterBudgetsComponent {
  private readonly costCentersService = inject(CostCentersService);
  private readonly costCentersStore = inject(CostCentersStore);

  readonly costCenters = input.required<CostCenter[]>();

  protected readonly selectedCostCenterId = signal<string>('');
  protected readonly editingBudgetId = signal<string | null>(null);

  protected readonly model = signal<CostCenterBudgetFormModel>({ ...EMPTY_BUDGET });
  protected readonly form;

  private readonly deleteDialog = viewChild<ConfirmDialog>('deleteDialog');
  protected readonly budgetToDelete = signal<CostCenterBudget | null>(null);

  protected readonly currencyOptions = CURRENCY_OPTIONS;

  private readonly budgetsResource = apiResourceWithRequest<CostCenterBudget[], string>(
    () => this.selectedCostCenterId(),
    async ({ params }) => {
      if (!params) {
        return [];
      }
      try {
        const response = await toApiPromise(
          this.costCentersService.getCostCenterBudgets(params, { limit: 100 })
        );
        return response.items.map((item) => item.budget);
      } catch {
        toast.error('Error al cargar presupuestos');
        return [];
      }
    }
  );

  protected readonly budgets = computed<CostCenterBudget[]>(() => this.budgetsResource.value() ?? []);
  protected readonly budgetsLoading = computed(() => this.budgetsResource.isLoading());

  protected readonly budgetRows = computed<BudgetRow[]>(() =>
    this.budgets().map((budget) => ({
      ...budget,
      remaining_budget: budget.allocated_budget - budget.committed_amount - budget.spent_amount,
    }))
  );

  protected readonly costCenterOptions = computed<Option<string>[]>(() => [
    { value: '', label: 'Selecciona un centro de costo' },
    ...this.costCenters().map((center) => ({
      value: center.id,
      label: `${center.code} — ${center.name}`,
    })),
  ]);

  protected readonly saving = computed(() => this.costCentersStore.status().loading);

  protected readonly columns: DataTableColumn<BudgetRow>[] = [
    { key: 'period_year', header: 'Año' },
    { key: 'period_month', header: 'Mes' },
    { key: 'allocated_budget', header: 'Presupuesto' },
    { key: 'committed_amount', header: 'Comprometido' },
    { key: 'spent_amount', header: 'Gastado' },
    { key: 'remaining_budget', header: 'Saldo' },
    { key: 'currency', header: 'Moneda' },
  ];

  protected readonly actions: DataTableAction<BudgetRow>[] = [
    { key: 'edit', label: 'Editar', icon: 'bi-pencil' },
    { key: 'delete', label: 'Eliminar', icon: 'bi-trash' },
  ];

  constructor() {
    this.form = form(this.model, (schema) => {
      required(schema.period_year, { message: 'El año es obligatorio.' });
      required(schema.period_month, { message: 'El mes es obligatorio.' });
      required(schema.allocated_budget, { message: 'El presupuesto asignado es obligatorio.' });
      required(schema.currency, { message: 'La moneda es obligatoria.' });
    });

    effect(() => {
      const centers = this.costCenters();
      if (centers.length > 0 && !this.selectedCostCenterId()) {
        this.selectedCostCenterId.set(centers[0].id);
      }
    });
  }

  protected isEditing(): boolean {
    return !!this.editingBudgetId();
  }

  protected async onSubmit(): Promise<void> {
    this.form().markAsTouched();
    if (this.form().invalid()) {
      toast.error('Completa los campos obligatorios del presupuesto');
      return;
    }

    const centerId = this.selectedCostCenterId();
    if (!centerId) {
      toast.error('Selecciona un centro de costo');
      return;
    }

    const model = this.model();
    const baseRequest = {
      period_year: Number(model.period_year),
      period_month: Number(model.period_month),
      allocated_budget: Number(model.allocated_budget || 0),
      committed_amount: Number(model.committed_amount || 0),
      spent_amount: Number(model.spent_amount || 0),
      currency: model.currency,
    };

    try {
      const editingId = this.editingBudgetId();
      if (editingId) {
        const request: UpdateCostCenterBudgetRequest = { ...baseRequest };
        await this.costCentersStore.updateCostCenterBudget(centerId, editingId, request);
        toast.success('Presupuesto actualizado');
      } else {
        const request: CreateCostCenterBudgetRequest = { ...baseRequest };
        await this.costCentersStore.createCostCenterBudget(centerId, request);
        toast.success('Presupuesto creado');
      }
      this.resetForm();
      this.budgetsResource.reload();
    } catch {
      toast.error(this.costCentersStore.status().error ?? 'Error al guardar el presupuesto');
    }
  }

  protected onAction(event: { action: string; row: BudgetRow }): void {
    if (event.action === 'edit') {
      const budget = event.row;
      this.editingBudgetId.set(budget.id);
      this.model.set({
        period_year: String(budget.period_year),
        period_month: String(budget.period_month),
        allocated_budget: String(budget.allocated_budget),
        committed_amount: String(budget.committed_amount),
        spent_amount: String(budget.spent_amount),
        currency: budget.currency,
      });
      return;
    }

    if (event.action === 'delete') {
      this.budgetToDelete.set(event.row);
      this.deleteDialog()?.open();
    }
  }

  protected async onConfirmDelete(): Promise<void> {
    const budget = this.budgetToDelete();
    const centerId = this.selectedCostCenterId();
    if (!budget || !centerId) {
      return;
    }

    try {
      await this.costCentersStore.deleteCostCenterBudget(centerId, budget.id);
      toast.success('Presupuesto eliminado');
      this.budgetToDelete.set(null);
      this.budgetsResource.reload();
    } catch {
      toast.error(this.costCentersStore.status().error ?? 'Error al eliminar el presupuesto');
    }
  }

  protected resetForm(): void {
    this.editingBudgetId.set(null);
    this.form().reset({ ...EMPTY_BUDGET });
  }
}
