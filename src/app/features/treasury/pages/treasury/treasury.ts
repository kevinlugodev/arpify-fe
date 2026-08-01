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
import DataTable, { DataTableAction, DataTableColumn } from '../../../../shared/components/data-table/data-table';
import EmptyState from '../../../../shared/components/empty-state/empty-state';
import PageHeader from '../../../../shared/components/page-header/page-header';
import WorkflowTip from '../../../../shared/components/workflow-tip/workflow-tip';
import ServiceOrdersComponent from '../../components/service-orders/service-orders';
import PettyCashComponent from '../../components/petty-cash/petty-cash';
import BankStatementsComponent from '../../components/bank-statements/bank-statements';
import CashFlowComponent from '../../components/cash-flow/cash-flow';
import { ConfirmDialog } from '../../../../shared/components/confirm-dialog/confirm-dialog';
import {
  FluentCheckbox,
  FluentDropdown,
  FluentTextInput,
} from '../../../../shared/components/fluent-form-controls/fluent-form-controls';
import {
  Bank,
  BankAccount,
  BankTransaction,
  CreateBankAccountRequest,
  CreateBankTransactionRequest,
  CreatePayableRequest,
  Payable,
  PayableDocumentType,
  PaymentStatus,
  TransactionCategory,
  TransactionType,
  TreasuryCurrency,
  UpdateBankAccountRequest,
  UpdatePayableRequest,
} from '../../../../core/models/treasury.model';
import { TreasuryService } from '../../services/treasury';
import { TreasuryStore } from '../../store/treasury.store';
import { toApiPromise } from '../../../../core/utils/api-response';
import { apiResource, apiResourceWithRequest } from '../../../../core/utils/resource-helpers';

type TreasuryTab = 'accounts' | 'payables' | 'transactions' | 'service-orders' | 'petty-cash' | 'bank-statements' | 'cash-flow';

interface AccountFormModel {
  name: string;
  bank_id: string;
  account_number: string;
  cci: string;
  currency: TreasuryCurrency | '';
  real_balance: string;
  is_active: boolean;
}

interface PayableFormModel {
  bank_account_id: string;
  document_type: PayableDocumentType | '';
  document_number: string;
  entity_name: string;
  gross_amount: string;
  retention_amount: string;
  net_amount: string;
  due_date: string;
  notes: string;
}

interface TransactionFormModel {
  bank_account_id: string;
  destination_bank_account_id: string;
  type: TransactionType | '';
  category: TransactionCategory | '';
  amount: string;
  currency: TreasuryCurrency | '';
  exchange_rate: string;
  transaction_date: string;
  operation_number: string;
  payable_id: string;
  notes: string;
}

interface Option<T = string> {
  value: T;
  label: string;
}

const CURRENCY_OPTIONS: Option<TreasuryCurrency>[] = [
  { value: 'PEN', label: 'Soles (PEN)' },
  { value: 'USD', label: 'Dólares (USD)' },
];

const DOCUMENT_TYPE_OPTIONS: Option<PayableDocumentType>[] = [
  { value: 'RHE', label: 'Recibo por honorarios' },
  { value: 'INVOICE', label: 'Factura de proveedor' },
  { value: 'TAX_SETTLEMENT', label: 'Liquidación tributaria' },
];

const TRANSACTION_TYPE_OPTIONS: Option<TransactionType>[] = [
  { value: 'INFLOW', label: 'Ingreso' },
  { value: 'OUTFLOW', label: 'Egreso / Pago' },
  { value: 'TRANSFER', label: 'Transferencia' },
];

const TRANSACTION_CATEGORY_OPTIONS: Option<TransactionCategory>[] = [
  { value: 'CUSTOMER_PAYMENT', label: 'Cobro de cliente' },
  { value: 'SUPPLIER_PAYMENT', label: 'Pago a proveedor' },
  { value: 'RHE_PAYMENT', label: 'Pago de RHE' },
  { value: 'TAX_PAYMENT', label: 'Pago de impuestos' },
  { value: 'PAYROLL', label: 'Planilla' },
  { value: 'PARTNER_DRAW', label: 'Retiro de socio' },
  { value: 'BANK_FEE', label: 'Comisión bancaria' },
  { value: 'INTERNAL_TRANSFER', label: 'Transferencia interna' },
  { value: 'OTHER', label: 'Otro' },
];

