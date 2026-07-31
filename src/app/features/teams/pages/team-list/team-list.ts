import { Component, computed, CUSTOM_ELEMENTS_SCHEMA, inject, signal, ViewEncapsulation } from '@angular/core';
import { Router } from '@angular/router';
import { toast } from 'ngx-sonner';
import DataTable, { DataTableColumn, DataTableStatusOption } from '../../../../shared/components/data-table/data-table';
import EmptyState from '../../../../shared/components/empty-state/empty-state';
import PageHeader from '../../../../shared/components/page-header/page-header';
import SearchField from '../../../../shared/components/search-field/search-field';
import { TeamMember, TeamMemberStatus } from '../../../../core/models/team.model';
import { TeamsService } from '../../../teams/services/teams';
import { TeamsStore } from '../../../teams/store/teams.store';
import { toApiPromise } from '../../../../core/utils/api-response';
import { apiResourceWithRequest } from '../../../../core/utils/resource-helpers';

interface TeamListRequest {
  search: string;
}

const STATUS_OPTIONS: DataTableStatusOption[] = [
  { value: 'active', label: 'Activo' },
  { value: 'inactive', label: 'Inactivo' },
  { value: 'on_leave', label: 'De licencia' },
  { value: 'terminated', label: 'Terminado' },
  { value: 'suspended', label: 'Suspendido' },
];

@Component({
  selector: 'app-team-list',
  imports: [PageHeader, SearchField, DataTable, EmptyState],
  templateUrl: './team-list.html',
  styleUrl: './team-list.scss',
  encapsulation: ViewEncapsulation.None,
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
})
export default class TeamList {
  private readonly teamsService = inject(TeamsService);
  private readonly teamsStore = inject(TeamsStore);
  private readonly router = inject(Router);

  protected readonly search = signal('');
  protected readonly statusOptions = STATUS_OPTIONS;

  /** Recurso reactivo que carga los miembros del equipo según la búsqueda. */
  private readonly membersResource = apiResourceWithRequest<TeamMember[], TeamListRequest>(
    () => ({ search: this.search() }),
    async ({ params }) => {
      try {
        const response = await toApiPromise(this.teamsService.getTeamMembers({ ...params, limit: 50 }));
        return response.items;
      } catch {
        toast.error('Error al cargar el equipo');
        return [];
      }
    }
  );

  protected readonly members = computed<TeamMember[]>(() => this.membersResource.value() ?? []);
  protected readonly loading = computed(() => this.membersResource.isLoading());

  protected readonly columns: DataTableColumn<TeamMember>[] = [
    { key: 'first_name', header: 'Nombre' },
    { key: 'last_name', header: 'Apellido' },
    { key: 'email', header: 'Correo', type: 'email' },
    { key: 'position', header: 'Cargo' },
    { key: 'status', header: 'Estado', type: 'status-select', statusOptions: STATUS_OPTIONS },
  ];

  protected onRowClick(member: TeamMember): void {
    void this.router.navigate(['/teams', member.id]);
  }

  protected async onStatusChange(event: { row: TeamMember; value: string }): Promise<void> {
    const status = event.value as TeamMemberStatus;
    if (event.row.status === status) {
      return;
    }

    try {
      await this.teamsStore.updateTeamMemberStatus(event.row.id, { status });
      toast.success('Estado actualizado');
      this.membersResource.reload();
    } catch {
      toast.error(this.teamsStore.status().error ?? 'Error al actualizar el estado');
    }
  }

  protected onCreate(): void {
    void this.router.navigate(['/teams/new']);
  }
}
