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
  AssetCategory,
  AssetStatus,
  CreateFixedAssetRequest,
  FixedAsset,
  UpdateFixedAssetRequest,
} from '../../../../core/models/fixed-assets.model';
import { TeamMember } from '../../../../core/models/team.model';
import { FixedAssetsStore } from '../../store/fixed-assets.store';

interface AssetFormModel {
  asset_code: string;
  name: string;
  category: AssetCategory | '';
  purchase_date: string;
  purchase_cost: string;
  residual_value: string;
  useful_life_months: string;
  assigned_employee_id: string;
  status: AssetStatus;
}

interface Option<T = string> {
  value: T;
  label: string;
}

const CATEGORY_OPTIONS: Option<AssetCategory>[] = [
  { value: 'IT_EQUIPMENT', label: 'Equipos TI' },
  { value: 'FURNITURE', label: 'Muebles' },
  { value: 'VEHICLES', label: 'Vehículos' },
  { value: 'MACHINERY', label: 'Maquinaria' },
  { value: 'OTHER', label: 'Otro' },
];

const STATUS_OPTIONS: Option<AssetStatus>[] = [
  { value: 'ACTIVE', label: 'Activo' },
  { value: 'FULLY_DEPRECIATED', label: 'Depreciado' },
  { value: 'DISPOSED', label: 'Dado de baja' },
];

const EMPTY_ASSET: AssetFormModel = {
  asset_code: '',
  name: '',
  category: '',
  purchase_date: '',
  purchase_cost: '',
  residual_value: '',
  useful_life_months: '',
  assigned_employee_id: '',
  status: 'ACTIVE',
};

@Component({
  selector: 'app-asset-form',
  standalone: true,
  imports: [FluentTextInput, FluentDropdown, FormField],
  templateUrl: './asset-form.html',
  styleUrl: './asset-form.scss',
  encapsulation: ViewEncapsulation.None,
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
})
export default class AssetFormComponent {
  private readonly fixedAssetsStore = inject(FixedAssetsStore);

  readonly assetToEdit = input<FixedAsset | null>(null);
  readonly employees = input<TeamMember[]>([]);

  readonly saved = output<void>();
  readonly cancel = output<void>();

  protected readonly categoryOptions = CATEGORY_OPTIONS;
  protected readonly statusOptions = STATUS_OPTIONS;

  protected readonly model = signal<AssetFormModel>({ ...EMPTY_ASSET });
  protected readonly form;

  protected readonly saving = computed(() => this.fixedAssetsStore.status().loading);

  protected readonly employeeOptions = computed<Option<string>[]>(() => [
    { value: '', label: 'Sin asignar' },
    ...this.employees().map((employee) => ({
      value: employee.id,
      label: `${employee.first_name} ${employee.last_name}`,
    })),
  ]);

  protected readonly isEditing = computed(() => !!this.assetToEdit());

  constructor() {
    this.form = form(this.model, (schema) => {
      required(schema.asset_code, { message: 'El código del activo es obligatorio.' });
      required(schema.name, { message: 'El nombre del activo es obligatorio.' });
      required(schema.category, { message: 'La categoría es obligatoria.' });
      required(schema.purchase_date, { message: 'La fecha de compra es obligatoria.' });
      required(schema.purchase_cost, { message: 'El costo de compra es obligatorio.' });
      required(schema.residual_value, { message: 'El valor residual es obligatorio.' });
      required(schema.useful_life_months, { message: 'La vida útil es obligatoria.' });
      required(schema.status, { message: 'El estado es obligatorio.' });
    });

    effect(() => {
      const asset = this.assetToEdit();
      if (!asset) {
        this.model.set({ ...EMPTY_ASSET });
        return;
      }
      this.model.set({
        asset_code: asset.asset_code,
        name: asset.name,
        category: asset.category,
        purchase_date: asset.purchase_date.split('T')[0],
        purchase_cost: String(asset.purchase_cost),
        residual_value: String(asset.residual_value),
        useful_life_months: String(asset.useful_life_months),
        assigned_employee_id: asset.assigned_employee_id ?? '',
        status: asset.status,
      });
    });
  }

  protected async onSubmit(): Promise<void> {
    this.form().markAsTouched();
    if (this.form().invalid()) {
      toast.error('Completa los campos obligatorios del activo');
      return;
    }

    const model = this.model();
    const purchaseCost = Number(model.purchase_cost || 0);
    const residualValue = Number(model.residual_value || 0);
    const usefulLife = Number(model.useful_life_months || 0);

    if (residualValue > purchaseCost) {
      toast.error('El valor residual no puede ser mayor al costo de compra');
      return;
    }

    if (usefulLife <= 0) {
      toast.error('La vida útil debe ser mayor a 0');
      return;
    }

    const request: CreateFixedAssetRequest = {
      asset_code: model.asset_code,
      name: model.name,
      category: model.category as AssetCategory,
      purchase_date: model.purchase_date,
      purchase_cost: purchaseCost,
      residual_value: residualValue,
      useful_life_months: usefulLife,
      assigned_employee_id: model.assigned_employee_id || null,
      status: model.status,
    };

    try {
      const editingId = this.assetToEdit()?.id;
      if (editingId) {
        const update: UpdateFixedAssetRequest = {
          ...request,
        };
        await this.fixedAssetsStore.updateFixedAsset(editingId, update);
        toast.success('Activo actualizado');
      } else {
        await this.fixedAssetsStore.createFixedAsset(request);
        toast.success('Activo creado');
      }
      this.saved.emit();
      this.model.set({ ...EMPTY_ASSET });
    } catch {
      toast.error(this.fixedAssetsStore.status().error ?? 'Error al guardar el activo');
    }
  }

  protected onCancel(): void {
    this.model.set({ ...EMPTY_ASSET });
    this.cancel.emit();
  }
}
