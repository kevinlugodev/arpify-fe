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
  FluentCheckbox,
  FluentDropdown,
  FluentTextInput,
} from '../../../../shared/components/fluent-form-controls/fluent-form-controls';
import {
  CreateEmployeeCompensationRequest,
  EmployeeCompensation,
  HrPayrollCurrency,
  LaborRegime,
  PayrollPensionSystem,
  UpdateEmployeeCompensationRequest,
} from '../../../../core/models/hr-payroll.model';
import { HrPayrollStore } from '../../store/hr-payroll.store';
import { TeamMember } from '../../../../core/models/team.model';

interface Option<T = string> {
  value: T;
  label: string;
}

interface CompensationFormModel {
  employee_id: string;
  base_salary: string;
  currency: HrPayrollCurrency | '';
  labor_regime: LaborRegime | '';
  pension_system: PayrollPensionSystem | '';
  cuspp_number: string;
  has_medical_insurance: boolean;
  bank_account_number: string;
  bank_cci: string;
  bank_name: string;
  effective_start_date: string;
  effective_end_date: string;
}

const CURRENCY_OPTIONS: Option<HrPayrollCurrency>[] = [
  { value: 'PEN', label: 'Soles (PEN)' },
  { value: 'USD', label: 'Dólares (USD)' },
];

const LABOR_REGIME_OPTIONS: Option<LaborRegime>[] = [
  { value: 'GENERAL', label: 'Régimen General' },
  { value: 'MYPE_SMALL', label: 'MYPE Pequeña empresa' },
  { value: 'MYPE_MICRO', label: 'MYPE Microempresa' },
  { value: 'INTERN', label: 'Practicante' },
];

const PENSION_SYSTEM_OPTIONS: Option<PayrollPensionSystem>[] = [
  { value: 'ONP', label: 'ONP (13%)' },
  { value: 'AFP_INTEGRA', label: 'AFP Integra (10%)' },
  { value: 'AFP_PRIMA', label: 'AFP Prima (10%)' },
  { value: 'AFP_PROFUTURO', label: 'AFP Profuturo (10%)' },
  { value: 'AFP_HABITAT', label: 'AFP Habitat (10%)' },
];

const EMPTY_COMPENSATION: CompensationFormModel = {
  employee_id: '',
  base_salary: '',
  currency: 'PEN',
  labor_regime: 'GENERAL',
  pension_system: 'AFP_PRIMA',
  cuspp_number: '',
  has_medical_insurance: true,
  bank_account_number: '',
  bank_cci: '',
  bank_name: '',
  effective_start_date: '',
  effective_end_date: '',
};

@Component({
  selector: 'app-compensation-form',
  standalone: true,
  imports: [FormField, FluentTextInput, FluentDropdown, FluentCheckbox],
  templateUrl: './compensation-form.html',
  styleUrl: './compensation-form.scss',
  encapsulation: ViewEncapsulation.None,
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
})
export default class CompensationFormComponent {
  private readonly hrPayrollStore = inject(HrPayrollStore);

  readonly employeesOptions = input.required<Option<string>[]>();
  readonly editingCompensation = input<EmployeeCompensation | null>(null);

  readonly saved = output<void>();
  readonly cancelled = output<void>();

  protected readonly compensationModel = signal<CompensationFormModel>({ ...EMPTY_COMPENSATION });
  protected compensationForm;

  protected readonly currencyOptions = CURRENCY_OPTIONS;
  protected readonly laborRegimeOptions = LABOR_REGIME_OPTIONS;
  protected readonly pensionSystemOptions = PENSION_SYSTEM_OPTIONS;

  protected readonly saving = computed(() => this.hrPayrollStore.status().loading);
  protected readonly editingId = computed(() => this.editingCompensation()?.id ?? null);

  constructor() {
    this.compensationForm = form(this.compensationModel, (schema) => {
      required(schema.employee_id, { message: 'El colaborador es obligatorio.' });
      required(schema.base_salary, { message: 'El salario base es obligatorio.' });
      required(schema.currency, { message: 'La moneda es obligatoria.' });
      required(schema.labor_regime, { message: 'El régimen laboral es obligatorio.' });
      required(schema.pension_system, { message: 'El sistema de pensión es obligatorio.' });
      required(schema.effective_start_date, { message: 'La fecha de inicio de vigencia es obligatoria.' });
    });

    effect(() => {
      const compensation = this.editingCompensation();
      if (!compensation) {
        this.compensationModel.set({ ...EMPTY_COMPENSATION });
        return;
      }

      this.compensationModel.set({
        employee_id: compensation.employee_id,
        base_salary: String(compensation.base_salary),
        currency: compensation.currency,
        labor_regime: compensation.labor_regime,
        pension_system: compensation.pension_system,
        cuspp_number: compensation.cuspp_number ?? '',
        has_medical_insurance: compensation.has_medical_insurance ?? true,
        bank_account_number: compensation.bank_account_number ?? '',
        bank_cci: compensation.bank_cci ?? '',
        bank_name: compensation.bank_name ?? '',
        effective_start_date: compensation.effective_start_date
          ? compensation.effective_start_date.split('T')[0]
          : '',
        effective_end_date: compensation.effective_end_date
          ? compensation.effective_end_date.split('T')[0]
          : '',
      });
    });
  }

  protected async onSubmit(): Promise<void> {
    this.compensationForm().markAsTouched();
    if (this.compensationForm().invalid()) {
      toast.error('Completa los campos obligatorios de la compensación');
      return;
    }

    const model = this.compensationModel();
    const request: CreateEmployeeCompensationRequest | UpdateEmployeeCompensationRequest = {
      employee_id: model.employee_id,
      base_salary: Number(model.base_salary || 0),
      currency: model.currency as HrPayrollCurrency,
      labor_regime: model.labor_regime as LaborRegime,
      pension_system: model.pension_system as PayrollPensionSystem,
      cuspp_number: model.cuspp_number || undefined,
      has_medical_insurance: model.has_medical_insurance,
      bank_account_number: model.bank_account_number || undefined,
      bank_cci: model.bank_cci || undefined,
      bank_name: model.bank_name || undefined,
      effective_start_date: model.effective_start_date,
      effective_end_date: model.effective_end_date || null,
    };

    try {
      const editingId = this.editingId();
      if (editingId) {
        await this.hrPayrollStore.updateCompensation(editingId, request);
        toast.success('Compensación actualizada');
      } else {
        await this.hrPayrollStore.createCompensation(request as CreateEmployeeCompensationRequest);
        toast.success('Compensación creada');
      }
      this.saved.emit();
      this.compensationForm().reset({ ...EMPTY_COMPENSATION });
    } catch {
      toast.error(this.hrPayrollStore.status().error ?? 'Error al guardar la compensación');
    }
  }

  protected onCancel(): void {
    this.cancelled.emit();
    this.compensationForm().reset({ ...EMPTY_COMPENSATION });
  }
}
