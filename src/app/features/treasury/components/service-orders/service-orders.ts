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
import WorkflowTip from '../../../../shared/components/workflow-tip/workflow-tip';
import InfoTip from '../../../../shared/components/info-tip/info-tip';
import { ConfirmDialog } from '../../../../shared/components/confirm-dialog/confirm-dialog';
import {
  FluentCheckbox,
  FluentDropdown,
  FluentTextInput,
} from '../../../../shared/components/fluent-form-controls/fluent-form-controls';
import {
  BankAccount,
  CreateServiceOrderAdvanceRequest,
  CreateServiceOrderRequest,
  LinkServiceOrderPayableRequest,
  Payable,
  ServiceOrder,
  ServiceOrderStatus,
  TreasuryCurrency,
  UpdateServiceOrderRequest,
} from '../../../../core/models/treasury.model';
import { TreasuryService } from '../../services/treasury';
import { TreasuryStore } from '../../store/treasury.store';
import { toApiPromise } from '../../../../core/utils/api-response';
import { apiResource } from '../../../../core/utils/resource-helpers';

type OperationType = 'advance' | 'link' | null;

interface Option<T = string> {
  value: T;
  label: string;
}

interface ServiceOrderFormModel {
  supplier_name: string;
  supplier_ruc: string;
  description: string;
  total_amount: string;
  status: ServiceOrderStatus;
}

interface AdvanceFormModel {
  bank_account_id: string;
  amount: string;
  currency: TreasuryCurrency;
  transaction_date: string;
  operation_number: string;
  notes: string;
}

interface LinkPayableFormModel {
  payable_id: string;
}

const CURRENCY_OPTIONS: Option<TreasuryCurrency>[] = [
  { value: 'PEN', label: 'Soles (PEN)' },
  { value: 'USD', label: 'Dólares (USD)' },
];

const SERVICE_ORDER_STATUS_OPTIONS: Option<ServiceOrderStatus>[] = [
  { value: 'DRAFT', label: 'Borrador' },
  { value: 'APPROVED', label: 'Aprobada' },
  { value: 'IN_PROGRESS', label: 'En progreso' },
  { value: 'COMPLETED', label: 'Completada' },
  { value: 'CANCELLED', label: 'Cancelada' },
];

const EMPTY_SERVICE_ORDER: ServiceOrderFormModel = {
  supplier_name: '',
  supplier_ruc: '',
  description: '',
  total_amount: '',
  status: 'DRAFT',
};

const EMPTY_ADVANCE: AdvanceFormModel = {
  bank_account_id: '',
  amount: '',
  currency: 'PEN',
  transaction_date: new Date().toISOString().split('T')[0],
  operation_number: '',
  notes: '',
};

const EMPTY_LINK_PAYABLE: LinkPayableFormModel = {
  payable_id: '',
};

@Component({
  selector: 'app-service-orders',
  standalone: true,
  imports: [
    DecimalPipe,
    DataTable,
    EmptyState,
    WorkflowTip,
    InfoTip,
    FormField,
    FluentTextInput,
    FluentDropdown,
    ConfirmDialog,
  ],
  templateUrl: './service-orders.html',
  styleUrl: './service-orders.scss',
  encapsulation: ViewEncapsulation.None,
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
})
export default class ServiceOrdersComponent {
  private readonly treasuryService = inject(TreasuryService);
  private readonly treasuryStore = inject(TreasuryStore);

  readonly accounts = input.required<BankAccount[]>();
  readonly payables = input.required<Payable[]>();

  // --- Form models ---

  protected readonly serviceOrderModel = signal<ServiceOrderFormModel>({ ...EMPTY_SERVICE_ORDER });
  protected serviceOrderForm;
  protected readonly editingServiceOrderId = signal<string | null>(null);

  protected readonly advanceModel = signal<AdvanceFormModel>({ ...EMPTY_ADVANCE });
  protected advanceForm;

  protected readonly linkPayableModel = signal<LinkPayableFormModel>({ ...EMPTY_LINK_PAYABLE });
  protected linkPayableForm;

  // --- Operation state ---

  protected readonly activeServiceOrderId = signal<string | null>(null);
  protected readonly activeOperation = signal<OperationType>(null);

  // --- Confirm dialog ---

  private readonly deleteDialog = viewChild<ConfirmDialog>('deleteDialog');
  protected readonly itemToDelete = signal<ServiceOrder | null>(null);

  // --- Options ---

  protected readonly currencyOptions = CURRENCY_OPTIONS;
  protected readonly serviceOrderStatusOptions = SERVICE_ORDER_STATUS_OPTIONS;

