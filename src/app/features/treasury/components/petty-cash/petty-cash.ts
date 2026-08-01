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
import { form, FormField, required } from '@angular/forms/signals';
import { toast } from 'ngx-sonner';
import DataTable, { DataTableAction, DataTableColumn } from '../../../../shared/components/data-table/data-table';
import EmptyState from '../../../../shared/components/empty-state/empty-state';
import WorkflowTip from '../../../../shared/components/workflow-tip/workflow-tip';
import InfoTip from '../../../../shared/components/info-tip/info-tip';
import { ConfirmDialog } from '../../../../shared/components/confirm-dialog/confirm-dialog';
import {
  FluentDropdown,
  FluentTextInput,
} from '../../../../shared/components/fluent-form-controls/fluent-form-controls';
import {
  BankAccount,
  CreatePettyCashFundRequest,
  PettyCashFund,
  ReplenishPettyCashFundRequest,
  CreatePettyCashExpenseRequest,
  TreasuryCurrency,
  UpdatePettyCashFundRequest,
} from '../../../../core/models/treasury.model';
import { TreasuryService } from '../../services/treasury';
import { TreasuryStore } from '../../store/treasury.store';
import { toApiPromise } from '../../../../core/utils/api-response';
import { apiResource } from '../../../../core/utils/resource-helpers';

interface Option<T = string> {
  value: T;
  label: string;
}

interface FundFormModel {
  name: string;
  responsible_name: string;
  currency: TreasuryCurrency | '';
}

interface ReplenishFormModel {
  bank_account_id: string;
  amount: string;
  currency: TreasuryCurrency | '';
  exchange_rate: string;
  transaction_date: string;
  operation_number: string;
  notes: string;
}

interface ExpenseFormModel {
  amount: string;
  currency: TreasuryCurrency | '';
  transaction_date: string;
  description: string;
  notes: string;
}

const CURRENCY_OPTIONS: Option<TreasuryCurrency>[] = [
  { value: 'PEN', label: 'Soles (PEN)' },
  { value: 'USD', label: 'Dólares (USD)' },
];

const EMPTY_FUND: FundFormModel = {
  name: '',
  responsible_name: '',
  currency: '',
};

const EMPTY_REPLENISH: ReplenishFormModel = {
  bank_account_id: '',
  amount: '',
  currency: '',
  exchange_rate: '1',
  transaction_date: new Date().toISOString().split('T')[0],
  operation_number: '',
  notes: '',
};

const EMPTY_EXPENSE: ExpenseFormModel = {
  amount: '',
  currency: '',
  transaction_date: new Date().toISOString().split('T')[0],
  description: '',
  notes: '',
};

@Component({
  selector: 'app-petty-cash',
  standalone: true,
  imports: [
    DataTable,
    EmptyState,
    WorkflowTip,
    InfoTip,
    FormField,
    FluentTextInput,
    FluentDropdown,
    ConfirmDialog,
  ],
  templateUrl: './petty-cash.html',
  styleUrl: './petty-cash.scss',
  encapsulation: ViewEncapsulation.None,
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
})
export default class PettyCashComponent {
  private readonly treasuryService = inject(TreasuryService);
  private readonly treasuryStore = inject(TreasuryStore);

  readonly accounts = input.required<BankAccount[]>();

  // --- Form models ---

  protected readonly fundModel = signal<FundFormModel>({ ...EMPTY_FUND });
  protected readonly fundForm;
  protected readonly editingFundId = signal<string | null>(null);

  protected readonly replenishModel = signal<ReplenishFormModel>({ ...EMPTY_REPLENISH });
  protected readonly replenishForm;
  protected readonly selectedFundForReplenish = signal<PettyCashFund | null>(null);

  protected readonly expenseModel = signal<ExpenseFormModel>({ ...EMPTY_EXPENSE });
  protected readonly expenseForm;
  protected readonly selectedFundForExpense = signal<PettyCashFund | null>(null);

  // --- Confirm dialog ---

  private readonly fundDeleteDialog = viewChild<ConfirmDialog>('fundDeleteDialog');
  protected readonly fundToDelete = signal<PettyCashFund | null>(null);

