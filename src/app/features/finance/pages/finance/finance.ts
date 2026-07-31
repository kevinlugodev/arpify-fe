import { Component, computed, CUSTOM_ELEMENTS_SCHEMA, effect, inject, signal, ViewEncapsulation } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { form, FormField, required } from '@angular/forms/signals';
import { toast } from 'ngx-sonner';
import DataTable, { DataTableAction, DataTableColumn } from '../../../../shared/components/data-table/data-table';
import EmptyState from '../../../../shared/components/empty-state/empty-state';
import InfoTip from '../../../../shared/components/info-tip/info-tip';
import PageHeader from '../../../../shared/components/page-header/page-header';
import SearchField from '../../../../shared/components/search-field/search-field';
import StatCard from '../../../../shared/components/stat-card/stat-card';
import {
  FluentCheckbox,
  FluentDropdown,
  FluentTextInput,
} from '../../../../shared/components/fluent-form-controls/fluent-form-controls';
import {
  CreateInvoiceRequest,
  CreateTaxPeriodRequest,
  CreateTaxProfileRequest,
  Invoice,
  InvoiceFlow,
  InvoiceListFilters,
  InvoiceType,
  TaxCalculation,
  TaxPeriod,
  TaxPeriodStatus,
  TaxProfile,
  TaxRegime,
  UpdateTaxProfileRequest,
} from '../../../../core/models/finance.model';
import { FinanceService } from '../../../finance/services/finance';
import { FinanceStore } from '../../../finance/store/finance.store';
import { toApiPromise } from '../../../../core/utils/api-response';
import { apiResource, apiResourceWithRequest } from '../../../../core/utils/resource-helpers';

type FinanceTab = 'profile' | 'periods' | 'invoices' | 'calculation';

interface ProfileFormModel {
  legal_name: string;
  commercial_name: string;
  ruc: string;
  tax_regime: TaxRegime;
  address: string;
  phone: string;
  mobile: string;
  main_activity_code: string;
  main_activity_name: string;
  is_good_taxpayer: boolean;
  is_withholding_agent: boolean;
  activity_start_date: string;
}

interface PeriodFormModel {
  year: string;
  month: string;
  status: TaxPeriodStatus;
  due_date: string;
}

interface InvoiceFormModel {
  tax_period_id: string;
  flow: InvoiceFlow;
  document_type: InvoiceType;
  serie: string;
  number: string;
  issue_date: string;
  due_date: string;
  counterparty_ruc: string;
  counterparty_name: string;
  taxable_amount: string;
  tax_amount: string;
  total_amount: string;
  currency: string;
  exchange_rate: string;
  sunat_status: string;
}

const TAX_REGIMES: { value: TaxRegime; label: string }[] = [
  { value: 'general', label: 'Régimen General' },
  { value: 'mype_tributario', label: 'MYPE Tributario' },
  { value: 'rer', label: 'RER' },
  { value: 'regimen_especial', label: 'Régimen Especial' },
];

const CURRENCIES: { value: string; label: string }[] = [
  { value: 'PEN', label: 'Soles (PEN)' },
  { value: 'USD', label: 'Dólares (USD)' },
  { value: 'EUR', label: 'Euros (EUR)' },
];

const SUNAT_STATUSES: { value: string; label: string }[] = [
  { value: 'ACCEPTED', label: 'Aceptado' },
  { value: 'REJECTED', label: 'Rechazado' },
  { value: 'PENDING', label: 'Pendiente' },
  { value: 'VOIDED', label: 'Anulado' },
];

const INVOICE_TYPES: { value: InvoiceType; label: string }[] = [
  { value: '01', label: '01 - Factura' },
  { value: '03', label: '03 - Boleta' },
  { value: '07', label: '07 - Nota de Crédito' },
  { value: '08', label: '08 - Nota de Débito' },
  { value: '09', label: '09 - Guía de Remisión' },
  { value: '12', label: '12 - Ticket' },
  { value: '40', label: '40 - Documento No Domiciliado' },
];

