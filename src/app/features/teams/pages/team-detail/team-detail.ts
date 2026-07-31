import {
  Component,
  computed,
  CUSTOM_ELEMENTS_SCHEMA,
  effect,
  inject,
  signal,
  ViewEncapsulation,
} from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { form, FormField } from '@angular/forms/signals';
import { toast } from 'ngx-sonner';
import EmptyState from '../../../../shared/components/empty-state/empty-state';
import InfoTip from '../../../../shared/components/info-tip/info-tip';
import PageHeader from '../../../../shared/components/page-header/page-header';
import { FluentDropdown } from '../../../../shared/components/fluent-form-controls/fluent-form-controls';
import { StatusTag } from '../../../../shared/components/status-tag/status-tag';
import {
  Area,
  AreaListResponse,
  Management,
  ManagementListResponse,
} from '../../../../core/models/master-data.model';
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
  imports: [PageHeader, EmptyState, InfoTip, FormField, FluentDropdown, StatusTag],
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
        const response = await toApiPromise(this.teamsService.getTeamMember(params));
        return response.team_member;
      } catch {
        toast.error('Error al cargar miembro');
        return null;
      }
    },
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

  protected readonly member = computed<TeamMember | null>(
    () => this.memberResource.value() ?? null,
  );
  protected readonly managements = computed<Management[]>(
    () => this.managementsResource.value()?.items ?? [],
  );
  protected readonly areas = computed<Area[]>(() => this.areasResource.value()?.items ?? []);
  protected readonly loading = computed(() => this.memberResource.isLoading());
  protected readonly assigning = computed(() => this.teamsStore.status().loading);

  /** Áreas filtradas por la gerencia seleccionada. */
  protected readonly filteredAreas = computed<Area[]>(() => {
    const managementId = this.assignModel().managementId;
    if (!managementId) {
      return [];
    }
    return this.areas().filter((area) => area.management_id === managementId);
  });

  protected readonly assignModel = signal<AssignResponsibleModel>({ managementId: '', areaId: '' });
  protected readonly assignForm = form(this.assignModel, () => {
    // Los campos son opcionales; el usuario puede asignar solo gerencia, solo área o ambos.
  });

  constructor() {
    effect(() => {
      const member = this.member();
      this.assignModel.set({
        managementId: member?.responsible_for_management_id ?? '',
        areaId: member?.responsible_for_area_id ?? '',
      });
    });
  }

  protected onEdit(): void {
    void this.router.navigate(['/teams', this.memberId(), 'edit']);
  }

  /**
   * Limpia el área seleccionada cuando el usuario cambia de gerencia,
   * ya que las áreas listadas dependen de la gerencia activa.
   */
  protected onManagementChange(): void {
    this.assignModel.update((model) => ({ ...model, areaId: '' }));
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
   * Asigna o quita la responsabilidad de gerencia y/o área del miembro.
   * Si no se selecciona nada, se envía `null` para ambos campos para reflejar
   * que el colaborador no es responsable de ninguna gerencia ni área.
   */
  protected async onAssignResponsible(): Promise<void> {
    const managementId = this.assignModel().managementId;
    const areaId = this.assignModel().areaId;

    try {
      await this.teamsStore.assignResponsible(this.memberId(), {
        management_id: managementId || null,
        area_id: areaId || null,
      });
      toast.success('Responsable actualizado');
      this.memberResource.reload();
    } catch {
      toast.error(this.teamsStore.status().error ?? 'Error al asignar responsable');
    }
  }
}
