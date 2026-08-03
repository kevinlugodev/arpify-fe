import {
  Component,
  computed,
  CUSTOM_ELEMENTS_SCHEMA,
  inject,
  input,
  signal,
  viewChild,
  ViewEncapsulation,
} from '@angular/core';

import { form, FormField, required, applyEach, minLength } from '@angular/forms/signals';
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
  BankStatement,
  BankStatementItem,
  BankTransaction,
  CreateBankStatementRequest,
  MatchBankStatementItemRequest,
  TransactionType,
} from '../../../../core/models/treasury.model';
import { TreasuryService } from '../../services/treasury';
import { TreasuryStore } from '../../store/treasury.store';
import { toApiPromise } from '../../../../core/utils/api-response';
import { apiResource, apiResourceWithRequest } from '../../../../core/utils/resource-helpers';

interface StatementItemFormModel {
  transaction_date: string;
  operation_number: string;
  description: string;
  amount: string;
  type: TransactionType | '';
}

interface StatementFormModel {
  bank_account_id: string;
  file_name: string;
  period_start_date: string;
  period_end_date: string;
  items: StatementItemFormModel[];
}

interface Option<T = string> {
  value: T;
  label: string;
}

type StatementRow = BankStatement & { bank_account_name: string };

const EMPTY_STATEMENT_ITEM: StatementItemFormModel = {
  transaction_date: new Date().toISOString().split('T')[0],
  operation_number: '',
  description: '',
  amount: '',
  type: '',
};

const EMPTY_STATEMENT: StatementFormModel = {
  bank_account_id: '',
  file_name: '',
  period_start_date: '',
  period_end_date: '',
  items: [],
};

const STATEMENT_ITEM_TYPE_OPTIONS: Option<TransactionType>[] = [
  { value: 'INFLOW', label: 'Ingreso' },
  { value: 'OUTFLOW', label: 'Egreso' },
];

@Component({
  selector: 'app-bank-statements',
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
  templateUrl: './bank-statements.html',
  styleUrl: './bank-statements.scss',
  encapsulation: ViewEncapsulation.None,
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
})
export default class BankStatementsComponent {
  private readonly treasuryService = inject(TreasuryService);
  private readonly treasuryStore = inject(TreasuryStore);

  readonly accounts = input.required<BankAccount[]>();

  protected readonly statementModel = signal<StatementFormModel>({ ...EMPTY_STATEMENT });
  protected readonly statementForm;

  protected readonly selectedStatementId = signal<string | null>(null);
  protected readonly statementToDelete = signal<BankStatement | null>(null);
  protected readonly itemToMatch = signal<BankStatementItem | null>(null);

  private readonly deleteDialog = viewChild<ConfirmDialog>('deleteDialog');

  protected readonly accountOptions = computed<Option<string>[]>(() => [
    { value: '', label: 'Selecciona una cuenta bancaria' },
    ...this.accounts()
      .filter((account) => account.is_active)
      .map((account) => ({
        value: account.id,
        label: `${account.bank_name} — ${account.name} (${account.currency})`,
      })),
  ]);

  protected readonly selectedStatement = computed<BankStatement | undefined>(() =>
    this.statements().find((statement) => statement.id === this.selectedStatementId())
  );

  protected readonly transactionOptions = computed<Option<string>[]>(() => {
    const item = this.itemToMatch();
    const statement = this.selectedStatement();
    if (!item || !statement) {
      return [];
    }

    return this.transactions()
      .filter(
        (transaction) =>
          transaction.bank_account_id === statement.bank_account_id &&
          transaction.type === item.type &&
          transaction.reconciliation_status !== 'MATCHED'
      )
      .map((transaction) => ({
        value: transaction.id,
        label: `${transaction.operation_number || 'S/N'} — ${transaction.category} — ${transaction.amount} ${transaction.currency}`,
      }));
  });

  protected readonly matchModel = signal<{ bank_transaction_id: string }>({ bank_transaction_id: '' });
  protected readonly matchForm;