const EMPTY_PROFILE: ProfileFormModel = {
  legal_name: '',
  commercial_name: '',
  ruc: '',
  tax_regime: 'general',
  address: '',
  phone: '',
  mobile: '',
  main_activity_code: '',
  main_activity_name: '',
  is_good_taxpayer: false,
  is_withholding_agent: false,
  activity_start_date: '',
};

const EMPTY_PERIOD: PeriodFormModel = {
  year: String(new Date().getFullYear()),
  month: String(new Date().getMonth() + 1),
  status: 'draft',
  due_date: '',
};

const EMPTY_INVOICE: InvoiceFormModel = {
  tax_period_id: '',
  flow: 'sale',
  document_type: '01',
  serie: '',
  number: '',
  issue_date: new Date().toISOString().split('T')[0],
  due_date: '',
  counterparty_ruc: '',
  counterparty_name: '',
  taxable_amount: '',
  tax_amount: '',
  total_amount: '',
  currency: 'PEN',
  exchange_rate: '1',
  sunat_status: 'ACCEPTED',
};

@Component({
  selector: 'app-finance',
  imports: [
    FormsModule,
    PageHeader,
    InfoTip,
    StatCard,
    SearchField,
    DataTable,
    EmptyState,
    FormField,
    FluentTextInput,
    FluentDropdown,
    FluentCheckbox,
    DecimalPipe,
  ],
  templateUrl: './finance.html',
  styleUrl: './finance.scss',
  encapsulation: ViewEncapsulation.None,
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
})
export default class FinancePage {
  private readonly financeService = inject(FinanceService);
  private readonly financeStore = inject(FinanceStore);

  protected readonly activeTab = signal<FinanceTab>('profile');
  protected readonly selectedPeriodId = signal<string>('');
  protected readonly invoiceFlowFilter = signal<string>('');
  protected readonly invoiceTypeFilter = signal<string>('');
  protected readonly invoiceSearchInput = signal('');
  protected readonly invoiceSearch = signal('');

  protected readonly saving = computed(() => this.financeStore.status().loading);

  protected readonly TAX_REGIMES = TAX_REGIMES;
  protected readonly CURRENCIES = CURRENCIES;
  protected readonly SUNAT_STATUSES = SUNAT_STATUSES;
  protected readonly INVOICE_TYPES = INVOICE_TYPES;

  // --- Profile form ---

  protected readonly profileModel = signal<ProfileFormModel>({ ...EMPTY_PROFILE });
  protected readonly profileForm;

  // --- Period form ---

  protected readonly periodModel = signal<PeriodFormModel>({ ...EMPTY_PERIOD });
  protected readonly periodForm;

  // --- Invoice form ---

  protected readonly invoiceModel = signal<InvoiceFormModel>({ ...EMPTY_INVOICE });
  protected readonly invoiceForm;

  // --- Resources ---

  private readonly taxProfileResource = apiResource<TaxProfile | null>(async () => {
    try {
      const response = await toApiPromise(this.financeService.getTaxProfile());
      return response.tax_profile;
    } catch {
      return null;
    }
  });

  private readonly taxPeriodsResource = apiResource<TaxPeriod[]>(async () => {
    try {
      const response = await toApiPromise(this.financeService.getTaxPeriods({ limit: 100 }));
      return response.items;
    } catch {
      toast.error('Error al cargar periodos tributarios');
      return [];
    }
  });