const EMPTY_ACCOUNT: AccountFormModel = {
  name: '',
  bank_id: '',
  account_number: '',
  cci: '',
  currency: '',
  real_balance: '0',
  is_active: true,
};

const EMPTY_PAYABLE: PayableFormModel = {
  bank_account_id: '',
  document_type: '',
  document_number: '',
  entity_name: '',
  gross_amount: '',
  retention_amount: '0',
  net_amount: '',
  due_date: '',
  notes: '',
};

const EMPTY_TRANSACTION: TransactionFormModel = {
  bank_account_id: '',
  destination_bank_account_id: '',
  type: '',
  category: '',
  amount: '',
  currency: '',
  exchange_rate: '1',
  transaction_date: new Date().toISOString().split('T')[0],
  operation_number: '',
  payable_id: '',
  notes: '',
};

@Component({
  selector: 'app-treasury',
  imports: [
    PageHeader,
    DataTable,
    EmptyState,
    WorkflowTip,
    FormField,
    FluentTextInput,
    FluentDropdown,
    FluentCheckbox,
    ConfirmDialog,
    ServiceOrdersComponent,
    PettyCashComponent,
    BankStatementsComponent,
    CashFlowComponent,
  ],
  templateUrl: './treasury.html',
  styleUrl: './treasury.scss',
  encapsulation: ViewEncapsulation.None,
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
})
export default class TreasuryPage {
  private readonly treasuryService = inject(TreasuryService);
  private readonly treasuryStore = inject(TreasuryStore);

  protected readonly activeTab = signal<TreasuryTab>('accounts');

  // --- Form models ---

  protected readonly accountModel = signal<AccountFormModel>({ ...EMPTY_ACCOUNT });
  protected readonly accountForm;
  protected readonly editingAccountId = signal<string | null>(null);

  protected readonly payableModel = signal<PayableFormModel>({ ...EMPTY_PAYABLE });
  protected readonly payableForm;
  protected readonly editingPayableId = signal<string | null>(null);

  protected readonly transactionModel = signal<TransactionFormModel>({ ...EMPTY_TRANSACTION });
  protected transactionForm;

  // --- Confirm dialogs ---

  private readonly accountDeleteDialog = viewChild<ConfirmDialog>('accountDeleteDialog');
  private readonly payableDeleteDialog = viewChild<ConfirmDialog>('payableDeleteDialog');
  private readonly transactionReverseDialog = viewChild<ConfirmDialog>('transactionReverseDialog');

  protected readonly itemToDelete = signal<BankAccount | Payable | null>(null);
  protected readonly transactionToReverse = signal<BankTransaction | null>(null);

  // --- Options ---

  protected readonly currencyOptions = CURRENCY_OPTIONS;
  protected readonly documentTypeOptions = DOCUMENT_TYPE_OPTIONS;
  protected readonly transactionTypeOptions = TRANSACTION_TYPE_OPTIONS;
  protected readonly transactionCategoryOptions = TRANSACTION_CATEGORY_OPTIONS;

  // --- Resources ---

  private readonly accountsResource = apiResource<BankAccount[]>(async () => {
    try {
      const response = await toApiPromise(this.treasuryService.getBankAccounts({ active_only: false, limit: 100 }));
      return response.items;
    } catch {
      toast.error('Error al cargar cuentas bancarias');
      return [];
    }
  });

  private readonly banksResource = apiResource<Bank[]>(async () => {
    try {
      const response = await toApiPromise(this.treasuryService.getBanks({ active_only: true, limit: 100 }));
      return response.items;
    } catch {
      toast.error('Error al cargar catálogo de bancos');
      return [];
    }
  });

