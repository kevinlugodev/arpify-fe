import { DecimalPipe } from '@angular/common';
import {
  Component,
  computed,
  CUSTOM_ELEMENTS_SCHEMA,
  effect,
  inject,
  input,
  output,
  signal,
  viewChild,
  ViewEncapsulation,
} from '@angular/core';
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
  CreateExpenseClaimItemRequest,
  ExpenseClaim,
  ExpenseClaimCategory,
  ExpenseClaimDocumentType,
  ExpenseClaimItem,
  SettleExpenseClaimRequest,
  UpdateExpenseClaimItemRequest,
} from '../../../../core/models/expense-claims.model';
import { BankAccount, PettyCashFund } from '../../../../core/models/treasury.model';
import { ExpenseClaimsService } from '../../services/expense-claims';
import { ExpenseClaimsStore } from '../../store/expense-claims.store';
import { toApiPromise } from '../../../../core/utils/api-response';
import { apiResourceWithRequest } from '../../../../core/utils/resource-helpers';

interface Option<T = string> {
  value: T;
  label: string;
}

interface ItemFormModel {
  document_type: ExpenseClaimDocumentType | '';
  document_number: string;
  supplier_name: string;
  supplier_tax_id: string;
  expense_date: string;
  amount: string;
  currency: string;
  category: ExpenseClaimCategory | '';
}

interface SettleFormModel {
  bank_account_id: string;
  petty_cash_fund_id: string;
}

const DOCUMENT_TYPE_OPTIONS: Option<ExpenseClaimDocumentType>[] = [
  { value: 'INVOICE', label: 'Factura' },
  { value: 'BOLETA', label: 'Boleta' },
  { value: 'RECEIPT', label: 'Recibo' },
  { value: 'TICKET', label: 'Ticket' },
];

const CATEGORY_OPTIONS: Option<ExpenseClaimCategory>[] = [
  { value: 'TRAVEL', label: 'Viaje' },
  { value: 'MEALS', label: 'Alimentación' },
  { value: 'SUPPLIES', label: 'Suministros' },
  { value: 'TRANSPORT', label: 'Transporte' },
  { value: 'OTHER', label: 'Otro' },
];

const CURRENCY_OPTIONS: Option<string>[] = [
  { value: 'PEN', label: 'Soles (PEN)' },
  { value: 'USD', label: 'Dólares (USD)' },
];

const EMPTY_ITEM: ItemFormModel = {
  document_type: '',
  document_number: '',
  supplier_name: '',
  supplier_tax_id: '',
  expense_date: new Date().toISOString().split('T')[0],
  amount: '',
  currency: 'PEN',
  category: '',
};

const EMPTY_SETTLE: SettleFormModel = {
  bank_account_id: '',
  petty_cash_fund_id: '',
};

@Component({
  selector: 'app-claim-items',
  standalone: true,
  imports: [
    DataTable,
    DecimalPipe,
    EmptyState,
    InfoTip,
    ConfirmDialog,
    FormField,
    FluentTextInput,
    FluentDropdown,
  ],
  templateUrl: './claim-items.html',
  styleUrl: './claim-items.scss',
  encapsulation: ViewEncapsulation.None,
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
})
export default class ClaimItemsComponent {
  private readonly expenseClaimsService = inject(ExpenseClaimsService);
  private readonly expenseClaimsStore = inject(ExpenseClaimsStore);

  readonly claim = input<ExpenseClaim | null>(null);
  readonly accounts = input.required<BankAccount[]>();
  readonly funds = input.required<PettyCashFund[]>();

  readonly saved = output<void>();

  protected readonly documentTypeOptions = DOCUMENT_TYPE_OPTIONS;
  protected readonly categoryOptions = CATEGORY_OPTIONS;
  protected readonly currencyOptions = CURRENCY_OPTIONS;

  protected readonly itemModel = signal<ItemFormModel>({ ...EMPTY_ITEM });
  protected readonly itemForm;
  protected readonly editingItemId = signal<string | null>(null);

