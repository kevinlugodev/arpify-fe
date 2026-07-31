import {
  Component,
  computed,
  CUSTOM_ELEMENTS_SCHEMA,
  effect,
  inject,
  signal,
  viewChild,
  ViewEncapsulation,
} from '@angular/core';
import { Router } from '@angular/router';
import { toast } from 'ngx-sonner';
import DataTable, { DataTableAction, DataTableColumn } from '../../../../shared/components/data-table/data-table';
import EmptyState from '../../../../shared/components/empty-state/empty-state';
import PageHeader from '../../../../shared/components/page-header/page-header';
import SearchField from '../../../../shared/components/search-field/search-field';
import { FluentDropdown } from '../../../../shared/components/fluent-form-controls/fluent-form-controls';
import { ConfirmDialog } from '../../../../shared/components/confirm-dialog/confirm-dialog';
import { Customer, CustomerListFilters, CustomerListResponse, CustomerStatus } from '../../../../core/models/clients.model';
import { ClientsService } from '../../services/clients';
import { ClientsStore } from '../../store/clients.store';
import { toApiPromise } from '../../../../core/utils/api-response';
import { apiResourceWithRequest } from '../../../../core/utils/resource-helpers';

interface StatusOption {
  value: CustomerStatus | '';
  label: string;
}

const STATUS_OPTIONS: StatusOption[] = [
  { value: '', label: 'Todos' },
  { value: 'active', label: 'Activo' },
  { value: 'inactive', label: 'Inactivo' },
  { value: 'lead', label: 'Prospecto' },
  { value: 'suspended', label: 'Suspendido' },
];

@Component({
  selector: 'app-client-list',
  imports: [
    PageHeader,
    DataTable,
    SearchField,
    EmptyState,
    FluentDropdown,
    ConfirmDialog,
  ],
  templateUrl: './client-list.html',
  styleUrl: './client-list.scss',
  encapsulation: ViewEncapsulation.None,
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
})
export default class ClientList {
  private readonly clientsService = inject(ClientsService);
  private readonly clientsStore = inject(ClientsStore);
  private readonly router = inject(Router);

  protected readonly searchInput = signal('');
  protected readonly search = signal('');
  protected readonly statusFilter = signal<CustomerStatus | ''>('');
  protected readonly statusOptions = STATUS_OPTIONS;

  protected readonly customerToDelete = signal<Customer | null>(null);
  private readonly deleteConfirmDialog = viewChild<ConfirmDialog>('deleteConfirmDialog');

  /** Recurso reactivo de clientes. */
  private readonly customersResource = apiResourceWithRequest<CustomerListResponse, CustomerListFilters>(
    () => {
      const filters: CustomerListFilters = { limit: 20, offset: 0 };
      const search = this.search().trim();
      if (search) {
        filters.search = search;
      }
      const status = this.statusFilter();
      if (status) {
        filters.status = status;
      }
      return filters;
    },
    async ({ params }) => {
      try {
        return await toApiPromise(this.clientsService.getCustomers(params));
      } catch {
        toast.error('Error al cargar clientes');
        return { items: [], total: 0 };
      }
    },
  );

  protected readonly customers = computed<Customer[]>(() => this.customersResource.value()?.items ?? []);
  protected readonly total = computed(() => this.customersResource.value()?.total ?? 0);
  protected readonly loading = computed(() => this.customersResource.isLoading());
  protected readonly deleting = computed(() => this.clientsStore.status().loading);

  protected readonly columns: DataTableColumn<Customer>[] = [
    { key: 'legal_name', header: 'Nombre legal' },
    { key: 'tax_id', header: 'RUC / Tax ID' },
    { key: 'trade_name', header: 'Nombre comercial' },
    { key: 'status', header: 'Estado', type: 'status', statusDomain: 'clients' },
    { key: 'email', header: 'Correo', type: 'email' },
    { key: 'default_currency', header: 'Moneda' },
    { key: 'credit_limit', header: 'Límite de crédito' },
  ];

  protected readonly rowActions: DataTableAction<Customer>[] = [
    { key: 'edit', label: 'Editar', icon: 'bi-pencil' },
    { key: 'delete', label: 'Eliminar', icon: 'bi-trash' },
  ];

  constructor() {
    let searchTimeout: ReturnType<typeof setTimeout>;
    effect(() => {
      const value = this.searchInput();
      clearTimeout(searchTimeout);
      searchTimeout = setTimeout(() => {
        this.search.set(value);
      }, 400);
    });
  }

  protected onStatusChange(value: string): void {
    this.statusFilter.set(value as CustomerStatus | '');
  }

  protected onCreate(): void {
    void this.router.navigate(['/clients/new']);
  }

  protected onRowClick(customer: Customer): void {
    void this.router.navigate(['/clients', customer.id]);
  }

  protected onRowAction(event: { action: string; row: Customer }): void {
    if (event.action === 'edit') {
      void this.router.navigate(['/clients', event.row.id, 'edit']);
      return;
    }

    if (event.action === 'delete') {
      this.customerToDelete.set(event.row);
      this.deleteConfirmDialog()?.open();
    }
  }

  protected async onConfirmDelete(): Promise<void> {
    const customer = this.customerToDelete();
    if (!customer) {
      return;
    }

    try {
      await this.clientsStore.deleteCustomer(customer.id);
      toast.success('Cliente eliminado');
      this.customerToDelete.set(null);
      this.customersResource.reload();
    } catch {
      toast.error(this.clientsStore.status().error ?? 'Error al eliminar el cliente');
    }
  }
}
