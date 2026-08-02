import {
  Component,
  computed,
  CUSTOM_ELEMENTS_SCHEMA,
  effect,
  inject,
  input,
  output,
  signal,
  ViewEncapsulation,
} from '@angular/core';
import { form, FormField, required } from '@angular/forms/signals';
import { toast } from 'ngx-sonner';
import {
  FluentDropdown,
  FluentTextInput,
} from '../../../../shared/components/fluent-form-controls/fluent-form-controls';
import {
  CreateCreditScheduleRequest,
  CreditAccountSchedule,
  UpdateCreditScheduleRequest,
} from '../../../../core/models/credit-control.model';
import { Customer } from '../../../../core/models/clients.model';
import { Invoice } from '../../../../core/models/finance.model';
import { CreditControlStore } from '../../store/credit-control.store';

interface Option<T = string> {
  value: T;
  label: string;
}

interface ScheduleFormModel {
  receivable_id: string;
  customer_id: string;
  original_due_date: string;
  invoice_amount: string;
}

const EMPTY_SCHEDULE: ScheduleFormModel = {
  receivable_id: '',
  customer_id: '',
  original_due_date: '',
  invoice_amount: '',
};

@Component({
  selector: 'app-schedule-form',
  standalone: true,
  imports: [FormField, FluentTextInput, FluentDropdown],
  templateUrl: './schedule-form.html',
  styleUrl: './schedule-form.scss',
  encapsulation: ViewEncapsulation.None,
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
})
export default class ScheduleFormComponent {
  private readonly creditControlStore = inject(CreditControlStore);

  readonly customers = input.required<Customer[]>();
  readonly invoices = input.required<Invoice[]>();
  readonly schedule = input<CreditAccountSchedule | null>(null);

  readonly saved = output<void>();
  readonly cancelled = output<void>();

  protected readonly model = signal<ScheduleFormModel>({ ...EMPTY_SCHEDULE });
  protected readonly form;

  protected readonly customerOptions = computed<Option<string>[]>(() => [
    { value: '', label: 'Selecciona un cliente' },
    ...this.customers().map((customer) => ({
      value: customer.id,
      label: `${customer.legal_name}${customer.tax_id ? ` (${customer.tax_id})` : ''}`,
    })),
  ]);

  protected readonly invoiceOptions = computed<Option<string>[]>(() => [
    { value: '', label: 'Selecciona una factura' },
    ...this.invoices()
      .filter((invoice) => invoice.flow === 'sale')
      .map((invoice) => ({
        value: invoice.id,
        label: `${invoice.serie}-${invoice.number} — ${invoice.customer_name}`,
      })),
  ]);

  protected readonly isEditing = computed(() => !!this.schedule());
  protected readonly saving = computed(() => this.creditControlStore.status().loading);

  constructor() {
    this.form = form(this.model, (schema) => {
      required(schema.receivable_id, { message: 'La factura es obligatoria.' });
      required(schema.original_due_date, { message: 'La fecha de vencimiento es obligatoria.' });
      required(schema.invoice_amount, { message: 'El monto es obligatorio.' });
    });

    effect(() => {
      const schedule = this.schedule();
      if (!schedule) {
        this.model.set({ ...EMPTY_SCHEDULE });
        return;
      }

      this.model.set({
        receivable_id: schedule.receivable_id,
        customer_id: schedule.customer_id ?? '',
        original_due_date: schedule.original_due_date.split('T')[0],
        invoice_amount: String(schedule.invoice_amount),
      });
    });
  }

  protected async onSubmit(): Promise<void> {
    this.form().markAsTouched();
    if (this.form().invalid()) {
      toast.error('Completa los campos obligatorios del cronograma');
      return;
    }

    const model = this.model();
    const request: CreateCreditScheduleRequest = {
      receivable_id: model.receivable_id,
      customer_id: model.customer_id || null,
      original_due_date: model.original_due_date,
      invoice_amount: Number(model.invoice_amount || 0),
    };

    try {
      const editingSchedule = this.schedule();
      if (editingSchedule) {
        await this.creditControlStore.updateSchedule(editingSchedule.id, request as UpdateCreditScheduleRequest);
        toast.success('Cronograma actualizado');
      } else {
        await this.creditControlStore.createSchedule(request);
        toast.success('Cronograma creado');
      }
      this.saved.emit();
      this.model.set({ ...EMPTY_SCHEDULE });
    } catch {
      toast.error(this.creditControlStore.status().error ?? 'Error al guardar el cronograma');
    }
  }

  protected onCancel(): void {
    this.model.set({ ...EMPTY_SCHEDULE });
    this.cancelled.emit();
  }
}