  private readonly payablesResource = apiResource<Payable[]>(async () => {
    try {
      const response = await toApiPromise(this.treasuryService.getPayables({ limit: 100 }));
      return response.items;
    } catch {
      toast.error('Error al cargar obligaciones por pagar');
      return [];
    }
  });

  private readonly transactionsResource = apiResource<BankTransaction[]>(async () => {
    try {
      const response = await toApiPromise(this.treasuryService.getTransactions({ limit: 100 }));
      return response.items;
    } catch {
      toast.error('Error al cargar movimientos bancarios');
      return [];
    }
  });

  // --- Computed ---

  protected readonly accounts = computed<BankAccount[]>(() => this.accountsResource.value() ?? []);
  protected readonly accountsLoading = computed(() => this.accountsResource.isLoading());

  protected readonly banks = computed<Bank[]>(() => this.banksResource.value() ?? []);
  protected readonly banksLoading = computed(() => this.banksResource.isLoading());

  protected readonly bankOptions = computed<Option<string>[]>(() => [
    { value: '', label: 'Selecciona un banco' },
    ...this.banks().map((bank) => ({
      value: bank.id,
      label: `${bank.short_name} — ${bank.name}`,
    })),
  ]);

  protected readonly accountRows = computed(() =>
    this.accounts().map((account) => ({
      ...account,
      available_balance: account.real_balance - account.reserved_amount,
    }))
  );

  protected readonly payables = computed<Payable[]>(() => this.payablesResource.value() ?? []);
  protected readonly payablesLoading = computed(() => this.payablesResource.isLoading());

  protected readonly transactions = computed<BankTransaction[]>(() => this.transactionsResource.value() ?? []);
  protected readonly transactionsLoading = computed(() => this.transactionsResource.isLoading());

  protected readonly transactionRows = computed(() =>
    this.transactions().map((transaction) => ({
      ...transaction,
      bank_account_name: this.getAccountName(transaction.bank_account_id),
    }))
  );

  protected readonly accountOptions = computed<Option<string>[]>(() => [
    { value: '', label: 'Sin cuenta asignada' },
    ...this.accounts().map((account) => ({
      value: account.id,
      label: `${account.name} (${account.currency})`,
    })),
  ]);

  protected readonly activeAccountOptions = computed<Option<string>[]>(() =>
    this.accounts()
      .filter((account) => account.is_active)
      .map((account) => ({ value: account.id, label: `${account.name} (${account.currency})` }))
  );

  protected readonly destinationAccountOptions = computed<Option<string>[]>(() => {
    const originId = this.transactionModel().bank_account_id;
    const originCurrency = this.accounts().find((account) => account.id === originId)?.currency;
    return this.accounts()
      .filter((account) => account.id !== originId && account.currency === originCurrency)
      .map((account) => ({ value: account.id, label: `${account.name} (${account.currency})` }));
  });

  protected readonly payableOptions = computed<Option<string>[]>(() =>
    this.payables()
      .filter((payable) => payable.status === 'PENDING' || payable.status === 'PARTIALLY_PAID')
      .map((payable) => ({
        value: payable.id,
        label: `${payable.entity_name} — ${payable.net_amount - payable.paid_amount}`,
      }))
  );

  protected readonly saving = computed(() => this.treasuryStore.status().loading);

  protected readonly editingAccountRowClass = (row: BankAccount & { available_balance: number }) =>
    row.id === this.editingAccountId() ? 'treasury__row--editing' : '';

  protected readonly editingPayableRowClass = (row: Payable) =>
    row.id === this.editingPayableId() ? 'treasury__row--editing' : '';

  // --- Columns ---

  protected readonly accountColumns: DataTableColumn<BankAccount & { available_balance: number }>[] = [
    { key: 'name', header: 'Nombre' },
    { key: 'bank_name', header: 'Banco' },
    { key: 'account_number', header: 'Número de cuenta' },
    { key: 'currency', header: 'Moneda' },
    { key: 'real_balance', header: 'Saldo real' },
    { key: 'reserved_amount', header: 'Reservado' },
    { key: 'available_balance', header: 'Disponible' },
    { key: 'is_active', header: 'Estado', type: 'status', statusDomain: 'active-state' },
  ];