  private readonly invoicesResource = apiResourceWithRequest<Invoice[], InvoiceListFilters>(
    () => {
      const filters: InvoiceListFilters = { limit: 100 };
      const periodId = this.selectedPeriodId();
      if (periodId) {
        filters.tax_period_id = periodId;
      }
      const flow = this.invoiceFlowFilter();
      if (flow) {
        filters.flow = flow as InvoiceFlow;
      }
      const type = this.invoiceTypeFilter();
      if (type) {
        filters.document_type = type as InvoiceType;
      }
      const search = this.invoiceSearch().trim();
      if (search) {
        filters.counterparty_ruc = search;
      }
      return filters;
    },
    async ({ params }) => {
      try {
        const response = await toApiPromise(this.financeService.getInvoices(params));
        return response.items;
      } catch {
        toast.error('Error al cargar facturas');
        return [];
      }
    }
  );

  private readonly taxCalculationResource = apiResourceWithRequest<TaxCalculation | null, string>(
    () => this.selectedPeriodId(),
    async ({ params }) => {
      if (!params) {
        return null;
      }
      try {
        const response = await toApiPromise(this.financeService.getTaxCalculation(params));
        return response.tax_calculation;
      } catch {
        return null;
      }
    }
  );

  // --- Computed ---

  protected readonly taxProfile = computed<TaxProfile | null>(() => this.taxProfileResource.value() ?? null);
  protected readonly profileLoading = computed(() => this.taxProfileResource.isLoading());

  protected readonly taxPeriods = computed<TaxPeriod[]>(() => this.taxPeriodsResource.value() ?? []);
  protected readonly periodsLoading = computed(() => this.taxPeriodsResource.isLoading());

  protected readonly invoices = computed<Invoice[]>(() => this.invoicesResource.value() ?? []);
  protected readonly invoicesLoading = computed(() => this.invoicesResource.isLoading());

  protected readonly taxCalculation = computed<TaxCalculation | null>(() => this.taxCalculationResource.value() ?? null);
  protected readonly calculationLoading = computed(() => this.taxCalculationResource.isLoading());

  protected readonly hasProfile = computed(() => !!this.taxProfile());
  protected readonly totalInvoices = computed(() => this.invoices().length);
  protected readonly totalToPay = computed(() => this.taxCalculation()?.total_to_pay ?? 0);

  protected readonly periodColumns: DataTableColumn<TaxPeriod>[] = [
    { key: 'year', header: 'Año' },
    { key: 'month', header: 'Mes' },
    { key: 'status', header: 'Estado', type: 'status', statusDomain: 'finance-period' },
    { key: 'due_date', header: 'Vencimiento' },
  ];

  protected readonly periodActions: DataTableAction<TaxPeriod>[] = [
    { key: 'select', label: 'Seleccionar', icon: 'bi-check-circle' },
    { key: 'close', label: 'Cerrar', icon: 'bi-lock' },
  ];

  protected readonly invoiceColumns: DataTableColumn<Invoice>[] = [
    { key: 'serie', header: 'Serie' },
    { key: 'number', header: 'Número' },
    { key: 'flow', header: 'Flujo' },
    { key: 'document_type', header: 'Tipo' },
    { key: 'issue_date', header: 'Emisión' },
    { key: 'total_amount', header: 'Total' },
    { key: 'currency', header: 'Mon' },
  ];

  protected readonly invoiceActions: DataTableAction<Invoice>[] = [
    { key: 'delete', label: 'Eliminar', icon: 'bi-trash' },
  ];

