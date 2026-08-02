import { Component, computed, CUSTOM_ELEMENTS_SCHEMA, inject, signal, ViewEncapsulation } from '@angular/core';
import { toast } from 'ngx-sonner';
import PageHeader from '../../../../shared/components/page-header/page-header';
import WorkflowTip from '../../../../shared/components/workflow-tip/workflow-tip';
import ScheduleListComponent from '../../components/schedule-list/schedule-list';
import SchedulePaymentsComponent from '../../components/schedule-payments/schedule-payments';
import CollectionLogsComponent from '../../components/collection-logs/collection-logs';
import AgingReportComponent from '../../components/aging-report/aging-report';
import { CreditControlService } from '../../services/credit-control';
import { ClientsService } from '../../../clients/services/clients';
import { FinanceService } from '../../../finance/services/finance';
import { CreditAccountSchedule } from '../../../../core/models/credit-control.model';
import { Customer } from '../../../../core/models/clients.model';
import { Invoice } from '../../../../core/models/finance.model';
import { toApiPromise } from '../../../../core/utils/api-response';
import { apiResource } from '../../../../core/utils/resource-helpers';
import { ScheduleSelectEvent } from '../../components/schedule-list/schedule-list';

type CreditControlTab = 'schedules' | 'payments' | 'logs' | 'aging';

@Component({
  selector: 'app-credit-control',
  standalone: true,
  imports: [
    PageHeader,
    WorkflowTip,
    ScheduleListComponent,
    SchedulePaymentsComponent,
    CollectionLogsComponent,
    AgingReportComponent,
  ],
  templateUrl: './credit-control.html',
  styleUrl: './credit-control.scss',
  encapsulation: ViewEncapsulation.None,
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
})
export default class CreditControlPage {
  private readonly creditControlService = inject(CreditControlService);
  private readonly clientsService = inject(ClientsService);
  private readonly financeService = inject(FinanceService);

  protected readonly activeTab = signal<CreditControlTab>('schedules');
  protected readonly selectedScheduleId = signal<string>('');

  private readonly schedulesResource = apiResource<CreditAccountSchedule[]>(async () => {
    try {
      const response = await toApiPromise(this.creditControlService.getSchedules({ limit: 200 }));
      return response.items;
    } catch {
      toast.error('Error al cargar cronogramas de pago');
      return [];
    }
  });

  private readonly customersResource = apiResource<Customer[]>(async () => {
    try {
      const response = await toApiPromise(this.clientsService.getCustomers({ limit: 200 }));
      return response.items;
    } catch {
      toast.error('Error al cargar clientes');
      return [];
    }
  });

  private readonly invoicesResource = apiResource<Invoice[]>(async () => {
    try {
      const response = await toApiPromise(this.financeService.getInvoices({ flow: 'sale', limit: 200 }));
      return response.items;
    } catch {
      toast.error('Error al cargar facturas de venta');
      return [];
    }
  });

  protected readonly schedules = computed<CreditAccountSchedule[]>(() => this.schedulesResource.value() ?? []);
  protected readonly schedulesLoading = computed(() => this.schedulesResource.isLoading());

  protected readonly customers = computed<Customer[]>(() => this.customersResource.value() ?? []);
  protected readonly customersLoading = computed(() => this.customersResource.isLoading());

  protected readonly invoices = computed<Invoice[]>(() => this.invoicesResource.value() ?? []);
  protected readonly invoicesLoading = computed(() => this.invoicesResource.isLoading());

  protected onScheduleSelect(event: ScheduleSelectEvent): void {
    this.selectedScheduleId.set(event.id);
    this.activeTab.set(event.tab);
  }

  protected reloadSchedules(): void {
    this.schedulesResource.reload();
  }
}