  // --- Options ---

  protected readonly currencyOptions = CURRENCY_OPTIONS;

  // --- Resources ---

  private readonly fundsResource = apiResource<PettyCashFund[]>(async () => {
    try {
      const response = await toApiPromise(this.treasuryService.getPettyCashFunds({ limit: 100 }));
      return response.items;
    } catch {
      toast.error('Error al cargar fondos de caja chica');
      return [];
    }
  });

  // --- Computed ---

  protected readonly funds = computed<PettyCashFund[]>(() => this.fundsResource.value() ?? []);
  protected readonly fundsLoading = computed(() => this.fundsResource.isLoading());
  protected readonly saving = computed(() => this.treasuryStore.status().loading);

  protected readonly accountOptions = computed<Option<string>[]>(() => [
    { value: '', label: 'Selecciona una cuenta' },
    ...this.accounts().map((account) => ({
      value: account.id,
      label: `${account.name} (${account.currency})`,
    })),
  ]);

  protected readonly fundColumns: DataTableColumn<PettyCashFund>[] = [
    { key: 'name', header: 'Nombre' },
    { key: 'responsible_name', header: 'Responsable' },
    { key: 'currency', header: 'Moneda' },
    { key: 'real_balance', header: 'Saldo real' },
    { key: 'is_active', header: 'Estado', type: 'status', statusDomain: 'treasury-petty-cash-state' },
  ];

  protected readonly fundActions: DataTableAction<PettyCashFund>[] = [
    { key: 'edit', label: 'Editar', icon: 'bi-pencil' },
    { key: 'replenish', label: 'Reponer', icon: 'bi-plus-circle' },
    { key: 'expense', label: 'Gasto', icon: 'bi-receipt' },
    { key: 'delete', label: 'Eliminar', icon: 'bi-trash' },
  ];

  constructor() {
    this.fundForm = form(this.fundModel, (schema) => {
      required(schema.name, { message: 'El nombre del fondo es obligatorio.' });
      required(schema.responsible_name, { message: 'El responsable es obligatorio.' });
      required(schema.currency, { message: 'La moneda es obligatoria.' });
    });

    this.replenishForm = form(this.replenishModel, (schema) => {
      required(schema.bank_account_id, { message: 'La cuenta bancaria es obligatoria.' });
      required(schema.amount, { message: 'El monto es obligatorio.' });
      required(schema.currency, { message: 'La moneda es obligatoria.' });
      required(schema.transaction_date, { message: 'La fecha es obligatoria.' });
    });

    this.expenseForm = form(this.expenseModel, (schema) => {
      required(schema.amount, { message: 'El monto es obligatorio.' });
      required(schema.currency, { message: 'La moneda es obligatoria.' });
      required(schema.transaction_date, { message: 'La fecha es obligatoria.' });
      required(schema.description, { message: 'La descripción es obligatoria.' });
    });

    effect(() => {
      const fund = this.selectedFundForReplenish();
      if (fund) {
        this.replenishModel.update((model) => ({ ...model, currency: fund.currency }));
      }
    });

    effect(() => {
      const fund = this.selectedFundForExpense();
      if (fund) {
        this.expenseModel.update((model) => ({ ...model, currency: fund.currency }));
      }
    });
  }

  // --- Fund handlers ---

  protected async onFundSubmit(): Promise<void> {
    this.fundForm().markAsTouched();
    if (this.fundForm().invalid()) {
      toast.error('Completa los campos obligatorios del fondo');
      return;
    }

    const model = this.fundModel();
    const request: CreatePettyCashFundRequest = {
      name: model.name,
      responsible_name: model.responsible_name,
      currency: model.currency as TreasuryCurrency,
    };

    try {
      const editingId = this.editingFundId();
      if (editingId) {
        const updateRequest: UpdatePettyCashFundRequest = { ...request };
        await this.treasuryStore.updatePettyCashFund(editingId, updateRequest);
        toast.success('Fondo actualizado');
      } else {
        await this.treasuryStore.createPettyCashFund(request);
        toast.success('Fondo creado');
      }
      this.resetFundForm();
      this.fundsResource.reload();
    } catch {
      toast.error(this.treasuryStore.status().error ?? 'Error al guardar el fondo');
    }
  }

