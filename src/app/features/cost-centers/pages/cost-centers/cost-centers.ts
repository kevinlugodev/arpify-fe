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
import {
  CostCenter,
  CreateCostCenterRequest,
  UpdateCostCenterRequest,
} from '../../../../core/models/cost-centers.model';
import { CostCentersService } from '../../services/cost-centers';
import { CostCentersStore } from '../../store/cost-centers.store';
import { toApiPromise } from '../../../../core/utils/api-response';
import { apiResource } from '../../../../core/utils/resource-helpers';
import CostCenterFormComponent from '../../components/cost-center-form/cost-center-form';
import CostCenterListComponent from '../../components/cost-center-list/cost-center-list';
import CostCenterBudgetsComponent from '../../components/cost-center-budgets/cost-center-budgets';

type CostCenterTab = 'centers' | 'budgets';

@Component({
  selector: 'app-cost-centers',
  standalone: true,
  imports: [
    PageHeader,
    WorkflowTip,
    ConfirmDialog,
    CostCenterFormComponent,
    CostCenterListComponent,
    CostCenterBudgetsComponent,
  ],
  templateUrl: './cost-centers.html',
  styleUrl: './cost-centers.scss',
  encapsulation: ViewEncapsulation.None,
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
})
export default class CostCentersPage {
  private readonly costCentersService = inject(CostCentersService);
  private readonly costCentersStore = inject(CostCentersStore);

  protected readonly activeTab = signal<CostCenterTab>('centers');
  protected readonly editingCostCenter = signal<CostCenter | null>(null);

  private readonly deleteDialog = viewChild<ConfirmDialog>('deleteDialog');
  protected readonly costCenterToDelete = signal<CostCenter | null>(null);

  private readonly costCentersResource = apiResource<CostCenter[]>(async () => {
    try {
      const response = await toApiPromise(this.costCentersService.getCostCenters({ limit: 100 }));
      return response.items.map((item) => item.cost_center);
    } catch {
      toast.error('Error al cargar centros de costo');
      return [];
    }
  });

  protected readonly costCenters = computed<CostCenter[]>(() => this.costCentersResource.value() ?? []);
  protected readonly costCentersLoading = computed(() => this.costCentersResource.isLoading());
  protected readonly saving = computed(() => this.costCentersStore.status().loading);

  protected async onSave(event: {
    id: string | null;
    request: CreateCostCenterRequest | UpdateCostCenterRequest;
  }): Promise<void> {
    try {
      if (event.id) {
        await this.costCentersStore.updateCostCenter(event.id, event.request as UpdateCostCenterRequest);
        toast.success('Centro de costo actualizado');
      } else {
        await this.costCentersStore.createCostCenter(event.request as CreateCostCenterRequest);
        toast.success('Centro de costo creado');
      }
      this.editingCostCenter.set(null);
      this.costCentersResource.reload();
    } catch {
      toast.error(this.costCentersStore.status().error ?? 'Error al guardar el centro de costo');
    }
  }

  protected onEdit(costCenter: CostCenter): void {
    this.editingCostCenter.set(costCenter);
  }

  protected onCancel(): void {
    this.editingCostCenter.set(null);
  }

  protected onRequestDelete(costCenter: CostCenter): void {
    this.costCenterToDelete.set(costCenter);
    this.deleteDialog()?.open();
  }

  protected async onConfirmDelete(): Promise<void> {
    const costCenter = this.costCenterToDelete();
    if (!costCenter) {
      return;
    }

    try {
      await this.costCentersStore.deleteCostCenter(costCenter.id);
      toast.success('Centro de costo eliminado');
      this.costCenterToDelete.set(null);
      if (this.editingCostCenter()?.id === costCenter.id) {
        this.editingCostCenter.set(null);
      }
      this.costCentersResource.reload();
    } catch {
      toast.error(this.costCentersStore.status().error ?? 'Error al eliminar el centro de costo');
    }
  }
}