  protected readonly accountActions: DataTableAction<BankAccount>[] = [
    { key: 'edit', label: 'Editar', icon: 'bi-pencil' },
    { key: 'delete', label: 'Eliminar', icon: 'bi-trash' },
  ];

  protected readonly payableColumns: DataTableColumn<Payable>[] = [
    { key: 'entity_name', header: 'Entidad' },
    { key: 'document_type', header: 'Tipo doc.', type: 'status', statusDomain: 'treasury-payable-document' },
    { key: 'document_number', header: 'Número' },
    { key: 'net_amount', header: 'Monto neto' },
    { key: 'paid_amount', header: 'Pagado' },
    { key: 'status', header: 'Estado', type: 'status', statusDomain: 'treasury-payable' },
    { key: 'due_date', header: 'Vencimiento' },
  ];

  protected readonly payableActions: DataTableAction<Payable>[] = [
    { key: 'edit', label: 'Editar', icon: 'bi-pencil' },
    { key: 'delete', label: 'Eliminar', icon: 'bi-trash' },
  ];

  protected readonly transactionColumns: DataTableColumn<BankTransaction & { bank_account_name: string }>[] = [
    { key: 'type', header: 'Tipo', type: 'status', statusDomain: 'treasury-transaction-type' },
    { key: 'category', header: 'Categoría', type: 'status', statusDomain: 'treasury-transaction-category' },
    { key: 'amount', header: 'Monto' },
    { key: 'currency', header: 'Moneda' },
    { key: 'bank_account_name', header: 'Cuenta origen' },
    { key: 'transaction_date', header: 'Fecha' },
    { key: 'operation_number', header: 'N° operación' },
    { key: 'reconciliation_status', header: 'Conciliación', type: 'status', statusDomain: 'treasury-reconciliation' },
  ];

  protected readonly transactionActions: DataTableAction<BankTransaction>[] = [
    { key: 'reverse', label: 'Revertir', icon: 'bi-arrow-counterclockwise' },
  ];

  constructor() {
    this.accountForm = form(this.accountModel, (schema) => {
      required(schema.name, { message: 'El nombre de la cuenta es obligatorio.' });
      required(schema.bank_id, { message: 'El banco es obligatorio.' });
      required(schema.currency, { message: 'La moneda es obligatoria.' });
    });

    this.payableForm = form(this.payableModel, (schema) => {
      required(schema.document_type, { message: 'El tipo de documento es obligatorio.' });
      required(schema.entity_name, { message: 'La entidad es obligatoria.' });
      required(schema.gross_amount, { message: 'El monto bruto es obligatorio.' });
      required(schema.net_amount, { message: 'El monto neto es obligatorio.' });
    });

    this.transactionForm = form(this.transactionModel, (schema) => {
      required(schema.bank_account_id, { message: 'La cuenta origen es obligatoria.' });
      required(schema.type, { message: 'El tipo de movimiento es obligatorio.' });
      required(schema.category, { message: 'La categoría es obligatoria.' });
      required(schema.amount, { message: 'El monto es obligatorio.' });
      required(schema.currency, { message: 'La moneda es obligatoria.' });
      required(schema.exchange_rate, { message: 'El tipo de cambio es obligatorio.' });
      required(schema.transaction_date, { message: 'La fecha es obligatoria.' });
    });

    effect(() => {
      const originId = this.transactionModel().bank_account_id;
      const originCurrency = this.accounts().find((account) => account.id === originId)?.currency;
      if (originCurrency) {
        this.transactionModel.update((model) => ({ ...model, currency: originCurrency }));
      }
    });
  }

  // --- Helpers ---

  protected getAccountName(id: string): string {
    return this.accounts().find((account) => account.id === id)?.name ?? id;
  }

