import {
  Component,
  computed,
  CUSTOM_ELEMENTS_SCHEMA,
  ElementRef,
  inject,
  signal,
  viewChild,
  ViewEncapsulation,
} from '@angular/core';
import { form, FormField, required } from '@angular/forms/signals';
import { toast } from 'ngx-sonner';
import DataTable, { DataTableAction, DataTableColumn } from '../../../../shared/components/data-table/data-table';
import {
  FluentDropdown,
  FluentTextInput,
} from '../../../../shared/components/fluent-form-controls/fluent-form-controls';
import EmptyState from '../../../../shared/components/empty-state/empty-state';
import InfoTip from '../../../../shared/components/info-tip/info-tip';
import PageHeader from '../../../../shared/components/page-header/page-header';
import {
  Area,
  AreaListResponse,
  Management,
  ManagementListResponse,
} from '../../../../core/models/master-data.model';
import { TeamListResponse, TeamMember } from '../../../../core/models/team.model';
import { MasterDataService } from '../../../master-data/services/master-data';
import { MasterDataStore } from '../../../master-data/store/master-data.store';
import { TeamsService } from '../../../teams/services/teams';
import { TeamsStore } from '../../../teams/store/teams.store';
import { toApiPromise } from '../../../../core/utils/api-response';
import { apiResource } from '../../../../core/utils/resource-helpers';

type Tab = 'managements' | 'areas';
type AssignableEntityType = 'management' | 'area';

interface ManagementFormModel {
  name: string;
}

interface AreaFormModel {
  managementId: string;
  name: string;
}

interface AssignDialogModel {
  teamMemberId: string;
}

@Component({
  selector: 'app-master-data',
  imports: [PageHeader, DataTable, EmptyState, InfoTip, FormField, FluentTextInput, FluentDropdown],
  templateUrl: './master-data.html',
  styleUrl: './master-data.scss',
  encapsulation: ViewEncapsulation.None,
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
})
export default class MasterDataPage {
  private readonly masterDataService = inject(MasterDataService);
  private readonly masterDataStore = inject(MasterDataStore);
  private readonly teamsService = inject(TeamsService);
  private readonly teamsStore = inject(TeamsStore);
  private readonly assignDialogRef = viewChild<ElementRef<HTMLDialogElement>>('assignDialog');

  protected readonly activeTab = signal<Tab>('managements');

  protected readonly managementModel = signal<ManagementFormModel>({ name: '' });
  protected readonly managementForm = form(this.managementModel, (schema) => {
    required(schema.name, { message: 'El nombre de la gerencia es obligatorio.' });
  });

  protected readonly areaModel = signal<AreaFormModel>({ managementId: '', name: '' });
  protected readonly areaForm = form(this.areaModel, (schema) => {
    required(schema.managementId, { message: 'Selecciona una gerencia.' });
    required(schema.name, { message: 'El nombre del área es obligatorio.' });
  });

  /** Recurso reactivo de gerencias. */
  private readonly managementsResource = apiResource<ManagementListResponse>(async () => {
    try {
      return await toApiPromise(this.masterDataService.getManagements());
    } catch {
      toast.error('Error al cargar gerencias');
      return { items: [], total: 0 };
    }
  });

  /** Recurso reactivo de áreas. */
  private readonly areasResource = apiResource<AreaListResponse>(async () => {
    try {
      return await toApiPromise(this.masterDataService.getAreas());
    } catch {
      toast.error('Error al cargar áreas');
      return { items: [], total: 0 };
    }
  });

  /** Recurso reactivo de miembros del equipo para asignar responsables. */
  private readonly teamMembersResource = apiResource<TeamListResponse>(async () => {
    try {
      return await toApiPromise(this.teamsService.getTeamMembers({ limit: 200 }));
    } catch {
      toast.error('Error al cargar miembros del equipo');
      return { items: [], total: 0 };
    }
  });

  protected readonly managements = computed<Management[]>(() => this.managementsResource.value()?.items ?? []);
  protected readonly areas = computed<Area[]>(() => this.areasResource.value()?.items ?? []);
  protected readonly teamMembers = computed<TeamMember[]>(() => this.teamMembersResource.value()?.items ?? []);
  protected readonly loading = computed(
    () => this.managementsResource.isLoading() || this.areasResource.isLoading()
  );

  protected readonly assigning = computed(() => this.teamsStore.status().loading);