  protected onFundAction(event: { action: string; row: PettyCashFund }): void {
    const fund = event.row;

    if (event.action === 'edit') {
      this.editingFundId.set(fund.id);
      this.fundModel.set({
        name: fund.name,
        responsible_name: fund.responsible_name,
        currency: fund.currency,
      });
      this.selectedFundForReplenish.set(null);
      this.selectedFundForExpense.set(null);
      return;
    }

    if (event.action === 'replenish') {
      this.selectedFundForReplenish.set(fund);
      this.selectedFundForExpense.set(null);
      this.editingFundId.set(null);
      this.replenishModel.set({ ...EMPTY_REPLENISH });
      return;
    }

    if (event.action === 'expense') {
      this.selectedFundForExpense.set(fund);
      this.selectedFundForReplenish.set(null);
      this.editingFundId.set(null);
      this.expenseModel.set({ ...EMPTY_EXPENSE });
      return;
    }

    if (event.action === 'delete') {
      this.fundToDelete.set(fund);
      this.fundDeleteDialog()?.open();
    }
  }

  protected async onConfirmFundDelete(): Promise<void> {
    const fund = this.fundToDelete();
    if (!fund) {
      return;
    }

    try {
      await this.treasuryStore.deletePettyCashFund(fund.id);
      toast.success('Fondo eliminado');
      this.fundToDelete.set(null);
      this.fundsResource.reload();
    } catch {
      toast.error(this.treasuryStore.status().error ?? 'Error al eliminar el fondo');
    }
  }

  protected resetFundForm(): void {
    this.editingFundId.set(null);
    this.fundForm().reset({ ...EMPTY_FUND });
  }

  // --- Replenish handlers ---

  protected async onReplenishSubmit(): Promise<void> {
    this.replenishForm().markAsTouched();
    if (this.replenishForm().invalid()) {
      toast.error('Completa los campos obligatorios de la reposición');
      return;
    }

    const fund = this.selectedFundForReplenish();
    if (!fund) {
      return;
    }

    const model = this.replenishModel();
    const request: ReplenishPettyCashFundRequest = {
      bank_account_id: model.bank_account_id,
      amount: Number(model.amount || 0),
      currency: model.currency as TreasuryCurrency,
      exchange_rate: model.exchange_rate ? Number(model.exchange_rate) : undefined,
      transaction_date: model.transaction_date,
      operation_number: model.operation_number || undefined,
      notes: model.notes || undefined,
    };

    try {
      await this.treasuryStore.replenishPettyCashFund(fund.id, request);
      toast.success('Caja chica reponida');
      this.resetReplenishForm();
      this.fundsResource.reload();
    } catch {
      toast.error(this.treasuryStore.status().error ?? 'Error al reponer la caja chica');
    }
  }

  protected resetReplenishForm(): void {
    this.selectedFundForReplenish.set(null);
    this.replenishModel.set({ ...EMPTY_REPLENISH });
  }

  // --- Expense handlers ---

  protected async onExpenseSubmit(): Promise<void> {
    this.expenseForm().markAsTouched();
    if (this.expenseForm().invalid()) {
      toast.error('Completa los campos obligatorios del gasto');
      return;
    }

    const fund = this.selectedFundForExpense();
    if (!fund) {
      return;
    }

    const model = this.expenseModel();
    const request: CreatePettyCashExpenseRequest = {
      amount: Number(model.amount || 0),
      currency: model.currency as TreasuryCurrency,
      transaction_date: model.transaction_date,
      description: model.description,
      notes: model.notes || undefined,
    };

    try {
      await this.treasuryStore.createPettyCashExpense(fund.id, request);
      toast.success('Gasto registrado');
      this.resetExpenseForm();
      this.fundsResource.reload();
    } catch {
      toast.error(this.treasuryStore.status().error ?? 'Error al registrar el gasto');
    }
  }

  protected resetExpenseForm(): void {
    this.selectedFundForExpense.set(null);
    this.expenseModel.set({ ...EMPTY_EXPENSE });
  }
}