  protected isTransfer(): boolean {
    return this.transactionModel().type === 'TRANSFER';
  }

  protected isOutflow(): boolean {
    return this.transactionModel().type === 'OUTFLOW';
  }

  protected onTransactionTypeChange(): void {
    this.transactionModel.update((model) => ({
      ...model,
      destination_bank_account_id: '',
      payable_id: '',
      category: this.suggestCategory(model.type),
    }));
  }

  private suggestCategory(type: TransactionType | ''): TransactionCategory | '' {
    switch (type) {
      case 'INFLOW':
        return 'CUSTOMER_PAYMENT';
      case 'OUTFLOW':
        return 'SUPPLIER_PAYMENT';
      case 'TRANSFER':
        return 'INTERNAL_TRANSFER';
      default:
        return '';
    }
  }

  // --- Account handlers ---

  protected async onAccountSubmit(): Promise<void> {
    this.accountForm().markAsTouched();
    if (this.accountForm().invalid()) {
      toast.error('Completa los campos obligatorios de la cuenta');
      return;
    }

    const model = this.accountModel();
    const request: CreateBankAccountRequest = {
      bank_id: model.bank_id,
      name: model.name,
      account_number: model.account_number || undefined,
      cci: model.cci || undefined,
      currency: model.currency as TreasuryCurrency,
      real_balance: Number(model.real_balance || 0),
      is_active: model.is_active,
    };

    try {
      const editingId = this.editingAccountId();
      if (editingId) {
        await this.treasuryStore.updateBankAccount(editingId, request);
        toast.success('Cuenta actualizada');
      } else {
        await this.treasuryStore.createBankAccount(request);
        toast.success('Cuenta creada');
      }
      this.resetAccountForm();
      this.accountsResource.reload();
    } catch {
      toast.error(this.treasuryStore.status().error ?? 'Error al guardar la cuenta');
    }
  }

  protected onAccountAction(event: { action: string; row: BankAccount & { available_balance: number } }): void {
    if (event.action === 'edit') {
      const account = event.row;
      this.editingAccountId.set(account.id);
      this.accountModel.set({
        name: account.name,
        bank_id: account.bank_id ?? '',
        account_number: account.account_number ?? '',
        cci: account.cci ?? '',
        currency: account.currency,
        real_balance: String(account.real_balance),
        is_active: account.is_active,
      });
      return;
    }

    if (event.action === 'delete') {
      this.itemToDelete.set(event.row);
      this.accountDeleteDialog()?.open();
    }
  }

  protected async onConfirmAccountDelete(): Promise<void> {
    const account = this.itemToDelete() as BankAccount | null;
    if (!account) {
      return;
    }

    try {
      await this.treasuryStore.deleteBankAccount(account.id);
      toast.success('Cuenta eliminada');
      this.itemToDelete.set(null);
      this.accountsResource.reload();
    } catch {
      toast.error(this.treasuryStore.status().error ?? 'Error al eliminar la cuenta');
    }
  }

  protected resetAccountForm(): void {
    this.editingAccountId.set(null);
    this.accountForm().reset({ ...EMPTY_ACCOUNT });
  }

  // --- Payable handlers ---

  protected async onPayableSubmit(): Promise<void> {
    this.payableForm().markAsTouched();
    if (this.payableForm().invalid()) {
      toast.error('Completa los campos obligatorios de la obligación');
      return;
    }

    const model = this.payableModel();
    const request: CreatePayableRequest = {
      bank_account_id: model.bank_account_id || null,
      document_type: model.document_type as PayableDocumentType,
      document_number: model.document_number || undefined,
      entity_name: model.entity_name,
      gross_amount: Number(model.gross_amount || 0),
      retention_amount: Number(model.retention_amount || 0),
      net_amount: Number(model.net_amount || 0),
      due_date: model.due_date || undefined,
      notes: model.notes || undefined,
    };

    try {
      const editingId = this.editingPayableId();
      if (editingId) {
        await this.treasuryStore.updatePayable(editingId, request);
        toast.success('Obligación actualizada');
      } else {
        await this.treasuryStore.createPayable(request);
        toast.success('Obligación creada');
      }
      this.resetPayableForm();
      this.payablesResource.reload();
      this.accountsResource.reload();
    } catch {
      toast.error(this.treasuryStore.status().error ?? 'Error al guardar la obligación');
    }
  }

