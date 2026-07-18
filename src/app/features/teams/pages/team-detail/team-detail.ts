import { Component, computed, CUSTOM_ELEMENTS_SCHEMA, inject, signal, ViewEncapsulation } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { form, FormField } from '@angular/forms/signals';
import { toast } from 'ngx-sonner';
import EmptyState from '../../../../shared/components/empty-state/empty-state';
import InfoTip from '../../../../shared/components/info-tip/info-tip';
import PageHeader from '../../../../shared/components/page-header/page-header';
import { FluentDropdown } from '../../../../shared/components/fluent-form-controls/fluent-form-controls';
import { Area, AreaListResponse, Management, ManagementListResponse } from '../../../../core/models/master-data.model';
import { TeamMember } from '../../../../core/models/team.model';
import { MasterDataService } from '../../../master-data/services/master-data';
import { TeamsService } from '../../../teams/services/teams';
import { TeamsStore } from '../../../teams/store/teams.store';
import { toApiPromise } from '../../../../core/utils/api-response';
import { apiResource, apiResourceWithRequest } from '../../../../core/utils/resource-helpers';

interface AssignResponsibleModel {
  managementId: string;
  areaId: string;
}

@Component({
  selector: 'app-team-detail',
  imports: [PageHeader, EmptyState, InfoTip, FormField, FluentDropdown],
  templateUrl: './team-detail.html',
  styleUrl: './team-detail.scss',
  encapsulation: ViewEncapsulation.None,
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
})
export default class TeamDetail {
  private readonly teamsService = inject(TeamsService);
  private readonly teamsStore = inject(TeamsStore);
  private readonly masterDataService = inject(MasterDataService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  protected readonly memberId = signal<string>(this.route.snapshot.paramMap.get('id') ?? '');

  /** Recurso reactivo que carga el detalle del miembro. */
  private readonly memberResource = apiResourceWithRequest<TeamMember | null, string>(
    () => this.memberId(),
    async ({ params }) => {
      if (!params) {
        return null;
      }
      try {
        return await toApiPromise(this.teamsService.getTeamMember(params));
      } catch {
        toast.error('Error al cargar miembro');
        return null;
      }
    }
  );

  /** Recurso reactivo de gerencias para asignación de responsable. */
  private readonly managementsResource = apiResource<ManagementListResponse>(async () => {
    try {
      return await toApiPromise(this.masterDataService.getManagements());
    } catch {
      toast.error('Error al cargar gerencias');
      return { items: [], total: 0 };
    }
  });

  /** Recurso reactivo de áreas para asignación de responsable. */
  private readonly areasResource = apiResource<AreaListResponse>(async () => {
    try {
      return await toApiPromise(this.masterDataService.getAreas());
    } catch {
      toast.error('Error al cargar áreas');
      return { items: [], total: 0 };
    }
  });

  protected readonly member = computed<TeamMember | null>(() => this.memberResource.value() ?? null);
  protected readonly managements = computed<Management[]>(() => this.managementsResource.value()?.items ?? []);
  protected readonly areas = computed<Area[]>(() => this.areasResource.value()?.items ?? []);
  protected readonly loading = computed(() => this.memberResource.isLoading());
  protected readonly assigning = computed(() => this.teamsStore.status().loading);

  protected readonly assignModel = signal<AssignResponsibleModel>({ managementId: '', areaId: '' });
  protected readonly assignForm = form(this.assignModel, () => {
    // Los campos son opcionales; el usuario puede asignar solo gerencia, solo área o ambos.
  });

  protected onEdit(): void {
    void this.router.navigate(['/teams', this.memberId(), 'edit']);
  }

  protected async onDeactivate(): Promise<void> {
    try {
      await this.teamsStore.deactivateTeamMember(this.memberId());
      toast.success('Miembro desactivado');
      await this.router.navigate(['/teams']);
    } catch {
      toast.error(this.teamsStore.status().error ?? 'Error al desactivar');
    }
  }

  /**
   * Asigna al miembro como responsable de la gerencia y/o área seleccionadas.
   */
  protected async onAssignResponsible(): Promise<void> {
    const managementId = this.assignModel().managementId;
    const areaId = this.assignModel().areaId;

    if (!managementId && !areaId) {
      toast.error('Selecciona una gerencia o área para asignar');
      return;
    }

    try {
      await this.teamsStore.assignResponsible(this.memberId(), {
        ...(managementId ? { management_id: managementId } : {}),
        ...(areaId ? { area_id: areaId } : {}),
      });
      toast.success('Responsable asignado');
      this.assignModel.set({ managementId: '', areaId: '' });
      this.memberResource.reload();
    } catch {
      toast.error(this.teamsStore.status().error ?? 'Error al asignar responsable');
    }
  }
}