  protected readonly assignEntityType = signal<AssignableEntityType | null>(null);
  protected readonly assignEntityId = signal<string>('');
  protected readonly assignEntityName = signal<string>('');
  protected readonly assignDialogModel = signal<AssignDialogModel>({ teamMemberId: '' });
  protected readonly assignDialogForm = form(this.assignDialogModel, (schema) => {
    required(schema.teamMemberId, { message: 'Selecciona un miembro del equipo.' });
  });

  protected readonly managementColumns: DataTableColumn<Management>[] = [
    { key: 'name', header: 'Nombre' },
    { key: 'status', header: 'Estado', type: 'status', statusDomain: 'master-data' },
    {
      key: 'responsible',
      header: 'Responsable',
      type: 'user',
      userNameKey: 'responsible.full_name',
      userEmailKey: 'responsible.email',
      userPrefixKey: 'responsible.prefix',
    },
  ];

  protected readonly managementActions: DataTableAction<Management>[] = [
    { key: 'assign', label: 'Asignar responsable', icon: 'bi-person-check' },
  ];

  protected readonly areaColumns: DataTableColumn<Area>[] = [
    { key: 'name', header: 'Nombre' },
    { key: 'management_name', header: 'Gerencia' },
    {
      key: 'responsible',
      header: 'Responsable',
      type: 'user',
      userNameKey: 'responsible.full_name',
      userEmailKey: 'responsible.email',
      userPrefixKey: 'responsible.prefix',
    },
  ];

  protected readonly areaActions: DataTableAction<Area>[] = [
    { key: 'assign', label: 'Asignar responsable', icon: 'bi-person-check' },
  ];

  protected async onCreateManagement(): Promise<void> {
    this.managementForm().markAsTouched();

    if (this.managementForm().invalid()) {
      return;
    }

    try {
      await this.masterDataStore.createManagement({ name: this.managementModel().name });
      toast.success('Gerencia creada');
      this.managementModel.set({ name: '' });
      this.managementsResource.reload();
    } catch {
      toast.error(this.masterDataStore.status().error ?? 'Error al crear');
    }
  }

  protected async onCreateArea(): Promise<void> {
    this.areaForm().markAsTouched();

    if (this.areaForm().invalid()) {
      return;
    }

    try {
      await this.masterDataStore.createArea({
        management_id: this.areaModel().managementId,
        name: this.areaModel().name,
      });
      toast.success('Área creada');
      this.areaModel.set({ managementId: '', name: '' });
      this.areasResource.reload();
    } catch {
      toast.error(this.masterDataStore.status().error ?? 'Error al crear');
    }
  }

  /**
   * Maneja el clic en una acción de fila del data-table.
   */
  protected onRowAction(event: { action: string; row: Management | Area }): void {
    if (event.action === 'assign') {
      this.openAssignDialog(event.row);
    }
  }

  /**
   * Abre el diálogo para asignar un responsable a la gerencia o área seleccionada.
   */
  protected openAssignDialog(entity: Management | Area): void {
    const isManagement = 'management_id' in entity === false;
    this.assignEntityType.set(isManagement ? 'management' : 'area');
    this.assignEntityId.set(entity.id);
    this.assignEntityName.set(entity.name);
    this.assignDialogModel.set({ teamMemberId: '' });
    this.assignDialogRef()?.nativeElement.showModal();
  }

  /**
   * Cierra el diálogo de asignación sin guardar.
   */
  protected closeAssignDialog(): void {
    this.assignDialogRef()?.nativeElement.close();
    this.assignEntityType.set(null);
    this.assignEntityId.set('');
    this.assignEntityName.set('');
  }

  /**
   * Asigna el miembro del equipo seleccionado como responsable de la gerencia o área.
   */
  protected async onAssignSubmit(): Promise<void> {
    this.assignDialogForm().markAsTouched();

    if (this.assignDialogForm().invalid()) {
      return;
    }

    const entityType = this.assignEntityType();
    const entityId = this.assignEntityId();
    const teamMemberId = this.assignDialogModel().teamMemberId;

    if (!entityType || !entityId || !teamMemberId) {
      return;
    }

    try {
      await this.teamsStore.assignResponsible(teamMemberId, {
        ...(entityType === 'management' ? { management_id: entityId } : {}),
        ...(entityType === 'area' ? { area_id: entityId } : {}),
      });
      toast.success('Responsable asignado');
      this.closeAssignDialog();
      this.managementsResource.reload();
      this.areasResource.reload();
    } catch {
      toast.error(this.teamsStore.status().error ?? 'Error al asignar responsable');
    }
  }

  /**
   * Resuelve el nombre completo de un miembro del equipo.
   */
  protected getTeamMemberName(member: TeamMember): string {
    return `${member.first_name} ${member.last_name}`.trim() || member.email;
  }
}
