import {
  Component,
  computed,
  CUSTOM_ELEMENTS_SCHEMA,
  inject,
  signal,
  viewChild,
  ViewEncapsulation,
} from '@angular/core';
import { toast } from 'ngx-sonner';
import PageHeader from '../../../../shared/components/page-header/page-header';
import WorkflowTip from '../../../../shared/components/workflow-tip/workflow-tip';
import { ConfirmDialog } from '../../../../shared/components/confirm-dialog/confirm-dialog';
import AssetListComponent from '../../components/asset-list/asset-list';
import AssetFormComponent from '../../components/asset-form/asset-form';
import AssetDepreciationComponent from '../../components/asset-depreciation/asset-depreciation';
import { FixedAssetsService } from '../../services/fixed-assets';
import { FixedAssetsStore } from '../../store/fixed-assets.store';
import { TeamsService } from '../../../teams/services/teams';
import { FixedAsset } from '../../../../core/models/fixed-assets.model';
import { TeamMember } from '../../../../core/models/team.model';
import { toApiPromise } from '../../../../core/utils/api-response';
import { apiResource } from '../../../../core/utils/resource-helpers';

type FixedAssetsTab = 'list' | 'form' | 'depreciation';

@Component({
  selector: 'app-fixed-assets',
  standalone: true,
  imports: [
    PageHeader,
    WorkflowTip,
    ConfirmDialog,
    AssetListComponent,
    AssetFormComponent,
    AssetDepreciationComponent,
  ],
  templateUrl: './fixed-assets.html',
  styleUrl: './fixed-assets.scss',
  encapsulation: ViewEncapsulation.None,
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
})
export default class FixedAssetsPage {
  private readonly fixedAssetsService = inject(FixedAssetsService);
  private readonly fixedAssetsStore = inject(FixedAssetsStore);
  private readonly teamsService = inject(TeamsService);

  protected readonly activeTab = signal<FixedAssetsTab>('list');
  protected readonly editingAsset = signal<FixedAsset | null>(null);
  protected readonly preselectedAssetId = signal<string>('');
  protected readonly itemToDelete = signal<FixedAsset | null>(null);

  private readonly deleteDialog = viewChild<ConfirmDialog>('deleteDialog');

  private readonly assetsResource = apiResource<FixedAsset[]>(async () => {
    try {
      const response = await toApiPromise(this.fixedAssetsService.getFixedAssets({ limit: 200 }));
      return response.items;
    } catch {
      toast.error('Error al cargar activos fijos');
      return [];
    }
  });

  private readonly employeesResource = apiResource<TeamMember[]>(async () => {
    try {
      const response = await toApiPromise(this.teamsService.getTeamMembers({ limit: 200 }));
      return response.items;
    } catch {
      toast.error('Error al cargar empleados');
      return [];
    }
  });

  protected readonly assets = computed<FixedAsset[]>(() => this.assetsResource.value() ?? []);
  protected readonly assetsLoading = computed(() => this.assetsResource.isLoading());

  protected readonly employees = computed<TeamMember[]>(() => this.employeesResource.value() ?? []);
  protected readonly employeesLoading = computed(() => this.employeesResource.isLoading());

  protected onCreate(): void {
    this.editingAsset.set(null);
    this.activeTab.set('form');
  }

  protected onEdit(asset: FixedAsset): void {
    this.editingAsset.set(asset);
    this.activeTab.set('form');
  }

  protected onDepreciate(asset: FixedAsset): void {
    this.preselectedAssetId.set(asset.id);
    this.activeTab.set('depreciation');
  }

  protected onDelete(asset: FixedAsset): void {
    this.itemToDelete.set(asset);
    this.deleteDialog()?.open();
  }

  protected async onConfirmDelete(): Promise<void> {
    const asset = this.itemToDelete();
    if (!asset) {
      return;
    }

    try {
      await this.fixedAssetsStore.deleteFixedAsset(asset.id);
      toast.success('Activo eliminado');
      this.itemToDelete.set(null);
      this.assetsResource.reload();
    } catch {
      toast.error(this.fixedAssetsStore.status().error ?? 'Error al eliminar el activo');
    }
  }

  protected onSaved(): void {
    this.editingAsset.set(null);
    this.assetsResource.reload();
    this.activeTab.set('list');
  }

  protected onCancelled(): void {
    this.editingAsset.set(null);
    this.activeTab.set('list');
  }

  protected onDepreciated(): void {
    this.assetsResource.reload();
  }
}
