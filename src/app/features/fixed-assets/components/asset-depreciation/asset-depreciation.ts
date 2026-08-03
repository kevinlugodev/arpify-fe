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
import DataTable, { DataTableColumn } from '../../../../shared/components/data-table/data-table';
import EmptyState from '../../../../shared/components/empty-state/empty-state';
import InfoTip from '../../../../shared/components/info-tip/info-tip';
import {
  FluentDropdown,
  FluentTextInput,
} from '../../../../shared/components/fluent-form-controls/fluent-form-controls';
import { DepreciationLog, FixedAsset } from '../../../../core/models/fixed-assets.model';
import { TeamMember } from '../../../../core/models/team.model';
import { FixedAssetsStore } from '../../store/fixed-assets.store';
import { FixedAssetsService } from '../../services/fixed-assets';
import { toApiPromise } from '../../../../core/utils/api-response';
import { apiResourceWithRequest } from '../../../../core/utils/resource-helpers';

interface DepreciationFormModel {
  period_year: string;
  period_month: string;
}

const EMPTY_DEPRECIATION: DepreciationFormModel = {
  period_year: String(new Date().getFullYear()),
  period_month: String(new Date().getMonth() + 1),
};

@Component({
  selector: 'app-asset-depreciation',
  standalone: true,
  imports: [
    DataTable,
    EmptyState,
    InfoTip,
    FluentTextInput,
    FluentDropdown,
    DecimalPipe,
    FormField,
  ],
  templateUrl: './asset-depreciation.html',
  styleUrl: './asset-depreciation.scss',
  encapsulation: ViewEncapsulation.None,
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
})
export default class AssetDepreciationComponent {
  private readonly fixedAssetsService = inject(FixedAssetsService);
  private readonly fixedAssetsStore = inject(FixedAssetsStore);

  readonly assets = input.required<FixedAsset[]>();
  readonly employees = input<TeamMember[]>([]);
  readonly preselectedAssetId = input<string>('');

  readonly depreciated = output<void>();

  protected readonly selectedAssetId = signal<string>('');
  protected readonly model = signal<DepreciationFormModel>({ ...EMPTY_DEPRECIATION });
  protected readonly form;

  protected readonly saving = computed(() => this.fixedAssetsStore.status().loading);

  protected readonly assetOptions = computed<{ value: string; label: string }[]>(() => [
    { value: '', label: 'Selecciona un activo' },
    ...this.assets()
      .filter((asset) => asset.status === 'ACTIVE')
      .map((asset) => ({
        value: asset.id,
        label: `${asset.asset_code} — ${asset.name}`,
      })),
  ]);

  protected readonly selectedAsset = computed<FixedAsset | undefined>(() =>
    this.assets().find((asset) => asset.id === this.selectedAssetId()),
  );

  protected readonly monthlyDepreciation = computed<number>(() => {
    const asset = this.selectedAsset();
    if (!asset || asset.useful_life_months <= 0) {
      return 0;
    }
    return (asset.purchase_cost - asset.residual_value) / asset.useful_life_months;
  });

  private readonly logsResource = apiResourceWithRequest<DepreciationLog[], string>(
    () => this.selectedAssetId(),
    async ({ params }) => {
      if (!params) {
        return [];
      }
      try {
        const response = await toApiPromise(
          this.fixedAssetsService.getDepreciationLogs(params, { limit: 100 }),
        );
        return response.items;
      } catch {
        toast.error('Error al cargar el histórico de depreciación');
        return [];
      }
    },
  );

  protected readonly logs = computed<DepreciationLog[]>(() => this.logsResource.value() ?? []);
  protected readonly logsLoading = computed(() => this.logsResource.isLoading());

  protected readonly logColumns: DataTableColumn<DepreciationLog>[] = [
    { key: 'period_year', header: 'Año' },
    { key: 'period_month', header: 'Mes' },
    { key: 'depreciation_amount', header: 'Depreciación' },
    { key: 'accumulated_total_after', header: 'Dep. acumulada' },
    { key: 'book_value_after', header: 'Valor contable' },
  ];

  constructor() {
    this.form = form(this.model, (schema) => {
      required(schema.period_year, { message: 'El año es obligatorio.' });
      required(schema.period_month, { message: 'El mes es obligatorio.' });
    });

    effect(() => {
      const preselected = this.preselectedAssetId();
      if (preselected) {
        this.selectedAssetId.set(preselected);
      }
    });
  }

  protected onAssetChange(): void {
    this.model.set({ ...EMPTY_DEPRECIATION });
  }

  protected async onDepreciate(): Promise<void> {
    this.form().markAsTouched();
    if (this.form().invalid()) {
      toast.error('Completa el período de depreciación');
      return;
    }

    const assetId = this.selectedAssetId();
    if (!assetId) {
      toast.error('Selecciona un activo');
      return;
    }

    const asset = this.selectedAsset();
    if (!asset) {
      return;
    }

    if (asset.status !== 'ACTIVE') {
      toast.error('Solo se pueden depreciar activos en estado Activo');
      return;
    }

    const year = Number(this.model().period_year);
    const month = Number(this.model().period_month);

    if (month < 1 || month > 12) {
      toast.error('El mes debe estar entre 1 y 12');
      return;
    }

    try {
      await this.fixedAssetsStore.depreciate(assetId, { period_year: year, period_month: month });
      toast.success('Depreciación ejecutada');
      this.logsResource.reload();
      this.depreciated.emit();
      this.form().reset({ ...EMPTY_DEPRECIATION });
    } catch {
      toast.error(this.fixedAssetsStore.status().error ?? 'Error al ejecutar la depreciación');
    }
  }
}
