import {
  Component,
  computed,
  CUSTOM_ELEMENTS_SCHEMA,
  inject,
  signal,
  ViewEncapsulation,
} from '@angular/core';
import { form, FormField, required } from '@angular/forms/signals';
import { toast } from 'ngx-sonner';
import DataTable, { DataTableColumn } from '../../../../shared/components/data-table/data-table';
import EmptyState from '../../../../shared/components/empty-state/empty-state';
import InfoTip from '../../../../shared/components/info-tip/info-tip';
import StatCard from '../../../../shared/components/stat-card/stat-card';
import {
  FluentTextInput,
} from '../../../../shared/components/fluent-form-controls/fluent-form-controls';
import {
  CashFlowForecast,
  CashFlowForecastFilters,
} from '../../../../core/models/treasury.model';
import { TreasuryService } from '../../services/treasury';
import { toApiPromise } from '../../../../core/utils/api-response';
import { apiResourceWithRequest } from '../../../../core/utils/resource-helpers';

interface CashFlowFormModel {
  start_date: string;
  end_date: string;
  interval_days: string;
}

interface CashFlowForecastRow {
  date: string;
  projected_balance: string;
  pending_inflows: string;
  pending_outflows: string;
}

const EMPTY_FORM: CashFlowFormModel = {
  start_date: '',
  end_date: '',
  interval_days: '7',
};

const EMPTY_FORECAST: CashFlowForecast = {
  base_date: '',
  items: [],
  total_bank_accounts: 0,
};

/**
 * Componente standalone para la pestaña de proyección de flujo de caja.
 *
 * Permite seleccionar un rango de fechas y un intervalo, y consulta el
 * endpoint de proyección de tesorería. La lectura se realiza a través de
 * `apiResourceWithRequest` y el formulario utiliza Signal Forms.
 */
@Component({
  selector: 'app-cash-flow',
  standalone: true,
  imports: [
    DataTable,
    EmptyState,
    InfoTip,
    StatCard,
    FormField,
    FluentTextInput,
  ],
  templateUrl: './cash-flow.html',
  styleUrl: './cash-flow.scss',
  encapsulation: ViewEncapsulation.None,
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
})
export default class CashFlowComponent {
  private readonly treasuryService = inject(TreasuryService);

  protected readonly formModel = signal<CashFlowFormModel>({ ...EMPTY_FORM });
  protected readonly cashFlowForm;

  private readonly forecastRequest = signal<CashFlowForecastFilters | null>(null);

  private readonly forecastResource = apiResourceWithRequest<CashFlowForecast, CashFlowForecastFilters | null>(
    () => this.forecastRequest(),
    async ({ params }) => {
      if (!params) {
        return EMPTY_FORECAST;
      }
      try {
        const response = await toApiPromise(this.treasuryService.getCashFlowForecast(params));
        return response.forecast;
      } catch {
        toast.error('Error al cargar la proyección de flujo de caja');
        return EMPTY_FORECAST;
      }
    }
  );

  protected readonly forecast = computed(() => this.forecastResource.value() ?? EMPTY_FORECAST);
  protected readonly forecastLoading = computed(() => this.forecastResource.isLoading());
  protected readonly hasProjected = computed(() => this.forecastRequest() !== null);
  protected readonly forecastItems = computed(() => this.forecast().items);
  protected readonly totalBankAccounts = computed(() => this.forecast().total_bank_accounts);

  protected readonly totalBankAccountsDisplay = computed(() => this.formatAmount(this.totalBankAccounts()));

  protected readonly forecastRows = computed<CashFlowForecastRow[]>(() =>
    this.forecastItems().map((item) => ({
      date: this.formatDate(item.date),
      projected_balance: this.formatAmount(item.projected_balance),
      pending_inflows: this.formatAmount(item.pending_inflows),
      pending_outflows: this.formatAmount(item.pending_outflows),
    }))
  );

  protected readonly forecastColumns: DataTableColumn<CashFlowForecastRow>[] = [
    { key: 'date', header: 'Fecha' },
    { key: 'projected_balance', header: 'Saldo proyectado' },
    { key: 'pending_inflows', header: 'Ingresos pendientes' },
    { key: 'pending_outflows', header: 'Egresos pendientes' },
  ];

  constructor() {
    this.cashFlowForm = form(this.formModel, (schema) => {
      required(schema.start_date, { message: 'La fecha de inicio es obligatoria.' });
      required(schema.end_date, { message: 'La fecha de término es obligatoria.' });
    });
  }

  protected async onProject(): Promise<void> {
    this.cashFlowForm().markAsTouched();
    if (this.cashFlowForm().invalid()) {
      toast.error('Completa las fechas del período para proyectar.');
      return;
    }

    const model = this.formModel();
    this.forecastRequest.set({
      start_date: model.start_date,
      end_date: model.end_date,
      interval_days: Number(model.interval_days || 7),
    });
  }

  private formatDate(value: string): string {
    if (!value) {
      return '';
    }
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return value;
    }
    return date.toLocaleDateString('es-PE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  }

  private formatAmount(value: number): string {
    return value.toLocaleString('es-PE', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  }
}