  protected readonly itemTypeOptions = STATEMENT_ITEM_TYPE_OPTIONS;

  private readonly statementsResource = apiResource<BankStatement[]>(async () => {
    try {
      const response = await toApiPromise(this.treasuryService.getBankStatements({ limit: 100 }));
      return response.items;
    } catch {
      toast.error('Error al cargar estados de cuenta');
      return [];
    }
  });

  private readonly itemsResource = apiResourceWithRequest(
    () => this.selectedStatementId(),
    async ({ params: statementId }) => {
      if (!statementId) {
        return [];
      }
      try {
        const response = await toApiPromise(this.treasuryService.getBankStatementItems(statementId));
        return response.items;
      } catch {
        toast.error('Error al cargar ítems del estado de cuenta');
        return [];
      }
    }
  );

  private readonly transactionsResource = apiResource<BankTransaction[]>(async () => {
    try {
      const response = await toApiPromise(this.treasuryService.getTransactions({ limit: 200 }));
      return response.items;
    } catch {
      toast.error('Error al cargar movimientos bancarios');
      return [];
    }
  });

  protected readonly statements = computed<BankStatement[]>(() => this.statementsResource.value() ?? []);
  protected readonly statementsLoading = computed(() => this.statementsResource.isLoading());

  protected readonly statementRows = computed<StatementRow[]>(() =>
    this.statements().map((statement) => ({
      ...statement,
      bank_account_name: this.getAccountName(statement.bank_account_id),
    }))
  );

  protected readonly statementColumns: DataTableColumn<StatementRow>[] = [
    { key: 'file_name', header: 'Archivo' },
    { key: 'bank_account_name', header: 'Cuenta bancaria' },
    { key: 'period_start_date', header: 'Periodo inicio', type: 'date' },
    { key: 'period_end_date', header: 'Periodo fin', type: 'date' },
  ];

  protected readonly statementActions: DataTableAction<StatementRow>[] = [
    { key: 'delete', label: 'Eliminar', icon: 'bi-trash' },
  ];

  protected readonly items = computed<BankStatementItem[]>(() => this.itemsResource.value() ?? []);
  protected readonly itemsLoading = computed(() => this.itemsResource.isLoading());

  protected readonly itemColumns: DataTableColumn<BankStatementItem>[] = [
    { key: 'transaction_date', header: 'Fecha', type: 'date' },
    { key: 'operation_number', header: 'N° operación' },
    { key: 'description', header: 'Descripción' },
    { key: 'amount', header: 'Monto' },
    { key: 'type', header: 'Tipo', type: 'status', statusDomain: 'treasury-transaction-type' },
    { key: 'is_matched', header: 'Emparejado', type: 'status', statusDomain: 'active-state' },
  ];

  protected readonly itemActions: DataTableAction<BankStatementItem>[] = [
    { key: 'match', label: 'Emparejar', icon: 'bi-link-45deg' },
  ];

  protected readonly transactions = computed<BankTransaction[]>(() => this.transactionsResource.value() ?? []);
  protected readonly transactionsLoading = computed(() => this.transactionsResource.isLoading());

  protected readonly saving = computed(() => this.treasuryStore.status().loading);

  protected readonly selectedRowClass = (row: StatementRow) =>
    row.id === this.selectedStatementId() ? 'bank-statements__row--selected' : '';

  constructor() {
    this.statementForm = form(this.statementModel, (schema) => {
      required(schema.bank_account_id, { message: 'La cuenta bancaria es obligatoria.' });
      required(schema.file_name, { message: 'El nombre del archivo es obligatorio.' });
      minLength(schema.items, 1, { message: 'Debe agregar al menos un ítem.' });

      applyEach(schema.items, (item) => {
        required(item.transaction_date, { message: 'La fecha es obligatoria.' });
        required(item.description, { message: 'La descripción es obligatoria.' });
        required(item.amount, { message: 'El monto es obligatorio.' });
        required(item.type, { message: 'El tipo es obligatorio.' });
      });
    });

    this.matchForm = form(this.matchModel, (schema) => {
      required(schema.bank_transaction_id, { message: 'Selecciona una transacción bancaria.' });
    });
  }

