import {
  Component,
  CUSTOM_ELEMENTS_SCHEMA,
  effect,
  input,
  output,
  signal,
  ViewEncapsulation,
} from '@angular/core';
import { form, FormField, required } from '@angular/forms/signals';
import {
  CostCenter,
  CostCenterStatus,
  CreateCostCenterRequest,
  UpdateCostCenterRequest,
} from '../../../../core/models/cost-centers.model';
import {
  FluentCheckbox,
  FluentDropdown,
  FluentTextInput,
} from '../../../../shared/components/fluent-form-controls/fluent-form-controls';

interface CostCenterFormModel {
  code: string;
  name: string;
  description: string;
  status: CostCenterStatus | '';
}

interface Option<T = string> {
  value: T;
  label: string;
}

const STATUS_OPTIONS: Option<CostCenterStatus>[] = [
  { value: 'active', label: 'Activo' },
  { value: 'inactive', label: 'Inactivo' },
];

const EMPTY_COST_CENTER: CostCenterFormModel = {
  code: '',
  name: '',
  description: '',
  status: 'active',
};

@Component({
  selector: 'app-cost-center-form',
  standalone: true,
  imports: [FormField, FluentTextInput, FluentDropdown],
  templateUrl: './cost-center-form.html',
  styleUrl: './cost-center-form.scss',
  encapsulation: ViewEncapsulation.None,
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
})
export default class CostCenterFormComponent {
  readonly costCenter = input<CostCenter | null>(null);
  readonly saved = output<{
    id: string | null;
    request: CreateCostCenterRequest | UpdateCostCenterRequest;
  }>();
  readonly cancelled = output<void>();

  protected readonly statusOptions = STATUS_OPTIONS;

  protected readonly model = signal<CostCenterFormModel>({ ...EMPTY_COST_CENTER });
  protected readonly form;

  constructor() {
    this.form = form(this.model, (schema) => {
      required(schema.code, { message: 'El código es obligatorio.' });
      required(schema.name, { message: 'El nombre es obligatorio.' });
      required(schema.status, { message: 'El estado es obligatorio.' });
    });

    effect(() => {
      const center = this.costCenter();
      if (!center) {
        this.form().reset({ ...EMPTY_COST_CENTER });
        return;
      }
      this.model.set({
        code: center.code,
        name: center.name,
        description: center.description ?? '',
        status: center.status,
      });
    });
  }

  protected isEditing(): boolean {
    return !!this.costCenter();
  }

  protected async onSubmit(): Promise<void> {
    this.form().markAsTouched();
    if (this.form().invalid()) {
      return;
    }

    const model = this.model();
    const editing = this.costCenter();

    const request: CreateCostCenterRequest | UpdateCostCenterRequest = {
      code: model.code,
      name: model.name,
      description: model.description || undefined,
      status: model.status as CostCenterStatus,
    };

    this.saved.emit({ id: editing?.id ?? null, request });
  }

  protected onCancel(): void {
    this.resetForm();
    this.cancelled.emit();
  }

  protected resetForm(): void {
    this.form().reset({ ...EMPTY_COST_CENTER });
  }
}
