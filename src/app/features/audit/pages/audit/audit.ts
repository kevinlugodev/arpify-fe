import { Component, computed, CUSTOM_ELEMENTS_SCHEMA, inject, signal, ViewEncapsulation } from '@angular/core';
import { toast } from 'ngx-sonner';
import DataTable, { DataTableColumn } from '../../../../shared/components/data-table/data-table';
import EmptyState from '../../../../shared/components/empty-state/empty-state';
import InfoTip from '../../../../shared/components/info-tip/info-tip';
import PageHeader from '../../../../shared/components/page-header/page-header';
import SearchField from '../../../../shared/components/search-field/search-field';
import { AuditLog } from '../../../../core/models/audit.model';
import { AuditService } from '../../../audit/services/audit';
import { toApiPromise } from '../../../../core/utils/api-response';
import { apiResourceWithRequest } from '../../../../core/utils/resource-helpers';

interface AuditRequest {
  entityType: string;
}

@Component({
  selector: 'app-audit',
  imports: [PageHeader, SearchField, DataTable, EmptyState, InfoTip],
  templateUrl: './audit.html',
  styleUrl: './audit.scss',
  encapsulation: ViewEncapsulation.None,
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
})
export default class AuditPage {
  private readonly auditService = inject(AuditService);

  protected readonly entityType = signal('');

  /** Recurso reactivo que carga los logs de auditoría del tenant. */
  private readonly logsResource = apiResourceWithRequest<AuditLog[], AuditRequest>(
    () => ({ entityType: this.entityType() }),
    async ({ params }) => {
      const filters: Record<string, string | number> = { limit: 50 };
      if (params.entityType) {
        filters['entity_type'] = params.entityType;
      }
      try {
        const response = await toApiPromise(this.auditService.getAuditLogs(filters));
        return response.items;
      } catch {
        toast.error('Error al cargar auditoría');
        return [];
      }
    }
  );

  protected readonly logs = computed<AuditLog[]>(() => this.logsResource.value() ?? []);
  protected readonly loading = computed(() => this.logsResource.isLoading());

  protected readonly columns: DataTableColumn<AuditLog>[] = [
    { key: 'action', header: 'Acción' },
    { key: 'entity_type', header: 'Entidad' },
    { key: 'entity_id', header: 'ID Entidad' },
    { key: 'user_id', header: 'Usuario' },
    { key: 'created_at', header: 'Fecha' },
  ];
}
