import {
  Component,
  computed,
  CUSTOM_ELEMENTS_SCHEMA,
  effect,
  inject,
  input,
  output,
  signal,
  ViewEncapsulation,
} from '@angular/core';
import { form, FormField, required } from '@angular/forms/signals';
import { toast } from 'ngx-sonner';
import {
  FluentDropdown,
  FluentTextInput,
} from '../../../../shared/components/fluent-form-controls/fluent-form-controls';
import { PartnerAccount } from '../../../../core/models/partner-equity.model';
import { TeamMember } from '../../../../core/models/team.model';
import { PartnerEquityStore } from '../../store/partner-equity.store';
import { toApiPromise } from '../../../../core/utils/api-response';
import { apiResource } from '../../../../core/utils/resource-helpers';
import { PartnerEquityService } from '../../services/partner-equity';

interface Option<T = string> {
  value: T;
  label: string;
}

interface PartnerAccountFormModel {
  partner_employee_id: string;
  equity_percentage: string;
}

const EMPTY_FORM: PartnerAccountFormModel = {
  partner_employee_id: '',
  equity_percentage: '',
};

@Component({
  selector: 'app-partner-account-form',
  standalone: true,
  imports: [FormField, FluentTextInput, FluentDropdown],
  templateUrl: './partner-account-form.html',
  styleUrl: './partner-account-form.scss',
  encapsulation: ViewEncapsulation.None,
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
})
export default class PartnerAccountFormComponent {
  private readonly partnerEquityStore = inject(PartnerEquityStore);
  private readonly partnerEquityService = inject(PartnerEquityService);

  readonly teamMembers = input.required<TeamMember[]>();
  readonly editingAccount = input<PartnerAccount | null>(null);

  readonly submitSuccess = output<void>();
  readonly cancel = output<void>();

  protected readonly model = signal<PartnerAccountFormModel>({ ...EMPTY_FORM });
  protected readonly form;

  private readonly accountsResource = apiResource<PartnerAccount[]>(async () => {
    try {
      const response = await toApiPromise(this.partnerEquityService.getPartnerAccounts({ limit: 1000 }));
      return response.items;
    } catch {
      return [];
    }
  });

  protected readonly accounts = computed<PartnerAccount[]>(() => this.accountsResource.value() ?? []);

  protected readonly teamMemberOptions = computed<Option<string>[]>(() => [
    { value: '', label: 'Selecciona un colaborador' },
    ...this.teamMembers().map((member) => ({
      value: member.id,
      label: `${member.first_name} ${member.last_name} (${member.email})`,
    })),
  ]);

  protected readonly saving = computed(() => this.partnerEquityStore.status().loading);

  protected readonly selectedEmployeeName = computed<string>(() => {
    const account = this.editingAccount();
    if (!account) {
      return '';
    }
    const member = this.teamMembers().find((m) => m.id === account.partner_employee_id);
    return member ? `${member.first_name} ${member.last_name} (${member.email})` : account.partner_employee_id;
  });

  constructor() {
    this.form = form(this.model, (schema) => {
      required(schema.partner_employee_id, { message: 'El colaborador es obligatorio.' });
      required(schema.equity_percentage, { message: 'El porcentaje de participación es obligatorio.' });
    });

    effect(() => {
      const account = this.editingAccount();
      if (account) {
        this.model.set({
          partner_employee_id: account.partner_employee_id,
          equity_percentage: String(account.equity_percentage),
        });
      } else {
        this.model.set({ ...EMPTY_FORM });
      }
    });
  }

  protected async onSubmit(): Promise<void> {
    this.form().markAsTouched();
    if (this.form().invalid()) {
      toast.error('Completa los campos obligatorios');
      return;
    }

    const model = this.model();
    const percentage = Number(model.equity_percentage);
    if (percentage <= 0 || percentage > 100) {
      toast.error('El porcentaje debe estar entre 0 y 100');
      return;
    }

    const editing = this.editingAccount();
    const isDuplicate = this.accounts().some(
      (account) =>
        account.partner_employee_id === model.partner_employee_id &&
        (!editing || account.id !== editing.id)
    );
    if (isDuplicate) {
      toast.error('Ya existe una cuenta de socio para este colaborador');
      return;
    }

    try {
      if (editing) {
        await this.partnerEquityStore.updatePartnerAccount(editing.id, { equity_percentage: percentage });
        toast.success('Cuenta de socio actualizada');
      } else {
        await this.partnerEquityStore.createPartnerAccount({
          partner_employee_id: model.partner_employee_id,
          equity_percentage: percentage,
        });
        toast.success('Cuenta de socio creada');
      }
      this.form().reset({ ...EMPTY_FORM });
      this.accountsResource.reload();
      this.submitSuccess.emit();
    } catch {
      toast.error(this.partnerEquityStore.status().error ?? 'Error al guardar la cuenta de socio');
    }
  }

  protected onCancel(): void {
    this.form().reset({ ...EMPTY_FORM });
    this.cancel.emit();
  }
}
