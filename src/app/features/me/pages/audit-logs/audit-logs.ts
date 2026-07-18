import { Component, computed, CUSTOM_ELEMENTS_SCHEMA, inject, resource, ViewEncapsulation } from '@angular/core';
import { toast } from 'ngx-sonner';
import DataTable, { DataTableColumn } from '../../../../shared/components/data-table/data-table';
import EmptyState from '../../../../shared/components/empty-state/empty-state';
import PageHeader from '../../../../shared/components/page-header/page-header';
import { AuditLog } from '../../../../core/models/audit.model';
import { MeService } from '../../../me/services/me';
import { toApiPromise } from '../../../../core/utils/api-response';
import { apiResource } from '../../../../core/utils/resource-helpers';

@Component({
  selector: 'app-audit-logs',
  imports: [PageHeader, DataTable, EmptyState],
  templateUrl: './audit-logs.html',
  styleUrl: './audit-logs.scss',
  encapsulation: ViewEncapsulation.None,
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
})
export default class AuditLogs {
  private readonly meService = inject(MeService);

  /** Recurso reactivo que carga los logs de auditoría del usuario. */
  private readonly logsResource = apiResource<AuditLog[]>(async () => {
    try {
      const response = await toApiPromise(this.meService.getAuditLogs({ limit: 50 }));
      return response.items;
    } catch {
      toast.error('Error al cargar logs');
      return [];
    }
  });

  protected readonly logs = computed<AuditLog[]>(() => this.logsResource.value() ?? []);
  protected readonly loading = computed(() => this.logsResource.isLoading());

  protected readonly columns: DataTableColumn<AuditLog>[] = [
    { key: 'action', header: 'Acción' },
    { key: 'entity_type', header: 'Entidad' },
    { key: 'entity_id', header: 'ID Entidad' },
    { key: 'created_at', header: 'Fecha' },
  ];
}