  protected onPayableAction(event: { action: string; row: Payable }): void {
    if (event.action === 'edit') {
      const payable = event.row;
      this.editingPayableId.set(payable.id);
      this.payableModel.set({
        bank_account_id: payable.bank_account_id ?? '',
        document_type: payable.document_type,
        document_number: payable.document_number ?? '',
        entity_name: payable.entity_name,
        gross_amount: String(payable.gross_amount),
        retention_amount: String(payable.retention_amount),
        net_amount: String(payable.net_amount),
        due_date: payable.due_date ? payable.due_date.split('T')[0] : '',
        notes: payable.notes ?? '',
      });
      return;
    }

    if (event.action === 'delete') {
      this.itemToDelete.set(event.row);
      this.payableDeleteDialog()?.open();
    }
  }

  protected async onConfirmPayableDelete(): Promise<void> {
    const payable = this.itemToDelete() as Payable | null;
    if (!payable) {
      return;
    }

    try {
      await this.treasuryStore.deletePayable(payable.id);
      toast.success('Obligación eliminada');
      this.itemToDelete.set(null);
      this.payablesResource.reload();
      this.accountsResource.reload();
    } catch {
      toast.error(this.treasuryStore.status().error ?? 'Error al eliminar la obligación');
    }
  }

  protected resetPayableForm(): void {
    this.editingPayableId.set(null);
    this.payableForm().reset({ ...EMPTY_PAYABLE });
  }

  // --- Transaction handlers ---

  protected async onTransactionSubmit(): Promise<void> {
    this.transactionForm().markAsTouched();
    if (this.transactionForm().invalid()) {
      toast.error('Completa los campos obligatorios del movimiento');
      return;
    }

    const model = this.transactionModel();
    const request: CreateBankTransactionRequest = {
      bank_account_id: model.bank_account_id,
      destination_bank_account_id: this.isTransfer() ? model.destination_bank_account_id || null : null,
      type: model.type as TransactionType,
      category: model.category as TransactionCategory,
      amount: Number(model.amount || 0),
      currency: model.currency as TreasuryCurrency,
      exchange_rate: Number(model.exchange_rate || 1),
      transaction_date: model.transaction_date,
      operation_number: model.operation_number || undefined,
      payable_id: this.isOutflow() ? model.payable_id || null : null,
      notes: model.notes || undefined,
    };

    try {
      await this.treasuryStore.createTransaction(request);
      toast.success('Movimiento creado');
      this.resetTransactionForm();
      this.transactionsResource.reload();
      this.accountsResource.reload();
      this.payablesResource.reload();
    } catch {
      toast.error(this.treasuryStore.status().error ?? 'Error al crear el movimiento');
    }
  }

  protected resetTransactionForm(): void {
    this.transactionModel.set({ ...EMPTY_TRANSACTION });
  }

  protected onTransactionAction(event: { action: string; row: BankTransaction & { bank_account_name: string } }): void {
    if (event.action === 'reverse') {
      this.transactionToReverse.set(event.row);
      this.transactionReverseDialog()?.open();
    }
  }

  protected async onConfirmTransactionReverse(): Promise<void> {
    const transaction = this.transactionToReverse();
    if (!transaction) {
      return;
    }

    try {
      await this.treasuryStore.reverseTransaction(transaction.id);
      toast.success('Movimiento revertido');
      this.transactionToReverse.set(null);
      this.transactionsResource.reload();
      this.accountsResource.reload();
      this.payablesResource.reload();
    } catch {
      toast.error(this.treasuryStore.status().error ?? 'Error al revertir el movimiento');
    }
  }
}