  protected readonly settleModel = signal<SettleFormModel>({ ...EMPTY_SETTLE });
  protected readonly settleForm;

  private readonly itemDeleteDialog = viewChild<ConfirmDialog>('itemDeleteDialog');
  protected readonly itemToDelete = signal<ExpenseClaimItem | null>(null);

  private readonly itemsResource = apiResourceWithRequest<ExpenseClaimItem[], string | null>(
    () => this.claim()?.id ?? null,
    async ({ params }) => {
      if (!params) {
        return [];
      }
      try {
        const response = await toApiPromise(this.expenseClaimsService.getExpenseClaimItems(params, { limit: 100 }));
        return response.items;
      } catch {
        toast.error('Error al cargar comprobantes');
        return [];
      }
    }
  );

  protected readonly items = computed<ExpenseClaimItem[]>(() => this.itemsResource.value() ?? []);
  protected readonly itemsLoading = computed(() => this.itemsResource.isLoading());
  protected readonly saving = computed(() => this.expenseClaimsStore.status().loading);

  protected readonly canEditItems = computed(() => this.claim()?.status === 'DRAFT');
  protected readonly canSettle = computed(() => this.claim()?.status === 'APPROVED');

  protected readonly balanceAmount = computed(() => this.claim()?.balance_amount ?? 0);
  protected readonly balanceLabel = computed(() => {
    const balance = this.balanceAmount();
    if (balance > 0) {
      return `La empresa debe al colaborador: ${balance.toFixed(2)}`;
    }
    if (balance < 0) {
      return `El colaborador debe devolver: ${Math.abs(balance).toFixed(2)}`;
    }
    return 'La rendición está cuadrada.';
  });

  protected readonly bankAccountOptions = computed<Option<string>[]>(() =>
    this.accounts().map((account) => ({
      value: account.id,
      label: `${account.name} (${account.currency})`,
    }))
  );

  protected readonly fundOptions = computed<Option<string>[]>(() =>
    this.funds().map((fund) => ({
      value: fund.id,
      label: `${fund.name} (${fund.currency})`,
    }))
  );

  protected readonly itemColumns: DataTableColumn<ExpenseClaimItem>[] = [
    { key: 'document_type', header: 'Tipo', type: 'status', statusDomain: 'expense-claim-document' },
    { key: 'document_number', header: 'Número' },
    { key: 'supplier_name', header: 'Proveedor' },
    { key: 'expense_date', header: 'Fecha', type: 'date' },
    { key: 'amount', header: 'Monto' },
    { key: 'currency', header: 'Mon' },
    { key: 'category', header: 'Categoría', type: 'status', statusDomain: 'expense-claim-category' },
  ];

  protected readonly itemActions: DataTableAction<ExpenseClaimItem>[] = [
    { key: 'edit', label: 'Editar', icon: 'bi-pencil' },
    { key: 'delete', label: 'Eliminar', icon: 'bi-trash' },
  ];

  constructor() {
    this.itemForm = form(this.itemModel, (schema) => {
      required(schema.document_type, { message: 'El tipo de documento es obligatorio.' });
      required(schema.document_number, { message: 'El número de documento es obligatorio.' });
      required(schema.supplier_name, { message: 'El proveedor es obligatorio.' });
      required(schema.expense_date, { message: 'La fecha es obligatoria.' });
      required(schema.amount, { message: 'El monto es obligatorio.' });
      required(schema.currency, { message: 'La moneda es obligatoria.' });
      required(schema.category, { message: 'La categoría es obligatoria.' });
    });

    this.settleForm = form(this.settleModel, (schema) => {
      const balance = this.balanceAmount();
      if (balance > 0) {
        required(schema.bank_account_id, { message: 'La cuenta bancaria es obligatoria para liquidar.' });
      }
      if (balance < 0) {
        required(schema.petty_cash_fund_id, { message: 'La caja chica es obligatoria para liquidar.' });
      }
    });

    effect(() => {
      const claim = this.claim();
      if (!claim) {
        this.editingItemId.set(null);
        this.itemModel.set({ ...EMPTY_ITEM });
        this.settleModel.set({ ...EMPTY_SETTLE });
      }
    });
  }

