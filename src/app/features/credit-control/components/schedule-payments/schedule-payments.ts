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
import { DecimalPipe } from '@angular/common';
import { form, FormField, required } from '@angular/forms/signals';
import { toast } from 'ngx-sonner';
import {
  FluentDropdown,
  FluentTextInput,
} from '../../../../shared/components/fluent-form-controls/fluent-form-controls';
import { StatusTag } from '../../../../shared/components/status-tag/status-tag';
import {
  CreditAccountSchedule,
  RecordPaymentRequest,
} from '../../../../core/models/credit-control.model';
import { CreditControlStore } from '../../store/credit-control.store';

interface Option {
  value: string;
  label: string;
}

interface PaymentFormModel {
  schedule_id: string;
  actual_payment_date: string;
  paid_amount: string;
}

const EMPTY_PAYMENT: PaymentFormModel = {
  schedule_id: '',
  actual_payment_date: new Date().toISOString().split('T')[0],
  paid_amount: '',
};

@Component({
  selector: 'app-schedule-payments',
  standalone: true,
  imports: [DecimalPipe, FormField, FluentTextInput, FluentDropdown, StatusTag],
  templateUrl: './schedule-payments.html',
  styleUrl: './schedule-payments.scss',
  encapsulation: ViewEncapsulation.None,
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
})
export default class SchedulePaymentsComponent {
  private readonly creditControlStore = inject(CreditControlStore);

  readonly schedules = input.required<CreditAccountSchedule[]>();
  readonly selectedScheduleId = input<string>('');

  readonly schedulesChanged = output<void>();

  protected readonly model = signal<PaymentFormModel>({ ...EMPTY_PAYMENT });
  protected readonly form;

  protected readonly scheduleOptions = computed<Option[]>(() => [
    { value: '', label: 'Selecciona un cronograma' },
    ...this.schedules().map((schedule) => ({
      value: schedule.id,
      label: `${schedule.receivable_id} — ${schedule.invoice_amount - schedule.paid_amount}`,
    })),
  ]);

  protected readonly selectedSchedule = computed<CreditAccountSchedule | null>(() => {
    const id = this.model().schedule_id;
    if (!id) {
      return null;
    }
    return this.schedules().find((schedule) => schedule.id === id) ?? null;
  });

  protected readonly remainingAmount = computed(() => {
    const schedule = this.selectedSchedule();
    if (!schedule) {
      return 0;
    }
    return Math.max(0, schedule.invoice_amount - schedule.paid_amount);
  });

  protected readonly saving = computed(() => this.creditControlStore.status().loading);

  constructor() {
    this.form = form(this.model, (schema) => {
      required(schema.schedule_id, { message: 'Selecciona un cronograma.' });
      required(schema.actual_payment_date, { message: 'La fecha de pago es obligatoria.' });
      required(schema.paid_amount, { message: 'El monto pagado es obligatorio.' });
    });

    effect(() => {
      const id = this.selectedScheduleId();
      if (id) {
        this.model.update((model) => ({ ...model, schedule_id: id }));
      }
    });
  }

  protected onScheduleChange(): void {
    this.model.update((model) => ({
      ...model,
      paid_amount: '',
    }));
  }

  protected async onSubmit(): Promise<void> {
    this.form().markAsTouched();
    if (this.form().invalid()) {
      toast.error('Completa los campos obligatorios del pago');
      return;
    }

    const model = this.model();
    const scheduleId = model.schedule_id;
    const request: RecordPaymentRequest = {
      actual_payment_date: model.actual_payment_date,
      paid_amount: Number(model.paid_amount || 0),
    };

    try {
      await this.creditControlStore.recordPayment(scheduleId, request);
      toast.success('Pago registrado');
      this.model.update((model) => ({
        ...EMPTY_PAYMENT,
        schedule_id: model.schedule_id,
      }));
      this.schedulesChanged.emit();
    } catch {
      toast.error(this.creditControlStore.status().error ?? 'Error al registrar el pago');
    }
  }
}
