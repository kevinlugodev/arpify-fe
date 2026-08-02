import { Component, computed, CUSTOM_ELEMENTS_SCHEMA, inject, output, signal, ViewEncapsulation } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { form, FormField, required } from '@angular/forms/signals';
import { toast } from 'ngx-sonner';
import {
  FluentTextInput,
} from '../../../../shared/components/fluent-form-controls/fluent-form-controls';
import { PartnerEquityStore } from '../../store/partner-equity.store';

interface ProfitDistributionFormModel {
  distribution_code: string;
  gross_pool_amount: string;
  reserve_percentage: string;
  distribution_date: string;
}

const EMPTY_FORM: ProfitDistributionFormModel = {
  distribution_code: '',
  gross_pool_amount: '',
  reserve_percentage: '',
  distribution_date: new Date().toISOString().split('T')[0],
};

@Component({
  selector: 'app-profit-distribution-form',
  standalone: true,
  imports: [DecimalPipe, FormField, FluentTextInput],
  templateUrl: './profit-distribution-form.html',
  styleUrl: './profit-distribution-form.scss',
  encapsulation: ViewEncapsulation.None,
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
})
export default class ProfitDistributionFormComponent {
  private readonly partnerEquityStore = inject(PartnerEquityStore);

  readonly submitSuccess = output<void>();

  protected readonly model = signal<ProfitDistributionFormModel>({ ...EMPTY_FORM });
  protected readonly form;

  protected readonly saving = computed(() => this.partnerEquityStore.status().loading);

  protected readonly reservedAmount = computed(() => {
    const gross = Number(this.model().gross_pool_amount || 0);
    const reserve = Number(this.model().reserve_percentage || 0);
    return gross * (reserve / 100);
  });

  protected readonly distributableAmount = computed(() => {
    const gross = Number(this.model().gross_pool_amount || 0);
    return Math.max(0, gross - this.reservedAmount());
  });

  constructor() {
    this.form = form(this.model, (schema) => {
      required(schema.distribution_code, { message: 'El código de distribución es obligatorio.' });
      required(schema.gross_pool_amount, { message: 'El monto bruto es obligatorio.' });
      required(schema.reserve_percentage, { message: 'El porcentaje de reserva es obligatorio.' });
      required(schema.distribution_date, { message: 'La fecha es obligatoria.' });
    });
  }

  protected async onSubmit(): Promise<void> {
    this.form().markAsTouched();
    if (this.form().invalid()) {
      toast.error('Completa los campos obligatorios');
      return;
    }

    const gross = Number(this.model().gross_pool_amount);
    const reserve = Number(this.model().reserve_percentage);

    if (gross < 0) {
      toast.error('El monto bruto no puede ser negativo');
      return;
    }
    if (reserve < 0 || reserve > 100) {
      toast.error('El porcentaje de reserva debe estar entre 0 y 100');
      return;
    }

    try {
      await this.partnerEquityStore.createProfitDistribution({
        distribution_code: this.model().distribution_code,
        gross_pool_amount: gross,
        reserve_percentage: reserve,
        distribution_date: this.model().distribution_date,
      });
      toast.success('Distribución de utilidades creada');
      this.model.set({ ...EMPTY_FORM });
      this.submitSuccess.emit();
    } catch {
      toast.error(this.partnerEquityStore.status().error ?? 'Error al crear la distribución');
    }
  }
}