  // --- Resource ---

  private readonly serviceOrdersResource = apiResource<ServiceOrder[]>(async () => {
    try {
      const response = await toApiPromise(this.treasuryService.getServiceOrders({ limit: 100 }));
      return response.items;
    } catch {
      toast.error('Error al cargar órdenes de servicio');
      return [];
    }
  });

  // --- Computed ---

  protected readonly serviceOrders = computed<ServiceOrder[]>(() => this.serviceOrdersResource.value() ?? []);
  protected readonly serviceOrdersLoading = computed(() => this.serviceOrdersResource.isLoading());

  protected readonly saving = computed(() => this.treasuryStore.status().loading);

  protected readonly accountOptions = computed<Option<string>[]>(() => [
    { value: '', label: 'Selecciona una cuenta' },
    ...this.accounts()
      .filter((account) => account.is_active)
      .map((account) => ({
        value: account.id,
        label: `${account.name} (${account.currency})`,
      })),
  ]);

  protected readonly payableOptions = computed<Option<string>[]>(() => [
    { value: '', label: 'Selecciona una obligación' },
    ...this.payables()
      .filter((payable) => payable.status === 'PENDING' || payable.status === 'PARTIALLY_PAID')
      .map((payable) => ({
        value: payable.id,
        label: `${payable.entity_name} — ${payable.net_amount}`,
      })),
  ]);

  protected readonly activeServiceOrder = computed<ServiceOrder | undefined>(() =>
    this.serviceOrders().find((order) => order.id === this.activeServiceOrderId())
  );

  protected readonly advanceRemaining = computed<number>(() => {
    const order = this.activeServiceOrder();
    if (!order) {
      return 0;
    }
    return Math.max(0, order.total_amount - order.advance_amount_paid);
  });

  protected readonly editingRowClass = (row: ServiceOrder) =>
    row.id === this.editingServiceOrderId() ? 'service-orders__row--editing' : '';

  // --- Columns ---

  protected readonly columns: DataTableColumn<ServiceOrder>[] = [
    { key: 'supplier_name', header: 'Proveedor' },
    { key: 'description', header: 'Descripción' },
    { key: 'total_amount', header: 'Monto total' },
    { key: 'advance_amount_paid', header: 'Anticipo pagado' },
    { key: 'advance_amount_applied', header: 'Anticipo aplicado' },
    { key: 'status', header: 'Estado', type: 'status', statusDomain: 'treasury-service-order' },
  ];

  protected readonly actions: DataTableAction<ServiceOrder>[] = [
    { key: 'edit', label: 'Editar', icon: 'bi-pencil' },
    { key: 'advance', label: 'Anticipo', icon: 'bi-cash-coin' },
    { key: 'link', label: 'Vincular', icon: 'bi-link' },
    { key: 'delete', label: 'Eliminar', icon: 'bi-trash' },
  ];

  constructor() {
    this.serviceOrderForm = form(this.serviceOrderModel, (schema) => {
      required(schema.supplier_name, { message: 'El proveedor es obligatorio.' });
      required(schema.description, { message: 'La descripción es obligatoria.' });
      required(schema.total_amount, { message: 'El monto total es obligatorio.' });
      required(schema.status, { message: 'El estado es obligatorio.' });
    });

    this.advanceForm = form(this.advanceModel, (schema) => {
      required(schema.bank_account_id, { message: 'La cuenta bancaria es obligatoria.' });
      required(schema.amount, { message: 'El monto del anticipo es obligatorio.' });
      required(schema.currency, { message: 'La moneda es obligatoria.' });
      required(schema.transaction_date, { message: 'La fecha es obligatoria.' });
    });

    this.linkPayableForm = form(this.linkPayableModel, (schema) => {
      required(schema.payable_id, { message: 'La obligación es obligatoria.' });
    });

    effect(() => {
      const accountId = this.advanceModel().bank_account_id;
      const account = this.accounts().find((item) => item.id === accountId);
      if (account) {
        this.advanceModel.update((model) => ({ ...model, currency: account.currency }));
      }
    });
  }

  // --- Service order handlers ---

