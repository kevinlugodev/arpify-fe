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
import { ActivatedRoute, Router } from '@angular/router';
import { form, FormField, required } from '@angular/forms/signals';
import { toast } from 'ngx-sonner';
import InfoTip from '../../../../shared/components/info-tip/info-tip';
import PageHeader from '../../../../shared/components/page-header/page-header';
import { ConfirmDialog } from '../../../../shared/components/confirm-dialog/confirm-dialog';
import {
  FluentDropdown,
  FluentTextInput,
} from '../../../../shared/components/fluent-form-controls/fluent-form-controls';
import {
  CreateCustomerRequest,
  Customer,
  CustomerStatus,
  UpdateCustomerRequest,
} from '../../../../core/models/clients.model';
import { ClientsService } from '../../services/clients';
import { ClientsStore } from '../../store/clients.store';
import { toApiPromise } from '../../../../core/utils/api-response';
import { apiResourceWithRequest } from '../../../../core/utils/resource-helpers';

interface CustomerFormModel {
  tax_id: string;
  legal_name: string;
  trade_name: string;
  business_sector: string;
  email: string;
  phone: string;
  website_url: string;
  key_contact_name: string;
  key_contact_role: string;
  key_contact_email: string;
  key_contact_phone: string;
  billing_address: string;
  city: string;
  state_province: string;
  postal_code: string;
  country_code: string;
  default_currency: string;
  payment_terms_days: string;
  credit_limit: string;
  status: CustomerStatus;
  notes: string;
}

interface Option<T = string> {
  value: T;
  label: string;
}

const COUNTRY_OPTIONS: Option<string>[] = [
  { value: 'PE', label: 'Perú' },
  { value: 'US', label: 'Estados Unidos' },
  { value: 'MX', label: 'México' },
  { value: 'CO', label: 'Colombia' },
  { value: 'CL', label: 'Chile' },
  { value: 'AR', label: 'Argentina' },
  { value: 'ES', label: 'España' },
];

const CURRENCY_OPTIONS: Option<string>[] = [
  { value: 'PEN', label: 'Soles (PEN)' },
  { value: 'USD', label: 'Dólares (USD)' },
  { value: 'EUR', label: 'Euros (EUR)' },
];

const STATUS_OPTIONS: Option<CustomerStatus>[] = [
  { value: 'active', label: 'Activo' },
  { value: 'inactive', label: 'Inactivo' },
  { value: 'lead', label: 'Prospecto' },
  { value: 'suspended', label: 'Suspendido' },
];

const EMPTY_CUSTOMER: CustomerFormModel = {
  tax_id: '',
  legal_name: '',
  trade_name: '',
  business_sector: '',
  email: '',
  phone: '',
  website_url: '',
  key_contact_name: '',
  key_contact_role: '',
  key_contact_email: '',
  key_contact_phone: '',
  billing_address: '',
  city: '',
  state_province: '',
  postal_code: '',
  country_code: 'PE',
  default_currency: 'PEN',
  payment_terms_days: '',
  credit_limit: '',
  status: 'active',
  notes: '',
};

@Component({
  selector: 'app-client-form',
  imports: [
    PageHeader,
    InfoTip,
    FormField,
    FluentTextInput,
    FluentDropdown,
    ConfirmDialog,
  ],
  templateUrl: './client-form.html',
  styleUrl: './client-form.scss',
  encapsulation: ViewEncapsulation.None,
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
})
export default class ClientForm {
  private readonly clientsService = inject(ClientsService);
  private readonly clientsStore = inject(ClientsStore);
  private readonly route = inject(ActivatedRoute);
  protected readonly router = inject(Router);

  protected readonly customerId = signal<string>(this.route.snapshot.paramMap.get('id') ?? 'new');
  protected readonly customerModel = signal<CustomerFormModel>({ ...EMPTY_CUSTOMER });

  protected readonly clientForm;
  private readonly saveConfirmDialog = viewChild<ConfirmDialog>('saveConfirmDialog');

  protected readonly countryOptions = COUNTRY_OPTIONS;
  protected readonly currencyOptions = CURRENCY_OPTIONS;
  protected readonly statusOptions = STATUS_OPTIONS;

  /** Recurso reactivo que carga el cliente cuando se edita uno existente. */
  private readonly customerResource = apiResourceWithRequest<Customer | null, string>(
    () => this.customerId(),
    async ({ params }) => {
      if (!params || params === 'new') {
        return null;
      }
      try {
        const response = await toApiPromise(this.clientsService.getCustomer(params));
        return response.customer;
      } catch {
        toast.error('Error al cargar cliente');
        return null;
      }
    }
  );

  protected readonly loading = computed(() => this.customerResource.isLoading());
  protected readonly saving = computed(() => this.clientsStore.status().loading);
  protected readonly isEditMode = computed(() => {
    const id = this.customerId();
    return !!id && id !== 'new';
  });

