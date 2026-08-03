import {
  Component,
  computed,
  CUSTOM_ELEMENTS_SCHEMA,
  inject,
  signal,
  ViewEncapsulation,
} from '@angular/core';
import { form, FormField } from '@angular/forms/signals';
import { toast } from 'ngx-sonner';
import DataTable, { DataTableColumn } from '../../../../shared/components/data-table/data-table';
import EmptyState from '../../../../shared/components/empty-state/empty-state';
import InfoTip from '../../../../shared/components/info-tip/info-tip';
import PageHeader from '../../../../shared/components/page-header/page-header';
import {
  FluentDropdown,
  FluentTextInput,
} from '../../../../shared/components/fluent-form-controls/fluent-form-controls';
import { AuditLog, AuditLogFilters } from '../../../../core/models/audit.model';
import { AuditService } from '../../../audit/services/audit';
import { toApiPromise } from '../../../../core/utils/api-response';
import { apiResourceWithRequest } from '../../../../core/utils/resource-helpers';

interface Option<T = string> {
  value: T;
  label: string;
}

interface AuditFilterModel {
  entityType: string;
  entityId: string;
  actorId: string;
  action: string;
}

const ENTITY_TYPE_OPTIONS: Option<string>[] = [
  { value: '', label: 'Todas las entidades' },
  { value: 'partner_account', label: 'Cuenta de socio' },
  { value: 'profit_distribution', label: 'Distribución de utilidades' },
  { value: 'draw_transaction', label: 'Movimiento de socio' },
  { value: 'cost_center', label: 'Centro de costo' },
  { value: 'fixed_asset', label: 'Activo fijo' },
  { value: 'expense_claim', label: 'Rendición' },
  { value: 'payroll_run', label: 'Planilla' },
  { value: 'credit_schedule', label: 'Cronograma de crédito' },
];

const ACTION_OPTIONS: Option<string>[] = [
  { value: '', label: 'Todas las acciones' },
  { value: 'create', label: 'Creación' },
  { value: 'update', label: 'Actualización' },
  { value: 'delete', label: 'Eliminación' },
  { value: 'submit', label: 'Envío' },
  { value: 'approve', label: 'Aprobación' },
  { value: 'reject', label: 'Rechazo' },
  { value: 'settle', label: 'Liquidación' },
  { value: 'record_payment', label: 'Registro de pago' },
];

const EMPTY_FILTERS: AuditFilterModel = {
  entityType: '',
  entityId: '',
  actorId: '',
  action: '',
};

@Component({
  selector: 'app-audit',
  imports: [
    PageHeader,
    InfoTip,
    DataTable,
    EmptyState,
    FormField,
    FluentDropdown,
    FluentTextInput,
  ],
  templateUrl: './audit.html',
  styleUrl: './audit.scss',
  encapsulation: ViewEncapsulation.None,
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
})
export default class AuditPage {
  private readonly auditService = inject(AuditService);

  protected readonly filterModel = signal<AuditFilterModel>({ ...EMPTY_FILTERS });
  protected readonly filterForm;

  protected readonly entityTypeOptions = ENTITY_TYPE_OPTIONS;
  protected readonly actionOptions = ACTION_OPTIONS;

  /** Recurso reactivo que carga los logs de auditoría del tenant. */
  private readonly logsResource = apiResourceWithRequest<AuditLog[], AuditLogFilters>(
    () => {
      const model = this.filterModel();
      const filters: AuditLogFilters = { limit: 50 };
      if (model.entityType) {
        filters.entity_type = model.entityType;
      }
      if (model.entityId.trim()) {
        filters.entity_id = model.entityId.trim();
      }
      if (model.actorId.trim()) {
        filters.actor_id = model.actorId.trim();
      }
      if (model.action) {
        filters.action = model.action;
      }
      return filters;
    },
    async ({ params }) => {
      try {
        const response = await toApiPromise(this.auditService.getAuditLogs(params));
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
    { key: 'action_label', header: 'Acción' },
    { key: 'entity_type_label', header: 'Entidad' },
    { key: 'entity_description', header: 'Objeto afectado' },
    { key: 'description', header: 'Descripción' },
    { key: 'actor_email', header: 'Actor', type: 'email' },
    { key: 'created_at', header: 'Fecha', type: 'relative' },
  ];

  constructor() {
    this.filterForm = form(this.filterModel, () => {
      // Filtros libres, sin validación requerida.
    });
  }

  protected clearFilters(): void {
    this.filterForm().reset({ ...EMPTY_FILTERS });
  }
}
