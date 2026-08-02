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
  CreatePayrollRunRequest,
  PayrollRun,
  UpdatePayrollRunRequest,
} from '../../../../core/models/hr-payroll.model';
import { HrPayrollStore } from '../../store/hr-payroll.store';

interface PayrollRunFormModel {
  period_year: string;
  period_month: string;
}

const EMPTY_PAYROLL_RUN: PayrollRunFormModel = {
  period_year: String(new Date().getFullYear()),
  period_month: String(new Date().getMonth() + 1),
};

const MONTH_OPTIONS = [
  { value: '1', label: 'Enero' },
  { value: '2', label: 'Febrero' },
  { value: '3', label: 'Marzo' },
  { value: '4', label: 'Abril' },
  { value: '5', label: 'Mayo' },
  { value: '6', label: 'Junio' },
  { value: '7', label: 'Julio' },
  { value: '8', label: 'Agosto' },
  { value: '9', label: 'Septiembre' },
  { value: '10', label: 'Octubre' },
  { value: '11', label: 'Noviembre' },
  { value: '12', label: 'Diciembre' },
];

@Component({
  selector: 'app-payroll-run-form',
  standalone: true,
  imports: [FormField, FluentTextInput, FluentDropdown],
  templateUrl: './payroll-run-form.html',
  styleUrl: './payroll-run-form.scss',
  encapsulation: ViewEncapsulation.None,
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
})
export default class PayrollRunFormComponent {
  private readonly hrPayrollStore = inject(HrPayrollStore);

  readonly editingPayrollRun = input<PayrollRun | null>(null);

  readonly saved = output<void>();
  readonly cancelled = output<void>();

  protected readonly payrollRunModel = signal<PayrollRunFormModel>({ ...EMPTY_PAYROLL_RUN });
  protected payrollRunForm;

  protected readonly monthOptions = MONTH_OPTIONS;
  protected readonly saving = computed(() => this.hrPayrollStore.status().loading);
  protected readonly editingId = computed(() => this.editingPayrollRun()?.id ?? null);

  constructor() {
    this.payrollRunForm = form(this.payrollRunModel, (schema) => {
      required(schema.period_year, { message: 'El año es obligatorio.' });
      required(schema.period_month, { message: 'El mes es obligatorio.' });
    });

    effect(() => {
      const payrollRun = this.editingPayrollRun();
      if (!payrollRun) {
        this.payrollRunModel.set({ ...EMPTY_PAYROLL_RUN });
        return;
      }

      this.payrollRunModel.set({
        period_year: String(payrollRun.period_year),
        period_month: String(payrollRun.period_month),
      });
    });
  }

  protected async onSubmit(): Promise<void> {
    this.payrollRunForm().markAsTouched();
    if (this.payrollRunForm().invalid()) {
      toast.error('Completa los campos obligatorios de la planilla');
      return;
    }

    const model = this.payrollRunModel();
    const request: CreatePayrollRunRequest | UpdatePayrollRunRequest = {
      period_year: Number(model.period_year),
      period_month: Number(model.period_month),
    };

    try {
      const editingId = this.editingId();
      if (editingId) {
        await this.hrPayrollStore.updatePayrollRun(editingId, request);
        toast.success('Planilla actualizada');
      } else {
        await this.hrPayrollStore.createPayrollRun(request as CreatePayrollRunRequest);
        toast.success('Planilla creada');
      }
      this.saved.emit();
      this.payrollRunModel.set({ ...EMPTY_PAYROLL_RUN });
    } catch {
      toast.error(this.hrPayrollStore.status().error ?? 'Error al guardar la planilla');
    }
  }

  protected onCancel(): void {
    this.cancelled.emit();
    this.payrollRunModel.set({ ...EMPTY_PAYROLL_RUN });
  }
}