  constructor() {
    this.clientForm = form(this.customerModel, (schema) => {
      required(schema.tax_id, { message: 'El RUC / Tax ID es obligatorio.' });
      required(schema.legal_name, { message: 'La razón social es obligatoria.' });
      required(schema.country_code, { message: 'El país es obligatorio.' });
      required(schema.default_currency, { message: 'La moneda por defecto es obligatoria.' });
    });

    effect(() => {
      const data = this.customerResource.value();
      if (!data) {
        this.customerModel.set({ ...EMPTY_CUSTOMER });
        return;
      }
      this.customerModel.set({
        tax_id: data.tax_id,
        legal_name: data.legal_name,
        trade_name: data.trade_name ?? '',
        business_sector: data.business_sector ?? '',
        email: data.email ?? '',
        phone: data.phone ?? '',
        website_url: data.website_url ?? '',
        key_contact_name: data.key_contact_name ?? '',
        key_contact_role: data.key_contact_role ?? '',
        key_contact_email: data.key_contact_email ?? '',
        key_contact_phone: data.key_contact_phone ?? '',
        billing_address: data.billing_address ?? '',
        city: data.city ?? '',
        state_province: data.state_province ?? '',
        postal_code: data.postal_code ?? '',
        country_code: data.country_code,
        default_currency: data.default_currency,
        payment_terms_days: data.payment_terms_days ? String(data.payment_terms_days) : '',
        credit_limit: data.credit_limit ? String(data.credit_limit) : '',
        status: data.status,
        notes: data.notes ?? '',
      });
    });
  }

  protected onCancel(): void {
    void this.router.navigate(['/clients']);
  }

  /**
   * Permite enviar el formulario al presionar ENTER sin recargar la página.
   */
  protected handleEnter(event: Event): void {
    event.preventDefault();
    this.openConfirm();
  }

  protected openConfirm(): void {
    this.clientForm().markAsTouched();

    if (this.clientForm().invalid()) {
      toast.error('Completa los campos obligatorios');
      return;
    }

    this.saveConfirmDialog()?.open();
  }

  protected async onSave(): Promise<void> {
    this.clientForm().markAsTouched();

    if (this.clientForm().invalid()) {
      toast.error('Completa los campos obligatorios');
      return;
    }

    const id = this.customerId();
    const model = this.customerModel();

    try {
      if (id && id !== 'new') {
        const update: UpdateCustomerRequest = {
          tax_id: model.tax_id,
          legal_name: model.legal_name,
          trade_name: model.trade_name || undefined,
          business_sector: model.business_sector || undefined,
          email: model.email || undefined,
          phone: model.phone || undefined,
          website_url: model.website_url || undefined,
          key_contact_name: model.key_contact_name || undefined,
          key_contact_role: model.key_contact_role || undefined,
          key_contact_email: model.key_contact_email || undefined,
          key_contact_phone: model.key_contact_phone || undefined,
          billing_address: model.billing_address || undefined,
          city: model.city || undefined,
          state_province: model.state_province || undefined,
          postal_code: model.postal_code || undefined,
          country_code: model.country_code,
          default_currency: model.default_currency,
          payment_terms_days: model.payment_terms_days ? Number(model.payment_terms_days) : undefined,
          credit_limit: model.credit_limit ? Number(model.credit_limit) : undefined,
          status: model.status,
          notes: model.notes || undefined,
        };
        await this.clientsStore.updateCustomer(id, update);
        toast.success('Cliente actualizado');
      } else {
        const create: CreateCustomerRequest = {
          tax_id: model.tax_id,
          legal_name: model.legal_name,
          trade_name: model.trade_name || undefined,
          business_sector: model.business_sector || undefined,
          email: model.email || undefined,
          phone: model.phone || undefined,
          website_url: model.website_url || undefined,
          key_contact_name: model.key_contact_name || undefined,
          key_contact_role: model.key_contact_role || undefined,
          key_contact_email: model.key_contact_email || undefined,
          key_contact_phone: model.key_contact_phone || undefined,
          billing_address: model.billing_address || undefined,
          city: model.city || undefined,
          state_province: model.state_province || undefined,
          postal_code: model.postal_code || undefined,
          country_code: model.country_code,
          default_currency: model.default_currency,
          payment_terms_days: model.payment_terms_days ? Number(model.payment_terms_days) : undefined,
          credit_limit: model.credit_limit ? Number(model.credit_limit) : undefined,
          status: model.status,
          notes: model.notes || undefined,
        };
        await this.clientsStore.createCustomer(create);
        toast.success('Cliente creado');
      }
      this.clientForm().reset({ ...EMPTY_CUSTOMER });
      await this.router.navigate(['/clients']);
    } catch {
      toast.error(this.clientsStore.status().error ?? 'Error al guardar el cliente');
    }
  }
}