  protected async onItemSubmit(): Promise<void> {
    if (!this.canEditItems()) {
      toast.error('Solo se pueden agregar comprobantes en estado Borrador');
      return;
    }

    this.itemForm().markAsTouched();
    if (this.itemForm().invalid()) {
      toast.error('Completa los campos obligatorios del comprobante');
      return;
    }

    const claim = this.claim();
    if (!claim) {
      return;
    }

    const model = this.itemModel();
    const request: CreateExpenseClaimItemRequest = {
      document_type: model.document_type as ExpenseClaimDocumentType,
      document_number: model.document_number,
      supplier_name: model.supplier_name,
      supplier_tax_id: model.supplier_tax_id || undefined,
      expense_date: model.expense_date,
      amount: Number(model.amount || 0),
      currency: model.currency,
      category: model.category as ExpenseClaimCategory,
    };

    try {
      const editingId = this.editingItemId();
      if (editingId) {
        const updateRequest: UpdateExpenseClaimItemRequest = { ...request };
        await this.expenseClaimsStore.updateExpenseClaimItem(claim.id, editingId, updateRequest);
        toast.success('Comprobante actualizado');
      } else {
        await this.expenseClaimsStore.createExpenseClaimItem(claim.id, request);
        toast.success('Comprobante agregado');
      }
      this.resetItemForm();
      this.itemsResource.reload();
      this.saved.emit();
    } catch {
      toast.error(this.expenseClaimsStore.status().error ?? 'Error al guardar el comprobante');
    }
  }

  protected onItemAction(event: { action: string; row: ExpenseClaimItem }): void {
    if (!this.canEditItems()) {
      toast.error('Solo se pueden editar comprobantes en estado Borrador');
      return;
    }

    if (event.action === 'edit') {
      const item = event.row;
      this.editingItemId.set(item.id);
      this.itemModel.set({
        document_type: item.document_type,
        document_number: item.document_number,
        supplier_name: item.supplier_name,
        supplier_tax_id: item.supplier_tax_id ?? '',
        expense_date: item.expense_date,
        amount: String(item.amount),
        currency: item.currency,
        category: item.category,
      });
      return;
    }

    if (event.action === 'delete') {
      this.itemToDelete.set(event.row);
      this.itemDeleteDialog()?.open();
    }
  }

  protected async onConfirmItemDelete(): Promise<void> {
    const claim = this.claim();
    const item = this.itemToDelete();
    if (!claim || !item) {
      return;
    }

    try {
      await this.expenseClaimsStore.deleteExpenseClaimItem(claim.id, item.id);
      toast.success('Comprobante eliminado');
      this.itemToDelete.set(null);
      this.itemsResource.reload();
      this.saved.emit();
    } catch {
      toast.error(this.expenseClaimsStore.status().error ?? 'Error al eliminar el comprobante');
    }
  }

  protected resetItemForm(): void {
    this.editingItemId.set(null);
    this.itemForm().reset({ ...EMPTY_ITEM });
  }

  protected async onSettle(): Promise<void> {
    const claim = this.claim();
    if (!claim) {
      return;
    }

    this.settleForm().markAsTouched();
    if (this.settleForm().invalid()) {
      toast.error('Completa la cuenta requerida para liquidar');
      return;
    }

    const model = this.settleModel();
    const balance = this.balanceAmount();
    const request: SettleExpenseClaimRequest = {
      ...(balance > 0 ? { bank_account_id: model.bank_account_id } : {}),
      ...(balance < 0 ? { petty_cash_fund_id: model.petty_cash_fund_id } : {}),
    };

    try {
      await this.expenseClaimsStore.settleExpenseClaim(claim.id, request);
      toast.success('Rendición liquidada');
      this.settleForm().reset({ ...EMPTY_SETTLE });
      this.itemsResource.reload();
      this.saved.emit();
    } catch {
      toast.error(this.expenseClaimsStore.status().error ?? 'Error al liquidar la rendición');
    }
  }
}