  protected async onServiceOrderSubmit(): Promise<void> {
    this.serviceOrderForm().markAsTouched();
    if (this.serviceOrderForm().invalid()) {
      toast.error('Completa los campos obligatorios de la orden');
      return;
    }

    const model = this.serviceOrderModel();
    const request: CreateServiceOrderRequest = {
      supplier_name: model.supplier_name,
      supplier_ruc: model.supplier_ruc || null,
      description: model.description,
      total_amount: Number(model.total_amount || 0),
      status: model.status,
    };

    try {
      const editingId = this.editingServiceOrderId();
      if (editingId) {
        await this.treasuryStore.updateServiceOrder(editingId, request as UpdateServiceOrderRequest);
        toast.success('Orden de servicio actualizada');
      } else {
        await this.treasuryStore.createServiceOrder(request);
        toast.success('Orden de servicio creada');
      }
      this.resetServiceOrderForm();
      this.serviceOrdersResource.reload();
    } catch {
      toast.error(this.treasuryStore.status().error ?? 'Error al guardar la orden de servicio');
    }
  }

  protected onServiceOrderAction(event: { action: string; row: ServiceOrder }): void {
    const order = event.row;

    if (event.action === 'edit') {
      this.editingServiceOrderId.set(order.id);
      this.serviceOrderModel.set({
        supplier_name: order.supplier_name,
        supplier_ruc: order.supplier_ruc ?? '',
        description: order.description,
        total_amount: String(order.total_amount),
        status: order.status,
      });
      this.clearActiveOperation();
      return;
    }

    if (event.action === 'advance') {
      this.activeServiceOrderId.set(order.id);
      this.activeOperation.set('advance');
      this.advanceModel.set({ ...EMPTY_ADVANCE });
      return;
    }

    if (event.action === 'link') {
      this.activeServiceOrderId.set(order.id);
      this.activeOperation.set('link');
      this.linkPayableModel.set({ ...EMPTY_LINK_PAYABLE });
      return;
    }

    if (event.action === 'delete') {
      this.itemToDelete.set(order);
      this.deleteDialog()?.open();
    }
  }

  protected async onConfirmDelete(): Promise<void> {
    const order = this.itemToDelete();
    if (!order) {
      return;
    }

    try {
      await this.treasuryStore.deleteServiceOrder(order.id);
      toast.success('Orden de servicio eliminada');
      this.itemToDelete.set(null);
      this.serviceOrdersResource.reload();
    } catch {
      toast.error(this.treasuryStore.status().error ?? 'Error al eliminar la orden de servicio');
    }
  }

  protected resetServiceOrderForm(): void {
    this.editingServiceOrderId.set(null);
    this.serviceOrderForm().reset({ ...EMPTY_SERVICE_ORDER });
  }

  // --- Advance handlers ---

  protected async onAdvanceSubmit(): Promise<void> {
    this.advanceForm().markAsTouched();
    if (this.advanceForm().invalid()) {
      toast.error('Completa los campos obligatorios del anticipo');
      return;
    }

    const orderId = this.activeServiceOrderId();
    if (!orderId) {
      return;
    }

    const model = this.advanceModel();
    const request: CreateServiceOrderAdvanceRequest = {
      bank_account_id: model.bank_account_id,
      amount: Number(model.amount || 0),
      currency: model.currency,
      transaction_date: model.transaction_date,
      operation_number: model.operation_number || undefined,
      notes: model.notes || undefined,
    };

    try {
      await this.treasuryStore.createServiceOrderAdvance(orderId, request);
      toast.success('Anticipo registrado');
      this.advanceModel.set({ ...EMPTY_ADVANCE });
      this.clearActiveOperation();
      this.serviceOrdersResource.reload();
    } catch {
      toast.error(this.treasuryStore.status().error ?? 'Error al registrar el anticipo');
    }
  }

  // --- Link payable handlers ---

  protected async onLinkPayableSubmit(): Promise<void> {
    this.linkPayableForm().markAsTouched();
    if (this.linkPayableForm().invalid()) {
      toast.error('Selecciona una obligación para vincular');
      return;
    }

    const orderId = this.activeServiceOrderId();
    if (!orderId) {
      return;
    }

    const request: LinkServiceOrderPayableRequest = {
      payable_id: this.linkPayableModel().payable_id,
    };

    try {
      await this.treasuryStore.linkServiceOrderPayable(orderId, request);
      toast.success('Obligación vinculada');
      this.linkPayableModel.set({ ...EMPTY_LINK_PAYABLE });
      this.clearActiveOperation();
      this.serviceOrdersResource.reload();
    } catch {
      toast.error(this.treasuryStore.status().error ?? 'Error al vincular la obligación');
    }
  }

  protected clearActiveOperation(): void {
    this.activeServiceOrderId.set(null);
    this.activeOperation.set(null);
    this.advanceModel.set({ ...EMPTY_ADVANCE });
    this.linkPayableModel.set({ ...EMPTY_LINK_PAYABLE });
  }
}