  constructor() {
    this.profileForm = form(this.profileModel, (schema) => {
      required(schema.legal_name, { message: 'La razón social es obligatoria.' });
      required(schema.ruc, { message: 'El RUC es obligatorio.' });
      required(schema.tax_regime, { message: 'El régimen es obligatorio.' });
    });

    this.periodForm = form(this.periodModel, (schema) => {
      required(schema.year, { message: 'El año es obligatorio.' });
      required(schema.month, { message: 'El mes es obligatorio.' });
      required(schema.status, { message: 'El estado es obligatorio.' });
    });

    this.invoiceForm = form(this.invoiceModel, (schema) => {
      required(schema.tax_period_id, { message: 'Selecciona un periodo tributario.' });
      required(schema.flow, { message: 'El flujo es obligatorio.' });
      required(schema.document_type, { message: 'El tipo de documento es obligatorio.' });
      required(schema.serie, { message: 'La serie es obligatoria.' });
      required(schema.number, { message: 'El número es obligatorio.' });
      required(schema.issue_date, { message: 'La fecha de emisión es obligatoria.' });
      required(schema.total_amount, { message: 'El total es obligatorio.' });
      required(schema.currency, { message: 'La moneda es obligatoria.' });
      required(schema.exchange_rate, { message: 'El tipo de cambio es obligatorio.' });
    });

    effect(() => {
      const profile = this.taxProfile();
      if (!profile) {
        this.profileModel.set({ ...EMPTY_PROFILE });
        return;
      }
      this.profileModel.set({
        legal_name: profile.legal_name,
        commercial_name: profile.commercial_name ?? '',
        ruc: profile.ruc,
        tax_regime: profile.tax_regime,
        address: profile.address ?? '',
        phone: profile.phone ?? '',
        mobile: profile.mobile ?? '',
        main_activity_code: profile.main_activity_code ?? '',
        main_activity_name: profile.main_activity_name ?? '',
        is_good_taxpayer: profile.is_good_taxpayer,
        is_withholding_agent: profile.is_withholding_agent,
        activity_start_date: profile.activity_start_date ?? '',
      });
    });

    effect(() => {
      const periods = this.taxPeriods();
      if (periods.length > 0 && !this.selectedPeriodId()) {
        this.selectedPeriodId.set(periods[0].id);
      }
    });

    let searchTimeout: ReturnType<typeof setTimeout>;
    effect(() => {
      const value = this.invoiceSearchInput();
      clearTimeout(searchTimeout);
      searchTimeout = setTimeout(() => {
        this.invoiceSearch.set(value);
      }, 400);
    });

    effect(() => {
      const periodId = this.selectedPeriodId();
      if (periodId) {
        this.invoiceModel.update((model) => ({ ...model, tax_period_id: periodId }));
      }
    });
  }

  // --- Helpers ---

  protected getPeriodLabel(period: TaxPeriod): string {
    return `${period.year}-${String(period.month).padStart(2, '0')}`;
  }

  protected getPeriodOptions(): TaxPeriod[] {
    return this.taxPeriods();
  }

  // --- Profile handlers ---

  protected async onSaveProfile(): Promise<void> {
    this.profileForm().markAsTouched();
    if (this.profileForm().invalid()) {
      toast.error('Completa los campos obligatorios del perfil');
      return;
    }

    const model = this.profileModel();
    const request: CreateTaxProfileRequest | UpdateTaxProfileRequest = {
      legal_name: model.legal_name,
      commercial_name: model.commercial_name || undefined,
      ruc: model.ruc,
      tax_regime: model.tax_regime,
      address: model.address || undefined,
      phone: model.phone || undefined,
      mobile: model.mobile || undefined,
      main_activity_code: model.main_activity_code || undefined,
      main_activity_name: model.main_activity_name || undefined,
      is_good_taxpayer: model.is_good_taxpayer,
      is_withholding_agent: model.is_withholding_agent,
      activity_start_date: model.activity_start_date || undefined,
    };

    try {
      await this.financeStore.updateTaxProfile(request);
      toast.success('Perfil tributario guardado');
      this.taxProfileResource.reload();
    } catch {
      toast.error(this.financeStore.status().error ?? 'Error al guardar el perfil');
    }
  }

  // --- Period handlers ---

  protected async onCreatePeriod(): Promise<void> {
    this.periodForm().markAsTouched();
    if (this.periodForm().invalid()) {
      toast.error('Completa los campos obligatorios del periodo');
      return;
    }

    const model = this.periodModel();
    const request: CreateTaxPeriodRequest = {
      year: Number(model.year),
      month: Number(model.month),
      status: model.status,
      due_date: model.due_date || null,
    };

    try {
      const created = await this.financeStore.createTaxPeriod(request);
      toast.success('Periodo creado');
      this.periodModel.set({ ...EMPTY_PERIOD });
      this.taxPeriodsResource.reload();
      this.selectedPeriodId.set(created.id);
    } catch {
      toast.error(this.financeStore.status().error ?? 'Error al crear el periodo');
    }
  }

