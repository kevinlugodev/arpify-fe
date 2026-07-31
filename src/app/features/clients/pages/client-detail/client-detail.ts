import {
  Component,
  computed,
  CUSTOM_ELEMENTS_SCHEMA,
  inject,
  signal,
  viewChild,
  ViewEncapsulation,
} from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { DecimalPipe } from '@angular/common';
import { toast } from 'ngx-sonner';
import EmptyState from '../../../../shared/components/empty-state/empty-state';
import InfoTip from '../../../../shared/components/info-tip/info-tip';
import PageHeader from '../../../../shared/components/page-header/page-header';
import { StatusTag } from '../../../../shared/components/status-tag/status-tag';
import { ConfirmDialog } from '../../../../shared/components/confirm-dialog/confirm-dialog';
import { Customer } from '../../../../core/models/clients.model';
import { ClientsService } from '../../services/clients';
import { ClientsStore } from '../../store/clients.store';
import { toApiPromise } from '../../../../core/utils/api-response';
import { apiResourceWithRequest } from '../../../../core/utils/resource-helpers';

type ClientTab = 'general' | 'contact' | 'address' | 'commercial';

const COUNTRY_LABELS: Record<string, string> = {
  PE: 'Perú',
  US: 'Estados Unidos',
  MX: 'México',
  CO: 'Colombia',
  CL: 'Chile',
  AR: 'Argentina',
  ES: 'España',
};

const CURRENCY_LABELS: Record<string, string> = {
  PEN: 'Soles (PEN)',
  USD: 'Dólares (USD)',
  EUR: 'Euros (EUR)',
};

@Component({
  selector: 'app-client-detail',
  imports: [PageHeader, EmptyState, InfoTip, StatusTag, ConfirmDialog, DecimalPipe],
  templateUrl: './client-detail.html',
  styleUrl: './client-detail.scss',
  encapsulation: ViewEncapsulation.None,
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
})
export default class ClientDetail {
  private readonly clientsService = inject(ClientsService);
  private readonly clientsStore = inject(ClientsStore);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  protected readonly customerId = signal<string>(this.route.snapshot.paramMap.get('id') ?? '');
  protected readonly activeTab = signal<ClientTab>('general');
  private readonly deleteConfirmDialog = viewChild<ConfirmDialog>('deleteConfirmDialog');

  /** Recurso reactivo que carga el detalle del cliente. */
  private readonly customerResource = apiResourceWithRequest<Customer | null, string>(
    () => this.customerId(),
    async ({ params }) => {
      if (!params) {
        return null;
      }
      try {
        const response = await toApiPromise(this.clientsService.getCustomer(params));
        return response.customer;
      } catch {
        toast.error('Error al cargar cliente');
        return null;
      }
    }
  );

  protected readonly customer = computed<Customer | null>(() => this.customerResource.value() ?? null);
  protected readonly loading = computed(() => this.customerResource.isLoading());
  protected readonly deleting = computed(() => this.clientsStore.status().loading);

  protected onEdit(): void {
    void this.router.navigate(['/clients', this.customerId(), 'edit']);
  }

  protected openDeleteConfirm(): void {
    this.deleteConfirmDialog()?.open();
  }

  protected async onDelete(): Promise<void> {
    try {
      await this.clientsStore.deleteCustomer(this.customerId());
      toast.success('Cliente eliminado');
      await this.router.navigate(['/clients']);
    } catch {
      toast.error(this.clientsStore.status().error ?? 'Error al eliminar el cliente');
    }
  }

  protected getCountryLabel(code: string): string {
    return COUNTRY_LABELS[code] ?? code;
  }

  protected getCurrencyLabel(code: string): string {
    return CURRENCY_LABELS[code] ?? code;
  }
}