  protected getAccountName(id: string): string {
    return this.accounts().find((account) => account.id === id)?.name ?? id;
  }

  protected addItem(): void {
    this.statementModel.update((model) => ({
      ...model,
      items: [...model.items, { ...EMPTY_STATEMENT_ITEM }],
    }));
  }

  protected removeItem(index: number): void {
    this.statementModel.update((model) => ({
      ...model,
      items: model.items.filter((_, i) => i !== index),
    }));
  }

  protected async onSubmit(): Promise<void> {
    this.statementForm().markAsTouched();
    if (this.statementForm().invalid()) {
      toast.error('Completa los campos obligatorios del estado de cuenta');
      return;
    }

    const model = this.statementModel();
    const request: CreateBankStatementRequest = {
      bank_account_id: model.bank_account_id,
      file_name: model.file_name,
      period_start_date: model.period_start_date,
      period_end_date: model.period_end_date,
      items: model.items.map((item) => ({
        transaction_date: item.transaction_date,
        operation_number: item.operation_number || undefined,
        description: item.description,
        amount: Number(item.amount || 0),
        type: item.type as TransactionType,
      })),
    };

    try {
      await this.treasuryStore.createBankStatement(request);
      toast.success('Estado de cuenta importado');
      this.resetForm();
      this.statementsResource.reload();
    } catch {
      toast.error(this.treasuryStore.status().error ?? 'Error al importar el estado de cuenta');
    }
  }

  protected resetForm(): void {
    this.statementForm().reset({ ...EMPTY_STATEMENT });
  }

  protected onStatementRowClick(statement: StatementRow): void {
    this.selectedStatementId.set(statement.id);
  }

  protected onStatementAction(event: { action: string; row: StatementRow }): void {
    if (event.action === 'delete') {
      this.statementToDelete.set(event.row);
      this.deleteDialog()?.open();
    }
  }

  protected async onConfirmDelete(): Promise<void> {
    const statement = this.statementToDelete();
    if (!statement) {
      return;
    }

    try {
      await this.treasuryStore.deleteBankStatement(statement.id);
      toast.success('Estado de cuenta eliminado');
      this.statementToDelete.set(null);
      if (this.selectedStatementId() === statement.id) {
        this.selectedStatementId.set(null);
      }
      this.statementsResource.reload();
    } catch {
      toast.error(this.treasuryStore.status().error ?? 'Error al eliminar el estado de cuenta');
    }
  }

  protected onItemAction(event: { action: string; row: BankStatementItem }): void {
    if (event.action === 'match') {
      this.itemToMatch.set(event.row);
      this.matchModel.set({ bank_transaction_id: '' });
    }
  }

  protected async onConfirmMatch(): Promise<void> {
    const item = this.itemToMatch();
    if (!item) {
      return;
    }

    this.matchForm().markAsTouched();
    if (this.matchForm().invalid()) {
      toast.error('Selecciona una transacción bancaria');
      return;
    }

    const request: MatchBankStatementItemRequest = {
      bank_transaction_id: this.matchModel().bank_transaction_id,
    };

    try {
      await this.treasuryStore.matchBankStatementItem(item.id, request);
      toast.success('Ítem emparejado');
      this.itemToMatch.set(null);
      this.matchModel.set({ bank_transaction_id: '' });
      this.itemsResource.reload();
      this.transactionsResource.reload();
    } catch {
      toast.error(this.treasuryStore.status().error ?? 'Error al emparejar el ítem');
    }
  }

  protected onCancelMatch(): void {
    this.itemToMatch.set(null);
    this.matchModel.set({ bank_transaction_id: '' });
  }
}