  protected onPeriodAction(event: { action: string; row: TaxPeriod }): void {
    if (event.action === 'select') {
      this.selectedPeriodId.set(event.row.id);
      this.activeTab.set('invoices');
      return;
    }
    if (event.action === 'close') {
      void this.closePeriod(event.row.id);
    }
  }

  private async closePeriod(id: string): Promise<void> {
    try {
      await this.financeStore.closeTaxPeriod(id);
      toast.success('Periodo cerrado');
      this.taxPeriodsResource.reload();
    } catch {
      toast.error(this.financeStore.status().error ?? 'Error al cerrar el periodo');
    }
  }

  // --- Invoice handlers ---

  protected async onCreateInvoice(): Promise<void> {
    this.invoiceForm().markAsTouched();
    if (this.invoiceForm().invalid()) {
      toast.error('Completa los campos obligatorios de la factura');
      return;
    }

    const model = this.invoiceModel();
    const isSale = model.flow === 'sale';
    const request: CreateInvoiceRequest = {
      tax_period_id: model.tax_period_id,
      flow: model.flow,
      document_type: model.document_type,
      serie: model.serie,
      number: model.number,
      issue_date: model.issue_date,
      due_date: model.due_date || null,
      customer_ruc: isSale ? model.counterparty_ruc : undefined,
      customer_name: isSale ? model.counterparty_name : undefined,
      supplier_ruc: !isSale ? model.counterparty_ruc : undefined,
      supplier_name: !isSale ? model.counterparty_name : undefined,
      taxable_amount: Number(model.taxable_amount || 0),
      tax_amount: Number(model.tax_amount || 0),
      total_amount: Number(model.total_amount || 0),
      currency: model.currency,
      exchange_rate: Number(model.exchange_rate || 1),
      sunat_status: model.sunat_status,
    };

    try {
      await this.financeStore.createInvoice(request);
      toast.success('Factura creada');
      this.invoiceModel.set({ ...EMPTY_INVOICE, tax_period_id: model.tax_period_id });
      this.invoicesResource.reload();
      this.taxCalculationResource.reload();
    } catch {
      toast.error(this.financeStore.status().error ?? 'Error al crear la factura');
    }
  }

  protected async onInvoiceAction(event: { action: string; row: Invoice }): Promise<void> {
    if (event.action === 'delete') {
      try {
        await this.financeStore.deleteInvoice(event.row.id);
        toast.success('Factura eliminada');
        this.invoicesResource.reload();
        this.taxCalculationResource.reload();
      } catch {
        toast.error(this.financeStore.status().error ?? 'Error al eliminar la factura');
      }
    }
  }

  // --- Calculation handlers ---

  protected async onCalculate(): Promise<void> {
    const periodId = this.selectedPeriodId();
    if (!periodId) {
      toast.error('Selecciona un periodo tributario');
      return;
    }
    try {
      await this.financeStore.calculateTax(periodId);
      toast.success('Liquidación calculada');
      this.taxCalculationResource.reload();
    } catch {
      toast.error(this.financeStore.status().error ?? 'Error al calcular');
    }
  }

  protected async onRecalculate(): Promise<void> {
    const periodId = this.selectedPeriodId();
    if (!periodId) {
      toast.error('Selecciona un periodo tributario');
      return;
    }
    try {
      await this.financeStore.recalculateTax(periodId);
      toast.success('Liquidación recalculada');
      this.taxCalculationResource.reload();
    } catch {
      toast.error(this.financeStore.status().error ?? 'Error al recalcular');
    }
  }
}
